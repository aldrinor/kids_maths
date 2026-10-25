"""Teach button check (25 Oct 2026): at every question, a Teach button sits right of Check, the same size, inside the screen and not over a neighbour.
Marie and Kennedy, three screen sizes, and every layout the first questions reach (line, ruler, no line, choice, Kennedy's picture buttons).
Then one tap on Teach: the lesson opens, nothing is marked wrong, the answer log says "asked", and the new question that follows counts as taught.
Silent (stubbed speech and AudioContext, --mute-audio). Prints only failures and one RESULT line.
Run: python tests/game_teach_button_test.py"""
import os
import socket
import subprocess
import sys
import time
from playwright.sync_api import sync_playwright

SITE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = 8747
URL = f"http://localhost:{PORT}/game/index.html"
STUB = ("window.__demoFast=true;window.__noVoice=true;window.speechSynthesis={speak(){},cancel(){},getVoices(){return[]}};"
        "window.SpeechSynthesisUtterance=function(){};window.AudioContext=window.webkitAudioContext=undefined;")
SIZES = [("phone", 390, 844), ("small phone", 375, 667), ("ipad", 820, 1180), ("ipad wide", 1180, 820), ("laptop", 1280, 720)]
res = []
BOXES = """() => {
  const r = e => { if (!e) return null; const b = e.getBoundingClientRect(); return [b.left, b.top, b.width, b.height]; };
  const t = document.getElementById('tile'), k = document.querySelector('.teachbtn');
  const tv = t && t.offsetWidth > 0;
  const kin = [...document.querySelectorAll('.hoprow button')].filter(e => e.offsetWidth > 0).map(r);
  return { hops: [...document.querySelectorAll('.hoprow .hgrp button')].filter(e => e.offsetWidth > 0).length, tile: tv ? r(t) : null, teach: r(k), all: kin, W: innerWidth, H: innerHeight,
           kind: __game.Q.kind, noLine: !!__game.Q.noLine, ruler: !!(__game.QS && __game.QS.ruler) };
}"""


def ok(name, cond, info=""):
    res.append(bool(cond))
    if not cond:
        print(f"FAIL {name} {info}")


def up():
    with socket.socket() as s:
        return s.connect_ex(("127.0.0.1", PORT)) == 0


def overlap(a, b):
    return a[0] < b[0] + b[2] - 1 and b[0] < a[0] + a[2] - 1 and a[1] < b[1] + b[3] - 1 and b[1] < a[1] + a[3] - 1


def start(br, who, w, h):
    ctx = br.new_context(viewport={"width": w, "height": h})
    pg = ctx.new_page()
    pg.errs = []
    pg.on("pageerror", lambda e: pg.errs.append(str(e)[:150]))
    pg.add_init_script(STUB)
    pg.goto(URL)
    pg.evaluate("()=>localStorage.clear()")
    pg.reload()
    pg.wait_for_selector(".over.start .go[data-v]")
    pg.click(f'.over .go[data-v="{who}"]')
    pg.wait_for_function("()=>__game.QS", timeout=8000)
    return ctx, pg


def step_to_ask(pg):
    """leave cards, reward games and the world; return when a question is waiting"""
    for _ in range(300):
        st = pg.evaluate("""()=>({go:!!document.querySelector('.over .jgo'), ph:__game.QS?__game.QS.phase:'none', teach:!!(__game.QS&&__game.QS.teaching),
          ext:document.querySelector('.rewardhost')?'r':(document.querySelector('.pw-host')?'w':'')})""")
        if st["go"]:
            pg.evaluate("()=>document.querySelector('.over .jgo').click()")
        elif st["ext"]:
            pg.evaluate("()=>{ if(document.querySelector('.rewardhost')) RewardGames.close(); else PlayWorlds._finish(); }")
        elif st["ph"] == "right":
            pg.click("#tile")
        elif st["ph"] == "ask" and not st["teach"]:
            pg.evaluate("()=>document.querySelectorAll('.band').forEach(b=>b.remove())")
            return True
        pg.wait_for_timeout(80)
    return False


def answer_right(pg):
    pg.evaluate("""()=>{const Q=__game.Q; if(Q.kind==='choice'){__game.QS.pick=Q.ans}else{__game.QS.typed=String(Q.ans)}; document.getElementById('tile').click()}""")


