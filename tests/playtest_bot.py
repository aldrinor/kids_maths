"""Pretend-child bot: plays N questions as one child in a silent headless browser and writes a short text report.
Reads numbers, not pictures. Saves one screenshot per new question type (first sight only).
Run: python tests/playtest_bot.py marie|kennedy [N] [--wrong]   -> work_tmp/playtest/<who>/report.txt + shots"""
import collections
import json
import os
import socket
import subprocess
import sys
import time
from playwright.sync_api import sync_playwright

SITE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_ROOT = os.path.join(os.path.dirname(SITE), "work_tmp", "playtest")
PORT = 8743
URL = f"http://localhost:{PORT}/game/index.html"
WHO = sys.argv[1] if len(sys.argv) > 1 else "marie"
N = int(sys.argv[2]) if len(sys.argv) > 2 and sys.argv[2].isdigit() else 100
WRONG_EVERY = 4 if "--wrong" in sys.argv else 0
STUB = ("window.__demoFast=true;window.__noVoice=true;window.speechSynthesis={speak(){},cancel(){},getVoices(){return[]}};"
        "window.SpeechSynthesisUtterance=function(){};window.AudioContext=window.webkitAudioContext=undefined;")
LAYOUT = """() => {
  const W = innerWidth, H = innerHeight, bad = [];
  const sel = 'button, .opt, .tapitem, [data-k], #tile';
  document.querySelectorAll(sel).forEach(e => { const r = e.getBoundingClientRect(); if (!r.width || !r.height) return;
    const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || cs.display === 'none') return;
    const nm = (e.id || e.className || e.tagName).toString().slice(0, 30);
    if (r.right > W + 2 || r.bottom > H + 2 || r.left < -2 || r.top < -2) bad.push('off-screen:' + nm);
    else if (Math.min(r.width, r.height) < 40) bad.push('small:' + nm); });
  return { bad: bad.slice(0, 6), scroll: document.documentElement.scrollHeight > H + 4 };
}"""
STATE = """() => {
  const g = document.querySelector('.over .jgo'); const gk = document.querySelector('.over.jover .jpanel');
  return { go: !!g, kind: gk ? gk.dataset.kind : '', phase: __game.QS ? __game.QS.phase : 'none', teach: !!(__game.QS && __game.QS.teaching) };
}"""
QINFO = """() => { const Q = __game.Q; return { skill: Q.skill, type: Q.type, theme: Q.theme, kind: Q.kind, eq: Q.eq, story: Q.story,
  ask: Q.ask, ans: Q.ans, opts: Q.opts || null, act: (Q.scene || {}).act, alt: Q.alt, hint: Q.hint }; }"""
ANSWER = """(wr) => { const Q = __game.Q, v = wr ? Q.ans + 1 : Q.ans;
  if (Q.kind === 'choice') { __game.QS.pick = wr ? (Q.opts.find(o => o !== Q.ans)) : Q.ans; } else { __game.QS.typed = String(v); }
  document.getElementById('tile').click(); }"""


def up():
    with socket.socket() as s:
        return s.connect_ex(("127.0.0.1", PORT)) == 0


