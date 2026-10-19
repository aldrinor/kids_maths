/* numbers.js - the "Number" strand for Marie's maths game (BC Grades 1-3).
 *
 * Pushes six topic objects onto window.MathTopics:
 *   count_quick, place_value, compare_numbers, skip_count, odd_even, estimate.
 * Every topic follows the module contract:
 *   make(level, prev) -> Q          level = index into topic.levels (0 = easiest). A level object,
 *                                   or a level's `id` string, is accepted too. Out-of-range is clamped.
 *   mount(el, Q, api) -> { destroy(), reset() }
 *   hint(Q, tries) -> string        says HOW, never the answer
 *   teach(Q, el, api) -> Promise    Kitty's guided lesson; Marie does every step in the picture
 *
 * Pictures are drawn as one SVG sized to the box in real pixels and redrawn when the box changes size.
 * Every tap target is at least 44 x 44 px (small things get a bigger invisible tap area; the nearest wins).
 * Things to tap in a lesson carry data-want="1" and a pulsing ring, and api.highlight() is called on them.
 * Characters are our own fan drawings from api.face(id). Pictures come from api.ART(key).
 * The answer is never drawn in the picture while Marie works (the Playwright test checks this).
 * THE COUNTING RULE (15 Oct 2026): a tap only MARKS a thing (a tick, a heart, a glow). While Marie works, no tap
 * shows or says a running number, a running total or the answer. Tones do not climb with each tap either.
 * THE LESSON RULE (16 Oct 2026, the same in every lesson of this module):
 *   1. Kitty shows HOW on the first part only. She says the number on Marie's first 1 or 2 taps and always stops
 *      at least 3 counts before the answer (with 3 or fewer things to count she says no number at all).
 *      She never says the final count, nor a group count that gives the answer in one easy step.
 *   2. Then she says "Your turn. Keep counting." Every tap after that gets the same tick and the same tone. No number.
 *   3. Marie types her answer (the host's answer pad, after the lesson).
 *   4. recount(Q, el, api): if her answer after the lesson is still wrong, Kitty counts ALL of it with her out loud,
 *      tap by tap (the host must call it; see the topic's recount function).
 */
