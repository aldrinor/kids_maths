"""draw_castle_extra_art.py - draws the new pictures for Kennedy's two extra castle reward games.

  "Goblin Rescue" (game/rewards/castle_goblin_rescue.js): silly goblins have shut the buddy knight in a wooden
      cage. The knight bops each goblin with a soft foam sword, the goblin giggles and runs home, the knight opens
      the cage with the key and the buddy cheers.
  "Tower for Kitty" (game/rewards/castle_build_tower.js): a kitten is stuck up a tall tree. The knight builds a
      stone tower next to it, block by block, and the kitten hops down through the tower and cheers.

Same drawing system as draw_castle_art.py and draw_cafe_art.py (it imports their helpers), so the new pieces match:
soft gradient fills, a core shadow, a soft top-left highlight, glossy eyes and the warm dark-brown outline.
The games reuse knight_idle, knight_cheer, buddy_wave, apple_tree, path_far, path_mid, path_near, sparkle and heart
from art/castle/.

Canvases and anchors the game code relies on:
  knight_sword, knight_bop, knight_sword_cheer  620 x 600; the knight stands exactly as in knight_* (centre x 231,
                      feet on y 596); the extra width on the right holds the foam sword.
  buddy_cheer         462 x 600 (same box as buddy_wave).
  goblin_<a|b|c>_<silly|oops|run>  400 x 460, feet on y 452, centre x 200.
  cage_back, cage_front, cage_door  600 x 560, stacked in one box; floor at y 520; the door fills x 200..400,
                      y 140..520 and hinges on x 200. The buddy stands inside, centre x 300, feet on y 520.
  cage_lock 160 x 180 (the shackle top at y 20, the body centre at 80,112); it hangs on the door's low beam
                      (cage canvas 300,412 is the lock's body centre); cage_key 240 x 120 (bow on the left).
  tower_block_1..4    400 x 240; every block's body ends on y 200 and stacks 160 units above the one under it
                      (block 4 has battlements that rise to y 40). tower_base 440 x 100: the slab top is y 30.
  cart                520 x 320; the cart bed top is y 128, the wheels stand on y 308.
  kitten_<stuck|happy|hop>  300 x 300, paws on y 290, centre x 150.

Run:  python gh_site/tools/draw_castle_extra_art.py [--only name1,name2] [--sheet-only]
Writes SVG sources to 16_kids_maths/work_tmp/art_src/castle_extra/, PNGs to gh_site/game/rewards/art/castle_extra/,
art/castle_extra/manifest.json (only this folder; art/castle/manifest.json is left alone) and the contact sheet
work_tmp/art_src/castle_extra_contact_sheet.png. Every PNG must stay under 150 KB.
"""
import argparse
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
SRC_DIR = os.path.join(WORK_TMP, "art_src", "castle_extra")
OUT_DIR = os.path.join(SITE, "game", "rewards", "art", "castle_extra")
REUSE_DIR = os.path.join(SITE, "game", "rewards", "art", "castle")
SHEET = os.path.join(WORK_TMP, "art_src", "castle_extra_contact_sheet.png")
MAX_BYTES = 150 * 1024
os.makedirs(SRC_DIR, exist_ok=True)
os.makedirs(OUT_DIR, exist_ok=True)

from PIL import Image  # noqa: E402
from playwright.sync_api import sync_playwright  # noqa: E402

from draw_cafe_art import Art, INK, blush, ell_pts, eye, f, limb_pts, line, mouth, optimise, rot_pt, rrect_d, star_pts  # noqa: E402
from draw_castle_art import (  # noqa: E402  (the castle palettes and the knight)
    ARMS_K, same_colours, BLUE, BLUE_D, BROWN, GOLD, GREEN, KH, KW, LEAF, MAIL, SKIN, STEEL_D, STONE, WOOD, hand, knight_body, knight_svg,
    soft_shadow, stone_lines)

