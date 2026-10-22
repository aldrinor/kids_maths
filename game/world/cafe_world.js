/* cafe_world.js - Marie's play world "Kitty Café World" (opens after every 25 answers, for 5 minutes).
 *
 *   PlayWorlds.register("cafe", { open(stage, wctx) })      (see world_core.js for wctx)
 *
 * Places, all one tap from the map (big pictures, no reading):
 *   house   Mimi's House: the old app's dollhouse (modules/home.js, HomeGame) with its living room, bedroom and kitchen,
 *           about 90 things to buy and drag. It keeps its save in P.home / P.rooms / P.paints, so Marie's old house
 *           carries over. While it is open, window.P is a Proxy over the page's P whose "stars" are the coins.
 *           It is mounted with this world's character pictures (HOUSE_CHARS), some of this world's art (HOUSE_ART)
 *           and coin prices (housePrice); the old app at /index.html mounts it without them and is unchanged.
 *   cafe    the café: decorate it (furniture, lights, plants, wallpaper, floors) and serve friends who come in when
 *           she rings the door bell (tap a friend, then the treat she wants). No timers, nothing is lost.
 *   garden  five beds: plant a seed, water it, it grows one step per visit (seed, sprout, bud, flower), then pick it.
 *   pets    adopt a hamster, bunny, kitten or puppy with coins; feed, pet and play ball. The last pet she touched
 *           follows her into every place.
 *   plans   a picture card with 3 gentle goals ("buy a lamp", "grow a flower"...). Each finished goal gives a sticker.
 * Decorating: drag a thing from the bottom tray into the room (or tap it), drag things around, drag one back onto
 * the tray to put it away. Things not bought yet are soft and show their price (coin + number); a tap buys it when
 * there are enough coins, otherwise "Not yet. Keep playing maths!".
 * Save: wctx.data.cafe (the page's P.world.cafe). Art: world/art/cafe/ (tools/draw_cafe_world_art.py) and the
 * café reward game's characters in rewards/art/cafe/.
 * Calm: soft sounds (Web Audio, silent when there is none), no flashing, nothing plays by itself.
 * Tests: window.__cafeWorld (go, data, layout) while the world is open.
 */
