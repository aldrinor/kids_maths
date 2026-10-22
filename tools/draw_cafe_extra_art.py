"""draw_cafe_extra_art.py - draws the new pictures for Marie's two extra cafe reward games and renders PNGs.

Games: "Mimi's Ice Cream" (game/rewards/cafe_ice_cream.js) and "Mimi's Cookies" (game/rewards/cafe_cookie.js).
Same style and helpers as tools/draw_cafe_art.py (shaded shapes, warm outline, soft highlight); the characters,
the bell, the heart, the sprinkles and the strawberry are reused from that script's pictures.

Anchors the game code expects (canvas = 2x the game's box):
  cone_*            360 x 540   rim band across the top at y 70, tip at 180,520
  scoop_*           380 x 320   ball on top, drippy skirt at the bottom (skirt bottom about y 300)
  cone_stand_back   240 x 240   foot, stem and the back of the ring; cone_stand_front = the front of the ring
  cookie_*          600 x 600   outline = the "d" path in the COOKIE_SHAPES block of cafe_cookie.js, scaled 2x
  plate_stand       760 x 800   plate centre 380,350 radius 340, foot below
The cookie outlines are read from game/rewards/cafe_cookie.js (between COOKIE_SHAPES_BEGIN and COOKIE_SHAPES_END),
so the art and the icing clip always match.

Run:  python gh_site/tools/draw_cafe_extra_art.py [--only name1,name2] [--sheet-only]
Writes SVG sources to 16_kids_maths/work_tmp/art_src/cafe_extra/, PNGs to gh_site/game/rewards/art/cafe/,
merges the new names into art/cafe/manifest.json (other names are kept) and writes a contact sheet to
work_tmp/art_src/cafe_extra_contact_sheet.png. Every PNG must stay under 150 KB.
"""
import argparse
import json
import math
import os
import re
import sys

TOOLS = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, TOOLS)

import draw_cafe_art as base  # noqa: E402  (sets TEMP/TMP to work_tmp and imports Pillow and Playwright)
from draw_cafe_art import Art, INK, cr_path, ell_pts, limb_pts, rot_pt, heart_d, line, f, rrect_d, optimise, MAX_BYTES  # noqa: E402
from PIL import Image  # noqa: E402
from playwright.sync_api import sync_playwright  # noqa: E402

SITE = base.SITE
OUT_DIR = base.OUT_DIR
SRC_DIR = os.path.join(base.WORK_TMP, "art_src", "cafe_extra")
SHEET = os.path.join(base.WORK_TMP, "art_src", "cafe_extra_contact_sheet.png")
COOKIE_JS = os.path.join(SITE, "game", "rewards", "cafe_cookie.js")
os.makedirs(SRC_DIR, exist_ok=True)


def star_path_pts(cx, cy, r1, r2, n=5, rot=-90):
    pts = []
    for i in range(n * 2):
        a = math.radians(rot + i * 180 / n)
        r = r1 if i % 2 == 0 else r2
        pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return pts


# ------------------------------------------------------------------ ice cream
CONES = {
    "waffle": (("#fbe2b0", "#ecbf72", "#cf9a52"), None),
    "choc": (("#fbe2b0", "#ecbf72", "#cf9a52"), ("#b78260", "#7d4f35", "#5f3a26")),
    "pink": (("#ffe1ea", "#f6aec3", "#df8aa4"), None),
}