# ------------------------------------------------------------------ palettes (light, mid, shade-for-multiply)
GOB = ("#e2f5bf", "#a6d67f", "#8cbc6c")
GOB_IN = ("#ffe1e8", "#f7b6c6", "#e8a4b6")
GOB_IRIS = ("#f2d78a", "#a8741e", "#4e3410")
HATS = {"a": ("#ffc0b8", "#e8506a", "#c84860"), "b": ("#fff0b8", "#f3c650", "#d9a640"), "c": ("#e2d4fb", "#a98be6", "#9078cc")}
PILLOW = ("#fffaf2", "#f4e4f6", "#dcc6e6")
VEST = ("#d9b38a", "#a77b52", "#8e6644")
FOAM = ("#fff8d6", "#ffe48a", "#ecc65e")
FOAM_B = ("#d4e6ff", "#7fa8f0", "#6a8fd6")
KIT = ("#ffe8c4", "#f6b46e", "#e0985a")
KIT_IN = ("#ffe3ea", "#f9bccb", "#eeb0c0")
KIT_IRIS = ("#b8d88a", "#5c8a2c", "#2a4410")
CREAM = ("#fffaf0", "#fbecd3", "#ecd8bc")
DARK_WOOD = ("#c79a6c", "#8a5e3b", "#6e4a2e")
SW_W = 620  # the sword knight canvas width
# pictures the game swaps in one box get the same 256-colour treatment, so colours never shift between poses
SAME_COLOURS = ("knight_sword", "knight_bop")


# ------------------------------------------------------------------ the knight with a soft foam sword (620 x 600)
ARMS_K["sword"] = (((180, 352), (148, 410), (160, 466)), ((282, 352), (326, 404), (322, 452)))
ARMS_K["bop"] = (((180, 352), (148, 410), (160, 466)), ((282, 352), (346, 366), (396, 352)))


def foam_sword(A, hx, hy, deg, length):
    """A soft pool-noodle sword: a round blue guard and a fat yellow foam blade from the hand at deg (0 = right)."""
    out = ""
    blade = []
    w = 26
    for k in range(13):
        t = math.radians(-90 + k * 15)
        blade.append((length + 26 + w * math.cos(t), w * math.sin(t)))
    blade = [(46, w)] + [(46, -w)] + blade
    blade = blade[:2] + blade[2:]
    pts = [rot_pt((hx + x, hy + y), (hx, hy), deg) for x, y in blade]
    rings = ""
    for k in (0.35, 0.6, 0.85):
        a = rot_pt((hx + 46 + (length - 20) * k, hy - w + 4), (hx, hy), deg)
        b = rot_pt((hx + 46 + (length - 20) * k, hy + w - 4), (hx, hy), deg)
        rings += line("M%s %s L%s %s" % (f(a[0]), f(a[1]), f(b[0]), f(b[1])), 3.5, "#e8b84a", 0.7)
    out += A.poly(pts, FOAM, corners=(0, 1), sw=5, hl=0.7, inner=rings)
    g = rot_pt((hx + 40, hy), (hx, hy), deg)
    out += A.ellipse(g[0], g[1], 18, 46, FOAM_B, rot=deg, sw=5, hl=0.6)
    tip = rot_pt((hx + length + 30, hy), (hx, hy), deg)
    out += A.ellipse(tip[0], tip[1], 6, 6, ("#fffdf4", "#fff6d0", "#f0dca0"), sw=0, outline=False, hl=0)
    return out


def knight_sword_svg(pose):
    """pose: sword (holds the sword up beside him), bop (swings it forward), cheer (sword raised high)."""
    A = Art(SW_W, KH)
    if pose == "cheer":
        body = knight_body(A, "knight", "cheer")
        extra = foam_sword(A, 358, 226, -62, 170) + hand(A, 358, 232, SKIN)
        return A.svg('<g transform="translate(0 -14)">%s%s</g>' % (body, extra))
    body = knight_body(A, "knight", pose)
    if pose == "bop":
        extra = foam_sword(A, 396, 352, -8, 170) + hand(A, 396, 352, SKIN)
    else:
        extra = foam_sword(A, 322, 452, -58, 170) + hand(A, 322, 452, SKIN)
    return A.svg(body + extra)


