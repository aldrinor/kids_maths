"""Silent check of the times-fact speed stage in the browser: a speed set comes, answers are timed from the first key,
and no clock is ever shown. One line per check."""
import sys
from playwright.sync_api import sync_playwright
sys.path.insert(0, __file__.rsplit("\\", 1)[0].rsplit("/", 1)[0])
from autoplay import STUB, STEP
URL = sys.argv[1]; res = []
def ok(name, cond, extra=""): res.append(bool(cond)); print(("PASS " if cond else "FAIL ") + name + (" | " + str(extra) if extra != "" and not cond else ""))
with sync_playwright() as p:
    b = p.chromium.launch(args=["--mute-audio"])
    pg = b.new_page(viewport={"width": 1024, "height": 768}); pg.add_init_script(STUB); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(URL); pg.wait_for_timeout(900); pg.click('[data-p="marie"]'); pg.wait_for_timeout(300)
    pg.evaluate("""()=>{ const st = Mission.eng(), M = Mission.map(); st.place.done = true;
      M.order.forEach(id => { st.skills[id] = { lvl: 4, streak: 0, n: 5, right: 5, recent: [1,1,1,1,1], due: Date.now() + 9e9, gap: 3, stuckN: 0, stuckRight: 0, repairs: 0, parkedUntil: 0, first2: [1,1] }; });
      st.sets = ["learn:add:c", "learn:add:c", "learn:add:c"]; save(); }""")
    pg.click("#goBtn"); pg.wait_for_timeout(900)
    ok("a speed set on times facts comes", pg.evaluate("()=>TopicHost.isOpen() && TopicHost.state.topic === 'times_facts'"), pg.evaluate("()=>TopicHost.state.topic"))
    page_text = pg.evaluate("()=>document.body.innerText")
    ok("no clock or seconds shown to the child", "second" not in page_text.lower() and "timer" not in page_text.lower())
    for _ in range(12):
        pg.evaluate(STEP); pg.wait_for_timeout(1700)
    fast = pg.evaluate("()=>(Mission.eng().skills['times_facts.0'].fast || []).length")
    ok("answers were timed from the first key press", fast >= 3, fast)
    ok("no page errors", not errs, errs[:3])
    b.close()
print(f"RESULT {sum(res)}/{len(res)} passed")
