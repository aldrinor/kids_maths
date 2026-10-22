"""draw_cafe_background.py - the cafe room picture (1600 x 900) for draw_cafe_art.py.

A cosy pastel kitten cafe: soft wall with a faint paw pattern, a calm arched window in the middle, bunting,
two cat-ear lamps, shelves with jars and cups on the left, a menu board, a cat clock and plants on the right,
a mint wainscot and a wooden counter across the lower third. Outlines are lighter than the characters' so the
room stays behind them; the middle (where the cup and the order card go) is kept calm and low in contrast.
"""
import math


def background(Art, INK, heart_d, line, f):
    A = Art(1600, 900)
    soft = 'stroke="%s" stroke-opacity=".55"' % INK
    o = []
    # wall
    o.append('<rect width="1600" height="900" fill="%s"/>' % A.lin([(0, "#f8e3e4"), (0.6, "#fcece6"), (1, "#fdf3ea")], 0, 0, 0, 1))
    # faint paw-print wallpaper
    paws = ""
    for r in range(9):
        for c in range(22):
            x = c * 78 + (39 if r % 2 else 0)
            y = 30 + r * 66
            paws += '<g transform="translate(%d %d)"><ellipse cx="0" cy="4" rx="7" ry="5.5"/><circle cx="-7" cy="-5" r="2.8"/><circle cx="0" cy="-8" r="2.8"/><circle cx="7" cy="-5" r="2.8"/></g>' % (x, y)
    o.append('<g fill="#e9a9b8" opacity=".16">%s</g>' % paws)
    # soft light pool in the middle
    o.append('<ellipse cx="800" cy="300" rx="520" ry="330" fill="#fff6e4" opacity=".55" filter="%s"/>' % A.blur(60))
    # wainscot (mint) with panels
    o.append('<rect x="0" y="470" width="1600" height="160" fill="%s"/>' % A.lin([(0, "#dcf2e8"), (1, "#c6e7da")], 0, 0, 0, 1))
    o.append('<rect x="0" y="462" width="1600" height="16" rx="4" fill="#f4fbf7" %s stroke-width="3"/>' % soft)
    for x in range(20, 1600, 160):
        o.append('<rect x="%d" y="496" width="124" height="120" rx="12" fill="none" stroke="#a9d6c5" stroke-width="4"/>' % x)

    # ---- the arched window in the middle (calm, muted)
    sky = A.lin([(0, "#d9ecf3"), (0.65, "#eef3ec"), (1, "#fbefe2")], 0, 0, 0, 1)
    o.append('<path d="M610 452 L610 190 C610 60 990 60 990 190 L990 452 Z" fill="#fbf4ec" %s stroke-width="4"/>' % soft)
    o.append('<path d="M632 440 L632 196 C632 88 968 88 968 196 L968 440 Z" fill="%s"/>' % sky)
    o.append('<g clip-path="url(#winclip)">')
    A.defs.append('<clipPath id="winclip"><path d="M632 440 L632 196 C632 88 968 88 968 196 L968 440 Z"/></clipPath>')
    o.append('<circle cx="880" cy="190" r="60" fill="#fff7d8" opacity=".9" filter="%s"/>' % A.blur(14))
    o.append('<ellipse cx="700" cy="170" rx="56" ry="18" fill="#ffffff" opacity=".8"/><ellipse cx="736" cy="160" rx="34" ry="18" fill="#ffffff" opacity=".8"/>')
    o.append('<ellipse cx="900" cy="250" rx="46" ry="14" fill="#ffffff" opacity=".7"/>')
    o.append('<path d="M620 452 Q700 360 780 400 Q860 350 980 420 L980 452 Z" fill="#cfe8d2" opacity=".9"/>')
    o.append('<path d="M620 452 Q720 400 820 430 Q900 400 980 440 L980 452 Z" fill="#b9dcc0" opacity=".9"/>')
    for x, y, r in ((684, 384, 28), (930, 392, 24)):
        o.append('<circle cx="%d" cy="%d" r="%d" fill="#a9d4b4"/><rect x="%d" y="%d" width="6" height="30" fill="#cfae94"/>' % (x, y, r, x - 3, y + r - 6))
    o.append("</g>")
    o.append('<path d="M800 92 L800 440 M632 300 L968 300" stroke="#fbf4ec" stroke-width="12"/>')
    o.append('<path d="M800 92 L800 440 M632 300 L968 300" stroke="%s" stroke-opacity=".3" stroke-width="2"/>' % INK)
    o.append('<path d="M632 440 L632 196 C632 88 968 88 968 196 L968 440 Z" fill="none" %s stroke-width="3"/>' % soft)
    # sill with a little plant
    o.append(A.shape("M590 446 L1010 446 Q1018 458 1010 470 L590 470 Q582 458 590 446 Z", (582, 446, 436, 24), ("#fffaf4", "#f3e6d8", "#e6d6c6"), sw=3.5, hl=0.3))
    # curtains
    cur = ("#fde6ec", "#f6c9d6", "#efc9d4")
    o.append(A.shape("M586 70 Q626 66 660 70 Q640 220 664 420 Q640 440 600 432 Q574 250 586 70 Z", (574, 66, 90, 374), cur, sw=3.5, hl=0.35, inner=line("M610 100 Q600 260 618 420 M634 100 Q624 260 640 424", 3, "#eab3c3", 0.8)))
    o.append(A.shape("M1014 70 Q974 66 940 70 Q960 220 936 420 Q960 440 1000 432 Q1026 250 1014 70 Z", (936, 66, 90, 374), cur, sw=3.5, hl=0.35, inner=line("M990 100 Q1000 260 982 420 M966 100 Q976 260 960 424", 3, "#eab3c3", 0.8)))
    o.append('<rect x="566" y="56" width="468" height="16" rx="8" fill="#e7c9a5" %s stroke-width="3"/>' % soft)

    # ---- bunting across the top
    o.append('<path d="M0 40 Q400 110 800 50 Q1200 110 1600 40" fill="none" stroke="#d9b896" stroke-width="3"/>')
    cols = ["#f8c6d3", "#c8ecdf", "#fbe5b0", "#d9cdf2", "#bfe0f6"]
    k = 0
    for seg in ((0, 40, 400, 110, 800, 50), (800, 50, 1200, 110, 1600, 40)):
        x0, y0, cx, cy, x1, y1 = seg
        for i in range(1, 10):
            t = i / 10
            x = (1 - t) ** 2 * x0 + 2 * (1 - t) * t * cx + t * t * x1
            y = (1 - t) ** 2 * y0 + 2 * (1 - t) * t * cy + t * t * y1
            if 560 < x < 1040:
                continue
            o.append('<path d="M%s %s L%s %s L%s %s Z" fill="%s" %s stroke-width="2.5" stroke-linejoin="round"/>' % (f(x - 22), f(y), f(x + 22), f(y), f(x), f(y + 44), cols[k % 5], soft))
            k += 1

    # ---- cat-ear pendant lamps
    for x in (430, 1170):
        o.append('<line x1="%d" y1="0" x2="%d" y2="96" stroke="%s" stroke-opacity=".5" stroke-width="3"/>' % (x, x, INK))
        o.append('<ellipse cx="%d" cy="170" rx="70" ry="40" fill="#fff4cf" opacity=".7" filter="%s"/>' % (x, A.blur(18)))
        o.append(A.shape("M%d 150 Q%d 92 %d 92 Q%d 92 %d 150 Z" % (x - 58, x - 56, x, x + 56, x + 58), (x - 58, 92, 116, 58), ("#fffaf2", "#f7e3c8", "#e8d1b4"), sw=3.5, hl=0.4))
        o.append('<path d="M%d 110 L%d 82 L%d 102 Z M%d 110 L%d 82 L%d 102 Z" fill="#f7e3c8" %s stroke-width="3" stroke-linejoin="round"/>' % (x - 38, x - 34, x - 18, x + 38, x + 34, x + 18, soft))
        o.append('<ellipse cx="%d" cy="152" rx="20" ry="8" fill="#fff8de"/>' % x)

    # ---- left wall: two shelves with jars and cups
    def shelf(x, y, w):
        o.append(A.shape("M%d %d L%d %d L%d %d L%d %d Z" % (x, y, x + w, y, x + w, y + 16, x, y + 16), (x, y, w, 16), ("#f2d7b8", "#dfb98e", "#d2b08c"), sw=3, hl=0.3))
        o.append('<path d="M%d %d l0 26 l14 -26 Z M%d %d l0 26 l-14 -26 Z" fill="#d9b48a" %s stroke-width="2.5"/>' % (x + 20, y + 16, x + w - 20, y + 16, soft))

    def jar(x, y, h, lid, fill, sweets):
        body ="M%d %d Q%d %d %d %d L%d %d Q%d %d %d %d L%d %d Q%d %d %d %d L%d %d Q%d %d %d %d Z" % (
            x - 28, y - h, x - 36, y - h, x - 36, y - h + 12, x - 36, y - 10, x - 36, y, x - 26, y, x + 26, y, x + 36, y, x + 36, y - 10,
            x + 36, y - h + 12, x + 36, y - h, x + 28, y - h)
        dots = "".join('<circle cx="%d" cy="%d" r="9" fill="%s"/>' % (x + dx, y - dy, c) for dx, dy, c in sweets)
        inner = '<rect x="%d" y="%d" width="72" height="%d" fill="%s" opacity=".85"/>' % (x - 36, y - int(h * 0.62), int(h * 0.62), fill) + dots
        o.append(A.shape(body, (x - 36, y - h, 72, h), ("#ffffff", "#f1f6f6", "#dfe8ea"), sw=3, hl=0.7, inner=inner))
        o.append(A.shape("M%d %d L%d %d L%d %d L%d %d Z" % (x - 26, y - h - 14, x + 26, y - h - 14, x + 28, y - h + 2, x - 28, y - h + 2), (x - 28, y - h - 14, 56, 16), lid, sw=3, hl=0.4))

    def mug(x, y, pal):
        o.append('<path d="M%d %d q24 0 22 18 q-2 16 -22 16" fill="none" stroke="%s" stroke-width="10"/>' % (x + 22, y - 40, pal[1]))
        o.append('<path d="M%d %d q24 0 22 18 q-2 16 -22 16" fill="none" %s stroke-width="2.5"/>' % (x + 22, y - 45, soft))
        o.append(A.shape("M%d %d L%d %d Q%d %d %d %d L%d %d Q%d %d %d %d Z" % (x - 28, y - 56, x + 28, y - 56, x + 26, y, x + 10, y, x - 10, y, x - 26, y, x - 28, y - 56), (x - 28, y - 56, 56, 56), pal, sw=3, hl=0.5))

    shelf(70, 250, 360)
    jar(130, 248, 86, ("#fbd3dc", "#f2a7ba", "#e8a7b8"), "#fde0e8", [(-14, 20, "#f7a8bd"), (12, 26, "#ffffff"), (-2, 40, "#f9c9d6"), (16, 46, "#f7a8bd")])
    jar(230, 248, 70, ("#cdeedf", "#97d7bf", "#9ccdb9"), "#e8f6ee", [(-12, 18, "#a8e2cf"), (12, 22, "#fde4a6"), (0, 36, "#d9cdf2")])
    mug(330, 248, ("#fde6ec", "#f6c3d2", "#eac1cd"))
    mug(395, 248, ("#e3f5ee", "#b5e2d1", "#b3d6c8"))
    shelf(70, 400, 360)
    for i, pal in enumerate((("#fff6dc", "#f8e2a8", "#e8d29f"), ("#fde6ec", "#f6c3d2", "#eac1cd"), ("#e3f5ee", "#b5e2d1", "#b3d6c8"))):
        x = 110 + i * 46
        o.append(A.shape("M%d 398 L%d 330 Q%d 318 %d 330 L%d 398 Z" % (x - 18, x - 16, x, x + 16, x + 18), (x - 18, 318, 36, 80), pal, sw=3, hl=0.5))
    # a little potted plant on the shelf
    o.append(A.shape("M320 398 L310 350 L380 350 L370 398 Z", (310, 350, 70, 48), ("#fbe0cc", "#f0c2a2", "#e2b597"), sw=3, hl=0.4))
    for a in (-50, -20, 10, 40):
        cx_ = 345 + 46 * math.sin(math.radians(a))
        cy_ = 350 - 40 * math.cos(math.radians(a))
        o.append('<ellipse cx="%s" cy="%s" rx="14" ry="30" transform="rotate(%d %s %s)" fill="#a7d8b2" %s stroke-width="2.5"/>' % (f(cx_), f(cy_), a, f(cx_), f(cy_), soft))

    # ---- right wall: menu board and a cat clock
    o.append(A.shape("M1140 200 L1500 200 L1500 420 L1140 420 Z", (1140, 200, 360, 220), ("#7e9a90", "#6b877d", "#647f75"), sw=4, hl=0.15))
    o.append('<rect x="1130" y="190" width="380" height="240" rx="14" fill="none" stroke="#e2bf98" stroke-width="16"/>')
    o.append('<rect x="1122" y="182" width="396" height="256" rx="18" fill="none" %s stroke-width="3"/>' % soft)
    chalk = 'fill="none" stroke="#fdfaf2" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" opacity=".85"'
    o.append('<path d="M1196 330 L1206 390 Q1210 400 1222 400 L1258 400 Q1270 400 1274 390 L1284 330 Z M1284 345 q22 0 20 16 q-2 14 -24 14" %s/>' % chalk)
    o.append('<path d="M1220 320 q-8 -16 0 -30 M1244 318 q-8 -16 0 -30 M1262 320 q-8 -14 0 -26" %s/>' % chalk)
    o.append('<path d="M1360 300 l-10 -40 l30 24 q20 -6 40 0 l30 -24 l-10 40 q14 44 -40 52 q-54 -8 -40 -52 Z" %s/>' % chalk)
    o.append('<path d="M1388 310 l0 4 M1432 310 l0 4 M1402 326 q8 8 16 0" %s/>' % chalk)
    o.append('<path d="%s" fill="#f8c6d3" opacity=".9"/>' % heart_d(1320, 250, 0.8))
    o.append('<path d="%s" fill="#c8ecdf" opacity=".9"/>' % heart_d(1460, 380, 0.7))
    # cat clock
    o.append('<path d="M1380 116 L1392 60 L1420 92 Z M1480 116 L1468 60 L1440 92 Z" fill="#fbe5ec" %s stroke-width="3" stroke-linejoin="round"/>' % soft)
    o.append(A.ellipse(1430, 120, 54, 50, ("#fffaf5", "#fbe5ec", "#efd3dc"), sw=3.5, hl=0.5))
    o.append('<circle cx="1430" cy="122" r="36" fill="#fffdf9" %s stroke-width="2"/>' % soft)
    o.append('<path d="M1430 122 L1430 98 M1430 122 L1448 130" stroke="%s" stroke-opacity=".6" stroke-width="4" stroke-linecap="round"/>' % INK)
    for a in range(0, 360, 90):
        o.append('<circle cx="%s" cy="%s" r="3" fill="%s" opacity=".4"/>' % (f(1430 + 28 * math.sin(math.radians(a))), f(122 - 28 * math.cos(math.radians(a))), INK))
    # framed paw picture on the left top
    o.append(A.shape("M120 70 L260 70 L260 190 L120 190 Z", (120, 70, 140, 120), ("#fff6e8", "#f6e4cc", "#ead6bf"), sw=3.5, hl=0.3))
    o.append('<rect x="134" y="84" width="112" height="92" fill="#fdeef2"/>')
    o.append('<g fill="#f2a9bc" transform="translate(190 136)"><ellipse cx="0" cy="8" rx="20" ry="16"/><circle cx="-20" cy="-14" r="8"/><circle cx="0" cy="-22" r="8"/><circle cx="20" cy="-14" r="8"/></g>')
    # tall plant at far right
    o.append(A.shape("M1500 600 L1488 520 L1580 520 L1568 600 Z", (1488, 520, 92, 80), ("#fbe0cc", "#f0c2a2", "#e2b597"), sw=3.5, hl=0.4))
    for a, l in ((-40, 90), (-15, 120), (10, 130), (35, 100), (60, 80)):
        cx_ = 1534 + l * 0.55 * math.sin(math.radians(a))
        cy_ = 520 - l * 0.55 * math.cos(math.radians(a))
        o.append('<ellipse cx="%s" cy="%s" rx="18" ry="%d" transform="rotate(%d %s %s)" fill="#a7d8b2" %s stroke-width="2.5"/>' % (f(cx_), f(cy_), l // 2, a, f(cx_), f(cy_), soft))
    # plant on the far left
    o.append(A.shape("M40 600 L28 520 L120 520 L108 600 Z", (28, 520, 92, 80), ("#e3f5ee", "#b5e2d1", "#b3d6c8"), sw=3.5, hl=0.4))
    for a, l in ((-35, 100), (-8, 130), (20, 110), (45, 80)):
        cx_ = 74 + l * 0.55 * math.sin(math.radians(a))
        cy_ = 520 - l * 0.55 * math.cos(math.radians(a))
        o.append('<ellipse cx="%s" cy="%s" rx="18" ry="%d" transform="rotate(%d %s %s)" fill="#b4ddb9" %s stroke-width="2.5"/>' % (f(cx_), f(cy_), l // 2, a, f(cx_), f(cy_), soft))

    # ---- the wooden counter across the lower third
    wood = A.lin([(0, "#f0d2ae"), (1, "#d9ae84")], 0, 0, 0, 1)
    o.append('<rect x="0" y="618" width="1600" height="282" fill="%s"/>' % wood)
    for x in range(0, 1600, 64):
        o.append('<path d="M%d 640 L%d 900" stroke="#c99a70" stroke-width="2.5" opacity=".45"/>' % (x, x))
    for x in range(30, 1600, 260):
        o.append('<rect x="%d" y="664" width="210" height="190" rx="18" fill="#f3dcbf" opacity=".55" stroke="#c99a70" stroke-width="4"/>' % x)
    o.append('<rect x="-10" y="596" width="1620" height="34" rx="14" fill="%s" %s stroke-width="3.5"/>' % (A.lin([(0, "#fffcf7"), (1, "#f3e6d6")], 0, 0, 0, 1), soft))
    o.append('<rect x="0" y="630" width="1600" height="14" fill="#5a3a3a" opacity=".12" filter="%s"/>' % A.blur(4))
    # a gentle overall softening so the room stays behind the characters
    o.append('<rect width="1600" height="900" fill="#fff6f2" opacity=".12"/>')
    return A.svg("".join(o))
