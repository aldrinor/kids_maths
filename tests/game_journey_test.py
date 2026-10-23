"""Connected-journey check for game/index.html (review items 8-dots, 17, 18, 19, 20, 21, 23 and Round F):
 - the first-then picture strip (maths, game, play world, done) with one stone per game on the path, static, no animation
 - a card with one big Go button before each little game and before the play world; a rest card at answer 25 between game and world;
   nothing moves on by itself (the cards wait)
 - one spoken line at answer 20 (play world is near), said once, never cut off by the game
 - the keepsake of a game is saved together with the counters, shown on a card, on the world shelf and in the small room on the question screen
 - the play world: a cue 30 seconds before the end, a soft ending, "I am done" with a two-picture question, the clock stops while the page is hidden
 - a break button with a quiet card, logged for the grown-up; the question is read again; break time is not thinking time
 - the end-of-day card: stars, coins held, what is being saved for
 - coins fly into the pill (calm, short); under reduced motion they do not fly; every fade is 250 ms or less and none under reduced motion
Silent (stubbed speech and AudioContext, --mute-audio). Prints only failures and one RESULT line.
Run: python tests/game_journey_test.py [chromium|webkit]"""
import json
import os
import socket
import subprocess
import sys
import time
from playwright.sync_api import sync_playwright

SITE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = 8797
URL = f"http://localhost:{PORT}/game/index.html"
ENGINE = next((a for a in sys.argv[1:] if a in ("chromium", "webkit")), "chromium")
STUB = ("window.__demoFast=true;window.__noVoice=true;window.__sayLog=[];window.speechSynthesis={speak(){},cancel(){},getVoices(){return[]}};"
        "window.SpeechSynthesisUtterance=function(){};window.AudioContext=window.webkitAudioContext=undefined;")
res = []


def ok(name, cond, info=""):
    res.append(bool(cond))
    if not cond:
        print(f"FAIL {name} {info}")


def up():
    with socket.socket() as s:
        return s.connect_ex(("127.0.0.1", PORT)) == 0


def fresh(br, who, vw=820, vh=1180, stub=STUB, reduced=False):
    ctx = br.new_context(viewport={"width": vw, "height": vh}, reduced_motion="reduce" if reduced else "no-preference")
    pg = ctx.new_page(); pg.errs = []
    pg.on("pageerror", lambda e: pg.errs.append(str(e)))
    pg.add_init_script(stub)
    pg.goto(URL); pg.evaluate("()=>localStorage.clear()"); pg.reload()
    pg.wait_for_selector(".over.start .go[data-v]")
    pg.click(f'.over .go[data-v="{who}"]')
    pg.wait_for_function("()=>__game.QS", timeout=8000)
    return pg


def answer(pg, right=True):
    pg.evaluate("""(right)=>{const Q=__game.Q, v=right?Q.ans:Q.ans+1;
      if(Q.kind==='choice'){__game.QS.pick=right?Q.ans:Q.opts.find(o=>o!==Q.ans)}else{__game.QS.typed=String(v)};
      document.getElementById('tile').click()}""", right)


def next_question(pg):
    """one right answer and Next"""
    answer(pg, True)
    pg.wait_for_function("()=>__game.QS && __game.QS.phase==='right'", timeout=8000)
    pg.click("#tile")


def watch_end(pg):
    """in the fast test mode the 'play time is over' card closes after 50 ms, so it is watched for instead of waited for"""
    pg.evaluate("()=>{window.__endSeen=0; new MutationObserver(()=>{ if(document.querySelector('.pw-end')) window.__endSeen++ }).observe(document.body,{childList:true,subtree:true})}")


def saw_end(pg):
    pg.wait_for_function("()=>window.__endSeen>0", timeout=8000)


def wait_ask(pg):
    pg.wait_for_function("()=>__game.QS && __game.QS.phase==='ask' && !__game.QS.teaching", timeout=60000)


def card(pg, kind, timeout=30000):
    pg.wait_for_selector(f'.over.jover .jpanel[data-kind="{kind}"]', timeout=timeout)


