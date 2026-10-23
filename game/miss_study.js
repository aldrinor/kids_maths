/* MissStudy: what kind of mistake was it? (review item 5 and plan item 12)
 *
 * classify(Q, given) looks at the question Q (as built by stories.js) and the number the child gave, and names the miss:
 *   copied       the child gave one of the numbers printed in the question
 *   wrong_op     the child used the other sign (added when it was a take-away, or took away when it was an add)
 *   place_value  the digits are right but the tens and ones are mixed up (47 for 74), or the answer is out by exactly 10 or 100
 *   slip         out by one or two (a counting slip)
 *   guess        none of the above; there is no clear pattern
 *   choice_near  (tap questions) a wrong tap on an answer that is one or two away. The wrong choices are always made that way,
 *                so this says little about WHY; it is kept apart so the report does not call it a counting slip
 *   choice_far   (tap questions) a wrong tap on an answer further away
 *
 * Fixed order, first match wins: choice question -> copied -> wrong_op -> place_value -> slip -> guess.
 * (So 5 + 1 with 5 given is "copied", not "slip".)
 *
 * leadSentence(cls) is ONE fixed spoken sentence with no numbers. It is the first step of the lesson that follows the miss,
 * so the lesson starts with the help that matches the mistake. Fixed sentences keep the list of voice clips finite.
 */
(function (root) {
  "use strict";
  const CLASSES = ["copied", "wrong_op", "place_value", "slip", "guess", "choice_near", "choice_far"];
  const LEAD = {
    copied: "That number is in the story. We need to find a new number.",
    wrong_op: "Look at the sign first. Is it plus or minus?",
    place_value: "Look at the tens and the ones. Which is which?",
    slip: "So close! Let's count again, nice and slow.",
    guess: "Let's go one step at a time.",
    choice_near: "So close! Let's count again, nice and slow.",
    choice_far: "Let's look at it together."
  };
  const LABEL = {
    copied: "gave a number that was printed in the question",
    wrong_op: "used the other sign (plus for minus, or minus for plus)",
    place_value: "mixed up the tens and the ones",
    slip: "was out by one or two",
    guess: "gave an answer with no clear pattern",
    choice_near: "tapped an answer that was one or two away",
    choice_far: "tapped an answer that was far away"
  };

  /* the numbers a child can see in the question */
  function shownNumbers(Q) {
    if (Array.isArray(Q.nums)) return Q.nums.filter(Number.isFinite);
    if (Q.type === "K") return [];
    const out = [Q.a];
    if (Q.missing) out.push(Q.result); else out.push(Q.b);
    return out.filter(Number.isFinite);
  }
  const isMissing = Q => !!Q.missing || /[+−\-]\s*\?\s*=/.test(String(Q.eq || ""));
  /* the answers a child gets by using the other sign on the first two numbers */
  function otherSign(Q, nums) {
    if (nums.length < 2) return [];
    const [x, y] = nums;
    if (isMissing(Q)) return [x + y];
    switch (Q.op) {
      case "+": return [Math.abs(x - y)];
      case "-": return [x + y];
      case "×": return [x + y];
      case "÷": return [x - y, x * y];
      default: return [];
    }
  }
  const digits = n => String(Math.abs(n)).split("").sort().join("");
  function placeSlip(ans, given) {
    if (ans < 10 && given < 10) return false;
    if (given !== ans && given >= 10 && ans >= 10 && digits(given) === digits(ans) && String(given).length === String(ans).length) return true;   // 47 and 74
    const d = Math.abs(given - ans);
    if ((d === 10 || d === 100) && given % 10 === ans % 10) return true;                                                                         // the tens or hundreds slipped
    if (given === ans * 10 || (ans % 10 === 0 && given * 10 === ans)) return true;                                                               // a zero added or lost
    return false;
  }

  function classify(Q, given) {
    if (!Q || !Number.isFinite(given) || !Number.isFinite(Q.ans)) return "guess";
    const ans = Q.ans, d = Math.abs(given - ans);
    if (Q.kind === "choice") return d <= 2 ? "choice_near" : "choice_far";
    const nums = shownNumbers(Q);
    if (nums.includes(given) && given !== ans) return "copied";
    if (otherSign(Q, nums).includes(given) && given !== ans) return "wrong_op";
    if (placeSlip(ans, given)) return "place_value";
    if (d >= 1 && d <= 2) return "slip";
    return "guess";
  }
  const leadSentence = cls => LEAD[cls] || LEAD.guess;
  const label = cls => LABEL[cls] || "";

  const api = { CLASSES, LEAD, LABEL, classify, leadSentence, label, sentences: () => Array.from(new Set(Object.values(LEAD))) };
  if (typeof module === "object" && module.exports) module.exports = api; else root.MissStudy = api;
})(typeof window !== "undefined" ? window : globalThis);
