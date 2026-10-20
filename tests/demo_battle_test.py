"""Silent check of the battle demo (demo/index.html). Plays a full battle on iPad sizes.
Run: python tests/demo_battle_test.py http://localhost:8790/demo/index.html
Pictures go to the gh_site folder (ignored by git)."""
import sys
from playwright.sync_api import sync_playwright

URL = sys.argv[1]
STUB = ("window.speechSynthesis={speak(){},cancel(){},getVoices(){return[]},pause(){},resume(){}};"
        "window.SpeechSynthesisUtterance=function(){};window.AudioContext=window.webkitAudioContext=undefined;")
res = []


def ok(name, cond, extra=""):
    res.append(bool(cond))
    print(("PASS " if cond else "FAIL ") + name + (" | " + str(extra) if extra != "" and not cond else ""))


def wrong_of(q):
    if q["type"] == "compare":
        return next(s for s in "<>=" if s != q["ans"])
    if q["type"] == "bars":
        return next(o for o in q["opts"] if o != q["ans"])
    return q["ans"] + 1 if q["type"] != "line" or q["ans"] + 1 <= q["start"] + 10 else q["ans"] - 1


def give(pg, val, q):
    """Enter an answer the way a child does: keypad, option tap, or number-line tick."""
    if q["type"] == "typed":
        for _ in range(4):
            pg.click('#keypad button[data-k="⌫"]')
        for ch in str(val):
            pg.click(f'#keypad button[data-k="{ch}"]')
    elif q["type"] == "line":
        pg.click(f'#qbody .tick[data-n="{val}"]')
    else:
        pg.click(f'#qbody .opt[data-v="{val}"]')
    pg.click("#tile")


with sync_playwright() as p:
    b = p.chromium.launch(args=["--mute-audio"])
    for vw, vh in [(1024, 768), (768, 1024), (1366, 1024)]:
        pg = b.new_page(viewport={"width": vw, "height": vh}, has_touch=True)
        pg.add_init_script(STUB)
        errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.goto(URL)
        pg.wait_for_timeout(500)
        if vw == 1024:
            pg.screenshot(path="demo_0_start.png")
        pg.click(".over .go")
        pg.wait_for_selector("#q", timeout=8000)
        ok(f"{vw} out of magic opens the question by itself", pg.is_visible("#q"))
        plan = ["right", "retry", "miss"] + ["right"] * 30
        n, seen_types, shots, fumbles = 0, set(), 0, 0
        for step in range(200):
            if pg.is_visible("#q"):
                q = pg.evaluate("()=>({...__demo.Q})")
                seen_types.add(q["type"] if not q.get("word") else "word")
                mode = plan[n]
                n += 1
                if vw == 1024 and shots < 5:
                    pg.screenshot(path=f"demo_q{shots}_{q['kind']}.png")
                    shots += 1
                if mode == "right":
                    give(pg, q["ans"], q)
                    pg.wait_for_timeout(300)
                    ok(f"{vw} q{n} right shows correct bar", "correct answer" in pg.inner_text("#msg") and pg.inner_text("#tile").strip() == "Back to Battle")
                    if vw == 1024 and n == 1:
                        pg.wait_for_timeout(200)
                        pg.screenshot(path="demo_right.png")
                    pg.wait_for_timeout(1500)
                    pg.click("#tile")
                elif mode == "retry":
                    give(pg, wrong_of(q), q)
                    pg.wait_for_timeout(300)
                    ok(f"{vw} first miss says try again", "try again" in pg.inner_text("#msg") and "Get Magic" in pg.inner_text("#tile"))
                    if vw == 1024:
                        pg.screenshot(path="demo_tryagain.png")
                    pg.wait_for_timeout(1000)
                    give(pg, q["ans"], q)
                    pg.wait_for_timeout(1700)
                    pg.click("#tile")
                else:
                    give(pg, wrong_of(q), q)
                    pg.wait_for_timeout(1100)
                    give(pg, wrong_of(q), q)
                    pg.wait_for_timeout(500)
                    ok(f"{vw} second miss shows Oops and See The Answer", pg.locator(".band.oops").count() == 1 and "See The Answer" in pg.inner_text("#tile"))
                    if vw == 1024:
                        pg.screenshot(path="demo_oops.png")
                    pg.wait_for_timeout(2300)
                    pg.click("#tile")
                    pg.wait_for_timeout(300)
                    ok(f"{vw} See The Answer shows answer and a teaching hint", "correct answer" in pg.inner_text("#msg") and pg.locator(".bubble").count() == 1)
                    if vw == 1024:
                        pg.screenshot(path="demo_shown.png")
                    pg.click("#tile")
                    pg.wait_for_timeout(1200)
                    fumbles += pg.locator(".pop", has_text="Fumble").count()
                pg.wait_for_timeout(400)
                continue
            if pg.locator(".over").count():
                txt = pg.inner_text(".over")
                if "level" in txt and vw == 1024:
                    pg.screenshot(path="demo_win.png")
                if "Demo finished" in txt:
                    break
                if "SKILL COMPLETE" in txt and vw == 1024:
                    pg.screenshot(path="demo_skill.png")
                pg.click(".over button")
                pg.wait_for_timeout(400)
                continue
            cards = pg.locator("#spells .card:not(.off)")
            if cards.count():
                if vw == 1024 and step < 40 and not shots >= 6:
                    pg.screenshot(path="demo_battle.png")
                    shots = 6
                pg.click("#spells .card.spark")
                pg.wait_for_timeout(150)
                foe = pg.evaluate("()=>__demo.units().find(u=>u.side==='foe'&&u.hp>0).id")
                pg.click(f"#u_{foe}")
            pg.wait_for_timeout(500)
        ok(f"{vw} battle reached the end card", "Demo finished" in pg.inner_text("body"))
        ok(f"{vw} a fumble happened after the double miss", fumbles >= 1, fumbles)
        ok(f"{vw} saw 3+ question types", len(seen_types) >= 3, seen_types)
        ok(f"{vw} no page errors", not errs, errs[:3])
        pg.close()
    # keypad keys all the same width
    pg = b.new_page(viewport={"width": 1024, "height": 768})
    pg.add_init_script(STUB)
    pg.goto(URL)
    pg.wait_for_timeout(400)
    pg.click(".over .go")
    pg.wait_for_selector("#q #keypad")
    pg.evaluate("()=>{}")
    widths = pg.evaluate("()=>[...document.querySelectorAll('#keypad button')].map(b=>Math.round(b.getBoundingClientRect().width))")
    ok("keypad keys equal width (if keypad shown)", len(set(widths)) <= 1, widths)
    b.close()
print(f"RESULT {sum(res)}/{len(res)} passed")
