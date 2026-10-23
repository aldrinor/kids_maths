/* Journey: the connected path of one play session (Kids Maths, 22 Oct 2026, review items 8, 17-21, 23).
 *   maths -> a little game -> maths -> a little game ... -> the play world -> done
 * This file draws the pictures and cards that join those steps and holds the small rules. It keeps no state of its own:
 * game/index.html passes the numbers in and gets plain HTML (or a promise) back. The pure parts work in Node (tests/game_journey_test.js).
 *
 *   Journey.stones(sincePlay, playEvery, rewardEvery)       how many games on the path to the play world are done (0..N)
 *   Journey.strip({ step, stones, total, theme })            the first-then picture strip (static: no animation, no numbers)
 *   Journey.card(kind, { theme, kid, art })                  html of a bridge card: "game" | "world" | "pause" | "break" | "keepsake"
 *   Journey.lineFor(kind, theme)                             the sentence spoken when that card shows
 *   Journey.keepsakeFor(theme, game, turn, picked)           { g, a, l, c, real } the keepsake a finished game gives (art path under game/); picked = what the game reported she made (cafe), else the picture follows the turn (castle)
 *   Journey.keepsakeList(list)                               [{ src, label }] cleaned list, newest last (for the world shelf and the badge)
 *   Journey.medal(keep)                                      html of a keepsake in its round frame (drawn in code)
 *   Journey.badge(info, keeps)                               html of the small "my cafe" / "my castle" room for the question screen
 *   Journey.dayCard({ ...numbers })                          html of the end-of-day card
 *   Journey.flyCoins({ from, to, n, html, fast, onLand })    the short calm coin motion; reduced motion = no motion, onLand at once
 *   Journey.reduced()                                        true when the device asks for reduced motion
 * Rules: calm; nothing flashes or loops; every picture also has a plain label; a card always waits for a tap (it never moves on by itself).
 */
