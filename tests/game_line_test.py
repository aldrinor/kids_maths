"""Number line check for game/index.html: the ones ruler for 2- and 3-digit sums.
Checks: 11 marks in ones with the tens bold, the default hop size (+1 weak, +10 strong), a +10 hop lands right
and walks ten steps, Forward and Back follow the chosen size, a star pops on a tens mark, skip-count and small
lines are unchanged, lessons use the same ruler, no overflow at 390x844, 820x1180 and 1280x720, no page errors.
Silent. Prints only failures and one RESULT line.
Run: python tests/game_line_test.py http://localhost:8801/game/index.html [chromium|webkit] [shots_dir]"""
import os
import sys
from playwright.sync_api import sync_playwright

URL = sys.argv[1]
ENGINE = sys.argv[2] if len(sys.argv) > 2 else "chromium"
SHOTS = sys.argv[3] if len(sys.argv) > 3 else ""
STUB = ("window.__demoFast=true;window.__noVoice=true;window.__noRewards=true;window.__noWorld=true;"
        "window.speechSynthesis={speak(){},cancel(){},getVoices(){return[]}};"
        "window.SpeechSynthesisUtterance=function(){};window.AudioContext=window.webkitAudioContext=undefined;")
SIZES = [(390, 844), (820, 1180), (1280, 720)]
res = []
sys.stdout.reconfigure(encoding="utf-8", errors="replace")


def ok(name, cond, info=""):
    res.append(bool(cond))
    if not cond:
        print(f"FAIL {name} {info}")


def level(pg, skill, strong):
    pg.evaluate("""([s, strong]) => { const st = __game.P.engine;
      if (strong) st.skills[s] = Object.assign(st.skills[s] || {}, { lvl: 3, recent: [1, 1], streak: 0, n: 2, right: 2 });
      else delete st.skills[s]; }""", [skill, strong])


def ask(pg, skill, a, b, op):
    pg.evaluate("([s,a,b,o])=>__game.ask(s,a,b,o)", [skill, a, b, op])
    pg.wait_for_timeout(150)


def settle(pg):
    pg.wait_for_function("()=>!__game.QS.walking", timeout=10000)
    pg.wait_for_timeout(120)


def ticks(pg):
    return pg.evaluate("""()=>[...document.querySelectorAll('.nlbox .tick')].map(g=>{const t=g.querySelector('text');
      return {n:+g.dataset.n, ten:g.classList.contains('ten'), txt:t.textContent, fw:+t.getAttribute('font-weight'), fs:+t.getAttribute('font-size')}})""")


def btn(pg, h):
    return pg.inner_text(f'.hoprow button[data-h="{h}"]').replace("\n", " ").replace("◀", "").replace("▶", "").strip()


