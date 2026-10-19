"""Silent check of the Think tab: locked before 3 sets, then each thinking game opens, takes a few taps, and exits. One line per check."""
import sys
from playwright.sync_api import sync_playwright
sys.path.insert(0, __file__.rsplit("\\", 1)[0].rsplit("/", 1)[0])
from autoplay import STUB
URL = sys.argv[1]; res = []
def ok(name, cond, extra=""): res.append(bool(cond)); print(("PASS " if cond else "FAIL ") + name + (" | " + str(extra) if extra != "" and not cond else ""))
with sync_playwright() as p:
    b = p.chromium.launch(args=["--mute-audio"])
    for vw, vh in [(375, 667), (1024, 768)]:
        pg = b.new_page(viewport={"width": vw, "height": vh}); pg.add_init_script(STUB); errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.goto(URL); pg.wait_for_timeout(1200)
        pg.click('[data-p="marie"]'); pg.wait_for_timeout(300)
        pg.click("#tabThink"); pg.wait_for_timeout(300)
        ok(f"{vw} locked before 3 sets", "open after 3 sets" in pg.text_content("#viewThink"))
        pg.evaluate("()=>{const k=KidsEngine.dayKey(Date.now()); P.days=P.days||{}; P.days[k]={n:15,clean:15,ms:60000,sets:3,skills:{}}; save();}")
        pg.click("#tabSums"); pg.click("#tabThink"); pg.wait_for_timeout(300)
        ids = pg.evaluate("()=>[...document.querySelectorAll('#viewThink [data-game]')].map(b=>b.dataset.game)")
        ok(f"{vw} games listed", len(ids) >= 4, ids)
        for gid in ids:
            pg.click(f'[data-game="{gid}"]'); pg.wait_for_timeout(500)
            btns = pg.locator("#viewThink .think-game button")
            n = btns.count()
            for i in range(min(6, n)):
                try: btns.nth(min(n - 1, 3 + i * 2)).click(timeout=1500)
                except Exception: pass
                pg.wait_for_timeout(150)
            pg.screenshot(path=f"think_{gid}_{vw}.png")
            fits = pg.evaluate("()=>document.documentElement.scrollWidth <= innerWidth + 1")
            ok(f"{vw} {gid}: opens with buttons and fits the screen", n >= 3 and fits, (n, fits))
            ex = pg.locator("#viewThink .think-game button", has_text="Exit")
            if ex.count(): ex.first.click()
            else: pg.evaluate("()=>ThinkTab.stop()")
            pg.wait_for_timeout(300)
        ms = pg.evaluate("()=>P.days[KidsEngine.dayKey(Date.now())].ms")
        ok(f"{vw} thinking time counts in the daily limit", ms > 60000, ms)
        pg.evaluate("()=>{const k=KidsEngine.dayKey(Date.now()); P.days[k].ms=26*60000; save();}"); pg.click("#tabSums"); pg.click("#tabThink"); pg.wait_for_timeout(200)
        ok(f"{vw} closed after the daily limit", "done for today" in pg.text_content("#viewThink"))
        ok(f"{vw} no page errors", not errs, errs[:3])
        pg.close()
    b.close()
print(f"RESULT {sum(res)}/{len(res)} passed")
