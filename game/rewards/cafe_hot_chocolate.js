/* cafe_hot_chocolate.js - Marie's reward game "Mimi's Hot Chocolate" (Kids Maths). Registers theme "cafe".
 * Spec: 16_kids_maths/kids_reward_games_design_study.md section 3.
 *
 * Play (every step works by drag OR tap; nothing plays itself):
 *   order    a friend walks in and shows a picture card: a cup colour and one favourite topping
 *   cup      drag a cup to the glowing mat, or tap it
 *   pour     hold the milk jug (the milk rises while she holds), or tap it 3 times
 *   stir     circle on the cup, or tap the cup / the spoon: 3 stirs turn the milk into chocolate
 *   toppings drag or tap toppings onto 8 spots; never removed; when full the tray greys and Mimi says "It's full!"
 *   serve    after the first topping a bell appears: drag the cup to the friend, or tap the bell and then the friend
 *   react    the friend sips, goes rosy, says "Mmm!" (and "My favourite!" if the favourite topping is on it),
 *            Mimi gives a high five, three hearts rise, the friend waves and leaves; a sticker stays; Done appears.
 * Data for tests: root.dataset.step = order | cup | pour | stir | toppings | serve | react | end, and root.dataset.lines.
 * Needs window.KittyChars (../modules/characters.js) and reward_core.js.
 */
