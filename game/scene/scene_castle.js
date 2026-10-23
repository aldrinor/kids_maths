/* scene_castle.js - Kennedy's question scene: the knight stands on the path at the left and acts out each question once,
   then rests. The things of the question stand on the path to his right; a helper (the pony, the buddy knight, a villager,
   the pen fence, the bridge, the gate) stands at the right end when the story has one.
   Pictures: the knight, the pony, the goblin, the apple, the key, the cart, the gate, the flags, the pillow and the buddy
   knights are the game's own (rewards/art/castle, rewards/art/castle_extra, world/art/castle); the new poses, the sheep,
   the villagers, the backdrops and the small things are drawn by tools/draw_castle_scene_art.py in the same style
   (game/scene/art/castle). True sizes: every knight picture is 600 units tall and shows at the same height (--K);
   the goblin is 460 units, the pony 660, the sheep 460, the lamb 340, the villagers 600 (the child is drawn smaller in her box).
   Rules (from the father, 22 Oct 2026): show the things of the question, never the answer, never a running count and never a
   count label; amounts over 20 are boxes of ten (and trays of a hundred) and single ones; Kennedy is 5: calm, soft, nothing
   scary, nothing sad; idle = soft breathing and a slow sheep graze only; reduced motion = still pictures and short fades.
   See scene_core.js for the API and Q.scene. */
