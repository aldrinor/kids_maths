/* Topic host: the "Maths" tab of Mimi Number Blocks.
   It shows a map of every Grade 1-3 topic module (window.MathTopics) and plays one topic full screen.
   Teaching rules (the same as the sums screen):
   - The answer is never shown while Marie works. Hints say how, never the answer.
   - 1st mistake: try again. 2nd: a how-to hint from the topic. 3rd: Mimi teaches it step by step and Marie does each step.
   - After the lesson, 2 more misses show the answer faintly, so she never gets stuck.
   Rewards: 2 stars right first time, 1 star otherwise; a cooking break every 5 questions (shared with the sums).
   Each topic moves up a level after LEVEL_UP_NEED of the last 10 right first time, and gently down after 3 lessons in a row.
   Saved in P.topics[id] = { level, stats, teachRun, n, first }, plus P.tq and P.tqFirst (topic questions in all). */
(function () {
  "use strict";

  const STRANDS = [
    { id: "Number", name: "Numbers", c: "#ff6f9f" },
    { id: "Operations", name: "Groups and equal", c: "#a98bff" },
    { id: "Money", name: "Money", c: "#ffb020" },
    { id: "Fractions", name: "Fractions", c: "#23a483" },
    { id: "Patterns", name: "Patterns", c: "#2a8fd6" },
    { id: "Measurement", name: "Time and measuring", c: "#e0306b" },
    { id: "Geometry", name: "Shapes", c: "#7b55e6" },
    { id: "Data and chance", name: "Graphs and chance", c: "#23a483" }
  ];
  const BLANK = /(^|[\s=+,(>−×÷])\?(?=[\s,<)]|$)/;
  const SPEAKER =`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="#d92f68"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="#d92f68" stroke-width="2" stroke-linecap="round"/></svg>`;

  const CSS = `
.tmap { padding: 2px 2px 18px; }
.tmap-hello { display: flex; align-items: center; gap: 10px; margin: 2px 0 10px; }
.tmap-hello svg { width: 52px; height: 52px; flex: none; }
.tmap-hello p { margin: 0; flex: 1; min-width: 0; background: #fff; border: 3px solid var(--ink); border-radius: 20px; box-shadow: 0 4px 0 var(--ink); padding: 6px 12px; font: 700 clamp(16px, 2vw, 20px)/1.2 var(--display); }
.tmap-group { margin: 0 0 14px; }
.tmap-group h2 { display: inline-block; margin: 0 0 8px; padding: 2px 14px; border: 3px solid var(--ink); border-radius: 999px; box-shadow: 0 3px 0 var(--ink);
  background: var(--c); color: #fff; font: 800 18px/1.3 var(--display); -webkit-text-stroke: 1px var(--ink); paint-order: stroke fill; }
.tmap-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; }
.tmap-card { min-width: 0; min-height: 104px; display: grid; grid-template-columns: minmax(0, 1fr); justify-items: center; align-content: center; row-gap: 5px;
  padding: 10px 6px; text-align: center; background: var(--cream); border: 3px solid var(--ink); border-radius: 20px; box-shadow: 0 4px 0 var(--ink); }
.tmap-card:active { transform: translateY(3px); box-shadow: 0 1px 0 var(--ink); }
.tmap-icon { width: 56px; height: 56px; display: grid; place-items: center; }
.tmap-icon svg { width: 56px; height: 56px; }
.tmap-name { font: 800 18px/1.1 var(--display); overflow-wrap: normal; word-break: normal; hyphens: none; }
.tmap-lv { display: flex; flex-wrap: nowrap; justify-content: center; gap: 4px; }
.tmap-lv i { width: 12px; height: 12px; border-radius: 50%; border: 2px solid var(--ink); background: #fff; }
.tmap-lv i.done { background: var(--sun); }
.tmap-lv i.now { background: var(--pink); }
@media (max-width: 360px) { .tmap-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; } .tmap-name { font-size: 16px; } .tmap-lv i { width: 10px; height: 10px; } .tmap-lv { gap: 3px; } }

.tp { position: fixed; inset: 0; z-index: 20; box-sizing: border-box; color: var(--ink);
  background: repeating-linear-gradient(90deg, var(--wall-a) 0 26px, var(--wall-b) 26px 52px);
  padding-left: max(10px, env(safe-area-inset-left, 0px)); padding-right: max(10px, env(safe-area-inset-right, 0px)); }
.tp[hidden] { display: none !important; }
.tp img { pointer-events: auto; }
.tp-app { height: 100%; max-width: 1180px; margin: 0 auto; box-sizing: border-box; padding-block: 8px;
  display: grid; gap: 8px; grid-template-columns: minmax(0, 1fr);
  grid-template-rows: auto auto auto minmax(0, 1fr) auto; grid-template-areas: "top" "talk" "ask" "pic" "pad"; }
.tp-top { grid-area: top; display: flex; align-items: center; gap: 8px; min-width: 0; }
.tp-back { flex: none; width: 50px; min-height: 46px; padding: 0; border: 3px solid var(--ink); border-radius: 18px; box-shadow: 0 4px 0 var(--ink); background: var(--lilac); color: #fff;
  font: 800 22px/1 var(--display); -webkit-text-stroke: 1px var(--ink); paint-order: stroke fill; display: grid; place-items: center; }
.tp-back svg { width: 26px; height: 26px; }
.tp-title { min-height: 46px; flex: 1; min-width: 0; display: flex; align-items: center; gap: 8px; padding: 0 12px 0 6px; border: 3px solid var(--ink); border-radius: 18px;
  box-shadow: 0 4px 0 var(--ink); background: var(--cream); font: 800 18px/1 var(--display); text-align: left; }
.tp-title svg { width: 34px; height: 34px; flex: none; }
.tp-title span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tp-title small { font: 700 14px var(--display); color: var(--soft-ink); }
.tp-dots { display: none; gap: 4px; align-items: center; }
.tp-dots img { width: 28px; height: 28px; opacity: .25; filter: grayscale(1); pointer-events: none; }
.tp-dots img.on { opacity: 1; filter: none; transform: scale(1.12) rotate(-6deg); }
.tp-score { flex: none; min-height: 46px; box-sizing: border-box; display: inline-flex; align-items: center; gap: 4px; padding: 0 12px 0 4px; background: var(--sun); border: 3px solid var(--ink);
  box-shadow: 0 4px 0 var(--ink); border-radius: 999px; font: 800 19px var(--display); font-variant-numeric: tabular-nums; }
.tp-score img { width: 26px; height: 26px; pointer-events: none; }
.tp-score.bump { animation: bump .5s; }
.tp-talk { grid-area: talk; display: flex; align-items: center; gap: 10px; min-width: 0; }
.tp-kitty { width: 48px; height: 48px; flex: none; }
.tp-bubble { position: relative; flex: 1; min-width: 0; margin: 0; background: var(--paper); border: 3px solid var(--ink); border-radius: 20px; padding: 5px 12px;
  font: 700 clamp(15px, 2vw, 19px)/1.2 var(--display); min-height: 2.5em; display: flex; align-items: center; box-sizing: border-box; box-shadow: 0 4px 0 var(--ink); }
.tp-bubble::before { content: ""; position: absolute; left: -12px; top: 50%; margin-top: -9px; border: 9px solid transparent; border-right: 12px solid var(--ink); border-left: 0; }
.tp-bubble.good { background: var(--good-tint); color: #0f6e4a; }
.tp-bubble.warn { background: #fff1e6; color: var(--warn); }
.tp-bubble.teach { background: #fff6d6; }
.tp-speak { width: 48px; height: 48px; flex: none; border-radius: 50%; border: 3px solid var(--ink); box-shadow: 0 3px 0 var(--ink); background: var(--sun); display: grid; place-items: center; padding: 0; }
.tp-speak svg { width: 26px; height: 26px; }
.tp-ask { grid-area: ask; display: flex; align-items: center; justify-content: center; gap: 10px; flex-wrap: wrap; text-align: center; background: var(--cream); border: 3px solid var(--ink);
  border-radius: 22px; box-shadow: 0 5px 0 var(--ink); padding: 6px 12px; font: 800 clamp(20px, 3.2vw, 30px)/1.15 var(--display); min-height: 54px; box-sizing: border-box; min-width: 0; }
.tp-ask .fr-frac { font-size: 1.45em; color: var(--pink-deep); }
.tp-ans { display: inline-grid; place-items: center; min-width: 2.2em; height: 1.45em; padding: 0 .2em; border-radius: 14px; border: 3px dashed var(--pink-deep); background: #fff; font-variant-numeric: tabular-nums; }
.tp-ans.filled { border-style: solid; }
.tp-ans .ghost { opacity: .32; }
.tp-ask.shake { animation: tpShake .4s; }
@keyframes tpShake { 20%, 60% { transform: translateX(-8px); } 40%, 80% { transform: translateX(8px); } }
.tp-pic { grid-area: pic; position: relative; min-height: 0; min-width: 0; border: 3px solid var(--ink); border-radius: 22px; box-shadow: 0 5px 0 var(--ink); overflow: auto; overscroll-behavior: contain;
  background: #fff6f9 repeating-linear-gradient(0deg, transparent 0 22px, rgba(255, 111, 159, .07) 22px 44px), repeating-linear-gradient(90deg, transparent 0 22px, rgba(255, 111, 159, .07) 22px 44px); }
.tp-pad { grid-area: pad; display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 7px; }
.tp-key { min-width: 0; min-height: 48px; border: 3px solid var(--ink); border-radius: 20px 20px 16px 16px; box-shadow: 0 4px 0 var(--ink), inset 0 -6px 0 rgba(0,0,0,.12), inset 0 5px 0 rgba(255,255,255,.45);
  background: var(--c, var(--pink)); color: #fff; font: 800 26px var(--display); -webkit-text-stroke: 2px var(--ink); paint-order: stroke fill; padding: 0; }
.tp-key.del { --c: var(--paper); color: var(--ink); -webkit-text-stroke: 0; font-size: 22px; }
.tp-key.go { --c: var(--mint); }
.tp-choices { grid-area: pad; display: grid; grid-template-columns: repeat(var(--n, 3), minmax(0, 1fr)); gap: 8px; }
.tp-choice { min-width: 0; min-height: 60px; border: 3px solid var(--ink); border-radius: 20px; box-shadow: 0 4px 0 var(--ink); background: var(--paper); color: var(--ink);
  font: 800 22px/1.1 var(--display); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; padding: 4px 8px; overflow: hidden; }
.tp-choice svg, .tp-choice img { max-width: 100%; max-height: 72px; }
.tp-choice .big { font-size: 40px; line-height: .9; color: var(--pink-deep); }
.tp-choice.wrong { background: #f3e9ee; opacity: .55; }
.tp-choice.ghost { box-shadow: 0 0 0 6px rgba(99, 211, 179, .6), 0 4px 0 var(--ink); background: var(--good-tint); }
.tp-key:active:not(:disabled), .tp-choice:active:not(:disabled), .tp-title:active, .tp-back:active, .tp-speak:active { transform: translateY(3px); box-shadow: 0 1px 0 var(--ink); }
.tp .hl { outline: 5px solid var(--sky) !important; outline-offset: 3px; animation: tpHl 1s ease-in-out infinite alternate; }
@keyframes tpHl { to { outline-color: #2a8fd6; } }
.tp-cook { z-index: 8; }
.tp-sheet { position: absolute; inset: 0; z-index: 9; background: rgba(59, 42, 51, .35); display: grid; place-items: center; padding: 12px; }
.tp-sheet[hidden] { display: none !important; }
.tp-sheet-card { width: min(560px, 100%); max-height: 100%; overflow: auto; box-sizing: border-box; background: var(--cream); border: 3px solid var(--ink); border-radius: 26px; box-shadow: 0 6px 0 var(--ink); padding: 12px; }
.tp-sheet-card h2 { margin: 0 0 8px; font: 800 24px var(--display); color: var(--pink-deep); }
.tp-lv { display: grid; gap: 8px; }
.tp-lv button { min-height: 48px; padding: 4px 12px; text-align: left; border: 3px solid var(--ink); border-radius: 16px; box-shadow: 0 3px 0 var(--ink); background: #fff; font: 800 17px/1.2 var(--display); }
.tp-lv button small { display: block; font: 700 13px/1.25 var(--body); color: var(--soft-ink); }
.tp-lv button.on { background: var(--pink); color: #fff; }
.tp-lv button.on small { color: #fff; }
@media (min-width: 600px) { .tp-dots { display: flex; } }
@media (min-width: 700px) and (min-aspect-ratio: 1/1) {
  .tp-app { grid-template-columns: minmax(0, 1.45fr) minmax(300px, 1fr); grid-template-rows: auto auto auto auto minmax(0, 1fr);
    grid-template-areas: "top top" "talk talk" "pic ask" "pic pad" "pic ."; }
  .tp-ask { min-height: 110px; }
  .tp-choice { min-height: 88px; }
  .tp-pad { align-self: start; }
  .tp-choices { align-self: start; grid-template-columns: minmax(0, 1fr); }
  .tp-choices.n4 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (min-width: 700px) and (max-aspect-ratio: 1/1) { .tp-key { min-height: 60px; } .tp-ask { min-height: 72px; } .tp-choice { min-height: 76px; } }
@media (max-height: 600px) and (max-width: 420px) {
  .tp-app { gap: 6px; padding-block: 6px; } .tp-ask { min-height: 44px; font-size: 19px; padding: 3px 8px; } .tp-bubble { font-size: 14px; }
  .tp-kitty, .tp-speak { width: 44px; height: 44px; } .tp-key { min-height: 44px; font-size: 22px; } .tp-title, .tp-back { min-height: 44px; font-size: 16px; } .tp-score { min-height: 44px; }
  .tp-choice { min-height: 52px; } .tp-choice svg, .tp-choice img { max-height: 56px; }
}`;

  let ctx = null, mapEl = null, layer = null, els = {};
  let lastMissAt = 0;
  let topic = null, level = 0, Q = null, prevQ = null, inst = null, tries = 0, afterTries = 0, phase = "idle", typed = "", lastSaid = "";
  let timers = [], hlEl = null, token = 0;
  let fixed = null, askedAt = 0, rushed = false;   // fixed: the engine chose this level; hooks report each answer back

  const $q = s => layer.querySelector(s);
  const P = () => window.P;
  const topics = () => (window.MathTopics || []).filter(t => t && t.id && typeof t.make === "function" && typeof t.mount === "function");
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  function stOf(id) {
    const T = P().topics || (P().topics = {});
    const s = T[id] || (T[id] = { level: 0, stats: [], teachRun: 0, n: 0, first: 0 });
    if (!Array.isArray(s.stats)) s.stats = [];
    return s;
  }
  function clearTimers() { timers.forEach(clearTimeout); timers = []; }
  function injectCss() { if (document.getElementById("tp-css")) return; const st = document.createElement("style"); st.id = "tp-css"; st.textContent = CSS; document.head.appendChild(st); }

  /* ---------------- Map of topics ---------------- */
  function renderMap() {
    if (!mapEl) return;
    const all = topics();
    const groups = STRANDS.map(s => ({ ...s, items: all.filter(t => t.strand === s.id) }));
    const known = new Set(STRANDS.map(s => s.id));
    all.filter(t => !known.has(t.strand)).forEach(t => { let g = groups.find(x => x.id === t.strand); if (!g) groups.push(g = { id: t.strand, name: t.strand, c: "#ff6f9f", items: [] }); g.items.push(t); });
    mapEl.innerHTML = `<div class="tmap"><div class="tmap-hello"><svg viewBox="0 0 100 100" aria-hidden="true">${ctx.face("kitty")}</svg><p>Pick a game! Every game is maths.</p></div>` +
      groups.filter(g => g.items.length).map(g => `<section class="tmap-group" style="--c:${g.c}"><h2>${esc(g.name)}</h2><div class="tmap-grid">${g.items.map(card).join("")}</div></section>`).join("") + `</div>`;
  }
  function card(t) {
    const s = stOf(t.id), lv = Math.min(s.level, t.levels.length - 1);
    const dots = t.levels.map((_, i) => `<i class="${i < lv ? "done" : i === lv ? "now" : ""}"></i>`).join("");
    return `<button class="tmap-card" type="button" data-topic="${esc(t.id)}" aria-label="${esc(t.title)}, level ${lv + 1} of ${t.levels.length}"><span class="tmap-icon">${t.icon || ""}</span><span class="tmap-name">${esc(t.title)}</span><span class="tmap-lv" aria-hidden="true">${dots}</span></button>`;
  }

  /* ---------------- Play screen ---------------- */
  function buildLayer() {
    if (layer) return;
    layer = document.createElement("div");
    layer.className = "tp"; layer.id = "topicPlay"; layer.hidden = true;
    layer.innerHTML = `<div class="tp-app">
  <header class="tp-top">
    <button class="tp-back" type="button" data-act="back" aria-label="Back to the maths map"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 4 L7 12 L15 20" fill="none" stroke="#3b2a33" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/><path d="M15 4 L7 12 L15 20" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
    <button class="tp-title" type="button" data-act="levels" aria-haspopup="dialog"></button>
    <div class="tp-dots" aria-label="Questions until the cooking break"></div>
    <span class="tp-score"><img src="${ctx.ART("star")}" alt=""><span></span></span>
  </header>
  <div class="tp-talk"><svg class="tp-kitty" viewBox="0 0 100 100" aria-hidden="true">${ctx.face("kitty")}</svg><p class="tp-bubble" aria-live="polite"></p><button class="tp-speak" type="button" data-act="again" aria-label="Say it again">${SPEAKER}</button></div>
  <div class="tp-ask" aria-live="polite"></div>
  <div class="tp-pic"></div>
  <div class="tp-pad"></div>
</div>
<div class="cook-layer tp-cook" hidden></div>
<div class="tp-sheet" hidden role="dialog" aria-label="Pick a level"><div class="tp-sheet-card"></div></div>`;
    document.body.appendChild(layer);
    els = { title: $q(".tp-title"), dots: $q(".tp-dots"), score: $q(".tp-score"), bubble: $q(".tp-bubble"), ask: $q(".tp-ask"), pic: $q(".tp-pic"), pad: $q(".tp-pad"), cook: $q(".tp-cook"), sheet: $q(".tp-sheet"), card: $q(".tp-sheet-card") };
    layer.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
  }
  const api = {
    say: t => say(t),
    speak: t => ctx.speak(t),
    tone: (f, d, ty, g) => ctx.tone(f, d, ty, g),
    ART: k => ctx.ART(k),
    face: id => ctx.face(id),
    highlight(el) {
      if (hlEl) { hlEl.classList.remove("hl"); hlEl = null; }
      if (!el) return;
      if (el instanceof SVGElement && !(el instanceof SVGSVGElement)) { try { el.animate([{ filter: "none" }, { filter: "drop-shadow(0 0 8px #ffc94a)" }, { filter: "none" }], { duration: 700, iterations: 2 }); } catch (e) {} return; }
      hlEl = el; el.classList.add("hl");
    }
  };
  function say(text, mood) {
    lastSaid = String(text);
    els.bubble.textContent = lastSaid;
    els.bubble.className = "tp-bubble" + (mood ? " " + mood : phase === "teach" ? " teach" : "");
    ctx.speak(lastSaid);
  }
  function renderTopBar() {
    const p = P();
    els.score.querySelector("span").textContent = p.stars;
    els.score.setAttribute("aria-label", `${p.stars} stars`);
    const done = Math.min(p.round.length, ctx.COOK_EVERY);
    els.dots.innerHTML = Array.from({ length: ctx.COOK_EVERY }, (_, i) => `<img src="${ctx.ART("cupcake")}" alt="" class="${i < done ? "on" : ""}">`).join("");
    if (topic) els.title.innerHTML = `${topic.icon || ""}<span>${esc(topic.title)} <small>Level ${level + 1}</small></span>`;
  }
  function bumpScore() { els.score.classList.remove("bump"); void els.score.offsetWidth; els.score.classList.add("bump"); }

  function open(id) {
    const t = topics().find(x => x.id === id); if (!t) return;
    buildLayer();
    topic = t; level = Math.min(stOf(t.id).level, t.levels.length - 1); prevQ = null;
    layer.hidden = false; els.sheet.hidden = true;
    renderTopBar();
    next();
  }
  function close() {
    token++; clearTimers(); fixed = null;
    if (phase === "cook") stopCook();
    destroyInst(); api.highlight(null);
    phase = "idle"; Q = null; topic = null;
    if (layer) { layer.hidden = true; els.pic.innerHTML = ""; els.pad.innerHTML = ""; els.ask.innerHTML = ""; }
    try { speechSynthesis.cancel(); } catch (e) {}
    renderMap(); ctx.renderTop();
  }
  function destroyInst() { if (inst) { try { inst.destroy(); } catch (e) { console.error(e); } inst = null; } }

  function next() {
    token++; clearTimers(); destroyInst(); api.highlight(null); ctx.clearFx();
    if (!fixed && P().round.length >= ctx.COOK_EVERY) return startCook();
    tries = 0; afterTries = 0; typed = ""; phase = "ask"; rushed = false; askedAt = performance.now();
    els.pic.innerHTML = "";
    try {
      Q = topic.make(level, prevQ); prevQ = Q;
      inst = topic.mount(els.pic, Q, api);
    } catch (e) {
      console.error("Topic failed", topic.id, level, e);
      phase = "broken"; els.ask.textContent = ""; els.pad.innerHTML = "";
      say("Oops, this game is broken. Tap the back arrow and pick another game.", "warn");
      return;
    }
    renderTopBar(); renderAsk(); renderPad(); say(Q.say);
  }
  function fmt(v) { const u = Q.input.unit || ""; return u === "$" ? "$" + v : v + u; }
  function renderAsk() {
    if (Q.input.type === "number") {
      const ghost = phase === "afterTeach" && afterTries >= 2 && !typed;
      const u = Q.input.unit || "";
      const inner = typed ? esc(fmt(typed)) : ghost ? `<span class="ghost">${esc(fmt(Q.answer))}</span>` : phase === "done" ? esc(fmt(Q.answer)) : (u === "$" ? "$?" : "?" + esc(u));
      const box = `<span class="tp-ans${typed || phase === "done" ? " filled" : ""}">${inner}</span>`;
      // When the question already has a blank ("3 + ? = 9", "10, ?, 20"), her answer goes into that blank, not a second box.
      const m = BLANK.exec(Q.show);
      if (m) {
        const i = m.index + m[1].length, inModuleBox = m[1] === ">" && Q.show[i + 1] === "<";
        els.ask.innerHTML = `<span>${Q.show.slice(0, i)}${inModuleBox ? inner : box}${Q.show.slice(i + 1)}</span>`;
      } else els.ask.innerHTML = `<span>${Q.show}</span>${box}`;
    } else els.ask.innerHTML = `<span>${Q.show}</span>`;
  }
  function renderPad() {
    const pad = els.pad;
    if (Q.input.type === "number") {
      pad.className = "tp-pad"; pad.style.removeProperty("--n");
      const cols = ["var(--pink)", "var(--sun)", "var(--mint)", "var(--sky)", "var(--lilac)"];
      const k = (d, i) => `<button class="tp-key" type="button" data-k="${d}" style="--c:${cols[i % 5]}">${d}</button>`;
      pad.innerHTML = [1, 2, 3, 4, 5].map(k).join("") + `<button class="tp-key del" type="button" data-k="del" aria-label="Delete">&#9003;</button>` +
        [6, 7, 8, 9, 0].map(k).join("") + `<button class="tp-key go" type="button" data-k="go" aria-label="Check">&#10003;</button>`;
    } else {
      const ch = Q.input.choices || [];
      pad.className = "tp-choices" + (ch.length === 4 ? " n4" : ""); pad.style.setProperty("--n", Math.max(1, ch.length));
      pad.innerHTML = ch.map(c => `<button class="tp-choice" type="button" data-c="${esc(c.value)}" aria-label="${esc(c.label != null ? c.label : c.value)}">${c.html || esc(c.label)}</button>`).join("");
      if (phase === "afterTeach" && afterTries >= 2) { const g = [...pad.children].find(b => b.dataset.c === String(Q.answer)); if (g) g.classList.add("ghost"); }
      // Fewer buttons per row when a word or picture does not fit (for example "Wednesday" on a small phone).
      const cut = () => [...pad.children].some(b => b.scrollWidth > b.clientWidth + 1);
      for (let cols = ch.length; cols > 1 && cut();) { cols = Math.ceil(cols / 2); pad.style.setProperty("--n", cols); }
    }
    setPad(phase === "ask" || phase === "afterTeach");
  }
  function setPad(on) { els.pad.querySelectorAll("button").forEach(b => { if (!b.classList.contains("wrong")) b.disabled = !on; }); }

  function onClick(e) {
    const a = e.target.closest("[data-act]");
    if (a) {
      const act = a.dataset.act;
      if (act === "back") { const f = fixed; close(); if (f && f.onQuit) f.onQuit(); return; }
      if (act === "again") return ctx.speak(lastSaid, true);
      if (act === "levels") return fixed ? null : openLevels();
    }
    if (!els.sheet.hidden) {
      const b = e.target.closest("[data-lv]");
      if (b) { const s = stOf(topic.id); level = s.level = +b.dataset.lv; s.stats = []; s.teachRun = 0; ctx.save(); els.sheet.hidden = true; prevQ = null; renderTopBar(); next(); }
      else if (e.target === els.sheet || e.target.closest("[data-close]")) els.sheet.hidden = true;
      return;
    }
    const c = e.target.closest(".tp-choice");
    if (c && els.pad.contains(c) && !c.disabled) return check(c.dataset.c, c);
    const k = e.target.closest(".tp-key");
    if (k && !k.disabled) press(k.dataset.k);
  }
  function onKey(e) {
    if (!layer || layer.hidden || !Q || Q.input.type !== "number") return;
    if (e.target.closest && e.target.closest("input, select, textarea")) return;
    if (/^[0-9]$/.test(e.key)) press(e.key);
    else if (e.key === "Backspace") { e.preventDefault(); press("del"); }
    else if (e.key === "Enter") { e.preventDefault(); press("go"); }
  }
  function openLevels() {
    if (phase === "cook" || !topic) return;
    els.card.innerHTML = `<h2>${esc(topic.title)}: pick a level</h2><div class="tp-lv">${topic.levels.map((l, i) =>
      `<button type="button" data-lv="${i}" class="${i === level ? "on" : ""}">${i + 1}. ${esc(l.name)}<small>Grade ${esc(l.grade)}${l.note ? ". " + esc(l.note) : ""}</small></button>`).join("")}</div>
      <div class="tp-lv" style="margin-top:10px"><button type="button" data-close="1">Keep playing</button></div>`;
    els.sheet.hidden = false;
  }
  function press(k) {
    if (phase !== "ask" && phase !== "afterTeach") return;
    if (k === "del") typed = typed.slice(0, -1);
    else if (k === "go") { if (!typed) { say("Type your answer with the number buttons.", "warn"); return; } return check(String(parseInt(typed, 10)), null); }
    else if (typed.length < 4) typed = (typed === "0" ? "" : typed) + k;
    ctx.tone([500], .05); renderAsk();
  }

  function check(v, btn) {
    if (phase !== "ask" && phase !== "afterTeach") return;
    if (String(v) === String(Q.answer)) return correct();
    // A second wrong tap on a choice within half a second is one quick double tap, not a new try.
    if (btn) { const now = Date.now(); if (now - lastMissAt < 500) return; lastMissAt = now; }
    ctx.tone([330], .2, "triangle"); typed = "";
    // A missed choice is NOT greyed out or switched off: with only 2 or 3 choices that would leave just the
    // answer to tap, which hands her the answer and skips the hint and Mimi's lesson. The question shakes instead.
    els.ask.classList.remove("shake"); void els.ask.offsetWidth; els.ask.classList.add("shake");
    if (phase === "afterTeach") {
      afterTries++;
      if (afterTries >= 2) {
        if (Q.input.type === "number") say(`It is ${fmt(Q.answer)}. Type ${Q.answer}.`, "warn");
        else say("Tap the glowing answer.", "warn");
        renderAsk(); renderPad();
      } else { say("Not quite. Look at your picture. Try again.", "warn"); renderAsk(); }
      return;
    }
    if (tries === 0 && performance.now() - askedAt < 1500) rushed = true;   // a wrong answer in under 1.5 s is a rush
    tries++;
    if (tries === 1) { say(rushed ? "Let's look slowly. Look at the picture again." : "Not quite. Try again.", "warn"); renderAsk(); }
    else if (tries < ctx.TEACH_AFTER_MISTAKES) { let h = ""; try { h = topic.hint(Q, tries); } catch (e) { console.error(e); } say(h || "Look at the picture again, one step at a time.", "warn"); renderAsk(); }
    else runTeach();
  }
  async function runTeach() {
    const my = token;
    phase = "teach"; typed = ""; renderAsk(); setPad(false);
    say("Let's do it together.");
    await new Promise(r => timers.push(setTimeout(r, 900)));
    if (my !== token) return;
    try { if (typeof topic.teach === "function") await topic.teach(Q, els.pic, api); }
    catch (e) { console.error("Lesson failed", topic.id, e); }
    if (my !== token || phase !== "teach") return;
    phase = "afterTeach"; api.highlight(null); renderPad(); renderAsk();
  }
  function correct() {
    clearTimers();
    const p = P(), s = stOf(topic.id);
    const wasTaught = phase === "afterTeach";
    const first = phase === "ask" && tries === 0;
    const earn = first ? 2 : 1;
    const d = ctx.todayLog(), tk = ctx.dayKey();
    if (p.lastDay !== tk) { const y = new Date(); y.setDate(y.getDate() - 1); p.dayStreak = p.lastDay === ctx.dayKey(y) ? p.dayStreak + 1 : 1; p.lastDay = tk; }
    const goalBefore = d.n + (d.t || 0) >= p.goal;
    ctx.addStars(earn);
    p.tq = (p.tq || 0) + 1; d.t = (d.t || 0) + 1; s.n++;
    if (first) { p.tqFirst = (p.tqFirst || 0) + 1; s.first++; }
    if (!fixed) p.round.push(first ? 1 : 0);
    const notes = []; let big = false;
    if (!fixed && level === s.level) {
      s.stats = s.stats.concat(first ? 1 : 0).slice(-10);
      if (s.stats.length >= 10 && s.stats.reduce((x, y) => x + y, 0) >= ctx.LEVEL_UP_NEED && s.level < topic.levels.length - 1) {
        s.level++; s.stats = []; ctx.addStars(10); big = true; notes.push(`Level up! 10 bonus stars!`);
      }
    }
    s.teachRun = wasTaught ? (s.teachRun || 0) + 1 : first ? 0 : (s.teachRun || 0);
    if (!fixed && s.teachRun >= 3 && s.level > 0) { s.level--; s.teachRun = 0; s.stats = []; notes.push("Let's practise some easier ones for a bit."); }
    if (!goalBefore && d.n + d.t >= p.goal) { p.crowns = (p.crowns || 0) + 1; ctx.addStars(10); big = true; notes.push(`${p.goal} questions today! You win a crown.`); }
    if (!fixed) level = Math.min(s.level, topic.levels.length - 1);
    ctx.save();
    phase = "done"; typed = ""; api.highlight(null);
    const praise = wasTaught ? "You worked it out!" : ctx.pick(ctx.PRAISE);
    els.bubble.textContent = `${praise} +${earn} ${earn === 1 ? "star" : "stars"}. ${notes.join(" ")}`.trim();
    els.bubble.className = "tp-bubble good";
    lastSaid = `${praise} ${notes.join(" ")}`.trim();
    ctx.speak(lastSaid);
    ctx.tone(big ? [523, 659, 784, 1047] : [659, 880]);
    ctx.burst(big ? 16 : 3);
    bumpScore(); renderTopBar(); renderAsk(); setPad(false);
    if (fixed) { const f = fixed, r = { correct: true, firstTry: first, helped: !first, taught: wasTaught, rush: rushed && !first };
      timers.push(setTimeout(() => { if (fixed === f) f.onAnswer(r); }, 1500)); return; }
    timers.push(setTimeout(next, big ? 3200 : notes.length ? 2600 : 1500));
  }

  /* ---------------- Cooking break (cook.js), shared count with the sums ---------------- */
  function startCook() {
    phase = "cook"; destroyInst(); els.pad.innerHTML = ""; els.ask.innerHTML = "";
    const c = els.cook; c.hidden = false; c.innerHTML = "";
    say("Cooking time!", "good");
    const finish = done => {
      if (phase !== "cook") return;
      if (done) P().cooks = (P().cooks || 0) + 1;
      stopCook(); P().round = []; ctx.save(); renderTopBar(); ctx.renderTop();
      phase = "ask"; next();
    };
    window.CookGame.start(c, { recipe: (P().cooks || 0) % 3, onDone() { finish(true); }, onSkip() { finish(false); } });
  }
  function stopCook() { try { window.CookGame.stop(); } catch (e) {} els.cook.hidden = true; els.cook.innerHTML = ""; renderTopBar(); }

  /* ---------------- Grown-ups report ---------------- */
  function report() {
    const all = topics(), T = P().topics || {};
    const rows = all.filter(t => T[t.id] && T[t.id].n).map(t => { const s = T[t.id], l = t.levels[Math.min(s.level, t.levels.length - 1)];
      return `<li>${esc(t.title)}: level ${Math.min(s.level, t.levels.length - 1) + 1} of ${t.levels.length} (${esc(l.name)}, grade ${esc(l.grade)}). ${s.n} answered, ${s.first} right first time.</li>`; });
    return `<section><h3>Other maths (Grade 1 to 3)</h3><p>${P().tq || 0} questions in all, ${P().tqFirst || 0} right first time. ${all.length} games: numbers, groups and equal, money, fractions, patterns, time and measuring, shapes, graphs and chance.</p>${rows.length ? `<ul>${rows.join("")}</ul>` : "<p>None played yet.</p>"}
<p>Notes: reading clocks is BC Grade 4 and adding fractions goes beyond BC Grade 3. They are in because her father asked for them. The 82 cents puzzle uses pennies, which left circulation in 2013, so it has its own level. Each topic's levels can be changed by tapping the topic name at the top of its screen.</p></section>`;
  }

  window.TopicHost = {
    init(c) { ctx = c; injectCss(); },
    mount(el) { mapEl = el; renderMap(); if (!el.dataset.tpWired) { el.dataset.tpWired = "1"; el.addEventListener("click", e => { const b = e.target.closest("[data-topic]"); if (b) { ctx.tone([523, 659]); open(b.dataset.topic); } }); } },
    refresh() { renderMap(); if (layer && !layer.hidden) renderTopBar(); },
    isOpen() { return !!layer && !layer.hidden; },
    open, close, report,
    play(id, lv, hooks) {
      const t = topics().find(x => x.id === id); if (!t) return false;
      buildLayer();
      topic = t; level = Math.max(0, Math.min(lv, t.levels.length - 1)); prevQ = null; fixed = hooks;
      layer.hidden = false; els.sheet.hidden = true;
      renderTopBar(); next(); return true;
    },
    // The engine asks one more question at the same level, without closing the screen.
    again(lv) { if (!fixed || !topic) return; level = Math.max(0, Math.min(lv, topic.levels.length - 1)); next(); },
    get state() { return { topic: topic && topic.id, level, Q, phase, tries, afterTries, typed }; }
  };
})();