(function () {
  "use strict";

  const LIST = (window.MathTopics = window.MathTopics || []);

  /* ================= Look ================= */
  const C = {
    ink: "#3b2a33", soft: "#6e5562", pink: "#ff6f9f", pinkD: "#e0306b", sun: "#ffc94a", sunD: "#e9a514",
    mint: "#63d3b3", mintD: "#23a483", sky: "#74c8ff", skyD: "#2f8fd0", lilac: "#a98bff", lilacD: "#7b55e6",
    cream: "#fff8ef", paper: "#ffffff", wood: "#f0bf87", woodD: "#c98a52", tintPink: "#ffe4ee", tintSun: "#fff6d6"
  };
  const FONT = "'Baloo 2', 'Comic Sans MS', 'Trebuchet MS', sans-serif";
  // Place value: one character and one colour per place, the same everywhere in this module.
  const PLACE = {
    H: { key: "H", name: "Hundreds", one: "flat", many: "flats", value: 100, who: "kuromi", color: "#6b4bd6", tint: "#ece6ff" },
    T: { key: "T", name: "Tens", one: "rod", many: "rods", value: 10, who: "kitty", color: "#e8203f", tint: "#ffe3ea" },
    O: { key: "O", name: "Ones", one: "cube", many: "cubes", value: 1, who: "cinna", color: "#2386c8", tint: "#e0f3ff" }
  };
  const SIDE = {
    L: { who: "kitty", color: "#e8203f", tint: "#ffe3ea", name: "Kitty" },
    R: { who: "kuromi", color: "#6b4bd6", tint: "#ece6ff", name: "Kuromi" }
  };
  const CANDY = ["#ff6f9f", "#ffc94a", "#63d3b3", "#74c8ff", "#a98bff", "#ff9f5a"];
  const MINUS = "−";
  const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve",
    "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty"];
  const COUNT_ART = [
    ["strawberry", "strawberries"], ["cupcake", "cupcakes"], ["star", "stars"], ["heart", "hearts"], ["candy", "candies"],
    ["cookie", "cookies"], ["donut", "donuts"], ["icecream", "ice creams"], ["lollipop", "lollipops"], ["balloon", "balloons"],
    ["tulip", "tulips"], ["sunflower", "sunflowers"], ["bunny", "bunnies"], ["penguin", "penguins"], ["fish", "fish"], ["gift", "presents"]
  ];

  /* ================= Small helpers ================= */
  const rand = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const range = n => Array.from({ length: n }, (_, i) => i);
  const hr = (i, s) => { const x = Math.sin(i * 12.9898 + (s || 0) * 78.233) * 43758.5453; return x - Math.floor(x); };
  const f = n => Math.round(n * 10) / 10;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const digitsOf = n => ({ H: Math.floor(n / 100) % 10, T: Math.floor(n / 10) % 10, O: n % 10 });
  const plural = (n, one, many) => n === 1 ? one : many;
  function fresh(prev, fn) {
    for (let i = 0; i < 80; i++) { const q = fn(); if (!prev || q.key !== prev.key) return q; }
    return fn();
  }
  function levelIndex(topic, level) {
    let i = 0;
    if (typeof level === "number" && isFinite(level)) i = Math.floor(level);
    else if (typeof level === "string") { i = topic.levels.findIndex(l => l.id === level || l.name === level); if (i < 0) i = parseInt(level, 10) || 0; }
    else if (level && typeof level === "object") { i = topic.levels.indexOf(level); if (i < 0) i = topic.levels.findIndex(l => l.id === level.id || l.name === level.name); if (i < 0) i = 0; }
    return clamp(i, 0, topic.levels.length - 1);
  }
  const boxHTML = s => `<span style="display:inline-block;min-width:1.3em;padding:0 .18em;border:3px dashed ${C.pinkD};border-radius:12px;background:#fff;text-align:center;line-height:1.15">${s}</span>`;

  /* ================= Shared style and SVG paint (added once) ================= */
  function ensureAssets() {
    if (!document.getElementById("nm-style")) {
      const st = document.createElement("style");
      st.id = "nm-style";
      st.textContent = `
.nm-root{position:relative;width:100%;height:100%;min-height:200px;overflow:hidden;touch-action:none;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent;cursor:pointer}
.nm-root .nm-svgbox,.nm-root .nm-svgbox>svg{position:absolute;left:0;top:0;width:100%;height:100%;display:block;overflow:hidden}
.nm-root text{pointer-events:none}
.nm-ghost{position:absolute;left:0;top:0;pointer-events:none;z-index:3;filter:drop-shadow(0 6px 0 rgba(59,42,51,.25))}
.nm-ghost svg{display:block;overflow:visible}
.nm-ring{animation:nm-pulse 1s ease-in-out infinite}
@keyframes nm-pulse{50%{opacity:.3}}
.nm-pop{animation:nm-pop .32s ease-out;transform-box:fill-box;transform-origin:center}
@keyframes nm-pop{from{transform:scale(.45)}70%{transform:scale(1.12)}}
.nm-hop{animation:nm-hop .36s ease-out;transform-box:fill-box;transform-origin:center bottom}
@keyframes nm-hop{40%{transform:translateY(-16px) scale(1.06,.94)}}
@media (prefers-reduced-motion:reduce){.nm-ring,.nm-pop,.nm-hop{animation:none}}`;
      document.head.appendChild(st);
    }
    // The character drawings use these gradients. The host page normally has them; add only the missing ones.
    const DEFS = {
      fur: `<radialGradient id="fur" cx="38%" cy="30%" r="80%"><stop offset="0" stop-color="#ffffff"/><stop offset=".75" stop-color="#fbf5f8"/><stop offset="1" stop-color="#e9d8e0"/></radialGradient>`,
      furGold: `<radialGradient id="furGold" cx="38%" cy="30%" r="80%"><stop offset="0" stop-color="#fff2b8"/><stop offset=".7" stop-color="#ffd76a"/><stop offset="1" stop-color="#e9b440"/></radialGradient>`,
      hoodPink: `<radialGradient id="hoodPink" cx="38%" cy="30%" r="80%"><stop offset="0" stop-color="#ffc3da"/><stop offset="1" stop-color="#ff7fb0"/></radialGradient>`,
      hoodBlack: `<radialGradient id="hoodBlack" cx="38%" cy="30%" r="80%"><stop offset="0" stop-color="#5a4a63"/><stop offset="1" stop-color="#231a28"/></radialGradient>`,
      nose: `<radialGradient id="nose" cx="35%" cy="30%" r="70%"><stop offset="0" stop-color="#ffe680"/><stop offset="1" stop-color="#f2a900"/></radialGradient>`,
      woodGrad: `<linearGradient id="woodGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffdcae"/><stop offset="1" stop-color="#eaa968"/></linearGradient>`,
      "nm-glass": `<linearGradient id="nm-glass" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#e8f6ff"/><stop offset=".5" stop-color="#f7fcff"/><stop offset="1" stop-color="#dff1ff"/></linearGradient>`
    };
    const missing = Object.keys(DEFS).filter(id => !document.getElementById(id));
    if (missing.length) {
      const holder = document.createElement("div");
      holder.innerHTML = `<svg width="0" height="0" style="position:absolute" aria-hidden="true" data-nm-defs="1"><defs>${missing.map(id => DEFS[id]).join("")}</defs></svg>`;
      document.body.appendChild(holder.firstChild);
    }
  }

  /* ================= Drawing kit (pixel units) ================= */
  function rr(x, y, w, h, r, fill, sw, extra) {
    return `<rect x="${f(x)}" y="${f(y)}" width="${f(Math.max(0, w))}" height="${f(Math.max(0, h))}" rx="${f(r)}" fill="${fill}"${sw ? ` stroke="${C.ink}" stroke-width="${sw}"` : ""}${extra ? " " + extra : ""}/>`;
  }
  // A chunky toy surface: dark outline and a solid shadow underneath, like the sums screen.
  function card(x, y, w, h, o) {
    o = o || {};
    const r = o.r != null ? o.r : 18, sh = o.sh != null ? o.sh : 4, sw = o.sw != null ? o.sw : 3;
    return rr(x, y + sh, w, h, r, C.ink, 0) + rr(x, y, w, h, r, o.fill || C.cream, sw, o.extra);
  }
  function text(x, y, s, size, o) {
    o = o || {};
    const fill = o.fill || C.ink, anchor = o.anchor || "middle";
    const stroke = o.stroke ? ` stroke="${o.sc || C.ink}" stroke-width="${o.stroke}" paint-order="stroke fill" stroke-linejoin="round"` : "";
    return `<text x="${f(x)}" y="${f(y)}" text-anchor="${anchor}" dominant-baseline="central" font-family="${FONT}" font-weight="800" font-size="${f(size)}" fill="${fill}"${stroke}${o.extra ? " " + o.extra : ""}>${esc(s)}</text>`;
  }
  function counter(cx, cy, r, fill) {
    const sw = r >= 14 ? 3 : 2;
    return `<circle cx="${f(cx)}" cy="${f(cy + r * .14)}" r="${f(r)}" fill="${C.ink}"/><circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="${fill}" stroke="${C.ink}" stroke-width="${sw}"/>` +
      `<ellipse cx="${f(cx - r * .32)}" cy="${f(cy - r * .38)}" rx="${f(r * .32)}" ry="${f(r * .2)}" fill="#fff" opacity=".7" transform="rotate(-25 ${f(cx - r * .32)} ${f(cy - r * .38)})"/>`;
  }
  function tickMark(cx, cy, r) {
    r = Math.max(8, r);
    return `<g class="nm-pop" data-role="tick"><circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="${C.mintD}" stroke="${C.ink}" stroke-width="2"/>` +
      `<path d="M${f(cx - r * .45)} ${f(cy + r * .02)} L${f(cx - r * .1)} ${f(cy + r * .38)} L${f(cx + r * .5)} ${f(cy - r * .36)}" fill="none" stroke="#fff" stroke-width="${f(Math.max(2, r * .3))}" stroke-linecap="round" stroke-linejoin="round"/></g>`;
  }
  // A counting badge. Only used in Kitty's lesson, never while Marie works alone.
  function badge(cx, cy, n, size) {
    const s = String(n), fs = clamp(size || 15, 11, 22), w = Math.max(fs * 1.5, s.length * fs * .62 + fs * .7), h = fs * 1.45;
    return `<g class="nm-pop" data-role="badge">${rr(cx - w / 2, cy - h / 2, w, h, h / 2, C.sun, 2)}${text(cx, cy + 1, s, fs)}</g>`;
  }
  // Is this value the answer? Kitty's lesson never says or shows it (only the full recount does).
  const isAns = (pic, v) => v != null && String(v) === String(pic.Q.answer);
  // THE LESSON RULE (see the top of this file).
  const TURN = "Your turn. Keep counting.";
  // How many of Marie's first taps Kitty counts out loud: at most 2, and always 3 or more counts left for Marie.
  const demoTaps = (pic, total) => pic.full ? Infinity : clamp(total - 3, 0, 2);
  // Kitty's "show how" step lasts for her counted taps, and always for Marie's first tap, so the words she says
  // are the same for every amount ("Your turn" comes after the first tap even when Kitty counts nothing).
  const showing = (pic, taps, total) => pic.full || taps < Math.max(1, demoTaps(pic, total));
  // One counting step: Kitty's first line while she shows how, then "Your turn. Keep counting." (with an optional tail).
  function countStep(pic, taps, total, want, first, tail) {
    if (!want.length) return null;
    if (pic.full) return { id: "all", say: `Let's count all of it together, out loud. ${first}`, want };
    return showing(pic, taps, total) ? { id: "count", say: first, want } : { id: "turn", say: TURN + (tail ? " " + tail : ""), want };
  }
  // End of a tens-and-ones lesson: the digit boxes show "?", so Marie puts the places together herself.
  const PV_END = places => `Say how many ${places.map(p => PLACE[p].name.toLowerCase()).join(", ").replace(/, ([^,]*)$/, " and $1")}. Put them together. Type the number.`;
  function ringAt(x, y, w, h, r) {
    return `<g class="nm-ring" pointer-events="none">${rr(x - 6, y - 6, w + 12, h + 12, (r || 12) + 6, "none", 0, `stroke="${C.ink}" stroke-width="8"`)}${rr(x - 6, y - 6, w + 12, h + 12, (r || 12) + 6, "none", 0, `stroke="${C.sun}" stroke-width="5"`)}</g>`;
  }
  const faceCache = new WeakMap();
  function faceInner(api, id) {
    let m = faceCache.get(api); if (!m) { m = {}; faceCache.set(api, m); }
    if (m[id] != null) return m[id];
    let s = "";
    try { s = String(api.face(id) || ""); } catch (e) { s = ""; }
    if (/^\s*<svg/i.test(s)) s = s.replace(/^\s*<svg[^>]*>/i, "").replace(/<\/svg>\s*$/i, "");
    return (m[id] = s);
  }
  const faceG = (api, id, x, y, size) => `<g transform="translate(${f(x)} ${f(y)}) scale(${f(size / 100 * 1000) / 1000})" pointer-events="none">${faceInner(api, id)}</g>`;

  // Base-ten pieces, in the sums screen's block look: pale body, coloured base, dark outline, white shine.
  function cubeSVG(api, x, y, s, P, withFace) {
    const sw = s >= 36 ? 3 : 2, r = s * .2;
    let o = rr(x, y + s * .1, s, s * .9, r, P.color, sw) + rr(x, y, s, s * .84, r, P.tint, sw) + rr(x + s * .12, y + s * .08, s * .76, s * .18, s * .09, "#fff", 0, `opacity=".85"`);
    if (withFace && s >= 22) o += faceG(api, P.who, x + s * .16, y + s * .1, s * .68);
    return o;
  }
  // A ten-tower, drawn like the sums screen: ten separate outlined cells on a coloured base,
  // the friend's face sitting on top (inside the tower's own box), and a white "10" label.
  function rodSVG(api, x, y, w, h, P, noLabel) {
    const sw = w >= 22 ? 2.5 : w >= 14 ? 1.8 : 1.2, sh = Math.max(2, w * .1);
    const showFace = w >= 13, fs = showFace ? Math.min(w * 1.04, h * .3) : 0;
    const top = y + fs * .5, cellH = (h - sh - (top - y)) / 10, r = Math.min(w * .22, cellH * .45);
    let o = rr(x, top + sh, w, h - sh - (top - y), Math.min(w * .22, 8), P.color, sw);
    for (let k = 0; k < 10; k++) o += rr(x, top + k * cellH, w, cellH, r, P.tint, sw);
    o += rr(x + w * .14, top + 2, w * .16, cellH * 10 - 4, w * .08, "#fff", 0, `opacity=".5"`);
    if (showFace) o += faceG(api, P.who, x + (w - fs) / 2, y, fs);
    if (w >= 16 && h >= 64 && !noLabel) {
      const pw = Math.min(w * .9, 34), ph = Math.min(20, Math.max(12, w * .55)), cy = top + cellH * 6;
      o += rr(x + (w - pw) / 2, cy - ph / 2, pw, ph, ph / 2, "#fff", 0) + text(x + w / 2, cy + 1, "10", ph * .8, { fill: P.color });
    }
    return o;
  }
  function flatSVG(api, x, y, s, P, noLabel) {
    const sw = s >= 40 ? 3 : 2, sh = Math.max(2, s * .05), q = (s - sh) / 10;
    let o = rr(x, y + sh, s, s - sh, s * .1, P.color, sw) + rr(x, y, s, s - sh, s * .1, P.tint, sw);
    let g = "";
    for (let k = 1; k < 10; k++) g += `M${f(x + k * q)} ${f(y + 1)}V${f(y + s - sh - 1)}M${f(x + 1)} ${f(y + k * q)}H${f(x + s - 1)}`;
    o += `<path d="${g}" stroke="${C.ink}" stroke-opacity=".22" stroke-width="1"/>`;
    if (s >= 56) o += faceG(api, P.who, x + s * .28, y + s * .1, s * .44);
    if (s >= 56 && !noLabel) {
      const pw = s * .48, ph = Math.min(22, s * .22);
      o += rr(x + (s - pw) / 2, y + s * .66 - ph / 2, pw, ph, ph / 2, "#fff", 0) + text(x + s / 2, y + s * .66 + 1, "100", ph * .78, { fill: P.color });
    }
    return o;
  }
  // Best grid for n cells in a w x h box.
  function gridFit(n, w, h) {
    let best = null;
    for (let c = 1; c <= n; c++) {
      const r = Math.ceil(n / c), s = Math.min(w / c, h / r);
      if (!best || s > best.s + .01) best = { cols: c, rows: r, s, cw: w / c, ch: h / r };
    }
    return best;
  }
  // Slots for `cap` pieces of a given aspect (width / height) inside aw x ah; the biggest piece that fits.
  function slotLayout(cap, aw, ah, aspect, maxW) {
    let best = null;
    for (let c = 1; c <= cap; c++) {
      const rows = Math.ceil(cap / c), cw = aw / c, ch = ah / rows;
      let pw = Math.min(cw * .86, ch * .86 * aspect);
      if (maxW) pw = Math.min(pw, maxW);
      const ph = pw / aspect;
      if (!best || pw * ph > best.pw * best.ph + .01) best = { c, rows, cw, ch, pw, ph };
    }
    best.pos = i => ({ x: (i % best.c) * best.cw + (best.cw - best.pw) / 2, y: Math.floor(i / best.c) * best.ch + (best.ch - best.ph) / 2 });
    return best;
  }

  /* ================= The picture engine ================= */
  class Pic {
    constructor(el, Q, api, kind, teach, full) {
      ensureAssets();
      if (el.__nmPic) { const old = el.__nmPic; if (teach) old.next = this; old.destroy(); }
      el.__nmPic = this;
      // full: the recount (rule step 4). Kitty counts every tap out loud, up to and with the last one.
      this.el = el; this.Q = Q; this.api = api || {}; this.kind = kind; this.teachMode = !!teach; this.full = !!(teach && full);
      this.hits = []; this.want = null; this.dead = false; this.drag = null; this.pops = new Set(); this.next = null; this.saidOnce = new Set();
      const root = this.root = document.createElement("div");
      root.className = "nm-root";
      root.setAttribute("data-topic", Q.data.topic);
      root.setAttribute("data-kind", Q.data.kind);
      root.setAttribute("data-mode", teach ? (this.full ? "recount" : "teach") : "work");
      this.box = document.createElement("div"); this.box.className = "nm-svgbox";
      root.appendChild(this.box);
      el.appendChild(root);
      this.st = kind.init(Q, this);
      this.onDown = e => this.down(e); this.onMove = e => this.move(e); this.onUp = e => this.up(e); this.onCancel = () => this.cancel();
      root.addEventListener("pointerdown", this.onDown);
      root.addEventListener("pointermove", this.onMove);
      root.addEventListener("pointerup", this.onUp);
      root.addEventListener("pointercancel", this.onCancel);
      root.addEventListener("contextmenu", this.onCtx = e => e.preventDefault());
      if (typeof ResizeObserver !== "undefined") { this.ro = new ResizeObserver(() => this.render()); this.ro.observe(root); }
      else { this.onResize = () => this.render(); window.addEventListener("resize", this.onResize); }
      if (teach) {
        this.teachPromise = new Promise(res => { this.teachRes = res; });
        this.render(true);
        this.syncTeach();
      } else this.render(true);
    }
    say(t) { try { this.api.say && this.api.say(t); } catch (e) {} }
    speak(t) { try { this.api.speak && this.api.speak(t); } catch (e) {} }
    tone(fr, d, ty, g) { try { this.api.tone && this.api.tone(fr, d, ty, g); } catch (e) {} }
    art(k) { try { return this.api.ART ? this.api.ART(k) : `art/${k}.png`; } catch (e) { return `art/${k}.png`; } }
    pop(key) { this.pops.add(key); }
    popCls(key) { return this.pops.has(key) ? ` class="nm-pop"` : ""; }
    // Register a tap target. Returns the attributes for its <g>.
    hit(key, x, y, w, h, o) {
      this.hits.push(Object.assign({ key, x, y, w, h, pri: 0 }, o || {}));
      return ` data-k="${esc(key)}"${this.want && this.want.has(key) ? ` data-want="1"` : ""}`;
    }
    wanted(key) { return !!(this.want && this.want.has(key)); }
    glow(key, x, y, w, h, r) { return this.wanted(key) ? ringAt(x, y, w, h, r) : ""; }
    render(force) {
      if (this.dead) return;
      const r = this.root.getBoundingClientRect();
      const w = Math.max(200, Math.round(r.width)), h = Math.max(180, Math.round(r.height));
      if (!force && w === this.w && h === this.h && this.drawn) return;
      this.w = w; this.h = h; this.hits = [];
      const body = this.kind.draw(this, this.st, w, h);
      this.box.innerHTML = `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${esc(this.kind.label ? this.kind.label(this, this.st) : "Picture")}">${body}</svg>`;
      this.pops.clear();
      this.drawn = true;
    }
    redraw() { this.render(true); }
    pt(e) { const r = this.root.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
    find(p) {
      let best = null, bd = Infinity;
      for (const t of this.hits) {
        const ex = Math.max(0, (44 - t.w) / 2), ey = Math.max(0, (44 - t.h) / 2);
        if (p.x < t.x - ex || p.x > t.x + t.w + ex || p.y < t.y - ey || p.y > t.y + t.h + ey) continue;
        const inside = p.x >= t.x && p.x <= t.x + t.w && p.y >= t.y && p.y <= t.y + t.h;
        const d = Math.hypot(p.x - (t.x + t.w / 2), p.y - (t.y + t.h / 2)) - (inside ? 4 : 0) - t.pri * 10000;
        if (d < bd) { bd = d; best = t; }
      }
      return best;
    }
    down(e) {
      if (this.dead || (e.button != null && e.button > 0)) return;
      // Kitty's bubble can change height and resize the picture just before a tap. Lay the picture out for its
      // current size first (render() does nothing when the size is unchanged), so the tap meets fresh tap areas.
      this.render();
      const p = this.pt(e), t = this.find(p);
      if (!t) return;
      e.preventDefault();
      this.drag = { t, p0: p, id: e.pointerId, moved: false };
      try { this.root.setPointerCapture(e.pointerId); } catch (x) {}
    }
    move(e) {
      const d = this.drag;
      if (!d || e.pointerId !== d.id) return;
      const p = this.pt(e);
      if (!d.moved) {
        if (Math.hypot(p.x - d.p0.x, p.y - d.p0.y) < 10) return;
        if (this.teachMode || !this.kind.canDrag || !this.kind.canDrag(this, this.st, d.t)) return;
        d.moved = true;
        const g = this.kind.ghost(this, this.st, d.t);
        d.gw = g.w; d.gh = g.h;
        d.ghost = document.createElement("div"); d.ghost.className = "nm-ghost";
        d.ghost.innerHTML = `<svg width="${f(g.w)}" height="${f(g.h)}" viewBox="${f(g.x)} ${f(g.y)} ${f(g.w)} ${f(g.h)}">${g.svg}</svg>`;
        this.root.appendChild(d.ghost);
        this.st.dragging = d.t.key; this.redraw();
      }
      d.ghost.style.transform = `translate(${f(p.x - d.gw / 2)}px, ${f(p.y - d.gh / 2)}px) scale(1.08)`;
    }
    up(e) {
      const d = this.drag;
      if (!d || e.pointerId !== d.id) return;
      this.drag = null;
      try { this.root.releasePointerCapture(e.pointerId); } catch (x) {}
      if (d.moved) {
        if (d.ghost) d.ghost.remove();
        this.st.dragging = null;
        this.kind.drop(this, this.st, d.t, this.pt(e));
        this.redraw();
      } else this.tapHit(d.t, d.p0);
    }
    cancel() { const d = this.drag; this.drag = null; if (d && d.ghost) d.ghost.remove(); if (this.st) this.st.dragging = null; this.redraw(); }
    tapHit(t, p) {
      if (this.dead) return;
      if (this.teachMode) {
        const s = this.teachStep;
        if (!s) return;
        if (s.want && !s.free && !s.want.includes(t.key)) { this.say(s.nudge || "Tap the one that shines."); this.tone([330], .12, "triangle"); return; }
      }
      this.kind.tap(this, this.st, t, p);
      if (this.teachMode) this.syncTeach(); else this.redraw();
    }
    syncTeach() {
      if (this.dead) return;
      const s = this.kind.teachStep(this, this.st);
      if (!s) {
        this.teachStep = null; this.want = null; this.redraw();
        const end = this.kind.teachEnd ? this.kind.teachEnd(this, this.st) : "";
        if (end) this.say(end);
        this.finishTeach();
        return;
      }
      const changed = !this.teachStep || this.teachStep.id !== s.id;
      this.teachStep = s; this.want = new Set(s.want || []);
      this.redraw();
      // A step marked `once` (for example "Tap a block" in a long sorting job) is said only the first time.
      if (changed && s.say && !(s.once && this.saidOnce.has(s.id))) this.say(s.say);
      if (s.once) this.saidOnce.add(s.id);
      if (changed && this.api.highlight) { const t = this.root.querySelector("[data-want]"); if (t) try { this.api.highlight(t); } catch (e) {} }
    }
    finishTeach() { const r = this.teachRes; this.teachRes = null; if (r) r(); }
    reset() {
      if (this.dead) return;
      this.st = this.kind.init(this.Q, this);
      this.teachStep = null; this.want = null;
      if (this.teachMode && this.teachRes) this.syncTeach(); else { this.want = null; this.redraw(); }
    }
    destroy() {
      if (this.dead) return;
      this.dead = true;
      if (this.ro) this.ro.disconnect();
      if (this.onResize) window.removeEventListener("resize", this.onResize);
      const r = this.root;
      r.removeEventListener("pointerdown", this.onDown); r.removeEventListener("pointermove", this.onMove);
      r.removeEventListener("pointerup", this.onUp); r.removeEventListener("pointercancel", this.onCancel);
      r.removeEventListener("contextmenu", this.onCtx);
      r.remove();
      if (this.el.__nmPic === this) this.el.__nmPic = null;
      this.finishTeach();
    }
  }
  function handleFor(pic) {
    return {
      destroy() { let p = pic; while (p) { const n = p.next; p.destroy(); p = n; } },
      reset() { let p = pic; while (p && p.next) p = p.next; if (p && !p.dead) p.reset(); }
    };
  }

  /* ================= Shared counting behaviour =================
     While Marie works: a tap puts a tick on a thing (tap again to take it off). No running total.
     In Kitty's lesson (THE LESSON RULE): on Marie's first 1 or 2 taps Kitty says the number and shows it on a badge;
     every later tap gets a tick and the same tone, no number. `total` is how many things this count has. */
  function countTap(pic, st, id, value, total) {
    if (pic.teachMode) {
      if (st.cnt[id] != null || st.mine[id]) return false;
      st.run += value || 1; st.taps++;
      if (st.taps <= demoTaps(pic, total) && (pic.full || !isAns(pic, st.run))) { st.cnt[id] = st.run; st.lastId = id; pic.speak(String(st.run)); }
      else { st.mine[id] = true; st.lastId = null; }   // Marie's own tap: Kitty's last badge turns into a tick too
      pic.tone([620], .07);
      pic.pop("m:" + id); return true;
    }
    // While Marie works the tap only marks the thing. The tone is the same every time (no climbing pitch).
    st.tick[id] = !st.tick[id];
    pic.tone([st.tick[id] ? 620 : 420], .06);
    if (st.tick[id]) pic.pop("m:" + id);
    return true;
  }
  function markFor(st, id, cx, cy, r) {
    if (st.cnt && st.cnt[id] != null) return id === st.lastId ? badge(cx, cy, st.cnt[id], r * 1.15) : tickMark(cx, cy, r);   // only Kitty's newest number is written
    if (st.mine && st.mine[id]) return tickMark(cx, cy, r);
    if (st.tick && st.tick[id]) return tickMark(cx, cy, r);
    return "";
  }
  // cnt: Kitty's counted taps (with their number); mine: Marie's own taps in the lesson (a tick, no number).
  const countState = () => ({ tick: {}, cnt: {}, mine: {}, run: 0, taps: 0, lastId: null });

  /* ================= Ten-frame ================= */
  function frameGeom(x, y, w, h) {
    const cell = Math.min(w / 5, h / 2, 96);
    return { fx: x + (w - cell * 5) / 2, fy: y + (h - cell * 2) / 2, cell };
  }
  function frameSVG(g, fill) {
    const { fx, fy, cell } = g;
    let o = card(fx, fy, cell * 5, cell * 2, { fill: fill || C.paper, r: Math.min(16, cell * .3) });
    let p = "";
    for (let k = 1; k < 5; k++) p += `M${f(fx + k * cell)} ${f(fy + 3)}V${f(fy + cell * 2 - 3)}`;
    p += `M${f(fx + 3)} ${f(fy + cell)}H${f(fx + cell * 5 - 3)}`;
    return o + `<path d="${p}" stroke="${C.ink}" stroke-width="2.5" stroke-linecap="round"/>`;
  }
  const cellCenter = (g, i) => ({ x: g.fx + (i % 5 + .5) * g.cell, y: g.fy + (Math.floor(i / 5) + .5) * g.cell });

  /* =====================================================================
     TOPIC 1: count_quick - "How many"
     ===================================================================== */
  const PIPS = { 1: [[.5, .5]], 2: [[.27, .27], [.73, .73]], 3: [[.25, .25], [.5, .5], [.75, .75]], 4: [[.27, .27], [.73, .27], [.27, .73], [.73, .73]],
    5: [[.25, .25], [.75, .25], [.5, .5], [.25, .75], [.75, .75]], 6: [[.27, .22], [.73, .22], [.27, .5], [.73, .5], [.27, .78], [.73, .78]] };

  const K_SUBIT = {
    init: () => countState(),
    label: () => "Dots to count",
    draw(pic, st, w, h) {
      const n = pic.Q.data.n; let o = "";
      if (pic.Q.data.layout === "dice") {
        const S = Math.min(w * .82, h * .82, 320), x = (w - S) / 2, y = (h - S) / 2 - 2;
        o += card(x, y, S, S, { fill: C.paper, r: S * .16, sh: 6 });
        const r = S * .095;
        PIPS[n].forEach((pp, i) => {
          const cx = x + pp[0] * S, cy = y + pp[1] * S;
          o += `<g${pic.hit("dot:" + i, cx - r * 1.4, cy - r * 1.4, r * 2.8, r * 2.8)} data-role="dot">${pic.glow("dot:" + i, cx - r, cy - r, r * 2, r * 2, r)}${counter(cx, cy, r, C.pink)}${markFor(st, i, cx + r * .8, cy - r * .8, r * .5)}</g>`;
        });
      } else {
        const g = frameGeom(14, 10, w - 28, h - 24);
        o += frameSVG(g);
        for (let i = 0; i < n; i++) {
          const c = cellCenter(g, i), r = g.cell * .34;
          o += `<g${pic.hit("dot:" + i, c.x - g.cell / 2, c.y - g.cell / 2, g.cell, g.cell)} data-role="dot">${pic.glow("dot:" + i, c.x - r, c.y - r, r * 2, r * 2, r)}${counter(c.x, c.y, r, C.pink)}${markFor(st, i, c.x + r * .75, c.y - r * .75, r * .45)}</g>`;
        }
      }
      return o;
    },
    tap(pic, st, t) { countTap(pic, st, +t.key.split(":")[1], 1, pic.Q.data.n); },
    teachStep(pic, st) {
      const n = pic.Q.data.n, left = range(n).filter(i => st.cnt[i] == null && !st.mine[i]).map(i => "dot:" + i);
      return countStep(pic, st.taps, n, left, "Let's count together. Tap each dot. Count each dot one time.", "Tap each dot.");
    },
    teachEnd: () => "How many dots? Type the number."
  };

  const K_PICS = {
    init: () => countState(),
    label: pic => "Pictures to count",
    // More than 10 pictures are hard to count without a running number, so they sit in clear groups of 5
    // (a soft tray behind each five; two fives make a ten). Marie counts the fives and the rest herself.
    groups(pic, st, w, h) {
      const d = pic.Q.data, n = d.n, pad = 8, wide = w / h > 1.5, per = wide ? 10 : 5, rows = Math.ceil(n / per);
      const s0 = Math.min((w - pad * 2) / (per + (wide ? .6 : 0)), (h - pad * 2) / (rows + (wide ? 0 : Math.floor((rows - 1) / 2) * .5)));
      const s = Math.min(s0, 110), gx = wide ? s * .6 : 0, gy = s * .5;
      const totW = per * s + gx, totH = rows * s + (wide ? 0 : Math.floor((rows - 1) / 2) * gy);
      const ox = (w - totW) / 2, oy = (h - totH) / 2, size = s * .8;
      const at = i => { const row = Math.floor(i / per), col = i % per; return { x: ox + col * s + (col >= 5 ? gx : 0), y: oy + row * s + (wide ? 0 : Math.floor(row / 2) * gy) }; };
      let o = "";
      for (let g0 = 0; g0 < n; g0 += 5) {
        const k = Math.min(5, n - g0), p = at(g0);
        o += rr(p.x + 1, p.y + 2, k * s - 2, s - 4, s * .3, C.tintSun, 0, `stroke="${C.ink}" stroke-opacity=".18" stroke-width="2" data-role="five"`);
      }
      for (let i = 0; i < n; i++) {
        const p = at(i), x = p.x + (s - size) / 2, y = p.y + (s - size) / 2, cx = x + size / 2, cy = y + size / 2, rot = d.jit[i][2] * 8;
        o += `<g${pic.hit("it:" + i, x, y, size, size)} data-role="item">${pic.glow("it:" + i, x, y, size, size, size * .25)}` +
          `<image href="${esc(pic.art(d.art))}" x="${f(x)}" y="${f(y)}" width="${f(size)}" height="${f(size)}" preserveAspectRatio="xMidYMid meet" transform="rotate(${f(rot)} ${f(cx)} ${f(cy)})"/>` +
          `${markFor(st, i, x + size * .86, y + size * .16, Math.max(9, size * .16))}</g>`;
      }
      return o;
    },
    draw(pic, st, w, h) {
      if (pic.Q.data.n > 10) return this.groups(pic, st, w, h);
      const d = pic.Q.data, pad = 8, g = gridFit(d.C, w - pad * 2, h - pad * 2), size = Math.min(g.cw, g.ch) * .78;
      let o = "";
      d.cells.forEach((cell, i) => {
        const col = cell % g.cols, row = Math.floor(cell / g.cols);
        // Wobble a little, but never past the cell edge (a turned picture is about 1.2 times wider).
        const jx = Math.max(0, Math.min(g.cw * .12, (g.cw - size * 1.2) / 2)), jy = Math.max(0, Math.min(g.ch * .12, (g.ch - size * 1.2) / 2));
        const cx = pad + (col + .5) * g.cw + d.jit[i][0] * jx, cy = pad + (row + .5) * g.ch + d.jit[i][1] * jy;
        const rot = d.jit[i][2] * 14, x = cx - size / 2, y = cy - size / 2;
        o += `<g${pic.hit("it:" + i, x, y, size, size)} data-role="item">${pic.glow("it:" + i, x, y, size, size, size * .25)}` +
          `<ellipse cx="${f(cx)}" cy="${f(y + size * .95)}" rx="${f(size * .34)}" ry="${f(size * .07)}" fill="${C.ink}" opacity=".12"/>` +
          `<image href="${esc(pic.art(d.art))}" x="${f(x)}" y="${f(y)}" width="${f(size)}" height="${f(size)}" preserveAspectRatio="xMidYMid meet" transform="rotate(${f(rot)} ${f(cx)} ${f(cy)})"/>` +
          `${markFor(st, i, x + size * .86, y + size * .16, Math.max(9, size * .16))}</g>`;
      });
      return o;
    },
    tap(pic, st, t) { countTap(pic, st, +t.key.split(":")[1], 1, pic.Q.data.n); },
    teachStep(pic, st) {
      const n = pic.Q.data.n, left = range(n).filter(i => st.cnt[i] == null && !st.mine[i]).map(i => "it:" + i);
      return countStep(pic, st.taps, n, left, "Let's count together. Tap each one. Count out loud.", "Tap each one.");
    },
    teachEnd: (pic) => `How many ${pic.Q.data.plural}? Type the number.`
  };

  function twoFrames(w, h) {
    const wide = w / h > 1.55;
    if (wide) { const fw = (w - 44) / 2; return [frameGeom(14, 10, fw, h - 24), frameGeom(30 + fw, 10, fw, h - 24)]; }
    const fh = (h - 34) / 2;
    return [frameGeom(14, 8, w - 28, fh), frameGeom(14, 22 + fh, w - 28, fh)];
  }
  const K_TENMORE = {
    init: () => Object.assign(countState(), { tenDone: false }),
    label: () => "Two ten-frames",
    draw(pic, st, w, h) {
      const n = pic.Q.data.n, m = n - 10, [g0, g1] = twoFrames(w, h);
      let o = "";
      const regionKey = "fr:0";
      if (pic.teachMode && !st.tenDone) {
        o += `<g${pic.hit(regionKey, g0.fx, g0.fy, g0.cell * 5, g0.cell * 2, { pri: 0 })}>${pic.glow(regionKey, g0.fx, g0.fy, g0.cell * 5, g0.cell * 2, 16)}`;
      } else o += "<g>";
      o += frameSVG(g0);
      for (let i = 0; i < 10; i++) {
        const c = cellCenter(g0, i), r = g0.cell * .34, id = "a" + i;
        const attrs = pic.teachMode ? ` data-role="dot"` : `${pic.hit("dot:" + id, c.x - g0.cell / 2, c.y - g0.cell / 2, g0.cell, g0.cell)} data-role="dot"`;
        o += `<g${attrs}>${counter(c.x, c.y, r, C.pink)}${markFor(st, id, c.x + r * .75, c.y - r * .75, r * .45)}</g>`;
      }
      if (st.tenDone) o += badge(g0.fx + g0.cell * 5 - 4, g0.fy + 2, 10, Math.max(16, g0.cell * .34));
      o += "</g>" + frameSVG(g1);
      for (let i = 0; i < m; i++) {
        const c = cellCenter(g1, i), r = g1.cell * .34, id = "b" + i;
        o += `<g${pic.hit("dot:" + id, c.x - g1.cell / 2, c.y - g1.cell / 2, g1.cell, g1.cell)} data-role="dot">${pic.glow("dot:" + id, c.x - r, c.y - r, r * 2, r * 2, r)}${counter(c.x, c.y, r, C.sky)}${markFor(st, id, c.x + r * .75, c.y - r * .75, r * .45)}</g>`;
      }
      return o;
    },
    tap(pic, st, t) {
      if (t.key === "fr:0") { if (!st.tenDone) { st.tenDone = true; st.run = 10; pic.speak("Ten!"); pic.tone([523, 784], .1); } return; }
      countTap(pic, st, t.key.split(":")[1], 1, pic.Q.data.n - 10);
    },
    teachStep(pic, st) {
      // The full frame is the level's landmark ("10 and some more"): Kitty names it, like a ruler landmark.
      if (!st.tenDone) return { id: "ten", say: "This frame is full. A full frame is 10. Tap it.", want: ["fr:0"] };
      const m = pic.Q.data.n - 10, left = range(m).filter(i => st.cnt["b" + i] == null && !st.mine["b" + i]).map(i => "dot:b" + i);
      return countStep(pic, st.taps, m, left, "Now count on from 10. Tap each blue dot.", "Tap each blue dot.");
    },
    teachEnd: () => "How many dots in all? Type the number."
  };

  const K_MAKE10 = {
    init: () => Object.assign(countState(), { fill: {} }),
    label: () => "A ten-frame",
    draw(pic, st, w, h) {
      const k = pic.Q.data.k, g = frameGeom(14, 10, w - 28, h - 24);
      let o = frameSVG(g);
      for (let i = 0; i < 10; i++) {
        const c = cellCenter(g, i), r = g.cell * .34;
        if (i < k) { o += `<g data-role="dot">${counter(c.x, c.y, r, C.pink)}</g>`; continue; }
        const key = "em:" + i, filled = st.fill[i];
        o += `<g${pic.hit(key, c.x - g.cell / 2, c.y - g.cell / 2, g.cell, g.cell)} data-role="empty">${pic.glow(key, c.x - r, c.y - r, r * 2, r * 2, r)}` +
          (filled ? `<g${pic.popCls("m:" + i)}>${counter(c.x, c.y, r, C.mint)}</g>` : `<circle cx="${f(c.x)}" cy="${f(c.y)}" r="${f(r * .9)}" fill="none" stroke="${C.ink}" stroke-opacity=".18" stroke-width="2.5" stroke-dasharray="5 5"/>`) +
          `${markFor(st, i, c.x + r * .75, c.y - r * .75, r * .48)}</g>`;
      }
      return o;
    },
    tap(pic, st, t) {
      const i = +t.key.split(":")[1];
      if (pic.teachMode) { if (st.fill[i]) return; st.fill[i] = true; countTap(pic, st, i, 1, 10 - pic.Q.data.k); return; }
      st.fill[i] = !st.fill[i]; pic.pop("m:" + i); pic.tone([st.fill[i] ? 660 : 420], .06);
    },
    teachStep(pic, st) {
      const left = range(10).filter(i => i >= pic.Q.data.k && !st.fill[i]).map(i => "em:" + i);
      return countStep(pic, st.taps, 10 - pic.Q.data.k, left, "Fill each empty box. Count each one you fill. Tap the empty boxes.", "Fill each empty box.");
    },
    teachEnd: () => "How many did you add to make 10? Type the number."
  };

  // A 0-20 number track like a game board. Only the start, Kitty's landmarks (0, 5, 10, 15, 20) and
  // nothing else carry numbers. A landmark that is the answer is left blank.
  const K_TRACK = {
    init: Q => ({ pos: Q.data.s, visited: {}, counted: {}, said: {}, taps: 0, cn: null, hopped: false }),
    // Kitty counts from this landmark square up to Kitty's square in the lesson.
    from: d => d.target % 5 === 0 ? d.target - 5 : Math.floor(d.target / 5) * 5,
    label: () => "A number track with Hello Kitty on it",
    geom(w, h) {
      let best = null;
      for (const c of [7, 11]) {
        const rows = Math.ceil(21 / c), cell = Math.min((w - 16) / c, (h - 10) / (rows * 1.42 + .1));
        if (!best || cell > best.cell) best = { c, rows, cell };
      }
      const { c, rows, cell } = best, rh = cell * 1.42;
      const ox = (w - c * cell) / 2, oy = (h - rows * rh) / 2 + cell * .36;
      best.at = i => ({ x: ox + (i % c) * cell, y: oy + Math.floor(i / c) * rh });
      return best;
    },
    draw(pic, st, w, h) {
      const d = pic.Q.data, G = this.geom(w, h), s = G.cell * .88, target = d.target;
      let o = "";
      for (let i = 0; i <= 20; i++) {
        const p = G.at(i), x = p.x + (G.cell - s) / 2, y = p.y;
        const landmark = i % 5 === 0 && i !== target, start = i === d.s, counted = st.counted[i];
        const fill = start ? C.pink : landmark ? C.tintSun : C.paper;
        let inner = card(x, y, s, s, { fill, r: s * .22, sh: 3, sw: 2.5 });
        if (start || landmark) inner += text(x + s / 2, y + s * .52, String(i), s * .5, { fill: start ? "#fff" : C.ink, stroke: start ? 3 : 0 });
        else if (counted && st.said[i]) inner += text(x + s / 2, y + s * .52, String(i), s * .5, { fill: C.pinkD });   // Kitty said it (only her first squares)
        else if (counted) inner += tickMark(x + s / 2, y + s * .5, s * .26);   // Marie's own count: a tick, no number
        else inner += `<circle cx="${f(x + s / 2)}" cy="${f(y + s / 2)}" r="${f(s * .08)}" fill="${C.pink}" opacity=".35"/>`;
        if (st.visited[i] && i !== st.pos) inner += `<g opacity=".45">${["-.16 .1", ".14 -.1"].map(v => { const [a, b] = v.split(" ").map(Number); return `<ellipse cx="${f(x + s * (.5 + a))}" cy="${f(y + s * (.78 + b * .5))}" rx="${f(s * .07)}" ry="${f(s * .09)}" fill="${C.pinkD}"/>`; }).join("")}</g>`;
        o += `<g${pic.hit("sq:" + i, x, y, s, s)} data-role="sq" data-i="${i}">${pic.glow("sq:" + i, x, y, s, s, s * .22)}${inner}</g>`;
      }
      const p = G.at(st.pos), ks = G.cell * .66;
      o += `<g class="${pic.pops.has("kitty") ? "nm-hop" : ""}" pointer-events="none">${faceG(pic.api, "kitty", p.x + (G.cell - ks) / 2, p.y - ks * .62, ks)}</g>`;
      return o;
    },
    tap(pic, st, t) {
      const i = +t.key.split(":")[1], d = pic.Q.data;
      if (pic.teachMode && st.cn != null) {
        if (i !== st.cn) return;
        st.counted[i] = true; st.cn++; st.taps++;
        // Kitty says only her first squares, 3 or more squares before Kitty's square. Then Marie counts on.
        if (st.taps <= demoTaps(pic, d.target - this.from(d) + 1) && (pic.full || i !== d.target)) { st.said[i] = true; pic.speak(String(i)); }
        pic.tone([620], .07);
        return;
      }
      if (Math.abs(i - st.pos) === 1) { st.visited[st.pos] = true; st.pos = i; st.hopped = true; pic.pop("kitty"); pic.tone([620, 740], .07, "sine", .06); }
      else if (i !== st.pos) { pic.say("Hop one square at a time."); pic.tone([330], .12, "triangle"); }
    },
    teachStep(pic, st) {
      const d = pic.Q.data, after = d.dir === "after", target = d.target;
      if (st.pos !== target) return { id: "hop", say: `Kitty is on ${d.s}. ${after ? "After means one hop forward" : "Before means one hop back"}. Tap the next square.`, want: ["sq:" + target] };
      const L = this.from(d);
      if (st.cn == null) st.cn = L;
      if (st.cn > target) return null;
      const s = countStep(pic, st.taps, target - L + 1, ["sq:" + st.cn], `Now count from ${L}. Tap ${L}, then each square to Kitty.`, "Tap each square to Kitty.");
      return Object.assign(s, { id: "c" + s.id });
    },
    teachEnd: () => "What number is Kitty on? Type it."
  };

  const K_WORDS = {
    init: () => Object.assign(countState(), { tenDone: false }),
    label: () => "A number card and frames of dots",
    draw(pic, st, w, h) {
      const n = pic.Q.data.n, wide = w / h > 1.25;
      let o = "", cardBox, framesBox;
      if (wide) { const cw = Math.min(w * .32, h * .9); cardBox = [12, (h - cw) / 2, cw, cw]; framesBox = [cw + 26, 6, w - cw - 34, h - 14]; }
      else { const ch = Math.min(h * .34, w * .5); cardBox = [(w - ch * 1.3) / 2, 8, ch * 1.3, ch]; framesBox = [8, ch + 22, w - 16, h - ch - 30]; }
      o += card(cardBox[0], cardBox[1], cardBox[2], cardBox[3], { fill: C.paper, r: 22, sh: 5 });
      o += text(cardBox[0] + cardBox[2] / 2, cardBox[1] + cardBox[3] * .52, String(n), Math.min(cardBox[3] * .62, cardBox[2] * .5), { fill: C.pink, stroke: Math.max(3, cardBox[3] * .035) });
      const [fx, fy, fw, fh] = framesBox;
      const two = n > 10, sub = two ? (fw / fh > 2.6 ? [[fx, fy, fw / 2 - 6, fh], [fx + fw / 2 + 6, fy, fw / 2 - 6, fh]] : [[fx, fy, fw, fh / 2 - 6], [fx, fy + fh / 2 + 6, fw, fh / 2 - 6]]) : [[fx, fy, fw, fh]];
      sub.forEach((b, k) => {
        const g = frameGeom(b[0] + 4, b[1] + 2, b[2] - 8, b[3] - 8), cnt = k === 0 ? Math.min(10, n) : n - 10;
        const regionOn = pic.teachMode && two && k === 0 && !st.tenDone;
        o += regionOn ? `<g${pic.hit("fr:0", g.fx, g.fy, g.cell * 5, g.cell * 2)}>${pic.glow("fr:0", g.fx, g.fy, g.cell * 5, g.cell * 2, 16)}` : "<g>";
        o += frameSVG(g);
        for (let i = 0; i < cnt; i++) {
          const c = cellCenter(g, i), r = g.cell * .34, id = (k ? "b" : "a") + i;
          const tappable = !(pic.teachMode && two && k === 0);
          // Lesson: only the newest word is written; the words before it become ticks, so no word covers another.
          let mk;
          if (pic.teachMode && (st.mine[id] || (st.cnt[id] != null && id !== st.lastId))) mk = tickMark(c.x + r * .75, c.y - r * .75, r * .45);
          else if (pic.teachMode && id === st.lastId && st.cnt[id] != null) {
            const fs = clamp(r * .52, 11, 22), bw = Math.max(fs * 1.5, String(st.cnt[id]).length * fs * .62 + fs * .7);
            mk = badge(clamp(c.x + r * .75, bw / 2 + 2, w - bw / 2 - 2), Math.max(fs, c.y - r * .75), st.cnt[id], r * .52);
          } else mk = markFor(st, id, c.x + r * .75, c.y - r * .75, r * .45);
          o += `<g${tappable ? pic.hit("dot:" + id, c.x - g.cell / 2, c.y - g.cell / 2, g.cell, g.cell) : ""} data-role="dot">${tappable ? pic.glow("dot:" + id, c.x - r, c.y - r, r * 2, r * 2, r) : ""}${counter(c.x, c.y, r, k ? C.sky : C.pink)}${mk}</g>`;
        }
        if (k === 0 && st.tenDone) o += badge(g.fx + g.cell * 5 - 4, g.fy + 2, "ten", Math.max(15, g.cell * .3));
        o += "</g>";
      });
      return o;
    },
    tap(pic, st, t) {
      if (t.key === "fr:0") { if (!st.tenDone) { st.tenDone = true; st.run = 10; pic.speak("Ten!"); pic.tone([523, 784], .1); } return; }
      const id = t.key.split(":")[1];
      if (pic.teachMode) {
        if (st.cnt[id] != null || st.mine[id]) return;
        const n = pic.Q.data.n;
        st.run++; st.taps++; pic.pop("m:" + id);
        // Kitty says only the first 1 or 2 words, 3 or more words before the answer. Then Marie counts on.
        if (st.taps <= demoTaps(pic, n > 10 ? n - 10 : n) && (pic.full || !isAns(pic, WORDS[st.run]))) { st.cnt[id] = WORDS[st.run]; st.lastId = id; pic.speak(WORDS[st.run]); }
        else { st.mine[id] = true; st.lastId = null; }
        pic.tone([620], .07);
        return;
      }
      countTap(pic, st, id);
    },
    teachStep(pic, st) {
      const n = pic.Q.data.n;
      if (n > 10 && !st.tenDone) return { id: "ten", say: "This frame is full. That is ten. Tap it.", want: ["fr:0"] };
      const ids = n > 10 ? range(n - 10).map(i => "b" + i) : range(n).map(i => "a" + i);
      const left = ids.filter(i => st.cnt[i] == null && !st.mine[i]).map(i => "dot:" + i);
      return countStep(pic, st.taps, ids.length, left, n > 10 ? "Now count on from ten. Tap each blue dot." : "Let's count. Tap each dot.", n > 10 ? "Tap each blue dot." : "Tap each dot.");
    },
    teachEnd: () => "Which word says this number? Pick it."
  };

  /* =====================================================================
     TOPIC 2: place_value - "Tens and ones"
     ===================================================================== */
  function matsGeom(places, x, y, w, h) {
    const gap = 8, mw = (w - gap * (places.length - 1)) / places.length;
    return places.map((p, i) => {
      const mx = x + i * (mw + gap), head = clamp(h * .17, 24, 34);
      return { p, x: mx, y, w: mw, h, head, cx: mx + 6, cy: y + head + 4, cw: mw - 12, ch: h - head - 12 };
    });
  }
  // Few flats get big slots; tens and ones always keep room for ten.
  const capFor = (p, most) => p === "H" ? Math.max(4, most || 0) : 10;
  // Sorting never puts more than 9 of a kind on a mat, so the slots fit the blocks of this question (bigger rods on small phones).
  const sortCap = (d, p) => Math.max(p === "H" ? 4 : 5, d[p] || 0);
  function matPieceLayout(m, cap) {
    // On a narrow mat (small phones) the rods are drawn a little fatter, so they stay big enough to see and count.
    const aspect = m.p === "T" ? (m.cw < 110 ? .38 : .3) : 1;
    return slotLayout(cap || 10, m.cw, m.ch, aspect, m.p === "O" ? 70 : m.p === "T" ? 44 : 130);
  }
  function pieceSVG(api, p, x, y, w, h) {
    const P = PLACE[p];
    if (p === "H") return flatSVG(api, x, y, w, P);
    if (p === "T") return rodSVG(api, x, y, w, h, P);
    return cubeSVG(api, x, y, w, P, true);
  }
  // Draws one mat with its pieces. `count` pieces; marks(i) gives extra marks; opts.key overrides hit key.
  function matSVG(pic, m, count, opts) {
    opts = opts || {};
    const P = PLACE[m.p], key = "mat:" + m.p;
    let o = `<g${pic.hit(key, m.x, m.y, m.w, m.h, { pri: -1 })} data-role="mat" data-place="${m.p}">`;
    o += pic.glow(key, m.x, m.y, m.w, m.h, 18);
    if (opts.full) o += ringAt(m.x, m.y, m.w, m.h, 18);
    o += card(m.x, m.y, m.w, m.h, { fill: P.tint, r: 18 });
    o += rr(m.x + 3, m.y + 3, m.w - 6, m.head - 2, 14, P.color, 0, `opacity=".9"`);
    o += text(m.x + m.w / 2, m.y + m.head / 2 + 2, P.name, clamp(Math.min(m.head * .62, m.w / (P.name.length * .62)), 11, 22), { fill: "#fff", stroke: 3 });
    // A digit card Marie has put on this mat sits at the right end of the name bar.
    if (opts.digit != null) { const ch = m.head + 6, cw = ch * .8; o += `<g class="nm-pop" data-role="matdigit">${digitCardSVG(m.x + m.w - cw - 6, m.y + 1, cw, ch, opts.digit, true)}</g>`; }
    const L = matPieceLayout(m, opts.cap);
    for (let i = 0; i < count; i++) {
      const q = L.pos(i), px = m.cx + q.x, py = m.cy + q.y, id = `${m.p}${i}`;
      const pk = "m:" + id;
      o += `<g data-role="piece" data-place="${m.p}"${pic.popCls(pk)}>${pieceSVG(pic.api, m.p, px, py, L.pw, L.ph)}${opts.mark ? opts.mark(i, px, py, L.pw, L.ph) : ""}</g>`;
    }
    return o + "</g>";
  }
  function nearestPieceOnMat(m, count, p, cap) {
    const L = matPieceLayout(m, cap); let best = -1, bd = Infinity;
    for (let i = 0; i < count; i++) { const q = L.pos(i), d = Math.hypot(p.x - (m.cx + q.x + L.pw / 2), p.y - (m.cy + q.y + L.ph / 2)); if (d < bd) { bd = d; best = i; } }
    return best;
  }
  function digitStrip(mats, digits, y, h) {
    let o = "";
    mats.forEach(m => {
      const s = Math.min(h, m.w * .6), x = m.x + (m.w - s) / 2, dg = digits[m.p] == null ? null : digits[m.p] === 0 ? "0" : "?";
      o += dg == null ? rr(x, y, s, s, 12, "#fff", 0, `stroke="${C.ink}" stroke-opacity=".35" stroke-width="2.5" stroke-dasharray="6 5"`)
        : `<g class="nm-pop">${card(x, y, s, s, { fill: "#fff", r: 12, sh: 3 })}${text(x + s / 2, y + s * .53, dg, s * .7, { fill: PLACE[m.p].color })}</g>`;
    });
    return o;
  }
  // Lesson counting of one mat: each tap counts the next piece by its place value.
  // THE LESSON RULE: Kitty says the value only on the first 1 or 2 pieces of the FIRST place she counts
  // (rods: "10, 20"), always 3 or more pieces before the end of that place. Every other tap gets a tick, no number.
  // In the recount (pic.full) Kitty counts everything on: 100, 200, 210, 211 ...
  const firstPlace = (places, counts) => places.find(p => counts[p]);
  function teachCountMat(pic, st, p, counts, places) {
    const done = st.cntN[p] || 0;
    if (done >= counts[p]) return;
    st.cntN[p] = done + 1;
    st.run = (st.run || 0) + PLACE[p].value;
    const v = pic.full ? st.run : st.cntN[p] * PLACE[p].value;
    if (pic.full || (p === firstPlace(places, counts) && st.cntN[p] <= demoTaps(pic, counts[p]) && !isAns(pic, v))) { st.said[p + done] = v; pic.speak(String(v)); }
    pic.tone([620], .07);
    pic.pop("m:" + p + done);
    if (st.cntN[p] === counts[p]) st.digits[p] = counts[p];   // remembered for the steps; the box shows only "?" (see digitStrip)
  }
  function teachCountStep(pic, st, places, counts) {
    const fp = firstPlace(places, counts);
    for (const p of places) {
      if (st.digits[p] != null) continue;
      const P = PLACE[p];
      if (!counts[p]) return { id: "zero" + p, say: `No ${P.many} on the ${P.name} mat. So that digit is 0. Tap the ${P.name} mat.`, want: ["mat:" + p] };
      // After Kitty's first piece or two: "Your turn. Keep counting." (the same words for every amount).
      if (p === fp && !showing(pic, st.cntN[p] || 0, counts[p])) return { id: "turn" + p, say: `${TURN} Tap the ${P.name} mat for each ${P.one}.`, want: ["mat:" + p] };
      const first = !places.slice(0, places.indexOf(p)).some(q => st.digits[q] != null);
      // When the first place has just 1 piece (199 has 1 flat), "Your turn" comes with the next place to count instead,
      // so every place-value lesson says it once.
      const late = !pic.full && p !== fp && counts[fp] <= 1 && places.filter(q => q !== fp && counts[q])[0] === p;
      return { id: "cnt" + p, say: `${pic.full && first ? "Let's count all of it together, out loud. " : ""}${late ? TURN + " " : ""}${first ? "Count" : "Now count"} the ${P.many}. Each one is ${P.value}. Tap the ${P.name} mat for each one.`, want: ["mat:" + p] };
    }
    return null;
  }
  // Only Kitty's newest said value is written on a badge; every other counted piece (and all of Marie's own) gets a tick.
  const teachMark = (st, p) => (i, x, y, w, h) => (st.cntN[p] || 0) > i ? (st.said[p + i] != null && i === st.cntN[p] - 1 ? badge(x + w / 2, y + Math.min(h / 2, 18), st.said[p + i], clamp(w * .32, 11, 16))
    : tickMark(x + w / 2, y + Math.min(h / 2, 18), clamp(w * .22, 8, 12))) : "";

  // Place-value sorting (levels 1, 2, 3 and 4 of "Tens and ones").
  // Everything starts loose in the pile; the mats start empty. Marie moves each thing to a mat herself:
  // drag it, or tap it (it gets a yellow ring) and then tap a mat. A wrong mat sends it back with a short reason.
  // Level 2 ("What is the 8 worth in 83?") also has the two digit cards in the pile: she puts each digit on
  // the mat for its place, puts the blocks on the mats, then counts the rods by tens.
  // Kitty's lesson starts from the same loose pile, and Marie does every move.
  function digitCardSVG(x, y, w, h, digit, lift) {
    return card(x, y, w, h, { fill: "#fff", r: Math.min(14, w * .22), sh: lift ? 5 : 3 }) + text(x + w / 2, y + h * .54, String(digit), Math.min(h * .62, w * .8), { fill: C.ink });
  }
  const K_PVSORT = {
    init(Q) {
      const d = Q.data, pieces = [];
      let id = 0;
      for (const p of d.places) for (let i = 0; i < d[p]; i++) pieces.push({ id: id++, p, at: "pile" });
      if (d.kind === "pvdigit") for (const p of d.places) pieces.push({ id: id++, p, at: "pile", card: true, digit: d[p] });
      const C2 = pieces.length + Math.max(2, Math.ceil(pieces.length * .3));
      const cells = shuffle(range(C2));
      pieces.forEach((pc, i) => { pc.cell = cells[i]; pc.jx = Math.random() * 2 - 1; pc.jy = Math.random() * 2 - 1; });
      return { pieces, C: C2, tick: {}, cntN: {}, digits: {}, said: {}, run: 0, dragging: null, sel: null, order: id };
    },
    label: pic => pic.Q.data.kind === "pvdigit" ? "Two digit cards and some blocks to put on the tens and ones mats" : "Base-ten blocks to put on the place-value mats",
    pileLeft: st => st.pieces.some(pc => pc.at === "pile"),
    geom(pic, st, w, h) {
      const d = pic.Q.data, places = d.places, pad = 6;
      // While anything is still in the pile, the pile sits on top. When the pile is empty it goes away (no empty tray is left).
      if (this.pileLeft(st) || st.dragging) {
        // A big pile on a small screen gets more room (the mats are still nearly empty), so its blocks stay big and far
        // enough apart to tap one without getting its neighbour.
        // As the pile empties, it steps down in size and the mats get the room back (only at these few steps, so blocks rarely move).
        const n = st.pieces.filter(pc => pc.at === "pile").length;
        const pileH = Math.round(h * (n > 16 && w < 480 ? .66 : n > 10 && w < 480 ? .6 : n > 6 && w < 480 ? .56 : .5));
        return { pile: { x: pad, y: pad, w: w - pad * 2, h: pileH - pad }, mats: matsGeom(places, pad, pileH + 8, w - pad * 2, h - pileH - 16) };
      }
      if (pic.teachMode && d.kind === "pvsort") { const dh = clamp(h * .16, 40, 64); return { mats: matsGeom(places, pad, pad, w - pad * 2, h - dh - pad * 2 - 10), digitY: h - dh - pad, digitH: dh }; }
      return { mats: matsGeom(places, pad, pad, w - pad * 2, h - pad * 2) };
    },
    // Lay out the things in the pile as big as the pile allows. The layout is kept while the pile keeps its size, so
    // nothing jumps when a block leaves. When the pile steps down in size, the blocks still in it are laid out again.
    pileLayout(G, st) {
      const b = G.pile, key = `${Math.round(b.w)}x${Math.round(b.h)}`;
      if (st.pl && st.pl.key === key) return st.pl;
      const dim = { H: [1.5, 1.5], T: [.95, 2.4], O: [1, 1], card: [1.25, 1.55] }, order = st.pieces.filter(pc => pc.at === "pile").sort((a, c) => a.cell - c.cell);
      const W = b.w - 16, Hh = b.h - 16;
      const items = order.map(pc => { const [dw, dh] = dim[pc.card ? "card" : pc.p]; return { pc, dw, dh }; });
      const totW = items.reduce((a, it) => a + it.dw, 0);
      // Lay the pile out in nR rows, with the biggest blocks that fit. The rows are made about equal in width
      // (byCount false) or in the number of blocks (byCount true); both are tried.
      const layoutRows = (nR, byCount) => {
        const groups = []; let cur = [], acc = 0;
        items.forEach((it, i) => {
          const full = byCount ? i >= Math.ceil(items.length * (groups.length + 1) / nR) : acc + it.dw / 2 > totW * (groups.length + 1) / nR;
          if (cur.length && groups.length < nR - 1 && full) { groups.push(cur); cur = []; }
          cur.push(it); acc += it.dw;
        });
        groups.push(cur);
        let u = 70;
        groups.forEach(g => { u = Math.min(u, W / (g.reduce((a, it) => a + it.dw, 0) + .3 * (g.length - 1))); });
        u = Math.min(u, Hh / (groups.reduce((a, g) => a + Math.max(...g.map(it => it.dh)), 0) + .3 * (groups.length - 1)));
        const rows = groups.map(g => { const its = g.map(it => ({ pc: it.pc, iw: it.dw * u, ih: it.dh * u })); return { items: its, h: Math.max(...its.map(it => it.ih)) }; });
        return { u, rows };
      };
      // Every row is spread across the whole pile and the rows over its whole height, so what matters for a finger
      // is how far apart the block centres are. A tap a little off a thin rod must still get that rod and not the
      // block beside it (iPhone SE). Centres in a row sit at equal steps when the blocks fit that way (a fat flat
      // next to a thin rod is then no closer than two rods); otherwise the gaps between blocks are equal.
      const rowXs = r => {
        const n = r.items.length, step = W / n;
        if (r.items.every((it, j) => !j || (r.items[j - 1].iw + it.iw) / 2 + 2 <= step)) return r.items.map((it, j) => b.x + 8 + step * (j + .5));
        const extra = (W - r.items.reduce((a, it) => a + it.iw, 0)) / n; let x = b.x + 8 + extra / 2;
        return r.items.map(it => { const c = x + it.iw / 2; x += it.iw + extra; return c; });
      };
      const vGapOf = P => P.rows.length > 1 ? (Hh - P.rows.reduce((a, r) => a + r.h, 0)) / (P.rows.length - 1) : 0;
      const spreadOf = P => {
        const vGap = vGapOf(P);
        let m = Infinity;
        P.rows.forEach((r, i) => {
          const xs = rowXs(r);
          for (let j = 1; j < xs.length; j++) m = Math.min(m, xs[j] - xs[j - 1]);
          if (i) m = Math.min(m, (P.rows[i - 1].h + r.h) / 2 + vGap);
        });
        return m;
      };
      // Try 1 to 6 rows (rows equal in width, or in number of blocks). Take the biggest blocks whose closest two
      // centres are at least 26 px apart; if none are, take the layout with centres furthest apart.
      // Blocks never shrink below 7/10 of the biggest that fit.
      const cands = [];
      for (let nR = 1; nR <= Math.min(6, items.length); nR++) cands.push(layoutRows(nR, false), layoutRows(nR, true));
      const uMax = Math.max(...cands.map(c => c.u));
      const scored = cands.filter(c => c.u >= uMax * .7).map(c => ({ c, sp: spreadOf(c) }));
      const roomy = scored.filter(q => q.sp >= 26).sort((x, y) => y.c.u - x.c.u);
      const pick = roomy.length ? roomy[0] : scored.sort((x, y) => y.sp - x.sp)[0];
      const P = pick.c;
      // A crowded pile gets no jiggle, so it never brings two blocks closer; a roomy pile gets a small one.
      const jig = pick.sp >= 32 ? 1 : 0;
      const pos = {}, nR = P.rows.length, rowsH = P.rows.reduce((a, r) => a + r.h, 0), vGap = vGapOf(P);
      let y = b.y + 8 + (nR > 1 ? 0 : (Hh - rowsH) / 2);
      P.rows.forEach(r => {
        const xs = rowXs(r);
        r.items.forEach((it, j) => {
          const jx = jig * it.pc.jx * 2, jy = jig * it.pc.jy * Math.min((r.h - it.ih) / 2, 3);
          pos[it.pc.id] = { x: xs[j] - it.iw / 2 + jx, y: y + (r.h - it.ih) / 2 + jy, w: it.iw, h: it.ih };
        });
        y += r.h + vGap;
      });
      st.pl = { key, pos };
      return st.pl;
    },
    pilePos(G, st, pc) { return this.pileLayout(G, st).pos[pc.id]; },
    thingSVG(api, pc, x, y, w, h) { return pc.card ? digitCardSVG(x, y, w, h, pc.digit) : pieceSVG(api, pc.p, x, y, w, h); },
    draw(pic, st, w, h) {
      const G = this.geom(pic, st, w, h), d = pic.Q.data;
      let o = "";
      if (G.pile) {
        const b = G.pile;
        o += card(b.x, b.y, b.w, b.h, { fill: C.paper, r: 20 }) + `<rect x="${f(b.x + 2)}" y="${f(b.y + 2)}" width="${f(b.w - 4)}" height="${f(b.h - 4)}" rx="18" fill="${C.pink}" opacity=".07"/>`;
        st.pieces.filter(pc => pc.at === "pile").forEach(pc => {
          const r = this.pilePos(G, st, pc), key = "pc:" + pc.id, role = pc.card ? "digitcard" : "piece";
          if (st.dragging === key) { o += `<g opacity=".25">${this.thingSVG(pic.api, pc, r.x, r.y, r.w, r.h)}</g>`; pic.hit(key, r.x, r.y, r.w, r.h); return; }
          const ring = st.sel === pc.id ? rr(r.x - 6, r.y - 6, r.w + 12, r.h + 12, 12, C.sun, 3) : "";
          o += `<g${pic.hit(key, r.x, r.y, r.w, r.h)} data-role="${role}" data-place="${pc.p}"${pc.card ? ` data-digit="${pc.digit}"` : ""}${st.sel === pc.id ? ` data-sel="1"` : ""}>${pic.glow(key, r.x, r.y, r.w, r.h, 10)}${ring}${this.thingSVG(pic.api, pc, r.x, r.y, r.w, r.h)}</g>`;
        });
      }
      const counting = pic.teachMode && !this.pileLeft(st);
      G.mats.forEach(m => {
        const on = st.pieces.filter(pc => pc.at === "mat" && pc.p === m.p && !pc.card), cd = st.pieces.find(pc => pc.card && pc.at === "mat" && pc.p === m.p);
        const teachMarks = counting && (d.kind === "pvsort" || m.p === "T");
        o += matSVG(pic, m, on.length, { cap: sortCap(d, m.p), digit: cd ? cd.digit : null,
          mark: teachMarks ? teachMark(st, m.p) : (i, x, y, pw, ph) => st.tick[on[i].id] ? tickMark(x + pw - 2, y + 4, clamp(pw * .22, 8, 13)) : "" });
      });
      if (G.digitH) o += digitStrip(G.mats, st.digits, G.digitY, G.digitH);
      return o;
    },
    canDrag: (pic, st, t) => t.key.startsWith("pc:"),
    ghost(pic, st, t) {
      const pc = st.pieces.find(q => "pc:" + q.id === t.key), r = { w: t.w, h: t.h };
      return { x: -4, y: -4, w: r.w + 8, h: r.h + 12, svg: this.thingSVG(pic.api, pc, 0, 0, r.w, r.h) };
    },
    drop(pic, st, t, p) {
      const pc = st.pieces.find(q => "pc:" + q.id === t.key);
      st.sel = null;
      const G = this.geom(pic, st, pic.w, pic.h);
      const m = G.mats.find(m => p.x >= m.x - 12 && p.x <= m.x + m.w + 12 && p.y >= m.y - 12 && p.y <= m.y + m.h + 12);
      if (!m) return;
      if (m.p === pc.p) { this.place(pic, st, pc); return; }
      this.wrongMat(pic, pc);
    },
    wrongMat(pic, pc) {
      const P = PLACE[pc.p];
      if (pc.card) pic.say(`Look at ${pic.Q.data.n} again. Which place is the ${pc.digit} in? The left digit is tens. The right digit is ones.`);
      else pic.say(`That is a ${P.one}. ${P.many[0].toUpperCase() + P.many.slice(1)} go on the ${P.name} mat.`);
      pic.tone([330], .14, "triangle");
    },
    place(pic, st, pc) {
      pc.at = "mat"; st.order++;
      const k = st.pieces.filter(q => q.at === "mat" && q.p === pc.p && !q.card).length - 1;
      if (!pc.card) pic.pop("m:" + pc.p + k);
      pic.tone([600, 760], .06, "sine", .05);
    },
    tap(pic, st, t, p) {
      const d = pic.Q.data;
      if (t.key.startsWith("pc:")) {
        const pc = st.pieces.find(q => "pc:" + q.id === t.key);
        if (!pc || pc.at !== "pile") return;
        st.sel = st.sel === pc.id ? null : pc.id;
        pic.tone([st.sel != null ? 600 : 420], .06);
        return;
      }
      const place = t.key.split(":")[1];
      if (st.sel != null) {
        const pc = st.pieces.find(q => q.id === st.sel);
        if (pc.p === place) { st.sel = null; this.place(pic, st, pc); } else this.wrongMat(pic, pc);
        return;
      }
      if (pic.teachMode) {
        if (this.pileLeft(st)) { pic.say("First tap a block in the pile."); return; }
        if (d.kind === "pvdigit") { if (place === "T") teachCountMat(pic, st, "T", { T: d.T }, ["T"]); return; }
        const counts = { H: d.H || 0, T: d.T || 0, O: d.O || 0 };
        if (!counts[place]) { st.digits[place] = 0; pic.speak("Zero"); pic.tone([440], .1); return; }
        teachCountMat(pic, st, place, counts, d.places); return;
      }
      if (this.pileLeft(st)) { pic.say("Tap a block in the pile first. Then tap its mat."); pic.tone([330], .12, "triangle"); return; }
      const G = this.geom(pic, st, pic.w, pic.h), m = G.mats.find(q => q.p === place), on = st.pieces.filter(pc => pc.at === "mat" && pc.p === place && !pc.card);
      const i = nearestPieceOnMat(m, on.length, p, sortCap(d, place));
      if (i >= 0) { const id = on[i].id; st.tick[id] = !st.tick[id]; pic.tone([st.tick[id] ? 640 : 420], .06); }
    },
    teachStep(pic, st) {
      const d = pic.Q.data, pile = st.pieces.filter(pc => pc.at === "pile");
      if (pile.length) {
        const sel = st.sel != null ? st.pieces.find(q => q.id === st.sel) : null;
        if (sel && sel.card) return sel.p === "T" ? { id: "cardT", say: `The ${sel.digit} is the left digit of ${d.n}. The left digit tells the tens. Tap the Tens mat.`, want: ["mat:T"] }
          : { id: "cardO", say: `The ${sel.digit} is the right digit. It tells the ones. Tap the Ones mat.`, want: ["mat:O"] };
        if (sel) { const P = PLACE[sel.p]; return { id: "put" + sel.p, once: true, say: `That is a ${P.one}. Tap the ${P.name} mat.`, want: ["mat:" + sel.p] }; }
        const cards = pile.filter(pc => pc.card);
        if (cards.length) { const c = cards.find(q => q.p === "T") || cards[0]; return { id: "pick" + c.p, say: `Put the digits on the mats. Tap the ${c.digit} card.`, want: ["pc:" + c.id] }; }
        return { id: "pick", once: true, say: "Put each block on its mat. Tap a block in the pile.", want: pile.map(pc => "pc:" + pc.id) };
      }
      if (d.kind === "pvdigit") {
        const n = st.cntN.T || 0;
        if (n >= d.T) return null;
        return showing(pic, n, d.T) ? { id: "cntT", say: `${pic.full ? "Let's count all the rods together, out loud. " : ""}The ${d.T} is on the Tens mat. Count the rods by tens. Tap the Tens mat for each rod.`, want: ["mat:T"] }
          : { id: "turnT", say: `${TURN} Tap the Tens mat for each rod.`, want: ["mat:T"] };
      }
      return teachCountStep(pic, st, d.places, { H: d.H || 0, T: d.T || 0, O: d.O || 0 });
    },
    teachEnd: (pic) => pic.Q.data.kind === "pvdigit" ? `So what is the ${pic.Q.data.T} worth? Type it.` : PV_END(pic.Q.data.places)
  };

  const K_PVTRADE = {
    init(Q, pic) { const d = Q.data; return { c: { H: d.H, T: d.T, O: d.O }, acted: false, cntN: {}, digits: {}, said: {}, run: 0 }; },
    label: () => "Hundreds, tens and ones mats with an add or take button",
    geom(pic, w, h) {
      const pad = 6, bh = clamp(h * .17, 54, 64), dh = pic.teachMode ? clamp(h * .13, 36, 56) : 0;
      return { mats: matsGeom(["H", "T", "O"], pad, pad, w - pad * 2, h - bh - dh - pad * 2 - 12 - (dh ? 8 : 0)), digitY: h - bh - dh - 10, digitH: dh, by: h - bh - 2, bh };
    },
    draw(pic, st, w, h) {
      const d = pic.Q.data, G = this.geom(pic, w, h), after = d.dir === "after";
      let o = "";
      G.mats.forEach(m => {
        const full = !pic.teachMode && after && m.p !== "H" && st.c[m.p] >= 10;
        o += matSVG(pic, m, st.c[m.p], { cap: capFor(m.p, d.H + 1), full, mark: pic.teachMode ? teachMark(st, m.p) : null });
      });
      // The digit boxes appear only when the counting starts, so no empty boxes wait there unexplained.
      if (pic.teachMode && G.digitH && this.tradeDone(st)) o += digitStrip(G.mats, st.digits, G.digitY, G.digitH);
      const bw = Math.min(260, w * .56), bx = (w - bw) / 2 - (pic.teachMode ? 0 : 30), key = "btn:act", dis = st.acted;
      o += `<g${pic.hit(key, bx, G.by, bw, G.bh - 6, { pri: 1 })} data-role="button">${pic.glow(key, bx, G.by, bw, G.bh - 6, 18)}${card(bx, G.by, bw, G.bh - 8, { fill: dis ? "#e9e1e5" : after ? C.mint : C.sun, r: 18 })}` +
        cubeSVG(pic.api, bx + 12, G.by + (G.bh - 8 - 30) / 2, 30, PLACE.O, false) +
        text(bx + bw / 2 + 16, G.by + (G.bh - 8) / 2 + 1, after ? "Add 1" : "Take 1", clamp(G.bh * .42, 18, 26), { fill: dis ? C.soft : "#fff", stroke: dis ? 0 : 3 }) + "</g>";
      const rx = bx + bw + 14, rs = G.bh - 8;
      if (!pic.teachMode) o += `<g${pic.hit("btn:reset", rx, G.by, rs, rs, { pri: 1 })} data-role="button">${card(rx, G.by, rs, rs, { fill: C.paper, r: rs / 2 })}${text(rx + rs / 2, G.by + rs / 2 + 1, "⟲", rs * .55)}</g>`;
      return o;
    },
    tap(pic, st, t) {
      const d = pic.Q.data, after = d.dir === "after", c = st.c;
      if (t.key === "btn:reset") { pic.st = this.init(pic.Q, pic); pic.tone([440, 330], .06); return; }
      if (t.key === "btn:act") {
        if (st.acted) { pic.say(after ? "You added one. Now count the blocks." : "You took one. Now count the blocks."); return; }
        if (after) { c.O++; st.acted = true; pic.pop("m:O" + (c.O - 1)); pic.tone([620, 780], .07); if (c.O === 10 && !pic.teachMode) pic.say("Ten cubes! Tap the Ones mat to make them a rod."); return; }
        if (c.O > 0) { c.O--; st.acted = true; pic.tone([520, 400], .07); return; }
        pic.say(c.T > 0 ? "No cubes. Tap the Tens mat to open a rod." : "No cubes or rods. Tap the Hundreds mat to open a flat."); pic.tone([330], .12, "triangle"); return;
      }
      const p = t.key.split(":")[1];
      if (pic.teachMode && this.tradeDone(st)) {
        const counts = { H: c.H, T: c.T, O: c.O };
        if (!counts[p]) { st.digits[p] = 0; pic.speak("Zero"); pic.tone([440], .1); return; }
        teachCountMat(pic, st, p, counts, ["H", "T", "O"]); return;
      }
      if (after) {
        if (p === "O" && c.O >= 10) { c.O -= 10; c.T++; pic.pop("m:T" + (c.T - 1)); pic.tone([523, 659, 784], .07); if (c.T === 10 && !pic.teachMode) pic.say("Ten rods! Tap the Tens mat to make a flat."); return; }
        if (p === "T" && c.T >= 10) { c.T -= 10; c.H++; pic.pop("m:H" + (c.H - 1)); pic.tone([523, 659, 784, 1047], .07); return; }
      } else {
        if (p === "T" && c.O === 0 && c.T > 0 && !st.acted) { c.T--; c.O += 10; pic.tone([700, 560], .07); pic.say("You opened a rod. Now there are ten cubes."); return; }
        if (p === "H" && c.O === 0 && c.T === 0 && c.H > 0 && !st.acted) { c.H--; c.T += 10; pic.tone([700, 560], .07); pic.say("You opened a flat. Now there are ten rods."); return; }
      }
      pic.tone([480], .05);
    },
    tradeDone(st) { return st.acted && st.c.O < 10 && st.c.T < 10; },
    teachStep(pic, st) {
      const d = pic.Q.data, c = st.c, after = d.dir === "after";
      if (!st.acted) {
        if (after || c.O > 0) return { id: "act", say: after ? `We start with ${d.start}. Add one cube. Tap Add 1.` : `We start with ${d.start}. Take one cube away. Tap Take 1.`, want: ["btn:act"] };
        if (c.T > 0) return { id: "openT", say: "There are no cubes. Open a rod: tap the Tens mat.", want: ["mat:T"] };
        return { id: "openH", say: "There are no cubes and no rods. Open a flat: tap the Hundreds mat.", want: ["mat:H"] };
      }
      if (c.O >= 10) return { id: "bundleO", say: "Ten cubes make one rod. Tap the Ones mat.", want: ["mat:O"] };
      if (c.T >= 10) return { id: "bundleT", say: "Ten rods make one flat. Tap the Tens mat.", want: ["mat:T"] };
      return teachCountStep(pic, st, ["H", "T", "O"], { H: c.H, T: c.T, O: c.O });
    },
    teachEnd: () => PV_END(["H", "T", "O"])
  };

  /* =====================================================================
     TOPIC 3: compare_numbers - "Bigger or smaller"
     ===================================================================== */
  function bowSVG(cx, cy, s) {
    const k = s / 40;
    return `<g transform="translate(${f(cx)} ${f(cy)}) scale(${f(k * 100) / 100})"><path d="M0 0 C-20 -18 -26 12 0 4 Z" fill="#e8203f" stroke="${C.ink}" stroke-width="3.5" stroke-linejoin="round"/><path d="M0 0 C20 -18 26 12 0 4 Z" fill="#e8203f" stroke="${C.ink}" stroke-width="3.5" stroke-linejoin="round"/><circle cx="0" cy="1.5" r="6.5" fill="#e8203f" stroke="${C.ink}" stroke-width="3.5"/><ellipse cx="-11" cy="-5" rx="4" ry="2.2" fill="#fff" opacity=".6"/></g>`;
  }
  // Compare two numbers. Both sides start EMPTY. Marie builds each number herself:
  // each row has a round "+" button that adds one block of that kind (cubes; or flats, rods and cubes),
  // and tapping a block she built takes it off again. Only after building can she see which side has more.
  // Kitty's lesson builds the same way: Marie taps "+" for every block. Kitty counts only the first 1 or 2 blocks.
  const K_CMP = {
    init() { return { built: { L: { H: 0, T: 0, O: 0 }, R: { H: 0, T: 0, O: 0 } }, cnt: {}, mine: {}, plan: null, pi: 0, run: 0, taps: 0, wrong: 0, sayPrefix: "" }; },
    label: () => "Two sides to build the numbers with blocks",
    geom(pic, w, h) {
      const gap = clamp(w * .12, 52, 92), pw = (w - gap - 12) / 2, head = clamp(h * .17, 40, 64);
      return { gap, pw, head, L: { x: 6, y: 6, w: pw, h: h - 14 }, R: { x: 6 + pw + gap, y: 6, w: pw, h: h - 14 }, bow: { x: 6 + pw, y: 6, w: gap, h: h - 14 } };
    },
    places(d) { return d.mode === "cubes" ? ["O"] : (Math.max(d.a, d.b) >= 100 ? ["H", "T", "O"] : ["T", "O"]); },
    cap: d => d.mode === "cubes" ? 20 : 9,
    target(d, side, p) { const n = side === "L" ? d.a : d.b; return d.mode === "cubes" ? n : digitsOf(n)[p]; },
    // Rows (one per kind of block) for each side, with the slot for every block and the "+" button.
    layout(pic, w, h) {
      const d = pic.Q.data, G = this.geom(pic, w, h), bodyY = G.L.y + G.head + 8, bodyH = G.L.h - G.head - 14;
      const out = { G, L: [], R: [] }, places = this.places(d);
      for (const side of ["L", "R"]) {
        const b = G[side];
        if (d.mode === "cubes") {
          // Two columns of ten, from the bottom up. The "+" sits in its own strip on the right.
          const pr = clamp(b.w * .12, 13, 19), aw = b.w - 12 - pr * 2 - 6;
          const s = Math.min(bodyH / 10.6, (aw - 4) / 2.35, 46), x0 = b.x + 6 + (aw - s * 2.3) / 2;
          out[side].push({ p: "O", x: b.x + 6, y: bodyY, w: b.w - 12, h: bodyH, plus: { cx: b.x + b.w - 6 - pr, cy: bodyY + bodyH - pr - 2, r: pr },
            slot: i => ({ x: x0 + Math.floor(i / 10) * s * 1.3, y: bodyY + bodyH - (i % 10 + 1) * s * 1.04, w: s, h: s }) });
          continue;
        }
        const wt = { H: 1.15, T: 1.05, O: .75 }, tot = places.reduce((a, p) => a + wt[p], 0);
        let y = bodyY;
        places.forEach(p => {
          const rh = bodyH * wt[p] / tot, pr = clamp(Math.min(rh * .3, b.w * .11), 13, 19), aw = b.w - 12 - pr * 2 - 6;
          const L = slotLayout(9, aw, rh - 8, p === "T" ? .3 : 1, p === "O" ? 54 : p === "T" ? 36 : 110), y0 = y;
          out[side].push({ p, x: b.x + 6, y: y0, w: b.w - 12, h: rh, plus: { cx: b.x + b.w - 6 - pr, cy: y0 + rh / 2, r: pr },
            slot: i => { const q = L.pos(i); return { x: b.x + 6 + q.x, y: y0 + 4 + q.y, w: L.pw, h: L.ph }; } });
          y += rh;
        });
      }
      return out;
    },
    draw(pic, st, w, h) {
      const d = pic.Q.data, Lay = this.layout(pic, w, h), G = Lay.G;
      const choosing = pic.teachMode && pic.teachStep && pic.teachStep.id.startsWith("choose");
      let o = "";
      for (const side of ["L", "R"]) {
        const b = G[side], S = SIDE[side], n = side === "L" ? d.a : d.b, key = "side:" + side;
        o += `<g${choosing ? pic.hit(key, b.x, b.y, b.w, b.h) : ""} data-role="panel" data-side="${side}">${choosing ? pic.glow(key, b.x, b.y, b.w, b.h, 20) : ""}`;
        o += card(b.x, b.y, b.w, b.h, { fill: S.tint, r: 20 });
        // The friend's face, then the number beside it (never on top of the face).
        const faceS = Math.min(G.head * .9, 44), room = b.w - faceS - 20, fs = Math.min(G.head * .8, room / (String(n).length * .62 + .2));
        o += faceG(pic.api, S.who, b.x + 8, b.y + (G.head - faceS) / 2 + 4, faceS);
        o += text(b.x + 12 + faceS + room / 2, b.y + G.head / 2 + 5, String(n), fs, { fill: S.color, stroke: Math.max(2.5, fs * .07) });
        o += `<line x1="${f(b.x + 10)}" y1="${f(b.y + G.head + 4)}" x2="${f(b.x + b.w - 10)}" y2="${f(b.y + G.head + 4)}" stroke="${C.ink}" stroke-opacity=".2" stroke-width="2" stroke-dasharray="6 6"/>`;
        Lay[side].forEach((R, ri) => {
          if (ri) o += `<line x1="${f(b.x + 10)}" y1="${f(R.y)}" x2="${f(b.x + b.w - 10)}" y2="${f(R.y)}" stroke="${C.ink}" stroke-opacity=".12" stroke-width="2"/>`;
          const P = { who: S.who, color: S.color, tint: "#fff" }, made = st.built[side][R.p];
          for (let i = 0; i < made; i++) {
            const r = R.slot(i), id = `${side}:${R.p}:${i}`, k2 = "pc:" + id;
            const art = R.p === "H" ? flatSVG(pic.api, r.x, r.y, r.w, P) : R.p === "T" ? rodSVG(pic.api, r.x, r.y, r.w, r.h, P) : cubeSVG(pic.api, r.x, r.y, r.w, P, d.mode !== "cubes" || r.w >= 40);
            // Lesson: in each row only the newest count is written; the blocks counted before it get ticks.
            const newest = st.cnt[id] != null && i === made - 1;
            const mark = st.mine[id] ? tickMark(r.x + r.w / 2, r.y + Math.min(r.h / 2, 14), clamp(r.w * .3, 8, 11)) : st.cnt[id] == null ? "" : newest ? badge(r.x + r.w / 2, r.y + Math.min(r.h / 2, 14), st.cnt[id], clamp(r.w * .4, 11, 15)) : tickMark(r.x + r.w / 2, r.y + Math.min(r.h / 2, 14), clamp(r.w * .3, 8, 11));
            // While Marie works, tapping a block she built takes it off. In the lesson the blocks are not buttons.
            o += `<g${pic.teachMode || choosing ? "" : pic.hit(k2, r.x, r.y, r.w, r.h)} data-role="piece" data-side="${side}" data-place="${R.p}"${pic.popCls("m:" + id)}>${art}${mark}</g>`;
          }
          if (!choosing) {
            const ak = `add:${side}:${R.p}`, q = R.plus, full = made >= this.cap(d);
            // A dashed outline of the next block shows what the plus adds and where it will go.
            if (!full) { const r = R.slot(made), rad = R.p === "T" ? Math.min(r.w * .3, 6) : Math.min(10, r.w * .2); o += `<g data-role="ghost" pointer-events="none">${rr(r.x, r.y, r.w, r.h, rad, "#fff", 0, `fill-opacity=".55" stroke="${S.color}" stroke-opacity=".55" stroke-width="2" stroke-dasharray="5 4"`)}</g>`; }
            o += `<g${pic.hit(ak, q.cx - q.r, q.cy - q.r, q.r * 2, q.r * 2, { pri: 1 })} data-role="plus" data-side="${side}" data-place="${R.p}">${pic.glow(ak, q.cx - q.r, q.cy - q.r, q.r * 2, q.r * 2, q.r)}` +
              `<circle cx="${f(q.cx)}" cy="${f(q.cy + 3)}" r="${f(q.r)}" fill="${C.ink}"/><circle cx="${f(q.cx)}" cy="${f(q.cy)}" r="${f(q.r)}" fill="${full ? "#e9e1e5" : C.mint}" stroke="${C.ink}" stroke-width="2.5"/>` +
              `<path d="M${f(q.cx - q.r * .45)} ${f(q.cy)}H${f(q.cx + q.r * .45)}M${f(q.cx)} ${f(q.cy - q.r * .45)}V${f(q.cy + q.r * .45)}" stroke="${full ? C.soft : "#fff"}" stroke-width="${f(Math.max(3, q.r * .28))}" stroke-linecap="round"/></g>`;
          }
        });
        o += "</g>";
      }
      const bs = Math.min(G.gap * .8, 60), bx = G.bow.x + G.gap / 2, by = G.bow.y + G.head / 2 + 4;
      o += `<g${choosing ? pic.hit("bow:0", bx - 26, by - 26, 52, 52, { pri: 1 }) : ""} data-role="bow">${choosing ? pic.glow("bow:0", bx - bs / 2, by - bs / 2, bs, bs, bs / 2) : ""}${bowSVG(bx, by - 4, bs)}${text(bx, by + bs * .52, "?", bs * .5, { fill: C.pinkD })}</g>`;
      return o;
    },
    tap(pic, st, t) {
      const d = pic.Q.data;
      if (t.key.startsWith("add:")) {
        const [, side, p] = t.key.split(":"), b = st.built[side];
        if (b[p] >= this.cap(d)) {
          pic.say(d.mode === "cubes" ? "There is no more room. Count the cubes." : `Nine is the most here. Ten ${PLACE[p].many} make one ${p === "O" ? "rod" : "flat"}.`);
          pic.tone([330], .12, "triangle"); return;
        }
        const id = `${side}:${p}:${b[p]}`;
        b[p]++; pic.pop("m:" + id); pic.tone([620], .06);
        if (pic.teachMode) {
          // THE LESSON RULE: Kitty counts only the first 1 or 2 blocks of each number she asks for; then Marie counts on (ticks).
          st.run += PLACE[p].value; st.taps++;
          const s = st.plan && st.plan[st.pi], goal = s && s.type === "build" ? this.target(d, s.side, s.p) : 0;
          if (st.taps <= demoTaps(pic, goal)) { st.cnt[id] = st.run; pic.speak(String(st.run)); } else st.mine[id] = true;
        }
        return;
      }
      if (t.key.startsWith("pc:")) { const [, side, p] = t.key.split(":"); if (st.built[side][p] > 0) { st.built[side][p]--; pic.tone([420], .06); } return; }
      if (!pic.teachMode) return;
      const s = st.plan[st.pi];
      if (!s || s.type !== "choose") return;
      // Each choice is Marie's: she looks at both sides and decides. Kitty only says if it was right after she taps.
      if (t.key === s.right) { s.done = true; st.wrong = 0; pic.tone([523, 659, 784], .08); return; }
      st.wrong++; pic.tone([330], .14, "triangle");
      // A wrong tap gets the same open question again. It never says which side or "the same" (that is the answer).
      pic.say(`Look again. ${this.ask(d, s)}`);
    },
    // The open question for one choice. The same words for every answer, so the words never decide for her.
    ask(d, s) { const what = s.p ? PLACE[s.p].many : d.mode === "cubes" ? "cubes" : "blocks"; return `Which side has more ${what}? Tap that side. The same? Tap the bow.`; },
    buildPlan(pic) {
      const d = pic.Q.data, plan = [], places = this.places(d), A = digitsOf(d.a), B = digitsOf(d.b);
      const side0 = (x, y) => x > y ? "side:L" : x < y ? "side:R" : "bow:0";
      if (d.mode === "cubes") { plan.push({ type: "build", side: "L", p: "O" }, { type: "build", side: "R", p: "O" }, { type: "choose", p: null, right: side0(d.a, d.b) }); return plan; }
      // Place by place: build both sides, then Marie judges that place herself (more on one side, or the same).
      // Only when she says "the same" does Kitty go on to the next place. A place with no blocks on either side is skipped.
      for (const p of places) {
        if (A[p]) plan.push({ type: "build", side: "L", p });
        if (B[p]) plan.push({ type: "build", side: "R", p });
        if (A[p] !== B[p]) { plan.push({ type: "choose", p, right: side0(A[p], B[p]) }); return plan; }
        if (A[p] || B[p]) plan.push({ type: "choose", p, right: "bow:0" });
      }
      // The numbers are the same: her last "the same" (the bow) was the answer for the whole number.
      if (!plan.some(s => s.type === "choose")) plan.push({ type: "choose", p: null, right: "bow:0" });
      return plan;
    },
    teachStep(pic, st) {
      if (!st.plan) st.plan = this.buildPlan(pic);
      const d = pic.Q.data;
      while (st.pi < st.plan.length) {
        const s = st.plan[st.pi];
        if (s.type === "build") {
          const goal = this.target(d, s.side, s.p);
          if (st.built[s.side][s.p] < goal) {
            const P = PLACE[s.p], name = SIDE[s.side].name, n = s.side === "L" ? d.a : d.b;
            if (!showing(pic, st.taps, goal)) return { id: "turn" + st.pi, say: `${TURN} ${d.mode === "cubes" ? `Stop at ${n}.` : s.p === "O" ? `Stop at ${goal}.` : `Count by ${P.value}s.`}`, want: [`add:${s.side}:${s.p}`] };
            const prefix = st.sayPrefix; st.sayPrefix = "";
            const say = d.mode === "cubes" ? `${prefix}Build ${name}'s ${n}. Tap the plus for each cube. Count with me. Stop at ${n}.`
              : `${prefix}${n} has ${goal} ${plural(goal, P.one, P.many)}. Tap ${name}'s plus for each ${P.one}. ${s.p === "O" ? "Count them." : `Count by ${P.value}s.`}`;
            return { id: "build" + st.pi, say, want: [`add:${s.side}:${s.p}`] };
          }
          st.pi++; st.run = 0; st.taps = 0;
          continue;
        }
        if (s.done) {
          // Marie said this place is the same (she tapped the bow). Kitty goes on to the next place, without judging it.
          st.pi++;
          const nx = st.plan[st.pi];
          if (nx && nx.type === "build") st.sayPrefix = `Now the ${PLACE[nx.p].name.toLowerCase()}. `;
          continue;
        }
        // Only after 2 wrong taps on this choice does Kitty show it (the father's rule).
        const shown = st.wrong >= 2;
        return { id: "choose" + st.pi + (shown ? "!" : ""), free: !shown, want: shown ? [s.right] : ["side:L", "side:R", "bow:0"],
          say: shown ? (s.right === "bow:0" ? "They are the same. Tap the bow." : "This side has more. Tap it.") : this.ask(d, s) };
      }
      return null;
    },
    // The same words for every answer (<, = or >): the lesson end never says which sign.
    teachEnd: () => "The open mouth eats the bigger number. Two lines mean the same. Which sign shows what you built? Pick it."
  };

  // The one method sentence for comparing numbers, the same in every line of this lesson and in the hint,
  // so the words never change with the cards. It also covers cards with the same first digit (99 and 93).
  const ORDER_HOW = "Look at the first digit. Same first digit? Look at the next digit.";
  const K_ORDER = {
    init: () => ({ slot: [null, null, null], wrong: 0 }),
    label: () => "Three number cards and a line-up row",
    geom(w, h) {
      // The shining ring reaches 10 px outside its card (6 px out, plus half of its 8 px line). pad 12 keeps it inside
      // the picture, and a gap of 22 keeps the rings of two cards side by side from touching.
      const pad = 12, gap = 22, top = 12, topH = (h - 30) * .54, cw = (w - pad * 2 - gap * 2) / 3, slotY = top + topH + 18, slotH = h - slotY - 8;
      return { cw, topH, pad, slotY, slotH, cardAt: i => ({ x: pad + i * (cw + gap), y: top, w: cw, h: topH }), slotAt: k => ({ x: pad + k * (cw + gap), y: slotY, w: cw, h: slotH }) };
    },
    cardSVG(pic, n, x, y, w, h) {
      let o = card(x, y, w, h, { fill: C.paper, r: 18 });
      const s = String(n), dg = s.length, fs = Math.min(h * .36, w / (dg * .6 + .5)), places = dg === 3 ? ["H", "T", "O"] : ["T", "O"];
      const cw = fs * .58, x0 = x + w / 2 - cw * dg / 2;
      const showBlocks = h >= 104 && w >= 100;
      const ty = showBlocks ? y + h * .3 : y + h * .52;
      s.split("").forEach((ch, i) => { o += text(x0 + cw * (i + .5), ty, ch, fs, { fill: PLACE[places[i]].color, stroke: Math.max(2, fs * .06) }); });
      if (showBlocks) {
        const D = digitsOf(n), bx = x + 8, by = y + h * .56, bw = w - 16, bh = h * .38;
        const parts = places.map(p => ({ p, k: D[p] })).filter(q => q.k);
        const each = bw / Math.max(1, parts.length);
        parts.forEach((q, j) => {
          const L = slotLayout(9, each - 4, bh, q.p === "T" ? .3 : 1, q.p === "H" ? 26 : q.p === "T" ? 9 : 11);
          for (let i = 0; i < q.k; i++) { const ps = L.pos(i); o += q.p === "H" ? rr(bx + j * each + ps.x, by + ps.y, L.pw, L.ph, 3, PLACE.H.tint, 1.5) : q.p === "T" ? rr(bx + j * each + ps.x, by + ps.y, L.pw, L.ph, 2, PLACE.T.tint, 1.5) : rr(bx + j * each + ps.x, by + ps.y, L.pw, L.ph, 2, PLACE.O.tint, 1.5); }
        });
      }
      return o;
    },
    draw(pic, st, w, h) {
      const d = pic.Q.data, G = this.geom(w, h);
      let o = "";
      for (let k = 0; k < 3; k++) {
        const s = G.slotAt(k), ci = st.slot[k];
        o += rr(s.x, s.y, s.w, s.h, 18, C.tintPink, 0, `stroke="${C.ink}" stroke-opacity=".3" stroke-width="2.5" stroke-dasharray="7 6"`);
        // The empty line-up places say where the smallest and the biggest go. Nothing else is drawn in them.
        const word = ["smallest", "", "biggest"][k];
        if (ci == null && word) o += text(s.x + s.w / 2, s.y + s.h / 2, word, clamp(Math.min(s.w / 5.2, s.h * .3), 12, 22), { fill: C.soft, extra: `data-role="slotword"` });
        if (ci != null) {
          const key = "slot:" + k;
          o += `<g${pic.teachMode ? "" : pic.hit(key, s.x, s.y, s.w, s.h)} data-role="slotcard"${pic.popCls(key)}>${this.cardSVG(pic, d.nums[ci], s.x + 3, s.y + 3, s.w - 6, s.h - 10)}</g>`;
        }
      }
      if (G.slotH > 30) o += `<path d="M${f(G.pad + 8)} ${f(G.slotY - 9)} H${f(w - G.pad - 16)}" stroke="${C.ink}" stroke-opacity=".35" stroke-width="3" stroke-linecap="round"/><path d="M${f(w - G.pad - 20)} ${f(G.slotY - 15)} l9 6 l-9 6" fill="none" stroke="${C.ink}" stroke-opacity=".35" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;
      d.nums.forEach((n, i) => {
        if (st.slot.includes(i)) return;
        const c = G.cardAt(i), key = "card:" + i;
        o += `<g${pic.hit(key, c.x, c.y, c.w, c.h)} data-role="card" data-n="${n}">${pic.glow(key, c.x, c.y, c.w, c.h, 18)}${this.cardSVG(pic, n, c.x, c.y, c.w, c.h)}</g>`;
      });
      return o;
    },
    tap(pic, st, t) {
      const d = pic.Q.data;
      if (t.key.startsWith("slot:")) { const k = +t.key.split(":")[1]; st.slot[k] = null; pic.tone([420], .06); return; }
      const i = +t.key.split(":")[1], k = st.slot.indexOf(null);
      if (k < 0) return;
      if (pic.teachMode) {
        const left = d.nums.map((n, j) => j).filter(j => !st.slot.includes(j)), smallest = left.reduce((a, b) => d.nums[a] < d.nums[b] ? a : b);
        if (i !== smallest) { st.wrong++; pic.tone([330], .14, "triangle"); pic.say("Not that one."); return; }
        st.wrong = 0;
      }
      st.slot[k] = i; pic.pop("slot:" + k); pic.tone([600, 760], .06, "sine", .05);
    },
    teachStep(pic, st) {
      const d = pic.Q.data, left = d.nums.map((n, j) => j).filter(j => !st.slot.includes(j));
      if (!left.length) return null;
      const smallest = left.reduce((a, b) => d.nums[a] < d.nums[b] ? a : b), k = 3 - left.length;
      if (left.length === 1) return { id: "last", say: "Now the last one. It is the biggest. Tap it.", want: ["card:" + smallest] };
      // After 1 wrong tap Kitty asks the open question again and every card still shines.
      // Only after 2 wrong taps does she show the smallest card (the same rule as Bigger or smaller).
      if (st.wrong >= 2) return { id: "pick" + k + "!", want: ["card:" + smallest], say: "This one is the smallest. Tap it." };
      return { id: "pick" + k + (st.wrong ? "?" : ""), free: true, want: left.map(j => "card:" + j),
        say: st.wrong ? `Which is the smallest? ${ORDER_HOW} Tap it.` : k === 0 ? `Which number is the smallest? ${ORDER_HOW} Tap it.` : `Which is the smallest now? ${ORDER_HOW} Tap it.` };
    },
    teachEnd: () => "Now find this order in the buttons."
  };

  /* =====================================================================
     TOPIC 4: skip_count - "Jump and count" (a frog on a wooden ruler)
     ===================================================================== */
  // The hop is always smaller than the jump, so the Hop button never tells Marie the jump size she must find:
  // 10 is two hops of 5, 25 is five hops of 5, 100 is four hops of 25.
  const UNIT = { 2: 1, 3: 1, 4: 1, 5: 1, 10: 5, 25: 5, 100: 25 };
  const K_SKIP = {
    init(Q, pic) { return { pos: Q.data.terms[0], hops: [], phase: 0, hopCount: 0, hopMarks: [] }; },
    label: () => "A wooden ruler with a frog",
    geom(pic, w, h) {
      const d = pic.Q.data, mx = clamp(w * .07, 30, 70), bh = clamp(h * .2, 54, 66), rh = clamp(h * .13, 34, 62);
      // Frog, hop arcs and ruler sit together as one group, centred in the space above the buttons.
      const avail = h - bh - 10, fsz = clamp(Math.min((w - 2 * mx) / 4.5, avail * .42), 40, 96);
      const rulerY = clamp((avail - (fsz + 34 + rh)) / 2 + fsz + 34, 70, h - bh - rh - 10);
      const vmin = Math.min(...d.terms), vmax = Math.max(...d.terms);
      return { mx, bh, rh, rulerY, fsz, vmin, vmax, x: v => mx + (v - vmin) / (vmax - vmin) * (w - 2 * mx), by: h - bh };
    },
    draw(pic, st, w, h) {
      const d = pic.Q.data, G = this.geom(pic, w, h), unit = UNIT[d.step], y = G.rulerY;
      let o = "";
      o += `<g${pic.hit("ruler", 0, 0, w, y + G.rh, { pri: -1 })}>` + rr(G.mx - 24, y + 5, w - 2 * G.mx + 48, G.rh, 14, C.woodD, 0) + rr(G.mx - 24, y, w - 2 * G.mx + 48, G.rh, 14, "url(#woodGrad)", 3);
      if (unit < d.step) for (let v = G.vmin; v <= G.vmax; v += unit) if (!d.terms.includes(v)) o += `<line x1="${f(G.x(v))}" y1="${f(y + 1)}" x2="${f(G.x(v))}" y2="${f(y + G.rh * .26)}" stroke="${C.ink}" stroke-width="2"/>`;
      const fs = clamp(Math.min(G.rh * .5, (w - 2 * G.mx) / 4 / (String(G.vmax).length * .62 + .6)), 13, 30);
      d.terms.forEach((v, i) => {
        const x = G.x(v);
        o += `<line x1="${f(x)}" y1="${f(y + 1)}" x2="${f(x)}" y2="${f(y + G.rh * .42)}" stroke="${C.ink}" stroke-width="3.5" stroke-linecap="round"/>`;
        if (i === d.miss) { const bw = fs * 1.9, bh2 = fs * 1.5; o += rr(x - bw / 2, y + G.rh * .44, bw, bh2, bh2 / 2, C.pink, 2.5) + text(x, y + G.rh * .44 + bh2 / 2 + 1, "?", fs * 1.05, { fill: "#fff", stroke: 3 }); }
        else if (pic.teachMode) { const tk = "term:" + i, tw2 = Math.max(fs * 2.2, 30); o += `<g${pic.hit(tk, x - tw2 / 2, y + 2, tw2, G.rh - 4)}>${pic.glow(tk, x - tw2 / 2, y + 2, tw2, G.rh - 4, 10)}<rect x="${f(x - tw2 / 2)}" y="${f(y + 2)}" width="${f(tw2)}" height="${f(G.rh - 4)}" fill="transparent"/>${text(x, y + G.rh * .7, String(v), fs, { extra: `data-role="term"` })}</g>`; }
        else o += text(x, y + G.rh * .7, String(v), fs, { extra: `data-role="term"` });
      });
      o += "</g>";
      // hop arcs (no numbers on them)
      let at = d.terms[0];
      const fsz = Math.min(G.fsz, Math.max(40, y * .62));
      st.hops.forEach((hp, i) => {
        const x1 = G.x(hp.from), x2 = G.x(hp.to), lift = Math.min(fsz * .9, 10 + Math.abs(x2 - x1) * .45);
        o += `<path d="M${f(x1)} ${f(y - 4)} Q${f((x1 + x2) / 2)} ${f(y - 4 - lift)} ${f(x2)} ${f(y - 4)}" fill="none" stroke="${C.lilacD}" stroke-width="3.5" stroke-linecap="round" stroke-dasharray="${hp.teach ? "0" : "7 6"}" opacity=".85"/>`;
      });
      // Lesson only: marks above the hops. Only Kitty's newest counted hop has a number badge; every other hop
      // (and every hop Marie counts herself) gets a small tick, so no number is left for Marie's own count.
      const hm = st.hopMarks || [];
      hm.forEach((m, k) => {
        const bx = G.x(m.v), by = y - fsz - 16;
        o += m.n != null && k === hm.length - 1 ? badge(clamp(bx, 24, w - 24), by, m.n, 13) : tickMark(bx, by, 8);
      });
      const fx = G.x(st.pos) - fsz / 2, fy = y - fsz * .92;
      o += `<g class="${pic.pops.has("frog") ? "nm-hop" : ""}" pointer-events="none"><ellipse cx="${f(G.x(st.pos))}" cy="${f(y - 2)}" rx="${f(fsz * .32)}" ry="${f(fsz * .07)}" fill="${C.ink}" opacity=".18"/><image href="${esc(pic.art("frog"))}" x="${f(fx)}" y="${f(fy)}" width="${f(fsz)}" height="${f(fsz)}"/></g>`;
      // buttons
      const sign = d.dir > 0 ? "+" : MINUS, bh = G.bh - 8, extra = pic.teachMode ? 0 : 20 + 2 * bh;
      // The hop button and the two round buttons always fit across the picture, centred (small phones too).
      const bw = Math.max(110, Math.min(250, w * .5, w - 12 - extra)), bx = Math.max(4, (w - bw - extra) / 2);
      o += `<g${pic.hit("btn:hop", bx, G.by, bw, bh, { pri: 1 })} data-role="button">${pic.glow("btn:hop", bx, G.by, bw, bh, 18)}${card(bx, G.by, bw, bh, { fill: C.lilac, r: 18 })}${text(bx + bw / 2, G.by + bh / 2 + 1, `Hop ${sign}${unit}`, clamp(bh * .44, 18, 26), { fill: "#fff", stroke: 3 })}</g>`;
      if (!pic.teachMode) {
        const s2 = bh;
        o += `<g${pic.hit("btn:undo", bx + bw + 10, G.by, s2, s2, { pri: 1 })} data-role="button">${card(bx + bw + 10, G.by, s2, s2, { fill: C.paper, r: s2 / 2 })}${text(bx + bw + 10 + s2 / 2, G.by + s2 / 2 + 1, "↶", s2 * .5)}</g>`;
        o += `<g${pic.hit("btn:reset", bx + bw + 20 + s2, G.by, s2, s2, { pri: 1 })} data-role="button">${card(bx + bw + 20 + s2, G.by, s2, s2, { fill: C.paper, r: s2 / 2 })}${text(bx + bw + 20 + s2 * 1.5, G.by + s2 / 2 + 1, "⟲", s2 * .5)}</g>`;
      }
      return o;
    },
    hop(pic, st) {
      const d = pic.Q.data, unit = UNIT[d.step], to = st.pos + d.dir * unit, lo = Math.min(...d.terms), hi = Math.max(...d.terms);
      if (to < lo || to > hi) { pic.say("That is the end of the ruler."); pic.tone([330], .12, "triangle"); return false; }
      st.hops.push({ from: st.pos, to, teach: pic.teachMode }); st.pos = to; pic.pop("frog");
      pic.tone([620, 760], .07, "sine", .06);
      return true;
    },
    tap(pic, st, t) {
      const d = pic.Q.data, unit = UNIT[d.step];
      if (t.key === "btn:undo") { const hp = st.hops.pop(); if (hp) st.pos = hp.from; return; }
      if (t.key === "btn:reset") { st.hops = []; st.pos = d.terms[0]; return; }
      if (t.key.startsWith("term:")) { st.pos = d.terms[+t.key.split(":")[1]]; st.hops = []; st.hopMarks = []; pic.pop("frog"); pic.tone([620, 740], .07, "sine", .06); return; }
      if (!this.hop(pic, st)) return;
      if (pic.teachMode) {
        // THE LESSON RULE. Finding the jump (phase 0): Kitty counts only the first 1 or 2 hops, then Marie counts on.
        // Hopping to the question mark (phase 1): Kitty says no number at all (a landing number such as 95 would put
        // the answer one easy step away). Only the recount says every landing number, the last one too.
        st.hopCount++;
        if (st.phase === 0 && st.hopCount <= demoTaps(pic, d.step / unit)) { const said = unit === 1 ? st.hopCount : st.hopCount * unit; st.hopMarks.push({ v: st.pos, n: said }); pic.speak(String(said)); }
        else if (st.phase === 1 && pic.full) { st.hopMarks.push({ v: st.pos, n: st.pos }); pic.speak(String(st.pos)); }
        else st.hopMarks.push({ v: st.pos });
      }
    },
    // The two numbers just BEFORE the question mark (the question mark is never first or second), so a hint or a lesson
    // never names a number that comes after the missing one.
    pairFor(d) { if (d.miss >= 2) return d.miss - 2; for (let i = 0; i < 4; i++) if (i !== d.miss && i + 1 !== d.miss) return i; return 0; },
    teachStep(pic, st) {
      const d = pic.Q.data, i = this.pairFor(d), A = d.terms[i], B = d.terms[i + 1], unit = UNIT[d.step];
      if (st.phase === 0) {
        // Marie puts the frog on the first number herself (a tap on that number); the frog never jumps by itself.
        if (!st.hops.length && st.pos !== A) return { id: "put0", say: `First put the frog on ${A}. Tap ${A} on the ruler.`, want: ["term:" + i] };
        if (st.pos !== B) return showing(pic, st.hopCount, d.step / unit) ? { id: "p0", say: `How big is each jump? Hop from ${A} to ${B}. Count the hops.`, want: ["btn:hop"] }
          : { id: "p0turn", say: `${TURN} Hop to ${B}.`, want: ["btn:hop"] };
        st.phase = 1; st.hops = []; st.hopMarks = []; st.hopCount = 0;   // the frog stays where Marie hopped it
      }
      // Marie found the jump size by her own count, so the lesson never says it (that would be the final number of her
      // count, and the jump with the start number puts the answer one easy step away). Only the recount says it.
      const S = d.terms[d.miss - 1], same = pic.full ? `Each jump is ${d.step}!` : "Every jump is the same.";
      if (!st.hops.length && st.pos !== S) return { id: "put1", say: `${same} Now put the frog on ${S}. Tap ${S}.`, want: ["term:" + (d.miss - 1)] };
      if (st.pos !== d.terms[d.miss]) return { id: "p1", say: pic.full ? `${same} The frog is on ${S}. Hop to the question mark. Let's count every hop together, out loud.`
        : `${same} Your turn. Make the same jump once more. Hop to the question mark. Count ${d.dir > 0 ? "on" : "back"} by ${unit} with each hop.`, want: ["btn:hop"] };
      return null;
    },
    teachEnd: () => "What number is the frog on? Type it."
  };

  /* =====================================================================
     TOPIC 5: odd_even - "Odd or even" (pair them up)
     ===================================================================== */
  function pairShelf(pic, st, x, y, w, h, cap, drawOne, role) {
    let o = card(x, y, w, h, { fill: C.tintSun, r: 18 });
    // The tray is named, so its empty places have an obvious job.
    const head = clamp(h * .13, 22, 30);
    o += text(x + w / 2, y + head / 2 + 5, "Pairs", clamp(head * .7, 15, 21), { fill: C.ink, extra: `data-role="traylabel"` });
    y += head; h -= head;
    const L = slotLayout(cap, w - 12, h - 12, 2.1, 190);
    st.pairs.forEach((pr, k) => {
      const q = L.pos(k), bx = x + 6 + q.x, by = y + 6 + q.y, key = "pair:" + k;
      const s = Math.min(L.ph * .86, L.pw * .44);
      o += `<g${pic.teachMode ? "" : pic.hit(key, bx, by, L.pw, L.ph)} data-role="pair"${pic.popCls(key)}>${rr(bx, by, L.pw, L.ph, L.ph * .3, "#fff", 2.5)}` +
        drawOne(pr[0], bx + L.pw * .27 - s / 2, by + (L.ph - s) / 2, s) + drawOne(pr[1], bx + L.pw * .73 - s / 2, by + (L.ph - s) / 2, s) +
        `<path d="M${f(bx + L.pw / 2)} ${f(by + L.ph * .62)} c-4 -5 -9 -1 -5 4 l5 5 l5 -5 c4 -5 -1 -9 -5 -4z" fill="${C.pink}" stroke="${C.ink}" stroke-width="1.5"/></g>`;
    });
    for (let k = st.pairs.length; k < cap; k++) { const q = L.pos(k); o += rr(x + 6 + q.x, y + 6 + q.y, L.pw, L.ph, L.ph * .3, "none", 0, `stroke="${C.ink}" stroke-opacity=".18" stroke-width="2" stroke-dasharray="5 5"`); }
    return o;
  }
  function splitBox(w, h, frac) {
    const wide = w / h > 1.3, pad = 6;
    if (wide) { const a = (w - pad * 3) * frac; return [{ x: pad, y: pad, w: a, h: h - pad * 2 }, { x: pad * 2 + a, y: pad, w: w - a - pad * 3, h: h - pad * 2 }]; }
    const a = (h - pad * 3) * frac; return [{ x: pad, y: pad, w: w - pad * 2, h: a }, { x: pad, y: pad * 2 + a, w: w - pad * 2, h: h - a - pad * 3 }];
  }
  const K_BEARS = {
    init(Q) { return { pairs: [], sel: null }; },
    label: () => "Bears to pair up",
    draw(pic, st, w, h) {
      const d = pic.Q.data, [A, B] = splitBox(w, h, .56), paired = new Set(st.pairs.flat());
      let o = card(A.x, A.y, A.w, A.h, { fill: C.paper, r: 18 });
      const g = gridFit(d.C, A.w - 12, A.h - 12), size = Math.min(g.cw, g.ch) * .8;
      d.cells.forEach((cell, i) => {
        if (paired.has(i)) return;
        const col = cell % g.cols, row = Math.floor(cell / g.cols);
        const cx = A.x + 6 + (col + .5) * g.cw + d.jit[i][0] * Math.max(0, Math.min(g.cw * .1, (g.cw - size * 1.12) / 2)), cy = A.y + 6 + (row + .5) * g.ch + d.jit[i][1] * Math.max(0, Math.min(g.ch * .1, (g.ch - size * 1.12) / 2)), x = cx - size / 2, y = cy - size / 2, key = "b:" + i;
        o += `<g${pic.hit(key, x, y, size, size)} data-role="bear">${pic.glow(key, x, y, size, size, size * .3)}${st.sel === i ? `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(size * .56)}" fill="${C.sun}" stroke="${C.ink}" stroke-width="3"/>` : ""}<image href="${esc(pic.art(d.art))}" x="${f(x)}" y="${f(y)}" width="${f(size)}" height="${f(size)}"/></g>`;
      });
      o += pairShelf(pic, st, B.x, B.y, B.w, B.h, 10, (i, x, y, s) => `<g data-role="bear"><image href="${esc(pic.art(d.art))}" x="${f(x)}" y="${f(y)}" width="${f(s)}" height="${f(s)}"/></g>`);
      return o;
    },
    tap(pic, st, t) {
      if (t.key.startsWith("pair:")) { st.pairs.splice(+t.key.split(":")[1], 1); pic.tone([420], .06); return; }
      const i = +t.key.split(":")[1];
      if (st.sel == null) { st.sel = i; pic.tone([600], .06); return; }
      if (st.sel === i) { st.sel = null; return; }
      // No running count of pairs, in the lesson too: each pair gets the same chime.
      st.pairs.push([st.sel, i]); st.sel = null; pic.pop("pair:" + (st.pairs.length - 1)); pic.tone([620, 780], .07, "sine", .06);
    },
    teachStep(pic, st) {
      const d = pic.Q.data, paired = new Set(st.pairs.flat()), left = range(d.n).filter(i => !paired.has(i));
      if (left.length >= 2 && st.sel != null) return { id: "pair2", say: "Now tap one more bear.", want: left.filter(i => i !== st.sel).map(i => "b:" + i) };
      if (left.length >= 2) return { id: "pair", say: "Tap two bears to make a pair.", want: left.map(i => "b:" + i) };
      return null;
    },
    teachEnd: () => "Is a bear left without a partner? Pick odd or even."
  };

  const K_ODDTENS = {
    init(Q) { return { pairs: [], sel: null, open: {} }; },
    label: () => "Ten rods made of pairs, and loose cubes to pair up",
    draw(pic, st, w, h) {
      const d = pic.Q.data, [A, B] = splitBox(w, h, .42), P = PLACE.T, Q1 = PLACE.O;
      let o = card(A.x, A.y, A.w, A.h, { fill: P.tint, r: 18 });
      const head = clamp(A.h * .16, 20, 30);
      o += text(A.x + A.w / 2, A.y + head / 2 + 4, d.big ? "Hundreds and tens" : "Tens", clamp(head * .7, 14, 20), { fill: P.color });
      if (d.big) {
        // Grade 3: the hundreds and tens of a 3-digit number, drawn as the true number of flats and rods,
        // with words under them and their value (for 346: 3 flats, 4 rods, "3 hundreds", "4 tens", 340).
        const bw = Math.min(A.w - 24, 340), bh = Math.min(A.h - head - 22, 160), x = A.x + (A.w - bw) / 2, y = A.y + head + 10, key = "rod:0", open = st.open[0];
        const cap = clamp(bh * .15, 13, 17), fw = bw * .38, tw = bw * .3, vw = bw - fw - tw, ih = bh - cap * 2 - 14;
        let g = card(x, y, bw, bh, { fill: "#fff", r: 16 });
        const LF = slotLayout(Math.max(1, d.H), fw - 14, ih, 1, 44);
        for (let i = 0; i < d.H; i++) { const q = LF.pos(i); g += `<g data-role="bigflat">${flatSVG(pic.api, x + 8 + q.x, y + 6 + q.y, LF.pw, PLACE.H, true)}</g>`; }
        const LT = slotLayout(Math.max(1, d.T), tw - 8, ih, .28, 14);
        for (let i = 0; i < d.T; i++) { const q = LT.pos(i); g += `<g data-role="bigrod">${rodSVG(pic.api, x + fw + q.x, y + 6 + q.y, LT.pw, LT.ph, P, true)}</g>`; }
        g += text(x + 8 + (fw - 14) / 2, y + bh - cap - 4, `${d.H} ${plural(d.H, "hundred", "hundreds")}`, Math.min(cap, (fw - 10) / 6), { fill: PLACE.H.color });
        g += text(x + fw + (tw - 8) / 2, y + bh - cap - 4, `${d.T} ${plural(d.T, "ten", "tens")}`, Math.min(cap, (tw - 6) / 4.2), { fill: P.color });
        g += text(x + fw + tw + vw / 2, y + bh * .44, String(d.n - d.O), Math.min(bh * .34, vw * .3), { fill: P.color });
        // The "all pairs" badge sits under the value, in its own column, so it never covers the rods or the number.
        if (open) { const pw = Math.min(86, vw - 6), ph = 26, px = x + fw + tw + (vw - pw) / 2, py = y + bh - ph - 6;
          g += `<g class="nm-pop">${rr(px, py, pw, ph, 13, C.mint, 2)}${text(px + pw / 2, py + ph / 2, "all pairs", Math.min(15, (pw - 8) / 4.4))}</g>`; }
        o += `<g${pic.hit(key, x, y, bw, bh)} data-role="bigpart" data-value="${d.n - d.O}"${pic.popCls(key)}>${pic.glow(key, x, y, bw, bh, 16)}${g}</g>`;
      }
      const L = slotLayout(Math.max(d.T, 5), A.w - 12, A.h - head - 14, .45, 60);
      for (let r = 0; r < (d.big ? 0 : d.T); r++) {
        const q = L.pos(r), x = A.x + 6 + q.x, y = A.y + head + 8 + q.y, cw = L.pw / 2, ch = L.ph / 5, key = "rod:" + r, open = st.open[r];
        let g = rr(x, y + 3, L.pw, L.ph, 8, P.color, 2) + rr(x, y, L.pw, L.ph, 8, "#fff", 2);
        for (let k = 0; k < 10; k++) { const cx = x + (k % 2) * cw, cy = y + Math.floor(k / 2) * ch; g += rr(cx + 2, cy + 2, cw - 4, ch - 4, 4, P.tint, 1.5); }
        if (open) for (let k = 0; k < 5; k++) { const cy = y + (k + .5) * ch; g += `<path d="M${f(x + cw * .55)} ${f(cy)} H${f(x + cw * 1.45)}" stroke="${C.pinkD}" stroke-width="3" stroke-linecap="round"/>`; }
        o += `<g${pic.hit(key, x, y, L.pw, L.ph)} data-role="rod"${pic.popCls(key)}>${pic.glow(key, x, y, L.pw, L.ph, 8)}${g}</g>`;
      }
      // With 0 or 1 loose cube there is nothing to pair, so no pair tray is drawn.
      const tray = d.O >= 2;
      const [B1, B2] = !tray ? [B, null] : (B.w / B.h > 1.3) ? [{ x: B.x, y: B.y, w: B.w * .5 - 4, h: B.h }, { x: B.x + B.w * .5 + 4, y: B.y, w: B.w * .5 - 4, h: B.h }] : [{ x: B.x, y: B.y, w: B.w, h: B.h * .5 - 4 }, { x: B.x, y: B.y + B.h * .5 + 4, w: B.w, h: B.h * .5 - 4 }];
      o += card(B1.x, B1.y, B1.w, B1.h, { fill: Q1.tint, r: 18 });
      o += text(B1.x + B1.w / 2, B1.y + 16, "Ones", 16, { fill: Q1.color });
      if (!d.O) o += text(B1.x + B1.w / 2, B1.y + B1.h / 2 + 8, "0 ones", clamp(B1.h * .14, 16, 26), { fill: C.soft });
      const paired = new Set(st.pairs.flat()), g = gridFit(9, B1.w - 12, B1.h - 34), s = Math.min(g.cw, g.ch, 64) * .74;
      for (let i = 0; i < d.O; i++) {
        if (paired.has(i)) continue;
        const col = i % g.cols, row = Math.floor(i / g.cols), cx = B1.x + 6 + (col + .5) * g.cw, cy = B1.y + 28 + (row + .5) * g.ch, key = "c:" + i;
        o += `<g${pic.hit(key, cx - s / 2, cy - s / 2, s, s)} data-role="cube">${pic.glow(key, cx - s / 2, cy - s / 2, s, s, 10)}${st.sel === i ? `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(s * .68)}" fill="${C.sun}" stroke="${C.ink}" stroke-width="3"/>` : ""}${cubeSVG(pic.api, cx - s / 2, cy - s / 2, s, Q1, true)}</g>`;
      }
      if (tray) o += pairShelf(pic, st, B2.x, B2.y, B2.w, B2.h, 4, (i, x, y, s2) => `<g data-role="cube">${cubeSVG(pic.api, x, y, s2, Q1, true)}</g>`);
      return o;
    },
    tap(pic, st, t) {
      const [kind, v] = t.key.split(":"), i = +v;
      if (kind === "rod") { if (pic.teachMode && st.open[i]) return; st.open[i] = pic.teachMode ? true : !st.open[i]; pic.pop(t.key); pic.tone([700, 880], .06); if (pic.teachMode) pic.speak(pic.Q.data.big ? "All pairs" : "Five pairs"); return; }
      if (kind === "pair") { st.pairs.splice(i, 1); pic.tone([420], .06); return; }
      if (st.sel == null) { st.sel = i; pic.tone([600], .06); return; }
      if (st.sel === i) { st.sel = null; return; }
      st.pairs.push([st.sel, i]); st.sel = null; pic.pop("pair:" + (st.pairs.length - 1)); pic.tone([620, 780], .07, "sine", .06);
    },
    teachStep(pic, st) {
      const d = pic.Q.data, rods = range(d.big ? 1 : d.T).filter(r => !st.open[r]);
      if (rods.length) return d.big ? { id: "rods", say: "Every hundred and every ten makes pairs. Tap the big blocks to see.", want: ["rod:0"] } : { id: "rods", say: "Every ten makes 5 pairs. Tap each rod to see.", want: rods.map(r => "rod:" + r) };
      const paired = new Set(st.pairs.flat()), left = range(d.O).filter(i => !paired.has(i));
      if (left.length >= 2 && st.sel != null) return { id: "pair2", say: "Now tap one more cube.", want: left.filter(i => i !== st.sel).map(i => "c:" + i) };
      if (left.length >= 2) return { id: "pair", say: "Tens always pair up. Now pair up the ones. Tap two cubes.", want: left.map(i => "c:" + i) };
      return null;
    },
    // The same open sentence for 0 ones too: "there are no loose ones" would tell her the answer (even).
    teachEnd: () => "Is a cube left without a partner? Pick odd or even."
  };

  /* =====================================================================
     TOPIC 6: estimate - "About how many" (a little jar for size, a big jar to guess)
     ===================================================================== */
  const K_EST = {
    init: () => ({ groups: 0 }),
    label: () => "A small jar and a big jar of candies",
    geom(pic, w, h) {
      const d = pic.Q.data, g = d.g, refCols = g === 10 ? 5 : 10, refRows = g / refCols, cap = g === 10 ? 112 : 1060;
      const pad = 8, gap = 14, jp = 8, lid = clamp(h * .07, 12, 22), tagH = 44;
      const noGroups = c => { if (g === 10) while (c > 1 && c % 5 === 0) c--; return c; };
      const fits = s => {
        const refW = refCols * s + jp * 2, bwI = w - pad * 2 - refW - gap - jp * 2, bhI = h - pad * 2 - lid - jp * 2 - 6;
        const cols = noGroups(Math.floor(bwI / s)), rows = Math.floor(bhI / s);
        return cols >= 1 && cols * rows >= cap && refRows * s + jp * 2 + lid + tagH <= h - pad * 2;
      };
      let lo = 1.5, hi = 90;
      for (let it = 0; it < 30; it++) { const m = (lo + hi) / 2; if (fits(m)) lo = m; else hi = m; }
      const s = lo, refW = refCols * s + jp * 2, bigW = w - pad * 2 - refW - gap, cols = Math.max(1, noGroups(Math.floor((bigW - jp * 2) / s)));
      const bigH = Math.min(h - pad * 2 - lid - 6, Math.ceil(cap / cols) * s + jp * 2), floor = h - pad - 4, refH = refRows * s + jp * 2;
      return { s, jp, lid, cols, refCols, refRows, ref: { x: pad, y: floor - refH, w: refW, h: refH }, big: { x: pad + refW + gap, y: floor - bigH, w: bigW, h: bigH }, floor };
    },
    jar(b, lid, fill) {
      return rr(b.x, b.y + 5, b.w, b.h, Math.min(22, b.w * .14), C.ink, 0) + rr(b.x, b.y, b.w, b.h, Math.min(22, b.w * .14), fill || "url(#nm-glass)", 3) +
        rr(b.x + b.w * .12, b.y - lid, b.w * .76, lid + 4, 8, C.pink, 3) + rr(b.x + b.w * .17, b.y - lid + 3, b.w * .2, 4, 2, "#fff", 0, `opacity=".7"`) +
        rr(b.x + 6, b.y + 10, Math.max(4, b.w * .05), b.h * .6, 4, "#fff", 0, `opacity=".75"`);
    },
    candy(i, x, y, r) {
      const c = CANDY[Math.floor(hr(i, 3) * CANDY.length)];
      if (r < 4.5) return `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${c}"/>`;
      return `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${c}" stroke="${C.ink}" stroke-width="${r > 9 ? 2 : 1.2}"/><circle cx="${f(x - r * .32)}" cy="${f(y - r * .32)}" r="${f(r * .28)}" fill="#fff" opacity=".7"/>`;
    },
    draw(pic, st, w, h) {
      const d = pic.Q.data, G = this.geom(pic, w, h), s = G.s, r = s * .42;
      let o = `<line x1="4" y1="${f(G.floor + 5)}" x2="${f(w - 4)}" y2="${f(G.floor + 5)}" stroke="${C.ink}" stroke-opacity=".25" stroke-width="3" stroke-linecap="round"/>`;
      // small reference jar
      o += this.jar(G.ref, G.lid * .8);
      for (let i = 0; i < d.g; i++) { const col = i % G.refCols, row = Math.floor(i / G.refCols); o += `<g data-role="refcandy">${this.candy(i + 5000, G.ref.x + G.jp + (col + .5) * s, G.ref.y + G.ref.h - G.jp - (row + .5) * s, r)}</g>`; }
      const tw = Math.max(46, G.ref.w * .9), tx = G.ref.x + (G.ref.w - tw) / 2, ty = G.ref.y - G.lid * .8 - 34;
      o += `<path d="M${f(G.ref.x + G.ref.w / 2)} ${f(G.ref.y - G.lid * .8)} L${f(G.ref.x + G.ref.w / 2)} ${f(ty + 26)}" stroke="${C.pinkD}" stroke-width="3"/>` + card(tx, ty, tw, 26, { fill: "#fff", r: 10, sh: 3, sw: 2.5 }) + text(tx + tw / 2, ty + 14, String(d.g), 18, { fill: C.pinkD });
      // the big jar
      const B = G.big, key = "jar:big";
      o += `<g${pic.hit(key, B.x, B.y - G.lid, B.w, B.h + G.lid)} data-role="bigjar">${pic.glow(key, B.x, B.y - G.lid, B.w, B.h + G.lid, 22)}${this.jar(B, G.lid)}`;
      const innerX = B.x + G.jp + (B.w - G.jp * 2 - G.cols * s) / 2, baseY = B.y + B.h - G.jp, done = Math.min(d.N, st.groups * d.g);
      for (let i = 0; i < d.N; i++) {
        const col = i % G.cols, row = Math.floor(i / G.cols);
        const cx = innerX + (col + .5) * s + (hr(i, 1) - .5) * s * .24, cy = baseY - (row + .5) * s + (hr(i, 2) - .5) * s * .24;
        o += `<g data-role="candy"${i < done ? ` opacity="1"` : ""}>${this.candy(i, cx, cy, r)}</g>`;
      }
      // Each group Marie made is tinted on top of its candies, so the groups are easy to see even when the candies are small.
      const bands = ["#ff6f9f", "#63d3b3", "#74c8ff", "#ffc94a", "#a98bff"];
      for (let k = 0; k < st.groups; k++) {
        const a = k * d.g, b = Math.min(d.N, (k + 1) * d.g) - 1;
        for (let row = Math.floor(a / G.cols); row <= Math.floor(b / G.cols); row++) {
          const c0 = row === Math.floor(a / G.cols) ? a % G.cols : 0, c1 = row === Math.floor(b / G.cols) ? b % G.cols : G.cols - 1;
          o += rr(innerX + c0 * s, baseY - (row + 1) * s, (c1 - c0 + 1) * s, s, Math.min(6, s * .4), bands[k % bands.length], 0, `opacity=".5" data-role="group"`);
        }
      }
      // Each group's coloured band is its mark. Nothing is drawn on top of the candies (Marie judges every group by eye).
      return o + "</g>";
    },
    tap(pic, st) {
      const d = pic.Q.data;
      if (st.groups * d.g >= d.N) { pic.tone([420], .06); return; }
      st.groups++;
      pic.tone([620], .07);   // the same chime for every group, while Marie works and in the lesson (no climbing tone)
      // THE LESSON RULE for About how many: Kitty says NO word on a tap, for every amount alike. Any word that
      // depends on the amount ("1 hundred" is only possible from 200 candies; "Some candies." only under one group;
      // "5 tens" is 50) would point at a choice. The method is in the step line only. Marie counts the groups herself.
      // Only the recount (rule step 4) counts the groups out loud.
      if (pic.full) pic.speak(st.groups * d.g > d.N ? "and some more" : `${st.groups} ${d.g === 10 ? plural(st.groups, "ten", "tens") : plural(st.groups, "hundred", "hundreds")}`);
    },
    teachStep(pic, st) {
      const d = pic.Q.data, w = d.g === 10 ? "ten" : "hundred";
      if (st.groups * d.g >= d.N) return null;
      // One step line for the whole lesson, the same words for every amount.
      return { id: "scoop", want: ["jar:big"], say: pic.full ? `The little jar holds ${d.g}. Tap the big jar to make groups of ${d.g}. Let's count the ${w}s together, out loud.`
        : `The little jar holds ${d.g}. Each tap on the big jar makes a group of ${d.g}. Your turn. Count the groups yourself. Keep tapping until every candy is in a group.` };
    },
    teachEnd: (pic, st) => {
      const d = pic.Q.data;
      // The same words for every amount. Kitty never says "less than one hundred": that would point at the small choice.
      // No extra "Kitty stops at the heart" line: it would be missing for small amounts and so point at the small choice.
      return (d.g === 10 ? "How many tens? Is that closer to 25, 50 or 100? Pick one." : "How many hundreds? Which number is closest? Pick one.");
    }
  };

  /* ================= Topic assembly ================= */
  const KINDS = { subit: K_SUBIT, pics: K_PICS, tenmore: K_TENMORE, make10: K_MAKE10, track: K_TRACK, words: K_WORDS,
    pvsort: K_PVSORT, pvdigit: K_PVSORT, pvtrade: K_PVTRADE, cmp: K_CMP, order: K_ORDER, skip: K_SKIP, bears: K_BEARS, oddtens: K_ODDTENS, est: K_EST };

  function topic(def) {
    const t = Object.assign({}, def);
    t.make = function (level, prev) {
      const lv = levelIndex(t, level);
      return fresh(prev, () => { const q = def.makers[lv](); q.show = `<span>${q.show}</span>`; q.data.topic = t.id; q.data.lv = lv; return q; });
    };
    t.mount = function (el, Q, api) { return handleFor(new Pic(el, Q, api, KINDS[Q.data.kind], false)); };
    t.teach = function (Q, el, api) { const p = new Pic(el, Q, api, KINDS[Q.data.kind], true); return p.teachPromise; };
    // THE LESSON RULE, step 4: if Marie's answer after the lesson is still wrong, Kitty counts ALL of it with her,
    // out loud, tap by tap (the last number too). Marie still taps every step herself, then types the number.
    t.recount = function (Q, el, api) { const p = new Pic(el, Q, api, KINDS[Q.data.kind], true, true); return p.teachPromise; };
    delete t.makers;
    return t;
  }
  const numQ = (o) => Object.assign({ input: { type: "number", unit: "" } }, o);
  const ICON = {
    count: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><rect x="7" y="10" width="50" height="48" rx="13" fill="#3b2a33"/><rect x="7" y="6" width="50" height="48" rx="13" fill="#fff" stroke="#3b2a33" stroke-width="3"/><g stroke="#3b2a33" stroke-width="2.5"><circle cx="20" cy="19" r="5.5" fill="#ff6f9f"/><circle cx="44" cy="19" r="5.5" fill="#ffc94a"/><circle cx="32" cy="30" r="5.5" fill="#63d3b3"/><circle cx="20" cy="41" r="5.5" fill="#74c8ff"/><circle cx="44" cy="41" r="5.5" fill="#a98bff"/></g></svg>`,
    place: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><rect x="8" y="9" width="14" height="50" rx="4" fill="#e8203f" stroke="#3b2a33" stroke-width="3"/><rect x="8" y="6" width="14" height="49" rx="4" fill="#ffe3ea" stroke="#3b2a33" stroke-width="3"/><path d="M9 16H21M9 26H21M9 36H21M9 46H21" stroke="#3b2a33" stroke-opacity=".45" stroke-width="2"/><rect x="28" y="29" width="14" height="14" rx="4" fill="#2386c8" stroke="#3b2a33" stroke-width="3"/><rect x="28" y="27" width="14" height="13" rx="4" fill="#e0f3ff" stroke="#3b2a33" stroke-width="3"/><rect x="45" y="44" width="14" height="14" rx="4" fill="#2386c8" stroke="#3b2a33" stroke-width="3"/><rect x="45" y="42" width="14" height="13" rx="4" fill="#e0f3ff" stroke="#3b2a33" stroke-width="3"/><rect x="28" y="44" width="14" height="14" rx="4" fill="#2386c8" stroke="#3b2a33" stroke-width="3"/><rect x="28" y="42" width="14" height="13" rx="4" fill="#e0f3ff" stroke="#3b2a33" stroke-width="3"/></svg>`,
    compare: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><rect x="5" y="34" width="14" height="24" rx="4" fill="#ffe3ea" stroke="#3b2a33" stroke-width="3"/><rect x="45" y="12" width="14" height="46" rx="4" fill="#ece6ff" stroke="#3b2a33" stroke-width="3"/><path d="M37 22 L24 34 L37 46" fill="none" stroke="#3b2a33" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/><path d="M37 22 L24 34 L37 46" fill="none" stroke="#ff6f9f" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    skip: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="44" width="56" height="14" rx="5" fill="#c98a52"/><rect x="4" y="41" width="56" height="14" rx="5" fill="#f0bf87" stroke="#3b2a33" stroke-width="3"/><path d="M12 41v6M32 41v6M52 41v6" stroke="#3b2a33" stroke-width="3"/><path d="M12 36 Q22 14 32 36" fill="none" stroke="#7b55e6" stroke-width="4" stroke-linecap="round"/><path d="M32 36 Q42 14 52 36" fill="none" stroke="#7b55e6" stroke-width="4" stroke-linecap="round" stroke-dasharray="5 5"/><circle cx="52" cy="30" r="7" fill="#63d3b3" stroke="#3b2a33" stroke-width="3"/><circle cx="49.5" cy="28" r="1.6" fill="#3b2a33"/><circle cx="54.5" cy="28" r="1.6" fill="#3b2a33"/></svg>`,
    oddeven: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="8" width="38" height="20" rx="10" fill="#fff6d6" stroke="#3b2a33" stroke-width="3"/><rect x="4" y="36" width="38" height="20" rx="10" fill="#fff6d6" stroke="#3b2a33" stroke-width="3"/><g stroke="#3b2a33" stroke-width="2.5"><circle cx="14" cy="18" r="6" fill="#ff6f9f"/><circle cx="32" cy="18" r="6" fill="#ff6f9f"/><circle cx="14" cy="46" r="6" fill="#74c8ff"/><circle cx="32" cy="46" r="6" fill="#74c8ff"/><circle cx="53" cy="32" r="7" fill="#ffc94a"/></g></svg>`,
    estimate: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><rect x="14" y="5" width="36" height="9" rx="4" fill="#ff6f9f" stroke="#3b2a33" stroke-width="3"/><rect x="9" y="14" width="46" height="45" rx="12" fill="#e8f6ff" stroke="#3b2a33" stroke-width="3"/><g stroke="#3b2a33" stroke-width="1.5"><circle cx="19" cy="49" r="4" fill="#ff6f9f"/><circle cx="28" cy="50" r="4" fill="#ffc94a"/><circle cx="37" cy="49" r="4" fill="#63d3b3"/><circle cx="46" cy="50" r="4" fill="#74c8ff"/><circle cx="23" cy="41" r="4" fill="#a98bff"/><circle cx="32" cy="41" r="4" fill="#ff6f9f"/><circle cx="41" cy="41" r="4" fill="#ffc94a"/><circle cx="28" cy="33" r="4" fill="#63d3b3"/><circle cx="37" cy="33" r="4" fill="#74c8ff"/></g></svg>`
  };
  const SIGN_HTML = s => {
    const path = s === "<" ? "M36 10 L12 26 L36 42" : s === ">" ? "M12 10 L36 26 L12 42" : null;
    const body = path ? `<path d="${path}" fill="none" stroke="#3b2a33" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/><path d="${path}" fill="none" stroke="#ff6f9f" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>`
      : `<path d="M10 18H38M10 34H38" stroke="#3b2a33" stroke-width="13" stroke-linecap="round"/><path d="M10 18H38M10 34H38" stroke="#63d3b3" stroke-width="7" stroke-linecap="round"/>`;
    return `<svg viewBox="0 0 48 52" width="1.6em" height="1.7em" aria-hidden="true" style="display:block;margin:auto">${body}</svg>`;
  };
  const SIGN_CHOICES = [
    { value: "<", label: "is smaller than", html: SIGN_HTML("<") },
    { value: "=", label: "is the same as", html: SIGN_HTML("=") },
    { value: ">", label: "is bigger than", html: SIGN_HTML(">") }
  ];
  const wordHTML = w => `<span style="font-family:'Baloo 2','Comic Sans MS',sans-serif;font-weight:800">${w}</span>`;
  const numHTML = n => `<span style="font-family:'Baloo 2','Comic Sans MS',sans-serif;font-weight:800;font-variant-numeric:tabular-nums">${n}</span>`;
  const pairsIcon = odd => `<svg viewBox="0 0 ${odd ? 70 : 52} 40" width="${odd ? 2.2 : 1.6}em" height="1.25em" aria-hidden="true" style="display:block;margin:0 auto 2px"><g stroke="#3b2a33" stroke-width="2.5"><circle cx="10" cy="10" r="6.5" fill="#ff6f9f"/><circle cx="28" cy="10" r="6.5" fill="#ff6f9f"/><circle cx="10" cy="30" r="6.5" fill="#74c8ff"/><circle cx="28" cy="30" r="6.5" fill="#74c8ff"/>${odd ? `<circle cx="56" cy="20" r="6.5" fill="#ffc94a"/>` : ""}</g></svg>`;
  const ODD_CHOICES = [
    { value: "even", label: "Even", html: `${pairsIcon(false)}${wordHTML("Even")}` },
    { value: "odd", label: "Odd", html: `${pairsIcon(true)}${wordHTML("Odd")}` }
  ];
  function scatter(n, extraFrac) {
    const Ccells = n + Math.max(2, Math.round(n * extraFrac));
    return { C: Ccells, cells: shuffle(range(Ccells)).slice(0, n), jit: range(n).map(() => [Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1]) };
  }

  /* ----- count_quick ----- */
  LIST.push(topic({
    id: "count_quick", title: "How many", icon: ICON.count, strand: "Number",
    levels: [
      { id: "cq_subitize", name: "See it fast", grade: 1, note: "Dots 1 to 6 in dice or ten-frame shapes. Shown still, no flashing." },
      { id: "cq_count", name: "Count pictures", grade: 1, note: "6 to 20 pictures. Tap each one: a tick shows it is counted. No running total. More than 10 sit in groups of 5." },
      { id: "cq_tenmore", name: "10 and some more", grade: 1, note: "Two ten-frames, 11 to 20." },
      { id: "cq_make10", name: "Make 10", grade: 1, note: "A part-filled ten-frame. How many more make 10?" },
      { id: "cq_track", name: "After and before", grade: 1, note: "Count on and count back on a 0-20 number track." },
      { id: "cq_words", name: "Number words", grade: 1, note: "Pick the word for a numeral to 20. The host reads the words aloud." }
    ],
    makers: [
      () => { const n = rand(1, 6), layout = pick(["dice", "frame"]); return numQ({ key: `cq0:${layout}:${n}`, say: "How many dots?", show: "How many dots?", answer: String(n), data: { kind: "subit", n, layout } }); },
      () => { const n = rand(6, 20), [art, pl] = pick(COUNT_ART); return numQ({ key: `cq1:${art}:${n}`, say: `How many ${pl}?`, show: `How many ${pl}?`, answer: String(n), data: Object.assign({ kind: "pics", n, art, plural: pl }, scatter(n, .4)) }); },
      () => { const n = rand(11, 20); return numQ({ key: `cq2:${n}`, say: "How many dots in all?", show: "How many dots in all?", answer: String(n), data: { kind: "tenmore", n } }); },
      () => { const k = rand(1, 9); return numQ({ key: `cq3:${k}`, say: "How many more make 10?", show: "How many more make 10?", answer: String(10 - k), data: { kind: "make10", k } }); },
      () => {
        const dir = pick(["after", "before"]), s = dir === "after" ? rand(1, 19) : rand(2, 20), target = dir === "after" ? s + 1 : s - 1;
        return numQ({ key: `cq4:${dir}:${s}`, say: `What comes ${dir} ${s}?`, show: `What comes ${dir} ${s}?`, answer: String(target), data: { kind: "track", s, dir, target } });
      },
      () => {
        const n = rand(1, 20), cands = [];
        if (n + 10 <= 20) cands.push(n + 10); if (n - 10 >= 1) cands.push(n - 10);
        if (n === 12) cands.push(20); if (n === 20) cands.push(12, 2);
        const near = shuffle([n - 1, n + 1].filter(v => v >= 1 && v <= 20));
        const pool = [...new Set([...shuffle(cands), ...near].filter(v => v !== n))];
        const picks = pool.slice(0, 2);
        while (picks.length < 2) { const v = rand(1, 20); if (v !== n && !picks.includes(v)) picks.push(v); }
        const choices = shuffle([n, ...picks]).map(v => ({ value: WORDS[v], label: WORDS[v], html: wordHTML(WORDS[v]) }));
        return { key: `cq5:${n}`, say: "Which word is this number?", show: `Which word is ${numHTML(n)}?`, answer: WORDS[n], input: { type: "choice", choices }, data: { kind: "words", n } };
      }
    ],
    hint(Q, tries) {
      const d = Q.data;
      switch (d.kind) {
        case "subit": return "Touch each dot as you count. Count each dot one time.";
        case "pics": return d.n > 10 ? "Each yellow tray holds 5. Count by fives, then count on the rest. Tap each one you count." : "Tap each one as you count it. A tick shows it is counted. Do not skip any.";
        case "tenmore": return "A full frame is 10. Start at 10. Count on with the blue dots.";
        case "make10": return "Count the empty boxes. Tap each one to fill it.";
        case "track": return d.dir === "after" ? `Find Kitty on ${d.s}. Hop one square forward. Say the next number.` : `Find Kitty on ${d.s}. Hop one square back. Say the number before.`;
        default: return d.n > 10 ? "It is ten and some more. Count the dots. Listen for the teen word." : "Count the dots. Then listen to each word.";
      }
    }
  }));

  /* ----- place_value ----- */
  LIST.push(topic({
    id: "place_value", title: "Tens and ones", icon: ICON.place, strand: "Number",
    levels: [
      { id: "pv_tens_ones", name: "Rods and cubes", grade: 2, note: "Sort rods and cubes onto the mats, then say the number (11-99)." },
      { id: "pv_digit_worth", name: "What is it worth?", grade: 2, note: "The digit 4 in 49 is worth 40. Put the digit cards and blocks on the mats, then count the rods." },
      { id: "pv_hundreds", name: "Flats, rods, cubes", grade: 3, note: "Sort flats, rods and cubes; numbers 111-999 with no zero digit." },
      { id: "pv_zero", name: "Zero holds the place", grade: 3, note: "Numbers like 408, 590, 700: an empty mat means a 0." },
      { id: "pv_cross", name: "Over the hundred", grade: 3, note: "What comes after 699? Add or take one block and trade 10 for 1." }
    ],
    makers: [
      () => { const T = rand(1, 9), O = T === 1 ? rand(1, 9) : rand(0, 9), n = T * 10 + O; return numQ({ key: `pv0:${n}`, say: "Put the blocks on the mats. What number do they make?", show: "What number do the blocks make?", answer: String(n), data: { kind: "pvsort", places: ["T", "O"], H: 0, T, O } }); },
      () => { let T, O; do { T = rand(2, 9); O = rand(1, 9); } while (O === T); const n = T * 10 + O; return numQ({ key: `pv1:${n}`, say: `What is the ${T} worth in ${n}?`, show: `What is the <b style="color:${C.pinkD}">${T}</b> worth in <span style="color:${C.pinkD};text-decoration:underline;text-decoration-thickness:3px">${T}</span>${O}?`, answer: String(T * 10), data: { kind: "pvdigit", places: ["T", "O"], n, H: 0, T, O } }); },
      () => { const H = rand(1, 9), T = rand(1, 9), O = rand(1, 9), n = H * 100 + T * 10 + O; return numQ({ key: `pv2:${n}`, say: "Put the blocks on the mats. What number do they make?", show: "What number do the blocks make?", answer: String(n), data: { kind: "pvsort", places: ["H", "T", "O"], H, T, O } }); },
      () => {
        const form = pick(["h0o", "ht0", "h00"]); let H = rand(1, 9), T = rand(1, 9), O = rand(1, 9);
        if (form === "h0o") T = 0; else if (form === "ht0") O = 0; else { H = rand(2, 9); T = 0; O = 0; }
        const n = H * 100 + T * 10 + O;
        return numQ({ key: `pv3:${n}`, say: "Put the blocks on the mats. What number do they make?", show: "What number do the blocks make?", answer: String(n), data: { kind: "pvsort", places: ["H", "T", "O"], H, T, O } });
      },
      () => {
        const dir = pick(["after", "before"]), hundred = Math.random() < .8; let start;
        if (dir === "after") start = hundred ? rand(1, 8) * 100 + 99 : rand(1, 9) * 100 + rand(0, 8) * 10 + 9;
        else start = hundred ? rand(2, 9) * 100 : rand(1, 9) * 100 + rand(1, 9) * 10;
        const D = digitsOf(start), ans = dir === "after" ? start + 1 : start - 1;
        return numQ({ key: `pv4:${dir}:${start}`, say: `What comes ${dir} ${start}?`, show: `What comes ${dir} ${start}?`, answer: String(ans), data: { kind: "pvtrade", start, dir, H: D.H, T: D.T, O: D.O } });
      }
    ],
    hint(Q, tries) {
      const d = Q.data;
      if (d.kind === "pvdigit") return `Put each digit card on its mat. The left digit is the tens. Put the blocks on the mats. Each rod is 10. Count the rods by tens.`;
      if (d.kind === "pvtrade") return d.dir === "after" ? "Tap Add 1. Ten cubes make a rod. Ten rods make a flat. Then count." : "Tap Take 1. No cubes? Open a rod. No rods? Open a flat. Then count.";
      const zero = d.kind === "pvsort" && d.places.length === 3 && (!d.T || !d.O);
      return d.places.length === 3 ? `Tap a block, then tap its mat. Count the flats, then the rods, then the cubes.${zero ? " An empty mat means 0." : ""}` : "Tap a block, then tap its mat. Count the rods by tens. Then count on the cubes.";
    }
  }));

  /* ----- compare_numbers ----- */
  function cmpPair(lv) {
    const eq = Math.random() < (lv === 0 ? .2 : .14);
    if (lv === 0) { const a = rand(1, 20); return [a, eq ? a : (() => { let b; do { b = rand(1, 20); } while (b === a); return b; })()]; }
    if (lv === 1) {
      const a = rand(10, 99); if (eq) return [a, a];
      if (Math.random() < .4) { let b; do { b = Math.floor(a / 10) * 10 + rand(0, 9); } while (b === a); return [a, b]; }
      let b; do { b = rand(10, 99); } while (b === a); return [a, b];
    }
    const a = rand(100, 999); if (eq) return [a, a];
    const r = Math.random(); let b;
    do { b = r < .3 ? Math.floor(a / 100) * 100 + rand(0, 99) : r < .45 ? Math.floor(a / 10) * 10 + rand(0, 9) : rand(100, 999); } while (b === a || b < 100);
    return [a, b];
  }
  LIST.push(topic({
    id: "compare_numbers", title: "Bigger or smaller", icon: ICON.compare, strand: "Number",
    levels: [
      { id: "cmp_20", name: "Compare to 20", grade: 1, note: "Build two cube towers with the plus buttons. Pick <, = or >." },
      { id: "cmp_100", name: "Compare to 100", grade: 2, note: "Build both numbers with rods and cubes. Pick <, = or >." },
      { id: "cmp_1000", name: "Compare to 1000", grade: 3, note: "Build both numbers with flats, rods and cubes. Pick <, = or >." },
      { id: "cmp_order", name: "Put in order", grade: 3, note: "Grades 2-3. Three numbers to 100 or 1000, smallest first. Pick the right order." }
    ],
    makers: [0, 1, 2].map(lv => () => {
      const [a, b] = cmpPair(lv), ans = a < b ? "<" : a > b ? ">" : "=";
      return { key: `cmp${lv}:${a}:${b}`, say: `${a} and ${b}. Which sign goes in the middle?`, show: `${numHTML(a)} ${boxHTML("?")} ${numHTML(b)}`, answer: ans, input: { type: "choice", choices: SIGN_CHOICES.map(c => Object.assign({}, c)) }, data: { kind: "cmp", a, b, mode: lv === 0 ? "cubes" : "blocks" } };
    }).concat([() => {
      const three = Math.random() < .5, lo = three ? 100 : 10, hi = three ? 999 : 99, nums = [];
      const lead = Math.random() < .5 ? rand(three ? 1 : 1, 9) : null;
      while (nums.length < 3) {
        let v = lead && nums.length < 2 ? (three ? lead * 100 + rand(0, 99) : lead * 10 + rand(0, 9)) : rand(lo, hi);
        if (v < lo) continue;
        if (!nums.includes(v)) nums.push(v);
      }
      const sorted = nums.slice().sort((p, q) => p - q), fmt = a => a.join(", ");
      // The cards are never dealt already smallest first: then the question line and the cards would show the answer.
      if (fmt(nums) === fmt(sorted)) nums.push(nums.shift());
      const perms = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]].map(p => p.map(i => sorted[i])).filter(p => fmt(p) !== fmt(sorted));
      const wrong = shuffle(perms).slice(0, 2);
      const choices = shuffle([sorted, ...wrong]).map(p => ({ value: fmt(p), label: p.join(", then "), html: numHTML(p.join(", ")) }));
      return { key: `cmp3:${nums.join(":")}`, say: "Put the numbers in order. Smallest first.", show: `Smallest first: ${nums.map(numHTML).join(", ")}`, answer: fmt(sorted), input: { type: "choice", choices }, data: { kind: "order", nums } };
    }]),
    hint(Q) {
      const d = Q.data;
      if (d.kind === "order") return `Find the smallest first. ${ORDER_HOW} Tap the cards to line them up.`;
      if (d.mode === "cubes") return "Build each number: tap the plus for each cube, and count. Then see which tower is taller. The open mouth faces the side with more.";
      return Math.max(d.a, d.b) >= 100 ? "Build each number with the plus buttons. Look at the hundreds first. More hundreds is bigger. Same? Look at the tens." : "Build each number with the plus buttons. Look at the tens first. More tens is bigger. Same tens? Look at the ones.";
    }
  }));

  /* ----- skip_count ----- */
  function skipQ(lv) {
    let step, dir = 1, start, max;
    if (lv === 0) { step = pick([2, 5]); max = step === 2 ? 20 : 50; start = step * rand(0, (max - 4 * step) / step); }
    else if (lv === 1) { step = pick([2, 5, 10]); dir = pick([1, -1]); max = 100; start = dir > 0 ? rand(0, max - 4 * step) : rand(4 * step, max); }
    else if (lv === 2) { step = pick([25, 100]); dir = pick([1, -1]); max = 1000; start = step === 25 ? 25 * (dir > 0 ? rand(0, 36) : rand(4, 40)) : (dir > 0 ? rand(0, 600) : rand(400, 999)); }
    else { step = pick([3, 4]); dir = pick([1, -1]); max = 1000; start = dir > 0 ? rand(0, max - 4 * step) : rand(4 * step, max); }
    // The question mark is never first or second, so two given numbers always come before it.
    const terms = range(5).map(i => start + dir * step * i), miss = rand(2, 4);
    // The hop button shows the hop size, and the lesson says the jump size and counts the hops (1 up to the jump).
    // None of those may be the answer.
    if (terms[miss] >= 1 && terms[miss] <= step) return skipQ(lv);
    const shown = terms.map((v, i) => i === miss ? boxHTML("?") : numHTML(v)).join(", ");
    return numQ({ key: `sk${lv}:${terms.join(":")}:${miss}`, say: "What number is missing?", show: shown, answer: String(terms[miss]), data: { kind: "skip", terms, step, dir, miss } });
  }
  LIST.push(topic({
    id: "skip_count", title: "Jump and count", icon: ICON.skip, strand: "Number",
    levels: [
      { id: "sk_2_5", name: "By 2s and 5s", grade: 1, note: "From 0, up to 20 (by 2) or 50 (by 5)." },
      { id: "sk_2_5_10", name: "By 2, 5 and 10", grade: 2, note: "Any start, forward and backward, up to 100." },
      { id: "sk_25_100", name: "By 25 and 100", grade: 3, note: "Grades 2-3. Quarters and hundreds, up to 1000." },
      { id: "sk_3_4", name: "By 3s and 4s", grade: 3, note: "Any start, forward and backward, up to 1000." }
    ],
    makers: [0, 1, 2, 3].map(lv => () => skipQ(lv)),
    hint(Q) {
      const d = Q.data, i = KINDS.skip.pairFor(d), A = d.terms[i], B = d.terms[i + 1];
      return UNIT[d.step] < d.step ? `How big is each jump? Hop the frog from ${A} to ${B} and count the hops. Then hop on to the question mark.` : `How big is each jump? Look at ${A} and ${B}. Then make the same jump once more, from ${B}.`;
    }
  }));

  /* ----- odd_even ----- */
  LIST.push(topic({
    id: "odd_even", title: "Odd or even", icon: ICON.oddeven, strand: "Number",
    levels: [
      { id: "oe_bears", name: "Pair the bears", grade: 2, note: "Up to 20 bears. Pair them up. One left over means odd." },
      { id: "oe_100", name: "Odd or even to 100", grade: 2, note: "Tens always pair up. Look at the ones digit." },
      { id: "oe_1000", name: "Odd or even to 1000", grade: 3, note: "Grade 3 numbers to 1000 (BC lists odd and even in Grade 2; this uses Grade 3 numbers). Hundreds and tens always pair up. Pair the ones." }
    ],
    makers: [
      () => { const n = rand(2, 20), art = pick(["bear", "teddy"]); return { key: `oe0:${n}`, say: `${n} bears. Is ${n} odd or even? Pair them up.`, show: `${numHTML(n)} bears. Odd or even?`, answer: n % 2 ? "odd" : "even", input: { type: "choice", choices: ODD_CHOICES.map(c => Object.assign({}, c)) }, data: Object.assign({ kind: "bears", n, art }, scatter(n, .25)) }; },
      () => { const n = rand(21, 99); return { key: `oe1:${n}`, say: `Is ${n} odd or even?`, show: `Is ${numHTML(n)} odd or even?`, answer: n % 2 ? "odd" : "even", input: { type: "choice", choices: ODD_CHOICES.map(c => Object.assign({}, c)) }, data: { kind: "oddtens", n, T: Math.floor(n / 10), O: n % 10 } }; },
      () => { const n = rand(101, 999); return { key: `oe2:${n}`, say: `Is ${n} odd or even?`, show: `Is ${numHTML(n)} odd or even?`, answer: n % 2 ? "odd" : "even", input: { type: "choice", choices: ODD_CHOICES.map(c => Object.assign({}, c)) }, data: { kind: "oddtens", big: true, n, H: Math.floor(n / 100), T: Math.floor(n / 10) % 10, O: n % 10 } }; }
    ],
    hint(Q) {
      return Q.data.kind === "bears" ? "Tap two bears to make a pair. Keep going. Is one bear left alone?" : (Q.data.big ? "Hundreds and tens always make pairs. Only the ones digit matters. Pair up the ones cubes." : "Every ten makes pairs. Only the ones digit matters. Pair up the ones cubes.");
    }
  }));

  /* ----- estimate ----- */
  const EST_SETS = [[30, 300, 900], [20, 200, 800], [50, 200, 800], [60, 250, 900], [30, 150, 600], [40, 120, 500], [40, 300, 900]];  // neighbours at least 2.5 times apart, so a guess within 8% is never close to two choices
  LIST.push(topic({
    id: "estimate", title: "About how many", icon: ICON.estimate, strand: "Number",
    levels: [
      { id: "est_bench", name: "25, 50 or 100?", grade: 2, note: "Benchmarks 25, 50 and 100. A little jar of 10 helps." },
      { id: "est_big", name: "Big amounts", grade: 3, note: "Up to about 1000. A little jar of 100 helps. Three choices far apart." }
    ],
    makers: [
      () => {
        const target = pick([25, 50, 100]), N = target === 25 ? rand(20, 30) : target === 50 ? rand(43, 57) : rand(88, 100);
        return { key: `est0:${N}`, say: "About how many candies are in the big jar? Closer to 25, 50 or 100?", show: "About how many candies?", answer: String(target), input: { type: "choice", choices: [25, 50, 100].map(v => ({ value: String(v), label: String(v), html: numHTML(v) })) }, data: { kind: "est", N, g: 10, choices: [25, 50, 100] } };
      },
      () => {
        const set = pick(EST_SETS), target = pick(set), N = Math.round(target * (1 + (Math.random() * .16 - .08)));
        return { key: `est1:${N}`, say: "About how many candies are in the big jar?", show: "About how many candies?", answer: String(target), input: { type: "choice", choices: set.map(v => ({ value: String(v), label: String(v), html: numHTML(v) })) }, data: { kind: "est", N, g: 100, choices: set } };
      }
    ],
    hint(Q) { return Q.data.g === 10 ? "The little jar holds 10. Tap the big jar to make groups of 10. Count by tens." : "The little jar holds 100. Tap the big jar to make groups of 100. How many groups?"; }
  }));
})();
