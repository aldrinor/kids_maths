/* castle_kitty_tower.js - Kennedy's reward game "Tower for Kitty" (Kids Maths). Registers theme "castle".
 * A kitten is stuck at the top of a tall tree. The knight builds a stone tower beside it, one block at a time,
 * and the kitten hops onto the tower, comes down the stairs inside and runs to the knight.
 * (Design study section 5, "Build the tower", with someone to reach so the game ends with a rescue.)
 *
 * Play (every step is one tap; nothing plays itself; no timing; no reading; no losing):
 *   hello  the kitten mews from the tree top: "Mew! I'm stuck up the tree!" The knight: "Let's build a tower!"
 *   build  a stone block waits on the cart. Tap the cart: the block flies onto the
 *          tower and lands with a soft thud. "Up it goes!", "Higher!", "Even higher!", "Our tower is tall!" 4 blocks:
 *          a door, a window, a banner, then the top with battlements, level with the kitten.
 *   kitty  "Tap the kitten!" Tap the kitten: it hops onto the tower top, goes down inside and comes out of the door.
 *   end    the kitten hops to the knight and cheers: "Thank you, knight! Mew!" The knight cheers. Hearts rise. Done.
 * About 40-55 s. Data for tests: root.dataset.step = hello | build | kitty | end; root.dataset.blocks (blocks on the
 * tower); root.dataset.art = "ready" once built; root.dataset.lines (core).
 * Needs reward_core.js and castle_extra_art.js.
 */
