/* river.js - River Crossing, Kennedy's adding and taking away game (19 Oct 2026).
   The maths IS the game: the number line is a row of stepping stones across a river. The knight starts on the first
   number; each tap of a Hop button makes him hop one stone (he hears "plus 1, plus 2"). Then Kennedy taps the stone
   number where his knight stands. A right answer makes the goblin on the far bank drop his shield and back away.
   Once he knows a skill, there are no Hop buttons: "Think in your head", he picks the stone, and the knight jumps
   there to check. Calm: one slow hop per tap, no flashing. Uses globals: gen, speak, KnightArt, Mission, who. */
(function () {
  "use strict";
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const strip = svg => svg.replace(/^<svg[^>]*>|<\/svg>$/g, "");
  let layer = null, S = null, hooks = null;

  const CSS = `
.rv { position: fixed; inset: 0; z-index: 20; background: var(--bg, #edf2f8); display: flex; flex-direction: column; gap: 10px; padding: 8px 10px 12px; box-sizing: border-box; }
.rv[hidden] { display: none; }
.rv-top { display: grid; grid-template-columns: 52px minmax(0, 1fr); gap: 8px; align-items: center; }
.rv-top button { height: 48px; border-radius: 14px; border: 1px solid rgba(0,0,0,.14); background: #fff; font-size: 22px; }
.rv-top h2 { margin: 0; font-size: 20px; font-weight: 800; }
.rv-ask { margin: 0; font-size: clamp(18px, 3.4vw, 26px); font-weight: 800; text-align: center; min-height: 1.4em; }
.rv-scene { flex: 1; min-height: 0; width: 100%; display: block; border-radius: 22px; border: 1px solid rgba(0,0,0,.12); background: #e3eefa; }
.rv-stone { cursor: pointer; } .rv-stone:focus-visible ellipse { stroke: #3d6fd8; stroke-width: 5; }
.rv-stone text { font-weight: 800; pointer-events: none; }
.rv-hops, .rv-pick { display: grid; grid-auto-flow: column; grid-auto-columns: minmax(0, 1fr); gap: 8px; }
.rv-hops button, .rv-pick button { min-height: 64px; border-radius: 16px; border: 1px solid rgba(0,0,0,.14); background: #fff; font-size: 26px; font-weight: 800; color: #22314a; box-shadow: 0 3px 0 rgba(0,0,0,.12); }
.rv-hops button.used { background: #e2ebfa; color: #8fa0bd; box-shadow: none; }
.rv-hops button.next { background: #3d6fd8; color: #fff; border-color: #3d6fd8; }
@media (prefers-reduced-motion: reduce) { .rv * { transition: none !important; } }`;
  function css() { if (document.getElementById("rv-css")) return; const s = document.createElement("style"); s.id = "rv-css"; s.textContent = CSS; document.head.appendChild(s); }

  // Which stones to show: 0 to 10, or 0 to 20; a phone shows a window of 11 around the hops.
  function range(q) {
    const lo = Math.min(q.a, q.ans), hi = Math.max(q.a, q.ans);
    if (innerWidth >= 700) return hi <= 10 ? [0, 10] : [0, 20];
    let L = Math.max(0, Math.min(lo - 1, hi - 10)); return [L, L + 10];
  }
  // The scene is wide on an iPad and taller on a phone, so the stones are always big enough to tap.
  const dims = () => innerWidth >= 700 ? { W: 1000, H: 470, RY: 340 } : { W: 480, H: 560, RY: 380 };
  let D = dims();
  const stoneX = (k, r) => 40 + (k - r[0]) * ((D.W - 80) / (r[1] - r[0]));
  const stoneY = k => D.RY + Math.sin(k * 0.9) * 8;

  function scene(q, r) {
    const stones = [];
    for (let k = r[0]; k <= r[1]; k++) {
      const x = stoneX(k, r), y = stoneY(k), big = Math.min(r[1] - r[0] > 10 ? 26 : 34, ((D.W - 80) / (r[1] - r[0])) * .47);
      stones.push(`<g class="rv-stone" data-k="${k}" role="button" tabindex="-1" aria-label="Stone ${k}">
        <ellipse cx="${x}" cy="${y + 6}" rx="${big}" ry="${big * .5}" fill="#8aa0b8" opacity=".5"/>
        <ellipse cx="${x}" cy="${y}" rx="${big}" ry="${big * .55}" fill="#d9dee6" stroke="#3b2a33" stroke-width="2.5"/>
        <text x="${x}" y="${y + 7}" text-anchor="middle" font-size="${big * .7}" fill="#22314a">${k}</text></g>`);
    }
    const knightAt = stoneX(q.a, r), sign = q.op === "+" ? "+" : "−", W = D.W, H = D.H, RY = D.RY;
    const gx = W - 150, gy = RY - 140 - 169;   // the goblin stands on the far bank, above the stones
    return `<svg class="rv-scene" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" role="group" aria-label="The river with stepping stones">
      <rect width="${W}" height="${H}" fill="#e3eefa"/>
      <g fill="#fff" opacity=".9"><ellipse cx="${W * .18}" cy="70" rx="60" ry="20"/><ellipse cx="${W * .24}" cy="58" rx="40" ry="20"/><ellipse cx="${W * .55}" cy="96" rx="50" ry="16"/></g>
      <g transform="translate(${W * .06} ${RY - 175})" opacity=".55"><rect x="0" y="40" width="110" height="60" fill="#e9dcc9" stroke="#3b2a33" stroke-width="2"/>${[0, 1, 2, 3, 4].map(i => `<rect x="${2 + i * 23}" y="30" width="14" height="12" fill="#e9dcc9" stroke="#3b2a33" stroke-width="2"/>`).join("")}<rect x="-14" y="16" width="30" height="84" fill="#ddd0bc" stroke="#3b2a33" stroke-width="2"/><path d="M-18 18 L1 -6 L20 18 Z" fill="#3d6fd8" stroke="#3b2a33" stroke-width="2"/></g>
      <path d="M0 ${RY - 95} Q${W * .3} ${RY - 125} ${W * .55} ${RY - 100} T${W} ${RY - 110} V${RY - 50} H0 Z" fill="#cfe8c4"/>
      <rect y="${RY - 60}" width="${W}" height="120" fill="#9fd0f2"/>
      <path d="M0 ${RY - 35} q30 -6 60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0" stroke="#c7e6fa" stroke-width="3" fill="none"/>
      <path d="M0 ${RY + 40} q30 -6 60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0" stroke="#c7e6fa" stroke-width="3" fill="none"/>
      <rect y="${RY + 60}" width="${W}" height="${H - RY - 60}" fill="#bfe0b2"/>
      <g class="rv-stars">${Array.from({ length: 5 }, (_, i) => `<path transform="translate(${gx + 6 + i * 24} ${gy - 18})" d="M0 -9 L2.6 -3 9 -2.8 4 1.5 5.6 8 0 4.4 -5.6 8 -4 1.5 -9 -2.8 -2.6 -3 Z" fill="${i < (S.done || 0) ? "#d6dbe3" : "#ffd45c"}" stroke="#3b2a33" stroke-width="1.2"/>`).join("")}</g>
      <g class="rv-gob"><svg x="${gx}" y="${gy}" width="130" height="169" viewBox="0 0 200 260">${window.KnightArt ? strip(KnightArt.full("badguy", "grumpy")) : ""}</svg>
        <g class="rv-shield"><path d="M${gx - 80} ${gy + 50} h84 v54 q0 32 -42 44 q-42 -12 -42 -44 Z" fill="#fffaf3" stroke="#3b2a33" stroke-width="3"/>
        <text x="${gx - 38}" y="${gy + 104}" text-anchor="middle" font-size="28" font-weight="800" fill="#22314a">${q.a} ${sign} ${q.b}</text></g></g>
      ${stones.join("")}
      <g class="rv-knight" style="transform: translate(${knightAt - 45}px, ${stoneY(q.a) - 128}px)"><svg width="90" height="117" viewBox="0 0 200 260">${window.KnightArt ? strip(KnightArt.full("knight", "stand", gear())) : ""}</svg></g>
    </svg>`;
  }
  const has = id => (P.castle || []).includes(id);
  const gear = () => ({ armour: has("armour"), plume: has("plume"), shield: has("shield"), sword: has("sword2") ? "silver" : has("sword") ? "wood" : "none" });

  function moveKnight(k, ms) {
    const g = layer.querySelector(".rv-knight"); if (!g) return Promise.resolve();
    const x = stoneX(k, S.r) - 45, y = stoneY(k) - 128;
    const from = g.style.transform, to = `translate(${x}px, ${y}px)`;
    g.style.transform = to;
    if (!g.animate || matchMedia("(prefers-reduced-motion: reduce)").matches) return Promise.resolve();
    const m = /translate\(([-\d.]+)px, ([-\d.]+)px\)/.exec(from) || [0, x, y];
    const mx = (+m[1] + x) / 2, my = Math.min(+m[2], y) - 60;
    return g.animate([{ transform: from }, { transform: `translate(${mx}px, ${my}px)` }, { transform: to }], { duration: ms || 520, easing: "ease-in-out" }).finished.catch(() => {});
  }
  // Each hop leaves a soft arc over the water with its count: +1, +2, +3 (Aldrin asked for this, 18 Oct 2026).
  function arc(from, to, n) {
    const svg = layer.querySelector(".rv-scene"); if (!svg) return;
    const x1 = stoneX(from, S.r), x2 = stoneX(to, S.r), y = Math.min(stoneY(from), stoneY(to)) - 24, lift = 42;
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.innerHTML = `<path d="M${x1} ${y} Q${(x1 + x2) / 2} ${y - lift} ${x2} ${y}" fill="none" stroke="#7b55e6" stroke-width="4" stroke-linecap="round" stroke-dasharray="2 9"/>
      <text x="${(x1 + x2) / 2}" y="${y - lift / 2 - 6}" text-anchor="middle" font-size="22" font-weight="800" fill="#7b55e6" stroke="#fff" stroke-width="4" paint-order="stroke">${S.q.op === "+" ? "+" : "−"}${n}</text>`;
    svg.insertBefore(g, svg.querySelector(".rv-knight"));
  }
  function say(t) { const p = layer.querySelector(".rv-ask"); if (p) p.textContent = t; speak(t); }

  function render() {
    const q = S.q, sign = q.op === "+" ? "plus" : "take away";
    layer.innerHTML = `<div class="rv-top"><button type="button" data-act="back" aria-label="Stop for now">←</button><h2>River crossing</h2></div>
      <p class="rv-ask" aria-live="polite"></p>
      ${scene(q, S.r)}
      <div class="${S.head ? "rv-pick" : "rv-hops"}"></div>`;
    layer.querySelector("[data-act=back]").onclick = () => { close(); if (hooks && hooks.onQuit) hooks.onQuit(); };
    layer.querySelectorAll(".rv-stone").forEach(st => st.onclick = () => pick(+st.dataset.k));
    controls();
  }
  function controls() {
    const q = S.q, box = layer.querySelector(".rv-hops, .rv-pick");
    if (S.phase === "hop") {
      box.innerHTML = Array.from({ length: q.b }, (_, i) => `<button type="button" data-hop="${i}" class="${i < S.hops ? "used" : i === S.hops ? "next" : ""}" aria-label="Hop ${i + 1}">${q.op === "+" ? "+" : "−"}${i + 1}</button>`).join("");
      box.querySelectorAll("[data-hop]").forEach(b => b.onclick = () => hop());
    } else {
      // pick the stone: the stones in the river are the answer buttons; 3 big stones below help small fingers
      const c = new Set([q.ans]); while (c.size < 3) { const v = q.ans + [-2, -1, 1, 2][Math.floor(Math.random() * 4)]; if (v >= S.r[0] && v <= S.r[1]) c.add(v); }
      box.className = "rv-pick";
      box.innerHTML = [...c].sort((x, y) => x - y).map(v => `<button type="button" data-pick="${v}">${v}</button>`).join("");
      box.querySelectorAll("[data-pick]").forEach(b => b.onclick = () => pick(+b.dataset.pick));
    }
  }
  async function hop() {
    if (S.busy || S.phase !== "hop") return;
    S.busy = true; S.hops++;
    const k = S.q.a + (S.q.op === "+" ? S.hops : -S.hops);
    speak(`${S.q.op === "+" ? "plus" : "minus"} ${S.hops}`);
    arc(k - (S.q.op === "+" ? 1 : -1), k, S.hops);
    await moveKnight(k);
    S.pos = k; S.busy = false;
    if (S.hops >= S.q.b) { S.phase = "pick"; controls(); say("Where is your knight now? Tap his stone."); }
    else controls();
  }
  async function pick(v) {
    if (S.busy || S.phase === "hop" || S.phase === "done") { if (S.phase === "hop") say("Hop first. Tap the blue hop button."); return; }
    const q = S.q;
    if (v === q.ans) {
      S.phase = "done"; S.busy = true;
      if (S.head && S.pos !== q.ans) await moveKnight(q.ans, 700);
      const sh = layer.querySelector(".rv-shield"); if (sh && sh.animate) sh.animate([{ transform: "none", opacity: 1 }, { transform: "translateY(60px)", opacity: 0 }], { duration: 700, fill: "forwards", easing: "ease-in" });
      say(`Yes! ${q.a} ${q.op === "+" ? "plus" : "take away"} ${q.b} is ${q.ans}. The goblin drops his shield!`);
      const r = { correct: true, firstTry: S.tries === 0, helped: S.tries > 0 || S.taught, taught: S.taught, rush: false };
      setTimeout(() => { S.busy = false; if (hooks) hooks.onAnswer(r); }, 1600);
      return;
    }
    S.tries++;
    if (S.head) { // in your head: show the hops so he can count, then ask again
      S.head = false; S.taught = S.tries >= 2; S.phase = "hop"; S.hops = 0; S.pos = q.a;
      render(); say(`Let's hop to check. Start on ${q.a}. Tap a hop button for each hop.`); return;
    }
    say(S.tries >= 2 ? `Look at the stone under your knight. Count back to ${q.a} if you are not sure.` : "Not that stone. Look where your knight is standing.");
    if (S.tries >= 3) { S.taught = true; const g = layer.querySelector(`.rv-stone[data-k="${q.ans}"] ellipse:nth-of-type(2)`); if (g) g.setAttribute("fill", "#ffe9a8"); }
  }

  function play(opts) {
    css(); hooks = opts;
    if (!layer) { layer = document.createElement("div"); layer.className = "rv"; layer.id = "riverPlay"; document.body.appendChild(layer); }
    layer.hidden = false;
    D = dims(); const q = gen(opts.level || 1);
    S = { done: opts.done || 0, q, r: range(q), phase: opts.head ? "pick" : "hop", hops: 0, pos: q.a, tries: 0, head: !!opts.head, taught: false, busy: false };
    render();
    say(S.head ? `Think in your head. ${q.a} ${q.op === "+" ? "plus" : "take away"} ${q.b}. Which stone?` : `${q.a} ${q.op === "+" ? "plus" : "take away"} ${q.b}. Your knight is on ${q.a}. Tap a hop button for each hop.`);
    return true;
  }
  function close() { if (layer) { layer.hidden = true; layer.innerHTML = ""; } S = null; }
  window.River = { play, close, isOpen: () => !!layer && !layer.hidden, state: () => S && { phase: S.phase, ans: S.q.ans, b: S.q.b, hops: S.hops, busy: S.busy } };
})();
