/* game_save_test.js - checks game/game_save.js and game/choice_evidence.js with a fake storage and the real engine.
   Corrupt, empty and old-shape saves; backups that are never overwritten; plain-words notes; a failed write;
   and the rule that lucky taps on a choice question cannot mark a skill known.
   Silent: prints only failures and one RESULT line. Run: node tests/game_save_test.js */
const path = require("path");
global.window = global;
global.document = { createElement: () => ({ style: {} }), querySelector: () => null, getElementById: () => null, addEventListener: () => {}, head: { appendChild() {} } };
const E = require(path.join(__dirname, "../modules/engine.js"));
require(path.join(__dirname, "../topics/kinder.js"));
const KS = require(path.join(__dirname, "../game/stories.js"));
const GS = require(path.join(__dirname, "../game/game_save.js"));
const CE = require(path.join(__dirname, "../game/choice_evidence.js"));

let pass = 0, fail = 0;
const ok = (name, cond, extra) => { cond ? pass++ : (fail++, console.log("FAIL " + name + (extra !== undefined ? " | " + JSON.stringify(extra) : ""))); };
const fake = () => { const m = new Map(); return { m, getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { m.set(k, String(v)); }, removeItem: k => { m.delete(k); } }; };
const NOW = Date.UTC(2026, 9, 22, 12, 0, 0), KEY = "kidsMaths.game.marie";
const load = (st, extra) => GS.load(Object.assign({ storage: st, key: KEY, who: "marie", now: NOW, makeEngine: E.createState, importOld: () => ({ coins: 7 }) }, extra || {}));
const keysLike = (st, s) => [...st.m.keys()].filter(k => k.includes(s));

/* a damaged save: copied first, never overwritten, the parent told in plain words */
for (const [label, raw] of [["cut-off json", '{"coins": 12, "engi'], ["empty text", ""], ["the word null", "null"], ["a list", "[1,2]"], ["a number", "5"]]) {
  const st = fake(); st.setItem(KEY, raw);
  const r = load(st);
  ok(`damaged (${label}): status`, r.status === "damaged", r.status);
  ok(`damaged (${label}): main key untouched by load`, st.getItem(KEY) === raw);
  const bk = keysLike(st, ".damaged.");
  ok(`damaged (${label}): one backup holds the raw text`, bk.length === 1 && st.getItem(bk[0]) === raw, bk);
  ok(`damaged (${label}): a usable fresh save`, r.p && r.p.version === GS.SCHEMA_VERSION && r.p.engine.profile === "marie" && r.p.coins === 7 && Array.isArray(r.p.engine.sets));
  ok(`damaged (${label}): plain note names the child`, r.notes.length === 1 && /Marie/.test(r.notes[0]) && /safe copy/.test(r.notes[0]), r.notes);
  const r2 = load(st);                                                       // the same damage again: the same copy is reused, not a pile of copies
  ok(`damaged (${label}): second load reuses the copy`, keysLike(st, ".damaged.").length === 1 && st.getItem(keysLike(st, ".damaged.")[0]) === raw);
  st.setItem(KEY, raw + " "); load(st);                                      // different damage: a second copy; the first is kept
  ok(`damaged (${label}): different damage keeps both copies`, keysLike(st, ".damaged.").length === 2 && st.getItem(keysLike(st, ".damaged.").find(k => st.getItem(k) === raw)) === raw);
  ok(`damaged (${label}): not blocked`, r.blocked === false && r2.blocked === false);
}
{ // the copy cannot be made: nothing may be written over the old save
  const st = fake(); st.setItem(KEY, "{broken"); const real = st.setItem; st.setItem = (k, v) => { if (k.includes(".damaged.")) throw new Error("quota"); real(k, v); };
  const r = load(st);
  ok("backup fails: blocked, main key still the old text", r.blocked === true && st.getItem(KEY) === "{broken" && /not be|could not/.test(r.notes[0]), r);
}
{ // storage that cannot even be read
  const st = fake(); st.getItem = () => { throw new Error("blocked"); };
  const r = load(st);
  ok("unreadable storage: blocked, plain note, fresh state", r.blocked && r.p.engine.profile === "marie" && r.notes.length === 1, r.notes);
}

{ // a start that had to be redone: the old save is copied once and never written over
  const st = fake(); const good = load(fake()).p; good.coins = 77; const raw = JSON.stringify(good); st.setItem(KEY, raw);
  const r = load(st, { forceFresh: true }), r2 = load(st, { forceFresh: true });
  ok("forced fresh: blocked, one copy, old save untouched, parent told", r.blocked && r2.blocked && st.getItem(KEY) === raw && keysLike(st, ".damaged.").length === 1 && /will not be saved/.test(r.notes[0]), r.notes);
  ok("forced fresh: the fresh state is empty", r.p.coins === 7);
}

