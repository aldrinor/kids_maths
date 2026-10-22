"""draw_castle_art.py - draws every picture of Kennedy's castle reward game ("Pony Stable") as SVG and renders PNGs.

Same drawing system as draw_cafe_art.py (it imports its Art class and helpers): soft gradient fills, a core
shadow, a soft top-left highlight, glossy eyes, blush and a warm dark-brown outline. The characters keep the
identity of modules/knight_art.js: the knight has a steel helmet with a raised visor, a tall blue plume, a blue
tunic with a gold star, a red cape and brown boots; the buddy knight has a red brush crest, a green tunic and a
round leaf shield; the pony is caramel with a cream mane and tail, a cream muzzle, a blue blanket with a gold star
and a brown saddle. The pony faces right.

Canvases and anchors the game code relies on (see the ART block in game/rewards/castle_pony_stable.js):
  knight_* / buddy_*  462 x 600, feet on y 596, centre x 231 (the same box as the cafe characters).
  pony_*, mud_spot_*, knight_ride*  700 x 660, hooves on y 652. The rider and the mud spots are drawn on the
                      pony's canvas, so the game stacks them in the same box. Saddle top at 300,365.
  castle_gate, drawbridge_closed, drawbridge_open  1000 x 900; the bridge hinge is the arch bottom, y 760;
                      the open bridge ends on the road at y 880; the arch opening is x 370..630, y 470..760.
  path_far 2000 x 900 (opaque sky), path_mid 3000 x 520, path_near 3600 x 360 (road; hooves on y 178).

Run:  python gh_site/tools/draw_castle_art.py [--only name1,name2] [--sheet-only]
Writes SVG sources to 16_kids_maths/work_tmp/art_src/castle/, PNGs to gh_site/game/rewards/art/castle/,
art/castle/manifest.json and the contact sheet work_tmp/art_src/castle_contact_sheet.png.
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
SRC_DIR = os.path.join(WORK_TMP, "art_src", "castle")
OUT_DIR = os.path.join(SITE, "game", "rewards", "art", "castle")
SHEET = os.path.join(WORK_TMP, "art_src", "castle_contact_sheet.png")
os.makedirs(SRC_DIR, exist_ok=True)
os.makedirs(OUT_DIR, exist_ok=True)

from PIL import Image  # noqa: E402
from playwright.sync_api import sync_playwright  # noqa: E402

from draw_cafe_art import (  # noqa: E402  (the shared drawing system)
    Art, INK, blush, cr_path, ell_pts, eye, f, line, limb_pts, mouth, optimise, rot_pt, rrect_d, star_pts)

# ------------------------------------------------------------------ palettes: (light, mid, shade-for-multiply)
SKIN = ("#fff3e6", "#ffdcc0", "#efc3a6")
SKIN2 = ("#fbe6cf", "#eac29a", "#dcb08c")
STEEL = ("#fbfdff", "#e3eaf3", "#b9c6d6")
STEEL_D = ("#e9eef5", "#c6d1de", "#a7b4c6")
MAIL = ("#eef2f6", "#cfd8e3", "#b2bdcc")
BLUE = ("#b3cbff", "#5b8cf2", "#5577cc")
BLUE_D = ("#8fa9e6", "#2d4a8a", "#2a3f74")
GREEN = ("#c9f3c3", "#62c987", "#5aa97c")
RED = ("#ffb0ad", "#e8506a", "#cc4f6c")
GOLD = ("#fff4c4", "#f3c650", "#d9a640")
BROWN = ("#c29470", "#7a5236", "#6b4630")
WOOD = ("#e6bf8c", "#b07a4a", "#9a6a40")
PONY = ("#f6c995", "#cf8f55", "#b98048")
MANE = ("#fffdf6", "#f4e6c8", "#e4d0aa")
MUZZLE = ("#fff7ea", "#fde6c8", "#ecd0ae")
HOOF = ("#9a7660", "#5e4232", "#4e3628")
APPLE = ("#ffa9b6", "#e8506a", "#c23d5a")
LEAF = ("#d6f5c8", "#7cc47a", "#6aa86c")
STONE = ("#e3e8ee", "#b3bcc8", "#9aa4b2")
IRIS_K = ("#b88a64", "#5e3c24", "#2e1d12")
IRIS_B = ("#9d8a6a", "#4f3a26", "#251a10")
IRIS_P = ("#b98a5c", "#5c3a22", "#2a1a10")
KW, KH = 462, 600
PW, PH = 700, 660
RIDE_T = (147.5, 21.8, 0.66)  # knight canvas -> pony canvas: translate x, y, scale (seat 231,520 -> saddle 300,365)


def mail_fill(A):
    """A soft chain-mail ring pattern (used as inner content of sleeves and legs)."""
    pid = A.uid("mail")
    A.defs.append('<pattern id="%s" width="16" height="13" patternUnits="userSpaceOnUse">'
                  '<path d="M1 7 q7 -8 14 0" fill="none" stroke="#8f9cb0" stroke-width="2.2" opacity=".55"/>'
                  '<path d="M-7 13 q7 -8 14 0 M9 13 q7 -8 14 0" fill="none" stroke="#8f9cb0" stroke-width="2.2" opacity=".55"/></pattern>' % pid)
    return "url(#%s)" % pid


# ------------------------------------------------------------------ the knight and the buddy knight (462 x 600)
def hand(A, x, y, pal, open_=False, rot=0):
    out = A.ellipse(x, y, 25, 24, pal, rot=rot, sw=5)
    if open_:
        tx, ty = rot_pt((x - 22, y + 4), (x, y), rot)
        out += A.ellipse(tx, ty, 10, 13, pal, rot=rot - 30, sw=4.5, hl=0)
        for k in (-11, 0, 11):
            a, b = rot_pt((x + k, y - 22), (x, y), rot), rot_pt((x + k, y - 12), (x, y), rot)
            out += line("M%s %s L%s %s" % (f(a[0]), f(a[1]), f(b[0]), f(b[1])), 3, op=0.55)
    return out


def boot(A, x, toe):
    """A chunky brown boot standing on y 596; toe = -1 points left, 1 right."""
    pts = [(x - 26, 556), (x + 26, 556), (x + 30, 578), (x + 26 + toe * 10, 596), (x - 26 + toe * 10, 596), (x - 32, 580)]
    if toe > 0:
        pts = [(x - 26, 556), (x + 26, 556), (x + 34, 574), (x + 44, 586), (x + 40, 597), (x - 28, 597), (x - 32, 580)]
    else:
        pts = [(x - 26, 556), (x + 26, 556), (x + 32, 580), (x + 28, 597), (x - 40, 597), (x - 44, 586), (x - 34, 574)]
    cuff = '<rect x="%s" y="550" width="70" height="12" fill="#f3e2c6" opacity=".9"/>' % f(x - 35)
    return A.poly(pts, BROWN, sw=5, inner=cuff, hl=0.35)


def ride_boot(A, x, y):
    pts = [(x - 24, y - 40), (x + 24, y - 40), (x + 30, y - 18), (x + 46, y - 8), (x + 42, y + 4), (x - 26, y + 4), (x - 30, y - 16)]
    cuff = '<rect x="%s" y="%s" width="70" height="12" fill="#f3e2c6" opacity=".9"/>' % (f(x - 35), f(y - 46))
    return A.poly(pts, BROWN, sw=5, inner=cuff, hl=0.35)


ARMS_K = {
    "idle": (((180, 352), (148, 410), (160, 466)), ((282, 352), (314, 410), (302, 466))),
    "cheer": (((180, 352), (120, 324), (104, 240)), ((282, 352), (342, 324), (358, 240))),
    "wave": (((180, 352), (148, 410), (160, 466)), ((282, 352), (340, 322), (356, 238))),
    "ride": (((182, 352), (184, 432), (262, 452)), ((280, 352), (322, 420), (300, 452))),
    "ride_cheer": (((182, 352), (184, 432), (262, 452)), ((282, 352), (346, 312), (360, 230))),
}


def knight_body(A, who, pose):
    """Draws the knight (who = knight) or the buddy knight (who = buddy) in 462 x 600 coordinates."""
    buddy = who == "buddy"
    ride = pose.startswith("ride")
    skin = SKIN2 if buddy else SKIN
    tunic = GREEN if buddy else BLUE
    happy = pose in ("cheer", "ride_cheer")
    talk = pose in ("cheer", "wave", "ride_cheer")
    look = 0.9 if ride else 0.0
    fdx = 8 if ride else 0
    out = ""

    # cape (behind everything)
    if ride:
        cape = [(196, 336), (160, 380), (112, 430), (66, 470), (52, 500), (84, 506), (108, 496), (136, 512), (168, 498), (210, 470), (262, 420), (270, 336)]
    else:
        cape = [(184, 334), (156, 410), (134, 500), (120, 560), (146, 566), (172, 556), (200, 568), (231, 560), (262, 568), (290, 556), (316, 566), (342, 560), (328, 500), (306, 410), (278, 334)]
    out += A.poly(cape, RED, sw=5, hl=0.25, inner=line("M200 380 Q180 470 166 548 M262 380 Q282 470 296 548" if not ride else "M190 380 Q150 430 100 480", 3.5, "#ffd3d0", 0.5))

    # legs and boots
    mp = mail_fill(A)
    if ride:
        leg = limb_pts((236, 512), (318, 528), (300, 610), 26, 22)
        out += A.poly(leg, MAIL, sw=5, inner='<rect x="200" y="480" width="160" height="160" fill="%s"/>' % mp)
        out += ride_boot(A, 302, 640)
    else:
        for s, c, p, toe in (((206, 520), (203, 548), (201, 566), -1), ((256, 520), (259, 548), (261, 566), 1)):
            out += A.poly(limb_pts(s, c, p, 23, 22), MAIL, sw=5, inner='<rect x="150" y="500" width="170" height="90" fill="%s"/>' % mp)
            out += boot(A, p[0], toe)

    # tunic with the gold star, the belt and buckle (clipped inside the tunic)
    bottom = 534 if ride else 552
    torso = [(186, 330), (166, 362), (156, 412), (152, 462), (151, 508), (164, bottom - 14), (200, bottom), (231, bottom + 2)]
    torso = torso + [(2 * 231 - x, y) for x, y in torso[-2::-1]]
    star = A.poly(star_pts(231, 420, 34, 15), GOLD, corners=tuple(range(0, 10, 2)), sw=4, hl=0.6)
    belt = ('<path d="M140 468 Q231 486 322 468 L322 496 Q231 514 140 496 Z" fill="%s" stroke="%s" stroke-width="4"/>' % (BROWN[1], INK) +
            '<rect x="211" y="470" width="40" height="36" rx="9" fill="%s" stroke="%s" stroke-width="4"/>' % (GOLD[1], INK) +
            '<rect x="221" y="480" width="20" height="16" rx="4" fill="%s"/>' % GOLD[0] +
            line("M150 %s Q231 %s 312 %s" % (bottom - 22, bottom - 4, bottom - 22), 4, "#fdf3dc", 0.55) +
            '<ellipse cx="231" cy="338" rx="100" ry="30" fill="#4a3046" opacity=".24" filter="%s"/>' % A.blur(10))
    out += A.poly(torso, tunic, sw=5.2, inner=belt)
    out += star

    # arms (the shield arm of the buddy carries his round leaf shield)
    arms = ARMS_K["ride" if pose == "ride" else pose if pose in ARMS_K else "idle"]
    raised = []
    for idx, (s, c, p) in enumerate(arms):
        up = p[1] < 300
        arm = A.poly(limb_pts(s, c, p, 24, 21), MAIL, sw=5, inner='<rect x="60" y="200" width="340" height="300" fill="%s"/>' % mp)
        arm += A.ellipse(s[0] + (c[0] - s[0]) * 0.12, s[1] + 4, 30, 24, tunic, sw=5, hl=0.4)  # a little tunic sleeve cap
        rot = 0 if not up else (-18 if idx == 0 else 18)
        arm += hand(A, p[0], p[1] - (8 if up else 0), skin, open_=up, rot=rot)
        if up:
            raised.append(arm)
        else:
            out += arm
    if buddy:
        # the round wooden shield with a green leaf, held on the left hand
        sx, sy = 140, 470
        out += A.ellipse(sx, sy, 62, 64, WOOD, sw=5.2, hl=0.45,
                         inner='<circle cx="%d" cy="%d" r="50" fill="none" stroke="#eef2f6" stroke-width="6" opacity=".85"/>' % (sx, sy))
        leaf = [(sx, sy - 34), (sx + 24, sy - 10), (sx + 18, sy + 22), (sx, sy + 36), (sx - 18, sy + 22), (sx - 24, sy - 10)]
        out += A.poly(leaf, GREEN, corners=(0, 3), sw=4, hl=0.5, inner=line("M%d %d L%d %d" % (sx, sy - 26, sx, sy + 28), 3, "#effbe8", 0.8))
    if ride:
        # reins from the hands, drooping forward to the pony's bridle ring (pony-canvas 530,316 is knight-canvas 580,446)
        out += line("M262 452 Q420 500 572 448", 8, INK) + line("M262 452 Q420 500 572 448", 4, BROWN[1])

    # head: plume or crest behind the helmet
    if buddy:
        crest = [(176, 122), (178, 84), (202, 54), (231, 44), (260, 54), (284, 84), (286, 122), (231, 104)]
        out += A.poly(crest, RED, sw=5, hl=0.5, inner=line("M206 100 Q206 70 231 58 M231 96 L231 58 M256 100 Q256 70 231 58", 3.5, "#ffe6e2", 0.7))
    else:
        f1 = [(238, 106), (248, 64), (284, 26), (346, 6), (334, 30), (310, 56), (290, 90), (266, 114)]
        f2 = [(222, 108), (220, 70), (238, 34), (270, 18), (262, 42), (252, 76), (246, 110)]
        out += A.poly(f2, ("#d6e4ff", "#86aaf6", "#6e8fd8"), sw=4.5, hl=0.4)
        out += A.poly(f1, BLUE, sw=5, hl=0.5, inner=line("M256 104 Q280 52 336 16", 3.5, "#e3ecff", 0.85))
    # helmet dome
    out += A.ellipse(231, 222, 150, 134, STEEL, sw=5.4, hl=0.75, hlpos=(0.3, 0.2), hlsize=(0.22, 0.14))
    # face opening: blush is clipped inside it
    blushes = blush(A, 151 + fdx, 300) + blush(A, 311 + fdx, 300)
    out += A.ellipse(231 + fdx * 0.5, 262, 114, 90, skin, sw=5, hl=0.25, inner=blushes)
    eyes = "happy" if happy else "open"
    out += eye(A, 186 + fdx, 266, eyes, False, IRIS_B if buddy else IRIS_K, rx=24, ry=29, look=look)
    out += eye(A, 276 + fdx, 266, eyes, False, IRIS_B if buddy else IRIS_K, rx=24, ry=29, look=look)
    out += '<ellipse cx="%s" cy="294" rx="8" ry="5.5" fill="#e9a68c"/>' % f(231 + fdx)
    if talk:
        out += mouth("knight", "open", 231 + fdx, 308)
    else:
        out += line("M%s 310 Q%s 326 %s 310" % (f(215 + fdx), f(231 + fdx), f(247 + fdx)), 5)
    # the raised visor, its gold hinge rivets, the knob and ridge
    out += A.shape("M100 236 Q231 92 362 236 Q231 168 100 236 Z", (100, 130, 262, 106), STEEL_D, sw=5, hl=0.6, hlpos=(0.4, 0.3))
    out += line("M150 200 Q231 150 312 200", 3.5, "#fdfeff", 0.6)
    out += A.ellipse(104, 232, 12, 12, GOLD, sw=4, hl=0.6) + A.ellipse(358, 232, 12, 12, GOLD, sw=4, hl=0.6)
    out += line("M231 104 L231 134", 6, "#a7b4c6")
    out += A.ellipse(231, 96, 15, 14, GOLD, sw=4.2, hl=0.7)
    if buddy:
        out += A.ellipse(231, 150, 9, 9, GREEN, sw=3.6)
    out += "".join(raised)
    return out


def knight_svg(who, pose):
    A = Art(KW, KH)
    lift = 14 if pose == "cheer" else 0
    body = knight_body(A, who, pose)
    return A.svg('<g transform="translate(0 %d)">%s</g>' % (-lift, body))


# ------------------------------------------------------------------ the pony (700 x 660, faces right)
LEGS_P = {  # (far back, far front, near back, near front): (hip, knee control, hoof)
    "stand": (((202, 520), (199, 590), (196, 626)), ((424, 520), (426, 590), (428, 626)),
              ((236, 530), (234, 592), (232, 626)), ((456, 530), (458, 592), (460, 626))),
    "walk_a": (((202, 520), (222, 586), (236, 626)), ((424, 520), (410, 586), (396, 626)),
               ((236, 530), (214, 590), (192, 622)), ((456, 530), (486, 586), (500, 620))),
    "walk_b": (((202, 520), (182, 586), (166, 622)), ((424, 520), (452, 580), (466, 616)),
               ((236, 530), (256, 590), (270, 626)), ((456, 530), (446, 588), (432, 626))),
    "jump": (((202, 520), (160, 556), (120, 574)), ((424, 520), (480, 534), (470, 572)),
             ((236, 530), (190, 568), (148, 590)), ((456, 530), (514, 546), (500, 586))),
}


def pony_leg(A, s, c, p, far):
    pal = ("#e8b886", "#bb7c45", "#a46c3a") if far else PONY
    sock = '<ellipse cx="%s" cy="%s" rx="40" ry="22" fill="%s"/>' % (f(p[0]), f(p[1] - 6), MANE[1])
    out = A.poly(limb_pts(s, c, p, 30, 25), pal, sw=5.2, inner=sock, hl=0.3)
    a = math.degrees(math.atan2(p[1] - c[1], p[0] - c[0])) - 90
    hx, hy = p[0] + math.cos(math.radians(a + 90)) * 16, p[1] + math.sin(math.radians(a + 90)) * 16
    pts = [rot_pt(q, (hx, hy), a) for q in ((hx - 27, hy - 12), (hx + 27, hy - 12), (hx + 30, hy + 12), (hx - 30, hy + 12))]
    out += A.poly(pts, HOOF, sw=5, hl=0.35)
    return out


def mane_tuft(A, x, y, rx, ry, rot):
    return A.ellipse(x, y, rx, ry, MANE, rot=rot, sw=5, hl=0.55, inner=line("M%s %s q%s %s %s %s" % (f(x - rx * 0.4), f(y - ry * 0.3), f(rx * 0.3), f(ry * 0.4), f(rx * 0.2), f(ry * 0.9)), 3, "#e8d6b0", 0.8))


def pony_head(A, pose):
    """The pony's neck mane, neck, head, ears, face and bridle."""
    happy = pose in ("happy", "shake")
    eat = pose == "eat"
    out = ""
    # mane tufts down the back of the neck (behind the neck)
    tufts = [(440, 236, 46, 34, -40), (414, 286, 44, 36, -60), (400, 340, 42, 36, -70), (398, 392, 40, 34, -80)]
    if pose == "shake":
        tufts = [(426, 232, 50, 34, -20), (392, 276, 50, 36, -40), (372, 330, 46, 36, -50), (372, 386, 42, 34, -60)]
    for t in tufts:
        out += mane_tuft(A, *t)
    # far ear
    out += A.poly([(506, 218), (536, 150), (548, 224)], PONY, corners=(1,), sw=5)
    # neck
    out += A.poly([(392, 470), (402, 400), (426, 330), (462, 282), (530, 296), (540, 360), (512, 430), (486, 500), (430, 520)], PONY, sw=5.2, hl=0.3)
    # head and muzzle
    head_in = blush(A, 470, 352, strong=happy)
    out += A.poly(ell_pts(500, 302, 108, 98, 30, -8), PONY, sw=5.4, hl=0.6, inner=head_in, hlpos=(0.3, 0.2))
    out += A.ellipse(568, 354, 64, 50, MUZZLE, rot=-8, sw=5, hl=0.5)
    out += '<ellipse cx="604" cy="340" rx="7" ry="10" fill="%s" opacity=".85" transform="rotate(-20 604 340)"/>' % INK
    if eat:
        out += line("M548 384 Q566 396 586 388", 5)
        # the apple held in the lips, with its stem and leaf so it reads as an apple
        out += A.ellipse(606, 404, 28, 25, APPLE, sw=4.5, hl=0.7)
        out += line("M610 382 Q612 370 618 362", 6, INK) + line("M610 382 Q612 370 618 362", 3, "#8a5e3b")
        out += A.poly([(616, 366), (636, 352), (652, 360), (632, 372)], LEAF, corners=(0, 2), sw=3.6, hl=0.4)
        out += '<ellipse cx="536" cy="372" rx="20" ry="14" fill="%s" opacity=".55" filter="%s"/>' % (PONY[0], A.blur(4))
    elif happy:
        d = "M548 380 Q574 384 600 374 Q594 408 572 410 Q552 406 548 380 Z"
        out += '<path d="%s" fill="#a8445a" stroke="%s" stroke-width="4.5" stroke-linejoin="round"/>' % (d, INK)
        out += '<ellipse cx="574" cy="402" rx="13" ry="6" fill="#f58ea5"/>'
    else:
        out += line("M550 384 Q574 398 598 380", 5)
    # bridle: a noseband and a cheek strap with a gold ring
    out += line("M528 312 Q532 360 546 402", 11, INK) + line("M528 312 Q532 360 546 402", 6, "#4f7bd6")
    out += line("M466 222 Q494 262 528 312", 9, INK) + line("M466 222 Q494 262 528 312", 4.5, "#4f7bd6")
    out += A.ellipse(530, 316, 11, 11, GOLD, sw=4, hl=0.7)
    # eye
    emode = "happy" if happy else ("calm" if eat else "open")
    out += eye(A, 488, 284, emode, True, IRIS_P, rx=29, ry=35, look=0.5, side=-1)
    # near ear (pink inside), forelock
    ear = [(452, 226), (458, 146), (504, 214)]
    out += A.poly(ear, PONY, corners=(1,), sw=5.2, inner='<path d="M462 214 L464 170 L490 210 Z" fill="#ffc2cf"/>')
    out += mane_tuft(A, 484, 212, 34, 24, -20) + mane_tuft(A, 512, 206, 28, 20, 10)
    return out


