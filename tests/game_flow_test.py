"""Game flow check for game/index.html: doors, story questions, right / wrong / wrong twice, lessons, coins,
the reward game after 5 answers, the engine record, the save (reload) and the one-time copy of the old app's save.
Silent. Prints only failures and one RESULT line.
Run: python tests/game_flow_test.py http://localhost:8790/game/index.html [chromium|webkit]"""
import json
import sys
from playwright.sync_api import sync_playwright

URL = sys.argv[1]
ENGINE = sys.argv[2] if len(sys.argv) > 2 else "chromium"
STUB = ("window.__demoFast=true;window.__noVoice=true;window.speechSynthesis={speak(){},cancel(){},getVoices(){return[]}};"
        "window.SpeechSynthesisUtterance=function(){};window.AudioContext=window.webkitAudioContext=undefined;")
res = []


def ok(name, cond, info=""):
    res.append(bool(cond))
    if not cond:
        print(f"FAIL {name} {info}")


def answer(pg, right=True):
    pg.evaluate("""(right)=>{const Q=__game.Q, v=right?Q.ans:Q.ans+1;
      if(Q.kind==='choice'){__game.QS.pick=right?Q.ans:Q.opts.find(o=>o!==Q.ans)}else{__game.QS.typed=String(v)};
      document.getElementById('tile').click()}""", right)


def wait_ask(pg, answered):
    pg.wait_for_function(f"()=>__game.QS && __game.QS.phase==='ask' && __game.P.game.answered==={answered} && !__game.QS.teaching", timeout=90000)


with sync_playwright() as p:
    br = getattr(p, ENGINE).launch(**({"args": ["--mute-audio"]} if ENGINE == "chromium" else {}))
    for who, theme in [("marie", "cafe"), ("kennedy", "castle")]:
        ctx = br.new_context(viewport={"width": 820, "height": 1180})
        pg = ctx.new_page(); errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.add_init_script(STUB)
        # an old save from the old app: progress and coins must carry over, and the old key must stay untouched
        old_key = "kittyBlocks.progress" if who == "marie" else "kidsMaths.kennedy"
        old = {"stars": 30, "coins": 40, "engine": None, "home": [{"uid": 1, "id": "kitty", "x": 40, "y": 90}]}
        pg.goto(URL)
        pg.evaluate("([k,v])=>{localStorage.clear(); localStorage.setItem(k, v)}", [old_key, json.dumps(old)])
        pg.reload(); pg.wait_for_timeout(500)
        ok(f"{who} doors show both children", pg.locator(".over.start .go[data-v]").count() == 2)
        pg.click(f'.over .go[data-v="{who}"]'); pg.wait_for_timeout(500)
        ok(f"{who} theme", pg.evaluate("()=>document.body.dataset.theme") == theme)
        ok(f"{who} coins carried over", pg.evaluate("()=>__game.P.coins") == (30 if who == "marie" else 40), pg.evaluate("()=>__game.P.coins"))
        ok(f"{who} house carried over", pg.evaluate("()=>Array.isArray(__game.P.home) && __game.P.home.length===1"))
        ok(f"{who} story shown", len(pg.inner_text(".story")) > 20, pg.inner_text(".story"))
        ok(f"{who} no topic choice anywhere", pg.locator("text=/choose a topic|pick a topic/i").count() == 0)
        c0 = pg.evaluate("()=>__game.P.coins")
        # 1 right first try: +2 coins, lesson plays, next comes by itself
        answer(pg, True)
        pg.wait_for_selector("#board", timeout=8000)
        ok(f"{who} right: +2 coins", pg.evaluate("()=>__game.P.coins") == c0 + 2)
        wait_ask(pg, 1)
        # 2 wrong then right: lesson, +1 coin
        c1 = pg.evaluate("()=>__game.P.coins")
        answer(pg, False)
        pg.wait_for_selector("#board", timeout=8000)
        ok(f"{who} wrong: lesson shown", pg.locator("#board").count() == 1)
        pg.wait_for_function("()=>!__game.QS.teaching && !document.querySelector('#boardbtns .again').hidden", timeout=90000)
        answer(pg, True)
        pg.wait_for_function("()=>__game.P.game.answered===2", timeout=8000)
        ok(f"{who} right after lesson: +1 coin", pg.evaluate("()=>__game.P.coins") == c1 + 1)
        wait_ask(pg, 2)
        # 3 wrong twice: Oops, See The Answer, Next; no coin
        c2 = pg.evaluate("()=>__game.P.coins")
        answer(pg, False)
        pg.wait_for_function("()=>!__game.QS.teaching && !document.querySelector('#boardbtns .again').hidden", timeout=90000)
        answer(pg, False)
        pg.wait_for_function("()=>__game.QS.phase==='final'", timeout=8000)
        ok(f"{who} wrong twice: See The Answer", "See The Answer" in pg.inner_text("#tile"))
        pg.wait_for_function("()=>!document.getElementById('tile').classList.contains('dim')", timeout=8000)
        pg.click("#tile"); pg.wait_for_timeout(300)
        ok(f"{who} answer shown", "correct answer" in pg.inner_text("#msg"))
        ok(f"{who} wrong twice: no coin", pg.evaluate("()=>__game.P.coins") == c2)
        pg.click("#tile")
        wait_ask(pg, 3)
        # 4, 5: right; after the 5th the reward game shows
        for k in (4, 5):
            answer(pg, True)
            pg.wait_for_function(f"()=>__game.P.game.answered==={k}", timeout=8000)
            if k == 4:
                wait_ask(pg, 4)
        pg.wait_for_selector(".rewardhost", timeout=90000)
        ok(f"{who} reward game after 5", pg.locator(".rewardhost").count() == 1)
        pg.evaluate("()=>RewardGames.close()")
        pg.wait_for_function("()=>!document.querySelector('.rewardhost') && __game.QS && __game.QS.phase==='ask'", timeout=15000)
        ok(f"{who} counter back to 0 after the reward", pg.evaluate("()=>__game.P.game.sinceReward") == 0)
        ok(f"{who} engine recorded answers", pg.evaluate("()=>{const d=__game.P.days, k=Object.keys(d)[0]; return d[k].n}") == 5)
        # save survives a reload; the old app's key is not touched
        saved = pg.evaluate("()=>JSON.parse(localStorage.getItem('kidsMaths.game.%s')).game.answered" % who)
        ok(f"{who} saved", saved == 5, saved)
        ok(f"{who} old save untouched", json.loads(pg.evaluate("(k)=>localStorage.getItem(k)", old_key)) == old)
        pg.reload(); pg.wait_for_timeout(400); pg.click(f'.over .go[data-v="{who}"]'); pg.wait_for_timeout(400)
        ok(f"{who} progress kept after reload", pg.evaluate("()=>__game.P.game.answered") == 5)
        # home button goes back to the doors
        pg.click("#tools .bin.home"); pg.wait_for_timeout(300)
        ok(f"{who} home button shows the doors", pg.locator(".over.start").count() == 1)
        ok(f"{who} no page errors", not errs, errs[:3])
        ctx.close()
    br.close()
print(f"RESULT {sum(res)}/{len(res)} passed")
