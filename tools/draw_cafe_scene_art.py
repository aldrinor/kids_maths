"""draw_cafe_scene_art.py - draws the pictures of the cafe "question scene" (game/scene/scene_cafe.js), the small calm
scene above each of Marie's maths questions.

Same look as the cafe reward games and the cafe world: it imports the drawing kit of draw_cafe_art.py (Art, the warm
outline, the shaded shapes, the characters) and of draw_cafe_world_art.py (palettes, rect, shadow, treats).
Mimi is NOT redrawn: her new poses come from the same build_character("mimi", ...) with only the arm layout swapped
for the call (the same trick draw_cafe_world_art.py uses for the blink frames). Nothing in the other scripts changes.

Pictures (gh_site/game/scene/art/cafe/, each PNG under 150 KB):
  mimi_point, mimi_carry, mimi_count, mimi_tilt, mimi_cheer   Mimi's scene poses (462 x 600, the same box as mimi_stand)
  wall_tile, counter_tile    the strip of cafe wall and counter (both repeat left to right)
  item_*                     things the questions count (muffin, saucer, tea bag, lemon, coins, bills ...)
  hold_*                     things that hold them (tray, plate, box, bag, jar, vase, table, jug, basket)
  clock_face, cake_top, pie_top   the wall clock (hands are drawn by the page) and the round cake and pie to cut
Pictures the scene reuses from the game (not drawn here): rewards/art/cafe/mimi_*, friend_*, heart, cup_*,
topping_strawberry; world/art/cafe/mimi_blink, friend_*_blink, treat_*, sticker_star, cafe_chair_pink.

Run:  python gh_site/tools/draw_cafe_scene_art.py [--only prefix1,prefix2] [--sheet-only]
Writes SVG sources to 16_kids_maths/work_tmp/art_src/cafe_scene/, PNGs and manifest.json to gh_site/game/scene/art/cafe/,
and a contact sheet to 16_kids_maths/work_tmp/art_src/cafe_scene_contact_sheet.png. Exits with an error if a PNG is 150 KB or more.
"""
import argparse
import json
import math
import os
import sys

TOOLS = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, TOOLS)
import draw_cafe_art as K  # noqa: E402  (the shared drawing kit; importing it sets TEMP/TMP to work_tmp)
import draw_cafe_world_art as W  # noqa: E402
from draw_cafe_art import Art, INK, line, heart_d, ell_pts, f, rrect_d, optimise, MAX_BYTES  # noqa: E402
from draw_cafe_world_art import rect, shadow, gloss, PINK, ROSE, MINT, CREAM, WOOD, DKWOOD, LILAC, GOLD, WHITE, PEACH, LEAF  # noqa: E402
from PIL import Image  # noqa: E402
from playwright.sync_api import sync_playwright  # noqa: E402

SITE = K.SITE
OUT_DIR = os.path.join(SITE, "game", "scene", "art", "cafe")
SRC_DIR = os.path.join(K.WORK_TMP, "art_src", "cafe_scene")
SHEET = os.path.join(K.WORK_TMP, "art_src", "cafe_scene_contact_sheet.png")
os.makedirs(OUT_DIR, exist_ok=True)
os.makedirs(SRC_DIR, exist_ok=True)

SILVER = ("#ffffff", "#dfe3e8", "#b7bec8")
BRASS = ("#fff4c6", "#f2cf6e", "#cf9f3e")
CHOC = ("#c99a74", "#8a5a3a", "#6a4430")
BREAD = ("#ffe9bf", "#efbd78", "#cf9452")
GLASS = ("#ffffff", "#eef7f8", "#cfe2e6")
GRAPE = ("#e6d6fb", "#b394e6", "#8d6cc4")
LEMON = ("#fffbd0", "#fbe36e", "#e6c240")


# ------------------------------------------------------------------ Mimi's scene poses (same drawing, other arms)
POSE_ARMS = {
    # right paw (image right) reaches out toward the counter on her right
    "point": ((K.SH_L, (148, 380), (158, 434)), (K.SH_R, (352, 352), (414, 318))),
    # both paws forward at the waist, holding a tray
    "carry": ((K.SH_L, (150, 420), (196, 438)), (K.SH_R, K.mirror((150, 420)), K.mirror((196, 438)))),
    # right paw up beside her face, as when counting out loud
    "count": ((K.SH_L, (148, 380), (158, 434)), (K.SH_R, (352, 366), (366, 300))),
}


