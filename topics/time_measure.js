/* time_measure.js - Measurement strand for Marie's maths game.
 *
 * Pushes six topics onto window.MathTopics: length, mass_capacity, area, time_units, calendar, clock.
 * The clock topic is last. It is a Grade 4 extension: BC Grade 3 says "Telling time is not expected at this level".
 *
 * Contract notes for the host:
 * - make(level, prev): `level` is a 0-based index into `levels` (a level object from `levels` also works).
 * - mount(el, Q, api) draws an SVG picture that scales to fill `el`, plus a row of 48px buttons under it.
 * - teach(Q, el, api) reuses the picture in `el` (it re-mounts it if needed), resets it, and walks Marie
 *   through each step. Each step waits until she has done it in the picture. It resolves when the picture
 *   is solved, or at once if the picture is destroyed.
 * - A tap only MARKS a thing (a heart, a filled dot, a colour). No tap ever draws or says a number, so Marie
 *   counts by herself. Before she answers, the answer is nowhere in the picture, in speech or in an aria-label.
 *   Numbers that stay: numbers given in the question, clock numerals 1-12, calendar dates, ruler landmarks
 *   (0, 5, 10, 15). Big sets come in groups of 5 (two colours, rows of 5) so she can count them.
 * - Test hook: el.__tmCtl.next() returns the next step (or null when solved); el.__tmCtl.clientAction(step)
 *   gives screen points for it. teach() uses the same steps.
 *
 * All drawings are our own inline SVG. Object pictures come from the host's art folder through api.ART(key).
 */
