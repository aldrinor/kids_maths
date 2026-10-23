/* ChoiceEvidence: a skill is not marked "Knows it" on lucky taps (review item 17).
 *
 * The engine promotes a skill after a short run of clean answers (2 first answers right, or 3 / 4 in a row).
 * On a 3-choice question a child can tap the right answer by luck 1 time in 3, so two lucky taps would pass.
 * This game-layer guard asks for 2 more clean answers in a row when the evidence is choice answers only.
 * One clean TYPED answer (a 1 in 1000 guess) is full evidence. The engine itself is not changed.
 *
 *   const g = ChoiceEvidence.before(state, skill);                 // call before KidsEngine.record
 *   ... KidsEngine.record(...) ...
 *   ChoiceEvidence.after(g, state, game, { skill, kind, clean, rush, need });   // call right after; may undo a promotion
 *   game.evidence is the saved counter per skill: { "sums.1": 3, ... } (clean answers in a row; typed answer = full)
 */
(function (root) {
  "use strict";
  const KNOWS = 3, EXTRA = 2, FULL = 99;

  function before(state, skill) {
    const s = state.skills[skill];
    return { had: !!s, snap: s ? JSON.parse(JSON.stringify(s)) : null };
  }

  /* r: { skill, kind: "choice" | "typed", clean, rush, need (the engine's streak need for this child) } */
  function after(snap, state, game, r) {
    if (r.rush) return false;                                   // the engine ignored it, so do we
    const ev = game.evidence = game.evidence && typeof game.evidence === "object" ? game.evidence : {};
    ev[r.skill] = !r.clean ? 0 : r.kind === "choice" ? (ev[r.skill] || 0) + 1 : FULL;
    const s = state.skills[r.skill], b = snap.snap;
    if (!s || !b || b.lvl >= KNOWS || s.lvl < KNOWS) return false;     // no new promotion happened
    if (ev[r.skill] >= r.need + EXTRA) return false;                    // enough evidence
    /* undo only the promotion; the counts of this answer stay */
    s.lvl = b.lvl; s.learntAt = b.learntAt; s.gap = b.gap; s.due = b.due; s.repairs = b.repairs;
    s.streak = b.streak + 1; s.stuckN = b.stuckN + 1; s.stuckRight = b.stuckRight + (r.clean ? 1 : 0);
    if (b.learntAt === undefined) delete s.learntAt;
    return true;
  }

  const api = { EXTRA, before, after };
  if (typeof module === "object" && module.exports) module.exports = api; else root.ChoiceEvidence = api;
})(typeof window !== "undefined" ? window : globalThis);