/* an empty object and saves with missing parts are rebuilt */
{
  const st = fake(); st.setItem(KEY, "{}");
  const r = load(st);
  ok("empty object: repaired, complete", r.status === "repaired" && r.p.coins === 0 && r.p.game.answered === 0 && r.p.engine.profile === "marie" && r.p.version === 2, r.status);
  ok("empty object: copy kept and parent told", keysLike(st, ".before_repair.").length === 1 && r.notes.length === 1);
}
{
  const bad = { version: 2, coins: "lots", game: { answered: "x", sinceReward: -3, sincePlay: 2.7 }, days: { "2026-10-20": "oops", "2026-10-21": { n: 3 } },
    engine: { v: 1, profile: "marie", skills: { "sums.1": { lvl: 2 }, "sums.2": null }, sets: "no", place: null }, world: 5, parentLog: {}, limitMin: -4 };
  const st = fake(); st.setItem(KEY, JSON.stringify(bad));
  const r = load(st), p = r.p;
  ok("missing fields: counters whole numbers", p.coins === 0 && p.game.answered === 0 && p.game.sinceReward === 0 && p.game.sincePlay === 2 && p.game.rewardTurn === 0, p.game);
  ok("missing fields: days rebuilt", !p.days["2026-10-20"] && p.days["2026-10-21"].n === 3 && p.days["2026-10-21"].ms === 0 && typeof p.days["2026-10-21"].skills === "object");
  ok("missing fields: engine parts rebuilt", Array.isArray(p.engine.sets) && p.engine.place && p.engine.place.done === false && Array.isArray(p.engine.parentQs) && p.engine.skills["sums.1"].recent.length === 0 && p.engine.skills["sums.1"].lvl === 2 && !p.engine.skills["sums.2"]);
  ok("missing fields: bad optional parts dropped", p.world === undefined && p.parentLog === undefined && p.limitMin === undefined);
  const M = E.buildSkillMap(window.MathTopics.filter(t => t.id === "kinder"), KS.extraSkills()); M.order.forEach(id => { M.map[id].ready = KS.SKILLS.includes(id); });
  let threw = null; try { const s = E.nextSet(p.engine, M, NOW, Math.random); E.record(p.engine, M, { skill: "sums.1", correct: true, helped: false }, NOW); E.report(p.engine, M, NOW); } catch (e) { threw = e.message; }
  ok("missing fields: the engine runs on the rebuilt save", threw === null, threw);
  ok("missing fields: plain note lists what was rebuilt", r.notes.length === 1 && /rebuilt/.test(r.notes[0]), r.notes);
}
{ // wrong child's engine
  const st = fake(); const other = E.createState("kennedy"); st.setItem(KEY, JSON.stringify({ version: 2, coins: 5, game: {}, days: {}, engine: other }));
  const r = load(st);
  ok("engine of another child is replaced", r.p.engine.profile === "marie" && r.p.coins === 5);
}

/* an old-shape save (no version number): kept as it is, stamped, one copy of the old shape */
{
  const old = { coins: 41, game: { answered: 9, sinceReward: 4, sincePlay: 9, rewardTurn: 2 }, days: { "2026-10-21": { n: 9, clean: 7, ms: 60000, sets: 1, skills: {} } }, engine: E.createState("marie"), home: [{ uid: 1 }] };
  const raw = JSON.stringify(old), st = fake(); st.setItem(KEY, raw);
  const r = load(st);
  ok("old shape: migrated, same numbers", r.status === "migrated" && r.p.coins === 41 && r.p.game.answered === 9 && r.p.game.sinceReward === 4 && r.p.home.length === 1, r.status);
  ok("old shape: version number set", r.p.version === GS.SCHEMA_VERSION);
  ok("old shape: one copy of the old text kept, no scary note", keysLike(st, ".before_version_2.").length === 1 && st.getItem(keysLike(st, ".before_version_2.")[0]) === raw && r.notes.length === 0, r.notes);
}
{ // a save from a newer game version is not downgraded
  const st = fake(); const raw = JSON.stringify({ version: 99, coins: 3, game: {}, days: {}, engine: E.createState("marie"), futureThing: 1 }); st.setItem(KEY, raw);
  const r = load(st);
  ok("newer version: kept as is with a copy and a note", r.p.version === 99 && r.p.futureThing === 1 && keysLike(st, ".from_newer_version.").length === 1 && r.notes.length === 1);
}
{ // a good current save loads without noise
  const st = fake(); const good = load(fake()).p; st.setItem(KEY, JSON.stringify(good));
  const r = load(st);
  ok("good save: ok, no note, no backup", r.status === "ok" && r.notes.length === 0 && [...st.m.keys()].length === 1, r.status);
}
{ // first time: the old app's numbers come in
  const r = load(fake());
  ok("new child: starts from the old app import", r.status === "new" && r.p.coins === 7 && r.p.engine.profile === "marie");
}

