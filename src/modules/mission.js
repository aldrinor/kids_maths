/* mission.js - runs each child's maths session (19 Oct 2026).
   The engine (engine.js) picks every question; this file plays it in the right game, reports each answer back,
   gives the reward after every 5 answers, and stops at the daily time limit. The children never pick a topic.
   It uses the page's own globals: P (this child's save), who, showView, nextQuestion, startCooking, save, say, $. */
(function () {
  "use strict";
  const SET = 5, IDLE_CAP = 60000;
  let M = null, set = null, i = 0, inSet = 0, lastTouch = 0;
  const map = () => M || (M = KidsEngine.buildSkillMap(window.MathTopics || []));
  const now = () => Date.now();
  function eng() {
    if (!P.engine || P.engine.profile !== who) P.engine = KidsEngine.createState(who);
    return P.engine;
  }
  const today = () => KidsEngine.dayKey(now());
  function dayLog() {
    const d = today(); P.days = P.days || {};
    const k = Object.keys(P.days); if (k.length > 60) delete P.days[k.sort()[0]];   // keep 60 days
    return P.days[d] || (P.days[d] = { n: 0, clean: 0, ms: 0, sets: 0, skills: {} });
  }
  // Active time only: each gap between answers counts at most 60 seconds, so a page left open does not count.
  function addTime() { const t = now(); dayLog().ms += Math.min(IDLE_CAP, Math.max(0, t - lastTouch)); lastTouch = t; }
  const limitMs = () => (P.limitMin || 25) * 60000;
  const overLimit = () => who !== "demo" && dayLog().ms >= limitMs();

  function card(html) { const c = $("cover"); showView("sums"); c.hidden = false; c.innerHTML = `<div class="cover-card">${html}</div>`; return c; }
  function bye(text) {
    Mission.on = false; closeTopic(); if (window.KnightWorld) KnightWorld.hideBar();
    card(`<div class="hello">${PROFILES[who].pic}</div><h2>${text}</h2><p>Your maths is done for today. You did great work.</p>`);
    say(text, "good", false); speak(text);
  }
  function closeTopic() { if (window.TopicHost && TopicHost.isOpen()) TopicHost.close(); }

  function nextSet() {
    set = KidsEngine.nextSet(eng(), map(), now()); i = 0;
    if (set.kind === "paused") return bye("Maths is resting today");
    if (set.kind === "empty") return bye("All done for now");
    if (set.kind === "parent") { eng().parentQs = []; save(); }
    play();
  }
  function play() {
    if (overLimit() && inSet === 0) return bye("See you tomorrow!");
    const id = set.items[i];
    if (set.kind === "parent") return askParent(id);
    const s = map().map[id];
    if (!s || !s.ready) { i++; return i < set.items.length ? play() : nextSet(); }
    if (s.play.src === "sums") {
      closeTopic();
      Mission.sumsLevel = s.play.level; showView("sums"); $("cover").hidden = true; nextQuestion();
    } else if (s.play.src === "topic") {
      const st = TopicHost.state;
      if (TopicHost.isOpen() && st.topic === s.play.topic) TopicHost.again(s.play.level);
      else { closeTopic(); TopicHost.play(s.play.topic, s.play.level, { onAnswer: r => Mission.answered(r), onQuit: () => Mission.pause() }); }
    }
  }
  // Questions a parent wrote: the question in words and the number answer.
  function askParent(item) {
    let tries = 0;
    closeTopic();
    const c = card(`<h2>A question from Mum and Dad</h2><p style="font-size:24px">${esc(item.q)}</p>
      <form id="pqForm" class="pin"><label for="pqIn">Your answer</label><input id="pqIn" inputmode="numeric" autocomplete="off" style="width:6ch">
      <p class="pin-msg" id="pqMsg" aria-live="assertive"></p><button class="main-btn" type="submit">Check</button></form>`);
    speak(item.q);
    $("pqIn").focus();
    $("pqForm").onsubmit = e => {
      e.preventDefault();
      const v = $("pqIn").value.trim();
      if (!v) return;
      if (v.toLowerCase() === String(item.a).trim().toLowerCase()) { c.hidden = true; addStars(tries ? 1 : 2); return Mission.answered({ correct: true, firstTry: !tries, helped: tries > 0, parent: item }); }
      tries++; $("pqIn").value = "";
      $("pqMsg").textContent = tries >= 3 ? `The answer is ${item.a}. Type ${item.a}.` : "Not quite. Try again.";
    };
  }
  const esc = s => String(s).replace(/[&<>"]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]);

  function reward() {
    const d = dayLog(); d.sets++;
    P.round = []; save(); renderTop();
    if (who === "kennedy") return knightWin();
    closeTopic();
    if (window.MarieWorld) return MarieWorld.customer(html => card(html), () => { $("cover").hidden = true; startCooking(); });
    showView("sums"); $("cover").hidden = true;
    startCooking();                                     // Marie and Demo: a short cooking break, then back to maths
  }
  // Kennedy: 5 answers send a bad guy home. Nobody is hurt; the bad guy runs away.
  function knightWin() {
    closeTopic();
    P.coins = (P.coins || 0) + 5; P.defeated = (P.defeated || 0) + 1; save(); renderTop();
    KnightWorld.hideBar();
    card(`<div class="hello">${KnightWorld.knightSVG(70)}${KnightWorld.badSVG(5, 70)}</div><h2>You beat the bad guy!</h2>
      <p>Your 5 answers made him run back home. You win 5 coins. You have ${P.coins} coins.</p>
      <button class="main-btn" id="winNext" type="button">Next</button>`);
    const t = "You beat the bad guy! He ran back home. You win 5 coins.";
    say(t, "good", false); speak(t);
    $("winNext").onclick = () => {
      const d = dayLog();
      if (d.n >= 20 && !d.defended) {                  // castle defence: once a day, after 20 answers
        const known = [9, 8, 7, 6, 5, 4, 3, 2, 1].find(l => (eng().skills["sums." + l]?.lvl || 0) >= 3) || 1;
        return KnightWorld.defence($("cover"), Math.min(known, 4), () => { d.defended = true; save(); $("cover").hidden = true; Mission.afterReward(); });
      }
      $("cover").hidden = true; KnightWorld.showBar(0); Mission.afterReward();
    };
  }
  const BADGUY = '<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M22 92 Q20 50 50 46 Q80 50 78 92 Z" fill="#7a6a9e" stroke="#3b2a33" stroke-width="3"/><circle cx="50" cy="36" r="22" fill="#b6d68a" stroke="#3b2a33" stroke-width="3"/><path d="M30 22 L38 8 L44 20 L50 6 L56 20 L62 8 L70 22" fill="#ffd45c" stroke="#3b2a33" stroke-width="2.5" stroke-linejoin="round"/><path d="M38 33 L46 36 M62 33 L54 36" stroke="#3b2a33" stroke-width="3" stroke-linecap="round"/><path d="M42 48 Q50 44 58 48" fill="none" stroke="#3b2a33" stroke-width="2.5" stroke-linecap="round"/></svg>';

  const Mission = {
    on: false, sumsLevel: 0,
    start() { this.on = true; lastTouch = now(); inSet = P.round.length % SET; if (who === "kennedy" && window.KnightWorld) KnightWorld.showBar(inSet); if (overLimit()) return bye("See you tomorrow!"); nextSet(); },
    pause() { this.on = false; this.sumsLevel = 0; closeTopic(); if (window.KnightWorld) KnightWorld.hideBar(); showStart(); },
    answered(r) {
      if (!this.on) return;
      addTime();
      const st = eng(), id = set.items[i], d = dayLog();
      const clean = !!(r.correct && !r.helped && !r.rush);
      if (set.kind === "place") KidsEngine.placementRecord(st, map(), id, clean);
      else if (set.kind === "parent") { P.parentLog = (P.parentLog || []).concat({ q: id.q, a: id.a, firstTry: !!r.firstTry, day: today() }).slice(-100); }
      else KidsEngine.record(st, map(), { skill: id, correct: r.correct, helped: r.helped, taught: r.taught, rush: r.rush }, now());
      d.n++; if (clean) d.clean++;
      if (typeof id === "string") { const k = d.skills[id] || (d.skills[id] = [0, 0]); k[0]++; if (clean) k[1]++; }
      P.round.push(clean ? 1 : 0); inSet++; i++;
      if (who === "kennedy" && window.KnightWorld) KnightWorld.showBar(inSet);
      save(); renderTop();
      if (inSet >= SET) { inSet = 0; return reward(); }
      if (i >= set.items.length) return nextSet();
      play();
    },
    afterReward() { if (!this.on) return; if (overLimit()) return bye("See you tomorrow!"); if (i >= set.items.length) nextSet(); else play(); },
    map, eng
  };
  window.Mission = Mission;
})();
