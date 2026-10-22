"""draw_castle_world_art.py - draws the new pictures of Kennedy's play world "Knight Castle World".

Same drawing system as draw_castle_art.py and draw_cafe_art.py (soft gradient fills, a core shadow, a soft
top-left highlight, glossy eyes, blush and a warm dark-brown outline). The knight, the buddy knights and the
pony keep the identity of modules/knight_art.js and draw_castle_art.py; pictures that already exist in
game/rewards/art/castle/ (knight_idle, knight_cheer, pony_*, stable_background, path_*, brush, apple_*, heart,
sparkle, apple_tree, mud_spot_*) are reused by the game and are NOT drawn again here.

Canvases and anchors the world code relies on (see PARTS and SLOTS in game/world/castle_world.js):
  The castle build canvas is 1000 x 1300 with the ground line on y 1050. Every castle part is drawn on its own
  canvas the exact size of its slot box, so the game places it by the box alone:
    tower_*      240 x 890  (slot box x 50..290 / 710..950, y 160..1050); roof tip x 120, y = TOWER_TIP[style]
    flag_*       140 x 180  (pole foot at x 30, y 176; the game stands it on the roof tip)
    keep_*       300 x 780  (x 350..650, y 120..900; tip y 60 inside the canvas)
    walls_*      520 x 510  (x 240..760, y 540..1050)
    gate_*       240 x 350  (x 380..620, y 700..1050)
    bridge_down  220 x 170  (x 390..610, y 1040..1210; lies over the moat in front of the gate)
    banner_*     120 x 210  (centred on a tower, y 640..850)
    moat_*       760 x 220  (x 120..880, y 1035..1255)
    garden_*     230 x 260  (x 0..230 / 770..1000, y 1040..1300; the right one is mirrored by the game)
    castle_plot 1000 x 340  (y 960..1300, the grassy hill top)
  Characters: buddy_<look>_<pose> and knight_wave / knight_blink are 462 x 600 (feet y 596), rendered at 0.6.
  goblin_<pose> 400 x 460 (feet y 452, walks to the LEFT), pet_<kind>_<pose> 420 x 400 (feet y 392).
  pony_blink 700 x 660 (same box as pony_stand). defence_wall 520 x 900 (wall foot y 900).
  yard_background 1600 x 900 (opaque). Items have their own small canvases.

Run:  python gh_site/tools/draw_castle_world_art.py [--only name1,name2] [--sheet-only]
Writes SVG sources to 16_kids_maths/work_tmp/art_src/castle_world/, PNGs to gh_site/game/world/art/castle/,
art/castle/manifest.json and the contact sheet work_tmp/world_shots/castle/castle_world_contact_sheet.png.
"""
import argparse
import io
import json
import math
import os
import sys

TOOLS = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, TOOLS)
SITE = os.path.dirname(TOOLS)
PROJECT = os.path.dirname(SITE)
WORK_TMP = os.path.join(PROJECT, "work_tmp")
os.environ["TEMP"] = WORK_TMP
os.environ["TMP"] = WORK_TMP
SRC_DIR = os.path.join(WORK_TMP, "art_src", "castle_world")
OUT_DIR = os.path.join(SITE, "game", "world", "art", "castle")
OLD_DIR = os.path.join(SITE, "game", "rewards", "art", "castle")
SHOT_DIR = os.path.join(WORK_TMP, "world_shots", "castle")
SHEET = os.path.join(SHOT_DIR, "castle_world_contact_sheet.png")
LIMIT = 150 * 1000  # every PNG must stay under 150 KB
for d in (SRC_DIR, OUT_DIR, SHOT_DIR):
    os.makedirs(d, exist_ok=True)

from PIL import Image  # noqa: E402
from playwright.sync_api import sync_playwright  # noqa: E402

import draw_castle_art as dca  # noqa: E402  (the castle palettes and the knight; its render is never called)
from draw_cafe_art import (  # noqa: E402  (the shared drawing system)
    Art, INK, blush, cr_path, ell_pts, eye, f, heart_d, limb_pts, line, mouth, rrect_d, star_pts)

STONE, STONE_L = dca.STONE, ("#f2f4f7", "#cfd6df", "#aab3c0")
BLUE, BLUE_D, RED, GOLD, GREEN = dca.BLUE, dca.BLUE_D, dca.RED, dca.GOLD, dca.GREEN
WOOD, BROWN, LEAF, MANE = dca.WOOD, dca.BROWN, dca.LEAF, dca.MANE
PURPLE = ("#e3d2ff", "#9a6ad8", "#8a5ec4")
ORANGE = ("#ffd9a8", "#f39a3c", "#d9833a")
TEAL = ("#c4f2ea", "#3fb8a8", "#35a090")
WATER = ("#d6f0f7", "#8cc4dc", "#78acc6")
GRASS = ("#c9eeb3", "#86c47a", "#6aa86c")
CREAM = ("#fffaf0", "#f6e7cc", "#e8d2ae")
GROUND = 1050
TOWER_TIP = {"round": 60, "square": 236, "tall": 12}       # roof tip y inside the 240 x 890 tower canvas
KEEP_TIP = {"stone": 60, "gold": 92}                       # inside the 300 x 780 keep canvas
COLOURS = {"red": RED, "blue": BLUE, "green": GREEN, "gold": GOLD, "purple": PURPLE}


def soft_shadow(A, cx, cy, rx, ry, op=0.24):
    return dca.soft_shadow(A, cx, cy, rx, ry, op)


def stones(x0, y0, x1, y1, h=40, w=72, op=0.4):
    return dca.stone_lines(x0, y0, x1, y1, h, w, op)


def arched_window(A, cx, top, w, h, lit=True):
    pal = ("#fff6d6", "#ffe3a0", "#f0c878") if lit else ("#8fa1bd", "#5c6a86", "#4a5672")
    x0, x1, b = cx - w / 2, cx + w / 2, top + h
    d = "M%s %s L%s %s Q%s %s %s %s Q%s %s %s %s L%s %s Z" % (f(x0), f(b), f(x0), f(top + w / 2), f(x0), f(top), f(cx), f(top),
                                                          f(x1), f(top), f(x1), f(top + w / 2), f(x1), f(b))
    return A.shape(d, (x0, top, w, h), pal, sw=4.4, hl=0.6, inner=line("M%s %s L%s %s M%s %s L%s %s" % (
        f(cx), f(top), f(cx), f(b), f(x0), f(top + h * 0.55), f(x1), f(top + h * 0.55)), 3.6, "#c99a62", 0.8))


# ------------------------------------------------------------------ castle parts
def tower_svg(style):
    A = Art(240, 890)
    o = []
    tip = TOWER_TIP[style]
    body_top = {"round": 250, "square": 300, "tall": 230}[style]
    bw = 196 if style != "tall" else 176
    x0 = 120 - bw / 2
    o.append(soft_shadow(A, 120, 884, 112, 10))
    pal = STONE if style != "tall" else ("#f4eefc", "#d6cce6", "#bcb0d0")
    o.append(A.shape(rrect_d(x0, body_top, bw, 890 - body_top - 4, 14), (x0, body_top, bw, 890 - body_top), pal, sw=5.4, hl=0.45,
                     inner=stones(int(x0), body_top + 40, int(x0 + bw), 886, w=64)))
    if style == "round":
        o.append(A.shape(rrect_d(4, 220, 232, 62, 14), (4, 220, 232, 62), STONE_L, sw=5, hl=0.4))
        o.append(A.poly([(-2, 230), (40, 170), (84, 104), (120, tip), (156, 104), (200, 170), (242, 230)], BLUE_D, corners=(0, 3, 6), sw=5.4, hl=0.6,
                        inner=line("M50 214 Q80 150 116 80", 5, "#9fb6ea", 0.6)))
    elif style == "square":
        merl = "".join(rrect_d(x, 236, 40, 46, 8) + " " for x in (10, 70, 130, 190))
        o.append(A.shape(merl, (10, 236, 220, 46), STONE, sw=5, hl=0.4))
        o.append(A.shape(rrect_d(4, 276, 232, 40, 10), (4, 276, 232, 40), STONE_L, sw=5, hl=0.4))
        o.append(A.poly([(60, 372), (180, 372), (180, 404), (60, 404)], RED, sw=4.4, hl=0.4))  # a red band
    else:
        o.append(A.shape(rrect_d(10, 200, 220, 54, 14), (10, 200, 220, 54), ("#fbf7ff", "#e4dcef", "#c9bedb"), sw=5, hl=0.4))
        o.append(A.poly([(4, 210), (60, 140), (96, 70), (120, tip), (144, 70), (180, 140), (236, 210)], PURPLE, corners=(0, 3, 6), sw=5.4, hl=0.6,
                        inner=line("M40 196 Q76 130 112 50", 5, "#f1e6ff", 0.6) + line("M10 206 L230 206", 8, GOLD[1]) +
                        "".join('<circle cx="%d" cy="%d" r="7" fill="%s"/>' % (x, y, GOLD[0]) for x, y in ((70, 160), (120, 120), (170, 160), (120, 175)))))
    # windows: one big lit window and one small; a flower box on the big one
    o.append(arched_window(A, 120, 400, 70, 104))
    o.append(A.shape(rrect_d(78, 500, 84, 16, 6), (78, 500, 84, 16), WOOD, sw=4, hl=0.3))
    for k, col in enumerate(("#f6a9bd", "#ffe08a", "#f6a9bd")):
        o.append('<circle cx="%d" cy="494" r="9" fill="%s" stroke="%s" stroke-width="3"/>' % (94 + k * 26, col, INK))
    o.append(arched_window(A, 120, 640, 46, 70, lit=style != "square"))
    # grass tufts at the foot
    o.append(A.poly([(10, 890), (20, 852), (36, 870), (50, 846), (64, 872), (80, 860), (90, 890)], GRASS, corners=(1, 3, 5), sw=3.6, hl=0.3))
    o.append(A.poly([(160, 890), (172, 856), (186, 872), (200, 848), (214, 870), (230, 890)], GRASS, corners=(1, 3), sw=3.6, hl=0.3))
    return A.svg("".join(o))


