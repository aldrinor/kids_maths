/* GameSave: reading, checking, repairing and writing one child's save (localStorage), for game/index.html.
 *
 * Rules (review items 6, 7, 9, 10, 19, 24):
 *  - A save that cannot be read is NEVER overwritten: a copy is stored first under "<key>.damaged.<time>" (never replaces an older copy).
 *  - Every save carries a schema version number (SCHEMA_VERSION). An older save is stamped, after one copy "<key>.before_version_<n>".
 *  - Missing or wrong parts are rebuilt with defaults, so the game never meets a missing field and never shows a blank screen.
 *  - Every problem becomes a plain-words note for the grown-up (kept in "kidsMaths.game.notes" until they read it).
 *  - A failed write is reported (write() returns { ok: false }) so the page can warn the grown-up.
 * Works with any object that has getItem / setItem / removeItem (tests give it a fake).
 */
(function (root) {
  "use strict";
  const SCHEMA_VERSION = 2;
  const NOTES_KEY = "kidsMaths.game.notes", NOTES_READ_KEY = "kidsMaths.game.notes_read";
  const COUNTERS = ["answered", "sinceReward", "sincePlay", "rewardTurn"];
  const NAMES = { marie: "Marie", kennedy: "Kennedy" };

  const isObj = v => v !== null && typeof v === "object" && !Array.isArray(v);
  const clone = v => JSON.parse(JSON.stringify(v));
  const whole = v => Number.isFinite(v) && v >= 0;
  const nameOf = who => NAMES[who] || who;

  /* the shape the engine gives every skill (kept in step with modules/engine.js, function sk) */
  function newSkill() {
    return { lvl: 0, streak: 0, n: 0, right: 0, recent: [], due: 0, gap: 0, recheck: null, stuckN: 0, stuckRight: 0, repairs: 0, parkedUntil: 0, first2: [] };
  }

  /* put back anything missing or of the wrong kind, using def as the model; returns how many things were rebuilt */
  function fillLike(target, def, skipKeys) {
    let fixes = 0;
    for (const k of Object.keys(def)) {
      const d = def[k], t = target[k];
      if (skipKeys && skipKeys.includes(k)) { if (!isObj(t)) { target[k] = clone(d); fixes++; } continue; }
      if (Array.isArray(d)) { if (!Array.isArray(t)) { target[k] = clone(d); fixes++; } }
      else if (isObj(d)) { if (!isObj(t)) { target[k] = clone(d); fixes++; } else fixes += fillLike(t, d); }
      else if (typeof d === "number") { if (!Number.isFinite(t)) { target[k] = d; fixes++; } }
      else if (typeof d === "boolean" || typeof d === "string") { if (typeof t !== typeof d) { target[k] = d; fixes++; } }
    }
    return fixes;
  }

  /* make p safe to use. Returns { p, fixes (how many parts were rebuilt), list (what, in plain words) } */
  function repair(p, who, makeEngine) {
    const list = [];
    const say = (text, n) => { if (n) list.push(text); };
    let fixes = 0;
    const add = (n, text) => { fixes += n; say(text, n); };
    if (!isObj(p)) { p = {}; add(1, "the whole save"); }
    if (!whole(p.coins)) { add(1, "the coins"); p.coins = 0; } else p.coins = Math.floor(p.coins);
    if (!isObj(p.game)) { p.game = {}; add(1, "the counters"); }
    for (const k of COUNTERS) if (!whole(p.game[k])) { if (p.game[k] !== undefined) add(1, "a counter"); p.game[k] = 0; } else p.game[k] = Math.floor(p.game[k]);
    if (!isObj(p.days)) { p.days = {}; add(1, "the daily record"); }
    for (const d of Object.keys(p.days)) {
      const day = p.days[d];
      if (!isObj(day)) { delete p.days[d]; add(1, "a day in the daily record"); continue; }
      for (const f of ["n", "clean", "ms", "sets"]) if (!whole(day[f])) { day[f] = 0; add(1, "a day in the daily record"); }
      if (!isObj(day.skills)) { day.skills = {}; add(1, "a day in the daily record"); }
      for (const f of ["breaks", "breakMs"]) if (day[f] !== undefined && !whole(day[f])) { day[f] = 0; add(1, "a day in the daily record"); }   // breaks the child asked for (journey.js)
    }
    /* keepsakes from the reward games: a list of small records; anything else in the list is dropped, the rest is kept */
    if (p.keepsakes !== undefined) {
      if (!Array.isArray(p.keepsakes)) { delete p.keepsakes; add(1, "the keepsakes"); }
      else { const good = p.keepsakes.filter(k => isObj(k) && typeof k.g === "string" && typeof k.a === "string").slice(-24); if (good.length !== p.keepsakes.length) add(1, "the keepsakes"); p.keepsakes = good; }
    }
    if (p.game.nearSaid !== undefined && typeof p.game.nearSaid !== "boolean") { p.game.nearSaid = false; add(1, "a counter"); }
    for (const [k, type] of [["world", "object"], ["parentLog", "array"], ["home", "array"]]) {
      if (p[k] === undefined) continue;
      if (type === "array" ? !Array.isArray(p[k]) : !isObj(p[k])) { delete p[k]; add(1, "saved play-world items"); }
    }
    if (p.limitMin !== undefined && !(Number.isFinite(p.limitMin) && p.limitMin > 0)) { delete p.limitMin; add(1, "the daily limit"); }
    /* the maths levels */
    if (!isObj(p.engine) || p.engine.profile !== who) { p.engine = makeEngine(who); add(1, "the maths levels"); }
    else {
      add(fillLike(p.engine, makeEngine(who), ["skills", "best", "dayCounts"]), "the maths levels");
      for (const id of Object.keys(p.engine.skills)) {
        const s = p.engine.skills[id];
        if (!isObj(s)) { delete p.engine.skills[id]; add(1, "one maths skill"); continue; }
        add(fillLike(s, newSkill()), "one maths skill");
      }
    }
    return { p, fixes, list: [...new Set(list)] };
  }

  /* a short fingerprint of a text, so the same damaged save is copied once, not on every start */
  function fingerprint(text) {
    let h = 0x811c9dc5;
    for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return h.toString(16).padStart(8, "0") + "_" + text.length;
  }
  /* keep a copy of text (the raw save) under "<key>.<label>.<fingerprint>"; the same text reuses its copy, a different text never replaces one.
     Returns the key, or "" when the copy could not be stored. */
  function backup(storage, key, raw, label) {
    try {
      const base = key + "." + label + "." + fingerprint(raw);
      let k = base, i = 1;
      while (storage.getItem(k) !== null) { if (storage.getItem(k) === raw) return k; i++; k = base + "." + i; }
      storage.setItem(k, raw);
      return storage.getItem(k) === raw ? k : "";
    } catch (e) { return ""; }
  }

  /* notes for the grown-up */
  function notes(storage) {
    try { const n = JSON.parse(storage.getItem(NOTES_KEY) || "[]"); return Array.isArray(n) ? n.filter(x => isObj(x) && typeof x.text === "string") : []; } catch (e) { return []; }
  }
  function addNote(storage, who, text, now) {
    try { const n = notes(storage).concat({ when: new Date(now).toISOString(), who, text }).slice(-20); storage.setItem(NOTES_KEY, JSON.stringify(n)); } catch (e) {}
  }
  /* clearNotes(storage) removes every note; clearNotes(storage, texts) removes only the notes with those texts.
     A removed note is kept in a history list (the last 50), so a note a child tapped away can still be found. */
  function clearNotes(storage, texts) {
    try {
      const all = notes(storage), gone = texts ? all.filter(n => texts.includes(n.text)) : all, left = texts ? all.filter(n => !texts.includes(n.text)) : [];
      if (gone.length) {
        let hist = []; try { hist = JSON.parse(storage.getItem(NOTES_READ_KEY) || "[]"); } catch (e) {}
        storage.setItem(NOTES_READ_KEY, JSON.stringify((Array.isArray(hist) ? hist : []).concat(gone).slice(-50)));
      }
      if (left.length) storage.setItem(NOTES_KEY, JSON.stringify(left)); else storage.removeItem(NOTES_KEY);
    } catch (e) {}
  }

  /* Load one child's save. opts: { storage, key, who, now, makeEngine, importOld() -> object|null, forceFresh }
     Returns { p, status: "new" | "ok" | "migrated" | "repaired" | "damaged", notes: [plain words], blocked: bool }
     blocked = true when the old data could not be copied safely: the page must not write over it. */
  function load(opts) {
    const { storage, key, who, now, makeEngine } = opts;
    const out = { p: null, status: "ok", notes: [], blocked: false, backupKey: "" };
    const name = nameOf(who);
    let raw = null, parsed = null, readable = true;
    try { raw = storage.getItem(key); } catch (e) { readable = false; }
    if (!readable) {
      out.status = "damaged"; out.blocked = true;
      out.notes.push(`${name}'s saved progress could not be opened on this device. Maths starts fresh and will not be saved this time.`);
    } else if (raw === null || opts.forceFresh) {
      out.status = "new";
      if (opts.forceFresh && raw !== null) {
        out.backupKey = backup(storage, key, raw, "damaged", now);
        out.status = "damaged";
        out.notes.push(out.backupKey
          ? `${name}'s saved progress caused a problem. A safe copy was kept on this device and maths starts fresh. This play will not be saved, so the old save stays safe.`
          : `${name}'s saved progress caused a problem and a safe copy could not be made. Maths starts fresh and the old save is left untouched.`);
        out.blocked = true;
      }
    } else {
      try { parsed = JSON.parse(raw); } catch (e) { parsed = undefined; }
      if (!isObj(parsed)) {
        out.status = "damaged";
        out.backupKey = backup(storage, key, raw, "damaged", now);
        out.blocked = !out.backupKey;
        out.notes.push(out.backupKey
          ? `${name}'s saved progress was damaged and could not be read. A safe copy was kept on this device. Maths starts fresh for now.`
          : `${name}'s saved progress was damaged and a safe copy could not be made. Maths starts fresh and the old save is left untouched.`);
        parsed = null;
      }
    }
    let p = parsed, startedAt = Number.isFinite(parsed && parsed.version) ? parsed.version : 1;
    if (!p) { p = (opts.importOld && opts.importOld()) || {}; startedAt = SCHEMA_VERSION; }
    const newer = startedAt > SCHEMA_VERSION;
    if (newer) {
      out.backupKey = out.backupKey || backup(storage, key, raw, "from_newer_version", now);
      out.notes.push(`${name}'s save was written by a newer version of this game. It was kept as it is, and a copy was made.`);
    }
    const r = repair(p, who, makeEngine);
    p = r.p;
    if (r.fixes) {
      if (parsed && raw !== null && !out.backupKey) out.backupKey = backup(storage, key, raw, "before_repair", now);
      if (parsed) out.notes.push(`Some parts of ${name}'s saved progress were missing or wrong (${r.list.join(", ")}). They were rebuilt. ${out.backupKey ? "A safe copy of the old save was kept." : ""}`.trim());
      if (out.status === "ok") out.status = "repaired";
    }
    if (parsed && startedAt < SCHEMA_VERSION && raw !== null) {
      backup(storage, key, raw, "before_version_" + SCHEMA_VERSION, now);        // one copy of the old shape, then the stamp below
      if (out.status === "ok") out.status = "migrated";
    }
    if (!newer) p.version = SCHEMA_VERSION;
    out.p = p;
    return out;
  }

  /* Write a save. Returns { ok: true } or { ok: false, error } (storage full, blocked, private window ...). */
  function write(storage, key, p) {
    try { storage.setItem(key, JSON.stringify(p)); return { ok: true }; } catch (e) { return { ok: false, error: String(e && e.message || e) }; }
  }

  const api = { SCHEMA_VERSION, NOTES_KEY, NOTES_READ_KEY, repair, load, write, backup, notes, addNote, clearNotes, newSkill };
  if (typeof module === "object" && module.exports) module.exports = api; else root.GameSave = api;
})(typeof window !== "undefined" ? window : globalThis);
