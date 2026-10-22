"""draw_castle_scene_art.py - draws the pictures of Kennedy's castle "question scene".

The question scene is a calm animated strip at the top of the maths-question screen: the knight walks on a
journey, guards sheep, carries apples for the pony, helps villagers, gathers coins and gently bops silly goblins
with a foam sword (they run off or turn friendly).

Same drawing system as draw_castle_art.py, draw_castle_extra_art.py and draw_castle_world_art.py (it imports
their helpers): soft gradient fills, a core shadow, a soft top-left highlight, glossy eyes, blush and the warm
dark-brown outline. The knight's new poses are drawn by the very same knight_body() code (same helmet, plume,
blue tunic with the gold star, red cape, face and proportions); only the arms, legs and the eye direction change.

Pictures that already exist are NOT drawn again; the scene reuses them (see REUSE below and the contact sheet).

Scale and boxes (canvas units; every character is rendered at CHAR_SCALE = 5/6, so 600 units = 500 px):
  knight_walk_a/_b, knight_carry_basket, knight_carry_sack, knight_point   462 x 600 units (385 x 500 px):
      the same box as knight_idle / knight_cheer (rewards/art/castle, 462 x 600 px) and knight_wave
      (world/art/castle, 277 x 360 px): centre x 231, feet on y 596. Show every knight picture at the same
      on-screen height and they line up exactly.
  knight_bop_raise  620 x 600 units (517 x 500 px): the same box as knight_bop (rewards/art/castle_extra).
  villager_<child|grandma|farmer>_<stand|wave>  462 x 600 units (same box as the knight; feet y 596).
      The child is drawn smaller inside the box, so she stands shorter than the knight at the same scale.
  sheep_stand, sheep_graze  600 x 460 units, rendered 500 px tall (652 x 500), hooves on y 452, face RIGHT.
  lamb  440 x 340 units, rendered 500 px tall (647 x 500), hooves on y 332, faces RIGHT.
  (Every character PNG is 500 px tall, so pixel size does NOT give true size: use the units.)
  To keep true sizes: on-screen height = canvas units x (knight on-screen height / 600).
  Items are rendered at 1:1 (their own canvases, 200..400 px tall, a soft shadow at the bottom).
  backdrop_meadow, backdrop_village  1600 x 400, opaque. The ground path the characters walk on runs from
      y 300 to y 370; the middle (x 420..1180) is kept calm and empty.

Run:  python gh_site/tools/draw_castle_scene_art.py [--only name1,name2] [--sheet-only]
Writes SVG sources to 16_kids_maths/work_tmp/art_src/castle_scene/, PNGs to gh_site/game/scene/art/castle/,
art/castle/manifest.json there, and the contact sheet work_tmp/art_src/castle_scene_contact_sheet.png.
Every PNG stays under 150 KB.
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
SRC_DIR = os.path.join(WORK_TMP, "art_src", "castle_scene")
OUT_DIR = os.path.join(SITE, "game", "scene", "art", "castle")
SHEET = os.path.join(WORK_TMP, "art_src", "castle_scene_contact_sheet.png")
LIMIT = 150 * 1000
for d in (SRC_DIR, OUT_DIR):
    os.makedirs(d, exist_ok=True)

from PIL import Image, ImageDraw, ImageFont  # noqa: E402
from playwright.sync_api import sync_playwright  # noqa: E402

import draw_castle_art as dca  # noqa: E402  (palettes, the knight, soft_shadow, cloud, round_tree)
import draw_castle_extra_art as dce  # noqa: E402  (the foam sword; importing it also adds its arm poses)
from draw_cafe_art import (  # noqa: E402  (the shared drawing system)
    Art, INK, blush, eye, f, heart_d, limb_pts, line, mouth, rrect_d, star_pts, wool_pts)

BLUE, BLUE_D, RED, GOLD, GREEN = dca.BLUE, dca.BLUE_D, dca.RED, dca.GOLD, dca.GREEN
WOOD, BROWN, LEAF, SKIN, APPLE = dca.WOOD, dca.BROWN, dca.LEAF, dca.SKIN, dca.APPLE
DARK_WOOD = dce.DARK_WOOD
GRASS = ("#c9eeb3", "#86c47a", "#6aa86c")
CREAM = ("#fffaf0", "#f6e7cc", "#e8d2ae")
BASKET = dca.BASKET
BURLAP = ("#f6e2bc", "#d9b47e", "#c29a62")
WOOL = ("#ffffff", "#f7f3ef", "#e0d6d0")
SHEEP_FACE = ("#fff3f1", "#fbdcd8", "#eec4c0")
SHEEP_LEG = ("#f7ecec", "#e2cfd0", "#cdb7b9")
SHEEP_HOOF = ("#c9b0a8", "#9a7f76", "#866b62")
SHEEP_IRIS = ("#b0907a", "#5a4032", "#2a1c14")
COIN_EDGE = ("#f6d77a", "#d9a640", "#b8862e")
CHAR_SCALE = 5 / 6
KW, KH = dca.KW, dca.KH

# pictures the scene reuses from the other art folders (path from gh_site/game/)
REUSE = {
    "knight stand": "rewards/art/castle/knight_idle.png",
    "knight cheer": "rewards/art/castle/knight_cheer.png",
    "knight wave": "world/art/castle/knight_wave.png",
    "knight blink": "world/art/castle/knight_blink.png",
    "knight bop (the hit)": "rewards/art/castle_extra/knight_bop.png",
    "knight with sword": "rewards/art/castle_extra/knight_sword.png",
    "pony stand / walk / eat / happy": "rewards/art/castle/pony_stand.png, pony_walk_a.png, pony_walk_b.png, pony_eat.png, pony_happy.png",
    "goblin stand": "world/art/castle/goblin_walk_a.png (and goblin_walk_b.png to walk)",
    "goblin bopped (stars)": "world/art/castle/goblin_oops.png",
    "goblin running away": "world/art/castle/goblin_run.png",
    "goblin turns friendly": "world/art/castle/goblin_wave.png",
    "apple (single)": "rewards/art/castle/apple_1.png",
    "cart": "rewards/art/castle_extra/cart.png",
    "small castle gate": "world/art/castle/gate_wood.png",
    "flag": "world/art/castle/flag_blue.png (also flag_red, flag_green, flag_gold)",
    "pillow": "world/art/castle/pillow.png",
    "sparkle / heart": "rewards/art/castle/sparkle.png, heart.png",
}


def soft_shadow(A, cx, cy, rx, ry, op=0.24):
    return dca.soft_shadow(A, cx, cy, rx, ry, op)


# ------------------------------------------------------------------ the knight's new poses (exact knight_body code)
dca.ARMS_K["carry"] = (((180, 352), (136, 412), (152, 462)), ((282, 352), (326, 412), (310, 462)))
dca.ARMS_K["point"] = (((180, 352), (148, 410), (160, 466)), ((282, 352), (330, 352), (382, 336)))
# walking to the right: (leg start x) -> (start, knee, foot, boot lift); the boot always points right
WALK = {
    "walk_a": {206: ((206, 520), (180, 546), (166, 566), 0), 256: ((256, 520), (290, 536), (306, 552), -14)},
    "walk_b": {206: ((206, 520), (202, 548), (198, 566), 0), 256: ((256, 520), (268, 540), (272, 556), -16)},
}


class KnightTweak:
    """Runs knight_body() with walking legs and/or eyes that look to the right, then puts everything back."""

    def __init__(self, walk=None, look=None):
        self.walk, self.look = walk, look

    def __enter__(self):
        self.saved = (dca.limb_pts, dca.boot, dca.eye)
        old_limb, old_boot, old_eye = self.saved
        legs = WALK.get(self.walk)
        if legs:
            def limb(s, c, p, r1, r2, n=10):
                # knight_body's two legs start on (206, 520) and (256, 520) with r1 23: swap in the walking leg
                if s in ((206, 520), (256, 520)) and r1 == 23:
                    s2, c2, p2, _ = legs[s[0]]
                    return old_limb(s2, c2, p2, r1, r2, n)
                return old_limb(s, c, p, r1, r2, n)

            def boot(A, x, toe):
                # knight_body passes the standing foot x (201 / 261): use this pose's foot, lift and a right toe
                src = {201: legs[206], 261: legs[256]}[int(round(x))]
                return '<g transform="translate(0 %d)">%s</g>' % (src[3], old_boot(A, src[2][0], 1))
            dca.limb_pts, dca.boot = limb, boot
        if self.look is not None:
            fixed = self.look

            def eye_look(A, cx, cy, mode, lash, iris, rx=26, ry=32, look=0.0, side=1):
                return old_eye(A, cx, cy, mode, lash, iris, rx=rx, ry=ry, look=fixed, side=side)
            dca.eye = eye_look
        return self

    def __exit__(self, *a):
        dca.limb_pts, dca.boot, dca.eye = self.saved


def knight_walk_svg(frame):
    A = Art(KW, KH)
    with KnightTweak(walk=frame, look=0.8):
        body = dca.knight_body(A, "knight", "idle")
    return A.svg(body)


def carry_basket(A):
    """A woven basket full of red apples, held in front of the tummy (rim on y 466)."""
    o = ""
    for x, y, s in ((186, 452, 0.42), (232, 444, 0.46), (278, 452, 0.42), (208, 462, 0.4), (256, 462, 0.4)):
        o += apple_g(A, x, y, s, leaf=(x == 232))
    weave = "".join('<ellipse cx="%d" cy="%d" rx="13" ry="8" fill="#e9bf80" stroke="#a87444" stroke-width="2.4"/>' % (x + (13 if r % 2 else 0), 494 + r * 20)
                    for r in range(3) for x in range(150, 320, 26))
    o += A.shape("M140 470 Q231 490 322 470 L306 540 Q296 556 276 558 L186 558 Q166 556 156 540 Z", (140, 470, 182, 88), BASKET, sw=5, hl=0.35, inner=weave)
    o += A.shape("M134 466 Q231 492 328 466 Q332 476 324 484 Q231 510 138 484 Q130 476 134 466 Z", (130, 466, 202, 44), ("#f8e2b8", "#ddb06c", "#c69a5c"), sw=4.6, hl=0.5)
    return o


def carry_sack(A):
    """A round sack of gold coins, held in front of the tummy, two coins peeking out of the top."""
    o = coin_g(A, 214, 418, 0.24) + coin_g(A, 246, 412, 0.24)
    d = "M196 440 Q150 452 146 500 Q142 556 231 560 Q320 556 316 500 Q312 452 266 440 Q248 452 231 452 Q214 452 196 440 Z"
    o += A.shape(d, (142, 440, 174, 120), BURLAP, sw=5, hl=0.5,
                 inner=line("M170 470 Q180 520 200 548 M290 470 Q284 520 264 548", 3.4, "#b88e58", 0.5))
    o += A.shape(rrect_d(190, 436, 82, 20, 9), (190, 436, 82, 20), RED, sw=4.4, hl=0.5)
    o += A.poly(star_pts(231, 506, 24, 10), GOLD, corners=tuple(range(0, 10, 2)), sw=3.6, hl=0.6)
    return o


def knight_carry_svg(what):
    A = Art(KW, KH)
    with KnightTweak(look=0.0):
        body = dca.knight_body(A, "knight", "carry")
    load = carry_basket(A) if what == "basket" else carry_sack(A)
    hands = dca.hand(A, 152, 462, SKIN) + dca.hand(A, 310, 462, SKIN)
    return A.svg(body + load + hands)


def knight_point_svg():
    A = Art(KW, KH)
    with KnightTweak(look=0.9):
        body = dca.knight_body(A, "knight", "point")
    # the pointing finger on the right hand (drawn over the fist)
    finger = A.ellipse(410, 331, 20, 10, SKIN, rot=-8, sw=4.4, hl=0.4)
    return A.svg(body + finger + dca.hand(A, 382, 336, SKIN))


def knight_bop_raise_svg():
    """The wind-up before the bop: the foam sword lifted high, a friendly open smile (same box as knight_bop)."""
    A = Art(dce.SW_W, KH)
    body = dca.knight_body(A, "knight", "wave")
    extra = dce.foam_sword(A, 356, 232, -72, 150) + dca.hand(A, 356, 232, SKIN)
    return A.svg(body + extra)


# ------------------------------------------------------------------ villagers (462 x 600, feet on y 596)
VILLAGERS = {
    # skin, hair, top (sleeves / dress), bottom, iris
    "child": {"skin": ("#fff3e6", "#ffdcc0", "#efc3a6"), "hair": ("#e6b48a", "#a8683e", "#8f5634"),
              "top": ("#ffd0c8", "#f48a7a", "#de7466"), "bottom": ("#ffd0c8", "#f48a7a", "#de7466"), "iris": ("#c09060", "#6a4224", "#2e1d12")},
    "grandma": {"skin": ("#fbe6cf", "#eac29a", "#dcb08c"), "hair": ("#ffffff", "#e6e8ee", "#c8ccd6"),
                "top": ("#ffd6e2", "#f29ab4", "#dc86a0"), "bottom": ("#e8dcff", "#a990e0", "#9480cc"), "iris": ("#a08a74", "#56402e", "#2a1c14")},
    "farmer": {"skin": ("#f2d6bc", "#d4a37c", "#c08e68"), "hair": ("#c29470", "#7a5236", "#6b4630"),
               "top": ("#fff4dc", "#f2dcb0", "#dcc49a"), "bottom": ("#c4daf6", "#6f98d8", "#5c84c0"), "iris": ("#9d7a5a", "#4f3a26", "#251a10")},
}
V_ARMS = {"stand": dca.ARMS_K["idle"], "wave": dca.ARMS_K["wave"]}


def villager_body(A, who, pose):
    V = VILLAGERS[who]
    skin, hair, top, bottom = V["skin"], V["hair"], V["top"], V["bottom"]
    o = soft_shadow(A, 231, 592, 120, 10)
    # hair behind the head
    if who == "child":
        for side in (-1, 1):  # two pigtails with yellow ribbons
            o += A.ellipse(231 + side * 150, 300, 40, 62, hair, rot=side * -20, sw=5, hl=0.4)
            o += A.ellipse(231 + side * 128, 232, 24, 18, GOLD, sw=4.2, hl=0.6)
    elif who == "grandma":
        o += A.ellipse(231, 112, 54, 44, hair, sw=5, hl=0.6)  # the bun
        o += A.shape(rrect_d(186, 140, 90, 18, 9), (186, 140, 90, 18), ("#ffd6e2", "#f29ab4", "#dc86a0"), sw=4, hl=0.4)
    # legs and shoes
    if who == "farmer":
        for s, c, p, toe in (((206, 520), (203, 548), (201, 566), -1), ((256, 520), (259, 548), (261, 566), 1)):
            o += A.poly(limb_pts(s, c, p, 23, 22), bottom, sw=5)
            o += dca.boot(A, p[0], toe)
    elif who == "child":
        for x in (206, 256):
            o += A.poly(limb_pts((x, 500), (x, 540), (x, 568), 16, 15), skin, sw=5)
            o += A.ellipse(x + (-8 if x < 231 else 8), 580, 30, 16, ("#ffd6e2", "#e8506a", "#cc4f6c"), sw=5, hl=0.5)
    else:
        for x in (200, 262):
            o += A.ellipse(x + (-10 if x < 231 else 10), 584, 34, 15, ("#b79ad8", "#7a5ab0", "#6a4c9c"), sw=5, hl=0.5)
    # body: dress, smock or overalls
    if who == "grandma":
        skirt = [(184, 330), (160, 380), (146, 450), (134, 520), (126, 572), (231, 584), (336, 572), (328, 520), (316, 450), (302, 380), (278, 330)]
        apron = ('<path d="M186 420 L276 420 L292 576 L170 576 Z" fill="#fffaf0" opacity=".95"/>' +
                 line("M186 420 L276 420", 6, "#f3e2c6") + line("M180 520 Q231 532 282 520", 3, "#f2c0d0", 0.9))
        o += A.poly(skirt, bottom, corners=(4, 6), sw=5.2, hl=0.35, inner=apron)
        # the pink shawl over the shoulders, knotted in front
        o += A.poly([(162, 340), (231, 356), (300, 340), (318, 380), (262, 420), (231, 448), (200, 420), (144, 380)], top, corners=(5,), sw=5, hl=0.45,
                    inner=line("M170 372 Q231 400 292 372", 3.4, "#ffe6ee", 0.7))
        o += A.ellipse(231, 420, 16, 14, top, sw=4.2, hl=0.6)
    elif who == "child":
        dress = [(186, 330), (166, 372), (154, 430), (140, 500), (150, 516), (231, 524), (312, 516), (322, 500), (308, 430), (296, 372), (276, 330)]
        dots = "".join('<circle cx="%d" cy="%d" r="7" fill="#fff6f0" opacity=".85"/>' % (x, y) for x, y in ((190, 440), (240, 470), (280, 430), (200, 494), (266, 500), (226, 410)))
        o += A.poly(dress, top, corners=(4, 6), sw=5.2, hl=0.35, inner=dots)
        o += A.poly([(196, 336), (231, 368), (266, 336), (252, 330), (231, 346), (210, 330)], CREAM, sw=4.2, hl=0.4)
    else:
        torso = [(186, 330), (166, 362), (156, 412), (152, 462), (151, 508), (164, 538), (200, 552), (231, 554)]
        torso = torso + [(2 * 231 - x, y) for x, y in torso[-2::-1]]
        bib = ('<path d="M176 420 L286 420 L292 560 L170 560 Z" fill="%s"/>' % bottom[1] +
               line("M186 340 L192 424 M276 340 L270 424", 10, bottom[1]) +
               '<circle cx="194" cy="430" r="7" fill="%s" stroke="%s" stroke-width="3"/><circle cx="268" cy="430" r="7" fill="%s" stroke="%s" stroke-width="3"/>' % (GOLD[1], INK, GOLD[1], INK) +
               '<rect x="208" y="450" width="46" height="34" rx="6" fill="none" stroke="#4a6ea8" stroke-width="3.5"/>')
        o += A.poly(torso, top, sw=5.2, hl=0.35, inner=bib)
        o += A.poly([(196, 334), (231, 380), (266, 334)], RED, corners=(1,), sw=4.4, hl=0.5)  # neckerchief
    # arms
    raised = ""
    sleeve = top if who != "farmer" else top
    for idx, (s, c, p) in enumerate(V_ARMS[pose]):
        up = p[1] < 300
        arm = A.poly(limb_pts(s, c, p, 24, 21), sleeve, sw=5)
        arm += dca.hand(A, p[0], p[1] - (8 if up else 0), skin, open_=up, rot=0 if not up else 18)
        if up:
            raised += arm
        else:
            o += arm
    # head
    hx, hy = 231, 240
    o += A.ellipse(hx, hy, 122, 110, skin, sw=5.4, hl=0.5, hlpos=(0.3, 0.2), inner=blush(A, 152, 290) + blush(A, 310, 290))
    happy = pose == "wave"
    o += eye(A, 186, 262, "open", who == "child", V["iris"], rx=23, ry=28, side=-1)
    o += eye(A, 276, 262, "open", who == "child", V["iris"], rx=23, ry=28)
    o += '<ellipse cx="231" cy="292" rx="8" ry="5.5" fill="#e9a68c"/>'
    if happy:
        o += mouth("knight", "open", 231, 306)
    else:
        o += line("M215 308 Q231 324 247 308", 5)
    # hair and hats in front
    if who == "child":
        fringe = "M110 236 Q104 120 231 116 Q358 120 352 236 Q330 176 290 176 Q270 200 231 198 Q190 200 172 176 Q132 176 110 236 Z"
        o += A.shape(fringe, (104, 116, 254, 120), hair, sw=5, hl=0.55, hlpos=(0.35, 0.25))
    elif who == "grandma":
        fringe = "M110 250 Q100 126 231 124 Q362 126 352 250 Q340 196 300 176 Q260 196 231 170 Q202 196 162 176 Q122 196 110 250 Z"
        o += A.shape(fringe, (100, 124, 262, 126), hair, sw=5, hl=0.6, inner=line("M150 170 Q190 150 230 150 M232 150 Q272 150 312 170", 3, "#c8ccd6", 0.8))
        # round gold spectacles
        for ex in (186, 276):
            o += '<circle cx="%d" cy="262" r="35" fill="#ffffff" fill-opacity=".12" stroke="%s" stroke-width="7"/><circle cx="%d" cy="262" r="35" fill="none" stroke="%s" stroke-width="3.4"/>' % (ex, INK, ex, GOLD[1])
        o += line("M221 258 Q231 250 241 258", 6) + line("M221 258 Q231 250 241 258", 2.6, GOLD[1])
    else:
        o += A.shape("M118 232 Q112 160 160 150 L302 150 Q350 160 344 232 Q320 196 231 194 Q142 196 118 232 Z", (112, 150, 238, 82), hair, sw=5, hl=0.4)
        # the straw hat: a wide brim, a round crown, a red band and a little wheat stalk
        o += A.ellipse(231, 168, 176, 34, ("#fff3c8", "#f0d088", "#d8b468"), sw=5.2, hl=0.5)
        o += A.shape("M140 168 Q140 70 231 66 Q322 70 322 168 Q231 186 140 168 Z", (140, 66, 182, 118), ("#fff3c8", "#f0d088", "#d8b468"), sw=5.2, hl=0.6,
                     inner=line("M140 150 Q231 168 322 150", 16, RED[1]) + line("M150 112 Q231 98 312 112", 3, "#c9a050", 0.6))
        o += line("M300 152 Q320 110 336 96", 5, "#c9a050") + A.ellipse(338, 92, 9, 16, ("#fff3c8", "#f0d088", "#d8b468"), rot=30, sw=3.6, hl=0.5)
    o += raised
    return o


def villager_svg(who, pose):
    A = Art(KW, KH)
    body = villager_body(A, who, pose)
    if who == "child":  # a small child: the same drawing at 0.8, feet still on y 596
        body = '<g transform="translate(%s %s) scale(0.8)">%s</g>' % (f(231 * 0.2), f(596 * 0.2), body)
    return A.svg(body)


# ------------------------------------------------------------------ sheep (600 x 460, hooves on y 452) and the lamb
def sheep_parts(A, cx, cy, rx, ry, head, pose, legs_y, leg_len, s=1.0):
    """cx, cy, rx, ry: the woolly body. head: (x, y, r) of the face. pose: stand, graze, lamb."""
    o = soft_shadow(A, cx + 20 * s, legs_y + 2, rx * 0.95, 11 * s)
    # far legs (a little darker), the tail puff, the body, near legs
    leg_x = (cx - rx * 0.55, cx + rx * 0.45, cx - rx * 0.32, cx + rx * 0.68)
    near = ""
    for k, x in enumerate(leg_x):
        far = k < 2
        pal = SHEEP_LEG if not far else ("#efe2e2", "#d6c2c4", "#c4adb0")
        top = cy + ry * 0.5
        o_leg = A.shape(rrect_d(x - 19 * s, top, 38 * s, legs_y - top - 6 * s, 17 * s), (x - 19 * s, top, 38 * s, legs_y - top), pal, sw=5 * s if s > 0.8 else 4.4, hl=0.3)
        o_leg += A.shape(rrect_d(x - 21 * s, legs_y - 26 * s, 42 * s, 26 * s, 11 * s), (x - 21 * s, legs_y - 26 * s, 42 * s, 26 * s), SHEEP_HOOF, sw=4.6, hl=0.4)
        if far:
            o += o_leg
        else:
            near += o_leg
    tail_pts, tail_c = wool_pts(cx - rx * 0.98, cy - ry * 0.25, 30 * s, 26 * s, 5, 0.22)
    o += A.poly(tail_pts, WOOL, corners=tail_c, sw=5, hl=0.5)
    pts, corners = wool_pts(cx, cy, rx, ry, 11, 0.09, start=0.1)
    curls = "".join(line("M%s %s q%s %s %s %s" % (f(cx + dx * rx), f(cy + dy * ry), f(10 * s), f(-12 * s), f(22 * s), f(0)), 3.4 * s + 0.6, "#e2d6ce", 0.9)
                    for dx, dy in ((-0.5, -0.2), (0.0, -0.45), (0.35, 0.05), (-0.2, 0.35), (0.55, -0.4), (-0.7, 0.2)))
    o += A.poly(pts, WOOL, corners=corners, sw=5.4, hl=0.7, inner=curls, hlpos=(0.32, 0.22), hlsize=(0.3, 0.18))
    o += near
    # the head
    hx, hy, hr = head
    ears = ""
    for side in (-1, 1):
        ex, ey = hx + side * hr * 1.02, hy - hr * 0.28
        ears += A.ellipse(ex, ey, hr * 0.42, hr * 0.2, SHEEP_FACE, rot=side * 24, sw=4.6, hl=0.4,
                          inner='<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="#f7b6c6" transform="rotate(%d %s %s)"/>' % (
                              f(ex + side * 4), f(ey + 2), f(hr * 0.26), f(hr * 0.09), side * 24, f(ex + side * 4), f(ey + 2)))
    face_in = blush(A, hx - hr * 0.6, hy + hr * 0.38) + blush(A, hx + hr * 0.6, hy + hr * 0.38)
    face = A.ellipse(hx, hy, hr * 0.86, hr, SHEEP_FACE, sw=5.2, hl=0.55, inner=face_in, hlpos=(0.32, 0.2))
    tuft_pts, tuft_c = wool_pts(hx, hy - hr * 0.86, hr * 0.62, hr * 0.32, 6, 0.24, start=0.3)
    tuft = A.poly(tuft_pts, WOOL, corners=tuft_c, sw=4.8, hl=0.6)
    er = hr * 0.26
    if pose == "graze":
        eyes = eye(A, hx - hr * 0.36, hy + hr * 0.06, "calm", True, SHEEP_IRIS, rx=er, ry=er * 1.15, side=-1) + \
            eye(A, hx + hr * 0.36, hy + hr * 0.06, "calm", True, SHEEP_IRIS, rx=er, ry=er * 1.15)
    elif pose == "lamb":
        eyes = eye(A, hx - hr * 0.36, hy + hr * 0.02, "open", True, SHEEP_IRIS, rx=er * 1.1, ry=er * 1.3, look=0.5, side=-1) + \
            eye(A, hx + hr * 0.36, hy + hr * 0.02, "open", True, SHEEP_IRIS, rx=er * 1.1, ry=er * 1.3, look=0.5)
    else:
        eyes = eye(A, hx - hr * 0.36, hy + hr * 0.02, "open", True, SHEEP_IRIS, rx=er, ry=er * 1.2, look=0.5, side=-1) + \
            eye(A, hx + hr * 0.36, hy + hr * 0.02, "open", True, SHEEP_IRIS, rx=er, ry=er * 1.2, look=0.5)
    nose = '<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="#f2a0b2" stroke="%s" stroke-width="3"/>' % (f(hx), f(hy + hr * 0.42), f(hr * 0.12), f(hr * 0.08), INK)
    mth = line("M%s %s q%s %s %s 0 q%s %s %s 0" % (f(hx - hr * 0.18), f(hy + hr * 0.56), f(hr * 0.09), f(hr * 0.12), f(hr * 0.18), f(hr * 0.09), f(hr * 0.12), f(hr * 0.18)), 4)
    if pose == "lamb":
        mth = mouth("knight", "open", hx, hy + hr * 0.5).replace("rx=\"11\"", "rx=\"9\"")
    head_svg = ears + face + tuft + eyes + nose + mth
    if pose == "graze":
        head_svg = '<g transform="rotate(14 %s %s)">%s</g>' % (f(hx), f(hy), head_svg)
    return o, head_svg


def sheep_svg(pose):
    A = Art(600, 460)
    if pose == "graze":
        body, head = sheep_parts(A, 270, 300, 180, 112, (470, 352, 70), "graze", 452, 0)
        # a tuft of grass with a little flower at the mouth
        grass = A.poly([(470, 452), (480, 404), (494, 428), (506, 394), (520, 426), (534, 404), (546, 452)], GRASS, corners=(1, 3, 5), sw=4, hl=0.3)
        grass += "".join('<circle cx="%d" cy="%d" r="8" fill="#f6a9bd" stroke="%s" stroke-opacity=".7" stroke-width="2.4"/>' % (556 + dx, 420 + dy, INK)
                         for dx, dy in ((0, -9), (9, 0), (0, 9), (-9, 0))) + '<circle cx="556" cy="420" r="5" fill="#fff3c4"/>'
        return A.svg(body + grass + head)
    body, head = sheep_parts(A, 260, 300, 180, 112, (470, 236, 74), "stand", 452, 0)
    return A.svg(body + head)


def lamb_svg():
    A = Art(440, 340)
    body, head = sheep_parts(A, 190, 226, 120, 76, (322, 158, 64), "lamb", 332, 0, s=0.72)
    bow = A.poly([(300, 224), (276, 208), (276, 244)], RED, corners=(), sw=4, hl=0.5) + A.poly([(300, 224), (324, 208), (324, 244)], RED, sw=4, hl=0.5) + A.ellipse(300, 225, 9, 9, RED, sw=3.6, hl=0.6)
    return A.svg(body + head + bow)


# ------------------------------------------------------------------ items
def apple_g(A, x, y, s, tilt=0, leaf=True, sw=5.0):
    """One apple (the same shape as draw_castle_art.apple_svg) centred on x, y, size s (1 = 140 wide)."""
    pts = [(90, 62), (122, 50), (150, 70), (160, 110), (146, 152), (118, 172), (90, 166), (62, 172), (34, 152), (20, 110), (30, 70), (58, 50)]
    pts = [(x + (px - 90) * s, y + (py - 110) * s) for px, py in pts]
    g = A.poly(pts, APPLE, sw=sw, hl=0.85, hlpos=(0.3, 0.24), hlsize=(0.16, 0.12))
    stem = "M%s %s Q%s %s %s %s" % (f(x), f(y - 44 * s), f(x + 2 * s), f(y - 66 * s), f(x + 10 * s), f(y - 80 * s))
    g += line(stem, 8 * s + 2, INK) + line(stem, 4 * s + 1, "#8a5e3b")
    if leaf:
        lx, ly = x + 14 * s, y - 70 * s
        g += A.poly([(lx, ly), (lx + 26 * s, ly - 18 * s), (lx + 52 * s, ly - 10 * s), (lx + 30 * s, ly + 10 * s)], LEAF, corners=(0, 2), sw=4, hl=0.5)
    return '<g transform="rotate(%d %s %s)">%s</g>' % (tilt, f(x), f(y), g)


def apple_pile_svg():
    A = Art(380, 300)
    o = soft_shadow(A, 190, 284, 168, 12)
    for x, y, t in ((96, 222, -6), (190, 228, 4), (284, 222, 8)):
        o += apple_g(A, x, y, 0.78, t, leaf=False)
    for x, y, t in ((143, 150, 6), (237, 150, -6)):
        o += apple_g(A, x, y, 0.78, t, leaf=False)
    o += apple_g(A, 190, 84, 0.78, 0, leaf=True)
    return A.svg(o)


def coin_g(A, x, y, s):
    """A gold coin seen from the front, with a gold star on it (s = 1: 160 wide)."""
    o = A.ellipse(x + 6 * s, y + 8 * s, 80 * s, 80 * s, COIN_EDGE, sw=5, hl=0)
    o += A.ellipse(x, y, 80 * s, 80 * s, GOLD, sw=5, hl=0.85, hlpos=(0.3, 0.22),
                   inner='<circle cx="%s" cy="%s" r="%s" fill="none" stroke="#e0aa3a" stroke-width="%s" opacity=".8"/>' % (f(x), f(y), f(60 * s), f(5 * s + 1)))
    o += A.poly(star_pts(x, y, 38 * s, 16 * s), ("#fffbe6", "#ffe48a", "#f0c860"), corners=tuple(range(0, 10, 2)), sw=3.6, hl=0.5)
    return o


def coin_svg():
    A = Art(220, 220)
    return A.svg(soft_shadow(A, 110, 206, 70, 8) + coin_g(A, 106, 104, 1.0))


def coin_side(A, x, y, rx=62, ry=18):
    """One coin lying flat (the top of a stack)."""
    o = A.shape("M%s %s L%s %s Q%s %s %s %s Q%s %s %s %s Z" % (f(x - rx), f(y), f(x - rx), f(y + 16), f(x), f(y + 16 + ry * 2.1), f(x + rx), f(y + 16), f(x + rx), f(y), f(x), f(y)),
                (x - rx, y, 2 * rx, 16 + ry), COIN_EDGE, sw=4.6, hl=0)
    o += A.ellipse(x, y, rx, ry, GOLD, sw=4.6, hl=0.8, inner='<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="none" stroke="#e0aa3a" stroke-width="3"/>' % (f(x), f(y), f(rx * 0.72), f(ry * 0.68)))
    return o


def coin_pile_svg():
    A = Art(400, 300)
    o = soft_shadow(A, 200, 284, 180, 12)
    for x, n in ((110, 5), (220, 7), (310, 4)):
        for k in range(n):
            o += coin_side(A, x + (3 if k % 2 else -3), 250 - k * 26)
    o += coin_g(A, 70, 238, 0.36) + coin_g(A, 350, 244, 0.32)
    return A.svg(o)


def coin_sack_svg():
    A = Art(340, 360)
    o = soft_shadow(A, 170, 344, 140, 12)
    o += coin_g(A, 134, 82, 0.42) + coin_g(A, 196, 70, 0.42) + coin_g(A, 166, 60, 0.36)
    d = "M118 104 Q40 140 36 236 Q34 340 170 342 Q306 340 304 236 Q300 140 222 104 Q196 122 170 122 Q144 122 118 104 Z"
    o += A.shape(d, (34, 104, 270, 238), BURLAP, sw=5.4, hl=0.55, hlpos=(0.32, 0.24),
                 inner=line("M80 170 Q90 260 130 320 M262 170 Q256 260 214 320", 4, "#b88e58", 0.5) + line("M60 252 Q170 276 280 252", 3.4, "#b88e58", 0.4))
    o += A.shape(rrect_d(110, 96, 120, 30, 14), (110, 96, 120, 30), RED, sw=5, hl=0.5)
    o += A.ellipse(170, 111, 16, 16, RED, sw=4.4, hl=0.6)
    o += A.poly(star_pts(170, 228, 46, 20), GOLD, corners=tuple(range(0, 10, 2)), sw=4.4, hl=0.6)
    o += coin_g(A, 290, 316, 0.3) + coin_g(A, 46, 322, 0.26)
    return A.svg(o)


def basket_svg():
    A = Art(380, 320)
    o = soft_shadow(A, 190, 306, 160, 12)
    o += line("M60 160 Q60 24 190 24 Q320 24 320 160", 26, INK) + line("M60 160 Q60 24 190 24 Q320 24 320 160", 17, BASKET[1]) + \
        line("M80 140 Q80 44 190 44", 5, "#f6dcb4", 0.7)
    o += A.ellipse(190, 160, 150, 34, BASKET, sw=5, hl=0.3, inner='<ellipse cx="190" cy="166" rx="134" ry="24" fill="#7a5236"/>')
    # a checked cloth peeking out of the basket
    o += A.poly([(80, 166), (120, 128), (190, 140), (262, 122), (300, 166), (190, 180)], ("#ffffff", "#fbeef0", "#e8d0d6"), corners=(1, 3), sw=4.4, hl=0.4,
                inner="".join('<path d="M%d 120 L%d 190" stroke="#f29ab4" stroke-width="7" opacity=".55"/>' % (x, x) for x in range(96, 300, 28)))
    weave = "".join('<ellipse cx="%d" cy="%d" rx="14" ry="9" fill="#e9bf80" stroke="#a87444" stroke-width="2.4"/>' % (x + (15 if r % 2 else 0), 196 + r * 24)
                    for r in range(4) for x in range(46, 340, 30))
    o += A.shape("M36 164 Q190 206 344 164 L322 272 Q308 294 282 296 L98 296 Q72 294 58 272 Z", (36, 164, 308, 132), BASKET, sw=5.2, hl=0.35, inner=weave)
    o += A.shape("M30 160 Q190 204 350 160 Q354 172 344 182 Q190 226 36 182 Q26 172 30 160 Z", (26, 160, 328, 66), ("#f8e2b8", "#ddb06c", "#c69a5c"), sw=5, hl=0.5)
    return A.svg(o)


def bridge_svg():
    """A little wooden footbridge, side view: an arched deck, posts and a round top rail."""
    A = Art(560, 260)
    o = soft_shadow(A, 280, 248, 250, 10)
    # posts and the round top rail behind the deck
    for x in (40, 160, 280, 400, 520):
        t = (x - 280) / 270.0
        deck_y = 230 - 118 * (1 - t * t)  # the deck top under this post
        o += A.shape(rrect_d(x - 11, deck_y - 76, 22, 84, 8), (x - 11, deck_y - 76, 22, 84), DARK_WOOD, sw=4.4, hl=0.35)
    rail = "M34 160 Q280 30 526 160"
    o += line(rail, 22, INK) + line(rail, 14, WOOD[1]) + line("M70 140 Q280 46 490 140", 4, "#f6dcb4", 0.6)
    # the arched plank deck and its darker edge beam
    o += A.shape("M10 230 Q280 112 550 230 L550 246 Q280 136 10 246 Z", (10, 112, 540, 134), WOOD, sw=5.2, hl=0.45,
                 inner="".join(line("M%d 80 L%d 260" % (x, x), 3.4, "#8a5e3b", 0.55) for x in range(40, 560, 34)))
    o += A.shape("M10 242 Q280 130 550 242 L550 256 Q280 146 10 256 Z", (10, 130, 540, 126), DARK_WOOD, sw=4.4, hl=0.2)
    return A.svg(o)


def fence_svg():
    A = Art(420, 240)
    o = soft_shadow(A, 210, 226, 196, 9)
    for y in (96, 156):
        o += A.shape(rrect_d(6, y, 408, 26, 10), (6, y, 408, 26), WOOD, sw=4.8, hl=0.4, inner=line("M30 %d L390 %d" % (y + 13, y + 13), 3, "#8a5e3b", 0.4))
    for x in (40, 210, 380):
        o += A.shape("M%d 226 L%d 56 L%d 34 L%d 56 L%d 226 Z" % (x - 18, x - 18, x, x + 18, x + 18), (x - 18, 34, 36, 192), DARK_WOOD, sw=5, hl=0.4)
    for x in (110, 300):
        o += A.poly([(x - 30, 230), (x - 22, 196), (x - 8, 214), (x, 186), (x + 10, 212), (x + 24, 194), (x + 30, 230)], GRASS, corners=(1, 3, 5), sw=4, hl=0.3)
    o += "".join('<circle cx="%d" cy="%d" r="8" fill="#ffe08a" stroke="%s" stroke-opacity=".7" stroke-width="2.4"/>' % (150 + dx, 206 + dy, INK)
                 for dx, dy in ((0, -9), (9, 0), (0, 9), (-9, 0))) + '<circle cx="150" cy="206" r="5" fill="#fff3c4"/>'
    return A.svg(o)


# ------------------------------------------------------------------ small things of the stories (added 22 Oct 2026)
# Each is one thing the knight counts, drawn 1:1 with a soft shadow at the bottom (feet on the canvas bottom).
STEEL_I = ("#fbfdff", "#dfe7f1", "#b9c6d6")
FLAME = ("#fff6c8", "#ffc94a", "#f29a2e")
CARROT = ("#ffd2a0", "#f48a2e", "#d9702a")
GEM = ("#d8fff2", "#5ccfb0", "#3f9f8a")
BRICK = ("#f6b8a0", "#d0705a", "#b45a48")
SAND_STONE = ("#f4ecdf", "#d6c8b2", "#bba98e")


def shield_svg():
    """A round-topped heater shield in the knight's blue with a gold rim and the gold star (like his tunic)."""
    A = Art(240, 290)
    o = soft_shadow(A, 120, 276, 86, 9)
    d = "M24 44 Q120 8 216 44 L212 140 Q204 220 120 266 Q36 220 28 140 Z"
    o += A.shape(d, (24, 8, 192, 258), GOLD, sw=5.4, hl=0.5)
    d2 = "M44 58 Q120 30 196 58 L192 140 Q186 204 120 242 Q54 204 48 140 Z"
    o += A.shape(d2, (44, 30, 152, 212), BLUE, sw=4, hl=0.6, hlpos=(0.32, 0.2))
    o += A.poly(star_pts(120, 128, 46, 20), GOLD, corners=tuple(range(0, 10, 2)), sw=4, hl=0.6)
    return A.svg(o)


