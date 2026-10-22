/* cafe_ice_cream.js - Marie's reward game "Mimi's Ice Cream" (Kids Maths). Registers theme "cafe".
 * Idea from 16_kids_maths/kids_reward_games_design_study.md section 5 ("stack scoops on a cone to match a
 * friend's picture order, then watch them lick it"). Rules as in section 3 (Hot Chocolate).
 *
 * Play (every step works by drag OR tap; nothing plays itself):
 *   order     a friend walks in and shows a picture card: a cone, three scoops (bottom to top), a sauce, a topping
 *   cone      drag one of 3 cones to the stand, or tap it
 *   scoops    drag or tap the tubs: each one puts a scoop on top (3 scoops; then Mimi says "That's tall!")
 *   sauce     drag or tap one of 2 sauce bottles: the sauce runs over the top scoop
 *   toppings  drag or tap up to 3 toppings onto the top scoop; after the first one the bell appears
 *   serve     drag the ice cream to the friend, or tap the bell and then the friend
 *   react     the friend licks it ("Mmm! So cold!"), cheers, and says "Just like my picture!" when every part
 *             matches the card; Mimi gives a high five; hearts; "Bye bye!"; a sticker stays; Done.
 * Any choice is fine: there is no wrong ice cream, a different one just gets "Thank you, Mimi!".
 * Data for tests: root.dataset.step = order | cone | scoops | sauce | toppings | serve | react | end,
 * root.dataset.order (JSON of the card), root.dataset.scoops, root.dataset.tops, root.dataset.match ("yes" | "no" after serving), root.dataset.art = "ready",
 * root.dataset.lines. Needs reward_core.js, cafe_scene_kit.js and window.KittyChars.
 */
