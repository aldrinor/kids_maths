"""Silent check of the maths practice demo (demo/index.html) on phone, iPad and computer sizes.
Run: python tests/demo_practice_test.py http://localhost:8790/demo/index.html [webkit]
Pictures go to the gh_site folder (ignored by git)."""
import sys
from playwright.sync_api import sync_playwright

URL = sys.argv[1]
ENGINE = sys.argv[2] if len(sys.argv) > 2 else "chromium"
# speech is stubbed and recorded, so the test is silent and can check what would be spoken
STUB = ("window.__spoken=[];window.speechSynthesis={speak(u){window.__spoken.push(u.text)},cancel(){},getVoices(){return[]},pause(){},resume(){}};"
        "window.SpeechSynthesisUtterance=function(t){this.text=t};window.AudioContext=window.webkitAudioContext=undefined;")
SIZES = [(360, 740, "phone"), (390, 844, "phone2"), (844, 390, "phone_side"), (768, 1024, "ipad_tall"),
         (1024, 768, "ipad"), (1366, 1024, "ipad_pro"), (1440, 900, "desktop")]
res = []


def ok(name, cond, extra=""):
    res.append(bool(cond))
    print(("PASS " if cond else "FAIL ") + name + (" | " + str(extra) if extra != "" and not cond else ""))


FIT = """() => {
  const vw = innerWidth, vh = innerHeight, bad = [];
  const sel = ['#tile', '#speak', '.nlbox svg', '.hoprow button', '#ansBox', '#qbody .opt', '#pad button', '#tools button', '#qbody .bulb'];
  for (const s of sel) for (const e of document.querySelectorAll(s)) {
    const r = e.getBoundingClientRect(); if (!r.width) continue;
    if (r.left < -1 || r.top < -1 || r.right > vw + 1 || r.bottom > vh + 1) bad.push(s + ' off screen');
  }
  const w = document.getElementById('work').getBoundingClientRect();
  for (const s of ['#ansBox', '#qbody .opt', '.nlbox svg', '.hoprow button']) for (const e of document.querySelectorAll(s)) {
    const r = e.getBoundingClientRect(); if (r.width && (r.top < w.top - 1 || r.bottom > w.bottom + 1)) bad.push(s + ' cut off');
  }
  if (document.documentElement.scrollWidth > vw + 1) bad.push('sideways scroll');
  return bad;
}"""
INK = "()=>{const c=document.getElementById('draw');const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0;for(let i=3;i<d.length;i+=4)if(d[i])n++;return n}"


def q_now(pg):
    return pg.evaluate("()=>({...__demo.Q})")


def answer(pg, q, val):
    if q["typed"]:
        for ch in str(val):
            pg.click(f'#pad button[data-k="{ch}"]')
    else:
        pg.click(f'#qbody .opt[data-v="{val}"]')
    pg.click("#tile")


def wrong(q):
    return next(o for o in q["opts"] if o != q["ans"]) if not q["typed"] else q["ans"] + 1