def arrow_svg():
    """An arrow standing up (as if stuck in the target or the ground): a steel tip, a wooden shaft, red and cream feathers."""
    A = Art(110, 320)
    o = soft_shadow(A, 55, 308, 30, 6)
    o += line("M55 70 L55 300", 16, INK) + line("M55 70 L55 300", 9, WOOD[1]) + line("M52 80 L52 290", 3, "#f6dcb4", 0.7)
    o += A.poly([(55, 8), (80, 64), (55, 80), (30, 64)], STEEL_I, corners=(0, 1, 3), sw=4.4, hl=0.6)
    for side in (-1, 1):
        o += A.poly([(55, 222), (55 + 34 * side, 250), (55 + 34 * side, 296), (55, 272)], RED if side < 0 else CREAM, corners=(0, 1, 2, 3), sw=4, hl=0.4)
    return A.svg(o)


def plank_svg():
    """A wooden plank with soft grain and two round nails."""
    A = Art(360, 120)
    o = soft_shadow(A, 180, 108, 160, 8)
    grain = line("M30 46 Q120 36 200 48 Q270 58 330 44", 3, "#8a5e3b", 0.45) + line("M40 72 Q150 64 240 74 Q300 80 326 70", 3, "#8a5e3b", 0.35) + \
        '<ellipse cx="250" cy="56" rx="16" ry="7" fill="none" stroke="#8a5e3b" stroke-width="3" opacity=".45"/>'
    o += A.shape(rrect_d(14, 24, 332, 72, 14), (14, 24, 332, 72), WOOD, sw=5.2, hl=0.5, inner=grain)
    for x in (40, 320):
        o += '<circle cx="%d" cy="60" r="7" fill="#c6d1de" stroke="%s" stroke-width="3"/>' % (x, INK)
    return A.svg(o)


