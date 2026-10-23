"""Record, hints and grown-ups check for game/index.html (22 Oct 2026): the answer log, the kind of miss and its lead sentence,
the three-step hints (clean / helped / coins), the second picture for a stuck skill, the "For grown-ups" card (check, report,
text file, progress file out and back in). Silent: stubs speech and audio, runs with --mute-audio. Prints only failures and one RESULT line.
Run: python tests/game_record_test.py http://localhost:8790/game/index.html [chromium|webkit]"""
import json
import sys
import tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright

URL = sys.argv[1]
ENGINE = sys.argv[2] if len(sys.argv) > 2 else "chromium"
STUB = ("window.__demoFast=true;window.__noVoice=true;window.__noRewards=true;window.__sayLog=[];"
        "window.speechSynthesis={speak(){},cancel(){},getVoices(){return[]}};"
        "window.SpeechSynthesisUtterance=function(){};window.AudioContext=window.webkitAudioContext=undefined;")
res = []


def ok(name, cond, info=""):
    res.append(bool(cond))
    if not cond:
        print(f"FAIL {name} {info}")


def fresh_page(br, who, vw=820, vh=1180, seed_js=None):
    ctx = br.new_context(viewport={"width": vw, "height": vh}, accept_downloads=True)
    pg = ctx.new_page(); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.add_init_script(STUB)
    pg.goto(URL)
    pg.evaluate("()=>localStorage.clear()")
    if seed_js:
        pg.evaluate(seed_js)
    pg.reload(); pg.wait_for_timeout(400)
    if who:
        pg.click(f'.over .go[data-v="{who}"]'); pg.wait_for_timeout(500)
    return ctx, pg, errs


def placed(w):
    """a save whose level check is done, so answers go to the engine and not to the level check"""
    return ("()=>{const e=KidsEngine.createState('%s'); e.place.done=true; localStorage.setItem('kidsMaths.game.%s', "
            "JSON.stringify({version:2,coins:5,game:{answered:0,sinceReward:0,sincePlay:0,rewardTurn:0},days:{},engine:e}))}") % (w, w)


def type_answer(pg, right):
    pg.evaluate("""(right)=>{const Q=__game.Q, v=right?Q.ans:Q.ans+1;
      if(Q.kind==='choice'){__game.QS.pick=right?Q.ans:Q.opts.find(o=>o!==Q.ans)}else{__game.QS.typed=String(v)};
      document.getElementById('tile').click()}""", right)


def to_typed_question(pg, skill="sums.3"):
    """a typed sum so the hint ladder and the keypad are in play"""
    pg.evaluate("(s)=>__game.show(__game.make(s))", skill)
    pg.wait_for_function("()=>__game.QS && __game.QS.phase==='ask'", timeout=5000)


