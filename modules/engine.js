/* engine.js - the Kids Maths learning engine (19 Oct 2026).
   It picks every question. The children never choose a topic.
   Pure logic on a plain JSON state: no screen, no clock of its own (the caller passes "now"), no random of its own
   (the caller passes "rng"), so it runs the same in the browser and in Node tests.
   Design: C:\Family Office\16_kids_maths\kids_maths_design.md, sections 3.1 to 3.7. */
(function (root) {
  "use strict";
  const DAY = 864e5;
  const GAPS = [1, 3, 7, 14, 30, 60, 120];            // review gaps in days (design 3.7)
  const LV = { UNSEEN: 0, SHOWN: 1, PRACTISING: 2, KNOWS: 3, SURE: 4, QUICK: 5 };
  const PROFILE_RULES = {
    marie: { streakNeed: 4, dailyCap: 12, reviewMax: 4, startGrade: 2, target: .75 },
    kennedy: { streakNeed: 3, dailyCap: 8, reviewMax: 4, startGrade: 0, target: .8 },
    demo: { streakNeed: 4, dailyCap: 12, reviewMax: 4, startGrade: 2, target: .75 }
  };
  // Placement groups, in the fixed order of design 3.4, with the most questions each may use.
  const GROUPS = [
    { id: "count", name: "Counting and place value", max: 6 },
    { id: "add", name: "Adding and taking away", max: 6 },
    { id: "times", name: "Times and sharing", max: 6 },
    { id: "fractions", name: "Fractions", max: 5 },
    { id: "money_time", name: "Money and time", max: 5 },
    { id: "shapes", name: "Shapes, measuring, graphs and patterns", max: 3 }
  ];
  const PLACE_MAX = 35;

  /* ---------- The skill map ----------
     Each playable level of each game is one skill. Skills from the Sums screen and the new Grade 4 games are added.
     A skill with ready:false has no game yet; the engine never picks it, and the parent view lists it as "coming". */
  const SUMS = [
    ["sums.1", "Adding to 10", 1], ["sums.2", "Taking away within 10", 1], ["sums.3", "Adding to 20", 1],
    ["sums.4", "Taking away within 20", 1], ["sums.5", "Tens and ones", 2], ["sums.6", "Two digits, no trading", 2],
    ["sums.7", "Two digits with trading", 2], ["sums.8", "Three digits, no trading", 3], ["sums.9", "Three digits with trading", 3]
  ];
  const SUMS_NEEDS = {
    "sums.1": ["count_quick.1"], "sums.2": ["sums.1"], "sums.3": ["sums.1", "count_quick.3"], "sums.4": ["sums.2", "sums.3"],
    "sums.5": ["place_value.0"], "sums.6": ["sums.3", "sums.5"], "sums.7": ["sums.6"], "sums.8": ["sums.6", "place_value.2"], "sums.9": ["sums.7", "sums.8"]
  };
  // The first level of a game needs these skills first (links between games).
  const TOPIC_NEEDS = {
    count_quick: ["kinder.1"], place_value: ["count_quick.2"], compare_numbers: ["count_quick.1"], skip_count: ["count_quick.1"], odd_even: ["skip_count.0"],
    estimate: ["compare_numbers.1"], equal_groups: ["skip_count.1", "sums.3"], arrays: ["equal_groups.0"],
    share_equally: ["equal_groups.0"], balance: ["sums.1"], fact_family: ["sums.4"],
    times_facts: ["arrays.1", "skip_count.1", "fact_family.1"], times_chant: ["skip_count.1"]
  };
  const STRAND_GROUP = { Number: "count", Operations: "times", Money: "money_time", Fractions: "fractions" };
  const TOPIC_GROUP = { clock: "money_time", calendar: "money_time", time_units: "money_time", balance: "add", fact_family: "add" };
  // Grade 4 skills whose games come in a later phase (design 3.1). Order of tables: 2, 10, 5, 4, 3, 9, 6, 8, 7.
  // Skills whose games are not built yet go here as [id, name, grade, group, needs]; the engine skips them.
  const LATER = [];

  function buildSkillMap(topics, extra) {
    const map = {}, order = [];
    const add = s => { map[s.id] = s; order.push(s.id); };
    SUMS.forEach(([id, name, grade], i) => add({ id, name, grade, group: "add", needs: SUMS_NEEDS[id] || [], play: { src: "sums", level: i + 1 }, ready: true }));
    (topics || []).forEach(t => {
      if (!t || !t.id || !Array.isArray(t.levels)) return;
      t.levels.forEach((l, i) => {
        const id = `${t.id}.${i}`;
        const needs = i ? [`${t.id}.${i - 1}`] : (TOPIC_NEEDS[t.id] || []);
        add({ id, name: `${t.title}: ${l.name}`, grade: Number.isFinite(Number(l.grade)) ? Number(l.grade) : 1, group: TOPIC_GROUP[t.id] || STRAND_GROUP[t.strand] || "shapes",
          needs, play: { src: "topic", topic: t.id, level: i }, ready: true });
      });
    });
    LATER.forEach(([id, name, grade, group, needs]) => add({ id, name, grade, group, needs, play: { src: "later" }, ready: false }));
    (extra || []).forEach(add);
    // A need that points to a skill that does not exist is dropped, so one missing game cannot lock the map.
    order.forEach(id => { map[id].needs = map[id].needs.filter(n => map[n]); });
    return { map, order };
  }

  /* ---------- State ---------- */
  function createState(profile) {
    return { v: 1, profile, skills: {}, sets: [], place: { done: false, group: 0, pos: -1, asked: 0, inGroup: 0, missRow: 0, best: {} },
      parentQs: [], paused: false, focus: [], day: "", dayCounts: {} };
  }
  function sk(st, id) { return st.skills[id] || (st.skills[id] = { lvl: 0, streak: 0, n: 0, right: 0, recent: [], due: 0, gap: 0, recheck: null, stuckN: 0, stuckRight: 0, repairs: 0, parkedUntil: 0, first2: [] }); }
  const dayKey = now => new Date(now).toISOString().slice(0, 10);
  const rules = st => PROFILE_RULES[st.profile] || PROFILE_RULES.marie;

  /* ---------- Placement (design 3.4) ---------- */
  function groupList(M, gid) { return M.order.filter(id => M.map[id].ready && M.map[id].group === gid).sort((a, b) => M.map[a].grade - M.map[b].grade || M.order.indexOf(a) - M.order.indexOf(b)); }
  function placementNext(st, M) {
    const P = st.place;
    while (!P.done) {
      if (P.asked >= PLACE_MAX || P.group >= GROUPS.length) { finishPlacement(st, M); return null; }
      const g = GROUPS[P.group], list = groupList(M, g.id);
      const skipGroup = !list.length || (st.profile === "kennedy" && g.id !== "count" && g.id !== "add" && g.id !== "shapes");
      if (skipGroup || P.inGroup >= g.max || P.missRow >= 2) { P.group++; P.pos = -1; P.inGroup = 0; P.missRow = 0; continue; }
      if (P.pos < 0) { const start = list.findIndex(id => M.map[id].grade >= rules(st).startGrade); P.pos = start < 0 ? list.length - 1 : start; }
      P.pos = Math.max(0, Math.min(list.length - 1, P.pos));
      return { skill: list[P.pos], mode: "place", group: g.id };
    }
    return null;
  }
  function placementRecord(st, M, skillId, correct) {
    const P = st.place, g = GROUPS[P.group], list = groupList(M, g.id);
    P.asked++; P.inGroup++;
    if (correct) { P.missRow = 0; P.best[g.id] = Math.max(P.best[g.id] ?? -1, list.indexOf(skillId)); P.pos = Math.min(list.length - 1, P.pos + 2); }
    else { P.missRow++; P.pos = Math.max(0, P.pos - 1); }
    if (P.pos === list.length - 1 && correct && P.best[g.id] === list.length - 1) P.inGroup = g.max;   // top of this group reached
  }
  function finishPlacement(st, M, now) {
    const P = st.place; P.done = true;
    const t = now || Date.now();
    GROUPS.forEach(g => {
      const list = groupList(M, g.id), best = P.best[g.id] ?? -1;
      // Every skill below the highest right answer is a first guess at "knows it", checked soon with 2 quick questions.
      for (let i = 0; i < best; i++) { const s = sk(st, list[i]); if (s.lvl < LV.KNOWS) { s.lvl = LV.KNOWS; s.quick = true; s.due = t + DAY * (1 + (i % 3)); s.gap = 0; } }
    });
  }

  /* ---------- Choosing the next set of 5 (design 3.5) ---------- */
  const strong = (st, id) => (st.skills[id] ? st.skills[id].lvl : 0) >= LV.KNOWS;
  function isReady(st, M, id, now) {
    const s = M.map[id];
    return s.ready && (st.skills[id]?.lvl || 0) < LV.KNOWS && !(st.skills[id]?.parkedUntil > now) && s.needs.every(n => strong(st, n));
  }
  function cappedToday(st, id) { return (st.dayCounts[id] || 0) >= rules(st).dailyCap; }
  // Stuck: at least 10 tries since the last repair, and fewer than 3 clean right in the last 10 (lucky guesses do not hide it).
  function stuck(s) { return s.stuckN >= 10 && s.recent.slice(-10).reduce((a, b) => a + b, 0) < 3; }
  function acc(s) { return s.recent.length ? s.recent.reduce((a, b) => a + b, 0) / s.recent.length : 1; }

  function nextSet(st, M, now, rng) {
    rng = rng || Math.random;
    if (st.paused) return { kind: "paused", items: [] };
    if (st.parentQs.length) return { kind: "parent", items: st.parentQs.slice(0, 5) };   // the parents' own questions come first
    if (!st.place.done) { const q = placementNext(st, M); if (q) return { kind: "place", target: q.skill, items: [q.skill] }; }
    if (st.day !== dayKey(now)) { st.day = dayKey(now); st.dayCounts = {}; }
    const recent = st.sets.slice(-10).map(k => k.split(":")[0]), reviewsLately = recent.filter(k => k === "review" || k === "recheck").length;
    const usable = id => M.map[id] && M.map[id].ready && !cappedToday(st, id) && !(st.skills[id]?.parkedUntil > now);
    const learnt = M.order.filter(id => strong(st, id) && usable(id));
    const filler = (exclude, n) => pickSome(learnt.filter(id => !exclude.includes(id)), n, rng);
    const left = id => rules(st).dailyCap - (st.dayCounts[id] || 0);
    const make = (kind, target, n) => { n = Math.max(1, Math.min(n, left(target))); const items = Array(n).fill(target).concat(filler([target], 5 - n)); while (items.length < 5 && items.filter(x => x === target).length < left(target)) items.push(target); return finish(st, kind, target, shuffleKeepFirst(items, rng)); };

    // 2. Re-checks and reviews: never more than 4 sets in 10, oldest first.
    const due = M.order.filter(id => usable(id) && strong(st, id) && st.skills[id].due && st.skills[id].due <= now).sort((a, b) => st.skills[a].due - st.skills[b].due);
    if (due.length && reviewsLately < rules(st).reviewMax) {
      const kind = st.skills[due[0]].lvl === LV.KNOWS && !st.skills[due[0]].quick ? "recheck" : "review";
      if (kind === "recheck") return make("recheck", due[0], 5);   // "knows it for sure" needs 4 right of 5 on that one skill
      const items = due.slice(0, 5); while (items.length < 5) items.push(...filler(items, 1).concat(due[0]).slice(0, 1));
      return finish(st, kind, due[0], items);
    }

    // 3. A stuck skill is never just repeated: teach the skill under it, at most 2 rounds, then park it for 14 days.
    for (const id of M.order) {
      const s = st.skills[id]; if (!s || !usable(id) || s.lvl >= LV.KNOWS || !stuck(s)) continue;
      if (s.repairs >= 2) { s.parkedUntil = now + 14 * DAY; s.repairs = 0; s.stuckN = 0; s.stuckRight = 0; s.parkedNote = true; continue; }
      s.repairs++; s.stuckN = 0; s.stuckRight = 0;
      const under = M.map[id].needs.filter(usable).sort((a, b) => (st.skills[a]?.lvl || 0) - (st.skills[b]?.lvl || 0))[0];
      if (under) { sk(st, under).due = now; return make("repair", under, 5); }
    }

    // 4. Parent focus skills, then weak skills, then a skill already being learnt.
    const focus = st.focus.find(id => usable(id) && (st.skills[id]?.lvl || 0) < LV.KNOWS && M.map[id].needs.every(n => strong(st, n)));
    if (focus) return make("focus", focus, (st.skills[focus]?.lvl || 0) < LV.PRACTISING ? 5 : 3);
    const learning = M.order.filter(id => usable(id) && st.skills[id] && st.skills[id].lvl >= LV.SHOWN && st.skills[id].lvl < LV.KNOWS);
    const weak = learning.find(id => st.skills[id].recent.length >= 5 && acc(st.skills[id]) < .7);
    if (weak) return make("weak", weak, 3);
    if (learning.length) { const id = learning[0]; return make("learn", id, st.skills[id].lvl < LV.PRACTISING ? 5 : 3); }

    // 5. A new skill, from the group that is furthest behind; one group never fills more than 2 sets in a row.
    const lastGroups = st.sets.slice(-2).map(k => k.split(":")[1]);
    const ready = M.order.filter(id => usable(id) && isReady(st, M, id, now));
    if (ready.length) {
      const behind = gid => { const ids = M.order.filter(id => M.map[id].group === gid && M.map[id].ready); return ids.reduce((a, id) => a + (st.skills[id]?.lvl || 0), 0) / Math.max(1, ids.length); };
      const blocked = lastGroups.length === 2 && lastGroups[0] === lastGroups[1] ? lastGroups[0] : null;
      const cands = ready.filter(id => M.map[id].group !== blocked);
      const pool = cands.length ? cands : ready;
      pool.sort((a, b) => behind(M.map[a].group) - behind(M.map[b].group) || M.map[a].grade - M.map[b].grade || M.order.indexOf(a) - M.order.indexOf(b));
      const placedGrade = Math.max(0, ...M.order.filter(id => st.skills[id]?.quick || (st.skills[id]?.lvl || 0) >= LV.SURE).map(id => M.map[id].grade));
      const easy = pool.filter(id => M.map[id].grade < placedGrade && !st.skills[id]?.n);
      if (easy.length >= 2) { const pick = easy.slice(0, 3), items = [pick[0], pick[0], pick[1], pick[1]].concat(pick[2] || pick[0]); return finish(st, "sweep", pick[0], items); }
      return make("new", pool[0], 5);
    }
    // 6. Nothing new is open: a mixed challenge of known skills (reviews early count as practice).
    if (learnt.length) { const items = pickSome(learnt, 5, rng); return finish(st, "challenge", items[0], items); }
    return { kind: "empty", items: [] };
  }
  function finish(st, kind, target, items) {
    st.sets.push(kind + ":" + ((st._M && st._M.map[target]) ? st._M.map[target].group : ""));
    if (st.sets.length > 40) st.sets = st.sets.slice(-40);
    return { kind, target, items };
  }
  function pickSome(arr, n, rng) { const a = arr.slice(), out = []; while (a.length && out.length < n) out.push(a.splice(Math.floor(rng() * a.length), 1)[0]); return out; }
  function shuffleKeepFirst(items, rng) { const [f, ...r] = items; for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return [f, ...r]; }

  /* ---------- Recording one answer (design 3.2, 3.3, 3.6, 3.7) ----------
     r = { skill, correct, helped (a hint or lesson was used), rush (wrong in under 1.5 s), taught (lesson ran) } */
  function record(st, M, r, now) {
    const s = sk(st, r.skill), R = rules(st);
    if (st.day !== dayKey(now)) { st.day = dayKey(now); st.dayCounts = {}; }
    st.dayCounts[r.skill] = (st.dayCounts[r.skill] || 0) + 1;
    if (r.rush) return s;                               // a rush earns nothing and changes nothing
    const clean = r.correct && !r.helped;
    s.n++; if (clean) s.right++;
    s.recent = s.recent.concat(clean ? 1 : 0).slice(-10);
    s.stuckN++; if (clean) s.stuckRight++;
    if (s.lvl === LV.UNSEEN) s.lvl = r.taught || !clean ? LV.SHOWN : LV.PRACTISING;
    if (s.lvl === LV.SHOWN && clean) s.lvl = LV.PRACTISING;
    // Partial credit: a clean answer pushes the reviews of the skills under it a little later; a miss brings them sooner.
    M.map[r.skill]?.needs.forEach(n => { const u = st.skills[n]; if (u && u.lvl >= LV.KNOWS && u.due) u.due += clean ? DAY / 2 : -DAY / 2; });

    if (s.lvl < LV.KNOWS) {
      if (s.first2.length < 2) s.first2.push(clean ? 1 : 0);
      s.streak = clean ? s.streak + 1 : 0;
      const fast = s.first2.length === 2 && s.first2[0] && s.first2[1] && s.n === 2;
      if (fast || s.streak >= R.streakNeed) { s.lvl = LV.KNOWS; s.learntAt = now; s.streak = 0; s.gap = 0; s.due = now + (fast ? 3 : 1) * DAY; s.stuckN = 0; s.stuckRight = 0; s.repairs = 0; }
      return s;
    }
    // Known skill: only answers given when it is due count as a review or a re-check.
    if (!(s.due && s.due <= now)) return s;
    if (s.quick) {                                      // placement guess: 2 right keeps it, a miss means a full re-check
      s.qk = (s.qk || []).concat(clean ? 1 : 0);
      if (!clean) { s.quick = false; s.qk = null; s.lvl = LV.PRACTISING; s.streak = 0; s.recent = []; s.due = 0; }
      else if (s.qk.length >= 2) { s.quick = false; s.qk = null; s.lvl = LV.SURE; s.gap = 1; s.due = now + GAPS[1] * DAY; }
      return s;
    }
    if (s.lvl === LV.KNOWS) {                           // re-check for "knows it for sure": 4 right of 5
      s.recheck = (s.recheck || []).concat(clean ? 1 : 0);
      const rightN = s.recheck.reduce((a, b) => a + b, 0), wrongN = s.recheck.length - rightN;
      if (rightN >= 4) { s.lvl = LV.SURE; s.sureAt = now; s.recheck = null; s.gap = 1; s.due = now + GAPS[1] * DAY; }
      else if (wrongN >= 2) { s.lvl = LV.PRACTISING; s.recheck = null; s.streak = 0; s.recent = []; s.due = 0; }
      return s;
    }
    if (clean) { s.gap = Math.min(GAPS.length - 1, s.gap + 1); s.due = now + GAPS[s.gap] * DAY; }
    else { s.lvl = Math.max(LV.KNOWS, s.lvl - 1); s.gap = 0; s.due = now + DAY; if (s.lvl === LV.KNOWS) s.recheck = []; }
    return s;
  }

  /* ---------- Report for the parent ---------- */
  const LV_NAME = ["Not seen", "Shown", "Practising", "Knows it", "Knows it for sure", "Quick at it"];
  function report(st, M, now) {
    const rows = M.order.filter(id => st.skills[id] && st.skills[id].n).map(id => {
      const s = st.skills[id];
      return { id, name: M.map[id].name, grade: M.map[id].grade, level: LV_NAME[s.lvl], answered: s.n, clean: s.right,
        parked: s.parkedUntil > now, due: s.due && s.due <= now };
    });
    const parked = rows.filter(r => r.parked).map(r => r.name);
    const known = M.order.filter(id => strong(st, id)).length;
    const coming = M.order.filter(id => !M.map[id].ready).map(id => M.map[id].name);
    return { rows, parked, known, total: M.order.filter(id => M.map[id].ready).length, coming, placementDone: st.place.done };
  }

  const api = { LV, GROUPS, GAPS, DAY, buildSkillMap, createState, placementNext, placementRecord, finishPlacement, nextSet, record, report, dayKey };
  // nextSet labels sets by group; give it the map so finish() can read groups.
  const wrap = fn => (st, M, ...a) => { Object.defineProperty(st, "_M", { value: M, enumerable: false, configurable: true, writable: true }); return fn(st, M, ...a); };
  api.nextSet = wrap(nextSet);
  if (typeof module === "object" && module.exports) module.exports = api; else root.KidsEngine = api;
})(typeof window !== "undefined" ? window : globalThis);