# ------------------------------------------------------------------ the silly goblins (400 x 460, feet on y 452)
def goblin_svg(who, pose):
    """who: a (red cap), b (yellow cap), c (purple cap). pose: silly, oops, run."""
    A = Art(400, 460)
    hat = HATS[who]
    run = pose == "run"
    oops = pose == "oops"
    out = soft_shadow(A, 200, 448, 92, 10)
    g = ""
    # legs and shoes
    if run:
        legs = (((178, 392), (150, 418), (128, 430)), ((222, 392), (236, 424), (246, 446)))
    else:
        legs = (((176, 392), (172, 420), (168, 440)), ((224, 392), (228, 420), (232, 440)))
    for s, c, p in legs:
        g += A.poly(limb_pts(s, c, p, 20, 18), GOB, sw=5)
        g += A.ellipse(p[0] + (-8 if p[0] < 200 else 8), p[1] + 2, 30, 15, BROWN, sw=5, hl=0.4)
    # arms (behind the body when down, in front when up)
    if pose == "silly":
        arms = (((140, 318), (104, 300), (86, 262)), ((260, 318), (300, 300), (318, 262)))
    elif oops:
        arms = (((140, 318), (100, 282), (92, 226)), ((260, 318), (300, 282), (308, 226)))
    else:
        arms = (((140, 318), (100, 304), (76, 272)), ((260, 318), (296, 340), (322, 352)))
    arm_s = ""
    for s, c, p in arms:
        arm_s += A.poly(limb_pts(s, c, p, 18, 16), GOB, sw=5)
        arm_s += A.ellipse(p[0], p[1], 19, 18, GOB, sw=5, hl=0.5)
    # body with a little brown vest and a belt
    vest = ('<path d="M120 300 L170 300 L186 420 L110 420 Z M280 300 L230 300 L214 420 L290 420 Z" fill="%s" opacity=".95"/>' % VEST[1] +
            '<rect x="100" y="372" width="200" height="22" fill="%s"/>' % BROWN[1] +
            '<rect x="186" y="370" width="28" height="26" rx="6" fill="%s" stroke="%s" stroke-width="3.5"/>' % (GOLD[1], INK) +
            '<path d="M134 330 l10 6 M266 330 l-10 6" stroke="#fbe9cf" stroke-width="4" opacity=".6" stroke-linecap="round"/>')
    body = A.ellipse(200, 352, 84, 66, GOB, sw=5.2, hl=0.5, inner=vest)
    # the pillow: held up beside him (silly), dropped (oops: none), hugged under the arm (run)
    pillow = ""
    if pose == "silly":
        px, py = 330, 222
        pillow = A.shape(rrect_d(px - 54, py - 44, 108, 88, 34), (px - 54, py - 44, 108, 88), PILLOW, sw=5, hl=0.7,
                         inner=line("M%d %d Q%d %d %d %d" % (px - 40, py, px, py + 10, px + 40, py), 3, "#c9aedb", 0.7))
    elif run:
        px, py = 330, 344
        pillow = A.shape(rrect_d(px - 48, py - 38, 96, 76, 30), (px - 48, py - 38, 96, 76), PILLOW, sw=5, hl=0.7,
                         inner=line("M%d %d Q%d %d %d %d" % (px - 34, py, px, py + 9, px + 34, py), 3, "#c9aedb", 0.7))
    # ears, head, face
    ears = ""
    for side in (-1, 1):
        tip = (200 + side * 186, 150 if not oops else 132)
        pts = [(200 + side * 86, 172), tip, (200 + side * 92, 236)]
        inner_pts = "M%s %s L%s %s L%s %s Z" % (f(200 + side * 96), f(184), f(200 + side * 160), f(tip[1] + 12), f(200 + side * 98), f(222))
        ears += A.poly(pts, GOB, corners=(1,), sw=5, hl=0.4, inner='<path d="%s" fill="%s"/>' % (inner_pts, GOB_IN[1]))
    face = blush(A, 132, 236) + blush(A, 268, 236)
    head = A.ellipse(200, 204, 106, 92, GOB, sw=5.4, hl=0.6, inner=face, hlpos=(0.3, 0.2))
    if oops:
        eyes = eye(A, 160, 200, "happy", False, GOB_IRIS, rx=22, ry=26) + eye(A, 240, 200, "happy", False, GOB_IRIS, rx=22, ry=26)
        eyes = eyes.replace("Q", "Q", 1)
        mth = mouth("knight", "sip", 200, 246)
        brows = line("M136 160 Q156 146 178 156 M222 156 Q244 146 264 160", 5)
    else:
        look = 0.6 if run else 0.0
        eyes = eye(A, 160, 198, "happy" if run else "open", False, GOB_IRIS, rx=22, ry=27, look=look) + eye(A, 240, 198, "happy" if run else "open", False, GOB_IRIS, rx=22, ry=27, look=look)
        d = "M146 244 Q200 300 254 244 Q200 262 146 244 Z"
        mth = '<path d="%s" fill="#a8445a" stroke="%s" stroke-width="4.5" stroke-linejoin="round"/>' % (d, INK)
        mth += '<path d="M190 251 L192 266 L204 266 L206 251 Z" fill="#fffaf0" stroke="%s" stroke-width="3"/>' % INK
        if pose == "silly":
            mth += '<path d="M214 266 Q226 292 240 270 Q232 262 214 266 Z" fill="#f58ea5" stroke="%s" stroke-width="3.5"/>' % INK
        brows = line("M138 156 Q158 140 180 150 M220 150 Q242 140 262 156", 5)
    nose = A.ellipse(200, 228, 15, 11, ("#c8eaa0", "#8cc46a", "#76aa58"), sw=4, hl=0.7)
    # the floppy felt cap with a pompom
    capd = "M112 150 Q130 92 200 86 Q262 86 284 130 Q300 120 318 92 Q336 70 352 84 Q340 112 318 136 Q300 158 286 160 Q200 128 112 150 Z"
    cap = A.shape(capd, (112, 70, 240, 90), hat, sw=5, hl=0.55, inner=line("M120 146 Q200 120 284 152", 6, "#fff4f0", 0.45))
    cap += A.ellipse(352, 80, 20, 20, CREAM, sw=4.6, hl=0.6)
    head_all = ears + head + eyes + nose + mth + brows + cap
    tilt = -7 if run else (5 if oops else -3)
    if oops:
        feather = A.poly([(300, 120), (330, 92), (352, 98), (322, 128)], PILLOW, corners=(0, 2), sw=3.6, hl=0.5)
        feather += A.poly([(70, 150), (92, 118), (112, 124), (88, 156)], PILLOW, corners=(0, 2), sw=3.6, hl=0.5)
    else:
        feather = ""
    if pose == "silly":
        g += arm_s + body + '<g transform="rotate(%d 200 230)">%s</g>' % (tilt, head_all) + pillow + A.ellipse(318, 262, 19, 18, GOB, sw=5, hl=0.5)
    elif oops:
        g += body + '<g transform="rotate(%d 200 230)">%s</g>' % (tilt, head_all) + arm_s + feather
    else:
        g += arm_s + body + pillow + A.ellipse(322, 352, 19, 18, GOB, sw=5, hl=0.5) + '<g transform="rotate(%d 200 230)">%s</g>' % (tilt, head_all)
    lift = -6 if oops else 0
    return A.svg(out + '<g transform="translate(0 %d)">%s</g>' % (lift, g))


