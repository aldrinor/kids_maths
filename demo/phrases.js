/* phrases.js - questions, teaching steps and every sentence the demo can say (20 Oct 2026).
   Shared by the page (window.KM) and by the voice recorder (node: require("./phrases.js")).
   Every spoken sentence comes from here, so all of them can be recorded ahead of time with a natural voice.
   Each teaching step can also move the hopper on the real number line (line: [from, to]); the voice counts each landing number.
   Teaching follows the usual Grade 2-3 ways to add and take away within 20:
   make 10 first, back to 10 first, add or take the ones and keep the 10, or count on / back with hops. */
(function (root) {
  "use strict";
  const RANGES = { add: { a: [5, 12], b: [2, 8] }, sub: { a: [10, 19], b: [2, 8] }, word: { a: [11, 18], b: [3, 8] }, choice: { a: [4, 9], b: [3, 9] } };
  const KINDS = ["add", "sub", "word", "add", "choice", "sub"];
  const SET = 10, SKILL = "Adding and taking away to 20";
  const word = op => (op === "+" ? "plus" : "minus");
  const sym = op => (op === "+" ? "+" : "−");

  function build(kind, a, b) {
    const op = kind === "add" || kind === "choice" ? "+" : "−", ans = op === "+" ? a + b : a - b;
    const q = { kind, a, b, op, ans, typed: kind !== "choice", word: kind === "word" };
    if (kind === "word") { q.story = `There are ${a} apples in a basket. You eat ${b} of them.`; q.ask = "How many are left?"; q.say = `${q.story} ${q.ask}`; }
    else if (kind === "choice") q.say = `What is ${a} plus ${b}?`;
    else q.say = `${a} ${word(op)} ${b} equals what?`;
    q.correct = `Correct! ${a} ${word(op)} ${b} is ${ans}.`;
    q.fact = `${a} ${word(op)} ${b} is ${ans}.`;
    q.hint = `Start at ${a}. Hop ${op === "+" ? "forward" : "back"} ${b}.`;
    return q;
  }

  /* Teaching plan. Each step: say (one sentence) and draw (what to hand-write on the board).
     Draw items: {row, text, color} | {split: [x, y], under: token} | {hops: {from, n, dir}} | {circle: true} */
  function teach(q, right) {
    const { a, b, op, ans } = q, s = sym(op), steps = [];
    const head = { row: 0, tokens: [String(a), s, String(b), "=", "?"] };
    steps.push({ say: q.word ? `Eating takes apples away. So it is ${a} minus ${b}.` : `Let's work it out. ${a} ${word(op)} ${b}.`, draw: [head] });
    const tens = Math.floor(a / 10) * 10, ones = a % 10;
    let kind;
    if (op === "+") {
      const next = tens + 10, need = next - a;
      if (b > need) {
        kind = "make10";
        steps.push({ say: `Make ${next} first. ${a} needs ${need} more to make ${next}.`, draw: [{ split: [need, b - need] }] });
        steps.push({ say: `So split ${b} into ${need} and ${b - need}.`, draw: [] });
        steps.push({ say: `${a} plus ${need} is ${next}.`, draw: [{ row: 1, tokens: [String(a), "+", String(need), "=", String(next)] }], line: [a, next] });
        steps.push({ say: `Then ${next} plus ${b - need} is ${ans}.`, draw: [{ row: 2, tokens: [String(next), "+", String(b - need), "=", String(ans)] }], line: [next, ans] });
      } else if (b === need) {
        kind = "exact10";
        steps.push({ say: `${a} and ${b} make ${next}.`, draw: [{ row: 1, tokens: [String(a), "+", String(b), "=", String(next)] }], line: [a, next] });
      } else if (a >= 10) {
        kind = "ones";
        steps.push({ say: `Look at the ones. ${ones} plus ${b} is ${ones + b}.`, draw: [{ row: 1, tokens: [String(ones), "+", String(b), "=", String(ones + b)] }] });
        steps.push({ say: `Keep the ${tens}. ${tens} plus ${ones + b} is ${ans}.`, draw: [{ row: 2, tokens: [String(tens), "+", String(ones + b), "=", String(ans)] }], line: [a, ans] });
      } else {
        kind = "hops";
        steps.push({ say: `Start at ${a}. Hop forward ${b}.`, draw: [{ hops: { from: a, n: b, dir: 1 } }], line: [a, ans] });
      }
    } else {
      if (ones > 0 && b > ones) {
        kind = "back10";
        steps.push({ say: `Go back to ${tens} first. Take away ${ones} to get to ${tens}.`, draw: [{ split: [ones, b - ones] }] });
        steps.push({ say: `So split ${b} into ${ones} and ${b - ones}.`, draw: [] });
        steps.push({ say: `${a} minus ${ones} is ${tens}.`, draw: [{ row: 1, tokens: [String(a), "−", String(ones), "=", String(tens)] }], line: [a, tens] });
        steps.push({ say: `Then ${tens} minus ${b - ones} is ${ans}.`, draw: [{ row: 2, tokens: [String(tens), "−", String(b - ones), "=", String(ans)] }], line: [tens, ans] });
      } else if (ones > 0 && b === ones) {
        kind = "exact10";
        steps.push({ say: `Take away the ${ones} ones. ${tens} is left.`, draw: [{ row: 1, tokens: [String(a), "−", String(b), "=", String(tens)] }], line: [a, tens] });
      } else if (ones > 0) {
        kind = "ones";
        steps.push({ say: `Look at the ones. ${ones} minus ${b} is ${ones - b}.`, draw: [{ row: 1, tokens: [String(ones), "−", String(b), "=", String(ones - b)] }] });
        steps.push({ say: `Keep the ${tens}. ${tens} plus ${ones - b} is ${ans}.`, draw: [{ row: 2, tokens: [String(tens), "+", String(ones - b), "=", String(ans)] }], line: [a, ans] });
      } else {
        kind = "hops";
        steps.push({ say: `Start at ${a}. Hop back ${b}.`, draw: [{ hops: { from: a, n: b, dir: -1 } }], line: [a, ans] });
      }
    }
    steps.push({ say: right ? q.fact : `So ${a} ${word(op)} ${b} is ${ans}. ${q.typed ? `Type ${ans}.` : `Tap ${ans}.`}`, draw: [{ answer: true }] });
    return { kind, steps };
  }

  const FIXED = [
    "Not yet. Watch how to work it out.",
    "Oops. Let's see the answer.",
    "Type your answer first.",
    "Tap an answer first.",
    `Well done! You finished ${SET} questions.`,
    `Skill complete! ${SKILL}.`,
    "Let's go!",
    ...Array.from({ length: 21 }, (_, i) => String(i)),     // the voice counts each hop on the number line
  ];

  function allPhrases() {
    const out = new Set(FIXED);
    for (const kind of Object.keys(RANGES)) {
      const r = RANGES[kind];
      for (let a = r.a[0]; a <= r.a[1]; a++) for (let b = r.b[0]; b <= r.b[1]; b++) {
        const q = build(kind, a, b);
        [q.say, q.correct, q.fact, q.hint].forEach(t => out.add(t));
        teach(q).steps.forEach(st => out.add(st.say));
        teach(q, true).steps.forEach(st => out.add(st.say));
      }
    }
    return [...out];
  }

  /* FNV-1a 32-bit over UTF-8 bytes; the voice file for a sentence is voice/<hash>.mp3 */
  function fnv(text) {
    const bytes = typeof TextEncoder !== "undefined" ? new TextEncoder().encode(text) : Buffer.from(text, "utf8");
    let h = 0x811c9dc5;
    for (const by of bytes) { h ^= by; h = Math.imul(h, 0x01000193) >>> 0; }
    return h.toString(16).padStart(8, "0");
  }

  const KM = { RANGES, KINDS, SET, SKILL, build, teach, FIXED, allPhrases, fnv, sym, word };
  if (typeof module !== "undefined" && module.exports) module.exports = KM; else root.KM = KM;
})(typeof window !== "undefined" ? window : globalThis);
