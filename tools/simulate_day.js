/* simulate_day.js - simulate days of play for each child with the REAL engine and the REAL game skill map, and print plain numbers:
 * how many answers fit in a day, minutes per answer, how often the reward game and the play world open, and how much of the day is lessons.
 * Plain Node, no browser, no sound, no secrets, nothing is written anywhere.
 *
 *   node tools/simulate_day.js                       both children, 14 days, built-in time assumptions
 *   node tools/simulate_day.js --child marie --days 30 --seed 7
 *   node tools/simulate_day.js --progress kids_maths_progress_2026-10-22.json     use the REAL answer times from a progress file
 *   node tools/simulate_day.js --reward-secs 60 --world-secs 240 --lesson-secs 25  change any time assumption
 *
 * What is real: the engine (which skill comes next), the skill map, and the game's own rules for the reward game (every 5 answers),
 * the play world (every 25 answers, the counter carries over from day to day) and the daily limit, which are READ from game/index.html
 * so this tool cannot drift from the game. If they cannot be read the tool stops and says so.
 * What is assumed (and printed, so nobody mistakes it for a measurement): how long a child thinks per answer, how long speech and a lesson take,
 * how long a reward game and the world last, and how often a child knows a skill. Give --progress to replace the thinking time by real data.
 * The day limit counts maths time only (answers and lessons); reward games and the world do not use it up, as in the game.
 */
"use strict";
const GAME_MIX = (() => { const m = /altRepair:\s*true,\s*mix:\s*(\d+)/.exec(require("fs").readFileSync(require("path").join(__dirname, "..", "game", "index.html"), "utf8")); return m ? Number(m[1]) : 0; })();   // the game's own setting, read so the tool cannot drift (SIM_NO_MIX=1 turns it off to compare)
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
global.window = global;
global.document = { createElement: () => ({ style: {} }), querySelector: () => null, getElementById: () => null, addEventListener: () => {}, head: { appendChild() {} } };
const E = require(path.join(ROOT, "modules", "engine.js"));
require(path.join(ROOT, "topics", "kinder.js"));
const KS = require(path.join(ROOT, "game", "stories.js"));