# ------------------------------------------------------------------ the wooden cage (600 x 560)
def bar(A, x, y0, y1, w=22, pal=WOOD):
    return A.shape(rrect_d(x - w / 2, y0, w, y1 - y0, w / 2), (x - w / 2, y0, w, y1 - y0), pal, sw=4.6, hl=0.5, shadow=(5, 6), sblur=5)


def cage_back_svg():
    A = Art(600, 560)
    out = soft_shadow(A, 300, 540, 290, 16)
    # the back bars (darker, behind the buddy) and the back beam
    for x in range(86, 520, 54):
        out += bar(A, x, 120, 512, 16, DARK_WOOD)
    out += A.shape(rrect_d(40, 130, 520, 22, 10), (40, 130, 520, 22), DARK_WOOD, sw=4.4, hl=0.3)
    # the floor: hay on planks
    out += A.shape("M30 500 L570 500 L570 534 Q300 546 30 534 Z", (30, 500, 540, 46), WOOD, sw=5, hl=0.4,
                   inner="".join('<path d="M%d 500 L%d 540" stroke="#8a5e3b" stroke-width="3" opacity=".5"/>' % (x, x) for x in range(90, 570, 70)))
    out += '<ellipse cx="300" cy="504" rx="230" ry="16" fill="#f3d888" opacity=".9"/>'
    return A.svg(out)


def cage_front_svg():
    A = Art(600, 560)
    out = ""
    # roof
    out += A.poly([(10, 128), (60, 60), (300, 28), (540, 60), (590, 128)], ("#c9d8f7", "#5b7fd0", "#4f6cb4"), corners=(0, 2, 4), sw=5.4, hl=0.6,
                  inner="".join('<path d="M0 %d L600 %d" stroke="#2d4a8a" stroke-width="3" opacity=".35"/>' % (y, y) for y in range(58, 130, 22)))
    out += A.poly(star_pts(300, 76, 22, 9), GOLD, corners=tuple(range(0, 10, 2)), sw=3.6, hl=0.6)
    # corner posts and beams
    for x in (52, 548):
        out += A.shape(rrect_d(x - 22, 112, 44, 428, 12), (x - 22, 112, 44, 428), WOOD, sw=5, hl=0.5)
    out += A.shape(rrect_d(30, 118, 540, 30, 12), (30, 118, 540, 30), WOOD, sw=5, hl=0.45)
    out += A.shape(rrect_d(30, 506, 540, 30, 12), (30, 506, 540, 30), WOOD, sw=5, hl=0.35)
    # front bars beside the door (the door itself is cage_door)
    for x in (104, 152, 448, 496):
        out += bar(A, x, 146, 508)
    # door posts
    for x in (196, 404):
        out += A.shape(rrect_d(x - 12, 140, 24, 372, 10), (x - 12, 140, 24, 372), DARK_WOOD, sw=4.6, hl=0.4)
    return A.svg(out)