def keep_svg(style):
    A = Art(300, 780)
    o = []
    tip = KEEP_TIP[style]
    o.append(A.shape(rrect_d(26, 230, 248, 560, 16), (26, 230, 248, 550), STONE_L, sw=5.4, hl=0.45, inner=stones(26, 270, 274, 780, w=70)))
    if style == "stone":
        o.append(A.shape(rrect_d(10, 196, 280, 60, 14), (10, 196, 280, 60), STONE, sw=5, hl=0.4))
        o.append(A.poly([(0, 206), (60, 140), (110, 90), (150, tip), (190, 90), (240, 140), (300, 206)], BLUE_D, corners=(0, 3, 6), sw=5.4, hl=0.6,
                        inner=line("M60 190 Q100 130 146 80", 5, "#9fb6ea", 0.6)))
    else:
        o.append(A.shape(rrect_d(10, 196, 280, 60, 14), (10, 196, 280, 60), ("#fff8e6", "#f3dfae", "#e0c48a"), sw=5, hl=0.4))
        o.append(A.shape("M18 206 Q18 %d 150 %d Q282 %d 282 206 Z" % (tip + 30, tip, tip + 30), (18, tip, 264, 206 - tip), GOLD, sw=5.4, hl=0.7,
                         inner=line("M70 196 Q70 130 150 112", 5, "#fffbe6", 0.6)))
        o.append(A.ellipse(150, tip - 2, 14, 14, GOLD, sw=4, hl=0.7))
    # a big round rose window and two tall windows
    o.append(A.ellipse(150, 320, 46, 46, ("#fff6d6", "#ffe3a0", "#f0c878"), sw=4.6, hl=0.6,
                       inner=line("M150 274 L150 366 M104 320 L196 320 M118 288 L182 352 M182 288 L118 352", 3.4, "#c99a62", 0.8)))
    o.append(arched_window(A, 96, 420, 46, 86))
    o.append(arched_window(A, 204, 420, 46, 86))
    return A.svg("".join(o))


def walls_svg(style):
    A = Art(520, 510)
    o = []
    merl = "".join(rrect_d(x, 0, 46, 54, 8) + " " for x in range(8, 500, 70))
    o.append(A.shape(merl, (8, 0, 504, 54), STONE, sw=5, hl=0.4))
    o.append(A.shape("M0 46 L520 46 L520 510 L0 510 Z", (0, 46, 520, 464), STONE, sw=5.2, hl=0.35, inner=stones(0, 86, 520, 510)))
    o.append(line("M0 50 L520 50", 8, "#e9edf2", 0.8))
    if style == "windows":
        for x in (80, 440):
            o.append(arched_window(A, x, 140, 54, 80))
            o.append(A.shape(rrect_d(x - 36, 218, 72, 14, 6), (x - 36, 218, 72, 14), WOOD, sw=4, hl=0.3))
            for k, col in enumerate(("#c9b6f2", "#ffe08a", "#f6a9bd")):
                o.append('<circle cx="%d" cy="213" r="8" fill="%s" stroke="%s" stroke-width="3"/>' % (x - 22 + k * 22, col, INK))
        # ivy on the wall
        for sx, sy in ((150, 120), (370, 140)):
            o.append(line("M%d %d q-20 60 6 120 q20 60 -6 130" % (sx, sy), 5, "#5aa05a"))
            for k in range(6):
                o.append(A.ellipse(sx + (-14 if k % 2 else 14), sy + 30 + k * 42, 14, 10, LEAF, rot=30 if k % 2 else -30, sw=3.2, hl=0.4))
    else:
        for x in (90, 430):
            o.append('<rect x="%d" y="160" width="16" height="64" rx="7" fill="#4a5672" stroke="%s" stroke-width="4"/>' % (x - 8, INK))
    o.append(A.poly([(0, 510), (14, 474), (30, 494), (46, 466), (62, 492), (80, 510)], GRASS, corners=(1, 3), sw=3.6, hl=0.3))
    o.append(A.poly([(440, 510), (456, 470), (474, 492), (492, 468), (506, 490), (520, 510)], GRASS, corners=(1, 3), sw=3.6, hl=0.3))
    return A.svg("".join(o))


GATE_ARCH = "M40 350 L40 150 Q40 30 120 30 Q200 30 200 150 L200 350 Z"


def gate_svg(style):
    A = Art(240, 350)
    o = []
    # the stone gatehouse face around the arch
    o.append(A.shape("M0 0 L240 0 L240 350 L0 350 Z", (0, 0, 240, 350), STONE_L, sw=5, hl=0.35, inner=stones(0, 40, 240, 350, w=60)))
    A.defs.append('<clipPath id="gateclip"><path d="%s"/></clipPath>' % GATE_ARCH)
    if style == "wood":
        planks = "".join('<path d="M%d 30 L%d 350" stroke="#8a5e3b" stroke-width="4" opacity=".7"/>' % (x, x) for x in range(64, 200, 26))
        bands = "".join('<rect x="40" y="%d" width="160" height="14" fill="#7d8796"/>' % y for y in (150, 270))
        o.append(A.shape(GATE_ARCH, (40, 30, 160, 320), WOOD, sw=5.2, hl=0.5, inner=planks + bands))
        o.append(A.ellipse(170, 220, 11, 11, GOLD, sw=3.8, hl=0.7))
    elif style == "gold":
        planks = "".join('<path d="M%d 30 L%d 350" stroke="#c99a3a" stroke-width="4" opacity=".6"/>' % (x, x) for x in range(64, 200, 26))
        o.append(A.shape(GATE_ARCH, (40, 30, 160, 320), GOLD, sw=5.2, hl=0.7, inner=planks + line("M120 30 L120 350", 6, "#b8862e", 0.8)))
        o.append(A.poly(star_pts(120, 140, 34, 15), ("#ffffff", "#fff2c0", "#f0d890"), corners=tuple(range(0, 10, 2)), sw=4, hl=0.6))
        o.append(A.ellipse(100, 230, 10, 10, BLUE, sw=3.6, hl=0.7) + A.ellipse(140, 230, 10, 10, BLUE, sw=3.6, hl=0.7))
    else:
        # drawbridge gate: the arch stands open on a warm courtyard; chains run down to the lowered bridge
        inside = ('<rect x="40" y="30" width="160" height="320" fill="%s"/>' % A.lin([(0, "#5c6a86"), (0.55, "#8a96ae"), (1, "#c9d6b8")], 0, 0, 0, 1) +
                  '<ellipse cx="120" cy="350" rx="110" ry="60" fill="#bfe0a0"/>' +
                  '<ellipse cx="120" cy="230" rx="70" ry="60" fill="#fff3c8" opacity=".6" filter="%s"/>' % A.blur(14))
        o.append('<g clip-path="url(#gateclip)">%s</g>' % inside)
        o.append('<path d="%s" fill="none" stroke="%s" stroke-width="5"/>' % (GATE_ARCH, INK))
        o.append(dca.chain(22, 40, 40, 340) + dca.chain(218, 40, 200, 340))
    # the stone ring of the arch
    ring = "M26 350 L26 150 Q26 16 120 16 Q214 16 214 150 L214 350 L200 350 L200 150 Q200 30 120 30 Q40 30 40 150 L40 350 Z"
    o.append(A.shape(ring, (26, 16, 188, 334), STONE, sw=4.6, hl=0.4))
    o.append(A.ellipse(120, 18, 14, 14, GOLD, sw=4, hl=0.7))
    return A.svg("".join(o))


