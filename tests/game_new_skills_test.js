/* game_new_skills_test.js - checks the skills added on 22 Oct 2026 (plan items 23 and 24) in game/stories.js and game/counting_need.js:
 *   kinder.bonds (number bonds to 9), knight_pattern.1 (AB and ABB patterns, tap a picture), knight_size.1 (longest, shortest, tallest),
 *   cafe_count.1 and cafe_count.2 (Marie taps each thing: optional), cafe_pattern.1 (number patterns, a Grade 3 gap).
 * Every question each kind can make is built and checked: the answer is worked out here from the numbers (not read from stories.js),
 * the scene never carries the answer, every picture file exists, every spoken sentence is in KS.sentences() (so it can have a voice clip).
 * Run: node tests/game_new_skills_test.js     Prints only failures and one RESULT line. No browser, no sound. */
"use strict";
const fs = require("fs");
const path = require("path");
const KS = require(path.join(__dirname, "..", "game", "stories.js"));
const CN = require(path.join(__dirname, "..", "game", "counting_need.js"));
const GAME = path.join(__dirname, "..", "game");

let total = 0, passed = 0;
const failures = [];
function check(name, problems) { total++; if (!problems.length) passed++; else failures.push(`FAIL ${name} (${problems.length}): ${problems[0]}`); }
const MINUS = "−";
const BANNED = /\b(kill|killed|hurt|blood|die|dies|died|dead|hit|hits|fight|fights|attack|shoot|shot|weapon|stab|war|beat|defeat|hate|scare|scared|angry|bad|cry|crying)\b/i;
const wordsIn = s => s.split(/\s+/).filter(Boolean).length;
const splitPieces = t => t.split(/\d+/).map(x => x.trim()).filter(Boolean);
const sentenceSet = new Set(KS.sentences()), pieceSet = new Set(KS.pieces());
const SCENE_ACTS = new Set(KS.SCENE_ACTS);
const NEW = ["kinder.bonds", "knight_pattern.1", "knight_size.1", "cafe_count.1", "cafe_count.2", "cafe_pattern.1", "cafe_time.2"];
const THEME = { "kinder.bonds": "castle", "knight_pattern.1": "castle", "knight_size.1": "castle", "cafe_count.1": "cafe", "cafe_count.2": "cafe", "cafe_pattern.1": "cafe", "cafe_time.2": "cafe" };

// ---------- the list of skills ----------
check("new kinds exist and are skills", NEW.filter(id => !KS.KIND_IDS.includes(id) || !KS.SKILLS.includes(id)));
check("theme of each new kind", NEW.filter(id => KS.kindTheme(id) !== THEME[id]));
check("fits: only the child's own theme", NEW.filter(id => KS.fits(id, THEME[id]) !== true || KS.fits(id, THEME[id] === "cafe" ? "castle" : "cafe") === true));
check("optional kinds are the two counting skills", ["cafe_count.1", "cafe_count.2"].filter(id => !KS.optional(id)).concat(NEW.filter(id => !id.startsWith("cafe_count") && KS.optional(id))));
check("the counting skills never fit Kennedy", ["cafe_count.1", "cafe_count.2"].filter(id => KS.fits(id, "castle")));
check("extra skills carry the new kinds", NEW.filter(id => { const e = KS.extraSkills().find(x => x.id === id); return !e || !e.name || !Number.isFinite(e.grade) || !e.group || !Array.isArray(e.needs) || e.play.src !== "story"; }));
check("needs point to skills that exist", KS.extraSkills().filter(e => NEW.includes(e.id)).flatMap(e => e.needs.filter(n => !KS.SKILLS.includes(n) && !/^sums\.|^kinder\./.test(n)).map(n => e.id + " needs " + n)));
check("Kennedy's new ids keep him on the right road (bonds is on the main road, the others are not)", ["kinder.bonds"].filter(id => !/^kinder\./.test(id)).concat(["knight_pattern.1", "knight_size.1"].filter(id => /^kinder\./.test(id))));
check("no shapes skill added", KS.SKILLS.includes("kinder.6") ? ["kinder.6"] : []);