def cage_door_svg():
    A = Art(600, 560)
    out = ""
    for x in (240, 360):  # two bars only, so the buddy's face shows between them
        out += bar(A, x, 150, 504, 20)
    out += A.shape(rrect_d(206, 150, 190, 26, 10), (206, 150, 190, 26), WOOD, sw=4.8, hl=0.45)
    out += A.shape(rrect_d(206, 400, 190, 24, 10), (206, 400, 190, 24), WOOD, sw=4.8, hl=0.4)
    out += A.shape(rrect_d(206, 482, 190, 26, 10), (206, 482, 190, 26), WOOD, sw=4.8, hl=0.35)
    # iron hinges on the left
    for y in (163, 495):
        out += A.shape(rrect_d(192, y - 10, 34, 20, 6), (192, y - 10, 34, 20), STEEL_D, sw=4, hl=0.5)
    return A.svg(out)


def lock_svg():
    A = Art(160, 180)
    out = line("M44 96 L44 58 Q44 22 80 22 Q116 22 116 58 L116 96", 26, INK) + line("M44 96 L44 58 Q44 22 80 22 Q116 22 116 58 L116 96", 17, "#c6d1de")
    out += line("M50 70 L50 58 Q52 34 74 30", 5, "#f4f7fb", 0.8)
    out += A.shape(rrect_d(20, 76, 120, 92, 24), (20, 76, 120, 92), GOLD, sw=5.2, hl=0.75)
    out += '<circle cx="80" cy="112" r="11" fill="%s"/><path d="M75 116 L72 140 L88 140 L85 116 Z" fill="%s"/>' % (INK, INK)
    return A.svg(out)


def key_svg():
    A = Art(240, 120)
    out = soft_shadow(A, 120, 106, 90, 7)
    out += A.shape("M96 50 L214 50 Q222 50 222 58 L222 64 Q222 72 214 72 L96 72 Z", (96, 50, 126, 22), GOLD, sw=5, hl=0.6)
    out += A.shape("M180 70 L180 96 L196 96 L196 70 Z M202 70 L202 88 L216 88 L216 70 Z", (180, 70, 36, 26), GOLD, sw=4.6, hl=0.4)
    out += A.ellipse(62, 61, 46, 44, GOLD, sw=5.4, hl=0.75,
                     inner='<circle cx="62" cy="61" r="17" fill="#8f6a12"/>')
    out += '<circle cx="62" cy="61" r="17" fill="none" stroke="%s" stroke-width="4"/>' % INK
    out += A.poly(star_pts(62, 61, 11, 5), ("#fff8d8", "#fff2b0", "#f3d878"), corners=tuple(range(0, 10, 2)), sw=0, outline=False, hl=0)
    return A.svg(out)


# ------------------------------------------------------------------ the tower pieces (400 x 240; bodies end on y 200)
def block_svg(k):
    A = Art(400, 240)
    out = soft_shadow(A, 200, 214, 180, 12, op=0.18)
    top = 90 if k == 4 else 40
    inner = stone_lines(30, top + 34, 370, 200, h=40, w=68)
    if k == 1:
        door = "M156 200 L156 132 Q156 94 200 94 Q244 94 244 132 L244 200 Z"
        inner += ('<path d="%s" fill="%s" stroke="%s" stroke-width="4.5"/>' % (door, "#9a6a40", INK) +
                  "".join('<path d="M%d 100 L%d 200" stroke="#6e4a2e" stroke-width="3" opacity=".6"/>' % (x, x) for x in (178, 200, 222)) +
                  '<circle cx="230" cy="152" r="6" fill="%s" stroke="%s" stroke-width="3"/>' % (GOLD[1], INK))
    elif k == 2:
        win = "M168 152 L168 104 Q168 70 200 70 Q232 70 232 104 L232 152 Z"
        inner += ('<path d="%s" fill="%s" stroke="%s" stroke-width="4.5"/>' % (win, "#ffe3a0", INK) +
                  line("M200 72 L200 152 M168 112 L232 112", 4, "#c99a62", 0.8) +
                  '<rect x="156" y="150" width="88" height="16" rx="6" fill="%s" stroke="%s" stroke-width="3.5"/>' % (WOOD[1], INK) +
                  "".join('<circle cx="%d" cy="146" r="8" fill="%s" stroke="%s" stroke-width="2.6"/>' % (x, c, INK) for x, c in ((176, "#f6a9bd"), (200, "#ffe08a"), (224, "#f6a9bd"))))
    elif k == 3:
        inner += ""
    body = rrect_d(30, top, 340, 200 - top, 10)
    out += A.shape(body, (30, top, 340, 200 - top), STONE, sw=5.2, hl=0.45, inner=inner)
    if k == 3:
        out += A.poly([(150, 62), (250, 62), (250, 168), (200, 148), (150, 168)], BLUE, corners=(0, 1, 2, 3, 4), sw=5, hl=0.5)
        out += A.poly(star_pts(200, 104, 24, 10), GOLD, corners=tuple(range(0, 10, 2)), sw=3.6, hl=0.6)
    if k == 4:
        for x in (30, 122, 214, 306):
            out += A.shape(rrect_d(x, 40, 64, 62, 8), (x, 40, 64, 62), STONE, sw=5, hl=0.5)
        out += A.shape(rrect_d(22, 92, 356, 20, 8), (22, 92, 356, 20), ("#eef1f5", "#c3cbd6", "#a2acba"), sw=4.6, hl=0.4)
    return A.svg(out)


