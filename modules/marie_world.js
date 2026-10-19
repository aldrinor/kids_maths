/* marie_world.js - Marie's world (19 Oct 2026): her Cafe customers, her Garden and her Pet, next to her House.
   Calm and kind: plants never die, the pet never gets sad or sick, nothing is lost by missing a day.
   Plants grow one step when she waters them on a day she did maths, so the garden follows the maths, not the clock.
   Uses the page's globals: P, who, save, speak, ART, renderTop, HomeGame, KidsEngine. */
(function () {
  "use strict";
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const SEEDS = [
    { id: "tulip", name: "Tulip", price: 3 }, { id: "sunflower", name: "Sunflower", price: 4 }, { id: "strawberry", name: "Strawberry", price: 5 },
    { id: "cherries", name: "Cherry tree", price: 6 }, { id: "watermelon", name: "Watermelon", price: 6 }, { id: "blossom", name: "Blossom", price: 4 }
  ];
  const PETS = [{ id: "cat", name: "Kitten" }, { id: "bunny", name: "Bunny" }, { id: "puppy", name: "Puppy" }, { id: "panda", name: "Panda" }, { id: "penguin", name: "Penguin" }];
  const TOYS = [{ id: "ribbon", name: "Ribbon", price: 5 }, { id: "balloon", name: "Balloon", price: 6 }, { id: "yoyo", name: "Yo-yo", price: 6 }, { id: "crown", name: "Crown", price: 15 }];
  const CUSTOMERS = ["bear", "bunny", "panda", "penguin", "puppy", "cat"];
  const PLOTS = 6, STAGES = 4;
  const today = () => KidsEngine.dayKey(Date.now());
  const didMathsToday = () => ((P.days || {})[today()] || { sets: 0 }).sets > 0;
  let host = null, part = "house";

  const CSS = `.mw { height: 100%; box-sizing: border-box; padding: 8px; display: flex; flex-direction: column; gap: 8px; }
.mw-page { max-width: 820px; margin: 0 auto; display: grid; gap: 10px; }
.mw-tabs { display: flex; gap: 8px; justify-content: center; }
.mw-tabs button { padding: 8px 16px; border: 3px solid #3b2a33; border-radius: 14px; background: #fffaf3; font-size: 16px; font-weight: 800; line-height: 1; }
.mw-tabs button[aria-pressed="true"] { background: #c9ecd9; }
.mw-tabs { flex: none; }
.mw-body { flex: 1; min-height: 0; position: relative; overflow: auto; }
.mw-plots { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
.mw-plot { display: grid; justify-items: center; gap: 4px; padding: 8px; border: 3px solid #3b2a33; border-radius: 16px; background: #f2e6d4; font-size: 14px; font-weight: 800; line-height: 1.2; }
.mw-plot img, .mw-plot svg { width: 64px; height: 64px; }
.mw-shop { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 8px; }
.mw-shop button { display: grid; justify-items: center; gap: 2px; padding: 8px; border: 3px solid #3b2a33; border-radius: 14px; background: #fffaf3; font-size: 14px; font-weight: 800; line-height: 1.2; }
.mw-shop button[disabled] { opacity: .5; } .mw-shop img { width: 40px; height: 40px; }
.mw-pet { display: grid; justify-items: center; gap: 8px; text-align: center; }
.mw-pet .me { position: relative; width: 150px; height: 150px; } .mw-pet .me img.p { width: 150px; height: 150px; }
.mw-pet .me img.t { position: absolute; width: 50px; height: 50px; }
.mw-acts { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; }
.mw-cafe { position: relative; width: min(520px, 86vw); border-radius: 22px; overflow: hidden; background: #fdf1f4; border: 1px solid rgba(0,0,0,.12); }
.mw-cafe-wall { position: absolute; inset: 0 0 34% 0; background-image: radial-gradient(#f7d6e0 2px, transparent 2.5px); background-size: 22px 22px; }
.mw-cafe-row { position: relative; display: flex; align-items: flex-end; justify-content: space-between; padding: 10px 10px 0; gap: 6px; }
.mw-cafe-row svg { flex: none; }
.mw-cafe-order { align-self: center; background: #fff; border-radius: 16px; padding: 8px 10px; font-weight: 700; border: 1px solid rgba(0,0,0,.1); text-align: center; }
.mw-cafe-tray { display: flex; gap: 4px; justify-content: center; margin-top: 6px; } .mw-cafe-tray img { width: 28px; height: 28px; }
.mw-cafe-counter { position: relative; height: 26px; background: linear-gradient(#e8c9a8, #d9b48c); border-top: 2px solid #c79a64; }
@media (max-width: 420px) { .mw-cafe-row svg { width: 80px; height: 104px; } .mw-cafe-tray img { width: 20px; height: 20px; } }
.mw-scene { width: 100%; height: auto; border-radius: 22px; border: 1px solid rgba(0,0,0,.12); display: block; }
.mw-bed { cursor: pointer; } .mw-bed:focus-visible { outline: 3px solid #e5779b; }
.mw-bed.ready rect { stroke: #e2b23f; stroke-width: 3; }
.mw-note { margin: 0; text-align: center; font-weight: 800; color: #6e5562; }
.mw-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
.mw-acts button { padding: 10px 16px; border: 3px solid #3b2a33; border-radius: 14px; background: #cfe6fb; font-size: 16px; font-weight: 800; line-height: 1; }`;
  function css() { if (document.getElementById("mw-css")) return; const s = document.createElement("style"); s.id = "mw-css"; s.textContent = CSS; document.head.appendChild(s); }

  function mount(el) {
    css(); host = el;
    el.innerHTML = `<div class="mw"><div class="mw-tabs" role="group" aria-label="Marie's places">${[["house", "House"], ["garden", "Garden"], ["pet", "Pet"]].map(([k, n]) =>
      `<button type="button" data-part="${k}" aria-pressed="${part === k}">${n}</button>`).join("")}</div><div class="mw-body"></div></div>`;
    el.querySelectorAll("[data-part]").forEach(b => b.onclick = () => { if (part === "house" && window.HomeGame) HomeGame.unmount(); part = b.dataset.part; mount(el); });
    const body = el.querySelector(".mw-body");
    if (part === "house") HomeGame.mount(body, { artBase: "art2/" });
    else { const pg = document.createElement("div"); pg.className = "mw-page"; body.appendChild(pg); if (part === "garden") garden(pg); else pet(pg); }
  }
  function unmount() { if (part === "house" && window.HomeGame) HomeGame.unmount(); if (host) host.innerHTML = ""; host = null; }
  const spend = n => { if (P.stars < n) return false; P.stars -= n; save(); if (typeof renderTop === "function") renderTop(); return true; };

  /* ---------- Garden ---------- */
  function sprout(stage) {
    if (stage === 0) return '<g><ellipse cx="0" cy="8" rx="20" ry="7" fill="#8a6a4e"/><circle cx="0" cy="3" r="4" fill="#c79a64"/></g>';
    const h = stage === 1 ? 18 : 30;
    return `<g><ellipse cx="0" cy="8" rx="20" ry="7" fill="#8a6a4e"/><path d="M0 8 V${8 - h}" stroke="#5aa469" stroke-width="4" stroke-linecap="round"/>
      <ellipse cx="-9" cy="${4 - h / 2}" rx="9" ry="5" fill="#7cc48a" transform="rotate(-25 -9 ${4 - h / 2})"/><ellipse cx="9" cy="${-h / 2}" rx="9" ry="5" fill="#7cc48a" transform="rotate(25 9 ${-h / 2})"/></g>`;
  }
  const mimiArt = (pose, w) => window.KittyChars ? KittyChars.full("kitty", pose).replace("<svg", `<svg width="${w}" height="${Math.round(w * 1.3)}"`) : "";
  function garden(el) {
    const G = (P.garden = P.garden || { plots: Array(PLOTS).fill(null), harvest: 0 }), d = today(), can = didMathsToday();
    const BX = [70, 170, 270, 370, 470, 570];
    const bed = (p, i) => {
      const x = BX[i], y = 250;
      let plant = "";
      if (p) plant = p.stage >= STAGES - 1 ? `<image href="${ART(p.id)}" x="${x - 26}" y="${y - 62}" width="52" height="52"/>` : p.stage >= 2 ? `<g transform="translate(${x} ${y})">${sprout(2)}</g>` : `<g transform="translate(${x} ${y})">${sprout(p.stage)}</g>`;
      const label = !p ? "Empty bed" : p.stage >= STAGES - 1 ? `${SEEDS.find(q => q.id === p.id).name}, ready to pick` : `${SEEDS.find(q => q.id === p.id).name}, step ${p.stage + 1} of ${STAGES}${p.watered === d ? ", watered today" : ""}`;
      return `<g class="mw-bed${p && p.stage >= STAGES - 1 ? " ready" : ""}" data-bed="${i}" role="button" tabindex="0" aria-label="${esc(label)}">
        <rect x="${x - 42}" y="${y - 8}" width="84" height="40" rx="10" fill="#9c7454" stroke="#3b2a33" stroke-width="2"/>${plant}
        ${p && p.watered === d && p.stage < STAGES - 1 ? `<circle cx="${x + 30}" cy="${y - 20}" r="5" fill="#9fd0f2"/>` : ""}</g>`;
    };
    el.innerHTML = `<h2>Marie's garden</h2>
      <svg class="mw-scene" viewBox="0 0 640 320" role="group" aria-label="Your garden">
        <rect width="640" height="320" fill="#eaf4fb"/><circle cx="560" cy="60" r="30" fill="#ffe9a8"/>
        <path d="M0 210 Q160 180 320 205 T640 195 V320 H0 Z" fill="#cfe8c4"/><rect y="285" width="640" height="35" fill="#bfe0b2"/>
        ${Array.from({ length: 17 }, (_, k) => `<rect x="${8 + k * 38}" y="168" width="14" height="44" rx="6" fill="#fffaf3" stroke="#3b2a33" stroke-width="1.5"/>`).join("")}
        <rect x="0" y="180" width="640" height="8" fill="#fffaf3" stroke="#3b2a33" stroke-width="1.5"/>
        ${G.plots.map(bed).join("")}
        <svg x="590" y="150" width="56" height="73" viewBox="0 0 200 260">${window.KittyChars ? KittyChars.full("kitty", "wave").replace(/^<svg[^>]*>|<\/svg>$/g, "") : ""}</svg>
      </svg>
      <p class="mw-note">${can ? "You did maths today. Tap a plant to water it once. Tap a ready one to pick it." : "Do some maths today, then come back to water your plants."} You have ${P.stars} stars.${G.harvest ? ` You picked ${G.harvest} so far.` : ""}</p>
      <h3>Seeds</h3><div class="mw-shop">${SEEDS.map(q => `<button type="button" data-seed="${q.id}"${P.stars < q.price || !G.plots.includes(null) ? " disabled" : ""}><img src="${ART(q.id)}" alt="">${esc(q.name)}<span>${q.price} stars</span></button>`).join("")}</div>
      <div class="mw-hidden">${G.plots.map((p, i) => p ? (p.stage >= STAGES - 1 ? `<button type="button" data-pick="${i}">Pick ${i + 1}</button>` : `<button type="button" data-water="${i}"${!can || p.watered === d ? " disabled" : ""}>Water ${i + 1}</button>`) : "").join("")}</div>`;
    const act = i => { const p = G.plots[i]; if (!p) return;
      if (p.stage >= STAGES - 1) { G.plots[i] = null; G.harvest++; P.pantry = (P.pantry || 0) + 1; P.stars += 1; save(); if (typeof renderTop === "function") renderTop(); speak("You picked it! It goes to your cafe kitchen. Plus 1 star."); return garden(el); }
      if (!can) return speak("Do some maths today first, then you can water it.");
      if (p.watered === d) return speak("You watered this one today. It will grow more tomorrow.");
      p.watered = d; p.stage = Math.min(STAGES - 1, p.stage + 1); save(); speak(p.stage >= STAGES - 1 ? "It is ready to pick!" : "It grew a little."); garden(el); };
    el.querySelectorAll("[data-bed]").forEach(g => { g.onclick = () => act(+g.dataset.bed); g.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); act(+g.dataset.bed); } }; });
    el.querySelectorAll("[data-water]").forEach(b => b.onclick = () => act(+b.dataset.water));
    el.querySelectorAll("[data-pick]").forEach(b => b.onclick = () => act(+b.dataset.pick));
    el.querySelectorAll("[data-seed]").forEach(b => b.onclick = () => { const q = SEEDS.find(x => x.id === b.dataset.seed), i = G.plots.indexOf(null); if (i < 0 || !spend(q.price)) return; G.plots[i] = { id: q.id, stage: 0, watered: "" }; save(); speak(`You planted a ${q.name}.`); garden(el); });
  }

  /* ---------- Pet ---------- */
  function pet(el) {
    const T = P.pet;
    if (!T) {
      el.innerHTML = `<div class="mw-pet"><h2>Choose your pet</h2><div class="mw-shop">${PETS.map(p => `<button type="button" data-pet="${p.id}"><img src="${ART(p.id)}" alt="">${p.name}</button>`).join("")}</div></div>`;
      el.querySelectorAll("[data-pet]").forEach(b => b.onclick = () => { const p = PETS.find(x => x.id === b.dataset.pet); P.pet = { id: p.id, name: p.name, toys: [], wear: "", pats: 0, meals: 0 }; save(); speak(`Hello, little ${p.name}!`); pet(el); });
      return;
    }
    const wear = T.wear ? `<image href="${ART(T.wear)}" x="${T.wear === "crown" ? 300 : 360}" y="${T.wear === "crown" ? 92 : 150}" width="${T.wear === "crown" ? 60 : 52}" height="${T.wear === "crown" ? 60 : 52}"/>` : "";
    el.innerHTML = `<h2>${esc(T.name)}</h2>
      <svg class="mw-scene" viewBox="0 0 640 320" role="img" aria-label="${esc(T.name)} in the cosy room${T.wear ? ", wearing the " + T.wear : ""}.">
        <rect width="640" height="320" fill="#fdf1f4"/><rect y="230" width="640" height="90" fill="#f0dcc4"/>
        <rect x="70" y="50" width="120" height="100" rx="10" fill="#dcebfb" stroke="#3b2a33" stroke-width="2.5"/><path d="M130 50 V150 M70 100 H190" stroke="#3b2a33" stroke-width="2"/>
        <ellipse cx="330" cy="268" rx="170" ry="34" fill="#e5779b" opacity=".35"/>
        <image href="${ART(T.id)}" x="250" y="110" width="160" height="160"/>${wear}
        <svg x="470" y="110" width="110" height="143" viewBox="0 0 200 260">${window.KittyChars ? KittyChars.full("kitty", "happy").replace(/^<svg[^>]*>|<\/svg>$/g, "") : ""}</svg>
      </svg>
      <p id="mwSay" class="mw-note" aria-live="polite">${esc(T.name)} is happy to see you.</p>
      <div class="mw-acts"><button type="button" data-act="pat">Pat</button><button type="button" data-act="brush">Brush</button><button type="button" data-act="feed">Feed${P.pantry ? ` (${P.pantry} from your garden)` : " (1 star)"}</button></div>
      <div class="set"><label for="mwName">Pet's name</label><input id="mwName" maxlength="16" value="${esc(T.name)}"><button class="mini" id="mwNameOk" type="button">Save name</button></div>
      <h3>Toys and clothes</h3><div class="mw-shop">${TOYS.map(t => { const own = T.toys.includes(t.id);
        return `<button type="button" data-toy="${t.id}"${!own && P.stars < t.price ? " disabled" : ""}><img src="${ART(t.id)}" alt="">${t.name}<span>${own ? (T.wear === t.id ? "Wearing it" : "Put it on") : `${t.price} stars`}</span></button>`; }).join("")}</div>`;
    const said = t => { el.querySelector("#mwSay").textContent = t; speak(t); };
    el.querySelectorAll("[data-act]").forEach(b => b.onclick = () => {
      const a = b.dataset.act;
      if (a === "pat") { T.pats++; save(); said(`${T.name} purrs softly. You are a kind friend.`); }
      else if (a === "brush") { save(); said(`${T.name}'s fur is soft and shiny now.`); }
      else { if (P.pantry > 0) P.pantry--; else if (!spend(1)) return said("You need 1 star to buy food. Do some maths to earn stars."); T.meals++; save(); said(`Yum! ${T.name} loved that.`); pet(el); }
    });
    el.querySelector("#mwNameOk").onclick = () => { const v = el.querySelector("#mwName").value.trim(); if (v) { T.name = v; save(); pet(el); } };
    el.querySelectorAll("[data-toy]").forEach(b => b.onclick = () => {
      const t = TOYS.find(x => x.id === b.dataset.toy);
      if (!T.toys.includes(t.id)) { if (!spend(t.price)) return; T.toys.push(t.id); }
      T.wear = T.wear === t.id ? "" : t.id; save(); pet(el);
    });
  }

  /* ---------- Cafe: every 5 answers a customer comes; Marie cooks and decorates their order ---------- */
  // The cafe moment after 5 answers: Mimi behind the counter, a friend ordering, and the treats her answers earned.
  const FRIENDS_IN = ["melody", "kuromi", "purin", "cinna"];
  const ORDER = ["cupcake", "donut", "cookie", "strawberry", "icecream", "pancakes", "croissant", "shortcake"];
  function customer(cardHtml, go) {
    css();
    const k = (P.cafe && P.cafe.served) || 0, friend = FRIENDS_IN[k % FRIENDS_IN.length];
    const name = window.KittyChars ? KittyChars.names[friend] : "A friend";
    const treats = Array.from({ length: 5 }, (_, i) => ORDER[(k + i) % ORDER.length]);
    const art = (id, pose) => window.KittyChars ? KittyChars.full(id, pose).replace("<svg", '<svg width="120" height="156"') : "";
    const html = `<div class="mw-cafe" role="img" aria-label="${esc(name)} is at the counter of Marie's Cafe.">
        <div class="mw-cafe-wall"></div>
        <div class="mw-cafe-row">${art("kitty", "wave")}<div class="mw-cafe-order"><b>${esc(name)}:</b> "Five treats, please!"
          <div class="mw-cafe-tray">${treats.map(t => `<img src="${ART(t)}" alt="">`).join("")}</div></div>${art(friend, "happy")}</div>
        <div class="mw-cafe-counter"></div></div>
      <h2>Marie's Cafe</h2><p>Your 5 answers made the treats. Now decorate them for ${esc(name)}.</p>
      <button class="main-btn" type="button" id="cafeGo">Decorate</button>`;
    cardHtml(html);
    document.getElementById("cafeGo").onclick = () => { P.cafe = P.cafe || { served: 0 }; P.cafe.served++; save(); go(); };
    speak(`${name} came to your cafe and wants five treats. Let's decorate them.`);
  }
  window.MarieWorld = { mount, unmount, customer };
})();