def bridge_down_svg():
    A = Art(220, 170)
    planks = "".join('<path d="M0 %d L220 %d" stroke="#8a5e3b" stroke-width="4" opacity=".7"/>' % (y, y) for y in range(26, 170, 22))
    o = A.shape("M24 0 L196 0 L216 160 L4 160 Z", (4, 0, 212, 160), WOOD, sw=5.2, hl=0.45, inner=planks)
    o += A.shape("M0 154 L220 154 L220 168 L0 168 Z", (0, 154, 220, 14), ("#d8a86e", "#9a6a40", "#7a5236"), sw=4.4, hl=0.2)
    return A.svg(o)


def flag_svg(colour):
    A = Art(140, 180)
    pal = COLOURS[colour]
    o = line("M30 176 L30 22", 9, INK) + line("M30 176 L30 22", 4.5, "#c9b28a")
    o += A.poly([(34, 26), (90, 22), (132, 40), (104, 56), (128, 76), (84, 84), (34, 88)], pal, corners=(0, 2, 4, 6), sw=4.6, hl=0.55,
                inner=line("M40 50 Q80 44 110 52", 4, "#ffffff", 0.45))
    o += A.ellipse(30, 18, 11, 11, GOLD, sw=4, hl=0.7)
    return A.svg(o)


def banner_svg(colour):
    A = Art(120, 210)
    pal = COLOURS[colour]
    o = A.shape(rrect_d(4, 6, 112, 22, 10), (4, 6, 112, 22), WOOD, sw=4.4, hl=0.4)
    o += A.poly([(14, 24), (106, 24), (106, 196), (60, 168), (14, 196)], pal, corners=(0, 1, 2, 3, 4), sw=4.8, hl=0.5,
                inner=line("M20 34 L20 186 M100 34 L100 186", 5, GOLD[1], 0.9))
    emblem = {"red": "star", "blue": "star", "green": "leaf", "gold": "heart", "purple": "star"}[colour]
    if emblem == "star":
        o += A.poly(star_pts(60, 92, 28, 12), GOLD if colour != "gold" else ("#fff", "#fff6d6", "#f0e0a8"), corners=tuple(range(0, 10, 2)), sw=3.8, hl=0.6)
    elif emblem == "leaf":
        o += A.poly([(60, 60), (86, 92), (60, 128), (34, 92)], ("#f4ffe8", "#d8f5c0", "#b8e0a0"), corners=(0, 2), sw=3.8, hl=0.5)
    else:
        o += A.shape(heart_d(60, 96, 1.1), (30, 66, 60, 60), ("#ffd0dc", "#f27a98", "#d85a7a"), sw=3.8, hl=0.6)
    return A.svg(o)


def moat_svg(ducks):
    A = Art(760, 220)
    d = "M20 70 Q20 20 110 18 L650 18 Q740 20 740 70 L740 140 Q740 200 650 202 L110 202 Q20 200 20 140 Z"
    ripples = line("M110 80 q40 -10 80 0 q40 10 80 0 M470 130 q40 -10 80 0 q40 10 80 0 M150 160 q30 -8 60 0 M560 70 q30 -8 60 0", 4, "#eef9fc", 0.75)
    o = A.shape(d, (20, 18, 720, 184), WATER, sw=4.6, hl=0.35, inner=ripples)
    # stone bank on the near edge
    for x in range(40, 740, 62):
        o += A.ellipse(x, 204, 30, 13, STONE, sw=3.6, hl=0.4)
    for x, y, s in ((60, 40, 1.0), (700, 46, 1.0)):
        o += A.poly([(x - 20 * s, y + 20), (x - 12 * s, y - 14), (x, y + 6), (x + 10 * s, y - 20), (x + 22 * s, y + 20)], GRASS, corners=(1, 3), sw=3.4, hl=0.3)
    if ducks:
        for x, y, s in ((250, 120, 1.0), (330, 140, 0.7), (380, 132, 0.7)):
            o += duck(A, x, y, s)
        # lily pads with a pink flower
        for x, y in ((560, 150), (620, 110)):
            o += A.ellipse(x, y, 34, 14, LEAF, sw=3.4, hl=0.4)
        o += A.ellipse(560, 140, 12, 9, ("#ffe0ea", "#f6a9bd", "#e08aa4"), sw=3.2, hl=0.6)
    return A.svg(o)


def duck(A, x, y, s):
    yel = ("#fffbe0", "#ffe27a", "#f0c850")
    o = A.ellipse(x, y, 46 * s, 26 * s, yel, sw=4, hl=0.6)
    o += A.ellipse(x - 30 * s, y - 32 * s, 22 * s, 22 * s, yel, sw=4, hl=0.6)
    o += A.poly([(x - 50 * s, y - 34 * s), (x - 72 * s, y - 28 * s), (x - 50 * s, y - 22 * s)], ORANGE, corners=(1,), sw=3.4)
    o += '<circle cx="%s" cy="%s" r="%s" fill="%s"/>' % (f(x - 36 * s), f(y - 38 * s), f(4.5 * s), INK)
    o += line("M%s %s q%s %s %s %s" % (f(x + 4 * s), f(y - 6 * s), f(14 * s), f(10 * s), f(30 * s), f(2 * s)), 3.4, "#e0b840")
    return o


def flower(A, x, y, col, r=10):
    o = "".join('<circle cx="%s" cy="%s" r="%s" fill="%s" stroke="%s" stroke-opacity=".7" stroke-width="2.6"/>' % (f(x + dx * r * 1.15), f(y + dy * r * 1.15), r, col, INK)
                for dx, dy in ((0, -1), (1, 0), (0, 1), (-1, 0), (0.7, -0.7), (-0.7, 0.7)))
    return o + '<circle cx="%s" cy="%s" r="%s" fill="#fff3a0" stroke="%s" stroke-opacity=".6" stroke-width="2"/>' % (f(x), f(y), f(r * 0.7), INK)


def garden_svg(kind):
    A = Art(230, 260)
    o = soft_shadow(A, 115, 246, 104, 12)
    o += A.shape("M10 250 Q10 170 115 168 Q220 170 220 250 Z", (10, 168, 210, 82), GRASS, sw=4.6, hl=0.35)
    if kind == "flowers":
        o += A.shape(rrect_d(26, 176, 178, 64, 26), (26, 176, 178, 64), ("#c8a07a", "#8a6440", "#7a5638"), sw=4.4, hl=0.2)
        cols = ("#f6a9bd", "#ffe08a", "#c9b6f2", "#ff9f8a", "#9fd8f6")
        k = 0
        for row, y in enumerate((150, 196, 226)):
            for x in range(46 + row * 12, 200, 40):
                o += line("M%d %d L%d %d" % (x, y + 6, x, y + 40), 5, "#5aa05a")
                o += flower(A, x, y, cols[k % 5], 11 if row == 0 else 9)
                k += 1
        o += A.ellipse(36, 140, 22, 14, LEAF, rot=-30, sw=3.4, hl=0.4) + A.ellipse(196, 150, 22, 14, LEAF, rot=30, sw=3.4, hl=0.4)
    else:  # fountain
        o += A.ellipse(115, 214, 92, 30, STONE, sw=4.8, hl=0.4, inner='<ellipse cx="115" cy="210" rx="76" ry="20" fill="#8cc4dc"/>')
        o += A.shape(rrect_d(100, 110, 30, 104, 10), (100, 110, 30, 104), STONE_L, sw=4.4, hl=0.4)
        o += A.ellipse(115, 112, 46, 14, STONE, sw=4.4, hl=0.4, inner='<ellipse cx="115" cy="110" rx="36" ry="8" fill="#8cc4dc"/>')
        for dx in (-1, 1):
            o += line("M115 80 Q%d 70 %d 112" % (115 + dx * 36, 115 + dx * 56), 9, "#ffffff", 0.95)
            o += line("M115 80 Q%d 70 %d 112" % (115 + dx * 36, 115 + dx * 56), 4, "#a8dcef")
            o += line("M%d 112 Q%d 150 %d 200" % (115 + dx * 50, 115 + dx * 70, 115 + dx * 76), 7, "#ffffff", 0.85)
        o += A.ellipse(115, 74, 16, 16, ("#ffffff", "#d6f0f7", "#a8dcef"), sw=3.6, hl=0.7)
        o += flower(A, 30, 230, "#f6a9bd", 9) + flower(A, 200, 232, "#ffe08a", 9)
    return A.svg(o)


