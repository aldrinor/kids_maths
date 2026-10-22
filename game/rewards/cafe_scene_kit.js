/* cafe_scene_kit.js - the shared cafe scene for Marie's extra reward games (Kids Maths):
 * "Mimi's Ice Cream" (cafe_ice_cream.js) and "Mimi's Cookies" (cafe_cookie.js).
 * It builds the same room as "Mimi's Hot Chocolate" (it reuses that game's rw-hc-* CSS and its pictures in
 * art/cafe/): the cafe background, Mimi on the left, a friend on the right, the counter, a picture order card,
 * a speech bubble, the bell, and the wooden shelf of tools at the bottom (or on the right on a phone held sideways).
 * The game draws its own thing in the middle ("the item") and lays it out in o.onLayout(L).
 *
 * window.RewardKit.cafeScene
 *   .load(files) -> Promise    loads the listed PNGs of art/cafe/ that manifest.json lists (5 s cap); never rejects
 *   .url(file)  -> url | null  a loaded picture
 *   .pic(file, fallbackHtml)   an <img class="rw-pic"> of a loaded picture, else fallbackHtml
 *   .crPath(points)            a closed smooth path (Catmull-Rom) through [[x, y], ...], like tools/draw_cafe_art.py
 *   .friendFor(n)              the friend id for game turn n ("melody" | "purin" | "kuromi" | "cinna")
 *   .make(ctx, o) -> scene     o = { cls, label, friend, orderAspect, heldBox: {left, top, width, height} (% of the friend),
 *                                   onLayout(L) (sets L.item = the item box in scene px), shelfLabel }
 * scene: .root .scene .centre .shelf .bell .friendHit .L (layout)
 *        .setMimi(pose) stand | smile | wave | five     .mimiSmile()     .setFriend(pose) stand | walk | sip | cheer | wave
 *        .say(who "mimi" | "friend", text, ms)          .setTools(defs) -> buttons   .toolState(buttons, "rw-now" | "rw-wait" | "rw-spent")
 *        .arrive(helloLine, orderHtml, orderLabel, then)    the friend walks in, shows the order card and says hello
 *        .showBell()  .want(on)  .fly(html, fromRect, toRect, ms) -> Promise
 *        .react({ from, held, sticker, first, match, onSip, finish })   the shared ending (see below)
 *        .layout()
 * The ending, after the child serves: the friend takes the item (sip pose), says the first line, then cheers;
 * Mimi gives a high five; three hearts rise; "Just like my picture!" when the order was matched, then
 * "Thank you, Mimi!"; the Done button springs up on the shelf; the friend waves "Bye bye!" and walks out;
 * a sticker of the item stays on the counter.
 */
