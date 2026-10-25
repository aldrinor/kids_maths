/* castle_world.js - Kennedy's play world "Knight Castle World" (Kids Maths). Registers theme "castle" with world_core.js.
 *
 * He gets 5 minutes here after every 25 answers and spends the coins he earned. No reading anywhere: every button is a
 * big picture (80 px or more), prices are a coin and a number, and the knight speaks every hint.
 *   hub     5 big picture cards: the Castle, the Stable, the Training yard, the Wall (defence), and My Grounds (castle_grounds.js).
 *   castle  his castle grows over visits. Glowing spots show where a part can go; tap one, then pick a part from the
 *           picture tray (towers, keep, walls, gates with a drawbridge, flags, banners, a moat, gardens). A locked part
 *           shows its price: tapping it buys it when he has the coins (happy pop), else a soft shake and "Not yet".
 *           A bought part stays his: placing it again, or swapping a built part, is free.
 *   stable  the pony: brush off the mud, feed an apple, pat it, and ride a short loop (3 taps on the horseshoe).
 *           Adopt one pet with coins (a dog, a cat or a baby dragon), then pet it and feed it.
 *   yard    recruit up to 4 buddy knights with coins; they stand in the yard and wave. A straw dummy to bop with a pillow.
 *   wall    toot the horn and silly goblins walk slowly toward the castle wall. Tap one: he and every buddy toss pillows,
 *           the goblin says "Oops!" and runs away. More buddies, more pillows (each buddy bops one more goblin).
 *           He cannot lose: a goblin that reaches the wall sits down and falls asleep. A wave lasts about 30 to 40 s and
 *           ends with everyone cheering and 3 bonus coins (the first 3 waves of a visit pay).
 * Characters breathe and blink. Sounds come from RewardKit.sound (soft, silent when Web Audio is missing). No flashing.
 * Saved in wctx.data.castle: owned parts, placed parts by slot, pet, buddies, counters; wctx.data.bonus: the last bonus.
 * Test data on .cw-root: data-place, data-wave (idle | running | cheer), data-bopped, data-built, data-pet, data-buddies,
 * data-mud, data-ride, data-art ("ready" once the scene is built).
 * Art: game/world/art/castle/ (tools/draw_castle_world_art.py) and game/rewards/art/castle/ (tools/draw_castle_art.py).
 */
