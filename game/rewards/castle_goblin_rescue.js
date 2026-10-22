/* castle_goblin_rescue.js - Kennedy's reward game "Goblin Rescue" (Kids Maths). Registers theme "castle".
 * A gentle knight adventure: three silly goblins have shut the buddy knight in a wooden cage. Nothing is scary:
 * the knight's sword is soft foam, the goblins hold pillows, giggle and run home.
 *
 * Play (every step is one tap, or a drag for the key; nothing plays itself; no timing; no reading; no losing):
 *   hello  the buddy waves from the cage: "Help! The silly goblins shut me in!" The knight: "Bop the silly goblins!"
 *   bop    tap a goblin (any order): the knight hops over and bops it with the foam sword, the goblin says
 *          "Oops!" (then "Oh no!", "Run away!") and runs off the screen. 3 goblins. The last one drops the key.
 *   key    tap the key (or drag it to the lock): it flies into the lock and turns; the lock drops off.
 *   door   tap the cage door: it swings open with a creak.
 *   end    the buddy hops out and cheers: "You saved me! Thank you!" The knight cheers. Hearts rise. Done appears.
 * About 40-60 s. Data for tests: root.dataset.step = hello | bop | key | door | end; root.dataset.bopped (goblins
 * gone); root.dataset.art = "ready" once built; root.dataset.lines (core).
 * Needs reward_core.js and castle_extra_art.js.
 */