def mimi_pose(pose):
    if pose == "cheer":
        return K.build_character("mimi", "cheer")
    if pose == "tilt":
        # the wave pose tilts her head kindly; give it the resting arms
        real = K.ARMS["wave_r"]
        K.ARMS["wave_r"] = K.ARMS["stand"]
        try:
            return K.build_character("mimi", "wave")
        finally:
            K.ARMS["wave_r"] = real
    real = K.ARMS["stand"]
    K.ARMS["stand"] = POSE_ARMS[pose]
    try:
        svg = K.build_character("mimi", "stand")
    finally:
        K.ARMS["stand"] = real
    if pose == "carry":
        # a small wooden tray across the paws, the paw tips over its rim
        A = Art(K.CW, K.CH)
        base_uid = A.uid
        A.uid = lambda k="s": "tray_" + base_uid(k)        # ids must not clash with the character's ids
        tray = rect(A, 120, 424, 222, 26, 12, WOOD, sw=5, hl=0.5)
        paws = A.ellipse(198, 430, 22, 16, K.FUR["mimi"], sw=4.5) + A.ellipse(264, 430, 22, 16, K.FUR["mimi"], sw=4.5)
        extra = '<defs>%s</defs>%s%s' % ("".join(A.defs), tray, paws)
        svg = svg[:-len("</svg>")] + extra + "</svg>"
    return svg


# ------------------------------------------------------------------ wall and counter strips (repeat left to right)
def wall_tile():
    A = Art(600, 300)
    o = ['<rect width="600" height="300" fill="%s"/>' % A.lin([(0, "#f8e3e4"), (0.6, "#fcece6"), (1, "#fdf3ea")], 0, 0, 0, 1)]
    paws = ""
    for x, y in ((70, 60), (370, 40), (230, 150), (520, 140)):
        paws += '<ellipse cx="%d" cy="%d" rx="13" ry="10"/><circle cx="%d" cy="%d" r="5"/><circle cx="%d" cy="%d" r="5"/><circle cx="%d" cy="%d" r="5"/><circle cx="%d" cy="%d" r="5"/>' % (
            x, y, x - 13, y - 12, x - 4, y - 18, x + 5, y - 18, x + 14, y - 12)
    o.append('<g fill="#e9a9b8" opacity=".14">%s</g>' % paws)
    o.append('<rect x="0" y="200" width="600" height="100" fill="%s"/>' % A.lin([(0, "#dcf2e8"), (1, "#c6e7da")], 0, 0, 0, 1))
    o.append('<rect x="0" y="194" width="600" height="12" fill="#f4fbf7" stroke="#d9b896" stroke-width="2.5"/>')
    for x in (20, 170, 320, 470):
        o.append('<rect x="%d" y="220" width="110" height="90" rx="10" fill="none" stroke="#a9d6c5" stroke-width="3.5"/>' % x)
    return A.svg("".join(o))


def counter_tile():
    A = Art(600, 150)
    o = []
    panels = "".join(rect(A, x, 44, 120, 120, 14, MINT, sw=4, hl=0.25, shadow=(5, 6), sblur=5) for x in (15, 165, 315, 465))
    o.append('<rect x="0" y="22" width="600" height="140" fill="%s"/>' % A.lin([(0, "#fffaf0"), (1, "#f2e2c6")], 0, 0, 0, 1))
    o.append(panels)
    o.append('<rect x="-10" y="4" width="620" height="28" rx="10" fill="%s" stroke="%s" stroke-width="5"/>' % (A.lin([(0, "#fffdf8"), (1, "#eadccb")], 0, 0, 0, 1), INK))
    o.append('<rect x="0" y="9" width="600" height="6" fill="#ffffff" opacity=".7"/>')
    return A.svg("".join(o))


# ------------------------------------------------------------------ things to count (160 x 160)
def sv(body_fn, w=160, h=160):
    A = Art(w, h)
    return A.svg(body_fn(A))