(function () {
  "use strict";

  var FRIENDS = ["melody", "purin", "kuromi", "cinna"];
  var FRIEND_FILE = { melody: "bella", purin: "momo", kuromi: "lulu", cinna: "puff" };
  var FRIEND_POSES = ["stand", "walk", "sip", "cheer", "wave"];
  var MIMI_FILE = { stand: "mimi_stand.png", smile: "mimi_smile.png", wave: "mimi_wave.png", five: "mimi_high_five.png" };
  var BASE_FILES = ["cafe_background.png", "bell.png", "heart.png"].concat(Object.keys(MIMI_FILE).map(function (k) { return MIMI_FILE[k]; }));
  Object.keys(FRIEND_FILE).forEach(function (id) {
    FRIEND_POSES.forEach(function (p) { BASE_FILES.push("friend_" + FRIEND_FILE[id] + "_" + p + ".png"); });
  });
  var LINES = { match: "Just like my picture!", thanks: "Thank you, Mimi!", bye: "Bye bye!" };

  var ART_BASE = (function () {
    try { return new URL("art/cafe/", document.currentScript.src).href; } catch (e) { return "rewards/art/cafe/"; }
  })();
  var manifestP = null;
  var ready = {};
  var loading = {};
  function manifest() {
    if (!manifestP) {
      manifestP = !window.fetch ? Promise.resolve([]) :
        fetch(ART_BASE + "manifest.json").then(function (r) { return r.ok ? r.json() : { files: [] }; })
          .then(function (m) { return (m && m.files) || []; }).catch(function () { return []; });
    }
    return manifestP;
  }
  function loadOne(file) {
    if (!loading[file]) {
      loading[file] = new Promise(function (resolve) {
        var img = new Image();
        img.onload = function () { ready[file] = ART_BASE + file; resolve(); };
        img.onerror = function () { resolve(); };
        img.src = ART_BASE + file;
      });
    }
    return loading[file];
  }
  function load(files) {
    var all = BASE_FILES.concat(files || []);
    return new Promise(function (resolve) {
      setTimeout(resolve, 5000);
      manifest().then(function (have) {
        return Promise.all(all.filter(function (f) { return have.indexOf(f) >= 0; }).map(loadOne));
      }).then(resolve, resolve);
    });
  }
  load([]);
  function url(file) { return ready[file] || null; }
  function pic(file, fallback) {
    var u = url(file);
    return u ? '<img class="rw-pic" alt="" draggable="false" src="' + u + '">' : (fallback || "");
  }
  function f1(v) { return (Math.round(v * 10) / 10).toString(); }
  function crPath(pts) {
    var n = pts.length;
    var d = "M" + f1(pts[0][0]) + " " + f1(pts[0][1]);
    for (var i = 0; i < n; i += 1) {
      var p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
      d += " C" + f1(p1[0] + (p2[0] - p0[0]) / 6) + " " + f1(p1[1] + (p2[1] - p0[1]) / 6) + " " +
        f1(p2[0] - (p3[0] - p1[0]) / 6) + " " + f1(p2[1] - (p3[1] - p1[1]) / 6) + " " + f1(p2[0]) + " " + f1(p2[1]);
    }
    return d + " Z";
  }

  /* ------------------------------------------------------------------ the scene */
  function make(ctx, o) {
    var K = window.KittyChars;
    if (K && K.injectCss) { K.injectCss(); }
    var root = ctx.root;
    root.classList.add("rw-hc", "rw-cs", o.cls);
    var friendId = o.friend || FRIENDS[0];
    var friendName = (K && K.names && K.names[friendId]) || "Friend";
    root.innerHTML =
      '<div class="rw-hc-room" aria-hidden="true"></div>' +
      '<div class="rw-scene rw-cs-scene">' +
      '<div class="rw-char rw-cs-mimi"></div>' +
      '<div class="rw-char rw-hc-friend"><div class="rw-hc-fwalk"><div class="rw-hc-fart"></div><div class="rw-hc-held rw-cs-held" hidden></div></div></div>' +
      '<div class="rw-hc-counter" aria-hidden="true"><div class="rw-hc-top"></div><div class="rw-hc-front"><i></i><i></i><i></i><i></i></div></div>' +
      '<div class="rw-cs-centre"></div>' +
      '<div class="rw-hc-sticker rw-cs-sticker" hidden aria-hidden="true"></div>' +
      '<button type="button" class="rw-hc-bell rw-cs-bell" hidden aria-label="Ring the bell"></button>' +
      '<button type="button" class="rw-hc-friendhit" aria-label="' + friendName + '" disabled></button>' +
      '<div class="rw-hc-order" hidden role="img"></div>' +
      '<div class="rw-hc-bubble" hidden data-rg-fit></div>' +
      "</div>" +
      '<div class="rw-hc-shelf rw-cs-shelf" role="group" aria-label="' + (o.shelfLabel || "Things to use") + '"></div>';
    var q = function (s) { return root.querySelector(s); };
    var sc = {
      root: root, scene: q(".rw-cs-scene"), centre: q(".rw-cs-centre"), shelf: q(".rw-cs-shelf"), bell: q(".rw-cs-bell"),
      friendHit: q(".rw-hc-friendhit"), friendId: friendId, friendName: friendName, L: {}, tools: [], doneBtn: null
    };
    var room = q(".rw-hc-room");
    var mimi = q(".rw-cs-mimi");
    var friend = q(".rw-hc-friend");
    var fwalk = q(".rw-hc-fwalk");
    var fart = q(".rw-hc-fart");
    var held = q(".rw-cs-held");
    var counter = q(".rw-hc-counter");
    var sticker = q(".rw-cs-sticker");
    var orderEl = q(".rw-hc-order");
    var bubble = q(".rw-hc-bubble");
    var L = sc.L;
    sc.held = held;
    sc.sticker = sticker;
    sc.orderEl = orderEl;

    /* ---- art (called again once the pictures are loaded) ---- */
    sc.refreshArt = function () {
      room.innerHTML = pic("cafe_background.png", "");
      sc.bell.innerHTML = pic("bell.png", '<svg viewBox="0 0 120 112" class="rw-art"><path d="M20 84 C20 44 100 44 100 84 Z" fill="#f2c95c" stroke="#3b2a33" stroke-width="4"/><rect x="12" y="84" width="96" height="16" rx="8" fill="#ee8ba3" stroke="#3b2a33" stroke-width="4"/></svg>');
      mimiPose = "";
      sc.setMimi(lastMimi);
      sc.setFriend(lastFriend);
    };

    /* ---- characters ---- */
    var mimiPose = "";
    var lastMimi = "stand";
    var lastFriend = "stand";
    sc.setMimi = function (pose) {
      lastMimi = pose;
      if (pose === mimiPose) { return; }
      mimiPose = pose;
      var kp = { five: "five_r", smile: "stand" }[pose] || pose;
      mimi.innerHTML = pic(MIMI_FILE[pose], K ? K.full("kitty", kp, pose === "smile" || pose === "five" ? { eyes: "happy" } : undefined) : "");
    };
    var smileN = 0;
    sc.mimiSmile = function () {
      sc.setMimi("smile");
      smileN += 1;
      var me = smileN;
      ctx.wait(1100, function () { if (me === smileN && !sc.ending) { sc.setMimi("stand"); } });
    };
    sc.setFriend = function (pose) {
      lastFriend = pose;
      var kp = { sip: "eat", cheer: "happy" }[pose] || pose;
      fart.innerHTML = pic("friend_" + FRIEND_FILE[friendId] + "_" + pose + ".png",
        K ? K.full(friendId, kp, pose === "sip" ? { eyes: "closed" } : pose === "cheer" ? { eyes: "happy" } : undefined) : "");
    };

    /* ---- shelf of tools: only the tools of the current step(s) are on it ---- */
    sc.setTools = function (defs) {
      sc.shelf.innerHTML = "";
      sc.tools = defs.map(function (d) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "rw-tool rw-wait";
        b.dataset.tool = d.kind;
        b.dataset.id = d.id;
        b.setAttribute("aria-label", d.label);
        b.innerHTML = '<span class="rw-tool-pad"></span><span class="rw-art">' + pic(d.file, d.fallback || "") + "</span>";
        sc.shelf.appendChild(b);
        return b;
      });
      layoutShelf();
      sc.tools.forEach(function (b, i) {
        ctx.animate(b, [{ opacity: 0, transform: "translateY(24px) scale(.8)" }, { opacity: 1, transform: "translateY(0) scale(1)" }],
          { duration: 420, delay: i * 50, easing: ctx.spring ? ctx.spring.curve : "ease-out", fadeFrom: 0 });
      });
      return sc.tools;
    };
    sc.toolState = function (list, cls) {
      list.forEach(function (b) {
        b.classList.remove("rw-now", "rw-wait", "rw-spent");
        b.classList.add(cls);
        b.setAttribute("aria-disabled", cls === "rw-now" ? "false" : "true");
      });
    };
    function layoutShelf() {
      var sh = L.sh;
      if (!sh) { return; }
      var n = Math.max(1, sc.tools.length);
      var pad = 10;
      var best = { s: 0, cols: n, rows: 1 };
      for (var cols = 1; cols <= n; cols += 1) {
        var rows = Math.ceil(n / cols);
        var s = Math.min((sh.w - pad * 2) / cols, (sh.h - pad * 2) / rows, 150);
        if (s > best.s + 0.5) { best = { s: s, cols: cols, rows: rows }; }
      }
      sc.shelf.style.setProperty("--rw-item", Math.floor(best.s) + "px");
      sc.shelf.style.setProperty("--rw-cols", best.cols);
      sc.shelf.style.setProperty("--rw-row", Math.floor((sh.h - pad * 2) / best.rows) + "px");
      L.toolSize = Math.floor(best.s);
    }

    /* ---- layout: everything in px from the root size (the same proportions as Mimi's Hot Chocolate) ---- */
    sc.layout = function () {
      var W = root.clientWidth;
      var H = root.clientHeight;
      if (W < 10 || H < 10) { return; }
      var mode = (W / H < 0.85 && W < 640) ? "tall" : (H < 520 && W > H ? "side" : "wide");
      root.dataset.layout = mode;
      var scr;
      var sh;
      if (mode === "tall") {
        scr = { x: 0, y: 0, w: W, h: Math.round(H * 0.55) };
        sh = { x: 0, y: scr.h, w: W, h: H - scr.h };
      } else if (mode === "side") {
        scr = { x: 0, y: 0, w: Math.round(W * 0.62), h: H };
        sh = { x: scr.w, y: 0, w: W - scr.w, h: H };
      } else {
        var shH = Math.round(Math.max(150, H * 0.28));
        var sw = Math.min(W, 1100);
        scr = { x: Math.round((W - sw) / 2), y: 0, w: sw, h: H - shH };
        sh = { x: 0, y: H - shH, w: W, h: shH };
      }
      L.mode = mode; L.W = W; L.H = H; L.sc = scr; L.sh = sh;
      sc.scene.style.cssText = "left:" + scr.x + "px;top:" + scr.y + "px;width:" + scr.w + "px;height:" + scr.h + "px";
      sc.shelf.style.cssText = "left:" + sh.x + "px;top:" + sh.y + "px;width:" + sh.w + "px;height:" + sh.h + "px";
      layoutShelf();
      var w = scr.w;
      var h = scr.h;
      var topY = Math.round(h * (mode === "tall" ? 0.72 : 0.76));
      var slab = Math.max(12, Math.round(h * 0.045));
      L.topY = topY; L.slab = slab; L.w = w; L.h = h;
      var cLeft = mode === "wide" ? -scr.x : 0;
      counter.style.cssText = "left:" + cLeft + "px;top:" + topY + "px;width:" + (mode === "wide" ? W : w) + "px;height:" + (h - topY) + "px;--slab:" + slab + "px";
      var ch = Math.round(Math.min(h * (mode === "tall" ? 0.64 : 0.7), w * (mode === "tall" ? 0.5 : 0.36) * 1.3));
      var cwid = Math.round(ch * 200 / 260);
      var charTop = Math.round(topY + slab * 0.4 - ch * 0.76);
      var mx = Math.round(w * (mode === "tall" ? 0.2 : 0.17));
      var fx = Math.round(w * (mode === "tall" ? 0.8 : 0.83));
      L.ch = ch; L.cwid = cwid; L.charTop = charTop; L.mx = mx; L.fx = fx;
      mimi.style.cssText = "left:" + (mx - cwid / 2) + "px;top:" + charTop + "px;width:" + cwid + "px;height:" + ch + "px";
      friend.style.left = (fx - cwid / 2) + "px";
      friend.style.top = charTop + "px";
      friend.style.width = cwid + "px";
      friend.style.height = ch + "px";
      var hitW = Math.max(72, Math.round(cwid * 0.8));
      var hitH = Math.max(72, Math.round(topY - charTop));
      sc.friendHit.style.cssText = "left:" + Math.round(fx - hitW / 2) + "px;top:" + Math.max(0, topY - hitH) + "px;width:" + hitW + "px;height:" + hitH + "px";
      var hb = o.heldBox || { left: 34, top: 33, width: 46, height: 44 };
      held.style.left = hb.left + "%"; held.style.top = hb.top + "%"; held.style.width = hb.width + "%"; held.style.height = hb.height + "%";

      /* the game's item in the middle */
      L.item = null;
      if (o.onLayout) { o.onLayout(L); }
      var it = L.item || { left: w * 0.4, top: topY - h * 0.3, width: w * 0.2, height: h * 0.3 };
      sticker.style.cssText = "left:" + Math.round(it.left) + "px;top:" + Math.round(it.top) + "px;width:" + Math.round(it.width) + "px;height:" + Math.round(it.height) + "px";

      /* the bell: on the counter between the item and the friend */
      var bs = Math.max(72, Math.round(Math.min(h * 0.2, w * (mode === "tall" ? 0.22 : 0.13))));
      var bx = Math.round(Math.min(Math.max(it.left + it.width + bs * 0.45, (it.left + it.width + fx - cwid * 0.3) / 2), w - bs * 0.55));
      sc.bell.style.cssText = "left:" + Math.round(bx - bs / 2) + "px;top:" + Math.round(topY + slab * 0.6 - bs * 0.93) + "px;width:" + bs + "px;height:" + bs + "px";

      /* the order card: above the friend's head when there is room, else beside it */
      var oc = Math.round(Math.max(96, Math.min(h * 0.3, w * 0.2, 170)));
      var asp = o.orderAspect || 1;
      var ow = Math.round(asp >= 1 ? oc : Math.max(78, oc * 1.3 * asp));
      var oh = Math.round(asp >= 1 ? oc / asp : Math.min(oc * 1.3, h * 0.42));
      var headTop = charTop + ch * 0.02;
      var ox;
      var oy;
      if (headTop - oh - 18 >= 4) {
        ox = Math.min(w - ow - 6, fx - ow / 2 - cwid * 0.12);
        oy = Math.max(6, headTop - oh - 18);
        orderEl.dataset.tail = "down";
      } else {
        ox = Math.round(fx - cwid * 0.42 - ow - 10);
        oy = Math.round(Math.max(6, h * 0.05));
        orderEl.dataset.tail = "right";
      }
      orderEl.style.cssText = "left:" + Math.round(ox) + "px;top:" + Math.round(oy) + "px;width:" + ow + "px;height:" + oh + "px";
      placeBubble();
      if (sc.doneBtn) { placeDone(); }
    };

    /* ---- the speech bubble ---- */
    var bubbleWho = null;
    var bubbleN = 0;
    sc.say = function (who, text, ms) {
      ctx.speak(text);
      bubbleWho = who;
      bubble.textContent = text;
      bubble.className = "rw-hc-bubble rw-from-" + who;
      bubble.hidden = false;
      placeBubble();
      ctx.animate(bubble, [{ opacity: 0, transform: "scale(.85)" }, { opacity: 1, transform: "scale(1)" }], { duration: 380, easing: ctx.spring ? ctx.spring.curve : "ease-out", fadeFrom: 0 });
      bubbleN += 1;
      var me = bubbleN;
      ctx.wait(ms || 2600, function () { if (me === bubbleN) { bubble.hidden = true; } });
    };
    function placeBubble() {
      if (bubble.hidden || !L.sc) { return; }
      var w = L.sc.w;
      var h = L.sc.h;
      bubble.style.maxWidth = Math.round(Math.min(w * 0.46, 340)) + "px";
      var bw = bubble.offsetWidth;
      var bh = bubble.offsetHeight;
      var avoid = [];
      function box(el) { return { l: parseFloat(el.style.left), t: parseFloat(el.style.top), r: parseFloat(el.style.left) + parseFloat(el.style.width), b: parseFloat(el.style.top) + parseFloat(el.style.height) }; }
      if (!orderEl.hidden) { avoid.push(box(orderEl)); }
      if (L.item && !sc.itemHidden) { avoid.push({ l: L.item.left + L.item.width * 0.12, t: L.item.top + L.item.height * 0.04, r: L.item.left + L.item.width * 0.88, b: L.item.top + L.item.height }); }
      var head = L.charTop + L.ch * 0.02;
      var cands = bubbleWho === "friend" ?
        [[L.fx - bw / 2, head - bh - 8], [L.fx - L.cwid * 0.42 - bw, head + L.ch * 0.06], [L.fx - bw + L.cwid * 0.1, head - bh - 8], [L.fx - L.cwid * 0.5 - bw, 6], [w - bw - 6, 6]] :
        [[L.mx - bw / 2, head - bh - 8], [L.mx + L.cwid * 0.42, head + L.ch * 0.06], [L.mx + L.cwid * 0.3, head - bh * 0.6], [L.mx - L.cwid * 0.2, 6], [6, 6]];
      var pickAt = null;
      for (var i = 0; i < cands.length && !pickAt; i += 1) {
        var x = Math.max(6, Math.min(w - bw - 6, cands[i][0]));
        var y = Math.max(6, Math.min(h - bh - 6, cands[i][1]));
        var hit = avoid.some(function (a) { return x < a.r && x + bw > a.l && y < a.b && y + bh > a.t; });
        if (!hit && cands[i][1] >= 4) { pickAt = [x, y]; }
      }
      if (!pickAt) { pickAt = [Math.max(6, Math.min(w - bw - 6, cands[1][0])), Math.max(6, Math.min(h - bh - 6, cands[1][1]))]; }
      bubble.style.left = Math.round(pickAt[0]) + "px";
      bubble.style.top = Math.round(pickAt[1]) + "px";
    }

    /* ---- the friend walks in and orders ---- */
    sc.arrive = function (hello, orderHtml, orderLabel, then) {
      if (!L.sc) { sc.layout(); }
      if (!L.sc) { L.sc = { w: 0, h: 0 }; L.fx = 0; L.cwid = 0; }
      sc.setMimi("wave");
      sc.setFriend("walk");
      orderEl.innerHTML = '<div class="rw-hc-card">' + orderHtml + "</div>";
      orderEl.setAttribute("aria-label", orderLabel);
      var off = L.sc.w - (L.fx - L.cwid / 2) + 20;
      fwalk.style.transform = "translateX(" + off + "px)";
      ctx.wait(60, function () {
        fwalk.style.transition = ctx.reduced ? "opacity " + ctx.dur(300) + "ms" : "transform " + ctx.dur(1500) + "ms cubic-bezier(.3,.6,.35,1)";
        if (ctx.reduced) { fwalk.style.opacity = "0"; void fwalk.offsetWidth; fwalk.style.opacity = "1"; }
        fwalk.style.transform = "translateX(0)";
      });
      ctx.wait(1600, function () {
        fwalk.style.transition = "";
        sc.setFriend("stand");
        sc.setMimi("stand");
        orderEl.hidden = false;
        ctx.popIn(orderEl);
        ctx.sound.pop();
        sc.say("friend", hello, 3200);
      });
      ctx.wait(3000, then);
    };

    sc.showBell = function () {
      if (!sc.bell.hidden) { return; }
      sc.bell.hidden = false;
      ctx.popIn(sc.bell);
      ctx.sound.pop();
    };
    sc.want = function (on) {
      friend.classList.toggle("rw-want", !!on);
      sc.friendHit.disabled = !on;
    };
    /* a copy of html flies from one box to another (boxes inside root); resolves on arrival */
    sc.fly = function (html, from, to, ms) {
      var el = document.createElement("div");
      el.className = "rw-cs-fly";
      el.style.cssText = "left:" + Math.round(to.left) + "px;top:" + Math.round(to.top) + "px;width:" + Math.round(to.width) + "px;height:" + Math.round(to.height) + "px";
      el.innerHTML = html;
      ctx.layer.appendChild(el);
      var dx = (from.left + from.width / 2) - (to.left + to.width / 2);
      var dy = (from.top + from.height / 2) - (to.top + to.height / 2);
      var s = to.width > 0 ? Math.max(0.3, from.width / to.width) : 1;
      ctx.animate(el, [
        { transform: "translate(" + dx + "px," + dy + "px) scale(" + s + ")", opacity: 0.9 },
        { transform: "translate(" + dx * 0.4 + "px," + (dy * 0.4 - Math.abs(dx) * 0.12 - 30) + "px) scale(" + (s + 1) / 2 + ")", opacity: 1, offset: 0.55 },
        { transform: "translate(0,0) scale(1)", opacity: 1 }
      ], { duration: ms || 520, easing: "ease-in-out", fill: "forwards", fadeFrom: 0.2 });
      return ctx.wait(ms || 520, function () { if (el.parentNode) { el.parentNode.removeChild(el); } });
    };

    /* ---- the shared ending ---- */
    function hearts() {
      var r = ctx.rect(friend);
      for (var i = 0; i < 3; i += 1) {
        (function (i) {
          ctx.wait(i * 260, function () {
            var h = document.createElement("div");
            h.className = "rw-heart";
            var s = Math.round(Math.max(30, L.ch * 0.16));
            h.style.cssText = "left:" + Math.round(r.left + r.width * (0.3 + i * 0.2) - s / 2) + "px;top:" + Math.round(r.top + r.height * 0.12) + "px;width:" + s + "px;height:" + s + "px";
            h.innerHTML = pic("heart.png", '<svg viewBox="-20 -20 40 40"><path d="M0 13 C-19 0 -16 -15 -7 -15 C-3 -15 0 -11 0 -11 C0 -11 3 -15 7 -15 C16 -15 19 0 0 13 Z" fill="#ee7f9c" stroke="#3b2a33" stroke-width="2.6"/></svg>');
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
    function placeDone() {
      var b = sc.doneBtn;
      if (!b || !L.sh) { return; }
      var sh = L.sh;
      var bw = Math.max(170, Math.min(260, sh.w * 0.6));
      var bh = Math.max(80, Math.min(110, sh.h * 0.4));
      b.style.cssText = "left:" + Math.round(sh.x + sh.w / 2 - bw / 2) + "px;top:" + Math.round(sh.y + sh.h / 2 - bh / 2) + "px;width:" + Math.round(bw) + "px;height:" + Math.round(bh) + "px";
      sc.shelf.classList.add("rw-rest");
    }
    sc.react = function (r) {
      sc.ending = true;
      ctx.hint(null);
      sc.bell.hidden = true;
      sc.want(false);
      orderEl.hidden = true;
      var from = r.from;
      sticker.innerHTML = '<div class="rw-hc-stick">' + r.sticker + "</div>";
      held.innerHTML = r.held;
      held.hidden = false;
      sc.setFriend("sip");
      ctx.slideFrom(held, from, 600);
      ctx.wait(650, function () {
        sc.say("friend", r.first, 1600);
        if (r.onSip) { r.onSip(held); }
      });
      ctx.wait(2100, function () {
        if (o.heldDownX) { held.style.setProperty("--downx", o.heldDownX); }
        held.classList.add("rw-down");
        held.style.setProperty("--down", Math.round(L.topY + L.ch * 0.035 - L.charTop - L.ch * (parseFloat(held.style.top) / 100) - L.ch * (parseFloat(held.style.height) / 100) * 0.9) + "px");
        sc.setFriend("cheer");
        sc.setMimi("five");
        hearts();
        sc.say("friend", r.match ? LINES.match : LINES.thanks, 1700);
      });
      var t = r.match ? 3700 : 3500;
      if (r.match) { ctx.wait(t, function () { sc.say("friend", LINES.thanks, 1500); }); }
      ctx.wait(t + (r.match ? 800 : 400), function () {
        root.dataset.step = "end";
        sc.setMimi("wave");
        sc.doneBtn = ctx.doneButton(r.finish, root);
        placeDone();
      });
      ctx.wait(t + 1400, function () {
        sc.setFriend("wave");
        sc.say("friend", LINES.bye, 1600);
      });
      ctx.wait(t + 2800, function () {
        held.hidden = true;
        sc.setFriend("walk");
        fart.style.transform = "scaleX(-1)";
        sticker.hidden = false;
        ctx.popIn(sticker);
        ctx.sound.plop();
        var off = L.sc.w - (L.fx - L.cwid / 2) + 30;
        fwalk.style.transition = ctx.reduced ? "opacity " + ctx.dur(300) + "ms" : "transform " + ctx.dur(1600) + "ms cubic-bezier(.5,0,.7,.5)";
        if (ctx.reduced) { fwalk.style.opacity = "0"; } else { fwalk.style.transform = "translateX(" + off + "px)"; }
      });
      ctx.wait(t + 4500, function () { sc.setMimi("stand"); });
    };

    /* the root clips its content (overflow: hidden) but a touch can still scroll it a little: keep it at 0 */
    ctx.on(root, "scroll", function () { if (root.scrollLeft || root.scrollTop) { root.scrollLeft = 0; root.scrollTop = 0; } });
    sc.setMimi("stand");
    sc.setFriend("stand");
    return sc;
  }

  var kit = window.RewardKit = window.RewardKit || {};
  kit.cafeScene = {
    make: make, load: load, url: url, pic: pic, crPath: crPath, lines: LINES,
    friendFor: function (n) { return FRIENDS[((n % FRIENDS.length) + FRIENDS.length) % FRIENDS.length]; }
  };
})();