(function () {
  "use strict";

  var X = window.CastleExtraArt;
  var LINES = {
    hello: "Help! The silly goblins shut me in!",
    bop: "Bop the silly goblins!",
    oops: ["Oops!", "Oh no!", "Run away!"],
    key: "Get the key!",
    door: "Open the door!",
    saved: "You saved me! Thank you!"
  };
  /* canvases (see tools/draw_castle_extra_art.py) */
  var KW = 620, KH = 600, KX = 231;        /* sword knight; feet on y 596 */
  var GW = 400, GH = 460;                   /* goblin; feet on y 452 */
  var CW = 600, CH = 560, FLOOR = 520;      /* cage; door x 200..400, y 140..520, hinge x 200 */
  var TIP = 590;                            /* the foam sword's tip, x in the bop picture */
  var WHO = ["a", "b", "c"];
  var place = X.place;

  function start(ctx, finish) {
    var root = ctx.root;
    root.classList.add("rw-gr");
    root.dataset.step = "hello";
    root.dataset.art = "";
    root.dataset.bopped = "0";
    X.load().then(function () {
      if (ctx.isClosed()) { return; }
      build(ctx, finish);
    });
  }

  function build(ctx, finish) {
    var root = ctx.root;
    var S = { step: "hello", bopped: 0, busy: false, gone: [false, false, false], last: 2, open: false, keyUsed: false };
    var L = {};
    var scene = X.scenery(root);
    root.insertAdjacentHTML("beforeend",
      '<div class="rw-gr-cback rw-gr-c" aria-hidden="true">' + X.html("cage_back") + "</div>" +
      '<div class="rw-gr-buddy" aria-hidden="true"><div class="rw-gr-bpic">' + X.html("buddy_wave") + "</div></div>" +
      '<div class="rw-gr-cfront rw-gr-c" aria-hidden="true">' + X.html("cage_front") + "</div>" +
      '<div class="rw-gr-door rw-gr-c" aria-hidden="true">' + X.html("cage_door") + "</div>" +
      '<div class="rw-gr-lock" aria-hidden="true">' + X.html("cage_lock") + "</div>" +
      '<button type="button" class="rw-gr-doorbtn" hidden aria-label="Open the cage door"></button>' +
      '<div class="rw-gr-knight" aria-hidden="true"><div class="rw-gr-kflip"><div class="rw-gr-kpic">' + X.html("knight_sword") + "</div></div></div>" +
      '<button type="button" class="rw-gr-key" hidden aria-label="The key"><span class="rw-gr-keypic">' + X.html("cage_key") + "</span></button>");
    var q = function (s) { return root.querySelector(s); };
    var cparts = Array.prototype.slice.call(root.querySelectorAll(".rw-gr-c"));
    var door = q(".rw-gr-door");
    var lock = q(".rw-gr-lock");
    var doorBtn = q(".rw-gr-doorbtn");
    var buddy = q(".rw-gr-buddy");
    var bpic = q(".rw-gr-bpic");
    var knight = q(".rw-gr-knight");
    var kflip = q(".rw-gr-kflip");
    var kpic = q(".rw-gr-kpic");
    var keyBtn = q(".rw-gr-key");
    var gobs = WHO.map(function (w, i) {
      var b = X.make("button", "rw-gr-gob", '<span class="rw-gr-gmove"><span class="rw-gr-gpic">' + X.html("goblin_" + w + "_silly") + "</span></span>");
      b.type = "button";
      b.dataset.i = String(i);
      b.setAttribute("aria-label", "Silly goblin");
      root.insertBefore(b, knight);
      return b;
    });
    function gpic(i) { return gobs[i].querySelector(".rw-gr-gpic"); }
    function gmove(i) { return gobs[i].querySelector(".rw-gr-gmove"); }

    /* ---- layout: everything in px from the root size ---- */
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
      var cw, ch, ccx, floorY, gh, gxs, gys, kh, kcx, kfeet;
      if (tall) {
        cw = Math.min(W * 0.78, H * 0.36 * CW / CH);
        ccx = W * 0.55;
        floorY = H * 0.5;
        gh = Math.min(H * 0.17, W * 0.3 * GH / GW);
        gxs = [W * 0.2, W * 0.5, W * 0.8];
        gys = [H * 0.69, H * 0.73, H * 0.69];
        kh = Math.min(H * 0.27, W * 0.55 * KH / 462);
        kcx = W * 0.5;
        kfeet = H - edge;
      } else {
        cw = Math.min(H * 0.62 * CW / CH, bw * 0.32);
        ccx = bx + bw * 0.8;
        floorY = g.road - H * 0.035;
        gh = Math.min(H * 0.32, bw * 0.13 * GH / GW);
        gxs = [bx + bw * 0.37, bx + bw * 0.5, bx + bw * 0.63];
        gys = [g.road + H * 0.02, g.road - H * 0.01, g.road + H * 0.025];
        kh = Math.min(H * 0.46, bw * 0.2 * KH / 462);
        kcx = bx + bw * 0.13;
        kfeet = Math.min(H - edge, g.road + H * 0.06);
      }
      ch = cw * CH / CW;
      L.cage = { x: ccx - cw / 2, y: floorY - ch * FLOOR / CH, w: cw, h: ch };
      cparts.forEach(function (e) { place(e, L.cage.x, L.cage.y, cw, ch); });
      /* the buddy stands inside, feet on the cage floor */
      var bh = ch * 0.71;
      var bwid = bh * 462 / 600;
      L.buddy = { x: ccx - bwid / 2, y: floorY - bh * 596 / 600, w: bwid, h: bh };
      place(buddy, L.buddy.x, L.buddy.y, bwid, bh);
      /* the lock hangs on the door's low beam, low enough that its shackle stays under the buddy's chin;
         the door button covers the door (at least 80 px) */
      var lw = cw * 160 / CW * 0.9;
      var lh = lw * 180 / 160;
      L.lock = { x: ccx - lw / 2, y: L.cage.y + ch * 452 / CH - lh * 0.3, w: lw, h: lh };
      place(lock, L.lock.x, L.lock.y, lw, lh);
      var dw = Math.max(80, cw * 200 / CW);
      var dh = Math.max(80, ch * 380 / CH);
      place(doorBtn, ccx - dw / 2, L.cage.y + ch * 330 / CH - dh / 2, dw, dh);
      /* goblins: buttons the size of the goblin (at least 80 px) */
      var gw = gh * GW / GH;
      L.gob = gobs.map(function (b, i) {
        var r = { x: gxs[i] - gw / 2, y: gys[i] - gh * 452 / GH, w: gw, h: gh, cx: gxs[i], feet: gys[i] };
        var bw2 = Math.max(80, gw * 0.8);
        var bh2 = Math.max(80, gh * 0.92);
        place(b, r.cx - bw2 / 2, r.feet - bh2, bw2, bh2);
        var pic = b.querySelector(".rw-gr-gmove");
        place(pic, r.x - (r.cx - bw2 / 2), r.y - (r.feet - bh2), gw, gh);
        return r;
      });
      /* the knight's home */
      var kw = kh * KW / KH;
      L.knight = { x: kcx - kw * KX / KW, y: kfeet - kh * 596 / KH, w: kw, h: kh };
      place(knight, L.knight.x, L.knight.y, kw, kh);
      if (!S.busy) { knight.style.transform = ""; }
      /* the key: where the last goblin stood */
      var kyw = Math.max(130, Math.min(gw * 1.15, W * 0.34));
      var kyh = Math.max(80, kyw * 0.62);
      var lg = L.gob[S.last];
      L.key = { x: Math.min(W - edge - kyw, Math.max(edge, lg.cx - kyw / 2)), y: lg.feet - kyh, w: kyw, h: kyh };
      place(keyBtn, L.key.x, L.key.y, kyw, kyh);
      if (S.open) { freedPlace(); }
      if (doneBtn) { placeDone(); }
    }

    /* ---- steps ---- */
    function setStep(step) {
      S.step = step;
      root.dataset.step = step;
      gobs.forEach(function (b, i) { b.classList.toggle("rw-now", step === "bop" && !S.gone[i]); });
      ctx.hint(hintTarget);
    }
    function hintTarget() {
      if (S.busy) { return null; }
      if (S.step === "bop") {
        for (var i = 0; i < 3; i += 1) { if (!S.gone[i]) { return gobs[i]; } }
        return null;
      }
      if (S.step === "key") { return keyBtn.hidden ? null : keyBtn; }
      if (S.step === "door") { return doorBtn.hidden ? null : doorBtn; }
      return null;
    }

    function beginHello() {
      setStep("hello");
      ctx.wait(500, function () { ctx.speak(LINES.hello); });
      ctx.wait(3000, function () {
        if (S.step !== "hello") { return; }
        setStep("bop");
        ctx.speak(LINES.bop);
        if (ctx.auto) { autoPlay(); }
      });
    }

    /* the knight hops to goblin i (smaller further back), bops it, the goblin runs away; the knight hops home */
    function bop(i) {
      if (!(S.step === "hello" || S.step === "bop") || S.busy || S.gone[i]) { return; }
      S.busy = true;
      S.gone[i] = true;
      S.last = i;
      if (S.step === "hello") { setStep("bop"); }
      gobs[i].classList.remove("rw-now");
      ctx.hint(null);
      var g = L.gob[i];
      var k = L.knight;
      var sc = Math.min(1, g.h * 1.35 / k.h);
      var w = k.w * sc;
      var h = k.h * sc;
      var flip = false;
      var bx = g.cx - g.w * 0.12 - TIP / KW * w;
      if (bx + w * 100 / KW < L.edge) {
        flip = true;
        bx = g.cx + g.w * 0.12 - (KW - TIP) / KW * w;
      }
      var by = g.feet + h * 0.02 - h * 596 / KH;
      var to = "translate(" + (bx - k.x).toFixed(1) + "px," + (by - k.y).toFixed(1) + "px) scale(" + sc.toFixed(3) + ")";
      kflip.classList.toggle("rw-gr-mirror", flip);
      knight.style.transform = to;
      ctx.animate(knight, [
        { transform: "translate(0,0) scale(1)" },
        { transform: "translate(" + ((bx - k.x) / 2).toFixed(1) + "px," + (Math.min(0, by - k.y) / 2 - k.h * 0.12).toFixed(1) + "px) scale(" + ((1 + sc) / 2).toFixed(3) + ")", offset: 0.5 },
        { transform: to }
      ], { duration: 550, easing: "ease-in-out" });
      ctx.wait(560, function () {
        X.set(kpic, "knight_bop");
        ctx.sound.pop();
        ctx.sound.plop();
        X.set(gpic(i), "goblin_" + WHO[i] + "_oops");
        ctx.land(gmove(i));
        X.puff(ctx, g.cx, g.y + g.h * 0.12, Math.max(36, g.w * 0.3));
        ctx.speak(LINES.oops[S.bopped % 3]);
      });
      ctx.wait(1250, function () { X.set(kpic, "knight_sword"); runAway(i, flip); });
      ctx.wait(1450, function () {
        knight.style.transform = "";
        ctx.animate(knight, [{ transform: to }, { transform: "translate(0,0) scale(1)" }], { duration: 550, easing: "ease-in-out" });
      });
      ctx.wait(2600, function () {  /* the step ends once the goblin has run off the screen */
        kflip.classList.remove("rw-gr-mirror");
        S.busy = false;
        S.bopped += 1;
        root.dataset.bopped = String(S.bopped);
        if (S.bopped >= 3) { showKey(); } else { setStep("bop"); }
      });
    }
    /* the goblin runs off the near edge, away from the knight, with small hops */
    function runAway(i, toLeft) {
      var g = L.gob[i];
      var b = gobs[i];
      var m = gmove(i);
      X.set(gpic(i), "goblin_" + WHO[i] + "_run");
      m.classList.toggle("rw-gr-mirror", toLeft);
      ctx.sound.clipClop();
      var dist = toLeft ? -(g.x + g.w + 20) : (L.W - g.x + 20);
      var hop = Math.round(g.h * 0.06);
      var kf = [];
      for (var s = 0; s <= 6; s += 1) {
        kf.push({ transform: "translate(" + (dist * s / 6).toFixed(1) + "px," + (s % 2 ? -hop : 0) + "px)" + (toLeft ? " scaleX(-1)" : "") });
      }
      ctx.animate(m, kf, { duration: 1300, easing: "linear", fill: "forwards" });
      ctx.wait(1300, function () { b.hidden = true; });
    }
    gobs.forEach(function (b, i) { ctx.onTap(b, function () { bop(i); }); });

    /* key */
    function showKey() {
      setStep("key");
      layout();
      keyBtn.hidden = false;
      ctx.animate(keyBtn, [
        { transform: "translateY(-" + Math.round(L.key.h) + "px)", opacity: 0, easing: "ease-in" },
        { transform: "translateY(0) scale(1.06,.9)", opacity: 1, offset: 0.7, easing: "ease-out" },
        { transform: "translateY(-" + Math.round(L.key.h * 0.15) + "px)", offset: 0.85, easing: "ease-in" },
        { transform: "translateY(0)" }
      ], { duration: 800, fadeFrom: 0 });
      ctx.wait(500, function () { ctx.sound.plop(); });
      keyBtn.classList.add("rw-now");
      ctx.speak(LINES.key);
      ctx.hint(hintTarget);
      if (ctx.auto) { ctx.wait(900, function () { useKey(null); }); }
    }
    function useKey(fromRect) {
      if (S.step !== "key" || S.keyUsed) { return false; }
      S.keyUsed = true;
      ctx.hint(null);
      keyBtn.classList.remove("rw-now");
      var from = fromRect || { x: L.key.x, y: L.key.y, w: L.key.w, h: L.key.h };
      keyBtn.hidden = true;
      var lk = L.lock;
      var kw = lk.w * 1.25;
      var kh = kw * 120 / 240;
      var fly = X.make("div", "rw-gr-fly", X.html("cage_key"));
      ctx.layer.appendChild(fly);
      var to = { x: lk.x + lk.w * 0.5 - kw * 0.26, y: lk.y + lk.h * 0.62 - kh * 0.5, w: kw, h: kh };
      X.arc(ctx, fly, { x: from.x + (from.w - kw) / 2, y: from.y + (from.h - kh) / 2, w: kw, h: kh }, to, 800, L.H * 0.08);
      ctx.wait(820, function () {
        ctx.sound.clink();
        fly.style.transformOrigin = "26% 50%";
        ctx.animate(fly, [{ transform: "rotate(0deg)" }, { transform: "rotate(80deg)" }], { duration: 400, easing: "ease-in-out", fill: "forwards" });
      });
      ctx.wait(1300, function () {
        ctx.sound.clink();
        if (fly.parentNode) { fly.parentNode.removeChild(fly); }
        ctx.animate(lock, [{ transform: "translateY(0) rotate(0)", opacity: 1 }, { transform: "translateY(" + Math.round(lk.h * 0.9) + "px) rotate(18deg)", opacity: 0 }],
          { duration: 700, easing: "ease-in", fill: "forwards", keep: true });
      });
      ctx.wait(2050, function () {
        lock.hidden = true;
        setStep("door");
        doorBtn.hidden = false;
        door.classList.add("rw-glow");
        ctx.speak(LINES.door);
        ctx.hint(hintTarget);
        if (ctx.auto) { ctx.wait(700, openDoor); }
      });
      return true;
    }
    ctx.drag(keyBtn, {
      enabled: function () { return S.step === "key" && !S.keyUsed; },
      zones: function () { return [{ el: lock, id: "lock" }, { el: doorBtn, id: "door" }]; },
      onTap: function () { useKey(null); },
      onDrop: function (z, p, gr) { return useKey(gr ? { x: gr.left, y: gr.top, w: gr.width, h: gr.height } : null); }
    });

    /* door, then the buddy is free */
    function openDoor() {
      if (S.step !== "door" || S.open) { return; }
      S.open = true;
      ctx.hint(null);
      doorBtn.hidden = true;
      door.classList.remove("rw-glow");
      ctx.sound.creak();
      door.style.transform = "scaleX(.1)";
      ctx.animate(door, [{ transform: "scaleX(1)" }, { transform: "scaleX(.1)" }], { duration: 1200, easing: "ease-in-out" });
      ctx.wait(1250, function () {
        setStep("end");
        X.set(bpic, "buddy_cheer");
        var from = { x: L.buddy.x, y: L.buddy.y, w: L.buddy.w, h: L.buddy.h };
        buddy.classList.add("rw-gr-free");
        X.arc(ctx, buddy, from, freedRect(), 700, L.H * 0.06);
        ctx.wait(650, function () { ctx.sound.plop(); });
      });
      ctx.wait(2000, function () {
        X.set(kpic, "knight_sword_cheer");
        ctx.speak(LINES.saved);
        var r = freedRect();
        X.puff(ctx, r.x + r.w * 0.3, r.y + r.h * 0.15, Math.max(40, r.w * 0.22), "heart");
        ctx.wait(350, function () { X.puff(ctx, r.x + r.w * 0.7, r.y + r.h * 0.1, Math.max(40, r.w * 0.22), "heart"); });
        ctx.wait(700, function () { X.puff(ctx, L.knight.x + L.knight.w * 0.37, L.knight.y + L.knight.h * 0.1, Math.max(40, r.w * 0.22), "heart"); });
      });
      ctx.wait(3300, function () {
        doneBtn = ctx.doneButton(finish, root);
        placeDone();
      });
    }
    ctx.onTap(doorBtn, openDoor);
    /* the buddy stands in front of the open cage, a little bigger (nearer) */
    function freedRect() {
      var b = L.buddy;
      var sc = L.tall ? 1.05 : 1.1;
      var w = b.w * sc;
      var h = b.h * sc;
      /* tall: in front of the cage, below its floor; wide: out on the road, left of the cage (towards the knight) */
      var cx = L.tall ? L.cage.x + L.cage.w * 0.5 : L.cage.x - w * 0.12;
      var feet = L.cage.y + L.cage.h * FLOOR / CH + L.H * (L.tall ? 0.07 : 0.08);
      return { x: cx - w / 2, y: Math.min(L.H - L.edge, feet) - h * 596 / 600, w: w, h: h };
    }
    function freedPlace() {
      var r = freedRect();
      place(buddy, r.x, r.y, r.w, r.h);
    }

    var doneBtn = null;
    function placeDone() {
      if (!doneBtn) { return; }
      var bw = Math.max(170, Math.min(260, L.W * 0.4));
      var bh = Math.max(80, Math.min(110, L.H * 0.13));
      /* tall: between the freed buddy and the knight; wide: in the sky (the characters stand below) */
      var cx = L.W * 0.5;
      var top = L.tall ? L.H * 0.6 : L.H * 0.1;
      doneBtn.style.cssText = "left:" + Math.round(cx - bw / 2) + "px;top:" + Math.round(top) + "px;width:" + Math.round(bw) + "px;height:" + Math.round(bh) + "px";
    }

    function autoPlay() {
      function next() {
        if (S.step !== "bop") { return; }
        if (!S.busy) { bop(S.gone.indexOf(false)); }
        ctx.wait(400, next);
      }
      ctx.wait(300, next);
    }

    layout();
    ctx.on(window, "resize", layout);
    root.dataset.art = "ready";
    beginHello();
  }

  if (!window.RewardGames || !window.RewardGames.register) { throw new Error("castle_goblin_rescue.js needs reward_core.js loaded first"); }
  if (!X) { throw new Error("castle_goblin_rescue.js needs castle_extra_art.js loaded first"); }
  window.RewardGames.register("castle", { name: "goblin_rescue", label: "Goblin Rescue", start: start });
  window.RewardGames.goblinRescueLines = function () {
    return [LINES.hello, LINES.bop].concat(LINES.oops, [LINES.key, LINES.door, LINES.saved]);
  };
})();