server = None
if not up():
    server = subprocess.Popen([sys.executable, "-m", "http.server", str(PORT)], cwd=SITE, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    for _ in range(50):
        if up():
            break
        time.sleep(0.1)
out = os.path.join(OUT_ROOT, WHO)
os.makedirs(out, exist_ok=True)
rows, issues, seen_types, cards, errs = [], collections.Counter(), set(), collections.Counter(), []
try:
    with sync_playwright() as p:
        br = p.chromium.launch(args=["--mute-audio"])
        ctx = br.new_context(viewport={"width": 820, "height": 1180})
        pg = ctx.new_page()
        pg.on("pageerror", lambda e: errs.append(str(e)[:120]))
        pg.add_init_script(STUB)
        pg.goto(URL)
        pg.evaluate("()=>localStorage.clear()")
        pg.reload()
        pg.wait_for_selector(".over.start .go[data-v]")
        pg.click(f'.over .go[data-v="{WHO}"]')
        pg.wait_for_function("()=>__game.QS", timeout=8000)
        done, idle = 0, 0
        while done < N and idle < 120:
            st = pg.evaluate(STATE)
            if st["go"]:
                cards[st["kind"]] += 1
                pg.evaluate("()=>{const b=document.querySelector('.over .jgo'); if(b) b.click()}")
                pg.wait_for_timeout(120)
                idle += 1
                continue
            ext = pg.evaluate("()=>document.querySelector('.rewardhost')?'reward':(document.querySelector('.pw-host')?'world':'')")
            if ext:
                cards["in-" + ext] += 1
                if ("x-" + ext) not in seen_types:
                    seen_types.add("x-" + ext)
                    pg.wait_for_timeout(1500)
                    pg.screenshot(path=os.path.join(out, f"{ext}.png"))
                    lay = pg.evaluate(LAYOUT)
                    for bb in lay["bad"]:
                        issues[ext + ":" + bb] += 1
                pg.evaluate("()=>{if(document.querySelector('.rewardhost')) RewardGames.close(); else PlayWorlds._finish();}")
                pg.wait_for_timeout(300)
                idle += 1
                continue
            if st["phase"] == "none":
                pg.wait_for_timeout(150)
                idle += 1
                continue
            if st["phase"] == "right":
                pg.click("#tile")
                pg.wait_for_timeout(60)
                continue
            if st["teach"] and pg.evaluate("()=>{const b=document.querySelector('.bnext:not([hidden])'); if(b&&b.offsetWidth){b.click(); return true} return false}"):
                cards["lesson-after-miss"] += 1
                pg.wait_for_timeout(150)
                continue
            if st["phase"] != "ask" or st["teach"]:
                pg.wait_for_timeout(100)
                idle += 1
                continue
            idle = 0
            q = pg.evaluate(QINFO)
            lay = pg.evaluate(LAYOUT)
            key = f'{q["skill"]}|{q["type"]}|{q["kind"]}|{q["act"]}'
            if key not in seen_types:
                seen_types.add(key)
                pg.screenshot(path=os.path.join(out, f"type_{len(seen_types):02d}.png"))
                q["shot"] = f"type_{len(seen_types):02d}.png"
            for b in lay["bad"]:
                issues[b] += 1
            if lay["scroll"]:
                issues["page-scrolls"] += 1
            q["key"] = key
            rows.append(q)
            wrong = bool(WRONG_EVERY) and (done + 1) % WRONG_EVERY == 0
            pg.evaluate(ANSWER, wrong)
            pg.wait_for_timeout(60)
            done += 1
        if done < N:
            print("STUCK", pg.evaluate("()=>JSON.stringify({ph:__game.QS&&__game.QS.phase,teach:__game.QS&&__game.QS.teaching,over:[...document.querySelectorAll('.over,#cover,.pw-root,.cw-root')].filter(e=>e.offsetWidth).map(e=>e.className+'|'+e.id+'|'+e.innerText.slice(0,60)),btns:[...document.querySelectorAll('button')].filter(e=>e.offsetWidth).map(e=>e.id||e.className).slice(0,12)})"))
            pg.screenshot(path=os.path.join(out, "stuck.png"))
        br.close()
finally:
    if server:
        server.terminate()

eqs = [r["eq"] for r in rows]
rep = [f"PLAYTEST {WHO}: {len(rows)} questions, {len(seen_types)} question types, page errors {len(errs)}"]
rep.append("Cards met: " + (", ".join(f"{k} x{v}" for k, v in cards.items()) or "none"))
sk = collections.Counter(r["skill"] for r in rows)
rep.append("Skills: " + ", ".join(f"{k} x{v}" for k, v in sorted(sk.items())))
rep.append("Themes: " + ", ".join(f"{k} x{v}" for k, v in collections.Counter(r["theme"] for r in rows).items()))
rep.append("Question types (type/kind/act): " + ", ".join(f"{k} x{v}" for k, v in collections.Counter(f'{r["type"]}/{r["kind"]}/{r["act"]}' for r in rows).most_common()))
rep.append("Unique equations: %d of %d" % (len(set(eqs)), len(eqs)))
run = [i for i in range(1, len(eqs)) if eqs[i] == eqs[i - 1]]
rep.append(f"Same question twice in a row: {len(run)} times" + (" at " + str(run[:8]) if run else ""))
dup = [(k, v) for k, v in collections.Counter(eqs).most_common(5) if v > 2]
rep.append("Repeated 3+ times: " + (", ".join(f"{k!r} x{v}" for k, v in dup) or "none"))
stories = collections.Counter(r["story"] for r in rows if r["story"])
rep.append(f"Story sentences: {len(stories)} different in {sum(stories.values())} story questions")
nums = [r["ans"] for r in rows if isinstance(r["ans"], (int, float))]
rep.append(f"Biggest answer {max(nums or [0])}; answers over 100: {len([n for n in nums if n > 100])}")
rep.append(f"Questions with no hint text: {len([r for r in rows if not r.get('hint')])}")
rep.append("Layout flags (count of questions): " + (", ".join(f"{k} x{v}" for k, v in issues.most_common(10)) or "none"))
rep.append("Page errors: " + (" | ".join(errs[:3]) or "none"))
rep.append("Screenshots: " + out)
text = "\n".join(rep)
open(os.path.join(out, "report.txt"), "w", encoding="utf-8").write(text + "\n")
json.dump(rows, open(os.path.join(out, "questions.json"), "w", encoding="utf-8"))
print(text)
