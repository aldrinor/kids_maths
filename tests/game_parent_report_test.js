/* game_parent_report_test.js - checks game/parent_report.js (plain facts for a grown-up) and game/progress_file.js (save and load the progress file).
   Silent: prints only failures and one RESULT line. Run: node tests/game_parent_report_test.js */
const path = require("path");
global.window = global;
global.document = { createElement: () => ({ style: {} }), querySelector: () => null, getElementById: () => null, addEventListener: () => {}, head: { appendChild() {} } };
const E = require(path.join(__dirname, "../modules/engine.js"));
require(path.join(__dirname, "../topics/kinder.js"));
const KS = require(path.join(__dirname, "../game/stories.js"));
const GS = require(path.join(__dirname, "../game/game_save.js"));
const AL = require(path.join(__dirname, "../game/answer_log.js"));
const MS = require(path.join(__dirname, "../game/miss_study.js"));
const PR = require(path.join(__dirname, "../game/parent_report.js"));
const PF = require(path.join(__dirname, "../game/progress_file.js"));
let pass = 0, fail = 0;
const ok = (name, cond, extra) => { cond ? pass++ : (fail++, console.log("FAIL " + name + (extra !== undefined ? " | " + JSON.stringify(extra) : ""))); };
const fake = () => { const m = new Map(); return { m, getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { m.set(k, String(v)); }, removeItem: k => { m.delete(k); } }; };
const M = E.buildSkillMap((window.MathTopics || []).filter(t => t.id === "kinder"), KS.extraSkills());
M.order.forEach(id => { M.map[id].ready = KS.SKILLS.includes(id); });
const NOW = Date.UTC(2026, 9, 22, 18), DAY = 864e5, MIN = 6e4;
const e = (i, o) => Object.assign({ t: NOW - i * MIN, s: "sums.3", q: "8 + 7 = ?", g: 16, a: 15, ok: 0, h: 0, r: 1, sc: "add", ms: 5000, k: "t", c: "slip", f: [] }, o || {});

function save(who, answered) {
  const st = E.createState(who); st.place.done = true;
  st.skills["sums.3"] = { lvl: 2, streak: 0, n: 20, right: 12, recent: [1, 0, 1, 1, 0, 1, 1, 1, 0, 1], due: 0, gap: 0, recheck: null, stuckN: 3, stuckRight: 2, repairs: 0, parkedUntil: 0, first2: [1, 0] };
  st.skills["sums.1"] = { lvl: 3, streak: 0, n: 6, right: 5, recent: [1, 1, 1], due: 0, gap: 0, recheck: null, stuckN: 0, stuckRight: 0, repairs: 0, parkedUntil: 0, first2: [1, 1], learntAt: NOW - 2 * DAY };
  st.skills["sums.4"] = { lvl: 1, streak: 0, n: 12, right: 1, recent: [0, 0, 0, 0, 0, 0, 0, 0, 1, 0], due: 0, gap: 0, recheck: null, stuckN: 0, stuckRight: 0, repairs: 2, parkedUntil: NOW + 5 * DAY, first2: [0, 0] };
  const days = {}; days[E.dayKey(NOW)] = { n: answered, clean: Math.round(answered * .7), ms: answered * 9000, sets: 2, skills: {} };
  return { version: 2, coins: 40, game: { answered, sinceReward: 0, sincePlay: 0, rewardTurn: 0, bkt: { "sums.3": 0.42, "sums.1": 0.97 } }, days, engine: st };
}
const child = (who, name, entries, sv) => ({ who, name, save: sv === undefined ? save(who, 20) : sv, entries, M, engine: E, missLabel: MS.label });