def lantern_svg():
    """A little lantern: a gold frame, a warm glowing glass and a ring on top (lit, calm, no rays)."""
    A = Art(190, 280)
    o = soft_shadow(A, 95, 268, 60, 7)
    o += '<ellipse cx="95" cy="160" rx="84" ry="96" fill="#ffe7a0" opacity=".45" filter="%s"/>' % A.blur(16)
    o += line("M95 18 m-20 0 a20 20 0 1 0 40 0 a20 20 0 1 0 -40 0", 12, INK) + line("M95 18 m-20 0 a20 20 0 1 0 40 0 a20 20 0 1 0 -40 0", 6, GOLD[1])
    o += A.poly([(60, 70), (95, 40), (130, 70)], GOLD, corners=(0, 1, 2), sw=4.6, hl=0.5)
    o += A.shape(rrect_d(52, 66, 86, 18, 7), (52, 66, 86, 18), GOLD, sw=4.4, hl=0.4)
    glass = A.rad([(0, "#fffbe8"), (0.5, "#ffe08a"), (1, "#f6b84a")], cy="58%")
    o += A.shape(rrect_d(56, 82, 78, 140, 16), (56, 82, 78, 140), FLAME, sw=4.6, hl=0.6, grad=glass,
                 inner=A.poly([(95, 120), (110, 160), (95, 184), (80, 160)], ("#fffdf2", "#fff2b8", "#ffd770"), corners=(0, 2), sw=0, hl=0, outline=False))
    o += line("M95 84 L95 220", 5, "#c99a30", 0.8) + line("M58 152 L132 152", 5, "#c99a30", 0.8)
    o += A.shape(rrect_d(46, 218, 98, 26, 9), (46, 218, 98, 26), GOLD, sw=4.6, hl=0.4)
    return A.svg(o)


