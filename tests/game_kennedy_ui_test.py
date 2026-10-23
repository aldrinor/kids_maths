"""Kennedy's screen (game/index.html, castle door): one tap sends an answer and speaks it, picture buttons, no Back / Forward /
Restart, one pencil, a guarded home button, no a) b) c) labels, touch targets of 64 px that really render at 64 px, and the
ReaderFree check: nothing a five-year-old must press has a word on it, and every instruction is spoken.
Also checks that Marie keeps tap-then-Check. Silent. Prints only failures and one RESULT line.
Run: python tests/game_kennedy_ui_test.py http://localhost:8790/game/index.html [chromium|webkit]"""
import sys
from playwright.sync_api import sync_playwright

URL = sys.argv[1]
ENGINE = sys.argv[2] if len(sys.argv) > 2 else "chromium"
STUB = ("window.__demoFast=true;window.__noVoice=true;window.__noRewards=true;window.__sayLog=[];localStorage.clear();"
        "window.speechSynthesis={speak(){},cancel(){},getVoices(){return[]}};window.SpeechSynthesisUtterance=function(){};"
        "window.AudioContext=window.webkitAudioContext=undefined;")
SIZES = [(360, 740), (768, 1024), (1280, 720)]
MIN_TARGET = 64
MIN_KEY_WIDTH = 44          # keypad keys: 64 high, and at least 44 wide (six keys across a 360 px phone)
res = []


def ok(name, cond, info=""):
    res.append(bool(cond))
    if not cond:
        print(f"FAIL {name} {info}")


# every visible button: its rendered size, its declared min size, and the words on it
MEASURE = r"""() => [...document.querySelectorAll('button')].filter(b => { const r = b.getBoundingClientRect(); const cs = getComputedStyle(b);
    return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && !b.closest('[hidden]'); }).map(b => {
  const r = b.getBoundingClientRect(), cs = getComputedStyle(b);
  const name = (b.id ? '#' + b.id : '') + '.' + String(b.className).split(' ').filter(Boolean).join('.') + (b.dataset.k ? '[' + b.dataset.k + ']' : '');
  return { name, w: r.width, h: r.height, minH: parseFloat(cs.minHeight) || 0, text: (b.innerText || '').trim(), key: !!b.dataset.k, hop: !!b.closest('.hoprow') }; })"""


def settle(pg):
    pg.wait_for_function("()=>__game.QS && __game.QS.phase==='ask' && !__game.QS.teaching", timeout=60000)
    pg.wait_for_timeout(200)


def sizes_and_words(pg, state, tag, tight_typed=False):
    """tight_typed: a typed sum on a phone (360x740). The keypad and the hop row are 46 px there (64 px does not fit), see kid_mode.css."""
    for b in pg.evaluate(MEASURE):
        small_ok = tight_typed and (b["key"] or b["hop"])
        where = f"{tag} {state} {b['name']}"
        letters = any(c.isalpha() for c in b["text"])
        ok(f"{where} has no words on it (ReaderFree)", not letters, repr(b["text"]))
        if small_ok:
            ok(f"{where} at least {MIN_KEY_WIDTH}px", b["w"] >= MIN_KEY_WIDTH - 0.5 and b["h"] >= MIN_KEY_WIDTH - 0.5, f"{round(b['w'], 1)}x{round(b['h'], 1)}")
        elif b["key"]:
            ok(f"{where} height", b["h"] >= MIN_TARGET - 0.5, round(b["h"], 1))
            ok(f"{where} width", b["w"] >= MIN_KEY_WIDTH - 0.5, round(b["w"], 1))
        else:
            ok(f"{where} is {MIN_TARGET}px", b["w"] >= MIN_TARGET - 0.5 and b["h"] >= MIN_TARGET - 0.5, f"{round(b['w'], 1)}x{round(b['h'], 1)}")
        ok(f"{where} rendered height agrees with declared min-height", b["h"] >= b["minH"] - 0.5, f"rendered {round(b['h'], 1)} declared {b['minH']}")


