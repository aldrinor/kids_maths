"""Game calm / safety check for game/index.html (review items 1, 2, 3, 4, 5, 6, 7, 11, 16, 17, 19, 29):
 - a clean right answer gives Next and "Watch how it works" (no forced lesson, no timer); close and Next are there from the start;
   a skill she already knows gets no lesson offer
 - the second wrong answer uses the same kind words: no cross, no grey bar, no dimmed button; it earns 1 effort coin (a rushed guess earns none)
 - no question shows its answer before the child answers (every kind, both children)
 - the cafe never shakes or plays a falling tone on a mistake
 - voice: the clip list is tried again, a failed clip is tried again, then the device voice speaks
 - saves: corrupt, empty and old-shape saves; the damaged one is copied, the parent is told, no blank screen; a failed save warns the parent
 - counters move only after the reward game / play world has finished
 - focus moves into cards, lessons, hints and games and comes back
Silent (stubbed speech and AudioContext, --mute-audio). Prints only failures and one RESULT line.
Run: python tests/game_safety_test.py [chromium|webkit]"""
import json
import os
import socket
import subprocess
import sys
import time
from playwright.sync_api import sync_playwright

SITE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = 8796
URL = f"http://localhost:{PORT}/game/index.html"
ENGINE = next((a for a in sys.argv[1:] if a in ("chromium", "webkit")), "chromium")
STUB = ("window.__demoFast=true;window.__noVoice=true;window.speechSynthesis={speak(){},cancel(){},getVoices(){return[]}};"
        "window.SpeechSynthesisUtterance=function(){};window.AudioContext=window.webkitAudioContext=undefined;"
        "window.__persistCalls=0;try{Object.defineProperty(navigator,'storage',{value:{persist(){window.__persistCalls++;return Promise.resolve(true)}},configurable:true})}catch(e){}")
# a pretend Web Audio so the voice code runs; it counts what happens and makes no sound
VOICE_STUB = ("window.__demoFast=true;window.__spoken=[];window.__played=0;window.__osc=0;"
              "window.speechSynthesis={speak(u){window.__spoken.push(u.text)},cancel(){},getVoices(){return[]}};"
              "window.SpeechSynthesisUtterance=function(t){this.text=t};"
              "window.AudioContext=window.webkitAudioContext=function(){this.state='running';this.currentTime=0;this.destination={};this.resume=function(){};"
              "this.decodeAudioData=function(b,ok,no){if(b.byteLength<4){no(new Error('bad'))}else{ok({duration:0.01})}};"
              "this.createBufferSource=function(){var s={connect(){},start(){window.__played++;setTimeout(function(){s.onended&&s.onended()},5)},stop(){}};return s};"
              "this.createOscillator=function(){window.__osc++;return{connect(){},start(){},stop(){},type:'',frequency:{value:0,setValueAtTime(){},exponentialRampToValueAtTime(){}}}};"
              "this.createGain=function(){return{connect(){},gain:{setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}}}}};")
res = []
VERBOSE = bool(os.environ.get("SAFETY_VERBOSE"))


def step(name):
    """with SAFETY_VERBOSE=1 each section announces itself, so a slow run can be located"""
    if VERBOSE:
        print("STEP", name, time.strftime("%H:%M:%S"), flush=True)


def ok(name, cond, info=""):
    res.append(bool(cond))
    if not cond:
        print(f"FAIL {name} {info}")


def fnv(text):
    h = 0x811c9dc5
    for b in text.encode("utf-8"):
        h ^= b
        h = (h * 0x01000193) & 0xffffffff
    return f"{h:08x}"


def up():
    with socket.socket() as s:
        return s.connect_ex(("127.0.0.1", PORT)) == 0


