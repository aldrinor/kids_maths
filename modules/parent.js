/* parent.js - the Parent area (19 Oct 2026). Plain text, real headings and labelled controls, so a screen reader
   reads it in order. Most important first: what needs attention, then today, then progress, then controls.
   Uses the page's globals: P, who, PROFILES, Mission, KidsEngine, save, speak, startAs, showStart, adopt, HomeGame. */
(function () {
  "use strict";
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const pct = (a, b) => b ? Math.round(a / b * 100) : 0;
  const mins = ms => Math.round((ms || 0) / 60000);
  const pl = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;
  let resetAsk = false, placeAsk = false;

  function render(el) {
    const M = Mission.map(), st = Mission.eng(), now = Date.now(), name = PROFILES[who].name;
    const rep = KidsEngine.report(st, M, now);
    const days = P.days || {}, todayKey = KidsEngine.dayKey(now), t = days[todayKey] || { n: 0, clean: 0, ms: 0, sets: 0, skills: {} };
    const lv = id => st.skills[id] ? st.skills[id].lvl : 0;
    const ready = M.order.filter(id => M.map[id].ready);
    const sure = ready.filter(id => lv(id) >= 4), knows = ready.filter(id => lv(id) === 3), practising = ready.filter(id => lv(id) >= 1 && lv(id) <= 2);
    const next = ready.filter(id => lv(id) < 3 && M.map[id].needs.every(n => lv(n) >= 3) && !(st.skills[id]?.parkedUntil > now)).slice(0, 6);
    const parked = ready.filter(id => st.skills[id]?.parkedUntil > now);
    const groupName = g => (KidsEngine.GROUPS.find(x => x.id === g) || { name: g }).name;
    const listBy = ids => {
      if (!ids.length) return "<p>None yet.</p>";
      const by = {}; ids.forEach(id => (by[M.map[id].group] = by[M.map[id].group] || []).push(id));
      return Object.keys(by).map(g => `<h4>${esc(groupName(g))} (${by[g].length})</h4><ul>${by[g].map(id => `<li>${esc(M.map[id].name)}, grade ${M.map[id].grade}</li>`).join("")}</ul>`).join("");
    };
    // Needs attention
    const att = [];
    if (st.paused) att.push(`Maths is paused for ${name}. Turn it back on under Controls.`);
    if (!st.place.done) att.push(`The first level check is not finished yet: ${st.place.asked} of about ${who === "kennedy" ? 18 : 31} questions done. It carries on by itself in the next sessions.`);
    parked.forEach(id => att.push(`Stuck and resting until ${new Date(st.skills[id].parkedUntil).toLocaleDateString("en-CA", { month: "long", day: "numeric" })}: ${M.map[id].name}. You can send extra questions on it, or bring it back now under Controls.`));
    const playedDays = Object.keys(days).sort();
    const last = playedDays[playedDays.length - 1];
    if (last && (now - Date.parse(last)) / KidsEngine.DAY > 3) att.push(`${name} has not played since ${last}.`);
    // Last 14 days
    const week = [];
    for (let i = 0; i < 14; i++) { const k = KidsEngine.dayKey(now - i * KidsEngine.DAY), d = days[k]; if (d && d.n) week.push(`<li>${new Date(k + "T12:00:00").toLocaleDateString("en-CA", { weekday: "long", month: "long", day: "numeric" })}: ${pl(d.n, "answer")}, ${d.clean} right first time (${pct(d.clean, d.n)} percent), ${pl(mins(d.ms), "minute")}.</li>`); }
    const todaySkills = Object.entries(t.skills || {}).map(([id, [n, c]]) => `<li>${esc(M.map[id] ? M.map[id].name : id)}: ${pl(n, "answer")}, ${c} right first time.</li>`).join("");
    const reward = who === "kennedy" ? `${P.coins || 0} coins. ${P.defeated || 0} bad guys sent home.` : `${P.stars} stars. ${P.cooks || 0} cooking treats.`;
    const focusOpts = ready.filter(id => lv(id) < 3).map(id => `<option value="${esc(id)}">${esc(M.map[id].name)}, grade ${M.map[id].grade}</option>`).join("");
    const waiting = st.parentQs.map((q, i) => `<li>${esc(q.q)} Answer: ${esc(q.a)}. <button class="mini" type="button" data-delq="${i}">Remove</button></li>`).join("");
    const answeredQs = (P.parentLog || []).slice(-10).reverse().map(q => `<li>${esc(q.q)} ${q.firstTry ? "Right first time" : "Right after more tries"} (${q.day}).</li>`).join("");

    el.innerHTML = `<h2>Parent area: ${esc(name)}</h2>
      <div class="set"><span>Show another child:</span>${["marie", "kennedy"].filter(c => c !== who).map(c => `<button class="mini" type="button" data-child="${c}">${PROFILES[c].name}</button>`).join("")}</div>
      <section><h3>Needs your attention</h3>${att.length ? `<ul>${att.map(a => `<li>${esc(a)}</li>`).join("")}</ul>` : "<p>Nothing needs attention.</p>"}</section>
      <section><h3>Today</h3><p>${pl(t.n, "answer")}, ${t.clean} right first time (${pct(t.clean, t.n)} percent). ${mins(t.ms)} of ${P.limitMin || 25} minutes used. ${pl(t.sets, "set")} of 5 done. ${reward}</p>${todaySkills ? `<ul>${todaySkills}</ul>` : ""}</section>
      <section><h3>Last 14 days</h3>${week.length ? `<ul>${week.join("")}</ul>` : "<p>No play yet.</p>"}</section>
      <section><h3>Progress</h3><p>${rep.known} of ${rep.total} skills learnt. ${sure.length} known for sure (checked again on a later day). ${knows.length} known, waiting for their check. ${practising.length} being practised. ${ready.filter(id => lv(id) === 5).length} times-fact groups are quick (answered within the time on 2 days).</p>
        <h3>Coming next</h3>${next.length ? `<ul>${next.map(id => `<li>${esc(M.map[id].name)}, grade ${M.map[id].grade}</li>`).join("")}</ul>` : "<p>Nothing open right now.</p>"}
        <details><summary>Known for sure (${sure.length})</summary>${listBy(sure)}</details>
        <details><summary>Known, waiting for a check (${knows.length})</summary>${listBy(knows)}</details>
        <details><summary>Being practised (${practising.length})</summary>${listBy(practising)}</details>
        <details><summary>Games still being built (${rep.coming.length})</summary><ul>${rep.coming.map(n => `<li>${esc(n)}</li>`).join("")}</ul></details></section>
      <section><h3>Controls</h3>
        <div class="set"><input id="pPause" type="checkbox"${st.paused ? " checked" : ""}><label for="pPause">Pause maths for ${esc(name)}</label></div>
        <div class="set"><label for="pSpeed">Times facts: answer within</label><select id="pSpeed">${[8, 5, 3].map(sec => `<option value="${sec}"${(st.factGoalMs || 8000) === sec * 1000 ? " selected" : ""}>${sec} seconds</option>`).join("")}</select></div>
        ${who === "kennedy" ? `<div class="set"><input id="pKSpeed" type="checkbox"${st.kennedySpeed ? " checked" : ""}><label for="pKSpeed">Speed practice for Kennedy (off until he is ready)</label></div>` : ""}
        <div class="set"><label for="pLimit">Minutes of maths a day</label><input id="pLimit" type="number" min="5" max="90" value="${P.limitMin || 25}"></div>
        <div class="set"><label for="pFocus">Focus on a skill</label><select id="pFocus"><option value="">Choose a skill</option>${focusOpts}</select><button class="mini" id="pFocusAdd" type="button">Add focus</button></div>
        ${st.focus.length ? `<ul>${st.focus.map((id, i) => `<li>Focus: ${esc(M.map[id] ? M.map[id].name : id)} <button class="mini" type="button" data-unfocus="${i}">Remove</button></li>`).join("")}</ul>` : "<p>No focus skills. The game chooses by itself.</p>"}
        ${parked.length ? `<ul>${parked.map(id => `<li>Resting: ${esc(M.map[id].name)} <button class="mini" type="button" data-unpark="${esc(id)}">Bring back now</button></li>`).join("")}</ul>` : ""}
        <div class="set">${placeAsk ? `<span>Run the first level check again? Learnt skills stay, but will be checked again.</span><button class="mini" id="pPlaceYes" type="button">Yes, check again</button><button class="mini" id="pPlaceNo" type="button">No</button>` : `<button class="mini" id="pPlace" type="button">Run the level check again</button>`}</div></section>
      <section><h3>Send your own questions</h3>
        <p>Write one question on each line, then an equals sign, then the answer. For example: How many legs do 3 cats have? = 12. They come first in the next session.</p>
        <label for="pQs">Questions</label><textarea id="pQs" rows="4" style="width:100%"></textarea>
        <div class="set"><button class="mini" id="pQsAdd" type="button">Send questions</button><span id="pQsMsg" aria-live="polite"></span></div>
        <h4>Waiting (${st.parentQs.length})</h4>${waiting ? `<ul>${waiting}</ul>` : "<p>None waiting.</p>"}
        <h4>Answered lately</h4>${answeredQs ? `<ul>${answeredQs}</ul>` : "<p>None yet.</p>"}</section>
      <section><h3>Voice and sound</h3>
        <div class="set"><input id="voiceChk" type="checkbox"${P.voice ? " checked" : ""}><label for="voiceChk">Read questions out loud</label></div>
        <div class="set"><input id="soundChk" type="checkbox"${P.sound ? " checked" : ""}><label for="soundChk">Sounds</label></div>
        <div class="set"><label for="voiceSel">${esc(name)}'s voice</label><select id="voiceSel"><option value="">Best voice on this device (automatic)</option>${englishVoices().map(v => `<option value="${esc(v.name)}"${P.voiceName === v.name ? " selected" : ""}>${esc(v.name)} (${esc(v.lang)})</option>`).join("")}</select><button class="mini" id="voiceTry" type="button">Try it</button></div>
        <p>Now using: ${esc(kittyVoice ? kittyVoice.name : "no voice found")}. For a more natural voice on iPad: open Settings, then Accessibility, then Spoken Content, then Voices, then English, and download a voice marked Premium or Enhanced. For Marie try Ava; for Kennedy try Daniel or Arthur. The game then picks it by itself.</p></section>
      <section><h3>Daily email and backup</h3><p>${esc(KidsSync.status())}</p>
        ${KidsSync.connected() ? `<div class="set"><button class="mini" id="pSyncNow" type="button">Save to Google now</button><button class="mini" id="pMailPreview" type="button">Show today's email</button></div><pre id="pMail" style="white-space:pre-wrap"></pre>`
          : `<div class="set"><label for="pCode">Setup code (starts with KM1)</label><input id="pCode" autocomplete="off" style="width:100%"><button class="mini" id="pCodeOk" type="button">Connect</button></div><p id="pCodeMsg" aria-live="polite"></p>`}</section>
      <section><h3>Start again</h3><div class="set">${resetAsk ? `<span>Erase all of ${esc(name)}'s progress, rewards and history?</span><button class="mini" id="resetYes" type="button">Yes, erase everything</button><button class="mini" id="resetNo" type="button">Keep it</button>` : `<button class="mini" id="resetBtn" type="button">Erase ${esc(name)}'s progress</button>`}</div></section>
      <section><h3>Pictures</h3><p>Characters and drawings are our own, for private family use only. Pictures: Microsoft Fluent Emoji (MIT License). Home pictures: Tiny Treats by Isa Lousberg (CC0) and Microsoft Fluent Emoji (MIT).</p></section>`;

    const $e = s => el.querySelector(s), redo = () => render(el);
    el.querySelectorAll("[data-child]").forEach(b => b.onclick = () => startAs(b.dataset.child, "grown"));
    $e("#pPause").onchange = e => { st.paused = e.target.checked; save(); redo(); };
    $e("#pSpeed").onchange = e => { st.factGoalMs = +e.target.value * 1000; save(); redo(); };
    if ($e("#pKSpeed")) $e("#pKSpeed").onchange = e => { st.kennedySpeed = e.target.checked; save(); redo(); };
    $e("#pLimit").onchange = e => { const v = Math.max(5, Math.min(90, parseInt(e.target.value, 10) || 25)); P.limitMin = v; save(); redo(); };
    $e("#pFocusAdd").onclick = () => { const v = $e("#pFocus").value; if (v && !st.focus.includes(v)) { st.focus.push(v); save(); } redo(); };
    el.querySelectorAll("[data-unfocus]").forEach(b => b.onclick = () => { st.focus.splice(+b.dataset.unfocus, 1); save(); redo(); });
    el.querySelectorAll("[data-unpark]").forEach(b => b.onclick = () => { const s = st.skills[b.dataset.unpark]; if (s) { s.parkedUntil = 0; s.parkedNote = false; } save(); redo(); });
    if (placeAsk) {
      $e("#pPlaceYes").onclick = () => { st.place = KidsEngine.createState(who).place; Object.values(st.skills).forEach(s => { if (s.lvl >= 3) s.due = Date.now(); }); placeAsk = false; save(); redo(); };
      $e("#pPlaceNo").onclick = () => { placeAsk = false; redo(); };
    } else $e("#pPlace").onclick = () => { placeAsk = true; redo(); };
    $e("#pQsAdd").onclick = () => {
      const lines = $e("#pQs").value.split("\n").map(l => l.trim()).filter(Boolean), bad = [];
      lines.forEach(l => { const k = l.lastIndexOf("="); const q = k > 0 ? l.slice(0, k).trim() : "", a = k > 0 ? l.slice(k + 1).trim() : ""; if (q && a) st.parentQs.push({ q, a }); else bad.push(l); });
      st.parentQs = st.parentQs.slice(0, 20); save(); redo();
      el.querySelector("#pQsMsg").textContent = bad.length ? `${lines.length - bad.length} sent. ${bad.length} line(s) had no equals sign and were not sent.` : `${lines.length} sent.`;
    };
    el.querySelectorAll("[data-delq]").forEach(b => b.onclick = () => { st.parentQs.splice(+b.dataset.delq, 1); save(); redo(); });
    if (KidsSync.connected()) {
      $e("#pSyncNow").onclick = async () => { await KidsSync.now(); redo(); };
      $e("#pMailPreview").onclick = () => { const d = (P.days || {})[KidsEngine.dayKey(Date.now())]; $e("#pMail").textContent = d && d.n ? KidsSync.summary().text : "No play today, so no email today."; };
    } else $e("#pCodeOk").onclick = () => { if (KidsSync.setCode($e("#pCode").value)) redo(); else $e("#pCodeMsg").textContent = "That code does not look right. It starts with KM1 and has no spaces."; };
    $e("#voiceChk").onchange = e => { P.voice = e.target.checked; if (!P.voice) try { speechSynthesis.cancel(); } catch (x) {} save(); };
    $e("#soundChk").onchange = e => { P.sound = e.target.checked; save(); };
    const sample = () => speak(who === "kennedy" ? "Hello, brave knight! Let's send the bad guys home." : "Hello Marie! Let's do some maths in the cafe.", true);
    $e("#voiceSel").onchange = e => { P.voiceName = e.target.value; kittyVoice = pickVoice(); save(); sample(); redo(); };
    $e("#voiceTry").onclick = sample;
    if (resetAsk) {
      $e("#resetYes").onclick = () => { adopt({ voice: P.voice, sound: P.sound, limitMin: P.limitMin }); resetAsk = false; save(); if (window.HomeGame) HomeGame.refresh(); redo(); };
      $e("#resetNo").onclick = () => { resetAsk = false; redo(); };
    } else $e("#resetBtn").onclick = () => { resetAsk = true; redo(); };
  }
  window.ParentArea = { render };
})();
