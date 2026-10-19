"""Silent check of Kennedy's world: battle bar, bad guys sent home, coins, castle shop, castle defence. One line per check."""
import sys
from playwright.sync_api import sync_playwright
sys.path.insert(0, __file__.rsplit("\\", 1)[0].rsplit("/", 1)[0])
from autoplay import STUB, STEP, COL
URL = sys.argv[1]; res = []
def ok(name, cond, extra=""): res.append(bool(cond)); print(("PASS " if cond else "FAIL ") + name + (" | " + str(extra) if extra != "" and not cond else ""))
with sync_playwright() as p:
    b = p.chromium.launch(args=["--mute-audio"])
    pg = b.new_page(viewport={"width": 820, "height": 1180}); pg.add_init_script(STUB); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(URL); pg.wait_for_timeout(1200)
    pg.click('[data-p="kennedy"]'); pg.wait_for_timeout(300)
    ok("tab says Castle for Kennedy", pg.text_content("#tabHome").strip().endswith("Castle"))
    pg.click("#goBtn"); pg.wait_for_timeout(400)
    ok("battle scene shows during maths", pg.locator(".say.scene-knight .sc-r").count() + pg.locator(".tp-talk.scene-knight .sc-r").count() >= 1)
    kinds = {}; answered = 0
    for _ in range(500):
        r = pg.evaluate(STEP)
        if r == "col": pg.evaluate(COL)
        kinds[r.split(":")[0]] = kinds.get(r.split(":")[0], 0) + 1
        if r.startswith(("topic", "sums", "col", "river")): answered += 1
        pg.wait_for_timeout(1700 if r.startswith(("topic", "sums", "col", "river")) else 450)
        if kinds.get("defended") or r == "off": break
    st = pg.evaluate("()=>({coins:P.coins||0, defeated:P.defeated||0, defended:Object.values(P.days)[0].defended||false})")
    ok("sent bad guys home", st["defeated"] >= 4, st)
    ok("castle defence came after 20 answers and was won", st["defended"] and kinds.get("ladder", 0) >= 5, (st, kinds))
    ok("coins: 5 per bad guy plus 10 for the castle", st["coins"] == st["defeated"] * 5 + 10, st)
    pg.evaluate("()=>{Mission.pause()}"); pg.click("#tabHome"); pg.wait_for_timeout(400)
    ok("castle shop shows", pg.locator("[data-buy]").count() == 14)
    pg.click('[data-buy="wall"]'); pg.wait_for_timeout(200)
    ok("buying the wall spends 10 coins", pg.evaluate("()=>[P.castle.includes('wall'), P.coins]") == [True, st["coins"] - 10])
    ok("a tower needs the wall first, then can be bought", pg.is_enabled('[data-buy="tower_l"]'))
    pg.screenshot(path="knight_castle.png", full_page=True)
    ok("no page errors", not errs, errs[:3])
    b.close()
print(f"RESULT {sum(res)}/{len(res)} passed")
