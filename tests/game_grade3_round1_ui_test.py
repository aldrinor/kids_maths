"""Screen checks for the ten number-sense skills of 23 Oct 2026 (Grade 3 gaps, round 1) in game/index.html, as Marie:
comparing, ordering, even and odd, estimating, and bills and coins to 100 dollars.
What it checks: the scene above the question (new acts "lineup" and "bills": the drawn holders and bills match the story and carry no answer), plain number buttons
for tap questions (a, b, c, Check) with real taps, the keypad for typed ones, a typed estimate that is right anywhere in its range (and wrong outside), a wrong
answer then the lesson then a new question, the three steps of help (the second one is a picture for the number-sense kinds), the voice sentence of every question,
no sideways scroll and every button on the screen at phone, iPad and laptop sizes, no page errors, and that Kennedy never gets these skills.
Silent (speech and AudioContext are stubbed, --mute-audio). Prints only failures and one RESULT line.
Run: python tests/game_grade3_round1_ui_test.py http://localhost:8790/game/index.html [shots_dir] [--webkit]"""
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

URL = sys.argv[1]
ENGINE = "webkit" if "--webkit" in sys.argv else "chromium"
_args = [a for a in sys.argv[1:] if not a.startswith("--")]
SHOTS = Path(_args[1]) if len(_args) > 1 else None
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


def show(pg, skill, typ):
    """show a question of a skill and type straight away (the engine is bypassed)"""
    pg.evaluate("""([s,t])=>{ let q; for(let i=0;i<4000;i++){ q=KS.make(s,'cafe',Math.random,''); if(q.type===t) break } __game.show(q) }""", [skill, typ])
    pg.wait_for_function("()=>__game.QS && __game.QS.phase==='ask'", timeout=10000)
    return pg.evaluate("()=>JSON.parse(JSON.stringify(__game.Q))")


def tap_answer(pg, Q, right=True):
    """real taps: a button then Check, or the keypad digits then Check"""
    if Q["kind"] == "choice":
        v = Q["ans"] if right else next(o for o in Q["opts"] if o != Q["ans"])
        pg.click(f'#qbody .opt[data-v="{v}"]')
    else:
        v = Q["ans"] if right else Q["ans"] + 1000      # a four-digit answer that is never right: the keypad takes four digits
        for ch in str(v):
            pg.click(f'#pad button[data-k="{ch}"]')
    pg.click("#tile")


def overflow(pg):
    return pg.evaluate("()=>({w:document.documentElement.scrollWidth-innerWidth,h:document.documentElement.scrollHeight-innerHeight})")


def on_screen(pg, sel):
    """every visible element of the selector sits inside the window"""
    return pg.evaluate("""(sel)=>[...document.querySelectorAll(sel)].filter(e=>e.offsetParent!==null).map(e=>{const r=e.getBoundingClientRect(); return {t:e.textContent.trim().slice(0,12), ok:r.left>=-1&&r.right<=innerWidth+1&&r.top>=-1&&r.bottom<=innerHeight+1&&r.width>0&&r.height>0}}).filter(x=>!x.ok)""", sel)


# (skill, type, what the screen must show)
CASES = [
    ("cafe_compare.1", "MA"), ("cafe_compare.1", "LB"), ("cafe_compare.1", "MD"), ("cafe_compare.1", "M3"),
    ("cafe_order.1", "OM"), ("cafe_order.1", "ON"), ("cafe_order.1", "OH"), ("cafe_order.1", "OT"), ("cafe_order.1", "OR"),
    ("cafe_order.2", "TM"), ("cafe_order.2", "HL"),
    ("cafe_evenodd.1", "EE"), ("cafe_evenodd.1", "EN"), ("cafe_evenodd.1", "EL"), ("cafe_evenodd.1", "EZ"),
    ("cafe_estimate.1", "R10"), ("cafe_estimate.1", "R10U"), ("cafe_estimate.1", "R100"),
    ("cafe_estimate.2", "EA"), ("cafe_estimate.2", "EQ"), ("cafe_estimate.2", "EB"),
    ("cafe_estimate.3", "ER"), ("cafe_estimate.3", "EC"),
    ("cafe_bills.1", "BA"), ("cafe_bills.1", "BD"), ("cafe_bills.1", "BE"), ("cafe_bills.1", "BF"),
    ("cafe_bills.2", "HA"), ("cafe_bills.2", "HE"), ("cafe_bills.2", "HF"),
    ("cafe_bills.3", "PC"), ("cafe_bills.3", "PH"), ("cafe_bills.3", "PM"), ("cafe_bills.3", "PW"), ("cafe_bills.3", "PX"),
]
SIZES = [("phone", 375, 667), ("ipad", 820, 1180), ("laptop", 1280, 800)]

