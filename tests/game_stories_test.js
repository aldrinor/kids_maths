/* game_stories_test.js - checks game/stories.js. Run: node tests/game_stories_test.js
   Prints only failures and one RESULT line. No browser, no sound. */
"use strict";
const path = require("path");
const KS = require(path.join(__dirname, "..", "game", "stories.js"));

const MINUS = "−";
let total = 0, passed = 0;
const failures = [];
function check(name, problems) {
  total++;
  if (!problems.length) { passed++; return; }
  failures.push(`FAIL ${name} (${problems.length}): ${problems[0]}`);
}
function seeded(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

const digits = n => String(n).split("").reverse().map(Number);
function carries(a, b) { const A = digits(a), B = digits(b); let c = 0, k = 0; for (let i = 0; i < Math.max(A.length, B.length); i++) { const s = (A[i] || 0) + (B[i] || 0) + c; c = s >= 10 ? 1 : 0; k += c; } return k; }
function borrows(a, b) { const A = digits(a), B = digits(b); let br = 0, k = 0; for (let i = 0; i < A.length; i++) { const t = A[i] - br; if (t < (B[i] || 0)) { br = 1; k++; } else br = 0; } return k; }
const inr = (x, lo, hi) => x >= lo && x <= hi;

// The number rules of gen(L), written as plain yes/no tests.
const RULES = {
  "sums.1": (a, b, op) => op === "+" && inr(a, 1, 9) && inr(b, 1, 10 - a),
  "sums.2": (a, b, op) => op === "-" && inr(a, 2, 10) && inr(b, 1, a - 1),
  "sums.3": (a, b, op) => op === "+" && inr(a, 2, 9) && inr(b, Math.max(2, 11 - a), 9),
  "sums.4": (a, b, op) => op === "-" && inr(b, 2, 9) && inr(a - b, 2, 9) && a >= 11,
  "sums.5": (a, b, op) => {
    if (op === "+") return inr(a, 10, 88) && a % 10 <= 8 && a + b <= 99 && !carries(a, b) &&
      (inr(b, 1, 9 - a % 10) || (b % 10 === 0 && inr(b / 10, 1, 9 - Math.floor(a / 10))));
    return inr(a, 21, 99) && a % 10 >= 1 && b < a && !borrows(a, b) && (inr(b, 1, a % 10) || (b % 10 === 0 && inr(b / 10, 1, Math.floor(a / 10) - 1)));
  },
  "sums.6": (a, b, op) => op === "+" ? inr(a, 10, 89) && inr(b, 10, 89) && a + b <= 99 && !carries(a, b) : inr(a, 20, 99) && inr(b, 10, a - 1) && !borrows(a, b),
  "sums.7": (a, b, op) => op === "+" ? inr(a, 10, 89) && inr(b, 10, 89) && a + b <= 99 && carries(a, b) > 0 : inr(a, 20, 99) && inr(b, 10, a - 1) && borrows(a, b) > 0,
  "sums.8": (a, b, op) => op === "+" ? inr(a, 100, 899) && inr(b, 100, 899) && a + b <= 999 && !carries(a, b) : inr(a, 200, 999) && inr(b, 100, a - 1) && !borrows(a, b),
  "sums.9": (a, b, op) => op === "+" ? inr(a, 100, 899) && inr(b, 100, 899) && a + b <= 999 && carries(a, b) > 0 : inr(a, 200, 999) && inr(b, 100, a - 1) && borrows(a, b) > 0 && digits(a)[1] !== 0,
  "kinder.2": (a, b, op) => inr(a, 1, 10) && b === 0 && op === "+",
  "kinder.5": (a, b, op) => inr(a, 1, 4) && b === 5 - a && op === "+"
};
const OPSKILL = { "sums.1": "+", "sums.2": "-", "sums.3": "+", "sums.4": "-" };

const splitPieces = t => t.split(/\d+/).map(x => x.trim()).filter(Boolean);
const wordsIn = s => s.split(/\s+/).filter(Boolean).length;
const BANNED = /\b(kill|killed|hurt|blood|die|dies|died|dead|hit|hits|fight|fights|attack|shoot|shot|weapon|stab|war|beat|defeat|hate|scare|scared|angry|bad|cry|crying)\b/i;
const NAMES = /\b(trump|biden|obama|messi|elsa|mario)\b/i;
const ALLOWED_DRAW = new Set(["row", "tokens", "split", "hops", "answer"]);

const pieceSet = new Set(KS.pieces());
const sentenceList = KS.sentences();
const sentenceSet = new Set(sentenceList);

// ---------- global checks ----------
check("pieces under 1500", KS.pieces().length < 1500 ? [] : ["pieces: " + KS.pieces().length]);
check("pieces not empty strings", KS.pieces().filter(p => !p || p !== p.trim()).slice(0, 3));
check("sentences limit works", KS.sentences(5).length === 5 ? [] : ["limit"]);
check("skills list", ["sums.1", "sums.2", "sums.3", "sums.4", "sums.5", "sums.6", "sums.7", "sums.8", "sums.9", "kinder.2", "kinder.5"].filter(s => !KS.SKILLS.includes(s)));

KS.THEMES.forEach(theme => {
  const T = KS.templates(theme), sc = n => T.filter(t => t.type === n);
  const plus = T.filter(t => "JPM".includes(t.type)), minus = T.filter(t => "ACN".includes(t.type));
  check(`${theme}: 12+ plus stories fit sums.1`, plus.filter(t => KS.usable(t, "sums.1", "+")).length >= 12 ? [] : ["few"]);
  check(`${theme}: 12+ minus stories fit sums.2`, minus.filter(t => KS.usable(t, "sums.2", "-")).length >= 12 ? [] : ["few"]);
  check(`${theme}: 6+ plus stories fit sums.9`, plus.filter(t => KS.usable(t, "sums.9", "+")).length >= 6 ? [] : ["few"]);
  check(`${theme}: 6+ minus stories fit sums.9`, minus.filter(t => KS.usable(t, "sums.9", "-")).length >= 6 ? [] : ["few"]);
  check(`${theme}: has join, more-than, missing, take away, compare`, ["J", "P", "M", "A", "C", "N"].filter(k => !sc(k).length));
  check(`${theme}: story text clean`, T.flatMap(t => [t.story, t.ask]).filter(s => BANNED.test(s) || NAMES.test(s)));
  if (theme === "castle") check("castle: sentences under 12 words", T.flatMap(t => (t.story + " " + t.ask).replace(/\{[^}]*\}/g, "1").split(/[.?!]+/)).filter(s => wordsIn(s) >= 12));
  else check("cafe: sentences under 16 words", T.flatMap(t => (t.story + " " + t.ask).replace(/\{[^}]*\}/g, "1").split(/[.?!]+/)).filter(s => wordsIn(s) >= 16));
});