def cone_svg(kind):
    A = Art(360, 540)
    pal, dip = CONES[kind]
    body = [(46, 78), (180, 78), (314, 78), (250, 300), (196, 506), (180, 522), (164, 506), (110, 300)]
    grid = ""
    for k in range(-8, 9):
        x0 = 180 + k * 34
        grid += line("M%s 60 L%s 560" % (f(x0 - 130), f(x0 + 130)), 4.5, pal[2], 0.75)
        grid += line("M%s 60 L%s 560" % (f(x0 + 130), f(x0 - 130)), 4.5, pal[2], 0.75)
    if kind == "pink":
        grid = "".join('<circle cx="%s" cy="%s" r="7" fill="#fffaf5" opacity=".85"/>' % (x, y)
                       for y in range(120, 480, 44) for x in range(60 + (y // 44 % 2) * 22, 320, 44))
    if dip:
        grid += '<path d="M20 60 L340 60 L330 150 Q300 176 280 150 Q258 190 232 152 Q206 196 180 156 Q152 192 128 152 Q104 186 82 150 Q60 172 34 150 Z" fill="%s"/>' % A.lin([(0, dip[0]), (0.5, dip[1]), (1, dip[2])], 0, 0, 0, 1)
        grid += line("M70 92 Q120 82 160 86", 8, "#e9c3a8", 0.55)
    out = '<ellipse cx="180" cy="526" rx="40" ry="8" fill="#5a3a3a" opacity=".18" filter="%s"/>' % A.blur(4)
    out += A.poly(body, pal, corners=(0, 2), sw=6.5, inner=grid, hl=0.45, hlpos=(0.28, 0.2), hlsize=(0.12, 0.2))
    rim_pal = dip if dip else pal
    out += A.shape(rrect_d(30, 46, 300, 52, 26), (30, 46, 300, 52), rim_pal, sw=6, hl=0.5,
                   inner="" if dip else "".join('<path d="M%s 52 l10 40" stroke="%s" stroke-width="4" opacity=".6"/>' % (x, pal[2]) for x in range(46, 320, 22)))
    return A.svg(out)


SCOOPS = {
    "strawberry": (("#ffdbe4", "#f7a6bc", "#e08aa2"), "bits", "#e25a7c"),
    "mint": (("#e0f8ee", "#ade8d1", "#88cfb5"), "chips", "#6b4330"),
    "vanilla": (("#fffbf0", "#fbeec9", "#e9d6a9"), "specks", "#a8865a"),
    "chocolate": (("#d6a586", "#a8714f", "#8a5a3c"), "swirl", "#7a4a31"),
}


def scoop_pts():
    pts = []
    for i in range(15):  # the top of the ball, left to right
        a = math.pi + math.pi * i / 14
        pts.append((190 + 166 * math.cos(a), 168 + 146 * math.sin(a)))
    pts += [(362, 214), (346, 246)]
    # the drippy skirt, right to left: bumps and two longer drips
    skirt = [(318, 262), (300, 250), (280, 268), (262, 300), (244, 270), (220, 258), (196, 272), (172, 258), (146, 270),
             (122, 296), (104, 266), (82, 252), (60, 262), (34, 246), (18, 214)]
    return pts + skirt


def scoop_body(A, kind, scale=1.0, dx=0, dy=0):
    pal, deco, dc = SCOOPS[kind]
    pts = [(dx + x * scale, dy + y * scale) for x, y in scoop_pts()]
    inner = ""
    if deco == "bits":
        for x, y, r in ((120, 110, 9), (210, 80, 8), (260, 140, 10), (150, 190, 8), (90, 170, 7), (300, 196, 7), (220, 210, 9)):
            inner += '<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="%s" opacity=".75" transform="rotate(%s %s %s)"/>' % (
                f(dx + x * scale), f(dy + y * scale), f(r * scale), f(r * 0.7 * scale), dc, x % 60, f(dx + x * scale), f(dy + y * scale))
    elif deco == "chips":
        for x, y in ((110, 120), (200, 76), (270, 130), (160, 190), (80, 196), (300, 204), (230, 214), (140, 110)):
            inner += '<rect x="%s" y="%s" width="%s" height="%s" rx="%s" fill="%s" opacity=".85" transform="rotate(%s %s %s)"/>' % (
                f(dx + (x - 7) * scale), f(dy + (y - 5) * scale), f(14 * scale), f(10 * scale), f(3 * scale), dc, (x * 7) % 90 - 45, f(dx + x * scale), f(dy + y * scale))
    elif deco == "specks":
        for x, y in ((120, 100), (180, 70), (240, 110), (290, 160), (100, 170), (170, 150), (220, 200), (140, 214), (270, 220), (60, 210)):
            inner += '<circle cx="%s" cy="%s" r="%s" fill="%s" opacity=".7"/>' % (f(dx + x * scale), f(dy + y * scale), f(3.2 * scale), dc)
    else:
        inner += line("M%s %s Q%s %s %s %s" % (f(dx + 80 * scale), f(dy + 150 * scale), f(dx + 170 * scale), f(dy + 110 * scale), f(dx + 290 * scale), f(dy + 150 * scale)),
                      9 * scale, "#c48f6c", 0.8)
    return A.poly(pts, pal, sw=6.2 * scale, inner=inner, hl=0.6, hlpos=(0.3, 0.22), hlsize=(0.2, 0.14), shadow=(14 * scale, 14 * scale))


def scoop_svg(kind):
    A = Art(380, 320)
    return A.svg(scoop_body(A, kind))


def tub_svg(kind):
    """The shelf picture of a flavour: a paper tub with a heap of ice cream."""
    A = Art(300, 300)
    pal = SCOOPS[kind][0]
    out = '<ellipse cx="150" cy="284" rx="104" ry="10" fill="#5a3a3a" opacity=".2" filter="%s"/>' % A.blur(5)
    # the heap: a scoop shape, scaled and moved so its skirt hides behind the tub rim
    out += scoop_body(A, kind, 0.66, 24, 18)
    tub = [(44, 150), (150, 150), (256, 150), (236, 270), (150, 280), (64, 270)]
    stripes = "".join('<path d="M%s 140 L%s 290" stroke="%s" stroke-width="16" opacity=".55"/>' % (x, x - 6 if x < 150 else x + 6, pal[1]) for x in range(70, 250, 36))
    out += A.poly(tub, ("#fffdf8", "#f8efe6", "#e6d8cc"), corners=(0, 2, 3, 5), sw=6, inner=stripes, hl=0.4)
    out += A.shape(rrect_d(34, 138, 232, 30, 15), (34, 138, 232, 30), ("#fffdf8", "#f3e7da", "#e0cfbf"), sw=5.5, hl=0.5)
    out += '<path d="%s" fill="%s" stroke="%s" stroke-width="3.5"/>' % (heart_d(150, 214, 1.2), pal[1], INK)
    return A.svg(out)


def sauce_svg(kind):
    A = Art(240, 320)
    pal = ("#c79474", "#8a5a3c", "#6e452e") if kind == "chocolate" else ("#ffc2cf", "#ec6f8f", "#cf5576")
    out = '<ellipse cx="120" cy="306" rx="74" ry="9" fill="#5a3a3a" opacity=".2" filter="%s"/>' % A.blur(5)
    label = '<rect x="58" y="160" width="124" height="80" rx="22" fill="#fffaf2" opacity=".95"/>'
    label += '<path d="%s" fill="%s" stroke="%s" stroke-width="3.5"/>' % (heart_d(120, 196, 1.5), pal[1], INK)
    out += A.shape(rrect_d(44, 100, 152, 196, 50), (44, 100, 152, 196), pal, sw=6.2, inner=label, hl=0.55)
    out += A.shape(rrect_d(70, 70, 100, 40, 14), (70, 70, 100, 40), ("#fffaf2", "#f3e7da", "#dccbbb"), sw=5.5, hl=0.4)
    out += A.poly([(98, 74), (142, 74), (126, 18), (114, 18)], ("#fffaf2", "#f3e7da", "#dccbbb"), corners=(0, 1, 2, 3), sw=5.5, hl=0.4)
    out += '<ellipse cx="120" cy="16" rx="8" ry="6" fill="%s" stroke="%s" stroke-width="4"/>' % (pal[1], INK)
    return A.svg(out)


def cherry_svg():
    A = Art(240, 240)
    out = line("M122 118 Q128 64 162 34", 12, INK)
    out += line("M122 118 Q128 64 162 34", 6, "#7fbf72")
    leaf = [(160, 36), (186, 22), (214, 30), (190, 50)]
    out += A.poly(leaf, ("#d4f2c4", "#8fd08a", "#77b874"), corners=(0, 2), sw=4.5, hl=0.5)
    out += A.ellipse(118, 160, 64, 60, ("#ff9aa6", "#e8475f", "#c9374f"), sw=6, hl=0.8, hlpos=(0.32, 0.26), hlsize=(0.16, 0.12))
    out += line("M108 112 Q118 122 128 112", 5, INK)
    return A.svg(out)


def wafer_svg():
    A = Art(240, 240)
    pts = [(58, 196), (40, 176), (166, 34), (194, 34), (204, 58)]
    rib = "".join(line("M%s %s l26 22" % (f(60 + k * 14), f(170 - k * 15.5)), 4, "#cf9a52", 0.8) for k in range(10))
    out = A.poly([(52, 200), (34, 178), (170, 28), (206, 50)], ("#fbe2b0", "#ecbf72", "#cf9a52"), corners=(0, 1, 2, 3), sw=6, inner=rib, hl=0.5)
    out += A.ellipse(188, 39, 18, 14, ("#fff0d0", "#f2cf8e", "#d6aa66"), rot=-48, sw=5, hl=0.3)
    out += '<ellipse cx="188" cy="39" rx="9" ry="6" fill="#a8714f" transform="rotate(-48 188 39)"/>'
    return A.svg(out)


def cone_stand_back_svg():
    A = Art(240, 240)
    pal = ("#d9f6ea", "#a5e3cc", "#86cdb3")
    out = '<ellipse cx="120" cy="226" rx="96" ry="10" fill="#5a3a3a" opacity=".22" filter="%s"/>' % A.blur(5)
    out += A.ellipse(120, 206, 92, 22, pal, sw=6, hl=0.5)
    out += A.shape(rrect_d(104, 64, 32, 142, 12), (104, 64, 32, 142), pal, sw=6, hl=0.4)
    out += '<ellipse cx="120" cy="40" rx="74" ry="22" fill="%s" stroke="%s" stroke-width="5"/>' % (A.lin([(0, "#7cc4aa"), (1, "#b9ebd8")], 0, 0, 0, 1), INK)
    return A.svg(out)


def cone_stand_front_svg():
    A = Art(240, 240)
    pal = ("#e6fbf2", "#a5e3cc", "#86cdb3")
    ring = "M46 40 Q46 68 120 70 Q194 68 194 40 L194 52 Q194 86 120 88 Q46 86 46 52 Z"
    out = A.shape(ring, (46, 40, 148, 48), pal, sw=6, hl=0.6, hlpos=(0.3, 0.4), hlsize=(0.2, 0.2))
    out += '<path d="%s" fill="#fffaf5" opacity=".9"/>' % heart_d(120, 70, 0.55)
    return A.svg(out)


# ------------------------------------------------------------------ cookies
def cookie_shapes():
    with open(COOKIE_JS, encoding="utf-8") as fh:
        js = fh.read()
    m = re.search(r"/\* COOKIE_SHAPES_BEGIN \*/(.*?)/\* COOKIE_SHAPES_END \*/", js, re.S)
    if not m:
        raise SystemExit("COOKIE_SHAPES block not found in %s" % COOKIE_JS)
    return json.loads(m.group(1))


def cookie_svg(kind):
    A = Art(600, 600)
    d = cookie_shapes()[kind]["d"]
    pal = ("#fbe4b8", "#eebd7c", "#cf9254")
    bake = A.blur(10)
    inner = '<path d="%s" fill="none" stroke="#c98a4c" stroke-width="22" opacity=".55" filter="%s" transform="scale(2)"/>' % (d, A.blur(6))
    for x, y, r in ((180, 200, 7), (300, 150, 6), (420, 220, 7), (250, 320, 6), (380, 360, 7), (200, 420, 6), (320, 460, 5), (460, 330, 6), (140, 300, 5)):
        inner += '<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="#d9a066" opacity=".7"/>' % (x, y, r, r * 0.7)
    out = '<g transform="translate(6 14)"><path d="%s" fill="#5a3a3a" opacity=".22" filter="%s" transform="scale(2)"/></g>' % (d, bake)
    scaled = re.sub(r"-?\d+(?:\.\d+)?", lambda mm: f(float(mm.group(0)) * 2), d)
    out += A.shape(scaled, (0, 0, 600, 600), pal, sw=7, inner=inner, hl=0.5, hlpos=(0.32, 0.26), hlsize=(0.16, 0.1), shadow=(16, 18), sblur=14)
    return A.svg(out)


def plate_stand_svg():
    A = Art(760, 800)
    out = '<ellipse cx="380" cy="776" rx="170" ry="14" fill="#5a3a3a" opacity=".22" filter="%s"/>' % A.blur(6)
    out += A.poly([(300, 640), (460, 640), (500, 770), (260, 770)], ("#fde3ea", "#f6b3c4", "#e48aa3"), corners=(0, 1, 2, 3), sw=7, hl=0.4)
    out += A.ellipse(380, 350, 340, 340, ("#e6fbf2", "#bfeedd", "#9fd6c1"), sw=8, hl=0.35, hlpos=(0.28, 0.2), hlsize=(0.18, 0.1))
    dots = "".join('<circle cx="%s" cy="%s" r="9" fill="#fffaf5" opacity=".9"/>' % (f(380 + 310 * math.cos(2 * math.pi * k / 36)), f(350 + 310 * math.sin(2 * math.pi * k / 36))) for k in range(36))
    out += dots
    out += '<circle cx="380" cy="350" r="272" fill="%s" stroke="%s" stroke-width="5"/>' % (A.lin([(0, "#fffcf6"), (1, "#f4ebe1")], 0, 0, 0, 1), INK)
    out += '<circle cx="380" cy="350" r="254" fill="none" stroke="#f3c6d3" stroke-width="5" stroke-dasharray="3 14" stroke-linecap="round"/>'
    return A.svg(out)


BAGS = {"pink": ("#ffc9d6", "#f490ab", "#d9708e"), "mint": ("#d6f5ea", "#7ccfb8", "#4fa58c"),
        "lemon": ("#fff1bf", "#f5d36b", "#d2ad3f"), "lilac": ("#ebdefb", "#b99ae6", "#9478c8")}


def piping_svg(kind):
    A = Art(240, 320)
    pal = BAGS[kind]
    out = '<ellipse cx="120" cy="306" rx="50" ry="8" fill="#5a3a3a" opacity=".18" filter="%s"/>' % A.blur(4)
    # the icing inside shows through the lower half of the bag
    inside = '<path d="M30 120 Q120 140 210 120 L140 262 L100 262 Z" fill="%s" opacity=".95"/>' % A.lin([(0, pal[0]), (0.6, pal[1]), (1, pal[2])], 0, 0, 0, 1)
    bag = [(36, 64), (120, 52), (204, 64), (214, 104), (150, 256), (90, 256), (26, 104)]
    out += A.poly(bag, ("#fffdf9", "#f4eee8", "#e2d6cc"), corners=(4, 5), sw=6, inner=inside, hl=0.55, hlpos=(0.3, 0.3), hlsize=(0.1, 0.2))
    out += A.shape(rrect_d(40, 30, 160, 40, 18), (40, 30, 160, 40), pal, sw=5.5, hl=0.5)
    out += A.poly([(98, 252), (142, 252), (132, 296), (108, 296)], ("#f4f6f9", "#cfd6df", "#aab3bf"), corners=(0, 1, 2, 3), sw=5, hl=0.6)
    out += line("M110 270 L110 292 M120 270 L120 294 M130 270 L130 292", 2.6, "#8c96a3", 0.8)
    out += '<ellipse cx="120" cy="300" rx="10" ry="6" fill="%s" stroke="%s" stroke-width="3"/>' % (pal[1], INK)
    return A.svg(out)


def candy_svg(kind):
    A = Art(240, 240)
    out = ""
    if kind == "hearts":
        for x, y, s, pal, r in ((86, 104, 2.1, ("#ffd0db", "#f490ab", "#e07b98"), -14), (156, 92, 1.8, ("#ffe0e6", "#f7b0c2", "#e796ab"), 12), (122, 166, 2.2, ("#ffb3be", "#ec6f8f", "#cf5576"), 4)):
            out += '<g transform="rotate(%s %s %s)">%s</g>' % (r, x, y, A.shape(heart_d(x, y, s), (x - 9 * s, y - 9 * s, 18 * s, 18 * s), pal, sw=5, hl=0.7))
    elif kind == "stars":
        for x, y, r1, pal, rot in ((88, 100, 46, ("#fff4c4", "#f7d36a", "#ddb24c"), -90), (162, 96, 38, ("#fff7d6", "#fbe08e", "#e5c46a"), -80), (124, 168, 44, ("#ffe9b0", "#f2c14e", "#d9a43c"), -100)):
            out += A.poly(star_path_pts(x, y, r1, r1 * 0.5, rot=rot), pal, sw=5, hl=0.7)
    else:
        for x, y, r, pal in ((80, 92, 26, ("#ffffff", "#f6eef4", "#e2d6e2")), (150, 80, 24, ("#fff6fa", "#f8d7e3", "#eabfd0")),
                             (180, 148, 26, ("#f6fffb", "#d9f3e9", "#bfe2d4")), (110, 156, 28, ("#ffffff", "#f3eefa", "#ddd3ec")), (60, 170, 20, ("#fffdf0", "#f6ebc6", "#e4d4a4"))):
            out += A.ellipse(x, y, r, r, pal, sw=5, hl=0.95, hlpos=(0.3, 0.26), hlsize=(0.2, 0.15))
    return A.svg(out)


# ------------------------------------------------------------------ jobs, render, sheet
def jobs():
    j = {}
    for k in CONES:
        j["cone_" + k] = (lambda k=k: cone_svg(k), 360, 540)
    for k in SCOOPS:
        j["scoop_" + k] = (lambda k=k: scoop_svg(k), 380, 320)
        j["tub_" + k] = (lambda k=k: tub_svg(k), 300, 300)
    for k in ("chocolate", "strawberry"):
        j["sauce_" + k] = (lambda k=k: sauce_svg(k), 240, 320)
    j["topping_cherry"] = (cherry_svg, 240, 240)
    j["topping_wafer"] = (wafer_svg, 240, 240)
    j["cone_stand_back"] = (cone_stand_back_svg, 240, 240)
    j["cone_stand_front"] = (cone_stand_front_svg, 240, 240)
    for k in ("heart", "star", "flower", "cat"):
        j["cookie_" + k] = (lambda k=k: cookie_svg(k), 600, 600)
    j["plate_stand"] = (plate_stand_svg, 760, 800)
    for k in BAGS:
        j["piping_" + k] = (lambda k=k: piping_svg(k), 240, 320)
    for k in ("hearts", "stars", "pearls"):
        j["candy_" + k] = (lambda k=k: candy_svg(k), 240, 240)
    return j


def render(names):
    all_jobs = jobs()
    results = {}
    with sync_playwright() as pw:
        br = pw.chromium.launch(args=["--mute-audio"])
        pg = br.new_page()
        for name in names:
            fn, w, h = all_jobs[name]
            svg = fn()
            with open(os.path.join(SRC_DIR, name + ".svg"), "w", encoding="utf-8") as fh:
                fh.write(svg)
            pg.set_viewport_size({"width": w, "height": h})
            pg.set_content('<html><body style="margin:0;background:transparent">%s</body></html>' % svg)
            shot = pg.screenshot(omit_background=True, clip={"x": 0, "y": 0, "width": w, "height": h})
            results[name] = optimise(shot, os.path.join(OUT_DIR, name + ".png"), False)
        br.close()
    return results


def contact_sheet(names):
    cell, cols = 260, 7
    tiles = [(n, Image.open(os.path.join(OUT_DIR, n + ".png")).convert("RGBA")) for n in names if os.path.exists(os.path.join(OUT_DIR, n + ".png"))]
    rows = math.ceil(len(tiles) / cols)
    sheet = Image.new("RGBA", (cols * cell, rows * cell), (150, 150, 150, 255))
    for i, (n, im) in enumerate(tiles):
        t = im.copy()
        t.thumbnail((cell - 16, cell - 16))
        sheet.alpha_composite(t, (i % cols * cell + (cell - t.width) // 2, i // cols * cell + (cell - t.height) // 2))
    sheet.convert("RGB").save(SHEET)


def merge_manifest(names):
    path = os.path.join(OUT_DIR, "manifest.json")
    files = set()
    if os.path.exists(path):
        with open(path, encoding="utf-8") as fh:
            files = set(x for x in json.load(fh).get("files", []) if os.path.exists(os.path.join(OUT_DIR, x)))
    files |= set(n + ".png" for n in names if os.path.exists(os.path.join(OUT_DIR, n + ".png")))
    with open(path, "w", encoding="utf-8") as fh:
        json.dump({"files": sorted(files)}, fh, indent=1)
    return len(files)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", default="")
    ap.add_argument("--sheet-only", action="store_true")
    a = ap.parse_args()
    names = list(jobs().keys())
    todo = [n for n in names if not a.only or any(n.startswith(k) for k in a.only.split(","))]
    if not a.sheet_only:
        res = render(todo)
        for n, (s, note) in sorted(res.items()):
            print("%-28s %7d bytes  %s" % (n + ".png", s, note))
        big = [n for n, (s, _) in res.items() if s > MAX_BYTES]
        if big:
            print("OVER %d KB: %s" % (MAX_BYTES // 1024, ", ".join(big)))
            return 1
    total = merge_manifest(names)
    contact_sheet(names)
    print("manifest: %d files; sheet: %s" % (total, SHEET))
    return 0


if __name__ == "__main__":
    sys.exit(main())