def stone_svg():
    """A round, flat stepping stone."""
    A = Art(270, 170)
    o = soft_shadow(A, 135, 154, 120, 10)
    o += A.poly([(26, 110), (40, 64), (96, 34), (170, 30), (232, 56), (252, 104), (226, 140), (140, 152), (56, 144)], dca.STONE, sw=5.2, hl=0.6,
                inner='<ellipse cx="180" cy="110" rx="18" ry="8" fill="#9aa4b2" opacity=".35"/><ellipse cx="86" cy="96" rx="10" ry="5" fill="#9aa4b2" opacity=".3"/>')
    return A.svg(o)


def brick_svg():
    """A warm red brick, seen a little from above."""
    A = Art(270, 160)
    o = soft_shadow(A, 135, 146, 120, 9)
    o += A.shape("M22 54 L60 26 L250 26 L212 54 Z", (22, 26, 228, 28), ("#fbd0bf", "#e89a82", "#d0806a"), sw=4.8, hl=0.4)
    o += A.shape("M212 54 L250 26 L250 106 L212 136 Z", (212, 26, 38, 110), ("#c76a54", "#ad5644", "#94483a"), sw=4.8, hl=0.1)
    o += A.shape(rrect_d(22, 54, 190, 82, 6), (22, 54, 190, 82), BRICK, sw=5, hl=0.45,
                 inner='<ellipse cx="70" cy="100" rx="8" ry="5" fill="#a84a3a" opacity=".3"/><ellipse cx="150" cy="84" rx="6" ry="4" fill="#a84a3a" opacity=".3"/>')
    return A.svg(o)