// ---------- per skill and theme ----------
function evalTokens(tokens) {
  // [x, op, y, "=", z] with numbers
  const [x, o, y, eq, z] = tokens;
  if (tokens.length !== 5 || eq !== "=") return "bad row " + tokens.join(" ");
  const X = +x, Y = +y, Z = +z;
  if ([X, Y, Z].some(Number.isNaN)) return "non-number row " + tokens.join(" ");
  const v = o === "+" ? X + Y : o === MINUS ? X - Y : NaN;
  return v === Z ? "" : "wrong sum in row " + tokens.join(" ");
}

KS.SKILLS.forEach(skill => KS.THEMES.forEach(theme => {
  const rng = seeded(skill.length * 977 + (theme === "cafe" ? 1 : 2) * 131 + skill.charCodeAt(skill.length - 1));
  const P = {};
  const bad = (cat, msg) => { (P[cat] = P[cat] || []).push(msg); };
  let prev = "", keys = new Set(), types = new Set();
  const small = KS.allPairs && (/^sums\.[1-4]$/.test(skill) || /^kinder/.test(skill));
  for (let i = 0; i < 400; i++) {
    let Q;
    try { Q = KS.make(skill, theme, rng, prev); } catch (e) { bad("make", e.message); break; }
    const tag = `${Q.key}|${Q.tpl}`;
    keys.add(Q.key); types.add(Q.type);
    // fields
    if (Q.skill !== skill || Q.theme !== theme) bad("fields", "skill or theme: " + tag);
    if (!["typed", "choice"].includes(Q.kind)) bad("fields", "kind " + tag);
    ["story", "ask", "say", "eq", "correct", "fact", "hint", "key"].forEach(f => { if (typeof Q[f] !== "string" || !Q[f]) bad("fields", f + " missing " + tag); });
    if (Q.say !== Q.story + " " + Q.ask) bad("say", "say is not story + ask: " + tag);
    // number rules
    if (!RULES[skill](Q.a, Q.b, Q.op)) bad("rules", `numbers break the rule: ${Q.a} ${Q.op} ${Q.b}`);
    if (OPSKILL[skill] && Q.op !== OPSKILL[skill]) bad("rules", "op " + tag);
    // answer
    const res = Q.op === "+" ? Q.a + Q.b : Q.a - Q.b;
    if (skill === "kinder.2") { if (Q.ans !== Q.a) bad("answer", "numeral " + tag); }
    else if (Q.missing) { if (Q.ans !== Q.b || Q.result !== res) bad("answer", "missing part " + tag); }
    else if (Q.ans !== res) bad("answer", `ans ${Q.ans} for ${Q.a}${Q.op}${Q.b}`);
    if (!Number.isInteger(Q.ans) || Q.ans < 0) bad("answer", "ans not a whole number " + tag);
    // eq
    const s = Q.op === "+" ? "+" : MINUS;
    const wantEq = skill === "kinder.2" ? `${KS.WORDS[Q.a]} = ?` : Q.missing ? `${Q.a} ${s} ? = ${res}` : `${Q.a} ${s} ${Q.b} = ?`;
    if (Q.eq !== wantEq) bad("eq", `eq "${Q.eq}" want "${wantEq}" ${Q.tpl}`);
    if (/-/.test(Q.eq)) bad("eq", "ascii hyphen in eq " + Q.eq);
    // story numbers
    const nums = (Q.story.match(/\d+/g) || []).map(Number).sort((x, y) => x - y).join(",");
    const wantNums = (skill === "kinder.2" ? [] : Q.missing ? [Q.a, res] : [Q.a, Q.b]).sort((x, y) => x - y).join(",");
    if (nums !== wantNums) bad("story", `story numbers [${nums}] want [${wantNums}] in ${Q.tpl}: ${Q.story}`);
    if ((Q.ask.match(/\d/g) || []).length) bad("story", "digits in the question: " + Q.ask);
    // no repeat
    if (Q.key === prev) bad("repeat", "repeated " + prev);
    prev = Q.key;
    // choice
    if (Q.kind === "choice") {
      const o = Q.opts;
      if (!Array.isArray(o) || o.length !== 3 || new Set(o).size !== 3 || !o.includes(Q.ans) || o.some(x => !Number.isInteger(x) || x < 0)) bad("choice", "bad opts " + JSON.stringify(o) + " ans " + Q.ans);
    } else if (Q.opts) bad("choice", "typed question has opts");
    if (skill.startsWith("kinder") && Q.kind !== "choice") bad("choice", "kinder must be choice");
    // line window
    const L = Q.line, p1 = Q.a, p2 = skill === "kinder.2" ? 0 : res, lo0 = Math.min(p1, p2), hi0 = Math.max(p1, p2);
    if (!L || ![1, 10, 100].includes(L.step) || L.hi !== L.lo + 10 * L.step || L.lo < 0 || L.lo > lo0 || L.hi < hi0) bad("line", `window ${JSON.stringify(L)} for ${p1},${p2}`);
    else if ((hi0 - lo0 <= 10) !== (L.step === 1)) bad("line", `step ${L.step} for ${p1},${p2}`);
    // text quality
    const all = [Q.say, Q.correct, Q.fact, Q.hint];
    all.forEach(t => {
      if (BANNED.test(t)) bad("text", "banned word: " + t);
      if (/(^|[^\d.])1 (?:more |old |clean )?(?:cupcakes|cups|cookies|coins|muffins|customers|saucers|trays|scoops|chairs|villagers|apples|shields|arrows|goblins|planks|lanterns|stones|bricks|keys|steps|sacks|stars|bags|treats)\b/i.test(t)) bad("text", "plural after 1: " + t);
      if (/\b(?:[2-9]|\d\d+) (?:more |old |clean )?(?:cupcake|cup|cookie|coin|muffin|customer|saucer|tray|scoop|chair|villager|apple|shield|arrow|goblin|plank|lantern|stone|brick|key|step|sack|star|tea bag|plank)\b(?!s)/.test(t)) bad("text", "singular after many: " + t);
      if (/\{|\}|undefined|NaN/.test(t)) bad("text", "unfilled: " + t);
    });
    if (Q.correct !== "Correct! " + Q.fact) bad("text", "correct text " + Q.correct);
    if (theme === "castle") (Q.story + " " + Q.ask).split(/[.?!]+/).forEach(x => { if (wordsIn(x) >= 12) bad("text", "castle sentence too long: " + x); });
    // pieces
    all.forEach(t => splitPieces(t).forEach(pc => { if (!pieceSet.has(pc)) bad("pieces", `piece "${pc}" of "${t}"`); }));
    // teach
    [true, false].forEach(right => {
      const T = KS.teach(Q, right);
      if (!T || !Array.isArray(T.steps) || !T.steps.length || !T.kind) { bad("teach", "no lesson " + tag); return; }
      const rows = new Set();
      let answers = 0, lastRowTokens = null;
      T.steps.forEach((st, si) => {
        if (typeof st.say !== "string" || !st.say.trim()) bad("teach", "empty step " + tag);
        splitPieces(st.say).forEach(pc => { if (!pieceSet.has(pc)) bad("pieces", `teach piece "${pc}" of "${st.say}"`); });
        if (BANNED.test(st.say) || /\{|undefined|NaN/.test(st.say)) bad("teach", "bad step text " + st.say);
        if (!Array.isArray(st.draw)) bad("teach", "draw missing");
        (st.draw || []).forEach(d => {
          Object.keys(d).forEach(k => { if (!ALLOWED_DRAW.has(k)) bad("teach", "draw key " + k); });
          if (d.tokens) {
            if (!Number.isInteger(d.row) || d.row < 0 || d.row > 3) bad("teach", "row index " + d.row);
            rows.add(d.row);
            if (!d.tokens.every(x => typeof x === "string")) bad("teach", "tokens not strings");
            if (d.row === 0) { if (d.tokens.join(" ") !== Q.eq) bad("teach", `row 0 "${d.tokens.join(" ")}" is not eq "${Q.eq}"`); }
            else { const e = evalTokens(d.tokens); if (e) bad("teach", e + " in " + tag); lastRowTokens = d.tokens; }
          }
          if (d.split) { if (d.split.length !== 2 || d.split[0] + d.split[1] !== Q.b) bad("teach", "split " + d.split); }
          if (d.hops) { const h = d.hops; if (!(h.n >= 1 && h.n <= 10) || ![1, -1].includes(h.dir) || h.from + h.n * h.dir < 0) bad("teach", "hops " + JSON.stringify(h)); }
          if (d.answer) { answers++; if (si !== T.steps.length - 1) bad("teach", "answer not in last step"); }
        });
        if (st.line) {
          const [f, t2, stp] = st.line;
          if (st.line.length !== 3 || ![f, t2, stp].every(Number.isInteger) || ![1, 10, 100].includes(stp) || (t2 - f) % stp !== 0 || f === t2) bad("teach", "line " + JSON.stringify(st.line));
          else if (Math.min(f, t2) < Q.line.lo || Math.max(f, t2) > Q.line.hi) bad("teach", `line ${st.line} outside window ${Q.line.lo}-${Q.line.hi}`);
        }
      });
      if (answers !== 1) bad("teach", "answer items: " + answers);
      const maxRow = Math.max(...rows);
      for (let r = 0; r <= maxRow; r++) if (!rows.has(r)) bad("teach", "gap in rows " + [...rows]);
      if (rows.size + 1 > 5) bad("teach", "more than 5 rows");
      if (rows.size < 1 || !rows.has(0)) bad("teach", "no row 0");
      if (skill !== "kinder.2" && lastRowTokens && +lastRowTokens[4] !== res) bad("teach", `last row ends at ${lastRowTokens[4]} not ${res} ${tag}`);
      const last = T.steps[T.steps.length - 1].say;
      if (right) { if (last !== Q.fact) bad("teach", "last step (right) is not the fact: " + last); }
      else { const want = `${Q.fact} ${Q.kind === "typed" ? "Type" : "Tap"} ${Q.ans}.`; if (last !== want) bad("teach", `last step "${last}" want "${want}"`); }
      if (T.steps.slice(0, -1).some(x => /\b(Type|Tap) \d+\./.test(x.say))) bad("teach", "Type/Tap before the last step");
      // hopper must end where the answer is
      const lines = T.steps.filter(x => x.line);
      if (lines.length && skill !== "kinder.2") {
        const endAt = lines[lines.length - 1].line[1];
        if (endAt !== (Q.type === "N" ? Q.a : res)) bad("teach", `hopper ends at ${endAt}`);
      }
    });
    // small skills: every sentence must be in KS.sentences()
    if (small) {
      all.forEach(t => { if (!sentenceSet.has(t)) bad("sentences", "not listed: " + t); });
      [true, false].forEach(r => KS.teach(Q, r).steps.forEach(st => { if (!sentenceSet.has(st.say)) bad("sentences", "step not listed: " + st.say); }));
    }
  }
  if (keys.size < 3) bad("variety", "only " + keys.size + " different questions");
  if (!/^kinder/.test(skill) && types.size < 3 && !/^sums\.[12]$/.test(skill)) bad("variety", "only story types " + [...types]);
  ["make", "fields", "say", "rules", "answer", "eq", "story", "repeat", "choice", "line", "text", "pieces", "teach", "variety"].concat(small ? ["sentences"] : [])
    .forEach(cat => check(`${skill} ${theme} ${cat}`, P[cat] || []));
}));

// ---------- all lessons for every 2 and 3 digit pair that can be reached (pieces + arithmetic) ----------
(function bigPairs() {
  const probs = [];
  const seen = new Set();
  const addQ = Q => {
    [true, false].forEach(r => KS.teach(Q, r).steps.forEach(st => splitPieces(st.say).forEach(pc => { if (!pieceSet.has(pc) && !seen.has(pc)) { seen.add(pc); probs.push(`piece "${pc}" in "${st.say}"`); } })));
    splitPieces(Q.hint).concat(splitPieces(Q.say)).forEach(pc => { if (!pieceSet.has(pc) && !seen.has(pc)) { seen.add(pc); probs.push(`piece "${pc}"`); } });
  };
  const rng = seeded(4242);
  ["sums.5", "sums.6", "sums.7", "sums.8", "sums.9"].forEach(skill => KS.THEMES.forEach(theme => {
    let prev = "";
    for (let i = 0; i < 1500; i++) { const Q = KS.make(skill, theme, rng, prev); prev = Q.key; addQ(Q); }
  }));
  check("big skills: 7500 more questions stay inside the pieces", probs.slice(0, 5));
})();

// ---------- small skills: every pair, every story ----------
(function everyPair() {
  const probs = [];
  KS.THEMES.forEach(theme => ["sums.1", "sums.2", "sums.3", "sums.4", "kinder.2", "kinder.5"].forEach(skill => {
    KS.allPairs(skill).forEach(p => {
      KS.templates(theme).filter(t => KS.usable(t, skill, p.op)).forEach(tpl => {
        const Q = KS.build(skill, theme, tpl, p.a, p.b);
        [Q.say, Q.correct, Q.fact, Q.hint].concat([true, false].flatMap(r => KS.teach(Q, r).steps.map(s => s.say))).forEach(t => {
          if (!sentenceSet.has(t)) probs.push("missing: " + t);
          splitPieces(t).forEach(pc => { if (!pieceSet.has(pc)) probs.push(`piece "${pc}"`); });
        });
        if (/^sums/.test(skill) && !RULES[skill](Q.a, Q.b, Q.op)) probs.push("pair breaks the rule");
      });
    });
  }));
  check("every pair of sums.1-4 and kinder, both themes: sentences and pieces", probs.slice(0, 5));
})();

failures.forEach(f => console.log(f));
console.log(`RESULT ${passed}/${total} passed (sentences ${sentenceList.length}, pieces ${KS.pieces().length})`);
process.exit(passed === total ? 0 : 1);