def tower_base_svg():
    A = Art(440, 100)
    out = soft_shadow(A, 220, 82, 210, 12, op=0.2)
    out += A.shape(rrect_d(14, 30, 412, 48, 14), (14, 30, 412, 48), ("#eef1f5", "#c3cbd6", "#a2acba"), sw=5, hl=0.5,
                   inner=stone_lines(14, 54, 426, 78, h=24, w=80))
    return A.svg(out)


def cart_svg():
    A = Art(520, 320)
    out = soft_shadow(A, 270, 306, 230, 12)
    out += line("M60 196 L4 236", 18, INK) + line("M60 196 L4 236", 11, WOOD[1])
    out += A.shape(rrect_d(40, 128, 450, 90, 16), (40, 128, 450, 90), WOOD, sw=5.4, hl=0.45,
                   inner="".join('<path d="M40 %d L490 %d" stroke="#8a5e3b" stroke-width="3.5" opacity=".55"/>' % (y, y) for y in (158, 188)))
    out += A.shape(rrect_d(30, 118, 470, 20, 8), (30, 118, 470, 20), DARK_WOOD, sw=4.6, hl=0.35)
    for x in (140, 400):
        spokes = "".join(line("M%d %d L%s %s" % (x, 250, f(x + 44 * math.cos(math.radians(a))), f(250 + 44 * math.sin(math.radians(a)))), 6, "#8a5e3b", 0.9) for a in range(0, 360, 45))
        out += A.ellipse(x, 250, 58, 58, DARK_WOOD, sw=5.4, hl=0.4, inner='<circle cx="%d" cy="250" r="42" fill="%s"/>' % (x, WOOD[0]) + spokes)
        out += A.ellipse(x, 250, 14, 14, GOLD, sw=4, hl=0.6)
    return A.svg(out)


