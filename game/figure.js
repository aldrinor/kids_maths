/* figure.js (23 Oct 2026, round 2, Grade 3 round 2): the pictures that sit INSIDE a question and that the question is about.
   A ruler with a ribbon on it, a jug, a bar graph, a row of pictures, tally marks, a spinner, a jar of sweets, a solid, a cake cut in parts, a number line of fractions.
   Every one is drawn in code as plain SVG (no picture files). The question carries the figure as plain data (Q.figure); the game draws it under the story (renderBody).
   It is NOT in the scene strip above the question: that strip can step aside on a small screen, and the question must still be answerable.

   Figure.svg(fig, opts)  -> an <svg> string. opts.help = true draws the same figure with the extra guide of the second hint (guide line, counted cells, tinted groups).
                             opts.small = true draws a compact one (answer buttons).
   Figure.texts(fig)      -> every piece of text the drawing prints (axis numbers, words). The tests use it: the answer must never be printed.
   Figure.solidSvg(shape) -> one solid, for an answer button.        Figure.SOLIDS -> the solid names.
   Figure.fractionHtml("1/3") -> a stacked fraction for an answer button.
   Rules kept here: a figure never prints the answer (axis numbers are every second line, a ruler is numbered at 5, 10, 15 only), never prints a value on a bar,
   a pictograph key is in words ("each picture stands for two cookies"), nothing moves, nothing flashes, colours are soft.

   Figure descriptors (all fields are plain data):
     { t: "ruler", max: 15, bars: [{ len, name, color }] }                       objects lying from the zero mark; whole centimetres
     { t: "jug", max: 1000, levels: [ml, ...], names: [...] }                    jugs with lines every 100 millilitres, numbered at 500 and 1000
     { t: "bars", cats: [...], vals: [...], scale: 1|2|5, unit: "cookies" }       bar graph, a line every `scale`, numbered at every second line
     { t: "picto", cats, vals, scale, icon: "cookie|cup|cupcake|scoop", unit, one }    one picture stands for `scale` things
     { t: "tally", cats, vals }                                                  tally marks in fives
     { t: "spinner", parts: ["red", "blue", ...] }                               equal sections
     { t: "jar", items: { red: 3, blue: 2 } }                                    sweets in a jar
     { t: "solid", shape }                                                       cube rect_prism cylinder cone sphere sq_pyramid tri_prism
     { t: "fracbar", bars: [{ parts | cuts, shaded: [indexes], shape: "bar"|"pie", label }] }
     { t: "fracline", parts, mark, letters: [{ at, ch }] }                       a number line from 0 to 1 cut in `parts`
     { t: "set", total, groups, shade }                                          dots in equal groups (hint only)
*/
(function (root) {
  "use strict";
  const INK = "var(--line-ink, #3f2a2a)", SOFT = "#e9dcd0", PAPER = "#fffaf3", EDGE = "#9a7b66";
  const COLOR = { red: "#e8837f", blue: "#6fb0e3", green: "#86c995", yellow: "#f1cb55", pink: "#f4a0b8", purple: "#b9a0e2", orange: "#f2a65e" };
  const BARC = ["#f08aa6", "#7fb6e6", "#f2c14e", "#8ccf9a", "#b99ae0", "#f0a35e"];
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const SOLIDS = ["cube", "rect_prism", "cylinder", "cone", "sphere", "sq_pyramid", "tri_prism"];
  let uid = 0;
  const wrap = (w, h, inner, label, small) => `<svg class="fig${small ? " small" : ""}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(label)}" font-family="Lexend, sans-serif" preserveAspectRatio="xMidYMid meet" style="width:100%;max-height:${small ? "64px" : "clamp(120px, 24vh, 210px)"}">${inner}</svg>`;
  const txt = (x, y, s, o) => { o = o || {}; return `<text x="${x}" y="${y}" font-size="${o.size || 14}" font-weight="${o.weight || 600}" text-anchor="${o.anchor || "middle"}" fill="${o.fill || INK}">${esc(s)}</text>`; };
  const maxOf = a => Math.max.apply(null, a);

  /* ---------- the solids: three soft tones of one colour (front, top, side) ---------- */
  function solidInner(shape, tone) {
    const t = tone || ["#b8a3e6", "#d9cdf5", "#9983cc"], [f, l, d] = t, S = `stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"`;
    const poly = (pts, fill, extra) => `<polygon points="${pts.map(p => p.join(",")).join(" ")}" fill="${fill}" ${S} ${extra || ""}/>`;
    switch (shape) {
      case "cube": return poly([[22, 38], [42, 16], [86, 16], [66, 38]], l) + poly([[66, 38], [86, 16], [86, 60], [66, 82]], d) + poly([[22, 38], [66, 38], [66, 82], [22, 82]], f);
      case "rect_prism": return poly([[8, 46], [30, 24], [94, 24], [72, 46]], l) + poly([[72, 46], [94, 24], [94, 58], [72, 80]], d) + poly([[8, 46], [72, 46], [72, 80], [8, 80]], f);
      case "cylinder": return `<path d="M20,26 L20,74 A30,11 0 0 0 80,74 L80,26 Z" fill="${f}" ${S}/><ellipse cx="50" cy="26" rx="30" ry="11" fill="${l}" ${S}/>`;
      case "cone": return `<path d="M50,8 L18,72 A32,12 0 0 0 82,72 Z" fill="${f}" ${S}/><path d="M50,8 L82,72 A32,12 0 0 1 66,83 Z" fill="${d}" opacity=".55"/>`;
      case "sphere": { const id = "sg" + (++uid); return `<defs><radialGradient id="${id}" cx="38%" cy="32%" r="75%"><stop offset="0" stop-color="${l}"/><stop offset=".55" stop-color="${f}"/><stop offset="1" stop-color="${d}"/></radialGradient></defs><circle cx="50" cy="48" r="36" fill="url(#${id})" ${S}/>`; }
      case "sq_pyramid": return `<polyline points="12,70 38,54 88,60" fill="none" stroke="${INK}" stroke-width="1.6" stroke-dasharray="4 4"/><line x1="38" y1="54" x2="50" y2="10" stroke="${INK}" stroke-width="1.6" stroke-dasharray="4 4"/>` +
        poly([[50, 10], [88, 60], [62, 80]], d) + poly([[50, 10], [12, 70], [62, 80]], f);
      case "tri_prism": return poly([[10, 78], [30, 40], [66, 20], [46, 58]], l) + poly([[50, 78], [30, 40], [66, 20], [88, 58]], d) + poly([[10, 78], [50, 78], [30, 40]], f);
      default: return "";
    }
  }
  const solidSvg = shape => `<svg class="fig solid" viewBox="0 0 100 92" role="img" aria-label="${esc(shape.replace("_", " "))}" style="width:100%;max-height:58px">${solidInner(shape)}</svg>`;

  /* ---------- little pictures for a pictograph ---------- */
  function icon(kind, cx, cy, r) {
    const S = `stroke="${INK}" stroke-width="1.8"`;
    switch (kind) {
      case "cookie": return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#d9a066" ${S}/>` + [[-.35, -.3], [.3, -.25], [-.05, .35], [.35, .3]].map(([a, b]) => `<circle cx="${cx + a * r}" cy="${cy + b * r}" r="${r * .15}" fill="#6b4328"/>`).join("");
      case "cup": return `<path d="M${cx - r},${cy - r * .6} h${r * 1.7} v${r * .7} a${r * .85},${r * .85} 0 0 1 -${r * .85},${r * .85} h-${r * .0} a${r * .85},${r * .85} 0 0 1 -${r * .85},-${r * .85} z" fill="#f4a0b8" ${S}/><path d="M${cx + r * .85},${cy - r * .3} a${r * .45},${r * .4} 0 0 1 0,${r * .8}" fill="none" ${S}/>`;
      case "cupcake": return `<path d="M${cx - r * .8},${cy} h${r * 1.6} l-${r * .25},${r * .9} h-${r * 1.1} z" fill="#f2c14e" ${S}/><path d="M${cx - r * .85},${cy} a${r * .85},${r * .75} 0 0 1 ${r * 1.7},0 z" fill="#f4a0b8" ${S}/><circle cx="${cx}" cy="${cy - r * .75}" r="${r * .17}" fill="#e8837f"/>`;
      case "scoop": return `<path d="M${cx - r * .55},${cy} L${cx},${cy + r * 1.05} L${cx + r * .55},${cy} z" fill="#e2b46b" ${S}/><circle cx="${cx}" cy="${cy - r * .15}" r="${r * .62}" fill="#f4a0b8" ${S}/>`;
      default: return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#f2c14e" ${S}/>`;
    }
  }

  /* ---------- the figure types ---------- */
  function ruler(f, o) {
    const n = f.bars.length, X0 = 28, CM = 20, W = X0 + f.max * CM + 34, barH = 24, gap = 10, top = 8;
    let s = "", y = top;
    f.bars.forEach((b, i) => {
      const w = b.len * CM, col = b.color || COLOR.pink;
      s += `<rect class="rbar" data-name="${esc(b.name)}" x="${X0}" y="${y}" width="${w}" height="${barH}" rx="7" fill="${col}" stroke="${INK}" stroke-width="2"/>`;
      if (o.help) for (let k = 1; k < b.len; k++) s += `<line x1="${X0 + k * CM}" y1="${y + 3}" x2="${X0 + k * CM}" y2="${y + barH - 3}" stroke="${INK}" stroke-width="1.6" opacity=".55"/>`;
      s += txt(X0 + w / 2, y + barH / 2 + 5, b.name, { size: 13 });
      s += `<line x1="${X0 + w}" y1="${y + barH}" x2="${X0 + w}" y2="${top + n * (barH + gap) + 4}" stroke="${INK}" stroke-width="1.6" stroke-dasharray="${o.help ? "5 4" : "0 1"}" opacity="${o.help ? 1 : 0}"/>`;
      y += barH + gap;
    });
    const ry = y + 2, RH = 40;
    s += `<rect x="${X0 - 8}" y="${ry}" width="${f.max * CM + 16}" height="${RH}" rx="5" fill="#f6e3a4" stroke="${INK}" stroke-width="2"/>`;
    for (let k = 0; k <= f.max; k++) {
      const big = k % 5 === 0, x = X0 + k * CM;
      s += `<line x1="${x}" y1="${ry}" x2="${x}" y2="${ry + (big ? 20 : 12)}" stroke="${INK}" stroke-width="${big ? 2.2 : 1.6}"/>`;
      if (big && !o.help) s += txt(x, ry + 34, String(k), { size: 14, weight: 700 });
    }
    s += txt(X0 + f.max * CM + 12, ry + 34, "cm", { size: 12, anchor: "start", weight: 500 });
    return wrap(W, ry + RH + 8, s, "A ruler in centimetres with " + f.bars.map(b => "a " + b.name).join(" and ") + " lying along it", o.small);
  }

  function jug(f, o) {
    const n = f.levels.length, JW = 70, GAP = 70, X0 = 76, H = 150, TOP = 12, step = f.step || 100, lines = f.max / step, per = (H - 6) / lines;
    const W = X0 + n * JW + (n - 1) * GAP + 40;
    let s = "";
    f.levels.forEach((lv, i) => {
      const x = X0 + i * (JW + GAP), yb = TOP + H, yl = yb - lv / step * per;
      s += `<rect class="liquid" x="${x}" y="${yl}" width="${JW}" height="${yb - yl}" fill="#cfe6f7" opacity=".95"/>`;
      s += `<path d="M${x},${TOP} V${yb} H${x + JW} V${TOP}" fill="none" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`;
      s += `<path d="M${x - 4},${TOP - 2} h${JW + 8}" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`;
      if (o.help) s += `<line x1="${x - 24}" y1="${yl}" x2="${x + JW}" y2="${yl}" stroke="${INK}" stroke-width="1.8" stroke-dasharray="5 4"/>`;
      if (f.names && f.names[i]) s += txt(x + JW / 2, yb + 22, f.names[i], { size: 13 });
    });
    for (let k = 1; k <= lines; k++) {
      const y = TOP + H - k * per, big = k * step === 500 || k * step === f.max;
      s += `<line x1="${X0 - 14}" y1="${y}" x2="${X0 - (big ? 0 : 6)}" y2="${y}" stroke="${INK}" stroke-width="${big ? 2.4 : 1.6}"/>`;
      if (!o.help && (k * step === 500 || k * step === f.max)) s += txt(X0 - 18, y + 5, String(k * step), { size: 12, anchor: "end", weight: 700 });
    }
    s += `<line x1="${X0 - 14}" y1="${TOP + H}" x2="${X0 - 14}" y2="${TOP + H - lines * per}" stroke="${INK}" stroke-width="1.6"/>`;
    s += txt(18, TOP + 6, "ml", { size: 11, weight: 500 });
    return wrap(W, TOP + H + 30, s, "A glass jug with a scale in millilitres, with milk in it", o.small);
  }

  const labelLines = (top) => { const out = []; for (let k = 0; k <= top; k += 2) out.push(k); return out; };
  function bars(f, o) {
    const n = f.cats.length, sc = f.scale, top = Math.max(4, Math.ceil(maxOf(f.vals) / sc / 2) * 2), PH = 140, per = PH / top, X0 = 50, BW = 36, GAP = 22, Y0 = 14;
    const W = X0 + n * (BW + GAP) + 6;
    let s = "";
    for (let k = 0; k <= top; k++) {
      const y = Y0 + PH - k * per;
      s += `<line class="grid" x1="${X0}" y1="${y}" x2="${W - 6}" y2="${y}" stroke="${k === 0 ? INK : SOFT}" stroke-width="${k === 0 ? 2.4 : 1.6}"/>`;
      if (k % 2 === 0 && !o.help) s += txt(X0 - 8, y + 5, String(k * sc), { size: 13, anchor: "end", weight: 700 });
    }
    s += `<line x1="${X0}" y1="${Y0}" x2="${X0}" y2="${Y0 + PH}" stroke="${INK}" stroke-width="2.4"/>`;
    f.cats.forEach((c, i) => {
      const x = X0 + GAP / 2 + i * (BW + GAP), h = f.vals[i] / sc * per, y = Y0 + PH - h;
      s += `<rect class="barv" data-cat="${esc(c)}" x="${x}" y="${y}" width="${BW}" height="${h}" rx="3" fill="${BARC[i % BARC.length]}" stroke="${INK}" stroke-width="2"/>`;
      if (o.help && o.help.bar === i) s += `<line x1="${X0 - 4}" y1="${y}" x2="${x + BW}" y2="${y}" stroke="${INK}" stroke-width="2" stroke-dasharray="5 4"/>`;
      s += txt(x + BW / 2, Y0 + PH + 18, c, { size: 12 });
    });
    return wrap(W, Y0 + PH + 28, s, "A bar graph of " + f.unit + ", with a bar for each one", o.small);
  }

  function picto(f, o) {
    const n = f.cats.length, R = 13, STEP = 33, LABW = 70, ROW = 38, most = maxOf(f.vals) / f.scale, W = LABW + most * STEP + 14, kw = 150;
    let s = "";
    f.cats.forEach((c, i) => {
      const y = 6 + i * ROW;
      if (o.help && o.help.row === i) s += `<rect x="2" y="${y}" width="${Math.max(W, kw) - 4}" height="${ROW - 4}" rx="8" fill="#fdecc8"/>`;
      s += txt(LABW - 8, y + ROW / 2 + 3, c, { size: 13, anchor: "end" });
      for (let k = 0; k < f.vals[i] / f.scale; k++) s += `<g class="ic" data-row="${i}">${icon(f.icon, LABW + R + k * STEP, y + ROW / 2 - 2, R)}</g>`;
    });
    const ky = 6 + n * ROW + 4, words = { 1: "one", 2: "two", 5: "five" };
    s += `<rect x="2" y="${ky - 6}" width="${Math.max(W, kw) - 4}" height="32" rx="8" fill="${PAPER}" stroke="${o.help ? INK : EDGE}" stroke-width="${o.help ? 2.4 : 1.6}"/>`;
    s += icon(f.icon, 22, ky + 10, 10);
    s += txt(38, ky + 15, "stands for " + words[f.scale] + " " + (f.scale === 1 ? f.one : f.unit), { size: 13, anchor: "start" });
    return wrap(Math.max(W, kw), ky + 34, s, "A picture graph of " + f.unit + ", with a row of pictures for each one", o.small);
  }

  function tally(f, o) {
    const n = f.cats.length, LABW = 76, ROW = 38, GW = 40, groups = Math.max.apply(null, f.vals.map(v => Math.ceil(v / 5))), W = LABW + groups * GW + 10;
    let s = "";
    f.cats.forEach((c, i) => {
      const y = 8 + i * ROW, v = f.vals[i];
      s += txt(LABW - 8, y + 22, c, { size: 13, anchor: "end" });
      for (let g = 0; g * 5 < v; g++) {
        const cnt = Math.min(5, v - g * 5), x = LABW + g * GW, col = o.help ? (g % 2 ? "#b0501a" : "#2d6f9e") : INK;
        s += `<g class="tg" data-row="${i}" data-n="${cnt}">`;
        for (let k = 0; k < Math.min(4, cnt); k++) s += `<line x1="${x + 5 + k * 8}" y1="${y + 4}" x2="${x + 5 + k * 8}" y2="${y + 28}" stroke="${col}" stroke-width="3" stroke-linecap="round"/>`;
        if (cnt === 5) s += `<line x1="${x}" y1="${y + 24}" x2="${x + 34}" y2="${y + 8}" stroke="${col}" stroke-width="3" stroke-linecap="round"/>`;
        s += "</g>";
      }
    });
    return wrap(W, 8 + n * ROW + 4, s, "Tally marks in groups of five", o.small);
  }

  function spinner(f, o) {
    const n = f.parts.length, R = 66, C = 76; let s = "";
    f.parts.forEach((p, i) => {
      const a0 = -Math.PI / 2 + i * 2 * Math.PI / n, a1 = a0 + 2 * Math.PI / n;
      s += `<path d="M${C},${C} L${C + R * Math.cos(a0)},${C + R * Math.sin(a0)} A${R},${R} 0 0 1 ${C + R * Math.cos(a1)},${C + R * Math.sin(a1)} Z" fill="${COLOR[p]}" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>`;
    });
    s += `<circle cx="${C}" cy="${C}" r="6" fill="${INK}"/><path d="M${C},${C} l10,-30 l-6,-2 z" fill="${INK}" opacity="0"/>`;
    s += `<polygon points="${C - 8},${C - R - 12} ${C + 8},${C - R - 12} ${C},${C - R + 4}" fill="${INK}"/>`;
    return wrap(C * 2, C * 2 + 4, s, "A spinner cut into equal sections of colour", o.small);
  }

  function jar(f, o) {
    const list = []; Object.keys(f.items).forEach(c => { for (let k = 0; k < f.items[c]; k++) list.push(c); });
    const order = list.map((c, i) => ({ c, key: (i * 7 + 3) % (list.length + 3) })).sort((a, b) => a.key - b.key).map(x => x.c), PER = 5, R = 12;
    let s = `<path d="M24,18 H116 V30 Q128,40 128,60 V140 Q128,156 112,156 H28 Q12,156 12,140 V60 Q12,40 24,30 Z" fill="#fff" fill-opacity=".6" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><rect x="20" y="8" width="100" height="12" rx="5" fill="#d9a066" stroke="${INK}" stroke-width="2.4"/>`;
    order.forEach((c, i) => { const row = Math.floor(i / PER), col = i % PER, cx = 36 + col * 17.5 + (row % 2) * 6, cy = 142 - row * 22; s += `<circle cx="${cx}" cy="${cy}" r="${R}" fill="${COLOR[c]}" stroke="${INK}" stroke-width="1.8"/>`; });
    return wrap(140, 164, s, "A jar of sweets of different colours", o.small);
  }

  function solid(f, o) {
    return wrap(100, 92, solidInner(f.shape), "A " + f.shape.replace("_", " ") + " shape", o.small).replace("clamp(120px, 24vh, 210px)", "clamp(110px, 22vh, 170px)");
  }

  /* a cake cut in equal parts (a bar or a pie). cuts: explicit cut positions (0 to 1) when the parts are NOT equal. */
  function fracbar(f, o) {
    const items = f.bars, n = items.length, BW = 220, BH = 34, PIE = 62;
    let s = "", y = 8, W = 270;
    items.forEach(b => {
      const cuts = b.cuts || Array.from({ length: b.parts - 1 }, (_, k) => (k + 1) / b.parts), edges = [0].concat(cuts, [1]), sh = b.shaded || [];
      if (b.shape === "pie") {
        const C = PIE / 2 + 4, R = PIE / 2, cx = 30 + PIE / 2 + 20; let x = 0;
        edges.slice(0, -1).forEach((e0, i) => {
          const a0 = -Math.PI / 2 + e0 * 2 * Math.PI, a1 = -Math.PI / 2 + edges[i + 1] * 2 * Math.PI, large = edges[i + 1] - e0 > .5 ? 1 : 0;
          s += `<path d="M${cx},${y + C} L${cx + R * Math.cos(a0)},${y + C + R * Math.sin(a0)} A${R},${R} 0 ${large} 1 ${cx + R * Math.cos(a1)},${y + C + R * Math.sin(a1)} Z" fill="${sh.includes(i) ? "#f4a0b8" : "#fff4d6"}" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>`;
        });
        if (b.label) s += txt(cx + R + 16, y + C + 5, b.label, { size: 13, anchor: "start" });
        y += PIE + 12;
      } else {
        const x0 = 20;
        edges.slice(0, -1).forEach((e0, i) => { s += `<rect x="${x0 + e0 * BW}" y="${y}" width="${(edges[i + 1] - e0) * BW}" height="${BH}" fill="${sh.includes(i) ? "#f4a0b8" : "#fff4d6"}" stroke="${INK}" stroke-width="2.4"/>`; });
        if (b.label) s += txt(x0 + BW + 8, y + BH / 2 + 5, b.label, { size: 13, anchor: "start" });
        y += BH + 14;
      }
    });
    return wrap(W, y, s, "A cake cut into parts", o.small);
  }

  function fracline(f, o) {
    const X0 = 28, LW = 264, n = f.parts, Y = 56, X = k => X0 + LW * k / n; let s = "";
    s += `<line x1="${X0}" y1="${Y}" x2="${X0 + LW}" y2="${Y}" stroke="${INK}" stroke-width="3.2" stroke-linecap="round"/>`;
    for (let k = 0; k <= n; k++) s += `<line x1="${X(k)}" y1="${Y - (k === 0 || k === n ? 12 : 8)}" x2="${X(k)}" y2="${Y + (k === 0 || k === n ? 12 : 8)}" stroke="${INK}" stroke-width="${k === 0 || k === n ? 3 : 2}"/>`;
    if (!o.help) s += txt(X(0), Y + 32, "0", { size: 16, weight: 700 }) + txt(X(n), Y + 32, "1", { size: 16, weight: 700 });
    if (o.help && f.mark != null) for (let k = 0; k < f.mark; k++) s += `<path d="M${X(k) + 3},${Y - 8} Q${(X(k) + X(k + 1)) / 2},${Y - 38} ${X(k + 1) - 3},${Y - 8}" fill="none" stroke="#b0501a" stroke-width="3" stroke-linecap="round"/>`;
    if (f.mark != null && !f.letters) s += `<circle cx="${X(f.mark)}" cy="${Y}" r="9" fill="#f08aa6" stroke="${INK}" stroke-width="2.4"/>`;
    (f.letters || []).forEach(l => { s += `<circle cx="${X(l.at)}" cy="${Y}" r="10" fill="#f08aa6" stroke="${INK}" stroke-width="2.4"/>` + txt(X(l.at), Y - 20, l.ch, { size: 17, weight: 800 }); });
    return wrap(X0 * 2 + LW, Y + 42, s, "A number line from zero to one cut into equal parts", o.small);
  }

  function set(f, o) {
    const per = f.total / f.groups, R = 7; let s = "", x = 6;
    for (let g = 0; g < f.groups; g++) {
      const cols = Math.min(per, 4), rows = Math.ceil(per / cols), w = cols * 18 + 8, on = (f.shade || []).includes(g);
      s += `<rect x="${x}" y="6" width="${w}" height="${rows * 18 + 8}" rx="9" fill="${on ? "#fdecc8" : PAPER}" stroke="${on ? INK : EDGE}" stroke-width="${on ? 2.6 : 1.6}"/>`;
      for (let k = 0; k < per; k++) s += `<circle cx="${x + 13 + (k % cols) * 18}" cy="${19 + Math.floor(k / cols) * 18}" r="${R}" fill="${on ? "#f08aa6" : "#c9b8a6"}"/>`;
      x += w + 8;
    }
    return wrap(x, Math.ceil(per / Math.min(per, 4)) * 18 + 22, s, "The things put into equal groups", o.small);
  }

  const DRAW = { ruler, jug, bars, picto, tally, spinner, jar, solid, fracbar, fracline, set };
  function svg(fig, opts) { const f = DRAW[fig.t]; if (!f) throw new Error("Figure: unknown type " + fig.t); return f(fig, opts || {}); }
  function texts(fig, opts) { return (svg(fig, opts).match(/<text[^>]*>([^<]*)<\/text>/g) || []).map(t => t.replace(/<[^>]*>/g, "")); }
  /* the numbers a bar graph prints on its axis: a line every `scale`, a number on every second line */
  const fractionHtml = t => { const [a, b] = String(t).split("/"); return `<span class="frac" aria-hidden="true"><span class="fn">${esc(a)}</span><span class="fd">${esc(b)}</span></span>`; };

  const Figure = { svg, texts, solidSvg, SOLIDS, fractionHtml, COLORS: Object.keys(COLOR), axisNumbers: f => labelLines(Math.max(4, Math.ceil(maxOf(f.vals) / f.scale / 2) * 2)).map(k => k * f.scale) };
  if (typeof module !== "undefined" && module.exports) module.exports = Figure; else root.Figure = Figure;
})(typeof window !== "undefined" ? window : globalThis);
