/* fractions.js - the Fractions strand for Marie's maths game.
   Pushes four topics onto window.MathTopics: fraction_name, fraction_whole, fraction_set, fraction_compare.

   Curriculum: BC Grade 3 "fraction concepts" (parts of a region, a set or a line; equal shares;
   linking a picture to the written fraction). BC names no denominators; our order is 2, 3, 4, then 5, 6, 8, 10.
   fraction_whole (adding to make a whole) and fraction_compare are beyond BC Grade 3. They are here
   because Marie's father asked for them, and each level note says so.

   Contract notes:
   - make(level, prev): `level` may be a 0-based index or one of the topic's level objects. `prev` may be undefined.
   - mount(el, Q, api) draws one inline SVG that fills `el` and re-lays itself out when `el` changes size.
   - teach(Q, el, api) reuses the picture mounted in `el` (or mounts one), resets it, and guides Marie step by step.
     If the picture is destroyed during a lesson, the lesson promise resolves so the host never hangs.
   - Spoken text (say, hints, lessons) uses words ("three eighths"), never "3/8".
   - Father's rule (2026-10-15): a tap MARKS a thing with a tick. It never shows or says a running number.
     Before she answers, the answer is nowhere: not in the picture, a label, or speech.
   - Lesson rule (lead, 2026-10-16), the same in every lesson here. In a counting step Kitty may say the count
     for her first 1 or 2 taps only, to show HOW, and always stops at least 2 before the step's total. She never
     says a number that is part of the answer and not printed in the question. Then Kitty says "Your turn. Keep
     counting." and each tap gets a tick and a soft tone, no number. The lesson ends; Marie types or picks.
   - recount(Q, el, api): only for when her answer after the lesson is still wrong. The same lesson, but Kitty
     counts every tap out loud with her, to the end. Then Marie types the number herself.
   - All pictures are our own inline SVG. No images are loaded. */