/* writing */
{
  const st = fake(); const p = load(st).p;
  ok("write ok", GS.write(st, KEY, p).ok === true && JSON.parse(st.getItem(KEY)).version === 2);
  st.setItem = () => { throw new Error("QuotaExceededError"); };
  const w = GS.write(st, KEY, p);
  ok("write failure is reported", w.ok === false && /Quota/.test(w.error), w);
}
{ // notes
  const st = fake(); GS.addNote(st, "marie", "one", NOW); GS.addNote(st, "kennedy", "two", NOW);
  ok("notes kept", GS.notes(st).length === 2);
  GS.clearNotes(st, ["one"]); ok("one note cleared", GS.notes(st).length === 1 && GS.notes(st)[0].text === "two");
  GS.clearNotes(st); ok("all notes cleared", GS.notes(st).length === 0);
  ok("read notes are kept in a history", JSON.parse(st.getItem(GS.NOTES_READ_KEY)).map(n => n.text).join() === "one,two");
}

/* two lucky taps on a three-choice question cannot mark a skill known (item 17) */
{
  const M = E.buildSkillMap(window.MathTopics.filter(t => t.id === "kinder"), KS.extraSkills()); M.order.forEach(id => { M.map[id].ready = KS.SKILLS.includes(id); });
  const need = { marie: 4, kennedy: 3 };
  const run = (who, kinds, guarded) => {
    const st = E.createState(who), game = {}; let now = NOW; const lv = [];
    for (const kind of kinds) {
      const g = CE.before(st, "sums.1");
      E.record(st, M, { skill: "sums.1", correct: true, helped: false, taught: false, rush: false }, now += 20000);
      if (guarded) CE.after(g, st, game, { skill: "sums.1", kind, clean: true, rush: false, need: need[who] });
      lv.push(st.skills["sums.1"].lvl);
    }
    return { lv, st, game };
  };
  const bare = run("kennedy", ["choice", "choice"], false);
  ok("without the guard two lucky taps would mark it known (the problem)", bare.lv[1] === E.LV.KNOWS, bare.lv);
  const g2 = run("kennedy", ["choice", "choice"], true);
  ok("with the guard two choice taps do not", g2.lv[1] < E.LV.KNOWS && g2.st.skills["sums.1"].n === 2 && g2.st.skills["sums.1"].right === 2, g2.lv);
  const g5 = run("kennedy", ["choice", "choice", "choice", "choice", "choice"], true);
  ok("kennedy: 5 clean choice answers in a row do", g5.lv.slice(0, 4).every(v => v < E.LV.KNOWS) && g5.lv[4] === E.LV.KNOWS, g5.lv);
  const m6 = run("marie", ["choice", "choice", "choice", "choice", "choice", "choice"], true);
  ok("marie: 6 clean choice answers in a row do, 5 do not", m6.lv.slice(0, 5).every(v => v < E.LV.KNOWS) && m6.lv[5] === E.LV.KNOWS, m6.lv);
  const t2 = run("kennedy", ["typed", "typed"], true);
  ok("typed answers count in full (2 typed in a row still pass)", t2.lv[1] === E.LV.KNOWS, t2.lv);
  const mix = run("kennedy", ["choice", "typed", "choice"], true);
  ok("one typed answer is full evidence", mix.lv[2] === E.LV.KNOWS || mix.lv[1] === E.LV.KNOWS, mix.lv);
  // a miss resets the evidence
  const st = E.createState("kennedy"), game = {};
  for (const [kind, clean] of [["choice", true], ["choice", true], ["choice", false], ["choice", true], ["choice", true], ["choice", true]]) {
    const g = CE.before(st, "sums.1"); E.record(st, M, { skill: "sums.1", correct: clean, helped: false, taught: false, rush: false }, NOW + 1000); CE.after(g, st, game, { skill: "sums.1", kind, clean, rush: false, need: 3 });
  }
  ok("a miss starts the count again", st.skills["sums.1"].lvl < E.LV.KNOWS && game.evidence["sums.1"] === 3, game.evidence);
}

console.log(`RESULT ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