def fresh(br, who, vw=820, vh=1180, stub=STUB, keep=None):
    """a new page at the doors with an empty store (or the saves in keep: {key: text}); then the child's door is tapped when who is given"""
    ctx = br.new_context(viewport={"width": vw, "height": vh})
    pg = ctx.new_page()
    pg.errs = []
    pg.on("pageerror", lambda e: pg.errs.append(str(e)))
    pg.add_init_script(stub)
    pg.goto(URL)
    pg.evaluate("()=>localStorage.clear()")
    for k, v in (keep or {}).items():
        pg.evaluate("([k,v])=>localStorage.setItem(k,v)", [k, v])
    pg.reload()
    pg.wait_for_selector(".over.start .go[data-v]")
    if who:
        pg.click(f'.over .go[data-v="{who}"]')
        pg.wait_for_function("()=>__game.QS || document.querySelector('.parentnote')", timeout=8000)
    return pg


def answer(pg, right=True):
    pg.evaluate("""(right)=>{const Q=__game.Q, v=right?Q.ans:Q.ans+1;
      if(Q.kind==='choice'){__game.QS.pick=right?Q.ans:Q.opts.find(o=>o!==Q.ans)}else{__game.QS.typed=String(v)};
      document.getElementById('tile').click()}""", right)


def lesson_done(pg):
    pg.wait_for_function("()=>!__game.QS.teaching && !document.querySelector('#boardbtns .again').hidden", timeout=90000)


def wait_ask(pg, n=None):
    cond = "()=>__game.QS && __game.QS.phase==='ask' && !__game.QS.teaching" + (f" && __game.P.game.answered==={n}" if n is not None else "")
    pg.wait_for_function(cond, timeout=90000)


def active_in(pg, sel):
    return pg.evaluate("(s)=>{const a=document.activeElement; return !!(a && a.closest(s))}", sel)