(function () {
  "use strict";

  /* ================= Palette and small helpers ================= */
  const C = {
    ink: "#3b2a33", pink: "#ff6f9f", pinkDeep: "#e0306b", pinkTint: "#ffd6e4", sun: "#ffc94a", mint: "#63d3b3",
    sky: "#74c8ff", skyTint: "#d4efff", lilac: "#a98bff", cream: "#fff3df", paper: "#ffffff", crust: "#f0bf87",
    choc: "#a0673f", chocHi: "#bd825a", plateRim: "#f4e9ee",
  };
  const FONT = `'Baloo 2', 'Comic Sans MS', 'Trebuchet MS', sans-serif`;
  const rnd = n => Math.floor(Math.random() * n);
  const pick = a => a[rnd(a.length)];
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const r2 = v => Math.round(v * 100) / 100;
  const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
  const sleep = ms => new Promise(res => setTimeout(res, ms));
  const NUM = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
  const ORD = { 2: ["half", "halves"], 3: ["third", "thirds"], 4: ["quarter", "quarters"], 5: ["fifth", "fifths"], 6: ["sixth", "sixths"], 8: ["eighth", "eighths"], 10: ["tenth", "tenths"] };
  function words(a, d) {
    if (a === d) return "one whole";
    if (a > d || !ORD[d]) return `${NUM[a] || a} over ${NUM[d] || d}`;
    return `${NUM[a]} ${a === 1 ? ORD[d][0] : ORD[d][1]}`;
  }
  const frac = (a, d, cls = "") => `<span class="fr-frac ${cls}" role="img" aria-label="${words(a, d)}"><span>${a}</span><span>${d}</span></span>`;
  const sameValue = (a, b) => a[0] * b[1] === b[0] * a[1];

  /* ================= Geometry ================= */
  // Angles in degrees, 0 = straight up, clockwise.
  function pt(cx, cy, r, deg) { const a = deg * Math.PI / 180; return [cx + r * Math.sin(a), cy - r * Math.cos(a)]; }
  function wedge(cx, cy, r, a0, a1) {
    const [x0, y0] = pt(cx, cy, r, a0), [x1, y1] = pt(cx, cy, r, a1);
    return `M${r2(cx)} ${r2(cy)}L${r2(x0)} ${r2(y0)}A${r2(r)} ${r2(r)} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${r2(x1)} ${r2(y1)}Z`;
  }
  // The same wedge drawn with two arcs when it is half a pie or more. A single arc between two opposite points
  // is ambiguous, and Chrome then misses some taps on a half-pie tap area (found in the 320px test).
  function wedge2(cx, cy, r, a0, a1) {
    if (a1 - a0 < 179) return wedge(cx, cy, r, a0, a1);
    const [x0, y0] = pt(cx, cy, r, a0), [xm, ym] = pt(cx, cy, r, (a0 + a1) / 2), [x1, y1] = pt(cx, cy, r, a1);
    return `M${r2(cx)} ${r2(cy)}L${r2(x0)} ${r2(y0)}A${r2(r)} ${r2(r)} 0 0 1 ${r2(xm)} ${r2(ym)}A${r2(r)} ${r2(r)} 0 0 1 ${r2(x1)} ${r2(y1)}Z`;
  }
  const equalSpans = n => Array.from({ length: n }, () => 360 / n);
  function spanStarts(spans, rot) { const out = []; let a = rot; for (const s of spans) { out.push(a); a += s; } return out; }
  // Bars are a row (up to 6 pieces) or a 2-row chocolate grid (8 and 10 pieces), all pieces the same size.
  const barGrid = n => (n <= 6 ? [1, n] : [2, n / 2]);

  /* ================= Little pictures (our own drawings) ================= */
  const STROKE = `stroke="${C.ink}" stroke-width="3" stroke-linejoin="round"`;
  function itemSVG(kind, fill, x, y, s) {
    // A 100 x 100 drawing placed at (x, y) with size s.
    const g = body => `<g transform="translate(${r2(x)} ${r2(y)}) scale(${r2(s / 100)})">${body}</g>`;
    const sw = `stroke="${C.ink}" stroke-width="${r2(300 / s)}" stroke-linejoin="round" stroke-linecap="round"`;
    switch (kind) {
      case "bow": return g(`<path d="M50 50 C30 20 8 26 10 50 C8 74 30 80 50 50 Z" fill="${fill}" ${sw}/><path d="M50 50 C70 20 92 26 90 50 C92 74 70 80 50 50 Z" fill="${fill}" ${sw}/><path d="M42 56 L32 88 L44 82 L50 92 L52 60 Z" fill="${fill}" ${sw}/><path d="M58 56 L68 88 L56 82 L50 92" fill="none" ${sw}/><circle cx="50" cy="50" r="11" fill="${fill}" ${sw}/><path d="M22 42 Q24 34 31 33" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="5" stroke-linecap="round"/>`);
      case "heart": return g(`<path d="M50 88 C18 64 6 46 12 30 C18 14 40 12 50 30 C60 12 82 14 88 30 C94 46 82 64 50 88 Z" fill="${fill}" ${sw}/><path d="M24 30 Q28 22 36 22" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="6" stroke-linecap="round"/>`);
      case "star": return g(`<path d="M50 8 L61 36 L91 38 L68 57 L76 88 L50 71 L24 88 L32 57 L9 38 L39 36 Z" fill="${fill}" ${sw}/><path d="M42 40 L47 28" stroke="#fff" stroke-opacity=".7" stroke-width="6" stroke-linecap="round"/>`);
      case "strawberry": return g(`<path d="M50 92 C22 78 12 50 20 36 C28 24 72 24 80 36 C88 50 78 78 50 92 Z" fill="#ff5a7a" ${sw}/><path d="M30 30 L40 16 L50 28 L60 16 L70 30 Q50 40 30 30 Z" fill="${C.mint}" ${sw}/>${[[36, 48], [56, 46], [46, 62], [64, 62], [40, 76], [56, 78], [30, 60]].map(([a, b]) => `<ellipse cx="${a}" cy="${b}" rx="3" ry="4" fill="#ffe7a0"/>`).join("")}`);
      default: return g(`<circle cx="50" cy="52" r="40" fill="#e9b26a" ${sw}/><circle cx="50" cy="52" r="31" fill="#f3c98a"/>${[[38, 40], [62, 44], [48, 60], [66, 64], [34, 64], [52, 34]].map(([a, b]) => `<ellipse cx="${a}" cy="${b}" rx="5.5" ry="4.5" fill="#6b3f26" transform="rotate(${a * 3} ${a} ${b})"/>`).join("")}`); // cookie
    }
  }
  const ITEM_NAME = { bow: ["bow", "bows"], heart: ["heart", "hearts"], star: ["star", "stars"], cookie: ["cookie", "cookies"], strawberry: ["strawberry", "strawberries"] };
  const OTHER_COLOURS = [C.sky, C.mint, C.lilac, C.sun];

  // A small pie for choice buttons (60 x 60 viewBox).
  function miniPie({ n = 1, on = 0, plate = null, fill = C.pink, gapFrom = null, whole = false }) {
    const cx = 30, cy = 30, r = 22;
    let s = `<svg viewBox="0 0 60 60" aria-hidden="true">`;
    s += `<circle cx="30" cy="33" r="28" fill="${C.ink}"/><circle cx="30" cy="30" r="27" fill="${plate || C.paper}" stroke="${C.ink}" stroke-width="2.5"/>`;
    if (whole || n === 1) s += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${on ? fill : C.cream}" stroke="${C.ink}" stroke-width="2.5"/>`;
    else for (let i = 0; i < n; i++) {
      if (gapFrom !== null && i >= gapFrom) { s += `<path d="${wedge(cx, cy, r, i * 360 / n, (i + 1) * 360 / n)}" fill="none" stroke="${C.ink}" stroke-width="1.6" stroke-dasharray="3 3"/>`; continue; }
      s += `<path d="${wedge(cx, cy, r, i * 360 / n, (i + 1) * 360 / n)}" fill="${i < on ? fill : C.cream}" stroke="${C.ink}" stroke-width="2.5" stroke-linejoin="round"/>`;
    }
    return s + `</svg>`;
  }
  // A small bar for choice buttons.
  function miniBar(widths, plate) {
    const total = widths.reduce((a, b) => a + b, 0);
    let x = 6, s = `<svg viewBox="0 0 60 60" aria-hidden="true"><rect x="2" y="12" width="56" height="40" rx="10" fill="${C.ink}"/><rect x="2" y="9" width="56" height="40" rx="10" fill="${plate}" stroke="${C.ink}" stroke-width="2.5"/>`;
    for (const w of widths) { const ww = w / total * 48; s += `<rect x="${r2(x)}" y="18" width="${r2(ww)}" height="22" fill="${C.choc}" stroke="${C.ink}" stroke-width="2.2"/>`; x += ww; }
    return s + `</svg>`;
  }

  /* ================= Shared CSS (once per page) ================= */
  const CSS = `
.fr-root{position:relative;width:100%;height:100%;min-height:120px;overflow:hidden;touch-action:none;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
.fr-svg,.fr-drag{position:absolute;left:0;top:0;width:100%;height:100%;display:block;touch-action:none}
.fr-drag{pointer-events:none;overflow:visible}
.fr-svg [data-hit]{cursor:pointer}
.fr-svg text{font-family:${FONT};font-weight:800;pointer-events:none}
.fr-reset{position:absolute;top:6px;right:6px;width:46px;height:46px;border-radius:50%;border:3px solid ${C.ink};box-shadow:0 3px 0 ${C.ink};background:#fff;color:${C.ink};font:800 22px/1 ${FONT};display:grid;place-items:center;padding:0;cursor:pointer;z-index:2;touch-action:manipulation}
.fr-reset:active{transform:translateY(3px);box-shadow:0 0 0 ${C.ink}}
.fr-reset:focus-visible{outline:4px solid ${C.sky};outline-offset:2px}
.fr-mode{position:absolute;top:60px;right:6px;width:46px;height:46px;border-radius:50%;border:3px solid ${C.ink};box-shadow:0 3px 0 ${C.ink};background:#fff;color:${C.ink};display:grid;place-items:center;padding:0;cursor:pointer;z-index:2;touch-action:manipulation}
.fr-mode svg{width:30px;height:30px}
.fr-mode[aria-pressed="true"]{background:${C.sun};box-shadow:0 0 0 4px ${C.mint},0 3px 0 ${C.ink}}
.fr-mode:active{transform:translateY(3px)}
.fr-mode:focus-visible{outline:4px solid ${C.sky};outline-offset:2px}
.fr-pulse{animation:frPulse 1.1s ease-in-out infinite}
@keyframes frPulse{50%{opacity:.2}}
.fr-pop{animation:frPop .32s ease-out;transform-box:fill-box;transform-origin:center}
@keyframes frPop{from{transform:scale(.55)}70%{transform:scale(1.07)}}
.fr-shake{animation:frShake .35s}
@keyframes frShake{25%{transform:translateX(-7px)}75%{transform:translateX(7px)}}
.fr-frac{display:inline-flex;flex-direction:column;align-items:center;vertical-align:middle;line-height:.92;font-family:${FONT};font-weight:800;margin:0 .12em;font-variant-numeric:tabular-nums}
.fr-frac>span{display:block;font-size:.78em;padding:0 .14em}
.fr-frac>span:first-child{border-bottom:.1em solid currentColor;padding-bottom:.05em;-webkit-text-stroke:inherit}
.fr-frac>span:last-child{padding-top:.07em}
.fr-ch{display:inline-flex;align-items:center;justify-content:center;gap:8px;line-height:1}
.fr-ch svg{width:50px;height:50px;flex:none}
.fr-ch .fr-two{display:inline-flex;gap:2px}.fr-ch .fr-two svg{width:40px;height:40px}
.fr-big{font-size:54px;color:${C.ink}}
.fr-num{font:800 36px/1 ${FONT};color:${C.ink}}
.fr-word{font:800 21px/1.05 ${FONT};color:${C.ink};text-align:left}
@media (max-width:420px){.fr-ch svg{width:40px;height:40px}.fr-ch .fr-two svg{width:30px;height:30px}.fr-big{font-size:46px}.fr-word{font-size:18px}}
@media (max-width:360px){.fr-ch{gap:4px}.fr-ch .fr-two{flex-direction:column;gap:1px}.fr-ch .fr-two svg{width:22px;height:22px}}
@media (prefers-reduced-motion:reduce){.fr-pulse,.fr-pop,.fr-shake{animation:none}}`;
  function injectCSS() {
    if (typeof document === "undefined" || document.getElementById("fr-css")) return;
    const st = document.createElement("style"); st.id = "fr-css"; st.textContent = CSS; (document.head || document.documentElement).appendChild(st);
  }
  injectCSS();

  /* ================= Drawing parts used by several pictures ================= */
  // A tick mark. A tap marks a thing; it never shows a number (father's rule, 2026-10-15).
  // r: the tick's radius, smaller on small things so the thing stays easy to see.
  const mark = (x, y, r = 15) => { const k = r / 15; return `<g pointer-events="none" data-mark="1"><circle cx="${r2(x)}" cy="${r2(y)}" r="${r2(r)}" fill="${C.mint}" stroke="${C.ink}" stroke-width="2.5"/><path d="M${r2(x - 7 * k)} ${r2(y + k)}l${r2(5 * k)} ${r2(5 * k)} ${r2(9 * k)} ${r2(-11 * k)}" fill="none" stroke="${C.ink}" stroke-width="${r2(Math.max(2.5, 3.5 * k))}" stroke-linecap="round" stroke-linejoin="round"/></g>`; };
  // One tap on a thing: tick it. Outside a lesson a second tap takes the tick off, and no number is said.
  // Inside Kitty's lesson the ticks stay. Kitty says the count only for the first taps of the step (see lessonCount).
  function markTap(s, i) {
    const st = s.st, lesson = !!s.teaching;
    if (st.badges.has(i)) { if (!lesson) { st.badges.delete(i); s.tone([480], .06); } return; }
    st.count++; st.badges.set(i, st.count); s.tone([660], .06);
    if (lesson) lessonCount(s, st.count);
  }
  // Lesson rule: Kitty says "1" (and "2") for the first taps only, then "Your turn. Keep counting." After that a
  // tap gets a tick and a tone, never a number. In recount (her answer after the lesson was still wrong) she says every number.
  function lessonCount(s, n) {
    const T = s.st.teach, k = T && T.demo !== undefined ? T.demo : 0;
    if (n <= k) s.speak(String(n));
    if (n === k && T && T.total > k) s.say("Your turn. Keep counting.");
  }
  // The numbers that make up the answer and are NOT printed in the question ("3" and "6" for 3/6 of a group).
  function hiddenNums(Q) {
    const shown = new Set(String(Q.show || "").replace(/<[^>]+>/g, " ").match(/\d+/g) || []);
    return String(Q.answer).split("/").filter(x => /^\d+$/.test(x) && !shown.has(x)).map(Number);
  }
  // How many of a counting step's first taps Kitty counts out loud: at most 2, always 2 or more short of the
  // total, and never a number that is part of the answer (when the answer is 1/4, she never says "1").
  function demoFor(s, total) {
    if (s.countAll) return Infinity;
    const hid = hiddenNums(s.Q);
    let k = Math.max(0, Math.min(2, total - 2));
    while (k > 0 && hid.some(h => h >= 1 && h <= k)) k--;
    return k;
  }
  function plate(cx, cy, R, tint = C.paper) {
    return `<circle cx="${r2(cx)}" cy="${r2(cy + 5)}" r="${r2(R)}" fill="${C.ink}"/><circle cx="${r2(cx)}" cy="${r2(cy)}" r="${r2(R)}" fill="${tint}" stroke="${C.ink}" stroke-width="3"/><circle cx="${r2(cx)}" cy="${r2(cy)}" r="${r2(R * .93)}" fill="none" stroke="${C.ink}" stroke-opacity=".14" stroke-width="2"/>`;
  }
  // A pie of slices. opts: spans, rot, fillOf(i), hit(i) -> data attrs string, glow(i), dashed(i), badges Map.
  // opts.hitR: the tap area of each slice reaches out to this radius (just past the plate's rim), so a slice is easier
  // to tap than it looks. Then an invisible wedge on top carries the tap data, and the drawn slice carries none.
  function pieSlices(cx, cy, r, o) {
    const starts = spanStarts(o.spans, o.rot || 0), hr = o.hitR && o.hit ? Math.max(r, o.hitR) : 0, key = o.key || "p";
    let under = "", body = "", hits = "", over = "";
    o.spans.forEach((sp, i) => {
      const a0 = starts[i], a1 = a0 + sp, d = wedge(cx, cy, r, a0, a1);
      const lit = !!(o.glow && o.glow(i)), dashed = !!(o.dashed && o.dashed(i)), f = dashed ? "" : o.fillOf(i);
      const attrs = `data-a0="${r2(a0)}" data-a1="${r2(a1)}" ${o.hit ? o.hit(i) : ""}${lit ? ' data-glow="1"' : ""}${dashed ? "" : ` data-fill="${f}"`}`;
      const own = hr ? `data-vof="${key}${i}"` : attrs; // with a wider tap area, the drawn slice only names its tap wedge
      if (hr) hits += `<path d="${wedge2(cx, cy, hr, a0, a1)}" fill="transparent" stroke="none" data-v="${key}${i}" ${attrs}/>`;
      if (lit) under += `<path class="fr-pulse" d="${d}" fill="none" stroke="${C.sun}" stroke-width="12" stroke-linejoin="round" pointer-events="none"/>`;
      if (dashed) body += `<path d="${d}" fill="#fff" fill-opacity=".55" stroke="${C.ink}" stroke-width="2.5" stroke-dasharray="8 6" stroke-linejoin="round" ${own}/>`;
      else {
        body += `<path class="fr-slice${o.pop && o.pop(i) ? " fr-pop" : ""}" d="${d}" fill="${f}" ${STROKE} ${own}/>`;
        if (f !== C.cream && sp < 359) { // a soft shine on coloured slices
          const [hx0, hy0] = pt(cx, cy, r * .78, a0 + sp * .25), [hx1, hy1] = pt(cx, cy, r * .78, a0 + sp * .62);
          if (sp >= 30) over += `<path d="M${r2(hx0)} ${r2(hy0)}A${r2(r * .78)} ${r2(r * .78)} 0 0 1 ${r2(hx1)} ${r2(hy1)}" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="5" stroke-linecap="round" pointer-events="none"/>`;
        }
      }
      if (lit) over += `<path class="fr-pulse" d="${d}" fill="${C.sun}" fill-opacity=".5" pointer-events="none"/><path d="${d}" fill="none" ${STROKE} pointer-events="none"/>`; // glow on top, crisp outline kept
      if (o.badges && o.badges.has(i)) { const [bx, by] = pt(cx, cy, r * (sp >= 180 ? .45 : .62), a0 + sp / 2); over += mark(bx, by, Math.max(9, Math.min(15, r * .2))); }
    });
    return under + body + hits + over;
  }
  // A chocolate bar of n equal pieces in 1 or 2 rows (or unequal widths in one row).
  function barPieces(x, y, w, h, o) {
    const [rows, cols] = o.widths ? [1, o.widths.length] : o.grid || barGrid(o.n);
    const total = o.widths ? o.widths.reduce((a, b) => a + b, 0) : cols;
    const rh = h / rows;
    let under = "", body = "", over = "", k = 0;
    const clipR = Math.min(16, rh * .3);
    under += `<rect x="${r2(x)}" y="${r2(y + 5)}" width="${r2(w)}" height="${r2(h)}" rx="${r2(clipR)}" fill="${C.ink}"/>`;
    for (let row = 0; row < rows; row++) {
      let cx = x;
      for (let col = 0; col < cols; col++, k++) {
        const pw = (o.widths ? o.widths[col] : 1) / total * w, py = y + row * rh, i = k;
        const f = o.fillOf(i), hi = f === C.choc ? C.chocHi : "rgba(255,255,255,.45)";
        const attrs = `data-x="${r2(cx)}" data-w="${r2(pw)}" data-y="${r2(py)}" data-h="${r2(rh)}" ${o.hit ? o.hit(i) : ""}${o.glow && o.glow(i) ? ' data-glow="1"' : ""}`;
        // Outer corners are rounded; inner joins are square.
        const tl = row === 0 && col === 0, tr = row === 0 && col === cols - 1, bl = row === rows - 1 && col === 0, br = row === rows - 1 && col === cols - 1;
        const d = roundedRect(cx, py, pw, rh, tl ? clipR : 0, tr ? clipR : 0, br ? clipR : 0, bl ? clipR : 0);
        if (o.glow && o.glow(i)) under += `<path class="fr-pulse" d="${d}" fill="none" stroke="${C.sun}" stroke-width="12" stroke-linejoin="round" pointer-events="none"/>`;
        body += `<path class="fr-slice${o.pop && o.pop(i) ? " fr-pop" : ""}" d="${d}" fill="${f}" ${STROKE} ${attrs} data-fill="${f}"/>`;
        const ins = Math.min(9, pw * .14, rh * .14);
        over += `<rect x="${r2(cx + ins)}" y="${r2(py + ins)}" width="${r2(Math.max(0, pw - 2 * ins))}" height="${r2(Math.max(0, rh - 2 * ins))}" rx="6" fill="none" stroke="${hi}" stroke-width="3" pointer-events="none"/>`;
        if (o.glow && o.glow(i)) over += `<path class="fr-pulse" d="${d}" fill="${C.sun}" fill-opacity=".5" pointer-events="none"/><path d="${d}" fill="none" ${STROKE} pointer-events="none"/>`;
        if (o.badges && o.badges.has(i)) over += mark(cx + pw / 2, py + rh / 2, Math.max(9, Math.min(15, pw * .3, rh * .3)));
        cx += pw;
      }
    }
    return under + body + over;
  }
  function roundedRect(x, y, w, h, tl, tr, br, bl) {
    return `M${r2(x + tl)} ${r2(y)}H${r2(x + w - tr)}${tr ? `A${tr} ${tr} 0 0 1 ${r2(x + w)} ${r2(y + tr)}` : ""}V${r2(y + h - br)}${br ? `A${br} ${br} 0 0 1 ${r2(x + w - br)} ${r2(y + h)}` : ""}H${r2(x + bl)}${bl ? `A${bl} ${bl} 0 0 1 ${r2(x)} ${r2(y + h - bl)}` : ""}V${r2(y + tl)}${tl ? `A${tl} ${tl} 0 0 1 ${r2(x + tl)} ${r2(y)}` : ""}Z`;
  }
  // A stacked fraction drawn in SVG (top, bar, bottom).
  function svgFrac(x, y, a, d, size) {
    const w = size * (String(Math.max(a, d)).length > 1 ? 1.15 : .8);
    return `<g pointer-events="none"><text x="${r2(x)}" y="${r2(y - size * .14)}" text-anchor="middle" font-size="${size}" fill="${C.ink}">${a}</text><rect x="${r2(x - w / 2)}" y="${r2(y - 2)}" width="${r2(w)}" height="5" rx="2.5" fill="${C.ink}"/><text x="${r2(x)}" y="${r2(y + size * .8)}" text-anchor="middle" font-size="${size}" fill="${C.ink}">${d}</text></g>`;
  }
  // Split a box into n equal cells, side by side when wide, stacked when tall.
  function splitBox(W, H, n, reserve, wideAt = 1.05) {
    const wide = W >= H * wideAt;
    const box = wide ? { x: 8, y: 8, w: W - 16 - reserve, h: H - 16 } : { x: 8, y: 8 + reserve, w: W - 16, h: H - 16 - reserve };
    const cells = [];
    for (let i = 0; i < n; i++) cells.push(wide ? { x: box.x + i * box.w / n, y: box.y, w: box.w / n, h: box.h } : { x: box.x, y: box.y + i * box.h / n, w: box.w, h: box.h / n });
    return { wide, box, cells };
  }
  const RESERVE = 50; // room for the start-again button in the corner

  /* ================= The stage: one mounted picture ================= */
  const LIVE = new WeakMap();
  class Stage {
    constructor(el, Q, api) {
      this.el = el; this.Q = Q; this.api = api || {}; this.kind = KINDS[Q.data.kind]; this.waiters = []; this.dead = false;
      this.root = document.createElement("div"); this.root.className = "fr-root";
      this.root.innerHTML = `<svg class="fr-svg" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${this.kind.label(Q)}"></svg><svg class="fr-drag" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"></svg><button class="fr-reset" type="button" aria-label="Start the picture again" title="Start again">⟲</button>`;
      el.appendChild(this.root);
      this.svg = this.root.firstChild; this.dragSvg = this.svg.nextSibling; this.resetBtn = this.root.lastChild;
      this.resetBtn.addEventListener("click", () => { if (this.teaching) return; this.reset(); this.tone([440, 360], .08); });
      // Tick button: where a tap colours a part, this lets her tick parts while she counts, without changing a colour.
      if (this.kind.tickButton && this.kind.tickButton(Q)) {
        const b = document.createElement("button"); b.className = "fr-mode"; b.type = "button";
        b.setAttribute("aria-label", "Tick to count. Taps put a tick and do not colour."); b.title = "Tick to count";
        b.innerHTML = `<svg viewBox="0 0 30 30" aria-hidden="true"><circle cx="15" cy="15" r="12" fill="${C.mint}" stroke="${C.ink}" stroke-width="2.5"/><path d="M9 15.5l4.5 4.5 8-10" fill="none" stroke="${C.ink}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
        b.addEventListener("click", () => { if (this.teaching) return; this.st.tick = !this.st.tick; this.tone(this.st.tick ? [700] : [520], .07); this.render(); });
        this.root.appendChild(b); this.modeBtn = b;
      }
      this.onDown = this.onDown.bind(this); this.onMove = this.onMove.bind(this); this.onUp = this.onUp.bind(this);
      this.svg.addEventListener("pointerdown", this.onDown);
      this.svg.addEventListener("pointermove", this.onMove);
      this.svg.addEventListener("pointerup", this.onUp);
      this.svg.addEventListener("pointercancel", this.onUp);
      this.ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => { const [w, h] = this.size(); if (Math.abs(w - this.W) > 1 || Math.abs(h - this.H) > 1) this.render(); }) : null;
      if (this.ro) this.ro.observe(this.root);
      this.reset();
    }
    size() { const r = this.root.getBoundingClientRect(); return [Math.max(220, r.width || 360), Math.max(120, r.height || 300)]; } // never taller than the real box (150px on a small phone with number keys)
    say(t) { if (this.api.say) this.api.say(t); }
    speak(t) { if (this.api.speak) this.api.speak(t); }
    tone(f, d, t, g) { if (this.api.tone) this.api.tone(f, d, t, g); }
    reset() { this.st = this.kind.init(this.Q); this.st.teach = this.st.teach || null; this.changed(); }
    render() {
      if (this.dead) return;
      const [W, H] = this.size(); this.W = W; this.H = H;
      this.svg.setAttribute("viewBox", `0 0 ${r2(W)} ${r2(H)}`); this.dragSvg.setAttribute("viewBox", `0 0 ${r2(W)} ${r2(H)}`);
      this.L = this.kind.layout(this, W, H);
      this.svg.innerHTML = this.kind.draw(this, this.L);
      this.st.popped = null;
      if (this.modeBtn) {
        const below = this.L.tickAt !== "left";
        this.modeBtn.style.top = below ? "60px" : "6px"; this.modeBtn.style.right = below ? "6px" : "60px";
        this.modeBtn.setAttribute("aria-pressed", this.st.tick ? "true" : "false");
      }
      // The host may still be changing the box size (for example number keys replacing answer buttons). Look again
      // on the next frame, so a picture drawn for the old size never stays (the tick button could cover a part).
      if (!this.rafPending && typeof requestAnimationFrame === "function") {
        this.rafPending = true;
        requestAnimationFrame(() => { this.rafPending = false; if (this.dead) return; const [w, h] = this.size(); if (Math.abs(w - this.W) > 1 || Math.abs(h - this.H) > 1) this.render(); });
      }
      const g = this.svg.querySelector("[data-glow-root]");
      if (g && this.st.teach && this.api.highlight && this.lastHi !== this.st.teach.step) { this.lastHi = this.st.teach.step; try { this.api.highlight(g); } catch (e) { /* host highlight is optional */ } }
    }
    changed() { this.render(); this.check(); }
    check() { this.waiters = this.waiters.filter(w => { if (this.dead || w.pred(this.st)) { w.res(!this.dead); return false; } return true; }); if (this.st.teach && this.st.teach.watch) this.st.teach.watch(this.st); }
    waitFor(pred) { return new Promise(res => { this.waiters.push({ pred, res }); this.check(); }); }
    point(e) { const r = this.svg.getBoundingClientRect(); return [(e.clientX - r.left) * this.W / r.width, (e.clientY - r.top) * this.H / r.height]; }
    onDown(e) {
      const t = e.target.closest && e.target.closest("[data-hit]");
      if (!t || this.drag) return;
      e.preventDefault();
      const [x, y] = this.point(e);
      this.drag = { id: e.pointerId, hit: { ...t.dataset }, el: t, x0: x, y0: y, moving: false };
      try { this.svg.setPointerCapture(e.pointerId); } catch (err) { /* old browsers */ }
    }
    onMove(e) {
      const d = this.drag; if (!d || d.id !== e.pointerId) return;
      const [x, y] = this.point(e);
      if (!d.moving && d.hit.drag && Math.hypot(x - d.x0, y - d.y0) > 7 && (!this.kind.canDrag || this.kind.canDrag(this, d.hit))) {
        d.moving = true; // fade the thing she is moving (a wide tap area names the drawn thing in data-v)
        const seen = d.hit.v && this.svg.querySelector(`[data-vof="${d.hit.v}"]`); (seen || d.el).setAttribute("opacity", ".25");
      }
      if (d.moving) { e.preventDefault(); this.dragSvg.innerHTML = this.kind.ghost(this, d.hit, x, y); }
    }
    onUp(e) {
      const d = this.drag; if (!d || d.id !== e.pointerId) return;
      this.drag = null; this.dragSvg.innerHTML = "";
      try { this.svg.releasePointerCapture(e.pointerId); } catch (err) { /* already released */ }
      if (e.type === "pointercancel") { this.render(); return; }
      const [x, y] = this.point(e);
      if (d.moving) this.kind.drop(this, d.hit, x, y);
      else if (Math.hypot(x - d.x0, y - d.y0) < 14) this.kind.tap(this, d.hit);
      this.changed();
    }
    setTeaching(on) { // the lesson drives the picture, so no start-again or tick button
      this.teaching = on; this.resetBtn.style.display = on ? "none" : "";
      if (this.modeBtn) { this.modeBtn.style.display = on ? "none" : ""; if (this.st) this.st.tick = false; }
      // When the lesson ends, its last step must not stay behind: a left-over step with no target refused every
      // tap on "Which is more" ("Colour the pie on the blue plate."). After the lesson the picture is hers again.
      if (!on && this.st) this.st.teach = null;
      this.render();
    }
    shake() { this.svg.classList.remove("fr-shake"); void this.svg.getBoundingClientRect(); this.svg.classList.add("fr-shake"); }
    destroy() {
      if (this.dead) return; this.dead = true;
      if (this.ro) this.ro.disconnect();
      this.check(); // settles any lesson that is waiting
      if (this.root.parentNode) this.root.parentNode.removeChild(this.root);
      if (LIVE.get(this.el) === this) LIVE.delete(this.el);
    }
  }
  function mountStage(el, Q, api) {
    const old = LIVE.get(el); if (old) old.destroy();
    const s = new Stage(el, Q, api); LIVE.set(el, s); return s;
  }
  function stageFor(el, Q, api) {
    const s = LIVE.get(el);
    if (s && !s.dead && s.Q && s.Q.key === Q.key) { s.api = api || s.api; return s; }
    return mountStage(el, Q, api);
  }
  // Lesson helper for a counting step of `total` taps: Kitty shows the first tap or two, then it is Marie's turn.
  function countStep(s, info, say, total, pred) {
    const k = demoFor(s, total);
    const tail = k > 0 ? "" : " Your turn."; // short (small phones), and no number words: "one" could be part of the answer
    return step(s, Object.assign({ demo: k, total }, info), say + tail, pred);
  }
  // Lesson helper: set a step, then wait until Marie has done it. Returns false if the picture was taken away.
  async function step(s, info, say, pred) {
    if (s.dead) return false;
    s.st.teach = Object.assign({ step: (s.st.teach ? s.st.teach.step : 0) + 1 }, info);
    s.lastHi = null; s.changed();
    if (say) s.say(say);
    return pred ? s.waitFor(pred) : true;
  }
  const pause = (s, ms) => sleep(ms).then(() => !s.dead);

  /* ================= Picture kinds ================= */
  const KINDS = {};

  /* ---- equal: two shapes, one cut fair. Tap a part to lay a copy of it over every other part. ---- */
  KINDS.equal = {
    label: Q => `Two ${Q.data.shape === "bar" ? "chocolate bars" : "pies"}, one on a pink plate and one on a blue plate.`,
    init: Q => ({ sel: null }),
    layout(s, W, H) {
      // Side by side, or one above the other: take the way where the thinnest part is biggest.
      const D = s.Q.data, thin = D.shape === "bar" ? Math.min(...D.shapes.map(sh => Math.min(...sh.spans) / sh.spans.reduce((a, b) => a + b, 0))) : 0;
      const make = wideAt => {
        const { wide, cells } = splitBox(W, H, 2, RESERVE, wideAt);
        const out = cells.map(c => {
          if (D.shape === "pie") { const R = Math.max(30, Math.min(c.w, c.h) / 2 - 8); return { ...c, cx: c.x + c.w / 2, cy: c.y + c.h / 2 - 2, R, r: R * .86 }; }
          // In a short box (a phone, with a long sentence from Kitty) the frame round the bar gets thinner,
          // so the bar itself stays at least 44px tall when it can.
          const pad = Math.max(8, Math.min(14, (c.h - 50) / 2)), w = Math.min(c.w - 2 * pad - 6, 440), h = Math.min(c.h - 2 * pad - 8, w * .42, 130);
          return { ...c, pad, bx: c.x + (c.w - w) / 2, by: c.y + (c.h - h) / 2 - 3, bw: w, bh: h };
        });
        const c = out[0], score = D.shape === "pie" ? c.R : Math.min(c.bw * thin, c.bh);
        return { wide, cells: out, score };
      };
      const a = make(0), b = make(1e9); // always side by side; always one above the other
      const pref = W >= H * 1.05 ? a : b; // the old rule wins unless the other way is clearly better
      const other = pref === a ? b : a;
      return Math.min(other.score, 46) > Math.min(pref.score, 46) + 1 ? other : pref;
    },
    draw(s, L) {
      const Q = s.Q, out = [];
      Q.data.shapes.forEach((sh, k) => {
        const c = L.cells[k], tint = sh.plate === "pink" ? C.pinkTint : C.skyTint, sel = s.st.sel && s.st.sel.s === k ? s.st.sel.i : -1;
        const glowAll = s.st.teach && s.st.teach.target === k;
        if (Q.data.shape === "pie") {
          let g = plate(c.cx, c.cy, c.R, tint);
          g += pieSlices(c.cx, c.cy, c.r, { hitR: c.R + 4, key: `s${k}_`, spans: sh.spans, rot: sh.rot, fillOf: i => (i === sel ? C.pink : C.cream), hit: i => `data-hit="part" data-s="${k}" data-i="${i}"`, glow: () => glowAll });
          if (sel >= 0) { // copies of the chosen slice laid over the others
            const starts = spanStarts(sh.spans, sh.rot);
            sh.spans.forEach((sp, i) => { if (i !== sel) g += `<path d="${wedge(c.cx, c.cy, c.r, starts[i], starts[i] + sh.spans[sel])}" fill="${C.pink}" fill-opacity=".3" stroke="${C.pinkDeep}" stroke-width="3" stroke-dasharray="7 5" stroke-linejoin="round" pointer-events="none"/>`; });
          }
          out.push(`<g data-shape="${k}" data-fair="${sh.fair ? 1 : 0}" ${glowAll ? "data-glow-root" : ""}>${g}</g>`);
        } else {
          let g = `<rect x="${r2(c.bx - c.pad)}" y="${r2(c.by - c.pad)}" width="${r2(c.bw + 2 * c.pad)}" height="${r2(c.bh + 2 * c.pad)}" rx="${r2(c.pad + 6)}" fill="${C.ink}" transform="translate(0 4)"/><rect x="${r2(c.bx - c.pad)}" y="${r2(c.by - c.pad)}" width="${r2(c.bw + 2 * c.pad)}" height="${r2(c.bh + 2 * c.pad)}" rx="${r2(c.pad + 6)}" fill="${tint}" stroke="${C.ink}" stroke-width="3"/>`;
          g += barPieces(c.bx, c.by, c.bw, c.bh, { widths: sh.spans, fillOf: i => (i === sel ? C.pink : C.choc), hit: i => `data-hit="part" data-s="${k}" data-i="${i}"`, glow: () => glowAll });
          if (sel >= 0) {
            const tot = sh.spans.reduce((a, b) => a + b, 0); let x = c.bx; const ws = sh.spans.map(w => w / tot * c.bw);
            ws.forEach((w, i) => { if (i !== sel) g += `<rect x="${r2(x)}" y="${r2(c.by)}" width="${r2(ws[sel])}" height="${r2(c.bh)}" fill="${C.pink}" fill-opacity=".35" stroke="${C.pinkDeep}" stroke-width="3" stroke-dasharray="7 5" pointer-events="none"/>`; x += w; });
          }
          out.push(`<g data-shape="${k}" data-fair="${sh.fair ? 1 : 0}" ${glowAll ? "data-glow-root" : ""}>${g}</g>`);
        }
      });
      return out.join("");
    },
    tap(s, hit) {
      const k = +hit.s, i = +hit.i;
      if (s.st.teach && s.st.teach.target !== undefined && s.st.teach.target !== k) { s.tone([330], .15, "triangle"); s.say(`Tap a part on the ${s.Q.data.shapes[s.st.teach.target].plate === "pink" ? "pink" : "blue"} plate.`); return; }
      s.st.sel = { s: k, i }; s.st.tapped = s.st.tapped || {}; s.st.tapped[k] = true; s.tone([620, 700], .07);
    },
  };

  /* ---- name / colour: one pie or bar. Tap to count (badges) or tap to colour. ---- */
  KINDS.name = {
    // The label never gives the number of parts: on "What part is pink?" that number is the bottom of the answer.
    label: Q => `A ${Q.data.shape === "bar" ? "chocolate bar" : "pie"} cut in equal parts.${Q.data.colour ? "" : " Some parts are pink."}`,
    init: Q => ({ user: new Set(), badges: new Map(), count: 0, tick: false }),
    tickButton: Q => !!Q.data.colour,
    layout(s, W, H) {
      const wide = W >= H;
      if (s.Q.data.shape === "pie") {
        const box = wide ? { x: 8 + RESERVE, y: 8, w: W - 16 - RESERVE * 2, h: H - 16 } : { x: 8, y: 8 + RESERVE, w: W - 16, h: H - 16 - RESERVE };
        const R = Math.min(box.w, box.h) / 2 - 4; return { cx: box.x + box.w / 2, cy: box.y + box.h / 2 - 2, R, r: R * .86, tickAt: wide ? "below" : "left" };
      }
      // A bar uses the full width; its height stays clear of the start-again button in the corner.
      const box = { x: 8, y: 8, w: W - 16, h: H - 16 }, n = s.Q.data.d, tall = H > W * 1.15;
      // A bar of 6 may be one row of 6 or two rows of 3 (a chocolate grid). Take the shape with the bigger pieces.
      const grids = n === 6 ? [[1, 6], [2, 3]] : [barGrid(n)];
      // Three ways to keep clear of the buttons in the top-right corner: margins at both sides (centred), sitting
      // below them, or sitting at the left beside the column of buttons (the frame may tuck under a button's edge).
      // A piece is never thinner than 46px when the box has room for that, so each part is easy to tap.
      const ways = [{ aw: W - 2 * (RESERVE + 26), ah: H - 46, pad: 14, at: "centre" }, { aw: box.w - 36, ah: H - RESERVE - 46, pad: 14, at: "below" },
        { aw: W - 8 - 2 * 10 - (RESERVE - 4), ah: H - 16 - 2 * 10 - 6, pad: 10, at: "left" }];
      let best = null;
      for (const [rows, cols] of grids) {
        const aspect = rows === 1 ? (tall ? 1.9 : 1.25) : (tall ? 1.2 : .85);
        for (const w of ways) {
          const pw = Math.min(w.aw / cols, w.ah / (rows * aspect), Math.min(170, Math.max(124, 480 / cols))); // short bars may grow on big screens
          const ph = Math.min(Math.max(pw * aspect, 46), w.ah / rows), score = Math.min(pw, ph);
          if (!best || score > best.score + .5) best = { rows, cols, pw, ph, ...w, score };
        }
      }
      const bw = best.pw * best.cols, bh = best.ph * best.rows;
      const top = best.at === "below" ? RESERVE + 8 : box.y, room = box.y + box.h - top;
      const bx = best.at === "left" ? 8 + best.pad : box.x + (box.w - bw) / 2;
      return { bx, by: top + (room - bh) / 2 - 2, bw, bh, pad: best.pad, grid: [best.rows, best.cols], tickAt: best.at === "below" ? "left" : "below" };
    },
    isOn(s, i) { return s.Q.data.shaded.includes(i) || s.st.user.has(i); },
    draw(s, L) {
      const D = s.Q.data, st = s.st, T = st.teach;
      const glow = i => !!T && (T.target === "all" ? !st.badges.has(i) : T.target === "pink" ? KINDS.name.isOn(s, i) && !st.badges.has(i) : T.target === "plain" ? !KINDS.name.isOn(s, i) && !st.badges.has(i) : T.target === "colour" ? !KINDS.name.isOn(s, i) && st.user.size < D.a : false);
      const opts = { fillOf: i => (KINDS.name.isOn(s, i) ? C.pink : D.shape === "bar" ? C.choc : C.cream), hit: i => `data-hit="part" data-i="${i}"`, badges: st.badges, glow, pop: i => st.popped === i };
      if (D.shape === "pie") return `<g data-shape="0" data-glow-root>${plate(L.cx, L.cy, L.R)}${pieSlices(L.cx, L.cy, L.r, { ...opts, hitR: L.R + 4, spans: equalSpans(D.d), rot: D.rot })}</g>`;
      return `<g data-shape="0" data-glow-root><rect x="${r2(L.bx - L.pad)}" y="${r2(L.by - L.pad)}" width="${r2(L.bw + 2 * L.pad)}" height="${r2(L.bh + 2 * L.pad)}" rx="${L.pad + 6}" fill="${C.ink}" transform="translate(0 4)"/><rect x="${r2(L.bx - L.pad)}" y="${r2(L.by - L.pad)}" width="${r2(L.bw + 2 * L.pad)}" height="${r2(L.bh + 2 * L.pad)}" rx="${L.pad + 6}" fill="${C.paper}" stroke="${C.ink}" stroke-width="3"/>${barPieces(L.bx, L.by, L.bw, L.bh, { ...opts, n: D.d, grid: L.grid })}</g>`;
    },
    tap(s, hit) {
      const i = +hit.i, st = s.st, D = s.Q.data, mode = s.teaching && st.teach ? st.teach.mode : D.colour && !st.tick ? "colour" : "count";
      if (mode === "colour") {
        if (D.shaded.includes(i)) return;
        if (st.user.has(i)) { st.user.delete(i); s.tone([480], .07); }
        else { st.user.add(i); st.popped = i; s.tone([620, 760], .07); }
        return;
      }
      if (mode === "pink" && !KINDS.name.isOn(s, i)) { s.tone([330], .15, "triangle"); s.say("Count only the pink parts."); return; }
      if (mode === "plain" && KINDS.name.isOn(s, i)) { s.tone([330], .15, "triangle"); s.say("Count only the parts that are not pink."); return; }
      markTap(s, i);
    },
  };

  /* ---- whole: an empty plate with dashed slots, and a tray of slices to drag in. ---- */
  KINDS.whole = {
    label: Q => `A pie plate with room for ${Q.data.d} slices, and a tray of slices.`,
    init(Q) {
      // The plate always starts EMPTY. Marie puts every slice on it herself, also the pink slices the question
      // gives her (the first D.given slices in the tray). A plate that starts with the given part on it would
      // already show the gap, which is the answer (father's rule, 2026-10-15).
      const D = Q.data, slots = Array.from({ length: D.d }, () => null);
      return { slots, tray: D.tray.map((fill, id) => ({ id, fill, given: id < (D.given || 0), on: -1 })), badges: new Map(), count: 0 };
    },
    full: st => st.slots.every(Boolean),
    // On "Half and half" and "Whole yet?" a full plate IS the answer, so the plate never glows there: she looks
    // for a gap herself. Where a part is given, the glow only says the pie is built; she still counts the new slices.
    showFull: (s, st) => !!s.Q.data.given && KINDS.whole.full(st),
    layout(s, W, H) {
      const D = s.Q.data, n = D.tray.length, th = 360 / D.d;
      const box = { x: 8, y: 8, w: W - 16, h: H - 16 };
      // Each tray slice sits in its own square cell, and the whole cell is its tap area. The slots on the plate
      // can be tapped out to the plate's rim. Try plate-beside-tray and plate-above-tray, with several splits,
      // and take the one where the smallest tap area (a tray cell or a slot) is biggest; then the bigger plate.
      const ww = 2 * Math.sin(Math.min(90, th / 2) * Math.PI / 180); // a tray wedge's width, in units of its length
      const slotSide = Math.sin(Math.min(th, 90) * Math.PI / 180); // narrow side of one slot, in units of the plate radius
      const trayFit = ta => { let b = null; for (let cols = 1; cols <= n; cols++) { const rows = Math.ceil(n / cols), cell = Math.min((ta.w - 12) / cols, (ta.h - 12) / rows, 96); if (!b || cell > b.cell) b = { cols, rows, cell }; } return b; };
      let best = null;
      // Third way (short phone box): tray at the left, full height; plate at the right, below the start-again button.
      for (const wide of [true, false, "trayLeft"]) for (let f = .4; f <= .7001; f += .02) {
        let pa, ta;
        if (wide === "trayLeft") { ta = { x: box.x, y: box.y, w: box.w * (1 - f) - 6, h: box.h }; pa = { x: box.x + box.w * (1 - f), y: box.y + RESERVE, w: box.w * f, h: box.h - RESERVE }; }
        else if (wide) { pa = { x: box.x, y: box.y, w: box.w * f, h: box.h }; ta = { x: box.x + box.w * f + 6, y: box.y + RESERVE, w: box.w * (1 - f) - 6, h: box.h - RESERVE }; }
        else { const ph = box.h * f; pa = { x: box.x, y: box.y, w: box.w - RESERVE, h: ph }; ta = { x: box.x, y: box.y + ph + 6, w: box.w, h: box.h - ph - 6 }; }
        if (ta.w < 40 || ta.h < 40) continue;
        const R = Math.max(40, Math.min(pa.w, pa.h) / 2 - 6), tf = trayFit(ta), score = Math.min(tf.cell, (R + 4) * slotSide, 52) * 1000 + R;
        if (!best || score > best.score) best = { score, pa, ta, R, tf };
      }
      const { pa, ta, R, tf } = best, r = R * .86, cx = pa.x + pa.w / 2, cy = pa.y + pa.h / 2 - 2;
      // Tray wedges point up, as big as fits in a cell (never bigger than a slice on the plate).
      const cell = tf.cell, pr = Math.min(r, cell * .82, cell * .82 / ww);
      const gx = ta.x + (ta.w - tf.cols * cell) / 2, gy = ta.y + (ta.h - tf.rows * cell) / 2;
      const spots = Array.from({ length: n }, (_, i) => { const x = gx + (i % tf.cols) * cell, y = gy + Math.floor(i / tf.cols) * cell; return { x: x + cell / 2, y: y + cell / 2 + pr * .5, cell: { x, y, sz: cell } }; });
      return { cx, cy, R, r, ta: { x: Math.max(box.x, gx - 8), y: gy - 8, w: Math.min(box.w, tf.cols * cell + 16), h: tf.rows * cell + 16 }, pr, spots, th };
    },
    pieceAt(x, y, r, th, fill, attrs, pop) {
      // A wedge pointing up whose tip is at (x, y).
      const a = Math.min(th, 359.9);
      return `<path class="fr-slice${pop ? " fr-pop" : ""}" d="${wedge(x, y, r, -a / 2, a / 2)}" fill="${fill}" ${STROKE} ${attrs}/>`;
    },
    draw(s, L) {
      const D = s.Q.data, st = s.st, T = st.teach, full = KINDS.whole.showFull(s, st);
      let out = "";
      // The tray
      out += `<rect x="${r2(L.ta.x)}" y="${r2(L.ta.y + 5)}" width="${r2(L.ta.w)}" height="${r2(L.ta.h)}" rx="22" fill="${C.ink}"/><rect x="${r2(L.ta.x)}" y="${r2(L.ta.y)}" width="${r2(L.ta.w)}" height="${r2(L.ta.h)}" rx="22" fill="#ffe9c2" stroke="${C.ink}" stroke-width="3"/>`;
      st.tray.forEach((p, k) => {
        const sp = L.spots[k], trayGlow = !!T && (T.target === "tray" || (T.target === "pinktray" && p.given));
        if (p.on >= 0) { out += `<path d="${wedge(sp.x, sp.y, L.pr, -Math.min(L.th, 359.9) / 2, Math.min(L.th, 359.9) / 2)}" fill="none" stroke="${C.ink}" stroke-opacity=".18" stroke-width="2" stroke-dasharray="5 5"/>`; return; }
        if (trayGlow) out += `<path class="fr-pulse" d="${wedge(sp.x, sp.y, L.pr, -L.th / 2, L.th / 2)}" fill="none" stroke="${C.sun}" stroke-width="12" stroke-linejoin="round"/>`;
        // The whole square cell is the slice's tap area; the drawn wedge sits in it.
        out += `<g data-hit="piece" data-drag="1" data-id="${p.id}" data-tray="1" fill="${p.fill}"${trayGlow ? ' data-glow="1"' : ""}><rect x="${r2(sp.cell.x)}" y="${r2(sp.cell.y)}" width="${r2(sp.cell.sz)}" height="${r2(sp.cell.sz)}" fill="transparent"/>${KINDS.whole.pieceAt(sp.x, sp.y, L.pr, L.th, p.fill, "")}</g>`;
      });
      // The plate and the pie
      out += `<g data-plate="1" data-glow-root>${plate(L.cx, L.cy, L.R, full ? "#fff4c8" : C.paper)}`;
      if (full) out += `<circle class="fr-pulse" cx="${r2(L.cx)}" cy="${r2(L.cy)}" r="${r2(L.R + 4)}" fill="none" stroke="${C.sun}" stroke-width="9"/>`;
      const glow = i => !!T && ((T.target === "slots" && !st.badges.has(i)) || (T.target === "given" && st.slots[i] && st.slots[i].given && !st.badges.has(i)) || (T.target === "new" && st.slots[i] && !st.slots[i].given && !st.badges.has(i)) || ((T.target === "tray" || T.target === "pinktray") && !st.slots[i]));
      out += pieSlices(L.cx, L.cy, L.r, {
        hitR: L.R + 4, spans: equalSpans(D.d), rot: 0, fillOf: i => st.slots[i].fill, dashed: i => !st.slots[i],
        hit: i => `data-hit="slot" data-i="${i}" ${st.slots[i] ? 'data-drag="1"' : ""} data-filled="${st.slots[i] ? 1 : 0}" data-given="${st.slots[i] && st.slots[i].given ? 1 : 0}"`,
        badges: st.badges, glow, pop: i => st.popped === i,
      });
      if (full) out += [0, 72, 144, 216, 288].map(a => { const [x, y] = pt(L.cx, L.cy, L.R + 14, a + 20); return `<path class="fr-pop" d="M${r2(x)} ${r2(y - 9)}l3 6 6 3-6 3-3 6-3-6-6-3 6-3z" fill="${C.sun}" stroke="${C.ink}" stroke-width="2"/>`; }).join("");
      return out + `</g>`;
    },
    canDrag(s, hit) {
      const T = s.st.teach;
      if (!T || !T.target || T.target === "tray") return true;
      if (T.target === "pinktray") return !!hit.tray; // a non-pink slice may move, and is sent back on drop
      return false;
    },
    // Pink first: while a pink (given) slice waits in the tray, other slices cannot go on the plate.
    // Otherwise the other colour alone could fill the plate and it would glow for a wrong pie.
    pinkFirst(s, id) {
      const st = s.st, p = st.tray[id];
      if (!p || p.given || !st.tray.some(q => q.given && q.on < 0)) return false;
      s.tone([330], .15, "triangle"); s.shake(); s.say("Pink slices first."); return true;
    },
    ghost(s, hit, x, y) {
      const L = s.L, fill = hit.tray ? s.st.tray[+hit.id].fill : s.st.slots[+hit.i].fill;
      return `<g opacity=".92">${KINDS.whole.pieceAt(x, y + L.r * .5, L.r, L.th, fill, "")}</g>`;
    },
    nearestEmpty(s, x, y) {
      const L = s.L, st = s.st; let ang = Math.atan2(x - L.cx, -(y - L.cy)) * 180 / Math.PI; if (ang < 0) ang += 360;
      let best = -1, bd = 1e9;
      st.slots.forEach((v, i) => { if (v) return; const mid = (i + .5) * L.th; let dd = Math.abs(mid - ang) % 360; dd = Math.min(dd, 360 - dd); if (dd < bd) { bd = dd; best = i; } });
      return best;
    },
    place(s, piece, slot) { s.st.slots[slot] = { fill: piece.fill, piece: piece.id, given: piece.given }; piece.on = slot; s.st.popped = slot; s.tone(KINDS.whole.showFull(s, s.st) ? [523, 659, 784, 1047] : [600, 760], .09); },
    // Taking a slice off clears her count, so the numbers on the plate always match what is there.
    unplace(s, slot) { const v = s.st.slots[slot]; if (!v) return; s.st.tray[v.piece].on = -1; s.st.slots[slot] = null; s.st.badges.clear(); s.st.count = 0; s.tone([500, 400], .07); },
    drop(s, hit, x, y) {
      const L = s.L, st = s.st, onPlate = Math.hypot(x - L.cx, y - L.cy) <= L.R * 1.2;
      if (hit.tray) {
        if (!onPlate) return;
        if (KINDS.whole.pinkFirst(s, +hit.id)) return;
        const slot = KINDS.whole.nearestEmpty(s, x, y);
        if (slot < 0) { s.tone([330], .15, "triangle"); s.shake(); return; }
        KINDS.whole.place(s, st.tray[+hit.id], slot);
      } else if (hit.hit === "slot" && !onPlate) KINDS.whole.unplace(s, +hit.i);
    },
    tap(s, hit) {
      const st = s.st, T = st.teach;
      if (T && T.mode === "count") {
        if (hit.hit !== "slot") return;
        const i = +hit.i, v = st.slots[i];
        const ok = T.target === "slots" || (T.target === "given" && v && v.given) || (T.target === "new" && v && !v.given);
        if (!ok) { s.tone([330], .15, "triangle"); return; }
        if (st.badges.has(i)) return;
        markTap(s, i); return;
      }
      if (hit.tray) { // tap a slice in the tray to put it on the plate
        if (KINDS.whole.pinkFirst(s, +hit.id)) return;
        const slot = st.slots.findIndex(v => !v);
        if (slot < 0) { s.tone([330], .15, "triangle"); s.shake(); return; }
        KINDS.whole.place(s, st.tray[+hit.id], slot);
        return;
      }
      // Tap a slice on the plate to tick it while she counts (a tick, never a number). A second tap takes the
      // tick off. A tap never takes her work away: to take a slice off, she drags it off the plate.
      if (hit.hit === "slot" && st.slots[+hit.i] && !(T && T.mode === "play")) markTap(s, +hit.i);
    },
  };

  /* ---- set: a group of things, some pink. Tap to count. ---- */
  KINDS.setname = {
    label: Q => `A group of ${ITEM_NAME[Q.data.item][1]}. Some are pink.`, // never the number: it is the bottom of the answer
    init: () => ({ badges: new Map(), count: 0 }),
    layout(s, W, H) {
      // Up to 5 things: the biggest grid. More than 5: groups of 5, as rows of 5 (wide box) or columns of 5
      // (tall box), so she can count them by eye. No numbers appear while she counts.
      const n = s.Q.data.n, box = { x: 10, y: 10 + RESERVE * .2, w: W - 20 - RESERVE, h: H - 20 - RESERVE * .2 };
      let best = null;
      const tries = n <= 5 ? Array.from({ length: n }, (_, k) => [k + 1, Math.ceil(n / (k + 1)), false]) : [[5, Math.ceil(n / 5), false], [Math.ceil(n / 5), 5, true]];
      for (const [cols, rows, byCol] of tries) { const sz = Math.min(box.w / cols, box.h / rows, 150); if (!best || sz >= best.sz - .5) best = { cols, rows, sz, byCol }; }
      const gx = box.x + (box.w - best.cols * best.sz) / 2, gy = box.y + (box.h - best.rows * best.sz) / 2;
      if (best.byCol) return { cells: Array.from({ length: n }, (_, i) => ({ x: gx + Math.floor(i / 5) * best.sz, y: gy + (i % 5) * best.sz, sz: best.sz })) };
      return { cells: Array.from({ length: n }, (_, i) => { const row = Math.floor(i / best.cols), inRow = Math.min(best.cols, n - row * best.cols), off = n <= 5 ? (best.cols - inRow) * best.sz / 2 : 0; return { x: gx + off + (i % best.cols) * best.sz, y: gy + row * best.sz, sz: best.sz }; }) };
    },
    draw(s, L) {
      const D = s.Q.data, st = s.st, T = st.teach;
      return `<g data-glow-root>` + L.cells.map((c, i) => {
        const pinkOne = D.pink.includes(i), pad = c.sz * .08, glow = T && !st.badges.has(i) && (T.target === "all" || (T.target === "pink" && pinkOne));
        return `<g data-hit="item" data-i="${i}" data-pink="${pinkOne ? 1 : 0}"${glow ? ' data-glow="1"' : ""}>${glow ? `<circle class="fr-pulse" cx="${r2(c.x + c.sz / 2)}" cy="${r2(c.y + c.sz / 2)}" r="${r2(c.sz * .47)}" fill="${C.sun}" fill-opacity=".45"/>` : ""}<rect x="${r2(c.x)}" y="${r2(c.y)}" width="${r2(c.sz)}" height="${r2(c.sz)}" fill="transparent"/>${itemSVG(D.item, pinkOne ? C.pink : D.other, c.x + pad, c.y + pad, c.sz - 2 * pad)}${st.badges.has(i) ? mark(c.x + c.sz * .82, c.y + c.sz * .2, Math.max(8, Math.min(15, c.sz * .17))) : ""}</g>`;
      }).join("") + `</g>`;
    },
    tap(s, hit) {
      const i = +hit.i, st = s.st, T = st.teach;
      if (s.teaching && T && T.target === "pink" && !s.Q.data.pink.includes(i)) { s.tone([330], .15, "triangle"); s.say("Count only the pink ones."); return; }
      markTap(s, i);
    },
  };

  /* ---- share: a pile of treats and 2-4 friends' plates. Drag (or tap a plate) to share. ---- */
  const FRIENDS = ["kitty", "melody", "kuromi", "purin", "cinna"];
  KINDS.share = {
    label: Q => `${Q.data.n} ${ITEM_NAME[Q.data.item][1]} and ${Q.data.k} plates.`,
    init: Q => ({ pile: Array.from({ length: Q.data.n }, (_, i) => i), plates: Array.from({ length: Q.data.k }, () => []), badges: new Map(), count: 0 }),
    layout(s, W, H) {
      const D = s.Q.data, st = s.st, per = D.n / D.k, box = { x: 8, y: 8, w: W - 16, h: H - 16 };
      let pileA = null, areas;
      if (st.pile.length) {
        const wide = W >= H * (D.k >= 3 || D.n > 6 ? 1.6 : 1.15); // 3-4 plates or many treats need the full width unless the box is very wide
        if (wide) { pileA = { x: box.x, y: box.y + RESERVE, w: box.w * .36, h: box.h - RESERVE }; areas = [{ x: box.x + box.w * .36 + 8, y: box.y, w: box.w * .64 - 8 - RESERVE, h: box.h }]; }
        else { // more treats, more room for the pile; the plates only need to be big enough to tap while sharing
          const ph = Math.max(58, box.h * (D.n > 8 ? .5 : D.n > 6 ? .46 : .4)); pileA = { x: box.x, y: box.y, w: box.w - RESERVE, h: ph }; areas = [{ x: box.x, y: box.y + ph + 8, w: box.w, h: box.h - ph - 8 }];
        }
      } else {
        // All shared: the pile is gone, so the plates take the whole picture. Then each treat is big enough to
        // tap and tick while she counts. Keep clear of the start-again button: room at the right, or at the top.
        areas = [{ x: box.x, y: box.y, w: box.w - RESERVE, h: box.h }, { x: box.x, y: box.y + RESERVE, w: box.w, h: box.h - RESERVE }];
      }
      // Plates: try every row-and-column shape in every area, and take the one with the biggest treats.
      let pg = null;
      for (const A of areas) for (let cols = 1; cols <= D.k; cols++) {
        const rows = Math.ceil(D.k / cols), cw = A.w / cols, ch = A.h / rows;
        if (cw < 50 || ch < 50) continue;
        const g = KINDS.share.plateGeom({ x: 0, y: 0, w: cw - 6, h: ch - 6 }, per);
        // Biggest treats first; when the treats are the same (big screens), the shape with the bigger friend's face.
        const score = Math.round(Math.min(g.fit.sz, 60)) * 100 + g.face;
        if (!pg || score > pg.score) pg = { A, cols, rows, cw, ch, sz: g.fit.sz, score };
      }
      if (!pg) { const A = areas[0]; pg = { A, cols: D.k, rows: 1, cw: A.w / D.k, ch: A.h }; } // a very small box: plates in one row
      const plates = Array.from({ length: D.k }, (_, i) => {
        const col = i % pg.cols, row = Math.floor(i / pg.cols), p = { x: pg.A.x + col * pg.cw + 3, y: pg.A.y + row * pg.ch + 3, w: pg.cw - 6, h: pg.ch - 6 };
        return Object.assign(p, { g: KINDS.share.plateGeom(p, per) });
      });
      // Pile grid (only while treats are left to share). The whole pile box is a tap area too: every treat in
      // the pile is the same, so a touch anywhere in the box picks one up.
      let pileSpots = [], pb = { cols: 1, rows: 1, sz: 40 };
      if (pileA) {
        pb = null;
        for (let cols = 1; cols <= D.n; cols++) { const rows = Math.ceil(D.n / cols), sz = Math.min((pileA.w - 20) / cols, (pileA.h - 20) / rows, 64); if (!pb || sz > pb.sz) pb = { cols, rows, sz }; }
        const pgx = pileA.x + (pileA.w - pb.cols * pb.sz) / 2, pgy = pileA.y + (pileA.h - pb.rows * pb.sz) / 2;
        pileSpots = Array.from({ length: D.n }, (_, i) => ({ x: pgx + (i % pb.cols) * pb.sz, y: pgy + Math.floor(i / pb.cols) * pb.sz, sz: pb.sz }));
        pileA = { x: pgx - 10, y: pgy - 10, w: pb.cols * pb.sz + 20, h: pb.rows * pb.sz + 20 };
      }
      return { pileA, pileSpots, plates, isz: pb.sz };
    },
    gridFit(g, m) {
      let b = null;
      const n = Math.max(1, m);
      for (let cols = 1; cols <= n; cols++) { const rows = Math.ceil(n / cols), sz = Math.max(4, Math.min(g.w / cols, g.h / rows, 76)); if (!b || sz > b.sz) b = { cols, rows, sz }; }
      return b;
    },
    plateGeom(p, per) {
      // A plate is a rounded square mat. The friend's face peeps over its top edge, or over its left edge when
      // the plate is wide and short. The face may shrink (down to 22px) to leave room for the treats. Take the
      // way with the biggest treats for one fair share; with equal treats, the bigger face.
      let best = null;
      // Treats bigger than 60px gain nothing more, so on a big screen the face may grow instead.
      const sc = w => Math.round(Math.min(w.fit.sz, 60)) * 100 + w.face;
      const consider = w => { w.fit = KINDS.share.gridFit(w.grid, per); if (!best || sc(w) > sc(best)) best = w; };
      for (const f of [40, 34, 28, 22]) {
        const f1 = Math.max(22, Math.min(f, p.h * .3, p.w * .5)), mat1 = { x: p.x, y: p.y + f1 * .5, w: p.w, h: p.h - f1 * .5 };
        consider({ face: f1, fx: p.x + p.w / 2 - f1 / 2, fy: p.y, mat: mat1, grid: { x: mat1.x + 4, y: mat1.y + f1 * .5 + 2, w: mat1.w - 8, h: mat1.h - f1 * .5 - 6 } });
        if (p.w > p.h * 1.5) {
          const f2 = Math.max(22, Math.min(f, p.h * .6, p.w * .2)), mat2 = { x: p.x + f2 * .5, y: p.y, w: p.w - f2 * .5, h: p.h };
          consider({ face: f2, fx: p.x, fy: p.y + p.h / 2 - f2 / 2, mat: mat2, grid: { x: mat2.x + f2 * .5 + 2, y: mat2.y + 4, w: mat2.w - f2 * .5 - 6, h: mat2.h - 8 } });
        }
      }
      return best;
    },
    plateSpots(p, m, per) {
      // Spots for m treats on a plate. Up to a fair share the spots never move, so each treat lands where it stays.
      const g = p.g.grid, fit = m <= per ? p.g.fit : KINDS.share.gridFit(g, m);
      const gx = g.x + (g.w - fit.cols * fit.sz) / 2, gy = g.y + (g.h - fit.rows * fit.sz) / 2;
      return Array.from({ length: m }, (_, i) => ({ x: gx + (i % fit.cols) * fit.sz, y: gy + Math.floor(i / fit.cols) * fit.sz, sz: fit.sz }));
    },
    faceSVG(s, id, x, y, sz) {
      let f = ""; try { f = s.api.face ? s.api.face(id) : ""; } catch (e) { f = ""; }
      if (!f) return "";
      const inner = /^\s*<svg/i.test(f) ? f.replace(/^\s*<svg[^>]*>/i, "").replace(/<\/svg>\s*$/i, "") : f;
      return `<g transform="translate(${r2(x)} ${r2(y)}) scale(${r2(sz / 100)})" pointer-events="none">${inner}</g>`;
    },
    draw(s, L) {
      const D = s.Q.data, st = s.st, T = st.teach, per = D.n / D.k;
      const fair = !st.pile.length && st.plates.every(p => p.length === st.plates[0].length);
      let out = "";
      if (st.pile.length && L.pileA) {
        const A = L.pileA, top = st.pile[st.pile.length - 1];
        out += `<rect x="${r2(A.x)}" y="${r2(A.y + 5)}" width="${r2(A.w)}" height="${r2(A.h)}" rx="22" fill="${C.ink}"/><rect x="${r2(A.x)}" y="${r2(A.y)}" width="${r2(A.w)}" height="${r2(A.h)}" rx="22" fill="#ffe9c2" stroke="${C.ink}" stroke-width="3" data-hit="pilebox" data-drag="1" data-where="pile" data-id="${top}" data-v="t${top}"/>`;
        st.pile.forEach((id, k) => { const sp = L.pileSpots[k]; out += `<g data-hit="treat" data-drag="1" data-id="${id}" data-where="pile" data-vof="t${id}"><rect x="${r2(sp.x)}" y="${r2(sp.y)}" width="${r2(sp.sz)}" height="${r2(sp.sz)}" fill="transparent"/>${itemSVG(D.item, "", sp.x + 3, sp.y + 3, sp.sz - 6)}</g>`; });
      }
      L.plates.forEach((p, k) => {
        const glow = T && ((T.target === "plate" && T.plate === k) || (T.target === "count" && k === 0));
        const g = p.g, m = g.mat, rx = r2(Math.min(20, m.w * .2, m.h * .2));
        out += `<g data-hit="plate" data-k="${k}" data-count="${st.plates[k].length}" ${glow ? "data-glow-root" : ""}${T && T.target === "plate" && T.plate === k ? ' data-glow="1"' : ""}>`;
        if (glow) out += `<rect class="fr-pulse" x="${r2(m.x - 5)}" y="${r2(m.y - 5)}" width="${r2(m.w + 10)}" height="${r2(m.h + 10)}" rx="${r2(rx + 5)}" fill="none" stroke="${C.sun}" stroke-width="10"/>`;
        out += `<rect x="${r2(m.x)}" y="${r2(m.y + 5)}" width="${r2(m.w)}" height="${r2(m.h)}" rx="${rx}" fill="${C.ink}"/><rect data-plate-body="1" x="${r2(m.x)}" y="${r2(m.y)}" width="${r2(m.w)}" height="${r2(m.h)}" rx="${rx}" fill="${fair ? "#fff4c8" : C.paper}" stroke="${C.ink}" stroke-width="3"/><rect x="${r2(m.x + 6)}" y="${r2(m.y + 6)}" width="${r2(Math.max(4, m.w - 12))}" height="${r2(Math.max(4, m.h - 12))}" rx="${r2(Math.max(4, rx - 5))}" fill="none" stroke="${C.ink}" stroke-opacity=".12" stroke-width="2"/>`;
        // The friend's face is part of the plate: a tap on it (even its top half, above the mat) gives that friend a treat.
        out += `<rect data-face-hit="1" x="${r2(g.fx - 4)}" y="${r2(g.fy - 4)}" width="${r2(g.face + 8)}" height="${r2(g.face + 8)}" rx="${r2(g.face * .3)}" fill="transparent"/>`;
        out += KINDS.share.faceSVG(s, D.friends[k], g.fx, g.fy, g.face);
        const spots = KINDS.share.plateSpots(p, st.plates[k].length, per);
        // Each treat on a plate has its whole square cell as its tap area (a tick while she counts).
        st.plates[k].forEach((id, j) => { const sp = spots[j]; out += `<g data-hit="treat" data-drag="1" data-id="${id}" data-where="${k}"${st.popped === id ? ' class="fr-pop"' : ""}${T && T.target === "count" && k === 0 && !st.badges.has(id) ? ' data-glow="1"' : ""}><rect x="${r2(sp.x)}" y="${r2(sp.y)}" width="${r2(sp.sz)}" height="${r2(sp.sz)}" fill="transparent"/>${itemSVG(D.item, "", sp.x + sp.sz * .08, sp.y + sp.sz * .1, sp.sz * .8)}${st.badges.has(id) ? mark(sp.x + sp.sz * .84, sp.y + sp.sz * .18, Math.max(8, Math.min(13, sp.sz * .17))) : ""}</g>`; });
        out += `</g>`;
      });
      return out;
    },
    giveTo(s, k, id) {
      const st = s.st, T = st.teach;
      if (T && T.target === "plate" && T.plate !== k) { s.tone([330], .15, "triangle"); s.say(`Give it to the glowing plate.`); return false; }
      const at = id === undefined ? st.pile.length - 1 : st.pile.indexOf(id);
      if (at < 0) { s.tone([330], .15, "triangle"); return false; }
      const [tid] = st.pile.splice(at, 1); st.plates[k].push(tid); st.popped = tid;
      const fair = !st.pile.length && st.plates.every(p => p.length === st.plates[0].length);
      s.tone(fair ? [523, 659, 784, 1047] : [600 + k * 60], .08);
      if (T && T.target === "plate") T.plate = st.plates.reduce((b, p, i) => (p.length < st.plates[b].length ? i : b), 0);
      return true;
    },
    plateAt(s, x, y) { return s.L.plates.findIndex(p => x >= p.x - 6 && x <= p.x + p.w + 6 && y >= p.y - 6 && y <= p.y + p.h + 6); },
    canDrag(s, hit) { const T = s.st.teach; return !T || T.target === "plate" ? hit.where === "pile" || !T : false; },
    ghost(s, hit, x, y) { const pl = s.L.plates[+hit.where], sz = hit.where !== "pile" && pl ? pl.g.fit.sz * .8 : s.L.isz; return itemSVG(s.Q.data.item, "", x - sz / 2, y - sz / 2, sz); },
    drop(s, hit, x, y) {
      const st = s.st, k = KINDS.share.plateAt(s, x, y), id = +hit.id;
      if (hit.where === "pile") { if (k >= 0) KINDS.share.giveTo(s, k, id); return; }
      const from = +hit.where;
      if (k === from) return;
      st.badges.clear(); st.count = 0; // a treat moved, so count again
      st.plates[from] = st.plates[from].filter(t => t !== id);
      if (k >= 0) { st.plates[k].push(id); st.popped = id; s.tone([600], .07); } else { st.pile.push(id); s.tone([500, 400], .07); }
    },
    tap(s, hit) {
      const st = s.st, T = st.teach;
      if (T && T.target === "count") {
        if (hit.hit !== "treat" || hit.where !== "0") { s.tone([330], .15, "triangle"); return; }
        markTap(s, +hit.id); return;
      }
      if (hit.hit === "plate") { KINDS.share.giveTo(s, +hit.k); return; }
      if (hit.where === "pile") { // a treat in the pile, or the pile box itself
        if (T && T.target === "plate") { KINDS.share.giveTo(s, T.plate, +hit.id); return; }
        s.tone([330], .12, "triangle"); s.say("Drag it to a plate, or tap a plate."); return; // she chooses the plate herself
      }
      // While treats are left in the pile, a tap on a treat on a plate counts as a tap on that plate.
      // When the pile is empty, a tap on a treat ticks it while she counts (a tick, never a number). To take one back, drag it off.
      if (hit.hit === "treat" && st.pile.length) { KINDS.share.giveTo(s, +hit.where); return; }
      if (hit.hit === "treat" && hit.where !== "pile") markTap(s, +hit.id);
    },
  };

  /* ---- compare: two empty pies with their fractions. Tap slices to colour them. ---- */
  KINDS.compare = {
    label: Q => "Two pies to colour, on a pink plate and a blue plate.",
    init: Q => ({ user: [new Set(), new Set()] }),
    layout(s, W, H) {
      const make = reserve => {
        const { wide, cells } = splitBox(W, H, 2, reserve, 1.25); // labels need room, so go side by side only when clearly wide
        return { wide, cells: cells.map(c => {
          const fsize = Math.max(26, Math.min(40, (wide ? c.h : c.w) * .09)), lab = fsize * 1.5; // fraction label below (wide) or beside (stacked)
          const below = fsize * 2.35, aw = c.w - (wide ? 0 : lab), ah = c.h - (wide ? below : 0), R = Math.max(30, Math.min(aw, ah) / 2 - 6);
          const cx = wide ? c.x + c.w / 2 : c.x + c.w / 2 + lab / 2, cy = wide ? c.y + (c.h - (2 * R + below)) / 2 + R : c.y + c.h / 2;
          return { ...c, cx, cy, R, r: R * .86, fx: wide ? cx : cx - R - lab * .55, fy: wide ? cy + R + 8 + fsize * 1.2 : cy, fsize };
        }) };
      };
      let L = make(RESERVE);
      if (!L.wide) {
        // Stacked pies on a phone: the room kept for the start-again button makes the pies small (tenths become
        // hard to tap). Use the full height when the top pie still stays clear of the button in the corner.
        const big = make(0), c = big.cells[0];
        if (c.cx + c.R + 4 <= W - RESERVE - 6 || c.cy - c.R - 4 >= RESERVE + 6) L = big;
      }
      // On a phone-sized box, two pies corner to corner (top left and bottom right) can be much bigger than
      // side by side or one above the other. Each fraction sits in the empty corner beside its pie.
      const key = `${r2(W)}x${r2(H)}`; // the search is done once per box size, not on every tap
      if (!s.diag || s.diag.key !== key) s.diag = { key, L: KINDS.compare.diagonal(s, W, H) };
      const D = s.diag.L;
      return D && D.cells[0].R > L.cells[0].R * 1.06 ? D : L;
    },
    diagonal(s, W, H) {
      const box = { x: 8, y: 8, w: W - 16, h: H - 16 }, gap = 14, pies = s.Q.data.pies; // gap: the two tap areas (6px past each rim) never touch
      const fsize = 26, labW = p => fsize * (String(Math.max(p.a, p.d)).length > 1 ? 1.15 : .8) + 10;
      // A label box (centre x, y) must stay off both plates, off the start-again button and inside the box.
      const clearOf = (x, y, w, c1, c2, R) => {
        const l = x - w / 2, t = y - fsize * 1.05, rr = x + w / 2, b = y + fsize * .95;
        if (l < box.x || rr > box.x + box.w || t < box.y || b > box.y + box.h) return false;
        if (rr > W - RESERVE - 8 && t < RESERVE + 8) return false;
        for (const [cx, cy] of [c1, c2]) { const nx = Math.max(l, Math.min(cx, rr)), ny = Math.max(t, Math.min(cy, b)); if (Math.hypot(nx - cx, ny - cy) < R + 4) return false; }
        return true;
      };
      for (let R = Math.floor(Math.min(box.w, box.h) / 2); R >= 40; R -= 1) {
        if ((box.w - 2 * R) ** 2 + (box.h - 2 * R) ** 2 < (2 * R + gap) ** 2) continue;
        const c1 = [box.x + R, box.y + R], c2 = [box.x + box.w - R, box.y + box.h - R];
        const bx = Math.max(W - RESERVE - 8, Math.min(c2[0], W - 6)), by = Math.min(RESERVE + 8, Math.max(c2[1], 6));
        if (Math.hypot(bx - c2[0], by - c2[1]) < R + 4) continue; // the bottom-right plate must not reach the start-again button
        // Each fraction sits right next to its own pie: the first beside the top-left pie, the second beside the
        // bottom-right pie. A spot only counts when it is clearly nearer its own pie than the other pie.
        const find = (p, own, other) => {
          let b = null;
          for (let x = box.x; x <= box.x + box.w; x += 4) for (let y = box.y; y <= box.y + box.h; y += 4) {
            if (!clearOf(x, y, labW(p), c1, c2, R)) continue;
            const dOwn = Math.hypot(x - own[0], y - own[1]), dOther = Math.hypot(x - other[0], y - other[1]);
            if (dOwn > dOther - R * .6) continue;
            if (!b || dOwn < b[2]) b = [x, y, dOwn];
          }
          return b && [b[0], b[1]];
        };
        const f1 = find(pies[0], c1, c2), f2 = find(pies[1], c2, c1);
        if (!f1 || !f2) continue;
        return { wide: true, diagonal: true, cells: [[c1, f1], [c2, f2]].map(([c, f]) => ({ cx: c[0], cy: c[1], R, r: R * .86, fx: f[0], fy: f[1], fsize })) };
      }
      return null;
    },
    draw(s, L) {
      const D = s.Q.data, st = s.st, T = st.teach;
      return D.pies.map((p, k) => {
        const c = L.cells[k], tint = k === 0 ? C.pinkTint : C.skyTint, active = T && T.target === k;
        const glow = i => active && !st.user[k].has(i) && st.user[k].size < p.a;
        return `<g data-shape="${k}" ${active ? "data-glow-root" : ""}>${plate(c.cx, c.cy, c.R, tint)}${pieSlices(c.cx, c.cy, c.r, { hitR: c.R + 6, key: `s${k}_`, spans: equalSpans(p.d), rot: 0, fillOf: i => (st.user[k].has(i) ? C.pink : C.cream), hit: i => `data-hit="part" data-s="${k}" data-i="${i}"`, glow, pop: i => st.popped === k * 100 + i })}${svgFrac(c.fx, c.fy, p.a, p.d, c.fsize)}</g>`;
      }).join("");
    },
    tap(s, hit) {
      const k = +hit.s, i = +hit.i, st = s.st, T = st.teach, set = st.user[k];
      if (s.teaching && T && T.target !== k) { s.tone([330], .15, "triangle"); s.say(`Colour the pie on the ${T.target === 0 ? "pink" : "blue"} plate.`); return; }
      if (set.has(i)) { set.delete(i); s.tone([480], .07); return; }
      if (s.teaching && T && set.size >= s.Q.data.pies[k].a) { s.tone([330], .15, "triangle"); s.say("That is enough. Look at the top number."); return; }
      set.add(i); st.popped = k * 100 + i; s.tone([620, 760], .07); if (s.teaching && T) lessonCount(s, set.size); // the first one or two only (lesson rule)
    },
  };

  /* ================= Question makers ================= */
  function lvIndex(topic, level) {
    let i = typeof level === "number" ? level : topic.levels.indexOf(level);
    if (i < 0 && level && typeof level === "object" && typeof level.index === "number") i = level.index;
    if (!(i >= 0)) i = 0;
    return Math.min(Math.max(0, Math.floor(i)), topic.levels.length - 1);
  }
  function fresh(topic, level, prev, maker) {
    const li = lvIndex(topic, level); let q;
    for (let t = 0; t < 40; t++) { q = maker(li); if (!prev || q.key !== prev.key) break; }
    q.data.level = li; return q;
  }
  function fracChoices(pairs) {
    // Dedupe by value: two buttons must never show the same amount.
    const out = [];
    for (const p of pairs) if (p[0] > 0 && !out.some(o => sameValue(o, p))) out.push(p);
    return out;
  }
  const choiceOf = (a, d, pic = "") => ({ value: `${a}/${d}`, label: words(a, d), html: `<span class="fr-ch">${pic}${frac(a, d, "fr-big")}</span>` });
  const UNFAIR = { 2: [[130, 230], [110, 250], [140, 220]], 3: [[70, 120, 170], [80, 100, 180], [60, 150, 150]], 4: [[60, 80, 100, 120], [60, 60, 100, 140], [62, 95, 70, 133]] }; // the thinnest slice is 60 degrees, wide enough to tap
  const UNFAIR_BAR = { 2: [[2, 3.4], [3, 5]], 3: [[2, 3, 4.4], [1.6, 2.8, 2.8]], 4: [[1.5, 1.5, 2.5, 2.5], [1.6, 2.6, 1.6, 2.2]] }; // the thinnest piece is at least 3/16 of the bar

  /* ---------- fraction_name ---------- */
  const fractionName = {
    id: "fraction_name", title: "Name the part", strand: "Fractions",
    icon: `<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="35" r="27" fill="${C.ink}"/><circle cx="32" cy="32" r="27" fill="${C.paper}" stroke="${C.ink}" stroke-width="3"/><path d="${wedge(32, 32, 21, 0, 120)}" fill="${C.pink}" ${STROKE}/><path d="${wedge(32, 32, 21, 120, 240)}" fill="${C.cream}" ${STROKE}/><path d="${wedge(32, 32, 21, 240, 360)}" fill="${C.cream}" ${STROKE}/></svg>`,
    levels: [
      { name: "Equal parts?", grade: 3, note: "Readiness for BC Grade 3 fractions: fair shares are equal parts. Pick the pie or bar cut into equal parts." },
      { name: "Halves to quarters", grade: 3, note: "BC Grade 3 fraction concepts: one part of a pie or bar, as 1/2, 1/3 or 1/4." },
      { name: "More parts", grade: 3, note: "BC Grade 3: several parts coloured. Mostly thirds, quarters and sixths, then fifths, eighths and tenths." },
      { name: "Colour the part", grade: 3, note: "BC Grade 3: link the written fraction to a picture. Colour 3/8 of the chocolate bar: tap 3 pieces pink, then count and type the parts that are not pink (5). Eighths and tenths are always a bar, so each piece is big enough to tap on a phone." },
    ],
    make(level, prev) {
      return fresh(this, level, prev, li => {
        if (li === 0) {
          const n = pick([2, 3, 4]), shape = Math.random() < .65 ? "pie" : "bar", fairAt = rnd(2);
          const unfair = shuffle(pick(shape === "pie" ? UNFAIR[n] : UNFAIR_BAR[n]));
          const fairSp = shape === "pie" ? equalSpans(n) : Array(n).fill(1);
          const shapes = [0, 1].map(k => ({ plate: k === 0 ? "pink" : "blue", fair: k === fairAt, spans: k === fairAt ? fairSp : unfair, rot: shape === "pie" ? (k === fairAt ? pick([0, 180 / n]) : pick([0, 20, -25, 35])) : 0 }));
          const thing = shape === "pie" ? "pie" : "bar";
          const choices = shapes.map(sh => ({ value: sh.plate, label: `The ${thing} on the ${sh.plate} plate`, html: `<span class="fr-ch">${shape === "pie" ? miniPieSp(sh.spans, sh.rot, sh.plate === "pink" ? C.pinkTint : C.skyTint) : miniBar(sh.spans, sh.plate === "pink" ? C.pinkTint : C.skyTint)}<span class="fr-word">${sh.plate === "pink" ? "Pink" : "Blue"}<br>plate</span></span>` }));
          return { key: `eq:${shape}:${n}:${fairAt}:${unfair.join(",")}`, say: `Which ${thing} is cut in equal parts?`, show: `Which ${thing} has <b>equal</b> parts?`,
            answer: shapes[fairAt].plate, input: { type: "choice", choices }, data: { kind: "equal", shape, n, shapes } };
        }
        if (li === 1) {
          const d = pick([2, 3, 4]), shape = Math.random() < .6 ? "pie" : "bar", at = rnd(d);
          const choices = shuffle([2, 3, 4]).map(x => choiceOf(1, x));
          return { key: `nm1:${shape}:${d}:${at}`, say: "What part is pink?", show: "What part is pink?", answer: `1/${d}`,
            input: { type: "choice", choices }, data: { kind: "name", shape, d, a: 1, shaded: [at], rot: shape === "pie" && d === 2 ? pick([0, 90]) : 0 } };
        }
        if (li === 2) {
          const d = pick([3, 3, 4, 4, 4, 5, 6, 6, 8, 10]), a = 2 + rnd(d - 2), shape = Math.random() < .55 ? "pie" : "bar";
          let shaded;
          if (Math.random() < .7) { const st = shape === "pie" ? rnd(d) : 0; shaded = Array.from({ length: a }, (_, i) => (st + i) % d); }
          else shaded = shuffle(Array.from({ length: d }, (_, i) => i)).slice(0, a);
          const off = a + 1 < d ? a + 1 : a - 1;
          const pairs = fracChoices([[a, d], [d, a], [off, d], [d - a, d]]).slice(0, 4);
          return { key: `nm2:${shape}:${a}/${d}:${shaded.slice().sort((x, y) => x - y).join(",")}`, say: "What part is pink?", show: "What part is pink?", answer: `${a}/${d}`,
            input: { type: "choice", choices: shuffle(pairs).map(([x, y]) => choiceOf(x, y)) }, data: { kind: "name", shape, d, a, shaded: shaded.sort((x, y) => x - y), rot: 0 } };
        }
        // Colour the fraction, then count the parts left over. The answer is NOT a number printed in the
        // question: she must colour the top number of parts and then count what is not pink.
        // Never a half (3/6, 4/8): then the answer would equal the top number she can read.
        const d = pick([3, 4, 4, 5, 6, 6, 8, 8, 10]); let a = 1 + rnd(d - 1); while (2 * a === d) a = 1 + rnd(d - 1);
        // Eighths and tenths are always a chocolate bar (2 rows of pieces). On a phone, with the number keys open,
        // a cake cut in 8 or 10 has slices too thin to tap one by one.
        const shape = d < 8 && Math.random() < .6 ? "pie" : "bar";
        const thing = shape === "pie" ? "cake" : "chocolate bar";
        return { key: `nm3:${shape}:${a}/${d}`, say: `Colour ${words(a, d)} of the ${thing}. How many parts are not pink?`, show: `Colour ${frac(a, d)} of the ${shape === "pie" ? "cake" : "bar"}. How many are not pink?`, answer: String(d - a),
          input: { type: "number", unit: "" }, data: { kind: "name", colour: true, shape, thing, d, a, shaded: [], rot: 0 } };
      });
    },
    mount(el, Q, api) { const s = mountStage(el, Q, api); return { destroy: () => s.destroy(), reset: () => s.reset() }; },
    // Only when her answer after the lesson is still wrong: the lesson again, and Kitty counts every tap out loud with her.
    recount(Q, el, api) { return fractionName.teach(Q, el, api, { countAll: true }); },
    hint(Q, tries) {
      const D = Q.data;
      if (D.kind === "equal") return "Tap a part. Kitty lays a copy on the other parts. Do all the parts match?";
      if (D.colour) return "The top number tells how many to colour. Tap them pink. Then count the parts that are not pink. The tick button lets you tick them as you count.";
      return "Count all the parts. That number goes on the bottom. Then count the pink parts. That goes on top.";
    },
    async teach(Q, el, api, opts) {
      const s = stageFor(el, Q, api); s.countAll = !!(opts && opts.countAll); s.setTeaching(true); s.reset(); const D = Q.data;
      try {
        if (D.kind === "equal") {
          const thing = D.shape === "pie" ? "pie" : "bar";
          if (!await step(s, { target: 0 }, `Equal parts are all the same size. Tap one part of the ${thing} on the pink plate.`, st => st.tapped && st.tapped[0])) return;
          s.say("See the dotted copies? Does the copy fit every part?"); if (!await pause(s, 2600)) return;
          if (!await step(s, { target: 1 }, `Now tap one part of the ${thing} on the blue plate.`, st => st.tapped && st.tapped[1])) return;
          s.say("Does this copy fit every part?"); if (!await pause(s, 2600)) return;
          await step(s, {}, "Where did the copy fit every part? That one has equal parts. Pick it.");
          return;
        }
        if (!await countStep(s, { mode: "count", target: "all" }, "Let's count the parts. Tap each part. This number goes on the bottom.", D.d, st => st.badges.size === D.d)) return;
        s.say(D.colour ? "Yes. That is the bottom number." : "Remember your number. It goes on the bottom."); if (!await pause(s, 2400)) return;
        s.st.badges.clear(); s.st.count = 0;
        if (D.colour) {
          if (!await step(s, { mode: "colour", target: "colour", watch: st => { if (st.user.size > D.a) s.say("Too many. Tap one to take it off."); } }, `The top number is ${D.a}. Colour ${NUM[D.a]} ${D.a === 1 ? "part" : "parts"}. Tap them.`, st => st.user.size === D.a)) return;
          if (!await countStep(s, { mode: "plain", target: "plain" }, "Well done. Now tap the parts that are not pink to count them.", D.d - D.a, st => st.badges.size === D.d - D.a)) return;
          await step(s, {}, "That is how many are not pink. Now type it.");
          return;
        }
        if (!await countStep(s, { mode: "pink", target: "pink" }, "Now tap only the pink parts. This number goes on the top.", D.a, st => st.badges.size === D.a)) return;
        await step(s, {}, "Look at the numbers you found. Now pick the fraction.");
      } finally { s.countAll = false; s.setTeaching(false); }
    },
  };
  function miniPieSp(spans, rot, tint) {
    const starts = spanStarts(spans, rot);
    return `<svg viewBox="0 0 60 60" aria-hidden="true"><circle cx="30" cy="33" r="28" fill="${C.ink}"/><circle cx="30" cy="30" r="27" fill="${tint}" stroke="${C.ink}" stroke-width="2.5"/>${spans.map((sp, i) => `<path d="${wedge(30, 30, 22, starts[i], starts[i] + sp)}" fill="${C.cream}" stroke="${C.ink}" stroke-width="2.5" stroke-linejoin="round"/>`).join("")}</svg>`;
  }

  /* ---------- fraction_whole (father's request; beyond BC Grade 3) ---------- */
  const FLAVOURS = [[C.pink, C.mint], [C.pink, C.sun], [C.pink, C.lilac]];
  const fractionWhole = {
    id: "fraction_whole", title: "Make a whole", strand: "Fractions",
    icon: `<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="35" r="27" fill="${C.ink}"/><circle cx="32" cy="32" r="27" fill="${C.paper}" stroke="${C.ink}" stroke-width="3"/><path d="${wedge(30, 32, 21, 180, 360)}" fill="${C.pink}" ${STROKE}/><path d="${wedge(35, 32, 21, 0, 180)}" fill="${C.mint}" ${STROKE}/></svg>`,
    levels: [
      { name: "Half and half", grade: 3, note: "Father's request, beyond BC Grade 3 (BC does not add fractions in Grades 1-4). 1/2 + 1/2 = 1 whole pie." },
      { name: "Quarters", grade: 3, note: "Father's request, beyond BC Grade 3. Quarters: what fills the pie? 1/4 + ? = 1. The plate starts empty: she puts the pink 1/4 on, then fills the gap and counts it." },
      { name: "Fill the pie", grade: 3, note: "Father's request, beyond BC Grade 3. Thirds, fifths, sixths and eighths: 2/5 + ? = 1. The plate starts empty: she builds 2/5 in pink, then fills the gap." },
      { name: "Whole yet?", grade: 3, note: "Father's request, beyond BC Grade 3. Is the pie whole yet? Yes or not yet." },
    ],
    make(level, prev) {
      return fresh(this, level, prev, li => {
        if (li === 0) {
          const fl = rnd(FLAVOURS.length), [f1, f2] = FLAVOURS[fl];
          const choices = shuffle([
            { value: "1", label: "one whole pie", html: `<span class="fr-ch">${miniPie({ whole: true, on: 1, fill: C.pink })}<span class="fr-num">1</span></span>` },
            { value: "1/2", label: "one half", html: `<span class="fr-ch">${miniPie({ n: 2, on: 1 })}${frac(1, 2, "fr-big")}</span>` },
            { value: "2", label: "two whole pies", html: `<span class="fr-ch"><span class="fr-two">${miniPie({ whole: true, on: 1 })}${miniPie({ whole: true, on: 1 })}</span><span class="fr-num">2</span></span>` },
          ]);
          return { key: `wh0:${fl}:${choices.map(c => c.value).join(",")}`, say: "Half a pie and half a pie. How much pie?", show: `${frac(1, 2)} + ${frac(1, 2)} = ?`, answer: "1",
            input: { type: "choice", choices }, data: { kind: "whole", d: 2, given: 0, tray: [f1, f2], sum: [[1, 2], [1, 2]] } };
        }
        if (li === 1 || li === 2) {
          // The tray holds the given pink slices and some slices of another colour (2 more than she needs, so the
          // tray never shows the answer). The plate starts empty; she builds the given part first, then fills the gap.
          const d = li === 1 ? 4 : pick([3, 5, 6, 8]), [, f2] = pick(FLAVOURS);
          // Never exactly half: then the answer (2/4 for 2/4 + ? = 1) is the fraction printed in the question, and
          // copying the number she sees would be right without counting.
          let a; do { a = 1 + rnd(d - 1); } while (2 * a === d);
          const need = d - a;
          const pairs = li === 1 ? [[1, 4], [2, 4], [3, 4]] : fracChoices([[need, d], [a, d], [need - 1, d], [need + 1, d], [need + 2, d]].filter(([x]) => x >= 1 && x < d)).slice(0, 3);
          return { key: `wh${li}:${a}/${d}`, say: `${words(a, d)[0].toUpperCase() + words(a, d).slice(1)} and what make a whole pie?`, show: `${frac(a, d)} + ? = 1`, answer: `${need}/${d}`,
            input: { type: "choice", choices: shuffle(pairs).map(([x, y]) => choiceOf(x, y)) }, data: { kind: "whole", d, given: a, tray: [...Array(a).fill(C.pink), ...Array(need + 2).fill(f2)], sum: [[a, d]] } };
        }
        const d = pick([3, 4, 5, 6, 8]), whole = Math.random() < .5;
        let a, b;
        if (whole) { a = 1 + rnd(d - 1); b = d - a; } else { const tot = 2 + rnd(d - 2); a = 1 + rnd(tot - 1); b = tot - a; }
        const [f1, f2] = pick(FLAVOURS);
        const choices = shuffle([
          { value: "yes", label: "Yes, it is whole", html: `<span class="fr-ch">${miniPie({ whole: true, on: 1, fill: C.pink })}<span class="fr-word">Yes,<br>whole!</span></span>` },
          { value: "no", label: "Not yet", html: `<span class="fr-ch">${miniPie({ n: 4, on: 3, gapFrom: 3 })}<span class="fr-word">Not<br>yet</span></span>` },
        ]);
        return { key: `wh3:${a}+${b}/${d}`, say: `${words(a, d)[0].toUpperCase() + words(a, d).slice(1)} and ${words(b, d)}. Is the pie whole yet?`, show: `${frac(a, d)} + ${frac(b, d)} = whole?`,
          answer: a + b === d ? "yes" : "no", input: { type: "choice", choices }, data: { kind: "whole", d, given: 0, tray: [...Array(a).fill(f1), ...Array(b).fill(f2)], sum: [[a, d], [b, d]] } };
      });
    },
    mount(el, Q, api) { const s = mountStage(el, Q, api); return { destroy: () => s.destroy(), reset: () => s.reset() }; },
    // Only when her answer after the lesson is still wrong: the lesson again, and Kitty counts every tap out loud with her.
    recount(Q, el, api) { return fractionWhole.teach(Q, el, api, { countAll: true }); },
    hint(Q, tries) {
      const D = Q.data;
      if (D.level === 0) return "Drag both halves onto the plate. How much pie is there?";
      if (D.level === 3) return "Drag all the slices onto the plate. Is there a gap?";
      return "Put the pink slices on the plate first. Then fill the gaps with the other slices, and count them. The bottom number is all the slices.";
    },
    async teach(Q, el, api, opts) {
      const s = stageFor(el, Q, api); s.countAll = !!(opts && opts.countAll); s.setTeaching(true); s.reset(); const D = Q.data;
      try {
        // Half and half (level 1): the answer is "one whole pie", so no line here may say what makes a whole pie.
        if (!await countStep(s, { mode: "count", target: "slots" }, D.level === 0 ? "How many spaces are on the plate? Tap each space." : "How many slices make the whole pie? Tap each space on the plate.", D.d, st => st.badges.size === D.d)) return;
        s.say(D.level === 0 ? "Remember your number." : `You counted ${NUM[D.d]}. ${NUM[D.d][0].toUpperCase() + NUM[D.d].slice(1)} slices make a whole pie.`); if (!await pause(s, 2400)) return;
        s.st.badges.clear(); s.st.count = 0;
        if (D.given) {
          if (!await step(s, { mode: "play", target: "pinktray" }, `The question says ${words(D.given, D.d)}. Put the ${NUM[D.given]} pink ${D.given === 1 ? "slice" : "slices"} on the plate.`, st => st.tray.every(p => !p.given || p.on >= 0))) return;
          if (!await step(s, { mode: "play", target: "tray" }, "How many more make a whole? Drag the other slices in until the plate is full.", st => KINDS.whole.full(st))) return;
          if (!await countStep(s, { mode: "count", target: "new" }, "The pie is whole! Now tap the new slices to count them.", D.d - D.given, st => st.badges.size === D.d - D.given)) return;
          await step(s, {}, "Look at your new slices, and the bottom number. Now pick the answer.");
          return;
        }
        if (!await step(s, { mode: "play", target: "tray" }, D.level === 0 ? "The plate is empty. Drag both halves onto it." : "Drag all the slices from the tray onto the plate.", st => st.tray.every(p => p.on >= 0))) return;
        await step(s, {}, D.level === 0 ? "Look at the plate. How much pie is there now? Pick the answer." : "Look at the plate. Is every space full? Pick the answer.");
      } finally { s.countAll = false; s.setTeaching(false); }
    },
  };

  /* ---------- fraction_set ---------- */
  const SET_ITEMS = ["bow", "heart", "star"];
  const fractionSet = {
    id: "fraction_set", title: "Part of a group", strand: "Fractions",
    icon: `<svg viewBox="0 0 64 64" aria-hidden="true">${itemSVG("bow", C.pink, 2, 4, 30)}${itemSVG("bow", C.pink, 32, 4, 30)}${itemSVG("bow", C.sky, 2, 32, 30)}${itemSVG("bow", C.sky, 32, 32, 30)}</svg>`,
    levels: [
      { name: "What part?", grade: 3, note: "BC Grade 3: a fraction can be part of a set. Count the group (bottom) and the pink ones (top)." },
      { name: "Share and count", grade: 3, note: "BC Grade 3: equal sharing. Half, a third or a quarter of 2 to 12 things." },
    ],
    make(level, prev) {
      return fresh(this, level, prev, li => {
        if (li === 0) {
          const n = pick([2, 3, 4, 4, 5, 6, 6, 8, 8, 10]), a = 1 + rnd(n - 1), item = pick(SET_ITEMS), other = pick(OTHER_COLOURS);
          const pink = shuffle(Array.from({ length: n }, (_, i) => i)).slice(0, a).sort((x, y) => x - y);
          const pairs = fracChoices([[a, n], [n, a], [n - a, n], [a + 1 < n ? a + 1 : a - 1, n]]).slice(0, 3);
          return { key: `set0:${item}:${a}/${n}:${pink.join(",")}`, say: `What part of the ${ITEM_NAME[item][1]} is pink?`, show: `What part of the ${ITEM_NAME[item][1]} is <b>pink</b>?`, answer: `${a}/${n}`,
            input: { type: "choice", choices: shuffle(pairs).map(([x, y]) => choiceOf(x, y)) }, data: { kind: "setname", n, a, item, other, pink } };
        }
        // The share never equals a number in the question line: not the bottom number (half of 4, a third of 9)
        // and not the top number 1 (half of 2). Guessing a number she can see must never work.
        const k = pick([2, 2, 3, 4]), opts = (k === 2 ? [3, 4, 5, 6] : k === 3 ? [2, 4] : [2, 3]), per = pick(opts), n = k * per, item = pick(["cookie", "strawberry"]);
        const part = { 2: "Half", 3: "A third", 4: "A quarter" }[k];
        const friends = shuffle(FRIENDS).slice(0, k);
        return { key: `set1:${k}:${n}:${item}`, say: `${part} of ${NUM[n]} ${ITEM_NAME[item][1]}. How many is that?`, show: `${frac(1, k)} of ${n} ${ITEM_NAME[item][1]}`, answer: String(per),
          input: { type: "number", unit: "" }, data: { kind: "share", n, k, item, friends } };
      });
    },
    mount(el, Q, api) { const s = mountStage(el, Q, api); return { destroy: () => s.destroy(), reset: () => s.reset() }; },
    // Only when her answer after the lesson is still wrong: the lesson again, and Kitty counts every tap out loud with her.
    recount(Q, el, api) { return fractionSet.teach(Q, el, api, { countAll: true }); },
    hint(Q, tries) {
      if (Q.data.kind === "share") return `Share them on the ${NUM[Q.data.k]} plates, one at a time, round and round. Then count one plate.`;
      return "Count all of them. That goes on the bottom. Then count the pink ones. That goes on top.";
    },
    async teach(Q, el, api, opts) {
      const s = stageFor(el, Q, api); s.countAll = !!(opts && opts.countAll); s.setTeaching(true); s.reset(); const D = Q.data;
      try {
        if (D.kind === "share") {
          if (!await step(s, { target: "plate", plate: 0 }, `Let's share fairly. Give one to the glowing plate. Tap it, or drag one there. Go round and round.`, st => st.pile.length === 0)) return;
          if (!await countStep(s, { target: "count" }, "Every plate has the same. Now count the ones on the first plate. Tap them.", D.n / D.k, st => st.badges.size === st.plates[0].length)) return;
          await step(s, {}, "That is one share. Now type how many.");
          return;
        }
        if (!await countStep(s, { target: "all" }, `Let's count them. Tap every ${ITEM_NAME[D.item][0]}. This number goes on the bottom.`, D.n, st => st.badges.size === D.n)) return;
        s.say("Remember your number. It goes on the bottom."); if (!await pause(s, 2400)) return;
        s.st.badges.clear(); s.st.count = 0;
        if (!await countStep(s, { target: "pink" }, "Now tap only the pink ones. This number goes on top.", D.a, st => st.badges.size === D.a)) return;
        await step(s, {}, "Look at the numbers you found. Now pick the fraction.");
      } finally { s.countAll = false; s.setTeaching(false); }
    },
  };

  /* ---------- fraction_compare (BC Grade 4; father's request) ---------- */
  const fractionCompare = {
    id: "fraction_compare", title: "Which is more", strand: "Fractions",
    icon: `<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="17" cy="34" r="15" fill="${C.ink}"/><circle cx="17" cy="32" r="15" fill="${C.pinkTint}" stroke="${C.ink}" stroke-width="2.5"/><path d="${wedge(17, 32, 11, 0, 180)}" fill="${C.pink}" ${STROKE}/><path d="${wedge(17, 32, 11, 180, 360)}" fill="${C.cream}" ${STROKE}/><circle cx="47" cy="34" r="15" fill="${C.ink}"/><circle cx="47" cy="32" r="15" fill="${C.skyTint}" stroke="${C.ink}" stroke-width="2.5"/>${[0, 1, 2, 3].map(i => `<path d="${wedge(47, 32, 11, i * 90, i * 90 + 90)}" fill="${i ? C.cream : C.pink}" ${STROKE}/>`).join("")}</svg>`,
    levels: [
      { name: "Same bottom", grade: 3, note: "BC Grade 4 (comparing fractions), beyond Grade 3: father's request. Same bottom number, such as 3/8 and 5/8." },
      { name: "One slice each", grade: 3, note: "BC Grade 4, beyond Grade 3: father's request. One slice each, such as 1/2 and 1/4. More slices means smaller slices." },
    ],
    make(level, prev) {
      return fresh(this, level, prev, li => {
        let p0, p1;
        if (li === 0) { const d = pick([3, 4, 5, 6, 8, 10]); const [a, b] = shuffle(Array.from({ length: d - 1 }, (_, i) => i + 1)).slice(0, 2); p0 = { a, d }; p1 = { a: b, d }; }
        else { const [x, y] = shuffle([2, 3, 4, 5, 6, 8, 10]).slice(0, 2); p0 = { a: 1, d: x }; p1 = { a: 1, d: y }; }
        const big = p0.a * p1.d > p1.a * p0.d ? p0 : p1;
        const choices = [p0, p1].map((p, k) => ({ value: `${p.a}/${p.d}`, label: `${words(p.a, p.d)}, the ${k ? "blue" : "pink"} plate`, html: `<span class="fr-ch">${miniPie({ n: p.d, on: 0, plate: k ? C.skyTint : C.pinkTint })}${frac(p.a, p.d, "fr-big")}</span>` }));
        return { key: `cmp${li}:${p0.a}/${p0.d}:${p1.a}/${p1.d}`, say: `Which is more pie: ${words(p0.a, p0.d)}, or ${words(p1.a, p1.d)}?`, show: `Which is more: ${frac(p0.a, p0.d)} or ${frac(p1.a, p1.d)}?`,
          answer: `${big.a}/${big.d}`, input: { type: "choice", choices }, data: { kind: "compare", pies: [p0, p1] } };
      });
    },
    mount(el, Q, api) { const s = mountStage(el, Q, api); return { destroy: () => s.destroy(), reset: () => s.reset() }; },
    // Only when her answer after the lesson is still wrong: the lesson again, and Kitty counts every tap out loud with her.
    recount(Q, el, api) { return fractionCompare.teach(Q, el, api, { countAll: true }); },
    hint(Q, tries) {
      if (Q.data.level === 1) return "More slices means smaller slices. Colour one slice in each pie, then look.";
      return "Colour both pies. The top number says how many slices. Which pie has more pink?";
    },
    async teach(Q, el, api, opts) {
      const s = stageFor(el, Q, api); s.countAll = !!(opts && opts.countAll); s.setTeaching(true); s.reset(); const [p0, p1] = Q.data.pies;
      try {
        if (Q.data.level === 1) { s.say("More slices means smaller slices. Let's see."); if (!await pause(s, 2400)) return; }
        if (!await countStep(s, { target: 0 }, `The pink plate says ${words(p0.a, p0.d)}. Colour ${NUM[p0.a]} ${p0.a === 1 ? "slice" : "slices"} on the pink plate.`, p0.a, st => st.user[0].size === p0.a)) return;
        if (!await countStep(s, { target: 1 }, `The blue plate says ${words(p1.a, p1.d)}. Colour ${NUM[p1.a]} ${p1.a === 1 ? "slice" : "slices"} on the blue plate.`, p1.a, st => st.user[1].size === p1.a)) return;
        await step(s, {}, "Look at the two pies. Which one has more pink? Pick it.");
      } finally { s.countAll = false; s.setTeaching(false); }
    },
  };

  const MT = (window.MathTopics = window.MathTopics || []);
  for (const t of [fractionName, fractionWhole, fractionSet, fractionCompare]) {
    const i = MT.findIndex(x => x && x.id === t.id);
    if (i >= 0) MT.splice(i, 1, t); else MT.push(t);
  }
})();
