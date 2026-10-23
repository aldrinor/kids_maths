/* AnswerLog: a record of every answer a child gives (review items 21 and 10), kept apart from the main save.
 *
 * Why apart: if the log is ever damaged or too big, play and the main save are not touched. Every read and write is wrapped,
 * so a broken log can never stop a child from playing. A log that cannot be read is copied to "<key>.damaged.<fingerprint>"
 * before a new empty one is started.
 *
 * One entry per submitted answer (a first wrong answer is an entry, and so is the fresh question after it):
 *   t   time of the answer (ms since 1970)        s   skill id ("sums.3", or "parent" for a parent's own question)
 *   q   the question shown (the sum, e.g. "47 + 38 = ?")
 *   g   what the child gave                       a   the right answer
 *   ok  1 right, 0 wrong                          h   highest hint level used on this question (0 to 3)
 *   r   which try on this question (1, 2 ...)     sc  the scene shown above the question (e.g. "add")
 *   ms  milliseconds from the question appearing to the answer    k  "t" typed, "c" choice
 *   c   kind of miss (only for a wrong answer; see miss_study.js)
 *   f   flags: "rush" (wrong in under 1.5 s), "fresh" (a new question after a miss), "alt" (second picture)
 *
 *   const log = AnswerLog.open({ storage, key, max: 3000 });
 *   log.add({ ... });  log.all();  log.size();  log.replaceAll(entries);  log.ok  (false when the last write failed)
 */
(function (root) {
  "use strict";
  const DEFAULT_MAX = 3000, VERSION = 1;
  const isObj = v => v !== null && typeof v === "object" && !Array.isArray(v);

  function fingerprint(text) {
    let h = 0x811c9dc5;
    for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return h.toString(16).padStart(8, "0") + "_" + text.length;
  }
  /* keep a copy of a log that cannot be read; the same text is copied once */
  function keepCopy(storage, key, raw) {
    try { const k = key + ".damaged." + fingerprint(raw); if (storage.getItem(k) === null) storage.setItem(k, raw); return k; } catch (e) { return ""; }
  }
  /* an entry is kept only if it has the basic parts; odd values are cut down to safe ones */
  function clean(e) {
    if (!isObj(e) || !Number.isFinite(e.t) || typeof e.s !== "string") return null;
    const num = v => (Number.isFinite(v) ? v : null);
    return {
      t: Math.round(e.t), s: e.s.slice(0, 40), q: String(e.q == null ? "" : e.q).slice(0, 90), g: num(e.g), a: num(e.a),
      ok: e.ok ? 1 : 0, h: Math.max(0, Math.min(3, Math.floor(e.h) || 0)), r: Math.max(1, Math.floor(e.r) || 1),
      sc: String(e.sc || "").slice(0, 20), ms: Math.max(0, Math.round(Number(e.ms) || 0)), k: e.k === "c" ? "c" : "t",
      c: e.c ? String(e.c).slice(0, 20) : "", f: Array.isArray(e.f) ? e.f.filter(x => typeof x === "string").slice(0, 4) : []
    };
  }

  function open(opts) {
    const { storage, key } = opts, max = opts.max > 0 ? opts.max : DEFAULT_MAX;
    const log = { entries: [], ok: true, damaged: false, copyKey: "", max, key };
    let raw = null;
    try { raw = storage.getItem(key); } catch (e) { log.ok = false; }
    if (raw !== null) {
      let parsed;
      try { parsed = JSON.parse(raw); } catch (e) { parsed = undefined; }
      if (isObj(parsed) && Array.isArray(parsed.e)) log.entries = parsed.e.map(clean).filter(Boolean).slice(-max);
      else { log.damaged = true; log.copyKey = keepCopy(storage, key, raw); }
    }
    function write() {
      try { storage.setItem(key, JSON.stringify({ v: VERSION, e: log.entries })); log.ok = true; return true; } catch (e) {
        /* the device is full: let go of the oldest tenth and try once more; if that fails too the log lives on in memory only */
        try {
          const trimmed = log.entries.slice(Math.ceil(log.entries.length / 10));
          storage.setItem(key, JSON.stringify({ v: VERSION, e: trimmed })); log.entries = trimmed; log.ok = true; return true;
        } catch (e2) { log.ok = false; return false; }                     // still no room: the entries stay in memory for this visit
      }
    }
    log.add = entry => {
      const c = clean(entry); if (!c) return false;
      log.entries.push(c); if (log.entries.length > max) log.entries = log.entries.slice(-max);
      return write();
    };
    log.all = () => log.entries.slice();
    log.size = () => log.entries.length;
    /* used when a progress file is loaded: keep at most the newest `max` entries */
    log.replaceAll = list => { log.entries = (Array.isArray(list) ? list : []).map(clean).filter(Boolean).slice(-max); return write(); };
    return log;
  }

  const api = { DEFAULT_MAX, VERSION, open, clean, fingerprint };
  if (typeof module === "object" && module.exports) module.exports = api; else root.AnswerLog = api;
})(typeof window !== "undefined" ? window : globalThis);