// ---------- every question of every new kind ----------
const ASSET_SEEN = new Set();
function sceneOk(Q, bad) {
  const S = Q.scene;
  if (!S || typeof S !== "object") return bad("no scene");
  if (!SCENE_ACTS.has(S.act)) bad("unknown act " + S.act);
  if ("ans" in S) bad("scene carries ans");
  const nouns = new Set(KS.SCENE_NOUNS[Q.theme]);
  if (!nouns.has(S.noun)) bad("unknown noun " + S.noun);
  if (S.noun2 !== undefined && !nouns.has(S.noun2)) bad("unknown noun2 " + S.noun2);
  const int = x => Number.isInteger(x) && x >= 0;
  switch (S.act) {
    case "make10": if (!int(S.a) || S.total - S.a !== Q.ans || S.total < 6 || S.total > 9) bad("bond scene"); break;
    case "pattern": if (!Array.isArray(S.seq) || S.seq.length !== Q.strip.length || S.seq.some((v, i) => v !== Q.strip[i])) bad("pattern scene differs from the strip"); break;
    case "size": if (!Array.isArray(S.sizes) || S.sizes.length !== 3 || !["h", "v"].includes(S.dir) || !["longest", "shortest", "tallest"].includes(S.ask)) bad("size scene"); break;
    case "tap_count": if (Object.keys(S).some(k => !["act", "noun"].includes(k))) bad("the counting scene must carry no number: " + JSON.stringify(S)); break;
    case "add": if (!int(S.a) || !int(S.b) || S.a + S.b !== Q.result) bad("add scene"); break;
    case "sub": if (!int(S.a) || !int(S.b) || S.a - S.b !== Q.result) bad("sub scene"); break;
  }
}
function texts(Q) { return [Q.say, Q.correct, Q.fact, Q.hint].concat([true, false].flatMap(r => KS.teach(Q, r).steps.map(s => s.say))).concat(Object.values(Q.optSay || {})); }