def pony_svg(pose, A=None):
    A = A or Art(PW, PH)
    legs = LEGS_P.get(pose, LEGS_P["stand"])
    out = ""
    # tail (behind)
    if pose in ("happy", "shake"):
        tail = [(170, 420), (120, 384), (80, 384), (54, 420), (56, 470), (76, 462), (100, 448), (130, 452), (166, 470)]
    elif pose == "jump":
        tail = [(170, 420), (120, 410), (70, 420), (26, 444), (40, 470), (80, 470), (124, 470), (166, 470)]
    elif pose == "walk_b":
        tail = [(170, 420), (126, 420), (96, 452), (86, 510), (98, 572), (116, 560), (122, 520), (138, 488), (166, 470)]
    else:
        tail = [(170, 420), (124, 418), (92, 450), (76, 506), (82, 572), (102, 594), (112, 552), (124, 512), (144, 486), (166, 470)]
    out += A.poly(tail, MANE, sw=5.2, hl=0.5, inner=line("M140 440 Q104 470 98 540 M150 456 Q124 490 118 540", 3.2, "#e8d6b0", 0.8))
    # far legs, body, near legs
    out += pony_leg(A, *legs[0], far=True) + pony_leg(A, *legs[1], far=True)
    body = ell_pts(312, 462, 182, 100, 32, -3)
    out += A.poly(body, PONY, sw=5.4, hl=0.55, hlpos=(0.3, 0.18), hlsize=(0.3, 0.16))
    out += pony_leg(A, *legs[2], far=False) + pony_leg(A, *legs[3], far=False)
    # blanket with a gold trim and star, then the saddle
    trim = line("M214 470 Q304 496 394 470", 6, GOLD[1]) + line("M214 470 Q304 496 394 470", 2.2, "#fff6d0", 0.8)
    out += A.poly([(214, 386), (300, 372), (388, 386), (398, 436), (390, 482), (300, 498), (216, 484), (206, 436)], BLUE, sw=5, hl=0.4, inner=trim)
    out += A.poly(star_pts(302, 440, 26, 11), GOLD, corners=tuple(range(0, 10, 2)), sw=3.8, hl=0.6)
    out += A.poly([(244, 384), (256, 360), (300, 366), (344, 358), (358, 382), (300, 394)], BROWN, sw=5, hl=0.5)
    # neck and head (rotated down to eat, tilted when shaking the mane)
    head = pony_head(A, pose)
    if pose == "eat":
        head = '<g transform="rotate(30 400 400)">%s</g>' % head
    elif pose == "shake":
        head = '<g transform="rotate(-6 430 470)">%s</g>' % head
        head += line("M330 250 q-24 20 -20 50 M318 214 q-34 14 -38 46", 4, "#e4d0aa", 0.85)
    elif pose == "jump":
        head = '<g transform="rotate(-4 430 470)">%s</g>' % head
    out += head
    return A.svg(out) if A.w == PW else out