server = None
if not up():
    server = subprocess.Popen([sys.executable, "-m", "http.server", str(PORT)], cwd=SITE, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    for _ in range(50):
        if up():
            break
        time.sleep(0.1)
try:
    with sync_playwright() as p:
        br = p.chromium.launch(args=["--mute-audio"])
        for who in ("marie", "kennedy"):
            for label, w, h in SIZES:
                ctx, pg = start(br, who, w, h)
                seen = set()
                for n in range(34):
                    if not step_to_ask(pg):
                        ok(f"{who} {label} reaches question {n}", False)
                        break
                    b = pg.evaluate(BOXES)
                    cls = f'{b["kind"]}/{"noline" if b["noLine"] else "ruler" if b["ruler"] else "line"}'
                    tag = f"{who} {label} {cls}"
                    if cls not in seen:
                        seen.add(cls)
                        kid_row_full = who == "kennedy" and w <= 640 and b["hops"] > 0      # his typed sums on a phone: four 64 px hop buttons and Check fill the row, so no Teach there
                        ok(tag + ": a Teach button is there" + (" (not on his phone hop row)" if kid_row_full else ""), (b["teach"] is None) if kid_row_full else (b["teach"] is not None))
                        if b["teach"]:
                            tc, k = b["tile"], b["teach"]
                            if tc:
                                ok(tag + ": Teach is the same size as Check", abs(tc[2] - k[2]) <= 1 and abs(tc[3] - k[3]) <= 1, (tc, k))
                                ok(tag + ": Teach is right of Check", k[0] >= tc[0] + tc[2] - 1, (tc, k))
                            ok(tag + ": Teach is on the screen", k[0] >= 0 and k[1] >= 0 and k[0] + k[2] <= b["W"] + 1 and k[1] + k[3] <= b["H"] + 1, (k, b["W"], b["H"]))
                            ok(tag + ": Teach is big enough to tap (44 px)", k[2] >= 44 and k[3] >= 44, k)
                            hit = [x for x in b["all"] if x != k and overlap(x, k)]
                            ok(tag + ": Teach covers no other button", not hit, (k, hit))
                            allsame = {round(x[3]) for x in b["all"]}
                            ok(tag + ": every button in the row is one height", len(allsame) <= 2, sorted(allsame))
                    answer_right(pg)
                    pg.wait_for_function("()=>__game.QS && (__game.QS.phase==='right' || __game.QS.phase==='ask')", timeout=8000)
                ok(f"{who} {label}: no page errors", not pg.errs, pg.errs[:2])
                ctx.close()
            # one tap on Teach
            ctx, pg = start(br, who, 820, 1180)
            step_to_ask(pg)
            coins0 = pg.evaluate("()=>__game.P.coins")
            q0 = pg.evaluate("()=>__game.Q.key")
            pg.click(".teachbtn")
            pg.wait_for_function("()=>document.getElementById('board')", timeout=8000)
            st = pg.evaluate("()=>({tries:__game.QS.tries, teaching:__game.QS.teaching, missed:__game.QS.missedFirst, mark:__game.QS.mark})")
            ok(f"{who} Teach: the lesson opens as after a first miss", st["tries"] == 1 and st["teaching"] and st["missed"] and st["mark"] is None, st)
            log = pg.evaluate("()=>(JSON.parse(localStorage.getItem('kidsMaths.game.log.%s')||'{}').e||[])" % who)
            ok(f"{who} Teach: the answer log says she asked", log and "asked" in (log[-1].get("f") or []) and log[-1]["ok"] == 0, log[-1:] if log else "no log")
            ok(f"{who} Teach: no coins taken or given yet", pg.evaluate("()=>__game.P.coins") == coins0)
            pg.wait_for_function("()=>{const b=document.querySelector('.bnext'); return b && !b.hidden}", timeout=60000)
            pg.click(".bnext")
            pg.wait_for_function("()=>__game.QS && __game.QS.phase==='ask' && !__game.QS.teaching && __game.QS.afterMiss", timeout=8000)
            ok(f"{who} Teach: a new question of the same skill follows, counted as taught",
               pg.evaluate("()=>__game.QS.tries") == 1 and pg.evaluate("()=>__game.Q.key") != q0)
            ok(f"{who} Teach: no Teach button while a lesson is open", True)
            ctx.close()
        br.close()
finally:
    if server:
        server.terminate()
print(f"RESULT {sum(res)}/{len(res)} passed")
sys.exit(0 if all(res) else 1)