def muffin(A):
    o = [shadow(A, 80, 150, 50, 7)]
    o.append(A.poly([(38, 84), (122, 84), (110, 146), (50, 146)], MINT, corners=(0, 1, 2, 3), sw=5, inner="".join(line("M%d 84 L%d 146" % (x, x + (80 - x) * 0.15), 3, "#7fc2ab") for x in range(48, 120, 13))))
    o.append(A.poly([(30, 90), (32, 66), (52, 44), (80, 34), (108, 44), (128, 66), (130, 90)], CHOC, sw=5, hl=0.5,
                    inner="".join('<ellipse cx="%d" cy="%d" rx="5" ry="4" fill="#4a2c1e"/>' % (x, y) for x, y in ((58, 62), (82, 52), (104, 64), (70, 78), (96, 80)))))
    return "".join(o)


def saucer(A):
    return shadow(A, 80, 112, 66, 8) + A.ellipse(80, 96, 70, 22, WHITE, sw=5, hl=0.5) + \
        '<ellipse cx="80" cy="92" rx="38" ry="10" fill="none" stroke="#f490ab" stroke-width="4"/>'


def tea_bag(A):
    o = [line("M80 20 L80 56", 3, INK)]
    o.append(rect(A, 66, 6, 28, 20, 4, ROSE, sw=4, hl=0.3) + '<path d="%s" fill="#fff"/>' % heart_d(80, 15, 0.32))
    o.append(rect(A, 44, 56, 72, 84, 10, ("#fff6e0", "#f1dcae", "#d8bd88"), sw=5, hl=0.5,
                  inner='<path d="M54 72 L106 72" stroke="#c9a46a" stroke-width="3" stroke-dasharray="4 5"/>'))
    return "".join(o)


def scoop(A):
    o = [shadow(A, 80, 146, 56, 7)]
    o.append(A.poly([(20, 80), (120, 80), (112, 130), (32, 136)], SILVER, corners=(0, 1, 2, 3), sw=5, hl=0.5))
    o.append(A.poly([(26, 82), (36, 62), (60, 50), (84, 48), (106, 58), (116, 80)], WHITE, sw=4.5, hl=0.6))
    o.append(rect(A, 116, 92, 36, 16, 8, ROSE, sw=4, hl=0.3))
    return "".join(o)


def oven(A):
    o = [shadow(A, 80, 150, 64, 7)]
    o.append(rect(A, 14, 24, 132, 122, 16, ROSE, sw=5, hl=0.4))
    o.append(rect(A, 28, 58, 104, 74, 10, ("#fff2e4", "#f6c9a8", "#e0a882"), sw=4.5, hl=0.6))
    for x in (42, 80, 118):
        o.append(A.ellipse(x, 40, 9, 9, WHITE, sw=3.5, hl=0))
    return "".join(o)


def cake_box(A):
    o = [shadow(A, 80, 150, 64, 7)]
    o.append(rect(A, 18, 54, 124, 90, 10, PINK, sw=5, hl=0.4))
    o.append(rect(A, 12, 44, 136, 22, 8, ROSE, sw=5, hl=0.3))
    o.append('<path d="M80 44 L80 144" stroke="#fff" stroke-width="8"/><path d="M80 44 L80 144" stroke="%s" stroke-width="2" opacity=".3"/>' % INK)
    o.append(A.ellipse(66, 36, 16, 10, MINT, rot=-20, sw=4) + A.ellipse(94, 36, 16, 10, MINT, rot=20, sw=4) + A.ellipse(80, 42, 7, 7, MINT, sw=3.5))
    return "".join(o)


def sign(A):
    o = [shadow(A, 80, 154, 60, 6)]
    o.append(line("M40 150 L58 30 M120 150 L102 30", 9, INK) + line("M40 150 L58 30 M120 150 L102 30", 4, "#dfae7c"))
    o.append(rect(A, 22, 22, 116, 86, 10, ("#8aa79d", "#6b877d", "#5f7a70"), sw=5, hl=0.15))
    o.append('<rect x="16" y="16" width="128" height="98" rx="12" fill="none" stroke="#e2bf98" stroke-width="9"/>')
    return "".join(o)


def biscuit(A):
    o = [shadow(A, 80, 136, 56, 8)]
    o.append(A.ellipse(80, 84, 60, 56, ("#fff0cc", "#f4cf8c", "#d9a95e"), sw=5, hl=0.5,
                       inner="".join('<circle cx="%d" cy="%d" r="4" fill="#c4904c"/>' % (x, y) for x, y in ((60, 64), (80, 58), (100, 64), (60, 100), (80, 106), (100, 100), (80, 82)))))
    o.append('<ellipse cx="80" cy="84" rx="46" ry="42" fill="none" stroke="#d9a95e" stroke-width="3" stroke-dasharray="2 7" stroke-linecap="round"/>')
    return "".join(o)