(function () {
  "use strict";

  var KIT = window.RewardKit && window.RewardKit.cafeScene;
  if (!KIT) { throw new Error("cafe_ice_cream.js needs cafe_scene_kit.js loaded first"); }
  var INK = "#563832";
  var CONES = [{ id: "waffle", name: "Waffle cone" }, { id: "choc", name: "Chocolate cone" }, { id: "pink", name: "Pink cone" }];
  var FLAVOURS = [{ id: "strawberry", name: "Strawberry" }, { id: "mint", name: "Mint" }, { id: "vanilla", name: "Vanilla" }, { id: "chocolate", name: "Chocolate" }];
  var SAUCES = [{ id: "chocolate", name: "Chocolate sauce", fill: "#7a4a31", hi: "#b9876a" }, { id: "strawberry", name: "Strawberry sauce", fill: "#e2506f", hi: "#ffadc0" }];
  var TOPS = [{ id: "cherry", name: "Cherry", file: "topping_cherry.png" }, { id: "wafer", name: "Wafer", file: "topping_wafer.png" },
    { id: "sprinkles", name: "Sprinkles", file: "topping_sprinkles.png" }, { id: "strawberry", name: "Strawberry", file: "topping_strawberry.png" }];
  var LINES = {
    hello: "Hello Mimi! Can I have an ice cream, please?",
    cone: "Pick a cone.",
    scoop: "Add a scoop.",
    tall: "That's tall!",
    sauce: "Add some sauce.",
    top: "Pick a topping.",
    full: "It's full!",
    give: "Give it to your friend.",
    cold: "Mmm! So cold!"
  };
  var FILES = ["cone_stand_back.png", "cone_stand_front.png"];
  CONES.forEach(function (c) { FILES.push("cone_" + c.id + ".png"); });
  FLAVOURS.forEach(function (c) { FILES.push("scoop_" + c.id + ".png", "tub_" + c.id + ".png"); });
  SAUCES.forEach(function (c) { FILES.push("sauce_" + c.id + ".png"); });
  TOPS.forEach(function (c) { FILES.push(c.file); });
  KIT.load(FILES);

  /* the item: one picture in a 300 x 650 box (viewBox 0 50 300 650); the stand's foot stands on the counter at y 700 */
  var VB = { x: 0, y: 50, w: 300, h: 650 };
  var SCOOP_Y = [305, 210, 115];          /* top of each scoop picture (190 x 160 at x 55) */
  var TOP_AT = [[150, 14], [106, 38], [194, 38]];  /* topping centres, from the top scoop's top */
  var gameTurn = 1;                       /* starts at 1, so the first friend differs from Hot Chocolate's */
  var uidN = 0;

  function img(file, x, y, w, h, cls) {
    var u = KIT.url(file);
    if (u) { return '<image' + (cls ? ' class="' + cls + '"' : "") + ' href="' + u + '" x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" preserveAspectRatio="xMidYMid meet"/>'; }
    return '<rect' + (cls ? ' class="' + cls + '"' : "") + ' x="' + (x + w * 0.2) + '" y="' + (y + h * 0.2) + '" width="' + w * 0.6 + '" height="' + h * 0.6 + '" rx="' + w * 0.2 + '" fill="#f6b3c4" stroke="' + INK + '" stroke-width="4"/>';
  }
  function sauceParts(ty) {
    /* the sauce over the top scoop (the ball's centre is 150, ty + 84, radius 83 x 73) with two drips */
    var pts = [];
    for (var a = 200; a <= 340; a += 14) {
      var r = a * Math.PI / 180;
      pts.push([150 + 86 * Math.cos(r), ty + 84 + 76 * Math.sin(r)]);
    }
    pts = pts.concat([[226, ty + 64], [212, ty + 72], [204, ty + 98], [194, ty + 74], [172, ty + 80], [158, ty + 70], [140, ty + 80],
      [128, ty + 108], [116, ty + 80], [98, ty + 72], [84, ty + 80], [74, ty + 64]]);
    return KIT.crPath(pts);
  }
  /* the whole ice cream as SVG markup. o: { stand, cone, scoops[], sauce, tops[], newScoop, sauceClip } */
  function itemSvg(s, o) {
    o = o || {};
    var p = "ic" + (uidN += 1) + "_";
    var g = "";
    if (o.stand) { g += img("cone_stand_back.png", 90, 580, 120, 120); }
    if (s.cone) { g += '<g class="rw-ic-cone">' + img("cone_" + s.cone + ".png", 60, 400, 180, 270) + "</g>"; }
    if (o.stand) { g += img("cone_stand_front.png", 90, 580, 120, 120); }
    s.scoops.forEach(function (fl, i) {
      g += '<g class="rw-ic-scoop' + (i === o.newScoop ? " rw-ic-new" : "") + '">' + img("scoop_" + fl + ".png", 55, SCOOP_Y[i], 190, 160) + "</g>";
    });
    var ty = s.scoops.length ? SCOOP_Y[s.scoops.length - 1] : 400;
    if (s.sauce) {
      var sc = SAUCES.filter(function (x) { return x.id === s.sauce; })[0];
      var clip = o.sauceClip ? ' clip-path="url(#' + p + 'sc)"' : "";
      g += (o.sauceClip ? '<defs><clipPath id="' + p + 'sc"><rect class="rw-ic-sauceclip" x="40" y="' + (ty - 10) + '" width="220" height="0"/></clipPath></defs>' : "") +
        '<g class="rw-ic-sauce"' + clip + '><path d="' + sauceParts(ty) + '" fill="' + sc.fill + '" stroke="' + INK + '" stroke-width="4.5" stroke-linejoin="round"/>' +
        '<path d="M' + 96 + " " + (ty + 30) + " Q" + 120 + " " + (ty + 16) + " " + 146 + " " + (ty + 18) + '" fill="none" stroke="' + sc.hi + '" stroke-width="7" stroke-linecap="round" opacity=".8"/></g>';
    }
    s.tops.forEach(function (t, i) {
      var tt = TOPS.filter(function (x) { return x.id === t; })[0];
      var c = TOP_AT[i];
      g += '<g class="rw-ic-top' + (i === o.newTop ? " rw-ic-new" : "") + '">' + img(tt.file, c[0] - 38, ty + c[1] - 38, 76, 76) + "</g>";
    });
    var vb = o.vb || VB;
    return '<svg viewBox="' + vb.x + " " + vb.y + " " + vb.w + " " + vb.h + '" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">' + g + "</svg>";
  }

  function start(ctx, finish) {
    var root = ctx.root;
    var friendId = KIT.friendFor(gameTurn);
    gameTurn += 1;
    var rnd = Math.floor(Math.random() * 1e9);
    var picks = FLAVOURS.map(function (x) { return x.id; });
    var orderScoops = [];
    for (var k = 0; k < 3; k += 1) { orderScoops.push(picks.splice((rnd >> (k * 3)) % picks.length, 1)[0]); }
    var order = { cone: CONES[rnd % 3].id, scoops: orderScoops, sauce: SAUCES[(rnd >> 9) % 2].id, top: TOPS[(rnd >> 11) % 4].id };
    var S = { step: "order", cone: null, scoops: [], sauce: null, tops: [], served: false };
    var itemEl = null;
    var itemZone = null;

    var sc = KIT.make(ctx, {
      cls: "rw-ic", friend: friendId, orderAspect: 0.62, shelfLabel: "Things to make the ice cream",
      heldBox: { left: 30, top: 22, width: 40, height: 58 }, heldDownX: "-95%",
      onLayout: function (L) {
        var bottom = L.topY + L.slab * 0.62;
        var maxH = bottom - Math.max(6, L.h * 0.03);
        var hgt = Math.min(maxH, L.h * 0.9);
        var wid = hgt * VB.w / VB.h;
        var cx = L.w * 0.5;
        L.item = { left: cx - wid / 2, top: bottom - hgt, width: wid, height: hgt };
        L.scale = wid / VB.w;
        itemEl.style.cssText = "left:" + Math.round(L.item.left) + "px;top:" + Math.round(L.item.top) + "px;width:" + Math.round(wid) + "px;height:" + Math.round(hgt) + "px";
        /* the tap / drop area: the cone and scoops, at least 72 px wide */
        var zw = Math.max(72, wid * 0.72);
        itemZone.style.cssText = "left:" + Math.round(cx - zw / 2) + "px;top:" + Math.round(L.item.top + hgt * 0.1) + "px;width:" + Math.round(zw) + "px;height:" + Math.round(hgt * 0.86) + "px";
      }
    });
    root.dataset.art = "";
    root.dataset.order = JSON.stringify(order);
    root.dataset.scoops = "0";
    root.dataset.tops = "0";
    sc.centre.innerHTML = '<div class="rw-ic-item" role="img" aria-label="Your ice cream"></div><button type="button" class="rw-ic-zone" aria-label="The ice cream" disabled></button>';
    itemEl = sc.centre.querySelector(".rw-ic-item");
    itemZone = sc.centre.querySelector(".rw-ic-zone");
    var tools = [];

    function draw(o) {
      o = o || {};
      o.stand = true;
      itemEl.innerHTML = itemSvg(S, o);
      var n = itemEl.querySelector(".rw-ic-new");
      if (n) {
        ctx.animate(n, [{ transform: "translateY(-26px) scale(.86)", opacity: 0.4 }, { transform: "translateY(0) scale(1.06,.9)", opacity: 1, offset: 0.6 }, { transform: "translateY(0) scale(1)", opacity: 1 }],
          { duration: 480, easing: "ease-out", fadeFrom: 0.3 });
      }
    }
    /* a box (inside root) for a part of the item in viewBox units */
    function vbRect(x, y, w, h) {
      var it = ctx.rect(itemEl);
      var s = it.width / VB.w;
      return { left: it.left + (x - VB.x) * s, top: it.top + (y - VB.y) * s, width: w * s, height: h * s };
    }

    function setStep(step) {
      S.step = step;
      root.dataset.step = step;
      itemZone.disabled = step === "order" || step === "react" || step === "end";
      sc.want(step === "serve");
      ctx.hint(hintTarget);
    }
    function toolsFor(list, kind, fileOf) {
      tools = sc.setTools(list.map(function (x) { return { kind: kind, id: x.id, label: x.name, file: fileOf(x) }; }));
      sc.toolState(tools, "rw-now");
      tools.forEach(function (b, i) {
        ctx.drag(b, {
          enabled: function () { return S.step === stepOfKind(kind) && b.classList.contains("rw-now"); },
          zones: function () { return [{ el: itemZone, id: "item" }]; },
          onTap: function () { act(kind, list[i].id, null); },
          onDrop: function (z, pt, gr) { return act(kind, list[i].id, gr); }
        });
      });
      return tools;
    }
    function stepOfKind(kind) { return { cone: "cone", tub: "scoops", sauce: "sauce", top: "toppings" }[kind]; }
    function toolOf(id) { return tools.filter(function (b) { return b.dataset.id === id; })[0]; }
    function hintTarget() {
      switch (S.step) {
        case "cone": return toolOf(order.cone);
        case "scoops": return toolOf(order.scoops[S.scoops.length] || order.scoops[0]);
        case "sauce": return toolOf(order.sauce);
        case "toppings": return S.tops.length ? (sc.bell.hidden ? null : sc.bell) : toolOf(order.top);
        case "serve": return sc.friendHit;
        default: return null;
      }
    }
    function act(kind, id, ghostRect) {
      if (kind === "cone") { return chooseCone(id, ghostRect); }
      if (kind === "tub") { return addScoop(id, ghostRect); }
      if (kind === "sauce") { return addSauce(id, ghostRect); }
      return addTop(id, ghostRect);
    }

    /* 1. order */
    function orderCard() {
      var o = { cone: order.cone, scoops: order.scoops, sauce: order.sauce, tops: [order.top] };
      return itemSvg(o, { vb: { x: 40, y: 50, w: 220, h: 630 } });
    }
    function begin() {
      setStep("order");
      var label = "Order: a " + CONES.filter(function (c) { return c.id === order.cone; })[0].name.toLowerCase() + " with " +
        order.scoops.join(", ") + ", " + order.sauce + " sauce and a " + order.top;
      sc.arrive(LINES.hello, orderCard(), label, function () {
        toolsFor(CONES, "cone", function (c) { return "cone_" + c.id + ".png"; });
        setStep("cone");
        sc.say("mimi", LINES.cone);
        if (ctx.auto) { ctx.wait(700, function () { chooseCone(order.cone, null); }); }
      });
    }

    /* 2. cone */
    function chooseCone(id, from) {
      if (S.step !== "cone") { return false; }
      var b = toolOf(id);
      var fromR = from || ctx.rect(b);
      S.cone = id;
      sc.toolState(tools, "rw-spent");
      b.classList.add("rw-used");
      draw({});
      var cone = itemEl.querySelector(".rw-ic-cone");
      setStep("scoops");
      if (cone) { ctx.slideFrom(cone, fromR, 600); }
      ctx.wait(560, function () { if (cone) { ctx.land(cone); } ctx.sound.plop(); sc.mimiSmile(); });
      ctx.wait(800, function () {
        toolsFor(FLAVOURS, "tub", function (c) { return "tub_" + c.id + ".png"; });
        sc.say("mimi", LINES.scoop);
        ctx.hint(hintTarget);
        if (ctx.auto) { autoScoops(0); }
      });
      return true;
    }

    /* 3. scoops: three, each one lands on top of the last */
    var flying = false;
    function addScoop(fl, from) {
      if (S.step !== "scoops" || S.scoops.length >= 3 || flying) { return false; }
      var i = S.scoops.length;
      var fromR = from || ctx.rect(toolOf(fl));
      flying = true;
      var to = vbRect(55, SCOOP_Y[i], 190, 160);
      sc.fly(KIT.pic("scoop_" + fl + ".png", ""), fromR, to, 480).then(function () {
        flying = false;
        S.scoops.push(fl);
        root.dataset.scoops = String(S.scoops.length);
        draw({ newScoop: i });
        ctx.sound.plop();
        sc.mimiSmile();
        if (S.scoops.length >= 3) {
          sc.toolState(tools, "rw-spent");
          setStep("sauce");
          ctx.wait(350, function () { sc.say("mimi", LINES.tall, 1500); });
          ctx.wait(1700, function () {
            toolsFor(SAUCES, "sauce", function (c) { return "sauce_" + c.id + ".png"; });
            sc.say("mimi", LINES.sauce);
            ctx.hint(hintTarget);
            if (ctx.auto) { ctx.wait(600, function () { addSauce(order.sauce, null); }); }
          });
        }
      });
      return true;
    }
    function autoScoops(n) {
      if (S.step !== "scoops" || n >= 3) { return; }
      ctx.wait(500, function () { addScoop(order.scoops[n], null); ctx.wait(700, function () { autoScoops(n + 1); }); });
    }

    /* 4. sauce: the bottle tips over the top scoop and the sauce runs down */
    function addSauce(id, from) {
      if (S.step !== "sauce" || S.sauce) { return false; }
      S.sauce = id;
      sc.toolState(tools, "rw-spent");
      toolOf(id).classList.add("rw-used");
      var ty = SCOOP_Y[S.scoops.length - 1];
      var bottle = document.createElement("div");
      bottle.className = "rw-cs-fly rw-ic-bottle";
      var to = vbRect(96, ty - 168, 120, 160);
      bottle.style.cssText = "left:" + Math.round(to.left) + "px;top:" + Math.round(to.top) + "px;width:" + Math.round(to.width) + "px;height:" + Math.round(to.height) + "px";
      bottle.innerHTML = KIT.pic("sauce_" + id + ".png", "");
      ctx.layer.appendChild(bottle);
      ctx.slideFrom(bottle, from || ctx.rect(toolOf(id)), 450);
      ctx.wait(420, function () { bottle.classList.add("rw-ic-tip"); });
      ctx.wait(700, function () {
        draw({ sauceClip: true });
        ctx.sound.pourStart();
        var r = itemEl.querySelector(".rw-ic-sauceclip");
        var t = 0;
        ctx.loop(function (dt) {
          t = Math.min(1, t + dt / 0.9);
          if (r) { r.setAttribute("height", (130 * t).toFixed(1)); }
          return t < 1;
        });
      });
      ctx.wait(1700, function () {
        ctx.sound.pourStop();
        draw({});
        bottle.classList.remove("rw-ic-tip");
        ctx.animate(bottle, [{ opacity: 1 }, { opacity: 0, transform: "translateY(-14px)" }], { duration: 380, fill: "forwards", keep: true });
        ctx.wait(400, function () { if (bottle.parentNode) { bottle.parentNode.removeChild(bottle); } });
        sc.mimiSmile();
        setStep("toppings");
        toolsFor(TOPS, "top", function (c) { return c.file; });
        sc.say("mimi", LINES.top);
        ctx.hint(hintTarget);
        if (ctx.auto) { autoTops(); }
      });
      return true;
    }

    /* 5. toppings (up to 3) */
    function addTop(id, from) {
      if (S.step !== "toppings" || S.tops.length >= 3 || flying) { return false; }
      var i = S.tops.length;
      var ty = SCOOP_Y[S.scoops.length - 1];
      var c = TOP_AT[i];
      flying = true;
      var tt = TOPS.filter(function (x) { return x.id === id; })[0];
      sc.fly(KIT.pic(tt.file, ""), from || ctx.rect(toolOf(id)), vbRect(c[0] - 38, ty + c[1] - 38, 76, 76), 420).then(function () {
        flying = false;
        S.tops.push(id);
        root.dataset.tops = String(S.tops.length);
        draw({ newTop: i });
        ctx.sound.plop();
        sc.mimiSmile();
        if (S.tops.length === 1) { ctx.wait(500, function () { sc.showBell(); ctx.hint(hintTarget); }); }
        if (S.tops.length >= 3) {
          sc.toolState(tools, "rw-spent");
          ctx.wait(400, function () { sc.say("mimi", LINES.full); });
          ctx.wait(2100, function () { if (S.step === "toppings") { sc.say("mimi", LINES.give); } });
        }
      });
      return true;
    }
    function autoTops() {
      ctx.wait(500, function () { addTop(order.top, null); });
      ctx.wait(1700, function () { ringBell(); });
      ctx.wait(2500, function () { serve(null); });
    }

    /* 6. serve */
    function ringBell() {
      if (S.step !== "toppings" || !S.tops.length || flying) { return; }
      ctx.sound.bell();
      ctx.land(sc.bell);
      sc.toolState(tools, "rw-spent");
      setStep("serve");
      sc.say("mimi", LINES.give);
    }
    ctx.onTap(sc.bell, ringBell);
    ctx.onTap(sc.friendHit, function () { if (S.step === "serve") { serve(null); } });
    ctx.drag(itemZone, {
      enabled: function () { return (S.step === "toppings" || S.step === "serve") && S.tops.length > 0 && !flying; },
      zones: function () { return [{ el: sc.friendHit, id: "friend" }]; },
      onLift: function () { itemEl.classList.add("rw-away"); },
      onHome: function () { itemEl.classList.remove("rw-away"); },
      onTap: function () { ctx.land(itemEl); ctx.sound.plop(); },
      onDrop: function (z, pt, gr) { return serve(gr); }
    });
    /* the drag ghost of the zone is an empty button: show the ice cream inside it while it is dragged */
    itemZone.innerHTML = '<span class="rw-ic-zoneart"></span>';

    /* 7. the friend's reaction */
    function serve(fromRect) {
      if (S.served || !S.tops.length || !(S.step === "toppings" || S.step === "serve") || flying) { return false; }
      S.served = true;
      ctx.sound.bell();
      setStep("react");
      var match = S.cone === order.cone && S.scoops.join() === order.scoops.join() && S.sauce === order.sauce && S.tops.indexOf(order.top) >= 0;
      root.dataset.match = match ? "yes" : "no";
      var from = fromRect || ctx.rect(itemEl);
      var noStand = { vb: { x: 40, y: 50, w: 220, h: 630 } };
      /* the empty stand stays; the friend takes the ice cream */
      itemEl.innerHTML = itemSvg({ cone: null, scoops: [], sauce: null, tops: [] }, { stand: true });
      sc.itemHidden = true;
      itemZone.disabled = true;
      sc.toolState(tools, "rw-spent");
      sc.react({
        from: from, held: itemSvg(S, noStand), sticker: itemSvg(S, noStand), first: LINES.cold, match: match, finish: finish,
        onSip: function (heldEl) {
          ctx.sound.pop();
          ctx.animate(heldEl, [{ transform: "rotate(0deg)" }, { transform: "rotate(-8deg) translateY(-4%)" }, { transform: "rotate(0deg)" }], { duration: 900, easing: "ease-in-out" });
        }
      });
      return true;
    }

    sc.layout();
    ctx.on(window, "resize", sc.layout);
    KIT.load(FILES).then(function () {
      if (ctx.isClosed()) { return; }
      sc.refreshArt();
      draw({});
      itemZone.querySelector(".rw-ic-zoneart").innerHTML = itemEl.innerHTML;
      sc.layout();
      root.dataset.art = "ready";
      root.classList.add("rw-cs-on");
      begin();
    });
    /* keep the ghost picture current while she drags the finished ice cream */
    ctx.on(itemZone, "pointerdown", function () {
      var za = itemZone.querySelector(".rw-ic-zoneart");
      if (za) { za.innerHTML = itemEl.innerHTML; za.style.cssText = zoneArtCss(); }
    }, true);
    function zoneArtCss() {
      var it = ctx.rect(itemEl);
      var z = ctx.rect(itemZone);
      return "left:" + Math.round(it.left - z.left) + "px;top:" + Math.round(it.top - z.top) + "px;width:" + Math.round(it.width) + "px;height:" + Math.round(it.height) + "px";
    }
  }

  if (!window.RewardGames || !window.RewardGames.register) { throw new Error("cafe_ice_cream.js needs reward_core.js loaded first"); }
  window.RewardGames.register("cafe", { name: "ice_cream", label: "Mimi's Ice Cream", start: start });
  window.RewardGames.iceCreamLines = function () { return Object.keys(LINES).map(function (k) { return LINES[k]; }); };
})();
