/* game_journey_test.js - checks game/journey.js (the connected path: strip, cards, keepsakes, the small room, the day card, coins),
   the save repair for keepsakes and breaks (game/game_save.js) and the break line in the weekly report (game/parent_report.js).
   Every keepsake picture must exist and stay under 150 KB. Silent: prints only failures and one RESULT line. Run: node tests/game_journey_test.js */
const path = require("path");
const fs = require("fs");
global.window = global;
global.document = { createElement: () => ({ style: {} }), querySelector: () => null, getElementById: () => null, addEventListener: () => {}, head: { appendChild() {} } };
const E = require(path.join(__dirname, "../modules/engine.js"));
require(path.join(__dirname, "../topics/kinder.js"));
const J = require(path.join(__dirname, "../game/journey.js"));
const GS = require(path.join(__dirname, "../game/game_save.js"));
const PR = require(path.join(__dirname, "../game/parent_report.js"));
let pass = 0, fail = 0;
const ok = (name, cond, extra) => { cond ? pass++ : (fail++, console.log("FAIL " + name + (extra !== undefined ? " | " + JSON.stringify(extra) : ""))); };
const GAME = path.join(__dirname, "../game");

/* stones: one per game on the way to the play world */
ok("stones: 0 at the start", J.stones(0, 25, 5) === 0);
ok("stones: 4 answers is still 0", J.stones(4, 25, 5) === 0);
ok("stones: 5 -> 1, 12 -> 2, 24 -> 4, 25 -> 5", J.stones(5, 25, 5) === 1 && J.stones(12, 25, 5) === 2 && J.stones(24, 25, 5) === 4 && J.stones(25, 25, 5) === 5);
ok("stones: never above the path, never below 0, junk is 0", J.stones(60, 25, 5) === 5 && J.stones(-3, 25, 5) === 0 && J.stones("x", 25, 5) === 0 && J.stones(undefined, 25, 5) === 0);
ok("stones: another rule (15 answers, a game every 5) gives 3 stones", J.stones(15, 15, 5) === 3);

/* the strip */
{ const h = J.strip({ step: "game", stones: 3, total: 5, theme: "cafe" });
  ok("strip: four pictures in order", [...h.matchAll(/data-s="(\w+)"/g)].map(m => m[1]).join() === "maths,game,world,done");
  ok("strip: 5 stones, 3 full", (h.match(/class="jst[ "]/g) || []).length === 5 && (h.match(/jst full/g) || []).length === 3);
  ok("strip: the lit step is the game, maths is behind it", /class="jn past" data-s="maths"/.test(h) && /class="jn on" data-s="game"/.test(h) && /class="jn" data-s="world"/.test(h));
  ok("strip: a plain label with the count and the place", /aria-label="First maths, then a game\. 3 of 5 games are done on the way to play time in your cafe\./.test(h));
  ok("strip: no words and no digits drawn on the screen", !/>[A-Za-z0-9]/.test(h.replace(/<svg[\s\S]*?<\/svg>/g, "")));
  ok("strip: castle uses the castle picture and word", /in your castle/.test(J.strip({ step: "world", stones: 5, theme: "castle" })));
  ok("strip: no animation hooks", !/animation|transition|<animate/i.test(h));
  ok("strip: a wrong step falls back to maths and stones are clamped", /data-step="maths"/.test(J.strip({ step: "zzz", stones: 99, total: 5 })) && (J.strip({ step: "zzz", stones: 99, total: 5 }).match(/jst full/g) || []).length === 5);
}