def flower_item(A):
    return K.flower(A, 80, 70, 2.3) + line("M80 104 Q74 130 80 156", 7, "#6cb860") + W.leaf(A, 80, 132, 30, 12, -30, LEAF, sw=3.5)


def roll(A):
    o = [shadow(A, 80, 134, 60, 8)]
    o.append(A.poly([(20, 112), (24, 76), (50, 50), (80, 44), (110, 50), (136, 76), (140, 112), (80, 124)], BREAD, sw=5, hl=0.6))
    o.append(line("M52 66 Q60 84 54 104 M80 56 Q88 80 80 108 M108 66 Q116 84 108 104", 4, "#c48446", 0.8))
    return "".join(o)


def candy(A):
    o = [shadow(A, 80, 122, 56, 7)]
    o.append(A.poly([(14, 60), (44, 80), (14, 100)], PINK, corners=(0, 1, 2), sw=4.5, hl=0.3) + A.poly([(146, 60), (116, 80), (146, 100)], PINK, corners=(0, 1, 2), sw=4.5, hl=0.3))
    o.append(A.ellipse(80, 80, 40, 32, ROSE, sw=5, hl=0.7, inner=line("M58 58 L74 104 M86 54 L102 102", 7, "#fff", 0.8)))
    return "".join(o)


def lemon(A):
    o = [shadow(A, 80, 132, 56, 8)]
    pts = ell_pts(80, 82, 58, 42, 28)
    pts[0] = (146, 82)
    pts[14] = (14, 82)
    o.append(A.poly(pts, LEMON, corners=(0, 14), sw=5, hl=0.6))
    o.append(W.leaf(A, 96, 44, 26, 10, -40, LEAF, sw=3.5))
    return "".join(o)


def grape(A):
    o = [shadow(A, 80, 136, 44, 7)]
    o.append(A.ellipse(80, 86, 44, 46, GRAPE, sw=5, hl=0.7))
    o.append(line("M80 42 Q84 26 96 20", 6, "#8a5a3a") + W.leaf(A, 96, 26, 22, 9, -20, LEAF, sw=3))
    return "".join(o)


def napkin(A):
    o = [shadow(A, 80, 138, 62, 7)]
    o.append(A.poly([(16, 130), (80, 26), (144, 130)], MINT, corners=(0, 1, 2), sw=5, hl=0.5, inner=line("M48 112 L112 112", 3, "#fff", 0.8)))
    o.append('<path d="%s" fill="#fff" opacity=".9"/>' % heart_d(80, 88, 0.6))
    return "".join(o)


def piece(A):
    o = [shadow(A, 80, 140, 60, 7)]
    o.append(A.poly([(18, 120), (140, 120), (128, 60)], ("#ffe9c4", "#f2c27e", "#d8a25a"), corners=(0, 1, 2), sw=5, hl=0.5,
                    inner='<path d="M18 120 L140 120 L140 134 L18 134 Z" fill="#e3a65c"/>'))
    o.append(A.poly([(26, 116), (128, 66), (134, 116)], ("#ffd0dd", "#f490ab", "#d97d97"), corners=(0, 1, 2), sw=3.5, hl=0.4))
    return "".join(o)


def chocolate(A):
    o = [shadow(A, 80, 138, 56, 7)]
    o.append(rect(A, 26, 30, 108, 100, 12, CHOC, sw=5, hl=0.4, inner="".join('<rect x="%d" y="%d" width="40" height="36" rx="5" fill="none" stroke="#5a3826" stroke-width="3"/>' % (x, y) for x in (34, 84) for y in (40, 86))))
    o.append(rect(A, 20, 86, 120, 48, 8, ROSE, sw=5, hl=0.3, inner='<path d="%s" fill="#fff" opacity=".9"/>' % heart_d(80, 108, 0.55)))
    return "".join(o)


