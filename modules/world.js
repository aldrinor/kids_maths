/* world.js - each child's world around every maths question (19 Oct 2026).
   The talk row at the top of every maths screen (Sums and the small games) becomes a scene:
   - Kennedy: his knight on the left, a bad guy on the right under 5 stars. Each right answer: the knight steps in and
     swings his toy sword, the bad guy loses a star. At 5 the bad guy is dizzy, then runs home. Nobody is hurt.
   - Marie: Mimi behind her cafe counter, a customer waiting, and a tray. Each right answer puts a treat on the tray.
   Calm: one slow movement per answer, no flashing, nothing moving while the child thinks.
   Uses KnightArt (knight_art.js) and KittyChars (characters.js) when loaded. Globals: who, P, ART. */
(function () {
  "use strict";
  const TREATS = ["cupcake", "donut", "cookie", "strawberry", "icecream", "pancakes", "croissant", "shortcake"];
  const CUSTOMERS = ["melody", "kuromi", "purin", "cinna"];
  let n = 0, customer = 0;

  const CSS = `
.say.scene, .tp-talk.scene { position: relative; display: grid !important; grid-template-rows: auto; grid-auto-flow: column; grid-template-columns: auto minmax(0, 1fr); grid-auto-columns: auto; align-items: end; gap: 8px;
  min-height: var(--scene-h, 150px); padding: 6px 12px 0; border-radius: 22px; overflow: hidden; border: 1px solid var(--line, rgba(0,0,0,.12)); }
.say.scene > .kitty, .tp-talk.scene > .tp-kitty { display: none !important; }
.say.scene > button, .tp-talk.scene > button { align-self: center; margin-bottom: 18px; position: relative; z-index: 2; }
.say.scene .bubble, .tp-talk.scene .tp-bubble { align-self: center; margin: 0 0 18px; position: relative; z-index: 2; }
.sc-l, .sc-r { position: relative; z-index: 1; height: calc(var(--scene-h, 150px) - 8px); display: flex; align-items: flex-end; gap: 4px; }
.sc-l svg, .sc-r svg { height: 100%; width: auto; display: block; }
.sc-stars { position: absolute; top: 6px; left: 50%; transform: translateX(-50%); display: flex; gap: 3px; z-index: 2; }
.sc-stars i { width: 16px; height: 16px; background: #ffd45c; clip-path: polygon(50% 0, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%); }
.sc-stars i.gone { background: rgba(0,0,0,.12); }
.sc-tray { position: absolute; bottom: 10px; left: -70px; width: 64px; display: flex; flex-wrap: wrap; gap: 2px; justify-content: center; padding: 3px; border-radius: 10px; background: #fff; border: 1px solid rgba(0,0,0,.12); }
.sc-tray img { width: 18px; height: 18px; }
.sc-tray:empty { display: none; }
.scene-knight { background: linear-gradient(#dcebfb 0 62%, #cfe8c4 62% 100%) !important; }
.scene-knight::before { content: ""; position: absolute; left: 30%; right: 30%; bottom: 38%; height: 34%; background:
  linear-gradient(#e9dcc9, #e2d3bd); border: 1px solid rgba(0,0,0,.12); border-bottom: 0; clip-path: polygon(0 18%, 8% 18%, 8% 0, 16% 0, 16% 18%, 24% 18%, 24% 0, 32% 0, 32% 18%, 68% 18%, 68% 0, 76% 0, 76% 18%, 84% 18%, 84% 0, 92% 0, 92% 18%, 100% 18%, 100% 100%, 0 100%); opacity: .7; }
.scene-cafe { background: linear-gradient(#fdf1f4 0 70%, #e8c9a8 70% 72%, #f3dcc2 72% 100%) !important; }
.scene-cafe::before { content: ""; position: absolute; inset: 0 0 30% 0; background-image: radial-gradient(#f7d6e0 2px, transparent 2.5px); background-size: 22px 22px; opacity: .6; }
@keyframes scStep { 0% { transform: translateX(0); } 45% { transform: translateX(26px); } 100% { transform: translateX(0); } }
@keyframes scSwing { 0%, 100% { transform: rotate(0); } 45% { transform: rotate(-14deg); } }
@keyframes scFlinch { 0%, 100% { transform: translateX(0); } 50% { transform: translateX(10px); } }
@keyframes scLeave { to { transform: translateX(160px); opacity: 0; } }
.sc-l.step svg { animation: scStep .6s ease-out; transform-origin: 30% 90%; }
.sc-r.flinch svg { animation: scFlinch .6s ease-out; }
.sc-r.leave svg { animation: scLeave 1.4s ease-in forwards; }
@media (max-width: 560px) { .say.scene, .tp-talk.scene { --scene-h: 92px; gap: 4px; padding: 4px 6px 0; } .sc-l svg, .sc-r svg { max-width: 60px; } .say.scene .bubble, .tp-talk.scene .tp-bubble { font-size: 14px; margin-bottom: 8px; } .say.scene > button, .tp-talk.scene > button { width: 36px; height: 36px; min-width: 36px; margin-bottom: 8px; } .sc-tray { left: -34px; width: 38px; bottom: 4px; } .sc-tray img { width: 14px; height: 14px; } .sc-stars i { width: 11px; height: 11px; } }
@media (prefers-reduced-motion: reduce) { .sc-l.step svg, .sc-r.flinch svg { animation: none; } .sc-r.leave svg { animation: none; opacity: 0; } }`;
  function css() { if (document.getElementById("world-css")) return; const s = document.createElement("style"); s.id = "world-css"; s.textContent = CSS; document.head.appendChild(s); }

  const knight = () => window.KnightArt ? KnightArt.full("knight", "stand", gear()) : (window.KnightWorld ? KnightWorld.knightSVG(100) : "");
  const bad = pose => window.KnightArt ? KnightArt.full("badguy", pose) : (window.KnightWorld ? KnightWorld.badSVG(pose === "runaway" ? 5 : 1, 100) : "");
  const has = id => (P.castle || []).includes(id);
  const gear = () => ({ armour: has("armour"), plume: has("plume"), shield: has("shield"), sword: has("sword2") ? "silver" : has("sword") ? "wood" : "none" });
  const mimi = () => window.KittyChars ? KittyChars.full("kitty", "wave") : (PROFILES.marie.pic || "");
  const guest = () => window.KittyChars ? KittyChars.full(CUSTOMERS[customer % CUSTOMERS.length], "stand") : "";
  const kind = () => (typeof who !== "undefined" && who === "kennedy") ? "knight" : (typeof who !== "undefined" && who) ? "cafe" : "";

  function decorate(row) {
    const k = kind(); if (!row || !k) return;
    row.classList.add("scene"); row.classList.toggle("scene-knight", k === "knight"); row.classList.toggle("scene-cafe", k === "cafe");
    let l = row.querySelector(".sc-l"), r = row.querySelector(".sc-r");
    if (!l) { l = document.createElement("div"); l.className = "sc-l"; l.setAttribute("aria-hidden", "true"); row.prepend(l); }
    if (!r) { r = document.createElement("div"); r.className = "sc-r"; r.setAttribute("aria-hidden", "true"); row.append(r); }
    if (k === "knight") {
      l.innerHTML = knight();
      r.innerHTML = `<div class="sc-stars">${Array.from({ length: 5 }, (_, i) => `<i class="${i < n ? "gone" : ""}"></i>`).join("")}</div>${bad(n >= 3 ? "tired" : "grumpy")}`;
    } else {
      l.innerHTML = mimi();
      r.innerHTML = `<div class="sc-tray">${Array.from({ length: n }, (_, i) => `<img src="${ART(TREATS[(customer + i) % TREATS.length])}" alt="">`).join("")}</div>${guest()}`;
    }
  }
  function rows() { return [...document.querySelectorAll(".say, .tp-talk")]; }
  const World = {
    // Show the scene with n answers already done in this set of 5.
    set(done) { css(); n = Math.max(0, Math.min(5, done)); rows().forEach(decorate); },
    // A right answer: one slow movement, then the scene shows the new count.
    hit(done) {
      css(); n = Math.max(0, Math.min(5, done));
      rows().forEach(row => {
        decorate(row);
        const l = row.querySelector(".sc-l"), r = row.querySelector(".sc-r");
        if (kind() === "knight") { l.classList.remove("step"); r.classList.remove("flinch"); void l.offsetWidth; l.classList.add("step"); r.classList.add("flinch"); }
      });
    },
    // The set is done: the bad guy runs home, or the customer gets the order. Then a fresh set starts.
    finish() {
      rows().forEach(row => { const r = row.querySelector(".sc-r"); if (r && kind() === "knight") { r.innerHTML = bad("runaway"); r.classList.add("leave"); } });
      customer++;
    },
    reset() { n = 0; rows().forEach(row => { const r = row.querySelector(".sc-r"); if (r) r.classList.remove("leave"); decorate(row); }); },
    clear() { rows().forEach(row => { row.classList.remove("scene", "scene-knight", "scene-cafe"); row.querySelectorAll(".sc-l, .sc-r").forEach(e => e.remove()); }); }
  };
  window.World = World;

  /* Kennedy's maths uses his own cast: the knight's blocks and his buddy's blocks, and the words say so.
     The shared Sums game was written for Mimi; for Kennedy its faces and words are swapped as they are shown. */
  const isK = () => typeof who !== "undefined" && who === "kennedy";
  const KNAMES = [[/\bMimi's\b/g, "Knight's"], [/\bMimi\b/g, "Knight"], [/\b(Bella|Lulu|Momo|Puff)'s\b/g, "Buddy's"], [/\b(Bella|Lulu|Momo|Puff)\b/g, "Buddy"], [/\bwalk her\b/g, "walk him"], [/\bhop her\b/g, "hop him"], [/\bShe\b/g, "He"], [/\bshe\b/g, "he"]];
  const swap = t => KNAMES.reduce((x, [re, to]) => x.replace(re, to), String(t));
  const origFace = window.face;
  if (typeof origFace === "function") window.face = id => {
    if (!isK() || !window.KnightArt) return origFace(id);
    const svg = KnightArt.face(id === "kitty" ? "knight" : "buddy");
    return svg.replace("<svg", '<svg x="0" y="0" width="100" height="100"');
  };
  const origSpeak = window.speak;
  if (typeof origSpeak === "function") window.speak = (t, f) => origSpeak(isK() ? swap(t) : t, f);
  const fix = root => {
    if (!isK() || !root) return;
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let nd = w.nextNode(); nd; nd = w.nextNode()) { const v = swap(nd.nodeValue); if (v !== nd.nodeValue) nd.nodeValue = v; }
  };
  const obs = new MutationObserver(ms => { if (!isK()) return; ms.forEach(m => fix(m.target.nodeType === 1 ? m.target : m.target.parentNode)); });
  const watch = () => { const v = document.getElementById("viewSums"); if (v) obs.observe(v, { childList: true, subtree: true, characterData: true }); };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", watch); else watch();
})();