# ------------------------------------------------------------------ the kitten (300 x 300, paws on y 290)
def kitten_svg(pose):
    """pose: stuck (worried, mewing), happy (cheering, paws up), hop (leaping, legs stretched)."""
    A = Art(300, 300)
    happy = pose != "stuck"
    out = soft_shadow(A, 150, 288, 74, 7) if pose != "hop" else ""
    g = ""
    # tail
    if happy:
        g += A.poly(limb_pts((206, 250), (262, 236), (250, 156), 15, 13), KIT, sw=5, inner=line("M244 214 l14 4 M250 190 l14 0", 4, "#d9864a", 0.8))
    else:
        g += A.poly(limb_pts((206, 262), (268, 270), (262, 220), 15, 13), KIT, sw=5, inner=line("M252 262 l4 -12", 4, "#d9864a", 0.8))
    # body
    stripes = line("M110 190 q14 -6 22 4 M168 186 q14 -6 22 6 M140 182 l0 16", 5, "#e08d4e", 0.7)
    belly = '<ellipse cx="150" cy="248" rx="38" ry="34" fill="%s"/>' % CREAM[1]
    if pose == "hop":
        g += A.ellipse(150, 222, 82, 50, KIT, rot=-8, sw=5.2, hl=0.5, inner=stripes + belly)
        for s, c, p in (((104, 240), (78, 262), (62, 278)), ((196, 236), (226, 252), (246, 262))):
            g += A.poly(limb_pts(s, c, p, 15, 13), KIT, sw=5)
            g += A.ellipse(p[0], p[1], 16, 12, CREAM, sw=4.4, hl=0.4)
    else:
        g += A.ellipse(150, 226, 72, 62, KIT, sw=5.2, hl=0.5, inner=stripes + belly)
        g += A.ellipse(122, 282, 22, 14, CREAM, sw=4.6, hl=0.4) + A.ellipse(178, 282, 22, 14, CREAM, sw=4.6, hl=0.4)
    # ears
    for side in (-1, 1):
        pts = [(150 + side * 40, 78), (150 + side * 78, 26 if happy else 40), (150 + side * 82, 104)]
        g += A.poly(pts, KIT, corners=(1,), sw=5, inner='<path d="M%s 88 L%s %s L%s 102 Z" fill="%s"/>' % (
            f(150 + side * 50), f(150 + side * 74), 46 if happy else 58, f(150 + side * 76), KIT_IN[1]))
    face = blush(A, 96, 150) + blush(A, 204, 150) + line("M130 64 l4 18 M150 60 l0 18 M170 64 l-4 18", 5, "#e08d4e", 0.75)
    g += A.ellipse(150, 126, 90, 74, KIT, sw=5.4, hl=0.6, inner=face, hlpos=(0.3, 0.2))
    emode = "happy" if happy else "open"
    g += eye(A, 116, 122, emode, False, KIT_IRIS, rx=19, ry=23) + eye(A, 184, 122, emode, False, KIT_IRIS, rx=19, ry=23)
    if not happy:
        g += line("M96 92 Q110 86 126 94 M174 94 Q190 86 204 92", 4.5)
    g += '<path d="M142 144 Q150 140 158 144 Q156 152 150 154 Q144 152 142 144 Z" fill="#f59ab0" stroke="%s" stroke-width="3"/>' % INK
    if happy:
        g += mouth("knight", "open", 150, 154).replace("rx=\"11\"", "rx=\"8\"")
    else:
        g += mouth("knight", "sip", 150, 156)
    g += line("M64 144 L104 150 M62 162 L102 160 M236 144 L196 150 M238 162 L198 160", 3, INK, 0.55)
    # front paws: up when cheering, tucked when stuck
    if pose == "happy":
        for x, rx in ((92, -1), (208, 1)):
            g += A.poly(limb_pts((150 + rx * 40, 200), (150 + rx * 70, 186), (150 + rx * 80, 150), 14, 13), KIT, sw=5)
            g += A.ellipse(150 + rx * 80, 146, 17, 15, CREAM, sw=4.4, hl=0.5)
    elif pose == "stuck":
        g += A.ellipse(128, 232, 18, 14, CREAM, sw=4.4, hl=0.4) + A.ellipse(172, 232, 18, 14, CREAM, sw=4.4, hl=0.4)
    rot = -10 if pose == "hop" else 0
    return A.svg(out + '<g transform="rotate(%d 150 200)">%s</g>' % (rot, g))


# ------------------------------------------------------------------ jobs, render, contact sheet
def jobs():
    j = {}
    for pose in ("sword", "bop", "cheer"):
        j["knight_sword" if pose == "sword" else ("knight_bop" if pose == "bop" else "knight_sword_cheer")] = (lambda p=pose: knight_sword_svg(p), SW_W, KH)
    j["buddy_cheer"] = (lambda: knight_svg("buddy", "cheer"), KW, KH)
    for who in ("a", "b", "c"):
        for pose in ("silly", "oops", "run"):
            j["goblin_%s_%s" % (who, pose)] = (lambda w=who, p=pose: goblin_svg(w, p), 400, 460)
    j["cage_back"] = (cage_back_svg, 600, 560)
    j["cage_front"] = (cage_front_svg, 600, 560)
    j["cage_door"] = (cage_door_svg, 600, 560)
    j["cage_lock"] = (lock_svg, 160, 180)
    j["cage_key"] = (key_svg, 240, 120)
    for k in (1, 2, 3, 4):
        j["tower_block_%d" % k] = (lambda k=k: block_svg(k), 400, 240)
    j["tower_base"] = (tower_base_svg, 440, 100)
    j["cart"] = (cart_svg, 520, 320)
    for pose in ("stuck", "happy", "hop"):
        j["kitten_" + pose] = (lambda p=pose: kitten_svg(p), 300, 300)
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
            out = os.path.join(OUT_DIR, name + ".png")
            results[name] = optimise(shot, out, False)
            if name.startswith(SAME_COLOURS) and results[name][1] == "full":
                results[name] = same_colours(out)
        br.close()
    return results


