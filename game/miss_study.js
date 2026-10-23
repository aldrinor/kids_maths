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
 *   wrong_end    (more or less questions, Q.opposite) the child tapped the number at the other end: she read "more" as "less" or the other way round
 *   last_digit   (even and odd questions, Q.parity) a wrong tap: the last digit tells even from odd
 *
 * Fixed order, first match wins: choice question -> copied -> wrong_op -> place_value -> slip -> guess.
 * (So 5 + 1 with 5 given is "copied", not "slip".)
 *
 * leadSentence(cls) is ONE fixed spoken sentence with no numbers. It is the first step of the lesson that follows the miss,
 * so the lesson starts with the help that matches the mistake. Fixed sentences keep the list of voice clips finite.
 */
(function (root) {
  "use strict";
  const CLASSES = ["copied", "wrong_op", "place_value", "slip", "guess", "choice_near", "choice_far", "wrong_end", "last_digit", "unit_size", "other_part", "scale_slip", "bigger_parts", "one_group", "count_marks"];
  const LEAD = {
    copied: "That number is in the story. We need to find a new number.",
    wrong_op: "Look at the sign first. Is it plus or minus?",
    place_value: "Look at the tens and the ones. Which is which?",
    slip: "So close! Let's count again, nice and slow.",
    guess: "Let's go one step at a time.",
    choice_near: "So close! Let's count again, nice and slow.",
    choice_far: "Let's look at it together.",
    wrong_end: "Read the question once more. Is it more, or is it less?",
    last_digit: "Look at the last digit. Does it make the number even or odd?",
    unit_size: "Think how big it is. Big things need the big unit.",
    other_part: "Check the question. Faces, edges or corners?",
    scale_slip: "Look at the key and the side numbers again.",
    bigger_parts: "More equal parts means smaller parts.",
    one_group: "That is one group. How many groups do we need?",
    count_marks: "Count the spaces between the marks, not the marks."
  };
  const LABEL = {
    copied: "gave a number that was printed in the question",
    wrong_op: "used the other sign (plus for minus, or minus for plus)",
    place_value: "mixed up the tens and the ones",
    slip: "was out by one or two",
    guess: "gave an answer with no clear pattern",
    choice_near: "tapped an answer that was one or two away",
    choice_far: "tapped an answer that was far away",
    wrong_end: "tapped the other end (the least when asked for the most, or the most when asked for the least)",
    last_digit: "tapped the wrong even or odd number (the last digit tells which)",
    unit_size: "chose the right kind of unit but the wrong size (centimetres for metres, grams for kilograms, millilitres for litres, or the other way round)",
    other_part: "counted the faces, edges or corners that were not asked for",
    scale_slip: "read the graph as one for each picture or line, and forgot what one picture or line stands for",
    bigger_parts: "chose the fraction with more parts as the bigger piece",
    one_group: "gave the size of one group when more than one group was needed",
    count_marks: "counted the marks on the line instead of the equal parts"
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
    if (Q.slips) { const hit = CLASSES.find(c => Array.isArray(Q.slips[c]) && Q.slips[c].includes(given) && given !== Q.ans); if (hit) return hit; }   // a known mix-up of the new kinds (23 Oct 2026, round 2)
    if (Q.picOpts) return "guess";                                   // picture answers (patterns, size) are numbered 1, 2, 3 only to tell them apart: being "one away" means nothing
    const ans = Q.ans, d = Math.abs(given - ans);
    if (Q.noNear) {                                                  // comparing, ordering, even or odd, estimating: the wrong taps are not "one or two away"
      if (Q.opposite != null && given === Q.opposite) return "wrong_end";
      if (Q.parity) return "last_digit";
      return placeSlip(ans, given) ? "place_value" : "choice_far";
    }
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
