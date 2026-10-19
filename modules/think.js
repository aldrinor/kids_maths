/* think.js - the Think tab (19 Oct 2026): chess coach, ship hunt, code breaker, tower move, last cookie.
   Opens only after 3 sets of maths that day (Demo: always), and its minutes count in the same daily limit,
   so thinking games never replace maths or stretch screen time. Games live in modules/chess_coach.js and
   modules/brain_games.js (window.BrainGames). Uses the page's globals: P, who, save, speak, Mission. */
(function () {
  "use strict";
  const ORDER = ["chess", "battleship", "codebreaker", "hanoi", "nim"];
  const NEED_SETS = 3, CHECK_MS = 30000;
  const ABOUT = {
    chess: "Learn each chess piece, then play the coach.", battleship: "Find the hidden ships with as few taps as you can.",
    codebreaker: "Find the secret bead code from the clues.", hanoi: "Move the tower, one disc at a time.", nim: "Take 1, 2 or 3 cookies. Take the last one to win."
  };
  let host = null, game = null, started = 0, timer = 0;

  const today = () => (P.days || {})[KidsEngine.dayKey(Date.now())] || { sets: 0, ms: 0 };
  const open = () => who === "demo" || today().sets >= NEED_SETS;
  const over = () => who !== "demo" && today().ms >= (P.limitMin || 25) * 60000;
  function addTime() {
    if (!started) return;
    const d = (P.days = P.days || {}), k = KidsEngine.dayKey(Date.now());
    d[k] = d[k] || { n: 0, clean: 0, ms: 0, sets: 0, skills: {} };
    d[k].ms += Math.min(Date.now() - started, CHECK_MS * 2); d[k].think = (d[k].think || 0) + 1;
    started = Date.now(); save();
  }
  function store(id) {
    return { get: () => (P.brainStore || {})[id] || null, set: o => { P.brainStore = P.brainStore || {}; P.brainStore[id] = o; save(); } };
  }
  function mount(el) {
    host = el;
    if (game) return;
    const games = ORDER.filter(id => window.BrainGames && BrainGames[id]);
    let msg = "";
    if (over()) msg = "Thinking games are done for today. See you tomorrow!";
    else if (!open()) msg = `Thinking games open after ${NEED_SETS} sets of maths today. You have done ${today().sets}.`;
    el.innerHTML = `<div class="kn-world" style="padding:12px;max-width:760px;margin:0 auto"><h2>Think</h2>
      ${msg ? `<p>${msg}</p>` : "<p>Pick a thinking game. Take your time.</p>"}
      <div class="tmap-grid">${games.map(id => `<button type="button" class="tmap-card" data-game="${id}"${msg ? " disabled" : ""}><span class="tmap-name">${BrainGames[id].title}</span><span>${ABOUT[id] || ""}</span></button>`).join("")}</div></div>`;
    el.querySelectorAll("[data-game]").forEach(b => b.onclick = () => play(b.dataset.game));
  }
  function play(id) {
    if (!open() || over()) return mount(host);
    const g = BrainGames[id]; if (!g) return;
    host.innerHTML = `<div class="think-game" style="padding:8px"></div>`;
    game = g; started = Date.now();
    g.open(host.firstChild, { who, speak, store: store(id), onExit: stop });
    clearInterval(timer);
    timer = setInterval(() => { addTime(); if (over()) { stop(); speak("Thinking time is done for today. See you tomorrow!"); } }, CHECK_MS);
  }
  function stop() {
    clearInterval(timer); timer = 0;
    addTime(); started = 0;
    if (game) { try { game.close(); } catch (e) { console.error(e); } game = null; }
    if (host) mount(host);
  }
  function unmount() { if (game) stop(); if (host) host.innerHTML = ""; host = null; }
  window.ThinkTab = { mount, unmount, stop };
})();