def pie(A):
    o = [shadow(A, 80, 140, 70, 8)]
    o.append(A.poly([(10, 100), (150, 100), (138, 134), (22, 134)], ("#ffe9c4", "#f2c27e", "#d8a25a"), corners=(0, 1, 2, 3), sw=5, hl=0.3))
    o.append(A.ellipse(80, 96, 70, 24, ("#ffe9c4", "#f2c27e", "#d8a25a"), sw=5, hl=0.5,
                       inner=line("M30 96 Q80 80 130 96 M40 104 Q80 90 120 104", 4, "#c98a44", 0.8)))
    return "".join(o)


def sandwich(A):
    o = [shadow(A, 80, 140, 64, 7)]
    o.append(A.poly([(16, 124), (144, 124), (80, 40)], BREAD, corners=(0, 1, 2), sw=5, hl=0.4))
    o.append(line("M26 112 L134 112", 8, "#8fd27e") + line("M34 100 L126 100", 7, "#f490ab"))
    o.append(A.poly([(22, 98), (138, 98), (80, 30)], ("#fffaf0", "#f8e8cc", "#e8cfa8"), corners=(0, 1, 2), sw=5, hl=0.5))
    return "".join(o)


def coin_plain(A):
    return A.ellipse(80, 80, 62, 62, BRASS, sw=5, hl=0.6, inner='<circle cx="80" cy="80" r="42" fill="none" stroke="#d6a64a" stroke-width="5"/>') + \
        '<path d="%s" fill="#fff4c6" opacity=".9"/>' % heart_d(80, 80, 1.0)


def toonie(A):
    # a two-dollar coin: silver ring, gold centre (own design)
    return A.ellipse(80, 80, 66, 66, SILVER, sw=5, hl=0.6) + A.ellipse(80, 80, 40, 40, BRASS, sw=4, hl=0.5) + \
        '<g fill="none" stroke="#c99a3e" stroke-width="5" stroke-linecap="round"><path d="M64 70 q16 -16 30 0 q2 8 -30 26 h32"/></g>'


def loonie(A):
    pts = [(80 + 64 * math.cos(math.radians(-90 + k * 360 / 11)), 80 + 64 * math.sin(math.radians(-90 + k * 360 / 11))) for k in range(11)]
    d = "M" + " L".join("%s %s" % (f(x), f(y)) for x, y in pts) + " Z"
    return A.shape(d, (16, 16, 128, 128), BRASS, sw=5, hl=0.6, inner='<path d="M80 52 L80 108 M68 64 L80 52" fill="none" stroke="#c99a3e" stroke-width="7" stroke-linecap="round"/>')


def dime(A):
    return A.ellipse(80, 80, 48, 48, SILVER, sw=5, hl=0.6) + \
        '<path d="M62 68 L68 64 L68 96" fill="none" stroke="#9aa3ae" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>' + \
        '<ellipse cx="90" cy="80" rx="10" ry="16" fill="none" stroke="#9aa3ae" stroke-width="5"/>'


def nickel(A):
    return A.ellipse(80, 80, 58, 58, ("#ffffff", "#e9ecef", "#c3c9d0"), sw=5, hl=0.6, inner='<path d="M92 60 L70 60 L68 80 q24 -6 26 12 q-2 18 -28 12" fill="none" stroke="#9aa3ae" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>')


def bill(value):
    pal = {5: ("#e4f0fb", "#abcdee", "#7ea9d6"), 10: ("#f0e6fb", "#cdb6ee", "#a98fd0"), 20: ("#e2f6e8", "#a9dcb6", "#7cbf8e"),
           50: ("#fde8e5", "#f2b0a8", "#d98179"), 100: ("#f7ecdb", "#dfc7a0", "#bda078")}[value]

    def body(A):
        o = [rect(A, 6, 10, 228, 100, 10, pal, sw=5, hl=0.3)]
        o.append('<rect x="18" y="22" width="204" height="76" rx="6" fill="none" stroke="#ffffff" stroke-width="3" opacity=".8"/>')
        o.append(A.ellipse(170, 60, 30, 30, WHITE, sw=3.5, hl=0))
        o.append('<text x="64" y="76" font-family="Lexend, Arial, sans-serif" font-weight="800" font-size="44" fill="%s" text-anchor="middle">%d</text>' % (INK, value))
        o.append('<path d="%s" fill="#f490ab"/>' % heart_d(170, 60, 0.7))
        return "".join(o)
    return lambda: sv(body, 240, 120)