(function () {
  'use strict';
  var TOPICS = window.MathTopics = window.MathTopics || [];
  var NS = 'http://www.w3.org/2000/svg';
  var C = {
    ink: '#3b2a33', soft: '#6e5562', pink: '#ff6f9f', pinkD: '#e0306b', pinkT: '#ffe4ee', sun: '#ffc94a', sunT: '#fff1c9',
    mint: '#63d3b3', mintD: '#23a483', mintT: '#e2f8f0', sky: '#74c8ff', skyD: '#2386c8', skyT: '#e0f3ff', lilac: '#a98bff',
    lilacD: '#7b55e6', lilacT: '#ece6ff', cream: '#fff8ef', wood: '#f0bf87', woodD: '#c98a52', paper: '#ffffff', red: '#e8203f'
  };
  var CANDY = [C.pink, C.sun, C.mint, C.sky, C.lilac];
  var SK = 'stroke="#3b2a33" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"';

  /* ---------------- small helpers ---------------- */
  function rnd(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function ord(n) { var s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }
  var uid = 0;

  function injectCSS() {
    if (document.getElementById('tm-style')) return;
    var s = document.createElement('style');
    s.id = 'tm-style';
    s.textContent = [
      '.tm-root{position:relative;width:100%;height:100%;min-width:0;min-height:0;display:flex;flex-direction:column;gap:8px;box-sizing:border-box;overflow:hidden;color:#3b2a33;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}',
      '.tm-svg{flex:1 1 0;min-height:0;width:100%;display:block;overflow:hidden;touch-action:none;-webkit-tap-highlight-color:transparent}',
      '.tm-svg text{font-family:"Baloo 2","Comic Sans MS","Trebuchet MS",sans-serif;font-weight:800;pointer-events:none}',
      '.tm-svg [data-tap],.tm-svg [data-drag]{cursor:pointer}',
      '.tm-svg [data-drag]{cursor:grab}',
      '.tm-bar{flex:none;display:flex;gap:10px;justify-content:center;flex-wrap:wrap}',
      '.tm-bar:empty{display:none}',
      '.tm-btn{min-height:48px;min-width:48px;padding:0 16px;border:3px solid #3b2a33;border-radius:16px;box-shadow:0 4px 0 #3b2a33;background:#fff;color:#3b2a33;font:800 18px/1 "Baloo 2","Comic Sans MS",sans-serif;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent}',
      '.tm-btn:active{transform:translateY(3px);box-shadow:0 1px 0 #3b2a33}',
      '.tm-btn:focus-visible{outline:4px solid #74c8ff;outline-offset:2px}',
      '.tm-btn.tm-hl{background:#fff1c9;animation:tm-btnpulse 1s ease-in-out infinite}',
      '@keyframes tm-btnpulse{50%{box-shadow:0 4px 0 #3b2a33,0 0 0 6px #ffc94a}}',
      '.tm-ring{pointer-events:none;animation:tm-pulse 1s ease-in-out infinite}',
      '@keyframes tm-pulse{0%,100%{opacity:1}50%{opacity:.3}}',
      '.tm-pour{transform-box:fill-box;transform-origin:85% 20%;animation:tm-pour .5s ease}',
      '@keyframes tm-pour{40%{transform:rotate(38deg)}}',
      '@media (prefers-reduced-motion: reduce){.tm-ring,.tm-btn.tm-hl,.tm-pour{animation:none}}'
    ].join('\n');
    (document.head || document.documentElement).appendChild(s);
  }

  /* chunky card: dark shadow 4 units below, then the card with a 3-unit outline */
  function card(x, y, w, h, rx, fill, extra) {
    return '<rect x="' + x + '" y="' + (y + 4) + '" width="' + w + '" height="' + h + '" rx="' + rx + '" fill="' + C.ink + '"/>' +
      '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + rx + '" fill="' + fill + '" ' + SK + ' ' + (extra || '') + '/>';
  }
  /* a little heart: the mark a tap leaves. It never carries a number. */
  function mark(x, y, r, fill) {
    r = r || 10;
    var f = function (v) { return v.toFixed(1); };
    return '<path data-tm="mark" pointer-events="none" d="M' + f(x) + ' ' + f(y + r * 0.85) + ' C' + f(x - r * 1.5) + ' ' + f(y - r * 0.05) + ' ' + f(x - r * 0.75) + ' ' + f(y - r * 1.15) + ' ' + f(x) + ' ' + f(y - r * 0.4) +
      ' C' + f(x + r * 0.75) + ' ' + f(y - r * 1.15) + ' ' + f(x + r * 1.5) + ' ' + f(y - r * 0.05) + ' ' + f(x) + ' ' + f(y + r * 0.85) + ' Z" fill="' + (fill || C.pink) + '" stroke="' + C.ink + '" stroke-width="2" stroke-linejoin="round"/>';
  }
  /* a filled dot: the mark for a counted spot */
  function dot(x, y, r, fill) { return '<circle data-tm="mark" pointer-events="none" cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + r + '" fill="' + (fill || C.sun) + '" stroke="' + C.ink + '" stroke-width="2.5"/>'; }
  /* groups of five: the first five are one colour, the next five another, so she can see 5 and count on */
  function five(i) { return Math.floor(i / 5) % 2 ? 3 : 0; }
  function txt(x, y, s, size, fill, anchor, extra) {
    return '<text x="' + x + '" y="' + y + '" font-size="' + size + '" text-anchor="' + (anchor || 'middle') + '" fill="' + (fill || C.ink) + '" ' + (extra || '') + '>' + esc(s) + '</text>';
  }
  function outlined(x, y, s, size, fill) {
    return '<text x="' + x + '" y="' + y + '" font-size="' + size + '" text-anchor="middle" fill="' + fill + '" stroke="' + C.ink + '" stroke-width="' + Math.max(3, size / 7) + '" paint-order="stroke" stroke-linejoin="round">' + esc(s) + '</text>';
  }
  function artImg(api, key, x, y, s) {
    var u = '';
    try { u = api.ART(key); } catch (e) { u = ''; }
    return '<image href="' + esc(u) + '" x="' + x + '" y="' + y + '" width="' + s + '" height="' + s + '" preserveAspectRatio="xMidYMid meet" pointer-events="none"/>';
  }
  /* a character head from the host's face(id), placed at x,y with size s */
  function faceAt(api, id, x, y, s) {
    var f = '';
    try { f = api.face(id) || ''; } catch (e) { f = ''; }
    var at = ' x="' + x + '" y="' + y + '" width="' + s + '" height="' + s + '" pointer-events="none" overflow="visible"';
    if (/^\s*<svg/i.test(f)) {
      if (!/viewBox=/i.test(f)) at += ' viewBox="0 0 100 100"';
      return f.replace(/<svg/i, '<svg' + at);
    }
    return '<svg' + at + ' viewBox="0 0 100 100">' + f + '</svg>';
  }

  /* ---------------- our own drawings (100 x 100 boxes) ---------------- */
  var DRAW = {
    pencil: '<g transform="rotate(-30 50 50)"><rect x="18" y="39" width="56" height="22" fill="#ffc94a" ' + SK + '/><line x1="20" y1="50" x2="72" y2="50" stroke="#e9a91e" stroke-width="3"/><rect x="6" y="39" width="16" height="22" rx="5" fill="#ff6f9f" ' + SK + '/><path d="M74 39 L95 50 L74 61 Z" fill="#f0bf87" ' + SK + '/><path d="M88 46.5 L95 50 L88 53.5 Z" fill="#3b2a33"/></g>',
    car: '<rect x="2" y="74" width="96" height="16" rx="4" fill="#6e5562" ' + SK + '/><path d="M10 82 h14 M40 82 h14 M70 82 h14" stroke="#fff" stroke-width="3"/><path d="M12 64 L22 44 Q26 38 34 38 H62 Q70 38 74 44 L84 56 H90 Q94 56 94 62 V68 H10 Z" fill="#ff6f9f" ' + SK + '/><path d="M28 46 H46 V56 H23 Z M52 46 H66 L73 56 H52 Z" fill="#e0f3ff" stroke="#3b2a33" stroke-width="2.5" stroke-linejoin="round"/><circle cx="30" cy="68" r="9" fill="#3b2a33"/><circle cx="74" cy="68" r="9" fill="#3b2a33"/><circle cx="30" cy="68" r="3.5" fill="#fff"/><circle cx="74" cy="68" r="3.5" fill="#fff"/>',
    plane: '<path d="M8 56 Q8 46 22 46 H80 Q96 48 96 56 Q96 62 80 63 H22 Q8 63 8 56 Z" fill="#fff" ' + SK + '/><path d="M44 50 L30 22 H40 L62 50 Z" fill="#74c8ff" ' + SK + '/><path d="M44 60 L32 84 H42 L62 60 Z" fill="#74c8ff" ' + SK + '/><path d="M12 50 L6 34 H14 L24 48 Z" fill="#ff6f9f" ' + SK + '/><circle cx="70" cy="53" r="3" fill="#2386c8"/><circle cx="60" cy="53" r="3" fill="#2386c8"/><circle cx="50" cy="53" r="3" fill="#2386c8"/>',
    bus: '<rect x="6" y="26" width="88" height="48" rx="10" fill="#ffc94a" ' + SK + '/><rect x="14" y="34" width="16" height="14" rx="3" fill="#e0f3ff" stroke="#3b2a33" stroke-width="2.5"/><rect x="36" y="34" width="16" height="14" rx="3" fill="#e0f3ff" stroke="#3b2a33" stroke-width="2.5"/><rect x="58" y="34" width="16" height="14" rx="3" fill="#e0f3ff" stroke="#3b2a33" stroke-width="2.5"/><rect x="80" y="34" width="10" height="26" rx="3" fill="#e0f3ff" stroke="#3b2a33" stroke-width="2.5"/><line x1="10" y1="58" x2="76" y2="58" stroke="#3b2a33" stroke-width="3"/><circle cx="26" cy="76" r="9" fill="#3b2a33"/><circle cx="74" cy="76" r="9" fill="#3b2a33"/><circle cx="26" cy="76" r="3.5" fill="#fff"/><circle cx="74" cy="76" r="3.5" fill="#fff"/>',
    spoon: '<g transform="rotate(-35 50 50)"><rect x="46" y="44" width="50" height="10" rx="5" fill="#cfd8e3" ' + SK + '/><ellipse cx="30" cy="49" rx="24" ry="15" fill="#e6edf5" ' + SK + '/><ellipse cx="30" cy="49" rx="15" ry="8" fill="#ff8fb4"/></g>',
    bucket: '<path d="M22 22 Q50 -2 78 22" fill="none" stroke="#3b2a33" stroke-width="4"/><path d="M16 30 H84 L76 92 H24 Z" fill="#74c8ff" ' + SK + '/><ellipse cx="50" cy="30" rx="34" ry="8" fill="#bfe6ff" ' + SK + '/><path d="M24 50 H78" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".7"/>',
    pool: '<rect x="4" y="30" width="92" height="56" rx="12" fill="#74c8ff" ' + SK + '/><path d="M14 52 q8 -6 16 0 t16 0 t16 0 t16 0 t12 0" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round"/><path d="M14 68 q8 -6 16 0 t16 0 t16 0 t16 0 t12 0" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round"/><path d="M80 14 V40 M92 14 V40 M80 22 H92 M80 32 H92" stroke="#3b2a33" stroke-width="3.5" stroke-linecap="round"/>',
    tank: '<rect x="8" y="22" width="84" height="64" rx="8" fill="#e0f3ff" ' + SK + '/><rect x="11" y="34" width="78" height="49" rx="5" fill="#9ed8ff"/><rect x="8" y="22" width="84" height="64" rx="8" fill="none" ' + SK + '/><rect x="4" y="84" width="92" height="8" rx="4" fill="#c98a52" ' + SK + '/><circle cx="72" cy="46" r="3" fill="#fff"/><circle cx="78" cy="38" r="2" fill="#fff"/><path d="M22 60 Q34 46 48 60 Q34 74 22 60 Z M48 60 L58 52 V68 Z" fill="#ffc94a" ' + SK + '/><circle cx="31" cy="58" r="2.4" fill="#3b2a33"/>',
    toothbrush: '<g transform="rotate(-28 50 50)"><rect x="4" y="46" width="70" height="12" rx="6" fill="#a98bff" ' + SK + '/><rect x="62" y="34" width="32" height="14" rx="4" fill="#fff" ' + SK + '/><path d="M66 34 V26 M72 34 V26 M78 34 V26 M84 34 V26 M90 34 V26" stroke="#74c8ff" stroke-width="4" stroke-linecap="round"/><path d="M64 24 Q78 12 92 24 Z" fill="#63d3b3" stroke="#3b2a33" stroke-width="2.5"/></g>',
    finger: '<path d="M30 96 V34 Q30 16 50 16 Q70 16 70 34 V96 Z" fill="#ffd9c2" ' + SK + '/><path d="M38 40 V28 Q38 22 50 22 Q62 22 62 28 V40 Q50 46 38 40 Z" fill="#fff" stroke="#3b2a33" stroke-width="2.5"/><path d="M30 8 H70 M30 3 V13 M70 3 V13" stroke="#e0306b" stroke-width="3.5" stroke-linecap="round"/>',
    step: '<g fill="#a98bff" stroke="#3b2a33" stroke-width="3"><ellipse cx="22" cy="66" rx="11" ry="17"/><ellipse cx="78" cy="38" rx="11" ry="17"/></g><g fill="#a98bff" stroke="#3b2a33" stroke-width="2"><circle cx="15" cy="44" r="4"/><circle cx="24" cy="42" r="4"/><circle cx="71" cy="16" r="4"/><circle cx="80" cy="14" r="4"/></g><path d="M22 90 H78 M22 84 V96 M78 84 V96" stroke="#e0306b" stroke-width="3.5" stroke-linecap="round"/>',
    road: '<path d="M38 96 L46 30 H54 L62 96 Z" fill="#6e5562" ' + SK + '/><path d="M50 90 V78 M50 68 V58 M50 50 V42" stroke="#fff" stroke-width="3" stroke-linecap="round"/><path d="M60 30 V6" stroke="#3b2a33" stroke-width="3.5" stroke-linecap="round"/><path d="M60 6 L84 13 L60 20 Z" fill="#ff6f9f" ' + SK + '/><circle cx="22" cy="70" r="12" fill="#63d3b3" ' + SK + '/><circle cx="80" cy="64" r="10" fill="#63d3b3" ' + SK + '/>',
    clip: '<g transform="rotate(-20 50 50)" fill="none" stroke-linecap="round"><path d="M30 76 V30 Q30 14 46 14 Q62 14 62 30 V70 Q62 80 52 80 Q42 80 42 70 V34" stroke="#3b2a33" stroke-width="10"/><path d="M30 76 V30 Q30 14 46 14 Q62 14 62 30 V70 Q62 80 52 80 Q42 80 42 70 V34" stroke="#cfd8e3" stroke-width="5"/></g>',
    flour: '<path d="M18 26 Q16 16 26 18 L74 18 Q84 16 82 26 L86 88 Q86 94 80 94 H20 Q14 94 14 88 Z" fill="#fff8ef" ' + SK + '/><path d="M22 18 Q34 8 50 14 Q66 8 78 18" fill="#fff8ef" ' + SK + '/><rect x="24" y="44" width="52" height="30" rx="6" fill="#ffc94a" ' + SK + '/><text x="50" y="66" font-size="18" text-anchor="middle" fill="#3b2a33">1 kg</text>',
    drop: '<path d="M50 10 Q26 46 26 62 A24 24 0 0 0 74 62 Q74 46 50 10 Z" fill="#74c8ff" ' + SK + '/><path d="M40 60 Q40 72 50 76" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round"/>',
    bottle: '<rect x="38" y="4" width="24" height="12" rx="4" fill="#ff6f9f" ' + SK + '/><path d="M40 16 H60 V24 Q74 30 74 44 V88 Q74 96 66 96 H34 Q26 96 26 88 V44 Q26 30 40 24 Z" fill="#e0f3ff" ' + SK + '/><path d="M28 50 H72 V88 Q72 94 66 94 H34 Q28 94 28 88 Z" fill="#9ed8ff"/><path d="M40 16 H60 V24 Q74 30 74 44 V88 Q74 96 66 96 H34 Q26 96 26 88 V44 Q26 30 40 24 Z" fill="none" ' + SK + '/><text x="50" y="80" font-size="18" text-anchor="middle" fill="#3b2a33">1 L</text>',
    clap: '<g transform="rotate(-16 40 60)"><path d="M28 94 V48 Q28 32 40 32 Q52 32 52 48 V94 Z" fill="#ffd9c2" ' + SK + '/><path d="M28 64 Q16 60 15 50 Q16 43 28 48" fill="#ffd9c2" ' + SK + '/><path d="M36 33 V46 M44 33 V46" stroke="#3b2a33" stroke-width="2.5" stroke-linecap="round"/></g><g transform="rotate(16 60 60)"><path d="M48 94 V48 Q48 32 60 32 Q72 32 72 48 V94 Z" fill="#ffd9c2" ' + SK + '/><path d="M72 64 Q84 60 85 50 Q84 43 72 48" fill="#ffd9c2" ' + SK + '/><path d="M56 33 V46 M64 33 V46" stroke="#3b2a33" stroke-width="2.5" stroke-linecap="round"/></g><path d="M50 6 V18 M30 12 L37 22 M70 12 L63 22" stroke="#ff6f9f" stroke-width="5" stroke-linecap="round"/>',
    stopwatch: '<rect x="42" y="4" width="16" height="12" rx="3" fill="#ff6f9f" ' + SK + '/><path d="M74 22 l8 -8" stroke="#3b2a33" stroke-width="5" stroke-linecap="round"/><circle cx="50" cy="56" r="38" fill="#63d3b3" ' + SK + '/><circle cx="50" cy="56" r="29" fill="#fff" stroke="#3b2a33" stroke-width="2.5"/><path d="M50 56 V34" stroke="#3b2a33" stroke-width="5" stroke-linecap="round"/><path d="M50 56 L50 27 A29 29 0 0 1 75 42 Z" fill="#ffc94a" opacity=".6"/><circle cx="50" cy="56" r="4" fill="#3b2a33"/>',
    /* week and month pictures show how the unit feels, with no countable parts (no 7 day bars, no grid of
       day squares): counted parts would tell her which one is longer before she thinks it out.
       week = a school backpack (one school week); month = one blank calendar page. */
    week: '<path d="M36 20 Q36 8 50 8 Q64 8 64 20" fill="none" stroke="#3b2a33" stroke-width="5" stroke-linecap="round"/><rect x="18" y="18" width="64" height="76" rx="18" fill="#a98bff" ' + SK + '/><path d="M18 44 Q50 54 82 44 V36 Q82 18 64 18 H36 Q18 18 18 36 Z" fill="#ff6f9f" ' + SK + '/><rect x="30" y="58" width="40" height="26" rx="8" fill="#ffc94a" ' + SK + '/><path d="M36 66 H64" stroke="#3b2a33" stroke-width="3" stroke-linecap="round"/>',
    month: '<path d="M14 22 Q14 14 22 14 H78 Q86 14 86 22 V70 L64 92 H22 Q14 92 14 84 Z" fill="#fff" ' + SK + '/><path d="M14 22 Q14 14 22 14 H78 Q86 14 86 22 V34 H14 Z" fill="#ff6f9f" ' + SK + '/><path d="M86 70 L64 92 V76 Q64 70 70 70 Z" fill="#ffd6e4" ' + SK + '/><path d="M34 8 V22 M66 8 V22" stroke="#3b2a33" stroke-width="5" stroke-linecap="round"/><path d="M50 50 l5 10 11 1 -8 7 3 11 -11 -6 -11 6 3 -11 -8 -7 11 -1 Z" fill="#ffc94a" stroke="#3b2a33" stroke-width="2.5" stroke-linejoin="round"/>'
  };
  function drawing(key, x, y, s) { return '<svg x="' + x + '" y="' + y + '" width="' + s + '" height="' + s + '" viewBox="0 0 100 100" overflow="visible" pointer-events="none">' + DRAW[key] + '</svg>'; }
  /* an object picture: either our drawing (svg:key) or a host art PNG (art key) */
  function thing(api, item, x, y, s) { return item.svg ? drawing(item.svg, x, y, s) : artImg(api, item.art, x, y, s); }
  function thingHTML(api, item, px) {
    if (item.svg) return '<svg viewBox="0 0 100 100" width="' + px + '" height="' + px + '" aria-hidden="true">' + DRAW[item.svg] + '</svg>';
    var u = ''; try { u = api.ART(item.art); } catch (e) { u = ''; }
    return '<img src="' + esc(u) + '" width="' + px + '" height="' + px + '" alt="" draggable="false">';
  }

  /* ---------------- the controller: one live picture inside el ---------------- */
  function Ctl(el, Q, api) {
    injectCSS();
    var old = el.__tmCtl;
    if (old && !old.dead) old.destroy();
    el.innerHTML = '';
    this.el = el; this.Q = Q; this.api = api; this.B = BUILD[Q.data.kind];
    this.dead = false; this.offs = []; this.waiters = []; this.ringSel = null; this.teaching = false;
    this.gid = 'tm' + (++uid);
    var root = this.root = document.createElement('div');
    root.className = 'tm-root';
    var vb = this.B.vb(Q);
    this.vb = vb;
    root.innerHTML = '<svg class="tm-svg" xmlns="' + NS + '" viewBox="0 0 ' + vb[0] + ' ' + vb[1] + '" preserveAspectRatio="xMidYMid meet" role="img" aria-label="' + esc(Q.say) + '"></svg><div class="tm-bar"></div>';
    el.appendChild(root);
    this.svg = root.firstChild; this.bar = root.lastChild;
    el.__tmCtl = this;
    this.wire();
    this.reset();
  }
  Ctl.prototype.on = function (t, type, fn, opt) { t.addEventListener(type, fn, opt); this.offs.push(function () { t.removeEventListener(type, fn, opt); }); };
  Ctl.prototype.say = function (s) { this.spoke = s; try { this.api.say(s); } catch (e) { } };
  Ctl.prototype.tone = function (f, d, t, g) { try { this.api.tone(f, d, t, g); } catch (e) { } };
  Ctl.prototype.reset = function () {
    if (this.dead) return;
    this.s = {};
    this.B.init(this);
    this.bar.innerHTML = '';
    var self = this;
    this.barDefs = this.B.bar ? this.B.bar(this) : [];
    this.barDefs.forEach(function (b) {
      var btn = document.createElement('button');
      btn.type = 'button'; btn.className = 'tm-btn'; btn.setAttribute('data-b', b.id); btn.setAttribute('aria-label', b.aria || b.label);
      btn.textContent = b.label;
      self.bar.appendChild(btn);
    });
    this.render();
    this.changed();
  };
  Ctl.prototype.render = function () {
    if (this.dead) return;
    this.svg.innerHTML = this.B.draw(this);
    this.syncBar();
    this.placeRing();
  };
  /* a button with an on(c) test is hidden until it can do something (visibility, so the picture never jumps) */
  Ctl.prototype.syncBar = function () {
    var self = this;
    (this.barDefs || []).forEach(function (b) {
      var btn = self.bar.querySelector('[data-b="' + b.id + '"]');
      if (!btn) return;
      var on = !b.on || !!b.on(self);
      btn.style.visibility = on ? '' : 'hidden';
      btn.disabled = !on;
      btn.setAttribute('aria-hidden', on ? 'false' : 'true');
    });
  };
  Ctl.prototype.changed = function () {
    this.syncBar();
    this.placeRing();
    var w = this.waiters; this.waiters = [];
    w.forEach(function (f) { f(); });
  };
  Ctl.prototype.wait = function () { var self = this; return new Promise(function (r) { if (self.dead) r(); else self.waiters.push(r); }); };
  Ctl.prototype.destroy = function () {
    if (this.dead) return;
    this.dead = true;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.offs.forEach(function (f) { f(); }); this.offs = [];
    var w = this.waiters; this.waiters = []; w.forEach(function (f) { f(); });
    if (this.el.__tmCtl === this) { this.el.innerHTML = ''; delete this.el.__tmCtl; }
  };
  Ctl.prototype.pt = function (e) {
    var m = this.svg.getScreenCTM();
    if (!m) return { x: 0, y: 0 };
    var p = this.svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY;
    p = p.matrixTransform(m.inverse());
    return { x: p.x, y: p.y };
  };
  Ctl.prototype.toClient = function (p) {
    var m = this.svg.getScreenCTM();
    return { x: m.a * p.x + m.c * p.y + m.e, y: m.b * p.x + m.d * p.y + m.f };
  };
  Ctl.prototype.find = function (sel) { return this.root.querySelector(sel); };
  /* events: taps on [data-tap] (click), drags on [data-drag] (pointer + capture), buttons on [data-b] */
  Ctl.prototype.wire = function () {
    var self = this, svg = this.svg, st = null;
    this.on(svg, 'click', function (e) {
      if (self.dead) return;
      var t = e.target && e.target.closest ? e.target.closest('[data-tap]') : null;
      var fresh = self.downPt && Date.now() - self.downAt < 1500;
      /* Chrome touch can also move the click onto a spot that is not a tap target at all (for example the
         middle of the clock). Then look again at the real finger point saved at pointerdown. */
      if (!t && fresh && self.downCl && document.elementFromPoint) {
        var el = document.elementFromPoint(self.downCl.x, self.downCl.y);
        t = el && el.closest && self.svg.contains(el) ? el.closest('[data-tap]') : null;
      }
      if (!t || t.closest('[data-drag]') || !self.B.tap) { self.downPt = null; return; }
      var id = t.getAttribute('data-tap');
      /* Chrome on a touch screen moves a tap's click point toward the nearest tap target ("touch adjustment").
         On the clock that pulled a tap on the short hand over to the long hand. So we choose the hand from the
         real finger point, saved at pointerdown, and only use the click point for a mouse or keyboard click. */
      var p = fresh ? self.downPt : self.pt(e);
      self.downPt = null;
      if (self.B.pick) id = self.B.pick(self, id, p);
      self.B.tap(self, id, t);
    });
    this.on(svg, 'pointerdown', function (e) {
      if (self.dead) return;
      self.lastPt = self.pt(e);
      self.downPt = self.lastPt; self.downAt = Date.now(); self.downCl = { x: e.clientX, y: e.clientY };
      if (st) return;
      var t = e.target && e.target.closest ? e.target.closest('[data-drag]') : null;
      if (!t) return;
      if (self.B.pick) { var pid = self.B.pick(self, t.getAttribute('data-drag'), self.lastPt); if (pid !== t.getAttribute('data-drag')) t = self.find('[data-drag="' + pid + '"]') || t; }
      e.preventDefault();
      try { svg.setPointerCapture(e.pointerId); } catch (er) { }
      var p = self.pt(e);
      st = { id: t.getAttribute('data-drag'), el: t, p0: p, moved: false, pid: e.pointerId };
      if (self.B.drag) self.B.drag(self, 'down', st, p, 0, 0);
    });
    this.on(svg, 'pointermove', function (e) {
      if (!st || e.pointerId !== st.pid) return;
      e.preventDefault();
      var p = self.pt(e), dx = p.x - st.p0.x, dy = p.y - st.p0.y;
      if (!st.moved && Math.hypot(dx, dy) > 5) st.moved = true;
      if (st.moved && self.B.drag) self.B.drag(self, 'move', st, p, dx, dy);
    });
    var up = function (e) {
      if (!st || e.pointerId !== st.pid) return;
      var p = self.pt(e), s0 = st; st = null;
      try { svg.releasePointerCapture(e.pointerId); } catch (er) { }
      if (s0.moved) { if (self.B.drag) self.B.drag(self, 'up', s0, p, p.x - s0.p0.x, p.y - s0.p0.y); }
      else {
        if (self.B.drag) self.B.drag(self, 'cancel', s0, p, 0, 0);
        if (self.B.tap) self.B.tap(self, s0.id, s0.el);
      }
    };
    this.on(svg, 'pointerup', up);
    this.on(svg, 'pointercancel', up);
    this.on(this.bar, 'click', function (e) {
      var b = e.target && e.target.closest ? e.target.closest('[data-b]') : null;
      if (!b || self.dead || !self.B.button) return;
      self.B.button(self, b.getAttribute('data-b'));
    });
  };
  /* the pulsing ring that shows Marie where to act during a lesson */
  Ctl.prototype.ring = function (sel) {
    var prevBtn = this.bar.querySelector('.tm-hl');
    if (prevBtn) prevBtn.classList.remove('tm-hl');
    this.ringSel = sel;
    if (sel) {
      var t = this.find(sel);
      if (t && t.tagName === 'BUTTON') { t.classList.add('tm-hl'); try { this.api.highlight(t); } catch (e) { } }
    }
    this.placeRing();
  };
  Ctl.prototype.placeRing = function () {
    if (this.dead) return;
    var old = this.svg.querySelector('.tm-ring');
    if (old) old.parentNode.removeChild(old);
    if (!this.ringSel) return;
    var t = this.find(this.ringSel);
    if (!t) return;
    if (t.tagName === 'BUTTON') { if (!t.classList.contains('tm-hl')) t.classList.add('tm-hl'); return; }
    var hit = t.querySelector ? (t.querySelector('[data-hit]') || t) : t;
    var r = hit.getBoundingClientRect(), m = this.svg.getScreenCTM();
    if (!m || !r.width) return;
    var a = this.pt({ clientX: r.left, clientY: r.top }), b = this.pt({ clientX: r.right, clientY: r.bottom });
    var g = document.createElementNS(NS, 'g');
    g.setAttribute('class', 'tm-ring');
    var x = a.x - 5, y = a.y - 5, w = b.x - a.x + 10, h = b.y - a.y + 10, rx = Math.min(18, w / 2, h / 2);
    g.innerHTML = '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + rx + '" fill="none" stroke="' + C.ink + '" stroke-width="9"/>' +
      '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + rx + '" fill="none" stroke="' + C.sun + '" stroke-width="5"/>';
    this.svg.appendChild(g);
  };
  Ctl.prototype.next = function () { return this.dead ? null : this.B.next(this); };
  /* screen points for a step (used by the Playwright test) */
  Ctl.prototype.clientAction = function (a) {
    if (!a) return null;
    var t = this.find(a.sel), out = { kind: a.kind, say: a.say };
    if (t) { var hit = t.querySelector ? (t.querySelector('[data-hit]') || t) : t; var r = hit.getBoundingClientRect(); out.x = r.left + r.width / 2; out.y = r.top + r.height / 2; out.w = r.width; out.h = r.height; }
    var self = this;
    if (a.from) { var f = this.toClient(a.from); out.x = f.x; out.y = f.y; }
    if (a.to) { var to = this.toClient(a.to); out.x2 = to.x; out.y2 = to.y; }
    if (a.pts) out.pts = a.pts.map(function (p) { return self.toClient(p); });
    return out;
  };
  /* smooth move of a number from a to b, calling fn(v) each frame */
  Ctl.prototype.tween = function (from, to, ms, fn, done) {
    var self = this, t0 = null;
    if (this.raf) cancelAnimationFrame(this.raf);
    var step = function (ts) {
      if (self.dead) return;
      if (t0 === null) t0 = ts;
      var k = Math.min(1, (ts - t0) / ms), e = 1 - Math.pow(1 - k, 3);
      fn(from + (to - from) * e);
      if (k < 1) self.raf = requestAnimationFrame(step); else { self.raf = 0; if (done) done(); }
    };
    this.raf = requestAnimationFrame(step);
  };

  function mountQ(el, Q, api) {
    var ctl = new Ctl(el, Q, api);
    return { destroy: function () { ctl.destroy(); }, reset: function () { ctl.reset(); } };
  }

  /* the guided lesson: reset the picture, then say each step and wait until Marie has done it */
  function teachQ(Q, el, api) {
    var ctl = el.__tmCtl;
    if (!ctl || ctl.dead || ctl.Q.key !== Q.key) { mountQ(el, Q, api); ctl = el.__tmCtl; }
    ctl.reset();
    ctl.teaching = true;
    var B = ctl.B, intro = (B.intro ? B.intro(Q) : 'Let\'s do it together.');
    return (async function () {
      var first = true, said = null, pre = null;
      ctl.spoke = null;
      while (!ctl.dead) {
        var a = ctl.next();
        if (!a) break;
        if (a.kind !== 'wait' && (a.say !== said || pre)) {
          said = a.say;
          ctl.say((first ? intro + ' ' : '') + (pre ? pre + ' ' : '') + a.say);
          first = false;
        }
        ctl.spoke = null;
        ctl.ring(a.kind === 'wait' ? null : a.sel);
        await ctl.wait();
        pre = ctl.spoke; ctl.spoke = null;
      }
      if (!ctl.dead) { ctl.ring(null); ctl.teaching = false; ctl.say((pre ? pre + ' ' : '') + B.outro(Q)); }
    })();
  }

  /* ================================================================
     LENGTH
     ================================================================ */
  var BUILD = {};
  var RIB = { pink: { fill: C.pink, name: 'pink', label: 'Pink' }, mint: { fill: C.mint, name: 'green', label: 'Green' } };
  function ribbonShape(w, fill, h, tag) {
    h = h || 34;
    return '<rect x="0" y="' + (-h / 2 + 4) + '" width="' + w + '" height="' + h + '" rx="10" fill="' + C.ink + '"/>' +
      '<rect data-tm="' + (tag || 'ribbon') + '" x="0" y="' + (-h / 2) + '" width="' + w + '" height="' + h + '" rx="10" fill="' + fill + '" ' + SK + '/>' +
      '<rect x="7" y="' + (-h / 2 + 5) + '" width="' + Math.max(0, w - 14) + '" height="6" rx="3" fill="#fff" opacity=".5" pointer-events="none"/>';
  }

  /* level 1: longer or shorter, with a start line */
  var CMP = { U: 34, X0: 46, Y: { pink: 104, mint: 200 } };
  BUILD.cmp = {
    vb: function () { return [400, 270]; },
    init: function (c) { var d = c.Q.data; c.s = { x: { pink: d.offA, mint: d.offB } }; },
    draw: function (c) {
      var d = c.Q.data, o = '';
      o += '<rect x="' + (CMP.X0 - 8) + '" y="40" width="8" height="206" rx="4" fill="' + C.ink + '"/>';
      o += txt(CMP.X0 - 4, 30, 'Start', 20, C.ink);
      [['pink', d.a], ['mint', d.b]].forEach(function (r) {
        var id = r[0], len = r[1], x = CMP.X0 + c.s.x[id] * CMP.U;
        o += '<g data-drag="' + id + '" transform="translate(' + x + ' ' + CMP.Y[id] + ')"><rect data-hit="1" x="-6" y="-33" width="' + (len * CMP.U + 12) + '" height="66" fill="transparent"/>' + ribbonShape(len * CMP.U, RIB[id].fill, 38) + '</g>';
      });
      return o;
    },
    drag: function (c, ph, st, p, dx) {
      var id = st.id, len = id === 'pink' ? c.Q.data.a : c.Q.data.b, maxOff = (392 - CMP.X0) / CMP.U - len;
      if (ph === 'down') st.x0 = c.s.x[id];
      if (ph === 'move') {
        c.s.x[id] = clamp(st.x0 + dx / CMP.U, 0, maxOff);
        st.el.setAttribute('transform', 'translate(' + (CMP.X0 + c.s.x[id] * CMP.U) + ' ' + CMP.Y[id] + ')');
        c.placeRing();
      }
      if (ph === 'up') {
        if (c.s.x[id] < 0.35) { c.s.x[id] = 0; c.tone([660, 880], 0.12); }
        c.render(); c.changed();
      }
    },
    next: function (c) {
      var ids = ['pink', 'mint'];
      for (var i = 0; i < 2; i++) {
        var id = ids[i], off = c.s.x[id];
        if (off > 0.001) {
          var fx = CMP.X0 + off * CMP.U + 30;
          return { kind: 'drag', sel: '[data-drag="' + id + '"]', from: { x: fx, y: CMP.Y[id] }, to: { x: fx - off * CMP.U - 8, y: CMP.Y[id] }, say: 'Slide the ' + RIB[id].name + ' ribbon to the start line.' };
        }
      }
      return null;
    },
    hint: function (Q, tries) { return tries < 3 ? 'Slide both ribbons to the start line. Then look at the other ends.' : 'Both ribbons must touch the start line. Then the one that goes further is longer.'; },
    outro: function (Q) { return Q.data.ask === 'longer' ? 'Now both start at the same line. Look at the other ends. Which one goes further?' : 'Now both start at the same line. Look at the other ends. Which one stops first?'; }
  };

  /* level 2: cubes or paper clips laid end to end */
  function unitGeom(n) { var U = Math.min(42, Math.floor(330 / (n + 2.2))); return { U: U, X0: 22, RY: 176, RH: 30 }; }
  function cubeAt(x, y, U, i, tag) {
    var f = CANDY[i % 5];
    return '<rect x="' + x + '" y="' + (y + 3) + '" width="' + U + '" height="' + U + '" rx="' + Math.round(U * 0.18) + '" fill="' + C.ink + '"/>' +
      '<rect data-tm="' + (tag || 'unit') + '" x="' + x + '" y="' + y + '" width="' + U + '" height="' + U + '" rx="' + Math.round(U * 0.18) + '" fill="' + f + '" ' + SK + '/>' +
      '<rect x="' + (x + U * 0.18) + '" y="' + (y + U * 0.14) + '" width="' + (U * 0.64) + '" height="' + (U * 0.2) + '" rx="' + (U * 0.1) + '" fill="#fff" opacity=".55"/>';
  }
  function clipAt(x, y, U, tag, col) {
    var h = Math.round(U * 0.46), cy = y + U - h / 2 - 2, L = x + 3 + h / 2, R = x + U - 3 - h * 0.32;
    var p = 'M' + R + ' ' + (cy - h / 2) + ' H' + L + ' A' + (h / 2) + ' ' + (h / 2) + ' 0 0 0 ' + L + ' ' + (cy + h / 2) + ' H' + R + ' A' + (h * 0.32) + ' ' + (h * 0.32) + ' 0 0 0 ' + R + ' ' + (cy - h * 0.14) + ' H' + (L + h * 0.1);
    return '<rect data-tm="' + (tag || 'unit') + '" x="' + x + '" y="' + (cy - h / 2) + '" width="' + U + '" height="' + h + '" fill="transparent"/>' +
      '<path d="' + p + '" fill="none" stroke="' + C.ink + '" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="' + p + '" fill="none" stroke="' + (col || C.lilac) + '" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>';
  }
  BUILD.units = {
    vb: function () { return [400, 262]; },
    init: function (c) { c.s = { k: 0 }; },
    draw: function (c) {
      var d = c.Q.data, g = unitGeom(d.n), o = '', U = g.U, top = g.RY - g.RH / 2;
      o += '<g transform="translate(' + g.X0 + ' ' + g.RY + ')">' + ribbonShape(d.n * U, C.pink, g.RH) + '</g>';
      for (var i = 0; i < c.s.k; i++) {
        var x = g.X0 + i * U;
        /* no number on a cube: the first five are pink, the next five blue, so she can count 5 and on */
        o += d.unit === 'clip' ? clipAt(x, top - U - 2, U, 'unit', five(i) ? C.skyD : C.pinkD) : cubeAt(x, top - U - 2, U, five(i));
      }
      /* the box of cubes or clips */
      o += '<g data-tap="box"><rect data-hit="1" x="296" y="194" width="100" height="66" fill="transparent"/>' + card(300, 206, 90, 46, 12, C.sky);
      o += d.unit === 'clip' ? clipAt(318, 186, 26, 'deco') + clipAt(346, 186, 26, 'deco') : cubeAt(316, 186, 22, 0, 'deco') + cubeAt(340, 186, 22, 2, 'deco') + cubeAt(364, 186, 22, 4, 'deco');
      o += txt(345, 237, 'Tap', 20, C.ink) + '</g>';
      return o;
    },
    bar: function () { var some = function (c) { return c.s.k > 0; }; return [{ id: 'off', label: 'One less', aria: 'Take one off', on: some }, { id: 'again', label: 'Start again', on: some }]; },
    tap: function (c, id) {
      if (id !== 'box') return;
      if (c.s.k >= c.Q.data.n + 3) { c.say('There is no more room.'); return; }
      c.s.k++; c.tone([520 + c.s.k * 30], 0.1); c.render(); c.changed();
    },
    button: function (c, id) {
      if (id === 'off' && c.s.k > 0) c.s.k--;
      if (id === 'again') c.s.k = 0;
      c.render(); c.changed();
    },
    next: function (c) {
      var d = c.Q.data, w = d.unit === 'clip' ? 'paper clip' : 'cube';
      if (c.s.k < d.n) return { kind: 'tap', sel: '[data-tap="box"]', say: c.s.k === 0 ? 'Tap the box. Lay a ' + w + ' at the start of the ribbon.' : 'Tap the box again. Lay one more ' + w + ' at the end.' };
      if (c.s.k > d.n) return { kind: 'tap', sel: '[data-b="off"]', say: 'Too many. Take one off.' };
      return null;
    },
    hint: function (Q) { var w = Q.data.unit === 'clip' ? 'paper clips' : 'cubes'; return 'Lay ' + w + ' along the ribbon, from one end to the other end. No gaps. Then count them.'; },
    outro: function (Q) { return 'The ' + (Q.data.unit === 'clip' ? 'paper clips' : 'cubes') + ' reach the end of the ribbon. Count them. Type how many.'; }
  };

  /* level 3: one cube, moved along step by step.
     The cube starts on the table, left of the ribbon (p = 0). Her first tap puts it on spot 1; each tap after that moves it one spot. */
  function iterGeom(n) { var U = Math.min(48, Math.floor(330 / (n + 2.6))); return { U: U, X0: 22 + U + 10, T0: 18, RY: 170, RH: 30 }; }
  BUILD.iter = {
    vb: function () { return [400, 250]; },
    init: function (c) { c.s = { p: 0 }; },
    draw: function (c) {
      var d = c.Q.data, g = iterGeom(d.n), U = g.U, o = '', top = g.RY - g.RH / 2;
      o += '<g transform="translate(' + g.X0 + ' ' + g.RY + ')">' + ribbonShape(d.n * U, C.mint, g.RH) + '</g>';
      for (var i = 1; i < c.s.p; i++) {
        var mx = g.X0 + i * U;
        o += '<line x1="' + mx + '" y1="' + (top - 10) + '" x2="' + mx + '" y2="' + (top + g.RH + 10) + '" stroke="' + C.lilacD + '" stroke-width="3.5" stroke-linecap="round"/>';
      }
      /* one dot under each spot the cube has used: a mark, not a number */
      for (var j = 1; j <= c.s.p; j++) o += dot(g.X0 + (j - 0.5) * U, top + g.RH + 20, Math.min(8, U / 4), j === c.s.p ? C.sun : (five(j - 1) ? C.sky : C.pink));
      var cx = c.s.p === 0 ? g.T0 : g.X0 + (c.s.p - 1) * U, cy = c.s.p === 0 ? top + g.RH - U : top - U - 2, hw = Math.max(U, 66);
      o += '<g data-tap="cube"><rect data-hit="1" x="' + (cx + U / 2 - hw / 2) + '" y="' + (cy + U / 2 - hw / 2) + '" width="' + hw + '" height="' + hw + '" fill="transparent"/>' + cubeAt(cx, cy, U, 0, 'unit') + '</g>';
      if (c.s.p > 0) o += '<path d="M' + (cx + U + 6) + ' ' + (cy + U / 2) + ' h14 m-6 -6 l6 6 l-6 6" fill="none" stroke="' + C.ink + '" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" pointer-events="none"/>';
      return o;
    },
    bar: function () { return [{ id: 'back', label: 'Back', aria: 'Back one step', on: function (c) { return c.s.p > 0; } }, { id: 'again', label: 'Start again', on: function (c) { return c.s.p > 0; } }]; },
    tap: function (c, id) {
      if (id !== 'cube') return;
      if (c.s.p >= c.Q.data.n + 2) { c.say('That is past the end of the ribbon.'); return; }
      c.s.p++; c.tone([520 + c.s.p * 30], 0.1); c.render(); c.changed();
    },
    button: function (c, id) { if (id === 'back' && c.s.p > 0) c.s.p--; if (id === 'again') c.s.p = 0; c.render(); c.changed(); },
    next: function (c) {
      var n = c.Q.data.n;
      if (c.s.p < n) return { kind: 'tap', sel: '[data-tap="cube"]', say: c.s.p === 0 ? 'Tap the cube. Put it at the start of the ribbon.' : 'Tap the cube. Move it one more step.' };
      if (c.s.p > n) return { kind: 'tap', sel: '[data-b="back"]', say: 'Too far. Go back one.' };
      return null;
    },
    hint: function () { return 'Tap the cube to put it at the start. Then tap it to move it one cube-length at a time. Count each spot until you reach the end.'; },
    outro: function () { return 'The cube reached the end. How many spots did it use? Count them.'; }
  };

  /* level 4: the centimetre ruler */
  /* The picture is RW wide. The ruler is 1 cm longer than the ribbon (at least 8 cm) and always fits inside the picture,
   with room to start it away from the ribbon. lo/hi are the furthest left and right spots for the ruler's 0. */
  var RW = 420, RPAD = 16;
  function rulerGeom(len) { var R = Math.max(len + 1, 8); var u = Math.min(40, (RW - 2 * RPAD - 6) / (R + 1.6)); return { R: R, u: u, RY: 86, RH: 30, TY: 134, TH: 78, lo: RPAD + 2, hi: RW - RPAD - 2 - R * u }; }
  BUILD.ruler = {
    vb: function () { return [RW, 246]; },
    init: function (c) { var d = c.Q.data; c.s = { rx: d.rx, end: false }; },
    draw: function (c) {
      var d = c.Q.data, g = rulerGeom(d.len), u = g.u, o = '', gid = c.gid;
      o += '<defs><linearGradient id="' + gid + 'w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffdcae"/><stop offset="1" stop-color="#eaa968"/></linearGradient></defs>';
      o += '<g transform="translate(' + d.rl + ' ' + g.RY + ')">' + ribbonShape(d.len * u, C.pink, g.RH) + '</g>';
      /* the ruler */
      var w = g.R * u;
      o += '<g data-drag="ruler" transform="translate(' + c.s.rx + ' ' + g.TY + ')">';
      o += '<rect x="-' + RPAD + '" y="4" width="' + (w + 2 * RPAD) + '" height="' + g.TH + '" rx="10" fill="' + C.ink + '"/>';
      o += '<rect data-hit="1" x="-' + RPAD + '" y="0" width="' + (w + 2 * RPAD) + '" height="' + g.TH + '" rx="10" fill="url(#' + gid + 'w)" ' + SK + '/>';
      /* every second group of 5 cm is shaded, so she can see the fives and count on */
      for (var b5 = 5; b5 < g.R; b5 += 10) o += '<rect x="' + (b5 * u) + '" y="2" width="' + (Math.min(5, g.R - b5) * u) + '" height="' + (g.TH - 4) + '" fill="#fff" opacity=".38" pointer-events="none"/>';
      for (var i = 0; i <= g.R; i++) {
        var big = i % 5 === 0;
        o += '<line data-tm="tick" data-n="' + i + '" x1="' + (i * u) + '" y1="0" x2="' + (i * u) + '" y2="' + (big ? 32 : 22) + '" stroke="' + C.ink + '" stroke-width="' + (big ? 3.5 : 2.5) + '"/>';
        if (i < g.R) o += '<line x1="' + ((i + 0.5) * u) + '" y1="0" x2="' + ((i + 0.5) * u) + '" y2="11" stroke="' + C.ink + '" stroke-width="1.6"/>';
        /* only the landmarks 0, 5, 10, 15 have numbers; she counts the centimetres in between */
        if (i === 0) o += '<circle cx="0" cy="48" r="15" fill="' + C.pink + '" stroke="' + C.ink + '" stroke-width="2.5"/>' + outlined(0, 55, '0', 20, '#fff');
        else if (big) o += txt(i * u, 56, String(i), 21, C.ink);
      }
      o += txt(w + 2, 72, 'cm', 15, C.soft, 'end');
      o += '</g>';
      /* the far end of the ribbon: tap it to look down to the ruler */
      var ex = d.rl + d.len * u;
      if (c.s.end) o += '<line x1="' + ex + '" y1="' + (g.RY - 22) + '" x2="' + ex + '" y2="' + (g.TY + 28) + '" stroke="' + C.pinkD + '" stroke-width="3" stroke-dasharray="6 5" pointer-events="none"/>';
      o += '<g data-tap="end"><rect data-hit="1" x="' + (ex - 34) + '" y="' + (g.RY - 70) + '" width="68" height="68" rx="16" fill="transparent"/><path d="M' + (ex - 11) + ' ' + (g.RY - 42) + ' h22 l-11 16 z" fill="' + C.sun + '" ' + SK + '/></g>';
      return o;
    },
    drag: function (c, ph, st, p, dx) {
      var d = c.Q.data, g = rulerGeom(d.len);
      if (ph === 'down') st.x0 = c.s.rx;
      if (ph === 'move') {
        var x = clamp(st.x0 + dx, g.lo, Math.max(g.hi, d.rl));
        if (Math.abs(x - d.rl) < g.u * 0.45) x = d.rl;
        c.s.rx = x;
        st.el.setAttribute('transform', 'translate(' + x + ' ' + g.TY + ')');
        c.placeRing();
      }
      if (ph === 'up') { if (c.s.rx === d.rl) c.tone([660, 880], 0.12); c.render(); c.changed(); }
    },
    tap: function (c, id) { if (id === 'end') { c.s.end = true; c.tone([700], 0.1); c.render(); c.changed(); } },
    next: function (c) {
      var d = c.Q.data, g = rulerGeom(d.len);
      if (c.s.rx !== d.rl) {
        var fx = clamp(c.s.rx + g.u * 1.5, 40, RW - 40), fy = g.TY + 40;
        return { kind: 'drag', sel: '[data-drag="ruler"]', from: { x: fx, y: fy }, to: { x: fx + (d.rl - c.s.rx), y: fy }, say: 'Slide the ruler. Put the 0 at the start of the ribbon, on the left.' };
      }
      if (!c.s.end) return { kind: 'tap', sel: '[data-tap="end"]', say: 'Tap the yellow arrow at the other end of the ribbon.' };
      return null;
    },
    hint: function (Q, tries) { return tries < 3 ? 'Slide the ruler so the 0 is at the start of the ribbon, on the left. Then count the centimetres to the other end.' : 'First line up 0 with the start of the ribbon. Find the big number just before the end. Count on, one centimetre at a time.'; },
    intro: function () { return 'Let\'s measure together.'; },
    outro: function () { return 'Find the big number just before the end. Count on, one centimetre at a time. How long is the ribbon? Type it.'; }
  };

  /* referent cards for choosing a unit */
  var REF = {
    cm: { draw: 'finger', big: 'cm', small: 'finger', say: 'One centimetre is about as wide as your finger.' },
    m: { draw: 'step', big: 'm', small: 'grown-up step', say: 'One metre is about one big step of a grown-up.' },
    km: { draw: 'road', big: 'km', small: 'long walk', say: 'One kilometre is a long walk. It takes about 15 minutes.' },
    g: { draw: 'clip', big: 'g', small: 'paper clip', say: 'One gram is very light, like a paper clip.' },
    kg: { draw: 'flour', big: 'kg', small: 'bag of flour', say: 'One kilogram is heavy, like a bag of flour.' },
    mL: { draw: 'drop', big: 'mL', small: 'tiny bit', say: 'One millilitre is a tiny bit. Less than a spoonful.' },
    L: { draw: 'bottle', big: 'L', small: 'big bottle', say: 'One litre fills a big water bottle.' }
  };
  var UNIT_SETS = { len2: ['cm', 'm'], len: ['cm', 'm', 'km'], mass: ['g', 'kg'], cap: ['mL', 'L'] };
  BUILD.unitpick = {
    vb: function () { return [400, 262]; },
    init: function (c) { c.s = { seen: {} }; },
    draw: function (c) {
      var d = c.Q.data, o = '', units = UNIT_SETS[d.set], n = units.length;
      o += card(12, 18, 156, 224, 20, C.paper);
      o += thing(c.api, d.item, 26, 30, 128);
      o += txt(90, 196, d.item.short, 22, C.ink);
      var gap = 12, h = (224 - gap * (n - 1)) / n;
      units.forEach(function (u, i) {
        var y = 18 + i * (h + gap), R = REF[u], seen = !!c.s.seen[u], s = Math.min(h - 18, 64);
        o += '<g data-tap="' + u + '">' + card(184, y, 204, h, 18, seen ? C.sunT : C.paper, 'data-hit="1"');
        o += drawing(R.draw, 196, y + (h - s) / 2, s);
        o += outlined(196 + s + 48, y + h / 2 + (n === 3 ? 4 : 2), R.big, n === 3 ? 36 : 44, CANDY[i === 0 ? 0 : i === 1 ? 4 : 3]);
        o += txt(196 + s + 48, y + h / 2 + (n === 3 ? 24 : 32), R.small, 15, C.soft);
        o += '</g>';
      });
      return o;
    },
    tap: function (c, id) {
      if (!REF[id]) return;
      c.s.seen[id] = true; c.say(REF[id].say); c.tone([600, 760], 0.1); c.render(); c.changed();
    },
    next: function (c) {
      var units = UNIT_SETS[c.Q.data.set];
      for (var i = 0; i < units.length; i++) if (!c.s.seen[units[i]]) return { kind: 'tap', sel: '[data-tap="' + units[i] + '"]', say: 'Tap ' + units[i] + '. Listen to how big it is.' };
      return null;
    },
    hint: function (Q) {
      if (Q.data.set === 'len2') return 'Think about the size. As small as a finger? Use cm. About a big step or more? Use m.';
      if (Q.data.set === 'len') return 'Think about the size. As small as a finger? Use cm. About a big step or more? Use m. Very far away? Use km.';
      if (Q.data.set === 'mass') return 'Lighter than a bag of flour? Use g. Heavier? Use kg.';
      return 'Smaller than a big water bottle? Use mL. Bigger? Use L.';
    },
    outro: function (Q) {
      if (Q.data.set === 'len2') return 'Now think. Is ' + Q.data.item.the + ' small like a finger, or big like steps?';
      if (Q.data.set === 'len') return 'Now think. Is ' + Q.data.item.the + ' small like a finger, big like steps, or far like a long walk?';
      if (Q.data.set === 'mass') return 'Now think. Is ' + Q.data.item.the + ' lighter or heavier than a bag of flour?';
      return 'Now think. Is ' + Q.data.item.the + ' smaller or bigger than a big water bottle?';
    }
  };

  /* ================================================================
     MASS AND CAPACITY
     ================================================================ */
  var MASS = { /* grams, rough real values */
    balloon: { name: 'Balloon', g: 3 }, candy: { name: 'Candy', g: 6 }, cherries: { name: 'Cherries', g: 12 }, strawberry: { name: 'Strawberry', g: 14 },
    cookie: { name: 'Cookie', g: 20 }, egg: { name: 'Egg', g: 60 }, cake: { name: 'Cake', g: 150 }, teddy: { name: 'Teddy', g: 300 },
    honey: { name: 'Honey', g: 500 }, teapot: { name: 'Teapot', g: 1000 }, books: { name: 'Books', g: 1500 }
  };
  var PAN = { cx: 200, py: 92, arm: 118, drop: 74 };
  var TABLE = { left: 14, right: 316, y: 196 };
  function reducedMotion() { try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; } }
  BUILD.balance = {
    vb: function () { return [400, 280]; },
    /* the pans start empty and level; both things wait on the table. Marie drags or taps each one onto its pan. */
    init: function (c) { c.s = { on: { left: false, right: false }, ang: 0, swing: false, ghost: null }; },
    massOf: function (c, side) { return c.s.on[side] ? MASS[c.Q.data[side]].g : 0; },
    target: function (c) { var L = this.massOf(c, 'left'), R = this.massOf(c, 'right'); return L === R ? 0 : (R > L ? 14 : -14); },
    panAt: function (c, side) { var a = c.s.ang * Math.PI / 180, sg = side === 'left' ? -1 : 1; return { x: PAN.cx + sg * PAN.arm * Math.cos(a), y: PAN.py + sg * PAN.arm * Math.sin(a) + PAN.drop }; },
    draw: function (c) {
      var d = c.Q.data, o = '', a = c.s.ang * Math.PI / 180, gh = c.s.ghost;
      /* stand */
      o += '<path d="M150 262 L250 262 L230 236 L170 236 Z" fill="' + C.lilac + '" ' + SK + '/>';
      o += '<rect x="193" y="' + PAN.py + '" width="14" height="142" rx="6" fill="' + C.lilacT + '" ' + SK + '/>';
      var ends = [-1, 1].map(function (s) { return { x: PAN.cx + s * PAN.arm * Math.cos(a), y: PAN.py + s * PAN.arm * Math.sin(a) }; });
      /* pans hang straight down from the ends */
      ['left', 'right'].forEach(function (side, i) {
        var e = ends[i], py = e.y + PAN.drop;
        o += '<path d="M' + e.x + ' ' + e.y + ' L' + (e.x - 44) + ' ' + py + ' M' + e.x + ' ' + e.y + ' L' + (e.x + 44) + ' ' + py + '" stroke="' + C.ink + '" stroke-width="2.5"/>';
        o += '<path data-pan="' + side + '" d="M' + (e.x - 54) + ' ' + py + ' H' + (e.x + 54) + ' Q' + (e.x + 50) + ' ' + (py + 22) + ' ' + e.x + ' ' + (py + 22) + ' Q' + (e.x - 50) + ' ' + (py + 22) + ' ' + (e.x - 54) + ' ' + py + ' Z" fill="' + C.sun + '" ' + SK + '/>';
        if (c.s.on[side] && !(gh && gh.side === side)) o += '<g data-drag="' + side + '" data-on="1"><rect data-hit="1" x="' + (e.x - 34) + '" y="' + (py - 66) + '" width="68" height="68" fill="transparent"/>' + artImg(c.api, d[side], e.x - 32, py - 62, 64) + '</g>';
      });
      /* beam on top */
      o += '<line x1="' + ends[0].x + '" y1="' + ends[0].y + '" x2="' + ends[1].x + '" y2="' + ends[1].y + '" stroke="' + C.ink + '" stroke-width="15" stroke-linecap="round"/>';
      o += '<line x1="' + ends[0].x + '" y1="' + ends[0].y + '" x2="' + ends[1].x + '" y2="' + ends[1].y + '" stroke="' + C.pink + '" stroke-width="9" stroke-linecap="round"/>';
      o += '<circle cx="' + PAN.cx + '" cy="' + PAN.py + '" r="11" fill="' + C.sun + '" ' + SK + '/>';
      o += '<path d="M200 ' + (PAN.py - 16) + ' V' + (PAN.py - 34) + '" stroke="' + C.ink + '" stroke-width="4" stroke-linecap="round"/>';
      /* things waiting on the table */
      ['left', 'right'].forEach(function (side) {
        var x = TABLE[side];
        if (!c.s.on[side] && !(gh && gh.side === side)) o += '<g data-drag="' + side + '">' + card(x, TABLE.y, 70, 66, 16, C.cream, 'data-hit="1"') + artImg(c.api, d[side], x + 5, TABLE.y + 2, 60) + '</g>';
      });
      o += '<rect x="0" y="266" width="400" height="14" fill="' + C.wood + '"/><line x1="0" y1="266" x2="400" y2="266" stroke="' + C.ink + '" stroke-width="3"/>';
      /* the thing she is dragging follows her finger */
      if (gh) o += '<g pointer-events="none">' + artImg(c.api, d[gh.side], gh.x - 34, gh.y - 34, 68) + '</g>';
      return o;
    },
    /* put a thing on its pan, or take it off; then the beam swings until it settles */
    put: function (c, side, on) {
      if (c.s.on[side] === on) { c.render(); c.changed(); return; }
      c.s.on[side] = on;
      c.tone(on ? [520, 660] : [440], 0.1);
      this.swing(c, side);
    },
    swing: function (c, side) {
      var to = this.target(c), from = c.s.ang;
      if (c.raf) { cancelAnimationFrame(c.raf); c.raf = 0; }
      if (reducedMotion()) { c.s.ang = to; c.s.swing = false; c.render(); c.changed(); return; }
      /* damped swing: it goes past the resting place, swings back, and keeps swinging smaller until it is still.
         If the heavy side does not change, the beam still wobbles a little where the thing landed. */
      var bump = Math.abs(to - from) < 0.01, t0 = null, T = 1500, amp = bump ? (side === 'left' ? -5 : 5) * (c.s.on[side] ? 1 : -1) : from - to, w = 2 * Math.PI * 1.6, tau = 0.4;
      c.s.swing = true; c.render(); c.changed();
      var step = function (ts) {
        if (c.dead) return;
        if (t0 === null) t0 = ts;
        var t = (ts - t0) / 1000;
        if (t * 1000 >= T) { c.raf = 0; c.s.ang = to; c.s.swing = false; c.render(); c.changed(); return; }
        c.s.ang = to + amp * Math.exp(-t / tau) * (bump ? Math.sin(w * t) * 1.6 : Math.cos(w * t));
        c.render();
        c.raf = requestAnimationFrame(step);
      };
      c.raf = requestAnimationFrame(step);
    },
    tap: function (c, side) {
      if (side !== 'left' && side !== 'right') return;
      this.put(c, side, !c.s.on[side]);
    },
    drag: function (c, ph, st, p) {
      var side = st.id;
      if (side !== 'left' && side !== 'right') return;
      if (ph === 'move') { c.s.ghost = { side: side, x: p.x, y: p.y }; c.render(); }
      if (ph === 'up' || ph === 'cancel') {
        c.s.ghost = null;
        if (ph === 'cancel') { c.render(); return; }
        /* dropped near its pan: it goes on. Dropped low or far away: it goes back to the table. */
        var pan = this.panAt(c, side), near = Math.abs(p.x - pan.x) < 95 && p.y > pan.y - 110 && p.y < pan.y + 45;
        if (near) this.put(c, side, true);
        else this.put(c, side, false);
      }
    },
    next: function (c) {
      var d = c.Q.data;
      if (c.s.swing) return { kind: 'wait', sel: '[data-pan="left"]', say: '' };
      if (!c.s.on.left) return { kind: 'drag', sel: '[data-drag="left"]', from: { x: TABLE.left + 35, y: TABLE.y + 33 }, to: this.panAt(c, 'left'), say: 'Put the ' + MASS[d.left].name.toLowerCase() + ' on the balance. Drag it or tap it.' };
      if (!c.s.on.right) return { kind: 'drag', sel: '[data-drag="right"]', from: { x: TABLE.right + 35, y: TABLE.y + 33 }, to: this.panAt(c, 'right'), say: 'Now put the ' + MASS[d.right].name.toLowerCase() + ' on the other side.' };
      return null;
    },
    hint: function (Q) { return 'Put both things on the balance. Wait until it stops swinging. The heavy side goes down. The light side goes up. If it stays level, they are the same.'; },
    outro: function (Q) { return Q.data.ask === 'heavier' ? 'Look at the balance. The heavy side goes down. Which one is heavier?' : 'Look at the balance. The light side goes up. Which one is lighter?'; }
  };

  /* level 4: pour a 100 mL cup into a jug.
     The jug is drawn to scale: its inside is n cup-heights tall, and one cup holds the same as one cup-height
     of the jug (cup area = jug width x JUG.u), so the picture never lies about how much the jug holds. */
  var JUG = { x: 236, w: 118, u: 19, bottom: 252 };
  function jugGeom(n) { var h = n * JUG.u + 22; return { x: JUG.x, y: JUG.bottom - h, w: JUG.w, h: h }; }
  function jugPath(g) { var x = g.x, y = g.y, w = g.w, h = g.h; return 'M' + (x - 10) + ' ' + y + ' H' + (x + w) + ' V' + (y + h - 16) + ' Q' + (x + w) + ' ' + (y + h) + ' ' + (x + w - 16) + ' ' + (y + h) + ' H' + (x + 16) + ' Q' + x + ' ' + (y + h) + ' ' + x + ' ' + (y + h - 16) + ' V' + (y + 22) + ' Z'; }
  /* the cup: 62 wide at the top, 46 at the bottom, 42 tall. Area = 54 x 42 = 2268, about 118 x 19 = 2242 */
  var CUP = 'M69 104 H131 L123 146 Q122 150 118 150 H82 Q78 150 77 146 Z';
  BUILD.jug = {
    vb: function () { return [400, 270]; },
    init: function (c) { c.s = { k: 0, pour: false }; },
    draw: function (c) {
      var d = c.Q.data, o = '', gid = c.gid, g = jugGeom(d.n), jp = jugPath(g), ih = d.n * JUG.u, lvl = c.s.k * JUG.u;
      o += '<defs><clipPath id="' + gid + 'j"><path d="' + jp + '"/></clipPath></defs>';
      /* jug */
      o += '<path d="' + jp + '" transform="translate(0 4)" fill="' + C.ink + '"/>';
      o += '<path d="' + jp + '" fill="#f3fbff"/>';
      if (lvl > 0) o += '<g clip-path="url(#' + gid + 'j)"><rect x="' + g.x + '" y="' + (g.y + g.h - 8 - lvl) + '" width="' + g.w + '" height="' + (lvl + 8) + '" fill="' + C.sky + '"/>' +
        '<rect x="' + g.x + '" y="' + (g.y + g.h - 8 - lvl) + '" width="' + g.w + '" height="5" fill="#bfe6ff"/></g>';
      o += '<path d="' + jp + '" fill="none" ' + SK + '/>';
      var ht = g.y + Math.max(12, g.h * 0.16), hh = Math.min(110, Math.max(30, g.h * 0.62)), hd = 'M' + (g.x + g.w) + ' ' + ht + ' q30 4 28 ' + (hh / 2) + ' q-2 ' + (hh * 0.42) + ' -28 ' + (hh / 2);
      o += '<path d="' + hd + '" fill="none" stroke="' + C.ink + '" stroke-width="9" stroke-linecap="round"/>';
      o += '<path d="' + hd + '" fill="none" stroke="#f3fbff" stroke-width="3" stroke-linecap="round"/>';
      /* the cup she taps */
      o += txt(100, 84, 'Tap to pour', 17, C.soft);
      o += '<g data-tap="cup"' + (c.s.pour ? ' class="tm-pour"' : '') + '><rect data-hit="1" x="40" y="92" width="120" height="98" fill="transparent"/>';
      o += '<path d="' + CUP + '" transform="translate(0 4)" fill="' + C.ink + '"/>';
      o += '<path d="' + CUP + '" fill="' + C.pink + '" ' + SK + '/>';
      o += '<path d="M73 112 H127" stroke="#fff" stroke-width="4" opacity=".55" stroke-linecap="round"/>';
      o += card(54, 160, 92, 28, 12, '#fff') + txt(100, 181, '100 mL', 19, C.ink) + '</g>';
      /* one little cup token for each pour she makes, in rows of 5. No numbers: she counts them. */
      for (var i = 0; i < c.s.k; i++) {
        var tx = 30 + (i % 5) * 30, ty = 200 + Math.floor(i / 5) * 32;
        o += '<path data-tm="mark" d="M' + tx + ' ' + ty + ' h22 l-3 22 h-16 z" fill="' + (five(i) ? C.sky : C.pink) + '" stroke="' + C.ink + '" stroke-width="2.5" stroke-linejoin="round"/>';
      }
      return o;
    },
    tap: function (c, id) {
      if (id !== 'cup') return;
      if (c.s.k >= c.Q.data.n) { c.say('The jug is full.'); c.tone([330], 0.15, 'triangle'); return; }
      c.s.k++; c.s.pour = true; c.tone([440 + c.s.k * 40, 520 + c.s.k * 40], 0.09);
      c.render(); c.changed();
      setTimeout(function () { if (!c.dead) { c.s.pour = false; c.render(); } }, 520);
    },
    bar: function () { return [{ id: 'empty', label: 'Empty', aria: 'Empty the jug', on: function (c) { return c.s.k > 0; } }]; },
    button: function (c, id) { if (id === 'empty') { c.s.k = 0; c.render(); c.changed(); } },
    next: function (c) { return c.s.k < c.Q.data.n ? { kind: 'tap', sel: '[data-tap="cup"]', say: c.s.k === 0 ? 'Tap the cup to pour it into the jug.' : 'Pour again. Count the cups.' } : null; },
    hint: function () { return 'Pour the cup into the jug until it is full. Count the cups. Each cup is one hundred millilitres, so count the cups by hundreds.'; },
    outro: function () { return 'The jug is full. Each cup is one hundred. Count the cups by hundreds. Type how many millilitres.'; }
  };

  /* ================================================================
     AREA
     ================================================================ */
  function parseShape(rows) { var cells = []; rows.forEach(function (r, y) { for (var x = 0; x < r.length; x++) if (r[x] === '#') cells.push([x, y]); }); return cells; }
  function shapeDims(cells) { var w = 0, h = 0; cells.forEach(function (c) { w = Math.max(w, c[0] + 1); h = Math.max(h, c[1] + 1); }); return [w, h]; }
  function areaGeom(cells, boxW, boxH, x0, y0, maxS) {
    var wh = shapeDims(cells), s = Math.floor(Math.min(maxS, boxW / wh[0], boxH / wh[1]));
    return { s: s, ox: x0 + (boxW - wh[0] * s) / 2, oy: y0 + (boxH - wh[1] * s) / 2, w: wh[0], h: wh[1] };
  }
  function tileAt(x, y, s, i) {
    var f = CANDY[i % 5], q = s - 4;
    return '<rect x="' + (x + 2) + '" y="' + (y + 2) + '" width="' + q + '" height="' + q + '" rx="' + Math.round(s * 0.14) + '" fill="' + f + '" ' + SK + '/>' +
      '<rect x="' + (x + s * 0.2) + '" y="' + (y + s * 0.16) + '" width="' + (s * 0.6) + '" height="' + (s * 0.16) + '" rx="' + (s * 0.08) + '" fill="#fff" opacity=".55"/>';
  }
  BUILD.tile = {
    vb: function () { return [400, 280]; },
    geom: function (c) { return areaGeom(c.Q.data.cells, 262, 240, 14, 20, 84); },
    init: function (c) { c.s = { placed: [] }; },
    draw: function (c) {
      var d = c.Q.data, g = this.geom(c), s = g.s, o = '';
      d.cells.forEach(function (cl, i) {
        var x = g.ox + cl[0] * s, y = g.oy + cl[1] * s;
        /* no lines inside the shape: Marie finds the squares herself by covering it */
        o += '<rect data-tap="c' + i + '" data-cell="' + i + '" x="' + x + '" y="' + y + '" width="' + (s + 0.5) + '" height="' + (s + 0.5) + '" fill="' + C.pinkT + '"/>';
      });
      /* one smooth outline, so the edge shows no marks where the squares meet */
      o += '<path d="' + perimeterPath(d.cells).map(function (q, k) { return (k ? 'L' : 'M') + (g.ox + q[0] * s) + ' ' + (g.oy + q[1] * s); }).join(' ') + ' Z" fill="none" stroke="' + C.ink + '" stroke-width="4" stroke-linejoin="round"/>';
      c.s.placed.forEach(function (ci, k) {
        var cl = d.cells[ci], x = g.ox + cl[0] * s, y = g.oy + cl[1] * s;
        o += '<g data-tap="t' + ci + '">' + tileAt(x, y, s, five(k)) + '</g>';
      });
      /* the pile of squares she drags from */
      var ps = Math.min(s, 56);
      o += '<g data-drag="pile"><rect data-hit="1" x="296" y="80" width="96" height="120" fill="transparent"/>' + card(300, 92, 88, 104, 16, C.cream);
      o += tileAt(318, 104, ps * 0.9, 1) + tileAt(324, 112, ps * 0.9, 2) + tileAt(330, 120, ps * 0.9, 3);
      o += txt(344, 188, 'Drag', 18, C.ink) + '</g>';
      if (c.s.ghost) o += '<g pointer-events="none" opacity=".9">' + tileAt(c.s.ghost.x - s / 2, c.s.ghost.y - s / 2, s, five(c.s.placed.length)) + '</g>';
      return o;
    },
    tap: function (c, id) {
      var i = parseInt(id.slice(1), 10);
      if (id[0] === 'c') { if (c.s.placed.indexOf(i) < 0) { c.s.placed.push(i); c.tone([520 + c.s.placed.length * 30], 0.1); } }
      else if (id[0] === 't') { c.s.placed.splice(c.s.placed.indexOf(i), 1); c.tone([380], 0.1); }
      else if (id === 'pile') { c.say('Drag a square into the shape.'); return; }
      c.render(); c.changed();
    },
    drag: function (c, ph, st, p) {
      var d = c.Q.data, g = this.geom(c);
      if (ph === 'move') { c.s.ghost = p; c.render(); }
      if (ph === 'up' || ph === 'cancel') {
        c.s.ghost = null;
        if (ph === 'up') {
          var best = -1, bd = 1e9;
          d.cells.forEach(function (cl, i) {
            if (c.s.placed.indexOf(i) >= 0) return;
            var dd = Math.hypot(g.ox + (cl[0] + 0.5) * g.s - p.x, g.oy + (cl[1] + 0.5) * g.s - p.y);
            if (dd < bd) { bd = dd; best = i; }
          });
          if (best >= 0 && bd < g.s * 0.8) { c.s.placed.push(best); c.tone([520 + c.s.placed.length * 30], 0.1); }
        }
        c.render(); c.changed();
      }
    },
    next: function (c) {
      var d = c.Q.data, g = this.geom(c);
      for (var i = 0; i < d.cells.length; i++) if (c.s.placed.indexOf(i) < 0) {
        var cl = d.cells[i];
        return { kind: 'drag', sel: '[data-cell="' + i + '"]', from: { x: 344, y: 140 }, to: { x: g.ox + (cl[0] + 0.5) * g.s, y: g.oy + (cl[1] + 0.5) * g.s }, say: c.s.placed.length === 0 ? 'Drag a square into an empty space.' : 'Drag another square. Fill the next space.' };
      }
      return null;
    },
    hint: function () { return 'Drag squares into the shape until it is all covered. No gaps. Then count the squares.'; },
    outro: function () { return 'The shape is covered. Count the squares. Type how many.'; }
  };
  /* the outline of a set of cells, drawn as boundary edges */
  function boundaryEdges(cells) {
    var has = {}, out = [];
    cells.forEach(function (c) { has[c[0] + ',' + c[1]] = 1; });
    cells.forEach(function (c) {
      var x = c[0], y = c[1];
      if (!has[x + ',' + (y - 1)]) out.push([[x, y], [x + 1, y]]);
      if (!has[(x + 1) + ',' + y]) out.push([[x + 1, y], [x + 1, y + 1]]);
      if (!has[x + ',' + (y + 1)]) out.push([[x + 1, y + 1], [x, y + 1]]);
      if (!has[(x - 1) + ',' + y]) out.push([[x, y + 1], [x, y]]);
    });
    return out;
  }
  function shapeOutline(cells, g, col, w) {
    return boundaryEdges(cells).map(function (e) {
      return '<line x1="' + (g.ox + e[0][0] * g.s) + '" y1="' + (g.oy + e[0][1] * g.s) + '" x2="' + (g.ox + e[1][0] * g.s) + '" y2="' + (g.oy + e[1][1] * g.s) + '" stroke="' + col + '" stroke-width="' + w + '" stroke-linecap="round"/>';
    }).join('');
  }
  /* clockwise walk round the outside, one square side per step, starting at the top-left corner */
  function perimeterPath(cells) {
    var edges = boundaryEdges(cells), from = {};
    edges.forEach(function (e) { from[e[0][0] + ',' + e[0][1]] = e; });
    var start = null;
    cells.forEach(function (c) { if (!start || c[1] < start[1] || (c[1] === start[1] && c[0] < start[0])) start = c; });
    var pts = [[start[0], start[1]]], cur = start[0] + ',' + start[1], guard = 0;
    do { var e = from[cur]; pts.push(e[1]); cur = e[1][0] + ',' + e[1][1]; } while (cur !== pts[0][0] + ',' + pts[0][1] && ++guard < 400);
    return pts;
  }
  BUILD.count = {
    vb: function () { return [400, 270]; },
    geom: function (c) { return areaGeom(c.Q.data.cells, 392, 262, 4, 4, 84); }, /* a tight margin, so a shape 4 squares tall still has 44px+ squares on a small phone */
    init: function (c) { c.s = { order: [] }; },
    draw: function (c) {
      var d = c.Q.data, g = this.geom(c), s = g.s, o = '';
      d.cells.forEach(function (cl, i) {
        var x = g.ox + cl[0] * s, y = g.oy + cl[1] * s, k = c.s.order.indexOf(i);
        o += '<g data-tap="q' + i + '"><rect data-hit="1" data-tm="sq" x="' + x + '" y="' + y + '" width="' + s + '" height="' + s + '" fill="' + (k >= 0 ? C.sunT : C.skyT) + '" stroke="' + C.ink + '" stroke-width="2"/>';
        if (k >= 0) o += mark(x + s / 2, y + s / 2, Math.min(12, s / 4));
        o += '</g>';
      });
      o += shapeOutline(d.cells, g, C.ink, 4.5);
      return o;
    },
    tap: function (c, id) {
      var i = parseInt(id.slice(1), 10);
      if (c.s.order.indexOf(i) >= 0) return;
      c.s.order.push(i); c.tone([500 + (c.s.order.length % 8) * 40], 0.08); c.render(); c.changed();
    },
    bar: function () { return [{ id: 'again', label: 'Count again', on: function (c) { return c.s.order.length > 0; } }]; },
    button: function (c, id) { if (id === 'again') { c.s.order = []; c.render(); c.changed(); } },
    next: function (c) {
      var d = c.Q.data;
      for (var i = 0; i < d.cells.length; i++) if (c.s.order.indexOf(i) < 0) return { kind: 'tap', sel: '[data-tap="q' + i + '"]', say: c.s.order.length === 0 ? 'Start at the top. Tap each square once.' : 'Tap the next square. Count as you go.' };
      return null;
    },
    hint: function () { return 'Tap each square once, row by row, and count as you tap.'; },
    outro: function () { return 'You counted every square. How many squares? Type it.'; }
  };
  BUILD.perim = {
    vb: function () { return [400, 280]; },
    geom: function (c) { return areaGeom(c.Q.data.cells, 316, 196, 42, 42, 84); },
    init: function (c) { c.s = { k: 0, pos: null }; },
    draw: function (c) {
      var d = c.Q.data, g = this.geom(c), s = g.s, o = '', path = perimeterPath(d.cells), P = function (p) { return { x: g.ox + p[0] * s, y: g.oy + p[1] * s }; };
      d.cells.forEach(function (cl) { o += '<rect x="' + (g.ox + cl[0] * s) + '" y="' + (g.oy + cl[1] * s) + '" width="' + s + '" height="' + s + '" fill="' + C.mintT + '" stroke="' + C.mint + '" stroke-width="2"/>'; });
      o += shapeOutline(d.cells, g, C.ink, 4);
      var cx = g.ox + g.w * s / 2, cy = g.oy + g.h * s / 2;
      for (var i = 0; i < c.s.k; i++) {
        var a = P(path[i]), b = P(path[i + 1]);
        o += '<line x1="' + a.x + '" y1="' + a.y + '" x2="' + b.x + '" y2="' + b.y + '" stroke="' + C.ink + '" stroke-width="11" stroke-linecap="round"/>';
        o += '<line x1="' + a.x + '" y1="' + a.y + '" x2="' + b.x + '" y2="' + b.y + '" stroke="' + C.pink + '" stroke-width="6" stroke-linecap="round"/>';
      }
      for (var j0 = 1; j0 <= c.s.k; j0++) { var a0 = P(path[j0]); o += dot(a0.x, a0.y, 6, '#fff'); }
      var kp = c.s.pos || P(path[c.s.k]), ks = 46;
      o += '<g data-tap="kitty"><rect data-hit="1" x="' + (kp.x - 42) + '" y="' + (kp.y - 42) + '" width="84" height="84" rx="42" fill="transparent"/><circle cx="' + kp.x + '" cy="' + (kp.y + 3) + '" r="22" fill="' + C.ink + '"/><circle cx="' + kp.x + '" cy="' + kp.y + '" r="22" fill="#fff" ' + SK + '/>' + faceAt(c.api, 'kitty', kp.x - ks / 2 + 1, kp.y - ks / 2 + 1, ks - 2) + '</g>';
      if (c.s.k === 0) o += txt(P(path[0]).x, P(path[0]).y - 30, 'Start', 16, C.soft);
      return o;
    },
    tap: function (c, id) {
      if (id !== 'kitty') return;
      var d = c.Q.data, path = perimeterPath(d.cells), total = path.length - 1, g = this.geom(c);
      if (c.s.k >= total) { c.say('Mimi is back where she started.'); return; }
      if (c.s.pos) return;
      var a = path[c.s.k], b = path[c.s.k + 1];
      c.s.k++; c.tone([520 + (c.s.k % 8) * 40], 0.08);
      c.tween(0, 1, 260, function (t) { c.s.pos = { x: g.ox + (a[0] + (b[0] - a[0]) * t) * g.s, y: g.oy + (a[1] + (b[1] - a[1]) * t) * g.s }; c.render(); },
        function () { c.s.pos = null; c.render(); if (c.s.k === total) c.tone([523, 659, 784], 0.12); c.changed(); });
    },
    bar: function () { return [{ id: 'walk', label: 'Step', aria: 'Walk one step' }, { id: 'again', label: 'Start again', on: function (c) { return c.s.k > 0; } }]; },
    button: function (c, id) { if (id === 'walk') this.tap(c, 'kitty'); if (id === 'again') { c.s.k = 0; c.s.pos = null; c.render(); c.changed(); } },
    next: function (c) {
      var total = perimeterPath(c.Q.data.cells).length - 1;
      if (c.s.pos) return { kind: 'wait', sel: '[data-tap="kitty"]', say: 'Tap Mimi. She walks along one side of a square. Count each step.' };
      return c.s.k < total ? { kind: 'tap', sel: '[data-tap="kitty"]', say: c.s.k === 0 ? 'Tap Mimi. She walks along one side of a square. Count each step.' : 'Tap her again. Keep counting the steps.' } : null;
    },
    hint: function () { return 'Tap Mimi to walk her round the edge, one square side at a time. Count every step until she is back at the start.'; },
    outro: function () { return 'Mimi is back at the start. How many steps did she walk all the way around?'; }
  };

  /* ================================================================
     TIME UNITS
     ================================================================ */
  var DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var SEASON = [C.sky, C.sky, C.mint, C.mint, C.mint, C.sun, C.sun, C.sun, C.pink, C.pink, C.pink, C.sky];
  var FACTS = {
    week: { say: 'How many days are in one week?', show: 'Days in a week?', ans: 7, items: 'days' },
    year: { say: 'How many months are in one year?', show: 'Months in a year?', ans: 12, items: 'months' },
    day: { say: 'How many hours are in one day?', show: 'Hours in a day?', ans: 24, items: 'hours' },
    hour: { say: 'How many minutes are in one hour?', show: 'Minutes in an hour?', ans: 60, items: 'minutes' },
    minute: { say: 'How many seconds are in one minute?', show: 'Seconds in a minute?', ans: 60, items: 'seconds' }
  };
  /* tap items for each fact; returns [{x,y,w,h,label,fill,shape}] */
  function factItems(f) {
    var out = [], i;
    if (f === 'week') { for (i = 0; i < 7; i++) { var r = i < 4 ? 0 : 1, c = i < 4 ? i : i - 4, x0 = 16; out.push({ x: x0 + c * 94, y: 16 + r * 102, w: 86, h: 88, label: DAYS[i].slice(0, 3), fill: CANDY[i % 5] }); } }
    if (f === 'year') { for (i = 0; i < 12; i++) out.push({ x: 16 + (i % 4) * 94, y: 14 + Math.floor(i / 4) * 76, w: 86, h: 64, label: MONTHS[i].slice(0, 3), fill: SEASON[i] }); }
    /* 24 beads in rows of 5 (5, 5, 5, 5, 4), pink and blue rows in turn, with a small gap after each 10, so she can
       count 5, 10, 15, 20 and on. The picture is only as big as it needs, so each bead's tap square stays 44px+. */
    if (f === 'day') { for (i = 0; i < 24; i++) out.push({ x: 8 + (i % 5) * 56, y: beadRowY(Math.floor(i / 5)), w: 55, h: 55, round: true, fill: Math.floor(i / 5) % 2 ? C.sky : C.pink, tint: Math.floor(i / 5) % 2 ? C.skyT : C.pinkT }); }
    return out;
  }
  function beadRowY(rw) { return 4 + rw * 56 + (rw >= 2 ? 5 : 0) + (rw >= 4 ? 5 : 0); }
  /* "Count again" sits inside the picture (in a spare corner), not in a row of buttons under it. A row of buttons
     would take 56 px of height from the picture, and then the beads and clock slices would be under 44 px on a small phone. */
  var AGAIN = { week: [302, 118, 86, 88], year: [140, 248, 120, 64], day: [232, 0, 55, 55], hour: [276, 208, 60, 60], minute: [276, 208, 60, 60] };
  /* "Again" wipes all her marks, and it sits right after the last bead or card, where a fast tap along the row lands.
     So one tap only asks: the card turns yellow and says "Sure?". A second tap clears, but only if it comes a little
     later (AGAIN_GAP ms), so a quick double tap does not clear. Tapping any bead or card puts it back to "Again". */
  var AGAIN_GAP = 700;
  /* "Sure?" waits only a few seconds. If she does nothing, the card goes back to "Again" and her marks stay.
     The wait is longer than Mimi's sentence (about 7 seconds at the host's slow speech), so it never goes back
     while Mimi is still saying "tap again". A tap on any bead, card or slice also puts it back, so Mimi says that. */
  var AGAIN_HOLD = 9000;
  var AGAIN_THING = { day: 'bead', week: 'card', year: 'card', hour: 'slice', minute: 'slice' };
  function againSay(f) { return 'Do you want to clear all your marks? Tap again to clear them. To keep them, tap a ' + AGAIN_THING[f] + '.'; }
  function againBtn(f, show, armed) {
    if (!show) return '';
    var a = AGAIN[f], x = a[0], y = f === 'day' ? beadRowY(4) : a[1], w = a[2], h = a[3], cx = x + w / 2, cy = y + h / 2 - 8, r = 9;
    var arc = 'M' + (cx + r) + ' ' + cy + ' A' + r + ' ' + r + ' 0 1 1 ' + (cx + r * 0.2) + ' ' + (cy - r * 0.98);
    return '<g data-tap="again" data-armed="' + (armed ? 1 : 0) + '" role="button" aria-label="' + (armed ? 'Tap again to clear all your marks. To keep them, tap a ' + AGAIN_THING[f] + '.' : 'Count again') + '">' + card(x, y, w, h, 14, armed ? C.sunT : '#fff', 'data-hit="1"') +
      '<path d="' + arc + '" fill="none" stroke="' + C.ink + '" stroke-width="3.5" stroke-linecap="round" pointer-events="none"/>' +
      '<path d="M' + (cx + r * 0.2 - 1) + ' ' + (cy - r * 0.98 - 6) + ' l7 5.5 -7 5.5 z" fill="' + C.ink + '" pointer-events="none"/>' +
      txt(cx, y + h - 9, armed ? 'Sure?' : 'Again', 14, C.ink) + '</g>';
  }
  /* the counting clock gets a narrow picture of its own, so on a small phone each slice is still 44px wide at the rim */
  var CLOCK_R = 126, CLOCK_C = { x: 140, y: 140 };
  BUILD.facts = {
    vb: function (Q) { var f = Q.data.fact; return f === 'week' ? [400, 216] : f === 'year' ? [400, 316] : f === 'day' ? [296, 298] : [340, 274]; },
    init: function (c) { c.s = { order: [] }; },
    count: function (c) { var f = c.Q.data.fact; return f === 'hour' || f === 'minute' ? 12 : factItems(f).length; },
    draw: function (c) {
      var f = c.Q.data.fact, o = '';
      if (f === 'hour' || f === 'minute') {
        var cx = CLOCK_C.x, cy = CLOCK_C.y, R = CLOCK_R;
        if (f === 'minute') o += '<rect x="' + (cx - 14) + '" y="2" width="28" height="16" rx="5" fill="' + C.pink + '" ' + SK + '/>';
        o += '<circle cx="' + cx + '" cy="' + (cy + 5) + '" r="' + R + '" fill="' + C.ink + '"/><circle cx="' + cx + '" cy="' + cy + '" r="' + R + '" fill="' + (f === 'hour' ? C.pink : C.mint) + '" ' + SK + '/><circle cx="' + cx + '" cy="' + cy + '" r="' + (R - 14) + '" fill="#fff" ' + SK + '/>';
        for (var t = 0; t < 60; t++) { var a = t * 6 * Math.PI / 180, r1 = R - 18, r2 = t % 5 ? R - 24 : R - 30; o += '<line x1="' + (cx + r1 * Math.sin(a)) + '" y1="' + (cy - r1 * Math.cos(a)) + '" x2="' + (cx + r2 * Math.sin(a)) + '" y2="' + (cy - r2 * Math.cos(a)) + '" stroke="' + C.ink + '" stroke-width="' + (t % 5 ? 2 : 3.5) + '" stroke-linecap="round"/>'; }
        for (var k = 1; k <= 12; k++) {
          var ak = (k * 30 - 15) * Math.PI / 180, a0 = (k - 1) * 30 * Math.PI / 180, a1 = k * 30 * Math.PI / 180, ri = 30, ro = R - 16, done = c.s.order.indexOf(k) >= 0;
          var wedgeTo = function (rr) { return 'M' + (cx + ri * Math.sin(a0)) + ' ' + (cy - ri * Math.cos(a0)) + ' L' + (cx + rr * Math.sin(a0)) + ' ' + (cy - rr * Math.cos(a0)) + ' A' + rr + ' ' + rr + ' 0 0 1 ' + (cx + rr * Math.sin(a1)) + ' ' + (cy - rr * Math.cos(a1)) + ' L' + (cx + ri * Math.sin(a1)) + ' ' + (cy - ri * Math.cos(a1)) + ' A' + ri + ' ' + ri + ' 0 0 0 ' + (cx + ri * Math.sin(a0)) + ' ' + (cy - ri * Math.cos(a0)) + ' Z'; };
          /* the tap area reaches out over the pink rim (so each slice is 44px+ on a small phone); the colour stays inside the white face */
          o += '<g data-tap="w' + k + '"><path data-hit="1" d="' + wedgeTo(R - 2) + '" fill="transparent"/><path d="' + wedgeTo(ro) + '" fill="' + (done ? (k % 2 ? C.sunT : '#ffe7a3') : 'transparent') + '" stroke="' + (done ? C.ink : 'none') + '" stroke-width="2" pointer-events="none"/></g>';
          if (done) { var rb = R - 50; o += mark(cx + rb * Math.sin(ak), cy - rb * Math.cos(ak), 10); }
        }
        o += '<circle cx="' + cx + '" cy="' + cy + '" r="10" fill="' + C.sun + '" ' + SK + '/>';
        return o + againBtn(f, c.s.order.length > 0, !!c.s.arm);
      }
      factItems(f).forEach(function (it, i) {
        var n = c.s.order.indexOf(i);
        o += '<g data-tap="i' + i + '">';
        if (it.round) {
          o += '<rect data-hit="1" x="' + (it.x - 0.5) + '" y="' + (it.y - 0.5) + '" width="56" height="56" fill="transparent"/>';
          o += '<circle cx="' + (it.x + it.w / 2) + '" cy="' + (it.y + it.h / 2 + 3) + '" r="' + (it.w / 2 - 2) + '" fill="' + C.ink + '"/><circle cx="' + (it.x + it.w / 2) + '" cy="' + (it.y + it.h / 2) + '" r="' + (it.w / 2 - 1) + '" fill="' + (n >= 0 ? it.fill : (it.tint || '#fff')) + '" ' + SK + '/>';
        } else {
          o += card(it.x, it.y, it.w, it.h, 14, n >= 0 ? it.fill : '#fff', 'data-hit="1"') + txt(it.x + it.w / 2, it.y + it.h / 2 + 9, it.label, 26, C.ink);
        }
        if (n >= 0) o += it.round ? mark(it.x + it.w / 2, it.y + it.h / 2, 9, '#fff') : mark(it.x + it.w - 8, it.y + 10, 11);
        o += '</g>';
      });
      return o + againBtn(f, c.s.order.length > 0, !!c.s.arm);
    },
    tap: function (c, id) {
      if (id === 'again') {
        var now = Date.now();
        if (!c.s.arm) {
          var s0 = c.s, stamp = now;
          c.s.arm = now; c.say(againSay(c.Q.data.fact)); c.render();
          setTimeout(function () { if (!c.dead && c.s === s0 && c.s.arm === stamp) { c.s.arm = 0; c.render(); } }, AGAIN_HOLD);
          return;
        }
        if (now - c.s.arm < AGAIN_GAP) return; /* a fast double tap does not clear */
        c.s.order = []; c.s.arm = 0; c.render(); c.changed(); return;
      }
      var k = parseInt(id.slice(1), 10), wasArmed = !!c.s.arm;
      c.s.arm = 0;
      if (c.s.order.indexOf(k) >= 0) { if (wasArmed) c.render(); return; }
      c.s.order.push(k); c.tone([500 + (c.s.order.length % 8) * 40], 0.08); c.render(); c.changed();
    },
    next: function (c) {
      var f = c.Q.data.fact, n = this.count(c), first = c.s.order.length === 0;
      if (f === 'hour' || f === 'minute') {
        for (var k = 1; k <= 12; k++) if (c.s.order.indexOf(k) < 0) return { kind: 'tap', sel: '[data-tap="w' + k + '"]', say: first ? 'Each slice is 5 ' + FACTS[f].items + '. Start at the top. Tap the slices going round. Count by fives.' : 'Tap the next slice. Count by fives.' };
        return null;
      }
      for (var i = 0; i < n; i++) if (c.s.order.indexOf(i) < 0) return { kind: 'tap', sel: '[data-tap="i' + i + '"]', say: first ? (f === 'day' ? 'Each bead is one hour. Tap each bead and count.' : 'Tap each card and count.') : 'Tap the next one. Keep counting.' };
      return null;
    },
    hint: function (Q) {
      var f = Q.data.fact;
      if (f === 'hour' || f === 'minute') return 'Each slice of the clock is 5 ' + FACTS[f].items + '. Tap every slice going round and count by fives.';
      if (f === 'day') return 'Each bead is one hour. Tap every bead and count them all.';
      return 'Tap every card once and count them.';
    },
    outro: function (Q) { return 'You counted them all. How many ' + FACTS[Q.data.fact].items + '? Type it.'; }
  };

  /* time referents: a picture and a sentence for each unit of time */
  var TREF = {
    second: { title: '1 second', svg: 'clap', say: 'One second is very short. About as long as one clap.' },
    minute: { title: '1 minute', svg: 'stopwatch', say: 'One minute is about singing the ABC song two times.' },
    hour: { title: '1 hour', art: 'clock', say: 'One hour is about twenty songs, one after another.' },
    day: { title: '1 day', art: 'bed', say: 'One day is a whole day of play and a whole night of sleep.' },
    /* week and month say how they feel, not "seven days" or "four weeks": in "Which is longer, a day or a week?"
       that sentence would be the answer. She must think it out herself, in play and in Mimi's lesson. */
    week: { title: '1 week', svg: 'week', say: 'One week is from one Sunday to the next Sunday.' },
    month: { title: '1 month', svg: 'month', say: 'One month is one whole page of the calendar.' },
    year: { title: '1 year', art: 'birthday', say: 'One year is from one birthday to the next birthday.' }
  };
  BUILD.tcards = {
    vb: function (Q) { return Q.data.act ? [400, 262] : [400, 240]; },
    init: function (c) { c.s = { seen: {} }; },
    draw: function (c) {
      var d = c.Q.data, o = '', units = d.units;
      if (d.act) {
        o += card(12, 18, 156, 224, 20, C.paper) + thing(c.api, d.act, 26, 30, 128) + txt(90, 196, d.act.short, 21, C.ink);
        units.forEach(function (u, i) {
          var y = 18 + i * 118, R = TREF[u], seen = !!c.s.seen[u];
          o += '<g data-tap="' + u + '">' + card(184, y, 204, 106, 18, seen ? C.sunT : C.paper, 'data-hit="1"') + thing(c.api, R, 194, y + 14, 78) + txt(330, y + 62, R.title, 25, C.ink) + '</g>';
        });
      } else {
        units.forEach(function (u, i) {
          var x = 14 + i * 192, R = TREF[u], seen = !!c.s.seen[u];
          o += '<g data-tap="' + u + '">' + card(x, 16, 180, 206, 20, seen ? C.sunT : C.paper, 'data-hit="1"') + thing(c.api, R, x + 30, 30, 120) + txt(x + 90, 190, R.title, 30, C.ink) + '</g>';
        });
      }
      return o;
    },
    tap: function (c, id) { if (!TREF[id]) return; c.s.seen[id] = true; c.say(TREF[id].say); c.tone([600, 760], 0.1); c.render(); c.changed(); },
    next: function (c) {
      var u = c.Q.data.units;
      for (var i = 0; i < u.length; i++) if (!c.s.seen[u[i]]) return { kind: 'tap', sel: '[data-tap="' + u[i] + '"]', say: 'Tap ' + TREF[u[i]].title + '. Listen.' };
      return null;
    },
    hint: function (Q) { return Q.data.act ? 'Tap each card to hear how long it is. Then think: does ' + Q.data.act.the + ' take a short time or a long time?' : 'Tap each card to hear how long it is. Which one takes more time?'; },
    outro: function (Q) { return Q.data.act ? 'Now think. Which time fits ' + Q.data.act.the + '?' : 'Now think. Which one takes more time?'; }
  };

  /* ================================================================
     CALENDAR
     ================================================================ */
  BUILD.ring = {
    /* the month ring is a flat oval, so on a small phone the picture is limited by its width and each card stays 44px or more */
    vb: function (Q) { return Q.data.list === 'days' ? [400, 300] : [404, 300]; },
    items: function (c) { return c.Q.data.list === 'days' ? DAYS : MONTHS; },
    geom: function (c) { var n = this.items(c).length; return n === 7 ? { rx: 140, ry: 104, w: 84, h: 52, fs: 22, cx: 200, cy: 150 } : { rx: 170, ry: 112, w: 62, h: 52, fs: 21, cx: 202, cy: 153 }; },
    /* tap areas of cards close together overlap a little: the tap goes to the card whose middle is nearest */
    pick: function (c, id, p) {
      if (!/^r\d+$/.test(id) || !p) return id;
      var best = id, bd = 1e9, n = this.items(c).length;
      for (var i = 0; i < n; i++) { var q = this.pos(c, i), dd = Math.hypot(q.x - p.x, q.y - p.y); if (dd < bd) { bd = dd; best = 'r' + i; } }
      return best;
    },
    pos: function (c, i) { var g = this.geom(c), n = this.items(c).length, a = (i / n) * 2 * Math.PI; return { x: g.cx + g.rx * Math.sin(a), y: g.cy - g.ry * Math.cos(a) }; },
    init: function (c) { c.s = { at: c.Q.data.start, hop: null }; },
    draw: function (c) {
      var d = c.Q.data, items = this.items(c), g = this.geom(c), n = items.length, o = '', self = this;
      /* circle arrow in the middle: going round = later */
      o += '<g transform="translate(' + (g.cx - 200) + ' ' + (g.cy - 150) + ')"><path d="M200 96 A54 54 0 1 1 146 150" fill="none" stroke="' + C.ink + '" stroke-width="10" stroke-linecap="round"/><path d="M200 96 A54 54 0 1 1 146 150" fill="none" stroke="' + C.pink + '" stroke-width="5" stroke-linecap="round"/>';
      o += '<path d="M133 152 L146 131 L159 152 Z" fill="' + C.pink + '" ' + SK + '/>';
      o += txt(200, 146, 'after', 20, C.pinkD) + txt(200, 168, 'next', 16, C.soft) + '</g>';
      items.forEach(function (name, i) {
        var p = self.pos(c, i), fill = n === 12 ? SEASON[i] : CANDY[i % 5];
        var hw2 = Math.max(g.w, 66);
        o += '<g data-tap="r' + i + '"><rect data-hit="1" x="' + (p.x - hw2 / 2) + '" y="' + (p.y - 33) + '" width="' + hw2 + '" height="66" fill="transparent"/>' + card(p.x - g.w / 2, p.y - g.h / 2, g.w, g.h, 12, i === c.s.at ? fill : '#fff') + txt(p.x, p.y + g.fs * 0.36, name.slice(0, 3), g.fs, C.ink) + '</g>';
      });
      var kp = c.s.hop || this.pos(c, c.s.at);
      o += '<g pointer-events="none"><circle cx="' + (kp.x - g.w / 2 + 2) + '" cy="' + (kp.y - g.h / 2 + 2) + '" r="17" fill="#fff" ' + SK + '/>' + faceAt(c.api, 'kitty', kp.x - g.w / 2 - 14, kp.y - g.h / 2 - 14, 32) + '</g>';
      return o;
    },
    tap: function (c, id) {
      var i = parseInt(id.slice(1), 10), n = this.items(c).length, at = c.s.at;
      if (c.s.hop || i === at) return;
      if (i !== (at + 1) % n && i !== (at + n - 1) % n) { c.say('Hop one at a time. Tap the card next to Mimi.'); c.tone([330], 0.15, 'triangle'); return; }
      var a = this.pos(c, at), b = this.pos(c, i), self = this;
      c.s.at = i; c.tone([600], 0.08);
      c.tween(0, 1, 280, function (t) { c.s.hop = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t - Math.sin(t * Math.PI) * 26 }; c.render(); }, function () { c.s.hop = null; c.render(); c.changed(); });
    },
    bar: function () { return [{ id: 'again', label: 'Start again', on: function (c) { return c.s.at !== c.Q.data.start; } }]; },
    button: function (c, id) { if (id === 'again') { c.s.at = c.Q.data.start; c.s.hop = null; c.render(); c.changed(); } },
    next: function (c) {
      var d = c.Q.data, n = this.items(c).length, word = d.list === 'days' ? 'day' : 'month';
      if (c.s.hop) return { kind: 'wait', sel: '[data-tap="r' + c.s.at + '"]', say: '' };
      if (c.s.at === d.target) return null;
      var fwd = d.dir === 'after', nx = fwd ? (c.s.at + 1) % n : (c.s.at + n - 1) % n;
      return { kind: 'tap', sel: '[data-tap="r' + nx + '"]', say: fwd ? 'Mimi is on ' + this.items(c)[d.start] + '. Hop one ' + word + ' forward, the way the arrow goes.' : 'Mimi is on ' + this.items(c)[d.start] + '. Hop one ' + word + ' back, against the arrow.' };
    },
    hint: function (Q) { var w = Q.data.list === 'days' ? 'day' : 'month'; return Q.data.dir === 'after' ? 'Find Mimi. Hop one ' + w + ' forward, the way the arrow goes. Where does she land?' : 'Find Mimi. Hop one ' + w + ' back, against the arrow. Where does she land?'; },
    outro: function (Q) { return 'Where is Mimi now? Read the card.'; }
  };

  function monthInfo(y, m) { var first = new Date(y, m, 1).getDay(), days = new Date(y, m + 1, 0).getDate(); return { first: first, days: days, rows: Math.ceil((first + days) / 7) }; }
  /* The month calendar shows only the weeks she needs: from the week of today to the week of the target, plus
     one more week when that still makes no more than 3 rows (and never just 1 row: then the week before is shown too). That keeps each row tall. Seven days across a small
     phone are only about 41 px wide, so the day squares are pictures; the one live tap target is the NEXT day
     after Mimi, and its tap area is 72 units (44 px or more on a small phone) square, laid over its neighbours. A tap anywhere else on the calendar says "hop one day at a time". */
  var CAL = { x0: 4, cw: 56, top: 46, rh: 58, kx: 16, ky: 42, ks: 26, hit: 72 };
  BUILD.month = {
    rows: function (Q) { var d = Q.data, mi = monthInfo(d.y, d.mo), r0 = Math.floor((mi.first + d.today - 1) / 7), rt = Math.floor((mi.first + d.target - 1) / 7), r1 = rt + 1 <= mi.rows - 1 && rt + 1 - r0 < 3 ? rt + 1 : rt;
      if (r1 === r0) { if (r0 > 0) r0--; else r1++; } /* never a single row: the rows stay tall enough to tap */ return { r0: r0, r1: r1, n: r1 - r0 + 1 }; },
    vb: function (Q) { return [400, CAL.top + this.rows(Q).n * CAL.rh + 4]; },
    init: function (c) { c.s = { at: c.Q.data.today, hop: null }; },
    shown: function (c, day) { var mi = monthInfo(c.Q.data.y, c.Q.data.mo), R = this.rows(c.Q), r = Math.floor((mi.first + day - 1) / 7); return day >= 1 && day <= mi.days && r >= R.r0 && r <= R.r1; },
    cell: function (c, day) { var mi = monthInfo(c.Q.data.y, c.Q.data.mo), k = mi.first + day - 1, R = this.rows(c.Q); return { x: CAL.x0 + (k % 7) * CAL.cw, y: CAL.top + (Math.floor(k / 7) - R.r0) * CAL.rh }; },
    draw: function (c) {
      var d = c.Q.data, mi = monthInfo(d.y, d.mo), o = '', self = this, H = this.vb(c.Q)[1];
      o += card(CAL.x0, 0, 7 * CAL.cw, 22, 9, C.pink) + outlined(200, 18, MONTHS[d.mo] + ' ' + d.y, 18, '#fff');
      for (var w = 0; w < 7; w++) o += txt(CAL.x0 + w * CAL.cw + CAL.cw / 2, 42, DAYS[w].slice(0, 3), 15, w === 0 || w === 6 ? C.pinkD : C.soft);
      /* the whole calendar is one catch-all tap area; the day squares inside it are pictures */
      o += '<g data-tap="grid"><rect data-hit="1" x="' + CAL.x0 + '" y="' + CAL.top + '" width="' + (7 * CAL.cw) + '" height="' + (H - CAL.top) + '" fill="transparent"/>';
      for (var day = 1; day <= mi.days; day++) {
        if (!this.shown(c, day)) continue;
        var p = this.cell(c, day), passed = day > d.today && day <= c.s.at, wk = (mi.first + day - 1) % 7, isT = day === d.today;
        var fill = isT ? C.pinkT : passed ? C.sunT : (wk === 0 || wk === 6 ? '#fff6f9' : '#fff');
        o += '<rect data-day="' + day + '" x="' + (p.x + 2) + '" y="' + (p.y + 2) + '" width="' + (CAL.cw - 4) + '" height="' + (CAL.rh - 4) + '" rx="9" fill="' + fill + '" stroke="' + C.ink + '" stroke-width="2.2"/>';
        o += txt(p.x + 18, p.y + 24, String(day), 18, C.ink, 'middle', 'data-tm="date"');
        /* a day Mimi has hopped to gets a heart: a mark, not a number */
        if (passed) o += mark(p.x + CAL.cw - 15, p.y + CAL.rh - 16, 9);
        if (day === d.target) o += d.type === 'party' ? artImg(c.api, 'gift', p.x + CAL.cw - 26, p.y + 5, 22) : starAt(p.x + CAL.cw - 15, p.y + 16, 10);
      }
      o += '</g>';
      /* the live tap target: the next day after Mimi, big enough for her finger */
      var nx = c.s.at + 1;
      if (this.shown(c, nx)) {
        var q = this.cell(c, nx), hx = clamp(q.x + CAL.cw / 2 - CAL.hit / 2, 0, 400 - CAL.hit), hy = clamp(q.y + CAL.rh / 2 - CAL.hit / 2, 0, H - CAL.hit);
        o += '<g data-tap="d' + nx + '"><rect data-hit="1" x="' + hx + '" y="' + hy + '" width="' + CAL.hit + '" height="' + CAL.hit + '" fill="transparent"/></g>';
      }
      var kp = c.s.hop || (function () { var q2 = self.cell(c, c.s.at); return { x: q2.x + CAL.kx, y: q2.y + CAL.ky }; })();
      o += '<g pointer-events="none">' + faceAt(c.api, 'kitty', kp.x - CAL.ks / 2, kp.y - CAL.ks / 2, CAL.ks) + '</g>';
      return o;
    },
    tap: function (c, id) {
      var d = c.Q.data;
      if (c.s.hop) return;
      var day = id === 'grid' ? -1 : parseInt(id.slice(1), 10);
      if (day === c.s.at + 1 && this.shown(c, day)) {
        var a = this.cell(c, c.s.at), b = this.cell(c, day);
        c.s.at = day; c.tone([520 + (day - d.today) * 30], 0.08);
        c.tween(0, 1, 240, function (t) { c.s.hop = { x: a.x + (b.x - a.x) * t + CAL.kx, y: a.y + (b.y - a.y) * t + CAL.ky - Math.sin(t * Math.PI) * 20 }; c.render(); }, function () { c.s.hop = null; c.render(); c.changed(); });
      } else { c.say('Hop one day at a time. Tap the next day after Mimi.'); c.tone([330], 0.15, 'triangle'); }
    },
    bar: function () { var moved = function (c) { return c.s.at > c.Q.data.today; }; return [{ id: 'back', label: 'Back', aria: 'Back one day', on: moved }, { id: 'again', label: 'Start again', on: moved }]; },
    button: function (c, id) { var d = c.Q.data; if (id === 'back' && c.s.at > d.today) c.s.at--; if (id === 'again') c.s.at = d.today; c.s.hop = null; c.render(); c.changed(); },
    next: function (c) {
      var d = c.Q.data;
      /* the lesson glow goes round the day square she should tap (not the bigger tap area) */
      if (c.s.hop) return { kind: 'wait', sel: '[data-day="' + c.s.at + '"]', say: '' };
      if (c.s.at < d.target) return { kind: 'tap', sel: '[data-day="' + (c.s.at + 1) + '"]', say: c.s.at === d.today ? 'Mimi is on today. Tap the next day to hop. Count each hop.' : (this.cell(c, c.s.at + 1).y > this.cell(c, c.s.at).y ? 'The week ends here. Go to the start of the next row. Keep counting.' : 'Hop to the next day. Keep counting.') };
      if (c.s.at > d.target) return { kind: 'tap', sel: '[data-b="back"]', say: 'Too far. Go back one day.' };
      return null;
    },
    hint: function (Q) { return 'Start on today. Hop one day at a time to the ' + (Q.data.type === 'party' ? 'present' : 'star') + '. Count each hop. Do not count today.'; },
    outro: function (Q) { return 'Mimi got there. Count the hearts. How many hops did she make?'; }
  };
  function starAt(cx, cy, r) { var p = []; for (var i = 0; i < 10; i++) { var rr = i % 2 ? r * 0.48 : r, a = (i * 36 - 90) * Math.PI / 180; p.push((cx + rr * Math.cos(a)).toFixed(1) + ',' + (cy + rr * Math.sin(a)).toFixed(1)); } return '<polygon points="' + p.join(' ') + '" fill="' + C.sun + '" stroke="' + C.ink + '" stroke-width="2.2" stroke-linejoin="round"/>'; }

  /* ================================================================
     CLOCK (Grade 4 extension)
     ================================================================ */
  function clockFace(o) {
    /* o: {cx, cy, r, h, m, nums:'all'|'quarter', lit, hands:true, id} */
    var cx = o.cx, cy = o.cy, r = o.r, s = '', ha = ((o.h % 12) + o.m / 60) * 30, ma = o.m * 6;
    s += '<circle cx="' + cx + '" cy="' + (cy + r * 0.04) + '" r="' + r + '" fill="' + C.ink + '"/>';
    s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + C.pink + '" stroke="' + C.ink + '" stroke-width="' + Math.max(2.5, r * 0.025) + '"/>';
    s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r * 0.88 + '" fill="#fff" stroke="' + C.ink + '" stroke-width="' + Math.max(2, r * 0.02) + '"/>';
    for (var t = 0; t < 60; t++) {
      if (o.nums === 'quarter' && t % 5) continue;
      var a = t * 6 * Math.PI / 180, r1 = r * 0.84, r2 = t % 5 ? r * 0.79 : r * 0.74;
      s += '<line x1="' + (cx + r1 * Math.sin(a)).toFixed(1) + '" y1="' + (cy - r1 * Math.cos(a)).toFixed(1) + '" x2="' + (cx + r2 * Math.sin(a)).toFixed(1) + '" y2="' + (cy - r2 * Math.cos(a)).toFixed(1) + '" stroke="' + C.ink + '" stroke-width="' + (t % 5 ? Math.max(1.4, r * 0.012) : Math.max(2.5, r * 0.03)) + '" stroke-linecap="round"/>';
    }
    s += o.extra || '';
    /* hands: hour short and pink, minute long and purple */
    var hw = r * 0.1, hl = r * 0.48, mw = r * 0.07, ml = r * 0.74;
    s += '<g data-hand="h" data-angle="' + ha.toFixed(2) + '" transform="rotate(' + ha.toFixed(2) + ' ' + cx + ' ' + cy + ')"' + (o.hourDrag ? ' data-drag="hh"' : (o.tapHands ? ' data-tap="hh"' : '')) + '>' +
      (o.hourDrag || o.tapHands ? '<rect data-hit="1" x="' + (cx - 45) + '" y="' + (cy - hl - 12) + '" width="90" height="' + (hl + 34) + '" rx="24" fill="transparent"/>' : '') +
      '<rect x="' + (cx - hw / 2) + '" y="' + (cy - hl) + '" width="' + hw + '" height="' + (hl + hw * 0.8) + '" rx="' + hw / 2 + '" fill="' + (o.hl === 'h' ? C.sun : C.pinkD) + '" stroke="' + C.ink + '" stroke-width="' + Math.max(2, r * 0.022) + '"/></g>';
    s += '<g data-hand="m" data-angle="' + ma.toFixed(2) + '" transform="rotate(' + ma.toFixed(2) + ' ' + cx + ' ' + cy + ')"' + (o.minDrag ? ' data-drag="mh"' : (o.tapHands ? ' data-tap="mh"' : '')) + '>' +
      (o.minDrag || o.tapHands ? '<rect data-hit="1" x="' + (cx - 45) + '" y="' + (cy - ml - 12) + '" width="90" height="' + (ml + 34) + '" rx="24" fill="transparent"/>' : '') +
      '<rect x="' + (cx - mw / 2) + '" y="' + (cy - ml) + '" width="' + mw + '" height="' + (ml + mw) + '" rx="' + mw / 2 + '" fill="' + (o.hl === 'm' ? C.sun : C.lilacD) + '" stroke="' + C.ink + '" stroke-width="' + Math.max(2, r * 0.022) + '"/></g>';
    /* numbers go on top of the hands, with a white outline, so a hand never hides the number it points at */
    var nums = '';
    for (var k = 1; k <= 12; k++) {
      if (o.nums === 'quarter' && k % 3) continue;
      var ak = k * 30 * Math.PI / 180, rn = o.nums === 'quarter' ? r * 0.56 : r * 0.6, fs = o.nums === 'quarter' ? r * 0.36 : r * 0.23;
      var nx = cx + rn * Math.sin(ak), ny = cy - rn * Math.cos(ak);
      if (o.lit === k) nums += '<circle data-lit="' + k + '" cx="' + nx.toFixed(1) + '" cy="' + ny.toFixed(1) + '" r="' + (fs * 0.78).toFixed(1) + '" fill="' + C.sun + '" stroke="' + C.ink + '" stroke-width="2.5" pointer-events="none"/>';
      nums += '<text data-num="' + k + '" x="' + nx.toFixed(1) + '" y="' + (ny + fs * 0.36).toFixed(1) + '" font-size="' + fs.toFixed(1) + '" text-anchor="middle" fill="' + C.ink + '" stroke="#fff" stroke-width="' + (fs * 0.2).toFixed(1) + '" stroke-linejoin="round" paint-order="stroke">' + k + '</text>';
    }
    s += nums;
    /* the middle dot sits on top of both hands; it must never catch a tap (Chrome touch moves taps onto it) */
    s += '<circle data-tm="hub" pointer-events="none" cx="' + cx + '" cy="' + cy + '" r="' + r * 0.08 + '" fill="' + C.sun + '" stroke="' + C.ink + '" stroke-width="' + Math.max(2, r * 0.022) + '"/>';
    return s;
  }
  function clockHTML(h, m) {
    return '<svg viewBox="0 0 120 120" width="96" height="96" style="width:min(96px,100%);height:auto;display:block;margin:auto" role="img" aria-label="clock" data-h="' + h + '" data-m="' + m + '">' +
      clockFace({ cx: 60, cy: 58, r: 54, h: h, m: m, nums: 'quarter' }).replace(/font-size="([\d.]+)"/g, 'font-size="$1" font-family="Baloo 2,Comic Sans MS,sans-serif" font-weight="800"') + '</svg>';
  }
  var CK = { cx: 200, cy: 150, r: 118 };
  var CLOCK_STEP = [30, 30, 15, 5]; /* minutes the Back / Forward buttons turn the big clock, per level */
  function angOf(c, p) { var a = Math.atan2(p.x - CK.cx, -(p.y - CK.cy)) * 180 / Math.PI; return (a + 360) % 360; }
  function phrase(h, m, lv) {
    var nx = h % 12 + 1;
    if (lv <= 2) {
      if (m === 0) return h + ' o\'clock';
      if (m === 30) return 'half past ' + h;
      if (m === 15) return 'quarter past ' + h;
      if (m === 45) return 'quarter to ' + nx;
    }
    return h + ':' + pad2(m);
  }
  /* when the two hands overlap, a touch near the middle means the short hand, further out the long hand */
  function pickHand(c, id, p, ids) {
    if (!p || (id !== ids[0] && id !== ids[1])) return id;
    var hh = c.find('[data-hand="h"]'), mh = c.find('[data-hand="m"]');
    if (!hh || !mh) return id;
    var a = angOf(c, p), rr = Math.hypot(p.x - CK.cx, p.y - CK.cy);
    var near = function (g) { var d = Math.abs(((+g.getAttribute('data-angle') - a) % 360 + 540) % 360 - 180); return d < 28; };
    var nh = near(hh), nm = near(mh);
    if (nh && nm) return rr < CK.r * 0.52 ? ids[0] : ids[1];
    if (nh && rr < CK.r * 0.6) return ids[0];
    if (nm) return ids[1];
    return id;
  }
  function handPt(deg, frac) { var a = deg * Math.PI / 180; return { x: CK.cx + CK.r * frac * Math.sin(a), y: CK.cy - CK.r * frac * Math.cos(a) }; }
  function minuteWord(m) { return m === 0 ? '12' : String(m / 5); }
  BUILD.clockread = {
    vb: function () { return [400, 300]; },
    pick: function (c, id, p) {
      /* while she is choosing the hour number, any tap on the number ring means the nearest number */
      if (this.wantNum(c) && p) { var rr = Math.hypot(p.x - CK.cx, p.y - CK.cy); if (rr > CK.r * 0.4 && rr < CK.r * 1.05) { var k = Math.round(angOf(c, p) / 30) % 12; return 'n' + (k === 0 ? 12 : k); } }
      return pickHand(c, id, p, ['hh', 'mh']);
    },
    init: function (c) { c.s = { hour: false, num: 0, min: false, spots: 0 }; },
    /* She chooses the hour number herself. In play, ANY number she taps lights up the same way, with the same
       sound, so the light never tells her she is right. Only in Mimi's lesson does a wrong number get
       "look at the short hand again" (and the ring of numbers stays open until she finds it). */
    wantNum: function (c) { return c.s.hour && (!c.s.num || (c.teaching && c.s.num !== this.hourNum(c))); },
    hourNum: function (c) { var d = c.Q.data; return d.level === 2 && d.m === 45 ? d.h % 12 + 1 : d.h; },
    numSay: function (c) { var d = c.Q.data; return d.m === 0 ? 'Which number does the short hand point to? Tap that number.' : (d.level === 2 && d.m === 45 ? 'The short hand is almost at the next number. Tap that number.' : 'Which number has the short hand just passed? Tap that number.'); },
    draw: function (c) {
      var d = c.Q.data, o = '', extra = '';
      if (d.level === 3) {
        for (var k = 1; k <= 12; k++) {
          var a = k * 30 * Math.PI / 180, x = CK.cx + (CK.r + 2) * Math.sin(a), y = CK.cy - (CK.r + 2) * Math.cos(a), done = k <= c.s.spots;
          var hy = clamp(y - 39, 0, 300 - 78), hx = clamp(x - 39, 0, 400 - 78); /* a big round tap area, kept inside the picture */
          extra += '<g data-tap="s' + k + '"><rect data-hit="1" x="' + hx.toFixed(1) + '" y="' + hy.toFixed(1) + '" width="78" height="78" rx="39" fill="transparent"/>' +
            (done ? dot(x, y, 12, C.sun) : '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="7" fill="#fff" stroke="' + C.ink + '" stroke-width="2.5"/>') + '</g>';
        }
      }
      if (this.wantNum(c)) {
        /* 12 wide slices round the ring, one for each number, so each is a big target */
        for (var n = 1; n <= 12; n++) {
          var a0 = (n * 30 - 15) * Math.PI / 180, a1 = (n * 30 + 15) * Math.PI / 180, ri = CK.r * 0.4, ro = CK.r;
          extra += '<path data-tap="n' + n + '" data-hit="1" fill="transparent" d="M' + (CK.cx + ri * Math.sin(a0)).toFixed(1) + ' ' + (CK.cy - ri * Math.cos(a0)).toFixed(1) + ' L' + (CK.cx + ro * Math.sin(a0)).toFixed(1) + ' ' + (CK.cy - ro * Math.cos(a0)).toFixed(1) + ' A' + ro + ' ' + ro + ' 0 0 1 ' + (CK.cx + ro * Math.sin(a1)).toFixed(1) + ' ' + (CK.cy - ro * Math.cos(a1)).toFixed(1) + ' L' + (CK.cx + ri * Math.sin(a1)).toFixed(1) + ' ' + (CK.cy - ri * Math.cos(a1)).toFixed(1) + ' A' + ri + ' ' + ri + ' 0 0 0 ' + (CK.cx + ri * Math.sin(a0)).toFixed(1) + ' ' + (CK.cy - ri * Math.cos(a0)).toFixed(1) + ' Z"/>';
        }
      }
      o += clockFace({ cx: CK.cx, cy: CK.cy, r: CK.r, h: d.h, m: d.m, nums: 'all', lit: c.s.num, hl: c.s.min ? 'm' : '', tapHands: true });
      o += extra;
      /* say what the white dots on the rim are for */
      if (d.level === 3) o += '<circle cx="14" cy="17" r="7" fill="#fff" stroke="' + C.ink + '" stroke-width="2.5"/>' + txt(27, 23, 'Tap the dots.', 17, C.ink, 'start') + txt(6, 45, 'Count by 5s.', 17, C.ink, 'start');
      return o;
    },
    tap: function (c, id) {
      var d = c.Q.data;
      if (id[0] === 'n') {
        if (!this.wantNum(c)) return;
        c.s.num = parseInt(id.slice(1), 10); c.tone([660, 880], 0.1);
        if (c.teaching && c.s.num !== this.hourNum(c)) c.say('Look at the short hand again.'); /* the lesson then says the step again */
      }
      else if (id === 'hh') { if (c.s.hour && c.s.num && !c.teaching) c.s.num = 0; /* tap the short hand again to choose again */ c.s.hour = true; c.tone([520, 660], 0.1); }
      else if (id === 'mh') { c.s.min = true; c.tone([660, 780], 0.1); }
      else if (id[0] === 's') {
        var k = parseInt(id.slice(1), 10);
        if (k === c.s.spots + 1) { c.s.spots = k; c.tone([500 + k * 30], 0.08); }
        else if (k > c.s.spots + 1) { c.say('Start at the top. Count by fives, one step at a time.'); return; }
        else return;
      } else return;
      c.render(); c.changed();
    },
    bar: function (c) { return c.Q.data.level === 3 ? [{ id: 'again', label: 'Count again', on: function (c2) { return c2.s.spots > 0; } }] : []; },
    button: function (c, id) { if (id === 'again') { c.s.spots = 0; c.render(); c.changed(); } },
    next: function (c) {
      var d = c.Q.data;
      var hA = ((d.h % 12) + d.m / 60) * 30, mA = d.m * 6;
      if (!c.s.hour) return { kind: 'tap', sel: '[data-tap="hh"]', from: handPt(hA, 0.3), say: d.level === 2 && d.m === 45 ? 'Tap the short hand. It is almost at the next number.' : (d.m === 0 ? 'Tap the short hand. It points to the hour.' : 'Tap the short hand. It has just passed the hour.') };
      if (c.s.num && c.s.num !== this.hourNum(c) && !this.wantNum(c)) return { kind: 'tap', sel: '[data-tap="hh"]', from: handPt(hA, 0.3), say: 'Look at the short hand again. Tap it to choose the number again.' };
      if (c.s.num !== this.hourNum(c)) { var hn = this.hourNum(c); return { kind: 'tap', sel: '[data-hand="h"]', target: 'n' + hn, from: handPt(hn * 30, 0.6), say: this.numSay(c) }; } /* the ring shows the short hand to look at, not the number */
      if (d.level < 3) {
        if (!c.s.min) {
          var say = d.m === 0 ? 'Tap the long hand. It points straight up to 12. That means o\'clock.' : d.m === 30 ? 'Tap the long hand. It points down to 6. Half way round. That means half past.' : d.m === 15 ? 'Tap the long hand. It points to 3. A quarter of the way round. That means quarter past.' : 'Tap the long hand. It points to 9. A quarter is left to go. That means quarter to.';
          return { kind: 'tap', sel: '[data-tap="mh"]', from: handPt(mA, 0.66), say: say };
        }
        return null;
      }
      if (c.s.spots < d.m / 5) return { kind: 'tap', sel: '[data-tap="s' + (c.s.spots + 1) + '"]', say: c.s.spots === 0 ? 'Now count the minutes by fives. Start at the top. Tap each dot until you reach the long hand.' : 'Tap the next dot. Count by fives.' };
      if (d.m === 0 && !c.s.min) return { kind: 'tap', sel: '[data-tap="mh"]', from: handPt(mA, 0.66), say: 'Tap the long hand. It points to 12. Zero minutes.' };
      return null;
    },
    hint: function (Q) {
      var d = Q.data;
      if (d.level === 0) return 'The short hand shows the hour. The long hand at 12 means o\'clock.';
      if (d.level === 1) return 'The long hand at 6 means half past. The short hand has just passed the hour.';
      if (d.level === 2) return 'Long hand at 3 means quarter past. Long hand at 9 means quarter to the next hour.';
      return 'Read the short hand for the hour. Then count by fives from 12 to the long hand.';
    },
    outro: function (Q) { return 'Now pick the time that matches the clock.'; }
  };
  BUILD.clockset = {
    vb: function () { return [400, 300]; },
    pick: function (c, id, p) { return pickHand(c, id, p, ['hh', 'mh']); },
    init: function (c) { var d = c.Q.data; c.s = { t: d.start }; },
    hm: function (c) { var t = ((c.s.t % 720) + 720) % 720, h = Math.floor(t / 60); return { h: h === 0 ? 12 : h, m: t % 60 }; },
    draw: function (c) { var x = this.hm(c); return clockFace({ cx: CK.cx, cy: CK.cy, r: CK.r, h: x.h, m: x.m, nums: 'all', hourDrag: true, minDrag: true }); },
    drag: function (c, ph, st, p) {
      if (ph !== 'move' && ph !== 'up') return;
      var a = angOf(c, p), x = this.hm(c);
      if (st.id === 'mh') {
        var mm = Math.round(a / 30) * 5 % 60;
        if (mm !== x.m) {
          var hh = x.h % 12;
          if (x.m >= 45 && mm <= 15) hh += 1;
          else if (x.m <= 15 && mm >= 45) hh -= 1;
          c.s.t = ((hh * 60 + mm) % 720 + 720) % 720;
        }
      } else {
        var h = Math.round(a / 30 - x.m / 60);
        h = ((h % 12) + 12) % 12;
        c.s.t = h * 60 + x.m;
      }
      c.render();
      if (ph === 'up') { c.tone([600], 0.08); c.changed(); }
    },
    bar: function (c) { return [{ id: 'back', label: '↺ Back', aria: 'Turn back' }, { id: 'fwd', label: 'Forward ↻', aria: 'Turn forward' }]; },
    button: function (c, id) { var st = CLOCK_STEP[c.Q.data.level]; c.s.t = ((c.s.t + (id === 'fwd' ? st : -st)) % 720 + 720) % 720; c.tone([600], 0.08); c.render(); c.changed(); },
    arc: function (fromA, toA, r) {
      var d = ((toA - fromA) % 360 + 540) % 360 - 180, pts = [];
      for (var i = 0; i <= 14; i++) { var a = (fromA + d * i / 14) * Math.PI / 180; pts.push({ x: CK.cx + r * Math.sin(a), y: CK.cy - r * Math.cos(a) }); }
      return pts;
    },
    next: function (c) {
      var d = c.Q.data, x = this.hm(c);
      if (x.m !== d.m) return { kind: 'path', sel: '[data-drag="mh"]', pts: this.arc(x.m * 6, d.m * 6, CK.r * 0.7), say: 'Turn the long hand to the ' + minuteWord(d.m) + '.' };
      if (x.h % 12 !== d.h % 12) {
        var say = d.m === 0 ? 'Now turn the short hand to the ' + d.h + '.' : (d.level === 2 && d.m === 45) ? 'Now turn the short hand to just before the ' + (d.h % 12 + 1) + '.' : 'Now turn the short hand to just past the ' + d.h + '.';
        return { kind: 'path', sel: '[data-drag="hh"]', pts: this.arc(((x.h % 12) + x.m / 60) * 30, ((d.h % 12) + d.m / 60) * 30, CK.r * 0.3), say: say };
      }
      return null;
    },
    hint: function (Q) {
      var d = Q.data;
      if (d.level === 0) return 'Make it on the big clock. Long hand to 12. Short hand to the hour. Then find the clock that looks the same.';
      if (d.level === 1) return 'Half past: the long hand goes to 6, and the short hand is just past the hour. Make it on the big clock first.';
      if (d.level === 2) return 'Quarter past: long hand on 3. Quarter to: long hand on 9. Make it on the big clock first.';
      return 'Each number on the clock is 5 minutes for the long hand. Make it on the big clock first, then compare.';
    },
    outro: function () { return 'Now find the clock that looks the same as yours.'; }
  };

  /* ================================================================
     QUESTION MAKERS
     ================================================================ */
  function choicesOf(list, ans) { return shuffle(list).map(function (v) { return typeof v === 'object' ? v : { value: v, label: v, html: '<span style="font-size:1.25em">' + esc(v) + '</span>' }; }); }
  function ribbonHTML(fill, label) { return '<span style="display:inline-flex;align-items:center;gap:8px"><svg viewBox="0 0 64 28" width="64" height="28" aria-hidden="true"><rect x="2" y="4" width="60" height="20" rx="7" fill="' + fill + '" stroke="#3b2a33" stroke-width="3"/></svg>' + label + '</span>'; }

  var genLength = [
    function () {
      var a, b, offA, offB, maxU = (392 - CMP.X0) / CMP.U, offL, offS, guard = 0;
      do { a = rnd(3, 8); b = rnd(3, 8); } while (Math.abs(a - b) < 2);
      var longId = a > b ? 'pink' : 'mint', L = Math.max(a, b), S = Math.min(a, b);
      /* both ribbons start away from the line; most times the shorter one ends further right, so lining up matters */
      var tricky = Math.random() < 0.75;
      do {
        offL = rnd(1, 3) * 0.5;
        offS = tricky ? offL + (L - S) + rnd(1, 3) * 0.5 : rnd(1, 6) * 0.5;
        if (++guard > 40) { tricky = false; }
      } while (offL + L > maxU || offS + S > maxU || (tricky && offS + S <= offL + L));
      offA = longId === 'pink' ? offL : offS; offB = longId === 'pink' ? offS : offL;
      var ask = Math.random() < 0.55 ? 'longer' : 'shorter', ans = ask === 'longer' ? longId : (longId === 'pink' ? 'mint' : 'pink');
      return {
        key: 'cmp:' + a + ':' + b + ':' + ask, say: 'Which ribbon is ' + ask + '?', show: 'Which is ' + ask + '?', answer: ans,
        input: { type: 'choice', choices: shuffle([{ value: 'pink', label: 'Pink', html: ribbonHTML(C.pink, 'Pink') }, { value: 'mint', label: 'Green', html: ribbonHTML(C.mint, 'Green') }]) },
        data: { kind: 'cmp', a: a, b: b, offA: offA, offB: offB, ask: ask }
      };
    },
    function () {
      var n = rnd(2, 10), unit = Math.random() < 0.5 ? 'cube' : 'clip';
      return { key: 'units:' + unit + ':' + n, say: 'How many ' + (unit === 'cube' ? 'cubes' : 'paper clips') + ' long is the ribbon?', show: 'How many ' + (unit === 'cube' ? 'cubes' : 'clips') + ' long?', answer: String(n), input: { type: 'number', unit: '' }, data: { kind: 'units', n: n, unit: unit } };
    },
    function () {
      var n = rnd(3, 9);
      return { key: 'iter:' + n, say: 'Use one cube. How many cubes long is the ribbon?', show: 'How many cubes long?', answer: String(n), input: { type: 'number', unit: '' }, data: { kind: 'iter', n: n } };
    },
    function () {
      /* ribbon start rl and ruler start rx both keep their whole drawing inside the picture, at least 1.5 cm apart */
      var len = rnd(2, 15), g = rulerGeom(len), rlHi = RW - RPAD - 2 - len * g.u - 30, rl, rx, guard = 0;
      do { rl = Math.round(g.lo + 4 + Math.random() * Math.max(0, rlHi - g.lo - 4)); rx = Math.round(g.lo + Math.random() * Math.max(0, g.hi - g.lo)); } while (Math.abs(rx - rl) < g.u * 1.5 && ++guard < 200);
      if (Math.abs(rx - rl) < g.u * 1.5) { rl = Math.round(g.lo + 4); rx = Math.floor(g.hi); }
      return { key: 'ruler:' + len, say: 'How long is the ribbon? Use the ruler.', show: 'How long? Use the ruler.', answer: String(len), input: { type: 'number', unit: 'cm' }, data: { kind: 'ruler', len: len, rl: rl, rx: rx } };
    },
    function () { return unitQ('len2'); },
    function () { return unitQ('len'); }
  ];
  var LEN_ITEMS = {
    cm: [{ key: 'pencil', svg: 'pencil', short: 'Pencil', the: 'a pencil', ask: 'How long is a pencil?' }, { key: 'strawberry', art: 'strawberry', short: 'Strawberry', the: 'a strawberry', ask: 'How long is a strawberry?' },
      { key: 'cookie', art: 'cookie', short: 'Cookie', the: 'a cookie', ask: 'How wide is a cookie?' }, { key: 'egg', art: 'egg', short: 'Egg', the: 'an egg', ask: 'How long is an egg?' },
      { key: 'candle', art: 'candle', short: 'Candle', the: 'a candle', ask: 'How tall is a candle?' }, { key: 'crayon_brush', svg: 'toothbrush', short: 'Toothbrush', the: 'a toothbrush', ask: 'How long is a toothbrush?' }],
    m: [{ key: 'door', art: 'door', short: 'Door', the: 'a door', ask: 'How tall is a door?' }, { key: 'bed', art: 'bed', short: 'Bed', the: 'a bed', ask: 'How long is a bed?' },
      { key: 'couch', art: 'couch', short: 'Couch', the: 'a couch', ask: 'How long is a couch?' }, { key: 'bus', svg: 'bus', short: 'School bus', the: 'a school bus', ask: 'How long is a school bus?' },
      { key: 'pool', svg: 'pool', short: 'Pool', the: 'a swimming pool', ask: 'How long is a swimming pool?' }],
    km: [{ key: 'car', svg: 'car', short: 'To Whistler', the: 'the drive to Whistler', ask: 'How far is the drive to Whistler?' }, { key: 'plane', svg: 'plane', short: 'To Hong Kong', the: 'the plane trip to Hong Kong', ask: 'How far is a plane trip to Hong Kong?' },
      { key: 'road', svg: 'road', short: 'To Seattle', the: 'the road to Seattle', ask: 'How far is the road to Seattle?' }]
  };
  var MASS_ITEMS = {
    g: [{ key: 'strawberry', art: 'strawberry', short: 'Strawberry', the: 'a strawberry' }, { key: 'cookie', art: 'cookie', short: 'Cookie', the: 'a cookie' }, { key: 'egg', art: 'egg', short: 'Egg', the: 'an egg' },
      { key: 'candy', art: 'candy', short: 'Candy', the: 'a candy' }, { key: 'cherries', art: 'cherries', short: 'Cherries', the: 'two cherries' }, { key: 'balloon', art: 'balloon', short: 'Balloon', the: 'a balloon' }],
    kg: [{ key: 'puppy', art: 'puppy', short: 'Dog', the: 'a dog' }, { key: 'panda', art: 'panda', short: 'Panda', the: 'a panda' }, { key: 'couch', art: 'couch', short: 'Couch', the: 'a couch' },
      { key: 'bed', art: 'bed', short: 'Bed', the: 'a bed' }, { key: 'bathtub', art: 'bathtub', short: 'Bathtub', the: 'a bathtub' }]
  };
  var CAP_ITEMS = {
    mL: [{ key: 'milk', art: 'milk', short: 'Glass of milk', the: 'a glass of milk' }, { key: 'cocoa', art: 'cocoa', short: 'Cup of cocoa', the: 'a cup of cocoa' },
      { key: 'bubbletea', art: 'bubbletea', short: 'Bubble tea', the: 'a bubble tea' }, { key: 'spoon', svg: 'spoon', short: 'Spoon', the: 'a medicine spoon' }],
    L: [{ key: 'bathtub', art: 'bathtub', short: 'Bathtub', the: 'a bathtub' }, { key: 'bucket', svg: 'bucket', short: 'Bucket', the: 'a bucket' },
      { key: 'pool', svg: 'pool', short: 'Pool', the: 'a swimming pool' }, { key: 'tank', svg: 'tank', short: 'Fish tank', the: 'a fish tank' }]
  };
  function unitQ(set) {
    var units = UNIT_SETS[set], ans = pick(units), pool = set === 'len' || set === 'len2' ? LEN_ITEMS : set === 'mass' ? MASS_ITEMS : CAP_ITEMS, item = pick(pool[ans]);
    var say, show;
    if (set === 'len2') { say = item.ask + ' Centimetres or metres?'; show = item.short + ': cm or m?'; }
    else if (set === 'len') { say = item.ask + ' Centimetres, metres, or kilometres?'; show = item.short + ': cm, m or km?'; }
    else if (set === 'mass') { say = 'How heavy is ' + item.the + '? Grams or kilograms?'; show = item.short + ': g or kg?'; }
    else { say = 'How much does ' + item.the + ' hold? Millilitres or litres?'; show = item.short + ': mL or L?'; }
    return {
      key: 'unit:' + set + ':' + item.key, say: say, show: show, answer: ans,
      input: { type: 'choice', choices: units.map(function (u) { return { value: u, label: u, html: '<span style="font-size:1.5em">' + u + '</span>' }; }) },
      data: { kind: 'unitpick', set: set, item: item, ans: ans }
    };
  }

  var genMass = [
    function () {
      var keys = Object.keys(MASS), L, R, same = Math.random() < 0.2;
      if (same) { L = R = pick(keys); }
      else { do { L = pick(keys); R = pick(keys); } while (L === R || Math.max(MASS[L].g, MASS[R].g) / Math.min(MASS[L].g, MASS[R].g) < 4); }
      var ask = Math.random() < 0.55 ? 'heavier' : 'lighter', ans;
      if (same) ans = 'same';
      else { var heavy = MASS[L].g > MASS[R].g ? 'left' : 'right'; ans = ask === 'heavier' ? heavy : (heavy === 'left' ? 'right' : 'left'); }
      var api0 = { ART: function (k) { return 'art/' + k + '.png'; } };
      var nameL = same ? 'Left ' + MASS[L].name.toLowerCase() : MASS[L].name, nameR = same ? 'Right ' + MASS[R].name.toLowerCase() : MASS[R].name;
      return {
        key: 'bal:' + L + ':' + R + ':' + ask, say: 'Which is ' + ask + '?', show: 'Which is ' + ask + '?', answer: ans,
        input: { type: 'choice', choices: [{ value: 'left', label: nameL, art: L }, { value: 'right', label: nameR, art: R }, { value: 'same', label: 'Same', html: '<span style="font-size:1.2em">Same</span>' }] },
        data: { kind: 'balance', left: L, right: R, ask: ask, gl: MASS[L].g, gr: MASS[R].g }
      };
    },
    function () { return unitQ('mass'); },
    function () { return unitQ('cap'); },
    function () {
      var n = rnd(2, 10);
      return { key: 'jug:' + n, say: 'This cup holds 100 millilitres. How much does the jug hold?', show: 'How many mL in the jug?', answer: String(n * 100), input: { type: 'number', unit: '' }, data: { kind: 'jug', n: n, cup: 100 } };
    }
  ];

  var SHAPES_G1 = [['##', '##'], ['###', '###'], ['##', '##', '##'], ['####'], ['###'], ['###', '###', '###'], ['##', '#.'], ['###', '#..'], ['###', '.#.'], ['##.', '.##'], ['####', '####'], ['#.', '##', '##'], ['###', '##.'], ['.#.', '###', '.#.']];
  var SHAPES_G3 = [['###', '###'], ['####', '####'], ['###', '###', '###'], ['#####', '#####'], ['####', '####', '####'], ['###', '###', '###', '###'], ['#####', '#####', '#####'],
    ['#..', '#..', '###'], ['####', '#...', '#...'], ['###', '###', '##.'], ['##..', '####', '####'], ['.##.', '####', '####'], ['####', '.##.', '.##.'], ['#####', '#####', '##...'],
    ['###', '#.#', '###'], ['####', '####', '####', '####']];
  function perimShapes() {
    var out = [];
    for (var w = 1; w <= 5; w++) for (var h = 1; h <= 4; h++) { if (w * h < 2) continue; var rows = []; for (var y = 0; y < h; y++) rows.push(new Array(w + 1).join('#')); out.push(rows); }
    out.push(['#.', '##'], ['#..', '###'], ['##.', '###'], ['#..', '#..', '###'], ['###', '#..'], ['##', '##', '#.'], ['####', '##..']);
    return out;
  }
  var genArea = [
    function () { var sh = pick(SHAPES_G1), cells = parseShape(sh); return { key: 'tile:' + sh.join('/'), say: 'Cover the shape with squares. How many squares?', show: 'How many squares cover it?', answer: String(cells.length), input: { type: 'number', unit: '' }, data: { kind: 'tile', cells: cells, rows: sh } }; },
    function () { var sh = pick(SHAPES_G3), cells = parseShape(sh); return { key: 'count:' + sh.join('/'), say: 'How many squares make this shape?', show: 'How many square units?', answer: String(cells.length), input: { type: 'number', unit: '' }, data: { kind: 'count', cells: cells, rows: sh } }; },
    function () { var sh = pick(perimShapes()), cells = parseShape(sh); return { key: 'perim:' + sh.join('/'), say: 'Walk Mimi all the way round. How many steps?', show: 'Steps all the way around?', answer: String(perimeterPath(cells).length - 1), input: { type: 'number', unit: '' }, data: { kind: 'perim', cells: cells, rows: sh } }; }
  ];

  var UNIT_ORDER = ['second', 'minute', 'hour', 'day', 'week', 'month', 'year'];
  var ACTS = [
    { key: 'teeth', svg: 'toothbrush', short: 'Brush teeth', the: 'brushing your teeth', n: 2, ans: 'minute', alt: 'hour', s: 'Brushing teeth' },
    { key: 'sleep', art: 'bed', short: 'Night sleep', the: 'a night of sleep', n: 10, ans: 'hour', alt: 'minute', s: 'A night of sleep' },
    { key: 'movie', art: 'tv', short: 'A movie', the: 'a movie', n: 2, ans: 'hour', alt: 'second', s: 'A movie' },
    { key: 'bath', art: 'bathtub', short: 'A bath', the: 'a bath', n: 15, ans: 'minute', alt: 'day', s: 'A bath' },
    { key: 'party', art: 'birthday', short: 'A party', the: 'a birthday party', n: 3, ans: 'hour', alt: 'week', s: 'A birthday party' },
    { key: 'grow', art: 'sunflower', short: 'Grow a flower', the: 'growing a sunflower', n: 3, ans: 'month', alt: 'minute', s: 'Growing a sunflower' },
    { key: 'icecream', art: 'icecream', short: 'Eat ice cream', the: 'eating an ice cream', n: 10, ans: 'minute', alt: 'day', s: 'Eating an ice cream' },
    { key: 'heart', art: 'heart', short: 'A heartbeat', the: 'one heartbeat', n: 1, ans: 'second', alt: 'hour', s: 'One heartbeat' },
    { key: 'summer', art: 'sunflower', short: 'Summer break', the: 'the summer holiday', n: 2, ans: 'month', alt: 'day', s: 'The summer holiday' },
    { key: 'cake', art: 'cake', short: 'Bake a cake', the: 'baking a cake', n: 1, ans: 'hour', alt: 'week', s: 'Baking a cake' }
  ];
  function aUnit(u) { return (u === 'hour' ? 'an ' : 'a ') + u; }
  function unitWord(u, n) { return n + ' ' + u + (n === 1 ? '' : 's'); }
  var genTime = [
    function () { var f = pick(Object.keys(FACTS)), F = FACTS[f]; return { key: 'fact:' + f, say: F.say, show: F.show, answer: String(F.ans), input: { type: 'number', unit: '' }, data: { kind: 'facts', fact: f } }; },
    function () {
      var i = rnd(0, 5), j = Math.min(6, i + rnd(1, 2)), a = UNIT_ORDER[i], b = UNIT_ORDER[j], pair = Math.random() < 0.5 ? [a, b] : [b, a];
      return { key: 'longer:' + a + ':' + b, say: 'Which is longer, ' + aUnit(pair[0]) + ' or ' + aUnit(pair[1]) + '?', show: 'Which is longer?', answer: b,
        input: { type: 'choice', choices: pair.map(function (u) { return { value: u, label: aUnit(u), html: '<span style="font-size:1.2em">1 ' + u + '</span>' }; }) },
        data: { kind: 'tcards', units: pair, longer: b } };
    },
    function () {
      var A = pick(ACTS), units = Math.random() < 0.5 ? [A.ans, A.alt] : [A.alt, A.ans];
      return { key: 'est:' + A.key, say: A.s + ' takes about ' + unitWord(units[0], A.n) + ' or ' + unitWord(units[1], A.n) + '?', show: A.short + ': how long?', answer: unitWord(A.ans, A.n),
        input: { type: 'choice', choices: units.map(function (u) { return { value: unitWord(u, A.n), label: unitWord(u, A.n), html: '<span style="font-size:1.2em">' + unitWord(u, A.n) + '</span>' }; }) },
        data: { kind: 'tcards', units: units, act: A, n: A.n, ans: A.ans } };
    }
  ];

  var CAL_MONTHS = (function () { var out = []; for (var k = 0; k < 12; k++) { var y = 2026 + Math.floor((8 + k) / 12), m = (8 + k) % 12; if (monthInfo(y, m).rows === 5) out.push([y, m]); } return out; })();
  var genCal = [
    function () {
      var s = rnd(0, 6), dir = Math.random() < 0.6 ? 'after' : 'before', t = dir === 'after' ? (s + 1) % 7 : (s + 6) % 7;
      var wrong = dir === 'after' ? [(s + 6) % 7, (s + 2) % 7] : [(s + 1) % 7, (s + 5) % 7];
      return { key: 'wd:' + s + ':' + dir, say: 'What day comes ' + dir + ' ' + DAYS[s] + '?', show: 'What day comes ' + dir + ' ' + DAYS[s] + '?', answer: DAYS[t],
        input: { type: 'choice', choices: shuffle([t].concat(wrong)).map(function (i) { return { value: DAYS[i], label: DAYS[i] }; }) }, data: { kind: 'ring', list: 'days', start: s, target: t, dir: dir } };
    },
    function () {
      var s = rnd(0, 11), dir = Math.random() < 0.6 ? 'after' : 'before', t = dir === 'after' ? (s + 1) % 12 : (s + 11) % 12;
      var wrong = dir === 'after' ? [(s + 11) % 12, (s + 2) % 12] : [(s + 1) % 12, (s + 10) % 12];
      return { key: 'mo:' + s + ':' + dir, say: 'What month comes ' + dir + ' ' + MONTHS[s] + '?', show: 'What month comes ' + dir + ' ' + MONTHS[s] + '?', answer: MONTHS[t],
        input: { type: 'choice', choices: shuffle([t].concat(wrong)).map(function (i) { return { value: MONTHS[i], label: MONTHS[i] }; }) }, data: { kind: 'ring', list: 'months', start: s, target: t, dir: dir } };
    },
    function () {
      var ym = pick(CAL_MONTHS), y = ym[0], mo = ym[1], mi = monthInfo(y, mo), type = Math.random() < 0.6 ? 'weekday' : 'party', today, target, k;
      if (type === 'weekday') { k = rnd(1, 6); today = rnd(1, mi.days - k); target = today + k; }
      else { k = rnd(2, 9); today = rnd(1, mi.days - k); target = today + k; }
      var twd = DAYS[(mi.first + today - 1) % 7], gwd = DAYS[(mi.first + target - 1) % 7], say, show;
      if (type === 'weekday') { say = 'Today is ' + twd + '. How many days until ' + gwd + '?'; show = 'Days until ' + gwd + '?'; }
      else { say = 'Today is the ' + ord(today) + '. The party is on the ' + ord(target) + '. How many days until the party?'; show = 'Days until the party?'; }
      return { key: 'cal:' + y + ':' + mo + ':' + today + ':' + target, say: say, show: show, answer: String(k), input: { type: 'number', unit: '' }, data: { kind: 'month', y: y, mo: mo, today: today, target: target, type: type } };
    }
  ];

  function clockQ(lv) {
    var h = rnd(1, 12), m;
    if (lv === 0) m = 0; else if (lv === 1) m = 30; else if (lv === 2) m = pick([15, 45]); else m = pick([5, 10, 20, 25, 35, 40, 50, 55, 15, 45]);
    var nx = h % 12 + 1, pv = (h + 10) % 12 + 1, alts, kind = Math.random() < 0.5 ? 'read' : 'set';
    if (lv === 0) alts = [[nx, 0], [12, 0]];
    else if (lv === 1) alts = [[nx, 30], [6, 0]];
    else if (lv === 2) alts = m === 15 ? [[pv, 45], [pv, 15]] : [[nx, 15], [pv, 45]];
    else alts = [[nx, m], [h, m / 5 === 1 ? 15 : m / 5]];
    if (lv === 0 && h === 12) alts[1] = [6, 0];
    if (lv === 3 && alts[1][1] === m) alts[1] = [h, (m + 10) % 60];
    if (lv === 3 && kind === 'set') alts[1] = [h, (m + 30) % 60];
    var target = phrase(h, m, lv);
    var all = [[h, m]].concat(alts), seen = {};
    all = all.filter(function (t) { var k = t[0] + ':' + t[1]; if (seen[k]) return false; seen[k] = 1; return true; });
    /* always three different times: fill with another time of the same kind */
    var mins = [[0], [30], [15, 45], [5, 10, 20, 25, 35, 40, 50, 55]][lv], guard = 0;
    while (all.length < 3 && ++guard < 100) { var t2 = [rnd(1, 12), pick(mins)]; if (!seen[t2[0] + ':' + t2[1]]) { seen[t2[0] + ':' + t2[1]] = 1; all.push(t2); } }
    if (kind === 'read') {
      return { key: 'clk:r:' + h + ':' + m, say: 'What time does the clock show?', show: 'What time is it?', answer: target,
        input: { type: 'choice', choices: shuffle(all).map(function (t) { var p = phrase(t[0], t[1], lv); return { value: p, label: p, html: '<span style="font-size:1.2em">' + p + '</span>' }; }) },
        data: { kind: 'clockread', h: h, m: m, level: lv } };
    }
    /* the big clock starts at another time: neither hand on the answer, the hour at least 2 away from the target hour and the next hour,
       and the minute on this level's button step so the buttons can reach the answer */
    var smins = [[30], [0], [0, 30], [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]][lv].filter(function (x) { return x !== m; }), sh, g2 = 0;
    var far = function (a, b) { var dd = Math.abs(a - b) % 12; return Math.min(dd, 12 - dd) >= 2; };
    /* and the two hands are apart, so she can see both of them */
    var apart = function (t) { var ha = (t / 2) % 360, ma = (t % 60) * 6, dd = Math.abs(ha - ma) % 360; return Math.min(dd, 360 - dd) >= 25; }, start;
    /* and the short hand really sits away from the answer: at least 60 degrees (two hour marks) from where it must end up */
    var tha = ((h % 12) + m / 60) * 30, hourGap = function (t) { var dd = Math.abs((t / 2) % 360 - tha) % 360; return Math.min(dd, 360 - dd) >= 60; };
    do { sh = rnd(1, 12); start = (sh % 12) * 60 + pick(smins); } while ((!far(sh, h) || !far(sh, h % 12 + 1) || !apart(start) || !hourGap(start)) && ++g2 < 400);
    return { key: 'clk:s:' + h + ':' + m, say: 'Make the big clock show ' + target + '. Which clock shows ' + target + '?', show: 'Which clock shows ' + target + '?', answer: h + ':' + pad2(m),
      input: { type: 'choice', choices: shuffle(all).map(function (t) { return { value: t[0] + ':' + pad2(t[1]), label: 'Clock', html: clockHTML(t[0], t[1]) }; }) },
      data: { kind: 'clockset', h: h, m: m, level: lv, start: start } };
  }

  /* ================================================================
     ICONS (64 x 64)
     ================================================================ */
  var ICON = {
    length: '<svg viewBox="0 0 64 64" xmlns="' + NS + '"><g transform="rotate(-30 32 32)"><rect x="4" y="22" width="56" height="20" rx="5" fill="#f0bf87" ' + SK + '/><path d="M12 22v9M20 22v6M28 22v9M36 22v6M44 22v9M52 22v6" stroke="#3b2a33" stroke-width="2.5" stroke-linecap="round"/></g></svg>',
    mass_capacity: '<svg viewBox="0 0 64 64" xmlns="' + NS + '"><path d="M22 58h20l-4-6H26z" fill="#a98bff" ' + SK + '/><rect x="30" y="16" width="4" height="38" fill="#3b2a33"/><line x1="8" y1="16" x2="56" y2="16" stroke="#3b2a33" stroke-width="5" stroke-linecap="round"/><path d="M2 34h20a10 6 0 0 1-20 0zM42 34h20a10 6 0 0 1-20 0z" fill="#ffc94a" ' + SK + '/><path d="M8 16 4 34M8 16l12 18M56 16l-12 18M56 16l4 18" stroke="#3b2a33" stroke-width="2"/><circle cx="32" cy="16" r="4" fill="#ff6f9f" stroke="#3b2a33" stroke-width="2.5"/></svg>',
    area: '<svg viewBox="0 0 64 64" xmlns="' + NS + '"><rect x="6" y="6" width="25" height="25" rx="5" fill="#ff6f9f" ' + SK + '/><rect x="33" y="6" width="25" height="25" rx="5" fill="#ffc94a" ' + SK + '/><rect x="6" y="33" width="25" height="25" rx="5" fill="#63d3b3" ' + SK + '/><rect x="33" y="33" width="25" height="25" rx="5" fill="#74c8ff" ' + SK + '/></svg>',
    time_units: '<svg viewBox="0 0 64 64" xmlns="' + NS + '"><rect x="12" y="4" width="40" height="8" rx="4" fill="#a98bff" ' + SK + '/><rect x="12" y="52" width="40" height="8" rx="4" fill="#a98bff" ' + SK + '/><path d="M17 12h30c0 12-11 15-11 20s11 8 11 20H17c0-12 11-15 11-20s-11-8-11-20z" fill="#e0f3ff" ' + SK + '/><path d="M24 48h16c-2-6-6-8-8-8s-6 2-8 8zM23 18h18c-2 4-6 6-9 8-3-2-7-4-9-8z" fill="#ffc94a"/></svg>',
    /* a calendar page: three weeks, 7 days in every row, like a real calendar */
    calendar: '<svg viewBox="0 0 64 64" xmlns="' + NS + '"><rect x="4" y="10" width="56" height="48" rx="8" fill="#fff" ' + SK + '/><rect x="4" y="10" width="56" height="15" rx="8" fill="#ff6f9f" ' + SK + '/><path d="M18 5v10M46 5v10" stroke="#3b2a33" stroke-width="4" stroke-linecap="round"/><rect x="8.9" y="30" width="5.4" height="5.4" rx="1.4" fill="#3b2a33"/><rect x="15.7" y="30" width="5.4" height="5.4" rx="1.4" fill="#3b2a33"/><rect x="22.5" y="30" width="5.4" height="5.4" rx="1.4" fill="#3b2a33"/><rect x="29.3" y="30" width="5.4" height="5.4" rx="1.4" fill="#3b2a33"/><rect x="36.1" y="30" width="5.4" height="5.4" rx="1.4" fill="#3b2a33"/><rect x="42.9" y="30" width="5.4" height="5.4" rx="1.4" fill="#3b2a33"/><rect x="49.7" y="30" width="5.4" height="5.4" rx="1.4" fill="#3b2a33"/><rect x="8.9" y="39" width="5.4" height="5.4" rx="1.4" fill="#3b2a33"/><rect x="15.7" y="39" width="5.4" height="5.4" rx="1.4" fill="#3b2a33"/><rect x="22.5" y="39" width="5.4" height="5.4" rx="1.4" fill="#3b2a33"/><rect x="29.3" y="39" width="5.4" height="5.4" rx="1.4" fill="#ff6f9f" stroke="#3b2a33" stroke-width="1.2"/><rect x="36.1" y="39" width="5.4" height="5.4" rx="1.4" fill="#3b2a33"/><rect x="42.9" y="39" width="5.4" height="5.4" rx="1.4" fill="#3b2a33"/><rect x="49.7" y="39" width="5.4" height="5.4" rx="1.4" fill="#3b2a33"/><rect x="8.9" y="48" width="5.4" height="5.4" rx="1.4" fill="#3b2a33"/><rect x="15.7" y="48" width="5.4" height="5.4" rx="1.4" fill="#3b2a33"/><rect x="22.5" y="48" width="5.4" height="5.4" rx="1.4" fill="#3b2a33"/><rect x="29.3" y="48" width="5.4" height="5.4" rx="1.4" fill="#3b2a33"/><rect x="36.1" y="48" width="5.4" height="5.4" rx="1.4" fill="#3b2a33"/><rect x="42.9" y="48" width="5.4" height="5.4" rx="1.4" fill="#3b2a33"/><rect x="49.7" y="48" width="5.4" height="5.4" rx="1.4" fill="#3b2a33"/></svg>',
    clock: '<svg viewBox="0 0 64 64" xmlns="' + NS + '"><circle cx="32" cy="34" r="27" fill="#ff6f9f" ' + SK + '/><circle cx="32" cy="34" r="21" fill="#fff" stroke="#3b2a33" stroke-width="2.5"/><path d="M32 34V18M32 34l9 6" stroke="#3b2a33" stroke-width="4.5" stroke-linecap="round"/><circle cx="32" cy="34" r="3.5" fill="#ffc94a" stroke="#3b2a33" stroke-width="2"/></svg>'
  };

  /* ================================================================
     TOPICS
     ================================================================ */
  function levelIndex(level, levels) {
    if (typeof level === 'number' && isFinite(level)) return clamp(Math.floor(level), 0, levels.length - 1);
    if (typeof level === 'string' && /^\d+$/.test(level)) return clamp(parseInt(level, 10), 0, levels.length - 1);
    if (level && typeof level === 'object') { var i = levels.indexOf(level); if (i >= 0) return i; for (var j = 0; j < levels.length; j++) if (levels[j].name === level.name) return j; }
    return 0;
  }
  /* choice html for balance items needs the host's art path, so it is filled at make() time from the first mount api if known */
  function makeTopic(def) {
    return {
      id: def.id, title: def.title, icon: ICON[def.id], strand: 'Measurement', levels: def.levels,
      make: function (level, prev) {
        var i = levelIndex(level, def.levels), q, n = 0;
        do { q = def.gens[i](); n++; } while (prev && prev.key && q.key === prev.key && n < 60);
        q.data.level = q.data.level === undefined ? i : q.data.level;
        q.data.topic = def.id;
        if (q.input.choices) q.input.choices.forEach(function (ch) { if (ch.art) { ch.html = '<span style="display:inline-flex;flex-direction:column;align-items:center;gap:2px"><img src="' + esc(artPath(ch.art)) + '" width="48" height="48" alt="" draggable="false"><span>' + esc(ch.label) + '</span></span>'; delete ch.art; } });
        return q;
      },
      mount: function (el, Q, api) { if (api && api.ART) lastART = api.ART; return mountQ(el, Q, api); },
      hint: function (Q, tries) { return BUILD[Q.data.kind].hint(Q, tries || 0); },
      teach: function (Q, el, api) { if (api && api.ART) lastART = api.ART; return teachQ(Q, el, api); }
    };
  }
  var lastART = null;
  function artPath(k) { try { if (lastART) return lastART(k); } catch (e) { } return (window.MathTopicsART ? window.MathTopicsART(k) : 'art/' + k + '.png'); }

  var LV_CLOCK_NOTE = 'Grade 4 extension - not in BC Grade 3';
  var DEFS = [
    { id: 'length', title: 'Long and short', gens: genLength, levels: [
      { name: 'Longer or shorter', grade: 1, note: 'BC Grade 1 direct measurement: compare two lengths from a baseline.' },
      { name: 'Cubes in a row', grade: 1, note: 'BC Grade 1: measure with cubes or paper clips laid end to end.' },
      { name: 'One cube, step by step', grade: 1, note: 'BC Grade 1: iterate a single unit along the length.' },
      { name: 'Ruler in cm', grade: 2, note: 'BC Grade 2: measure in centimetres with a ruler, 2 to 15 cm.' },
      { name: 'cm or m', grade: 2, note: 'BC Grade 2: centimetres and metres.' },
      { name: 'cm, m or km', grade: 3, note: 'BC Grade 3: centimetres, metres and kilometres.' }] },
    { id: 'mass_capacity', title: 'Heavy and full', gens: genMass, levels: [
      { name: 'Heavier or lighter', grade: 1, note: 'BC Grades 1-3: compare mass on a pan balance.' },
      { name: 'g or kg', grade: 3, note: 'BC Grade 3: grams and kilograms.' },
      { name: 'mL or L', grade: 3, note: 'BC Grade 3: millilitres and litres.' },
      { name: 'Fill the jug', grade: 3, note: 'BC Grade 3: estimate with a referent (a 100 mL cup).' }] },
    { id: 'area', title: 'Squares and edges', gens: genArea, levels: [
      { name: 'Cover with squares', grade: 1, note: 'BC Grade 1: tile an area.' },
      { name: 'Count the squares', grade: 3, note: 'BC Grade 3: area in square units.' },
      { name: 'Walk around', grade: 3, note: 'BC Grade 3: the idea of perimeter, the distance around. No formulas.' }] },
    { id: 'time_units', title: 'Units of time', gens: genTime, levels: [
      { name: 'Time facts', grade: 3, note: 'BC Grade 3: second, minute, hour, day, week, month, year.' },
      { name: 'Which is longer', grade: 3, note: 'BC Grade 3: how the units of time relate.' },
      { name: 'About how long', grade: 3, note: 'BC Grade 3: estimating time.' }] },
    { id: 'calendar', title: 'The calendar', gens: genCal, levels: [
      { name: 'Days of the week', grade: 3, note: 'BC Grade 3 time units: days and weeks.' },
      { name: 'Months of the year', grade: 3, note: 'BC Grade 3 time units: months and years.' },
      { name: 'Read a calendar', grade: 3, note: 'BC Grade 3 time units: count days on a month calendar.' }] },
    { id: 'clock', title: 'Tell the time', gens: [function () { return clockQ(0); }, function () { return clockQ(1); }, function () { return clockQ(2); }, function () { return clockQ(3); }], levels: [
      { name: 'O\'clock', grade: 3, note: LV_CLOCK_NOTE },
      { name: 'Half past', grade: 3, note: LV_CLOCK_NOTE },
      { name: 'Quarter past and to', grade: 3, note: LV_CLOCK_NOTE },
      { name: '5-minute steps', grade: 3, note: LV_CLOCK_NOTE }] }
  ];
  DEFS.forEach(function (d) {
    for (var i = TOPICS.length - 1; i >= 0; i--) if (TOPICS[i] && TOPICS[i].id === d.id) TOPICS.splice(i, 1);
    TOPICS.push(makeTopic(d));
  });
})();