def tap_go(pg, kind):
    card(pg, kind)
    pg.click(f'.over.jover .jpanel[data-kind="{kind}"] .jgo')


def set_counts(pg, since_reward, since_play):
    pg.evaluate("([a,b])=>{__game.P.game.sinceReward=a; __game.P.game.sincePlay=b; __game.P.game.nearSaid=false; save()}", [since_reward, since_play])


server = None
if not up():
    server = subprocess.Popen([sys.executable, "-m", "http.server", str(PORT)], cwd=SITE, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    for _ in range(50):
        if up():
            break
        time.sleep(0.1)

try:
    with sync_playwright() as p:
        br = getattr(p, ENGINE).launch(**({"args": ["--mute-audio"]} if ENGINE == "chromium" else {}))

        # ---------- the strip: four pictures, one stone per game, static ----------
        for who in ("marie", "kennedy"):
            pg = fresh(br, who)
            ok(f"{who} strip: four pictures in order", pg.evaluate("()=>[...document.querySelectorAll('#dots .jstrip .jn')].map(e=>e.dataset.s).join(',')") == "maths,game,world,done")
            ok(f"{who} strip: maths is lit, 5 stones, none filled", pg.evaluate("()=>{const s=document.querySelector('#dots .jstrip'); return s.dataset.step==='maths' && s.querySelectorAll('.jst').length===5 && s.dataset.stones==='0' && s.querySelector('.jn.on').dataset.s==='maths'}"))
            ok(f"{who} strip: the 5 answer dots are still there", pg.locator("#dots i").count() == 5)
            ok(f"{who} strip: has a plain label for a screen reader", "First maths, then a game" in (pg.get_attribute("#dots .jstrip", "aria-label") or ""))
            ok(f"{who} strip: nothing moves (no animation or transition on it)", pg.evaluate("()=>[...document.querySelectorAll('#dots .jstrip, #dots .jstrip *')].every(e=>{const c=getComputedStyle(e); return c.animationName==='none' && (c.transitionDuration==='0s' || c.transitionProperty==='none')})"))
            set_counts(pg, 0, 10)
            pg.evaluate("()=>drawDots()")
            ok(f"{who} strip: 2 stones filled at 10 answers", pg.evaluate("()=>document.querySelector('#dots .jstrip').dataset.stones") == "2" and pg.locator("#dots .jst.full").count() == 2)
            ok(f"{who} strip: the home button and the break button are both in the tools", pg.locator("#tools .breakbtn").count() == 1 and pg.locator("#tools .bin.home").count() == 1)
            ok(f"{who} no page errors (strip)", not pg.errs, pg.errs[:3])
            pg.context.close()

        # ---------- a game, the keepsake, the rest card, the play world (Marie, answer 25) ----------
        pg = fresh(br, "marie")
        set_counts(pg, 4, 24)
        answer(pg, True)
        pg.wait_for_function("()=>__game.QS.phase==='right'", timeout=8000)
        pg.click("#tile")
        card(pg, "game")
        ok("game card: one big Go button, a word for a reader", pg.locator(".jpanel[data-kind=game] .jgo").count() == 1 and "Go" in pg.inner_text(".jpanel[data-kind=game] .jgo"))
        ok("game card: the strip shows the game step and the path", pg.evaluate("()=>{const s=document.querySelector('.jpanel .jstrip'); return s.dataset.step==='game' && s.querySelectorAll('.jst.full').length===5}"))
        ok("game card: the line is spoken through say()", pg.evaluate("()=>__sayLog.includes('Time for a little game!')"))
        pg.wait_for_timeout(2500)
        ok("game card: it waits (no game starts by itself)", pg.locator(".rewardhost").count() == 0 and pg.locator(".jpanel[data-kind=game]").count() == 1)
        ok("game card: the Go button is big", pg.evaluate("()=>{const r=document.querySelector('.jpanel .jgo').getBoundingClientRect(); return r.height>=64 && r.width>=120}"))
        ok("game card: the fade in is 250 ms or less", pg.evaluate("()=>{const d=parseFloat(getComputedStyle(document.querySelector('.over.jover')).animationDuration); return d>0 && d<=0.25}"))
        pg.click(".jpanel[data-kind=game] .jgo")
        pg.wait_for_selector(".rewardhost", timeout=30000)
        ok("reward game starts only after Go", pg.locator(".rewardhost").count() == 1)
        ok("reward game: the fade in is 250 ms or less", pg.evaluate("()=>{const d=parseFloat(getComputedStyle(document.querySelector('.rewardhost')).animationDuration); return d>0 && d<=0.25}"))
        g = pg.evaluate("()=>JSON.parse(localStorage.getItem('kidsMaths.game.marie')).game")
        ok("reward game open: counters not reset yet and no keepsake yet", g["sinceReward"] == 5 and g["rewardTurn"] == 0 and not pg.evaluate("()=>JSON.parse(localStorage.getItem('kidsMaths.game.marie')).keepsakes"))
        pg.evaluate("()=>RewardGames.close()")
        card(pg, "keepsake")
        sv = pg.evaluate("()=>JSON.parse(localStorage.getItem('kidsMaths.game.marie'))")
        ok("keepsake saved in the same save as the counters", sv["game"]["sinceReward"] == 0 and sv["game"]["rewardTurn"] == 1 and len(sv.get("keepsakes", [])) == 1, sv.get("keepsakes"))
        k0 = sv["keepsakes"][0]
        ok("keepsake: a record with the game, the picture, the label and the day", k0["g"] in ("cookie", "hot_chocolate", "ice_cream") and k0["a"].endswith(".png") and k0["l"] and k0["day"])
        ok("keepsake card: the medal shows the game's own picture", pg.evaluate("(a)=>{const i=document.querySelector('.jpanel .jmedal image'); return !!i && i.getAttribute('href')===a}", k0["a"]))
        ok("keepsake card: the picture file exists", pg.evaluate("async(a)=>{const r=await fetch(a); return r.ok}", k0["a"]))
        ok("keepsake card: never pass or fail words", not any(w in pg.inner_text(".jpanel").lower() for w in ("pass", "fail", "score", "won", "lost", "wrong")))
        ok("keepsake card: plain true words (from your game, not 'you made')", "made" not in pg.inner_text(".jpanel[data-kind=keepsake]").lower() and "Your keepsake" in pg.inner_text(".jpanel[data-kind=keepsake]"))
        ok("keepsake card: says it is theirs to keep", pg.evaluate("()=>__sayLog.includes('Here is a keepsake from your game. It is yours to keep.')"))
        ok("the small room on the question screen already shows the keepsake", pg.evaluate("(a)=>{const k=document.querySelector('#homebadge .jkeep'); return !!k && k.getAttribute('src')===a}", k0["a"]))
        pg.click(".jpanel[data-kind=keepsake] .jgo")
        card(pg, "pause")
        ok("rest card at answer 25: kind words, Go, and the play world has not started", "slow breath" in pg.inner_text(".jpanel[data-kind=pause]") and pg.locator(".pw-host").count() == 0)
        ok("rest card: the strip lights the world step", pg.evaluate("()=>document.querySelector('.jpanel .jstrip').dataset.step") == "world")
        ok("rest card: spoken", pg.evaluate("()=>__sayLog.includes('You worked hard! Take a slow breath. Then we play in your cafe.')"))
        pg.wait_for_timeout(1500)
        ok("rest card: it waits", pg.locator(".pw-host").count() == 0)
        pg.click(".jpanel[data-kind=pause] .jgo")
        pg.wait_for_selector(".pw-host", timeout=30000)
        watch_end(pg)
        ok("world: the keepsake stands on the shelf", pg.evaluate("(a)=>{const i=document.querySelector('.pw-shelf img'); return !!i && i.getAttribute('src')===a}", k0["a"]))
        ok("world: an 'I am done' button with a word for a reader", "I am done" in pg.inner_text(".pw-done"))
        ok("world: fade in 250 ms or less", pg.evaluate("()=>parseFloat(getComputedStyle(document.querySelector('.pw-host')).animationDuration)<=0.25"))
        pg.evaluate("()=>{window.__soft=null; new MutationObserver(()=>{const e=document.querySelector('.pw-end'),h=document.querySelector('.pw-host'); if(e&&h&&!window.__soft) window.__soft=[h.classList.contains('soft'), parseFloat(getComputedStyle(e).animationDuration)]}).observe(document.body,{childList:true,subtree:true,attributes:true})}")
        pg.evaluate("()=>PlayWorlds._finish()")
        saw_end(pg)
        sf = pg.evaluate("()=>window.__soft")
        ok("world: the soft ending dims the room and the card fades in (250 ms or less)", sf and sf[0] is True and 0 < sf[1] <= 0.25, sf)
        pg.wait_for_function("()=>!document.querySelector('.pw-host') && __game.QS && __game.QS.phase==='ask'", timeout=20000)
        ok("after the world: counters reset and saved", pg.evaluate("()=>JSON.parse(localStorage.getItem('kidsMaths.game.marie')).game.sincePlay") == 0)
        ok("no page errors (game, keepsake, rest, world)", not pg.errs, pg.errs[:3])
        pg.context.close()

        # ---------- a world with no game before it: a world card; Kennedy gets picture buttons only ----------
        pg = fresh(br, "kennedy", stub=STUB + "window.__noRewards=true;window.__worldMinutes=20;")
        set_counts(pg, 0, 24)
        next_question(pg)
        card(pg, "world")
        ok("kennedy world card: round picture button, no word on it", pg.evaluate("()=>{const b=document.querySelector('.jpanel .jgo'); const r=b.getBoundingClientRect(); return b.classList.contains('kid') && b.innerText.trim()==='' && r.width>=96 && r.height>=96 && !!b.getAttribute('aria-label')}"))
        pg.wait_for_function("()=>__sayLog.includes('Tap the big round button to go.')", timeout=8000)
        ok("kennedy world card: the line and what to tap are spoken", pg.evaluate("()=>__sayLog.includes('Now it is time to play in your castle!')"))
        pg.click(".jpanel .jgo")
        pg.wait_for_selector(".pw-host", timeout=30000)
        ok("kennedy world: the done button is a picture only", pg.evaluate("()=>{const b=document.querySelector('.pw-done'); return b.innerText.trim()==='' && b.getBoundingClientRect().width>=60}"))
        # I am done: a question with two pictures first
        bx = pg.eval_on_selector(".pw-ring", "e=>{const r=e.getBoundingClientRect(); return [r.x+r.width/2, r.y+r.height/2]}")
        pg.mouse.move(bx[0], bx[1]); pg.mouse.down(); pg.wait_for_timeout(2200); pg.mouse.up()
        ok("holding the ring no longer ends play", pg.locator(".pw-host").count() == 1 and pg.locator(".pw-end").count() == 0)
        pg.click(".pw-done")
        ok("I am done: first a question with a tick and a cross, and play has not ended", pg.locator(".pw-ask .yes").count() == 1 and pg.locator(".pw-ask .no").count() == 1 and pg.locator(".pw-end").count() == 0)
        ok("I am done: the question is spoken", pg.evaluate("()=>__sayLog.includes('All done playing? Tap the tick to stop, or the cross to keep playing.')"))
        pg.click(".pw-ask .no")
        ok("I am done: the cross keeps playing", pg.locator(".pw-ask").count() == 0 and pg.locator(".pw-host").count() == 1 and pg.locator(".pw-end").count() == 0)
        watch_end(pg)
        pg.click(".pw-done"); pg.click(".pw-ask .yes")
        saw_end(pg)
        pg.wait_for_function("()=>!document.querySelector('.pw-host') && __game.QS && __game.QS.phase==='ask'", timeout=20000)
        ok("I am done: the tick ends play early and the counters are saved", pg.evaluate("()=>JSON.parse(localStorage.getItem('kidsMaths.game.kennedy')).game.sincePlay") == 0)
        ok("no page errors (kennedy world card, I am done)", not pg.errs, pg.errs[:3])
        pg.context.close()

        # ---------- the world clock: the 30-second cue, the soft end, and a hidden page does not use up play time ----------
        pg = fresh(br, "marie", stub=STUB + "window.__noRewards=true;window.__worldMinutes=2;")
        set_counts(pg, 0, 24)
        next_question(pg)
        tap_go(pg, "world")
        pg.wait_for_selector(".pw-host", timeout=30000)
        watch_end(pg)
        pg.wait_for_function("()=>document.querySelector('.pw-host') && document.querySelector('.pw-host').dataset.left", timeout=5000)
        pg.evaluate("()=>{Object.defineProperty(document,'hidden',{value:true,configurable:true}); document.dispatchEvent(new Event('visibilitychange'))}")
        l0 = int(pg.evaluate("()=>document.querySelector('.pw-host').dataset.left"))
        pg.wait_for_timeout(900)
        l1 = int(pg.evaluate("()=>document.querySelector('.pw-host').dataset.left"))
        ok("hidden page: the play clock stands still", abs(l0 - l1) <= 120, (l0, l1))
        pg.evaluate("()=>{Object.defineProperty(document,'hidden',{value:false,configurable:true}); document.dispatchEvent(new Event('visibilitychange'))}")
        pg.wait_for_function("(l)=>parseInt(document.querySelector('.pw-host').dataset.left)<l-300", arg=l1, timeout=5000)
        ok("visible again: the clock runs", True)
        pg.wait_for_function("()=>document.querySelector('.pw-host') && document.querySelector('.pw-host').classList.contains('dusk')", timeout=8000)
        ok("30-second cue: the line is spoken once and the room warms", pg.evaluate("()=>__sayLog.filter(t=>t==='Thirty seconds left to play.').length")==1)
        ok("1-minute cue still there", pg.evaluate("()=>__sayLog.includes('One more minute to play.')"))
        saw_end(pg)
        ok("play time ended by the clock", True)
        pg.wait_for_function("()=>!document.querySelector('.pw-host') && __game.QS", timeout=20000)
        ok("no page errors (clock)", not pg.errs, pg.errs[:3])
        pg.context.close()

        # ---------- answer 20: one spoken line, said once, before the next question ----------
        for sr in (0, 4):
            pg = fresh(br, "marie")
            set_counts(pg, sr, 19)
            next_question(pg)
            if sr == 4:
                tap_go(pg, "game"); pg.wait_for_selector(".rewardhost", timeout=30000); pg.evaluate("()=>RewardGames.close()"); tap_go(pg, "keepsake")
            wait_ask(pg)
            pg.wait_for_function("()=>__sayLog.includes('Your play time is coming soon!')", timeout=8000)
            log = pg.evaluate("()=>__sayLog")
            ok(f"answer 20 (reward {'yes' if sr else 'no'}): the line is spoken once", log.count("Your play time is coming soon!") == 1, log[-6:])
            if sr == 4:
                ok("answer 20: it comes after the game cards, so nothing cuts it off", log.index("Your play time is coming soon!") > log.index("Here is a keepsake from your game. It is yours to keep."))
            pg.wait_for_function("()=>__sayLog[__sayLog.length-1]===__game.Q.say", timeout=8000)
            ok("answer 20: the question is read after it", pg.evaluate("()=>{const l=__sayLog; return l.indexOf('Your play time is coming soon!') < l.length-1 && l[l.length-1]===__game.Q.say}"))
            ok("answer 20: remembered in the save", pg.evaluate("()=>JSON.parse(localStorage.getItem('kidsMaths.game.marie')).game.nearSaid") is True)
            next_question(pg)
            wait_ask(pg)
            pg.wait_for_timeout(600)
            ok(f"answer 21: not said again (reward {'yes' if sr else 'no'})", pg.evaluate("()=>__sayLog.filter(t=>t==='Your play time is coming soon!').length") == 1)
            pg.context.close()

        # ---------- a break ----------
        for who in ("marie", "kennedy"):
            pg = fresh(br, who)
            q0 = pg.evaluate("()=>__game.Q.key")
            pg.evaluate("()=>{__game.QS.t0 -= 4000}")
            t0 = pg.evaluate("()=>__game.QS.t0")
            n_say = pg.evaluate("()=>__sayLog.length")
            pg.click("#tools .breakbtn")
            card(pg, "break")
            ok(f"{who} break: a quiet card with a moon, one big Go", pg.locator(".over.jquiet .jmoon").count() == 1 and pg.locator(".jpanel[data-kind=break] .jgo").count() == 1)
            ok(f"{who} break: the card says rest is fine", pg.evaluate("()=>__sayLog.includes('Take a break. Tap go when you are ready.')"))
            pg.wait_for_timeout(1800)
            ok(f"{who} break: it waits as long as the child likes, the question is still the same", pg.locator(".jpanel[data-kind=break]").count() == 1 and pg.evaluate("()=>__game.Q.key") == q0)
            pg.click(".jpanel[data-kind=break] .jgo")
            pg.wait_for_function("()=>!document.querySelector('.over')", timeout=5000)
            d = pg.evaluate("()=>{const d=__game.P.days[Object.keys(__game.P.days)[0]]; return [d.breaks, d.breakMs]}")
            ok(f"{who} break: logged for the grown-up (count and time)", d[0] == 1 and d[1] >= 1000, d)
            ok(f"{who} break: the break time is not thinking time", pg.evaluate("()=>__game.QS.t0") - t0 >= 1000)
            pg.wait_for_function("(n)=>__sayLog.length>n+1 && __sayLog[__sayLog.length-1]===__game.Q.say", arg=n_say, timeout=5000)
            ok(f"{who} break: the question is read again", True)
            ok(f"{who} break: the save has it", pg.evaluate("()=>JSON.parse(localStorage.getItem('kidsMaths.game.%s')).days[Object.keys(__game.P.days)[0]].breaks" % who) == 1)
            # a break while the lesson is up pauses the lesson, then it goes on
            answer(pg, False)
            pg.wait_for_selector("#board", timeout=8000)
            pg.click("#tools .breakbtn"); card(pg, "break")
            pg.click(".jpanel[data-kind=break] .jgo")
            pg.wait_for_function("()=>!document.querySelector('.over')", timeout=5000)
            ok(f"{who} break during a lesson: the lesson carries on and ends", pg.wait_for_function("()=>!document.querySelector('#boardbtns .again').hidden", timeout=90000) is not None)
            ok(f"{who} no page errors (break)", not pg.errs, pg.errs[:3])
            pg.context.close()

        # ---------- the end of the day card ----------
        for who in ("marie", "kennedy"):
            pg = fresh(br, who)
            pg.evaluate("()=>{const d=__game.P.days; const k=KidsEngine.dayKey(Date.now()); d[k]=d[k]||{n:0,clean:0,ms:0,sets:0,skills:{}}; d[k].ms=26*60000; d[k].clean=7; __game.P.coins=12; save()}")
            next_question(pg)
            pg.wait_for_selector(".jpanel.jday", timeout=15000)
            rows = pg.evaluate("()=>[...document.querySelectorAll('.jday .jrow')].map(r=>[r.dataset.k, (r.querySelector('.jnum')||{innerText:''}).innerText.trim()])")
            ok(f"{who} day card: stars today", ["stars", "8"] in rows or ["stars", "7"] in rows, rows)
            ok(f"{who} day card: coins held", any(k == "coins" and v.isdigit() and int(v) >= 12 for k, v in rows), rows)
            ok(f"{who} day card: what is being saved for (a picture, a price, a bar)", pg.evaluate("()=>{const w=document.querySelector('.jrow[data-k=want]'); return !!w && !!w.querySelector('img') && !!w.querySelector('.jbar i') && /\\d/.test(w.innerText)}"), pg.inner_text(".jday"))
            ok(f"{who} day card: the strip ends on done", pg.evaluate("()=>document.querySelector('.jday .jstrip').dataset.step") == "done")
            if who == "marie":
                ok("marie day card: words for a reader", "Stars today" in pg.inner_text(".jday") and "Saving for" in pg.inner_text(".jday"))
            else:
                ok("kennedy day card: pictures and numbers only, a round OK", "Stars today" not in pg.inner_text(".jday") and pg.locator(".jday .jgo.kid").count() == 1)
            ok(f"{who} day card: spoken lines", pg.evaluate("()=>__sayLog.includes('See you tomorrow! That is all the maths for today. Well done!')"))
            pg.click(".jday .jgo")
            pg.wait_for_selector(".over.start", timeout=8000)
            ok(f"{who} day card: OK goes to the doors", True)
            ok(f"{who} no page errors (day card)", not pg.errs, pg.errs[:3])
            pg.context.close()

        # ---------- coins fly (calm) and under reduced motion they do not ----------
        pg = fresh(br, "marie")
        pg.evaluate("()=>{window.__seen=0; new MutationObserver(m=>m.forEach(r=>r.addedNodes.forEach(n=>{if(n.classList&&n.classList.contains('jcoin'))window.__seen++}))).observe(document.body,{childList:true})}")
        c0 = pg.evaluate("()=>__game.P.coins")
        answer(pg, True)
        pg.wait_for_function("()=>window.__seen>0", timeout=3000)
        ok("coins fly: coin pictures appear and go", pg.evaluate("()=>Journey.flights") >= 1)
        pg.wait_for_function("(c)=>parseInt(document.querySelector('#coins b').textContent)===c+2 && !document.querySelector('.jcoin')", arg=c0, timeout=5000)
        ok("coins fly: the pill shows the new number when they land and the coins are gone", True)
        ok("coins fly: no more than 3 at a time", pg.evaluate("()=>window.__seen")<=3)
        pg.context.close()
        pg = fresh(br, "marie", reduced=True)
        pg.evaluate("()=>{window.__seen=0; new MutationObserver(m=>m.forEach(r=>r.addedNodes.forEach(n=>{if(n.classList&&n.classList.contains('jcoin'))window.__seen++}))).observe(document.body,{childList:true})}")
        c0 = pg.evaluate("()=>__game.P.coins")
        answer(pg, True)
        pg.wait_for_function("()=>__game.QS.phase==='right'", timeout=8000)
        ok("reduced motion: no coin flies", pg.evaluate("()=>window.__seen")==0 and pg.evaluate("()=>Journey.flights")==0)
        ok("reduced motion: the pill is updated at once", int(pg.inner_text("#coins b")) == c0 + 2)
        set_counts(pg, 5, 0)
        pg.click("#tile")
        card(pg, "game")
        ok("reduced motion: cards do not fade", pg.evaluate("()=>getComputedStyle(document.querySelector('.over.jover')).animationName")=="none")
        pg.context.close()

        # ---------- the keepsake is what the game reports she made (cafe), not a guess ----------
        seen_games = []
        for turn in (0, 1, 2):
            pg = fresh(br, "marie", stub=STUB + "window.__rewardAutoPlay=true;")
            pg.evaluate("()=>{const o=RewardGames.play; RewardGames.play=function(el,opt){return o.call(RewardGames,el,opt).then(r=>{window.__rewardResult=r; return r})}}")
            pg.evaluate("(t)=>{__game.P.game.sinceReward=4; __game.P.game.rewardTurn=t; save()}", turn)
            next_question(pg)
            tap_go(pg, "game")
            pg.wait_for_selector(".rewardhost .rw-done", timeout=90000)
            pg.click(".rewardhost .rw-done")
            card(pg, "keepsake")
            r = pg.evaluate("()=>window.__rewardResult")
            kp = pg.evaluate("()=>__game.P.keepsakes[0]")
            name = r["game"]; seen_games.append(name)
            ok(f"{name}: the game reports what she chose", name in ("cookie", "hot_chocolate", "ice_cream") and isinstance(r.get("keep"), str) and r["keep"].startswith("rewards/art/cafe/"), r)
            ok(f"{name}: the keepsake is exactly that picture", kp["a"] == r["keep"] and kp["g"] == name, [kp, r])
            ok(f"{name}: the medal shows it", pg.evaluate("(a)=>document.querySelector('.jpanel .jmedal image').getAttribute('href')===a", r["keep"]))
            ok(f"{name}: the picture file is there", pg.evaluate("async(a)=>(await fetch(a)).ok", r["keep"]))
            ok(f"{name} no page errors", not pg.errs, pg.errs[:3])
            pg.context.close()
        ok("the three cafe games all report their own pick", sorted(seen_games) == ["cookie", "hot_chocolate", "ice_cream"], seen_games)

        # ---------- the small room: the same friend, wall and bought things as the world ----------
        pg = fresh(br, "marie")
        pg.evaluate("""()=>{__game.P.world={cafe:{started:1,seq:3,owned:{'cafe:cafe_lamp_floor':1,'pets:pet_bed':1},petWith:'bunny',pets:[{kind:'bunny',x:1,y:1}],
            places:{cafe:{wall:'pink_dots',floor:'wood',items:[{u:1,id:'cafe_table',x:1,y:1},{u:2,id:'cafe_lamp_floor',x:2,y:2}]},garden:{items:[]},pets:{items:[]}}}}; updateBadge()}""")
        ok("badge: says my cafe", "my cafe" in pg.inner_text("#homebadge") and "my cafe" in (pg.get_attribute("#homebadge .jroom", "aria-label") or ""))
        ok("badge: the same friend (her bunny)", "pet_bunny_sit" in (pg.get_attribute("#homebadge .jfriend", "src") or ""))
        ok("badge: her bought lamp is there", any("cafe_lamp_floor" in (e or "") for e in pg.eval_on_selector_all("#homebadge .jitem", "els=>els.map(e=>e.getAttribute('src'))")))
        ok("badge: the wall she chose", "svg" in (pg.get_attribute("#homebadge .jwall", "style") or "") or "url" in (pg.get_attribute("#homebadge .jwall", "style") or ""))
        ok("badge: only a picture, taps go through it", pg.evaluate("()=>getComputedStyle(document.querySelector('#homebadge')).pointerEvents")=="none")
        ok("badge: nothing inside the question scene was added (scene keeps its own pictures)", pg.evaluate("()=>!document.querySelector('#scene .jroom, #scene .jkeep, #scene .jmedal')"))
        info = pg.evaluate("()=>PlayWorlds.info('cafe', __game.P.world, 0)")
        ok("world info: the cheapest thing to save for", info["want"] and info["want"]["price"] == 5 and info["canBuy"] is False, info.get("want"))
        info = pg.evaluate("()=>PlayWorlds.info('cafe', __game.P.world, 9999)")
        ok("world info: with plenty of coins it says she can buy", info["canBuy"] is True and info["want"] is not None)
        ok("no page errors (badge)", not pg.errs, pg.errs[:3])
        pg.context.close()
        pg = fresh(br, "kennedy")
        pg.evaluate("""()=>{__game.P.world={castle:{owned:{keep_stone:1},slots:{keep:'keep_stone'},pet:'dog',buddies:['leaf']}}; updateBadge()}""")
        ok("kennedy badge: my castle, his dog, his keep", "my castle" in pg.inner_text("#homebadge") and "pet_dog_sit" in (pg.get_attribute("#homebadge .jfriend", "src") or "") and "keep_stone" in (pg.get_attribute("#homebadge .jitem", "src") or ""))
        info = pg.evaluate("()=>PlayWorlds.info('castle', __game.P.world, 0)")
        ok("kennedy world info: saving for something with a price and a picture", info["want"] and info["want"]["price"] > 0 and info["want"]["img"].endswith(".png"), info.get("want"))
        ok("no page errors (kennedy badge)", not pg.errs, pg.errs[:3])
        pg.context.close()
        br.close()
finally:
    if server:
        server.terminate()
print(f"RESULT {sum(res)}/{len(res)} passed")