def step_svg():
    """One stair step: a pale stone block seen a little from above (a step of the tower stairs)."""
    A = Art(280, 180)
    o = soft_shadow(A, 140, 166, 126, 9)
    o += A.shape("M20 64 L64 30 L262 30 L218 64 Z", (20, 30, 242, 34), ("#fffaf2", "#efe5d4", "#d8cbb4"), sw=4.8, hl=0.5)
    o += A.shape("M218 64 L262 30 L262 122 L218 156 Z", (218, 30, 44, 126), ("#cdbfa6", "#b8a98e", "#a0927a"), sw=4.8, hl=0.1)
    o += A.shape(rrect_d(20, 64, 198, 92, 6), (20, 64, 198, 92), SAND_STONE, sw=5, hl=0.45,
                 inner=line("M20 110 L218 110", 3, "#a0927a", 0.35) + line("M110 64 L110 110 M70 110 L70 156 M160 110 L160 156", 3, "#a0927a", 0.35))
    return A.svg(o)


def star_svg():
    """A soft gold star with round tips."""
    A = Art(230, 230)
    o = soft_shadow(A, 115, 216, 80, 8)
    o += A.poly(star_pts(115, 112, 104, 46), GOLD, sw=5.4, hl=0.7, hlpos=(0.36, 0.3))
    return A.svg(o)


