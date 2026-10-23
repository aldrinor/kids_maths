/* game_mastery_test.js - checks game/mastery_bkt.js (the probability that a child knows a skill) beside the real engine's streak rule.
   The important check is that the probability gate can never stall a child: after the streak the engine asks for, p is always high enough.
   Silent: prints only failures and one RESULT line. Run: node tests/game_mastery_test.js */
const path = require("path");
global.window = global;
global.document = { createElement: () => ({ style: {} }), querySelector: () => null, getElementById: () => null, addEventListener: () => {}, head: { appendChild() {} } };
const E = require(path.join(__dirname, "../modules/engine.js"));
require(path.join(__dirname, "../topics/kinder.js"));
const CE = require(path.join(__dirname, "../game/choice_evidence.js")); global.ChoiceEvidence = CE;
const BKT = require(path.join(__dirname, "../game/mastery_bkt.js"));
const KS = require(path.join(__dirname, "../game/stories.js"));
let pass = 0, fail = 0;
const ok = (name, cond, extra) => { cond ? pass++ : (fail++, console.log("FAIL " + name + (extra !== undefined ? " | " + JSON.stringify(extra) : ""))); };
const C = BKT.CONFIG;
const M = E.buildSkillMap((window.MathTopics || []).filter(t => t.id === "kinder"), KS.extraSkills());
const NOW = Date.UTC(2026, 9, 22, 12);

// 1. The probability moves the right way
{ const g = {};
  let p = BKT.update(g, "sums.3", { clean: true, kind: "typed" }, null);
  ok("first clean typed answer raises p a lot", p > 0.7, p);
  const g2 = {}, p2 = BKT.update(g2, "sums.3", { clean: false, kind: "typed" }, null);
  ok("a miss lowers p below the start", p2 < C.init, p2);
  const g3 = {}, a = BKT.update(g3, "k", { clean: true, kind: "choice", options: 3 }, null), b = BKT.update({}, "k", { clean: true, kind: "typed" }, null);
  ok("a right tap on 3 choices proves less than a right typed answer", a < b, [a, b]);
  const c4 = BKT.update({}, "k", { clean: true, kind: "choice", options: 4 }, null);
  ok("4 choices prove more than 3", c4 > a, [a, c4]);
  ok("p is saved per skill in game.bkt", typeof g.bkt["sums.3"] === "number" && BKT.estimate(g, "sums.3") === g.bkt["sums.3"]);
  ok("p never leaves its bounds", (() => { const gg = {}; for (let i = 0; i < 200; i++) BKT.update(gg, "x", { clean: false, kind: "typed" }, null); const lo = gg.bkt.x; for (let i = 0; i < 200; i++) BKT.update(gg, "x", { clean: true, kind: "typed" }, null); return lo >= C.floor && gg.bkt.x <= C.ceil; })());
  ok("junk in game.bkt is replaced", (() => { const gg = { bkt: "oops" }; BKT.update(gg, "x", { clean: true, kind: "typed" }, null); return typeof gg.bkt.x === "number"; })());
  ok("NaN in game.bkt is ignored", (() => { const gg = { bkt: { x: NaN } }; BKT.update(gg, "x", { clean: true, kind: "typed" }, null); return Number.isFinite(gg.bkt.x); })());
  ok("a skill placement already knows starts high", BKT.prior({ lvl: 3, recent: [] }, C) === C.initKnown);
}

// 2. The gate cannot stall: from the worst start (the floor), the clean answers the engine asks for are enough
for (const [who, need] of [["marie", 4], ["kennedy", 3]]) {
  let g = { bkt: { s: C.floor } };
  let p = C.floor;
  for (let i = 0; i < need; i++) p = BKT.step(p, true, C.guessTyped, C);
  ok(`${who}: after ${need} clean typed answers from the worst start p passes the gate`, p >= C.gate, p);
  p = C.floor;
  for (let i = 0; i < need + CE.EXTRA; i++) p = BKT.step(p, true, 1 / 3, C);
  ok(`${who}: after ${need + CE.EXTRA} clean taps (3 choices) from the worst start p passes the gate`, p >= C.gate, p);
}