def guided_hops(pg, q, tag, i):
    """After the first miss: the guide says where to start, the right button glows, the child hops b times."""
    pg.wait_for_timeout(1100)
    g = pg.inner_text(".guide")
    ok(f"{tag} q{i} wrong answer starts guided help", f"Start at {q['a']}" in g and pg.evaluate("()=>__demo.QS.line") == q["a"], g)
    d = "1" if q["op"] == "+" else "-1"
    ok(f"{tag} q{i} the right hop button glows", pg.locator(f'.hoprow button[data-h="{d}"].glow').count() == 1)
    for _ in range(q["b"]):
        pg.click(f'.hoprow button[data-h="{d}"]')
        pg.wait_for_timeout(60)
    labels = pg.evaluate("()=>[...document.querySelectorAll('.nlbox .hoplab')].map(t=>t.textContent)")
    sign = "+" if q["op"] == "+" else "−"
    ok(f"{tag} q{i} hops show {sign}1 to {sign}{q['b']}", labels == [f"{sign}{k}" for k in range(1, q["b"] + 1)], labels)
    ok(f"{tag} q{i} guide asks where the hopper landed", "Where did the hopper land" in pg.inner_text(".guide"), pg.inner_text(".guide"))


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
        pg.wait_for_timeout(600)
        ok(f"{tag} 6 pen colours", pg.locator("#tools .pen").count() == 6)
        # tools make no sound
        before = pg.evaluate("()=>__spoken.length")
        pg.click("#tools .pen >> nth=3")
        pg.click('#tools [data-t="erase"]')
        pg.click("#tools .pen >> nth=1")
        ok(f"{tag} tools make no sound", pg.evaluate("()=>__spoken.length") == before)
        # pen is ready; draw in the free space in the middle
        room = pg.locator(".room").bounding_box()
        ok(f"{tag} free drawing space between question and number line", room and room["height"] >= (40 if vh < 600 else 120), room)
        y = room["y"] + room["height"] / 2
        pg.mouse.move(room["x"] + room["width"] * 0.2, y)
        pg.mouse.down()
        for k in range(1, 11):
            pg.mouse.move(room["x"] + room["width"] * (0.2 + k * 0.06), y + k * 2)
        pg.mouse.up()
        ok(f"{tag} pen draws in the free space", pg.evaluate(INK) > 200, pg.evaluate(INK))
        pg.screenshot(path=f"demo_{tag}_pen.png")
        pg.click('#tools [data-t="clear"]')
        ok(f"{tag} clear empties the drawing", pg.evaluate(INK) == 0)
        # number line: hopper on the first number, labels +1 +2
        q = q_now(pg)
        ok(f"{tag} hopper starts on the first number", pg.evaluate("()=>__demo.QS.line") == q["a"])
        pg.click('.hoprow button[data-h="1"]')
        pg.click('.hoprow button[data-h="1"]')
        pg.wait_for_timeout(300)
        ok(f"{tag} forward hops show +1 +2", pg.evaluate("()=>[...document.querySelectorAll('.nlbox .hoplab')].map(t=>t.textContent)") == ["+1", "+2"], pg.evaluate("()=>[...document.querySelectorAll('.nlbox .hoplab')].map(t=>t.textContent)"))
        size = pg.evaluate("()=>{const s=document.querySelector('.nlbox svg'),t=s.querySelectorAll('.tick');const a=t[0].getBoundingClientRect(),b=t[1].getBoundingClientRect();return Math.round(b.left-a.left)}")
        ok(f"{tag} number line is big (step {size}px)", size >= (28 if vw < 500 else 60 if vw >= 900 and vh >= 600 else 40))
        ok(f"{tag} everything fits", not pg.evaluate(FIT), pg.evaluate(FIT))
        pg.screenshot(path=f"demo_{tag}_q.png")
        pg.click('.hoprow button[data-h="0"]')
        widths = pg.evaluate("()=>[...document.querySelectorAll('#pad button')].map(b=>Math.round(b.getBoundingClientRect().width))")
        ok(f"{tag} keypad keys equal width", max(widths) - min(widths) <= 1, widths)
        plan = ["right", "guided", "miss"] + ["right"] * 7
        fits = []
        for i, mode in enumerate(plan, 1):
            pg.wait_for_function(f"()=>__demo.n==={i - 1} && __demo.QS && __demo.QS.phase==='ask'", timeout=8000)
            q = q_now(pg)
            fits += pg.evaluate(FIT)
            if mode == "right":
                answer(pg, q, q["ans"])
                pg.wait_for_timeout(200)
                ok(f"{tag} q{i} right answer shows correct", "correct" in pg.inner_text("#msg"))
                pg.wait_for_function(f"()=>__demo.n==={i} || document.querySelector('.over')", timeout=4000)
                ok(f"{tag} q{i} next question came by itself", True)
            elif mode == "guided":
                answer(pg, q, wrong(q))
                guided_hops(pg, q, tag, i)
                if tag == "ipad":
                    pg.screenshot(path="demo_guided.png")
                answer(pg, q, q["ans"])
                pg.wait_for_timeout(200)
                ok(f"{tag} q{i} right after guidance", "correct" in pg.inner_text("#msg"))
                pg.wait_for_function(f"()=>__demo.n==={i}", timeout=4000)
            else:
                answer(pg, q, wrong(q))
                pg.wait_for_timeout(1100)
                answer(pg, q, wrong(q))
                pg.wait_for_timeout(300)
                ok(f"{tag} q{i} second miss: Oops and See The Answer", pg.locator(".band.oops").count() == 1 and "See The Answer" in pg.inner_text("#tile"))
                pg.wait_for_timeout(1900)
                pg.click("#tile")
                pg.wait_for_timeout(700 + 520 * q["b"])
                shown_ok = pg.inner_text("#ansBox").strip() == str(q["ans"]) if q["typed"] else pg.locator(f'#qbody .opt.sel.right[data-v="{q["ans"]}"]').count() == 1
                ok(f"{tag} q{i} answer shown with {q['b']} labelled hops", pg.locator(".nlbox .hoplab").count() == q["b"] and shown_ok and "correct" in pg.inner_text("#msg"))
                if tag == "ipad":
                    pg.screenshot(path="demo_shown.png")
                pg.click("#tile")
            if pg.locator(".skillcard").count():
                pg.click(".skillcard button")
        pg.wait_for_selector(".over", timeout=4000)
        ok(f"{tag} all question screens fit", not fits, fits[:3])
        ok(f"{tag} set of 10 ends with the done card", "10 questions done" in pg.inner_text(".over"))
        ok(f"{tag} no page errors", not errs, errs[:3])
        pg.close()
    b.close()
print(f"RESULT {sum(res)}/{len(res)} passed")