def plot_svg():
    A = Art(1000, 340)
    o = '<path d="M-20 340 L-20 120 Q160 70 500 64 Q840 70 1020 120 L1020 340 Z" fill="%s"/>' % A.lin([(0, "#bfe3a6"), (1, "#94c97f")], 0, 0, 0, 1)
    o += '<path d="M-20 120 Q160 70 500 64 Q840 70 1020 120" fill="none" stroke="%s" stroke-opacity=".35" stroke-width="4"/>' % INK
    # a soft sandy foundation where the castle stands
    o += '<ellipse cx="500" cy="96" rx="470" ry="40" fill="%s"/>' % A.rad([(0, "#f0dcb4"), (0.75, "#e6cc9e"), (1, "#e6cc9e", 0)])
    for x, y, c in ((60, 250, "#f6a9bd"), (220, 300, "#ffe08a"), (780, 290, "#c9b6f2"), (940, 240, "#f6a9bd"), (500, 320, "#fbfcfd"), (380, 270, "#ffe08a")):
        o += flower(A, x, y, c, 8)
    for x in (130, 330, 680, 880):
        o += A.poly([(x - 22, 210), (x - 14, 180), (x - 4, 198), (x + 4, 172), (x + 12, 196), (x + 22, 210)], GRASS, corners=(1, 3), sw=3.2, hl=0.2)
    return A.svg(o)


# ------------------------------------------------------------------ knights: the main knight's extra poses, 4 buddies
BUDDIES = {
    # look: (tunic, cape and crest, skin)
    "leaf": (GREEN, RED, dca.SKIN2),
    "sun": (ORANGE, PURPLE, dca.SKIN),
    "plum": (PURPLE, GOLD, ("#f2d6bc", "#d4a37c", "#c08e68")),
    "sea": (TEAL, ORANGE, ("#d9ad88", "#a87652", "#94653f")),
}


def with_calm_eyes(fn):
    """Runs a knight/pony drawing with every eye drawn shut (calm), for the blink frame."""
    def run():
        old_k = dca.eye

        def calm_eye(A, cx, cy, mode, *a, **k):
            return old_k(A, cx, cy, "calm", *a, **k)
        dca.eye = calm_eye
        try:
            return fn()
        finally:
            dca.eye = old_k
    return run


def buddy_svg(look, pose):
    tunic, cape, skin = BUDDIES[look]
    saved = (dca.GREEN, dca.RED, dca.SKIN2)
    dca.GREEN, dca.RED, dca.SKIN2 = tunic, cape, skin
    try:
        p = "idle" if pose == "blink" else pose
        if pose == "blink":
            return with_calm_eyes(lambda: dca.knight_svg("buddy", p))()
        return dca.knight_svg("buddy", p)
    finally:
        dca.GREEN, dca.RED, dca.SKIN2 = saved


# ------------------------------------------------------------------ goblins (400 x 460, feet on y 452, walk to the left)
GOB = ("#d8f5b8", "#8fd06a", "#6fae58")
GOB_EAR = ("#e6f9cc", "#9cd878", "#7ab862")
TUNIC_G = ("#e6c8a4", "#a9825a", "#8f6c48")
HAT = ("#ffd3d8", "#f27a98", "#d85a7a")
IRIS_G = ("#d6b860", "#8a6a20", "#3a2a10")


def goblin_svg(pose):
    A = Art(400, 460)
    o = [soft_shadow(A, 200, 450, 110, 12)]
    sit = pose == "sleepy"
    bob = {"walk_a": 0, "walk_b": -10, "oops": 6, "run": -14, "sleepy": 60, "wave": 0}[pose]
    hx, hy = 196, 170 + bob
    look = -0.9 if pose in ("walk_a", "walk_b") else (0.0)
    # legs and big feet
    if sit:
        legs = (((170, 360), (120, 400), (90, 420)), ((230, 360), (280, 400), (310, 420)))
    elif pose == "walk_a":
        legs = (((176, 330), (150, 390), (128, 436)), ((222, 330), (240, 390), (252, 436)))
    elif pose == "walk_b":
        legs = (((176, 320), (190, 380), (196, 436)), ((222, 320), (210, 380), (206, 430)))
    elif pose == "run":
        legs = (((176, 316), (124, 360), (96, 420)), ((222, 316), (270, 372), (292, 410)))
    else:
        legs = (((176, 330), (168, 390), (160, 436)), ((222, 330), (232, 390), (240, 436)))
    for s, c, p in legs:
        o.append(A.poly(limb_pts(s, c, p, 20, 17), GOB, sw=5, hl=0.3))
        o.append(A.ellipse(p[0] - 14, p[1] + 2, 36, 18, BROWN, sw=5, hl=0.4))
    # body: a round tummy in a patched tunic
    by = 280 + bob * 0.6
    tun_in = (A.ellipse(240, by + 30, 18, 16, ("#cfe6ff", "#8fb4e6", "#7a9cd0"), sw=3.4, hl=0.3) +
              line("M228 %s l24 0 M240 %s l0 24" % (f(by + 22), f(by + 18)), 2.6, "#4a5672", 0.7) +
              line("M140 %s Q200 %s 260 %s" % (f(by + 64), f(by + 80), f(by + 64)), 4, "#f6e2c6", 0.6))
    o.append(A.ellipse(200, by, 82, 92, TUNIC_G, sw=5.2, hl=0.45, inner=tun_in))
    o.append(line("M132 %s Q200 %s 268 %s" % (f(by - 4), f(by + 14), f(by - 4)), 8, "#7a5236"))
    # arms
    if pose == "wave":
        arms = (((128, by - 30), (100, by + 10), (104, by + 60)), ((272, by - 30), (320, by - 80), (330, by - 150)))
    elif pose == "oops":
        arms = (((128, by - 30), (80, by - 60), (70, by - 110)), ((272, by - 30), (320, by - 60), (330, by - 110)))
    elif pose == "run":
        arms = (((128, by - 30), (90, by - 10), (70, by + 30)), ((272, by - 30), (310, by - 50), (340, by - 30)))
    elif sit:
        arms = (((132, by - 20), (120, by + 30), (140, by + 60)), ((268, by - 20), (280, by + 30), (260, by + 60)))
    elif pose == "walk_b":
        arms = (((128, by - 30), (106, by + 10), (120, by + 56)), ((272, by - 30), (296, by + 10), (276, by + 56)))
    else:
        arms = (((128, by - 30), (96, by + 10), (84, by + 50)), ((272, by - 30), (300, by + 14), (316, by + 50)))
    for s, c, p in arms:
        o.append(A.poly(limb_pts(s, c, p, 18, 15), GOB, sw=5, hl=0.3))
        o.append(A.ellipse(p[0], p[1], 22, 21, GOB, sw=5, hl=0.5))
    # big pointy-but-soft ears
    for side in (-1, 1):
        ex = hx + side * 108
        pts = [(hx + side * 60, hy - 30), (ex + side * 46, hy - 70), (ex + side * 20, hy + 10), (hx + side * 64, hy + 30)]
        o.append(A.poly(pts, GOB_EAR, corners=(1,), sw=5, hl=0.4,
                        inner='<path d="M%s %s L%s %s L%s %s Z" fill="#ffc6cf" opacity=".85"/>' % (
                            f(hx + side * 74), f(hy - 16), f(ex + side * 30), f(hy - 50), f(ex + side * 8), f(hy + 10))))
    # head
    head_in = blush(A, hx - 64, hy + 46) + blush(A, hx + 64, hy + 46)
    o.append(A.ellipse(hx, hy, 108, 96, GOB, sw=5.4, hl=0.6, inner=head_in, hlpos=(0.32, 0.2)))
    # eyes, nose and mouth
    if pose == "oops":
        for ex in (hx - 44, hx + 44):  # dizzy swirl eyes
            o.append('<circle cx="%s" cy="%s" r="27" fill="#fff" stroke="%s" stroke-width="5"/>' % (f(ex), f(hy + 2), INK))
            o.append(line("M%s %s a10 10 0 1 1 -10 10 a16 16 0 1 1 18 -18" % (f(ex), f(hy + 2)), 4.5))
    elif pose in ("sleepy",):
        o.append(eye(A, hx - 44, hy + 6, "calm", False, IRIS_G, rx=24, ry=28))
        o.append(eye(A, hx + 44, hy + 6, "calm", False, IRIS_G, rx=24, ry=28))
    elif pose in ("run", "wave"):
        o.append(eye(A, hx - 44, hy + 2, "happy", False, IRIS_G, rx=24, ry=28))
        o.append(eye(A, hx + 44, hy + 2, "happy", False, IRIS_G, rx=24, ry=28))
    else:
        o.append(eye(A, hx - 44, hy + 2, "open", False, IRIS_G, rx=25, ry=30, look=look))
        o.append(eye(A, hx + 44, hy + 2, "open", False, IRIS_G, rx=25, ry=30, look=look))
        # silly lifted brows
        o.append(line("M%s %s q22 -16 44 -4 M%s %s q22 -12 44 4" % (f(hx - 66), f(hy - 40), f(hx + 22), f(hy - 44)), 5))
    nx = hx + (-14 if look < 0 else 0)
    o.append(A.ellipse(nx, hy + 44, 26, 20, ("#c8ee9e", "#7cc45a", "#64a84a"), sw=4.6, hl=0.7))
    if pose == "oops":
        o.append('<ellipse cx="%s" cy="%s" rx="13" ry="15" fill="#a8445a" stroke="%s" stroke-width="4"/>' % (f(hx), f(hy + 78), INK))
    elif pose == "sleepy":
        o.append(line("M%s %s q10 6 20 0" % (f(hx - 10), f(hy + 76)), 4.5))
        o.append(A.ellipse(hx + 34, hy + 72, 12, 14, ("#ffffff", "#e6f4fb", "#cfe6f2"), sw=3, hl=0.8))  # a sleepy bubble
    else:
        o.append(mouth("knight", "open", hx, hy + 66))
        o.append('<rect x="%s" y="%s" width="12" height="12" rx="3" fill="#fff" stroke="%s" stroke-width="3"/>' % (f(hx - 12), f(hy + 67), INK))  # one silly tooth
    # a striped woolly hat with a pom-pom (silly, never scary)
    tilt = {"oops": 16, "run": -10, "sleepy": 12}.get(pose, -6)
    hat = A.shape("M%s %s Q%s %s %s %s Q%s %s %s %s Z" % (f(hx - 86), f(hy - 58), f(hx - 70), f(hy - 150), f(hx), f(hy - 156), f(hx + 70), f(hy - 150), f(hx + 86), f(hy - 58)),
                  (hx - 86, hy - 156, 172, 98), HAT, sw=5, hl=0.5,
                  inner=line("M%s %s Q%s %s %s %s M%s %s Q%s %s %s %s" % (f(hx - 90), f(hy - 92), f(hx), f(hy - 110), f(hx + 90), f(hy - 92),
                                                                       f(hx - 84), f(hy - 124), f(hx), f(hy - 140), f(hx + 84), f(hy - 124)), 12, "#fff6f0", 0.85))
    hat += A.shape(rrect_d(hx - 92, hy - 70, 184, 30, 14), (hx - 92, hy - 70, 184, 30), CREAM, sw=4.6, hl=0.5)
    hat += A.ellipse(hx + 6, hy - 168, 24, 22, CREAM, sw=4.4, hl=0.6)
    o.append('<g transform="rotate(%d %s %s)">%s</g>' % (tilt, f(hx), f(hy - 60), hat))
    if pose == "oops":
        for k, (sx, sy) in enumerate(((hx - 110, hy - 150), (hx + 4, hy - 196), (hx + 116, hy - 146))):
            o.append(A.poly(star_pts(sx, sy, 20, 9, -90 + k * 20), GOLD, corners=tuple(range(0, 10, 2)), sw=3.6, hl=0.6))
    if pose == "run":
        o.append(A.ellipse(hx + 100, hy - 30, 9, 13, ("#ffffff", "#d6f0f7", "#a8dcef"), sw=3, hl=0.8))  # a little sweat drop
    return A.svg("".join(o))


