"""Screen checks for the fifteen skills of 23 Oct 2026, round 2 (Grade 3 gaps, round 2) in game/index.html, as Marie:
measurement (units, ruler, jug, comparing, adding), 3D objects, picture graphs, bar graphs, tally marks, chance, and fractions (names, bigger, of a set, on a number line).
What it checks: for every question shape, at phone, iPad and laptop sizes: the scene above the question is a calm lineup with no number, the figure is drawn under the story and fits
the screen, the buttons (words, fractions, solids, small figures) are real buttons with a name for a screen reader, the keypad is on screen for typed questions, no sideways scroll,
no page errors. Then: real taps on a right answer and on a wrong answer (the lesson, then a new question), the new wrong-answer lead sentences, the three steps of help
(the second one is a drawing, with no numerals), the voice sentence of a question, and that Kennedy never gets these skills.
Silent (speech and AudioContext are stubbed, --mute-audio). Prints only failures and one RESULT line.
Run: python tests/game_grade3_round2_ui_test.py http://localhost:8790/game/index.html [shots_dir] [--webkit]"""
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

URL = sys.argv[1]
ENGINE = "webkit" if "--webkit" in sys.argv else "chromium"
_args = [a for a in sys.argv[1:] if not a.startswith("--")]
SHOTS = Path(_args[1]) if len(_args) > 1 else None
STUB = ("window.__demoFast=true;window.__noVoice=true;window.speechSynthesis={speak(){},cancel(){},getVoices(){return[]}};"
        "window.SpeechSynthesisUtterance=function(){};window.AudioContext=window.webkitAudioContext=undefined;window.__sayLog=[];")
IDS = ["cafe_measure.1", "cafe_measure.2", "cafe_measure.3", "cafe_measure.4", "cafe_solid.1", "cafe_solid.2", "cafe_graph.1", "cafe_graph.2", "cafe_graph.3", "cafe_chance.1", "cafe_chance.2",
       "cafe_frac.2", "cafe_frac.3", "cafe_frac.4", "cafe_frac.5"]
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
    pg.evaluate("""([s,t])=>{ let q; for(let i=0;i<4000;i++){ q=KS.make(s,'cafe',Math.random,''); if(q.type===t) break } __game.show(q) }""", [skill, typ])
    pg.wait_for_function("()=>__game.QS && __game.QS.phase==='ask'", timeout=10000)
    return pg.evaluate("()=>JSON.parse(JSON.stringify(__game.Q))")


def tap_answer(pg, Q, right=True):
    if Q["kind"] == "choice":
        v = Q["ans"] if right else next(o for o in Q["opts"] if o != Q["ans"])
        pg.click(f'#qbody .opt[data-v="{v}"]')
    else:
        v = Q["ans"] if right else Q["ans"] + 1000
        for ch in str(v):
            pg.click(f'#pad button[data-k="{ch}"]')
    pg.click("#tile")


def overflow(pg):
    return pg.evaluate("()=>({w:document.documentElement.scrollWidth-innerWidth,h:document.documentElement.scrollHeight-innerHeight})")


