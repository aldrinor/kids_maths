/* cafe_cookie.js - Marie's reward game "Mimi's Cookies" (Kids Maths). Registers theme "cafe".
 * Idea from 16_kids_maths/kids_reward_games_design_study.md section 5 ("drag a piping bag to draw icing on a big
 * cookie, then serve it"). Rules as in section 3 (Hot Chocolate).
 *
 * Play (every step works by drag OR tap; nothing plays itself):
 *   order     a friend walks in and shows a picture card: a cookie shape, an icing colour and one kind of sweets
 *   shape     drag one of 4 cookies (heart, star, flower, cat) onto the plate, or tap it
 *   ice       pick a piping bag (tap it, or drag it onto the cookie), then draw on the cookie with a finger;
 *             a tap puts a round dot of icing. She can change colour any time. When there is enough icing
 *             Mimi says "Lovely!" and the sweets light up (she can keep drawing).
 *   decorate  drag or tap sweets onto the cookie (8 places; never removed; when full Mimi says "It's full!");
 *             after the first sweet the bell appears
 *   serve     drag the cookie to the friend, or tap the bell and then the friend
 *   react     the friend takes a bite (crunch, a bite mark, crumbs): "Crunch! Yummy!", cheers, and says
 *             "Just like my picture!" when shape, main icing colour and sweets match the card; Mimi gives a
 *             high five; hearts; "Bye bye!"; a sticker of the cookie stays; Done.
 * Data for tests: root.dataset.order (JSON of the card), root.dataset.step = order | shape | ice | decorate | serve | react | end, root.dataset.colour,
 * root.dataset.icing (0-100, 100 = enough), root.dataset.sweets, root.dataset.match, root.dataset.art = "ready",
 * root.dataset.lines. Needs reward_core.js, cafe_scene_kit.js and window.KittyChars.
 * The cookie outlines below are also read by tools/draw_cafe_extra_art.py, so the pictures and the icing clip match.
 */