NEW.forEach(id => {
  const P = {}, bad = (cat, msg) => { (P[cat] = P[cat] || []).push(msg); };
  const theme = THEME[id], bank = KS.kindBank(id);
  const nTpl = Object.values(bank).reduce((a, l) => a + l.length, 0);
  if (nTpl < 10) bad("stories", `only ${nTpl} stories`);
  let count = 0;
  const checkQ = Q => {
    count++;
    const tag = `${Q.key}|${Q.tpl}`, p = Q.p;
    if (Q.skill !== id || Q.theme !== theme) bad("fields", "skill or theme " + tag);
    ["story", "ask", "say", "eq", "correct", "fact", "hint", "key"].forEach(f => { if (typeof Q[f] !== "string" || !Q[f]) bad("fields", f + " missing " + tag); });
    if (Q.say !== Q.story + " " + Q.ask) bad("fields", "say is not story + ask " + tag);
    if (Q.correct !== "Correct! " + Q.fact) bad("fields", "correct text " + tag);
    if ((Q.ask.match(/\d/g) || []).length) bad("story", "digits in the question: " + Q.ask);
    if (BANNED.test(Q.story + " " + Q.ask)) bad("story", "banned word " + tag);
    (Q.story + " " + Q.ask).split(/[.?!:]+/).forEach(x => { if (wordsIn(x) >= (theme === "castle" ? 12 : 16)) bad("story", "sentence too long: " + x); });
    sceneOk(Q, m => bad("scene", m + " " + tag));
    // the answer worked out here
    let want;
    if (id === "kinder.bonds") { want = p.t - p.a; if (p.t < 6 || p.t > 9 || p.a < 1 || p.a >= p.t) bad("range", "bond numbers " + tag); if (Q.eq !== `${p.a} + ? = ${p.t}`) bad("eq", Q.eq); }
    if (id === "cafe_count.1" || id === "cafe_count.2") {
      want = p.n;
      const [lo, hi] = id === "cafe_count.1" ? [3, 20] : [21, 50];
      if (p.n < lo || p.n > hi) bad("range", "n " + p.n);
      if (!Q.tray || Q.tray.n !== p.n || Q.tray.boxes.reduce((a, b) => a + b, 0) !== p.n || Q.tray.boxes.some((b, i, a) => b > 10 || b < 1 || (i < a.length - 1 && b !== 10))) bad("tray", "tray " + JSON.stringify(Q.tray));
      if (!fs.existsSync(path.join(GAME, Q.tray.src))) bad("art", "missing " + Q.tray.src);
      if (/\d/.test(Q.story + " " + Q.ask)) bad("story", "a digit in a counting question gives the count away: " + Q.say);
      if (Q.kind !== "typed" || Q.opts) bad("kind", "counting is typed " + tag);
      if (Q.noLine !== true) bad("kind", "counting shows no number line " + tag);
      if (Q.scene.act !== "tap_count") bad("scene", "act " + Q.scene.act);
    }
    if (id === "cafe_pattern.1") {
      const up = p.type === "U", s = up ? p.step : -p.step;
      want = p.a + 3 * s;
      if (want < 0 || want > 100) bad("range", "answer " + want);
      if (Q.eq !== `${p.a}, ${p.a + s}, ${p.a + 2 * s}, ?`) bad("eq", Q.eq);
      if (Q.eq.length > 15) bad("board", "row too wide " + Q.eq);
      if (Q.kind !== "typed") bad("kind", "typed " + tag);
      if ((Q.story.match(/\d+/g) || []).map(Number).join() !== [p.a, p.a + s, p.a + 2 * s].join()) bad("story", "story numbers " + Q.story);
    }
    if (id === "cafe_time.2") {
      const per = { W: 7, Y: 12, D: 24 }[p.type]; want = p.n * per;
      if (!per || p.n < 2 || p.n > 5) bad("range", "numbers " + JSON.stringify(p));
      if (Q.eq !== `${p.n} × ${per} = ?`) bad("eq", Q.eq);
      if (Q.kind !== "typed") bad("kind", "typed " + tag);
      if (Q.scene.act !== "groups" || Q.scene.n * Q.scene.per !== want) bad("scene", "groups scene " + JSON.stringify(Q.scene));
      const w = { W: ["week", "days"], Y: ["year", "months"], D: ["day", "hours"] }[p.type];
      if (!new RegExp(`${per}`).test(Q.story) || !Q.fact.includes(w[1])) bad("story", "the story must say how many " + w[1] + " there are in one: " + Q.story + " / " + Q.fact);
    }
    if (id === "knight_pattern.1") {
      const unit = p.type === "A" ? [1, 2] : [1, 2, 2];
      want = unit[p.len % unit.length];
      const seq = Q.strip;
      if (seq.length !== p.len || seq.some((v, i) => v !== unit[i % unit.length])) bad("pattern", "strip " + seq);
      if (seq.length < 4 || seq.length > 7) bad("pattern", "length " + seq.length);
      if (Q.eq.length > 15) bad("board", "row too wide " + Q.eq);
      if (Q.unitWords.length !== unit.length) bad("pattern", "unit words");
    }
    if (id === "knight_size.1") {
      const best = p.type === "S" ? Math.min(...p.lens) : Math.max(...p.lens);
      want = p.lens.indexOf(best) + 1;
      if (new Set(p.lens).size !== 3) bad("size", "two the same " + p.lens);
      const sorted = p.lens.slice().sort((a, b) => a - b);
      if (sorted[1] - sorted[0] < 2 || sorted[2] - sorted[1] < 2) bad("size", "too close to tell apart " + p.lens);
      Object.values(Q.pics).forEach(pc => { if (!pc.bar || !["h", "v"].includes(pc.bar.dir)) bad("size", "bar " + JSON.stringify(pc)); });
      if (Q.pics[Q.ans].bar.len !== best) bad("size", "the answer picture is not the " + p.type);
      if (Q.pics[1].bar.len !== p.lens[0] || Q.pics[3].bar.len !== p.lens[2]) bad("size", "picture lengths");
      if (Q.eq.length > 15) bad("board", "row too wide " + Q.eq);
    }
    if (Q.ans !== want) bad("answer", `ans ${Q.ans} want ${want} ${tag}`);
    if (theme === "castle") {
      const o = Q.opts, n = 3;
      if (Q.kind !== "choice" || !Array.isArray(o) || o.length !== n || new Set(o).size !== n || !o.includes(Q.ans)) bad("choice", "bad opts " + JSON.stringify(o) + " ans " + Q.ans + " " + tag);
    }
    if (Q.picOpts) {
      if (Q.noLine !== true) bad("pics", "picture answers show no number line " + tag);
      Q.opts.forEach(v => {
        const pc = Q.pics[v];
        if (!pc || (!pc.src && !pc.bar)) bad("pics", "no picture for option " + v);
        if (pc && pc.src && !ASSET_SEEN.has(pc.src)) { ASSET_SEEN.add(pc.src); if (!fs.existsSync(path.join(GAME, pc.src))) bad("art", "missing " + pc.src); }
        if (!Q.optSay[v] || /\d/.test(Q.optSay[v])) bad("pics", "optSay " + v);
      });
      if (!Q.tapSay) bad("pics", "no tapSay");
    } else if (Q.pics) bad("pics", "pics without picOpts");
    // voice: every sentence has a place in KS.sentences() and every piece is in KS.pieces()
    texts(Q).forEach(t => {
      if (typeof t !== "string" || !t.trim() || /\{|\}|undefined|NaN/.test(t)) { bad("text", "unfilled: " + t); return; }
      if (BANNED.test(t)) bad("text", "banned word " + t);
      if (!sentenceSet.has(t)) bad("voice", "not in KS.sentences(): " + t);
      splitPieces(t).forEach(pc => { if (!pieceSet.has(pc)) bad("voice", `piece "${pc}" of "${t}"`); });
    });
    // the lesson: rows in order, hops only on whole steps, the last step says the fact, and a counting lesson never counts for her
    [true, false].forEach(right => {
      const T = KS.teach(Q, right);
      if (!T || !Array.isArray(T.steps) || T.steps.length < 2) { bad("teach", "no lesson " + tag); return; }
      const last = T.steps[T.steps.length - 1];
      const wantLast = right ? Q.fact : `${Q.fact} ${Q.picOpts ? Q.tapSay : Q.kind === "typed" ? "Type " + Q.ans + "." : "Tap " + Q.ans + "."}`;
      if (last.say !== wantLast) bad("teach", `last step "${last.say}" want "${wantLast}"`);
      T.steps.forEach((st, si) => {
        if (!Array.isArray(st.draw)) bad("teach", "draw missing");
        (st.draw || []).forEach(d => { if (d.tokens && d.tokens.join(" ").length > 15) bad("board", "row too wide: " + d.tokens.join(" ")); });
        if (st.line) { const [f, t2, stp] = st.line; if (![f, t2, stp].every(Number.isInteger) || stp < 1 || f === t2 || !Number.isInteger(Math.abs(t2 - f) / stp) || Math.abs(t2 - f) / stp > 12) bad("teach", "line " + JSON.stringify(st.line)); }
        if (id.startsWith("cafe_count") && si < T.steps.length - 1 && (st.line || /\b\d+\b/.test(st.say.replace(Q.fact, "")))) bad("teach", "a counting lesson must not count for her: " + st.say);
      });
      if (Q.picOpts && T.steps.some(st => (st.draw || []).some(d => d.answer))) bad("teach", "a picture answer cannot be written on the board");
    });
  };
  KS.eachKindQuestion(id, checkQ);
  // the game asks for random questions: never the same one twice running, and every type shows up
  let s = 12345 + id.length; const rng = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  const types = new Set(); let prev = "";
  for (let i = 0; i < 300; i++) {
    let Q; try { Q = KS.make(id, theme, rng, prev); } catch (e) { bad("make", e.message); break; }
    if (Q.key === prev) bad("make", "repeated " + prev);
    prev = Q.key; types.add(Q.type); checkQ(Q);
  }
  if (types.size !== Object.keys(bank).length) bad("variety", "types seen " + [...types]);
  if (count < 40) bad("variety", "only " + count + " questions");
  ["stories", "fields", "story", "scene", "range", "eq", "board", "kind", "answer", "choice", "pics", "art", "pattern", "size", "tray", "text", "voice", "teach", "make", "variety"].forEach(cat => check(`${id} ${cat}`, P[cat] || []));
});

