/* Kitty World - HOME (dollhouse) module.
 *
 *   <script src="modules/characters.js"></script>
 *   <script src="modules/home.js"></script>
 *   HomeGame.mount(rootEl [, { artBase: "art2/", chars, art, price }])
 *     chars  (optional) an object like KittyChars ({ full(id, pose, opts), face(id), headInner(id) }) that draws the
 *            five friends instead of KittyChars (the cafe world passes its own pictures). Same 200 x 260 box.
 *     art    (optional) { itemId: { src: "url", aspect: width / height } } pictures that replace catalogue pictures.
 *     price  (optional) function (basePrice, item) -> price, for items, wallpapers and floors (the cafe world's coins).
 *   With no options the house is exactly the old app's house. Every mount starts from these defaults again.
 *
 * Uses the host globals P, save(), renderTop(), tone(), speak() (never redefines them).
 * All CSS is scoped under .hg and injected once (style#home-game-css).
 * World = 1000 x 750 units (4:3). Saved items keep {uid, id, x, y}: x = % of width (centre),
 * y = % of height (foot point for floor things, centre for wall things). Optional extra fields:
 * room ("living" | "bedroom" | "kitchen"), on (uid of the seat or table it rests on, or "shelf"),
 * slot (anchor index), pose ("sit" | "bath"), state (TV channel, lamp on).
 * Pictures: art2/ (Tiny Treats CC0 renders and Fluent Emoji Flat MIT, with a baked ink outline).
 * All big furniture (sofa, chairs, table, bed, bath, sinks, kitchen pieces), the mirror, rugs and the room itself are our own SVG drawings.
 */