(function () {
  "use strict";

  var NEW_BASE = (function () {
    try { return new URL("art/castle/", document.currentScript.src).href; } catch (e) { return "world/art/castle/"; }
  })();
  var OLD_BASE = (function () {
    try { return new URL("../rewards/art/castle/", document.currentScript.src).href; } catch (e) { return "rewards/art/castle/"; }
  })();
  function NA(n) { return NEW_BASE + n + ".png"; }
  function OA(n) { return OLD_BASE + n + ".png"; }
  /* warm the picture cache as soon as the page loads, so the world opens with every picture ready */
  var preloaded = [];
  function preload() {
    ["go_back", "castle_plot", "defence_wall", "goblin_walk_a", "goblin_walk_b", "goblin_oops", "goblin_run", "goblin_sleepy", "goblin_wave",
      "pillow", "feather", "horn", "zzz", "dummy", "yard_background", "knight_wave", "knight_blink", "pony_blink", "bowl",
      "keep_stone", "walls_stone", "tower_round", "gate_wood", "moat_water", "buddy_leaf_idle", "buddy_leaf_wave"].forEach(function (n) {
      var i = new Image(); i.src = NA(n); preloaded.push(i);
    });
    ["path_far", "path_mid", "path_near", "stable_background", "knight_idle", "knight_cheer", "pony_stand", "pony_happy", "pony_eat",
      "brush", "apple_1", "go_horseshoe", "heart", "sparkle"].forEach(function (n) { var i = new Image(); i.src = OA(n); preloaded.push(i); });
  }

  /* ------------------------------------------------------------------ the castle: canvas 1000 x 1300, ground y 1050 */
  var PARTS = {
    keep_stone: { slot: "keep", price: 40, tip: 60, name: "a big keep" },
    keep_gold: { slot: "keep", price: 60, tip: 92, name: "a golden keep" },
    tower_round: { slot: "tower", price: 20, tip: 60, name: "a blue tower" },
    tower_square: { slot: "tower", price: 25, tip: 236, name: "a square tower" },
    tower_tall: { slot: "tower", price: 35, tip: 12, name: "a tall purple tower" },
    walls_stone: { slot: "walls", price: 15, name: "stone walls" },
    walls_windows: { slot: "walls", price: 20, name: "walls with windows" },
    gate_wood: { slot: "gate", price: 15, name: "a wooden gate" },
    gate_drawbridge: { slot: "gate", price: 30, name: "a drawbridge" },
    gate_gold: { slot: "gate", price: 40, name: "a golden gate" },
    flag_red: { slot: "flag", price: 5, name: "a red flag" },
    flag_blue: { slot: "flag", price: 5, name: "a blue flag" },
    flag_green: { slot: "flag", price: 5, name: "a green flag" },
    flag_gold: { slot: "flag", price: 5, name: "a gold flag" },
    banner_red: { slot: "banner", price: 8, name: "a red banner" },
    banner_blue: { slot: "banner", price: 8, name: "a blue banner" },
    banner_green: { slot: "banner", price: 8, name: "a green banner" },
    banner_gold: { slot: "banner", price: 8, name: "a gold banner" },
    moat_water: { slot: "moat", price: 25, name: "a moat" },
    moat_ducks: { slot: "moat", price: 35, name: "a moat with ducks" },
    garden_flowers: { slot: "garden", price: 8, name: "flowers" },
    garden_tree: { slot: "garden", price: 12, name: "an apple tree", old: "apple_tree" },
    garden_fountain: { slot: "garden", price: 25, name: "a fountain" }
  };
  /* box = [x, y, w, h] on the castle canvas; spot = where the glowing button sits; z = layer order */
  var SLOTS = [
    { id: "keep", kind: "keep", box: [350, 120, 300, 780], spot: [500, 400], z: 1 },
    { id: "walls", kind: "walls", box: [240, 540, 520, 510], spot: [500, 620], z: 2 },
    { id: "tower_l", kind: "tower", box: [50, 160, 240, 890], spot: [170, 430], z: 3 },
    { id: "tower_r", kind: "tower", box: [710, 160, 240, 890], spot: [830, 430], z: 3, mirror: true },
    { id: "banner_l", kind: "banner", box: [110, 640, 120, 210], spot: [170, 745], z: 4, needs: "tower_l" },
    { id: "banner_r", kind: "banner", box: [770, 640, 120, 210], spot: [830, 745], z: 4, needs: "tower_r" },
    { id: "gate", kind: "gate", box: [380, 700, 240, 350], spot: [500, 900], z: 5, needs: "walls" },
    { id: "flag_l", kind: "flag", on: "tower_l", x: 170, base: 160, z: 6, needs: "tower_l" },
    { id: "flag_k", kind: "flag", on: "keep", x: 500, base: 120, z: 6, needs: "keep" },
    { id: "flag_r", kind: "flag", on: "tower_r", x: 830, base: 160, z: 6, needs: "tower_r" },
    { id: "moat", kind: "moat", box: [120, 1035, 760, 220], spot: [500, 1160], z: 7 },
    { id: "garden_l", kind: "garden", box: [0, 1040, 230, 260], spot: [100, 1190], z: 9 },
    { id: "garden_r", kind: "garden", box: [770, 1040, 230, 260], spot: [900, 1190], z: 9, mirror: true }
  ];
  var BRIDGE_BOX = [390, 1040, 220, 170];
  var PLOT_BOX = [0, 960, 1000, 340];
  var KIND_WORD = { keep: "a keep", walls: "walls", tower: "a tower", banner: "a banner", gate: "a gate", flag: "a flag", moat: "a moat", garden: "a garden" };

  var PETS = { dog: { price: 30, food: "bone", name: "a puppy" }, cat: { price: 30, food: "fish", name: "a kitten" }, dragon: { price: 45, food: "berry", name: "a baby dragon" } };
  var BUDDIES = [
    { id: "leaf", price: 20, name: "Sir Leaf" },
    { id: "sun", price: 30, name: "Sir Sunny" },
    { id: "plum", price: 40, name: "Lady Plum" },
    { id: "sea", price: 50, name: "Sir Splash" }
  ];
  var BONUS = 3, PAID_WAVES = 3;

  var LINES = {
    hub: "Where shall we go?",
    grounds: "Build things for your castle! Tap a picture, then drag it where you like.",
    grounds_full: "Drag a thing to move it. Drop it in the bin to put it away. Tap it to see what it does!",
    placed: "Drag it where you like!",
    castle: "Tap a glowing spot to build your castle!",
    castle_done: "What a castle! Tap a part to change it.",
    pick: "Pick a part.",
    built: "Hooray! Look at my castle!",
    not_yet: "Not yet. More maths gives more coins!",
    stable: "Hello, pony! Brush, feed, or ride!",
    no_pet: "Tap the glowing spot to get a pet!",
    pick_pet: "Which pet would you like?",
    shiny: "So shiny!",
    yum: "Yum!",
    ride: "Tap the horseshoe to ride!",
    home: "Home again!",
    yard: "Tap a knight to make a buddy!",
    yard_full: "My buddies! Tap the dummy to practise!",
    wall: "Toot the horn to start!",
    goblins: "Silly goblins are coming! Tap them!",
    oops: "Oops!",
    cheer: "Hooray! We did it!",
    bonus: "Three bonus coins!"
  };

  var CSS = [
    ".cw-root{position:absolute;inset:0;overflow:hidden;font:700 22px/1.2 system-ui,sans-serif;color:#3b2a33;user-select:none;-webkit-user-select:none;touch-action:manipulation}",
    ".cw-root img{display:block;-webkit-user-drag:none;user-select:none;pointer-events:none}",
    ".cw-root button{font:inherit;color:inherit;background:none;border:0;padding:0;margin:0;cursor:pointer;-webkit-tap-highlight-color:transparent}",
    ".cw-scene{position:absolute;inset:0;overflow:hidden}",
    ".cw-bg{position:absolute;inset:0;background-size:cover;background-position:center bottom;background-repeat:no-repeat}",
    ".cw-home{position:absolute;z-index:40;top:max(8px,env(safe-area-inset-top));left:10px;width:84px;height:84px;border-radius:24px;background:#fff8e6 !important;border:3px solid #3b2a33 !important;box-shadow:0 4px 0 rgba(59,42,51,.25)}",
    ".cw-home img{width:70px;height:70px;margin:4px auto 0}",
    /* hub */
    ".cw-hub{position:absolute;left:12px;right:12px;top:96px;bottom:12px;display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr .8fr;gap:12px}",
    ".cw-card.wide{grid-column:1/-1}",
    ".cw-card{position:relative;overflow:hidden;border-radius:28px;border:4px solid #3b2a33 !important;box-shadow:0 6px 0 rgba(59,42,51,.22);background:#e7eef5 !important;min-width:84px;min-height:84px}",
    ".cw-card .cw-bg{border-radius:24px}",
    ".cw-card .cw-pic{position:absolute;bottom:4%;transform:translateX(-50%)}",
    ".cw-card:active{transform:translateY(3px)}",
    ".cw-mini{position:absolute;left:50%;bottom:0;height:96%;aspect-ratio:1000/1300;transform:translateX(-50%)}",
    /* castle */
    ".cw-cbox{position:absolute;left:50%;bottom:0;transform:translateX(-50%)}",
    ".cw-part{position:absolute;object-fit:contain;object-position:center bottom}",
    ".cw-ghosts{position:absolute;inset:0;opacity:.24;filter:grayscale(1) brightness(1.2);z-index:0}",
    ".cw-new{animation:cwdrop .7s cubic-bezier(.3,1.5,.5,1) both}",
    "@keyframes cwdrop{0%{opacity:0;translate:0 -6%;scale:.85}60%{opacity:1}100%{translate:0 0;scale:1}}",
    ".cw-lower{transform-origin:50% 0;animation:cwlower 1.6s ease-out both}",
    "@keyframes cwlower{0%{transform:scaleY(.05)}100%{transform:scaleY(1)}}",
    ".cw-root .cw-spot{position:absolute;width:88px;height:88px;margin:-44px 0 0 -44px;border-radius:50%;z-index:20}",
    ".cw-spot.empty::before{content:'';position:absolute;inset:-6px;border-radius:50%;background:radial-gradient(circle,rgba(255,246,200,.95) 0,rgba(255,224,120,.75) 45%,rgba(255,214,90,0) 70%);animation:cwglow 2.6s ease-in-out infinite}",
    ".cw-spot.empty::after{content:'';position:absolute;inset:22px;border-radius:50%;border:4px solid #3b2a33;background:#fff8e6 linear-gradient(#3b2a33,#3b2a33) center/26px 6px no-repeat;box-shadow:inset 0 0 0 0 #000}",
    ".cw-spot.empty i{position:absolute;left:50%;top:50%;margin:-13px 0 0 -3px;width:6px;height:26px;background:#3b2a33;border-radius:3px;z-index:1}",
    "@keyframes cwglow{0%,100%{opacity:.55;transform:scale(.94)}50%{opacity:1;transform:scale(1.05)}}",
    /* the picture tray */
    ".cw-dim{position:absolute;inset:0;z-index:50;background:rgba(59,42,51,.28)}",
    ".cw-tray{position:absolute;z-index:51;left:50%;bottom:12px;transform:translateX(-50%);width:max-content;max-width:calc(100% - 20px);box-sizing:border-box;background:#fff8e6;border:4px solid #3b2a33;border-radius:30px;padding:16px 12px 12px;display:flex;flex-wrap:wrap;justify-content:center;gap:10px;box-shadow:0 8px 0 rgba(59,42,51,.2)}",
    ".cw-tile{position:relative;width:clamp(84px,21vw,124px);height:clamp(108px,26vw,150px);border-radius:22px;border:3px solid #3b2a33 !important;background:#fff !important;display:flex;flex-direction:column;align-items:center;justify-content:space-between;padding:6px 4px 6px !important;box-sizing:border-box}",
    ".cw-tile img{flex:1;min-height:0;width:100%;object-fit:contain}",
    ".cw-tile.on{background:#e3f6dc !important;box-shadow:0 0 0 5px #8fcfb8}",
    ".cw-tile.locked img{opacity:.8}",
    ".cw-price{display:flex;align-items:center;gap:4px;background:#fff8e6;border:3px solid #3b2a33;border-radius:999px;padding:1px 9px 1px 3px;font:800 20px/1 system-ui,sans-serif}",
    ".cw-price i,.cw-coin{width:22px;height:22px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff3b0,#f2c14e 55%,#c9902a);border:2px solid #3b2a33;display:block;flex:none}",
    ".cw-price.poor{opacity:.55}",
    ".cw-x{position:absolute;top:-34px;left:-14px;width:84px;height:84px;border-radius:50%;background:#ffd3d8 !important;border:4px solid #3b2a33 !important}",
    ".cw-x::before,.cw-x::after{content:'';position:absolute;left:18px;top:36px;width:40px;height:7px;border-radius:4px;background:#3b2a33;transform:rotate(45deg)}",
    ".cw-x::after{transform:rotate(-45deg)}",
    ".cw-no{animation:cwno .5s ease}",
    "@keyframes cwno{20%{translate:-7px 0}45%{translate:7px 0}70%{translate:-4px 0}}",
    /* characters */
    ".cw-char{position:absolute;transform:translateX(-50%);min-width:84px;min-height:84px;display:flex;align-items:flex-end;justify-content:center}",
    ".cw-char>img{height:100%;width:auto;max-width:none}",
    ".cw-breathe{transform-origin:50% 100%;animation:cwbreathe 3.4s ease-in-out infinite}",
    "@keyframes cwbreathe{0%,100%{transform:scale(1,1)}50%{transform:scale(.992,1.022)}}",
    ".cw-char.wait>img{filter:grayscale(.75) brightness(1.08);opacity:.62}",
    ".cw-char .cw-price{position:absolute;left:50%;top:-8px;transform:translateX(-50%);z-index:2}",
    ".cw-fx{position:absolute;z-index:45;pointer-events:none}",
    /* stable */
    ".cw-pony{position:absolute;aspect-ratio:700/660;z-index:5}",
    ".cw-pony img{position:absolute;inset:0;width:100%;height:100%}",
    ".cw-mud{transition:opacity .6s ease}",
    ".cw-pet{position:absolute;aspect-ratio:420/400;z-index:6;min-width:84px}",
    ".cw-pet img{position:absolute;inset:0;width:100%;height:100%}",
    ".cw-bowl{position:absolute;z-index:6;aspect-ratio:220/120}",
    ".cw-root .cw-petspot{position:absolute;z-index:6;width:110px;height:110px;margin:0}",
    ".cw-petspot img{position:absolute;left:5px;bottom:8px;width:100px}",
    ".cw-tools{position:absolute;z-index:30;left:50%;bottom:12px;transform:translateX(-50%);display:flex;gap:10px}",
    ".cw-tool{width:88px;height:88px;border-radius:24px;background:#fff8e6 !important;border:3px solid #3b2a33 !important;box-shadow:0 4px 0 rgba(59,42,51,.25)}",
    ".cw-tool img{width:72px;height:72px;margin:auto;object-fit:contain}",
    ".cw-tool:active{transform:translateY(3px)}",
    /* ride */
    ".cw-layer{position:absolute;left:0;right:0;background-repeat:repeat-x;background-size:auto 100%}",
    ".cw-go{position:absolute;z-index:30;right:16px;bottom:16px;width:120px;height:120px;border-radius:30px;background:#fff8e6 !important;border:4px solid #3b2a33 !important;box-shadow:0 5px 0 rgba(59,42,51,.25)}",
    ".cw-go img{width:96px;height:96px;margin:auto}",
    ".cw-go.glow{animation:cwsoft 2.6s ease-in-out infinite}",
    "@keyframes cwsoft{0%,100%{box-shadow:0 5px 0 rgba(59,42,51,.25),0 0 0 0 rgba(255,214,90,.0)}50%{box-shadow:0 5px 0 rgba(59,42,51,.25),0 0 0 12px rgba(255,214,90,.55)}}",
    /* wall (defence) */
    ".cw-ground{position:absolute;left:0;right:0;bottom:0;height:52%;background:linear-gradient(#b4dc9c,#8cc47a)}",
    ".cw-gob{position:absolute;transform:translateX(-50%);min-width:84px;display:flex;align-items:flex-end;justify-content:center}",
    ".cw-gob>img{height:100%;width:auto;max-width:none}",
    ".cw-gob .cw-z{position:absolute;right:-18px;top:-26px;width:52px;height:52px;animation:cwzz 3s ease-in-out infinite}",
    "@keyframes cwzz{0%,100%{translate:0 0;opacity:.75}50%{translate:4px -8px;opacity:1}}",
    ".cw-hue1>img{filter:hue-rotate(38deg)}",
    ".cw-hue2>img{filter:hue-rotate(205deg) saturate(.85)}",
    ".cw-horn{position:absolute;z-index:30;right:5vw;top:104px;width:136px;height:120px;border-radius:30px;background:#fff8e6 !important;border:4px solid #3b2a33 !important;box-shadow:0 5px 0 rgba(59,42,51,.25)}",
    ".cw-horn img{width:118px;margin:auto}",
    "@media (prefers-reduced-motion: reduce){.cw-breathe,.cw-spot.empty::before,.cw-go.glow,.cw-gob .cw-z,.cw-new,.cw-lower,.cw-no{animation:none !important}}"
  ].join("\n");

  function injectCss() {
    if (document.getElementById("cw-css")) { return; }
    var s = document.createElement("style"); s.id = "cw-css"; s.textContent = CSS; document.head.appendChild(s);
  }
  function el(tag, cls, parent, html) {
    var e = document.createElement(tag);
    if (cls) { e.className = cls; }
    if (html) { e.innerHTML = html; }
    if (parent) { parent.appendChild(e); }
    return e;
  }
  function img(src, cls, parent) { var i = el("img", cls, parent); i.alt = ""; i.src = src; i.draggable = false; return i; }
  function priceTag(n, poor) { return '<span class="cw-price' + (poor ? " poor" : "") + '"><i></i>' + n + "</span>"; }

  function open(stage, wctx) {
    injectCss();
    var F = wctx.fast ? 0.12 : 1;          // tests move fast
    var alive = true, timers = [], sceneTimers = [], raf = 0;
    var D = wctx.data || {};
    var C = D.castle = (D.castle && typeof D.castle === "object") ? D.castle : {};
    C.owned = C.owned || {}; C.slots = C.slots || {};
    C.buddies = Array.isArray(C.buddies) ? C.buddies : [];
    C.pet = PETS[C.pet] ? C.pet : null;
    C.pet_meals = C.pet_meals | 0; C.pony_apples = C.pony_apples | 0; C.waves = C.waves | 0; C.rides = C.rides | 0;
    C.visits = (C.visits | 0) + 1;
    D.bonus = (D.bonus && typeof D.bonus === "object") ? D.bonus : { last: 0, total: 0 };
    wctx.save();

    var sndSet = null;
    try { sndSet = window.RewardKit && RewardKit.sound && RewardKit.sound.make(); } catch (e) { sndSet = null; }
    function snd(name) { try { if (sndSet && sndSet[name]) { sndSet[name](); } } catch (e) {} }
    var lastSaid = {};
    function say(key, gap) {
      var now = Date.now();
      if (gap && lastSaid[key] && now - lastSaid[key] < gap) { return; }
      lastSaid[key] = now;
      wctx.speak(LINES[key] || key);
    }
    function later(fn, ms, keep) {
      var id = setTimeout(function () { if (alive) { fn(); } }, Math.max(0, ms * F));
      (keep ? timers : sceneTimers).push(id);
      return id;
    }
    function every(fn, ms, keep) {
      var id = setInterval(function () { if (alive) { fn(); } }, ms);
      (keep ? timers : sceneTimers).push(id);
      return id;
    }
    function clearScene() {
      sceneTimers.forEach(function (id) { clearTimeout(id); clearInterval(id); });
      sceneTimers = [];
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      blinkers = [];
    }

    var root = el("div", "cw-root", stage);
    root.dataset.place = "hub"; root.dataset.wave = "idle"; root.dataset.bopped = "0";
    var sceneEl = null;
    var homeBtn = el("button", "cw-home", root);
    homeBtn.type = "button"; homeBtn.setAttribute("aria-label", "Back to the map");
    img(NA("go_back"), "", homeBtn);
    homeBtn.addEventListener("click", function () { snd("pop"); go("hub"); });

    function stats() {
      root.dataset.built = String(Object.keys(C.slots).length);
      root.dataset.pet = C.pet || "";
      root.dataset.buddies = C.buddies.join(",");
    }

    /* ---------------------------------------------- breathing is CSS; blinking swaps to a blink picture briefly */
    var blinkers = [];
    function blinker(i, base, blink) { i.dataset.base = base; blinkers.push({ img: i, base: base, blink: blink }); }
    every(function () {
      blinkers.forEach(function (b) {
        if (Math.random() < 0.16 && b.img.isConnected && b.img.getAttribute("src") === b.base) {
          b.img.setAttribute("src", b.blink);
          setTimeout(function () { if (b.img.getAttribute("src") === b.blink) { b.img.setAttribute("src", b.base); } }, 150);
        }
      });
    }, 700, true);
    function setPose(i, src) { i.setAttribute("src", src); }

    /* ---------------------------------------------- small effects */
    function rel(e) {
      var r = e.getBoundingClientRect(), o = root.getBoundingClientRect();
      return { x: r.left - o.left + r.width / 2, y: r.top - o.top + r.height / 2, w: r.width, h: r.height, top: r.top - o.top, left: r.left - o.left };
    }
    function fly(src, from, to, size, ms, done, arc) {
      var f = img(src, "cw-fx", root);
      f.style.width = size + "px"; f.style.left = (from.x - size / 2) + "px"; f.style.top = (from.y - size / 2) + "px";
      var dx = to.x - from.x, dy = to.y - from.y, lift = arc === undefined ? Math.max(60, Math.abs(dx) * 0.3) : arc;
      var dur = Math.max(60, ms * F);
      var fin = function () { if (f.isConnected) { f.remove(); } if (alive && done) { done(); } };
      if (f.animate) {
        var a = f.animate([{ transform: "translate(0,0) rotate(0deg)" }, { transform: "translate(" + dx / 2 + "px," + (dy / 2 - lift) + "px) rotate(160deg)" },
          { transform: "translate(" + dx + "px," + dy + "px) rotate(330deg)" }], { duration: dur, easing: "linear", fill: "forwards" });
        a.onfinish = fin;
      } else { later(fin, ms); }
      return f;
    }
    function puff(src, at, n, size, spread) {
      for (var k = 0; k < n; k++) {
        (function (k) {
          var f = img(src, "cw-fx", root), a = (k / n) * Math.PI * 2 + Math.random() * 0.5;
          f.style.width = size + "px"; f.style.left = (at.x - size / 2) + "px"; f.style.top = (at.y - size / 2) + "px";
          var tx = Math.cos(a) * spread, ty = Math.sin(a) * spread - spread * 0.5;
          if (f.animate) {
            f.animate([{ transform: "translate(0,0) scale(.6)", opacity: 1 }, { transform: "translate(" + tx + "px," + ty + "px) scale(1)", opacity: 0 }],
              { duration: Math.max(80, 900 * F), easing: "ease-out", fill: "forwards" }).onfinish = function () { f.remove(); };
          } else { later(function () { f.remove(); }, 900); }
        })(k);
      }
    }
    function hearts(e) { var p = rel(e); puff(OA("heart"), { x: p.x, y: p.top + p.h * 0.25 }, 3, 44, 70); }
    function sparkles(e) { var p = rel(e); puff(OA("sparkle"), { x: p.x, y: p.top + p.h * 0.45 }, 6, 46, p.w * 0.45); }
    function nope(btn) { btn.classList.remove("cw-no"); void btn.offsetWidth; btn.classList.add("cw-no"); snd("plop"); say("not_yet", 2500); }
    /* tries to pay: true and a happy pop when he has the coins, else a soft shake and "Not yet" */
    function buy(price, btn) {
      if (wctx.spend(price)) { snd("pop"); later(function () { snd("bell"); }, 160); return true; }
      nope(btn); return false;
    }

    /* ---------------------------------------------- the picture tray (pick a part, a pet...) */
    var trayEls = null;
    function closeTray() { if (trayEls) { trayEls.forEach(function (e) { e.remove(); }); trayEls = null; } root.dataset.tray = ""; }
    function tray(items, onPick, label) {
      closeTray();
      var dim = el("div", "cw-dim", root), t = el("div", "cw-tray", root);
      t.setAttribute("role", "dialog"); t.setAttribute("aria-label", label);
      dim.addEventListener("click", function () { snd("plop"); closeTray(); });
      var x = el("button", "cw-x", t); x.type = "button"; x.setAttribute("aria-label", "Close");
      x.addEventListener("click", function () { snd("plop"); closeTray(); });
      items.forEach(function (it) {
        var b = el("button", "cw-tile" + (it.on ? " on" : "") + (it.owned ? "" : " locked"), t);
        b.type = "button"; b.dataset.item = it.id;
        b.setAttribute("aria-label", it.name + (it.owned ? "" : ", " + it.price + " coins"));
        var pic = img(it.src, "", b);
        if (it.mirror) { pic.style.transform = "scaleX(-1)"; }
        if (!it.owned) { b.insertAdjacentHTML("beforeend", priceTag(it.price, wctx.coins() < it.price)); }
        b.addEventListener("click", function () { onPick(it, b); });
      });
      trayEls = [dim, t]; root.dataset.tray = "open";
    }

    /* ---------------------------------------------- the castle picture (used big in the castle and small on the map) */
    function pct(e, b) {
      e.style.left = (b[0] / 10) + "%"; e.style.top = (b[1] / 13) + "%";
      e.style.width = (b[2] / 10) + "%"; e.style.height = (b[3] / 13) + "%";
    }
    function partSrc(id) { return PARTS[id].old ? OA(PARTS[id].old) : NA(id); }
    function needsOk(s) { return !s.needs || !!C.slots[s.needs]; }
    function slotBox(s) {
      if (s.kind !== "flag") { return s.box; }
      var under = C.slots[s.on], tip = under && PARTS[under] ? PARTS[under].tip : 60;
      return [s.x - 30, s.base + tip - 176, 140, 180];
    }
    function slotSpot(s) {
      if (s.kind !== "flag") { return s.spot; }
      var b = slotBox(s); return [b[0] + 70, b[1] + 70];
    }
    var GHOST = { keep: "keep_stone", walls: "walls_stone", tower: "tower_round", gate: "gate_wood", moat: "moat_water" };
    function drawCastle(box, newSlot, ghosts) {
      box.innerHTML = "";
      if (ghosts) {   /* a faint grey dream castle shows where nothing is built yet (faded as one layer) */
        var gl = el("div", "cw-ghosts", box);
        SLOTS.forEach(function (s) {
          if (C.slots[s.id] || !GHOST[s.kind] || !needsOk(s)) { return; }
          var g = img(NA(GHOST[s.kind]), "cw-part", gl); pct(g, s.box); g.style.zIndex = s.z;
          if (s.mirror) { g.style.transform = "scaleX(-1)"; }
        });
      }
      var plot = img(NA("castle_plot"), "cw-part", box); pct(plot, PLOT_BOX); plot.style.zIndex = 0;
      SLOTS.forEach(function (s) {
        var pid = C.slots[s.id];
        if (!pid || !PARTS[pid] || !needsOk(s)) { return; }
        var p = img(partSrc(pid), "cw-part" + (s.id === newSlot ? " cw-new" : ""), box);
        pct(p, slotBox(s)); p.style.zIndex = s.z; p.dataset.slot = s.id;
        if (s.mirror) { p.style.transform = "scaleX(-1)"; }
        if (pid === "gate_drawbridge") {
          var br = img(NA("bridge_down"), "cw-part" + (s.id === newSlot ? " cw-lower" : ""), box);
          pct(br, BRIDGE_BOX); br.style.zIndex = 8;
        }
      });
    }

    /* ---------------------------------------------- places */
    var PLACES = { hub: hubScene, castle: castleScene, stable: stableScene, yard: yardScene, wall: wallScene, grounds: groundsScene };
    var groundsApi = {
      el: el, img: img, NA: NA, root: root, wctx: wctx, C: C, snd: snd, say: say, tray: tray, closeTray: closeTray, buy: buy, nope: nope, drawCastle: drawCastle,
      setResize: function (fn) { onResize = fn; }
    };
    function groundsScene(sc) { window.CastleGrounds.scene(sc, groundsApi); }
    var onResize = null;
    function go(place) {
      closeTray(); clearScene(); abortWave();
      onResize = null;
      if (sceneEl) { sceneEl.remove(); }
      root.dataset.place = place; root.dataset.art = "";
      sceneEl = el("div", "cw-scene", root);
      root.insertBefore(sceneEl, homeBtn);
      homeBtn.hidden = place === "hub";
      PLACES[place](sceneEl);
      stats();
      root.dataset.art = "ready";
    }
    function resized() { if (onResize) { try { onResize(); } catch (e) {} } }
    window.addEventListener("resize", resized);
    function bg(parent, src, pos) { var b = el("div", "cw-bg", parent); b.style.backgroundImage = "url('" + src + "')"; if (pos) { b.style.backgroundPosition = pos; } return b; }
    function charBtn(parent, label) { var b = el("button", "cw-char", parent); b.type = "button"; b.setAttribute("aria-label", label); return b; }

    /* ---------- hub: 4 big picture cards */
    function hubScene(sc) {
      bg(sc, OA("path_far"));
      var hub = el("div", "cw-hub", sc);
      function card(place, label) {
        var c = el("button", "cw-card", hub); c.type = "button"; c.dataset.go = place; c.setAttribute("aria-label", label);
        c.addEventListener("click", function () { snd("pop"); go(place); });
        return c;
      }
      function pic(c, src, x, h, bottom, mirror) {
        var i = img(src, "cw-pic", c); i.style.left = x + "%"; i.style.height = h + "%"; i.style.bottom = (bottom || 4) + "%";
        if (mirror) { i.style.transform = "translateX(-50%) scaleX(-1)"; }
        return i;
      }
      var c1 = card("castle", "My castle");
      c1.style.background = "linear-gradient(#dfe9f3,#eef3ea)";
      var mini = el("div", "cw-mini", c1); drawCastle(mini);
      if (!Object.keys(C.slots).length) { var sp = el("div", "cw-spot empty", mini, "<i></i>"); sp.style.left = "50%"; sp.style.top = "60%"; sp.style.pointerEvents = "none"; }
      var c2 = card("stable", "The stable, with my pony" + (C.pet ? " and my pet" : ""));
      bg(c2, OA("stable_background"));
      pic(c2, OA("pony_stand"), C.pet ? 40 : 50, 48);
      if (C.pet) { pic(c2, NA("pet_" + C.pet + "_sit"), 78, 26); }
      var c3 = card("yard", "The training yard, with my buddy knights");
      bg(c3, NA("yard_background"));
      var row = [OA("knight_idle")].concat(C.buddies.map(function (b) { return NA("buddy_" + b + "_wave"); }));
      if (row.length === 1) { row.push(NA("buddy_leaf_idle")); }
      row.forEach(function (src, k) {
        var n = row.length, x = n === 1 ? 50 : 14 + (72 * k) / (n - 1);
        var p = pic(c3, src, x, n > 3 ? 38 : 52, 4);
        if (k > 0 && C.buddies.length === 0) { p.style.filter = "grayscale(.75)"; p.style.opacity = ".6"; }
      });
      var c4 = card("wall", "The castle wall: stop the silly goblins");
      bg(c4, OA("path_far"));
      el("div", "cw-ground", c4).style.height = "40%";
      var w = pic(c4, NA("defence_wall"), 18, 70, 18); w.style.transform = "translateX(-50%)";
      pic(c4, NA("goblin_walk_a"), 72, 44, 8);
      var pil = pic(c4, NA("pillow"), 46, 16, 56); pil.style.transform = "translateX(-50%) rotate(-20deg)";
      var c5 = card("grounds", "My grounds: build things around the castle");
      c5.classList.add("wide");
      window.CastleGrounds.thumb(c5, groundsApi);
      say("hub", 20000);
    }

    /* ---------- castle building */
    function castleScene(sc) {
      bg(sc, OA("path_far"));
      var area = el("div", "", sc);
      area.style.cssText = "position:absolute;left:8px;right:8px;top:96px;bottom:6px";
      var box = el("div", "cw-cbox", area);
      var side = el("div", "", sc);
      side.style.cssText = "position:absolute;inset:0;pointer-events:none";
      var knight = null;
      function layout() {
        var W = area.clientWidth, H = area.clientHeight;
        var w = Math.min(W, H * 1000 / 1300);
        box.style.width = w + "px"; box.style.height = (w * 1.3) + "px";
        side.innerHTML = ""; knight = null;
        var SW = sc.clientWidth, SH = sc.clientHeight;
        if (SW / SH > 1.15 && (SW - w) / 2 > 150) {
          var kh = Math.min(SH * 0.36, ((SW - w) / 2 - 20) * 600 / 462);
          var k = el("div", "cw-char", side); k.style.left = ((SW - w) / 4) + "px"; k.style.bottom = "4%"; k.style.height = kh + "px";
          knight = img(OA("knight_idle"), "cw-breathe", k); blinker(knight, OA("knight_idle"), NA("knight_blink"));
          if (C.pet) {
            var pt = el("div", "cw-char", side); pt.style.left = (SW - (SW - w) / 4) + "px"; pt.style.bottom = "4%"; pt.style.height = (kh * 0.5) + "px";
            var pi = img(NA("pet_" + C.pet + "_sit"), "cw-breathe", pt); blinker(pi, pi.getAttribute("src"), NA("pet_" + C.pet + "_blink"));
          }
          if (C.buddies.length) {
            var bd = el("div", "cw-char", side); bd.style.left = (SW - (SW - w) / 4 - (C.pet ? kh * 0.28 : 0)) + "px"; bd.style.bottom = (C.pet ? 24 : 4) + "%"; bd.style.height = (kh * 0.8) + "px";
            var b0 = C.buddies[0], bi = img(NA("buddy_" + b0 + "_idle"), "cw-breathe", bd); blinker(bi, NA("buddy_" + b0 + "_idle"), NA("buddy_" + b0 + "_blink"));
            bd.style.zIndex = 0;
          }
        }
      }
      function draw(newSlot) {
        drawCastle(box, newSlot, true);
        var empty = 0;
        SLOTS.forEach(function (s) {
          if (!needsOk(s)) { return; }
          var has = !!C.slots[s.id];
          if (!has) { empty += 1; }
          var b = el("button", "cw-spot" + (has ? " built" : " empty"), box, has ? "" : "<i></i>");
          b.type = "button"; b.dataset.slot = s.id;
          b.setAttribute("aria-label", has ? "Change " + PARTS[C.slots[s.id]].name : "Build " + KIND_WORD[s.kind] + " here");
          var sp = slotSpot(s); b.style.left = (sp[0] / 10) + "%"; b.style.top = (sp[1] / 13) + "%";
          b.addEventListener("click", function () { snd("pop"); pickFor(s); });
        });
        root.dataset.empty = String(empty);
        return empty;
      }
      function pickFor(s) {
        var cur = C.slots[s.id];
        var items = Object.keys(PARTS).filter(function (id) { return PARTS[id].slot === s.kind; }).map(function (id) {
          return { id: id, name: PARTS[id].name, price: PARTS[id].price, owned: !!C.owned[id], on: cur === id, src: partSrc(id) };
        });
        say("pick", 4000);
        tray(items, function (it, btn) {
          if (!it.owned) { if (!buy(it.price, btn)) { return; } C.owned[it.id] = true; }
          C.slots[s.id] = it.id;
          wctx.save(); closeTray(); stats();
          box.innerHTML = ""; draw(s.id);
          if (it.id === "gate_drawbridge") { snd("creak"); } else { snd("plop"); }
          sparkles(box.querySelector('.cw-part[data-slot="' + s.id + '"]') || box);
          if (knight) { setPose(knight, OA("knight_cheer")); later(function () { if (knight) { setPose(knight, OA("knight_idle")); } }, 1400); }
          say("built", 3000);
        }, "Pick " + KIND_WORD[s.kind]);
      }
      layout(); var left = draw();
      onResize = function () { layout(); };
      say(left ? "castle" : "castle_done", 15000);
    }

    /* ---------- stable: pony, pet, ride */
    var mudLeft = 3;   // the pony is muddy once per visit
    function stableScene(sc) {
      bg(sc, OA("stable_background"));
      var land = function () { return sc.clientWidth / sc.clientHeight > 1; };
      var pony = el("button", "cw-pony", sc); pony.type = "button"; pony.setAttribute("aria-label", "Pat the pony");
      var pImg = img(OA("pony_stand"), "cw-breathe", pony);
      blinker(pImg, OA("pony_stand"), NA("pony_blink"));
      var muds = [1, 2, 3].map(function (k) { var m = img(OA("mud_spot_" + k), "cw-mud", pony); if (k > mudLeft) { m.style.opacity = "0"; } return m; });
      root.dataset.mud = String(mudLeft);
      var petBox = null, petImg = null, bowl = null, petSpot = null, busy = false;
      function place() {
        var L = land();
        if (L) { pony.style.height = "50%"; pony.style.width = ""; pony.style.left = "12%"; pony.style.bottom = "17%"; }
        else { pony.style.width = "78%"; pony.style.height = ""; pony.style.left = "3%"; pony.style.bottom = "27%"; }
        var pw = L ? "min(24vh,22vw)" : "34vw";
        if (petBox) { petBox.style.width = pw; petBox.style.left = L ? "60%" : "62%"; petBox.style.bottom = L ? "15%" : "14%"; }
        if (bowl) { bowl.style.width = L ? "min(10vh,9vw)" : "15vw"; bowl.style.left = L ? "calc(60% + min(24vh,22vw) + 4px)" : "47%"; bowl.style.bottom = L ? "15%" : "14%"; }
        if (petSpot) { petSpot.style.left = L ? "64%" : "62%"; petSpot.style.bottom = L ? "16%" : "14%"; }
      }
      function buildPet() {
        if (petBox) { petBox.remove(); } if (bowl) { bowl.remove(); } if (petSpot) { petSpot.remove(); }
        petBox = bowl = petSpot = petImg = null;
        if (C.pet) {
          petBox = el("button", "cw-pet", sc); petBox.type = "button"; petBox.setAttribute("aria-label", "Pet " + PETS[C.pet].name);
          petImg = img(NA("pet_" + C.pet + "_sit"), "cw-breathe", petBox);
          blinker(petImg, NA("pet_" + C.pet + "_sit"), NA("pet_" + C.pet + "_blink"));
          bowl = img(NA("bowl"), "cw-bowl", sc);
          petBox.addEventListener("click", function () {
            if (busy) { return; }
            setPose(petImg, NA("pet_" + C.pet + "_happy")); snd("pop"); hearts(petBox);
            later(function () { setPose(petImg, NA("pet_" + C.pet + "_sit")); }, 1300);
          });
        } else {
          petSpot = el("button", "cw-spot empty cw-petspot", sc, "<i></i>"); petSpot.type = "button"; petSpot.setAttribute("aria-label", "Get a pet");
          petSpot.style.margin = "0";
          petSpot.addEventListener("click", function () {
            snd("pop"); say("pick_pet", 4000);
            tray(Object.keys(PETS).map(function (k) {
              return { id: k, name: PETS[k].name, price: PETS[k].price, owned: false, on: false, src: NA("pet_" + k + "_sit") };
            }), function (it, btn) {
              if (!buy(it.price, btn)) { return; }
              C.pet = it.id; wctx.save(); closeTray(); stats();
              buildPet(); buildTools(); place();
              setPose(petImg, NA("pet_" + C.pet + "_happy")); hearts(petBox); sparkles(petBox);
              later(function () { if (petImg) { setPose(petImg, NA("pet_" + C.pet + "_sit")); } }, 1500);
              wctx.speak("Hooray! " + PETS[it.id].name.replace(/^a /, "My ") + "!");
            }, "Pick a pet");
          });
        }
      }
      var tools = null;
      function tool(act, src, label, fn) {
        var b = el("button", "cw-tool", tools); b.type = "button"; b.dataset.act = act; b.setAttribute("aria-label", label);
        img(src, "", b); b.addEventListener("click", function () { if (!busy) { fn(b); } });
        return b;
      }
      function buildTools() {
        if (tools) { tools.remove(); }
        tools = el("div", "cw-tools", sc);
        tool("brush", OA("brush"), "Brush the pony", brush);
        tool("apple", OA("apple_1"), "Give the pony an apple", apple);
        tool("ride", OA("go_horseshoe"), "Ride the pony", function () { snd("clipClop"); rideScene(); });
        if (C.pet) { tool("food", NA("food_" + PETS[C.pet].food), "Feed my pet", feedPet); }
      }
      function brush(btn) {
        busy = true; snd("swish");
        var p = rel(pony), b = img(OA("brush"), "cw-fx", root), size = Math.min(120, p.w * 0.3);
        b.style.width = size + "px"; b.style.left = (p.left + p.w * 0.3) + "px"; b.style.top = (p.top + p.h * 0.55) + "px";
        var done = function () {
          b.remove();
          if (mudLeft > 0) {
            muds[mudLeft - 1].style.opacity = "0"; mudLeft -= 1; root.dataset.mud = String(mudLeft);
          }
          if (mudLeft === 0) {
            setPose(pImg, OA("pony_shake")); snd("neigh"); sparkles(pony); say("shiny", 4000);
            later(function () { setPose(pImg, OA("pony_happy")); }, 900);
            later(function () { setPose(pImg, OA("pony_stand")); busy = false; }, 1900);
          } else { busy = false; }
        };
        if (b.animate) {
          b.animate([{ transform: "translate(0,0) rotate(-8deg)" }, { transform: "translate(" + p.w * 0.25 + "px,-10px) rotate(8deg)" }, { transform: "translate(0,0) rotate(-8deg)" },
            { transform: "translate(" + p.w * 0.25 + "px,-10px) rotate(8deg)" }], { duration: Math.max(80, 900 * F) }).onfinish = done;
        } else { later(done, 900); }
      }
      function apple(btn) {
        busy = true;
        var p = rel(pony);
        fly(OA("apple_1"), rel(btn), { x: p.left + p.w * 0.86, y: p.top + p.h * 0.55 }, 60, 650, function () {
          setPose(pImg, OA("pony_eat")); snd("crunch"); hearts(pony);
          C.pony_apples += 1; wctx.save(); say("yum", 3000);
          later(function () { setPose(pImg, OA("pony_happy")); }, 1100);
          later(function () { setPose(pImg, OA("pony_stand")); busy = false; }, 1900);
        });
      }
      function feedPet(btn) {
        if (!C.pet || !bowl) { return; }
        busy = true;
        var b = rel(bowl);
        fly(NA("food_" + PETS[C.pet].food), rel(btn), { x: b.x, y: b.y - 10 }, 64, 650, function () {
          setPose(petImg, NA("pet_" + C.pet + "_eat")); snd("crunch");
          C.pet_meals += 1; wctx.save(); say("yum", 3000);
          later(function () { setPose(petImg, NA("pet_" + C.pet + "_happy")); hearts(petBox); }, 1300);
          later(function () { setPose(petImg, NA("pet_" + C.pet + "_sit")); busy = false; }, 2200);
        });
      }
      pony.addEventListener("click", function () {
        if (busy) { return; }
        setPose(pImg, OA("pony_happy")); snd("neigh"); hearts(pony);
        later(function () { setPose(pImg, OA("pony_stand")); }, 1200);
      });
      buildPet(); buildTools(); place();
      onResize = place;
      say(C.pet ? "stable" : "no_pet", 15000);
    }

    /* ---------- ride: 3 taps on the horseshoe trot a short loop, then home to the stable */
    function rideScene() {
      clearScene(); closeTray();
      if (sceneEl) { sceneEl.remove(); }
      root.dataset.place = "ride"; root.dataset.ride = "0";
      var sc = sceneEl = el("div", "cw-scene", root); root.insertBefore(sc, homeBtn);
      var far = el("div", "cw-layer", sc); far.style.cssText += ";top:0;bottom:0;background-image:url('" + OA("path_far") + "');background-size:cover;background-position:center bottom";
      var mid = el("div", "cw-layer", sc); mid.style.bottom = "16%"; mid.style.height = "34%"; mid.style.backgroundImage = "url('" + OA("path_mid") + "')";
      var near = el("div", "cw-layer", sc); near.style.bottom = "0"; near.style.height = "24%"; near.style.backgroundImage = "url('" + OA("path_near") + "')";
      var pb = el("div", "cw-pony", sc); pb.style.height = "min(46%,80vw)"; pb.style.left = "50%"; pb.style.transform = "translateX(-50%)"; pb.style.bottom = "9%";
      var pImg = img(OA("pony_stand"), "", pb), rider = img(OA("knight_ride"), "", pb);
      var goBtn = el("button", "cw-go glow", sc); goBtn.type = "button"; goBtn.dataset.act = "go"; goBtn.setAttribute("aria-label", "Trot");
      img(OA("go_horseshoe"), "", goBtn);
      var off = { mid: 0, near: 0 }, stretch = 0, trotting = false;
      function trot() {
        if (trotting || stretch >= 3) { return; }
        trotting = true; goBtn.classList.remove("glow");
        var t0 = performance.now(), dur = Math.max(200, 1600 * F), step = 0;
        var W = sc.clientWidth;
        var leg = every(function () { step += 1; setPose(pImg, OA(step % 2 ? "pony_walk_a" : "pony_walk_b")); snd("clipClop"); }, Math.max(60, 220 * F));
        function frame(now) {
          if (!alive) { return; }
          var k = Math.min(1, (now - t0) / dur);
          mid.style.backgroundPositionX = (off.mid - W * 0.4 * k) + "px"; near.style.backgroundPositionX = (off.near - W * 0.9 * k) + "px";
          if (k < 1) { raf = requestAnimationFrame(frame); return; }
          raf = 0; off.mid -= W * 0.4; off.near -= W * 0.9;
          clearInterval(leg); setPose(pImg, OA("pony_stand"));
          stretch += 1; root.dataset.ride = String(stretch); trotting = false;
          if (stretch >= 3) {
            C.rides += 1; wctx.save();
            setPose(pImg, OA("pony_happy")); setPose(rider, OA("knight_ride_cheer")); snd("neigh"); sparkles(pb); say("home", 3000);
            goBtn.hidden = true;
            later(function () { go("stable"); }, 2200);
          } else { goBtn.classList.add("glow"); }
        }
        raf = requestAnimationFrame(frame);
      }
      goBtn.addEventListener("click", trot);
      homeBtn.hidden = false;
      say("ride", 8000);
      root.dataset.art = "ready";
    }

    /* ---------- training yard: recruit buddies, bop the dummy */
    function yardScene(sc) {
      bg(sc, NA("yard_background"));
      var spots = {
        port: { knight: [50, 19], leaf: [19, 30], sun: [81, 30], plum: [22, 5], sea: [78, 5], dummy: [50, 2] },
        land: { knight: [43, 18], leaf: [10, 22], sun: [26, 18], plum: [60, 18], sea: [76, 22], dummy: [91, 20] }
      };
      var parts = {};
      var kb = charBtn(sc, "My knight"); var kImg = img(OA("knight_idle"), "cw-breathe", kb); blinker(kImg, OA("knight_idle"), NA("knight_blink"));
      parts.knight = kb;
      kb.addEventListener("click", function () { setPose(kImg, NA("knight_wave")); snd("pop"); wctx.speak("Hi!"); later(function () { setPose(kImg, OA("knight_idle")); }, 1100); });
      var bImgs = {};
      BUDDIES.forEach(function (bd) {
        var have = C.buddies.indexOf(bd.id) >= 0;
        var b = charBtn(sc, have ? bd.name : "Get " + bd.name + ", " + bd.price + " coins");
        b.dataset.buddy = bd.id;
        var i = img(NA("buddy_" + bd.id + "_idle"), "cw-breathe", b); bImgs[bd.id] = i;
        parts[bd.id] = b;
        function setHave() {
          b.classList.remove("wait"); var tag = b.querySelector(".cw-price"); if (tag) { tag.remove(); }
          b.setAttribute("aria-label", bd.name);
          blinker(i, NA("buddy_" + bd.id + "_idle"), NA("buddy_" + bd.id + "_blink"));
        }
        if (have) { setHave(); } else { b.classList.add("wait"); b.insertAdjacentHTML("beforeend", priceTag(bd.price, wctx.coins() < bd.price)); }
        b.addEventListener("click", function () {
          if (C.buddies.indexOf(bd.id) < 0) {
            if (!buy(bd.price, b)) { return; }
            C.buddies.push(bd.id); wctx.save(); stats(); setHave();
            setPose(i, NA("buddy_" + bd.id + "_cheer")); sparkles(b);
            wctx.speak("Hooray! I'm " + bd.name + "!");
            later(function () { setPose(i, NA("buddy_" + bd.id + "_idle")); }, 1600);
            return;
          }
          setPose(i, NA("buddy_" + bd.id + "_wave")); snd("pop"); wctx.speak("Hi! I'm " + bd.name + "!");
          later(function () { setPose(i, NA("buddy_" + bd.id + "_idle")); }, 1300);
        });
      });
      var db = charBtn(sc, "Bop the training dummy"); db.dataset.act = "dummy";
      var dImg = img(NA("dummy"), "", db); dImg.style.transformOrigin = "50% 100%";
      var practising = false;
      db.addEventListener("click", function () {
        if (practising) { return; }
        practising = true; setPose(kImg, NA("knight_wave")); snd("swish");
        var k = rel(kb), d = rel(db);
        fly(NA("pillow"), { x: k.x, y: k.top + k.h * 0.3 }, { x: d.x, y: d.top + d.h * 0.45 }, 56, 500, function () {
          snd("plop"); puff(NA("feather"), { x: d.x, y: d.top + d.h * 0.4 }, 5, 26, 50);
          if (dImg.animate) { dImg.animate([{ transform: "rotate(0)" }, { transform: "rotate(-12deg)" }, { transform: "rotate(9deg)" }, { transform: "rotate(-5deg)" }, { transform: "rotate(0)" }], { duration: Math.max(80, 1100 * F) }); }
          root.dataset.practice = String((Number(root.dataset.practice) || 0) + 1);
          C.buddies.forEach(function (id) { setPose(bImgs[id], NA("buddy_" + id + "_cheer")); });
          later(function () { setPose(kImg, OA("knight_idle")); C.buddies.forEach(function (id) { setPose(bImgs[id], NA("buddy_" + id + "_idle")); }); practising = false; }, 1000);
        });
      });
      parts.dummy = db;
      function place() {
        var L = sc.clientWidth / sc.clientHeight > 1, S = spots[L ? "land" : "port"];
        var h = L ? "min(24vh,36vw)" : "min(20vh,34vw)";
        Object.keys(parts).forEach(function (k) {
          var p = parts[k], s = S[k];
          p.style.left = s[0] + "%"; p.style.bottom = s[1] + "%";
          p.style.height = k === "dummy" ? (L ? "min(19vh,30vw)" : "min(14vh,24vw)") : h;
          p.style.zIndex = String(100 - s[1]);
        });
      }
      place(); onResize = place;
      say(C.buddies.length === 4 ? "yard_full" : "yard", 15000);
    }

    /* ---------- the wall: defend together against silly goblins */
    var wave = null;
    function abortWave() {
      if (!wave) { return; }
      wave.goblins.forEach(function (g) { g.el.remove(); });
      wave = null; root.dataset.wave = "idle";
    }
    var paidThisVisit = 0;
    function wallScene(sc) {
      bg(sc, OA("path_far"));
      var hills = el("div", "cw-layer", sc); hills.style.bottom = "52%"; hills.style.height = "16%"; hills.style.backgroundImage = "url('" + OA("path_mid") + "')";
      el("div", "cw-ground", sc).style.height = "58%";
      var wall = img(NA("defence_wall"), "", sc);
      wall.style.cssText = "position:absolute;left:-2vw;bottom:48%;height:min(40vh,62vw);z-index:1";
      var LANES = [50, 33, 16], DEPTH = [0.86, 0.93, 1];
      var heroes = [];
      function hero(src, base, blink, cheer, throwSrc, x, lane, label) {
        var h = el("div", "cw-char", sc); h.setAttribute("aria-hidden", "true");
        h.style.left = x + "%"; h.style.bottom = LANES[lane] + "%"; h.style.height = "calc(min(23vh,26vw) * " + DEPTH[lane] + ")";
        h.style.zIndex = String(100 - LANES[lane]); h.style.pointerEvents = "none";
        var i = img(src, "cw-breathe", h); blinker(i, base, blink);
        var o = { el: h, img: i, base: base, cheer: cheer, toss: throwSrc, label: label };
        heroes.push(o); return o;
      }
      var me = hero(OA("knight_idle"), OA("knight_idle"), NA("knight_blink"), OA("knight_cheer"), NA("knight_wave"), 21, 1, "knight");
      var SPOTS_B = [[9, 0], [10, 2], [31, 0], [31, 2]];
      var buddies = C.buddies.map(function (id, k) {
        return hero(NA("buddy_" + id + "_idle"), NA("buddy_" + id + "_idle"), NA("buddy_" + id + "_blink"), NA("buddy_" + id + "_cheer"), NA("buddy_" + id + "_wave"), SPOTS_B[k][0], SPOTS_B[k][1], id);
      });
      if (C.pet) {
        var pt = el("div", "cw-char", sc); pt.style.cssText = "left:4%;bottom:" + (LANES[2] - 6) + "%;height:min(9vh,14vw);z-index:95;pointer-events:none;min-height:0;min-width:0";
        var pi = img(NA("pet_" + C.pet + "_sit"), "cw-breathe", pt); blinker(pi, pi.getAttribute("src"), NA("pet_" + C.pet + "_blink"));
        heroes.push({ el: pt, img: pi, base: pi.getAttribute("src"), cheer: NA("pet_" + C.pet + "_happy"), toss: null });
      }
      var horn = el("button", "cw-horn", sc); horn.type = "button"; horn.dataset.act = "horn"; horn.setAttribute("aria-label", "Toot the horn to start");
      img(NA("horn"), "", horn);
      horn.addEventListener("click", startWave);

      function startWave() {
        if (wave) { return; }
        horn.hidden = true; snd("bell"); say("goblins", 3000);
        wave = { goblins: [], spawned: 0, total: wctx.fast ? 6 : 9, t0: Date.now(), paid: false, ended: false };
        root.dataset.wave = "running"; root.dataset.bopped = "0";
        var spawnMs = wctx.fast ? 260 : 3200, walkMs = wctx.fast ? 1300 : 14000;
        var last = -1;
        function spawn() {
          if (!wave || wave.spawned >= wave.total) { return; }
          var lane; do { lane = Math.floor(Math.random() * 3); } while (lane === last && Math.random() < 0.8);
          last = lane;
          var g = { lane: lane, x: 106, state: "walk", step: 0, born: performance.now(), walkMs: walkMs * (0.9 + Math.random() * 0.2) };
          var b = el("button", "cw-gob" + (wave.spawned % 3 ? " cw-hue" + (wave.spawned % 3) : ""), sc); b.type = "button";
          b.setAttribute("aria-label", "A silly goblin. Tap to toss a pillow");
          b.style.bottom = LANES[lane] + "%"; b.style.height = "calc(min(21vh,28vw) * " + DEPTH[lane] + ")";
          b.style.zIndex = String(100 - LANES[lane]); b.dataset.state = "walk";
          g.el = b; g.img = img(NA("goblin_walk_a"), "", b);
          b.addEventListener("click", function () { tapGoblin(g); });
          wave.goblins.push(g); wave.spawned += 1;
          if (wave.spawned < wave.total) { later(spawn, spawnMs / F); }
        }
        spawn();
        var lastT = performance.now();
        function tick(now) {
          if (!alive || !wave) { return; }
          var dt = now - lastT; lastT = now;
          wave.goblins.forEach(function (g) {
            if (g.state === "walk") {
              var stop = 40 + 7 * sleepersIn(g.lane);
              g.x -= (66 * dt) / g.walkMs;
              g.step += dt;
              if (g.step > 320 * Math.min(1, F * 3)) { g.step = 0; g.img.setAttribute("src", NA(g.img.getAttribute("src").indexOf("walk_a") >= 0 ? "goblin_walk_b" : "goblin_walk_a")); }
              if (g.x <= stop) { g.x = stop; sleep(g); }
            } else if (g.state === "run") {
              g.x += (80 * dt) / (wctx.fast ? 400 : 2600);
              if (g.x > 115) { g.state = "gone"; g.el.remove(); }
            }
            g.el.style.left = g.x + "%";
          });
          checkEnd();
          raf = requestAnimationFrame(tick);
        }
        raf = requestAnimationFrame(tick);
      }
      function sleepersIn(lane) { return wave.goblins.filter(function (g) { return g.lane === lane && g.state === "sleep"; }).length; }
      function sleep(g) {
        g.state = "sleep"; g.el.dataset.state = "sleep"; g.img.setAttribute("src", NA("goblin_sleepy"));
        g.el.setAttribute("aria-label", "A sleepy goblin");
        img(NA("zzz"), "cw-z", g.el); snd("plop");
      }
      function walkers(except) { return wave.goblins.filter(function (g) { return g.state === "walk" && g !== except; }).sort(function (a, b) { return a.x - b.x; }); }
      function toss(h, g) {
        if (h.toss) { setPose(h.img, h.toss); later(function () { if (!wave || !wave.ended) { setPose(h.img, h.base); } }, 450); }
        var a = rel(h.el), t = rel(g.el);
        snd("swish");
        fly(NA("pillow"), { x: a.x, y: a.top + a.h * 0.28 }, { x: t.x, y: t.top + t.h * 0.4 }, 52, 480, function () { bop(g); }, 70);
      }
      function tapGoblin(g) {
        if (!wave || g.state !== "walk") { return; }
        g.state = "hit"; g.el.dataset.state = "hit";
        toss(me, g);
        var others = walkers(g);
        buddies.forEach(function (b, k) {
          var tgt = others[k];
          if (tgt) { tgt.state = "hit"; tgt.el.dataset.state = "hit"; later(function () { toss(b, tgt); }, 90 * (k + 1)); }
          else { later(function () { if (g.el.isConnected) { toss(b, g); } }, 90 * (k + 1)); }
        });
      }
      function bop(g) {
        if (!wave || g.state !== "hit") { return; }
        g.state = "oops"; g.el.dataset.state = "oops";
        g.img.setAttribute("src", NA("goblin_oops")); snd("plop");
        var t = rel(g.el); puff(NA("feather"), { x: t.x, y: t.top + t.h * 0.35 }, 6, 28, 60);
        say("oops", 2500);
        root.dataset.bopped = String((Number(root.dataset.bopped) || 0) + 1);
        later(function () {
          if (!wave) { return; }
          g.state = "run"; g.el.dataset.state = "run"; g.img.setAttribute("src", NA("goblin_run")); g.img.style.transform = "scaleX(-1)";
        }, 800);
      }
      function checkEnd() {
        if (!wave || wave.ended || wave.spawned < wave.total) { return; }
        var busy = wave.goblins.some(function (g) { return g.state === "walk" || g.state === "hit" || g.state === "oops" || g.state === "run"; });
        var minMs = wctx.fast ? 1500 : 30000;
        if (busy || Date.now() - wave.t0 < minMs) { return; }
        wave.ended = true; root.dataset.wave = "cheer";
        heroes.forEach(function (h) { setPose(h.img, h.cheer); });
        snd("bell"); say("cheer", 2000);
        wave.goblins.forEach(function (g) {
          if (g.state !== "sleep") { return; }
          var z = g.el.querySelector(".cw-z"); if (z) { z.remove(); }
          g.img.setAttribute("src", NA("goblin_wave")); g.el.dataset.state = "friend";
        });
        C.waves += 1; wctx.save();
        if (paidThisVisit < PAID_WAVES && !wave.paid && alive) {
          /* pay at once (leaving the place cannot lose the coins); the flying coins are only decoration */
          wave.paid = true; paidThisVisit += 1;
          var got = wctx.earn ? wctx.earn(BONUS) : false;
          if (!wctx.earn) { console.error("castle world: wctx.earn is missing, no bonus coins"); }
          if (got) {
            D.bonus.last = BONUS; D.bonus.total = (D.bonus.total | 0) + BONUS; D.bonus.at = Date.now();
            wctx.save(); wctx.coinsChanged();
          }
          root.dataset.bonus = String(D.bonus.total | 0);
          later(function () { coinShow(); }, 900);
        }
        later(function () {
          if (!wave) { return; }
          wave.goblins.forEach(function (g) { g.el.remove(); });
          heroes.forEach(function (h) { setPose(h.img, h.base); });
          if (raf) { cancelAnimationFrame(raf); raf = 0; }
          wave = null; root.dataset.wave = "idle"; horn.hidden = false;
        }, 3600);
      }
      function coinShow() {
        var pill = stage.parentElement && stage.parentElement.querySelector(".pw-coins");
        var to = pill ? rel(pill) : { x: root.clientWidth - 60, y: 30 };
        var from = { x: root.clientWidth / 2, y: root.clientHeight * 0.45 };
        say("bonus", 2000);
        for (var k = 0; k < BONUS; k++) {
          (function (k) {
            later(function () {
              var c = el("div", "cw-fx cw-coin", root); c.style.cssText += ";width:44px;height:44px;left:" + (from.x - 22) + "px;top:" + (from.y - 22) + "px";
              snd("pop");
              if (c.animate) {
                c.animate([{ transform: "translate(0,0) scale(1)" }, { transform: "translate(" + (to.x - from.x) + "px," + (to.y - from.y) + "px) scale(.6)" }],
                  { duration: Math.max(80, 800 * F), easing: "ease-in", fill: "forwards" }).onfinish = function () { c.remove(); };
              } else { later(function () { c.remove(); }, 800); }
            }, 220 * k);
          })(k);
        }
      }
      say("wall", 15000);
    }

    function close() {
      if (!alive) { return; }
      alive = false;
      clearScene();
      timers.forEach(function (id) { clearTimeout(id); clearInterval(id); });
      timers = [];
      window.removeEventListener("resize", resized);
      try { if (sndSet && sndSet.stopAll) { sndSet.stopAll(); } } catch (e) {}
      wave = null;
      try { wctx.save(); } catch (e) {}
    }
    wctx.onEnd(close);
    go("hub");
    return { close: close };
  }

  /* what the rest of the game may know about his castle (journey.js): read only, never changes the save */
  function castleInfo(data, coins) {
    var C = (data && data.castle) || {}, owned = C.owned || {}, slots = C.slots || {}, buddies = Array.isArray(C.buddies) ? C.buddies : [];
    function src(id) { return PARTS[id].old ? OA(PARTS[id].old) : NA(id); }
    var ids = [];
    ["keep", "tower_l", "walls", "gate", "tower_r", "moat", "garden_l"].forEach(function (s) { var id = slots[s]; if (id && PARTS[id] && ids.indexOf(id) < 0) { ids.push(id); } });
    var friend = PETS[C.pet] ? NA("pet_" + C.pet + "_sit") : buddies[0] ? NA("buddy_" + buddies[0] + "_idle") : "";
    var wants = [];
    Object.keys(PARTS).forEach(function (id) { if (!owned[id]) { wants.push({ name: PARTS[id].name, price: PARTS[id].price, img: src(id) }); } });
    if (!PETS[C.pet]) { Object.keys(PETS).forEach(function (k) { wants.push({ name: PETS[k].name, price: PETS[k].price, img: NA("pet_" + k + "_sit") }); }); }
    BUDDIES.forEach(function (b) { if (buddies.indexOf(b.id) < 0) { wants.push({ name: b.name, price: b.price, img: NA("buddy_" + b.id + "_idle") }); } });
    wants.sort(function (a, b) { return a.price - b.price; });
    var want = null;
    for (var i = 0; i < wants.length && !want; i++) { if (wants[i].price > coins) { want = wants[i]; } }
    return { title: "my castle", wall: "", friend: friend, friendName: PETS[C.pet] ? PETS[C.pet].name : buddies[0] ? "a buddy knight" : "",
      items: ids.length ? ids.slice(0, 3).map(src) : [NA("castle_plot")], want: want || wants[0] || null, canBuy: !!wants.length && !want };
  }

  if (window.PlayWorlds) { window.PlayWorlds.register("castle", { info: castleInfo, open: open }); }
  try { if (document.readyState === "complete") { preload(); } else { window.addEventListener("load", preload); } } catch (e) {}
})();