// ---------- the counting rule (Marie) ----------
(function counting() {
  const e = (s, ok, c) => ({ s, ok, c: c || "" });
  const slips = n => Array.from({ length: n }, () => e("sums.3", 0, "slip"));
  const rights = n => Array.from({ length: n }, () => e("sums.3", 1));
  check("counting rule: no record, no need", CN.check([]).need ? ["need"] : []);
  check("counting rule: 2 slips are not enough", CN.check(slips(2).concat(rights(10))).need ? ["need"] : []);
  check("counting rule: 3 slips in the last 20 are a need", CN.check(rights(5).concat(slips(3), rights(10))).need ? [] : ["no need"]);
  check("counting rule: old slips fall out of the window", CN.check(slips(5).concat(rights(CN.WINDOW))).need ? ["need"] : []);
  check("counting rule: only adding and taking away count", CN.check(Array.from({ length: 6 }, () => e("cafe_times.1", 0, "slip"))).need ? ["need"] : []);
  check("counting rule: a wrong answer that was not a slip does not count", CN.check(Array.from({ length: 6 }, () => e("sums.2", 0, "guess"))).need ? ["need"] : []);
  check("counting rule: damaged entries do not crash it", (() => { try { return CN.check([null, undefined, 5, "x", {}]).need ? ["need"] : []; } catch (x) { return [x.message]; } })());
  check("counting rule: off means off, even with slips", CN.decide("off", slips(9)).on ? ["on"] : []);
  check("counting rule: on means on, even with no record", CN.decide("on", []).on ? [] : ["off"]);
  check("counting rule: auto follows the record", [CN.decide("auto", []).on, !CN.decide("auto", slips(4)).on].filter(Boolean).map(() => "auto"));
  const st = (lvl1, lvl2, focus) => ({ focus: focus || ["cafe_count.1", "cafe_count.2"], skills: { "cafe_count.1": { lvl: lvl1 }, "cafe_count.2": { lvl: lvl2 } } });
  check("counting rule: stays on while she is still learning it, even with no slips left", CN.decide("auto", rights(20), CN.learning(st(1, 0), 3)).why === "learning" ? [] : ["off"]);
  check("counting rule: learning counts a skill she has not started", CN.learning(st(0, 0), 3) ? [] : ["not learning"]);
  check("counting rule: off when both are known", CN.learning(st(3, 4), 3) || CN.decide("auto", rights(20), CN.learning(st(3, 4), 3)).on ? ["still on"] : []);
  check("counting rule: still on while the second one is not known", CN.learning(st(4, 2), 3) ? [] : ["off"]);
  check("counting rule: not on the focus list means not learning", CN.learning({ focus: [], skills: {} }, 3) || CN.learning(null, 3) ? ["learning"] : []);
  check("counting rule: a grown-up's off beats learning", CN.decide("off", rights(20), true).on ? ["on"] : []);
  check("counting rule: ids", CN.IDS.join() === "cafe_count.1,cafe_count.2" ? [] : [CN.IDS.join()]);
})();

failures.forEach(f => console.log(f));
console.log(`RESULT ${passed}/${total} passed`);
process.exit(passed === total ? 0 : 1);
