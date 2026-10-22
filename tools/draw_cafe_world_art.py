"""draw_cafe_world_art.py - draws every picture of Marie's play world "Kitty Cafe World" (game/world/cafe_world.js).

Same look as the cafe reward game: SVG shapes with soft gradients, a soft core shadow, a glossy highlight and a warm
outline, rendered to PNG by headless Chromium. It reuses the drawing kit of draw_cafe_art.py (Art, eyes, blush, hearts,
the characters) so the new pictures match Mimi and her friends.

Pictures (all in gh_site/game/world/art/cafe/, each PNG under 150 KB):
  map_*        the map: the background and the four places (house, cafe, garden, pets)
  cafe_*       the cafe room parts (window, counter, door) and cafe furniture and decorations
  treat_*      the six treats friends can order
  *_blink      Mimi and her four friends with closed eyes (for idle blinking)
  garden_*, plant_*, seed_*   the garden: back scene, bed, plant stages, seed packets, tools, garden decorations
  pet_*        the four pets (kitten, bunny, puppy, hamster) sitting, happy and blinking, plus bed, bowls, ball, toys
  sticker_*, plans_board, icon_map   the plans card, its stickers and the map button

Run:  python gh_site/tools/draw_cafe_world_art.py [--only prefix1,prefix2] [--sheet-only]
Writes SVG sources to 16_kids_maths/work_tmp/art_src/cafe_world/, PNGs to gh_site/game/world/art/cafe/,
a manifest.json there, and a contact sheet to 16_kids_maths/work_tmp/world_shots/cafe/art_contact_sheet.png.
Exits with an error if any PNG is 150 KB or more.
"""
import argparse
import io
import json
import math
import os
import sys

TOOLS = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, TOOLS)
import draw_cafe_art as K  # noqa: E402  (the shared drawing kit; importing it sets TEMP/TMP to work_tmp)
from draw_cafe_art import Art, line, heart_d, star_pts, rrect_d, limb_pts, ell_pts, cr_path, rot_pt, f, INK  # noqa: E402
from PIL import Image  # noqa: E402
from playwright.sync_api import sync_playwright  # noqa: E402

SITE = os.path.dirname(TOOLS)
PROJECT = os.path.dirname(SITE)
WORK_TMP = os.path.join(PROJECT, "work_tmp")
SRC_DIR = os.path.join(WORK_TMP, "art_src", "cafe_world")
OUT_DIR = os.path.join(SITE, "game", "world", "art", "cafe")
SHEET = os.path.join(WORK_TMP, "world_shots", "cafe", "art_contact_sheet.png")
MAX_BYTES = 150 * 1024
for d in (SRC_DIR, OUT_DIR, os.path.dirname(SHEET)):
    os.makedirs(d, exist_ok=True)

# palettes: (light, mid, shade used for the soft multiply shadow)
PINK = ("#ffe6ee", "#f9bccd", "#e9a2b6")
ROSE = ("#ffd0dd", "#f490ab", "#d97d97")
MINT = ("#e4f8f0", "#aee6d2", "#8fcab5")
CREAM = ("#fffaf0", "#f6e6c6", "#e2c9a0")
WOOD = ("#f6d8b0", "#dfae7c", "#bf8d5c")
DKWOOD = ("#d9a478", "#b07a50", "#8a5a3a")
LILAC = ("#f3ecfc", "#d8c6f2", "#bea8de")
SKYP = ("#eaf6fe", "#b8def7", "#93c3e6")
LEAF = ("#d2f2bd", "#8fd27e", "#68ad62")
DKLEAF = ("#a9dd95", "#5fb35f", "#3f8a4a")
GOLD = ("#fff4c6", "#f6d27a", "#d6a64a")
WHITE = ("#ffffff", "#f8f2ef", "#e2d6d2")
PEACH = ("#fff0e4", "#fcd0b0", "#eab08a")
SOIL = ("#c99a74", "#9a6a4a", "#74503a")
TERRA = ("#ffd2b8", "#f0a27c", "#cf8060")
STONE = ("#f4f2f0", "#dcd6d2", "#bdb4ae")


def rect(A, x, y, w, h, r, pal, **kw):
    return A.shape(rrect_d(x, y, w, h, r), (x, y, w, h), pal, **kw)


def shadow(A, cx, cy, rx, ry=14, op=0.2):
    return '<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="#5a3a3a" opacity="%s" filter="%s"/>' % (f(cx), f(cy), f(rx), f(ry), op, A.blur(6))


def gloss(A, x1, y1, x2, y2, w=8, op=0.6):
    return '<path d="M%s %s L%s %s" stroke="#fff" stroke-width="%s" stroke-linecap="round" opacity="%s" filter="%s"/>' % (f(x1), f(y1), f(x2), f(y2), w, op, A.blur(2))


def leaf(A, x, y, length, width, ang, pal=LEAF, sw=4.5, vein=True):
    """A pointed leaf from (x, y) in direction ang (degrees, 0 = right, -90 = up)."""
    a = math.radians(ang)
    tip = (x + math.cos(a) * length, y + math.sin(a) * length)
    nx, ny = -math.sin(a), math.cos(a)
    m1 = (x + math.cos(a) * length * 0.45 + nx * width, y + math.sin(a) * length * 0.45 + ny * width)
    m2 = (x + math.cos(a) * length * 0.45 - nx * width, y + math.sin(a) * length * 0.45 - ny * width)
    inner = line("M%s %s L%s %s" % (f(x), f(y), f((x + tip[0] * 3) / 4), f((y + tip[1] * 3) / 4)), 2.6, pal[2], 0.8) if vein else ""
    return A.poly([(x, y), m1, tip, m2], pal, corners=(0, 2), sw=sw, inner=inner, hl=0.45, shadow=(4, 5), sblur=5)


def petal_flower(A, x, y, r, n, pal, center=GOLD, petal_len=1.0, petal_w=0.55, rot=0, sw=4):
    out = ""
    for k in range(n):
        a = math.radians(rot + k * 360 / n)
        px, py = x + math.cos(a) * r * 0.62 * petal_len, y + math.sin(a) * r * 0.62 * petal_len
        out += A.ellipse(px, py, r * 0.5 * petal_len, r * petal_w * 0.5, pal, rot=math.degrees(a), sw=sw, hl=0.4, shadow=(3, 4), sblur=4)
    out += A.ellipse(x, y, r * 0.36, r * 0.36, center, sw=sw, hl=0.6)
    return out


def stem(x1, y1, cx, cy, x2, y2, w=9, col="#6cb860"):
    return ('<path d="M%s %s Q%s %s %s %s" fill="none" stroke="%s" stroke-width="%s" stroke-linecap="round"/>' % (f(x1), f(y1), f(cx), f(cy), f(x2), f(y2), INK, w + 6)) + \
        ('<path d="M%s %s Q%s %s %s %s" fill="none" stroke="%s" stroke-width="%s" stroke-linecap="round"/>' % (f(x1), f(y1), f(cx), f(cy), f(x2), f(y2), col, w))


def eyes_pair(A, cx, cy, sep, mode, iris, rx=15, ry=19, lash=False):
    return K.eye(A, cx - sep, cy, mode, lash, iris, rx, ry, 0, -1) + K.eye(A, cx + sep, cy, mode, lash, iris, rx, ry, 0, 1)


def small_mouth(x, y, open_=False):
    if open_:
        d = "M%s %s Q%s %s %s %s Q%s %s %s %s Z" % (f(x - 11), f(y), f(x), f(y + 3), f(x + 11), f(y), f(x), f(y + 18), f(x - 11), f(y))
        return '<path d="%s" fill="#a8445a" stroke="%s" stroke-width="3.2" stroke-linejoin="round"/>' % (d, INK) + \
            '<ellipse cx="%s" cy="%s" rx="6" ry="3.5" fill="#f58ea5"/>' % (f(x), f(y + 11))
    return line("M%s %s q%s %s %s %s q%s %s %s %s" % (f(x - 10), f(y), 5, 6, 10, 0, 5, 6, 10, 0), 3.4)


def pet_nose(x, y, col="#f59ab0"):
    return '<path d="M%s %s Q%s %s %s %s Q%s %s %s %s Z" fill="%s" stroke="%s" stroke-width="2.8" stroke-linejoin="round"/>' % (
        f(x - 8), f(y - 4), f(x), f(y - 8), f(x + 8), f(y - 4), f(x), f(y + 6), f(x - 8), f(y - 4), col, INK) + \
        '<ellipse cx="%s" cy="%s" rx="3" ry="1.6" fill="#fff" opacity=".85"/>' % (f(x - 2), f(y - 4))


# ================================================================== the map
def map_background():
    A = Art(1600, 900)
    o = ['<rect width="1600" height="900" fill="%s"/>' % A.lin([(0, "#cfeaf7"), (0.38, "#eaf5f2"), (0.42, "#d9f0c8"), (1, "#bfe3a6")], 0, 0, 0, 1)]
    o.append('<circle cx="1260" cy="120" r="70" fill="#fff6cf" opacity=".95" filter="%s"/>' % A.blur(10))
    for cx, cy, s in ((240, 120, 1.0), (620, 70, 0.7), (1000, 150, 0.85), (1450, 260, 0.6)):
        o.append('<g opacity=".92" transform="translate(%s %s) scale(%s)"><ellipse cx="0" cy="0" rx="80" ry="26" fill="#fff"/><ellipse cx="-30" cy="-16" rx="40" ry="26" fill="#fff"/><ellipse cx="22" cy="-22" rx="46" ry="30" fill="#fff"/></g>' % (cx, cy, s))
    # far hills
    o.append('<path d="M0 360 Q200 250 420 320 Q640 380 860 300 Q1100 220 1320 310 Q1480 360 1600 300 L1600 460 L0 460 Z" fill="%s"/>' % A.lin([(0, "#cfe9c2"), (1, "#bfe0b0")], 0, 0, 0, 1))
    o.append('<path d="M0 420 Q260 340 520 400 Q800 460 1080 390 Q1360 330 1600 400 L1600 900 L0 900 Z" fill="%s"/>' % A.lin([(0, "#c9eab3"), (1, "#a9d98e")], 0, 0, 0, 1))
    # little far trees on the hills
    for x, y, s in ((120, 330, 0.8), (330, 300, 0.6), (1130, 290, 0.7), (1380, 320, 0.9), (1520, 300, 0.6), (700, 330, 0.5)):
        o.append('<g transform="translate(%s %s) scale(%s)"><rect x="-6" y="0" width="12" height="40" rx="4" fill="#b98a62"/><ellipse cx="0" cy="-14" rx="34" ry="36" fill="#93cf86"/><ellipse cx="-10" cy="-26" rx="14" ry="10" fill="#c3ebb5" opacity=".8"/></g>' % (x, y, s))
    # the winding cream path from the bottom to the four places
    o.append('<path d="M700 900 C720 780 640 700 760 620 C860 560 980 560 1060 500 M760 620 C640 580 520 560 420 500 M800 900 C820 820 900 760 1000 720 C1150 670 1250 690 1380 640 M700 760 C560 720 400 740 230 690" fill="none" stroke="#f3e2c2" stroke-width="70" stroke-linecap="round"/>')
    o.append('<path d="M700 900 C720 780 640 700 760 620 C860 560 980 560 1060 500 M760 620 C640 580 520 560 420 500 M800 900 C820 820 900 760 1000 720 C1150 670 1250 690 1380 640 M700 760 C560 720 400 740 230 690" fill="none" stroke="#fbf1dc" stroke-width="50" stroke-linecap="round"/>')
    # stepping stones and tiny flowers in the grass
    for x, y in ((560, 820), (600, 860), (1100, 820), (1180, 860), (300, 800), (1450, 760), (200, 600), (1500, 560), (900, 860), (420, 860)):
        o.append('<g transform="translate(%s %s)">%s</g>' % (x, y, "".join('<circle cx="%s" cy="%s" r="7" fill="#fff"/>' % (math.cos(k * 1.2566) * 9, math.sin(k * 1.2566) * 9) for k in range(5)) + '<circle r="6" fill="#ffd65c"/>'))
    for x, y in ((480, 640), (1240, 560), (160, 760), (1520, 840), (980, 820)):
        o.append('<g transform="translate(%s %s)"><path d="M-14 0 Q0 -30 14 0 Z" fill="#7cc46c"/><path d="M-4 0 Q-18 -20 -26 -4 Z" fill="#8fd27e"/><path d="M4 0 Q18 -20 26 -4 Z" fill="#8fd27e"/></g>' % (x, y))
    return A.svg("".join(o))


