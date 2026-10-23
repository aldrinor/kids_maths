"""draw_app_icons.py - draws the home-screen icons of the Kids Maths game (own art, drawn in code).
A soft cream rounded square, a pink heart (the cafe) and a blue star (the castle) side by side over a gold coin.
Writes game/icons/icon_192.png, icon_512.png, icon_maskable_512.png, apple_touch_icon_180.png and game/icons/manifest.json.
The maskable icon keeps everything inside the middle 80 percent, so a round or rounded mask never cuts the picture.
Every PNG stays under 150 KB.  Run: python tools/draw_app_icons.py"""
import json
import math
from pathlib import Path

from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent.parent / "game" / "icons"
CREAM, COIN, COIN_EDGE = (255, 244, 224), (246, 201, 69), (201, 154, 30)
PINK, PINK_DARK, BLUE, BLUE_DARK = (240, 112, 146), (200, 80, 112), (91, 140, 242), (60, 100, 200)
SS = 4   # draw 4 times bigger, then shrink: smooth edges


def heart_points(cx, cy, r, n=80):
    pts = []
    for i in range(n):
        t = 2 * math.pi * i / n
        x = 16 * math.sin(t) ** 3
        y = -(13 * math.cos(t) - 5 * math.cos(2 * t) - 2 * math.cos(3 * t) - math.cos(4 * t))
        pts.append((cx + x * r / 17, cy + y * r / 17))
    return pts


def star_points(cx, cy, r):
    return [(cx + math.cos(-math.pi / 2 + k * math.pi / 5) * (r if k % 2 == 0 else r * .45),
             cy + math.sin(-math.pi / 2 + k * math.pi / 5) * (r if k % 2 == 0 else r * .45)) for k in range(10)]


def draw(size, safe):
    """safe = share of the square the picture may use (1.0 normal, 0.8 maskable)"""
    s = size * SS
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if safe < 1:
        d.rectangle([0, 0, s, s], fill=CREAM)                         # maskable: the whole square is filled
    else:
        d.rounded_rectangle([0, 0, s - 1, s - 1], radius=int(s * .22), fill=CREAM)
    k = s * safe / 512 * 1.0
    ox = s * (1 - safe) / 2
    def P(x, y): return (ox + x * k, ox + y * k)
    cx, cy = P(256, 262)
    d.ellipse([cx - 190 * k, cy - 190 * k, cx + 190 * k, cy + 190 * k], fill=COIN, outline=COIN_EDGE, width=int(10 * k))
    d.ellipse([cx - 150 * k, cy - 150 * k, cx + 150 * k, cy + 150 * k], outline=(227, 173, 37), width=int(8 * k))
    hx, hy = P(205, 262)
    d.polygon(heart_points(hx, hy + 4 * k, 120 * k), fill=PINK, outline=PINK_DARK)
    sx, sy = P(318, 252)
    d.polygon(star_points(sx, sy, 100 * k), fill=BLUE, outline=BLUE_DARK)
    return img.resize((size, size), Image.LANCZOS)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    jobs = {"icon_192.png": (192, 1.0), "icon_512.png": (512, 1.0), "icon_maskable_512.png": (512, .8), "apple_touch_icon_180.png": (180, 1.0)}
    for name, (size, safe) in jobs.items():
        img = draw(size, safe)
        if name.startswith("apple"):                                   # iOS wants an opaque square and rounds it itself
            flat = Image.new("RGB", img.size, CREAM); flat.paste(img, mask=img.split()[3]); img = flat
        img.save(OUT / name, optimize=True)
        assert (OUT / name).stat().st_size < 150 * 1024, name
    (OUT / "manifest.json").write_text(json.dumps({"files": sorted(jobs)}, indent=1) + "\n", encoding="utf-8")
    print("icons:", {n: (OUT / n).stat().st_size for n in jobs})


main()