(function () {
  "use strict";

  var INK = "#3b2a33";
  var HI = "#fffaf3";          /* highlights: warm cream, never pure white */
  var SHADOW = "rgba(87,54,54,.18)";
  var FRIENDS = ["melody", "purin", "kuromi", "cinna"];
  var CUPS = [
    { id: "pink", name: "Pink cup", light: "#fbd3dc", base: "#ee8ba3", dark: "#c45573", inside: "#a8384f" },
    { id: "mint", name: "Mint cup", light: "#d7f3ea", base: "#8fd6c1", dark: "#4fa58c", inside: "#2f8a73" },
    { id: "cream", name: "Cream cup", light: "#fdf1cf", base: "#f7dc9a", dark: "#d6b35f", inside: "#a9853a" }
  ];
  var TOPS = [
    { id: "cream", name: "Cream swirl" },
    { id: "mallow", name: "Marshmallows" },
    { id: "sprinkles", name: "Sprinkles" },
    { id: "berry", name: "Strawberry" }
  ];
  /* the 8 spots on top of the drink, in the cup's 220 x 210 box (tap order: middle first, then around) */
  var SPOTS = [[100, 64], [70, 72], [130, 72], [100, 38], [58, 54], [142, 54], [80, 46], [120, 46]];
  var MILK = ["#f7efe6", "#e7cfb8", "#c99a72", "#8a5a3c"];
  var MILK_TOP = ["#fdf8f2", "#f0dcc8", "#d9ae88", "#a06c48"];
  var LINES = {
    hello: "Hello Mimi! Can I have a hot chocolate, please?",
    cup: "Pick a cup.",
    pour: "Pour the milk.",
    stir: "Stir it round.",
    top: "Add a topping.",
    full: "It's full!",
    give: "Give it to your friend.",
    mmm: "Mmm!",
    fav: "My favourite!",
    thanks: "Thank you, Mimi!",
    bye: "Bye bye!"
  };
  var friendTurn = 0;
  var uidN = 0;

  /* ------------------------------------------------------------------ ART: every picture of this game
   * PNG files with clear backgrounds in game/rewards/art/cafe/. A file is used only when its name is listed in
   * art/cafe/manifest.json ({"files": ["mimi_stand.png", ...]}), so a missing file never makes a 404.
   * While a file is missing, the code drawing (or KittyChars) stands in for it.
   * Moving parts are separate pictures: each pose is its own file, and the cup is an empty cup picture with the
   * liquid drawn by code inside its opening (opening ellipse: centre 200,148, radius 106 x 27 in the 440 x 420 cup). */
  const ART = {
    bg: "cafe_background.png",
    mimi_stand: "mimi_stand.png", mimi_smile: "mimi_smile.png", mimi_wave: "mimi_wave.png", mimi_five: "mimi_high_five.png",
    cup_pink: "cup_pink.png", cup_mint: "cup_mint.png", cup_cream: "cup_cream.png",
    jug: "milk_jug.png", spoon: "spoon.png", bell: "bell.png", mat: "cup_mat.png", heart: "heart.png",
    top_cream: "topping_cream.png", top_mallow: "topping_marshmallows.png", top_sprinkles: "topping_sprinkles.png", top_berry: "topping_strawberry.png"
  };
  /* the friends: one file per friend per pose: friend_<name>_<pose>.png */
  var FRIEND_FILE = { melody: "bella", purin: "momo", kuromi: "lulu", cinna: "puff" };
  var FRIEND_POSES = ["stand", "walk", "sip", "cheer", "wave"];
  Object.keys(FRIEND_FILE).forEach(function (id) {
    FRIEND_POSES.forEach(function (pose) { ART["friend_" + id + "_" + pose] = "friend_" + FRIEND_FILE[id] + "_" + pose + ".png"; });
  });
  var ART_BASE = (function () {
    try { return new URL("art/cafe/", document.currentScript.src).href; } catch (e) { return "rewards/art/cafe/"; }
  })();
  var artReady = {};
  (function loadArt() {
    if (!window.fetch) { return; }
    fetch(ART_BASE + "manifest.json").then(function (r) { return r.ok ? r.json() : { files: [] }; }).then(function (m) {
      var have = (m && m.files) || [];
      Object.keys(ART).forEach(function (key) {
        if (have.indexOf(ART[key]) < 0) { return; }
        var img = new Image();
        img.onload = function () { artReady[key] = ART_BASE + ART[key]; };
        img.src = ART_BASE + ART[key];
      });
    }).catch(function () {});
  })();
  function art(key) { return artReady[key] || null; }
  function imgTag(url) { return '<img class="rw-pic" alt="" draggable="false" src="' + url + '">'; }
  function svgImage(url, x, y, w, h) { return '<image href="' + url + '" x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" preserveAspectRatio="xMidYMid meet"/>'; }

  /* ------------------------------------------------------------------ small art helpers */
  function uid() { uidN += 1; return "hc" + uidN + "_"; }
  function st(w) { return ' stroke="' + INK + '" stroke-width="' + w + '" stroke-linejoin="round" stroke-linecap="round"'; }
  function lin(id, stops, x2, y2) {
    return '<linearGradient id="' + id + '" x1="0" y1="0" x2="' + (x2 == null ? 0 : x2) + '" y2="' + (y2 == null ? 1 : y2) + '">' +
      stops.map(function (s) { return '<stop offset="' + s[0] + '" stop-color="' + s[1] + '"' + (s[2] != null ? ' stop-opacity="' + s[2] + '"' : "") + "/>"; }).join("") + "</linearGradient>";
  }
  function rad(id, stops, cx, cy, r) {
    return '<radialGradient id="' + id + '" cx="' + (cx || "50%") + '" cy="' + (cy || "50%") + '" r="' + (r || "50%") + '">' +
      stops.map(function (s) { return '<stop offset="' + s[0] + '" stop-color="' + s[1] + '"' + (s[2] != null ? ' stop-opacity="' + s[2] + '"' : "") + "/>"; }).join("") + "</radialGradient>";
  }
  function softShadow(p, cx, cy, rx, ry) {
    return "<defs>" + rad(p + "sh", [[0, "#573636", 0.26], [0.6, "#573636", 0.1], [1, "#573636", 0]]) + "</defs>" +
      '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + rx + '" ry="' + ry + '" fill="url(#' + p + 'sh)"/>';
  }
  function svg(vb, inner, cls) {
    return '<svg viewBox="' + vb + '" aria-hidden="true" focusable="false"' + (cls ? ' class="' + cls + '"' : "") + ' xmlns="http://www.w3.org/2000/svg">' + inner + "</svg>";
  }
  function face(cx, cy, s, mood) {
    /* a small cute face: two shiny eyes, a smile, pink cheeks */
    var e = 4.6 * s;
    var eyes;
    if (mood === "happy") {
      eyes = '<path d="M' + (cx - 17 * s) + " " + (cy + 1 * s) + " q" + 5 * s + " " + (-7 * s) + " " + 10 * s + ' 0" fill="none"' + st(3.2 * s) + "/>" +
        '<path d="M' + (cx + 7 * s) + " " + (cy + 1 * s) + " q" + 5 * s + " " + (-7 * s) + " " + 10 * s + ' 0" fill="none"' + st(3.2 * s) + "/>";
    } else {
      eyes = '<g class="rw-blink"><ellipse cx="' + (cx - 12 * s) + '" cy="' + cy + '" rx="' + e * 0.8 + '" ry="' + e + '" fill="' + INK + '"/>' +
        '<ellipse cx="' + (cx + 12 * s) + '" cy="' + cy + '" rx="' + e * 0.8 + '" ry="' + e + '" fill="' + INK + '"/>' +
        '<circle cx="' + (cx - 13.3 * s) + '" cy="' + (cy - 1.8 * s) + '" r="' + 1.6 * s + '" fill="' + HI + '"/>' +
        '<circle cx="' + (cx + 10.7 * s) + '" cy="' + (cy - 1.8 * s) + '" r="' + 1.6 * s + '" fill="' + HI + '"/></g>';
    }
    return eyes +
      '<path d="M' + (cx - 5 * s) + " " + (cy + 7 * s) + " q" + 5 * s + " " + 5 * s + " " + 10 * s + ' 0" fill="none"' + st(2.8 * s) + "/>" +
      '<ellipse cx="' + (cx - 22 * s) + '" cy="' + (cy + 8 * s) + '" rx="' + 6.5 * s + '" ry="' + 4 * s + '" fill="#f28fa8" opacity=".55"/>' +
      '<ellipse cx="' + (cx + 22 * s) + '" cy="' + (cy + 8 * s) + '" rx="' + 6.5 * s + '" ry="' + 4 * s + '" fill="#f28fa8" opacity=".55"/>';
  }

  /* ------------------------------------------------------------------ toppings */
  function toppingArt(kind, p, big) {
    var s = big ? 1.35 : 1;
    var g = "";
    var url = art("top_" + kind);
    if (url) { return '<g transform="scale(' + s + ')">' + svgImage(url, -30, -30, 60, 60) + "</g>"; }
    if (kind === "cream") {
      g = "<defs>" + lin(p + "cr", [[0, "#fffaf2"], [0.6, "#f8ead9"], [1, "#e9d2b8"]]) + "</defs>" +
        '<path d="M-26 8 C-30 -2 -20 -8 -12 -6 C-14 -16 -2 -20 4 -14 C8 -22 22 -18 20 -8 C30 -8 32 4 24 9 C10 14 -12 14 -26 8 Z" fill="url(#' + p + 'cr)"' + st(3) + "/>" +
        '<path d="M-14 -4 C-12 -18 6 -24 12 -12 C14 -6 8 -2 2 -4" fill="url(#' + p + 'cr)"' + st(3) + "/>" +
        '<path d="M-2 -16 C0 -26 10 -28 12 -22" fill="none"' + st(3) + "/>" +
        '<path d="M-18 2 C-10 6 4 6 14 2" fill="none" stroke="#e3c9ab" stroke-width="2.4" stroke-linecap="round"/>' +
        '<ellipse cx="-8" cy="-10" rx="4" ry="2.2" fill="' + HI + '" opacity=".8" transform="rotate(-25 -8 -10)"/>';
    } else if (kind === "mallow") {
      g = "<defs>" + lin(p + "m1", [[0, "#ffe9ef"], [1, "#f6bccb"]]) + lin(p + "m2", [[0, "#fffaf0"], [1, "#efdcc6"]]) + "</defs>" +
        '<rect x="-21" y="-9" width="20" height="17" rx="6" fill="url(#' + p + 'm2)"' + st(2.6) + ' transform="rotate(-12 -11 0)"/>' +
        '<rect x="0" y="-12" width="20" height="17" rx="6" fill="url(#' + p + 'm1)"' + st(2.6) + ' transform="rotate(10 10 -3)"/>' +
        '<rect x="-9" y="-1" width="19" height="15" rx="6" fill="url(#' + p + 'm1)"' + st(2.6) + ' transform="rotate(-4 0 6)"/>' +
        '<ellipse cx="-14" cy="-5" rx="3.6" ry="2" fill="' + HI + '" opacity=".85"/><ellipse cx="7" cy="-8" rx="3.6" ry="2" fill="' + HI + '" opacity=".85"/>';
    } else if (kind === "sprinkles") {
      var cols = ["#ee7f9c", "#7ccfb8", "#f2c94c", "#8fb6f0", "#c49ae8", "#f6a46b"];
      var at = [[-16, -2, 30], [-6, -9, -40], [6, -3, 70], [16, -8, 10], [-10, 6, -10], [3, 7, 45], [14, 4, -60], [-1, -14, 85]];
      g = '<ellipse cx="0" cy="0" rx="25" ry="13" fill="#f6e3d2" opacity=".0"/>';
      at.forEach(function (a, i) {
        g += '<rect x="-5.5" y="-2" width="11" height="4" rx="2" fill="' + cols[i % cols.length] + '"' + st(1.4) + ' transform="translate(' + a[0] + " " + a[1] + ") rotate(" + a[2] + ')"/>';
      });
    } else {
      g = "<defs>" + rad(p + "sb", [[0, "#ff9fb0"], [0.55, "#ee5a74"], [1, "#c13a57"]], "35%", "30%", "75%") + lin(p + "lf", [[0, "#a8e0a0"], [1, "#5fae6d"]]) + "</defs>" +
        '<path d="M0 16 C-16 10 -20 -6 -12 -12 C-6 -16 6 -16 12 -12 C20 -6 16 10 0 16 Z" fill="url(#' + p + 'sb)"' + st(2.8) + "/>" +
        '<path d="M-12 -12 L-6 -20 L-2 -13 L4 -21 L6 -13 L13 -18 L12 -11 C4 -8 -4 -8 -12 -12 Z" fill="url(#' + p + 'lf)"' + st(2.4) + "/>" +
        [[-6, -2], [4, -3], [-1, 5], [7, 5], [-8, 7]].map(function (d) { return '<ellipse cx="' + d[0] + '" cy="' + d[1] + '" rx="1.3" ry="2" fill="#f7dc9a"/>'; }).join("") +
        '<ellipse cx="-7" cy="-7" rx="3.4" ry="2" fill="' + HI + '" opacity=".7" transform="rotate(-30 -7 -7)"/>';
    }
    return '<g transform="scale(' + s + ')">' + g + "</g>";
  }
  function toppingIcon(kind) {
    var p = uid();
    return svg("-34 -34 68 68", softShadow(p, 0, 22, 26, 6) + toppingArt(kind, p, true), "rw-art");
  }

  /* ------------------------------------------------------------------ the mug (220 x 210 box; rim centre 100,74) */
  function mugArt(cup, p, opts) {
    opts = opts || {};
    var level = opts.level == null ? 1 : opts.level;
    var liqY = 100 - 24 * level;
    var milk = opts.milk || MILK[0];
    var milkTop = opts.milkTop || MILK_TOP[0];
    return "<defs>" +
      lin(p + "body", [[0, cup.light], [0.45, cup.base], [1, cup.dark]], 1, 0) +
      lin(p + "in", [[0, cup.inside], [1, cup.dark]]) +
      lin(p + "liq", [[0, milk], [1, milk]]) +
      '<clipPath id="' + p + 'clip"><ellipse cx="100" cy="75" rx="53" ry="13.5"/></clipPath>' +
      "</defs>" + (art("cup_" + cup.id) ? svgImage(art("cup_" + cup.id), 0, 0, 220, 210) :
      softShadow(p, 100, 194, 76, 10) +
      /* handle: an outlined tube */
      '<path d="M150 96 C192 86 198 156 150 160" fill="none" stroke="' + INK + '" stroke-width="24" stroke-linecap="round"/>' +
      '<path d="M150 96 C192 86 198 156 150 160" fill="none" stroke="' + cup.base + '" stroke-width="16" stroke-linecap="round"/>' +
      '<path d="M162 99 C182 98 186 128 178 140" fill="none" stroke="' + HI + '" stroke-width="3.5" stroke-linecap="round" opacity=".45"/>' +
      /* body */
      '<path d="M38 74 L45 166 Q48 190 74 190 L126 190 Q152 190 155 166 L162 74 Z" fill="url(#' + p + 'body)"' + st(4) + "/>" +
      '<path d="M44 160 Q50 182 74 182 L126 182 Q150 182 156 160" fill="none" stroke="' + cup.dark + '" stroke-width="5" opacity=".35"/>' +
      '<path d="M52 92 Q50 128 56 158" fill="none" stroke="' + HI + '" stroke-width="7" stroke-linecap="round" opacity=".45"/>' +
      '<g class="rw-mugface">' + face(100, 128, 1, opts.mood) + "</g>" +
      /* rim and inside */
      '<ellipse cx="100" cy="74" rx="62" ry="18" fill="' + cup.light + '"' + st(4) + "/>" +
      '<ellipse cx="100" cy="75" rx="53" ry="13.5" fill="url(#' + p + 'in)"/>') +
      '<g clip-path="url(#' + p + 'clip)"><g class="rw-liquid" transform="translate(0 ' + liqY.toFixed(1) + ')">' +
      '<rect x="40" y="0" width="120" height="40" fill="' + milk + '" class="rw-milk"/>' +
      '<ellipse cx="100" cy="0" rx="54" ry="13.5" fill="' + milkTop + '" class="rw-milktop"/>' +
      '<ellipse cx="84" cy="-3" rx="14" ry="3" fill="' + HI + '" opacity=".35"/>' +
      "</g></g>" +
      (art("cup_" + cup.id) ? "" : '<ellipse cx="100" cy="74" rx="62" ry="18" fill="none"' + st(4) + "/>") +
      '<g class="rw-spoonin" style="display:none"></g>' +
      '<g class="rw-steam" style="display:none">' +
      '<path d="M82 52 C74 40 90 32 82 18" fill="none" stroke="#fbeee8" stroke-width="6" stroke-linecap="round" opacity=".8"/>' +
      '<path d="M112 50 C104 36 120 30 112 14" fill="none" stroke="#fbeee8" stroke-width="6" stroke-linecap="round" opacity=".8"/></g>' +
      '<g class="rw-tops"></g>';
  }
  function cupIcon(cup) {
    var p = uid();
    return svg("20 10 190 200", mugArt(cup, p, { level: 0 }), "rw-art");
  }

  /* ------------------------------------------------------------------ milk jug (box -20 -20 220 220, body centre 80,100) */
  function jugArt(p) {
    if (art("jug")) { return svgImage(art("jug"), 0, 20, 160, 160); }
    return "<defs>" + lin(p + "jb", [[0, "#fbf6ef"], [0.5, "#f1e7da"], [1, "#d9c8b4"]], 1, 0) + lin(p + "jm", [[0, "#9edcc9"], [1, "#5fb59c"]]) + "</defs>" +
      '<path d="M30 92 C6 92 6 142 34 146" fill="none" stroke="' + INK + '" stroke-width="20" stroke-linecap="round"/>' +
      '<path d="M30 92 C6 92 6 142 34 146" fill="none" stroke="#efe4d6" stroke-width="12" stroke-linecap="round"/>' +
      '<path d="M44 44 L118 44 L150 34 L140 58 C150 86 152 120 146 150 Q140 178 112 180 L54 180 Q28 178 24 150 C18 118 26 76 44 58 Z" fill="url(#' + p + 'jb)"' + st(4) + "/>" +
      '<path d="M26 118 C60 126 110 126 148 116 L147 140 C110 150 60 150 24 142 Z" fill="url(#' + p + 'jm)"' + st(3) + "/>" +
      '<ellipse cx="82" cy="47" rx="38" ry="7" fill="#f7efe6"' + st(3) + "/>" +
      '<path d="M40 70 Q34 100 38 128" fill="none" stroke="' + HI + '" stroke-width="7" stroke-linecap="round" opacity=".6"/>' +
      face(86, 92, 0.85);
  }
  function jugIcon() {
    var p = uid();
    return svg("-14 14 186 186", softShadow(p, 86, 186, 66, 8) + jugArt(p), "rw-art");
  }

  /* ------------------------------------------------------------------ spoon (box 0 0 120 120) and bell */
  function spoonArt(p) {
    if (art("spoon")) { return svgImage(art("spoon"), 0, 0, 120, 120); }
    return "<defs>" + lin(p + "sp", [[0, "#eef1f5"], [1, "#a9b1bd"]], 1, 1) + lin(p + "sh", [[0, "#f7b6c6"], [1, "#d9536f"]], 1, 0) + "</defs>" +
      '<path d="M28 96 L84 34" stroke="' + INK + '" stroke-width="15" stroke-linecap="round"/>' +
      '<path d="M28 96 L84 34" stroke="url(#' + p + 'sh)" stroke-width="9" stroke-linecap="round"/>' +
      '<ellipse cx="92" cy="25" rx="13" ry="19" transform="rotate(42 92 25)" fill="url(#' + p + 'sp)"' + st(3.4) + "/>" +
      '<ellipse cx="88" cy="22" rx="4" ry="8" transform="rotate(42 88 22)" fill="' + HI + '" opacity=".7"/>';
  }
  function spoonIcon() {
    var p = uid();
    return svg("0 0 120 120", softShadow(p, 58, 106, 40, 6) + spoonArt(p), "rw-art");
  }
  function bellArt(p) {
    if (art("bell")) { return svgImage(art("bell"), 0, 0, 120, 112); }
    return "<defs>" + lin(p + "bd", [[0, "#fbe7a6"], [0.5, "#f2c95c"], [1, "#c99a2e"]], 1, 0.4) + lin(p + "bb", [[0, "#f7b6c6"], [1, "#d9536f"]]) + "</defs>" +
      softShadow(p, 60, 104, 52, 7) +
      '<rect x="12" y="84" width="96" height="16" rx="8" fill="url(#' + p + 'bb)"' + st(3.4) + "/>" +
      '<path d="M20 84 C20 44 100 44 100 84 Z" fill="url(#' + p + 'bd)"' + st(3.6) + "/>" +
      '<rect x="54" y="30" width="12" height="14" rx="5" fill="url(#' + p + 'bd)"' + st(3) + "/>" +
      '<path d="M34 72 C36 58 46 52 56 50" fill="none" stroke="' + HI + '" stroke-width="5" stroke-linecap="round" opacity=".7"/>';
  }

  /* ------------------------------------------------------------------ room decor */
  function windowArt(p) {
    return "<defs>" + lin(p + "sky", [[0, "#d6eef7"], [0.7, "#f3f3ea"], [1, "#fdeedd"]]) +
      rad(p + "sun", [[0, "#fff6d2"], [0.5, "#fff1c4", 0.7], [1, "#fff1c4", 0]]) +
      lin(p + "cur", [[0, "#f6b9c8"], [1, "#e78aa2"]], 1, 0) + lin(p + "fr", [[0, "#a9e2d0"], [1, "#6cc3a9"]]) + "</defs>" +
      '<path d="M30 200 L30 80 C30 30 170 30 170 80 L170 200 Z" fill="url(#' + p + 'fr)"' + st(4) + "/>" +
      '<path d="M44 196 L44 84 C44 46 156 46 156 84 L156 196 Z" fill="url(#' + p + 'sky)"' + st(3) + "/>" +
      '<circle cx="126" cy="86" r="34" fill="url(#' + p + 'sun)"/>' +
      '<circle cx="126" cy="86" r="12" fill="#fff3c8"/>' +
      '<path d="M56 128 C56 118 70 116 74 122 C78 112 96 114 96 126 C104 124 108 132 102 136 L58 136 C50 136 50 128 56 128 Z" fill="#fbf7f0" opacity=".9"/>' +
      '<path d="M100 44 L100 196 M44 122 L156 122" stroke="#6cc3a9" stroke-width="7"/>' +
      '<path d="M100 44 L100 196 M44 122 L156 122" fill="none"' + st(0.01) + "/>" +
      /* curtains */
      '<path d="M22 34 C40 34 60 36 62 40 C54 90 66 120 46 150 C40 176 30 190 18 204 Z" fill="url(#' + p + 'cur)"' + st(3.4) + "/>" +
      '<path d="M178 34 C160 34 140 36 138 40 C146 90 134 120 154 150 C160 176 170 190 182 204 Z" fill="url(#' + p + 'cur)"' + st(3.4) + ' transform="translate(0 0)"/>' +
      '<rect x="12" y="24" width="176" height="14" rx="7" fill="#d6b896"' + st(3) + "/>" +
      '<path d="M30 92 C40 96 50 94 56 88" fill="none" stroke="#d9536f" stroke-width="5" stroke-linecap="round"/>' +
      '<path d="M170 92 C160 96 150 94 144 88" fill="none" stroke="#d9536f" stroke-width="5" stroke-linecap="round"/>' +
      /* sill and a little plant */
      '<rect x="22" y="196" width="156" height="14" rx="6" fill="#fffcf7"' + st(3.4) + "/>" +
      '<path d="M120 172 C112 156 118 146 126 150 C128 140 140 140 138 152 C148 148 152 160 140 170 Z" fill="#8fd09a"' + st(2.6) + "/>" +
      '<path d="M116 172 L144 172 L140 196 L120 196 Z" fill="#ee8ba3"' + st(3) + "/>";
  }
  function lampArt(p) {
    return "<defs>" + lin(p + "ls", [[0, "#f9c7d3"], [1, "#e17d97"]], 1, 0.3) + rad(p + "lg", [[0, "#fff4d0", 0.95], [0.5, "#ffefc2", 0.4], [1, "#ffefc2", 0]]) + "</defs>" +
      '<path d="M50 0 L50 40" stroke="#a7877a" stroke-width="3"/>' +
      '<ellipse cx="50" cy="104" rx="46" ry="30" fill="url(#' + p + 'lg)"/>' +
      '<path d="M14 84 C14 52 86 52 86 84 Z" fill="url(#' + p + 'ls)"' + st(3.4) + "/>" +
      '<rect x="44" y="38" width="12" height="14" rx="4" fill="#d6b896"' + st(2.6) + "/>" +
      '<ellipse cx="50" cy="86" rx="10" ry="6" fill="#fff1c4"' + st(2.4) + "/>" +
      '<path d="M26 74 C28 64 36 60 44 58" fill="none" stroke="' + HI + '" stroke-width="4" stroke-linecap="round" opacity=".6"/>';
  }
  function wallShelfArt(p) {
    function jar(x, h, fill, lid, label) {
      return '<rect x="' + x + '" y="' + (70 - h) + '" width="40" height="' + h + '" rx="10" fill="#f4eee9"' + st(3) + ' opacity=".96"/>' +
        '<rect x="' + (x + 5) + '" y="' + (70 - h * 0.66) + '" width="30" height="' + (h * 0.58) + '" rx="7" fill="' + fill + '"/>' +
        '<rect x="' + (x - 2) + '" y="' + (62 - h) + '" width="44" height="12" rx="5" fill="' + lid + '"' + st(3) + "/>" +
        (label ? '<circle cx="' + (x + 20) + '" cy="' + (72 - h * 0.4) + '" r="7" fill="#fffcf7"' + st(2) + "/>" : "") +
        '<rect x="' + (x + 6) + '" y="' + (74 - h) + '" width="5" height="' + (h * 0.5) + '" rx="2.5" fill="' + HI + '" opacity=".6"/>';
    }
    return "<defs>" + lin(p + "pl", [[0, "#efd3b4"], [1, "#d6b896"]]) + "</defs>" +
      jar(14, 46, "#a06c48", "#ee8ba3", true) + jar(66, 58, "#f6c5d2", "#7ccfb8", true) + jar(118, 40, "#f2d27a", "#f7dc9a", true) +
      '<path d="M182 70 C176 52 186 40 196 46 C200 34 216 36 214 50 C226 48 228 64 216 70 Z" fill="#8fd09a"' + st(2.6) + "/>" +
      '<rect x="4" y="70" width="232" height="13" rx="5" fill="url(#' + p + 'pl)"' + st(3.2) + "/>" +
      '<path d="M30 83 L30 96 L44 83 M206 83 L206 96 L192 83" fill="#d6b896"' + st(2.6) + "/>";
  }
  function matArt(p) {
    return "<defs>" + rad(p + "glow", [[0, "#bff0de", 0.95], [0.6, "#9fe3cb", 0.45], [1, "#9fe3cb", 0]]) + lin(p + "mt", [[0, "#fde8ee"], [1, "#f6c9d5"]]) + "</defs>" +
      '<ellipse class="rw-matglow" cx="100" cy="30" rx="100" ry="30" fill="url(#' + p + 'glow)"/>' +
      (art("mat") ? svgImage(art("mat"), 0, 0, 200, 60) : "") + (art("mat") ? "" :
      '<ellipse cx="100" cy="30" rx="82" ry="19" fill="url(#' + p + 'mt)"' + st(3.4) + "/>" +
      '<ellipse cx="100" cy="30" rx="70" ry="13.5" fill="none" stroke="#e98aa3" stroke-width="2.6" stroke-dasharray="7 6"/>');
  }
  function heartArt(p) {
    if (art("heart")) { return svg("-20 -20 40 40", svgImage(art("heart"), -20, -20, 40, 40)); }
    return svg("-20 -20 40 40", "<defs>" + rad(p + "h", [[0, "#ffc2cf"], [0.7, "#ee7f9c"], [1, "#d9536f"]], "35%", "30%", "80%") + "</defs>" +
      '<path d="M0 13 C-19 0 -16 -15 -7 -15 C-3 -15 0 -11 0 -11 C0 -11 3 -15 7 -15 C16 -15 19 0 0 13 Z" fill="url(#' + p + 'h)"' + st(2.6) + "/>" +
      '<ellipse cx="-7" cy="-7" rx="3.2" ry="2" fill="' + HI + '" opacity=".8" transform="rotate(-35 -7 -7)"/>');
  }

  /* ------------------------------------------------------------------ the game */
  function start(ctx, finish) {
    var K = window.KittyChars;
    if (!K || !K.full) { throw new Error("RewardGames: window.KittyChars is not loaded"); }
    K.injectCss();
    var root = ctx.root;
    root.classList.add("rw-hc");
    var friendId = FRIENDS[friendTurn % FRIENDS.length];
    friendTurn += 1;
    var friendName = (K.names && K.names[friendId]) || "Friend";
    /* the order: a cup colour and one favourite topping (changes every time) */
    var seed = (Date.now() / 1000) | 0;
    var order = { cup: CUPS[seed % 3].id, fav: TOPS[(seed >> 2) % 4].id };

    var S = {
      step: "order", cup: null, level: 0, stirs: 0, tops: [], served: false, bell: false, belled: false,
      pouring: false, pressLevel: 0, spoonIn: false, spoonA: -0.6, stirAcc: 0
    };
    var L = {};

    root.innerHTML =
      '<div class="rw-hc-room" aria-hidden="true">' + (art("bg") ? imgTag(art("bg")) : "") + "</div>" +
      '<div class="rw-scene">' +
      '<div class="rw-hc-lamp" aria-hidden="true">' + svg("0 0 100 140", lampArt(uid())) + "</div>" +
      '<div class="rw-hc-window" aria-hidden="true">' + svg("0 0 200 212", windowArt(uid())) + "</div>" +
      '<div class="rw-hc-wallshelf" aria-hidden="true">' + svg("0 0 240 100", wallShelfArt(uid())) + "</div>" +
      '<div class="rw-char rw-hc-mimi"></div>' +
      '<div class="rw-char rw-hc-friend"><div class="rw-hc-fwalk"><div class="rw-hc-fart"></div><div class="rw-hc-held" hidden></div></div></div>' +
      '<div class="rw-hc-counter" aria-hidden="true"><div class="rw-hc-top"></div><div class="rw-hc-front"><i></i><i></i><i></i><i></i></div></div>' +
      '<div class="rw-hc-mat" aria-hidden="true">' + svg("0 0 200 60", matArt(uid())) + "</div>" +
      '<div class="rw-hc-sticker" hidden aria-hidden="true"></div>' +
      '<div class="rw-hc-cup" hidden role="img" aria-label="Your hot chocolate"></div>' +
      '<div class="rw-hc-stream" hidden aria-hidden="true"></div>' +
      '<div class="rw-hc-jug" hidden aria-hidden="true"></div>' +
      '<button type="button" class="rw-hc-cupzone" hidden aria-label="The cup"></button>' +
      '<button type="button" class="rw-hc-bell" hidden aria-label="Ring the bell">' + svg("0 0 120 112", bellArt(uid()), "rw-art") + "</button>" +
      '<button type="button" class="rw-hc-friendhit" aria-label="' + friendName + '" disabled></button>' +
      '<div class="rw-hc-order" hidden role="img"></div>' +
      '<div class="rw-hc-bubble" hidden data-rg-fit></div>' +
      "</div>" +
      '<div class="rw-hc-shelf" role="group" aria-label="Things to make the drink"></div>';

    var q = function (s) { return root.querySelector(s); };
    var scene = q(".rw-scene");
    var mimi = q(".rw-hc-mimi");
    var friend = q(".rw-hc-friend");
    var fwalk = q(".rw-hc-fwalk");
    var fart = q(".rw-hc-fart");
    var held = q(".rw-hc-held");
    var counter = q(".rw-hc-counter");
    var mat = q(".rw-hc-mat");
    var sticker = q(".rw-hc-sticker");
    var cupEl = q(".rw-hc-cup");
    var stream = q(".rw-hc-stream");
    var jugEl = q(".rw-hc-jug");
    var cupZone = q(".rw-hc-cupzone");
    var bellBtn = q(".rw-hc-bell");
    var friendHit = q(".rw-hc-friendhit");
    var orderEl = q(".rw-hc-order");
    var bubble = q(".rw-hc-bubble");
    var shelf = q(".rw-hc-shelf");
    var lamp = q(".rw-hc-lamp");
    var win = q(".rw-hc-window");
    var wallShelf = q(".rw-hc-wallshelf");

    /* ---- characters ---- */
    var mimiPose = "";
    function setMimi(pose, eyes) {
      var key = pose + "/" + (eyes || "");
      if (key === mimiPose) { return; }
      mimiPose = key;
      var pic = art("mimi_" + (eyes === "happy" && pose === "stand" ? "smile" : pose === "five_r" ? "five" : pose));
      mimi.innerHTML = pic ? imgTag(pic) : K.full("kitty", pose, eyes ? { eyes: eyes } : undefined);
    }
    function rosy(svgText, on) {
      if (!on) { return svgText; }
      var blush = '<g class="rw-rosy"><ellipse cx="58" cy="122" rx="15" ry="8" fill="#f27a98" opacity=".5"/><ellipse cx="142" cy="122" rx="15" ry="8" fill="#f27a98" opacity=".5"/></g>';
      var i = svgText.lastIndexOf("</g></svg>");
      return i < 0 ? svgText : svgText.slice(0, i) + blush + svgText.slice(i);
    }
    function setFriend(pose, eyes, isRosy) {
      var pic = art("friend_" + friendId + "_" + ({ eat: "sip", happy: "cheer" }[pose] || pose));
      fart.innerHTML = pic ? imgTag(pic) : rosy(K.full(friendId, pose, eyes ? { eyes: eyes } : undefined), isRosy);
    }
    var smileTimer = 0;
    function mimiSmile() {
      setMimi("stand", "happy");
      smileTimer += 1;
      var me = smileTimer;
      ctx.wait(1100, function () { if (me === smileTimer && S.step !== "react" && S.step !== "end") { setMimi("stand"); } });
    }

    /* ---- the shelf of tools ---- */
    var tools = [];
    function addTool(kind, id, label, art) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "rw-tool rw-wait";
      b.dataset.tool = kind;
      b.dataset.id = id;
      b.setAttribute("aria-label", label);
      b.innerHTML = '<span class="rw-tool-pad"></span>' + art;
      shelf.appendChild(b);
      tools.push(b);
      return b;
    }
    var cupTools = CUPS.map(function (c) { return addTool("cup", c.id, c.name, cupIcon(c)); });
    var jugTool = addTool("jug", "jug", "Milk jug", jugIcon());
    var spoonTool = addTool("spoon", "spoon", "Spoon", spoonIcon());
    var topTools = TOPS.map(function (t) { return addTool("top", t.id, t.name, toppingIcon(t.id)); });
    function toolState(list, cls) {
      list.forEach(function (b) {
        b.classList.remove("rw-now", "rw-wait", "rw-spent");
        b.classList.add(cls);
        b.setAttribute("aria-disabled", cls === "rw-now" ? "false" : "true");
      });
    }

    /* ---- layout: everything in px from the root size ---- */
    function layout() {
      var W = root.clientWidth;
      var H = root.clientHeight;
      if (W < 10 || H < 10) { return; }
      var mode = (W / H < 0.85 && W < 640) ? "tall" : (H < 520 && W > H ? "side" : "wide");
      root.dataset.layout = mode;
      var sc = {};
      var sh = {};
      if (mode === "tall") {
        sc = { x: 0, y: 0, w: W, h: Math.round(H * 0.55) };
        sh = { x: 0, y: sc.h, w: W, h: H - sc.h };
      } else if (mode === "side") {
        sc = { x: 0, y: 0, w: Math.round(W * 0.62), h: H };
        sh = { x: sc.w, y: 0, w: W - sc.w, h: H };
      } else {
        var shH = Math.round(Math.max(150, H * 0.28));
        var sw = Math.min(W, 1100);
        sc = { x: Math.round((W - sw) / 2), y: 0, w: sw, h: H - shH };
        sh = { x: 0, y: H - shH, w: W, h: shH };
      }
      L.mode = mode; L.W = W; L.H = H; L.sc = sc; L.sh = sh;
      scene.style.cssText = "left:" + sc.x + "px;top:" + sc.y + "px;width:" + sc.w + "px;height:" + sc.h + "px";
      shelf.style.cssText = "left:" + sh.x + "px;top:" + sh.y + "px;width:" + sh.w + "px;height:" + sh.h + "px";
      layoutShelf(sh);

      var w = sc.w;
      var h = sc.h;
      var topY = Math.round(h * (mode === "tall" ? 0.72 : 0.76));
      L.topY = topY;
      var slab = Math.max(12, Math.round(h * 0.045));
      /* the counter runs the full width of the room */
      var cLeft = mode === "wide" ? -sc.x : 0;
      var cW = mode === "wide" ? W : w;
      counter.style.cssText = "left:" + cLeft + "px;top:" + topY + "px;width:" + cW + "px;height:" + (h - topY) + "px;--slab:" + slab + "px";

      var ch = Math.round(Math.min(h * (mode === "tall" ? 0.64 : 0.7), w * (mode === "tall" ? 0.5 : 0.36) * 1.3));
      var cwid = Math.round(ch * 200 / 260);
      var charTop = Math.round(topY + slab * 0.4 - ch * 0.76);
      L.ch = ch;
      var mx = Math.round(w * (mode === "tall" ? 0.2 : 0.17));
      var fx = Math.round(w * (mode === "tall" ? 0.8 : 0.83));
      L.fx = fx; L.mx = mx; L.charTop = charTop; L.cwid = cwid;
      mimi.style.cssText = "left:" + (mx - cwid / 2) + "px;top:" + charTop + "px;width:" + cwid + "px;height:" + ch + "px";
      friend.style.left = (fx - cwid / 2) + "px";
      friend.style.top = charTop + "px";
      friend.style.width = cwid + "px";
      friend.style.height = ch + "px";
      /* the friend's tap area: head and body above the counter, at least 64 px */
      var hitW = Math.max(72, Math.round(cwid * 0.8));
      var hitH = Math.max(72, Math.round(topY - charTop));
      friendHit.style.cssText = "left:" + Math.round(fx - hitW / 2) + "px;top:" + Math.max(0, topY - hitH) + "px;width:" + hitW + "px;height:" + hitH + "px";

      /* the cup and the mat in the middle */
      var cs = Math.round(Math.min(w * (mode === "tall" ? 0.38 : 0.24), h * 0.4));
      var cx = Math.round(w * 0.5);
      L.cs = cs; L.cx = cx;
      var cupW = cs;
      var cupH = Math.round(cs * 210 / 220);
      var cupTop = Math.round(topY + slab * 0.55 - cupH * 0.92);
      L.cup = { left: cx - Math.round(cupW * 100 / 220), top: cupTop, width: cupW, height: cupH };
      cupEl.style.cssText = "left:" + L.cup.left + "px;top:" + cupTop + "px;width:" + cupW + "px;height:" + cupH + "px";
      sticker.style.cssText = cupEl.style.cssText;
      var mw = Math.round(cs * 1.15);
      var mh = Math.round(mw * 60 / 200);
      mat.style.cssText = "left:" + (cx - mw / 2) + "px;top:" + Math.round(topY + slab * 0.5 - mh * 0.5) + "px;width:" + mw + "px;height:" + mh + "px";
      var zw = Math.max(80, Math.round(cupW * 1.1));
      var zh = Math.max(80, Math.round(cupH * 1.05));
      cupZone.style.cssText = "left:" + Math.round(cx - zw / 2) + "px;top:" + Math.round(cupTop + cupH * 0.42 - zh / 2) + "px;width:" + zw + "px;height:" + zh + "px";
      /* the pouring jug sits up and to the left of the cup; its spout pours into the cup */
      var jw = Math.round(cs * 0.95);
      var jscale = jw / 220;
      L.spout = { x: cx - cupW * 0.08, y: cupTop - cs * 0.42 };
      L.jug = { left: Math.round(L.spout.x - 191 * jscale), top: Math.round(L.spout.y - 135 * jscale), width: jw, height: jw };
      jugEl.style.cssText = "left:" + L.jug.left + "px;top:" + L.jug.top + "px;width:" + jw + "px;height:" + jw + "px";
      placeStream();
      /* the bell, between the cup and the friend */
      var bs = Math.max(72, Math.round(cs * (mode === "wide" ? 0.62 : 0.66)));
      var bx = Math.round(Math.min(cx + cupW * 0.62 + bs * 0.55, w - bs * 0.55));
      bellBtn.style.cssText = "left:" + Math.round(bx - bs / 2) + "px;top:" + Math.round(topY + slab * 0.6 - bs * 0.93) + "px;width:" + bs + "px;height:" + bs + "px";

      /* room decor */
      var ww = Math.round(Math.min(w * (mode === "tall" ? 0.34 : 0.22), h * 0.46));
      win.style.cssText = "left:" + Math.round(cx - ww / 2) + "px;top:" + Math.round(h * 0.05) + "px;width:" + ww + "px;height:" + Math.round(ww * 212 / 200) + "px";
      var lw = Math.round(Math.min(w * 0.1, h * 0.2));
      lamp.style.cssText = "left:" + Math.round(w * (mode === "tall" ? 0.24 : 0.31) - lw / 2) + "px;top:0;width:" + lw + "px;height:" + Math.round(lw * 1.4) + "px";
      var sw2 = Math.round(Math.min(w * 0.22, h * 0.42));
      wallShelf.style.cssText = "left:" + Math.round(mx - sw2 / 2) + "px;top:" + Math.round(Math.max(h * 0.04, Math.min(h * 0.07, charTop - sw2 * 0.5))) + "px;width:" + sw2 + "px;height:" + Math.round(sw2 * 100 / 240) + "px";
      wallShelf.hidden = charTop - sw2 * 0.42 < h * 0.03;
      lamp.hidden = mode === "tall" || !!art("bg");
      if (art("bg")) { win.hidden = true; wallShelf.hidden = true; }

      /* the order card: above the friend's head when there is room, else beside it */
      var oc = Math.round(Math.max(96, Math.min(h * 0.3, w * 0.2, 170)));
      L.oc = oc;
      var headTop = charTop + ch * 0.02;
      var ox;
      var oy;
      if (headTop - oc - 18 >= 4) {
        ox = Math.min(w - oc - 6, fx - oc / 2 - cwid * 0.12);
        oy = Math.max(6, headTop - oc - 18);
        orderEl.dataset.tail = "down";
      } else {
        ox = Math.round(fx - cwid * 0.42 - oc - 10);
        oy = Math.round(Math.max(6, h * 0.05));
        orderEl.dataset.tail = "right";
      }
      orderEl.style.cssText = "left:" + Math.round(ox) + "px;top:" + Math.round(oy) + "px;width:" + oc + "px;height:" + oc + "px";
      placeBubble();
      if (doneBtn) { placeDone(); }
    }
    function layoutShelf(sh) {
      var n = tools.length;
      var pad = 10;
      var best = { s: 0, cols: n };
      for (var cols = 1; cols <= n; cols += 1) {
        var rows = Math.ceil(n / cols);
        var s = Math.min((sh.w - pad * 2) / cols, (sh.h - pad * 2) / rows, 132);
        if (s > best.s + 0.5) { best = { s: s, cols: cols, rows: rows }; }
      }
      var size = Math.floor(best.s);
      shelf.style.setProperty("--rw-item", size + "px");
      shelf.style.setProperty("--rw-cols", best.cols);
      shelf.style.setProperty("--rw-row", Math.floor((sh.h - pad * 2) / best.rows) + "px");
      L.item = size;
    }
    function placeStream() {
      var surf = L.cup.top + (100 - 24 * Math.min(1, S.level) - 4) / 210 * L.cup.height;
      var sw = Math.max(7, Math.round(L.cs * 0.07));
      stream.style.cssText = "left:" + Math.round(L.spout.x - sw / 2) + "px;top:" + Math.round(L.spout.y) + "px;width:" + sw + "px;height:" + Math.max(4, Math.round(surf - L.spout.y)) + "px";
    }

    /* ---- the speech bubble ---- */
    var bubbleWho = null;
    var bubbleN = 0;
    function say(who, text, ms) {
      ctx.speak(text);
      bubbleWho = who;
      bubble.textContent = text;
      bubble.className = "rw-hc-bubble rw-from-" + who;
      bubble.hidden = false;
      placeBubble();
      ctx.animate(bubble, [{ opacity: 0, transform: "scale(.85)" }, { opacity: 1, transform: "scale(1)" }], { duration: 380, easing: ctx.spring.curve, fadeFrom: 0 });
      bubbleN += 1;
      var me = bubbleN;
      ctx.wait(ms || 2600, function () { if (me === bubbleN) { bubble.hidden = true; } });
    }
    function placeBubble() {
      if (bubble.hidden || !L.sc) { return; }
      var w = L.sc.w;
      var h = L.sc.h;
      bubble.style.maxWidth = Math.round(Math.min(w * 0.46, 340)) + "px";
      var bw = bubble.offsetWidth;
      var bh = bubble.offsetHeight;
      /* things the bubble must not cover (boxes inside the scene) */
      var avoid = [];
      function box(el) { return { l: parseFloat(el.style.left), t: parseFloat(el.style.top), r: parseFloat(el.style.left) + parseFloat(el.style.width), b: parseFloat(el.style.top) + parseFloat(el.style.height) }; }
      if (!orderEl.hidden) { avoid.push(box(orderEl)); }
      if (!jugEl.hidden) { avoid.push(box(jugEl)); }
      if (!wallShelf.hidden) { avoid.push(box(wallShelf)); }
      if (!cupEl.hidden) { var c = box(cupEl); avoid.push({ l: c.l, t: c.t - L.cs * 0.3, r: c.r, b: c.b }); }
      var cands;
      var head = L.charTop + L.ch * 0.02;
      if (bubbleWho === "friend") {
        cands = [[L.fx - bw / 2, head - bh - 8], [L.fx - L.cwid * 0.42 - bw, head + L.ch * 0.06], [L.fx - bw + L.cwid * 0.1, head - bh - 8], [L.fx - L.cwid * 0.5 - bw, 6]];
      } else {
        cands = [[L.mx - bw / 2, head - bh - 8], [L.mx + L.cwid * 0.42, head + L.ch * 0.06], [L.mx + L.cwid * 0.3, head - bh * 0.6], [L.mx - L.cwid * 0.2, 6]];
      }
      var pick = null;
      for (var i = 0; i < cands.length && !pick; i += 1) {
        var x = Math.max(6, Math.min(w - bw - 6, cands[i][0]));
        var y = Math.max(6, Math.min(h - bh - 6, cands[i][1]));
        var hit = avoid.some(function (a) { return x < a.r && x + bw > a.l && y < a.b && y + bh > a.t; });
        if (!hit && cands[i][1] >= 4) { pick = [x, y]; }
      }
      if (!pick) { pick = [Math.max(6, Math.min(w - bw - 6, cands[1][0])), Math.max(6, Math.min(h - bh - 6, cands[1][1]))]; }
      bubble.style.left = Math.round(pick[0]) + "px";
      bubble.style.top = Math.round(pick[1]) + "px";
    }

    /* ---- the cup in the scene ---- */
    var cupP = null;
    function cupDef() { return CUPS.filter(function (c) { return c.id === S.cup; })[0]; }
    function drawCup() {
      cupP = uid();
      var mi = Math.min(3, S.stirs);
      cupEl.innerHTML = svg("0 0 220 210", mugArt(cupDef(), cupP, { level: S.level, milk: MILK[mi], milkTop: MILK_TOP[mi], mood: S.step === "react" ? "happy" : "" }));
      drawSpoonIn();
      drawTops(-1);
      if (S.stirs >= 3) { cupEl.querySelector(".rw-steam").style.display = ""; }
    }
    function setLevel(v) {
      S.level = Math.max(0, Math.min(1, v));
      var g = cupEl.querySelector(".rw-liquid");
      if (g) { g.setAttribute("transform", "translate(0 " + (100 - 24 * S.level).toFixed(1) + ")"); }
      placeStream();
    }
    function setMilk(t) {
      /* t from 0 to 3: white milk to chocolate */
      var i = Math.min(2, Math.floor(t));
      var f = Math.min(1, t - i);
      var a = mix(MILK[i], MILK[i + 1], f);
      var b = mix(MILK_TOP[i], MILK_TOP[i + 1], f);
      var m = cupEl.querySelector(".rw-milk");
      var mt = cupEl.querySelector(".rw-milktop");
      if (m) { m.setAttribute("fill", a); }
      if (mt) { mt.setAttribute("fill", b); }
    }
    function drawSpoonIn() {
      var g = cupEl.querySelector(".rw-spoonin");
      if (!g) { return; }
      if (!S.spoonIn) { g.style.display = "none"; return; }
      g.style.display = "";
      var y0 = 100 - 24 * S.level;
      var px = 100 + Math.cos(S.spoonA) * 26;
      var py = y0 + Math.sin(S.spoonA) * 6.5;
      var ex = px + 34 + Math.cos(S.spoonA) * 6;
      var ey = py - 78;
      g.innerHTML = '<path d="M' + px.toFixed(1) + " " + py.toFixed(1) + " L" + ex.toFixed(1) + " " + ey.toFixed(1) + '" stroke="' + INK + '" stroke-width="15" stroke-linecap="round"/>' +
        '<path d="M' + px.toFixed(1) + " " + py.toFixed(1) + " L" + ex.toFixed(1) + " " + ey.toFixed(1) + '" stroke="#ee8ba3" stroke-width="9" stroke-linecap="round"/>' +
        '<ellipse cx="' + px.toFixed(1) + '" cy="' + (py + 1).toFixed(1) + '" rx="10" ry="3.4" fill="' + MILK_TOP[Math.min(3, S.stirs)] + '" opacity=".9"/>';
    }
    function topsMarkup(p, newIdx) {
      var order = S.tops.map(function (t, i) { return i; }).sort(function (a, b) { return SPOTS[S.tops[a].spot][1] - SPOTS[S.tops[b].spot][1]; });
      return order.map(function (i) {
        var t = S.tops[i];
        var sp = SPOTS[t.spot];
        return '<g transform="translate(' + sp[0] + " " + sp[1] + ') scale(1.5)"><g class="rw-top' + (i === newIdx ? " rw-top-new" : "") + '">' + toppingArt(t.kind, p + "t" + i, false) + "</g></g>";
      }).join("");
    }
    /* a fresh copy of the finished drink (own gradient ids, so it still draws when the scene cup is hidden) */
    function drinkSvg() {
      var p = uid();
      return svg("0 0 220 210", mugArt(cupDef(), p, { level: 1, milk: MILK[3], milkTop: MILK_TOP[3] })
        .replace('<g class="rw-steam" style="display:none">', '<g class="rw-steam">')
        .replace('<g class="rw-tops"></g>', '<g class="rw-tops">' + topsMarkup(p, -1) + "</g>"));
    }
    function drawTops(newIdx) {
      var g = cupEl.querySelector(".rw-tops");
      if (!g) { return; }
      g.innerHTML = topsMarkup(cupP, newIdx);
      var n = g.querySelector(".rw-top-new");
      if (n) {
        ctx.animate(n, [
          { transform: "translateY(-34px) scale(.7)", opacity: 0 },
          { transform: "translateY(0) scale(1.08,.9)", opacity: 1, offset: 0.55 },
          { transform: "translateY(0) scale(1)", opacity: 1 }
        ], { duration: 520, easing: "ease-out", fadeFrom: 0 });
      }
    }

    /* ---- steps ---- */
    function setStep(step) {
      S.step = step;
      root.dataset.step = step;
      toolState(cupTools, step === "cup" ? "rw-now" : (S.cup ? "rw-spent" : "rw-wait"));
      toolState([jugTool], step === "pour" ? "rw-now" : (S.level >= 1 ? "rw-spent" : "rw-wait"));
      toolState([spoonTool], step === "stir" ? "rw-now" : (S.stirs >= 3 ? "rw-spent" : "rw-wait"));
      toolState(topTools, (step === "toppings" && S.tops.length < 8) ? "rw-now" : (S.tops.length >= 8 || step === "serve" || step === "react" || step === "end" ? "rw-spent" : "rw-wait"));
      mat.classList.toggle("rw-glow", step === "cup");
      cupZone.hidden = !(step === "pour" || step === "stir");
      friendHit.disabled = step !== "serve";
      friend.classList.toggle("rw-want", step === "serve");
      ctx.hint(hintTarget);
    }
    function hintTarget() {
      switch (S.step) {
        case "cup": return cupTools[CUPS.map(function (c) { return c.id; }).indexOf(order.cup)];
        case "pour": return jugTool;
        case "stir": return S.spoonIn ? cupZone : spoonTool;
        case "toppings":
          if (!S.tops.length) { return topTools[TOPS.map(function (t) { return t.id; }).indexOf(order.fav)]; }
          return bellBtn.hidden ? null : bellBtn;
        case "serve": return friendHit;
        default: return null;
      }
    }

    /* 1. order */
    function drawOrder() {
      var p = uid();
      var c = CUPS.filter(function (x) { return x.id === order.cup; })[0];
      var mug = mugArt(c, p, { level: 1, milk: MILK[3], milkTop: MILK_TOP[3] });
      var fav = '<g transform="translate(100 40) scale(1.55)">' + toppingArt(order.fav, p + "f", true) + "</g>";
      orderEl.innerHTML = '<div class="rw-hc-card">' + svg("0 -30 220 240", mug.replace('<g class="rw-tops"></g>', fav)) + "</div>";
      orderEl.setAttribute("aria-label", "Order: a " + c.name.toLowerCase() + " with " + TOPS.filter(function (t) { return t.id === order.fav; })[0].name.toLowerCase());
    }
    function beginOrder() {
      setStep("order");
      setMimi("wave");
      setFriend("walk");
      drawOrder();
      var off = L.sc.w - (L.fx - L.cwid / 2) + 20;
      fwalk.style.transform = "translateX(" + off + "px)";
      ctx.wait(60, function () {
        fwalk.style.transition = ctx.reduced ? "opacity " + ctx.dur(300) + "ms" : "transform " + ctx.dur(1500) + "ms cubic-bezier(.3,.6,.35,1)";
        if (ctx.reduced) { fwalk.style.opacity = "0"; void fwalk.offsetWidth; fwalk.style.opacity = "1"; }
        fwalk.style.transform = "translateX(0)";
      });
      ctx.wait(1600, function () {
        fwalk.style.transition = "";
        setFriend("stand");
        setMimi("stand");
        orderEl.hidden = false;
        ctx.popIn(orderEl);
        ctx.sound.pop();
        say("friend", LINES.hello, 3200);
      });
      ctx.wait(3000, function () {
        setStep("cup");
        say("mimi", LINES.cup);
        if (ctx.auto) { ctx.wait(700, function () { chooseCup(CUPS.map(function (c) { return c.id; }).indexOf(order.cup), null); }); }
      });
    }

    /* 2. cup */
    function chooseCup(i, fromRect) {
      if (S.step !== "cup") { return false; }
      var c = CUPS[i];
      S.cup = c.id;
      ctx.keepsake = "rewards/art/cafe/cup_" + c.id + ".png";   // what she really chose: the game reports it (journey.js)
      var from = fromRect || ctx.rect(cupTools[i]);
      cupTools[i].classList.add("rw-used");
      drawCup();
      cupEl.hidden = false;
      setStep("pour");
      ctx.slideFrom(cupEl, from, 650);
      ctx.wait(560, function () { ctx.land(cupEl); ctx.sound.plop(); mimiSmile(); });
      ctx.wait(900, function () {
        say("mimi", LINES.pour);
        jugEl.innerHTML = svg("-20 -20 220 220", '<g class="rw-jugtilt">' + jugArt(uid()) + "</g>");
        jugEl.hidden = false;
        ctx.popIn(jugEl);
        if (ctx.auto) { autoPour(0); }
      });
      return true;
    }
    cupTools.forEach(function (b, i) {
      ctx.drag(b, {
        enabled: function () { return S.step === "cup"; },
        zones: function () { return [{ el: mat, id: "mat" }]; },
        onTap: function () { chooseCup(i, null); },
        onDrop: function (z, p, gr) { return chooseCup(i, gr ? { left: gr.left, top: gr.top, width: gr.width, height: gr.height } : null); }
      });
    });

    /* 3. pour: hold to pour; a short press adds a third */
    var tilt = ctx.spring.follow({ value: 0, stiffness: 120, onUpdate: function (a) {
      var g = jugEl.querySelector(".rw-jugtilt");
      if (g) { g.setAttribute("transform", "rotate(" + a.toFixed(1) + " 80 100)"); }
      stream.hidden = !(a > 38 && S.pouring);
    } });
    var pourLoopOn = false;
    function pourLoop() {
      if (pourLoopOn) { return; }
      pourLoopOn = true;
      ctx.loop(function (dt) {
        var moving = tilt.step(ctx.reduced ? 1 : dt);
        if (S.pouring && tilt.value() > 38) {
          setLevel(S.level + dt / 2.1);
          if (S.level >= 1) { endPour(true); }
        } else if (!S.pouring && S.pressTarget != null && S.level < S.pressTarget) {
          /* a short tap keeps pouring until the next third */
          tilt.set(55);
          if (tilt.value() > 38) {
            stream.hidden = false;
            setLevel(Math.min(S.pressTarget, S.level + dt / 2.1));
          }
          if (S.level >= S.pressTarget - 0.001) { S.pressTarget = null; stream.hidden = true; tilt.set(0); ctx.sound.pourStop(); if (S.level >= 0.999) { pourDone(); } }
        }
        if (!moving && !S.pouring && S.pressTarget == null && S.step !== "pour") { pourLoopOn = false; return false; }
        return true;
      });
    }
    function startPour() {
      if (S.step !== "pour" || S.pouring) { return; }
      S.pouring = true;
      S.pressStart = S.level;
      S.pressTarget = null;
      tilt.set(55);
      ctx.sound.pourStart();
      pourLoop();
    }
    function endPour(full) {
      if (!S.pouring) { return; }
      S.pouring = false;
      if (!full) {
        /* a press always pours at least to the next third */
        var next = Math.min(1, Math.floor(S.pressStart * 3 + 1.0001) / 3);
        if (S.level < next - 0.001) { S.pressTarget = next; return; }
      }
      ctx.sound.pourStop();
      tilt.set(0);
      stream.hidden = true;
      if (S.level >= 0.999) { pourDone(); }
    }
    function pourDone() {
      if (S.step !== "pour") { return; }
      setLevel(1);
      tilt.set(0);
      stream.hidden = true;
      ctx.sound.pourStop();
      setStep("stir");
      mimiSmile();
      ctx.wait(500, function () {
        ctx.animate(jugEl, [{ opacity: 1 }, { opacity: 0, transform: "translateY(-12px)" }], { duration: 400, fill: "forwards", keep: true });
        ctx.wait(420, function () { jugEl.hidden = true; });
        say("mimi", LINES.stir);
        if (ctx.auto) { ctx.wait(700, autoStir); }
      });
    }
    function autoPour(n) {
      if (S.step !== "pour" || n > 6) { return; }
      startPour();
      ctx.wait(120, function () { endPour(false); });
      ctx.wait(1300, function () { autoPour(n + 1); });
    }
    [jugTool, cupZone].forEach(function (el) {
      el.style.touchAction = "none";
      ctx.on(el, "pointerdown", function (e) {
        if (S.step !== "pour") { return; }
        e.preventDefault();
        try { el.setPointerCapture(e.pointerId); } catch (err) {}
        startPour();
      });
      ctx.on(el, "pointerup", function () { endPour(false); });
      ctx.on(el, "pointercancel", function () { endPour(false); });
      ctx.on(el, "click", function (e) { if (e.detail === 0 && S.step === "pour") { startPour(); endPour(false); } });
    });

    /* 4. stir: circle on the cup, or tap the cup or the spoon */
    var stirAnim = false;
    function putSpoon() {
      if (S.spoonIn) { return; }
      S.spoonIn = true;
      spoonTool.classList.add("rw-used");
      drawSpoonIn();
      ctx.sound.clink();
    }
    function addStir() {
      if (S.step !== "stir") { return; }
      S.stirs += 1;
      ctx.sound.clink();
      var from = S.stirs - 1;
      var t0 = 0;
      ctx.loop(function (dt) {
        t0 = Math.min(1, t0 + dt / 0.6);
        setMilk(from + t0);
        return t0 < 1;
      });
      if (S.stirs >= 3) {
        S.stirs = 3;
        ctx.wait(650, function () { stirDone(); });
      }
    }
    function autoStir() {
      if (S.step !== "stir") { return; }
      stirOnce();
      ctx.wait(800, autoStir);
    }
    function stirOnce() {
      if (S.step !== "stir") { return; }
      putSpoon();
      if (stirAnim) { addStir(); return; }  /* a quick second tap still counts; the spoon keeps turning */
      stirAnim = true;
      var a0 = S.spoonA;
      var t = 0;
      ctx.loop(function (dt) {
        t = Math.min(1, t + dt / 0.7);
        var e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        S.spoonA = a0 + e * Math.PI * 2;
        drawSpoonIn();
        if (t >= 1) { stirAnim = false; return false; }
        return true;
      });
      addStir();
    }
    function stirDone() {
      if (S.step !== "stir") { return; }
      setMilk(3);
      setStep("toppings");
      cupEl.querySelector(".rw-steam").style.display = "";
      ctx.animate(cupEl.querySelector(".rw-steam"), [{ opacity: 0 }, { opacity: 1 }], { duration: 900, keep: true });
      mimiSmile();
      ctx.wait(500, function () {
        S.spoonIn = false;
        drawSpoonIn();
        say("mimi", LINES.top);
        if (ctx.auto) { autoTops(); }
      });
    }
    var circ = null;
    ctx.on(cupZone, "pointerdown", function (e) {
      if (S.step !== "stir") { return; }
      e.preventDefault();
      try { cupZone.setPointerCapture(e.pointerId); } catch (err) {}
      var c = surfaceCentre();
      circ = { id: e.pointerId, x0: e.clientX, y0: e.clientY, moved: false, last: Math.atan2(e.clientY - c.y, e.clientX - c.x), acc: 0 };
    });
    ctx.on(cupZone, "pointermove", function (e) {
      if (!circ || e.pointerId !== circ.id || S.step !== "stir") { return; }
      if (!circ.moved && Math.hypot(e.clientX - circ.x0, e.clientY - circ.y0) < 6) { return; }
      circ.moved = true;
      putSpoon();
      var c = surfaceCentre();
      var a = Math.atan2(e.clientY - c.y, e.clientX - c.x);
      var d = a - circ.last;
      if (d > Math.PI) { d -= Math.PI * 2; }
      if (d < -Math.PI) { d += Math.PI * 2; }
      circ.last = a;
      circ.acc += Math.abs(d);
      S.spoonA = a;
      drawSpoonIn();
      if (circ.acc >= Math.PI * 2) { circ.acc -= Math.PI * 2; addStir(); }
    });
    function endCirc(e) {
      if (!circ || e.pointerId !== circ.id) { return; }
      var was = circ;
      circ = null;
      if (!was.moved && S.step === "stir") { stirOnce(); }
    }
    ctx.on(cupZone, "pointerup", endCirc);
    ctx.on(cupZone, "pointercancel", function () { circ = null; });
    ctx.on(cupZone, "click", function (e) { if (e.detail === 0 && S.step === "stir") { stirOnce(); } });
    function surfaceCentre() {
      var r = cupEl.getBoundingClientRect();
      return { x: r.left + r.width * 100 / 220, y: r.top + r.height * (100 - 24 * S.level) / 210 };
    }
    ctx.drag(spoonTool, {
      enabled: function () { return S.step === "stir"; },
      zones: function () { return [{ el: cupEl, id: "cup" }]; },
      onTap: function () { stirOnce(); },
      onDrop: function () { stirOnce(); return true; }
    });

    /* 5. toppings */
    function freeSpots() {
      var used = S.tops.map(function (t) { return t.spot; });
      return SPOTS.map(function (s, i) { return i; }).filter(function (i) { return used.indexOf(i) < 0; });
    }
    function addTopping(kind, point) {
      if (S.step !== "toppings") { return false; }
      var free = freeSpots();
      if (!free.length) { return false; }
      var spot = free[0];
      if (point) {
        /* the free spot nearest to where she let go */
        var r = ctx.rect(cupEl);
        var lx = (point.x - r.left) / r.width * 220;
        var ly = (point.y - r.top) / r.height * 210;
        free.sort(function (a, b) {
          return Math.hypot(SPOTS[a][0] - lx, SPOTS[a][1] - ly) - Math.hypot(SPOTS[b][0] - lx, SPOTS[b][1] - ly);
        });
        spot = free[0];
      }
      S.tops.push({ kind: kind, spot: spot });
      drawTops(S.tops.length - 1);
      ctx.wait(260, function () { ctx.sound.plop(); });
      mimiSmile();
      if (S.tops.length === 1) {
        ctx.wait(700, function () {
          bellBtn.hidden = false;
          ctx.popIn(bellBtn);
          ctx.sound.pop();
          ctx.hint(hintTarget);
        });
      }
      if (S.tops.length >= 8) {
        toolState(topTools, "rw-spent");
        ctx.wait(500, function () { say("mimi", LINES.full); });
        ctx.wait(2200, function () { if (S.step === "toppings") { say("mimi", LINES.give); } });
      }
      return true;
    }
    topTools.forEach(function (b, i) {
      ctx.drag(b, {
        enabled: function () { return S.step === "toppings" && S.tops.length < 8; },
        zones: function () { return [{ el: cupEl, id: "cup" }]; },
        onTap: function () { addTopping(TOPS[i].id, null); },
        onDrop: function (z, p) { return addTopping(TOPS[i].id, p); }
      });
    });
    function autoTops() {
      var kinds = [order.fav, "cream", "mallow", "sprinkles"];
      kinds.forEach(function (k, j) { ctx.wait(500 + j * 450, function () { addTopping(k, null); }); });
      ctx.wait(500 + kinds.length * 450 + 900, function () { ringBell(); });
      ctx.wait(500 + kinds.length * 450 + 1700, function () { serve(null); });
    }

    /* 6. serve: drag the cup to the friend, or tap the bell and then the friend */
    function ringBell() {
      if (S.step !== "toppings" || !S.tops.length) { return; }
      ctx.sound.bell();
      ctx.land(bellBtn);
      setStep("serve");
      say("mimi", LINES.give);
    }
    ctx.onTap(bellBtn, function () { ringBell(); });
    ctx.onTap(friendHit, function () { if (S.step === "serve") { serve(null); } });
    ctx.drag(cupEl, {
      enabled: function () { return (S.step === "toppings" || S.step === "serve") && S.tops.length > 0; },
      zones: function () { return [{ el: friendHit, id: "friend" }]; },
      onTap: function () { ctx.land(cupEl); ctx.sound.plop(); },
      onDrop: function (z, p, gr) { return serve(gr); }
    });

    /* 7. the friend's reaction */
    function serve(fromRect) {
      if (S.served || !S.tops.length || !(S.step === "toppings" || S.step === "serve")) { return false; }
      S.served = true;
      ctx.sound.bell();
      setStep("react");
      ctx.hint(null);
      bellBtn.hidden = true;
      var hasFav = S.tops.some(function (t) { return t.kind === order.fav; });
      var from = fromRect || ctx.rect(cupEl);
      /* the drink goes into the friend's paws */
      sticker.innerHTML = '<div class="rw-hc-stick">' + drinkSvg() + "</div>";
      cupEl.hidden = true;
      held.innerHTML = drinkSvg();
      held.hidden = false;
      orderEl.hidden = true;
      setFriend("eat", "closed", false);
      ctx.slideFrom(held, from, 600);
      ctx.wait(650, function () {
        setFriend("eat", "closed", true);
        say("friend", LINES.mmm, 1500);
      });
      ctx.wait(1900, function () {
        held.classList.add("rw-down");
        held.style.setProperty("--down", Math.round(L.topY + L.ch * 0.035 - L.charTop - L.ch * 0.33 - L.ch * 0.44 * 0.9) + "px");
        setFriend("happy", "happy", true);
        setMimi("five_r");
        hearts();
        say("friend", hasFav ? LINES.fav : LINES.thanks, 1700);
      });
      ctx.wait(hasFav ? 3500 : 3300, function () {
        if (hasFav) { say("friend", LINES.thanks, 1500); }
      });
      ctx.wait(hasFav ? 4300 : 3900, function () {
        setStep("end");
        setMimi("wave");
        doneBtn = ctx.doneButton(finish, root);
        placeDone();
      });
      ctx.wait(hasFav ? 5100 : 4700, function () {
        setFriend("wave", null, true);
        say("friend", LINES.bye, 1600);
      });
      ctx.wait(hasFav ? 6500 : 6100, function () {
        held.hidden = true;
        setFriend("walk", null, false);
        /* she walks out to the right, so she faces right; the drink she took stays behind as a sticker */
        q(".rw-hc-fart").style.transform = "scaleX(-1)";
        sticker.hidden = false;
        ctx.popIn(sticker);
        ctx.sound.plop();
        var off = L.sc.w - (L.fx - L.cwid / 2) + 30;
        fwalk.style.transition = ctx.reduced ? "opacity " + ctx.dur(300) + "ms" : "transform " + ctx.dur(1600) + "ms cubic-bezier(.5,0,.7,.5)";
        if (ctx.reduced) { fwalk.style.opacity = "0"; } else { fwalk.style.transform = "translateX(" + off + "px)"; }
      });
      ctx.wait(hasFav ? 8200 : 7800, function () { setMimi("stand"); });
      return true;
    }
    function hearts() {
      var r = ctx.rect(friend);
      for (var i = 0; i < 3; i += 1) {
        (function (i) {
          ctx.wait(i * 260, function () {
            var h = document.createElement("div");
            h.className = "rw-heart";
            var s = Math.round(Math.max(30, L.ch * 0.16));
            h.style.cssText = "left:" + Math.round(r.left + r.width * (0.3 + i * 0.2) - s / 2) + "px;top:" + Math.round(r.top + r.height * 0.12) + "px;width:" + s + "px;height:" + s + "px";
            h.innerHTML = heartArt(uid());
            ctx.layer.appendChild(h);
            ctx.animate(h, [
              { transform: "translateY(10px) scale(.6)", opacity: 0 },
              { transform: "translateY(-20px) scale(1)", opacity: 1, offset: 0.3 },
              { transform: "translateY(-" + Math.round(L.ch * 0.4) + "px) scale(1)", opacity: 0 }
            ], { duration: 1800, easing: "ease-out", fill: "forwards", fadeFrom: 0 });
            ctx.wait(1850, function () { if (h.parentNode) { h.parentNode.removeChild(h); } });
          });
        })(i);
      }
    }
    var doneBtn = null;
    function placeDone() {
      if (!doneBtn) { return; }
      var sh = L.sh;
      var bw = Math.max(170, Math.min(260, sh.w * 0.6));
      var bh = Math.max(80, Math.min(110, sh.h * 0.4));
      doneBtn.style.cssText = "left:" + Math.round(sh.x + sh.w / 2 - bw / 2) + "px;top:" + Math.round(sh.y + sh.h / 2 - bh / 2) + "px;width:" + Math.round(bw) + "px;height:" + Math.round(bh) + "px";
      shelf.classList.add("rw-rest");
    }

    function mix(a, b, t) {
      var pa = parseInt(a.slice(1), 16);
      var pb = parseInt(b.slice(1), 16);
      var r = Math.round(((pa >> 16) & 255) + ((((pb >> 16) & 255) - ((pa >> 16) & 255)) * t));
      var g = Math.round(((pa >> 8) & 255) + ((((pb >> 8) & 255) - ((pa >> 8) & 255)) * t));
      var bl = Math.round((pa & 255) + (((pb & 255) - (pa & 255)) * t));
      return "#" + ((1 << 24) + (r << 16) + (g << 8) + bl).toString(16).slice(1);
    }

    setMimi("stand");
    setFriend("stand");
    layout();
    ctx.on(window, "resize", layout);
    beginOrder();
  }

  if (!window.RewardGames || !window.RewardGames.register) { throw new Error("cafe_hot_chocolate.js needs reward_core.js loaded first"); }
  window.RewardGames.register("cafe", { name: "hot_chocolate", label: "Mimi's Hot Chocolate", start: start });
  window.RewardGames.cafeLines = function () { return Object.keys(LINES).map(function (k) { return LINES[k]; }); };
})();