# ------------------------------------------------------------------ pets (420 x 400, feet on y 392)
PETS = {
    "dog": {"fur": ("#fffaf2", "#f7ead8", "#e6d2b8"), "patch": ("#d9a878", "#a8703e", "#8f5e34"), "iris": ("#b88a64", "#5e3c24", "#2e1d12")},
    "cat": {"fur": ("#ffe2c0", "#f6a95c", "#df8f48"), "patch": ("#fff4e6", "#fde3c4", "#f0cfa6"), "iris": ("#c8e08a", "#6a9a2a", "#2e4412")},
    "dragon": {"fur": ("#d8f7e4", "#7dd6a6", "#62ba8c"), "patch": ("#f2e6ff", "#cdb4f2", "#b49ade"), "iris": ("#e0b8ff", "#7a4ab8", "#34205a")},
}


def pet_svg(kind, pose):
    P = PETS[kind]
    fur, patch, iris = P["fur"], P["patch"], P["iris"]
    A = Art(420, 400)
    o = [soft_shadow(A, 210, 390, 130, 12)]
    happy, eat, blink = pose == "happy", pose == "eat", pose == "blink"
    # tail behind
    if kind == "dog":
        tail = [(300, 300), (350, 250), (372, 196), (390, 210), (372, 270), (318, 320)] if happy else [(300, 310), (352, 300), (380, 270), (392, 284), (366, 322), (310, 336)]
        o.append(A.poly(tail, fur, corners=(2, 3), sw=5, hl=0.4))
    elif kind == "cat":
        tail = "M300 330 Q380 320 370 240 Q364 196 340 190" if not happy else "M300 330 Q390 300 360 200 Q350 168 324 176"
        o.append(line(tail, 40, INK) + line(tail, 31, fur[1]) + line(tail, 14, fur[0], 0.6))
        o.append(line("M352 236 l20 -6 M348 270 l24 0 M336 300 l20 8", 6, "#d0782e", 0.8))
    else:
        tail = [(300, 320), (360, 330), (396, 300), (404, 262), (384, 272), (370, 300), (316, 296)]
        o.append(A.poly(tail, fur, corners=(3,), sw=5, hl=0.4))
        o.append(A.poly([(398, 270), (418, 240), (414, 280)], patch, corners=(1,), sw=4))
    # dragon wings behind the body
    if kind == "dragon":
        for side, rot in ((-1, -10), (1, 10)):
            wx = 210 + side * 90
            o.append(A.poly([(210 + side * 40, 240), (wx + side * 60, 160), (wx + side * 30, 220), (wx + side * 70, 220), (wx + side * 20, 270), (210 + side * 40, 290)],
                            patch, corners=(1, 3), sw=4.6, hl=0.4, inner=line("M%d 250 L%d 180" % (210 + side * 50, wx + side * 50), 3, "#ffffff", 0.6)))
    # body (sitting)
    o.append(A.ellipse(210, 300, 104, 92, fur, sw=5.4, hl=0.5,
                       inner=A.ellipse(210, 318, 62, 66, patch if kind != "dog" else ("#ffffff", "#fffdf8", "#f0e6d8"), sw=0, outline=False, hl=0.3)))
    if kind == "dragon":
        o.append(line("M180 280 q30 10 60 0 M178 310 q32 10 64 0 M184 340 q26 8 52 0", 3.6, "#9a7ad0", 0.6))
    # back paws and front paws
    for x in (130, 290):
        o.append(A.ellipse(x, 372, 44, 24, fur, sw=5, hl=0.4))
    for x in (176, 244):
        o.append(A.ellipse(x, 368, 28, 26, fur, sw=5, hl=0.5, inner=line("M%d 378 l0 12 M%d 378 l0 12" % (x - 8, x + 8), 3, INK, 0.5)))
    if kind == "dog":
        o.append(line("M150 236 Q210 262 270 236", 16, INK) + line("M150 236 Q210 262 270 236", 10, "#e8506a"))
        o.append(A.ellipse(210, 262, 14, 14, GOLD, sw=4, hl=0.7))
    # head (lowered to eat)
    hx, hy = (210, 196) if not eat else (210, 240)
    head = []
    if kind == "dog":
        for side in (-1, 1):
            head.append(A.poly([(hx + side * 70, hy - 60), (hx + side * 112, hy - 40), (hx + side * 118, hy + 40), (hx + side * 92, hy + 64), (hx + side * 70, hy + 10)],
                               patch, corners=(1,), sw=5, hl=0.4))
    elif kind == "cat":
        for side in (-1, 1):
            head.append(A.poly([(hx + side * 40, hy - 70), (hx + side * 92, hy - 124), (hx + side * 100, hy - 40)], fur, corners=(1,), sw=5,
                               inner='<path d="M%s %s L%s %s L%s %s Z" fill="#ffc2cf"/>' % (f(hx + side * 56), f(hy - 70), f(hx + side * 86), f(hy - 106), f(hx + side * 90), f(hy - 56))))
    else:
        for side in (-1, 1):
            head.append(A.poly([(hx + side * 40, hy - 74), (hx + side * 58, hy - 120), (hx + side * 76, hy - 70)], ("#fff8e6", "#f3dfae", "#e0c48a"), corners=(1,), sw=4.6, hl=0.5))
            head.append(A.poly([(hx + side * 86, hy - 30), (hx + side * 130, hy - 50), (hx + side * 100, hy + 6)], patch, corners=(1,), sw=4.4, hl=0.4))
    head_in = blush(A, hx - 62, hy + 34, strong=happy) + blush(A, hx + 62, hy + 34, strong=happy)
    if kind == "dog":
        head_in += '<ellipse cx="%s" cy="%s" rx="40" ry="34" fill="%s" opacity=".9"/>' % (f(hx + 50), f(hy - 30), patch[1])
    if kind == "cat":
        head_in += line("M%s %s l0 26 M%s %s l0 20 M%s %s l0 20" % (f(hx), f(hy - 92), f(hx - 22), f(hy - 88), f(hx + 22), f(hy - 88)), 7, "#d0782e", 0.8)
    head.append(A.ellipse(hx, hy, 100, 88, fur, sw=5.4, hl=0.6, inner=head_in, hlpos=(0.32, 0.2)))
    # muzzle, eyes, nose, mouth
    head.append(A.ellipse(hx, hy + 36, 44, 30, ("#ffffff", "#fff8f0", "#f0e2d0") if kind != "dragon" else patch, sw=4.4, hl=0.5))
    em = "happy" if happy else ("calm" if (blink or eat) else "open")
    head.append(eye(A, hx - 42, hy - 6, em, kind == "cat", iris, rx=22, ry=27, side=-1))
    head.append(eye(A, hx + 42, hy - 6, em, kind == "cat", iris, rx=22, ry=27))
    nose_c = {"dog": "#3a2a2a", "cat": "#f58ea5", "dragon": "#4a8a6a"}[kind]
    if kind == "dragon":
        head.append('<circle cx="%s" cy="%s" r="5" fill="%s"/><circle cx="%s" cy="%s" r="5" fill="%s"/>' % (f(hx - 10), f(hy + 26), nose_c, f(hx + 10), f(hy + 26), nose_c))
    else:
        head.append('<ellipse cx="%s" cy="%s" rx="12" ry="9" fill="%s" stroke="%s" stroke-width="3"/>' % (f(hx), f(hy + 24), nose_c, INK))
    if happy or eat:
        head.append(mouth("knight", "open", hx, hy + 40))
    else:
        head.append(line("M%s %s q10 10 20 0 q10 10 20 0" % (f(hx - 20), f(hy + 40)), 4))
    if kind == "cat":
        head.append(line("M%s %s l-46 -6 M%s %s l-46 8 M%s %s l46 -6 M%s %s l46 8" % (f(hx - 40), f(hy + 34), f(hx - 40), f(hy + 42), f(hx + 40), f(hy + 34), f(hx + 40), f(hy + 42)), 3, INK, 0.6))
    o.append("".join(head))
    if happy:
        for x, y, s in ((90, 90, 0.9), (330, 70, 1.1)):
            o.append(A.shape(heart_d(x, y, s), (x - 30 * s, y - 30 * s, 60 * s, 60 * s), ("#ffd0dc", "#f27a98", "#d85a7a"), sw=3.8, hl=0.6))
    return A.svg("".join(o))


