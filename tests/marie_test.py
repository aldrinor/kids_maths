"""Silent check of Marie's world: cafe customers between sets, garden (plant, water once a day, pick), pet. One line per check."""
import sys
from playwright.sync_api import sync_playwright
sys.path.insert(0, __file__.rsplit("\\", 1)[0].rsplit("/", 1)[0])
from autoplay import STUB, play
URL = sys.argv[1]; res = []
def ok(name, cond, extra=""): res.append(bool(cond)); print(("PASS " if cond else "FAIL ") + name + (" | " + str(extra) if extra != "" and not cond else ""))
with sync_playwright() as p:
    b = p.chromium.launch(args=["--mute-audio"])
    for vw, vh in [(375, 667), (1024, 768)]:
        pg = b.new_page(viewport={"width": vw, "height": vh}); pg.add_init_script(STUB); errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.goto(URL); pg.wait_for_timeout(1200)
        pg.click('[data-p="marie"]'); pg.click("#goBtn"); pg.wait_for_timeout(400)
        play(pg, 11)
        st = pg.evaluate("()=>({served:(P.cafe||{}).served||0, cooks:P.cooks||0, stars:P.stars})")
        ok(f"{vw} cafe customers came and were cooked for", st["served"] >= 2 and st["cooks"] >= 2, st)
        pg.evaluate("()=>{Mission.pause(); P.stars=40; save();}")
        pg.click("#tabHome"); pg.wait_for_timeout(500)
        ok(f"{vw} home shows House, Garden, Pet", pg.locator("[data-part]").count() == 3)
        pg.click('[data-part="garden"]'); pg.wait_for_timeout(300)
        pg.click('[data-seed="tulip"]'); pg.wait_for_timeout(200)
        ok(f"{vw} planting a tulip costs 3 stars", pg.evaluate("()=>[P.garden.plots[0]&&P.garden.plots[0].id, P.stars]") == ["tulip", 37])
        pg.click('[data-water="0"]'); pg.wait_for_timeout(200)
        ok(f"{vw} water once a day only", pg.is_disabled('[data-water="0"]') and pg.evaluate("()=>P.garden.plots[0].stage") == 1)
        pg.evaluate("()=>{P.garden.plots[0].stage=3; save();}"); pg.click('[data-part="pet"]'); pg.click('[data-part="garden"]'); pg.wait_for_timeout(200)
        pg.click('[data-pick="0"]'); pg.wait_for_timeout(200)
        ok(f"{vw} picking gives food for the cafe and a star", pg.evaluate("()=>[P.pantry, P.stars]") == [1, 38])
        pg.screenshot(path=f"marie_garden_{vw}.png")
        pg.click('[data-part="pet"]'); pg.click('[data-pet="cat"]'); pg.wait_for_timeout(200)
        pg.click('[data-act="feed"]'); pg.wait_for_timeout(150); pg.click('[data-toy="crown"]'); pg.wait_for_timeout(200)
        ok(f"{vw} pet: fed from the garden, crown bought and worn", pg.evaluate("()=>[P.pantry, P.pet.meals, P.pet.wear, P.stars]") == [0, 1, "crown", 23])
        pg.screenshot(path=f"marie_pet_{vw}.png")
        fits = pg.evaluate("()=>document.documentElement.scrollWidth <= innerWidth + 1")
        ok(f"{vw} fits the screen", fits)
        ok(f"{vw} no page errors", not errs, errs[:3])
        pg.close()
    b.close()
print(f"RESULT {sum(res)}/{len(res)} passed")