// 3. With the real engine: a child who answers everything clean is promoted, and is never held back
function play(profile, skill, answers, kind, options) {
  const st = E.createState(profile); st.place.done = true; const game = {}, need = profile === "kennedy" ? 3 : 4;
  const out = [];
  let now = NOW;
  for (const clean of answers) {
    now += 20000;
    const guard = CE.before(st, skill);
    E.record(st, M, { skill, correct: clean, helped: false, taught: false, rush: false }, now);
    const act = BKT.after(guard, st, game, { skill, kind, clean, rush: false, need, options, now });
    out.push({ act, lvl: st.skills[skill].lvl, p: game.bkt[skill] });
  }
  return { out, st, game };
}
{ const r = play("marie", "sums.3", [1, 1, 1, 1, 1, 1], "typed");
  ok("Marie, all clean typed: promoted by the 4th answer at the latest", r.out.findIndex(o => o.lvl >= 3) !== -1 && r.out.findIndex(o => o.lvl >= 3) <= 3, r.out);
  const r2 = play("kennedy", "kinder.5", [1, 1, 1, 1, 1], "choice", 3);
  ok("Kennedy, all clean taps: promoted at the 5th answer, not before", r2.out.findIndex(o => o.lvl >= 3) === 4, r2.out.map(o => o.lvl));
  const r3 = play("kennedy", "kinder.5", [1, 1, 1], "choice", 3);
  ok("Kennedy, 3 clean taps in a row are not enough (lucky guesses)", r3.out.every(o => o.lvl < 3), r3.out.map(o => o.lvl));
}
// 4. Misses first, then clean: still promoted once the streak is there (the gate does not stall)
{ for (const n of [1, 3, 6, 12, 25]) {
    const r = play("marie", "sums.4", Array(n).fill(0).concat([1, 1, 1, 1, 1]), "typed");
    const first = r.out.findIndex(o => o.lvl >= 3);
    ok(`after ${n} misses, 5 clean typed answers promote the skill`, first !== -1 && first <= n + 4, { first, tail: r.out.slice(-5).map(o => [o.lvl, o.act]) });
    const k = play("kennedy", "kinder.5", Array(n).fill(0).concat([1, 1, 1, 1, 1]), "choice", 3);
    ok(`Kennedy: after ${n} misses, 5 clean taps promote the skill`, k.out.findIndex(o => o.lvl >= 3) !== -1, k.out.slice(-5).map(o => [o.lvl, o.act]));
  }
}
// 5. Push: a strong run is promoted one answer early (typed only, enough accuracy)
{ const r = play("marie", "sums.5", [0, 1, 1, 1], "typed");     // the miss means no "fast" path; the streak rule would wait for the 4th clean one
  const first = r.out.findIndex(o => o.lvl >= 3);
  ok("push: a typed run of clean answers can be promoted one early", r.out.some(o => o.act === "push") ? first === 3 : first === -1 || first === 4, r.out);
  const bad = play("marie", "sums.5", [0, 0, 0, 0, 0, 0, 0, 1, 1, 1], "typed");
  ok("push: never when the last 10 were mostly misses", bad.out.every(o => o.act !== "push"), bad.out.map(o => o.act));
  const tap = play("kennedy", "kinder.5", [1, 1], "choice", 3);
  ok("push: never on two lucky taps", tap.out.every(o => o.act !== "push" && o.lvl < 3), tap.out);
}
// 6. A rushed answer changes nothing
{ const st = E.createState("marie"); st.place.done = true; const game = {};
  const guard = CE.before(st, "sums.3"); E.record(st, M, { skill: "sums.3", correct: false, rush: true }, NOW);
  ok("rush: p is not touched", BKT.after(guard, st, game, { skill: "sums.3", kind: "typed", clean: false, rush: true, need: 4 }, C) === "none" && game.bkt === undefined);
}
// 7. Reinforce: the streak says "Knows it" but p is below the gate -> promotion undone, counts kept
{ const st = E.createState("marie"); st.place.done = true; const game = { bkt: { "sums.6": 0.05 } };
  const strict = Object.assign({}, C, { gate: 0.9999, push: 1.1 });          // a very strict gate, to prove the undo path works
  let now = NOW, last = "none", s;
  for (let i = 0; i < 4; i++) {
    now += 1000; const guard = CE.before(st, "sums.6");
    E.record(st, M, { skill: "sums.6", correct: true, helped: false }, now);
    last = BKT.after(guard, st, game, { skill: "sums.6", kind: "typed", clean: true, rush: false, need: 4, now }, strict);
  }
  s = st.skills["sums.6"];
  ok("reinforce: promotion undone when p is below the gate", last === "reinforce" && s.lvl < 3 && s.n === 4, { last, lvl: s.lvl, n: s.n });
  ok("reinforce: the skill stays in practice (streak and counts kept)", s.streak >= 4 && s.right === 4, s);
}
// 8. A damaged saved bkt does not crash the answer path
{ const st = E.createState("marie"); st.place.done = true; const game = { bkt: [1, 2], evidence: "x" };
  const guard = CE.before(st, "sums.3"); E.record(st, M, { skill: "sums.3", correct: true }, NOW);
  ok("odd saved data is repaired quietly", (() => { try { BKT.after(guard, st, game, { skill: "sums.3", kind: "typed", clean: true, rush: false, need: 4 }); return typeof game.bkt === "object" && !Array.isArray(game.bkt); } catch (e) { return false; } })());
}
console.log(`RESULT ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