# ------------------------------------------------------------------ items
def pillow_svg():
    A = Art(200, 150)
    o = soft_shadow(A, 100, 138, 80, 8)
    d = "M20 30 Q100 6 180 30 Q196 75 180 120 Q100 142 20 120 Q4 75 20 30 Z"
    o += A.shape(d, (6, 10, 188, 130), ("#ffffff", "#eef4ff", "#cfdcf2"), sw=5, hl=0.7,
                 inner=line("M20 60 Q100 44 180 60 M20 92 Q100 76 180 92", 9, "#bcd2fb", 0.7))
    for x, y in ((20, 30), (180, 30), (180, 120), (20, 120)):
        o += A.ellipse(x, y, 10, 10, ("#ffffff", "#eef4ff", "#cfdcf2"), sw=3.6, hl=0.6)
    return A.svg(o)


def feather_svg():
    A = Art(80, 80)
    o = A.poly([(20, 70), (30, 40), (52, 14), (66, 10), (60, 30), (40, 58)], ("#ffffff", "#f8fbff", "#dfe8f6"), corners=(0, 3), sw=3.6, hl=0.6,
               inner=line("M24 66 Q40 40 62 14", 2.6, "#c8d4e8"))
    return A.svg(o)


def horn_svg():
    A = Art(260, 220)
    o = soft_shadow(A, 130, 206, 100, 10)
    o += A.shape("M30 120 Q100 110 170 60 L210 40 Q232 100 210 170 L170 150 Q100 120 30 140 Z", (30, 40, 202, 130), GOLD, sw=5.2, hl=0.7,
                 inner=line("M60 124 Q120 112 176 72", 5, "#fffbe6", 0.6))
    o += A.ellipse(210, 105, 26, 66, ("#fff4c4", "#e0a830", "#b8862e"), sw=5, hl=0.4, inner='<ellipse cx="214" cy="105" rx="14" ry="48" fill="#8a5e1e" opacity=".6"/>')
    o += A.shape(rrect_d(14, 116, 30, 30, 10), (14, 116, 30, 30), RED, sw=4.4, hl=0.5)
    o += line("M80 150 Q120 200 170 160", 8, INK) + line("M80 150 Q120 200 170 160", 4, "#e8506a")
    return A.svg(o)


def back_svg():
    """The big home button picture: a little map signpost pointing back (no words)."""
    A = Art(200, 200)
    o = soft_shadow(A, 100, 188, 60, 8)
    o += A.shape(rrect_d(90, 60, 20, 130, 8), (90, 60, 20, 130), WOOD, sw=4.4, hl=0.3)
    o += A.poly([(18, 84), (60, 40), (176, 40), (176, 128), (60, 128)], ("#c9f3c3", "#62c987", "#5aa97c"), corners=(1, 2, 3, 4), sw=5, hl=0.5)
    o += A.poly([(42, 84), (82, 56), (82, 72), (150, 72), (150, 96), (82, 96), (82, 112)], ("#ffffff", "#ffffff", "#e8f4e8"), corners=(), sw=3.6, hl=0)
    return A.svg(o)


def food_svg(kind):
    A = Art(180, 140)
    o = soft_shadow(A, 90, 130, 70, 8)
    if kind == "bone":
        o += A.shape("M44 56 Q20 30 40 24 Q60 18 60 44 L120 44 Q120 18 140 24 Q160 30 136 56 Q160 82 140 96 Q120 102 120 76 L60 76 Q60 102 40 96 Q20 82 44 56 Z",
                     (20, 18, 140, 84), CREAM, sw=5, hl=0.6)
    elif kind == "fish":
        o += A.poly([(30, 70), (70, 34), (120, 40), (140, 66), (170, 40), (162, 70), (170, 100), (140, 76), (120, 100), (70, 104)], ("#e0f2ff", "#8fc4ef", "#6aa4d4"),
                    corners=(4, 6), sw=5, hl=0.6, inner=line("M100 46 Q90 70 100 98", 4, "#ffffff", 0.6))
        o += '<circle cx="60" cy="62" r="7" fill="%s"/>' % INK
    else:  # strawberry for the baby dragon
        o += A.poly([(90, 124), (50, 80), (46, 50), (70, 34), (90, 40), (110, 34), (134, 50), (130, 80)], ("#ffb0bd", "#e8506a", "#c23d5a"), corners=(0,), sw=5, hl=0.7,
                    inner="".join('<ellipse cx="%d" cy="%d" rx="3" ry="4" fill="#ffe8a0"/>' % (x, y) for x, y in ((70, 60), (90, 70), (110, 60), (80, 90), (100, 90), (90, 108))))
        o += A.poly([(60, 40), (76, 18), (90, 34), (104, 16), (120, 40), (90, 48)], LEAF, corners=(1, 3), sw=4, hl=0.4)
    return A.svg(o)


def bowl_svg():
    A = Art(220, 120)
    o = soft_shadow(A, 110, 110, 96, 8)
    o += A.shape("M14 40 Q110 70 206 40 L186 100 Q110 120 34 100 Z", (14, 40, 192, 80), ("#d6e4ff", "#5b8cf2", "#5577cc"), sw=5, hl=0.5,
                 inner=A.poly(star_pts(110, 84, 14, 6), GOLD, corners=tuple(range(0, 10, 2)), sw=3, hl=0.6))
    o += A.ellipse(110, 40, 96, 18, ("#eef4ff", "#c6d8f6", "#a8bce0"), sw=4.4, hl=0.3, inner='<ellipse cx="110" cy="44" rx="80" ry="12" fill="#8a6a50" opacity=".5"/>')
    return A.svg(o)


def zzz_svg():
    A = Art(120, 120)
    o = ""
    for x, y, s in ((30, 96, 18), (62, 66, 24), (96, 32, 30)):
        d = "M%s %s L%s %s L%s %s L%s %s" % (f(x - s / 2), f(y - s / 2), f(x + s / 2), f(y - s / 2), f(x - s / 2), f(y + s / 2), f(x + s / 2), f(y + s / 2))
        o += line(d, s * 0.34 + 3, INK) + line(d, s * 0.34 - 1, "#cfe6ff")
    return A.svg(o)


