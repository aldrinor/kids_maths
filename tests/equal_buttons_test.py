"""Silent check: in every row of buttons, buttons on the same line have the same width (2 px tolerance). One line per screen."""
import sys
from playwright.sync_api import sync_playwright
sys.path.insert(0, __file__.rsplit("\\", 1)[0].rsplit("/", 1)[0])
from autoplay import STUB, STEP
URL = sys.argv[1]; res = []
JS = """() => { const rows = document.querySelectorAll('.jbtns, .mw-tabs, .mw-acts, .welcome .plan, .ch-row, .bg-row, .tabs, .kd-keys, .tp-choices, .prof-list');
  const bad = []; rows.forEach(r => { if (!r.offsetParent) return; const kids = [...r.children].filter(c => c.offsetParent && c.getBoundingClientRect().width > 0);
    const tops = {}; kids.forEach(c => { const t = Math.round(c.getBoundingClientRect().top / 4); (tops[t] = tops[t] || []).push(Math.round(c.getBoundingClientRect().width)); });
    Object.values(tops).forEach(ws => { if (ws.length > 1 && Math.max(...ws) - Math.min(...ws) > 2) bad.push(r.className + ': ' + ws.join(',')); }); });
  return bad; }"""
def ok(name, cond, extra=""): res.append(bool(cond)); print(("PASS " if cond else "FAIL ") + name + (" | " + str(extra) if extra != "" and not cond else ""))
with sync_playwright() as p:
    b = p.chromium.launch(args=["--mute-audio"])
    for vw, vh in [(1024, 768), (375, 667)]:
        pg = b.new_page(viewport={"width": vw, "height": vh}); pg.add_init_script(STUB); pg.set_default_timeout(5000); errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.goto(URL); pg.wait_for_timeout(900)
        def chk(tag):
            bad = pg.evaluate(JS); ok(f"{vw} {tag}: equal buttons", not bad, bad[:3])
        chk("profiles")
        pg.evaluate("()=>document.querySelector('[data-p=\"marie\"]').click()"); pg.wait_for_timeout(300); chk("welcome")
        pg.evaluate("()=>document.getElementById('goBtn').click()"); pg.wait_for_timeout(1000)
        for i in range(6): pg.evaluate(STEP); pg.wait_for_timeout(1700)
        chk("Marie maths")
        pg.evaluate("()=>{Mission.pause(); P.stars=50; P.pet={id:'cat',name:'Snowy',toys:[],wear:'',pats:0,meals:0}; const k=KidsEngine.dayKey(Date.now()); P.days[k].sets=3; save(); showView('home');}"); pg.wait_for_timeout(500); chk("Marie house")
        pg.evaluate("()=>document.querySelector('[data-part=\"pet\"]').click()"); pg.wait_for_timeout(300); chk("Marie pet")
        for g in ["chess", "battleship", "codebreaker", "hanoi", "nim"]:
            pg.evaluate("()=>showView('think')"); pg.wait_for_timeout(300)
            pg.evaluate(f"()=>document.querySelector('[data-game=\"{g}\"]').click()"); pg.wait_for_timeout(500); chk(g)
            pg.evaluate("()=>ThinkTab.stop()"); pg.wait_for_timeout(200)
        pg.evaluate("()=>{showView('sums'); startAs('kennedy');}"); pg.wait_for_timeout(300)
        pg.evaluate("()=>document.getElementById('goBtn').click()"); pg.wait_for_timeout(1000)
        for i in range(6): pg.evaluate(STEP); pg.wait_for_timeout(1700)
        chk("Kennedy maths")
        pg.evaluate("()=>{Mission.pause(); const c=document.getElementById('cover'); c.hidden=false; KnightWorld.defence(c,1,()=>{})}"); pg.wait_for_timeout(400); chk("castle defence")
        ok(f"{vw} no page errors", not errs, errs[:3])
        pg.close()
    b.close()
print(f"RESULT {sum(res)}/{len(res)} passed")
