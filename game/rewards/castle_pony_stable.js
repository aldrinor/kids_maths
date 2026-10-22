/* castle_pony_stable.js - Kennedy's reward game "Pony Stable" (Kids Maths). Registers theme "castle".
 * Spec: 16_kids_maths/kids_reward_games_design_study.md section 4.
 *
 * Play (every step is a tap, a rub or a drag; nothing plays itself; no timing; no reading):
 *   hello  the pony stands in the stable yard with 3 mud patches; the knight says "My pony is muddy. Can you help?"
 *   brush  rub the pony (every 40 px of rubbing cleans a patch, a brush follows the finger), tap the pony,
 *          or tap / drag the brush onto it. When clean the pony shakes its mane, neighs softly: "So shiny!"
 *   feed   tap an apple on the tree: it drops into the basket with one bounce. Then tap the pony, tap the apple
 *          in the basket, or drag it to the pony. The pony crunches; it gets happier each time. 3 apples.
 *   ride   the knight climbs on. A big Go button (a horseshoe): each tap trots one stretch (a third of the
 *          scene in 1.2 s), then stops. At the one log the Jump button glows; the pony jumps only when tapped.
 *          4 stretches to the castle. The camera moves only during a trot or the jump.
 *   gate   tap the drawbridge: it lowers slowly with a creak, the pony trots in, the knight cheers, the
 *          buddy knight waves: "We're home!" The Done button appears.
 * Data for tests: root.dataset.step = hello | brush | shiny | feed | ride | gate | end; root.dataset.mud (patches left),
 * root.dataset.fed (apples eaten), root.dataset.stretch (stretches ridden), root.dataset.art = "ready" once the
 * pictures have loaded and the scene is built; and root.dataset.lines.
 * Needs reward_core.js. Uses window.KnightArt (../modules/knight_art.js) only while a picture file is missing.
 */