def dummy_svg():
    """A soft straw training dummy with a sack face and a target on its tummy (it wobbles when bopped)."""
    A = Art(260, 420)
    o = soft_shadow(A, 130, 410, 90, 10)
    o += A.shape(rrect_d(120, 220, 20, 190, 8), (120, 220, 20, 190), WOOD, sw=4.6, hl=0.3)
    o += A.shape(rrect_d(110, 396, 40, 16, 6), (110, 396, 40, 16), BROWN, sw=4, hl=0.3)
    o += A.shape(rrect_d(20, 170, 220, 26, 12), (20, 170, 220, 26), WOOD, sw=4.6, hl=0.4)
    straw = ("#fbe9b0", "#e8c46a", "#cfa850")
    o += A.ellipse(130, 250, 80, 90, straw, sw=5.2, hl=0.5,
                   inner=A.ellipse(130, 256, 46, 46, ("#ffffff", "#ffffff", "#f0e6e6"), sw=4, hl=0) + A.ellipse(130, 256, 30, 30, RED, sw=0, outline=False, hl=0) +
                   A.ellipse(130, 256, 13, 13, ("#ffffff", "#ffffff", "#f0e6e6"), sw=0, outline=False, hl=0))
    for x in (14, 246):
        o += A.ellipse(x, 183, 20, 18, straw, sw=4.4, hl=0.5)
    o += A.ellipse(130, 110, 72, 70, ("#f4e0bc", "#e0c08e", "#c8a674"), sw=5.2, hl=0.5)
    for ex in (107, 153):  # two big sewn-on button eyes
        o += A.ellipse(ex, 104, 13, 13, ("#8fa9e6", "#5b8cf2", "#2d4a8a"), sw=4, hl=0.7)
        o += '<circle cx="%d" cy="101" r="2.5" fill="#fff"/><circle cx="%d" cy="107" r="2.5" fill="#fff"/>' % (ex - 4, ex + 4)
    o += line("M108 140 q22 14 44 0", 5)
    o += line("M70 70 l-12 -24 M90 50 l-4 -26 M170 50 l4 -26 M190 70 l12 -24", 6, "#d9b04a")
    return A.svg(o)


def defence_wall_svg():
    """The castle wall and a gate tower on the left of the defence field (the heroes stand in front of it)."""
    A = Art(520, 900)
    o = []
    merl = "".join(rrect_d(x, 300, 50, 54, 8) + " " for x in range(0, 500, 74))
    o.append(A.shape(merl, (0, 300, 500, 54), STONE, sw=5, hl=0.4))
    o.append(A.shape("M-10 346 L500 346 L500 900 L-10 900 Z", (-10, 346, 510, 554), STONE, sw=5.2, hl=0.35, inner=stones(0, 386, 500, 900)))
    o.append(A.shape(rrect_d(250, 160, 210, 760, 16), (250, 160, 210, 740), STONE_L, sw=5.4, hl=0.45, inner=stones(250, 200, 460, 900, w=60)))
    o.append(A.shape(rrect_d(236, 130, 238, 56, 14), (236, 130, 238, 56), STONE, sw=5, hl=0.4))
    o.append(A.poly([(226, 140), (290, 70), (355, 0), (420, 70), (484, 140)], BLUE_D, corners=(0, 2, 4), sw=5.4, hl=0.6))
    o.append(arched_window(A, 355, 260, 66, 96))
    o.append(A.poly([(310, 420), (400, 420), (400, 520), (355, 496), (310, 520)], BLUE, corners=(0, 1, 2, 3, 4), sw=5, hl=0.5))
    o.append(A.poly(star_pts(355, 458, 22, 9), GOLD, corners=tuple(range(0, 10, 2)), sw=3.6, hl=0.6))
    o.append(A.shape("M300 900 L300 700 Q300 620 355 620 Q410 620 410 700 L410 900 Z", (300, 620, 110, 280), WOOD, sw=5, hl=0.4,
                     inner="".join('<path d="M%d 620 L%d 900" stroke="#8a5e3b" stroke-width="4" opacity=".7"/>' % (x, x) for x in range(318, 410, 22))))
    o.append(A.poly([(0, 900), (20, 852), (40, 880), (60, 840), (84, 878), (110, 860), (130, 900)], GRASS, corners=(1, 3, 5), sw=4, hl=0.3))
    return A.svg("".join(o))


def yard_bg_svg():
    A = Art(1600, 900)
    o = ['<rect width="1600" height="900" fill="%s"/>' % A.lin([(0, "#dfe9f3"), (0.55, "#ecf1f2"), (1, "#f5efe2")], 0, 0, 0, 1)]
    o.append('<ellipse cx="1300" cy="130" rx="260" ry="150" fill="#fff6dc" opacity=".8" filter="%s"/>' % A.blur(40))
    o.append(dca.cloud(A, 300, 120, 1.1) + dca.cloud(A, 900, 80, 0.9, 0.85) + dca.cloud(A, 1450, 160, 1.0))
    o.append('<path d="M0 430 Q300 340 640 400 Q960 330 1280 390 Q1460 360 1600 380 L1600 900 L0 900 Z" fill="%s"/>' % A.lin([(0, "#cfe3c4"), (1, "#b7d6a8")], 0, 0, 0, 1))
    # the castle wall behind the yard, with two striped tents
    merl = "".join(rrect_d(x, 300, 50, 50, 8) + " " for x in range(0, 1600, 80))
    o.append(A.shape(merl, (0, 300, 1600, 50), STONE, sw=4, hl=0.4))
    o.append(A.shape("M-10 344 L1610 344 L1610 560 L-10 560 Z", (-10, 344, 1620, 216), STONE, sw=4.2, hl=0.3, inner=stones(0, 380, 1600, 560, w=90)))
    for cx, pal in ((260, RED), (1340, BLUE)):
        stripes = "".join('<path d="M%d 420 L%d 640" stroke="#ffffff" stroke-width="26" opacity=".75"/>' % (cx + dx, cx + dx * 1.6) for dx in (-80, 0, 80))
        o.append(A.poly([(cx - 170, 640), (cx - 120, 470), (cx, 390), (cx + 120, 470), (cx + 170, 640)], pal, corners=(0, 2, 4), sw=4.2, hl=0.4, inner=stripes))
        o.append(A.shape("M%d 640 L%d 520 Q%d 500 %d 520 L%d 640 Z" % (cx - 40, cx - 40, cx, cx + 40, cx + 40), (cx - 40, 500, 80, 140), ("#7a5a42", "#5a3b22", "#4a3020"), sw=4, hl=0))
        o.append(line("M%d 392 L%d 330" % (cx, cx), 6) + A.poly([(cx, 334), (cx + 54, 344), (cx, 360)], GOLD, corners=(0, 1, 2), sw=3.6, hl=0.5))
    # the sandy yard and a soft fence
    o.append('<path d="M0 600 L1600 600 L1600 900 L0 900 Z" fill="%s"/>' % A.lin([(0, "#a9d394"), (1, "#8cc47a")], 0, 0, 0, 1))
    o.append('<ellipse cx="800" cy="780" rx="760" ry="170" fill="%s"/>' % A.rad([(0, "#f0dcb4"), (0.75, "#e6cc9e"), (1, "#e6cc9e", 0)]))
    for x in range(30, 1600, 110):
        o.append(A.shape(rrect_d(x, 560, 20, 90, 6), (x, 560, 20, 90), WOOD, sw=3, hl=0.3))
    o.append(A.shape(rrect_d(0, 580, 1600, 16, 6), (0, 580, 1600, 16), WOOD, sw=3, hl=0.3))
    # a rack of soft foam swords and a basket of pillows
    o.append(A.shape(rrect_d(560, 560, 150, 20, 6), (560, 560, 150, 20), WOOD, sw=3.4, hl=0.3))
    for k, col in enumerate((BLUE, RED, GREEN)):
        x = 580 + k * 46
        o.append(A.shape(rrect_d(x, 470, 26, 120, 12), (x, 470, 26, 120), col, sw=3.6, hl=0.5))
        o.append(A.shape(rrect_d(x - 10, 580, 46, 12, 6), (x - 10, 580, 46, 12), GOLD, sw=3, hl=0.4))
    o.append(A.shape("M900 600 L1000 600 L990 650 L910 650 Z", (900, 600, 100, 50), ("#f2d39c", "#d29f5c", "#b88a50"), sw=3.6, hl=0.4))
    for k in range(3):
        o.append(A.ellipse(920 + k * 30, 590, 26, 18, ("#ffffff", "#eef4ff", "#cfdcf2"), sw=3.4, hl=0.5))
    for x, y, c in ((120, 820, "#f6a9bd"), (300, 870, "#ffe08a"), (1360, 840, "#f6a9bd"), (1500, 880, "#c9b6f2"), (80, 740, "#c9b6f2"), (1540, 760, "#ffe08a")):
        o.append(flower(A, x, y, c, 9))
    return A.svg("".join(o))


