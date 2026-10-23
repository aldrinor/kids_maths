/* game_stories_test.js - checks game/stories.js. Run: node tests/game_stories_test.js
   Stage 3 (22 Oct 2026): also every question of every new kind (cafe_* for Marie, kinder.count20/more_less/compare/make10 for Kennedy).
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
check("pieces under 2000", KS.pieces().length < 2000 ? [] : ["pieces: " + KS.pieces().length]);
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

KS.OLD_SKILLS.forEach(skill => KS.THEMES.forEach(theme => {
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

// ---------- Stage 3 kinds (22 Oct 2026): every question each kind can make ----------
(function stage3() {
  const KIND_IDS = ["cafe_tens.1", "cafe_times.1", "cafe_times.2", "cafe_share.1", "cafe_share.2", "cafe_money.1", "cafe_money.2", "cafe_time.1", "cafe_frac.1",
    "kinder.count20", "kinder.more_less", "kinder.compare", "kinder.make10"];
  check("stage 3: every kind is a skill", KIND_IDS.filter(id => !KS.SKILLS.includes(id) || !KS.KIND_IDS.includes(id)));
  check("stage 3: old skills kept", ["sums.1", "sums.9", "kinder.2", "kinder.5"].filter(id => !KS.OLD_SKILLS.includes(id)));
  check("stage 3: no shapes skill (no picture on the question screen)", KS.SKILLS.includes("kinder.6") ? ["kinder.6 listed"] : []);
  const known = new Set(KS.SKILLS);
  const ex = KS.extraSkills();
  check("stage 3: plain counting stays out of the game", ex.some(x => x.id === "kinder.count20") ? ["kinder.count20"] : []);
  check("stage 3: extra skills for the engine", KIND_IDS.filter(id => id !== "kinder.count20").filter(id => { const e = ex.find(x => x.id === id); return !e || !e.name || !Number.isFinite(e.grade) || !e.group || !Array.isArray(e.needs) || !e.needs.length || e.needs.some(n => !known.has(n) || n === id) || e.ready !== true; }));
  check("stage 3: extra skills are fresh objects", KS.extraSkills()[0] !== ex[0] ? [] : ["same object"]);
  check("stage 3: theme fits", KIND_IDS.filter(id => { const th = id.startsWith("cafe") ? "cafe" : "castle", other = th === "cafe" ? "castle" : "cafe"; return !KS.fits(id, th) || KS.fits(id, other) || KS.kindTheme(id) !== th; })
    .concat(KS.OLD_SKILLS.filter(id => !KS.fits(id, "cafe") || !KS.fits(id, "castle"))));
  check("stage 3: needs stay inside one child's skills", ex.filter(e => e.needs.some(n => !KS.fits(n, KS.kindTheme(e.id)))).map(e => e.id));
  check("stage 3: wrong theme throws", KIND_IDS.filter(id => { try { KS.make(id, KS.kindTheme(id) === "cafe" ? "castle" : "cafe", Math.random, ""); return true; } catch (e) { return false; } }));

  // The right answer, worked out here from the numbers (not taken from stories.js).
  const ANSWER = {
    "cafe_tens.1": (t, p) => t === "T" ? 10 * p.t + p.o : t === "D" ? p.t : p.o,
    "cafe_times.1": (t, p) => p.n * p.s, "cafe_times.2": (t, p) => p.n * p.s,
    "cafe_share.1": (t, p) => p.q, "cafe_share.2": (t, p) => p.q,
    "cafe_money.1": (t, p) => t === "L" ? 2 * p.a + p.b : 10 * p.a + 5 * p.b,
    "cafe_money.2": (t, p) => p.g - p.p,
    "cafe_time.1": (t, p) => t === "J" ? p.a + p.b : t === "A" ? p.a - p.b : p.b,
    "cafe_frac.1": (t, p) => t === "H" ? p.n / 2 : p.n / 4,
    "kinder.count20": (t, p) => p.x + 3,
    "kinder.more_less": (t, p) => t === "O" ? p.a + 1 : p.a - 1,
    "kinder.compare": (t, p) => t === "G" ? Math.max(p.a, p.b) : Math.min(p.a, p.b),
    "kinder.make10": (t, p) => 10 - p.a
  };
  // Allowed numbers for each kind: [lowest answer, highest answer, rule on the numbers].
  const RANGE = {
    "cafe_tens.1": [0, 99, (t, p) => inr(p.t, 1, 9) && inr(p.o, t === "D" ? 0 : 1, 9)],
    "cafe_times.1": [4, 100, (t, p) => [2, 5, 10].includes(p.s) && inr(p.n, 2, 10)],
    "cafe_times.2": [6, 40, (t, p) => [3, 4].includes(p.s) && inr(p.n, 2, 10)],
    "cafe_share.1": [2, 10, (t, p) => [2, 5, 10].includes(p.d) && inr(p.q, 2, 10)],
    "cafe_share.2": [2, 10, (t, p) => [3, 4].includes(p.d) && inr(p.q, 2, 10)],
    "cafe_money.1": [3, 50, (t, p) => p.a >= 1 && p.b >= 1 && (t === "L" ? 2 * p.a + p.b <= 10 : 10 * p.a + 5 * p.b <= 50)],
    "cafe_money.2": [1, 9, (t, p) => (p.g === 10 && inr(p.p, 1, 9)) || (p.g === 20 && inr(p.p, 11, 19))],
    "cafe_time.1": [1, 12, (t, p) => inr(p.a, 1, 12) && inr(p.b, 1, 8) && inr(t === "A" ? p.a - p.b : p.a + p.b, 1, 12)],
    "cafe_frac.1": [1, 10, (t, p) => p.n % (t === "H" ? 2 : 4) === 0],
    "kinder.count20": [4, 20, (t, p) => p.x >= 1],
    "kinder.more_less": [1, 10, (t, p) => inr(p.a, 1, 10)],
    "kinder.compare": [1, 10, (t, p) => p.a !== p.b && inr(p.a, 1, 10) && inr(p.b, 1, 10)],
    "kinder.make10": [1, 9, (t, p) => inr(p.a, 1, 9)]
  };
  // Is a written sentence true? Sums, ×, ÷, >, <, "3 tens + 4 = 34", "3×2 + 4 = 10", "tens in 34 = 3", "ones in 34 = 4", "13, 14, 15, 16".
  function truth(text) {
    let m;
    if ((m = text.match(/^(\d+), (\d+), (\d+), (\d+)$/))) return +m[2] === +m[1] + 1 && +m[3] === +m[2] + 1 && +m[4] === +m[3] + 1;
    if ((m = text.match(/^tens in (\d+) = (\d+)$/))) return Math.floor(+m[1] / 10) === +m[2];
    if ((m = text.match(/^ones in (\d+) = (\d+)$/))) return +m[1] % 10 === +m[2];
    if ((m = text.match(/^(\d+) ([<>]) (\d+)$/))) return m[2] === ">" ? +m[1] > +m[3] : +m[1] < +m[3];
    const sides = text.replace(/(\d+) tens/g, "($1*10)").replace(/×/g, "*").replace(/÷/g, "/").replace(new RegExp(MINUS, "g"), "-").split(" = ");
    if (sides.length !== 2 || !sides.every(x => /^[\d\s+\-*/()]+$/.test(x))) return false;
    const [l, r] = sides.map(x => Function(`"use strict"; return (${x});`)());
    return Number.isInteger(l) && l === r;
  }
  check("stage 3: the truth checker works", [["3 × 4 = 12", true], ["3 × 4 = 13", false], ["12 ÷ 3 = 4", true], ["7 ÷ 2 = 3", false], ["6 > 4", true], ["6 < 4", false],
    ["3 tens + 4 = 34", true], ["tens in 34 = 3", true], ["ones in 34 = 3", false], ["13, 14, 15, 16", true], ["13, 14, 15, 17", false], ["3×2 + 4 = 10", true], ["10 − 7 = 3", true]]
    .filter(([t, w]) => truth(t) !== w).map(([t]) => t));
  const PLURAL_ONE = /(^|[^\d.,])1 (?!more\b|and\b|is\b|plus\b|minus\b|times\b)([a-z']+s)\b/i;
  const SINGULAR_MANY = /\b(?:[2-9]|\d\d+) (?:hour|dollar|ten|hop|toonie|loonie|dime|nickel|group|villager|goblin|cookie|cupcake|slice|piece|knight|apple|coin|lantern|pillow|tray|table|cup)\b(?!s| bill)/;
  const LONGEST = 15;   // letters in one board row: the board does not shrink or wrap ("999 − 555 = 444" is 15)

  KIND_IDS.forEach(id => {
    const P = {}, bad = (cat, msg) => { (P[cat] = P[cat] || []).push(msg); };
    const theme = KS.kindTheme(id), bank = KS.kindBank(id), [aLo, aHi, rule] = RANGE[id];
    const nTpl = Object.values(bank).reduce((a, l) => a + l.length, 0);
    if (nTpl < 10) bad("stories", `only ${nTpl} stories`);
    Object.values(bank).flat().forEach(([story, ask]) => {
      if (BANNED.test(story + " " + ask) || NAMES.test(story + " " + ask)) bad("stories", "banned word: " + story);
      const max = theme === "castle" ? 12 : 16;
      (story + " " + ask).replace(/\{[^}]*\}/g, "1").split(/[.?!:]+/).forEach(x => { if (wordsIn(x) >= max) bad("stories", "sentence too long: " + x); });
      if (/\d/.test(ask)) bad("stories", "digits in the question: " + ask);
    });
    const types = new Set(KS.kindAll(id).map(p => p.type));
    Object.keys(bank).forEach(t => { if (!types.has(t)) bad("stories", "no numbers for type " + t); });
    let count = 0;
    const checkQ = Q => {
      count++;
      const tag = `${Q.key}|${Q.tpl}`, p = Q.p;
      // fields
      if (Q.skill !== id || Q.theme !== theme) bad("fields", "skill or theme " + tag);
      ["story", "ask", "say", "eq", "correct", "fact", "hint", "key"].forEach(f => { if (typeof Q[f] !== "string" || !Q[f]) bad("fields", f + " missing " + tag); });
      if (Q.say !== Q.story + " " + Q.ask) bad("fields", "say is not story + ask " + tag);
      if (Q.correct !== "Correct! " + Q.fact) bad("fields", "correct text " + tag);
      // answer and numbers
      const want = ANSWER[id](Q.type, p);
      if (Q.ans !== want) bad("answer", `ans ${Q.ans} want ${want} ${tag}`);
      if (!Number.isInteger(Q.ans) || Q.ans < aLo || Q.ans > aHi) bad("range", `ans ${Q.ans} outside ${aLo}-${aHi} ${tag}`);
      if (!rule(Q.type, p)) bad("range", "numbers break the rule " + JSON.stringify(p));
      if (id.startsWith("cafe_share") && Q.result !== p.d * p.q) bad("range", "share total " + tag);
      // the number sentence
      if ((Q.eq.match(/\?/g) || []).length !== 1) bad("eq", "eq needs one ? " + Q.eq);
      if (/-/.test(Q.eq)) bad("eq", "ascii hyphen in eq " + Q.eq);
      const filled = Q.eq.replace("?", String(Q.ans));
      if (!truth(filled)) bad("eq", "eq with the answer is not true: " + filled);
      if (filled.length > LONGEST) bad("board", "answer line too wide: " + filled);
      // story numbers
      const nums = (Q.story.match(/\d+/g) || []).map(Number).sort((x, y) => x - y).join(","), wantNums = Q.nums.slice().sort((x, y) => x - y).join(",");
      if (nums !== wantNums) bad("story", `story numbers [${nums}] want [${wantNums}] ${tag}: ${Q.story}`);
      if ((Q.ask.match(/\d/g) || []).length) bad("story", "digits in the question: " + Q.ask);
      // answers: Marie types, Kennedy taps
      if (theme === "cafe") { if (Q.kind !== "typed" || Q.opts) bad("choice", "cafe kinds are typed " + tag); }
      else {
        const o = Q.opts, n = id === "kinder.compare" ? 2 : 3;
        if (Q.kind !== "choice" || !Array.isArray(o) || o.length !== n || new Set(o).size !== n || !o.includes(Q.ans) || o.some(x => !Number.isInteger(x) || x < 0 || x > 20))
          bad("choice", "bad opts " + JSON.stringify(o) + " ans " + Q.ans + " " + tag);
        else if (id === "kinder.compare" && !(o.includes(p.a) && o.includes(p.b))) bad("choice", "compare opts are not the two groups " + tag);
      }
      // the number line on the question screen
      const L = Q.line, on = v => v >= L.lo && v <= L.hi && (v - L.lo) % L.step === 0;
      if (!L || ![L.lo, L.hi, L.step].every(Number.isInteger) || L.lo < 0 || L.step < 1 || (L.hi - L.lo) % L.step || (L.hi - L.lo) / L.step > 10 || (L.hi - L.lo) / L.step < 4) bad("line", "window " + JSON.stringify(L));
      else {
        if (!on(Q.a) || !on(Q.result)) bad("line", `start ${Q.a} or end ${Q.result} not on ${JSON.stringify(L)} ${tag}`);
        if (L.step > 1 && (Q.a !== L.lo || Q.op === "-")) bad("line", "the game moves a big-step line to start at Q.a: " + tag);
      }
      // text quality and voice
      const lesson = [true, false].map(r => KS.teach(Q, r));
      const texts = [Q.say, Q.correct, Q.fact, Q.hint].concat(lesson.flatMap(T => (T && T.steps || []).map(s => s.say)));
      texts.forEach(t => {
        if (typeof t !== "string" || !t.trim() || /\{|\}|undefined|NaN/.test(t)) { bad("text", "unfilled: " + t); return; }
        if (BANNED.test(t)) bad("text", "banned word: " + t);
        if (PLURAL_ONE.test(t)) bad("text", "plural after 1: " + t);
        if (SINGULAR_MANY.test(t)) bad("text", "singular after many: " + t);
        if (!sentenceSet.has(t)) bad("voice", "not in KS.sentences(): " + t);
        splitPieces(t).forEach(pc => { if (!pieceSet.has(pc)) bad("voice", `piece "${pc}" of "${t}"`); });
      });
      if (theme === "castle") (Q.story + " " + Q.ask).split(/[.?!:]+/).forEach(x => { if (wordsIn(x) >= 12) bad("text", "castle sentence too long: " + x); });
      // the lesson plan
      lesson.forEach((T, ri) => {
        const right = ri === 0;
        if (!T || !T.kind || !Array.isArray(T.steps) || T.steps.length < 2) { bad("teach", "no lesson " + tag); return; }
        const rows = new Set();
        let answers = 0;
        T.steps.forEach((st, si) => {
          if (!Array.isArray(st.draw)) bad("teach", "draw missing " + tag);
          (st.draw || []).forEach(d => {
            Object.keys(d).forEach(k => { if (!["row", "tokens", "answer"].includes(k)) bad("teach", "draw key " + k); });
            if (d.tokens) {
              if (!Number.isInteger(d.row) || d.row < 0 || d.row > 3) bad("teach", "row index " + d.row);
              rows.add(d.row);
              if (!d.tokens.every(x => typeof x === "string" && x)) bad("teach", "empty token " + tag);
              const text = d.tokens.join(" ");
              if (text.length > LONGEST) bad("board", "row too wide: " + text);
              if (d.row === 0) { if (text !== Q.eq) bad("teach", `row 0 "${text}" is not eq "${Q.eq}"`); }
              else if (!truth(text)) bad("teach", `row not true: "${text}" ${tag}`);
            }
            if (d.answer) { answers++; if (si !== T.steps.length - 1) bad("teach", "answer not in the last step"); }
          });
          if (st.line) {
            const [f, t2, stp] = st.line, n = Math.abs(t2 - f) / stp;
            if (st.line.length !== 3 || ![f, t2, stp].every(Number.isInteger) || stp < 1 || f < 0 || t2 < 0 || f === t2 || !Number.isInteger(n) || n > 12) bad("teach", "line " + JSON.stringify(st.line) + " " + tag);
          }
        });
        if (answers !== 1) bad("teach", "answer items: " + answers);
        const maxRow = Math.max(...rows);
        for (let r = 0; r <= maxRow; r++) if (!rows.has(r)) bad("teach", "gap in rows " + [...rows]);
        if (!rows.has(0)) bad("teach", "no row 0");
        const last = T.steps[T.steps.length - 1].say, wantLast = right ? Q.fact : `${Q.fact} ${Q.kind === "typed" ? "Type" : "Tap"} ${Q.ans}.`;
        if (last !== wantLast) bad("teach", `last step "${last}" want "${wantLast}"`);
        if (T.steps.slice(0, -1).some(x => /\b(Type|Tap) \d+\./.test(x.say))) bad("teach", "Type/Tap before the last step");
      });
    };
    KS.eachKindQuestion(id, checkQ);
    // random questions as the game asks them: no repeats, variety, every type
    const rng = seeded(id.length * 7919 + id.charCodeAt(id.length - 1)), keys = new Set(), seenTypes = new Set(), seenTpl = new Set();
    let prev = "";
    for (let i = 0; i < 400; i++) {
      let Q;
      try { Q = KS.make(id, theme, rng, prev); } catch (e) { bad("make", e.message); break; }
      if (Q.key === prev) bad("make", "repeated " + prev);
      prev = Q.key; keys.add(Q.key); seenTypes.add(Q.type); seenTpl.add(Q.tpl);
      checkQ(Q);
    }
    if (keys.size < 8) bad("variety", "only " + keys.size + " different questions");
    if (seenTypes.size !== Object.keys(bank).length) bad("variety", "types seen " + [...seenTypes]);
    if (seenTpl.size < Math.min(10, nTpl)) bad("variety", "stories seen " + seenTpl.size);
    if (count < 50) bad("variety", "only " + count + " questions in all");
    ["stories", "fields", "answer", "range", "eq", "board", "story", "choice", "line", "text", "voice", "teach", "make", "variety"].forEach(cat => check(`${id} ${cat}`, P[cat] || []));
  });
})();

