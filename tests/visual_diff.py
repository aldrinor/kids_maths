"""Picture check for the game, made to save tokens: it takes the same screens every time (same random numbers,
no motion), compares them with the approved pictures pixel by pixel, and prints only the screens that changed.
For each changed screen it saves a small crop of the changed area, so only that needs a look.
Pictures live in C:/Family Office/16_kids_maths/work_tmp/visual (not in the public site).
Run:  python tests/visual_diff.py http://localhost:8790/game/index.html            compare with approved
      python tests/visual_diff.py http://localhost:8790/game/index.html --approve  current pictures become approved"""
import os
import shutil
import sys
from PIL import Image, ImageChops
from playwright.sync_api import sync_playwright

URL = sys.argv[1]
APPROVE = "--approve" in sys.argv
BASE = os.path.join("C:/Family Office/16_kids_maths/work_tmp", "visual")
CUR, OK, CROP = (os.path.join(BASE, d) for d in ("current", "approved", "changed"))
SIZES = [("phone", 390, 844), ("ipad", 820, 1180), ("laptop", 1280, 720)]
# same numbers every run: a fixed random sequence, fixed clock, no voice, no motion
STUB = ("(()=>{let s=7;Math.random=()=>(s=(s*16807)%2147483647)/2147483647;const T=Date.UTC(2026,9,21,17);Date.now=()=>T;})();"
        "window.__demoFast=true;window.__noVoice=true;window.__noRewards=true;localStorage.clear();"
        "window.speechSynthesis={speak(){},cancel(){},getVoices(){return[]}};window.SpeechSynthesisUtterance=function(){};")
THRESHOLD = 0.002   # share of pixels that may differ (font smoothing) before a screen counts as changed

for d in (CUR, CROP):
    shutil.rmtree(d, ignore_errors=True); os.makedirs(d, exist_ok=True)


def shots(pg, tag):
    yield "doors", None
    for who in ("marie", "kennedy"):
        pg.click(f'.over .go[data-v="{who}"]'); pg.wait_for_function("()=>__game.QS && __game.QS.phase==='ask'", timeout=8000)
        pg.wait_for_timeout(300)
        yield f"{who}_question", None
        pg.evaluate("()=>__game.lesson()"); pg.wait_for_function("()=>!__game.QS.teaching", timeout=60000); pg.wait_for_timeout(300)
        yield f"{who}_lesson", None
        pg.evaluate("()=>{ __game.doors(); }"); pg.wait_for_timeout(300)


with sync_playwright() as p:
    br = p.chromium.launch(args=["--mute-audio"])
    for tag, w, h in SIZES:
        pg = br.new_page(viewport={"width": w, "height": h}, reduced_motion="reduce", has_touch=w < 900)
        pg.add_init_script(STUB)
        pg.goto(URL); pg.wait_for_timeout(500)
        pg.evaluate("document.fonts.ready")
        for name, _ in shots(pg, tag):
            pg.screenshot(path=os.path.join(CUR, f"{tag}_{name}.png"))
        pg.close()
    br.close()

if APPROVE:
    shutil.rmtree(OK, ignore_errors=True); shutil.copytree(CUR, OK)
    print(f"APPROVED {len(os.listdir(OK))} pictures")
    sys.exit(0)

changed, new = [], []
for f in sorted(os.listdir(CUR)):
    a = os.path.join(OK, f)
    if not os.path.exists(a):
        new.append(f); continue
    im1, im2 = Image.open(a).convert("RGB"), Image.open(os.path.join(CUR, f)).convert("RGB")
    if im1.size != im2.size:
        changed.append((f, 1.0)); continue
    diff = ImageChops.difference(im1, im2).convert("L").point(lambda v: 255 if v > 24 else 0)
    share = sum(diff.histogram()[255:]) / (im1.size[0] * im1.size[1])
    if share > THRESHOLD:
        changed.append((f, share))
        box = diff.getbbox()
        if box:                                   # a small crop of the changed area, side by side: before | after
            pad = 12; box = (max(0, box[0] - pad), max(0, box[1] - pad), min(im1.size[0], box[2] + pad), min(im1.size[1], box[3] + pad))
            c1, c2 = im1.crop(box), im2.crop(box)
            both = Image.new("RGB", (c1.width * 2 + 8, c1.height), "white"); both.paste(c1, (0, 0)); both.paste(c2, (c1.width + 8, 0))
            both.thumbnail((700, 700)); both.save(os.path.join(CROP, f))
for f, s in changed:
    print(f"CHANGED {f} {s * 100:.1f}% (crop: work_tmp/visual/changed/{f})")
for f in new:
    print(f"NEW {f} (no approved picture yet)")
print(f"RESULT {len(changed)} changed, {len(new)} new, {len(os.listdir(CUR)) - len(changed) - len(new)} same")
