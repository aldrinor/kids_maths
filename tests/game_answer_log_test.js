/* game_answer_log_test.js - checks game/answer_log.js (the record of every answer, kept apart from the main save).
   Silent: prints only failures and one RESULT line. Run: node tests/game_answer_log_test.js */
const path = require("path");
const AL = require(path.join(__dirname, "../game/answer_log.js"));
let pass = 0, fail = 0;
const ok = (name, cond, extra) => { cond ? pass++ : (fail++, console.log("FAIL " + name + (extra !== undefined ? " | " + JSON.stringify(extra) : ""))); };
const fake = () => { const m = new Map(); return { m, getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { m.set(k, String(v)); }, removeItem: k => { m.delete(k); } }; };
const KEY = "kidsMaths.game.log.marie";
const entry = (i, over) => Object.assign({ t: 1000 + i, s: "sums.3", q: "8 + 7 = ?", g: 14, a: 15, ok: 0, h: 1, r: 1, sc: "add", ms: 4200, k: "t", c: "slip", f: [] }, over || {});

{ // adding, reading back, and a second open sees the same entries
  const st = fake(), log = AL.open({ storage: st, key: KEY });
  ok("starts empty", log.size() === 0 && log.ok && !log.damaged);
  ok("add returns true", log.add(entry(1)) === true);
  log.add(entry(2, { ok: 1, g: 15, c: "" }));
  const again = AL.open({ storage: st, key: KEY });
  ok("saved and read back", again.size() === 2 && again.all()[0].q === "8 + 7 = ?" && again.all()[1].ok === 1, again.all());
  const e = again.all()[0];
  ok("every part of an entry is kept", e.t === 1001 && e.s === "sums.3" && e.g === 14 && e.a === 15 && e.h === 1 && e.r === 1 && e.sc === "add" && e.ms === 4200 && e.k === "t" && e.c === "slip", e);
}
{ // cap: a ring buffer that keeps the newest
  const st = fake(), log = AL.open({ storage: st, key: KEY, max: 50 });
  for (let i = 0; i < 120; i++) log.add(entry(i));
  ok("ring buffer keeps at most max", log.size() === 50);
  ok("ring buffer keeps the newest", log.all()[0].t === 1000 + 70 && log.all()[49].t === 1000 + 119, [log.all()[0].t, log.all()[49].t]);
  ok("default cap is 3000", AL.DEFAULT_MAX === 3000);
  const big = AL.open({ storage: fake(), key: KEY });
  for (let i = 0; i < 3100; i++) big.entries.push(AL.clean(entry(i)));
  big.add(entry(3100));
  ok("3101 entries cut to 3000", big.size() === 3000 && big.all()[2999].t === 1000 + 3100);
}
{ // size per entry stays small enough for 3000 in localStorage
  const st = fake(), log = AL.open({ storage: st, key: KEY, max: 3000 });
  for (let i = 0; i < 3000; i++) log.add(entry(i));
  const bytes = st.getItem(KEY).length;
  ok("3000 entries fit well under 1 MB", bytes < 1000000, bytes);
}
{ // damaged log: copied, fresh log started, main play unaffected
  for (const raw of ['{"v":1,"e":[{"t":1', "", "null", "[1,2]", '{"v":1,"e":"x"}']) {
    const st = fake(); st.setItem(KEY, raw);
    const log = AL.open({ storage: st, key: KEY });
    ok(`damaged log (${raw.slice(0, 12)}): flagged and empty`, log.damaged === true && log.size() === 0, log.damaged);
    ok(`damaged log (${raw.slice(0, 12)}): raw text copied`, log.copyKey && st.getItem(log.copyKey) === raw, log.copyKey);
    ok(`damaged log (${raw.slice(0, 12)}): the main key still holds the old text until the next answer`, st.getItem(KEY) === raw);
    ok(`damaged log (${raw.slice(0, 12)}): add still works`, log.add(entry(1)) === true && AL.open({ storage: st, key: KEY }).size() === 1);
  }
}
{ // parts of a log that are odd are dropped, the rest kept
  const st = fake();
  st.setItem(KEY, JSON.stringify({ v: 1, e: [entry(1), { t: "x" }, null, 5, { t: 5, s: 7 }, entry(2, { h: 99, ms: -5, g: "abc" })] }));
  const log = AL.open({ storage: st, key: KEY });
  ok("odd entries dropped", log.size() === 2, log.all());
  ok("odd values made safe", log.all()[1].h === 3 && log.all()[1].ms === 0 && log.all()[1].g === null, log.all()[1]);
  ok("a log that was read is not flagged damaged", log.damaged === false);
}
{ // a storage that throws: play goes on, the log lives in memory
  const st = fake(); st.setItem = () => { throw new Error("quota"); };
  const log = AL.open({ storage: st, key: KEY });
  ok("write failure does not throw", (() => { try { log.add(entry(1)); return true; } catch (e) { return false; } })());
  ok("write failure is reported, entry kept in memory", log.ok === false && log.size() === 1);
  const dead = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); } };
  const l2 = AL.open({ storage: dead, key: KEY });
  ok("unreadable storage: empty log, not a crash", l2.size() === 0 && l2.ok === false && (() => { try { l2.add(entry(1)); return true; } catch (e) { return false; } })());
}
{ // full device: the oldest tenth goes, the new entry is kept
  const st = fake(); let full = false, real = st.setItem;
  st.setItem = (k, v) => { if (full) { full = false; throw new Error("quota"); } real(k, v); };
  const log = AL.open({ storage: st, key: KEY, max: 100 });
  for (let i = 0; i < 100; i++) log.add(entry(i));
  full = true; log.add(entry(100));
  ok("full device: retried after letting go of the oldest", log.ok === true && log.size() === 90 && log.all()[89].t === 1100, log.size());
}
{ // replaceAll (loading a progress file) and bad entries
  const st = fake(), log = AL.open({ storage: st, key: KEY, max: 5 });
  log.replaceAll([entry(1), entry(2), entry(3), entry(4), entry(5), entry(6), { bad: 1 }]);
  ok("replaceAll keeps the newest max valid entries", log.size() === 5 && log.all()[0].t === 1002, log.all().map(e => e.t));
  ok("replaceAll with junk gives an empty log", AL.open({ storage: fake(), key: KEY }).replaceAll("x") === true);
}
console.log(`RESULT ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
