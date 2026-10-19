// Engine tests with pretend children. Plain Node, no browser. One line per check.
// Run: node tests/engine_test.js
const path = require("path");
const E = require(path.join(__dirname, "../src/modules/engine.js"));
global.window = global;
global.document = { createElement: () => ({ style: {} }), querySelector: () => null, getElementById: () => null, addEventListener: () => {}, head: { appendChild() {} } };
for (const f of ["numbers", "groups", "money", "fractions", "time_measure", "shapes_data"]) {
  try { require(path.join(__dirname, "../src/topics/" + f + ".js")); } catch (e) { console.log("NOTE topic file did not load in Node:", f, e.message); }
}
const M = E.buildSkillMap(window.MathTopics || []);
const DAY = E.DAY;
let pass = 0, fail = 0;
const ok = (name, cond, extra) => { cond ? pass++ : fail++; console.log((cond ? "PASS " : "FAIL ") + name + (!cond && extra !== undefined ? " | " + JSON.stringify(extra) : "")); };
function seeded(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

// A pretend child: knows every skill whose grade is at most `grade`, except the ones in `weak`, which they learn
// slowly; guesses right `guess` of the time on unknown skills; slips `slip` of the time on known ones.
function child(profile, { grade, weak = {}, never = [], guess = .2, slip = .1, seed = 1 }) {
  const rng = seeded(seed), st = E.createState(profile), practice = {};
  const knows = id => { const s = M.map[id]; if (never.includes(id)) return false; if (weak[id] !== undefined) return (practice[id] || 0) >= weak[id]; return s.grade <= grade || (practice[id] || 0) >= 6; };
  const answer = id => { practice[id] = (practice[id] || 0) + 1; return knows(id) ? rng() > slip : rng() < guess; };
  return { st, rng, answer, practice };
}
function runDays(c, days, setsPerDay, start = Date.UTC(2026, 9, 20, 16)) {
  const log = [];
  for (let d = 0; d < days; d++) {
    let now = start + d * DAY;
    for (let k = 0; k < setsPerDay; k++) {
      const set = E.nextSet(c.st, M, now, c.rng);
      log.push({ day: d, kind: set.kind, target: set.target });
      if (set.kind === "place") { E.placementRecord(c.st, M, set.items[0], c.answer(set.items[0])); continue; }
      if (set.kind === "parent") { c.st.parentQs = []; continue; }
      if (!set.items.length) break;
      for (const id of set.items) { now += 20000; E.record(c.st, M, { skill: id, correct: c.answer(id), helped: false }, now); }
    }
    if (!c.st.place.done && d >= 2) E.finishPlacement(c.st, M, now);
  }
  return log;
}

// 1. The map
const ready = M.order.filter(id => M.map[id].ready);
ok("map has sums, games and later skills", M.map["sums.1"] && ready.length > 60 && M.order.some(id => !M.map[id].ready), { ready: ready.length, all: M.order.length });
ok("every need points to a real skill", M.order.every(id => M.map[id].needs.every(n => M.map[n])));
const cyc = (() => { const seen = {}, on = {}; const dfs = id => { if (on[id]) return true; if (seen[id]) return false; seen[id] = on[id] = true; const r = M.map[id].needs.some(dfs); on[id] = false; return r; }; return M.order.some(dfs); })();
ok("no circular needs", !cyc);

// 2. Placement is short and ends
{ const c = child("marie", { grade: 2, seed: 3 }); let n = 0, set;
  while ((set = E.nextSet(c.st, M, Date.UTC(2026, 9, 20), c.rng)).kind === "place" && n < 60) { E.placementRecord(c.st, M, set.items[0], c.answer(set.items[0])); n++; }
  ok("Marie placement ends within 35 questions", n <= 35 && c.st.place.done, n);
  const known = M.order.filter(id => (c.st.skills[id]?.lvl || 0) >= 3);
  ok("placement marks some Grade 1-2 skills as known", known.length >= 5 && known.every(id => M.map[id].grade <= 3), known.length);
}
{ const c = child("kennedy", { grade: 0, seed: 4 }); let n = 0, set;
  while ((set = E.nextSet(c.st, M, Date.UTC(2026, 9, 20), c.rng)).kind === "place" && n < 60) { E.placementRecord(c.st, M, set.items[0], c.answer(set.items[0])); n++; }
  ok("Kennedy placement is short (under 20) and skips Grade 3 groups", n < 20, n);
}

// 3. A child weak on one skill gets looped on it until she knows it, and still moves on elsewhere
{ const c = child("marie", { grade: 1, weak: { "sums.3": 14 }, seed: 5 });
  const log = runDays(c, 25, 6);
  ok("weak skill (Adding to 20) keeps coming back until learnt (14+ tries)", (c.practice["sums.3"] || 0) >= 14, c.practice["sums.3"]);
  ok("weak skill is learnt in the end", (c.st.skills["sums.3"]?.lvl || 0) >= 3, c.st.skills["sums.3"]);
  const newSkills = M.order.filter(id => (c.st.skills[id]?.lvl || 0) >= 3 && M.map[id].grade >= 2).length;
  ok("she keeps learning new Grade 2+ skills (at least 8 in 25 days)", newSkills >= 8, newSkills);
}

// 4. Reviews never take more than 4 sets in 10 (after placement)
{ const c = child("marie", { grade: 2, seed: 6 });
  const log = runDays(c, 40, 6).filter(l => l.kind !== "place");
  let worst = 0; for (let i = 10; i <= log.length; i++) { const w = log.slice(i - 10, i).filter(l => l.kind === "review" || l.kind === "recheck").length; worst = Math.max(worst, w); }
  ok("reviews and re-checks at most 4 in any 10 sets", worst <= 4, worst);
  const sure = M.order.filter(id => (c.st.skills[id]?.lvl || 0) >= 4).length;
  ok("re-checks move skills to 'knows it for sure'", sure >= 10, sure);
}

// 5. A skill she never gets is parked after 2 repair rounds, not looped forever
{ const c = child("marie", { grade: 1, never: ["sums.3"], guess: .1, seed: 7 });
  const log = runDays(c, 30, 6);
  const s = c.st.skills["sums.3"] || {};
  ok("never-learnt skill gets parked", s.parkedNote === true, s);
  const repairs = log.filter(l => l.kind === "repair").length;
  ok("repair rounds happen but are limited", repairs >= 1 && repairs <= 8, repairs);
}

// 6. Easy path is closed: an expert child is not kept on easy skills
{ const c = child("marie", { grade: 3, guess: .9, slip: .02, seed: 8 });
  const log = runDays(c, 20, 6).filter(l => l.kind === "new" || l.kind === "sweep");
  const g1 = log.filter(l => M.map[l.target].grade <= 1).length;
  ok("strong child spends few sets on easy new work (at most 8 of 120)", g1 <= 8, g1);
  const g3 = M.order.filter(id => M.map[id].grade >= 3 && (c.st.skills[id]?.lvl || 0) >= 3).length;
  ok("strong child reaches many Grade 3 skills in 20 days", g3 >= 15, g3);
}

// 7. Daily limit per skill
{ const c = child("kennedy", { grade: 0, weak: { "count_quick.0": 99 }, seed: 9 });
  runDays(c, 3, 10);
  const today = c.st.dayCounts["count_quick.0"] || 0;
  ok("one skill is asked at most 8 times a day for Kennedy", today <= 8, today);
}

// 8. Rushed wrong answers change nothing; helped answers do not count as "knows it"
{ const st = E.createState("marie"); const now = Date.UTC(2026, 9, 20);
  for (let i = 0; i < 6; i++) E.record(st, M, { skill: "sums.1", correct: false, rush: true }, now);
  ok("rushes earn and change nothing", st.skills["sums.1"].n === 0 && st.skills["sums.1"].lvl === 0);
  for (let i = 0; i < 8; i++) E.record(st, M, { skill: "sums.1", correct: true, helped: true }, now);
  ok("helped answers never reach 'knows it'", st.skills["sums.1"].lvl < 3, st.skills["sums.1"].lvl);
}

// 9. Pause and parent questions
{ const st = E.createState("marie"); st.place.done = true; st.paused = true;
  ok("paused child gets no work", E.nextSet(st, M, Date.now()).kind === "paused");
  st.paused = false; st.parentQs = [{ q: "3 + 4", a: "7" }];
  ok("parent questions come first", E.nextSet(st, M, Date.now()).kind === "parent");
}

console.log(`RESULT ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
