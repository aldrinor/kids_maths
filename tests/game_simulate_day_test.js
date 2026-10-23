/* game_simulate_day_test.js - checks tools/simulate_day.js: it runs, it prints the numbers a parent asked for, it reads the game's own rules,
   it uses real answer times from a progress file when given one, and it refuses bad input in plain words.
   Silent: prints only failures and one RESULT line. Run: node tests/game_simulate_day_test.js */
const path = require("path");
const fs = require("fs");
const os = require("os");
const { spawnSync } = require("child_process");
const TOOL = path.join(__dirname, "..", "tools", "simulate_day.js");
let pass = 0, fail = 0;
const ok = (name, cond, extra) => { cond ? pass++ : (fail++, console.log("FAIL " + name + (extra !== undefined ? " | " + JSON.stringify(extra) : ""))); };
const run = a => spawnSync(process.execPath, [TOOL, ...a], { encoding: "utf8" });

{ const r = run(["--days", "5", "--seed", "3"]);
  ok("runs and exits 0", r.status === 0, r.stderr);
  ok("states the game's own rules, read from index.html", /reward game every 5 answers; play world every 25 answers for 5 minutes; day limit 25 minutes/.test(r.stdout), r.stdout.slice(0, 300));
  ok("says what is assumed", /Assumptions: thinking time 20 seconds for a typed answer and 9 seconds for a tap/.test(r.stdout));
  for (const name of ["Marie", "Kennedy"]) {
    ok(`${name}: answers in a day`, new RegExp(`${name} \\([^)]*\\), 5 simulated days:[\\s\\S]*Answers in a day: about \\d+`).test(r.stdout));
  }
  ok("prints minutes per answer", (r.stdout.match(/Maths minutes per answer: about [\d.]+/g) || []).length === 2);
  ok("prints how often the world opens", (r.stdout.match(/The play world opens about [\d.]+ times a day/g) || []).length === 2);
  ok("prints how often the reward game opens", (r.stdout.match(/The reward game opens about [\d.]+ times a day/g) || []).length === 2);
  const a = r.stdout.match(/Answers in a day: about (\d+(?:\.\d+)?)/g).map(x => parseFloat(x.split("about ")[1]));
  ok("a day holds a believable number of answers (10 to 120)", a.every(x => x > 10 && x < 120), a);
  ok("not shown as a measurement", /not a measurement of a real child/.test(r.stdout));
  ok("same seed, same output", run(["--days", "5", "--seed", "3"]).stdout === r.stdout);
  ok("another seed differs", run(["--days", "5", "--seed", "4"]).stdout !== r.stdout);
}
{ const slow = run(["--child", "marie", "--days", "4", "--think-typed-secs", "60"]), quick = run(["--child", "marie", "--days", "4", "--think-typed-secs", "10"]);
  const n = r => +r.stdout.match(/Answers in a day: about (\d+(?:\.\d+)?)/)[1];
  ok("a slower child fits fewer answers in the day limit", n(slow) < n(quick), [n(slow), n(quick)]);
  ok("--child marie prints only Marie", /Marie/.test(slow.stdout) && !/Kennedy \(/.test(slow.stdout));
  const none = run(["--child", "kennedy", "--days", "3", "--world-secs", "0"]);
  ok("--child kennedy prints only Kennedy", /Kennedy/.test(none.stdout) && !/Marie \(/.test(none.stdout));
}
{ // real times from a progress file
  const PF = require(path.join(__dirname, "..", "game", "progress_file.js"));
  const log = []; for (let i = 0; i < 40; i++) log.push({ t: 1000 + i, s: "sums.3", q: "8 + 7 = ?", g: 15, a: 15, ok: 1, h: 0, r: 1, sc: "add", ms: 30000, k: "t", c: "", f: [] });
  const file = path.join(os.tmpdir(), "simulate_day_probe_progress.json");
  fs.writeFileSync(file, PF.make({ marie: { save: { coins: 1, days: {} }, log } }, Date.UTC(2026, 9, 22)));
  const r = run(["--child", "marie", "--days", "3", "--progress", file]);
  fs.unlinkSync(file);
  ok("a progress file gives real answer times", r.status === 0 && /Real times for marie: typed 30 seconds/.test(r.stdout) && /from 40 logged answers/.test(r.stdout), r.stdout.slice(0, 500) + r.stderr);
  ok("real times replace the assumption", /thinking time from the progress file/.test(r.stdout));
}
{ for (const [a, msg] of [[["--days", "x"], /needs a number/], [["--child", "bob"], /marie, kennedy or both/], [["--wat"], /unknown option/], [["--progress", "/no/such/file.json"], /./]]) {
    const r = run(a);
    ok(`bad input ${a.join(" ")} stops with a plain message`, r.status === 1 && msg.test(r.stderr) && r.stdout === "", r.stderr);
  }
  const bad = path.join(os.tmpdir(), "simulate_day_probe_bad.json"); fs.writeFileSync(bad, "nonsense");
  const r = run(["--progress", bad]); fs.unlinkSync(bad);
  ok("a file that is not a progress file is refused", r.status === 1 && /not a Kids Maths progress file/.test(r.stderr), r.stderr);
}
console.log(`RESULT ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
