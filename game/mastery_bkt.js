/* MasteryBKT: a simple probability that a child knows a skill (Bayesian knowledge tracing), kept beside the engine's streak rule
 * (review items 17 and 22, plan items 15). The engine itself is not changed.
 *
 * For each skill we keep p = the chance the child really knows it, saved in game.bkt[skill] (a number from 0 to 1).
 * After every counted answer, with "clean" meaning right at the first try and without the worked step of a hint:
 *   a clean answer: p = p(1-slip) / ( p(1-slip) + (1-p) * guess )        a miss: p = p*slip / ( p*slip + (1-p) * (1-guess) )
 *   then p grows a little because the child may have learned from the answer: p = p + (1-p) * learn
 * guess is 1 / (number of choices) for a tap question (a 3-choice question: one in three), and small for a typed answer.
 *
 * What the estimate decides (the streak rule still comes first):
 *   reinforce  the streak rule says "Knows it" but p is below CONFIG.gate: the promotion is undone and the skill is practised more
 *   push       p is at least CONFIG.push, the last answers were clean, and the evidence is enough: the skill is promoted one answer early
 * The choice-answer guard (choice_evidence.js) runs first and still asks for 2 extra clean taps on a choice question.
 * All the numbers are in CONFIG so a grown-up or a test can change them in one place.
 *
 *   const guard = ChoiceEvidence.before(state, skill);          // before KidsEngine.record
 *   ... KidsEngine.record(...) ...
 *   MasteryBKT.after(guard, state, game, { skill, kind, clean, rush, need, options })   // returns "none" | "reinforce" | "push"
 */
(function (root) {
  "use strict";
  const CONFIG = {
    init: 0.2,          // chance a brand new skill is already known
    initKnown: 0.85,    // a skill placement already marked as "Knows it"
    learn: 0.1,         // chance of learning from one answer
    slip: 0.1,          // chance a child who knows it still gets it wrong
    guessTyped: 0.05,   // chance of typing the right number by luck
    floor: 0.02,        // p never goes below this, so a long bad patch can always be recovered from
    ceil: 0.999,
    gate: 0.9,          // "Knows it" is allowed only when p is at least this
    push: 0.98,         // p at which a skill may be promoted one clean answer early
    pushMinAccuracy: 0.6 // ... and only if at least this share of the last 10 answers were clean
  };
  const KNOWS = 3;
  const isObj = v => v !== null && typeof v === "object" && !Array.isArray(v);
  const clamp = (v, cfg) => Math.max(cfg.floor, Math.min(cfg.ceil, v));

  function bktOf(game) { return isObj(game.bkt) ? game.bkt : (game.bkt = {}); }
  function estimate(game, skill) { const v = game && isObj(game.bkt) ? game.bkt[skill] : undefined; return Number.isFinite(v) ? v : null; }

  /* where p starts when there is no saved number: from what the engine already knows about the skill (snap = the skill before this answer) */
  function prior(snap, cfg) {
    if (!snap) return cfg.init;
    if (snap.lvl >= KNOWS) return cfg.initKnown;
    const r = Array.isArray(snap.recent) ? snap.recent : [];
    if (r.length < 3) return cfg.init;
    const acc = r.reduce((a, b) => a + b, 0) / r.length;
    return acc >= .8 ? .5 : acc >= .5 ? .3 : .15;
  }
  /* one step. guess: the chance of a lucky right answer */
  function step(p, clean, guess, cfg) {
    const post = clean ? p * (1 - cfg.slip) / (p * (1 - cfg.slip) + (1 - p) * guess) : p * cfg.slip / (p * cfg.slip + (1 - p) * (1 - guess));
    return clamp(post + (1 - post) * cfg.learn, cfg);
  }
  const guessFor = (kind, options, cfg) => (kind === "choice" ? 1 / Math.max(2, options || 3) : cfg.guessTyped);

  /* update the saved p for one answer and return the new p */
  function update(game, skill, r, snap, cfg) {
    cfg = cfg || CONFIG;
    const bkt = bktOf(game), had = estimate(game, skill);
    const p0 = had === null ? prior(snap, cfg) : clamp(had, cfg);
    const p = step(p0, !!r.clean, guessFor(r.kind, r.options, cfg), cfg);
    bkt[skill] = Math.round(p * 10000) / 10000;
    return p;
  }

  function after(guard, state, game, r, cfg) {
    cfg = cfg || CONFIG;
    const undone = root.ChoiceEvidence ? root.ChoiceEvidence.after(guard, state, game, r) : false;
    if (r.rush) return "none";                                            // the engine ignored it, so do we
    const p = update(game, r.skill, r, guard && guard.snap, cfg);
    const s = state.skills[r.skill], b = guard && guard.snap;
    if (!s) return "none";
    const promoted = !undone && !!b && b.lvl < KNOWS && s.lvl >= KNOWS;
    if (promoted && p < cfg.gate) { root.ChoiceEvidence.undo(b, s, r.clean); return "reinforce"; }
    if (!promoted && !undone && s.lvl < KNOWS && r.clean && p >= cfg.push && s.streak >= r.need - 1 && s.recent.length) {
      const recent = s.recent.slice(-10), acc = recent.reduce((a, c) => a + c, 0) / recent.length;
      const ev = game.evidence && Number.isFinite(game.evidence[r.skill]) ? game.evidence[r.skill] : 0;
      const enough = r.kind !== "choice" || ev >= r.need + root.ChoiceEvidence.EXTRA - 1;
      if (acc >= cfg.pushMinAccuracy && enough) {                           // promoted one answer early, in the same way the engine promotes
        const now = r.now || Date.now();
        s.lvl = KNOWS; s.learntAt = now; s.streak = 0; s.gap = 0; s.due = now + 864e5; s.stuckN = 0; s.stuckRight = 0; s.repairs = 0;
        return "push";
      }
    }
    return "none";
  }

  const api = { CONFIG, estimate, update, after, step, prior, guessFor };
  if (typeof module === "object" && module.exports) { module.exports = api; if (!root.ChoiceEvidence) { try { root.ChoiceEvidence = require("./choice_evidence.js"); } catch (e) {} } }
  else root.MasteryBKT = api;
})(typeof window !== "undefined" ? window : globalThis);