with sync_playwright() as p:
    br = getattr(p, ENGINE).launch(**({"args": ["--mute-audio"]} if ENGINE == "chromium" else {}))
    ctx = br.new_context(viewport={"width": 820, "height": 1180})
    pg = ctx.new_page(); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.add_init_script(STUB)
    pg.goto(URL); pg.evaluate("()=>localStorage.clear()"); pg.reload(); pg.wait_for_timeout(400)
    pg.click('.over .go[data-v="marie"]'); pg.wait_for_timeout(400)

    # 1 the ones ruler for sums.5 to sums.8: 11 marks, in ones, tens bold
    for skill, a, b, op, lo in [("sums.5", 42, 30, "+", 40), ("sums.6", 23, 14, "+", 20), ("sums.7", 47, 38, "+", 40), ("sums.7", 83, 26, "-", 80), ("sums.8", 345, 232, "+", 340)]:
        level(pg, skill, False); ask(pg, skill, a, b, op)
        t = ticks(pg)
        ok(f"{skill} {a}{op}{b} ruler has 11 marks", len(t) == 11, len(t))
        ok(f"{skill} {a}{op}{b} marks are in ones from {lo}", [x["n"] for x in t] == list(range(lo, lo + 11)), [x["n"] for x in t])
        tens = [x for x in t if x["ten"]]; ones = [x for x in t if not x["ten"] and x["n"] != a]
        ok(f"{skill} tens marks bold and big", len(tens) == 2 and all(x["fw"] == 800 for x in tens) and all(x["fs"] > ones[0]["fs"] for x in tens), tens)
        ok(f"{skill} ones marks show the ones digit only", all(x["txt"] == str(x["n"] % 10) and x["fw"] < 800 for x in ones), ones[:3])
        ok(f"{skill} tens strip with a bracket and a dot", pg.locator(".nlbox .tenbox").count() == 1 and pg.locator(".nlbox .posdot").count() == 1)
        sizes = pg.evaluate("()=>[...document.querySelectorAll('.hopsize button')].map(b=>+b.dataset.z)")
        ok(f"{skill} hop sizes", sizes == ([1, 10, 100] if skill == "sums.8" else [1, 10]), sizes)

    # 2 default hop size: +1 when weak, +10 when strong; the buttons say the size
    level(pg, "sums.7", False); ask(pg, "sums.7", 47, 38, "+")
    ok("weak skill starts on +1", pg.evaluate("()=>__game.QS.hop") == 1 and pg.inner_text(".hopsize button.on").strip().startswith("±1"))
    ok("weak: Forward says +1", btn(pg, 1).replace(" ", "").startswith("Forward+1"), btn(pg, 1))
    pg.evaluate("()=>{__game.P.engine.skills['sums.7']={lvl:3,recent:[1,0],streak:0,n:5,right:4}}"); ask(pg, "sums.7", 47, 38, "+")
    ok("last answer wrong starts on +1", pg.evaluate("()=>__game.QS.hop") == 1)
    level(pg, "sums.7", True); ask(pg, "sums.7", 47, 38, "+")
    ok("strong skill starts on +10", pg.evaluate("()=>__game.QS.hop") == 10 and pg.inner_text(".hopsize button.on").strip().startswith("±10"))
    ok("strong: Forward says +10", btn(pg, 1).replace(" ", "").startswith("Forward+10"), btn(pg, 1))
    ok("strong: Back says -10", btn(pg, -1).replace(" ", "").startswith("Back−10"), btn(pg, -1))

    # 3 a +10 hop walks ten steps and lands on 57; the window slides to 50-60; a star pops on 50
    pg.click('.hoprow button[data-h="1"]')
    pg.wait_for_timeout(60)
    ok("+10 walks (pawn moves step by step)", pg.evaluate("()=>__game.QS.walking"))
    settle(pg)
    q = pg.evaluate("()=>({line:__game.QS.line, trail:__game.QS.trail.slice(), lo:__game.QS.lo, hops:__game.QS.hops.slice()})")
    ok("+10 lands on 57", q["line"] == 57, q)
    ok("+10 shows ten steps", q["trail"] == list(range(48, 58)), q["trail"])
    ok("ruler slid to 50-60", q["lo"] == 50 and [x["n"] for x in ticks(pg)] == list(range(50, 61)), q["lo"])
    ok("ten-step dots drawn under the arc", pg.locator(".nlbox .ghost").count() == 8, pg.locator(".nlbox .ghost").count())
    ok("arc and +10 label kept", pg.locator(".nlbox .hopr").count() >= 1 and pg.text_content(".nlbox .hoplab") == "+10", pg.locator(".nlbox .hoplab").all_text_contents())
    ok("star on the tens mark 50", pg.locator('.nlbox .tenstar[data-n="50"]').count() == 1)
    ok("pawn number shown in full", pg.text_content(".nlbox .tick[data-n='57'] text") == "57")
    ok("pawn is the Mimi picture", pg.evaluate("()=>{const i=document.querySelector('.nlbox .hopper image');return !!i && /mimi_stand\\.png$/.test(i.getAttribute('href'))}"))
    pg.click('.hoprow button[data-h="1"]'); settle(pg)
    ok("second +10 lands on 67, label +20", pg.evaluate("()=>__game.QS.line") == 67 and pg.text_content(".nlbox .hoplab") == "+20")
    pg.click('.hoprow button[data-h="-1"]'); settle(pg)
    ok("Back -10 goes to 57", pg.evaluate("()=>__game.QS.line") == 57)
    # 4 change the size: Forward and Back follow it
    pg.click('.hopsize button[data-z="1"]'); pg.wait_for_timeout(100)
    ok("size +1 chosen and highlighted", pg.evaluate("()=>__game.QS.hop") == 1 and pg.get_attribute(".hopsize button.on", "data-z") == "1")
    ok("Forward now says +1", btn(pg, 1).replace(" ", "").startswith("Forward+1"), btn(pg, 1))
    pg.click('.hoprow button[data-h="1"]'); settle(pg)
    ok("Forward +1 goes to 58", pg.evaluate("()=>__game.QS.line") == 58)
    pg.click('.hoprow button[data-h="-1"]'); settle(pg)
    ok("Back -1 goes to 57", pg.evaluate("()=>__game.QS.line") == 57)
    for _ in range(3):
        pg.click('.hoprow button[data-h="1"]'); settle(pg)
    ok("+1 to 60 pops a star on 60", pg.evaluate("()=>__game.QS.line") == 60 and pg.locator('.nlbox .tenstar[data-n="60"]').count() == 1)
    pg.click('.hoprow button[data-h="0"]'); pg.wait_for_timeout(150)
    ok("Restart goes back to 47 and the 40-50 ruler", pg.evaluate("()=>[__game.QS.line,__game.QS.lo,__game.QS.hops.length]") == [47, 40, 0])
    ok("size is not saved in the profile", "hop" not in pg.evaluate("()=>JSON.stringify(Object.keys(__game.P))"))
    # fast taps never start two walks
    pg.click('.hopsize button[data-z="10"]'); pg.wait_for_timeout(80)
    pg.evaluate("()=>{const f=document.querySelector('.hoprow button[data-h=\"1\"]'); f.click(); f.click(); f.click();}")
    settle(pg)
    ok("fast taps: one +10 hop only", pg.evaluate("()=>__game.QS.line") == 57, pg.evaluate("()=>__game.QS.line"))

    # 5 subtraction and 3 digits
    level(pg, "sums.7", True); ask(pg, "sums.7", 83, 26, "-")
    pg.click('.hoprow button[data-h="-1"]'); settle(pg)
    ok("83 back 10 is 73, ruler 70-80", pg.evaluate("()=>[__game.QS.line,__game.QS.lo]") == [73, 70], pg.evaluate("()=>[__game.QS.line,__game.QS.lo]"))
    ok("80 star on the way back", pg.locator('.nlbox .tenstar[data-n="80"]').count() == 1)
    level(pg, "sums.8", True); ask(pg, "sums.8", 345, 232, "+")
    pg.click('.hopsize button[data-z="100"]'); pg.wait_for_timeout(80)
    pg.click('.hoprow button[data-h="1"]'); settle(pg)
    q = pg.evaluate("()=>({line:__game.QS.line, strail:__game.QS.strail.slice(), lo:__game.QS.lo, slo:__game.QS.slo})")
    ok("+100 lands on 445, walks ten tens", q["line"] == 445 and len(q["strail"]) == 10 and q["lo"] == 440 and q["slo"] == 400, q)

    # 6 lines whose step is a group size, and small lines, stay as they were
    for skill in ["cafe_times.1", "cafe_times.2", "cafe_share.1", "cafe_share.2", "cafe_money.1", "sums.1", "sums.3"]:
        pg.evaluate("(s)=>nextQuestion(KS.make(s,'cafe',Math.random))", skill); pg.wait_for_timeout(120)
        q = pg.evaluate("()=>({ruler:!!__game.QS.ruler, step:__game.QS.step, qstep:__game.Q.line.step, lo:__game.QS.lo, qlo:__game.Q.line.lo})")
        t = ticks(pg)
        ok(f"{skill} line unchanged", not q["ruler"] and q["step"] == q["qstep"] and len(t) == 11 and t[1]["n"] - t[0]["n"] == q["qstep"]
           and pg.locator(".hopsize").count() == 0 and "+" not in btn(pg, 1), (q, btn(pg, 1)))
    for _ in range(30):     # tens and ones, type D: "how many tens" counts hops of 10
        pg.evaluate("()=>nextQuestion(KS.make('cafe_tens.1','cafe',Math.random))")
        if pg.evaluate("()=>__game.Q.type") == "D":
            break
    ok("tens-in-a-number line stays in tens", pg.evaluate("()=>!__game.QS.ruler && __game.QS.step===10"))

    # 7 the lesson uses the same ruler and shows the ten steps
    level(pg, "sums.7", False); ask(pg, "sums.7", 47, 38, "+")
    pg.evaluate("()=>{window.__maxTrail=0; window.__marks=new Set(); window.__iv=setInterval(()=>{const Q=__game.QS; if(!Q) return; window.__maxTrail=Math.max(window.__maxTrail,(Q.trail||[]).length); window.__marks.add(document.querySelectorAll('.nlbox .tick').length)},15)}")
    pg.evaluate("()=>{__game.lesson()}")
    if SHOTS:
        pg.wait_for_function("()=>__game.QS.trail && __game.QS.trail.length===10 && !__game.QS.walking", timeout=60000)
        os.makedirs(SHOTS, exist_ok=True); pg.screenshot(path=os.path.join(SHOTS, "marie_lesson_47_38_820x1180.png"))
    pg.wait_for_function("()=>!__game.QS.teaching && !document.querySelector('#boardbtns .again').hidden", timeout=90000)
    lr = pg.evaluate("()=>{clearInterval(window.__iv); return {maxTrail:window.__maxTrail, marks:[...window.__marks], line:__game.QS.line, ruler:!!__game.QS.ruler, step:__game.QS.step}}")
    ok("lesson keeps the ones ruler", lr["ruler"] and lr["step"] == 1 and lr["marks"] == [11], lr)
    ok("lesson 10-hops show ten steps", lr["maxTrail"] == 10, lr)
    ok("lesson ends on 85", lr["line"] == 85, lr)
    pg.click("#boardbtns .bx"); pg.wait_for_timeout(200)
    # a lesson closed in the middle: the size button and Forward still agree
    level(pg, "sums.7", False); ask(pg, "sums.7", 47, 38, "+")
    pg.evaluate("()=>{__game.lesson()}")
    pg.wait_for_function("()=>__game.QS.lessonHop===10 && __game.QS.walking", timeout=60000)
    pg.evaluate("()=>{document.querySelector('#boardbtns .bx').hidden=false; document.querySelector('#boardbtns .bx').click()}"); pg.wait_for_timeout(300)
    ok("lesson closed early: size button matches Forward", pg.get_attribute(".hopsize button.on", "data-z") == str(pg.evaluate("()=>__game.QS.hop"))
       and btn(pg, 1).replace(" ", "").startswith("Forward+" + str(pg.evaluate("()=>__game.QS.hop"))), (pg.get_attribute(".hopsize button.on", "data-z"), btn(pg, 1)))

    # See The Answer on the ruler: hundreds, tens, ones from 47 to 85
    level(pg, "sums.7", False); ask(pg, "sums.7", 47, 38, "+")
    for i in range(2):
        pg.evaluate("()=>{__game.QS.typed='1'; document.getElementById('tile').click()}")
        if i == 0:                                      # 22 Oct: the first miss brings the lesson, then a NEW question; the second miss ends in See The Answer
            pg.wait_for_selector("#boardbtns .again", state="attached", timeout=20000)
            pg.wait_for_function("()=>!document.querySelector('#boardbtns .again').hidden", timeout=90000)
            pg.click("#boardbtns .bnext")
            pg.wait_for_function("()=>__game.QS.afterMiss===true && !document.querySelector('#board')", timeout=15000)
        else:
            pg.wait_for_function("()=>__game.QS.phase==='final'", timeout=90000)
    pg.wait_for_function("()=>__game.QS.phase==='final' && !document.getElementById('tile').classList.contains('dim')", timeout=10000)
    want = pg.evaluate("()=>[__game.Q.result, Math.floor(__game.Q.result/10)*10]")          # the NEW question after the first miss has its own numbers
    pg.click("#tile")
    pg.wait_for_function("(w)=>__game.QS.line===w && !__game.QS.walking", arg=want[0], timeout=30000)
    ok("See The Answer ends on the answer with its ten-ruler", pg.evaluate("()=>[__game.QS.line,__game.QS.lo]") == want, [pg.evaluate("()=>[__game.QS.line,__game.QS.lo]"), want])

    # 8 castle: the knight picture
    pg.evaluate("()=>{__game.doors()}"); pg.wait_for_timeout(300)
    pg.click('.over .go[data-v="kennedy"]'); pg.wait_for_timeout(400)
    level(pg, "sums.7", True); ask(pg, "sums.7", 47, 38, "+")
    ok("castle pawn is the knight picture", pg.evaluate("()=>{const i=document.querySelector('.nlbox .hopper image');return !!i && /knight_idle\\.png$/.test(i.getAttribute('href'))}"))
    ctx.close()

    # 9 no overflow at three sizes; screenshots for a look by eye
    cases = [("add_47_38", "sums.7", 47, 38, "+"), ("sub_83_26", "sums.7", 83, 26, "-"), ("add_345_232", "sums.8", 345, 232, "+")]
    for who in ["marie", "kennedy"]:
        for w, h in SIZES:
            ctx = br.new_context(viewport={"width": w, "height": h}, device_scale_factor=1)
            pg = ctx.new_page(); pg.on("pageerror", lambda e: errs.append(str(e))); pg.add_init_script(STUB)
            pg.goto(URL); pg.evaluate("()=>localStorage.clear()"); pg.reload(); pg.wait_for_timeout(400)
            pg.click(f'.over .go[data-v="{who}"]'); pg.wait_for_timeout(400)
            for name, skill, a, b, op in cases:
                level(pg, skill, name != "sub_83_26"); ask(pg, skill, a, b, op)
                if name != "sub_83_26":
                    pg.click('.hoprow button[data-h="1"]'); settle(pg)
                else:
                    pg.click('.hoprow button[data-h="-1"]'); settle(pg)
                    pg.click('.hoprow button[data-h="-1"]'); settle(pg)
                pg.wait_for_timeout(500)
                m = pg.evaluate("""()=>{const W=innerWidth,H=innerHeight,r=e=>e.getBoundingClientRect(), out=[];
                  if (document.scrollingElement.scrollWidth>W+1) out.push('page scrolls sideways');
                  document.querySelectorAll('.nlbox, .hoprow, .hoprow button, .hopsize button, #tile').forEach(e=>{const b=r(e);
                    if(b.left<-1||b.right>W+1||b.bottom>H+1) out.push((e.className||e.tagName)+' off screen '+Math.round(b.left)+','+Math.round(b.right)+','+Math.round(b.bottom));
                    if(e.matches('.hoprow button')&&(e.scrollWidth>e.clientWidth+1||e.scrollHeight>e.clientHeight+2)) out.push('text spills out of '+e.innerText.replace(/\\n/g,' '))});
                  const keys=document.getElementById('keys'), hr=r(document.querySelector('.hoprow')), nb=r(document.querySelector('.nlbox')), box=r(document.getElementById('ansBox'));
                  if(keys&&getComputedStyle(keys).display!=='none'&&hr.bottom>r(keys).top+1) out.push('hop row hidden under the keypad '+Math.round(hr.bottom)+'>'+Math.round(r(keys).top));
                  if(nb.top<box.bottom-1) out.push('number line covers the answer box');
                  if(hr.top<nb.bottom-1) out.push('hop row covers the number line');
                  const hb=[...document.querySelectorAll('.hoprow > *')].map(e=>Math.round(r(e).width)); if(new Set(hb).size>1||hb.length!==4) out.push('hop row not 4 equal buttons '+hb);
                  const ten=document.querySelector('.nlbox .tick.ten text'), one=document.querySelector('.nlbox .tick.one text');
                  const th=ten?r(ten).height:0, oh=one?r(one).height:0; if(th<14) out.push('tens numbers too small '+th); if(oh<10) out.push('ones numbers too small '+oh);
                  const sb=[...document.querySelectorAll('.hopsize button')].map(e=>r(e).width); if(Math.min(...sb)<40) out.push('size buttons too small '+sb);
                  return out}""")
                ok(f"{who} {name} {w}x{h} fits", not m, m)
                if SHOTS:
                    os.makedirs(SHOTS, exist_ok=True)
                    pg.screenshot(path=os.path.join(SHOTS, f"{who}_{name}_{w}x{h}.png"))
            if SHOTS and who == "marie":
                level(pg, "sums.7", False); ask(pg, "sums.7", 47, 38, "+")
                pg.evaluate("()=>{__game.lesson()}")
                pg.wait_for_function("()=>__game.QS.trail && __game.QS.trail.length===10 && __game.QS.line===67", timeout=60000)
                pg.screenshot(path=os.path.join(SHOTS, f"marie_lesson_47_38_{w}x{h}.png"))
                pg.wait_for_function("()=>!__game.QS.teaching", timeout=90000)
            ctx.close()
    br.close()

ok("no page errors", not errs, errs[:3])
print(f"RESULT {sum(res)}/{len(res)} passed ({ENGINE})")
sys.exit(0 if all(res) else 1)