(function () {
  "use strict";

  var KIT = window.RewardKit && window.RewardKit.cafeScene;
  if (!KIT) { throw new Error("cafe_cookie.js needs cafe_scene_kit.js loaded first"); }
  var INK = "#563832";
  /* outline "d" in a 300 x 300 box and 8 places for sweets */
  var SHAPES = /* COOKIE_SHAPES_BEGIN */{"heart":{"d":"M150 99 C150.5 99 149.7 95.6 151.4 90.9 C153.2 86.3 155.7 78 160.7 71.3 C165.8 64.7 173.1 56.1 181.8 51.3 C190.5 46.4 202 42.4 212.7 42.2 C223.4 42.1 236.1 45 246 50.4 C255.8 55.7 265.7 64.8 271.6 74.2 C277.5 83.7 281.2 95.9 281.2 107.2 C281.2 118.5 277.5 130.8 271.6 142.1 C265.7 153.4 255.8 164.4 246 174.9 C236.1 185.3 223.4 195.2 212.7 204.7 C202 214.3 190.5 223.6 181.8 232.2 C173.1 240.8 165.8 249.3 160.7 256.1 C155.7 263 153.2 269.3 151.4 273.2 C149.7 277 150.5 279.4 150 279.4 C149.5 279.4 150.3 277 148.6 273.2 C146.8 269.3 144.3 263 139.3 256.1 C134.2 249.3 126.9 240.8 118.2 232.2 C109.5 223.6 98 214.3 87.3 204.7 C76.6 195.2 63.9 185.3 54 174.9 C44.2 164.4 34.3 153.4 28.4 142.1 C22.5 130.8 18.8 118.5 18.8 107.2 C18.8 95.9 22.5 83.7 28.4 74.2 C34.3 64.8 44.2 55.7 54 50.4 C63.9 45 76.6 42.1 87.3 42.2 C98 42.4 109.5 46.4 118.2 51.3 C126.9 56.1 134.2 64.7 139.3 71.3 C144.3 78 146.8 86.3 148.6 90.9 C150.3 95.6 149.5 99 150 99 Z","spots":[[150,140],[60,90],[240,90],[150,220],[90,170],[210,170],[110,100],[190,100]]},"star":{"d":"M150 22 C164.5 22 171.6 84.2 193.5 100.1 C215.4 116 276.8 103.6 281.2 117.4 C285.7 131.1 228.7 157.2 220.4 182.9 C212 208.6 242.8 263.1 231.1 271.6 C219.4 280.2 177 234 150 234 C123 234 80.6 280.2 68.9 271.6 C57.2 263.1 88 208.6 79.6 182.9 C71.3 157.2 14.3 131.1 18.8 117.4 C23.2 103.6 84.6 116 106.5 100.1 C128.4 84.2 135.5 22 150 22 Z","spots":[[150,160],[60,110],[100,250],[240,110],[150,60],[200,250],[100,150],[110,200]]},"flower":{"d":"M284 150 C284 154.5 282.1 159.5 279.1 163.6 C276.1 167.7 271 171.5 266.2 174.7 C261.4 177.9 255.1 180.2 250.1 182.5 C245 184.8 239.7 186.2 236.1 188.3 C232.4 190.4 229.6 192.2 227.9 195 C226.3 197.8 226.2 201.1 226.2 205.4 C226.3 209.6 227.6 214.9 228.2 220.4 C228.7 225.9 229.8 232.5 229.5 238.3 C229.2 244.1 228.4 250.4 226.3 255 C224.2 259.6 220.9 263.8 217 266 C213.1 268.3 207.8 269.1 202.8 268.6 C197.7 268.1 191.9 265.6 186.7 263 C181.6 260.4 176.3 256.1 171.9 252.9 C167.4 249.7 163.5 245.8 159.8 243.7 C156.2 241.5 153.3 240 150 240 C146.7 240 143.8 241.5 140.2 243.7 C136.5 245.8 132.6 249.7 128.1 252.9 C123.7 256.1 118.4 260.4 113.3 263 C108.1 265.6 102.3 268.1 97.2 268.6 C92.2 269.1 86.9 268.3 83 266 C79.1 263.8 75.8 259.6 73.7 255 C71.6 250.4 70.8 244.1 70.5 238.3 C70.2 232.5 71.3 225.9 71.8 220.4 C72.4 214.9 73.7 209.6 73.8 205.4 C73.8 201.1 73.7 197.8 72.1 195 C70.4 192.2 67.6 190.4 63.9 188.3 C60.3 186.2 55 184.8 49.9 182.5 C44.9 180.2 38.6 177.9 33.8 174.7 C29 171.5 23.9 167.7 20.9 163.6 C17.9 159.5 16 154.5 16 150 C16 145.5 17.9 140.5 20.9 136.4 C23.9 132.3 29 128.5 33.8 125.3 C38.6 122.1 44.9 119.8 49.9 117.5 C55 115.2 60.3 113.8 63.9 111.7 C67.6 109.6 70.4 107.8 72.1 105 C73.7 102.2 73.8 98.9 73.8 94.6 C73.7 90.4 72.4 85.1 71.8 79.6 C71.3 74.1 70.2 67.5 70.5 61.7 C70.8 55.9 71.6 49.6 73.7 45 C75.8 40.4 79.1 36.2 83 34 C86.9 31.7 92.2 30.9 97.2 31.4 C102.3 31.9 108.1 34.4 113.3 37 C118.4 39.6 123.7 43.9 128.1 47.1 C132.6 50.3 136.5 54.2 140.2 56.3 C143.8 58.5 146.7 60 150 60 C153.3 60 156.2 58.5 159.8 56.3 C163.5 54.2 167.4 50.3 171.9 47.1 C176.3 43.9 181.6 39.6 186.7 37 C191.9 34.4 197.7 31.9 202.8 31.4 C207.8 30.9 213.1 31.7 217 34 C220.9 36.2 224.2 40.4 226.3 45 C228.4 49.6 229.2 55.9 229.5 61.7 C229.8 67.5 228.7 74.1 228.2 79.6 C227.6 85.1 226.3 90.4 226.2 94.6 C226.2 98.9 226.3 102.2 227.9 105 C229.6 107.8 232.4 109.6 236.1 111.7 C239.7 113.8 245 115.2 250.1 117.5 C255.1 119.8 261.4 122.1 266.2 125.3 C271 128.5 276.1 132.3 279.1 136.4 C282.1 140.5 284 145.5 284 150 Z","spots":[[150,150],[60,150],[240,150],[110,80],[110,220],[190,80],[190,220],[100,130]]},"cat":{"d":"M272 165 C272 170.6 271.5 176.3 270.5 181.9 C269.5 187.5 268 193 266 198.4 C264.1 203.7 261.6 209 258.7 214 C255.8 219 252.4 223.9 248.7 228.5 C245 233 240.8 237.4 236.3 241.4 C231.8 245.3 226.9 249.1 221.7 252.4 C216.6 255.7 211.1 258.7 205.4 261.2 C199.7 263.8 193.8 266 187.7 267.7 C181.6 269.5 175.4 270.8 169.1 271.7 C162.8 272.6 156.4 273 150 273 C143.6 273 137.2 272.6 130.9 271.7 C124.6 270.8 118.4 269.5 112.3 267.7 C106.2 266 100.3 263.8 94.6 261.2 C88.9 258.7 83.4 255.7 78.3 252.4 C73.1 249.1 68.2 245.3 63.7 241.4 C59.2 237.4 55 233 51.3 228.5 C47.6 223.9 44.2 219 41.3 214 C38.4 209 35.9 203.7 34 198.4 C32 193 30.5 187.5 29.5 181.9 C28.5 176.3 28 170.6 28 165 C28 159.4 28.5 153.7 29.5 148.1 C30.5 142.5 32 137 34 131.6 C35.9 126.3 38.4 121 41.3 116 C44.2 111 46.5 105.5 51.3 101.5 C56.1 97.5 68.2 105.9 70 92 C71.8 78.1 62 18 62 18 C62 18 116.5 57.3 128 64 C139.5 70.7 127.2 59.5 130.9 58.3 C134.6 57.2 143.6 57 150 57 C156.4 57 165.4 57.2 169.1 58.3 C172.8 59.5 160.5 70.7 172 64 C183.5 57.3 238 18 238 18 C238 18 228.2 78.1 230 92 C231.8 105.9 243.9 97.5 248.7 101.5 C253.5 105.5 255.8 111 258.7 116 C261.6 121 264.1 126.3 266 131.6 C268 137 269.5 142.5 270.5 148.1 C271.5 153.7 272 159.4 272 165 Z","spots":[[150,160],[90,40],[220,50],[80,210],[220,210],[80,130],[220,130],[150,230]]}}/* COOKIE_SHAPES_END */;
  var COOKIES = [{ id: "heart", name: "Heart cookie" }, { id: "star", name: "Star cookie" }, { id: "flower", name: "Flower cookie" }, { id: "cat", name: "Cat cookie" }];
  var BAGS = [
    { id: "pink", name: "Pink icing", edge: "#c95a7a", main: "#f490ab", hi: "#ffd3de" },
    { id: "mint", name: "Mint icing", edge: "#3f927a", main: "#7ccfb8", hi: "#d9f6ec" },
    { id: "lemon", name: "Yellow icing", edge: "#c09a30", main: "#f5d36b", hi: "#fff3c9" },
    { id: "lilac", name: "Lilac icing", edge: "#8466bd", main: "#b99ae6", hi: "#efe5fc" }
  ];
  var SWEETS = [{ id: "hearts", name: "Candy hearts", file: "candy_hearts.png" }, { id: "stars", name: "Candy stars", file: "candy_stars.png" },
    { id: "pearls", name: "Sugar pearls", file: "candy_pearls.png" }, { id: "sprinkles", name: "Sprinkles", file: "topping_sprinkles.png" }];
  var LINES = {
    hello: "Hello Mimi! Can I have a cookie, please?",
    shape: "Pick a cookie.",
    colour: "Pick an icing colour.",
    draw: "Draw with the icing.",
    lovely: "Lovely!",
    sweets: "Add some sweets.",
    full: "It's full!",
    give: "Give it to your friend.",
    crunch: "Crunch! Yummy!"
  };
  var ENOUGH = 520;        /* icing needed (length in cookie units; a dot counts 70) before the sweets light up */
  var MAX_POINTS = 1400;   /* icing never disappears; past this many points no more is added */
  var FILES = ["plate_stand.png"];
  COOKIES.forEach(function (c) { FILES.push("cookie_" + c.id + ".png"); });
  BAGS.forEach(function (c) { FILES.push("piping_" + c.id + ".png"); });
  SWEETS.forEach(function (c) { FILES.push(c.file); });
  KIT.load(FILES);

  /* the item: the plate on its stand with the cookie (viewBox -40 -40 380 400; cookie box 0 0 300 300) */
  var VB = { x: -40, y: -40, w: 380, h: 400 };
  var gameTurn = 2;        /* starts at 2, so the first friend differs from the other cafe games */
  var uidN = 0;

  function img(file, x, y, w, h) {
    var u = KIT.url(file);
    return u ? '<image href="' + u + '" x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" preserveAspectRatio="xMidYMid meet"/>' : "";
  }
  function bag(id) { return BAGS.filter(function (b) { return b.id === id; })[0]; }
  function strokeD(pts) {
    var d = "M" + pts[0][0].toFixed(1) + " " + pts[0][1].toFixed(1);
    for (var i = 1; i < pts.length; i += 1) { d += " L" + pts[i][0].toFixed(1) + " " + pts[i][1].toFixed(1); }
    return pts.length === 1 ? d + " l0.1 0" : d;
  }
  function icingMarkup(stroke) {
    var b = bag(stroke.colour);
    var d = strokeD(stroke.pts);
    var w = stroke.dot ? 26 : 15;
    return '<g class="rw-ck-stroke"><path d="' + d + '" fill="none" stroke="' + b.edge + '" stroke-width="' + (w + 4) + '" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="' + d + '" fill="none" stroke="' + b.main + '" stroke-width="' + w + '" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="' + d + '" fill="none" stroke="' + b.hi + '" stroke-width="' + Math.round(w * 0.3) + '" stroke-linecap="round" stroke-linejoin="round" opacity=".85" transform="translate(-2 -2.5)"/></g>';
  }
  /* the cookie with its icing and sweets, as SVG. o: { plate, vb, bite, newSweet } */
  function itemSvg(s, o) {
    o = o || {};
    var p = "ck" + (uidN += 1) + "_";
    var sh = SHAPES[s.shape];
    var vb = o.vb || VB;
    var g = "";
    if (o.plate) { g += img("plate_stand.png", -40, -40, 380, 400); }
    var cookie = "";
    if (sh) {
      var pic = img("cookie_" + s.shape + ".png", 0, 0, 300, 300) ||
        '<path d="' + sh.d + '" fill="#eebd7c" stroke="' + INK + '" stroke-width="5"/>';
      cookie += '<g class="rw-ck-cookie">' + pic +
        '<g clip-path="url(#' + p + 'clip)"><g class="rw-ck-icing">' + s.strokes.map(icingMarkup).join("") + "</g></g>" +
        '<g class="rw-ck-sweets">' + s.sweets.map(function (sw, i) {
          var at = sh.spots[sw.spot];
          var file = SWEETS.filter(function (x) { return x.id === sw.kind; })[0].file;
          return '<g class="rw-ck-sweet' + (i === o.newSweet ? " rw-ck-new" : "") + '">' + img(file, at[0] - 39, at[1] - 39, 78, 78) + "</g>";
        }).join("") + "</g></g>";
    }
    var defs = '<defs><clipPath id="' + p + 'clip"><path d="' + (sh ? sh.d : "M0 0") + '" transform="translate(150 150) scale(.93) translate(-150 -150)"/></clipPath>' +
      '<mask id="' + p + 'bite" maskUnits="userSpaceOnUse" x="-60" y="-60" width="420" height="420"><rect x="-60" y="-60" width="420" height="420" fill="#fff"/><g class="rw-ck-bites">' + (o.bite || "") + "</g></mask></defs>";
    g += '<g mask="url(#' + p + 'bite)">' + cookie + "</g>";
    return '<svg viewBox="' + vb.x + " " + vb.y + " " + vb.w + " " + vb.h + '" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">' + defs + g + "</svg>";
  }

  function start(ctx, finish) {
    var root = ctx.root;
    var friendId = KIT.friendFor(gameTurn);
    gameTurn += 1;
    var rnd = Math.floor(Math.random() * 1e9);
    var order = { shape: COOKIES[rnd % 4].id, colour: BAGS[(rnd >> 3) % 4].id, sweet: SWEETS[(rnd >> 6) % 4].id };
    var S = { step: "order", shape: null, colour: null, strokes: [], points: 0, amount: 0, sweets: [], served: false, lovely: false };
    var itemEl = null;
    var zone = null;
    var pen = null;

    var sc = KIT.make(ctx, {
      cls: "rw-ck", friend: friendId, orderAspect: 1, shelfLabel: "Things to make the cookie",
      heldBox: { left: 28, top: 34, width: 50, height: 46 },
      onLayout: function (L) {
        var bottom = L.topY + L.slab * 0.62;
        var room = L.fx - L.mx - L.cwid * (L.mode === "tall" ? 0.55 : 0.75);
        var hgt = Math.min(bottom - Math.max(6, L.h * 0.04), room * VB.h / VB.w, L.h * 0.74);
        var wid = hgt * VB.w / VB.h;
        var cx = L.w * 0.5;
        L.item = { left: cx - wid / 2, top: bottom - hgt, width: wid, height: hgt };
        itemEl.style.cssText = "left:" + Math.round(L.item.left) + "px;top:" + Math.round(L.item.top) + "px;width:" + Math.round(wid) + "px;height:" + Math.round(hgt) + "px";
        /* the cookie (box 0..300 of the viewBox) is the drawing area: at least 72 px */
        var s = wid / VB.w;
        var cl = L.item.left + (0 - VB.x) * s;
        var ct = L.item.top + (0 - VB.y) * s;
        var cs = Math.max(72, 300 * s);
        zone.style.cssText = "left:" + Math.round(cl + 150 * s - cs / 2) + "px;top:" + Math.round(ct + 150 * s - cs / 2) + "px;width:" + Math.round(cs) + "px;height:" + Math.round(cs) + "px";
        L.cookieScale = s;
        placePen();
      }
    });
    root.dataset.art = "";
    root.dataset.order = JSON.stringify(order);
    root.dataset.icing = "0";
    root.dataset.sweets = "0";
    sc.centre.innerHTML = '<div class="rw-ck-item" role="img" aria-label="Your cookie"></div>' +
      '<button type="button" class="rw-ck-zone" aria-label="The cookie" disabled><span class="rw-ck-zoneart"></span></button>' +
      '<div class="rw-ck-pen" hidden aria-hidden="true"></div>';
    itemEl = sc.centre.querySelector(".rw-ck-item");
    zone = sc.centre.querySelector(".rw-ck-zone");
    pen = sc.centre.querySelector(".rw-ck-pen");
    var shapeTools = [];
    var bagTools = [];
    var sweetTools = [];

    function draw(o) {
      o = o || {};
      o.plate = true;
      itemEl.innerHTML = itemSvg(S, o);
      var n = itemEl.querySelector(".rw-ck-new");
      if (n) {
        ctx.animate(n, [{ transform: "translateY(-22px) scale(.8)", opacity: 0.3 }, { transform: "translateY(0) scale(1.08,.9)", opacity: 1, offset: 0.6 }, { transform: "translateY(0) scale(1)", opacity: 1 }],
          { duration: 460, easing: "ease-out", fadeFrom: 0.3 });
      }
    }
    function icingGroup() { return itemEl.querySelector(".rw-ck-icing"); }
    /* a point inside root -> cookie units (0..300) */
    function toCookie(x, y) {
      var it = ctx.rect(itemEl);
      var s = it.width / VB.w;
      return [(x - it.left) / s + VB.x, (y - it.top) / s + VB.y];
    }
    function cookieRect(x, y, w, h) {
      var it = ctx.rect(itemEl);
      var s = it.width / VB.w;
      return { left: it.left + (x - VB.x) * s, top: it.top + (y - VB.y) * s, width: w * s, height: h * s };
    }

    function setStep(step) {
      S.step = step;
      root.dataset.step = step;
      zone.disabled = !(step === "shape" || step === "ice" || step === "decorate" || step === "serve");
      sc.want(step === "serve");
      states();
      ctx.hint(hintTarget);
    }
    function states() {
      var st = S.step;
      sc.toolState(shapeTools, st === "shape" ? "rw-now" : "rw-spent");
      bagTools.forEach(function (b) {
        sc.toolState([b], (st === "ice" || st === "decorate") ? "rw-now" : "rw-spent");
        b.classList.toggle("rw-ck-picked", b.dataset.id === S.colour && (st === "ice" || st === "decorate"));
      });
      var sweetsOn = (st === "decorate") && S.sweets.length < 8;
      sc.toolState(sweetTools, sweetsOn ? "rw-now" : (st === "ice" ? "rw-wait" : "rw-spent"));
    }
    function toolOf(list, id) { return list.filter(function (b) { return b.dataset.id === id; })[0]; }
    function hintTarget() {
      switch (S.step) {
        case "shape": return toolOf(shapeTools, order.shape);
        case "ice": return S.colour ? zone : toolOf(bagTools, order.colour);
        case "decorate": return S.sweets.length ? (sc.bell.hidden ? null : sc.bell) : toolOf(sweetTools, order.sweet);
        case "serve": return sc.friendHit;
        default: return null;
      }
    }

    /* 1. order */
    function begin() {
      setStep("order");
      var card = itemSvg({ shape: order.shape, strokes: orderIcing(), sweets: [{ kind: order.sweet, spot: 0 }, { kind: order.sweet, spot: 1 }, { kind: order.sweet, spot: 2 }] }, { vb: { x: -6, y: -6, w: 312, h: 312 } });
      var label = "Order: a " + order.shape + " cookie with " + bag(order.colour).name.toLowerCase() + " and " + SWEETS.filter(function (x) { return x.id === order.sweet; })[0].name.toLowerCase();
      sc.arrive(LINES.hello, card, label, function () {
        shapeTools = sc.setTools(COOKIES.map(function (c) { return { kind: "cookie", id: c.id, label: c.name, file: "cookie_" + c.id + ".png" }; }));
        shapeTools.forEach(function (b) {
          ctx.drag(b, {
            enabled: function () { return S.step === "shape"; },
            zones: function () { return [{ el: zone, id: "plate" }]; },
            onTap: function () { chooseShape(b.dataset.id, null); },
            onDrop: function (z, pt, gr) { return chooseShape(b.dataset.id, gr); }
          });
        });
        setStep("shape");
        sc.say("mimi", LINES.shape);
        if (ctx.auto) { ctx.wait(700, function () { chooseShape(order.shape, null); }); }
      });
    }
    /* the order card's icing: a zigzag across the cookie in the order colour */
    function orderIcing() {
      var pts = [];
      for (var i = 0; i <= 8; i += 1) { pts.push([70 + i * 20, i % 2 ? 120 : 190]); }
      return [{ colour: order.colour, pts: pts }];
    }

    /* 2. shape */
    function chooseShape(id, from) {
      if (S.step !== "shape") { return false; }
      S.shape = id;
      var b = toolOf(shapeTools, id);
      b.classList.add("rw-used");
      draw({});
      var ck = itemEl.querySelector(".rw-ck-cookie");
      if (ck) { ctx.slideFrom(ck, from || ctx.rect(b), 600); }
      setStep("ice");
      ctx.wait(560, function () { if (ck) { ctx.land(ck); } ctx.sound.plop(); sc.mimiSmile(); });
      ctx.wait(850, function () {
        var defs = BAGS.map(function (c) { return { kind: "bag", id: c.id, label: c.name, file: "piping_" + c.id + ".png" }; })
          .concat(SWEETS.map(function (c) { return { kind: "sweet", id: c.id, label: c.name, file: c.file }; }));
        var all = sc.setTools(defs);
        bagTools = all.slice(0, 4);
        sweetTools = all.slice(4);
        bagTools.forEach(function (b) {
          ctx.drag(b, {
            enabled: function () { return S.step === "ice" || S.step === "decorate"; },
            zones: function () { return [{ el: zone, id: "cookie" }]; },
            onTap: function () { pickColour(b.dataset.id); },
            onDrop: function (z, pt) { pickColour(b.dataset.id); addDot(pt.x, pt.y); return true; }
          });
        });
        sweetTools.forEach(function (b) {
          ctx.drag(b, {
            enabled: function () { return S.step === "decorate" && S.sweets.length < 8; },
            zones: function () { return [{ el: zone, id: "cookie" }]; },
            onTap: function () { addSweet(b.dataset.id, null, null); },
            onDrop: function (z, pt, gr) { return addSweet(b.dataset.id, pt, gr); }
          });
        });
        states();
        sc.say("mimi", LINES.colour);
        ctx.hint(hintTarget);
        if (ctx.auto) { ctx.wait(600, autoIce); }
      });
      return true;
    }

    /* 3. icing */
    function pickColour(id) {
      if (!(S.step === "ice" || S.step === "decorate")) { return; }
      var first = !S.colour;
      S.colour = id;
      root.dataset.colour = id;
      pen.innerHTML = KIT.pic("piping_" + id + ".png", "");
      pen.hidden = false;
      penAt = null;
      placePen();
      ctx.popIn(pen);
      ctx.sound.pop();
      states();
      if (first) { sc.say("mimi", LINES.draw); }
      ctx.hint(hintTarget);
    }
    var penAt = null;   /* the pen tip's place in root px while drawing; null = resting beside the plate */
    function placePen() {
      if (!pen || !sc.L.item) { return; }
      var s = sc.L.cookieScale || 1;
      var w = Math.max(44, 110 * s);
      var h = w * 320 / 240;
      var sc0 = ctx.rect(sc.scene);
      var x;
      var y;
      if (penAt) {
        x = penAt.x - sc0.left - w * 0.5;
        y = penAt.y - sc0.top - h * 0.94;
      } else {
        /* resting: leaning on the plate's lower right, below the order card */
        x = sc.L.item.left + sc.L.item.width * 0.84 - w * 0.2;
        y = sc.L.item.top + sc.L.item.height * 0.5;
      }
      pen.style.cssText = "left:" + Math.round(x) + "px;top:" + Math.round(y) + "px;width:" + Math.round(w) + "px;height:" + Math.round(h) + "px";
      pen.classList.toggle("rw-ck-drawing", !!penAt);
    }
    function addAmount(n) {
      S.amount += n;
      root.dataset.icing = String(Math.min(100, Math.round(S.amount / ENOUGH * 100)));
      if (!S.lovely && S.amount >= ENOUGH) {
        S.lovely = true;
        ctx.wait(250, function () {
          sc.say("mimi", LINES.lovely, 1600);
          sc.mimiSmile();
          ctx.sound.pop();
          setStep("decorate");
          ctx.wait(1800, function () { if (!S.sweets.length && S.step === "decorate") { sc.say("mimi", LINES.sweets); } });
          if (ctx.auto) { ctx.wait(900, autoSweets); }
        });
      }
    }
    function addDot(x, y) {
      if (!S.colour || S.points >= MAX_POINTS) { return; }
      var c = toCookie(x, y);
      S.strokes.push({ colour: S.colour, pts: [c], dot: true });
      S.points += 1;
      var g = icingGroup();
      if (g) {
        g.insertAdjacentHTML("beforeend", icingMarkup(S.strokes[S.strokes.length - 1]));
        ctx.animate(g.lastChild, [{ transform: "scale(.4)", opacity: 0.4 }, { transform: "scale(1)", opacity: 1 }], { duration: 260, easing: "ease-out", fadeFrom: 0.4 });
      }
      ctx.sound.plop();
      addAmount(70);
    }
    var drawing = null;
    function strokeStart(x, y) {
      var c = toCookie(x, y);
      S.strokes.push({ colour: S.colour, pts: [c] });
      S.points += 1;
      var g = icingGroup();
      if (g) { g.insertAdjacentHTML("beforeend", icingMarkup(S.strokes[S.strokes.length - 1])); }
      drawing.stroke = S.strokes[S.strokes.length - 1];
      drawing.el = g ? g.lastChild : null;
      drawing.last = c;
    }
    function strokeMove(x, y) {
      if (S.points >= MAX_POINTS) { return; }
      var c = toCookie(x, y);
      var dd = Math.hypot(c[0] - drawing.last[0], c[1] - drawing.last[1]);
      if (dd < 3) { return; }
      drawing.stroke.pts.push(c);
      drawing.last = c;
      S.points += 1;
      if (drawing.el) {
        var d = strokeD(drawing.stroke.pts);
        Array.prototype.forEach.call(drawing.el.querySelectorAll("path"), function (pth) { pth.setAttribute("d", d); });
      }
      drawing.len += dd;
      if (drawing.len - drawing.sounded > 70) { drawing.sounded = drawing.len; ctx.sound.swish(); }
      addAmount(dd);
    }
    ctx.on(zone, "pointerdown", function (e) {
      if (!(S.step === "ice" || S.step === "decorate") || !S.colour) { return; }
      e.preventDefault();
      try { zone.setPointerCapture(e.pointerId); } catch (err) {}
      var r = ctx.root.getBoundingClientRect();
      drawing = { id: e.pointerId, x0: e.clientX, y0: e.clientY, moved: false, len: 0, sounded: 0 };
      penAt = { x: e.clientX - r.left, y: e.clientY - r.top };
      placePen();
    });
    ctx.on(zone, "pointermove", function (e) {
      if (!drawing || e.pointerId !== drawing.id) { return; }
      var r = ctx.root.getBoundingClientRect();
      var x = e.clientX - r.left;
      var y = e.clientY - r.top;
      if (!drawing.moved) {
        if (Math.hypot(e.clientX - drawing.x0, e.clientY - drawing.y0) < 6) { return; }
        drawing.moved = true;
        strokeStart(drawing.x0 - r.left, drawing.y0 - r.top);
      }
      strokeMove(x, y);
      penAt = { x: x, y: y };
      placePen();
    });
    function endDraw(e, cancelled) {
      if (!drawing || e.pointerId !== drawing.id) { return; }
      var was = drawing;
      drawing = null;
      penAt = null;
      placePen();
      var r = ctx.root.getBoundingClientRect();
      if (!was.moved && !cancelled) { addDot(was.x0 - r.left, was.y0 - r.top); }
    }
    ctx.on(zone, "pointerup", function (e) { endDraw(e, false); });
    ctx.on(zone, "pointercancel", function (e) { endDraw(e, true); });
    ctx.on(zone, "click", function (e) {
      if (e.detail !== 0) { return; }
      if ((S.step === "ice" || S.step === "decorate") && S.colour) {
        var b = ctx.rect(zone);
        addDot(b.left + b.width / 2, b.top + b.height / 2);
      }
    });
    function autoIce() {
      if (S.step !== "ice") { return; }
      pickColour(order.colour);
      var c = cookieRect(0, 0, 300, 300);
      drawing = { id: -1, moved: true, len: 0, sounded: 0 };
      strokeStart(c.left + c.width * 0.25, c.top + c.height * 0.45);
      var k = 0;
      ctx.loop(function () {
        k += 1;
        strokeMove(c.left + c.width * (0.25 + 0.5 * k / 40), c.top + c.height * (k % 8 < 4 ? 0.4 : 0.6));
        if (k >= 40) { drawing = null; addDot(c.left + c.width * 0.5, c.top + c.height * 0.3); return false; }
        return true;
      });
    }

    /* 4. sweets (8 places) */
    function addSweet(kind, pt, from) {
      if (S.step !== "decorate" || S.sweets.length >= 8) { return false; }
      var sh = SHAPES[S.shape];
      var used = S.sweets.map(function (x) { return x.spot; });
      var free = sh.spots.map(function (s, i) { return i; }).filter(function (i) { return used.indexOf(i) < 0; });
      if (pt) {
        var c = toCookie(pt.x, pt.y);
        free.sort(function (a, b) { return Math.hypot(sh.spots[a][0] - c[0], sh.spots[a][1] - c[1]) - Math.hypot(sh.spots[b][0] - c[0], sh.spots[b][1] - c[1]); });
      }
      var spot = free[0];
      S.sweets.push({ kind: kind, spot: spot });
      root.dataset.sweets = String(S.sweets.length);
      var at = sh.spots[spot];
      var file = SWEETS.filter(function (x) { return x.id === kind; })[0].file;
      if (from || !ctx.reduced) {
        sc.fly(KIT.pic(file, ""), from || ctx.rect(toolOf(sweetTools, kind)), cookieRect(at[0] - 39, at[1] - 39, 78, 78), 380);
      }
      ctx.wait(380, function () {
        draw({ newSweet: S.sweets.length - 1 });
        ctx.sound.plop();
      });
      sc.mimiSmile();
      if (S.sweets.length === 1) { ctx.wait(700, function () { sc.showBell(); ctx.hint(hintTarget); }); }
      if (S.sweets.length >= 8) {
        states();
        ctx.wait(500, function () { sc.say("mimi", LINES.full); });
        ctx.wait(2200, function () { if (S.step === "decorate") { sc.say("mimi", LINES.give); } });
      }
      return true;
    }
    function autoSweets() {
      [order.sweet, "hearts", "pearls"].forEach(function (k, j) { ctx.wait(j * 450, function () { addSweet(k, null, null); }); });
      ctx.wait(2000, ringBell);
      ctx.wait(2800, function () { serve(null); });
    }

    /* 5. serve */
    function ringBell() {
      if (S.step !== "decorate" || !S.sweets.length) { return; }
      ctx.sound.bell();
      ctx.land(sc.bell);
      pen.hidden = true;
      setStep("serve");
      sc.say("mimi", LINES.give);
    }
    ctx.onTap(sc.bell, ringBell);
    ctx.onTap(sc.friendHit, function () { if (S.step === "serve") { serve(null); } });
    /* in the serve step the cookie is dragged to the friend (the zone's ghost carries a copy of the cookie) */
    ctx.drag(zone, {
      enabled: function () { return S.step === "serve"; },
      zones: function () { return [{ el: sc.friendHit, id: "friend" }]; },
      onLift: function () { itemEl.classList.add("rw-ck-lifted"); },
      onHome: function () { itemEl.classList.remove("rw-ck-lifted"); },
      onTap: function () { ctx.land(itemEl.querySelector(".rw-ck-cookie") || itemEl); ctx.sound.plop(); },
      onDrop: function (z, pt, gr) { return serve(gr); }
    });
    ctx.on(zone, "pointerdown", function () {
      if (S.step !== "serve") { return; }
      var za = zone.querySelector(".rw-ck-zoneart");
      var z = ctx.rect(zone);
      var c = cookieRect(0, 0, 300, 300);
      za.innerHTML = itemSvg(S, { vb: { x: 0, y: 0, w: 300, h: 300 } });
      za.style.cssText = "left:" + Math.round(c.left - z.left) + "px;top:" + Math.round(c.top - z.top) + "px;width:" + Math.round(c.width) + "px;height:" + Math.round(c.height) + "px";
    }, true);

    /* 6. the friend's reaction: a bite with a crunch */
    function mainColour() {
      var len = {};
      S.strokes.forEach(function (s) {
        var l = s.dot ? 70 : 0;
        for (var i = 1; i < s.pts.length; i += 1) { l += Math.hypot(s.pts[i][0] - s.pts[i - 1][0], s.pts[i][1] - s.pts[i - 1][1]); }
        len[s.colour] = (len[s.colour] || 0) + l;
      });
      return Object.keys(len).sort(function (a, b) { return len[b] - len[a]; })[0] || null;
    }
    /* the bite: three overlapping circles at the cookie's edge nearest its top right */
    function biteCircles() {
      var sv = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      sv.style.cssText = "position:absolute;width:0;height:0;visibility:hidden";
      var pth = document.createElementNS("http://www.w3.org/2000/svg", "path");
      pth.setAttribute("d", SHAPES[S.shape].d);
      sv.appendChild(pth);
      root.appendChild(sv);
      var best = [230, 60];
      try {
        var total = pth.getTotalLength();
        var bd = Infinity;
        for (var i = 0; i < 120; i += 1) {
          var q = pth.getPointAtLength(total * i / 120);
          var d = Math.hypot(q.x - 300, q.y - 20);
          if (d < bd) { bd = d; best = [q.x, q.y]; }
        }
      } catch (e) {}
      root.removeChild(sv);
      var cx = best[0] + (best[0] - 150) * 0.04;
      var cy = best[1] + (best[1] - 150) * 0.04;
      return '<circle cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="30"/><circle cx="' + (cx - 30).toFixed(1) + '" cy="' + (cy + 8).toFixed(1) + '" r="24"/>' +
        '<circle cx="' + (cx + 6).toFixed(1) + '" cy="' + (cy + 34).toFixed(1) + '" r="24"/>';
    }
    function serve(fromRect) {
      if (S.served || !S.sweets.length || !(S.step === "decorate" || S.step === "serve")) { return false; }
      S.served = true;
      ctx.sound.bell();
      setStep("react");
      pen.hidden = true;
      var match = S.shape === order.shape && mainColour() === order.colour && S.sweets.some(function (x) { return x.kind === order.sweet; });
      root.dataset.match = match ? "yes" : "no";
      var from = fromRect || cookieRect(0, 0, 300, 300);
      var bites = biteCircles();
      var cookieVb = { vb: { x: -4, y: -4, w: 308, h: 308 } };
      itemEl.innerHTML = itemSvg({ shape: null, strokes: [], sweets: [] }, { plate: true });
      sc.itemHidden = true;
      sc.toolState(bagTools.concat(sweetTools), "rw-spent");
      sc.react({
        from: from, held: itemSvg(S, cookieVb), sticker: itemSvg(S, { vb: cookieVb.vb, bite: bites }), first: LINES.crunch, match: match, finish: finish,
        onSip: function (heldEl) {
          var g = heldEl.querySelector(".rw-ck-bites");
          if (g) {
            g.innerHTML = bites.replace(/<circle /g, '<circle fill="#000" ');
          }
          ctx.sound.crunch();
          ctx.wait(260, function () { ctx.sound.crunch(); });
          crumbs(heldEl);
        }
      });
      return true;
    }
    function crumbs(heldEl) {
      if (ctx.reduced) { return; }
      var r = ctx.rect(heldEl);
      for (var i = 0; i < 5; i += 1) {
        var c = document.createElement("div");
        c.className = "rw-ck-crumb";
        var s = Math.max(6, Math.round(r.width * 0.06));
        c.style.cssText = "left:" + Math.round(r.left + r.width * (0.55 + i * 0.08)) + "px;top:" + Math.round(r.top + r.height * 0.25) + "px;width:" + s + "px;height:" + Math.round(s * 0.8) + "px";
        ctx.layer.appendChild(c);
        ctx.animate(c, [{ transform: "translate(0,0)", opacity: 1 }, { transform: "translate(" + (i * 6 - 10) + "px," + Math.round(r.height * 0.7) + "px)", opacity: 0 }],
          { duration: 900 + i * 90, easing: "ease-in", fill: "forwards" });
        (function (el) { ctx.wait(1100 + i * 90, function () { if (el.parentNode) { el.parentNode.removeChild(el); } }); })(c);
      }
    }

    sc.layout();
    ctx.on(window, "resize", sc.layout);
    KIT.load(FILES).then(function () {
      if (ctx.isClosed()) { return; }
      sc.refreshArt();
      draw({});
      sc.layout();
      root.dataset.art = "ready";
      root.classList.add("rw-cs-on");
      begin();
    });
  }

  if (!window.RewardGames || !window.RewardGames.register) { throw new Error("cafe_cookie.js needs reward_core.js loaded first"); }
  window.RewardGames.register("cafe", { name: "cookie", label: "Mimi's Cookies", start: start });
  window.RewardGames.cookieLines = function () { return Object.keys(LINES).map(function (k) { return LINES[k]; }); };
})();
