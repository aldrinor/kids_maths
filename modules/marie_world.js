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
.mw-tabs button { padding: 8px 16px; border: 3px solid #3b2a33; border-radius: 14px; background: #fffaf3; font: 800 16px/1 inherit; }
.mw-tabs button[aria-pressed="true"] { background: #c9ecd9; }
.mw-tabs { flex: none; }
.mw-body { flex: 1; min-height: 0; position: relative; overflow: auto; }
.mw-plots { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
.mw-plot { display: grid; justify-items: center; gap: 4px; padding: 8px; border: 3px solid #3b2a33; border-radius: 16px; background: #f2e6d4; font: 800 14px/1.2 inherit; }
.mw-plot img, .mw-plot svg { width: 64px; height: 64px; }
.mw-shop { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 8px; }
.mw-shop button { display: grid; justify-items: center; gap: 2px; padding: 8px; border: 3px solid #3b2a33; border-radius: 14px; background: #fffaf3; font: 800 14px/1.2 inherit; }
.mw-shop button[disabled] { opacity: .5; } .mw-shop img { width: 40px; height: 40px; }
.mw-pet { display: grid; justify-items: center; gap: 8px; text-align: center; }
.mw-pet .me { position: relative; width: 150px; height: 150px; } .mw-pet .me img.p { width: 150px; height: 150px; }
.mw-pet .me img.t { position: absolute; width: 50px; height: 50px; }
.mw-acts { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; }
.mw-acts button { padding: 10px 16px; border: 3px solid #3b2a33; border-radius: 14px; background: #cfe6fb; font: 800 16px/1 inherit; }`;
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
    if (stage === 0) return '<svg viewBox="0 0 64 64" aria-hidden="true"><ellipse cx="32" cy="50" rx="20" ry="8" fill="#8a6a4e"/><circle cx="32" cy="44" r="4" fill="#c79a64"/></svg>';
    return '<svg viewBox="0 0 64 64" aria-hidden="true"><ellipse cx="32" cy="54" rx="20" ry="7" fill="#8a6a4e"/><path d="M32 54 V30" stroke="#5aa469" stroke-width="4" stroke-linecap="round"/><ellipse cx="24" cy="34" rx="9" ry="5" fill="#7cc48a" transform="rotate(-25 24 34)"/><ellipse cx="40" cy="30" rx="9" ry="5" fill="#7cc48a" transform="rotate(25 40 30)"/></svg>';
  }
  function garden(el) {
    const G = (P.garden = P.garden || { plots: Array(PLOTS).fill(null), harvest: 0 }), d = today(), can = didMathsToday();
    el.innerHTML = `<h2>Marie's garden</h2><p>${can ? "You did maths today, so you can water each plant once. Water makes it grow." : "Do some maths today, then come back to water your plants."} You have ${P.stars} stars. ${G.harvest ? `You picked ${G.harvest} flowers and fruits so far.` : ""}</p>
      <div class="mw-plots">${G.plots.map((p, i) => {
        if (!p) return `<div class="mw-plot">${sprout(0).replace("#c79a64", "#f2e6d4")}<span>Empty</span></div>`;
        const seed = SEEDS.find(s => s.id === p.id), done = p.stage >= STAGES - 1, wet = p.watered === d;
        return `<div class="mw-plot">${done ? `<img src="${ART(p.id)}" alt="">` : p.stage >= 2 ? `<img src="${ART("plant")}" alt="">` : sprout(p.stage)}
          <span>${esc(seed.name)}: ${done ? "ready" : `step ${p.stage + 1} of ${STAGES}`}</span>
          ${done ? `<button class="mini" type="button" data-pick="${i}">Pick it</button>` : `<button class="mini" type="button" data-water="${i}"${!can || wet ? " disabled" : ""}>${wet ? "Watered today" : "Water"}</button>`}</div>`; }).join("")}</div>
      <h3>Seeds</h3><div class="mw-shop">${SEEDS.map(s => `<button type="button" data-seed="${s.id}"${P.stars < s.price || !G.plots.includes(null) ? " disabled" : ""}><img src="${ART(s.id)}" alt="">${esc(s.name)}<span>${s.price} stars</span></button>`).join("")}</div>`;
    el.querySelectorAll("[data-seed]").forEach(b => b.onclick = () => { const s = SEEDS.find(x => x.id === b.dataset.seed), i = G.plots.indexOf(null); if (i < 0 || !spend(s.price)) return; G.plots[i] = { id: s.id, stage: 0, watered: "" }; save(); speak(`You planted a ${s.name}.`); garden(el); });
    el.querySelectorAll("[data-water]").forEach(b => b.onclick = () => { const p = G.plots[+b.dataset.water]; if (!p || !can || p.watered === d) return; p.watered = d; p.stage = Math.min(STAGES - 1, p.stage + 1); save(); speak(p.stage >= STAGES - 1 ? "It is ready to pick!" : "It grew a little."); garden(el); });
    el.querySelectorAll("[data-pick]").forEach(b => b.onclick = () => { const i = +b.dataset.pick, p = G.plots[i]; G.plots[i] = null; G.harvest++; P.pantry = (P.pantry || 0) + 1; P.stars += 1; save(); if (typeof renderTop === "function") renderTop(); speak(`You picked it! It goes to your cafe kitchen. Plus 1 star.`); garden(el); void p; });
  }

  /* ---------- Pet ---------- */
  function pet(el) {
    const T = P.pet;
    if (!T) {
      el.innerHTML = `<div class="mw-pet"><h2>Choose your pet</h2><div class="mw-shop">${PETS.map(p => `<button type="button" data-pet="${p.id}"><img src="${ART(p.id)}" alt="">${p.name}</button>`).join("")}</div></div>`;
      el.querySelectorAll("[data-pet]").forEach(b => b.onclick = () => { const p = PETS.find(x => x.id === b.dataset.pet); P.pet = { id: p.id, name: p.name, toys: [], wear: "", pats: 0, meals: 0 }; save(); speak(`Hello, little ${p.name}!`); pet(el); });
      return;
    }
    const wear = T.wear ? `<img class="t" src="${ART(T.wear)}" alt="" style="${T.wear === "crown" ? "top:-18px;left:50px" : "top:0;right:-10px"}">` : "";
    el.innerHTML = `<div class="mw-pet"><h2>${esc(T.name)}</h2><div class="me"><img class="p" src="${ART(T.id)}" alt="${esc(T.name)}">${wear}</div>
      <p id="mwSay" aria-live="polite">${esc(T.name)} is happy to see you.</p>
      <div class="mw-acts"><button type="button" data-act="pat">Pat</button><button type="button" data-act="brush">Brush</button><button type="button" data-act="feed">Feed${P.pantry ? ` (${P.pantry} from your garden)` : " (1 star)"}</button></div>
      <div class="set"><label for="mwName">Pet's name</label><input id="mwName" maxlength="16" value="${esc(T.name)}"><button class="mini" id="mwNameOk" type="button">Save name</button></div>
      <h3>Toys and clothes</h3><div class="mw-shop">${TOYS.map(t => { const own = T.toys.includes(t.id);
        return `<button type="button" data-toy="${t.id}"${!own && P.stars < t.price ? " disabled" : ""}><img src="${ART(t.id)}" alt="">${t.name}<span>${own ? (T.wear === t.id ? "Wearing it" : "Put it on") : `${t.price} stars`}</span></button>`; }).join("")}</div></div>`;
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
  function customer(cardHtml, go) {
    const c = CUSTOMERS[(P.cafe && P.cafe.served || 0) % CUSTOMERS.length];
    const html = `<div class="hello"><img src="${ART(c)}" alt="" style="width:90px;height:90px"></div><h2>A customer at Marie's Cafe!</h2>
      <p>Your 5 answers bought the ingredients. Let's cook their order.</p><button class="main-btn" type="button" id="cafeGo">Cook it</button>`;
    cardHtml(html);
    document.getElementById("cafeGo").onclick = () => { P.cafe = P.cafe || { served: 0 }; P.cafe.served++; save(); go(); };
    speak("A customer came to your cafe! Let's cook their order.");
  }
  window.MarieWorld = { mount, unmount, customer };
})();
