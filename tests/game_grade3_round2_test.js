/* game_grade3_round2_test.js - checks the fifteen skills added on 23 Oct 2026, round 2 (Grade 3 gaps, round 2) in game/stories.js and game/figure.js:
 *   measurement  cafe_measure.1 (which unit), .2 (read a ruler and a jug), .3 (which is longer, heavier, holds more), .4 (add and take away in one unit)
 *   3D objects   cafe_solid.1 (names), .2 (faces, edges, corners)
 *   data         cafe_graph.1 (picture graph, scales 1, 2, 5), .2 (bar graph, scales 1, 2, 5), .3 (tally marks)
 *   chance       cafe_chance.1 (certain, likely, unlikely, impossible), .2 (spinners, fair games, draws)
 *   fractions    cafe_frac.2 (thirds, sixths, eighths), .3 (which is bigger), .4 (a fraction of a set), .5 (fractions on a number line)
 * Every question every kind can make is built. The right answer is worked out HERE from what the question shows (the story text, and the drawing itself:
 * the bars, the rows of pictures, the tally groups, the ruler, the jug, the spinner and the jar are read back from the SVG), with tables of facts kept in this file.
 * Every tap question is checked button by button (exactly ONE button is right), every spoken sentence is in KS.sentences(), every figure draws, and the help drawing has no numerals.
 * Run: node tests/game_grade3_round2_test.js     Prints only failures and RESULT lines. No browser, no sound. */
"use strict";
const path = require("path");
const KS = require(path.join(__dirname, "..", "game", "stories.js"));
const FG = require(path.join(__dirname, "..", "game", "figure.js"));
const HL = require(path.join(__dirname, "..", "game", "hint_ladder.js"));
const MS = require(path.join(__dirname, "..", "game", "miss_study.js"));

