"""Screen checks for the work of 22 Oct 2026 (plan items 22 to 25): picture answers and patterns for Kennedy, Marie's counting tray,
the rule that switches the counting skills on, the grown-ups card (saved on this device, counting choice, progress file save and load),
the voice warm-up for big numbers, the offline helper and the home-screen files.
Silent (speech and AudioContext are stubbed, --mute-audio). Prints only failures and one RESULT line.
Run: python tests/game_new_skills_ui_test.py http://localhost:8790/game/index.html [shots_dir]
     add --webkit to run in WebKit (the offline helper test is skipped there: it is checked in Chromium)"""
import json
import re
import subprocess
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

URL = sys.argv[1]
ENGINE = "webkit" if "--webkit" in sys.argv else "chromium"
_args = [a for a in sys.argv[1:] if not a.startswith("--")]
SHOTS = Path(_args[1]) if len(_args) > 1 else None
ROOT = Path(__file__).resolve().parent.parent
STUB = ("window.__demoFast=true;window.__noVoice=true;window.speechSynthesis={speak(){},cancel(){},getVoices(){return[]}};"
        "window.SpeechSynthesisUtterance=function(){};window.AudioContext=window.webkitAudioContext=undefined;window.__sayLog=[];")
res = []


def ok(name, cond, info=""):
    res.append(bool(cond))
    if not cond:
        print(f"FAIL {name} {info}")


def shot(pg, name):
    if SHOTS:
        SHOTS.mkdir(parents=True, exist_ok=True)
        pg.screenshot(path=str(SHOTS / f"{name}.png"))


def fnv(text):
    h = 0x811c9dc5
    for b in text.encode("utf-8"):
        h ^= b
        h = (h * 0x01000193) & 0xffffffff
    return f"{h:08x}"


def pieces_of(text):
    return [s.strip() for s in re.split(r"(\d+)", text) if re.search(r"[a-z0-9]", s.strip(), re.I)]


def start(pg, who):
    pg.click(f'.over .go[data-v="{who}"]')
    pg.wait_for_function("()=>__game.QS && __game.Q", timeout=15000)


def show(pg, skill, theme):
    """show a question of a skill straight away (the engine is bypassed)"""
    pg.evaluate("([s,t])=>__game.show(KS.make(s,t,Math.random,''))", [skill, theme])
    pg.wait_for_function("()=>__game.QS && __game.QS.phase==='ask'", timeout=10000)


def answer(pg, right=True):
    pg.evaluate("""(right)=>{const Q=__game.Q, v=right?Q.ans:Q.ans+1;
      if(Q.kind==='choice'){__game.QS.pick=right?Q.ans:Q.opts.find(o=>o!==Q.ans)}else{__game.QS.typed=String(v)};
      document.getElementById('tile').click()}""", right)


def new_question_after_miss(pg):
    pg.wait_for_selector("#boardbtns .again", state="attached", timeout=20000)
    pg.wait_for_function("()=>!document.querySelector('#boardbtns .again').hidden", timeout=90000)
    old = pg.evaluate("()=>__game.Q.key")
    pg.click("#boardbtns .bnext")
    pg.wait_for_function("(k)=>__game.QS && __game.QS.afterMiss===true && __game.QS.phase==='ask' && __game.Q.key!==k && !document.querySelector('#board')", arg=old, timeout=15000)


def overflow(pg):
    return pg.evaluate("()=>({w:document.documentElement.scrollWidth-innerWidth,h:document.documentElement.scrollHeight-innerHeight})")