(function () {
  "use strict";
  var SRC = document.currentScript && document.currentScript.src;
  var BASE = SRC ? SRC.replace(/[^\/]*$/, "") : "world/";
  var ART = BASE + "art/cafe/", RART = BASE + "../rewards/art/cafe/";
  var WW = 1600, WH = 900;                      // the scene world
  var FLOOR = { cafe: 600, pets: 600, garden: 560 };
  /* Upright phones and tablets: the 1600-wide scene does not fit, so each place is "narrow". Then the fixed things move
   * closer together (NARROW), the scene is scaled so this span of world x fits the screen width, and the first
   * scroll centres it, so Mimi, the counter, the friends, the plots and the pet start in view. Wide screens are unchanged. */
  var FOCUS = { cafe: [300, 1390], garden: [280, 1350], pets: [450, 1240] };
  var NARROW = {
    cafe: { counter: [1060, 640], mimi: [1110, 270], spots: [600, 430], pet: 1290 },
    garden: { plots: [[520, 720], [800, 720], [1080, 720], [660, 860], [940, 860]], plotW: 250, can: 380, basket: 1150, pet: 1270 }
  };
  var WIDE = {
    cafe: { counter: [1200, 720], mimi: [1256, 300], spots: [660, 470], pet: 330 },
    garden: { plots: [[220, 760], [510, 760], [800, 760], [1090, 760], [1380, 760]], plotW: 270, can: 120, basket: 1490, pet: 300 }
  };
  var MAX_COPIES = 4;

  /* ---------- picture sizes (canvas w, h) so things can be placed before the picture loads ---------- */
  var SZ = {
    cafe_table: [320, 300], cafe_chair_pink: [220, 320], cafe_chair_mint: [220, 320], cafe_booth: [460, 320], cafe_lamp_pendant: [240, 460],
    cafe_lamp_floor: [200, 460], cafe_fairy_lights: [560, 140], cafe_plant_big: [280, 380], cafe_plant_hanging: [260, 380], cafe_flower_vase: [180, 260],
    cafe_cake_stand: [240, 260], cafe_picture: [260, 240], cafe_menu_board: [340, 300], cafe_clock: [200, 200], cafe_bunting: [600, 160],
    cafe_shelf: [340, 200], cafe_rug: [500, 160], cafe_window: [560, 500], cafe_counter: [1000, 420], cafe_door: [300, 580],
    garden_bench: [400, 280], garden_bird_bath: [240, 300], garden_lantern: [160, 340], garden_arch: [440, 520], garden_birdhouse: [200, 360],
    garden_pond: [440, 180], garden_toadstool: [180, 180], garden_plot: [340, 180], garden_back: [1600, 600], garden_basket: [280, 240], watering_can: [280, 240],
    pet_bed: [400, 220], pet_bowl_empty: [220, 140], pet_bowl_full: [220, 140], pet_ball: [130, 130], pet_scratch_post: [240, 440], pet_house: [340, 320],
    pet_mouse_toy: [160, 110], plant: [220, 300], pet: [320, 340], char: [462, 600]
  };

  /* ---------- the shop: what each place sells. zone: floor | wall | ceiling | rug. w = width in world units ---------- */
  var ITEMS = [
    // café
    { id: "cafe_table", place: "cafe", cat: "furniture", zone: "floor", w: 250, price: 15, free: true },
    { id: "cafe_chair_pink", place: "cafe", cat: "furniture", zone: "floor", w: 140, price: 8, free: true },
    { id: "cafe_chair_mint", place: "cafe", cat: "furniture", zone: "floor", w: 140, price: 8 },
    { id: "cafe_booth", place: "cafe", cat: "furniture", zone: "floor", w: 360, price: 30 },
    { id: "cafe_lamp_pendant", place: "cafe", cat: "light", zone: "ceiling", w: 150, price: 12, lamp: true },
    { id: "cafe_lamp_floor", place: "cafe", cat: "light", zone: "floor", w: 130, price: 15, lamp: true },
    { id: "cafe_fairy_lights", place: "cafe", cat: "light", zone: "wall", w: 460, price: 20, lamp: true },
    { id: "cafe_plant_big", place: "cafe", cat: "plant", zone: "floor", w: 200, price: 12, sway: true },
    { id: "cafe_plant_hanging", place: "cafe", cat: "plant", zone: "ceiling", w: 170, price: 15, sway: true },
    { id: "cafe_flower_vase", place: "cafe", cat: "plant", zone: "floor", w: 100, price: 6, small: true, sway: true },
    { id: "cafe_picture", place: "cafe", cat: "decor", zone: "wall", w: 180, price: 10 },
    { id: "cafe_menu_board", place: "cafe", cat: "decor", zone: "wall", w: 240, price: 15 },
    { id: "cafe_clock", place: "cafe", cat: "decor", zone: "wall", w: 140, price: 10 },
    { id: "cafe_bunting", place: "cafe", cat: "decor", zone: "wall", w: 460, price: 12 },
    { id: "cafe_shelf", place: "cafe", cat: "decor", zone: "wall", w: 260, price: 18 },
    { id: "cafe_cake_stand", place: "cafe", cat: "decor", zone: "floor", w: 140, price: 20, small: true },
    { id: "cafe_rug", place: "cafe", cat: "decor", zone: "rug", w: 460, price: 15, free: true },
    // garden decorations (seeds are below)
    { id: "garden_bench", place: "garden", cat: "decor", zone: "floor", w: 300, price: 25 },
    { id: "garden_bird_bath", place: "garden", cat: "decor", zone: "floor", w: 170, price: 20 },
    { id: "garden_lantern", place: "garden", cat: "decor", zone: "floor", w: 100, price: 12, lamp: true, free: true },
    { id: "garden_arch", place: "garden", cat: "decor", zone: "floor", w: 320, price: 40 },
    { id: "garden_birdhouse", place: "garden", cat: "decor", zone: "floor", w: 130, price: 15 },
    { id: "garden_pond", place: "garden", cat: "decor", zone: "rug", w: 360, price: 30 },
    { id: "garden_toadstool", place: "garden", cat: "decor", zone: "floor", w: 120, price: 8, free: true },
    // pet corner
    { id: "pet_house", place: "pets", cat: "toys", zone: "floor", w: 260, price: 25 },
    { id: "pet_scratch_post", place: "pets", cat: "toys", zone: "floor", w: 150, price: 15 },
    { id: "pet_mouse_toy", place: "pets", cat: "toys", zone: "floor", w: 100, price: 5, small: true },
    { id: "pet_bed", place: "pets", cat: "toys", zone: "rug", w: 300, price: 15, free: true },
    { id: "cafe_plant_big", place: "pets", cat: "toys", zone: "floor", w: 200, price: 12, sway: true, free: true },
    { id: "cafe_picture", place: "pets", cat: "toys", zone: "wall", w: 180, price: 10, free: true }
  ];
  var SEEDS = [
    { id: "tulip", price: 5, free: true }, { id: "carrot", price: 6 }, { id: "sunflower", price: 8 }, { id: "rose", price: 10 }, { id: "strawberry", price: 12 }
  ];
  var PETS = [{ id: "hamster", price: 30 }, { id: "bunny", price: 40 }, { id: "kitten", price: 50 }, { id: "puppy", price: 60 }];
  var PET_NAME = { hamster: "hamster", bunny: "bunny", kitten: "kitten", puppy: "puppy" };
  var WALLS = [
    { id: "cream", price: 0 }, { id: "pink_dots", price: 10 }, { id: "mint_stripes", price: 10 }, { id: "lilac_hearts", price: 15 },
    { id: "peach_checks", price: 15 }, { id: "sky_clouds", price: 20 }
  ];
  var FLOORS = [{ id: "wood", price: 0 }, { id: "pink_checks", price: 10 }, { id: "mint_tiles", price: 10 }, { id: "honey_wood", price: 15 }, { id: "lilac_carpet", price: 15 }];
  var TREATS = ["cupcake", "cocoa", "cake", "cookie", "donut", "macaron"];
  var TREAT_NAME = { cupcake: "a cupcake", cocoa: "a hot cocoa", cake: "some cake", cookie: "a cookie", donut: "a doughnut", macaron: "macarons" };
  var FRIENDS = ["bella", "lulu", "momo", "puff"];
  var FRIEND_NAME = { bella: "Bella", lulu: "Lulu", momo: "Momo", puff: "Puff" };
  var STICKERS = ["star", "heart", "flower", "paw", "cupcake", "rainbow"];
  var GOALS = [
    { id: "buy_lamp", icon: "cafe_lamp_floor", ev: "buy_light", n: 1, say: "Buy a lamp." },
    { id: "buy_thing", icon: "cafe_chair_mint", ev: "buy", n: 1, say: "Buy something new." },
    { id: "plant", icon: "seed_sunflower", ev: "plant", n: 1, say: "Plant a seed." },
    { id: "water", icon: "watering_can", ev: "water", n: 3, say: "Water the plants 3 times." },
    { id: "grow", icon: "plant_tulip_bloom", ev: "pick", n: 1, say: "Grow a flower and pick it." },
    { id: "serve", icon: "treat_cupcake", ev: "serve", n: 3, say: "Give 3 friends a treat." },
    { id: "adopt", icon: "pet_kitten_sit", ev: "adopt", n: 1, say: "Adopt a pet.", needNoPet: true },
    { id: "feed", icon: "pet_bowl_full", ev: "feed", n: 1, say: "Feed your pet.", needPet: true },
    { id: "ball", icon: "pet_ball", ev: "ball", n: 1, say: "Play ball with your pet.", needPet: true },
    { id: "cuddle", icon: "sticker_heart", ev: "cuddle", n: 3, say: "Give your pet 3 cuddles.", needPet: true },
    { id: "paint", icon: "paint", ev: "paint", n: 1, say: "Choose a new wallpaper or floor." },
    { id: "house", icon: "map_house", ev: "house_buy", n: 1, say: "Put something new in Mimi's house." }
  ];
  function img(name) { return /^(bell|friend_.*_(stand|walk|sip|cheer|wave)|mimi_(stand|smile|wave|high_five))$/.test(name) ? RART + name + ".png" : ART + name + ".png"; }

  /* ---------- Mimi's House (modules/home.js) drawn with this world's pictures ----------
   * HomeGame.mount takes { chars, art, price } (see home.js). chars draws the five friends with the new character
   * pictures (rewards/art/cafe/mimi_*.png and friend_*_*.png, 462 x 600 = home.js's 200 x 260 box, feet at the
   * bottom); art swaps some catalogue pictures for this world's art; price puts the house on the world's coin scale. */
  var HOUSE_WHO = { kitty: "mimi", melody: "bella", kuromi: "lulu", purin: "momo", cinna: "puff" };
  var HOUSE_NAME = { kitty: "Mimi", melody: "Bella", kuromi: "Lulu", purin: "Momo", cinna: "Puff" };
  function housePic(id, pose, eyes) {
    var who = HOUSE_WHO[id] || "mimi", mimi = who === "mimi";
    var seated = pose === "sit" || pose === "eatsit" || pose === "bath" || pose === "sleep";
    var asleep = pose === "sleep" || (seated && (eyes === "closed" || eyes === "sleepy"));
    var p = seated ? (asleep ? "sleep" : "sit")
      : mimi ? ({ wave: "wave", happy: "high_five", five_r: "high_five", five_l: "high_five", hug: "high_five", held: "smile", eat: "smile" }[pose] || "stand")
        : ({ wave: "wave", walk: "walk", happy: "cheer", held: "cheer", five_r: "cheer", five_l: "cheer", hug: "cheer", eat: "sip" }[pose] || "stand");
    return RART + (mimi ? "mimi_" : "friend_" + who + "_") + p + ".png";
  }
  var houseClip = 0;
  var HOUSE_CHARS = {
    full: function (id, pose, o) {
      pose = pose || "stand";
      return '<svg class="kc kc-' + id + " kc-pose-" + pose + ' cw-hchar" viewBox="0 0 200 260" role="img" aria-label="' + (HOUSE_NAME[id] || "Mimi") + '" xmlns="http://www.w3.org/2000/svg">' +
        '<image href="' + housePic(id, pose, o && o.eyes) + '" x="0" y="-4" width="200" height="260" preserveAspectRatio="xMidYMax meet"/></svg>';
    },
    face: function (id) {
      return '<svg class="kc kc-face kc-' + id + '" viewBox="40 30 382 330" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><image href="' + housePic(id, "stand") + '" x="0" y="0" width="462" height="600"/></svg>';
    },
    headInner: function (id) {   // a bust inside home.js's 100 x 100 head box (the "Mimi photo" frame)
      var cid = "cw-hclip" + (++houseClip);
      return '<defs><clipPath id="' + cid + '"><rect x="-5.5" y="-19.4" width="111" height="122"/></clipPath></defs><g clip-path="url(#' + cid + ')">' +
        '<image href="' + housePic(id, "stand") + '" x="-14.7" y="-26" width="129.4" height="168"/></g>';
    },
    injectCss: function () {}
  };
  function houseArt(name, w, h, rewards) { return { src: (rewards ? RART : ART) + name + ".png", aspect: w / h }; }
  var HOUSE_ART = {
    cat: houseArt("pet_kitten_sit", 320, 340), bunnyfull: houseArt("pet_bunny_sit", 320, 340),
    plant: houseArt("cafe_plant_big", 280, 380), picture: houseArt("cafe_picture", 260, 240), clock: houseArt("cafe_clock", 200, 200),
    bunting: houseArt("cafe_bunting", 600, 160), rug: houseArt("cafe_rug", 500, 160), basket: houseArt("garden_basket", 280, 240),
    wateringcan: houseArt("watering_can", 280, 240), tulip: houseArt("plant_tulip_bloom", 220, 300), sunflower: houseArt("plant_sunflower_bloom", 220, 300),
    pastrystand: houseArt("cafe_cake_stand", 240, 260), cupcake: houseArt("treat_cupcake", 200, 200), donut: houseArt("treat_donut", 200, 200),
    cookie: houseArt("treat_cookie", 200, 200), macaronpink: houseArt("treat_macaron", 200, 200), cocoa: houseArt("treat_cocoa", 200, 200),
    birthday: houseArt("treat_cake", 200, 200)
  };
  // the old house cost 2 to 45 stars; in this world things cost 5 to 60 coins (free things stay free)
  function housePrice(base) { return base > 0 ? clamp(Math.round(base * 1.2), 5, 60) : 0; }

  /* ---------- wallpaper and floor patterns (small SVG tiles) ---------- */
  function svgUrl(w, h, body) {
    return 'url("data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '">' + body + "</svg>") + '")';
  }
  var HEART = "M10 17 C4 12 1 9 1 6 C1 3 3 1 6 1 C8 1 9 2 10 4 C11 2 12 1 14 1 C17 1 19 3 19 6 C19 9 16 12 10 17 Z";
  var PATTERN = {
    cream: svgUrl(80, 80, '<rect width="80" height="80" fill="#fdf4e8"/><rect x="0" width="20" height="80" fill="#f8e8d4"/><rect x="40" width="4" height="80" fill="#f6e2cb"/>'),
    pink_dots: svgUrl(80, 80, '<rect width="80" height="80" fill="#fde8ef"/><circle cx="20" cy="20" r="6" fill="#f7c6d5"/><circle cx="60" cy="60" r="6" fill="#f7c6d5"/>'),
    mint_stripes: svgUrl(80, 80, '<rect width="80" height="80" fill="#e8f7f0"/><rect width="26" height="80" fill="#d2efe2"/><rect x="34" width="4" height="80" fill="#fff"/>'),
    lilac_hearts: svgUrl(80, 80, '<rect width="80" height="80" fill="#f3ecfc"/><path d="' + HEART + '" fill="#e0d0f5" transform="translate(10 12)"/><path d="' + HEART + '" fill="#e0d0f5" transform="translate(50 52)"/>'),
    peach_checks: svgUrl(80, 80, '<rect width="80" height="80" fill="#fff3e8"/><rect width="40" height="80" fill="#fde3cc" opacity=".7"/><rect width="80" height="40" fill="#fde3cc" opacity=".7"/>'),
    sky_clouds: svgUrl(120, 100, '<rect width="120" height="100" fill="#e6f3fc"/><g fill="#fff"><ellipse cx="34" cy="30" rx="22" ry="9"/><ellipse cx="44" cy="24" rx="13" ry="9"/><ellipse cx="94" cy="78" rx="20" ry="8"/><ellipse cx="86" cy="72" rx="11" ry="8"/></g>'),
    wood: svgUrl(480, 120, '<rect width="480" height="120" fill="#efcca0"/><rect y="40" width="480" height="40" fill="#ebc596"/><g fill="#d9ad78"><rect y="38" width="480" height="3"/><rect y="78" width="480" height="3"/><rect y="118" width="480" height="2"/><rect x="300" width="3" height="40"/><rect x="120" y="40" width="3" height="40"/><rect x="400" y="80" width="3" height="40"/></g><path d="M20 20 q60 -6 120 0 M200 60 q50 5 100 0 M40 100 q70 -5 140 0" stroke="#e2bb88" stroke-width="2" fill="none"/>'),
    pink_checks: svgUrl(120, 120, '<rect width="120" height="120" fill="#fdeaf0"/><rect width="60" height="60" fill="#f7cbd8"/><rect x="60" y="60" width="60" height="60" fill="#f7cbd8"/>'),
    mint_tiles: svgUrl(80, 80, '<rect width="80" height="80" fill="#c8e9da"/><rect x="3" y="3" width="74" height="74" rx="6" fill="#e2f5ec"/>'),
    honey_wood: svgUrl(120, 60, '<rect width="120" height="60" fill="#f2d29e"/><path d="M0 60 L30 0 M30 60 L60 0 M60 60 L90 0 M90 60 L120 0" stroke="#ddb070" stroke-width="3"/><rect y="28" width="120" height="3" fill="#e6bf82"/>'),
    lilac_carpet: svgUrl(60, 60, '<rect width="60" height="60" fill="#e7dcf5"/><circle cx="15" cy="15" r="3" fill="#d8c8ee"/><circle cx="45" cy="45" r="3" fill="#d8c8ee"/><circle cx="45" cy="15" r="2" fill="#f2ecfa"/>'),
    grass: svgUrl(120, 80, '<rect width="120" height="80" fill="#a9d98e"/><path d="M20 30 l4 -10 l4 10 M80 62 l4 -10 l4 10 M60 16 l3 -8 l3 8 M104 40 l3 -8 l3 8" stroke="#8cc874" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="40" cy="60" r="3" fill="#fff" opacity=".8"/>')
  };
  var TILE = { cream: 80, pink_dots: 80, mint_stripes: 80, lilac_hearts: 80, peach_checks: 80, sky_clouds: 120, wood: 480, pink_checks: 120, mint_tiles: 80, honey_wood: 120, lilac_carpet: 60, grass: 120 };

  /* ---------- soft sounds (Web Audio; silent when there is none or the page's sound is off) ---------- */
  var own = null;
  function audio() {
    try { if (typeof P !== "undefined" && P && P.sound === false) { return null; } } catch (e) {}
    try { if (typeof actx !== "undefined" && actx) { return actx; } } catch (e) {}
    if (own) { return own; }
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) { return null; }
    try { own = new AC(); } catch (e) { own = null; }
    return own;
  }
  function note(f0, f1, start, dur, gain, type) {
    var a = audio(); if (!a) { return; }
    try {
      if (a.state === "suspended") { a.resume(); }
      var t = a.currentTime + (start || 0), o = a.createOscillator(), g = a.createGain();
      o.type = type || "sine"; o.frequency.setValueAtTime(f0, t);
      if (f1 && f1 !== f0) { o.frequency.exponentialRampToValueAtTime(f1, t + dur); }
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.min(gain || 0.06, 0.08), t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + dur + 0.03);
    } catch (e) {}
  }
  var SND = {
    pop: function () { note(660, 880, 0, 0.12, 0.05); },
    plop: function () { note(520, 300, 0, 0.1, 0.06); },
    buy: function () { note(523, 523, 0, 0.14, 0.05); note(659, 659, 0.1, 0.14, 0.05); note(784, 784, 0.2, 0.22, 0.05); },
    no: function () { note(330, 300, 0, 0.16, 0.04, "triangle"); note(262, 250, 0.16, 0.2, 0.04, "triangle"); },
    bell: function () { note(1046, 1046, 0, 0.5, 0.04); note(1318, 1318, 0.14, 0.6, 0.035); },
    chime: function () { [784, 988, 1175, 1568].forEach(function (fq, i) { note(fq, fq, i * 0.11, 0.4, 0.035); }); },
    water: function () { for (var i = 0; i < 5; i++) { note(900 + i * 70, 600, i * 0.07, 0.08, 0.025); } },
    purr: function () { note(110, 100, 0, 0.5, 0.03, "triangle"); note(118, 104, 0.45, 0.5, 0.025, "triangle"); },
    swish: function () { note(400, 800, 0, 0.18, 0.025, "triangle"); },
    tone: function (f, d, t, g) { (Array.isArray(f) ? f : [f]).forEach(function (fq, i) { note(fq, fq, i * (d || 0.1), d || 0.1, Math.min(g || 0.05, 0.06), t); }); }
  };

  /* ---------- styles ---------- */
  var CSS = [
    ".cw{position:absolute;inset:0;overflow:hidden;font:700 20px/1.2 system-ui,sans-serif;color:#563832;-webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent;touch-action:manipulation}",
    ".cw img{-webkit-user-drag:none;user-select:none;pointer-events:none;display:block}",
    ".cw button{font:inherit;color:inherit;-webkit-tap-highlight-color:transparent}",
    ".cw-top{position:absolute;top:max(8px,env(safe-area-inset-top));left:10px;z-index:30;display:flex;gap:10px}",
    ".cw-round{width:68px;height:68px;border-radius:22px;border:3px solid #563832;background:#fffaf4;box-shadow:0 4px 0 rgba(86,56,50,.25);padding:4px;cursor:pointer;display:flex;align-items:center;justify-content:center;position:relative}",
    ".cw-round img{width:100%;height:100%;object-fit:contain}",
    ".cw-round .cw-dot{position:absolute;right:-6px;top:-6px;min-width:24px;height:24px;border-radius:12px;background:#f490ab;border:2px solid #563832;font-size:14px;line-height:20px;color:#fff;text-align:center}",
    ".cw-place{position:absolute;inset:0;display:none}",
    ".cw-place.on{display:block}",
    /* the map */
    ".cw-map{background:#cfeaf7 center/cover no-repeat}",
    ".cw-mapgrid{position:absolute;left:0;right:0;top:86px;bottom:12px;display:grid;grid-template-columns:repeat(4,1fr);grid-template-rows:1fr;gap:10px;padding:0 14px;align-items:center;justify-items:center}",
    ".cw-map.tall .cw-mapgrid{grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;bottom:30%}",
    ".cw-go{width:100%;height:100%;max-width:300px;max-height:290px;min-width:64px;min-height:64px;border:0;background:none;padding:0;cursor:pointer;position:relative;transition:transform .25s}",
    ".cw-go img{width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 6px 0 rgba(86,56,50,.12))}",
    ".cw-go:active{transform:scale(.96)}",
    ".cw-mapmimi{position:absolute;bottom:2%;left:50%;width:min(30vw,190px);transform:translateX(-50%);z-index:3}",
    ".cw-map:not(.tall) .cw-mapmimi{width:min(14vw,150px);bottom:3%}",
    ".cw-mappet{position:absolute;bottom:3%;left:calc(50% + min(15vw,96px));width:min(16vw,100px);z-index:3}",
    ".cw-map:not(.tall) .cw-mappet{left:calc(50% + min(8vw,80px));width:min(8vw,80px)}",
    /* a scene: scroller, world box, wall, floor, things */
    ".cw-scene{position:absolute;z-index:0;left:0;right:0;top:0;overflow-x:auto;overflow-y:hidden;scrollbar-width:none;touch-action:pan-x}",
    ".cw-scene::-webkit-scrollbar{display:none}",
    ".cw-inner{position:relative;height:100%}",
    ".cw-wall,.cw-floorbg{position:absolute;left:0;right:0}",
    ".cw-wall{top:0}",
    ".cw-floorbg{bottom:0;box-shadow:inset 0 14px 18px -10px rgba(86,56,50,.25)}",
    ".cw-floorbg:before{content:'';position:absolute;left:0;right:0;top:-10px;height:12px;background:#fffaf4;border-top:2px solid rgba(86,56,50,.35);border-bottom:2px solid rgba(86,56,50,.35)}",
    ".cw-garden .cw-wall{background:linear-gradient(#bfe2f5,#e4f3f2 70%,#f2f7ea)}",
    ".cw-garden .cw-floorbg:before{display:none}",
    ".cw-box{position:absolute}",
    ".cw-it,.cw-fix{position:absolute;touch-action:none}",
    ".cw-it img,.cw-fix img{width:100%;height:100%}",
    ".cw-it{cursor:grab}",
    ".cw-it.drag{cursor:grabbing;filter:drop-shadow(0 10px 8px rgba(86,56,50,.25));transition:none}",
    ".cw-it.land{animation:cwland .45s ease-out}",
    "@keyframes cwland{0%{transform:translateY(-18%) scale(.9);opacity:.3}70%{transform:translateY(2%) scale(1.02);opacity:1}100%{transform:none}}",
    ".cw-bounce{animation:cwbounce .5s ease}",
    "@keyframes cwbounce{40%{transform:translateY(-6%) scale(1.04)}}",
    ".cw-sway{animation:cwsway 1.2s ease}",
    "@keyframes cwsway{25%{transform:rotate(-3deg)}75%{transform:rotate(3deg)}}",
    ".cw-shake{animation:cwshake .5s ease}",
    "@keyframes cwshake{25%{transform:translateX(-5px)}75%{transform:translateX(5px)}}",
    ".cw-it.lamp.on:before{content:'';position:absolute;left:-60%;right:-60%;top:20%;bottom:-40%;background:radial-gradient(closest-side,rgba(255,236,170,.55),rgba(255,236,170,0));pointer-events:none;z-index:-1}",
    ".cw-it.lamp.ceiling.on:before{top:60%;bottom:-120%}",
    ".cw-breathe{transform-origin:50% 100%;animation:cwbreathe 3.8s ease-in-out infinite}",
    "@keyframes cwbreathe{50%{transform:scale(1.012,1.022)}}",
    ".cw-char{position:absolute}",
    ".cw-char>div{width:100%;height:100%}",
    ".cw-char img{width:100%;height:100%}",
    ".cw-friend{transition:left 2.4s linear;cursor:pointer;touch-action:none}",
    ".cw-friend.flip>div{transform:scaleX(-1)}",
    ".cw-friend.sel>div{filter:drop-shadow(0 0 8px #fff) drop-shadow(0 0 4px #f9bccd)}",
    ".cw-bubble{position:absolute;width:44%;aspect-ratio:1;left:58%;top:-26%;background:#fff;border:3px solid #563832;border-radius:50%;box-shadow:0 4px 0 rgba(86,56,50,.2);display:flex;align-items:center;justify-content:center;pointer-events:none}",
    ".cw-bubble img{width:78%;height:78%}",
    ".cw-bubble:after{content:'';position:absolute;left:8%;bottom:-12%;width:20%;height:20%;background:#fff;border:3px solid #563832;border-radius:50%}",
    ".cw-pet{transition:left 1.2s ease-in-out,top 1.2s ease-in-out;cursor:pointer}",
    ".cw-ball{transition:left 1.1s ease-out,top 1.1s ease-out}",
    ".cw-plot{cursor:pointer}",
    ".cw-plant{position:absolute;pointer-events:none}",
    ".cw-plot.ready .cw-plant{animation:cwready 3s ease-in-out infinite;transform-origin:50% 100%}",
    "@keyframes cwready{50%{transform:rotate(2deg)}}",
    ".cw-drop{position:absolute;width:12px;height:18px;border-radius:50% 50% 50% 50%/60% 60% 40% 40%;background:#8fcbe8;border:2px solid #563832;pointer-events:none;animation:cwdrop .7s ease-in forwards}",
    "@keyframes cwdrop{from{transform:translateY(0);opacity:1}to{transform:translateY(60px);opacity:0}}",
    ".cw-fx{position:fixed;z-index:80;pointer-events:none;width:44px;height:44px}",
    /* the tray */
    ".cw-tray{position:absolute;left:0;right:0;bottom:0;z-index:20;background:#fffaf4;border-top:3px solid #563832;box-shadow:0 -4px 0 rgba(86,56,50,.08);padding:6px 8px max(6px,env(safe-area-inset-bottom));display:flex;flex-direction:column;gap:6px}",
    ".cw-tabs{display:flex;gap:8px;overflow-x:auto;scrollbar-width:none}",
    ".cw-tabs::-webkit-scrollbar,.cw-pads::-webkit-scrollbar{display:none}",
    ".cw-tab{flex:none;width:64px;height:64px;border-radius:18px;border:3px solid #563832;background:#fff;padding:3px;cursor:pointer;display:flex;align-items:center;justify-content:center}",
    ".cw-tab[aria-pressed=true]{background:#aee6d2;box-shadow:0 3px 0 #563832}",
    ".cw-tab img{width:100%;height:100%;object-fit:contain}",
    ".cw-tab .sw,.cw-pad .sw{width:100%;height:100%;border-radius:12px;border:2px solid rgba(86,56,50,.35)}",
    ".cw-pads{display:flex;gap:10px;overflow-x:auto;scrollbar-width:none;padding:4px 2px 8px;touch-action:pan-x}",
    ".cw-pad{flex:none;width:88px;height:88px;border-radius:22px;border:3px solid #563832;background:#fff;padding:6px;position:relative;cursor:pointer;box-shadow:0 3px 0 rgba(86,56,50,.2);touch-action:pan-x}",
    ".cw-pad img{width:100%;height:100%;object-fit:contain}",
    ".cw-pad.locked{background:#f7f1ec;border-color:rgba(86,56,50,.55)}",
    ".cw-pad.locked img,.cw-pad.locked .sw{opacity:.5;filter:saturate(.55)}",
    ".cw-pad.sel{background:#fde8ef;box-shadow:0 0 0 4px #f9bccd}",
    ".cw-price{position:absolute;left:50%;bottom:-8px;transform:translateX(-50%);display:flex;align-items:center;gap:3px;background:#fff8e6;border:2px solid #563832;border-radius:999px;padding:1px 8px 1px 2px;font-size:16px;line-height:20px;white-space:nowrap}",
    ".cw-coin{width:18px;height:18px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff3b0,#f2c14e 55%,#c9902a);border:2px solid #563832;display:inline-block;flex:none}",
    ".cw-tick{position:absolute;right:-6px;top:-6px;width:26px;height:26px;border-radius:50%;background:#aee6d2;border:2px solid #563832}",
    ".cw-tick:after{content:'';position:absolute;left:7px;top:3px;width:7px;height:12px;border:solid #563832;border-width:0 3px 3px 0;transform:rotate(45deg)}",
    ".cw-count{position:absolute;right:-6px;top:-6px;min-width:26px;height:26px;border-radius:13px;background:#f9bccd;border:2px solid #563832;font-size:15px;line-height:22px;text-align:center}",
    ".cw-ghost{position:fixed;z-index:90;width:96px;height:96px;pointer-events:none;transform:translate(-50%,-80%);filter:drop-shadow(0 8px 6px rgba(86,56,50,.3))}",
    ".cw-ghost img{width:100%;height:100%;object-fit:contain}",
    ".cw-trayhint{outline:4px dashed #f9bccd;outline-offset:-6px}",
    /* serving */
    ".cw-serve{position:absolute;top:calc(max(8px,env(safe-area-inset-top)) + 80px);left:50%;transform:translateX(-50%);z-index:21;display:none;flex-wrap:wrap;justify-content:center;gap:8px;padding:8px 10px;background:rgba(255,250,244,.96);border:3px solid #563832;border-radius:26px;box-shadow:0 4px 0 rgba(86,56,50,.2);width:max-content;max-width:calc(100% - 16px)}",
    "@media (max-width:520px){.cw-serve{width:250px}}",
    "@media (max-width:440px){.cw-top{flex-direction:column}.cw-serve{left:calc(50% + 40px)}}",
    ".cw-serve.on{display:flex}",
    ".cw-serve button{flex:none;width:68px;height:68px;border-radius:20px;border:3px solid #563832;background:#fff;padding:4px;cursor:pointer}",
    ".cw-serve button img{width:100%;height:100%}",
    /* the plans card and the sticker */
    ".cw-veil{position:absolute;inset:0;z-index:40;background:rgba(246,239,230,.82);display:flex;align-items:center;justify-content:center}",
    ".cw-card{position:relative;background:#fff;border:3px solid #563832;border-radius:30px;box-shadow:0 8px 0 rgba(86,56,50,.18);padding:22px 18px 18px;width:min(92vw,460px);max-height:calc(100% - 24px);overflow:auto}",
    ".cw-goal{display:flex;align-items:center;gap:12px;padding:8px;border-radius:20px;background:#fdf6ef;margin-bottom:10px;cursor:pointer;border:0;width:100%;text-align:left}",
    ".cw-goal img,.cw-goal .sw{width:72px;height:72px;object-fit:contain;flex:none}",
    ".cw-goal .dots{display:flex;gap:8px;flex:1}",
    ".cw-goal .dots i{width:26px;height:26px;border-radius:50%;border:3px solid #563832;background:#fff}",
    ".cw-goal .dots i.on{background:#aee6d2}",
    ".cw-goal.done{background:#e4f8f0}",
    ".cw-goal .box{width:44px;height:44px;border-radius:12px;border:3px solid #563832;background:#fff;position:relative;flex:none}",
    ".cw-goal.done .box{background:#aee6d2}",
    ".cw-goal.done .box:after{content:'';position:absolute;left:12px;top:3px;width:12px;height:22px;border:solid #563832;border-width:0 5px 5px 0;transform:rotate(45deg)}",
    ".cw-book{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;padding-top:6px;border-top:3px dashed #f3d9e1;min-height:60px}",
    ".cw-book img{width:52px;height:52px}",
    ".cw-close{position:absolute;right:10px;top:10px;width:64px;height:64px;border-radius:20px;border:3px solid #563832;background:#fff;cursor:pointer}",
    ".cw-close:before,.cw-close:after{content:'';position:absolute;left:14px;top:27px;width:30px;height:5px;border-radius:3px;background:#563832;transform:rotate(45deg)}",
    ".cw-close:after{transform:rotate(-45deg)}",
    ".cw-sticker{position:absolute;z-index:45;left:50%;top:42%;width:min(46vw,220px);transform:translate(-50%,-50%);pointer-events:none;animation:cwsticker 1.6s ease-out forwards}",
    "@keyframes cwsticker{0%{transform:translate(-50%,-50%) scale(.4);opacity:0}25%{transform:translate(-50%,-50%) scale(1.04);opacity:1}80%{transform:translate(-50%,-50%) scale(1);opacity:1}100%{transform:translate(-50%,-50%) scale(.9);opacity:0}}",
    ".cw-house{position:absolute;left:0;right:0;bottom:0;top:84px}",
    ".cw-house .hg-price>svg{order:-2}",
    ".cw-house .hg-price{display:flex;align-items:center;gap:2px}",
    ".cw-house .hg-pad:not(.cant) .hg-price>svg{display:none}",
    ".cw-house .hg-price:before{content:'';order:-1;width:16px;height:16px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff3b0,#f2c14e 55%,#c9902a);border:2px solid #3b2a33;flex:none}",
    ".cw-housepet{position:absolute;z-index:25;width:84px;height:90px;cursor:pointer}",
    ".cw-housepet img{width:100%;height:100%}",
    ".cw-house .hg-art>svg.cw-hchar{overflow:visible}",
    ".cw-house .hg-it.walking.face-r .hg-art>svg.kc-pose-walk{transform:scaleX(-1) rotate(-4deg)}",
    "@media (prefers-reduced-motion: reduce){.cw-breathe,.cw-plot.ready .cw-plant{animation:none}.cw-friend,.cw-pet,.cw-ball{transition-duration:.01s}}"
  ].join("\n");
  function injectCss() {
    if (document.getElementById("cw-css")) { return; }
    var s = document.createElement("style"); s.id = "cw-css"; s.textContent = CSS; document.head.appendChild(s);
  }
  function loadHome() {
    return new Promise(function (ok, no) {
      if (window.HomeGame) { ok(); return; }
      var s = document.createElement("script"); s.src = BASE + "../../modules/home.js";
      s.onload = function () { ok(); }; s.onerror = function () { no(new Error("modules/home.js did not load")); };
      document.head.appendChild(s);
    });
  }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) { e.className = cls; } if (html) { e.innerHTML = html; } return e; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function itemDef(place, id) { for (var i = 0; i < ITEMS.length; i++) { if (ITEMS[i].place === place && ITEMS[i].id === id) { return ITEMS[i]; } } return null; }
  function aspect(id) { var s = SZ[id] || [1, 1]; return s[1] / s[0]; }

  /* ---------- the saved world (P.world.cafe) ---------- */
  function setup(data) {
    var D = data.cafe = data.cafe || {};
    D.v = 1;
    D.visits = (D.visits || 0) + 1;
    D.seq = D.seq || 0;
    D.owned = D.owned || {};
    D.stats = D.stats || {};
    D.places = D.places || {};
    ["cafe", "garden", "pets"].forEach(function (p) {
      var pl = D.places[p] = D.places[p] || {};
      pl.items = Array.isArray(pl.items) ? pl.items : [];
      pl.wall = pl.wall || (p === "pets" ? "lilac_hearts" : "cream");
      pl.floor = pl.floor || "wood";
    });
    if (!D.started) {   // a cosy start: a table, two chairs and a rug; tulip seeds; the first wallpaper and floor
      D.started = 1;
      ITEMS.forEach(function (it) { if (it.free) { D.owned[it.place + ":" + it.id] = 1; } });
      D.owned["seed:tulip"] = 1; D.owned["wall:cream"] = 1; D.owned["floor:wood"] = 1; D.owned["wall:lilac_hearts"] = 1;
      D.garden = { plots: [0, 1, 2, 3, 4].map(function (i) { return { seed: i === 1 ? "tulip" : "", stage: i === 1 ? 1 : 0, watered: 0 }; }), basket: {} };
      D.places.garden.items.push({ u: ++D.seq, id: "garden_toadstool", x: 640, y: 860 }, { u: ++D.seq, id: "garden_lantern", x: 1250, y: 840 });
      D.places.pets.items.push({ u: ++D.seq, id: "cafe_plant_big", x: 150, y: 760 }, { u: ++D.seq, id: "cafe_picture", x: 520, y: 300 }, { u: ++D.seq, id: "pet_bed", x: 380, y: 850 });
      var c = D.places.cafe.items;
      c.push({ u: ++D.seq, id: "cafe_rug", x: 560, y: 830 }, { u: ++D.seq, id: "cafe_table", x: 560, y: 800 },
        { u: ++D.seq, id: "cafe_chair_pink", x: 400, y: 812 }, { u: ++D.seq, id: "cafe_chair_pink", x: 720, y: 812 });
    }
    D.garden = D.garden || {};
    if (!Array.isArray(D.garden.plots) || D.garden.plots.length !== 5) { D.garden.plots = [0, 1, 2, 3, 4].map(function () { return { seed: "", stage: 0, watered: 0 }; }); }
    D.garden.basket = D.garden.basket || {};
    D.pets = Array.isArray(D.pets) ? D.pets : [];
    D.plans = D.plans || {};
    D.plans.goals = Array.isArray(D.plans.goals) ? D.plans.goals : [];
    D.plans.stickers = Array.isArray(D.plans.stickers) ? D.plans.stickers : [];
    D.served = D.served || 0;
    return D;
  }

  PlayWorlds.register("cafe", { open: function (stage, wctx) {
    injectCss();
    var D = setup(wctx.data);
    var root = el("div", "cw"); stage.appendChild(root);
    var fast = !!wctx.fast, timers = [], place = "map", closed = false;
    var later = function (fn, ms) { var t = setTimeout(function () { if (!closed) { fn(); } }, fast ? Math.min(ms, 60) : ms); timers.push(t); return t; };
    var say = function (t) { wctx.speak(t); };
    function save() { wctx.save(); }

    /* ---------- events, goals and stickers ---------- */
    function hasPet() { return D.pets.length > 0; }
    function goalDef(id) { for (var i = 0; i < GOALS.length; i++) { if (GOALS[i].id === id) { return GOALS[i]; } } return null; }
    function fillGoals() {
      D.plans.goals = D.plans.goals.filter(function (g) { return goalDef(g.id) && !g.done; });
      var used = D.plans.goals.map(function (g) { return g.id; }).concat(D.plans.last || []);
      var pool = GOALS.filter(function (g) { return used.indexOf(g.id) < 0 && (!g.needPet || hasPet()) && (!g.needNoPet || !hasPet()); });
      while (D.plans.goals.length < 3 && pool.length) {
        var g = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
        D.plans.goals.push({ id: g.id, base: D.stats[g.ev] || 0 });
      }
    }
    function progress(g) { var d = goalDef(g.id); return clamp((D.stats[d.ev] || 0) - g.base, 0, d.n); }
    function emit(ev) {
      D.stats[ev] = (D.stats[ev] || 0) + 1;
      var won = [];
      D.plans.goals.forEach(function (g) {
        if (!g.done && progress(g) >= goalDef(g.id).n) { g.done = 1; won.push(g); }
      });
      won.forEach(function (g, i) {
        var kind = STICKERS[D.plans.stickers.length % STICKERS.length];
        D.plans.stickers.push(kind);
        D.plans.last = [g.id];
        later(function () { showSticker(kind); }, 700 + i * 1800);
      });
      if (won.length) { later(function () { fillGoals(); drawPlansDot(); save(); }, 900); }
      save(); drawPlansDot();
    }
    function showSticker(kind) {
      var s = el("img", "cw-sticker"); s.src = img("sticker_" + kind); s.alt = "";
      root.appendChild(s); SND.chime(); say("You got a sticker!");
      later(function () { s.remove(); }, 1700);
    }

    /* ---------- the top buttons ---------- */
    var top = el("div", "cw-top");
    var mapBtn = el("button", "cw-round", '<img src="' + img("icon_map") + '" alt="">'); mapBtn.type = "button"; mapBtn.setAttribute("aria-label", "Map"); mapBtn.dataset.act = "map";
    var plansBtn = el("button", "cw-round", '<img src="' + img("plans_board") + '" alt=""><span class="cw-dot" hidden></span>'); plansBtn.type = "button"; plansBtn.setAttribute("aria-label", "My plans"); plansBtn.dataset.act = "plans";
    var bellBtn = el("button", "cw-round", '<img src="' + img("bell") + '" alt="">'); bellBtn.type = "button"; bellBtn.setAttribute("aria-label", "Ring the bell for a friend"); bellBtn.dataset.act = "bell"; bellBtn.hidden = true;
    top.appendChild(mapBtn); top.appendChild(plansBtn); top.appendChild(bellBtn); root.appendChild(top);
    bellBtn.addEventListener("click", function () { ringBell(); });
    mapBtn.addEventListener("click", function () { SND.pop(); go("map"); });
    plansBtn.addEventListener("click", function () { SND.pop(); openPlans(); });
    function drawPlansDot() {
      var n = D.plans.goals.filter(function (g) { return !g.done; }).length, d = plansBtn.querySelector(".cw-dot");
      d.hidden = !n; d.textContent = n;
    }

    /* ---------- a character that breathes and blinks ---------- */
    var blinkers = [];
    function charEl(name, blinkName, cls) {
      var c = el("div", "cw-char " + (cls || ""), '<div class="cw-breathe"><img alt="" src="' + img(name) + '"></div>');
      c._pose = name; c._blink = blinkName; c._next = Date.now() + 1500 + Math.random() * 3000;
      blinkers.push(c); return c;
    }
    function setPose(c, name, blinkName) { c._pose = name; c._blink = blinkName; c.querySelector("img").src = img(name); }
    var blinkTimer = setInterval(function () {
      var now = Date.now();
      blinkers = blinkers.filter(function (c) { return c.isConnected || c._keep; });
      blinkers.forEach(function (c) {
        if (!c._blink || now < c._next || !c.isConnected) { return; }
        var im = c.querySelector("img"), pose = c._pose;
        im.src = img(c._blink);
        setTimeout(function () { if (c._pose === pose) { im.src = img(pose); } }, 150);
        c._next = now + 2600 + Math.random() * 3600;
      });
    }, 250);

    /* ---------- the map ---------- */
    var mapEl = el("div", "cw-place cw-map on"); mapEl.style.backgroundImage = "url(" + img("map_background") + ")";
    var grid = el("div", "cw-mapgrid");
    [["house", "Mimi's house"], ["cafe", "The café"], ["garden", "The garden"], ["pets", "The pet corner"]].forEach(function (p) {
      var b = el("button", "cw-go", '<img alt="" src="' + img("map_" + p[0]) + '">'); b.type = "button"; b.dataset.place = p[0]; b.setAttribute("aria-label", p[1]);
      b.addEventListener("click", function () { SND.pop(); say(p[1]); go(p[0]); });
      grid.appendChild(b);
    });
    mapEl.appendChild(grid);
    var mapMimi = charEl("mimi_stand", "mimi_blink", "cw-mapmimi");
    mapMimi.style.cursor = "pointer";
    mapMimi.addEventListener("click", function () { setPose(mapMimi, "mimi_wave", null); SND.pop(); say("Hello! Where shall we go?"); later(function () { setPose(mapMimi, "mimi_stand", "mimi_blink"); }, 1600); });
    mapEl.appendChild(mapMimi);
    var mapPet = el("div", "cw-mappet"); mapEl.appendChild(mapPet);
    root.appendChild(mapEl);

    /* ---------- scenes (café, garden, pets) ---------- */
    var scenes = {};
    function makeScene(name) {
      var pl = el("div", "cw-place cw-" + name);
      var sc = el("div", "cw-scene"), inner = el("div", "cw-inner"), wall = el("div", "cw-wall"), floor = el("div", "cw-floorbg"), box = el("div", "cw-box");
      inner.appendChild(wall); inner.appendChild(floor); inner.appendChild(box); sc.appendChild(inner); pl.appendChild(sc);
      var tray = el("div", "cw-tray"), tabs = el("div", "cw-tabs"), pads = el("div", "cw-pads");
      tray.appendChild(tabs); tray.appendChild(pads); pl.appendChild(tray);
      root.appendChild(pl);
      var S = { name: name, el: pl, sc: sc, inner: inner, wall: wall, floor: floor, box: box, tray: tray, tabs: tabs, pads: pads, s: 0.5, tab: null, fixed: [] };
      scenes[name] = S;
      return S;
    }
    function layout(S) {
      if (!S || !S.el.classList.contains("on")) { return; }
      var r = S.el.getBoundingClientRect(), th = S.tray.offsetHeight, ah = Math.max(120, r.height - th), aw = r.width;
      var s = Math.min(ah / WH, aw / 640), nar = WW * s > aw + 1, fo = FOCUS[S.name];
      if (nar) { s = Math.min(ah / WH, aw / (fo[1] - fo[0])); }
      if (S.narrow !== nar) { S.narrow = nar; if (S.arrange) { S.arrange(); } }
      S.s = s;
      var bw = WW * s, bh = WH * s, iw = Math.max(aw, bw);
      S.sc.style.height = ah + "px";
      S.inner.style.width = iw + "px";
      S.box.style.cssText = "left:" + ((iw - bw) / 2) + "px;top:" + (ah - bh) + "px;width:" + bw + "px;height:" + bh + "px";
      var fy = ah - bh + FLOOR[S.name] * s;
      S.wall.style.height = fy + "px"; S.floor.style.top = fy + "px";
      if (S.gback) { S.gback.style.cssText = "position:absolute;left:0;right:0;top:" + (ah - bh) + "px;height:" + (600 * s) + "px;background:url(" + img("garden_back") + ") " + ((iw - bw) / 2) + "px 0/" + bw + "px 100% repeat-x"; }
      paintScene(S);
      if (!S._scrolled && bw > aw) { S._scrolled = 1; S.sc.scrollLeft = clamp((iw - bw) / 2 + (fo[0] + fo[1]) / 2 * s - aw / 2, 0, iw - aw); }
      if (S.after) { S.after(); }
    }
    function paintScene(S) {
      var pl = D.places[S.name], s = S.s;
      if (S.name === "garden") {
        S.floor.style.background = PATTERN.grass + " 0 0/" + (TILE.grass * s) + "px auto, #a9d98e";
        return;
      }
      S.wall.style.background = PATTERN[pl.wall] + " 0 0/" + (TILE[pl.wall] * s) + "px auto";
      S.floor.style.background = PATTERN[pl.floor] + " 0 0/" + (TILE[pl.floor] * s) + "px auto";
    }
    // place an element in world units: anchor "foot" (x centre, y bottom) or "centre" or "top"
    function put(e, x, y, w, h, anchor, z) {
      var left = x - w / 2, topY = anchor === "foot" ? y - h : anchor === "top" ? y : y - h / 2;
      e.style.left = (left / WW * 100) + "%"; e.style.top = (topY / WH * 100) + "%";
      e.style.width = (w / WW * 100) + "%"; e.style.height = (h / WH * 100) + "%";
      if (z !== undefined) { e.style.zIndex = Math.round(z); }
    }
    function fixed(S, name, x, y, w, anchor, z, cls) {
      var e = el("div", "cw-fix " + (cls || ""), '<img alt="" src="' + img(name) + '">');
      put(e, x, y, w, w * aspect(name), anchor, z); S.box.appendChild(e); return e;
    }
    function zOf(def, y) { return def.zone === "rug" ? 2 + y / 100 : def.zone === "wall" ? 5 : def.zone === "ceiling" ? 1200 : 10 + y + (def.small ? 1000 : 0); }
    function anchorOf(def) { return def.zone === "wall" ? "centre" : def.zone === "ceiling" ? "top" : "foot"; }
    function clampItem(S, def, x, y) {
      var w = def.w, h = w * aspect(def.id), fl = FLOOR[S.name];
      x = clamp(x, w / 2 + 10, WW - w / 2 - 10);
      if (def.zone === "wall") { y = clamp(y, 40 + h / 2, fl - 30 - h / 2); }
      else if (def.zone === "ceiling") { y = 0; }
      else { y = clamp(y, fl + (def.zone === "rug" ? h / 2 : 30), WH - 8); }
      return { x: Math.round(x), y: Math.round(y) };
    }
    function drawItem(S, t, land) {
      var def = itemDef(S.name, t.id); if (!def) { return null; }
      var e = S.box.querySelector('.cw-it[data-u="' + t.u + '"]');
      if (!e) {
        e = el("div", "cw-it", '<img alt="" src="' + img(def.id) + '">'); e.dataset.u = t.u; e.dataset.drag = "item";
        e.setAttribute("role", "button"); e.setAttribute("aria-label", def.id.replace(/^(cafe|garden|pet)_/, "").replace(/_/g, " "));
        if (def.lamp) { e.classList.add("lamp"); if (def.zone === "ceiling") { e.classList.add("ceiling"); } }
        S.box.appendChild(e);
      }
      if (def.lamp) { e.classList.toggle("on", t.off !== 1); }
      put(e, t.x, t.y, def.w, def.w * aspect(def.id), anchorOf(def), zOf(def, t.y));
      if (land) { e.classList.remove("land"); void e.offsetWidth; e.classList.add("land"); }
      return e;
    }
    function drawItems(S) {
      S.box.querySelectorAll(".cw-it").forEach(function (e) { e.remove(); });
      D.places[S.name].items.forEach(function (t) { drawItem(S, t); });
    }
    function findItem(S, u) { var a = D.places[S.name].items; for (var i = 0; i < a.length; i++) { if (a[i].u === u) { return a[i]; } } return null; }
    function anim(e, cls) { if (!e) { return; } e.classList.remove(cls); void e.offsetWidth; e.classList.add(cls); setTimeout(function () { e.classList.remove(cls); }, 1300); }
    function defaultSpot(S, def) {
      var sc = S.sc, s = S.s, boxLeft = parseFloat(S.box.style.left) || 0;
      var cx = (sc.scrollLeft + sc.clientWidth / 2 - boxLeft) / s;
      var n = D.places[S.name].items.length, jitter = ((n * 137) % 300) - 150;
      var y = def.zone === "wall" ? 260 + ((n * 53) % 120) : def.zone === "ceiling" ? 0 : FLOOR[S.name] + 180 + ((n * 41) % 100);
      var x = cx + jitter;
      if (S.name === "cafe" && (def.zone === "floor" || def.zone === "rug")) {   // not hidden behind the counter
        var A = S.narrow ? NARROW.cafe : WIDE.cafe;
        x = Math.min(x, A.counter[0] - A.counter[1] / 2 - def.w / 2 - 10);
      }
      return clampItem(S, def, x, y);
    }
    function addItem(S, def, at) {
      var list = D.places[S.name].items, copies = list.filter(function (t) { return t.id === def.id; });
      if (copies.length >= MAX_COPIES) { anim(S.box.querySelector('.cw-it[data-u="' + copies[0].u + '"]'), "cw-bounce"); SND.plop(); return null; }
      var p = at ? clampItem(S, def, at.x, at.y) : defaultSpot(S, def);
      var t = { u: ++D.seq, id: def.id, x: p.x, y: p.y };
      list.push(t); save(); SND.plop();
      return drawItem(S, t, true);
    }

    /* ---------- the tray: tabs and pads ---------- */
    function padHTML(art, price, locked, extra) {
      return (art.indexOf("sw:") === 0 ? "<div class=\"sw\" style='background:" + PATTERN[art.slice(3)] + " 0 0/40px auto'></div>" : '<img alt="" src="' + img(art) + '">') +
        (locked ? '<span class="cw-price"><i class="cw-coin"></i>' + price + "</span>" : "") + (extra || "");
    }
    function setTabs(S, list) {
      S.tabList = list;
      S.tabs.innerHTML = "";
      list.forEach(function (t) {
        var b = el("button", "cw-tab", padHTML(t.icon, 0, false)); b.type = "button"; b.dataset.tab = t.id; b.setAttribute("aria-label", t.id);
        b.addEventListener("click", function () { SND.pop(); S.tab = t.id; drawPads(S); });
        S.tabs.appendChild(b);
      });
      if (!S.tab) { S.tab = list[0].id; }
    }
    function drawPads(S) {
      S.tabs.querySelectorAll(".cw-tab").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.tab === S.tab)); });
      var tab = S.tabList.filter(function (t) { return t.id === S.tab; })[0];
      S.pads.innerHTML = "";
      tab.pads().forEach(function (p) {
        var b = el("div", "cw-pad" + (p.locked ? " locked" : "") + (p.sel ? " sel" : ""), padHTML(p.art, p.price, p.locked, p.extra));
        b.setAttribute("role", "button"); b.tabIndex = 0; b.dataset.key = p.key; b.setAttribute("aria-label", p.label + (p.locked ? ", " + p.price + " coins" : ""));
        b.dataset.drag = "pad"; b._pad = p;
        S.pads.appendChild(b);
      });
    }
    function itemPads(S, cat) {
      return ITEMS.filter(function (it) { return it.place === S.name && it.cat === cat; }).map(function (it) {
        var key = S.name + ":" + it.id;
        return { key: key, art: it.id, price: it.price, locked: !D.owned[key], label: it.id.replace(/^(cafe|garden|pet)_/, "").replace(/_/g, " "), def: it,
          tap: function (padEl) { if (D.owned[key]) { addItem(S, it); } else { buy(key, it.price, padEl, function () { emit("buy"); if (it.lamp) { emit("buy_light"); } addItem(S, it); }); } },
          drop: function (wx, wy) { if (D.owned[key]) { addItem(S, it, { x: wx, y: wy + (it.zone === "wall" ? 0 : 0) }); return true; } return false; } };
      });
    }
    function paintPads(S, kind) {
      var list = kind === "wall" ? WALLS : FLOORS, pl = D.places[S.name];
      return list.map(function (w) {
        var key = kind + ":" + w.id, own = w.price === 0 || D.owned[key];
        return { key: key, art: "sw:" + w.id, price: w.price, locked: !own, label: w.id.replace(/_/g, " "), extra: pl[kind] === w.id ? '<span class="cw-tick"></span>' : "",
          tap: function (padEl) {
            var apply = function () { pl[kind] = w.id; save(); paintScene(S); drawPads(S); SND.swish(); emit("paint"); };
            if (own) { if (pl[kind] !== w.id) { apply(); } } else { buy(key, w.price, padEl, apply); }
          } };
      });
    }
    // buy: spend coins when there are enough, else a soft "not yet"
    function buy(key, price, padEl, then) {
      if (wctx.spend(price)) {
        D.owned[key] = 1; save(); SND.buy(); say("Yay!");
        sparkleAt(padEl);
        then();
        var S = scenes[place]; if (S) { drawPads(S); }
        return true;
      }
      anim(padEl, "cw-shake"); SND.no(); say("Not yet. Keep playing maths!");
      return false;
    }
    function sparkleAt(target) {
      if (!target || !target.getBoundingClientRect) { return; }
      var r = target.getBoundingClientRect();
      heartsAt(r.left + r.width / 2, r.top + r.height / 3, 3);
    }
    function heartsAt(cx, cy, n) {
      for (var i = 0; i < n; i++) {
        var h = el("img", "cw-fx"); h.alt = ""; h.src = RART + "heart.png";
        h.style.left = (cx - 22 + (i - (n - 1) / 2) * 30) + "px"; h.style.top = (cy - 22) + "px";
        root.appendChild(h);
        if (h.animate && !fast) {
          var an = h.animate([{ transform: "translateY(0) scale(.6)", opacity: 0 }, { transform: "translateY(-20px) scale(1)", opacity: 1, offset: 0.3 }, { transform: "translateY(-70px) scale(.9)", opacity: 0 }], { duration: 1300 + i * 150, easing: "ease-out" });
          an.onfinish = (function (x) { return function () { x.remove(); }; })(h);
        } else { setTimeout((function (x) { return function () { x.remove(); }; })(h), 300); }
      }
    }
    function heartsOn(e, n) { if (!e) { return; } var r = e.getBoundingClientRect(); heartsAt(r.left + r.width / 2, r.top + r.height * 0.15, n || 2); }

    /* ---------- the pet that follows her ---------- */
    function follower() { return D.petWith && D.pets.some(function (p) { return p.kind === D.petWith; }) ? D.petWith : (D.pets[0] && D.pets[0].kind) || ""; }
    function petCuddle(e, kind) {
      if (!e) { return; }
      var c = e._char || e;
      if (c._pose !== undefined) { setPose(c, "pet_" + kind + "_happy", null); later(function () { setPose(c, "pet_" + kind + "_sit", "pet_" + kind + "_blink"); }, 1500); }
      heartsOn(e, 2); SND.purr(); emit("cuddle");
    }
    function followPetIn(S, x, y) {
      var old = S.box.querySelector(".cw-follow"); if (old) { old.remove(); }
      var k = follower(); if (!k) { return; }
      var c = charEl("pet_" + k + "_sit", "pet_" + k + "_blink", "cw-follow cw-pet");
      put(c, x, y, 150, 150 * aspect("pet"), "foot", 10 + y + 500);
      c.setAttribute("role", "button"); c.setAttribute("aria-label", "My " + PET_NAME[k]); c.dataset.pet = k;
      c.addEventListener("click", function () { petCuddle(c, k); });
      S.box.appendChild(c);
      anim(c, "cw-bounce");
    }
    function drawMapPet() {
      var k = follower(); mapPet.innerHTML = "";
      if (!k) { return; }
      var c = charEl("pet_" + k + "_sit", "pet_" + k + "_blink", "");
      c.style.cssText = "position:relative;width:100%;aspect-ratio:320/340;cursor:pointer";
      c.addEventListener("click", function () { petCuddle(c, k); });
      mapPet.appendChild(c);
    }

    /* ========== the café ========== */
    var cafe = makeScene("cafe"), friends = [], selFriend = null, nextFriend = D.served % FRIENDS.length;
    (function () {
      var S = cafe;
      fixed(S, "cafe_window", 800, 30, 440, "top", 4);
      var door = fixed(S, "cafe_door", 140, FLOOR.cafe + 6, 190, "foot", 6, "cw-door");
      door.setAttribute("role", "button"); door.setAttribute("aria-label", "Ring the bell"); door.style.cursor = "pointer"; door.dataset.act = "bell";
      door.addEventListener("click", function () { ringBell(); });
      var mimi = charEl("mimi_stand", "mimi_blink", "");
      mimi.setAttribute("role", "button"); mimi.setAttribute("aria-label", "Mimi"); mimi.style.cursor = "pointer";
      mimi.addEventListener("click", function () { setPose(mimi, "mimi_wave", null); SND.pop(); say("Welcome to my café!"); later(function () { setPose(mimi, "mimi_stand", "mimi_blink"); }, 1500); });
      S.box.appendChild(mimi); S.mimi = mimi;
      var counter = fixed(S, "cafe_counter", 1200, 890, 720, "foot", 880); counter.classList.add("cw-counter");
      S.arrange = function () {
        var A = S.narrow ? NARROW.cafe : WIDE.cafe;
        put(counter, A.counter[0], 890, A.counter[1], A.counter[1] * aspect("cafe_counter"), "foot", 880);
        put(mimi, A.mimi[0], 765, A.mimi[1], A.mimi[1] * aspect("char"), "foot", 870);
        friends.forEach(function (f) { if (f.state === "wait") { f.el.style.left = ((spotX(f.spot) - 110) / WW * 100) + "%"; } });
        var pe = S.box.querySelector(".cw-follow"); if (pe) { followPetIn(S, A.pet, 880); }
      };
      S.arrange();
      var serve = el("div", "cw-serve"); S.serve = serve; S.el.appendChild(serve);
      TREATS.forEach(function (t) {
        var b = el("button", "", '<img alt="" src="' + img("treat_" + t) + '">'); b.type = "button"; b.dataset.treat = t; b.setAttribute("aria-label", TREAT_NAME[t]);
        b.addEventListener("click", function () { serveTreat(t, b); });
        serve.appendChild(b);
      });
      setTabs(S, [
        { id: "furniture", icon: "cafe_chair_pink", pads: function () { return itemPads(S, "furniture"); } },
        { id: "light", icon: "cafe_lamp_floor", pads: function () { return itemPads(S, "light"); } },
        { id: "plant", icon: "cafe_plant_big", pads: function () { return itemPads(S, "plant"); } },
        { id: "decor", icon: "cafe_picture", pads: function () { return itemPads(S, "decor"); } },
        { id: "wall", icon: "sw:pink_dots", pads: function () { return paintPads(S, "wall"); } },
        { id: "floor", icon: "sw:pink_checks", pads: function () { return paintPads(S, "floor"); } }
      ]);
    })();
    function ringBell() {
      var S = cafe; SND.bell();
      anim(S.box.querySelector(".cw-door"), "cw-sway");
      if (friends.length >= 2) { say("Two friends are waiting."); return; }
      var kind = FRIENDS[nextFriend % FRIENDS.length]; nextFriend++;
      var used = friends.map(function (f) { return f.spot; });
      var spot = used.indexOf(0) < 0 ? 0 : 1, tx = spotX(spot);
      var want = TREATS[(D.served * 5 + nextFriend * 3) % TREATS.length];
      var f = { kind: kind, want: want, spot: spot, state: "walk" };
      var c = charEl("friend_" + kind + "_walk", null, "cw-friend flip");
      c.setAttribute("role", "button"); c.setAttribute("aria-label", FRIEND_NAME[kind]); c.dataset.friend = kind;
      put(c, 150, 860 - spot * 30, 220, 220 * aspect("char"), "foot", 10 + 860 - spot * 30);
      S.box.appendChild(c); f.el = c;
      friends.push(f);
      c.addEventListener("click", function () { pickFriend(f); });
      void c.offsetWidth;
      c.style.left = ((tx - 110) / WW * 100) + "%";
      say(FRIEND_NAME[kind] + " is here!");
      later(function () {
        if (f.state !== "walk") { return; }
        f.state = "wait"; c.classList.remove("flip"); setPose(c, "friend_" + kind + "_stand", "friend_" + kind + "_blink");
        var b = el("div", "cw-bubble", '<img alt="" src="' + img("treat_" + want) + '">'); c.appendChild(b);
        S.serve.classList.add("on"); layout(S);
      }, 2450);
    }
    function spotX(spot) { return (cafe.narrow ? NARROW.cafe : WIDE.cafe).spots[spot]; }
    function pickFriend(f) {
      if (f.state !== "wait") { return; }
      friends.forEach(function (o) { o.el.classList.toggle("sel", o === f); });
      selFriend = f; SND.pop(); say("I would like " + TREAT_NAME[f.want] + ", please!");
    }
    function serveTreat(t, btn) {
      var waiting = friends.filter(function (f) { return f.state === "wait"; });
      if (!waiting.length) { anim(btn, "cw-shake"); say("Ring the bell for a friend."); anim(cafe.box.querySelector(".cw-door"), "cw-sway"); return; }
      var f = selFriend && selFriend.state === "wait" ? selFriend : waiting.length === 1 ? waiting[0] : null;
      if (!f) { waiting.forEach(function (o) { anim(o.el, "cw-bounce"); }); say("Tap a friend first."); return; }
      if (f.want !== t) { anim(f.el, "cw-shake"); SND.no(); say("Hmm, I would like " + TREAT_NAME[f.want] + "."); return; }
      // the treat flies to the friend
      var r = btn.getBoundingClientRect(), fr = f.el.getBoundingClientRect(), fly = el("img", "cw-fx"); fly.src = img("treat_" + t); fly.alt = "";
      fly.style.cssText = "left:" + r.left + "px;top:" + r.top + "px;width:64px;height:64px";
      root.appendChild(fly);
      if (fly.animate && !fast) { fly.animate([{ transform: "none" }, { transform: "translate(" + (fr.left + fr.width / 2 - r.left - 32) + "px," + (fr.top + fr.height * 0.45 - r.top - 32) + "px) scale(.8)" }], { duration: 600, easing: "ease-in-out", fill: "forwards" }); }
      later(function () { fly.remove(); }, 620);
      f.state = "happy"; selFriend = null; f.el.classList.remove("sel");
      var bub = f.el.querySelector(".cw-bubble"); if (bub) { bub.remove(); }
      if (!friends.some(function (o) { return o.state === "wait"; })) { cafe.serve.classList.remove("on"); }
      D.served++; SND.pop();
      later(function () { setPose(f.el, "friend_" + f.kind + "_sip", null); heartsOn(f.el, 3); SND.chime(); say("Yummy! Thank you!"); emit("serve"); }, 600);
      later(function () { setPose(f.el, "friend_" + f.kind + "_cheer", null); }, 2200);
      later(function () { setPose(f.el, "friend_" + f.kind + "_wave", null); }, 3200);
      later(function () {
        setPose(f.el, "friend_" + f.kind + "_walk", null); f.el.style.left = ((150 - 110) / WW * 100) + "%";
        later(function () { f.el.remove(); friends = friends.filter(function (o) { return o !== f; }); }, 2450);
      }, 4200);
    }

    /* ========== the garden ========== */
    var garden = makeScene("garden"), tool = null;
    var PLOT_X = [220, 510, 800, 1090, 1380], PLOT_Y = 690;
    (function () {
      var S = garden;
      S.gback = el("div", "cw-gback"); S.inner.insertBefore(S.gback, S.box);
      S.plots = PLOT_X.map(function (x, i) {
        var e = el("div", "cw-fix cw-plot"); e.dataset.plot = i; e.setAttribute("role", "button"); e.setAttribute("aria-label", "Garden bed " + (i + 1));
        put(e, x, PLOT_Y + 70, 270, 270 * aspect("garden_plot"), "foot", 10 + PLOT_Y);
        e.innerHTML = '<img alt="" src="' + img("garden_plot") + '"><div class="cw-plant"></div>';
        e.addEventListener("click", function () { tapPlot(i); });
        S.box.appendChild(e); return e;
      });
      var can = fixed(S, "watering_can", 120, 880, 170, "foot", 1500, "cw-tool");
      can.dataset.drag = "can"; can.setAttribute("role", "button"); can.setAttribute("aria-label", "Watering can"); can.style.cursor = "pointer";
      var basket = fixed(S, "garden_basket", 1490, 880, 170, "foot", 1500, "cw-basket");
      basket.setAttribute("aria-label", "Basket"); S.basket = basket;
      basket.appendChild(el("span", "cw-count"));
      S.arrange = function () {
        var A = S.narrow ? NARROW.garden : WIDE.garden;
        // narrow: the beds are drawn above floor things (a start toadstool must not catch taps meant for a bed)
        S.plots.forEach(function (e, i) { var q = A.plots[i]; put(e, q[0], q[1], A.plotW, A.plotW * aspect("garden_plot"), "foot", S.narrow ? 1000 + q[1] / 10 : q[1] - 60); });
        put(can, A.can, 880, 170, 170 * aspect("watering_can"), "foot", 1500);
        put(basket, A.basket, 880, 170, 170 * aspect("garden_basket"), "foot", 1500);
        var pe = S.box.querySelector(".cw-follow"); if (pe) { followPetIn(S, A.pet, 880); }
      };
      setTabs(S, [
        { id: "seeds", icon: "seed_tulip", pads: function () {
          return SEEDS.map(function (sd) {
            var key = "seed:" + sd.id;
            return { key: key, art: "seed_" + sd.id, price: sd.price, locked: !D.owned[key], sel: tool === key, label: sd.id + " seeds",
              tap: function (padEl) { if (D.owned[key]) { tool = tool === key ? null : key; SND.pop(); drawPads(S); } else { buy(key, sd.price, padEl, function () { tool = key; }); } },
              drop: function (wx, wy, cx, cy) { if (!D.owned[key]) { return false; } var i = plotAt(cx, cy); if (i >= 0) { tool = key; tapPlot(i); } return true; } };
          });
        } },
        { id: "decor", icon: "garden_bench", pads: function () { return itemPads(S, "decor"); } }
      ]);
    })();
    function plotAt(cx, cy) {
      for (var i = 0; i < garden.plots.length; i++) {
        var r = garden.plots[i].getBoundingClientRect();
        if (cx >= r.left - 10 && cx <= r.right + 10 && cy >= r.top - r.height * 1.4 && cy <= r.bottom + 10) { return i; }
      }
      return -1;
    }
    function plantArt(p) { return !p.seed ? "" : p.stage === 0 ? "plant_seeded" : p.stage === 1 ? "plant_sprout" : "plant_" + p.seed + (p.stage === 2 ? "_bud" : "_bloom"); }
    function drawPlots() {
      D.garden.plots.forEach(function (p, i) {
        var e = garden.plots[i], pe = e.querySelector(".cw-plant"), a = plantArt(p);
        pe.style.cssText = "left:2%;width:96%;bottom:30%;aspect-ratio:220/300";
        pe.innerHTML = a ? '<img alt="" src="' + img(a) + '" style="width:100%;height:100%">' : "";
        e.classList.toggle("ready", p.stage === 3 && !!p.seed);
        e.setAttribute("aria-label", "Garden bed " + (i + 1) + (p.seed ? ", " + p.seed + (p.stage === 3 ? ", ready" : "") : ", empty"));
      });
      var n = 0, b = D.garden.basket; for (var k in b) { n += b[k]; }
      var c = garden.basket.querySelector(".cw-count"); c.textContent = n; c.hidden = !n;
    }
    function tapPlot(i) {
      var p = D.garden.plots[i], e = garden.plots[i];
      if (!p.seed) {
        var key = tool && tool.indexOf("seed:") === 0 ? tool : null;
        if (!key) { var own = SEEDS.filter(function (s) { return D.owned["seed:" + s.id]; }); key = own.length ? "seed:" + own[0].id : null; }
        if (!key) { garden.tab = "seeds"; drawPads(garden); anim(garden.pads, "cw-bounce"); return; }
        p.seed = key.slice(5); p.stage = 0; p.watered = 0;
        save(); drawPlots(); anim(e, "cw-bounce"); SND.plop(); say("Planted! Now water it."); emit("plant");
        return;
      }
      if (p.stage >= 3) {   // pick it
        var r = e.getBoundingClientRect(), br = garden.basket.getBoundingClientRect(), fly = el("img", "cw-fx"); fly.src = img(plantArt(p)); fly.alt = "";
        fly.style.cssText = "left:" + (r.left + r.width / 2 - 40) + "px;top:" + (r.top - r.height) + "px;width:80px;height:110px";
        root.appendChild(fly);
        if (fly.animate && !fast) { fly.animate([{ transform: "none" }, { transform: "translate(" + (br.left - r.left) + "px," + (br.top - r.top + r.height) + "px) scale(.5)", opacity: 0.4 }], { duration: 800, easing: "ease-in", fill: "forwards" }); }
        later(function () { fly.remove(); anim(garden.basket, "cw-bounce"); }, 820);
        D.garden.basket[p.seed] = (D.garden.basket[p.seed] || 0) + 1;
        p.seed = ""; p.stage = 0; p.watered = 0;
        save(); drawPlots(); SND.chime(); say("You picked it!"); emit("pick");
        return;
      }
      water(i);
    }
    function water(i) {
      var p = D.garden.plots[i], e = garden.plots[i];
      if (!p.seed) { SND.water(); dropsOn(e); return; }
      dropsOn(e); SND.water();
      var can = garden.box.querySelector(".cw-tool"); anim(can, "cw-sway");
      emit("water");
      if (p.stage < 3 && p.watered !== D.visits) {
        p.watered = D.visits;
        later(function () { p.stage++; save(); drawPlots(); anim(e.querySelector(".cw-plant"), "cw-bounce"); SND.pop(); say(p.stage === 3 ? "It is ready to pick!" : "It grew!"); }, 700);
      } else if (p.stage < 3) {
        save(); say("Good drink! It will grow more next time.");
      }
    }
    function dropsOn(e) {
      for (var k = 0; k < 6; k++) {
        var d = el("i", "cw-drop"); d.style.left = (20 + k * 12) + "%"; d.style.top = (-60 + (k % 2) * 10) + "%"; d.style.animationDelay = (k * 0.06) + "s";
        e.appendChild(d); setTimeout((function (x) { return function () { x.remove(); }; })(d), 1100);
      }
    }

    /* ========== the pet corner ========== */
    var pets = makeScene("pets"), bowlFull = false;
    (function () {
      var S = pets;
      fixed(S, "cafe_window", 1060, 40, 400, "top", 4);
      var bowl = fixed(S, "pet_bowl_empty", 800, 870, 170, "foot", 900, "cw-bowl");
      bowl.setAttribute("role", "button"); bowl.setAttribute("aria-label", "Food bowl"); bowl.style.cursor = "pointer"; bowl.dataset.act = "feed";
      bowl.addEventListener("click", feedPet); S.bowl = bowl;
      var ball = fixed(S, "pet_ball", 1180, 860, 90, "foot", 1400, "cw-ball");
      ball.setAttribute("role", "button"); ball.setAttribute("aria-label", "Ball"); ball.style.cursor = "pointer"; ball.dataset.act = "ball";
      ball.addEventListener("click", playBall); S.ball = ball;
      setTabs(S, [
        { id: "adopt", icon: "pet_kitten_sit", pads: function () {
          return PETS.map(function (pt) {
            var key = "pet:" + pt.id, has = D.pets.some(function (p) { return p.kind === pt.id; });
            return { key: key, art: "pet_" + pt.id + "_sit", price: pt.price, locked: !has, sel: has && follower() === pt.id, label: PET_NAME[pt.id],
              tap: function (padEl) {
                if (has) { D.petWith = pt.id; save(); drawPets(); drawPads(S); var pe = S.box.querySelector('.cw-pet[data-pet="' + pt.id + '"]'); petCuddle(pe, pt.id); return; }
                buy(key, pt.price, padEl, function () {
                  D.pets.push({ kind: pt.id, x: 560 + D.pets.length * 170, y: 820 }); D.petWith = pt.id; save();
                  drawPets(); say("Hello, little " + PET_NAME[pt.id] + "!"); emit("adopt");
                  fillGoals(); drawPlansDot();
                });
              } };
          });
        } },
        { id: "toys", icon: "pet_house", pads: function () { return itemPads(S, "toys"); } }
      ]);
    })();
    function drawPets() {
      pets.box.querySelectorAll(".cw-pet:not(.cw-follow)").forEach(function (e) { e.remove(); });
      D.pets.forEach(function (p) {
        var c = charEl("pet_" + p.kind + "_sit", "pet_" + p.kind + "_blink", "cw-pet");
        c.dataset.pet = p.kind; c.dataset.drag = "pet"; c.setAttribute("role", "button"); c.setAttribute("aria-label", PET_NAME[p.kind]);
        put(c, p.x, p.y, 190, 190 * aspect("pet"), "foot", 10 + p.y);
        pets.box.appendChild(c);
      });
      drawMapPet();
    }
    function petEl(kind) { return pets.box.querySelector('.cw-pet[data-pet="' + kind + '"]'); }
    function walkPet(kind, x, y, then) {
      var p = D.pets.filter(function (q) { return q.kind === kind; })[0], c = petEl(kind); if (!p || !c) { return; }
      p.x = Math.round(clamp(x, 120, 1480)); p.y = Math.round(clamp(y, 700, 880));
      put(c, p.x, p.y, 190, 190 * aspect("pet"), "foot", 10 + p.y); save();
      later(then || function () {}, 1250);
    }
    function feedPet() {
      var k = follower();
      if (!k) { anim(pets.tabs, "cw-bounce"); say("Adopt a pet first."); SND.no(); return; }
      if (bowlFull) { return; }
      bowlFull = true; pets.bowl.querySelector("img").src = img("pet_bowl_full"); SND.plop();
      walkPet(k, 800 - 150, 860, function () {
        var c = petEl(k); anim(c, "cw-bounce"); SND.pop();
        later(function () { anim(c, "cw-bounce"); SND.pop(); }, 600);
        later(function () {
          pets.bowl.querySelector("img").src = img("pet_bowl_empty"); bowlFull = false;
          setPose(c, "pet_" + k + "_happy", null); heartsOn(c, 3); SND.purr(); say("Yum! Your " + PET_NAME[k] + " is happy.");
          emit("feed");
          later(function () { setPose(c, "pet_" + k + "_sit", "pet_" + k + "_blink"); }, 1500);
        }, 1300);
      });
    }
    var ballBusy = false;
    function playBall() {
      var k = follower(), ball = pets.ball;
      if (!k) { anim(ball, "cw-bounce"); SND.plop(); return; }
      if (ballBusy) { return; }
      ballBusy = true; SND.plop();
      var tx = 300 + Math.round(Math.random() * 1000);
      put(ball, tx, 870, 90, 90, "foot", 1400);
      later(function () {
        walkPet(k, tx - 120, 860, function () {
          var c = petEl(k); setPose(c, "pet_" + k + "_happy", null); SND.pop();
          put(ball, 1180, 860, 90, 90, "foot", 1400);
          walkPet(k, 1060, 850, function () {
            setPose(c, "pet_" + k + "_sit", "pet_" + k + "_blink"); heartsOn(c, 2); ballBusy = false; emit("ball");
          });
        });
      }, 500);
    }

    /* ========== Mimi's House: the old dollhouse (HomeGame) ========== */
    var houseEl = el("div", "cw-place cw-houseplace"), houseWrap = el("div", "cw-house"), houseBox = el("div", ""), housePet = null, houseOn = false, saved = null;
    houseBox.style.cssText = "position:relative;width:100%;height:100%";
    houseWrap.appendChild(houseBox); houseEl.appendChild(houseWrap); root.appendChild(houseEl);
    function realP() {
      try { if (typeof P !== "undefined" && P) { return P; } } catch (e) {}
      return window.__game && window.__game.P ? window.__game.P : null;
    }
    function houseStore() {
      var rp = realP();
      if (rp) { return rp; }
      D.house = D.house || {};   // no page save (a test page): keep the house in the world's own save
      return D.house;
    }
    function enterHouse() {
      if (houseOn) { return; }
      loadHome().then(function () {
        if (closed || place !== "house") { return; }
        var store = houseStore();
        saved = { P: Object.getOwnPropertyDescriptor(window, "P"), speak: window.speak, tone: window.tone, renderTop: window.renderTop };
        window.P = new Proxy(store, {
          get: function (t, k) { return k === "stars" ? wctx.coins() : t[k]; },
          set: function (t, k, v) {
            if (k !== "stars") { t[k] = v; return true; }
            var now = wctx.coins(), diff = now - v;
            if (diff > 0) { if (wctx.spend(diff)) { emit("buy"); emit("house_buy"); } }
            else if (diff < 0) { var rp = realP(); if (rp && typeof rp.coins === "number") { rp.coins -= diff; wctx.coinsChanged(); save(); } }
            return true;
          }
        });
        window.speak = function (text) {
          var t = String(text);
          if (/Do more sums/.test(t)) { t = "Not yet. Keep playing maths!"; }
          say(t.replace(/\bstars\b/g, "coins").replace(/\bstar\b/g, "coin"));
        };
        window.tone = SND.tone;
        window.renderTop = function () { wctx.coinsChanged(); };
        HomeGame.mount(houseBox, { artBase: BASE + "../../art2/", chars: HOUSE_CHARS, art: HOUSE_ART, price: housePrice });
        houseOn = true;
        drawHousePet();
      }).catch(function (e) { console.error(e); say("The house is not ready."); go("map"); });
    }
    function leaveHouse() {
      if (!houseOn) { return; }
      try { HomeGame.unmount(); } catch (e) { console.error(e); }
      houseOn = false;
      if (saved) {
        if (saved.P) { Object.defineProperty(window, "P", saved.P); } else { delete window.P; }
        ["speak", "tone", "renderTop"].forEach(function (k) { if (saved[k] === undefined) { delete window[k]; } else { window[k] = saved[k]; } });
        saved = null;
      }
      if (housePet) { housePet.remove(); housePet = null; }
      save();
    }
    function drawHousePet() {
      if (housePet) { housePet.remove(); housePet = null; }
      var k = follower(); if (!k || !houseOn) { return; }
      var st = houseBox.querySelector(".hg-stage"); if (!st) { return; }
      var r = st.getBoundingClientRect(), rr = root.getBoundingClientRect();
      housePet = charEl("pet_" + k + "_sit", "pet_" + k + "_blink", "cw-housepet");
      housePet.style.left = (r.left - rr.left + r.width * 0.06) + "px"; housePet.style.top = (r.bottom - rr.top - 100) + "px";
      housePet.setAttribute("role", "button"); housePet.setAttribute("aria-label", "My " + PET_NAME[k]);
      housePet.addEventListener("click", function () { petCuddle(housePet, k); });
      root.appendChild(housePet);
    }

    /* ---------- moving between places ---------- */
    function go(p) {
      if (closed) { return; }
      if (place === "house" && p !== "house") { leaveHouse(); }
      place = p;
      root.querySelectorAll(".cw-place").forEach(function (e) { e.classList.remove("on"); });
      mapBtn.hidden = p === "map"; bellBtn.hidden = p !== "cafe";
      if (p === "map") { mapEl.classList.add("on"); drawMapPet(); layoutMap(); return; }
      if (p === "house") { houseEl.classList.add("on"); enterHouse(); return; }
      var S = scenes[p]; S.el.classList.add("on");
      drawItems(S); drawPads(S); layout(S);
      if (p === "garden") { drawPlots(); followPetIn(S, (S.narrow ? NARROW : WIDE).garden.pet, 880); }
      if (p === "cafe") { followPetIn(S, (S.narrow ? NARROW : WIDE).cafe.pet, 880); }
      if (p === "pets") { drawPets(); }
    }
    function layoutMap() {
      var r = root.getBoundingClientRect();
      mapEl.classList.toggle("tall", r.height > r.width * 1.1);
    }

    /* ---------- the plans card ---------- */
    function openPlans() {
      var v = el("div", "cw-veil"), card = el("div", "cw-card");
      var h = "";
      D.plans.goals.forEach(function (g, i) {
        var d = goalDef(g.id), n = progress(g), icon = d.icon === "paint" ? "<div class=\"sw\" style='background:" + PATTERN.pink_dots + " 0 0/36px auto;border-radius:16px;border:3px solid #563832'></div>" : '<img alt="" src="' + img(d.icon) + '">';
        var dots = ""; for (var k = 0; k < d.n; k++) { dots += '<i class="' + (k < n ? "on" : "") + '"></i>'; }
        h += '<button type="button" class="cw-goal' + (g.done ? " done" : "") + '" data-goal="' + g.id + '" aria-label="' + d.say + (g.done ? " Done." : "") + '">' + icon + '<span class="dots">' + (d.n > 1 ? dots : "") + '</span><span class="box"></span></button>';
      });
      h += '<div class="cw-book" aria-label="My stickers">' + D.plans.stickers.map(function (s) { return '<img alt="" src="' + img("sticker_" + s) + '">'; }).join("") + "</div>";
      card.innerHTML = '<button type="button" class="cw-close" aria-label="Close"></button><div style="height:56px"></div>' + h;
      v.appendChild(card); root.appendChild(v);
      card.querySelector(".cw-close").addEventListener("click", function () { SND.pop(); v.remove(); });
      v.addEventListener("click", function (e) { if (e.target === v) { v.remove(); } });
      card.querySelectorAll(".cw-goal").forEach(function (b) { b.addEventListener("click", function () { var d = goalDef(b.dataset.goal); SND.pop(); say(d.say); }); });
      say("My plans.");
    }

    /* ---------- dragging: tray pads into a scene, scene things around, things back to the tray ---------- */
    var drag = null;
    function worldAt(S, cx, cy) { var r = S.box.getBoundingClientRect(); return { x: (cx - r.left) / S.s, y: (cy - r.top) / S.s }; }
    function inRect(r, x, y) { return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom; }
    root.addEventListener("pointerdown", function (e) {
      var t = e.target.closest("[data-drag]"); if (!t || !root.contains(t)) { return; }
      var S = scenes[place];
      drag = { el: t, kind: t.dataset.drag, x0: e.clientX, y0: e.clientY, moved: false, S: S, pid: e.pointerId };
      if (drag.kind === "item" && S) { var it = findItem(S, +t.dataset.u), w = worldAt(S, e.clientX, e.clientY); drag.t = it; drag.dx = it ? it.x - w.x : 0; drag.dy = it ? it.y - w.y : 0; }
      if (drag.kind === "pet" && S) { var p = D.pets.filter(function (q) { return q.kind === t.dataset.pet; })[0], w2 = worldAt(S, e.clientX, e.clientY); drag.p = p; drag.dx = p.x - w2.x; drag.dy = p.y - w2.y; }
    });
    root.addEventListener("pointermove", function (e) {
      if (!drag || e.pointerId !== drag.pid) { return; }
      var dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;
      if (!drag.moved) {
        if (drag.kind === "pad") { if (!(dy < -12 && Math.abs(dy) > Math.abs(dx))) { return; } if (!drag.el._pad.drop) { return; } }
        else if (Math.hypot(dx, dy) < 9) { return; }
        drag.moved = true;
        try { drag.el.setPointerCapture(e.pointerId); } catch (er) {}
        if (drag.kind === "pad" || drag.kind === "can") {
          drag.ghost = el("div", "cw-ghost", drag.kind === "can" ? '<img alt="" src="' + img("watering_can") + '">' : drag.el.innerHTML.replace(/<span class="cw-price">.*?<\/span>/, ""));
          root.appendChild(drag.ghost);
        } else { drag.el.classList.add("drag"); }
      }
      e.preventDefault();
      var S = drag.S;
      if (drag.ghost) { drag.ghost.style.left = e.clientX + "px"; drag.ghost.style.top = e.clientY + "px"; return; }
      var w = worldAt(S, e.clientX, e.clientY);
      if (drag.kind === "item" && drag.t) {
        var def = itemDef(S.name, drag.t.id), cl = clampItem(S, def, w.x + drag.dx, w.y + drag.dy);
        drag.t.x = cl.x; drag.t.y = cl.y; drawItem(S, drag.t);
        drag.el.style.zIndex = 5000;
        S.tray.classList.toggle("cw-trayhint", inRect(S.tray.getBoundingClientRect(), e.clientX, e.clientY));
      } else if (drag.kind === "pet" && drag.p) {
        drag.p.x = Math.round(clamp(w.x + drag.dx, 120, 1480)); drag.p.y = Math.round(clamp(w.y + drag.dy, 700, 880));
        put(drag.el, drag.p.x, drag.p.y, 190, 190 * aspect("pet"), "foot", 5000);
      }
    }, { passive: false });
    function endDrag(e, cancel) {
      if (!drag || (e && e.pointerId !== drag.pid)) { return; }
      var d = drag, S = d.S; drag = null;
      if (cancel && !d.moved) { return; }
      if (!d.moved) {   // a tap
        if (d.kind === "pad") { d.el._pad.tap(d.el); }
        else if (d.kind === "item" && d.t) { tapItem(S, d.t, d.el); }
        else if (d.kind === "pet") { D.petWith = d.el.dataset.pet; save(); petCuddle(d.el, d.el.dataset.pet); drawPads(S); drawMapPet(); }
        else if (d.kind === "can") { tool = null; SND.pop(); say("Tap a plant to water it."); anim(d.el, "cw-bounce"); }
        return;
      }
      if (d.ghost) {
        d.ghost.remove();
        if (cancel || !S) { return; }
        var br = S.sc.getBoundingClientRect();
        if (d.kind === "can") { var i = plotAt(e.clientX, e.clientY); if (i >= 0) { water(i); } return; }
        if (inRect(br, e.clientX, e.clientY) && d.el._pad.drop) {
          var w = worldAt(S, e.clientX, e.clientY);
          d.el._pad.drop(w.x, w.y, e.clientX, e.clientY);
        }
        return;
      }
      d.el.classList.remove("drag");
      if (d.kind === "item" && d.t) {
        S.tray.classList.remove("cw-trayhint");
        if (e && inRect(S.tray.getBoundingClientRect(), e.clientX, e.clientY)) {   // put it away
          D.places[S.name].items = D.places[S.name].items.filter(function (x) { return x !== d.t; });
          d.el.remove(); SND.swish(); save(); return;
        }
        drawItem(S, d.t); SND.plop(); save();
      } else if (d.kind === "pet" && d.p) { put(d.el, d.p.x, d.p.y, 190, 190 * aspect("pet"), "foot", 10 + d.p.y); D.petWith = d.p.kind; save(); SND.plop(); }
    }
    root.addEventListener("pointerup", function (e) { endDrag(e, false); });
    root.addEventListener("pointercancel", function (e) { endDrag(e, true); });
    root.addEventListener("keydown", function (e) {
      if ((e.key === "Enter" || e.key === " ") && e.target.classList && e.target.classList.contains("cw-pad")) { e.preventDefault(); e.target._pad.tap(e.target); }
    });
    function tapItem(S, t, e) {
      var def = itemDef(S.name, t.id);
      if (def.lamp) { t.off = t.off === 1 ? 0 : 1; drawItem(S, t); save(); SND.tone(t.off ? [660] : [880], 0.08); return; }
      if (def.sway) { anim(e, "cw-sway"); SND.swish(); return; }
      anim(e, "cw-bounce"); SND.plop();
    }

    /* ---------- start ---------- */
    fillGoals(); drawPlansDot();
    go("map");
    var onResize = function () { if (place === "map") { layoutMap(); } else if (scenes[place]) { layout(scenes[place]); } else if (place === "house") { later(drawHousePet, 300); } };
    window.addEventListener("resize", onResize);
    say("Welcome to Kitty Café World!");

    function close() {
      if (closed) { return; }
      leaveHouse();
      closed = true;
      timers.forEach(clearTimeout); clearInterval(blinkTimer);
      window.removeEventListener("resize", onResize);
      if (window.__cafeWorld && window.__cafeWorld.root === root) { delete window.__cafeWorld; }
      save();
    }
    wctx.onEnd(close);
    window.__cafeWorld = { root: root, data: D, go: go, place: function () { return place; }, layout: function () { onResize(); }, house: function () { return houseOn; } };
    return { close: close };
  } });
})();