// ---- most common wrong answers, skill by skill ----
{ const entries = [];
  for (let i = 0; i < 7; i++) entries.push(e(i, { g: 16, c: "slip" }));
  for (let i = 7; i < 12; i++) entries.push(e(i, { g: 14, c: "copied" }));
  entries.push(e(12, { g: 9, c: "guess", q: "5 + 4 = ?", a: 9 }));
  for (let i = 0; i < 8; i++) entries.push(e(20 + i, { ok: 1, g: 15, c: "", q: "6 + 9 = ?" }));
  entries.push(e(40, { s: "sums.4", q: "15 - 6 = ?", a: 9, g: 8, c: "slip" }));
  entries.push(e(41, { s: "parent", q: "my own question", g: 5, a: 4, c: "" }));
  entries.push(e(42, { t: NOW - 60 * DAY, g: 99, c: "guess" }));                          // too old
  const tw = PR.topWrong(entries, M, { now: NOW, days: 30 });
  ok("skills with most misses first", tw[0].skill === "sums.3" && tw[1].skill === "sums.4", tw.map(x => x.skill));
  ok("a parent's own questions are left out", !tw.some(x => x.skill === "parent"));
  ok("old answers are left out", !JSON.stringify(tw).includes("99"));
  ok("counts of misses and answers", tw[0].misses === 13 && tw[0].total === 21, [tw[0].misses, tw[0].total]);
  ok("wrong answers ranked by how often", tw[0].wrong[0].given === 16 && tw[0].wrong[0].count === 7 && tw[0].wrong[1].given === 14 && tw[0].wrong[1].count === 5, tw[0].wrong);
  ok("an example question is kept", tw[0].wrong[0].example === "8 + 7 = ?");
  ok("kinds of mistake are counted", tw[0].classes.slip === 7 && tw[0].classes.copied === 5, tw[0].classes);
  ok("at most 3 wrong answers per skill and 5 skills", tw[0].wrong.length <= 3 && tw.length <= 5);
  ok("a log with no misses gives nothing to show", PR.topWrong([e(1, { ok: 1, c: "" })], M, { now: NOW }).length === 0);
  ok("an empty log is fine", PR.topWrong([], M, { now: NOW }).length === 0);

  // ---- the weekly paragraph ----
  const w = PR.weekly(child("marie", "Marie", entries), NOW);
  ok("paragraph: days, answers, minutes", /In the last 7 days Marie played on 1 day and answered 20 questions, about 3 minutes in all\./.test(w), w);
  ok("paragraph: share right the first time", /70 out of 100 were right the first time\./.test(w), w);
  ok("paragraph: the most common kind of mistake", /Most wrong answers were where Marie was out by one or two \(8 of 14\)/.test(w), w);
  ok("paragraph: hint use", /used a hint on 0 questions|used a hint/.test(w) || !/hint/.test(w), w);
  ok("paragraph: new skills this week", /New skills reached "Knows it": [^.]*Adding to 10/.test(w), w);
  ok("paragraph: resting skills", /Resting for now because they were hard: [^.]*Taking away within 20/.test(w), w);
  ok("paragraph is plain: no jargon words", !/(empirical|converge|irreducible|load-bearing|structurally)/i.test(w));
  const hints = PR.weekly(child("marie", "Marie", [e(1, { h: 1 }), e(2, { h: 3 }), e(3, { h: 0, ok: 1, c: "" })]), NOW);
  ok("paragraph: hints counted, worked step counted separately", /used a hint on 2 questions, and the worked step on 1\./.test(hints), hints);
  ok("no play in the week", /has not played in the last 7 days/.test(PR.weekly(child("marie", "Marie", [], save("marie", 0)), NOW + 30 * DAY)));
  const none = PR.weekly(child("marie", "Marie", [e(1, { ok: 1, c: "" })]), NOW);
  ok("no wrong answers is said plainly", /There were no wrong answers\./.test(none), none);

  // ---- the whole report ----
  const secs = PR.sections([child("marie", "Marie", entries), child("kennedy", "Kennedy", [], save("kennedy", 8))], NOW);
  const titles = secs.map(s => s.title);
  ok("sections: title, each child, wrong answers, what to do", titles[0] === "Kids Maths report" && titles.includes("Marie") && titles.includes("Kennedy") && titles.includes("Marie: the most common wrong answers, last 30 days") && titles.includes("Marie: what you can do"), titles);
  ok("sections: a child with no answers says the record starts next play", secs.find(s => s.title.startsWith("Kennedy:")).lines[0].includes("No answers have been recorded yet"));
  const txt = PR.text([child("marie", "Marie", entries)], NOW);
  ok("text report is plain text with the facts", /^Kids Maths report\nMade on /.test(txt) && txt.includes("Marie gave 16 7 times, for example for 8 + 7 = ?.") && txt.includes("Kinds of mistake: was out by one or two (7)"), txt.slice(0, 600));
  ok("text report names a least-sure skill (the probability estimate)", /least sure[^\n]*Adding to 20 \(42 in 100\)/.test(txt), txt);
  ok("text report has no SIN, no email, no address", !/SIN|@|Heritage|\b\d{3} \d{3} \d{3}\b/.test(txt));
  ok("a missing save is said plainly", PR.text([child("marie", "Marie", [], null)], NOW).includes("No saved progress was found for Marie"));
  ok("the tips are plain and cover every kind of mistake", MS.CLASSES.every(c => PR.TIPS[c] && PR.TIPS[c].length > 30));
}