/* keepsakes */
{ const all = [];
  for (const g of Object.keys(J.KEEP)) for (const a of J.KEEP[g].art) all.push(a);
  ok("keepsakes: 6 games, each with several pictures", Object.keys(J.KEEP).length === 6 && Object.values(J.KEEP).every(k => k.art.length >= 3 && k.l));
  const missing = all.filter(a => !fs.existsSync(path.join(GAME, a)));
  ok("keepsakes: every picture exists", missing.length === 0, missing);
  const big = all.filter(a => fs.existsSync(path.join(GAME, a)) && fs.statSync(path.join(GAME, a)).size > 150 * 1024);
  ok("keepsakes: every picture is under 150 KB", big.length === 0, big);
  const a0 = J.keepsakeFor("cafe", "cookie", 0), a1 = J.keepsakeFor("cafe", "cookie", 1), a4 = J.keepsakeFor("cafe", "cookie", 4);
  ok("keepsakeFor: the same turn gives the same keepsake", JSON.stringify(a0) === JSON.stringify(J.keepsakeFor("cafe", "cookie", 0)));
  ok("keepsakeFor: the next turn looks different, and it comes round again", a0.a !== a1.a && a0.a === a4.a);
  ok("keepsakeFor: record has game, art path, label, ribbon colour", a0.g === "cookie" && /\.png$/.test(a0.a) && a0.l === "a cookie" && Number.isInteger(a0.c));
  ok("keepsakeFor: an unknown game gives the theme's usual one", J.keepsakeFor("cafe", "nonsense", 2).g === "cookie" && J.keepsakeFor("castle", undefined, 0).g === "pony_stable");
  ok("keepsakeFor: a game of the other world is not mixed in", J.keepsakeFor("castle", "cookie", 0).g === "pony_stable" && J.keepsakeFor("cafe", "kitty_tower", 0).g === "cookie");
  ok("keepsakeFor: a bad turn is turn 0", JSON.stringify(J.keepsakeFor("cafe", "cookie", "x")) === JSON.stringify(a0) && JSON.stringify(J.keepsakeFor("cafe", "cookie", -4)) === JSON.stringify(a0));
  const real = J.keepsakeFor("cafe", "hot_chocolate", 0, "rewards/art/cafe/cup_mint.png");
  ok("keepsakeFor: what the game reported she chose wins over the turn", real.a === "rewards/art/cafe/cup_mint.png" && real.real === true && real.g === "hot_chocolate");
  ok("keepsakeFor: an unsafe or odd report is ignored, the turn decides", ["../x.png", "http://a/b.png", "rewards/art/cafe/x.gif", "rewards/art/../../x.png", 5, "", null].every(bad => { const k = J.keepsakeFor("cafe", "cookie", 1, bad); return k.real === false && k.a === a1.a; }));
  ok("words: the keepsake never says 'made' (a castle game is not 'made')", !/made/i.test(J.lineFor("keepsake", "cafe") + J.card("keepsake", { theme: "castle", keep: { src: "x.png", label: "a goblin friend" } }).replace(/<[^>]*>/g, " ")));
  const list = J.keepsakeList([{ g: "cookie", a: "rewards/art/cafe/cookie_star.png", l: "a cookie", c: 2 }, { a: "../secret.png" }, { a: "http://x/y.png" }, null, { a: 5 }, { a: "rewards/art/cafe/cup_pink.png" }]);
  ok("keepsakeList: bad entries and unsafe paths are dropped", list.length === 2 && list[0].src === "rewards/art/cafe/cookie_star.png" && list[0].label === "a cookie" && list[1].label === "a keepsake", list);
  ok("keepsakeList: junk in, empty list out", J.keepsakeList("x").length === 0 && J.keepsakeList(undefined).length === 0);
  const m = J.medal({ src: "a/b.png", label: "a <cookie>", c: 1 });
  ok("medal: the picture, a plain label, and no raw markup from the label", /href="a\/b\.png"/.test(m) && /aria-label="a &lt;cookie&gt;"/.test(m));
}

/* cards */
{ const kinds = ["game", "world", "pause", "break"];
  for (const kind of kinds) {
    const r = J.card(kind, { theme: "cafe", kid: false, stones: 2, total: 5, art: "<svg></svg>" }), k = J.card(kind, { theme: "castle", kid: true, stones: 2, total: 5 });
    ok(`card ${kind}: one Go button with a word for a reader`, (r.match(/class="go jgo"/g) || []).length === 1 && /<span>Go<\/span>/.test(r));
    ok(`card ${kind}: for the pre-reader a round picture button with a label and no word`, /class="go jgo kid"/.test(k) && !/<span>Go<\/span>/.test(k) && /aria-label="Go"/.test(k));
    ok(`card ${kind}: a heading (hidden but read for a child who cannot read)`, /<h1>/.test(r) && /<h1 class="sr">/.test(k));
    ok(`card ${kind}: a line to say`, J.lineFor(kind, "cafe").length > 8);
  }
  ok("card game/world/pause: the strip is there, lit at the right step", /data-step="game"/.test(J.card("game", {})) && /data-step="world"/.test(J.card("world", {})) && /data-step="world"/.test(J.card("pause", {})));
  ok("card break: a quiet moon, no strip", /jmoon/.test(J.card("break", {})) && !/jstrip/.test(J.card("break", {})));
  ok("card keepsake: a medal, a tick, never pass / fail words", (() => { const c = J.card("keepsake", { theme: "cafe", keep: { src: "rewards/art/cafe/cup_pink.png", label: "a cup of hot chocolate", c: 0 } }); return /jmedal/.test(c) && !/pass|fail|score|\bwon\b|\blost\b|wrong/i.test(c.replace(/<[^>]*>/g, " ")) && /Keep it/.test(c); })());
  ok("lines: the rest card names the place, in plain words", J.lineFor("pause", "castle") === "You worked hard! Take a slow breath. Then we play in your castle." && J.lineFor("world", "cafe") === "Now it is time to play in your cafe!");
  ok("lines: the near line, the break line, the day lines", J.lineFor("near") === "Your play time is coming soon!" && J.lineFor("break") === "Take a break. Tap go when you are ready." && /^See you tomorrow!/.test(J.lineFor("day")) && /stars/.test(J.lineFor("day2")));
  const longest = ["game", "world", "pause", "keepsake", "break", "near", "day2"].map(k => J.lineFor(k, "castle")).reduce((a, b) => (a.length > b.length ? a : b)).length;
  ok("lines: short enough to say in one breath", longest <= 90, longest);
  ok("lines: no hard words", !/irreducible|empirical|converge|sprawl|structural/i.test(["game", "world", "pause", "keepsake", "break", "near", "day", "day2"].map(k => J.lineFor(k)).join(" ")));
}