def mud_svg(k):
    """One soft mud patch on the pony's canvas (the game fades each one out when it is brushed)."""
    A = Art(PW, PH)
    spots = {1: (236, 470, 46, 34, 1), 2: (352, 512, 42, 28, 2), 3: (452, 424, 30, 40, 3)}
    x, y, rx, ry, seed = spots[k]
    pts = []
    for i in range(14):
        t = 2 * math.pi * i / 14
        r = 1 + 0.16 * math.sin(i * 2.3 + seed) + 0.1 * math.cos(i * 3.7 + seed)
        pts.append((x + rx * r * math.cos(t), y + ry * r * math.sin(t)))
    mud = ("#b8916a", "#a07850", "#8a6440")
    out = '<g opacity=".8">' + A.poly(pts, mud, sw=3, outline=False, hl=0.3)
    out += '<path d="%s" fill="none" stroke="#7a5638" stroke-width="5" opacity=".45" filter="%s"/>' % (cr_path(pts), A.blur(2))
    for dx, dy, r in ((rx + 12, -6, 8), (-rx - 8, 10, 6), (8, ry + 10, 7), (-14, -ry - 8, 5)):
        out += A.ellipse(x + dx, y + dy, r, r * 0.85, mud, sw=2.6, outline=False, hl=0.3)
    out += "</g>"
    return A.svg(out)