(function () {
  "use strict";
  var INK = "#3b2a33";
  var H = 255;                      // standing friend height at the front of the room, world units
  var BACK_Y = 465, FRONT_Y = 750;  // floor: back edge and front edge (world y)
  var SIDE = 80;                    // side wall width at the back edge (world x)
  var FOOT_MIN = 478, FOOT_MAX = 738;
  var WALL_TOP = 140, WALL_BOT = 440;
  var CHAR_BOX = 1.1;               // char svg box height in H (the figure is about 91% of its box)
  var DEFAULT_OPTS = { artBase: "art2/", chars: null, art: null, price: null };
  var opts = { artBase: DEFAULT_OPTS.artBase, chars: null, art: null, price: null };
  function KC() { return opts.chars || window.KittyChars; }   // who draws the five friends
  function artOver(c) { return opts.art && c && opts.art[c.id] ? opts.art[c.id] : null; }

  /* ---------- picture aspect ratios (width / height) of art2/*.png ---------- */
  var ASPECT = {tt_ducky:0.811,tt_towels:1.119,tt_slippers:2.490,tt_candle:0.776,tt_monstera:0.945,tt_pothos:0.764,tt_yucca:0.669,tt_sansevieria:0.673,tt_cacti:1.037,tt_succulent:1.608,tt_kettle:1.245,tt_toaster:1.316,tt_mug:1.239,tt_pot:1.776,tt_hooks:2.248,tt_teapot:1.373,tt_radio:1.323,tt_basket:1.109,tt_pillow_red:1.028,tt_pillow_blue:1.028,tt_apple:1.192,tt_cupcake:0.732,tt_donut:1.380,tt_cake_birthday:1.104,tt_cake_strawberry:1.227,tt_muffin:1.020,tt_cinnamon_roll:1.351,tt_cookie:1.671,tt_waffle:1.316,tt_macaron_pink:1.149,tt_macaron_blue:1.149,tt_cookie_jar:0.713,tt_pillow_green:1.896,tt_zzplant:0.417,tt_croissant:1.881,tt_cake_chocolate:1.257,tt_pie:1.660,tt_watering_can:1.119,tt_mug_yellow:1.239,tt_pastry_stand:1.344,fl_teddy:0.996,fl_dolls:0.798,fl_picture:1.000,fl_heart:1.000,fl_discoball:0.857,fl_yarn:0.886,fl_puzzle:1.000,fl_blossom:1.035,fl_cat:1.035,fl_bunnyfull:1.033,fl_fish:1.202,fl_unicorn:0.987,fl_sunflower:0.798,fl_tulip:0.670,fl_guitar:1.013,fl_drum:0.996,fl_books:1.072,fl_lantern:0.664,fl_rainbow:1.000,fl_kite:0.992,fl_balloon:0.730,fl_gift:0.933,fl_crown:1.208,fl_icecream:0.754,fl_strawberry:0.731,fl_cocoa:0.965,fl_watermelon:1.004,fl_pancakes:1.021,fl_bubbletea:0.731,fl_star:1.013};
  var SVG_ASPECT = { sofa: 300 / 175, armchair: 170 / 175, bed: 300 / 210, tv: 200 / 220, floorlamp: 110 / 290, bookshelf: 180 / 270,
    dresser: 170 / 150, rug_round: 320 / 100, rug_heart: 260 / 110, rug_stripe: 340 / 90, clock: 130 / 130, kittyframe: 120 / 140, bunting: 320 / 90,
    chair: 120 / 170, table: 200 / 150, bath: 240 / 150, vanity: 140 / 190, fridge: 120 / 200, stove: 160 / 150, counter: 180 / 140,
    countersink: 180 / 180, mirror: 120 / 150, ball: 1, dough: 1.3 };

  /* ---------- catalogue ----------
   * zone: char | pet (sits on seats) | floor | prop (snaps onto tables and shelves) | wall | rug
   * h: height in H at the front of the room. seats / surfaces: [fx, fy] of the item's own box. */
  var C = [];
  function add(id, cat, art, zone, h, price, name, extra) {
    var o = { id: id, cat: cat, art: art, zone: zone, h: h, price: price, name: name };
    if (extra) for (var k in extra) o[k] = extra[k];
    C.push(o);
  }
  // Friends (the five characters are unique)
  add("kitty", "friends", "char", "char", 1, 0, "Mimi", { unique: true });
  add("melody", "friends", "char", "char", 1, 15, "Bella", { unique: true });
  add("kuromi", "friends", "char", "char", 1, 25, "Lulu", { unique: true });
  add("purin", "friends", "char", "char", 1, 35, "Momo", { unique: true });
  add("cinna", "friends", "char", "char", 1, 45, "Puff", { unique: true });
  add("cat", "friends", "png:fl_cat", "pet", .42, 20, "Kitten");
  add("bunnyfull", "friends", "png:fl_bunnyfull", "pet", .44, 20, "Bunny");
  add("teddy", "friends", "png:fl_teddy", "pet", .46, 12, "Teddy");
  add("unicorn", "friends", "png:fl_unicorn", "floor", .72, 40, "Unicorn");
  add("fish", "friends", "png:fl_fish", "prop", .3, 12, "Fish");
  add("ducky", "friends", "png:tt_ducky", "prop", .3, 5, "Ducky", { tap: "ducky" });
  add("dolls", "friends", "png:fl_dolls", "prop", .4, 8, "Dolls");
  // Furniture
  add("couch", "furniture", "svg:sofa", "floor", .98, 20, "Sofa", { seats: [[.34, .57], [.66, .57]] });
  add("armchair", "furniture", "svg:armchair", "floor", .98, 14, "Armchair", { seats: [[.5, .57]] });
  add("chair", "furniture", "svg:chair", "floor", .82, 8, "Chair", { seats: [[.5, .55]] });
  add("bed", "furniture", "svg:bed", "floor", 1.0, 30, "Bed", { seats: [[.37, .72], [.63, .72]], surfaces: [[.3, .45], [.7, .45]] });
  add("table", "furniture", "svg:table", "floor", .6, 12, "Table", { surfaces: [[.27, .19], [.5, .15], [.73, .19]] });
  add("tv", "furniture", "svg:tv", "floor", .95, 25, "TV", { tap: "tv" });
  add("floorlamp", "furniture", "svg:floorlamp", "floor", 1.3, 10, "Lamp", { tap: "lamp" });
  add("bookshelf", "furniture", "svg:bookshelf", "floor", 1.3, 15, "Bookshelf", { surfaces: [[.3, .03], [.7, .03], [.5, .335]] });
  add("dresser", "furniture", "svg:dresser", "floor", .7, 12, "Drawers", { surfaces: [[.25, .07], [.5, .07], [.75, .07]], tap: "drawer" });
  add("bathtub", "furniture", "svg:bath", "floor", .7, 30, "Bath", { seats: [[.5, .567]], bath: true, tap: "bath" });
  add("sink", "furniture", "svg:vanity", "floor", .95, 15, "Sink", { tap: "water" });
  add("fridge", "furniture", "svg:fridge", "floor", 1.35, 20, "Fridge", { tap: "fridge" });
  add("stove", "furniture", "svg:stove", "floor", .82, 20, "Oven", { surfaces: [[.3, .15], [.7, .15]], tap: "oven" });
  add("counter", "furniture", "svg:counter", "floor", .8, 10, "Counter", { surfaces: [[.28, .06], [.72, .06]] });
  add("countersink", "furniture", "svg:countersink", "floor", 1.0, 12, "Kitchen sink", { surfaces: [[.15, .34], [.85, .34]], tap: "water" });
  add("rug", "furniture", "svg:rug_round", "rug", .3, 8, "Round rug");
  add("rugheart", "furniture", "svg:rug_heart", "rug", .34, 10, "Heart rug");
  add("rugstripe", "furniture", "svg:rug_stripe", "rug", .26, 8, "Stripy rug");
  // Decor
  add("plant", "decor", "png:tt_monstera", "floor", .9, 6, "Plant", { tap: "plant" });
  add("yucca", "decor", "png:tt_yucca", "floor", 1.15, 10, "Big plant", { tap: "plant" });
  add("pothos", "decor", "png:tt_pothos", "floor", .72, 6, "Leafy plant", { tap: "plant" });
  add("snakeplant", "decor", "png:tt_sansevieria", "floor", .7, 6, "Tall plant", { tap: "plant" });
  add("zzplant", "decor", "png:tt_zzplant", "prop", .55, 5, "Little plant", { tap: "plant" });
  add("cacti", "decor", "png:tt_cacti", "prop", .34, 4, "Cactus", { tap: "plant" });
  add("succulent", "decor", "png:tt_succulent", "prop", .24, 4, "Succulent", { tap: "plant" });
  add("sunflower", "decor", "png:fl_sunflower", "prop", .42, 6, "Sunflower", { tap: "plant" });
  add("tulip", "decor", "png:fl_tulip", "prop", .4, 5, "Tulip", { tap: "plant" });
  add("blossom", "decor", "png:fl_blossom", "prop", .32, 6, "Blossom", { tap: "plant" });
  add("picture", "decor", "png:fl_picture", "wall", .5, 10, "Picture");
  add("kittyframe", "decor", "svg:kittyframe", "wall", .58, 15, "Mimi photo");
  add("mirror", "decor", "svg:mirror", "wall", .62, 12, "Mirror");
  add("clock", "decor", "svg:clock", "wall", .46, 10, "Clock", { tap: "clock" });
  add("bunting", "decor", "svg:bunting", "wall", .42, 10, "Flags");
  add("heart", "decor", "png:fl_heart", "wall", .42, 8, "Heart");
  add("lantern", "decor", "png:fl_lantern", "wall", .45, 8, "Lantern");
  add("rainbow", "decor", "png:fl_rainbow", "wall", .5, 20, "Rainbow");
  add("kite", "decor", "png:fl_kite", "wall", .55, 10, "Kite");
  add("discoball", "decor", "png:fl_discoball", "wall", .42, 15, "Disco ball", { tap: "disco" });
  add("hooks", "decor", "png:tt_hooks", "wall", .36, 10, "Pot hooks");
  add("balloon", "decor", "png:fl_balloon", "floor", .85, 5, "Balloon", { sway: true });
  add("guitar", "decor", "png:fl_guitar", "floor", .6, 15, "Guitar", { tap: "guitar" });
  add("drum", "decor", "png:fl_drum", "floor", .5, 15, "Drum", { tap: "drum" });
  add("radio", "decor", "png:tt_radio", "prop", .38, 10, "Radio", { tap: "radio" });
  add("ball", "decor", "svg:ball", "floor", .3, 3, "Ball", { tap: "ball" });
  add("pillowred", "decor", "png:tt_pillow_red", "floor", .42, 6, "Red cushion");
  add("pillowblue", "decor", "png:tt_pillow_blue", "floor", .42, 6, "Blue cushion");
  add("pillowgreen", "decor", "png:tt_pillow_green", "floor", .26, 5, "Green cushion");
  add("basket", "decor", "png:tt_basket", "floor", .42, 8, "Basket");
  add("gift", "decor", "png:fl_gift", "prop", .36, 8, "Present");
  add("crown", "decor", "png:fl_crown", "prop", .28, 25, "Crown");
  add("books", "decor", "png:fl_books", "prop", .3, 6, "Books");
  add("yarn", "decor", "png:fl_yarn", "prop", .3, 4, "Yarn");
  add("puzzle", "decor", "png:fl_puzzle", "prop", .28, 4, "Puzzle");
  add("candle", "decor", "png:tt_candle", "prop", .3, 4, "Candle");
  add("towels", "decor", "png:tt_towels", "prop", .34, 5, "Towels");
  add("slippers", "decor", "png:tt_slippers", "floor", .16, 4, "Slippers");
  add("wateringcan", "decor", "png:tt_watering_can", "prop", .32, 5, "Watering can");
  add("kettle", "decor", "png:tt_kettle", "prop", .34, 6, "Kettle", { tap: "teapot" });
  add("toaster", "decor", "png:tt_toaster", "prop", .32, 8, "Toaster");
  add("pot", "decor", "png:tt_pot", "prop", .26, 5, "Pot");
  add("mug", "decor", "png:tt_mug", "prop", .22, 3, "Red mug");
  add("mugyellow", "decor", "png:tt_mug_yellow", "prop", .22, 3, "Yellow mug");
  add("cookiejar", "decor", "png:tt_cookie_jar", "prop", .4, 6, "Cookie jar");
  // Treats
  add("birthday", "treats", "png:tt_cake_birthday", "prop", .48, 10, "Birthday cake", { food: true });
  add("cakestrawberry", "treats", "png:tt_cake_strawberry", "prop", .42, 10, "Strawberry cake", { food: true });
  add("cakechocolate", "treats", "png:tt_cake_chocolate", "prop", .4, 10, "Chocolate cake", { food: true });
  add("cupcake", "treats", "png:tt_cupcake", "prop", .34, 4, "Cupcake", { food: true });
  add("donut", "treats", "png:tt_donut", "prop", .22, 4, "Doughnut", { food: true });
  add("muffin", "treats", "png:tt_muffin", "prop", .28, 4, "Muffin", { food: true });
  add("cinnamonroll", "treats", "png:tt_cinnamon_roll", "prop", .22, 4, "Cinnamon roll", { food: true });
  add("cookie", "treats", "png:tt_cookie", "prop", .17, 3, "Cookie", { food: true });
  add("dough", "treats", "svg:dough", "prop", .2, 3, "Cookie dough", { raw: "cookie" });
  add("waffle", "treats", "png:tt_waffle", "prop", .28, 5, "Waffles", { food: true });
  add("macaronpink", "treats", "png:tt_macaron_pink", "prop", .2, 3, "Pink macaron", { food: true });
  add("macaronblue", "treats", "png:tt_macaron_blue", "prop", .2, 3, "Blue macaron", { food: true });
  add("croissant", "treats", "png:tt_croissant", "prop", .17, 3, "Croissant", { food: true });
  add("pie", "treats", "png:tt_pie", "prop", .24, 6, "Cherry pie", { food: true });
  add("apple", "treats", "png:tt_apple", "prop", .2, 2, "Apple", { food: true });
  add("pastrystand", "treats", "png:tt_pastry_stand", "prop", .4, 10, "Cake stand", { food: true });
  add("teapot", "treats", "png:tt_teapot", "prop", .34, 6, "Teapot", { food: true, tap: "teapot" });
  add("cocoa", "treats", "png:fl_cocoa", "prop", .28, 4, "Hot cocoa", { food: true });
  add("icecream", "treats", "png:fl_icecream", "prop", .34, 4, "Ice cream", { food: true });
  add("strawberry", "treats", "png:fl_strawberry", "prop", .24, 3, "Strawberry", { food: true });
  add("watermelon", "treats", "png:fl_watermelon", "prop", .3, 5, "Watermelon", { food: true });
  add("pancakes", "treats", "png:fl_pancakes", "prop", .3, 5, "Pancakes", { food: true });
  add("bubbletea", "treats", "png:fl_bubbletea", "prop", .36, 5, "Bubble tea", { food: true });

  var BY = {};
  C.forEach(function (c) { BY[c.id] = c; });

  /* Wallpapers and floors (Paint drawer). The first of each is free. */
  var WALLS = [
    { id: "pink", name: "Pink stripes", price: 0 }, { id: "mint", name: "Mint squares", price: 10 },
    { id: "lilac", name: "Lilac dots", price: 0 }, { id: "lemon", name: "Lemon stripes", price: 10 },
    { id: "sky", name: "Sky clouds", price: 10 }, { id: "peach", name: "Peach hearts", price: 10 }
  ];
  var FLOORS = [
    { id: "wood", name: "Wood floor", price: 0 }, { id: "pinktile", name: "Pink tiles", price: 10 },
    { id: "mintcheck", name: "Mint tiles", price: 0 }, { id: "carpet", name: "Lilac carpet", price: 0 }
  ];
  var ROOMS = [
    { id: "living", name: "Living room", wall: "pink", floor: "wood" },
    { id: "bedroom", name: "Bedroom", wall: "lilac", floor: "carpet" },
    { id: "kitchen", name: "Kitchen", wall: "mint", floor: "mintcheck" }
  ];
  var CATS = [
    { id: "friends", name: "Friends" }, { id: "furniture", name: "Furniture" }, { id: "decor", name: "Decor" },
    { id: "treats", name: "Treats" }, { id: "paint", name: "Paint" }
  ];
  // the fixed wall shelf in every room: 3 spots for small things (world coordinates)
  var SHELF = { x0: 660, x1: 900, y: 214, spots: [[692, 214], [757, 214], [822, 214]] };
  // the built-in kitchen counter run (drawn as part of the kitchen; it cannot be moved or put away)
  var KCOUNTER = { x0: 462, x1: 912, top: 302, foot: 472, spots: [[505, 302], [568, 302], [632, 302], [712, 300]] };
  function fixedSpots(key, room) {
    if (key === "shelf") return { spots: SHELF.spots, s: .8, z: 30 };
    if (key === "kcounter" && room === "kitchen") return { spots: KCOUNTER.spots, s: .86, z: 30 };
    return null;
  }
  function fixedKeys(room) { return room === "kitchen" ? ["kcounter", "shelf"] : ["shelf"]; }
  // parts of the back wall where wall things may not hang (window with curtains, wall shelf, kitchen counter)
  function winRect(room) {
    var x = room === "kitchen" ? 170 : room === "bedroom" ? 140 : 130, w = room === "kitchen" ? 220 : 190, y = room === "kitchen" ? 110 : 92, h = room === "kitchen" ? 170 : 210;
    if (room === "kitchen") return { x: x - 28, y: y - 34, w: w + 56, h: h + 50 };
    return { x: x - 62, y: y - 44, w: w + 124, h: h + 82 };
  }
  function blockedRects(room) {
    var r = [winRect(room), { x: SHELF.x0 - 8, y: 96, w: SHELF.x1 - SHELF.x0 + 16, h: 150 }, { x: 430, y: 0, w: 140, h: 145 }];
    if (room === "kitchen") r.push({ x: KCOUNTER.x0 - 8, y: 250, w: KCOUNTER.x1 - KCOUNTER.x0 + 16, h: 230 });
    return r;
  }

  /* ---------- helpers ---------- */
  var RM = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : { matches: false };
  function rm() { return !!RM.matches; }
  function hostP() { return window.P; }
  function doSave() { try { if (typeof window.save === "function") window.save(); } catch (e) {} }
  function doTop() { try { if (typeof window.renderTop === "function") window.renderTop(); } catch (e) {} }
  function snd(f, d, t, g) { try { if (typeof window.tone === "function") window.tone(f, d, t, g); } catch (e) {} }
  function say(text) { try { if (typeof window.speak === "function") window.speak(text); } catch (e) {} }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function depthT(footY) { return clamp((footY - BACK_Y) / (FRONT_Y - BACK_Y), 0, 1); }
  function depthScale(footY) { return .82 + .18 * clamp((footY - FOOT_MIN) / (FOOT_MAX - FOOT_MIN), 0, 1); }
  function aspectOf(c) {
    if (c.art === "char") return 200 / 260;
    var ov = artOver(c); if (ov && ov.aspect) return ov.aspect;
    var p = c.art.split(":");
    return p[0] === "png" ? (ASPECT[p[1]] || 1) : (SVG_ASPECT[p[1]] || 1);
  }
  function boxH(c) { return (c.art === "char" ? CHAR_BOX : c.h) * H; }
  function sitter(c) { return c.zone === "char" || c.zone === "pet"; }
  function roomOf(t) { return t.room || "living"; }

  /* ---------- SVG drawings (our own, outlined like the game's buttons) ---------- */
  var S = 'stroke="' + INK + '" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"';
  var S4 = 'stroke="' + INK + '" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"';
  var SHINE = 'fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="6" stroke-linecap="round"';
  function svgWrap(vb, inner, cls) {
    return '<svg class="' + (cls || "") + '" viewBox="' + vb + '" preserveAspectRatio="xMidYMax meet" aria-hidden="true" focusable="false">' + inner + "</svg>";
  }
  function sofaSVG(main, light) {
    main = main || "url(#hg-pink)"; light = light || "url(#hg-pinkL)";
    return svgWrap("0 0 300 175",
      '<rect x="38" y="160" width="18" height="13" rx="4" fill="url(#hg-woodD)" ' + S4 + '/><rect x="244" y="160" width="18" height="13" rx="4" fill="url(#hg-woodD)" ' + S4 + '/>' +
      '<path d="M40 116 V54 Q40 18 76 18 H224 Q260 18 260 54 V116 Z" fill="' + main + '" ' + S + '/>' +
      '<path d="M62 44 Q66 32 84 32 H150" ' + SHINE + '/>' +
      '<path d="M150 26 V100" stroke="' + INK + '" stroke-opacity=".25" stroke-width="4" fill="none"/>' +
      '<circle cx="100" cy="62" r="5" fill="' + INK + '" opacity=".25"/><circle cx="200" cy="62" r="5" fill="' + INK + '" opacity=".25"/>' +
      '<rect x="34" y="126" width="232" height="36" rx="13" fill="' + main + '" ' + S + '/>' +
      '<rect x="52" y="98" width="100" height="40" rx="17" fill="' + light + '" ' + S + '/>' +
      '<rect x="148" y="98" width="100" height="40" rx="17" fill="' + light + '" ' + S + '/>' +
      '<path d="M66 108 H120 M162 108 H216" ' + SHINE + ' stroke-width="5"/>' +
      '<rect x="8" y="78" width="54" height="84" rx="25" fill="' + main + '" ' + S + '/>' +
      '<rect x="238" y="78" width="54" height="84" rx="25" fill="' + main + '" ' + S + '/>' +
      '<path d="M22 94 Q26 88 36 88 M252 94 Q256 88 266 88" ' + SHINE + ' stroke-width="5"/>');
  }
  function armchairSVG() {
    return svgWrap("0 0 170 175",
      '<rect x="22" y="160" width="16" height="13" rx="4" fill="url(#hg-woodD)" ' + S4 + '/><rect x="132" y="160" width="16" height="13" rx="4" fill="url(#hg-woodD)" ' + S4 + '/>' +
      '<path d="M30 116 V50 Q30 16 64 16 H106 Q140 16 140 50 V116 Z" fill="url(#hg-mint)" ' + S + '/>' +
      '<path d="M48 44 Q52 30 70 30 H92" ' + SHINE + '/>' +
      '<circle cx="85" cy="60" r="5" fill="' + INK + '" opacity=".22"/>' +
      '<rect x="24" y="126" width="122" height="36" rx="13" fill="url(#hg-mint)" ' + S + '/>' +
      '<rect x="40" y="98" width="90" height="40" rx="17" fill="url(#hg-mintL)" ' + S + '/>' +
      '<path d="M54 108 H104" ' + SHINE + ' stroke-width="5"/>' +
      '<rect x="6" y="78" width="46" height="84" rx="22" fill="url(#hg-mint)" ' + S + '/>' +
      '<rect x="118" y="78" width="46" height="84" rx="22" fill="url(#hg-mint)" ' + S + '/>');
  }
  function heartPath(cx, cy, r) {
    return "M" + cx + " " + (cy + r * .9) + " C" + (cx - r * 1.6) + " " + (cy - r * .2) + " " + (cx - r * .7) + " " + (cy - r * 1.3) + " " + cx + " " + (cy - r * .45) +
      " C" + (cx + r * .7) + " " + (cy - r * 1.3) + " " + (cx + r * 1.6) + " " + (cy - r * .2) + " " + cx + " " + (cy + r * .9) + " Z";
  }
  function bedSVG(frontOnly) {
    // three-quarter front view: headboard against the back wall, duvet coming toward the viewer
    var hearts = "";
    [[70, 168], [118, 176], [168, 168], [218, 176], [252, 166], [96, 150], [196, 150]].forEach(function (p) { hearts += '<path d="' + heartPath(p[0], p[1], 6) + '" fill="#fff" opacity=".9"/>'; });
    var duvet = '<path d="M30 118 H270 Q280 118 282 128 L288 150 V184 Q288 194 278 194 H22 Q12 194 12 184 V150 L18 128 Q20 118 30 118 Z" fill="url(#hg-pinkL)" ' + S + '/>' +
      '<path d="M14 150 H286" stroke="' + INK + '" stroke-width="4" fill="none"/>' + hearts +
      '<path d="M40 128 H200" ' + SHINE + ' stroke-width="5"/>' +
      '<rect x="6" y="186" width="288" height="14" rx="6" fill="url(#hg-wood)" ' + S4 + '/>';
    if (frontOnly) return svgWrap("0 0 300 210", '<path d="M30 118 H270" stroke="#fff" stroke-width="10" stroke-linecap="round"/>' + duvet);
    return svgWrap("0 0 300 210",
      '<rect x="22" y="190" width="18" height="16" rx="4" fill="url(#hg-woodD)" ' + S4 + '/><rect x="260" y="190" width="18" height="16" rx="4" fill="url(#hg-woodD)" ' + S4 + '/>' +
      '<path d="M34 112 V50 Q34 10 76 10 H224 Q266 10 266 50 V112 Z" fill="url(#hg-pink)" ' + S + '/>' +
      '<path d="' + heartPath(150, 44, 16) + '" fill="#fff" ' + S4 + '/>' +
      '<path d="M56 46 Q60 26 84 24 H120" ' + SHINE + '/>' +
      '<path d="M46 96 H254 L276 140 H24 Z" fill="#fff" ' + S + '/>' +
      '<rect x="98" y="72" width="104" height="38" rx="18" fill="url(#hg-white)" ' + S + '/>' +
      '<path d="M112 84 Q130 78 160 81" ' + SHINE + ' stroke="#d9cbff" stroke-opacity="1" stroke-width="5"/>' + duvet);
  }
  function chairSVG() {
    return svgWrap("0 0 120 170",
      '<rect x="20" y="104" width="12" height="62" rx="5" fill="url(#hg-woodD)" ' + S4 + '/><rect x="88" y="104" width="12" height="62" rx="5" fill="url(#hg-woodD)" ' + S4 + '/>' +
      '<path d="M22 100 V34 Q22 8 60 8 Q98 8 98 34 V100 Z" fill="url(#hg-wood)" ' + S + '/>' +
      '<path d="' + heartPath(60, 50, 16) + '" fill="url(#hg-pinkL)" ' + S4 + '/>' +
      '<path d="M34 34 Q38 20 54 18" ' + SHINE + '/>' +
      '<rect x="8" y="98" width="104" height="22" rx="10" fill="url(#hg-wood)" ' + S + '/>' +
      '<rect x="14" y="84" width="92" height="20" rx="10" fill="url(#hg-pink)" ' + S + '/><path d="M26 90 H70" ' + SHINE + ' stroke-width="4"/>');
  }
  function tableSVG() {
    var sc = "M8 30";
    for (var i = 0; i < 8; i++) sc += " q" + (184 / 16) + " 18 " + (184 / 8) + " 0";
    return svgWrap("0 0 200 150",
      '<ellipse cx="100" cy="138" rx="44" ry="9" fill="url(#hg-woodD)" ' + S4 + '/>' +
      '<rect x="88" y="40" width="24" height="98" rx="6" fill="url(#hg-wood)" ' + S4 + '/>' +
      '<ellipse cx="100" cy="30" rx="94" ry="22" fill="#fff" ' + S + '/>' +
      '<path d="' + sc + ' Q100 66 8 30 Z" fill="#ff9cc2" ' + S4 + '/>' +
      '<ellipse cx="100" cy="27" rx="78" ry="14" fill="url(#hg-white)"/>' +
      '<path d="M40 22 Q60 14 96 14" ' + SHINE + ' stroke="#ffd3e2" stroke-opacity="1" stroke-width="5"/>');
  }
  // the tub: drawn whole, and its front again over a friend sitting in it (front only)
  function bathSVG(frontOnly) {
    var bubbles = "";
    [[34, 64, 9], [52, 70, 11], [74, 74, 8], [168, 74, 9], [190, 70, 12], [210, 63, 9], [120, 78, 6]].forEach(function (b) {
      bubbles += '<circle cx="' + b[0] + '" cy="' + b[1] + '" r="' + b[2] + '" fill="#fff" stroke="' + INK + '" stroke-width="3"/><circle cx="' + (b[0] - b[2] * .35) + '" cy="' + (b[1] - b[2] * .35) + '" r="' + (b[2] * .25) + '" fill="#cdeeff"/>';
    });
    var back = '<ellipse cx="120" cy="58" rx="108" ry="18" fill="#fff" ' + S + '/><ellipse cx="120" cy="60" rx="94" ry="12" fill="#8fd6ff"/>' +
      '<path d="M44 56 Q80 50 110 52" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".8"/>' +
      '<path d="M206 40 V22 Q206 12 196 12 H186" fill="none" stroke="#b9c3cc" stroke-width="7" stroke-linecap="round"/><path d="M206 40 V22 Q206 12 196 12 H186" fill="none" stroke="' + INK + '" stroke-width="2" opacity=".5"/>';
    var front = '<circle cx="46" cy="142" r="8" fill="#ffc94a" ' + S4 + '/><circle cx="194" cy="142" r="8" fill="#ffc94a" ' + S4 + '/>' +
      '<path d="M12 58 Q120 80 228 58 Q230 138 170 138 H70 Q10 138 12 58 Z" fill="url(#hg-pinkL)" ' + S + '/>' +
      '<path d="M12 58 Q120 80 228 58" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round"/><path d="M12 58 Q120 80 228 58" fill="none" stroke="' + INK + '" stroke-width="3" transform="translate(0 6)" opacity=".35"/>' +
      '<path d="' + heartPath(120, 104, 12) + '" fill="#fff" ' + S4 + '/>' +
      '<path d="M30 92 Q34 112 52 122" ' + SHINE + '/>' + bubbles;
    return svgWrap("0 0 240 150", (frontOnly ? "" : back) + front);
  }
  function vanitySVG() {
    return svgWrap("0 0 140 190",
      '<path d="M70 70 V36 Q70 26 82 26 H92" fill="none" stroke="#b9c3cc" stroke-width="9" stroke-linecap="round"/><path d="M70 70 V36 Q70 26 82 26 H92" fill="none" stroke="' + INK + '" stroke-width="3" opacity=".5"/>' +
      '<rect x="14" y="84" width="112" height="96" rx="12" fill="url(#hg-mintL)" ' + S + '/>' +
      '<rect x="26" y="98" width="40" height="70" rx="8" fill="#fff" ' + S4 + '/><rect x="74" y="98" width="40" height="70" rx="8" fill="#fff" ' + S4 + '/>' +
      '<circle cx="58" cy="132" r="4" fill="#ff6f9f"/><circle cx="82" cy="132" r="4" fill="#ff6f9f"/>' +
      '<path d="M8 72 H132 Q132 92 116 92 H24 Q8 92 8 72 Z" fill="#fff" ' + S + '/><ellipse cx="70" cy="72" rx="62" ry="10" fill="#fff" ' + S + '/><ellipse cx="70" cy="73" rx="44" ry="6" fill="#bfe9ff"/>');
  }
  function fridgeSVG(open) {
    if (open) return svgWrap("0 0 120 200",
      '<rect x="18" y="186" width="14" height="10" rx="3" fill="' + INK + '"/><rect x="88" y="186" width="14" height="10" rx="3" fill="' + INK + '"/>' +
      '<rect x="8" y="6" width="104" height="184" rx="20" fill="url(#hg-mint)" ' + S + '/>' +
      '<rect x="18" y="16" width="84" height="164" rx="12" fill="#f4fffb" ' + S4 + '/>' +
      '<rect x="18" y="16" width="84" height="164" rx="12" fill="#fff6c8" opacity=".55"/>' +
      '<path d="M20 70 H100 M20 120 H100" stroke="' + INK + '" stroke-width="4"/>' +
      // top shelf: a cake slice and a pink milk carton; middle: apple and a jelly; bottom: a big strawberry
      '<path d="M30 64 L62 64 L62 50 Z" fill="#ffd3e2" ' + S4 + '/><path d="M30 64 L62 50" stroke="#ff6f9f" stroke-width="4"/><circle cx="56" cy="46" r="5" fill="#e8203f" ' + S4 + '/>' +
      '<path d="M72 64 V40 L80 32 L88 40 V64 Z" fill="#ffb3cf" ' + S4 + '/>' +
      '<circle cx="40" cy="104" r="12" fill="#ff5c6c" ' + S4 + '/><path d="M40 92 Q44 86 50 88" fill="none" stroke="#3a9a52" stroke-width="4" stroke-linecap="round"/>' +
      '<path d="M66 116 Q66 96 80 96 Q94 96 94 116 Z" fill="#a8e6ff" ' + S4 + '/>' +
      '<path d="M50 168 Q40 150 50 138 Q60 132 70 138 Q80 150 70 168 Q60 176 50 168 Z" fill="#ff5c6c" ' + S4 + '/><path d="M52 138 Q60 128 68 138" fill="#63d3b3" ' + S4 + '/>' +
      // the open door, swung out to the right
      '<path d="M112 14 L140 4 V196 L112 188 Z" fill="url(#hg-mint)" ' + S + '/><rect x="126" y="70" width="6" height="44" rx="3" fill="#fff" ' + S4 + '/>');
    return svgWrap("0 0 120 200",
      '<rect x="18" y="186" width="14" height="10" rx="3" fill="' + INK + '"/><rect x="88" y="186" width="14" height="10" rx="3" fill="' + INK + '"/>' +
      '<rect x="8" y="6" width="104" height="184" rx="20" fill="url(#hg-mint)" ' + S + '/>' +
      '<path d="M8 70 H112" stroke="' + INK + '" stroke-width="5"/>' +
      '<rect x="20" y="28" width="8" height="30" rx="4" fill="#fff" ' + S4 + '/><rect x="20" y="86" width="8" height="44" rx="4" fill="#fff" ' + S4 + '/>' +
      '<path d="M40 20 Q46 14 64 14" ' + SHINE + '/><path d="M96 84 V170" ' + SHINE + ' stroke-opacity=".35"/>' +
      '<path d="' + heartPath(72, 102, 10) + '" fill="#ff6f9f" ' + S4 + '/><circle cx="58" cy="138" r="7" fill="#ffc94a" ' + S4 + '/><rect x="74" y="34" width="22" height="18" rx="4" fill="#fff" ' + S4 + ' transform="rotate(-8 85 43)"/>');
  }
  function stoveSVG(on) {
    return svgWrap("0 0 160 150", (on ? '<circle cx="80" cy="96" r="70" fill="url(#hg-glowR)"/>' : "") +
      '<rect x="16" y="138" width="14" height="10" rx="3" fill="' + INK + '"/><rect x="130" y="138" width="14" height="10" rx="3" fill="' + INK + '"/>' +
      '<rect x="8" y="22" width="144" height="118" rx="16" fill="#fff" ' + S + '/>' +
      '<rect x="4" y="16" width="152" height="16" rx="7" fill="url(#hg-pink)" ' + S4 + '/>' +
      '<ellipse cx="48" cy="17" rx="24" ry="5" fill="#5a4651"/><ellipse cx="112" cy="17" rx="24" ry="5" fill="#5a4651"/>' +
      '<circle cx="34" cy="48" r="7" fill="#ffc94a" ' + S4 + '/><circle cx="58" cy="48" r="7" fill="#63d3b3" ' + S4 + '/><circle cx="102" cy="48" r="7" fill="#ff6f9f" ' + S4 + '/><circle cx="126" cy="48" r="7" fill="#74c8ff" ' + S4 + '/>' +
      '<rect x="24" y="64" width="112" height="62" rx="12" fill="#5a4651" ' + S4 + '/><rect x="34" y="72" width="92" height="44" rx="8" fill="' + (on ? "#ffe27a" : "#ffb86b") + '" opacity="' + (on ? 1 : .85) + '"/>' +
      (on ? '<path d="M64 106 Q60 94 70 86 Q70 96 76 98 Q80 90 78 82 Q92 92 88 106 Z" fill="#ff8a3d" ' + S4 + '/><path d="M40 13 Q48 3 56 13 M104 13 Q112 3 120 13" fill="none" stroke="#ff8a3d" stroke-width="5" stroke-linecap="round"/>' : "") +
      '<path d="M40 80 Q46 74 58 74" stroke="#fff" stroke-opacity=".7" stroke-width="5" fill="none" stroke-linecap="round"/><rect x="50" y="58" width="60" height="8" rx="4" fill="#d6c6cf" ' + S4 + '/>');
  }
  function counterSVG() {
    return svgWrap("0 0 180 140",
      '<rect x="12" y="18" width="156" height="114" rx="10" fill="url(#hg-mintL)" ' + S + '/>' +
      '<rect x="24" y="32" width="62" height="88" rx="8" fill="#fff" ' + S4 + '/><rect x="94" y="32" width="62" height="88" rx="8" fill="#fff" ' + S4 + '/>' +
      '<path d="' + heartPath(76, 74, 6) + '" fill="#ff6f9f"/><path d="' + heartPath(104, 74, 6) + '" fill="#ff6f9f"/>' +
      '<rect x="4" y="4" width="172" height="20" rx="8" fill="url(#hg-wood)" ' + S + '/><path d="M16 11 H100" ' + SHINE + ' stroke-width="4"/>');
  }
  function countersinkSVG() {
    return svgWrap("0 0 180 180",
      '<path d="M90 64 V26 Q90 14 104 14 H116 V24" fill="none" stroke="#b9c3cc" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/><path d="M90 64 V26 Q90 14 104 14 H116 V24" fill="none" stroke="' + INK + '" stroke-width="3" opacity=".5"/>' +
      '<rect x="12" y="72" width="156" height="100" rx="10" fill="url(#hg-mintL)" ' + S + '/>' +
      '<rect x="24" y="86" width="62" height="74" rx="8" fill="#fff" ' + S4 + '/><rect x="94" y="86" width="62" height="74" rx="8" fill="#fff" ' + S4 + '/>' +
      '<circle cx="76" cy="122" r="4" fill="#ff6f9f"/><circle cx="104" cy="122" r="4" fill="#ff6f9f"/>' +
      '<rect x="4" y="58" width="172" height="20" rx="8" fill="url(#hg-wood)" ' + S + '/><ellipse cx="90" cy="64" rx="40" ry="6" fill="#bfe9ff" ' + S4 + '/>');
  }
  function mirrorSVG() {
    return svgWrap("0 0 120 150",
      '<path d="M44 14 Q60 2 76 14" fill="none" stroke="' + INK + '" stroke-width="3"/>' +
      '<ellipse cx="60" cy="80" rx="52" ry="64" fill="url(#hg-pink)" ' + S + '/>' +
      '<ellipse cx="60" cy="80" rx="39" ry="51" fill="url(#hg-sky)" ' + S4 + '/>' +
      '<path d="M38 58 L58 40 M40 76 L70 48" stroke="#fff" stroke-opacity=".85" stroke-width="7" stroke-linecap="round"/>' +
      '<path d="M48 16 L60 22 L72 16 L72 30 L60 24 L48 30 Z" fill="#ff6f9f" ' + S4 + '/>');
  }
  function tvSVG(state) {
    var st = (state || 0) % 4, screen;
    if (st === 0) screen = '<rect x="32" y="56" width="112" height="84" rx="14" fill="url(#hg-sky)"/>' +
      '<path d="M50 132 A38 38 0 0 1 126 132" fill="none" stroke="#ff6f9f" stroke-width="9"/><path d="M59 132 A29 29 0 0 1 117 132" fill="none" stroke="#ffc94a" stroke-width="9"/><path d="M68 132 A20 20 0 0 1 108 132" fill="none" stroke="#63d3b3" stroke-width="9"/>' +
      '<ellipse cx="62" cy="80" rx="14" ry="8" fill="#fff"/><ellipse cx="118" cy="74" rx="11" ry="6" fill="#fff"/>';
    else if (st === 1) screen = '<rect x="32" y="56" width="112" height="84" rx="14" fill="#ffd3e2"/><path d="' + heartPath(88, 98, 22) + '" fill="#ff6f9f" ' + S4 + '/>' +
      '<circle cx="54" cy="74" r="4" fill="#fff"/><circle cx="124" cy="120" r="4" fill="#fff"/><circle cx="120" cy="70" r="3" fill="#fff"/>';
    else if (st === 2) screen = '<rect x="32" y="56" width="112" height="84" rx="14" fill="#3d3570"/><circle cx="116" cy="80" r="13" fill="#ffe08a"/><circle cx="122" cy="76" r="11" fill="#3d3570"/>' +
      starPath(60, 82, 7, "#ffe08a") + starPath(84, 112, 5, "#fff") + starPath(126, 120, 6, "#ffe08a") + starPath(52, 124, 4, "#fff");
    else screen = '<rect x="32" y="56" width="112" height="84" rx="14" fill="#55465e"/><path d="M48 70 L70 64 M48 82 L60 79" stroke="#fff" stroke-opacity=".35" stroke-width="6" stroke-linecap="round"/>';
    return svgWrap("0 0 200 220",
      '<path d="M100 40 L70 10 M100 40 L132 8" stroke="' + INK + '" stroke-width="5" stroke-linecap="round"/><circle cx="70" cy="10" r="7" fill="#ff6f9f" ' + S4 + '/><circle cx="132" cy="8" r="7" fill="#ffc94a" ' + S4 + '/>' +
      '<rect x="40" y="152" width="120" height="54" rx="10" fill="url(#hg-wood)" ' + S + '/><path d="M40 178 H160" stroke="' + INK + '" stroke-width="4"/><circle cx="100" cy="166" r="4" fill="' + INK + '"/><circle cx="100" cy="192" r="4" fill="' + INK + '"/>' +
      '<rect x="48" y="204" width="12" height="12" rx="3" fill="url(#hg-woodD)" ' + S4 + '/><rect x="140" y="204" width="12" height="12" rx="3" fill="url(#hg-woodD)" ' + S4 + '/>' +
      '<rect x="14" y="36" width="172" height="122" rx="28" fill="url(#hg-lilac)" ' + S + '/>' +
      '<g class="hg-tvscreen">' + screen + '</g><rect x="32" y="56" width="112" height="84" rx="14" fill="none" ' + S + '/>' +
      '<path d="M42 66 Q46 60 56 60" ' + SHINE + ' stroke-width="5"/>' +
      '<circle cx="166" cy="76" r="8" fill="#ffc94a" ' + S4 + '/><circle cx="166" cy="106" r="8" fill="#63d3b3" ' + S4 + '/>');
  }
  function starPath(cx, cy, r, fill) {
    var d = "";
    for (var i = 0; i < 10; i++) { var a = Math.PI / 5 * i - Math.PI / 2, rr = i % 2 ? r * .45 : r; d += (i ? "L" : "M") + (cx + rr * Math.cos(a)).toFixed(1) + " " + (cy + rr * Math.sin(a)).toFixed(1); }
    return '<path d="' + d + 'Z" fill="' + fill + '"/>';
  }
  function floorlampSVG(on) {
    return svgWrap("0 0 110 290",
      (on ? '<circle class="hg-glow" cx="55" cy="62" r="54" fill="url(#hg-glowR)"/>' : "") +
      '<ellipse cx="55" cy="274" rx="34" ry="11" fill="url(#hg-pink)" ' + S + '/>' +
      '<rect x="50" y="86" width="10" height="186" rx="4" fill="#fff" ' + S4 + '/>' +
      '<path d="M20 96 L36 22 Q38 16 44 16 H66 Q72 16 74 22 L90 96 Z" fill="' + (on ? "url(#hg-sunOn)" : "url(#hg-sun)") + '" ' + S + '/>' +
      '<path d="M36 40 L42 24" ' + SHINE + '/>' +
      '<path d="M20 96 H90" stroke="' + INK + '" stroke-width="5"/><path d="M26 90 H84" stroke="#ff6f9f" stroke-width="5"/>');
  }
  function bookshelfSVG() {
    var books = "", cols = ["#ff6f9f", "#74c8ff", "#ffc94a", "#63d3b3", "#a98bff", "#ff9a6b"];
    function row(y0, y1, seed) {
      var x = 26, i = seed;
      while (x < 150) {
        var w = 12 + (i * 7) % 9, h = (y1 - y0) - 6 - (i * 11) % 18;
        if (x + w > 154) break;
        books += '<rect x="' + x + '" y="' + (y1 - h) + '" width="' + w + '" height="' + h + '" rx="3" fill="' + cols[i % 6] + '" ' + S4 + '/>';
        books += '<path d="M' + (x + 3) + " " + (y1 - h + 8) + " H" + (x + w - 3) + '" stroke="#fff" stroke-opacity=".7" stroke-width="3"/>';
        x += w + 1; i++;
        if (i % 4 === 3) x += 8;
      }
    }
    row(100, 168, 1); row(178, 246, 4);
    return svgWrap("0 0 180 270",
      '<rect x="8" y="8" width="164" height="254" rx="12" fill="url(#hg-wood)" ' + S + '/>' +
      '<rect x="22" y="22" width="136" height="226" rx="6" fill="#e2a970" ' + S4 + '/>' +
      books +
      '<rect x="16" y="88" width="148" height="12" rx="4" fill="url(#hg-wood)" ' + S4 + '/>' +
      '<rect x="16" y="168" width="148" height="12" rx="4" fill="url(#hg-wood)" ' + S4 + '/>' +
      '<path d="M20 16 H120" ' + SHINE + ' stroke-width="5"/>');
  }
  function dresserSVG() {
    return svgWrap("0 0 170 150",
      '<rect x="22" y="134" width="14" height="13" rx="3" fill="url(#hg-woodD)" ' + S4 + '/><rect x="134" y="134" width="14" height="13" rx="3" fill="url(#hg-woodD)" ' + S4 + '/>' +
      '<rect x="14" y="24" width="142" height="114" rx="12" fill="url(#hg-pinkL)" ' + S + '/>' +
      '<rect x="26" y="38" width="118" height="40" rx="9" fill="#fff" ' + S4 + '/><rect x="26" y="86" width="118" height="40" rx="9" fill="#fff" ' + S4 + '/>' +
      '<path d="' + heartPath(85, 58, 7) + '" fill="#ff6f9f" ' + S4 + '/><path d="' + heartPath(85, 106, 7) + '" fill="#ff6f9f" ' + S4 + '/>' +
      '<rect x="4" y="8" width="162" height="20" rx="9" fill="url(#hg-wood)" ' + S + '/><path d="M16 14 H110" ' + SHINE + ' stroke-width="4"/>');
  }
  function rugSVG(kind) {
    if (kind === "rug_heart") return svgWrap("0 0 260 110",
      '<path d="M130 104 C40 80 4 52 22 28 C38 6 88 6 130 30 C172 6 222 6 238 28 C256 52 220 80 130 104 Z" fill="#ff8fb7" ' + S + '/>' +
      '<path d="M130 88 C66 70 40 50 52 34 C64 20 98 22 130 42 C162 22 196 20 208 34 C220 50 194 70 130 88 Z" fill="#ffd0e2"/>' +
      '<path d="M60 36 Q80 24 104 30" ' + SHINE + ' stroke-width="5"/>');
    if (kind === "rug_stripe") {
      var st = "";
      for (var i = 0; i < 7; i++) { var x0 = 30 + i * 40, x1 = 6 + i * 47.4; st += '<path d="M' + x0 + ' 10 H' + (x0 + 20) + ' L' + (x1 + 23.7) + ' 80 H' + x1 + ' Z" fill="#8fe0c8"/>'; }
      return svgWrap("0 0 340 90",
        '<path d="M30 10 H310 L334 80 H6 Z" fill="#fff" ' + S + '/>' + st +
        '<path d="M30 10 H310 L334 80 H6 Z" fill="none" ' + S + '/>');
    }
    var dots = "";
    for (var k = 0; k < 18; k++) { var a = k / 18 * Math.PI * 2; dots += '<circle cx="' + (160 + 136 * Math.cos(a)).toFixed(1) + '" cy="' + (50 + 37 * Math.sin(a)).toFixed(1) + '" r="4.5" fill="#fff"/>'; }
    return svgWrap("0 0 320 100",
      '<ellipse cx="160" cy="50" rx="154" ry="45" fill="#ff8fb7" ' + S + '/>' + dots +
      '<ellipse cx="160" cy="50" rx="116" ry="31" fill="#ffc2d9"/><ellipse cx="160" cy="50" rx="76" ry="19" fill="#fff0f6"/>' +
      '<path d="' + heartPath(160, 50, 10) + '" fill="#ff8fb7" transform="translate(0 4) scale(1 .7) translate(0 18)"/>');
  }
  function clockSVG() {
    var ticks = "";
    for (var i = 0; i < 12; i++) { var a = i / 12 * Math.PI * 2; ticks += '<circle cx="' + (65 + 31 * Math.sin(a)).toFixed(1) + '" cy="' + (72 - 31 * Math.cos(a)).toFixed(1) + '" r="' + (i % 3 ? 2.5 : 4) + '" fill="' + (i % 3 ? "#e0a7bd" : "#ff6f9f") + '"/>'; }
    return svgWrap("0 0 130 130",
      '<path d="M22 40 L24 6 L52 24 Z" fill="url(#hg-pink)" ' + S + '/><path d="M108 40 L106 6 L78 24 Z" fill="url(#hg-pink)" ' + S + '/>' +
      '<circle cx="65" cy="72" r="54" fill="url(#hg-pink)" ' + S + '/><circle cx="65" cy="72" r="41" fill="#fff" ' + S4 + '/>' + ticks +
      '<path class="hg-hand-m" d="M65 72 L65 46" stroke="' + INK + '" stroke-width="6" stroke-linecap="round"/><path d="M65 72 L84 80" stroke="' + INK + '" stroke-width="5" stroke-linecap="round"/>' +
      '<path class="hg-hand-s" d="M65 76 L65 40" stroke="#ff6f9f" stroke-width="2.5" stroke-linecap="round"/><circle cx="65" cy="72" r="5" fill="#ffc94a" ' + S4 + '/>' +
      '<path d="M30 52 Q36 34 52 26" ' + SHINE + ' stroke-width="5"/>');
  }
  function kittyframeSVG() {
    var head = KC() ? KC().headInner("kitty") : "";
    return svgWrap("0 0 120 140",
      '<path d="M30 30 L60 6 L90 30" fill="none" stroke="' + INK + '" stroke-width="3"/><circle cx="60" cy="6" r="4" fill="' + INK + '"/>' +
      '<rect x="8" y="24" width="104" height="112" rx="16" fill="url(#hg-sun)" ' + S + '/>' +
      '<rect x="20" y="36" width="80" height="88" rx="9" fill="#e0f3ff" ' + S4 + '/>' +
      '<g transform="translate(24 50) scale(.72)">' + head + '</g>' +
      '<path d="' + heartPath(98, 120, 8) + '" fill="#ff6f9f" ' + S4 + '/>');
  }
  function buntingSVG() {
    var f = "", cols = ["#ff6f9f", "#ffc94a", "#63d3b3", "#74c8ff", "#a98bff", "#ff9a6b", "#ff6f9f"];
    for (var i = 0; i < 7; i++) {
      var x = 30 + i * 43, t = (x - 8) / 304, y = 14 + 4 * 32 * t * (1 - t) * 1.0;
      f += '<path d="M' + (x - 16) + " " + (y - 1) + " L" + (x + 16) + " " + (y + 1) + " L" + x + " " + (y + 44) + ' Z" fill="' + cols[i] + '" ' + S4 + '/>';
    }
    return svgWrap("0 0 320 90", '<path d="M6 12 Q160 76 314 12" fill="none" stroke="' + INK + '" stroke-width="4"/>' + f +
      '<circle cx="6" cy="12" r="5" fill="' + INK + '"/><circle cx="314" cy="12" r="5" fill="' + INK + '"/>');
  }
  function ballSVG() {
    return svgWrap("0 0 100 100",
      '<circle cx="50" cy="52" r="44" fill="#fff" ' + S + '/>' +
      '<path d="M50 8 Q22 30 22 52 Q22 76 50 96 Q34 70 34 52 Q34 32 50 8 Z" fill="#ff8fb7" ' + S4 + '/>' +
      '<path d="M50 8 Q78 30 78 52 Q78 76 50 96 Q66 70 66 52 Q66 32 50 8 Z" fill="#74c8ff" ' + S4 + '/>' +
      '<circle cx="50" cy="52" r="44" fill="none" ' + S + '/><path d="M24 34 Q30 22 42 18" ' + SHINE + '/>');
  }
  function doughSVG() {
    return svgWrap("0 0 130 100",
      '<path d="M14 84 Q4 64 20 50 Q22 26 48 24 Q62 8 82 20 Q110 18 114 46 Q128 62 116 82 Q104 96 66 94 Q24 96 14 84 Z" fill="#f6dcae" ' + S + '/>' +
      '<circle cx="44" cy="54" r="6" fill="#7a4a2a"/><circle cx="74" cy="44" r="5" fill="#7a4a2a"/><circle cx="90" cy="66" r="6" fill="#7a4a2a"/><circle cx="58" cy="76" r="5" fill="#7a4a2a"/>' +
      '<path d="M30 46 Q36 34 50 32" ' + SHINE + '/>');
  }
  function rollerSVG() {
    return svgWrap("0 0 64 64",
      '<rect x="8" y="8" width="40" height="18" rx="8" fill="#ff6f9f" ' + S4 + '/><path d="M48 17 H56 V34 H32 V44" fill="none" stroke="' + INK + '" stroke-width="4" stroke-linejoin="round"/>' +
      '<rect x="27" y="42" width="10" height="18" rx="4" fill="#ffc94a" ' + S4 + '/>');
  }
  function svgArt(name, state) {
    switch (name) {
      case "sofa": return sofaSVG();
      case "armchair": return armchairSVG();
      case "bed": return bedSVG(false);
      case "tv": return tvSVG(state);
      case "floorlamp": return floorlampSVG(!!state);
      case "bookshelf": return bookshelfSVG();
      case "dresser": return dresserSVG();
      case "rug_round": case "rug_heart": case "rug_stripe": return rugSVG(name);
      case "clock": return clockSVG();
      case "kittyframe": return kittyframeSVG();
      case "bunting": return buntingSVG();
      case "chair": return chairSVG();
      case "table": return tableSVG();
      case "bath": return bathSVG(false);
      case "vanity": return vanitySVG();
      case "fridge": return fridgeSVG(!!state);
      case "stove": return stoveSVG(!!state);
      case "ball": return ballSVG();
      case "dough": return doughSVG();
      case "counter": return counterSVG();
      case "countersink": return countersinkSVG();
      case "mirror": return mirrorSVG();
    }
    return "";
  }
  function artHTML(c, t, pose) {
    if (c.art === "char") return KC() ? KC().full(c.id, pose || "stand") : "";
    var ov = artOver(c); if (ov) return '<img src="' + ov.src + '" alt="" draggable="false">';
    var p = c.art.split(":");
    if (p[0] === "png") return '<img src="' + opts.artBase + p[1] + '.png" alt="" draggable="false">';
    return svgArt(p[1], t && t.state);
  }

  /* shared gradients for the SVG furniture (one hidden svg per mounted root) */
  function lg(id, a, b) { return '<linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + a + '"/><stop offset="1" stop-color="' + b + '"/></linearGradient>'; }
  var DEFS = '<svg class="hg-defs" width="0" height="0" aria-hidden="true" focusable="false"><defs>' +
    lg("hg-pink", "#ffb3cf", "#ff7fab") + lg("hg-pinkL", "#ffd6e6", "#ffacc9") + lg("hg-mint", "#a8f0da", "#4fc4a1") + lg("hg-mintL", "#d9fbef", "#9ae6cd") +
    lg("hg-lilac", "#d6c6ff", "#9b7cf2") + lg("hg-sun", "#ffe49a", "#ffbe3c") + lg("hg-sunOn", "#fffbe0", "#ffd970") + lg("hg-wood", "#f8d4a6", "#d99d61") +
    lg("hg-woodD", "#d89a5c", "#a96b36") + lg("hg-sky", "#8fd6ff", "#dff4ff") + lg("hg-white", "#ffffff", "#efe3ea") +
    '<radialGradient id="hg-glowR"><stop offset="0" stop-color="#fff6c8" stop-opacity=".95"/><stop offset=".6" stop-color="#ffe9a0" stop-opacity=".45"/><stop offset="1" stop-color="#ffe9a0" stop-opacity="0"/></radialGradient>' +
    "</defs></svg>";

  /* ---------- the room itself (wallpaper, floor, window, curtains, lamp, door, shelf) ---------- */
  function wallPattern(id) {
    var p = '<pattern id="hg-wp" patternUnits="userSpaceOnUse" ';
    switch (id) {
      case "mint": return p + 'width="44" height="44"><rect width="44" height="44" fill="#eafcf5"/><rect width="22" height="44" fill="#63d3b3" opacity=".2"/><rect width="44" height="22" fill="#63d3b3" opacity=".2"/></pattern>';
      case "lilac": return p + 'width="48" height="48"><rect width="48" height="48" fill="#f2ecff"/><circle cx="12" cy="12" r="6" fill="#d7c8ff"/><circle cx="36" cy="36" r="6" fill="#d7c8ff"/></pattern>';
      case "lemon": return p + 'width="56" height="56"><rect width="56" height="56" fill="#fffbe6"/><rect width="20" height="56" fill="#ffe99a" opacity=".75"/><circle cx="38" cy="28" r="3" fill="#ffd25c"/></pattern>';
      case "sky": return p + 'width="160" height="120"><rect width="160" height="120" fill="#e2f4ff"/><path d="M20 40 a12 12 0 0 1 22 -6 a14 14 0 0 1 26 6 a9 9 0 0 1 0 18 h-46 a9 9 0 0 1 -2 -18z" fill="#fff"/><path d="M100 96 a9 9 0 0 1 16 -4 a10 10 0 0 1 19 4 a7 7 0 0 1 0 13 h-34 a7 7 0 0 1 -1 -13z" fill="#fff"/></pattern>';
      case "peach": return p + 'width="60" height="60"><rect width="60" height="60" fill="#fff1e8"/><path d="' + heartPath(15, 16, 6) + '" fill="#ffc6ae"/><path d="' + heartPath(45, 46, 6) + '" fill="#ffb7c9"/></pattern>';
      default: return p + 'width="52" height="52"><rect width="52" height="52" fill="#ffeaf2"/><rect width="26" height="52" fill="#ffd3e2"/></pattern>';
    }
  }
  function swatchColor(kind, id) {
    var m = { pink: "#ffd3e2", mint: "#bff0de", lilac: "#e2d6ff", lemon: "#ffef9e", sky: "#cfeeff", peach: "#ffd6c4",
      wood: "#e9b47b", pinktile: "#ffd0e0", mintcheck: "#c6f1e2", carpet: "#cdbcff" };
    return m[id] || "#eee";
  }
  // floor projection helpers: depth f in [0,1] (0 = back) -> y; and x at a given across fraction u
  function fy(f) { return BACK_Y + (FRONT_Y - BACK_Y) * Math.pow(f, 1.25); }
  function fx(u, f) { var y = fy(f), t = (y - BACK_Y) / (FRONT_Y - BACK_Y), l = SIDE * (1 - t), r = 1000 - SIDE * (1 - t); return l + (r - l) * u; }
  function floorSVG(id) {
    var poly = SIDE + "," + BACK_Y + " " + (1000 - SIDE) + "," + BACK_Y + " 1000,750 0,750";
    var s = "", i, j;
    if (id === "pinktile" || id === "mintcheck") {
      var a = id === "pinktile" ? ["#ffe1ec", "#ffc4d8"] : ["#e6fbf3", "#b8eedb"], n = 10, m = 5;
      s += '<polygon points="' + poly + '" fill="' + a[0] + '"/>';
      for (i = 0; i < n; i++) for (j = 0; j < m; j++) {
        if ((i + j) % 2) continue;
        var u0 = i / n, u1 = (i + 1) / n, f0 = j / m, f1 = (j + 1) / m;
        s += '<polygon points="' + [[u0, f0], [u1, f0], [u1, f1], [u0, f1]].map(function (q) { return fx(q[0], q[1]).toFixed(1) + "," + fy(q[1]).toFixed(1); }).join(" ") + '" fill="' + a[1] + '"/>';
      }
    } else if (id === "carpet") {
      s += '<polygon points="' + poly + '" fill="#d9ccff"/>';
      for (i = 0; i < 26; i++) for (j = 0; j < 6; j++) {
        var uu = (i + (j % 2) * .5) / 26, ff = (j + .5) / 6;
        s += '<circle cx="' + fx(uu, ff).toFixed(1) + '" cy="' + fy(ff).toFixed(1) + '" r="' + (2 + 2 * ff).toFixed(1) + '" fill="#c4b2fb"/>';
      }
    } else {
      var n2 = 14;
      s += '<polygon points="' + poly + '" fill="#f0bf87"/>';
      for (i = 0; i < n2; i++) {
        if (i % 2) s += '<polygon points="' + [[i / n2, 0], [(i + 1) / n2, 0], [(i + 1) / n2, 1], [i / n2, 1]].map(function (q) { return fx(q[0], q[1]).toFixed(1) + "," + fy(q[1]).toFixed(1); }).join(" ") + '" fill="#e8b177"/>';
      }
      for (i = 1; i < n2; i++) s += '<line x1="' + fx(i / n2, 0).toFixed(1) + '" y1="' + BACK_Y + '" x2="' + fx(i / n2, 1).toFixed(1) + '" y2="750" stroke="#c98a52" stroke-width="2.5"/>';
      for (i = 0; i < n2; i++) {
        var fj = [.22, .55, .8, .38, .7, .12, .9][i % 7];
        s += '<line x1="' + fx(i / n2, fj).toFixed(1) + '" y1="' + fy(fj).toFixed(1) + '" x2="' + fx((i + 1) / n2, fj).toFixed(1) + '" y2="' + fy(fj).toFixed(1) + '" stroke="#c98a52" stroke-width="2.5"/>';
      }
    }
    // soft shading: darker at the back, light pool at the front
    s += '<polygon points="' + poly + '" fill="url(#hg-floorShade)"/>';
    return s;
  }
  function windowSVG(room, night, closed) {
    var x = room === "kitchen" ? 170 : room === "bedroom" ? 140 : 130, w = room === "kitchen" ? 220 : 190, y = room === "kitchen" ? 110 : 92, h = room === "kitchen" ? 170 : 210;
    var arch = room === "bedroom";
    var glassPath = arch ? "M" + x + " " + (y + h) + " V" + (y + w / 2) + " A" + (w / 2) + " " + (w / 2) + " 0 0 1 " + (x + w) + " " + (y + w / 2) + " V" + (y + h) + " Z"
      : "M" + (x + 14) + " " + y + " H" + (x + w - 14) + " Q" + (x + w) + " " + y + " " + (x + w) + " " + (y + 14) + " V" + (y + h) + " H" + x + " V" + (y + 14) + " Q" + x + " " + y + " " + (x + 14) + " " + y + " Z";
    var cx = x + w / 2;
    var s = '<path d="' + glassPath + '" fill="#fff" stroke="' + INK + '" stroke-width="5"/>';
    var inner = 'transform="translate(' + cx + " " + (y + h / 2) + ") scale(.86) translate(" + (-cx) + " " + (-(y + h / 2)) + ')"';
    s += '<clipPath id="hg-wclip"><path d="' + glassPath + '" ' + inner + '/></clipPath>';
    s += '<path d="' + glassPath + '" fill="' + (night ? "url(#hg-nightWin)" : "url(#hg-skyWin)") + '" ' + inner + ' stroke="' + INK + '" stroke-width="4"/>';
    var sky = "";
    if (night) {
      sky += '<circle cx="' + (x + w * .72) + '" cy="' + (y + h * .28) + '" r="16" fill="#fff3b0"/><circle cx="' + (x + w * .72 + 8) + '" cy="' + (y + h * .28 - 5) + '" r="14" fill="#3b3a7a"/>';
      [[.2, .2], [.42, .12], [.32, .42], [.86, .55], [.58, .3], [.14, .6]].forEach(function (q, i) {
        sky += '<g class="hg-twinkle" style="animation-delay:' + (i * .45).toFixed(2) + 's">' + starPath(x + w * q[0], y + h * q[1], 5 + (i % 2) * 2, "#fff7c2") + "</g>";
      });
    } else {
      sky += '<circle cx="' + (x + w * .74) + '" cy="' + (y + h * .3) + '" r="17" fill="#ffd25c"/>';
      sky += '<g class="hg-cloud"><path d="M' + (x + w * .2) + " " + (y + h * .55) + " a14 14 0 0 1 24 -6 a16 16 0 0 1 30 6 a10 10 0 0 1 0 20 h-52 a10 10 0 0 1 -2 -20z\" fill=\"#fff\"/></g>";
      sky += '<g class="hg-cloud slow"><path d="M' + (x + w * .55) + " " + (y + h * .2) + " a9 9 0 0 1 16 -4 a10 10 0 0 1 19 4 a7 7 0 0 1 0 13 h-34 a7 7 0 0 1 -1 -13z\" fill=\"#fff\" opacity=\".9\"/></g>";
    }
    s += '<g clip-path="url(#hg-wclip)">' + sky +
      '<path d="M' + (x - 10) + " " + (y + h) + " Q" + (x + w * .3) + " " + (y + h * .72) + " " + (x + w * .55) + " " + (y + h * .86) + " T" + (x + w + 10) + " " + (y + h * .8) + " V" + (y + h) + 'Z" fill="' + (night ? "#4f7a77" : "#9be3a8") + '" ' + inner + '/></g>';
    s += '<path d="M' + cx + " " + (y + 6) + " V" + (y + h) + " M" + (x + 6) + " " + (y + h * .55) + " H" + (x + w - 6) + '" stroke="#fff" stroke-width="9"/>';
    s += '<path d="M' + cx + " " + (y + 6) + " V" + (y + h) + " M" + (x + 6) + " " + (y + h * .55) + " H" + (x + w - 6) + '" stroke="' + INK + '" stroke-width="2" opacity=".35"/>';
    s += '<rect x="' + (x - 16) + '" y="' + (y + h - 4) + '" width="' + (w + 32) + '" height="16" rx="7" fill="#fff" stroke="' + INK + '" stroke-width="5"/>';
    // curtains
    var cc = room === "bedroom" ? ["#c9b4ff", "#a98bff"] : room === "kitchen" ? ["#fff", "#ff8fb7"] : ["#ff9cc2", "#ff6f9f"];
    if (closed && room !== "kitchen") {
      var Lc = x - 34, Rc = x + w + 34, tc = y - 26, bc = y + h + 34;
      s += '<path d="M' + Lc + " " + tc + " H" + (cx + 2) + " Q" + (cx - 8) + " " + (y + h * .5) + " " + (cx + 2) + " " + bc + " H" + (Lc + 6) + " Q" + (Lc - 6) + " " + (y + h * .5) + " " + Lc + " " + tc + ' Z" fill="' + cc[0] + '" stroke="' + INK + '" stroke-width="5"/>';
      s += '<path d="M' + Rc + " " + tc + " H" + (cx - 2) + " Q" + (cx + 8) + " " + (y + h * .5) + " " + (cx - 2) + " " + bc + " H" + (Rc - 6) + " Q" + (Rc + 6) + " " + (y + h * .5) + " " + Rc + " " + tc + ' Z" fill="' + cc[0] + '" stroke="' + INK + '" stroke-width="5"/>';
      s += '<path d="M' + (Lc + 30) + " " + (tc + 24) + " Q" + (Lc + 24) + " " + (y + h * .5) + " " + (Lc + 32) + " " + (bc - 20) + " M" + (cx - 40) + " " + (tc + 24) + " Q" + (cx - 46) + " " + (y + h * .5) + " " + (cx - 38) + " " + (bc - 20) +
        " M" + (Rc - 30) + " " + (tc + 24) + " Q" + (Rc - 24) + " " + (y + h * .5) + " " + (Rc - 32) + " " + (bc - 20) + " M" + (cx + 40) + " " + (tc + 24) + " Q" + (cx + 46) + " " + (y + h * .5) + " " + (cx + 38) + " " + (bc - 20) + '" stroke="' + cc[1] + '" stroke-width="5" fill="none" stroke-linecap="round"/>';
      s += '<rect x="' + (Lc - 12) + '" y="' + (tc - 10) + '" width="' + (Rc - Lc + 24) + '" height="12" rx="6" fill="url(#hg-woodShell)" stroke="' + INK + '" stroke-width="4"/>';
      s += '<circle cx="' + (Lc - 14) + '" cy="' + (tc - 4) + '" r="10" fill="' + cc[1] + '" stroke="' + INK + '" stroke-width="4"/><circle cx="' + (Rc + 14) + '" cy="' + (tc - 4) + '" r="10" fill="' + cc[1] + '" stroke="' + INK + '" stroke-width="4"/>';
    } else if (room === "kitchen") {
      // cafe curtain: gingham half curtain plus a scalloped top valance (closed: it covers the whole glass)
      s += '<rect x="' + (x - 8) + '" y="' + (y + (closed ? 4 : h * .58)) + '" width="' + (w + 16) + '" height="' + (closed ? h - 8 : h * .42 - 4) + '" fill="url(#hg-ging)" stroke="' + INK + '" stroke-width="4"/>';
      var sc = "M" + (x - 14) + " " + (y - 6);
      for (var k = 0; k < 6; k++) sc += " q" + ((w + 28) / 12) + " 22 " + ((w + 28) / 6) + " 0";
      s += '<path d="' + sc + " V" + (y - 22) + " H" + (x - 14) + ' Z" fill="url(#hg-ging)" stroke="' + INK + '" stroke-width="4"/>';
      s += '<rect x="' + (x - 24) + '" y="' + (y - 30) + '" width="' + (w + 48) + '" height="10" rx="5" fill="#fff" stroke="' + INK + '" stroke-width="4"/>';
    } else {
      var L = x - 34, R = x + w + 34, top = y - 26, bot = y + h + 34;
      s += '<path d="M' + L + " " + top + " H" + (x + 40) + " Q" + (x + 26) + " " + (y + h * .45) + " " + (x + 6) + " " + (y + h * .62) + " Q" + (x + 26) + " " + (y + h * .8) + " " + (x + 22) + " " + bot + " H" + (L + 6) + " Q" + (L - 6) + " " + (y + h * .5) + " " + L + " " + top + ' Z" fill="' + cc[0] + '" stroke="' + INK + '" stroke-width="5"/>';
      s += '<path d="M' + R + " " + top + " H" + (x + w - 40) + " Q" + (x + w - 26) + " " + (y + h * .45) + " " + (x + w - 6) + " " + (y + h * .62) + " Q" + (x + w - 26) + " " + (y + h * .8) + " " + (x + w - 22) + " " + bot + " H" + (R - 6) + " Q" + (R + 6) + " " + (y + h * .5) + " " + R + " " + top + ' Z" fill="' + cc[0] + '" stroke="' + INK + '" stroke-width="5"/>';
      s += '<path d="M' + (L + 16) + " " + (top + 20) + " Q" + (L + 10) + " " + (y + h * .4) + " " + (L + 18) + " " + (y + h * .7) + " M" + (R - 16) + " " + (top + 20) + " Q" + (R - 10) + " " + (y + h * .4) + " " + (R - 18) + " " + (y + h * .7) + '" stroke="' + cc[1] + '" stroke-width="5" fill="none" stroke-linecap="round"/>';
      s += '<rect x="' + (L + 6) + '" y="' + (y + h * .58) + '" width="34" height="14" rx="7" fill="' + cc[1] + '" stroke="' + INK + '" stroke-width="4"/>';
      s += '<rect x="' + (R - 40) + '" y="' + (y + h * .58) + '" width="34" height="14" rx="7" fill="' + cc[1] + '" stroke="' + INK + '" stroke-width="4"/>';
      s += '<rect x="' + (L - 12) + '" y="' + (top - 10) + '" width="' + (R - L + 24) + '" height="12" rx="6" fill="url(#hg-woodShell)" stroke="' + INK + '" stroke-width="4"/>';
      s += '<circle cx="' + (L - 14) + '" cy="' + (top - 4) + '" r="10" fill="' + cc[1] + '" stroke="' + INK + '" stroke-width="4"/><circle cx="' + (R + 14) + '" cy="' + (top - 4) + '" r="10" fill="' + cc[1] + '" stroke="' + INK + '" stroke-width="4"/>';
    }
    // a soft light pool from the window on the floor (sunlight by day, moonlight at night, none with the curtains shut)
    if (!closed) s += '<polygon class="hg-sunbeam" points="' + (x + 10) + "," + (BACK_Y + 4) + " " + (x + w - 10) + "," + (BACK_Y + 4) + " " + (x + w + 110) + ",700 " + (x + 60) + ',700" fill="' + (night ? "#cfd8ff" : "#fff8d8") + '" opacity="' + (night ? .1 : .2) + '"/>';
    return s;
  }
  // little secrets to find: a mouse hole in the living room, a loose tile in the kitchen, a glow star in the bedroom
  var SECRETS = { living: { x: 880, y: 448, r: 26 }, kitchen: { x: 140, y: 392, r: 30 }, bedroom: { x: 880, y: 92, r: 34 } };
  function secretSVG(room) {
    var q = SECRETS[room];
    if (room === "living") return '<path d="M' + (q.x - 16) + " " + (BACK_Y - 1) + " V" + (q.y - 4) + " A16 16 0 0 1 " + (q.x + 16) + " " + (q.y - 4) + " V" + (BACK_Y - 1) + ' Z" fill="#5a4651" stroke="' + INK + '" stroke-width="4"/>';
    if (room === "kitchen") return '<rect x="' + (q.x - 19) + '" y="' + (q.y - 14) + '" width="37" height="27" rx="4" fill="#cdf3e6" stroke="' + INK + '" stroke-width="2" transform="rotate(-6 ' + q.x + " " + q.y + ')"/>';
    return '<g class="hg-twinkle">' + starPath(q.x, q.y, 16, "#fff3b0").replace("/>", ' stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>') + "</g>";
  }
  // fixed dressing that is part of each room (never empty): kitchen counter run, shelf books, bedroom rug
  function fixturesSVG(room, ovenOn) {
    var s = "";
    if (room === "living") {
      s += '<rect x="852" y="168" width="16" height="46" rx="3" fill="#74c8ff" stroke="' + INK + '" stroke-width="4"/>' +
        '<rect x="870" y="176" width="14" height="38" rx="3" fill="#ff9cc2" stroke="' + INK + '" stroke-width="4"/>' +
        '<rect x="884" y="182" width="12" height="32" rx="3" fill="#ffc94a" stroke="' + INK + '" stroke-width="4" transform="rotate(14 884 214)"/>';
    } else if (room === "bedroom") {
      s += '<ellipse cx="520" cy="640" rx="250" ry="62" fill="#ffd0e2" stroke="' + INK + '" stroke-width="5"/>' +
        '<ellipse cx="520" cy="640" rx="206" ry="46" fill="none" stroke="#fff" stroke-width="8" stroke-dasharray="2 18" stroke-linecap="round"/>' +
        '<ellipse cx="520" cy="640" rx="150" ry="30" fill="#ffe6ef"/>';
    } else if (room === "kitchen") {
      var K = KCOUNTER, top = K.top, ft = K.foot;
      s += '<rect x="' + (K.x0 + 6) + '" y="' + (top + 14) + '" width="' + (K.x1 - K.x0 - 12) + '" height="' + (ft - top - 14) + '" fill="url(#hg-mintC)" stroke="' + INK + '" stroke-width="5"/>';
      // cupboard doors left of the oven
      [[476, 74], [556, 74]].forEach(function (d) { s += '<rect x="' + d[0] + '" y="' + (top + 30) + '" width="' + d[1] + '" height="' + (ft - top - 46) + '" rx="8" fill="#fff" stroke="' + INK + '" stroke-width="4"/><circle cx="' + (d[0] + d[1] - 12) + '" cy="' + (top + 90) + '" r="5" fill="#ff6f9f" stroke="' + INK + '" stroke-width="2.5"/>'; });
      // oven
      s += '<rect x="642" y="' + (top + 18) + '" width="140" height="' + (ft - top - 24) + '" rx="10" fill="#fff" stroke="' + INK + '" stroke-width="4"/>' +
        '<circle cx="668" cy="' + (top + 36) + '" r="7" fill="#ffc94a" stroke="' + INK + '" stroke-width="3"/><circle cx="694" cy="' + (top + 36) + '" r="7" fill="#63d3b3" stroke="' + INK + '" stroke-width="3"/><circle cx="730" cy="' + (top + 36) + '" r="7" fill="#ff6f9f" stroke="' + INK + '" stroke-width="3"/><circle cx="756" cy="' + (top + 36) + '" r="7" fill="#74c8ff" stroke="' + INK + '" stroke-width="3"/>' +
        '<rect x="656" y="' + (top + 56) + '" width="112" height="' + (ft - top - 76) + '" rx="10" fill="#5a4651" stroke="' + INK + '" stroke-width="4"/>' +
        '<rect x="666" y="' + (top + 66) + '" width="92" height="' + (ft - top - 96) + '" rx="7" fill="' + (ovenOn ? "#ffe27a" : "#ffb86b") + '" opacity="' + (ovenOn ? 1 : .85) + '"/>' +
        (ovenOn ? '<circle cx="712" cy="' + (top + 100) + '" r="60" fill="url(#hg-glowR)"/><path d="M702 ' + (top + 116) + ' Q698 ' + (top + 104) + ' 708 ' + (top + 96) + ' Q708 ' + (top + 106) + ' 714 ' + (top + 108) + ' Q718 ' + (top + 100) + ' 716 ' + (top + 92) + ' Q730 ' + (top + 102) + ' 726 ' + (top + 116) + ' Z" fill="#ff8a3d" stroke="' + INK + '" stroke-width="3"/>' : "") +
        '<rect x="680" y="' + (top + 48) + '" width="64" height="8" rx="4" fill="#d6c6cf" stroke="' + INK + '" stroke-width="3"/>';
      // cupboards under the sink
      [[796, 50], [850, 50]].forEach(function (d) { s += '<rect x="' + d[0] + '" y="' + (top + 30) + '" width="' + d[1] + '" height="' + (ft - top - 46) + '" rx="8" fill="#fff" stroke="' + INK + '" stroke-width="4"/>'; });
      s += '<circle cx="836" cy="' + (top + 90) + '" r="4.5" fill="#ff6f9f"/><circle cx="860" cy="' + (top + 90) + '" r="4.5" fill="#ff6f9f"/>';
      // tap
      s += '<path d="M848 ' + (top + 2) + ' V' + (top - 34) + ' Q848 ' + (top - 46) + ' 862 ' + (top - 46) + ' H874 V' + (top - 36) + '" fill="none" stroke="#b9c3cc" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<path d="M848 ' + (top + 2) + ' V' + (top - 34) + ' Q848 ' + (top - 46) + ' 862 ' + (top - 46) + ' H874 V' + (top - 36) + '" fill="none" stroke="' + INK + '" stroke-width="3" opacity=".5"/>';
      // worktop with hobs and the sink basin
      s += '<rect x="' + K.x0 + '" y="' + (top - 4) + '" width="' + (K.x1 - K.x0) + '" height="22" rx="8" fill="url(#hg-woodShell)" stroke="' + INK + '" stroke-width="5"/>' +
        '<path d="M' + (K.x0 + 14) + " " + (top + 3) + " H" + (K.x0 + 140) + '" stroke="#fff" stroke-opacity=".6" stroke-width="5" stroke-linecap="round"/>' +
        '<ellipse cx="848" cy="' + (top + 2) + '" rx="40" ry="6" fill="#bfe9ff" stroke="' + INK + '" stroke-width="3"/>';
    }
    return s;
  }
  // Rooms in a row: living | bedroom | kitchen. Each open doorway leads to the next room.
  var DOORS = { living: { r: "bedroom" }, bedroom: { l: "living", r: "kitchen" }, kitchen: { l: "bedroom" } };
  var DOOR_D0 = 10, DOOR_D1 = 68, DOOR_K = .64;
  function wallY(x, k) { var yb = 750 - (750 - BACK_Y) * x / SIDE, yt = 22 * x / SIDE; return yb - k * (yb - yt); }
  function doorQuad(side) {
    var f = function (x) { return side === "l" ? x : 1000 - x; };
    return { x0: f(DOOR_D0), x1: f(DOOR_D1), t0: wallY(DOOR_D0, DOOR_K), t1: wallY(DOOR_D1, DOOR_K), b0: wallY(DOOR_D0, 0), b1: wallY(DOOR_D1, 0) };
  }
  function roomGlyph(id, cx, cy) {
    if (id === "bedroom") return '<path d="M' + (cx + 4) + " " + (cy - 9) + " A9 9 0 1 0 " + (cx + 6) + " " + (cy + 8) + " A7 7 0 1 1 " + (cx + 4) + " " + (cy - 9) + ' Z" fill="#ffe08a" stroke="' + INK + '" stroke-width="2.5"/>';
    if (id === "kitchen") return '<path d="M' + (cx - 8) + " " + (cy - 1) + " H" + (cx + 8) + " V" + (cy + 6) + " Q" + (cx + 8) + " " + (cy + 10) + " " + (cx + 4) + " " + (cy + 10) + " H" + (cx - 4) + " Q" + (cx - 8) + " " + (cy + 10) + " " + (cx - 8) + " " + (cy + 6) + ' Z" fill="#ff8fb7" stroke="' + INK + '" stroke-width="2.5"/><path d="M' + (cx - 5) + " " + (cy - 4) + " Q" + (cx - 3) + " " + (cy - 9) + " " + (cx - 5) + " " + (cy - 12) + " M" + (cx + 2) + " " + (cy - 4) + " Q" + (cx + 4) + " " + (cy - 9) + " " + (cx + 2) + " " + (cy - 12) + '" stroke="#fff" stroke-width="2.5" fill="none" stroke-linecap="round"/>';
    return '<rect x="' + (cx - 10) + '" y="' + (cy - 3) + '" width="20" height="10" rx="4" fill="#ff8fb7" stroke="' + INK + '" stroke-width="2.5"/><rect x="' + (cx - 7) + '" y="' + (cy - 9) + '" width="14" height="8" rx="3" fill="#ffb3cf" stroke="' + INK + '" stroke-width="2.5"/>';
  }
  function doorwaySVG(side, to) {
    var q = doorQuad(side), rs = (P() && P().rooms && P().rooms[to]) || {}, wallC = swatchColor("wall", rs.wall || "pink"), floorC = swatchColor("floor", rs.floor || "wood");
    var midX = (q.x0 + q.x1) / 2, topMid = (q.t0 + q.t1) / 2 - 26;
    var opening = "M" + q.x0 + " " + q.b0 + " L" + q.x0 + " " + q.t0.toFixed(1) + " Q" + midX + " " + topMid.toFixed(1) + " " + q.x1 + " " + q.t1.toFixed(1) + " L" + q.x1 + " " + q.b1.toFixed(1) + " Z";
    var fl = (q.b0 - 30).toFixed(1), fr = (q.b1 - 18).toFixed(1);
    var s = '<path d="' + opening + '" fill="' + wallC + '"/>' +
      '<polygon points="' + q.x0 + "," + q.b0.toFixed(1) + " " + q.x0 + "," + fl + " " + q.x1 + "," + fr + " " + q.x1 + "," + q.b1.toFixed(1) + '" fill="' + floorC + '"/>' +
      '<path d="' + opening + '" fill="url(#hg-doorShade)"/>' +
      '<path d="' + opening + '" fill="none" stroke="#fff" stroke-width="12" stroke-linejoin="round"/>' +
      '<path d="' + opening + '" fill="none" stroke="' + INK + '" stroke-width="4" stroke-linejoin="round"/>';
    var sy = Math.min(q.t0, q.t1) - 58;
    s += '<circle cx="' + midX + '" cy="' + sy.toFixed(1) + '" r="19" fill="#fff" stroke="' + INK + '" stroke-width="4"/>' + roomGlyph(to, midX, sy);
    return s;
  }
  var SHELL_IDS = ["wp", "skyWin", "nightWin", "wallShade", "floorShade", "mintC", "woodShell", "ging", "tiles", "lampPool", "vig", "wclip", "doorShade"];
  function shellSVG(room, wall, floor, lampOn, o) {
    o = o || {};
    var night = !!o.night, closed = !!o.closed;
    var lampColor = room === "bedroom" ? "#a98bff" : room === "kitchen" ? "#63d3b3" : "#ff6f9f";
    // left side wall door, drawn in perspective
    function yb(x) { return 750 - (750 - BACK_Y) * x / SIDE; }
    function yt(x) { return 22 * x / SIDE; }
    function dy(x, k) { return yb(x) - k * (yb(x) - yt(x)); }
    var d0 = 16, d1 = 64, door = d0 + "," + dy(d0, .62).toFixed(1) + " " + d1 + "," + dy(d1, .62).toFixed(1) + " " + d1 + "," + yb(d1).toFixed(1) + " " + d0 + "," + yb(d0).toFixed(1);
    var s = '<svg class="hg-shell" viewBox="0 0 1000 750" preserveAspectRatio="none" aria-hidden="true" focusable="false"><defs>' + wallPattern(wall) +
      '<linearGradient id="hg-skyWin" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7fcfff"/><stop offset="1" stop-color="#d8f2ff"/></linearGradient>' +
      '<linearGradient id="hg-wallShade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3b2a33" stop-opacity=".10"/><stop offset=".25" stop-color="#3b2a33" stop-opacity="0"/><stop offset=".85" stop-color="#3b2a33" stop-opacity="0"/><stop offset="1" stop-color="#3b2a33" stop-opacity=".07"/></linearGradient>' +
      '<linearGradient id="hg-floorShade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3b2a33" stop-opacity=".16"/><stop offset=".35" stop-color="#3b2a33" stop-opacity=".02"/><stop offset="1" stop-color="#fff" stop-opacity=".10"/></linearGradient>' +
      '<linearGradient id="hg-mintC" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d9fbef"/><stop offset="1" stop-color="#9ae6cd"/></linearGradient>' +
      '<linearGradient id="hg-woodShell"x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f8d4a6"/><stop offset="1" stop-color="#d99d61"/></linearGradient>' +
      '<pattern id="hg-ging" patternUnits="userSpaceOnUse" width="24" height="24"><rect width="24" height="24" fill="#fff"/><rect width="12" height="24" fill="#ff8fb7" opacity=".45"/><rect width="24" height="12" fill="#ff8fb7" opacity=".45"/></pattern>' +
      '<pattern id="hg-tiles" patternUnits="userSpaceOnUse" width="40" height="30"><rect width="40" height="30" fill="#ffffff"/><rect x="1.5" y="1.5" width="37" height="27" rx="4" fill="#dff7ef"/></pattern>' +
      '<radialGradient id="hg-lampPool" cx=".5" cy=".18" r=".75"><stop offset="0" stop-color="#ffe9a0" stop-opacity=".38"/><stop offset="1" stop-color="#ffe9a0" stop-opacity="0"/></radialGradient>' +
      '<radialGradient id="hg-vig" cx=".5" cy=".55" r=".75"><stop offset=".6" stop-color="#3b2a33" stop-opacity="0"/><stop offset="1" stop-color="#3b2a33" stop-opacity=".16"/></radialGradient>' +
      '<linearGradient id="hg-nightWin" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2b2c6e"/><stop offset="1" stop-color="#6b5aa8"/></linearGradient>' +
      '<linearGradient id="hg-doorShade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3b2a33" stop-opacity=".28"/><stop offset=".6" stop-color="#3b2a33" stop-opacity=".08"/><stop offset="1" stop-color="#3b2a33" stop-opacity=".02"/></linearGradient>' +
      "</defs>" +
      // back wall
      '<rect x="0" y="0" width="1000" height="' + BACK_Y + '" fill="url(#hg-wp)"/>' +
      (room === "kitchen" ? '<rect x="' + SIDE + '" y="300" width="' + (1000 - 2 * SIDE) + '" height="' + (BACK_Y - 300) + '" fill="url(#hg-tiles)"/><path d="M' + SIDE + ' 300 H' + (1000 - SIDE) + '" stroke="' + INK + '" stroke-width="4"/>' : "") +
      '<rect x="0" y="0" width="1000" height="' + BACK_Y + '" fill="url(#hg-wallShade)"/>' +
      windowSVG(room, night, closed) +
      // wall shelf (fixed, holds 3 small things)
      '<path d="M' + (SHELF.x0 + 24) + " " + (SHELF.y + 14) + " v26 h20 z M" + (SHELF.x1 - 24) + " " + (SHELF.y + 14) + ' v26 h-20 z" fill="url(#hg-woodShell)" stroke="' + INK + '" stroke-width="4" stroke-linejoin="round"/>' +
      '<rect x="' + SHELF.x0 + '" y="' + SHELF.y + '" width="' + (SHELF.x1 - SHELF.x0) + '" height="16" rx="6" fill="url(#hg-woodShell)" stroke="' + INK + '" stroke-width="5"/>' +
      // baseboard
      '<rect x="' + (SIDE - 4) + '" y="' + (BACK_Y - 20) + '" width="' + (1000 - 2 * SIDE + 8) + '" height="22" fill="#fff" stroke="' + INK + '" stroke-width="4"/>' +
      // floor
      floorSVG(floor) + fixturesSVG(room, !!o.oven) +
      // side walls (same paper, darker)
      '<polygon points="0,0 ' + SIDE + ',22 ' + SIDE + "," + BACK_Y + ' 0,750" fill="url(#hg-wp)"/><polygon points="0,0 ' + SIDE + ',22 ' + SIDE + "," + BACK_Y + ' 0,750" fill="#3b2a33" opacity=".12"/>' +
      '<polygon points="1000,0 ' + (1000 - SIDE) + ',22 ' + (1000 - SIDE) + "," + BACK_Y + ' 1000,750" fill="url(#hg-wp)"/><polygon points="1000,0 ' + (1000 - SIDE) + ',22 ' + (1000 - SIDE) + "," + BACK_Y + ' 1000,750" fill="#3b2a33" opacity=".07"/>' +
      (DOORS[room].l ? doorwaySVG("l", DOORS[room].l) :
        '<polygon points="' + door + '" fill="url(#hg-woodShell)" stroke="' + INK + '" stroke-width="4" stroke-linejoin="round"/>' +
        '<path d="' + heartPath(40, dy(40, .45), 8) + '" fill="#ff8fb7" stroke="' + INK + '" stroke-width="2.5"/>' +
        '<circle cx="' + (d1 - 9) + '" cy="' + (dy(d1 - 9, .3)).toFixed(1) + '" r="5" fill="#ffc94a" stroke="' + INK + '" stroke-width="3"/>') +
      (DOORS[room].r ? doorwaySVG("r", DOORS[room].r) : "") +
      '<polygon points="0,' + (750 - 22) + " " + SIDE + "," + (BACK_Y - 20) + " " + SIDE + "," + (BACK_Y + 2) + ' 0,750" fill="#fff" stroke="' + INK + '" stroke-width="4" stroke-linejoin="round"/>' +
      '<polygon points="1000,' + (750 - 22) + " " + (1000 - SIDE) + "," + (BACK_Y - 20) + " " + (1000 - SIDE) + "," + (BACK_Y + 2) + ' 1000,750" fill="#fff" stroke="' + INK + '" stroke-width="4" stroke-linejoin="round"/>' +
      '<path d="M' + SIDE + " 22 V" + BACK_Y + " L0 750 M" + (1000 - SIDE) + " 22 V" + BACK_Y + ' L1000 750" stroke="' + INK + '" stroke-width="4" fill="none" opacity=".5"/>' +
      secretSVG(room) +
      // ceiling
      '<polygon points="0,0 1000,0 ' + (1000 - SIDE) + ",22 " + SIDE + ',22" fill="#fff6fa" stroke="' + INK + '" stroke-width="4" stroke-linejoin="round"/>' +
      // hanging lamp (tap to switch the light)
      '<g class="hg-ceil" data-ceil="1"><path d="M500 22 V74" stroke="' + INK + '" stroke-width="4"/>' +
      (lampOn ? '<circle cx="500" cy="112" r="70" fill="url(#hg-glowR)"/>' : "") +
      '<path d="M454 116 Q454 72 500 72 Q546 72 546 116 Z" fill="' + lampColor + '" stroke="' + INK + '" stroke-width="5" stroke-linejoin="round"/>' +
      '<path d="M470 96 Q476 84 490 82" stroke="#fff" stroke-opacity=".6" stroke-width="6" fill="none" stroke-linecap="round"/>' +
      '<circle cx="500" cy="122" r="11" fill="' + (lampOn ? "#fff6c2" : "#fff") + '" stroke="' + INK + '" stroke-width="4"/>' +
      '<rect x="440" y="22" width="120" height="110" fill="transparent"/></g>' +
      (night ? '<rect width="1000" height="750" fill="#241f5c" opacity="' + (lampOn ? .26 : .42) + '" pointer-events="none"/>' : "") +
      (lampOn ? '<rect width="1000" height="750" fill="url(#hg-lampPool)" pointer-events="none"' + (night ? ' opacity="1.6"' : "") + '/>' : '<rect width="1000" height="750" fill="#3b2a33" opacity=".04" pointer-events="none"/>') +
      '<rect width="1000" height="750" fill="url(#hg-vig)" pointer-events="none"/>' +
      "</svg>";
    if (o.idp) s = s.replace(new RegExp('(id="|url\\(#)hg-(' + SHELL_IDS.join("|") + ')\\b', "g"), function (m, a, b) { return a + "hg-" + b + "-" + o.idp; });
    return s;
  }

  /* ---------- CSS ---------- */
  var CSS = [
    ".hg{position:relative;height:100%;width:100%;display:flex;flex-direction:column;gap:8px;box-sizing:border-box;overflow:hidden;padding-bottom:7px;font-family:'Baloo 2','Comic Sans MS',sans-serif;color:#3b2a33;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent}",
    ".hg *{box-sizing:border-box}",
    ".hg img{-webkit-user-drag:none;user-select:none;pointer-events:none}",
    ".hg .hg-defs{position:absolute;width:0;height:0;overflow:hidden}",
    ".hg.side{flex-direction:row;align-items:stretch}",
    ".hg-stagewrap{flex:1 1 auto;min-width:0;min-height:0;display:flex;align-items:center;justify-content:center;position:relative}",
    ".hg-stage{position:relative;flex:none;margin-top:var(--hg-mt,22px)}",
    ".hg.side .hg-stagewrap{align-items:flex-start}",
    ".hg.col:not(.pilltop) .hg-stage{margin-right:66px}",
    ".hg.col:not(.pilltop) .hg-rooms{flex-direction:column;left:auto;right:-70px;top:50%;transform:translateY(-50%)}",
    ".hg.side .hg-drawer{height:calc(var(--hg-sh,400px) + 16px + var(--hg-dt,0px))}",
    ".hg.side .hg-panel{flex:1 1 auto;align-content:center}",
    ".hg-frame{position:absolute;inset:-8px;border:3px solid #3b2a33;border-radius:30px;background:linear-gradient(#fff,#ffe9f1);box-shadow:0 5px 0 #3b2a33}",
    ".hg-room{position:absolute;inset:0;border-radius:22px;overflow:hidden;border:3px solid #3b2a33;background:#ffeaf2}",
    ".hg-shell{position:absolute;inset:0;width:100%;height:100%;display:block}",
    ".hg-ceil{cursor:pointer}",
    ".hg-items{position:absolute;inset:0;border-radius:22px;overflow:hidden;touch-action:none}",
    ".hg.dragging .hg-items{overflow:visible}",
    ".hg.dragging .hg-stagewrap{z-index:30}",
    ".hg-it{position:absolute;touch-action:none;cursor:grab;outline:none}",
    ".hg-it::before{content:'';position:absolute;left:50%;top:50%;width:max(100%,44px);height:max(100%,44px);transform:translate(-50%,-50%)}",
    ".hg-dragsh{position:absolute;border-radius:50%;background:radial-gradient(closest-side,rgba(59,42,51,.3),rgba(59,42,51,0));pointer-events:none;z-index:7990}",
    ".hg-ring{position:absolute;border-radius:50%;border:4px solid #ff6f9f;box-shadow:0 0 0 4px rgba(255,255,255,.8);pointer-events:none;z-index:9400}",
    ".hg-puff{width:18px;height:18px;border-radius:50%;background:#fff;border:2px solid rgba(59,42,51,.25)}",
    ".hg-it.lift .hg-sh{display:none}",
    ".hg-it.lift.char .hg-art{transform-origin:50% 45%}",
    ".hg .hg-it.lift .kc-pose-held .kc-leg-l{animation:hg-dangle .6s ease-in-out infinite}",
    ".hg .hg-it.lift .kc-pose-held .kc-leg-r{animation:hg-dangle .6s ease-in-out infinite reverse}",
    "@keyframes hg-dangle{0%,100%{transform:rotate(-9deg)}50%{transform:rotate(9deg)}}",
    ".hg-boxtgt{position:absolute;inset:0;display:none;place-items:center;border-radius:21px;background:rgba(255,248,239,.86);z-index:3;pointer-events:none}",
    ".hg.lifting .hg-boxtgt{display:grid}",
    ".hg-panel.over .hg-boxtgt{background:rgba(255,211,226,.9)}",
    ".hg-boxtgt svg{width:64px;height:64px;animation:hg-pulse 1s ease-in-out infinite}",
    "@keyframes hg-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.1)}}",
    ".hg-it:focus-visible{outline:4px solid #74c8ff;outline-offset:2px;border-radius:12px}",
    ".hg-art{position:absolute;inset:0;transform-origin:50% 100%}",
    ".hg-art>img,.hg-art>svg{position:absolute;left:0;top:0;width:100%;height:100%;object-fit:contain;object-position:50% 100%;display:block;overflow:visible}",
    ".hg-it.wall .hg-art>img{object-position:50% 50%}",
    ".hg-sh{position:absolute;left:10%;right:10%;bottom:-3.5%;height:9%;min-height:6px;border-radius:50%;background:radial-gradient(closest-side,rgba(59,42,51,.26),rgba(59,42,51,0));transition:transform .2s,opacity .2s}",
    ".hg-it.char .hg-sh{left:26%;right:26%;bottom:-1%;height:7%}",
    ".hg-it.wall .hg-sh,.hg-it.rug .hg-sh,.hg-it.seated .hg-sh,.hg-it.onsurf .hg-sh{display:none}",
    ".hg-it.wall .hg-art{filter:drop-shadow(0 6px 0 rgba(59,42,51,.14))}",
    ".hg-it.lift{cursor:grabbing}",
    ".hg-it.lift .hg-art{transform:translateY(-4%) scale(1.06)}",
    ".hg-it.lift .hg-sh{transform:scale(.7);opacity:.6}",
    ".hg-it.bathing .hg-art{clip-path:inset(0 0 0 0)}",
    ".hg-bathfront{position:absolute;pointer-events:none}",
    ".hg-bathfront svg{position:absolute;inset:0;width:100%;height:100%;display:block;overflow:visible}",
    ".hg-it.sway .hg-art{animation:hg-sway 4s ease-in-out infinite}",
    "@keyframes hg-sway{0%,100%{transform:rotate(-3deg)}50%{transform:rotate(3deg)}}",
    ".hg-it.wiggle .hg-art{animation:hg-wiggle .45s ease-out}",
    "@keyframes hg-wiggle{0%,100%{transform:rotate(0)}25%{transform:rotate(-5deg)}60%{transform:rotate(4deg)}}",
    ".hg-it.bounce .hg-art{animation:hg-bounce .5s ease-out}",
    "@keyframes hg-bounce{0%,100%{transform:translateY(0)}35%{transform:translateY(-10%)}70%{transform:translateY(0) scale(1.04,.96)}}",
    ".hg-rooms{position:absolute;left:50%;top:var(--hg-pt,-31px);transform:translateX(-50%);display:flex;gap:6px;padding:4px;background:#fff;border:3px solid #3b2a33;border-radius:30px;box-shadow:0 4px 0 #3b2a33;z-index:6}",
    ".hg-roomtab{width:44px;height:44px;border-radius:50%;border:3px solid #3b2a33;background:#fff;padding:5px;cursor:pointer;display:grid;place-items:center;font:inherit;color:inherit}",
    ".hg-roomtab[aria-pressed=true]{background:#63d3b3}",
    ".hg-roomtab{overflow:hidden}",
    ".hg-roomtab svg,.hg-roomtab img{width:100%;height:100%;display:block;object-fit:contain}",
    ".hg-drawer{flex:none;display:flex;flex-direction:column;gap:8px;position:relative;z-index:2}",
    ".hg.side .hg-drawer{width:var(--hg-dw,280px);justify-content:flex-start;padding-top:var(--hg-dt,0px)}",
    ".hg-cats{display:flex;justify-content:center;gap:var(--hg-catgap,8px)}",
    ".hg-cat{width:var(--hg-cat,56px);height:var(--hg-cat,56px);border-radius:50%;border:3px solid #3b2a33;background:#fff;box-shadow:0 4px 0 #3b2a33;padding:5px;cursor:pointer;display:grid;place-items:center;flex:none;font:inherit;color:inherit;transition:transform .08s,box-shadow .08s}",
    ".hg-cat:active{transform:translateY(3px);box-shadow:0 1px 0 #3b2a33}",
    ".hg-cat[aria-pressed=true]{background:#63d3b3}",
    ".hg-cat svg,.hg-cat img{width:100%;height:100%;display:block;object-fit:contain}",
    ".hg-panel{position:relative;background:#fff8ef;border:3px solid #3b2a33;border-radius:24px;box-shadow:0 5px 0 #3b2a33;padding:8px 6px 6px;display:grid;grid-template-columns:44px 1fr 44px;grid-template-rows:auto auto;column-gap:6px;row-gap:4px;align-items:center;transition:background .15s}",
    ".hg.side .hg-panel{grid-template-columns:1fr 1fr;padding:12px}",
    ".hg-panel.over{background:#ffd3e2}",
    ".hg-grid{display:grid;grid-template-columns:repeat(var(--hg-cols,3),var(--hg-pad,76px));grid-auto-rows:var(--hg-pad,76px);gap:var(--hg-gap,8px);justify-content:center;touch-action:none}",
    ".hg.side .hg-grid{grid-column:1 / -1;grid-row:1}",
    ".hg-arrow{width:44px;height:44px;border-radius:50%;border:3px solid #3b2a33;background:#fff;box-shadow:0 3px 0 #3b2a33;cursor:pointer;display:grid;place-items:center;padding:0;font:inherit;color:inherit}",
    ".hg-arrow:disabled{opacity:.3;cursor:default}",
    ".hg-arrow svg{width:22px;height:22px}",
    ".hg.side .hg-arrow.prev{grid-row:2;grid-column:1;justify-self:end}",
    ".hg.side .hg-arrow.next{grid-row:2;grid-column:2;justify-self:start}",
    ".hg-dots{grid-column:1 / -1;display:flex;justify-content:center;gap:6px;height:10px;align-items:center}",
    ".hg.side .hg-dots{grid-row:3}",
    ".hg-dots i{width:8px;height:8px;border-radius:50%;background:#e2cdd6}",
    ".hg-dots i.on{background:#ff6f9f;width:18px;border-radius:5px}",
    ".hg-pad{position:relative;width:var(--hg-pad,76px);height:var(--hg-pad,76px);border-radius:20px;background:#fff;box-shadow:0 3px 0 rgba(59,42,51,.12);display:grid;place-items:center;cursor:grab;touch-action:none;outline:none}",
    ".hg-pad:focus-visible{outline:4px solid #74c8ff}",
    ".hg-pad .hg-pa{position:absolute;left:11%;right:11%;top:7%;bottom:20%}",
    ".hg-pad .hg-pa>img,.hg-pad .hg-pa>svg{width:100%;height:100%;object-fit:contain;display:block}",
    ".hg-pad.cant{background:#f1ecee}",
    ".hg-pad.cant .hg-pa{opacity:.45;filter:grayscale(.35)}",
    ".hg-price{position:absolute;right:-4px;bottom:-6px;display:flex;align-items:center;gap:1px;padding:0 6px 0 3px;height:24px;border-radius:12px;background:#ffc94a;border:2.5px solid #3b2a33;font:800 15px/1 'Baloo 2',sans-serif;color:#3b2a33}",
    ".hg-price img{width:17px;height:17px}",
    ".hg-pad.cant .hg-price{background:#e6dde1}",
    ".hg-price svg{width:16px;height:16px;margin-right:1px}",
    ".hg-badge{position:absolute;right:-4px;bottom:-6px;width:28px;height:26px;border-radius:13px;background:#ffd3e2;border:2.5px solid #3b2a33;display:grid;place-items:center}",
    ".hg-badge svg{width:17px;height:17px}",
    ".hg-pad.sel{box-shadow:0 0 0 4px #63d3b3,0 3px 0 rgba(59,42,51,.12)}",
    ".hg-pad.shake{animation:hg-shake .4s}",
    "@keyframes hg-shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-5px)}75%{transform:translateX(5px)}}",
    ".hg-bubble{position:absolute;transform:translate(-50%,-100%);background:#fff;border:3px solid #3b2a33;border-radius:18px;padding:2px 12px;font:800 18px/1.3 'Baloo 2',sans-serif;white-space:nowrap;box-shadow:0 3px 0 #3b2a33;pointer-events:none;z-index:9000}",
    ".hg-bubble:after{content:'';position:absolute;left:50%;bottom:-10px;width:14px;height:14px;background:#fff;border-right:3px solid #3b2a33;border-bottom:3px solid #3b2a33;transform:translateX(-50%) rotate(45deg)}",
    ".hg-fx{position:absolute;pointer-events:none;z-index:9500}",
    ".hg-hint{position:absolute;inset:auto 0 6px 0;text-align:center;font:800 15px 'Baloo 2';color:#6e5562;pointer-events:none}",
    ".hg-it.char,.hg-it.pet{transform-origin:50% 100%;will-change:transform}",
    ".hg-it.lift .hg-art{transition:transform .12s ease-out}",
    ".hg-art>svg.kc{transform-origin:50% 96%;transition:transform .25s ease-out}",
    ".hg .hg-it.face-r .kc-look{transform:translateX(9px) rotate(5deg)}",
    ".hg .hg-it.face-l .kc-look{transform:translateX(-9px) rotate(-5deg)}",
    ".hg .hg-it.walking.face-r .hg-art>svg.kc{transform:rotate(4deg)}",
    ".hg .hg-it.walking.face-l .hg-art>svg.kc{transform:rotate(-4deg)}",
    ".hg .hg-it.looking .kc-look{animation:hg-look 3s ease-in-out infinite}",
    "@keyframes hg-look{0%,100%{transform:none}25%{transform:translateX(-8px) rotate(-5deg)}70%{transform:translateX(8px) rotate(5deg)}}",
    ".hg-it.pet .hg-art>img{animation:hg-petidle 2.6s ease-in-out infinite;transform-origin:50% 100%}",
    "@keyframes hg-petidle{0%,100%{transform:scale(1,1)}50%{transform:scale(1.04,.96)}}",
    ".hg-bubble{font-size:var(--hg-bf,18px)}",
    ".hg-talk{z-index:9100;padding:1px 10px}",
    ".hg-talk-l{transform:translate(-78%,-100%)}.hg-talk-l:after{left:78%}",
    ".hg-talk-r{transform:translate(-22%,-100%)}.hg-talk-r:after{left:22%}",
    ".hg-fl svg{width:100%;height:100%;display:block;overflow:visible}",
    ".hg-cloud{animation:hg-drift 46s linear infinite}.hg-cloud.slow{animation-duration:72s;animation-delay:-30s}",
    "@keyframes hg-drift{0%{transform:translateX(-170px)}100%{transform:translateX(230px)}}",
    ".hg-twinkle{animation:hg-twinkle 2.4s ease-in-out infinite;transform-box:fill-box;transform-origin:50% 50%}",
    "@keyframes hg-twinkle{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(.8)}}",
    ".hg-hand-s{transform-box:view-box;transform-origin:65px 72px;animation:hg-tick 60s steps(60) infinite}",
    ".hg-hand-m{transform-box:view-box;transform-origin:65px 72px;animation:hg-tick 3600s linear infinite}",
    "@keyframes hg-tick{to{transform:rotate(360deg)}}",
    ".hg-housebtn{margin-left:6px}",
    ".hg-held{position:absolute;touch-action:none;cursor:grab}",
    ".hg-held>img,.hg-held>svg{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;display:block;overflow:visible}",
    ".hg-it.inbed .hg-held{display:none}",
    ".hg-roomtab[data-act=night][aria-pressed=true]{background:#5b4fa8}",
    ".hg.house .hg-stagewrap,.hg.house .hg-drawer{display:none}",
    ".hg-house{display:none;flex:1 1 auto;min-height:0;min-width:0;flex-direction:column;align-items:center;gap:10px;position:relative}",
    ".hg.house .hg-house{display:flex}",
    ".hg-hbar{flex:none;display:flex;gap:6px;padding:4px;background:#fff;border:3px solid #3b2a33;border-radius:30px;box-shadow:0 4px 0 #3b2a33;z-index:6}",
    ".hg-hwrap{flex:1 1 auto;min-height:0;display:flex;flex-direction:column;align-items:center;justify-content:center;padding-bottom:8px}",
    ".hg-roof{display:block;flex:none;margin-bottom:2px;overflow:visible}",
    ".hg-hrooms{display:flex;gap:var(--hg-hgap,20px);align-items:center}",
    ".hg-hrooms.col{flex-direction:column}",
    ".hg-mini{position:relative;width:var(--hg-mw,200px);height:var(--hg-mh,150px);cursor:pointer;flex:none;outline:none;--hg-bf:var(--hg-mbf,12px)}",
    ".hg-mini .hg-frame{inset:-7px;border-radius:20px}",
    ".hg-mini:focus-visible .hg-frame{outline:4px solid #74c8ff;outline-offset:2px}",
    ".hg-mini .hg-room{border-radius:14px}",
    ".hg-hitems{position:absolute;inset:0;border-radius:14px;overflow:hidden;pointer-events:none}",
    ".hg-mbadge{position:absolute;left:6px;top:6px;width:var(--hg-badge,30px);height:var(--hg-badge,30px);border-radius:50%;background:#fff;border:2.5px solid #3b2a33;padding:3px;z-index:2;pointer-events:none;display:grid;place-items:center}",
    ".hg-mbadge svg{width:100%;height:100%;display:block}",
    "@media (prefers-reduced-motion: reduce){.hg *{animation:none!important;transition:none!important}}"
  ].join("\n");
  function injectCss() {
    if (document.getElementById("home-game-css")) return;
    var st = document.createElement("style"); st.id = "home-game-css"; st.textContent = CSS;
    document.head.appendChild(st);
  }

  /* ---------- saved-data migration (safe to run many times) ---------- */
  function migrate(P) {
    if (!P) return P;
    if (!Array.isArray(P.home)) P.home = [];
    if (typeof P.homeSeq !== "number") P.homeSeq = P.home.reduce(function (m, t) { return Math.max(m, t.uid || 0); }, 0);
    if (!P.rooms || typeof P.rooms !== "object") P.rooms = {};
    ROOMS.forEach(function (r) { if (!P.rooms[r.id]) P.rooms[r.id] = { wall: r.wall, floor: r.floor }; });
    if (!Array.isArray(P.paints)) P.paints = [];
    if (!P.homeRoom || !ROOMS.some(function (r) { return r.id === P.homeRoom; })) P.homeRoom = "living";
    var fresh = [];   // entries saved by the old game (they have no room yet)
    P.home.forEach(function (t) {
      if (!t.uid) t.uid = ++P.homeSeq;
      var c = BY[t.id]; if (!c) return;   // unknown ids are kept untouched, just not drawn
      if (!t.room) { t.room = "living"; fresh.push(t); }
      t.x = +t.x; t.y = +t.y;
      if (!isFinite(t.x)) t.x = 50;
      if (!isFinite(t.y)) t.y = c.zone === "wall" ? 30 : 80;
      if (c.zone === "wall") {
        delete t.on; delete t.pose;
        var wc = clampWall(c, t.x * 10, t.y * 7.5); t.x = r1(wc.x / 10); t.y = r1(wc.y / 7.5);
      } else if (!t.on) {
        var fc = clampFloor(c, t.x * 10, t.y * 7.5); t.x = r1(fc.x / 10); t.y = r1(fc.y / 7.5);
      }
    });
    // one time only: lay out an old save so nothing piles up and no friend hides behind furniture
    if (P.homeV !== 2) {
      if (fresh.length) layoutOld(P, fresh);
      P.homeV = 2;
    }
    return P;
  }
  function r1(v) { return Math.round(v * 10) / 10; }
  // which room an old item moves to when the old save is too full for one room
  function roomFor(c) {
    if (/^(bed|bathtub|sink|teddy|cat|bunnyfull|fish|mirror|lantern|dolls|unicorn|yarn|puzzle)$/.test(c.id)) return "bedroom";
    if (c.food || /^(fridge|stove|counter|countersink|kettle|toaster|pot|mug|mugyellow|cookiejar|hooks)$/.test(c.id)) return "kitchen";
    return "living";
  }
  // big furniture first, then friends (they take the seats and the clear front row), then the small things around them
  function layoutRank(c) {
    if (c.zone === "floor" && c.h >= .6) return 0;
    if (c.zone === "rug") return 1;
    if (c.zone === "char") return 2;
    if (c.zone === "pet") return 3;
    if (c.zone === "floor") return 4;
    if (c.zone === "prop") return 5;
    return 6;   // wall things last, so they hang where no friend's head is in front of them
  }
  function layoutOld(P, fresh) {
    var many = fresh.length > 14;
    fresh.forEach(function (t) { t.room = many ? roomFor(BY[t.id]) : "living"; delete t.on; delete t.slot; t._lay = 1; });
    var order = fresh.slice().sort(function (a, b) {
      var ca = BY[a.id], cb = BY[b.id], d = layoutRank(ca) - layoutRank(cb);
      return d || (cb.h * aspectOf(cb) - ca.h * aspectOf(ca));
    });
    order.forEach(function (t) {
      var others = P.home.filter(function (o) { return o !== t && !o._lay && BY[o.id] && roomOf(o) === t.room; });
      applySpot(t, bestSpot(BY[t.id], t.room, others));
      delete t._lay;
    });
  }
  function applySpot(t, sp) {
    if (sp.on) { t.on = sp.on; t.slot = sp.slot; }
    else { delete t.on; delete t.slot; t.x = r1(sp.x); t.y = r1(sp.y); }
  }

  /* ---------- module state ---------- */
  var root = null, ac = null, ro = null;
  var cat = "friends", page = {}, mode = "col", perPage = 6;
  var drag = null, lastLayoutKey = "";
  var boxes = {};      // uid -> computed box {x,y,w,h,z,s,footY}
  var timers = [];

  function P() { return hostP(); }
  function curRoom() { return (P() && P().homeRoom) || "living"; }
  function roomItems() { var r = curRoom(); return P().home.filter(function (t) { return BY[t.id] && roomOf(t) === r; }); }
  function findT(uid) { var a = P().home; for (var i = 0; i < a.length; i++) if (a[i].uid === uid) return a[i]; return null; }

  /* ---------- geometry ---------- */
  function computeBoxes(list, room) {
    var out = {}, byUid = {};
    room = room || (list[0] ? roomOf(list[0]) : curRoom());
    list.forEach(function (t) { byUid[t.uid] = t; });
    function boxOf(t, depth) {
      if (out[t.uid]) return out[t.uid];
      if (depth > 4) return null;
      var c = BY[t.id], a = aspectOf(c), b;
      if (isHeld(t)) {
        var fr = byUid[heldBy(t)], fb = fr && BY[fr.id] && BY[fr.id].zone === "char" ? boxOf(fr, depth + 1) : null;
        if (fb) { out[t.uid] = heldBox(c, fb, t.slot | 0, fr.uid); return out[t.uid]; }
        var owner = findT(heldBy(t));
        if (owner && BY[owner.id] && BY[owner.id].zone === "char") return null;   // her friend is just not in this list
        delete t.on; delete t.slot;
      }
      if (t.on) {
        var par = typeof t.on === "string" ? t.on : byUid[t.on];
        var anchor = par ? anchorPoint(par, t.slot, t, depth) : null;
        if (anchor && anchor.bed) {
          var s3 = anchor.s * .86, h3 = boxH(c) * s3, w3 = h3 * a, pb3 = anchor.pb, top3 = pb3.y + .433 * pb3.h - h3 * 93 / 260;
          b = { x: anchor.x - w3 / 2, y: top3, w: w3, h: h3, z: anchor.z + 2, s: s3, footY: anchor.y, child: true, bed: true, parentUid: t.on,
            clipB: Math.max(0, (top3 + h3 - (pb3.y + .9 * pb3.h)) / h3) };
          out[t.uid] = b; return b;
        }
        if (anchor) {
          var s = anchor.s, h = boxH(c) * s, w = h * a, top, z;
          if (c.zone === "char") top = anchor.y - h * 230 / 260;
          else top = anchor.y - h;
          z = anchor.z + (c.zone === "char" ? 2 : 1);
          b = { x: anchor.x - w / 2, y: top, w: w, h: h, z: z, s: s, footY: anchor.y, child: true, bath: anchor.bath, parentUid: t.on };
          out[t.uid] = b; return b;
        }
        delete t.on; delete t.slot; delete t.pose;
      }
      if (c.zone === "wall") {
        var hh = boxH(c) * .86, ww = hh * a, cx = t.x * 10, cy = t.y * 7.5;
        b = { x: cx - ww / 2, y: cy - hh / 2, w: ww, h: hh, z: 20, s: .86, footY: cy };
      } else {
        var fyv = t.y * 7.5, sc = depthScale(fyv), h2 = boxH(c) * sc, w2 = h2 * a;
        b = { x: t.x * 10 - w2 / 2, y: fyv - h2, w: w2, h: h2, s: sc, footY: fyv,
          z: c.zone === "rug" ? 40 + Math.round(fyv / 10) : 100 + Math.round(fyv) * 4 };
      }
      out[t.uid] = b; return b;
    }
    function anchorPoint(par, slot, child, depth) {
      if (typeof par === "string") { var fs = fixedSpots(par, room), sp = fs && fs.spots[slot | 0]; return sp ? { x: sp[0], y: sp[1], s: fs.s, z: fs.z } : null; }
      var pc = BY[par.id], pb = boxOf(par, depth + 1); if (!pb) return null;
      var cc = BY[child.id], list2 = sitter(cc) ? pc.seats : pc.surfaces;
      var a2 = list2 && list2[slot | 0]; if (!a2) return null;
      return { x: pb.x + a2[0] * pb.w, y: pb.y + a2[1] * pb.h, s: pb.s, z: pb.z, bath: !!pc.bath && sitter(cc), bed: pc.id === "bed" && cc.zone === "char", pb: pb };
    }
    list.forEach(function (t) { boxOf(t, 0); });
    return out;
  }
  function isHeld(t) { return typeof t.on === "string" && t.on.indexOf("f:") === 0; }
  function heldBy(t) { return +t.on.slice(2); }
  function heldBox(c, fb, slot, holder) {
    var h = boxH(c) * fb.s * (slot ? .62 : .7), w = h * aspectOf(c), cx, bottom;
    if (slot) { cx = fb.x + fb.w * .5; bottom = fb.y + fb.h * .16; } else { cx = fb.x + fb.w * .72; bottom = fb.y + fb.h * .8; }
    return { x: cx - w / 2, y: bottom - h, w: w, h: h, z: fb.z + 1, s: fb.s, footY: fb.footY, held: true, holder: holder, slot: slot, child: true };
  }
  // held things follow their friend from room to room
  function heldFollow() {
    P().home.forEach(function (k) { if (isHeld(k)) { var f = findT(heldBy(k)); if (f) k.room = roomOf(f); } });
  }
  function heldHTML(t, b) {
    var h = "";
    P().home.forEach(function (k) {
      if (!isHeld(k) || heldBy(k) !== t.uid || !BY[k.id]) return;
      var hb = heldBox(BY[k.id], b, k.slot | 0, t.uid);
      h += '<div class="hg-held ' + (k.slot ? "head" : "hand") + '" data-held="' + k.uid + '" role="button" tabindex="0" aria-label="' + esc(BY[k.id].name) + '" style="left:' + ((hb.x - b.x) / b.w * 100).toFixed(2) + "%;top:" + ((hb.y - b.y) / b.h * 100).toFixed(2) +
        "%;width:" + (hb.w / b.w * 100).toFixed(2) + "%;height:" + (hb.h / b.h * 100).toFixed(2) + '%">' + artHTML(BY[k.id], k, null) + "</div>";
    });
    return h;
  }
  function pct(b) { return "left:" + (b.x / 10).toFixed(3) + "%;top:" + (b.y / 7.5).toFixed(3) + "%;width:" + (b.w / 10).toFixed(3) + "%;height:" + (b.h / 7.5).toFixed(3) + "%;z-index:" + b.z; }

  /* ---------- rendering ---------- */
  function inBath(t) { if (!t.on || typeof t.on === "string") return false; var par = findT(t.on); return !!(par && BY[par.id] && BY[par.id].bath); }
  function inBed(t) { if (!t.on || typeof t.on === "string") return false; var par = findT(t.on); return !!(par && par.id === "bed"); }
  function poseFor(t) { return t.on && typeof t.on !== "string" ? (inBath(t) ? "bath" : inBed(t) ? "sleep" : "sit") : "stand"; }
  function itemHTML(t, b) {
    var c = BY[t.id], cls = "hg-it " + c.zone, a = life.actors[t.uid], art;
    if (c.zone === "char") cls += " char";
    if (b.child) cls += sitter(c) ? " seated" : " onsurf";
    if (b.bed) cls += " inbed";
    if (c.sway) cls += " sway";
    if (c.zone === "char") {
      art = a ? charArt(a, t) : artHTML(c, t, poseFor(t));
      if (a && a.face) cls += a.face > 0 ? " face-r" : " face-l";
    } else art = artHTML(c, t, null);
    return '<div class="' + cls + '" data-u="' + t.uid + '" role="button" tabindex="0" aria-label="' + esc(c.name) + '" style="' + pct(b) + '">' +
      '<i class="hg-sh"></i><div class="hg-art"' + (b.clipB ? ' style="clip-path:inset(0 0 ' + (b.clipB * 100).toFixed(1) + '% 0)"' : "") + ">" + art + "</div>" +
      (c.zone === "char" ? heldHTML(t, b) : "") + "</div>";
  }
  function renderItems() {
    if (!root) return;
    boxes = {};
    var single = root.querySelector(".hg-stage .hg-items");
    if (houseView && single) single.innerHTML = "";
    heldFollow();
    visRooms().forEach(function (room) {
      var layer = layerOf(room); if (!layer) return;
      var list = itemsIn(room), bx = computeBoxes(list, room), h = "";
      list.forEach(function (t) {
        var b = bx[t.uid]; if (!b) return;
        boxes[t.uid] = b;
        if (b.held) return;   // drawn inside her friend
        // the front of the bath (or the duvet) is drawn again in front of the friend, so she sits IN the water or lies IN bed
        h += itemHTML(t, b) + overlayHTML(t, b, bx);
      });
      layer.innerHTML = h;
    });
    lifeRebind();
  }
  function shellFor(r, idp) {
    var rs = P().rooms[r] || ROOMS[0];
    return shellSVG(r, rs.wall, rs.floor, !!rs.lamp, { night: nightOn(), closed: !!rs.curtains, oven: !!rs.oven, idp: idp });
  }
  function renderShell() {
    if (!root) return;
    var r = curRoom();
    if (houseView) root.querySelectorAll(".hg-mini").forEach(function (m) { m.querySelector(".hg-room").innerHTML = shellFor(m.dataset.room, m.dataset.room); });
    else root.querySelector(".hg-stage .hg-room").innerHTML = shellFor(r, null);
    root.querySelectorAll(".hg-roomtab").forEach(function (b) {
      if (b.dataset.room) b.setAttribute("aria-pressed", String(!houseView && b.dataset.room === r));
      else if (b.dataset.act === "house") b.setAttribute("aria-pressed", String(houseView));
      else if (b.dataset.act === "night") { b.setAttribute("aria-pressed", String(nightOn())); b.setAttribute("aria-label", nightOn() ? "Morning time" : "Night time"); b.innerHTML = nightOn() ? SUN_ICON : MOON_ICON; }
    });
  }
  var STAR_IMG = function () { return '<svg viewBox="0 0 20 20" aria-hidden="true">' + starPath(10, 10.6, 9.4, "#fff3b0").replace('/>', ' stroke="#3b2a33" stroke-width="2" stroke-linejoin="round"/>') + "</svg>"; };
  var LOCK = '<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="3" y="9" width="14" height="10" rx="3" fill="#6e5562"/><path d="M6 9 V6 a4 4 0 0 1 8 0 V9" fill="none" stroke="#6e5562" stroke-width="2.6"/></svg>';
  var HOUSE = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="' + heartPath(10, 9.6, 6.4) + '" fill="#ff6f9f" stroke="#3b2a33" stroke-width="2" stroke-linejoin="round"/></svg>';
  var BOX = '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M8 24 L32 14 L56 24 L32 34 Z" fill="#ffd3e2" stroke="#3b2a33" stroke-width="3.5" stroke-linejoin="round"/>' +
    '<path d="M8 24 V48 L32 58 V34 Z" fill="#ff9cc2" stroke="#3b2a33" stroke-width="3.5" stroke-linejoin="round"/><path d="M56 24 V48 L32 58 V34 Z" fill="#ff6f9f" stroke="#3b2a33" stroke-width="3.5" stroke-linejoin="round"/>' +
    '<path d="M8 24 L2 34 L26 44 L32 34 Z M56 24 L62 34 L38 44 L32 34 Z" fill="#ffb3cf" stroke="#3b2a33" stroke-width="3.5" stroke-linejoin="round"/>' +
    '<path d="M32 4 V18 M25 11 L32 18 L39 11" fill="none" stroke="#3b2a33" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var HOUSE_ICON = '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M5 19 L20 6 L35 19" fill="none" stroke="#3b2a33" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="M8 17 L20 7 L32 17 V34 H8 Z" fill="#ffd3e2" stroke="#3b2a33" stroke-width="3" stroke-linejoin="round"/><path d="M5 19 L20 6 L35 19 L31 21 L20 11.5 L9 21 Z" fill="#ff6f9f" stroke="#3b2a33" stroke-width="2.5" stroke-linejoin="round"/>' +
    '<rect x="11" y="21" width="8" height="6" rx="1.5" fill="#bfe9ff" stroke="#3b2a33" stroke-width="2"/><rect x="21" y="21" width="8" height="6" rx="1.5" fill="#bfe9ff" stroke="#3b2a33" stroke-width="2"/>' +
    '<path d="M8 28 H32" stroke="#3b2a33" stroke-width="2"/><rect x="11" y="29" width="8" height="5" fill="#bfe9ff" stroke="#3b2a33" stroke-width="2"/><rect x="21" y="29" width="8" height="5" fill="#bfe9ff" stroke="#3b2a33" stroke-width="2"/></svg>';
  var MOON_ICON = '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M24 6 A14 14 0 1 0 34 26 A11 11 0 1 1 24 6 Z" fill="#ffe08a" stroke="#3b2a33" stroke-width="3" stroke-linejoin="round"/>' +
    '<circle cx="11" cy="9" r="2" fill="#ffc94a"/><circle cx="33" cy="12" r="1.6" fill="#ffc94a"/></svg>';
  var SUN_ICON = '<svg viewBox="0 0 40 40" aria-hidden="true"><g stroke="#3b2a33" stroke-width="3" stroke-linecap="round"><path d="M20 3 V8 M20 32 V37 M3 20 H8 M32 20 H37 M8 8 L11.5 11.5 M28.5 28.5 L32 32 M8 32 L11.5 28.5 M28.5 11.5 L32 8"/></g>' +
    '<circle cx="20" cy="20" r="9" fill="#ffd25c" stroke="#3b2a33" stroke-width="3"/></svg>';
  var CHECK = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10 L8.5 14.5 L16 6" fill="none" stroke="#3b2a33" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  function paintItems() {
    var out = [];
    WALLS.forEach(function (w) { out.push({ paint: "wall", id: w.id, name: w.name, price: w.price }); });
    FLOORS.forEach(function (f) { out.push({ paint: "floor", id: f.id, name: f.name, price: f.price }); });
    return out;
  }
  function paintOwned(p) { return p.price === 0 || P().paints.indexOf(p.paint + ":" + p.id) >= 0; }
  function swatchSVG(p) {
    if (p.paint === "wall") {
      return '<svg viewBox="0 0 60 60" aria-hidden="true"><defs>' + wallPattern(p.id).replace('id="hg-wp"', 'id="hg-sw-' + p.id + '"').replace('patternUnits="userSpaceOnUse"', 'patternUnits="userSpaceOnUse" patternTransform="scale(.42)"') + '</defs>' +
        '<rect x="5" y="5" width="50" height="50" rx="12" fill="url(#hg-sw-' + p.id + ')" stroke="#3b2a33" stroke-width="3"/></svg>';
    }
    var cols = { wood: ["#f0bf87", "#c98a52"], pinktile: ["#ffe1ec", "#ffc4d8"], mintcheck: ["#e6fbf3", "#b8eedb"], carpet: ["#d9ccff", "#c4b2fb"] }[p.id];
    var inner = p.id === "wood" ? '<path d="M17 12 L13 52 M30 12 V52 M43 12 L47 52" stroke="' + cols[1] + '" stroke-width="2.5"/>'
      : p.id === "carpet" ? '<circle cx="22" cy="26" r="3" fill="' + cols[1] + '"/><circle cx="38" cy="30" r="3" fill="' + cols[1] + '"/><circle cx="28" cy="42" r="3.5" fill="' + cols[1] + '"/>'
        : '<path d="M14 12 H30 L29 30 H11 Z M30 30 H49 L52 52 H30 Z" fill="' + cols[1] + '"/>';
    return '<svg viewBox="0 0 60 60" aria-hidden="true"><path d="M14 12 H46 L55 52 H5 Z" fill="' + cols[0] + '"/>' + inner + '<path d="M14 12 H46 L55 52 H5 Z" fill="none" stroke="#3b2a33" stroke-width="3" stroke-linejoin="round"/></svg>';
  }
  function catIcon(id) {
    switch (id) {
      case "friends": return KC() ? KC().face("kitty") : "";
      case "furniture": return sofaSVG();
      case "decor": return '<img src="' + opts.artBase + 'tt_monstera.png" alt="">';
      case "treats": return '<img src="' + opts.artBase + 'tt_cupcake.png" alt="">';
      case "paint": return rollerSVG();
    }
    return "";
  }
  function roomIcon(id) {
    if (id === "bedroom") return bedSVG();
    if (id === "kitchen") return stoveSVG();
    return sofaSVG();
  }
  function owned(c) { return c.unique && P().home.some(function (t) { return t.id === c.id; }); }
  function renderDrawer() {
    if (!root) return;
    root.querySelectorAll(".hg-cat").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.cat === cat)); });
    var items = cat === "paint" ? paintItems() : C.filter(function (c) { return c.cat === cat; });
    var pages = Math.max(1, Math.ceil(items.length / perPage));
    var pg = clamp(page[cat] || 0, 0, pages - 1); page[cat] = pg;
    var stars = P().stars || 0, h = "";
    items.slice(pg * perPage, pg * perPage + perPage).forEach(function (c) {
      if (c.paint) {
        var own = paintOwned(c), rs = P().rooms[curRoom()], applied = rs[c.paint] === c.id, cant = !own && stars < c.price;
        h += '<div class="hg-pad' + (cant ? " cant" : "") + (applied ? " sel" : "") + '" role="button" tabindex="0" data-paint="' + c.paint + '" data-id="' + c.id + '" aria-label="' + esc(c.name) + (own ? "" : ", " + c.price + " stars") + '"><div class="hg-pa">' + swatchSVG(c) + "</div>" +
          (applied ? '<span class="hg-badge">' + CHECK + "</span>" : own ? "" : '<span class="hg-price">' + (cant ? LOCK : STAR_IMG()) + c.price + "</span>") + "</div>";
        return;
      }
      var isOwned = owned(c), cant2 = !isOwned && stars < c.price;
      var art = c.art === "char" ? KC().full(c.id, "stand") : artHTML(c, null);
      h += '<div class="hg-pad' + (cant2 ? " cant" : "") + '" role="button" tabindex="0" data-id="' + c.id + '" aria-label="' + esc(c.name) + (isOwned ? ", at home" : ", " + c.price + " stars") + '"><div class="hg-pa">' + art + "</div>" +
        (isOwned ? '<span class="hg-badge">' + HOUSE + "</span>" : '<span class="hg-price">' + (cant2 ? LOCK : STAR_IMG()) + c.price + "</span>") + "</div>";
    });
    root.querySelector(".hg-grid").innerHTML = h;
    root.querySelector(".hg-arrow.prev").disabled = pg <= 0;
    root.querySelector(".hg-arrow.next").disabled = pg >= pages - 1;
    var d = ""; for (var i = 0; i < pages; i++) d += '<i class="' + (i === pg ? "on" : "") + '"></i>';
    root.querySelector(".hg-dots").innerHTML = pages > 1 ? d : "";
  }
  function renderAll() { renderShell(); renderItems(); renderDrawer(); }

  /* ---------- layout: 4:3 stage that fits; drawer pages sized to the space ---------- */
  function layout() {
    if (!root) return;
    var W = root.clientWidth, Hh = root.clientHeight - 7;
    if (!W || !Hh) return;
    var side = W >= 700 && W / Hh >= 1.2;
    var stage = root.querySelector(".hg-stage"), sw, sh, cols, rows, pad, gap, catS, catGap, mt, pt, dw = 280;
    if (side) {
      // room buttons sit on the frame's top edge (over the ceiling only); the drawer fills the height beside the room
      mt = 34; pt = -31;
      catS = 48; catGap = 6; gap = 8; cols = 3;
      var availH = Hh - mt - 14;
      dw = clamp(Math.floor(W - 28 - availH * 4 / 3), 280, 340);
      var availW = W - dw - 28;
      sw = Math.min(availW, availH * 4 / 3); sh = sw * 3 / 4;
      var padW = Math.min(100, Math.floor((dw - 30 - 2 * gap) / 3));
      var gridH = Math.floor(sh + 8) - catS - 4 - 8 - 24 - 6 - 4 - 47 - 4 - 10 - 8;
      rows = clamp(Math.floor((gridH + gap) / (padW + gap)), 1, 6);
      pad = Math.min(padW, Math.floor((gridH - (rows - 1) * gap) / rows));
    } else {
      // phones and tall screens: room buttons stand in a column beside the room, so they never hide the lamp or window
      // or, when the screen is short, a row above the room. Two card rows, or one strip of cards when that
      // makes the room at least 20% bigger (small phones).
      catS = W < 360 ? 50 : 56; catGap = W < 360 ? 6 : 8; gap = W < 360 ? 6 : 8;
      var gridW = W - 6 - 12 - 2 * (44 + 6);
      cols = Math.max(3, Math.floor((gridW + gap) / (84 + gap)));
      pad = Math.min(84, Math.floor((gridW - (cols - 1) * gap) / cols));
      var opt = function (rw, top) {
        var drawerH = catS + 4 + 8 + (rw * pad + (rw - 1) * gap + 14 + 4 + 10 + 6 + 5), m = top ? 64 : 14;
        var shv = Math.min((W - 20 - (top ? 0 : 66)) * 3 / 4, Hh - drawerH - 8 - m - 13);
        if (!top && shv < 5 * 44 + 4 * 6 + 20) shv = -1;   // 5 room buttons must fit beside the room
        return { rows: rw, top: top, mt: m, sh: shv };
      };
      var two = [opt(2, false), opt(2, true)].sort(function (x, y) { return y.sh - x.sh; })[0];
      var one = [opt(1, false), opt(1, true)].sort(function (x, y) { return y.sh - x.sh; })[0];
      var pick = one.sh > two.sh * 1.2 ? one : two;
      rows = pick.rows; mt = pick.mt; pt = pick.top ? -62 : 0;
      sh = pick.sh; sw = sh * 4 / 3;
      if (sh < 120) { sh = 120; sw = 160; }
      root.classList.toggle("pilltop", pick.top);
    }
    root.style.setProperty("--hg-mt", mt + "px"); root.style.setProperty("--hg-pt", pt + "px");
    root.classList.toggle("col", !side);
    root.style.setProperty("--hg-sh", Math.floor(sw * 3 / 4) + "px");
    root.style.setProperty("--hg-dw", dw + "px"); root.style.setProperty("--hg-dt", (side ? mt - 8 : 0) + "px");
    sw = Math.floor(sw); sh = Math.floor(sw * 3 / 4);
    root.classList.toggle("side", side);
    if (side) root.classList.remove("pilltop");
    mode = side ? "side" : "col";
    stage.style.width = sw + "px"; stage.style.height = sh + "px";
    root.style.setProperty("--hg-pad", pad + "px"); root.style.setProperty("--hg-cols", cols); root.style.setProperty("--hg-gap", gap + "px");
    root.style.setProperty("--hg-cat", catS + "px"); root.style.setProperty("--hg-catgap", catGap + "px");
    if (side) {
      // size the cards from the real height of the drawer so the grid fills it
      var pnl = root.querySelector(".hg-panel"), gh = pnl.clientHeight - 24 - 47 - 4 - 10 - 4 - 6;
      if (gh > 0) {
        rows = clamp(Math.floor((gh + gap) / (padW + gap)), 1, 6);
        pad = Math.min(padW, Math.floor((gh - (rows - 1) * gap) / rows));
        root.style.setProperty("--hg-pad", pad + "px");
      }
    }
    var pp = cols * rows;
    if (pp !== perPage) { perPage = pp; page = {}; renderDrawer(); }
    life.viewSingle = { w: sw, h: sh };
    root.style.setProperty("--hg-bf", clamp(Math.round(sw * .026), 12, 18) + "px");
    root.classList.toggle("house", houseView);
    // the house view has its own row of room buttons; they exist only while it is shown
    var hbar = root.querySelector(".hg-hbar");
    if (houseView && !hbar.children.length) hbar.innerHTML = roomButtons();
    else if (!houseView && hbar.children.length) hbar.innerHTML = "";
    if (houseView) layoutHouse();
    lifeRelayout();
  }
  function layoutHouse() {
    var W = root.clientWidth, Hh = root.clientHeight - 7, house = root.querySelector(".hg-house");
    var barH = 60, gap = 20, availW = W - 24, availH = Hh - barH - 10 - 12, roofK = .2;
    var wRow = Math.min((availW - 2 * gap) / 3, availH / (.75 + roofK * .8)), wCol = Math.min(availW, (availH - 2 * gap) / (2.25 + roofK));
    var row = wRow >= wCol, w = Math.floor(Math.max(110, row ? wRow : wCol)), h = Math.floor(w * .75);
    var list = house.querySelector(".hg-hrooms");
    list.classList.toggle("col", !row);
    house.style.setProperty("--hg-mw", w + "px"); house.style.setProperty("--hg-mh", h + "px"); house.style.setProperty("--hg-hgap", gap + "px");
    house.style.setProperty("--hg-mbf", clamp(Math.round(w * .055), 10, 16) + "px");
    house.style.setProperty("--hg-badge", clamp(Math.round(w * .11), 20, 30) + "px");
    var roof = house.querySelector(".hg-roof"), rw = Math.min(W - 4, row ? 3 * w + 2 * gap + 16 : w + 16), rh = Math.round(clamp(w * roofK * (row ? .8 : 1), 24, 80));
    roof.style.width = rw + "px"; roof.style.height = rh + "px";
    life.viewMini = { w: w, h: h };
  }

  /* ---------- effects ---------- */
  function stageRect() { return root.querySelector(".hg-stage").getBoundingClientRect(); }
  function rootRect() { return root.getBoundingClientRect(); }
  function sparkle(b) {
    if (rm() || !root) return;
    var layer = root.querySelector(".hg-items"), cx = (b.x + b.w / 2) / 10, cy = (b.y + b.h / 2) / 7.5;
    var cols = ["#ffc94a", "#ff6f9f", "#74c8ff", "#63d3b3"];
    for (var i = 0; i < 4; i++) {
      var el = document.createElement("div"); el.className = "hg-fx";
      el.style.left = cx + "%"; el.style.top = cy + "%"; el.style.width = "18px"; el.style.height = "18px"; el.style.marginLeft = "-9px"; el.style.marginTop = "-9px";
      el.innerHTML = '<svg viewBox="0 0 20 20" width="18" height="18">' + starPath(10, 10, 9, cols[i % 4]) + "</svg>";
      layer.appendChild(el);
      var a = i / 4 * Math.PI * 2 + .6, r = 30 + (i % 2) * 14;
      var an = el.animate([{ transform: "translate(0,0) scale(.3)", opacity: 1 }, { transform: "translate(" + (Math.cos(a) * r) + "px," + (Math.sin(a) * r) + "px) scale(1)", opacity: 1, offset: .55 },
        { transform: "translate(" + (Math.cos(a) * r * 1.2) + "px," + (Math.sin(a) * r * 1.2) + "px) scale(.6)", opacity: 0 }], { duration: 480, easing: "ease-out" });
      an.onfinish = (function (e) { return function () { e.remove(); }; })(el);
    }
  }
  function flyStar(fromRect, toRect, n) {
    if (rm() || !root || !fromRect || !toRect) return;
    var rr = rootRect();
    for (var i = 0; i < Math.min(n, 3); i++) {
      var el = document.createElement("div"); el.className = "hg-fx";
      el.style.left = (fromRect.left + fromRect.width / 2 - rr.left - 14) + "px"; el.style.top = (fromRect.top + fromRect.height / 2 - rr.top - 14) + "px";
      el.style.width = "28px"; el.style.height = "28px";
      el.innerHTML = '<img src="' + opts.artBase + 'fl_star.png" alt="" style="width:28px;height:28px">';
      root.appendChild(el);
      var dx = (toRect.left + toRect.width / 2) - (fromRect.left + fromRect.width / 2), dy = (toRect.top + toRect.height / 2) - (fromRect.top + fromRect.height / 2);
      var an = el.animate([{ transform: "translate(0,0) scale(1)", opacity: 1 }, { transform: "translate(" + dx * .5 + "px," + (dy * .5 - 60) + "px) scale(1.1)", opacity: 1 }, { transform: "translate(" + dx + "px," + dy + "px) scale(.5)", opacity: .2 }],
        { duration: 520, delay: i * 90, easing: "ease-in-out", fill: "backwards" });
      an.onfinish = (function (e) { return function () { e.remove(); }; })(el);
    }
  }
  function scoreRect() {
    var s = document.getElementById("score");
    if (s && s.getBoundingClientRect().width) return s.getBoundingClientRect();
    var r = rootRect(); return { left: r.right - 40, top: r.top, width: 30, height: 30 };
  }
  function itemEl(uid) { return root && root.querySelector('.hg-it[data-u="' + uid + '"]'); }
  function bubble(uid, text) {
    if (!root) return;
    var b = boxes[uid]; if (!b) return;
    root.querySelectorAll(".hg-bubble").forEach(function (e) { e.remove(); });
    var el = document.createElement("div"); el.className = "hg-bubble"; el.textContent = text;
    el.style.left = clamp((b.x + b.w / 2) / 10, 12, 88) + "%"; el.style.top = Math.max(9, (b.y + b.h * .06) / 7.5) + "%";
    root.querySelector(".hg-items").appendChild(el);
    if (!rm()) el.animate([{ opacity: 0, transform: "translate(-50%,-80%) scale(.6)" }, { opacity: 1, transform: "translate(-50%,-100%) scale(1)" }], { duration: 220, easing: "ease-out" });
    timers.push(setTimeout(function () { el.remove(); }, 2400));
  }
  function anim(el, cls) {
    if (!el || rm()) return;
    el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls);
    timers.push(setTimeout(function () { el.classList.remove(cls); }, 600));
  }
  // a soft ring around a newly placed thing, so she sees where it went
  function ring(uid) {
    var b = boxes[uid]; if (!b || !root) return;
    var el = document.createElement("div"); el.className = "hg-ring";
    var d = Math.max(b.w / 10 * stageRect().width / 100, b.h / 7.5 * stageRect().height / 100) * 1.15, cx = (b.x + b.w / 2) / 10, cy = (b.y + b.h / 2) / 7.5;
    d = Math.max(d, 54);
    el.style.left = cx + "%"; el.style.top = cy + "%"; el.style.width = d + "px"; el.style.height = d + "px"; el.style.marginLeft = (-d / 2) + "px"; el.style.marginTop = (-d / 2) + "px";
    root.querySelector(".hg-items").appendChild(el);
    if (rm()) { timers.push(setTimeout(function () { el.remove(); }, 900)); return; }
    var an = el.animate([{ transform: "scale(.6)", opacity: 0 }, { transform: "scale(1)", opacity: 1, offset: .35 }, { transform: "scale(1.12)", opacity: 0 }], { duration: 1100, delay: 300, easing: "ease-out", fill: "both" });
    an.onfinish = function () { el.remove(); };
  }
  // three little dust puffs at the feet when something lands on the floor
  function puff(b) {
    if (rm() || !root || !b) return;
    var layer = root.querySelector(".hg-items"), fy2 = (b.y + b.h) / 7.5;
    [-1, 0, 1].forEach(function (k) {
      var el = document.createElement("div"); el.className = "hg-fx hg-puff";
      el.style.left = ((b.x + b.w / 2) / 10 + k * b.w / 10 * .28) + "%"; el.style.top = fy2 + "%";
      layer.appendChild(el);
      var an = el.animate([{ transform: "translate(-50%,-50%) scale(.4)", opacity: .9 }, { transform: "translate(calc(-50% + " + (k * 14) + "px),-90%) scale(1.2)", opacity: 0 }], { duration: 420, easing: "ease-out" });
      an.onfinish = function () { el.remove(); };
    });
  }
  function land(uid, fromTop) {
    var el = itemEl(uid); if (!el || rm()) return;
    var art = el.querySelector(".hg-art");
    var k = fromTop ? [{ transform: "translateY(-120%)", opacity: 0 }, { transform: "translateY(0) scale(1.1,.9)", opacity: 1, offset: .65 }, { transform: "translateY(-4%) scale(.97,1.03)", offset: .82 }, { transform: "none" }]
      : [{ transform: "scale(1.08,.92)" }, { transform: "scale(.97,1.03)", offset: .55 }, { transform: "none" }];
    art.animate(k, { duration: fromTop ? 520 : 200, easing: "ease-out" });
  }

  /* ---------- placing logic ---------- */
  function area(r) { return Math.max(0, r.w) * Math.max(0, r.h); }
  function ovl(a, b) {
    var w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x), h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
    return w > 0 && h > 0 ? w * h : 0;
  }
  // the parts of a friend's box that must stay visible: her head (top 45%), and her whole figure
  function headBox(b) { return { x: b.x + b.w * .17, y: b.y + b.h * .05, w: b.w * .66, h: b.h * .45 }; }
  function figBox(b) { return { x: b.x + b.w * .17, y: b.y + b.h * .05, w: b.w * .66, h: b.h * .9 }; }
  function floorBox(c, x, fyv) {
    var sc = depthScale(fyv), h = boxH(c) * sc, w = h * aspectOf(c);
    return { x: x - w / 2, y: fyv - h, w: w, h: h, footY: fyv, s: sc, z: c.zone === "rug" ? 40 + Math.round(fyv / 10) : 100 + Math.round(fyv) * 4 };
  }
  function wallBox(c, cx, cy) { var hh = boxH(c) * .86, ww = hh * aspectOf(c); return { x: cx - ww / 2, y: cy - hh / 2, w: ww, h: hh, z: 20 }; }
  function childBox(c, an) {
    var h = boxH(c) * an.s, w = h * aspectOf(c);
    return { x: an.x - w / 2, y: c.zone === "char" ? an.y - h * 230 / 260 : an.y - h, w: w, h: h, z: an.z + (c.zone === "char" ? 2 : 1), footY: an.y };
  }
  // how much of a wall box lies on the window, the shelf, the lamp cord or the kitchen counter (0 = none)
  function wallBlockFrac(r, room) { var a = area(r), s = 0; blockedRects(room).forEach(function (q) { s += ovl(r, q); }); return s / a; }
  function isBig(c) { return c.zone === "floor" && c.h >= .6; }
  function solid(c) { return c.zone !== "wall" && c.zone !== "rug"; }
  // how bad it is to put the new box nb (item c) among the items already in the room. Infinity = not allowed.
  function spotCost(c, nb, items, bx) {
    var cost = 0, A = area(nb);
    for (var i = 0; i < items.length; i++) {
      var o = items[i], oc = BY[o.id], ob = bx[o.uid]; if (!ob) continue;
      if ((oc.zone === "wall") !== (c.zone === "wall")) continue;
      if ((oc.zone === "rug") !== (c.zone === "rug")) continue;
      var ov = ovl(nb, ob); if (!ov) continue;
      cost += ov / Math.max(1, Math.min(A, area(ob))) * (oc.zone === "char" || c.zone === "char" ? 2 : c.zone === "wall" ? 3 : 1.6);
      if (oc.zone === "char" && nb.z > ob.z) {          // the new thing would stand in front of a friend
        var hb = headBox(ob), fb = figBox(ob);
        if (ovl(nb, hb) / area(hb) > .15 || ovl(nb, fb) / area(fb) > .25) return Infinity;
      }
      if (c.zone === "char" && ob.z > nb.z) {           // something already stands in front of the new friend
        var hb2 = headBox(nb), fb2 = figBox(nb);
        if (ovl(ob, hb2) / area(hb2) > .15 || ovl(ob, fb2) / area(fb2) > .25) return Infinity;
      }
      if (c.zone !== "char" && ob.z > nb.z && ov / A > .25) cost += (ov / A - .25) * 8;   // the new thing would be partly hidden
    }
    return cost;
  }
  function slotUsed(items, parKey, slot, wantSitter) {
    return items.some(function (t) { return t.on === parKey && (t.slot | 0) === slot && sitter(BY[t.id] || {}) === wantSitter; });
  }
  // free seats (for friends) or free table / counter / shelf spots (for small things)
  function freeSurfaces(c, room, items, bx) {
    var out = [], wantS = sitter(c);
    items.forEach(function (t) {
      var pc = BY[t.id], b = bx[t.uid]; if (!b || b.child) return;
      var list = wantS ? pc.seats : (c.zone === "prop" ? pc.surfaces : null); if (!list) return;
      if (wantS && pc.bath) return;   // nobody is put in the bath unless she drags them there herself
      list.forEach(function (a, i) {
        if (slotUsed(items, t.uid, i, wantS)) return;
        out.push({ on: t.uid, slot: i, an: { x: b.x + a[0] * b.w, y: b.y + a[1] * b.h, s: b.s, z: b.z } });
      });
    });
    if (c.zone === "prop") fixedKeys(room).forEach(function (k) {
      var fs = fixedSpots(k, room);
      fs.spots.forEach(function (sp, i) { if (!slotUsed(items, k, i, false)) out.push({ on: k, slot: i, an: { x: sp[0], y: sp[1], s: fs.s, z: fs.z } }); });
    });
    return out;
  }
  function wallGrid(c, fn) { for (var i = 0; i <= 30; i++) for (var j = 0; j <= 18; j++) fn(clampWall(c, 110 + i * 26, 150 + j * 16)); }
  // the best free place for a new item: used when she taps to buy, when a friend is called, and to lay out old saves
  function bestSpot(c, room, items) {
    var bx = computeBoxes(items, room), best = null, bestCost = Infinity;
    lifeTargetBoxes(bx, room);   // friends who are walking count where they are going
    // 1. small things go onto a free table, counter or shelf spot; friends onto a free seat
    if (c.zone === "prop" || c.zone === "char") {
      freeSurfaces(c, room, items, bx).forEach(function (s, k) {
        var nb = childBox(c, s.an), fb = c.zone === "char" ? figBox(nb) : nb, cost = k * .01;
        items.forEach(function (o) {
          var ob = bx[o.uid]; if (!ob || o.uid === s.on) return;
          if (o.on === s.on) { if (c.zone === "prop") cost += ovl(nb, ob) / area(nb) * 1.5; return; }   // crowding a neighbour on the same table or counter
          if (!solid(BY[o.id])) return;
          if (ob.z > nb.z) cost += ovl(fb, ob) / area(fb) * 2;                       // hidden behind something
          if (BY[o.id].zone === "char" && ob.z < nb.z) cost += ovl(nb, headBox(ob)) / area(headBox(ob)) * 3;   // would cover a friend's face
        });
        if (cost < .4 && cost < bestCost) { bestCost = cost; best = { on: s.on, slot: s.slot }; }
      });
      if (best) return best;
    }
    // 2. wall things: a free spot on the back wall, off the window, shelf and counter, as high as it fits
    if (c.zone === "wall") {
      wallGrid(c, function (w) {
        var wb = wallBox(c, w.x, w.y), cost2 = wallBlockFrac(wb, room) * 60 + spotCost(c, wb, items, bx);
        items.forEach(function (o) { var ob = bx[o.uid]; if (ob && solid(BY[o.id])) cost2 += ovl(wb, ob) / area(wb) * (BY[o.id].zone === "char" ? 3 : 2.5); });   // furniture and friends in front would hide it
        cost2 += (wb.y - 140) / 300 * (c.id === "bunting" ? 1.5 : .35) + Math.abs(w.x - 500) / 500 * .1;
        if (cost2 < bestCost) { bestCost = cost2; best = { x: w.x / 10, y: w.y / 7.5 }; }
      });
      return best || { x: 50, y: 30 };
    }
    // 3. floor: scan the floor; friends prefer the clear front row, big furniture the back
    for (var i = 0; i <= 14; i++) for (var j = 0; j <= 10; j++) {
      var f = clampFloor(c, 140 + i * 51, FOOT_MIN + 4 + j * 25), nb2 = floorBox(c, f.x, f.y);
      var cost3 = spotCost(c, nb2, items, bx);
      if (cost3 === Infinity) continue;
      var d = (f.y - FOOT_MIN) / (FOOT_MAX - FOOT_MIN);
      if (c.zone === "char") cost3 += Math.abs(d - .82) * .9;
      else if (isBig(c)) cost3 += d * .6;
      else if (c.zone === "rug") cost3 += Math.abs(d - .7) * .5;
      else cost3 += Math.abs(d - .55) * .35;
      cost3 += Math.abs(f.x - 500) / 500 * .12;
      if (cost3 < bestCost) { bestCost = cost3; best = { x: f.x / 10, y: f.y / 7.5 }; }
    }
    return best || { x: 50, y: c.zone === "char" ? 92 : 80 };
  }
  // a wall thing dropped on the window or shelf moves to the nearest free wall point
  function wallFix(c, cx, cy, room) {
    var w = clampWall(c, cx, cy);
    if (wallBlockFrac(wallBox(c, w.x, w.y), room) === 0) return w;
    var best = w, bd = Infinity;
    wallGrid(c, function (q) { var d = wallBlockFrac(wallBox(c, q.x, q.y), room) * 4000 + Math.hypot(q.x - cx, q.y - cy); if (d < bd) { bd = d; best = q; } });
    return best;
  }
  // a friend dropped behind furniture steps forward until her head and body show
  function unhideFriend(c, x, footY, items, exceptUid) {
    for (var k = 0; k < 8; k++) {
      var nb = floorBox(c, x, footY), fb = figBox(nb), hb = headBox(nb), moved = false;
      for (var i = 0; i < items.length && !moved; i++) {
        var o = items[i], oc = BY[o.id], ob = boxes[o.uid];
        if (o.uid === exceptUid || !ob || !solid(oc) || oc.zone === "char" || ob.z <= nb.z) continue;
        if (ovl(ob, fb) / area(fb) > .25 || ovl(ob, hb) / area(hb) > .15) { footY = Math.min(FOOT_MAX, Math.max(footY + 10, (ob.footY || footY) + 22)); moved = true; }
      }
      if (!moved) break;
    }
    return clamp(footY, FOOT_MIN, FOOT_MAX);
  }
  function slotTaken(parUid, slot, exceptUid, wantSitter) {
    return roomItems().some(function (t) {
      if (t.uid === exceptUid || t.on !== parUid || (t.slot | 0) !== slot) return false;
      return sitter(BY[t.id] || {}) === wantSitter;
    });
  }
  // find a seat (for friends and pets) or a surface (for small things) near a world point
  function findAnchor(c, px, py, exceptUid) {
    var best = null, bestD = (sitter(c) ? .42 : .34) * H;
    var wantS = sitter(c);
    roomItems().forEach(function (t) {
      if (t.uid === exceptUid || t.on === exceptUid) return;
      var pc = BY[t.id], b = boxes[t.uid]; if (!b || b.child) return;
      var list = wantS ? pc.seats : (c.zone === "prop" ? pc.surfaces : null);
      if (!list) return;
      list.forEach(function (a, i) {
        var ax = b.x + a[0] * b.w, ay = b.y + a[1] * b.h, d = Math.hypot(ax - px, ay - py);
        if (d < bestD && !slotTaken(t.uid, i, exceptUid, wantS)) { bestD = d; best = { on: t.uid, slot: i }; }
      });
    });
    if (!wantS && c.zone === "prop") {
      fixedKeys(curRoom()).forEach(function (k) {
        fixedSpots(k, curRoom()).spots.forEach(function (sp, i) {
          var d = Math.hypot(sp[0] - px, sp[1] - py);
          if (d < bestD && !slotTaken(k, i, exceptUid, false)) { bestD = d; best = { on: k, slot: i }; }
        });
      });
    }
    return best;
  }
  function clampFloor(c, x, footY) {
    footY = clamp(footY, FOOT_MIN, FOOT_MAX);
    var t = depthT(footY), half = boxH(c) * depthScale(footY) * aspectOf(c) / 2;
    var L = SIDE * (1 - t) + Math.min(half * .7, 160), R = 1000 - SIDE * (1 - t) - Math.min(half * .7, 160);
    return { x: clamp(x, Math.min(L, 500), Math.max(R, 500)), y: footY };
  }
  function clampWall(c, cx, cy) {
    var hh = boxH(c) * .86, ww = hh * aspectOf(c);
    return { x: clamp(cx, SIDE + 10 + ww / 2, 1000 - SIDE - 10 - ww / 2), y: clamp(cy, WALL_TOP + hh / 2, WALL_BOT - hh / 2) };
  }
  function charAt(px, py, exceptUid) {
    var hit = null;
    roomItems().forEach(function (t) {
      if (t.uid === exceptUid || BY[t.id].zone !== "char") return;
      var b = boxes[t.uid]; if (!b) return;
      if (px > b.x + b.w * .15 && px < b.x + b.w * .85 && py > b.y && py < b.y + b.h) hit = t;
    });
    return hit;
  }

  /* ---------- actions ---------- */
  function spend(price) { P().stars = (P().stars || 0) - price; doTop(); }
  function hiFor(c) { return c.zone === "char" ? "Hi! I'm " + c.name + "!" : c.name; }
  function placeNew(c, at) {
    var p = P(), t = { uid: ++p.homeSeq, id: c.id, x: r1(at.x || 50), y: r1(at.y || 80), room: curRoom() };
    if (at.on) { t.on = at.on; t.slot = at.slot; }
    p.home.push(t);
    spend(c.price);
    doSave();
    renderItems(); renderDrawer();
    return t;
  }
  function tapBuy(id) {
    var c = BY[id]; if (!c) return;
    var p = P();
    if (owned(c)) {
      // a friend who is already home: tapping calls her; she hops and says she is here (one copy only)
      var t = p.home.filter(function (h) { return h.id === id; })[0];
      if (houseView) setRoom(curRoom());
      if (roomOf(t) !== curRoom()) {
        var others = roomItems();
        t.room = curRoom(); delete t.on; delete t.slot; delete t.nap;
        applySpot(t, bestSpot(c, curRoom(), others));
        doSave(); renderItems(); lifeDropped(t.uid); land(t.uid, true); ring(t.uid);
      } else { lifeDropped(t.uid); anim(itemEl(t.uid), "bounce"); }
      bubble(t.uid, "I'm here!"); say("I'm here!"); snd([660, 880], .08);
      return;
    }
    if ((p.stars || 0) < c.price) { cantAfford(id); return; }
    var spot = bestSpot(c, curRoom(), roomItems()), t2 = placeNew(c, spot);
    if (livesHere(c)) lifeDropped(t2.uid);
    land(t2.uid, true);
    ring(t2.uid);
    timers.push(setTimeout(function () { if (boxes[t2.uid]) sparkle(boxes[t2.uid]); }, rm() ? 0 : 380));
    var el = itemEl(t2.uid);
    if (c.price) flyStar(scoreRect(), el && el.getBoundingClientRect(), 2);
    snd([523, 659, 784], .12);
    if (c.zone === "char") { bubble(t2.uid, "Hi!"); }
    say(hiFor(c));
  }
  function cantAfford(id, isPaint) {
    var pad = root.querySelector('.hg-pad[data-id="' + id + '"]' + (isPaint ? '[data-paint="' + isPaint + '"]' : ""));
    anim(pad, "shake");
    var s = document.getElementById("score"); if (s && !rm()) s.animate([{ transform: "rotate(0)" }, { transform: "rotate(-8deg)" }, { transform: "rotate(8deg)" }, { transform: "rotate(0)" }], 400);
    snd([330, 262], .12, "triangle");
    say("Do more sums to get stars!");
  }
  function tapPaint(kind, id) {
    var p = P(), list = kind === "wall" ? WALLS : FLOORS, it = list.filter(function (x) { return x.id === id; })[0]; if (!it) return;
    var key = kind + ":" + id, own = it.price === 0 || p.paints.indexOf(key) >= 0;
    if (!own) {
      if ((p.stars || 0) < it.price) { cantAfford(id, kind); return; }
      p.paints.push(key); spend(it.price);
      flyStar(scoreRect(), stageRect(), 2);
    }
    p.rooms[curRoom()][kind] = id;
    doSave();
    renderShell(); renderDrawer();
    if (!rm()) root.querySelector(".hg-shell").animate([{ clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0 0 0)" }], { duration: 400, easing: "ease-out" });
    snd([587, 784], .1); say(it.name);
  }
  function tapItem(t) {
    var c = BY[t.id], el = itemEl(t.uid);
    if (c.zone === "char" && life.actors[t.uid] && lifeTapFriend(t)) return;
    if (el && boxes[t.uid] && c.zone !== "char") sparkle(boxes[t.uid]);
    if (tapThing(t, c, el)) return;
    if (c.zone === "char") {
      bubble(t.uid, "Hi!"); say(hiFor(c)); snd([660, 880], .08);
      if (t.on) { anim(el, "bounce"); return; }
      var art = el.querySelector(".hg-art");
      art.innerHTML = KC().full(c.id, "wave");
      timers.push(setTimeout(function () { var e2 = itemEl(t.uid); if (e2 && !e2.classList.contains("lift")) e2.querySelector(".hg-art").innerHTML = KC().full(c.id, poseFor(t)); }, 2300));
      return;
    }
    if (c.tap === "tv") { t.state = ((t.state || 0) + 1) % 4; el.querySelector(".hg-art").innerHTML = tvSVG(t.state); doSave(); snd([523 + t.state * 110], .1); return; }
    if (c.tap === "lamp") { t.state = t.state ? 0 : 1; el.querySelector(".hg-art").innerHTML = floorlampSVG(!!t.state); doSave(); snd(t.state ? [784] : [392], .1); return; }
    if (c.tap === "guitar") { snd([392, 494, 587], .22, "triangle", .12); anim(el, "wiggle"); return; }
    if (c.tap === "drum") { snd([110, 110], .12, "sine", .16); anim(el, "bounce"); return; }
    if (c.tap === "radio") { snd([523, 659, 784, 659], .12, "sine", .15); anim(el, "wiggle"); return; }
    anim(el, "wiggle"); snd([660], .06); say(c.name);
  }
  function eat(charT, foodC) {
    var c = BY[charT.id], el = itemEl(charT.uid); if (!el) return;
    var a = life.actors[charT.uid];
    if (a) {
      endDuetsOf(a); stopWalking(a);
      var seated = !!(charT.on && typeof charT.on !== "string");
      lifeReact(a, { pose: seated ? (inBath(charT) || inBed(charT) ? shownPose(a, charT) : "eatsit") : "eat", eyes: "happy", dur: 2.6, fx: "crumbs", seatOk: true });
      var hh = headTop(a); burstFx(a.room, hh.x, hh.y, "heart", 2);
    } else {
      el.querySelector(".hg-art").innerHTML = KC().full(c.id, charT.on ? "sit" : "happy");
      if (!charT.on) timers.push(setTimeout(function () { var e2 = itemEl(charT.uid); if (e2 && !e2.classList.contains("lift")) e2.querySelector(".hg-art").innerHTML = KC().full(c.id, poseFor(charT)); }, 1600));
    }
    bubble(charT.uid, "Yum!"); say("Yum! " + foodC.name + "!");
    snd([392, 330, 392], .07, "triangle", .14);
    anim(el, "bounce");
  }
  // what a tapped thing does (returns true when it handled the tap)
  function tapThing(t, c, el) {
    var art = el && el.querySelector(".hg-art"), b = boxes[t.uid], room = roomOf(t);
    function top(fx, n) { if (b) burstFx(room, b.x + b.w / 2, b.y + b.h * .15, fx, n || 3); }
    switch (c.tap) {
      case "tv":
        t.state = ((t.state || 0) + 1) % 4; art.innerHTML = tvSVG(t.state); doSave(); snd([523 + t.state * 110], .1);
        if (t.state !== 3) top("star", 2);
        return true;
      case "guitar": snd([392, 494, 587, 494], .2, "triangle", .14); wiggleArt(art); top("note", 4); if (b) lifeDanceNear(room, b.x + b.w / 2, b.footY); return true;
      case "drum": snd([110, 147, 110], .12, "sine", .16); hopArt(art); top("note", 3); if (b) lifeDanceNear(room, b.x + b.w / 2, b.footY); return true;
      case "radio": t.state = t.state ? 0 : 1; snd(t.state ? [523, 659, 784, 659] : [392], .12, "sine", .15); wiggleArt(art); doSave(); if (t.state) { top("note", 4); if (b) lifeDanceNear(room, b.x + b.w / 2, b.footY + 40); } return true;
      case "disco": snd([784, 988, 1175], .08, "sine", .08); top("star", 5); if (art && !rm()) art.animate([{ transform: "rotate(0)" }, { transform: "rotate(360deg)" }], { duration: 900, easing: "ease-in-out" }); if (b) lifeDanceNear(room, b.x + b.w / 2, 640); return true;
      case "fridge": t.state = t.state ? 0 : 1; art.innerHTML = fridgeSVG(!!t.state); doSave(); snd(t.state ? [440, 660] : [660, 440], .08); if (t.state) top("star", 2); return true;
      case "oven": t.state = t.state ? 0 : 1; art.innerHTML = stoveSVG(!!t.state); doSave(); snd(t.state ? [523, 784] : [523, 392], .1); if (t.state) top("steam", 2); return true;
      case "teapot":
        snd([660, 587, 523], .1, "sine", .1);
        if (art && !rm()) art.animate([{ transform: "rotate(0)" }, { transform: "rotate(-24deg)", offset: .35 }, { transform: "rotate(-24deg)", offset: .7 }, { transform: "rotate(0)" }], { duration: 1100, easing: "ease-in-out" });
        if (b) { burstFx(room, b.x + b.w * .2, b.y + b.h * .6, "drop", 3); burstFx(room, b.x + b.w * .7, b.y, "steam", 2); }
        return true;
      case "bath": snd([523, 659, 523, 784], .07, "sine", .07); if (b) { for (var i = 0; i < 7; i++) floatFx(room, b.x + b.w * (.2 + Math.random() * .6), b.y + b.h * .35, "bubble", i < 2); } return true;
      case "water": snd([880, 988], .06); if (b) burstFx(room, b.x + b.w * .5, b.y + b.h * .3, "drop", 3); return true;
      case "clock":
        snd([784, 659, 523, 392], .3, "sine", .3); top("note", 2);
        if (art && !rm()) art.animate([{ transform: "rotate(0)" }, { transform: "rotate(-8deg)", offset: .2 }, { transform: "rotate(8deg)", offset: .45 }, { transform: "rotate(-5deg)", offset: .7 }, { transform: "rotate(0)" }], { duration: 900, easing: "ease-out" });
        return true;
      case "plant":
        snd([659, 880], .09, "triangle", .1); top("flower", 2);
        if (art && !rm()) art.animate([{ transform: "rotate(0)" }, { transform: "rotate(-5deg)", offset: .25 }, { transform: "rotate(4deg)", offset: .55 }, { transform: "rotate(-2deg)", offset: .8 }, { transform: "rotate(0)" }], { duration: 1200, easing: "ease-in-out" });
        return true;
      case "ducky": snd([1320, 1568], .06, "square", .08); hopArt(art); top("bubble", 2); return true;
      case "ball": snd([262, 523], .08, "sine", .12); hopArt(art, true); top("star", 2); return true;
      case "drawer":
        // a secret: the drawer holds a little toy
        snd([523, 659, 784, 1047], .08, "sine", .08); wiggleArt(art);
        if (b) { floatFx(room, b.x + b.w / 2, b.y + b.h * .5, pick(["heart", "star", "flower"]), true); top("star", 2); }
        return true;
    }
    if (c.zone === "pet") { snd(c.id === "cat" ? [880, 660] : [1047, 1319], .1, "triangle", .1); hopArt(art); top("heart", 2); say(c.name); return true; }
    if (c.seats && !c.bath) { snd([392, 523], .07); if (art && !rm()) art.animate([{ transform: "scale(1)" }, { transform: "scale(1.04,.94)", offset: .4 }, { transform: "scale(.98,1.02)", offset: .7 }, { transform: "none" }], { duration: 420, easing: "ease-out" }); return true; }
    return false;
  }
  function lampToggle() {
    var rs = P().rooms[curRoom()]; rs.lamp = !rs.lamp; doSave(); renderShell(); snd(rs.lamp ? [784] : [392], .1);
  }
  function setRoom(id) {
    if (id === curRoom() && !houseView) return;
    var wasHouse = houseView;
    houseView = false;
    P().homeRoom = id; doSave();
    if (wasHouse) layout();
    renderAll();
    if (!rm()) root.querySelector(".hg-stage").animate([{ opacity: .4, transform: "scale(.98)" }, { opacity: 1, transform: "none" }], { duration: 250, easing: "ease-out" });
    snd([523, 659], .08);
    var r = ROOMS.filter(function (x) { return x.id === id; })[0]; say(r.name);
    life.greetAt = life.clock + .35;
  }
  function setHouse(on) {
    houseView = !!on;
    layout(); renderAll();
    var el = root.querySelector(houseView ? ".hg-house" : ".hg-stage");
    if (!rm() && el) el.animate([{ opacity: .4, transform: "scale(.98)" }, { opacity: 1, transform: "none" }], { duration: 260, easing: "ease-out" });
    snd(houseView ? [523, 659, 784] : [523, 659], .08);
    life.greetAt = life.clock + .35;
  }
  function toggleNight() {
    lifeSetNight(!nightOn());
    doSave(); renderAll();
    var el = root.querySelector(houseView ? ".hg-house" : ".hg-stage");
    if (!rm() && el) el.animate([{ filter: "brightness(" + (nightOn() ? 1.25 : .6) + ")" }, { filter: "none" }], { duration: 600, easing: "ease-out" });
    snd(nightOn() ? [659, 523, 392] : [523, 659, 784], .12, "sine", .12);
    say(nightOn() ? "Good night!" : "Good morning!");
  }
  function inQuad(q, x, y) {
    var x0 = Math.min(q.x0, q.x1), x1 = Math.max(q.x0, q.x1);
    if (x < x0 - 6 || x > x1 + 6) return false;
    var f = (x - q.x0) / (q.x1 - q.x0), top = q.t0 + (q.t1 - q.t0) * f - 20, bot = q.b0 + (q.b1 - q.b0) * f;
    return y > top && y < bot + 6;
  }
  function shellFx(w, kind) {
    if (rm()) return;
    floatFx(curRoom(), w.x, w.y, kind, true);
  }
  function shellTap(w) {
    var r = curRoom(), rs = P().rooms[r];
    if (w.x > 440 && w.x < 560 && w.y > 20 && w.y < 140) { lampToggle(); return; }
    var side;
    for (side in DOORS[r]) if (inQuad(doorQuad(side), w.x, w.y)) { setRoom(DOORS[r][side]); return; }
    if (r === "living" && w.x < SIDE && inQuad({ x0: 16, x1: 64, t0: wallY(16, .62), t1: wallY(64, .62), b0: wallY(16, 0), b1: wallY(64, 0) }, w.x, w.y)) {
      // the front door: knock knock, a little bird flies by
      snd([1568, 1760, 1568, 1976], .07, "sine", .09); shellFx({ x: 60, y: wallY(40, .5) }, "heart");
      if (!rm()) { var layer = layerOf(r), bird = document.createElement("div"); bird.className = "hg-fx hg-fl"; bird.style.left = "3%"; bird.style.top = "52%"; bird.style.width = bird.style.height = "28px";
        bird.innerHTML = '<svg viewBox="0 0 24 24"><path d="M3 13 Q8 6 12 12 Q16 6 21 13 Q16 10 12 15 Q8 10 3 13 Z" fill="#74c8ff" stroke="' + INK + '" stroke-width="1.6" stroke-linejoin="round"/></svg>';
        layer.appendChild(bird); bird.animate([{ transform: "translate(0,0) scale(.5)", opacity: 0 }, { transform: "translate(60px,-40px) scale(1)", opacity: 1, offset: .3 }, { transform: "translate(220px,-150px) scale(.8)", opacity: 0 }], { duration: 1600, easing: "ease-out" }).onfinish = function () { bird.remove(); }; }
      return;
    }
    var wr = winRect(r);
    if (w.x > wr.x && w.x < wr.x + wr.w && w.y > wr.y && w.y < wr.y + wr.h) { rs.curtains = !rs.curtains; doSave(); renderShell(); snd(rs.curtains ? [659, 523] : [523, 659], .08); return; }
    var q = SECRETS[r];
    if (q && Math.hypot(w.x - q.x, w.y - q.y) < q.r + 16) {
      if (r === "living") {
        snd([1760, 2093, 1760], .05, "sine", .07);
        if (!rm()) { var lay = layerOf(r), mouse = document.createElement("div"); mouse.className = "hg-fx"; mouse.style.left = ((q.x - 22) / 10) + "%"; mouse.style.top = ((BACK_Y - 34) / 7.5) + "%"; mouse.style.width = "4.4%"; mouse.style.height = (34 / 7.5) + "%"; mouse.style.overflow = "hidden";
          mouse.innerHTML = '<svg viewBox="0 0 44 34" style="width:100%;height:100%;display:block"><g><ellipse cx="22" cy="26" rx="13" ry="10" fill="#c9c2cf" stroke="' + INK + '" stroke-width="2"/><circle cx="13" cy="16" r="6" fill="#c9c2cf" stroke="' + INK + '" stroke-width="2"/><circle cx="31" cy="16" r="6" fill="#c9c2cf" stroke="' + INK + '" stroke-width="2"/><circle cx="13" cy="16" r="3" fill="#ffb3c8"/><circle cx="31" cy="16" r="3" fill="#ffb3c8"/><circle cx="18" cy="24" r="1.8" fill="' + INK + '"/><circle cx="26" cy="24" r="1.8" fill="' + INK + '"/><circle cx="22" cy="28" r="2" fill="#ff8fb7"/></g></svg>';
          lay.appendChild(mouse); var g = mouse.querySelector("g");
          g.animate([{ transform: "translateY(30px)" }, { transform: "translateY(0)", offset: .3 }, { transform: "translateY(0)", offset: .75 }, { transform: "translateY(30px)" }], { duration: 1800, easing: "ease-in-out" }).onfinish = function () { mouse.remove(); }; }
      } else if (r === "kitchen") { snd([523, 784, 1047], .07, "triangle", .08); shellFx({ x: q.x, y: q.y - 10 }, "star"); shellFx({ x: q.x + 20, y: q.y }, "heart"); }
      else { snd([1319, 1568, 2093], .07, "sine", .08); shellFx({ x: q.x, y: q.y }, "star"); shellFx({ x: q.x - 30, y: q.y + 20 }, "star"); }
      return;
    }
    if (r === "kitchen" && w.x > 642 && w.x < 782 && w.y > KCOUNTER.top + 18 && w.y < KCOUNTER.foot) { rs.oven = !rs.oven; doSave(); renderShell(); snd(rs.oven ? [523, 784] : [523, 392], .1); return; }
    // anywhere else: a tiny sparkle where she touched
    snd([740], .04, "sine"); shellFx(w, "star");
  }

  /* ---------- dragging (Pointer Events, one pointer at a time) ---------- */
  function worldFromClient(cx, cy) {
    var r = stageRect();
    return { x: (cx - r.left) / r.width * 1000, y: (cy - r.top) / r.height * 750, r: r };
  }
  function overDrawer(cx, cy) {
    var b = root.querySelector(".hg-panel").getBoundingClientRect();
    var b2 = root.querySelector(".hg-cats").getBoundingClientRect();
    return (cx >= b.left - 6 && cx <= b.right + 6 && cy >= b.top - 6 && cy <= b.bottom + 6) ||
      (cx >= b2.left && cx <= b2.right && cy >= b2.top && cy <= b2.bottom);
  }
  function onDown(e) {
    if (drag || (e.button && e.button !== 0)) return;
    if (e.target.closest(".hg-house")) return;
    var it = e.target.closest(".hg-it"), pad = e.target.closest(".hg-pad"), heldEl = e.target.closest(".hg-held");
    if (heldEl && root.contains(heldEl)) {
      e.preventDefault();
      var hu = +heldEl.dataset.held, ht = findT(hu);
      if (!ht || !isHeld(ht)) return;
      var owner = heldBy(ht), slot0 = ht.slot | 0, hr = heldEl.getBoundingClientRect(), wp = worldFromClient(hr.left + hr.width / 2, hr.bottom);
      delete ht.on; delete ht.slot;
      var hf = clampFloor(BY[ht.id], wp.x, wp.y); ht.x = r1(hf.x / 10); ht.y = r1(hf.y / 7.5);
      renderItems();
      var hel = itemEl(hu); if (!hel) return;
      drag = { kind: "move", uid: hu, el: hel, sx: e.clientX, sy: e.clientY, id: e.pointerId, moved: false, t0: Date.now(), detached: owner, slot: slot0 };
    } else if (it && root.contains(it)) {
      e.preventDefault();
      drag = { kind: "move", uid: +it.dataset.u, el: it, sx: e.clientX, sy: e.clientY, id: e.pointerId, moved: false, t0: Date.now() };
    } else if (pad && root.contains(pad)) {
      e.preventDefault();
      drag = { kind: "pad", pad: pad, cid: pad.dataset.id, paint: pad.dataset.paint, sx: e.clientX, sy: e.clientY, id: e.pointerId, moved: false };
    } else if (e.target.classList.contains("hg-items")) {
      // empty room: the hanging lamp is the only thing to tap there
      shellTap(worldFromClient(e.clientX, e.clientY));
      return;
    } else return;
    try { root.setPointerCapture(e.pointerId); } catch (x) {}
  }
  function startMove(e) {
    var t = findT(drag.uid); if (!t) { drag = null; return; }
    lifeGrab(t.uid);
    var c = BY[t.id], b = boxes[t.uid]; if (!b) { drag = null; return; }
    drag.t = t; drag.c = c; drag.box = { x: b.x, y: b.y, w: b.w, h: b.h };
    var w = worldFromClient(e.clientX, e.clientY);
    // what point of the item the finger holds (fractions of its box)
    if (c.zone === "char") { drag.gx = .5; drag.gy = 185 / 260; }
    else { drag.gx = clamp((w.x - b.x) / b.w, 0, 1); drag.gy = clamp((w.y - b.y) / b.h, 0, 1); }
    // children (friends on the sofa, cakes on the table) travel with their furniture
    drag.kids = [];
    P().home.forEach(function (k) {
      if (k.on === t.uid && boxes[k.uid]) {
        var kb = boxes[k.uid], kel = itemEl(k.uid), fr = root.querySelector('.hg-bathfront[data-front="' + k.uid + '"]');
        drag.kids.push({ el: kel, front: fr, dx: kb.x - b.x, dy: kb.y - b.y, w: kb.w, h: kb.h, fb: fr ? boxes[t.uid] : null });
      }
    });
    var front = root.querySelector('.hg-bathfront[data-front="' + t.uid + '"]'); if (front) front.remove();
    drag.el.style.clipPath = "";
    drag.el.classList.add("lift"); drag.el.style.zIndex = 8000;
    drag.kids.forEach(function (k) { if (k.el) k.el.style.zIndex = 8001; if (k.front) k.front.style.zIndex = 8002; });
    if (c.zone === "char") {
      drag.el.classList.remove("seated", "inbed", "face-l", "face-r", "walking", "looking");
      drag.el.style.transform = ""; drag.el.style.opacity = "";
      var heldArt = drag.el.querySelector(".hg-art");
      heldArt.style.clipPath = ""; heldArt.style.transform = "";
      heldArt.innerHTML = KC().full(c.id, "held", { eyes: "surprised" });
      // what she holds goes up with her raised paw (about 75% across, 55% down her drawing)
      drag.el.querySelectorAll(".hg-held.hand").forEach(function (hh) {
        var w0 = parseFloat(hh.style.width) || 20, h0 = parseFloat(hh.style.height) || 20;
        hh.style.left = (74.5 - w0 / 2).toFixed(2) + "%"; hh.style.top = (60 - h0).toFixed(2) + "%";
      });
      var hs = boxH(c) * b.s; drag.box.h = hs; drag.box.w = hs * 200 / 260;
    }
    root.classList.add("dragging", "lifting");
    root.querySelectorAll(".hg-bubble").forEach(function (x) { x.remove(); });
    addDragShadow(c);
    snd([330, 494], .07, "triangle", .06);
    // one time only: tell her how to tidy up
    if (!P().homeTipBox) { P().homeTipBox = 1; doSave(); say("Put it in the box to get your stars back."); }
  }
  function addDragShadow(c) {
    if (c.zone === "wall") return;
    var sh = document.createElement("i"); sh.className = "hg-dragsh";
    root.querySelector(".hg-items").appendChild(sh); drag.sh = sh;
  }
  // while lifted: the shadow stays on the floor under the finger; the body tilts a little toward the drag
  function dragFeedback(e, b) {
    if (drag.sh) {
      var fyv = clamp(b.y + b.h, FOOT_MIN, FOOT_MAX), w = Math.max(b.w * (drag.c.zone === "char" ? .42 : .6), 30), hh = Math.max(w * .16, 8);
      drag.sh.style.left = ((b.x + b.w / 2 - w / 2) / 10) + "%"; drag.sh.style.top = ((fyv - hh / 2) / 7.5) + "%";
      drag.sh.style.width = (w / 10) + "%"; drag.sh.style.height = (hh / 7.5) + "%";
    }
    if (rm()) return;
    var dx = e.clientX - (drag.lx == null ? e.clientX : drag.lx); drag.lx = e.clientX;
    drag.vx = (drag.vx || 0) * .7 + dx * .3;
    var deg = clamp(drag.vx * .9, -7, 7), art = drag.el.querySelector(".hg-art");
    if (art) art.style.transform = "translateY(-4%) scale(1.06) rotate(" + deg.toFixed(1) + "deg)";
  }
  function startPad(e) {
    var c = BY[drag.cid];
    if (drag.paint || !c) { drag.noDrag = true; return; }
    if (owned(c)) {
      // a friend already at home: drag her in from the drawer (moves her here)
      var t = P().home.filter(function (h) { return h.id === c.id; })[0];
      drag.existing = t;
    } else if ((P().stars || 0) < c.price) { drag.noDrag = true; cantAfford(c.id); return; }
    var s = depthScale(640), hh = boxH(c) * (c.zone === "wall" ? .86 : s), ww = hh * aspectOf(c);
    var el = document.createElement("div");
    el.className = "hg-it lift " + c.zone + (c.zone === "char" ? " char" : "");
    el.innerHTML = '<i class="hg-sh"></i><div class="hg-art">' + (c.zone === "char" ? KC().full(c.id, "held", { eyes: "surprised" }) : artHTML(c, null)) + "</div>";
    el.style.zIndex = 8000;
    root.querySelector(".hg-items").appendChild(el);
    drag.el = el; drag.c = c; drag.box = { w: ww, h: hh }; drag.kids = [];
    drag.gx = .5; drag.gy = c.zone === "char" ? 185 / 260 : .6;
    addDragShadow(c);
    if (drag.existing) { var old = itemEl(drag.existing.uid); if (old) old.style.visibility = "hidden"; }
    root.classList.add("dragging");
    drag.pad.style.opacity = ".35";
    snd([330, 494], .07, "triangle", .06);
  }
  function onMove(e) {
    if (!drag || e.pointerId !== drag.id) return;
    if (!drag.moved) {
      if (Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 8) return;
      drag.moved = true;
      if (drag.kind === "move") startMove(e); else startPad(e);
      if (!drag || drag.noDrag) return;
    }
    if (drag.noDrag) return;
    e.preventDefault();
    var w = worldFromClient(e.clientX, e.clientY), b = drag.box;
    b.x = w.x - drag.gx * b.w; b.y = w.y - drag.gy * b.h;
    drag.el.style.left = (b.x / 10) + "%"; drag.el.style.top = (b.y / 7.5) + "%";
    drag.el.style.width = (b.w / 10) + "%"; drag.el.style.height = (b.h / 7.5) + "%";
    drag.kids.forEach(function (k) {
      if (k.el) { k.el.style.left = ((b.x + k.dx) / 10) + "%"; k.el.style.top = ((b.y + k.dy) / 7.5) + "%"; }
      if (k.front) { k.front.style.left = (b.x / 10) + "%"; k.front.style.top = (b.y / 7.5) + "%"; }
    });
    dragFeedback(e, b);
    var ov = overDrawer(e.clientX, e.clientY);
    root.querySelector(".hg-panel").classList.toggle("over", ov && drag.kind === "move");
    drag.over = ov;
  }
  function onUp(e) {
    if (!drag || e.pointerId !== drag.id) return;
    var d = drag; drag = null;
    try { root.releasePointerCapture(e.pointerId); } catch (x) {}
    root.classList.remove("dragging", "lifting");
    root.querySelector(".hg-panel").classList.remove("over");
    if (d.sh) d.sh.remove();
    if (d.el) { var art0 = d.el.querySelector(".hg-art"); if (art0) art0.style.transform = ""; }
    if (!d.moved || d.noDrag) {
      if (d.moved) { if (d.pad) d.pad.style.opacity = ""; return; }
      if (e.type === "pointercancel") return;
      if (d.kind === "move" && d.detached) {
        // a tap on a held thing: it stays in her paw, and she is pleased
        var ht2 = findT(d.uid), own = findT(d.detached);
        if (ht2 && own) { ht2.on = "f:" + d.detached; ht2.slot = d.slot; renderItems(); if (life.actors[own.uid]) lifeTapFriend(own); }
        return;
      }
      if (d.kind === "move") { var t = findT(d.uid); if (t) tapItem(t); }
      else if (d.paint) tapPaint(d.paint, d.cid);
      else tapBuy(d.cid);
      return;
    }
    if (d.pad) d.pad.style.opacity = "";
    var c = d.c, b = d.box;
    var cancel = e.type === "pointercancel";
    // dropped on the drawer: put it away (refund) or cancel a new one
    if (d.over || cancel) {
      if (d.kind === "pad") {
        if (d.existing) { var old = itemEl(d.existing.uid); if (old) old.style.visibility = ""; }
        shrinkAway(d.el, null);
        return;
      }
      if (cancel) { renderItems(); return; }
      putAway(d);
      return;
    }
    // where does it land? (world coordinates)
    var footX = b.x + b.w / 2, footY = b.y + b.h, at, t2 = d.kind === "move" ? d.t : d.existing;
    if ((c.zone === "char" || HOPPERS[c.id]) && t2 && !houseView) {
      var fw = worldFromClient(e.clientX, e.clientY), here = curRoom(), dside = null;
      Object.keys(DOORS[here]).forEach(function (sd) { if (inQuad(doorQuad(sd), fw.x, fw.y) || inQuad(doorQuad(sd), footX, footY - 30)) dside = sd; });
      if (dside) { carryThrough(t2, here, dside, d); return; }
    }
    if (c.zone === "wall") {
      var wc = wallFix(c, b.x + b.w / 2, b.y + b.h / 2, curRoom());
      at = { x: wc.x / 10, y: wc.y / 7.5 };
    } else {
      var hip = c.zone === "char" ? { x: footX, y: b.y + b.h * 230 / 260 } : { x: footX, y: footY };
      var anchor = (c.zone === "char" || c.zone === "pet" || c.zone === "prop") ? findAnchor(c, hip.x, hip.y, t2 ? t2.uid : -1) : null;
      var holdable = (c.zone === "prop" && !c.food) || c.id === "ball" || c.id === "balloon";
      var holder = holdable ? charAt(footX, b.y + b.h / 2, t2 ? t2.uid : -1) : null;
      var baking = c.raw && curRoom() === "kitchen" && footX > 630 && footX < 795 && footY > KCOUNTER.top + 10 && footY < KCOUNTER.foot + 30;
      if (c.raw && anchor && typeof anchor.on !== "string" && findT(anchor.on) && findT(anchor.on).id === "stove") baking = "stove";
      if (baking === true) anchor = { on: "kcounter", slot: 2 };
      if (holder && !baking) {
        var hslot = c.id === "crown" ? 1 : 0;
        // what she held before goes down beside her
        P().home.forEach(function (k) {
          if (k.on === "f:" + holder.uid && (k.slot | 0) === hslot && (!t2 || k.uid !== t2.uid)) {
            var hb0 = boxes[holder.uid], hf0 = clampFloor(BY[k.id], hb0 ? hb0.x + hb0.w + 30 : 500, hb0 ? hb0.footY : FOOT_MAX - 20);
            delete k.on; delete k.slot; k.x = r1(hf0.x / 10); k.y = r1(hf0.y / 7.5);
          }
        });
        anchor = { on: "f:" + holder.uid, slot: hslot };
      }
      var food = c.food ? charAt(footX, b.y + b.h / 2, -1) : null;
      if (food && d.kind === "move" && !anchor) {
        // feed a friend: she eats happily, the treat goes back where it was
        renderItems(); eat(food, c); return;
      }
      var hugWith = null;
      if (!anchor && c.zone === "char") {
        var under = charAt(footX, b.y + b.h * .55, t2 ? t2.uid : -1);
        if (under && life.actors[under.uid]) {
          hugWith = under;
          var ub = boxes[under.uid], ua = life.actors[under.uid], ucx = ub ? ub.x + ub.w / 2 : under.x * 10, uy = under.on ? (ub ? ub.footY + 30 : FOOT_MAX - 10) : ua.y;
          footX = ucx + (footX < ucx ? -1 : 1) * 170; footY = clamp(uy, FOOT_MIN, FOOT_MAX);
        }
      }
      if (anchor) at = { on: anchor.on, slot: anchor.slot };
      else {
        // never hidden behind furniture: step forward until her head and body show
        var fc = clampFloor(c, footX, footY);
        if (sitter(c)) fc = clampFloor(c, fc.x, unhideFriend(c, fc.x, fc.y, roomItems(), t2 ? t2.uid : -1));
        at = { x: fc.x / 10, y: fc.y / 7.5 };
      }
    }
    var landed;
    if (d.kind === "pad" && !d.existing) {
      d.el.remove();
      landed = placeNew(c, at);
      timers.push(setTimeout(function () { var el = itemEl(landed.uid); if (c.price) flyStar(scoreRect(), el && el.getBoundingClientRect(), 2); }, 0));
      snd([523, 659, 784], .12);
      say(hiFor(c));
    } else {
      if (d.kind === "pad") d.el.remove();
      landed = t2; landed.room = curRoom();
      if (at.on) { landed.on = at.on; landed.slot = at.slot; }
      else { delete landed.on; delete landed.slot; landed.x = Math.round(at.x * 10) / 10; landed.y = Math.round(at.y * 10) / 10; }
      doSave();
      renderItems(); renderDrawer();
      snd(at.on ? [523, 784] : [196], at.on ? .08 : .1, "sine", .07);
    }
    var nb = boxes[landed.uid];
    if (nb) { landed.x = Math.round((nb.x + nb.w / 2) / 10 * 10) / 10; if (BY[landed.id].zone !== "wall") landed.y = Math.round(nb.footY / 7.5 * 10) / 10; doSave(); }
    land(landed.uid, false);
    if (!at.on && c.zone !== "wall" && nb) puff(nb);
    if (d.kind === "pad" || at.on) { if (nb) sparkle(nb); }
    if (c.zone === "char" || c.zone === "pet") lifeDropped(landed.uid);
    if (isHeld(landed)) {
      var ha = life.actors[heldBy(landed)], hft = findT(heldBy(landed));
      if (ha && hft) {
        lifeReact(ha, { pose: hft.on ? shownPose(ha, hft) : "happy", eyes: "happy", dur: 1.4, seatOk: true });
        var hl = landed.slot ? "I'm a princess!" : "Thank you!";
        sayBubble(ha, landed.slot ? "So pretty!" : "Thank you!", 1.8);
        var hnow = performance.now(); if (hnow - life.lastSpeak >= SPEAK_GAP_MS) { life.lastSpeak = hnow; say(hl); }
        logEv("hold", { id: ha.id, thing: landed.id, slot: landed.slot | 0 });
      }
    }
    if (baking) bake(landed, baking);
    if (c.zone === "char") {
      var la = life.actors[landed.uid];
      if (hugWith && la) lifeHug(landed.uid, hugWith.uid);
      else if (at.on && inBed(landed)) { bubble(landed.uid, "Night night!"); snd([523, 392], .12, "sine", .14); }
      else if (at.on) {
        bubble(landed.uid, inBath(landed) ? "Splash!" : "Comfy!");
        if (inBath(landed) && la && nb) for (var bi = 0; bi < 6; bi++) floatFx(la.room, nb.x + nb.w * Math.random(), nb.y + nb.h * .6, "bubble", bi < 2);
      } else if (la && !dropNear(landed, la)) bubble(landed.uid, "Hi!");
    }
  }
  // Marie carried a friend into a doorway: she goes into the next room, and the view goes with her
  function carryThrough(t, from, side, d) {
    var to = DOORS[from][side], c = BY[t.id], opp = side === "l" ? "r" : "l";
    if (d.kind === "pad" && d.el) d.el.remove();
    t.room = to; delete t.on; delete t.slot; delete t.nap;
    var f = clampFloor(c, DOOR_IN[opp].x + (opp === "l" ? 40 : -40), DOOR_IN[opp].y + 20);
    t.x = r1(f.x / 10); t.y = r1(f.y / 7.5);
    heldFollow();
    logEv("carried", { id: t.id, from: from, to: to });
    setRoom(to);
    lifeDropped(t.uid);
    var a = life.actors[t.uid];
    if (a && a.friend) { lifeReact(a, { pose: "wave", eyes: "happy", dur: 1.6 }); sayBubble(a, "Hi!", 1.6); }
    land(t.uid, false);
  }
  // the oven is a machine: dough goes in, a cookie comes out
  function bake(t, where) {
    var raw = BY[t.id] && BY[t.id].raw; if (!raw) return;
    var rs = P().rooms.kitchen, stove = where === "stove" ? findT(t.on) : null, wasOn = stove ? !!stove.state : !!rs.oven;
    if (stove) { stove.state = 1; var se = itemEl(stove.uid); if (se) se.querySelector(".hg-art").innerHTML = stoveSVG(true); }
    else { rs.oven = true; renderShell(); }
    snd([392, 440, 494], .12, "sine", .2);
    logEv("bake", { thing: t.id });
    timers.push(setTimeout(function () {
      var cur = findT(t.uid); if (!cur || cur.id !== t.id) return;
      cur.id = raw;
      if (stove) { stove.state = wasOn ? 1 : 0; } else rs.oven = wasOn;
      doSave(); renderShell(); renderItems();
      var b2 = boxes[cur.uid]; if (b2) { sparkle(b2); burstFx(roomOf(cur), b2.x + b2.w / 2, b2.y, "star", 3); }
      snd([1047, 1319, 1568], .14, "sine", .12);
      logEv("baked", { thing: raw });
    }, rm() ? 600 : 2200));
  }
  // a friend put down near the TV watches it (the TV turns on); near the table, oven or kitchen counter she has a snack
  function dropNear(t, a) {
    var room = roomOf(t), list = itemsIn(room), bx = computeBoxes(list, room), fx = a.x, fy = a.y, tv = null, eatAt = null;
    list.forEach(function (o) {
      var b = bx[o.uid]; if (!b || b.child) return;
      var dx = Math.abs(b.x + b.w / 2 - fx), dy = fy - b.footY;
      if (o.id === "tv" && dx < 260 && dy > -40 && dy < 230) tv = o;
      if (EATS[o.id] && dx < 230 && dy > -40 && dy < 170) eatAt = o;
    });
    if (!eatAt && room === "kitchen" && fy < FOOT_MIN + 110 && fx > 440 && fx < 930) eatAt = { uid: null };
    if (tv) {
      if ((tv.state || 0) % 4 === 3) { tv.state = 0; var te = itemEl(tv.uid); if (te) te.querySelector(".hg-art").innerHTML = tvSVG(0); doSave(); }
      var tb = bx[tv.uid]; a.face = tb.x + tb.w / 2 > fx ? 1 : -1;
      lifeReact(a, { pose: "stand", eyes: "happy", dur: 6, fx: "tv", toy: tv.uid, after: function (x) { x.face = 0; } });
      sayBubble(a, "TV time!", 1.8); snd([523, 659, 784], .08); logEv("watch", { id: a.id, room: room });
      return true;
    }
    if (eatAt) {
      lifeReact(a, { pose: "eat", eyes: "happy", dur: 3.4, fx: "crumbs" });
      sayBubble(a, "Yum yum!", 1.8); snd([392, 330, 392], .07, "triangle", .14); logEv("snack", { id: a.id, room: room });
      var now = performance.now(); if (now - life.lastSpeak >= SPEAK_GAP_MS) { life.lastSpeak = now; say("Yummy!"); }
      return true;
    }
    return false;
  }
  function shrinkAway(el, done) {
    var target = root.querySelector(".hg-panel").getBoundingClientRect(), r = el.getBoundingClientRect();
    if (rm()) { el.remove(); if (done) done(); return; }
    var dx = target.left + target.width / 2 - (r.left + r.width / 2), dy = target.top + target.height / 2 - (r.top + r.height / 2);
    var an = el.animate([{ transform: "none", opacity: 1 }, { transform: "translate(" + dx + "px," + dy + "px) scale(.15)", opacity: 0 }], { duration: 380, easing: "ease-in" });
    an.onfinish = function () { el.remove(); if (done) done(); };
  }
  function putAway(d) {
    var t = d.t, c = d.c, p = P();
    // things resting on it fall gently to the floor next to where it was
    p.home.forEach(function (k) {
      if (k.on === t.uid || k.on === "f:" + t.uid) { delete k.on; delete k.slot; var kb = boxes[k.uid]; if (kb) { var f = clampFloor(BY[k.id], kb.x + kb.w / 2, Math.max(kb.footY, FOOT_MIN + 30)); k.x = f.x / 10; k.y = f.y / 7.5; } }
    });
    p.home = p.home.filter(function (h) { return h.uid !== t.uid; });
    p.stars = (p.stars || 0) + c.price;
    doTop(); doSave();
    var fromR = d.el.getBoundingClientRect();
    shrinkAway(d.el, function () { renderItems(); renderDrawer(); });
    if (c.price) flyStar(root.querySelector(".hg-panel").getBoundingClientRect(), scoreRect(), 2);
    snd([784, 659, 523], .1);
    say(c.price ? c.name + " is put away. " + c.price + " stars back!" : c.name + " is resting.");
    void fromR;
  }
  function onKey(e) {
    if (e.key !== "Enter" && e.key !== " ") return;
    var mini = e.target.closest(".hg-mini");
    if (mini) { e.preventDefault(); setRoom(mini.dataset.room); return; }
    var it = e.target.closest(".hg-it"), pad = e.target.closest(".hg-pad");
    if (it) { e.preventDefault(); var t = findT(+it.dataset.u); if (t) tapItem(t); }
    else if (pad) { e.preventDefault(); if (pad.dataset.paint) tapPaint(pad.dataset.paint, pad.dataset.id); else tapBuy(pad.dataset.id); }
  }
  function onClick(e) {
    var cb = e.target.closest(".hg-cat");
    if (cb) { cat = cb.dataset.cat; renderDrawer(); snd([660], .05); say(CATS.filter(function (x) { return x.id === cat; })[0].name); return; }
    var rb = e.target.closest(".hg-roomtab");
    if (rb) {
      if (rb.dataset.act === "house") setHouse(!houseView);
      else if (rb.dataset.act === "night") toggleNight();
      else setRoom(rb.dataset.room);
      return;
    }
    var mini = e.target.closest(".hg-mini");
    if (mini) { setRoom(mini.dataset.room); return; }
    var ar = e.target.closest(".hg-arrow");
    if (ar && !ar.disabled) {
      page[cat] = (page[cat] || 0) + (ar.classList.contains("next") ? 1 : -1); renderDrawer(); snd([587], .05);
      if (!rm()) root.querySelector(".hg-grid").animate([{ opacity: 0, transform: "translateX(" + (ar.classList.contains("next") ? 24 : -24) + "px)" }, { opacity: 1, transform: "none" }], { duration: 250, easing: "ease-out" });
    }
  }

  /* =====================================================================
   * LIFE: the friends walk, sit, play, eat, sleep and chat on their own, and walk
   * from room to room through the doorways. Marie always comes first: a friend she
   * picks up stops at once, and a friend she places stays there for 30 seconds.
   * One requestAnimationFrame loop. It stops when the Home is closed, the page is
   * hidden, or the Home is off screen. Live positions live here; P.home changes only
   * when a friend arrives somewhere, and it is saved at most every 5 seconds.
   * Speech bubbles are text only; nothing is spoken unless Marie taps.
   * ===================================================================== */
  var SHORT = { kitty: "Mimi", melody: "Bella", kuromi: "Lulu", purin: "Momo", cinna: "Puff" };
  var BEST = { "kitty|melody": 1, "cinna|purin": 1, "kitty|purin": 1, "cinna|melody": 1 };
  var HOPPERS = { cat: 1, bunnyfull: 1 };
  var TOYS = { drum: "music", guitar: "music", radio: "music", discoball: "music", dolls: "cuddle", teddy: "cuddle", unicorn: "cuddle",
    books: "read", bookshelf: "read", puzzle: "play", yarn: "play", balloon: "play", gift: "play", ducky: "play", crown: "play", kite: "play", ball: "ball", tv: "tv" };
  var EATS = { table: 1, stove: 1, counter: 1, countersink: 1, fridge: 1 };
  var DOOR_PT = { l: { x: 34, y: 598 }, r: { x: 966, y: 598 } };
  var DOOR_IN = { l: { x: 170, y: 642 }, r: { x: 830, y: 642 } };
  var WALK_SPEED = 150, PIN_SECONDS = 30, SAVE_EVERY_MS = 5000, SPEAK_GAP_MS = 3500;
  var houseView = false;
  var life = { on: false, raf: 0, last: 0, clock: 0, frames: 0, actors: {}, duets: [], events: [], fx: [], dirty: false, lastSave: 0,
    visible: true, io: null, reserved: {}, nextTrip: 0, nextChat: {}, nextAmbient: 0, lastSpeak: -1e9, firstTap: true, syncAt: 0,
    view: {}, viewSingle: { w: 400, h: 300 }, viewMini: { w: 200, h: 150 }, greetAt: -1, saves: 0 };

  function rnd(a, b) { return a + Math.random() * (b - a); }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function weighted(list) {   // list of [value, weight]
    var sum = 0; list.forEach(function (o) { sum += o[1]; });
    var r = Math.random() * sum;
    for (var i = 0; i < list.length; i++) { r -= list[i][1]; if (r <= 0) return list[i][0]; }
    return list[list.length - 1][0];
  }
  function easeIO(u) { return .5 - .5 * Math.cos(Math.PI * clamp(u, 0, 1)); }
  function livesHere(c) { return !!c && (c.zone === "char" || !!HOPPERS[c.id]); }
  function nightOn() { return !!(P() && P().homeNight); }
  function visRooms() { return houseView ? ROOMS.map(function (r) { return r.id; }) : [curRoom()]; }
  function roomVisible(r) { return !!root && visRooms().indexOf(r) >= 0; }
  function layerOf(r) {
    if (!root || !roomVisible(r)) return null;
    return houseView ? root.querySelector('.hg-hitems[data-room="' + r + '"]') : root.querySelector(".hg-stage .hg-items");
  }
  function itemsIn(r) { return P().home.filter(function (t) { return BY[t.id] && roomOf(t) === r; }); }
  function logEv(type, o) { o.type = type; o.t = Math.round(life.clock * 10) / 10; life.events.push(o); if (life.events.length > 120) life.events.shift(); }
  function seatParent(t) { return t && t.on && typeof t.on !== "string" ? findT(t.on) : null; }
  function isBedUid(uid) { var p = findT(uid); return !!(p && p.id === "bed"); }
  function actorsIn(r) { return Object.keys(life.actors).map(function (u) { return life.actors[u]; }).filter(function (a) { return a.room === r; }); }
  function friendsIn(r) { return actorsIn(r).filter(function (a) { return a.friend; }).length; }

  /* ---------- actors ---------- */
  function newActor(t) {
    var a = { uid: t.uid, id: t.id, friend: BY[t.id].zone === "char", room: roomOf(t), x: t.x * 10, y: t.y * 7.5, face: 0, pose: "stand", eyes: null,
      plan: [], step: null, nextThink: life.clock + rnd(3, 5), pinUntil: 0, hist: [], seat: null, seatPose: null, op: 1, bob: 0, react: null,
      el: null, art: null, base: null, shown: "", walking: false, looking: false, held: false };
    seatFromSave(a, t);
    return a;
  }
  function seatFromSave(a, t) {
    a.seat = null; a.step = null;
    if (!t.on || typeof t.on === "string") return;
    a.seat = { on: t.on, slot: t.slot | 0 };
    var par = findT(t.on), bed = par && par.id === "bed", bath = par && BY[par.id] && BY[par.id].bath;
    a.step = { t: "seated", until: bed && (t.nap || nightOn()) ? Infinity : life.clock + (bed || bath ? rnd(9, 15) : rnd(5, 12)), soft: !bed, fx: bed ? "zzz" : bath ? "bubbles" : null };
  }
  function resetActor(a, t) {
    endDuetsOf(a);
    releaseRes(a);
    a.room = roomOf(t); a.x = t.x * 10; a.y = t.y * 7.5; a.plan = []; a.react = null; a.op = 1; a.bob = 0; a.walking = false; a.looking = false;
    a.pose = "stand"; a.eyes = null; a.face = 0; a.seatPose = null; a.held = false;
    seatFromSave(a, t);
    a.nextThink = life.clock + rnd(1.5, 3);
    removeBubble(a);
  }
  function lifeSync() {
    if (!P()) return;
    var seen = {};
    P().home.forEach(function (t) {
      if (!livesHere(BY[t.id])) return;
      seen[t.uid] = 1;
      if (!life.actors[t.uid]) life.actors[t.uid] = newActor(t);
    });
    Object.keys(life.actors).forEach(function (u) { if (!seen[u]) { releaseRes(life.actors[u]); endDuetsOf(life.actors[u]); delete life.actors[u]; } });
  }
  function reserve(key, a) { life.reserved[key] = a.uid; a.res = key; }
  function releaseRes(a) { if (a.res && life.reserved[a.res] === a.uid) delete life.reserved[a.res]; a.res = null; }
  function commit(a) {
    var t = findT(a.uid); if (!t || t.on) return;
    var f = clampFloor(BY[a.id], a.x, a.y);
    t.x = r1(f.x / 10); t.y = r1(f.y / 7.5);
    life.dirty = true;
  }

  /* what the friend shows: pose and face */
  function shownPose(a, t) {
    var par = seatParent(t);
    if (a.react && a.react.until > life.clock) {
      if (!par || a.react.seatOk) return a.react.pose;
    }
    if (par) {
      var pc = BY[par.id];
      if (pc.bath) return "bath";
      if (pc.id === "bed") return "sleep";
      return a.seatPose || "sit";
    }
    return a.pose || "stand";
  }
  function shownEyes(a, t, pose) {
    if (a.react && a.react.until > life.clock && a.react.eyes) return a.react.eyes;
    if (a.eyes) return a.eyes;
    if (nightOn() && (pose === "stand" || pose === "sit" || pose === "walk")) return "sleepy";
    return null;
  }
  function poseKey(a, t) { var p = shownPose(a, t); return p + "|" + (shownEyes(a, t, p) || ""); }
  function charArt(a, t) {
    var p = shownPose(a, t), e = shownEyes(a, t, p);
    return KC().full(a.id, p, e ? { eyes: e } : null);
  }
  function applyPose(a, t, key) {
    a.shown = key;
    if (!a.friend || !a.art) return;
    a.art.innerHTML = charArt(a, t);
  }
  function liveBox(a) { return floorBox(BY[a.id], a.x, a.y); }

  /* ---------- the loop ---------- */
  function lifeCanRun() { return !!root && life.on && !document.hidden && life.visible; }
  function lifeWake() { if (!life.raf && lifeCanRun()) { life.last = 0; life.raf = requestAnimationFrame(lifeTick); } }
  function lifePause() { if (life.raf) cancelAnimationFrame(life.raf); life.raf = 0; }
  function lifeTick(now) {
    life.raf = 0;
    if (!lifeCanRun()) return;
    var dt = life.last ? Math.min(.25, (now - life.last) / 1000) : 0;   // slow devices still keep real time
    life.last = now; life.frames++;
    if (!drag && !window.__homeLifeOff) { life.clock += dt; lifeStep(dt); }
    lifeDraw();
    lifeFxSweep();
    if (life.dirty && performance.now() - life.lastSave >= SAVE_EVERY_MS) { life.dirty = false; life.lastSave = performance.now(); life.saves++; doSave(); }
    life.raf = requestAnimationFrame(lifeTick);
  }
  function lifeFlush() {
    Object.keys(life.actors).forEach(function (u) { var a = life.actors[u]; if (!a.held && a.step && (a.step.t === "walk" || a.step.t === "exit")) commit(a); });
    if (life.dirty) { life.dirty = false; life.lastSave = performance.now(); life.saves++; doSave(); }
  }
  function lifeStart() {
    life.on = true; life.clock = 0; life.frames = 0; life.actors = {}; life.duets = []; life.reserved = {}; life.fx = []; life.events = [];
    life.nextTrip = rnd(5, 7); life.tripDue = false; life.nextChat = {}; ROOMS.forEach(function (r) { life.nextChat[r.id] = rnd(2.6, 3.4); });
    life.nextAmbient = 1; life.firstTap = true; life.greetAt = .5; life.visible = true; life.dirty = false;
    lifeSync();
    var sig = { signal: ac.signal };
    document.addEventListener("visibilitychange", function () { if (document.hidden) { lifePause(); lifeFlush(); } else lifeWake(); }, sig);
    window.addEventListener("pagehide", lifeFlush, sig);
    if (window.IntersectionObserver) {
      life.io = new IntersectionObserver(function (es) { life.visible = es[es.length - 1].isIntersecting; if (life.visible) lifeWake(); else lifePause(); });
      life.io.observe(root);
    }
    lifeWake();
  }
  function lifeStop() {
    lifePause();
    if (life.on) lifeFlush();
    life.on = false;
    if (life.io) { life.io.disconnect(); life.io = null; }
    life.actors = {}; life.duets = []; life.fx = []; life.reserved = {};
  }
  // after any full redraw of the rooms: find each friend's drawing again
  function lifeRebind() {
    if (!root || !life.on) return;
    lifeSync();
    computeViews();
    Object.keys(life.actors).forEach(function (u) {
      var a = life.actors[u], t = findT(+u); if (!t) return;
      a.el = null; a.art = null; a.base = null; a.lastTf = null; a.lastZ = null; a.lastOp = null; a.lastBob = null; a.lastCls = null;
      if ((a.held && !drag) || roomOf(t) !== a.room || (!!a.seat !== !!(t.on && typeof t.on !== "string"))) resetActor(a, t);
      var layer = layerOf(a.room); if (!layer) return;
      a.el = layer.querySelector('.hg-it[data-u="' + u + '"]'); if (!a.el) return;
      a.art = a.el.querySelector(".hg-art");
      a.shown = a.friend ? poseKey(a, t) : "";
      if (!t.on) a.base = { x: t.x * 10, y: t.y * 7.5, s: depthScale(t.y * 7.5) };
    });
  }
  function computeViews() {
    life.view = {};
    visRooms().forEach(function (r) { life.view[r] = houseView ? life.viewMini : life.viewSingle; });
  }
  function lifeRelayout() { computeViews(); Object.keys(life.actors).forEach(function (u) { life.actors[u].lastTf = null; life.actors[u].lastBob = null; }); }
  // redraw one friend (she sat down, stood up, or came into the room)
  function overlayHTML(t, b, bx) {
    if (!b || !(b.bath || b.bed)) return "";
    var pb = bx[t.on]; if (!pb) return "";
    return '<div class="hg-bathfront' + (b.bed ? " hg-bedfront" : "") + '" data-front="' + t.uid + '" style="' + pct({ x: pb.x, y: pb.y, w: pb.w, h: pb.h, z: b.z + 1 }) + '">' + (b.bed ? bedSVG(true) : bathSVG(true)) + "</div>";
  }
  function redrawItem(t) {
    var room = roomOf(t), layer = layerOf(room), a = life.actors[t.uid];
    if (!layer) { if (a) { a.el = null; a.art = null; } return; }
    var bx = computeBoxes(itemsIn(room), room), b = bx[t.uid]; if (!b) return;
    var old = layer.querySelector('.hg-it[data-u="' + t.uid + '"]');
    layer.querySelectorAll('.hg-bathfront[data-front="' + t.uid + '"]').forEach(function (e) { e.remove(); });
    var html = itemHTML(t, b) + overlayHTML(t, b, bx);
    if (old) { old.insertAdjacentHTML("afterend", html); old.remove(); } else layer.insertAdjacentHTML("beforeend", html);
    boxes[t.uid] = b;
    if (a) {
      a.el = layer.querySelector('.hg-it[data-u="' + t.uid + '"]'); a.art = a.el && a.el.querySelector(".hg-art");
      a.base = t.on ? null : { x: t.x * 10, y: t.y * 7.5, s: depthScale(t.y * 7.5) };
      a.shown = a.friend ? poseKey(a, t) : ""; a.lastTf = null; a.lastZ = null; a.lastOp = null; a.lastBob = null; a.lastCls = null;
    }
  }

  /* ---------- drawing, once per frame, only what changed ---------- */
  function lifeDraw() {
    Object.keys(life.actors).forEach(function (u) {
      var a = life.actors[u];
      if (a.held || !a.el || !a.el.isConnected) return;
      var v = life.view[a.room], t = findT(a.uid); if (!v || !t) return;
      if (a.friend) { var key = poseKey(a, t); if (key !== a.shown) applyPose(a, t, key); }
      var cls = a.face + "|" + a.walking + "|" + a.looking;
      if (cls !== a.lastCls) {
        a.el.classList.toggle("face-r", a.face > 0); a.el.classList.toggle("face-l", a.face < 0);
        a.el.classList.toggle("walking", !!a.walking); a.el.classList.toggle("looking", !!a.looking); a.lastCls = cls;
      }
      var op = a.op >= .995 ? "" : a.op.toFixed(2);
      if (op !== a.lastOp) { a.el.style.opacity = op; a.lastOp = op; }
      if (!a.base || t.on) { if (a.lastTf) { a.el.style.transform = ""; a.lastTf = ""; } return; }
      var k = depthScale(a.y) / a.base.s, dx = (a.x - a.base.x) / 1000 * v.w, dy = (a.y - a.base.y) / 750 * v.h;
      var tf = "translate3d(" + dx.toFixed(1) + "px," + dy.toFixed(1) + "px,0) scale(" + k.toFixed(4) + ")";
      if (tf !== a.lastTf) { a.el.style.transform = tf; a.lastTf = tf; }
      var z = String(100 + Math.round(a.y) * 4); if (z !== a.lastZ) { a.el.style.zIndex = z; a.lastZ = z; }
      var bob = a.bob ? (a.bob / 750 * v.h / k).toFixed(1) : "";
      if (bob !== a.lastBob && a.art) { a.art.style.transform = bob ? "translateY(" + bob + "px)" : ""; a.lastBob = bob; }
      var bb = liveBox(a); bb.z = +z; boxes[a.uid] = bb;
    });
  }

  /* ---------- the brain ---------- */
  function lifeStep(dt) {
    var now = life.clock;
    if (now >= life.syncAt) { lifeSync(); life.syncAt = now + 1; }
    if (life.greetAt >= 0 && now >= life.greetAt) { life.greetAt = -1; lifeGreet(); }
    if (now >= life.nextTrip) planTrip();
    ROOMS.forEach(function (r) { if (now >= (life.nextChat[r.id] || 0)) planChat(r.id); });
    life.duets = life.duets.filter(runDuet);
    Object.keys(life.actors).forEach(function (u) { stepActor(life.actors[u], dt); });
    ambient();
  }
  function stepActor(a, dt) {
    if (a.held) return;
    var t = findT(a.uid); if (!t) return;
    if (a.react) {
      if (a.react.until > life.clock) { if (a.react.fx) fxTick(a, a.react.fx, a.react); if (a.react.dance) a.face = Math.floor(life.clock / .42) % 2 ? 1 : -1; return; }
      if (a.react.dance) a.face = 0;
      if (a.react.after) a.react.after(a);
      a.react = null;
    }
    var s = a.step;
    if (!s) {
      if (a.plan.length) { beginStep(a, a.plan.shift()); return; }
      if (life.clock >= a.nextThink) think(a, t);
      return;
    }
    if (s.t === "walk") walkTick(a, s);
    else if (s.t === "exit") exitTick(a, s);
    else {
      if (s.fx) fxTick(a, s.fx, s);
      if (s.dance) a.face = Math.floor(life.clock / .42) % 2 ? 1 : -1;
      if (s.t !== "duet" && life.clock >= s.until) endStep(a);
    }
  }
  function beginStep(a, s) {
    a.step = s;
    if (s.t === "walk") { startWalk(a, s); return; }
    if (s.t === "exit") { startExit(a, s); return; }
    if (s.floor && a.seat) standUp(a);
    if (s.begin) s.begin(a);
    s.until = life.clock + (s.dur == null ? 2 : s.dur);
  }
  function endStep(a) {
    var s = a.step; a.step = null;
    a.looking = false;
    if (s && s.dance) a.face = 0;
    if (s && s.end) s.end(a);
    if (!a.plan.length) a.nextThink = life.clock + rnd(.5, 1.6);
  }
  function hold(dur, o) { var s = { t: "hold", dur: dur, floor: true }; if (o) for (var k in o) s[k] = o[k]; return s; }

  /* walking: eased (slow start, slow stop), with a little step bounce; reduced motion: a gentle fade instead */
  function startWalk(a, s) {
    if (a.seat) standUp(a);
    var to = s.raw ? { x: s.x, y: s.y } : clampFloor(BY[a.id], s.x, s.y);
    s.to = to; s.from = { x: a.x, y: a.y };
    s.path = pathTo(a.room, s.from, to);
    s.segs = []; s.len = 0;
    for (var i = 1; i < s.path.length; i++) { var L = Math.hypot(s.path[i].x - s.path[i - 1].x, (s.path[i].y - s.path[i - 1].y) * 1.6); s.segs.push(L); s.len += L; }
    s.t0 = life.clock;
    s.dur = rm() ? .8 : Math.max(.55, s.len / (WALK_SPEED * (s.speed || 1)) + .35);
    a.walking = a.friend && !rm() && s.len > 4; a.looking = false;
    if (a.friend) { a.pose = s.len > 4 ? "walk" : "stand"; a.eyes = null; }
    removeBubble(a);
  }
  function pointAlong(s, d) {
    for (var i = 0; i < s.segs.length; i++) {
      if (d <= s.segs[i] || i === s.segs.length - 1) {
        var f = s.segs[i] ? clamp(d / s.segs[i], 0, 1) : 1, p0 = s.path[i], p1 = s.path[i + 1];
        return { x: p0.x + (p1.x - p0.x) * f, y: p0.y + (p1.y - p0.y) * f };
      }
      d -= s.segs[i];
    }
    return s.path[s.path.length - 1];
  }
  function walkTick(a, s) {
    var el = life.clock - s.t0;
    if (rm() && s.rmArrive) {
      if (!s.jumped) { s.jumped = 1; a.x = s.to.x; a.y = s.to.y; }
      a.op = Math.min(1, el / .4);
      if (el >= .4) { a.op = 1; finishWalk(a, s); }
      return;
    }
    if (rm()) {
      if (el < .4) a.op = 1 - el / .4;
      else { if (!s.jumped) { s.jumped = 1; a.x = s.to.x; a.y = s.to.y; } a.op = Math.min(1, (el - .4) / .4); }
      if (el >= .8) { a.op = 1; finishWalk(a, s); }
      return;
    }
    var u = clamp(el / s.dur, 0, 1), p = pointAlong(s, easeIO(u) * s.len), dx = p.x - a.x;
    if (Math.abs(dx) > .25) a.face = dx > 0 ? 1 : -1;
    a.x = p.x; a.y = p.y;
    var per = a.friend ? .52 : .36;
    a.bob = u < 1 ? -Math.abs(Math.sin(el / per * Math.PI)) * (a.friend ? 7 : 22) * depthScale(a.y) : 0;
    if (s.fadeIn) a.op = clamp(el / s.fadeIn, 0, 1);
    if (u >= 1) finishWalk(a, s);
  }
  function finishWalk(a, s) {
    a.x = s.to.x; a.y = s.to.y; a.bob = 0; a.walking = false; a.op = 1;
    if (a.friend) a.pose = "stand";
    if (!s.keepFace) a.face = 0;
    commit(a);
    endStep(a);
  }
  // a straight walk, or one step around big furniture
  function pathTo(room, p0, p1) {
    var bx = computeBoxes(itemsIn(room), room), list = itemsIn(room), hit = null;
    for (var i = 0; i < list.length && !hit; i++) {
      var o = list[i], oc = BY[o.id], b = bx[o.uid];
      if (!b || b.child || oc.zone !== "floor" || !isBig(oc)) continue;
      var fp = { x0: b.x + b.w * .12, x1: b.x + b.w * .88, y0: b.footY - 60, y1: b.footY + 8 };
      for (var k = 1; k < 16; k++) {
        var f = k / 16, x = p0.x + (p1.x - p0.x) * f, y = p0.y + (p1.y - p0.y) * f;
        if (x > fp.x0 && x < fp.x1 && y > fp.y0 && y < fp.y1) { hit = fp; break; }
      }
    }
    if (!hit) return [p0, p1];
    var w;
    if ((p0.y >= hit.y1 && p1.y <= hit.y0) || (p1.y >= hit.y1 && p0.y <= hit.y0)) {
      var leftX = hit.x0 - 70, rightX = hit.x1 + 70, useLeft = Math.abs(leftX - p1.x) + Math.abs(leftX - p0.x) < Math.abs(rightX - p1.x) + Math.abs(rightX - p0.x);
      w = { x: clamp(useLeft ? leftX : rightX, 150, 850), y: clamp((hit.y0 + hit.y1) / 2, FOOT_MIN, FOOT_MAX) };
    } else w = { x: clamp((p0.x + p1.x) / 2, hit.x0, hit.x1), y: clamp(hit.y1 + 34, FOOT_MIN, FOOT_MAX) };
    return [p0, w, p1];
  }

  /* going through a doorway */
  function startExit(a, s) {
    if (a.seat) standUp(a);
    s.from = { x: a.x, y: a.y }; s.t0 = life.clock; s.dur = rm() ? .5 : 1;
    a.walking = a.friend && !rm(); a.pose = a.friend ? "walk" : a.pose; a.face = s.side === "l" ? -1 : 1;
    removeBubble(a);
    logEv("leave", { id: a.id, from: a.room, to: s.to });
  }
  function exitTick(a, s) {
    var el = life.clock - s.t0, u = clamp(el / s.dur, 0, 1), d = DOOR_PT[s.side];
    if (rm()) a.op = 1 - u;
    else {
      var e = easeIO(u);
      a.x = s.from.x + (d.x - s.from.x) * e; a.y = s.from.y + (d.y - s.from.y) * e;
      a.op = clamp(1 - (u - .82) / .18, 0, 1); /* stays solid until she is in the doorway, then a quick fade: no long see-through ghost */
      a.bob = -Math.abs(Math.sin(el / .52 * Math.PI)) * 7 * depthScale(a.y);
    }
    if (u >= 1) arriveIn(a, s.to, s.side === "l" ? "r" : "l");
  }
  function arriveIn(a, room, side) {
    var t = findT(a.uid), from = a.room;
    removeBubble(a);
    if (a.el && a.el.isConnected) a.el.remove();
    a.el = null; a.art = null;
    t.room = room; delete t.on; delete t.slot; delete t.nap;
    heldFollow();
    var din = DOOR_IN[side], f = clampFloor(BY[a.id], din.x, din.y);
    t.x = r1(f.x / 10); t.y = r1(f.y / 7.5);
    a.room = room; a.x = DOOR_PT[side].x; a.y = DOOR_PT[side].y; a.op = 0; a.bob = 0; a.seat = null;
    life.dirty = true;
    logEv("room", { id: a.id, from: from, to: room });
    a.step = null;
    redrawItem(t);
    a.plan.unshift({ t: "walk", x: f.x + (side === "l" ? 1 : -1) * rnd(10, 90), y: f.y + rnd(-10, 40), fadeIn: rm() ? 0 : .45, rmArrive: rm() });
  }
  function goThrough(a, side, to) {
    var din = DOOR_IN[side];
    a.step = null;
    a.plan = [{ t: "walk", x: din.x + (side === "l" ? 1 : -1) * rnd(0, 30), y: din.y + rnd(-12, 12) }, { t: "exit", side: side, to: to }];
    a.hist.unshift("trip");
  }
  // friends like company: a friend alone goes to visit, and a busy room sends someone out
  function tripWeight(from, to) {
    var nf = friendsIn(from), nt = friendsIn(to);
    return (1 + 1.5 * nt + Math.max(0, nf - 2)) * (nf === 1 ? 2 : 1);
  }
  function sideTo(from, to) { var d = DOORS[from]; return d.l === to ? "l" : d.r === to ? "r" : null; }
  function planTrip() {
    life.nextTrip = life.clock + rnd(12, 19);
    if (nightOn()) return;
    var cands = [];
    Object.keys(life.actors).forEach(function (u) {
      var a = life.actors[u]; if (!a.friend || !isFree(a)) return;
      Object.keys(DOORS[a.room]).forEach(function (side) {
        var to = DOORS[a.room][side], w = tripWeight(a.room, to);
        if (roomVisible(a.room) || roomVisible(to)) w *= 3;
        if (a.hist[0] === "trip") w *= .3;
        cands.push([[a, side, to], w]);
      });
    });
    if (!cands.length) { life.tripDue = true; return; }   // the next friend who is ready takes the trip
    life.tripDue = false;
    var c = weighted(cands);
    goThrough(c[0], c[1], c[2]);
  }
  function takeTrip(a) {
    var sides = Object.keys(DOORS[a.room]).map(function (side) {
      var to = DOORS[a.room][side], w = tripWeight(a.room, to);
      return [[side, to], (roomVisible(a.room) || roomVisible(to) ? 3 : 1) * w];
    });
    var c = weighted(sides);
    life.tripDue = false;
    goThrough(a, c[0], c[1]);
  }
  function isFree(a) {
    if (a.held || a.pinUntil > life.clock || (a.react && a.react.until > life.clock) || a.plan.length) return false;
    if (a.duet) return false;
    if (a.step && !a.step.soft) return false;
    if (a.seat && isBedUid(a.seat.on)) return false;
    return true;
  }

  /* solo activities */
  function think(a, t) {
    a.nextThink = life.clock + rnd(.8, 2);
    if (!a.friend) { thinkPet(a, t); return; }
    if (a.pinUntil > life.clock) { a.step = null; a.plan = [{ t: "hold", dur: rnd(2.5, 4), soft: true, begin: function (x) { x.looking = true; } }]; return; }
    if (nightOn()) { thinkNight(a, t); return; }
    if (life.tripDue && a.hist[0] !== "trip") { takeTrip(a); return; }
    var room = a.room, bx = computeBoxes(itemsIn(room), room), opts = [];
    var seat = freeSeat(a, room, bx, false), bed = freeSeat(a, room, bx, true), toy = pickToy(a, room, bx), food = pickFood(a, room, bx);
    if (seat) opts.push([["sit", seat], 3]);
    if (toy) opts.push([["play", toy], 4]);
    if (food) opts.push([["eat", food], room === "kitchen" ? 4 : 2]);
    if (bed) opts.push([["nap", bed], 1.2]);
    opts.push([["wander"], 3]); opts.push([["look"], 1]); opts.push([["dance"], .7]);
    // talk to a friend in the same room (not too often per room)
    if (life.clock >= (life.nextChat[room] || 0) - 5) {
      var mates = actorsIn(room).filter(function (o) { return o !== a && o.friend && isFree(o); });
      if (mates.length) opts.push([["chat", pick(mates)], 5]);
    }
    opts.forEach(function (o) { var i = a.hist.indexOf(o[0][0]); if (i >= 0) o[1] *= i === 0 ? .15 : .45; });
    var ch = weighted(opts);
    a.hist.unshift(ch[0]); if (a.hist.length > 3) a.hist.length = 3;
    if (ch[0] === "chat") { life.nextChat[room] = life.clock + rnd(9, 15); startDuet(a, ch[1], room); }
    else if (ch[0] === "sit") doSit(a, ch[1], rnd(6, 11), null);
    else if (ch[0] === "nap") doSit(a, ch[1], rnd(10, 15), "zzz");
    else if (ch[0] === "play") doPlay(a, ch[1]);
    else if (ch[0] === "eat") doEat(a, ch[1]);
    else if (ch[0] === "dance") a.plan = [hold(3, { pose: "happy", dance: true, fx: "notes", begin: function (x) { x.pose = "happy"; x.eyes = "happy"; }, end: function (x) { x.pose = "stand"; x.eyes = null; } })];
    else if (ch[0] === "look") a.plan = [hold(rnd(2, 3), { soft: true, begin: function (x) { x.looking = true; } })];
    else doWander(a);
  }
  function doWander(a) {
    var sp = pickSpot(a, a.room);
    a.plan = [{ t: "walk", x: sp.x, y: sp.y }, hold(rnd(1.8, 3.2), { soft: true, begin: function (x) { x.looking = Math.random() < .6; } })];
  }
  function thinkNight(a, t) {
    var room = a.room, bx = computeBoxes(itemsIn(room), room);
    if (a.seat) { a.seatPose = isBedUid(a.seat.on) ? null : "sleep"; a.step = { t: "seated", until: Infinity, fx: "zzz" }; return; }
    var bed = freeSeat(a, room, bx, true);
    if (bed) { doSit(a, bed, Infinity, "zzz"); return; }
    if (room !== "bedroom") {
      var bbx = computeBoxes(itemsIn("bedroom"), "bedroom");
      if (freeSeat(a, "bedroom", bbx, true)) { goThrough(a, sideTo(room, "bedroom"), "bedroom"); return; }
    }
    var seat = freeSeat(a, room, bx, false);
    if (seat) { doSit(a, seat, Infinity, "zzz", "sleep"); return; }
    a.plan = [hold(Infinity, { fx: "zzz", begin: function (x) { x.eyes = "sleepy"; } })];
  }
  // seats: sofa, armchair, chair (or the bed). Never the bath: only Marie puts friends in the bath.
  function freeSeat(a, room, bx, wantBed) {
    var items = itemsIn(room), out = [];
    items.forEach(function (o) {
      var pc = BY[o.id], b = bx[o.uid]; if (!pc.seats || !b || b.child || pc.bath) return;
      if ((pc.id === "bed") !== !!wantBed) return;
      pc.seats.forEach(function (sa, i) {
        var key = o.uid + ":" + i;
        if (slotUsed(items, o.uid, i, true) || (life.reserved[key] && life.reserved[key] !== a.uid)) return;
        out.push({ on: o.uid, slot: i, key: key, x: b.x + sa[0] * b.w, y: clamp(b.footY + 22, FOOT_MIN, FOOT_MAX), d: Math.hypot(b.x + sa[0] * b.w - a.x, b.footY - a.y) });
      });
    });
    if (!out.length) return null;
    out.sort(function (p, q) { return p.d - q.d; });
    return Math.random() < .7 ? out[0] : pick(out);
  }
  function doSit(a, seat, dur, fx, seatPose) {
    reserve(seat.key, a);
    a.plan = [{ t: "walk", x: seat.x, y: seat.y },
      { t: "seated", dur: dur, soft: dur !== Infinity && fx !== "zzz", fx: fx, begin: function (x) { seatOn(x, seat, seatPose); } }];
  }
  function seatOn(a, seat, seatPose) {
    var t = findT(a.uid), par = findT(seat.on);
    releaseRes(a);
    if (!t || !par || roomOf(par) !== a.room || slotUsed(itemsIn(a.room), seat.on, seat.slot, true)) { a.step = null; return; }
    t.on = seat.on; t.slot = seat.slot; a.seat = { on: seat.on, slot: seat.slot }; a.seatPose = seatPose || null;
    a.walking = false; a.face = 0; a.eyes = null; a.pose = "stand";
    life.dirty = true;
    redrawItem(t);
    if (a.art && !rm()) a.art.animate([{ transform: "translateY(-10%) scale(.95,1.05)" }, { transform: "scale(1.06,.94)", offset: .6 }, { transform: "none" }], { duration: 260, easing: "ease-out" });
    logEv("sit", { id: a.id, room: a.room, on: par.id });
  }
  function standUp(a) {
    var t = findT(a.uid); a.seat = null; a.seatPose = null;
    if (!t || !t.on || typeof t.on === "string") return;
    var room = roomOf(t), bx = computeBoxes(itemsIn(room), room), pb = bx[t.on], par = findT(t.on), sa = par && BY[par.id].seats && BY[par.id].seats[t.slot | 0];
    var x = pb && sa ? pb.x + sa[0] * pb.w : t.x * 10, y = pb ? clamp(pb.footY + 24, FOOT_MIN, FOOT_MAX) : t.y * 7.5;
    var f = clampFloor(BY[a.id], x, y);
    delete t.on; delete t.slot; delete t.nap;
    t.x = r1(f.x / 10); t.y = r1(f.y / 7.5);
    a.x = f.x; a.y = f.y; a.pose = "stand";
    life.dirty = true;
    redrawItem(t);
  }
  function lifeTargetBoxes(bx, room) {
    if (!life.on) return;
    actorsIn(room).forEach(function (a) {
      var t = findT(a.uid); if (!t || t.on || !bx[a.uid]) return;
      var to = { x: a.x, y: a.y };
      if (a.step && a.step.to) to = a.step.to;
      a.plan.forEach(function (st) { if (st.t === "walk" && st.x != null) to = clampFloor(BY[a.id], st.x, st.y); });
      bx[a.uid] = floorBox(BY[a.id], to.x, to.y);
    });
  }
  function faceClash(a, x, y, skip) {
    var c = BY[a.id], nb = floorBox(c, x, y), hn = headBox(nb), bad = 0;
    actorsIn(a.room).forEach(function (o) {
      if (o === a || !o.friend || (skip && skip.indexOf(o) >= 0)) return;
      var t = findT(o.uid), spots = [];
      if (t && t.on && boxes[o.uid]) spots.push(boxes[o.uid]);
      else { spots.push(floorBox(BY[o.id], o.x, o.y)); if (o.step && o.step.to) spots.push(floorBox(BY[o.id], o.step.to.x, o.step.to.y)); }
      o.plan.forEach(function (st) { if (st.t === "walk" && st.x != null) spots.push(floorBox(BY[o.id], st.x, st.y)); });
      spots.forEach(function (ob) {
        var ho = headBox(ob);
        if (nb.z > ob.z && ovl(nb, ho) / area(ho) > .12) bad++;
        if (ob.z > nb.z && ovl(ob, hn) / area(hn) > .12) bad++;
      });
    });
    return bad;
  }
  // move a chosen spot a little to the side or forward until no face is hidden
  function settle(a, x, y, skip) {
    var c = BY[a.id], tries = [[0, 0], [70, 0], [-70, 0], [140, 0], [-140, 0], [0, 45], [90, 45], [-90, 45], [200, 20], [-200, 20]];
    for (var i = 0; i < tries.length; i++) {
      var f = clampFloor(c, x + tries[i][0], y + tries[i][1]);
      if (!faceClash(a, f.x, f.y, skip)) return f;
    }
    return clampFloor(c, x, y);
  }
  function pickToy(a, room, bx) {
    var list = itemsIn(room).filter(function (o) { return TOYS[o.id] && bx[o.uid] && o.uid !== a.uid; });
    if (!list.length) return null;
    var o = pick(list), b = bx[o.uid], cx = b.x + b.w / 2, side = a.x < cx ? -1 : 1;
    var foot = b.child ? (bx[o.on] ? bx[o.on].footY : FOOT_MIN) + 26 : typeof o.on === "string" ? FOOT_MIN + 24 : b.footY + 8;
    var tx = cx + side * (b.w / 2 + 60);
    if (tx < 160 || tx > 840) { side = -side; tx = cx + side * (b.w / 2 + 60); }
    return { uid: o.uid, kind: TOYS[o.id], x: tx, y: clamp(foot, FOOT_MIN, FOOT_MAX), face: -side, cx: cx, top: b.y };
  }
  function pickFood(a, room, bx) {
    var list = itemsIn(room).filter(function (o) { return BY[o.id].food && bx[o.uid]; }), o, b, foot;
    if (list.length) {
      o = pick(list); b = bx[o.uid];
      foot = b.child ? (bx[o.on] ? bx[o.on].footY : FOOT_MIN) + 26 : typeof o.on === "string" ? FOOT_MIN + 24 : b.footY + 10;
      return { uid: o.uid, x: b.x + b.w / 2 + rnd(-30, 30), y: clamp(foot, FOOT_MIN, FOOT_MAX) };
    }
    var places = itemsIn(room).filter(function (q) { return EATS[q.id] && bx[q.uid] && !bx[q.uid].child; });
    if (places.length) { o = pick(places); b = bx[o.uid]; return { uid: o.uid, x: b.x + b.w / 2, y: clamp(b.footY + 26, FOOT_MIN, FOOT_MAX) }; }
    if (room === "kitchen") return { uid: null, x: rnd(500, 860), y: FOOT_MIN + 26 };
    return null;
  }
  function doPlay(a, toy) {
    var pose = toy.kind === "cuddle" ? "hug" : toy.kind === "read" || toy.kind === "tv" ? "stand" : "happy";
    var fx = toy.kind === "music" ? "notes" : toy.kind === "cuddle" ? "hearts" : toy.kind === "tv" ? "tv" : "stars";
    var ts = settle(a, toy.x, toy.y);
    if (Math.abs(ts.x - toy.cx) > 40) toy.face = ts.x < toy.cx ? 1 : -1;
    a.plan = [{ t: "walk", x: ts.x, y: ts.y, keepFace: true },
      hold(rnd(5, 7), { fx: fx, toy: toy.uid, begin: function (x) { x.pose = pose; x.eyes = toy.kind === "read" ? "wink" : "happy"; x.face = toy.face; },
        end: function (x) { x.pose = "stand"; x.eyes = null; x.face = 0; } })];
    logEv("play", { id: a.id, room: a.room, toy: findT(toy.uid) ? findT(toy.uid).id : "" });
  }
  function doEat(a, food) {
    var fs = settle(a, food.x, food.y);
    a.plan = [{ t: "walk", x: fs.x, y: fs.y },
      hold(rnd(4, 5.5), { fx: "crumbs", toy: food.uid, begin: function (x) { x.pose = "eat"; x.eyes = "happy"; if (Math.random() < .5) sayBubble(x, pick(["Yummy!", "Yum yum!", "So tasty!"]), 1.8); },
        end: function (x) { x.pose = "stand"; x.eyes = null; } })];
    logEv("eat", { id: a.id, room: a.room });
  }
  function pickSpot(a, room, near) {
    var c = BY[a.id], items = itemsIn(room).filter(function (o) { return o.uid !== a.uid; }), bx = computeBoxes(items, room), best = null, bestC = Infinity;
    var others = actorsIn(room).filter(function (o) { return o !== a; });
    for (var i = 0; i < 26; i++) {
      var p = near ? clampFloor(c, a.x + rnd(-near, near), a.y + rnd(-near * .4, near * .4)) : clampFloor(c, rnd(170, 830), rnd(FOOT_MIN + 30, FOOT_MAX - 4));
      var cost = spotCost(c, floorBox(c, p.x, p.y), items, bx);
      if (cost === Infinity) continue;
      if (a.friend) cost += 4 * faceClash(a, p.x, p.y);
      others.forEach(function (o) {
        var tg = o.step && o.step.to ? o.step.to : o;
        if (Math.hypot(p.x - o.x, (p.y - o.y) * 1.6) < 170) cost += 3;
        if (Math.hypot(p.x - tg.x, (p.y - tg.y) * 1.6) < 170) cost += 3;
      });
      var d = Math.hypot(p.x - a.x, (p.y - a.y) * 1.6);
      cost += Math.abs(d - (near ? near * .6 : 330)) / 600 + Math.random() * .3;
      if (cost < bestC) { bestC = cost; best = p; }
    }
    return best || { x: a.x, y: a.y };
  }
  function thinkPet(a, t) {
    a.nextThink = life.clock + rnd(5, 10);
    if (t.on || a.pinUntil > life.clock) { wiggleArt(a.art); return; }
    if (Math.random() < .6) { var sp = pickSpot(a, a.room, 230); a.plan = [{ t: "walk", x: sp.x, y: sp.y, speed: .8 }]; }
    else wiggleArt(a.art);
  }

  /* ---------- chats: two friends meet, face each other and talk in turn ---------- */
  function pairKey(a, b) { return [a.id, b.id].sort().join("|"); }
  function planChat(room) {
    life.nextChat[room] = life.clock + rnd(9, 15);
    if (nightOn()) return;
    var free = actorsIn(room).filter(function (a) { return a.friend && isFree(a); });
    if (free.length < 2) { life.nextChat[room] = life.clock + 1.5; return; }
    free.sort(function () { return Math.random() - .5; });
    startDuet(free[0], free[1], room);
  }
  function startDuet(a, b, room) {
    var L = a.x <= b.x ? a : b, R = L === a ? b : a, gap = 82;
    var spot = pickPairSpot(room, (a.x + b.x) / 2, (a.y + b.y) / 2, gap, [a.uid, b.uid]);
    var d = { room: room, L: L, R: R, lines: chatLines(L, R, room), phase: "meet", t0: life.clock, i: 0, next: 0, best: !!BEST[pairKey(a, b)] };
    d.fin = d.best ? pick(["heart", "heart", "five", "dance"]) : pick(["wave", "five", "dance", "heart"]);
    [L, R].forEach(function (x, i) {
      x.duet = d; x.step = null; x.react = null;
      x.plan = [{ t: "walk", x: spot.x + (i ? gap : -gap), y: spot.y + rnd(-6, 6), keepFace: true }, { t: "duet", duet: d, begin: function (q) { q.face = q === d.L ? 1 : -1; } }];
    });
    life.duets.push(d);
  }
  function pickPairSpot(room, mx, my, gap, skip) {
    var items = itemsIn(room).filter(function (o) { return skip.indexOf(o.uid) < 0; }), bx = computeBoxes(items, room), c = BY.kitty, best = null, bc = Infinity;
    for (var i = 0; i < 22; i++) {
      var x = clamp(i ? mx + rnd(-180, 180) : mx, 160 + gap, 840 - gap), y = clamp(i ? my + rnd(-60, 80) : my, FOOT_MIN + 60, FOOT_MAX - 6);
      var cost = spotCost(c, floorBox(c, x - gap, y), items, bx) + spotCost(c, floorBox(c, x + gap, y), items, bx);
      if (cost === Infinity) continue;
      var pair = skip.map(function (u) { return life.actors[u]; }).filter(Boolean);
      if (pair.length === 2) cost += 4 * (faceClash(pair[0], x - gap, y, pair) + faceClash(pair[1], x + gap, y, pair));
      cost += Math.hypot(x - mx, y - my) / 500;
      if (cost < bc) { bc = cost; best = { x: x, y: y }; }
    }
    return best || { x: clamp(mx, 160 + gap, 840 - gap), y: clamp(my, FOOT_MIN + 60, FOOT_MAX - 6) };
  }
  function roomTopics(room) {
    var ids = {}, out = [];
    itemsIn(room).forEach(function (t) { ids[t.id] = 1; if (BY[t.id].food) ids.food = 1; });
    if (ids.drum) out.push(["Let's play the drum!", "Boom boom!"]);
    if (ids.guitar) out.push(["I love the guitar!", "Me too!"]);
    if (ids.radio) out.push(["Music time!", "Let's dance!"]);
    if (ids.tv) out.push(["Let's watch TV!", "Yes please!"]);
    if (ids.food) out.push([pick(["Yummy cake!", "Snack time!", "I'm hungry!"]), "Let's share!"]);
    if (ids.bed) out.push(["I'm a bit sleepy!", "Nap time!"]);
    if (ids.books || ids.bookshelf) out.push(["Let's read a book!", "Okay!"]);
    if (ids.teddy || ids.dolls) out.push(["Cute teddy!", "So soft!"]);
    if (ids.plant || ids.yucca || ids.pothos || ids.sunflower || ids.tulip) out.push(["Pretty flowers!", "So pretty!"]);
    if (ids.ball) out.push(["Catch the ball!", "Got it!"]);
    if (room === "kitchen") out.push(["Let's bake!", "Yummy!"]);
    if (room === "bedroom") out.push(["Cosy room!", "I love it!"]);
    out.push(["Nice room!", "I like it!"], ["Let's play!", "Yay!"], ["You're my friend!", "Best friends!"], ["I like your bow!", "Thank you!"]);
    return out;
  }
  function chatLines(L, R, room) {
    var a = L, b = R;
    if (Math.random() < .5) { a = R; b = L; }
    var tops = roomTopics(room), tp = pick(tops.slice(0, 3).concat([pick(tops)]));
    var lines = [[a, pick(["Hi " + SHORT[b.id] + "!", "Hello " + SHORT[b.id] + "!", SHORT[b.id] + "! Hi!"]), "happy", "wave"],
      [b, pick(["Hi " + SHORT[a.id] + "!", "Hello " + SHORT[a.id] + "!", "Hi friend!"]), "happy", "wave"],
      [a, tp[0], null, "stand"]];
    if (Math.random() < .75) lines.push([b, tp[1], "happy", "happy"]);
    return lines;
  }
  function inDuet(x, d) { return x.duet === d && life.actors[x.uid] === x && !x.held; }
  function runDuet(d) {
    var L = d.L, R = d.R;
    if (!inDuet(L, d) || !inDuet(R, d)) return endDuet(d);
    var ready = L.step && L.step.t === "duet" && R.step && R.step.t === "duet";
    if (d.phase === "meet") {
      if (!ready) return life.clock - d.t0 > 9 ? endDuet(d) : true;
      d.phase = "talk"; d.next = life.clock + .2; L.face = 1; R.face = -1;
      if (d.best) burstFx(d.room, (L.x + R.x) / 2, Math.min(L.y, R.y) - 250 * depthScale(L.y), "heart", 4);
      logEv("chat", { a: L.id, b: R.id, room: d.room, best: d.best });
    }
    if (d.phase === "talk") {
      if (life.clock < d.next) return true;
      if (d.i < d.lines.length) {
        var ln = d.lines[d.i++], sp = ln[0], other = sp === L ? R : L;
        removeBubble(other);
        sayBubble(sp, ln[1], 1.9, sp === L ? "l" : "r");
        sp.eyes = ln[2]; sp.pose = ln[3]; other.eyes = null; other.pose = "stand";
        d.next = life.clock + 2.1;
        return true;
      }
      d.phase = "fin"; d.next = life.clock + 2.8; removeBubble(L); removeBubble(R);
      var mx = (L.x + R.x) / 2, top = Math.min(L.y, R.y) - 210 * depthScale(L.y);
      L.eyes = R.eyes = "happy";
      if (d.fin === "wave") { L.pose = R.pose = "wave"; sayBubble(pick([L, R]), pick(["Yay!", "Hee hee!", "So fun!"]), 1.6); }
      else if (d.fin === "five") { L.pose = "five_r"; R.pose = "five_l"; burstFx(d.room, mx, top, "star", 5); sayBubble(L, "High five!", 1.6, "l"); }
      else if (d.fin === "dance") { L.pose = R.pose = "happy"; d.dance = true; sayBubble(R, "Let's dance!", 1.6, "r"); }
      else { L.pose = R.pose = "hug"; burstFx(d.room, mx, top, "heart", 5); sayBubble(pick([L, R]), pick(["Best friends!", "Love you!", "Hugs!"]), 1.6); }
      logEv("finish", { a: L.id, b: R.id, kind: d.fin, room: d.room });
      return true;
    }
    if (d.dance) { L.face = R.face = Math.floor(life.clock / .42) % 2 ? 1 : -1; if (!d.nf || life.clock > d.nf) { d.nf = life.clock + .6; burstFx(d.room, (L.x + R.x) / 2, Math.min(L.y, R.y) - 230 * depthScale(L.y), "note", 1); } }
    if (life.clock >= d.next) return endDuet(d);
    return true;
  }
  function endDuet(d) {
    [d.L, d.R].forEach(function (x) {
      if (x.duet !== d) return;
      x.duet = null;
      if (!x.held) {
        if ((x.step && x.step.duet === d) || x.plan.some(function (s) { return s.duet === d; })) { x.step = null; x.plan = []; }
        x.pose = "stand"; x.eyes = null; x.face = 0; x.nextThink = life.clock + rnd(1, 2.5);
      }
      removeBubble(x);
    });
    return false;
  }
  function endDuetsOf(a) { life.duets.forEach(function (d) { if (d.L === a || d.R === a) endDuet(d); }); a.duet = null; }

  /* ---------- bubbles and little floating things ---------- */
  function headTop(a) {
    var t = findT(a.uid), b = boxes[a.uid];
    if (!b || (t && !t.on)) b = liveBox(a);
    return { x: b.x + b.w / 2, y: b.y + b.h * .05, w: b.w, h: b.h };
  }
  function sayBubble(a, text, dur, side) {
    removeBubble(a);
    var layer = layerOf(a.room), v = life.view[a.room]; if (!layer || !v) return;
    var h = headTop(a), el = document.createElement("div");
    el.className = "hg-bubble hg-talk" + (side ? " hg-talk-" + side : "");
    el.textContent = text;
    var minTop = (parseFloat(getComputedStyle(layer).getPropertyValue("--hg-bf")) || 16) * 2.2 / v.h * 100;
    el.style.left = clamp(h.x / 10, side === "l" ? 30 : side === "r" ? 8 : 16, side === "l" ? 92 : side === "r" ? 70 : 84) + "%";
    el.style.top = Math.max(minTop, h.y / 7.5) + "%";
    layer.appendChild(el);
    if (!rm()) el.animate([{ opacity: 0, scale: .6 }, { opacity: 1, scale: 1 }], { duration: 200, easing: "ease-out" });
    a.bubbleEl = el;
    life.fx.push({ el: el, until: life.clock + dur });
  }
  function removeBubble(a) { if (a.bubbleEl) { a.bubbleEl.remove(); a.bubbleEl = null; } }
  function lifeFxSweep() {
    if (!life.fx.length) return;
    life.fx = life.fx.filter(function (f) { if (f.until <= life.clock || !f.el.isConnected) { f.el.remove(); return false; } return true; });
  }
  var FX = {
    note: function () { var c = pick(["#ff6f9f", "#74c8ff", "#a98bff", "#63d3b3"]); return '<svg viewBox="0 0 24 24"><path d="M9 18 V5 L19 3 V15" fill="none" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"/><ellipse cx="6.5" cy="18" rx="3.6" ry="2.8" fill="' + c + '" stroke="' + INK + '" stroke-width="2"/><ellipse cx="16.5" cy="15.5" rx="3.6" ry="2.8" fill="' + c + '" stroke="' + INK + '" stroke-width="2"/></svg>'; },
    heart: function () { return '<svg viewBox="0 0 24 24"><path d="' + heartPath(12, 12, 8) + '" fill="#ff6f9f" stroke="' + INK + '" stroke-width="2" stroke-linejoin="round"/></svg>'; },
    star: function () { return '<svg viewBox="0 0 24 24">' + starPath(12, 12.5, 10, pick(["#ffd25c", "#fff3b0", "#ff9cc2"])).replace("/>", ' stroke="' + INK + '" stroke-width="2" stroke-linejoin="round"/>') + "</svg>"; },
    z: function () { return '<svg viewBox="0 0 24 24"><path d="M6 6 H18 L6 18 H18" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 6 H18 L6 18 H18" fill="none" stroke="#7a68d8" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>'; },
    crumb: function () { return '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="6" fill="#e2a970" stroke="' + INK + '" stroke-width="1.5"/></svg>'; },
    bubble: function () { return '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="#e9f8ff" fill-opacity=".8" stroke="' + INK + '" stroke-width="1.6"/><circle cx="9" cy="9" r="2.4" fill="#fff"/></svg>'; },
    steam: function () { return '<svg viewBox="0 0 24 24"><path d="M12 22 Q6 16 12 11 Q18 6 12 2" fill="none" stroke="#fff" stroke-width="4.5" stroke-linecap="round" opacity=".9"/></svg>'; },
    flower: function () { var p = ""; for (var i = 0; i < 5; i++) p += '<ellipse cx="12" cy="6.5" rx="3.6" ry="5" fill="#ff9cc2" stroke="' + INK + '" stroke-width="1.4" transform="rotate(' + i * 72 + ' 12 12)"/>'; return '<svg viewBox="0 0 24 24">' + p + '<circle cx="12" cy="12" r="3.4" fill="#ffd25c" stroke="' + INK + '" stroke-width="1.4"/></svg>'; },
    drop: function () { return '<svg viewBox="0 0 24 24"><path d="M12 3 Q19 12 19 15 A7 7 0 0 1 5 15 Q5 12 12 3 Z" fill="#8fd6ff" stroke="' + INK + '" stroke-width="1.8"/></svg>'; }
  };
  // one floating thing: rises and fades (crumbs and drops fall)
  function floatFx(room, x, y, kind, big) {
    var layer = layerOf(room), v = life.view[room];
    if (rm() || !layer || !v || !FX[kind]) return;
    var sz = clamp(v.w * (big ? .05 : .034), 11, big ? 34 : 26), el = document.createElement("div");
    el.className = "hg-fx hg-fl"; el.style.left = (x / 10) + "%"; el.style.top = (y / 7.5) + "%";
    el.style.width = el.style.height = sz + "px"; el.style.marginLeft = el.style.marginTop = (-sz / 2) + "px";
    el.innerHTML = FX[kind]();
    layer.appendChild(el);
    var fall = kind === "crumb" || kind === "drop", dx = rnd(-1, 1) * sz * .9, rise = fall ? sz * rnd(1.4, 2.2) : -sz * rnd(2.2, 3.2);
    var an = el.animate([{ transform: "translate(0,0) scale(.4)", opacity: 0 }, { transform: "translate(" + (dx * .3).toFixed(1) + "px," + (rise * .25).toFixed(1) + "px) scale(1)", opacity: 1, offset: .2 },
      { transform: "translate(" + dx.toFixed(1) + "px," + rise.toFixed(1) + "px) scale(.85)", opacity: 0 }], { duration: fall ? 700 : kind === "z" ? 1900 : 1500, easing: "ease-out" });
    an.onfinish = function () { el.remove(); };
  }
  function burstFx(room, x, y, kind, n) {
    for (var i = 0; i < n; i++) floatFx(room, x + rnd(-40, 40), y + rnd(-20, 20), kind, i === 0);
  }
  function fxTick(a, fx, s) {
    if (rm() || !roomVisible(a.room)) return;
    var per = { zzz: 1.5, notes: .75, hearts: 1.1, stars: 1, crumbs: .55, tv: 1, bubbles: .8 }[fx] || 1;
    if (life.clock < (s.nfx || 0)) return;
    s.nfx = life.clock + per;
    var h = headTop(a), t = findT(a.uid), lying = t && seatParent(t) && seatParent(t).id === "bed";
    if (fx === "zzz") floatFx(a.room, h.x + h.w * (lying ? .3 : .22), h.y + h.h * .12, "z");
    else if (fx === "notes") floatFx(a.room, h.x + rnd(-1, 1) * h.w * .35, h.y, "note");
    else if (fx === "hearts") floatFx(a.room, h.x + rnd(-1, 1) * h.w * .25, h.y, "heart");
    else if (fx === "stars") floatFx(a.room, h.x + rnd(-1, 1) * h.w * .3, h.y, "star");
    else if (fx === "bubbles") floatFx(a.room, h.x + rnd(-1, 1) * h.w * .45, h.y + h.h * .55, "bubble");
    else if (fx === "crumbs") floatFx(a.room, h.x + h.w * .08, h.y + h.h * .42, "crumb");
    else if (fx === "tv") { var tv = s.toy && boxes[s.toy]; if (tv) floatFx(a.room, tv.x + tv.w / 2 + rnd(-30, 30), tv.y + tv.h * .2, "star"); }
    if (s.toy && (fx === "notes" || fx === "stars" || fx === "hearts") && (!s.ntoy || life.clock > s.ntoy)) {
      s.ntoy = life.clock + 1.3;
      var tt = findT(s.toy); if (tt && BY[tt.id] && !isBig(BY[tt.id])) wiggleArt(itemArt(s.toy));
    }
  }
  function itemArt(uid) { var e = root && root.querySelector('.hg-it[data-u="' + uid + '"]'); return e && e.querySelector(".hg-art"); }
  function wiggleArt(art) {
    if (!art || rm()) return;
    art.animate([{ transform: "rotate(0)" }, { transform: "rotate(-6deg)", offset: .25 }, { transform: "rotate(5deg)", offset: .6 }, { transform: "rotate(0)" }], { duration: 480, easing: "ease-out" });
  }
  function hopArt(art, high) {
    if (!art || rm()) return;
    var k = high ? 1.8 : 1;
    art.animate([{ transform: "scale(1.08,.9)" }, { transform: "translateY(" + (-14 * k) + "%) scale(.94,1.08)", offset: .35 }, { transform: "translateY(" + (-16 * k) + "%)", offset: .5 },
      { transform: "translateY(0) scale(1.1,.9)", offset: .82 }, { transform: "none" }], { duration: high ? 640 : 480, easing: "ease-out" });
  }
  function ambient() {
    if (life.clock < life.nextAmbient || rm()) return;
    life.nextAmbient = life.clock + 2.4;
    visRooms().forEach(function (r) {
      itemsIn(r).forEach(function (t) {
        var c = BY[t.id], b = boxes[t.uid]; if (!b) return;
        if ((c.id === "teapot" || c.id === "kettle" || c.id === "cocoa" || (c.id === "stove" && t.state)) && Math.random() < .7)
          floatFx(r, b.x + b.w * (c.id === "teapot" ? .72 : .5), b.y + b.h * .05, "steam");
      });
      if (r === "kitchen" && P().rooms.kitchen && P().rooms.kitchen.oven && Math.random() < .6) floatFx(r, 712, 300, "steam");
    });
  }

  /* ---------- Marie's actions ---------- */
  function lifeReact(a, o) {
    var t = findT(a.uid); if (!t) return;
    o.until = life.clock + (o.dur || 1.6);
    a.react = o;
    if (a.friend && a.art) { var key = poseKey(a, t); if (key !== a.shown) applyPose(a, t, key); }
  }
  // she says hello to Marie when Marie opens the room
  function lifeGreet() {
    var i = 0;
    visRooms().forEach(function (r) {
      actorsIn(r).forEach(function (a) {
        var t = findT(a.uid);
        if (!a.friend || !t || t.on || a.held || a.walking || (a.step && a.step.t === "duet") || i > 3) return;
        lifeReact(a, { pose: "wave", eyes: "happy", dur: 1.5 + i * .25 }); i++;
      });
    });
  }
  function stopWalking(a) {
    if (a.step && (a.step.t === "walk" || a.step.t === "exit") && a.op > .6) {
      a.step = null; a.plan = []; releaseRes(a); a.walking = false; a.bob = 0; a.op = 1; a.pose = "stand"; commit(a);
    }
  }
  var TAP_LINES = ["Hi Marie!", "Hee hee!", "I love you, Marie!", "Let's play!", "You're my best friend!", "Look at my room!", "Yay!", "That tickles!"];
  function lifeTapFriend(t) {
    var a = life.actors[t.uid], c = BY[t.id]; if (!a) return false;
    var par = seatParent(t), line;
    endDuetsOf(a);
    if (par && (par.id === "bed" || a.seatPose === "sleep")) {
      // a sleeping friend wakes up
      a.step = null; a.plan = []; delete t.nap; life.dirty = true;
      if (par.id === "bed") standUp(a); else a.seatPose = null;
      line = "Good morning, Marie!";
      lifeReact(a, { pose: "happy", eyes: "happy", dur: 1.6, seatOk: true });
    } else {
      stopWalking(a);
      var seated = !!(t.on && typeof t.on !== "string");
      lifeReact(a, seated ? { pose: inBath(t) ? "bath" : "sit", eyes: "wink", dur: 1.7, seatOk: true } : { pose: "wave", eyes: "wink", dur: 1.8 });
      line = life.firstTap ? hiFor(c) : a.step && a.step.fx === "crumbs" ? "Yummy!" : pick(TAP_LINES.filter(function (x) { return x !== a.lastLine; }));
    }
    life.firstTap = false; a.lastLine = line;
    a.nextThink = Math.max(a.nextThink, life.clock + 2.5);
    hopArt(a.art);
    var h = headTop(a);
    burstFx(a.room, h.x, h.y, "heart", 2);
    if (boxes[a.uid]) sparkle(boxes[a.uid]);
    sayBubble(a, line.length > 16 ? pick(["Hee hee!", "Hi!", "Yay!"]) : line, 2);
    snd([988, 1175, 1319], .06, "sine", .06);
    var now = performance.now();
    if (now - life.lastSpeak >= SPEAK_GAP_MS) { life.lastSpeak = now; say(line); }
    return true;
  }
  // Marie picked a friend up: she stops at once
  function lifeGrab(uid) {
    var a = life.actors[uid], t = findT(uid); if (!a || !t) return;
    endDuetsOf(a);
    if (!t.on && (a.op < .6 || a.room !== roomOf(t))) { a.x = t.x * 10; a.y = t.y * 7.5; }
    a.step = null; a.plan = []; releaseRes(a); a.walking = false; a.looking = false; a.bob = 0; a.op = 1; a.react = null; a.held = true; a.face = 0;
    removeBubble(a);
    if (t.on || !a.el) return;
    commit(a);
    var b = floorBox(BY[t.id], t.x * 10, t.y * 7.5);
    a.el.style.transform = ""; a.el.style.opacity = ""; a.el.classList.remove("face-l", "face-r", "walking", "looking");
    if (a.art) a.art.style.transform = "";
    a.el.style.left = (b.x / 10) + "%"; a.el.style.top = (b.y / 7.5) + "%"; a.el.style.width = (b.w / 10) + "%"; a.el.style.height = (b.h / 7.5) + "%";
    a.base = { x: t.x * 10, y: t.y * 7.5, s: depthScale(t.y * 7.5) }; a.lastTf = ""; a.lastOp = ""; a.lastBob = ""; a.lastCls = null;
    boxes[uid] = b;
  }
  // Marie put a friend (or pet) somewhere: she stays there for 30 seconds
  function lifeDropped(uid) {
    if (!life.on) return;
    lifeSync();
    var a = life.actors[uid], t = findT(uid); if (!a || !t) return;
    resetActor(a, t);
    a.pinUntil = life.clock + PIN_SECONDS;
    var par = seatParent(t);
    if (par && par.id === "bed") { t.nap = 1; a.step = { t: "seated", until: Infinity, fx: "zzz" }; }
    else if (par) a.step = { t: "seated", until: life.clock + PIN_SECONDS + rnd(2, 6), soft: true, fx: BY[par.id].bath ? "bubbles" : null };
    else delete t.nap;
    lifeRebind();
  }
  function lifeHug(u1, u2) {
    var a = life.actors[u1], b = life.actors[u2]; if (!a || !b) return;
    var t2 = findT(u2), seated2 = !!(t2 && t2.on);
    endDuetsOf(b); stopWalking(b);
    a.face = a.x < b.x ? 1 : -1; if (!seated2) b.face = -a.face;
    lifeReact(a, { pose: "hug", eyes: "happy", dur: 2.4, after: function (x) { x.face = 0; } });
    lifeReact(b, seated2 ? { pose: "sit", eyes: "happy", dur: 2.4, seatOk: true } : { pose: "hug", eyes: "happy", dur: 2.4, after: function (x) { x.face = 0; } });
    b.nextThink = Math.max(b.nextThink, life.clock + 3);
    var top = Math.min(a.y, b.y) - 220 * depthScale(a.y);
    burstFx(a.room, (a.x + b.x) / 2, top, "heart", 5);
    logEv("hug", { a: a.id, b: b.id, room: a.room });
    snd([659, 784, 988], .08, "sine", .08);
    var now = performance.now(), line = "I love you, " + SHORT[b.id] + "!";
    sayBubble(a, "Hugs!", 2);
    if (now - life.lastSpeak >= SPEAK_GAP_MS) { life.lastSpeak = now; say(line); }
  }
  // dancing to music Marie plays
  function lifeDanceNear(room, x, y) {
    actorsIn(room).forEach(function (a) {
      var t = findT(a.uid);
      if (!a.friend || !t || t.on || a.held || Math.hypot(a.x - x, (a.y - y) * 1.6) > 420) return;
      endDuetsOf(a); stopWalking(a);
      lifeReact(a, { pose: "happy", eyes: "happy", dur: 3.2, dance: true, fx: "notes" });
      a.nextThink = Math.max(a.nextThink, life.clock + 3.6);
    });
  }
  function lifeSetNight(on) {
    var p = P();
    p.homeNight = !!on;
    ROOMS.forEach(function (r) { if (p.rooms[r.id]) p.rooms[r.id].lamp = !!on; });
    p.home.forEach(function (t) { if (t.id === "floorlamp") t.state = on ? 1 : 0; });
    Object.keys(life.actors).forEach(function (u) {
      var a = life.actors[u], t = findT(+u); if (!t || a.held) return;
      endDuetsOf(a);
      if (on) { if (!a.seat) { stopWalking(a); a.step = null; a.plan = []; } a.nextThink = life.clock + rnd(.4, 2.5); a.pinUntil = 0; return; }
      // morning: everyone wakes up
      var par = seatParent(t);
      a.step = null; a.plan = []; a.seatPose = null; a.eyes = null; delete t.nap;
      if (par && par.id === "bed") standUp(a);
      a.nextThink = life.clock + rnd(1.5, 3);
      lifeReact(a, { pose: t.on ? "sit" : "happy", eyes: "happy", dur: 1.6, seatOk: true });
    });
    life.dirty = true;
  }

  /* ---------- mount ---------- */
  function roomButtons() {
    return ROOMS.map(function (r) { return '<button type="button" class="hg-roomtab" data-room="' + r.id + '" aria-label="' + r.name + '" aria-pressed="false">' + roomIcon(r.id) + "</button>"; }).join("") +
      '<button type="button" class="hg-roomtab hg-housebtn" data-act="house" aria-label="Whole house" aria-pressed="false">' + HOUSE_ICON + "</button>" +
      '<button type="button" class="hg-roomtab hg-daybtn" data-act="night" aria-label="Night time" aria-pressed="false">' + MOON_ICON + "</button>";
  }
  var ROOF = '<svg class="hg-roof" viewBox="0 0 300 60" preserveAspectRatio="none" aria-hidden="true">' +
    '<path d="M4 58 L46 6 H254 L296 58 Z" fill="#ff9cc2" stroke="#3b2a33" stroke-width="3.5" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>' +
    '<path d="M30 42 H270 M18 52 H282 M40 30 H260 M52 18 H248" stroke="#ff6f9f" stroke-width="3" vector-effect="non-scaling-stroke"/>' +
    '<path d="M60 10 H240" stroke="#fff" stroke-opacity=".7" stroke-width="4" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg>';
  // every item, wallpaper and floor keeps its own price as base; the price shown and paid comes from opts.price
  function setPrices() {
    C.concat(WALLS, FLOORS).forEach(function (c) {
      if (c.base === undefined) c.base = c.price;
      c.price = opts.price ? Math.max(0, Math.round(opts.price(c.base, c)) || 0) : c.base;
    });
  }
  function mount(el, o) {
    if (!el) throw new Error("HomeGame.mount needs a container element");
    if (!window.KittyChars) throw new Error("HomeGame needs modules/characters.js loaded first");
    if (!window.P) throw new Error("HomeGame needs the host's saved state P");
    opts = { artBase: (o && o.artBase) || DEFAULT_OPTS.artBase, chars: (o && o.chars) || null, art: (o && o.art) || null, price: (o && typeof o.price === "function") ? o.price : null };
    setPrices();
    unmount();
    injectCss(); window.KittyChars.injectCss();
    migrate(window.P);
    root = el;
    root.classList.add("hg");
    var arrow = function (dir) { return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + (dir < 0 ? "M15 4 L7 12 L15 20" : "M9 4 L17 12 L9 20") + '" fill="none" stroke="#3b2a33" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>'; };
    root.innerHTML = DEFS +
      '<div class="hg-stagewrap"><div class="hg-stage"><div class="hg-frame"></div><div class="hg-room"></div><div class="hg-items"></div>' +
      '<div class="hg-rooms" role="group" aria-label="Rooms">' + roomButtons() + "</div>" +
      "</div></div>" +
      '<div class="hg-house"><div class="hg-hbar" role="group" aria-label="Rooms"></div><div class="hg-hwrap">' + ROOF +
      '<div class="hg-hrooms">' + ROOMS.map(function (r) {
        return '<div class="hg-mini" data-room="' + r.id + '" role="button" tabindex="0" aria-label="Open the ' + r.name + '"><div class="hg-frame"></div><div class="hg-room"></div><div class="hg-hitems" data-room="' + r.id + '"></div>' +
          '<span class="hg-mbadge" aria-hidden="true">' + roomIcon(r.id) + "</span></div>";
      }).join("") + "</div></div></div>" +
      '<div class="hg-drawer"><div class="hg-cats" role="group" aria-label="Shop">' + CATS.map(function (c) { return '<button type="button" class="hg-cat" data-cat="' + c.id + '" aria-label="' + c.name + '" aria-pressed="false">' + catIcon(c.id) + "</button>"; }).join("") + "</div>" +
      '<div class="hg-panel"><button type="button" class="hg-arrow prev" aria-label="Back">' + arrow(-1) + '</button><div class="hg-grid"></div><button type="button" class="hg-arrow next" aria-label="More">' + arrow(1) + '</button><div class="hg-dots"></div><div class="hg-boxtgt" aria-hidden="true">' + BOX + '</div></div></div>';
    ac = new AbortController();
    var sig = { signal: ac.signal };
    root.addEventListener("pointerdown", onDown, sig);
    root.addEventListener("pointermove", onMove, sig);
    root.addEventListener("pointerup", onUp, sig);
    root.addEventListener("pointercancel", onUp, sig);
    root.addEventListener("click", onClick, sig);
    root.addEventListener("keydown", onKey, sig);
    root.addEventListener("contextmenu", function (e) { if (e.target.closest(".hg-it,.hg-pad")) e.preventDefault(); }, sig);
    root.addEventListener("dragstart", function (e) { e.preventDefault(); }, sig);
    perPage = 0;
    lifeStart();
    layout();
    renderAll();
    if (window.ResizeObserver) { ro = new ResizeObserver(function () { layout(); }); ro.observe(root); }
    else window.addEventListener("resize", layout, sig);
    return api;
  }
  function unmount() {
    lifeStop();
    if (ac) { ac.abort(); ac = null; }
    if (ro) { ro.disconnect(); ro = null; }
    timers.forEach(clearTimeout); timers = [];
    drag = null;
    if (root) { root.classList.remove("hg", "side", "col", "pilltop", "dragging", "lifting", "house"); root.innerHTML = ""; root = null; }
  }
  function refresh() { if (root) { migrate(window.P); life.actors = {}; life.duets = []; life.reserved = {}; renderAll(); } }

  var api = {
    mount: mount, unmount: unmount, refresh: refresh, migrate: migrate,
    ids: C.map(function (c) { return c.id; }),
    isKnown: function (id) { return !!BY[id]; },
    catalog: C, rooms: ROOMS, walls: WALLS, floors: FLOORS,
    _debug: { boxes: function () { return boxes; }, layoutMode: function () { return mode; }, perPage: function () { return perPage; },
      blockedRects: blockedRects, winRect: winRect, headBox: headBox, figBox: figBox, bestSpot: function (id) { return bestSpot(BY[id], curRoom(), roomItems()); },
      life: function () {
        return { on: life.on, running: !!life.raf, frames: life.frames, clock: Math.round(life.clock * 10) / 10, house: houseView, saves: life.saves, night: nightOn(),
          actors: Object.keys(life.actors).map(function (u) { var a = life.actors[u], t = findT(+u);
            return { uid: a.uid, id: a.id, room: a.room, x: Math.round(a.x), y: Math.round(a.y), step: a.step ? a.step.t : null, plan: a.plan.length, held: a.held,
              pinned: a.pinUntil > life.clock, face: a.face, seated: !!(t && t.on), pose: a.friend && t ? shownPose(a, t) : null, op: a.op }; }),
          events: life.events.slice(), timers: timers.length };
      },
      setHouse: function (on) { setHouse(on); }, doorQuad: doorQuad, secrets: SECRETS,
      // tests only: send a friend through a doorway now
      trip: function (uid) { var a = life.actors[uid]; if (!a) return false; var side = Object.keys(DOORS[a.room])[0]; a.pinUntil = 0; a.react = null; endDuetsOf(a); goThrough(a, side, DOORS[a.room][side]); return DOORS[a.room][side]; } }
  };
  window.HomeGame = api;
})();
