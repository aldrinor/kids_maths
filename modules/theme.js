/* theme.js - one calm look for every screen (19 Oct 2026), loaded last so it wins over each module's own style.
   Plain soft backgrounds, light outlines, soft shadows, one accent colour per child, a keypad in one colour,
   a real welcome screen, and a header that shows today's 5 steps instead of cupcakes.
   Marie: rose and mint. Kennedy: royal blue and gold. Demo: like Marie. */
(function () {
  "use strict";
  const CSS = `
body { --bg: #fbf5ef; --surface: #ffffff; --line: rgba(59, 42, 51, .16); --shadow: 0 6px 20px rgba(59, 42, 51, .08);
  --accent: #e5779b; --accent-deep: #c4557c; --accent-soft: #fde7ee; --second: #6cc5a6; --second-soft: #e3f5ee; }
body.who-kennedy { --bg: #edf2f8; --accent: #3d6fd8; --accent-deep: #2b54ad; --accent-soft: #e2ebfa; --second: #e2b23f; --second-soft: #fbf1d6;
  --ink: #22314a; --soft-ink: #53627c; --pink: #3d6fd8; --pink-deep: #2b54ad; }
html, body, .cover, .profiles { background: var(--bg) !important; }
/* header */
.top h1, .top h1 .brand { -webkit-text-stroke: 0 !important; color: var(--ink) !important; }
.top h1 #whoName { color: var(--accent-deep); }
.dots { display: flex; gap: 8px; justify-content: center; }
.dots .step { width: 14px; height: 14px; border-radius: 50%; background: var(--surface); border: 2px solid var(--line); }
.dots .step.on { background: var(--accent); border-color: var(--accent); }
.score { background: var(--surface) !important; border: 1px solid var(--line) !important; box-shadow: none !important; }
/* tabs: a quiet row; the chosen tab is filled */
.tabs { gap: 6px !important; }
.tab { border: 1px solid var(--line) !important; box-shadow: none !important; background: var(--surface) !important; border-radius: 14px !important; min-height: 44px !important; color: var(--ink) !important; }
.tab[aria-selected="true"] { background: var(--accent) !important; border-color: var(--accent) !important; color: #fff !important; }
/* panels: white, light outline, soft shadow, no patterns */
.blocks, .line, .eq, .cover-card, .tmap-card, .prof, .tp-ask, .tp-pic, .kn-item, .mw-plot, .grown section, #grown section {
  border: 1px solid var(--line) !important; box-shadow: var(--shadow) !important; background: var(--surface) !important; }
.blocks, .blocks-body { background-image: none !important; background-color: var(--surface) !important; }
.say .bubble, .tp-bubble { border: 1px solid var(--line) !important; box-shadow: none !important; background: var(--surface) !important; }
.say .bubble.good, .tp-bubble.good { background: var(--second-soft) !important; }
.say .bubble.warn, .tp-bubble.warn { background: #fff4e5 !important; }
/* keypad: one calm colour; only the check key stands out */
.pad button, .tp-key { background: var(--surface) !important; color: var(--ink) !important; border: 1px solid var(--line) !important; box-shadow: 0 2px 0 var(--line) !important; text-shadow: none !important; }
.pad button[data-k="go"], .tp-key.go { background: var(--accent) !important; color: #fff !important; border-color: var(--accent) !important; }
.tp-choice { background: var(--surface) !important; border: 1px solid var(--line) !important; box-shadow: 0 2px 0 var(--line) !important; }
.side { align-content: start !important; }
/* buttons */
.main-btn { border: 0 !important; box-shadow: 0 4px 0 var(--accent-deep) !important; background: var(--accent) !important; text-shadow: none !important; }
.mini { border: 1px solid var(--line) !important; box-shadow: none !important; background: var(--surface) !important; }
.jbtn { box-shadow: 0 3px 0 var(--accent-deep) !important; border: 0 !important; background: var(--accent) !important; }
/* the welcome screen */
.welcome { display: grid; justify-items: center; gap: 14px; text-align: center; max-width: 560px; }
.welcome .pic svg { width: min(180px, 40vw); height: auto; }
.welcome h2 { margin: 0; font: 800 clamp(32px, 6vw, 46px)/1.05 var(--display); color: var(--ink); -webkit-text-stroke: 0; }
.welcome .plan { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; margin: 0; padding: 0; list-style: none; }
.welcome .plan li { padding: 8px 12px; border-radius: 999px; background: var(--accent-soft); font-weight: 800; color: var(--ink); }
.welcome .plan li.last { background: var(--second-soft); }
.welcome p { margin: 0; color: var(--soft-ink); font-weight: 700; }
/* the profile screen */
.prof-card h2 { -webkit-text-stroke: 0; }
.prof { border-radius: 24px !important; }
/* topic screens: no level label for the children */
.tp-title small { display: none; }
.tp-top > * { box-shadow: none !important; }
.tp-back, .tp-title, .tp-score, .tp-speak, .speak, .recount { border: 1px solid var(--line) !important; box-shadow: none !important; background: var(--surface) !important; }
.kn-bar { border: 1px solid var(--line) !important; box-shadow: var(--shadow); }
/* small games: same calm background; the session shows its own 5 steps, so the cupcake row goes */
.tp, .tp-app { background: var(--bg) !important; }
.tp-dots { visibility: hidden; }
body.who-kennedy .tp-kitty, body.who-kennedy .say .kitty { visibility: hidden; }
.dots[hidden] { display: flex !important; visibility: hidden; }
body.who-kennedy .tp-score { visibility: hidden; }
.tp-choice { font-size: 26px !important; min-height: 72px !important; }
.mw-tabs button, .mw-acts button, .mw-shop button, .kn-item, .bg-btn { border: 1px solid var(--line) !important; box-shadow: 0 2px 0 var(--line) !important; background: var(--surface) !important; }
.mw-tabs button[aria-pressed="true"] { background: var(--accent) !important; color: #fff !important; border-color: var(--accent) !important; }
.set input, .set select, textarea { border: 1px solid var(--line); border-radius: 10px; padding: 8px 10px; font: inherit; background: var(--surface); }

/* Equal widths: every row of buttons shares the width evenly (Aldrin: no wider and narrower buttons in one row). */
.jbtns, .jbtns.many { display: grid !important; grid-auto-flow: column !important; grid-template-columns: none !important; grid-auto-columns: minmax(0, 1fr) !important; }
.jbtn, .jbtn.icon { width: auto !important; min-width: 0 !important; border-radius: 14px !important; }
.mw-tabs { display: grid !important; grid-template-columns: repeat(3, minmax(0, 1fr)); width: min(420px, 100%); margin: 0 auto; }
.mw-acts { display: grid !important; grid-template-columns: repeat(3, minmax(0, 1fr)); width: min(480px, 100%); margin: 0 auto; }
.mw-acts button, .mw-tabs button { width: 100%; }
.welcome .plan { display: grid !important; grid-template-columns: repeat(3, minmax(0, 1fr)); width: 100%; }
.welcome .plan li { display: grid; place-items: center; text-align: center; min-height: 48px; }
.kn-shop, .mw-shop { grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)) !important; }
.prof-list { grid-template-columns: repeat(auto-fit, minmax(0, 1fr)) !important; }
.set .mini + .mini { margin-left: 0; }
.kd-keys { grid-template-columns: repeat(6, minmax(0, 1fr)) !important; min-width: min(380px, 100%); }
.ch-row, .bg-row { display: grid !important; grid-auto-flow: column; grid-auto-columns: minmax(0, 1fr); gap: 8px; }
.ch-row > *, .bg-row > * { width: 100%; min-width: 0; }
.pad { grid-template-columns: repeat(6, minmax(0, 1fr)) !important; }
.pad > button { width: auto !important; min-width: 0 !important; }
.pin .row { display: grid !important; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; width: min(360px, 100%); }
.pin .row > button { width: 100%; padding-inline: 8px; }
.set:has(> button + button) > button, .set:has(> button + span + button) > button { flex: 1 1 0; min-width: 0; }
.pin input { border: 1px solid var(--line) !important; box-shadow: var(--shadow); border-radius: 16px !important; }
`;
  const st = document.createElement("style"); st.id = "theme-css"; st.textContent = CSS; document.head.appendChild(st);

  // The body knows who is playing, so the colours follow the child.
  const setWho = () => { if (window.World) World.clear(); document.body.classList.remove("who-marie", "who-kennedy", "who-demo"); if (typeof who !== "undefined" && who) document.body.classList.add("who-" + who); };
  const wrap = (name, after) => { const f = window[name]; if (typeof f !== "function") return; window[name] = function () { const r = f.apply(this, arguments); after(); return r; }; };
  wrap("startAs", setWho);

  // Header: today's 5 steps as quiet dots.
  wrap("renderTop", () => {
    const d = document.getElementById("dots"); if (!d || d.hidden) return;
    const done = Math.min((window.P && P.round || []).length, 5);
    d.innerHTML = Array.from({ length: 5 }, (_, i) => `<span class="step${i < done ? " on" : ""}"></span>`).join("");
    d.setAttribute("aria-label", `${done} of 5 answers in this set`);
  });

  // Welcome screen: the child's friend, a hello, and today's plan in 3 steps.
  wrap("showStart", () => {
    const c = document.getElementById("cover"); if (!c || c.hidden || typeof PROFILES === "undefined" || typeof who === "undefined" || !who) return;
    const go = document.getElementById("goBtn"); if (!go) return;
    const knight = who === "kennedy";
    const pic = knight && window.KnightWorld ? KnightWorld.knightSVG(150) : PROFILES[who].pic;
    const card = c.querySelector(".cover-card");
    card.innerHTML = `<div class="welcome"><div class="pic">${pic}</div><h2>Hi ${PROFILES[who].name}!</h2>
      <ul class="plan" aria-label="Today"><li>Maths</li><li>${knight ? "Send a bad guy home" : "A cafe customer"}</li><li class="last">${knight ? "Build your castle" : "Your home and garden"}</li></ul>
      <p>${knight ? `You have ${P.coins || 0} coins.` : `You have ${P.stars || 0} stars.`}</p></div>`;
    card.querySelector(".welcome").appendChild(go);
  });
  setWho();
})();