# ------------------------------------------------------------------ jobs, render, contact sheet
CHAR_SCALE = 0.6


def jobs():
    j = {}
    for s in ("round", "square", "tall"):
        j["tower_" + s] = (lambda s=s: tower_svg(s), 240, 890, 1)
    for s in ("stone", "gold"):
        j["keep_" + s] = (lambda s=s: keep_svg(s), 300, 780, 1)
    for s in ("stone", "windows"):
        j["walls_" + s] = (lambda s=s: walls_svg(s), 520, 510, 1)
    for s in ("wood", "drawbridge", "gold"):
        j["gate_" + s] = (lambda s=s: gate_svg(s), 240, 350, 1)
    j["bridge_down"] = (bridge_down_svg, 220, 170, 1)
    for c in ("red", "blue", "green", "gold"):
        j["flag_" + c] = (lambda c=c: flag_svg(c), 140, 180, 1)
        j["banner_" + c] = (lambda c=c: banner_svg(c), 120, 210, 1)
    j["moat_water"] = (lambda: moat_svg(False), 760, 220, 1)
    j["moat_ducks"] = (lambda: moat_svg(True), 760, 220, 1)
    j["garden_flowers"] = (lambda: garden_svg("flowers"), 230, 260, 1)
    j["garden_fountain"] = (lambda: garden_svg("fountain"), 230, 260, 1)
    j["castle_plot"] = (plot_svg, 1000, 340, 1)
    j["knight_wave"] = (lambda: dca.knight_svg("knight", "wave"), 462, 600, CHAR_SCALE)
    j["knight_blink"] = (with_calm_eyes(lambda: dca.knight_svg("knight", "idle")), 462, 600, CHAR_SCALE)
    for look in BUDDIES:
        for pose in ("idle", "wave", "cheer", "blink"):
            j["buddy_%s_%s" % (look, pose)] = (lambda l=look, p=pose: buddy_svg(l, p), 462, 600, CHAR_SCALE)
    j["pony_blink"] = (with_calm_eyes(lambda: dca.pony_svg("stand")), 700, 660, CHAR_SCALE)
    for pose in ("walk_a", "walk_b", "oops", "run", "sleepy", "wave"):
        j["goblin_" + pose] = (lambda p=pose: goblin_svg(p), 400, 460, CHAR_SCALE)
    for kind in PETS:
        for pose in ("sit", "happy", "eat", "blink"):
            j["pet_%s_%s" % (kind, pose)] = (lambda k=kind, p=pose: pet_svg(k, p), 420, 400, CHAR_SCALE)
    j["pillow"] = (pillow_svg, 200, 150, 1)
    j["feather"] = (feather_svg, 80, 80, 1)
    j["horn"] = (horn_svg, 260, 220, 1)
    j["go_back"] = (back_svg, 200, 200, 1)
    for k in ("bone", "fish", "berry"):
        j["food_" + k] = (lambda k=k: food_svg(k), 180, 140, 1)
    j["bowl"] = (bowl_svg, 220, 120, 1)
    j["zzz"] = (zzz_svg, 120, 120, 1)
    j["dummy"] = (dummy_svg, 260, 420, 1)
    j["defence_wall"] = (defence_wall_svg, 520, 900, 0.8)
    j["yard_background"] = (yard_bg_svg, 1600, 900, 1)
    return j


OPAQUE = {"yard_background"}


def save_png(png_bytes, path, opaque):
    im = Image.open(io.BytesIO(png_bytes))
    im = im.convert("RGB") if opaque else im.convert("RGBA")
    if not opaque:
        im.putalpha(im.getchannel("A").point(lambda v: 0 if v < 6 else v))
    buf = io.BytesIO()
    im.save(buf, "PNG", optimize=True)
    note = "full"
    if buf.tell() >= LIMIT:
        q = im.quantize(256, method=Image.Quantize.MEDIANCUT if opaque else Image.Quantize.FASTOCTREE, dither=Image.Dither.FLOYDSTEINBERG)
        buf = io.BytesIO()
        q.save(buf, "PNG", optimize=True)
        note = "256 colours"
    with open(path, "wb") as fh:
        fh.write(buf.getvalue())
    return buf.tell(), note


def render(names):
    all_jobs = jobs()
    results = {}
    with sync_playwright() as pw:
        br = pw.chromium.launch(args=["--mute-audio"])
        pg = br.new_page()
        for name in names:
            fn, w, h, s = all_jobs[name]
            svg = fn()
            with open(os.path.join(SRC_DIR, name + ".svg"), "w", encoding="utf-8") as fh:
                fh.write(svg)
            W, H = int(round(w * s)), int(round(h * s))
            svg = svg.replace('width="%d" height="%d"' % (w, h), 'width="%d" height="%d"' % (W, H), 1)
            pg.set_viewport_size({"width": W, "height": H})
            pg.set_content('<html><body style="margin:0;background:transparent">%s</body></html>' % svg)
            shot = pg.screenshot(omit_background=True, clip={"x": 0, "y": 0, "width": W, "height": H})
            results[name] = save_png(shot, os.path.join(OUT_DIR, name + ".png"), name in OPAQUE)
        br.close()
    return results


def contact_sheet(names):
    def load(n):
        p = os.path.join(OUT_DIR, n + ".png")
        if not os.path.exists(p):
            p = os.path.join(OLD_DIR, n + ".png")
        return Image.open(p).convert("RGBA") if os.path.exists(p) else None
    cell, cols = 220, 10
    tiles = [n for n in names if n not in ("yard_background", "castle_plot")]
    rows = math.ceil(len(tiles) / cols)
    comp_h = 640
    sheet = Image.new("RGBA", (cols * cell, rows * cell + comp_h + 20), (150, 150, 150, 255))
    for i, n in enumerate(tiles):
        im = load(n)
        if im is None:
            continue
        im.thumbnail((cell - 12, cell - 12))
        sheet.alpha_composite(im, (i % cols * cell + (cell - im.width) // 2, i // cols * cell + (cell - im.height) // 2))
    # a composed full castle (every slot filled) and the yard background
    y0 = rows * cell + 10
    canvas = Image.new("RGBA", (1000, 1300), (214, 228, 240, 255))
    def put(n, x, y, mirror=False):
        im = load(n)
        if im is None:
            return
        need = {"tower": (240, 890), "keep": (300, 780)}
        if mirror:
            im = im.transpose(Image.FLIP_LEFT_RIGHT)
        canvas.alpha_composite(im, (x, y))
    put("castle_plot", 0, 960)
    put("keep_stone", 350, 120)
    put("flag_gold", 500 - 30, 120 + KEEP_TIP["stone"] - 176)
    put("walls_windows", 240, 540)
    put("tower_round", 50, 160)
    put("tower_tall", 710, 160, True)
    put("flag_red", 170 - 30, 160 + TOWER_TIP["round"] - 176)
    put("flag_blue", 830 - 30, 160 + TOWER_TIP["tall"] - 176)
    put("banner_blue", 110, 640)
    put("banner_green", 770, 640)
    put("gate_drawbridge", 380, 700)
    put("moat_ducks", 120, 1035)
    put("bridge_down", 390, 1040)
    put("garden_flowers", 0, 1040)
    put("garden_fountain", 770, 1040, True)
    canvas.thumbnail((comp_h * 1000 // 1300, comp_h))
    sheet.alpha_composite(canvas, (10, y0))
    bg = load("yard_background")
    if bg is not None:
        bg.thumbnail((cols * cell - canvas.width - 30, comp_h))
        sheet.alpha_composite(bg, (canvas.width + 20, y0))
    sheet.convert("RGB").save(SHEET)
    sheet.convert("RGB").save(SHEET.replace(".png", ".jpg"), quality=82)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", default="")
    ap.add_argument("--sheet-only", action="store_true")
    a = ap.parse_args()
    names = list(jobs().keys())
    todo = [n for n in names if not a.only or any(n.startswith(k) for k in a.only.split(","))]
    if not a.sheet_only:
        res = render(todo)
        big = [n for n, (s, _) in res.items() if s >= LIMIT]
        for n, (s, note) in sorted(res.items()):
            print("%-28s %7d bytes  %s" % (n + ".png", s, note))
        if big:
            print("OVER 150 KB: %s" % ", ".join(big))
    have = sorted(n + ".png" for n in names if os.path.exists(os.path.join(OUT_DIR, n + ".png")))
    with open(os.path.join(OUT_DIR, "manifest.json"), "w", encoding="utf-8") as fh:
        json.dump({"files": have}, fh, indent=1)
    contact_sheet(names)
    print("manifest: %d files; sheet: %s" % (len(have), SHEET))


if __name__ == "__main__":
    main()