with sync_playwright() as p:
    br = getattr(p, ENGINE).launch(**({"args": ["--mute-audio"]} if ENGINE == "chromium" else {}))
    for vw, vh in SIZES:
        tag = f"{vw}x{vh}"
        pg = br.new_page(viewport={"width": vw, "height": vh}, has_touch=vw < 900)
        errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.add_init_script(STUB); pg.goto(URL); pg.wait_for_timeout(400)
        pg.click('.over .go[data-theme="castle"]'); pg.wait_for_timeout(500)
        settle(pg)
        # ---- a choice question
        q = pg.evaluate("()=>({kind:__game.Q.kind, ans:__game.Q.ans, opts:__game.Q.opts})")
        ok(f"{tag} first question is a tap question", q["kind"] == "choice", q)
        sizes_and_words(pg, "choice question", tag)
        ok(f"{tag} no a) b) c) labels", pg.evaluate("()=>document.querySelectorAll('#qbody .opt small').length === 0 && !/[abc]\\)/.test(document.querySelector('#qbody .bars').innerText)"))
        ok(f"{tag} no Back / Forward / Restart", pg.evaluate("()=>[...document.querySelectorAll('.hoprow button[data-h]')].every(b => b.getBoundingClientRect().width === 0)"))
        ok(f"{tag} one pencil only", pg.evaluate("()=>document.querySelectorAll('#tools .pencil').length === 1"))
        ok(f"{tag} no Check button before an answer on a tap question", pg.evaluate("()=>document.getElementById('tile').getBoundingClientRect().width === 0"))
        # ---- hint: spoken
        pg.click("#qbody .bulb"); pg.wait_for_timeout(200)
        sizes_and_words(pg, "hint open", tag)
        ok(f"{tag} hint is spoken", pg.evaluate("()=>__sayLog.includes(__game.Q.hint)"))
        pg.click("#qbody .bulb"); pg.wait_for_timeout(100)
        # ---- one tap on a wrong answer: it speaks the number and goes in (no Check)
        wrong = pg.evaluate("()=>__game.Q.opts.find(o => o !== __game.Q.ans)")
        pg.evaluate("()=>{__sayLog.length = 0}")
        pg.click(f'#qbody .opt[data-v="{wrong}"]')
        pg.wait_for_function("()=>__game.QS.tries >= 1", timeout=8000)
        ok(f"{tag} tapped number is spoken", pg.evaluate("(w)=>__sayLog.includes(String(w))", wrong), pg.evaluate("()=>__sayLog.slice(0,3)"))
        ok(f"{tag} a tap sends the answer", pg.evaluate("()=>__game.QS.tries === 1"))
        pg.wait_for_function("()=>__game.QS.board", timeout=8000)
        sizes_and_words(pg, "lesson", tag)
        pg.wait_for_function("()=>!__game.QS.teaching", timeout=60000)
        sizes_and_words(pg, "lesson finished", tag)
        pg.evaluate("()=>{document.querySelector('#boardbtns .bx').click()}"); pg.wait_for_timeout(200)
        # ---- second wrong: kind words, then a picture "see the answer" and it is spoken what to tap
        pg.evaluate("()=>{__sayLog.length = 0}")
        pg.click(f'#qbody .opt[data-v="{wrong}"]')
        pg.wait_for_function("()=>__game.QS.phase === 'final'", timeout=8000)
        pg.wait_for_function("()=>__sayLog.length >= 3", timeout=8000)
        sizes_and_words(pg, "final", tag)
        log = pg.evaluate("()=>__sayLog.slice()")
        ok(f"{tag} final: kind words spoken", "Not yet. Let's see the answer." in log, log)
        ok(f"{tag} final: told to tap the eye", "Tap the eye to see the answer." in log, log)
        pg.evaluate("()=>{__sayLog.length = 0}")
        pg.click("#tile"); pg.wait_for_function("()=>__game.QS.phase === 'shown'", timeout=8000)
        pg.wait_for_function("()=>__sayLog.length >= 2", timeout=20000)
        sizes_and_words(pg, "shown", tag)
        ok(f"{tag} shown: told to tap the arrow", "Tap the arrow to go on." in pg.evaluate("()=>__sayLog.slice()"))
        pg.click("#tile")
        # ---- a right answer: spoken number, picture buttons, arrow prompt
        settle(pg)
        pg.evaluate("()=>{__sayLog.length = 0}")
        right = pg.evaluate("()=>__game.Q.ans")
        pg.click(f'#qbody .opt[data-v="{right}"]')
        pg.wait_for_function("()=>__game.QS.phase === 'right'", timeout=8000)
        pg.wait_for_function("()=>__sayLog.includes('Tap the arrow to go on.')", timeout=8000)
        log = pg.evaluate("()=>__sayLog.slice()")
        ok(f"{tag} right: number spoken before Correct", str(right) in log and log.index(str(right)) < log.index(next(x for x in log if x.startswith("Correct"))), log)
        ok(f"{tag} right: told to tap the arrow", "Tap the arrow to go on." in log, log)
        pg.wait_for_timeout(300)
        sizes_and_words(pg, "right", tag)
        pg.click("#tile"); settle(pg)
        # ---- a typed question: each digit spoken, the picture tick, the answer goes in by itself when it is all in
        pg.evaluate("()=>__game.ask('sums.5', 47, 38, '+')"); pg.wait_for_timeout(400)
        sizes_and_words(pg, "typed question", tag, tight_typed=(vw <= 640))
        ok(f"{tag} typed: picture tick button shows", pg.evaluate("()=>document.getElementById('tile').getBoundingClientRect().width > 0 && !document.getElementById('tile').innerText.trim()"))
        pg.evaluate("()=>{__sayLog.length = 0}")
        pg.click('#pad button[data-k="8"]'); pg.wait_for_timeout(300)
        ok(f"{tag} typed: digit spoken, not yet sent", pg.evaluate("()=>__sayLog[0] === '8' && __game.QS.phase === 'ask'"))
        pg.click('#pad button[data-k="5"]')
        pg.wait_for_function("()=>__game.QS.phase === 'right'", timeout=8000)
        pg.click("#tile"); settle(pg)
        # ---- home: one tap does not end the session; a picture question does
        pg.evaluate("()=>{__sayLog.length = 0}")
        pg.click("#tools .bin.home"); pg.wait_for_selector(".kidconfirm")
        ok(f"{tag} home: one tap only asks", pg.evaluate("()=>!!__game.QS && !document.querySelector('.over.start')"))
        ok(f"{tag} home: asked out loud", "Do you want to stop? Tap the tick to stop, or the cross to keep playing." in pg.evaluate("()=>__sayLog.slice()"))
        for b in pg.evaluate("()=>[...document.querySelectorAll('.kidconfirm button')].map(b=>({t:b.innerText.trim(), w:b.getBoundingClientRect().width, h:b.getBoundingClientRect().height}))"):
            ok(f"{tag} home card button has no words and is big", b["t"] == "" and b["w"] >= 64 and b["h"] >= 64, b)
        pg.click('.kidconfirm .go[data-v="no"]'); pg.wait_for_timeout(200)
        ok(f"{tag} home: the cross keeps playing", pg.evaluate("()=>!!__game.QS && !document.querySelector('.over')"))
        pg.click("#tools .bin.home"); pg.wait_for_selector(".kidconfirm"); pg.click('.kidconfirm .go[data-v="yes"]'); pg.wait_for_selector(".over.start")
        # ---- Marie is unchanged: tap, then Check; labels; hop row; 6 pencils
        pg.click('.over .go[data-theme="cafe"]'); pg.wait_for_timeout(500); settle(pg)
        if pg.evaluate("()=>__game.Q.kind") == "choice":
            v = pg.evaluate("()=>__game.Q.ans"); pg.click(f'#qbody .opt[data-v="{v}"]'); pg.wait_for_timeout(300)
            ok(f"{tag} Marie: a tap only marks, Check sends", pg.evaluate("()=>__game.QS.phase === 'ask' && __game.QS.pick !== null"))
        ok(f"{tag} Marie keeps Back / Forward / Restart", pg.evaluate("()=>document.querySelectorAll('.hoprow button[data-h]').length === 3"))
        ok(f"{tag} Marie keeps 6 pencils", pg.evaluate("()=>document.querySelectorAll('#tools .pencil').length === 6"))
        ok(f"{tag} Marie: the Check button says Check", pg.evaluate("()=>document.getElementById('tile').innerText.trim() === 'Check'"))
        ok(f"{tag} no page errors", not errs, errs)
        pg.close()
    br.close()
print(f"RESULT {sum(res)}/{len(res)} passed")
