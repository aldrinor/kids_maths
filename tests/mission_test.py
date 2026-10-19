"""Silent check: a child plays a full engine session (placement, sets of 5, rewards). One line per check.
Run: python tests/mission_test.py http://localhost:8766/index.html"""
import sys
from playwright.sync_api import sync_playwright
URL = sys.argv[1]
STUB = "window.speechSynthesis={speak(){},cancel(){},getVoices(){return[]},pause(){},resume(){}};window.SpeechSynthesisUtterance=function(){};window.AudioContext=window.webkitAudioContext=undefined;window.__cookAutoPlay=true;"
res = []
def ok(name, cond, extra=""): res.append(bool(cond)); print(("PASS " if cond else "FAIL ") + name + (" | " + str(extra) if extra != "" and not cond else ""))
STEP = """() => {
  if (!Mission.on) return "off";
  const cov = document.getElementById("cover");
  if (!cov.hidden && document.getElementById("winNext")) { document.getElementById("winNext").click(); return "win"; }
  if (!cov.hidden && document.getElementById("pqIn")) return "parentq";
  if (TopicHost.isOpen()) { const s = TopicHost.state; if (s.phase !== "ask" || !s.Q) return "wait";
    const lay = document.getElementById("topicPlay");
    if (s.Q.input.type === "number") { for (const ch of String(s.Q.answer)) lay.querySelector(`.tp-key[data-k="${ch}"]`).click(); lay.querySelector('.tp-key[data-k="go"]').click(); }
    else { const b = [...lay.querySelectorAll(".tp-choice")].find(x => x.dataset.c === String(s.Q.answer)); if (!b) return "nochoice"; b.click(); }
    return "topic:" + s.topic; }
  if (phase === "cook") return "cook";
  if (phase !== "ask" || !Q) return "wait";
  if (col) { return "col"; }
  typed = String(Q.ans); press("go"); return "sums:" + Mission.sumsLevel;
}"""
with sync_playwright() as p:
    b = p.chromium.launch(args=["--mute-audio"])
    for who in ["marie", "kennedy"]:
        pg = b.new_page(viewport={"width": 1024, "height": 768}); pg.add_init_script(STUB); errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.goto(URL); pg.wait_for_timeout(1200)
        pg.click(f'[data-p="{who}"]'); pg.wait_for_timeout(300)
        ok(f"{who}: kids see no games map tab", pg.is_hidden("#tabMaths"))
        pg.click("#goBtn"); pg.wait_for_timeout(500)
        seen, answered = {}, 0
        for step in range(400):
            r = pg.evaluate(STEP)
            if r == "col":   # column sums: type each column through the game's own checks
                pg.evaluate("()=>{ const a=Q.a,b=Q.b; const d=(n,i)=>Math.floor(n/10**i)%10; let c=0; for(let i=0;i<col.n;i++){ const s=d(a,i)+d(b,i)+c; col.typed=String(s); colCheck(); if(s>=10){ blocks.filter(x=>x.size===10**i&&!x.gone).slice(0,10).forEach(x=>tapBlock(x.id)); } c=s>=10?1:0; } }")
                r = "col"
            if r.startswith(("topic", "sums", "col")): answered += 1; seen[r.split(":")[0]] = seen.get(r.split(":")[0], 0) + 1
            pg.wait_for_timeout(1700 if r.startswith(("topic", "sums", "col")) else 400)
            if answered >= 22 or r == "off": break
        st = pg.evaluate("()=>({place:P.engine.place.done, asked:P.engine.place.asked, known:Object.values(P.engine.skills).filter(s=>s.lvl>=3).length, days:Object.values(P.days||{})[0], coins:P.coins||0, defeated:P.defeated||0, cooks:P.cooks||0})")
        ok(f"{who}: answered 22 questions picked by the engine", answered >= 22, (answered, seen, r))
        ok(f"{who}: used both the sums and the small games", len(seen) >= 2 or who == "kennedy", seen)
        ok(f"{who}: placement progressed", st["asked"] >= 10 or st["place"], st)
        ok(f"{who}: today's log counts answers and time", st["days"] and st["days"]["n"] >= 20 and st["days"]["ms"] > 0, st["days"])
        if who == "kennedy": ok("kennedy: beat bad guys and won coins", st["defeated"] >= 3 and st["coins"] >= 15, st)
        else: ok("marie: had cooking breaks", st["cooks"] >= 3, st)
        ok(f"{who}: no page errors", not errs, errs[:3])
        pg.close()
    b.close()
print(f"RESULT {sum(res)}/{len(res)} passed")
