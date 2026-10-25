/* castle_grounds.js - "My Grounds" in Kennedy's Knight Castle World (Kids Maths). Loaded before castle_world.js, which calls
 * CastleGrounds.scene(sc, api) and CastleGrounds.thumb(card, api).
 *
 * A wide green ground under his castle. He buys things once (tap a picture button, tap a thing), then places as many as he likes:
 * drag to put one where he wants it, drag it onto the bin to put it away. A thing that was paid for stays his.
 * 26 things in 4 groups: houses, farm, fun and nature. Tap a placed thing and it does its own little job:
 * the windmill turns, the bell rings, the forge sparks, the well splashes, the catapult tosses a pillow, the hen hops,
 * the tree drops an apple, the campfire flickers. Nothing here can be lost or lose.
 * No words on any button. Every picture is drawn in code (inline SVG), nothing is downloaded.
 * Saved in wctx.data.castle.grounds = { owned: { id: true }, items: [{ id, t, x, y }] } (x, y are 0..1 of the play field).
 * Test data on .cw-root: data-things (how many are placed), data-owned.
 */
(function () {
  "use strict";

  var INK = "#3b2a33", MAX_THINGS = 40, BAR_H = 112, MIN_PX = 72;
  var NS = 'xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"';
  var ST = ' stroke="' + INK + '" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"';
  function svg(inner) { return "<svg " + NS + ">" + '<ellipse cx="100" cy="190" rx="72" ry="8" fill="rgba(59,42,51,.16)"/>' + inner + "</svg>"; }
  function rect(x, y, w, h, f, r) { return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + (r || 0) + '" fill="' + f + '"' + ST + "/>"; }
  function circ(x, y, r, f, cls) { return '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="' + f + '"' + ST + (cls ? ' class="' + cls + '"' : "") + "/>"; }
  function poly(pts, f, cls) { return '<polygon points="' + pts + '" fill="' + f + '"' + ST + (cls ? ' class="' + cls + '"' : "") + "/>"; }
  function path(d, f, extra) { return '<path d="' + d + '" fill="' + f + '"' + ST + (extra || "") + "/>"; }
  function line(x1, y1, x2, y2, w, c) { return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="' + (c || INK) + '" stroke-width="' + (w || 4) + '" stroke-linecap="round"/>'; }
  function ell(x, y, rx, ry, f) { return '<ellipse cx="' + x + '" cy="' + y + '" rx="' + rx + '" ry="' + ry + '" fill="' + f + '"' + ST + "/>"; }
  function bricks(x, y, w, h) {
    var s = "";
    for (var r = 0; r < h / 16; r++) { s += line(x + 3, y + 8 + r * 16, x + w - 3, y + 8 + r * 16, 1.6, "rgba(59,42,51,.35)"); }
    return s;
  }

  /* id: { g: group, price, w (share of the field width), act, name (for the screen reader only), art } */
  var T = {
    cottage: { g: "house", price: 25, w: 0.24, act: "bounce", name: "a cottage", art: function () {
      return svg(rect(40, 100, 120, 85, "#f6e3c0") + poly("28,106 100,44 172,106", "#c0584f") + rect(134, 58, 18, 36, "#b9b2a8") +
        rect(88, 134, 26, 51, "#8a5a36", 12) + circ(107, 160, 3, "#f2c14e") + rect(52, 118, 24, 24, "#cfe8f7") + line(64, 118, 64, 142, 3) + line(52, 130, 76, 130, 3) +
        rect(126, 118, 24, 24, "#cfe8f7") + line(138, 118, 138, 142, 3) + line(126, 130, 150, 130, 3)); } },
    tent: { g: "house", price: 12, w: 0.2, act: "bounce", name: "a tent", art: function () {
      return svg(poly("100,52 22,186 178,186", "#e46b6b") + poly("100,52 100,186 60,186", "#f08a8a") + poly("100,112 76,186 124,186", "#5a3a2a") +
        line(100, 52, 100, 26, 4) + poly("100,26 126,34 100,42", "#f2c14e")); } },
    windmill: { g: "house", price: 40, w: 0.22, act: "spin", name: "a windmill", art: function () {
      var b = ""; for (var k = 0; k < 4; k++) { b += '<g transform="rotate(' + (k * 90) + ' 100 78)">' + rect(91, 14, 18, 62, "#fff8e6", 3) + line(100, 20, 100, 70, 2, "rgba(59,42,51,.4)") + "</g>"; }
      return svg(poly("68,186 80,84 120,84 132,186", "#f3e6cf") + bricks(76, 100, 48, 80) + rect(88, 140, 24, 46, "#8a5a36", 10) + poly("66,88 100,56 134,88", "#8b5a3b") +
        '<g class="sp" style="transform-origin:100px 78px">' + b + "</g>" + circ(100, 78, 9, "#f2c14e")); } },
    bell: { g: "house", price: 30, w: 0.15, act: "swing", name: "a bell tower", art: function () {
      return svg(rect(66, 76, 68, 110, "#cfd6df") + bricks(66, 84, 68, 96) + poly("56,80 100,30 144,80", "#3a5a9a") + rect(80, 90, 40, 46, "#4d4660", 14) +
        '<g class="sw" style="transform-origin:100px 96px">' + path("M86,128 Q86,102 100,102 Q114,102 114,128 Z", "#f2c14e") + circ(100, 130, 4, INK) + "</g>" + rect(88, 150, 24, 36, "#8a5a36", 10)); } },
    forge: { g: "house", price: 35, w: 0.22, act: "sparks", name: "a forge", art: function () {
      return svg(rect(130, 48, 24, 56, "#8c8479") + rect(32, 108, 136, 78, "#b9b2a8") + bricks(32, 114, 136, 66) + rect(24, 92, 152, 22, "#7a4a2a", 4) +
        path("M68,186 L68,146 Q100,120 132,146 L132,186 Z", INK) + path("M84,186 Q80,164 100,150 Q120,164 116,186 Z", "#ff9a3c", ' class="fire"') + path("M94,186 Q92,172 100,164 Q110,172 106,186 Z", "#ffe27a") +
        rect(144, 170, 30, 10, "#6b6b78", 3) + rect(152, 180, 14, 6, "#6b6b78", 2)); } },
    stall: { g: "house", price: 18, w: 0.18, act: "bounce", name: "a market stall", art: function () {
      var s = ""; for (var k = 0; k < 6; k++) { s += poly((28 + k * 24) + ",92 " + (52 + k * 24) + ",92 " + (50 + k * 22) + ",62 " + (30 + k * 23) + ",62", k % 2 ? "#fff8e6" : "#e46b6b"); }
      return svg(line(36, 92, 36, 186, 6, "#8a5a36") + line(164, 92, 164, 186, 6, "#8a5a36") + rect(30, 132, 140, 22, "#b07a4a", 3) + line(46, 154, 46, 186, 6, "#8a5a36") + line(154, 154, 154, 186, 6, "#8a5a36") + s +
        circ(62, 122, 10, "#e84a4a") + circ(86, 124, 10, "#e84a4a") + circ(110, 122, 10, "#f2c14e") + circ(134, 124, 10, "#7cc576")); } },
    haystack: { g: "farm", price: 6, w: 0.12, act: "bounce", name: "a haystack", art: function () {
      return svg(path("M36,186 Q34,110 100,84 Q166,110 164,186 Z", "#f0cf6b") + line(60, 170, 74, 120, 2, "rgba(59,42,51,.4)") + line(100, 176, 100, 100, 2, "rgba(59,42,51,.4)") + line(140, 170, 126, 120, 2, "rgba(59,42,51,.4)")); } },
    barrel: { g: "farm", price: 5, w: 0.1, act: "bounce", name: "a barrel", art: function () {
      return svg(path("M58,184 Q46,140 58,100 L142,100 Q154,140 142,184 Z", "#a8703e") + rect(54, 118, 92, 8, "#6e6a76", 3) + rect(54, 158, 92, 8, "#6e6a76", 3) + ell(100, 100, 42, 10, "#c48a54")); } },
    cart: { g: "farm", price: 14, w: 0.17, act: "roll", name: "a cart", art: function () {
      var sp = ""; for (var k = 0; k < 4; k++) { sp += '<line x1="100" y1="160" x2="100" y2="136" stroke="' + INK + '" stroke-width="3" transform="rotate(' + (k * 45) + ' 100 160)"/><line x1="100" y1="160" x2="100" y2="184" stroke="' + INK + '" stroke-width="3" transform="rotate(' + (k * 45) + ' 100 160)"/>'; }
      return svg(path("M34,116 L166,116 L152,156 L48,156 Z", "#b07a4a") + ell(100, 112, 58, 12, "#f0cf6b") + line(166, 124, 188, 104, 5, "#8a5a36") +
        '<g class="wh" style="transform-origin:100px 160px">' + circ(100, 160, 25, "#8a5a36") + sp + circ(100, 160, 5, "#f2c14e") + "</g>"); } },
    coop: { g: "farm", price: 16, w: 0.16, act: "hop", name: "a hen house", art: function () {
      return svg(rect(40, 112, 92, 74, "#e9a96b") + poly("30,116 86,70 142,116", "#7a4a2a") + path("M62,186 L62,150 Q86,128 110,150 L110,186 Z", INK) +
        '<g class="hen">' + ell(158, 168, 18, 16, "#fffdf8") + circ(168, 148, 10, "#fffdf8") + poly("177,148 188,152 177,155", "#f2a03d") + circ(171, 146, 2, INK) + path("M165,138 Q168,130 172,138 Z", "#e84a4a") + "</g>"); } },
    well: { g: "farm", price: 14, w: 0.13, act: "splash", name: "a well", art: function () {
      return svg(rect(58, 118, 84, 68, "#bfc5cc") + bricks(58, 124, 84, 56) + ell(100, 118, 42, 10, "#5aa8d6") + line(64, 118, 64, 62, 6, "#8a5a36") + line(136, 118, 136, 62, 6, "#8a5a36") +
        poly("50,66 100,34 150,66", "#8b5a3b") + line(100, 62, 100, 100, 3) + rect(92, 98, 16, 16, "#a8703e", 3)); } },
    fence: { g: "farm", price: 4, w: 0.18, act: "bounce", name: "a fence", art: function () {
      var p = ""; [26, 74, 122, 170].forEach(function (x) { p += rect(x - 8, 110, 16, 76, "#c9955a", 4) + poly((x - 8) + ",110 " + x + ",98 " + (x + 8) + ",110", "#c9955a"); });
      return svg(rect(18, 126, 164, 12, "#b07a4a", 3) + rect(18, 156, 164, 12, "#b07a4a", 3) + p); } },
    scarecrow: { g: "farm", price: 10, w: 0.12, act: "swing", name: "a scarecrow", art: function () {
      return svg(line(100, 70, 100, 186, 7, "#8a5a36") + '<g class="sw" style="transform-origin:100px 100px">' + line(40, 102, 160, 102, 7, "#8a5a36") + rect(72, 90, 56, 54, "#5aa0d0", 8) + circ(100, 70, 22, "#f0cf6b") +
        poly("74,62 126,62 112,36 88,36", "#7a4a2a") + rect(70, 56, 60, 9, "#7a4a2a", 3) + circ(92, 72, 3, INK) + circ(108, 72, 3, INK) + line(92, 82, 108, 82, 3) + "</g>"); } },
    catapult: { g: "fun", price: 38, w: 0.22, act: "launch", name: "a catapult", art: function () {
      return svg(rect(30, 150, 140, 18, "#8a5a36", 4) + circ(56, 176, 14, "#6e4a2a") + circ(144, 176, 14, "#6e4a2a") + poly("92,150 108,150 108,104 92,104", "#8a5a36") +
        '<g class="arm" style="transform-origin:100px 108px">' + line(100, 108, 36, 62, 9, "#a8703e") + path("M24,56 Q36,80 52,66 Z", "#6e4a2a") + "</g>"); } },
    target: { g: "fun", price: 12, w: 0.14, act: "arrow", name: "an archery target", art: function () {
      return svg(line(70, 186, 100, 110, 6, "#8a5a36") + line(130, 186, 100, 110, 6, "#8a5a36") + circ(100, 90, 52, "#fffdf8") + circ(100, 90, 40, "#e84a4a") + circ(100, 90, 28, "#fffdf8") + circ(100, 90, 16, "#e84a4a") + circ(100, 90, 6, "#f2c14e")); } },
    campfire: { g: "fun", price: 8, w: 0.1, act: "sparks", name: "a campfire", art: function () {
      return svg(rect(54, 164, 92, 16, "#8a5a36", 7) + rect(66, 152, 68, 14, "#a8703e", 6) + path("M64,160 Q56,120 86,92 Q84,122 100,110 Q104,70 124,60 Q122,100 140,116 Q154,142 136,160 Z", "#ff9a3c", ' class="fire"') +
        path("M82,158 Q80,134 100,122 Q116,134 118,158 Z", "#ffe27a")); } },
    pole: { g: "fun", price: 8, w: 0.08, act: "swing", name: "a flag pole", art: function () {
      return svg(line(86, 186, 86, 20, 6, "#8a5a36") + circ(86, 18, 7, "#f2c14e") + '<g class="sw" style="transform-origin:90px 40px">' + path("M90,34 L170,34 L170,108 L130,90 L90,108 Z", "#3a5a9a") +
        poly("130,48 134,60 147,60 137,68 141,81 130,73 119,81 123,68 113,60 126,60", "#f2c14e") + "</g>"); } },
    statue: { g: "fun", price: 45, w: 0.14, act: "shine", name: "a knight statue", art: function () {
      return svg(rect(54, 150, 92, 36, "#cfd6df", 4) + rect(70, 98, 60, 54, "#a9b0bb", 8) + circ(100, 70, 24, "#a9b0bb") + rect(80, 62, 40, 10, INK, 3) + path("M78,52 Q100,26 122,52", "#a9b0bb") +
        line(144, 154, 144, 70, 6, "#8e96a3") + line(132, 92, 156, 92, 6, "#8e96a3") + '<g class="shn"><circle cx="94" cy="104" r="6" fill="#fff" opacity=".7"/></g>'); } },
    fountain: { g: "fun", price: 30, w: 0.2, act: "splash", name: "a fountain", art: function () {
      return svg(ell(100, 166, 76, 20, "#bfc5cc") + ell(100, 162, 62, 14, "#8fd0ef") + rect(90, 108, 20, 52, "#cfd6df", 3) + ell(100, 108, 32, 9, "#bfc5cc") + ell(100, 106, 24, 6, "#8fd0ef") +
        '<g class="jet">' + '<path d="M100,104 Q100,64 78,78 M100,104 Q100,56 100,48 M100,104 Q100,64 122,78" fill="none" stroke="#5aa8d6" stroke-width="5" stroke-linecap="round"/>' + "</g>"); } },
    tree: { g: "nature", price: 8, w: 0.17, act: "drop", name: "an apple tree", art: function () {
      return svg(rect(88, 112, 24, 74, "#8a5a36", 4) + circ(100, 78, 46, "#7cc576") + circ(66, 98, 30, "#6bb865") + circ(134, 98, 30, "#6bb865") +
        circ(82, 70, 6, "#e84a4a") + circ(116, 86, 6, "#e84a4a") + circ(100, 52, 6, "#e84a4a") + circ(70, 104, 6, "#e84a4a")); } },
    pine: { g: "nature", price: 6, w: 0.13, act: "sway", name: "a pine tree", art: function () {
      return svg(rect(92, 150, 16, 36, "#8a5a36", 3) + poly("100,86 50,156 150,156", "#4f9a63") + poly("100,52 58,120 142,120", "#5cae70") + poly("100,18 68,84 132,84", "#6bc07c")); } },
    flowers: { g: "nature", price: 4, w: 0.1, act: "sway", name: "flowers", art: function () {
      var f = ""; [[58, 140, "#ff8fb0"], [100, 124, "#ffd45a"], [144, 142, "#b79bff"], [78, 160, "#ffd45a"], [124, 164, "#ff8fb0"]].forEach(function (p) {
        f += line(p[0], p[1], p[0], 184, 4, "#4f9a63") + circ(p[0], p[1], 13, p[2]) + circ(p[0], p[1], 5, "#fff3b0"); });
      return svg(ell(100, 184, 66, 12, "#7cc576") + f); } },
    pond: { g: "nature", price: 14, w: 0.2, act: "splash", name: "a pond with a duck", art: function () {
      return svg(ell(100, 158, 84, 30, "#8fd0ef") + ell(70, 166, 16, 7, "#7cc576") + ell(146, 154, 12, 5, "#7cc576") + '<g class="duck">' + ell(104, 150, 22, 14, "#ffe27a") + circ(122, 134, 11, "#ffe27a") +
        poly("131,134 144,138 131,142", "#f2a03d") + circ(125, 131, 2, INK) + "</g>"); } },
    bench: { g: "nature", price: 6, w: 0.11, act: "bounce", name: "a bench", art: function () {
      return svg(rect(40, 112, 120, 14, "#b07a4a", 3) + rect(40, 138, 120, 16, "#c9955a", 3) + line(52, 154, 52, 186, 6, "#8a5a36") + line(148, 154, 148, 186, 6, "#8a5a36") + line(52, 112, 52, 138, 5, "#8a5a36") + line(148, 112, 148, 138, 5, "#8a5a36")); } },
    rock: { g: "nature", price: 3, w: 0.09, act: "bounce", name: "a rock", art: function () {
      return svg(path("M40,184 Q36,140 70,122 Q104,98 134,126 Q168,150 160,184 Z", "#a9b0bb") + '<path d="M70,150 Q86,134 104,142" fill="none" stroke="rgba(59,42,51,.4)" stroke-width="3" stroke-linecap="round"/>'); } },
    bush: { g: "nature", price: 5, w: 0.1, act: "sway", name: "a berry bush", art: function () {
      return svg(circ(70, 150, 32, "#6bb865") + circ(130, 150, 32, "#6bb865") + circ(100, 128, 38, "#7cc576") + circ(88, 130, 5, "#e84a4a") + circ(116, 142, 5, "#e84a4a") + circ(72, 156, 5, "#e84a4a") + circ(134, 158, 5, "#e84a4a")); } }
  };
  var GROUPS = [
    { id: "house", pic: "cottage" }, { id: "farm", pic: "haystack" }, { id: "fun", pic: "catapult" }, { id: "nature", pic: "tree" }
  ];
  var CACHE = {};
  function markup(id) { return CACHE[id] || (CACHE[id] = T[id].art()); }
  function dataUri(id) { return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(markup(id)); }

  var CSS = [
    ".cg-sky{position:absolute;inset:0;background:linear-gradient(#cfe6f7 0,#eaf4fb 34%,#bfe3a8 34%,#8cc47a 100%)}",
    ".cg-hills{position:absolute;left:0;right:0;top:24%;height:11%;background:radial-gradient(60% 100% at 20% 100%,#a9d49a 98%,transparent 100%),radial-gradient(55% 100% at 78% 100%,#9acb8c 98%,transparent 100%)}",
    ".cg-castle{position:absolute;left:0;right:0;top:3%;height:33%;pointer-events:none}",
    ".cg-path{position:absolute;left:50%;bottom:0;top:35%;width:26%;transform:translateX(-50%);background:linear-gradient(#ecd9a8,#e3cc94);clip-path:polygon(40% 0,60% 0,100% 100%,0 100%);opacity:.9}",
    ".cg-field{position:absolute;left:0;right:0;top:36%;bottom:" + BAR_H + "px;touch-action:none;z-index:1;isolation:isolate}",
    ".cg-thing{position:absolute;transform:translate(-50%,-100%);touch-action:none;cursor:grab;-webkit-tap-highlight-color:transparent}",
    ".cg-thing svg{display:block;width:100%;height:auto;pointer-events:none;overflow:visible}",
    ".cg-thing.drag{cursor:grabbing;filter:drop-shadow(0 10px 8px rgba(59,42,51,.3));scale:1.06}",
    ".cg-thing.new{animation:cgpop .6s cubic-bezier(.3,1.6,.5,1) both}",
    "@keyframes cgpop{0%{opacity:0;scale:.5}100%{opacity:1;scale:1}}",
    ".cg-thing.a-bounce svg{animation:cgbounce .5s ease}",
    "@keyframes cgbounce{30%{transform:scale(1.1,.9)}60%{transform:scale(.95,1.08)}}",
    ".cg-thing.a-swing svg .sw{animation:cgswing 1.1s ease-in-out}",
    "@keyframes cgswing{20%{transform:rotate(14deg)}45%{transform:rotate(-12deg)}70%{transform:rotate(7deg)}}",
    ".cg-thing.a-spin svg .sp{animation:cgspin 3s ease-in-out}",
    "@keyframes cgspin{to{transform:rotate(720deg)}}",
    ".cg-thing.a-roll svg .wh{animation:cgspin 1.4s ease-in-out}",
    ".cg-thing.a-roll svg{animation:cgroll 1.4s ease-in-out}",
    "@keyframes cgroll{30%{transform:translateX(14%)}70%{transform:translateX(-8%)}}",
    ".cg-thing.a-hop svg .hen{animation:cghop .5s ease 2}",
    "@keyframes cghop{50%{transform:translateY(-14px)}}",
    ".cg-thing.a-sway svg{animation:cgsway 1.2s ease-in-out;transform-origin:50% 100%}",
    "@keyframes cgsway{25%{transform:rotate(4deg)}60%{transform:rotate(-4deg)}}",
    ".cg-thing.a-launch svg .arm{animation:cgarm .9s ease}",
    "@keyframes cgarm{15%{transform:rotate(-26deg)}40%{transform:rotate(70deg)}100%{transform:rotate(0deg)}}",
    ".cg-thing.a-sparks svg .fire{animation:cgfire .5s ease-in-out 4;transform-origin:50% 100%}",
    "@keyframes cgfire{50%{transform:scale(1.1,1.2)}}",
    ".cg-thing.a-splash svg .jet,.cg-thing.a-splash svg .duck{animation:cgbounce .8s ease}",
    ".cg-thing.a-shine svg .shn{animation:cgshine 1s ease}",
    "@keyframes cgshine{50%{transform:scale(3)}}",
    ".cg-fx{position:absolute;border-radius:50%;pointer-events:none;z-index:999}",
    ".cg-bar{position:absolute;left:0;right:0;bottom:0;height:" + BAR_H + "px;display:flex;align-items:center;justify-content:center;gap:14px;z-index:30;pointer-events:none}",
    ".cw-root .cg-grp{pointer-events:auto;position:relative;width:92px;height:92px;border-radius:26px;background:#fff8e6 !important;border:4px solid #3b2a33 !important;box-shadow:0 5px 0 rgba(59,42,51,.25);display:grid;place-items:center}",
    ".cg-grp:active{transform:translateY(3px)}",
    ".cg-grp svg{width:74px;height:74px;display:block;pointer-events:none}",
    ".cg-grp.glow::before{content:'';position:absolute;inset:-9px;border-radius:32px;background:radial-gradient(circle,rgba(255,236,150,.9),rgba(255,224,120,0) 72%);animation:cgglow 2s ease-in-out infinite;z-index:-1}",
    "@keyframes cgglow{0%,100%{opacity:.5;transform:scale(.95)}50%{opacity:1;transform:scale(1.05)}}",
    ".cw-root .cg-bin{position:absolute;z-index:40;right:14px;bottom:" + (BAR_H + 6) + "px;width:104px;height:104px;border-radius:30px;background:#ffd3d8 !important;border:4px solid #3b2a33 !important;box-shadow:0 5px 0 rgba(59,42,51,.25);display:none;place-items:center;pointer-events:none}",
    ".cg-bin.on{display:grid}",
    ".cg-bin.hot{background:#ff9aa6 !important;scale:1.12}",
    ".cg-bin svg{width:64px;height:64px}",
    ".cg-card{position:absolute;inset:0}",
    "@media (prefers-reduced-motion: reduce){.cg-thing,.cg-thing svg,.cg-thing svg *,.cg-grp.glow::before{animation:none !important}}"
  ].join("\n");
  function injectCss() {
    if (document.getElementById("cg-css")) { return; }
    var s = document.createElement("style"); s.id = "cg-css"; s.textContent = CSS; document.head.appendChild(s);
  }

  var BIN_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><path d="M16 20h32l-3 36H19z" fill="#fff8e6" stroke="' + INK + '" stroke-width="4" stroke-linejoin="round"/><path d="M12 20h40M26 20v-6h12v6" fill="none" stroke="' + INK + '" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M26 30v18M38 30v18" stroke="' + INK + '" stroke-width="4" stroke-linecap="round"/></svg>';

  function data(api) {
    var C = api.C;
    var G = C.grounds = (C.grounds && typeof C.grounds === "object") ? C.grounds : {};
    G.owned = (G.owned && typeof G.owned === "object") ? G.owned : {};
    G.items = Array.isArray(G.items) ? G.items.filter(function (it) {
      return it && T[it.t] && isFinite(it.x) && isFinite(it.y);
    }).slice(0, MAX_THINGS) : [];
    G.items.forEach(function (it) { it.x = Math.min(1, Math.max(0, +it.x)); it.y = Math.min(1, Math.max(0, +it.y)); it.id = it.id | 0; });
    return G;
  }

  function sizeOf(t, fieldW, y) { return Math.max(MIN_PX, T[t].w * fieldW * (0.78 + 0.44 * y)); }

  /* ------------------------------------------------------------ the full scene */
  function scene(sc, api) {
    injectCss();
    var G = data(api), el = api.el, snd = api.snd;
    el("div", "cg-sky", sc);
    el("div", "cg-hills", sc);
    var cast = el("div", "cg-castle", sc);
    var mini = el("div", "cw-mini", cast); api.drawCastle(mini, null, true);
    el("div", "cg-path", sc);
    var field = el("div", "cg-field", sc);
    var bar = el("div", "cg-bar", sc);
    var bin = el("div", "cg-bin", sc, BIN_SVG);
    var nextId = G.items.reduce(function (m, it) { return Math.max(m, it.id + 1); }, 1);
    var els = {};

    function stat() { api.root.dataset.things = String(G.items.length); api.root.dataset.owned = Object.keys(G.owned).join(","); }
    function place(it, isNew) {
      var e = els[it.id];
      if (!e) {
        e = els[it.id] = el("div", "cg-thing a-" + T[it.t].act + (isNew ? " new" : ""), field, markup(it.t));
        e.dataset.t = it.t; e.dataset.id = it.id; e.setAttribute("role", "button"); e.setAttribute("aria-label", T[it.t].name);
        wire(e, it);
      }
      e.style.left = (it.x * 100) + "%"; e.style.top = (it.y * 100) + "%";
      e.style.width = sizeOf(it.t, field.clientWidth, it.y) + "px"; e.style.zIndex = String(Math.round(it.y * 1000));
      return e;
    }
    function layout() { G.items.forEach(function (it) { place(it, false); }); }
    api.setResize(layout);

    /* little effects for the jobs */
    function dot(x, y, color, size, dx, dy, ms) {
      var d = el("div", "cg-fx", field); d.style.cssText += ";width:" + size + "px;height:" + size + "px;background:" + color + ";left:" + x + "px;top:" + y + "px";
      if (d.animate) {
        d.animate([{ transform: "translate(0,0) scale(1)", opacity: 1 }, { transform: "translate(" + dx + "px," + dy + "px) scale(.6)", opacity: 0 }],
          { duration: Math.max(80, ms * (api.wctx.fast ? 0.15 : 1)), easing: "ease-out", fill: "forwards" }).onfinish = function () { d.remove(); };
      } else { setTimeout(function () { d.remove(); }, 400); }
    }
    function centre(e) { return { x: e.offsetLeft, top: e.offsetTop - e.offsetHeight, y: e.offsetTop, w: e.offsetWidth, h: e.offsetHeight }; }
    function act(e, it) {
      var kind = T[it.t].act, c = centre(e), k;
      e.classList.remove("a-" + kind); void e.offsetWidth; e.classList.add("a-" + kind);
      if (kind === "sparks") { for (k = 0; k < 7; k++) { dot(c.x, c.y - c.h * 0.2, k % 2 ? "#ffb347" : "#ffe27a", 12, (k - 3) * 14, -50 - (k % 3) * 18, 800); } snd("plop"); }
      else if (kind === "splash") { for (k = 0; k < 7; k++) { dot(c.x, c.y - c.h * 0.35, "#8fd0ef", 12, (k - 3) * 16, -44 - (k % 3) * 14, 700); } snd("pop"); }
      else if (kind === "drop") { dot(c.x + (Math.random() - 0.5) * c.w * 0.4, c.y - c.h * 0.8, "#e84a4a", 18, 0, c.h * 0.7, 700); snd("pop"); }
      else if (kind === "swing" && it.t === "bell") { snd("bell"); }
      else if (kind === "launch") {
        var p = api.img(api.NA("pillow"), "cg-fx", field); p.style.width = "44px"; p.style.left = (c.x - c.w * 0.3) + "px"; p.style.top = (c.y - c.h * 0.7) + "px";
        if (p.animate) {
          p.animate([{ transform: "translate(0,0) rotate(0)" }, { transform: "translate(" + c.w * 0.9 + "px," + (-c.h * 1.1) + "px) rotate(200deg)" }, { transform: "translate(" + c.w * 1.8 + "px,0) rotate(400deg)" }],
            { duration: Math.max(80, 1100 * (api.wctx.fast ? 0.15 : 1)), easing: "ease-in-out", fill: "forwards" }).onfinish = function () { p.remove(); };
        } else { setTimeout(function () { p.remove(); }, 400); }
        snd("pop");
      } else if (kind === "arrow") { dot(c.x - c.w * 1.1, c.y - c.h * 0.5, "#8a5a36", 10, c.w * 1.0, 0, 380); snd("plop"); }
      else { snd("plop"); }
      api.root.dataset.lastact = it.t;
    }

    /* drag to move; drop on the bin to put it away; a small touch is a tap and does the job */
    function wire(e, it) {
      var sx = 0, sy = 0, ox = 0, oy = 0, moved = false, on = false, id = null;
      function hot(ev) { var r = bin.getBoundingClientRect(); return ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom; }
      e.addEventListener("pointerdown", function (ev) {
        on = true; moved = false; id = ev.pointerId; sx = ev.clientX; sy = ev.clientY; ox = it.x; oy = it.y;
        try { e.setPointerCapture(id); } catch (x) {}
        ev.preventDefault();
      });
      e.addEventListener("pointermove", function (ev) {
        if (!on || ev.pointerId !== id) { return; }
        var dx = ev.clientX - sx, dy = ev.clientY - sy;
        if (!moved && Math.abs(dx) + Math.abs(dy) < 10) { return; }
        if (!moved) { moved = true; e.classList.add("drag"); bin.classList.add("on"); }
        var W = field.clientWidth || 1, H = field.clientHeight || 1;
        it.x = Math.min(1, Math.max(0, ox + dx / W)); it.y = Math.min(1, Math.max(0, oy + dy / H));
        e.style.left = (it.x * 100) + "%"; e.style.top = (it.y * 100) + "%"; e.style.zIndex = "2000";
        bin.classList.toggle("hot", hot(ev));
      });
      function end(ev) {
        if (!on || (ev && ev.pointerId !== id)) { return; }
        on = false;
        try { e.releasePointerCapture(id); } catch (x) {}
        var wasHot = moved && ev && hot(ev);
        bin.classList.remove("on", "hot"); e.classList.remove("drag");
        if (!moved) { act(e, it); return; }
        if (wasHot) {
          var i = G.items.indexOf(it); if (i >= 0) { G.items.splice(i, 1); }
          delete els[it.id]; e.remove(); snd("plop");
        } else { place(it, false); snd("pop"); }
        stat(); api.wctx.save();
      }
      e.addEventListener("pointerup", end);
      e.addEventListener("pointercancel", function (ev) { if (on) { on = false; moved = false; bin.classList.remove("on", "hot"); e.classList.remove("drag"); it.x = ox; it.y = oy; place(it, false); } });
      e.addEventListener("keydown", function (ev) { if (ev.key === "Enter" || ev.key === " ") { act(e, it); } });
      e.tabIndex = 0;
    }

    /* the four picture buttons at the bottom: each opens the tray for its group */
    function trayFor(group) {
      var items = Object.keys(T).filter(function (id) { return T[id].g === group; }).map(function (id) {
        return { id: id, name: T[id].name, price: T[id].price, owned: !!G.owned[id], src: dataUri(id) };
      });
      api.tray(items, function (it, btn) {
        if (G.items.length >= MAX_THINGS) { api.nope(btn); return; }
        if (!G.owned[it.id]) { if (!api.buy(it.price, btn)) { return; } G.owned[it.id] = true; } else { api.snd("pop"); }
        var n = G.items.length;
        var rec = { id: nextId++, t: it.id, x: 0.2 + 0.6 * (((n * 0.37) % 1)), y: 0.35 + 0.5 * (((n * 0.61) % 1)) };
        G.items.push(rec); place(rec, true); api.closeTray(); stat(); api.wctx.save(); api.say("placed");
        api.wctx.coinsChanged();
      }, "Pick a thing");
    }
    GROUPS.forEach(function (g, k) {
      var b = el("button", "cg-grp" + (!G.items.length && k === 0 ? " glow" : ""), bar, markup(g.pic));
      b.type = "button"; b.dataset.group = g.id; b.setAttribute("aria-label", g.id);
      b.addEventListener("click", function () { snd("pop"); trayFor(g.id); });
    });

    layout(); stat();
    api.say(G.items.length ? "grounds_full" : "grounds");
  }

  /* ------------------------------------------------------------ the small picture on the map */
  function thumb(card, api) {
    injectCss();
    var G = data(api), el = api.el;
    el("div", "cg-sky", card); el("div", "cg-hills", card);
    var cast = el("div", "cg-castle", card); cast.style.top = "0"; cast.style.height = "40%";
    var mini = el("div", "cw-mini", cast); api.drawCastle(mini, null, true);
    var field = el("div", "cg-field", card); field.style.top = "42%"; field.style.bottom = "0"; field.style.pointerEvents = "none";
    var list = G.items.length ? G.items.slice(0, 14) : [{ t: "cottage", x: 0.22, y: 0.9, ghost: true }, { t: "tree", x: 0.5, y: 0.9, ghost: true }, { t: "well", x: 0.78, y: 0.9, ghost: true }];
    list.forEach(function (it) {
      var e = el("div", "cg-thing", field, markup(it.t));
      e.style.left = (it.x * 100) + "%"; e.style.top = (it.y * 100) + "%"; e.style.width = Math.max(44, T[it.t].w * card.clientWidth * 0.8 || 60) + "px"; e.style.zIndex = String(Math.round(it.y * 1000));
      if (it.ghost) { e.style.filter = "grayscale(.8)"; e.style.opacity = ".6"; }
    });
  }

  window.CastleGrounds = { scene: scene, thumb: thumb, THINGS: T, GROUPS: GROUPS, MAX: MAX_THINGS };
})();
