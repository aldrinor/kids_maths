/* shapes_data.js — Geometry, Patterns, and Data and chance for Marie's maths game (BC Grades 1-3).
   Pushes five topics onto window.MathTopics: shapes_2d, shapes_3d, patterns, graphs, chance.
   Module contract: see CURRICULUM_MAP.md. make(level, prev): level is a 0-based index into levels
   (a level object from .levels is also accepted). All pictures are inline SVG drawn here, plus the
   project's own art/*.png through api.ART(key). Characters are our own fan drawings via api.face(id).
   Rule kept everywhere: the picture never shows the answer; Marie works it out by tapping or dragging. */
(function () {
  "use strict";
  const MT = (window.MathTopics = window.MathTopics || []);

  /* ================= Palette and small helpers ================= */
  const INK = "#3b2a33";
  const COL = { pink: "#ff6f9f", blue: "#74c8ff", green: "#63d3b3", yellow: "#ffc94a", purple: "#a98bff" };
  const DEEP = { pink: "#e0306b", blue: "#2386c8", green: "#1f9c7c", yellow: "#c58a12", purple: "#7b55e6" };
  const TINT = { pink: "#ffe4ee", blue: "#e0f3ff", green: "#e2f8f0", yellow: "#fff3cf", purple: "#efe8ff" };
  const CREAM = "#fff8ef", WOOD = "#f0bf87", WOOD_DEEP = "#c98a52", SUN = "#ffc94a", GOLD = "#ffb020";
  const FONT = `font-family="Baloo 2, Comic Sans MS, sans-serif" font-weight="800"`;
  const NAMES = { kitty: "Mimi", melody: "Bella", kuromi: "Lulu", purin: "Momo", cinna: "Puff" };
  const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const sample = (a, n) => shuffle(a).slice(0, n);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const r1 = v => Math.round(v * 10) / 10;
  let artPrefix = "art/"; // updated from api.ART on the first mount
  // Character faces in answer buttons: the buttons are made before the host hands us api.face, so they carry an
  // empty <g data-sd-face="id"> that is filled in from api.face as soon as a picture is mounted.
  let hostApi = null;
  function fillFaces() {
    if (!hostApi) return;
    document.querySelectorAll("[data-sd-face]").forEach(g => { if (!g.firstChild) { try { g.innerHTML = hostApi.face(g.getAttribute("data-sd-face")); } catch (e) {} } });
  }
  let faceWatch = null;
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

  /* ================= Styles (injected once, all prefixed sd-) ================= */
  function injectCSS() {
    if (document.getElementById("sd-style")) return;
    const s = document.createElement("style");
    s.id = "sd-style";
    s.textContent = `
.sd-root{position:relative;width:100%;height:100%;display:flex;flex-direction:column;gap:6px;min-width:0;min-height:0;box-sizing:border-box;color:${INK};font-family:"Baloo 2","Comic Sans MS",sans-serif;-webkit-user-select:none;user-select:none;touch-action:none;-webkit-tap-highlight-color:transparent}
.sd-svg{flex:1 1 auto;min-height:0;width:100%;display:block;overflow:visible}
.sd-svg [data-tap],.sd-svg [data-drag],.sd-svg [data-zone]{cursor:pointer}
.sd-svg [data-drag]{cursor:grab}
.sd-svg .sd-dragging{pointer-events:none;cursor:grabbing;filter:drop-shadow(0 8px 4px rgba(59,42,51,.3))}
.sd-svg text{pointer-events:none}
.sd-ctl{flex:none;display:flex;flex-wrap:wrap;gap:6px;justify-content:center;align-items:center}
.sd-ctl[hidden]{display:none}
.sd-btn{min-height:46px;min-width:46px;padding:0 14px;border:3px solid ${INK};border-radius:16px;box-shadow:0 4px 0 ${INK};background:#fff;color:${INK};font:800 19px "Baloo 2","Comic Sans MS",sans-serif;cursor:pointer;touch-action:manipulation;display:inline-flex;align-items:center;justify-content:center;gap:6px;box-sizing:border-box}
.sd-btn:active:not(:disabled){transform:translateY(3px);box-shadow:0 1px 0 ${INK}}
.sd-btn:disabled{opacity:.4;cursor:default}
.sd-btn.lilac{background:#a98bff;color:#fff;text-shadow:0 2px 0 rgba(59,42,51,.35)}
.sd-btn.pink{background:#ff6f9f;color:#fff;text-shadow:0 2px 0 rgba(59,42,51,.35)}
.sd-btn.mint{background:#63d3b3;color:#fff;text-shadow:0 2px 0 rgba(59,42,51,.35)}
.sd-btn.sun{background:#ffc94a}
.sd-btn.round{border-radius:50%;padding:0;width:46px}
.sd-btn svg{width:26px;height:26px}
.sd-btn.sd-glow{animation:sdBtnGlow 1s ease-in-out infinite;box-shadow:0 4px 0 ${INK},0 0 0 5px #ffd46b}
@keyframes sdBtnGlow{50%{box-shadow:0 4px 0 ${INK},0 0 0 9px #ffb020}}
.sd-svg .sd-glow{animation:sdGlow 1s ease-in-out infinite;filter:drop-shadow(0 0 3px #ffb020) drop-shadow(0 0 3px #ffb020)}
@keyframes sdGlow{50%{filter:drop-shadow(0 0 6px #ff9a00) drop-shadow(0 0 7px #ffb020)}}
.sd-svg g.sd-glow>rect:first-child{fill:#fff3cf;fill-opacity:.95;stroke:#ffb020;stroke-width:4}
.sd-svg rect.sd-glow,.sd-svg path.sd-glow,.sd-svg polygon.sd-glow,.sd-svg ellipse.sd-glow{stroke:#ff9a00;stroke-width:6}
.sd-svg g.sd-glow>line:first-child{stroke:#ffb020;stroke-opacity:.85}
.sd-svg g.sd-glow>circle:first-child{fill:#ffd46b;fill-opacity:.9}
.sd-svg g[data-hit].sd-glow>polygon:last-child,.sd-svg g[data-hit].sd-glow>ellipse:last-child{stroke:#ff9a00;stroke-width:6}
.sd-svg .sd-chunk{filter:drop-shadow(0 4px 0 ${INK})}
.sd-svg .sd-sel{filter:drop-shadow(0 0 4px #7b55e6) drop-shadow(0 0 3px #7b55e6)}
.sd-svg .sd-pop{animation:sdPop .35s ease-out}
@keyframes sdPop{0%{opacity:.2}60%{opacity:1}}
.sd-svg .sd-wig{animation:sdWig .5s ease}
@keyframes sdWig{30%{opacity:.75}}
.sd-svg .sd-spin{animation:sdSpin 1.1s cubic-bezier(.2,.7,.2,1)}
@keyframes sdSpin{from{transform:rotate(calc(var(--a) - 1080deg))}to{transform:rotate(var(--a))}}
.sd-svg .sd-flip{animation:sdFlip .7s ease-out}
@keyframes sdFlip{0%{transform:scaleX(1)}25%{transform:scaleX(.05)}50%{transform:scaleX(1)}75%{transform:scaleX(.05)}100%{transform:scaleX(1)}}
.sd-ch{display:inline-flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;line-height:1;font:800 18px "Baloo 2","Comic Sans MS",sans-serif;color:${INK}}
.sd-ch svg,.sd-ch img{width:52px;height:52px;display:block}
.sd-ch.word{font-size:22px}
.sd-ch.face svg{width:64px;height:64px}
.sd-ch svg.sd-own{width:auto;height:auto;max-width:100%;max-height:64px}
.sd-ch .sd-big{font-size:30px;line-height:1}
.sd-ch .sd-small{font-size:15px;color:#6e5562}
.sd-mini{display:inline-flex;flex-direction:column;align-items:center;gap:4px}
.sd-mini .sd-line{display:flex;flex-wrap:nowrap;gap:2px}
.sd-mini svg,.sd-mini img{width:24px;height:24px;flex:none}
.sd-letters{display:block;font:800 21px/1.15 "Baloo 2","Comic Sans MS",sans-serif;letter-spacing:0;word-spacing:-1px;text-align:center;white-space:nowrap;color:${INK}}
@media (min-width:900px){.sd-mini{gap:6px}.sd-mini .sd-line{gap:5px}.sd-mini svg,.sd-mini img{width:36px;height:36px}.sd-letters{font-size:28px;word-spacing:4px}}
.sd-svg .sd-roll{animation:sdRoll 1.2s ease-in-out}
@keyframes sdRoll{40%{transform:translateX(18%) rotate(150deg)}100%{transform:none}}
.sd-svg .sd-slide{animation:sdSlide 1.2s ease-in-out}
@keyframes sdSlide{40%{transform:translateX(14%)}100%{transform:none}}
@media (max-width:360px){.sd-mini .sd-line{gap:1px}.sd-mini svg,.sd-mini img{width:19px;height:19px}.sd-letters{font-size:18px}.sd-ch{font-size:16px}.sd-ch.word{font-size:18px}.sd-ch svg,.sd-ch img{width:44px;height:44px}.sd-ch.face svg{width:54px;height:54px}}
/* a short pattern in an answer button gets bigger pictures: 2 or 3 in a line have room to grow */
.sd-mini.sd-k2 svg,.sd-mini.sd-k2 img{width:34px;height:34px}.sd-mini.sd-k3 svg,.sd-mini.sd-k3 img{width:30px;height:30px}
@media (min-width:900px){.sd-mini.sd-k2 svg,.sd-mini.sd-k2 img,.sd-mini.sd-k3 svg,.sd-mini.sd-k3 img{width:36px;height:36px}}
@media (max-width:360px){.sd-mini.sd-k2 svg,.sd-mini.sd-k2 img{width:32px;height:32px}.sd-mini.sd-k3 svg,.sd-mini.sd-k3 img{width:25px;height:25px}}
@media (prefers-reduced-motion: reduce){.sd-root *,.sd-root *::before{animation:none!important;transition:none!important}}
`;
    document.head.appendChild(s);
  }

  /* ================= SVG drawing helpers ================= */
  const txt = (x, y, s, size = 20, opts = {}) =>
    `<text x="${r1(x)}" y="${r1(y)}" ${FONT} font-size="${size}" text-anchor="${opts.anchor || "middle"}" dominant-baseline="central" fill="${opts.fill || INK}"${opts.stroke ? ` stroke="${opts.stroke}" stroke-width="${opts.sw || 4}" paint-order="stroke fill" stroke-linejoin="round"` : ""}${opts.extra || ""}>${s}</text>`;
  const ptsStr = pts => pts.map(p => `${r1(p[0])},${r1(p[1])}`).join(" ");
  // A chunky shape: dark shadow 4 units below, then the filled shape with a 4-unit outline.
  function chunkyPoly(pts, fill, opts = {}) {
    const sw = opts.sw || 4, dy = opts.dy === undefined ? 4 : opts.dy;
    return `${dy ? `<polygon points="${ptsStr(pts.map(p => [p[0], p[1] + dy]))}" fill="${INK}" stroke="${INK}" stroke-width="${sw}" stroke-linejoin="round"/>` : ""}<polygon points="${ptsStr(pts)}" fill="${fill}" stroke="${INK}" stroke-width="${sw}" stroke-linejoin="round"${opts.extra || ""}/>`;
  }
  function chunkyCircle(cx, cy, r, fill, opts = {}) {
    const sw = opts.sw || 4, dy = opts.dy === undefined ? 4 : opts.dy;
    return `${dy ? `<circle cx="${r1(cx)}" cy="${r1(cy + dy)}" r="${r1(r)}" fill="${INK}"/>` : ""}<circle cx="${r1(cx)}" cy="${r1(cy)}" r="${r1(r)}" fill="${fill}" stroke="${INK}" stroke-width="${sw}"${opts.extra || ""}/>`;
  }
  function chunkyRect(x, y, w, h, rad, fill, opts = {}) {
    const sw = opts.sw || 3, dy = opts.dy === undefined ? 4 : opts.dy;
    return `${dy ? `<rect x="${r1(x)}" y="${r1(y + dy)}" width="${r1(w)}" height="${r1(h)}" rx="${rad}" fill="${INK}"/>` : ""}<rect x="${r1(x)}" y="${r1(y)}" width="${r1(w)}" height="${r1(h)}" rx="${rad}" fill="${fill}" stroke="${INK}" stroke-width="${sw}"${opts.extra || ""}/>`;
  }
  // A tap MARKS a thing: a mint circle with a white tick. It never carries a number, so the picture never shows a
  // running count: Marie counts the ticks herself. (Before 15 Oct 2026 each tap showed 1, 2, 3 ... and she only had to
  // wait for the last number.)
  function mark(x, y, small = false) {
    const r = small ? 8 : 11, k = r / 11;
    return `<g pointer-events="none" data-mark="1"><circle cx="${r1(x)}" cy="${r1(y)}" r="${r}" fill="${COL.green}" stroke="${INK}" stroke-width="${small ? 2 : 2.5}"/>` +
      `<path d="M${r1(x - 5 * k)} ${r1(y + 0.5 * k)} l${r1(3.5 * k)} ${r1(3.5 * k)} l${r1(6.5 * k)} ${r1(-7 * k)}" fill="none" stroke="#fff" stroke-width="${small ? 2.6 : 3.2}" stroke-linecap="round" stroke-linejoin="round"/></g>`;
  }
  // Tally marks for results (picks, spins, tosses): groups of five (four strokes and one across), never a number.
  // At most `cap` marks are drawn; Marie counts them herself. Returns the markup; w is the width used.
  const TALLY_CAP = 10;
  function tallyMarks(x, y, n, h = 20, step = 5, gGap = 8) {
    const m = Math.min(n, TALLY_CAP), groupW = 4 * step;
    let s = "", gx = x;
    for (let g = 0; g * 5 < m; g++) {
      const inG = Math.min(5, m - g * 5);
      for (let k = 0; k < Math.min(4, inG); k++) s += `<line x1="${r1(gx + k * step + 2)}" y1="${r1(y - h / 2)}" x2="${r1(gx + k * step + 2)}" y2="${r1(y + h / 2)}" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`;
      if (inG === 5) s += `<line x1="${r1(gx - 2)}" y1="${r1(y + h / 2 - 3)}" x2="${r1(gx + groupW + 2)}" y2="${r1(y - h / 2 + 3)}" stroke="${DEEP.pink}" stroke-width="3" stroke-linecap="round"/>`;
      gx += groupW + gGap;
    }
    if (n > TALLY_CAP) s += `<circle cx="${r1(gx - gGap / 2 + 3)}" cy="${r1(y)}" r="2.5" fill="${INK}"/><circle cx="${r1(gx - gGap / 2 + 10)}" cy="${r1(y)}" r="2.5" fill="${INK}"/>`;
    return `<g pointer-events="none" data-tally="${n}">${s}</g>`;
  }
  // Bow, centred at (x, y), about s units wide.
  const BOW_PATH = c => `<path d="M0 1 C-6 -15 -25 -18 -25 -3 C-25 11 -8 12 0 4 Z" fill="${c}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><path d="M0 1 C6 -15 25 -18 25 -3 C25 11 8 12 0 4 Z" fill="${c}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><ellipse cx="0" cy="2" rx="6.5" ry="7" fill="${c}" stroke="${INK}" stroke-width="3"/><path d="M-18 -8 q-3 4 -1 8" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" opacity=".75"/>`;
  const bow = (x, y, s, c) => `<g transform="translate(${r1(x)} ${r1(y + s * 0.05)}) scale(${r1(s / 52 * 100) / 100})">${BOW_PATH(c)}</g>`;
  const bowSVG = c => `<svg viewBox="-28 -18 56 32" aria-hidden="true">${BOW_PATH(c)}</svg>`;
  // Character head drawn by the host's face(id) in a nested 100x100 box.
  const faceAt = (api, id, x, y, s) => `<svg x="${r1(x - s / 2)}" y="${r1(y - s / 2)}" width="${r1(s)}" height="${r1(s)}" viewBox="0 0 100 100" overflow="visible">${api.face(id)}</svg>`;
  const faceSVG = (api, id) => `<svg viewBox="0 0 100 100" aria-hidden="true">${api.face(id)}</svg>`;
  const artAt = (api, k, x, y, s) => `<image href="${api.ART(k)}" x="${r1(x - s / 2)}" y="${r1(y - s / 2)}" width="${r1(s)}" height="${r1(s)}"/>`;
  const artIMG = (api, k) => `<img src="${api.ART(k)}" alt="">`;
  const speakerIcon = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="#d92f68"/><path d="M16 8.5a5 5 0 0 1 0 7" fill="none" stroke="#d92f68" stroke-width="2" stroke-linecap="round"/></svg>`;

  /* ================= The stage: one scalable SVG picture plus a row of buttons =================
     spec = { init(ctx) -> state, draw(ctx) -> svg markup, controls(ctx) -> html, onTap(ctx, id), onDrop(ctx, id, at) }
     Elements carry data-tap (tap), data-drag (drag or tap-to-pick-up), data-zone (drop place).
     A picked-up item (tap without moving) goes to the next zone Marie taps: drag is never required. */
  function stage(el, Q, api, spec) {
    injectCSS();
    try { const p = api.ART("KEYZ"); if (typeof p === "string" && p.endsWith("KEYZ.png")) artPrefix = p.slice(0, -8); } catch (e) {}
    hostApi = api; fillFaces(); setTimeout(fillFaces, 0);
    if (!faceWatch && typeof MutationObserver !== "undefined") {
      let pend = false;
      faceWatch = new MutationObserver(() => { if (pend) return; pend = true; requestAnimationFrame(() => { pend = false; fillFaces(); }); });
      faceWatch.observe(document.body, { childList: true, subtree: true });
    }
    if (el.__sd && !el.__sd.ctx.dead) el.__sd.destroy();
    const root = document.createElement("div");
    root.className = "sd-root";
    root.innerHTML = `<svg class="sd-svg" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet" role="img"></svg><div class="sd-ctl"></div>`;
    el.appendChild(root);
    const svg = root.firstChild, ctl = root.lastChild;

    const ctx = { Q, api, d: Q.data, st: null, glow: new Set(), teaching: false, only: null, onlyMsg: "", waiters: [], vw: 360, vh: 300, tall: true, dead: false, fresh: new Set(), root };
    ctx.g = id => (ctx.glow.has(id) ? " sd-glow" : "") + (ctx.st && ctx.st.sel === id ? " sd-sel" : "");
    ctx.say = t => { try { api.say(t); } catch (e) {} };
    ctx.speak = t => { try { api.speak(t); } catch (e) {} };
    ctx.tone = (f, d, t, g) => { try { api.tone(f, d, t, g); } catch (e) {} };
    // A counting tap makes a sound and a tick only. It never says or shows a running number.
    // Lesson rule (16 Oct 2026, the same in every lesson): Kitty shows HOW on the first taps only (ctx.aloud, from
    // demoTaps) and says those few numbers; then "Your turn. Keep counting." and Marie's taps get a tick, no number.
    // She never says the final count, nor the answer when it is a number (ctx.hush, a safety net).
    // Only in the count-together lesson (recount: her answer after the lesson was still wrong) does Kitty say every
    // number with Marie, tap by tap, so she is never left stuck.
    ctx.hush = null; ctx.aloud = 0; ctx.recounting = false;
    ctx.countAloud = n => {
      if (!ctx.teaching) return;
      if (ctx.recounting) { ctx.speak(String(n)); return; }
      if (ctx.aloud > 0 && (ctx.hush == null || String(n) !== String(ctx.hush))) { ctx.aloud--; ctx.speak(String(n)); }
    };
    let lastKey = "";
    // the picture's own units for a box of w x h screen pixels (also used by a spec to plan before it is drawn)
    ctx.viewFor = (w, h) => {
      const ratio = w > 0 && h > 0 ? w / h : 1.2, tall = ratio < (spec.tallBelow || 1.25);
      // about one picture unit per screen pixel, so text and tap targets keep their size on every screen
      const vw = Math.round(clamp(w, 300, tall ? 520 : 760)), vh = Math.round(clamp(vw / ratio, vw * 0.5, vw * 1.6));
      return { ratio, tall, vw, vh };
    };
    ctx.render = () => {
      if (ctx.dead) return;
      // a teaching step may light what fits the state NOW (a hop that is still small enough): worked out every redraw
      if (ctx.glowFn) ctx.glow = new Set(ctx.glowFn(ctx.st) || []);
      const ch = spec.controls ? spec.controls(ctx) : "";
      if (ch !== lastKey) { ctl.innerHTML = ch; lastKey = ch; }
      ctl.hidden = !ch;
      let r = svg.getBoundingClientRect();
      if (r.height < 40) { svg.style.height = Math.max(160, r.width * 0.75) + "px"; r = svg.getBoundingClientRect(); }
      const V = ctx.viewFor(r.width, r.height);
      ctx.tall = V.tall; ctx.vw = V.vw; ctx.vh = V.vh;
      // screen pixels per picture unit: a spec turns the 44 px tap rule into its own units with it
      const pxu = Math.min(r.width / ctx.vw, r.height / ctx.vh);
      ctx.px = pxu > 0 ? pxu : 1;
      svg.setAttribute("viewBox", `0 0 ${ctx.vw} ${ctx.vh}`);
      svg.innerHTML = spec.draw(ctx);
      ctx.fresh.clear();

    };
    ctx.changed = () => { ctx.render(); check(); };
    function check() { ctx.waiters = ctx.waiters.filter(w => { if (ctx.dead || w.pred(ctx.st)) { w.res(); return false; } return true; }); }
    // Teaching step: glow what to do next, say how, wait until Marie has done it.
    ctx.wait = (pred, opt = {}) => new Promise(res => {
      if (ctx.dead) return res();
      ctx.glowFn = typeof opt.glow === "function" ? opt.glow : null;
      ctx.glow = new Set(ctx.glowFn ? [] : opt.glow || []);
      ctx.only = opt.only || null;
      ctx.onlyMsg = opt.onlyMsg || "Try the one that glows.";
      if (opt.say) ctx.say(opt.say);
      ctx.render();
      // The host pulses ONE element. Mimi's own pick (data-teach) comes first. When several things glow alike (the
      // pictures to choose from, both hoops) and none is Mimi's pick, nothing is pulsed: the first one in the page
      // would be pointed at only because it is drawn first. Otherwise the first glowing element (as before).
      const lit = [...root.querySelectorAll(".sd-glow")], kind = e => (e.dataset.tap || e.dataset.drag || e.dataset.zone || "").split(":")[0];
      const first = lit.find(e => e.dataset.teach) || (lit.length > 1 && lit.every(e => kind(e) === kind(lit[0])) ? null : lit[0] || null);
      try { api.highlight(first); } catch (e) {}
      if (pred(ctx.st)) return res();
      ctx.waiters.push({ pred, res });
    });
    ctx.pause = ms => new Promise(res => setTimeout(res, ctx.dead ? 0 : ms));

    function svgPoint(cx, cy) {
      const r = svg.getBoundingClientRect();
      const s = Math.min(r.width / ctx.vw, r.height / ctx.vh) || 1;
      const ox = r.left + (r.width - ctx.vw * s) / 2, oy = r.top + (r.height - ctx.vh * s) / 2;
      return { x: (cx - ox) / s, y: (cy - oy) / s, s };
    }
    function allowed(kind, id, zone) {
      if (!ctx.only) return true;
      if (ctx.only(kind, id, zone, ctx.st)) return true;
      ctx.say(ctx.onlyMsg); ctx.tone([330], 0.15, "triangle");
      return false;
    }
    function doTap(id) { if (!spec.onTap || !allowed("tap", id)) return; spec.onTap(ctx, id); ctx.changed(); }
    function doDrop(id, at) {
      if (!spec.onDrop) return;
      if (!allowed("drop", id, at.zone)) { ctx.st.sel = null; ctx.render(); return; }
      spec.onDrop(ctx, id, at); ctx.st.sel = null; ctx.changed();
    }
    let drag = null, slide = null, eatUntil = 0; // clicks that follow a drag or a slide are ignored
    function onDown(e) {
      if (ctx.dead || e.button > 0) return;
      eatUntil = 0; // a new touch: the click left over from the last drag can no longer arrive
      const t = e.target.closest && e.target.closest("[data-drag]");
      if (t && svg.contains(t)) {
        e.preventDefault();
        try { root.setPointerCapture(e.pointerId); } catch (x) {}
        const p = svgPoint(e.clientX, e.clientY);
        drag = { id: t.dataset.drag, el: t, x0: e.clientX, y0: e.clientY, p0: p, moved: false, base: t.getAttribute("transform") || "" };
        return;
      }
      const s = e.target.closest && e.target.closest("[data-slide]");
      if (s && svg.contains(s)) { slide = { last: s }; e.preventDefault(); doTap(s.dataset.tap); eatUntil = Infinity; }
    }
    function onMove(e) {
      if (drag) {
        if (!drag.moved && Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 7) return;
        if (!drag.moved) { drag.moved = true; drag.el.classList.add("sd-dragging"); drag.el.parentNode.appendChild(drag.el); }
        const p = svgPoint(e.clientX, e.clientY);
        drag.el.setAttribute("transform", `translate(${r1(p.x - drag.p0.x)} ${r1(p.y - drag.p0.y)}) ${drag.base}`);
        return;
      }
      if (slide) {
        const hit = document.elementFromPoint(e.clientX, e.clientY);
        const t = hit && hit.closest && hit.closest("[data-slide]");
        if (t && t !== slide.last && svg.contains(t)) { slide.last = t; doTap(t.dataset.tap); }
      }
    }
    function onUp(e) {
      if (slide) { slide = null; eatUntil = performance.now() + 450; }
      if (!drag) return;
      const d = drag; drag = null;
      eatUntil = performance.now() + 450;
      if (!d.moved) {
        // something is already picked up and Marie taps a spot where another piece sits: drop it there
        if (ctx.st.sel != null && ctx.st.sel !== d.id) {
          const under = (document.elementsFromPoint(e.clientX, e.clientY) || []).map(h => h.closest && h.closest("[data-zone]")).find(z => z && svg.contains(z));
          if (under) { const p = svgPoint(e.clientX, e.clientY); doDrop(ctx.st.sel, { x: p.x, y: p.y, zone: under.dataset.zone, dragged: false }); return; }
        }
        if (!allowed("pick", d.id)) return;
        ctx.st.sel = ctx.st.sel === d.id ? null : d.id;
        if (spec.onPick) spec.onPick(ctx, d.id);
        ctx.tone([600], 0.06);
        ctx.changed();
        return;
      }
      const p = svgPoint(e.clientX, e.clientY);
      const hit = document.elementFromPoint(e.clientX, e.clientY);
      const z = hit && hit.closest && hit.closest("[data-zone]");
      doDrop(d.id, { x: p.x, y: p.y, dx: p.x - d.p0.x, dy: p.y - d.p0.y, zone: z && svg.contains(z) ? z.dataset.zone : null, dragged: true });
    }
    // Thick tap bands of lines (sides, edges) overlap on a small picture. The tap goes to the line whose middle part
    // is nearest to the finger, so every line can be tapped on itself, whichever band was drawn last.
    function nearestLine(cx, cy, fallback) {
      let best = fallback, bd = Infinity;
      svg.querySelectorAll("g[data-hit][data-tap] > line:first-child").forEach(l => {
        const m = l.getScreenCTM(); if (!m) return;
        const a = new DOMPoint(+l.getAttribute("x1"), +l.getAttribute("y1")).matrixTransform(m), b = new DOMPoint(+l.getAttribute("x2"), +l.getAttribute("y2")).matrixTransform(m);
        const dx = b.x - a.x, dy = b.y - a.y, L2 = dx * dx + dy * dy, t = L2 ? clamp(((cx - a.x) * dx + (cy - a.y) * dy) / L2, 0, 1) : 0;
        const d = Math.hypot(cx - (a.x + t * dx), cy - (a.y + t * dy));
        if (d < bd) { bd = d; best = l.parentNode.dataset.tap; }
      });
      return best;
    }
    function onClick(e) {
      if (ctx.dead) return;
      if (performance.now() < eatUntil) return;
      const t = e.target.closest && e.target.closest("[data-tap],[data-zone],[data-drag]");
      if (!t || !root.contains(t) || t.dataset.drag !== undefined) return;
      if (t.dataset.zone !== undefined && ctx.st.sel != null) {
        const p = svgPoint(e.clientX, e.clientY);
        doDrop(ctx.st.sel, { x: p.x, y: p.y, zone: t.dataset.zone, dragged: false });
        return;
      }
      if (t.dataset.tap !== undefined) doTap(t.dataset.hit !== undefined && t.firstElementChild && t.firstElementChild.tagName === "line" ? nearestLine(e.clientX, e.clientY, t.dataset.tap) : t.dataset.tap);
      else if (t.dataset.zone !== undefined && spec.onZoneTap) { spec.onZoneTap(ctx, t.dataset.zone); ctx.changed(); }
    }
    root.addEventListener("pointerdown", onDown);
    root.addEventListener("pointermove", onMove);
    root.addEventListener("pointerup", onUp);
    root.addEventListener("pointercancel", () => { if (drag) { drag = null; ctx.render(); } slide = null; eatUntil = performance.now() + 450; });
    root.addEventListener("click", onClick);
    let raf = 0;
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { if (!drag) ctx.render(); }); }) : null;
    const inst = {
      ctx, Q,
      destroy() {
        if (ctx.dead) return;
        ctx.dead = true; ctx.glowFn = null; if (ro) ro.disconnect(); cancelAnimationFrame(raf);
        (ctx.timers || []).forEach(clearTimeout);
        ctx.waiters.forEach(w => w.res()); ctx.waiters = [];
        root.remove(); if (el.__sd === inst) el.__sd = null;
      },
      reset() { if (ctx.dead) return; (ctx.timers || []).forEach(clearTimeout); ctx.st = spec.init(ctx); ctx.glowFn = null; ctx.glow.clear(); ctx.only = null; ctx.render(); }
    };
    ctx.st = spec.init(ctx);
    el.__sd = inst;
    ctx.render();
    if (ro) ro.observe(el);
    return inst;
  }
  // A "start again" kind of button. Until there is something to undo it is kept invisible (its space is kept, so the
  // picture does not jump when it appears): a reset button on a fresh picture has no purpose Marie can see.
  const resetBtn = (ctx, id, label, has, cls = "", aria = "") => `<button type="button" class="sd-btn${cls}${ctx.g(id)}" data-tap="${id}"${aria ? ` aria-label="${aria}"` : ""}${has ? "" : ' style="visibility:hidden" aria-hidden="true" tabindex="-1" disabled'}>${label}</button>`;
  const anyOn = o => !!o && Object.values(o).some(Boolean);
  function ctxTimer(ctx, fn, ms) { ctx.timers = ctx.timers || []; ctx.timers.push(setTimeout(() => { if (!ctx.dead) fn(); }, ms)); }

  /* ================= Topic wrapper ================= */
  // How many of the first counting taps Mimi says out loud in her lesson, before "Your turn. Keep counting."
  // n is the number of taps the count needs. 2 when n is 5 or more, 1 when n is 3 or 4, none when n is 1 or 2,
  // so the last number she says is always well before the final count.
  const demoTaps = n => (n >= 5 ? 2 : n >= 3 ? 1 : 0);
  const YOUR_TURN = "Your turn. Keep counting.";
  // The words for counting step k (0 = the first tap) of a lesson where Mimi shows the first `show` taps:
  // the opening words on the first step, "Your turn. Keep counting." when Marie takes over, nothing otherwise.
  // When Kitty shows no taps at all, the opening words already hand the counting to Marie.
  // In the count-together lesson (recount) Mimi counts every tap with her, so there is no "Your turn".
  function countSay(ctx, k, show, first) {
    if (k === 0) return ctx.recounting ? `${first} Mimi counts with you.` : show ? first : `${first} You count them.`;
    if (!ctx.recounting && k === show) return YOUR_TURN;
    return undefined;
  }
  // Waits for every counting tap in order. steps: [{ pred, glow, only, onlyMsg }], first: the opening words.
  // Between Mimi's last shown number and "Your turn" there is a short pause, so the number is not cut off.
  async function countAlong(ctx, steps, first, show) {
    if (show == null) show = demoTaps(steps.length);
    ctx.aloud = ctx.recounting ? 0 : show;
    for (let k = 0; k < steps.length; k++) {
      if (!ctx.recounting && k === show && show) await ctx.pause(700);
      const say = steps[k].say !== undefined ? steps[k].say : countSay(ctx, k, show, first);
      await ctx.wait(steps[k].pred, { glow: steps[k].glow, say, only: steps[k].only, onlyMsg: steps[k].onlyMsg });
    }
    ctx.aloud = 0;
  }
  // The question at the end of a counting lesson: never the number itself.
  const typeIt = (ctx, extra) => ctx.say((ctx.recounting ? "The last number we said is how many. " : "What number did you stop on? ") + (extra ? extra + " " : "") + "Type it.");
  function runLesson(L, Q, el, api, recounting) {
    let inst = el.__sd;
    if (!inst || inst.ctx.dead || inst.Q.key !== Q.key) inst = stage(el, Q, api, L.spec);
    else inst.reset();
    const ctx = inst.ctx;
    // a lesson started again (the count-together lesson) drops the steps an older lesson still waits on
    ctx.waiters = [];
    ctx.teaching = true; ctx.recounting = !!recounting; ctx.aloud = 0;
    ctx.hush = Q.input.type === "number" && /^\d+$/.test(String(Q.answer)) ? String(Q.answer) : null;
    return Promise.resolve().then(() => L.teach(ctx, Q)).catch(e => { console.error(e); }).then(() => {
      ctx.teaching = false; ctx.recounting = false; ctx.aloud = 0; ctx.hush = null; ctx.only = null; ctx.glowFn = null; ctx.glow.clear(); if (!ctx.dead) ctx.render();
    });
  }
  function topic(def) {
    const lv = level => {
      if (typeof level === "number") return clamp(Math.floor(level), 0, def.levels.length - 1);
      if (level && typeof level.index === "number") return clamp(Math.floor(level.index), 0, def.levels.length - 1);
      const i = def.levels.findIndex(L => L === level || (level && L.name === level.name));
      return i >= 0 ? i : 0;
    };
    const t = {
      id: def.id, title: def.title, icon: def.icon, strand: def.strand,
      levels: def.levels.map(L => ({ name: L.name, grade: L.grade, note: L.note })),
      make(level, prev) {
        const i = lv(level), L = def.levels[i];
        let Q = null;
        for (let k = 0; k < 40; k++) { Q = L.make(prev); if (!prev || `${def.id}:${i}:${Q.key}` !== prev.key) break; }
        Q.data.lv = i; Q.data.topic = def.id;
        Q.key = `${def.id}:${i}:${Q.key}`;
        if (prev && Q.key === prev.key) Q = t.make(level, null);
        return Q;
      },
      mount(el, Q, api) { const L = def.levels[Q.data.lv]; const inst = stage(el, Q, api, L.spec); return { destroy: inst.destroy, reset: inst.reset }; },
      hint(Q, tries) { return def.levels[Q.data.lv].hint(Q, tries || 2); },
      teach(Q, el, api) { return runLesson(def.levels[Q.data.lv], Q, el, api, false); },
      // Step 4 of the lesson rule: the host calls this when Marie's answer AFTER the lesson is still wrong.
      // The same lesson again, but Kitty counts every tap out loud with her, up to the last number; then Marie types it.
      recount(Q, el, api) { return runLesson(def.levels[Q.data.lv], Q, el, api, true); }
    };
    MT.push(t);
    return t;
  }

  /* =====================================================================================
     CHANCE  (Data and chance)
     ===================================================================================== */
  // Life events with an obvious answer. The Python test keeps its own copy of this table.
  const EVENTS = [
    { t: "Will it snow in the classroom?", a: "never", pic: "snow" },
    { t: "Will a teddy bear eat your lunch?", a: "never", pic: "art:teddy" },
    { t: "Will a frog drive a car?", a: "never", pic: "art:frog" },
    { t: "Will a cupcake sing a song?", a: "never", pic: "art:cupcake" },
    { t: "Will a cat turn into a fish?", a: "never", pic: "art:cat" },
    { t: "Will the sun come up tomorrow?", a: "always", pic: "sun" },
    { t: "Will a ball fall down when you drop it?", a: "always", pic: "art:soccer" },
    { t: "Will ice cream melt in a hot oven?", a: "always", pic: "art:icecream" },
    { t: "Will a fish need water to live?", a: "always", pic: "art:fish" },
    { t: "Will it rain today?", a: "sometimes", pic: "rain" },
    { t: "Will you see a puppy at the park?", a: "sometimes", pic: "art:puppy" },
    { t: "Will you have cookies for a snack?", a: "sometimes", pic: "art:cookie" },
    { t: "Will a balloon pop?", a: "sometimes", pic: "art:balloon" },
    { t: "Will you get a gift today?", a: "sometimes", pic: "art:gift" }
  ];
  const WORDS_G1 = ["never", "sometimes", "always"];
  // Grade 2 words. The middle one is "maybe" (BC: "uncertain"): it might happen, it might not. "Possible" would be
  // wrong there, because a certain event is possible too.
  const WORDS_G2 = ["impossible", "maybe", "certain"];
  const G2_OF = { never: "impossible", sometimes: "maybe", always: "certain" };
  // The three words as a circle that fills up: empty with a cross (never), half full (sometimes), full (always).
  // Lilac, not gold: a gold "always" circle looked like the sun card ("Will the sun come up?") and gave the answer away.
  const LIKELY = "#a98bff";
  function wordIcon(w) {
    const k = { never: 0, impossible: 0, sometimes: 1, maybe: 1, always: 2, certain: 2 }[w];
    const body = k === 0
      ? `<circle cx="20" cy="20" r="15" fill="#fff" stroke="${INK}" stroke-width="3"/><path d="M13 13l14 14M27 13l-14 14" stroke="#c2511a" stroke-width="4" stroke-linecap="round"/>`
      : k === 1
        ? `<circle cx="20" cy="20" r="15" fill="#fff" stroke="${INK}" stroke-width="3"/><path d="M20 5a15 15 0 0 1 0 30z" fill="${LIKELY}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`
        : `<circle cx="20" cy="20" r="15" fill="${LIKELY}" stroke="${INK}" stroke-width="3"/>`;
    return body;
  }
  const wordChoice = w => ({ value: w, label: cap(w), html: `<span class="sd-ch"><svg viewBox="-2 -2 44 44" aria-hidden="true">${wordIcon(w)}</svg><span>${cap(w)}</span></span>` });
  function picture(api, pic, x, y, s) {
    if (pic.startsWith("art:")) return artAt(api, pic.slice(4), x, y, s);
    const k = s / 100;
    const g = inner => `<g transform="translate(${r1(x - s / 2)} ${r1(y - s / 2)}) scale(${r1(k * 100) / 100})">${inner}</g>`;
    if (pic === "sun") return g(`<g stroke="${INK}" stroke-width="5" stroke-linecap="round">${[0, 45, 90, 135, 180, 225, 270, 315].map(a => `<line x1="${50 + 30 * Math.cos(a * Math.PI / 180)}" y1="${56 + 30 * Math.sin(a * Math.PI / 180)}" x2="${50 + 44 * Math.cos(a * Math.PI / 180)}" y2="${56 + 44 * Math.sin(a * Math.PI / 180)}"/>`).join("")}</g><circle cx="50" cy="56" r="25" fill="${SUN}" stroke="${INK}" stroke-width="5"/><path d="M41 60 q9 8 18 0" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/><circle cx="42" cy="51" r="3.5" fill="${INK}"/><circle cx="58" cy="51" r="3.5" fill="${INK}"/>`);
    if (pic === "snow") return g(`<g stroke="#2386c8" stroke-width="7" stroke-linecap="round">${[0, 60, 120].map(a => `<g transform="rotate(${a} 50 50)"><line x1="50" y1="10" x2="50" y2="90"/><path d="M38 20 L50 30 L62 20 M38 80 L50 70 L62 80" fill="none"/></g>`).join("")}</g><circle cx="50" cy="50" r="7" fill="#fff" stroke="#2386c8" stroke-width="4"/>`);
    if (pic === "rain") return g(`<path d="M22 62 a16 16 0 0 1 4 -31 a22 22 0 0 1 42 -6 a17 17 0 0 1 12 37 z" fill="#e0f3ff" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>${[30, 50, 70].map((dx, i) => `<path d="M${dx} ${74 + (i % 2) * 6} q-5 8 0 12 q5 -4 0 -12z" fill="#74c8ff" stroke="${INK}" stroke-width="3"/>`).join("")}`);
    return "";
  }

  /* ----- event card on a never .. always scale ----- */
  const eventSpec = {
    init: () => ({ at: null, sel: null, ask: null, said: {} }),
    draw(ctx) {
      const { vw, vh, st, d, api } = ctx, words = d.words;
      let cx, cy, cs, spots;
      // card beside the scale only when the three word spots (66 wide, labels up to about 95) get room;
      // on a small wide picture (iPhone SE) they would pile on top of each other, so the card goes above instead
      const sideRoom = vw - (clamp(vh * 0.55, 110, 180) + 70) - 20;
      if (ctx.tall || sideRoom < 290) {
        const sy0 = vh - 72;
        cs = Math.min(clamp(vh * 0.46, 90, 172), sy0 - 33 - 22); cx = vw / 2; cy = Math.max(10 + cs / 2, Math.min((vh - 96) / 2, sy0 - 33 - 12 - cs / 2));
        const sy = vh - 72; spots = words.map((w, i) => ({ w, x: vw * (i * 2 + 1) / 6, y: sy }));
      } else {
        cs = clamp(vh * 0.55, 110, 180); cx = 24 + cs / 2; cy = vh / 2 - 10;
        const x0 = cs + 70, span = vw - x0 - 20; spots = words.map((w, i) => ({ w, x: x0 + span * (i * 2 + 1) / 6, y: vh / 2 + 10 }));
      }
      let s = "";
      // the scale: a ribbon from white (never) to lilac (always), like the icons
      const a = spots[0], b = spots[2];
      s += `<defs><linearGradient id="sd_scale" x1="0" x2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".5" stop-color="#e4dbff"/><stop offset="1" stop-color="${LIKELY}"/></linearGradient></defs>`;
      s += chunkyRect(a.x, a.y - 11, b.x - a.x, 22, 11, "url(#sd_scale)");
      for (const p of spots) {
        s += `<g data-zone="spot:${p.w}" class="${ctx.g("spot:" + p.w).trim()}">${chunkyCircle(p.x, p.y, 33, "#fff", { sw: 3.5 })}` +
          `<g transform="translate(${r1(p.x - 22)} ${r1(p.y - 22)}) scale(1.1)">${wordIcon(p.w)}</g></g>` +
          txt(p.x, p.y + 50, cap(p.w), 19, { stroke: "#fff", sw: 5 });
      }
      // the event card (draggable)
      let px = cx, py = cy, ps = cs;
      if (st.at) { const p = spots.find(q => q.w === st.at); ps = 70; px = p.x; py = p.y - 80; }
      s += `<g data-drag="card" class="${ctx.g("card").trim()}">${chunkyRect(px - ps / 2, py - ps / 2, ps, ps, 18, CREAM)}${picture(api, d.pic, px, py, ps * 0.72)}</g>`;
      if (st.ask) {
        const by = ctx.tall ? cy + cs / 2 + 34 : cy + cs / 2 + 34, bx = ctx.tall ? vw / 2 : cx;
        for (const [k, dx] of [["yes", -58], ["no", 58]]) {
          const right = ctx.teaching && st.askRight === k;
          s += `<g data-tap="yn:${k}" class="${ctx.g("yn:" + k).trim()}"${right ? ' data-teach="1"' : ""}>${chunkyRect(bx + dx - 48, by - 24, 96, 48, 16, k === "yes" ? "#63d3b3" : "#ff9fb8")}${txt(bx + dx, by, cap(k), 22, { fill: "#fff", stroke: INK, sw: 4 })}</g>`;
        }
      }
      return s;
    },
    onDrop(ctx, id, at) {
      if (at.zone && at.zone.startsWith("spot:")) { ctx.st.at = at.zone.slice(5); ctx.tone([523, 659], 0.08); ctx.speak(cap(ctx.st.at)); }
      else ctx.st.at = null;
    },
    onTap(ctx, id) { if (id.startsWith("yn:")) { ctx.st.yn = id.slice(3); ctx.tone([600], 0.07); } }
  };
  async function teachEvent(ctx, Q) {
    const cls = Q.data.cls, st = ctx.st;
    st.ask = "can"; st.askRight = cls === "never" ? "no" : "yes"; st.yn = null;
    await ctx.wait(s => s.yn === s.askRight, { glow: ["yn:yes", "yn:no"], say: "Let's think. Can this really happen? Tap yes or no.", only: (k, id) => k !== "tap" || id === "yn:" + st.askRight, onlyMsg: "Think again. Can it really happen?" });
    if (cls === "never") { ctx.say("No. It can not happen. Now pick the word."); st.ask = null; return; }
    st.ask = "every"; st.askRight = cls === "always" ? "yes" : "no"; st.yn = null;
    await ctx.wait(s => s.yn === s.askRight, { glow: ["yn:yes", "yn:no"], say: "Yes, it can happen. Does it happen every single time?", only: (k, id) => k !== "tap" || id === "yn:" + st.askRight, onlyMsg: "Think again. Every single time?" });
    st.ask = null;
    ctx.say(cls === "always" ? "Yes, every time. Now pick the word." : "Not every time. Now pick the word.");
  }

  /* ----- a clear jar of bows: count them, and pick one without looking ----- */
  function bagLayout(ctx) {
    const { vw, vh, d } = ctx, n = d.bows.length;
    // tally beside the jar or below it: on a narrow picture take whichever gives the bigger bows
    // the tally beside the jar: a bow and up to ten tally marks (closer marks on a narrow picture, so the bows stay big)
    const sideW = vw < 380 ? 86 : 104;
    // width left for the bows: jar walls 26, outer margins 10, and the gap (10) plus the tally when it sits beside
    const cellFor = (tw, th, c) => Math.min((vw - (tw ? tw + 10 : 0) - 36) / c, (vh - 60 - th) / Math.ceil(n / c), 72);
    const bestCell = (tw, th) => { let k = 0; for (let c = 2; c <= 6; c++) k = Math.max(k, cellFor(tw, th, c)); return k; };
    const below = ctx.tall && (vh > 330 || bestCell(0, 76) > bestCell(sideW, 0) + 1); ctx.bagBelow = below;
    const tallyW = below ? 0 : sideW, tallyH = below ? 76 : 0;
    // pick the number of columns that gives the biggest bows
    let cols = 2, cell = 0;
    for (let c = 2; c <= 6; c++) { const k = cellFor(tallyW, tallyH, c); if (k > cell + 0.5) { cell = k; cols = c; } }
    const rows = Math.ceil(n / cols);
    const jw = cols * cell + 26, jx = (vw - jw - (tallyW ? tallyW + 10 : 0)) / 2;
    const jh = rows * cell + 34, jy = Math.max(26, (vh - tallyH - jh) / 2 + 6);
    const pos = d.bows.map((c, i) => ({ c, x: jx + 13 + cell * (i % cols + 0.5) + (jw - 26 - cols * cell) / 2, y: jy + 20 + cell * (Math.floor(i / cols) + 0.5) }));
    return { jx, jy, jw, jh, cell, pos, tx: jx + jw + 10, tallyW, tallyY: jy + jh + 26 };
  }
  const bagSpec = {
    init: ctx => ({ badge: {}, count: {}, picks: {}, last: null, nPick: 0 }),
    draw(ctx) {
      const { st, d } = ctx, L = bagLayout(ctx);
      let s = "";
      // jar
      s += `<rect x="${r1(L.jx + L.jw * 0.18)}" y="${r1(L.jy - 22)}" width="${r1(L.jw * 0.64)}" height="26" rx="10" fill="${COL.pink}" stroke="${INK}" stroke-width="3"/>`;
      s += chunkyRect(L.jx, L.jy, L.jw, L.jh, 26, "#eef8ff");
      s += `<rect x="${r1(L.jx + 10)}" y="${r1(L.jy + 12)}" width="10" height="${r1(L.jh * 0.6)}" rx="5" fill="#fff" opacity=".9"/>`;
      L.pos.forEach((p, i) => {
        s += `<g data-tap="bow:${i}" class="${ctx.g("bow:" + i).trim()}"><rect x="${r1(p.x - L.cell / 2)}" y="${r1(p.y - L.cell / 2)}" width="${r1(L.cell)}" height="${r1(L.cell)}" fill="#fff" fill-opacity=".01"/>${bow(p.x, p.y, L.cell * 0.84, COL[p.c])}</g>`;
        // a counted bow gets a tick, never a number: Marie counts the ticks of each colour herself
        if (st.badge[i]) s += mark(p.x + L.cell * 0.3, p.y - L.cell * 0.3, L.cell < 40);
      });
      // tally of picks: tally marks in groups of five, never a number
      const colours = d.colours;
      if (ctx.bagBelow) {
        const y = L.tallyY, cw = Math.min(110, (ctx.vw - 16) / colours.length), x0 = ctx.vw / 2 - (cw * colours.length) / 2;
        s += txt(ctx.vw / 2, y, "Picked", 16, { fill: "#6e5562" });
        colours.forEach((c, i) => { const x = x0 + cw * i; s += bow(x + 16, y + 32, 30, COL[c]) + tallyMarks(x + 36, y + 32, st.picks[c] || 0); });
        if (st.last) s += `<g class="sd-pop">${bow(ctx.vw - 34, L.jy + 10, 50, COL[st.last])}</g>`;
        return s;
      }
      // tally beside the jar: a bow, then its tally marks; the rows close up a little when the picture is short
      const slim = L.tallyW < 100, bx = 16, nx = 32, boxW = Math.min(74, L.tallyW - 4), boxH = 52;
      let ty = Math.max(14, L.jy - 6);
      s += txt(L.tx + L.tallyW / 2, ty, "Picked", slim ? 16 : 17, { fill: "#6e5562" });
      ty += 30;
      const step = clamp((ctx.vh - 6 - boxH - ty) / colours.length, 34, 40);
      for (const c of colours) {
        s += bow(L.tx + bx, ty, 30, COL[c]) + (slim ? tallyMarks(L.tx + nx, ty, st.picks[c] || 0, 18, 4, 6) : tallyMarks(L.tx + nx, ty, st.picks[c] || 0));
        ty += step;
      }
      ty -= 14;
      if (st.last) s += `<g class="sd-pop">${chunkyRect(L.tx + 2, ty, boxW, boxH, 16, "#fff")}${bow(L.tx + 2 + boxW / 2, ty + boxH / 2, boxH - 8, COL[st.last])}</g>`;
      return s;
    },
    controls: ctx => `<button type="button" class="sd-btn pink${ctx.g("pick")}" data-tap="pick">Pick one without looking</button>`,
    onTap(ctx, id) {
      const st = ctx.st, d = ctx.d;
      if (id === "pick") {
        const c = d.bows[Math.floor(Math.random() * d.bows.length)];
        st.picks[c] = (st.picks[c] || 0) + 1; st.last = c; st.nPick++;
        ctx.tone([700, 880], 0.07); ctx.speak(c);
        return;
      }
      if (id.startsWith("bow:")) {
        const i = +id.slice(4); if (st.badge[i]) return;
        const c = d.bows[i]; st.count[c] = (st.count[c] || 0) + 1; st.badge[i] = st.count[c];
        ctx.tone([560 + st.badge[i] * 30], 0.06); ctx.countAloud(st.badge[i]);
      }
    }
  };
  async function teachCountColours(ctx, Q, items, what) {
    // items: [{id, c}] in display order. Marie counts one colour at a time. Mimi shows how on the first colour's
    // first taps only; every other count is Marie's own (lesson rule of 16 Oct 2026).
    const colours = Q.data.colours;
    for (let ci = 0; ci < colours.length; ci++) {
      const c = colours[ci], mine = items.filter(it => it.c === c);
      const steps = mine.map(it => ({ pred: s => !!s.badge[it.id.split(":")[1]], glow: [it.id], only: (kind, id) => kind !== "tap" || id === it.id, onlyMsg: `Tap the ${c} one that glows.` }));
      await countAlong(ctx, steps, ci === 0 ? `Count the ${c} ${what}. Tap each one.` : `Now the ${c} ${what}. Tap each one.`, ci === 0 ? undefined : 0);
      await ctx.pause(400);
    }
  }
  async function teachBag(ctx, Q) {
    const items = Q.data.bows.map((c, i) => ({ id: "bow:" + i, c }));
    await teachCountColours(ctx, Q, items, "bows");
    const d = Q.data;
    if (d.ask === "compare") ctx.say(`Which colour has more bows? More bows means more likely. The same number means just as likely.`);
    else if (d.ask === "less") ctx.say(`Which colour has the fewest bows? That one is ${d.colours.length === 3 ? "least" : "less"} likely.`);
    else ctx.say(`Which colour has the most bows? That one is ${d.colours.length === 3 ? "most" : "more"} likely.`);
  }

  /* ----- a spinner with equal parts ----- */
  // Where the arrow rests before the first spin: on the line between two parts of different colours, so it never
  // starts out pointing at the answer colour. Part i runs from i*360/n to (i+1)*360/n degrees, clockwise from the top.
  function spinRest(sectors) {
    const n = sectors.length, i = sectors.findIndex((c, k) => c !== sectors[(k + n - 1) % n]);
    return i < 0 ? 0 : Math.round(i * 360 / n);
  }
  const spinSpec = {
    init: ctx => ({ badge: {}, count: {}, picks: {}, ang: spinRest(ctx.d.sectors), spun: 0, last: null }),
    draw(ctx) {
      const { vw, vh, st, d } = ctx, n = d.sectors.length;
      // side-by-side only when there is room for a big spinner and the tally; otherwise stack them
      const tall = ctx.tall || vw < 440;
      const tallyW = tall ? 0 : 190;
      const R = tall ? Math.min(vw / 2 - 26, (vh - 92) / 2, 150) : Math.min((vw - tallyW - 40) / 2, (vh - 30) / 2, 150);
      const cx = tall ? vw / 2 : (vw - tallyW) / 2 + 6, cy = tall ? 14 + R : vh / 2 + 4;
      let s = `<circle cx="${r1(cx)}" cy="${r1(cy + 5)}" r="${r1(R)}" fill="${INK}"/>`;
      for (let i = 0; i < n; i++) {
        const a0 = (i / n) * 2 * Math.PI - Math.PI / 2, a1 = ((i + 1) / n) * 2 * Math.PI - Math.PI / 2, am = (a0 + a1) / 2;
        const p0 = [cx + R * Math.cos(a0), cy + R * Math.sin(a0)], p1 = [cx + R * Math.cos(a1), cy + R * Math.sin(a1)];
        const c = d.sectors[i];
        s += `<path data-tap="sec:${i}" class="${ctx.g("sec:" + i).trim()}" d="M${r1(cx)} ${r1(cy)} L${r1(p0[0])} ${r1(p0[1])} A${r1(R)} ${r1(R)} 0 0 1 ${r1(p1[0])} ${r1(p1[1])} Z" fill="${COL[c]}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>`;
        if (st.badge[i]) s += mark(cx + R * 0.68 * Math.cos(am), cy + R * 0.68 * Math.sin(am));
      }
      // the arrow
      s += `<g class="${st.spunNow ? "sd-spin" : ""}" style="--a:${st.ang}deg;transform-origin:${r1(cx)}px ${r1(cy)}px;transform:rotate(${st.ang}deg)" pointer-events="none">` +
        `<path d="M${r1(cx - 13)} ${r1(cy + 6)} L${r1(cx - 5)} ${r1(cy - R * 0.62)} L${r1(cx - 15)} ${r1(cy - R * 0.62)} L${r1(cx)} ${r1(cy - R * 0.86)} L${r1(cx + 15)} ${r1(cy - R * 0.62)} L${r1(cx + 5)} ${r1(cy - R * 0.62)} L${r1(cx + 13)} ${r1(cy + 6)} Z" fill="#fff" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/></g>`;
      s += `<circle cx="${r1(cx)}" cy="${r1(cy)}" r="15" fill="${COL.pink}" stroke="${INK}" stroke-width="4" pointer-events="none"/>`;
      st.spunNow = false;
      // tally of stops: tally marks in groups of five, never a number
      if (tall) {
        const n2 = d.colours.length, ty = cy + R + 22, cw = Math.min(110, (vw - 12) / n2), x0 = vw / 2 - (n2 * cw) / 2;
        s += txt(vw / 2, ty, "Stops", 16, { fill: "#6e5562" });
        d.colours.forEach((c, i) => { const x = x0 + i * cw; s += `<circle cx="${r1(x + 16)}" cy="${r1(ty + 30)}" r="12" fill="${COL[c]}" stroke="${INK}" stroke-width="3"/>` + tallyMarks(x + 36, ty + 30, st.picks[c] || 0); });
      } else {
        const tx = cx + R + 22; let ty = Math.max(20, cy - R + 6);
        s += txt(tx + 50, ty, "Stops", 17, { fill: "#6e5562" }); ty += 32;
        for (const c of d.colours) {
          s += `<circle cx="${r1(tx + 16)}" cy="${r1(ty)}" r="13" fill="${COL[c]}" stroke="${INK}" stroke-width="3"/>` + tallyMarks(tx + 36, ty, st.picks[c] || 0);
          ty += 38;
        }
      }
      return s;
    },
    controls: ctx => `<button type="button" class="sd-btn pink${ctx.g("spin")}" data-tap="spin">Spin</button>`,
    onTap(ctx, id) {
      const st = ctx.st, d = ctx.d, n = d.sectors.length;
      if (id === "spin") {
        const extra = Math.random() * 360;
        st.ang = Math.round((st.ang % 360) + 360 + extra);
        let k = Math.floor((((st.ang % 360) + 360) % 360) / (360 / n));
        const c = d.sectors[k]; st.picks[c] = (st.picks[c] || 0) + 1; st.last = c; st.spun++; st.spunNow = true;
        ctx.tone([500, 600, 700, 800], 0.06, "sine", 0.12);
        ctxTimer(ctx, () => ctx.speak(c), 1100);
        return;
      }
      if (id.startsWith("sec:")) {
        const i = +id.slice(4); if (st.badge[i]) return;
        const c = d.sectors[i]; st.count[c] = (st.count[c] || 0) + 1; st.badge[i] = st.count[c];
        ctx.tone([560 + st.badge[i] * 30], 0.06); ctx.countAloud(st.badge[i]);
      }
    }
  };
  async function teachSpin(ctx, Q) {
    const items = Q.data.sectors.map((c, i) => ({ id: "sec:" + i, c }));
    await teachCountColours(ctx, Q, items, "parts");
    ctx.say("All parts are the same size. The colour with the most parts is more likely.");
  }

  /* ----- a coin ----- */
  function coinFace(api, side, x, y, R) {
    return `${chunkyCircle(x, y, R, side === "h" ? "#ffd76a" : "#e3e7ee")}<circle cx="${r1(x)}" cy="${r1(y)}" r="${r1(R * 0.8)}" fill="none" stroke="${INK}" stroke-width="2" stroke-dasharray="4 5" opacity=".55"/>` +
      (side === "h" ? faceAt(api, "kitty", x, y + R * 0.04, R * 1.25) : bow(x, y, R * 1.15, COL.pink));
  }
  const coinSpec = {
    init: () => ({ side: "h", picks: { heads: 0, tails: 0 }, tossed: 0, badge: {}, flipNow: false }),
    draw(ctx) {
      const { vw, vh, st, api } = ctx;
      const R = Math.min(vh * 0.27, ctx.tall ? 78 : 92), cx = ctx.tall ? vw * 0.36 : vw * 0.3, cy = ctx.tall ? vh * 0.36 : vh / 2 - 6;
      let s = `<g class="${st.flipNow ? "sd-flip" : ""}" style="transform-origin:${r1(cx)}px ${r1(cy)}px">${coinFace(api, st.side, cx, cy, R)}</g>`;
      s += txt(cx, cy + R + 24, st.tossed ? (st.side === "h" ? "Heads" : "Tails") : "", 22);
      st.flipNow = false;
      // the two sides, small, to tap
      const sx = ctx.tall ? vw * 0.82 : vw * 0.62, r = 30;
      const sy0 = ctx.tall ? cy - 46 : cy - 50;
      [["h", "Heads"], ["t", "Tails"]].forEach(([k, w], i) => {
        const y = sy0 + i * 96;
        s += `<g data-tap="side:${k}" class="${ctx.g("side:" + k).trim()}">${coinFace(api, k, sx, y, r)}</g>` + txt(sx, y + r + 16, w, 17);
        if (st.badge[k]) s += mark(sx + r, y - r);
      });
      // tally of tosses: a small coin side, then tally marks in groups of five (never a number)
      if (ctx.tall) {
        const ty = vh - 24, half = Math.min(150, vw / 2 - 6), x0 = vw / 2 - half;
        [["h", "heads"], ["t", "tails"]].forEach(([k, w], i) => { const x = x0 + i * half + 8; s += `<g pointer-events="none">${coinFace(api, k, x + 14, ty, 14)}</g>` + tallyMarks(x + 36, ty, st.picks[w]); });
      } else {
        const tx = vw * 0.75, ty = cy - 30;
        [["h", "heads"], ["t", "tails"]].forEach(([k, w], i) => { const y = ty + i * 44; s += `<g pointer-events="none">${coinFace(api, k, tx + 14, y, 15)}</g>` + tallyMarks(tx + 38, y, st.picks[w]); });
      }
      return s;
    },
    controls: ctx => `<button type="button" class="sd-btn pink${ctx.g("toss")}" data-tap="toss">Toss the coin</button>`,
    onTap(ctx, id) {
      const st = ctx.st;
      if (id === "toss") { st.side = Math.random() < 0.5 ? "h" : "t"; st.picks[st.side === "h" ? "heads" : "tails"]++; st.tossed++; st.flipNow = true; ctx.tone([880, 990], 0.05); ctxTimer(ctx, () => ctx.speak(st.side === "h" ? "Heads" : "Tails"), 700); return; }
      if (id.startsWith("side:")) { const k = id.slice(5); if (!st.badge[k]) st.badge[k] = Object.keys(st.badge).length + 1; ctx.speak(k === "h" ? "Heads" : "Tails"); }
    }
  };
  async function teachCoin(ctx) {
    await ctx.wait(s => !!s.badge.h, { glow: ["side:h"], say: "A coin has two sides. Tap the heads side.", only: (k, id) => k !== "tap" || id === "side:h" });
    await ctx.wait(s => !!s.badge.t, { glow: ["side:t"], say: "Now tap the tails side.", only: (k, id) => k !== "tap" || id === "side:t" });
    ctx.say("One heads side. One tails side. Is one side more likely, or is it the same chance?");
  }

  const colourChoice = (c, swatch) => ({ value: c, label: cap(c), html: `<span class="sd-ch">${swatch ? `<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="16" fill="${COL[c]}" stroke="${INK}" stroke-width="3"/></svg>` : bowSVG(COL[c])}<span>${cap(c)}</span></span>` });
  const plainChoice = (value, label, html) => ({ value, label, html: html || `<span class="sd-ch word">${label}</span>` });

  function makeEvent(words) {
    const i = ri(0, EVENTS.length - 1), e = EVENTS[i];
    const ans = words === WORDS_G1 ? e.a : G2_OF[e.a];
    return { key: "ev" + i + (words === WORDS_G1 ? "a" : "b"), say: e.t, show: e.t, answer: ans,
      input: { type: "choice", choices: words.map(wordChoice) },
      data: { kind: "event", ev: i, text: e.t, cls: e.a, pic: e.pic, words: words.slice() } };
  }
  function bowsFromCounts(counts) { const out = []; for (const [c, n] of Object.entries(counts)) for (let k = 0; k < n; k++) out.push(c); return shuffle(out); }

  topic({
    id: "chance", title: "What's likely?", strand: "Data and chance",
    icon: `<svg viewBox="0 0 64 64" aria-hidden="true"><rect x="14" y="16" width="36" height="42" rx="12" fill="#eef8ff" stroke="${INK}" stroke-width="3.5"/><rect x="20" y="9" width="24" height="10" rx="4" fill="${COL.pink}" stroke="${INK}" stroke-width="3.5"/><g transform="translate(26 32) scale(.55)">${BOW_PATH(COL.pink)}</g><g transform="translate(39 33) scale(.55)">${BOW_PATH(COL.pink)}</g><g transform="translate(32 46) scale(.55)">${BOW_PATH(COL.blue)}</g></svg>`,
    levels: [
      { name: "Never, sometimes, always", grade: 1, note: "BC Gr 1: likelihood of familiar life events.",
        make: () => makeEvent(WORDS_G1), spec: eventSpec, teach: teachEvent,
        hint: () => "Think. Can it happen? Does it happen every time? Drag the card to a word." },
      { name: "Certain or impossible", grade: 2, note: "BC Gr 2: certain, uncertain; more, less or equally likely.",
        make() {
          if (Math.random() < 0.5) return makeEvent(WORDS_G2);
          const [a, b] = sample(["pink", "blue", "yellow", "purple"], 2);
          const na = ri(1, 6), nb = ri(1, 6), counts = { [a]: na, [b]: nb };
          const ans = na > nb ? "more" : na < nb ? "less" : "equal";
          return { key: `cmp${a}${na}${b}${nb}`, say: `You pick one bow without looking. Is ${a} more likely than ${b}, less likely, or just as likely?`,
            show: `Is ${a} more likely or less likely than ${b}?`, answer: ans,
            input: { type: "choice", choices: [plainChoice("more", "More likely"), plainChoice("less", "Less likely"), plainChoice("equal", "Just as likely")] },
            data: { kind: "bag", ask: "compare", a, b, counts, colours: [a, b], bows: bowsFromCounts(counts) } };
        },
        spec: { init: c => (c.d.kind === "event" ? eventSpec : bagSpec).init(c), draw: c => (c.d.kind === "event" ? eventSpec : bagSpec).draw(c),
          controls: c => (c.d.kind === "event" ? "" : bagSpec.controls(c)), onTap: (c, id) => (c.d.kind === "event" ? eventSpec : bagSpec).onTap(c, id), onDrop: (c, id, at) => eventSpec.onDrop(c, id, at) },
        teach: (ctx, Q) => (Q.data.kind === "event" ? teachEvent(ctx, Q) : teachBag(ctx, Q)),
        hint: Q => Q.data.kind === "event" ? "Think. Can it happen? Does it happen every time? Drag the card to a word."
          : `Count the ${Q.data.a} bows. Count the ${Q.data.b} bows. More bows means more likely.` },
      { name: "Bags, spinners, coins", grade: 3, note: "BC Gr 3: likelihood of simulated events — bags, spinners, coin toss (50-50).",
        make() {
          const r = Math.random();
          if (r < 0.2) return { key: "coin", say: "You toss a coin. Which is more likely, heads or tails?", show: "Heads or tails: which is more likely?", answer: "same",
            input: { type: "choice", choices: [plainChoice("heads", "Heads"), plainChoice("tails", "Tails"), plainChoice("same", "Same chance")] }, data: { kind: "coin", colours: [] } };
          if (r < 0.6) {
            const n = pick([4, 6, 6]), cols = sample(["pink", "blue", "yellow", "green", "purple"], n === 4 ? 2 : pick([2, 3]));
            let counts;
            for (;;) {
              counts = {}; let left = n;
              cols.forEach((c, i) => { const v = i === cols.length - 1 ? left : ri(1, left - (cols.length - 1 - i)); counts[c] = v; left -= v; });
              const vals = Object.values(counts), mx = Math.max(...vals);
              if (vals.every(v => v >= 1) && vals.filter(v => v === mx).length === 1) break;
            }
            let sectors;
            for (let k = 0; k < 30; k++) { sectors = bowsFromCounts(counts); if (sectors.every((c, i) => c !== sectors[(i + 1) % n]) || k === 29) break; }
            return { key: `spin${sectors.join("")}`, say: "Spin the arrow. Where will it most likely stop?", show: "Which colour will it most likely stop on?", answer: Object.keys(counts).find(c => counts[c] === Math.max(...Object.values(counts))),
              input: { type: "choice", choices: shuffle(cols).map(c => colourChoice(c, true)) }, data: { kind: "spin", counts, colours: cols, sectors } };
          }
          const cols = sample(["pink", "blue", "yellow", "purple"], pick([2, 3])), ask = Math.random() < 0.65 ? "more" : "less";
          let counts;
          for (;;) {
            counts = {}; cols.forEach(c => { counts[c] = ri(1, cols.length === 2 ? 8 : 6); });
            const vals = Object.values(counts), ext = ask === "more" ? Math.max(...vals) : Math.min(...vals);
            if (vals.filter(v => v === ext).length === 1 && vals.reduce((a, b) => a + b, 0) <= 12 && new Set(vals).size === vals.length) break;
          }
          const vals = Object.values(counts), ext = ask === "more" ? Math.max(...vals) : Math.min(...vals);
          // two colours: more / less likely; three colours: most / least likely
          const word = cols.length === 3 ? (ask === "more" ? "most" : "least") : ask;
          return { key: `bag${ask}${cols.map(c => c + counts[c]).join("")}`, say: `You pick one bow without looking. Which colour are you ${word} likely to get?`,
            show: `Which colour is ${word} likely?`, answer: cols.find(c => counts[c] === ext),
            input: { type: "choice", choices: shuffle(cols).map(c => colourChoice(c)) }, data: { kind: "bag", ask, counts, colours: cols, bows: bowsFromCounts(counts) } };
        },
        spec: (() => { const S = c => ({ bag: bagSpec, spin: spinSpec, coin: coinSpec })[c.d.kind];
          return { init: c => S(c).init(c), draw: c => S(c).draw(c), controls: c => S(c).controls(c), onTap: (c, id) => S(c).onTap(c, id) }; })(),
        teach: (ctx, Q) => ({ bag: teachBag, spin: teachSpin, coin: teachCoin })[Q.data.kind](ctx, Q),
        hint: Q => Q.data.kind === "coin" ? "Look at the coin. It has two sides. Is one side bigger?"
          : Q.data.kind === "spin" ? "Tap the parts to count each colour. All the parts are the same size."
            : Q.data.ask === "less" ? `Tap the bows to count each colour. The fewest bows is ${Q.data.colours.length === 3 ? "least" : "less"} likely.`
              : `Tap the bows to count each colour. The most bows is ${Q.data.colours.length === 3 ? "most" : "more"} likely.` }
    ]
  });

  /* =====================================================================================
     HOP LINE — a wooden ruler Kitty hops along (shared by graphs and patterns)
     state fields on st: pos (null until placed), start, hops[]
     cfg: { lo, hi, sizes:[1,2,...] (negative allowed), marks:[numbers to flag], placeable, allLabels }
     Where Mimi lands is never written or spoken (outside Mimi's lesson): she reads it off the ruler herself.
     The ruler is labelled only at landmarks (every 5, or every 10 or 20 when crowded) and at the start number,
     unless cfg.allLabels (the table ruler, where the answer is the number of hops, not a place).
     ===================================================================================== */
  const hop = {
    init: (st, start) => { st.pos = start; st.start = start; st.hops = []; return st; },
    draw(ctx, cfg, x, y, w) {
      const st = ctx.st, { lo, hi } = cfg, span = hi - lo, u = w / span, X = n => x + (n - lo) * u;
      // labels at least about 30 units apart (so 2-digit numbers never touch); ticks at least 6 units apart
      const digits = String(hi).length, gapNeed = hi <= 10 ? 22 : digits >= 3 ? 36 : 30;
      const labelEvery = (cfg.allLabels ? [1, 2, 5, 10, 20] : [5, 10, 20]).find(k => k * u >= gapNeed) || 20, tickEvery = u >= 6 ? 1 : u * 5 >= 6 ? 5 : 10;
      // Mimi's pink badge shows a number only where she was put (a number given on the screen), never where she lands
      const badgeAt = st.pos != null && st.pos === st.start ? st.pos : null;
      // once Kitty has hopped away, her start number stays written on the ruler (pink), so Marie sees where she began
      const startLab = badgeAt == null && st.start != null && st.pos != null ? st.start : null;
      const near = (n, c) => Math.abs(X(n) - X(c)) < (String(c).length * 10 + 22) / 2 + 9, drawn = [];
      let s = "";
      // tap targets for placing Kitty (under everything else)
      if (cfg.placeable) for (let n = lo; n <= hi; n++) s += `<rect data-tap="tick:${n}" class="${ctx.g("tick:" + n).trim()}" x="${r1(X(n) - u / 2)}" y="${r1(y - 46)}" width="${r1(u)}" height="86" fill="${ctx.glow.has("tick:" + n) ? "#fff3cf" : "#fff"}" fill-opacity="${ctx.glow.has("tick:" + n) ? 0.9 : 0.01}"/>`;
      s += `<g pointer-events="none">${chunkyRect(x - 14, y - 12, w + 28, 26, 13, WOOD, { dy: 4 })}</g>`;
      s += `<rect x="${r1(x - 10)}" y="${r1(y - 9)}" width="${r1(w + 20)}" height="7" rx="3.5" fill="#fff" opacity=".35" pointer-events="none"/>`;
      for (let n = Math.ceil(lo / tickEvery) * tickEvery; n <= hi; n += tickEvery) {
        const major = n % labelEvery === 0;
        s += `<line x1="${r1(X(n))}" y1="${r1(y - 12)}" x2="${r1(X(n))}" y2="${r1(y + (major ? 4 : -2))}" stroke="${INK}" stroke-width="${major ? 2.5 : 1.5}" pointer-events="none"/>`;
        // labels under Mimi's pink badge are left out; the start number's own label is drawn pink below
        const under = badgeAt != null && near(n, badgeAt);
        // cfg.hide: numbers that must not be written on the ruler (on a number pattern: every number of the pattern)
        if (major && !under && n !== startLab && !(cfg.hide && cfg.hide.includes(n))) { s += txt(X(n), y + 26, n, 15, { fill: "#6e5562", extra: ' data-scale="1"' }); drawn.push(n); }
      }
      // the start number in pink, unless it would touch a landmark label (the landmarks matter more for reading the ruler)
      if (startLab != null && !drawn.some(n => Math.abs(X(n) - X(startLab)) < (String(n).length + String(startLab).length) * 4.6 + 6))
        s += txt(X(startLab), y + 26, startLab, 16, { fill: DEEP.pink, extra: ' data-given="1"' });
      for (const m of cfg.marks || []) s += `<circle cx="${r1(X(m))}" cy="${r1(y - 1)}" r="7" fill="${COL.green}" stroke="${INK}" stroke-width="2.5" pointer-events="none"/>`;
      // hop arcs
      let p = st.start;
      for (const h of st.hops || []) {
        const q = p + h, x0 = X(p), x1 = X(q), hgt = clamp(Math.abs(x1 - x0) * 0.55, 12, 54);
        s += `<path d="M${r1(x0)} ${r1(y - 14)} Q${r1((x0 + x1) / 2)} ${r1(y - 14 - hgt * 2)} ${r1(x1)} ${r1(y - 14)}" fill="none" stroke="${h > 0 ? "#7b55e6" : "#e0306b"}" stroke-width="3.5" stroke-linecap="round" pointer-events="none"/>`;
        if (Math.abs(x1 - x0) > 26) s += txt((x0 + x1) / 2, y - 22 - hgt, (h > 0 ? "+" : "−") + Math.abs(h), 14, { fill: h > 0 ? "#7b55e6" : "#e0306b", stroke: "#fff", sw: 4, extra: ' data-hop="1"' });
        p = q;
      }
      if (st.pos != null) {
        s += `<g pointer-events="none">${faceAt(ctx.api, "kitty", X(st.pos), y - 36, 40)}</g>`;
        if (badgeAt != null) {
          const w2 = String(badgeAt).length * 10 + 22;
          s += `<g pointer-events="none"><rect x="${r1(X(badgeAt) - w2 / 2)}" y="${r1(y + 13)}" width="${w2}" height="25" rx="12.5" fill="${COL.pink}" stroke="${INK}" stroke-width="2.5"/>${txt(X(badgeAt), y + 26, badgeAt, 16, { fill: "#fff", extra: ' data-given="1"' })}</g>`;
        } else {
          // a pink tick across the ruler under Kitty, so Marie can read her place on the ruler herself
          s += `<line x1="${r1(X(st.pos))}" y1="${r1(y - 13)}" x2="${r1(X(st.pos))}" y2="${r1(y + 15)}" stroke="${DEEP.pink}" stroke-width="4.5" stroke-linecap="round" pointer-events="none"/>`;
        }
      }
      return s;
    },
    controls(ctx, cfg) {
      const st = ctx.st;
      // in a lesson, the biggest hop that does not pass the target is marked (the automated test taps it)
      const best = ctx.teaching && st.target != null && st.pos != null ? cfg.sizes.filter(k => Math.sign(k) === Math.sign(st.target - st.pos) && Math.abs(k) <= Math.abs(st.target - st.pos)).sort((a, b) => Math.abs(b) - Math.abs(a))[0] : null;
      const b = cfg.sizes.map(k => `<button type="button" class="sd-btn lilac${ctx.g("hop:" + k)}" data-tap="hop:${k}"${k === best ? ' data-teach="1"' : ""}>${k > 0 ? "+" : "−"}${Math.abs(k)}</button>`).join("");
      const has = !!(st.hops && st.hops.length);
      return b + resetBtn(ctx, "hop:undo", "↶", has, " round", "Undo a hop") + resetBtn(ctx, "hop:reset", "↺", has, " round", "Start again");
    },
    tap(ctx, cfg, id) {
      const st = ctx.st;
      if (id.startsWith("tick:")) { if (!cfg.placeable) return false; const n = +id.slice(5); st.pos = st.start = n; st.hops = []; ctx.speak(String(n)); ctx.tone([600], 0.06); return true; }
      if (!id.startsWith("hop:")) return false;
      const k = id.slice(4);
      if (k === "undo") { if (st.hops.length) st.pos -= st.hops.pop(); return true; }
      if (k === "reset") { st.hops = []; st.pos = st.start; return true; }
      if (st.pos == null) { ctx.say(cfg.placeable ? "First tap a number to put Mimi on it." : "First tap a number box to put Mimi on it."); return true; }
      const size = +k, to = st.pos + size;
      if (to < cfg.lo || to > cfg.hi) { ctx.say("That hop goes off the ruler!"); ctx.tone([330], 0.15, "triangle"); return true; }
      st.hops.push(size); st.pos = to;
      // only a sound: where Kitty landed is for Marie to read on the ruler. In a lesson Kitty may say it (or, on the
      // table ruler, the number of hops so far: cfg.countHops), within the lesson rule (see countAloud)
      ctx.tone([size > 0 ? 620 : 470, size > 0 ? 740 : 400], 0.07, "sine", 0.06); ctx.countAloud(cfg.countHops ? st.hops.length : to);
      return true;
    }
  };

  /* =====================================================================================
     GRAPHS  (Data and chance)
     ===================================================================================== */
  const FOODS = [
    { k: "strawberry", many: "strawberries" }, { k: "cherries", many: "cherries" }, { k: "cupcake", many: "cupcakes" },
    { k: "donut", many: "doughnuts" }, { k: "icecream", many: "ice creams" }, { k: "cookie", many: "cookies" },
    { k: "lollipop", many: "lollipops" }, { k: "candy", many: "candies" }
  ];
  const foodOf = k => FOODS.find(f => f.k === k);
  const foodChoice = (api, k) => ({ value: k, label: cap(foodOf(k).many), html: `<span class="sd-ch">${artIMG(api, k)}<span>${cap(foodOf(k).many)}</span></span>` });
  // the choices need api.ART, so they are filled in at make time from a stored host-independent path
  // Choices are made before any picture is mounted, so they use the host's art folder ("art/<key>.png", the same
  // path api.ART gives). The first mount reads the real prefix from api.ART and later choices follow it.
  const ARTPATH = { ART: k => `${artPrefix}${k}.png` };
  const ARTPATH_FACE = { ART: ARTPATH.ART, face: id => `<g data-sd-face="${id}"></g>` };

  // Concrete graph (Grade 1). The things start in a jumbled heap on a plate, one plate for each kind, so the picture
  // never shows which has the most. Marie taps a plate: one thing moves into its line (and is counted). She builds every
  // line herself; only then can the lines be compared one to one.
  const jit = (a, b) => { const h = Math.sin((a + 1) * 12.9898 + (b + 1) * 78.233) * 43758.5453; return h - Math.floor(h); };
  function concreteLayout(ctx) {
    const { vw, vh, d } = ctx, n = d.cats.length;
    if (ctx.tall) {
      const hb = clamp(vh * 0.3, 74, 130), pw = (vw - 16) / n;
      const plates = d.cats.map((k, c) => [8 + pw * c + 4, 6, pw - 8, hb]);
      return { plates, top: hb + 18 };
    }
    const hw = Math.min(150, vw * 0.24), ph = (vh - 12) / n;
    return { plates: d.cats.map((k, c) => [8, 6 + ph * c + 3, hw, ph - 6]), left: hw + 26 };
  }
  const concreteSpec = {
    init: () => ({ placed: {} }),
    draw(ctx) {
      const { vw, vh, st, d, api } = ctx, n = d.cats.length, maxN = 7, L = concreteLayout(ctx);
      const got = c => st.placed[c] || 0, none = d.cats.every((k, c) => !got(c));
      let s = "";
      // the plates, each with a jumbled heap of what is left
      d.cats.forEach((k, c) => {
        const [px, py, pw, ph] = L.plates[c], left = d.counts[c] - got(c), hs = Math.min(42, ph * 0.42, pw * 0.36), id = "heap:" + c;
        if (!left) return; // an empty plate has done its job: it goes away, so no empty tray is left on the screen
        s += `<g data-tap="${id}" class="${ctx.g(id).trim()}">${chunkyRect(px, py, pw, ph, 18, "#fff", { dy: 3 })}`;
        for (let i = 0; i < left; i++) {
          const x = px + hs / 2 + 6 + jit(c, i) * (pw - hs - 12), y = py + hs / 2 + 6 + jit(i + 7, c + 3) * (ph - hs - 12);
          s += artAt(api, k, x, y, hs);
        }
        s += `</g>`;
      });
      if (ctx.tall) {
        // the lines, left to right, under the plates
        const lab = 62, top = L.top, rowH = Math.min((vh - top - 8) / n, 84), sz = Math.min(rowH - 12, (vw - lab - 26) / maxN - 4, 52);
        const y0 = top + Math.max(0, (vh - top - 8 - rowH * n) / 2);
        s += chunkyRect(8, y0 - 4, vw - 16, rowH * n + 8, 18, CREAM, { dy: 0 });
        s += `<line x1="${lab + 4}" y1="${r1(y0 + 4)}" x2="${lab + 4}" y2="${r1(y0 + rowH * n - 4)}" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`;
        d.cats.forEach((k, c) => {
          const cy = y0 + rowH * (c + 0.5);
          s += `<rect x="12" y="${r1(cy - rowH / 2 + 2)}" width="${r1(vw - 24)}" height="${r1(rowH - 4)}" rx="12" fill="${c % 2 ? "#fff" : TINT.pink}" fill-opacity=".7"/>`;
          s += `<g pointer-events="none">${chunkyCircle(36, cy, 24, "#fff", { sw: 3, dy: 3 })}${artAt(api, k, 36, cy, 34)}</g>`;
          for (let i = 0; i < got(c); i++) {
            const x = lab + 14 + sz / 2 + i * (sz + 4);
            // no number on the things in a line: Marie compares the lines (and counts them) herself
            s += `<g class="${i === got(c) - 1 && st.fresh === c ? "sd-pop" : ""}" pointer-events="none">${artAt(api, k, x, cy, sz)}</g>`;
          }
        });
        if (none) s += txt(lab + (vw - lab) / 2, y0 + rowH * (n / 2), "Tap a plate", 18, { fill: "#a58a98" });
      } else {
        const x0b = L.left, colW = Math.min((vw - x0b - 16) / n, 150), labH = 54, sz = Math.min((vh - labH - 26) / maxN - 4, colW - 30, 56);
        const x0 = x0b + (vw - x0b - 6 - colW * n) / 2, base = vh - labH;
        s += chunkyRect(x0 - 10, 10, colW * n + 20, vh - 20, 18, CREAM, { dy: 0 });
        s += `<line x1="${r1(x0)}" y1="${r1(base)}" x2="${r1(x0 + colW * n)}" y2="${r1(base)}" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`;
        d.cats.forEach((k, c) => {
          const cx = x0 + colW * (c + 0.5);
          s += `<rect x="${r1(cx - colW / 2 + 4)}" y="18" width="${r1(colW - 8)}" height="${r1(base - 22)}" rx="12" fill="${c % 2 ? "#fff" : TINT.pink}" fill-opacity=".7"/>`;
          s += `<g pointer-events="none">${chunkyCircle(cx, base + 26, 21, "#fff", { sw: 3, dy: 3 })}${artAt(api, k, cx, base + 26, 30)}</g>`;
          for (let i = 0; i < got(c); i++) {
            const y = base - 6 - sz / 2 - i * (sz + 4);
            s += `<g class="${i === got(c) - 1 && st.fresh === c ? "sd-pop" : ""}" pointer-events="none">${artAt(api, k, cx, y, sz)}</g>`;
          }
        });
        if (none) s += txt(x0 + colW * n / 2, base / 2, "Tap a plate", 18, { fill: "#a58a98" });
      }
      st.fresh = null;
      return s;
    },
    onTap(ctx, id) {
      const st = ctx.st;
      if (!id.startsWith("heap:")) return;
      const c = +id.slice(5), have = st.placed[c] || 0;
      if (have >= ctx.d.counts[c]) { ctx.say("That plate is empty."); return; }
      st.placed = { ...st.placed, [c]: have + 1 }; st.fresh = c;
      ctx.tone([560 + (have + 1) * 30], 0.06); ctx.countAloud(have + 1);
    }
  };

  // Pictograph (Grade 2): one picture stands for one thing. Badges count on across rows.
  const pictoSpec = {
    init: () => ({ badge: {}, n: 0 }),
    draw(ctx) {
      const { vw, st, d, api } = ctx, n = d.cats.length;
      // a keyed pictograph (Grade 3): each picture means d.key things; the key sits on top of the graph
      const K = d.key || 1, pics = d.counts.map(c => c / K), keyH = K > 1 ? 46 : 0, vh = ctx.vh - keyH;
      // row names only when they fit in front of the pictures with room to spare; otherwise the round picture label alone
      const wordW = Math.max(...d.cats.map(k => foodOf(k).many.length)) * 8.8, withWords = !ctx.tall && vw - (66 + wordW + 14) >= 5 * 40;
      const lab = withWords ? 66 + wordW + 14 : 64, gapRow = vh < 360 ? 6 : 12;
      // pictures sit in lines of 5, or of 10 with a gap after the fifth, so Marie can count them in fives herself
      const G5 = 0.45;
      // A cell may be wider than it is tall (a short picture on a small phone): the spare width makes each picture a
      // wider tap target and gives the tick its own place beside the picture, so the tick never hides the food.
      // Each row is a tap target (a tap anywhere in it marks the next picture), so each row is at least 44 px tall
      // (row rect = row + 4 units). A one-line row is given that height first and the other rows share what is left
      // (on an iPhone SE a one-line row was only 30 px tall). If even that cannot fit, rows share the height evenly.
      const avail = vh - 16 - gapRow * (n - 1), minRow = Math.min(45 / (ctx.px || 1) - 4, avail / n);
      const fit = per => { const ls = pics.map(c => Math.ceil(c / per) || 1), tl = ls.reduce((a, b) => a + b, 0);
        const cw = Math.min((vw - lab - 30) / (per + (per === 10 ? G5 : 0)), 64);
        // the biggest line height whose rows (each at least minRow) still fit the height
        const need = c => ls.reduce((a, l) => a + Math.max(l * c, minRow), 0);
        let lo = 0, hi = Math.min(cw, 56);
        if (need(hi) <= avail) lo = hi; else for (let k = 0; k < 30; k++) { const m = (lo + hi) / 2; if (need(m) <= avail) lo = m; else hi = m; }
        const rowH = ls.map(l => Math.max(l * lo, minRow));
        return { per, ls, tl, cw, ch: lo, cell: lo, rowH }; };
      const F = [fit(5), fit(10)].sort((a, b) => b.cell - a.cell)[0];
      const perLine = F.per, lines = F.ls, cell = F.ch, cellW = F.cw, rowH = F.rowH, rowsH = rowH.reduce((a, b) => a + b, 0);
      let pic = Math.min(cellW, cell) * 0.84;
      // the picture moves left inside its cell just enough for the tick to sit to its right (when there is room)
      // (the tick overlaps the picture's edge by 4 units at most and stays inside the cell). With no room beside it,
      // a small tick sits in the cell's top-right corner, over the picture's empty corner only.
      const tickR = cell < 40 ? 8 : 11, side = cellW >= pic + 2 * tickR - 4;
      // with the tick beside it, the picture may fill more of its cell's height
      if (side) pic = Math.max(pic, Math.min(cell * 0.94, cellW - 2 * tickR + 4));
      const shift = side ? Math.max(0, pic / 2 + 2 * tickR - 4 - cellW / 2) : 0;
      let y = keyH + (vh - (rowsH + gapRow * (n - 1))) / 2, s = "";
      if (K > 1) {
        // the key, drawn with the food she is asked about: one picture = 2 (every row uses the same key)
        // it sits just above the graph (on a tall picture the graph is centred, so the key follows it down)
        const kx = vw / 2 - 66, ky = Math.max(24, y - 8 - 30);
        s += chunkyRect(kx - 30, ky - 21, 192, 42, 16, "#fff", { dy: 3 }) + txt(kx - 4, ky, "Key", 18, { anchor: "start" }) +
          artAt(api, d.cats[d.ask[0]], kx + 62, ky, 30) + txt(kx + 84, ky, `= ${K}`, 24, { anchor: "start", extra: ' data-given="1"' });
      }
      s += chunkyRect(6, Math.max(2, y - 8), vw - 12, rowsH + gapRow * (n - 1) + 16, 18, CREAM, { dy: 0 });
      d.cats.forEach((k, c) => {
        // a row made taller than its pictures need: each of its lines gets the extra height, pictures stay centred
        const h = rowH[c], lh = h / lines[c], cy = y + h / 2, asked = d.ask.includes(c);
        s += `<rect data-tap="row:${c}" x="12" y="${r1(y - 2)}" width="${r1(vw - 24)}" height="${r1(h + 4)}" rx="12" fill="${c % 2 ? "#fff" : TINT.pink}" fill-opacity=".8"/>`;
        // the round label fits its own row (with its shadow) so it never runs into the row above or below:
        // a one-line row on a small phone is only about 30 units tall, so the label shrinks with the row
        const lr = Math.max(10, Math.min(23, h / 2 + gapRow - 7));
        s += `<g pointer-events="none" data-rowlabel="${c}">${chunkyCircle(36, cy, lr, "#fff", { sw: 3, dy: 3 })}${artAt(api, k, 36, cy, Math.min(32, lr * 1.4))}${withWords ? txt(66, cy, cap(foodOf(k).many), 16, { anchor: "start" }) : ""}</g>`;
        for (let i = 0; i < pics[c]; i++) {
          const col = i % perLine, line = Math.floor(i / perLine), x = lab + cellW * (col + 0.5) + (perLine === 10 && col >= 5 ? cellW * G5 : 0), yy = y + lh * (line + 0.5), id = `p:${c}:${i}`;
          s += `<g data-tap="${id}" data-sub="1" class="${ctx.g(id).trim()}"><rect x="${r1(x - cellW / 2)}" y="${r1(yy - lh / 2)}" width="${r1(cellW)}" height="${r1(lh)}" fill="#fff" fill-opacity=".01"/>${artAt(api, k, side ? x - shift : x, yy, pic)}</g>`;
          // a counted picture gets a tick, never a number: the total is Marie's to count
          if (st.badge[id]) s += side ? mark(x - shift + pic / 2 + tickR - 4, yy, cell < 40) : mark(x + cellW / 2 - 9, yy - cell / 2 + 9, true);
        }
        y += h + gapRow;
      });
      return s;
    },
    controls: ctx => resetBtn(ctx, "clear", "↺ Count again", ctx.st.n > 0),
    onTap(ctx, id) {
      const st = ctx.st;
      if (id === "clear") { st.badge = {}; st.n = 0; return; }
      const K = ctx.d.key || 1;
      if (id.startsWith("row:")) { const c = +id.slice(4), i = [...Array(ctx.d.counts[c] / K).keys()].find(j => !st.badge[`p:${c}:${j}`]); if (i === undefined) return; id = `p:${c}:${i}`; }
      if (!id.startsWith("p:") || st.badge[id]) return;
      // with a key, each picture counts on by the key: 2, 4, 6 ...
      st.n += K; st.badge[id] = st.n; ctx.tone([560 + Math.min(st.n / K, 20) * 20], 0.06); ctx.countAloud(st.n);
    }
  };

  // Bar graph (Grade 3): squares to tap, and a line Marie drags across to compare two bars.
  // Height of the control strip under the picture: the "Count again" button (min-height 46 px) and the 6 px gap.
  const CTL_STRIP = 52;
  // A short wide picture (iPhones with the number keys) leaves upright squares only 6 to 16 units tall: too small
  // to see, and the count badges pile up. Then the bars lie down: food on the left, bars grow to the right, the
  // line is dragged sideways.
  const barFlatFor = (vw, vh) => { const unit = (vh - 40 - 52) / 10; return unit < 22 && (vw - 80) / 10 > unit; };
  // Lying-down bars on a phone: the control strip under the picture would take 52 px of height, and each bar (the
  // row Marie taps to count) would then be only 26 to 30 px tall on an iPhone SE. So the strip is not used: the
  // picture gets its height and "Count again" sits inside the picture, in its empty top-left corner. The choice is
  // made from the size the picture would have WITH the strip, so it never flips back and forth.
  function barFlatNow(ctx) {
    const R = ctx.root.getBoundingClientRect();
    if (!(R.width > 0 && R.height > CTL_STRIP + 40)) return null;
    const V = ctx.viewFor(R.width, R.height - CTL_STRIP);
    return barFlatFor(V.vw, V.vh);
  }
  function barLayout(ctx) {
    const { vw, vh, d } = ctx, n = d.cats.length;
    const left = 40, right = 50, top = 40, bottom = 52; // room above the 10 line for the handle and its invisible tap ring, so neither sticks out
    const unit = (vh - top - bottom) / 10, base = vh - bottom;
    const flat = ctx.barFlat != null ? ctx.barFlat : barFlatFor(vw, vh);
    if (flat) {
      // with "Count again" in the top-left corner (ctx.barFlat), that corner is made a little bigger for it
      const own = !!ctx.barFlat, hl = own ? 56 : 46, hr = 34, ht = own ? 52 : 44, hb = 22, hu = (vw - hl - hr) / 10, avail = vh - ht - hb;
      // Each bar's row is a tap target (a tap in it marks the next square), so it should be at least 44 px tall
      // (row rect = row - 2 units). When a small phone has not got that much room for every row, the two bars the
      // question asks about get it first and the other rows share the rest. All bars stay the same thickness.
      const minRow = 46 / (ctx.px || 1) + 2, need = [d.x, d.y].filter(c => c != null && c < n);
      let rowHs = d.cats.map(() => avail / n);
      if (avail / n < minRow && need.length && n > need.length) {
        const a = Math.min(minRow, avail / need.length), o = (avail - a * need.length) / (n - need.length);
        rowHs = d.cats.map((_, c) => need.includes(c) ? a : o);
      }
      const tops = rowHs.map((h, c) => ht + rowHs.slice(0, c).reduce((p, q) => p + q, 0)), rowH = Math.min(...rowHs);
      // the bars fill most of their row (0.86), so on a small phone each square is as tall as it can be
      return { h: true, own, left: hl, right: hr, top: ht, bottom: hb, unit: hu, base: hl, rowH, rowHs, bw: Math.min(rowH * 0.86, 40), n,
        Y: c => tops[c] + rowHs[c] / 2, end: vh - hb };
    }
    const colW = (vw - left - right) / n, bw = Math.min(colW * 0.62, 70);
    return { left, right, top, bottom, unit, base, colW, bw, n, X: c => left + colW * (c + 0.5), stripX: vw - right + 4 };
  }
  // the same bar graph lying down (see barLayout)
  function drawBarH(ctx, L) {
    const { vw, vh, st, d, api } = ctx;
    let s = chunkyRect(4, 4, vw - 8, vh - 8, 18, CREAM, { dy: 0 });
    const every = L.unit >= 20 ? 1 : 2;
    for (let k = 0; k <= 10; k++) {
      const x = L.base + k * L.unit;
      s += `<line x1="${r1(x)}" y1="${r1(L.top)}" x2="${r1(x)}" y2="${r1(L.end)}" stroke="${INK}" stroke-opacity="${k % 5 === 0 ? 0.35 : 0.13}" stroke-width="${k ? 1.5 : 3}"/>`;
      if (k % every === 0) s += txt(x, L.end + 11, k, 14, { fill: "#6e5562", extra: ' data-scale="1"' });
    }
    const colours = ["pink", "blue", "yellow", "green"];
    d.cats.forEach((k, c) => {
      const y = L.Y(c), col = colours[c % 4];
      s += `<rect data-tap="bar:${c}" data-zone="bar:${c}" x="8" y="${r1(y - L.rowHs[c] / 2 + 1)}" width="${r1(vw - 16)}" height="${r1(L.rowHs[c] - 2)}" fill="#fff" fill-opacity=".01"/>`;
      for (let i = 0; i < d.counts[c]; i++) {
        const x = L.base + i * L.unit, id = `sq:${c}:${i}`, past = st.line != null && i >= st.line;
        s += `<rect data-tap="${id}" data-sub="1" class="${ctx.g(id).trim()}" x="${r1(x)}" y="${r1(y - L.bw / 2)}" width="${r1(L.unit)}" height="${r1(L.bw)}" fill="${past ? "#d8ccff" : COL[col]}" stroke="${INK}" stroke-width="2.5"/>`;
        if (st.badge[id]) s += mark(x + L.unit / 2, y, L.bw < 26 || L.unit < 26);
      }
      if (d.counts[c]) s += `<rect x="${r1(L.base)}" y="${r1(y - L.bw / 2)}" width="${r1(d.counts[c] * L.unit)}" height="${r1(L.bw)}" fill="none" stroke="${INK}" stroke-width="4" rx="3" pointer-events="none"/>`;
      s += `<g pointer-events="none">${artAt(api, k, 24, y, Math.min(32, L.rowH - 2))}</g>`;
    });
    // the line's drop places: a strip above the bars, one place for each number
    for (let k = 0; k <= 10; k++) s += `<rect data-zone="lvl:${k}" data-sub="1" class="${ctx.g("lvl:" + k).trim()}" x="${r1(L.base + k * L.unit - L.unit / 2)}" y="6" width="${r1(L.unit)}" height="${r1(L.top - 6)}" fill="${ctx.glow.has("lvl:" + k) ? "#ffe08a" : "#fff"}" fill-opacity="${ctx.glow.has("lvl:" + k) ? 0.9 : 0.01}"/>`;
    const ly = L.top - 18, lx = st.line == null ? vw - L.right + 8 : L.base + st.line * L.unit;
    s += `<rect x="${r1(L.base)}" y="${r1(ly - 3)}" width="${r1(10 * L.unit)}" height="6" rx="3" fill="#e9dce4" pointer-events="none"/>`;
    if (st.line != null) s += `<line x1="${r1(lx)}" y1="${r1(ly)}" x2="${r1(lx)}" y2="${r1(L.end)}" stroke="#7b55e6" stroke-width="3.5" stroke-dasharray="9 6" pointer-events="none"/>`;
    if (st.line == null) s += txt(lx - 22, ly, "Drag the line", 15, { anchor: "end", fill: DEEP.purple, stroke: "#fff", sw: 4 });
    // "Count again" in the top-left corner (see barFlatNow). Like the strip's button it is there only when there is
    // something to undo. It is drawn under the line's handle, so the handle always wins where they meet. Its round tap area is 50 units across (47 px on an iPhone SE).
    if (L.own && st.n > 0) s += `<g data-tap="clear" role="button" aria-label="Count again" class="${ctx.g("clear").trim()}"><circle cx="26" cy="26" r="25" fill="#fff" fill-opacity=".01"/>${chunkyCircle(26, 25, 19, "#fff", { sw: 3, dy: 3 })}${txt(26, 26, "↺", 24)}</g>`;
    s += `<g data-drag="guide" class="${ctx.g("guide").trim()}"><circle cx="${r1(lx)}" cy="${r1(ly)}" r="24" fill="#fff" fill-opacity=".01"/>${chunkyCircle(lx, ly, 15, COL.purple, { sw: 3.5, dy: 3 })}<path d="M${r1(lx - 3)} ${r1(ly - 6)} l-6 6 l6 6 M${r1(lx + 3)} ${r1(ly - 6)} l6 6 l-6 6" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/></g>`;
    return s;
  }
  const barSpec = {
    init: () => ({ badge: {}, n: 0, line: null }),
    draw(ctx) {
      const { vw, st, d, api } = ctx, L = barLayout(ctx);
      if (L.h) return drawBarH(ctx, L);
      let s = chunkyRect(4, 4, vw - 8, ctx.vh - 8, 18, CREAM, { dy: 0 });
      for (let k = 0; k <= 10; k++) {
        const y = L.base - k * L.unit;
        s += `<line x1="${L.left}" y1="${r1(y)}" x2="${r1(vw - L.right)}" y2="${r1(y)}" stroke="${INK}" stroke-opacity="${k % 5 === 0 ? 0.35 : 0.13}" stroke-width="${k ? 1.5 : 3}"/>`;
        if (k % 2 === 0) s += txt(L.left - 14, y, k, 14, { fill: "#6e5562", extra: ' data-scale="1"' });
      }
      const colours = ["pink", "blue", "yellow", "green"];
      d.cats.forEach((k, c) => {
        const x = L.X(c), col = colours[c % 4];
        s += `<rect data-tap="bar:${c}" data-zone="bar:${c}" x="${r1(x - L.colW / 2 + 3)}" y="${r1(L.top)}" width="${r1(L.colW - 6)}" height="${r1(L.base - L.top)}" fill="#fff" fill-opacity=".01"/>`;
        for (let i = 0; i < d.counts[c]; i++) {
          const y = L.base - (i + 1) * L.unit, id = `sq:${c}:${i}`, above = st.line != null && i >= st.line;
          s += `<rect data-tap="${id}" data-sub="1" class="${ctx.g(id).trim()}" x="${r1(x - L.bw / 2)}" y="${r1(y)}" width="${r1(L.bw)}" height="${r1(L.unit)}" fill="${above ? "#d8ccff" : COL[col]}" stroke="${INK}" stroke-width="2.5"/>`;
          if (st.badge[id]) s += mark(x, y + L.unit / 2, L.unit < 26);
        }
        if (d.counts[c]) s += `<rect x="${r1(x - L.bw / 2)}" y="${r1(L.base - d.counts[c] * L.unit)}" width="${r1(L.bw)}" height="${r1(d.counts[c] * L.unit)}" fill="none" stroke="${INK}" stroke-width="4" rx="3" pointer-events="none"/>`;
        s += `<g pointer-events="none">${artAt(api, k, x, L.base + 25, 36)}</g>`;
      });
      // the guide line and its strip of drop places
      for (let k = 0; k <= 10; k++) s += `<rect data-zone="lvl:${k}" data-sub="1" class="${ctx.g("lvl:" + k).trim()}" x="${r1(L.stripX)}" y="${r1(L.base - k * L.unit - L.unit / 2)}" width="${r1(L.right - 8)}" height="${r1(L.unit)}" fill="${ctx.glow.has("lvl:" + k) ? "#ffe08a" : "#fff"}" fill-opacity="${ctx.glow.has("lvl:" + k) ? 0.9 : 0.01}"/>`;
      s += `<rect x="${r1(L.stripX + L.right / 2 - 7)}" y="${r1(L.base - 10 * L.unit)}" width="6" height="${r1(10 * L.unit)}" rx="3" fill="#e9dce4" pointer-events="none"/>`;
      const ly = st.line == null ? L.top - 13 : L.base - st.line * L.unit;
      if (st.line != null) s += `<line x1="${L.left}" y1="${r1(ly)}" x2="${r1(L.stripX)}" y2="${r1(ly)}" stroke="#7b55e6" stroke-width="3.5" stroke-dasharray="9 6" pointer-events="none"/>`;
      // until it is used, the handle says what it is for (a handle with no words had no purpose Marie could see)
      if (st.line == null) s += txt(L.stripX - 10, ly, "Drag the line", 15, { anchor: "end", fill: DEEP.purple, stroke: "#fff", sw: 4 });
      s += `<g data-drag="guide" class="${ctx.g("guide").trim()}"><circle cx="${r1(L.stripX + L.right / 2 - 4)}" cy="${r1(ly)}" r="26" fill="#fff" fill-opacity=".01"/>${chunkyCircle(L.stripX + L.right / 2 - 4, ly, 15, COL.purple, { sw: 3.5, dy: 3 })}<path d="M${r1(L.stripX + L.right / 2 - 10)} ${r1(ly - 3)} l6 -6 l6 6 M${r1(L.stripX + L.right / 2 - 10)} ${r1(ly + 3)} l6 6 l6 -6" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/></g>`;
      return s;
    },
    // lying-down bars on a phone keep "Count again" inside the picture (see barFlatNow): no strip under it
    controls: ctx => { ctx.barFlat = barFlatNow(ctx); return ctx.barFlat ? "" : resetBtn(ctx, "clear", "↺ Count again", ctx.st.n > 0); },
    onTap(ctx, id) {
      const st = ctx.st;
      if (id === "clear") { st.badge = {}; st.n = 0; return; }
      if (id.startsWith("bar:")) { const c = +id.slice(4), i = [...Array(ctx.d.counts[c]).keys()].find(j => j >= (st.line || 0) && !st.badge[`sq:${c}:${j}`]); if (i === undefined) return; id = `sq:${c}:${i}`; }
      if (!id.startsWith("sq:") || st.badge[id]) return;
      st.n++; st.badge[id] = st.n; ctx.tone([560 + Math.min(st.n, 20) * 20], 0.06); ctx.countAloud(st.n);
    },
    onDrop(ctx, id, at) {
      if (id !== "guide") return;
      const L = barLayout(ctx);
      let k = at.zone && at.zone.startsWith("lvl:") ? +at.zone.slice(4) : at.zone && at.zone.startsWith("bar:") && !at.dragged ? ctx.d.counts[+at.zone.slice(4)] : L.h ? Math.round((at.x - L.base) / L.unit) : Math.round((L.base - at.y) / L.unit);
      // the line at 0 marks nothing (every bar is at least 1 long): it goes back to its resting place, where its
      // handle never sits on top of the corner "Count again" button (round 1 note, iPhone SE)
      k = clamp(k, 0, 10); ctx.st.line = k === 0 ? null : k; ctx.tone([520, 660], 0.06);
    }
  };

  // Table (Grade 3) with a ruler: put Kitty on the smaller number, hop to the bigger one, count the hops.
  const tableCfg = () => ({ lo: 0, hi: 10, sizes: [1], marks: [], placeable: false, allLabels: true, countHops: true });
  const tableSpec = {
    init: () => hop.init({}, null),
    draw(ctx) {
      const { vw, vh, st, d, api } = ctx, n = d.cats.length;
      // rows as tall as the space allows (they are tap targets); table and ruler kept together in the middle
      // the ruler band needs 56 units above the line (Kitty) and 40 below (numbers); the rest goes to the rows
      const band = 96, gap = 12, room = vh - band - gap - 14, tw = Math.min(vw - 30, 330), tx = (vw - tw) / 2;
      if (room / n < 44) {
        // a short box (small phones): the same table turned on its side, one tall column per food, so every
        // column is still a big tap target and the words stay readable
        const colH = Math.max(76, Math.min(110, room)), colW = (tw - 6) / n;
        const ty = Math.max(4, (vh - (colH + 6 + gap + band)) / 2);
        let s = chunkyRect(tx, ty, tw, colH + 6, 16, "#fff");
        d.cats.forEach((k, c) => {
          const x = tx + 3 + colW * (c + 0.5);
          s += `<rect data-tap="trow:${c}" class="${ctx.g("trow:" + c).trim()}" x="${r1(x - colW / 2 + 1)}" y="${r1(ty + 4)}" width="${r1(colW - 2)}" height="${r1(colH - 2)}" rx="10" fill="${ctx.glow.has("trow:" + c) ? "#fff3cf" : "#fff"}"/>`;
          if (c) s += `<line x1="${r1(x - colW / 2)}" y1="${r1(ty + 8)}" x2="${r1(x - colW / 2)}" y2="${r1(ty + colH - 2)}" stroke="${INK}" stroke-opacity=".2" stroke-width="2"/>`;
          s += artAt(api, k, x, ty + 3 + colH * 0.3, Math.min(34, colH * 0.4));
          s += `<line x1="${r1(x - colW / 2 + 8)}" y1="${r1(ty + 3 + colH * 0.58)}" x2="${r1(x + colW / 2 - 8)}" y2="${r1(ty + 3 + colH * 0.58)}" stroke="${INK}" stroke-opacity=".25" stroke-width="2"/>`;
          s += txt(x, ty + 3 + colH * 0.79, d.counts[c], 24, { extra: ' data-given="1"' });
        });
        if (st.pos == null) s += txt(vw / 2, ty + colH + 6 + gap + 22, "Tap a food to put Mimi here", vw < 340 ? 15 : 16, { fill: "#8a6f7d" });
        s += hop.draw(ctx, tableCfg(), 30, ty + colH + 6 + gap + 56, vw - 60);
        return s;
      }
      const rowH = Math.min(52, room / n);
      const ty = Math.max(4, (vh - (rowH * n + 6 + gap + band)) / 2);
      let s = chunkyRect(tx, ty, tw, rowH * n + 6, 16, "#fff");
      d.cats.forEach((k, c) => {
        const y = ty + 3 + rowH * (c + 0.5);
        s += `<rect data-tap="trow:${c}" class="${ctx.g("trow:" + c).trim()}" x="${r1(tx + 4)}" y="${r1(y - rowH / 2 + 1)}" width="${r1(tw - 8)}" height="${r1(rowH - 2)}" rx="10" fill="${ctx.glow.has("trow:" + c) ? "#fff3cf" : "#fff"}"/>`;
        if (c) s += `<line x1="${r1(tx + 6)}" y1="${r1(y - rowH / 2)}" x2="${r1(tx + tw - 6)}" y2="${r1(y - rowH / 2)}" stroke="${INK}" stroke-opacity=".2" stroke-width="2"/>`;
        s += artAt(api, k, tx + 28, y, rowH * 0.78) + txt(tx + 56, y, cap(foodOf(k).many), 19, { anchor: "start" });
        s += `<line x1="${r1(tx + tw - 70)}" y1="${r1(y - rowH / 2 + 4)}" x2="${r1(tx + tw - 70)}" y2="${r1(y + rowH / 2 - 4)}" stroke="${INK}" stroke-opacity=".25" stroke-width="2"/>`;
        s += txt(tx + tw - 35, y, d.counts[c], 24, { extra: ' data-given="1"' });
      });
      const ly = ty + rowH * n + 6 + gap + 56;
      if (st.pos == null) s += txt(vw / 2, ly - 34, "Tap a food to put Mimi here", vw < 340 ? 15 : 16, { fill: "#8a6f7d" });
      s += hop.draw(ctx, tableCfg(), 30, ly, vw - 60);
      return s;
    },
    // no "N hops" count: Marie counts Mimi's hops (the arcs) herself
    controls: ctx => hop.controls(ctx, tableCfg()),
    onTap(ctx, id) {
      // a row tap says the food's name, never its number (the number is written on the table). Saying every number
      // but keeping quiet on one that equals the answer would itself give the answer away.
      if (id.startsWith("trow:")) { const c = +id.slice(5), v = ctx.d.counts[c]; ctx.st.pos = ctx.st.start = v; ctx.st.hops = []; ctx.speak(cap(foodOf(ctx.d.cats[c]).many)); ctx.tone([600], 0.06); return; }
      hop.tap(ctx, tableCfg(), id);
    }
  };

  function makeCats(n) { return sample(FOODS.map(f => f.k), n); }
  // a small picture next to a food word in the question line, so Marie can match the word to the graph without reading it
  const foodWord = k => `<img src="${ARTPATH.ART(k)}" alt="" style="height:1.15em;width:auto;vertical-align:-0.22em;margin:0 .08em">${foodOf(k).many}`;

  topic({
    id: "graphs", title: "Read graphs", strand: "Data and chance",
    icon: `<svg viewBox="0 0 64 64" aria-hidden="true"><rect x="6" y="6" width="52" height="52" rx="12" fill="${CREAM}" stroke="${INK}" stroke-width="3.5"/><rect x="14" y="30" width="10" height="20" rx="2" fill="${COL.pink}" stroke="${INK}" stroke-width="3"/><rect x="27" y="16" width="10" height="34" rx="2" fill="${COL.blue}" stroke="${INK}" stroke-width="3"/><rect x="40" y="24" width="10" height="26" rx="2" fill="${COL.yellow}" stroke="${INK}" stroke-width="3"/></svg>`,
    levels: [
      { name: "Which has the most?", grade: 1, note: "BC Gr 1: concrete graphs, one-to-one correspondence.",
        make() {
          const cats = makeCats(3), ask = Math.random() < 0.65 ? "most" : "fewest";
          let counts;
          do { counts = cats.map(() => ri(1, 7)); } while (counts.filter(v => v === (ask === "most" ? Math.max(...counts) : Math.min(...counts))).length !== 1);
          const ext = ask === "most" ? Math.max(...counts) : Math.min(...counts);
          return { key: cats.map((k, i) => k + counts[i]).join("") + ask, say: `Tap the plates to line them up. Which has the ${ask}?`, show: `Which has the ${ask}?`, answer: cats[counts.indexOf(ext)],
            input: { type: "choice", choices: cats.map(k => foodChoice(ARTPATH, k)) }, data: { kind: "concrete", ask, cats, counts } };
        },
        spec: concreteSpec,
        hint: Q => `Tap each plate until it is empty, so every thing is in its line. Which line is ${Q.data.ask === "most" ? "the longest" : "the shortest"}?`,
        async teach(ctx, Q) {
          const d = Q.data;
          // Mimi says only the first plate's first numbers; the other lines Marie builds and counts herself
          for (let c = 0; c < d.cats.length; c++) {
            const id = "heap:" + c, many = foodOf(d.cats[c]).many;
            const steps = [...Array(d.counts[c]).keys()].map(i => ({ pred: s => (s.placed[c] || 0) > i, glow: [id], only: (k, x) => k !== "tap" || x === id }));
            await countAlong(ctx, steps, c === 0 ? `Line up the ${many}. Tap the plate that glows, one tap for each.` : `Now line up the ${many}. One tap for each.`, c === 0 ? undefined : 0);
            await ctx.pause(300);
          }
          ctx.say(d.ask === "most" ? "Look at your lines. Which line is the longest? Which has the biggest number?" : "Look at your lines. Which line is the shortest? Which has the smallest number?");
        } },
      { name: "Pictographs", grade: 2, note: "BC Gr 2: pictorial representation (pictographs), one picture for one thing.",
        make() {
          const n = ri(3, 4), cats = makeCats(n), counts = cats.map(() => ri(2, 10));
          const total = Math.random() < 0.3;
          if (total) {
            const [a, b] = sample([0, 1, 2], 2).sort((x, y) => x - y);
            return { key: `t${cats.join("")}${counts.join("")}${a}${b}`, say: `How many ${foodOf(cats[a]).many} and ${foodOf(cats[b]).many} in all?`, show: `${foodWord(cats[a])} and ${foodWord(cats[b])} in all?`,
              answer: String(counts[a] + counts[b]), input: { type: "number", unit: "" }, data: { kind: "picto", cats, counts, ask: [a, b] } };
          }
          const a = ri(0, n - 1);
          return { key: `c${cats.join("")}${counts.join("")}${a}`, say: `How many ${foodOf(cats[a]).many}?`, show: `How many ${foodWord(cats[a])}?`,
            answer: String(counts[a]), input: { type: "number", unit: "" }, data: { kind: "picto", cats, counts, ask: [a] } };
        },
        spec: pictoSpec,
        hint: Q => Q.data.ask.length === 2 ? `Count the ${foodOf(Q.data.cats[Q.data.ask[0]]).many}. Then keep counting the ${foodOf(Q.data.cats[Q.data.ask[1]]).many}.`
          : `Find the ${foodOf(Q.data.cats[Q.data.ask[0]]).many} row. Tap each picture one time.`,
        async teach(ctx, Q) {
          const d = Q.data; ctx.st.badge = {}; ctx.st.n = 0;
          // one count over the asked rows: Kitty says the first numbers only, then Marie counts on to the end
          const steps = [], total = d.ask.reduce((a, c) => a + d.counts[c], 0), show = ctx.recounting ? 0 : demoTaps(total);
          d.ask.forEach((c, ri2) => { for (let i = 0; i < d.counts[c]; i++) { const id = `p:${c}:${i}`;
            steps.push({ pred: s => !!s.badge[id], glow: [id], only: (k, x) => k !== "tap" || x === id || x === "row:" + c,
              say: ri2 > 0 && i === 0 ? (steps.length === show && !ctx.recounting ? `${YOUR_TURN} Now the ${foodOf(d.cats[c]).many}.` : `Keep counting. Now the ${foodOf(d.cats[c]).many}.`) : undefined }); } });
          await countAlong(ctx, steps, `Find the ${foodOf(d.cats[d.ask[0]]).many}. Tap each one.`, show);
          typeIt(ctx);
        } },
      { name: "Bar graphs and tables", grade: 3, note: "BC Gr 3: one-to-one and many-to-one correspondence; bar graphs, pictographs with a key (1 picture = 2), charts and tables.",
        make() {
          const n = ri(3, 4), cats = makeCats(n);
          if (Math.random() < 0.25) {
            // many-to-one: each picture means 2. Three rows of 1 to 5 pictures (2 to 10 things), so each row is one
            // finger-sized line even on a small phone. The row she is asked about has at least 2 pictures: with one
            // picture the answer would be the key's own number, said in "One picture means 2" (lesson rule, 16 Oct).
            const cats = makeCats(3), counts = cats.map(() => 2 * ri(1, 5)), a = ri(0, 2);
            if (counts[a] < 4) counts[a] = 2 * ri(2, 5);
            return { key: `k2${cats.join("")}${counts.join("")}${a}`, say: `Each picture means 2. How many ${foodOf(cats[a]).many}?`, show: `1 picture = 2. How many ${foodWord(cats[a])}?`,
              answer: String(counts[a]), input: { type: "number", unit: "" }, data: { kind: "picto", key: 2, cats, counts, ask: [a] } };
          }
          let counts, x, y;
          do { counts = cats.map(() => ri(1, 10)); [x, y] = sample([...Array(n).keys()], 2); } while (counts[x] <= counts[y] || counts[x] - counts[y] > 7);
          const kind = Math.random() < 0.65 ? "bar" : "table";
          return { key: `${kind}${cats.join("")}${counts.join("")}${x}${y}`, say: `How many more ${foodOf(cats[x]).many} than ${foodOf(cats[y]).many}?`,
            show: `How many more ${foodWord(cats[x])} than ${foodWord(cats[y])}?`, answer: String(counts[x] - counts[y]), input: { type: "number", unit: "" },
            data: { kind, cats, counts, x, y } };
        },
        spec: (() => { const S = c => ({ bar: barSpec, table: tableSpec, picto: pictoSpec })[c.d.kind];
          return { init: c => S(c).init(c), draw: c => S(c).draw(c), controls: c => S(c).controls(c), onTap: (c, id) => S(c).onTap(c, id),
            onDrop: (c, id, at) => (c.d.kind === "bar" ? barSpec.onDrop(c, id, at) : undefined), tallBelow: 1.25 }; })(),
        hint: Q => Q.data.kind === "picto" ? `Look at the key. Each picture means 2. Tap each ${foodOf(Q.data.cats[Q.data.ask[0]]).one || "picture"} and count by 2s.`
          : Q.data.kind === "bar" ? `Drag the purple line to the end of the ${foodOf(Q.data.cats[Q.data.y]).many} bar. Count the ${foodOf(Q.data.cats[Q.data.x]).many} squares past the line.`
          : `Tap the food with the smaller number to put Mimi there. Hop +1 until you reach the bigger number. Count the hops.`,
        async teach(ctx, Q) {
          const d = Q.data;
          if (d.kind === "picto") {
            const c = d.ask[0], st = ctx.st; st.badge = {}; st.n = 0;
            ctx.say(`Look at the key. One picture means ${d.key}.`); await ctx.pause(1600);
            const steps = [...Array(d.counts[c] / d.key).keys()].map(i => { const id = `p:${c}:${i}`; return { pred: s => !!s.badge[id], glow: [id], only: (k, x) => k !== "tap" || x === id || x === "row:" + c }; });
            await countAlong(ctx, steps, `Count the ${foodOf(d.cats[c]).many} by ${d.key}s. Tap each picture and count on by ${d.key}.`);
            typeIt(ctx);
            return;
          }
          const X = d.counts[d.x], Y = d.counts[d.y], nx = foodOf(d.cats[d.x]).many, ny = foodOf(d.cats[d.y]).many;
          if (d.kind === "bar") {
            await ctx.wait(s => s.line === Y, { glow: ["guide", "lvl:" + Y], say: `Find the ${ny} bar. Drag the purple line to the end of it.`, only: (k, id, z) => k !== "drop" || z === "lvl:" + Y || z === "bar:" + d.y || z === null, onlyMsg: `Put the line at the end of the ${ny} bar.` });
            if (ctx.st.line !== Y) ctx.st.line = Y;
            ctx.st.badge = {}; ctx.st.n = 0;
            const steps = [];
            for (let i = Y; i < X; i++) { const id = `sq:${d.x}:${i}`; steps.push({ pred: s => !!s.badge[id], glow: [id], only: (k, x) => k !== "tap" || x === id || x === "bar:" + d.x }); }
            await countAlong(ctx, steps, `Now count the ${nx} squares past the line. Tap each one.`);
            typeIt(ctx, "That is how many more.");
          } else {
            // the answer is the number of hops: Kitty says the first hop numbers only (never where she lands), and
            // never the smaller table number aloud (it can be the same as the answer)
            await ctx.wait(s => s.pos === Y && s.hops.length === 0, { glow: ["trow:" + d.y], say: `Find the ${ny}. Tap the ${ny} to put Mimi on its number.`, only: (k, id) => k !== "tap" || id === "trow:" + d.y, onlyMsg: `Tap the ${ny}.` });
            const steps = [];
            for (let i = Y; i < X; i++) steps.push({ pred: s => s.hops.length > i - Y || s.pos === X, glow: ["hop:1"], only: (k, id) => k !== "tap" || id === "hop:1" });
            await countAlong(ctx, steps, `Tap +1 until Mimi reaches the ${nx} number. Count the hops.`);
            ctx.say((ctx.recounting ? "The last number we said is how many hops. " : "How many hops did Mimi make? ") + "That is how many more. Type it.");
          }
        } }
    ]
  });

  /* =====================================================================================
     PATTERNS  (Patterns)
     ===================================================================================== */
  // A token is one picture in a pattern: "art:strawberry", "face:kitty", "bow:pink", "shape:circle:pink", "letter:A".
  const TOKEN_SETS = [
    ["art:strawberry", "art:star", "art:heart", "art:cupcake", "art:cherries"],
    ["face:kitty", "face:melody", "face:kuromi", "face:purin", "face:cinna"],
    ["bow:pink", "bow:blue", "bow:yellow", "bow:green", "bow:purple"],
    ["art:tulip", "art:sunflower", "art:blossom", "art:candy", "art:lollipop"]
  ];
  const ART_WORD = { strawberry: "strawberry", star: "star", heart: "heart", cupcake: "cupcake", cherries: "cherries", tulip: "tulip", sunflower: "sunflower", blossom: "flower", candy: "candy", lollipop: "lollipop" };
  function tokenName(t) {
    const [k, a, b] = t.split(":");
    if (k === "art") return ART_WORD[a] || a;
    if (k === "face") return NAMES[a];
    if (k === "bow") return `${a} bow`;
    if (k === "shape") return `${b} ${a}`;
    return a;
  }
  // Drawn inside a size x size box centred at (x, y).
  function shapePath(kind, x, y, s) {
    const h = s / 2;
    if (kind === "circle") return { circle: [x, y, h * 0.88] };
    if (kind === "square") return { pts: [[x - h * 0.8, y - h * 0.8], [x + h * 0.8, y - h * 0.8], [x + h * 0.8, y + h * 0.8], [x - h * 0.8, y + h * 0.8]] };
    if (kind === "triangle") return { pts: [[x, y - h * 0.9], [x + h * 0.95, y + h * 0.78], [x - h * 0.95, y + h * 0.78]] };
    if (kind === "heart") return { d: `M${r1(x)} ${r1(y + h * 0.85)} C${r1(x - h * 1.25)} ${r1(y)} ${r1(x - h * 0.75)} ${r1(y - h * 1.05)} ${r1(x)} ${r1(y - h * 0.4)} C${r1(x + h * 0.75)} ${r1(y - h * 1.05)} ${r1(x + h * 1.25)} ${r1(y)} ${r1(x)} ${r1(y + h * 0.85)} Z` };
    if (kind === "star") { const p = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? h * 0.42 : h * 0.95; p.push([x + r * Math.cos(a), y + 0.06 * s + r * Math.sin(a)]); } return { pts: p }; }
    return { circle: [x, y, h * 0.8] };
  }
  function drawShapeToken(kind, colour, x, y, s, sw = 3.5) {
    const P = shapePath(kind, x, y, s), fill = COL[colour] || colour;
    if (P.circle) return chunkyCircle(P.circle[0], P.circle[1], P.circle[2], fill, { sw, dy: 3 });
    if (P.pts) return chunkyPoly(P.pts, fill, { sw, dy: 3 });
    return `<path d="${P.d}" transform="translate(0 3)" fill="${INK}" stroke="${INK}" stroke-width="${sw}" stroke-linejoin="round"/><path d="${P.d}" fill="${fill}" stroke="${INK}" stroke-width="${sw}" stroke-linejoin="round"/>`;
  }
  function drawToken(api, t, x, y, s) {
    const [k, a, b] = t.split(":");
    if (k === "art") return artAt(api, a, x, y, s);
    if (k === "face") return faceAt(api, a, x, y, s * 0.98);
    if (k === "bow") return bow(x, y, s * 0.96, COL[a]);
    if (k === "shape") return drawShapeToken(a, b, x, y, s * 0.86);
    return chunkyRect(x - s * 0.42, y - s * 0.42, s * 0.84, s * 0.84, 12, "#fff", { dy: 3 }) + txt(x, y + 1, a, s * 0.5);
  }
  const tokenSVG = (api, t, size = 52) => `<svg viewBox="0 0 60 60" width="${size}" height="${size}" aria-hidden="true" overflow="visible">${drawToken(api, t, 30, 30, 50)}</svg>`;
  // A pattern inside an answer button. It is laid out in whole lines (one line up to 4 pictures, else two even
  // lines), never a narrow column grid, so it always reads left to right like the row in the picture.
  const lineCount = n => (n <= 4 ? n : Math.ceil(n / 2));
  const stripHTML = (api, toks) => {
    const per = lineCount(toks.length), lines = [];
    for (let i = 0; i < toks.length; i += per) lines.push(`<span class="sd-line">${toks.slice(i, i + per).map(t => tokenSVG(api, t, 24)).join("")}</span>`);
    return `<span class="sd-mini sd-k${per}">${lines.join("")}</span>`;
  };
  const lettersHTML = toks => {
    const per = lineCount(toks.length), lines = [];
    for (let i = 0; i < toks.length; i += per) lines.push(toks.slice(i, i + per).map(t => t.split(":")[1]).join(" "));
    return `<span class="sd-ch"><span class="sd-letters">${lines.join("<br>")}</span></span>`;
  };
  const CORES = { AB: [0, 1], AAB: [0, 0, 1], ABB: [0, 1, 1], ABC: [0, 1, 2], AABB: [0, 0, 1, 1], ABCD: [0, 1, 2, 3], ABAC: [0, 1, 0, 2] };
  const canon = seq => { const m = new Map(); return seq.map(t => { if (!m.has(t)) m.set(t, m.size); return m.get(t); }).join(""); };
  const nextOf = (core, i) => core[i % core.length];

  // Lay out n items in rows that fit the box; returns centres and the item size.
  // period = length of the repeating part. When the row wraps, the number per row is never a multiple of it:
  // otherwise each row (or each column) would line up the repeats and show the answer.
  function rowLayout(n, x0, y0, w, h, maxS = 66, period = 0) {
    let best = null;
    for (let per = n; per >= 1; per--) {
      const rows = Math.ceil(n / per);
      if (rows > 3) break;
      const aligned = rows > 1 && period > 0 && per % period === 0;
      const s = Math.min(maxS, (w - 6) / per - 8, h / rows - 12);
      // above about 58 units a bigger picture does not help, so then fewer rows win (easier to read in a line)
      const score = Math.min(s, 58) - rows * 2 - (aligned ? 1000 : 0);
      if (!best || score > best.score + 0.01) best = { rows, per, s, score };
    }
    const { per, s, rows } = best, gap = 8, rowW = per * (s + gap) - gap;
    const pos = [];
    for (let i = 0; i < n; i++) {
      const r = Math.floor(i / per), c = i % per;
      pos.push([x0 + (w - rowW) / 2 + c * (s + gap) + s / 2, y0 + (h - rows * (s + 14)) / 2 + r * (s + 14) + (s + 14) / 2]);
    }
    return { pos, s, per, rows };
  }

  // Level 1 and 3 picture: the pattern in a row, a box for the next one, a tray of pictures to drag.
  const seqSpec = {
    init: () => ({ said: {}, slot: null, sel: null, cuts: {}, mark: {} }),
    draw(ctx) {
      const { vw, vh, st, d, api } = ctx, withSlot = d.mode === "next";
      const n = d.seq.length + (withSlot ? 1 : 0);
      const trayH = withSlot ? 88 : 0;
      const L = rowLayout(n, 8, 6, vw - 16, vh - trayH - 12, ctx.tall ? 70 : 100, d.core.length);
      let s = chunkyRect(4, 4, vw - 8, vh - trayH - 8 - (withSlot ? 6 : 0), 18, CREAM, { dy: 0 });
      d.seq.forEach((t, i) => {
        const [x, y] = L.pos[i], id = "it:" + i;
        if (st.cuts[i] && i > 0) { const [px] = L.pos[i - 1]; if (L.pos[i - 1][1] === y) s += `<line x1="${r1((px + x) / 2)}" y1="${r1(y - L.s * 0.62)}" x2="${r1((px + x) / 2)}" y2="${r1(y + L.s * 0.62)}" stroke="#e0306b" stroke-width="4" stroke-dasharray="6 5" stroke-linecap="round"/>`; else s += `<line x1="${r1(x - L.s / 2 - 5)}" y1="${r1(y - L.s * 0.62)}" x2="${r1(x - L.s / 2 - 5)}" y2="${r1(y + L.s * 0.62)}" stroke="#e0306b" stroke-width="4" stroke-dasharray="6 5"/>`; }
        s += `<g data-tap="${id}" class="${(ctx.g(id) + (ctx.fresh.has(id) ? " sd-wig" : "")).trim()}"><rect x="${r1(x - L.s / 2 - 4)}" y="${r1(y - L.s / 2 - 4)}" width="${r1(L.s + 8)}" height="${r1(L.s + 8)}" fill="#fff" fill-opacity=".01"/><rect x="${r1(x - L.s / 2 - 3)}" y="${r1(y - L.s / 2 - 3)}" width="${r1(L.s + 6)}" height="${r1(L.s + 6)}" rx="14" fill="${st.mark[i] ? "#fff3cf" : "#fff"}" fill-opacity="${st.mark[i] ? 1 : 0.55}" stroke="${st.mark[i] ? GOLD : "none"}" stroke-width="3"/>${drawToken(api, t, x, y, L.s * 0.86)}</g>`;
      });
      if (withSlot) {
        const [x, y] = L.pos[n - 1];
        s += `<g data-zone="slot" class="${ctx.g("slot").trim()}"><rect x="${r1(x - L.s / 2 - 3)}" y="${r1(y - L.s / 2 - 3)}" width="${r1(L.s + 6)}" height="${r1(L.s + 6)}" rx="14" fill="#fff" stroke="#e0306b" stroke-width="3.5" stroke-dasharray="8 6"/>${st.slot ? drawToken(api, st.slot, x, y, L.s * 0.86) : txt(x, y + 2, "?", L.s * 0.55, { fill: "#e0306b" })}</g>`;
        // tray
        const ty = vh - trayH / 2 - 4, k = d.tray.length, tw = Math.min(vw - 30, k * 86);
        s += chunkyRect((vw - tw) / 2 - 8, ty - 38, tw + 16, 76, 22, "#fff", { dy: 4 });
        d.tray.forEach((t, i) => {
          const x = (vw - tw) / 2 + tw * (i + 0.5) / k, id = "tray:" + i;
          s += `<g data-drag="${id}" class="${ctx.g(id).trim()}"${ctx.teaching && t === d.answerTok ? ' data-teach="1"' : ""}><rect x="${r1(x - 34)}" y="${r1(ty - 34)}" width="68" height="68" rx="16" fill="#fff" fill-opacity=".01"/>${drawToken(api, t, x, ty, 54)}</g>`;
        });
      }
      return s;
    },
    controls: ctx => ctx.d.mode === "core" ? resetBtn(ctx, "clear", "↺ Start again", anyOn(ctx.st.cuts) || anyOn(ctx.st.mark)) : "",
    onTap(ctx, id) {
      const st = ctx.st, d = ctx.d;
      if (id === "clear") { st.cuts = {}; st.mark = {}; return; }
      if (!id.startsWith("it:")) return;
      const i = +id.slice(3);
      if (d.mode === "core" && st.markNext === undefined && i > 0) { st.cuts[i] = !st.cuts[i]; ctx.tone([st.cuts[i] ? 700 : 500], 0.06); }
      if (ctx.teaching && st.markNext !== undefined) st.mark[i] = true;
      st.said[i] = true; ctx.fresh.add(id); ctx.speak(tokenName(d.seq[i]));
    },
    onDrop(ctx, id, at) {
      if (!id.startsWith("tray:")) return;
      if (at.zone !== "slot") return;
      const t = ctx.d.tray[+id.slice(5)];
      // in the lesson a wrong picture is not put in the box: Kitty asks her to say the pattern again
      if (ctx.teaching && t !== ctx.d.answerTok) { ctx.say(`${cap(tokenName(t))}? Say the pattern again. What comes next?`); ctx.tone([330], 0.15, "triangle"); return; }
      ctx.st.slot = t; ctx.tone([523, 784], 0.08); ctx.speak(tokenName(t));
    }
  };
  async function teachSaySeq(ctx, Q, upto) {
    const d = Q.data;
    for (let i = 0; i < upto; i++) {
      await ctx.wait(s => !!s.said[i], { glow: ["it:" + i], say: i === 0 ? "Say the pattern with me. Tap each picture." : undefined, only: (k, id) => k !== "tap" || id === "it:" + i });
      ctx.st.said = { ...ctx.st.said };
    }
  }
  async function teachRepeatPart(ctx, Q) {
    const d = Q.data, L = d.core.length, st = ctx.st;
    st.markNext = true; st.mark = {}; st.said = {};
    for (let i = 0; i < L; i++) {
      await ctx.wait(s => !!s.mark[i], { glow: ["it:" + i], say: i === 0 ? "What part repeats? Tap the pictures before it starts again." : undefined, only: (k, id) => k !== "tap" || id === "it:" + i });
    }
    ctx.say(`${d.core.map(c => tokenName(d.toks[c])).join(", ")}. That part repeats!`);
    await ctx.pause(1400);
    st.markNext = undefined;
  }

  // "Which part repeats?" lesson step: Marie taps where the row starts again after the cut at `base` (want is the
  // right place, which Kitty never lights or says). The pictures after the cut all glow alike. A miss is not simply
  // refused: Kitty checks it WITH her, tap by tap: the first picture after the cut, then the one she chose, the
  // next two, and so on, until two of them are not the same ("So it does not start again there"). Mimi says how
  // to check, never where the answer is. st.finding holds the cut while she looks (tests read it).
  async function findRestart(ctx, Q, base, want, ask) {
    const d = Q.data, st = ctx.st, n = d.seq.length, keep = () => { st.cuts = {}; for (let c = d.core.length; c < want; c += d.core.length) st.cuts[c] = true; };
    for (let say = ask; ;) {
      let picked = null;
      const cands = []; for (let j = base + 1; j < n; j++) cands.push("it:" + j);
      st.finding = base;
      await ctx.wait(() => picked !== null, { glow: cands, say,
        only: (k, id) => { if (k !== "tap") return false; const j = id.startsWith("it:") ? +id.slice(3) : -1; if (j > base) { picked = j; return true; } return false; },
        onlyMsg: base ? "Look after the cut. Tap a picture there." : "Tap a picture after the first one." });
      st.finding = null; keep(); ctx.render();
      if (picked === want) { st.cuts[want] = true; ctx.render(); ctx.tone([523, 784], 0.08); return; }
      // a miss: compare the row from the cut with the row from her picture, one pair at a time, with her taps
      ctx.say("Let's check. Tap the picture that glows, then the next one that glows, and listen."); await ctx.pause(900);
      let t = 0, differ = false;
      for (; picked + t < n; t++) {
        for (const i of [base + t, picked + t]) {
          st.said = { ...st.said, [i]: false };
          await ctx.wait(s => !!s.said[i], { glow: ["it:" + i], only: (k, id) => k !== "tap" || id === "it:" + i });
          keep(); ctx.render();
        }
        if (d.seq[base + t] !== d.seq[picked + t]) { differ = true; break; }
      }
      say = differ ? "Those two are not the same. So it does not start again there. Look again: where does it start again?"
        : "It does start again there! Is there a place before it where it starts again?";
    }
  }

  // Level 2 picture: a colour pattern; Marie drags letters or shapes under it to say it a new way.
  const transSpec = {
    init: ctx => ({ under: {}, sel: null }),
    draw(ctx) {
      const { vw, vh, st, d, api } = ctx, n = d.seq.length;
      // a short box (small phones) packs the rows closer, so the pictures and slots stay finger sized
      const short = vh < 300, trayH = short ? 70 : 84, rowGap = short ? 14 : 24, bandGap = short ? 12 : 20;
      // the cream panel runs from y = 4 to 4 + panelH; every band (a row of circles and its row of boxes) fits inside it
      const panelH = vh - trayH - 14;
      const size = b => Math.min(64, (vw - 14) / Math.ceil(n / b) - 8, ((panelH - 16 - (b - 1) * bandGap) / b - rowGap) / 2);
      const bands = size(2) > size(1) + 4 ? 2 : 1, per = Math.ceil(n / bands), s0 = size(bands);
      // spare width goes into the gaps, which widens each slot's drop area
      const gap = Math.max(8, Math.min(20, (vw - 14) / per - s0)), rowW = per * (s0 + gap) - gap, x0 = (vw - rowW) / 2 + s0 / 2, bandH = s0 * 2 + rowGap + bandGap;
      const top = 4 + Math.max(8, (panelH - (bandH * bands - bandGap)) / 2);
      let s = chunkyRect(4, 4, vw - 8, panelH, 18, CREAM, { dy: 0 });
      for (let i = 0; i < n; i++) {
        const x = x0 + (i % per) * (s0 + gap), band = Math.floor(i / per);
        const y1 = top + band * bandH + s0 / 2, y2 = y1 + s0 + rowGap;
        s += `<g data-tap="it:${i}" class="${ctx.g("it:" + i).trim()}"><rect x="${r1(x - s0 / 2 - gap / 2)}" y="${r1(y1 - s0 / 2 - 8)}" width="${r1(s0 + gap)}" height="${r1(s0 + 16)}" rx="10" fill="#fff" fill-opacity=".01"/>${drawToken(api, d.seq[i], x, y1, s0 * 0.86)}</g>`;
        s += `<path d="M${r1(x)} ${r1(y1 + s0 * 0.46)} v8" stroke="${INK}" stroke-width="2.5" stroke-linecap="round" opacity=".4"/>`;
        s += `<g data-zone="u:${i}" class="${ctx.g("u:" + i).trim()}"><rect x="${r1(x - s0 / 2 - gap / 2)}" y="${r1(y2 - s0 / 2 - 9)}" width="${r1(s0 + gap)}" height="${r1(s0 + 18)}" rx="14" fill="#fff" fill-opacity=".01"/><rect x="${r1(x - s0 / 2)}" y="${r1(y2 - s0 / 2)}" width="${r1(s0)}" height="${r1(s0)}" rx="12" fill="#fff" stroke="${st.under[i] ? INK : "#c9b6c0"}" stroke-width="3" stroke-dasharray="${st.under[i] ? "0" : "6 5"}"/>${st.under[i] ? drawToken(api, st.under[i], x, y2, s0 * 0.8) : ""}</g>`;
      }
      const ty = vh - trayH / 2 - 2, k = d.tray.length, tw = Math.min(vw - 30, k * 84), th = trayH - 12, hit = th - 8;
      s += chunkyRect((vw - tw) / 2 - 8, ty - th / 2, tw + 16, th, 22, "#fff", { dy: 4 });
      d.tray.forEach((t, i) => {
        const x = (vw - tw) / 2 + tw * (i + 0.5) / k, id = "tray:" + i;
        s += `<g data-drag="${id}" class="${ctx.g(id).trim()}"${ctx.teaching && st.want === i ? ' data-teach="1"' : ""}><rect x="${r1(x - hit / 2)}" y="${r1(ty - hit / 2)}" width="${hit}" height="${hit}" rx="16" fill="#fff" fill-opacity=".01"/>${drawToken(api, t, x, ty, hit - 12)}</g>`;
      });
      return s;
    },
    onTap(ctx, id) { if (id.startsWith("it:")) { ctx.speak(tokenName(ctx.d.seq[+id.slice(3)])); } },
    onZoneTap(ctx, z) { if (z.startsWith("u:") && ctx.st.under[+z.slice(2)]) { delete ctx.st.under[+z.slice(2)]; ctx.tone([400], 0.06); } },
    onDrop(ctx, id, at) {
      if (!id.startsWith("tray:") || !at.zone || !at.zone.startsWith("u:")) return;
      const t = ctx.d.tray[+id.slice(5)]; ctx.st.under[+at.zone.slice(2)] = t; ctx.tone([600, 760], 0.06); ctx.speak(tokenName(t));
    }
  };

  // Levels 4 and 5 picture: stepping stones with the numbers, and a ruler Kitty hops along.
  // The ruler is worked out from the numbers Marie can see only, never from the hidden one, so its ends
  // can not give the answer away. Both ends get the same margin (more than one jump), rounded outwards.
  function numCfg(d) {
    const sizes = d.rule.op === "sub" ? [-1, -2, -5, -10] : [1, 2, 5, 10];
    const shown = d.seq.filter((v, i) => i !== d.miss);
    const lo = Math.min(...shown), hi = Math.max(...shown);
    let L0, H0;
    if (d.rule.op === "double") { L0 = 0; H0 = clamp(Math.ceil(hi * 2.5 / 10) * 10, 20, 100); }
    else {
      const k = d.rule.k, m = k + Math.max(1, Math.round(k / 2)), span = hi - lo + 2 * m;
      const r = span <= 24 ? 1 : span <= 60 ? 5 : 10;
      L0 = Math.max(0, Math.floor((lo - m) / r) * r); H0 = Math.ceil((hi + m) / r) * r;
    }
    const span = Math.max(1, hi - lo);
    // no dots on the ruler for the numbers in the boxes: evenly spaced dots with one missing would point straight at
    // the answer's place, and Marie must find it by hopping
    // No landmark label is written at any number of the pattern (the missing one, or the ones in the boxes): when the
    // pattern counts by 5 or 10, the landmarks ARE the pattern, so the next label would be the answer. Mimi's start
    // number is still shown in pink once she stands on it, and the major ticks stay, so Marie counts along herself.
    return { lo: L0, hi: Math.max(H0, L0 + 10), sizes: sizes.filter(k => Math.abs(k) <= span), marks: [], placeable: false, hide: d.seq.slice() };
  }
  const numSpec = {
    // Kitty is not on the ruler at the start: Marie chooses a number box and taps it to put her there
    init: () => hop.init({}, null),
    draw(ctx) {
      const { vw, vh, d } = ctx, cfg = numCfg(d), n = d.seq.length;
      const gap = vw < 400 ? 6 : 10, sw = Math.min(70, (vw - 16) / n - gap), rowW = n * (sw + gap) - gap;
      let s = "";
      // stones on top, the ruler below; the pair sits in the middle of a tall picture instead of at the top
      const gapY = clamp(vh * 0.45, 110, 150), groupH = 26 + gapY + 44;
      const sy = vh > groupH + 30 ? (vh - groupH) / 2 + 26 : Math.min(60, vh * 0.22);
      for (let i = 0; i < n; i++) {
        const x = (vw - rowW) / 2 + i * (sw + gap) + sw / 2, miss = i === d.miss;
        s += `<g${miss ? "" : ` data-tap="stone:${i}" class="${ctx.g("stone:" + i).trim()}"`}>${chunkyRect(x - sw / 2, sy - 26, sw, 52, 18, miss ? "#fff" : i % 2 ? TINT.blue : TINT.pink, { sw: 3 })}</g>`;
        if (miss) s += `<rect x="${r1(x - sw / 2 + 5)}" y="${r1(sy - 21)}" width="${r1(sw - 10)}" height="42" rx="13" fill="none" stroke="#e0306b" stroke-width="2.5" stroke-dasharray="6 5"/>`;
        s += txt(x, sy + 1, miss ? "?" : d.seq[i], sw < 50 ? 20 : 26, { fill: miss ? "#e0306b" : INK, extra: miss ? "" : ' data-given="1"' });
      }
      const ly = Math.min(vh - 44, sy + gapY);
      // until Kitty is placed, the place where she will stand says how to put her there
      if (ctx.st.pos == null) s += txt(vw / 2, ly - 34, "Tap a number box to put Mimi here", vw < 340 ? 15 : 16, { fill: "#8a6f7d" });
      s += hop.draw(ctx, cfg, 26, ly, vw - 52);
      return s;
    },
    controls: ctx => hop.controls(ctx, numCfg(ctx.d)),
    onTap(ctx, id) {
      if (id.startsWith("stone:")) { const v = ctx.d.seq[+id.slice(6)]; ctx.st.pos = ctx.st.start = v; ctx.st.hops = []; ctx.speak(String(v)); ctx.tone([600], 0.06); return; }
      hop.tap(ctx, numCfg(ctx.d), id);
    }
  };
  async function hopTo(ctx, from, to, sayText, quiet) {
    const st = ctx.st, cfg = numCfg(ctx.d);
    // Marie puts Kitty on the starting number herself (unless Kitty is already standing there)
    if (st.pos !== from) {
      const k = ctx.d.seq.findIndex((v, i) => v === from && i !== ctx.d.miss);
      await ctx.wait(s => s.pos === from, { glow: ["stone:" + k], say: `Tap ${from} to put Mimi on it.`, only: (kd, id) => kd !== "tap" || id === "stone:" + k, onlyMsg: `Tap the ${from}.` });
    }
    st.start = from; st.hops = [];
    const dir = to >= from ? 1 : -1;
    st.target = to;
    // between two numbers given in the row Kitty may say where she lands (none of them is the answer); on the hop to
    // the missing number she says nothing (quiet): that landing is the answer, and the place before it nearly is
    ctx.aloud = quiet && !ctx.recounting ? 0 : Infinity;
    // one rule for what glows and what Kitty allows: a hop that goes the right way and does not pass the target from
    // where Kitty stands NOW. The glow is worked out again after every hop, so a hop that has become too big stops
    // glowing (Kitty never lights a button and then turns it down).
    const fits = (s, size) => Math.sign(size) === dir && dir * (s.pos + size) <= dir * to;
    await ctx.wait(s => s.pos === to, {
      glow: s => s.pos === to ? [] : cfg.sizes.filter(k => fits(s, k)).map(k => "hop:" + k), say: sayText,
      only: (k, id) => {
        if (k !== "tap") return true;
        if (id === "hop:undo" || id === "hop:reset") return true;
        if (!id.startsWith("hop:")) return false;
        return fits(ctx.st, +id.slice(4));
      }, onlyMsg: "That hop is too big. Try a smaller hop."
    });
    st.target = null; ctx.aloud = 0;
    return st.hops.reduce((a, b) => a + b, 0);
  }
  async function teachNumbers(ctx, Q) {
    const d = Q.data, seq = d.seq, miss = d.miss;
    const known = seq.map((v, i) => i).filter(i => i !== miss);
    const a = known[0], b = known[1];
    // When the question asks for the rule, the size of the jump IS the answer: Kitty never says it. Marie adds up
    // her own hops (the +2, +1 on the arcs) and picks the rule herself.
    const choice = Q.input.type === "choice";
    // Lesson rule (16 Oct 2026): Kitty never says the size of the jump as a number. With the jump and the number
    // before the gap, the answer would be one easy step away. Marie reads her own hops (the +2 on the arcs).
    const tell = () => "Look at your hops. How far did Mimi go?";
    if (b === a + 1) {
      const j1 = await hopTo(ctx, seq[a], seq[b], `How far is each jump? Hop from ${seq[a]} to ${seq[b]}.`);
      ctx.say(tell(j1)); await ctx.pause(1300);
      let j2 = null;
      if (d.rule.op === "double" || choice) {
        // the next pair of shown neighbours after the first pair (it may skip over the gap)
        const c = known.find(i => i >= b && known.includes(i + 1));
        if (c !== undefined) { j2 = await hopTo(ctx, seq[c], seq[c + 1], `Now hop from ${seq[c]} to ${seq[c + 1]}.`); ctx.say(tell(j2)); await ctx.pause(1300); }
      }
      if (choice) ctx.say("Was the jump the same both times, or did it get bigger? Did Mimi go up or down?");
      else if (d.rule.op === "double") { ctx.say(j2 !== null ? "The jump got bigger. Each number is doubled: the number plus the same again." : "Each number is doubled: the number plus the same again."); await ctx.pause(2200); }
      else ctx.say(`Each jump is the same. ${j1 > 0 ? "It goes up" : "It goes down"} by the same jump each time.`);
      await ctx.pause(1600);
    }
    if (choice) { ctx.say("So what is the rule?"); return; }
    const from = seq[miss - 1] !== undefined ? seq[miss - 1] : null;
    if (from === null) return;
    const step = d.rule.op === "double" ? from : d.rule.op === "sub" ? -d.rule.k : d.rule.k;
    // a doubling pattern's jump grows each time, so "the same jump" would be wrong: Mimi doubles the number she is on
    // (from is a number given in the question, so saying it is not the answer)
    await hopTo(ctx, from, from + step, d.rule.op === "double" ? `Mimi is on ${from}. Double it: hop as far as the number she is on.` : `Mimi is on ${from}. Make the same jump again.`, true);
    // Kitty does not say where she landed (that number is the answer): Marie counts on from her start on the ruler.
    // In the count-together lesson Kitty said each landing with her, the last one included.
    // a falling pattern (take away) hops down the ruler, so Marie counts BACK from the start; the others count on
    ctx.say(ctx.recounting ? "The last number we said is where Mimi landed. Type it." : `Where did Mimi land? Count ${step < 0 ? "back" : "on"} from ${from} on the ruler. Type it.`);
  }

  function makeNumberPattern(level) {
    // returns { seq, miss, rule }
    for (;;) {
      let rule, seq = [], n = 5;
      if (level === 3) {
        const k = pick([1, 2, 2, 5, 5, 10, 10, 3]); rule = { op: "add", k };
        const start = k === 10 ? ri(0, 5) * 10 + pick([0, 0, 5, 3]) : k === 5 ? ri(0, 8) * 5 : ri(0, 30);
        for (let i = 0; i < n; i++) seq.push(start + i * k);
      } else {
        const op = pick(["add", "add", "sub", "sub", "double"]);
        if (op === "double") { rule = { op, k: 2 }; n = pick([4, 5]); let v = pick([1, 2, 3, 5, 6]); for (let i = 0; i < n; i++) { seq.push(v); v *= 2; } }
        else {
          const k = pick([2, 3, 4, 5, 10, 3, 4]); rule = { op, k };
          const start = op === "add" ? ri(0, 40) : ri(k * 4 + 2, 100);
          for (let i = 0; i < n; i++) seq.push(start + (op === "add" ? 1 : -1) * i * k);
        }
      }
      if (Math.max(...seq) > 100 || Math.min(...seq) < 0) continue;
      let miss = Math.random() < 0.7 ? seq.length - 1 : ri(2, seq.length - 2);
      // doubling: two pairs of shown neighbours are needed, so Marie can see the jump grow (1, 2, _, 8 has only one pair)
      if (rule.op === "double" && miss === 2 && seq.length === 4) miss = 3;
      // a missing number equal to the jump: hops of that size are written on the arcs (+10), so it is left out
      if (rule.op !== "double" && seq[miss] === rule.k) continue;
      return { seq, miss, rule };
    }
  }
  const ruleLabel = r => r.op === "double" ? "Double" : r.op === "add" ? `Add ${r.k}` : `Take away ${r.k}`;
  const ruleValue = r => r.op === "double" ? "double" : `${r.op}${r.k}`;
  const ruleChoice = r => ({ value: ruleValue(r), label: ruleLabel(r), html: `<span class="sd-ch"><span class="sd-big">${r.op === "double" ? "×2" : (r.op === "add" ? "+" : "−") + r.k}</span><span class="sd-small">${ruleLabel(r).toLowerCase()}</span></span>` });

  topic({
    id: "patterns", title: "Find the pattern", strand: "Patterns",
    icon: `<svg viewBox="0 0 64 64" aria-hidden="true"><rect x="4" y="14" width="56" height="36" rx="12" fill="${CREAM}" stroke="${INK}" stroke-width="3.5"/><g transform="translate(15 32) scale(.42)">${BOW_PATH(COL.pink)}</g><circle cx="32" cy="32" r="7" fill="${COL.blue}" stroke="${INK}" stroke-width="3"/><g transform="translate(49 32) scale(.42)">${BOW_PATH(COL.pink)}</g></svg>`,
    levels: [
      { name: "What comes next?", grade: 1, note: "BC Gr 1: repeating patterns (AB, AAB, ABB, ABC, AABB); predicting an element.",
        make() {
          const cname = pick(["AB", "AB", "AAB", "ABB", "ABC", "AABB"]), core = CORES[cname];
          const set = pick(TOKEN_SETS), k = Math.max(...core) + 1, toks = sample(set, Math.max(3, k));
          const len = clamp(core.length * 2 + ri(1, core.length), 5, 9);
          const seq = []; for (let i = 0; i < len; i++) seq.push(toks[nextOf(core, i)]);
          const ans = toks[nextOf(core, len)];
          const tray = shuffle(toks.slice(0, Math.max(3, k)));
          return { key: cname + seq.join(""), say: "What comes next?", show: "What comes next?", answer: ans,
            input: { type: "choice", choices: tray.map(t => ({ value: t, label: cap(tokenName(t)), html: `<span class="sd-ch">${tokenSVG(ARTPATH_FACE, t)}</span>` })) },
            data: { mode: "next", core, toks, seq, tray, answerTok: ans } };
        },
        spec: seqSpec,
        hint: () => "Tap each picture and say it out loud. Find the part that repeats. Then drag the next picture into the box.",
        async teach(ctx, Q) {
          await teachSaySeq(ctx, Q, Q.data.seq.length);
          await teachRepeatPart(ctx, Q);
          const i = Q.data.tray.indexOf(Q.data.answerTok);
          ctx.st.slot = null;
          await ctx.wait(s => s.slot === Q.data.answerTok, { glow: ["slot"], say: "Say it again and keep going. What comes next? Drag it into the box." });
          ctx.say("Now tap the answer.");
        } },
      { name: "Same pattern, new look", grade: 1, note: "BC Gr 1: translating a pattern (colours to shapes) and letter coding (AB).",
        make() {
          const cname = pick(["AB", "AAB", "ABB", "ABC", "AABB"]), core = CORES[cname], k = Math.max(...core) + 1;
          const colours = sample(["pink", "blue", "yellow", "green", "purple"], k);
          const len = cname.length === 2 ? 6 : cname.length === 3 ? 6 : 8;
          const seq = []; for (let i = 0; i < len; i++) seq.push(`shape:circle:${colours[nextOf(core, i)]}`);
          const letters = Math.random() < 0.5;
          const alpha = letters ? ["letter:A", "letter:B", "letter:C"].slice(0, Math.max(k, 2)) : sample(["shape:square:purple", "shape:triangle:yellow", "shape:star:blue", "shape:heart:pink"], Math.max(k, 2));
          const right = seq.map((t, i) => alpha[nextOf(core, i)]);
          const wrongs = [], seen = new Set([canon(right)]);
          for (let tries = 0; wrongs.length < 2 && tries < 400; tries++) {
            const c2 = pick(Object.values(CORES).filter(c => Math.max(...c) + 1 === k || tries > 200));
            const cand = []; for (let i = 0; i < len; i++) cand.push(alpha[nextOf(c2, i)] || alpha[0]);
            // sometimes a random mix that is not a pattern of this kind at all
            const alt = tries % 3 === 2 ? right.map(t => pick(alpha)) : cand;
            const cn = canon(alt);
            if (!seen.has(cn) && new Set(alt).size > 1) { seen.add(cn); wrongs.push(alt); }
          }
          const opts = shuffle([right, ...wrongs]);
          const labels = ["a", "b", "c"];
          return { key: cname + colours.join("") + (letters ? "L" : "S"), say: letters ? "Drag a letter under each circle. Which letters show the same pattern?" : "Drag a shape under each circle. Which shapes show the same pattern?",
            show: "Which one is the same pattern?", answer: labels[opts.indexOf(right)],
            // letters are shown as big text (tiny letter tiles are too hard to read); shapes as a strip of pictures
            input: { type: "choice", choices: opts.map((o, i) => ({ value: labels[i], label: o.map(tokenName).join(" "),
              html: letters ? lettersHTML(o) : stripHTML(ARTPATH_FACE, o) })) },
            data: { core, seq, alpha, tray: alpha.slice(0, Math.max(k, 2)), opts, letters } };
        },
        spec: transSpec,
        hint: Q => `Give each colour its own ${Q.data.letters ? "letter" : "shape"}. Drag one under each circle. Then look for the same.`,
        async teach(ctx, Q) {
          const d = Q.data, st = ctx.st; st.under = {};
          const colOf = t => t.split(":")[2];
          const firsts = [];
          d.seq.forEach((t, i) => { if (!firsts.includes(t)) firsts.push(t); });
          for (let i = 0; i < d.seq.length; i++) {
            const want = firsts.indexOf(d.seq[i]); st.want = want;
            const isFirst = d.seq.indexOf(d.seq[i]) === i;
            await ctx.wait(s => s.under[i] === d.tray[want], {
              glow: ["tray:" + want, "u:" + i],
              say: isFirst ? `${cap(colOf(d.seq[i]))} gets ${d.letters ? "the letter " + d.tray[want].split(":")[1] : "the " + tokenName(d.tray[want])}. Drag it under the ${colOf(d.seq[i])} circle.` : `${cap(colOf(d.seq[i]))}.`,
              only: (k, id, z) => k === "tap" || (k === "pick" ? id === "tray:" + want : z === "u:" + i), onlyMsg: `Look at the colour. Which one goes with ${colOf(d.seq[i])}?`
            });
          }
          st.want = undefined;
          ctx.say("Now find the choice that looks like your row.");
        } },
      { name: "Find the part that repeats", grade: 2, note: "BC Gr 2: repeating patterns — identifying the core.",
        make() {
          const cname = pick(["AB", "AAB", "ABB", "ABC", "AABB", "ABAC"]), core = CORES[cname], k = Math.max(...core) + 1;
          const toks = sample(pick(TOKEN_SETS), k);
          const seq = []; for (let i = 0; i < core.length * 3; i++) seq.push(toks[nextOf(core, i)]);
          const right = core.map(c => toks[c]);
          const longer = right.concat([toks[core[0]]]);
          const shorter = right.length > 2 ? right.slice(0, -1) : [toks[core[1]], toks[core[0]], toks[core[0]]];
          const opts = shuffle([right, longer, shorter]), labels = ["a", "b", "c"];
          return { key: cname + seq.join(""), say: "Which part repeats?", show: "Which part repeats?", answer: labels[opts.indexOf(right)],
            input: { type: "choice", choices: opts.map((o, i) => ({ value: labels[i], label: o.map(tokenName).join(", "), html: stripHTML(ARTPATH_FACE, o) })) },
            data: { mode: "core", core, toks, seq, opts } };
        },
        spec: seqSpec,
        hint: () => "Tap each picture and say it. Where does it start again? Tap there to cut the row.",
        async teach(ctx, Q) {
          const d = Q.data, L = d.core.length;
          await teachSaySeq(ctx, Q, d.seq.length);
          ctx.st.cuts = {};
          // Round 2 (16 Oct 2026): Marie finds each place where the row starts again herself. Every picture after
          // the last cut glows the same, so none is pointed at. Kitty helps only after a miss (findRestart).
          for (let m = 1; m < 3; m++) await findRestart(ctx, Q, (m - 1) * L, m * L, m === 1 ? "Where does the row start again? Tap that picture." : "And where does it start again after that?");
          ctx.say("Look at one piece. That part repeats!");
        } },
      { name: "Growing number patterns", grade: 2, note: "BC Gr 2: increasing patterns with numbers to 100 (skip-counting by 1, 2, 3, 5, 10).",
        make() {
          const p = makeNumberPattern(3);
          return { key: p.seq.join(",") + "m" + p.miss, say: `What number is missing? ${p.seq.map((v, i) => i === p.miss ? "what" : v).join(", ")}.`, show: "What number is missing?",
            answer: String(p.seq[p.miss]), input: { type: "number", unit: "" }, data: p };
        },
        spec: numSpec,
        hint: () => "Tap the first number to put Mimi on it. Hop to the next number and count how far. Then make the same hop again.",
        teach: teachNumbers },
      { name: "Pattern rules", grade: 3, note: "BC Gr 3: increasing and decreasing patterns; pattern rules such as add 3, take away 2, doubling.",
        make() {
          const p = makeNumberPattern(4);
          if (Math.random() < 0.45) {
            const seq = p.seq, r = p.rule;
            const alts = [];
            if (r.op === "double") alts.push({ op: "add", k: seq[1] - seq[0] }, { op: "add", k: 2 }, { op: "sub", k: 2 });
            else alts.push({ op: r.op === "add" ? "sub" : "add", k: r.k }, { op: r.op, k: r.k === 2 ? 3 : r.k - 1 }, { op: r.op, k: r.k + 1 }, { op: "double", k: 2 });
            const fits = rr => seq.every((v, i) => i === 0 || v === (rr.op === "double" ? seq[i - 1] * 2 : rr.op === "add" ? seq[i - 1] + rr.k : seq[i - 1] - rr.k));
            const seen = new Set([ruleValue(r)]), wrong = [];
            for (const a of shuffle(alts)) { if (!seen.has(ruleValue(a)) && !fits(a) && a.k > 0) { seen.add(ruleValue(a)); wrong.push(a); } if (wrong.length === 2) break; }
            const opts = shuffle([r, ...wrong]);
            return { key: "rule" + seq.join(","), say: `What is the rule? ${seq.join(", ")}.`, show: "What is the rule?", answer: ruleValue(r),
              input: { type: "choice", choices: opts.map(ruleChoice) }, data: { ...p, miss: -1 } };
          }
          return { key: p.seq.join(",") + "m" + p.miss, say: `What number is missing? ${p.seq.map((v, i) => i === p.miss ? "what" : v).join(", ")}.`, show: "What number is missing?",
            answer: String(p.seq[p.miss]), input: { type: "number", unit: "" }, data: p };
        },
        spec: numSpec,
        hint: Q => Q.input.type === "choice" ? "Tap the first number to put Mimi on it. Hop to the next one. How far did she hop? Up or down? Check the next jump too."
          : "Tap a number to put Mimi on it. Hop to the next number and count how far. Is the jump the same each time, or does it get bigger?",
        teach: teachNumbers }
    ]
  });

  /* =====================================================================================
     SHAPES 2D  (Geometry)
     ===================================================================================== */
  const rotPt = (p, c, deg) => { const a = deg * Math.PI / 180, dx = p[0] - c[0], dy = p[1] - c[1]; return [c[0] + dx * Math.cos(a) - dy * Math.sin(a), c[1] + dx * Math.sin(a) + dy * Math.cos(a)]; };
  // Corner points of a flat shape that fits a size x size box centred at (cx, cy). A circle has none.
  function polyOf(kind, cx, cy, size, rot = 0) {
    const h = size / 2;
    let p;
    if (kind === "triangle") p = [-90, 30, 150].map(a => [cx + h * 1.02 * Math.cos(a * Math.PI / 180), cy + h * 0.16 + h * 1.02 * Math.sin(a * Math.PI / 180)]);
    else if (kind === "square") p = [[cx - h * 0.78, cy - h * 0.78], [cx + h * 0.78, cy - h * 0.78], [cx + h * 0.78, cy + h * 0.78], [cx - h * 0.78, cy + h * 0.78]];
    else if (kind === "rectangle") p = [[cx - h, cy - h * 0.55], [cx + h, cy - h * 0.55], [cx + h, cy + h * 0.55], [cx - h, cy + h * 0.55]];
    else if (kind === "pentagon" || kind === "hexagon") { const n = kind === "pentagon" ? 5 : 6; p = []; for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + i * 2 * Math.PI / n; p.push([cx + h * Math.cos(a), cy + h * 0.04 + h * Math.sin(a)]); } }
    else return null;
    return rot ? p.map(q => rotPt(q, [cx, cy], rot)) : p;
  }
  function drawFlat(kind, colour, cx, cy, size, rot = 0, sw = 4) {
    const p = polyOf(kind, cx, cy, size, rot), fill = COL[colour] || colour;
    if (!p) return chunkyCircle(cx, cy, size * 0.47, fill, { sw });
    return chunkyPoly(p, fill, { sw });
  }
  const flatSVG = (kind, colour, sz = 52) => `<svg class="sd-own" viewBox="0 0 64 64" width="${sz}" height="${sz}" aria-hidden="true" overflow="visible">${drawFlat(kind, colour, 32, 30, 50, 0, 3.5)}</svg>`;
  const SIDES = { triangle: 3, square: 4, rectangle: 4, pentagon: 5, hexagon: 6, circle: 0 };
  const SQ_RECT = { square: true, rectangle: true };
  const KIND_WORD = { triangle: "triangle", square: "square", rectangle: "rectangle", circle: "circle", pentagon: "pentagon", hexagon: "hexagon" };
  const kindChoice = (k, colour = "purple", words = true) => ({ value: k, label: cap(KIND_WORD[k]), html: `<span class="sd-ch">${flatSVG(k, colour, 46)}${words ? `<span>${cap(KIND_WORD[k])}</span>` : ""}</span>` });
  const nameChoice = k => ({ value: k, label: cap(KIND_WORD[k]), html: `<span class="sd-ch word">${cap(KIND_WORD[k])}</span>` });

  /* ----- Level 1: sort into two hoops, then say which one does not belong ----- */
  const ATTR_VALUES = { kind: ["triangle", "square", "circle", "rectangle"], colour: ["pink", "blue", "yellow", "green"], size: ["big", "small"] };
  function hoopLayout(ctx, n) {
    const { vw, vh } = ctx;
    if (ctx.tall) {
      const cell = Math.min(80, (vw - 20) / n), trayY = 10 + cell / 2;
      const R = Math.min((vw - 30) / 4, (vh - cell - 40) / 2, 110);
      return { cell, tray: i => [vw / 2 + (i - (n - 1) / 2) * cell, trayY], hoops: [[vw / 4 + 2, vh - R - 12], [vw * 3 / 4 - 2, vh - R - 12]], R };
    }
    const cell = Math.min(84, (vh - 20) / 2), tw = cell * 2 + 10;
    const R = Math.min((vw - tw - 50) / 4, vh / 2 - 16, 130);
    return { cell, tray: i => [14 + cell * (i % 2 + 0.5), vh / 2 + (Math.floor(i / 2) - 0.5) * cell], hoops: [[tw + 20 + R, vh / 2], [vw - R - 14, vh / 2]], R };
  }
  function inHoopPos(L, h, k, total) {
    const [hx, hy] = L.hoops[h], r = total <= 1 ? 0 : L.R * 0.5;
    const a = -Math.PI / 2 + k * 2 * Math.PI / Math.max(total, 1);
    return [hx + r * Math.cos(a), hy + r * Math.sin(a)];
  }
  const sortSpec = {
    init: () => ({ where: {}, sel: null, order: [] }),
    draw(ctx) {
      const { st, d } = ctx, L = hoopLayout(ctx, d.shapes.length);
      let s = "";
      L.hoops.forEach(([x, y], h) => {
        const empty = !Object.values(st.where).includes(h);
        s += `<g data-zone="hoop:${h}" class="${ctx.g("hoop:" + h).trim()}"><circle cx="${r1(x)}" cy="${r1(y)}" r="${r1(L.R)}" fill="${h ? TINT.blue : TINT.pink}" stroke="${INK}" stroke-width="3"/><circle cx="${r1(x)}" cy="${r1(y)}" r="${r1(L.R - 9)}" fill="none" stroke="${h ? COL.blue : COL.pink}" stroke-width="5" stroke-dasharray="2 10" stroke-linecap="round"/>${empty ? txt(x, y, "Drag here", 16, { fill: "#a58a98" }) : ""}</g>`;
      });
      for (let i = 0; i < d.shapes.length; i++) if (st.where[i] == null) { const [x, y] = L.tray(i); s += `<rect x="${r1(x - L.cell / 2 + 4)}" y="${r1(y - L.cell / 2 + 4)}" width="${r1(L.cell - 8)}" height="${r1(L.cell - 8)}" rx="14" fill="#fff" stroke="#e3d3db" stroke-width="2.5" stroke-dasharray="6 5"/>`; }
      d.shapes.forEach((sh, i) => {
        let x, y;
        if (st.where[i] == null) [x, y] = L.tray(i);
        else { const mates = st.order.filter(j => st.where[j] === st.where[i]); [x, y] = inHoopPos(L, st.where[i], mates.indexOf(i), mates.length); }
        // shapes shrink in a small hoop so three fit. When the rule is SIZE, every shape (tray and hoops) uses that
        // same scale: a big shape in a hoop must never look as small as a small one in the tray, because Marie
        // compares them herself.
        const k = clamp(L.R / 110, 0.6, 1), scale = d.rule === "size" ? k : st.where[i] == null ? 1 : k;
        const size = (sh.size === "big" ? 1 : 0.6) * Math.min(L.cell - 14, 66) * scale;
        const id = "sh:" + i;
        s += `<g data-drag="${id}" class="${ctx.g(id).trim()}"${ctx.teaching && st.want === i ? ' data-teach="1"' : ""}><rect x="${r1(x - L.cell / 2 + 6)}" y="${r1(y - L.cell / 2 + 6)}" width="${r1(L.cell - 12)}" height="${r1(L.cell - 12)}" rx="14" fill="#fff" fill-opacity=".01"/>${drawFlat(sh.kind, sh.colour, x, y, size)}</g>`;
      });
      return s;
    },
    controls: ctx => resetBtn(ctx, "clear", "↺ Start again", anyOn(ctx.st.where) || Object.keys(ctx.st.where).length > 0),
    onTap(ctx, id) { if (id === "clear") { ctx.st.where = {}; ctx.st.order = []; } },
    onDrop(ctx, id, at) {
      const i = +id.slice(3), st = ctx.st;
      let h = at.zone && at.zone.startsWith("hoop:") ? +at.zone.slice(5) : null;
      if (h == null && at.dragged) { const L = hoopLayout(ctx, ctx.d.shapes.length); L.hoops.forEach(([x, y], k) => { if (Math.hypot(at.x - x, at.y - y) < L.R + 10) h = k; }); }
      st.order = st.order.filter(j => j !== i);
      if (h == null) { delete st.where[i]; return; }
      st.where[i] = h; st.order.push(i); ctx.tone([523, 659], 0.06);
    }
  };
  const ATTR_WORD = { kind: "shape", colour: "colour", size: "size" };
  const attrSay = (attr, v) => attr === "kind" ? `${KIND_WORD[v]}s` : attr === "colour" ? `${v} ones` : `${v} ones`;

  /* ----- Level 2: in / out, up / down ----- */
  function sceneLayout(ctx) {
    const { vw, vh } = ctx, fs = clamp(Math.min(vw / 5.2, vh / 3.6), 50, 112);
    return { fs, floor: vh - 16, box: { x: vw * 0.5, w: Math.min(vw * 0.46, fs * 2.7), h: fs * 1.05 }, shelf: { y: vh * 0.3 + fs * 0.3, x0: vw * 0.08, x1: vw * 0.92 } };
  }
  function scenePos(ctx, d) {
    const { vw } = ctx, L = sceneLayout(ctx), out = {};
    if (d.scene === "box") {
      const ins = d.friends.filter(f => d.place[f] === "in"), outs = d.friends.filter(f => d.place[f] !== "in");
      ins.forEach((f, i) => { out[f] = [L.box.x + (i - (ins.length - 1) / 2) * L.fs * 0.95, L.floor - L.box.h - L.fs * 0.3]; });
      const spots = [vw * 0.12 + L.fs * 0.1, vw * 0.88 - L.fs * 0.1, vw * 0.12 + L.fs * 0.1];
      outs.forEach((f, i) => { out[f] = [i === 2 ? vw * 0.5 : spots[i], L.floor - L.fs * 0.48 - (i === 2 ? L.box.h + L.fs * 0.9 : 0)]; });
      if (outs.length === 3) out[outs[2]] = [vw * 0.5, L.floor - L.fs * 0.48 - L.box.h - L.fs * 0.2];
    } else {
      const ups = d.friends.filter(f => d.place[f] === "up"), downs = d.friends.filter(f => d.place[f] !== "up");
      ups.forEach((f, i) => { out[f] = [vw * (0.3 + i * 0.4), L.shelf.y - L.fs * 0.48]; });
      downs.forEach((f, i) => { out[f] = [vw * (downs.length === 1 ? 0.5 : 0.3 + i * 0.4), L.floor - L.fs * 0.48]; });
    }
    return out;
  }
  const sceneSpec = {
    init: () => ({ lit: false, said: {} }),
    draw(ctx) {
      const { vw, vh, st, d, api } = ctx, L = sceneLayout(ctx), P = scenePos(ctx, d);
      let s = `<rect x="4" y="4" width="${vw - 8}" height="${vh - 8}" rx="18" fill="#fff6f9"/><rect x="4" y="${r1(L.floor)}" width="${vw - 8}" height="${r1(vh - L.floor - 4)}" fill="${WOOD}"/><line x1="4" y1="${r1(L.floor)}" x2="${vw - 4}" y2="${r1(L.floor)}" stroke="${INK}" stroke-width="3"/>`;
      const friend = f => { const [x, y] = P[f]; return `<g data-tap="fr:${f}" class="${(ctx.g("fr:" + f) + (ctx.fresh.has("fr:" + f) ? " sd-wig" : "")).trim()}"><rect x="${r1(x - L.fs / 2)}" y="${r1(y - L.fs / 2)}" width="${r1(L.fs)}" height="${r1(L.fs)}" rx="16" fill="#fff" fill-opacity=".01"/>${faceAt(api, f, x, y, L.fs)}</g>`; };
      if (d.scene === "box") {
        const b = L.box, bx = b.x - b.w / 2, by = L.floor - b.h;
        const lit = st.lit ? ` stroke="#ffb020" stroke-width="7"` : "";
        // back of the box, friends inside, then the front of the box hides their bodies
        s += `<path d="M${r1(bx + 6)} ${r1(by)} L${r1(bx + 18)} ${r1(by - 18)} L${r1(bx + b.w - 18)} ${r1(by - 18)} L${r1(bx + b.w - 6)} ${r1(by)} Z" fill="#c23c6c" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`;
        d.friends.filter(f => d.place[f] === "in").forEach(f => { s += friend(f); });
        s += `<g data-tap="place" class="${ctx.g("place").trim()}">${chunkyRect(bx, by, b.w, b.h, 10, COL.pink, { dy: 0, extra: lit })}<rect x="${r1(b.x - 12)}" y="${r1(by)}" width="24" height="${r1(b.h)}" fill="${SUN}" stroke="${INK}" stroke-width="3"/></g>`;
        s += `<path d="M${r1(bx + b.w - 4)} ${r1(by - 4)} l${r1(b.w * 0.36)} ${r1(-b.h * 0.5)} l12 18 l${r1(-b.w * 0.33)} ${r1(b.h * 0.46)} Z" fill="${COL.pink}" stroke="${INK}" stroke-width="3" stroke-linejoin="round" pointer-events="none"/>`;
        d.friends.filter(f => d.place[f] !== "in").forEach(f => { s += friend(f); });
      } else {
        // the see-through area above the plank is part of the shelf's tap area ("none" would leave only the 16-unit plank to hit)
        const sh = L.shelf, lit = st.lit ? "#fff3cf" : "#fff";
        s += `<g data-tap="place" class="${ctx.g("place").trim()}"><rect x="${r1(sh.x0)}" y="${r1(sh.y - L.fs * 1.1)}" width="${r1(sh.x1 - sh.x0)}" height="${r1(L.fs * 1.1)}" rx="12" fill="${lit}" fill-opacity="${st.lit ? 1 : 0.01}"${st.lit ? ` stroke="#ffb020" stroke-width="4"` : ""}/>${chunkyRect(sh.x0, sh.y, sh.x1 - sh.x0, 16, 6, WOOD_DEEP)}</g>`;
        s += `<path d="M${r1(sh.x0 + 20)} ${r1(sh.y + 16)} l14 24 M${r1(sh.x1 - 20)} ${r1(sh.y + 16)} l-14 24" stroke="${INK}" stroke-width="4" stroke-linecap="round" pointer-events="none"/>`;
        d.friends.forEach(f => { s += friend(f); });
      }
      return s;
    },
    onTap(ctx, id) {
      const st = ctx.st, d = ctx.d;
      if (id === "place") { st.lit = !st.lit; ctx.tone([700, 900], 0.06); if (st.lit) ctx.speak(d.scene === "box" ? "In the box" : "Up high"); return; }
      if (id.startsWith("fr:")) {
        const f = id.slice(3); st.said[f] = true; ctx.fresh.add(id); ctx.tone([660, 880], 0.06);
        if (ctx.teaching) ctx.say(`${NAMES[f]} is ${d.scene === "box" ? (d.place[f] === "in" ? "in the box" : "out of the box") : (d.place[f] === "up" ? "up on the shelf" : "down on the floor")}.`);
        else ctx.speak(`Hi! I'm ${NAMES[f]}!`);
      }
    }
  };

  /* ----- Level 3: put two pieces together to make a new shape ----- */
  const COMBOS = {
    tri2sq: { a: [[0, 0], [1, 0], [0, 1]], b: [[1, 0], [1, 1], [0, 1]], out: [[0, 0], [1, 0], [1, 1], [0, 1]], result: "square", w: 1, h: 1 },
    sq2rect: { a: [[0, 0], [1, 0], [1, 1], [0, 1]], b: [[1, 0], [2, 0], [2, 1], [1, 1]], out: [[0, 0], [2, 0], [2, 1], [0, 1]], result: "rectangle", w: 2, h: 1 },
    tri2rect: { a: [[0, 0], [2, 0], [0, 1]], b: [[2, 0], [2, 1], [0, 1]], out: [[0, 0], [2, 0], [2, 1], [0, 1]], result: "rectangle", w: 2, h: 1 },
    tri2tri: { a: [[0, 1.4], [1, 0], [1, 1.4]], b: [[1, 0], [2, 1.4], [1, 1.4]], out: [[0, 1.4], [1, 0], [2, 1.4]], result: "triangle", w: 2, h: 1.4 },
    rect2sq: { a: [[0, 0], [0.5, 0], [0.5, 1], [0, 1]], b: [[0.5, 0], [1, 0], [1, 1], [0.5, 1]], out: [[0, 0], [1, 0], [1, 1], [0, 1]], result: "square", w: 1, h: 1 },
    half2circle: { half: true, result: "circle", w: 1, h: 1 }
  };
  function composeLayout(ctx, c) {
    const { vw, vh } = ctx;
    const matW = ctx.tall ? vw - 20 : vw * 0.62, matH = ctx.tall ? vh * 0.56 : vh - 20;
    const u = Math.min((matW - 40) / c.w, (matH - 40) / c.h, ctx.tall ? Math.min(150, (vh - matH - 34) / c.h) : 190);
    const ox = 10 + (matW - u * c.w) / 2, oy = 10 + (matH - u * c.h) / 2;
    // where the loose piece waits: below the mat on a phone, beside it on a wide screen
    const bw = c.half ? 0.5 : Math.max(...c.b.map(p => p[0])) - Math.min(...c.b.map(p => p[0])), bh = c.half ? 1 : Math.max(...c.b.map(p => p[1])) - Math.min(...c.b.map(p => p[1]));
    const home = ctx.tall ? [vw / 2 - u * bw / 2, matH + 18 + (vh - matH - 18 - u * bh) / 2] : [matW + 20 + (vw - matW - 20 - u * bw) / 2, vh / 2 - u * bh / 2];
    // the loose piece's top-left corner (of its box) at home, and how far it must move to sit exactly beside the other piece
    const bx0 = c.half ? u / 2 : Math.min(...c.b.map(p => p[0])) * u, by0 = c.half ? 0 : Math.min(...c.b.map(p => p[1])) * u;
    const goal = [ox + bx0 - home[0], oy + by0 - home[1]];
    return { u, ox, oy, matW, matH, home, bx0, by0, bw: u * bw, bh: u * bh, goal };
  }
  function piecePath(c, which, ox, oy, u) {
    if (c.half) {
      const cx = ox + u / 2, cy = oy + u / 2, r = u / 2;
      return which === "a" ? `M${r1(cx)} ${r1(cy - r)} A${r1(r)} ${r1(r)} 0 0 0 ${r1(cx)} ${r1(cy + r)} Z` : `M${r1(cx)} ${r1(cy - r)} A${r1(r)} ${r1(r)} 0 0 1 ${r1(cx)} ${r1(cy + r)} Z`;
    }
    return "M" + c[which].map(p => `${r1(ox + p[0] * u)} ${r1(oy + p[1] * u)}`).join(" L") + " Z";
  }
  // The loose piece goes where Marie puts it. It clicks into place only when she puts it right beside the other piece
  // (within about a third of a piece); dropped anywhere else on the mat it stays there, not joined.
  const composeSpec = {
    init: () => ({ snapped: false, sel: null, badge: {}, n: 0, round: false, loose: null }),
    draw(ctx) {
      const { st, d } = ctx, c = COMBOS[d.combo], L = composeLayout(ctx, c);
      let s = chunkyRect(10, 10, L.matW, L.matH, 20, CREAM, { dy: 0 });
      s += `<g data-zone="mat" class="${ctx.g("mat").trim()}"><rect x="10" y="10" width="${r1(L.matW)}" height="${r1(L.matH)}" rx="20" fill="#fff" fill-opacity=".01"/></g>`;
      const pa = piecePath(c, "a", L.ox, L.oy, L.u);
      s += `<path d="${pa}" transform="translate(0 4)" fill="${INK}" stroke="${INK}" stroke-width="4" stroke-linejoin="round" pointer-events="none"/><path d="${pa}" fill="${COL[d.ca]}" stroke="${INK}" stroke-width="4" stroke-linejoin="round" pointer-events="none"/>`;
      if (st.snapped) {
        const pb = piecePath(c, "b", L.ox, L.oy, L.u);
        s += `<g class="sd-pop" pointer-events="none"><path d="${pb}" fill="${COL[d.cb]}" stroke="${INK}" stroke-width="4" stroke-linejoin="round" stroke-dasharray="${c.half ? "0" : "0"}"/></g>`;
        // the outline of the new shape
        const outline = c.half ? `<circle cx="${r1(L.ox + L.u / 2)}" cy="${r1(L.oy + L.u / 2)}" r="${r1(L.u / 2)}"/>` : `<path d="M${c.out.map(p => `${r1(L.ox + p[0] * L.u)} ${r1(L.oy + p[1] * L.u)}`).join(" L")} Z"/>`;
        s += `<g fill="none" stroke="${INK}" stroke-width="6" stroke-linejoin="round" pointer-events="none">${outline}</g>`;
        // Marie counts the sides of the new shape herself: each side of the thick outline can be tapped
        if (c.half) {
          const cx = L.ox + L.u / 2, cy = L.oy + L.u / 2;
          s += `<g data-tap="oround" class="${ctx.g("oround").trim()}"><circle cx="${r1(cx)}" cy="${r1(cy)}" r="${r1(L.u / 2 + 12)}" fill="#fff" fill-opacity=".01"/>${st.round ? `<circle cx="${r1(cx)}" cy="${r1(cy)}" r="${r1(L.u / 2)}" fill="none" stroke="${COL.purple}" stroke-width="9"/>` : ""}</g>`;
        } else {
          const P = c.out.map(q => [L.ox + q[0] * L.u, L.oy + q[1] * L.u]), n = P.length;
          const cx = P.reduce((a, q) => a + q[0], 0) / n, cy = P.reduce((a, q) => a + q[1], 0) / n;
          for (let i = 0; i < n; i++) {
            const a = P[i], b = P[(i + 1) % n], id = "oside:" + i, on = st.badge[id], k = 0.16;
            s += `<g data-tap="${id}" data-hit="48" class="${ctx.g(id).trim()}"><line x1="${r1(a[0] + (b[0] - a[0]) * k)}" y1="${r1(a[1] + (b[1] - a[1]) * k)}" x2="${r1(b[0] - (b[0] - a[0]) * k)}" y2="${r1(b[1] - (b[1] - a[1]) * k)}" stroke="#fff" stroke-opacity=".01" stroke-width="48" stroke-linecap="round"/>${on ? `<line x1="${r1(a[0])}" y1="${r1(a[1])}" x2="${r1(b[0])}" y2="${r1(b[1])}" stroke="${COL.purple}" stroke-width="9" stroke-linecap="round"/>` : ""}</g>`;
            if (on) { const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, dx = mx - cx, dy = my - cy, l = Math.hypot(dx, dy) || 1; s += mark(mx + dx / l * 22, my + dy / l * 22); }
          }
        }
      } else {
        // the place where the loose piece fits: a tap there (with the piece picked up) puts it in; it shows only in a lesson
        const pg = piecePath(c, "b", L.ox, L.oy, L.u);
        s += `<g data-zone="spot" class="${ctx.g("spot").trim()}"><path d="${pg}" fill="#fff" fill-opacity="${ctx.teaching ? 0.6 : 0.01}" stroke="${ctx.teaching ? COL[d.cb] : "none"}" stroke-width="4" stroke-dasharray="9 6" stroke-linejoin="round"/></g>`;
        const off = st.loose || [0, 0], hx = L.home[0] + off[0], hy = L.home[1] + off[1], pb = piecePath(c, "b", 0, 0, L.u * 0.999);
        const bx0 = L.bx0, by0 = L.by0;
        s += `<g data-drag="pb" class="${ctx.g("pb").trim()}" ${ctx.teaching ? 'data-teach="1"' : ""}><g transform="translate(${r1(hx - bx0)} ${r1(hy - by0)})"><rect x="${r1(bx0 - 6)}" y="${r1(by0 - 6)}" width="${r1((c.half ? L.u / 2 : (Math.max(...c.b.map(p => p[0])) * L.u - bx0)) + 12)}" height="${r1((c.half ? L.u : Math.max(...c.b.map(p => p[1])) * L.u - by0) + 12)}" fill="#fff" fill-opacity=".01"/><path d="${pb}" transform="translate(0 4)" fill="${INK}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/><path d="${pb}" fill="${COL[d.cb]}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/></g></g>`;
      }
      return s;
    },
    controls: ctx => ctx.st.snapped ? `<button type="button" class="sd-btn${ctx.g("apart")}" data-tap="apart">↺ Take apart</button>` : "",
    onTap(ctx, id) {
      const st = ctx.st;
      if (id === "apart") { st.snapped = false; st.badge = {}; st.n = 0; st.round = false; st.loose = null; return; }
      if (id === "oround") { st.round = true; ctx.tone([600, 760], 0.07); ctx.speak("It is round. No corners."); return; }
      if (id.startsWith("oside:") && !st.badge[id]) { st.n++; st.badge[id] = st.n; ctx.tone([560 + st.n * 40], 0.06); ctx.countAloud(st.n); }
    },
    onDrop(ctx, id, at) {
      if (id !== "pb") return;
      const st = ctx.st, c = COMBOS[ctx.d.combo], L = composeLayout(ctx, c), off = st.loose || [0, 0];
      // where the piece is now: moved by the drag, or (tap to place) centred on the tapped point
      const to = at.dragged ? [off[0] + (at.dx || 0), off[1] + (at.dy || 0)] : [at.x - (L.home[0] + L.bw / 2), at.y - (L.home[1] + L.bh / 2)];
      const near = Math.hypot(to[0] - L.goal[0], to[1] - L.goal[1]) < L.u * 0.34;
      if (at.zone === "spot" || near) { st.snapped = true; st.loose = null; ctx.tone([523, 659, 784], 0.08); ctx.speak("Click!"); return; }
      // keep it where she put it, as long as it stays in the picture
      const cx = L.home[0] + to[0] + L.bw / 2, cy = L.home[1] + to[1] + L.bh / 2;
      if (cx > 0 && cx < ctx.vw && cy > 0 && cy < ctx.vh) {
        st.loose = to; ctx.tone([440], 0.06);
        if (at.x > 10 && at.x < 10 + L.matW && at.y > 10 && at.y < 10 + L.matH) ctx.say("Slide it right next to the other piece, so the sides touch.");
      } else st.loose = null;
    }
  };

  /* ----- Level 4: count sides and corners by tapping, and name the shape ----- */
  function countLayout(ctx, d) {
    const { vw, vh } = ctx, size = Math.min(vw - 96, vh - 84, 300);
    return polyOf(d.kind, vw / 2, vh / 2, size, d.rot) || [];
  }
  const countSpec = {
    init: () => ({ badge: {}, n: 0 }),
    draw(ctx) {
      const { vw, vh, st, d } = ctx, P = countLayout(ctx, d), what = d.what;
      let s = "";
      if (!P.length) { const r = Math.min(vw - 96, vh - 84, 300) * 0.47; s += `<g data-tap="round" class="${ctx.g("round").trim()}">${chunkyCircle(vw / 2, vh / 2, r, COL[d.colour], { sw: 6 })}</g>`; return s; }
      s += chunkyPoly(P, COL[d.colour], { sw: 6, dy: 5 });
      const n = P.length, cx = vw / 2, cy = vh / 2;
      const sideOn = what !== "corners", cornerOn = what !== "sides";
      if (sideOn) for (let i = 0; i < n; i++) {
        const a = P[i], b = P[(i + 1) % n], id = "side:" + i;
        const k = 0.18, ax = a[0] + (b[0] - a[0]) * k, ay = a[1] + (b[1] - a[1]) * k, bx = b[0] - (b[0] - a[0]) * k, by = b[1] - (b[1] - a[1]) * k;
        const on = st.badge[id];
        s += `<g data-tap="${id}" data-hit="48" class="${ctx.g(id).trim()}"><line x1="${r1(ax)}" y1="${r1(ay)}" x2="${r1(bx)}" y2="${r1(by)}" stroke="#fff" stroke-opacity=".01" stroke-width="48" stroke-linecap="round"/>${on ? `<line x1="${r1(a[0])}" y1="${r1(a[1])}" x2="${r1(b[0])}" y2="${r1(b[1])}" stroke="${COL.purple}" stroke-width="9" stroke-linecap="round"/>` : ""}</g>`;
        if (on) { const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, dx = mx - cx, dy = my - cy, l = Math.hypot(dx, dy) || 1; s += mark(mx + dx / l * 24, my + dy / l * 24); }
      }
      if (cornerOn) for (let i = 0; i < n; i++) {
        const [x, y] = P[i], id = "cor:" + i, on = st.badge[id];
        s += `<g data-tap="${id}" class="${ctx.g(id).trim()}"><circle cx="${r1(x)}" cy="${r1(y)}" r="27" fill="#fff" fill-opacity=".01"/><circle cx="${r1(x)}" cy="${r1(y)}" r="${on ? 10 : 7}" fill="${on ? COL.green : "#fff"}" stroke="${INK}" stroke-width="3"/></g>`;
        if (on) { const dx = x - cx, dy = y - cy, l = Math.hypot(dx, dy) || 1; s += mark(x + dx / l * 30, y + dy / l * 30); }
      }
      return s;
    },
    controls: ctx => resetBtn(ctx, "clear", "↺ Count again", anyOn(ctx.st.badge)),
    onTap(ctx, id) {
      const st = ctx.st;
      if (id === "clear") { st.badge = {}; st.n = 0; st.nc = 0; return; }
      if (id === "round") { st.round = true; ctx.tone([600, 760], 0.07); ctx.speak("It is round. No sides. No corners."); return; }
      if (st.badge[id]) return;
      if (id.startsWith("side:")) { st.n = (st.n || 0) + 1; st.badge[id] = st.n; }
      else if (id.startsWith("cor:")) { st.nc = (st.nc || 0) + 1; st.badge[id] = st.nc; }
      else return;
      ctx.tone([560 + st.badge[id] * 40], 0.06); ctx.countAloud(st.badge[id]);
    }
  };

  /* ----- Level 5: a two-hoop sorting picture (Venn) ----- */
  function vennLayout(ctx, n) {
    const { vw, vh } = ctx;
    if (ctx.tall) {
      const cell = Math.min(54, (vw - 16) / Math.ceil(n / 2) - 4);
      const trayH = cell * 2 + 12, R = Math.min(vw * 0.36, (vh - trayH - 50) / 2, 130);
      const cy = trayH + 30 + R;
      return { cell, R, A: [vw / 2 - R * 0.52, cy], B: [vw / 2 + R * 0.52, cy], tray: i => [vw / 2 + ((i % Math.ceil(n / 2)) - (Math.ceil(n / 2) - 1) / 2) * (cell + 4), 8 + cell / 2 + Math.floor(i / Math.ceil(n / 2)) * (cell + 4)], labY: trayH + 14 };
    }
    const cell = Math.min(64, (vh - 20) / Math.ceil(n / 2) - 4), tw = 2 * (cell + 4) + 10;
    const R = Math.min((vw - tw - 30) / 3.15, vh / 2 - 34, 140), cy = vh / 2 + 14, cx = tw + 20 + (vw - tw - 20) / 2;
    return { cell, R, A: [cx - R * 0.52, cy], B: [cx + R * 0.52, cy], tray: i => [12 + (i % 2 + 0.5) * (cell + 4), vh / 2 + (Math.floor(i / 2) - (Math.ceil(n / 2) - 1) / 2) * (cell + 4)], labY: cy - R - 18 };
  }
  // Placed pieces are stored relative to the hoops (in hoop radii), so they stay put when the picture is resized.
  const vennAbs = (L, q) => [(L.A[0] + L.B[0]) / 2 + q[0] * L.R, L.A[1] + q[1] * L.R];
  const vennRel = (L, x, y) => [(x - (L.A[0] + L.B[0]) / 2) / L.R, (y - L.A[1]) / L.R];
  const regionOf = (L, x, y) => { const a = Math.hypot(x - L.A[0], y - L.A[1]) <= L.R, b = Math.hypot(x - L.B[0], y - L.B[1]) <= L.R; return a && b ? "AB" : a ? "A" : b ? "B" : null; };
  function lensPath(L) {
    const dx = L.B[0] - L.A[0], h = Math.sqrt(L.R * L.R - (dx / 2) * (dx / 2)), mx = (L.A[0] + L.B[0]) / 2, y = L.A[1];
    return `M${r1(mx)} ${r1(y - h)} A${r1(L.R)} ${r1(L.R)} 0 0 1 ${r1(mx)} ${r1(y + h)} A${r1(L.R)} ${r1(L.R)} 0 0 1 ${r1(mx)} ${r1(y - h)} Z`;
  }
  const vennSpec = {
    init: () => ({ at: {}, sel: null }),
    draw(ctx) {
      const { st, d } = ctx, L = vennLayout(ctx, d.shapes.length);
      let s = "";
      s += `<g data-zone="venn" class="${ctx.g("venn").trim()}"><circle cx="${r1(L.A[0])}" cy="${r1(L.A[1])}" r="${r1(L.R)}" fill="${TINT[d.colour]}" fill-opacity=".9" stroke="${INK}" stroke-width="3"/><circle cx="${r1(L.B[0])}" cy="${r1(L.B[1])}" r="${r1(L.R)}" fill="#f6f1ea" fill-opacity=".8" stroke="${INK}" stroke-width="3"/>`;
      // the colour hoop is tinted with its own colour; the shape hoop is plain, so no hoop's colour can mislead
      s += `<path data-zone="venn" d="${lensPath(L)}" class="${ctx.g("venn:AB").trim()}" fill="${ctx.glow.has("venn:AB") ? "#fff3cf" : "#efe8ff"}" stroke="${INK}" stroke-width="3"/></g>`;
      // labels: a colour chip and a shape outline, with the words
      // Each label sits over its own hoop: the colour at the left edge of the left hoop, the shape at the right edge
      // of the right hoop. Widths are measured generously (Baloo 2 at 17 px is about 9.4 px a letter). When the two
      // labels would meet, the colour label moves up a line, so they never overlap.
      const vw = ctx.vw, CW = 9.4, wordA = cap(d.colour), wordB = cap(KIND_WORD[d.kind]) + "s";
      const WA = 26 + wordA.length * CW, WB = 30 + wordB.length * CW;
      const edgeL = ctx.tall ? 6 : Math.max(6, L.A[0] - L.R), edgeR = vw - 6;
      let ax = Math.max(6, L.A[0] - L.R), bx = Math.min(edgeR, L.B[0] + L.R) - WB, ay = L.labY;
      if (ax + WA + 12 > bx) { ax = Math.max(edgeL, bx - 12 - WA); }
      if (ax + WA + 12 > bx) { ax = Math.max(6, Math.min(L.A[0] - L.R, edgeR - WA)); ay = Math.max(12, L.labY - 25); }
      bx = Math.max(6, bx);
      s += `<g pointer-events="none">${chunkyCircle(ax + 11, ay, 11, COL[d.colour], { sw: 3, dy: 2 })}${txt(ax + 26, ay, wordA, 17, { anchor: "start" })}` +
        `<g>${drawFlat(d.kind, "#fff", bx + 12, L.labY, 24, 0, 3)}</g>${txt(bx + 28, L.labY, wordB, 17, { anchor: "start" })}</g>`;
      // the shape that glows is drawn last, on top: in the middle of the hoops shapes can overlap, and the one Kitty
      // asks for must be fully there to tap
      const order = d.shapes.map((sh, i) => i).sort((a, b) => (ctx.glow.has("sh:" + a) ? 1 : 0) - (ctx.glow.has("sh:" + b) ? 1 : 0));
      order.forEach(i => { const sh = d.shapes[i];
        const p = st.at[i] ? vennAbs(L, st.at[i]) : L.tray(i), id = "sh:" + i, size = Math.min(L.cell - 8, 52) * (st.at[i] ? 0.72 : 1);
        s += `<g data-drag="${id}" class="${ctx.g(id).trim()}"${ctx.teaching && st.want === i ? ` data-teach="1" data-goal="${st.goal || ""}"` : ""}>${(() => {
          // the tap area is at least 48 units (about 46 px on iPhone SE, where the tray cells are only about 43);
          // the visible white tile keeps the cell size
          const hs = st.at[i] ? Math.max(L.cell * 0.72, 48) : Math.max(L.cell + 2, 48), ts = L.cell + 2;
          return `<rect x="${r1(p[0] - hs / 2)}" y="${r1(p[1] - hs / 2)}" width="${r1(hs)}" height="${r1(hs)}" rx="12" fill="#fff" fill-opacity=".01"/>` +
            (st.at[i] ? "" : `<rect x="${r1(p[0] - ts / 2)}" y="${r1(p[1] - ts / 2)}" width="${r1(ts)}" height="${r1(ts)}" rx="12" fill="#fff" fill-opacity=".7"/>`); })()}${drawFlat(sh.kind, sh.colour, p[0], p[1], size)}</g>`;
        // a shape counted in the lesson's last step gets a tick, never a number
        if (st.cnt && st.cnt[i]) s += mark(p[0] + size * 0.4, p[1] - size * 0.4, true);
      });
      return s;
    },
    controls: ctx => resetBtn(ctx, "clear", "↺ Start again", Object.keys(ctx.st.at).length > 0),
    onTap(ctx, id) { if (id === "clear") ctx.st.at = {}; },
    // the lesson's counting step (st.counting): a tap on a shape in the middle counts it (a tick) and does not pick it up
    onPick(ctx, id) {
      const st = ctx.st; if (!st.counting) return;
      const i = +id.slice(3); st.sel = null;
      if (!st.cnt[i]) { st.cnt[i] = true; st.cn = (st.cn || 0) + 1; ctx.tone([560 + st.cn * 40], 0.06); ctx.countAloud(st.cn); }
    },
    onDrop(ctx, id, at) {
      const i = +id.slice(3), L = vennLayout(ctx, ctx.d.shapes.length);
      const reg = regionOf(L, at.x, at.y);
      if (reg) {
        // keep pieces from landing on top of each other: step round in a small spiral inside the same region
        let p = [at.x, at.y];
        const busy = q => Object.entries(ctx.st.at).some(([j, o]) => { const a = vennAbs(L, o); return +j !== i && Math.hypot(a[0] - q[0], a[1] - q[1]) < L.cell * 0.6; });
        for (let k = 1; k < 40 && busy(p); k++) { const a = k * 2.4, r = 6 + k * 3; const q = [at.x + r * Math.cos(a), at.y + r * Math.sin(a)]; if (regionOf(L, q[0], q[1]) === reg) p = q; }
        ctx.st.at[i] = vennRel(L, p[0], p[1]); ctx.tone([523, 659], 0.06);
      }
      else delete ctx.st.at[i];
    }
  };

  /* ----- Level 6: turning a shape does not change it ----- */
  const TURN_PAIRS = [
    ["L", [[0, 0], [2, 0], [2, 0.8], [0.8, 0.8], [0.8, 2.4], [0, 2.4]], [[0, 0], [2.4, 0], [2.4, 0.8], [0.8, 0.8], [0.8, 1.6], [0, 1.6]]],
    ["house", [[0, 0.9], [1, 0], [2, 0.9], [2, 2.2], [0, 2.2]], [[0, 1.3], [1, 0], [2, 1.3], [2, 2.2], [0, 2.2]]],
    ["arrow", [[0, 0.6], [1.5, 0.6], [1.5, 0], [2.6, 1], [1.5, 2], [1.5, 1.4], [0, 1.4]], [[0, 0.5], [1.1, 0.5], [1.1, 0], [2.6, 1], [1.1, 2], [1.1, 1.5], [0, 1.5]]],
    ["rtri", [[0, 0], [2.6, 2], [0, 2]], [[0, 0], [2, 2], [0, 2]]],
    ["trap", [[0.8, 0], [2.2, 0], [3, 1.4], [0, 1.4]], [[0.4, 0], [2.6, 0], [3, 1.4], [0, 1.4]]],
    ["para", [[0.8, 0], [3.2, 0], [2.4, 1.3], [0, 1.3]], [[0, 0], [2.4, 0], [2.4, 1.3], [0, 1.3]]],
    ["rect", [[0, 0], [2.4, 0], [2.4, 1.2], [0, 1.2]], [[0, 0], [3, 0], [3, 0.8], [0, 0.8]]],
    ["kite", [[1, 0], [1.9, 0.9], [1, 2.6], [0.1, 0.9]], [[1, 0], [1.9, 1.4], [1, 2.6], [0.1, 1.4]]]
  ];
  const centroid = pts => [pts.reduce((a, p) => a + p[0], 0) / pts.length, pts.reduce((a, p) => a + p[1], 0) / pts.length];
  function placePoly(pts, cx, cy, u, rot) { const c = centroid(pts); return pts.map(p => rotPt([cx + (p[0] - c[0]) * u, cy + (p[1] - c[1]) * u], [cx, cy], rot)); }
  function samePlaced(A, B) { // same corners (in any order) after placing at the same centre
    if (A.length !== B.length) return false;
    return A.every(p => B.some(q => Math.hypot(p[0] - q[0], p[1] - q[1]) < 0.02));
  }
  function turnLayout(ctx, d) {
    const { vw, vh } = ctx;
    // size by the farthest corner from the middle, so a shape fits its spot however it is turned
    const rad = Math.max(...[d.a, d.b].map(P => { const c = centroid(P); return Math.max(...P.map(p => Math.hypot(p[0] - c[0], p[1] - c[1]))); }));
    if (ctx.tall) { const R = Math.min(vw / 4 - 12, vh * 0.26 - 14); return { u: R / rad, A: [vw * 0.25, vh * 0.29], B: [vw * 0.75, vh * 0.29], home: [vw / 2, vh * 0.76] }; }
    const R = Math.min(vw * 0.16, vh / 2 - 24);
    return { u: R / rad, A: [vw * 0.22, vh / 2], B: [vw * 0.7, vh / 2], home: [vw * 0.22, vh / 2] };
  }
  const turnSpec = {
    init: () => ({ rot: 0, on: false, turns: 0, sel: null }),
    draw(ctx) {
      const { st, d, vw, vh } = ctx, L = turnLayout(ctx, d);
      let s = "";
      const A = placePoly(d.a, L.A[0], L.A[1], L.u, 0), B = placePoly(d.b, L.B[0], L.B[1], L.u, d.rotB);
      if (ctx.tall) s += `<rect x="8" y="8" width="${vw - 16}" height="${r1(vh * 0.58)}" rx="18" fill="${CREAM}"/>`;
      else s += `<rect x="8" y="8" width="${vw - 16}" height="${vh - 16}" rx="18" fill="${CREAM}"/>`;
      s += chunkyPoly(A, COL[d.colour], { sw: 4.5 });
      s += `<g data-zone="target" class="${ctx.g("target").trim()}"><circle cx="${r1(L.B[0])}" cy="${r1(L.B[1])}" r="${r1(L.u * 1.6)}" fill="#fff" fill-opacity=".01"/>${chunkyPoly(B, COL[d.colour], { sw: 4.5, extra: ' data-target="1"' })}</g>`;
      // the see-through copy of the first shape
      const at = st.on ? L.B : L.home;
      const C = placePoly(d.a, at[0], at[1], L.u, st.rot);
      const cx0 = at[0], cy0 = at[1];
      // Round 2 (16 Oct 2026): the picture never judges, not even in the lesson. A green "it fits" outline showed
      // only on a "same" question, which told the answer. The see-through copy lying exactly on the shape is
      // the evidence Marie judges herself.
      // the copy is a solid see-through lilac sheet (a dashed outline means "an empty place" everywhere else in the game)
      s += `<g data-drag="copy" class="${ctx.g("copy").trim()}"${ctx.teaching ? ' data-teach="1"' : ""}><circle cx="${r1(cx0)}" cy="${r1(cy0)}" r="${r1(L.u * 1.1)}" fill="#fff" fill-opacity=".01"/><polygon data-copy="1" points="${ptsStr(C)}" fill="#d9ccff" fill-opacity=".55" stroke="#7b55e6" stroke-width="4.5" stroke-linejoin="round"/></g>`;
      // until it is moved, a short label says what it is: beside it on a tall picture, above it on a wide one
      if (!st.on) {
        const xs = C.map(p => p[0]), ys = C.map(p => p[1]);
        const o = { fill: DEEP.purple, stroke: "#fff", sw: 4 };
        if (ctx.tall) {
          // two short lines on whichever side of the copy has more room
          const right = vw - Math.max(...xs) > Math.min(...xs), x = right ? Math.max(...xs) + 8 : Math.min(...xs) - 8, a = right ? "start" : "end";
          s += txt(x, cy0 - 12, "Copy:", 15, { ...o, anchor: a }) + txt(x, cy0 + 12, "drag me", 15, { ...o, anchor: a });
        } else s += txt(cx0, Math.max(14, Math.min(...ys) - 14), "Copy: drag me", 15, o);
      }
      return s;
    },
    controls: ctx => `<button type="button" class="sd-btn lilac${ctx.g("turnL")}" data-tap="turnL" aria-label="Turn left">↺ Turn</button><button type="button" class="sd-btn lilac${ctx.g("turnR")}" data-tap="turnR"${ctx.teaching && ctx.st.best === "turnR" ? ' data-teach="1"' : ""} aria-label="Turn right">Turn ↻</button>${resetBtn(ctx, "back", "Back", ctx.st.on || ctx.st.rot !== 0, "", "Put the copy back")}`,
    onTap(ctx, id) {
      const st = ctx.st;
      if (id === "turnL" || id === "turnR") { st.rot = (st.rot + (id === "turnL" ? -45 : 45) + 360) % 360; st.turns++; if (st.seen) st.seen[st.rot] = true; ctx.tone([600, 700], 0.05); }
      if (id === "back") { st.on = false; st.rot = 0; st.turns = 0; if (st.seen) st.seen = { 0: true }; }
    },
    onDrop(ctx, id, at) {
      if (id !== "copy") return;
      const L = turnLayout(ctx, ctx.d);
      if (at.zone === "target" || Math.hypot(at.x - L.B[0], at.y - L.B[1]) < L.u * 1.8) { ctx.st.on = true; ctx.tone([523, 659], 0.06); }
      else ctx.st.on = false;
    }
  };

  topic({
    id: "shapes_2d", title: "Flat shapes", strand: "Geometry",
    icon: `<svg viewBox="0 0 64 64" aria-hidden="true">${chunkyPoly([[18, 6], [32, 30], [4, 30]], COL.pink, { sw: 3.5, dy: 3 })}${chunkyRect(36, 8, 22, 22, 4, COL.blue, { sw: 3.5, dy: 3 })}${chunkyCircle(32, 46, 12, COL.yellow, { sw: 3.5, dy: 3 })}</svg>`,
    levels: [
      { name: "Which does not belong?", grade: 1, note: "BC Gr 1: sorting 2D shapes by one attribute (colour, shape or size).",
        make() {
          for (;;) {
            const rule = pick(["kind", "colour", "size"]);
            const [g, o] = sample(ATTR_VALUES[rule], 2), odd = ri(0, 3);
            // a square among rectangles is still a rectangle: that one would not truly "not belong"
            if (rule === "kind" && g === "rectangle" && o === "square") continue;
            const shapes = [0, 1, 2, 3].map(i => ({ [rule]: i === odd ? o : g }));
            for (const attr of ["kind", "colour", "size"]) {
              if (attr === rule) continue;
              if (Math.random() < 0.3) { const v = pick(ATTR_VALUES[attr]); shapes.forEach(sh => { sh[attr] = v; }); }
              else { const [v1, v2] = sample(ATTR_VALUES[attr], 2), order = shuffle([v1, v1, v2, v2]); shapes.forEach((sh, i) => { sh[attr] = order[i]; }); }
            }
            const keys = shapes.map(sh => sh.kind + sh.colour + sh.size);
            if (new Set(keys).size < 4) continue;
            return { key: rule + keys.join(""), say: "Put the ones that match in the same hoop. Which one does not belong?", show: "Which one does not belong?", answer: "s" + odd,
              input: { type: "choice", choices: shapes.map((sh, i) => ({ value: "s" + i, label: `${sh.size} ${sh.colour} ${sh.kind}`, html: `<span class="sd-ch">${flatSVG(sh.kind, sh.colour, sh.size === "big" ? 56 : 36)}</span>` })) },
              data: { rule, group: g, odd, shapes } };
          }
        },
        spec: sortSpec,
        hint: Q => `Look at the ${ATTR_WORD[Q.data.rule]} of each one. Put the ones that match in the same hoop.`,
        async teach(ctx, Q) {
          // Round 2 (16 Oct 2026): Kitty takes the shapes in their own order, 1, 2, 3, 4, the odd one too, and both
          // hoops glow every time. Marie decides each hoop herself. Kitty never lights the odd one on its own and
          // never says which value the group has. Only after a miss does she say how to check it.
          const d = Q.data, st = ctx.st, w = ATTR_WORD[d.rule]; st.where = {}; st.order = [];
          const val = i => d.shapes[i][d.rule];
          const others = (h, i) => Object.keys(st.where).map(Number).filter(j => j !== i && st.where[j] === h);
          // the hoop is right when every other shape in it matches, and no matching shape waits in the other hoop
          const fair = (i, h) => others(h, i).every(j => val(j) === val(i)) && !others(1 - h, i).some(j => val(j) === val(i));
          ctx.say(`Let's look at the ${w}. Shapes that match go in the same hoop.`); await ctx.pause(1200);
          for (let i = 0; i < 4; i++) {
            st.want = i;
            await ctx.wait(s => {
              if (s.where[i] == null) return false;
              const h = s.where[i];
              if (fair(i, h)) return true;
              // a miss: the shape goes back, and Kitty says how to check (never where the odd one is)
              delete s.where[i]; s.order = s.order.filter(j => j !== i);
              ctx.say(others(h, i).length ? `Look at the ${w}. Does it match the ones in that hoop? Try again.` : `Look at the ${w}. Does it match the ones in the other hoop? Try again.`);
              ctx.tone([330], 0.15, "triangle"); ctx.render();
              return false;
            }, { glow: ["sh:" + i, "hoop:0", "hoop:1"], say: i === 0 ? `Look at the ${w} of this one. Drag it into a hoop.` : `Next one. Look at its ${w}. Does it match the ones in a hoop?`,
              only: (k, id) => (k === "tap" ? id !== "clear" : id === "sh:" + i), onlyMsg: "Try the one that glows." });
          }
          st.want = undefined;
          ctx.say("Which one is all alone?");
        } },
      { name: "In, out, up, down", grade: 1, note: "BC Gr 1: positional language (in and out, up and down).",
        make() {
          const scene = pick(["box", "shelf"]), friends = sample(["kitty", "melody", "kuromi", "purin", "cinna"], 3);
          const kind = pick(["one", "one", "two", "yesno"]);
          const place = {};
          const A = scene === "box" ? "in" : "up", B = scene === "box" ? "out" : "down";
          if (kind === "one") friends.forEach((f, i) => { place[f] = i === 0 ? A : B; });
          else if (kind === "two") friends.forEach((f, i) => { place[f] = i === 0 ? B : A; });
          else { const k = ri(1, 2); friends.forEach((f, i) => { place[f] = i < k ? A : B; }); }
          const order = shuffle(friends);
          const phrase = { in: "in the box", out: "out of the box", up: "up on the shelf", down: "down on the floor" };
          if (kind === "yesno") {
            const who = pick(friends), ans = place[who];
            const opts = scene === "box" ? ["in", "out"] : ["up", "down"];
            return { key: `${scene}yn${who}${order.map(f => f + place[f]).join("")}`, say: `Is ${NAMES[who]} ${scene === "box" ? "in or out of the box" : "up or down"}?`,
              show: `Is ${NAMES[who]} ${scene === "box" ? "in or out" : "up or down"}?`, answer: ans,
              input: { type: "choice", choices: opts.map(o => ({ value: o, label: cap(o), html: `<span class="sd-ch word"><span class="sd-big">${o === "up" ? "⬆" : o === "down" ? "⬇" : ""}</span>${cap(o)}</span>` })) },
              data: { scene, friends: order, place, who } };
          }
          const want = kind === "one" ? A : B, ans = friends.find(f => place[f] === want);
          return { key: `${scene}${want}${order.map(f => f + place[f]).join("")}`, say: `Who is ${phrase[want]}?`, show: `Who is ${phrase[want]}?`, answer: ans,
            input: { type: "choice", choices: order.map(f => ({ value: f, label: NAMES[f], html: `<span class="sd-ch face">${tokenSVG(ARTPATH_FACE, "face:" + f, 54)}</span>` })) },
            data: { scene, friends: order, place, want } };
        },
        spec: sceneSpec,
        hint: Q => Q.data.scene === "box" ? "Tap the box. Then look at each friend. Is she inside the box?" : "Tap the shelf. Then look at each friend. Is she up on the shelf?",
        async teach(ctx, Q) {
          const d = Q.data, st = ctx.st; st.lit = false;
          await ctx.wait(s => s.lit, { glow: ["place"], say: d.scene === "box" ? "This is the box. Tap it." : "This is the shelf. It is up high. Tap it.", only: (k, id) => k !== "tap" || id === "place" });
          const list = d.who ? [d.who] : d.friends;
          st.said = {};
          for (const f of list) {
            await ctx.wait(s => !!s.said[f], { glow: ["fr:" + f], only: (k, id) => k !== "tap" || id === "fr:" + f, say: list.length > 1 && f === list[0] ? "Now tap each friend." : d.who ? `Tap ${NAMES[f]}.` : undefined });
            await ctx.pause(1400);
          }
          ctx.say(d.who ? `So, is ${NAMES[d.who]} ${d.scene === "box" ? "in or out" : "up or down"}?` : "So, who is it?");
        } },
      { name: "Make a new shape", grade: 1, note: "BC Gr 1: composite shapes (two triangles make a square).",
        make(prev) {
          // "tri2tri" (two triangles make a triangle) is left out: the loose piece is itself a triangle, so the answer
          // could be read off it without joining anything
          const combo = pick(Object.keys(COMBOS).filter(k => k !== "tri2tri")), c = COMBOS[combo];
          const [ca, cb] = sample(["pink", "blue", "yellow", "green", "purple"], 2);
          // square and rectangle are never offered against each other (a square is a rectangle too)
          const others = sample(["square", "rectangle", "triangle", "circle"].filter(k => k !== c.result && !(SQ_RECT[k] && SQ_RECT[c.result])), 2);
          return { key: combo + ca + cb, say: "Put the pieces together. What shape did you make?", show: "What shape did you make?", answer: c.result,
            input: { type: "choice", choices: shuffle([c.result, ...others]).map(k => kindChoice(k, "purple")) }, data: { combo, ca, cb, a: c.a || null, b: c.b || null, half: !!c.half } };
        },
        spec: composeSpec,
        hint: () => "Drag the loose piece right next to the other piece, so the sides touch. Then count the sides of the new shape.",
        async teach(ctx, Q) {
          const st = ctx.st; st.snapped = false; st.badge = {}; st.n = 0; st.round = false;
          await ctx.wait(s => s.snapped, { glow: ["pb", "spot"], say: "Drag this piece into the dotted place, right next to the other piece." });
          const c = COMBOS[Q.data.combo], r = c.result;
          if (c.half) {
            await ctx.wait(s => s.round, { glow: ["oround"], say: "Run your finger around the new shape. Then tap it. Is it round, or does it have corners?", only: (k, id) => k !== "tap" || id === "oround" });
            await ctx.pause(1400);
            ctx.say("Round with no corners. Which shape is round?");
          } else {
            await countAlong(ctx, c.out.map((_, i) => ({ pred: s => !!s.badge["oside:" + i], glow: ["oside:" + i], only: (k, id) => k !== "tap" || id === "oside:" + i })),
              "Look at the thick line around the new shape. Count its sides. Tap the side that glows.");
            await ctx.pause(900);
            ctx.say("How many sides? A triangle has 3 sides. A square has 4 sides, all the same. A rectangle has 2 long sides and 2 short sides.");
          }
          await ctx.pause(2600);
        } },
      { name: "Sides and corners", grade: 2, note: "BC Gr 2: naming triangles, squares, rectangles and circles; counting sides and corners (pentagons and hexagons added for counting).",
        make() {
          const what = pick(["sides", "corners", "name", "sides", "corners"]);
          const colour = pick(["pink", "blue", "yellow", "green", "purple"]);
          if (what === "name") {
            const kind = pick(["triangle", "square", "rectangle", "circle"]);
            const opts = shuffle([kind, ...sample(["triangle", "square", "rectangle", "circle"].filter(k => k !== kind && !(SQ_RECT[k] && SQ_RECT[kind])), 2)]);
            return { key: "name" + kind + colour, say: "What is this shape called?", show: "What is this shape called?", answer: kind,
              input: { type: "choice", choices: opts.map(nameChoice) }, data: { what, kind, colour, rot: kind === "triangle" ? pick([0, 0, 180]) : 0 } };
          }
          const kind = pick(["triangle", "square", "rectangle", "pentagon", "hexagon"]), rot = ri(0, 7) * 15;
          return { key: what + kind + rot, say: `How many ${what} does this shape have? Tap each one.`, show: `How many ${what}?`, answer: String(SIDES[kind]),
            input: { type: "number", unit: "" }, data: { what, kind, colour, rot } };
        },
        spec: countSpec,
        hint: Q => Q.data.what === "name" ? "Tap each side to count them. Is it round? Are the sides all the same?" : `Start at the top. Tap each ${Q.data.what === "sides" ? "side" : "corner"} one time. Go all the way round.`,
        async teach(ctx, Q) {
          const d = Q.data, st = ctx.st; st.badge = {}; st.n = 0; st.nc = 0;
          if (d.kind === "circle") {
            await ctx.wait(s => !!s.round, { glow: ["round"], say: "Run your finger around the edge, then tap the shape. Is it round? Does it have corners?", only: (k, id) => k !== "tap" || id === "round" });
            await ctx.pause(2000);
            ctx.say("Round, with no corners. Which shape is round?"); return;
          }
          const n = SIDES[d.kind], pre = d.what === "corners" ? "cor:" : "side:";
          await countAlong(ctx, [...Array(n).keys()].map(i => ({ pred: s => !!s.badge[pre + i], glow: [pre + i], only: (k, id) => k !== "tap" || id === pre + i })),
            `Let's count the ${d.what === "corners" ? "corners" : "sides"}. Tap the one that glows.`);
          if (d.what === "name") { await ctx.pause(700); ctx.say("How many sides? A triangle has 3 sides. A square has 4 sides, all the same. A rectangle has 4 sides: 2 long and 2 short."); await ctx.pause(2600); }
          else typeIt(ctx);
        } },
      { name: "Sort by two rules", grade: 2, note: "BC Gr 2: sorting 2D shapes by two attributes (colour and shape).",
        make() {
          const colour = pick(["pink", "blue", "yellow", "green"]), kind = pick(["triangle", "square", "circle", "rectangle"]);
          // with the rectangle hoop there are no squares at all (a square would belong in the rectangle hoop too)
          const oc = ["pink", "blue", "yellow", "green"].filter(c => c !== colour), ok = ["triangle", "square", "circle", "rectangle"].filter(k => k !== kind && !(kind === "rectangle" && k === "square"));
          if (Math.random() < 0.5) {
            const shapes = shuffle([{ kind, colour }, { kind: pick(ok), colour }, { kind, colour: pick(oc) }, { kind: pick(ok), colour: pick(oc) }]);
            const ans = shapes.findIndex(sh => sh.kind === kind && sh.colour === colour);
            return { key: `c${colour}${kind}${shapes.map(sh => sh.kind[0] + sh.colour[0]).join("")}`, say: `Which one is ${colour} and a ${KIND_WORD[kind]}?`, show: `Which one is ${colour} <b>and</b> a ${KIND_WORD[kind]}?`, answer: "s" + ans,
              input: { type: "choice", choices: shapes.map((sh, i) => ({ value: "s" + i, label: `${sh.colour} ${sh.kind}`, html: `<span class="sd-ch">${flatSVG(sh.kind, sh.colour, 50)}</span>` })) },
              data: { mode: "which", colour, kind, shapes } };
          }
          const both = ri(1, 3), shapes = [];
          for (let i = 0; i < both; i++) shapes.push({ kind, colour });
          shapes.push({ kind: pick(ok), colour }, { kind, colour: pick(oc) });
          while (shapes.length < 7) shapes.push(Math.random() < 0.5 ? { kind: pick(ok), colour: pick([colour, ...oc]) } : { kind, colour: pick(oc) });
          const sh2 = shuffle(shapes);
          return { key: `n${colour}${kind}${sh2.map(sh => sh.kind[0] + sh.colour[0]).join("")}`, say: `How many shapes are ${colour} and ${KIND_WORD[kind]}s?`, show: `How many are ${colour} <b>and</b> ${KIND_WORD[kind]}s?`,
            answer: String(sh2.filter(sh => sh.kind === kind && sh.colour === colour).length), input: { type: "number", unit: "" }, data: { mode: "count", colour, kind, shapes: sh2 } };
        },
        spec: vennSpec,
        hint: Q => `Drag each shape. ${cap(Q.data.colour)} ones go in the ${Q.data.colour} hoop. ${cap(KIND_WORD[Q.data.kind])}s go in the ${KIND_WORD[Q.data.kind]} hoop. Both? Put it in the middle.`,
        async teach(ctx, Q) {
          // Kitty walks through the shapes one at a time and asks the two questions; Marie decides where each one goes
          // and drags it there. A wrong hoop is not accepted. (Kitty never picks out only the answer shapes: that
          // would show the answer.) Shapes that are neither stay out, and Kitty says so at the start.
          const d = Q.data, st = ctx.st; st.at = {};
          const cw = d.colour, kw = KIND_WORD[d.kind];
          const goalOf = sh => (sh.colour === cw && sh.kind === d.kind ? "AB" : sh.colour === cw ? "A" : sh.kind === d.kind ? "B" : null);
          const where = i => { if (!st.at[i]) return null; const L2 = vennLayout(ctx, d.shapes.length), a = vennAbs(L2, st.at[i]); return regionOf(L2, a[0], a[1]); };
          // the rule is said with the first shape, not before it: a new line of speech stops the one playing
          const rule = `${cap(cw)} ones go in the ${cw} hoop. ${cap(kw)}s go in the ${kw} hoop. Both go in the middle. Neither stays out.`;
          let first = true;
          for (let i = 0; i < d.shapes.length; i++) {
            const goal = goalOf(d.shapes[i]);
            if (!goal) continue;
            st.want = i; st.goal = goal; let lastWrong = "";
            await ctx.wait(() => {
              const r = where(i);
              if (r === goal) return true;
              const k = JSON.stringify(st.at[i] || null);
              if (st.at[i] && k !== lastWrong) { lastWrong = k; ctx.say(`Not there. Is it ${cw}? Is it a ${kw}? Try again.`); }
              return false;
            }, { glow: ["sh:" + i], say: first ? `${rule} Look at the glowing one. Is it ${cw}? Is it a ${kw}?` : `Next one. Is it ${cw}? Is it a ${kw}?`,
              only: (k, id) => k === "tap" || k === "drop" || id === "sh:" + i });
            first = false;
          }
          st.want = undefined; st.goal = undefined;
          if (d.mode === "which") { ctx.say("Which one is in the middle?"); return; }
          // "how many": Marie counts the middle shapes, one tap each (Mimi says a first number only when there are
          // 3 or more; in the count-together lesson she says every number with her)
          const mid = d.shapes.map((sh, i) => i).filter(i => goalOf(d.shapes[i]) === "AB");
          st.cnt = {}; st.cn = 0; st.counting = true;
          await countAlong(ctx, mid.map(i => ({ pred: s => !!(s.cnt && s.cnt[i]), glow: ["sh:" + i], only: (k, id) => (k === "pick" ? id === "sh:" + i : k === "tap" ? id !== "clear" : k !== "drop"), onlyMsg: "Tap the shape that glows." })),
            "Now count the shapes in the middle. Tap each one.");
          st.counting = false;
          typeIt(ctx, "That is how many are in the middle.");
        } },
      { name: "Turning a shape", grade: 3, note: "BC Gr 3: the orientation of a shape does not change its properties.",
        make() {
          const [name, p1, p2] = pick(TURN_PAIRS), same = Math.random() < 0.5;
          const swap = Math.random() < 0.5, a = swap ? p2 : p1, b = same ? a : (swap ? p1 : p2);
          const rotB = pick([45, 90, 135, 180, 225, 270, 315]);
          return { key: `${name}${same}${swap}${rotB}`, say: "Is it the same shape, just turned?", show: "Same shape, just turned?", answer: same ? "same" : "different",
            input: { type: "choice", choices: [{ value: "same", label: "Same shape, it fits", html: `<span class="sd-ch word"><span class="sd-big">=</span>Same<span class="sd-small">it fits</span></span>` }, { value: "different", label: "Different shape, it never fits", html: `<span class="sd-ch word"><span class="sd-big">≠</span>Different<span class="sd-small">never fits</span></span>` }] },
            data: { name, a, b, rotB, colour: pick(["pink", "blue", "yellow", "green", "purple"]) } };
        },
        spec: turnSpec,
        hint: () => "Drag the see-through copy onto the other shape. Tap Turn. Does it ever fit exactly?",
        async teach(ctx, Q) {
          const st = ctx.st; st.on = false; st.rot = 0; st.turns = 0;
          await ctx.wait(s => s.on, { glow: ["copy", "target"], say: "This is a see-through copy. Drag it onto the other shape." });
          st.best = "turnR";
          // Round 2 (16 Oct 2026): the words and the steps are the SAME for a "same" and a "different" question, so
          // nothing Kitty says gives the answer away. Marie turns the copy all the way round (every one of the 8
          // ways it can point) and watches whether it ever fits; the lesson does not stop early when it fits.
          st.seen = { [st.rot]: true };
          await ctx.wait(s => Object.keys(s.seen || {}).length >= 8, { glow: ["turnR"], say: "Tap Turn. Keep turning, all the way round. Watch. Does it ever fit exactly?",
            only: (k, id) => k !== "tap" || id === "turnR" || id === "turnL" });
          st.best = null;
          // Marie saw it with her own taps; the lesson ends on a question, she gives the answer
          ctx.say("Look. Did it ever fit exactly, all the way round? So: same, or different?");
          await ctx.pause(1800);
        } }
    ]
  });

  /* =====================================================================================
     SHAPES 3D  (Geometry)
     Box and prism pictures use an oblique (cabinet) drawing: depth goes up and to the right at half
     length. "Turn it over" draws the solid seen from the opposite side, so every face can be tapped.
     ===================================================================================== */
  const DEPTH = 0.62 * Math.SQRT1_2;
  const VIEW = [DEPTH, DEPTH, -1]; // towards the viewer
  function solid3d(kind) {
    let V, F;
    if (kind === "triprism") {
      const w = 1.3, h = 1.1, d = 1.5;
      V = [[0, 0, 0], [w, 0, 0], [w / 2, h, 0], [0, 0, d], [w, 0, d], [w / 2, h, d]];
      F = [
        { id: "front", idx: [0, 1, 2], n: [0, 0, -1] }, { id: "back", idx: [3, 5, 4], n: [0, 0, 1] },
        { id: "bottom", idx: [0, 3, 4, 1], n: [0, -1, 0] },
        { id: "left", idx: [0, 2, 5, 3], n: [-h, w / 2, 0] }, { id: "right", idx: [1, 4, 5, 2], n: [h, w / 2, 0] }
      ];
    } else {
      const [w, h, d] = kind === "cube" ? [1, 1, 1] : [1.6, 1, 0.8];
      V = [[0, 0, 0], [w, 0, 0], [w, h, 0], [0, h, 0], [0, 0, d], [w, 0, d], [w, h, d], [0, h, d]];
      F = [
        { id: "front", idx: [0, 1, 2, 3], n: [0, 0, -1] }, { id: "back", idx: [4, 7, 6, 5], n: [0, 0, 1] },
        { id: "top", idx: [3, 2, 6, 7], n: [0, 1, 0] }, { id: "bottom", idx: [0, 4, 5, 1], n: [0, -1, 0] },
        { id: "left", idx: [0, 3, 7, 4], n: [-1, 0, 0] }, { id: "right", idx: [1, 5, 6, 2], n: [1, 0, 0] }
      ];
    }
    const E = [];
    F.forEach(f => f.idx.forEach((a, k) => { const b = f.idx[(k + 1) % f.idx.length], key = Math.min(a, b) + "-" + Math.max(a, b); if (!E.some(e => e.key === key)) E.push({ key, a: Math.min(a, b), b: Math.max(a, b) }); }));
    return { V, F, E };
  }
  const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  // Project a solid. view 1 shows it from the other side (every point turned through the centre).
  function project(S, view, cx, cy, u) {
    const c = [0, 1, 2].map(k => (Math.min(...S.V.map(v => v[k])) + Math.max(...S.V.map(v => v[k]))) / 2);
    const P0 = S.V.map(v => { const p = view ? [2 * c[0] - v[0], 2 * c[1] - v[1], 2 * c[2] - v[2]] : v; return [p[0] + p[2] * DEPTH, -(p[1] + p[2] * DEPTH)]; });
    const cxp = (Math.min(...P0.map(p => p[0])) + Math.max(...P0.map(p => p[0]))) / 2, cyp = (Math.min(...P0.map(p => p[1])) + Math.max(...P0.map(p => p[1]))) / 2;
    const P = P0.map(p => [cx + (p[0] - cxp) * u, cy + (p[1] - cyp) * u]);
    const seen = S.F.map(f => dot3(view ? f.n.map(x => -x) : f.n, VIEW) > 1e-6);
    return { P, seen, w: (Math.max(...P0.map(p => p[0])) - Math.min(...P0.map(p => p[0]))), h: (Math.max(...P0.map(p => p[1])) - Math.min(...P0.map(p => p[1]))) };
  }
  const mix = (hex, to, t) => { const a = parseInt(hex.slice(1), 16), b = parseInt(to.slice(1), 16); const ch = s => Math.round(((a >> s) & 255) * (1 - t) + ((b >> s) & 255) * t); return "#" + ((1 << 24) + (ch(16) << 16) + (ch(8) << 8) + ch(0)).toString(16).slice(1); };
  function faceTone(f, view, base) {
    const n = view ? f.n.map(x => -x) : f.n, l = Math.hypot(...n);
    if (n[1] / l > 0.45) return mix(base, "#ffffff", 0.38);
    if (Math.abs(n[0]) / l > Math.abs(n[2]) / l) return mix(base, "#3b2a33", 0.14);
    return base;
  }
  // The true flat shape of a face, as points in its own plane.
  function faceFlat(S, f) {
    const pts = f.idx.map(i => S.V[i]), o = pts[0];
    const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], len = v => Math.hypot(...v);
    const e1 = sub(pts[1], o).map(x => x / len(sub(pts[1], o)));
    const nn = f.n.map(x => x / len(f.n)), e2 = [nn[1] * e1[2] - nn[2] * e1[1], nn[2] * e1[0] - nn[0] * e1[2], nn[0] * e1[1] - nn[1] * e1[0]];
    return pts.map(p => [dot3(sub(p, o), e1), dot3(sub(p, o), e2)]);
  }
  function flatKindOf(S, f) {
    const p = faceFlat(S, f);
    if (p.length === 3) return "triangle";
    const a = Math.hypot(p[1][0] - p[0][0], p[1][1] - p[0][1]), b = Math.hypot(p[2][0] - p[1][0], p[2][1] - p[1][1]);
    return Math.abs(a - b) < 1e-6 ? "square" : "rectangle";
  }
  function printShape(pts, x, y, box, fill) {
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    const w = Math.max(...xs) - Math.min(...xs), h = Math.max(...ys) - Math.min(...ys), k = box / Math.max(w, h);
    const q = pts.map(p => [x + (p[0] - Math.min(...xs) - w / 2) * k, y + (p[1] - Math.min(...ys) - h / 2) * k]);
    return `<polygon points="${ptsStr(q)}" fill="${fill}" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>`;
  }

  // Draw a polyhedron. mode: "solid" (opaque, tap faces), "wire" (see-through, tap edges or corners).
  function drawPoly(ctx, S, view, cx, cy, u, colour, mode, opts = {}) {
    const { P, seen } = project(S, view, cx, cy, u), st = ctx.st;
    let s = "", top = "";
    if (mode === "wire") {
      S.E.forEach(e => { const vis = S.F.some((f, k) => seen[k] && f.idx.includes(e.a) && f.idx.includes(e.b)); if (!vis) s += `<line x1="${r1(P[e.a][0])}" y1="${r1(P[e.a][1])}" x2="${r1(P[e.b][0])}" y2="${r1(P[e.b][1])}" stroke="${INK}" stroke-width="3" stroke-dasharray="7 6" stroke-linecap="round" opacity=".7"/>`; });
    }
    S.F.forEach((f, k) => {
      if (!seen[k]) return;
      const pts = f.idx.map(i => P[i]), id = "face:" + f.id, tone = faceTone(f, view, COL[colour]);
      const fo = mode === "wire" ? ` fill-opacity=".42"` : "";
      const tapAttr = opts.tapFaces ? ` data-tap="${id}" class="${ctx.g(id).trim()}"` : "";
      const face = `<polygon points="${ptsStr(pts)}" fill="${tone}"${fo} stroke="${INK}" stroke-width="4.5" stroke-linejoin="round"/>`;
      const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]), thin = Math.min(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
      if (tapAttr && thin < 48) {
        // a thin face seen from the side (small phones): an invisible thick rim makes it at least a finger wide
        s += `<g${tapAttr} data-hit="${r1(thin)}"><polygon points="${ptsStr(pts)}" fill="#fff" fill-opacity=".01" stroke="#fff" stroke-opacity=".01" stroke-width="${r1(Math.min(30, 2 * (48 - thin)))}" stroke-linejoin="round"/>${face}</g>`;
      } else s += tapAttr ? face.replace("<polygon", `<polygon${tapAttr}`) : face;
      if (opts.faceBadge && st.badge[id]) { const c = centroid(pts); top += mark(c[0], c[1]); }
      if (opts.sticker && st.sticker && st.sticker[id]) { const c = centroid(pts); top += `<g pointer-events="none">${chunkyCircle(c[0], c[1], 17, "#fff", { sw: 2.5, dy: 2 })}${flatMini(st.sticker[id], c[0], c[1])}</g>`; }
    });
    if (mode === "wire") {
      if (opts.tapEdges) S.E.forEach((e, k) => {
        const a = P[e.a], b = P[e.b], id = "edge:" + e.key, t = 0.2;
        s += `<g data-tap="${id}" data-hit="48" class="${ctx.g(id).trim()}"><line x1="${r1(a[0] + (b[0] - a[0]) * t)}" y1="${r1(a[1] + (b[1] - a[1]) * t)}" x2="${r1(b[0] - (b[0] - a[0]) * t)}" y2="${r1(b[1] - (b[1] - a[1]) * t)}" stroke="#fff" stroke-opacity=".01" stroke-width="48" stroke-linecap="butt"/>${st.badge[id] ? `<line x1="${r1(a[0])}" y1="${r1(a[1])}" x2="${r1(b[0])}" y2="${r1(b[1])}" stroke="${COL.purple}" stroke-width="7" stroke-linecap="round"/>` : ""}</g>`;
        if (st.badge[id]) top += mark((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, true);
      });
      if (opts.tapCorners) S.V.forEach((v, i) => {
        const [x, y] = P[i], id = "vtx:" + i, on = st.badge[id];
        s += `<g data-tap="${id}" class="${ctx.g(id).trim()}"><circle cx="${r1(x)}" cy="${r1(y)}" r="26" fill="#fff" fill-opacity=".01"/><circle cx="${r1(x)}" cy="${r1(y)}" r="${on ? 10 : 7.5}" fill="${on ? COL.green : "#fff"}" stroke="${INK}" stroke-width="3"/></g>`;
        if (on) top += mark(x + 17, y - 17, true);
      });
    }
    return s + top;
  }
  function flatMini(kind, x, y) {
    if (kind === "curved") return `<path d="M${r1(x - 10)} ${r1(y + 2)} q5 -9 10 0 t10 0" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`;
    return drawFlat(kind, "#fff", x, y, 20, 0, 2.5).replace(/<polygon[^>]*fill="#3b2a33"[^>]*\/>|<circle[^>]*fill="#3b2a33"[^>]*\/>/, "");
  }
  // The flat circle seen on top of a cylinder or cone. Seen from the side it is a thin oval, so when it can be tapped
  // an invisible thick rim around it makes the target at least a finger tall.
  function flatTop(tapAttr, cx, cy, r, ry, fill) {
    const oval = `<ellipse cx="${r1(cx)}" cy="${r1(cy)}" rx="${r1(r)}" ry="${r1(ry)}" fill="${fill}" stroke="${INK}" stroke-width="4.5"/>`;
    if (!tapAttr) return oval;
    const sw = Math.max(0, Math.min(30, 2 * (48 - 2 * ry)));
    return `<g${tapAttr} data-hit="${r1(2 * ry)}"><ellipse cx="${r1(cx)}" cy="${r1(cy)}" rx="${r1(r)}" ry="${r1(ry)}" fill="#fff" fill-opacity=".01" stroke="#fff" stroke-opacity=".01" stroke-width="${r1(sw)}"/>${oval}</g>`;
  }
  // Round solids, drawn upright. Parts: top / base (flat circles) and side (curved).
  function drawRound(ctx, kind, cx, cy, size, colour, opts = {}) {
    const st = ctx.st, base = COL[colour], light = mix(base, "#ffffff", 0.4), dark = mix(base, "#3b2a33", 0.12);
    const r = size * 0.36, ry = r * 0.32, hgt = size * 0.72;
    const tap = id => opts.tap ? ` data-tap="${id}" class="${ctx.g(id).trim()}"` : "";
    let s = "", top = "";
    const stick = (id, x, y) => { if (opts.sticker && st.sticker && st.sticker[id]) top += `<g pointer-events="none">${chunkyCircle(x, y, 17, "#fff", { sw: 2.5, dy: 2 })}${flatMini(st.sticker[id], x, y)}</g>`; };
    if (kind === "sphere") {
      s += `<g${tap("part:side")}><circle cx="${r1(cx)}" cy="${r1(cy)}" r="${r1(size * 0.42)}" fill="${base}" stroke="${INK}" stroke-width="4.5"/><ellipse cx="${r1(cx)}" cy="${r1(cy)}" rx="${r1(size * 0.42)}" ry="${r1(size * 0.12)}" fill="none" stroke="${INK}" stroke-width="2.5" stroke-dasharray="7 6" opacity=".5"/><ellipse cx="${r1(cx - size * 0.14)}" cy="${r1(cy - size * 0.16)}" rx="${r1(size * 0.1)}" ry="${r1(size * 0.06)}" fill="#fff" opacity=".7" transform="rotate(-35 ${r1(cx - size * 0.14)} ${r1(cy - size * 0.16)})"/></g>`;
      stick("part:side", cx + size * 0.12, cy + size * 0.12);
    } else if (kind === "cylinder") {
      const yt = cy - hgt / 2, yb = cy + hgt / 2;
      s += `<path${tap("part:side")} d="M${r1(cx - r)} ${r1(yt)} L${r1(cx - r)} ${r1(yb)} A${r1(r)} ${r1(ry)} 0 0 0 ${r1(cx + r)} ${r1(yb)} L${r1(cx + r)} ${r1(yt)} Z" fill="${base}" stroke="${INK}" stroke-width="4.5" stroke-linejoin="round"/>`;
      s += flatTop(tap("part:top"), cx, yt, r, ry, light);
      stick("part:top", cx, yt); stick("part:side", cx + r * 0.45, cy + hgt * 0.15);
    } else {
      // a cone drawn point-down, like an ice cream cone, so its flat circle is on top where it can be seen and tapped
      const yt = cy - hgt / 2, yb = cy + hgt / 2 + size * 0.04;
      s += `<path${tap("part:side")} d="M${r1(cx - r)} ${r1(yt)} L${r1(cx)} ${r1(yb)} L${r1(cx + r)} ${r1(yt)} A${r1(r)} ${r1(ry)} 0 0 1 ${r1(cx - r)} ${r1(yt)} Z" fill="${base}" stroke="${INK}" stroke-width="4.5" stroke-linejoin="round"/>`;
      s += flatTop(tap("part:base"), cx, yt, r, ry, light);
      stick("part:base", cx, yt); stick("part:side", cx + r * 0.25, cy + hgt * 0.08);
    }
    return s + top;
  }
  const SOLID_WORD = { cube: "cube", rprism: "prism", triprism: "prism", cylinder: "cylinder", cone: "cone", sphere: "sphere" };
  const SOLID_FACE = { cube: "square", rprism: "rectangle", triprism: "triangle", cylinder: "circle", cone: "circle" };
  const ROUND_PARTS = { cylinder: { top: "circle", side: "curved" }, cone: { base: "circle", side: "curved" }, sphere: { side: "curved" } };
  const isRound = k => !!ROUND_PARTS[k];

  // Level 1 and 2: the solid plus a sheet of paper. Tap a flat face to stamp its shape; tap a curved part to feel it.
  function stampLayout(ctx) {
    const { vw, vh } = ctx;
    if (ctx.tall) { const sh = Math.min(vh * 0.6, vw - 40); return { sx: vw / 2, sy: 10 + sh / 2, ss: sh, px: 14, py: sh + 22, pw: vw - 28, ph: vh - sh - 32 }; }
    const sw = Math.min(vw * 0.55, vh - 20);
    return { sx: 14 + sw / 2, sy: vh / 2, ss: sw, px: sw + 34, py: 16, pw: vw - sw - 48, ph: vh - 32 };
  }
  function drawSolidAny(ctx, kind, cx, cy, size, colour, opts) {
    if (isRound(kind)) return drawRound(ctx, kind, cx, cy, size, colour, { tap: true, sticker: opts.sticker });
    const S = solid3d(kind), pr = project(S, 0, 0, 0, 1);
    const u = size * 0.86 / Math.max(pr.w, pr.h);
    return drawPoly(ctx, S, 0, cx, cy, u, colour, "solid", { tapFaces: true, sticker: opts.sticker });
  }
  const stampSpec = {
    init: () => ({ prints: [], sticker: {}, rolled: null }),
    draw(ctx) {
      const { st, d } = ctx, L = stampLayout(ctx);
      let s = `<g class="sd-chunk ${st.rolled === "roll" ? "sd-roll" : st.rolled === "slide" ? "sd-slide" : ""}" style="transform-origin:${r1(L.sx)}px ${r1(L.sy)}px">${drawSolidAny(ctx, d.solid, L.sx, L.sy, L.ss, d.colour, { sticker: d.mode === "name" })}</g>`;
      if (d.mode === "stamp") {
        s += chunkyRect(L.px, L.py, L.pw, L.ph, 14, "#fff", { dy: 3 });
        s += `<path d="M${r1(L.px + 10)} ${r1(L.py + 22)} h${r1(L.pw - 20)}" stroke="#ffd0de" stroke-width="2"/>`;
        const k = st.prints.length, box = Math.min(L.ph - 24, (L.pw - 20) / Math.max(1, Math.min(k, 3)) - 14, 90);
        st.prints.slice(-3).forEach((p, i) => {
          const n = Math.min(k, 3), x = L.px + L.pw / 2 + (i - (n - 1) / 2) * (box + 14), y = L.py + L.ph / 2;
          s += `<g class="${i === n - 1 && st.fresh ? "sd-pop" : ""}" pointer-events="none">${p.circle ? `<circle cx="${r1(x)}" cy="${r1(y)}" r="${r1(box / 2)}" fill="#efe8ff" stroke="${INK}" stroke-width="3.5"/>` : printShape(p.pts, x, y, box, "#efe8ff")}</g>`;
        });
        if (!k) s += txt(L.px + L.pw / 2, L.py + L.ph / 2, "Tap a flat part", 18, { fill: "#b59aa8" });
        st.fresh = false;
      }
      return s;
    },
    controls: ctx => ctx.d.mode === "name" ? `<button type="button" class="sd-btn sun${ctx.g("roll")}" data-tap="roll">Roll it</button>` : resetBtn(ctx, "clear", "↺ Clean the paper", ctx.st.prints.length > 0),
    onTap(ctx, id) {
      const st = ctx.st, d = ctx.d;
      if (id === "clear") { st.prints = []; return; }
      if (id === "roll") {
        const rolls = isRound(d.solid);
        st.rolled = null; ctx.render(); st.rolled = rolls ? "roll" : "slide";
        ctx.speak(rolls ? "It rolls!" : "It slides. It does not roll."); ctx.tone(rolls ? [500, 600, 700] : [400, 400], 0.08);
        ctxTimer(ctx, () => { st.rolled = null; ctx.render(); }, 1300);
        return;
      }
      if (id.startsWith("part:")) {
        const part = id.slice(5), kind = ROUND_PARTS[d.solid][part];
        st.sticker[id] = kind;
        if (kind === "curved") { ctx.speak("This part is curved."); ctx.tone([500, 650], 0.08); }
        else { ctx.speak("Flat!"); ctx.tone([700], 0.08); if (d.mode === "stamp") { st.prints.push({ circle: true }); st.fresh = true; } }
        st.touched = { ...(st.touched || {}), [id]: true };
        return;
      }
      if (id.startsWith("face:")) {
        const S = solid3d(d.solid), f = S.F.find(x => "face:" + x.id === id);
        st.sticker[id] = flatKindOf(S, f);
        st.touched = { ...(st.touched || {}), [id]: true };
        ctx.speak("Flat!"); ctx.tone([700], 0.08);
        if (d.mode === "stamp") { st.prints.push({ pts: faceFlat(S, f) }); st.fresh = true; }
      }
    }
  };

  // Level 3: count faces, edges or corners.
  function countLayout3(ctx, S) {
    const { vw, vh } = ctx, pr = project(S, 0, 0, 0, 1);
    const u = Math.min((vw - 60) / pr.w, (vh - 50) / pr.h, 230);
    return { cx: vw / 2, cy: vh / 2, u };
  }
  const count3Spec = {
    init: () => ({ badge: {}, n: 0, view: 0 }),
    draw(ctx) {
      const { st, d } = ctx, S = solid3d(d.solid), L = countLayout3(ctx, S);
      const wire = d.what !== "faces";
      let s = `<g class="${st.flipNow ? "sd-flip" : ""}${wire ? "" : " sd-chunk"}" style="transform-origin:${r1(L.cx)}px ${r1(L.cy)}px">`;
      s += drawPoly(ctx, S, wire ? 0 : st.view, L.cx, L.cy, L.u, d.colour, wire ? "wire" : "solid", { tapFaces: !wire, faceBadge: !wire, tapEdges: d.what === "edges", tapCorners: d.what === "vertices" });
      st.flipNow = false;
      return s + "</g>";
    },
    controls: ctx => (ctx.d.what === "faces" ? `<button type="button" class="sd-btn sun${ctx.g("flip")}" data-tap="flip">Turn it over</button>` : "") + resetBtn(ctx, "clear", "↺ Count again", ctx.st.n > 0),
    onTap(ctx, id) {
      const st = ctx.st;
      if (id === "clear") { st.badge = {}; st.n = 0; return; }
      if (id === "flip") { st.view = 1 - st.view; st.flipNow = true; st.flips = (st.flips || 0) + 1; ctx.tone([500, 700], 0.07); return; }
      if (st.badge[id]) return;
      st.n++; st.badge[id] = st.n; ctx.tone([560 + Math.min(st.n, 14) * 30], 0.06); ctx.countAloud(st.n);
    }
  };

  // Level 4: nets. Three nets to choose from; the chosen one folds up in 3D.
  function netFolds(cells) { // true when the 6 squares fold into a closed cube
    const has = (c, r) => cells.some(q => q[0] === c && q[1] === r);
    if (cells.some(([c, r]) => has(c + 1, r) && has(c, r + 1) && has(c + 1, r + 1))) return false;
    const start = { U: 0, D: 1, N: 2, S: 3, E: 4, W: 5 }, seen = new Map([[cells[0].join(","), start]]), q = [cells[0]];
    const roll = (o, dir) => dir === "E" ? { ...o, D: o.E, E: o.U, U: o.W, W: o.D } : dir === "W" ? { ...o, D: o.W, W: o.U, U: o.E, E: o.D } : dir === "S" ? { ...o, D: o.S, S: o.U, U: o.N, N: o.D } : { ...o, D: o.N, N: o.U, U: o.S, S: o.D };
    while (q.length) {
      const [c, r] = q.shift(), o = seen.get(c + "," + r);
      for (const [dc, dr, dir] of [[1, 0, "E"], [-1, 0, "W"], [0, 1, "S"], [0, -1, "N"]]) {
        const k = (c + dc) + "," + (r + dr);
        if (has(c + dc, r + dr) && !seen.has(k)) { seen.set(k, roll(o, dir)); q.push([c + dc, r + dr]); }
      }
    }
    return new Set([...seen.values()].map(o => o.D)).size === 6;
  }
  function normCells(cells) { const mc = Math.min(...cells.map(c => c[0])), mr = Math.min(...cells.map(c => c[1])); return cells.map(([c, r]) => [c - mc, r - mr]).sort((a, b) => a[1] - b[1] || a[0] - b[0]); }
  function netKey(cells) {
    const forms = [];
    let cur = cells;
    for (let m = 0; m < 2; m++) { for (let k = 0; k < 4; k++) { cur = cur.map(([c, r]) => [r, -c]); forms.push(JSON.stringify(normCells(cur))); } cur = cur.map(([c, r]) => [-c, r]); }
    return forms.sort()[0];
  }
  function randomHexomino() {
    for (;;) {
      const cells = [[0, 0]];
      while (cells.length < 6) {
        const [c, r] = pick(cells), [dc, dr] = pick([[1, 0], [-1, 0], [0, 1], [0, -1]]);
        if (!cells.some(q => q[0] === c + dc && q[1] === r + dr)) cells.push([c + dc, r + dr]);
      }
      const n = normCells(cells), w = Math.max(...n.map(c => c[0])) + 1, h = Math.max(...n.map(c => c[1])) + 1;
      if (Math.max(w, h) <= 4 && Math.min(w, h) <= 3) return n;
    }
  }
  function netSVG(cells, cellPx, colour) {
    const w = Math.max(...cells.map(c => c[0])) + 1, h = Math.max(...cells.map(c => c[1])) + 1;
    return `<svg class="sd-own" viewBox="-3 -3 ${w * 20 + 6} ${h * 20 + 6}" width="${w * cellPx}" height="${h * cellPx}" aria-hidden="true">${cells.map(([c, r]) => `<rect x="${c * 20}" y="${r * 20}" width="20" height="20" rx="2" fill="${COL[colour]}" stroke="${INK}" stroke-width="2.5"/>`).join("")}</svg>`;
  }
  function netsLayout(ctx) {
    const { vw, vh } = ctx, topH = ctx.tall ? Math.min(110, vh * 0.32) : vh - 20;
    const cw = ctx.tall ? (vw - 20) / 3 : Math.min(150, vw * 0.24);
    return ctx.tall
      ? { cards: [0, 1, 2].map(i => [10 + cw * i + 4, 8, cw - 8, topH - 8]), stage: [10, topH + 6, vw - 20, vh - topH - 14] }
      : { cards: [0, 1, 2].map(i => [10, 10 + i * (vh - 20) / 3 + 3, cw, (vh - 20) / 3 - 6]), stage: [cw + 26, 10, vw - cw - 36, vh - 20] };
  }
  const NET_COLOURS = ["pink", "blue", "yellow"];
  // Marie folds the net herself: one tap on a square turns it up (or down again). The square in the middle (the one
  // with the most neighbours) stays on the table. Nothing folds by itself.
  const netSpec = {
    init: () => ({ sel: null, pickNet: null, fold: {}, ft: {}, folds: {} }),
    draw(ctx) {
      const { st, d } = ctx, L = netsLayout(ctx);
      let s = "";
      d.nets.forEach((cells, i) => {
        const [x, y, w, h] = L.cards[i], id = "net:" + i, on = st.pickNet === i;
        const cw = Math.max(...cells.map(c => c[0])) + 1, ch = Math.max(...cells.map(c => c[1])) + 1, k = Math.min((w - 34) / cw, (h - 14) / ch, 24);
        s += `<g data-tap="${id}" class="${ctx.g(id).trim()}">${chunkyRect(x, y, w, h, 14, on ? "#fff3cf" : "#fff", { dy: 3, sw: on ? 4 : 3 })}`;
        s += txt(x + 14, y + 16, "ABC"[i], 18, { fill: DEEP[NET_COLOURS[i]] });
        const ox = x + 20 + (w - 20 - cw * k) / 2, oy = y + (h - ch * k) / 2;
        cells.forEach(([c, r]) => { s += `<rect x="${r1(ox + c * k)}" y="${r1(oy + r * k)}" width="${r1(k)}" height="${r1(k)}" rx="2" fill="${COL[NET_COLOURS[i]]}" stroke="${INK}" stroke-width="2.5"/>`; });
        s += `</g>`;
      });
      const [x, y, w, h] = L.stage;
      s += `<rect x="${r1(x)}" y="${r1(y)}" width="${r1(w)}" height="${r1(h)}" rx="18" fill="${CREAM}" stroke="${INK}" stroke-width="3"/>`;
      if (st.pickNet == null) s += txt(x + w / 2, y + h / 2, ctx.tall ? "Tap a net" : "Tap a net to try it", 20, { fill: "#b59aa8" });
      else {
        const cells = d.nets[st.pickNet], cue = !anyOn(st.fold) && !anyOn(st.ft);
        st.box = [x, y + (cue ? 22 : 0), w, h - (cue ? 22 : 0)];
        const model = foldModel(cells, NET_COLOURS[st.pickNet], ...st.box, cells.map((c, j) => st.ft[j] || 0)), root = netTree(cells).root;
        s += model.map(f => `<polygon data-tap="flap:${f.i}" class="${ctx.g("flap:" + f.i).trim()}" points="${ptsStr(f.pts)}" fill="${f.fill}" fill-opacity=".9" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>`).join("");
        // a flat square can end up behind squares that stand up: an invisible copy on top keeps it tappable
        // the copy of the square that glows (Mimi's lesson) goes last, so another flat square's copy can not cover it
        const lit = f => (ctx.glow.has("flap:" + f.i) ? 1 : 0);
        s += model.filter(f => f.i !== root && !st.fold[f.i]).sort((f, g) => lit(f) - lit(g)).map(f => `<polygon data-tap="flap:${f.i}" data-hitcopy="1" points="${ptsStr(f.pts)}" fill="#fff" fill-opacity=".01"/>`).join("");
        if (cue) s += txt(x + w / 2, y + 20, "Tap a square to fold it up", 16, { fill: "#8a6f7d" });
      }
      return s;
    },
    controls: ctx => ctx.st.pickNet == null ? "" : resetBtn(ctx, "unfold", "↺ Unfold", anyOn(ctx.st.fold)),
    onTap(ctx, id) {
      const st = ctx.st;
      if (id.startsWith("net:")) { st.pickNet = +id.slice(4); st.fold = {}; st.ft = {}; ctx.tone([600], 0.06); ctx.speak("Net " + "ABC"[st.pickNet]); return; }
      if (st.pickNet == null) return;
      const cells = ctx.d.nets[st.pickNet], T = netTree(cells);
      if (id === "unfold") { st.fold = {}; ctx.tone([800, 600], 0.07); }
      else if (id.startsWith("flap:")) {
        const j = +id.slice(5);
        if (j === T.root) { ctx.say("This square stays on the table. Fold the other squares up."); return; }
        st.fold = { ...st.fold, [j]: !st.fold[j] };
        ctx.tone(st.fold[j] ? [600, 750] : [700, 550], 0.06);
        if (T.order.every(k => st.fold[k])) st.folds[st.pickNet] = true;
      } else return;
      // each square moves towards its goal (up = 1, flat = 0) in about half a second, only after Marie's tap
      if (st.anim) return;
      let last = performance.now();
      const step = now => {
        if (ctx.dead) { st.anim = 0; return; }
        const net = ctx.d.nets[st.pickNet];
        const dt = reduceMotion() ? 1 : Math.min(0.1, Math.max(0, now - last) / 550); last = now;
        let moving = false;
        net.forEach((c, j) => { const goal = st.fold[j] ? 1 : 0, v = st.ft[j] || 0; if (v !== goal) { st.ft[j] = goal > v ? Math.min(goal, v + dt) : Math.max(goal, v - dt); moving = true; } });
        const svgEl = ctx.root.querySelector(".sd-svg"), faces = st.box && foldModel(net, NET_COLOURS[st.pickNet], ...st.box, net.map((c, j) => st.ft[j] || 0));
        const els = faces && faces.map(f => svgEl.querySelector(`[data-tap="flap:${f.i}"]:not([data-hitcopy])`));
        if (els && els.every(Boolean)) {
          faces.forEach((f, k) => {
            els[k].setAttribute("points", ptsStr(f.pts)); els[k].setAttribute("fill", f.fill); els[k].parentNode.appendChild(els[k]);
            const hc = svgEl.querySelector(`[data-tap="flap:${f.i}"][data-hitcopy]`); if (hc) hc.setAttribute("points", ptsStr(f.pts));
          });
          svgEl.querySelectorAll("[data-hitcopy]").forEach(h => h.parentNode.appendChild(h));
        } else ctx.render();
        st.anim = moving ? requestAnimationFrame(step) : 0;
      };
      st.anim = requestAnimationFrame(step);
    }
  };
  const reduceMotion = () => { try { return matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; } };

  /* A paper model of the net, drawn in SVG with our own 3D maths (no CSS 3D, so every browser shows the same).
     Each square is hinged to the square it grew from and turns up by 90 degrees x t. */
  const M4 = {
    mul(a, b) { const o = new Array(16).fill(0); for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) for (let k = 0; k < 4; k++) o[r * 4 + c] += a[r * 4 + k] * b[k * 4 + c]; return o; },
    id: () => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
    tr: (x, y, z) => [1, 0, 0, x, 0, 1, 0, y, 0, 0, 1, z, 0, 0, 0, 1],
    rx: a => { const c = Math.cos(a), s = Math.sin(a); return [1, 0, 0, 0, 0, c, -s, 0, 0, s, c, 0, 0, 0, 0, 1]; },
    ry: a => { const c = Math.cos(a), s = Math.sin(a); return [c, 0, s, 0, 0, 1, 0, 0, -s, 0, c, 0, 0, 0, 0, 1]; },
    app: (m, p) => [m[0] * p[0] + m[1] * p[1] + m[2] * p[2] + m[3], m[4] * p[0] + m[5] * p[1] + m[6] * p[2] + m[7], m[8] * p[0] + m[9] * p[1] + m[10] * p[2] + m[11]]
  };
  // The square that stays on the table (the one with the most neighbours) and the other squares, nearest first.
  function netTree(cells) {
    const has = (c, r) => cells.findIndex(q => q[0] === c && q[1] === r);
    const nb = i => [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dc, dr]) => has(cells[i][0] + dc, cells[i][1] + dr) >= 0).length;
    let root = 0; cells.forEach((c, i) => { if (nb(i) > nb(root)) root = i; });
    const seen = new Set([root]), q = [root], order = [];
    while (q.length) { const i = q.shift(); for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const j = has(cells[i][0] + dc, cells[i][1] + dr); if (j >= 0 && !seen.has(j)) { seen.add(j); order.push(j); q.push(j); } } }
    return { root, order };
  }
  // t: how far each square is turned up, 0 (flat) to 1 (a right angle); one number for all, or one per square
  function foldFaces(cells, t) {
    const has = (c, r) => cells.findIndex(q => q[0] === c && q[1] === r);
    const root = netTree(cells).root, tOf = j => (typeof t === "number" ? t : (t[j] || 0));
    const M = new Map([[root, M4.id()]]), q = [root];
    while (q.length) {
      const i = q.shift(), [pc, pr] = cells[i];
      for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const j = has(pc + dc, pr + dr);
        if (j < 0 || M.has(j)) continue;
        const a = tOf(j) * Math.PI / 2;
        // hinge: the shared edge, in the flat sheet (units of one square; z = 0 is the sheet, +z towards the viewer)
        let R;
        if (dc) { const hx = dc > 0 ? pc + 1 : pc; R = M4.mul(M4.tr(hx, 0, 0), M4.mul(M4.ry(dc > 0 ? -a : a), M4.tr(-hx, 0, 0))); }
        else { const hy = dr > 0 ? pr + 1 : pr; R = M4.mul(M4.tr(0, hy, 0), M4.mul(M4.rx(dr > 0 ? a : -a), M4.tr(0, -hy, 0))); }
        M.set(j, M4.mul(M.get(i), R)); q.push(j);
      }
    }
    return { root, faces: cells.map(([c, r], i) => [[c, r, 0], [c + 1, r, 0], [c + 1, r + 1, 0], [c, r + 1, 0]].map(p => M4.app(M.get(i), p))) };
  }
  function drawFolding(cells, colour, x, y, w, h, tIn, tapAttr) {
    return foldModel(cells, colour, x, y, w, h, tIn).map(f => `<polygon${tapAttr ? tapAttr(f.i) : ' pointer-events="none"'} points="${ptsStr(f.pts)}" fill="${f.fill}" fill-opacity=".9" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>`).join("");
  }
  // The six squares of a (partly) folded net as flat polygons on screen, back to front.
  function foldModel(cells, colour, x, y, w, h, tIn) {
    const { root, faces } = foldFaces(cells, tIn);
    // the whole model tilts a little as it folds, so the box can be seen in 3D
    const t = typeof tIn === "number" ? tIn : tIn.reduce((a, v, j) => a + (j === root ? 0 : v), 0) / Math.max(1, cells.length - 1);
    // turn the model a little as it folds, so the box can be seen in 3D
    const [rc, rr] = cells[root], ctr = [rc + 0.5, rr + 0.5, 0.5 * t];
    const V = M4.mul(M4.rx(-0.55 * t), M4.ry(0.62 * t));
    const view = faces.map(f => f.map(p => M4.app(V, [p[0] - ctr[0], p[1] - ctr[1], p[2] - ctr[2]])));
    const all = view.flat(), xs = all.map(p => p[0]), ys = all.map(p => p[1]);
    // size from the flat net, so the model does not jump about while it folds
    const cw = Math.max(...cells.map(c => c[0])) + 1, ch = Math.max(...cells.map(c => c[1])) + 1;
    const Sflat = Math.min((w - 30) / Math.max(cw, 2.2), (h - 30) / Math.max(ch, 2.2), 110), Sbox = Math.min(w, h, 300) / 2.3;
    const S = Sflat + (Sbox - Sflat) * t;
    const mx = (Math.min(...xs) + Math.max(...xs)) / 2, my = (Math.min(...ys) + Math.max(...ys)) / 2;
    const P = p => [x + w / 2 + (p[0] - mx) * S, y + h / 2 + (p[1] - my) * S];
    const base = COL[colour], order = view.map((f, i) => ({ i, z: f.reduce((a, p) => a + p[2], 0) / 4 })).sort((a, b) => a.z - b.z);
    return order.map(({ i }) => {
      const f = view[i], pts = f.map(P);
      const n = (() => { const u = [f[1][0] - f[0][0], f[1][1] - f[0][1], f[1][2] - f[0][2]], v = [f[3][0] - f[0][0], f[3][1] - f[0][1], f[3][2] - f[0][2]]; return u[0] * v[1] - u[1] * v[0]; })();
      const shade = Math.abs(n) > 0.6 ? base : mix(base, "#3b2a33", 0.12 + 0.2 * (1 - Math.abs(n)));
      return { i, pts, fill: shade };
    });
  }

  const solidChoice = k => ({ value: SOLID_WORD[k], label: cap(SOLID_WORD[k]), html: `<span class="sd-ch word">${cap(SOLID_WORD[k])}</span>` });
  topic({
    id: "shapes_3d", title: "Solid shapes", strand: "Geometry",
    icon: `<svg viewBox="0 0 64 64" aria-hidden="true"><polygon points="8,24 36,24 36,54 8,54" fill="${COL.blue}" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/><polygon points="8,24 20,12 48,12 36,24" fill="${mix(COL.blue, "#ffffff", 0.4)}" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/><polygon points="36,24 48,12 48,42 36,54" fill="${mix(COL.blue, "#3b2a33", 0.14)}" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/></svg>`,
    levels: [
      { name: "Flat faces on solids", grade: 2, note: "BC Gr 2: 2D shapes as the faces of 3D objects.",
        make() {
          const solid = pick(["cube", "rprism", "triprism", "cylinder", "cone"]), ans = SOLID_FACE[solid];
          const ban = { square: ["rectangle"], rectangle: ["square"], triangle: ["rectangle", "square"], circle: [] }[ans];
          const others = sample(["square", "rectangle", "triangle", "circle"].filter(k => k !== ans && !ban.includes(k)), 2);
          // a triangular prism has rectangle faces too, so those can not be wrong choices; a hexagon is on none of these solids
          if (others.length < 2) others.push("hexagon");
          const colour = pick(["pink", "blue", "yellow", "green", "purple"]);
          return { key: solid + colour, say: "Which flat shape is on this solid?", show: "Which flat shape is on it?", answer: ans,
            input: { type: "choice", choices: shuffle([ans, ...others]).map(k => kindChoice(k, "purple")) }, data: { mode: "stamp", solid, colour } };
        },
        spec: stampSpec,
        hint: () => "Tap a flat part of the solid. It stamps its shape on the paper. Which button looks like the stamp?",
        async teach(ctx, Q) {
          const d = Q.data, st = ctx.st; st.prints = [];
          const target = isRound(d.solid) ? (d.solid === "cylinder" ? "part:top" : "part:base") : "face:front";
          if (isRound(d.solid)) {
            await ctx.wait(s => s.touched && s.touched["part:side"], { glow: ["part:side"], say: "Tap the side. Is it flat or curved?", only: (k, id) => k !== "tap" || id === "part:side" });
            await ctx.pause(900);
          }
          await ctx.wait(s => s.prints.length > 0, { glow: [target], say: "This part is flat. Tap it to stamp it on the paper.", only: (k, id) => k !== "tap" || id === target });
          ctx.say("Look at the stamp on the paper. Which button looks the same?");
        } },
      { name: "Name the solid", grade: 3, note: "BC Gr 3: names of 3D objects — sphere, cube, prism, cone, cylinder.",
        make() {
          const solid = pick(["cube", "rprism", "triprism", "cylinder", "cone", "sphere"]), ans = SOLID_WORD[solid];
          const pool = ["sphere", "cube", "prism", "cone", "cylinder"].filter(w => w !== ans && !(ans === "cube" && w === "prism") && !(ans === "prism" && w === "cube"));
          const opts = shuffle([ans, ...sample(pool, 2)]);
          const colour = pick(["pink", "blue", "yellow", "green", "purple"]);
          return { key: solid + colour, say: "What is this solid called?", show: "What is this solid called?", answer: ans,
            input: { type: "choice", choices: opts.map(w => ({ value: w, label: cap(w), html: `<span class="sd-ch word">${cap(w)}</span>` })) }, data: { mode: "name", solid, colour, opts } };
        },
        spec: stampSpec,
        hint: () => "Tap each part. Is it flat or curved? Tap Roll it. Does it roll?",
        async teach(ctx, Q) {
          const d = Q.data, st = ctx.st; st.sticker = {}; st.touched = {};
          const parts = isRound(d.solid) ? Object.keys(ROUND_PARTS[d.solid]).map(p => "part:" + p) : solid3d(d.solid).F.filter((f, k) => project(solid3d(d.solid), 0, 0, 0, 1).seen[k]).map(f => "face:" + f.id);
          for (let i = 0; i < parts.length; i++) await ctx.wait(s => s.touched[parts[i]], { glow: [parts[i]], say: i === 0 ? "Tap each part. Is it flat or curved?" : undefined, only: (k, id) => k !== "tap" || id === parts[i] });
          await ctx.wait(s => s.rolled != null, { glow: ["roll"], say: "Now tap Roll it.", only: (k, id) => k !== "tap" || id === "roll" });
          await ctx.pause(1500);
          const tips = { sphere: "A sphere is round all over, like a ball.", cube: "A cube has 6 flat squares, all the same.", prism: "A prism has the same flat shape at both ends.", cone: "A cone has 1 flat circle and a point.", cylinder: "A cylinder has 2 flat circles and a curved side." };
          ctx.say(d.opts.map(w => tips[w]).join(" "));
          await ctx.pause(3000);
        } },
      { name: "Faces, edges, corners", grade: 3, note: "BC Gr 3: faces, edges and vertices of cubes and prisms.",
        make() {
          const solid = pick(["cube", "rprism", "triprism"]), what = pick(["faces", "edges", "vertices"]), S = solid3d(solid);
          const n = what === "faces" ? S.F.length : what === "edges" ? S.E.length : S.V.length;
          const word = { faces: "faces", edges: "edges", vertices: "corners" }[what];
          return { key: solid + what, say: `How many ${word} does this ${SOLID_WORD[solid]} have? Tap each one.`, show: `How many ${word}${what === "vertices" ? " (vertices)" : ""}?`, answer: String(n),
            input: { type: "number", unit: "" }, data: { solid, what, colour: pick(["pink", "blue", "yellow", "green", "purple"]) } };
        },
        spec: count3Spec,
        hint: Q => Q.data.what === "faces" ? "Tap each flat face you can see. Then tap Turn it over and tap the faces on the back."
          : Q.data.what === "edges" ? "An edge is where two faces meet. The dashed lines are at the back. Tap every line one time."
            : "A corner is where edges meet. Some are at the back. Tap every dot one time.",
        async teach(ctx, Q) {
          const d = Q.data, st = ctx.st, S = solid3d(d.solid); st.badge = {}; st.n = 0; st.view = 0;
          if (d.what === "faces") {
            // one count over both sides of the solid; "Turn it over" is a step of its own between them
            const front = S.F.filter((f, k) => project(S, 0, 0, 0, 1).seen[k]).map(f => "face:" + f.id);
            const back = S.F.filter((f, k) => project(S, 1, 0, 0, 1).seen[k]).map(f => "face:" + f.id);
            const show = ctx.recounting ? 0 : demoTaps(front.length + back.length);
            const steps = front.concat(back).map((id, i) => ({ pred: s => !!s.badge[id], glow: [id], only: (k, x) => k !== "tap" || x === id }));
            // the turn-over step waits before the first back face; its words come with it
            const flipAt = front.length;
            ctx.aloud = show;
            for (let k = 0; k < steps.length; k++) {
              if (!ctx.recounting && k === show && show) await ctx.pause(700);
              if (k === flipAt) await ctx.wait(s => s.view === 1, { glow: ["flip"], say: (!ctx.recounting && k === show && show ? YOUR_TURN + " " : "Keep counting. ") + "Tap Turn it over to see the back.", only: (kd, id) => kd !== "tap" || id === "flip" });
              await ctx.wait(steps[k].pred, { glow: steps[k].glow, only: steps[k].only, say: k === flipAt ? undefined : countSay(ctx, k, show, "Tap each face that glows. Count them.") });
            }
            ctx.aloud = 0;
          } else {
            const ids = d.what === "edges" ? S.E.map(e => "edge:" + e.key) : S.V.map((v, i) => "vtx:" + i);
            await countAlong(ctx, ids.map(id => ({ pred: s => !!s.badge[id], glow: [id], only: (k, x) => k !== "tap" || x === id })),
              `Tap each ${d.what === "edges" ? "edge" : "corner"} that glows. Some are at the back.`);
          }
          typeIt(ctx);
        } },
      { name: "Which net makes a cube?", grade: 3, note: "BC Gr 3: construction of 3D objects — nets of a cube.",
        make() {
          let good = null; const bad = [], keys = new Set();
          for (let t = 0; t < 4000 && (!good || bad.length < 2); t++) {
            const n = randomHexomino(), k = netKey(n);
            if (keys.has(k)) continue;
            const folds = netFolds(n);
            if (folds && !good) { good = n; keys.add(k); }
            else if (!folds && bad.length < 2) {
              const block = n.some(([c, r]) => n.some(q => q[0] === c + 1 && q[1] === r) && n.some(q => q[0] === c && q[1] === r + 1) && n.some(q => q[0] === c + 1 && q[1] === r + 1));
              if (block && Math.random() < 0.7) continue; // prefer nets that look like they might work
              bad.push(n); keys.add(k);
            }
          }
          const nets = shuffle([good, ...bad]), ans = "abc"[nets.indexOf(good)];
          return { key: nets.map(n => JSON.stringify(n)).join("|"), say: "Which net folds into a cube?", show: "Which net folds into a cube?", answer: ans,
            input: { type: "choice", choices: nets.map((n, i) => ({ value: "abc"[i], label: "Net " + "ABC"[i], html: `<span class="sd-ch"><span class="sd-small">${"ABC"[i]}</span>${netSVG(n, 16, NET_COLOURS[i])}</span>` })) },
            data: { nets } };
        },
        spec: netSpec,
        hint: () => "Tap a net. Then tap each square to fold it up. Does it close up into a box with no gaps?",
        async teach(ctx, Q) {
          for (let i = 0; i < 3; i++) {
            await ctx.wait(s => s.pickNet === i, { glow: ["net:" + i], say: `Tap net ${"ABC"[i]}.`, only: (k, id) => k !== "tap" || id === "net:" + i });
            const T = netTree(Q.data.nets[i]);
            for (let k = 0; k < T.order.length; k++) {
              const j = T.order[k];
              await ctx.wait(s => !!s.fold[j], { glow: ["flap:" + j], say: k === 0 ? "Fold it up. Tap the square that glows." : undefined, only: (kd, id) => kd !== "tap" || id === "flap:" + j, onlyMsg: "Tap the square that glows." });
            }
            await ctx.pause(900);
            ctx.say("Is it a closed box? Are there gaps, or squares on top of each other?");
            await ctx.pause(1800);
          }
          ctx.say("Which net made a closed box?");
        } }
    ]
  });

  // For the automated test only (not part of the module contract): the ruler settings for a number pattern.
  { const P = MT.find(t => t.id === "patterns"); if (P) Object.defineProperty(P, "_numCfg", { value: numCfg }); }

/*__MORE__*/
})();
