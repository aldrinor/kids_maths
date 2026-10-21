"""Silent check of the maths practice demo (demo/index.html) on phone, iPad and computer sizes.
Run: python tests/demo_practice_test.py http://localhost:8790/demo/index.html [webkit]
Pictures go to the gh_site folder (ignored by git)."""
import sys
from playwright.sync_api import sync_playwright

URL = sys.argv[1]
ENGINE = sys.argv[2] if len(sys.argv) > 2 else "chromium"
THEME = sys.argv[3] if len(sys.argv) > 3 else "cafe"
# speech is stubbed and recorded, so the test is silent and can check what would be spoken
STUB = ("window.__demoFast=true;window.__noVoice=true;window.__spoken=[];window.speechSynthesis={speak(u){window.__spoken.push(u.text)},cancel(){},getVoices(){return[]},pause(){},resume(){}};"
        "window.SpeechSynthesisUtterance=function(t){this.text=t};window.AudioContext=window.webkitAudioContext=undefined;")
SIZES = [(360, 740, "phone"), (390, 844, "phone2"), (375, 553, "iphone_se_safari"), (768, 1024, "ipad_tall"),
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


def mid(pg):
    r = pg.locator(".room").bounding_box()
    return (r["x"] + r["width"] * 0.3, r["y"] + r["height"] / 2)


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


BOARD_INK = "()=>{const c=document.querySelector('#board canvas');if(!c)return 0;const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0;for(let i=3;i<d.length;i+=4)if(d[i])n++;return n}"


def teaching(pg, q, tag, i, again=False):
    """After the first miss: the drawing is wiped and the working is hand-written on the board, step by step."""
    pg.wait_for_selector("#board", timeout=6000)
    pg.wait_for_function("()=>__demo.QS && !__demo.QS.teaching && !document.querySelector('#board .again').hidden", timeout=40000)
    ok(f"{tag} q{i} drawing wiped for the lesson", pg.evaluate(INK) == 0)
    ok(f"{tag} q{i} working hand-written on the board", pg.evaluate(BOARD_INK) > 400, pg.evaluate(BOARD_INK))
    line = pg.evaluate("()=>({at:__demo.QS.line, hops:__demo.QS.hops.length, nl:document.querySelector('#qbody .nlbox').getBoundingClientRect().top, board:document.querySelector('#board').getBoundingClientRect().bottom})")
    ok(f"{tag} q{i} the hopper hopped {q['b']} times on the number line to {q['ans']}", line["at"] == q["ans"] and line["hops"] == q["b"], line)
    ok(f"{tag} q{i} the number line stays in view during the lesson", line["board"] <= line["nl"] + 1, line)
    counted = [t for t in pg.evaluate("()=>__spoken") if t.isdigit()]
    ok(f"{tag} q{i} the voice counts each hop", len(counted) >= q["b"], counted[-q["b"]:])
    spoken = pg.evaluate("()=>__spoken")
    last = f"So {q['a']} {'plus' if q['op'] == '+' else 'minus'} {q['b']} is {q['ans']}."
    ok(f"{tag} q{i} the voice explains the steps and gives the answer", any(t.startswith(last) for t in spoken), spoken[-3:])
    if again:
        pg.click("#board .again")
        pg.wait_for_timeout(300)
        ok(f"{tag} q{i} Watch again replays", pg.evaluate("()=>__demo.QS.teaching"))
        pg.wait_for_function("()=>!__demo.QS.teaching && !document.querySelector('#board .again').hidden", timeout=40000)


with sync_playwright() as p:
    b = getattr(p, ENGINE).launch(**({"args": ["--mute-audio"]} if ENGINE == "chromium" else {}))
    for vw, vh, tag in SIZES:
        pg = b.new_page(viewport={"width": vw, "height": vh}, has_touch=vw < 900)
        pg.add_init_script(STUB)
        errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.goto(URL)
        pg.wait_for_timeout(400)
        pg.click(f'.over .go[data-theme="{THEME}"]')
        ok(f"{tag} {THEME} theme on", pg.evaluate("()=>document.body.dataset.theme") == THEME)
        pg.wait_for_timeout(600)
        ok(f"{tag} 6 colour pencils and a rubber", pg.locator("#tools .pencil").count() == 6 and pg.locator("#tools .rubber").count() == 1)
        # tools make no sound
        before = pg.evaluate("()=>__spoken.length")
        pg.click("#tools .pencil >> nth=3")
        pg.click("#tools .rubber")
        pg.click("#tools .pencil >> nth=1")
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
        pg.screenshot(path=f"demo_{THEME}_{tag}_pen.png")
        pg.click('#tools [data-t="clear"]')
        ok(f"{tag} clear empties the drawing", pg.evaluate(INK) == 0)
        # number line: hopper on the first number, labels +1 +2
        q = q_now(pg)
        ok(f"{tag} hopper starts on the first number", pg.evaluate("()=>__demo.QS.line") == q["a"])
        pg.click('.hoprow button[data-h="1"]')
        pg.click('.hoprow button[data-h="1"]')
        pg.wait_for_timeout(300)
        ok(f"{tag} after 2 hops only +2 shows", pg.evaluate("()=>[...document.querySelectorAll('.nlbox .hoplab')].map(t=>t.textContent)") == ["+2"], pg.evaluate("()=>[...document.querySelectorAll('.nlbox .hoplab')].map(t=>t.textContent)"))
        size = pg.evaluate("()=>{const s=document.querySelector('.nlbox svg'),t=s.querySelectorAll('.tick');const a=t[0].getBoundingClientRect(),b=t[1].getBoundingClientRect();return Math.round(b.left-a.left)}")
        ok(f"{tag} number line is big (step {size}px)", size >= (28 if vw < 500 else 60 if vw >= 900 and vh >= 600 else 40))
        ok(f"{tag} everything fits", not pg.evaluate(FIT), pg.evaluate(FIT))
        pg.screenshot(path=f"demo_{THEME}_{tag}_q.png")
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
                ok(f"{tag} q{i} right answer shows correct", "correct" in pg.inner_text("#msg").lower())
                pg.wait_for_selector("#board", timeout=8000)
                ok(f"{tag} q{i} lesson plays after a right answer", True)
                pg.wait_for_function(f"()=>__demo.n==={i} || document.querySelector('.over')", timeout=40000)
                ok(f"{tag} q{i} next question came by itself after the lesson", True)
            elif mode == "guided":
                pg.mouse.move(*mid(pg))
                pg.mouse.down(); pg.mouse.move(mid(pg)[0] + 80, mid(pg)[1] + 10); pg.mouse.up()
                answer(pg, q, wrong(q))
                teaching(pg, q, tag, i, again=True)
                if tag in ("ipad", "phone2", "phone_side"):
                    pg.screenshot(path=f"demo_{THEME}_{tag}_teach.png")
                answer(pg, q, q["ans"])
                pg.wait_for_timeout(200)
                ok(f"{tag} q{i} right after guidance", "correct" in pg.inner_text("#msg").lower())
                pg.wait_for_function(f"()=>__demo.n==={i}", timeout=40000)
            else:
                answer(pg, q, wrong(q))
                teaching(pg, q, tag, i)
                answer(pg, q, wrong(q))
                pg.wait_for_timeout(300)
                ok(f"{tag} q{i} second miss: Oops and See The Answer", pg.locator(".band.oops").count() == 1 and "See The Answer" in pg.inner_text("#tile"))
                pg.wait_for_timeout(1900)
                pg.click("#tile")
                pg.wait_for_timeout(700 + 520 * q["b"])
                shown_ok = pg.inner_text("#ansBox").strip() == str(q["ans"]) if q["typed"] else pg.locator(f'#qbody .opt.sel.right[data-v="{q["ans"]}"]').count() == 1
                sign = "+" if q["op"] == "+" else "−"
                labs = pg.evaluate("()=>[...document.querySelectorAll('.nlbox .hoplab')].map(t=>t.textContent)")
                ok(f"{tag} q{i} answer shown: {q['b']} hops, label {sign}{q['b']}", pg.locator(".nlbox .hop").count() == q["b"] and labs == [f"{sign}{q['b']}"] and shown_ok and "correct" in pg.inner_text("#msg").lower(), labs)
                if tag == "ipad":
                    pg.screenshot(path="demo_shown.png")
                pg.click("#tile")
            if pg.locator(".skillcard").count():
                pg.click(".skillcard button")
        pg.wait_for_selector(".over", timeout=4000)
        ok(f"{tag} all question screens fit", not fits, fits[:3])
        ok(f"{tag} set of 10 ends with the done card", "10 questions done" in pg.inner_text(".over"))
        missing = pg.evaluate("()=>{const all=new Set(KM.allPhrases());return __spoken.filter(t=>!all.has(t))}")
        ok(f"{tag} every spoken sentence is in the recorded list", not missing, missing[:3])
        ok(f"{tag} no page errors", not errs, errs[:3])
        pg.close()
    b.close()
print(f"RESULT {sum(res)}/{len(res)} passed")