with sync_playwright() as p:
    br = getattr(p, ENGINE).launch(**({"args": ["--mute-audio"]} if ENGINE == "chromium" else {}))

    # ---------- 1. three-step hints (Marie, a typed sum) ----------
    ctx, pg, errs = fresh_page(br, "marie", seed_js=placed("marie"))
    to_typed_question(pg)
    c0 = pg.evaluate("()=>__game.P.coins")
    pg.click("#qbody .bulb"); pg.wait_for_selector(".bubble", timeout=3000)
    ok("hint 1: a nudge, level 1, no picture", pg.evaluate("()=>__game.QS.hintLevel") == 1 and pg.locator(".bubble .hintpic").count() == 0 and pg.locator(".bubble .hmore").count() == 1)
    ok("hint 1: the nudge is spoken through say()", pg.evaluate("()=>__sayLog.some(t=>/^Read it once more|^Look at the word/.test(t))"), pg.evaluate("()=>__sayLog"))
    pg.click(".bubble .hmore"); pg.wait_for_function("()=>document.querySelector('.bubble').dataset.level==='2'", timeout=3000)
    ok("hint 2: a picture of the story", pg.locator(".bubble .hintpic").count() == 1 and pg.evaluate("()=>__game.QS.hintLevel") == 2)
    leak = pg.evaluate("()=>({txt:document.querySelector('.bubble .hintpic').textContent.trim(), ans:String(__game.Q.ans), hopper:!!document.querySelector('.bubble .hopper')})")
    ok("hint 2: the picture has no numbers and no hopper", not any(ch.isdigit() for ch in leak["txt"]) and not leak["hopper"], leak)
    ok("hint 2: still counts as clean (no help yet)", pg.evaluate("()=>__game.QS.hintLevel<3"))
    pg.click(".bubble .hmore"); pg.wait_for_function("()=>document.querySelector('.bubble').dataset.level==='3'", timeout=3000)
    ok("hint 3: the worked step, no more button", pg.evaluate("()=>document.querySelector('.bubble h4').textContent===__game.Q.hint") and pg.locator(".bubble .hmore").count() == 0)
    pg.click("#qbody .bulb"); pg.wait_for_timeout(200)
    ok("hint closes", pg.locator(".bubble").count() == 0)
    type_answer(pg, True)
    pg.wait_for_function("()=>__game.QS.phase==='right'", timeout=5000)
    sk = pg.evaluate("()=>__game.P.engine.skills[__game.Q.skill]")
    ok("hint 3 then right: helped, so not clean for the maths level", sk["right"] == 0 and sk["recent"][-1] == 0, sk)
    ok("hint 3 then right: still 2 coins (a hint never costs coins)", pg.evaluate("()=>__game.P.coins") == c0 + 2, [c0, pg.evaluate("()=>__game.P.coins")])
    lg = pg.evaluate("()=>__game.log.all()")
    ok("log: hint level 3 recorded", lg[-1]["h"] == 3 and lg[-1]["ok"] == 1 and lg[-1]["r"] == 1, lg[-1])
    # level 1 and 2 only: stays clean
    pg.click("#tile"); pg.wait_for_function("()=>__game.QS.phase==='ask'", timeout=5000)
    to_typed_question(pg, "sums.4")
    c1 = pg.evaluate("()=>__game.P.coins")
    pg.click("#qbody .bulb"); pg.wait_for_selector(".bubble"); pg.click(".bubble .hmore"); pg.wait_for_function("()=>document.querySelector('.bubble').dataset.level==='2'")
    pg.click("#qbody .bulb"); pg.wait_for_timeout(150)
    type_answer(pg, True); pg.wait_for_function("()=>__game.QS.phase==='right'", timeout=5000)
    sk = pg.evaluate("()=>__game.P.engine.skills['sums.4']")
    ok("hint 2 then right: counts as a clean answer", sk["right"] == 1 and sk["recent"][-1] == 1, sk)
    ok("hint 2 then right: 2 coins", pg.evaluate("()=>__game.P.coins") == c1 + 2)
    ok("log: hint level 2 recorded", pg.evaluate("()=>__game.log.all().slice(-1)[0].h") == 2)
    ok("hints: no page errors", not errs, errs[:3])
    ctx.close()

    # ---------- 2. the kind of miss, its lead sentence, the new question (Marie) ----------
    ctx, pg, errs = fresh_page(br, "marie", seed_js=placed("marie"))
    pg.evaluate("()=>__game.show(__game.make('sums.3'))")
    pg.evaluate("()=>{__game.QS.t0=Date.now()-6000}")
    pg.evaluate("()=>{const Q=__game.Q; __game.QS.typed=String(Q.ans-1); document.getElementById('tile').click()}")   # out by one
    pg.wait_for_selector("#boardbtns .again", state="attached", timeout=20000)
    pg.wait_for_function("()=>!document.querySelector('#boardbtns .again').hidden", timeout=90000)
    ok("miss: classed as a slip", pg.evaluate("()=>__game.QS.missCls") == "slip", pg.evaluate("()=>__game.QS.missCls"))
    ok("miss: the matching lead sentence is spoken first in the lesson", pg.evaluate("()=>__sayLog.includes(MissStudy.leadSentence('slip'))"), pg.evaluate("()=>__sayLog"))
    ok("miss: the lesson does not say 'Type' (the answer is on the board)", pg.evaluate("()=>!__sayLog.some(t=>/^(The |)[\\w ]* (is|are) \\d+\\. Type \\d+/.test(t)) && !__sayLog.some(t=>/\\. Type \\d+\\.$/.test(t))"), pg.evaluate("()=>__sayLog.slice(-4)"))
    pg.click("#ansBox", force=True) if pg.locator("#ansBox").count() else None
    pg.click("#pad button[data-k='1']", force=True); pg.wait_for_timeout(200)
    ok("miss: typing is locked while the lesson is up", pg.evaluate("()=>__game.QS.typed")== "", pg.evaluate("()=>__game.QS.typed"))
    k_old = pg.evaluate("()=>__game.Q.key")
    pg.click("#boardbtns .bx")                                  # closing the lesson also brings the new question
    pg.wait_for_function("(k)=>__game.QS.afterMiss===true && __game.Q.key!==k", arg=k_old, timeout=10000)
    pg.wait_for_function("()=>__sayLog.includes('Now try a new one.')", timeout=5000)
    ok("miss: closing the lesson brings a new question, with a spoken lead-in", True)
    lg = pg.evaluate("()=>__game.log.all()")
    ok("log: the miss has what was given, the answer, the kind", lg[0]["ok"] == 0 and lg[0]["g"] == lg[0]["a"] - 1 and lg[0]["c"] == "slip" and "?" in lg[0]["q"], lg[0])
    ok("miss: nothing counted twice (one answer, engine not yet told)", pg.evaluate("()=>__game.P.game.answered") == 0)
    type_answer(pg, True); pg.wait_for_function("()=>__game.QS.phase==='right'", timeout=5000)
    ok("new question right: counts once, 1 coin", pg.evaluate("()=>__game.P.game.answered") == 1)
    lg = pg.evaluate("()=>__game.log.all()")
    ok("log: second line is the new question, flagged", len(lg) == 2 and "fresh" in lg[1]["f"] and lg[1]["r"] == 2 and lg[1]["ok"] == 1, lg)
    ok("log: the new question has different numbers", lg[0]["q"] != lg[1]["q"], [lg[0]["q"], lg[1]["q"]])
    # each kind of miss gets its own lead sentence
    for cls, make in [("wrong_op", "const Q=__game.Q; return Q.op==='+' ? Math.abs(Q.a-Q.b) : Q.a+Q.b"), ("copied", "return __game.Q.a")]:
        pg.click("#tile"); pg.wait_for_function("()=>__game.QS.phase==='ask'", timeout=5000)
        pg.evaluate("()=>__game.show(__game.make('sums.4'))"); pg.evaluate("()=>{__game.QS.t0=Date.now()-6000}")
        pg.evaluate("()=>{const f=()=>{%s}; __game.QS.typed=String(f()); document.getElementById('tile').click()}" % make)
        pg.wait_for_function("()=>__game.QS.missCls", timeout=8000)
        ok(f"miss: {cls} recognised in the game", pg.evaluate("()=>__game.QS.missCls") == cls, pg.evaluate("()=>[__game.QS.missCls, __game.Q.eq]"))
        pg.wait_for_selector("#boardbtns .again", state="attached", timeout=20000)
        pg.wait_for_function("()=>!document.querySelector('#boardbtns .again').hidden", timeout=90000)
        pg.click("#boardbtns .bnext"); pg.wait_for_function("()=>__game.QS.afterMiss===true", timeout=10000)
        type_answer(pg, True); pg.wait_for_function("()=>__game.QS.phase==='right'", timeout=5000)
    ok("miss: no page errors", not errs, errs[:3])
    ctx.close()

    # ---------- 3. Kennedy: picture-only more-help button, tap questions ----------
    ctx, pg, errs = fresh_page(br, "kennedy", 820, 1180, seed_js=placed("kennedy"))
    pg.wait_for_function("()=>__game.QS && __game.QS.phase==='ask'", timeout=5000)
    pg.evaluate("()=>__game.show(__game.make('kinder.5'))")
    pg.click("#qbody .bulb"); pg.wait_for_selector(".bubble")
    more = pg.locator(".bubble .hmore")
    ok("Kennedy: more help is a picture button with a label, no words", more.count() == 1 and more.inner_text().strip() == "" and more.get_attribute("aria-label") == "More help")
    pg.wait_for_function("()=>__sayLog.includes('Tap the plus for more help.')", timeout=5000)
    ok("Kennedy: the plus button is spoken about", True)
    box = more.bounding_box()
    ok("Kennedy: the plus button is at least 48 pixels", box and box["width"] >= 48 and box["height"] >= 48, box)
    more.click(); pg.wait_for_function("()=>document.querySelector('.bubble').dataset.level==='2'")
    ok("Kennedy: level 2 draws a picture", pg.locator(".bubble .hintpic").count() == 1)
    ok("Kennedy: no page errors", not errs, errs[:3])
    ctx.close()

    # ---------- 4. a stuck skill with nothing underneath: the second picture ----------
    seed = """()=>{const e=KidsEngine.createState('marie'); e.place.done=true;
      e.skills['sums.1']={lvl:2,streak:0,n:12,right:2,recent:[0,0,1,0,0,0,1,0,0,0],due:0,gap:0,recheck:null,stuckN:12,stuckRight:2,repairs:0,parkedUntil:0,first2:[0,0]};
      localStorage.setItem('kidsMaths.game.marie', JSON.stringify({version:2,coins:5,game:{answered:0,sinceReward:0,sincePlay:0,rewardTurn:0},days:{},engine:e}))}"""
    ctx, pg, errs = fresh_page(br, None)
    pg.evaluate(seed); pg.reload(); pg.wait_for_timeout(400)
    pg.click('.over .go[data-v="marie"]'); pg.wait_for_timeout(800)
    ok("stuck skill with nothing underneath: a repair set with a second picture", pg.evaluate("()=>__game.set.kind==='repair' && __game.set.alt===true && __game.set.target==='sums.1'"), pg.evaluate("()=>[__game.set.kind, __game.set.alt, __game.set.target]"))
    ok("second picture: shown in place of the number line, no hop buttons", pg.evaluate("()=>__game.QS.alt===true") and pg.locator(".altpic svg").count() == 1 and pg.locator(".hoprow button[data-h]").count() == 0, pg.evaluate("()=>[__game.QS.alt, document.querySelectorAll('.altpic').length]"))
    ok("second picture: a spoken lead-in, once", pg.evaluate("()=>__sayLog.filter(t=>t===HintLadder.ALT_LEAD).length")  == 1, pg.evaluate("()=>__sayLog"))
    ok("second picture: shows no numbers", not any(ch.isdigit() for ch in pg.evaluate("()=>document.querySelector('.altpic svg').textContent")))
    type_answer(pg, True); pg.wait_for_function("()=>__game.QS.phase==='right'", timeout=5000)
    ok("second picture: the answer counts as usual", pg.evaluate("()=>__game.P.game.answered") == 1 and pg.evaluate("()=>__game.log.all().slice(-1)[0].f.includes('alt')"))
    pg.click("#tile"); pg.wait_for_function("()=>__game.QS.phase==='ask'", timeout=5000)
    ok("second picture: the next question of the set has it too, and no second lead-in", pg.evaluate("()=>__game.QS.alt===true && __sayLog.filter(t=>t===HintLadder.ALT_LEAD).length===1"))
    ok("second picture: no page errors", not errs, errs[:3])
    ctx.close()

    # ---------- 5. a damaged answer log never stops play ----------
    ctx, pg, errs = fresh_page(br, None, seed_js="()=>localStorage.setItem('kidsMaths.game.log.marie','{\"v\":1,\"e\":[{\"t\":1')")
    pg.click('.over .go[data-v="marie"]'); pg.wait_for_timeout(600)
    ok("damaged log: a copy is kept and a new log started", pg.evaluate("()=>Object.keys(localStorage).some(k=>k.startsWith('kidsMaths.game.log.marie.damaged.'))") and pg.evaluate("()=>__game.log.size()") == 0)
    ok("damaged log: the grown-up is told in plain words", pg.locator(".parentnote").count() == 1 and "record of answers" in pg.inner_text(".parentnote"), pg.locator(".parentnote").count())
    pg.click(".parentnote .go"); pg.wait_for_timeout(300)
    ok("damaged log: play starts", pg.evaluate("()=>__game.QS && __game.QS.phase==='ask'"))
    type_answer(pg, True); pg.wait_for_function("()=>__game.QS.phase==='right'", timeout=5000)
    ok("damaged log: answers are logged again", pg.evaluate("()=>__game.log.size()") == 1)
    ok("damaged log: no page errors", not errs, errs[:3])
    ctx.close()

    # ---------- 6. the For grown-ups card ----------
    seed = """()=>{
      const mk=(w,coins,answered)=>{const e=KidsEngine.createState(w); e.place.done=true; const d=new Date().toISOString().slice(0,10);
        const days={}; days[d]={n:answered,clean:Math.round(answered*.7),ms:answered*9000,sets:2,skills:{'sums.3':[answered,Math.round(answered*.7)]}};
        e.skills['sums.3']={lvl:2,streak:0,n:answered,right:Math.round(answered*.7),recent:[1,0,1,1,0,1,1,1,0,1],due:0,gap:0,recheck:null,stuckN:3,stuckRight:2,repairs:0,parkedUntil:0,first2:[1,0]};
        localStorage.setItem('kidsMaths.game.'+w, JSON.stringify({version:2,coins:coins,game:{answered:answered,sinceReward:0,sincePlay:0,rewardTurn:0},days:days,engine:e}))};
      mk('marie',77,20); mk('kennedy',12,8);
      const t=Date.now(), ent=[]; for(let i=0;i<12;i++) ent.push({t:t-i*60000,s:'sums.3',q:'8 + 7 = ?',g:i<7?16:14,a:15,ok:0,h:i%2,r:1,sc:'add',ms:5000,k:'t',c:i<7?'slip':'copied',f:[]});
      for(let i=0;i<8;i++) ent.push({t:t-i*70000-5000,s:'sums.3',q:'6 + 9 = ?',g:15,a:15,ok:1,h:0,r:1,sc:'add',ms:4000,k:'t',c:'',f:[]});
      localStorage.setItem('kidsMaths.game.log.marie', JSON.stringify({v:1,e:ent}))}"""
    ctx, pg, errs = fresh_page(br, None, seed_js=seed)
    ok("grown-ups: a small button on the doors, not one of the two doors", pg.locator(".over.start .linkbtn").count() == 1 and pg.locator(".over.start .go[data-v]").count() == 2)
    pg.click(".over.start .linkbtn"); pg.wait_for_selector(".parentarea", timeout=3000)
    ok("grown-ups: starts with a check", pg.locator("#pa-gate").count() == 1 and "times" in pg.inner_text(".parentarea .panel"))
    ok("grown-ups: it is a labelled dialog", pg.get_attribute(".parentarea", "role") == "dialog" and pg.get_attribute(".parentarea", "aria-modal") == "true")
    pg.fill("#pa-gate", "7"); pg.click("#pa-go"); pg.wait_for_timeout(200)
    ok("grown-ups: a wrong answer does not open it", pg.locator(".pa-wrong").count() == 1 and pg.locator(".pa-body").count() == 0)
    q = pg.inner_text(".parentarea p").split("what is ")[1].split("?")[0].split(" times ")
    dls = []; pg.on("download", lambda d: dls.append(d))
    pg.fill("#pa-gate", str(int(q[0]) * int(q[1]))); pg.press("#pa-gate", "Enter"); pg.wait_for_selector(".pa-body", timeout=3000); pg.wait_for_timeout(500)
    ok("grown-ups: Enter in the check does not press a button by accident", len(dls) == 0 and pg.evaluate("()=>document.activeElement.id") == "pa-h", [len(dls), pg.evaluate("()=>document.activeElement.id")])
    ok("grown-ups: no status message yet", pg.inner_text("#pa-status").strip() == "")
    body = pg.inner_text(".pa-body")
    ok("grown-ups: a plain weekly paragraph for each child", "In the last 7 days Marie" in body and "20 questions" in body and "Kennedy" in body, body[:400])
    ok("grown-ups: the most common wrong answers, skill by skill", "most common wrong answers" in body and "gave 16 7 times" in body, body)
    ok("grown-ups: kinds of mistake in plain words", "was out by one or two (7)" in body, body)
    ok("grown-ups: a tip", "what you can do" in body.lower())
    ok("grown-ups: real headings for a screen reader", pg.locator(".pa-body h2").count() >= 4)
    with pg.expect_download() as dl:
        pg.click("#pa-text")
    d = dl.value; path = Path(tempfile.gettempdir()) / "kids_report_probe.txt"; d.save_as(str(path))
    txt = path.read_text(encoding="utf-8")
    ok("report file: a plain text file named with the date", d.suggested_filename.startswith("kids_maths_report_") and d.suggested_filename.endswith(".txt") and "Marie" in txt and "gave 16 7 times" in txt, d.suggested_filename)
    ok("report file: no SIN-like or secret data", "SIN" not in txt and "password" not in txt.lower())
    with pg.expect_download() as dl2:
        pg.click("#pa-file-save")
    d2 = dl2.value; ppath = Path(tempfile.gettempdir()) / "kids_progress_probe.json"; d2.save_as(str(ppath))
    pf = json.loads(ppath.read_text(encoding="utf-8"))
    ok("progress file: format, both children, the log", pf["format"] == "kids_maths_progress" and set(pf["children"]) == {"marie", "kennedy"} and len(pf["children"]["marie"]["log"]) == 20, list(pf["children"]))
    # damaged and odd files are refused with a plain message, nothing changes
    bad = Path(tempfile.gettempdir()) / "kids_bad_probe.json"; bad.write_text("not json at all", encoding="utf-8")
    pg.set_input_files("#pa-file", str(bad)); pg.wait_for_timeout(300)
    ok("progress file: a file that is not ours is refused in plain words", "not a Kids Maths progress file" in pg.inner_text("#pa-status"), pg.inner_text("#pa-status"))
    ok("progress file: nothing was changed by a refused file", pg.evaluate("()=>JSON.parse(localStorage.getItem('kidsMaths.game.marie')).coins") == 77)
    # change the file, say no, then yes
    pf["children"]["marie"]["save"]["coins"] = 123
    ppath.write_text(json.dumps(pf), encoding="utf-8")
    pg.set_input_files("#pa-file", str(ppath)); pg.wait_for_selector("#pa-yes", timeout=3000)
    ok("progress file: asks first, in plain words, naming the children", "Load this file?" in pg.inner_text("#pa-confirm") and "Marie" in pg.inner_text("#pa-confirm") and "safe copy" in pg.inner_text("#pa-confirm"))
    pg.click("#pa-no"); pg.wait_for_timeout(200)
    ok("progress file: saying no changes nothing", pg.evaluate("()=>JSON.parse(localStorage.getItem('kidsMaths.game.marie')).coins") == 77)
    pg.set_input_files("#pa-file", str(ppath)); pg.wait_for_selector("#pa-yes", timeout=3000); pg.click("#pa-yes"); pg.wait_for_timeout(400)
    ok("progress file: saying yes loads it", pg.evaluate("()=>JSON.parse(localStorage.getItem('kidsMaths.game.marie')).coins") == 123)
    ok("progress file: a safe copy of what was there is kept", pg.evaluate("()=>Object.keys(localStorage).filter(k=>k.startsWith('kidsMaths.game.marie.before_file_load.')).length") == 1)
    ok("progress file: the log came back too", pg.evaluate("()=>JSON.parse(localStorage.getItem('kidsMaths.game.log.marie')).e.length") == 20)
    ok("progress file: a plain message says what was done", "Marie: progress loaded" in pg.inner_text("#pa-status"), pg.inner_text("#pa-status"))
    pg.click("#pa-close"); pg.wait_for_timeout(200)
    ok("grown-ups: closing returns to the doors", pg.locator(".parentarea").count() == 0 and pg.locator(".over.start .go[data-v]").count() == 2)
    pg.click('.over .go[data-v="marie"]'); pg.wait_for_timeout(500)
    ok("grown-ups: the loaded progress is what Marie plays with", pg.evaluate("()=>__game.P.coins") == 123)
    ok("grown-ups: no page errors", not errs, errs[:3])
    ctx.close()
    br.close()
print(f"RESULT {sum(res)}/{len(res)} passed")
