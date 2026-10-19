/* cafe_orders.js - Cafe Orders, Marie's adding and taking away to 20 (19 Oct 2026).
   The maths IS the cafe work. Two baking trays of 2 rows of 5 (ten-frames) sit on the counter.
   Adding (7 + 5): 7 treats are already baked; she taps "Bake" once for each of the 5 more; each treat fills the next
   hole, so the first tray fills to 10 and the rest go on the second tray (make 10, built into the action). Then she
   picks how many treats are on the trays. Taking away (13 - 5): she taps treats to give 5 to the customer, then picks
   how many are left. Once she knows a skill: "Think in your head" first, then the trays show it.
   Calm: one treat per tap, no flashing. Uses globals: gen, speak, ART, KittyChars, P. */
(function () {
  "use strict";
  const strip = svg => svg.replace(/^<svg[^>]*>|<\/svg>$/g, "");
  const FRIENDS = ["melody", "kuromi", "purin", "cinna"], TREATS = ["cupcake", "donut", "cookie", "strawberry"];
  let layer = null, S = null, hooks = null, served = 0;

  const CSS = `
.co { position: fixed; inset: 0; z-index: 20; background: var(--bg, #fbf5ef); display: flex; flex-direction: column; gap: 10px; padding: 8px 10px 12px; box-sizing: border-box; }
.co[hidden] { display: none; }
.co-top { display: grid; grid-template-columns: 52px minmax(0, 1fr); gap: 8px; align-items: center; }
.co-top button { height: 48px; border-radius: 14px; border: 1px solid rgba(0,0,0,.14); background: #fff; font-size: 22px; }
.co-top h2 { margin: 0; font-size: 20px; font-weight: 800; }
.co-ask { margin: 0; font-size: clamp(18px, 3.4vw, 26px); font-weight: 800; text-align: center; min-height: 1.4em; }
.co-scene { flex: 1; min-height: 0; width: 100%; display: block; border-radius: 22px; border: 1px solid rgba(0,0,0,.12); background: #fdf1f4; }
.co-cell.give { cursor: pointer; }
.co-act, .co-pick { display: grid; grid-auto-flow: column; grid-auto-columns: minmax(0, 1fr); gap: 8px; }
.co-act button, .co-pick button { min-height: 64px; border-radius: 16px; border: 1px solid rgba(0,0,0,.14); background: #fff; font-size: 24px; font-weight: 800; color: #3b2a33; box-shadow: 0 3px 0 rgba(0,0,0,.12); }
.co-act button.main { background: #e5779b; color: #fff; border-color: #e5779b; }
.co-act button[disabled] { opacity: .45; box-shadow: none; }`;
  function css() { if (document.getElementById("co-css")) return; const s = document.createElement("style"); s.id = "co-css"; s.textContent = CSS; document.head.appendChild(s); }

  const W = () => innerWidth >= 700 ? 1000 : 520, H = () => innerWidth >= 700 ? 470 : 600;
  // Where hole i (0 to 19) sits: tray 1 holds 0-9, tray 2 holds 10-19; each tray is 2 rows of 5.
  function hole(i) {
    const w = W(), wide = w >= 700, cell = wide ? 58 : 44;
    const t = Math.floor(i / 10), j = i % 10, row = Math.floor(j / 5), col = j % 5;
    const trayW = cell * 5 + 24, gap = wide ? 40 : 24;
    const x0 = wide ? (w - (trayW * 2 + gap)) / 2 : (w - trayW) / 2;
    const tx = wide ? x0 + t * (trayW + gap) : x0, ty = wide ? 300 : 300 + t * (cell * 2 + 40);
    return { x: tx + 12 + col * cell, y: ty + 12 + row * cell, cell, tx, ty, trayW };
  }
  function scene() {
    const w = W(), h = H(), q = S.q, friend = FRIENDS[served % FRIENDS.length], wide = w >= 700;
    const sign = q.op === "+" ? "+" : "−";
    const trays = [0, 1].map(t => { const p = hole(t * 10); return `<rect x="${p.tx}" y="${p.ty}" width="${p.trayW}" height="${p.cell * 2 + 24}" rx="16" fill="#e8c9a8" stroke="#3b2a33" stroke-width="2.5"/>`; }).join("");
    const cells = Array.from({ length: 20 }, (_, i) => { const p = hole(i); return `<g class="co-cell" data-i="${i}"><rect x="${p.x + 3}" y="${p.y + 3}" width="${p.cell - 6}" height="${p.cell - 6}" rx="10" fill="#fff7ee" stroke="#c9a37c" stroke-width="1.5"/><g class="co-t"></g></g>`; }).join("");
    const art = (id, pose) => window.KittyChars ? strip(KittyChars.full(id, pose)) : "";
    return `<svg class="co-scene" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet" role="group" aria-label="Marie's cafe counter with two baking trays">
      <rect width="${w}" height="${h}" fill="#fdf1f4"/>
      <g opacity=".55">${Array.from({ length: Math.ceil(w / 26) * 10 }, (_, k) => `<circle cx="${13 + (k % Math.ceil(w / 26)) * 26}" cy="${13 + Math.floor(k / Math.ceil(w / 26)) * 26}" r="2.5" fill="#f7d6e0"/>`).join("")}</g>
      <rect x="0" y="${wide ? 270 : 270}" width="${w}" height="${h}" fill="#f3dcc2"/><rect x="0" y="${wide ? 262 : 262}" width="${w}" height="12" fill="#e8c9a8"/>
      <svg x="${wide ? 40 : 10}" y="${wide ? 70 : 60}" width="${wide ? 150 : 110}" height="${wide ? 195 : 143}" viewBox="0 0 200 260">${art("kitty", "wave")}</svg>
      <svg x="${w - (wide ? 190 : 120)}" y="${wide ? 70 : 60}" width="${wide ? 150 : 110}" height="${wide ? 195 : 143}" viewBox="0 0 200 260">${art(friend, "stand")}</svg>
      <g transform="translate(${w / 2 - 90} ${wide ? 60 : 70})"><rect width="180" height="120" rx="16" fill="#fff" stroke="#3b2a33" stroke-width="2.5"/>
        <text x="90" y="40" text-anchor="middle" font-size="18" font-weight="700" fill="#6e5562">Order</text>
        <text x="90" y="92" text-anchor="middle" font-size="44" font-weight="800" fill="#3b2a33">${q.a} ${sign} ${q.b}</text></g>
      ${trays}${cells}
    </svg>`;
  }
  function paint() {
    layer.querySelectorAll(".co-cell").forEach(g => {
      const i = +g.dataset.i, p = hole(i), full = i < S.count, t = g.querySelector(".co-t");
      t.innerHTML = full ? `<image href="${ART(S.treat)}" x="${p.x + 6}" y="${p.y + 6}" width="${p.cell - 12}" height="${p.cell - 12}"/>` : "";
      g.classList.toggle("give", S.phase === "give" && full);
      g.setAttribute("role", S.phase === "give" && full ? "button" : "presentation");
      if (S.phase === "give" && full) g.setAttribute("aria-label", "A treat. Tap to give it to the customer."); else g.removeAttribute("aria-label");
    });
  }
  function say(t) { const p = layer.querySelector(".co-ask"); if (p) p.textContent = t; speak(t); }
  function render() {
    layer.innerHTML = `<div class="co-top"><button type="button" data-act="back" aria-label="Stop for now">←</button><h2>Marie's Cafe</h2></div>
      <p class="co-ask" aria-live="polite"></p>${scene()}<div class="co-act"></div>`;
    layer.querySelector("[data-act=back]").onclick = () => { close(); if (hooks && hooks.onQuit) hooks.onQuit(); };
    layer.querySelectorAll(".co-cell").forEach(g => g.onclick = () => give(+g.dataset.i));
    paint(); controls();
  }
  function controls() {
    const box = layer.querySelector(".co-act, .co-pick"), q = S.q;
    if (S.phase === "bake") {
      box.className = "co-act";
      box.innerHTML = `<button type="button" class="main" data-bake="1">Bake one more</button><button type="button" disabled>${S.steps} of ${q.b} baked</button>`;
      box.querySelector("[data-bake]").onclick = bake;
    } else if (S.phase === "give") {
      box.className = "co-act";
      box.innerHTML = `<button type="button" disabled>Tap a treat to give it</button><button type="button" disabled>${S.steps} of ${q.b} given</button>`;
    } else {
      const c = new Set([q.ans]); while (c.size < 4) { const v = q.ans + [-3, -2, -1, 1, 2, 3][Math.floor(Math.random() * 6)]; if (v >= 0 && v <= 20) c.add(v); }
      box.className = "co-pick";
      box.innerHTML = [...c].sort((x, y) => x - y).map(v => `<button type="button" data-pick="${v}">${v}</button>`).join("");
      box.querySelectorAll("[data-pick]").forEach(b => b.onclick = () => pick(+b.dataset.pick));
    }
  }
  function bake() {
    if (S.phase !== "bake") return;
    S.count++; S.steps++; speak(`plus ${S.steps}`);
    paint();
    if (S.steps >= S.q.b) { S.phase = "pick"; controls(); say("How many treats are on the trays now?"); } else controls();
  }
  function give(i) {
    if (S.phase !== "give" || i >= S.count) return;
    S.count--; S.steps++; speak(`take away ${S.steps}`);
    paint();
    if (S.steps >= S.q.b) { S.phase = "pick"; controls(); say("How many treats are left on the trays?"); } else controls();
  }
  function pick(v) {
    const q = S.q;
    if (S.phase === "done") return;
    if (v === q.ans) {
      S.phase = "done"; S.count = q.ans; paint();
      say(`Yes! ${q.a} ${q.op === "+" ? "plus" : "take away"} ${q.b} is ${q.ans}. The order is ready!`);
      const r = { correct: true, firstTry: S.tries === 0, helped: S.tries > 0 || S.taught, taught: S.taught, rush: false };
      setTimeout(() => { if (hooks) hooks.onAnswer(r); }, 1600);
      return;
    }
    S.tries++;
    if (S.head) { S.head = false; S.taught = S.tries >= 2; start(false); say(q.op === "+" ? `Let's bake to check. There are ${q.a}. Tap Bake ${q.b} times.` : `Let's check. There are ${q.a}. Give ${q.b} treats to the customer.`); return; }
    say(S.tries >= 2 ? "Count the full holes. A full tray is 10." : "Not quite. Count the treats on the trays again.");
    if (S.tries >= 3) S.taught = true;
  }
  function start(head) {
    const q = S.q;
    S.count = q.a; S.steps = 0; S.phase = head ? "pick" : q.op === "+" ? "bake" : "give";
    render();
  }
  function play(opts) {
    css(); hooks = opts;
    if (!layer) { layer = document.createElement("div"); layer.className = "co"; layer.id = "cafePlay"; document.body.appendChild(layer); }
    layer.hidden = false;
    let q = gen(opts.level || 1); for (let i = 0; i < 20 && (q.a > 20 || q.ans > 20); i++) q = gen(opts.level || 1);
    S = { q, tries: 0, head: !!opts.head, taught: false, treat: TREATS[served % TREATS.length] };
    served++;
    start(S.head);
    if (S.head) say(`Think in your head. ${q.a} ${q.op === "+" ? "plus" : "take away"} ${q.b}. How many?`);
    else if (q.op === "+") say(`${q.a} treats are baked. The order is ${q.a} plus ${q.b}. Tap Bake for each one more.`);
    else say(`There are ${q.a} treats. The customer buys ${q.b}. Tap ${q.b} treats to give them.`);
    return true;
  }
  function close() { if (layer) { layer.hidden = true; layer.innerHTML = ""; } S = null; }
  window.CafeOrders = { play, close, isOpen: () => !!layer && !layer.hidden, state: () => S && { phase: S.phase, ans: S.q.ans, count: S.count, b: S.q.b, op: S.q.op } };
})();
