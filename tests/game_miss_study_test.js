/* game_miss_study_test.js - checks game/miss_study.js on real questions from game/stories.js.
   Silent: prints only failures and one RESULT line. Run: node tests/game_miss_study_test.js */
const path = require("path");
global.window = global;
global.document = { createElement: () => ({ style: {} }), querySelector: () => null, getElementById: () => null, addEventListener: () => {}, head: { appendChild() {} } };
require(path.join(__dirname, "../topics/kinder.js"));
const KS = require(path.join(__dirname, "../game/stories.js"));
const MS = require(path.join(__dirname, "../game/miss_study.js"));
let pass = 0, fail = 0;
const ok = (name, cond, extra) => { cond ? pass++ : (fail++, console.log("FAIL " + name + (extra !== undefined ? " | " + JSON.stringify(extra) : ""))); };
const tpl = (theme, skill, op) => KS.templates(theme).find(t => KS.usable(t, skill, op));
const ask = (skill, a, b, op, theme = "cafe") => KS.build(skill, theme, tpl(theme, skill, op), a, b);

// typed sums, each class on its own
const q1 = ask("sums.3", 8, 7, "+");                 // 8 + 7 = 15
ok("off by one or two is a slip", MS.classify(q1, 14) === "slip" && MS.classify(q1, 16) === "slip" && MS.classify(q1, 17) === "slip");
ok("three away with no pattern is a guess", MS.classify(q1, 18) === "guess" && MS.classify(q1, 3) === "guess", [MS.classify(q1, 18), MS.classify(q1, 3)]);
ok("giving a number from the question is copied", MS.classify(q1, 8) === "copied" && MS.classify(q1, 7) === "copied");
const q2 = ask("sums.4", 15, 6, "-");                // 15 - 6 = 9
ok("adding when it was a take-away is the wrong sign", MS.classify(q2, 21) === "wrong_op", MS.classify(q2, 21));
ok("a take-away slip of one is a slip", MS.classify(q2, 8) === "slip");
const q3 = ask("sums.3", 9, 4, "+");                 // 9 + 4 = 13 : taking away gives 5
ok("taking away when it was an add is the wrong sign", MS.classify(q3, 5) === "wrong_op", MS.classify(q3, 5));
const q4 = ask("sums.6", 52, 31, "+");               // 83
ok("tens and ones swapped is place value", MS.classify(q4, 38) === "place_value", MS.classify(q4, 38));
ok("out by exactly ten is place value", MS.classify(q4, 93) === "place_value" && MS.classify(q4, 73) === "place_value");
ok("out by one in a two-digit sum is a slip", MS.classify(q4, 84) === "slip");
const q5 = ask("sums.8", 345, 212, "+");             // 557
ok("out by a hundred is place value", MS.classify(q5, 657) === "place_value" && MS.classify(q5, 457) === "place_value");
// the fixed order: copied first, then the wrong sign, then place value, then a slip
const q6 = ask("sums.1", 5, 1, "+");                 // 5 + 1 = 6
ok("5 + 1 with 5 given is copied, not a slip", MS.classify(q6, 5) === "copied" && MS.classify(q6, 7) === "slip", [MS.classify(q6, 5), MS.classify(q6, 7)]);
const q7 = ask("sums.2", 6, 5, "-");                 // 6 - 5 = 1; the other sign gives 11
ok("wrong sign beats a slip when both fit", MS.classify(q7, 11) === "wrong_op");
// a missing number: 8 + ? = 15
const m = KS.build("sums.3", "cafe", KS.templates("cafe").find(t => t.type === "M" && KS.usable(t, "sums.3", "+")), 8, 7);
ok("missing addend: adding the two numbers is the wrong sign", MS.classify(m, 23) === "wrong_op", [m.eq, MS.classify(m, 23)]);
ok("missing addend: giving the total is copied", MS.classify(m, 15) === "copied", MS.classify(m, 15));
// tap questions
const k = ask("kinder.5", 2, 3, "+", "castle");
ok("kinder question is a tap question", k.kind === "choice", k.kind);
const wrongNear = k.opts.find(o => o !== k.ans && Math.abs(o - k.ans) <= 2);
ok("a close wrong tap is choice_near, never a counting slip", MS.classify(k, wrongNear) === "choice_near", MS.classify(k, wrongNear));
const kn = KS.build("kinder.2", "castle", KS.templates("castle").find(t => t.type === "K"), 4, 0);
ok("a far wrong tap is choice_far", MS.classify(kn, 9) === "choice_far", MS.classify(kn, 9));
// kinds with their own numbers
let kindChecked = 0;
for (const id of KS.KIND_IDS) {
  let n = 0;
  KS.eachKindQuestion(id, Q => {
    if (n++ > 40) return;
    for (const g of [Q.ans - 1, Q.ans + 1, Q.ans + 7, 0, 999]) {
      const c = MS.classify(Q, g);
      kindChecked++;
      if (!MS.CLASSES.includes(c)) ok(`kind ${id} gives a known class`, false, [Q.eq, g, c]);
    }
  });
}
ok("every kind question can be classed", kindChecked > 500, kindChecked);
// robust to junk
ok("no number given is a guess", MS.classify(q1, NaN) === "guess" && MS.classify(null, 3) === "guess");
// the lead sentences: fixed, no numbers, one per class
for (const c of MS.CLASSES) { const s = MS.leadSentence(c); ok(`lead sentence for ${c} has no digits and is one short sentence`, typeof s === "string" && !/\d/.test(s) && s.length < 70 && s.length > 10, s); }
ok("unknown class falls back to a guess sentence", MS.leadSentence("zzz") === MS.leadSentence("guess"));
ok("every class has a plain label", MS.CLASSES.every(c => MS.label(c).length > 8));
ok("lead sentences are a short finite list", MS.sentences().length <= 9);       // 9 since 23 Oct 2026 (wrong_end and last_digit for the number-sense kinds)
console.log(`RESULT ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
