"""draw_cafe_art.py - draws every picture of the cafe reward game ("Mimi's Hot Chocolate") as SVG and renders PNGs.

Characters are built from shared parts (head, ears, eyes, body, limbs, clothes) so every pose of a character keeps
the same look, size and ground line. Items follow the anchors the game code expects (see the ART block in
game/rewards/cafe_hot_chocolate.js): the cup is an empty cup on a 440 x 420 canvas with its opening ellipse at
200,149 radius 106 x 27; the jug spout points up-right (the code tilts it clockwise around its centre).

Run:  python gh_site/tools/draw_cafe_art.py [--only name1,name2] [--sheet-only]
Writes SVG sources to 16_kids_maths/work_tmp/art_src/cafe/, PNGs to gh_site/game/rewards/art/cafe/,
updates art/cafe/manifest.json and writes a contact sheet to work_tmp/art_src/cafe_contact_sheet.png.
"""
import argparse
import io
import json
import math
import os
import sys

TOOLS = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.dirname(TOOLS)
PROJECT = os.path.dirname(SITE)
WORK_TMP = os.path.join(PROJECT, "work_tmp")
SRC_DIR = os.path.join(WORK_TMP, "art_src", "cafe")
OUT_DIR = os.path.join(SITE, "game", "rewards", "art", "cafe")
SHEET = os.path.join(WORK_TMP, "art_src", "cafe_contact_sheet.png")
MAX_BYTES = 150 * 1024
os.makedirs(SRC_DIR, exist_ok=True)
os.environ["TEMP"] = WORK_TMP
os.environ["TMP"] = WORK_TMP

from PIL import Image  # noqa: E402
from playwright.sync_api import sync_playwright  # noqa: E402

INK = "#563832"
STROKE_K = 0.8
WHITE = "#fffdfb"
CW, CH = 462, 600          # character canvas (the game's 200 x 260 box)
GROUND = 596


def f(v):
    return ("%.1f" % v).rstrip("0").rstrip(".")


# ------------------------------------------------------------------ geometry
def cr_path(pts, corners=()):
    """Closed Catmull-Rom spline through pts as a cubic path. Indices in corners get zero tangents (pointy)."""
    n = len(pts)
    d = "M%s %s" % (f(pts[0][0]), f(pts[0][1]))
    for i in range(n):
        p0, p1, p2, p3 = pts[i - 1], pts[i], pts[(i + 1) % n], pts[(i + 2) % n]
        t1 = (0, 0) if i in corners else ((p2[0] - p0[0]) / 6, (p2[1] - p0[1]) / 6)
        t2 = (0, 0) if (i + 1) % n in corners else ((p3[0] - p1[0]) / 6, (p3[1] - p1[1]) / 6)
        d += " C%s %s %s %s %s %s" % (f(p1[0] + t1[0]), f(p1[1] + t1[1]), f(p2[0] - t2[0]), f(p2[1] - t2[1]), f(p2[0]), f(p2[1]))
    return d + " Z"


def bbox(pts):
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    return (min(xs), min(ys), max(xs) - min(xs), max(ys) - min(ys))


def ell_pts(cx, cy, rx, ry, n=24, rot=0):
    out = []
    c, s = math.cos(math.radians(rot)), math.sin(math.radians(rot))
    for i in range(n):
        t = 2 * math.pi * i / n
        x, y = rx * math.cos(t), ry * math.sin(t)
        out.append((cx + x * c - y * s, cy + x * s + y * c))
    return out