(function () {
  "use strict";
  if (!window.QuestScene) return;
  const RC = "rewards/art/castle/", RX = "rewards/art/castle_extra/", WC = "world/art/castle/";
  const VILLAGERS = ["villager_farmer", "villager_grandma", "villager_child"];
  const BUDDIES = ["buddy_leaf", "buddy_sun", "buddy_sea", "buddy_plum"];
  // noun -> [picture, width / height, height in units]. Characters are sized by their true units (knight 600 = 1.6 units).
  const CH = 1.6 / 600;
  const SPR = {
    villager: [null, 462 / 600, 600 * CH], apple: [RC + "apple_1", 180 / 190, 0.78], shield: ["item_shield", 240 / 290, 1.05], arrow: ["item_arrow", 110 / 320, 1.35],
    goblin: [WC + "goblin_walk_a", 240 / 276, 460 * CH], plank: ["item_plank", 3, 0.42], coin: ["coin", 1, 0.72], sheep: ["sheep_stand", 652 / 500, 460 * CH],
    lantern: ["item_lantern", 190 / 280, 1.05], stone: ["item_stone", 270 / 170, 0.6], brick: ["item_brick", 270 / 160, 0.58], step: ["item_step", 280 / 180, 0.62],
    key: [RX + "cage_key", 2, 0.42], sack: ["coin_sack", 340 / 360, 0.95], star: ["item_star", 1, 0.8], gate: [WC + "gate_wood", 240 / 350, 1.9],
    door: [RX + "tower_block_1", 400 / 240, 1.2], pillow: [WC + "pillow", 200 / 150, 0.7], carrot: ["item_carrot", 170 / 300, 1.1],
    knight: [null, 277 / 360, 600 * CH], flag: [WC + "flag_blue", 140 / 180, 1.15], gem: ["item_gem", 230 / 210, 0.72], torch: ["item_torch", 130 / 320, 1.35],
    horse: [RC + "pony_stand", 700 / 660, 660 * CH]
  };
  // the colour of a thing as a dot in a box of ten or a tray of a hundred
  const DOT = { villager: "#f48a7a", apple: "#e8506a", shield: "#5b8cf2", arrow: "#b07a4a", goblin: "#62c987", plank: "#b07a4a", coin: "#e3ad25", sheep: "#a99c94",
    lantern: "#f0b93a", stone: "#9aa4b2", brick: "#d0705a", step: "#bba98e", key: "#e3ad25", sack: "#d9b47e", star: "#f0b93a", pillow: "#8fb0e8", carrot: "#f48a2e",
    knight: "#5b8cf2", flag: "#5b8cf2", gem: "#4cbfa0", torch: "#f29a2e", horse: "#cf8f55", gate: "#b07a4a", door: "#b07a4a" };
  const CHARS = ["villager", "goblin", "sheep", "knight", "horse"];
  const MEADOW = ["sheep", "apple", "carrot", "horse", "plank", "stone", "arrow", "flag"];
  // the knight: every picture is 462 x 600 (the bop pictures 620 x 600, lined up by their left edge)
  const KN = { stand: RC + "knight_idle", cheer: RC + "knight_cheer", wave: WC + "knight_wave", bop: RX + "knight_bop", raise: "knight_bop_raise",
    walk_a: "knight_walk_a", walk_b: "knight_walk_b", basket: "knight_carry_basket", sack: "knight_carry_sack", point: "knight_point", shrug: "knight_shrug" };
  const CARRY = { apple: "basket", carrot: "basket", coin: "sack", gem: "sack", key: "sack", star: "sack" };
  // helpers at the right end: [picture, width / height, height as a share of the knight]
  const HELP = {
    pony: [RC + "pony_stand", 700 / 660, 660 / 600], pony_eat: [RC + "pony_eat", 700 / 660, 660 / 600], pony_happy: [RC + "pony_happy", 700 / 660, 660 / 600],
    buddy: [RC + "buddy_wave", 462 / 600, 1], buddy_cheer: [RX + "buddy_cheer", 462 / 600, 1], buddy_idle: [WC + "buddy_leaf_idle", 277 / 360, 1],
    farmer: ["villager_farmer_stand", 462 / 600, 1], farmer_wave: ["villager_farmer_wave", 462 / 600, 1],
    fence: ["fence", 420 / 240, 0.5], bridge: ["bridge", 560 / 260, 0.44], gate: [WC + "gate_wood", 240 / 350, 0.82], sack: ["coin_sack", 340 / 360, 0.5],
    cart: [RX + "cart", 520 / 320, 0.5]
  };
  const cache = {};
  function preload(ctx, names) { names.forEach(n => { const u = ctx.art(n); if (!cache[u]) { const im = new Image(); im.src = u; cache[u] = im; } }); }
  const h = (tag, cls, attrs) => { const e = document.createElement(tag); if (cls) e.className = cls; if (attrs) Object.assign(e, attrs); return e; };
  const hash = s => { let x = 7; for (const c of String(s)) x = (x * 31 + c.charCodeAt(0)) >>> 0; return x; };

  /* ---------- building blocks ---------- */
  function sprite(noun, i, flagKind) {
    if (noun === "villager") return [VILLAGERS[i % 3] + "_stand", SPR.villager[1], SPR.villager[2]];
    if (noun === "knight") return [WC + BUDDIES[i % 4] + "_idle", SPR.knight[1], SPR.knight[2]];   // counted knights are buddies, never "you"
    if (noun === "flag") return [WC + "flag_" + (flagKind || "blue"), SPR.flag[1], SPR.flag[2]];
    return SPR[noun] || SPR.apple;
  }
  // one thing; k = extra size factor
  function thing(ctx, noun, k = 1, i = 0, flagKind) {
    const [src, asp, hu] = sprite(noun, i, flagKind);
    const im = h("img", "qs-o", { src: ctx.art(src), alt: "" });
    im.dataset.noun = noun;
    im.style.cssText = `height:calc(var(--u)*${hu * k});width:calc(var(--u)*${hu * k * asp})`;
    return im;
  }
  // n things in 1 or 2 rows; characters stand a little closer together
  function icons(ctx, noun, n, k = 1, rows, flagKind) {
    const g = h("div", "qs-grid");
    const r = rows || (n <= 5 ? 1 : 2), cols = Math.max(1, Math.ceil(n / r));
    g.style.gridTemplateColumns = `repeat(${cols}, auto)`;
    for (let i = 0; i < n; i++) g.appendChild(thing(ctx, noun, k, i, flagKind));
    return g;
  }
  // big amounts: trays of a hundred (10 x 10 dots), boxes of ten (10 dots) and single ones; always true to the number
  function place(ctx, noun, n, flagKind) {
    const g = h("div", "qs-place");
    g.style.setProperty("--dot", DOT[noun] || "#b07a4a");
    const H = Math.floor(n / 100), T = Math.floor(n / 10) % 10, O = n % 10;
    if (H) { const b = h("div", "qs-hs"); b.style.gridTemplateRows = `repeat(${H > 3 ? 2 : 1}, auto)`; for (let i = 0; i < H; i++) b.appendChild(h("i", "qs-h")); g.appendChild(b); }
    if (T) { const b = h("div", "qs-ts"); for (let i = 0; i < T; i++) b.appendChild(h("i", "qs-t")); g.appendChild(b); }
    if (O) g.appendChild(icons(ctx, noun, O, SPR[noun] && SPR[noun][2] > 1.2 ? 0.75 : 1, O > 5 ? 2 : 1, flagKind)).classList.add("qs-ones");
    return g;
  }
  const amount = (ctx, noun, n, flagKind) => n > 20 ? place(ctx, noun, n, flagKind) : icons(ctx, noun, n, 1, undefined, flagKind);
  function group(inner, role, count) {
    const g = h("div", "qs-g qs-wait");
    if (role) g.dataset.role = role;
    if (count != null) g.dataset.count = count;
    g.appendChild(inner);
    return g;
  }

  /* ---------- the scene frame: sky and path, the backdrop picture, the knight, the helper, the things ---------- */
  function frame(root, ctx, act, noun) {
    root.innerHTML = "";
    root.classList.toggle("qs-fast", ctx.fast); root.classList.toggle("qs-reduced", ctx.reduced);
    const meadow = MEADOW.includes(noun);
    const base = h("div", "qc-base"), bg = h("div", "qc-bg");
    bg.style.backgroundImage = `url("${ctx.art(meadow ? "backdrop_meadow" : "backdrop_village")}")`;
    root.dataset.place = meadow ? "meadow" : "village";
    const inner = h("div", "qs-inner");
    const knight = h("img", "qc-knight", { src: ctx.art(KN.stand), alt: "" });
    const friend = h("img", "qc-friend qs-away", { alt: "" });
    const stage = h("div", "qs-stage"), fx = h("div", "qs-fx");
    inner.append(knight, friend, stage, fx);
    root.append(base, bg, inner);
    const S = { root, ctx, act, inner, knight, friend, stage, fx, pose: "stand", help: null, meadow, chars: CHARS.includes(noun) };
    root._qs = S;
    return S;
  }
  function pose(S, p) { S.pose = p; S.knight.src = S.ctx.art(KN[p] || KN.stand); S.knight.classList.toggle("qc-wide", p === "bop" || p === "raise"); S.knight.classList.toggle("qc-tilt", p === "shrug"); }
  // the helper at the right end; it is set up at the start (so the things leave room for it) and comes in when the story needs it
  function setHelp(S, name) {
    S.help = name;
    const [src, asp, k] = HELP[name];
    S.friend.src = S.ctx.art(src);
    S.friend.style.height = `calc(var(--K) * ${k})`; S.friend.style.width = `calc(var(--K) * ${k * asp})`;
    S.inner.style.setProperty("--right", `calc(var(--K) * ${k * asp} + var(--H) * .06)`);
  }
  function helpCome(S) { if (S.help) S.friend.classList.remove("qs-away"); }
  function helpPose(S, name) { if (S.help && HELP[name]) S.friend.src = S.ctx.art(HELP[name][0]); }
  function reveal(S, el, from = "l") {
    if (!el) return;
    el.classList.add("qs-from-" + from); el.classList.remove("qs-wait");
    void el.offsetWidth;
    el.classList.remove("qs-from-" + from);
  }
  // the knight takes a few steps on the spot (brings or leads something in), then stands or carries
  function walk(S, then) {
    const ctx = S.ctx;
    if (ctx.fast || ctx.reduced) return pose(S, then);
    let k = 0;
    const step = () => { if (!ctx.live()) return; if (k >= 4) return pose(S, then); pose(S, k % 2 ? "walk_b" : "walk_a"); k++; ctx.wait(260, step); };
    step();
  }
  // fit: the biggest unit size at which every group fits the stage
  function fit(S) {
    const st = S.stage, H = S.root.clientHeight || 120;
    S.root.style.setProperty("--H", H + "px");
    S.root.style.setProperty("--K", Math.round(Math.min(H * 0.74, S.inner.clientWidth * 0.25 || H)) + "px");
    const box = st.getBoundingClientRect();
    if (!box.width || !box.height) return;
    const fits = u => {
      st.style.setProperty("--u", u + "px");
      let l = Infinity, r = -Infinity, t = Infinity, btm = -Infinity;
      for (const c of st.children) { const b = c.getBoundingClientRect(); l = Math.min(l, b.left); r = Math.max(r, b.right); t = Math.min(t, b.top); btm = Math.max(btm, b.bottom); }
      return l >= box.left - 0.5 && r <= box.right + 0.5 && t >= box.top - 0.5 && btm <= box.bottom + 0.5;
    };
    // the biggest unit: a character (1.6 units) is never taller than the knight, a small thing never more than about a third of the row
    const top = Math.max(8, H * (S.chars ? 0.46 : 0.34));
    const best = () => { let lo = 3, hi = top; if (fits(hi)) return hi; for (let i = 0; i < 12; i++) { const m = (lo + hi) / 2; if (fits(m)) lo = m; else hi = m; } return lo; };
    const grids = [...st.querySelectorAll(".qs-g > .qs-grid")].filter(g => g.children.length >= 6);
    const plan = grids.map(g => g.style.gridTemplateColumns);
    let u = best();
    if (u < top * 0.75 && grids.length) {                 // a narrow row: three rows of things may be bigger than two
      grids.forEach(g => { g.style.gridTemplateColumns = `repeat(${Math.ceil(g.children.length / 3)}, auto)`; });
      const u3 = best();
      if (u3 > u * 1.12) u = u3; else grids.forEach((g, i) => { g.style.gridTemplateColumns = plan[i]; });
    }
    st.style.setProperty("--u", u + "px");
  }
  const add = (S, ...els) => els.forEach(e => e && S.stage.appendChild(e));
  // the ones that go: they slide softly to the right and fade (goblins wave goodbye first and run off happily)
  function goAway(S, items, noun) {
    items.forEach((o, i) => {
      if (noun === "goblin") { o.src = S.ctx.art(WC + "goblin_oops"); S.ctx.wait(500 + i * 60, () => { o.src = S.ctx.art(WC + "goblin_run"); o.classList.add("qc-flip"); S.ctx.wait(350, () => o.classList.add("qs-gone")); }); }
      else if (noun === "villager") { o.src = o.src.replace("_stand", "_wave"); S.ctx.wait(600 + i * 60, () => o.classList.add("qs-gone")); }
      else S.ctx.wait(i * 60, () => o.classList.add("qs-gone"));
    });
  }
  // which ones leave: the back row first, from the right end (nearest the way out), so the ones that stay keep standing on the path
  function leavers(A, n) {
    const os = [...A.querySelectorAll(".qs-grid > .qs-o")], g = A.querySelector(".qs-grid");
    const cols = g ? Math.max(1, (g.style.gridTemplateColumns.match(/repeat\((\d+)/) || [0, os.length])[1] | 0) : os.length;
    return os.map((o, i) => [Math.floor(i / cols), i % cols, o]).sort((x, y) => x[0] - y[0] || y[1] - x[1]).slice(0, n).map(x => x[2]);
  }
  // the ones that went, shown at the right end with whoever took them (they are part of the question: b)
  function goneGroup(S, noun, n) {
    const g = group(n > 20 ? place(S.ctx, noun, n) : icons(S.ctx, noun, n), "b", n);
    if (noun === "goblin") g.querySelectorAll(".qs-o").forEach(o => { o.src = S.ctx.art(WC + "goblin_run"); o.classList.add("qc-flip"); });
    else if (noun === "villager") g.querySelectorAll(".qs-o").forEach(o => { o.src = o.src.replace("_stand", "_wave"); });
    g.classList.add("qc-went");
    return g;
  }
  // who takes things away (from the story): the horse eats, a villager is given coins, the buddy is given arrows and lanterns,
  // the sheep walk to the pen; goblins and villagers go home by themselves
  function taker(sc) {
    if (sc.who === "horse" || sc.noun === "apple" || sc.noun === "carrot") return "pony";
    if (sc.noun === "coin") return "farmer";
    if (sc.noun === "sheep") return "fence";
    if (sc.who === "buddy" || sc.noun === "arrow" || sc.noun === "lantern") return "buddy";
    return null;
  }
  // what the things are for (need, make 10): no slots and no gaps, so the missing number is never drawn
  function target(sc) {
    if (sc.who === "horse" || sc.noun === "apple" || sc.noun === "carrot") return "pony";
    return { key: "gate", plank: "bridge", coin: "sack", sheep: "fence" }[sc.noun] || (sc.who === "buddy" ? "buddy" : null);
  }

  /* ---------- the acts ---------- */
  const ACTS = {
    add(S, Q, sc) {
      const n2 = sc.noun2 || sc.noun, who = sc.who === "buddy" ? "buddy" : sc.who === "horse" ? "pony" : null;
      if (who) setHelp(S, who);
      const A = group(amount(S.ctx, sc.noun, sc.a), "a", sc.a);
      const B = group(amount(S.ctx, n2, sc.b), "b", sc.b);
      add(S, A, B);
      const carry = CARRY[n2];
      return [
        [200, () => { reveal(S, A, "r"); helpCome(S); }],
        [900, () => walk(S, carry || "stand")],
        [carry ? 500 : 900, () => reveal(S, B, "l")],
        [1100, () => pose(S, "stand")]
      ];
    },
    sub(S, Q, sc) {
      const t = taker(sc), big = sc.a > 20, gob = sc.noun === "goblin";
      if (t) setHelp(S, t);
      const A = group(amount(S.ctx, sc.noun, sc.a), "a", sc.a);
      const T = goneGroup(S, sc.noun, sc.b);
      add(S, A, T);
      return [
        [200, () => reveal(S, A, "r")],
        [900, () => { if (gob) pose(S, "raise"); else helpCome(S); }],
        [gob ? 500 : 700, () => {
          if (gob) pose(S, "bop");
          if (big) A.classList.add("qs-soft");
          else goAway(S, leavers(A, sc.b), sc.noun);
          if (t === "pony") helpPose(S, "pony_eat");
          S.ctx.wait(big ? 200 : 700, () => reveal(S, T, "l"));
        }],
        [1300, () => pose(S, "stand")]
      ];
    },
    need(S, Q, sc) {
      const t = target(sc);
      if (t) setHelp(S, t);
      const A = group(amount(S.ctx, sc.noun, sc.a), "a", sc.a);
      add(S, A);
      return [[200, () => { reveal(S, A, "l"); helpCome(S); }], [700, () => pose(S, "point")], [1600, () => pose(S, "stand")]];
    },
    left(S, Q, sc) {
      // had a; some went out of sight (never drawn: how many went is the question); left stay
      const wrap = h("div", "qs-g qs-stack");
      const A = group(amount(S.ctx, sc.noun, sc.a), "a", sc.a);
      const L = group(amount(S.ctx, sc.noun, sc.left), "left", sc.left);
      wrap.append(A, L);
      add(S, wrap);
      return [
        [200, () => reveal(S, A, "r")],
        [1200, () => { A.classList.add("qs-out"); reveal(S, L, "d"); }],
        [900, () => pose(S, "point")], [1400, () => pose(S, "stand")]
      ];
    },
    compare(S, Q, sc) {
      const n2 = sc.noun2 || sc.noun, flags = sc.noun === "flag" && n2 === "flag";
      if (sc.who === "buddy") setHelp(S, "buddy_idle");
      else if (n2 === "carrot") setHelp(S, "pony");
      const one = Math.max(sc.a, sc.b) <= 5;
      const A = group(sc.a > 20 ? place(S.ctx, sc.noun, sc.a, flags ? "red" : null) : icons(S.ctx, sc.noun, sc.a, 1, one ? 1 : 2, flags ? "red" : null), "a", sc.a);
      const B = group(sc.b > 20 ? place(S.ctx, n2, sc.b) : icons(S.ctx, n2, sc.b, 1, one ? 1 : 2, flags ? "blue" : null), "b", sc.b);
      A.classList.add("qc-pair"); B.classList.add("qc-pair");
      add(S, A, B);
      return [[200, () => reveal(S, A, "d")], [800, () => { reveal(S, B, "d"); helpCome(S); }]];
    },
    numeral(S, Q, sc) {
      // the gate, the shield or the tower door with a little wooden sign that says the number word (no digits)
      const noun = ["gate", "door", "shield"].includes(sc.noun) ? sc.noun : "gate";
      const sign = h("div", "qs-g qs-wait qc-sign"); sign.dataset.role = "thing";
      const big = { gate: 1.9, door: 1.25, shield: 1.35 }[noun];
      const [src, asp] = SPR[noun];
      const im = h("img", "qc-big", { src: S.ctx.art(src), alt: "" });
      im.style.cssText = `height:calc(var(--u)*${big});width:calc(var(--u)*${big * asp})`;
      const w = h("span", "qc-word qc-on-" + noun); w.textContent = sc.word || "";
      sign.append(im, w);
      add(S, sign);
      return [[200, () => reveal(S, sign, "d")], [600, () => pose(S, "point")], [1800, () => pose(S, "stand")]];
    },
    count(S, Q, sc) {
      // the things counted so far (x, x+1, x+2: there are x+2 of them), all at once: the counting is Kennedy's
      const n = sc.seq[2], noun = sc.noun;
      const A = group(icons(S.ctx, noun, n, 1, n <= 6 ? 1 : 2), "a", n);
      if (sc.who === "horse") setHelp(S, "pony"); else if (sc.who === "buddy") setHelp(S, "buddy_idle");
      add(S, A);
      return [[200, () => { reveal(S, A, "r"); helpCome(S); }], [700, () => pose(S, "point")], [1600, () => pose(S, "stand")]];
    },
    more_less(S, Q, sc) {
      const A = group(icons(S.ctx, sc.noun, sc.a), "a", sc.a);
      if (sc.dir > 0) {
        if (sc.who === "buddy") setHelp(S, "buddy"); else if (sc.who === "horse") setHelp(S, "pony");
        const one = group(icons(S.ctx, sc.noun, 1), "one", 1);
        add(S, A, one);
        const carry = CARRY[sc.noun];
        return [[200, () => { reveal(S, A, "r"); helpCome(S); }], [900, () => walk(S, carry || "stand")], [carry ? 500 : 900, () => reveal(S, one, "l")], [1100, () => pose(S, "stand")]];
      }
      const t = sc.noun === "knight" ? null : taker(sc), gob = sc.noun === "goblin";
      if (t) setHelp(S, t);
      const one = goneGroup(S, sc.noun, 1); one.dataset.role = "one";
      add(S, A, one);
      return [
        [200, () => reveal(S, A, "r")],
        [900, () => { if (gob) pose(S, "raise"); else helpCome(S); }],
        [gob ? 500 : 700, () => {
          if (gob) pose(S, "bop");
          goAway(S, leavers(A, 1), sc.noun);
          if (t === "pony") helpPose(S, "pony_eat");
          S.ctx.wait(700, () => reveal(S, one, "l"));
        }],
        [1300, () => pose(S, "stand")]
      ];
    },
    make10(S, Q, sc) {
      const t = target(sc);
      if (t) setHelp(S, t);
      const A = group(icons(S.ctx, sc.noun, sc.a), "a", sc.a);
      add(S, A);
      return [[200, () => { reveal(S, A, "l"); helpCome(S); }], [700, () => pose(S, "point")], [1600, () => pose(S, "stand")]];
    }
  };
  /* ----- round of 22 Oct 2026: patterns and size (Kennedy). The scene shows the things of the question, never the answer. ----- */
  ACTS.pattern = (S, Q, sc) => {
    // the pattern so far, one thing at a time, left to right (the next one is what he is asked: it is never drawn)
    const flags = sc.noun === "flag" && sc.noun2 === "flag", kinds = [sc.noun, sc.noun2 || sc.noun];
    const gs = sc.seq.map((v, i) => group(icons(S.ctx, kinds[v - 1], 1, 1, 1, flags ? (v === 1 ? "red" : "blue") : undefined), "p" + i, 1));
    add(S, ...gs);
    return [[200, () => pose(S, "point")]].concat(gs.map(g => [S.ctx.reduced ? 120 : 300, () => reveal(S, g, "d")]), [[700, () => pose(S, "stand")]]);
  };
  ACTS.size = (S, Q, sc) => {
    // three of the same thing in three sizes, standing side by side on the path: bigger number = longer or taller, in true proportion
    const gs = sc.sizes.map((len, i) => { const g = group(h("div", "qs-grid"), "s" + i, len); g.firstChild.appendChild(thing(S.ctx, sc.noun, 0.4 + 0.6 * len / 9, i)); return g; });
    add(S, ...gs);
    return [[200, () => pose(S, "point")]].concat(gs.map(g => [S.ctx.reduced ? 120 : 400, () => reveal(S, g, "d")]), [[700, () => pose(S, "stand")]]);
  };
  // any other act (a cafe act, if a castle question ever carries one): show the first amount plainly
  const plain = (S, Q, sc) => ACTS.need(S, Q, { noun: sc.noun || "apple", a: Math.max(1, sc.a || sc.n || sc.total || 1) });

  function run(S, steps) {
    let t = 0;
    S.steps = steps.map(([, fn]) => ({ fn, done: false }));
    S.steps.forEach((st, i) => { t += S.ctx.reduced ? Math.min(steps[i][0], 250) : steps[i][0]; S.ctx.wait(t, () => { st.done = true; st.fn(); }); });
    S.ctx.wait(t + 1200, () => idle(S, S.ctx));
  }
  // the opening ends at once (a reaction came first): stop its timers and play the rest straight away
  function finish(S) {
    if (!S.steps || S.finished) return;
    S.finished = true; S.ctx._stop();
    S.root.classList.add("qs-fast");
    S.steps.forEach(st => { if (!st.done) { st.done = true; st.fn(); } });
    S.stage.querySelectorAll(".qs-wait").forEach(g => g.classList.remove("qs-wait"));
    void S.root.offsetWidth; S.root.classList.toggle("qs-fast", S.ctx.fast);
  }
  // idle: the knight breathes (CSS); now and then one sheep bends down to graze and looks up again. Nothing else moves.
  function idle(S, ctx) {
    if (ctx.fast || ctx.reduced) return;
    const loop = () => ctx.wait(9000 + Math.random() * 6000, () => {
      const sheep = [...S.root.querySelectorAll('.qs-o[data-noun="sheep"]')].filter(o => !o.classList.contains("qs-gone") && o.offsetParent);
      if (sheep.length) {
        const o = sheep[Math.floor(Math.random() * sheep.length)];
        o.src = ctx.art("sheep_graze"); ctx.wait(3500, () => { o.src = ctx.art("sheep_stand"); });
      }
      loop();
    });
    loop();
  }

  const impl = {
    show(root, Q, ctx) {
      preload(ctx, Object.values(KN).concat([RC + "heart", "lamb", "villager_child_wave", WC + "goblin_oops", WC + "goblin_run"]));
      const sc = Q.scene, S = frame(root, ctx, sc.act, sc.noun);
      const actFn = ACTS[sc.act] || plain;
      S.inner.style.setProperty("--right", "calc(var(--H) * .1)");
      fit(S);                                  // --H and --K first, so the helper's room is known
      const steps = actFn(S, Q, sc);
      fit(S);
      run(S, steps);
    },
    layout(root) { if (root._qs) fit(root._qs); },
    react(root, kind, rctx) {
      const S = root._qs; if (!S) return;
      finish(S);
      const back = (ms, p) => { if (!rctx.fast) rctx.wait(ms, () => { pose(S, p); helpPose(S, S.help === "pony" || S.help === "pony_eat" ? "pony" : S.help); idle(S, rctx); }); };   // the tests hold the pose
      if (kind === "right") {
        pose(S, "cheer");
        if (S.help === "buddy" || S.help === "buddy_idle") helpPose(S, "buddy_cheer");
        else if (S.help === "pony" || S.help === "pony_eat") helpPose(S, "pony_happy");
        else if (S.help === "farmer") helpPose(S, "farmer_wave");
        joiner(S, rctx);
        heart(S, rctx);
        back(2600, "stand");
      } else if (kind === "wrong") {
        pose(S, "shrug"); back(2600, "stand");                 // a kind head tilt and a shrug: nothing sad, no shaking
      } else if (kind === "lesson" || kind === "hint") {
        pose(S, "point");
        if (kind === "lesson") countAlong(S, rctx);
        back(kind === "lesson" ? 6000 : 3000, "stand");
      } else if (kind === "end") {
        pose(S, "wave");
        if (S.help === "buddy" || S.help === "buddy_idle") helpPose(S, "buddy");
      }
    },
    dispose(root) { root.innerHTML = ""; delete root._qs; delete root.dataset.place; root.classList.remove("qs-fast", "qs-reduced"); }
  };
  // a friend joins the happy moment: a lamb in the meadow, a waving child in the village (in the fx layer: it is never counted)
  function joiner(S, rctx) {
    if (S.fx.querySelector(".qc-join")) return;
    const lamb = S.meadow;
    const im = h("img", "qc-join" + (lamb ? " qc-lamb" : ""), { src: rctx.art(lamb ? "lamb" : "villager_child_wave"), alt: "" });
    S.fx.appendChild(im);
    if (!rctx.fast && !rctx.reduced) { im.classList.add("qc-in"); void im.offsetWidth; im.classList.remove("qc-in"); }
    rctx.wait(2600, () => im.remove());
  }
  function heart(S, rctx) {
    const box = S.inner.getBoundingClientRect(), b = S.knight.getBoundingClientRect();
    const im = h("img", "qs-heart", { src: rctx.art(RC + "heart"), alt: "" });
    im.style.left = (b.left + b.width * 0.5 - box.left) + "px";
    S.fx.appendChild(im);
    rctx.wait(2200, () => im.remove());
  }
  // the lesson: the knight points, and the things glow softly one by one (only small amounts; no numbers are shown)
  function countAlong(S, rctx) {
    const os = [...S.stage.querySelectorAll(".qs-o")].filter(o => !o.classList.contains("qs-gone") && !o.closest(".qs-out") && !o.closest(".qc-went") && o.offsetParent);
    if (!os.length || os.length > 20 || rctx.reduced) return;
    os.forEach((o, i) => rctx.wait(500 + i * 450, () => o.classList.add("qs-lit")));
    rctx.wait(500 + os.length * 450 + 1200, () => os.forEach(o => o.classList.remove("qs-lit")));
  }
  QuestScene.register("castle", impl);
})();