(function (root) {
  "use strict";
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const svg = (inner, extra = "") => `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"${extra}>${inner}</svg>`;

  /* the pictures of the four steps (own drawings, same soft line as the other icons) */
  const ICON = {
    maths: svg(`<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><path d="M12 8v8M8 12h8"/>`),
    game: svg(`<rect x="4.5" y="10.5" width="15" height="10" rx="2"/><rect x="3.5" y="7.5" width="17" height="3.6" rx="1.4"/><path d="M12 7.5v13M12 7.5C10.2 3.8 6.4 4.6 7.8 6.6c.9 1.1 4.2.9 4.2.9zM12 7.5c1.8-3.7 5.6-2.9 4.2-.9-.9 1.1-4.2.9-4.2.9z"/>`),
    cafe: svg(`<path d="M4 10.5h16V20H4z"/><path d="M3 10.5l1.6-5h14.8l1.6 5"/><path d="M8.3 10.5a1.9 1.9 0 0 1-3.7 0M15.7 10.5a1.9 1.9 0 0 1-3.7 0M12 10.5a1.9 1.9 0 0 1-3.7 0M19.4 10.5a1.9 1.9 0 0 1-3.7 0"/><rect x="9.5" y="14" width="5" height="6" rx="1"/>`),
    castle: svg(`<path d="M4.5 20V8.5h3.6V6h2.6v2.5h2.6V6h2.6v2.5H19.5V20z"/><path d="M10 20v-4.5a2 2 0 0 1 4 0V20"/><path d="M12 6V2.6l3 1.2-3 1.2"/>`),
    done: svg(`<path d="M6.5 3v18"/><path d="M6.5 4.5h11l-2.6 3.8 2.6 3.8h-11"/>`),
    moon: svg(`<path d="M19.5 14.6A8.2 8.2 0 1 1 9.4 4.5a6.6 6.6 0 0 0 10.1 10.1z"/><path d="M15.5 4.2h3.4l-3.4 3.6h3.4" stroke-width="1.8"/>`),
    go: `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M7 4l13 8-13 8z" fill="currentColor"/></svg>`,
    tick: svg(`<path d="M4.5 12.8l5 5L19.5 6.5"/>`, ` stroke-width="3.4"`),
    star: `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 2.6l2.8 6 6.5.7-4.9 4.4 1.4 6.4L12 16.7 6.2 20.1l1.4-6.4L2.7 9.3l6.5-.7z" fill="#f6c945" stroke="#c99a1e" stroke-width="1.4" stroke-linejoin="round"/></svg>`
  };
  const worldIcon = theme => (theme === "castle" ? ICON.castle : ICON.cafe);
  const placeWord = theme => (theme === "castle" ? "castle" : "cafe");

  /* ---------- the first-then strip ---------- */
  function stones(sincePlay, playEvery, rewardEvery) {
    const total = Math.max(1, Math.floor(playEvery / rewardEvery));
    const n = Math.floor(Math.max(0, Number(sincePlay) || 0) / rewardEvery);
    return Math.max(0, Math.min(total, n));
  }
  /* step: "maths" | "game" | "world" | "done" (the picture that is lit now). stones: games done on the path. total: stones on the path. */
  function strip(o) {
    o = o || {};
    const step = ["maths", "game", "world", "done"].includes(o.step) ? o.step : "maths", total = Math.max(1, o.total || 5);
    const full = Math.max(0, Math.min(total, o.stones || 0)), theme = o.theme === "castle" ? "castle" : "cafe";
    const order = ["maths", "game", "world", "done"], at = order.indexOf(step);
    const pic = s => `<span class="jn${s === step ? " on" : order.indexOf(s) < at ? " past" : ""}" data-s="${s}">${s === "world" ? worldIcon(theme) : ICON[s]}</span>`;
    const path = Array.from({ length: total }, (_, i) => `<b class="jst${i < full ? " full" : ""}"></b>`).join("");
    const label = `First maths, then a game. ${full} of ${total} games are done on the way to play time in your ${placeWord(theme)}. After play time you are done.`;
    return `<span class="jstrip" data-step="${step}" data-stones="${full}" role="img" aria-label="${esc(label)}">${pic("maths")}<u class="jl"></u>${pic("game")}<span class="jpath">${path}</span>${pic("world")}<u class="jl"></u>${pic("done")}</span>`;
  }

  /* ---------- keepsakes: what a finished reward game gives. The art is the game's own; it changes with each turn, so the shelf is not all the same ---------- */
  const KEEP = {
    cookie: { l: "a cookie", art: ["rewards/art/cafe/cookie_heart.png", "rewards/art/cafe/cookie_star.png", "rewards/art/cafe/cookie_flower.png", "rewards/art/cafe/cookie_cat.png"] },
    hot_chocolate: { l: "a cup of hot chocolate", art: ["rewards/art/cafe/cup_pink.png", "rewards/art/cafe/cup_mint.png", "rewards/art/cafe/cup_cream.png"] },
    ice_cream: { l: "an ice cream", art: ["rewards/art/cafe/cone_pink.png", "rewards/art/cafe/cone_choc.png", "rewards/art/cafe/cone_waffle.png"] },
    pony_stable: { l: "a happy pony", art: ["rewards/art/castle/pony_happy.png", "rewards/art/castle/pony_stand.png", "rewards/art/castle/pony_eat.png"] },
    goblin_rescue: { l: "a goblin friend", art: ["world/art/castle/goblin_wave.png", "world/art/castle/goblin_sleepy.png", "world/art/castle/goblin_oops.png"] },
    kitty_tower: { l: "a tower for kitty", art: ["world/art/castle/tower_round.png", "world/art/castle/tower_square.png", "world/art/castle/tower_tall.png"] }
  };
  const FALLBACK = { cafe: "cookie", castle: "pony_stable" };
  const RIBBON = ["#e58aa0", "#7ccfb8", "#f2c14e", "#9fb4e8", "#f0a875", "#b99ae0"];
  function keepsakeFor(theme, game, turn, picked) {
    const th = theme === "castle" ? "castle" : "cafe";
    let k = KEEP[game], g = game;
    if (!k || (th === "castle") !== /pony|goblin|kitty/.test(g)) { g = FALLBACK[th]; k = KEEP[g]; }    // a game that is not known gives the theme's usual keepsake
    const t = Math.max(0, Math.floor(Number(turn) || 0));
    /* the game's own report of what she made or chose wins, when it is a safe picture path of the game; else the picture follows the turn */
    const real = typeof picked === "string" && /^rewards\/art\/(cafe|castle)\/[\w\-]+\.png$/.test(picked) ? picked : "";
    return { g, a: real || k.art[t % k.art.length], l: k.l, c: t % RIBBON.length, real: !!real };
  }
  function keepsakeList(list) {
    return (Array.isArray(list) ? list : []).filter(k => k && typeof k.a === "string" && /^[\w\/.\-]+\.png$/.test(k.a) && !/\.\./.test(k.a))
      .map(k => ({ src: k.a, label: typeof k.l === "string" ? k.l : "a keepsake", c: Number.isInteger(k.c) ? k.c : 0 }));
  }
  /* a keepsake in its round frame: a medal with two ribbon tails, drawn here in code. The picture inside is the game's own. */
  function medal(k) {
    const c = RIBBON[((k && k.c) || 0) % RIBBON.length], src = esc((k && (k.src || k.a)) || ""), lab = esc((k && k.label) || "a keepsake");
    return `<span class="jmedal" role="img" aria-label="${lab}"><svg viewBox="0 0 120 150" aria-hidden="true"><path d="M34 84 22 142l24-12 14 16 8-60z" fill="${c}" opacity=".85"/><path d="M86 84l12 58-24-12-14 16-8-60z" fill="${c}"/>` +
      `<circle cx="60" cy="58" r="52" fill="#fffaf0" stroke="${c}" stroke-width="7"/><circle cx="60" cy="58" r="43" fill="none" stroke="${c}" stroke-opacity=".35" stroke-width="2.5"/>` +
      `<image href="${src}" x="22" y="20" width="76" height="76" preserveAspectRatio="xMidYMid meet"/></svg></span>`;
  }

  /* ---------- cards ---------- */
  const LINES = {
    game: () => "Time for a little game!",
    world: th => `Now it is time to play in your ${placeWord(th)}!`,
    pause: th => `You worked hard! Take a slow breath. Then we play in your ${placeWord(th)}.`,
    keepsake: () => "Here is a keepsake from your game. It is yours to keep.",
    break: () => "Take a break. Tap go when you are ready.",
    near: () => "Your play time is coming soon!",
    day: () => "See you tomorrow! That is all the maths for today. Well done!",
    day2: () => "Look at your stars, your coins, and what you are saving for."
  };
  const lineFor = (kind, theme) => (LINES[kind] ? LINES[kind](theme === "castle" ? "castle" : "cafe") : "");
  const TITLES = {
    game: () => "Time for a little game!",
    world: th => `Time to play in your ${placeWord(th)}!`,
    pause: () => "You worked hard!",
    keepsake: () => "Your keepsake",
    break: () => "Take a break"
  };
  const SUBS = {
    pause: th => `Take a slow breath. Then we play in your ${placeWord(th)}.`,
    keepsake: th => (th === "castle" ? "It is from your game. It is yours to keep. It will be in your castle." : "It is from your game. It is yours to keep. Mimi puts it in your cafe."),
    break: () => "Rest for as long as you like. Tap Go when you are ready."
  };
  const STEP_OF = { game: "game", world: "world", pause: "world", keepsake: "game", break: "maths" };
  /* one big button, always the same place. A child who cannot read gets a round picture button; the word is for readers. */
  function card(kind, o) {
    o = o || {};
    const th = o.theme === "castle" ? "castle" : "cafe", kid = !!o.kid, title = (TITLES[kind] || TITLES.game)(th), sub = SUBS[kind] ? SUBS[kind](th) : "";
    const pic = kind === "keepsake" && o.keep ? medal(o.keep) : kind === "break" ? `<span class="jmoon">${ICON.moon}</span>` : `<span class="jart">${o.art || ""}</span>`;
    const lab = kind === "keepsake" ? "Keep it" : "Go";
    const btn = kid ? `<button class="go jgo kid" data-v="go" aria-label="${lab}">${kind === "keepsake" ? ICON.tick : ICON.go}</button>`
      : `<button class="go jgo" data-v="go" aria-label="${lab}">${kind === "keepsake" ? ICON.tick : ICON.go}<span>${lab}</span></button>`;
    const sw = kind === "break" ? "" : strip({ step: STEP_OF[kind] || "game", stones: o.stones || 0, total: o.total || 5, theme: th });
    return `<div class="panel jpanel" data-kind="${kind}" data-step="${STEP_OF[kind] || ""}">${pic}<h1${kid ? ' class="sr"' : ""}>${esc(title)}</h1>${sub && !kid ? `<p>${esc(sub)}</p>` : ""}${sw}${btn}</div>`;
  }

  /* ---------- the small room on the question screen ---------- */
  function badge(info, keeps) {
    const th = info && info.title === "my castle" ? "castle" : "cafe", title = (info && info.title) || (th === "castle" ? "my castle" : "my cafe");
    const items = info && Array.isArray(info.items) ? info.items.slice(0, 3) : [], list = keepsakeList(keeps), last = list[list.length - 1];
    const wall = info && info.wall ? ` style="background:${info.wall.replace(/"/g, "'")}"` : "";
    const parts = [info && info.friendName ? info.friendName : "", items.length ? items.length + (items.length === 1 ? " thing" : " things") : "", last ? "and " + last.label : ""].filter(Boolean);
    const aria = `${title}${parts.length ? ": " + parts.join(", ") : ""}`;
    return `<span class="jroom" data-theme="${th}" role="img" aria-label="${esc(aria)}"><span class="jwall"${wall}></span><span class="jfloor"></span>` +
      items.map((u, i) => `<img class="jitem" alt="" src="${esc(u)}" style="--i:${i}">`).join("") +
      (info && info.friend ? `<img class="jfriend" alt="" src="${esc(info.friend)}">` : "") +
      (last ? `<img class="jkeep" alt="" src="${esc(last.src)}">` : "") + `<b class="jtag">${esc(title)}</b></span>`;
  }

  /* ---------- the end-of-day card ---------- */
  function dayCard(o) {
    const th = o.theme === "castle" ? "castle" : "cafe", kid = !!o.kid, want = o.want;
    const ratio = want && want.price > 0 ? Math.max(0, Math.min(1, (o.coins || 0) / want.price)) : 1;
    const saving = want
      ? `<div class="jrow jwant" data-k="want"><img alt="" src="${esc(want.img)}"><span class="jwhat">${kid ? "" : `<small>${o.canBuy ? "You can buy" : "Saving for"}</small>`}${kid ? "" : `<b>${esc(want.name)}</b>`}<span class="jbar" aria-hidden="true"><i style="width:${Math.round(ratio * 100)}%"></i></span></span><span class="jnum">${o.coinSvg || ""}<b>${Math.floor(want.price)}</b></span></div>`
      : `<div class="jrow" data-k="want"><span class="jwhat"><b>${kid ? "" : "Everything is yours!"}</b></span></div>`;
    const wantAria = want ? `${o.canBuy ? "You can buy" : "Saving for"} ${want.name}, ${want.price} coins` : "Everything in your world is yours";
    return `<div class="panel jpanel jday" data-kind="day"><div class="mascot-big">${o.mascot || ""}</div><h1>See you tomorrow!</h1><p>That is all the maths for today. Well done!</p>` +
      `<div class="jrows" role="group" aria-label="Your day: ${o.stars || 0} stars, ${o.coins || 0} coins held. ${esc(wantAria)}">` +
      `<div class="jrow" data-k="stars"><span class="jpic">${ICON.star}</span><span class="jwhat">${kid ? "" : "<small>Stars today</small>"}</span><span class="jnum"><b>${o.stars || 0}</b></span></div>` +
      `<div class="jrow" data-k="coins"><span class="jpic">${o.coinSvg || ""}</span><span class="jwhat">${kid ? "" : "<small>Coins you have</small>"}</span><span class="jnum"><b>${o.coins || 0}</b></span></div>${saving}</div>` +
      strip({ step: "done", stones: o.stones || 0, total: o.total || 5, theme: th }) +
      (kid ? `<button class="go jgo kid" data-v="ok" aria-label="OK">${ICON.tick}</button>` : `<button class="go jgo" data-v="ok">${ICON.tick}<span>OK</span></button>`) + `</div>`;
  }

  /* ---------- coins that fly into the coin pill ---------- */
  function reduced() { try { return !!(root.matchMedia && root.matchMedia("(prefers-reduced-motion: reduce)").matches); } catch (e) { return false; } }
  const J = { ICON, stones, strip, card, lineFor, keepsakeFor, keepsakeList, medal, badge, dayCard, reduced, KEEP, RIBBON, flights: 0 };
  J.flyCoins = function (o) {
    const n = Math.max(0, Math.min(3, Math.floor(o && o.n) || 0));
    const land = () => { try { if (o && o.onLand) o.onLand(); } catch (e) { console.error(e); } };
    if (!n || J.reduced() || !o.from || !o.to || typeof document === "undefined" || !document.body || typeof document.body.animate !== "function") { land(); return Promise.resolve(false); }
    const a = o.from.getBoundingClientRect(), b = o.to.getBoundingClientRect();
    if (!(b.width > 0 && b.height > 0)) { land(); return Promise.resolve(false); }
    const k = o.fast ? 0.2 : 1;
    J.flights++;
    const runs = [];
    for (let i = 0; i < n; i++) {
      const el = document.createElement("span"); el.className = "jcoin"; el.setAttribute("aria-hidden", "true"); el.innerHTML = o.html || "";
      document.body.appendChild(el);
      const x0 = a.left + a.width / 2 - 14 + (i - (n - 1) / 2) * 26, y0 = a.top + Math.min(a.height / 2, 90) - 14, x1 = b.left + b.width / 2 - 14, y1 = b.top + b.height / 2 - 14;
      const an = el.animate([
        { transform: `translate(${x0}px,${y0}px) scale(.8)`, opacity: 0 },
        { transform: `translate(${x0}px,${y0 - 14}px) scale(1)`, opacity: 1, offset: 0.25 },
        { transform: `translate(${x1}px,${y1}px) scale(.7)`, opacity: 1, offset: 0.92 },
        { transform: `translate(${x1}px,${y1}px) scale(.6)`, opacity: 0 }
      ], { duration: 800 * k, delay: i * 140 * k, easing: "cubic-bezier(.35,.1,.3,1)", fill: "both" });
      runs.push(new Promise(res => { an.onfinish = an.oncancel = () => { el.remove(); res(); }; }));
    }
    return Promise.all(runs).then(() => { land(); return true; });
  };
  root.Journey = J;
  if (typeof module !== "undefined" && module.exports) module.exports = J;
})(typeof window !== "undefined" ? window : globalThis);