// ---- the progress file ----
const sv = save("marie", 20), sk = save("kennedy", 8), log = []; for (let i = 0; i < 30; i++) log.push(AL.clean(e(i)));
const text = PF.make({ marie: { save: sv, log }, kennedy: { save: sk, log: [] } }, NOW);
{ const p = PF.parse(text);
  ok("parse: a made file is read back", p.ok && Object.keys(p.children).join() === "marie,kennedy", p.error);
  ok("parse: summary says days, answers, coins", p.summary[0].answers === 30 && p.summary[0].coins === 40 && p.summary[0].days === 1, p.summary);
  ok("the file says what it is", JSON.parse(text).format === "kids_maths_progress" && JSON.parse(text).version === 1 && JSON.parse(text).madeAt === new Date(NOW).toISOString());
  ok("a save is never shared by reference", p.children.marie.save !== sv);
  for (const [name, bad] of [["empty", ""], ["not json", "{oops"], ["a list", "[]"], ["another format", '{"format":"other","version":1,"children":{}}'], ["newer version", JSON.stringify(Object.assign(JSON.parse(text), { version: 9 }))],
    ["no children", '{"format":"kids_maths_progress","version":1}'], ["children of nobody", '{"format":"kids_maths_progress","version":1,"children":{"bob":{"save":{}}}}'], ["a child with no save", '{"format":"kids_maths_progress","version":1,"children":{"marie":{"log":[]}}}']]) {
    const r = PF.parse(bad); ok(`parse refuses: ${name}`, !r.ok && r.error.length > 10 && !/[{}]/.test(r.error), r.error);
  }
  ok("parse refuses a huge text", !PF.parse("x".repeat(13 * 1024 * 1024)).ok);
  ok("a file with only one child is fine", PF.parse(PF.make({ kennedy: { save: sk, log: [] } }, NOW)).ok);
}
{ // apply: backup first, repair, write, log
  const st = fake(), KEYS = { saveKey: w => "kidsMaths.game." + w, logKey: w => "kidsMaths.game.log." + w };
  const ctx = Object.assign({ storage: st, makeEngine: E.createState, GameSave: GS, AnswerLog: AL, names: { marie: "Marie", kennedy: "Kennedy" } }, KEYS);
  st.setItem("kidsMaths.game.marie", JSON.stringify({ coins: 1, old: true }));
  const r = PF.apply(PF.parse(text), ctx, NOW);
  ok("apply: both children done", r.ok && r.done.length === 2 && !r.failed.length, r);
  const back = [...st.m.keys()].filter(k => k.includes(".before_file_load."));
  ok("apply: what was there is copied first", back.length === 1 && JSON.parse(st.getItem(back[0])).old === true, back);
  ok("apply: the new save is in place and checked", JSON.parse(st.getItem("kidsMaths.game.marie")).coins === 40 && JSON.parse(st.getItem("kidsMaths.game.marie")).version === GS.SCHEMA_VERSION);
  ok("apply: the log is in place", AL.open({ storage: st, key: "kidsMaths.game.log.marie" }).size() === 30);
  ok("apply: a child with no old save needs no copy", JSON.parse(st.getItem("kidsMaths.game.kennedy")).coins === 40 && back.length === 1);
  const odd = JSON.parse(text); delete odd.children.marie.save.game; odd.children.marie.save.engine = "junk"; odd.children.marie.save.coins = -5;
  const st2 = fake(), r2 = PF.apply(PF.parse(JSON.stringify(odd)), Object.assign({}, ctx, { storage: st2 }), NOW);
  const fixed = JSON.parse(st2.getItem("kidsMaths.game.marie"));
  ok("apply: a file with parts missing is repaired, not refused", r2.ok && fixed.coins === 0 && fixed.engine.profile === "marie" && typeof fixed.game.answered === "number" && /rebuilt/.test(r2.done[0]), [r2, fixed.coins]);
  // when the copy cannot be made nothing is replaced
  const st3 = fake(); st3.setItem("kidsMaths.game.marie", '{"coins":9}'); const real = st3.setItem; st3.setItem = (k, v) => { if (k.includes("before_file_load")) throw new Error("quota"); real(k, v); };
  const r3 = PF.apply(PF.parse(text), Object.assign({}, ctx, { storage: st3 }), NOW);
  ok("apply: no safe copy means no change", !r3.ok && r3.failed.some(x => /Marie.*safe copy/.test(x)) && st3.getItem("kidsMaths.game.marie") === '{"coins":9}', r3);
  ok("apply: a failed child does not stop the other one", r3.done.some(x => /Kennedy/.test(x)), r3);
  const st4 = fake(), real4 = st4.setItem; st4.setItem = () => { throw new Error("full"); };
  const r4 = PF.apply(PF.parse(text), Object.assign({}, ctx, { storage: st4 }), NOW);
  ok("apply: a full device is reported in plain words", !r4.ok && r4.failed.length === 2 && /could not be saved/.test(r4.failed[0]), r4);
  ok("apply: refuses an unusable parse", PF.apply({ ok: false }, ctx, NOW).ok === false);
}
console.log(`RESULT ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
