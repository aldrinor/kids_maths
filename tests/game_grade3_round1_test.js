/* game_grade3_round1_test.js - checks the ten number-sense skills added on 23 Oct 2026 (Grade 3 gaps, round 1) in game/stories.js:
 *   cafe_compare.1 (more or less to 1000), cafe_order.1 (put in order), cafe_order.2 (10 or 100 more or less), cafe_evenodd.1 (even and odd),
 *   cafe_estimate.1 (round to 10 or 100), cafe_estimate.2 (about how many in all: a typed answer is right anywhere in a reasonable range),
 *   cafe_estimate.3 (the best estimate: tap), cafe_bills.1, cafe_bills.2, cafe_bills.3 (bills and coins to 100 dollars).
 * Every question every kind can make is built. The right answer is worked out HERE from the numbers (not read from stories.js), every tap question is checked option by
 * option (exactly ONE option is right), the typed estimates are checked against the range rule, the scene never carries the answer, every picture file exists, every spoken
 * sentence is in KS.sentences(). It also counts the question shapes and fails if there are fewer than 40.
 * Run: node tests/game_grade3_round1_test.js     Prints only failures and RESULT lines. No browser, no sound. */
"use strict";
const fs = require("fs");
const path = require("path");
const KS = require(path.join(__dirname, "..", "game", "stories.js"));
const HL = require(path.join(__dirname, "..", "game", "hint_ladder.js"));
const MS = require(path.join(__dirname, "..", "game", "miss_study.js"));
const GAME = path.join(__dirname, "..", "game");

