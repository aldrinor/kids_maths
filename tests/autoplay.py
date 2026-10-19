"""Shared test helper: one step of a pretend child who always answers right."""
STUB = "window.speechSynthesis={speak(){},cancel(){},getVoices(){return[]},pause(){},resume(){}};window.SpeechSynthesisUtterance=function(){};window.AudioContext=window.webkitAudioContext=undefined;window.__cookAutoPlay=true;"
STEP = """() => {
  if (!Mission.on) return "off";
  const cov = document.getElementById("cover");
  if (!cov.hidden && document.getElementById("winNext")) { document.getElementById("winNext").click(); return "win"; }
  if (!cov.hidden && document.getElementById("cafeGo")) { document.getElementById("cafeGo").click(); return "cafe"; }
  if (!cov.hidden && document.getElementById("knDefDone")) { document.getElementById("knDefDone").click(); return "defended"; }
  if (!cov.hidden && cov.querySelector(".kn-keys, .kd-keys")) { for (const ch of String(KnightWorld._q.ans)) cov.querySelector(`[data-k="${ch}"]`).click(); cov.querySelector('[data-k="go"]').click(); return "ladder"; }
  if (!cov.hidden && document.getElementById("pqIn")) return "parentq";
  if (window.River && River.isOpen()) { const s = River.state(); if (!s || s.busy || s.phase === "done") return "wait";
    const L = document.getElementById("riverPlay");
    if (s.phase === "hop") { L.querySelector(".rv-hops button.next").click(); return "wait"; }
    L.querySelector(`[data-pick="${s.ans}"]`).click(); return "river"; }
  if (window.CafeOrders && CafeOrders.isOpen()) { const s = CafeOrders.state(); if (!s || s.phase === "done") return "wait";
    const L = document.getElementById("cafePlay");
    if (s.phase === "bake") { L.querySelector("[data-bake]").click(); return "wait"; }
    if (s.phase === "give") { const g = [...L.querySelectorAll(".co-cell.give")].pop(); if (g) g.dispatchEvent(new MouseEvent("click", { bubbles: true })); return "wait"; }
    L.querySelector(`[data-pick="${s.ans}"]`).click(); return "river"; }
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
COL = "()=>{ if (!col || !Q) return; const a=Q.a,b=Q.b; const d=(n,i)=>Math.floor(n/10**i)%10; let c=0; for(let i=0;col && i<col.n;i++){ const s=d(a,i)+d(b,i)+c; col.typed=String(s); colCheck(); if(s>=10){ blocks.filter(x=>x.size===10**i&&!x.gone).slice(0,10).forEach(x=>tapBlock(x.id)); } c=s>=10?1:0; } }"

def play(pg, n):
    """Answer n questions the engine picks. Returns how many were answered."""
    done = 0
    for _ in range(n * 12):
        r = pg.evaluate(STEP)
        if r == "col": pg.evaluate(COL)
        if r.startswith(("topic", "sums", "col", "river")): done += 1
        pg.wait_for_timeout(1700 if r.startswith(("topic", "sums", "col", "river")) else 400)
        if done >= n or r == "off": break
    return done