def load(name):
    for d in (OUT_DIR, REUSE_DIR):
        p = os.path.join(d, name + ".png")
        if os.path.exists(p):
            return Image.open(p).convert("RGBA")
    return None


def contact_sheet(names):
    """Every new picture on a grey sheet, then composed checks: the buddy in the cage (shut, then open with the
    lock), the full tower on its base, a block on the cart, the kitten on the tree, the knight beside a goblin."""
    cell, cols = 260, 8
    rows = math.ceil(len(names) / cols)
    sheet = Image.new("RGBA", (cols * cell, rows * cell + 460), (150, 150, 150, 255))
    for i, n in enumerate(names):
        im = load(n)
        if im is None:
            continue
        im.thumbnail((cell - 16, cell - 16))
        sheet.alpha_composite(im, (i % cols * cell + (cell - im.width) // 2, i // cols * cell + (cell - im.height) // 2))
    y = rows * cell + 10
    x = 10
    # the cage with the buddy inside, shut and locked
    cage = Image.new("RGBA", (600, 560), (0, 0, 0, 0))
    cage.alpha_composite(load("cage_back"))
    buddy = load("buddy_wave")
    if buddy is not None:
        b = buddy.resize((int(462 * 0.66), int(600 * 0.66)))
        cage.alpha_composite(b, (300 - b.width // 2, 520 - int(596 * 0.66)))
    cage.alpha_composite(load("cage_front"))
    cage.alpha_composite(load("cage_door"))
    cage.alpha_composite(load("cage_lock"), (300 - 80, 412 - 112))
    cage.thumbnail((440, 420))
    sheet.alpha_composite(cage, (x, y + 420 - cage.height))
    x += cage.width + 16
    # the tower: base and 4 blocks
    tw = Image.new("RGBA", (440, 100 + 160 * 3 + 240), (0, 0, 0, 0))
    base_y = tw.height - 100
    tw.alpha_composite(load("tower_base"), (0, base_y))
    for k in range(1, 5):
        tw.alpha_composite(load("tower_block_%d" % k), (20, base_y + 30 - 200 - 160 * (k - 1)))
    tw.thumbnail((300, 420))
    sheet.alpha_composite(tw, (x, y + 420 - tw.height))
    x += tw.width + 16
    # a block on the cart
    ct = Image.new("RGBA", (520, 320 + 120), (0, 0, 0, 0))
    ct.alpha_composite(load("cart"), (0, 120))
    blk = load("tower_block_1").resize((280, 168))
    ct.alpha_composite(blk, (130, 120 + 128 - int(200 * 0.7)))
    ct.thumbnail((300, 300))
    sheet.alpha_composite(ct, (x, y + 420 - ct.height))
    x += ct.width + 16
    # the knight bopping a goblin
    kb = Image.new("RGBA", (980, 600), (0, 0, 0, 0))
    kb.alpha_composite(load("knight_bop"), (0, 0))
    gob = load("goblin_a_oops").resize((340, 391))
    kb.alpha_composite(gob, (560, 600 - 391))
    kb.thumbnail((420, 300))
    sheet.alpha_composite(kb, (x, y + 420 - kb.height))
    x += kb.width + 16
    # the kitten on the tree
    tr = load("apple_tree")
    if tr is not None:
        kt = load("kitten_stuck").resize((200, 200))
        tr.alpha_composite(kt, (200, 0))
        tr.thumbnail((300, 400))
        if x + tr.width < sheet.width:
            sheet.alpha_composite(tr, (x, y + 420 - tr.height))
    sheet.convert("RGB").save(SHEET, quality=90)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", default="")
    ap.add_argument("--sheet-only", action="store_true")
    a = ap.parse_args()
    names = list(jobs().keys())
    todo = [n for n in names if not a.only or any(n.startswith(k) for k in a.only.split(","))]
    if not a.sheet_only:
        res = render(todo)
        big = [n for n, (s, _) in res.items() if s >= MAX_BYTES]
        for n, (s, note) in sorted(res.items()):
            print("%-24s %7d bytes  %s" % (n + ".png", s, note))
        if big:
            print("OVER 150 KB: %s" % ", ".join(big))
            return 1
    have = sorted(n + ".png" for n in names if os.path.exists(os.path.join(OUT_DIR, n + ".png")))
    with open(os.path.join(OUT_DIR, "manifest.json"), "w", encoding="utf-8") as fh:
        json.dump({"files": have}, fh, indent=1)
    contact_sheet(names)
    print("manifest: %d files; sheet: %s" % (len(have), SHEET))
    return 0


if __name__ == "__main__":
    sys.exit(main())