let total = 0, passed = 0;
const failures = [];
function check(name, problems) { total++; if (!problems.length) passed++; else failures.push(`FAIL ${name} (${problems.length}): ${problems[0]}`); }
const MINUS = "−";
const BANNED = /\b(kill|killed|hurt|blood|die|dies|died|dead|hit|hits|fight|fights|attack|shoot|shot|weapon|stab|war|beat|defeat|hate|scare|scared|angry|bad|cry|crying)\b/i;
const PLURAL_ONE = /(^|[^\d.,])1 (?!more\b|and\b|is\b|plus\b|minus\b|times\b|of\b)([a-z']+s)\b/i;
const SINGULAR_MANY = /\b(?:[2-9]|\d\d+) (?:hour|dollar|ten|hop|toonie|loonie|dime|nickel|group|tray|table|cup|bill|coin|jar|box)\b(?!s|-| bill)/;   // "2 twenty-dollar bills" is fine (the word is hyphenated)
const wordsIn = s => s.split(/\s+/).filter(Boolean).length;
const splitPieces = t => t.split(/\d+/).map(x => x.trim()).filter(Boolean);
const sentenceSet = new Set(KS.sentences()), pieceSet = new Set(KS.pieces());
const SCENE_ACTS = new Set(KS.SCENE_ACTS);
const ids = ["cafe_compare.1", "cafe_order.1", "cafe_order.2", "cafe_evenodd.1", "cafe_estimate.1", "cafe_estimate.2", "cafe_estimate.3", "cafe_bills.1", "cafe_bills.2", "cafe_bills.3"];
const LONGEST = 15;
const near10 = n => Math.round(n / 10) * 10, near100 = n => Math.round(n / 100) * 100;     // no ties are ever asked
const even = n => n % 2 === 0;
const sorted = a => a.slice().sort((x, y) => x - y);
const BILLS = [5, 10, 20, 50, 100];

// ---------- the list of skills ----------
check("the ten kinds exist and are skills", ids.filter(id => !KS.KIND_IDS.includes(id) || !KS.SKILLS.includes(id)));
check("all are Marie's: cafe theme, not Kennedy's, none optional", ids.filter(id => KS.kindTheme(id) !== "cafe" || !KS.fits(id, "cafe") || KS.fits(id, "castle") || KS.optional(id)));
check("extra skills carry them with a name, grade, group and needs that exist", KS.extraSkills().filter(e => ids.includes(e.id)).filter(e => !e.name || e.grade !== 3 || !["count", "money_time"].includes(e.group) || !e.needs.length || e.needs.some(n => !KS.SKILLS.includes(n)) || e.play.src !== "story").map(e => e.id));
check("the order of needs makes sense (compare first, bills.1 before bills.2 and 3, round before the estimates)", [
  ["cafe_order.1", "cafe_compare.1"], ["cafe_estimate.1", "cafe_compare.1"], ["cafe_estimate.2", "cafe_estimate.1"], ["cafe_estimate.3", "cafe_estimate.1"],
  ["cafe_bills.2", "cafe_bills.1"], ["cafe_bills.3", "cafe_bills.1"], ["cafe_bills.1", "cafe_money.1"]].filter(([a, b]) => !KS.extraSkills().find(e => e.id === a).needs.includes(b)).map(x => x.join(" needs ")));
let shapes = 0; const shapeList = [];
ids.forEach(id => Object.keys(KS.kindBank(id)).forEach(t => { shapes++; shapeList.push(id + ":" + t); }));
check("at least 40 question shapes in all (a shape = a type with its own numbers, its own question and its own lesson)", shapes >= 40 ? [] : ["only " + shapes]);
check("at least 3 wordings for every shape", shapeList.filter(s => { const [id, t] = s.split(":"); return KS.kindBank(id)[t].length < 3; }));

// ---------- the money values (Canadian) ----------
const VALUE = { bill_5: 5, bill_10: 10, bill_20: 20, bill_50: 50, bill_100: 100, toonie: 2, loonie: 1 };
const ART_MANIFEST = JSON.parse(fs.readFileSync(path.join(GAME, "scene", "art", "cafe", "manifest.json"), "utf8")).files;
check("bill pictures: all five bills, the toonie and the loonie are in manifest.json, exist, and are under 150 KB",
  ["item_bill_5", "item_bill_10", "item_bill_20", "item_bill_50", "item_bill_100", "item_toonie", "item_loonie"].flatMap(n => {
    const f = n + ".png", p = path.join(GAME, "scene", "art", "cafe", f), out = [];
    if (!ART_MANIFEST.includes(f)) out.push(f + " not in manifest.json");
    if (!fs.existsSync(p)) out.push(f + " missing"); else if (fs.statSync(p).size >= 150 * 1024) out.push(f + " is 150 KB or more");
    return out;
  }));
const sceneSource = fs.readFileSync(path.join(GAME, "scene", "scene_cafe.js"), "utf8");
check("scene_cafe.js knows the pictures and the two new acts", ["bill_5:", "bill_50:", "bill_100:", "ACTS.bills", "ACTS.lineup"].filter(k => !sceneSource.includes(k)));
check("the offline file list names the new bills (run tools/make_offline_files.py)", ["item_bill_5.png", "item_bill_50.png", "item_bill_100.png"].filter(f => !fs.readFileSync(path.join(GAME, "sw.js"), "utf8").includes(f)));

// ---------- every question ----------
const P = {};      // problems by skill and category
const answers = {}; // skill:type -> count
const bad = (id, cat, msg) => { const k = id + " " + cat; (P[k] = P[k] || []).push(msg); };
function texts(Q) { return [Q.say, Q.correct, Q.fact, Q.hint].concat([true, false].flatMap(r => KS.teach(Q, r).steps.map(s => s.say))); }

// the number every type must answer, worked out from the numbers shown (Q.p holds the number set, Q.nums the numbers in the story)
function expected(id, t, p, nums) {
  switch (id + ":" + t) {
    case "cafe_compare.1:MA": case "cafe_compare.1:MB": case "cafe_compare.1:MC": case "cafe_compare.1:MD": case "cafe_compare.1:M3": return Math.max(...nums);
    case "cafe_compare.1:LA": case "cafe_compare.1:LB": case "cafe_compare.1:LC": case "cafe_compare.1:LD": case "cafe_compare.1:L3": return Math.min(...nums);
    case "cafe_order.1:OM": return sorted(nums)[1];
    case "cafe_order.1:OR": return sorted(nums)[2];
    case "cafe_order.1:ON": return p.d;
    case "cafe_order.1:OG": case "cafe_order.1:OH": case "cafe_order.1:OS": return p.ans;
    case "cafe_order.1:OT": return p.z;
    case "cafe_order.2:TM": return p.n + 10; case "cafe_order.2:TL": return p.n - 10; case "cafe_order.2:HM": return p.n + 100; case "cafe_order.2:HL": return p.n - 100;
    case "cafe_evenodd.1:EE": case "cafe_evenodd.1:EB": return nums.find(even);
    case "cafe_evenodd.1:EO": case "cafe_evenodd.1:EC": case "cafe_evenodd.1:EN": return nums.find(x => !even(x));
    case "cafe_evenodd.1:EL": return p.n % 2;
    case "cafe_evenodd.1:EX": case "cafe_evenodd.1:EY": return nums[2] + 2;
    case "cafe_evenodd.1:EZ": return nums[1] + 2;
    case "cafe_estimate.1:R10": case "cafe_estimate.1:R10B": case "cafe_estimate.1:R10U": return near10(p.n);
    case "cafe_estimate.1:R100": return near100(p.n);
    case "cafe_estimate.2:EA": return near10(p.a) + near10(p.b);
    case "cafe_estimate.2:ED": return near10(p.a) - near10(p.b);
    case "cafe_estimate.2:EH": return near100(p.a) + near100(p.b);
    case "cafe_estimate.2:EQ": return near100(p.a) - near100(p.b);
    case "cafe_estimate.2:EB": return p.u * p.n;
    case "cafe_estimate.3:ER": return near10(p.a) + near10(p.b);
    case "cafe_estimate.3:EZ": return near10(p.a) - near10(p.b);
    case "cafe_estimate.3:EN": return near10(p.n);
    case "cafe_estimate.3:EC": return near100(p.n);
    case "cafe_bills.1:BA": return 20 * p.x + 10 * p.y;
    case "cafe_bills.1:BB": return 10 * p.x + 5 * p.y;
    case "cafe_bills.1:BC": return 50 + p.s * p.k;
    case "cafe_bills.1:BD": return p.b + 2 * p.t + p.l;
    case "cafe_bills.1:BE": return 20 * p.x + 10 * p.y + 5 * p.z;
    case "cafe_bills.1:BF": return 2 * p.a + p.b;
    case "cafe_bills.2:HA": return p.k; case "cafe_bills.2:HB": return p.k; case "cafe_bills.2:HC": return p.k; case "cafe_bills.2:HD": return p.k;
    case "cafe_bills.2:HE": { // fewest bills: worked out by dynamic programming, not by the greedy rule the game uses
      const best = Array(p.x + 1).fill(Infinity); best[0] = 0;
      for (let v = 1; v <= p.x; v++) [5, 10, 20, 50].forEach(d => { if (v >= d && best[v - d] + 1 < best[v]) best[v] = best[v - d] + 1; });
      return best[p.x];
    }
    case "cafe_bills.2:HF": { const best = Array(p.x + 1).fill(Infinity); best[0] = 0; for (let v = 1; v <= p.x; v++) [1, 2].forEach(d => { if (v >= d && best[v - d] + 1 < best[v]) best[v] = best[v - d] + 1; }); return best[p.x]; }
    case "cafe_bills.3:PC": return 50 - p.p; case "cafe_bills.3:PH": return 100 - p.p;
    case "cafe_bills.3:PM": return p.x + p.y - p.p;
    case "cafe_bills.3:PW": return p.D / p.d;
    case "cafe_bills.3:PN": return p.c - p.a;
    case "cafe_bills.3:PX": return BILLS.filter(b => b >= p.p)[0];
    case "cafe_bills.3:PS": return p.a + p.b;
    case "cafe_bills.3:PL": return p.a - p.b;
  }
  return NaN;
}
// is one tap option right? (each rule is written from the question, not from the answer)
function optionIsRight(id, t, p, nums, o) {
  switch (id + ":" + t) {
    case "cafe_compare.1:MA": case "cafe_compare.1:MB": case "cafe_compare.1:MC": case "cafe_compare.1:MD": case "cafe_compare.1:M3": return nums.every(x => x <= o);
    case "cafe_compare.1:LA": case "cafe_compare.1:LB": case "cafe_compare.1:LC": case "cafe_compare.1:LD": case "cafe_compare.1:L3": return nums.every(x => x >= o);
    case "cafe_order.1:OM": return nums.filter(x => x < o).length === 1 && nums.filter(x => x > o).length === 1;
    case "cafe_order.1:OR": return nums.filter(x => x > o).length === 1;
    case "cafe_order.1:ON": return o > Math.max(...nums);
    case "cafe_order.1:OG": case "cafe_order.1:OH": case "cafe_order.1:OS": return o > Math.min(nums[0], nums[1]) && o < Math.max(nums[0], nums[1]);
    case "cafe_order.1:OT": return !(o > Math.min(nums[0], nums[1]) && o < Math.max(nums[0], nums[1]));
    case "cafe_evenodd.1:EE": case "cafe_evenodd.1:EB": return even(o);
    case "cafe_evenodd.1:EO": case "cafe_evenodd.1:EC": case "cafe_evenodd.1:EN": return !even(o);
    case "cafe_evenodd.1:EL": return o === p.n % 2;
    case "cafe_evenodd.1:EX": return even(o) && o > nums[2] && o <= nums[2] + 2;                       // the next number in the count: more than the last, nothing in between
    case "cafe_evenodd.1:EY": return !even(o) && o > nums[2] && o <= nums[2] + 2;
    case "cafe_evenodd.1:EZ": return o === nums[1] + 2;
    case "cafe_estimate.3:ER": { const e = p.a + p.b; return Math.abs(o - e) <= 10; }
    case "cafe_estimate.3:EZ": { const e = p.a - p.b; return Math.abs(o - e) <= 10; }
    case "cafe_estimate.3:EN": case "cafe_estimate.3:EC": return true;       // checked below: the nearest one
  }
  return null;
}
const CHOICE_TYPES = ids.filter(id => ["cafe_compare.1", "cafe_order.1", "cafe_evenodd.1", "cafe_estimate.3"].includes(id));

ids.forEach(id => {
  const bank = KS.kindBank(id), nTpl = Object.values(bank).reduce((a, l) => a + l.length, 0);
  const choiceKind = CHOICE_TYPES.includes(id);
  if (nTpl < 10) bad(id, "stories", `only ${nTpl} stories`);
  let count = 0;
  const types = new Set(KS.kindAll(id).map(p => p.type));
  Object.keys(bank).forEach(t => { if (!types.has(t)) bad(id, "stories", "no numbers for type " + t); });
  Object.values(bank).flat().forEach(([story, ask]) => {
    if (BANNED.test(story + " " + ask)) bad(id, "stories", "banned word " + story);
    if (/\$/.test(story + ask)) bad(id, "stories", "a dollar sign is not spoken: " + story);
    if (/\d/.test(ask)) bad(id, "stories", "digits in the question: " + ask);
  });
  const checkQ = Q => {
    count++;
    const tag = `${Q.key}|${Q.tpl}`, p = Q.p, t = Q.type;
    answers[id + ":" + t] = (answers[id + ":" + t] || 0) + 1;
    if (Q.skill !== id || Q.theme !== "cafe") bad(id, "fields", "skill or theme " + tag);
    ["story", "ask", "say", "eq", "correct", "fact", "hint", "key"].forEach(f => { if (typeof Q[f] !== "string" || !Q[f]) bad(id, "fields", f + " missing " + tag); });
    if (Q.say !== Q.story + " " + Q.ask) bad(id, "fields", "say is not story + ask " + tag);
    if (Q.correct !== "Correct! " + Q.fact) bad(id, "fields", "correct text " + tag);
    if (Q.noLine !== true) bad(id, "fields", "these kinds have no number line " + tag);
    // the numbers in the story are exactly Q.nums
    const storyNums = (Q.story.match(/\d+/g) || []).map(Number).sort((x, y) => x - y).join(","), wantNums = Q.nums.slice().sort((x, y) => x - y).join(",");
    if (storyNums !== wantNums) bad(id, "story", `story numbers [${storyNums}] want [${wantNums}] ${tag}: ${Q.story}`);
    (Q.story + " " + Q.ask).split(/[.?!:]+/).forEach(x => { if (wordsIn(x) >= 16) bad(id, "story", "sentence too long: " + x); });
    // answer worked out here
    const want = expected(id, t, p, Q.nums);
    if (!Number.isInteger(want)) bad(id, "answer", "no rule for " + id + ":" + t);
    if (Q.ans !== want) bad(id, "answer", `ans ${Q.ans} want ${want} ${tag}`);
    // numbers a child can read: every number in these questions is a whole number inside the game's limits (answers of up to four digits can be typed)
    if (!Number.isInteger(Q.ans) || Q.ans < 0 || Q.ans > 1100) bad(id, "range", "answer " + Q.ans);
    Q.nums.forEach(n => { if (!Number.isInteger(n) || n < 0 || n > 1000) bad(id, "range", "number " + n); });
    // the number sentence: one ?, true when filled (where it is a real sum), short enough for the board
    if ((Q.eq.match(/\?/g) || []).length !== 1) bad(id, "eq", "eq needs one ? " + Q.eq);
    if (/-/.test(Q.eq)) bad(id, "eq", "ascii hyphen in eq " + Q.eq);
    const filled = Q.eq.replace("?", String(Q.ans));
    if (filled.length > LONGEST) bad(id, "board", "answer line too wide: " + filled);
    const m = Q.eq.match(/^(\d+) ([+−×÷]) (\d+) = \?$/);
    if (m) { const [x, op, y] = [+m[1], m[2], +m[3]], v = op === "+" ? x + y : op === MINUS ? x - y : op === "×" ? x * y : x / y; if (v !== Q.ans) bad(id, "eq", "the sentence is not true: " + filled); }
    // tap or type
    if (choiceKind) {
      const o = Q.opts, n = (Q.nums.length >= 1 && o ? o.length : 0);
      if (Q.kind !== "choice" || !Array.isArray(o) || new Set(o).size !== o.length || !o.includes(Q.ans) || o.length < 2 || o.length > 4) bad(id, "choice", "bad opts " + JSON.stringify(o) + " ans " + Q.ans + " " + tag);
      else {
        const rule = optionIsRight(id, t, p, Q.nums, 0) === null ? null : true;
        if (rule && !(id === "cafe_estimate.3" && (t === "EN" || t === "EC"))) {
          const right = o.filter(x => optionIsRight(id, t, p, Q.nums, x));
          if (right.length !== 1 || right[0] !== Q.ans) bad(id, "one right", `${right.length} right options ${JSON.stringify(o)} for ${JSON.stringify(Q.nums)} ans ${Q.ans} ${tag}`);
        }
        if (id === "cafe_estimate.3" && (t === "EN" || t === "EC")) {
          const d = o.map(x => Math.abs(x - p.n)), best = Math.min(...d);
          if (d.filter(x => x === best).length !== 1 || o[d.indexOf(best)] !== Q.ans) bad(id, "one right", "the nearest is not unique " + JSON.stringify(o) + " n " + p.n);
          o.forEach(x => { if (x % (t === "EN" ? 10 : 100) !== 0) bad(id, "choice", "not a ten or a hundred " + x); });
        }
        if (id === "cafe_estimate.3" && (t === "ER" || t === "EZ")) o.filter(x => x !== Q.ans).forEach(x => { if (Math.abs(x - (t === "ER" ? p.a + p.b : p.a - p.b)) < 20) bad(id, "choice", "a wrong option is too close to the true answer: " + x); });
      }
      if (Q.range) bad(id, "choice", "a tap question has no range");
      if (!Q.noNear) bad(id, "choice", "a wrong tap is never 'one or two away': Q.noNear " + tag);
      if (Q.picOpts) bad(id, "choice", "plain number buttons");
    } else {
      if (Q.kind !== "typed" || Q.opts) bad(id, "kind", "typed " + tag);
    }
    // typed estimates: the range rule, written again here
    if (id === "cafe_estimate.2") {
      const exact = t === "EA" || t === "EH" ? p.a + p.b : t === "ED" || t === "EQ" ? p.a - p.b : null;
      let lo, hi;
      if (exact !== null) { const tol = t === "EA" || t === "ED" ? 10 : 100; lo = Math.max(0, exact - tol); hi = exact + tol; }
      else { const a = p.u * p.n, tol = Math.max(5, 5 * Math.round(a * 0.1 / 5)); lo = a - tol; hi = a + tol; }
      if (!Array.isArray(Q.range) || Q.range[0] !== lo || Q.range[1] !== hi) bad(id, "range", `range ${JSON.stringify(Q.range)} want ${lo}-${hi} ${tag}`);
      if (Q.ans < lo || Q.ans > hi) bad(id, "range", "the best estimate is outside its own range " + tag);
      [lo, hi, Q.ans].forEach(x => { if (!KS.isRight(Q, x)) bad(id, "range", "isRight false inside " + x); });
      [lo - 1, hi + 1, -1, NaN].forEach(x => { if (KS.isRight(Q, x)) bad(id, "range", "isRight true outside " + x); });
      if (!Q.fact.includes(`from ${lo} to ${hi}`)) bad(id, "range", "the fact must say the range: " + Q.fact);
      if (exact !== null && (near10(p.a) % 10 || near100(p.b) % 100 || true) && (p.a % 5 === 0 || p.b % 5 === 0) && (t === "EA" || t === "ED")) bad(id, "range", "a tie " + tag);
    } else {
      if (Q.range) bad(id, "range", "only the estimate skill has a range " + tag);
      if (!KS.isRight(Q, Q.ans) || KS.isRight(Q, Q.ans + 1) || KS.isRight(Q, Q.ans - 1)) bad(id, "range", "isRight must mean equal " + tag);
    }
    // rounding: no ties, and the answer is a multiple of 10 or 100
    if (id === "cafe_estimate.1") {
      const unit = t === "R100" ? 100 : 10;
      if (Q.ans % unit !== 0) bad(id, "answer", "not a multiple of " + unit);
      if (p.n % unit === unit / 2 || p.n % unit === 0) bad(id, "answer", "a tie or a round number " + p.n);
      if (t === "R10U" && !(p.n % 100 >= 96 && Math.floor(Q.ans / 100) === Math.floor(p.n / 100) + 1)) bad(id, "answer", "R10U must round over a hundred " + p.n);
    }
    // bills: the picture shows what the story says, in dollars
    if (id === "cafe_bills.1") {
      const S = Q.scene;
      if (S.act !== "bills" || !Array.isArray(S.coins)) bad(id, "scene", "bills act " + JSON.stringify(S));
      else {
        const v = S.coins.reduce((s, [k, c]) => s + VALUE[k] * c, 0);
        if (v !== Q.ans) bad(id, "scene", `the pictured money is ${v}, the story says ${Q.ans} ${tag}`);
        if (S.coins.some(([k, c]) => !(k in VALUE) || !Number.isInteger(c) || c < 1)) bad(id, "scene", "coins " + JSON.stringify(S.coins));
        if (S.coins.map(([, c]) => c).join() !== Q.nums.join()) bad(id, "scene", "the counts in the picture differ from the story");
        if (Q.ans > 100 && id === "cafe_bills.1") bad(id, "range", "more than 100 dollars " + Q.ans);
      }
    }
    if (id === "cafe_bills.3" && t === "PM") {
      const v = Q.scene.coins.reduce((s, [k, c]) => s + VALUE[k] * c, 0);
      if (v !== p.x + p.y || !(p.p > Math.max(p.x, p.y)) || !(p.p < p.x + p.y)) bad(id, "answer", "PM: one bill must not be enough, two must be " + tag);
    }
    if (id === "cafe_bills.3" && (t === "PC" || t === "PH") && (Q.scene.act !== "change" || Q.scene.price !== p.p || Q.scene.paid !== (t === "PC" ? 50 : 100))) bad(id, "scene", "change scene " + JSON.stringify(Q.scene));
    if (id === "cafe_bills.3" && t === "PX") { const b = Q.ans; if (!BILLS.includes(b) || b < p.p || BILLS.some(x => x >= p.p && x < b)) bad(id, "answer", "PX " + tag); }
    if (id === "cafe_bills.3" && t === "PW") { if (!Number.isInteger(p.D / p.d) || !BILLS.includes(p.D) || !BILLS.includes(p.d) || p.d >= p.D) bad(id, "answer", "PW " + tag); }
    if (id === "cafe_bills.2" && ["HA", "HB", "HC", "HD"].includes(t)) { const d = { HA: 5, HB: 10, HC: 20, HD: 2 }[t]; if (Q.nums[0] !== Q.ans * d || Q.eq !== `${Q.nums[0]} ÷ ${d} = ?`) bad(id, "answer", "division facts " + tag); }
    if (id === "cafe_bills.2" && t === "HE" && [5, 10, 20, 50].includes(p.x)) bad(id, "answer", "a single bill is not a question " + p.x);
    // even and odd: the numbers shown
    if (id === "cafe_evenodd.1" && ["EE", "EB", "EO", "EC"].includes(t)) {
      const wantEven = t === "EE" || t === "EB", n = Q.nums.filter(x => even(x) === wantEven).length;
      if (n !== 1) bad(id, "answer", `${n} numbers of the asked kind ${JSON.stringify(Q.nums)}`);
      const lo = t === "EE" || t === "EO" ? 10 : 100, hi = t === "EE" || t === "EO" ? 99 : 999;
      if (Q.nums.some(x => x < lo || x > hi)) bad(id, "range", "numbers out of " + lo + "-" + hi);
      if (!Q.parity) bad(id, "answer", "parity flag");
    }
    if (id === "cafe_evenodd.1" && t === "EN" && Q.nums.filter(x => !even(x)).length !== 1) bad(id, "answer", "exactly one odd " + JSON.stringify(Q.nums));
    if (id === "cafe_evenodd.1" && ["EX", "EY", "EZ"].includes(t)) {
      const wantEven = t === "EX" || (t === "EZ" && even(Q.nums[0]));
      if (Q.nums.some(x => even(x) !== wantEven)) bad(id, "answer", "mixed parity in the line " + JSON.stringify(Q.nums));
      if (t !== "EZ" && Q.nums[1] - Q.nums[0] !== 2) bad(id, "answer", "counts by 2");
    }
    // order and compare shapes
    if (id === "cafe_compare.1") {
      const [a, b] = Q.nums, hd = n => Math.floor(n / 100), td = n => Math.floor(n / 10) % 10;
      if (new Set(Q.nums).size !== Q.nums.length) bad(id, "answer", "two the same");
      if (t.endsWith("A") && hd(a) === hd(b)) bad(id, "answer", "hundreds must differ");
      if (t.endsWith("B") && (hd(a) !== hd(b) || td(a) === td(b))) bad(id, "answer", "tens must decide " + a + " " + b);
      if (t.endsWith("C") && (Math.floor(a / 10) !== Math.floor(b / 10))) bad(id, "answer", "only the ones may differ " + a + " " + b);
      if (t.endsWith("D") && (Math.min(a, b) > 99 || Math.max(a, b) < 100)) bad(id, "answer", "one two-digit and one three-digit number");
      if (t === "M3" || t === "L3") { if (Q.nums.length !== 3 || Q.opts.length !== 3) bad(id, "answer", "three numbers"); }
      else if (Q.opts.length !== 2 || !Q.opts.every(x => Q.nums.includes(x))) bad(id, "choice", "two numbers are the two buttons");
      const opp = t[0] === "M" ? Math.min(...Q.nums) : Math.max(...Q.nums);
      if (Q.opposite !== opp) bad(id, "miss", "opposite " + Q.opposite + " want " + opp);
    }
    if (id === "cafe_order.1" && ["OG", "OH", "OS"].includes(t)) {
      if (Math.abs(Q.nums[1] - Q.nums[0]) < 30) bad(id, "answer", "too close to tell " + JSON.stringify(Q.nums));
      if ((t === "OG" || t === "OS") && Q.nums[0] > Q.nums[1]) bad(id, "answer", "goes up: the first number is the smaller " + JSON.stringify(Q.nums));
      if (t === "OH" && Q.nums[0] < Q.nums[1]) bad(id, "answer", "goes down: the first number is the bigger " + JSON.stringify(Q.nums));
      if (t === "OG" && !/from the least to the most|in order/.test(Q.story)) bad(id, "story", "order words");
      if (t === "OH" && !/from the most to the least/.test(Q.story)) bad(id, "story", "the story must say it goes down: " + Q.story);
      if (t === "OG" && /from the most to the least/.test(Q.story)) bad(id, "story", "OG goes up");
    }
    if (id === "cafe_order.1" && t === "ON") { const [a, b, c] = Q.nums; if (!(a < b && b < c) || !/least to the most|more cookies each day/.test(Q.story)) bad(id, "answer", "the line goes up " + JSON.stringify(Q.nums)); }
    if (id === "cafe_order.1" && t === "OR" && (Q.opts.length !== 4 || new Set(Q.nums).size !== 4)) bad(id, "answer", "four different numbers");
    if (id === "cafe_order.1" && t === "OT" && Q.nums.length !== 5) bad(id, "answer", "five numbers");
    if (id === "cafe_order.2") { if (Q.ans < 100 || Q.ans > 999) bad(id, "range", "three digits " + Q.ans); if (/\d/.test(Q.story.replace(String(p.n), ""))) bad(id, "story", "ten and a hundred are words here: " + Q.story); }
    // the scene never carries the answer; its act is known
    const S = Q.scene;
    if (!S || typeof S !== "object") bad(id, "scene", "no scene");
    else {
      if (!SCENE_ACTS.has(S.act)) bad(id, "scene", "unknown act " + S.act);
      if ("ans" in S) bad(id, "scene", "scene carries ans");
      if (!KS.SCENE_NOUNS.cafe.includes(S.noun)) bad(id, "scene", "unknown noun " + S.noun);
      if (S.who !== undefined && !KS.SCENE_WHO.includes(S.who)) bad(id, "scene", "unknown who " + S.who);
      if (S.act === "lineup") { if (!Number.isInteger(S.n) || S.n < 1 || S.n > 4 || Object.keys(S).some(k => !["act", "n", "noun", "noun2", "holder", "who"].includes(k))) bad(id, "scene", "lineup " + JSON.stringify(S)); }
      else if (S.act === "bills") { if (!Array.isArray(S.coins)) bad(id, "scene", "bills coins"); }
      else if (S.act === "change") { if (S.paid - S.price !== Q.ans) bad(id, "scene", "paid - price"); }
      else bad(id, "scene", "unexpected act " + S.act);
      if (id !== "cafe_bills.1" && S.act === "bills" && t !== "PM") bad(id, "scene", "only the adding stories and PM draw the bills");
    }
    // text quality and voice
    texts(Q).forEach(tx => {
      if (typeof tx !== "string" || !tx.trim() || /\{|\}|undefined|NaN|\$/.test(tx)) { bad(id, "text", "unfilled or a dollar sign: " + tx); return; }
      if (BANNED.test(tx)) bad(id, "text", "banned word " + tx);
      if (PLURAL_ONE.test(tx)) bad(id, "text", "plural after 1: " + tx);
      if (SINGULAR_MANY.test(tx)) bad(id, "text", "singular after many: " + tx);
      if (/  /.test(tx)) bad(id, "text", "double space: " + tx);
      if (!sentenceSet.has(tx)) bad(id, "voice", "not in KS.sentences(): " + tx);
      splitPieces(tx).forEach(pc => { if (!pieceSet.has(pc)) bad(id, "voice", `piece "${pc}" of "${tx}"`); });
    });
    // lessons: row 0 is the eq; rows are short; the last step says the fact (and what to tap or type)
    [true, false].forEach(right => {
      const T = KS.teach(Q, right);
      if (!T || !T.kind || !Array.isArray(T.steps) || T.steps.length < 3) { bad(id, "teach", "no lesson " + tag); return; }
      let answers = 0; const rows = new Set();
      T.steps.forEach((st, si) => {
        if (!Array.isArray(st.draw)) bad(id, "teach", "draw missing");
        if (st.line) bad(id, "teach", "these kinds have no number line, so a lesson hops nowhere");
        (st.draw || []).forEach(d => {
          Object.keys(d).forEach(k => { if (!["row", "tokens", "answer"].includes(k)) bad(id, "teach", "draw key " + k); });
          if (d.tokens) { const tx = d.tokens.join(" "); rows.add(d.row); if (tx.length > LONGEST) bad(id, "board", "row too wide: " + tx); if (d.row === 0 && tx !== Q.eq) bad(id, "teach", `row 0 "${tx}" is not the eq "${Q.eq}"`); if (!d.tokens.every(x => typeof x === "string" && x)) bad(id, "teach", "empty token"); }
          if (d.answer) { answers++; if (si !== T.steps.length - 1) bad(id, "teach", "answer not in the last step"); }
        });
      });
      if (answers !== 1) bad(id, "teach", "answer items " + answers);
      for (let r = 0; r <= Math.max(...rows); r++) if (!rows.has(r)) bad(id, "teach", "gap in rows");
      const last = T.steps[T.steps.length - 1].say, wantLast = right ? Q.fact : `${Q.fact} ${Q.kind === "typed" ? "Type" : "Tap"} ${Q.ans}.`;
      if (last !== wantLast) bad(id, "teach", `last step "${last}" want "${wantLast}"`);
      if (T.steps.slice(0, -1).some(x => /\b(Type|Tap) \d+\./.test(x.say))) bad(id, "teach", "Type/Tap before the last step");
    });
    // the help: a hint picture shows amounts only
    const pic = HL.picture(Q);
    if (pic) {
      if (/<text/i.test(pic.svg)) bad(id, "hint", "a picture with numerals");
      if (!HL.sentences().includes(pic.caption)) bad(id, "hint", "caption");
      const circles = (pic.svg.match(/<circle/g) || []).length, rects = (pic.svg.match(/<rect/g) || []).length;
      if (Q.hintPic.pairs !== undefined && circles !== Q.hintPic.pairs) bad(id, "hint", `pairs picture draws ${circles} dots, want ${Q.hintPic.pairs}`);
      if (Q.hintPic.blocks) {
        const w = Q.hintPic.blocks.reduce((a, n) => ({ h: a.h + Math.floor(n / 100), t: a.t + Math.floor(n / 10) % 10, o: a.o + n % 10 }), { h: 0, t: 0, o: 0 });
        if (rects !== w.h + w.t || circles !== w.o) bad(id, "hint", `blocks picture draws ${rects} blocks and ${circles} dots, want ${w.h + w.t} and ${w.o}`);
      }
    }
    if (typeof Q.hint !== "string" || Q.hint.length < 15 || new RegExp(`(\bis|=|makes?|answer is) ${Q.ans}\b`).test(Q.hint)) bad(id, "hint", "the hint is too short or gives the answer away: " + Q.hint);
  };
  KS.eachKindQuestion(id, checkQ);
  // the game asks for random questions: never the same one twice running, every type shows up
  let s = 4242 + id.length * 17; const rng = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  const seen = new Set(), keys = new Set(); let prev = "";
  for (let i = 0; i < 400; i++) {
    let Q; try { Q = KS.make(id, "cafe", rng, prev); } catch (e) { bad(id, "make", e.message); break; }
    if (Q.key === prev) bad(id, "make", "repeated " + prev);
    prev = Q.key; seen.add(Q.type); keys.add(Q.key); checkQ(Q);
  }
  if (seen.size !== Object.keys(bank).length) bad(id, "variety", "types seen " + [...seen]);
  if (keys.size < 60) bad(id, "variety", "only " + keys.size + " different questions in 400");
  if (count < 100) bad(id, "variety", "only " + count + " questions");
  ["stories", "fields", "story", "scene", "range", "eq", "board", "kind", "answer", "one right", "choice", "miss", "text", "voice", "teach", "hint", "make", "variety"].forEach(cat => check(`${id} ${cat}`, P[id + " " + cat] || []));
});

// ---------- the wrong-answer classes the new kinds use ----------
(function misses() {
  const find = (id, t) => { let r = null; KS.eachKindQuestion(id, Q => { if (!r && Q.type === t) r = Q; }); return r; };
  const more = find("cafe_compare.1", "MA"), less = find("cafe_compare.1", "LB"), eo = find("cafe_evenodd.1", "EE"), ord = find("cafe_order.1", "OM"), est = find("cafe_estimate.2", "EA"), money = find("cafe_bills.1", "BA");
  const wrongOf = Q => Q.opts.find(o => o !== Q.ans && o !== Q.opposite);
  check("miss: tapping the least when asked for the most is wrong_end", [MS.classify(more, more.opposite) === "wrong_end" ? null : "more", MS.classify(less, less.opposite) === "wrong_end" ? null : "less"].filter(Boolean));
  check("miss: a wrong even or odd tap is last_digit", [MS.classify(eo, eo.opts.find(o => o !== eo.ans)) === "last_digit" ? null : "last_digit"].filter(Boolean));
  check("miss: a tap miss is never 'one or two away' here", [more, less, eo, ord].filter(Q => ["choice_near"].includes(MS.classify(Q, Q.ans + 1)) || ["choice_near"].includes(MS.classify(Q, Q.ans - 2))).map(Q => Q.tpl));
  check("miss: a middle tap with no rule is far, not near", [MS.classify(ord, wrongOf(ord)) === "choice_far" ? null : MS.classify(ord, wrongOf(ord))].filter(Boolean));
  check("miss: typed answers keep the old classes (copied, wrong sign, slip)", [
    MS.classify(est, est.nums[0]) === "copied" ? null : "copied", MS.classify(money, money.ans + 1) === "slip" ? null : "slip"].filter(Boolean));
  check("miss: every class has a lead sentence, a label and no digits in the lead", MS.CLASSES.filter(c => !MS.leadSentence(c) || !MS.label(c) || /\d/.test(MS.leadSentence(c))));
  check("miss: the two new lead sentences are in MS.sentences()", ["wrong_end", "last_digit"].filter(c => !MS.sentences().includes(MS.leadSentence(c))));
})();

// ---------- the engine puts the new skills in a sensible order for Marie (real engine, real skill map, a child who answers everything right) ----------
(function engineOrder() {
  global.window = global; global.document = { createElement: () => ({ style: {} }), querySelector: () => null, getElementById: () => null, addEventListener: () => {}, head: { appendChild() {} } };
  const E = require(path.join(__dirname, "..", "modules", "engine.js"));
  require(path.join(__dirname, "..", "topics", "kinder.js"));
  const M = E.buildSkillMap((window.MathTopics || []).filter(t => t.id === "kinder"), KS.extraSkills());
  M.order.forEach(id => { M.map[id].ready = KS.SKILLS.includes(id) && KS.fits(id, "cafe") && !KS.optional(id); });
  M.order.forEach(id => { M.map[id].needs = M.map[id].needs.filter(n => M.map[n] && M.map[n].ready); });
  let seed = 99; const rng = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  const st = E.createState("marie"), first = {}; let now = Date.UTC(2026, 9, 24, 16), n = 0;
  E.finishPlacement(st, M, now);      // no placement quiz: it may credit a higher skill after one right answer on purpose. This checks the practice order alone.
  for (let d = 0; d < 80; d++) {
    now = Date.UTC(2026, 9, 24 + d, 16);
    for (let g = 0, secs = 0; secs < 1500 && g < 200; g++) {
      const set = E.nextSet(st, M, now, rng, { altRepair: true });
      if (!set.items.length) break;
      for (const id of set.items) {
        if (typeof id !== "string") continue;
        if (first[id] === undefined) first[id] = n;
        n++; secs += 25; now += 25000;
        if (set.kind === "place") E.placementRecord(st, M, id, true); else E.record(st, M, { skill: id, correct: true, helped: false, taught: false, rush: false }, now);
      }
      if (!st.place.done && d >= 2) E.finishPlacement(st, M, now);
    }
  }
  check("engine: a child who is always right meets all ten new skills", ids.filter(id => first[id] === undefined));
  check("engine: every new skill comes after the skills it needs", ids.filter(id => first[id] !== undefined).flatMap(id => M.map[id].needs.filter(nd => first[nd] === undefined || first[nd] > first[id]).map(nd => id + " before " + nd)));
  check("engine: comparing comes before ordering and estimating; bills.1 before bills.2 and bills.3", [["cafe_compare.1", "cafe_order.1"], ["cafe_compare.1", "cafe_estimate.1"], ["cafe_estimate.1", "cafe_estimate.2"], ["cafe_bills.1", "cafe_bills.2"], ["cafe_bills.1", "cafe_bills.3"]]
    .filter(([a, b]) => !(first[a] < first[b])).map(x => x.join(" then ")));
})();

failures.forEach(f => console.log(f));
console.log(`SHAPES ${shapes} question shapes in ${ids.length} skills; questions built: ${Object.values(answers).reduce((a, b) => a + b, 0)}`);
console.log(`RESULT ${passed}/${total} passed`);
process.exit(passed === total && shapes >= 40 ? 0 : 1);
