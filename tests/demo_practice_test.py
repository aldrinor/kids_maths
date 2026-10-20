"""Silent check of the maths practice demo (demo/index.html) on phone, iPad and computer sizes.
Run: python tests/demo_battle_test.py http://localhost:8790/demo/index.html [webkit]
Pictures go to the gh_site folder (ignored by git)."""
import sys
from playwright.sync_api import sync_playwright

URL = sys.argv[1]
ENGINE = sys.argv[2] if len(sys.argv) > 2 else "chromium"
STUB = ("window.speechSynthesis={speak(){},cancel(){},getVoices(){return[]},pause(){},resume(){}};"
        "window.SpeechSynthesisUtterance=function(){};window.AudioContext=window.webkitAudioContext=undefined;")
SIZES = [(360, 740, "phone"), (390, 844, "phone2"), (844, 390, "phone_side"), (768, 1024, "ipad_tall"),
         (1024, 768, "ipad"), (1366, 1024, "ipad_pro"), (1440, 900, "desktop")]
res = []


def ok(name, cond, extra=""):
    res.append(bool(cond))
    print(("PASS " if cond else "FAIL ") + name + (" | " + str(extra) if extra != "" and not cond else ""))


FIT = """() => {
  const vw = innerWidth, vh = innerHeight, bad = [];
  const sel = ['#tile', '#speak', '#qbody .nl', '#ansBox', '#qbody .opt', '#pad button', '#tools button', '#qbody .bulb'];
  for (const s of sel) for (const e of document.querySelectorAll(s)) {
    const r = e.getBoundingClientRect(); if (!r.width) continue;
    if (r.left < -1 || r.top < -1 || r.right > vw + 1 || r.bottom > vh + 1) bad.push(s + ' off screen');
  }
  const w = document.getElementById('work').getBoundingClientRect();
  for (const s of ['#ansBox', '#qbody .opt', '#qbody .nl']) for (const e of document.querySelectorAll(s)) {
    const r = e.getBoundingClientRect(); if (r.width && (r.top < w.top - 1 || r.bottom > w.bottom + 1)) bad.push(s + ' cut off');
  }
  const nl = document.querySelector('#qbody .nl'); if (nl && nl.getBoundingClientRect().width < 280) bad.push('number line too small');
  if (document.documentElement.scrollWidth > vw + 1) bad.push('sideways scroll');
  return bad;
}"""


def answer(pg, q, val):
    if q["typed"]:
        for ch in str(val):
            pg.click(f'#pad button[data-k="{ch}"]')
    else:
        pg.click(f'#qbody .opt[data-v="{val}"]')
    pg.click("#tile")


def wrong(q):
    if not q["typed"]:
        return next(o for o in q["opts"] if o != q["ans"])
    return q["ans"] + 1


with sync_playwright() as p:
    b = getattr(p, ENGINE).launch(**({"args": ["--mute-audio"]} if ENGINE == "chromium" else {}))
    for vw, vh, tag in SIZES:
        pg = b.new_page(viewport={"width": vw, "height": vh}, has_touch=vw < 900)
        pg.add_init_script(STUB)
        errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.goto(URL)
        pg.wait_for_timeout(400)
        pg.click(".over .go")
        pg.wait_for_timeout(500)
        # pencil draws over the question
        pg.click("#tools [data-t=pen]")
        box = pg.locator("#work").bounding_box()
        y = box["y"] + box["height"] * 0.35
        pg.mouse.move(box["x"] + box["width"] * 0.15, y)
        pg.mouse.down()
        for i in range(1, 11):
            pg.mouse.move(box["x"] + box["width"] * (0.15 + i * 0.06), y + i * 2)
        pg.mouse.up()
        ink = pg.evaluate("()=>{const c=document.getElementById('draw');const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0;for(let i=3;i<d.length;i+=4)if(d[i])n++;return n}")
        ok(f"{tag} pencil draws", ink > 200, ink)
        pg.screenshot(path=f"demo_{tag}_pen.png")
        pg.click("#tools [data-t=pen]")
        pg.click("#tools [data-t=clear]")
        # number line: tap a start, then two hops
        q = pg.evaluate("()=>({...__demo.Q})")
        pg.click(f'#qbody .tick[data-n="{q["a"]}"]')
        pg.click(f'#qbody .tick[data-n="{q["a"] + 1}"]')
        pg.click(f'#qbody .tick[data-n="{q["a"] + 2}"]')
        ok(f"{tag} number line hops drawn by the child", pg.locator("#qbody .hop").count() == 2)
        ok(f"{tag} everything fits on screen", not pg.evaluate(FIT), pg.evaluate(FIT))
        pg.screenshot(path=f"demo_{tag}_q.png")
        widths = pg.evaluate("()=>[...document.querySelectorAll('#pad button')].map(b=>Math.round(b.getBoundingClientRect().width))")
        ok(f"{tag} keypad keys equal width", max(widths) - min(widths) <= 1, widths)
        plan = ["right", "retry", "miss"] + ["right"] * 7
        fits = []
        for i, mode in enumerate(plan):
            pg.wait_for_selector("#tile:not(.next)")
            q = pg.evaluate("()=>({...__demo.Q})")
            fits += pg.evaluate(FIT)
            if mode == "right":
                answer(pg, q, q["ans"])
                pg.wait_for_timeout(200)
                ok(f"{tag} q{i+1} right -> Next", "correct" in pg.inner_text("#msg") and "Next" in pg.inner_text("#tile"))
            elif mode == "retry":
                answer(pg, q, wrong(q))
                pg.wait_for_timeout(200)
                ok(f"{tag} q{i+1} first miss says try again", "try again" in pg.inner_text("#msg") and pg.inner_text("#tile") == "Check")
                if tag == "ipad":
                    pg.screenshot(path="demo_tryagain.png")
                pg.wait_for_timeout(1000)
                answer(pg, q, q["ans"])
                pg.wait_for_timeout(200)
                ok(f"{tag} q{i+1} second try right", "Next" in pg.inner_text("#tile"))
            else:
                answer(pg, q, wrong(q))
                pg.wait_for_timeout(1000)
                answer(pg, q, wrong(q))
                pg.wait_for_timeout(300)
                ok(f"{tag} q{i+1} second miss: Oops and See The Answer", pg.locator(".band.oops").count() == 1 and "See The Answer" in pg.inner_text("#tile"))
                pg.wait_for_timeout(1900)
                pg.click("#tile")
                pg.wait_for_timeout(600 + 420 * q["b"])
                ok(f"{tag} q{i+1} answer shown with exactly {q['b']} hops", pg.locator("#qbody .hop").count() == q["b"] and "correct" in pg.inner_text("#msg"),
                   pg.locator("#qbody .hop").count())
                if tag == "ipad":
                    pg.screenshot(path="demo_shown.png")
            pg.click("#tile")
            pg.wait_for_timeout(150)
            if pg.locator(".skillcard").count():
                pg.click(".skillcard button")
        ok(f"{tag} all question screens fit", not fits, fits[:3])
        ok(f"{tag} set of 10 ends with the done card", "10 questions done" in pg.inner_text(".over"))
        ok(f"{tag} no page errors", not errs, errs[:3])
        pg.close()
    b.close()
print(f"RESULT {sum(res)}/{len(res)} passed")
