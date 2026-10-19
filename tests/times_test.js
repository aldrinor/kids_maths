// Checks every times and division question type: the answer is right and the picture never shows it. Plain Node.
global.window = global;
const T = require("../src/topics/times.js");
let pass = 0, fail = 0; const ok = (n, c, x) => { c ? pass++ : fail++; console.log((c ? "PASS " : "FAIL ") + n + (!c && x !== undefined ? " | " + JSON.stringify(x) : "")); };
for (let lv = 0; lv <= 9; lv++) {
  let good = true, bad = null;
  for (let i = 0; i < 300; i++) {
    const q = T.makeFacts(lv), D = q.data, a = +q.answer;
    const want = D.kind === "times" ? D.r * D.c : D.kind === "div" ? D.N / D.d : D.kind === "missing" ? D.c : D.kind === "split" ? D.a * D.b : D.kind === "bigdiv" ? D.N / D.d : Math.floor(D.N / D.d);
    if (a !== want || !Number.isInteger(a) || new RegExp("= " + q.answer + "(\D|$)").test(q.show)) { good = false; bad = q; break; }
    if (D.kind === "rem" && (D.left < 1 || D.left >= D.d)) { good = false; bad = q; break; }
  }
  ok(`times level ${lv}: answers right in 300 questions`, good, bad);
}
for (let lv = 0; lv <= 3; lv++) { const q = T.makeChant(lv); ok(`chant level ${lv}: answer is t times k`, +q.answer === q.data.t * q.data.k, q); }
ok("hints never contain the answer", [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].every(lv => { for (let i = 0; i < 100; i++) { const q = T.makeFacts(lv); if (new RegExp(`\b${q.answer}\b`).test(T.hint(q))) return false; } return true; }));
console.log(`RESULT ${pass}/${pass + fail} passed`); process.exit(fail ? 1 : 0);