# ------------------------------------------------------------------ holders
def tray(A):
    return shadow(A, 160, 76, 150, 8) + rect(A, 6, 40, 308, 30, 14, WOOD, sw=5, hl=0.5) + rect(A, 0, 32, 30, 22, 10, DKWOOD, sw=4, hl=0.3) + rect(A, 290, 32, 30, 22, 10, DKWOOD, sw=4, hl=0.3)


def plate(A):
    return shadow(A, 120, 66, 110, 8) + A.ellipse(120, 48, 112, 26, WHITE, sw=5, hl=0.5) + \
        '<ellipse cx="120" cy="44" rx="74" ry="14" fill="none" stroke="#f490ab" stroke-width="4" stroke-dasharray="3 8" stroke-linecap="round"/>'


def box(A):
    o = [shadow(A, 120, 132, 110, 8)]
    o.append(A.poly([(14, 40), (40, 8), (200, 8), (226, 40)], ("#fff1f5", "#fbd0dc", "#efc3cf"), corners=(0, 1, 2, 3), sw=4.5, hl=0.2))
    o.append(rect(A, 10, 40, 220, 88, 10, PINK, sw=5, hl=0.4, inner='<path d="%s" fill="#fff" opacity=".85"/>' % heart_d(120, 92, 0.8)))
    return "".join(o)


def bag(A):
    o = [shadow(A, 70, 166, 56, 7)]
    o.append(A.poly([(16, 40), (124, 40), (130, 160), (10, 160)], ("#fff4e2", "#f2d8b0", "#d9b888"), corners=(0, 1, 2, 3), sw=5, hl=0.4))
    o.append('<path d="M16 40 l9 10 l9 -10 l9 10 l9 -10 l9 10 l9 -10 l9 10 l9 -10 l9 10 l9 -10 l9 10 l8 -10" fill="none" stroke="%s" stroke-width="3.5" stroke-linejoin="round"/>' % INK)
    o.append('<path d="%s" fill="#f490ab"/>' % heart_d(70, 110, 0.9))
    return "".join(o)


def jar(A):
    o = [shadow(A, 70, 168, 56, 7)]
    o.append('<rect x="12" y="34" width="116" height="130" rx="30" fill="#eaf6fb" fill-opacity=".55" stroke="%s" stroke-width="5"/>' % INK)
    o.append('<path d="M28 60 L28 130" stroke="#fff" stroke-width="9" stroke-linecap="round" opacity=".7"/>')
    o.append(rect(A, 24, 16, 92, 24, 8, ROSE, sw=4.5, hl=0.3))
    return "".join(o)


def vase(A):
    o = [shadow(A, 70, 166, 46, 7)]
    o.append(A.poly([(46, 30), (94, 30), (92, 52), (118, 100), (110, 156), (30, 156), (22, 100), (48, 52)], MINT, corners=(0, 1), sw=5, hl=0.6,
                    inner='<path d="M24 110 Q70 124 116 110" stroke="#fff" stroke-width="5" fill="none" opacity=".8"/>'))
    return "".join(o)


def table(A):
    o = [shadow(A, 120, 150, 70, 8)]
    o.append(rect(A, 108, 56, 24, 88, 8, DKWOOD, sw=4.5, hl=0.3))
    o.append(A.ellipse(120, 144, 44, 10, DKWOOD, sw=4.5, hl=0))
    o.append(A.ellipse(120, 46, 112, 22, WOOD, sw=5, hl=0.5))
    o.append('<path d="M20 50 Q120 82 220 50 L214 62 Q120 96 26 62 Z" fill="#fff" stroke="%s" stroke-width="3.5" opacity=".95"/>' % INK)
    return "".join(o)


def jug(A):
    o = [shadow(A, 70, 166, 52, 7)]
    o.append('<path d="M110 60 q34 4 30 40 q-4 30 -34 34" fill="none" stroke="%s" stroke-width="14"/><path d="M110 60 q34 4 30 40 q-4 30 -34 34" fill="none" stroke="#fbe36e" stroke-width="7"/>' % INK)
    o.append(A.poly([(22, 30), (118, 30), (114, 160), (26, 160)], ("#ffffff", "#fff6c8", "#e8d890"), corners=(0, 1, 2, 3), sw=5, hl=0.6,
                    inner='<rect x="22" y="70" width="100" height="94" fill="#fbe36e" opacity=".75"/>'))
    return "".join(o)