/* ---------- the rules of the game, read from game/index.html ---------- */
function readGameRules() {
  const html = fs.readFileSync(path.join(ROOT, "game", "index.html"), "utf8");
  const m = html.match(/const DAY_LIMIT_MIN = (\d+), REWARD_EVERY = (\d+), PLAY_EVERY = (\d+);/), w = html.match(/PlayWorlds\.open\(document\.body, \{ theme, minutes: (\d+)/);
  if (!m || !w) throw new Error("simulate_day: could not read DAY_LIMIT_MIN, REWARD_EVERY, PLAY_EVERY and the world minutes from game/index.html. The game changed shape; fix this tool.");
  return { dayLimitMin: +m[1], rewardEvery: +m[2], playEvery: +m[3], worldMin: +w[1] };
}
const STREAK_NEED = { marie: 4, kennedy: 3 };           // the same numbers as PROFILES in game/index.html
const THEME = { marie: "cafe", kennedy: "castle" };

/* ---------- command line ---------- */
function args(argv) {
  const o = { child: "both", days: 14, seed: 1, progress: "", thinkTyped: 20, thinkTap: 9, speechSecs: 10, lessonSecs: 35, rewardSecs: 90, worldSecs: 0,
    ability: { marie: 2, kennedy: 0 }, slip: 0.08, learnAfter: 5 };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i], v = argv[i + 1], num = () => { const n = Number(v); if (!Number.isFinite(n) || n < 0) throw new Error(`simulate_day: ${k} needs a number, got "${v}"`); i++; return n; };
    if (k === "--child") { if (!["marie", "kennedy", "both"].includes(v)) throw new Error("simulate_day: --child is marie, kennedy or both"); o.child = v; i++; }
    else if (k === "--days") o.days = Math.max(1, Math.round(num()));
    else if (k === "--seed") o.seed = num();
    else if (k === "--progress") { o.progress = v; i++; }
    else if (k === "--think-typed-secs") o.thinkTyped = num();
    else if (k === "--think-tap-secs") o.thinkTap = num();
    else if (k === "--speech-secs") o.speechSecs = num();
    else if (k === "--lesson-secs") o.lessonSecs = num();
    else if (k === "--reward-secs") o.rewardSecs = num();
    else if (k === "--world-secs") o.worldSecs = num();
    else if (k === "--ability-marie") o.ability.marie = num();
    else if (k === "--ability-kennedy") o.ability.kennedy = num();
    else if (k === "--slip") o.slip = num();
    else if (k === "--learn-after") o.learnAfter = Math.max(1, Math.round(num()));
    else if (k === "--help" || k === "-h") { console.log(fs.readFileSync(__filename, "utf8").split("*/")[0]); process.exit(0); }
    else throw new Error(`simulate_day: unknown option ${k}`);
  }
  return o;
}
function seeded(seed) { let s = (seed * 2654435761) >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const median = xs => { if (!xs.length) return 0; const a = xs.slice().sort((x, y) => x - y), m = Math.floor(a.length / 2); return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2; };

/* real thinking times from a progress file (the answer log), per child; a plain error if the file is not usable */
function realTimes(file) {
  const text = fs.readFileSync(file, "utf8");
  const PF = require(path.join(ROOT, "game", "progress_file.js")), r = PF.parse(text);
  if (!r.ok) throw new Error("simulate_day: " + r.error);
  const out = {};
  for (const who of Object.keys(r.children)) {
    const log = r.children[who].log.filter(e => e && e.s !== "parent" && Number.isFinite(e.ms) && e.ms > 0 && e.ms < 120000);
    if (log.length >= 20) out[who] = { n: log.length, typed: median(log.filter(e => e.k === "t").map(e => e.ms)) / 1000, tap: median(log.filter(e => e.k === "c").map(e => e.ms)) / 1000 };
  }
  return out;
}

/* ---------- one child, many days ---------- */
function simulate(who, o, rules, real) {
  const theme = THEME[who], rng = seeded(o.seed + (who === "kennedy" ? 1000 : 0));
  const M = E.buildSkillMap((window.MathTopics || []).filter(t => t.id === "kinder"), KS.extraSkills());
  M.order.forEach(id => { M.map[id].ready = KS.SKILLS.includes(id) && KS.fits(id, theme) && !KS.optional(id); });   // the optional counting skills are off unless a grown-up or the record asks (counting_need.js)
  M.order.forEach(id => { M.map[id].needs = M.map[id].needs.filter(n => M.map[n] && M.map[n].ready); });
  const st = E.createState(who), practice = {}, ability = o.ability[who];
  const think = (kind) => { const r = real && real[who]; const v = kind === "choice" ? (r && r.tap) || o.thinkTap : (r && r.typed) || o.thinkTyped; return v; };
  const knows = id => M.map[id].grade <= ability || (practice[id] || 0) >= o.learnAfter;
  const correct = (id, kind) => { practice[id] = (practice[id] || 0) + 1; return knows(id) ? rng() > o.slip : rng() < (kind === "choice" ? 0.34 : 0.08); };
  const need = STREAK_NEED[who], evidence = {};
  const t0 = Date.UTC(2026, 9, 22, 16);
  let sinceReward = 0, sincePlay = 0;
  const days = [];
  for (let d = 0; d < o.days; d++) {
    const day = { answers: 0, misses: 0, mathsSecs: 0, rewardGames: 0, worlds: 0, lessonSecs: 0, repairAlt: 0 };
    let now = t0 + d * E.DAY, guard = 0;
    while (day.mathsSecs < rules.dayLimitMin * 60 && guard++ < 400) {
      const set = E.nextSet(st, M, now, rng, { altRepair: true, mix: process.env.SIM_NO_MIX ? 0 : GAME_MIX });
      if (!set.items.length) break;
      if (set.alt) day.repairAlt++;
      let si = 0;
      while (si < set.items.length && day.mathsSecs < rules.dayLimitMin * 60) {
        const id = set.items[si++]; if (typeof id !== "string") continue;
        let q; try { q = KS.make(id, theme, rng, ""); } catch (e) { continue; }
        const kind = q.kind, secs = think(kind) + o.speechSecs;
        let ok = correct(id, kind), taught = false;
        day.mathsSecs += secs; now += secs * 1000;
        if (!ok) { day.misses++; taught = true; day.mathsSecs += o.lessonSecs; day.lessonSecs += o.lessonSecs; now += o.lessonSecs * 1000; ok = correct(id, kind); day.mathsSecs += secs; now += secs * 1000; }   // the lesson, then a new question
        if (set.kind === "place") E.placementRecord(st, M, id, ok && !taught); else {
          const before = JSON.parse(JSON.stringify(st.skills[id] || null));
          E.record(st, M, { skill: id, correct: ok, helped: taught, taught, rush: false }, now);
          if (kind === "choice" && st.skills[id] && before && before.lvl < 3 && st.skills[id].lvl >= 3) {                 // the game asks for more evidence on tap questions
            const ev = evidence[id] = ok && !taught ? (evidence[id] || 0) + 1 : 0;
            if (ev < need + 2) { const s = st.skills[id]; s.lvl = before.lvl; s.learntAt = before.learntAt; s.gap = before.gap; s.due = before.due; s.repairs = before.repairs; s.streak = before.streak + 1; }
          } else if (kind === "choice") evidence[id] = ok && !taught ? (evidence[id] || 0) + 1 : 0;
        }
        day.answers++; sinceReward++; sincePlay++;
        if (sinceReward >= rules.rewardEvery) { day.rewardGames++; sinceReward = 0; }
        if (sincePlay >= rules.playEvery) { day.worlds++; sincePlay = 0; }
      }
      if (!st.place.done && d >= 2) E.finishPlacement(st, M, now);
    }
    days.push(day);
  }
  const known = M.order.filter(id => M.map[id].ready && st.skills[id] && st.skills[id].lvl >= 3).length;
  return { days, known, ready: M.order.filter(id => M.map[id].ready).length, placementDone: st.place.done };
}

function report(who, o, rules, real, sim) {
  const name = who === "marie" ? "Marie" : "Kennedy", n = sim.days.length, sum = k => sim.days.reduce((a, d) => a + d[k], 0);
  const answers = sum("answers"), maths = sum("mathsSecs"), rewards = sum("rewardGames"), worlds = sum("worlds"), lesson = sum("lessonSecs");
  const playSecs = rewards * o.rewardSecs + worlds * (o.worldSecs || rules.worldMin * 60), all = maths + playSecs;
  const f = (x, d = 1) => (Math.round(x * 10 ** d) / 10 ** d).toString();
  const lines = [`${name} (${THEME[who] === "cafe" ? "Kitty Cafe" : "Knight Castle"}), ${n} simulated days:`,
    `  Answers in a day: about ${f(answers / n)}.  The most in one day: ${Math.max(...sim.days.map(d => d.answers))}.  The least: ${Math.min(...sim.days.map(d => d.answers))}.`,
    `  Maths minutes per answer: about ${f(maths / 60 / Math.max(1, answers), 2)} (this counts thinking, speech and lessons).`,
    `  A day of maths takes ${f(maths / 60 / n)} minutes (the day limit is ${rules.dayLimitMin}). With reward games and the play world the whole visit takes about ${f(all / 60 / n)} minutes.`,
    `  The reward game opens about ${f(rewards / n)} times a day (every ${rules.rewardEvery} answers).`,
    `  The play world opens about ${f(worlds / n, 2)} times a day (every ${rules.playEvery} answers). That is one visit every ${worlds ? f(n / worlds) : "more than " + n} days.`,
    `  Wrong first answers: ${f(sum("misses") / Math.max(1, answers) * 100, 0)} in every 100. Lessons use ${f(lesson / Math.max(1, maths) * 100, 0)} in every 100 minutes of maths.`,
    `  Second-picture repair rounds: ${sum("repairAlt")} sets in ${n} days.`,
    `  After ${n} days: ${sim.known} of ${sim.ready} skills are "Knows it" or better. The first level check ${sim.placementDone ? "is finished" : "is not finished"}.`];
  const worldDays = sim.days.filter(d => d.worlds > 0).length;
  lines.push(`  Days with a play world visit: ${worldDays} of ${n}.${worldDays === 0 ? " With this pace the world never opens: the 25-answer rule may be too slow." : ""}`);
  return lines.join("\n");
}

function main() {
  const o = args(process.argv.slice(2)), rules = readGameRules();
  const real = o.progress ? realTimes(o.progress) : null;
  const out = [];
  out.push("Kids Maths: simulated days (not a measurement of a real child).");
  out.push(`Game rules, read from game/index.html: reward game every ${rules.rewardEvery} answers; play world every ${rules.playEvery} answers for ${rules.worldMin} minutes; day limit ${rules.dayLimitMin} minutes of maths.`);
  out.push(`Assumptions: thinking time ${real ? "from the progress file (real answer times)" : `${o.thinkTyped} seconds for a typed answer and ${o.thinkTap} seconds for a tap`}; speech ${o.speechSecs} seconds; a lesson ${o.lessonSecs} seconds; a reward game ${o.rewardSecs} seconds; the world ${o.worldSecs || rules.worldMin * 60} seconds.`);
  if (real) for (const w of Object.keys(real)) out.push(`  Real times for ${w}: typed ${Math.round(real[w].typed)} seconds, tap ${Math.round(real[w].tap)} seconds, from ${real[w].n} logged answers.`);
  out.push(`The child is simulated as: knows every skill up to grade ${o.ability.marie} (Marie) and ${o.ability.kennedy} (Kennedy), slips ${Math.round(o.slip * 100)} in 100, learns a new skill after ${o.learnAfter} tries. Seed ${o.seed}.`);
  out.push("");
  for (const who of ["marie", "kennedy"]) if (o.child === "both" || o.child === who) out.push(report(who, o, rules, real, simulate(who, o, rules, real)), "");
  console.log(out.join("\n"));
}
try { main(); } catch (e) { console.error(e.message); process.exit(1); }