def carrot_svg():
    """A crunchy orange carrot with a green top, lying a little tilted."""
    A = Art(170, 300)
    o = soft_shadow(A, 85, 288, 50, 7)
    for dx, h, r in ((-22, 70, -18), (0, 86, 0), (22, 70, 18)):
        o += '<g transform="rotate(%d 85 92)">%s</g>' % (r, A.poly([(85 + dx * 0.3, 92), (70 + dx, 92 - h * 0.6), (85 + dx, 92 - h), (100 + dx, 92 - h * 0.6)], LEAF, corners=(0, 2), sw=4.2, hl=0.5))
    rings = "".join(line("M%d %d Q%d %d %d %d" % (60 + k * 3, 130 + k * 36, 85, 136 + k * 36, 108 - k * 3, 128 + k * 36), 3, "#c25e1e", 0.5) for k in range(4))
    o += A.poly([(42, 100), (85, 86), (128, 100), (118, 170), (96, 250), (85, 282), (74, 250), (52, 170)], CARROT, corners=(5,), sw=5, hl=0.6, inner=rings)
    return A.svg(o)


def gem_svg():
    """A cut gem in soft green (the same green as the buddy knight's shield gem)."""
    A = Art(230, 210)
    o = soft_shadow(A, 115, 196, 80, 8)
    o += A.poly([(30, 76), (70, 30), (160, 30), (200, 76), (115, 186)], GEM, corners=(0, 1, 2, 3, 4), sw=5.2, hl=0.6,
                inner=line("M30 76 L200 76 M70 30 L92 76 L115 186 M160 30 L138 76 L115 186 M115 30 L92 76 M115 30 L138 76", 3, "#2f7f6c", 0.5))
    o += A.poly([(78, 42), (104, 42), (90, 66)], ("#ffffff", "#f2fffb", "#e0f6ee"), corners=(0, 1, 2), sw=0, hl=0, outline=False)
    return A.svg(o)


def torch_svg():
    """A wall torch: a wooden handle, a wrapped top and a soft, still flame."""
    A = Art(130, 320)
    o = soft_shadow(A, 65, 308, 30, 6)
    o += '<ellipse cx="65" cy="80" rx="56" ry="70" fill="#ffe7a0" opacity=".45" filter="%s"/>' % A.blur(14)
    o += A.shape("M54 140 L76 140 L72 300 Q65 306 58 300 Z", (54, 140, 22, 166), WOOD, sw=4.8, hl=0.4)
    o += A.shape(rrect_d(36, 116, 58, 36, 10), (36, 116, 58, 36), BROWN, sw=4.8, hl=0.4,
                 inner=line("M36 128 L94 136 M36 142 L94 150", 3, "#4a3020", 0.35))
    o += A.poly([(65, 18), (90, 60), (94, 92), (80, 116), (50, 116), (36, 92), (40, 60)], FLAME, corners=(0,), sw=4.6, hl=0.6)
    o += A.poly([(65, 58), (78, 84), (74, 108), (56, 108), (52, 84)], ("#fffdf2", "#fff2b8", "#ffe08a"), corners=(0,), sw=0, hl=0, outline=False)
    return A.svg(o)


# the shrug ("hmm, not quite"): elbows bent, both hands out to the sides at belt height, palms up
dca.ARMS_K["shrug"] = (((180, 352), (128, 404), (104, 380)), ((282, 352), (334, 404), (358, 380)))


def knight_shrug_svg():
    A = Art(KW, KH)
    with KnightTweak(look=0.0):
        body = dca.knight_body(A, "knight", "shrug")
    hands = dca.hand(A, 104, 380, SKIN, open_=True, rot=-20) + dca.hand(A, 358, 380, SKIN, open_=True, rot=20)
    return A.svg(body + hands)


# ------------------------------------------------------------------ backdrops (1600 x 400, opaque)
def sky(A, sun_x):
    o = '<rect width="1600" height="400" fill="%s"/>' % A.lin([(0, "#dbe7f2"), (0.6, "#ecf1f2"), (1, "#f3efe2")], 0, 0, 0, 1)
    o += '<ellipse cx="%d" cy="60" rx="220" ry="110" fill="#fff6dc" opacity=".8" filter="%s"/>' % (sun_x, A.blur(36))
    return o


def flowers(A, spots):
    o = ""
    for x, y, c in spots:
        o += "".join('<circle cx="%d" cy="%d" r="7" fill="%s" stroke="%s" stroke-opacity=".6" stroke-width="2.2"/>' % (x + dx, y + dy, c, INK) for dx, dy in ((0, -8), (8, 0), (0, 8), (-8, 0)))
        o += '<circle cx="%d" cy="%d" r="4.5" fill="#fff3c4"/>' % (x, y)
    return o


def ground(A):
    """Grass with a soft sandy path the characters walk on (y 300..370)."""
    o = '<path d="M0 270 Q400 256 800 266 Q1200 256 1600 268 L1600 400 L0 400 Z" fill="%s"/>' % A.lin([(0, "#b4dc9c"), (1, "#8fc47c")], 0, 0, 0, 1)
    o += '<path d="M0 300 Q800 290 1600 302 L1600 370 Q800 380 0 368 Z" fill="%s" stroke="%s" stroke-opacity=".3" stroke-width="3"/>' % (
        A.lin([(0, "#f0dfbc"), (1, "#e2c89c")], 0, 0, 0, 1), INK)
    for x in range(80, 1600, 260):
        o += '<ellipse cx="%d" cy="%d" rx="%d" ry="4" fill="#c9a676" opacity=".45"/>' % (x, 330 + (x * 7) % 26, 8 + x % 6)
    return o