(function () {
  "use strict";

  var X = window.CastleExtraArt;
  var LINES = {
    hello: "Mew! I'm stuck up the tree!",
    build: "Let's build a tower!",
    tap: "Tap the stone!",
    placed: ["Up it goes!", "Higher!", "Even higher!", "Our tower is tall!"],
    kitty: "Tap the kitten!",
    saved: "Thank you, knight! Mew!"
  };
  /* canvases (see tools/draw_castle_extra_art.py and draw_castle_art.py) */
  var BKW = 400, BKH = 240;     /* a block; its body ends on y 200; the next block sits 160 higher */
  var CTW = 520, CTH = 320;     /* the cart; bed top y 128, wheels on y 308 */
  var TRW = 600, TRH = 760;     /* the tree; canopy top about y 20, trunk foot y 740 */
  var KTW = 300;                /* the kitten; paws on y 290 */
  var place = X.place;

  function start(ctx, finish) {
    var root = ctx.root;
    root.classList.add("rw-kt");
    root.dataset.step = "hello";
    root.dataset.art = "";
    root.dataset.blocks = "0";
    X.load().then(function () {
      if (ctx.isClosed()) { return; }
      build(ctx, finish);
    });
  }

  function build(ctx, finish) {
    var root = ctx.root;
    var S = { step: "hello", blocks: 0, busy: false, kitten: "tree", knightPose: "idle" };
    var L = {};
    var scene = X.scenery(root);
    root.insertAdjacentHTML("beforeend",
      '<div class="rw-kt-tree" aria-hidden="true">' + X.html("tree") + "</div>" +
      '<div class="rw-kt-base" aria-hidden="true">' + X.html("tower_base") + "</div>" +
      '<div class="rw-kt-block" data-k="1" hidden aria-hidden="true">' + X.html("tower_block_1") + "</div>" +
      '<div class="rw-kt-block" data-k="2" hidden aria-hidden="true">' + X.html("tower_block_2") + "</div>" +
      '<div class="rw-kt-block" data-k="3" hidden aria-hidden="true">' + X.html("tower_block_3") + "</div>" +
      '<div class="rw-kt-block" data-k="4" hidden aria-hidden="true">' + X.html("tower_block_4") + "</div>" +
      '<div class="rw-kt-knight" aria-hidden="true">' + X.html("knight_idle") + "</div>" +
      '<button type="button" class="rw-kt-cart" aria-label="A stone block on the cart"><span class="rw-kt-cpic">' + X.html("cart") + '</span>' +
        '<span class="rw-kt-load">' + X.html("tower_block_1") + "</span></button>" +
      '<button type="button" class="rw-kt-kitten" aria-label="The kitten"><span class="rw-kt-kpic">' + X.html("kitten_stuck") + "</span></button>");
    var q = function (s) { return root.querySelector(s); };
    var tree = q(".rw-kt-tree");
    var base = q(".rw-kt-base");
    var blocks = Array.prototype.slice.call(root.querySelectorAll(".rw-kt-block"));
    var knight = q(".rw-kt-knight");
    var cart = q(".rw-kt-cart");
    var cpic = q(".rw-kt-cpic");
    var load = q(".rw-kt-load");
    var kitten = q(".rw-kt-kitten");
    var kpic = q(".rw-kt-kpic");

    /* ---- layout ---- */
    function layout() {
      var W = root.clientWidth;
      var H = root.clientHeight;
      if (W < 10 || H < 10) { return; }
      var g = scene.layout(W, H);
      var tall = W / H < 0.85;
      root.dataset.layout = tall ? "tall" : "wide";
      var bw = Math.min(W, 1100);
      var bx = (W - bw) / 2;
      var edge = Math.max(12, Math.round(Math.min(W, H) * 0.025));
      L.W = W; L.H = H; L.tall = tall; L.edge = edge;
      var gy, topY, s, tcx, ks, kh, kcx, kfeet, ctw, ctcx, ctbottom;
      if (tall) {
        gy = H * 0.64;
        ks = Math.min(H * 0.15, W * 0.32);
        topY = Math.max(H * 0.26, edge + ks * 1.05);
        s = Math.min((gy - topY) / 688, W * 0.42 / BKW);
        tcx = W * 0.4;
        kh = Math.min(H * 0.26, W * 0.48 * 600 / 462);
        kcx = W * 0.22;
        kfeet = H - edge;
        ctw = Math.min(W * 0.56, H * 0.2 * CTW / CTH);
        ctcx = W - edge - ctw / 2;
        ctbottom = H - edge;
      } else {
        gy = g.road;
        ks = Math.min(H * 0.2, bw * 0.13);
        topY = Math.max(H * 0.25, edge + ks * 1.05);
        s = Math.min((gy - topY) / 688, bw * 0.24 / BKW);
        tcx = bx + bw * 0.57;
        kh = Math.min(H * 0.42, bw * 0.2 * 600 / 462);
        kcx = bx + bw * 0.1;
        kfeet = Math.min(H - edge, gy + H * 0.05);
        ctw = Math.min(bw * 0.24, H * 0.36 * CTW / CTH);
        ctcx = bx + bw * 0.33;
        ctbottom = Math.min(H - edge, gy + H * 0.08);
      }
      L.s = s;
      L.tcx = tcx;
      /* the base slab: its top (canvas y 30) is where block 1's body ends */
      var slabTop = gy - 48 * s;
      place(base, tcx - 220 * s, slabTop - 30 * s, 440 * s, 100 * s);
      L.slots = blocks.map(function (b, i) {
        var r = { x: tcx - 200 * s, y: slabTop - 200 * s - 160 * s * i, w: BKW * s, h: BKH * s };
        place(b, r.x, r.y, r.w, r.h);
        return r;
      });
      L.top = slabTop - 640 * s;           /* the battlements' top */
      L.door = { x: tcx, y: slabTop };      /* the foot of block 1's door */
      /* the tree: its canopy top level with the tower top, just right of the tower */
      var th = (gy - L.top) / 720 * TRH;
      var tw = th * TRW / TRH;
      var trx = tcx + 200 * s + tw * (tall ? 0.3 : 0.36);
      place(tree, trx - tw / 2, gy - th * 740 / TRH, tw, th);
      /* the kitten sits on the canopy, near the tower */
      var kx = trx - tw * 0.12;
      L.kitTree = { x: kx - ks / 2, y: L.top + th * 30 / TRH - ks * 290 / KTW, w: ks, h: ks };
      L.ks = ks;
      /* the knight */
      var kw = kh * 462 / 600;
      L.knight = { x: kcx - kw / 2, y: kfeet - kh * 596 / 600, w: kw, h: kh };
      place(knight, L.knight.x, L.knight.y, kw, kh);
      /* the cart and the block waiting on it (the cart is the button: at least 80 px) */
      var cth = ctw * CTH / CTW;
      var lw = ctw * 0.56;
      var lh = lw * BKH / BKW;
      var bedTop = cth * 128 / CTH;
      var up = lh * 200 / BKH - bedTop;    /* how far the block rises above the cart's box */
      L.cart = { x: ctcx - ctw / 2, y: ctbottom - cth - Math.max(0, up), w: ctw, h: cth + Math.max(0, up) };
      place(cart, L.cart.x, L.cart.y, L.cart.w, L.cart.h);
      place(cpic, 0, L.cart.h - cth, ctw, cth);
      L.load = { x: L.cart.x + ctw * 0.5 - lw / 2, y: L.cart.y + L.cart.h - cth + bedTop - lh * 200 / BKH, w: lw, h: lh };
      place(load, ctw * 0.5 - lw / 2, L.load.y - L.cart.y, lw, lh);
      placeKitten();
      if (doneBtn) { placeDone(); }
    }
    function kittenRect(where) {
      var ks = L.ks;
      if (where === "tree") { return L.kitTree; }
      if (where === "top") { return { x: L.tcx - ks / 2, y: L.top + 8 * L.s - ks * 290 / KTW, w: ks, h: ks }; }
      if (where === "door") { var d = ks * 0.85; return { x: L.door.x - d / 2, y: L.door.y - d * 290 / KTW, w: d, h: d }; }
      /* beside the knight, a little in front */
      var k = L.knight;
      var w = ks * (L.tall ? 1 : 1.05);
      var cx = k.x + k.w * (L.tall ? 1.05 : 1.08);
      var feet = Math.min(L.H - L.edge, k.y + k.h * 596 / 600);
      return { x: Math.min(L.W - L.edge - w, cx - w / 2), y: feet - w * 290 / KTW, w: w, h: w };
    }
    function placeKitten() {
      var r = kittenRect(S.kitten);
      var bs = Math.max(80, r.w * 0.9);
      place(kitten, r.x + r.w / 2 - bs / 2, r.y + r.h - bs * 0.95, bs, bs);
      place(kpic, r.x - (r.x + r.w / 2 - bs / 2), r.y - (r.y + r.h - bs * 0.95), r.w, r.h);
    }

    /* ---- steps ---- */
    function setStep(step) {
      S.step = step;
      root.dataset.step = step;
      cart.classList.toggle("rw-now", step === "build" && S.blocks < 4);
      kitten.classList.toggle("rw-now", step === "kitty");
      ctx.hint(hintTarget);
    }
    function hintTarget() {
      if (S.busy) { return null; }
      if (S.step === "build") { return cart; }
      if (S.step === "kitty") { return kitten; }
      return null;
    }
    function setKnight(pose) {
      if (S.knightPose === pose) { return; }
      S.knightPose = pose;
      X.set(knight, "knight_" + pose);
    }

    function beginHello() {
      setStep("hello");
      ctx.wait(500, function () { ctx.speak(LINES.hello); });
      ctx.wait(2900, function () { ctx.speak(LINES.build); });
      ctx.wait(4600, function () {
        if (S.step !== "hello") { return; }
        setStep("build");
        ctx.speak(LINES.tap);
        if (ctx.auto) { autoPlay(); }
      });
    }

    /* one block flies from the cart onto the tower */
    function addBlock(fromRect) {
      if (!(S.step === "hello" || S.step === "build") || S.busy || S.blocks >= 4) { return false; }
      S.busy = true;
      if (S.step === "hello") { setStep("build"); }
      ctx.hint(null);
      cart.classList.remove("rw-now");
      var k = S.blocks;
      var slot = L.slots[k];
      var from = fromRect || L.load;
      load.style.visibility = "hidden";
      var fly = X.make("div", "rw-kt-fly", X.html("tower_block_" + (k + 1)));
      ctx.layer.appendChild(fly);
      X.arc(ctx, fly, from, slot, 850, L.H * 0.1);
      ctx.wait(860, function () {
        if (fly.parentNode) { fly.parentNode.removeChild(fly); }
        blocks[k].hidden = false;
        ctx.land(blocks[k]);
        ctx.sound.plop();
        S.blocks = k + 1;
        root.dataset.blocks = String(S.blocks);
        var sz = Math.max(34, slot.w * 0.16);
        X.puff(ctx, slot.x + slot.w * 0.1, slot.y + slot.h * 0.8, sz);
        X.puff(ctx, slot.x + slot.w * 0.9, slot.y + slot.h * 0.8, sz);
        ctx.speak(LINES.placed[k]);
        setKnight("cheer");
      });
      ctx.wait(1700, function () {
        setKnight("idle");
        S.busy = false;
        if (S.blocks >= 4) {
          cart.hidden = true;
          beginKitty();
          return;
        }
        X.set(load, "tower_block_" + (S.blocks + 1));
        load.style.visibility = "";
        ctx.popIn(load);
        ctx.sound.pop();
        setStep("build");
      });
      return true;
    }
    ctx.onTap(cart, function () { addBlock(null); });

    function beginKitty() {
      setStep("kitty");
      ctx.speak(LINES.kitty);
      X.set(kpic, "kitten_happy");
      ctx.land(kpic);
      if (ctx.auto) { ctx.wait(800, comeDown); }
    }
    /* the kitten hops onto the tower top, goes down inside, comes out of the door and hops to the knight */
    function comeDown() {
      if (S.step !== "kitty") { return; }
      setStep("end");
      kitten.classList.remove("rw-now");
      kitten.disabled = true;
      var a = kittenRect("tree");
      var b = kittenRect("top");
      X.set(kpic, "kitten_hop");
      ctx.sound.pop();
      S.kitten = "top";
      placeKitten();
      X.arc(ctx, kpic, rel(a), rel(b), 700, L.H * 0.06);
      ctx.wait(700, function () { X.set(kpic, "kitten_happy"); ctx.sound.plop(); ctx.land(kpic); });
      ctx.wait(1300, function () {
        ctx.animate(kpic, [{ opacity: 1, transform: "translateY(0)" }, { opacity: 0, transform: "translateY(" + Math.round(L.ks * 0.4) + "px)" }], { duration: 500, fill: "forwards", keep: true });
      });
      ctx.wait(2300, function () {
        S.kitten = "door";
        placeKitten();
        ctx.animate(kpic, [{ opacity: 0, transform: "scale(.8)" }, { opacity: 1, transform: "scale(1)" }], { duration: 500, fill: "forwards", keep: true });
        ctx.sound.pop();
      });
      ctx.wait(3000, function () {
        var d = kittenRect("door");
        var e = kittenRect("knight");
        X.set(kpic, "kitten_hop");
        S.kitten = "knight";
        placeKitten();
        X.arc(ctx, kpic, rel(d), rel(e), 900, L.H * 0.08);
      });
      ctx.wait(3950, function () {
        X.set(kpic, "kitten_happy");
        ctx.land(kpic);
        ctx.sound.plop();
        setKnight("cheer");
        ctx.speak(LINES.saved);
        var r = kittenRect("knight");
        X.puff(ctx, r.x + r.w * 0.5, r.y, Math.max(40, r.w * 0.4), "heart");
        ctx.wait(400, function () { X.puff(ctx, L.knight.x + L.knight.w * 0.5, L.knight.y + L.knight.h * 0.05, Math.max(40, r.w * 0.4), "heart"); });
      });
      ctx.wait(5200, function () {
        doneBtn = ctx.doneButton(finish, root);
        placeDone();
      });
    }
    /* kpic lives inside the kitten button, so arcs are given in the button's own coordinates */
    function rel(r) {
      var bx = parseFloat(kitten.style.left) || 0;
      var by = parseFloat(kitten.style.top) || 0;
      return { x: r.x - bx, y: r.y - by, w: r.w, h: r.h };
    }
    ctx.onTap(kitten, function () { if (S.step === "kitty") { comeDown(); } });

    var doneBtn = null;
    function placeDone() {
      if (!doneBtn) { return; }
      var bw = Math.max(170, Math.min(260, L.W * 0.4));
      var bh = Math.max(80, Math.min(110, L.H * 0.13));
      /* in the sky (the knight, the kitten and the tower stand below) */
      var cx = L.tall ? L.W * 0.5 : L.W * 0.3;
      var top = L.tall ? L.H * 0.06 : L.H * 0.1;
      cx = Math.min(L.W - L.edge - bw / 2, Math.max(L.edge + bw / 2, cx));
      doneBtn.style.cssText = "left:" + Math.round(cx - bw / 2) + "px;top:" + Math.round(top) + "px;width:" + Math.round(bw) + "px;height:" + Math.round(bh) + "px";
    }

    function autoPlay() {
      function next() {
        if (S.step !== "build") { return; }
        if (!S.busy) { addBlock(null); }
        ctx.wait(400, next);
      }
      ctx.wait(300, next);
    }

    layout();
    ctx.on(window, "resize", layout);
    root.dataset.art = "ready";
    beginHello();
  }

  if (!window.RewardGames || !window.RewardGames.register) { throw new Error("castle_kitty_tower.js needs reward_core.js loaded first"); }
  if (!X) { throw new Error("castle_kitty_tower.js needs castle_extra_art.js loaded first"); }
  window.RewardGames.register("castle", { name: "kitty_tower", label: "Tower for Kitty", start: start });
  window.RewardGames.kittyTowerLines = function () {
    return [LINES.hello, LINES.build, LINES.tap].concat(LINES.placed, [LINES.kitty, LINES.saved]);
  };
})();
