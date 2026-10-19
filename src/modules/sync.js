/* sync.js - backup to the family's Google script, and the text of the daily email (19 Oct 2026).
   The page holds no secret: each device is connected once in the Parent area with a setup code (KM1:...).
   Without it, everything still works and is saved on this device only. */
(function () {
  "use strict";
  const CFG = "kidsMaths.sync";
  let cfg = null, lastOk = "", lastErr = "", timer = 0;
  try { cfg = JSON.parse(localStorage.getItem(CFG) || "null"); } catch (e) {}
  const pl = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;
  const pct = (a, b) => b ? Math.round(a / b * 100) : 0;

  // The daily email: plain text, most important first.
  function summary() {
    const M = Mission.map(), st = Mission.eng(), now = Date.now(), day = KidsEngine.dayKey(now), d = (P.days || {})[day];
    const name = PROFILES[who].name, nice = new Date(day + "T12:00:00").toLocaleDateString("en-CA", { weekday: "long", month: "long", day: "numeric" });
    const L = [];
    L.push(`${name} played Kids Maths today, ${nice}.`, "");
    L.push(`${pl(d.n, "answer")}, ${d.clean} right first time (${pct(d.clean, d.n)} percent).`);
    L.push(`${pl(Math.round(d.ms / 60000), "minute")} of maths, out of ${P.limitMin || 25}.`);
    L.push(who === "kennedy" ? `${pl(d.sets, "bad guy")} sent home. ${P.coins || 0} coins saved.` : `${pl(d.sets, "set")} of 5 done. ${P.stars} stars saved.`);
    const on = (id, k) => st.skills[id] && st.skills[id][k] && KidsEngine.dayKey(st.skills[id][k]) === day;
    const learnt = M.order.filter(id => on(id, "learntAt")), sure = M.order.filter(id => on(id, "sureAt"));
    if (learnt.length) L.push("", "New skills learnt today:", ...learnt.map(id => "- " + M.map[id].name));
    if (sure.length) L.push("", "Checked again and known for sure:", ...sure.map(id => "- " + M.map[id].name));
    const rows = Object.entries(d.skills || {});
    if (rows.length) L.push("", "Practised today:", ...rows.map(([id, [n, c]]) => `- ${M.map[id] ? M.map[id].name : id}: ${pl(n, "answer")}, ${c} right first time.`));
    const att = [];
    if (st.paused) att.push("Maths is paused.");
    M.order.filter(id => st.skills[id] && st.skills[id].parkedUntil > now).forEach(id => att.push(`Stuck, resting for 2 weeks: ${M.map[id].name}.`));
    M.order.filter(id => st.skills[id] && st.skills[id].lvl >= 1 && st.skills[id].lvl < 3 && st.skills[id].recent.length >= 5)
      .filter(id => st.skills[id].recent.reduce((a, b) => a + b, 0) / st.skills[id].recent.length < .7).forEach(id => att.push(`Finds this hard: ${M.map[id].name}.`));
    if (att.length) L.push("", "Needs your attention:", ...att.map(a => "- " + a));
    const pq = (P.parentLog || []).filter(q => q.day === day);
    if (pq.length) L.push("", "Your questions:", ...pq.map(q => `- ${q.q} ${q.firstTry ? "Right first time." : "Right after more tries."}`));
    const rep = KidsEngine.report(st, M, now);
    L.push("", `Skills learnt so far: ${rep.known} of ${rep.total}.`);
    if (!st.place.done) L.push(`The first level check is still running: ${st.place.asked} questions done.`);
    L.push("", "Open Kids Maths and tap Parent to see more, change settings, or send questions.");
    return { subject: `Kids Maths: ${name}, ${nice}`, text: L.join("\n") };
  }

  async function push() {
    if (!cfg || !who || who === "demo") return;
    const day = KidsEngine.dayKey(Date.now()), d = (P.days || {})[day];
    const body = { key: cfg.key, child: who, state: P };
    if (d && d.n) { const s = summary(); body.day = day; body.subject = s.subject; body.summary = s.text; }
    try {
      const r = await fetch(cfg.url, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(body) });
      const j = await r.json();
      if (j.ok) { lastOk = new Date().toLocaleTimeString("en-CA", { hour: "numeric", minute: "2-digit" }); lastErr = ""; } else lastErr = j.error || "the server said no";
    } catch (e) { lastErr = "no internet connection"; }
  }
  const KidsSync = {
    connected: () => !!cfg,
    setCode(code) {
      const m = /^KM1:(https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec)\|([A-Za-z0-9_-]{24,})$/.exec(String(code).trim());
      if (!m) return false;
      cfg = { url: m[1], key: m[2] }; try { localStorage.setItem(CFG, JSON.stringify(cfg)); } catch (e) {}
      push(); return true;
    },
    disconnect() { cfg = null; try { localStorage.removeItem(CFG); } catch (e) {} },
    soon() { if (!cfg) return; clearTimeout(timer); timer = setTimeout(push, 15000); },
    now() { clearTimeout(timer); return push(); },
    async restore(child) {
      if (!cfg) return null;
      try { const r = await fetch(`${cfg.url}?action=get&child=${encodeURIComponent(child)}&key=${encodeURIComponent(cfg.key)}`); const j = await r.json(); return j.ok ? j.state : null; } catch (e) { return null; }
    },
    summary,
    status() {
      if (!cfg) return "Not connected on this device. Progress is saved on this device only, and no email is sent.";
      return `Connected. Both parents get an email at about 9 pm on days a child plays.${lastOk ? ` Last saved to Google at ${lastOk}.` : ""}${lastErr ? ` The last save did not work: ${lastErr}. It will try again.` : ""}`;
    }
  };
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden" && cfg) push(); });
  window.KidsSync = KidsSync;
})();