def ride_svg(pose):
    """The knight sitting on the saddle, on the pony's canvas (stacked over pony_*)."""
    A = Art(PW, PH)
    tx, ty, s = RIDE_T
    return A.svg('<g transform="translate(%s %s) scale(%s)">%s</g>' % (tx, ty, s, knight_body(A, "knight", pose)))


# ------------------------------------------------------------------ items
def soft_shadow(A, cx, cy, rx, ry, op=0.24):
    return '<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="#4a3046" opacity="%s" filter="%s"/>' % (f(cx), f(cy), f(rx), f(ry), op, A.blur(max(4, ry * 0.5)))


def brush_svg():
    A = Art(300, 240)
    out = soft_shadow(A, 150, 214, 110, 14)
    bristle = ""
    for i in range(11):
        x = 62 + i * 17.6
        bristle += A.ellipse(x, 168, 10, 24, MANE, sw=3.6, hl=0.4)
    out += '<g transform="rotate(-8 150 140)">' + bristle
    out += A.shape(rrect_d(48, 96, 204, 66, 30), (48, 96, 204, 66), WOOD, sw=5.2, hl=0.6,
                   inner=line("M70 118 Q150 104 230 118", 4, "#f6dcb4", 0.7))
    out += A.shape(rrect_d(96, 58, 108, 44, 20), (96, 58, 108, 44), BLUE, sw=4.8, hl=0.6)
    out += A.poly(star_pts(150, 128, 18, 8), GOLD, corners=tuple(range(0, 10, 2)), sw=3.4, hl=0.6)
    out += "</g>"
    return A.svg(out)


def apple_svg(k):
    A = Art(180, 190)
    tilt = {1: -6, 2: 8, 3: 0}[k]
    leaf_side = {1: 1, 2: -1, 3: 1}[k]
    out = soft_shadow(A, 90, 176, 58, 9)
    g = A.poly([(90, 62), (122, 50), (150, 70), (160, 110), (146, 152), (118, 172), (90, 166), (62, 172), (34, 152), (20, 110), (30, 70), (58, 50)],
               APPLE, sw=5, hl=0.85, hlpos=(0.3, 0.24), hlsize=(0.16, 0.12),
               inner='<ellipse cx="90" cy="70" rx="22" ry="10" fill="#a83250" opacity=".35" filter="%s"/>' % A.blur(4))
    stem = line("M90 66 Q92 44 100 30", 8, INK) + line("M90 66 Q92 44 100 30", 4, "#8a5e3b")
    lx = 100 + leaf_side * 4
    leaf = [(lx, 40), (lx + leaf_side * 26, 22), (lx + leaf_side * 52, 30), (lx + leaf_side * 30, 50)]
    lf = A.poly(leaf, LEAF, corners=(0, 2), sw=4, hl=0.5)
    out += '<g transform="rotate(%d 90 110)">%s%s%s</g>' % (tilt, g, stem, lf)
    return A.svg(out)


BASKET = ("#f2d39c", "#d29f5c", "#b88a50")


def basket_back_svg():
    A = Art(400, 300)
    out = soft_shadow(A, 200, 282, 170, 14)
    out += A.ellipse(200, 120, 168, 46, BASKET, sw=5.2, hl=0.3,
                     inner='<ellipse cx="200" cy="132" rx="150" ry="36" fill="#7a5236"/><ellipse cx="200" cy="140" rx="140" ry="28" fill="#5e3e28" opacity=".7"/>')
    # side handles
    for sx in (22, 378):
        out += A.ellipse(sx, 150, 20, 32, BASKET, sw=4.8, hl=0.3, inner='<ellipse cx="%d" cy="150" rx="8" ry="16" fill="#7a5236"/>' % sx)
    return A.svg(out)


def basket_front_svg():
    A = Art(400, 300)
    weave = ""
    for row in range(5):
        y = 150 + row * 24
        for col in range(11):
            x = 46 + col * 30 + (15 if row % 2 else 0)
            weave += '<ellipse cx="%d" cy="%d" rx="14" ry="9" fill="#e9bf80" stroke="#a87444" stroke-width="2.4"/>' % (x, y)
    d = "M32 124 Q200 172 368 124 L346 252 Q330 276 300 278 L100 278 Q70 276 54 252 Z"
    out = A.shape(d, (32, 124, 336, 154), BASKET, sw=5.2, hl=0.35, inner=weave)
    out += A.shape("M26 120 Q200 168 374 120 Q378 134 368 144 Q200 194 32 144 Q22 134 26 120 Z", (22, 120, 356, 74), ("#f8e2b8", "#ddb06c", "#c69a5c"), sw=5, hl=0.5)
    return A.svg(out)


def log_svg():
    A = Art(440, 220)
    out = soft_shadow(A, 220, 196, 200, 16)
    bark = "".join(line("M%d %d q30 %d 60 0" % (x, y, d), 4, "#6b4630", 0.55) for x, y, d in ((70, 92, 8), (150, 124, 10), (110, 156, 8), (210, 98, 9), (250, 150, 8), (300, 118, 10)))
    out += A.shape("M60 70 L360 70 Q392 70 392 130 Q392 190 360 190 L60 190 Z", (40, 70, 352, 120), WOOD, sw=5.4, hl=0.5, inner=bark)
    out += A.ellipse(60, 130, 40, 60, ("#fbe6c4", "#ecc890", "#d6ae78"), sw=5.2, hl=0.4,
                     inner="".join('<ellipse cx="60" cy="130" rx="%d" ry="%d" fill="none" stroke="#c99a62" stroke-width="3"/>' % (r * 0.66, r) for r in (16, 32, 46)))
    sprout = [(300, 72), (292, 40), (310, 20), (318, 46)]
    out += line("M304 72 Q304 52 310 36", 5, "#5aa05a")
    out += A.poly(sprout, LEAF, corners=(0, 2), sw=3.8, hl=0.5)
    out += A.poly([(312, 46), (340, 30), (352, 44), (322, 56)], LEAF, corners=(0, 2), sw=3.8, hl=0.5)
    return A.svg(out)


def tree_svg():
    A = Art(600, 760)
    out = soft_shadow(A, 300, 740, 170, 18)
    out += A.poly([(262, 740), (272, 560), (264, 430), (300, 420), (336, 430), (328, 560), (338, 740)], WOOD, sw=5.4, hl=0.4,
                  inner=line("M290 700 Q284 600 296 470 M314 690 Q320 600 312 520", 4, "#8a5e3b", 0.5))
    out += A.poly([(270, 520), (210, 470), (196, 440), (214, 432), (240, 470), (284, 490)], WOOD, sw=5, hl=0.3)
    # the canopy: a cloud of bumps
    bumps = []
    n = 13
    for i in range(n * 4):
        t = 2 * math.pi * i / (n * 4)
        k = [0.0, 0.75, 1.0, 0.75][i % 4]
        r = 1 + 0.09 * k
        bumps.append((300 + 270 * r * math.cos(t), 270 + 230 * r * math.sin(t)))
    spots = "".join('<ellipse cx="%d" cy="%d" rx="%d" ry="%d" fill="#a8dc90" opacity=".6"/>' % s for s in ((170, 170, 60, 34), (330, 120, 70, 36), (420, 250, 60, 32), (230, 330, 70, 34), (380, 380, 56, 28)))
    out += A.poly(bumps, ("#c8eeb0", "#79c06e", "#5e9e5c"), corners=tuple(range(0, n * 4, 4)), sw=5.6, hl=0.55, inner=spots, hlpos=(0.3, 0.2))
    # grass tufts at the foot
    for x in (220, 380):
        out += A.poly([(x - 30, 744), (x - 22, 712), (x - 8, 730), (x, 700), (x + 10, 728), (x + 24, 710), (x + 30, 744)], ("#c9eeb3", "#86c47a", "#6aa86c"), corners=(1, 3, 5), sw=4, hl=0.3)
    return A.svg(out)


