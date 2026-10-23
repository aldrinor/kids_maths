/* ParentArea: the "For grown-ups" card (plan item 11). Reached from a small button on the doors card.
 * Plain headings and paragraphs in reading order, every control a real labelled button, so a screen reader reads it top to bottom.
 *
 *  1. A grown-up check first: one multiplication a young child cannot do (12 to 19 times 12 to 19). Wrong: try again, or go back.
 *  2. The report: a weekly paragraph for each child, the most common wrong answers skill by skill, and what a grown-up can do.
 *  3. Three buttons: save the report as a text file, save the progress file, load a progress file (asks first, keeps a copy).
 * The card only reads. It never changes a child's save except when a grown-up loads a progress file and says yes.
 *
 *   ParentArea.open(ctx) -> Promise that ends when the card is closed.
 *   ctx = { store, saveKey(who), logKey(who), names, M, KidsEngine, GameSave, AnswerLog, ProgressFile, ParentReport, MissStudy, FocusGuard, rng }
 */
(function (root) {
  "use strict";
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const WHO = ["marie", "kennedy"];

  function makeGate(rng) {
    rng = rng || Math.random;
    const a = 12 + Math.floor(rng() * 8), b = 12 + Math.floor(rng() * 8);
    return { a, b, answer: a * b };
  }

  function readChild(ctx, who) {
    let save = null;
    try {
      const raw = ctx.store.getItem(ctx.saveKey(who));
      if (raw) { const p = JSON.parse(raw); if (p && typeof p === "object" && !Array.isArray(p)) save = ctx.GameSave.repair(p, who, ctx.KidsEngine.createState).p; }
    } catch (e) { save = null; }
    const log = ctx.AnswerLog.open({ storage: ctx.store, key: ctx.logKey(who) });
    return { who, name: ctx.names[who] || who, save, entries: log.all(), M: ctx.M, engine: ctx.KidsEngine, missLabel: ctx.MissStudy.label };
  }

  function download(name, mime, text) {
    const url = URL.createObjectURL(new Blob([text], { type: mime }));
    const a = document.createElement("a"); a.href = url; a.download = name; a.hidden = true;
    document.body.appendChild(a); a.click();
    setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 1500);
  }
  const stamp = now => new Date(now).toISOString().slice(0, 10);

  function open(ctx) {
    return new Promise(resolve => {
      const now = () => (ctx.now ? ctx.now() : Date.now());
      const o = document.createElement("div"); o.className = "over parentarea";
      document.body.appendChild(o);
      let gate = makeGate(ctx.rng);
      const close = () => { o.remove(); if (ctx.FocusGuard) ctx.FocusGuard.leave(o, "#tile"); resolve(); };
      const say = text => { const s = o.querySelector("#pa-status"); if (s) s.textContent = text; };
      const enter = first => { if (ctx.FocusGuard) { ctx.FocusGuard.leave(o); ctx.FocusGuard.enter(o, { label: "For grown-ups", trap: true, first: first ? o.querySelector(first) : undefined }); } };

      function showGate(wrong) {
        o.innerHTML = `<div class="panel pa"><h1 id="pa-h">For grown-ups</h1>
          <p>This part is for grown-ups. To go on, please answer this: what is ${gate.a} times ${gate.b}?</p>
          ${wrong ? `<p role="alert" class="pa-wrong">That is not right. Try again, or go back.</p>` : ""}
          <label for="pa-gate">Your answer, as a number</label>
          <input id="pa-gate" type="text" inputmode="numeric" autocomplete="off" maxlength="5">
          <div class="pa-row"><button class="go small" id="pa-go">Go on</button><button class="go small alt" id="pa-back">Back to the children</button></div></div>`;
        o.setAttribute("aria-labelledby", "pa-h");
        const input = o.querySelector("#pa-gate"), tryIt = () => {
          if (Number(input.value.trim()) === gate.answer && /^\d+$/.test(input.value.trim())) showMain();
          else { gate = makeGate(ctx.rng); showGate(true); }
        };
        o.querySelector("#pa-go").onclick = tryIt;
        input.onkeydown = e => { if (e.key === "Enter") { e.preventDefault(); tryIt(); } };       // preventDefault: the Enter must not also press the button that gets the focus next
        o.querySelector("#pa-back").onclick = close;
        enter("#pa-gate");
      }

      function showMain(message) {
        const children = WHO.map(w => readChild(ctx, w)), secs = ctx.ParentReport.sections(children, now());
        const body = secs.map((s, i) => `<section><h2>${esc(s.title)}</h2>${s.lines.map(l => `<p>${esc(l.trim())}</p>`).join("")}</section>`).join("");
        o.innerHTML = `<div class="panel pa wide"><h1 id="pa-h">For grown-ups</h1>
          <p id="pa-status" role="status">${esc(message || "")}</p>
          <div class="pa-actions">
            <button class="go small" id="pa-text">Save the report as a text file</button>
            <button class="go small" id="pa-file-save">Save the progress file</button>
            <input id="pa-file" type="file" accept=".json,application/json" class="pa-file">
            <label class="go small filebtn" for="pa-file">Load a progress file</label>
          </div>
          <div id="pa-confirm"></div>
          <div class="pa-body" tabindex="0" aria-label="The report">${body}</div>
          <div class="pa-row"><button class="go small alt" id="pa-close">Close</button></div></div>`;
        o.setAttribute("aria-labelledby", "pa-h");
        o.querySelector("#pa-close").onclick = close;
        o.querySelector("#pa-text").onclick = () => {
          download(`kids_maths_report_${stamp(now())}.txt`, "text/plain;charset=utf-8", ctx.ParentReport.text(children, now()));
          say("The report was saved as a text file in your downloads.");
        };
        o.querySelector("#pa-file-save").onclick = () => {
          const kids = {};
          children.forEach(c => { if (c.save) kids[c.who] = { save: c.save, log: c.entries }; });
          download(`kids_maths_progress_${stamp(now())}.json`, "application/json", ctx.ProgressFile.make(kids, now()));
          say("The progress file was saved in your downloads. Keep it somewhere safe.");
        };
        o.querySelector("#pa-file").onchange = async e => {
          const f = e.target.files && e.target.files[0]; if (!f) return;
          e.target.value = "";                                       // so the same file can be chosen again
          let text = ""; try { text = await f.text(); } catch (err) { say("That file could not be read."); return; }
          const parsed = ctx.ProgressFile.parse(text);
          if (!parsed.ok) { say(parsed.error); return; }
          const lines = parsed.summary.map(s => `${esc(ctx.names[s.who] || s.who)}: ${s.days} days played, ${s.answers} answers recorded, ${s.coins} coins.`).join("<br>");
          const box = o.querySelector("#pa-confirm");
          box.innerHTML = `<div class="grownote" role="alert"><b>Load this file?</b><p>${lines}</p><p>This will replace the saved progress on this device for the children named above. A safe copy of what is here now is kept first.</p>
            <button class="go small" id="pa-yes">Yes, load it</button><button class="go small alt" id="pa-no">No, keep what is here</button></div>`;
          box.querySelector("#pa-no").onclick = () => { box.innerHTML = ""; say("Nothing was changed."); };
          box.querySelector("#pa-yes").onclick = () => {
            const r = ctx.ProgressFile.apply(parsed, { storage: ctx.store, saveKey: ctx.saveKey, logKey: ctx.logKey, makeEngine: ctx.KidsEngine.createState,
              GameSave: ctx.GameSave, AnswerLog: ctx.AnswerLog, names: ctx.names }, now());
            showMain([...r.done, ...r.failed].join(" "));
          };
          const yes = box.querySelector("#pa-yes"); if (yes) yes.focus();
        };
        o.querySelector("#pa-h").tabIndex = -1;
        enter("#pa-h");                                                    // a screen reader starts at the title, not on a button
      }
      showGate(false);
    });
  }

  const api = { makeGate, open, readChild };
  if (typeof module === "object" && module.exports) module.exports = api; else root.ParentArea = api;
})(typeof window !== "undefined" ? window : globalThis);