/* the small room */
{ const info = { title: "my cafe", wall: "url(data:image/svg+xml,x) 0 0/26px auto", friend: "world/art/cafe/pet_bunny_sit.png", friendName: "bunny", items: ["a1.png", "a2.png", "a3.png", "a4.png"] };
  const b = J.badge(info, [{ a: "rewards/art/cafe/cookie_star.png", l: "a cookie", g: "cookie" }]);
  ok("badge: the label, the friend, 3 things at most, the latest keepsake", /my cafe/.test(b) && /pet_bunny_sit/.test(b) && (b.match(/class="jitem"/g) || []).length === 3 && /jkeep/.test(b) && /cookie_star/.test(b));
  ok("badge: a plain label for a screen reader", /aria-label="my cafe: bunny, 3 things, and a cookie"/.test(b), b.match(/aria-label="[^"]*"/));
  ok("badge: an empty world still gives a room", /jroom/.test(J.badge({ title: "my castle", items: [] }, [])) && /data-theme="castle"/.test(J.badge({ title: "my castle", items: [] }, [])));
}

/* the end of the day */
{ const want = { name: "a golden gate", price: 40, img: "world/art/castle/gate_gold.png" };
  const r = J.dayCard({ theme: "castle", kid: false, stars: 7, coins: 10, want, canBuy: false, stones: 5, total: 5, mascot: "<svg></svg>", coinSvg: "<svg></svg>" });
  const k = J.dayCard({ theme: "castle", kid: true, stars: 7, coins: 10, want, stones: 5, total: 5 });
  ok("day card: stars, coins held, what is being saved for", /data-k="stars"[\s\S]*<b>7<\/b>/.test(r) && /data-k="coins"[\s\S]*<b>10<\/b>/.test(r) && /data-k="want"/.test(r) && /a golden gate/.test(r) && /<b>40<\/b>/.test(r));
  ok("day card: the bar is a quarter full (10 of 40)", /<i style="width:25%">/.test(r));
  ok("day card: the strip ends on done", /data-step="done"/.test(r));
  ok("day card: a pre-reader gets no words for the rows and a round OK", !/Stars today|Saving for|golden gate/.test(k.replace(/aria-label="[^"]*"/g, "")) && /jgo kid/.test(k));
  ok("day card: a screen reader gets the whole day in one label", /aria-label="Your day: 7 stars, 10 coins held\. Saving for a golden gate, 40 coins"/.test(r));
  ok("day card: can buy now is said", /You can buy/.test(J.dayCard({ theme: "cafe", stars: 1, coins: 99, want, canBuy: true })));
  ok("day card: nothing left to buy is handled", /Everything is yours!/.test(J.dayCard({ theme: "cafe", stars: 0, coins: 0, want: null })));
  ok("day card: a price of 0 does not divide by zero", /width:100%/.test(J.dayCard({ theme: "cafe", stars: 0, coins: 0, want: { name: "x", price: 0, img: "x.png" } })));
}

/* coins: no browser here, so they land at once */
{ let a = 0, b = 0;
  J.flyCoins({ n: 2, onLand: () => a++ }).then(r => { ok("flyCoins: with nothing to fly between it lands at once", a === 1 && r === false); });
  J.flyCoins({ n: 0, onLand: () => b++ });
  ok("flyCoins: 0 coins still lands (the pill is redrawn)", b === 1 && a === 1);
}

/* the save: keepsakes and breaks are checked, never crash the start */
{ const fake = () => { const m = new Map(); return { m, getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { m.set(k, String(v)); }, removeItem: k => { m.delete(k); } }; };
  const NOW = Date.UTC(2026, 9, 22, 12), KEY = "kidsMaths.game.marie";
  const base = () => ({ version: 2, coins: 3, game: { answered: 1, sinceReward: 1, sincePlay: 1, rewardTurn: 0 }, days: {}, engine: E.createState("marie") });
  const run = p => { const st = fake(); st.setItem(KEY, JSON.stringify(p)); return GS.load({ storage: st, key: KEY, who: "marie", now: NOW, makeEngine: E.createState, importOld: () => ({}) }); };
  const good = Object.assign(base(), { keepsakes: [{ g: "cookie", a: "rewards/art/cafe/cookie_star.png", l: "a cookie", t: 1, day: "2026-10-22" }] });
  good.days["2026-10-22"] = { n: 2, clean: 1, ms: 5, sets: 0, skills: {}, breaks: 2, breakMs: 90000 };
  let r = run(good);
  ok("save: good keepsakes and breaks load untouched, no note", r.status === "ok" && r.p.keepsakes.length === 1 && r.p.days["2026-10-22"].breaks === 2 && r.notes.length === 0, [r.status, r.notes]);
  r = run(Object.assign(base(), { keepsakes: "oops" }));
  ok("save: keepsakes of the wrong kind are dropped with a note, the game still starts", r.p && !("keepsakes" in r.p) && r.notes.length === 1, [r.status, r.notes]);
  r = run(Object.assign(base(), { keepsakes: [{ g: "cookie", a: "x.png" }, 7, null, { g: 1 }] }));
  ok("save: bad entries in the list are dropped, the good one stays", r.p.keepsakes.length === 1 && r.p.keepsakes[0].g === "cookie");
  const many = Object.assign(base(), { keepsakes: Array.from({ length: 40 }, (_, i) => ({ g: "cookie", a: "x" + i + ".png" })) });
  ok("save: no more than the last 24 keepsakes are kept", run(many).p.keepsakes.length === 24 && run(many).p.keepsakes[23].a === "x39.png");
  const bd = base(); bd.days["2026-10-22"] = { n: 1, clean: 1, ms: 1, sets: 0, skills: {}, breaks: -4, breakMs: "x" };
  r = run(bd);
  ok("save: bad break numbers become 0", r.p.days["2026-10-22"].breaks === 0 && r.p.days["2026-10-22"].breakMs === 0);
  const nb = base(); nb.game.nearSaid = "yes";
  ok("save: a bad 'near' mark becomes false", run(nb).p.game.nearSaid === false);
  const nb2 = base(); nb2.game.nearSaid = true;
  ok("save: a true 'near' mark stays", run(nb2).p.game.nearSaid === true);
}

/* the weekly report names breaks in plain words */
{ const NOW = Date.UTC(2026, 9, 22, 18);
  const st = E.createState("marie"); const days = {}; days[E.dayKey(NOW)] = { n: 10, clean: 8, ms: 600000, sets: 2, skills: {}, breaks: 3, breakMs: 7 * 60000 };
  const M = E.buildSkillMap((window.MathTopics || []).filter(t => t.id === "kinder"), []);
  const w = PR.weekly({ who: "marie", name: "Marie", save: { version: 2, coins: 1, game: {}, days, engine: st }, entries: [], M, engine: E, missLabel: () => "" }, NOW);
  ok("report: breaks are told, kindly, with the time", /asked for a break 3 times, about 7 minutes in all\. Asking for a break is a good thing to do\./.test(w), w);
  const days2 = {}; days2[E.dayKey(NOW)] = { n: 10, clean: 8, ms: 600000, sets: 2, skills: {}, breaks: 1, breakMs: 20000 };
  const w2 = PR.weekly({ who: "marie", name: "Marie", save: { version: 2, coins: 1, game: {}, days: days2, engine: st }, entries: [], M, engine: E, missLabel: () => "" }, NOW);
  ok("report: one short break is 'a break 1 time' with no minutes", /asked for a break 1 time\./.test(w2) && !/minutes in all/.test(w2.split("asked for a break")[1] || ""), w2);
  const days3 = {}; days3[E.dayKey(NOW)] = { n: 10, clean: 8, ms: 600000, sets: 2, skills: {} };
  ok("report: no breaks, no line", !/break/.test(PR.weekly({ who: "marie", name: "Marie", save: { version: 2, coins: 1, game: {}, days: days3, engine: st }, entries: [], M, engine: E, missLabel: () => "" }, NOW)));
}

setTimeout(() => { console.log(`RESULT ${pass}/${pass + fail} passed`); process.exit(fail ? 1 : 0); }, 20);
