/* CountingNeed: does Marie need counting practice? (plan item 24)
 * The counting skills of the cafe (cafe_count.1 and cafe_count.2) are OPTIONAL. They are on only when
 *   1. a grown-up turned them on in the For grown-ups card (mode "on"), or
 *   2. the answer record shows counting slips (mode "auto", the default): at least SLIPS_NEEDED of the last WINDOW answers on the
 *      adding and taking-away skills were wrong by one or two (MissStudy class "slip"), or
 *   3. a counting skill is already on her focus list and she has not yet reached "Knows it" (mode "auto"): once it has started it stays on until she
 *      knows it, even when the slips have left the window of the last 20 answers (why: "learning").
 * A grown-up can switch them off (mode "off"); then they never show. Kennedy never gets them.
 *
 *   CountingNeed.IDS                      ["cafe_count.1", "cafe_count.2"]
 *   CountingNeed.check(entries)           -> { need: bool, slips, window }   (pure; entries = the answer log)
 *   CountingNeed.learning(engineState, knows) -> true when a counting skill is on the focus list and below the level "knows" (engine LV.KNOWS)
 *   CountingNeed.decide(mode, entries, learning) -> { on: bool, why: "grown-up" | "record" | "learning" | "off" | "none" }
 *   CountingNeed.MODES                    ["auto", "on", "off"]
 *   CountingNeed.read(storage) / write(storage, { mode, noted })   the grown-up's choice, kept in its own key
 */
(function (root) {
  "use strict";
  const IDS = ["cafe_count.1", "cafe_count.2"], MODES = ["auto", "on", "off"];
  const WINDOW = 20, SLIPS_NEEDED = 3, WATCHED = /^sums\.[1-4]$/;

  function check(entries) {
    const recent = (Array.isArray(entries) ? entries : []).filter(e => e && WATCHED.test(String(e.s))).slice(-WINDOW);
    const slips = recent.filter(e => e.ok === 0 && e.c === "slip").length;
    return { need: slips >= SLIPS_NEEDED, slips, window: recent.length };
  }
  function learning(st, knows) {
    if (!st || !Array.isArray(st.focus)) return false;
    return IDS.some(id => st.focus.includes(id) && ((st.skills && st.skills[id] && st.skills[id].lvl) || 0) < knows);
  }
  function decide(mode, entries, isLearning) {
    if (mode === "off") return { on: false, why: "off" };
    if (mode === "on") return { on: true, why: "grown-up" };
    if (check(entries).need) return { on: true, why: "record" };
    return isLearning ? { on: true, why: "learning" } : { on: false, why: "none" };
  }
  /* the grown-up's choice and the "note left" flag live in their own small key, apart from the child's save, so a progress-file load never loses them
     and a damaged save never loses them either. read() never throws and never returns anything but a valid mode. */
  const KEY = "kidsMaths.game.marie.counting";
  function read(storage) {
    let d = {}; try { d = JSON.parse(storage.getItem(KEY) || "{}") || {}; } catch (e) { d = {}; }
    return { mode: MODES.includes(d.mode) ? d.mode : "auto", noted: d.noted === true };
  }
  function write(storage, patch) {
    const now = Object.assign(read(storage), patch);
    if (!MODES.includes(now.mode)) throw new Error("CountingNeed: unknown mode " + now.mode);
    try { storage.setItem(KEY, JSON.stringify(now)); return true; } catch (e) { return false; }
  }
  const api = { IDS, MODES, WINDOW, SLIPS_NEEDED, KEY, check, learning, decide, read, write };
  if (typeof module === "object" && module.exports) module.exports = api; else root.CountingNeed = api;
})(typeof window !== "undefined" ? window : globalThis);