def on_screen(pg, sel):
    return pg.evaluate("""(sel)=>[...document.querySelectorAll(sel)].filter(e=>e.offsetParent!==null).map(e=>{const r=e.getBoundingClientRect(); return {t:e.textContent.trim().slice(0,12), ok:r.left>=-1&&r.right<=innerWidth+1&&r.top>=-1&&r.bottom<=innerHeight+1&&r.width>0&&r.height>0}}).filter(x=>!x.ok)""", sel)


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

    ctx, pg, errs = page(820, 1180)
    CASES = [(i, t) for i in IDS for t in pg.evaluate("(i)=>Object.keys(KS.kindBank(i))", i)]
    ctx.close()
    ok("there are at least 60 question shapes", len(CASES) >= 60, len(CASES))

    # ---------- every shape on screen, at three sizes ----------
    for size, vw, vh in SIZES:
        ctx, pg, errs = page(vw, vh, touch=(size != "laptop"))
        for skill, typ in CASES:
            tag = f"{size} {skill}:{typ}"
            Q = show(pg, skill, typ)
            pg.wait_for_timeout(60)
            S = Q["scene"]
            ok(f"{tag} scene is a lineup (or steps aside on a short screen)", pg.evaluate("(a)=>{const s=document.querySelector('#scene'); return !s || s.hidden || s.dataset.act===a}", S["act"]) and S["act"] == "lineup", S["act"])
            ok(f"{tag} the scene prints no number (a holder's tag may carry the story's own numbers)", pg.evaluate("""()=>{const s=document.querySelector('#scene .qs-stage'); if (!s) return true; const c=s.cloneNode(true); c.querySelectorAll('.qs-tag').forEach(e=>e.remove()); return !/\d/.test(c.textContent)}"""))
            if Q.get("figure"):
                ok(f"{tag} the figure is drawn under the story", pg.evaluate("()=>!!document.querySelector('#qbody .figure svg.fig')"))
                ok(f"{tag} the figure fits the screen", not on_screen(pg, "#qbody .figure svg.fig"), on_screen(pg, "#qbody .figure svg.fig"))
                ok(f"{tag} the figure has a name for a screen reader", pg.evaluate("()=>!!document.querySelector('#qbody .figure svg.fig').getAttribute('aria-label')"))
            else:
                ok(f"{tag} no figure when the question has none", pg.evaluate("()=>!document.querySelector('#qbody .figure')"))
            broken = pg.evaluate("()=>[...document.querySelectorAll('#scene img, #qbody img')].filter(i=>i.complete&&i.naturalWidth===0).map(i=>i.src.split('/').pop())")
            ok(f"{tag} every picture loads", not broken, broken)
            ok(f"{tag} no sideways scroll", overflow(pg)["w"] <= 1, overflow(pg))
            if Q["kind"] == "choice":
                words = bool(Q.get("picOpts"))
                n = pg.evaluate("()=>document.querySelectorAll('#qbody .opt').length")
                ok(f"{tag} one button per option", n == len(Q["opts"]), (n, Q["opts"]))
                ok(f"{tag} each button has a name for a screen reader", not words or pg.evaluate("()=>[...document.querySelectorAll('#qbody .opt')].every(b=>b.getAttribute('aria-label')&&b.getAttribute('aria-label').length>0)"))
                ok(f"{tag} each button shows something", not words or pg.evaluate("()=>[...document.querySelectorAll('#qbody .opt')].every(b=>b.querySelector('.wordpic, .frac, svg'))"))
                ok(f"{tag} no keypad for a tap question", pg.evaluate("()=>document.querySelector('#app').classList.contains('nokeys')"))
                ok(f"{tag} the buttons are on the screen", not on_screen(pg, "#qbody .opt"), on_screen(pg, "#qbody .opt"))
                ok(f"{tag} the buttons are not in the way of each other", pg.evaluate("()=>{const r=[...document.querySelectorAll('#qbody .opt')].map(b=>b.getBoundingClientRect()); return r.every((a,i)=>r.every((b,j)=>i>=j||a.right<=b.left+1||b.right<=a.left+1||a.bottom<=b.top+1||b.bottom<=a.top+1))}"))
                ok(f"{tag} no button text is cut off", pg.evaluate("()=>[...document.querySelectorAll('#qbody .opt .wordpic')].every(w=>w.scrollWidth<=w.parentElement.clientWidth+1)"))
            else:
                ok(f"{tag} keypad on screen", not on_screen(pg, "#pad button"), on_screen(pg, "#pad button")[:3])
            ok(f"{tag} the question is not pushed off the top", pg.evaluate("()=>{const s=document.querySelector('#qbody .story'); const r=s.getBoundingClientRect(); return r.top>=-1&&r.bottom<=innerHeight}"))
            if size == "phone" and typ in ("PB", "BC", "RD", "JD", "NP", "NE", "CS", "FM", "NF2", "LP", "UL", "CJ", "K3", "TD"):
                shot(pg, f"g3r2_{size}_{skill}_{typ}")
        ok(f"{size} no page errors", not errs, errs[:2])
        ctx.close()

    # ---------- answering with real taps (iPad size) ----------
    ctx, pg, errs = page(820, 1180, touch=True)
    TAPS = [("cafe_measure.1", "UF"), ("cafe_measure.2", "RL"), ("cafe_measure.3", "ML"), ("cafe_measure.4", "AL"), ("cafe_solid.1", "NP"), ("cafe_solid.2", "FF"), ("cafe_graph.1", "PB"), ("cafe_graph.1", "PM"),
            ("cafe_graph.2", "BC"), ("cafe_graph.3", "TA"), ("cafe_chance.1", "CJ"), ("cafe_chance.2", "FF"), ("cafe_chance.2", "FP"), ("cafe_frac.2", "NE"), ("cafe_frac.3", "CT"), ("cafe_frac.4", "K4"), ("cafe_frac.5", "LP"), ("cafe_frac.5", "LN")]
    for skill, typ in TAPS:
        tag = f"tap {skill}:{typ}"
        Q = show(pg, skill, typ)
        pg.wait_for_timeout(500)
        ok(f"{tag} the question is spoken", pg.evaluate("(t)=>window.__sayLog.includes(t)", Q["say"]), Q["say"][:60])
        tap_answer(pg, Q, right=True)
        pg.wait_for_function("()=>__game.QS.phase==='right'", timeout=10000)
        ok(f"{tag} a right answer is right", pg.evaluate("()=>__game.QS.phase==='right'"))
        ok(f"{tag} Correct is spoken with the fact", pg.evaluate("(t)=>window.__sayLog.includes(t)", Q["correct"]))

    # a wrong tap, then the lesson (no board answer for a word button), then a new question
    for skill, typ in [("cafe_measure.1", "UL"), ("cafe_solid.2", "FE"), ("cafe_graph.1", "PC"), ("cafe_frac.3", "CB"), ("cafe_chance.1", "CS"), ("cafe_frac.4", "K3")]:
        tag = f"miss {skill}:{typ}"
        Q = show(pg, skill, typ)
        pg.evaluate("()=>{window.__sayLog.length=0}")
        # a known mix-up when the question has one, else any wrong answer
        slip = None
        if Q.get("slips"):
            cls, lst = next(iter(Q["slips"].items())); slip = (cls, lst[0])
        if Q["kind"] == "choice":
            v = slip[1] if slip else next(o for o in Q["opts"] if o != Q["ans"])
            pg.click(f'#qbody .opt[data-v="{v}"]')
        else:
            v = slip[1] if slip else Q["ans"] + 1000
            for ch in str(v):
                pg.click(f'#pad button[data-k="{ch}"]')
        pg.click("#tile")
        pg.wait_for_selector("#boardbtns .again", state="attached", timeout=20000)
        pg.wait_for_function("()=>!document.querySelector('#boardbtns .again').hidden", timeout=90000)
        ok(f"{tag} the lesson plays and ends", pg.evaluate("()=>!!document.querySelector('#board')"))
        if slip:
            lead = pg.evaluate("(c)=>MissStudy.leadSentence(c)", slip[0])
            say = pg.evaluate("()=>window.__sayLog.join(' | ')")
            ok(f"{tag} the first words of the lesson fit the mix-up ({slip[0]})", lead in say, (lead, say[:200]))
        old = pg.evaluate("()=>__game.Q.key")
        pg.click("#boardbtns .bnext")
        pg.wait_for_function("(k)=>__game.QS && __game.QS.afterMiss===true && __game.QS.phase==='ask' && __game.Q.key!==k && !document.querySelector('#board')", arg=old, timeout=15000)
        ok(f"{tag} a new question of the same skill follows", pg.evaluate("(s)=>__game.Q.skill===s", skill))
    ok("answers: no page errors", not errs, errs[:2])
    ctx.close()

    # ---------- the three steps of help ----------
    ctx, pg, errs = page(820, 1180)
    for skill, typ, pic in [("cafe_measure.2", "RL", True), ("cafe_measure.2", "JD", True), ("cafe_graph.2", "BA", True), ("cafe_graph.3", "TA", True), ("cafe_frac.4", "U3", True), ("cafe_frac.5", "LK", True),
                            ("cafe_frac.3", "CT", True), ("cafe_measure.1", "UF", False), ("cafe_solid.1", "NP", False)]:
        tag = f"help {skill}:{typ}"
        Q = show(pg, skill, typ)
        pg.click("#qbody .bulb")
        t1 = pg.inner_text(".bubble h4")
        pg.click(".bubble .hmore")
        t2 = pg.inner_text(".bubble h4")
        has_svg = pg.evaluate("()=>!!document.querySelector('.bubble svg.fig, .bubble svg.hintpic')")
        ok(f"{tag} step 1 is the fixed nudge", t1 == "Read it once more. What is the question asking?", t1)
        ok(f"{tag} step 2 {'is a drawing' if pic else 'points at the picture'}", has_svg == pic and (t2 == "Here is a picture of the story." if pic else t2 == "Look at the picture at the top. It shows the story."), (t2, has_svg))
        ok(f"{tag} the drawing has no numerals", not pic or not pg.evaluate("()=>/\\d/.test([...document.querySelectorAll('.bubble svg text')].map(t=>t.textContent).join(' '))"))
        pg.click(".bubble .hmore")
        ok(f"{tag} step 3 is the worked hint", pg.inner_text(".bubble h4") == Q["hint"], pg.inner_text(".bubble h4"))
        if pic and typ in ("RL", "BA", "U3"):
            shot(pg, f"g3r2_help_{skill}_{typ}")
        pg.keyboard.press("Escape")
    ctx.close()

    # ---------- Marie has the skills, Kennedy does not ----------
    ctx, pg, errs = page(820, 1180)
    ok("Marie: all fifteen are ready in her skill map", pg.evaluate("(ids)=>ids.filter(id=>!__game.M.map[id]||!__game.M.map[id].ready)", IDS) == [])
    ok("Kennedy: none of them fit his theme", pg.evaluate("(ids)=>ids.filter(id=>KS.fits(id,'castle'))", IDS) == [])
    ctx.close()
    br.close()

print(f"RESULT {sum(res)}/{len(res)} passed ({ENGINE})")
sys.exit(0 if all(res) else 1)