def horseshoe_svg():
    A = Art(240, 240)
    d = ("M70 200 L50 120 Q40 50 120 46 Q200 50 190 120 L170 200 L134 200 L150 124 Q158 88 120 86 Q82 88 90 124 L106 200 Z")
    holes = "".join('<ellipse cx="%d" cy="%d" rx="3.5" ry="5" fill="#7a5220" opacity=".8" transform="rotate(%d %d %d)"/>' % (x, y, r, x, y) for x, y, r in ((72, 168, 10), (64, 128, 0), (78, 88, -30), (168, 168, -10), (176, 128, 0), (162, 88, 30)))
    out = soft_shadow(A, 120, 214, 80, 9)
    out += A.shape(d, (40, 46, 160, 154), GOLD, sw=6, hl=0.8, inner=holes, hlpos=(0.3, 0.15))
    return A.svg(out)


def jump_svg():
    A = Art(240, 240)
    out = soft_shadow(A, 120, 216, 86, 9)
    out += A.shape("M44 196 L196 196 Q210 196 210 180 Q210 166 196 166 L44 166 Z", (34, 166, 176, 30), WOOD, sw=5, hl=0.4)
    out += A.ellipse(44, 181, 13, 15, ("#fbe6c4", "#ecc890", "#d6ae78"), sw=4.4)
    arc = "M40 150 Q120 10 200 140"
    out += line(arc, 30, INK) + line(arc, 21, "#6fb86a") + line("M60 118 Q110 44 160 70", 6, "#d9f5cc", 0.8)
    out += A.poly([(214, 166), (170, 138), (222, 112)], ("#c9f3c3", "#6fb86a", "#5aa97c"), corners=(0, 1, 2), sw=5.4, hl=0.3)
    return A.svg(out)


def sparkle_svg():
    A = Art(120, 120)
    pts = []
    for k in range(8):
        r = 54 if k % 2 == 0 else 14
        a = math.radians(-90 + k * 45)
        pts.append((60 + r * math.cos(a), 60 + r * math.sin(a)))
    return A.svg(A.poly(pts, ("#fffbe8", "#ffe9a8", "#f0cf70"), corners=(0, 2, 4, 6), sw=4, hl=0.7))


def heart_svg():
    from draw_cafe_art import heart_d
    A = Art(120, 120)
    return A.svg(A.shape(heart_d(60, 58, 2.9), (10, 8, 100, 92), ("#ffc6d3", "#ee7f9c", "#d65f80"), sw=4.6, hl=0.8))


# ------------------------------------------------------------------ the castle gate and drawbridge (1000 x 900)
ARCH = "M370 760 L370 570 Q370 470 500 470 Q630 470 630 570 L630 760 Z"