def meadow_bg_svg():
    A = Art(1600, 400)
    o = [sky(A, 260)]
    o.append(dca.cloud(A, 220, 70, 0.8) + dca.cloud(A, 760, 46, 0.6, 0.8) + dca.cloud(A, 1300, 80, 0.75))
    o.append('<path d="M0 230 Q260 170 560 210 Q860 160 1160 200 Q1400 170 1600 196 L1600 400 L0 400 Z" fill="%s"/>' % A.lin([(0, "#d2e6c8"), (1, "#bdd9ae")], 0, 0, 0, 1))
    # the castle far away on the right hill (soft and pale, so it stays in the distance)
    cx, base = 1380, 196
    castle = A.shape("M%d %d L%d %d L%d %d L%d %d L%d %d L%d %d L%d %d L%d %d Z" % (cx - 80, base, cx - 80, base - 70, cx - 50, base - 70, cx - 50, base - 50,
                                                                              cx + 50, base - 50, cx + 50, base - 70, cx + 80, base - 70, cx + 80, base),
                     (cx - 80, base - 70, 160, 70), ("#eef1f5", "#cdd4de", "#b4bdca"), sw=3, hl=0.3)
    castle += A.poly([(cx - 88, base - 66), (cx - 65, base - 112), (cx - 42, base - 66)], BLUE_D, corners=(0, 1, 2), sw=3)
    castle += A.poly([(cx + 42, base - 66), (cx + 65, base - 112), (cx + 88, base - 66)], BLUE_D, corners=(0, 1, 2), sw=3)
    castle += line("M%d %d L%d %d" % (cx - 65, base - 112, cx - 65, base - 134), 3) + A.poly([(cx - 65, base - 134), (cx - 40, base - 129), (cx - 65, base - 122)], GOLD, sw=2.6, hl=0.3)
    castle += A.shape("M%d %d L%d %d Q%d %d %d %d L%d %d Z" % (cx - 16, base, cx - 16, base - 22, cx, base - 36, cx + 16, base - 22, cx + 16, base),
                      (cx - 16, base - 36, 32, 36), ("#7a5a42", "#5a3b22", "#4a3020"), sw=2.6, hl=0)
    o.append('<g opacity=".6" transform="translate(%d %d) scale(0.62)">%s</g>' % (cx * 0.38, base * 0.38, castle))
    o.append('<path d="M0 262 Q300 222 640 250 Q980 226 1300 246 Q1460 236 1600 244 L1600 400 L0 400 Z" fill="%s"/>' % A.lin([(0, "#c4e2b0"), (1, "#acd498")], 0, 0, 0, 1))
    for x, y, s in ((70, 262, 0.9), (190, 250, 0.7), (1480, 250, 0.75), (1570, 262, 0.9)):
        o.append(dca.round_tree(A, x, y, s))
    o.append(ground(A))
    # a soft fence on the left, flowers on the edges
    for x in range(10, 330, 80):
        o.append(A.shape(rrect_d(x, 252, 14, 50, 5), (x, 252, 14, 50), WOOD, sw=2.6, hl=0.2))
    o.append(A.shape(rrect_d(0, 264, 336, 10, 4), (0, 264, 336, 10), WOOD, sw=2.6, hl=0.2))
    o.append(flowers(A, ((60, 388, "#f6a9bd"), (240, 384, "#ffe08a"), (1340, 388, "#c9b6f2"), (1530, 384, "#f6a9bd"), (380, 290, "#fbfcfd"), (1240, 286, "#ffe08a"))))
    return A.svg("".join(o))


def cottage(A, x, w, roof, door, s=1.0):
    """A small cottage standing on y 286: cream walls, a rounded roof, a round window with a flower box."""
    base = 286
    h = 96 * s
    o = A.shape(rrect_d(x, base - h, w, h, 8), (x, base - h, w, h), ("#fffaf0", "#f4e6cc", "#e2cfae"), sw=3.6, hl=0.3,
                inner=line("M%s %s L%s %s" % (f(x + w * 0.3), f(base - h), f(x + w * 0.3), f(base)), 6, "#c99a62", 0.5))
    o += A.poly([(x - 18, base - h + 6), (x + w * 0.5, base - h - 70 * s), (x + w + 18, base - h + 6)], roof, corners=(0, 2), sw=3.6, hl=0.5)
    o += A.shape(rrect_d(x + w * 0.62, base - h - 50 * s, 18, 34 * s, 4), (x + w * 0.62, base - h - 50 * s, 18, 34 * s), ("#e8d6c4", "#c49a7a", "#a8846a"), sw=3, hl=0.3)
    dx = x + w * 0.62
    o += A.shape("M%s %s L%s %s Q%s %s %s %s L%s %s Z" % (f(dx), f(base), f(dx), f(base - 44 * s), f(dx + 17 * s), f(base - 62 * s), f(dx + 34 * s), f(base - 44 * s), f(dx + 34 * s), f(base)),
                 (dx, base - 62 * s, 34 * s, 62 * s), door, sw=3.2, hl=0.3)
    wx = x + w * 0.3
    o += A.ellipse(wx, base - h * 0.55, 18 * s, 18 * s, ("#fff6d6", "#ffe3a0", "#f0c878"), sw=3.2, hl=0.5,
                   inner=line("M%s %s L%s %s" % (f(wx), f(base - h * 0.55 - 18 * s), f(wx), f(base - h * 0.55 + 18 * s)), 3, "#c99a62", 0.8))
    o += A.shape(rrect_d(wx - 26 * s, base - h * 0.55 + 18 * s, 52 * s, 9, 3), (wx - 26 * s, base - h * 0.55 + 18 * s, 52 * s, 9), WOOD, sw=2.6, hl=0.2)
    o += "".join('<circle cx="%s" cy="%s" r="5" fill="%s" stroke="%s" stroke-opacity=".7" stroke-width="2"/>' % (f(wx - 16 * s + k * 16 * s), f(base - h * 0.55 + 16 * s), c, INK)
                 for k, c in enumerate(("#f6a9bd", "#ffe08a", "#c9b6f2")))
    return o


def village_bg_svg():
    A = Art(1600, 400)
    o = [sky(A, 1340)]
    o.append(dca.cloud(A, 300, 60, 0.7, 0.85) + dca.cloud(A, 860, 40, 0.55, 0.75) + dca.cloud(A, 1420, 76, 0.8))
    o.append('<path d="M0 220 Q300 180 640 206 Q980 176 1300 200 Q1460 186 1600 196 L1600 400 L0 400 Z" fill="%s"/>' % A.lin([(0, "#d2e6c8"), (1, "#bdd9ae")], 0, 0, 0, 1))
    o.append('<path d="M0 262 Q400 244 800 256 Q1200 244 1600 258 L1600 400 L0 400 Z" fill="%s"/>' % A.lin([(0, "#c4e2b0"), (1, "#acd498")], 0, 0, 0, 1))
    # cottages on both edges (the middle stays open)
    o.append(cottage(A, 30, 150, RED, ("#c9a07a", "#8a6440", "#7a5638"), 1.0))
    o.append(cottage(A, 236, 120, BLUE, ("#c9a07a", "#8a6440", "#7a5638"), 0.85))
    o.append(cottage(A, 1250, 130, ("#ffd9a8", "#f39a3c", "#d9833a"), ("#a8c4e8", "#5b8cf2", "#5577cc"), 0.9))
    o.append(cottage(A, 1430, 150, GREEN, ("#c9a07a", "#8a6440", "#7a5638"), 1.0))
    for x, y, s in ((206, 280, 0.6), (1400, 282, 0.62)):
        o.append(dca.round_tree(A, x, y, s))
    o.append(ground(A))
    # a little well on the left road side and a lantern post on the right
    o.append(A.ellipse(410, 292, 34, 12, dca.STONE, sw=3, hl=0.3))
    o.append(A.shape(rrect_d(378, 262, 64, 32, 8), (378, 262, 64, 32), dca.STONE, sw=3.4, hl=0.3, inner=dca.stone_lines(378, 270, 442, 294, h=12, w=22)))
    o.append(line("M384 262 L384 214 M436 262 L436 214", 6) + line("M384 262 L384 214 M436 262 L436 214", 3, WOOD[1]))
    o.append(A.poly([(370, 220), (410, 196), (450, 220)], RED, corners=(0, 2), sw=3.2, hl=0.4))
    o.append(line("M1196 290 L1196 214", 7) + line("M1196 290 L1196 214", 3.4, "#7a5236"))
    o.append(A.shape(rrect_d(1184, 204, 24, 30, 6), (1184, 204, 24, 30), ("#fff6d6", "#ffe3a0", "#f0c878"), sw=3, hl=0.5))
    o.append(flowers(A, ((60, 388, "#ffe08a"), (250, 384, "#f6a9bd"), (1360, 388, "#c9b6f2"), (1540, 384, "#ffe08a"))))
    return A.svg("".join(o))


