"""Silent browser check of the play-first chess screen (Marie at 1024 px, Kennedy at 375 px).
Starts its own server on port 8771 from the repo root. Run from the repo root: python tests/chess_ui_test.py
Saves chess_marie_1024.png and chess_kennedy_375.png in the repo root. Last line: RESULT x/y passed."""
import subprocess
import sys
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
PORT = 8771
URL = f"http://localhost:{PORT}/index.html"
STUB = ('window.speechSynthesis={speak(){},cancel(){},getVoices(){return[]},pause(){},resume(){}};'
        'window.SpeechSynthesisUtterance=function(){};window.AudioContext=window.webkitAudioContext=undefined;window.__cookAutoPlay=true;')
res = []


def ok(name, cond, extra=""):
    res.append(bool(cond))
    print(("PASS " if cond else "FAIL ") + name + ("" if cond or extra == "" else " | " + str(extra)))


def open_chess(pg, who):
    pg.goto(URL)
    pg.wait_for_timeout(700)
    if who == "marie":
        pg.click('[data-p="marie"]')
    else:
        pg.evaluate("()=>startAs('kennedy')")
    pg.wait_for_timeout(500)
    pg.evaluate("""()=>{const k=KidsEngine.dayKey(Date.now()); P.days=P.days||{}; P.days[k]={n:15,clean:15,ms:60000,sets:3,skills:{}}; save(); showView('think');}""")
    pg.wait_for_timeout(500)
    pg.click('[data-game="chess"]')
    pg.wait_for_timeout(600)