let total = 0, passed = 0;
const failures = [];
function check(name, problems) { total++; if (!problems.length) passed++; else failures.push(`FAIL ${name} (${problems.length}): ${problems[0]}`); }
const BANNED = /\b(kill|killed|hurt|blood|die|dies|died|dead|hit|hits|fight|fights|attack|shoot|shot|weapon|stab|war|beat|defeat|hate|scare|scared|angry|bad|cry|crying)\b/i;
const PLURAL_ONE = /(^|[^\d.,])1 (?!more\b|and\b|is\b|plus\b|minus\b|times\b|of\b|to\b|or\b)([a-z']+s)\b/i;
const wordsIn = s => s.split(/\s+/).filter(Boolean).length;
const splitPieces = t => t.split(/\d+/).map(x => x.trim()).filter(Boolean);
const sentenceSet = new Set(KS.sentences()), pieceSet = new Set(KS.pieces());
const SCENE_ACTS = new Set(KS.SCENE_ACTS);
const HOLDERS = ["tray", "table", "box", "plate", "vase", "jar", "bag", "jug", "basket", "cake"];
const ids = ["cafe_measure.1", "cafe_measure.2", "cafe_measure.3", "cafe_measure.4", "cafe_solid.1", "cafe_solid.2", "cafe_graph.1", "cafe_graph.2", "cafe_graph.3", "cafe_chance.1", "cafe_chance.2",
  "cafe_frac.2", "cafe_frac.3", "cafe_frac.4", "cafe_frac.5"];
const LONGEST = 15;

// ---------- the list of skills ----------
check("the fifteen kinds exist and are skills", ids.filter(id => !KS.KIND_IDS.includes(id) || !KS.SKILLS.includes(id)));
check("all are Marie's: cafe theme, not Kennedy's, none optional", ids.filter(id => KS.kindTheme(id) !== "cafe" || !KS.fits(id, "cafe") || KS.fits(id, "castle") || KS.optional(id)));
check("extra skills carry them with a name, grade 3, a known group, needs that exist", KS.extraSkills().filter(e => ids.includes(e.id)).filter(e => !e.name || e.grade !== 3 || !["shapes", "fractions"].includes(e.group) || !e.needs.length || e.needs.some(n => !KS.SKILLS.includes(n)) || e.play.src !== "story").map(e => e.id));
check("the order of needs makes sense", [["cafe_measure.2", "cafe_measure.1"], ["cafe_measure.3", "cafe_measure.1"], ["cafe_measure.4", "cafe_measure.3"], ["cafe_solid.2", "cafe_solid.1"], ["cafe_graph.2", "cafe_graph.1"],
  ["cafe_chance.2", "cafe_chance.1"], ["cafe_frac.2", "cafe_frac.1"], ["cafe_frac.3", "cafe_frac.2"], ["cafe_frac.4", "cafe_frac.2"], ["cafe_frac.5", "cafe_frac.2"]]
  .filter(([a, b]) => !KS.extraSkills().find(e => e.id === a).needs.includes(b)).map(x => x.join(" needs ")));
let shapes = 0; const shapeList = [];
ids.forEach(id => Object.keys(KS.kindBank(id)).forEach(t => { shapes++; shapeList.push(id + ":" + t); }));
check("at least 60 question shapes in all", shapes >= 60 ? [] : ["only " + shapes]);
check("at least 3 wordings for every shape", shapeList.filter(s => { const [id, t] = s.split(":"); return KS.kindBank(id)[t].length < 3; }));

// ---------- facts kept here (not read from stories.js) ----------
const UNIT_OF_ITEM = {};
({ cm: ["the teaspoon", "the straw", "a cookie", "a pencil", "the menu card", "a tea bag"], m: ["the cafe door", "the long counter", "the cafe floor", "the garden path", "the front window", "the cafe wall"],
  g: ["a cookie", "a tea bag", "a strawberry", "a spoon of sugar", "a grape", "a slice of bread"], kg: ["a bag of flour", "a sack of sugar", "a box of lemons", "a big pumpkin", "a bag of rice", "a crate of apples"],
  ml: ["a spoon of honey", "a small cup of cream", "a cup of tea", "a glass of juice", "a spoon of milk", "a cup of cocoa"], L: ["the big soup pot", "a jug of lemonade", "a bucket of water", "the tea urn", "the big milk can", "a tank of water"] })
  && Object.entries({ cm: ["the teaspoon", "the straw", "a cookie", "a pencil", "the menu card", "a tea bag"], m: ["the cafe door", "the long counter", "the cafe floor", "the garden path", "the front window", "the cafe wall"],
    g: ["a cookie", "a tea bag", "a strawberry", "a spoon of sugar", "a grape", "a slice of bread"], kg: ["a bag of flour", "a sack of sugar", "a box of lemons", "a big pumpkin", "a bag of rice", "a crate of apples"],
    ml: ["a spoon of honey", "a small cup of cream", "a cup of tea", "a glass of juice", "a spoon of milk", "a cup of cocoa"], L: ["the big soup pot", "a jug of lemonade", "a bucket of water", "the tea urn", "the big milk can", "a tank of water"] })
    .forEach(([u, l]) => l.forEach(x => { (UNIT_OF_ITEM[x] = UNIT_OF_ITEM[x] || []).push(u); }));
const FAMILY = { cm: "len", m: "len", g: "mass", kg: "mass", ml: "cap", L: "cap" };
const UNIT_SAY = { cm: "centimetres", m: "metres", g: "grams", kg: "kilograms", ml: "millilitres", L: "litres" };
const SOLID_NAME = { cube: "cube", rect_prism: "rectangular prism", cylinder: "cylinder", cone: "cone", sphere: "sphere", sq_pyramid: "square pyramid", tri_prism: "triangular prism" };
const NAME_TO_SOLID = Object.fromEntries(Object.entries(SOLID_NAME).map(([k, v]) => [v, k]));
const COUNTS = { cube: { faces: 6, edges: 12, corners: 8, square: 6 }, rect_prism: { faces: 6, edges: 12, corners: 8, rectangle: 6 }, sq_pyramid: { faces: 5, edges: 8, corners: 5, square: 1, triangle: 4 }, tri_prism: { faces: 5, edges: 9, corners: 6, triangle: 2, rectangle: 3 } };
const CLUE_SHAPE = [["six faces. All of them are squares", "cube"], ["cake box. All six faces are rectangles", "rect_prism"], ["two flat circles and one curved side", "cylinder"], ["one flat circle and one pointed top", "cone"],
  ["round all over", "sphere"], ["square bottom. Four triangles", "sq_pyramid"], ["two triangle ends and three rectangle sides", "tri_prism"]];
const THING_SHAPE = { "a sugar cube": "cube", "a dice": "cube", "a cube of ice": "cube", "a cake box": "rect_prism", "a box of tea bags": "rect_prism", "a loaf of bread": "rect_prism", "a tin of cocoa": "cylinder", "a tall candle": "cylinder",
  "a tin of tea": "cylinder", "an ice cream cone": "cone", "a party hat": "cone", "a sugar cone": "cone", "an orange": "sphere", "a ball of ice cream": "sphere", "a gumball": "sphere" };
const DAY = { Mon: "Monday", Tue: "Tuesday", Wed: "Wednesday", Thu: "Thursday", Fri: "Friday" };
const NUM = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8 };
const DEN = { half: 2, halves: 2, third: 3, thirds: 3, quarter: 4, quarters: 4, sixth: 6, sixths: 6, eighth: 8, eighths: 8 };
const fracOf = text => { const m = /\b(one|two|three|four|five|six|seven)\s+(half|halves|third|thirds|quarter|quarters|sixth|sixths|eighth|eighths)\b/.exec(text.toLowerCase()); return m ? [NUM[m[1]], DEN[m[2]]] : null; };
const PART_NAME = { 2: "a half", 3: "a third", 4: "a quarter", 6: "a sixth", 8: "an eighth" };
const COLORS = ["red", "blue", "green", "yellow", "pink", "purple"];
const CHANCE_ORDER = ["impossible", "unlikely", "likely", "certain"];
const ART_NAMES = ["cafe_measure", "cafe_solid"];

// ---------- every question ----------
const P = {}, answersByType = {};
const bad = (id, cat, msg) => { const k = id + " " + cat; (P[k] = P[k] || []).push(msg); };
function texts(Q) { return [Q.say, Q.correct, Q.fact, Q.hint].concat(Object.values(Q.optSay || {}), [true, false].flatMap(r => KS.teach(Q, r).steps.map(s => s.say))); }
const nums = s => (s.match(/\d+/g) || []).map(Number);

// read a drawing back (what a child sees)
const svgOf = (f, o) => FG.svg(f, o || {});
function readBars(f) {
  const svg = svgOf(f), ys = [...svg.matchAll(/class="grid" x1="[\d.]+" y1="([\d.]+)"/g)].map(m => +m[1]), lab = FG.texts(f).map(Number).filter(Number.isFinite);
  const top = ys.length - 1, per = (ys[0] - ys[top]) / top, scale = lab[1] / 2, out = {};
  [...svg.matchAll(/class="barv" data-cat="([^"]*)"[^>]*height="([\d.]+)"/g)].forEach(m => { out[m[1]] = Math.round(+m[2] / per) * scale; if (Math.abs(+m[2] / per - Math.round(+m[2] / per)) > 1e-6) out[m[1]] = NaN; });
  return { vals: out, scale, lab, top };
}
function readPicto(f) {
  const svg = svgOf(f), tx = FG.texts(f), n = f.cats.length, rows = tx.slice(0, n), key = tx[n], scale = NUM[(/stands for (\w+)/.exec(key) || [])[1]] || NaN, out = {};
  rows.forEach((r, i) => { out[r] = (svg.match(new RegExp(`class="ic" data-row="${i}"`, "g")) || []).length * scale; });
  return { vals: out, scale, key };
}
function readTally(f) {
  const svg = svgOf(f), out = {}; f.cats.forEach((c, i) => { out[c] = [...svg.matchAll(new RegExp(`class="tg" data-row="${i}" data-n="(\\d)"`, "g"))].reduce((a, m) => a + +m[1], 0); });
  // a group of five has four upright marks and one slash; a smaller group has only upright marks
  [...svg.matchAll(/<g class="tg" data-row="\d" data-n="(\d)">(.*?)<\/g>/g)].forEach(m => { const lines = (m[2].match(/<line/g) || []).length; if (lines !== +m[1]) out.__bad = true; });
  return { vals: out };
}
const namesIn = (ask, cats) => cats.map(c => ({ c, at: ask.toLowerCase().indexOf((DAY[c] || c).toLowerCase()) })).filter(x => x.at >= 0).sort((a, b) => a.at - b.at).map(x => x.c);
const labelOf = (Q, v) => { const e = Q.pics[v]; return e.word !== undefined ? e.word : e.frac !== undefined ? e.frac : e.solid !== undefined ? e.solid : "fig"; };
const equalCuts = fig => { const b = fig.bars[0]; if (b.parts) return true; const e = [0].concat(b.cuts, [1]), w = e.slice(1).map((x, i) => x - e[i]); return w.every(x => Math.abs(x - w[0]) < 1e-9); };
const frac2val = s => { const [a, b] = s.split("/").map(Number); return a / b; };

// the label of the right button, worked out here; null when the question is typed
function expected(id, t, Q) {
  const story = Q.story, ask = Q.ask, fig = Q.figure, all = story + " " + ask;
  switch (id) {
    case "cafe_measure.1": { const found = Object.keys(UNIT_OF_ITEM).filter(x => all.includes(" " + x + " ") || all.includes(" " + x + ".")).sort((a, b) => b.length - a.length);
      const verb = /how long/.test(all) ? "len" : /how heavy/.test(all) ? "mass" : "cap";
      const cand = found.flatMap(x => UNIT_OF_ITEM[x]).filter(u => FAMILY[u] === verb);
      if (cand.length !== 1 && new Set(cand).size !== 1) return { err: `item not found or not clear (${found}) ${all}` };
      return { label: cand[0] }; }
    case "cafe_measure.2": {
      if (t === "RL") { const r = svgOf(fig).match(/class="rbar"[^>]*\swidth="(\d+)"/); return { value: +r[1] / 20 }; }
      if (t === "RD") { const w = [...svgOf(fig).matchAll(/class="rbar" data-name="([^"]*)"[^>]*\swidth="(\d+)"/g)].map(m => [m[1], +m[2] / 20]); const x = /longer is the (.+?)( than| ?\?)/.exec(ask); const first = w.find(a => a[0] === x[1]); const other = w.find(a => a[0] !== x[1]); return { value: first[1] - other[1] }; }
      if (t === "JL") { const h = +svgOf(fig).match(/class="liquid"[^>]*height="([\d.]+)"/)[1]; return { value: Math.round(h / 14.4 * 100) }; }
      const hs = [...svgOf(fig).matchAll(/class="liquid"[^>]*height="([\d.]+)"/g)].map(m => Math.round(+m[1] / 14.4 * 100)); return { value: Math.abs(hs[0] - hs[1]) }; }
    case "cafe_measure.3": { const [a, b] = nums(story), more = ["ML", "MH", "MC"].includes(t); return { value: more ? Math.max(a, b) : Math.min(a, b) }; }
    case "cafe_measure.4": { const [a, b] = nums(story); return { value: ["AL", "AM", "AC"].includes(t) ? a + b : a - b }; }
    case "cafe_solid.1": {
      if (t === "NA") return { label: SOLID_NAME[fig.shape] };
      if (t === "NP") { const n = /Which one is the (.+?)\? Tap it|Tap the (.+?)\./.exec(ask); return { label: NAME_TO_SOLID[n[1] || n[2]] }; }
      if (t === "NC") return { label: SOLID_NAME[CLUE_SHAPE.find(([k]) => story.includes(k))[1]] };
      const thing = Object.keys(THING_SHAPE).find(x => story.includes(x + " ") || story.includes(x + ".")); return { label: SOLID_NAME[THING_SHAPE[thing]] }; }
    case "cafe_solid.2": { const s = fig.shape, C = COUNTS[s] || { flat: 0 };
      if (t === "FL") return { value: s === "cylinder" ? 2 : 1 };
      const w = /faces|edges|corners/.exec(ask); const kind = /(square|rectangle|triangle)s/.exec(ask);
      if (t === "FT") return { value: C[kind[1]] };
      return { value: C[w[0]] }; }
    case "cafe_graph.1": case "cafe_graph.2": case "cafe_graph.3": {
      const R = id === "cafe_graph.1" ? readPicto(fig) : id === "cafe_graph.2" ? readBars(fig) : readTally(fig), V = R.vals, cats = Object.keys(V).filter(k => k !== "__bad");
      if (Object.values(V).some(x => !Number.isFinite(x)) || V.__bad) return { err: "figure not readable " + JSON.stringify(V) };
      const who = namesIn(ask, cats);
      if (["PA", "PB", "PC", "BA", "BB", "BC", "TA"].includes(t)) return { value: V[who[0]], scale: R.scale };
      if (["PD", "BD", "TD"].includes(t)) return { value: V[who[0]] - V[who[1]], scale: R.scale };
      if (["PT", "BT", "TT"].includes(t)) return { value: V[who[0]] + V[who[1]], scale: R.scale };
      const most = ["PM", "BM", "TM"].includes(t), sorted = cats.slice().sort((a, b) => V[a] - V[b]), ex = most ? sorted[sorted.length - 1] : sorted[0];
      const tie = most ? V[sorted[sorted.length - 1]] === V[sorted[sorted.length - 2]] : V[sorted[0]] === V[sorted[1]];
      if (tie) return { err: "a tie for the " + (most ? "most" : "fewest") };
      return { label: ex }; }
    case "cafe_chance.1": {
      let n, T;
      if (t === "CJ") { const c = COLORS.find(x => new RegExp(`a ${x} sweet`).test(ask)); n = fig.items[c] || 0; T = Object.values(fig.items).reduce((a, b) => a + b, 0); }
      else if (t === "CS") { const c = COLORS.find(x => ask.includes(" " + x + "?")); n = fig.parts.filter(x => x === c).length; T = fig.parts.length; if (T !== 8) return { err: "spinner has 8 parts" }; }
      else { const s = /roll (.+?)\?/.exec(ask)[1]; let r = null; T = 6;
        const hit = [1, 2, 3, 4, 5, 6].filter(d => { let m;
          if ((m = /^a number less than (\d)$/.exec(s))) return d < +m[1]; if ((m = /^a number more than (\d)$/.exec(s))) return d > +m[1]; if ((m = /^a number from (\d) to (\d)$/.exec(s))) return d >= +m[1] && d <= +m[2];
          if ((m = /^an? (\d)$/.exec(s))) return d === +m[1]; r = "unknown"; return false; });
        if (r) return { err: "dice statement " + s }; n = hit.length; }
      return { label: n === 0 ? "impossible" : n === T ? "certain" : n / T >= .6 ? "likely" : n / T <= .4 ? "unlikely" : "AMBIGUOUS" }; }
    case "cafe_chance.2": {
      if (t === "FM" || t === "FL") { const cnt = {}; fig.parts.forEach(c => { cnt[c] = (cnt[c] || 0) + 1; }); const v = Object.entries(cnt).sort((a, b) => a[1] - b[1]); if (v.length !== 3 || new Set(v.map(x => x[1])).size !== 3) return { err: "three different counts" };
        if ((t === "FM") !== /most likely/.test(ask) && (t === "FM")) return { err: "ask words" }; return { label: t === "FM" ? v[2][0] : v[0][0] }; }
      if (t === "FF") { const [c, d] = COLORS.filter(x => story.includes("wins on " + x)).sort((a, b) => story.indexOf("wins on " + a) - story.indexOf("wins on " + b)); const n1 = fig.parts.filter(x => x === c).length, n2 = fig.parts.filter(x => x === d).length;
        if (fig.parts.length !== n1 + n2) return { err: "other colours on the spinner" }; return { label: n1 === n2 ? "Yes" : "No" }; }
      if (t === "FD" || t === "FG") { const list = [...story.matchAll(/(\d+) (red|blue|green|yellow|pink|purple) tickets?/g)].map(m => [+m[1], m[2]]); const v = list.slice().sort((a, b) => b[0] - a[0]); if (v.length > 1 && v[0][0] === v[1][0]) return { err: "a tie" }; return { label: v[0][1] }; }
      const list = [...story.matchAll(/(\d+) (red|blue|green|yellow|pink|purple) tickets?/g)].map(m => [+m[1], m[2]]); const s = COLORS.find(x => ask.includes(`many ${x} tickets`)); const mine = list.find(x => x[1] === s), other = list.find(x => x[1] !== s);
      if (!(other[0] > mine[0])) return { err: "the asked colour must be the smaller" }; return { value: other[0] - mine[0] }; }
    case "cafe_frac.2": {
      if (t === "NF1" || t === "NF2") { const b = fig.bars[0], s = svgOf(fig), shaded = (s.match(/fill="#f4a0b8"/g) || []).length, parts = b.shape === "pie" ? (s.match(/<path/g) || []).length : (s.match(/<rect/g) || []).length;
        if (shaded !== b.shaded.length) return { err: "shaded in svg " + shaded }; return { label: `${shaded}/${parts}`, val: shaded / parts }; }
      if (t === "NW") { const parts = fig.bars[0].shape === "pie" ? (svgOf(fig).match(/<path/g) || []).length : (svgOf(fig).match(/<rect/g) || []).length; return { label: PART_NAME[parts] }; }
      return { label: "equal" }; }
    case "cafe_frac.3": {
      if (t === "CB" || t === "CS") { const [a, b] = nums(story), big = Math.min(a, b), small = Math.max(a, b); return { label: `1/${t === "CB" ? big : small}` }; }
      if (t === "CT") { const d = nums(story); return { label: `1/${Math.min(...d)}` }; }
      const u = [...new Set(nums(story))].sort((x, y) => y - x), n = u[0], a = u[1], b = u[2]; return { label: `${Math.max(a, b)}/${n}` }; }
    case "cafe_frac.4": { const f = fracOf(story + " " + ask); const t0 = nums(story)[0]; if (t0 % f[1]) return { err: "not divisible" }; return { value: t0 / f[1] * f[0] }; }
    case "cafe_frac.5": {
      if (t === "LN") return { value: fig.parts };
      if (t === "LU") return { label: `1/${fig.parts}` };
      if (t === "LK") return { label: `${fig.mark}/${fig.parts}` };
      const f = fracOf(ask), want = f[0] / f[1]; const hit = fig.letters.filter(l => Math.abs(l.at / fig.parts - want) < 1e-9); if (hit.length !== 1) return { err: "letters " + JSON.stringify(fig.letters) }; return { label: hit[0].ch }; }
  }
  return { err: "no rule" };
}

ids.forEach(id => {
  const bank = KS.kindBank(id); let count = 0;
  Object.keys(bank).forEach(t => bank[t].forEach(row => {
    const [story, ask] = row;
    if (/\$/.test(story + ask)) bad(id, "stories", "a dollar sign is not spoken: " + story);
    if (/\d/.test(ask)) bad(id, "stories", "digits in the question: " + ask);
  }));
  const checkQ = Q => {
    count++;
    const tag = `${Q.key}|${Q.tpl}`, t = Q.type, ex = expected(id, t, Q);
    answersByType[id + ":" + t] = (answersByType[id + ":" + t] || 0) + 1;
    if (Q.skill !== id || Q.theme !== "cafe") bad(id, "fields", "skill or theme " + tag);
    ["story", "ask", "say", "eq", "correct", "fact", "hint", "key"].forEach(f => { if (typeof Q[f] !== "string" || !Q[f]) bad(id, "fields", f + " missing " + tag); });
    if (Q.say !== Q.story + " " + Q.ask) bad(id, "fields", "say is not story + ask " + tag);
    if (Q.correct !== "Correct! " + Q.fact) bad(id, "fields", "correct text " + tag);
    if (Q.noLine !== true) bad(id, "fields", "these kinds have no number line " + tag);
    if ((Q.eq.match(/\?/g) || []).length !== 1 || /-/.test(Q.eq)) bad(id, "eq", "eq needs one ? and no hyphen: " + Q.eq);
    (Q.story + " " + Q.ask).split(/[.?!:]+/).forEach(x => { if (wordsIn(x) >= 17) bad(id, "story", "sentence too long: " + x); });
    // numbers in the story are exactly the ones in Q.nums (the die and the jug say their own fixed numbers)
    const fixed = id === "cafe_chance.1" && t === "CD" ? [1, 6] : id === "cafe_measure.2" && ["JL", "JD"].includes(t) ? [100] : [];
    const storyNums = [...new Set(nums(Q.story).filter(n => !fixed.includes(n)))].sort((a, b) => a - b).join(","), wantNums = [...new Set(Q.nums || [])].sort((a, b) => a - b).join(",");
    if (!(id === "cafe_chance.1" && t === "CD") && storyNums !== wantNums) bad(id, "story", `story numbers [${storyNums}] want [${wantNums}] ${tag}: ${Q.story}`);
    if (ex.err) bad(id, "answer", ex.err + " " + tag);
    // the answer
    if (Q.kind === "typed") {
      if (Q.opts) bad(id, "kind", "typed question with buttons " + tag);
      if (!Number.isInteger(ex.value) || ex.value < 1 || ex.value > 9999 || Q.ans !== ex.value) bad(id, "answer", `ans ${Q.ans} want ${ex.value} ${tag}`);
      if (Q.ans > 9999) bad(id, "range", "answer too long for the keypad");
      if (ex.scale && ex.scale !== (Q.scaleWanted || ex.scale)) bad(id, "answer", "scale");
    } else {
      if (Q.kind !== "choice" || !Array.isArray(Q.opts)) { bad(id, "kind", "a tap question needs buttons " + tag); }
      else {
        if (new Set(Q.opts).size !== Q.opts.length || Q.opts.length < 2 || Q.opts.length > 4) bad(id, "choice", "buttons " + JSON.stringify(Q.opts));
        if (!Q.opts.includes(Q.ans)) bad(id, "choice", "the answer is not a button " + tag);
        if (Q.picOpts) {
          if (!Q.pics || Object.keys(Q.pics).length !== Q.opts.length || Q.opts.some(o => !Q.pics[o] || !Q.optSay[o])) bad(id, "choice", "pics or optSay missing " + tag);
          if (typeof Q.tapSay !== "string" || /undefined/.test(Q.tapSay) || !Q.tapSay.includes(Q.optSay[Q.ans])) bad(id, "choice", "tapSay " + Q.tapSay);
          const right = Q.opts.filter(o => {
            const lab = labelOf(Q, o);
            if (ex.label === "equal") return Q.pics[o].fig && equalCuts(Q.pics[o].fig);
            if (lab === "fig") return false;
            if (ex.val !== undefined) return Math.abs(frac2val(lab) - ex.val) < 1e-9;
            return lab === ex.label || (id === "cafe_solid.1" && t === "NP" && Q.pics[o].solid === ex.label);
          });
          if (right.length !== 1 || right[0] !== Q.ans) bad(id, "one right", `${right.length} right buttons [${right}], ans ${Q.ans} (${tag}) want ${JSON.stringify(ex)}`);
          if (ex.label === "AMBIGUOUS") bad(id, "answer", "a chance too close to call " + tag);
          // the spoken words of fractions say the same as the shown ones; labels never repeat
          Q.opts.forEach(o => { const e = Q.pics[o]; if (e.frac) { const f = fracOf(e.say); if (!f || f.join("/") !== e.frac) bad(id, "text", `fraction ${e.frac} is spoken "${e.say}"`); } });
          const shown = Q.opts.map(o => labelOf(Q, o)).filter(x => x !== "fig"); if (new Set(shown).size !== shown.length) bad(id, "one right", "two buttons say the same " + shown);
          const vals = Q.opts.filter(o => Q.pics[o].frac).map(o => frac2val(Q.pics[o].frac)); if (new Set(vals).size !== vals.length) bad(id, "one right", "two fractions with the same value " + Q.opts.map(o => Q.pics[o].frac));
          if (Q.pics[Q.opts[0]].word === undefined && !Q.pics[Q.opts[0]].frac && !Q.pics[Q.opts[0]].solid && !Q.pics[Q.opts[0]].fig) bad(id, "choice", "a button with nothing to draw");
          if (id === "cafe_chance.1" && JSON.stringify(Q.opts.map(o => Q.pics[o].word)) !== JSON.stringify(CHANCE_ORDER)) bad(id, "choice", "the chance words must stay in the order of the scale: " + Q.opts.map(o => Q.pics[o].word));
          if (id === "cafe_frac.5" && t === "LP" && JSON.stringify(Q.opts.map(o => Q.pics[o].word)) !== JSON.stringify(["A", "B", "C"])) bad(id, "choice", "letters in order");
        } else {
          const right = Q.opts.filter(o => o === ex.value);
          if (right.length !== 1 || right[0] !== Q.ans) bad(id, "one right", `${right.length} right buttons ${tag}`);
          if (Q.ans !== ex.value) bad(id, "answer", `ans ${Q.ans} want ${ex.value} ${tag}`);
          if (!Q.opts.every(x => Q.nums.includes(x))) bad(id, "choice", "buttons are the numbers in the story " + tag);
          if (Q.opposite == null || Q.opposite === Q.ans || !Q.opts.includes(Q.opposite)) bad(id, "miss", "opposite " + tag);
        }
      }
    }
    // measurement facts
    if (id === "cafe_measure.1") {
      const u = ex.label, labels = Q.opts.map(o => Q.pics[o].word), others = labels.filter(x => x !== u);
      if (t === "UF" && new Set(labels.map(x => FAMILY[x])).size !== 3) bad(id, "answer", "UF wants one unit of each family " + labels);
      if (t !== "UF") { const fam = { UL: "len", UM: "mass", UC: "cap" }[t]; if (FAMILY[u] !== fam || others.filter(x => FAMILY[x] === fam).length !== 1 || others.filter(x => FAMILY[x] !== fam).length !== 1) bad(id, "answer", "size question wants the other size and another family " + labels + " " + u);
        if (!Q.slips || Q.slips.unit_size.length !== 1 || FAMILY[Q.pics[Q.slips.unit_size[0]].word] !== fam || Q.pics[Q.slips.unit_size[0]].word === u) bad(id, "miss", "unit_size slip"); }
      const big = ["m", "kg", "L"].includes(u); if (t !== "UF" && !Q.fact.includes(big ? "big" : "small")) bad(id, "answer", "fact says big or small " + Q.fact);
      Q.opts.forEach(o => { const w = Q.pics[o]; if (w.say !== UNIT_SAY[w.word]) bad(id, "text", "unit spoken as " + w.say); });
    }
    if (id === "cafe_measure.2") {
      const f = Q.figure; if (!f || !["ruler", "jug"].includes(f.t)) bad(id, "figure", "needs a ruler or a jug");
      if (t === "RL" && (Q.ans < 2 || Q.ans > 14)) bad(id, "range", "length");
      if ((t === "JL" || t === "JD") && (Q.ans % 100 !== 0 || Q.ans < 100 || Q.ans > 900)) bad(id, "range", "ml in hundreds " + Q.ans);
    }
    if (id === "cafe_measure.3" || id === "cafe_measure.4") {
      const unitWords = [...Q.story.matchAll(/(\d+) (centimetres?|metres?|grams?|kilograms?|millilitres?|litres?)/g)].map(m => m[2].replace(/s$/, ""));
      if (unitWords.length !== 2 || unitWords[0] !== unitWords[1]) bad(id, "answer", "two numbers in one unit: " + Q.story);
      const [a, b] = nums(Q.story); if (a === b) bad(id, "answer", "the two numbers are the same");
      if (id === "cafe_measure.4" && !["AL", "AM", "AC"].includes(t) && !(a > b)) bad(id, "answer", "take-away needs the first to be bigger");
      const words = { ML: "longer", MS: "shorter", MH: "heavier", MG: "lighter", MC: "holds more", MD: "holds less", AL: "end to end", BL: "longer", AM: "together", BM: "heavier", AC: "together", BC: "more does" }[t];
      if (!Q.ask.includes(words)) bad(id, "story", `ask must say "${words}": ${Q.ask}`);
      const u = /(centimetres?|metres?|grams?|kilograms?|millilitres?|litres?)/.exec(Q.story)[1].replace(/s$/, ""); if (id === "cafe_measure.4" && !Q.ask.includes(u === "metre" || u === "litre" || u === "gram" ? u + "s" : u + "s")) bad(id, "story", "the unit in the question " + Q.ask + " / " + u);
      if (id === "cafe_measure.4" && (Q.op !== (["AL", "AM", "AC"].includes(t) ? "+" : "-"))) bad(id, "answer", "op");
      if (t === "ML" || t === "MS") { if (!/centimetre|metre/.test(Q.story)) bad(id, "story", "length unit"); }
    }
    // solids
    if (id === "cafe_solid.1" && (t === "NA" || t === "NC" || t === "NB")) { const names = Q.opts.map(o => Q.pics[o].word); if (names.some(n => !NAME_TO_SOLID[n])) bad(id, "text", "unknown solid name " + names); }
    if (id === "cafe_solid.1" && t === "NP" && Q.opts.some(o => !Q.pics[o].solid || !FG.SOLIDS.includes(Q.pics[o].solid))) bad(id, "choice", "NP buttons are solids");
    if (id === "cafe_solid.2") {
      const s = Q.figure.shape;
      if (t !== "FL" && !Q.story.includes(SOLID_NAME[s])) bad(id, "story", `the story names a ${SOLID_NAME[s]}: ${Q.story}`);
      if (["FF", "FE", "FC"].includes(t)) { const own = { FF: "faces", FE: "edges", FC: "corners" }[t]; const others = ["faces", "edges", "corners"].filter(x => x !== own).map(x => COUNTS[s][x]).filter(x => x !== Q.ans); const got = (Q.slips || {}).other_part || [];
        if (JSON.stringify(got.slice().sort()) !== JSON.stringify(others.slice().sort())) bad(id, "miss", `other_part ${got} want ${others}`); }
    }
    // graphs
    if (["cafe_graph.1", "cafe_graph.2", "cafe_graph.3"].includes(id)) {
      const R = id === "cafe_graph.1" ? readPicto(Q.figure) : id === "cafe_graph.2" ? readBars(Q.figure) : null;
      if (R) { const want = { PA: 1, PB: 2, PC: 5, BA: 1, BB: 2, BC: 5 }[t]; if (want && R.scale !== want) bad(id, "answer", `the scale of ${t} is ${want}, the drawing says ${R.scale}`); if (![1, 2, 5].includes(R.scale)) bad(id, "answer", "scale " + R.scale);
        Object.values(R.vals).forEach(v => { if (v % R.scale || v < R.scale) bad(id, "answer", "every value is a whole number of the scale " + v); });
        if (id === "cafe_graph.1" && !/stands for (one|two|five)/.test(R.key)) bad(id, "figure", "the key is in words " + R.key);
        if (id === "cafe_graph.2" && FG.texts(Q.figure).some(x => !/^\d+$/.test(x) && !Q.figure.cats.includes(x))) bad(id, "figure", "unexpected text on the bar graph " + FG.texts(Q.figure));
        const slip = (Q.slips || {}).scale_slip; if (R.scale > 1 && ["PB", "PC", "BB", "BC", "PD", "PT", "BD", "BT"].includes(t) && (!slip || !slip.length || slip.includes(Q.ans))) bad(id, "miss", "scale_slip " + JSON.stringify(slip));
        if (R.scale === 1 && slip) bad(id, "miss", "no scale slip at scale 1"); }
      if (Q.figure.cats.length < 3) bad(id, "figure", "cats");
      const vs = Object.values(R ? R.vals : readTally(Q.figure).vals); if (!R && vs.some(v => v < 3 || v > 22)) bad(id, "answer", "tally range");
      if (id === "cafe_graph.3" && Q.figure.t !== "tally") bad(id, "figure", "tally");
    }
    // chance
    if (id === "cafe_chance.1") { if (Q.opts.length !== 4) bad(id, "choice", "four words"); if (Q.pics[Q.ans].word !== ex.label) bad(id, "answer", `word ${Q.pics[Q.ans].word} want ${ex.label} ${tag}`); }
    if (id === "cafe_chance.2" && t === "FF") { if (Q.opts.length !== 2) bad(id, "choice", "yes or no"); }
    // fractions
    if (id === "cafe_frac.2") {
      if (t === "NF1" || t === "NF2") { const b = Q.figure.bars[0]; if (b.shaded.length < 1 || b.shaded.length >= (b.parts || 0) || ![2, 3, 4, 6, 8].includes(b.parts)) bad(id, "answer", "figure " + JSON.stringify(b)); if (t === "NF1" && b.shaded.length !== 1) bad(id, "answer", "NF1 shades one"); if (t === "NF2" && b.shaded.length < 2) bad(id, "answer", "NF2 shades more than one");
        if (/\bpie\b/.test(Q.story) !== (b.shape === "pie")) bad(id, "figure", "a pie story draws a pie: " + Q.story + " " + b.shape); }
      if (t === "NE") { const eq = Q.opts.filter(o => equalCuts(Q.pics[o].fig)).length; if (eq !== 1) bad(id, "one right", eq + " equal cakes"); Q.opts.forEach(o => { if (/\d/.test(Q.pics[o].name || "")) bad(id, "text", "name"); }); }
    }
    if (id === "cafe_frac.3") {
      if (t === "CB" || t === "CT") { const wrong = Q.opts.filter(o => o !== Q.ans); if (!Q.slips || JSON.stringify(Q.slips.bigger_parts.slice().sort()) !== JSON.stringify(wrong.slice().sort())) bad(id, "miss", "bigger_parts should be every wrong button"); }
      if (t === "CN") { const u = [...new Set(nums(Q.story))].sort((x, y) => y - x), n = u[0], a = u[1], b = u[2]; if (u.length !== 3 || !(a >= 1 && b >= 1 && a < n && b < n)) bad(id, "answer", "numerators " + u); }
      if (t === "CT" && new Set(nums(Q.story)).size !== 3) bad(id, "answer", "three different cuts");
      if ((t === "CB" || t === "CS") && nums(Q.story)[0] === nums(Q.story)[1]) bad(id, "answer", "different cuts");
    }
    if (id === "cafe_frac.4") {
      const f = fracOf(Q.story), t0 = nums(Q.story)[0]; if (!f || t0 % f[1]) bad(id, "answer", "a fraction that fits the set " + Q.story);
      if (f && f[0] > 1) { const per = t0 / f[1]; if (!Q.slips || Q.slips.one_group[0] !== per) bad(id, "miss", "one_group " + JSON.stringify(Q.slips)); }
      if (f && f[0] === 1 && Q.slips) bad(id, "miss", "no one_group slip for a unit fraction");
      if (!Q.hintPic || Q.hintPic.figure.t !== "set") bad(id, "hint", "set picture");
      if (f && Q.hintPic) { const s = svgOf(Q.hintPic.figure), dots = (s.match(/<circle/g) || []).length; if (dots !== t0) bad(id, "hint", `the set picture draws ${dots} dots, want ${t0}`); const pink = (s.match(/fill="#f08aa6"/g) || []).length; if (pink !== t0 / f[1] * f[0]) bad(id, "hint", "pink dots " + pink); }
    }
    if (id === "cafe_frac.5") {
      if (t === "LN" && (!Q.slips || Q.slips.count_marks[0] !== Q.ans + 1)) bad(id, "miss", "count_marks");
      if (t === "LK" || t === "LU") { const f = Q.figure; if (![3, 4, 6, 8].includes(f.parts) || f.mark < 1 || f.mark >= f.parts) bad(id, "answer", "fracline " + JSON.stringify(f)); }
      if (t === "LP") { const L = Q.figure.letters; if (L.length !== 3 || new Set(L.map(l => l.at)).size !== 3 || L.some(l => l.at < 1 || l.at >= Q.figure.parts)) bad(id, "answer", "letters"); }
    }
    // the scene: calm lineup with no number in it
    const S = Q.scene;
    if (!S || typeof S !== "object") bad(id, "scene", "no scene");
    else {
      if (S.act !== "lineup" || !SCENE_ACTS.has(S.act)) bad(id, "scene", "act " + S.act);
      if ("ans" in S) bad(id, "scene", "scene carries ans");
      if (!KS.SCENE_NOUNS.cafe.includes(S.noun)) bad(id, "scene", "unknown noun " + S.noun);
      if (S.holder && !HOLDERS.includes(S.holder)) bad(id, "scene", "unknown holder " + S.holder);
      if (!Number.isInteger(S.n) || S.n < 1 || S.n > 4 || Object.keys(S).some(k => !["act", "n", "noun", "noun2", "holder", "who"].includes(k))) bad(id, "scene", "lineup " + JSON.stringify(S));
    }
    // figures draw: plain SVG, no script, no animation; the help drawing has no numerals
    [Q.figure, Q.hintPic && Q.hintPic.figure].filter(Boolean).forEach((f, i) => {
      let svg; try { svg = FG.svg(f, i ? { help: Q.hintPic.help } : {}); } catch (e) { bad(id, "figure", "does not draw: " + e.message); return; }
      if (!/^<svg /.test(svg) || /<script|<animate|onclick|<image|http/i.test(svg) || svg.length > 30000 || /undefined|NaN/.test(svg)) bad(id, "figure", "bad svg " + svg.slice(0, 80));
    });
    if (Q.hintPic && Q.hintPic.figure) { const hp = HL.picture(Q); if (!hp || /<text[^>]*>\s*\d/.test(hp.svg) || !HL.sentences().includes(hp.caption)) bad(id, "hint", "hint picture"); }
    // text quality and voice
    texts(Q).forEach(tx => {
      if (typeof tx !== "string" || !tx.trim() || /\{|\}|undefined|NaN|\$/.test(tx)) { bad(id, "text", "unfilled: " + tx); return; }
      if (BANNED.test(tx)) bad(id, "text", "banned word " + tx);
      if (PLURAL_ONE.test(tx)) bad(id, "text", "plural after 1: " + tx);
      if (/\b[2-9] (centimetre|metre|gram|kilogram|millilitre|litre|face|edge|corner|part|group|picture|ticket|slice|piece|cup|scoop|cookie|cupcake|muffin|customer)\b/.test(tx)) bad(id, "text", "singular after many: " + tx);
      if (/[\/%×÷=]|\b(cm|kg|ml|mm)\b/.test(tx)) bad(id, "text", "a symbol or short unit is spoken: " + tx);
      if (/  /.test(tx)) bad(id, "text", "double space: " + tx);
      if (!sentenceSet.has(tx)) bad(id, "voice", "not in KS.sentences(): " + tx);
      splitPieces(tx).forEach(pc => { if (!pieceSet.has(pc)) bad(id, "voice", `piece "${pc}" of "${tx}"`); });
    });
    // lessons
    [true, false].forEach(right => {
      const T = KS.teach(Q, right);
      if (!T || !T.kind || !Array.isArray(T.steps) || T.steps.length < 3) { bad(id, "teach", "no lesson " + tag); return; }
      let answers = 0; const rows = new Set();
      T.steps.forEach((st, si) => {
        if (!Array.isArray(st.draw)) bad(id, "teach", "draw missing");
        if (st.line) bad(id, "teach", "no number line for these kinds");
        (st.draw || []).forEach(d => {
          Object.keys(d).forEach(k => { if (!["row", "tokens", "answer"].includes(k)) bad(id, "teach", "draw key " + k); });
          if (d.tokens) { const tx = d.tokens.join(" "); rows.add(d.row); if (tx.length > LONGEST) bad(id, "board", "row too wide: " + tx); if (d.row === 0 && tx !== Q.eq) bad(id, "teach", `row 0 "${tx}" is not the eq "${Q.eq}"`); if (!d.tokens.every(x => typeof x === "string" && x)) bad(id, "teach", "empty token"); }
          if (d.answer) { answers++; if (si !== T.steps.length - 1) bad(id, "teach", "answer not in the last step"); }
        });
      });
      const picTail = !!Q.picOpts;
      if (picTail ? answers !== 0 : answers !== 1) bad(id, "teach", "answer items " + answers + (picTail ? " (a word answer cannot be written on the board)" : ""));
      for (let r = 0; r <= Math.max(...rows); r++) if (!rows.has(r)) bad(id, "teach", "gap in rows");
      const last = T.steps[T.steps.length - 1].say, wantLast = right ? Q.fact : picTail ? `${Q.fact} ${Q.tapSay}` : `${Q.fact} ${Q.kind === "typed" ? "Type" : "Tap"} ${Q.ans}.`;
      if (last !== wantLast) bad(id, "teach", `last step "${last}" want "${wantLast}"`);
    });
    if (typeof Q.hint !== "string" || Q.hint.length < 15 || (Q.kind === "typed" && new RegExp(`(\\bis|=|makes?|answer is) ${Q.ans}\\b`).test(Q.hint))) bad(id, "hint", "the hint is too short or gives the answer away: " + Q.hint);
    // a wrong answer is classed; a known mix-up gets its own class
    if (Q.kind === "typed") { const wrong = Q.ans + 1; const c = MS.classify(Q, wrong); if (!MS.CLASSES.includes(c)) bad(id, "miss", "class " + c); }
    else { const w = Q.opts.find(o => o !== Q.ans), c = MS.classify(Q, w); if (!MS.CLASSES.includes(c)) bad(id, "miss", "class " + c); }
    if (Q.slips) Object.entries(Q.slips).forEach(([cls, list]) => list.forEach(v => { if (v !== Q.ans && MS.classify(Q, v) !== cls) bad(id, "miss", `${cls} slip ${v} is classed ${MS.classify(Q, v)}`); }));
  };
  KS.eachKindQuestion(id, checkQ);
  // the game asks for random questions: never the same one twice running, every type shows up
  let s = 777 + id.length * 31; const rng = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  const seen = new Set(), keys = new Set(); let prev = "";
  for (let i = 0; i < 400; i++) {
    let Q; try { Q = KS.make(id, "cafe", rng, prev); } catch (e) { bad(id, "make", e.message); break; }
    if (Q.key === prev) bad(id, "make", "repeated " + prev);
    prev = Q.key; seen.add(Q.type); keys.add(Q.key); checkQ(Q);
  }
  if (seen.size !== Object.keys(bank).length) bad(id, "variety", "types seen " + [...seen]);
  if (keys.size < (id === "cafe_solid.2" ? 8 : 20)) bad(id, "variety", "only " + keys.size + " different questions in 400");
  ["stories", "fields", "story", "scene", "eq", "board", "kind", "answer", "range", "one right", "choice", "miss", "text", "voice", "teach", "hint", "make", "variety", "figure"].forEach(cat => check(`${id} ${cat}`, P[id + " " + cat] || []));
});

// ---------- the drawings themselves ----------
(function figures() {
  const probs = [];
  const sample = [
    { t: "ruler", max: 15, bars: [{ len: 7, name: "straw" }] }, { t: "jug", max: 1000, levels: [300, 700], names: ["a", "b"] }, { t: "bars", cats: ["Mon", "Tue", "Wed"], vals: [5, 15, 10], scale: 5, unit: "cookies" },
    { t: "picto", cats: ["Tea", "Cocoa"], vals: [6, 4], scale: 2, icon: "cup", unit: "cups", one: "cup" }, { t: "tally", cats: ["Tea"], vals: [12] }, { t: "spinner", parts: ["red", "blue", "red", "green"] },
    { t: "jar", items: { red: 3, blue: 2 } }, { t: "fracbar", bars: [{ parts: 6, shaded: [0, 1], shape: "pie" }] }, { t: "fracline", parts: 8, mark: 3 }, { t: "set", total: 12, groups: 3, shade: [0] }
  ].concat(FG.SOLIDS.map(shape => ({ t: "solid", shape })));
  sample.forEach(f => {
    const a = FG.svg(f), b = FG.svg(f, { help: true });
    if (a.length < 100 || /undefined|NaN/.test(a + b)) probs.push(f.t + " draws badly");
    if (/<text[^>]*>\s*\d/.test(b) && f.t !== "bars_never") { if (["ruler", "jug", "bars", "fracline"].includes(f.t)) probs.push(f.t + " help drawing has numerals"); }
    if (!/aria-label="[^"]+"/.test(a)) probs.push(f.t + " has no label for a screen reader");
    if (/aria-label="[^"]*\d/.test(a) && !["bars"].includes(f.t)) probs.push(f.t + " aria-label has a digit");
  });
  check("every figure type draws, labelled, and the help drawing of a ruler, jug, bar graph and number line has no numerals", probs);
  check("the ruler is numbered at 0, 5, 10 and 15 only; the jug at 500 and 1000 only", [
    JSON.stringify(FG.texts({ t: "ruler", max: 15, bars: [{ len: 7, name: "straw" }] }).filter(x => /^\d+$/.test(x))) !== '["0","5","10","15"]' ? "ruler numbers" : null,
    JSON.stringify(FG.texts({ t: "jug", max: 1000, levels: [300] }).filter(x => /^\d+$/.test(x))) !== '["500","1000"]' ? "jug numbers" : null].filter(Boolean));
  check("a bar graph is numbered on every second line and a bar has no value printed on it", (() => { const f = { t: "bars", cats: ["Mon", "Tue"], vals: [3, 7], scale: 1, unit: "cookies" }, tx = FG.texts(f).filter(x => /^\d+$/.test(x)); return JSON.stringify(tx) === '["0","2","4","6","8"]' ? [] : ["axis " + tx]; })());
  check("the solids are seven different drawings", new Set(FG.SOLIDS.map(s => FG.solidSvg(s).replace(/sg\d+/g, "sg"))).size === 7 ? [] : ["same drawing twice"]);
  check("the fraction button is a stacked fraction", /class="fn">1<.*class="fd">3</.test(FG.fractionHtml("1/3")) ? [] : ["fractionHtml"]);
})();

// ---------- the new wrong-answer classes ----------
(function misses() {
  const find = (id, t, f) => { let r = null; KS.eachKindQuestion(id, Q => { if (!r && Q.type === t && (!f || f(Q))) r = Q; }); return r; };
  const unit = find("cafe_measure.1", "UL"), solid = find("cafe_solid.2", "FF"), pic = find("cafe_graph.1", "PB"), bars = find("cafe_graph.2", "BC"), big = find("cafe_frac.3", "CB"), set = find("cafe_frac.4", "K3"), ln = find("cafe_frac.5", "LN");
  const probs = [];
  const sizeWrong = unit.slips.unit_size[0]; if (MS.classify(unit, sizeWrong) !== "unit_size") probs.push("unit_size");
  const otherPart = solid.slips.other_part[0]; if (MS.classify(solid, otherPart) !== "other_part") probs.push("other_part");
  const sc = pic.slips.scale_slip[0]; if (MS.classify(pic, sc) !== "scale_slip") probs.push("scale_slip picto");
  if (MS.classify(bars, bars.slips.scale_slip[0]) !== "scale_slip") probs.push("scale_slip bars");
  if (MS.classify(big, big.slips.bigger_parts[0]) !== "bigger_parts") probs.push("bigger_parts");
  if (MS.classify(set, set.slips.one_group[0]) !== "one_group") probs.push("one_group");
  if (MS.classify(ln, ln.ans + 1) !== "count_marks") probs.push("count_marks");
  check("each new mix-up has its own class, with a lead sentence and a label", probs.concat(["unit_size", "other_part", "scale_slip", "bigger_parts", "one_group", "count_marks"].filter(c => !MS.CLASSES.includes(c) || !MS.LEAD[c] || !MS.LABEL[c])));
  check("a wrong word button with no known mix-up is still a guess", MS.classify(find("cafe_chance.1", "CJ"), (find("cafe_chance.1", "CJ").ans % 4) + 1) === "guess" ? [] : ["not a guess"]);
})();

console.log(`SHAPES ${shapes} question shapes in ${ids.length} skills; questions built: ${Object.values(answersByType).reduce((a, b) => a + b, 0)}`);
failures.forEach(f => console.log(f));
console.log(`RESULT ${passed}/${total} passed`);
process.exit(failures.length ? 1 : 0);