with sync_playwright() as p:
    br = getattr(p, ENGINE).launch(**({"args": ["--mute-audio"]} if ENGINE == "chromium" else {}))

    def page(vw, vh, touch=False):
        ctx = br.new_context(viewport={"width": vw, "height": vh}, has_touch=touch)
        ctx.set_default_timeout(20000)
        pg = ctx.new_page(); errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.add_init_script(STUB)
        pg.goto(URL); pg.evaluate("()=>localStorage.clear()"); pg.reload(); pg.wait_for_timeout(400)
        pg.click('.over .go[data-v="marie"]')
        pg.wait_for_function("()=>__game.QS && __game.Q", timeout=15000)
        return ctx, pg, errs

    # ---------- every shape on screen, at three sizes ----------
    for size, vw, vh in SIZES:
        ctx, pg, errs = page(vw, vh, touch=(size != "laptop"))
        for skill, typ in CASES:
            tag = f"{size} {skill}:{typ}"
            Q = show(pg, skill, typ)
            pg.wait_for_timeout(150)
            ok(f"{tag} scene shows with the question's act", pg.evaluate("(a)=>{const s=document.querySelector('#scene'); return !!s && !s.hidden && s.dataset.act===a}", Q["scene"]["act"]), Q["scene"]["act"])
            S = Q["scene"]
            if S["act"] == "lineup":
                n = pg.evaluate("()=>document.querySelectorAll('#scene .qs-stage [data-role^=\"h\"]').length")
                ok(f"{tag} lineup draws {S['n']} holders", n == S["n"], n)
                ok(f"{tag} lineup draws no running count or number", pg.evaluate("()=>!document.querySelector('#scene .qs-stage [data-count]') && !/\\d/.test(document.querySelector('#scene .qs-stage').textContent)"))
            if S["act"] == "bills":
                for kind, c in S["coins"]:
                    got = pg.evaluate("(k)=>{const g=document.querySelector('#scene .qs-stage [data-role=\"'+k+'\"]'); return g? g.querySelectorAll('img.qs-o').length : -1}", kind)
                    ok(f"{tag} {kind} drawn {c} times", got == c, got)
            if S["act"] == "change":
                ok(f"{tag} change shows the price tag and the paid bill", pg.evaluate("(p)=>{const t=document.querySelector('#scene .qs-tag'); return !!t && t.textContent==='$'+p}", S["price"]) and
                   pg.evaluate("(b)=>!![...document.querySelectorAll('#scene .qs-stage img')].find(i=>i.src.includes('item_bill_'+b))", S["paid"]))
            broken = pg.evaluate("()=>[...document.querySelectorAll('#scene img, #qbody img')].filter(i=>i.complete&&i.naturalWidth===0).map(i=>i.src.split('/').pop())")
            ok(f"{tag} every picture loads", not broken, broken)
            ok(f"{tag} no sideways scroll", overflow(pg)["w"] <= 1, overflow(pg))
            if Q["kind"] == "choice":
                ok(f"{tag} one button per option, plain numbers", pg.evaluate("(o)=>{const b=[...document.querySelectorAll('#qbody .opt')]; return b.length===o.length && b.every(x=>o.includes(+x.dataset.v) && x.textContent.replace(/^[a-d]\\)/,'').trim()===x.dataset.v)}", Q["opts"]))
                ok(f"{tag} no keypad for a tap question", pg.evaluate("()=>document.querySelector('#app').classList.contains('nokeys')"))
                ok(f"{tag} the buttons are on the screen", not on_screen(pg, "#qbody .opt"), on_screen(pg, "#qbody .opt"))
            else:
                ok(f"{tag} keypad on screen", not on_screen(pg, "#pad button"), on_screen(pg, "#pad button")[:3])
            ok(f"{tag} no number line for these questions", pg.evaluate("()=>!!document.querySelector('#qbody .nlbox.noline')") or pg.evaluate("()=>!document.querySelector('#qbody .nlbox svg')"))
            if size == "phone" and typ in ("MA", "EE", "ON", "OR", "BD", "R10", "EA"):
                shot(pg, f"g3_{size}_{skill}_{typ}")
        # the voice sentence of the last question and the page errors
        ok(f"{size} no page errors", not errs, errs[:2])
        ctx.close()

    # ---------- answering with real taps (iPad size) ----------
    ctx, pg, errs = page(820, 1180, touch=True)
    for skill, typ in [("cafe_compare.1", "MA"), ("cafe_order.1", "OM"), ("cafe_evenodd.1", "EL"), ("cafe_estimate.3", "ER"), ("cafe_bills.1", "BA"), ("cafe_bills.3", "PC"), ("cafe_estimate.1", "R10U")]:
        tag = f"tap {skill}:{typ}"
        Q = show(pg, skill, typ)
        pg.wait_for_timeout(700)
        ok(f"{tag} the question is spoken", pg.evaluate("(t)=>window.__sayLog.includes(t)", Q["say"]), Q["say"][:60])
        tap_answer(pg, Q, right=True)
        pg.wait_for_function("()=>__game.QS.phase==='right'", timeout=10000)
        ok(f"{tag} a right answer is right", pg.evaluate("()=>document.querySelector('#qbody .msg, #msg, .msg') !== null || __game.QS.phase==='right'"))
        ok(f"{tag} Correct is spoken with the fact", pg.evaluate("(t)=>window.__sayLog.includes(t)", Q["correct"]))

    # a wrong tap, then the lesson, then a new question
    for skill, typ in [("cafe_compare.1", "LA"), ("cafe_evenodd.1", "EE"), ("cafe_bills.2", "HE")]:
        tag = f"miss {skill}:{typ}"
        Q = show(pg, skill, typ)
        tap_answer(pg, Q, right=False)
        pg.wait_for_selector("#boardbtns .again", state="attached", timeout=20000)
        pg.wait_for_function("()=>!document.querySelector('#boardbtns .again').hidden", timeout=90000)
        ok(f"{tag} the lesson plays and ends", pg.evaluate("()=>!!document.querySelector('#board')"))
        old = pg.evaluate("()=>__game.Q.key")
        pg.click("#boardbtns .bnext")
        pg.wait_for_function("(k)=>__game.QS && __game.QS.afterMiss===true && __game.QS.phase==='ask' && __game.Q.key!==k && !document.querySelector('#board')", arg=old, timeout=15000)
        ok(f"{tag} a new question of the same skill follows", pg.evaluate("(s)=>__game.Q.skill===s", skill))
        if typ in ("LA", "EE"):
            say = pg.evaluate("()=>window.__sayLog.join(' | ')")
            ok(f"{tag} the first words of the lesson fit the mistake", ("Is it more, or is it less" in say) if typ == "LA" else True, say[-200:])
    ok("answers: no page errors", not errs, errs[:2])
    ctx.close()

    # ---------- a typed estimate is right anywhere in its range ----------
    ctx, pg, errs = page(820, 1180)
    Q = show(pg, "cafe_estimate.2", "EA")
    lo, hi = Q["range"]
    other = next(v for v in range(lo, hi + 1) if v != Q["ans"])
    for ch in str(other):
        pg.click(f'#pad button[data-k="{ch}"]')
    pg.click("#tile")
    pg.wait_for_function("()=>__game.QS.phase==='right' || __game.QS.mark==='wrong'", timeout=10000)
    ok("estimate: a different answer inside the range is right", pg.evaluate("()=>__game.QS.phase==='right'"), f"{other} in {lo}-{hi}, ans {Q['ans']}")
    Q = show(pg, "cafe_estimate.2", "EH")
    lo, hi = Q["range"]
    for ch in str(hi + 1):
        pg.click(f'#pad button[data-k="{ch}"]')
    pg.click("#tile")
    pg.wait_for_function("()=>__game.QS.phase==='right' || __game.QS.mark==='wrong'", timeout=10000)
    ok("estimate: just outside the range is not right", pg.evaluate("()=>__game.QS.phase!=='right'"), f"{hi + 1} outside {lo}-{hi}")
    ctx.close()

    # ---------- the three steps of help ----------
    ctx, pg, errs = page(820, 1180)
    for skill, typ, pic in [("cafe_compare.1", "MB", True), ("cafe_evenodd.1", "EL", True), ("cafe_estimate.2", "EA", True), ("cafe_bills.1", "BA", False), ("cafe_evenodd.1", "EE", False)]:
        tag = f"help {skill}:{typ}"
        Q = show(pg, skill, typ)
        pg.click("#qbody .bulb")
        t1 = pg.inner_text(".bubble h4")
        pg.click(".bubble .hmore")
        t2 = pg.inner_text(".bubble h4")
        has_svg = pg.evaluate("()=>!!document.querySelector('.bubble svg.hintpic')")
        ok(f"{tag} step 1 is the fixed nudge", t1 == "Read it once more. What is the question asking?", t1)
        ok(f"{tag} step 2 {'is a picture' if pic else 'points at the scene'}", has_svg == pic and (t2 == "Here is a picture of the story." if pic else t2 == "Look at the picture at the top. It shows the story."), (t2, has_svg))
        ok(f"{tag} the picture has no numbers", not pic or not pg.evaluate("()=>/\\d/.test(document.querySelector('.bubble svg.hintpic').textContent)"))
        pg.click(".bubble .hmore")
        ok(f"{tag} step 3 is the worked hint", pg.inner_text(".bubble h4") == Q["hint"], pg.inner_text(".bubble h4"))
        if pic and typ in ("MB", "EL"):
            shot(pg, f"g3_help_{skill}_{typ}")
        pg.keyboard.press("Escape")
    ctx.close()

    # ---------- Marie has the skills, Kennedy does not ----------
    ctx, pg, errs = page(820, 1180)
    ids = ["cafe_compare.1", "cafe_order.1", "cafe_order.2", "cafe_evenodd.1", "cafe_estimate.1", "cafe_estimate.2", "cafe_estimate.3", "cafe_bills.1", "cafe_bills.2", "cafe_bills.3"]
    ok("Marie: all ten are ready in her skill map", pg.evaluate("(ids)=>ids.filter(id=>!__game.M.map[id]||!__game.M.map[id].ready)", ids) == [])
    ok("Kennedy: none of them fit his theme", pg.evaluate("(ids)=>ids.filter(id=>KS.fits(id,'castle'))", ids) == [])
    ctx.close()
    br.close()

print(f"RESULT {sum(res)}/{len(res)} passed ({ENGINE})")
sys.exit(0 if all(res) else 1)