server = None
if not up():
    server = subprocess.Popen([sys.executable, "-m", "http.server", str(PORT)], cwd=SITE, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    for _ in range(50):
        if up():
            break
        time.sleep(0.1)

with sync_playwright() as p:
    br = getattr(p, ENGINE).launch(**({"args": ["--mute-audio"]} if ENGINE == "chromium" else {}))

    # ---------- 1 no forced lesson after a clean right answer; close and Next from the start; a known skill gets no offer ----------
    step('1 no forced lesson after a clean right answer; close and Next from the start; a known skill gets no offer')
    for who in ("marie", "kennedy"):
        pg = fresh(br, who)
        ok(f"{who} the browser is asked to keep the save", pg.evaluate("()=>window.__persistCalls") >= 1, pg.evaluate("()=>window.__persistCalls"))
        ok(f"{who} the first question holds focus (a screen reader reads it)", active_in(pg, "#qbody .story"))
        answer(pg, True)
        pg.wait_for_function("()=>__game.QS.phase==='right'", timeout=8000)
        pg.wait_for_timeout(4800)                               # longer than the old 4 second timer, at any speed
        ok(f"{who} right: still on the same question after 4.8 s (no timer)", pg.evaluate("()=>__game.QS.phase") == "right" and pg.evaluate("()=>__game.P.game.answered") == 1)
        ok(f"{who} right: no lesson is forced", pg.locator("#board").count() == 0)
        ok(f"{who} right: Next is shown from the start", pg.is_visible("#tile") and "Next" in pg.inner_text("#tile"))
        ok(f"{who} right: 'Watch how it works' is offered", pg.locator("#qbody .watch").count() == 1 and pg.is_visible("#qbody .watch"))
        ok(f"{who} right: the message is the one word 'Correct!'", pg.inner_text("#msg").strip().endswith("Correct!"), pg.inner_text("#msg"))
        pg.click("#qbody .watch")
        pg.wait_for_selector("#boardbtns", timeout=5000)
        vis = pg.evaluate("()=>({bx:!document.querySelector('#boardbtns .bx').hidden, next:!document.querySelector('#boardbtns .bnext').hidden, again:document.querySelector('#boardbtns .again').hidden})")
        ok(f"{who} lesson: close and Next are there from the start", vis["bx"] and vis["next"] and vis["again"], vis)
        ok(f"{who} lesson: focus moved into the lesson card", active_in(pg, "#boardbtns"))
        pg.click("#boardbtns .bx")
        pg.wait_for_timeout(200)
        ok(f"{who} lesson closed early: lesson gone, Next and Watch are back", pg.locator("#board").count() == 0 and pg.is_visible("#tile") and pg.locator("#qbody .watch").count() == 1)
        ok(f"{who} lesson closed: focus is back on a button of the question", pg.evaluate("()=>{const a=document.activeElement; return !!a && (a.id==='tile' || a.classList.contains('watch'))}"))
        pg.click("#qbody .watch")
        lesson_done(pg)
        pg.click("#boardbtns .bnext")
        wait_ask(pg, 1)
        ok(f"{who} Next from the lesson card goes to a new question", pg.evaluate("()=>__game.P.game.answered") == 1)
        # a skill she already knows: no lesson offer at all
        pg.evaluate("()=>{const s=GameSave.newSkill(); s.lvl=3; __game.P.engine.skills[__game.Q.skill]=s}")
        answer(pg, True)
        pg.wait_for_function("()=>__game.QS.phase==='right'", timeout=8000)
        ok(f"{who} known skill: Next only, no 'Watch how it works'", pg.locator("#qbody .watch").count() == 0 and "Next" in pg.inner_text("#tile"))
        pg.click("#tile")
        wait_ask(pg, 2)
        ok(f"{who} no page errors (lesson choice)", not pg.errs, pg.errs[:3])
        pg.context.close()

    # ---------- 2 the second wrong answer is gentle; effort coin ----------
    step('2 the second wrong answer is gentle; effort coin')
    for who in ("marie", "kennedy"):
        pg = fresh(br, who)
        pg.evaluate("()=>{__game.QS.t0=Date.now()-6000}")        # a thought-about answer, not a rushed tap
        c0 = pg.evaluate("()=>__game.P.coins")
        answer(pg, False)
        first = pg.inner_text("#msg")
        lesson_done(pg)
        answer(pg, False)
        pg.wait_for_function("()=>__game.QS.phase==='final'", timeout=8000)
        msg, icon = pg.inner_text("#msg"), pg.inner_text("#msg .mi")
        ok(f"{who} second miss: same kind words as the first", "Not yet" in msg and "Not yet" in first, (first, msg))
        ok(f"{who} second miss: no 'incorrect', no cross", "incorrect" not in msg.lower() and "✗" not in pg.inner_text("#msg") and icon.strip() == "!", (msg, icon))
        ok(f"{who} second miss: no grey bar", pg.locator(".band").count() == 0)
        ok(f"{who} second miss: the button is not dimmed and works at once", "dim" not in pg.get_attribute("#tile", "class") and "See The Answer" in pg.inner_text("#tile"))
        ok(f"{who} second miss: 1 effort coin (the owner's rule)", pg.evaluate("()=>__game.P.coins") == c0 + 1, (c0, pg.evaluate("()=>__game.P.coins")))
        ok(f"{who} second miss: the day record stays strict (not clean)", pg.evaluate("()=>{const d=Object.values(__game.P.days)[0]; return d.n===1 && d.clean===0}"))
        pg.click("#tile")
        pg.wait_for_function("()=>__game.QS.phase==='shown'", timeout=5000)
        pg.click("#tile")
        wait_ask(pg, 1)
        ok(f"{who} no page errors (second miss)", not pg.errs, pg.errs[:3])
        pg.context.close()

    # ---------- 3 no picture gives the answer away before she answers (every kind, both children) ----------
    step('3 no picture gives the answer away before she answers (every kind, both children)')
    for who in ("marie", "kennedy"):
        pg = fresh(br, who)
        r = pg.evaluate("""()=>{const bad=[], theme=document.body.dataset.theme; let n=0;
          for(const sk of KS.SKILLS){ if(!KS.fits(sk,theme)) continue;
            for(let i=0;i<40;i++){ const q=__game.make(sk); if(!q) continue; __game.show(q); n++;
              const S=__game.QS, onLine=S.line>=S.lo&&S.line<=S.hi;
                            if(onLine && S.line===q.ans) bad.push([sk,q.type,q.story.slice(0,40),'hopper on '+q.ans]);
              if(S.hops.length) bad.push([sk,'hops drawn before the answer']);
              const sc=document.querySelector('#scene'), seen=sc.innerText+' '+[...sc.querySelectorAll('[alt],[aria-label]')].map(e=>e.getAttribute('alt')||e.getAttribute('aria-label')).join(' ');
              if(new RegExp('(^|\\\\D)'+q.ans+'(\\\\D|$)').test(seen)) bad.push([sk,q.type,'scene shows '+q.ans+': '+seen.slice(0,60)]);
              if(q.kind==='choice'){ const picks=document.querySelectorAll('#qbody .opt.sel, #qbody .opt.right'); if(picks.length) bad.push([sk,'an option is already marked']); }
            } }
          return {n, bad:bad.slice(0,6)}}""")
        ok(f"{who} answer sweep: {r['n']} questions, none gives the answer away", not r["bad"], r["bad"])
        ok(f"{who} answer sweep covered many questions", r["n"] >= 100, r["n"])
        pg.evaluate("""()=>{const q=KS.make('kinder.2', document.body.dataset.theme==='cafe'?'cafe':'castle', Math.random, ''); __game.show(q)}""")
        ok(f"{who} 'Which number is ...?' starts the hopper at the beginning of the line", pg.evaluate("()=>__game.Q.type==='K' && __game.QS.line===__game.QS.lo && __game.QS.line!==__game.Q.ans"))
        ok(f"{who} no page errors (sweep)", not pg.errs, pg.errs[:3])
        pg.context.close()

    # ---------- 4/16 the cafe: no shaking, no falling tone, a kind line ----------
    step('4/16 the cafe: no shaking, no falling tone, a kind line')
    src = open(os.path.join(SITE, "game", "world", "cafe_world.js"), encoding="utf-8").read()
    ok("cafe source: no shake animation", "cw-shake" not in src and "cwshake" not in src)
    ok("cafe source: no falling 'no' tone", "SND.no" not in src and "no: function" not in src)
    ok("cafe source: the poor old line is gone, a kind line is in", "Keep playing maths" not in src and "A few more coins and it is yours!" in src)
    phrases = json.load(open(os.path.join(SITE, "..", "work_tmp", "voice_new_phrases.json"), encoding="utf-8"))
    ok("new spoken lines are listed for recording", "Not yet. A few more coins and it is yours!" in phrases and "Not yet. Let's see the answer." in phrases, phrases)

    # ---------- 5/11 voice: retry the list, retry a clip, then the device voice ----------
    step('5/11 voice: retry the list, retry a clip, then the device voice')
    text = "Tap an answer first."
    h = fnv(text)
    manifest = json.dumps({h: text})

    def voice_page(manifest_plan, mp3_plan):
        """manifest_plan / mp3_plan: lists of 'fail' | 'bad' | 'ok', used one by one (the last repeats)"""
        ctx = br.new_context(viewport={"width": 820, "height": 1180})
        pg = ctx.new_page()
        pg.errs = []
        pg.on("pageerror", lambda e: pg.errs.append(str(e)))
        pg.add_init_script(VOICE_STUB)
        pg.calls = {"manifest": 0, "mp3": 0}

        def pick(plan, n):
            return plan[min(n, len(plan) - 1)]

        def on_manifest(route):
            how = pick(manifest_plan, pg.calls["manifest"]); pg.calls["manifest"] += 1
            if how == "fail":
                route.abort()
            elif how == "bad":
                route.fulfill(status=500, body="no")
            else:
                route.fulfill(status=200, content_type="application/json", body=manifest)

        def on_mp3(route):
            how = pick(mp3_plan, pg.calls["mp3"]); pg.calls["mp3"] += 1
            if how == "fail":
                route.abort()
            elif how == "bad":
                route.fulfill(status=500, body="no")
            else:
                route.fulfill(status=200, content_type="audio/mpeg", body=b"ID3\x04fake audio bytes")
        pg.route("**/voice/manifest.json", on_manifest)
        pg.route(f"**/voice/{h}.mp3", on_mp3)
        pg.goto(URL)
        pg.evaluate("()=>localStorage.clear()")
        return pg

    pg = voice_page(["fail", "bad", "ok"], ["ok"])
    pg.wait_for_function("()=>voiceList && Object.keys(voiceList).length>0", timeout=8000)
    ok("voice list: tried again until it loaded", pg.calls["manifest"] == 3 and pg.evaluate("(t)=>has(t)", text), pg.calls)
    pg.evaluate("(t)=>say(t)", text)
    pg.wait_for_timeout(300)
    ok("voice: a good clip plays, the device voice stays quiet", pg.evaluate("()=>window.__played") == 1 and pg.evaluate("()=>window.__spoken.length") == 0, pg.evaluate("()=>[window.__played, window.__spoken]"))
    pg.context.close()

    pg = voice_page(["ok"], ["bad", "ok"])
    pg.wait_for_function("()=>voiceList && Object.keys(voiceList).length>0", timeout=8000)
    pg.evaluate("(t)=>say(t)", text)
    pg.wait_for_timeout(700)
    ok("voice: a failed clip is tried once more and then plays", pg.calls["mp3"] == 2 and pg.evaluate("()=>window.__played") == 1 and pg.evaluate("()=>window.__spoken.length") == 0, (pg.calls, pg.evaluate("()=>[window.__played, window.__spoken]")))
    pg.context.close()

    pg = voice_page(["ok"], ["bad"])
    pg.wait_for_function("()=>voiceList && Object.keys(voiceList).length>0", timeout=8000)
    pg.evaluate("(t)=>say(t)", text)
    pg.wait_for_function("()=>window.__spoken.length>0", timeout=5000)
    ok("voice: a clip that fails twice falls back to the device voice (never silent)", pg.calls["mp3"] == 2 and pg.evaluate("()=>window.__spoken") == [text], (pg.calls, pg.evaluate("()=>window.__spoken")))
    pg.context.close()

    pg = voice_page(["fail", "fail", "fail", "ok"], ["ok"])
    pg.wait_for_function("()=>manifestFailedAt>0", timeout=8000)
    ok("voice list failed 3 times: the game goes on with the device voice", pg.calls["manifest"] == 3 and pg.evaluate("()=>Object.keys(voiceList).length") == 0, pg.calls)
    pg.evaluate("(t)=>say(t)", text)
    pg.wait_for_function("()=>window.__spoken.length>0", timeout=5000)
    ok("voice list failed: the device voice speaks", pg.evaluate("()=>window.__spoken") == [text])
    pg.evaluate("()=>{manifestFailedAt=Date.now()-30000}")
    pg.evaluate("(t)=>say(t)", text)
    pg.wait_for_function("()=>Object.keys(voiceList).length>0", timeout=8000)
    ok("voice list failed: a later say() tries the list again and wins", pg.calls["manifest"] == 4 and pg.evaluate("(t)=>has(t)", text), pg.calls)
    ok("voice: no page errors", not pg.errs, pg.errs[:3])
    pg.context.close()

    # ---------- 6/9/10 saves: corrupt, empty, old shape, never a blank screen ----------
    step('6/9/10 saves: corrupt, empty, old shape, never a blank screen')
    KEY = "kidsMaths.game.marie"
    cases = [("cut-off text", '{"coins": 12, "engi', True), ("empty text", "", True), ("empty object", "{}", False),
             ("old shape, no counters", json.dumps({"coins": 33, "engine": None, "days": {"2026-10-20": {"n": 4}}}), False),
             ("engine missing parts", json.dumps({"version": 2, "coins": 5, "game": {"answered": 3, "sinceReward": 3, "sincePlay": 3, "rewardTurn": 0}, "days": {}, "engine": {"profile": "marie", "v": 1}}), False)]
    for label, raw, damaged in cases:
        pg = fresh(br, None, keep={KEY: raw})
        pg.click('.over .go[data-v="marie"]')
        pg.wait_for_function("()=>document.querySelector('.parentnote') || __game.QS", timeout=8000)
        if damaged:
            ok(f"save ({label}): the grown-up note is shown in plain words", pg.locator(".parentnote").count() == 1 and "safe copy" in pg.inner_text(".parentnote") and "Marie" in pg.inner_text(".parentnote"), pg.inner_text("body")[:200])
            ok(f"save ({label}): focus moved into the note", active_in(pg, ".over"))
            ok(f"save ({label}): the note is a labelled dialog", pg.get_attribute(".over", "role") == "dialog" and pg.get_attribute(".over", "aria-modal") == "true")
        if pg.locator(".parentnote").count():
            pg.click(".parentnote .go")
        pg.wait_for_function("()=>__game.QS && __game.QS.phase==='ask'", timeout=8000)
        ok(f"save ({label}): a question is on screen, not a blank page", len(pg.inner_text(".story")) > 20)
        ok(f"save ({label}): focus came back to the question", active_in(pg, "#qbody") or active_in(pg, "#app"))
        keys = pg.evaluate("()=>Object.keys(localStorage)")
        stored = json.loads(pg.evaluate("(k)=>localStorage.getItem(k)", KEY))
        ok(f"save ({label}): a version number is saved", stored.get("version") == 2 and stored["engine"]["profile"] == "marie", stored.get("version"))
        if damaged:
            bk = [k for k in keys if ".damaged." in k]
            ok(f"save ({label}): the damaged text is kept under another key, unchanged", len(bk) == 1 and pg.evaluate("(k)=>localStorage.getItem(k)", bk[0]) == raw, keys)
        elif label.startswith("old shape"):
            ok(f"save ({label}): coins kept and a copy of the old shape kept", stored["coins"] == 33 and any(".before_version_2." in k for k in keys), (stored["coins"], keys))
        ok(f"save ({label}): no page errors", not pg.errs, pg.errs[:3])
        pg.context.close()

    # an old note stays on the doors until a grown-up reads it
    pg = fresh(br, None, keep={KEY: "{bad"})
    pg.click('.over .go[data-v="marie"]')
    pg.wait_for_selector(".parentnote")
    pg.reload()                                                  # the page was closed before the note was read
    pg.wait_for_selector(".over.start .go[data-v]")
    ok("a note not yet read is shown again on the doors", pg.locator(".grownote").count() == 1 and "Marie" in pg.inner_text(".grownote"))
    pg.click(".grownote .go")
    pg.wait_for_timeout(200)
    ok("after 'I have read this' the note is gone", pg.locator(".grownote").count() == 0 and pg.locator(".over.start .go[data-v]").count() == 2)
    pg.context.close()

    # a save that fails: the grown-up is told in plain words, and told again never faster than every 5 minutes; success clears it
    pg = fresh(br, "kennedy")
    pg.evaluate("()=>{window.__setItem=Storage.prototype.setItem; Storage.prototype.setItem=function(){throw new Error('QuotaExceededError')}}")
    pg.evaluate("()=>save()")
    ok("failed save: a warning with role alert in plain words", pg.locator("#savewarn[role=alert]").count() == 1 and "could not save" in pg.inner_text("#savewarn"), pg.inner_text("body")[:100])
    pg.evaluate("()=>{Storage.prototype.setItem=window.__setItem}")
    pg.evaluate("()=>save()")
    ok("a save that works again clears the warning", pg.locator("#savewarn").count() == 0)
    ok("no page errors (failed save)", not pg.errs, pg.errs[:3])
    pg.context.close()

    # day one: the real save the game wrote, without a version number (every save on the family devices), must load with no scary note
    pg = fresh(br, "marie")
    pg.evaluate("()=>{__game.P.game.sinceReward=4; save()}")
    answer(pg, True)
    pg.wait_for_function("()=>__game.QS.phase==='right'", timeout=8000)
    pg.click("#tile")
    pg.wait_for_selector(".rewardhost", timeout=30000)
    pg.evaluate("()=>RewardGames.close()")
    pg.wait_for_function("()=>!document.querySelector('.rewardhost') && __game.QS && __game.QS.phase==='ask'", timeout=20000)
    ctx_day = pg.context
    pg.close()                                                   # closing the page saves once more (pagehide); only then is the version taken out
    pg = ctx_day.new_page(); pg.errs = []
    pg.on("pageerror", lambda e: pg.errs.append(str(e)))
    pg.add_init_script(STUB)
    pg.goto(URL)
    raw_now = json.loads(pg.evaluate("(k)=>localStorage.getItem(k)", KEY))
    coins_now = raw_now["coins"]
    del raw_now["version"]
    pg.evaluate("([k,v])=>localStorage.setItem(k,v)", [KEY, json.dumps(raw_now)])
    pg.reload()
    pg.wait_for_selector(".over.start .go[data-v]")
    pg.click('.over .go[data-v="marie"]')
    pg.wait_for_function("()=>__game.QS", timeout=8000)
    keys = pg.evaluate("()=>Object.keys(localStorage)")
    ok("day one: a real save with no version loads with no grown-up note", pg.locator(".parentnote").count() == 0 and pg.locator(".grownote").count() == 0)
    ok("day one: nothing is called damaged or repaired", not [k for k in keys if ".damaged." in k or ".before_repair." in k], keys)
    ok("day one: one copy of the old shape is kept and the version is set", len([k for k in keys if ".before_version_2." in k]) == 1 and pg.evaluate("()=>__game.P.version") == 2)
    ok("day one: coins and counters are the same", pg.evaluate("()=>__game.P.coins") == coins_now and pg.evaluate("()=>__game.P.game.answered") == raw_now["game"]["answered"])
    pg.context.close()

    # a code fault while starting: a safe copy, a plain card, the play still works, and the old save stays in place
    pg = fresh(br, "marie")
    pg.evaluate("()=>{__game.P.game.sinceReward=1; doors()}")
    pg.wait_for_selector(".over.start .go[data-v]")
    old_text = pg.evaluate("(k)=>localStorage.getItem(k)", KEY)
    pg.evaluate("()=>{window.__realMake=KS.make; let n=0; KS.make=function(){ if(n++<1) throw new Error('pretend fault'); return window.__realMake.apply(KS, arguments) }}")
    pg.wait_for_selector(".over.start .go[data-v]")
    pg.click('.over .go[data-v="marie"]')
    pg.wait_for_selector(".parentnote", timeout=8000)
    ok("start fault: the grown-up note says a safe copy was kept and this play is not saved", "safe copy" in pg.inner_text(".parentnote") and "not be saved" in pg.inner_text(".parentnote"), pg.inner_text(".parentnote"))
    pg.click(".parentnote .go")
    pg.wait_for_function("()=>__game.QS && __game.QS.phase==='ask'", timeout=8000)
    ok("start fault: a question is on screen after the retry", len(pg.inner_text(".story")) > 20)
    pg.evaluate("()=>{__game.P.coins=555; save()}")
    ok("start fault: the old save still holds the original text", pg.evaluate("(k)=>localStorage.getItem(k)", KEY) == old_text)
    ok("start fault: a plain warning says this play is not saved", pg.locator("#savewarn[role=alert]").count() == 1)
    ok("start fault: one safe copy of the original", len([k for k in pg.evaluate("()=>Object.keys(localStorage)") if ".damaged." in k]) == 1)
    pg.context.close()

    # ---------- 7/19 the counters move only after the game and the world have finished ----------
    step('7/19 the counters move only after the game and the world have finished')
    pg = fresh(br, "marie")
    pg.evaluate("()=>{__game.P.game.sinceReward=4; __game.P.game.sincePlay=0; __game.P.game.rewardTurn=0; save()}")
    answer(pg, True)
    pg.wait_for_function("()=>__game.QS.phase==='right'", timeout=8000)
    pg.click("#tile")
    pg.wait_for_selector(".rewardhost", timeout=30000)
    st = pg.evaluate("()=>JSON.parse(localStorage.getItem('kidsMaths.game.marie')).game")
    ok("reward game open: the saved counters are not reset yet", st["sinceReward"] == 5 and st["rewardTurn"] == 0, st)
    ok("reward game open: focus is inside it", active_in(pg, ".rewardhost"))
    pg.evaluate("()=>RewardGames.close()")
    pg.wait_for_function("()=>!document.querySelector('.rewardhost') && __game.QS && __game.QS.phase==='ask'", timeout=20000)
    st = pg.evaluate("()=>JSON.parse(localStorage.getItem('kidsMaths.game.marie')).game")
    ok("reward game finished: counters reset and the turn moved on, saved", st["sinceReward"] == 0 and st["rewardTurn"] == 1, st)
    ok("reward game closed: focus is back on the question", not active_in(pg, ".rewardhost") and active_in(pg, "#app"))
    ok("no page errors (reward counters)", not pg.errs, pg.errs[:3])
    pg.context.close()

    ctx = br.new_context(viewport={"width": 820, "height": 1180})
    pg = ctx.new_page(); pg.errs = []
    pg.on("pageerror", lambda e: pg.errs.append(str(e)))
    pg.add_init_script(STUB + "window.__noRewards=true;")
    pg.goto(URL); pg.evaluate("()=>localStorage.clear()"); pg.reload(); pg.wait_for_selector(".over.start .go[data-v]")
    pg.click('.over .go[data-v="marie"]'); wait_ask(pg)
    pg.evaluate("()=>{__game.P.game.sinceReward=4; __game.P.game.sincePlay=24; save()}")
    answer(pg, True)
    pg.wait_for_function("()=>__game.QS.phase==='right'", timeout=8000)
    pg.click("#tile")
    pg.wait_for_selector(".pw-host", timeout=30000)
    st = pg.evaluate("()=>JSON.parse(localStorage.getItem('kidsMaths.game.marie')).game")
    ok("play world open: the saved play counter is not reset yet", st["sincePlay"] == 25 and st["sinceReward"] == 0, st)
    ok("play world open: focus is inside it", active_in(pg, ".pw-host"))
    pg.evaluate("()=>PlayWorlds._finish()")
    pg.wait_for_selector(".pw-end", timeout=8000)         # the "Play time is over" card closes by itself
    pg.wait_for_function("()=>!document.querySelector('.pw-host') && __game.QS && __game.QS.phase==='ask'", timeout=20000)
    st = pg.evaluate("()=>JSON.parse(localStorage.getItem('kidsMaths.game.marie')).game")
    ok("play world finished: the play counter is reset and saved", st["sincePlay"] == 0, st)
    ok("play world closed: focus is back in the game", not active_in(pg, ".pw-host"))
    ok("no page errors (play world counters)", not pg.errs, pg.errs[:3])
    ctx.close()

    # ---------- 29 focus: hint card and the doors ----------
    step('29 focus: hint card and the doors')
    pg = fresh(br, "kennedy")
    pg.focus("#qbody .bulb")
    pg.keyboard.press("Enter")
    pg.wait_for_selector(".bubble")
    ok("hint: focus moved into the hint", active_in(pg, ".bubble"))
    pg.keyboard.press("Escape")
    pg.wait_for_timeout(150)
    ok("hint closed with Escape: focus is back on the bulb", pg.locator(".bubble").count() == 0 and pg.evaluate("()=>document.activeElement.classList.contains('bulb')"))
    pg.evaluate("()=>{doors()}")
    pg.wait_for_selector(".over.start")
    ok("doors: focus is on a door and the card is a dialog", active_in(pg, ".over.start") and pg.get_attribute(".over.start", "role") == "dialog")
    pg.keyboard.press("Tab"); pg.keyboard.press("Tab"); pg.keyboard.press("Tab")
    ok("doors: Tab stays inside the card", active_in(pg, ".over.start"))
    pg.context.close()
    br.close()

if server:
    server.terminate()
print(f"RESULT {sum(res)}/{len(res)} passed")
sys.exit(0 if all(res) else 1)
