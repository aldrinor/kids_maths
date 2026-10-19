"""Silent check: ANY two or more buttons that sit side by side (same parent, same line) must have the same width
(2 px tolerance). Walks every screen a child or parent can reach. One line per screen."""
import sys
from playwright.sync_api import sync_playwright
sys.path.insert(0, __file__.rsplit("\\", 1)[0].rsplit("/", 1)[0])
from autoplay import STUB, STEP
URL = sys.argv[1]; res = []
JS = """() => { const bad = new Set();
  const vis = el => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && el.offsetParent !== null; };
  const isBtn = el => el.tagName === 'BUTTON' || el.classList.contains('main-btn') || el.getAttribute('role') === 'button';
  document.querySelectorAll('*').forEach(par => {
    const kids = [...par.children].filter(c => isBtn(c) && vis(c)); if (kids.length < 2) return;
    // keypads and grids of tiles are fine as long as each line is even; group by line
    const lines = {}; kids.forEach(c => { const t = Math.round(c.getBoundingClientRect().top / 6); (lines[t] = lines[t] || []).push(c); });
    Object.values(lines).forEach(row => { if (row.length < 2) return; const ws = row.map(c => Math.round(c.getBoundingClientRect().width));
      if (Math.max(...ws) - Math.min(...ws) > 2) bad.add((par.id ? '#' + par.id : par.className || par.tagName) + ' [' + row.map(c => (c.textContent || c.getAttribute('aria-label') || '').trim().slice(0, 12)).join(' | ') + '] ' + ws.join(',')); }); });
  return [...bad]; }"""
def ok(name, cond, extra=""): res.append(bool(cond)); print(("PASS " if cond else "FAIL ") + name + (" | " + str(extra) if extra != "" and not cond else ""))
with sync_playwright() as p:
    b = p.chromium.launch(args=["--mute-audio"])
    for vw, vh in [(1024, 768), (375, 667)]:
        pg = b.new_page(viewport={"width": vw, "height": vh}); pg.add_init_script(STUB); pg.set_default_timeout(5000); errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.goto(URL); pg.wait_for_timeout(900)
        def chk(tag):
            bad = pg.evaluate(JS); ok(f"{vw} {tag}", not bad, bad[:4])
        ev = lambda js: (pg.evaluate(js), pg.wait_for_timeout(350))
        chk("profiles")
        ev("()=>document.querySelector('[data-p=\"parent\"]').click()"); chk("parent code")
        pg.fill("#pinIn", "0913"); pg.keyboard.press("Enter"); pg.wait_for_timeout(300); chk("parent: whose progress")
        ev("()=>document.querySelector('[data-c=\"marie\"]').click()"); chk("parent area")
        ev("()=>document.getElementById('pPlace').click()"); chk("parent: re-run check question")
        ev("()=>document.getElementById('pPlaceNo').click()"); ev("()=>document.getElementById('resetBtn').click()"); chk("parent: erase question")
        ev("()=>document.getElementById('resetNo').click()")
        ev("()=>{const k=document.querySelector('#grown [data-child]'); if(k) k.click();}"); chk("parent area Kennedy")
        ev("()=>startAs('demo')"); chk("demo welcome")
        ev("()=>startAs('marie')"); chk("Marie welcome")
        ev("()=>document.getElementById('goBtn').click()"); pg.wait_for_timeout(700)
        for i in range(6): pg.evaluate(STEP); pg.wait_for_timeout(1700)
        chk("Marie maths")
        for i in range(10):
            if pg.evaluate("()=>!!document.getElementById('cafeGo')"): break
            pg.evaluate(STEP); pg.wait_for_timeout(1700)
        chk("Marie cafe moment")
        ev("()=>{Mission.pause(); P.stars=60; P.pet={id:'cat',name:'Snowy',toys:['crown'],wear:'',pats:0,meals:0}; const k=KidsEngine.dayKey(Date.now()); P.days[k].sets=3; save(); showView('home');}"); chk("Marie house")
        ev("()=>document.querySelector('[data-part=\"garden\"]').click()"); chk("Marie garden")
        ev("()=>document.querySelector('[data-part=\"pet\"]').click()"); chk("Marie pet")
        for g in ["chess", "battleship", "codebreaker", "hanoi", "nim"]:
            ev("()=>showView('think')"); ev(f"()=>document.querySelector('[data-game=\"{g}\"]').click()"); chk(g)
            ev("()=>{const b=[...document.querySelectorAll('#viewThink .think-game button')].find(x=>/lesson|play|start/i.test(x.textContent)); if(b) b.click();}"); chk(g + " inside")
            ev("()=>ThinkTab.stop()")
        ev("()=>{showView('sums'); startAs('kennedy');}"); chk("Kennedy welcome")
        ev("()=>document.getElementById('goBtn').click()"); pg.wait_for_timeout(700)
        for i in range(6): pg.evaluate(STEP); pg.wait_for_timeout(1700)
        chk("Kennedy maths")
        for i in range(10):
            if pg.evaluate("()=>!!document.getElementById('winNext')"): break
            pg.evaluate(STEP); pg.wait_for_timeout(1700)
        chk("Kennedy bad guy sent home")
        ev("()=>{Mission.pause(); const c=document.getElementById('cover'); c.hidden=false; KnightWorld.defence(c,1,()=>{})}"); chk("castle defence")
        ev("()=>{document.getElementById('cover').hidden=true; P.coins=200; save(); showView('home');}"); chk("castle")
        ok(f"{vw} no page errors", not errs, errs[:3])
        pg.close()
    b.close()
print(f"RESULT {sum(res)}/{len(res)} passed")
