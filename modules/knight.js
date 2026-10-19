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
  // Each castle part as its own drawing, so the castle view and the shop pictures match.
  const PART = {
    moat: `<path d="M20 214 Q160 200 300 214 L300 232 Q160 218 20 232 Z" fill="#9fd0f2" stroke="${INK}" stroke-width="2.5"/>`,
    wall: `<rect x="80" y="110" width="160" height="96" fill="#e9dcc9" stroke="${INK}" stroke-width="3"/>${[0, 1, 2, 3, 4, 5, 6].map(i => `<rect x="${82 + i * 23}" y="96" width="14" height="16" fill="#e9dcc9" stroke="${INK}" stroke-width="2.5"/>`).join("")}<path d="M80 140 H240 M80 172 H240" stroke="#d6c4a9" stroke-width="2"/>`,
    tower_l: `<rect x="44" y="76" width="48" height="130" fill="#ddd0bc" stroke="${INK}" stroke-width="3"/><path d="M38 80 L68 40 L98 80 Z" fill="#c0305c" stroke="${INK}" stroke-width="3"/><rect x="60" y="110" width="16" height="22" rx="8" fill="#5a6f8f"/>`,
    tower_r: `<rect x="228" y="76" width="48" height="130" fill="#ddd0bc" stroke="${INK}" stroke-width="3"/><path d="M222 80 L252 40 L282 80 Z" fill="#3d6fd8" stroke="${INK}" stroke-width="3"/><rect x="244" y="110" width="16" height="22" rx="8" fill="#5a6f8f"/>`,
    flag: `<path d="M68 40 V14" stroke="${INK}" stroke-width="3"/><path d="M68 14 L94 21 L68 29 Z" fill="#ffd45c" stroke="${INK}" stroke-width="2"/>`,
    gate: `<path d="M136 206 V160 Q160 134 184 160 V206 Z" fill="#8a6a4e" stroke="${INK}" stroke-width="3"/><path d="M160 140 V206 M146 152 V206 M174 152 V206" stroke="#6d5240" stroke-width="2"/>`,
    bridge: `<path d="M132 206 H188 L196 228 H124 Z" fill="#c79a64" stroke="${INK}" stroke-width="2.5"/><path d="M140 210 V226 M152 210 V226 M164 210 V226 M176 210 V226" stroke="#a87b4c" stroke-width="2"/>`
  };
  const PART_ORDER = ["moat", "wall", "tower_l", "tower_r", "flag", "gate", "bridge"];
  function castleSVG() {
    const owned = (P.castle || []).map(id => (SHOP.find(s => s.id === id) || {}).name).filter(Boolean);
    return `<svg viewBox="0 0 320 250" class="kn-castle" role="img" aria-label="Your castle. Built: ${owned.join(", ") || "nothing yet"}.">
      <rect width="320" height="250" fill="#e3eefa"/><path d="M0 190 Q90 160 170 186 T320 178 V250 H0 Z" fill="#cfe8c4"/><rect y="206" width="320" height="44" fill="#bfe0b2"/>
      ${PART_ORDER.map(id => `<g class="${has(id) ? "" : "kn-ghost"}">${PART[id]}</g>`).join("")}
      <g class="${has("horse") ? "" : "kn-ghost"}">${sized(KnightArt.full("horse", "stand"), 'x="2" y="150" width="78" height="78"')}</g>
      <g class="${has("buddy") ? "" : "kn-ghost"}">${sized(KnightArt.full("buddy", "stand"), 'x="262" y="146" width="56" height="74"')}</g>
      ${sized(knightSVG(60), 'x="196" y="150"').replace(/width="60" height="78"/, 'width="60" height="78"')}
    </svg>`;
  }
  // A small picture for each thing in the shop.
  function shopPic(id) {
    const BOX = { wall: "72 88 176 124", tower_l: "30 34 76 178", tower_r: "214 34 76 178", flag: "30 6 76 206", gate: "124 128 72 84", bridge: "118 128 84 106", moat: "14 190 292 48" };
    if (PART[id]) return `<svg viewBox="${BOX[id]}" width="72" height="62" aria-hidden="true">${PART[id === "flag" ? "tower_l" : id === "bridge" ? "gate" : id]}${id === "flag" ? PART.flag : ""}${id === "bridge" ? PART.bridge : ""}</svg>`;
    if (id === "buddy" || id === "horse") return sized(KnightArt.full(id, "stand"), 'width="62" height="66"');
    const opts = { armour: id === "armour", plume: id === "plume", shield: id === "shield", sword: id === "sword2" ? "silver" : id === "sword" ? "wood" : "none" };
    return sized(KnightArt.full("knight", "stand", opts), 'width="52" height="66"');
  }

  /* ---------- CSS ---------- */
  const CSS = `.kn-bar { position: fixed; z-index: 40; top: 6px; left: 50%; transform: translateX(-50%); display: flex; align-items: center; gap: 8px;
  padding: 2px 10px; background: #fffaf3; border: 2px solid ${INK}; border-radius: 16px; }
.kn-bar[hidden] { display: none; }
.kn-tired { display: flex; gap: 3px; } .kn-tired i { width: 12px; height: 12px; border-radius: 50%; border: 2px solid ${INK}; background: #fff; } .kn-tired i.on { background: #b6d68a; }
.kn-world { padding: 12px; display: grid; gap: 12px; max-width: 760px; margin: 0 auto; }
.kn-castle { width: 100%; height: auto; border: 3px solid ${INK}; border-radius: 18px; background: #e8f2fb; }
.kn-shop { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 8px; }
.kn-item { display: grid; gap: 4px; padding: 10px; border: 3px solid ${INK}; border-radius: 16px; background: #fffaf3; font-size: 16px; font-weight: 800; line-height: 1.2; text-align: center; }
.kn-item[disabled] { opacity: .55; } .kn-item.own { background: #e3f5ee; opacity: 1; }
.kn-item svg { justify-self: center; } .kn-item b { font-size: 15px; }
.kn-ghost { opacity: .16; }
.kn-note { margin: 0; text-align: center; font-weight: 800; color: #53627c; }
.kn-def { display: grid; gap: 10px; justify-items: center; text-align: center; }
.kn-ladders { display: flex; gap: 10px; justify-content: center; }
.kn-ladder { width: 34px; height: 90px; border: 3px solid #8a6a4e; border-radius: 6px; background: repeating-linear-gradient(#fff0 0 12px, #8a6a4e 12px 15px); }
.kn-ladder.down { height: 22px; opacity: .5; }
.kn-q { font-size: 34px; font-weight: 800; line-height: 1; }
.kn-keys { display: grid; grid-template-columns: repeat(6, 54px); gap: 6px; }
.kn-keys button { height: 54px; border: 3px solid ${INK}; border-radius: 14px; background: #cfe6fb; font-size: 22px; font-weight: 800; line-height: 1; }`;
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
    const next = SHOP.find(x => !has(x.id) && (!x.needs || has(x.needs)));
    el.innerHTML = `<div class="kn-world"><h2>Kennedy's castle</h2>${castleSVG()}
      <p class="kn-note">You have ${coins} coins.${next ? ` Next to build: ${esc(next.name)}, ${next.price} coins.` : " Your castle is complete!"} Faint parts are still to build.</p>
      ${groups.map(g => `<h3>${g}</h3><div class="kn-shop">${SHOP.filter(s => s.kind === g).map(s => {
        const own = has(s.id), locked = s.needs && !has(s.needs), cant = !own && (locked || coins < s.price);
        return `<button type="button" class="kn-item${own ? " own" : ""}" data-buy="${s.id}"${own || cant ? " disabled" : ""}>${shopPic(s.id)}<b>${esc(s.name)}</b><span>${own ? "You have it" : locked ? `First get: ${esc(SHOP.find(x => x.id === s.needs).name)}` : `${s.price} coins`}</span></button>`; }).join("")}</div>`).join("")}</div>`;
    el.querySelectorAll("[data-buy]").forEach(b => b.onclick = () => {
      const s = SHOP.find(x => x.id === b.dataset.buy);
      if (!s || has(s.id) || (P.coins || 0) < s.price) return;
      P.coins -= s.price; P.castle = (P.castle || []).concat(s.id); save(); if (typeof renderTop === "function") renderTop();
      speak(`You got the ${s.name}!`); mount(el);
    });
  }
  function unmount() { if (host) { host.innerHTML = ""; host = null; } }

  /* ---------- Castle defence: after 20 answers in a day. Each right answer pushes one ladder away. ---------- */
  /* ---------- Castle defence: after 20 answers in a day ----------
     A scene, not a card: the wall, the knight on top, 5 ladders with goblins climbing. Each right answer clears the
     next ladder: a push (the ladder tips back) or a soft rock beside it (the goblin runs off). Nobody is hurt. */
  const DEF_CSS = `.kd { width: min(980px, 100%); display: grid; gap: 10px; max-height: 100%; }
.kd-scene { width: 100%; height: auto; max-height: 52vh; display: block; margin: 0 auto; border-radius: 20px; border: 1px solid rgba(0,0,0,.12); background: #e3eefa; }
.kd-lad { transition: transform 1.2s ease-in, opacity 1.2s ease-in; transform-box: fill-box; transform-origin: 50% 100%; }
.kd-lad.push { transform: rotate(-38deg); opacity: 0; }
.kd-lad.rock { opacity: 0; transition-delay: .9s; }
.kd-gob { transition: transform 1.6s ease-in, opacity 1.6s ease-in; }
.kd-gob.gone { transform: translateX(-260px); opacity: 0; }
.kd-rock { transition: transform .9s ease-in; }
.kd-rock.drop { transform: translateY(250px); }
.kd-lad.next .rail { stroke: #e2b23f; }
.kd-panel { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 12px; align-items: center; background: #fff; border: 1px solid rgba(0,0,0,.12); border-radius: 20px; padding: 12px; }
.kd-q { font: 800 clamp(30px, 6vw, 48px)/1 var(--display, inherit); text-align: center; }
.kd-msg { margin: 6px 0 0; text-align: center; font-weight: 800; color: #53627c; }
.kd-keys { display: grid; grid-template-columns: repeat(6, 56px); gap: 6px; }
.kd-keys button { height: 56px; border-radius: 14px; border: 1px solid rgba(0,0,0,.14); background: #fff; font-size: 26px; font-weight: 800; color: #22314a; box-shadow: 0 2px 0 rgba(0,0,0,.12); }
.kd-keys button[data-k="go"] { background: #3d6fd8; color: #fff; border-color: #3d6fd8; }
@media (max-width: 620px) { .kd-panel { grid-template-columns: 1fr; } .kd-keys { grid-template-columns: repeat(6, minmax(0, 1fr)); } }
@media (prefers-reduced-motion: reduce) { .kd-lad, .kd-gob, .kd-rock { transition: opacity .15s; } }`;
  function defence(container, level, done) {
    css();
    if (!document.getElementById("kd-css")) { const st = document.createElement("style"); st.id = "kd-css"; st.textContent = DEF_CSS; document.head.appendChild(st); }
    const XS = [110, 290, 470, 650, 830], cleared = [false, false, false, false, false];
    let q = null, typed = "", tries = 0, turn = 0, busy = false, over = false;   // busy: a ladder is moving; taps wait
    const opts = { armour: has("armour"), plume: has("plume"), shield: has("shield"), sword: has("sword2") ? "silver" : has("sword") ? "wood" : "none" };
    const ladder = (x, i) => `<g class="kd-lad" data-lad="${i}"><g stroke="#8a6a4e" stroke-width="9" stroke-linecap="round" fill="none">
        <path class="rail" d="M${x} 470 L${x + 40} 175"/><path class="rail" d="M${x + 46} 470 L${x + 86} 175"/>
        ${[0, 1, 2, 3, 4, 5, 6].map(k => { const t = (k + .5) / 7, y = 470 - t * 295; return `<path d="M${x + t * 40} ${y} L${x + 46 + t * 40} ${y}" stroke-width="7"/>`; }).join("")}</g></g>`;
    const goblin = (x, i) => `<g class="kd-gob" data-gob="${i}"><svg x="${x - 10}" y="${250 + (i % 2) * 70}" width="100" height="130" viewBox="0 0 200 260">${KnightArt.full("badguy", "grumpy").replace(/^<svg[^>]*>|<\/svg>$/g, "")}</svg></g>`;
    container.innerHTML = `<div class="kd"><svg class="kd-scene" viewBox="0 0 1000 520" role="img" aria-label="The castle wall with ladders">
      <rect width="1000" height="520" fill="#e3eefa"/><path d="M0 400 Q250 350 500 395 T1000 380 V520 H0 Z" fill="#cfe8c4"/>
      <rect x="0" y="470" width="1000" height="50" fill="#bfe0b2"/>
      <rect x="40" y="180" width="920" height="292" fill="#e9dcc9" stroke="#3b2a33" stroke-width="3" opacity=".95"/>
      ${Array.from({ length: 23 }, (_, k) => `<rect x="${44 + k * 40}" y="150" width="26" height="32" fill="#e9dcc9" stroke="#3b2a33" stroke-width="3"/>`).join("")}
      ${Array.from({ length: 7 }, (_, r) => `<path d="M40 ${215 + r * 38} H960" stroke="#d6c4a9" stroke-width="2"/>`).join("")}
      <svg x="430" y="0" width="140" height="182" viewBox="0 0 200 260" class="kd-knight">${KnightArt.full("knight", "stand", opts).replace(/^<svg[^>]*>|<\/svg>$/g, "")}</svg>
      <circle class="kd-rock" cx="500" cy="200" r="0" fill="#a8a29a" stroke="#3b2a33" stroke-width="3"/>
      ${XS.map(ladder).join("")}${XS.map(goblin).join("")}
    </svg>
    <div class="kd-panel"><div><div class="kd-q" aria-live="polite"></div><p class="kd-msg" aria-live="polite"></p></div>
      <div class="kd-keys">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(k => `<button type="button" data-k="${k}">${k}</button>`).join("")}<button type="button" data-k="del" aria-label="Delete">⌫</button><button type="button" data-k="go" aria-label="Check">✓</button></div></div></div>`;
    const $c = sel => container.querySelector(sel);
    const nextLadder = () => cleared.findIndex(v => !v);
    function show(msg) {
      if (over) return;
      $c(".kd-q").textContent = `${q.a} ${q.op === "+" ? "+" : "−"} ${q.b} = ${typed || "?"}`;
      $c(".kd-msg").textContent = msg || "";
      container.querySelectorAll(".kd-lad").forEach((g, i) => g.classList.toggle("next", i === nextLadder()));
    }
    const next = () => { busy = false; q = gen(level); window.KnightWorld._q = q; typed = ""; tries = 0; show(`Ladder ${nextLadder() + 1}. Answer to clear it.`); speak(`${q.a} ${q.op === "+" ? "plus" : "take away"} ${q.b}`); };
    function clearLadder(i) {
      const lad = $c(`[data-lad="${i}"]`), gob = $c(`[data-gob="${i}"]`);
      const useRock = turn++ % 2 === 1;
      gob.innerHTML = gob.innerHTML.replace(/<svg([^>]*)>[\s\S]*<\/svg>/, (m, at) => `<svg${at}>${KnightArt.full("badguy", "runaway").replace(/^<svg[^>]*>|<\/svg>$/g, "")}</svg>`);
      if (useRock) {
        const rock = $c(".kd-rock"); rock.setAttribute("cx", XS[i] + 120); rock.setAttribute("r", 18); rock.classList.remove("drop"); void rock.getBBox();
        rock.classList.add("drop"); lad.classList.add("rock");
      } else lad.classList.add("push");
      setTimeout(() => gob.classList.add("gone"), 500);
      cleared[i] = true;
      return useRock ? "A soft rock! The goblin runs home." : "Push! The ladder tips back. The goblin runs home.";
    }
    function press(k) {
      if (busy || over) return;
      if (k === "del") { typed = typed.slice(0, -1); return show(); }
      if (k !== "go") { if (typed.length < 3) typed += k; return show(); }
      if (!typed) return;
      if (+typed !== q.ans) { tries++; typed = ""; return show(tries >= 2 ? "Count with your fingers. Take your time." : "Not quite. Try again."); }
      const said = clearLadder(nextLadder()); speak(said);
      if (nextLadder() < 0) {
        over = true;
        P.coins = (P.coins || 0) + 10; save(); if (typeof renderTop === "function") renderTop();
        $c(".kd-panel").innerHTML = `<div><div class="kd-q">The castle is safe!</div><p class="kd-msg">All the goblins went home. You win 10 coins.</p></div><button class="main-btn" type="button" id="knDefDone">Next</button>`;
        setTimeout(() => speak("The castle is safe! All the goblins went home. You win 10 coins."), 1400);
        $c("#knDefDone").onclick = done; return;
      }
      typed = ""; show(said); busy = true; setTimeout(next, 1500);
    }
    container.querySelectorAll("[data-k]").forEach(b => b.onclick = () => press(b.dataset.k));
    next();
  }

  window.KnightWorld = { SHOP, mount, unmount, showBar, hideBar, defence, knightSVG, badSVG };
})();