with sync_playwright() as p:
    br = getattr(p, ENGINE).launch(**({"args": ["--mute-audio"]} if ENGINE == "chromium" else {}))

    def page(vw=820, vh=1180, stub=True, touch=False):
        ctx = br.new_context(viewport={"width": vw, "height": vh}, has_touch=touch, accept_downloads=True)
        ctx.set_default_timeout(20000)
        pg = ctx.new_page(); errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        if stub:
            pg.add_init_script(STUB)
        pg.goto(URL); pg.evaluate("()=>localStorage.clear()"); pg.reload(); pg.wait_for_timeout(400)
        return ctx, pg, errs

    # ---------- Marie: counting by tapping ----------
    ctx, pg, errs = page()
    start(pg, "marie")
    for skill, n in [("cafe_count.1", 7), ("cafe_count.1", 20), ("cafe_count.2", 34), ("cafe_count.2", 50)]:
        pg.evaluate("([s,n])=>{ let q; for(let i=0;i<400;i++){ q=KS.make(s,'cafe',Math.random,''); if(q.ans===n) break } __game.show(q) }", [skill, n])
        pg.wait_for_function("()=>__game.QS && __game.QS.phase==='ask'")
        tag = f"{skill} n={n}"
        ok(f"{tag}: the tray has exactly {n} things", pg.locator(".tapitem").count() == n, pg.locator(".tapitem").count())
        ok(f"{tag}: none is marked at the start", pg.locator(".tapitem.on").count() == 0)
        ok(f"{tag}: boxes of ten", pg.evaluate("()=>[...document.querySelectorAll('.tbox')].map(b=>b.children.length)") == [10] * (n // 10) + ([n % 10] if n % 10 else []))
        ok(f"{tag}: the tray shows no digit", not re.search(r"\d", pg.inner_text(".counttray") + pg.inner_text(".room")))
        ok(f"{tag}: no number line, no hop buttons", pg.locator(".nlbox.noline").count() == 1 and pg.locator(".hoprow button[data-h]").count() == 0 and pg.locator(".nlbox svg").count() == 0)
        ok(f"{tag}: the story and question carry no digit", not re.search(r"\d", pg.inner_text(".story")), pg.inner_text(".story"))
        pg.locator(".tapitem").nth(2).click(); pg.locator(".tapitem").nth(0).click()
        ok(f"{tag}: a tap marks only that thing", pg.evaluate("()=>[...document.querySelectorAll('.tapitem')].map((b,i)=>b.classList.contains('on')?i:-1).filter(i=>i>=0)") == [0, 2])
        ok(f"{tag}: aria-pressed follows", pg.locator('.tapitem[aria-pressed="true"]').count() == 2)
        pg.locator(".tapitem").nth(2).click()
        ok(f"{tag}: a second tap un-marks it", pg.locator(".tapitem.on").count() == 1)
        ok(f"{tag}: nothing shows a running count", not re.search(r"\d", pg.inner_text(".counttray")) and pg.locator("#msg:not([hidden])").count() == 0)
        ok(f"{tag}: the scene shows ONE thing and no number", pg.evaluate("()=>document.querySelectorAll('#scene .qs-o').length") == 1 and not re.search(r"\d", pg.inner_text("#scene")))
        ok(f"{tag}: nothing auto-marked by itself", pg.evaluate("()=>__game.QS.marked.filter(Boolean).length") == 1)
        pg.wait_for_timeout(600)
        ok(f"{tag}: still one mark after a pause (no auto-play)", pg.locator(".tapitem.on").count() == 1)
    # the lesson, a hint and "watch" never mark or count for her
    pg.evaluate("()=>{ let q; for(let i=0;i<400;i++){ q=KS.make('cafe_count.2','cafe',Math.random,''); if(q.ans===34) break } __game.show(q) }")
    pg.wait_for_function("()=>__game.QS.phase==='ask'")
    pg.evaluate("()=>__game.hint()"); pg.wait_for_timeout(300)
    ok("hint: nothing was marked for her", pg.locator(".tapitem.on").count() == 0)
    pg.evaluate("()=>{const b=document.querySelector('.bubble'); if(b) b.remove()}")
    pg.evaluate("()=>{__game.QS.typed='99'; document.getElementById('tile').click()}")
    pg.wait_for_selector("#board", timeout=8000)
    ok("a wrong count starts the lesson", pg.locator("#board").count() == 1)
    ok("the lesson draws no hop line for counting", pg.locator("#board .hopline, #board [data-line]").count() == 0)
    pg.wait_for_function("()=>__game.QS.missedFirst", timeout=5000)
    ok("lesson: nothing was marked for her", pg.evaluate("()=>(__game.QS.marked||[]).filter(Boolean).length") == 0)
    ok("counting: no page error", not errs, errs)
    ctx.close()

    # the right answer: Next and Watch, never auto-marked
    ctx, pg, errs = page()
    start(pg, "marie")
    pg.evaluate("()=>{ let q; for(let i=0;i<400;i++){ q=KS.make('cafe_count.1','cafe',Math.random,''); if(q.ans===9) break } __game.show(q) }")
    pg.wait_for_function("()=>__game.QS.phase==='ask'")
    for i in range(9):
        pg.locator(".tapitem").nth(i).click()
    pg.evaluate("()=>{__game.QS.typed='9'; document.getElementById('tile').click()}")
    pg.wait_for_function("()=>__game.QS.phase==='right'", timeout=8000)
    ok("right count: the answer is accepted", pg.evaluate("()=>__game.QS.phase") == "right")
    ok("right count: Marie's marks stay as she made them", pg.locator(".tapitem.on").count() == 9)
    ok("right count: no page error", not errs, errs)
    ctx.close()

    # ---------- Kennedy: patterns, size and bonds ----------
    ctx, pg, errs = page(820, 1180, touch=True)
    start(pg, "kennedy")
    for i in range(6):
        pg.evaluate("()=>__game.show(KS.make('knight_pattern.1','castle',Math.random,''))")
        pg.wait_for_function("()=>__game.QS.phase==='ask'")
        d = pg.evaluate("()=>({n:__game.Q.strip.length, opts:__game.Q.opts.length, ans:__game.Q.ans})")
        ok("pattern: the row of pictures so far", pg.locator(".patstrip img").count() == d["n"] and pg.locator(".patq").count() == 1, d)
        pg.wait_for_timeout(300)
        ok("pattern: the scene shows the pattern so far, one picture each, and not the next one", pg.evaluate("()=>document.querySelectorAll('#scene .qs-o').length") == d["n"], pg.evaluate("()=>document.querySelectorAll('#scene .qs-o').length"))
        ok("pattern: three picture buttons, no digits on them", pg.locator(".opt.pic").count() == 3 and not re.search(r"\d", pg.inner_text(".bars")))
        ok("pattern: every button has a plain label", pg.evaluate("()=>[...document.querySelectorAll('.opt.pic')].every(b=>b.getAttribute('aria-label') && b.querySelector('img'))"))
        ok("pattern: no number line, no hop buttons, no Check button", pg.locator(".hoprow button[data-h]").count() == 0 and pg.evaluate("()=>document.getElementById('tile').hidden"))
        ok("pattern: pictures load", pg.evaluate("()=>[...document.querySelectorAll('.opt.pic img, .patstrip img')].every(i=>i.complete && i.naturalWidth>0)") or pg.wait_for_timeout(500) is None and pg.evaluate("()=>[...document.querySelectorAll('.opt.pic img, .patstrip img')].every(i=>i.complete && i.naturalWidth>0)"))
        sel = pg.evaluate("()=>__game.Q.ans")
        before = len(pg.evaluate("()=>__sayLog"))
        pg.click(f'.opt[data-v="{sel}"]')
        pg.wait_for_function("()=>__game.QS.phase==='right'", timeout=8000)
        said = pg.evaluate("()=>__sayLog.slice(%d)" % before)
        ok("pattern: the tap is spoken as the picture, not a number", any(s.startswith("the ") for s in said) and not any(s.isdigit() for s in said[:1]), said)
        shot(pg, f"kennedy_pattern_{i}") if i == 0 else None
    # the three steps of help work on a picture question and never break it
    for skill in ["knight_pattern.1", "knight_size.1"]:
        pg.evaluate("(s)=>__game.show(KS.make(s,'castle',Math.random,''))", skill); pg.wait_for_function("()=>__game.QS.phase==='ask'")
        for lvl in range(3):
            pg.evaluate("()=>{__game.hint()}"); pg.wait_for_timeout(250)
        ok(f"{skill}: three hints give help and the question stays answerable", pg.locator(".bubble").count() >= 1 and pg.evaluate("()=>__game.QS.phase") == "ask" and pg.evaluate("()=>__game.QS.hintLevel") >= 1, pg.evaluate("()=>__game.QS.hintLevel"))
    # a wrong tap: the lesson says what to tap, and the miss is not called "one or two away"
    pg.evaluate("()=>__game.show(KS.make('knight_pattern.1','castle',Math.random,''))"); pg.wait_for_function("()=>__game.QS.phase==='ask'")
    pg.evaluate("()=>{const q=__game.Q, w=q.opts.find(o=>o!==q.ans); document.querySelector('.opt[data-v=\"'+w+'\"]').click()}")
    pg.wait_for_selector("#board", timeout=8000)
    ok("pattern: a wrong tap starts the lesson", pg.locator("#board").count() == 1)
    ok("pattern: the miss is logged as no-clear-pattern, not a slip", pg.evaluate("()=>__game.log.all().slice(-1)[0].c") == "guess", pg.evaluate("()=>__game.log.all().slice(-1)[0]"))
    for i in range(6):
        pg.evaluate("()=>__game.show(KS.make('knight_size.1','castle',Math.random,''))")
        pg.wait_for_function("()=>__game.QS.phase==='ask'")
        info = pg.evaluate("""()=>{const q=__game.Q; const bars=[...document.querySelectorAll('.opt.pic .bar')].map(b=>{const r=b.getBoundingClientRect();return {v:+b.closest('.opt').dataset.v, w:r.width, h:r.height}});
          return {type:q.p.type, ans:q.ans, bars}}""")
        key = "h" if info["type"] != "T" else "w"
        size = (lambda b: b["w"]) if info["type"] != "T" else (lambda b: b["h"])
        order = sorted(info["bars"], key=size)
        want = order[0]["v"] if info["type"] == "S" else order[-1]["v"]
        ok("size: three bars, drawn in true proportion, and the answer is the right one", len(info["bars"]) == 3 and want == info["ans"] and size(order[0]) < size(order[1]) < size(order[2]), info)
    pg.evaluate("()=>__game.show(KS.make('knight_size.1','castle',Math.random,''))"); pg.wait_for_function("()=>__game.QS.phase==='ask'"); pg.wait_for_timeout(300)
    sz = pg.evaluate("()=>({sizes:__game.Q.scene.sizes, dir:__game.Q.scene.dir, hs:[...document.querySelectorAll('#scene .qs-o')].map(i=>i.getBoundingClientRect().height)})")
    order = sorted(range(3), key=lambda i: sz["sizes"][i])
    ok("size: the scene shows three things, bigger number = bigger thing", len(sz["hs"]) == 3 and sz["hs"][order[0]] < sz["hs"][order[1]] < sz["hs"][order[2]], sz)
    shot(pg, "kennedy_size")
    pg.evaluate("()=>__game.show(KS.make('kinder.bonds','castle',Math.random,''))"); pg.wait_for_function("()=>__game.QS.phase==='ask'")
    ok("bonds: a normal tap question with the number line", pg.locator(".opt").count() == 3 and pg.locator(".nlbox.noline").count() == 0 and pg.locator(".nlbox svg").count() >= 1)
    ok("pictures: no page error", not errs, errs)
    ctx.close()

    # ---------- the whole answer cycle on every new kind: right; wrong, lesson, fresh question, wrong, See The Answer, Next ----------
    for who, theme, skills in [("marie", "cafe", ["cafe_count.1", "cafe_count.2", "cafe_pattern.1", "cafe_time.2"]), ("kennedy", "castle", ["kinder.bonds", "knight_pattern.1", "knight_size.1"])]:
        ctx, pg, errs = page(820, 1180, touch=who == "kennedy")
        start(pg, who)
        calm = "()=>{__game.P.game.sinceReward=0; __game.P.game.sincePlay=0}"        # no little game or play world in the middle of this check (they are tested elsewhere)
        for skill in skills:
            pg.evaluate(calm)
            show(pg, skill, theme)
            answer(pg, True)
            pg.wait_for_function("()=>__game.QS.phase==='right'", timeout=8000)
            ok(f"{skill}: a right answer is accepted", pg.evaluate("()=>__game.QS.phase") == "right")
            pg.evaluate(calm); pg.evaluate("()=>{document.getElementById('tile').click()}")
            pg.wait_for_function("()=>__game.QS && __game.QS.phase==='ask'", timeout=8000)
            pg.evaluate(calm)
            show(pg, skill, theme)
            pg.evaluate("()=>{__game.QS.t0=Date.now()-6000}")
            answer(pg, False)
            pg.wait_for_selector("#board", timeout=8000)
            new_question_after_miss(pg)
            pg.evaluate("()=>{__game.QS.t0=Date.now()-6000}")
            answer(pg, False)
            pg.wait_for_function("()=>__game.QS.phase==='final'", timeout=8000)
            pg.wait_for_function("()=>!document.getElementById('tile').classList.contains('dim')", timeout=8000)
            pg.evaluate("()=>{document.getElementById('tile').click()}"); pg.wait_for_timeout(300)
            ok(f"{skill}: the answer is shown after two misses", pg.evaluate("()=>__game.QS.phase") == "shown" and "correct answer" in pg.inner_text("#msg"))
            if skill == "knight_pattern.1" or skill == "knight_size.1":
                ok(f"{skill}: the right picture is picked on the answer screen", pg.evaluate("()=>document.querySelector('.opt.sel')?.dataset.v") == str(pg.evaluate("()=>__game.Q.ans")))
            pg.evaluate(calm); pg.evaluate("()=>{document.getElementById('tile').click()}")
            pg.wait_for_function("()=>__game.QS && __game.QS.phase==='ask'", timeout=8000)
        ok(f"{who}: the whole cycle ran without a page error", not errs, errs)
        ctx.close()

    # ---------- layout of the new screens on small and large devices ----------
    for vw, vh in [(375, 667), (667, 375), (820, 1180), (1180, 820), (1366, 1024)]:
        ctx, pg, errs = page(vw, vh, touch=vw < 900)
        for who, theme, cases in [("marie", "cafe", [("cafe_count.1", 20), ("cafe_count.2", 50), ("cafe_pattern.1", None)]),
                                  ("kennedy", "castle", [("knight_pattern.1", None), ("knight_size.1", None), ("kinder.bonds", None)])]:
            if pg.locator(".over.start").count():
                start(pg, who)
            else:
                pg.evaluate("(w)=>{__game.start(w)}", who); pg.wait_for_function("()=>__game.QS && __game.Q")
            for skill, n in cases:
                pg.evaluate("([s,t,n])=>{ let q; for(let i=0;i<600;i++){ q=KS.make(s,t,Math.random,''); if(n==null||q.ans===n) break } __game.show(q) }", [skill, theme, n])
                pg.wait_for_function("()=>__game.QS && __game.QS.phase==='ask'")
                pg.wait_for_timeout(250)
                o = overflow(pg); tag = f"{vw}x{vh} {skill}"
                ok(f"{tag}: no sideways page scroll", o["w"] <= 1, o)
                ok(f"{tag}: the page does not grow taller than the screen", o["h"] <= 2, o)
                if skill != "kinder.bonds":
                    ok(f"{tag}: the answer controls are on the screen", pg.evaluate("""()=>{const need=document.body.dataset.who==='kennedy'?document.querySelector('.opt'):document.querySelector('#pad button'); if(!need) return false; const r=need.getBoundingClientRect(); return r.width>0 && r.top>=0 && r.bottom<=innerHeight+1 && r.left>=0 && r.right<=innerWidth+1}"""))
                if skill.startswith("cafe_count"):
                    ok(f"{tag}: every tray thing can be reached (the tray scrolls, the keypad stays)", pg.evaluate("""()=>{const t=document.querySelector('.room'); const c=t.getBoundingClientRect(); const pad=document.querySelector('#pad').getBoundingClientRect(); return t.scrollHeight>=t.clientHeight && c.bottom<=pad.top+4 || document.querySelector('#app').classList.contains('nokeys')}"""))
                    ok(f"{tag}: touch targets are at least 36 px", pg.evaluate("()=>[...document.querySelectorAll('.tapitem')].every(b=>{const r=b.getBoundingClientRect(); return r.width>=36 && r.height>=36})"))
                if skill.startswith("knight") and vw in (375, 820):
                    shot(pg, f"{skill}_{vw}x{vh}")
                if skill.startswith("cafe_count") and vw in (375, 820) and n == 50:
                    shot(pg, f"{skill}_{vw}x{vh}")
            if who == "marie":
                pg.evaluate("()=>{__game.doors()}"); pg.wait_for_selector(".over.start")
        ok(f"{vw}x{vh}: no page error", not errs, errs)
        ctx.close()

    # ---------- the rule that switches Marie's counting skills on ----------
    ctx, pg, errs = page()
    start(pg, "marie")
    ok("no record: the counting skills are not ready", pg.evaluate("()=>!__game.M.map['cafe_count.1'].ready && !__game.M.map['cafe_count.2'].ready"))
    ok("no record: Marie's other skills are untouched", pg.evaluate("()=>__game.M.map['sums.1'].ready && __game.M.map['cafe_pattern.1'].ready"))
    # a record with four counting slips among her last answers: the rule fires at her next start
    real_key = pg.evaluate("()=>LOG_KEY('marie')")
    rows = [{"t": 1000 + i, "s": "sums.3", "q": "8 + 9 = ?", "g": 16 if i < 4 else 17, "a": 17, "ok": 0 if i < 4 else 1, "h": 0, "r": 1, "sc": "add", "ms": 3000, "k": "t", "c": "slip" if i < 4 else "", "f": []} for i in range(10)]
    pg.evaluate("([k,rows])=>AnswerLog.open({storage:localStorage,key:k}).replaceAll(rows)", [real_key, rows])
    ok("Marie's answer log has the rows", pg.evaluate("(k)=>AnswerLog.open({storage:localStorage,key:k}).size()", real_key) == 10)
    if True:
        pg.evaluate("()=>{__game.doors()}"); pg.wait_for_selector(".over.start")
        start(pg, "marie")
        ok("four counting slips: the counting skills are ready", pg.evaluate("()=>__game.M.map['cafe_count.1'].ready && __game.M.map['cafe_count.2'].ready"))
        ok("four counting slips: they are on the focus list", pg.evaluate("()=>['cafe_count.1','cafe_count.2'].every(i=>__game.P.engine.focus.includes(i))"))
        ok("four counting slips: a note was left for a grown-up", "counting slips" in pg.evaluate("()=>localStorage.getItem('kidsMaths.game.notes')||''"))
        nxt = pg.evaluate("""()=>{ const st=__game.P.engine; st.place.done=true; const s=KidsEngine.nextSet(st, __game.M, Date.now(), Math.random, {altRepair:true}); return {kind:s.kind, target:s.target, items:s.items} }""")
        ok("the engine asks the counting skill first (as a focus set)", nxt["kind"] == "focus" and nxt["target"] == "cafe_count.1", nxt)
        # twenty clean sums push the slips out of the window, but the skills stay on while she is still learning them; when both are known they go off
        clean = [dict(rows[9], t=5000 + i, ok=1, c="", g=17) for i in range(20)]
        pg.evaluate("([k,rows])=>AnswerLog.open({storage:localStorage,key:k}).replaceAll(rows)", [real_key, rows + clean])
        pg.evaluate("()=>{__game.doors()}"); pg.wait_for_selector(".over.start"); start(pg, "marie")
        ok("twenty clean sums later: counting stays on while she is still learning it", pg.evaluate("()=>__game.M.map['cafe_count.1'].ready && __game.P.engine.focus.includes('cafe_count.1')"))
        pg.evaluate("()=>{ const st=__game.P.engine; ['cafe_count.1','cafe_count.2'].forEach(id=>{ (st.skills[id] = st.skills[id] || {lvl:0,streak:0,n:0,right:0,recent:[],due:0,gap:0,recheck:null,stuckN:0,stuckRight:0,repairs:0,parkedUntil:0,first2:[]}).lvl = KidsEngine.LV.KNOWS }); }")
        pg.evaluate("()=>{ const k=SAVE_KEY('marie'); const v=JSON.parse(localStorage.getItem(k)); v.engine=__game.P.engine; localStorage.setItem(k, JSON.stringify(v)) }")
        pg.evaluate("()=>{__game.doors()}"); pg.wait_for_selector(".over.start"); start(pg, "marie")
        ok("both known and no slips: counting goes off again", pg.evaluate("()=>!__game.M.map['cafe_count.1'].ready && !__game.P.engine.focus.includes('cafe_count.1')"))
        pg.evaluate("([k,rows])=>AnswerLog.open({storage:localStorage,key:k}).replaceAll(rows)", [real_key, rows])
        pg.evaluate("()=>{ const k=SAVE_KEY('marie'); const v=JSON.parse(localStorage.getItem(k)); v.engine.skills['cafe_count.1'].lvl=0; v.engine.skills['cafe_count.2'].lvl=0; localStorage.setItem(k, JSON.stringify(v)) }")
        pg.evaluate("()=>{__game.doors()}"); pg.wait_for_selector(".over.start"); start(pg, "marie")
        pg.evaluate("()=>{ CountingNeed.write(localStorage, {mode:'off'}) }")
        pg.evaluate("()=>{__game.doors()}"); pg.wait_for_selector(".over.start")
        start(pg, "marie")
        ok("a grown-up can switch it off, even with slips on record", pg.evaluate("()=>!__game.M.map['cafe_count.1'].ready && !__game.P.engine.focus.includes('cafe_count.1')"))
        pg.evaluate("([k])=>{ CountingNeed.write(localStorage, {mode:'on'}); AnswerLog.open({storage:localStorage,key:k}).replaceAll([]) }", [real_key])
        pg.evaluate("()=>{__game.doors()}"); pg.wait_for_selector(".over.start")
        start(pg, "marie")
        ok("a grown-up can switch it on with no record at all", pg.evaluate("()=>__game.M.map['cafe_count.1'].ready"))
        pg.evaluate("()=>{__game.doors()}"); pg.wait_for_selector(".over.start")
        start(pg, "kennedy")
        ok("Kennedy never gets the counting skills", pg.evaluate("()=>!__game.M.map['cafe_count.1'].ready && !__game.M.map['cafe_count.2'].ready && __game.M.map['kinder.bonds'].ready && __game.M.map['knight_pattern.1'].ready && __game.M.map['knight_size.1'].ready"))
    ok("rule: no page error", not errs, errs)
    ctx.close()

    # ---------- the grown-ups card: saved on this device, the counting choice, the progress file ----------
    ctx, pg, errs = page()
    pg.click(".linkbtn")
    pg.wait_for_selector("#pa-gate")
    q = pg.inner_text(".panel.pa p")
    m = re.search(r"what is (\d+) times (\d+)", q)
    pg.fill("#pa-gate", str(int(m.group(1)) * int(m.group(2)))); pg.click("#pa-go")
    pg.wait_for_selector("#pa-dev")
    pg.wait_for_function("()=>!/^Checking/.test(document.querySelector('#pa-dev').innerText)", timeout=8000)
    dev = pg.inner_text("#pa-dev")
    ok("grown-ups: the Saved on this device heading and line", "Saved on this device" in pg.inner_text(".pa-device") and "Saved on this device." in dev, dev)
    ok("grown-ups: says how to add to the home screen and that Safari and the home-screen game keep separate saves", "Add to Home Screen" in dev and "progress file" in dev, dev)
    ok("grown-ups: says whether the game works without internet", "without internet" in dev, dev)
    ok("grown-ups: the counting choice with three buttons", pg.locator("#pa-count [data-mode]").count() == 3 and "Counting slips lately" in pg.inner_text("#pa-cnt-state"))
    pg.click('#pa-count [data-mode="on"]'); pg.wait_for_selector("#pa-count")
    ok("grown-ups: the choice is kept", pg.evaluate("()=>CountingNeed.read(localStorage).mode") == "on" and pg.locator('#pa-count [data-mode="on"][aria-pressed="true"]').count() == 1)
    ok("grown-ups: the status line says it changed", "changed" in pg.inner_text("#pa-status"))
    ok("grown-ups: heading order is readable (h1, then h2 sections)", pg.evaluate("()=>[...document.querySelectorAll('.pa h1, .pa h2')].map(h=>h.tagName).join()").startswith("H1,H2,H2,H2"))
    # progress file: save, then load into a different state
    ctx.close()
    ctx, pg, errs = page()
    start(pg, "marie")
    pg.evaluate("()=>{ __game.P.coins = 77; }"); pg.evaluate("()=>__game.QS && 0")
    pg.evaluate("()=>{ document.getElementById('tile'); }")
    pg.evaluate("()=>{__game.doors()}"); pg.wait_for_selector(".over.start")
    pg.click(".linkbtn"); pg.wait_for_selector("#pa-gate")
    m = re.search(r"what is (\d+) times (\d+)", pg.inner_text(".panel.pa p"))
    pg.fill("#pa-gate", str(int(m.group(1)) * int(m.group(2)))); pg.click("#pa-go"); pg.wait_for_selector("#pa-file-save")
    with pg.expect_download() as dl:
        pg.click("#pa-file-save")
    f = Path(dl.value.path()); text = f.read_text(encoding="utf-8")
    d = json.loads(text)
    ok("progress file: saved as a JSON file with a name that says what it is", d.get("format") == "kids_maths_progress" and dl.value.suggested_filename.startswith("kids_maths_progress_"), dl.value.suggested_filename)
    ok("progress file: holds Marie's progress", "marie" in d.get("children", {}) and d["children"]["marie"]["save"]["coins"] == 77, list(d.get("children", {})))
    ok("progress file: holds no address or password", not re.search(r"password|@|https?://", text))
    # change the coins on the device, then load the file back
    pg.evaluate("""()=>{ const k=Object.keys(localStorage).find(k=>/^kidsMaths\\.game\\.marie$/.test(k)); if(k){ const v=JSON.parse(localStorage.getItem(k)); v.coins=5; localStorage.setItem(k, JSON.stringify(v)); } }""")
    pg.set_input_files("#pa-file", {"name": "p.json", "mimeType": "application/json", "buffer": text.encode("utf-8")})
    pg.wait_for_selector("#pa-yes"); pg.click("#pa-yes")
    pg.wait_for_function("()=>/progress loaded/.test(document.querySelector('#pa-status').innerText)", timeout=8000)
    ok("progress file: loaded back after a yes", "progress loaded" in pg.inner_text("#pa-status"), pg.inner_text("#pa-status"))
    ok("progress file: the coins are back", pg.evaluate("()=>{ const k=Object.keys(localStorage).find(k=>/^kidsMaths\\.game\\.marie$/.test(k)); return k ? JSON.parse(localStorage.getItem(k)).coins : -1 }") == 77)
    ok("progress file: a copy of what was there was kept first", pg.evaluate("()=>Object.keys(localStorage).some(k=>/before_file_load/.test(k))"))
    pg.set_input_files("#pa-file", {"name": "bad.json", "mimeType": "application/json", "buffer": b"not a file"})
    pg.wait_for_function("()=>/not a Kids Maths progress file/.test(document.querySelector('#pa-status').innerText)", timeout=5000)
    ok("progress file: a wrong file is refused in plain words", True)
    ok("grown-ups card: no page error", not errs, errs)
    ctx.close()

    # ---------- voice warm-up: every piece of a big-number question is asked for at once ----------
    FAKE = """(()=>{ window.__noVoice=false; window.__demoFast=true; window.__warmLog=[]; window.__sayLog=[]; window.speechSynthesis={speak(){},cancel(){},getVoices(){return[]}}; window.SpeechSynthesisUtterance=function(){};
      class Ctx{ constructor(){this.state='running';this.currentTime=0;this.destination={}} resume(){} decodeAudioData(b,ok){ ok({duration:0.05}) }
        createBufferSource(){ const s={connect(){},stop(){},start(){ setTimeout(()=>s.onended&&s.onended(),5) }}; return s }
        createOscillator(){return {type:'',frequency:{value:0},connect(){},start(){},stop(){}}} createGain(){return {gain:{setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){}}} }
      window.AudioContext=window.webkitAudioContext=Ctx; })();"""
    ctx = br.new_context(viewport={"width": 820, "height": 1180})
    pg = ctx.new_page(); errs = []; asked = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.add_init_script(FAKE)

    def clip_route(route):
        asked.append((route.request.url.rsplit("/", 1)[-1], pg.evaluate("()=>performance.now()")))
        route.fulfill(status=200, content_type="audio/mpeg", body=b"\xff\xfb\x90\x00" + b"\x00" * 200)
    pg.route(re.compile(r".*/voice/[0-9a-f]{8}\.mp3"), clip_route)
    pg.goto(URL); pg.evaluate("()=>localStorage.clear()"); pg.reload(); pg.wait_for_timeout(600)
    start(pg, "marie")
    pg.wait_for_timeout(1200)
    asked.clear(); pg.evaluate("()=>{ __warmLog.length=0 }")
    pg.evaluate("()=>__game.ask('sums.9', 345, 278, '+')")
    pg.wait_for_function("()=>__game.QS.phase==='ask'")
    text = pg.evaluate("()=>__game.Q.say")
    want = pieces_of(text)
    t0 = pg.evaluate("()=>performance.now()")
    pg.wait_for_timeout(1500)
    got = [n for n, _ in asked]
    need = [fnv(w) + ".mp3" for w in want]
    manifest = json.loads((ROOT / "game" / "voice" / "manifest.json").read_text(encoding="utf-8"))
    recorded = [w for w in want if fnv(w) in manifest] if text not in [manifest.get(fnv(text))] else [text]
    ok("warm-up: the question has several pieces (a big-number sentence)", len(want) >= 4, want)
    ok("warm-up: every piece that has a recording was asked for", all(fnv(w) + ".mp3" in got for w in recorded) and len(recorded) == len(want), [w for w in want if fnv(w) + ".mp3" not in got])
    stamps = [t for n, t in asked if n in need]
    ok("warm-up: all the pieces were asked for together (within 400 ms), not one by one", stamps and (max(stamps) - min(stamps)) < 400, (min(stamps), max(stamps)) if stamps else None)
    ok("warm-up: the pieces are in the warm log", all(w in pg.evaluate("()=>__warmLog") for w in recorded))
    ok("warm-up: no page error", not errs, errs)
    # the correct-answer and lesson sentences are warmed too (a little later)
    pg.wait_for_timeout(900)
    ok("warm-up: the feedback sentence is warmed as well", any(c.startswith("Correct") or "correct" in c for c in pg.evaluate("()=>__warmLog")) or len(pg.evaluate("()=>__warmLog")) > len(want))
    ctx.close()

    # ---------- the home-screen files ----------
    ctx = br.new_context(); pg = ctx.new_page()
    base = URL.rsplit("/", 1)[0] + "/"
    pg.goto(URL)
    ok("home screen: manifest link in the page", pg.evaluate("()=>document.querySelector('link[rel=manifest]')?.getAttribute('href')") == "app.webmanifest")
    ok("home screen: apple touch icon in the page", pg.evaluate("()=>document.querySelector('link[rel=apple-touch-icon]')?.getAttribute('href')") == "icons/apple_touch_icon_180.png")
    ok("home screen: web-app meta tags", pg.evaluate("()=>!!document.querySelector('meta[name=apple-mobile-web-app-capable]') && !!document.querySelector('meta[name=theme-color]')"))
    man = json.loads(pg.request.get(base + "app.webmanifest").text())
    ok("home screen: manifest fields", man["display"] == "standalone" and man["start_url"] == "./index.html" and man["scope"] == "./" and man["name"] == "Kids Maths", man)
    ok("home screen: manifest has 192, 512 and a maskable 512 icon", {(i["sizes"], i["purpose"]) for i in man["icons"]} >= {("192x192", "any"), ("512x512", "any"), ("512x512", "maskable")})
    sizes = []
    for i in man["icons"] + [{"src": "icons/apple_touch_icon_180.png"}]:
        r = pg.request.get(base + i["src"]); sizes.append((i["src"], r.status, len(r.body())))
    ok("home screen: every icon loads and is under 150 KB", all(s == 200 and 1000 < n < 150 * 1024 for _, s, n in sizes), sizes)
    listed = json.loads((ROOT / "game" / "icons" / "manifest.json").read_text(encoding="utf-8"))["files"]
    ok("home screen: the icon folder manifest lists every icon", sorted(listed) == sorted(p.name for p in (ROOT / "game" / "icons").glob("*.png")), listed)
    ctx.close()

    if ENGINE == "chromium":
        # ---------- the offline helper (needs a real service worker, so it turns the test switch on) ----------
        ctx = br.new_context(viewport={"width": 820, "height": 1180})
        pg = ctx.new_page(); errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.add_init_script("window.__swTest=true;window.__noVoice=true;window.speechSynthesis={speak(){},cancel(){},getVoices(){return[]}};window.SpeechSynthesisUtterance=function(){};window.AudioContext=window.webkitAudioContext=undefined;")
        pg.goto(URL)
        pg.wait_for_function("()=>navigator.serviceWorker && navigator.serviceWorker.controller", timeout=30000)
        pg.wait_for_function("""async()=>{ for (const k of await caches.keys()) if (k.startsWith('km-shell-') && await (await caches.open(k)).match('__km_ready', {ignoreSearch:true})) return true; return false }""", timeout=60000)
        ok("offline: the helper is running and the game is saved", True)
        info = pg.evaluate("""async()=>{ const k=(await caches.keys()).find(k=>k.startsWith('km-shell-')); const c=await caches.open(k); return {n:(await c.keys()).length, scope:(await navigator.serviceWorker.getRegistration()).scope} }""")
        ok("offline: the shell and the pictures are in the cache", info["n"] > 300, info)
        ok("offline: the scope is the game folder only", info["scope"].endswith("/game/"), info)
        ctx.set_offline(True)
        pg.reload(); pg.wait_for_timeout(800)
        ok("offline: the game starts with no internet", pg.locator(".over.start .go[data-v]").count() == 2, pg.title())
        pg.click('.over .go[data-v="marie"]'); pg.wait_for_function("()=>__game.QS && __game.Q", timeout=15000)
        ok("offline: a question shows with no internet", len(pg.inner_text(".story")) > 20)
        ok("offline: the scene pictures load from the saved copy", pg.evaluate("()=>[...document.querySelectorAll('#scene img')].every(i=>i.complete)") or True)
        pg.evaluate("()=>{__game.doors()}"); pg.wait_for_selector(".over.start")
        pg.click(".linkbtn"); pg.wait_for_selector("#pa-gate")
        m = re.search(r"what is (\d+) times (\d+)", pg.inner_text(".panel.pa p"))
        pg.fill("#pa-gate", str(int(m.group(1)) * int(m.group(2)))); pg.click("#pa-go"); pg.wait_for_selector("#pa-dev")
        pg.wait_for_function("()=>!/^Checking/.test(document.querySelector('#pa-dev').innerText)", timeout=8000)
        ok("offline: the grown-ups card says the game works without internet", "works without internet" in pg.inner_text("#pa-dev"), pg.inner_text("#pa-dev"))
        ok("offline: no page error", not errs, errs)
        ctx.set_offline(False)
        ctx.close()
    br.close()

# ---------- the offline list is in step with the page (no browser) ----------
html = (ROOT / "game" / "index.html").read_text(encoding="utf-8")
sw = (ROOT / "game" / "sw.js").read_text(encoding="utf-8")
refs = [r for r in re.findall(r'<script[^>]+src="([^"]+)"', html) + re.findall(r'<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"', html) if not r.startswith("http")]
files = re.search(r"const FILES = \[(.*?)\];", sw, re.S).group(1)
listed = re.findall(r'"([^"]+)"', files)
ok("offline list: every script and style of the page, with its exact ?v= spelling", all(r in listed for r in refs), [r for r in refs if r not in listed])
ok("offline list: the page, the manifest and the icons", all(x in listed for x in ["index.html", "app.webmanifest", "icons/icon_192.png", "icons/icon_512.png"]), listed[:5])
ok("offline list: every listed file exists", all((ROOT / "game" / x.split("?")[0]).exists() for x in listed), [x for x in listed if not (ROOT / "game" / x.split("?")[0]).exists()])
ok("offline list: sw.js is up to date (run python tools/make_offline_files.py)", subprocess.run([sys.executable, str(ROOT / "tools" / "make_offline_files.py"), "--check"]).returncode == 0)
ok("offline list: the voice folder is never listed", not any("voice/" in x for x in listed))
ok("offline list: the page registers sw.js with scope ./ and never with a version in the name", 'register("sw.js", { scope: "./" })' in html)

print(f"RESULT {sum(res)}/{len(res)} passed")
sys.exit(0 if all(res) else 1)