def quad(a, c, b, t):
    return ((1 - t) ** 2 * a[0] + 2 * (1 - t) * t * c[0] + t * t * b[0], (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * c[1] + t * t * b[1])


def limb_pts(s, c, p, r1, r2, n=10):
    """A tapered tube along the quadratic curve s -> c -> p with round ends."""
    left, right = [], []
    for i in range(n + 1):
        t = i / n
        x, y = quad(s, c, p, t)
        ta = quad(s, c, p, min(1, t + 0.01))
        tb = quad(s, c, p, max(0, t - 0.01))
        dx, dy = ta[0] - tb[0], ta[1] - tb[1]
        ln = math.hypot(dx, dy) or 1
        nx, ny = -dy / ln, dx / ln
        r = r1 + (r2 - r1) * t
        left.append((x + nx * r, y + ny * r))
        right.append((x - nx * r, y - ny * r))
    # end caps
    def cap(center, r, ang_from):
        return [(center[0] + r * math.cos(ang_from + k * math.pi / 4), center[1] + r * math.sin(ang_from + k * math.pi / 4)) for k in range(1, 4)]
    e = quad(s, c, p, 0.99)
    a_end = math.atan2(p[1] - e[1], p[0] - e[0])
    b0 = quad(s, c, p, 0.01)
    a_start = math.atan2(s[1] - b0[1], s[0] - b0[0])
    # from left side at the end, sweep around the tip to the right side
    end_cap = [(p[0] + r2 * math.cos(a_end - math.pi / 2 + k * math.pi / 4), p[1] + r2 * math.sin(a_end - math.pi / 2 + k * math.pi / 4)) for k in range(1, 4)]
    start_cap = [(s[0] + r1 * math.cos(a_start - math.pi / 2 + k * math.pi / 4), s[1] + r1 * math.sin(a_start - math.pi / 2 + k * math.pi / 4)) for k in range(1, 4)]
    # left side normal is (-dy, dx); for direction angle a it points at a + 90deg; ensure caps go the right way
    pts = left + end_cap[::-1] if _side_ok(left[-1], p, a_end) else left + end_cap
    pts = pts + right[::-1]
    pts = pts + (start_cap[::-1] if _side_ok(right[0], s, a_start) else start_cap)
    return _clean(pts)


def _side_ok(pt, center, ang):
    # is pt on the +90deg side of the direction ang?
    return math.cos(ang + math.pi / 2) * (pt[0] - center[0]) + math.sin(ang + math.pi / 2) * (pt[1] - center[1]) > 0


def _clean(pts):
    out = []
    for q in pts:
        if not out or math.hypot(q[0] - out[-1][0], q[1] - out[-1][1]) > 0.5:
            out.append(q)
    return out


def rot_pt(pt, c, deg):
    a = math.radians(deg)
    x, y = pt[0] - c[0], pt[1] - c[1]
    return (c[0] + x * math.cos(a) - y * math.sin(a), c[1] + x * math.sin(a) + y * math.cos(a))


# ------------------------------------------------------------------ the drawing context
class Art:
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.defs = []
        self.n = 0
        self.blurs = set()

    def uid(self, k="s"):
        self.n += 1
        return "%s%d" % (k, self.n)

    def blur(self, s):
        key = "bl%s" % str(s).replace(".", "_")
        if key not in self.blurs:
            self.blurs.add(key)
            self.defs.append('<filter id="%s" x="-60%%" y="-60%%" width="220%%" height="220%%"><feGaussianBlur stdDeviation="%s"/></filter>' % (key, s))
        return "url(#%s)" % key

    def lin(self, stops, x1=0.2, y1=0, x2=0.65, y2=1):
        i = self.uid("g")
        self.defs.append('<linearGradient id="%s" x1="%s" y1="%s" x2="%s" y2="%s">%s</linearGradient>' % (
            i, x1, y1, x2, y2, "".join('<stop offset="%s" stop-color="%s"%s/>' % (o, c, (' stop-opacity="%s"' % a) if a is not None else "") for o, c, a in _stops(stops))))
        return "url(#%s)" % i

    def rad(self, stops, cx="50%", cy="50%", r="50%", fx=None, fy=None):
        i = self.uid("r")
        extra = (' fx="%s" fy="%s"' % (fx, fy)) if fx else ""
        self.defs.append('<radialGradient id="%s" cx="%s" cy="%s" r="%s"%s>%s</radialGradient>' % (
            i, cx, cy, r, extra, "".join('<stop offset="%s" stop-color="%s"%s/>' % (o, c, (' stop-opacity="%s"' % a) if a is not None else "") for o, c, a in _stops(stops))))
        return "url(#%s)" % i

    def svg(self, body):
        return ('<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="%d" height="%d" viewBox="0 0 %d %d">'
                '<defs>%s</defs>%s</svg>') % (self.w, self.h, self.w, self.h, "".join(self.defs), body)

    # the core shaded shape: gradient fill, soft core shadow, soft highlight, inner content, warm outline
    def shape(self, d, box, pal, sw=5.0, inner="", hl=0.55, shadow=(9, 12), sblur=9, outline=True, weight=True, grad=None, hlpos=(0.33, 0.24), hlsize=(0.26, 0.17)):
        light, mid, dark = pal
        sw = sw * STROKE_K
        i = self.uid("p")
        self.defs.append('<path id="%s" d="%s"/>' % (i, d))
        self.defs.append('<clipPath id="%sc"><use href="#%s"/></clipPath>' % (i, i))
        bl = self.blur(sblur)
        self.defs.append('<mask id="%sm" maskUnits="userSpaceOnUse" x="-50" y="-50" width="%d" height="%d"><use href="#%s" fill="#fff"/>'
                         '<use href="#%s" fill="#000" transform="translate(%s %s)" filter="%s"/></mask>' % (i, self.w + 100, self.h + 100, i, i, -shadow[0], -shadow[1], bl))
        g = grad or self.lin([(0, light), (0.55, mid), (1, mid)])
        x, y, w, h = box
        out = ""
        if outline and weight:
            out += '<use href="#%s" fill="%s" stroke="%s" stroke-width="%s" stroke-linejoin="round" transform="translate(%s %s)"/>' % (i, INK, INK, f(sw), f(sw * 0.12), f(sw * 0.42))
        out += '<use href="#%s" fill="%s"/>' % (i, g)
        out += '<g clip-path="url(#%sc)">' % i
        out += inner
        out += '<use href="#%s" fill="%s" mask="url(#%sm)" style="mix-blend-mode:multiply"/>' % (i, dark, i)
        if hl:
            out += '<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="#ffffff" opacity="%s" filter="%s"/>' % (
                f(x + w * hlpos[0]), f(y + h * hlpos[1]), f(w * hlsize[0]), f(h * hlsize[1]), hl, self.blur(max(3, round(min(w, h) * 0.07))))
        out += "</g>"
        if outline:
            out += '<use href="#%s" fill="none" stroke="%s" stroke-width="%s" stroke-linejoin="round"/>' % (i, INK, f(sw))
        return out

    def poly(self, pts, pal, corners=(), **kw):
        return self.shape(cr_path(pts, corners), bbox(pts), pal, **kw)

    def ellipse(self, cx, cy, rx, ry, pal, rot=0, **kw):
        pts = ell_pts(cx, cy, rx, ry, 28, rot)
        return self.poly(pts, pal, **kw)


def _stops(stops):
    return [(s[0], s[1], s[2] if len(s) > 2 else None) for s in stops]


def line(d, w, color=INK, op=1, cap="round"):
    return '<path d="%s" fill="none" stroke="%s" stroke-width="%s" stroke-linecap="%s" stroke-linejoin="round" opacity="%s"/>' % (d, color, f(w), cap, op)


# ------------------------------------------------------------------ characters
# palette: (light, mid, shade-for-multiply)
FUR = {
    "mimi": ("#ffffff", "#fbf6f3", "#e9d9d6"),
    "bella": ("#fffaf0", "#fbecd3", "#ecd2b4"),
    "lulu": ("#e9dcf8", "#d5c0ef", "#cdb4e4"),
    "momo": ("#fde7b4", "#f6cf7f", "#ecc08a"),
    "puff": ("#fffefc", "#f8f3ee", "#e6dcd8"),
}
PINK_IN = ("#ffdbe5", "#f9b9cb", "#efc0cd")
IRIS = {
    "mimi": ("#c98d5d", "#7a4a2c", "#3a2219"),
    "bella": ("#b88a6a", "#6e4630", "#33201a"),
    "lulu": ("#a58bc9", "#5e4685", "#2c2140"),
    "momo": ("#b07a50", "#5c3a24", "#2a1a12"),
    "puff": ("#9db8d8", "#4f6788", "#22283a"),
}
HX, HY, HRX, HRY = 231, 205, 146, 114


def head_pts(kind):
    """Head outline points; fur tufts on the cheeks and crown (pointy corners)."""
    base = []
    if kind == "puff":
        return ell_pts(HX, HY + 18, 112, 94, 28), ()
    tufts = {
        "mimi": [(16, 15), (27, 18), (38, 12), (142, 12), (153, 18), (164, 15), (264, 6), (273, 8)],
        "lulu": [(14, 16), (25, 20), (36, 13), (144, 13), (155, 20), (166, 16), (270, 6)],
        "bella": [(270, 6)],
        "momo": [(268, 6)],
    }[kind]
    wide = {"mimi": 0.07, "lulu": 0.09, "bella": 0.04, "momo": 0.06}[kind]
    rx = HRX if kind != "momo" else HRX - 6
    def at(deg, extra=0.0):
        t = math.radians(deg)
        x = rx * math.cos(t) * (1 + wide * max(0, math.sin(t)))
        y = HRY * math.sin(t) * (0.93 if math.sin(t) > 0 else 1.0)
        ln = math.hypot(x, y)
        k = (ln + extra) / ln
        return (HX + x * k, HY + y * k)
    pts, corners = [], []
    near = [t + d for t, _ in tufts for d in (-3.5, 3.5)]
    marks = sorted([(a, e, True) for a, e in tufts] + [(a, 0, False) for a in near] +
                   [(a, 0, False) for a in range(0, 360, 6) if all(abs(((a - t + 180) % 360) - 180) > 5.5 for t, _ in tufts)])
    for a, e, c in marks:
        if c:
            corners.append(len(pts))
        pts.append(at(a, e))
    return pts, tuple(corners)


def head_at(deg, inset=0.0):
    t = math.radians(deg)
    x = HRX * math.cos(t)
    y = HRY * math.sin(t)
    return (HX + x * (1 - inset), HY + y * (1 - inset))


def eye(A, cx, cy, mode, lash, iris, rx=26, ry=32, look=0.0, side=1):
    if mode == "happy":
        d = "M%s %s Q%s %s %s %s" % (f(cx - rx), f(cy + ry * 0.2), f(cx), f(cy - ry * 1.05), f(cx + rx), f(cy + ry * 0.2))
        out = line(d, 7)
        if lash:
            ox = cx + side * rx
            out += line("M%s %s l%s %s" % (f(ox - side * 2), f(cy + ry * 0.12), f(side * 9), f(-5)), 4.5)
        return out
    if mode == "calm":
        d = "M%s %s Q%s %s %s %s" % (f(cx - rx), f(cy - ry * 0.05), f(cx), f(cy + ry * 0.7), f(cx + rx), f(cy - ry * 0.05))
        out = line(d, 6.5)
        if lash:
            ox = cx + side * rx
            out += line("M%s %s l%s %s" % (f(ox - side * 1), f(cy - ry * 0.02), f(side * 9), f(-6)), 4.5)
        return out
    lx = cx + look * rx * 0.25
    il, im, idk = iris
    g = A.rad([(0, il), (0.55, im), (1, idk)], cx="50%", cy="78%", r="75%")
    out = '<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="%s"/>' % (f(cx), f(cy - 1.5), f(rx + 2.6), f(ry + 3.2), INK)
    out += '<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="%s"/>' % (f(lx), f(cy + 1), f(rx - 1.2), f(ry - 1.2), g)
    out += '<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="%s" opacity=".9"/>' % (f(lx), f(cy + 2), f(rx * 0.52), f(ry * 0.56), idk)
    out += '<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="%s" opacity=".55" filter="%s"/>' % (f(lx), f(cy + ry * 0.55), f(rx * 0.62), f(ry * 0.26), il, A.blur(2.5))
    out += '<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="#fff" transform="rotate(-18 %s %s)"/>' % (f(lx - rx * 0.3), f(cy - ry * 0.34), f(rx * 0.36), f(ry * 0.27), f(lx - rx * 0.3), f(cy - ry * 0.34))
    out += '<circle cx="%s" cy="%s" r="%s" fill="#fff" opacity=".92"/>' % (f(lx + rx * 0.36), f(cy + ry * 0.36), f(rx * 0.15))
    out += '<circle cx="%s" cy="%s" r="%s" fill="#fff" opacity=".8"/>' % (f(lx + rx * 0.12), f(cy - ry * 0.55), f(rx * 0.07))
    if lash:
        ox = cx + side * (rx + 1)
        out += line("M%s %s q%s %s %s %s" % (f(ox - side * 3), f(cy - ry * 0.45), f(side * 8), f(-3), f(side * 13), f(-10)), 4.5)
        out += line("M%s %s q%s %s %s %s" % (f(ox - side * 1), f(cy - ry * 0.15), f(side * 8), f(-1), f(side * 13), f(-4)), 4)
    return out


def blush(A, cx, cy, strong=False):
    op = 0.62 if strong else 0.45
    out = '<ellipse cx="%s" cy="%s" rx="31" ry="17" fill="#ff8fab" opacity="%s" filter="%s"/>' % (f(cx), f(cy), op, A.blur(6))
    out += '<circle cx="%s" cy="%s" r="3" fill="#fff" opacity=".75"/>' % (f(cx + 9), f(cy - 5))
    return out


def mouth(kind, mode, x, y):
    if mode == "sip":
        return '<ellipse cx="%s" cy="%s" rx="6.5" ry="6" fill="#b5566a" stroke="%s" stroke-width="3.2"/>' % (f(x), f(y + 6), INK)
    if mode == "open":
        d = "M%s %s Q%s %s %s %s Q%s %s %s %s Z" % (f(x - 19), f(y + 2), f(x), f(y + 8), f(x + 19), f(y + 2), f(x + 17), f(y + 32), f(x - 19), f(y + 2))
        d = "M%s %s Q%s %s %s %s C%s %s %s %s %s %s Z" % (f(x - 18), f(y + 2), f(x), f(y + 6), f(x + 18), f(y + 2), f(x + 16), f(y + 30), f(x - 16), f(y + 30), f(x - 18), f(y + 2))
        tongue = '<ellipse cx="%s" cy="%s" rx="11" ry="7" fill="#f58ea5"/>' % (f(x), f(y + 22))
        return ('<path d="%s" fill="#a8445a" stroke="%s" stroke-width="4" stroke-linejoin="round"/>' % (d, INK)) + \
            '<clipPath id="mclip%d_%d"><path d="%s"/></clipPath>' % (int(x), int(y), d) + \
            '<g clip-path="url(#mclip%d_%d)">%s</g>' % (int(x), int(y), tongue)
    if kind == "momo":
        return line("M%s %s l0 6 M%s %s q%s %s %s %s q%s %s %s %s" % (f(x), f(y - 4), f(x - 15), f(y + 2), 7, 9, 15, 0, 8, 9, 15, 0), 4)
    if kind == "bella":
        return line("M%s %s q%s %s %s %s q%s %s %s %s" % (f(x - 12), f(y), 6, 8, 12, 0, 6, 8, 12, 0), 4)
    return line("M%s %s q%s %s %s %s q%s %s %s %s" % (f(x - 14), f(y - 1), 7, 9, 14, 0, 7, 9, 14, 0), 4)


def nose(A, kind, x, y):
    if kind == "momo":
        g = A.rad([(0, "#8a5a44"), (1, "#3e2620")], cy="30%", r="70%")
        return ('<path d="M%s %s C%s %s %s %s %s %s C%s %s %s %s %s %s Z" fill="%s" stroke="%s" stroke-width="3.5"/>' % (
            f(x - 18), f(y - 8), f(x - 18), f(y - 16), f(x + 18), f(y - 16), f(x + 18), f(y - 8), f(x + 16), f(y + 6), f(x - 16), f(y + 6), f(x - 18), f(y - 8), g, INK)) + \
            '<ellipse cx="%s" cy="%s" rx="7" ry="3.5" fill="#fff" opacity=".8"/>' % (f(x - 4), f(y - 9))
    color = "#6a4a8c" if kind == "lulu" else "#f59ab0"
    g = A.lin([(0, "#ffc4d3" if kind != "lulu" else "#9a7cc0"), (1, color)], 0, 0, 0, 1)
    return ('<path d="M%s %s Q%s %s %s %s Q%s %s %s %s Q%s %s %s %s Z" fill="%s" stroke="%s" stroke-width="3"/>' % (
        f(x - 11), f(y - 5), f(x), f(y - 10), f(x + 11), f(y - 5), f(x + 8), f(y + 6), f(x), f(y + 7), f(x - 8), f(y + 6), f(x - 11), f(y - 5), g, INK)) + \
        '<ellipse cx="%s" cy="%s" rx="4" ry="2" fill="#fff" opacity=".85"/>' % (f(x - 3), f(y - 4))


def flower(A, x, y, s=1.0):
    out = ""
    pg = A.rad([(0, "#fff0f4"), (0.6, "#fbbfcf"), (1, "#ef93ad")], cx="50%", cy="85%", r="80%")
    for k in range(5):
        a = -90 + k * 72
        px, py = x + math.cos(math.radians(a)) * 15 * s, y + math.sin(math.radians(a)) * 15 * s
        out += '<ellipse cx="%s" cy="%s" rx="%s" ry="%s" transform="rotate(%s %s %s)" fill="%s" stroke="%s" stroke-width="3.2"/>' % (
            f(px), f(py), f(11 * s), f(15 * s), f(a + 90), f(px), f(py), pg, INK)
    cg = A.rad([(0, "#fff3c4"), (1, "#f5c45e")], cy="35%")
    out += '<circle cx="%s" cy="%s" r="%s" fill="%s" stroke="%s" stroke-width="3"/>' % (f(x), f(y), f(8 * s), cg, INK)
    out += '<circle cx="%s" cy="%s" r="%s" fill="#fff" opacity=".8"/>' % (f(x - 2.5 * s), f(y - 3 * s), f(2.4 * s))
    return out


def star_pts(x, y, r1, r2, rot=-90):
    pts = []
    for k in range(10):
        r = r1 if k % 2 == 0 else r2
        a = math.radians(rot + k * 36)
        pts.append((x + r * math.cos(a), y + r * math.sin(a)))
    return pts


def heart_d(x, y, s):
    return ("M%s %s C%s %s %s %s %s %s C%s %s %s %s %s %s C%s %s %s %s %s %s C%s %s %s %s %s %s Z" % (
        f(x), f(y + 13 * s),
        f(x - 7 * s), f(y + 7 * s), f(x - 19 * s), f(y + 1 * s), f(x - 17 * s), f(y - 9 * s),
        f(x - 15 * s), f(y - 17 * s), f(x - 4 * s), f(y - 17 * s), f(x), f(y - 9 * s),
        f(x + 4 * s), f(y - 17 * s), f(x + 15 * s), f(y - 17 * s), f(x + 17 * s), f(y - 9 * s),
        f(x + 19 * s), f(y + 1 * s), f(x + 7 * s), f(y + 7 * s), f(x), f(y + 13 * s)))


def open_paw(A, x, y, pal, r=28, rot=0):
    pts = ell_pts(x, y, r, r * 1.05, 20, rot)
    out = A.poly(pts, pal, sw=5)
    pad = A.lin([(0, "#ffd3de"), (1, "#f4a2b8")], 0, 0, 0, 1)
    g = '<g transform="rotate(%s %s %s)">' % (f(rot), f(x), f(y))
    g += '<path d="%s" fill="%s" stroke="%s" stroke-width="2.4" stroke-opacity=".55"/>' % (heart_d(x, y + r * 0.22, r * 0.032 * 10 / 10 * 0.55), pad, INK)
    for dx, dy in ((-r * 0.52, -r * 0.38), (0, -r * 0.6), (r * 0.52, -r * 0.38)):
        g += '<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="%s"/>' % (f(x + dx), f(y + dy), f(r * 0.2), f(r * 0.17), pad)
    g += "</g>"
    return out + g


def paw_toes(p, c, r):
    """two little toe lines at the tip of a closed paw (direction from c to p)."""
    a = math.atan2(p[1] - c[1], p[0] - c[0])
    out = ""
    for k in (-0.33, 0.33):
        bx, by = p[0] + math.cos(a + k) * r * 1.0, p[1] + math.sin(a + k) * r * 1.0
        ix, iy = p[0] + math.cos(a + k) * r * 0.62, p[1] + math.sin(a + k) * r * 0.62
        out += line("M%s %s L%s %s" % (f(bx), f(by), f(ix), f(iy)), 3.2, op=0.7)
    return out


# ---- arm / leg layouts per pose (left arm = image left). Values: (shoulder, elbow-control, paw)
SH_L, SH_R = (178, 332), (284, 332)


def mirror(pt):
    return (2 * HX - pt[0], pt[1])


ARMS = {
    "stand": ((SH_L, (148, 380), (158, 434)), (SH_R, mirror((148, 380)), mirror((158, 434)))),
    "walk": ((SH_L, (142, 364), (126, 416)), (SH_R, (316, 384), (318, 428))),
    "sip": ((SH_L, (136, 418), (186, 362)), (SH_R, (338, 418), (322, 362))),
    "cheer": ((SH_L, (118, 318), (96, 240)), (SH_R, mirror((118, 318)), mirror((96, 240)))),
    "wave_l": ((SH_L, (112, 330), (104, 246)), (SH_R, mirror((148, 380)), mirror((158, 434)))),
    "wave_r": ((SH_L, (148, 380), (158, 434)), (SH_R, mirror((112, 330)), mirror((104, 246)))),
    "five": ((SH_L, (148, 380), (158, 434)), (SH_R, (360, 318), (394, 232))),
}
LEGS = {
    "stand": (((202, 505), (200, 548), (198, 572)), ((260, 505), (262, 548), (264, 572))),
    "walk": (((200, 505), (180, 545), (160, 560)), ((260, 505), (276, 548), (294, 574))),
    "cheer": (((202, 505), (186, 540), (196, 556)), ((260, 505), (276, 540), (266, 556))),
    # sitting, seen from the front: short legs toward the viewer, the soles of the feet showing
    "sit": (((204, 505), (194, 536), (186, 556)), ((258, 505), (268, 536), (276, 556))),
}


def torso_pts(kind):
    if kind == "puff":
        return None
    w = 1.0 if kind != "momo" else 1.04
    base = [(183, 292), (163, 322), (152, 380), (149, 440), (157, 498), (180, 538), (231, 550)]
    pts = [(HX + (x - HX) * w, y) for x, y in base]
    return pts + [mirror(p) for p in pts[-2::-1]]


def wool_pts(cx, cy, rx, ry, bumps, amp, start=0.0):
    pts, corners = [], []
    n = bumps * 4
    for i in range(n):
        t = start + 2 * math.pi * i / n
        ph = (i % 4)
        k = [0.0, 0.75, 1.0, 0.75][ph]
        r = 1 + amp * k
        if ph == 0:
            corners.append(len(pts))
        pts.append((cx + rx * r * math.cos(t), cy + ry * r * math.sin(t)))
    return pts, tuple(corners)


def chin_sh(A):
    return '<ellipse cx="231" cy="302" rx="112" ry="34" fill="#6e4646" opacity=".26" filter="%s"/>' % A.blur(11)


def build_character(kind, pose):
    """kind: mimi bella lulu momo puff. pose: stand smile wave high_five walk sip cheer sit sleep.
    sit / sleep are for Mimi's House in the cafe world (seats, the bath and the bed): the seat line is y 531
    (230/260 of the box), the soles of the feet show below it."""
    A = Art(CW, CH)
    fur = FUR[kind]
    iris = IRIS[kind]
    girl = kind in ("mimi", "bella", "lulu")
    arm_key = {"stand": "stand", "smile": "stand", "walk": "walk", "sip": "sip", "cheer": "cheer",
               "wave": "wave_r" if kind == "mimi" else "wave_l", "high_five": "five", "sit": "stand", "sleep": "stand"}[pose]
    leg_key = {"walk": "walk", "cheer": "cheer", "sit": "sit", "sleep": "sit"}.get(pose, "stand")
    eyes = {"smile": "happy", "cheer": "happy", "high_five": "happy", "sip": "calm", "sleep": "calm"}.get(pose, "open")
    mmode = {"smile": "open", "cheer": "open", "high_five": "open", "wave": "open", "sip": "sip"}.get(pose, "smile")
    look = -1.0 if pose == "walk" else 0.0
    face_dx = -20 if pose == "walk" else 0
    tilt = {"walk": -4, "wave": 4 if kind == "mimi" else -4, "high_five": 5, "sip": -2, "cheer": 0, "sleep": 7}.get(pose, 0)
    lift = 18 if pose == "cheer" else 0
    lean = {"walk": -3, "high_five": 3}.get(pose, 0)
    scale = {"bella": 0.9}.get(kind, 1.0)

    back, body, front, headg, after = [], [], [], [], []

    # ---- tail (behind)
    if kind == "mimi":
        tail = limb_pts((288, 500), (420, 505), (372, 380), 19, 27)
        back.append(A.poly(tail, fur, sw=5.2, inner=line("M352 392 q8 10 22 8 M360 410 q8 6 20 4", 3, FUR["mimi"][2], 0.9)))
    elif kind == "lulu":
        tail = limb_pts((288, 505), (430, 490), (380, 352), 20, 46)
        tip = '<ellipse cx="378" cy="352" rx="62" ry="46" fill="#fffafd" transform="rotate(-40 378 352)"/>'
        back.append(A.poly(tail, fur, sw=5.2, inner=tip))
    elif kind == "momo":
        wag = (-14 if pose in ("cheer", "wave") else 0)
        tail = limb_pts((288, 470), (330, 470 + wag), (338, 420 + wag), 13, 12)
        back.append(A.poly(tail, fur, sw=5))

    # ---- legs (mostly behind the counter in the game, drawn for completeness)
    legpal = ("#ffe9ec", "#f9d6dc", "#ecc8cf") if kind == "puff" else fur
    for s, c, p in LEGS[leg_key]:
        body.append(A.poly(limb_pts(s, c, p, 30, 31), legpal, sw=5.2))
        if leg_key == "sit":
            body.append(open_paw(A, p[0], p[1] + 8, legpal, 30))   # the sole faces us
        else:
            body.append(paw_toes((p[0], p[1] + 4), (p[0], p[1] - 20), 30))

    # ---- torso and clothes
    tp = torso_pts(kind)
    if kind == "puff":
        pts, cr = wool_pts(231, 425, 100, 118, 9, 0.11)
        curls = "".join(line("M%s %s q6 -8 12 0 q-2 8 -8 6" % (f(x), f(y)), 3, "#ddd1cc", 0.9) for x, y in ((190, 360), (250, 390), (210, 430), (270, 445), (180, 470), (235, 490), (290, 380)))
        body.append(A.poly(pts, fur, corners=cr, sw=5.2, inner=chin_sh(A) + curls))
    elif kind == "lulu":
        chest = '<ellipse cx="231" cy="402" rx="46" ry="70" fill="#fffafd"/>'
        body.append(A.poly(tp, fur, sw=5.2, inner=chest + chin_sh(A)))
    else:
        body.append(A.poly(tp, fur, sw=5.2, inner=chin_sh(A)))

    if kind == "mimi":
        body.append(apron(A))
    elif kind == "bella":
        body.append(dress(A))
    elif kind == "momo":
        body.append(tshirt(A))

    # ---- arms
    armpal = ("#ffeef0", "#fbdde2", "#efcad0") if kind == "puff" else fur
    raised_arms = []
    for idx, (s, c, p) in enumerate(ARMS[arm_key]):
        raised = p[1] < 300
        opened = raised and pose in ("wave", "cheer", "high_five")
        r2 = 25
        arm = A.poly(limb_pts(s, c, p, 23, r2), armpal, sw=5.2)
        if kind == "momo":
            # short sleeve over the shoulder
            sl = limb_pts(s, c, quad(s, c, p, 0.22), 31, 30)
            arm += A.poly(sl, TEE, sw=5)
        if kind == "puff":
            cuff, ccr = wool_pts(s[0] + (c[0] - s[0]) * 0.18, s[1] + (c[1] - s[1]) * 0.18, 30, 30, 6, 0.16)
            arm += A.poly(cuff, fur, corners=ccr, sw=4.8)
        if opened:
            rot = math.degrees(math.atan2(p[1] - c[1], p[0] - c[0])) + 90
            arm += open_paw(A, p[0], p[1] - 6, armpal, 29 if pose != "high_five" else 32, rot * 0.5)
        else:
            arm += paw_toes(p, c, r2)
        (raised_arms if raised else front).append(arm)

    # ---- scarf (over arms' shoulders)
    if kind in ("lulu", "puff"):
        front.append(scarf(A, MINT if kind == "lulu" else SKY))

    # ---- head
    fx = HX + face_dx
    ey = HY + 20 if kind != "puff" else HY + 30
    rosy = pose in ("sip", "cheer", "high_five", "smile")
    cheeks = blush(A, fx - (98 if kind != "puff" else 74), ey + 44, rosy) + blush(A, fx + (98 if kind != "puff" else 74), ey + 44, rosy)
    headg.append(ears_back(A, kind))
    hp, hc = head_pts(kind)
    inner = ""
    if kind == "lulu":
        inner = '<path d="M90 230 Q118 210 160 228 Q196 212 231 236 Q266 212 302 228 Q344 210 372 230 L380 330 L82 330 Z" fill="#fffafd"/>'
    if kind == "momo":
        inner = '<ellipse cx="%s" cy="263" rx="62" ry="44" fill="#fff4dc"/>' % f(HX + face_dx * 0.7)
    if kind == "puff":
        inner = ""
        headg.append(A.poly(hp, ("#fff1f1", "#fde2e3", "#f1cbcd"), sw=5.2, inner=cheeks))
    else:
        tuftlines = ""
        if kind in ("mimi", "lulu"):
            tuftlines = line("M200 104 q8 14 4 26 M222 98 q6 14 2 24", 3, fur[2], 0.9)
        headg.append(A.poly(hp, fur, corners=hc, sw=5.6, inner=inner + tuftlines + cheeks, hl=0.6, hlpos=(0.36, 0.22), hlsize=(0.28, 0.16)))
    headg.append(ears_front(A, kind))

    # face
    sep = 60 if kind != "puff" else 52
    rx, ry = (26, 32) if kind != "puff" else (23, 28)
    face = eye(A, fx - sep, ey, eyes, girl, iris, rx, ry, look, -1)
    face += eye(A, fx + sep, ey, eyes, girl, iris, rx, ry, look, 1)
    ny = ey + 32 if kind != "momo" else ey + 34
    face += nose(A, kind, fx, ny)
    face += mouth(kind, mmode, fx, ny + 12 if kind != "momo" else ny + 12)
    if kind == "mimi":
        face += line("M%s %s l-50 -8 M%s %s l-48 6 M%s %s l50 -8 M%s %s l48 6" % (
            f(fx - 120), f(ey + 40), f(fx - 118), f(ey + 52), f(fx + 120), f(ey + 40), f(fx + 118), f(ey + 52)), 2.6, INK, 0.5)
    headg.append(face)
    headg.append(head_extras(A, kind))
    if kind == "puff":
        headg.append(wool_cap(A))

    # ---- compose
    head_tf = "rotate(%s %s %s)" % (tilt, HX, HY + 100)
    inner_all = "".join(back) + "".join(body) + "".join(front) + '<g transform="%s">%s</g>' % (head_tf, "".join(headg)) + "".join(raised_arms)
    tf = "translate(0 %s) rotate(%s %s %s)" % (-lift, lean, HX, GROUND - 40)
    if scale != 1:
        tf = "translate(%s %s) scale(%s) translate(%s %s) " % (HX, GROUND, scale, -HX, -GROUND) + tf
    return A.svg('<g transform="%s">%s</g>' % (tf, inner_all))


MINT = ("#d9f6ea", "#a5e3cc", "#9fd6c1")
SKY = ("#e0f1fd", "#aed8f5", "#a3c7e3")
TEE = ("#dff0fd", "#a9d4f4", "#a8c6e0")
LILAC_DRESS = ("#efe6fb", "#d4c1f0", "#c2abe0")
APRON = ("#fff0f4", "#fbd0dc", "#efc3cf")


def apron(A):
    out = ""
    # skirt with a scalloped frill
    frill = "M150 494 L312 494 L322 520"
    x = 322
    while x > 150:
        frill += " A13.5 11 0 0 1 %s 520" % f(x - 27)
        x -= 27
    frill += " Z"
    out += A.shape(frill, (140, 494, 182, 38), ("#ffffff", "#fff8f6", "#eee2e2"), sw=4.2)
    skirt = "M178 398 L284 398 Q302 450 316 504 Q231 516 146 504 Q160 450 178 398 Z"
    dots = "".join('<circle cx="%s" cy="%s" r="4.5" fill="#fff" opacity=".8"/>' % (f(x), f(y)) for x, y in ((190, 430), (232, 444), (272, 428), (176, 474), (214, 486), (256, 478), (296, 472)))
    out += A.shape(skirt, (146, 398, 170, 118), APRON, sw=4.6, inner=dots)
    # bib with a lace edge
    lace = "".join('<circle cx="%s" cy="318" r="7" fill="#fff" stroke="%s" stroke-width="2.6"/>' % (f(x), INK) for x in range(196, 268, 12))
    out += lace
    bib = "M192 318 L270 318 Q274 360 276 400 L186 400 Q188 360 192 318 Z"
    out += A.shape(bib, (186, 318, 90, 82), APRON, sw=4.6, inner=chin_sh(A))
    # heart pocket with stitches
    hd = heart_d(231, 360, 1.25)
    hg = A.lin([(0, "#fbb6c8"), (1, "#ee8fa9")], 0, 0, 0, 1)
    out += '<path d="%s" fill="%s" stroke="%s" stroke-width="3.6" stroke-linejoin="round"/>' % (hd, hg, INK)
    out += '<path d="%s" fill="none" stroke="#fff" stroke-width="2" stroke-dasharray="4 4" opacity=".9" transform="translate(231 360) scale(.78) translate(-231 -360)"/>' % hd
    out += '<ellipse cx="220" cy="352" rx="5" ry="3" fill="#fff" opacity=".7" transform="rotate(-30 220 352)"/>'
    # waistband and bow
    out += A.shape("M174 392 L288 392 Q291 401 288 410 L174 410 Q171 401 174 392 Z", (171, 392, 120, 18), ("#f9b9ca", "#f3a3ba", "#e6a3b6"), sw=4, hl=0.4)
    out += A.ellipse(306, 392, 22, 13, ("#fbc4d2", "#f3a3ba", "#e6a3b6"), rot=-28, sw=4)
    out += A.ellipse(308, 418, 20, 12, ("#fbc4d2", "#f3a3ba", "#e6a3b6"), rot=30, sw=4)
    out += A.ellipse(290, 402, 10, 10, ("#fbc4d2", "#f3a3ba", "#e6a3b6"), sw=4)
    return out


def dress(A):
    out = ""
    d = cr_path([(186, 310), (276, 310), (290, 336), (282, 398), (312, 470), (326, 520), (231, 532), (136, 520), (150, 470), (180, 398), (172, 336)])
    trim = '<path d="M140 506 Q231 522 322 506" fill="none" stroke="#fff" stroke-width="5" opacity=".85" stroke-dasharray="1 11" stroke-linecap="round"/>'
    trim += line("M180 398 Q231 410 282 398", 3.4, "#a98fd0", 0.9)
    out += A.shape(d, (136, 310, 190, 222), LILAC_DRESS, sw=4.8, inner=trim + chin_sh(A))
    out += A.ellipse(206, 318, 30, 16, ("#ffffff", "#fbf7f2", "#ece4e0"), rot=12, sw=4)
    out += A.ellipse(256, 318, 30, 16, ("#ffffff", "#fbf7f2", "#ece4e0"), rot=-12, sw=4)
    out += A.ellipse(218, 330, 11, 8, ("#fcc8d6", "#f4a6bc", "#e6a3b6"), rot=-20, sw=3.4)
    out += A.ellipse(244, 330, 11, 8, ("#fcc8d6", "#f4a6bc", "#e6a3b6"), rot=20, sw=3.4)
    out += A.ellipse(231, 331, 6.5, 6.5, ("#fcc8d6", "#f4a6bc", "#e6a3b6"), sw=3.2)
    return out


def tshirt(A):
    d = cr_path([(186, 300), (231, 314), (276, 300), (300, 330), (312, 400), (316, 470), (231, 484), (146, 470), (150, 400), (162, 330)])
    paw = '<g fill="#fff" opacity=".9"><ellipse cx="231" cy="392" rx="15" ry="12"/><circle cx="214" cy="372" r="6"/><circle cx="226" cy="364" r="6"/><circle cx="238" cy="364" r="6"/><circle cx="249" cy="372" r="6"/></g>'
    out = A.shape(d, (146, 300, 170, 184), TEE, sw=4.8, inner=paw + chin_sh(A))
    out += line("M190 306 Q231 330 272 306", 5, "#7fb9e6", 0.9)
    return out


def scarf(A, pal):
    band = cr_path([(166, 300), (200, 316), (231, 320), (262, 316), (296, 300), (302, 322), (231, 344), (160, 322)], corners=(0, 4))
    out = A.shape(band, (160, 300, 142, 44), pal, sw=4.6, inner=line("M176 314 Q231 338 286 314", 3, "#ffffff", 0.45))
    tail = cr_path([(188, 330), (220, 330), (226, 404), (192, 410)], corners=(0, 1, 2, 3))
    fringe = "".join(line("M%s 406 l-1 12" % f(x), 4, pal[2] if False else INK, 0.8) for x in (198, 207, 216))
    out += fringe
    out += A.shape(tail, (188, 330, 38, 80), pal, sw=4.4, inner=line("M194 352 L222 350 M195 376 L224 374", 3, "#ffffff", 0.5))
    out += A.ellipse(206, 330, 17, 14, pal, sw=4.2)
    return out


def ears_back(A, kind):
    out = ""
    if kind in ("mimi", "lulu"):
        tall = 1.0 if kind == "mimi" else 1.22
        for side in (-1, 1):
            b1 = head_at(180 + 22 if side < 0 else 360 - 22 - 0, 0.04)
            b1 = head_at(203, 0.03) if side < 0 else head_at(337, 0.03)
            b2 = head_at(250, 0.03) if side < 0 else head_at(290, 0.03)
            tip = (HX + side * 120, HY - 112 - 40 * tall)
            mid1 = ((b1[0] + tip[0]) / 2 + side * 6, (b1[1] + tip[1]) / 2)
            mid2 = ((b2[0] + tip[0]) / 2 + side * 4, (b2[1] + tip[1]) / 2 - 4)
            inside = (HX + side * 70, HY - 40)
            pts = [b1, mid1, tip, mid2, b2, inside]
            fur = FUR[kind]
            out += A.poly(pts, fur, corners=(2,), sw=5.4, hl=0.3)
            # inner ear
            k = 0.62
            cx_, cy_ = (b1[0] + b2[0] + tip[0]) / 3, (b1[1] + b2[1] + tip[1]) / 3 + 6
            ipts = [(cx_ + (q[0] - cx_) * k, cy_ + (q[1] - cy_) * k) for q in (b1, mid1, tip, mid2, b2)]
            ipal = PINK_IN if kind == "mimi" else ("#fff6fb", "#f6e9f6", "#e8d8ec")
            out += A.poly(ipts, ipal, corners=(2,), sw=0, outline=False, hl=0)
            fl = "".join(line("M%s %s q%s %s %s %s" % (f(cx_ + side * dx), f(cy_ + 22), f(side * -2), -16, f(side * 6), -34), 3.2, "#ffffff", 0.95) for dx in (-6, 6))
            out += fl
    elif kind == "bella":
        for side in (-1, 1):
            cx_, cy_ = HX + side * 46, HY - 160
            pts = ell_pts(cx_, cy_, 30, 86, 26, side * 9)
            out += A.poly(pts, FUR["bella"], sw=5.4, hl=0.4)
            out += A.poly(ell_pts(cx_ + side * 1, cy_ + 6, 14, 62, 22, side * 9), PINK_IN, sw=0, outline=False, hl=0.35)
    elif kind == "puff":
        for side in (-1, 1):
            cx_, cy_ = HX + side * 122, HY + 14
            out += A.poly(ell_pts(cx_, cy_, 38, 20, 22, side * 16), ("#fff8f6", "#fde9e8", "#f0d3d3"), sw=5)
            out += A.poly(ell_pts(cx_ + side * 4, cy_ + 1, 22, 10, 18, side * 16), PINK_IN, sw=0, outline=False, hl=0)
    return out


def ears_front(A, kind):
    if kind != "momo":
        return ""
    out = ""
    pal = ("#d9a578", "#b8835a", "#b48c70")
    for side in (-1, 1):
        top = (HX + side * 96, HY - 88)
        pts = [top, (HX + side * 140, HY - 80), (HX + side * 166, HY - 20), (HX + side * 164, HY + 52), (HX + side * 140, HY + 76),
               (HX + side * 120, HY + 50), (HX + side * 112, HY - 10), (HX + side * 76, HY - 76)]
        if side > 0:
            pts = pts[::-1]
        out += A.poly(pts, pal, sw=5.4, hl=0.35)
    return out


def head_extras(A, kind):
    if kind == "mimi":
        return flower(A, HX - 92, HY - 96, 1.15)
    if kind == "bella":
        return A.poly(star_pts(HX + 70, HY - 92, 24, 11, -80), ("#fff6c8", "#ffde7a", "#efcc7a"), corners=tuple(range(0, 10, 2)), sw=4)
    return ""


def wool_cap(A):
    pts, cr = wool_pts(HX, HY - 62, 104, 48, 7, 0.2, start=0.2)
    pts = [p for p in pts]
    curls = "".join(line("M%s %s q6 -8 12 0 q-2 8 -8 6" % (f(x), f(y)), 3, "#ddd1cc", 0.9) for x, y in ((185, 135), (226, 122), (262, 136), (205, 162), (244, 160)))
    return A.poly(pts, FUR["puff"], corners=cr, sw=5.2, inner=curls, hl=0.6)


# ------------------------------------------------------------------ items (sizes follow the game's boxes)
CUPS = {
    "pink": ("#fde3ea", "#f6b3c4", "#e48aa3", "#c4607c"),
    "mint": ("#e2f7ef", "#aee6d2", "#7ccbb0", "#4e9e86"),
    "cream": ("#fff6dc", "#f8e2a8", "#e7c477", "#bb9547"),
}


def cup_svg(cid):
    A = Art(440, 420)
    light, base, dark, deep = CUPS[cid]
    out = '<ellipse cx="200" cy="396" rx="128" ry="16" fill="#5a3a3a" opacity=".22" filter="%s"/>' % A.blur(6)
    # handle (behind body): an outlined tube with shading
    hpts = limb_pts((300, 205), (430, 220), (296, 330), 22, 22, 14)
    out += A.poly(hpts, (light, base, dark), sw=6, hl=0.35)
    # body
    body = "M76 149 L92 330 Q98 388 160 390 L240 390 Q302 388 308 330 L324 149 Z"
    deco = ""
    if cid == "pink":
        deco = "".join('<path d="%s" fill="#fff" opacity=".85"/>' % heart_d(x, y, 0.75) for x, y in ((150, 250), (250, 240), (200, 310), (120, 330), (286, 318)))
    elif cid == "mint":
        deco = "".join('<circle cx="%s" cy="%s" r="11" fill="#fff" opacity=".85"/>' % (x, y) for x, y in ((130, 230), (200, 262), (270, 230), (160, 320), (240, 330), (300, 300), (104, 300)))
    else:
        deco = '<path d="M80 236 L322 236 L318 268 L84 268 Z" fill="#f6a9bd" opacity=".9"/>' + \
            "".join('<circle cx="%s" cy="252" r="5" fill="#fff" opacity=".9"/>' % x for x in range(104, 310, 26))
    deco += '<path d="M104 182 Q100 260 118 350" fill="none" stroke="#fff" stroke-width="15" stroke-linecap="round" opacity=".5" filter="%s"/>' % A.blur(3)
    grad = A.lin([(0, light), (0.35, base), (1, dark)], 0, 0, 1, 0.15)
    out += A.shape(body, (76, 149, 248, 241), (light, base, deep), sw=6.5, inner=deco, grad=grad, shadow=(16, 10), sblur=12, hl=0)
    # rim top surface and the dark inside
    out += '<ellipse cx="200" cy="149" rx="126" ry="37" fill="%s" stroke="%s" stroke-width="6.5"/>' % (A.lin([(0, "#fffdf9"), (1, light)], 0, 0, 0, 1), INK)
    ig = A.lin([(0, deep), (0.6, dark), (1, base)], 0, 0, 0, 1)
    out += '<ellipse cx="200" cy="149" rx="109" ry="29.5" fill="%s" stroke="%s" stroke-width="5"/>' % (ig, INK)
    out += '<ellipse cx="200" cy="153" rx="96" ry="22" fill="%s" opacity=".45" filter="%s"/>' % (deep, A.blur(4))
    out += '<path d="M118 132 Q160 118 210 117" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity=".75"/>'
    return A.svg(out)


def jug_svg():
    A = Art(320, 320)
    body_pts = [(98, 86), (222, 86), (238, 110), (248, 170), (250, 240), (236, 286), (160, 300), (84, 286), (70, 240), (72, 170), (82, 110)]
    handle = limb_pts((84, 120), (-8, 130), (78, 236), 15, 15, 14)
    out = A.poly(handle, ("#fffaf4", "#f3e9dc", "#e2d2c2"), sw=6, hl=0.3)
    band = '<path d="M60 200 Q160 222 260 200 L260 236 Q160 258 60 236 Z" fill="#a8e2cf"/>'
    band += '<path d="%s" fill="#f6a9bd" stroke="%s" stroke-width="3"/>' % (heart_d(160, 160, 1.1), INK)
    out += A.poly(body_pts, ("#fffdf9", "#f6eee4", "#e3d5c6"), sw=6.2, inner=band, shadow=(14, 10), hlpos=(0.3, 0.3))
    # spout (up-right, tip near 300,28) and rim
    spout = "M186 70 Q230 72 258 52 Q280 36 302 28 Q300 52 284 74 Q262 104 226 112 Z"
    out += A.shape(spout, (186, 28, 116, 84), ("#fffdf9", "#f6eee4", "#e3d5c6"), sw=6, hl=0.3)
    out += '<ellipse cx="158" cy="88" rx="66" ry="17" fill="#fffdf9" stroke="%s" stroke-width="5"/>' % INK
    out += '<ellipse cx="158" cy="90" rx="54" ry="11" fill="%s"/>' % A.lin([(0, "#efe5d9"), (1, "#ffffff")], 0, 0, 0, 1)
    out += '<path d="M206 84 Q246 74 270 54 Q286 42 296 34 Q284 62 258 82 Q236 96 214 98 Z" fill="%s"/>' % A.lin([(0, "#dccab6"), (1, "#f4ebe0")], 0, 0, 0, 1)
    out += '<path d="M214 98 Q236 96 258 82 Q284 62 296 34" fill="none" stroke="%s" stroke-width="3.5" stroke-linecap="round" opacity=".7"/>' % INK
    return A.svg(out)


def spoon_svg():
    A = Art(240, 240)
    handle = limb_pts((52, 196), (110, 132), (162, 76), 11, 14, 8)
    out = A.poly(handle, ("#fbd0dc", "#ee8ba3", "#e090a6"), sw=5.5, hl=0.5)
    bowl = ell_pts(184, 52, 30, 40, 24, 42)
    out += A.poly(bowl, ("#ffffff", "#e3e8ef", "#c8cfda"), sw=5.5, hl=0.7, inner='<ellipse cx="190" cy="56" rx="16" ry="24" fill="#c9d1dc" opacity=".6" transform="rotate(42 190 56)"/>')
    out += '<path d="%s" fill="#fff" opacity=".9"/>' % heart_d(70, 178, 0.55)
    return A.svg(out)


def bell_svg():
    A = Art(300, 280)
    out = '<ellipse cx="150" cy="262" rx="132" ry="14" fill="#5a3a3a" opacity=".22" filter="%s"/>' % A.blur(6)
    base = "M34 214 Q34 200 50 200 L250 200 Q266 200 266 214 L266 238 Q266 252 250 252 L50 252 Q34 252 34 238 Z"
    out += A.shape(base, (34, 200, 232, 52), ("#fcd2de", "#f3a9be", "#e09aae"), sw=6, hl=0.45)
    out += A.poly([(138, 70), (162, 70), (166, 96), (134, 96)], ("#fff4cc", "#f2c95c", "#d9b263"), corners=(0, 1, 2, 3), sw=5)
    out += A.ellipse(150, 64, 22, 14, ("#fff4cc", "#f2c95c", "#d9b263"), sw=5)
    dome = "M54 204 C54 120 100 92 150 92 C200 92 246 120 246 204 Z"
    grad = A.lin([(0, "#fff3c2"), (0.35, "#f7d677"), (0.75, "#e6b445"), (1, "#c99a2e")], 0, 0, 1, 0.3)
    inner = '<path d="M86 186 C84 140 108 116 140 108" fill="none" stroke="#fff" stroke-width="12" stroke-linecap="round" opacity=".7" filter="%s"/>' % A.blur(2.5)
    out += A.shape(dome, (54, 92, 192, 112), ("#fff3c2", "#f2c95c", "#d6a95a"), sw=6, grad=grad, inner=inner, hl=0)
    out += '<rect x="46" y="198" width="208" height="12" rx="6" fill="%s" stroke="%s" stroke-width="5"/>' % (A.lin([(0, "#f7d677"), (1, "#c99a2e")], 0, 0, 0, 1), INK)
    return A.svg(out)


def mat_svg():
    A = Art(400, 120)
    out = '<ellipse cx="200" cy="64" rx="166" ry="42" fill="%s" stroke="%s" stroke-width="5.5"/>' % (A.lin([(0, "#fdeff3"), (1, "#f4c9d5")], 0, 0, 0, 1), INK)
    # knitted rings of little v stitches
    for ring, (rx, ry, col) in enumerate(((150, 36, "#ee9db3"), (118, 28, "#ffffff"), (88, 20, "#ee9db3"), (58, 13, "#a8e2cf"), (30, 7, "#ffffff"))):
        n = max(10, int(rx / 5))
        for k in range(n):
            a = 2 * math.pi * k / n
            x, y = 200 + rx * math.cos(a), 62 + ry * math.sin(a)
            out += '<path d="M%s %s l3 4 l3 -4" fill="none" stroke="%s" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" opacity=".9"/>' % (f(x - 3), f(y - 2), col)
    out += '<ellipse cx="200" cy="64" rx="166" ry="42" fill="none" stroke="#fff" stroke-width="3" stroke-dasharray="2 7" stroke-linecap="round" opacity=".9" transform="translate(200 64) scale(.95) translate(-200 -64)"/>'
    return A.svg(out)


def heart_svg():
    A = Art(160, 160)
    g = A.rad([(0, "#ffd0db"), (0.6, "#f490ab"), (1, "#e06a8c")], cx="38%", cy="30%", r="80%")
    out = A.shape(heart_d(80, 78, 3.6), (18, 16, 124, 124), ("#ffd0db", "#f490ab", "#e9a0b4"), sw=6, grad=g, hl=0.75, hlpos=(0.3, 0.3), hlsize=(0.14, 0.1))
    return A.svg(out)


def topping_svg(kind):
    A = Art(240, 240)
    out = ""
    if kind == "cream":
        pal = ("#ffffff", "#fff8ef", "#ecdccd")
        rid = "#e9d8c8"
        out += A.poly([(34, 176), (30, 150), (54, 132), (120, 124), (186, 132), (210, 150), (206, 176), (120, 192)], pal, sw=6,
                      inner=line("M64 140 Q60 160 70 182 M98 132 Q94 160 100 188 M142 132 Q146 160 140 188 M176 140 Q180 160 170 182", 3.2, rid))
        out += A.poly([(58, 138), (58, 112), (84, 96), (156, 96), (182, 112), (182, 138), (120, 148)], pal, sw=6,
                      inner=line("M86 104 Q82 124 90 144 M120 98 Q118 124 120 148 M154 104 Q158 124 150 144", 3.2, rid))
        out += A.poly([(84, 104), (88, 80), (110, 66), (132, 52), (150, 58), (148, 72), (156, 92), (152, 108), (120, 114)], pal, sw=6,
                      inner=line("M110 76 Q106 94 112 110 M134 66 Q132 86 136 108", 3.2, rid))
    elif kind == "marshmallows":
        for x, y, r, pal in ((80, 136, -10, ("#ffffff", "#fff6f2", "#ecdada")), (156, 140, 12, ("#ffe4ec", "#fbc4d3", "#efbccb")), (118, 92, 4, ("#ffffff", "#fff2f6", "#ecd5dc"))):
            pts = [rot_pt(p, (x, y), r) for p in ((x - 38, y - 30), (x + 38, y - 30), (x + 38, y + 30), (x - 38, y + 30))]
            d = rrect_d(x - 40, y - 34, 80, 68, 22)
            out += '<g transform="rotate(%s %s %s)">%s</g>' % (r, x, y, A.shape(d, (x - 40, y - 34, 80, 68), pal, sw=6, hl=0.8))
    elif kind == "sprinkles":
        cols = ["#f6a9bd", "#a8e2cf", "#ffe08a", "#b9d6f5", "#d6c1f0", "#fffaf2"]
        k = 0
        rows = [(186, range(40, 205, 26)), (164, range(52, 195, 24)), (142, range(64, 180, 24)), (120, range(78, 165, 24)), (98, range(96, 150, 24)), (78, range(110, 135, 24))]
        for y, xs in rows:
            for x in xs:
                a = (k * 53) % 180 - 90
                out += '<rect x="%s" y="%s" width="34" height="13" rx="6.5" fill="%s" stroke="%s" stroke-width="3.2" transform="rotate(%s %s %s)"/>' % (x - 17, y - 6.5, cols[k % 6], INK, a, x, y)
                out += '<rect x="%s" y="%s" width="14" height="3.5" rx="1.7" fill="#fff" opacity=".7" transform="rotate(%s %s %s)"/>' % (x - 10, y - 4, a, x, y)
                k += 1
    else:
        pal = ("#ffb3b8", "#f2647a", "#d97a8a")
        pts = [(120, 212), (78, 170), (54, 116), (66, 76), (100, 62), (120, 66), (140, 62), (174, 76), (186, 116), (162, 170)]
        seeds = "".join('<ellipse cx="%s" cy="%s" rx="3.5" ry="5.5" fill="#fff3b0" stroke="#c7465c" stroke-width="1.2"/>' % (x, y) for x, y in ((90, 104), (120, 98), (150, 104), (78, 134), (106, 132), (134, 132), (162, 134), (94, 160), (122, 162), (148, 160), (110, 188), (132, 188)))
        out += A.poly(pts, pal, sw=6, inner=seeds, hl=0.7)
        leaf = ("#c8f0c0", "#86cf86", "#8fbf8f")
        for a in (-60, -20, 20, 60):
            lp = [rot_pt(p, (120, 68), a) for p in ((120, 68), (108, 50), (120, 26), (132, 50))]
            out += A.poly(lp, leaf, corners=(0, 2), sw=4.5, hl=0.4)
        out += A.ellipse(120, 62, 12, 10, leaf, sw=4.5)
    return A.svg(out)


def rrect_d(x, y, w, h, r):
    return "M%s %s L%s %s Q%s %s %s %s L%s %s Q%s %s %s %s L%s %s Q%s %s %s %s L%s %s Q%s %s %s %s Z" % (
        f(x + r), f(y), f(x + w - r), f(y), f(x + w), f(y), f(x + w), f(y + r), f(x + w), f(y + h - r), f(x + w), f(y + h), f(x + w - r), f(y + h),
        f(x + r), f(y + h), f(x), f(y + h), f(x), f(y + h - r), f(x), f(y + r), f(x), f(y), f(x + r), f(y))


# ------------------------------------------------------------------ background (1600 x 900)
def background_svg():
    from draw_cafe_background import background  # noqa: E402  (kept in its own file: one picture, one file)
    return background(Art, INK, heart_d, line, f)


# ------------------------------------------------------------------ jobs, render, optimise, sheet
def jobs():
    j = {}
    for pose in ("stand", "smile", "wave", "high_five", "sit", "sleep"):
        j["mimi_" + pose] = (lambda p=pose: build_character("mimi", p), CW, CH)
    for kind in ("bella", "lulu", "momo", "puff"):
        for pose in ("stand", "walk", "sip", "cheer", "wave", "sit", "sleep"):
            j["friend_%s_%s" % (kind, pose)] = (lambda k=kind, p=pose: build_character(k, p), CW, CH)
    for cid in ("pink", "mint", "cream"):
        j["cup_" + cid] = (lambda c=cid: cup_svg(c), 440, 420)
    j["milk_jug"] = (jug_svg, 320, 320)
    j["spoon"] = (spoon_svg, 240, 240)
    j["bell"] = (bell_svg, 300, 280)
    j["cup_mat"] = (mat_svg, 400, 120)
    j["heart"] = (heart_svg, 160, 160)
    for t in ("cream", "marshmallows", "sprinkles", "strawberry"):
        j["topping_" + t] = (lambda k=t: topping_svg(k), 240, 240)
    j["cafe_background"] = (background_svg, 1600, 900)
    return j


def optimise(png_bytes, path, opaque):
    im = Image.open(io.BytesIO(png_bytes))
    im = im.convert("RGB") if opaque else im.convert("RGBA")
    if not opaque:
        # clean alpha: drop near-invisible fringe pixels
        a = im.getchannel("A").point(lambda v: 0 if v < 6 else v)
        im.putalpha(a)
    buf = io.BytesIO()
    im.save(buf, "PNG", optimize=True)
    data = buf.getvalue()
    note = "full"
    if len(data) > MAX_BYTES:
        q = im.quantize(256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.FLOYDSTEINBERG) if not opaque else im.quantize(256, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.FLOYDSTEINBERG)
        buf = io.BytesIO()
        q.save(buf, "PNG", optimize=True)
        data = buf.getvalue()
        note = "256 colours"
    with open(path, "wb") as fh:
        fh.write(data)
    return len(data), note


def render(names):
    all_jobs = jobs()
    results = {}
    with sync_playwright() as pw:
        br = pw.chromium.launch(args=["--mute-audio"])
        pg = br.new_page()
        for name in names:
            fn, w, h = all_jobs[name]
            svg = fn()
            src = os.path.join(SRC_DIR, name + ".svg")
            with open(src, "w", encoding="utf-8") as fh:
                fh.write(svg)
            pg.set_viewport_size({"width": w, "height": h})
            pg.set_content('<html><body style="margin:0;background:transparent">%s</body></html>' % svg)
            shot = pg.screenshot(omit_background=True, clip={"x": 0, "y": 0, "width": w, "height": h})
            size, note = optimise(shot, os.path.join(OUT_DIR, name + ".png"), name == "cafe_background")
            results[name] = (size, note)
        br.close()
    return results


def contact_sheet(names):
    tiles = []
    for n in names:
        p = os.path.join(OUT_DIR, n + ".png")
        if os.path.exists(p):
            tiles.append((n, Image.open(p).convert("RGBA")))
    cell = 300
    cols = 8
    chars = [t for t in tiles if t[0].startswith(("mimi", "friend"))]
    items = [t for t in tiles if not t[0].startswith(("mimi", "friend", "cafe_background"))]
    bg = [t for t in tiles if t[0] == "cafe_background"]
    rows_c = math.ceil(len(chars) / cols)
    rows_i = math.ceil(len(items) / cols)
    hgt = rows_c * 390 + rows_i * cell + (520 if bg else 0) + 20
    sheet = Image.new("RGBA", (cols * cell, hgt), (150, 150, 150, 255))
    y = 10
    for i, (n, im) in enumerate(chars):
        t = im.copy()
        t.thumbnail((cell - 10, 380))
        sheet.alpha_composite(t, (i % cols * cell + (cell - t.width) // 2, y + i // cols * 390 + (380 - t.height)))
    y += rows_c * 390
    for i, (n, im) in enumerate(items):
        t = im.copy()
        t.thumbnail((cell - 20, cell - 20))
        sheet.alpha_composite(t, (i % cols * cell + (cell - t.width) // 2, y + i // cols * cell + (cell - t.height) // 2))
    y += rows_i * cell
    for n, im in bg:
        t = im.copy()
        t.thumbnail((880, 500))
        sheet.alpha_composite(t, (10, y))
        # phone (390x844) and iPad (820x1180) crops: cover, anchored top centre
        for k, (vw, vh) in enumerate(((390, 844), (820, 1180))):
            scale = vh / im.height
            cw = int(vw / scale)
            x0 = (im.width - cw) // 2
            crop = im.crop((x0, 0, x0 + cw, im.height))
            crop.thumbnail((400, 500))
            sheet.alpha_composite(crop, (920 + k * 330 if k == 0 else 1180, y))
    sheet.convert("RGB").save(SHEET)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", default="")
    ap.add_argument("--sheet-only", action="store_true")
    a = ap.parse_args()
    names = list(jobs().keys())
    todo = [n for n in names if not a.only or any(n.startswith(k) for k in a.only.split(","))]
    if not a.sheet_only:
        res = render(todo)
        big = [(n, s) for n, (s, _) in res.items() if s > MAX_BYTES]
        for n, (s, note) in sorted(res.items()):
            print("%-34s %7d bytes  %s" % (n + ".png", s, note))
        if big:
            print("OVER %d KB: %s" % (MAX_BYTES // 1024, ", ".join(n for n, _ in big)))
    have = set(n + ".png" for n in names if os.path.exists(os.path.join(OUT_DIR, n + ".png")))
    # keep files other scripts listed (they still exist), so re-running this never drops their art
    old = os.path.join(OUT_DIR, "manifest.json")
    if os.path.exists(old):
        with open(old, encoding="utf-8") as fh:
            have |= set(x for x in json.load(fh).get("files", []) if os.path.exists(os.path.join(OUT_DIR, x)))
    have = sorted(have)
    with open(os.path.join(OUT_DIR, "manifest.json"), "w", encoding="utf-8") as fh:
        json.dump({"files": have}, fh, indent=1)
    contact_sheet(names)
    print("manifest: %d files; sheet: %s" % (len(have), SHEET))


if __name__ == "__main__":
    sys.path.insert(0, TOOLS)
    main()