# ------------------------------------------------------------------ jobs, render, contact sheet
def jobs():
    j = {}
    for fr in ("walk_a", "walk_b"):
        j["knight_" + fr] = (lambda fr=fr: knight_walk_svg(fr), KW, KH, CHAR_SCALE)
    j["knight_carry_basket"] = (lambda: knight_carry_svg("basket"), KW, KH, CHAR_SCALE)
    j["knight_carry_sack"] = (lambda: knight_carry_svg("sack"), KW, KH, CHAR_SCALE)
    j["knight_point"] = (knight_point_svg, KW, KH, CHAR_SCALE)
    j["knight_bop_raise"] = (knight_bop_raise_svg, dce.SW_W, KH, CHAR_SCALE)
    j["sheep_stand"] = (lambda: sheep_svg("stand"), 600, 460, 500 / 460)
    j["sheep_graze"] = (lambda: sheep_svg("graze"), 600, 460, 500 / 460)
    j["lamb"] = (lamb_svg, 440, 340, 500 / 340)
    for who in ("child", "grandma", "farmer"):
        for pose in ("stand", "wave"):
            j["villager_%s_%s" % (who, pose)] = (lambda w=who, p=pose: villager_svg(w, p), KW, KH, CHAR_SCALE)
    j["apple_pile"] = (apple_pile_svg, 380, 300, 1)
    j["coin"] = (coin_svg, 220, 220, 1)
    j["coin_pile"] = (coin_pile_svg, 400, 300, 1)
    j["coin_sack"] = (coin_sack_svg, 340, 360, 1)
    j["basket"] = (basket_svg, 380, 320, 1)
    j["bridge"] = (bridge_svg, 560, 260, 1)
    j["fence"] = (fence_svg, 420, 240, 1)
    j["knight_shrug"] = (knight_shrug_svg, KW, KH, CHAR_SCALE)
    for n, fn, w, h in (("item_shield", shield_svg, 240, 290), ("item_arrow", arrow_svg, 110, 320), ("item_plank", plank_svg, 360, 120),
                        ("item_lantern", lantern_svg, 190, 280), ("item_stone", stone_svg, 270, 170), ("item_brick", brick_svg, 270, 160),
                        ("item_step", step_svg, 280, 180), ("item_star", star_svg, 230, 230), ("item_carrot", carrot_svg, 170, 300),
                        ("item_gem", gem_svg, 230, 210), ("item_torch", torch_svg, 130, 320)):
        j[n] = (fn, w, h, 1)
    j["backdrop_meadow"] = (meadow_bg_svg, 1600, 400, 1)
    j["backdrop_village"] = (village_bg_svg, 1600, 400, 1)
    return j


OPAQUE = {"backdrop_meadow", "backdrop_village"}


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


GAME = os.path.join(SITE, "game")


def load(rel):
    p = rel if os.path.isabs(rel) else os.path.join(OUT_DIR, rel + ".png")
    return Image.open(p).convert("RGBA")


def reuse(rel):
    return Image.open(os.path.join(GAME, rel)).convert("RGBA")


def font(size):
    try:
        return ImageFont.truetype("arial.ttf", size)
    except OSError:
        return ImageFont.load_default(size=size)


def contact_sheet(names):
    W = 2400
    bgc = (150, 150, 150, 255)
    F, FS = font(20), font(15)
    blocks = []

    # 1) the knight: the existing pictures (left of the bar) next to the new poses, all at one scale
    old = [("knight_idle (old)", reuse("rewards/art/castle/knight_idle.png"), 600),
           ("knight_cheer (old)", reuse("rewards/art/castle/knight_cheer.png"), 600),
           ("knight_wave (old)", reuse("world/art/castle/knight_wave.png"), 600),
           ("knight_bop (old)", reuse("rewards/art/castle_extra/knight_bop.png"), 600)]
    new = [(n, load(n), 600) for n in ("knight_walk_a", "knight_walk_b", "knight_carry_basket", "knight_carry_sack", "knight_point", "knight_bop_raise")]
    row_h = 250
    sheet1 = Image.new("RGBA", (W, row_h + 150), bgc)
    d = ImageDraw.Draw(sheet1)
    x = 10
    for k, (label, im, units) in enumerate(old + new):
        if k == len(old):
            d.rectangle((x, 10, x + 6, row_h + 140), fill=(90, 60, 50, 255))
            x += 20
        k_px = row_h / units  # the same on-screen scale for every 600-unit knight box
        big = im.resize((max(1, round(im.width * row_h / im.height)), row_h), Image.LANCZOS)
        small = im.resize((max(1, round(im.width * 80 / im.height)), 80), Image.LANCZOS)
        sheet1.alpha_composite(big, (x, 24))
        sheet1.alpha_composite(small, (x + (big.width - small.width) // 2, row_h + 34))
        d.text((x, 4), label, fill=(20, 20, 20, 255), font=FS)
        x += big.width + 8
    blocks.append(sheet1)

    # 2) every new picture (except knights and backdrops): a big tile and an 80 px tall copy under it
    tiles = [n for n in names if not n.startswith("knight_") and n not in OPAQUE]
    cell_w, big_h = 240, 200
    cols = W // cell_w
    rows = math.ceil(len(tiles) / cols)
    sheet2 = Image.new("RGBA", (W, rows * (big_h + 130)), bgc)
    d = ImageDraw.Draw(sheet2)
    for i, n in enumerate(tiles):
        im = load(n)
        x0, y0 = (i % cols) * cell_w, (i // cols) * (big_h + 130)
        t = im.copy()
        t.thumbnail((cell_w - 16, big_h - 10))
        sheet2.alpha_composite(t, (x0 + (cell_w - t.width) // 2, y0 + 24 + big_h - 10 - t.height))
        s = im.resize((max(1, round(im.width * 80 / im.height)), 80), Image.LANCZOS)
        if s.width > cell_w - 10:
            s = s.resize((cell_w - 10, round(80 * (cell_w - 10) / s.width)), Image.LANCZOS)
        sheet2.alpha_composite(s, (x0 + (cell_w - s.width) // 2, y0 + big_h + 30))
        d.text((x0 + 6, y0 + 4), n, fill=(20, 20, 20, 255), font=FS)
    blocks.append(sheet2)

    # 3) the two backdrops with a composed scene at true relative sizes (knight box 600 units = 220 px on the
    #    1600 x 400 backdrop); feet stand on the path at y 350. Pony box 660 units, world goblin box 460 units.
    k = 220 / 600.0
    sc = Image.new("RGBA", (W, 2 * 610), bgc)
    for r, (bg_name, cast) in enumerate((
            ("backdrop_meadow", [("knight_walk_a", 300, 600), ("sheep_stand", 540, 460), ("lamb", 760, 340), ("sheep_graze", 1000, 460),
                                  (os.path.join(GAME, "rewards/art/castle/pony_eat.png"), 1250, 660)]),
            ("backdrop_village", [("villager_grandma_wave", 60, 600), ("villager_child_wave", 230, 600), ("knight_carry_basket", 470, 600),
                                   ("knight_bop_raise", 720, 600), (os.path.join(GAME, "world/art/castle/goblin_oops.png"), 960, 460),
                                   ("villager_farmer_stand", 1300, 600)]))):
        canvas = load(bg_name).copy()
        for n, x, units in cast:
            im = Image.open(n).convert("RGBA") if os.path.isabs(n) else load(n)
            h = round(units * k)
            im = im.resize((max(1, round(im.width * h / im.height)), h), Image.LANCZOS)
            canvas.alpha_composite(im, (x, 352 - h))
        canvas = canvas.resize((W - 20, round(400 * (W - 20) / 1600)), Image.LANCZOS)
        sc.alpha_composite(canvas, (10, 5 + r * 610))
    blocks.append(sc)

    total = sum(b.height for b in blocks) + 10 * len(blocks)
    sheet = Image.new("RGBA", (W, total), bgc)
    y = 0
    for b in blocks:
        sheet.alpha_composite(b, (0, y))
        y += b.height + 10
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
        for n, (s, note) in sorted(res.items()):
            print("%-28s %7d bytes  %s" % (n + ".png", s, note))
        big = [n for n, (s, _) in res.items() if s >= LIMIT]
        if big:
            print("OVER 150 KB: %s" % ", ".join(big))
    have = sorted(n + ".png" for n in names if os.path.exists(os.path.join(OUT_DIR, n + ".png")))
    with open(os.path.join(OUT_DIR, "manifest.json"), "w", encoding="utf-8") as fh:
        json.dump({"files": have}, fh, indent=1)
    contact_sheet(names)
    print("manifest: %d files; sheet: %s" % (len(have), SHEET))


if __name__ == "__main__":
    main()