def stone_lines(x0, y0, x1, y1, h=40, w=74, op=0.45):
    out = ""
    row = 0
    y = y0
    while y < y1:
        out += '<path d="M%d %d L%d %d" stroke="#8a94a1" stroke-width="3" opacity="%s"/>' % (x0, y, x1, y, op)
        x = x0 + (w // 2 if row % 2 else 0)
        while x < x1:
            out += '<path d="M%d %d L%d %d" stroke="#8a94a1" stroke-width="3" opacity="%s"/>' % (x, y, x, min(y + h, y1), op)
            x += w
        y += h
        row += 1
    return out


def castle_svg():
    A = Art(1000, 900)
    o = []
    # the moat (rounded) and the grass bank around the castle's foot
    o.append(A.shape("M30 830 Q30 774 120 772 L880 772 Q970 774 970 830 Q970 884 880 886 L120 886 Q30 884 30 830 Z", (30, 772, 940, 114),
                     ("#cfeaf2", "#8cc4dc", "#78acc6"), sw=4.5, hl=0.3,
                     inner=line("M120 820 q40 -10 80 0 q40 10 80 0 M640 840 q40 -10 80 0 q40 10 80 0 M760 808 q30 -8 60 0", 4, "#eef9fc", 0.7)))
    # wall between the towers, with merlons
    merl = "".join(rrect_d(x, 262, 52, 50, 8) + " " for x in range(212, 790, 76))
    o.append(A.shape(merl, (212, 262, 576, 50), STONE, sw=5, hl=0.4))
    o.append(A.shape("M200 300 L800 300 L800 790 L200 790 Z", (200, 300, 600, 490), STONE, sw=5.2, hl=0.35, inner=stone_lines(200, 340, 800, 790)))
    # towers
    for cx in (170, 830):
        o.append(A.shape(rrect_d(cx - 112, 230, 224, 570, 18), (cx - 112, 230, 224, 570), STONE, sw=5.4, hl=0.45, inner=stone_lines(cx - 112, 270, cx + 112, 800, w=64)))
        o.append(A.shape(rrect_d(cx - 128, 196, 256, 58, 14), (cx - 128, 196, 256, 58), ("#eef1f5", "#c3cbd6", "#a2acba"), sw=5, hl=0.4))
        o.append(A.poly([(cx - 138, 204), (cx - 90, 150), (cx - 40, 80), (cx, 26), (cx + 40, 80), (cx + 90, 150), (cx + 138, 204)], BLUE_D, corners=(0, 3, 6), sw=5.4, hl=0.6,
                        inner=line("M%d 190 Q%d 120 %d 50" % (cx - 70, cx - 40, cx - 4), 5, "#9fb6ea", 0.6)))
        o.append(line("M%d 30 L%d -10" % (cx, cx), 6))
        o.append(A.poly([(cx, -6), (cx + 64, 4), (cx + 56, 20), (cx + 66, 36), (cx, 30)], GOLD, corners=(0, 4), sw=4.2, hl=0.5))
        # warm arched window
        o.append(A.shape("M%d 470 L%d 410 Q%d 370 %d 370 Q%d 370 %d 410 L%d 470 Z" % (cx - 34, cx - 34, cx - 34, cx, cx + 34, cx + 34, cx + 34), (cx - 34, 370, 68, 100),
                         ("#fff6d6", "#ffe3a0", "#f0c878"), sw=4.6, hl=0.6, inner=line("M%d 372 L%d 470 M%d 420 L%d 420" % (cx, cx, cx - 34, cx + 34), 4, "#c99a62", 0.8)))
        o.append(A.shape(rrect_d(cx - 44, 468, 88, 16, 6), (cx - 44, 468, 88, 16), WOOD, sw=4, hl=0.3))
        for k, col in enumerate(("#f6a9bd", "#ffe08a", "#f6a9bd")):
            o.append('<circle cx="%d" cy="462" r="9" fill="%s" stroke="%s" stroke-width="3"/>' % (cx - 26 + k * 26, col, INK))
    # the arch: an inside courtyard in warm light, then the stone ring
    A.defs.append('<clipPath id="archclip"><path d="%s"/></clipPath>' % ARCH)
    inside = ('<rect x="360" y="460" width="280" height="310" fill="%s"/>' % A.lin([(0, "#5c6a86"), (0.55, "#8a96ae"), (1, "#c9d6b8")], 0, 0, 0, 1) +
              '<ellipse cx="500" cy="760" rx="200" ry="90" fill="#bfe0a0"/>' +
              '<ellipse cx="500" cy="640" rx="120" ry="80" fill="#fff3c8" opacity=".55" filter="%s"/>' % A.blur(20))
    o.append('<g clip-path="url(#archclip)">%s</g>' % inside)
    ring = "M340 760 L340 566 Q340 440 500 440 Q660 440 660 566 L660 760 L630 760 L630 570 Q630 470 500 470 Q370 470 370 570 L370 760 Z"
    o.append(A.shape(ring, (340, 440, 320, 320), ("#f2f4f7", "#cfd6df", "#aab3c0"), sw=5, hl=0.4,
                     inner="".join(line("M%s %s L%s %s" % (f(500 + 130 * math.cos(math.radians(a))), f(570 - 130 * math.sin(math.radians(a))), f(500 + 160 * math.cos(math.radians(a))), f(570 - 160 * math.sin(math.radians(a)))), 3.5, "#8a94a1", 0.6) for a in range(10, 180, 24))))
    # a blue banner with the gold star above the arch
    o.append(A.poly([(450, 330), (550, 330), (550, 410), (500, 392), (450, 410)], BLUE, corners=(0, 1, 2, 3, 4), sw=5, hl=0.5))
    o.append(A.poly(star_pts(500, 362, 22, 9), GOLD, corners=tuple(range(0, 10, 2)), sw=3.6, hl=0.6))
    # chain holes
    for x in (338, 662):
        o.append('<circle cx="%d" cy="480" r="10" fill="#5e6878" stroke="%s" stroke-width="3.5"/>' % (x, INK))
    # grass at the foot of the towers (in front of the moat ends)
    for cx in (60, 940):
        o.append(A.poly([(cx - 60, 896), (cx - 50, 850), (cx - 30, 870), (cx - 16, 836), (cx, 864), (cx + 16, 830), (cx + 32, 866), (cx + 52, 846), (cx + 60, 896)],
                        ("#c9eeb3", "#86c47a", "#6aa86c"), corners=(1, 3, 5, 7), sw=4, hl=0.3))
    return A.svg("".join(o))


def chain(x0, y0, x1, y1):
    n = int(math.hypot(x1 - x0, y1 - y0) / 22)
    out = ""
    a = math.degrees(math.atan2(y1 - y0, x1 - x0))
    for i in range(n + 1):
        x = x0 + (x1 - x0) * i / n
        y = y0 + (y1 - y0) * i / n
        rot = a if i % 2 == 0 else a + 90
        out += '<ellipse cx="%s" cy="%s" rx="13" ry="7" fill="none" stroke="%s" stroke-width="8" transform="rotate(%s %s %s)"/>' % (f(x), f(y), INK, f(rot), f(x), f(y))
        out += '<ellipse cx="%s" cy="%s" rx="13" ry="7" fill="none" stroke="#9aa6b6" stroke-width="4" transform="rotate(%s %s %s)"/>' % (f(x), f(y), f(rot), f(x), f(y))
    return out


def bridge_closed_svg():
    A = Art(1000, 900)
    planks = "".join('<path d="M%d 460 L%d 770" stroke="#8a5e3b" stroke-width="4" opacity=".7"/>' % (x, x) for x in range(402, 630, 34))
    bands = "".join('<rect x="360" y="%d" width="280" height="18" fill="#7d8796"/>' % y + "".join('<circle cx="%d" cy="%d" r="5" fill="#d6dde6"/>' % (x, y + 9) for x in range(388, 630, 48)) for y in (560, 690))
    out = A.shape(ARCH, (370, 470, 260, 290), WOOD, sw=5.4, hl=0.5, inner=planks + bands)
    out += A.ellipse(500, 640, 22, 22, GOLD, sw=4.4, hl=0.7)
    out += chain(338, 480, 382, 580) + chain(662, 480, 618, 580)
    return A.svg(out)


def bridge_open_svg():
    A = Art(1000, 900)
    planks = "".join('<path d="M300 %d L700 %d" stroke="#8a5e3b" stroke-width="4" opacity=".7"/>' % (y, y) for y in range(782, 880, 22))
    out = A.shape("M370 760 L630 760 L668 880 L332 880 Z", (332, 760, 336, 120), WOOD, sw=5.4, hl=0.45, inner=planks)
    out += A.shape("M326 878 L674 878 L674 894 L326 894 Z", (326, 878, 348, 16), ("#d8a86e", "#9a6a40", "#7a5236"), sw=4.6, hl=0.2)
    out += chain(338, 480, 340, 872) + chain(662, 480, 660, 872)
    return A.svg(out)


# ------------------------------------------------------------------ backgrounds
def cloud(A, x, y, s, op=0.95):
    return ('<g opacity="%s">' % op) + "".join('<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="#fbfcfd"/>' % (f(x + dx * s), f(y + dy * s), f(rx * s), f(ry * s))
                                              for dx, dy, rx, ry in ((0, 0, 70, 30), (-50, 10, 46, 22), (52, 8, 50, 24), (10, -22, 44, 28))) + "</g>"


def round_tree(A, x, y, s, soft=True):
    o = A.shape(rrect_d(x - 9 * s, y - 10 * s, 18 * s, 60 * s, 6 * s), (x - 9 * s, y - 10 * s, 18 * s, 60 * s), WOOD, sw=4 if soft else 5, hl=0.2)
    o += A.ellipse(x, y - 40 * s, 52 * s, 46 * s, ("#cdeeb8", "#86c47a", "#6aa86c"), sw=4 if soft else 5, hl=0.5)
    return o


def stable_bg_svg():
    A = Art(1600, 900)
    soft = 3.6
    o = ['<rect width="1600" height="900" fill="%s"/>' % A.lin([(0, "#dfe9f3"), (0.55, "#ecf1f2"), (1, "#f5efe2")], 0, 0, 0, 1)]
    o.append('<ellipse cx="300" cy="140" rx="260" ry="160" fill="#fff6dc" opacity=".8" filter="%s"/>' % A.blur(40))
    o.append(cloud(A, 260, 150, 1.2) + cloud(A, 1240, 110, 1.0) + cloud(A, 820, 70, 0.8, 0.8))
    # far hills and the castle far away on the right hill (where the ride goes)
    o.append('<path d="M0 470 Q240 360 520 430 Q800 350 1100 420 Q1360 330 1600 400 L1600 900 L0 900 Z" fill="%s"/>' % A.lin([(0, "#cfe3c4"), (1, "#b7d6a8")], 0, 0, 0, 1))
    cx = 1420
    o.append('<g opacity=".8">' + A.shape("M%d 380 L%d 300 L%d 300 L%d 330 L%d 330 L%d 300 L%d 300 L%d 380 Z" % (cx - 70, cx - 70, cx - 40, cx - 40, cx + 40, cx + 40, cx + 70, cx + 70),
                                           (cx - 70, 300, 140, 80), ("#e3e8ee", "#c3cad4", "#a9b3c0"), sw=3, hl=0.3) +
             A.poly([(cx - 78, 304), (cx - 55, 262), (cx - 32, 304)], BLUE_D, corners=(0, 1, 2), sw=3) + A.poly([(cx + 32, 304), (cx + 55, 262), (cx + 78, 304)], BLUE_D, corners=(0, 1, 2), sw=3) + "</g>")
    o.append('<path d="M0 560 Q300 470 640 520 Q980 470 1300 520 Q1460 500 1600 520 L1600 900 L0 900 Z" fill="%s"/>' % A.lin([(0, "#bcdca8"), (1, "#a4cf92")], 0, 0, 0, 1))
    for x, y, s in ((120, 540, 1.0), (1500, 530, 1.1), (1300, 520, 0.8)):
        o.append(round_tree(A, x, y, s))
    # the stable: wooden walls, a blue roof, an open stall door with hay inside, windows with flower boxes
    wall = "".join('<path d="M%d 330 L%d 650" stroke="#8a5e3b" stroke-width="3" opacity=".45"/>' % (x, x) for x in range(420, 1200, 40))
    o.append(A.shape("M400 330 L1200 330 L1200 650 L400 650 Z", (400, 330, 800, 320), ("#e9c296", "#c9935e", "#ad7c4c"), sw=soft, hl=0.3, inner=wall))
    o.append(A.poly([(370, 344), (480, 230), (800, 150), (1120, 230), (1230, 344)], BLUE_D, corners=(0, 2, 4), sw=4.2, hl=0.5,
                    inner="".join('<path d="M360 %d L1240 %d" stroke="#1b2f61" stroke-width="3" opacity=".4"/>' % (y, y) for y in range(200, 344, 28))))
    o.append(A.ellipse(800, 238, 34, 34, ("#fff6d6", "#ffe3a0", "#f0c878"), sw=3.6, hl=0.5, inner=line("M800 206 L800 270 M768 238 L832 238", 4, "#c99a62", 0.8)))
    o.append(A.shape("M690 650 L690 450 Q690 400 800 400 Q910 400 910 450 L910 650 Z", (690, 400, 220, 250), ("#7a5a42", "#5a3b22", "#4a3020"), sw=soft, hl=0.0,
                     inner='<ellipse cx="800" cy="660" rx="140" ry="60" fill="#e9c97a"/><ellipse cx="800" cy="520" rx="90" ry="70" fill="#ffe7a8" opacity=".25" filter="%s"/>' % A.blur(18)))
    o.append(A.shape("M672 650 L672 448 Q672 382 800 382 Q928 382 928 448 L928 650 L910 650 L910 452 Q910 400 800 400 Q690 400 690 452 L690 650 Z", (672, 382, 256, 268), ("#f6efe4", "#e2d6c4", "#cbbca6"), sw=soft, hl=0.3))
    o.append(A.shape("M760 368 Q800 330 840 368 L828 372 Q800 346 772 372 Z", (760, 330, 80, 42), GOLD, sw=3.2, hl=0.5))
    for wx in (500, 1020):
        o.append(A.shape(rrect_d(wx - 70, 410, 140, 110, 12), (wx - 70, 410, 140, 110), ("#e6f2f8", "#c7dfec", "#b0c8d8"), sw=soft, hl=0.5,
                         inner=line("M%d 410 L%d 520 M%d 465 L%d 465" % (wx, wx, wx - 70, wx + 70), 6, "#f6efe4")))
        o.append(A.shape(rrect_d(wx - 84, 518, 168, 30, 8), (wx - 84, 518, 168, 30), WOOD, sw=soft, hl=0.3))
        for k in range(5):
            o.append('<circle cx="%d" cy="512" r="12" fill="%s" stroke="%s" stroke-opacity=".7" stroke-width="2.6"/>' % (wx - 60 + k * 30, ("#f6a9bd", "#ffe08a", "#c9b6f2", "#f6a9bd", "#ffe08a")[k], INK))
    # fences on both sides
    for x0, x1 in ((0, 400), (1200, 1600)):
        for x in range(x0 + 20, x1, 90):
            o.append(A.shape(rrect_d(x, 560, 22, 110, 6), (x, 560, 22, 110), WOOD, sw=3.2, hl=0.3))
        o.append(A.shape(rrect_d(x0, 584, x1 - x0, 18, 6), (x0, 584, x1 - x0, 18), WOOD, sw=3.2, hl=0.3))
        o.append(A.shape(rrect_d(x0, 624, x1 - x0, 18, 6), (x0, 624, x1 - x0, 18), WOOD, sw=3.2, hl=0.3))
    # hay bales
    for x, y in ((180, 690), (300, 700), (240, 640)):
        o.append(A.shape(rrect_d(x - 70, y - 50, 140, 90, 22), (x - 70, y - 50, 140, 90), ("#fbe9b0", "#e8c46a", "#cfa850"), sw=soft, hl=0.5,
                         inner=line("M%d %d L%d %d M%d %d L%d %d" % (x - 34, y - 50, x - 34, y + 40, x + 34, y - 50, x + 34, y + 40), 5, "#c99a3a", 0.6)))
    # the yard: grass with a soft dirt patch in the middle
    o.append('<path d="M0 650 L1600 650 L1600 900 L0 900 Z" fill="%s"/>' % A.lin([(0, "#a9d394"), (1, "#7db86c")], 0, 0, 0, 1))
    o.append('<ellipse cx="800" cy="790" rx="560" ry="110" fill="%s"/>' % A.rad([(0, "#ecd6ac"), (0.7, "#e2c79a"), (1, "#e2c79a", 0)]))
    for x, y, c in ((120, 820, "#f6a9bd"), (300, 860, "#ffe08a"), (1360, 830, "#f6a9bd"), (1500, 870, "#c9b6f2"), (1240, 880, "#ffe08a"), (90, 760, "#c9b6f2")):
        o.append('<g>%s</g>' % "".join('<circle cx="%d" cy="%d" r="9" fill="%s" stroke="%s" stroke-opacity=".6" stroke-width="2.4"/>' % (x + dx, y + dy, c, INK) for dx, dy in ((0, -11), (11, 0), (0, 11), (-11, 0))) +
                 '<circle cx="%d" cy="%d" r="6" fill="#fff3c4"/>' % (x, y))
    # water trough
    o.append(A.shape(rrect_d(1330, 640, 200, 70, 14), (1330, 640, 200, 70), WOOD, sw=soft, hl=0.3, inner='<rect x="1340" y="640" width="180" height="14" fill="#9cd0e6"/>'))
    return A.svg("".join(o))


def path_far_svg():
    A = Art(2000, 900)
    o = ['<rect width="2000" height="900" fill="%s"/>' % A.lin([(0, "#e7eef5"), (0.6, "#d6e1ec"), (1, "#eef0e6")], 0, 0, 0, 1)]
    o.append('<ellipse cx="1500" cy="160" rx="300" ry="170" fill="#fff6dc" opacity=".75" filter="%s"/>' % A.blur(46))
    for x, y, s in ((200, 150, 1.3), (760, 100, 1.0), (1180, 190, 1.1), (1700, 120, 0.9), (1960, 210, 1.0)):
        o.append(cloud(A, x, y, s, 0.9))
    # soft mountains with snowy tops
    peaks = [(0, 520), (180, 330), (360, 470), (560, 300), (780, 460), (980, 340), (1200, 480), (1420, 310), (1640, 470), (1840, 350), (2000, 450)]
    # rounded peaks: a smooth curve through the peak points (closed far below the picture)
    pts = [(-100, 1100)] + peaks + [(2100, 1100)]
    d = cr_path(pts)
    mtn = A.lin([(0, "#cdd8e5"), (1, "#b3c1d2")], 0, 0, 0, 1)
    caps = ""
    for i in range(1, len(peaks) - 1, 2):
        x, y = peaks[i]
        caps += '<ellipse cx="%d" cy="%d" rx="70" ry="44" fill="#f4f7fa" opacity=".95"/>' % (x, y + 8)
    A.defs.append('<clipPath id="mtnclip"><path d="%s"/></clipPath>' % d)
    o.append('<path d="%s" fill="%s"/>' % (d, mtn))
    o.append('<g clip-path="url(#mtnclip)">%s</g>' % caps)
    o.append('<path d="%s" fill="none" stroke="%s" stroke-opacity=".3" stroke-width="3"/>' % (d, INK))
    o.append('<path d="M0 620 Q500 520 1000 600 Q1500 520 2000 600 L2000 900 L0 900 Z" fill="%s"/>' % A.lin([(0, "#cfe3c4"), (1, "#bcd8ae")], 0, 0, 0, 1))
    return A.svg("".join(o))


def path_mid_svg():
    A = Art(3000, 520)
    o = []
    d = "M0 160 Q300 60 600 140 Q900 220 1200 120 Q1500 40 1800 140 Q2100 220 2400 110 Q2700 50 3000 150 L3000 520 L0 520 Z"
    o.append(A.shape(d, (0, 40, 3000, 480), ("#cdecb6", "#a2d18c", "#8cbc7c"), sw=3.6, hl=0.15))
    o.append('<path d="M0 300 Q500 220 1000 290 Q1500 230 2000 300 Q2500 230 3000 290 L3000 520 L0 520 Z" fill="%s" stroke="%s" stroke-opacity=".3" stroke-width="3"/>' % (A.lin([(0, "#b4dc9c"), (1, "#98c886")], 0, 0, 0, 1), INK))
    for x, y, s in ((140, 170, 1.0), (420, 150, 1.25), (860, 220, 0.9), (1100, 160, 1.1), (1500, 100, 0.95), (1680, 170, 1.2), (2060, 220, 1.0), (2380, 150, 1.15), (2760, 120, 1.0), (2920, 180, 0.9)):
        o.append(round_tree(A, x, y + 10, s * 1.7))
    # a farm fence along the far side
    for x0 in (600, 1900):
        for x in range(x0, x0 + 460, 70):
            o.append(A.shape(rrect_d(x, 270, 14, 60, 4), (x, 270, 14, 60), WOOD, sw=3, hl=0.2))
        o.append(A.shape(rrect_d(x0 - 10, 284, 470, 10, 4), (x0 - 10, 284, 470, 10), WOOD, sw=3, hl=0.2))
    return A.svg("".join(o))


def path_near_svg():
    A = Art(3600, 360)
    o = []
    # far grass verge, the road, the near grass
    o.append('<path d="M0 30 Q600 10 1200 34 Q1800 14 2400 30 Q3000 12 3600 28 L3600 360 L0 360 Z" fill="%s"/>' % A.lin([(0, "#a9d394"), (1, "#8cc47a")], 0, 0, 0, 1))
    road = A.lin([(0, "#efdcb6"), (0.5, "#e4c99c"), (1, "#d7b886")], 0, 0, 0, 1)
    o.append('<path d="M0 92 Q900 80 1800 94 Q2700 82 3600 92 L3600 252 Q2700 262 1800 248 Q900 262 0 250 Z" fill="%s" stroke="%s" stroke-opacity=".45" stroke-width="3.5"/>' % (road, INK))
    for x in range(60, 3600, 230):
        y = 140 + (x * 37) % 80
        o.append('<ellipse cx="%d" cy="%d" rx="%d" ry="%d" fill="#c9a676" opacity=".55"/>' % (x, y, 10 + x % 9, 6 + x % 4))
        o.append('<ellipse cx="%d" cy="%d" rx="6" ry="4" fill="#f6ead0" opacity=".8"/>' % (x + 60, y + 30))
    o.append(line("M0 200 Q900 192 1800 204 Q2700 194 3600 202", 3, "#c9a676", 0.4))
    o.append('<path d="M0 262 Q900 252 1800 266 Q2700 254 3600 264 L3600 360 L0 360 Z" fill="%s"/>' % A.lin([(0, "#94cb80"), (1, "#7db86c")], 0, 0, 0, 1))
    # tufts on the far verge and flowers and bushes on the near grass
    for x in range(30, 3600, 140):
        y = 64 + (x * 13) % 12
        o.append(A.poly([(x - 22, y + 24), (x - 14, y), (x - 4, y + 16), (x + 4, y - 6), (x + 12, y + 14), (x + 22, y + 24)], ("#c9eeb3", "#86c47a", "#6aa86c"), corners=(1, 3), sw=3.2, hl=0.2))
    cols = ("#f6a9bd", "#ffe08a", "#c9b6f2", "#fbfcfd")
    for i, x in enumerate(range(80, 3600, 170)):
        y = 300 + (i * 29) % 40
        o.append("".join('<circle cx="%d" cy="%d" r="8" fill="%s" stroke="%s" stroke-opacity=".6" stroke-width="2.2"/>' % (x + dx, y + dy, cols[i % 4], INK) for dx, dy in ((0, -10), (10, 0), (0, 10), (-10, 0))) +
                 '<circle cx="%d" cy="%d" r="5" fill="#fff3c4"/>' % (x, y))
    for x in range(400, 3600, 900):
        o.append(A.poly([(x - 90, 360), (x - 96, 320), (x - 60, 290), (x - 10, 284), (x + 40, 292), (x + 84, 318), (x + 90, 360)], ("#c3e8ac", "#7cbb6c", "#62a05c"), sw=4, hl=0.4))
    return A.svg("".join(o))


# ------------------------------------------------------------------ jobs, render, contact sheet
def jobs():
    j = {}
    for pose in ("idle", "cheer"):
        j["knight_" + pose] = (lambda p=pose: knight_svg("knight", p), KW, KH)
    j["buddy_wave"] = (lambda: knight_svg("buddy", "wave"), KW, KH)
    j["knight_ride"] = (lambda: ride_svg("ride"), PW, PH)
    j["knight_ride_cheer"] = (lambda: ride_svg("ride_cheer"), PW, PH)
    for pose in ("stand", "happy", "eat", "shake", "walk_a", "walk_b", "jump"):
        j["pony_" + pose] = (lambda p=pose: pony_svg(p), PW, PH)
    for k in (1, 2, 3):
        j["mud_spot_%d" % k] = (lambda k=k: mud_svg(k), PW, PH)
        j["apple_%d" % k] = (lambda k=k: apple_svg(k), 180, 190)
    j["brush"] = (brush_svg, 300, 240)
    j["apple_basket"] = (basket_back_svg, 400, 300)
    j["apple_basket_front"] = (basket_front_svg, 400, 300)
    j["apple_tree"] = (tree_svg, 600, 760)
    j["log"] = (log_svg, 440, 220)
    j["go_horseshoe"] = (horseshoe_svg, 240, 240)
    j["jump_arrow"] = (jump_svg, 240, 240)
    j["sparkle"] = (sparkle_svg, 120, 120)
    j["heart"] = (heart_svg, 120, 120)
    j["castle_gate"] = (castle_svg, 1000, 900)
    j["drawbridge_closed"] = (bridge_closed_svg, 1000, 900)
    j["drawbridge_open"] = (bridge_open_svg, 1000, 900)
    j["stable_background"] = (stable_bg_svg, 1600, 900)
    j["path_far"] = (path_far_svg, 2000, 900)
    j["path_mid"] = (path_mid_svg, 3000, 520)
    j["path_near"] = (path_near_svg, 3600, 360)
    return j


OPAQUE = {"stable_background", "path_far"}
# pictures the game swaps or stacks on the pony: all of them get the same 256-colour treatment, so the pony's
# colours never shift a little when its pose changes (some poses need it to stay under 150 KB anyway)
SAME_COLOURS = ("pony_", "mud_spot_", "knight_ride")


def same_colours(path):
    im = Image.open(path).convert("RGBA")
    q = im.quantize(256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.FLOYDSTEINBERG)
    q.save(path, "PNG", optimize=True)
    return os.path.getsize(path), "256 colours"


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
            results[name] = optimise(shot, out, name in OPAQUE)
            if name.startswith(SAME_COLOURS) and results[name][1] == "full":
                results[name] = same_colours(out)
        br.close()
    return results


def contact_sheet(names):
    """Characters, items, then composed checks (pony + mud + rider; castle + bridge) and the backgrounds."""
    def load(n):
        p = os.path.join(OUT_DIR, n + ".png")
        return Image.open(p).convert("RGBA") if os.path.exists(p) else None
    cell, cols = 300, 8
    chars = [n for n in names if n.startswith(("knight_", "buddy_", "pony_"))]
    items = [n for n in names if n.startswith(("mud_", "apple", "brush", "log", "go_", "jump_", "sparkle", "heart"))]
    rows_c = math.ceil(len(chars) / cols)
    rows_i = math.ceil(len(items) / cols)
    hgt = 10 + rows_c * 330 + rows_i * cell + 420 + 560
    sheet = Image.new("RGBA", (cols * cell, hgt), (150, 150, 150, 255))
    y = 10
    for i, n in enumerate(chars):
        im = load(n)
        if im is None:
            continue
        im.thumbnail((cell - 10, 320))
        sheet.alpha_composite(im, (i % cols * cell + (cell - im.width) // 2, y + i // cols * 330 + (320 - im.height)))
    y += rows_c * 330
    for i, n in enumerate(items):
        im = load(n)
        if im is None:
            continue
        im.thumbnail((cell - 20, cell - 20))
        sheet.alpha_composite(im, (i % cols * cell + (cell - im.width) // 2, y + i // cols * cell + (cell - im.height) // 2))
    y += rows_i * cell
    # composed: muddy pony; pony with rider; walking with rider; castle closed; castle open
    combos = [["pony_stand", "mud_spot_1", "mud_spot_2", "mud_spot_3"], ["pony_stand", "knight_ride"], ["pony_walk_a", "knight_ride"],
              ["pony_jump", "knight_ride"], ["pony_stand", "knight_ride_cheer"], ["castle_gate", "drawbridge_closed"], ["castle_gate", "drawbridge_open"]]
    x = 10
    for combo in combos:
        base = load(combo[0])
        if base is None:
            continue
        for n in combo[1:]:
            top = load(n)
            if top is not None:
                base.alpha_composite(top)
        base.thumbnail((330, 400))
        sheet.alpha_composite(base, (x, y + 400 - base.height))
        x += base.width + 12
    y += 420
    x = 10
    for n in ("stable_background", "path_far"):
        im = load(n)
        if im is not None:
            im.thumbnail((760, 430))
            sheet.alpha_composite(im, (x, y))
            x += im.width + 12
    for k, n in enumerate(("path_mid", "path_near")):
        im = load(n)
        if im is not None:
            im.thumbnail((cols * cell - x - 10, 250))
            sheet.alpha_composite(im, (x, y + k * 260))
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
        big = [n for n, (s, _) in res.items() if s >= 150000]
        for n, (s, note) in sorted(res.items()):
            print("%-28s %7d bytes  %s" % (n + ".png", s, note))
        if big:
            print("OVER 150,000 bytes: %s" % ", ".join(big))
    have = sorted(n + ".png" for n in names if os.path.exists(os.path.join(OUT_DIR, n + ".png")))
    with open(os.path.join(OUT_DIR, "manifest.json"), "w", encoding="utf-8") as fh:
        json.dump({"files": have}, fh, indent=1)
    contact_sheet(names)
    print("manifest: %d files; sheet: %s" % (len(have), SHEET))


if __name__ == "__main__":
    main()