(function () {
  "use strict";

  var LINES = {
    hello: "My pony is muddy. Can you help?",
    brush: "Brush the pony.",
    shiny: "So shiny!",
    pick: "Pick an apple.",
    give: "Give it to the pony.",
    yum: "Yum!",
    ride: "Let's ride home!",
    go: "Tap Go!",
    jump: "Jump!",
    gate: "Open the gate!",
    home: "We're home!"
  };

  /* ------------------------------------------------------------------ ART: every picture of this game
   * PNG files with clear backgrounds in game/rewards/art/castle/ (drawn by tools/draw_castle_art.py).
   * A file is used only when art/castle/manifest.json lists it, so a missing file never makes a 404; while one is
   * missing, KnightArt (characters) or a plain shape stands in.
   * Anchors (shared canvases, so layers stack in one box):
   *   pony_*, mud_spot_*, knight_ride*: 700 x 660, hooves on y 652, the pony faces right.
   *   knight_*, buddy_*: 462 x 600, feet on y 596.
   *   castle_gate, drawbridge_*: 1000 x 900; arch x 370..630, y 470..760 (the bridge hinge); bridge end on y 880.
   *   path_near: 3600 x 360 (hooves on y 178); path_mid: 3000 x 520; path_far: 2000 x 900; apple_tree 600 x 760. */
  var ART = {
    stable: "stable_background.png", far: "path_far.png", mid: "path_mid.png", near: "path_near.png",
    knight_idle: "knight_idle.png", knight_cheer: "knight_cheer.png", buddy_wave: "buddy_wave.png",
    ride: "knight_ride.png", ride_cheer: "knight_ride_cheer.png",
    pony_stand: "pony_stand.png", pony_happy: "pony_happy.png", pony_eat: "pony_eat.png", pony_shake: "pony_shake.png",
    pony_walk_a: "pony_walk_a.png", pony_walk_b: "pony_walk_b.png", pony_jump: "pony_jump.png",
    mud_1: "mud_spot_1.png", mud_2: "mud_spot_2.png", mud_3: "mud_spot_3.png",
    apple_1: "apple_1.png", apple_2: "apple_2.png", apple_3: "apple_3.png",
    basket: "apple_basket.png", basket_front: "apple_basket_front.png", tree: "apple_tree.png",
    brush: "brush.png", log: "log.png", go: "go_horseshoe.png", jump: "jump_arrow.png",
    sparkle: "sparkle.png", heart: "heart.png",
    castle: "castle_gate.png", bridge_closed: "drawbridge_closed.png", bridge_open: "drawbridge_open.png"
  };
  var ART_BASE = (function () {
    try { return new URL("art/castle/", document.currentScript.src).href; } catch (e) { return "rewards/art/castle/"; }
  })();
  var artReady = {};
  var artPromise = null;
  function loadArt() {
    if (artPromise) { return artPromise; }
    artPromise = new Promise(function (resolve) {
      setTimeout(resolve, 5000);
      if (!window.fetch) { resolve(); return; }
      fetch(ART_BASE + "manifest.json").then(function (r) { return r.ok ? r.json() : { files: [] }; }).then(function (m) {
        var have = (m && m.files) || [];
        var keys = Object.keys(ART).filter(function (k) { return have.indexOf(ART[k]) >= 0; });
        var left = keys.length;
        if (!left) { resolve(); return; }
        keys.forEach(function (key) {
          var img = new Image();
          img.onload = function () { artReady[key] = ART_BASE + ART[key]; left -= 1; if (!left) { resolve(); } };
          img.onerror = function () { left -= 1; if (!left) { resolve(); } };
          img.src = ART_BASE + ART[key];
        });
      }).catch(function () { resolve(); });
    });
    return artPromise;
  }
  loadArt();
  function art(key) { return artReady[key] || null; }

  /* stand-ins while a picture file is missing */
  var INK = "#563832";
  function plain(key) {
    var K = window.KnightArt;
    if (/^pony_/.test(key)) { return K ? K.full("horse", key === "pony_happy" ? "happy" : "stand") : blob("#cf8f55", 0.5); }
    if (key === "knight_idle") { return K ? K.full("knight", "stand", { plume: true }) : blob("#5b8cf2", 0.4); }
    if (key === "knight_cheer") { return K ? K.full("knight", "cheer", { plume: true }) : blob("#5b8cf2", 0.4); }
    if (key === "buddy_wave") { return K ? K.full("buddy", "wave") : blob("#62c987", 0.4); }
    if (/^apple_\d/.test(key)) { return blob("#e8506a", 0.42); }
    if (/^mud_/.test(key) || /^ride/.test(key) || key === "bridge_open" || key === "basket_front") { return ""; }
    if (key === "go") { return '<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M30 84 L22 50 Q18 18 50 16 Q82 18 78 50 L70 84 L58 84 L64 52 Q66 34 50 34 Q34 34 36 52 L42 84 Z" fill="#f3c650" stroke="' + INK + '" stroke-width="5" stroke-linejoin="round"/></svg>'; }
    if (key === "jump") { return '<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M16 70 Q50 6 84 62" fill="none" stroke="#6fb86a" stroke-width="12" stroke-linecap="round"/><rect x="16" y="74" width="68" height="14" rx="7" fill="#b07a4a" stroke="' + INK + '" stroke-width="4"/></svg>'; }
    if (key === "log") { return blob("#b07a4a", 0.3); }
    if (key === "tree") { return '<svg viewBox="0 0 600 760" aria-hidden="true"><rect x="270" y="420" width="60" height="320" rx="20" fill="#b07a4a" stroke="' + INK + '" stroke-width="6"/><ellipse cx="300" cy="270" rx="270" ry="230" fill="#79c06e" stroke="' + INK + '" stroke-width="6"/></svg>'; }
    if (key === "basket") { return blob("#d29f5c", 0.4); }
    if (key === "brush") { return blob("#b07a4a", 0.35); }
    if (key === "castle") { return '<svg viewBox="0 0 1000 900" aria-hidden="true"><rect x="60" y="230" width="880" height="570" rx="20" fill="#b3bcc8" stroke="' + INK + '" stroke-width="6"/><path d="M370 760 L370 570 Q370 470 500 470 Q630 470 630 570 L630 760 Z" fill="#5c6a86"/></svg>'; }
    if (key === "bridge_closed") { return '<svg viewBox="0 0 1000 900" aria-hidden="true"><path d="M370 760 L370 570 Q370 470 500 470 Q630 470 630 570 L630 760 Z" fill="#b07a4a" stroke="' + INK + '" stroke-width="6"/></svg>'; }
    if (key === "sparkle" || key === "heart") { return blob(key === "heart" ? "#ee7f9c" : "#ffe9a8", 0.45); }
    return "";
  }
  function blob(color, r) {
    return '<svg viewBox="0 0 100 100" aria-hidden="true"><ellipse cx="50" cy="55" rx="' + (r * 100) + '" ry="' + (r * 90) + '" fill="' + color + '" stroke="' + INK + '" stroke-width="5"/></svg>';
  }
  function picHtml(key) {
    var url = art(key);
    return url ? '<img class="rw-pic" alt="" draggable="false" src="' + url + '">' : plain(key);
  }
  function setPic(el, key) {
    if (el.dataset.pic === key) { return; }
    el.dataset.pic = key;
    var url = art(key);
    var img = el.querySelector("img.rw-pic");
    if (url && img) { img.src = url; return; }
    el.innerHTML = picHtml(key);
  }

  /* pony canvas facts (700 x 660) */
  var PW = 700;
  var PH = 660;
  var MUD = [[236, 470], [352, 512], [452, 424]];
  var MOUTH = [604, 392];
  var KW = 462;
  var KH = 600;
  var APPLE_ON_TREE = [[175, 215], [345, 140], [430, 330]];  /* in the 600 x 760 tree */
  var SLOTS = [0.3, 0.5, 0.7];                                    /* basket slots, as a fraction of its width */

  function make(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) { e.className = cls; }
    if (html != null) { e.innerHTML = html; }
    return e;
  }
  function place(el, x, y, w, h) {
    el.style.left = Math.round(x) + "px";
    el.style.top = Math.round(y) + "px";
    el.style.width = Math.round(w) + "px";
    el.style.height = Math.round(h) + "px";
  }

  /* ------------------------------------------------------------------ the game */
  function start(ctx, finish) {
    var root = ctx.root;
    root.classList.add("rw-ps");
    root.dataset.step = "hello";
    root.dataset.art = "";
    loadArt().then(function () {
      if (ctx.isClosed()) { return; }
      build(ctx, finish);
    });
  }

  function build(ctx, finish) {
    var root = ctx.root;
    var S = {
      step: "hello", mud: [true, true, true], tree: [true, true, true], basket: [], fed: 0, eating: false,
      stretch: 0, jumped: false, moving: false, cam: 0, scene: "yard", neighs: 0, pose: "", entered: false, opening: false
    };
    var L = {};

    root.insertAdjacentHTML("afterbegin",
      '<div class="rw-ps-yard" aria-hidden="false">' +
        '<div class="rw-ps-bg">' + picHtml("stable") + "</div>" +
        '<div class="rw-ps-tree" aria-hidden="true">' + picHtml("tree") + "</div>" +
        '<div class="rw-ps-knight rw-ps-char" aria-hidden="true"></div>' +
        '<div class="rw-ps-basket" aria-hidden="true"><div class="rw-ps-bback">' + picHtml("basket") + '</div><div class="rw-ps-bfront">' + picHtml("basket_front") + "</div></div>" +
      "</div>" +
      '<div class="rw-ps-path" hidden>' +
        '<div class="rw-ps-layer rw-ps-far">' + picHtml("far") + "</div>" +
        '<div class="rw-ps-layer rw-ps-mid">' + picHtml("mid") + "</div>" +
        '<div class="rw-ps-layer rw-ps-near">' + picHtml("near") + "</div>" +
        '<div class="rw-ps-world">' +
          '<div class="rw-ps-log" aria-hidden="true">' + picHtml("log") + "</div>" +
          '<div class="rw-ps-castle" aria-hidden="true"><div class="rw-ps-cpic">' + picHtml("castle") + '</div>' +
            '<div class="rw-ps-bridge rw-ps-closed">' + picHtml("bridge_closed") + '</div><div class="rw-ps-bridge rw-ps-open" hidden>' + picHtml("bridge_open") + "</div></div>" +
          '<div class="rw-ps-buddy rw-ps-char" hidden aria-hidden="true">' + picHtml("buddy_wave") + "</div>" +
          '<button type="button" class="rw-ps-gate" hidden aria-label="Open the drawbridge"></button>' +
        "</div>" +
      "</div>" +
      '<div class="rw-ps-pony" role="img" aria-label="The pony"><div class="rw-ps-shadow"></div><div class="rw-ps-move"><div class="rw-ps-flip">' +
        '<div class="rw-ps-pbody"></div>' +
        '<div class="rw-ps-mud" data-i="0">' + picHtml("mud_1") + '</div><div class="rw-ps-mud" data-i="1">' + picHtml("mud_2") + '</div><div class="rw-ps-mud" data-i="2">' + picHtml("mud_3") + "</div>" +
        '<div class="rw-ps-rider" hidden></div>' +
      "</div></div></div>" +
      '<button type="button" class="rw-ps-ponyhit" aria-label="Brush the pony"></button>' +
      '<button type="button" class="rw-ps-brush rw-ps-tool" aria-label="Brush">' + picHtml("brush") + "</button>" +
      '<button type="button" class="rw-ps-act rw-ps-go" hidden aria-label="Go">' + picHtml("go") + "</button>" +
      '<button type="button" class="rw-ps-act rw-ps-jump" hidden aria-label="Jump">' + picHtml("jump") + "</button>");

    var q = function (s) { return root.querySelector(s); };
    var yard = q(".rw-ps-yard");
    var path = q(".rw-ps-path");
    var tree = q(".rw-ps-tree");
    var knight = q(".rw-ps-knight");
    var basket = q(".rw-ps-basket");
    var bback = q(".rw-ps-bback");
    var far = q(".rw-ps-far");
    var mid = q(".rw-ps-mid");
    var near = q(".rw-ps-near");
    var world = q(".rw-ps-world");
    var logEl = q(".rw-ps-log");
    var castle = q(".rw-ps-castle");
    var closedB = q(".rw-ps-closed");
    var openB = q(".rw-ps-open");
    var buddy = q(".rw-ps-buddy");
    var gateBtn = q(".rw-ps-gate");
    var pony = q(".rw-ps-pony");
    var pmove = q(".rw-ps-move");
    var pflip = q(".rw-ps-flip");
    var pbody = q(".rw-ps-pbody");
    var rider = q(".rw-ps-rider");
    var muds = Array.prototype.slice.call(root.querySelectorAll(".rw-ps-mud"));
    var ponyHit = q(".rw-ps-ponyhit");
    var brushBtn = q(".rw-ps-brush");
    var goBtn = q(".rw-ps-go");
    var jumpBtn = q(".rw-ps-jump");

    /* tree apples (buttons on the tree) and basket apples (buttons in the basket) */
    var treeApples = [0, 1, 2].map(function (i) {
      var b = make("button", "rw-ps-treeapple", '<span class="rw-ps-apic">' + picHtml("apple_" + (i + 1)) + "</span>");
      b.type = "button";
      b.dataset.i = i;
      b.setAttribute("aria-label", "Apple");
      yard.appendChild(b);
      return b;
    });
    var basketApples = [0, 1, 2].map(function (i) {
      var b = make("button", "rw-ps-bapple", '<span class="rw-ps-apic">' + picHtml("apple_" + (i + 1)) + "</span>");
      b.type = "button";
      b.dataset.i = i;
      b.hidden = true;
      b.setAttribute("aria-label", "Apple for the pony");
      basket.insertBefore(b, basket.querySelector(".rw-ps-bfront"));
      return b;
    });

    function setPony(pose) {
      if (S.pose === pose) { return; }
      S.pose = pose;
      setPic(pbody, "pony_" + pose);
    }
    function setKnight(pose) { setPic(knight, "knight_" + pose); }
    function setRider(pose) { setPic(rider, pose === "cheer" ? "ride_cheer" : "ride"); }

    /* ---- layout: everything in px from the root size ---- */
    function layout() {
      var W = root.clientWidth;
      var H = root.clientHeight;
      if (W < 10 || H < 10) { return; }
      var tall = W / H < 0.85;
      var small = W < 640 || H < 520;
      root.dataset.layout = tall ? "tall" : "wide";
      L.W = W; L.H = H; L.tall = tall;
      var bw = Math.min(W, 1100);
      var bx = (W - bw) / 2;
      L.btn = small ? 96 : 120;
      var edge = Math.max(12, Math.round(Math.min(W, H) * 0.025));
      L.edge = edge;

      /* the yard */
      var gy;
      var boxH;
      var yardBg = q(".rw-ps-bg");
      if (tall) {
        /* three rows: tree and knight on the far grass, the pony in the middle, basket and brush in front */
        gy = H * 0.8;
        boxH = Math.min(H * 0.3 / 0.768, W * 0.94 * PH / PW);
        /* the stable picture covers the top; its grass line (y 650 of 900) sits at 45% of the height */
        var bgh = Math.max(H * 0.45 / 0.722, W * 900 / 1600);
        place(yardBg, (W - bgh * 1600 / 900) / 2, 0, bgh * 1600 / 900, bgh);
      } else {
        place(yardBg, 0, 0, W, H);
        gy = H * 0.86;
        boxH = Math.min(H * 0.4 / 0.78, bw * 0.48 * PH / PW);
      }
      var boxW = boxH * PW / PH;
      L.yardPony = { x: (tall ? W * 0.5 : bx + bw * 0.5) - boxW / 2, y: gy - boxH * 652 / PH, w: boxW, h: boxH };
      var kh;
      var kx;
      var kb;
      var th;
      var tx;
      var tb;
      if (tall) {
        var topH = H * 0.5;  /* the far row stands on the grass, above the pony's ears */
        kh = Math.min(topH * 0.92, W * 0.46 * KH / KW);
        kx = W * 0.76;
        kb = topH;
        th = Math.min(topH * 0.95, W * 0.5 * 760 / 600);
        tx = W * 0.27;
        tb = topH;
      } else {
        kh = Math.min(H * 0.5, bw * 0.22 * KH / KW);
        kx = bx + bw * 0.86;
        kb = gy + H * 0.01;
        th = Math.min(H * 0.66, bw * 0.3 * 760 / 600);
        tx = bx + bw * 0.13;
        tb = gy - H * 0.02;
      }
      var kw = kh * KW / KH;
      L.knight = { x: kx - kw / 2, y: kb - kh, w: kw, h: kh };
      place(knight, L.knight.x, L.knight.y, kw, kh);
      var tw = th * 600 / 760;
      L.tree = { x: tx - tw / 2, y: tb - th, w: tw, h: th };
      place(tree, L.tree.x, L.tree.y, tw, th);
      var av = Math.max(48, tw * 0.2);
      var ab = Math.max(72, av);
      L.apple = av;
      treeApples.forEach(function (b, i) {
        var p = APPLE_ON_TREE[i];
        var cx = L.tree.x + p[0] / 600 * tw;
        var cy = L.tree.y + p[1] / 760 * th;
        place(b, cx - ab / 2, cy - ab / 2, ab, ab);
        b.style.setProperty("--av", Math.round(av) + "px");
      });
      /* the basket: bottom-left (under the tree on wide screens) */
      var front = Math.max(72, H - edge - gy - 6);  /* the room under the pony's hooves (tall screens) */
      var bkw = Math.max(150, Math.min(tall ? Math.min(W * 0.4, front * 400 / 300) : bw * 0.17, H * 0.3));
      var bkh = bkw * 300 / 400;
      var bkx = tall ? edge : Math.max(edge, tx + tw * 0.08 - bkw / 2);
      var bky = H - edge - bkh;
      L.basket = { x: bkx, y: bky, w: bkw, h: bkh };
      place(basket, bkx, bky, bkw, bkh);
      basketApples.forEach(function (b, i) {
        var bs = Math.max(72, av);
        place(b, SLOTS[i] * bkw - bs / 2, bkh * 0.36 - bs * 0.62, bs, bs);
        b.style.setProperty("--av", Math.round(av) + "px");
      });
      /* the brush: bottom-right on the ground */
      var brs = Math.max(96, Math.min(tall ? Math.min(W * 0.32, front / 0.85) : bw * 0.15, H * 0.2));
      L.brush = { x: tall ? W - edge - brs : Math.min(W - edge - brs, bx + bw * 0.66), y: H - edge - brs * 0.85, w: brs, h: brs * 0.8 };
      place(brushBtn, L.brush.x, L.brush.y, L.brush.w, L.brush.h);

      /* the path: three layers, scaled so each is wide enough for the whole ride */
      var stride = bw / 3;
      L.stride = stride;
      var pboxH = tall ? Math.min(H * 0.32 / 0.78, W * 0.5 * PH / PW) : boxH;
      var pboxW = pboxH * PW / PH;
      L.logW = Math.max(90, pboxW * 0.42);
      L.logH = L.logW * 220 / 440;
      L.jumpLen = L.logW + pboxW * 0.5 + stride * 0.2;
      L.camMax = stride * 4 + L.jumpLen;
      var need = W + L.camMax + 60;
      var sN = Math.max(H * (tall ? 0.3 : 0.34) / 360, need / 3600);
      var nh = 360 * sN;
      place(near, 0, H - nh, 3600 * sN, nh);
      place(world, 0, 0, W, H);
      var gyP = H - nh + 178 * sN;
      L.gyP = gyP;
      var sM = Math.max(H * 0.55 / 520, (W + L.camMax * 0.5 + 60) / 3000);
      place(mid, 0, H - nh * 0.55 - 520 * sM, 3000 * sM, 520 * sM);
      var sF = Math.max(H / 900, (W + L.camMax * 0.2 + 60) / 2000);
      place(far, 0, H - 900 * sF, 2000 * sF, 900 * sF);
      var px = tall ? W * 0.27 : W * 0.3;
      L.pathPony = { x: px - pboxW / 2, y: gyP - pboxH * 652 / PH, w: pboxW, h: pboxH };
      /* the log: just ahead of the pony's nose after two stretches */
      var nose = L.pathPony.x + pboxW * 640 / PW;
      L.logX = nose + stride * 2 + stride * 0.1;
      place(logEl, L.logX, gyP - L.logH * 0.85, L.logW, L.logH);
      /* the castle: after the whole ride its centre stands at 70% of the width (upright screens: 63%, a little
         narrower, so the right tower stays inside the screen and the pony stands clear of the door) */
      var cw = tall ? W * 0.68 : Math.min(W * 0.5, bw * 0.62);
      var chh = cw * 900 / 1000;
      if (chh * 880 / 900 > gyP + H * 0.01 - 4) { chh = (gyP + H * 0.01 - 4) * 900 / 880; cw = chh * 1000 / 900; }
      var ccx = (tall ? W * 0.63 : W * 0.7) + L.camMax;
      L.castle = { x: ccx - cw / 2, y: gyP + H * 0.01 - chh * 880 / 900, w: cw, h: chh };
      place(castle, L.castle.x, L.castle.y, cw, chh);
      /* the gate's tap area: the drawbridge, at least 72 px */
      var gw = Math.max(72, cw * 0.3);
      var gh = Math.max(72, chh * 0.34);
      place(gateBtn, ccx - gw / 2, L.castle.y + chh * 615 / 900 - gh / 2, gw, gh);
      /* the buddy knight: beside the bridge, in front of the left tower (the pony has gone in by then) */
      var bh2 = Math.min(chh * 0.42, pboxH * 0.8);
      var bw2 = bh2 * KW / KH;
      place(buddy, L.castle.x + cw * 0.2 - bw2 / 2, gyP + H * 0.01 - bh2 * 0.98, bw2, bh2);

      /* buttons: bottom-right, under the thumb */
      var b = L.btn;
      place(goBtn, W - edge - b, H - edge - b, b, b);
      place(jumpBtn, W - edge - b, H - edge - b, b, b);
      placePony();
      setCam(S.cam);
      if (doneBtn) { placeDone(); }
    }
    function placePony() {
      var r = S.scene === "yard" ? L.yardPony : L.pathPony;
      place(pony, r.x, r.y, r.w, r.h);
      pflip.classList.toggle("rw-ps-mirror", S.scene === "yard");
      /* the pony's tap area: its body and head, at least 72 px */
      var hx = S.scene === "yard" ? r.x + r.w * 60 / PW : r.x + r.w * 110 / PW;
      place(ponyHit, hx, r.y + r.h * 0.2, Math.max(72, r.w * 530 / PW), Math.max(72, r.h * 0.78));
      L.pony = r;
    }
    function setCam(c) {
      S.cam = c;
      near.style.transform = "translateX(" + (-c).toFixed(1) + "px)";
      world.style.transform = "translateX(" + (-c).toFixed(1) + "px)";
      mid.style.transform = "translateX(" + (-c * 0.5).toFixed(1) + "px)";
      far.style.transform = "translateX(" + (-c * 0.2).toFixed(1) + "px)";
    }
    /* a point in the pony canvas -> a point inside root (mirrored in the yard) */
    function ponyPoint(p) {
      var r = L.pony;
      var x = S.scene === "yard" ? PW - p[0] : p[0];
      return { x: r.x + x / PW * r.w, y: r.y + p[1] / PH * r.h };
    }

    /* ---- small reactions: the pony answers every touch ---- */
    var poseTimer = 0;
    function ponyFor(pose, ms, then) {
      setPony(pose);
      poseTimer += 1;
      var me = poseTimer;
      ctx.wait(ms, function () { if (me === poseTimer) { setPony(then || "stand"); } });
    }
    function react() {
      ctx.land(pmove);
      ponyFor("happy", 700);
    }
    function neigh() {
      if (S.neighs >= 2) { return; }
      S.neighs += 1;
      ctx.sound.neigh();
    }
    function sparkle(pt, key) {
      var s = Math.max(36, L.pony.w * 0.12);
      var e = make("div", "rw-ps-spark", picHtml(key || "sparkle"));
      place(e, pt.x - s / 2, pt.y - s / 2, s, s);
      ctx.layer.appendChild(e);
      ctx.animate(e, [
        { opacity: 0, transform: "translateY(6px) scale(.6)" },
        { opacity: 1, transform: "translateY(-4px) scale(1)", offset: 0.35 },
        { opacity: 0, transform: "translateY(-" + Math.round(s * 0.9) + "px) scale(1)" }
      ], { duration: key === "heart" ? 1600 : 1100, easing: "ease-out", fill: "forwards", fadeFrom: 0 });
      ctx.wait(key === "heart" ? 1650 : 1150, function () { if (e.parentNode) { e.parentNode.removeChild(e); } });
    }

    /* ---- steps ---- */
    function setStep(step) {
      S.step = step;
      root.dataset.step = step;
      ponyHit.setAttribute("aria-label", step === "feed" ? "Feed the pony" : "Brush the pony");
      ponyHit.hidden = !(step === "hello" || step === "brush" || step === "feed");
      brushBtn.hidden = !(step === "hello" || step === "brush");
      brushBtn.classList.toggle("rw-now", step === "brush");
      treeApples.forEach(function (b, i) { b.classList.toggle("rw-now", step === "feed" && S.tree[i]); });
      ctx.hint(hintTarget);
    }
    function hintTarget() {
      switch (S.step) {
        case "brush": return ponyHit;
        case "feed":
          if (S.eating) { return null; }
          if (S.basket.length) { return basketApples[S.basket[0]]; }
          for (var i = 0; i < 3; i += 1) { if (S.tree[i]) { return treeApples[i]; } }
          return null;
        case "ride":
          if (S.moving) { return null; }
          return !jumpBtn.hidden ? jumpBtn : (!goBtn.hidden ? goBtn : null);
        case "gate": return S.opening ? null : gateBtn;
        default: return null;
      }
    }
    function counters() {
      root.dataset.mud = String(S.mud.filter(Boolean).length);
      root.dataset.fed = String(S.fed);
      root.dataset.stretch = String(S.stretch);
    }

    /* 1. hello */
    function beginHello() {
      setStep("hello");
      setKnight("idle");
      setPony("stand");
      ctx.wait(500, function () { ctx.speak(LINES.hello); });
      ctx.wait(2900, function () {
        setStep("brush");
        ctx.speak(LINES.brush);
        if (ctx.auto) { autoBrush(); }
      });
    }

    /* 2. brush: rub, tap the pony, or tap / drag the brush */
    function cleanNear(pt) {
      if (!(S.step === "brush" || S.step === "hello")) { return false; }
      var best = -1;
      var bestD = Infinity;
      S.mud.forEach(function (on, i) {
        if (!on) { return; }
        var c = ponyPoint(MUD[i]);
        var d = pt ? Math.hypot(c.x - pt.x, c.y - pt.y) : i;
        if (d < bestD) { bestD = d; best = i; }
      });
      if (best < 0) { return false; }
      S.mud[best] = false;
      counters();
      var m = muds[best];
      ctx.sound.swish();
      ctx.animate(m, [{ opacity: 1 }, { opacity: 0 }], { duration: 600, easing: "ease-out", fill: "forwards", keep: true });
      ctx.wait(600, function () { m.style.opacity = "0"; });
      sparkle(ponyPoint(MUD[best]));
      react();
      if (S.step === "hello") { setStep("brush"); }
      if (!S.mud.some(Boolean)) { brushDone(); }
      return true;
    }
    function brushDone() {
      setStep("shiny");
      ctx.hint(null);
      brushFollow(null);
      ctx.wait(700, function () {
        poseTimer += 1;
        setPony("shake");
        neigh();
        ctx.animate(pmove, [
          { transform: "rotate(0deg)" }, { transform: "rotate(-2deg)", offset: 0.3 }, { transform: "rotate(1.5deg)", offset: 0.65 }, { transform: "rotate(0deg)" }
        ], { duration: 1200, easing: "ease-in-out" });
        setKnight("cheer");
        ctx.speak(LINES.shiny);
      });
      ctx.wait(2000, function () { setPony("happy"); });
      ctx.wait(2900, function () {
        setPony("stand");
        setKnight("idle");
        setStep("feed");
        ctx.speak(LINES.pick);
        if (ctx.auto) { autoFeed(); }
      });
    }
    function autoBrush() {
      [0, 1, 2].forEach(function (i) { ctx.wait(500 + i * 500, function () { cleanNear(null); }); });
    }
    var brushGhost = null;
    function brushFollow(pt) {
      if (!pt) {
        if (brushGhost && brushGhost.parentNode) { brushGhost.parentNode.removeChild(brushGhost); }
        brushGhost = null;
        brushBtn.classList.remove("rw-away");
        return;
      }
      if (!brushGhost) {
        brushGhost = make("div", "rw-ps-bghost", picHtml("brush"));
        ctx.layer.appendChild(brushGhost);
        brushBtn.classList.add("rw-away");
      }
      var w = L.brush.w * 0.9;
      place(brushGhost, pt.x - w * 0.5, pt.y - w * 0.55, w, w * 0.8);
    }
    /* rubbing on the pony */
    var rub = null;
    function rel(e) {
      var r = root.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    }
    ponyHit.style.touchAction = "none";
    ctx.on(ponyHit, "pointerdown", function (e) {
      e.preventDefault();
      try { ponyHit.setPointerCapture(e.pointerId); } catch (err) {}
      var p = rel(e);
      rub = { id: e.pointerId, x0: p.x, y0: p.y, last: p, moved: false, acc: 0 };
    });
    ctx.on(ponyHit, "pointermove", function (e) {
      if (!rub || e.pointerId !== rub.id) { return; }
      var p = rel(e);
      if (!rub.moved && Math.hypot(p.x - rub.x0, p.y - rub.y0) < 6) { return; }
      rub.moved = true;
      if (S.step !== "brush" && S.step !== "hello") { return; }
      rub.acc += Math.hypot(p.x - rub.last.x, p.y - rub.last.y);
      rub.last = p;
      brushFollow(p);
      while (rub.acc >= 40 && S.mud.some(Boolean)) {
        rub.acc -= 40;
        cleanNear(p);
      }
    });
    function endRub(e) {
      if (!rub || e.pointerId !== rub.id) { return; }
      var was = rub;
      rub = null;
      brushFollow(null);
      if (!was.moved) { tapPony(was.last); }
    }
    ctx.on(ponyHit, "pointerup", endRub);
    ctx.on(ponyHit, "pointercancel", function () { rub = null; brushFollow(null); });
    ctx.on(ponyHit, "click", function (e) { if (e.detail === 0) { tapPony(null); } });
    function tapPony(pt) {
      if (S.step === "brush" || S.step === "hello") { cleanNear(pt); return; }
      if (S.step === "feed" && S.basket.length && !S.eating) { give(S.basket[0], null); return; }
      if (!S.eating) { react(); }
    }
    ctx.drag(brushBtn, {
      enabled: function () { return S.step === "brush" || S.step === "hello"; },
      zones: function () { return [{ el: ponyHit, id: "pony" }]; },
      onTap: function () { cleanNear(null); },
      onDrop: function (z, p) { return cleanNear(p); }
    });

    /* 3. feed */
    function pick(i) {
      if (S.step !== "feed" || !S.tree[i]) { return; }
      S.tree[i] = false;
      treeApples[i].hidden = true;
      var from = ctx.rect(treeApples[i]);
      var b = basketApples[i];
      b.hidden = false;
      S.basket.push(i);
      setStep("feed");
      var to = ctx.rect(b);
      var dx = (from.left + from.width / 2) - (to.left + to.width / 2);
      var dy = (from.top + from.height / 2) - (to.top + to.height / 2);
      var hop = Math.round(L.apple * 0.22);
      ctx.animate(b, [
        { transform: "translate(" + dx + "px," + dy + "px)", easing: "cubic-bezier(.45,0,.9,.6)" },
        { transform: "translate(0,0) scale(1.06,.9)", offset: 0.72, easing: "ease-out" },
        { transform: "translate(0,-" + hop + "px)", offset: 0.86, easing: "ease-in" },
        { transform: "translate(0,0)" }
      ], { duration: 900, fadeFrom: 0 });
      ctx.wait(650, function () { ctx.sound.plop(); });
      if (S.basket.length === 1 && S.fed === 0 && S.tree.filter(Boolean).length === 2) {
        ctx.wait(800, function () { ctx.speak(LINES.give); });
      }
    }
    treeApples.forEach(function (b, i) {
      ctx.drag(b, {
        enabled: function () { return S.step === "feed" && S.tree[i]; },
        zones: function () { return [{ el: basket, id: "basket" }, { el: ponyHit, id: "pony" }]; },
        onTap: function () { pick(i); },
        onDrop: function (z) {
          if (z.id === "basket") { pick(i); return true; }
          if (S.step !== "feed" || !S.tree[i] || S.eating) { return false; }
          pick(i);
          ctx.wait(950, function () { give(i, null); });
          return true;
        }
      });
    });
    function give(i, fromRect) {
      if (S.step !== "feed" || S.eating) { return false; }
      var k = S.basket.indexOf(i);
      if (k < 0) { return false; }
      S.basket.splice(k, 1);
      S.eating = true;
      ctx.hint(null);
      var b = basketApples[i];
      var from = fromRect || ctx.rect(b);
      b.hidden = true;
      var fly = make("div", "rw-ps-fly", picHtml("apple_" + (i + 1)));
      var m = ponyPoint(MOUTH);
      var s = L.apple;
      place(fly, m.x - s / 2, m.y - s / 2, s, s);
      ctx.layer.appendChild(fly);
      ctx.slideFrom(fly, { left: from.left + (from.width - s) / 2, top: from.top + (from.height - s) / 2, width: s, height: s }, 600);
      ctx.wait(560, function () {
        if (fly.parentNode) { fly.parentNode.removeChild(fly); }
        poseTimer += 1;
        setPony("eat");
        ctx.sound.crunch();
      });
      ctx.wait(1000, function () { ctx.sound.crunch(); ctx.land(pmove); });
      ctx.wait(1500, function () {
        S.fed += 1;
        counters();
        ctx.speak(LINES.yum);
        if (S.fed === 1) {
          ponyFor("happy", 1000);  /* the tail swishes up */
        } else if (S.fed === 2) {
          ponyFor("happy", 1300);
          ctx.land(pmove);
        } else {
          /* a nuzzle: the pony leans in, happy, and a heart rises */
          setPony("happy");
          neigh();
          var lean = (S.scene === "yard" ? 1 : -1) * Math.round(L.pony.w * 0.04);
          ctx.animate(pmove, [{ transform: "translateX(0) rotate(0)" }, { transform: "translateX(" + lean + "px) rotate(" + (lean > 0 ? 3 : -3) + "deg)", offset: 0.4 },
            { transform: "translateX(" + lean + "px) rotate(" + (lean > 0 ? 3 : -3) + "deg)", offset: 0.7 }, { transform: "translateX(0) rotate(0)" }], { duration: 1400, easing: "ease-in-out" });
          sparkle(ponyPoint([500, 180]), "heart");
        }
      });
      ctx.wait(2300, function () {
        S.eating = false;
        if (S.fed >= 3) { beginRide(); return; }
        setPony("stand");
        setStep("feed");
      });
      return true;
    }
    basketApples.forEach(function (b, i) {
      ctx.drag(b, {
        enabled: function () { return S.step === "feed" && !S.eating && S.basket.indexOf(i) >= 0; },
        zones: function () { return [{ el: ponyHit, id: "pony" }]; },
        onTap: function () { give(i, null); },
        onDrop: function (z, p, gr) { return give(i, gr ? { left: gr.left, top: gr.top, width: gr.width, height: gr.height } : null); }
      });
    });
    function autoFeed() {
      [0, 1, 2].forEach(function (i) {
        ctx.wait(500 + i * 3300, function () { pick(i); });
        ctx.wait(1600 + i * 3300, function () { give(i, null); });
      });
    }

    /* 4. ride */
    function beginRide() {
      setStep("ride");
      ctx.hint(null);
      setPony("stand");
      setKnight("cheer");
      ctx.speak(LINES.ride);
      /* the knight hops on: he moves to the saddle and the rider picture takes his place */
      ctx.wait(900, function () {
        var seat = ponyPoint([300, 300]);
        var kr = L.knight;
        ctx.animate(knight, [{ transform: "translate(0,0)", opacity: 1 },
          { transform: "translate(" + Math.round(seat.x - (kr.x + kr.w / 2)) + "px," + Math.round(seat.y - (kr.y + kr.h * 0.6)) + "px) scale(.75)", opacity: 0 }],
        { duration: 700, easing: "ease-in", fill: "forwards", keep: true });
      });
      ctx.wait(1500, function () {
        knight.style.visibility = "hidden";
        setRider("ride");
        rider.hidden = false;
        ctx.popIn(rider);
        ctx.sound.plop();
      });
      /* then the scene changes from the stable yard to the path home (a soft cross-fade) */
      ctx.wait(2500, function () {
        ctx.animate(root.querySelector(".rw-ps-yard"), [{ opacity: 1 }, { opacity: 0 }], { duration: 500, fill: "forwards", keep: true });
        ctx.animate(pony, [{ opacity: 1 }, { opacity: 0 }], { duration: 500, fill: "forwards", keep: true });
      });
      ctx.wait(3050, function () {
        yard.hidden = true;
        path.hidden = false;
        S.scene = "path";
        placePony();
        setCam(0);
        ctx.animate(path, [{ opacity: 0 }, { opacity: 1 }], { duration: 600, keep: true });
        ctx.animate(pony, [{ opacity: 0 }, { opacity: 1 }], { duration: 600, fill: "forwards", keep: true });
      });
      ctx.wait(3800, function () {
        showGo();
        ctx.speak(LINES.go);
        if (ctx.auto) { autoRide(); }
      });
    }
    function showGo() {
      jumpBtn.hidden = true;
      goBtn.hidden = false;
      goBtn.classList.remove("rw-busy");
      ctx.popIn(goBtn);
      ctx.sound.pop();
      ctx.hint(hintTarget);
    }
    /* one stretch: walk frames at 6 a second with a 4 px bob, the camera glides a third of the scene in 1.2 s */
    function trot(dist, ms, done) {
      S.moving = true;
      ctx.hint(null);
      var c0 = S.cam;
      if (ctx.reduced) {
        setCam(c0 + dist);
        ctx.animate(world, [{ opacity: 0.4 }, { opacity: 1 }], { duration: 300, keep: true });
        ctx.animate(near, [{ opacity: 0.4 }, { opacity: 1 }], { duration: 300, keep: true });
        ctx.sound.clipClop();
        ctx.wait(320, function () { S.moving = false; done(); });
        return;
      }
      var t = 0;
      var frame = -1;
      ctx.loop(function (dt, real) {
        t = Math.min(1, t + dt * 1000 / ms);
        var e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        setCam(c0 + dist * e);
        var f = Math.floor(t * ms / 1000 * 6);
        if (f !== frame) {
          frame = f;
          setPony(f % 2 ? "walk_b" : "walk_a");
          if (f % 2 === 0) { ctx.sound.clipClop(); }
        }
        pmove.style.transform = "translateY(" + (-Math.abs(Math.sin(t * ms / 1000 * 6 * Math.PI)) * 4).toFixed(1) + "px)";
        if (t >= 1) {
          pmove.style.transform = "";
          setPony("stand");
          S.moving = false;
          done();
          return false;
        }
        return true;
      });
    }
    function go() {
      if (S.step !== "ride" || S.moving || goBtn.hidden) { return; }
      goBtn.classList.add("rw-busy");
      ctx.land(goBtn);
      trot(L.stride, 1200, function () {
        S.stretch += 1;
        counters();
        goBtn.classList.remove("rw-busy");
        if (S.stretch === 2 && !S.jumped) {
          goBtn.hidden = true;
          jumpBtn.hidden = false;
          jumpBtn.classList.add("rw-glow");
          ctx.popIn(jumpBtn);
          ctx.sound.pop();
          ctx.speak(LINES.jump);
          ctx.hint(hintTarget);
        } else if (S.stretch >= 4) {
          goBtn.hidden = true;
          beginGate();
        } else {
          ctx.hint(hintTarget);
        }
      });
    }
    function jump() {
      if (S.step !== "ride" || S.moving || jumpBtn.hidden || S.jumped) { return; }
      S.jumped = true;
      S.moving = true;
      ctx.hint(null);
      ctx.land(jumpBtn);
      jumpBtn.classList.remove("rw-glow");
      var c0 = S.cam;
      var dist = L.jumpLen;
      var hgt = Math.round(L.pony.h * 0.3);
      setPony("stand");
      if (ctx.reduced) {
        setPony("jump");
        setCam(c0 + dist);
        ctx.animate(world, [{ opacity: 0.4 }, { opacity: 1 }], { duration: 300, keep: true });
        ctx.wait(400, function () { setPony("stand"); afterJump(); });
        return;
      }
      /* a 700 ms arc: squash at take-off, up and over, squash on landing */
      ctx.animate(pmove, [
        { transform: "translateY(0) scale(1,1)" },
        { transform: "translateY(0) scale(1.06,.92)", offset: 0.12 },
        { transform: "translateY(-" + hgt + "px) scale(1,1)", offset: 0.5 },
        { transform: "translateY(0) scale(1,1)", offset: 0.86 },
        { transform: "translateY(0) scale(1.06,.92)", offset: 0.93 },
        { transform: "translateY(0) scale(1,1)" }
      ], { duration: 700, easing: "linear" });
      ctx.animate(q(".rw-ps-shadow"), [{ transform: "scale(1)", opacity: 1 }, { transform: "scale(.7)", opacity: 0.5, offset: 0.5 }, { transform: "scale(1)", opacity: 1 }], { duration: 700, keep: true });
      ctx.wait(90, function () { setPony("jump"); });
      ctx.wait(610, function () { setPony("stand"); ctx.sound.clipClop(); });
      var t = 0;
      ctx.loop(function (dt) {
        t = Math.min(1, t + dt * 1000 / 700);
        var e = t < 0.12 ? 0 : t > 0.86 ? 1 : (t - 0.12) / 0.74;
        e = e < 0.5 ? 2 * e * e : 1 - Math.pow(-2 * e + 2, 2) / 2;
        setCam(c0 + dist * e);
        return t < 1;
      });
      ctx.wait(760, afterJump);
    }
    function afterJump() {
      S.moving = false;
      jumpBtn.hidden = true;
      showGo();
    }
    ctx.onTap(goBtn, go);
    ctx.onTap(jumpBtn, jump);
    function autoRide() {
      function next() {
        if (S.step !== "ride") { return; }
        if (S.moving) { ctx.wait(200, next); return; }
        if (!jumpBtn.hidden) { jump(); } else if (!goBtn.hidden) { go(); }
        ctx.wait(400, next);
      }
      ctx.wait(400, next);
    }

    /* 5. gate */
    function beginGate() {
      setStep("gate");
      gateBtn.hidden = false;
      castle.classList.add("rw-glow");
      ctx.speak(LINES.gate);
      ctx.hint(hintTarget);
      if (ctx.auto) { ctx.wait(700, openGate); }
    }
    function openGate() {
      if (S.step !== "gate" || S.opening) { return; }
      S.opening = true;
      ctx.hint(null);
      gateBtn.hidden = true;
      castle.classList.remove("rw-glow");
      ctx.sound.creak();
      /* the door tips down on its hinge (slowly), then the bridge folds out over the moat */
      ctx.animate(closedB, [{ transform: "scaleY(1)" }, { transform: "scaleY(0)" }], { duration: 1600, easing: "ease-in", fill: "forwards" });
      ctx.wait(1600, function () {
        closedB.hidden = true;
        openB.hidden = false;
        ctx.animate(openB, [{ transform: "scaleY(0)" }, { transform: "scaleY(1)" }], { duration: 600, easing: ctx.spring.soft, fadeFrom: 0 });
        ctx.sound.plop();
      });
      ctx.wait(2400, enterGate);
    }
    ctx.onTap(gateBtn, openGate);
    function enterGate() {
      /* the pony trots up the bridge into the arch and gets a little smaller (further away) */
      var c = L.castle;
      var tx = c.x + c.w * 0.5 - S.cam;
      var ty = c.y + c.h * 768 / 900;
      var p = L.pony;
      var footX = p.x + p.w * 330 / PW;
      var footY = p.y + p.h * 652 / PH;
      var archH = c.h * 290 / 900;
      var sc = Math.max(0.3, Math.min(0.75, archH * 1.08 / (p.h * 0.92)));
      var dx = Math.round(tx - footX);
      var dy = Math.round(ty - footY);
      pony.style.transformOrigin = (330 / PW * 100).toFixed(1) + "% " + (652 / PH * 100).toFixed(1) + "%";
      S.entered = true;
      if (ctx.reduced) {
        pony.style.transform = "translate(" + dx + "px," + dy + "px) scale(" + sc + ")";
        ctx.animate(pony, [{ opacity: 0.3 }, { opacity: 1 }], { duration: 300, keep: true });
        ctx.wait(350, arrive);
        return;
      }
      var t = 0;
      var frame = -1;
      var ms = 1600;
      ctx.loop(function (dt) {
        t = Math.min(1, t + dt * 1000 / ms);
        var e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        pony.style.transform = "translate(" + (dx * e).toFixed(1) + "px," + (dy * e).toFixed(1) + "px) scale(" + (1 + (sc - 1) * e).toFixed(3) + ")";
        var f = Math.floor(t * ms / 1000 * 6);
        if (f !== frame) {
          frame = f;
          setPony(f % 2 ? "walk_b" : "walk_a");
          if (f % 2 === 0) { ctx.sound.clipClop(); }
        }
        if (t >= 1) { arrive(); return false; }
        return true;
      });
    }
    function arrive() {
      setPony("happy");
      setRider("cheer");
      neigh();
      setStep("end");
      buddy.hidden = false;
      ctx.popIn(buddy);
      ctx.speak(LINES.home);
      ctx.wait(1300, function () {
        doneBtn = ctx.doneButton(finish, root);
        placeDone();
      });
    }
    var doneBtn = null;
    function placeDone() {
      if (!doneBtn) { return; }
      var bw = Math.max(170, Math.min(260, L.W * 0.4));
      var bh = Math.max(80, Math.min(110, L.H * 0.13));
      var cx = L.tall ? L.W * 0.5 : L.W * 0.27;
      doneBtn.style.cssText = "left:" + Math.round(cx - bw / 2) + "px;top:" + Math.round(L.H - L.edge - bh) + "px;width:" + Math.round(bw) + "px;height:" + Math.round(bh) + "px";
    }

    counters();
    layout();
    ctx.on(window, "resize", layout);
    root.dataset.art = "ready";
    beginHello();
  }

  if (!window.RewardGames || !window.RewardGames.register) { throw new Error("castle_pony_stable.js needs reward_core.js loaded first"); }
  window.RewardGames.register("castle", { name: "pony_stable", label: "Pony Stable", start: start });
  window.RewardGames.castleLines = function () { return Object.keys(LINES).map(function (k) { return LINES[k]; }); };
})();