// ---------- question scene (22 Oct 2026): every possible question has a valid Q.scene ----------
(function sceneChecks() {
  const ACTS = new Set(KS.SCENE_ACTS), WHO = new Set(KS.SCENE_WHO), probs = [];
  const int = x => Number.isInteger(x) && x >= 0;
  const COINS = new Set(["toonie", "loonie", "dime", "nickel"]);
  let n = 0;
  function checkScene(Q) {
    n++;
    const S = Q.scene, tag = `${Q.tpl} ${Q.key}`;
    const bad = m => { if (probs.length < 50) probs.push(`${tag}: ${m} ${JSON.stringify(S)}`); };
    if (!S || typeof S !== "object") return bad("no scene");
    if (!ACTS.has(S.act)) bad("unknown act");
    const nouns = new Set(KS.SCENE_NOUNS[Q.theme]);
    if (!nouns.has(S.noun)) bad("unknown noun");
    if (S.noun2 !== undefined && !nouns.has(S.noun2)) bad("unknown noun2");
    if (S.who !== undefined && !WHO.has(S.who)) bad("unknown who");
    if ("ans" in S) bad("the scene must not carry the answer");
    const need = (...k) => k.forEach(x => { if (!int(S[x])) bad("field " + x + " not a whole number"); });
    switch (S.act) {
      case "add": need("a", "b"); if (S.a + S.b !== Q.result) bad("a + b is not the result"); break;
      case "sub": need("a", "b"); if (S.a - S.b !== Q.result) bad("a - b is not the result"); break;
      case "need": need("a", "total"); if (S.total - S.a !== Q.ans) bad("total - a is not the answer"); break;
      case "left": need("a", "left"); if (S.a - S.left !== Q.ans) bad("a - left is not the answer"); break;
      case "compare": need("a", "b"); if (!["diff", "more", "fewer"].includes(S.ask)) bad("ask");
        if (S.ask === "diff" && S.a - S.b !== Q.ans) bad("a - b"); if (S.ask === "more" && Math.max(S.a, S.b) !== Q.ans) bad("more"); if (S.ask === "fewer" && Math.min(S.a, S.b) !== Q.ans) bad("fewer"); break;
      case "numeral": if (S.word !== KS.WORDS[Q.ans]) bad("word"); break;
      case "groups": need("n", "per"); if (S.n * S.per !== Q.ans) bad("n x per"); if (!S.holder) bad("no holder"); break;
      case "share": need("total"); if (S.mode === "each") { need("ways"); if (S.total / S.ways !== Q.ans) bad("total / ways"); }
        else if (S.mode === "groups") { need("per"); if (S.total / S.per !== Q.ans) bad("total / per"); } else bad("mode"); if (!S.holder) bad("no holder"); break;
      case "place": need("tens", "ones"); if (10 * S.tens + S.ones !== Q.ans) bad("tens and ones"); break;
      case "bundle": need("n", "size"); if ((S.ask === "tens" ? Math.floor(S.n / 10) : S.n % 10) !== Q.ans) bad("bundle"); break;
      case "money": { if (!Array.isArray(S.coins) || !S.coins.length) { bad("coins"); break; }
        const v = { toonie: 2, loonie: 1, dime: 10, nickel: 5 }; let t = 0;
        S.coins.forEach(([k, c]) => { if (!COINS.has(k) || !int(c)) bad("coin " + k); t += v[k] * c; }); if (t !== Q.ans) bad("coins do not add up"); break; }
      case "change": need("price", "paid"); if (S.paid - S.price !== Q.ans) bad("paid - price"); break;
      case "time": need("from"); if (S.dir === "span") { need("to"); if (S.to - S.from !== Q.ans) bad("span"); }
        else { need("hours"); if ((S.dir === "later" ? S.from + S.hours : S.from - S.hours) !== Q.ans) bad("hours"); } break;
      case "fraction": need("n", "parts"); if (S.n / S.parts !== Q.ans) bad("parts"); if (!S.holder) bad("no holder"); break;
      case "count": if (!Array.isArray(S.seq) || S.seq.length !== 3 || S.seq[2] + 1 !== Q.ans) bad("seq"); break;
      case "more_less": need("a"); if (S.a + S.dir !== Q.ans) bad("dir"); break;
      case "make10": need("a", "total"); if (S.total - S.a !== Q.ans) bad("make10"); break;
    }
  }
  KS.THEMES.forEach(theme => {
    KS.OLD_SKILLS.forEach(skill => {
      if (KS.allPairs && /^(sums\.[1-4]|kinder)/.test(skill)) KS.allPairs(skill).forEach(p => KS.templates(theme).filter(t => KS.usable(t, skill, p.op)).forEach(t => checkScene(KS.build(skill, theme, t, p.a, p.b))));
      else { const rng = seeded(skill.length * 31 + theme.length); for (let i = 0; i < 400; i++) checkScene(KS.make(skill, theme, rng, "")); }
    });
  });
  KS.KIND_IDS.forEach(id => KS.eachKindQuestion(id, checkScene));
  // every template of every theme has its scene words
  KS.THEMES.forEach(theme => KS.templates(theme).forEach(t => { if (!t.scene || !t.scene.noun) probs.push(t.id + ": no scene words"); }));
  check(`scene: every question has a valid Q.scene`, n > 5000 ? probs : probs.concat("only " + n + " questions checked"));
})();

failures.forEach(f => console.log(f));
console.log(`RESULT ${passed}/${total} passed (sentences ${sentenceList.length}, pieces ${KS.pieces().length})`);
process.exit(passed === total ? 0 : 1);
