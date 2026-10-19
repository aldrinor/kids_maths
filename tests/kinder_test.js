// Checks the Kindergarten questions: right answer is always one of the choices, choices are different, hints never say the answer.
global.window = global;
const K = require("../src/topics/kinder.js");
let pass = 0, fail = 0; const ok = (n, c, x) => { c ? pass++ : fail++; console.log((c ? "PASS " : "FAIL ") + n + (!c && x !== undefined ? " | " + JSON.stringify(x) : "")); };
for (let lv = 0; lv <= 6; lv++) {
  let good = true, bad = null;
  for (let i = 0; i < 300; i++) {
    const q = K.make(lv), vals = q.input.choices.map(c => c.value);
    if (!vals.includes(q.answer) || new Set(vals).size !== vals.length) { good = false; bad = q; break; }
    if (lv <= 1 && (+q.answer < 1 || +q.answer > (lv ? 10 : 5))) { good = false; bad = q; break; }
    if (/^\d+$/.test(q.answer) && new RegExp(`\b${q.answer}\b`).test(K.hint(q))) { good = false; bad = q; break; }
  }
  ok(`kinder level ${lv}: answer among 2-4 different choices, hint never says it`, good, bad);
}
console.log(`RESULT ${pass}/${pass + fail} passed`); process.exit(fail ? 1 : 0);