def basket(A):
    o = [shadow(A, 140, 120, 130, 8)]
    o.append(A.poly([(10, 40), (270, 40), (246, 116), (34, 116)], BREAD, corners=(0, 1, 2, 3), sw=5, hl=0.3,
                    inner="".join(line("M%d 40 L%d 116" % (x, x + (140 - x) * 0.1), 3, "#c48446", 0.6) for x in range(30, 270, 22)) + line("M20 70 L262 70 M28 94 L254 94", 3, "#c48446", 0.6)))
    o.append(rect(A, 0, 30, 280, 20, 10, DKWOOD, sw=4.5, hl=0.4))
    return "".join(o)


def cake_small(A):
    o = [shadow(A, 120, 112, 104, 8)]
    o.append(rect(A, 20, 40, 200, 64, 18, ("#fff2c8", "#f6d88e", "#ddb860"), sw=5, hl=0.3, inner=line("M20 74 L220 74", 8, "#f490ab")))
    o.append(A.ellipse(120, 40, 100, 20, ("#ffe6ee", "#f9bccd", "#e9a2b6"), sw=5, hl=0.6))
    return "".join(o)


# ------------------------------------------------------------------ round things to cut, and the clock
def cake_top(A):
    o = [shadow(A, 150, 286, 120, 10)]
    o.append(A.ellipse(150, 150, 138, 138, ("#fff2c8", "#f6d88e", "#ddb860"), sw=6, hl=0.2))
    o.append(A.ellipse(150, 150, 122, 122, ("#ffe6ee", "#f9bccd", "#e9a2b6"), sw=4.5, hl=0.5))
    for k in range(12):
        a = math.radians(k * 30 + 15)
        o.append(A.ellipse(150 + math.cos(a) * 104, 150 + math.sin(a) * 104, 11, 11, WHITE, sw=3, hl=0))
    o.append(A.ellipse(150, 150, 18, 16, ("#ffb3b8", "#f2647a", "#d97a8a"), sw=4, hl=0.7))
    return "".join(o)


def pie_top(A):
    o = [shadow(A, 150, 286, 120, 10)]
    o.append(A.ellipse(150, 150, 138, 138, ("#ffe9c4", "#f2c27e", "#d8a25a"), sw=6, hl=0.3))
    o.append(A.ellipse(150, 150, 112, 112, ("#ffd0dd", "#f490ab", "#d97d97"), sw=4.5, hl=0.4))
    for k in range(10):
        a = math.radians(k * 36 + 10)
        o.append('<circle cx="%s" cy="%s" r="9" fill="#d95c7e" stroke="%s" stroke-width="2.5"/>' % (f(150 + math.cos(a) * 70), f(150 + math.sin(a) * 70), INK))
    return "".join(o)


def clock_face(A):
    # the cafe clock (cat ears); the page draws the two hands
    o = [A.poly([(52, 80), (48, 18), (98, 52)], PINK, corners=(0, 1, 2), sw=5, hl=0), A.poly([(188, 80), (192, 18), (142, 52)], PINK, corners=(0, 1, 2), sw=5, hl=0)]
    o.append(A.ellipse(120, 130, 104, 104, ROSE, sw=6, hl=0.4))
    o.append('<circle cx="120" cy="130" r="82" fill="#fffaf4" stroke="%s" stroke-width="4.5"/>' % INK)
    for k in range(12):
        a = math.radians(k * 30)
        o.append('<circle cx="%s" cy="%s" r="%s" fill="%s"/>' % (f(120 + math.sin(a) * 68), f(130 - math.cos(a) * 68), 6 if k % 3 == 0 else 3.5, INK))
    return "".join(o)