def run(browser, who, vw, vh, shot):
    pg = browser.new_page(viewport={"width": vw, "height": vh})
    pg.add_init_script(STUB)
    pg.set_default_timeout(6000)
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    tag = f"{who} {vw}px "
    open_chess(pg, who)
    ok(tag + "board shown immediately (no lesson list)", pg.locator(".ch-board").count() == 1 and pg.locator('[data-act="start"]').count() == 0)
    ok(tag + "64 square buttons with labels", pg.locator("button.ch-sq[aria-label]").count() == 64)
    ok(tag + "32 piece tokens", pg.locator(".ch-tok").count() == 32)
    ok(tag + "all 32 tokens have character art", pg.locator(".ch-tok .ch-face svg").count() == 32, pg.locator(".ch-tok .ch-face svg").count())
    ok(tag + "32 piece badges", pg.locator(".ch-badge").count() == 32)
    if who == "marie":
        ok(tag + "Kitty family faces used", pg.locator(".ch-tok svg.kc").count() == 16 and pg.locator(".ch-tok svg.ka-badguy").count() == 16,
           (pg.locator(".ch-tok svg.kc").count(), pg.locator(".ch-tok svg.ka-badguy").count()))
    else:
        ok(tag + "knight art and goblins used", pg.locator(".ch-tok svg.ka-badguy").count() == 16 and pg.locator(".ch-tok svg.ka-horse").count() == 2
           and pg.locator(".ch-tok svg.ka-knight").count() >= 9 and pg.locator(".ch-tok svg.ka-buddy").count() == 3 and pg.locator(".ch-tok svg.ch-tower").count() == 2,
           (pg.locator(".ch-tok svg.ka-badguy").count(), pg.locator(".ch-tok svg.ka-horse").count()))
    ok(tag + "aria labels name characters", "e 2, your pawn" in pg.get_attribute('[data-sq="52"]', "aria-label") and "goblin" in pg.get_attribute('[data-sq="4"]', "aria-label"),
       pg.get_attribute('[data-sq="52"]', "aria-label"))
    ok(tag + "no horizontal scroll", pg.evaluate("()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth"))
    # tap a white pawn: legal markers + a tip
    pg.click('[data-sq="52"]')
    pg.wait_for_timeout(200)
    ok(tag + "tapping e2 pawn shows 2 move dots", pg.locator(".ch-mv").count() == 2, pg.locator(".ch-mv").count())
    ok(tag + "selected square highlighted", pg.locator(".ch-sl").count() == 1)
    ok(tag + "pawn tip shown in status", "Pawns" in pg.inner_text(".ch-status"), pg.inner_text(".ch-status"))
    # tapping the pony / knight shows its tip
    pg.click('[data-sq="52"]')
    pg.click('[data-sq="62"]')
    pg.wait_for_timeout(200)
    ok(tag + "knight tip shown", "L" in pg.inner_text(".ch-status") and pg.locator(".ch-mv").count() == 2, pg.inner_text(".ch-status"))
    pg.click('[data-sq="62"]')
    # hint draws an arrow
    pg.click('[data-act="hint"]')
    pg.wait_for_timeout(200)
    ok(tag + "Hint draws an arrow and gives a reason", pg.locator(".ch-arrow").count() == 1 and len(pg.inner_text(".ch-status")) > 10, pg.inner_text(".ch-status"))
    # make a legal move: e2-e4, the coach replies
    pg.click('[data-sq="52"]')
    pg.click('[data-sq="36"]')
    pg.wait_for_function("()=>document.querySelector('[data-act=hint]') && !document.querySelector('[data-act=hint]').disabled", timeout=5000)
    pg.wait_for_timeout(200)
    moved = pg.evaluate("()=>[...document.querySelectorAll('.ch-sq')].filter(b=>/goblin/.test(b.getAttribute('aria-label'))).length")
    ok(tag + "e4 pawn is placed", "your pawn" in pg.get_attribute('[data-sq="36"]', "aria-label"))
    ok(tag + "coach replied with a soft last-move highlight", pg.locator(".ch-ls").count() == 2 and "goblin" in pg.inner_text(".ch-status"), pg.inner_text(".ch-status"))
    ok(tag + "16 goblins still on the board", moved == 16, moved)
    # equal-width button row
    ws = pg.evaluate("()=>[...document.querySelectorAll('.ch-actions > button')].map(b=>Math.round(b.getBoundingClientRect().width))")
    ok(tag + "five equal-width buttons (max-min <= 2px)", len(ws) == 5 and max(ws) - min(ws) <= 2, ws)
    labels = pg.evaluate("()=>[...document.querySelectorAll('.ch-actions > button')].map(b=>b.dataset.act)")
    ok(tag + "button order Hint, Undo, New game, Piece lessons, Exit", labels == ["hint", "undo", "newgame", "menu", "exit"], labels)
    # undo
    pg.click('[data-act="undo"]')
    pg.wait_for_timeout(200)
    ok(tag + "Undo puts the pawn back", "e 2, your pawn" in pg.get_attribute('[data-sq="52"]', "aria-label"))
    ok(tag + "status line is polite live region", pg.get_attribute(".ch-status", "aria-live") == "polite")
    ok(tag + "board fits the screen width", pg.evaluate("()=>document.querySelector('.ch-board').getBoundingClientRect().right<=window.innerWidth"))
    # piece lessons still reachable
    pg.click('[data-act="menu"]')
    pg.wait_for_timeout(200)
    ok(tag + "Piece lessons opens the lesson list", pg.locator('[data-act="start"]').count() >= 1)
    pg.click('[data-act="game"]')
    pg.wait_for_timeout(200)
    ok(tag + "Back to the game works", pg.locator(".ch-tok").count() == 32)
    pg.screenshot(path=str(ROOT / shot))
    ok(tag + "no page errors", not errs, errs[:2])
    pg.close()


def main():
    server = subprocess.Popen([sys.executable, "-m", "http.server", str(PORT)], cwd=str(ROOT), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(1.2)
    try:
        with sync_playwright() as p:
            b = p.webkit.launch()
            run(b, "marie", 1024, 768, "chess_marie_1024.png")
            run(b, "kennedy", 375, 667, "chess_kennedy_375.png")
            b.close()
    finally:
        server.terminate()
    print(f"RESULT {sum(res)}/{len(res)} passed")
    sys.exit(0 if all(res) else 1)


main()
