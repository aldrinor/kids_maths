/* calm.js - the calm-design rules (19 Oct 2026). The parents asked for low visual stimulation and nothing that
   hooks the children on the screen. Loaded last, it switches off flying stars, shaking, bouncing and endless
   pulsing everywhere. Guidance stays visible as a still outline instead of a flashing one. */
(function () {
  "use strict";
  const CSS = `
.fx img { display: none !important; }
.hello svg, .say .kitty.happy, .say .kitty.think, .score.bump, .tp-score.bump { animation: none !important; }
.shake, .tp-ask.shake { animation: none !important; outline: 3px solid #f4b183; outline-offset: 2px; }
.blk.glow, .jbtn.glow, .stopbox.glow { animation: none !important; }
.choice.next, .bowl-btn, .oven .win.hot { animation: none !important; }
.blk.wiggle, .blk.pop, .thing.wave, .result .top-on, .bowl.stir { animation: none !important; }
`;
  const s = document.createElement("style"); s.id = "calm-css"; s.textContent = CSS;
  document.head.appendChild(s);
  window.CALM = true;
})();