# ------------------------------------------------------------------ jobs
def jobs():
    j = {}
    for pose in ("point", "carry", "count", "tilt", "cheer"):
        j["mimi_" + pose] = (lambda p=pose: mimi_pose(p), K.CW, K.CH)
    j["wall_tile"] = (wall_tile, 600, 300)
    j["counter_tile"] = (counter_tile, 600, 150)
    items = {"muffin": muffin, "saucer": saucer, "tea_bag": tea_bag, "scoop": scoop, "oven": oven, "cake_box": cake_box, "sign": sign,
             "biscuit": biscuit, "flower": flower_item, "roll": roll, "candy": candy, "lemon": lemon, "grape": grape, "napkin": napkin,
             "piece": piece, "chocolate": chocolate, "pie": pie, "sandwich": sandwich, "coin": coin_plain,
             "toonie": toonie, "loonie": loonie, "dime": dime, "nickel": nickel}
    for name, fn in items.items():
        j["item_" + name] = (lambda b=fn: sv(b), 160, 160)
    j["item_bill_10"] = (bill(10), 240, 120)
    j["item_bill_20"] = (bill(20), 240, 120)
    for v in (5, 50, 100):   # 23 Oct 2026: the other Canadian bills (blue, red, brown), same plain style
        j["item_bill_%d" % v] = (bill(v), 240, 120)
    for name, fn, w, h in (("tray", tray, 320, 90), ("plate", plate, 240, 80), ("box", box, 240, 140), ("bag", bag, 140, 176), ("jar", jar, 140, 176),
                           ("vase", vase, 140, 176), ("table", table, 240, 160), ("jug", jug, 160, 176), ("basket", basket, 280, 126), ("cake", cake_small, 240, 120)):
        j["hold_" + name] = (lambda b=fn, w=w, h=h: sv(b, w, h), w, h)
    j["cake_top"] = (lambda: sv(cake_top, 300, 300), 300, 300)
    j["pie_top"] = (lambda: sv(pie_top, 300, 300), 300, 300)
    j["clock_face"] = (lambda: sv(clock_face, 240, 240), 240, 240)
    return j


def render(names):
    all_jobs = jobs()
    out = {}
    with sync_playwright() as pw:
        br = pw.chromium.launch(args=["--mute-audio"])
        pg = br.new_page()
        for name in names:
            fn, w, h = all_jobs[name]
            svg = fn()
            with open(os.path.join(SRC_DIR, name + ".svg"), "w", encoding="utf-8") as fh:
                fh.write(svg)
            pg.set_viewport_size({"width": w, "height": h})
            pg.set_content('<html><head><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Lexend:wght@800&display=swap"></head>'
                           '<body style="margin:0;background:transparent">%s</body></html>' % svg)
            pg.wait_for_timeout(150 if name.startswith("item_bill") else 0)
            shot = pg.screenshot(omit_background=True, clip={"x": 0, "y": 0, "width": w, "height": h})
            out[name] = optimise(shot, os.path.join(OUT_DIR, name + ".png"), name in ("wall_tile", "counter_tile"))
        br.close()
    return out


def contact_sheet(names):
    cell, cols = 220, 8
    tiles = [(n, Image.open(os.path.join(OUT_DIR, n + ".png")).convert("RGBA")) for n in names if os.path.exists(os.path.join(OUT_DIR, n + ".png"))]
    rows = math.ceil(len(tiles) / cols)
    sheet = Image.new("RGBA", (cols * cell, rows * cell), (150, 150, 150, 255))
    for i, (n, im) in enumerate(tiles):
        t = im.copy()
        t.thumbnail((cell - 16, cell - 16))
        sheet.alpha_composite(t, (i % cols * cell + (cell - t.width) // 2, i // cols * cell + (cell - t.height) // 2))
    sheet.convert("RGB").save(SHEET)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", default="")
    ap.add_argument("--sheet-only", action="store_true")
    a = ap.parse_args()
    names = list(jobs().keys())
    todo = [n for n in names if not a.only or any(n.startswith(k) for k in a.only.split(","))]
    big = []
    if not a.sheet_only:
        for n, (size, note) in sorted(render(todo).items()):
            print("%-26s %7d bytes  %s" % (n + ".png", size, note))
            if size >= MAX_BYTES:
                big.append(n)
    have = sorted(n + ".png" for n in names if os.path.exists(os.path.join(OUT_DIR, n + ".png")))
    with open(os.path.join(OUT_DIR, "manifest.json"), "w", encoding="utf-8") as fh:
        json.dump({"files": have}, fh, indent=1)
    contact_sheet(names)
    print("manifest: %d files; sheet: %s" % (len(have), SHEET))
    if big:
        sys.exit("OVER 150 KB: " + ", ".join(big))


if __name__ == "__main__":
    main()
