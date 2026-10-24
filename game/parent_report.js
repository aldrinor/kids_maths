/* ParentReport: plain-words facts for a grown-up, built from a child's save and answer log (plan item 11).
 * Pure functions: no screen, no storage, no clock of their own. Everything is written to be read aloud once and understood.
 *
 *   ParentReport.topWrong(entries, M, { now, days, skills, perSkill })   the most common wrong answers, skill by skill
 *   ParentReport.weekly(child, now)                                      one plain paragraph about the last 7 days
 *   ParentReport.sections(children, now)                                 [{ title, lines[] }] for the screen and the text file
 *   ParentReport.text(children, now)                                     the same as one plain-text file
 *
 * child = { who, name, save (the child's save), entries (answer log), M (skill map), engine (KidsEngine), missLabel (MissStudy.label) }
 */
(function (root) {
  "use strict";
  const DAY = 864e5;
  const pl = (n, w, many) => `${n} ${n === 1 ? w : many || w + "s"}`;
  const pct = (a, b) => (b ? Math.round(a / b * 100) : 0);
  const isObj = v => v !== null && typeof v === "object" && !Array.isArray(v);
  const nameOfSkill = (M, id) => (M && M.map && M.map[id] ? M.map[id].name : id);
  const within = (entries, now, days) => entries.filter(e => e.t >= now - days * DAY && e.t <= now + DAY);
  const dateWords = t => new Date(t).toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" });

  /* what a grown-up can do about each kind of miss (plain, short) */
  const TIPS = {
    copied: "Ask the child to read the question out loud and say what the number in the story is for.",
    wrong_op: "Ask the child to say the sign out loud before answering: plus puts together, minus takes away.",
    place_value: "Talk about tens and ones: in 47 the 4 is four tens and the 7 is seven ones.",
    slip: "These are small counting slips. Counting one hop at a time on the number line helps.",
    guess: "These answers have no pattern. Ask the child to explain how they got the answer, or to use the hint picture.",
    choice_near: "These are taps on a close answer. Count together, slowly, then tap.",
    choice_far: "These are taps on an answer far away. Look at the picture in the question together.",
    wrong_end: "The child tapped the other end: the least when asked for the most. Ask her to say the question word out loud, more or less, before tapping.",
    last_digit: "Even or odd is told by the last digit only. Say it together: 0, 2, 4, 6 and 8 are even. 1, 3, 5, 7 and 9 are odd."
  };

  function classCounts(list) {
    const out = {};
    list.forEach(e => { if (!e.ok && e.c) out[e.c] = (out[e.c] || 0) + 1; });
    return out;
  }

  function topWrong(entries, M, o) {
    o = o || {};
    const now = o.now || Date.now(), list = within(entries, now, o.days || 30).filter(e => e.s !== "parent");
    const by = {};
    list.forEach(e => {
      const b = by[e.s] || (by[e.s] = { skill: e.s, total: 0, misses: 0, given: {}, list: [] });
      b.total++;
      if (!e.ok) { b.misses++; b.list.push(e); const g = b.given[e.g] || (b.given[e.g] = { given: e.g, count: 0, example: e.q }); g.count++; }
    });
    return Object.values(by).filter(b => b.misses > 0).sort((a, b) => b.misses - a.misses).slice(0, o.skills || 5).map(b => ({
      skill: b.skill, name: nameOfSkill(M, b.skill), total: b.total, misses: b.misses,
      wrong: Object.values(b.given).sort((x, y) => y.count - x.count || String(x.given).localeCompare(String(y.given))).slice(0, o.perSkill || 3),
      classes: classCounts(b.list)
    }));
  }

  function median(xs) { if (!xs.length) return 0; const a = xs.slice().sort((x, y) => x - y), m = Math.floor(a.length / 2); return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2; }

  /* facts about the last 7 days, from the save (days) and the log (entries) */
  function weekFacts(child, now) {
    const P = child.save || {}, days = isObj(P.days) ? P.days : {}, E = child.engine;
    let n = 0, clean = 0, ms = 0, played = 0, sets = 0, breaks = 0, breakMs = 0;
    for (let i = 0; i < 7; i++) {
      const d = days[E.dayKey(now - i * DAY)];
      if (d) { breaks += d.breaks || 0; breakMs += d.breakMs || 0; }
      if (d && d.n) { played++; n += d.n; clean += d.clean || 0; ms += d.ms || 0; sets += d.sets || 0; }
    }
    const week = within(child.entries || [], now, 7).filter(e => e.s !== "parent");
    const misses = week.filter(e => !e.ok), classes = classCounts(misses);
    const hints = week.filter(e => e.h >= 1).length, deepHints = week.filter(e => e.h >= 3).length;
    const typical = Math.round(median(week.map(e => e.ms)) / 1000);
    const st = P.engine || {}, learnt = [];
    if (isObj(st.skills)) for (const id of Object.keys(st.skills)) if (st.skills[id] && st.skills[id].learntAt >= now - 7 * DAY && st.skills[id].lvl >= 3) learnt.push(nameOfSkill(child.M, id));
    const parked = [];
    if (isObj(st.skills)) for (const id of Object.keys(st.skills)) if (st.skills[id] && st.skills[id].parkedUntil > now) parked.push(nameOfSkill(child.M, id));
    return { n, clean, ms, played, sets, breaks, breakMs, week, misses, classes, hints, deepHints, typical, learnt, parked };
  }

  function weekly(child, now) {
    const f = weekFacts(child, now), name = child.name;
    if (!f.n) return `${name} has not played in the last 7 days.`;
    const parts = [];
    parts.push(`In the last 7 days ${name} played on ${pl(f.played, "day")} and answered ${pl(f.n, "question")}, about ${Math.max(1, Math.round(f.ms / 60000))} minutes in all.`);
    parts.push(`${pct(f.clean, f.n)} out of 100 were right the first time.`);
    if (f.typical) parts.push(`A typical answer took about ${f.typical} seconds.`);
    if (f.misses.length) {
      const top = Object.entries(f.classes).sort((a, b) => b[1] - a[1])[0];
      if (top && child.missLabel) parts.push(`Most wrong answers ${child.missLabel(top[0]) ? "were where " + name + " " + child.missLabel(top[0]) : "had no clear pattern"} (${top[1]} of ${f.misses.length}).`);
    } else parts.push("There were no wrong answers.");
    if (f.hints) parts.push(`${name} used a hint on ${pl(f.hints, "question")}, and the worked step on ${f.deepHints}.`);
    if (f.breaks) parts.push(`${name} asked for a break ${pl(f.breaks, "time")}${f.breakMs >= 60000 ? ", about " + Math.round(f.breakMs / 60000) + " minutes in all" : ""}. Asking for a break is a good thing to do.`);
    if (f.learnt.length) parts.push(`New skills reached "Knows it": ${f.learnt.slice(0, 4).join(", ")}.`);
    if (f.parked.length) parts.push(`Resting for now because they were hard: ${f.parked.slice(0, 3).join(", ")}.`);
    return parts.join(" ");
  }

  function levelLines(child, now) {
    const lines = [];
    try {
      const rep = child.engine.report(child.save.engine, child.M, now);
      lines.push(`${pl(rep.known, "skill")} marked "Knows it" or better.`);
      if (!rep.placementDone) lines.push("The first level check is not finished yet. It carries on in the next sessions.");
      const learning = rep.rows.filter(r => r.level === "Practising" || r.level === "Shown").slice(0, 6);
      if (learning.length) lines.push(`Working on now: ${learning.map(r => r.name).join("; ")}.`);
    } catch (e) { lines.push("The skill levels could not be read from the save."); }
    return lines;
  }

  function masteryLines(child) {
    const bkt = child.save && child.save.game && isObj(child.save.game.bkt) ? child.save.game.bkt : {};
    const rows = Object.entries(bkt).filter(([, p]) => Number.isFinite(p)).sort((a, b) => a[1] - b[1]).slice(0, 4);
    if (!rows.length) return [];
    return [`Skills where the game is least sure the child knows them: ${rows.map(([id, p]) => `${nameOfSkill(child.M, id)} (${Math.round(p * 100)} in 100)`).join("; ")}.`];
  }

  function sections(children, now) {
    const out = [{ title: "Kids Maths report", lines: [`Made on ${dateWords(now)}.`, "This is read from the saved progress on this device."] }];
    for (const child of children) {
      const sec = { title: child.name, lines: [] };
      if (!child.save) { sec.lines.push(`No saved progress was found for ${child.name} on this device.`); out.push(sec); continue; }
      sec.lines.push(weekly(child, now));
      sec.lines.push(...levelLines(child, now), ...masteryLines(child));
      out.push(sec);
      const tw = topWrong(child.entries || [], child.M, { now, days: 30 });
      const ws = { title: `${child.name}: the most common wrong answers, last 30 days`, lines: [] };
      if (!tw.length) ws.lines.push(child.entries && child.entries.length ? "No wrong answers in the last 30 days." : "No answers have been recorded yet. The record starts with the next play.");
      tw.forEach(b => {
        ws.lines.push(`${b.name}: ${b.misses} wrong out of ${pl(b.total, "answer")}.`);
        b.wrong.forEach(w => ws.lines.push(`   ${child.name} gave ${w.given === null ? "no number" : w.given} ${pl(w.count, "time")}, for example for ${w.example}.`));
        const cs = Object.entries(b.classes).sort((x, y) => y[1] - x[1]);
        if (cs.length && child.missLabel) ws.lines.push(`   Kinds of mistake: ${cs.map(([c, k]) => `${child.missLabel(c) || c} (${k})`).join("; ")}.`);
      });
      out.push(ws);
      const all = classCounts(within(child.entries || [], now, 30));
      const top = Object.entries(all).sort((a, b) => b[1] - a[1])[0];
      if (top && TIPS[top[0]]) out.push({ title: `${child.name}: what you can do`, lines: [TIPS[top[0]]] });
    }
    return out;
  }

  function text(children, now) {
    return sections(children, now).map(s => `${s.title}\n${s.lines.join("\n")}`).join("\n\n") + "\n";
  }

  const api = { TIPS, topWrong, weekly, weekFacts, sections, text, classCounts };
  if (typeof module === "object" && module.exports) module.exports = api; else root.ParentReport = api;
})(typeof window !== "undefined" ? window : globalThis);
