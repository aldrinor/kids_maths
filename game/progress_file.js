/* ProgressFile: save every child's progress to one file and load it back (plan items 11 and 22).
 * A grown-up keeps the file as a backup, or moves the game to another tablet with it.
 *
 *   ProgressFile.make(children, now)          -> text of the file (JSON). children = { marie: { save, log: [entries] }, ... }
 *   ProgressFile.parse(text)                  -> { ok, error, children, summary: [plain lines] }   (checks the file, changes nothing)
 *   ProgressFile.apply(parsed, ctx, now)      -> { ok, done: [plain lines], failed: [plain lines] }
 *       ctx = { storage, saveKey(who), logKey(who), makeEngine, GameSave, AnswerLog, names }
 *       Before any child is replaced, the save that is there now is copied to "<key>.before_file_load.<fingerprint>".
 *       The loaded save is checked and repaired (GameSave.repair), so a file from an older or odd version cannot break the game.
 * The file holds names ("marie", "kennedy"), coins, skill levels, daily totals and the answer log. No passwords, no addresses.
 */
(function (root) {
  "use strict";
  const FORMAT = "kids_maths_progress", VERSION = 1, WHO = ["marie", "kennedy"], MAX_BYTES = 12 * 1024 * 1024;
  const isObj = v => v !== null && typeof v === "object" && !Array.isArray(v);

  function make(children, now) {
    const out = { format: FORMAT, version: VERSION, madeAt: new Date(now).toISOString(), children: {} };
    for (const who of WHO) {
      const c = children[who];
      if (c && isObj(c.save)) out.children[who] = { save: c.save, log: Array.isArray(c.log) ? c.log : [] };
    }
    return JSON.stringify(out);
  }

  function parse(text) {
    const bad = error => ({ ok: false, error, children: {}, summary: [] });
    if (typeof text !== "string" || !text.trim()) return bad("The file is empty.");
    if (text.length > MAX_BYTES) return bad("The file is too big to be a Kids Maths progress file.");
    let d; try { d = JSON.parse(text); } catch (e) { return bad("This is not a Kids Maths progress file. It could not be read."); }
    if (!isObj(d) || d.format !== FORMAT) return bad("This is not a Kids Maths progress file.");
    if (!Number.isFinite(d.version) || d.version > VERSION) return bad("This file was made by a newer version of the game. Update the game first.");
    if (!isObj(d.children)) return bad("The file has no children in it.");
    const children = {}, summary = [];
    for (const who of WHO) {
      const c = d.children[who];
      if (c === undefined) continue;
      if (!isObj(c) || !isObj(c.save)) return bad(`The part of the file for ${who} is damaged.`);
      const log = Array.isArray(c.log) ? c.log : [];
      children[who] = { save: c.save, log };
      const days = isObj(c.save.days) ? Object.keys(c.save.days).length : 0;
      summary.push({ who, days, answers: log.length, coins: Number.isFinite(c.save.coins) ? c.save.coins : 0 });
    }
    if (!Object.keys(children).length) return bad("The file has no progress for Marie or Kennedy.");
    return { ok: true, error: "", children, summary, madeAt: typeof d.madeAt === "string" ? d.madeAt : "" };
  }

  function apply(parsed, ctx, now) {
    const res = { ok: true, done: [], failed: [] };
    if (!parsed || !parsed.ok) return { ok: false, done: [], failed: ["The file could not be used."] };
    const names = ctx.names || {};
    for (const who of Object.keys(parsed.children)) {
      const name = names[who] || who, key = ctx.saveKey(who), c = parsed.children[who];
      try {
        const raw = ctx.storage.getItem(key);
        if (raw !== null) {
          const copy = ctx.GameSave.backup(ctx.storage, key, raw, "before_file_load");
          if (!copy) { res.failed.push(`${name}: a safe copy of the progress on this device could not be made, so nothing was changed.`); continue; }
        }
        const fixed = ctx.GameSave.repair(JSON.parse(JSON.stringify(c.save)), who, ctx.makeEngine);
        fixed.p.version = ctx.GameSave.SCHEMA_VERSION;
        const w = ctx.GameSave.write(ctx.storage, key, fixed.p);
        if (!w.ok) { res.failed.push(`${name}: the progress could not be saved on this device.`); continue; }
        const log = ctx.AnswerLog.open({ storage: ctx.storage, key: ctx.logKey(who) });
        log.replaceAll(c.log);
        res.done.push(`${name}: progress loaded${fixed.fixes ? ` (${fixed.fixes} small part${fixed.fixes === 1 ? " was" : "s were"} rebuilt)` : ""}.`);
      } catch (e) { res.failed.push(`${name}: something went wrong, so nothing was changed.`); }
    }
    res.ok = res.failed.length === 0 && res.done.length > 0;
    return res;
  }

  const api = { FORMAT, VERSION, WHO, make, parse, apply };
  if (typeof module === "object" && module.exports) module.exports = api; else root.ProgressFile = api;
})(typeof window !== "undefined" ? window : globalThis);