def map_house():
    A = Art(480, 440)
    o = [shadow(A, 240, 418, 200, 16)]
    o.append(rect(A, 318, 70, 44, 90, 6, PEACH, sw=5))
    walls = rrect_d(86, 190, 308, 222, 14)
    siding = "".join(line("M86 %d H394" % y, 3, "#f1bfcd", 0.7) for y in range(222, 410, 30))
    o.append(A.shape(walls, (86, 190, 308, 222), ("#fff4f7", "#fde0e8", "#f0c1cf"), sw=6, inner=siding, hl=0.3))
    roof = [(54, 206), (240, 54), (426, 206)]
    scal = "".join('<path d="M%d %d q16 18 32 0" fill="none" stroke="#e57899" stroke-width="3.5" opacity=".7"/>' % (x, y) for y in range(110, 206, 26) for x in range(90 - (y - 110) // 2, 400, 32) if 240 - (y - 54) * 1.2 < x + 16 < 240 + (y - 54) * 1.2)
    o.append(A.poly(roof, ("#ffc7d8", "#f48fb0", "#d9708f"), corners=(0, 1, 2), sw=6.5, inner=scal, hl=0.4))
    o.append(A.ellipse(240, 150, 26, 26, SKYP, sw=5, inner=line("M214 150 H266 M240 124 V176", 4)))
    for x in (110, 300):
        o.append(rect(A, x, 236, 72, 66, 12, SKYP, sw=5, inner=line("M%d 236 V302 M%d 269 H%d" % (x + 36, x, x + 72), 4) + '<circle cx="%d" cy="258" r="12" fill="#fff" opacity=".6"/>' % (x + 20)))
        o.append(rect(A, x - 8, 304, 88, 22, 8, ROSE, sw=4.5))
        for k in range(3):
            o.append(K.flower(A, x + 10 + k * 26, 300, 0.55))
    o.append(rect(A, 204, 298, 74, 114, 32, WOOD, sw=6, inner='<path d="%s" fill="#f490ab" opacity=".9"/>' % heart_d(241, 336, 0.9)))
    o.append('<circle cx="264" cy="364" r="5.5" fill="#ffe08a" stroke="%s" stroke-width="3"/>' % INK)
    o.append(rect(A, 186, 404, 110, 16, 6, STONE, sw=4, hl=0))
    for x, s in ((64, 1.0), (418, 0.9)):
        o.append(A.ellipse(x, 380, 44 * s, 36 * s, LEAF, sw=5, inner=K.flower(A, x - 8, 370, 0.5)))
    return A.svg("".join(o))


def map_cafe():
    A = Art(480, 440)
    o = [shadow(A, 240, 418, 205, 16)]
    o.append(rect(A, 76, 190, 328, 222, 12, CREAM, sw=6, hl=0.3, inner="".join(line("M76 %d H404" % y, 2.5, "#ead6b0", 0.6) for y in range(214, 410, 24))))
    # sign on the roof
    o.append(rect(A, 150, 70, 180, 74, 26, MINT, sw=6))
    cup = rrect_d(208, 92, 50, 38, 10)
    o.append(A.shape(cup, (208, 92, 50, 38), WHITE, sw=4.5, hl=0.5) + '<path d="M258 100 q16 2 14 14 q-2 10 -14 10" fill="none" stroke="%s" stroke-width="4.5"/>' % INK)
    o.append('<path d="%s" fill="#f490ab" stroke="%s" stroke-width="3"/>' % (heart_d(272, 84, 0.7), INK))
    o.append(line("M222 86 q-6 -10 2 -18 M238 86 q-6 -10 2 -18", 4, "#c6a58a", 0.8))
    # striped awning with scallops
    aw = "M58 160 L422 160 L404 226 L76 226 Z"
    stripes = "".join('<rect x="%d" y="150" width="30" height="90" fill="#f8a6bf"/>' % x for x in range(58, 430, 60))
    o.append(A.shape(aw, (58, 160, 364, 66), WHITE, sw=6, inner=stripes, hl=0.35))
    for k in range(11):
        x = 76 + k * 30.4
        col = "#f8a6bf" if k % 2 == 0 else "#fff"
        o.append('<path d="M%s 224 a15.2 15.2 0 0 0 30.4 0 Z" fill="%s" stroke="%s" stroke-width="4.5" stroke-linejoin="round"/>' % (f(x), col, INK))
    # big window with cakes
    win = ""
    for k, (cx, col) in enumerate(((140, "#f7b6c8"), (190, "#fff2c8"), (240, "#c9ecdc"))):
        win += '<rect x="%d" y="318" width="40" height="26" rx="6" fill="%s" stroke="%s" stroke-width="3"/><rect x="%d" y="312" width="40" height="9" rx="4" fill="#fff" stroke="%s" stroke-width="2.5"/><circle cx="%d" cy="306" r="6" fill="#f2647a" stroke="%s" stroke-width="2.5"/>' % (cx - 20, col, INK, cx - 20, INK, cx, INK)
    win += line("M100 300 H280", 4, INK, 0.6)
    o.append(rect(A, 98, 254, 186, 120, 14, SKYP, sw=5.5, inner=win + '<path d="M110 268 L150 268 L120 300 Z" fill="#fff" opacity=".5"/>'))
    o.append(rect(A, 304, 262, 78, 150, 16, MINT, sw=6, inner=rect(A, 318, 278, 50, 60, 10, SKYP, sw=4, hl=0.5)))
    o.append('<circle cx="368" cy="352" r="5.5" fill="#ffe08a" stroke="%s" stroke-width="3"/>' % INK)
    for x in (60, 420):
        o.append(rect(A, x - 22, 372, 44, 40, 8, TERRA, sw=4.5) + A.ellipse(x, 360, 30, 26, LEAF, sw=4.5, inner=K.flower(A, x, 352, 0.45)))
    return A.svg("".join(o))


def map_garden():
    A = Art(480, 440)
    o = [shadow(A, 240, 420, 215, 16)]
    o.append(A.ellipse(240, 392, 220, 36, ("#d6f3c4", "#a6dd8c", "#88c272"), sw=5, hl=0.3))
    # picket fence
    for x in range(40, 450, 34):
        o.append(A.poly([(x, 392), (x, 318), (x + 12, 304), (x + 24, 318), (x + 24, 392)], WHITE, corners=(0, 1, 2, 3, 4), sw=4.2, hl=0.3, shadow=(3, 3), sblur=3))
    o.append(rect(A, 30, 334, 420, 14, 5, WHITE, sw=4, hl=0))
    # tree on the right
    o.append(rect(A, 370, 210, 30, 150, 10, DKWOOD, sw=5))
    o.append(A.ellipse(384, 170, 92, 84, LEAF, sw=6, inner="".join('<circle cx="%d" cy="%d" r="11" fill="#f2647a" stroke="%s" stroke-width="3"/><circle cx="%d" cy="%d" r="3.5" fill="#fff" opacity=".8"/>' % (x, y, INK, x - 3, y - 4) for x, y in ((350, 150), (410, 136), (390, 196), (334, 196), (430, 186)))))
    # flower arch
    arch = "M96 400 L96 200 C96 110 284 110 284 200 L284 400 L254 400 L254 204 C254 146 126 146 126 204 L126 400 Z"
    o.append(A.shape(arch, (96, 120, 188, 280), DKLEAF, sw=6, hl=0.3))
    for k in range(13):
        t = k / 12.0
        a = math.pi * (1 - t)
        x = 190 + math.cos(a) * 80
        y = 200 - math.sin(a) * 66 if 0.0 <= t <= 1 else 0
        o.append(K.flower(A, x, y, 0.55) if k % 2 == 0 else A.ellipse(x, y, 9, 9, ROSE, sw=3.5))
    for y in (250, 300, 350):
        o.append(K.flower(A, 111, y, 0.5) + K.flower(A, 269, y + 20, 0.5))
    # flower bed in front
    o.append(A.ellipse(190, 400, 120, 22, SOIL, sw=5, hl=0.2))
    for k, x in enumerate(range(100, 290, 30)):
        col = (ROSE, GOLD, LILAC)[k % 3]
        o.append(stem(x, 400, x, 384, x, 366, 5) + A.poly([(x - 12, 364), (x - 12, 346), (x - 4, 356), (x, 342), (x + 4, 356), (x + 12, 346), (x + 12, 364), (x, 372)], col, sw=4, hl=0.4))
    return A.svg("".join(o))


def map_pets():
    A = Art(480, 440)
    o = [shadow(A, 240, 418, 200, 16)]
    o.append(A.ellipse(240, 398, 196, 26, ("#d6f3c4", "#a6dd8c", "#88c272"), sw=5, hl=0.2))
    body = rrect_d(100, 196, 280, 210, 18)
    o.append(A.shape(body, (100, 196, 280, 210), LILAC, sw=6, hl=0.3, inner="".join(line("M%d 196 V406" % x, 3, "#c9b4ea", 0.7) for x in range(130, 380, 34))))
    # roof with cat ears
    o.append(A.poly([(78, 214), (150, 100), (160, 60), (196, 94), (284, 94), (320, 60), (330, 100), (402, 214)], ("#ffd9e4", "#f7a6bf", "#de88a2"), corners=(0, 2, 5, 7), sw=6.5, hl=0.4))
    o.append(A.poly([(170, 96), (162, 76), (184, 96)], ("#fff", "#ffd0dd", "#f0b0c4"), corners=(0, 1, 2), sw=3.5, hl=0))
    o.append(A.poly([(296, 96), (318, 76), (310, 96)], ("#fff", "#ffd0dd", "#f0b0c4"), corners=(0, 1, 2), sw=3.5, hl=0))
    # round door
    o.append('<path d="M188 406 L188 316 A52 52 0 0 1 292 316 L292 406 Z" fill="%s" stroke="%s" stroke-width="6"/>' % (A.lin([(0, "#6b4a52"), (1, "#4a3138")], 0, 0, 0, 1), INK))
    # paw sign
    o.append(A.ellipse(240, 160, 40, 34, CREAM, sw=5, inner='<g fill="#e993ad"><ellipse cx="240" cy="170" rx="14" ry="11"/><circle cx="224" cy="152" r="6"/><circle cx="240" cy="146" r="6"/><circle cx="256" cy="152" r="6"/></g>'))
    # bowl and a bone-shaped mat
    o.append(A.ellipse(130, 396, 40, 14, ROSE, sw=4.5) + rect(A, 92, 374, 76, 24, 10, ROSE, sw=4.5, inner='<path d="%s" fill="#fff" opacity=".8"/>' % heart_d(130, 386, 0.4)))
    o.append(A.ellipse(350, 392, 22, 22, ("#fff6c8", "#ffd65c", "#e2b040"), sw=4.5, inner=line("M330 384 Q350 396 370 384", 3, "#f2647a")))
    return A.svg("".join(o))


def icon_map():
    A = Art(200, 200)
    o = [shadow(A, 100, 186, 76, 8)]
    panels = [((24, 46), (74, 30), (74, 162), (24, 178)), ((74, 30), (126, 46), (126, 178), (74, 162)), ((126, 46), (176, 30), (176, 162), (126, 178))]
    cols = [MINT, CREAM, MINT]
    for p, c in zip(panels, cols):
        o.append(A.poly(list(p), c, corners=(0, 1, 2, 3), sw=5, hl=0.3, shadow=(4, 4), sblur=4))
    o.append('<path d="M40 140 C70 120 90 150 110 110 C126 80 150 100 160 70" fill="none" stroke="#e993ad" stroke-width="6" stroke-dasharray="2 12" stroke-linecap="round"/>')
    o.append('<path d="M150 36 C130 36 122 52 122 62 C122 82 150 104 150 104 C150 104 178 82 178 62 C178 52 170 36 150 36 Z" fill="%s" stroke="%s" stroke-width="5"/>' % (A.lin([(0, "#ffb3c6"), (1, "#f2647a")], 0, 0, 0, 1), INK))
    o.append('<circle cx="150" cy="62" r="9" fill="#fff" stroke="%s" stroke-width="3"/>' % INK)
    return A.svg("".join(o))


# ================================================================== the cafe room
def cafe_window():
    A = Art(560, 500)
    o = []
    o.append('<path d="M70 470 L70 190 C70 40 490 40 490 190 L490 470 Z" fill="#fbf4ec" stroke="%s" stroke-width="6"/>' % INK)
    A.defs.append('<clipPath id="wclip"><path d="M94 452 L94 196 C94 70 466 70 466 196 L466 452 Z"/></clipPath>')
    o.append('<path d="M94 452 L94 196 C94 70 466 70 466 196 L466 452 Z" fill="%s"/>' % A.lin([(0, "#cfe8f5"), (0.6, "#eaf4ee"), (1, "#fbefe2")], 0, 0, 0, 1))
    o.append('<g clip-path="url(#wclip)">')
    o.append('<circle cx="370" cy="170" r="50" fill="#fff7d8" opacity=".95" filter="%s"/>' % A.blur(8))
    o.append('<g fill="#fff" opacity=".9"><ellipse cx="170" cy="160" rx="48" ry="16"/><ellipse cx="196" cy="148" rx="28" ry="16"/></g>')
    o.append('<path d="M94 380 Q200 320 300 360 Q390 390 466 340 L466 452 L94 452 Z" fill="#bfe3a6"/>')
    for x, y in ((150, 350), (250, 340), (400, 330)):
        o.append('<g transform="translate(%d %d)"><rect x="-5" y="0" width="10" height="40" rx="4" fill="#b98a62"/><ellipse cx="0" cy="-10" rx="28" ry="30" fill="#93cf86"/></g>' % (x, y))
    o.append('<path d="M120 452 L170 200 L230 200 L180 452 Z" fill="#fff" opacity=".22"/>')
    o.append('</g>')
    o.append(line("M280 82 V452 M94 280 H466", 9, "#fbf4ec") + line("M280 82 V452 M94 280 H466", 3, INK, 0.5))
    o.append(rect(A, 50, 450, 460, 30, 10, WHITE, sw=5, hl=0.4))
    # curtains
    for side in (-1, 1):
        x0 = 280 + side * 250
        pts = [(x0, 30), (x0 - side * 96, 30), (x0 - side * 70, 230), (x0 - side * 40, 300), (x0 - side * 70, 470), (x0, 476)]
        folds = line("M%s 40 Q%s 200 %s 460" % (f(x0 - side * 30), f(x0 - side * 26), f(x0 - side * 20)), 3, "#e98fab", 0.6) + \
            line("M%s 40 Q%s 160 %s 280" % (f(x0 - side * 60), f(x0 - side * 52), f(x0 - side * 44)), 3, "#e98fab", 0.6)
        o.append(A.poly(pts, PINK, corners=(0, 1, 5), sw=5.5, inner=folds, hl=0.4))
        o.append(A.ellipse(x0 - side * 44, 300, 20, 12, ROSE, sw=4))
    o.append(rect(A, 10, 16, 540, 20, 10, WOOD, sw=5, hl=0.4))
    return A.svg("".join(o))


def cafe_counter():
    A = Art(1000, 420)
    o = [shadow(A, 500, 404, 480, 14)]
    panels = "".join(rect(A, x, 196, 140, 170, 16, MINT, sw=4, hl=0.25, shadow=(5, 6), sblur=5) for x in range(56, 900, 180))
    o.append(rect(A, 20, 150, 960, 250, 18, CREAM, sw=6.5, inner=panels, hl=0.2))
    o.append(rect(A, 0, 128, 1000, 40, 14, ("#fffdf8", "#f2e7d9", "#dccbb8"), sw=6, hl=0.5))
    # glass cake case on the left
    case = ""
    for k, (x, pal) in enumerate(((120, ROSE), (210, GOLD), (300, MINT))):
        case += rect(A, x - 34, 70, 68, 40, 10, pal, sw=4) + rect(A, x - 34, 62, 68, 14, 7, WHITE, sw=3.5, hl=0) + \
            '<circle cx="%d" cy="56" r="8" fill="#f2647a" stroke="%s" stroke-width="3"/>' % (x, INK)
    o.append('<rect x="64" y="20" width="300" height="110" rx="16" fill="#eaf6fb" fill-opacity=".55" stroke="%s" stroke-width="5"/>' % INK + case +
             '<path d="M84 30 L120 30 L92 110 Z" fill="#fff" opacity=".45"/>')
    # a cocoa machine on the right
    o.append(rect(A, 700, 4, 190, 128, 22, ROSE, sw=6, inner=rect(A, 726, 26, 138, 40, 12, WHITE, sw=4, hl=0.4)))
    o.append(rect(A, 772, 70, 46, 22, 6, STONE, sw=4, hl=0))
    o.append(rect(A, 778, 96, 34, 30, 8, WHITE, sw=4))
    o.append('<path d="%s" fill="#f490ab" stroke="%s" stroke-width="2.5"/>' % (heart_d(795, 44, 0.6), INK))
    # a jar of cookies in the middle
    o.append(rect(A, 376, 56, 70, 76, 20, ("#ffffff", "#eef7f8", "#cfe2e6"), sw=5, inner="".join('<circle cx="%d" cy="%d" r="11" fill="#e0b07a" stroke="%s" stroke-width="2.5"/>' % (x, y, INK) for x, y in ((396, 110), (424, 106), (410, 86)))))
    o.append(rect(A, 384, 46, 54, 14, 7, ROSE, sw=4, hl=0))
    return A.svg("".join(o))


def cafe_door():
    A = Art(300, 580)
    o = []
    o.append(rect(A, 20, 60, 260, 512, 20, WHITE, sw=6, hl=0.2))
    o.append(rect(A, 44, 84, 212, 480, 16, MINT, sw=6, inner=gloss(A, 64, 300, 64, 540, 8, 0.35)))
    o.append('<path d="M76 290 L76 170 C76 112 224 112 224 170 L224 290 Z" fill="%s" stroke="%s" stroke-width="5"/>' % (A.lin([(0, "#d6ecf7"), (1, "#f4f6ef")], 0, 0, 0, 1), INK))
    o.append('<path d="M96 280 L124 140 L148 140 L120 280 Z" fill="#fff" opacity=".5"/>')
    o.append(rect(A, 92, 330, 116, 60, 14, PINK, sw=4.5, inner='<path d="%s" fill="#f490ab"/>' % heart_d(150, 360, 0.9)))
    o.append(rect(A, 210, 400, 22, 50, 10, GOLD, sw=4))
    # small bell above
    o.append(line("M150 0 V30", 4))
    o.append('<path d="M128 56 C128 30 172 30 172 56 Z" fill="%s" stroke="%s" stroke-width="4.5"/>' % (A.lin([(0, "#fff3c2"), (1, "#d9a640")], 0, 0, 1, 0.3), INK))
    o.append('<circle cx="150" cy="60" r="6" fill="#d9a640" stroke="%s" stroke-width="3"/>' % INK)
    return A.svg("".join(o))


# ---- cafe furniture and decorations
def table_round():
    A = Art(320, 300)
    o = [shadow(A, 160, 286, 110, 12)]
    o.append(A.ellipse(160, 278, 70, 14, DKWOOD, sw=5, hl=0.2))
    o.append(rect(A, 146, 110, 28, 168, 10, DKWOOD, sw=5))
    cloth = "M24 96 Q24 70 160 66 Q296 70 296 96 L292 150 Q160 170 28 150 Z"
    lace = "".join('<circle cx="%s" cy="%s" r="9" fill="#fff" stroke="%s" stroke-width="3"/>' % (f(x), f(150 + 18 * math.sin(math.pi * (x - 28) / 264)), INK) for x in range(36, 292, 22))
    o.append(A.shape(cloth, (24, 66, 272, 104), PINK, sw=5.5, inner="".join('<circle cx="%d" cy="%d" r="5" fill="#fff" opacity=".8"/>' % (x, y) for x in range(52, 290, 40) for y in (110, 136)), hl=0.4))
    o.append(lace)
    o.append('<ellipse cx="160" cy="84" rx="136" ry="22" fill="#fff" opacity=".35"/>')
    return A.svg("".join(o))


def chair(pal):
    A = Art(220, 320)
    o = [shadow(A, 110, 306, 80, 10)]
    for x in (52, 156):
        o.append(rect(A, x, 200, 14, 104, 6, DKWOOD, sw=4.5))
    back = "M50 190 L50 70 C50 18 170 18 170 70 L170 190 Z"
    o.append(A.shape(back, (50, 18, 120, 172), pal, sw=5.5, inner='<path d="%s" fill="#fff" opacity=".85" stroke="%s" stroke-width="3"/>' % (heart_d(110, 96, 1.4), INK), hl=0.4))
    o.append(rect(A, 34, 176, 152, 40, 16, pal, sw=5.5, hl=0.5))
    return A.svg("".join(o))


def sofa_booth():
    A = Art(460, 320)
    o = [shadow(A, 230, 306, 210, 12)]
    for x in (54, 390):
        o.append(rect(A, x, 270, 16, 34, 6, DKWOOD, sw=4))
    tufts = "".join('<circle cx="%d" cy="%d" r="4" fill="%s"/>' % (x, y, ROSE[2]) for x in range(90, 380, 48) for y in (80, 130))
    o.append(rect(A, 40, 30, 380, 180, 60, ROSE, sw=6, inner=tufts, hl=0.4))
    o.append(rect(A, 30, 186, 400, 90, 30, ROSE, sw=6, hl=0.5))
    for x in (12, 384):
        o.append(rect(A, x, 130, 64, 150, 30, ROSE, sw=6, hl=0.45))
    o.append(rect(A, 80, 196, 140, 54, 24, PINK, sw=5) + rect(A, 240, 196, 140, 54, 24, PINK, sw=5))
    return A.svg("".join(o))


def lamp_pendant():
    A = Art(240, 460)
    o = [line("M120 0 V300", 5)]
    o.append(A.ellipse(120, 400, 64, 22, ("#fff9d6", "#ffe89a", "#f2cc60"), sw=4, hl=0.7))
    shade = "M30 404 C30 330 70 296 120 296 C170 296 210 330 210 404 Z"
    o.append(A.shape(shade, (30, 296, 180, 108), ROSE, sw=6, hl=0.6, inner="".join('<circle cx="%d" cy="%d" r="6" fill="#fff" opacity=".8"/>' % (x, y) for x, y in ((80, 360), (120, 340), (160, 360), (100, 386), (140, 386)))))
    o.append(A.ellipse(120, 292, 16, 10, GOLD, sw=4))
    o.append(A.poly([(64, 304), (70, 270), (90, 298)], ROSE, corners=(0, 1, 2), sw=4.5, hl=0) + A.poly([(150, 298), (170, 270), (176, 304)], ROSE, corners=(0, 1, 2), sw=4.5, hl=0))
    return A.svg("".join(o))


def lamp_floor():
    A = Art(200, 460)
    o = [shadow(A, 100, 446, 64, 10)]
    o.append(A.ellipse(100, 438, 56, 14, DKWOOD, sw=5, hl=0.3))
    o.append(rect(A, 92, 140, 16, 300, 7, DKWOOD, sw=4.5))
    shade = "M30 160 L54 40 L146 40 L170 160 Z"
    o.append(A.shape(shade, (30, 40, 140, 120), MINT, sw=6, hl=0.6, inner=line("M30 140 H170", 6, "#fff", 0.7)))
    o.append(A.ellipse(100, 166, 40, 10, ("#fff9d6", "#ffe89a", "#f2cc60"), sw=4, hl=0.6))
    return A.svg("".join(o))


def fairy_lights():
    A = Art(560, 140)
    o = ['<path d="M10 20 Q140 110 280 30 Q420 -40 550 50" fill="none" stroke="%s" stroke-width="4"/>' % INK]
    cols = [ROSE, GOLD, MINT, LILAC, SKYP]
    for k in range(11):
        t = k / 10.0
        if t < 0.5:
            tt = t * 2
            x, y = K.quad((10, 20), (140, 110), (280, 30), tt)
        else:
            tt = (t - 0.5) * 2
            x, y = K.quad((280, 30), (420, -40), (550, 50), tt)
        o.append(A.ellipse(x, y + 22, 13, 17, cols[k % 5], sw=4, hl=0.8) + rect(A, x - 7, y + 2, 14, 10, 3, STONE, sw=3, hl=0))
    return A.svg("".join(o))


def plant_monstera():
    A = Art(280, 380)
    o = [shadow(A, 140, 368, 80, 10)]
    for ang, ln in ((-150, 120), (-120, 140), (-90, 150), (-60, 140), (-30, 120), (-105, 100), (-75, 100)):
        a = math.radians(ang)
        x2, y2 = 140 + math.cos(a) * ln * 0.6, 260 + math.sin(a) * ln * 0.6
        o.append(stem(140, 270, (140 + x2) / 2, (270 + y2) / 2 + 10, x2, y2, 5, "#5fb35f"))
        tip = (140 + math.cos(a) * ln * 1.25, 260 + math.sin(a) * ln * 1.25)
        cx, cy = (x2 + tip[0]) / 2, (y2 + tip[1]) / 2
        slits = "".join(line("M%s %s L%s %s" % (f(cx + math.cos(a + s) * 8), f(cy + math.sin(a + s) * 8), f(cx + math.cos(a + s) * 44), f(cy + math.sin(a + s) * 44)), 4, "#5fb35f") for s in (1.2, 1.9, -1.2, -1.9))
        o.append(A.ellipse(cx, cy, ln * 0.36, ln * 0.26, DKLEAF, rot=ang, sw=4.5, inner=slits, hl=0.4))
    o.append(A.poly([(76, 262), (204, 262), (188, 364), (92, 364)], TERRA, corners=(0, 1, 2, 3), sw=5.5, inner=line("M80 290 H200", 5, "#fff", 0.5)))
    o.append(rect(A, 66, 250, 148, 26, 10, TERRA, sw=5))
    return A.svg("".join(o))


def plant_hanging():
    A = Art(260, 380)
    o = [line("M130 0 V20", 5), A.ellipse(130, 22, 10, 10, GOLD, sw=4, hl=0)]
    o.append(line("M130 26 L70 150 M130 26 L190 150 M130 26 L130 150", 3.5, "#c9a27a"))
    o.append(rect(A, 60, 140, 140, 70, 30, ("#ffffff", "#e9f2f8", "#c9d8e3"), sw=5.5, inner=line("M60 168 H200", 6, "#f2a6bd", 0.8)))
    for side in (-1, 1):
        x = 130 + side * 46
        o.append('<path d="M%d 150 Q%d 250 %d 360" fill="none" stroke="%s" stroke-width="9" stroke-linecap="round"/><path d="M%d 150 Q%d 250 %d 360" fill="none" stroke="#6cb860" stroke-width="4" stroke-linecap="round"/>' % (x, x + side * 30, x - side * 6, INK, x, x + side * 30, x - side * 6))
        for k in range(6):
            y = 180 + k * 32
            o.append(leaf(A, x + side * (16 + 6 * math.sin(k)), y, 34, 12, 90 + side * (40 if k % 2 else -20), LEAF, sw=3.6, vein=False))
    for k in range(5):
        o.append(leaf(A, 130 + (k - 2) * 22, 146, 40, 14, -90 + (k - 2) * 25, LEAF, sw=3.8))
    return A.svg("".join(o))


def flower_vase():
    A = Art(180, 260)
    o = [shadow(A, 90, 248, 50, 8)]
    for k, (x, col) in enumerate(((60, ROSE), (90, GOLD), (120, LILAC))):
        o.append(stem(90, 180, x, 120, x, 70, 5))
        o.append(A.poly([(x - 20, 70), (x - 20, 40), (x - 7, 54), (x, 30), (x + 7, 54), (x + 20, 40), (x + 20, 70), (x, 82)], col, sw=4, hl=0.5))
    o.append(leaf(A, 82, 160, 40, 12, -140, LEAF, sw=3.6) + leaf(A, 98, 160, 40, 12, -40, LEAF, sw=3.6))
    o.append(A.poly([(60, 150), (120, 150), (134, 200), (118, 248), (62, 248), (46, 200)], SKYP, sw=5.5, hl=0.6, inner=line("M48 206 H132", 6, "#fff", 0.6)))
    return A.svg("".join(o))


def cake_stand():
    A = Art(240, 260)
    o = [shadow(A, 120, 250, 70, 8)]
    o.append(rect(A, 112, 60, 16, 180, 6, GOLD, sw=4))
    o.append(A.ellipse(120, 240, 50, 10, GOLD, sw=4, hl=0.4))
    for y, rx, cakes in ((190, 104, (60, 120, 180)), (110, 74, (92, 148))):
        o.append(A.ellipse(120, y, rx, 14, WHITE, sw=5, hl=0.5))
        for x in cakes:
            o.append(A.poly([(x - 22, y - 10), (x + 22, y - 10), (x + 16, y - 34), (x - 16, y - 34)], ROSE if x % 3 else MINT, corners=(0, 1, 2, 3), sw=3.8, hl=0.3, shadow=(3, 3), sblur=3))
            o.append(A.ellipse(x, y - 40, 22, 14, WHITE, sw=3.8, hl=0.6) + '<circle cx="%d" cy="%d" r="6" fill="#f2647a" stroke="%s" stroke-width="2.5"/>' % (x, y - 54, INK))
    o.append(A.ellipse(120, 52, 12, 12, GOLD, sw=4))
    return A.svg("".join(o))


def picture_cat():
    A = Art(260, 240)
    o = [rect(A, 10, 10, 240, 220, 22, WOOD, sw=6, hl=0.4)]
    o.append(rect(A, 34, 34, 192, 172, 12, ("#fff4f6", "#fde3ea", "#f3cfd9"), sw=4.5, hl=0))
    o.append(A.poly([(80, 190), (80, 120), (92, 86), (112, 110), (148, 110), (168, 86), (180, 120), (180, 190)], WHITE, corners=(0, 2, 5, 7), sw=4.5, hl=0.5,
                    inner=eyes_pair(A, 130, 142, 22, "happy", K.IRIS["mimi"], 9, 11) + '<ellipse cx="108" cy="160" rx="10" ry="6" fill="#ff8fab" opacity=".5"/><ellipse cx="152" cy="160" rx="10" ry="6" fill="#ff8fab" opacity=".5"/>'))
    o.append(K.flower(A, 98, 98, 0.6))
    return A.svg("".join(o))


def menu_board():
    A = Art(340, 300)
    o = [line("M40 6 L170 40 L300 6", 4)]
    o.append(rect(A, 14, 36, 312, 250, 20, WOOD, sw=6, hl=0.3))
    o.append('<rect x="36" y="58" width="268" height="206" rx="10" fill="#3f5a55" stroke="%s" stroke-width="4"/>' % INK)
    ch = "#f5f1e6"
    o.append('<g fill="none" stroke="%s" stroke-width="4" stroke-linecap="round" opacity=".9">' % ch +
             '<path d="M70 110 h40 l-4 36 h-32 Z M110 118 q14 2 12 14 q-2 10 -14 8"/><path d="M80 100 q-6 -10 2 -18 M96 100 q-6 -10 2 -18"/>' +
             '<path d="M190 146 l20 -40 l20 40 Z M200 106 q10 -12 20 0"/><circle cx="210" cy="96" r="5"/>' +
             '<path d="M66 196 h70 M66 222 h50 M180 196 h80 M180 222 h60"/></g>')
    o.append('<path d="%s" fill="#f490ab" opacity=".9"/>' % heart_d(270, 100, 0.8))
    return A.svg("".join(o))


def clock_cafe():
    A = Art(200, 200)
    o = [A.poly([(42, 70), (40, 18), (78, 44)], PINK, corners=(0, 1, 2), sw=5, hl=0), A.poly([(158, 70), (160, 18), (122, 44)], PINK, corners=(0, 1, 2), sw=5, hl=0)]
    o.append(A.ellipse(100, 108, 84, 84, ROSE, sw=6, hl=0.4))
    o.append('<circle cx="100" cy="108" r="64" fill="#fffaf4" stroke="%s" stroke-width="4.5"/>' % INK)
    for k in range(12):
        a = math.radians(k * 30)
        o.append('<circle cx="%s" cy="%s" r="%s" fill="%s"/>' % (f(100 + math.cos(a) * 52), f(108 + math.sin(a) * 52), 4.5 if k % 3 == 0 else 2.5, INK))
    o.append(line("M100 108 L100 66 M100 108 L128 120", 6))
    o.append('<circle cx="100" cy="108" r="6" fill="#f2647a" stroke="%s" stroke-width="3"/>' % INK)
    return A.svg("".join(o))


def bunting():
    A = Art(600, 160)
    o = ['<path d="M10 20 Q300 90 590 20" fill="none" stroke="%s" stroke-width="4.5"/>' % INK]
    cols = [ROSE, MINT, GOLD, LILAC, SKYP, PINK]
    for k in range(9):
        t0, t1 = (k + 0.1) / 9, (k + 0.9) / 9
        p0 = K.quad((10, 20), (300, 90), (590, 20), t0)
        p1 = K.quad((10, 20), (300, 90), (590, 20), t1)
        tip = ((p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2 + 74)
        o.append(A.poly([p0, p1, tip], cols[k % 6], corners=(0, 1, 2), sw=4.5, hl=0.4, shadow=(4, 4), sblur=4))
    return A.svg("".join(o))


def shelf_cups():
    A = Art(340, 200)
    o = [rect(A, 10, 140, 320, 26, 10, WOOD, sw=5, hl=0.4)]
    o.append(A.poly([(60, 164), (90, 164), (60, 196)], DKWOOD, corners=(0, 1, 2), sw=4, hl=0) + A.poly([(250, 164), (280, 164), (280, 196)], DKWOOD, corners=(0, 1, 2), sw=4, hl=0))
    for x, pal in ((60, ROSE), (130, MINT), (200, GOLD)):
        o.append(A.poly([(x - 26, 82), (x + 26, 82), (x + 22, 140), (x - 22, 140)], pal, corners=(0, 1, 2, 3), sw=4.5, hl=0.5) + '<path d="M%d 96 q18 0 16 16 q-2 12 -16 12" fill="none" stroke="%s" stroke-width="4.5"/>' % (x + 24, INK))
    o.append(rect(A, 252, 56, 60, 84, 18, ("#ffffff", "#eef7f8", "#cfe2e6"), sw=4.5, inner="".join('<circle cx="%d" cy="%d" r="9" fill="#f7b6c8" stroke="%s" stroke-width="2"/>' % (x, y, INK) for x, y in ((270, 120), (292, 116), (282, 98)))))
    o.append(rect(A, 258, 46, 48, 14, 6, ROSE, sw=3.5, hl=0))
    return A.svg("".join(o))


def rug_round():
    A = Art(500, 160)
    o = [A.ellipse(250, 82, 236, 70, PINK, sw=6, hl=0.2)]
    for rx, ry, col in ((196, 56, "#fff"), (150, 42, "#f7a6bf"), (100, 28, "#fff"), (52, 14, "#a8e2cf")):
        o.append('<ellipse cx="250" cy="82" rx="%d" ry="%d" fill="none" stroke="%s" stroke-width="7" stroke-dasharray="3 10" stroke-linecap="round"/>' % (rx, ry, col))
    return A.svg("".join(o))


# ---- treats (200 x 200)
def treat(kind):
    A = Art(200, 200)
    return A.svg(treat_body(A, kind))


def treat_body(A, kind):
    o = [shadow(A, 100, 186, 64, 9)]
    if kind == "cupcake":
        o.append(A.poly([(52, 112), (148, 112), (134, 180), (66, 180)], ROSE, corners=(0, 1, 2, 3), sw=5, inner="".join(line("M%d 112 L%d 180" % (x, x + (100 - x) * 0.15), 3, "#e57899") for x in range(64, 140, 16))))
        o.append(A.poly([(46, 116), (44, 92), (66, 72), (90, 52), (110, 50), (134, 70), (156, 92), (154, 116)], WHITE, sw=5, hl=0.6, inner="".join('<rect x="%d" y="%d" width="12" height="4.5" rx="2" fill="%s" transform="rotate(%d %d %d)"/>' % (x, y, c, a, x, y) for x, y, c, a in ((70, 92, "#f6a9bd", 30), (100, 74, "#a8e2cf", -20), (126, 96, "#ffe08a", 50), (90, 100, "#b9d6f5", -40), (116, 82, "#d6c1f0", 10)))))
        o.append('<circle cx="100" cy="42" r="12" fill="#f2647a" stroke="%s" stroke-width="4"/><circle cx="96" cy="38" r="3.5" fill="#fff"/>' % INK)
    elif kind == "cocoa":
        o.append(A.poly([(48, 80), (140, 80), (132, 172), (56, 172)], PINK, corners=(0, 1, 2, 3), sw=5.5, hl=0.4, inner="".join('<path d="%s" fill="#fff" opacity=".85"/>' % heart_d(x, y, 0.5) for x, y in ((74, 120), (112, 136), (92, 156)))))
        o.append('<path d="M138 98 q30 4 26 28 q-4 22 -30 22" fill="none" stroke="%s" stroke-width="13"/><path d="M138 98 q30 4 26 28 q-4 22 -30 22" fill="none" stroke="#f9bccd" stroke-width="6"/>' % INK)
        o.append(A.ellipse(94, 80, 46, 12, ("#c99a74", "#8a5a3a", "#6a4430"), sw=5, hl=0.3))
        o.append(A.poly([(60, 80), (66, 60), (86, 50), (100, 34), (114, 50), (128, 62), (130, 80)], WHITE, sw=4.5, hl=0.6))
        o.append('<g fill="#fff" stroke="%s" stroke-width="3"><rect x="70" y="56" width="16" height="14" rx="4"/><rect x="104" y="60" width="16" height="14" rx="4" fill="#ffd0dd"/></g>' % INK)
    elif kind == "cake":
        o.append(A.poly([(30, 150), (164, 110), (172, 168), (40, 184)], ("#fff2c8", "#f6d88e", "#ddb860"), corners=(0, 1, 2, 3), sw=5, hl=0.3, inner=line("M34 166 L168 136", 7, "#f490ab")))
        o.append(A.poly([(30, 150), (126, 70), (164, 110)], ("#ffe6ee", "#f9bccd", "#e9a2b6"), corners=(0, 1, 2), sw=5, hl=0.5))
        o.append(A.ellipse(118, 60, 18, 16, ("#ffb3b8", "#f2647a", "#d97a8a"), sw=4.5, hl=0.7))
        o.append(leaf(A, 118, 46, 16, 6, -120, LEAF, sw=3) + leaf(A, 118, 46, 16, 6, -60, LEAF, sw=3))
    elif kind == "cookie":
        o.append(A.ellipse(100, 112, 74, 66, ("#f6d9a8", "#e3b072", "#c48e52"), sw=6, hl=0.4, inner="".join('<ellipse cx="%d" cy="%d" rx="9" ry="7" fill="#6a4430" transform="rotate(%d %d %d)"/>' % (x, y, a, x, y) for x, y, a in ((70, 90, 20), (112, 76, -10), (132, 118, 40), (86, 136, 0), (104, 106, 60), (60, 120, -30), (140, 88, 10)))))
    elif kind == "donut":
        o.append(A.ellipse(100, 112, 78, 62, ("#f6d9a8", "#e3b072", "#c48e52"), sw=6, hl=0.2))
        icing = cr_path([(36, 104), (50, 70), (100, 56), (150, 70), (164, 104), (150, 132), (130, 126), (116, 144), (90, 134), (70, 148), (50, 128)])
        o.append(A.shape(icing, (36, 56, 128, 92), ("#ffe6ee", "#f9bccd", "#e9a2b6"), sw=5, hl=0.6, inner="".join('<rect x="%d" y="%d" width="12" height="4.5" rx="2" fill="%s" transform="rotate(%d %d %d)"/>' % (x, y, c, a, x, y) for x, y, c, a in ((60, 92, "#a8e2cf", 30), (88, 72, "#ffe08a", -20), (130, 80, "#b9d6f5", 50), (140, 112, "#fff", -40), (64, 120, "#d6c1f0", 10), (110, 126, "#a8e2cf", 70)))))
        o.append('<ellipse cx="100" cy="102" rx="20" ry="14" fill="#fbf3ea" stroke="%s" stroke-width="5"/>' % INK)
    elif kind == "macaron":
        for k, (x, y, pal) in enumerate(((70, 130, ROSE), (130, 130, MINT), (100, 80, LILAC))):
            o.append(A.ellipse(x, y + 12, 40, 18, pal, sw=4.5, hl=0.3) + A.ellipse(x, y, 42, 8, WHITE, sw=4, hl=0) + A.ellipse(x, y - 12, 40, 18, pal, sw=4.5, hl=0.7))
    return "".join(o)


# ---- blink frames of Mimi and her friends (same drawing, eyes closed)
def blink_character(kind):
    real_eye = K.eye

    def closed(A, cx, cy, mode, lash, iris, rx=26, ry=32, look=0.0, side=1):
        return real_eye(A, cx, cy, "calm" if mode == "open" else mode, lash, iris, rx, ry, look, side)
    K.eye = closed
    try:
        return K.build_character(kind, "stand")
    finally:
        K.eye = real_eye


# ================================================================== the garden
def garden_back():
    A = Art(1600, 600)
    o = []
    o.append('<path d="M0 230 Q220 120 460 200 Q700 270 940 180 Q1200 100 1420 190 Q1530 240 1600 230 L1600 600 L0 600 Z" fill="%s"/>' % A.lin([(0, "#cfe9c2"), (1, "#b9dea8")], 0, 0, 0, 1))
    # round trees
    for x, s, fruit in ((150, 1.1, True), (520, 0.8, False), (1080, 0.9, True), (1440, 1.2, False)):
        o.append('<g transform="translate(%s 330) scale(%s)">' % (x, s) + rect(A, -18, 40, 36, 150, 12, DKWOOD, sw=5) +
                 A.ellipse(0, 0, 120, 110, LEAF, sw=6, hl=0.4, inner=("".join('<circle cx="%d" cy="%d" r="13" fill="#f2647a" stroke="%s" stroke-width="3"/>' % (x2, y2, INK) for x2, y2 in ((-60, -20), (30, -50), (60, 30), (-20, 40))) if fruit else "")) + "</g>")
    # hedges
    for x in range(-40, 1700, 160):
        o.append(A.ellipse(x, 470, 100, 70, DKLEAF, sw=5.5, hl=0.35))
    # white picket fence
    pick = ""
    for x in range(7, 1600, 50):
        pick += A.poly([(x, 590), (x, 470), (x + 18, 448), (x + 36, 470), (x + 36, 590)], WHITE, corners=(0, 1, 2, 3, 4), sw=4.5, hl=0.25, shadow=(3, 3), sblur=3)
    o.append(pick)
    o.append(rect(A, 0, 494, 1600, 18, 6, WHITE, sw=4.5, hl=0) + rect(A, 0, 554, 1600, 18, 6, WHITE, sw=4.5, hl=0))
    return A.svg("".join(o))


def garden_plot():
    A = Art(340, 180)
    o = [shadow(A, 170, 168, 160, 12)]
    o.append(rect(A, 10, 60, 320, 104, 22, WOOD, sw=6, hl=0.3, inner="".join(line("M%d 60 V164" % x, 3, "#c99a6a", 0.6) for x in range(70, 330, 64))))
    o.append(A.ellipse(170, 66, 150, 30, SOIL, sw=5, hl=0.2, inner="".join('<ellipse cx="%d" cy="%d" rx="6" ry="3" fill="#6a4430" opacity=".6"/>' % (x, y) for x, y in ((80, 60), (130, 74), (190, 58), (240, 72), (280, 62), (110, 56)))))
    return A.svg("".join(o))


def plant_seeded():
    A = Art(220, 300)
    o = [A.ellipse(110, 276, 54, 18, SOIL, sw=5, hl=0.3)]
    for x, y in ((92, 268), (112, 262), (130, 270)):
        o.append(A.ellipse(x, y, 7, 5, ("#fff2c8", "#e8c98a", "#c9a46a"), sw=3, hl=0.4))
    return A.svg("".join(o))


def plant_sprout():
    A = Art(220, 300)
    o = [A.ellipse(110, 276, 54, 18, SOIL, sw=5, hl=0.3)]
    o.append(stem(110, 276, 110, 240, 110, 206, 6))
    o.append(leaf(A, 110, 210, 54, 20, -150, LEAF, sw=4) + leaf(A, 110, 210, 54, 20, -30, LEAF, sw=4))
    return A.svg("".join(o))


FLOWER = {"tulip": ROSE, "sunflower": GOLD, "rose": ("#ffd6dc", "#f37f97", "#cf5f78")}


def plant_stage(kind, stage):
    """stage 'bud' (growing) or 'bloom' (ready to pick)."""
    A = Art(220, 300)
    o = [A.ellipse(110, 276, 54, 18, SOIL, sw=5, hl=0.3)]
    tall = {"sunflower": 60, "tulip": 110, "rose": 100}.get(kind, 150)
    if stage == "bud":
        tall += 40
    if kind in FLOWER:
        top = tall if kind != "sunflower" else 50
        o.append(stem(110, 276, 104, (276 + top) / 2, 110, top + 20, 7))
        o.append(leaf(A, 108, 236, 64, 20, -150, LEAF, sw=4) + leaf(A, 112, 220, 64, 20, -30, LEAF, sw=4))
        if stage == "bud":
            o.append(A.poly([(96, top + 26), (92, top + 4), (110, top - 22), (128, top + 4), (124, top + 26)], LEAF, sw=4.5, hl=0.4, inner='<path d="M104 %d Q110 %d 116 %d" fill="%s"/>' % (top + 4, top - 18, top + 4, FLOWER[kind][1])))
        elif kind == "tulip":
            o.append(A.poly([(76, top + 30), (70, top - 10), (90, top + 4), (110, top - 30), (130, top + 4), (150, top - 10), (144, top + 30), (110, top + 46)], ROSE, corners=(1, 3, 5), sw=5, hl=0.5))
        elif kind == "sunflower":
            o.append(petal_flower(A, 110, top + 10, 92, 14, GOLD, center=("#c99a74", "#8a5a3a", "#6a4430"), petal_len=0.9, petal_w=0.42, sw=3.6))
        else:
            o.append(petal_flower(A, 110, top + 6, 70, 6, FLOWER["rose"], center=FLOWER["rose"], petal_len=0.8, petal_w=0.7, sw=4))
            o.append('<path d="M100 %d q10 -14 20 0 q-8 8 -14 2" fill="none" stroke="%s" stroke-width="3.5"/>' % (top + 6, INK))
    elif kind == "strawberry":
        for ang in (-160, -120, -60, -20, -90):
            o.append(leaf(A, 110, 262, 84, 30, ang, DKLEAF if ang == -90 else LEAF, sw=4.2))
        if stage == "bud":
            for x, y in ((76, 196), (144, 190), (110, 168)):
                o.append(petal_flower(A, x, y, 30, 5, WHITE, sw=3.4))
        else:
            for x, y in ((70, 222), (150, 214), (110, 196)):
                pts = [(x, y + 30), (x - 20, y + 8), (x - 20, y - 8), (x, y - 14), (x + 20, y - 8), (x + 20, y + 8)]
                o.append(A.poly(pts, ("#ffb3b8", "#f2647a", "#d97a8a"), sw=4.5, hl=0.7, inner="".join('<ellipse cx="%d" cy="%d" rx="2.5" ry="3.5" fill="#fff3b0"/>' % (x + dx, y + dy) for dx, dy in ((-8, -2), (8, -2), (0, 8), (-6, 14), (6, 14)))))
                o.append(leaf(A, x, y - 12, 14, 6, -130, LEAF, sw=2.8, vein=False) + leaf(A, x, y - 12, 14, 6, -50, LEAF, sw=2.8, vein=False))
    elif kind == "carrot":
        n = 3 if stage == "bud" else 5
        for k in range(n):
            ang = -90 + (k - (n - 1) / 2) * 22
            o.append(leaf(A, 110, 252, 90 if stage == "bud" else 130, 16, ang, DKLEAF if k % 2 else LEAF, sw=4))
        if stage == "bloom":
            o.append(A.poly([(82, 262), (138, 262), (128, 290), (110, 300), (92, 290)], ("#ffd2a0", "#f99a4a", "#d9783a"), sw=5, hl=0.5, inner=line("M90 274 h10 M120 282 h10", 3, "#c9622a")))
    return A.svg("".join(o))


def seed_packet(kind):
    A = Art(180, 220)
    o = [shadow(A, 90, 210, 70, 8)]
    band = {"tulip": "#f490ab", "sunflower": "#f6c84a", "rose": "#f37f97", "strawberry": "#f2647a", "carrot": "#f99a4a"}[kind]
    o.append(rect(A, 20, 14, 140, 188, 14, CREAM, sw=5.5, hl=0.35, inner='<rect x="20" y="150" width="140" height="52" fill="%s"/>' % band + "".join('<ellipse cx="%d" cy="176" rx="6" ry="4" fill="#fff" opacity=".8"/>' % x for x in (54, 90, 126))))
    o.append('<path d="M20 30 L40 20 L60 30 L80 20 L100 30 L120 20 L140 30 L160 20" fill="none" stroke="%s" stroke-width="3" opacity=".5"/>' % INK)
    pic = {"tulip": lambda: A.poly([(66, 110), (62, 72), (78, 86), (90, 60), (102, 86), (118, 72), (114, 110), (90, 124)], ROSE, corners=(1, 3, 5), sw=4.5, hl=0.5),
           "sunflower": lambda: petal_flower(A, 90, 90, 64, 12, GOLD, center=("#c99a74", "#8a5a3a", "#6a4430"), petal_len=0.9, petal_w=0.42, sw=3.2),
           "rose": lambda: petal_flower(A, 90, 90, 56, 6, FLOWER["rose"], center=FLOWER["rose"], petal_len=0.8, petal_w=0.7, sw=3.6),
           "strawberry": lambda: A.poly([(90, 130), (66, 96), (70, 70), (90, 64), (110, 70), (114, 96)], ("#ffb3b8", "#f2647a", "#d97a8a"), sw=4.5, hl=0.7) + leaf(A, 90, 66, 18, 7, -130, LEAF, sw=3) + leaf(A, 90, 66, 18, 7, -50, LEAF, sw=3),
           "carrot": lambda: leaf(A, 90, 70, 40, 9, -110, LEAF, sw=3.2) + leaf(A, 90, 70, 40, 9, -70, DKLEAF, sw=3.2) + A.poly([(70, 72), (110, 72), (96, 128), (90, 134), (84, 128)], ("#ffd2a0", "#f99a4a", "#d9783a"), sw=4.5, hl=0.5)}
    o.append(pic[kind]())
    return A.svg("".join(o))


def watering_can():
    A = Art(280, 240)
    o = [shadow(A, 130, 226, 100, 10)]
    o.append('<path d="M60 100 C40 40 140 30 170 80" fill="none" stroke="%s" stroke-width="20" stroke-linecap="round"/><path d="M60 100 C40 40 140 30 170 80" fill="none" stroke="#8fcab5" stroke-width="10" stroke-linecap="round"/>' % INK)
    o.append(A.poly([(186, 150), (256, 60), (270, 70), (206, 176)], MINT, corners=(0, 1, 2, 3), sw=5, hl=0.4))
    o.append(A.ellipse(262, 62, 18, 10, MINT, rot=-50, sw=4.5, inner="".join('<circle cx="%d" cy="%d" r="2.5" fill="%s"/>' % (x, y, INK) for x, y in ((256, 60), (266, 56), (262, 68)))))
    o.append(rect(A, 40, 90, 160, 126, 30, MINT, sw=6, hl=0.6, inner='<path d="%s" fill="#f490ab" opacity=".9"/>' % heart_d(120, 154, 1.1)))
    return A.svg("".join(o))


def garden_basket():
    A = Art(280, 240)
    o = [shadow(A, 140, 228, 110, 10)]
    o.append('<path d="M60 120 C60 20 220 20 220 120" fill="none" stroke="%s" stroke-width="18"/><path d="M60 120 C60 20 220 20 220 120" fill="none" stroke="#dfae7c" stroke-width="9"/>' % INK)
    for x, col in ((100, ROSE), (140, GOLD), (180, LILAC)):
        o.append(petal_flower(A, x, 116, 46, 6, col, sw=3.4))
    weave = "".join(line("M%d 130 L%d 220" % (x, x + 4), 3, "#bf8d5c", 0.7) for x in range(52, 236, 18)) + "".join(line("M40 %d H240" % y, 3, "#bf8d5c", 0.6) for y in (160, 190))
    o.append(A.poly([(30, 130), (250, 130), (226, 222), (54, 222)], WOOD, corners=(0, 1, 2, 3), sw=6, hl=0.35, inner=weave))
    o.append(rect(A, 22, 120, 236, 24, 12, WOOD, sw=5, hl=0.4))
    return A.svg("".join(o))


def garden_bench():
    A = Art(400, 280)
    o = [shadow(A, 200, 266, 180, 12)]
    for x in (60, 320):
        o.append(rect(A, x, 150, 20, 112, 8, WHITE, sw=4.5))
    for y in (40, 84):
        o.append(rect(A, 34, y, 332, 34, 12, MINT, sw=5, hl=0.4))
    o.append(rect(A, 20, 140, 360, 40, 14, MINT, sw=5.5, hl=0.5))
    o.append(rect(A, 40, 30, 20, 130, 8, WHITE, sw=4.5) + rect(A, 340, 30, 20, 130, 8, WHITE, sw=4.5))
    return A.svg("".join(o))


def bird_bath():
    A = Art(240, 300)
    o = [shadow(A, 120, 288, 70, 10)]
    o.append(A.ellipse(120, 280, 60, 14, STONE, sw=5, hl=0.3))
    o.append(A.poly([(100, 120), (140, 120), (130, 270), (110, 270)], STONE, corners=(0, 1, 2, 3), sw=5, hl=0.4))
    o.append(A.ellipse(120, 116, 104, 30, STONE, sw=6, hl=0.4))
    o.append('<ellipse cx="120" cy="108" rx="86" ry="18" fill="%s" stroke="%s" stroke-width="4"/>' % (A.lin([(0, "#cfeaf7"), (1, "#9fd2ee")], 0, 0, 0, 1), INK))
    # a small round bird
    o.append(A.ellipse(170, 80, 26, 22, SKYP, sw=4.5, hl=0.6, inner=K.eye(A, 178, 74, "open", False, K.IRIS["puff"], 5, 6, 0, 1)))
    o.append(A.poly([(194, 76), (208, 80), (194, 86)], GOLD, corners=(0, 1, 2), sw=3, hl=0))
    o.append('<ellipse cx="160" cy="86" rx="12" ry="8" fill="#93c3e6" stroke="%s" stroke-width="3"/>' % INK)
    return A.svg("".join(o))


def garden_lantern():
    A = Art(160, 340)
    o = [shadow(A, 80, 330, 40, 8)]
    o.append(rect(A, 72, 150, 16, 176, 6, DKWOOD, sw=4.5))
    o.append(A.ellipse(80, 110, 40, 50, ("#fff9d6", "#ffe89a", "#f2cc60"), sw=5, hl=0.7))
    o.append(rect(A, 44, 52, 72, 18, 8, ROSE, sw=4.5, hl=0) + rect(A, 48, 154, 64, 14, 6, ROSE, sw=4.5, hl=0))
    o.append(A.poly([(40, 56), (80, 18), (120, 56)], ROSE, corners=(0, 1, 2), sw=4.5, hl=0.3))
    return A.svg("".join(o))


def flower_arch():
    A = Art(440, 520)
    o = [shadow(A, 220, 506, 200, 12)]
    arch = "M40 500 L40 220 C40 40 400 40 400 220 L400 500 L360 500 L360 224 C360 92 80 92 80 224 L80 500 Z"
    o.append(A.shape(arch, (40, 40, 360, 460), WHITE, sw=6, hl=0.3))
    for k in range(17):
        t = k / 16.0
        a = math.pi * (1 - t)
        x, y = 220 + math.cos(a) * 160, 210 - math.sin(a) * 140
        o.append(leaf(A, x, y, 40, 14, math.degrees(a) + 180 + 40, LEAF, sw=3.6, vein=False))
        if k % 2 == 0:
            o.append(petal_flower(A, x, y - 4, 32, 5, (ROSE, GOLD, LILAC)[k % 3], sw=3.2))
    for y in range(240, 500, 50):
        o.append(petal_flower(A, 60, y, 28, 5, ROSE, sw=3.2) + petal_flower(A, 380, y + 20, 28, 5, LILAC, sw=3.2))
    return A.svg("".join(o))


def birdhouse():
    A = Art(200, 360)
    o = [shadow(A, 100, 348, 50, 8)]
    o.append(rect(A, 90, 170, 20, 170, 8, DKWOOD, sw=4.5))
    o.append(rect(A, 40, 90, 120, 100, 14, PEACH, sw=5.5, hl=0.4))
    o.append(A.poly([(26, 100), (100, 30), (174, 100)], ROSE, corners=(0, 1, 2), sw=5.5, hl=0.4))
    o.append('<circle cx="100" cy="134" r="20" fill="#5a3a42" stroke="%s" stroke-width="4.5"/>' % INK)
    o.append(rect(A, 92, 160, 16, 8, 4, DKWOOD, sw=3, hl=0))
    return A.svg("".join(o))


def garden_pond():
    A = Art(440, 180)
    o = [A.ellipse(220, 96, 206, 70, STONE, sw=6, hl=0.2)]
    o.append('<ellipse cx="220" cy="94" rx="180" ry="54" fill="%s" stroke="%s" stroke-width="4"/>' % (A.lin([(0, "#bfe3f5"), (1, "#8fcbe8")], 0, 0, 0, 1), INK))
    o.append('<ellipse cx="170" cy="80" rx="60" ry="10" fill="#fff" opacity=".5"/>')
    for x, y in ((290, 104), (150, 110)):
        o.append(A.ellipse(x, y, 34, 14, LEAF, sw=4, hl=0.3) + '<path d="M%d %d l20 -6" stroke="%s" stroke-width="3"/>' % (x, y, INK))
    o.append(petal_flower(A, 290, 98, 26, 6, PINK, sw=3))
    return A.svg("".join(o))


def toadstool():
    A = Art(180, 180)
    o = [shadow(A, 90, 170, 50, 8)]
    o.append(rect(A, 66, 90, 48, 78, 20, CREAM, sw=5, hl=0.4))
    o.append(A.shape("M14 100 C14 30 166 30 166 100 Z", (14, 30, 152, 70), ("#ffd6dc", "#f37f97", "#cf5f78"), sw=5.5, hl=0.6, inner="".join('<circle cx="%d" cy="%d" r="%d" fill="#fff"/>' % (x, y, r) for x, y, r in ((50, 70, 11), (94, 52, 13), (134, 74, 10), (80, 88, 7)))))
    return A.svg("".join(o))


# ================================================================== pets
PETS = {
    "kitten": {"fur": ("#fff3e2", "#f9cf9a", "#e6ad72"), "iris": ("#a8d08a", "#4f8a3a", "#24401c"), "nose": "#f59ab0"},
    "bunny": {"fur": ("#ffffff", "#f5f0f8", "#ddd3e8"), "iris": ("#c98d5d", "#7a4a2c", "#3a2219"), "nose": "#f59ab0"},
    "puppy": {"fur": ("#fff6ea", "#f4dcb6", "#dcb88a"), "iris": ("#b07a50", "#5c3a24", "#2a1a12"), "nose": "#5a3a3a"},
    "hamster": {"fur": ("#fff3df", "#f8cf98", "#e6ab6a"), "iris": ("#6a5a5a", "#2e2222", "#140e0e"), "nose": "#f59ab0"},
}


def pet(kind, mood):
    """mood: sit (eyes open), happy (closed happy eyes, mouth open), blink (eyes closed calm)."""
    A = Art(320, 340)
    P = PETS[kind]
    fur = P["fur"]
    eyes = {"sit": "open", "happy": "happy", "blink": "calm"}[mood]
    o = [shadow(A, 160, 326, 100, 12)]
    belly = '<ellipse cx="160" cy="250" rx="46" ry="52" fill="#fffaf4" opacity=".9"/>'
    if kind == "kitten":
        o.append(A.poly(limb_pts((210, 300), (300, 300), (270, 200), 14, 16), fur, sw=5, inner=line("M262 230 l16 -6 M268 258 l18 -2", 4, "#e09a5a", 0.8)))
    if kind == "bunny":
        o.append(A.ellipse(238, 290, 30, 28, WHITE, sw=5, hl=0.6))
    if kind == "puppy":
        o.append(A.poly(limb_pts((210, 290), (270, 280), (262, 214), 12, 10), fur, sw=5))
    # body
    if kind == "hamster":
        stripes = ""
        o.append(A.ellipse(160, 236, 112, 96, fur, sw=5.5, inner='<ellipse cx="160" cy="262" rx="70" ry="64" fill="#fffaf2"/>', hl=0.4))
    else:
        stripes = "".join(line("M%d %d q12 -6 24 0" % (x, y), 4.5, "#e09a5a", 0.8) for x, y in ((108, 230), (180, 230), (114, 262), (174, 262))) if kind == "kitten" else ""
        o.append(A.poly([(160, 166), (220, 196), (240, 270), (220, 316), (100, 316), (80, 270), (100, 196)], fur, sw=5.5, inner=belly + stripes, hl=0.4))
    # front paws
    for x in (128, 192):
        o.append(A.ellipse(x, 312, 26, 16, fur, sw=4.8, hl=0.5, inner=line("M%d 314 v8 M%d 314 v8" % (x - 7, x + 7), 3, fur[2])))
    # ears (behind head)
    hy = 140 if kind != "hamster" else 158
    if kind == "kitten":
        for s in (-1, 1):
            o.append(A.poly([(160 + s * 40, hy - 54), (160 + s * 78, hy - 112), (160 + s * 92, hy - 34)], fur, corners=(0, 1, 2), sw=5, hl=0, inner='<path d="M%d %d L%d %d L%d %d Z" fill="#ffd0dd"/>' % (160 + s * 54, hy - 52, 160 + s * 78, hy - 96, 160 + s * 82, hy - 42)))
    elif kind == "bunny":
        for s in (-1, 1):
            o.append(A.ellipse(160 + s * 34, hy - 104, 22, 70, fur, rot=s * 10, sw=5, hl=0.4, inner='<ellipse cx="%d" cy="%d" rx="11" ry="52" fill="#ffd0dd" transform="rotate(%d %d %d)"/>' % (160 + s * 34, hy - 100, s * 10, 160 + s * 34, hy - 100)))
    elif kind == "hamster":
        for s in (-1, 1):
            o.append(A.ellipse(160 + s * 64, hy - 66, 24, 22, fur, sw=4.5, hl=0, inner='<ellipse cx="%d" cy="%d" rx="12" ry="11" fill="#ffd0dd"/>' % (160 + s * 64, hy - 64)))
    # head
    if kind == "hamster":
        head = A.ellipse(160, hy, 92, 74, fur, sw=5.5, hl=0.55, inner='<ellipse cx="160" cy="%d" rx="52" ry="38" fill="#fffaf2"/>' % (hy + 24))
    else:
        head = A.ellipse(160, hy, 92, 78, fur, sw=5.6, hl=0.55, inner=('<ellipse cx="160" cy="%d" rx="44" ry="30" fill="#fffaf4"/>' % (hy + 34)) +
                         ("".join(line("M%d %d v18" % (x, hy - 76), 5, "#e09a5a", 0.8) for x in (146, 160, 174)) if kind == "kitten" else ""))
    o.append(head)
    if kind == "puppy":
        for s in (-1, 1):
            o.append(A.poly([(160 + s * 64, hy - 56), (160 + s * 104, hy - 40), (160 + s * 100, hy + 40), (160 + s * 78, hy + 50), (160 + s * 70, hy - 10)], ("#e6b48a", "#c58a5c", "#a06c46"), sw=5, hl=0.4))
    ey = hy + 4
    cheeks = K.blush(A, 160 - 58, ey + 30, mood == "happy") + K.blush(A, 160 + 58, ey + 30, mood == "happy")
    o.append(cheeks)
    o.append(eyes_pair(A, 160, ey, 38, eyes, P["iris"], 17, 21, lash=kind in ("kitten", "bunny")))
    o.append(pet_nose(160, ey + 26, P["nose"]))
    o.append(small_mouth(160, ey + 36, mood == "happy"))
    if kind == "kitten":
        o.append(line("M84 %d l-36 -6 M86 %d l-34 6 M236 %d l36 -6 M234 %d l34 6" % (ey + 24, ey + 34, ey + 24, ey + 34), 2.6, INK, 0.5))
    if kind == "bunny":
        o.append(K.flower(A, 206, hy - 56, 0.5))
    if kind == "puppy":
        o.append(rect(A, 116, 206, 88, 18, 9, ROSE, sw=4, hl=0) + A.ellipse(160, 226, 11, 11, GOLD, sw=3.5, hl=0.6))
    return A.svg("".join(o))


def pet_bed():
    A = Art(400, 220)
    o = [shadow(A, 200, 206, 180, 12)]
    o.append(A.ellipse(200, 140, 184, 62, LILAC, sw=6, hl=0.4))
    o.append(A.ellipse(200, 130, 136, 38, PINK, sw=5, hl=0.5, inner="".join('<path d="%s" fill="#fff" opacity=".7"/>' % heart_d(x, y, 0.5) for x, y in ((150, 126), (200, 140), (250, 126)))))
    return A.svg("".join(o))


def pet_bowl(full):
    A = Art(220, 140)
    o = [shadow(A, 110, 128, 90, 9)]
    if full:
        o.append(A.ellipse(110, 54, 72, 20, ("#e8c08a", "#c98d5d", "#a06c46"), sw=4.5, hl=0.3, inner="".join('<circle cx="%d" cy="%d" r="7" fill="#b07a50" stroke="%s" stroke-width="2"/>' % (x, y, INK) for x, y in ((80, 50), (100, 42), (124, 46), (140, 56), (96, 60), (118, 58)))))
    o.append(A.shape("M20 60 L200 60 L180 120 L40 120 Z", (20, 60, 180, 60), ROSE, sw=5.5, hl=0.5, inner='<path d="%s" fill="#fff" opacity=".85"/>' % heart_d(110, 92, 0.8)))
    o.append('<ellipse cx="110" cy="60" rx="90" ry="16" fill="%s" stroke="%s" stroke-width="5"/>' % ("#fff0f4" if not full else "none", INK))
    return A.svg("".join(o))


def pet_ball():
    A = Art(130, 130)
    o = [A.ellipse(65, 65, 54, 54, ("#fff6c8", "#ffd65c", "#e2b040"), sw=5, hl=0.7, inner=line("M14 60 Q65 90 116 60", 6, "#f2647a") + line("M30 24 Q60 50 50 116", 6, "#8fcab5"))]
    return A.svg("".join(o))


def scratch_post():
    A = Art(240, 440)
    o = [shadow(A, 120, 428, 100, 10)]
    o.append(rect(A, 20, 386, 200, 40, 14, LILAC, sw=5, hl=0.4))
    o.append(rect(A, 92, 120, 56, 270, 12, ("#f6e6c6", "#e3c898", "#c9a86e"), sw=5, inner="".join(line("M92 %d L148 %d" % (y, y - 8), 3, "#c9a46a") for y in range(132, 390, 14))))
    o.append(rect(A, 30, 92, 180, 36, 14, LILAC, sw=5, hl=0.5))
    o.append(line("M180 128 V200", 3.5) + A.ellipse(180, 210, 14, 14, ROSE, sw=4, hl=0.6))
    return A.svg("".join(o))


def pet_house():
    A = Art(340, 320)
    o = [shadow(A, 170, 308, 150, 12)]
    o.append(rect(A, 40, 120, 260, 180, 16, MINT, sw=6, hl=0.4))
    o.append(A.poly([(20, 130), (170, 24), (320, 130)], ROSE, corners=(0, 1, 2), sw=6, hl=0.4))
    o.append('<path d="M120 300 L120 220 A50 50 0 0 1 220 220 L220 300 Z" fill="#5a3a42" stroke="%s" stroke-width="5.5"/>' % INK)
    o.append(A.ellipse(170, 150, 26, 20, CREAM, sw=4, inner='<g fill="#e993ad"><ellipse cx="170" cy="156" rx="9" ry="7"/><circle cx="160" cy="144" r="4"/><circle cx="170" cy="140" r="4"/><circle cx="180" cy="144" r="4"/></g>'))
    return A.svg("".join(o))


def pet_mouse_toy():
    A = Art(160, 110)
    o = [shadow(A, 80, 100, 56, 7)]
    o.append('<path d="M128 70 q30 10 24 -20" fill="none" stroke="%s" stroke-width="4" stroke-linecap="round"/>' % INK)
    o.append(A.poly([(20, 80), (60, 36), (110, 40), (134, 80)], STONE, corners=(0, 3), sw=5, hl=0.6))
    o.append(A.ellipse(70, 38, 16, 16, PINK, sw=4, hl=0) + '<circle cx="34" cy="70" r="5" fill="%s"/>' % INK)
    return A.svg("".join(o))


# ================================================================== plans and stickers
def plans_board():
    A = Art(220, 260)
    o = [shadow(A, 110, 250, 80, 8)]
    o.append(rect(A, 20, 30, 180, 220, 20, WOOD, sw=6, hl=0.3))
    o.append(rect(A, 38, 52, 144, 182, 10, WHITE, sw=4.5, hl=0))
    for k, y in enumerate((92, 140, 188)):
        o.append(rect(A, 54, y - 16, 32, 32, 8, MINT if k < 2 else WHITE, sw=4, hl=0))
        if k < 2:
            o.append(line("M60 %d l8 8 l14 -16" % y, 5))
        o.append(line("M100 %d H164" % y, 6, "#d8c6f2"))
    o.append(rect(A, 78, 14, 64, 36, 12, GOLD, sw=5, hl=0.5))
    return A.svg("".join(o))


def sticker(kind):
    A = Art(200, 200)
    o = ['<circle cx="100" cy="104" r="88" fill="#5a3a3a" opacity=".18" filter="%s"/>' % A.blur(6)]
    o.append('<circle cx="100" cy="100" r="86" fill="#fff" stroke="%s" stroke-width="5"/>' % INK)
    o.append('<circle cx="100" cy="100" r="74" fill="%s"/>' % A.rad([(0, "#fffaf2"), (1, {"star": "#fff0b8", "heart": "#ffdbe5", "flower": "#e9dcf8", "paw": "#dff3ea", "cupcake": "#ffe6ee", "rainbow": "#e0f1fd"}[kind])], cy="40%"))
    if kind == "star":
        o.append(A.poly(star_pts(100, 104, 58, 26), GOLD, corners=tuple(range(0, 10, 2)), sw=5, hl=0.7))
    elif kind == "heart":
        o.append(A.shape(heart_d(100, 106, 3.2), (44, 50, 112, 98), ROSE, sw=5, hl=0.7))
    elif kind == "flower":
        o.append(petal_flower(A, 100, 100, 74, 6, LILAC, sw=4.5))
    elif kind == "paw":
        o.append(A.ellipse(100, 122, 34, 28, ROSE, sw=5, hl=0.6))
        for x, y in ((62, 86), (86, 66), (114, 66), (138, 86)):
            o.append(A.ellipse(x, y, 15, 18, ROSE, sw=4.5, hl=0.6))
    elif kind == "cupcake":
        o.append('<g transform="translate(10 6) scale(.9)">' + treat_body(A, "cupcake") + "</g>")
    elif kind == "rainbow":
        for k, col in enumerate(("#f490ab", "#f6d27a", "#8fd27e", "#93c3e6")):
            r = 62 - k * 13
            o.append('<path d="M%d 128 A%d %d 0 0 1 %d 128" fill="none" stroke="%s" stroke-width="15"/>' % (100 - r, r, r, 100 + r, INK))
            o.append('<path d="M%d 128 A%d %d 0 0 1 %d 128" fill="none" stroke="%s" stroke-width="9"/>' % (100 - r, r, r, 100 + r, col))
        o.append(A.ellipse(44, 132, 26, 16, WHITE, sw=4.5) + A.ellipse(156, 132, 26, 16, WHITE, sw=4.5))
    return A.svg("".join(o))


# ================================================================== jobs, render, check, sheet
def jobs():
    j = {
        "map_background": (map_background, 1600, 900), "map_house": (map_house, 480, 440), "map_cafe": (map_cafe, 480, 440),
        "map_garden": (map_garden, 480, 440), "map_pets": (map_pets, 480, 440), "icon_map": (icon_map, 200, 200),
        "cafe_window": (cafe_window, 560, 500), "cafe_counter": (cafe_counter, 1000, 420), "cafe_door": (cafe_door, 300, 580),
        "cafe_table": (table_round, 320, 300), "cafe_chair_pink": (lambda: chair(PINK), 220, 320), "cafe_chair_mint": (lambda: chair(MINT), 220, 320),
        "cafe_booth": (sofa_booth, 460, 320), "cafe_lamp_pendant": (lamp_pendant, 240, 460), "cafe_lamp_floor": (lamp_floor, 200, 460),
        "cafe_fairy_lights": (fairy_lights, 560, 140), "cafe_plant_big": (plant_monstera, 280, 380), "cafe_plant_hanging": (plant_hanging, 260, 380),
        "cafe_flower_vase": (flower_vase, 180, 260), "cafe_cake_stand": (cake_stand, 240, 260), "cafe_picture": (picture_cat, 260, 240),
        "cafe_menu_board": (menu_board, 340, 300), "cafe_clock": (clock_cafe, 200, 200), "cafe_bunting": (bunting, 600, 160),
        "cafe_shelf": (shelf_cups, 340, 200), "cafe_rug": (rug_round, 500, 160),
        "garden_back": (garden_back, 1600, 600), "garden_plot": (garden_plot, 340, 180), "plant_seeded": (plant_seeded, 220, 300),
        "plant_sprout": (plant_sprout, 220, 300), "watering_can": (watering_can, 280, 240), "garden_basket": (garden_basket, 280, 240),
        "garden_bench": (garden_bench, 400, 280), "garden_bird_bath": (bird_bath, 240, 300), "garden_lantern": (garden_lantern, 160, 340),
        "garden_arch": (flower_arch, 440, 520), "garden_birdhouse": (birdhouse, 200, 360), "garden_pond": (garden_pond, 440, 180),
        "garden_toadstool": (toadstool, 180, 180),
        "pet_bed": (pet_bed, 400, 220), "pet_bowl_empty": (lambda: pet_bowl(False), 220, 140), "pet_bowl_full": (lambda: pet_bowl(True), 220, 140),
        "pet_ball": (pet_ball, 130, 130), "pet_scratch_post": (scratch_post, 240, 440), "pet_house": (pet_house, 340, 320), "pet_mouse_toy": (pet_mouse_toy, 160, 110),
        "plans_board": (plans_board, 220, 260),
    }
    for t in ("cupcake", "cocoa", "cake", "cookie", "donut", "macaron"):
        j["treat_" + t] = (lambda k=t: treat(k), 200, 200)
    for k in ("mimi", "bella", "lulu", "momo", "puff"):
        j[("mimi" if k == "mimi" else "friend_" + k) + "_blink"] = (lambda c=k: blink_character(c), K.CW, K.CH)
    for k in ("tulip", "sunflower", "rose", "strawberry", "carrot"):
        j["plant_%s_bud" % k] = (lambda c=k: plant_stage(c, "bud"), 220, 300)
        j["plant_%s_bloom" % k] = (lambda c=k: plant_stage(c, "bloom"), 220, 300)
        j["seed_" + k] = (lambda c=k: seed_packet(c), 180, 220)
    for k in PETS:
        for m in ("sit", "happy", "blink"):
            j["pet_%s_%s" % (k, m)] = (lambda c=k, mm=m: pet(c, mm), 320, 340)
    for k in ("star", "heart", "flower", "paw", "cupcake", "rainbow"):
        j["sticker_" + k] = (lambda c=k: sticker(c), 200, 200)
    return j


OPAQUE = ("map_background",)


def optimise(png_bytes, path, opaque):
    im = Image.open(io.BytesIO(png_bytes))
    im = im.convert("RGB") if opaque else im.convert("RGBA")
    if not opaque:
        a = im.getchannel("A").point(lambda v: 0 if v < 6 else v)
        im.putalpha(a)
    buf = io.BytesIO()
    im.save(buf, "PNG", optimize=True)
    data = buf.getvalue()
    note = "full"
    if len(data) > MAX_BYTES:
        q = im.quantize(256, method=Image.Quantize.FASTOCTREE if not opaque else Image.Quantize.MEDIANCUT, dither=Image.Dither.FLOYDSTEINBERG)
        buf = io.BytesIO()
        q.save(buf, "PNG", optimize=True)
        data = buf.getvalue()
        note = "256 colours"
    if len(data) > MAX_BYTES and not opaque:
        # still too big: scale down a little (these are drawn larger than shown)
        k = 0.85
        while len(data) > MAX_BYTES and k > 0.4:
            sm = im.resize((int(im.width * k), int(im.height * k)), Image.LANCZOS)
            q = sm.quantize(256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.FLOYDSTEINBERG)
            buf = io.BytesIO()
            q.save(buf, "PNG", optimize=True)
            data = buf.getvalue()
            note = "256 colours, scaled %.2f" % k
            k -= 0.1
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
            with open(os.path.join(SRC_DIR, name + ".svg"), "w", encoding="utf-8") as fh:
                fh.write(svg)
            pg.set_viewport_size({"width": w, "height": h})
            pg.set_content('<html><body style="margin:0;background:transparent">%s</body></html>' % svg)
            shot = pg.screenshot(omit_background=True, clip={"x": 0, "y": 0, "width": w, "height": h})
            results[name] = optimise(shot, os.path.join(OUT_DIR, name + ".png"), name in OPAQUE)
        br.close()
    return results


def contact_sheet(names):
    cell, cols = 240, 9
    tiles = [(n, Image.open(os.path.join(OUT_DIR, n + ".png")).convert("RGBA")) for n in names if os.path.exists(os.path.join(OUT_DIR, n + ".png"))]
    rows = math.ceil(len(tiles) / cols)
    sheet = Image.new("RGBA", (cols * cell, rows * cell), (160, 160, 160, 255))
    for i, (n, im) in enumerate(tiles):
        t = im.copy()
        t.thumbnail((cell - 12, cell - 12))
        sheet.alpha_composite(t, (i % cols * cell + (cell - t.width) // 2, i // cols * cell + (cell - t.height) // 2))
    sheet.convert("RGB").save(SHEET, quality=88)


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
            print("%-30s %7d bytes  %s" % (n + ".png", s, note))
    have = sorted(n + ".png" for n in names if os.path.exists(os.path.join(OUT_DIR, n + ".png")))
    with open(os.path.join(OUT_DIR, "manifest.json"), "w", encoding="utf-8") as fh:
        json.dump({"files": have}, fh, indent=1)
    contact_sheet(names)
    big = [n for n in have if os.path.getsize(os.path.join(OUT_DIR, n)) >= MAX_BYTES]
    if big:
        print("OVER 150 KB: " + ", ".join(big))
        sys.exit(1)
    print("art done: %d pictures, all under 150 KB" % len(have))


if __name__ == "__main__":
    main()
