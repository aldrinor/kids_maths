/* knight.js - Kennedy's world (19 Oct 2026): the knight, the bad guy, the castle shop and castle defence.
   No one is ever hurt: right answers make the bad guy tired, and after 5 he runs back home.
   Calm: soft colours, no flashing, no shaking, no timers. Uses the page's globals: P, who, save, speak, say, gen, $. */
(function () {
  "use strict";
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  // The shop. Prices in coins; 5 coins for each bad guy sent home, so a new piece comes about every 2 sessions.
  const SHOP = [
    { id: "wall", name: "Castle wall", price: 10, kind: "Castle" }, { id: "tower_l", name: "Left tower", price: 15, kind: "Castle", needs: "wall" },
    { id: "tower_r", name: "Right tower", price: 15, kind: "Castle", needs: "wall" }, { id: "gate", name: "Big gate", price: 20, kind: "Castle", needs: "wall" },
    { id: "flag", name: "Flag", price: 10, kind: "Castle", needs: "tower_l" }, { id: "bridge", name: "Bridge", price: 20, kind: "Castle", needs: "gate" },
    { id: "moat", name: "Water moat", price: 25, kind: "Castle", needs: "bridge" },
    { id: "plume", name: "Helmet feather", price: 10, kind: "Knight" }, { id: "shield", name: "Shield", price: 15, kind: "Knight" },
    { id: "armour", name: "Shiny armour", price: 25, kind: "Knight" }, { id: "sword", name: "Wooden sword", price: 15, kind: "Knight" },
    { id: "sword2", name: "Silver sword", price: 30, kind: "Knight", needs: "sword" },
    { id: "buddy", name: "Buddy knight", price: 40, kind: "Friends" }, { id: "horse", name: "Horse", price: 40, kind: "Friends" }
  ];
  const has = id => (P.castle || []).includes(id);
  const INK = "#3b2a33";

  /* ---------- Drawings (our own) ---------- */
  /* Drawings come from knight_art.js (window.KnightArt). sized() sets the svg's own size or position. */
  function sized(svg, attrs) { return svg.replace(/^<svg /, "<svg " + attrs + " "); }
  function knightSVG(size) {
    const opts = { armour: has("armour"), plume: has("plume"), shield: has("shield"), sword: has("sword2") ? "silver" : has("sword") ? "wood" : "none" };
    return sized(KnightArt.full("knight", "stand", opts), `width="${size}" height="${Math.round(size * 1.3)}"`);
  }
  function badSVG(tired, size) {
    const pose = tired >= 5 ? "runaway" : tired >= 2 ? "tired" : "grumpy";
    return sized(KnightArt.full("badguy", pose), `width="${size}" height="${Math.round(size * 1.3)}"`);
  }
  function castleSVG() {
    const w = has("wall"), g = has("gate");
    return `<svg viewBox="0 0 320 200" class="kn-castle" role="img" aria-label="Your castle: ${(P.castle || []).map(id => (SHOP.find(s => s.id === id) || {}).name).filter(Boolean).join(", ") || "not built yet"}">
      <rect x="0" y="0" width="320" height="200" fill="#e8f2fb"/><rect x="0" y="150" width="320" height="50" fill="#cfe8c4"/>
      ${has("moat") ? `<rect x="40" y="160" width="240" height="18" rx="9" fill="#9fd0f2" stroke="${INK}" stroke-width="2"/>` : ""}
      ${w ? `<rect x="80" y="80" width="160" height="75" fill="#e9dcc9" stroke="${INK}" stroke-width="3"/>${[0, 1, 2, 3, 4, 5, 6].map(i => `<rect x="${82 + i * 23}" y="68" width="14" height="14" fill="#e9dcc9" stroke="${INK}" stroke-width="2.5"/>`).join("")}` : `<rect x="80" y="135" width="160" height="20" fill="none" stroke="${INK}" stroke-width="2" stroke-dasharray="6 5"/><text x="160" y="125" text-anchor="middle" font-size="14" font-weight="800" fill="${INK}">Build your wall first</text>`}
      ${has("tower_l") ? `<rect x="50" y="50" width="42" height="105" fill="#ddd0bc" stroke="${INK}" stroke-width="3"/><path d="M46 52 L71 22 L96 52 Z" fill="#c0305c" stroke="${INK}" stroke-width="3"/>` : ""}
      ${has("tower_r") ? `<rect x="228" y="50" width="42" height="105" fill="#ddd0bc" stroke="${INK}" stroke-width="3"/><path d="M224 52 L249 22 L274 52 Z" fill="#4f7ff0" stroke="${INK}" stroke-width="3"/>` : ""}
      ${has("flag") ? `<path d="M71 22 V4" stroke="${INK}" stroke-width="2.5"/><path d="M71 4 L90 10 L71 16 Z" fill="#ffd45c" stroke="${INK}" stroke-width="2"/>` : ""}
      ${g ? `<path d="M140 155 V118 Q160 96 180 118 V155 Z" fill="#8a6a4e" stroke="${INK}" stroke-width="3"/>` : ""}
      ${has("bridge") ? `<rect x="138" y="155" width="44" height="26" fill="#c79a64" stroke="${INK}" stroke-width="2.5"/>` : ""}
      ${has("horse") ? sized(KnightArt.full("horse", "stand"), 'x="8" y="96" width="78" height="78"') : ""}
      ${has("buddy") ? sized(KnightArt.full("buddy", "stand"), 'x="258" y="92" width="52" height="68"') : ""}
    </svg>`;
  }

  /* ---------- CSS ---------- */
  const CSS = `.kn-bar { position: fixed; z-index: 40; top: 6px; left: 50%; transform: translateX(-50%); display: flex; align-items: center; gap: 8px;
  padding: 2px 10px; background: #fffaf3; border: 2px solid ${INK}; border-radius: 16px; }
.kn-bar[hidden] { display: none; }
.kn-tired { display: flex; gap: 3px; } .kn-tired i { width: 12px; height: 12px; border-radius: 50%; border: 2px solid ${INK}; background: #fff; } .kn-tired i.on { background: #b6d68a; }
.kn-world { padding: 12px; display: grid; gap: 12px; max-width: 760px; margin: 0 auto; }
.kn-castle { width: 100%; height: auto; border: 3px solid ${INK}; border-radius: 18px; background: #e8f2fb; }
.kn-shop { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 8px; }
.kn-item { display: grid; gap: 4px; padding: 10px; border: 3px solid ${INK}; border-radius: 16px; background: #fffaf3; font: 800 16px/1.2 inherit; text-align: center; }
.kn-item[disabled] { opacity: .55; } .kn-item.own { background: #c9ecd9; }
.kn-def { display: grid; gap: 10px; justify-items: center; text-align: center; }
.kn-ladders { display: flex; gap: 10px; justify-content: center; }
.kn-ladder { width: 34px; height: 90px; border: 3px solid #8a6a4e; border-radius: 6px; background: repeating-linear-gradient(#fff0 0 12px, #8a6a4e 12px 15px); }
.kn-ladder.down { height: 22px; opacity: .5; }
.kn-q { font: 800 34px/1 inherit; }
.kn-keys { display: grid; grid-template-columns: repeat(6, 54px); gap: 6px; }
.kn-keys button { height: 54px; border: 3px solid ${INK}; border-radius: 14px; background: #cfe6fb; font: 800 22px/1 inherit; }`;
  function css() { if (document.getElementById("kn-css")) return; const s = document.createElement("style"); s.id = "kn-css"; s.textContent = CSS; document.head.appendChild(s); }

  /* ---------- The battle bar during Kennedy's maths ---------- */
  function bar() { css(); let b = document.getElementById("knBar"); if (!b) { b = document.createElement("div"); b.id = "knBar"; b.className = "kn-bar"; b.setAttribute("aria-hidden", "true"); document.body.appendChild(b); } return b; }
  function showBar(tired) {
    const b = bar(); b.hidden = false;
    b.innerHTML = `${knightSVG(30)}<span class="kn-tired">${Array.from({ length: 5 }, (_, i) => `<i class="${i < tired ? "on" : ""}"></i>`).join("")}</span>${badSVG(tired, 30)}`;
  }
  function hideBar() { const b = document.getElementById("knBar"); if (b) b.hidden = true; }

  /* ---------- The Castle tab ---------- */
  let host = null;
  function mount(el) {
    css(); host = el;
    const coins = P.coins || 0, groups = ["Castle", "Knight", "Friends"];
    el.innerHTML = `<div class="kn-world"><h2>Kennedy's castle</h2><p>You have ${coins} coins. Send bad guys home to win more.</p>${castleSVG()}
      <div style="display:flex;justify-content:center">${knightSVG(90)}</div>
      ${groups.map(g => `<h3>${g}</h3><div class="kn-shop">${SHOP.filter(s => s.kind === g).map(s => {
        const own = has(s.id), locked = s.needs && !has(s.needs), cant = !own && (locked || coins < s.price);
        return `<button type="button" class="kn-item${own ? " own" : ""}" data-buy="${s.id}"${own || cant ? " disabled" : ""}>${esc(s.name)}<span>${own ? "You have it" : locked ? `First get: ${esc(SHOP.find(x => x.id === s.needs).name)}` : `${s.price} coins`}</span></button>`; }).join("")}</div>`).join("")}</div>`;
    el.querySelectorAll("[data-buy]").forEach(b => b.onclick = () => {
      const s = SHOP.find(x => x.id === b.dataset.buy);
      if (!s || has(s.id) || (P.coins || 0) < s.price) return;
      P.coins -= s.price; P.castle = (P.castle || []).concat(s.id); save(); if (typeof renderTop === "function") renderTop();
      speak(`You got the ${s.name}!`); mount(el);
    });
  }
  function unmount() { if (host) { host.innerHTML = ""; host = null; } }

  /* ---------- Castle defence: after 20 answers in a day. Each right answer pushes one ladder away. ---------- */
  function defence(container, level, done) {
    css();
    let left = 5, q = null, typed = "", tries = 0;
    const next = () => { q = gen(level); window.KnightWorld._q = q; typed = ""; tries = 0; draw(); speak(`${q.a} ${q.op === "+" ? "plus" : "take away"} ${q.b}`); };
    function draw(msg) {
      container.innerHTML = `<div class="cover-card kn-def"><h2>Defend the castle!</h2>
        <p>${msg || "Bad guys bring ladders. Each right answer pushes a ladder away."}</p>
        <div class="kn-ladders" aria-label="${left} ladders left">${Array.from({ length: 5 }, (_, i) => `<div class="kn-ladder${i >= left ? " down" : ""}"></div>`).join("")}</div>
        <div class="kn-q" aria-live="polite">${q.a} ${q.op === "+" ? "+" : "−"} ${q.b} = ${typed || "?"}</div>
        <div class="kn-keys">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(k => `<button type="button" data-k="${k}">${k}</button>`).join("")}<button type="button" data-k="del" aria-label="Delete">⌫</button><button type="button" data-k="go" aria-label="Check">✓</button></div></div>`;
      container.querySelectorAll("[data-k]").forEach(b => b.onclick = () => press(b.dataset.k));
    }
    function press(k) {
      if (k === "del") { typed = typed.slice(0, -1); return draw(); }
      if (k !== "go") { if (typed.length < 3) typed += k; return draw(); }
      if (!typed) return;
      if (+typed === q.ans) {
        left--;
        if (!left) { P.coins = (P.coins || 0) + 10; save(); if (typeof renderTop === "function") renderTop(); container.innerHTML = `<div class="cover-card kn-def"><div class="hello">${knightSVG(80)}</div><h2>The castle is safe!</h2><p>All the bad guys went home. You win 10 coins.</p><button class="main-btn" type="button" id="knDefDone">Next</button></div>`; speak("The castle is safe! All the bad guys went home. You win 10 coins."); container.querySelector("#knDefDone").onclick = done; return; }
        speak("Push! The ladder falls back."); next(); draw("Push! The ladder falls back. Next ladder.");
      } else { tries++; typed = ""; draw(tries >= 2 ? "Count with your fingers. Take your time." : "Not quite. Try again."); }
    }
    next();
  }

  window.KnightWorld = { SHOP, mount, unmount, showBar, hideBar, defence, knightSVG, badSVG };
})();
