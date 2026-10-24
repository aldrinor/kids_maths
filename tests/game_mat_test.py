"""Blocks check for 2- and 3-digit sums (game/index.html): a box of 100, a box of 10 and single ones show the number; the number buttons add and
take away whole boxes; ten ones become one box of ten; same-size buttons; nothing cut off at iPad and phone sizes; no page errors.
Silent. Prints only failures and one RESULT line.
Run: python tests/game_mat_test.py http://localhost:8790/game/index.html [chromium|webkit]"""
import sys
from playwright.sync_api import sync_playwright

URL = sys.argv[1]
ENGINE = sys.argv[2] if len(sys.argv) > 2 else "chromium"
STUB = ("window.__demoFast=true;window.__noVoice=true;window.__noRewards=true;window.__noWorld=true;localStorage.clear();"
        "window.speechSynthesis={speak(){},cancel(){},getVoices(){return[]}};window.SpeechSynthesisUtterance=function(){};window.AudioContext=window.webkitAudioContext=undefined;")
res = []


def ok(name, cond, info=""):
    res.append(bool(cond))
    if not cond:
        print(f"FAIL {name} {info}")


def counts(pg):
    return pg.evaluate("()=>[document.querySelectorAll('.mat .mb.mh').length,document.querySelectorAll('.mat .mb.mt').length,document.querySelectorAll('.mat .mb.mo').length,+document.querySelector('.mat .mnum span').textContent]")


def press(pg, sg, z):
    pg.click(f'.hoprow button[data-h="{sg}"][data-z="{z}"]'); pg.wait_for_timeout(120)


with sync_playwright() as p:
    br = getattr(p, ENGINE).launch(**({"args": ["--mute-audio"]} if ENGINE == "chromium" else {}))
    for who, theme in (("marie", "cafe"), ("kennedy", "castle")):
        pg = br.new_page(viewport={"width": 1180, "height": 820}); errs = []
        pg.on("pageerror", lambda e: errs.append(str(e))); pg.add_init_script(STUB)
        pg.goto(URL); pg.wait_for_timeout(500)
        pg.click(f'.over .go[data-v="{who}"]'); pg.wait_for_timeout(400)
        pg.evaluate("()=>__game.ask('sums.7',47,38,'+')"); pg.wait_for_timeout(300)
        ok(f"{who} 47 shows 4 boxes of ten and 7 ones", counts(pg) == [0, 4, 7, 47], counts(pg))
        ok(f"{who} no number line ticks for a two-digit sum", pg.locator(".nlbox .tick").count() == 0)
        press(pg, 1, 10); ok(f"{who} +10 adds one box of ten", counts(pg) == [0, 5, 7, 57], counts(pg))
        press(pg, -1, 10); press(pg, -1, 10); ok(f"{who} -10 twice takes two boxes away", counts(pg) == [0, 3, 7, 37], counts(pg))
        press(pg, 1, 1); press(pg, 1, 1); press(pg, 1, 1)
        ok(f"{who} ten ones become one box of ten (37+3 = 4 tens, 0 ones)", counts(pg) == [0, 4, 0, 40], counts(pg))
        ok(f"{who} the newest box pops in", pg.evaluate("()=>document.querySelectorAll('.mat .mb.mt.pop').length") == 1)
        press(pg, -1, 1); ok(f"{who} -1 from 40 breaks a ten into nine ones... shows 3 tens 9 ones", counts(pg) == [0, 3, 9, 39], counts(pg))
        pg.click('.hoprow button[data-h="0"]'); pg.wait_for_timeout(150)
        ok(f"{who} Restart brings 47 back", counts(pg) == [0, 4, 7, 47], counts(pg))
        sizes = pg.evaluate("()=>[...document.querySelectorAll('.hoprow button:not(.watch), #tile')].filter(e=>e.getBoundingClientRect().width).map(e=>Math.round(e.getBoundingClientRect().width)+'x'+Math.round(e.getBoundingClientRect().height))")
        ok(f"{who} every button in the row is the same size", len(set(sizes)) == 1, sizes)
        # the answer goes in with the keypad and Check, as before
        pg.evaluate("()=>{__game.QS.typed='85'}"); pg.evaluate("()=>document.getElementById('tile').click()"); pg.wait_for_timeout(500)
        ok(f"{who} a right answer is taken", pg.evaluate("()=>['right','final','shown'].includes(__game.QS.phase)"), pg.evaluate("()=>__game.QS.phase"))
        # three digits (Marie has +100 and -100)
        pg.evaluate("()=>__game.ask('sums.9',345,232,'+')"); pg.wait_for_timeout(300)
        ok(f"{who} 345 shows 3 boxes of 100, 4 of 10, 5 ones", counts(pg) == [3, 4, 5, 345], counts(pg))
        if who == "marie":
            press(pg, 1, 100); ok("marie +100 adds one box of a hundred", counts(pg) == [4, 4, 5, 445], counts(pg))
            press(pg, -1, 100); press(pg, -1, 100); ok("marie -100 takes boxes away", counts(pg) == [2, 4, 5, 245], counts(pg))
        # nothing cut off
        for w, h in ((1180, 820), (810, 1080), (390, 844), (360, 740)):
            pg.set_viewport_size({"width": w, "height": h}); pg.evaluate("()=>__game.ask('sums.9',784,300,'+')"); pg.wait_for_timeout(500)
            bad = pg.evaluate("""()=>{const m=document.querySelector('.mat'),b=document.querySelector('.nlbox').getBoundingClientRect(),out=[];
              if(m.scrollWidth>m.clientWidth+1) out.push('mat wider than its box');
              for(const e of m.querySelectorAll('.mb,.mnum span,.mhead')){const r=e.getBoundingClientRect(); if(r.left<b.left-1||r.right>b.right+1||r.bottom>b.bottom+1||r.top<b.top-1) {out.push('cut off: '+e.className+' '+Math.round(r.left)+','+Math.round(r.right)); break}}
              return out}""")
            ok(f"{who} 784 fits at {w}x{h}", not bad, bad)
        ok(f"{who} no page errors", not errs, errs[:2])
        pg.close()
    br.close()
print(f"RESULT {sum(res)}/{len(res)}")
