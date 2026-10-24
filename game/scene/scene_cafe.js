/* scene_cafe.js - Marie's question scene: Mimi behind the cafe counter acts out each question once, then rests.
   A friend (Bella, Lulu, Momo or Puff) comes to the right end of the counter when the story needs one.
   Pictures: Mimi and her friends are the game's own (rewards/art/cafe, world/art/cafe); the new poses and things are
   drawn by tools/draw_cafe_scene_art.py in the same style (game/scene/art/cafe).
   Rules (from the father, 22 Oct 2026): show the things of the question, never the answer, never a running count;
   amounts over 20 are boxes of ten (and trays of a hundred) and single ones; calm, no flashing, no looping motion
   except soft breathing and blinking; reduced motion = still pictures and short fades. See scene_core.js for Q.scene. */
(function () {
  "use strict";
  if (!window.QuestScene) return;
  const R = "rewards/art/cafe/", WA = "world/art/cafe/";
  const FRIENDS = ["bella", "lulu", "momo", "puff"];
  // noun -> [picture, width / height]
  const SPR = {
    cupcake: [WA + "treat_cupcake", 1], cookie: [WA + "treat_cookie", 1], cup: [R + "cup_pink", 440 / 420], saucer: ["item_saucer", 1],
    coin: ["item_coin", 1], tray: ["hold_tray", 320 / 90], muffin: ["item_muffin", 1], scoop: ["item_scoop", 1], chair: [WA + "cafe_chair_pink", 220 / 320],
    tea_bag: ["item_tea_bag", 1], oven: ["item_oven", 1], cake_box: ["item_cake_box", 1], sign: ["item_sign", 1], biscuit: ["item_biscuit", 1],
    flower: ["item_flower", 1], roll: ["item_roll", 1], candy: ["item_candy", 1], lemon: ["item_lemon", 1], sticker: [WA + "sticker_star", 1],
    grape: ["item_grape", 1], strawberry: [R + "topping_strawberry", 1], napkin: ["item_napkin", 1], slice: [WA + "treat_cake", 1], piece: ["item_piece", 1],
    chocolate: ["item_chocolate", 1], cake: [WA + "treat_cake", 1], tea: [R + "cup_mint", 440 / 420], pie: ["item_pie", 1], sandwich: ["item_sandwich", 1],
    cocoa: [WA + "treat_cocoa", 1], toonie: ["item_toonie", 1], loonie: ["item_loonie", 1], dime: ["item_dime", 1], nickel: ["item_nickel", 1],
    bill_5: ["item_bill_5", 2], bill_10: ["item_bill_10", 2], bill_20: ["item_bill_20", 2], bill_50: ["item_bill_50", 2], bill_100: ["item_bill_100", 2]
  };
  // the colour of a thing when it is drawn as a dot in a box of ten or a tray of a hundred
  const DOT = { cupcake: "#f490ab", cookie: "#c48e52", cup: "#f08aa6", customer: "#b99ae0", saucer: "#e9a2b6", coin: "#e3ad25", tray: "#bf8d5c",
    muffin: "#8a5a3a", scoop: "#b7bec8", tea_bag: "#d8bd88", strawberry: "#e2475f", napkin: "#7cc9ae", lemon: "#e6c240", roll: "#cf9452",
    chocolate: "#6a4430", grape: "#8d6cc4", biscuit: "#d9a95e", candy: "#f490ab", flower: "#f49ab3", slice: "#f9bccd", piece: "#f2c27e", sticker: "#f6c945", chair: "#f490ab" };
  // holder -> [picture, width / height, how the things sit: "under" (on top of it) or "in" (in front of it)]
  const HOLD = { tray: ["hold_tray", 320 / 90, "under"], plate: ["hold_plate", 3, "under"], table: ["hold_table", 1.5, "under", 0.16], cake: ["hold_cake", 2, "under", 0.16],
    vase: ["hold_vase", 140 / 176, "vase"], box: ["hold_box", 240 / 140, "in"], bag: ["hold_bag", 140 / 176, "in"], jar: ["hold_jar", 140 / 176, "in"],
    jug: ["hold_jug", 160 / 176, "in"], basket: ["hold_basket", 280 / 126, "in"], pile: ["hold_plate", 3, "under"], roll: ["hold_plate", 3, "under"],
    row: null, customer: "friend", child: "friend", friend: "friend" };
  const MIMI = { stand: R + "mimi_stand", smile: R + "mimi_smile", wave: R + "mimi_wave", blink: WA + "mimi_blink",
    point: "mimi_point", carry: "mimi_carry", count: "mimi_count", tilt: "mimi_tilt", cheer: "mimi_cheer" };
  const friendArt = (name, pose) => R + `friend_${name}_${pose}`;
  const cache = {};
  function preload(ctx, names) { names.forEach(n => { const u = ctx.art(n); if (!cache[u]) { const im = new Image(); im.src = u; cache[u] = im; } }); }

  const h = (tag, cls, attrs) => { const e = document.createElement(tag); if (cls) e.className = cls; if (attrs) Object.assign(e, attrs); return e; };
  const hash = s => { let x = 7; for (const c of String(s)) x = (x * 31 + c.charCodeAt(0)) >>> 0; return x; };

  /* ---------- building blocks ---------- */
  // one thing (an icon); k = size in units
  function thing(ctx, noun, k = 1, i = 0) {
    if (noun === "customer") { const im = h("img", "qs-o", { src: ctx.art(friendArt(FRIENDS[i % 4], "stand")), alt: "" }); im.style.cssText = `height:calc(var(--u)*${k * 1.25});width:calc(var(--u)*${k * 1.25 * 0.77})`; return im; }
    const [src, asp] = SPR[noun] || SPR.cupcake;
    const im = h("img", "qs-o", { src: ctx.art(src), alt: "" });
    im.style.cssText = `height:calc(var(--u)*${k});width:calc(var(--u)*${k * asp})`;
    return im;
  }
  // n things as icons in 1 or 2 rows (like a ten frame)
  function icons(ctx, noun, n, k = 1, rows) {
    const g = h("div", "qs-grid");
    const r = rows || (n <= 6 ? 1 : 2), cols = Math.max(1, Math.ceil(n / r));
    g.style.gridTemplateColumns = `repeat(${cols}, auto)`;
    for (let i = 0; i < n; i++) g.appendChild(thing(ctx, noun, k, i));
    return g;
  }
  // big amounts: trays of a hundred (10 x 10 dots), boxes of ten (10 dots) and single ones; always true to the number
  function place(ctx, noun, n) {
    const g = h("div", "qs-place"), col = DOT[noun] || "#f490ab";
    g.style.setProperty("--dot", col);
    const H = Math.floor(n / 100), T = Math.floor(n / 10) % 10, O = n % 10;
    if (H) { const b = h("div", "qs-hs"); b.style.gridTemplateRows = `repeat(${H > 3 ? 2 : 1}, auto)`; for (let i = 0; i < H; i++) b.appendChild(h("i", "qs-h")); g.appendChild(b); }
    if (T) { const b = h("div", "qs-ts"); for (let i = 0; i < T; i++) b.appendChild(h("i", "qs-t")); g.appendChild(b); }
    if (O) g.appendChild(icons(ctx, noun === "customer" ? "cupcake" : noun, O, 1.05, O > 5 ? 2 : 1)).classList.add("qs-ones");
    if (noun === "customer" && O) g.lastChild.querySelectorAll(".qs-o").forEach((x, i) => x.replaceWith(thing(ctx, "customer", 1.05, i)));
    return g;
  }
  const amount = (ctx, noun, n, k = 1) => n > 20 ? place(ctx, noun, n) : icons(ctx, noun, n, k);
  // a group on the counter: things, maybe on or in a holder; role and count are kept for the tests
  function group(ctx, inner, holder, role, count) {
    const g = h("div", "qs-g qs-wait");
    if (role) g.dataset.role = role;
    if (count != null) g.dataset.count = count;
    const H = holder && HOLD[holder];
    if (H === "friend") {
      const f = h("img", "qs-hf", { src: ctx.art(friendArt(FRIENDS[(hash(role) + (count || 0)) % 4], "stand")), alt: "" });
      g.classList.add("qs-by");
      const col = h("div", "qs-col"); col.appendChild(inner); col.appendChild(holderImg(ctx, HOLD.plate));
      g.appendChild(f); g.appendChild(col);
    } else if (H && H[2] === "in") {
      g.classList.add("qs-in"); const w = h("div", "qs-inbox"); w.appendChild(holderImg(ctx, H)); w.appendChild(inner); g.appendChild(w);
    } else if (H && H[2] === "vase") {        // flowers stand in the vase: the vase sits over their stems
      g.classList.add("qs-vase"); g.appendChild(inner); g.appendChild(holderImg(ctx, H));
    } else if (H) {
      g.classList.add("qs-on"); g.appendChild(inner); const hi = holderImg(ctx, H); g.appendChild(hi);
      if (H[3]) { hi.style.marginTop = `calc(var(--u) * -${H[3] * 2.4})`; hi.style.position = "relative"; hi.style.zIndex = -1; }   // things stand on the table top
    } else g.appendChild(inner);
    return g;
  }
  // trays and plates stretch to the things on them but stay flat; the other holders keep their shape
  function holderImg(ctx, H) { const im = h("img", "qs-hold" + (H[1] >= 2.9 ? " qs-flat" : ""), { src: ctx.art(H[0]), alt: "" }); im.style.aspectRatio = String(H[1]); return im; }
  function emptyHolder(ctx, holder, role) {     // a holder with nothing in it yet (sharing: the plates wait)
    const H = HOLD[holder];
    if (H === "friend") { const g = h("div", "qs-g qs-wait"); g.dataset.role = role; const f = h("img", "qs-o qs-wait-friend", { src: ctx.art(friendArt(FRIENDS[hash(role) % 4], "stand")), alt: "" }); f.style.cssText = "height:calc(var(--u)*2);width:calc(var(--u)*1.54)"; g.appendChild(f); return g; }
    const g = h("div", "qs-g qs-wait qs-empty"); g.dataset.role = role;
    const HH = H || HOLD.plate, im = holderImg(ctx, HH), tall = HH[2] === "in" ? 1.3 : Math.max(0.6, Math.min(1.1, 2.4 / HH[1]));
    im.style.height = `calc(var(--u)*${tall})`; im.style.width = `calc(var(--u)*${tall * HH[1]})`;
    g.appendChild(im); return g;
  }

  /* ---------- the scene frame: wall, Mimi, counter, friend, things ---------- */
  function frame(root, ctx, act) {
    root.innerHTML = "";
    root.classList.toggle("qs-fast", ctx.fast); root.classList.toggle("qs-reduced", ctx.reduced);
    const wall = h("div", "qs-wall"); wall.style.backgroundImage = `url("${ctx.art("wall_tile")}")`;
    const counter = h("div", "qs-counter"); counter.style.backgroundImage = `url("${ctx.art("counter_tile")}")`;
    const inner = h("div", "qs-inner");
    const mimi = h("img", "qs-mimi", { src: ctx.art(MIMI.stand), alt: "" });
    const friend = h("img", "qs-friend qs-away", { src: ctx.art(friendArt("bella", "stand")), alt: "" });
    const back = h("div", "qs-back"), stage = h("div", "qs-stage"), fx = h("div", "qs-fx");
    inner.append(back, mimi, friend, stage, fx);
    root.append(wall, inner, counter);
    const S = { root, ctx, act, inner, mimi, friend, stage, back, fx, pose: "stand", friendName: null, useFriend: false };
    root._qs = S;
    return S;
  }
  function pose(S, p) { S.pose = p; S.mimi.src = S.ctx.art(MIMI[p] || MIMI.stand); }
  function friendCome(S, name, p = "stand") {
    S.friendName = name; S.friend.src = S.ctx.art(friendArt(name, S.ctx.fast || S.ctx.reduced || !S.ctx.live() ? p : "walk"));
    S.friend.classList.remove("qs-away");
    if (!S.ctx.fast && !S.ctx.reduced) S.ctx.wait(800, () => { S.friend.src = S.ctx.art(friendArt(name, p)); });
  }
  function friendPose(S, p) { if (S.friendName && !S.friend.classList.contains("qs-away")) S.friend.src = S.ctx.art(friendArt(S.friendName, p)); }
  function reveal(S, el, from = "l") {
    if (!el) return;
    el.classList.add("qs-from-" + from); el.classList.remove("qs-wait");
    void el.offsetWidth;
    el.classList.remove("qs-from-" + from);
  }
  // fit: the biggest unit size at which every group fits the stage (all groups are laid out from the start, hidden ones too)
  function fit(S) {
    const st = S.stage, H = S.root.clientHeight || 120;
    S.root.style.setProperty("--H", H + "px");
    S.inner.style.setProperty("--right", S.useFriend ? `calc(var(--H) * .6)` : `calc(var(--H) * .12)`);
    const box = st.getBoundingClientRect();
    if (!box.width || !box.height) return;
    const fits = u => {
      st.style.setProperty("--u", u + "px");
      let l = Infinity, r = -Infinity, t = Infinity, btm = -Infinity;
      for (const c of st.children) { const b = c.getBoundingClientRect(); l = Math.min(l, b.left); r = Math.max(r, b.right); t = Math.min(t, b.top); btm = Math.max(btm, b.bottom); }
      return l >= box.left - 0.5 && r <= box.right + 0.5 && t >= box.top - 0.5 && btm <= box.bottom + 0.5;
    };
    let lo = 3, hi = Math.max(8, H * 0.48);
    if (fits(hi)) return;
    for (let i = 0; i < 12; i++) { const m = (lo + hi) / 2; if (fits(m)) lo = m; else hi = m; }
    st.style.setProperty("--u", lo + "px");
  }
  const add = (S, ...els) => els.forEach(e => e && S.stage.appendChild(e));

  /* ---------- the acts ---------- */
  const friendFor = Q => FRIENDS[hash(Q.key || Q.tpl) % 4];
  const ACTS = {
    add(S, Q, sc) {
      const byFriend = sc.who === "friend" || hash(Q.key) % 2 === 0 || sc.noun === "customer";
      S.useFriend = byFriend;
      const A = group(S.ctx, amount(S.ctx, sc.noun, sc.a), sc.noun === "customer" ? null : "tray", "a", sc.a);
      const B = group(S.ctx, amount(S.ctx, sc.noun2 || sc.noun, sc.b), sc.noun === "customer" ? null : (byFriend ? "plate" : "tray"), "b", sc.b);
      add(S, A, B); fit(S);
      return [
        [200, () => { pose(S, "carry"); reveal(S, A, "l"); }],
        [900, () => pose(S, "stand")],
        [300, () => { if (byFriend) friendCome(S, friendFor(Q)); else pose(S, "carry"); }],
        [byFriend ? 700 : 300, () => reveal(S, B, byFriend ? "r" : "l")],
        [900, () => pose(S, "stand")]
      ];
    },
    sub(S, Q, sc) {
      S.useFriend = true;
      const big = sc.a > 20;
      const A = group(S.ctx, amount(S.ctx, sc.noun, sc.a), sc.noun === "customer" ? null : "tray", "a", sc.a);
      const T = group(S.ctx, amount(S.ctx, sc.noun, sc.b), sc.noun === "customer" ? null : "plate", "b", sc.b);
      add(S, A, T); fit(S);
      return [
        [200, () => { pose(S, "carry"); reveal(S, A, "l"); }],
        [900, () => pose(S, "stand")],
        [300, () => friendCome(S, friendFor(Q))],
        [900, () => {
          // the friend takes b: those leave Mimi's tray and show by the friend (big amounts: Mimi's tray softens)
          if (big) A.classList.add("qs-soft");
          else [...A.querySelectorAll(".qs-o")].slice(0, sc.b).forEach(o => o.classList.add("qs-gone"));   // from the back row, so the rest still sit on the tray
          reveal(S, T, "l");
        }]
      ];
    },
    need(S, Q, sc) {
      S.useFriend = true;
      const A = group(S.ctx, amount(S.ctx, sc.noun, sc.a), sc.noun === "customer" || sc.noun === "chair" ? null : "tray", "a", sc.a);
      add(S, A); fit(S);
      return [[200, () => { pose(S, "carry"); reveal(S, A, "l"); }], [900, () => pose(S, "stand")], [300, () => friendCome(S, friendFor(Q))]];
    },
    left(S, Q, sc) {
      S.useFriend = true;
      const wrap = h("div", "qs-g qs-stack");
      const A = group(S.ctx, amount(S.ctx, sc.noun, sc.a), sc.noun === "customer" ? null : "tray", "a", sc.a);
      const L = group(S.ctx, amount(S.ctx, sc.noun, sc.left), sc.noun === "customer" ? null : "tray", "left", sc.left);
      wrap.append(A, L);
      const bag = emptyHolder(S.ctx, "bag", "bag");    // what went is out of sight, in a bag
      add(S, wrap, bag); fit(S);
      return [
        [200, () => { pose(S, "carry"); reveal(S, A, "l"); }],
        [900, () => pose(S, "stand")],
        [300, () => friendCome(S, friendFor(Q))],
        [900, () => { A.classList.add("qs-out"); reveal(S, L, "d"); reveal(S, bag, "l"); }]
      ];
    },
    compare(S, Q, sc) {
      S.useFriend = true;
      const one = Math.max(sc.a, sc.b) <= 10;
      const A = group(S.ctx, sc.a > 20 ? place(S.ctx, sc.noun, sc.a) : icons(S.ctx, sc.noun, sc.a, 1, one ? 1 : 2), "tray", "a", sc.a);
      const B = group(S.ctx, sc.b > 20 ? place(S.ctx, sc.noun2 || sc.noun, sc.b) : icons(S.ctx, sc.noun2 || sc.noun, sc.b, 1, one ? 1 : 2), "tray", "b", sc.b);
      add(S, A, B); fit(S);
      return [[200, () => { pose(S, "carry"); reveal(S, A, "l"); }], [900, () => { pose(S, "stand"); friendCome(S, friendFor(Q)); }], [800, () => reveal(S, B, "r")]];
    },
    numeral(S, Q, sc) {
      const it = group(S.ctx, icons(S.ctx, sc.noun, 1, 1.9), null, "thing");
      const sign = h("div", "qs-g qs-wait qs-chalk"); sign.appendChild(thing(S.ctx, "sign", 1.9));
      const w = h("span", "qs-word"); w.textContent = sc.word || ""; sign.appendChild(w);
      add(S, ...(sc.noun === "sign" ? [sign] : [it, sign])); fit(S);
      return [[200, () => { reveal(S, it, "d"); reveal(S, sign, "d"); }], [500, () => pose(S, "point")], [1600, () => pose(S, "stand")]];
    },
    groups(S, Q, sc) {
      const gs = [];
      for (let i = 0; i < sc.n; i++) gs.push(group(S.ctx, icons(S.ctx, sc.noun, sc.per, 1, sc.per > 5 ? 2 : 1), sc.holder, "g" + i, sc.per));
      add(S, ...gs); fit(S);
      return [[200, () => pose(S, "carry")]].concat(gs.map(g => [S.ctx.reduced ? 120 : 340, () => reveal(S, g, "d")]), [[500, () => pose(S, "stand")]]);
    },
    share(S, Q, sc) {
      const pile = group(S.ctx, amount(S.ctx, sc.noun, sc.total), null, "total", sc.total);
      const waits = [];
      if (sc.mode === "each") for (let i = 0; i < sc.ways; i++) waits.push(emptyHolder(S.ctx, sc.holder, "w" + i));
      else waits.push(emptyHolder(S.ctx, sc.holder, "one"));      // one empty holder: how many are needed is the question
      add(S, pile, ...waits); fit(S);
      return [[200, () => { pose(S, "carry"); reveal(S, pile, "l"); }], [800, () => pose(S, "stand")]]
        .concat(waits.map(g => [S.ctx.reduced ? 100 : 260, () => reveal(S, g, "d")]));
    },
    place(S, Q, sc) {
      const boxes = [];
      // each ten stands up in its own box (2 across, 5 down), so nine of them fit a phone; the ones lie loose
      for (let i = 0; i < sc.tens; i++) boxes.push(group(S.ctx, icons(S.ctx, sc.noun, 10, 0.5, 5), sc.holder === "box" ? "box" : "tray", "ten" + i, 10));
      const ones = sc.ones ? group(S.ctx, icons(S.ctx, sc.noun, sc.ones, 0.62, sc.ones > 5 ? 2 : 1), null, "ones", sc.ones) : null;
      add(S, ...boxes, ones); fit(S);
      return [[200, () => pose(S, "carry")]].concat(boxes.map(g => [S.ctx.reduced ? 100 : 280, () => reveal(S, g, "d")]), [[300, () => { reveal(S, ones, "l"); pose(S, "stand"); }]]);
    },
    bundle(S, Q, sc) {
      // n loose things, not yet packed (no boxes are drawn full), and one empty box that holds 10
      const heap = h("div", "qs-heap"), cols = Math.ceil(Math.sqrt(sc.n * 2.2)), rows = Math.ceil(sc.n / cols);
      heap.style.gridTemplateColumns = `repeat(${cols}, auto)`;
      const order = [...Array(cols * rows).keys()].sort((x, y) => hash(x + Q.key) - hash(y + Q.key)).slice(0, sc.n).sort((x, y) => x - y);
      for (let c = 0; c < cols * rows; c++) {
        const o = thing(S.ctx, sc.noun, 0.55);
        if (!order.includes(c)) { o.classList.add("qs-blank"); o.classList.remove("qs-o"); }
        else o.style.transform = `translate(${(hash(c + "x" + Q.key) % 7) - 3}%, ${(hash(c + "y" + Q.key) % 9) - 4}%) rotate(${(hash(c + Q.key) % 30) - 15}deg)`;
        heap.appendChild(o);
      }
      const pile = group(S.ctx, heap, "basket", "n", sc.n);
      const box = h("div", "qs-g qs-wait qs-tenbox"); box.dataset.role = "box";
      const slots = h("div", "qs-slots"); for (let i = 0; i < 10; i++) slots.appendChild(h("i"));
      box.appendChild(slots);
      add(S, pile, box); fit(S);
      return [[200, () => { pose(S, "carry"); reveal(S, pile, "l"); }], [800, () => { pose(S, "stand"); reveal(S, box, "d"); }]];
    },
    money(S, Q, sc) {
      S.useFriend = sc.who === "customer";
      const SIZE = { toonie: 1, loonie: 0.95, dime: 0.72, nickel: 0.84 };
      const gs = sc.coins.filter(([, c]) => c > 0).map(([k, c]) => group(S.ctx, icons(S.ctx, k, c, SIZE[k], c > 5 ? 2 : 1), null, k, c));
      add(S, ...gs); fit(S);
      const steps = [[200, () => { if (S.useFriend) friendCome(S, friendFor(Q)); }]];
      gs.forEach(g => steps.push([S.useFriend ? 700 : 300, () => reveal(S, g, S.useFriend ? "r" : "d")]));
      return steps.concat([[400, () => pose(S, "point")], [1400, () => pose(S, "stand")]]);
    },
    change(S, Q, sc) {
      S.useFriend = true;
      const it = group(S.ctx, icons(S.ctx, sc.noun, 1, 1.25), "plate", "thing");
      const tag = h("span", "qs-tag"); tag.textContent = "$" + sc.price; it.appendChild(tag);
      const bill = group(S.ctx, icons(S.ctx, "bill_" + sc.paid, 1, 0.9), null, "paid");
      add(S, it, bill); fit(S);
      return [[200, () => reveal(S, it, "d")], [500, () => friendCome(S, friendFor(Q))], [900, () => reveal(S, bill, "r")], [400, () => pose(S, "point")], [1400, () => pose(S, "stand")]];
    },
    time(S, Q, sc) {
      const c = h("div", "qs-g qs-wait qs-clock"); c.dataset.role = "clock";
      const im = h("img", "", { src: S.ctx.art("clock_face"), alt: "" });
      const ang = hr => (hr % 12) * 30;
      c.innerHTML = "";
      c.appendChild(im);
      c.insertAdjacentHTML("beforeend", `<svg viewBox="0 0 240 240" aria-hidden="true"><g class="qs-hr" style="transform:rotate(${ang(sc.from)}deg)"><path d="M120 130 L120 84" stroke="#563832" stroke-width="10" stroke-linecap="round"/></g>
        <g><path d="M120 130 L120 66" stroke="#563832" stroke-width="7" stroke-linecap="round"/></g><circle cx="120" cy="130" r="8" fill="#f2647a" stroke="#563832" stroke-width="3"/></svg>`);
      c.dataset.hour = sc.from;
      add(S, c); fit(S);
      const steps = [[200, () => reveal(S, c, "d")], [500, () => pose(S, "point")]];
      if (sc.dir === "span") steps.push([1300, () => { c.querySelector(".qs-hr").style.transform = `rotate(${ang(sc.to) + (sc.to % 12 < sc.from % 12 ? 360 : 0)}deg)`; c.dataset.hour = sc.to; }]);
      return steps.concat([[1600, () => pose(S, "stand")]]);
    },
    fraction(S, Q, sc) {
      const whole = h("div", "qs-g qs-wait qs-whole"); whole.dataset.role = "whole"; whole.dataset.parts = sc.parts;
      whole.appendChild(h("img", "", { src: S.ctx.art(sc.holder === "pie" ? "pie_top" : "cake_top"), alt: "" }));
      const cuts = sc.parts === 2 ? "M150 22 L150 278" : "M150 22 L150 278 M22 150 L278 150";
      whole.insertAdjacentHTML("beforeend", `<svg viewBox="0 0 300 300" aria-hidden="true"><path d="${cuts}" stroke="#563832" stroke-width="11" stroke-linecap="round"/><path d="${cuts}" stroke="#fffaf4" stroke-width="5" stroke-linecap="round"/></svg>`);
      const items = sc.noun === "slice" || sc.noun === "piece" ? null : group(S.ctx, amount(S.ctx, sc.noun, sc.n), "tray", "n", sc.n);
      if (!items) whole.dataset.count = sc.n;
      const slices = items ? null : group(S.ctx, amount(S.ctx, sc.noun, sc.n, 0.8), null, "n", sc.n);
      add(S, whole, items || slices); fit(S);
      return [[200, () => reveal(S, whole, "d")], [600, () => { pose(S, "carry"); reveal(S, items || slices, "l"); }], [900, () => pose(S, "stand")]];
    }
  };
  // counting by tapping (Marie, 22 Oct 2026): Mimi shows ONE of the things and looks at it with her. The amount is never drawn here: the tray below the story is hers to count.
  ACTS.tap_count = (S, Q, sc) => {
    const it = group(S.ctx, icons(S.ctx, sc.noun, 1, 1.9), null, "thing"); add(S, it); fit(S);
    return [[200, () => reveal(S, it, "d")], [500, () => pose(S, "count")], [1600, () => pose(S, "stand")]];
  };
  // bills and coins (round of 23 Oct 2026): the things she adds up or pays with, drawn true to the story. coins = [[picture name, how many], ...]
  ACTS.bills = (S, Q, sc) => {
    S.useFriend = sc.who === "customer" || sc.who === "friend";
    const SIZE = { bill_5: 0.95, bill_10: 0.95, bill_20: 0.95, bill_50: 0.95, bill_100: 0.95, toonie: 1, loonie: 0.95 };
    const gs = sc.coins.filter(([, c]) => c > 0).map(([k, c]) => group(S.ctx, icons(S.ctx, k, c, SIZE[k], c > 4 ? 2 : 1), null, k, c));
    add(S, ...gs); fit(S);
    const steps = [[200, () => { if (S.useFriend) friendCome(S, friendFor(Q)); }]];
    gs.forEach(g => steps.push([S.useFriend ? 700 : 300, () => reveal(S, g, S.useFriend ? "r" : "d")]));
    return steps.concat([[400, () => pose(S, "point")], [1400, () => pose(S, "stand")]]);
  };
  // a row of holders (jars, trays, tables ...) each with a few of the same thing, for questions about numbers that are too big to draw (comparing, ordering,
  // even and odd, estimating, prices). It shows the holders and nothing about how many: n holders, empty (nothing in them to count).
  ACTS.lineup = (S, Q, sc) => {
    const gs = [];
    // the holders stand empty: any pile drawn in them could equal, or hint at, the answer (3 coins when the answer is 3)
    for (let i = 0; i < sc.n; i++) gs.push(emptyHolder(S.ctx, sc.holder || "tray", "h" + i));
    add(S, ...gs); fit(S);
    return [[200, () => pose(S, "carry")]].concat(gs.map(g => [S.ctx.reduced ? 120 : 340, () => reveal(S, g, "d")]), [[500, () => pose(S, "stand")]]);
  };
  // castle acts, if a cafe question ever carries one: show the things plainly
  ACTS.count = (S, Q, sc) => { const g = group(S.ctx, icons(S.ctx, "cupcake", sc.seq[2]), "tray", "a", sc.seq[2]); add(S, g); fit(S); return [[200, () => reveal(S, g, "l")]]; };
  ACTS.more_less = (S, Q, sc) => ACTS.need(S, Q, { noun: "cupcake", a: sc.a });
  ACTS.make10 = (S, Q, sc) => ACTS.need(S, Q, { noun: "cupcake", a: sc.a });

  function run(S, steps) {
    let t = 0;
    S.steps = steps.map(([ms, fn]) => ({ fn, done: false }));
    S.steps.forEach((st, i) => { t += S.ctx.reduced ? Math.min(steps[i][0], 250) : steps[i][0]; S.ctx.wait(t, () => { st.done = true; st.fn(); }); });
    S.ctx.wait(t + 200, () => idle(S, S.ctx));
  }
  // the opening action ends at once (a reaction came first): stop its timers and play the rest of it straight away
  function finish(S) {
    if (!S.steps || S.finished) return;
    S.finished = true; S.ctx._stop();
    S.root.classList.add("qs-fast");
    S.steps.forEach(st => { if (!st.done) { st.done = true; st.fn(); } });
    void S.root.offsetWidth; S.root.classList.toggle("qs-fast", S.ctx.fast);
  }
  // idle: blink now and then while Mimi stands (the breathing is CSS); none in the tests
  function idle(S, ctx) {
    if (ctx.fast || ctx.reduced) return;
    const loop = () => ctx.wait(3500 + Math.random() * 2500, () => {
      if (S.pose === "stand") { S.mimi.src = ctx.art(MIMI.blink); ctx.wait(150, () => { if (S.pose === "stand") S.mimi.src = ctx.art(MIMI.stand); }); }
      loop();
    });
    loop();
  }

  const impl = {
    show(root, Q, ctx) {
      preload(ctx, Object.values(MIMI).concat(FRIENDS.flatMap(f => ["stand", "walk", "cheer"].map(p => friendArt(f, p))), [R + "heart"]));
      const sc = Q.scene, S = frame(root, ctx, sc.act);
      const actFn = ACTS[sc.act] || ACTS.need;
      S.stage.classList.toggle("qs-rows", ["groups", "share", "bundle", "lineup"].includes(sc.act));   // many holders may stand in two rows
      const steps = actFn(S, Q, sc);
      S.inner.style.setProperty("--right", S.useFriend ? "calc(var(--H) * .6)" : "calc(var(--H) * .12)");
      if (S.useFriend) S.friend.src = ctx.art(friendArt(friendFor(Q), "stand"));
      fit(S);
      run(S, steps);
    },
    layout(root) { if (root._qs) fit(root._qs); },
    react(root, kind, rctx) {
      const S = root._qs; if (!S) return;
      finish(S);
      const back = (ms, p) => { if (!rctx.fast) rctx.wait(ms, () => { pose(S, p); friendPose(S, "stand"); idle(S, rctx); }); };   // the tests hold the pose
      if (kind === "right") {
        pose(S, "cheer"); friendPose(S, "cheer");
        hearts(S, rctx);
        back(2400, "smile");
      } else if (kind === "wrong") {
        pose(S, "tilt"); back(2600, "stand");
      } else if (kind === "lesson" || kind === "hint") {
        pose(S, "point");
        if (kind === "lesson") countAlong(S, rctx);
        back(kind === "lesson" ? 6000 : 3000, "stand");
      } else if (kind === "end") {
        pose(S, "wave"); friendPose(S, "wave");
      }
    },
    dispose(root) { root.innerHTML = ""; delete root._qs; root.classList.remove("qs-fast", "qs-reduced"); }
  };
  function hearts(S, rctx) {
    const at = [S.mimi, S.friend.classList.contains("qs-away") ? null : S.friend].filter(Boolean);
    const box = S.inner.getBoundingClientRect();
    at.forEach((who, i) => {
      const b = who.getBoundingClientRect(), x = b.left + b.width * 0.5 - box.left;
      const im = h("img", "qs-heart", { src: rctx.art(R + "heart"), alt: "" });
      im.style.left = x + "px"; im.style.animationDelay = (i * 0.25) + "s";
      S.fx.appendChild(im);
      rctx.wait(2200, () => im.remove());
    });
  }
  // the lesson: Mimi points, and the things glow softly one by one (only small amounts; no numbers are shown)
  function countAlong(S, rctx) {
    const os = [...S.stage.querySelectorAll(".qs-o")].filter(o => !o.classList.contains("qs-gone") && !o.closest(".qs-out") && o.offsetParent);
    if (!os.length || os.length > 20 || rctx.reduced) return;
    os.forEach((o, i) => rctx.wait(500 + i * 450, () => o.classList.add("qs-lit")));
    rctx.wait(500 + os.length * 450 + 1200, () => os.forEach(o => o.classList.remove("qs-lit")));
  }
  QuestScene.register("cafe", impl);
})();
