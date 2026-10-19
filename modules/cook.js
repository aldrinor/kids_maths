/* cook.js - the Cooking break for Kitty Number Blocks (version 2, 15 Oct 2026).
 *
 * BUILT FILE: made by joining scratchpad/cook2/parts/*.js with scratchpad/cook2/build_cook.py.
 * Edit the parts and rebuild; a hand edit here is lost at the next build.
 *
 * window.CookGame.start(rootEl, { recipe, onDone(starsEarned), onSkip(), friend, scoreEl, awardStars, clock, autoPlay })
 *   rootEl  : an absolutely positioned panel. The module adds one child (.ck) that fills it.
 *   recipe  : a number from the host (P.cooks % 3). It is only a seed now: Marie chooses the recipe herself
 *             from 3 picture cards. The cards favour recipes she has not made lately (P.cookRecent).
 *   onDone  : called exactly once, after the treat is served, with 3.
 *   onSkip  : called when she taps "back to sums" before any star has landed. onDone is then never called.
 *   friend  : optional friend id who admires the treat (melody, kuromi, purin, cinna). Default rotates with P.cooks.
 *   scoreEl : optional element the stars fly to. Default: the first .score element on the page.
 *   clock   : ignored (kept for old hosts). Real play has no clock at all.
 *   autoPlay: TESTS ONLY (or window.__cookAutoPlay = true). The break then plays itself: it picks a card, does every
 *             step, adds a few decorations and serves, in about 15 seconds. Real play never does anything by itself.
 *   awardStars : default true. The module calls the host's addStars(1) as each of the 3 stars lands,
 *                so the host must NOT add the 3 stars again in onDone.
 * window.CookGame.stop() ends a running break silently (no callbacks).
 *
 * Her father's rules: nothing plays itself. Every step waits for her tap or drag, with no deadline.
 * Hints are a glow and, after a quiet while, a pointing hand that shows the gesture. No counting numbers.
 *
 * Needs (host globals, all optional): tone(), speak(), addStars(), save(), P, window.KittyChars.
 * Stores in P: P.made[key] (count), P.cookRecent (last 6 recipe keys made), P.cookCards (last 3 cards shown).
 * All CSS is scoped under .ck and every class and keyframe name starts with "ck-".
 * Every picture is our own SVG drawn in this file (fan drawings for private family use). No image files.
 *
 * Layout: a square stage of 800 x 800 units is scaled to fit the free space. The wall and counter run far
 * past the stage edges, so wide screens show more kitchen, never empty bars. Buttons, cards, the drawer of
 * decorations, Mimi's speech bubble and the back button are real pixels (never scaled), so every tap target
 * stays 44 px or more on an iPhone SE.
 * Kitty is always her whole body (window.KittyChars.full, with a chef hat). On a wide screen she has her own
 * column at the left. On a phone or an upright iPad she stands inside the stage, behind every prop: on the
 * card screen beside "Let's cook!", in the steps and the studio on the shelf rail, the counter top or on top
 * of a prop, at a spot no prop or button overlaps (kitFit, checked at each new instruction). She never walks
 * or does a step; she only breathes, blinks, waves or hops in place.
 */
(function () {
  "use strict";

  var INK = "#3b2a33";
  var AUTO_WAIT = 380;      /* autoPlay only: how long a step waits before the test robot acts */
  var HAND_IDLE = 4000;     /* the pointing hand shows the gesture after this much quiet */
  var HAND_AGAIN = 7000;    /* and comes back after this much more quiet */
  var SAY_AGAIN = 14000;    /* Kitty repeats the step words once after this much quiet */
  var AUTO_END = 32000;     /* autoPlay only: a safety end, so a test can never hang */
  var ST = 800;             /* the stage is ST x ST units */
  var COUNTER = 560;        /* the counter top, in stage units */
  var FRIENDS = ["melody", "kuromi", "purin", "cinna"];

  /* ------------------------------------------------------------ helpers */
  var uidN = 0;
  function uid() { uidN += 1; return "ck" + uidN + "_"; }
  function st(w) { return 'stroke="' + INK + '" stroke-width="' + (w || 5) + '" stroke-linejoin="round" stroke-linecap="round"'; }
  function svg(vb, inner, extra) { return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + vb + '" aria-hidden="true" focusable="false"' + (extra || "") + ">" + inner + "</svg>"; }
  function E(cx, cy, rx, ry, f, w, x) { return '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + rx + '" ry="' + ry + '" fill="' + f + '"' + (w === 0 ? "" : " " + st(w)) + (x || "") + "/>"; }
  function C(cx, cy, r, f, w, x) { return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + f + '"' + (w === 0 ? "" : " " + st(w)) + (x || "") + "/>"; }
  function R(x, y, w, h, r, f, sw, ex) { return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + r + '" fill="' + f + '"' + (sw === 0 ? "" : " " + st(sw)) + (ex || "") + "/>"; }
  function Pa(d, f, w, x) { return '<path d="' + d + '" fill="' + (f || "none") + '"' + (w === 0 ? "" : " " + st(w)) + (x || "") + "/>"; }
  function HL(d, w, o) { return '<path d="' + d + '" fill="none" stroke="#fff" stroke-width="' + (w || 6) + '" stroke-linecap="round" opacity="' + (o || 0.7) + '"/>'; }
  function reduced() { try { return matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; } }
  function soundOn() { try { return typeof P === "undefined" || P.sound !== false; } catch (e) { return true; } }
  function host(name) { try { return typeof window[name] === "function" ? window[name] : null; } catch (e) { return null; } }
  function beep(freqs, dur, type, gap) { var f = host("tone"); if (f) { try { f(freqs, dur, type, gap); } catch (e) {} } }
  function now() { return performance.now(); }
  function secs() { return G ? (now() - G.t0) / 1000 : 0; }
  function mark(name) { if (G) G.marks.push(name + "@" + secs().toFixed(1)); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function hyp(x, y) { return Math.sqrt(x * x + y * y); }
  function getP() { try { return typeof P !== "undefined" && P ? P : null; } catch (e) { return null; } }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  var nctx = null;
  /* Reuse the host's AudioContext (the game's own "actx") when it exists, so there is only one. */
  function audio() {
    try { if (typeof actx !== "undefined" && actx) { nctx = actx; return nctx; } } catch (e) {}
    if (nctx) return nctx;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try { nctx = new AC(); } catch (e) { nctx = null; }
    return nctx;
  }
  /* A soft filtered noise burst (pour, sizzle, sprinkle, squish). Peak gain is kept at or under 0.15. */
  function noise(dur, freq, q, gain, sweepTo) {
    if (!soundOn()) return;
    try {
      if (!audio()) return;
      if (nctx.state === "suspended") nctx.resume();
      var t = nctx.currentTime, len = Math.max(1, Math.floor(nctx.sampleRate * dur));
      var buf = nctx.createBuffer(1, len, nctx.sampleRate), d = buf.getChannelData(0);
      for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      var src = nctx.createBufferSource(); src.buffer = buf;
      var f = nctx.createBiquadFilter(); f.type = "bandpass"; f.Q.value = q || 1;
      f.frequency.setValueAtTime(freq, t);
      if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
      var g = nctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(Math.min(gain || 0.12, 0.15), t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(f); f.connect(g); g.connect(nctx.destination);
      src.start(t); src.stop(t + dur + 0.02);
    } catch (e) {}
  }
  var SFX = {
    pip: function () { beep([880], 0.07, "triangle"); },
    pick: function () { beep([660, 880], 0.06, "triangle", 0.04); },
    plop: function () { noise(0.12, 500, 2, 0.12, 180); beep([330], 0.1, "sine"); },
    squish: function () { noise(0.1, 420, 2.5, 0.1, 200); beep([392], 0.08, "sine"); },
    glug: function () { noise(0.16, 380, 4, 0.1, 220); },
    pour: function () { noise(0.3, 700, 1.2, 0.06, 380); },
    whir: function () { noise(0.22, 260, 1.5, 0.07, 520); },
    sizzle: function () { noise(0.4, 4200, 0.8, 0.05); },
    roll: function () { noise(0.12, 300, 1.5, 0.06); },
    rub: function () { noise(0.06, 1500, 1.2, 0.04); },
    click: function () { noise(0.025, 3200, 6, 0.08); },
    ding: function () { beep([1319, 1568], 0.32, "sine", 0.16); },
    sprinkle: function () { noise(0.05, 5200, 4, 0.05); },
    nom: function () { noise(0.08, 700, 2, 0.12, 300); },
    ting: function (i) { beep([[1047, 1319, 1568][i % 3]], 0.14, "sine"); },
    yay: function () { beep([784, 988, 1175, 1568], 0.12, "triangle", 0.08); },
    whoosh: function () { noise(0.22, 900, 0.8, 0.06, 2400); },
    shutter: function () { noise(0.05, 2400, 3, 0.1); noise(0.08, 1200, 2, 0.06); },
    /* a rising little scale for repeated actions: a sound, never a number */
    step: function (i) { var s = [523, 587, 659, 698, 784, 880, 988, 1047]; beep([s[Math.min(i, 7)]], 0.09, "sine"); }
  };

  /* ------------------------------------------------------------ CSS (scoped) */
  var CSS = [
    ".ck{position:absolute;inset:0;overflow:hidden;border-radius:inherit;touch-action:none;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;",
    "  background:#ffe9f1;font-family:'Baloo 2','Comic Sans MS',system-ui,sans-serif;color:" + INK + ";z-index:1;line-height:1.15}",
    ".ck *{box-sizing:border-box}",
    ".ck svg{display:block;overflow:visible}",
    ".ck button{font:inherit;color:inherit;margin:0;padding:0;border:0;background:none;touch-action:none;-webkit-tap-highlight-color:transparent;cursor:pointer;opacity:1}",
    ".ck button:focus-visible{outline:4px solid #7b55e6;outline-offset:2px}",
    ".ck-stage{position:absolute;left:0;top:0;width:800px;height:800px;transform-origin:0 0;z-index:1}",
    /* the room: these strips run far past the stage on every side */
    ".ck-wall{position:absolute;left:-3000px;width:6800px;top:-3000px;height:3300px;background:repeating-linear-gradient(90deg,#ffe4ee 0 46px,#fff6f9 46px 92px)}",
    ".ck-rail{position:absolute;left:-3000px;width:6800px;top:296px;height:24px;background:#fff;border-top:6px solid " + INK + ";border-bottom:6px solid " + INK + "}",
    ".ck-tiles{position:absolute;left:-3000px;width:6800px;top:320px;height:240px;background-color:#e0f3ff;",
    "  background-image:linear-gradient(rgba(59,42,51,.13) 4px,transparent 4px),linear-gradient(90deg,rgba(59,42,51,.13) 4px,transparent 4px);background-size:70px 70px;background-position:-2px -2px}",
    ".ck-ctop{position:absolute;left:-3000px;width:6800px;top:560px;height:110px;border-top:6px solid " + INK + ";background:linear-gradient(180deg,#fbe0bb 0,#f6c891 60%,#efbb7f 100%)}",
    ".ck-lip{position:absolute;left:-3000px;width:6800px;top:670px;height:26px;background:#fff;border-top:6px solid " + INK + ";border-bottom:6px solid " + INK + "}",
    ".ck-cfront{position:absolute;left:-3000px;width:6800px;top:696px;height:3000px;background:linear-gradient(90deg,#8fe0c8,#9ee7d2 50%,#8fe0c8)}",
    ".ck-o{position:absolute}",
    ".ck-o>svg{width:100%;height:auto}",
    ".ck-hit{position:absolute;border-radius:50%}",
    ".ck-grab{cursor:grab;touch-action:none}",
    ".ck-grab::before,.ck-hit::before{content:'';position:absolute;inset:calc(-1 * var(--ck-pad, 0px));border-radius:40px}",
    ".ck-grab.ck-dragging{cursor:grabbing}",
    ".ck-lay{position:absolute;left:0;top:0;width:800px;height:800px;pointer-events:none}",
    ".ck-lay>svg{width:800px;height:800px}",
    ".ck-p{position:absolute;pointer-events:none;z-index:40}",
    ".ck-z2{z-index:2}.ck-z3{z-index:3}.ck-z5{z-index:5}.ck-z8{z-index:8}.ck-z10{z-index:10}.ck-z12{z-index:12}.ck-z20{z-index:20}",
    /* hints: a glow on the thing to use, and a pointing hand */
    ".ck-halo{position:absolute;z-index:30;border-radius:50%;pointer-events:none;border:8px solid rgba(255,201,74,.95);box-shadow:0 0 0 8px rgba(255,255,255,.7),0 0 40px 10px rgba(255,214,90,.75);animation:ck-halo 1.6s ease-in-out infinite}",
    "@keyframes ck-halo{0%,100%{opacity:.55;transform:scale(.96)}50%{opacity:1;transform:scale(1.04)}}",
    ".ck-hand{position:absolute;z-index:45;pointer-events:none;opacity:0;width:110px}",
    ".ck-hand.ck-tap{animation:ck-tap 1.1s ease-in-out infinite}",
    "@keyframes ck-tap{0%,100%{transform:translate(0,0) scale(1)}45%{transform:translate(-8px,-18px) scale(1.04)}60%{transform:translate(0,0) scale(.92)}}",
    /* top row and Kitty (real pixels) */
    ".ck-back{position:absolute;top:6px;right:6px;z-index:60;width:52px;height:52px;border-radius:50% !important;border:3px solid " + INK + " !important;box-shadow:0 4px 0 " + INK + ";background:#fff !important;display:grid;place-items:center}",
    ".ck-back:active{transform:translateY(3px);box-shadow:0 1px 0 " + INK + "}",
    ".ck-back svg{width:34px;height:34px}",
    ".ck-kit{position:absolute;z-index:6;pointer-events:none}",
    ".ck-kit>svg{width:100%;height:auto}",
    /* on a phone or an upright iPad she stands inside the stage, behind every prop, so she can never hide one */
    ".ck-stage>.ck-kit{z-index:auto}",
    ".ck-bub{position:absolute;z-index:55;background:#fff;border:3px solid " + INK + ";border-radius:20px;padding:5px 12px 6px;font-weight:800;box-shadow:0 4px 0 rgba(59,42,51,.25);pointer-events:none;display:flex;align-items:center;overflow:hidden}",
    ".ck-bub[data-off='1']{display:none}",
    ".ck-bub>span{display:block;width:100%}",
    ".ck-prog{position:absolute;z-index:50;display:flex;gap:5px;align-items:center;background:rgba(255,253,248,.92);border:3px solid " + INK + ";border-radius:999px;padding:4px 8px;box-shadow:0 3px 0 " + INK + ";pointer-events:none}",
    ".ck-prog i{display:block;width:14px;height:14px;border-radius:50%;border:2.5px solid " + INK + ";background:#fff}",
    ".ck-prog i.ck-on{background:#ffc94a;box-shadow:0 0 0 3px #ff6f9f}",
    ".ck-prog i.ck-ok{background:#63d3b3}",
    ".ck-prog b{display:block;width:20px;height:20px}",
    ".ck-prog b svg{width:20px;height:20px}",
    /* choice cards */
    ".ck-pick{position:absolute;z-index:40;display:grid;gap:10px}",
    ".ck-card{position:relative;display:flex;align-items:center;gap:8px;min-height:64px;border:3px solid " + INK + " !important;border-radius:22px !important;box-shadow:0 5px 0 " + INK + ";background:#fffdf8 !important;padding:6px 10px !important;text-align:left;transition:transform .15s}",
    ".ck-card .ck-cpic{flex:none;display:block}",
    ".ck-card .ck-cpic svg{width:100%;height:auto;overflow:hidden !important}",
    ".ck-card .ck-cname{font-weight:800;font-size:22px;line-height:1.05}",
    ".ck-pick.ck-row .ck-card{flex-direction:column;justify-content:center;text-align:center;padding:10px !important}",
    ".ck-card.ck-sel{background:#fff1b8 !important;box-shadow:0 0 0 5px #ff6f9f,0 5px 0 " + INK + ";transform:translateY(-3px)}",
    ".ck-card.ck-new::after{content:'';position:absolute;right:-8px;top:-8px;width:30px;height:30px;background:url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Cpath d='M20 2 C22 14 26 18 38 20 C26 22 22 26 20 38 C18 26 14 22 2 20 C14 18 18 14 20 2 Z' fill='%23ffc94a' stroke='%233b2a33' stroke-width='3' stroke-linejoin='round'/%3E%3C/svg%3E\") center/contain no-repeat}",
    ".ck-go{min-height:58px;border:3px solid " + INK + " !important;border-radius:20px !important;box-shadow:0 5px 0 " + INK + ";background:#ff6f9f !important;color:#fff !important;font-weight:800 !important;font-size:24px !important;-webkit-text-stroke:1px " + INK + ";paint-order:stroke fill;padding:0 22px !important}",
    ".ck-go.ck-wait{background:#fff1f6 !important;color:#b9a3ad !important;-webkit-text-stroke:0;box-shadow:0 5px 0 rgba(59,42,51,.35)}",
    ".ck-go:active,.ck-card:active{transform:translateY(3px)}",
    /* the decorating drawer (real pixels) */
    ".ck-drawer{position:absolute;z-index:40;background:linear-gradient(180deg,#b7f0df,#8fe0c8);border:3px solid " + INK + ";border-radius:22px;box-shadow:0 5px 0 rgba(59,42,51,.25);display:flex;flex-direction:column;gap:6px;padding:6px}",
    ".ck-tabs{display:flex;gap:5px;overflow:hidden;flex:none}",
    ".ck-tabs::-webkit-scrollbar{display:none}",
    ".ck .ck-tab{flex:none;width:48px;height:48px;border-radius:14px;border:3px solid " + INK + ";background:#fff;display:grid;place-items:center}",
    ".ck .ck-tab svg{width:34px;height:34px}",
    ".ck .ck-tab.ck-on{background:#ffc94a;box-shadow:inset 0 -4px 0 rgba(59,42,51,.2)}",
    ".ck-items{display:grid;gap:6px;flex:1 1 auto;min-height:0;align-content:start}",
    ".ck .ck-item{position:relative;width:100%;aspect-ratio:1;min-width:44px;min-height:44px;border-radius:50%;border:3px solid " + INK + ";background:radial-gradient(circle at 50% 40%,#fff,#ffe9f1);box-shadow:0 4px 0 rgba(59,42,51,.22);display:grid;place-items:center;touch-action:none}",
    ".ck .ck-item>svg{width:72%;height:72%;pointer-events:none}",
    ".ck .ck-item.ck-sw>i{display:block;width:70%;height:70%;border-radius:50%;border:3px solid " + INK + ";pointer-events:none}",
    ".ck .ck-item.ck-on{box-shadow:0 0 0 5px #ff6f9f,0 4px 0 rgba(59,42,51,.22);background:#fff1b8}",
    ".ck .ck-more{border-radius:16px;background:#fff}",
    ".ck-acts{display:flex;gap:8px;flex:none}",
    ".ck .ck-undo{width:54px;height:54px;flex:none;border-radius:50%;border:3px solid " + INK + ";background:#fff;box-shadow:0 4px 0 " + INK + ";display:grid;place-items:center;z-index:42}",
    ".ck .ck-undo svg{width:32px;height:32px}",
    ".ck .ck-undo.ck-none{opacity:.45}",
    ".ck .ck-serve{min-height:58px;padding:0 18px;border-radius:20px;border:3px solid " + INK + ";background:#ff6f9f;color:#fff;font-weight:800;font-size:24px;-webkit-text-stroke:1px " + INK + ";paint-order:stroke fill;box-shadow:0 5px 0 " + INK + ";display:flex;align-items:center;gap:6px;z-index:42}",
    ".ck .ck-serve svg{width:30px;height:30px}",
    ".ck .ck-serve[data-off='1'],.ck .ck-undo[data-off='1']{display:none}",
    ".ck-ghost{position:absolute;z-index:70;pointer-events:none;transform-origin:50% 50%}",
    ".ck-ghost>svg{width:100%;height:auto}",
    ".ck-placed{position:absolute;touch-action:none;cursor:grab;transform-origin:50% 50%;pointer-events:auto}",
    ".ck-placed>svg{width:100%;height:auto;pointer-events:none}",
    ".ck-placed::before{content:'';position:absolute;left:50%;top:50%;width:max(100%,var(--ckhit,0px));height:max(100%,var(--ckhit,0px));transform:translate(-50%,-50%)}",
    ".ck-placed.ck-dragging{z-index:30 !important}",
    /* photo moment */
    ".ck-flash{position:absolute;inset:0;z-index:80;background:#fff;pointer-events:none;opacity:0}",
    ".ck-frame{position:absolute;z-index:4;border:22px solid #fff;border-bottom-width:64px;border-radius:10px;box-shadow:0 0 0 4px " + INK + ",0 14px 0 rgba(59,42,51,.25);pointer-events:none}",
    ".ck-frame>b{position:absolute;left:0;right:0;bottom:-54px;text-align:center;font-size:40px;font-weight:800;color:#ff6f9f}",
    ".ck-tape{position:absolute;width:120px;height:34px;background:rgba(255,159,194,.85);top:-34px;left:50%;margin-left:-60px;transform:rotate(-4deg)}",
    ".ck-plus{position:fixed;z-index:2147483000;pointer-events:none;display:flex;align-items:center;gap:2px;padding:2px 12px 2px 4px;border-radius:999px;background:#ffc94a;border:3px solid " + INK + ";box-shadow:0 3px 0 " + INK + ";font:800 24px/1 'Baloo 2',sans-serif;color:" + INK + "}",
    ".ck-plus svg{width:28px;height:28px}",
    ".ck-flystar{position:fixed;z-index:2147483000;width:44px;height:44px;pointer-events:none}",
    ".ck-spin{animation:ck-spin .5s linear infinite}",
    "@keyframes ck-spin{to{transform:rotate(360deg)}}",
    ".ck-bob{animation:ck-bob 1.2s ease-in-out infinite}",
    "@keyframes ck-bob{50%{transform:translateY(-6px)}}",
    "@media (prefers-reduced-motion: reduce){.ck-halo,.ck-hand.ck-tap,.ck-spin,.ck-bob{animation:none !important}}"
  ].join("\n");

  function injectCss() {
    if (document.getElementById("ck-css")) return;
    var s = document.createElement("style");
    s.id = "ck-css";
    s.textContent = CSS;
    document.head.appendChild(s);
  }
  function handSVG() {
    return svg("0 0 100 120",
      '<path d="M40 8 C48 8 52 14 52 22 L52 50 C56 44 66 44 68 52 C72 46 82 48 82 56 C86 52 96 54 96 64 L96 88 C96 106 82 116 64 116 L54 116 C40 116 32 108 26 98 L10 70 C6 62 14 54 22 60 L30 70 L30 22 C30 14 34 8 40 8 Z" fill="#fff" ' + st(4.5) + "/>" +
      '<path d="M52 50 L52 70 M68 52 L68 72 M82 56 L82 74" stroke="' + INK + '" stroke-width="3" stroke-linecap="round" opacity=".45"/>' +
      '<path d="M40 112 L74 112" stroke="#ff8fb4" stroke-width="8" stroke-linecap="round"/>');
  }
  function sparkleSVG(c) {
    return svg("0 0 40 40", '<path d="M20 2 C22 14 26 18 38 20 C26 22 22 26 20 38 C18 26 14 22 2 20 C14 18 18 14 20 2 Z" fill="' + c + '" ' + st(2.5) + "/>");
  }
  function starSVG() {
    return svg("0 0 50 50", '<path d="M25 3 L31.5 17.5 L47 19 L35.5 29.5 L39 45 L25 37 L11 45 L14.5 29.5 L3 19 L18.5 17.5 Z" fill="#ffc94a" stroke="' + INK + '" stroke-width="3.5" stroke-linejoin="round"/><path d="M19 20 L25 12" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".8"/>');
  }
  function backIconSVG() {
    return svg("0 0 40 40",
      '<rect x="5" y="9" width="30" height="24" rx="7" fill="#ffe4ee" stroke="' + INK + '" stroke-width="3"/>' +
      '<path d="M12 21 L18 21 M15 18 L15 24 M22 19 L28 19 M22 23 L28 23" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
      '<path d="M33 2 C33.6 5.4 34.6 6.4 38 7 C34.6 7.6 33.6 8.6 33 12 C32.4 8.6 31.4 7.6 28 7 C31.4 6.4 32.4 5.4 33 2 Z" fill="#ffc94a" stroke="' + INK + '" stroke-width="1.6" stroke-linejoin="round"/>');
  }
  /* The chef hat, drawn in the head's 100 x 100 box (stroke matches the head outline). It sits in front of
     the ears, across the forehead, with a small pink flower pinned on the band. */
  function hatMarkup() {
    var s = 'stroke="' + INK + '" stroke-width="3.1" stroke-linejoin="round" stroke-linecap="round"';
    var bowS = 'stroke="' + INK + '" stroke-width="3.07" stroke-linejoin="round" stroke-linecap="round"';
    return '<g class="ck-hat">' +
      '<path d="M10 36 C-6 32 -6 6 12 2 C10 -20 36 -30 52 -16 C64 -34 96 -26 94 -2 C110 2 110 30 90 36 Z" fill="#fff" ' + s + "/>" +
      '<path d="M24 -2 C26 -10 32 -14 40 -12 M68 -14 C76 -14 82 -8 82 -2" fill="none" stroke="#e8dce2" stroke-width="3.4" stroke-linecap="round"/>' +
      '<rect x="8" y="22" width="84" height="19" rx="7" fill="#fff" ' + s + "/>" +
      '<path d="M28 26 L28 37 M46 26 L46 37 M64 26 L64 37" stroke="#e8dce2" stroke-width="3" stroke-linecap="round"/>' +
      '<g transform="translate(80 31)">' +
      [0, 72, 144, 216, 288].map(function (r) { return '<ellipse cx="0" cy="-5.2" rx="3.8" ry="5.2" fill="#ff9cc4" ' + bowS + ' transform="rotate(' + r + ')"/>'; }).join("") +
      '<circle r="3.2" fill="#ffd24a" ' + bowS + "/></g></g>";
  }
  /* Heart eyes drawn over a character's eyes (head box units). */
  var EYES = { kitty: [60, 13], melody: [63, 13], kuromi: [60, 13], purin: [57, 14], cinna: [62, 12] };
  function heartsMarkup(id) {
    var e = EYES[id] || EYES.kitty, out = '<g class="ck-hearts">';
    [50 - e[1], 50 + e[1]].forEach(function (x) {
      out += '<path transform="translate(' + x + " " + e[0] + ') scale(.95)" d="M0 7 C-12 -1 -8 -11 0 -5 C8 -11 12 -1 0 7 Z" fill="#ff4f7b" stroke="' + INK + '" stroke-width="2.2" stroke-linejoin="round"/>';
    });
    return out + "</g>";
  }

  /* --- small string surgery on KittyChars.full() output (characters.js itself is shared and left alone) */
  function groupEnd(s, start) {
    var re = /<g[\s>]|<\/g>/g, depth = 0, m;
    re.lastIndex = start;
    while ((m = re.exec(s))) {
      if (m[0] === "</g>") { depth -= 1; if (depth === 0) return m.index + 4; }
      else depth += 1;
    }
    return -1;
  }
  function charMarkup(id, pose, o) {
    o = o || {};
    var s = window.KittyChars ? window.KittyChars.full(id, pose) : "";
    if (!s) return s;
    ["R", "L"].forEach(function (side) {
      var deg = o["arm" + side];
      if (deg === undefined || deg === null) return;
      var cls = 'class="kc-arm kc-arm-' + side.toLowerCase() + '"';
      var i = s.indexOf(cls);
      if (i < 0) return;
      var gs = s.lastIndexOf("<g", i), ge = groupEnd(s, gs);
      if (gs < 0 || ge < 0) return;
      var grp = s.slice(gs, ge);
      grp = grp.replace(/rotate\(-?[\d.]+\)/, "rotate(" + deg.toFixed(1) + ")");
      var tool = o["tool" + side];
      if (tool) { var c = grp.indexOf('<circle cx="0" cy="25"'); if (c > 0) grp = grp.slice(0, c) + tool + grp.slice(c); }
      s = s.slice(0, gs) + s.slice(ge);
      if (o["front" + side]) {
        /* draw the arm in front of the head (raised arms) */
        var hi = s.indexOf('<g class="kc-head"'), he = groupEnd(s, hi);
        s = s.slice(0, he) + grp + s.slice(he);
      } else {
        s = s.slice(0, gs) + grp + s.slice(gs);
      }
    });
    if (o.hat || o.hearts) {
      var h = s.indexOf('<g class="kc-head"'), hend = groupEnd(s, h);
      if (h > 0 && hend > 0) s = s.slice(0, hend - 4) + (o.hearts ? heartsMarkup(id) : "") + (o.hat ? hatMarkup() : "") + s.slice(hend - 4);
    }
    return s;
  }

  /* ------------------------------------------------------------ shared kitchen drawings (our own) */
  function undoIconSVG() {
    return svg("0 0 40 40", '<path d="M14 9 L6 16 L14 23" fill="none" stroke="' + INK + '" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="M7 16 L24 16 C31 16 35 21 35 26 C35 31 31 35 24 35 L16 35" fill="none" stroke="' + INK + '" stroke-width="4" stroke-linecap="round"/>');
  }
  function heartSmallSVG() {
    return svg("0 0 40 40", '<path d="M20 34 C6 25 3 16 8 10 C12 5 18 7 20 12 C22 7 28 5 32 10 C37 16 34 25 20 34 Z" fill="#ff6f9f" stroke="' + INK + '" stroke-width="3.2" stroke-linejoin="round"/>' +
      '<path d="M11 13 C12 11 14 10 16 11" stroke="#fff" stroke-width="2.6" fill="none" stroke-linecap="round"/>');
  }
  function sparkIconSVG() {
    return svg("0 0 40 40", '<path d="M20 3 C22 14 26 18 37 20 C26 22 22 26 20 37 C18 26 14 22 3 20 C14 18 18 14 20 3 Z" fill="#ffc94a" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>');
  }
  function arrowIconSVG() {
    return svg("0 0 40 40", '<path d="M14 8 L28 20 L14 32" fill="none" stroke="' + INK + '" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>');
  }
  function penIconSVG(col) {
    return svg("0 0 100 100", '<g transform="rotate(35 50 50)">' + R(38, 6, 24, 62, 8, "#fff", 5) + Pa("M38 66 L62 66 L50 94 Z", col, 5) + R(38, 20, 24, 14, 4, col, 0) + "</g>");
  }
  function plateIconSVG(col) { return svg("0 0 100 100", E(50, 58, 46, 30, col, 5) + E(50, 54, 30, 17, "#fff", 0, ' opacity=".5"')); }

  /* The plate under the finished treat, in stage units (800 x 800). */
  function plateLayer(col) { return svg("0 0 800 800", plateInner(col)); }

  function bowlArt(p, batter) {
    return svg("0 0 360 250",
      "<defs>" + '<clipPath id="' + p + 'in"><ellipse cx="180" cy="72" rx="160" ry="42"/></clipPath>' +
      '<linearGradient id="' + p + 'bg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#9fdcff"/><stop offset="1" stop-color="#6fc1f2"/></linearGradient></defs>' +
      E(180, 236, 120, 12, "#3b2a33", 0, ' opacity=".16"') +
      E(180, 72, 164, 45, "#d7f0fd", 0) +
      '<g clip-path="url(#' + p + 'in)"><g class="ck-bat"' + (batter ? "" : ' style="display:none"') + ">" +
      E(180, 84, 150, 40, batter || "#fff3d6", 4, ' class="ck-batc"') +
      '<g class="ck-swirl" style="transform-origin:180px 84px;transform-box:view-box">' +
      Pa("M90 84 C120 60 160 104 200 80 S 250 70 270 88", "none", 0, ' stroke="#fff" stroke-width="10" stroke-linecap="round" opacity=".75"') +
      Pa("M110 100 C150 90 190 112 240 98", "none", 0, ' stroke="#fff" stroke-width="7" stroke-linecap="round" opacity=".5"') + "</g>" +
      '<g class="ck-lumps"></g></g></g>' +
      Pa("M14 72 A166 46 0 0 0 346 72 C346 170 272 230 180 230 C88 230 14 170 14 72 Z", "url(#" + p + "bg)", 6) +
      HL("M44 112 C62 168 110 198 150 206", 10, 0.55) +
      C(90, 150, 9, "#fff", 0, ' opacity=".85"') + C(150, 186, 9, "#fff", 0, ' opacity=".85"') + C(230, 186, 9, "#fff", 0, ' opacity=".85"') + C(290, 150, 9, "#fff", 0, ' opacity=".85"') +
      E(180, 72, 168, 48, "none", 6));
  }
  function spoonArt() {
    return svg("0 0 70 230",
      R(26, 6, 18, 150, 9, "#f6c891", 5) + E(35, 186, 30, 40, "#f6c891", 5) + E(35, 184, 17, 25, "#e9ad6c", 0, ' opacity=".7"') + C(35, 22, 5, "#ff8fb4", 3));
  }
  /* a big, easy-to-see spoon for things she drags (wide bowl, thick handle). inner: what is in the bowl (svg) */
  function bigSpoonArt(metal, inner) {
    return svg("0 0 100 230",
      R(36, 6, 28, 136, 14, metal, 5) + E(50, 184, 46, 42, metal, 5) + (inner || "") + C(50, 24, 7, "#ff8fb4", 3));
  }
  function jugArt(col) {
    return svg("0 0 170 200",
      Pa("M120 60 C160 60 164 120 128 130", "none", 0, ' stroke="' + INK + '" stroke-width="22" stroke-linecap="round"') +
      Pa("M120 60 C160 60 164 120 128 130", "none", 0, ' stroke="#ff9cc2" stroke-width="10" stroke-linecap="round"') +
      Pa("M24 30 L8 20 L40 18 L126 20 L120 170 Q118 190 98 190 L46 190 Q26 190 24 170 Z", "#eaf8ff", 5) +
      Pa("M30 80 L118 80 L114 168 Q113 182 98 182 L46 182 Q31 182 30 168 Z", col, 0) +
      Pa("M24 30 L8 20 L40 18 L126 20 L120 170 Q118 190 98 190 L46 190 Q26 190 24 170 Z", "none", 5) +
      HL("M40 40 L44 170", 8, 0.75) + C(76, 132, 14, "#fff", 3) + Pa("M70 132 L82 132 M76 126 L76 138", "none", 0, ' stroke="#ff6f9f" stroke-width="4" stroke-linecap="round"'));
  }
  function trayArt(inner) {
    return svg("0 0 320 140", R(8, 92, 304, 30, 14, "#cfd8e6", 5) + R(24, 98, 272, 12, 6, "#b8c4d6", 0) + '<g class="ck-tin">' + (inner || "") + "</g>");
  }
  function ovenArt(p) {
    return svg("0 0 360 330",
      '<defs><radialGradient id="' + p + 'glow" cx=".5" cy=".55" r=".6"><stop offset="0" stop-color="#ffdc7a"/><stop offset=".6" stop-color="#ff9a4a"/><stop offset="1" stop-color="#ff7a3a"/></radialGradient></defs>' +
      E(180, 322, 150, 9, "#3b2a33", 0, ' opacity=".16"') +
      R(6, 6, 348, 312, 36, "#ff8fb4", 6) +
      R(22, 18, 316, 50, 18, "#ffe4ee", 4) +
      C(56, 43, 10, "#fff", 4, ' class="ck-dot"') + C(88, 43, 10, "#fff", 4, ' class="ck-dot"') + C(120, 43, 10, "#fff", 4, ' class="ck-dot"') +
      C(300, 43, 16, "#ffc94a", 4) + Pa("M300 43 L300 31", "none", 4) +
      R(30, 84, 300, 214, 24, "#fff8ef", 6) +
      R(64, 112, 232, 140, 18, "#5a3d4c", 5) +
      R(64, 112, 232, 140, 18, "url(#" + p + 'glow)', 0, ' class="ck-glow" opacity="0"') +
      HL("M90 230 L130 130 M122 238 L156 156", 9, 0.4) +
      R(110, 92, 140, 14, 7, "#ff6f9f", 4) +
      HL("M26 60 C20 140 20 220 26 290", 8, 0.45));
  }
  function fridgeArt() {
    return svg("0 0 300 420",
      E(150, 412, 120, 8, "#3b2a33", 0, ' opacity=".16"') +
      R(10, 8, 280, 396, 40, "#bfe7ff", 6) + Pa("M10 150 L290 150", "none", 6) +
      R(238, 50, 18, 70, 9, "#fff", 4) + R(238, 180, 18, 110, 9, "#fff", 4) +
      '<g class="ck-glow" opacity="0">' + R(30, 170, 190, 210, 24, "#e9fbff", 0) + "</g>" +
      C(70, 80, 16, "#ff9cc2", 4) + Pa("M62 80 L78 80 M70 72 L70 88", "none", 0, ' stroke="#fff" stroke-width="4" stroke-linecap="round"') +
      HL("M30 40 L30 130 M30 180 L30 380", 9, 0.6) +
      '<g class="ck-dots">' + C(110, 80, 9, "#fff", 4, ' class="ck-dot"') + C(140, 80, 9, "#fff", 4, ' class="ck-dot"') + C(170, 80, 9, "#fff", 4, ' class="ck-dot"') + "</g>");
  }
  function pipingArt(col) {
    return svg("0 0 130 220",
      Pa("M14 20 C40 4 90 4 116 20 L76 190 Q65 206 54 190 Z", "#eaf8ff", 5) +
      Pa("M30 70 L100 70 L76 188 Q65 200 54 188 Z", col, 0) +
      Pa("M14 20 C40 4 90 4 116 20 L76 190 Q65 206 54 190 Z", "none", 5) +
      Pa("M50 186 L80 186 L72 214 L58 214 Z", "#cfd8e6", 4) + HL("M34 30 L58 170", 7, 0.7) + R(10, 10, 110, 22, 11, "#ff9cc2", 5));
  }
  function pinArt() {
    return svg("0 0 380 80",
      R(6, 26, 64, 28, 14, "#e2a464", 5) + R(310, 26, 64, 28, 14, "#e2a464", 5) +
      R(60, 8, 260, 64, 32, "#f6c891", 6) + HL("M90 24 L290 24", 8, 0.7) + C(36, 40, 5, "#ff8fb4", 0) + C(344, 40, 5, "#ff8fb4", 0));
  }
  function shakerArt(col, dots) {
    return svg("0 0 120 170",
      R(18, 44, 84, 118, 22, "#fff", 5) + R(26, 80, 68, 72, 14, col, 0, ' opacity=".9"') + (dots || "") +
      Pa("M16 50 C16 14 104 14 104 50 Z", "#ff9cc2", 5) +
      C(44, 34, 3.5, INK, 0) + C(60, 26, 3.5, INK, 0) + C(76, 34, 3.5, INK, 0) + HL("M30 60 L30 150", 7, 0.7));
  }
  function bottleArt(col) {
    return svg("0 0 120 220",
      Pa("M38 10 L82 10 L82 40 C110 54 112 80 110 110 L104 200 Q102 214 88 214 L32 214 Q18 214 16 200 L10 110 C8 80 10 54 38 40 Z", col, 5) +
      R(34, 2, 52, 22, 8, "#fff", 5) + E(60, 140, 30, 34, "#fff", 4) + Pa("M60 160 C44 146 46 128 60 136 C74 128 76 146 60 160 Z", "#ff6f9f", 3) + HL("M26 90 L30 190", 8, 0.6));
  }
  function glassArt(inner) {
    return svg("0 0 220 320",
      Pa("M20 20 L200 20 L176 250 Q170 270 150 270 L70 270 Q50 270 44 250 Z", "#eaf8ff", 0, ' opacity=".9"') +
      '<g class="ck-gin">' + (inner || "") + "</g>" +
      Pa("M20 20 L200 20 L176 250 Q170 270 150 270 L70 270 Q50 270 44 250 Z", "none", 6) +
      R(80, 268, 60, 26, 6, "#eaf8ff", 5) + E(110, 302, 66, 14, "#eaf8ff", 5) + HL("M44 40 L62 240", 9, 0.75));
  }
  function steamPuff() { return svg("0 0 100 80", E(50, 40, 46, 34, "#fff", 0, ' opacity=".95"')); }

  /* ------------------------------------------------------------ decorations (each drawn in a 100 x 100 box) */
  function heartPath(cx, cy, s) {
    return "M" + cx + " " + (cy + 30 * s) + " C" + (cx - 40 * s) + " " + (cy + 4 * s) + " " + (cx - 34 * s) + " " + (cy - 26 * s) + " " + (cx - 14 * s) + " " + (cy - 24 * s) +
      " C" + (cx - 6 * s) + " " + (cy - 24 * s) + " " + cx + " " + (cy - 16 * s) + " " + cx + " " + (cy - 10 * s) +
      " C" + cx + " " + (cy - 16 * s) + " " + (cx + 6 * s) + " " + (cy - 24 * s) + " " + (cx + 14 * s) + " " + (cy - 24 * s) +
      " C" + (cx + 34 * s) + " " + (cy - 26 * s) + " " + (cx + 40 * s) + " " + (cy + 4 * s) + " " + cx + " " + (cy + 30 * s) + " Z";
  }
  function starPath(cx, cy, r, ri) {
    var d = "";
    for (var i = 0; i < 10; i++) {
      var a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? (ri || r * 0.48) : r;
      d += (i ? " L" : "M") + (cx + Math.cos(a) * rr).toFixed(1) + " " + (cy + Math.sin(a) * rr).toFixed(1);
    }
    return d + " Z";
  }
  function bowInner(col) {
    return Pa("M50 50 C30 22 8 30 12 50 C14 66 34 68 50 54 Z", col, 4) + Pa("M50 50 C70 22 92 30 88 50 C86 66 66 68 50 54 Z", col, 4) +
      Pa("M24 40 Q30 34 36 40 M76 40 Q70 34 64 40", "none", 0, ' stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".7"') + C(50, 52, 9, col, 4);
  }
  function candle(col, stripe) {
    return R(40, 34, 20, 60, 6, col, 4) + Pa("M40 48 L60 40 M40 64 L60 56 M40 80 L60 72", "none", 0, ' stroke="' + stripe + '" stroke-width="5"') +
      Pa("M50 30 L50 36", "none", 3) +
      '<path d="M50 4 C60 16 60 26 50 30 C40 26 40 16 50 4 Z" fill="#ffc94a" ' + st(3.5) + ' class="ck-flame" style="transform-origin:50px 30px;transform-box:view-box"/>' +
      Pa("M50 15 C53 20 53 24 50 26 C47 24 47 20 50 15 Z", "#fff", 0);
  }
  var DECO = {
    /* fruit */
    strawberry: { cat: "fruit", name: "strawberry", d: function () { return Pa("M50 92 C22 80 10 52 18 36 C30 24 70 24 82 36 C90 52 78 80 50 92 Z", "#ff5a7a", 4) + Pa("M30 30 L40 18 L50 28 L60 18 L70 30 L50 36 Z", "#63d3b3", 4) + '<g fill="#fff3b0"><ellipse cx="36" cy="48" rx="3" ry="4"/><ellipse cx="54" cy="46" rx="3" ry="4"/><ellipse cx="66" cy="58" rx="3" ry="4"/><ellipse cx="44" cy="64" rx="3" ry="4"/><ellipse cx="56" cy="76" rx="3" ry="4"/></g>'; } },
    cherry: { cat: "fruit", name: "cherries", d: function () { return Pa("M34 64 C38 40 48 22 66 10 M66 64 C66 40 66 26 66 10", "none", 0, ' stroke="#3a9b6e" stroke-width="5" stroke-linecap="round"') + Pa("M66 10 C78 6 88 12 90 20 C80 24 70 20 66 10 Z", "#63d3b3", 3.5) + C(32, 72, 20, "#e8344f", 4) + C(68, 72, 20, "#e8344f", 4) + C(25, 65, 5, "#fff", 0, ' opacity=".8"') + C(61, 65, 5, "#fff", 0, ' opacity=".8"'); } },
    blueberry: { cat: "fruit", name: "blueberries", d: function () { return C(32, 62, 18, "#5b6fd6", 4) + C(66, 60, 18, "#4c5fc4", 4) + C(50, 34, 18, "#6a7fe6", 4) + Pa("M44 30 L56 30 M50 24 L50 36 M26 58 L38 58 M60 56 L72 56", "none", 0, ' stroke="#2e3a7a" stroke-width="3" stroke-linecap="round"'); } },
    kiwi: { cat: "fruit", name: "kiwi", d: function () { var s = ""; for (var i = 0; i < 10; i++) { var a = i * Math.PI / 5; s += E((50 + Math.cos(a) * 22).toFixed(1), (50 + Math.sin(a) * 22).toFixed(1), 2.5, 4, INK, 0, ' transform="rotate(' + (i * 36 + 90) + " " + (50 + Math.cos(a) * 22).toFixed(1) + " " + (50 + Math.sin(a) * 22).toFixed(1) + ')"'); } return C(50, 50, 42, "#9b7a4c", 4) + C(50, 50, 35, "#8fd16a", 0) + C(50, 50, 13, "#f4f7d0", 0) + s; } },
    orange: { cat: "fruit", name: "orange slice", d: function () { var s = ""; for (var i = 0; i < 8; i++) { var a = i * Math.PI / 4; s += Pa("M50 50 L" + (50 + Math.cos(a) * 34).toFixed(1) + " " + (50 + Math.sin(a) * 34).toFixed(1), "none", 0, ' stroke="#fff3c4" stroke-width="4"'); } return C(50, 50, 42, "#ffa63d", 4) + C(50, 50, 35, "#ffcf6e", 0) + s + C(50, 50, 6, "#fff3c4", 0); } },
    banana: { cat: "fruit", name: "banana slice", d: function () { return C(50, 50, 38, "#fff3b0", 4) + C(50, 50, 30, "#fffbe0", 0) + C(50, 50, 12, "#f3e3a0", 0) + C(50, 36, 3, "#b48a4a", 0) + C(38, 58, 3, "#b48a4a", 0) + C(62, 58, 3, "#b48a4a", 0); } },
    raspberry: { cat: "fruit", name: "raspberry", d: function () { var s = ""; [[38, 40], [54, 36], [66, 48], [44, 56], [60, 62], [34, 66], [50, 74], [66, 74]].forEach(function (q) { s += C(q[0], q[1], 11, "#ff4f86", 3.5); }); return s + Pa("M40 26 L50 18 L60 26", "#63d3b3", 3.5); } },
    /* sweets */
    candy: { cat: "sweets", name: "candy", d: function () { return Pa("M28 50 L8 34 L10 66 Z M72 50 L92 34 L90 66 Z", "#a98bff", 4) + C(50, 50, 24, "#ffc94a", 4) + Pa("M34 40 C44 30 60 34 64 44 M36 58 C46 66 58 64 66 56", "none", 0, ' stroke="#ff6f9f" stroke-width="6" stroke-linecap="round"'); } },
    choco: { cat: "sweets", name: "chocolate", d: function () { return Pa("M20 30 L80 22 L86 74 L26 82 Z", "#8a5a3c", 4) + Pa("M50 26 L56 78 M23 56 L83 48", "none", 3.5) + Pa("M26 36 L44 34 L46 52 L28 54 Z", "#a8714f", 0) + Pa("M56 32 L74 30 L76 48 L58 50 Z", "#a8714f", 0); } },
    marshmallow: { cat: "sweets", name: "marshmallow", d: function () { return R(20, 30, 60, 44, 18, "#ffd9e8", 4) + E(50, 34, 30, 9, "#fff", 4) + HL("M28 50 L28 64", 5, 0.8); } },
    lollipop: { cat: "sweets", name: "lollipop", d: function () { return R(46, 50, 8, 46, 4, "#fff", 3.5) + C(50, 36, 30, "#ff8fb4", 4) + Pa("M50 36 m-18 0 a18 18 0 1 1 18 18 a10 10 0 1 1 -10 -10 a4 4 0 1 1 4 4", "none", 0, ' stroke="#fff" stroke-width="5" stroke-linecap="round"'); } },
    gummy: { cat: "sweets", name: "gummy bear", d: function () { return C(32, 22, 10, "#63d3b3", 4) + C(68, 22, 10, "#63d3b3", 4) + E(50, 40, 24, 22, "#63d3b3", 4) + E(50, 72, 28, 24, "#63d3b3", 4) + C(42, 38, 3, INK, 0) + C(58, 38, 3, INK, 0) + E(50, 47, 5, 3.5, INK, 0) + HL("M34 64 L36 78", 5, 0.7); } },
    wafer: { cat: "sweets", name: "wafer stick", sz: 1.15, d: function () { return '<g transform="rotate(-30 50 50)">' + R(40, 4, 20, 92, 6, "#f3c47a", 4) + Pa("M40 20 L60 30 M40 36 L60 46 M40 52 L60 62 M40 68 L60 78", "none", 0, ' stroke="#c98a3e" stroke-width="3"') + "</g>"; } },
    minimac: { cat: "sweets", name: "little macaron", d: function () { return E(50, 36, 34, 16, "#b9a7ff", 4) + R(18, 42, 64, 12, 6, "#fff", 4) + E(50, 64, 34, 16, "#b9a7ff", 4) + HL("M30 32 L44 28", 4, 0.8); } },
    cookie: { cat: "sweets", name: "cookie", d: function () { return C(50, 50, 38, "#e3a964", 4) + C(36, 40, 5, "#6b4430", 0) + C(60, 34, 5, "#6b4430", 0) + C(62, 60, 5, "#6b4430", 0) + C(42, 64, 5, "#6b4430", 0) + C(50, 50, 3, "#6b4430", 0); } },
    /* cute */
    bow: { cat: "cute", name: "Red bow", d: function () { return bowInner("#e8203f"); } },
    pinkbow: { cat: "cute", name: "pink bow", d: function () { return bowInner("#ff8fb4"); } },
    kittyface: { cat: "cute", name: "Mimi face", sz: 1.15, d: function () { return window.KittyChars && window.KittyChars.headInner ? '<g transform="translate(4 6) scale(.92)">' + window.KittyChars.headInner("kitty") + "</g>" : C(50, 52, 40, "#fff", 4) + bowInner("#e8203f"); } },
    heart: { cat: "cute", name: "heart", d: function () { return Pa(heartPath(50, 52, 1.2), "#ff6f9f", 4) + HL("M28 36 C30 30 36 28 40 30", 4, 0.8); } },
    star: { cat: "cute", name: "star", d: function () { return Pa(starPath(50, 52, 44), "#ffc94a", 4) + HL("M42 30 L48 22", 4, 0.8); } },
    flower: { cat: "cute", name: "flower", d: function () { var s = ""; for (var i = 0; i < 5; i++) { var a = i * Math.PI * 2 / 5 - Math.PI / 2; s += C((50 + Math.cos(a) * 24).toFixed(1), (50 + Math.sin(a) * 24).toFixed(1), 18, "#ffb3d1", 4); } return s + C(50, 50, 14, "#ffc94a", 4); } },
    crown: { cat: "cute", name: "crown", d: function () { return Pa("M14 74 L10 30 L32 50 L50 20 L68 50 L90 30 L86 74 Z", "#ffc94a", 4) + R(14, 70, 72, 14, 5, "#ffb13d", 4) + C(50, 46, 6, "#ff6f9f", 3) + C(10, 30, 5, "#a98bff", 3) + C(90, 30, 5, "#a98bff", 3) + C(50, 20, 5, "#63d3b3", 3); } },
    rainbow: { cat: "cute", name: "rainbow", d: function () { var c = ["#ff6f9f", "#ffc94a", "#63d3b3", "#74c8ff"], s = ""; c.forEach(function (k, i) { var r = 40 - i * 9; s += Pa("M" + (50 - r) + " 70 A" + r + " " + r + " 0 0 1 " + (50 + r) + " 70", "none", 0, ' stroke="' + INK + '" stroke-width="11"') + Pa("M" + (50 - r) + " 70 A" + r + " " + r + " 0 0 1 " + (50 + r) + " 70", "none", 0, ' stroke="' + k + '" stroke-width="6"'); }); return s + E(14, 72, 12, 8, "#fff", 3.5) + E(86, 72, 12, 8, "#fff", 3.5); } },
    cloud: { cat: "cute", name: "cloud", d: function () { return Pa("M22 70 C8 70 8 50 22 48 C22 30 44 24 52 38 C58 26 80 30 78 48 C94 50 92 70 78 70 Z", "#fff", 4) + C(40, 56, 3, INK, 0) + C(60, 56, 3, INK, 0) + Pa("M46 62 Q50 66 54 62", "none", 3); } },
    moon: { cat: "cute", name: "moon", d: function () { return Pa("M62 10 C36 14 22 40 30 64 C38 86 66 94 86 80 C60 82 44 62 48 40 C50 26 56 16 62 10 Z", "#ffe27a", 4); } },
    /* party */
    candlepink: { cat: "party", name: "pink candle", stand: 1, sz: 1.2, d: function () { return candle("#ff9cc2", "#fff"); } },
    candleblue: { cat: "party", name: "blue candle", stand: 1, sz: 1.2, d: function () { return candle("#9fdcff", "#fff"); } },
    candlegold: { cat: "party", name: "yellow candle", stand: 1, sz: 1.2, d: function () { return candle("#ffe27a", "#ff8fb4"); } },
    flag: { cat: "party", name: "flag", stand: 1, sz: 1.15, d: function () { return R(28, 10, 6, 86, 3, "#fff", 3.5) + Pa("M34 14 L86 28 L34 46 Z", "#63d3b3", 4) + C(52, 29, 5, "#fff", 0); } },
    umbrella: { cat: "party", name: "umbrella", stand: 1, sz: 1.15, d: function () { return Pa("M50 40 L50 94", "none", 0, ' stroke="' + INK + '" stroke-width="5" stroke-linecap="round"') + Pa("M8 44 C10 10 90 10 92 44 C82 36 72 36 64 44 C58 36 42 36 36 44 C28 36 18 36 8 44 Z", "#ff8fb4", 4) + Pa("M36 44 C38 24 50 14 50 14 C50 14 62 24 64 44", "none", 0, ' stroke="#fff" stroke-width="4"'); } },
    sparkler: { cat: "party", name: "sparkle pick", stand: 1, sz: 1.15, d: function () { return R(47, 40, 6, 56, 3, "#cfd8e6", 3) + Pa(starPath(50, 26, 24, 10), "#ffe27a", 4) + C(20, 14, 4, "#ff8fb4", 0) + C(82, 18, 4, "#74c8ff", 0) + C(76, 44, 4, "#63d3b3", 0); } },
    /* pizza toppings */
    pepperoni: { cat: "tops", name: "pepperoni", d: function () { return C(50, 50, 36, "#d9473f", 4) + C(38, 40, 5, "#f08a7c", 0) + C(60, 44, 4, "#f08a7c", 0) + C(48, 62, 5, "#f08a7c", 0) + C(64, 62, 3, "#f08a7c", 0); } },
    mushroom: { cat: "tops", name: "mushroom", d: function () { return Pa("M14 50 C14 20 86 20 86 50 Z", "#e9d3b7", 4) + R(38, 48, 24, 36, 10, "#f6ead8", 4) + HL("M28 40 C34 30 44 28 52 28", 4, 0.8); } },
    olive: { cat: "tops", name: "olive", d: function () { return C(50, 50, 30, "#3d3a40", 4) + C(50, 50, 12, "#ffd3c4", 0) + HL("M30 40 C32 34 36 30 42 28", 4, 0.6); } },
    pepper: { cat: "tops", name: "green pepper", d: function () { return Pa("M50 14 C80 14 88 40 82 60 C76 84 24 84 18 60 C12 40 20 14 50 14 Z", "none", 0, ' stroke="' + INK + '" stroke-width="18"') + Pa("M50 14 C80 14 88 40 82 60 C76 84 24 84 18 60 C12 40 20 14 50 14 Z", "none", 0, ' stroke="#5fbf5a" stroke-width="10"'); } },
    basil: { cat: "tops", name: "basil leaf", d: function () { return Pa("M14 80 C20 30 60 14 88 16 C84 50 60 86 14 80 Z", "#45b06a", 4) + Pa("M16 78 C40 60 60 40 84 20", "none", 0, ' stroke="#2d7a47" stroke-width="3.5" stroke-linecap="round"'); } },
    pineapple: { cat: "tops", name: "pineapple", d: function () { return Pa("M14 30 L86 30 L60 86 L40 86 Z", "#ffd84a", 4) + Pa("M30 40 L50 76 M70 40 L50 76", "none", 0, ' stroke="#e3a92a" stroke-width="3.5"') + R(12, 18, 76, 14, 6, "#ffe98a", 4); } },
    tomato: { cat: "tops", name: "tomato", d: function () { return C(50, 50, 38, "#ff5a5a", 4) + C(50, 50, 28, "#ff8b7a", 0) + E(38, 42, 6, 8, "#ffe0a0", 0) + E(62, 42, 6, 8, "#ffe0a0", 0) + E(50, 64, 8, 6, "#ffe0a0", 0); } },
    corn: { cat: "tops", name: "corn", d: function () { return C(36, 40, 13, "#ffd84a", 3.5) + C(62, 36, 13, "#ffd84a", 3.5) + C(48, 62, 13, "#ffd84a", 3.5) + C(72, 62, 11, "#ffd84a", 3.5); } },
    /* bento face pieces (cut from seaweed, ham and egg) */
    eyes: { cat: "face", name: "eyes", sz: 0.95, d: function () { return E(28, 50, 9, 13, INK, 0) + E(72, 50, 9, 13, INK, 0) + C(31, 45, 3, "#fff", 0) + C(75, 45, 3, "#fff", 0); } },
    nose: { cat: "face", name: "nose", sz: 0.6, d: function () { return E(50, 50, 22, 16, "#ffc94a", 5); } },
    whisk_l: { cat: "face", name: "left whiskers", d: function () { return Pa("M90 34 L14 22 M90 50 L10 50 M90 66 L14 78", "none", 0, ' stroke="' + INK + '" stroke-width="7" stroke-linecap="round"'); } },
    whisk_r: { cat: "face", name: "right whiskers", d: function () { return Pa("M10 34 L86 22 M10 50 L90 50 M10 66 L86 78", "none", 0, ' stroke="' + INK + '" stroke-width="7" stroke-linecap="round"'); } },
    cheeks: { cat: "face", name: "pink cheeks", d: function () { return E(22, 50, 16, 10, "#ff9cc2", 0) + E(78, 50, 16, 10, "#ff9cc2", 0); } },
    smile: { cat: "face", name: "smile", sz: 0.8, d: function () { return Pa("M20 40 Q35 62 50 42 Q65 62 80 40", "none", 0, ' stroke="' + INK + '" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"'); } },
    /* bento sides */
    octopus: { cat: "sides", name: "sausage octopus", d: function () { return Pa("M22 56 C22 18 78 18 78 56 L84 86 L72 70 L64 90 L56 70 L50 92 L44 70 L36 90 L28 70 L16 86 Z", "#ff7a6b", 4) + C(40, 46, 4, INK, 0) + C(60, 46, 4, INK, 0) + E(50, 58, 6, 4, "#d9473f", 0); } },
    tamago: { cat: "sides", name: "egg roll", d: function () { return R(12, 28, 76, 48, 14, "#ffdb5c", 4) + Pa("M22 40 C34 34 46 46 56 38 C66 32 74 42 78 40 M22 58 C34 52 46 64 56 56 C66 50 74 60 78 58", "none", 0, ' stroke="#f0b83a" stroke-width="4"'); } },
    broccoli: { cat: "sides", name: "broccoli", d: function () { return R(42, 54, 16, 36, 6, "#8fd16a", 4) + C(30, 42, 18, "#45b06a", 4) + C(70, 42, 18, "#45b06a", 4) + C(50, 30, 20, "#45b06a", 4); } },
    minitomato: { cat: "sides", name: "cherry tomato", d: function () { return C(50, 56, 34, "#ff4f4f", 4) + Pa("M36 26 L50 34 L64 26 L56 38 L44 38 Z", "#45b06a", 3.5) + C(38, 46, 6, "#fff", 0, ' opacity=".7"'); } },
    carrot: { cat: "sides", name: "carrot flower", d: function () { var s = ""; for (var i = 0; i < 5; i++) { var a = i * Math.PI * 2 / 5 - Math.PI / 2; s += C((50 + Math.cos(a) * 22).toFixed(1), (50 + Math.sin(a) * 22).toFixed(1), 17, "#ff9a3c", 4); } return s + C(50, 50, 16, "#ff9a3c", 0) + C(50, 50, 8, "#ffc27a", 0); } },
    edamame: { cat: "sides", name: "green beans", d: function () { return Pa("M14 60 C14 36 40 30 50 40 C60 30 86 36 86 60 C70 76 30 76 14 60 Z", "#8fd16a", 4) + C(32, 56, 8, "#b8e88f", 0) + C(50, 54, 8, "#b8e88f", 0) + C(68, 56, 8, "#b8e88f", 0); } },
    /* drink */
    straw: { cat: "drink", name: "pink straw", stand: 1, sz: 1.5, d: function () { return '<g transform="rotate(12 50 50)">' + R(42, 2, 16, 96, 7, "#ff8fb4", 4) + Pa("M42 20 L58 28 M42 40 L58 48 M42 60 L58 68 M42 80 L58 88", "none", 0, ' stroke="#fff" stroke-width="4"') + "</g>"; } },
    strawb: { cat: "drink", name: "blue straw", stand: 1, sz: 1.5, d: function () { return '<g transform="rotate(-12 50 50)">' + R(42, 2, 16, 96, 7, "#74c8ff", 4) + Pa("M42 14 L58 14 M42 34 L58 34 M42 54 L58 54 M42 74 L58 74", "none", 0, ' stroke="#fff" stroke-width="5"') + "</g>"; } },
    heartstraw: { cat: "drink", name: "heart straw", stand: 1, sz: 1.5, d: function () { return R(45, 34, 10, 64, 5, "#a98bff", 4) + Pa(heartPath(50, 26, 0.7), "#ff6f9f", 4); } },
    lemon: { cat: "drink", name: "lemon slice", d: function () { var s = ""; for (var i = 0; i < 8; i++) { var a = i * Math.PI / 4; s += Pa("M50 50 L" + (50 + Math.cos(a) * 32).toFixed(1) + " " + (50 + Math.sin(a) * 32).toFixed(1), "none", 0, ' stroke="#fffbe0" stroke-width="4"'); } return C(50, 50, 40, "#ffe14a", 4) + C(50, 50, 33, "#fff08a", 0) + s; } },
    pearlcup: { cat: "drink", name: "jelly cubes", d: function () { return R(16, 40, 30, 30, 6, "#9fdcff", 4) + R(52, 30, 30, 30, 6, "#ffb3d1", 4) + R(36, 58, 30, 30, 6, "#c7f0a8", 4); } },
    cream: { cat: "drink", name: "whipped cream", d: function () { return Pa("M14 80 C4 64 20 50 30 54 C26 34 48 26 54 40 C60 22 84 30 80 50 C96 54 94 76 84 80 Z", "#fff", 4) + HL("M30 64 C36 58 44 58 50 62", 4, 0.0); } }
  };
  function decoSVG(k) { var d = DECO[k]; return svg("0 0 100 100", d ? d.d() : ""); }

  /* Sprinkle shakers. Each scatters little pieces where she shakes it. */
  var SPRINKLES = {
    rainbow: { name: "rainbow sprinkles", col: "#ffd3e2", piece: function (i) { var c = ["#ff6f9f", "#63d3b3", "#ffc94a", "#a98bff", "#74c8ff"][i % 5]; return { w: 26, h: 10, html: svg("0 0 26 10", R(2, 2, 22, 6, 3, c, 0)) }; } },
    hearts: { name: "heart sprinkles", col: "#ffc3da", piece: function (i) { var c = ["#ff6f9f", "#ff3d7f", "#ffb3d1"][i % 3]; return { w: 20, h: 20, html: svg("0 0 100 100", Pa(heartPath(50, 52, 1.4), c, 0)) }; } },
    stars: { name: "star sprinkles", col: "#fff1b8", piece: function (i) { var c = ["#ffc94a", "#ffe27a", "#fff"][i % 3]; return { w: 22, h: 22, html: svg("0 0 100 100", Pa(starPath(50, 52, 46), c, 6)) }; } },
    pearls: { name: "pearl sprinkles", col: "#eef0ff", piece: function () { return { w: 14, h: 14, html: svg("0 0 20 20", C(10, 10, 8, "#f4f4ff", 2.5) + C(7, 7, 2.5, "#fff", 0)) }; } },
    chips: { name: "chocolate chips", col: "#e9cbb5", piece: function () { return { w: 16, h: 16, html: svg("0 0 20 20", Pa("M10 2 C14 8 18 12 18 15 C18 19 2 19 2 15 C2 12 6 8 10 2 Z", "#6b4430", 0)) }; } },
    confetti: { name: "confetti", col: "#d9f6ec", piece: function (i) { var c = ["#ff6f9f", "#63d3b3", "#ffc94a", "#a98bff"][i % 4]; return { w: 16, h: 16, html: svg("0 0 20 20", C(10, 10, 8, c, 0)) }; } }
  };
  var SPR_ORDER = ["rainbow", "hearts", "stars", "pearls", "chips", "confetti"];
  function shakerIcon(k) {
    var s = SPRINKLES[k], dots = "";
    for (var i = 0; i < 6; i++) { var pc = s.piece(i); dots += '<g transform="translate(' + (34 + (i % 3) * 18) + " " + (94 + Math.floor(i / 3) * 26) + ') scale(.7)">' + pc.html.replace("<svg ", '<svg width="' + pc.w + '" height="' + pc.h + '" ') + "</g>"; }
    return shakerArt(s.col, dots);
  }

  /* Pens for finger-drawn icing lines. */
  var PENS = [["white", "#ffffff"], ["pink", "#ff6f9f"], ["chocolate", "#7a4a33"], ["yellow", "#ffd84a"], ["blue", "#74c8ff"], ["purple", "#a98bff"]];
  /* Plate colours. */
  var PLATES = [["white", "#ffffff"], ["pink", "#ffc3da"], ["mint", "#b7f0df"], ["yellow", "#fff1b8"], ["blue", "#cfeaff"], ["lilac", "#e3d9ff"]];
  /* Drawer categories: an icon and the words Kitty says when the tab is opened. */
  var CATS = {
    ice: { say: "Pick a colour!" },
    spr: { say: "Shake the sprinkles!" },
    fruit: { say: "Yummy fruit!", items: ["strawberry", "cherry", "blueberry", "raspberry", "kiwi", "orange", "banana"] },
    sweets: { say: "Sweets!", items: ["candy", "choco", "marshmallow", "lollipop", "gummy", "wafer", "minimac", "cookie"] },
    cute: { say: "Cute things!", items: ["bow", "pinkbow", "kittyface", "heart", "star", "flower", "crown", "rainbow", "cloud", "moon"] },
    party: { say: "Party time!", items: ["candlepink", "candleblue", "candlegold", "flag", "umbrella", "sparkler"] },
    tops: { say: "Pizza toppings!", items: ["pepperoni", "mushroom", "olive", "pepper", "basil", "pineapple", "tomato", "corn"] },
    face: { say: "Make a face!", items: ["eyes", "bow", "nose", "whisk_l", "whisk_r", "cheeks", "smile", "pinkbow"] },
    sides: { say: "Bento sides!", items: ["octopus", "tamago", "broccoli", "minitomato", "carrot", "edamame"] },
    drink: { say: "Straws and more!", items: ["straw", "strawb", "heartstraw", "lemon", "pearlcup", "cream", "umbrella"] },
    draw: { say: "Pick a pen, then draw with your finger!" },
    plate: { say: "Pick a plate!" }
  };
  function catIcon(cat, R0) {
    if (cat === "ice") return svg("0 0 100 100", Pa("M14 58 C14 24 86 24 86 58 C80 70 74 58 66 70 C58 82 52 62 44 74 C36 86 30 62 22 72 C18 76 14 68 14 58 Z", (R0 && R0.ice[0][1]) || "#ff9cc2", 5));
    if (cat === "spr") return shakerIcon("rainbow");
    if (cat === "draw") return penIconSVG("#ff6f9f");
    if (cat === "plate") return plateIconSVG("#b7f0df");
    return decoSVG(CATS[cat].items[0]);
  }

  /* ------------------------------------------------------------ the running break */
  var G = null;
  var ABORT = { abort: true, toString: function () { return "cook break stopped"; } };
  /* A stopped break cancels its animations on purpose; never report that as an error. */
  window.addEventListener("unhandledrejection", function (e) { if (e.reason === ABORT) e.preventDefault(); });
  function alive(g) { if (!g || g.dead || g !== G) throw ABORT; }
  function later(fn, ms) { var g = G; var t = setTimeout(function () { if (g && !g.dead && g === G) fn(); }, ms); g.timers.push(t); return t; }
  function wait(ms) {
    var g = G;
    return new Promise(function (res, rej) {
      var t = setTimeout(function () { if (g.dead || g !== G) rej(ABORT); else res(); }, ms);
      g.timers.push(t);
    });
  }
  function D(ms) { return reduced() ? 1 : Math.max(1, Math.round(ms * (G ? G.speed : 1))); }

  /* tween: WAAPI with the end state written to style, so later layout is stable. */
  function tween(el, frames, ms, easing) {
    var g = G;
    if (!el || !g) return Promise.resolve();
    var last = frames[frames.length - 1];
    var dur = D(ms);
    return new Promise(function (res, rej) {
      var a;
      try { a = el.animate(frames, { duration: dur, easing: easing || "cubic-bezier(.3,.7,.3,1)", fill: "forwards" }); }
      catch (e) { a = null; }
      var done = function () {
        if (last.transform !== undefined) el.style.transform = last.transform;
        if (last.opacity !== undefined) el.style.opacity = last.opacity;
        try { if (a) a.cancel(); } catch (e) {}
        if (g.dead || g !== G) rej(ABORT); else res();
      };
      if (!a) { done(); return; }
      g.anims.push(a);
      a.finished.then(done, function () { if (g.dead || g !== G) rej(ABORT); else done(); });
    });
  }
  /* a small bounce that never blocks */
  function pop(el, s) {
    if (!el || reduced()) return;
    s = s || 1.12;
    try { var a = el.animate([{ transform: "scale(1)" }, { transform: "scale(" + s + "," + (2 - s) + ")" }, { transform: "scale(" + (2 - s) + "," + s + ")" }, { transform: "scale(1)" }], { duration: 320, easing: "ease-out" }); G.anims.push(a); } catch (e) {}
  }

  function mk(tag, cls, html, parent) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html) e.innerHTML = html;
    (parent || G.el.scene).appendChild(e);
    return e;
  }
  function on(el, type, fn, o) { el.addEventListener(type, fn, o); G.listeners.push([el, type, fn, o]); }
  /* listeners that a single gesture removes again when it is finished */
  function bag() {
    var list = [];
    return {
      on: function (el, type, fn, o) { el.addEventListener(type, fn, o); list.push([el, type, fn, o]); G.listeners.push([el, type, fn, o]); },
      off: function () { list.forEach(function (l) { try { l[0].removeEventListener(l[1], l[2], l[3]); } catch (e) {} }); list = []; }
    };
  }

  /* ------------------------------------------------------------ stage objects (stage units) */
  /* place an object by its bottom-centre point (x, yb) with width w; ratio = height / width */
  function place(e, x, yb, w, ratio) {
    e.style.width = w + "px";
    e.style.left = (x - w / 2) + "px";
    e.style.top = (yb - w * ratio) + "px";
    e._x = x; e._yb = yb; e._w = w; e._r = ratio;
  }
  function O(html, x, yb, w, ratio, ck, cls, parent) {
    var e = mk("div", "ck-o" + (cls ? " " + cls : ""), html, parent);
    place(e, x, yb, w, ratio);
    if (ck) e.setAttribute("data-ck", ck);
    return e;
  }
  /* an invisible round hit area (for parts of one drawing) */
  function HIT(x, y, r, ck) {
    var e = mk("div", "ck-hit ck-z20");
    e.style.left = (x - r) + "px"; e.style.top = (y - r) + "px"; e.style.width = 2 * r + "px"; e.style.height = 2 * r + "px";
    e._x = x; e._y = y;
    if (ck) e.setAttribute("data-ck", ck);
    return e;
  }
  function ctr(el) {
    var r = el.getBoundingClientRect(), s = G.el.stage.getBoundingClientRect(), k = s.width / ST || G.k || 1;
    return { x: (r.left + r.width / 2 - s.left) / k, y: (r.top + r.height / 2 - s.top) / k, w: r.width / k, h: r.height / k };
  }
  function toStage(e) { var s = G.el.stage.getBoundingClientRect(), k = s.width / ST || G.k || 1; return { x: (e.clientX - s.left) / k, y: (e.clientY - s.top) / k }; }
  function inside(pt, el, pad) { var r = ctr(el); pad = pad || 0; return Math.abs(pt.x - r.x) < r.w / 2 + pad && Math.abs(pt.y - r.y) < r.h / 2 + pad; }
  /* move an object to a new place with a smooth arc (FLIP) */
  function flyO(el, x, yb, ms, lift, w) {
    var c0 = ctr(el);
    try { el.getAnimations().forEach(function (a) { a.cancel(); }); } catch (e) {}
    el.style.transform = "";
    place(el, x, yb, w || el._w, el._r);
    var c1 = ctr(el);
    var dx = c0.x - c1.x, dy = c0.y - c1.y, sc = c1.w ? c0.w / c1.w : 1;
    if (reduced()) return Promise.resolve();
    return tween(el, [{ transform: "translate(" + dx + "px," + dy + "px) scale(" + sc + ")" },
      { transform: "translate(" + dx / 2 + "px," + (dy / 2 - (lift || 0)) + "px) scale(" + (sc + 1) / 2 + ")", offset: 0.5 },
      { transform: "none" }], ms || 360, "ease-in-out");
  }
  function fadeOut(el, ms) { if (!el) return Promise.resolve(); return tween(el, [{ opacity: 1 }, { opacity: 0 }], ms || 220).then(function () { el.remove(); }, function () { el.remove(); }); }
  function show(el, ms) { if (!el) return Promise.resolve(); return tween(el, [{ opacity: 0, transform: "scale(.6)" }, { opacity: 1, transform: "none" }], ms || 260, "cubic-bezier(.3,1.5,.5,1)"); }
  /* clear the scene (the room stays) */
  async function newScene() {
    var g = G, old = g.el.scene;
    clearHint();
    var sc = document.createElement("div");
    sc.className = "ck-lay";
    sc.style.pointerEvents = "auto";
    sc.style.width = "0"; sc.style.height = "0";
    g.el.stage.appendChild(sc);
    g.el.scene = sc;
    if (old) { if (reduced()) old.remove(); else await fadeOut(old, 200); }
    alive(g);
    return sc;
  }

  /* ------------------------------------------------------------ particles (stage units) */
  function particle(html, x, y, w, frames, ms, easing) {
    if (reduced() || !G) return;
    var p = mk("div", "ck-p", html, G.el.stage);
    p.style.left = (x - w / 2) + "px"; p.style.top = (y - w / 2) + "px"; p.style.width = w + "px";
    var a;
    try { a = p.animate(frames, { duration: ms, easing: easing || "cubic-bezier(.2,.6,.3,1)", fill: "forwards" }); } catch (e) { p.remove(); return; }
    G.anims.push(a);
    a.finished.then(function () { p.remove(); }, function () { p.remove(); });
  }
  function sparkleSVGc(c) { return svg("0 0 40 40", '<path d="M20 2 C22 14 26 18 38 20 C26 22 22 26 20 38 C18 26 14 22 2 20 C14 18 18 14 20 2 Z" fill="' + c + '" ' + st(2.5) + "/>"); }
  function sparkles(x, y, spread, n) {
    var cols = ["#ffc94a", "#ff8fb4", "#a98bff", "#63d3b3", "#74c8ff"];
    n = Math.min(n || 6, 8);
    for (var i = 0; i < n; i++) {
      var a = (i / n) * Math.PI * 2 - Math.PI / 2;
      var dx = Math.cos(a) * spread, dy = Math.sin(a) * spread * 0.8;
      particle(sparkleSVGc(cols[i % cols.length]), x, y, 44,
        [{ transform: "translate(0,0) scale(.3) rotate(0deg)", opacity: 1 }, { transform: "translate(" + dx + "px," + dy + "px) scale(1) rotate(60deg)", opacity: 1, offset: 0.6 },
          { transform: "translate(" + dx * 1.1 + "px," + (dy * 1.1 - 10) + "px) scale(.6) rotate(90deg)", opacity: 0 }], 600);
    }
  }
  function drops(x, y, color, n, size) {
    n = n || 4;
    for (var i = 0; i < n; i++) {
      var dx = (i - (n - 1) / 2) * 34, s = size || 26;
      particle(svg("0 0 30 30", C(15, 15, 11, color, 4)), x, y, s,
        [{ transform: "translate(0,0) scale(1)", opacity: 1 }, { transform: "translate(" + dx + "px,-70px) scale(.9)", opacity: 1, offset: 0.45 },
          { transform: "translate(" + dx * 1.4 + "px,30px) scale(.5)", opacity: 0 }], 450);
    }
  }
  function steam(x, y, n, spread) {
    n = Math.min(n || 3, 4);
    for (var i = 0; i < n; i++) {
      var dx = (i - (n - 1) / 2) * (spread || 60);
      particle(steamPuff(), x + dx, y, 90,
        [{ transform: "translate(0,0) scale(.5)", opacity: 0 }, { transform: "translate(" + dx * 0.2 + "px,-50px) scale(1)", opacity: 0.95, offset: 0.3 },
          { transform: "translate(" + dx * 0.4 + "px,-150px) scale(1.35)", opacity: 0 }], 700, "ease-out");
    }
  }

  /* ------------------------------------------------------------ speech: one line at a time */
  function say(display, spoken) {
    var g = G;
    if (!g || g.dead) return;
    var q = g.sq;
    q.q = q.q.filter(function (x) { return x.soft !== true; });
    q.q.push({ display: display, spoken: spoken || display });
    if (q.q.length > 2) q.q.splice(0, q.q.length - 2);
    pumpSpeech();
  }
  function speaking() { try { return "speechSynthesis" in window && (speechSynthesis.speaking || speechSynthesis.pending); } catch (e) { return false; } }
  function pumpSpeech() {
    var g = G, q = g.sq;
    if (q.cur) {
      var el = now() - q.cur.t, sp = speaking();
      if (sp) q.cur.saw = true;
      var over = q.cur.saw ? (!sp && el > 250) || el > 4500 : el > q.cur.est;
      if (!over) return;
      q.cur = null;
    }
    var n = q.q.shift();
    if (!n) return;
    q.cur = { t: now(), saw: false, est: Math.min(1400, 300 + n.spoken.length * 50) };
    showBubble(n.display);
    var f = host("speak");
    if (f) { try { f(n.spoken); } catch (e) {} }
  }
  function showBubble(text) {
    var g = G, b = g.el.bub;
    b.firstChild.textContent = text;
    b.setAttribute("data-off", "0");
    fitBubble();
    if (!reduced()) { try { b.animate([{ transform: "scale(.85)", opacity: 0.4 }, { transform: "scale(1)", opacity: 1 }], { duration: 200, easing: "cubic-bezier(.3,1.5,.5,1)" }); } catch (e) {} }
  }
  /* shrink the words until they fit the bubble */
  function fitBubble() {
    var g = G, b = g.el.bub, s = b.firstChild, f = g.bubFont || 18;
    s.style.fontSize = f + "px";
    var guard = 0;
    while (guard++ < 10 && f > 12 && (s.scrollHeight > b.clientHeight - 6 || s.scrollWidth > b.clientWidth - 16)) { f -= 1; s.style.fontSize = f + "px"; }
  }
  function friendName() {
    var n = (window.KittyChars && window.KittyChars.names && window.KittyChars.names[G.friend]) || "our friend";
    return n.replace(/^Hello\s+/, "");
  }

  /* ------------------------------------------------------------ Kitty */
  function kittyShow(pose, o) {
    var g = G, k = g.el.kit;
    if (!k || !window.KittyChars) return;
    g.kpose = pose; g.kopts = o || {};
    /* always her whole body (head, chef hat, body, arms, legs), on every screen size. She only breathes,
       blinks, waves or hops in place (CSS in characters.js); she never walks or does a step for Marie. */
    o = o || {}; o.hat = true;
    k.innerHTML = charMarkup("kitty", pose, o);
  }
  function kittyHappy(ms) {
    var g = G;
    kittyShow("happy");
    if (ms) later(function () { if (!g.served) kittyShow("stand"); }, ms);
  }

  /* ------------------------------------------------------------ hints: a glow, then a pointing hand */
  function touch() {
    var g = G;
    if (!g) return;
    g.lastTouch = now();
    if (g.handOn) { hideHand(); g.handShown = true; }
  }
  function want(o) {
    var g = G;
    clearHint();
    g.cur = o; g.lastTouch = now(); g.handShown = false; g.saidAgain = false;
    mark("want:" + o.mech + ":" + (o.el || ""));
    /* a new instruction in a cooking step: Kitty stands where no prop or button overlaps her (props that
       slide in are checked again once they have arrived) */
    if (g.phase === "cook" && !g.wide) {
      kitFit();
      [150, 330, 500, 800].forEach(function (ms) { later(function () { if (G === g && g.cur === o && !g.dragging) kitFit(); }, ms); });
    }
    Array.prototype.forEach.call(g.el.ck.querySelectorAll("[data-want]"), function (e) { e.removeAttribute("data-want"); });
    if (o.a && o.a.setAttribute) o.a.setAttribute("data-want", "a");
    if (o.b && o.b.setAttribute) o.b.setAttribute("data-want", "b");
    if (o.a) haloOn(o.a, o.haloR);
    g.hintTimer = setInterval(function () {
      if (g.dead || g !== G || g.cur !== o) return;
      var idle = now() - g.lastTouch;
      if (!g.handOn && !g.dragging && idle > (g.handShown ? HAND_AGAIN : HAND_IDLE)) showHand(o);
      if (!g.saidAgain && idle > SAY_AGAIN && o.line) { g.saidAgain = true; say(o.line); }
    }, 200);
  }
  function haloOn(el, r) {
    var g = G, h = g.el.halo;
    if (!el || !el.isConnected) { h.style.display = "none"; return; }
    var c = ctr(el), s = r ? r * 2 : clamp(Math.max(c.w, c.h) * 1.1, 110, 420);
    h.style.width = s + "px"; h.style.height = s + "px";
    h.style.left = (c.x - s / 2) + "px"; h.style.top = (c.y - s / 2) + "px";
    h.style.display = "";
  }
  function haloOff() { if (G && G.el.halo) G.el.halo.style.display = "none"; }
  function hideHand() {
    var g = G;
    g.handOn = false;
    if (g.handAnim) { try { g.handAnim.cancel(); } catch (e) {} g.handAnim = null; }
    g.el.hand.style.opacity = "0";
    g.el.hand.classList.remove("ck-tap");
  }
  function showHand(o) {
    var g = G, hand = g.el.hand;
    var a = o.a && o.a.isConnected ? ctr(o.a) : { x: o.cx || 400, y: o.cy || 450, w: 100, h: 100 };
    var tip = function (x, y) { hand.style.left = (x - 44) + "px"; hand.style.top = (y - 9) + "px"; };
    g.handOn = true;
    hand.classList.remove("ck-tap");
    hand.style.opacity = "1";
    var frames = null, dur = 1500;
    var kind = o.kind || "tap";
    if (kind === "tap" || kind === "hold" || reduced()) { tip(a.x, a.y); hand.classList.add("ck-tap"); return; }
    if (kind === "drag" && o.b) {
      var b = o.b.nodeType ? ctr(o.b) : o.b;
      tip(a.x, a.y);
      var dx = b.x - a.x, dy = b.y - a.y;
      frames = [{ transform: "translate(0,0)", opacity: 0 }, { transform: "translate(0,0)", opacity: 1, offset: 0.15 },
        { transform: "translate(" + dx + "px," + dy + "px)", opacity: 1, offset: 0.75 }, { transform: "translate(" + dx + "px," + dy + "px)", opacity: 0 }];
    } else if (kind === "circle") {
      tip(o.cx, o.cy); frames = [];
      for (var i = 0; i <= 16; i++) { var an = i / 16 * Math.PI * 2; frames.push({ transform: "translate(" + Math.cos(an) * o.r * 0.6 + "px," + Math.sin(an) * o.r * 0.35 + "px)" }); }
      dur = 1600;
    } else if (kind === "rub") {
      tip(o.cx, o.cy); frames = [];
      for (var j = 0; j <= 8; j++) frames.push({ transform: "translate(" + ((j % 2 ? 1 : -1) * o.r * 0.6) + "px," + ((j / 8 - 0.5) * o.r * 0.8) + "px)" });
      dur = 1800;
    } else if (kind === "sweep") {
      tip(a.x, a.y);
      var w = (o.x1 - o.x0) / 2, mid = (o.x0 + o.x1) / 2 - a.x;
      frames = [{ transform: "translate(" + mid + "px,0)" }, { transform: "translate(" + (mid - w) + "px,0)" }, { transform: "translate(" + (mid + w) + "px,0)" }, { transform: "translate(" + mid + "px,0)" }];
      dur = 1600;
    } else if (kind === "flick") {
      tip(a.x, a.y + 30);
      frames = [{ transform: "translate(0,40px)", opacity: 0 }, { transform: "translate(0,40px)", opacity: 1, offset: 0.2 }, { transform: "translate(0,-150px)", opacity: 1, offset: 0.55 }, { transform: "translate(0,-150px)", opacity: 0 }];
      dur = 1300;
    }
    if (frames) { try { g.handAnim = hand.animate(frames, { duration: dur, iterations: Infinity, easing: "ease-in-out" }); } catch (e) {} }
  }
  function clearHint() {
    var g = G;
    if (!g) return;
    clearInterval(g.hintTimer);
    g.cur = null;
    hideHand();
    haloOff();
  }
  /* the invisible pad round a thing she must touch: just big enough that it is 48 px or more to her finger */
  function grabOn(el) {
    if (!el || !G) return;
    el.classList.add("ck-grab");
    padFit(el);
  }
  function padFit(el) {
    var k = (G.el.stage.getBoundingClientRect().width / ST) || G.k || 1;
    var w = el.offsetWidth || 0, h = el.offsetHeight || 0;
    var pad = Math.max(0, 24 / k - Math.min(w, h) / 2);
    el.style.setProperty("--ck-pad", Math.ceil(pad) + "px");
  }
  function progress(n) { if (G) { G.prog += (n || 1); } }

  /* ------------------------------------------------------------ gestures. Each waits for her as long as it takes. */
  /* drag one of items onto a target. o.hit(pt, item) may choose the target; returns {item, target, pt} */
  function gDrag(o) {
    var g = G, B = bag();
    return new Promise(function (res) {
      var finished = false, cur = null, pid = null, p0 = null;
      var items = o.items.filter(function (it) { return it && it.isConnected; });
      var targetOf = function (pt, it) {
        if (o.hit) return o.hit(pt, it);
        var ts = o.targets || [o.target];
        for (var i = 0; i < ts.length; i++) if (ts[i] && ts[i].isConnected && !ts[i].getAttribute("data-done") && inside(pt, ts[i], o.pad === undefined ? 30 : o.pad)) return ts[i];
        return null;
      };
      var finish = function (it, t, pt) {
        if (finished) return;
        finished = true; B.off(); g.dragging = false;
        items.forEach(function (x) { x.classList.remove("ck-grab", "ck-dragging"); });
        clearHint();
        res({ item: it, target: t, pt: pt });
      };
      items.forEach(function (it) {
        grabOn(it);
        B.on(it, "pointerdown", function (e) {
          if (finished || cur || it.getAttribute("data-done")) return;
          e.preventDefault(); e.stopPropagation();
          cur = it; pid = e.pointerId; p0 = toStage(e);
          try { it.setPointerCapture(pid); } catch (er) {}
          it.classList.add("ck-dragging"); g.dragging = true;
          try { it.getAnimations().forEach(function (a) { a.cancel(); }); } catch (er) {}
          it.style.zIndex = 25;
          it.style.transform = "scale(1.05)";
          SFX.pick();
          if (o.onLift) o.onLift(it);
        });
        B.on(it, "pointermove", function (e) {
          if (cur !== it || e.pointerId !== pid) return;
          var p = toStage(e);
          it.style.transform = "translate(" + (p.x - p0.x) + "px," + (p.y - p0.y) + "px) scale(1.05)" + (o.tilt ? " rotate(" + o.tilt + "deg)" : "");
          if (o.onMove) o.onMove(it, p);
        });
        var up = function (e) {
          if (cur !== it || e.pointerId !== pid) return;
          cur = null; g.dragging = false;
          it.classList.remove("ck-dragging");
          var c = ctr(it), p = toStage(e);
          var t = targetOf(c, it) || targetOf(p, it);
          if (t && e.type === "pointerup") { progress(); finish(it, t, c); return; }
          if (o.onMiss) o.onMiss(it);
          tween(it, [{ transform: it.style.transform || "none" }, { transform: "none" }], 260, "cubic-bezier(.3,1.4,.5,1)").then(function () { it.style.zIndex = ""; }, function () {});
        };
        B.on(it, "pointerup", up);
        B.on(it, "pointercancel", up);
      });
      if (g.auto) {
        later(function () {
          if (finished) return;
          var it = items.filter(function (x) { return !x.getAttribute("data-done"); })[0];
          var ts = o.targets || [o.target];
          var t = o.autoTarget ? o.autoTarget(it) : ts.filter(function (x) { return x && !x.getAttribute("data-done"); })[0];
          if (!it || !t) return;
          var a = ctr(it), b = ctr(t);
          it.style.zIndex = 25;
          tween(it, [{ transform: "none" }, { transform: "translate(" + (b.x - a.x) + "px," + (b.y - a.y) + "px)" }], 420, "ease-in-out").then(function () {
            progress(); finish(it, t, ctr(it));
          }, function () {});
        }, AUTO_WAIT);
      }
    });
  }

  /* hold a finger down on one of els until it is full. o.onP(p, holding, el) */
  function gHold(o) {
    var g = G, B = bag();
    return new Promise(function (res) {
      var finished = false, holdEl = null, pid = null, last = 0, raf = 0;
      var els = o.els;
      els.forEach(function (el) { el._p = el._p || 0; grabOn(el); });
      var tick = function () {
        if (finished || g.dead || g !== G) return;
        var t = now(), dt = Math.min(80, t - last); last = t;
        if (holdEl) {
          holdEl._p = Math.min(1, holdEl._p + dt / (o.ms * (g.auto ? 0.45 : 1)));
          progress(0.001);
          if (o.onP) o.onP(holdEl._p, true, holdEl);
          if (holdEl._p >= 1) {
            var done = holdEl; holdEl = null;
            done.setAttribute("data-done", "1");
            /* a finished one takes no more touches (nor does its invisible pad), so it never hides the next one */
            done.classList.remove("ck-grab"); done.style.pointerEvents = "none";
            if (o.onFull) o.onFull(done);
            if (els.every(function (e) { return e._p >= 1; })) { finished = true; B.off(); els.forEach(function (e) { e.classList.remove("ck-grab"); }); clearHint(); res(); return; }
          }
        }
        raf = requestAnimationFrame(tick);
        g.rafs.push(raf);
      };
      var stop = function () { if (holdEl && o.onP) o.onP(holdEl._p, false, holdEl); holdEl = null; if (o.onStop) o.onStop(); };
      els.forEach(function (el) {
        B.on(el, "pointerdown", function (e) {
          if (finished) return;
          /* when touch areas overlap (small marks close together on a small screen), the unfinished one whose
             middle is nearest the finger is the one she means */
          var pt = toStage(e), pad = 26 / ((G.el.stage.getBoundingClientRect().width / ST) || G.k || 1), pickEl = null, bd = 1e9;
          els.forEach(function (x) {
            if (x._p >= 1 || !x.isConnected || !inside(pt, x, pad)) return;
            var c = ctr(x), d = hyp(pt.x - c.x, pt.y - c.y);
            if (d < bd) { bd = d; pickEl = x; }
          });
          if (!pickEl && el._p < 1) pickEl = el;
          if (!pickEl) return;
          e.preventDefault(); e.stopPropagation();
          pid = e.pointerId; holdEl = pickEl;
          try { el.setPointerCapture(pid); } catch (er) {}
          if (o.onStart) o.onStart(pickEl);
        });
        B.on(el, "pointerup", function (e) { if (e.pointerId === pid) stop(); });
        B.on(el, "pointercancel", function (e) { if (e.pointerId === pid) stop(); });
      });
      last = now();
      raf = requestAnimationFrame(tick);
      g.rafs.push(raf);
      if (g.auto) {
        var next = function () {
          if (finished) return;
          var el = els.filter(function (e) { return e._p < 1; })[0];
          if (!el) return;
          holdEl = el; if (o.onStart) o.onStart(el);
          var w = setInterval(function () { if (finished || el._p >= 1) { clearInterval(w); if (!finished) later(next, 60); } }, 50);
          g.timers.push(w);
        };
        later(next, AUTO_WAIT);
      }
    });
  }

  /* go round and round over a centre point. o.onP(p, pt) */
  function gCircle(o) {
    var g = G, B = bag();
    return new Promise(function (res) {
      var finished = false, pid = null, lastA = null, acc = 0, need = (o.turns || 3) * Math.PI * 2;
      var area = o.area;
      var angle = function (pt) { return Math.atan2((pt.y - o.cy) / (o.flat || 0.6), pt.x - o.cx); };
      var feed = function (pt) {
        var d = hyp(pt.x - o.cx, (pt.y - o.cy) / (o.flat || 0.6));
        if (o.onTool) o.onTool(pt);
        if (d < o.r * 0.12 || d > o.r * 2.6) { lastA = null; return; }
        var a = angle(pt);
        if (lastA !== null) {
          var da = a - lastA;
          while (da > Math.PI) da -= Math.PI * 2;
          while (da < -Math.PI) da += Math.PI * 2;
          if (Math.abs(da) < 1.4) { acc += Math.abs(da); progress(Math.abs(da)); }
        }
        lastA = a;
        var p = Math.min(1, acc / need);
        if (o.onP) o.onP(p, pt);
        if (p >= 1 && !finished) { finished = true; B.off(); clearHint(); res(); }
      };
      grabOn(area);
      B.on(area, "pointerdown", function (e) { if (finished) return; e.preventDefault(); pid = e.pointerId; lastA = null; try { area.setPointerCapture(pid); } catch (er) {} feed(toStage(e)); });
      B.on(area, "pointermove", function (e) { if (pid === null || e.pointerId !== pid) return; feed(toStage(e)); });
      var up = function (e) { if (e.pointerId !== pid) return; pid = null; lastA = null; if (o.onUp) o.onUp(); };
      B.on(area, "pointerup", up); B.on(area, "pointercancel", up);
      if (g.auto) {
        later(function () {
          var t = 0;
          var w = setInterval(function () {
            if (finished || g.dead) { clearInterval(w); return; }
            t += 0.5;
            feed({ x: o.cx + Math.cos(t) * o.r * 0.7, y: o.cy + Math.sin(t) * o.r * 0.7 * (o.flat || 0.6) });
          }, 30);
          g.timers.push(w);
        }, AUTO_WAIT);
      }
    });
  }

  /* rub all over a round area until it is covered. o.onPaint(pt), o.onP(p) */
  function gRub(o) {
    var g = G, B = bag();
    return new Promise(function (res) {
      var finished = false, pid = null, N = 12, cells = [], marked = 0, total = 0, lastPaint = null;
      var ry = o.ry || o.r;
      for (var i = 0; i < N; i++) for (var j = 0; j < N; j++) {
        var cx = o.cx - o.r + (i + 0.5) * 2 * o.r / N, cy = o.cy - ry + (j + 0.5) * 2 * ry / N;
        var inn = hyp((cx - o.cx) / o.r, (cy - o.cy) / ry) < 0.92;
        cells.push({ x: cx, y: cy, inn: inn, on: false });
        if (inn) total++;
      }
      var brush = o.brush || 0.24;
      var feed = function (pt) {
        if (hyp((pt.x - o.cx) / o.r, (pt.y - o.cy) / ry) > 1.1) return;
        if (o.onTool) o.onTool(pt);
        if (!lastPaint || hyp(pt.x - lastPaint.x, pt.y - lastPaint.y) > 16) { lastPaint = pt; if (o.onPaint) o.onPaint(pt); if (Math.random() < 0.3) SFX.rub(); }
        cells.forEach(function (c) {
          if (c.inn && !c.on && hyp((c.x - pt.x) / o.r, (c.y - pt.y) / ry) < brush) { c.on = true; marked++; progress(); }
        });
        var p = Math.min(1, marked / total / (o.need || 0.7));
        if (o.onP) o.onP(p);
        if (p >= 1 && !finished) { finished = true; B.off(); clearHint(); res(); }
      };
      var area = o.area;
      grabOn(area);
      B.on(area, "pointerdown", function (e) { if (finished) return; e.preventDefault(); pid = e.pointerId; try { area.setPointerCapture(pid); } catch (er) {} feed(toStage(e)); });
      B.on(area, "pointermove", function (e) { if (pid === null || e.pointerId !== pid) return; feed(toStage(e)); });
      var up = function (e) { if (e.pointerId === pid) { pid = null; if (o.onUp) o.onUp(); } };
      B.on(area, "pointerup", up); B.on(area, "pointercancel", up);
      if (g.auto) {
        later(function () {
          var t = 0;
          var w = setInterval(function () {
            if (finished || g.dead) { clearInterval(w); return; }
            t += 1;
            var row = (t % 60) / 60, x = o.cx + Math.sin(t * 0.55) * o.r * 0.85, y = o.cy + (row * 2 - 1) * ry * 0.85;
            feed({ x: x, y: y });
          }, 18);
          g.timers.push(w);
        }, AUTO_WAIT);
      }
    });
  }

  /* move a tool back and forth (rolling pin, shaker). o.onMove(x, dx), o.onP(p) */
  function gSweep(o) {
    var g = G, B = bag();
    return new Promise(function (res) {
      var finished = false, pid = null, lastX = null, acc = 0, tool = o.tool;
      var setX = function (x) {
        x = clamp(x, o.x0, o.x1);
        var dx = lastX === null ? 0 : x - lastX;
        lastX = x;
        tool.style.transform = "translateX(" + (x - tool._x) + "px)" + (o.tiltOn && dx ? " rotate(" + clamp(dx * 0.8, -18, 18) + "deg)" : "");
        if (Math.abs(dx) > 0) { acc += Math.abs(dx); progress(Math.abs(dx)); if (o.onMove) o.onMove(x, dx); }
        var p = Math.min(1, acc / o.need);
        if (o.onP) o.onP(p);
        if (p >= 1 && !finished) { finished = true; B.off(); tool.classList.remove("ck-grab"); clearHint(); res(); }
      };
      var targets = [tool].concat(o.area ? [o.area] : []);
      grabOn(tool);
      targets.forEach(function (t) {
        B.on(t, "pointerdown", function (e) { if (finished) return; e.preventDefault(); e.stopPropagation(); pid = e.pointerId; try { t.setPointerCapture(pid); } catch (er) {} lastX = null; setX(toStage(e).x); });
        B.on(t, "pointermove", function (e) { if (pid === null || e.pointerId !== pid) return; setX(toStage(e).x); });
        var up = function (e) { if (e.pointerId === pid) { pid = null; lastX = null; if (o.onUp) o.onUp(); } };
        B.on(t, "pointerup", up); B.on(t, "pointercancel", up);
      });
      if (g.auto) {
        later(function () {
          var t = 0;
          var w = setInterval(function () {
            if (finished || g.dead) { clearInterval(w); return; }
            t += 0.22;
            setX((o.x0 + o.x1) / 2 + Math.sin(t) * (o.x1 - o.x0) / 2);
          }, 25);
          g.timers.push(w);
        }, AUTO_WAIT);
      }
    });
  }

  /* tap things. o.onTap(el) returns true when the tap counts; done after o.need taps */
  function gTaps(o) {
    var g = G, B = bag();
    return new Promise(function (res) {
      var finished = false, n = 0;
      var hit = function (el) {
        if (finished || el.getAttribute("data-done")) return;
        if (o.onTap(el, n) === false) return;
        n += 1; progress();
        if (n >= o.need) { finished = true; B.off(); o.els.forEach(function (e) { e.classList.remove("ck-grab"); }); clearHint(); later(res, 10); }
      };
      o.els.forEach(function (el) {
        el.style.cursor = "pointer";
        grabOn(el);
        B.on(el, "pointerdown", function (e) { e.preventDefault(); e.stopPropagation(); hit(el); });
      });
      if (g.auto) {
        var next = function () {
          if (finished) return;
          var el = o.els.filter(function (e) { return !e.getAttribute("data-done"); })[0];
          if (el) hit(el);
          if (!finished) later(next, 260);
        };
        later(next, AUTO_WAIT);
      }
    });
  }

  /* swipe up quickly on el */
  function gFlick(o) {
    var g = G, B = bag();
    return new Promise(function (res) {
      var finished = false, pid = null, y0 = 0;
      var go = function () { if (finished) return; finished = true; B.off(); progress(); clearHint(); res(); };
      var up = function (e) { if (e.pointerId === pid) { pid = null; if (o.onPull) o.onPull(0); } };
      [o.el].concat(o.also || []).forEach(function (el) {
        grabOn(el);
        B.on(el, "pointerdown", function (e) { e.preventDefault(); pid = e.pointerId; y0 = toStage(e).y; try { el.setPointerCapture(pid); } catch (er) {} if (o.onDown) o.onDown(); });
        B.on(el, "pointermove", function (e) {
          if (e.pointerId !== pid) return;
          var dy = y0 - toStage(e).y;
          if (o.onPull) o.onPull(Math.max(0, dy));
          if (dy > 55) go();
        });
        B.on(el, "pointerup", up); B.on(el, "pointercancel", up);
      });
      if (g.auto) later(go, AUTO_WAIT);
    });
  }

  /* ------------------------------------------------------------ recipes */
  function ICE(col) { return ' class="ck-ice" data-c0="' + col + '"'; }
  function thumbSVG(R0) {
    var v = R0.view.split(" ").map(Number), s = Math.max(v[2], v[3]), x = v[0] + v[2] / 2 - s / 2, y = v[1] + v[3] / 2 - s / 2;
    var b = zoneBox(R0);
    return svg(x + " " + y + " " + s + " " + s, E((b.x0 + b.x1) / 2, Math.min(v[1] + v[3] - 30, 660), Math.min(260, (b.x1 - b.x0) * 0.6), 30, "#3b2a33", 0, ' opacity=".12"') + R0.base(uid(), {}));
  }
  function plateInner(col) {
    return E(400, 668, 330, 74, "#3b2a33", 0, ' opacity=".14"') + E(400, 652, 330, 80, col, 6, ' class="ck-pc"') + E(400, 646, 250, 52, "#fff", 0, ' opacity=".45"') +
      Pa("M110 652 A290 64 0 0 0 690 652", "none", 0, ' stroke="#fff" stroke-width="8" stroke-dasharray="4 22" stroke-linecap="round" opacity=".9"');
  }
  /* a tool that follows her finger (stage units); tip = where the finger is, inside the tool box */
  function follow(tool, pt, tipX, tipY) { tool.style.transform = "translate(" + (pt.x - tool._x0 - tipX) + "px," + (pt.y - tool._y0 - tipY) + "px)"; }
  function parkTool(tool) { tool._x0 = parseFloat(tool.style.left); tool._y0 = parseFloat(tool.style.top); }

  /* The oven (or fridge): drag the tray in, wait for the ding, tap to open. */
  function bakeStep(o) {
    return {
      id: o.fridge ? "chill" : "bake",
      run: async function (S) {
        var g = G;
        await newScene();
        var fr = !!o.fridge;
        var oven = fr ? O(fridgeArt(), 590, 690, 280, 420 / 300, "oven", "ck-z2") : O(ovenArt(uid()), 565, 680, 400, 330 / 360, "oven", "ck-z2");
        var tw = o.w || 280;
        var tray = O(o.tray(S, false), 190, 650, tw, o.r || 140 / 320, "tray", "ck-z5");
        if (!reduced()) show(oven, 300);
        var line = fr ? "Put it in the fridge!" : "Put it in the oven!";
        say(line);
        want({ mech: "drag", el: "tray", to: "oven", kind: "drag", a: tray, b: oven, line: line });
        await gDrag({ items: [tray], target: oven, pad: 0 });
        alive(g);
        var win = fr ? { x: 590, yb: 640, w: 170 } : { x: 565, yb: 590, w: 200 };
        await flyO(tray, win.x, win.yb, 320, 30, Math.min(win.w, tw * 0.8));
        alive(g);
        await tween(tray, [{ opacity: 1 }, { opacity: 0.0 }], 160);
        tray.style.pointerEvents = "none";
        SFX.click();
        var glow = oven.querySelector(".ck-glow"), dots = oven.querySelectorAll(".ck-dot");
        if (glow) glow.setAttribute("opacity", fr ? "0.9" : "1");
        say(fr ? "Chill, chill..." : "Baking...", fr ? "It is getting cold!" : "Baking! Wait for the ding.");
        for (var i = 0; i < dots.length; i++) {
          await wait(D(480));
          alive(g);
          dots[i].setAttribute("fill", fr ? "#74c8ff" : "#ffc94a");
          SFX.step(i * 2);
          if (fr) sparkles(590, 470, 90, 3); else if (i === 1) steam(565, 330, 2, 70);
        }
        await wait(D(250));
        alive(g);
        SFX.ding();
        pop(oven, 1.04);
        var line2 = fr ? "Ding! Tap the fridge to open it!" : "Ding! Tap the oven to open it!";
        say("Ding! Open it!", line2);
        want({ mech: "tap", el: "oven", kind: "tap", a: oven, line: line2 });
        await gTaps({ els: [oven], need: 1, onTap: function () { return true; } });
        alive(g);
        if (glow) glow.setAttribute("opacity", "0");
        Array.prototype.forEach.call(dots, function (d) { d.setAttribute("fill", "#fff"); });
        tray.innerHTML = o.tray(S, true);
        tray.style.opacity = "1";
        tray.style.pointerEvents = "";
        await flyO(tray, 250, 650, 380, 60, tw);
        alive(g);
        if (fr) sparkles(250, 560, 120, 6); else steam(250, 560, 3, 60);
      }
    };
  }

  /* ---------------------------------------- cupcakes: spoon the batter, bake, pipe a frosting swirl */
  function tinSVG(S, state) {
    /* state: 0 empty, 1 batter, 2 baked; S.filled lists which cups have batter */
    var cups = "";
    [75, 190, 305].forEach(function (x, i) {
      var has = state === 2 || (S.filled && S.filled[i]);
      cups += '<g class="ck-cup' + i + '">' + Pa("M" + (x - 52) + " 60 L" + (x + 52) + " 60 L" + (x + 40) + " 120 L" + (x - 40) + " 120 Z", "#9fdcff", 5) +
        Pa("M" + (x - 26) + " 64 L" + (x - 20) + " 118 M" + x + " 64 L" + x + " 118 M" + (x + 26) + " 64 L" + (x + 20) + " 118", "none", 0, ' stroke="#fff" stroke-width="4" opacity=".8"') +
        '<g class="ck-dome" style="display:' + (has ? "" : "none") + '">' + Pa("M" + (x - 50) + " 62 C" + (x - 50) + (state === 2 ? " 10 " : " 36 ") + (x + 50) + (state === 2 ? " 10 " : " 36 ") + (x + 50) + " 62 Z", state === 2 ? "#f2c27a" : "#ffb3cc", 5) + "</g></g>";
    });
    return svg("0 0 380 170", R(6, 104, 368, 50, 20, "#cfd8e6", 5) + cups);
  }
  function cupcakeSVG(iceCol, tiers) {
    var t = tiers === undefined ? 3 : tiers;
    return svg("0 0 360 320",
      Pa("M70 200 L290 200 L268 304 Q265 314 252 314 L108 314 Q95 314 92 304 Z", "#9fdcff", 6) +
      Pa("M110 206 L122 308 M150 206 L156 308 M196 206 L192 308 M236 206 L228 308", "none", 0, ' stroke="#fff" stroke-width="6" opacity=".75"') +
      Pa("M62 204 C62 150 298 150 298 204 Z", "#f2c27a", 6) +
      '<g class="ck-t1" style="display:' + (t >= 1 ? "" : "none") + '">' + Pa("M50 206 C34 176 64 150 92 156 C90 120 140 104 170 122 C186 98 236 104 246 128 C276 118 310 146 296 176 C318 180 322 204 306 210 C230 228 130 228 50 206 Z", iceCol, 6) + "</g>" +
      '<g class="ck-t2" style="display:' + (t >= 2 ? "" : "none") + '">' + Pa("M90 152 C78 118 116 96 142 106 C150 72 210 68 224 98 C250 86 284 108 272 138 C276 150 266 160 250 160 C200 172 140 170 90 152 Z", iceCol, 6) + "</g>" +
      '<g class="ck-t3" style="display:' + (t >= 3 ? "" : "none") + '">' + Pa("M128 104 C120 70 160 50 182 62 C196 30 240 44 234 78 C250 86 244 104 230 108 C200 118 156 116 128 104 Z", iceCol, 6) + Pa("M182 64 C178 36 200 16 216 38", iceCol, 6) +
      HL("M80 190 C100 180 120 180 140 188 M120 140 C140 128 160 128 176 136", 8, 0.7) + "</g>");
  }
  var R_CUPCAKE = {
    key: "cupcake", name: "Cupcakes", one: "cupcake", say: "Let's bake cupcakes!", iceName: "Frosting", iceSay: "Pick a frosting colour!",
    ice: [["pink", "#ffb3d1"], ["white", "#fff8f0"], ["chocolate", "#9a6a4f"], ["mint", "#b7f0df"], ["lemon", "#fff1a0"], ["lilac", "#d9c8ff"]],
    cats: ["ice", "spr", "fruit", "sweets", "cute", "party", "draw", "plate"],
    zone: [{ e: [400, 380, 175, 105] }], view: "150 190 500 500", itemScale: 1,
    base: function (p, S) {
      var c = "#ffb3d1";
      return Pa("M250 470 L550 470 L520 630 Q516 644 500 644 L300 644 Q284 644 280 630 Z", "#9fdcff", 6) +
        Pa("M300 476 L316 640 M360 476 L366 640 M440 476 L434 640 M500 476 L484 640", "none", 0, ' stroke="#fff" stroke-width="8" opacity=".75"') +
        Pa("M238 476 C238 404 562 404 562 476 Z", "#f2c27a", 6) +
        Pa("M220 478 C196 436 236 396 274 404 C270 352 340 330 382 354 C404 318 470 326 484 360 C524 346 572 384 552 424 C586 430 594 466 570 480 C470 506 320 506 220 478 Z", c, 6, ICE(c)) +
        Pa("M276 404 C258 356 316 324 352 338 C364 288 446 282 466 324 C502 310 548 342 532 384 C470 404 340 404 276 404 Z", c, 6, ICE(c)) +
        Pa("M338 334 C326 290 382 262 410 280 C430 244 494 262 484 304 C460 318 380 322 338 334 Z", c, 6, ICE(c)) +
        Pa("M404 282 C398 246 430 226 452 252", c, 6, ICE(c)) +
        HL("M250 456 C280 440 310 440 336 450 M300 380 C330 362 360 362 380 372 M370 310 C390 298 410 298 424 306", 10, 0.7);
    },
    steps: [
      {
        id: "spoon", run: async function (S) {
          var g = G;
          await newScene();
          S.filled = [false, false, false];
          var bowl = O(bowlArt(uid(), "#ffb3cc"), 200, 660, 300, 250 / 360, "bowl", "ck-z3");
          var tin = O(tinSVG(S, 0), 575, 650, 380, 170 / 380, "tin", "ck-z3");
          var spoon = O(bigSpoonArt("#f6c891", E(50, 182, 32, 28, "#ffb3cc", 0)), 250, 560, 84, 230 / 100, "spoon", "ck-z5");
          spoon.firstChild.style.transform = "rotate(18deg)";
          var hits = [455, 570, 685].map(function (x) { return HIT(x, 545, 58, "cup"); });
          var line = "Spoon the batter into the cups!";
          say(line);
          for (var n = 0; n < 3; n++) {
            var next = hits.filter(function (h) { return !h.getAttribute("data-done"); })[0];
            want({ mech: "drag", el: "spoon", to: "cup", kind: "drag", a: spoon, b: next, line: line });
            var r = await gDrag({ items: [spoon], targets: hits, pad: 26, onLift: function () { spoon.firstChild.style.transform = "rotate(0deg)"; } });
            alive(g);
            var i = hits.indexOf(r.target);
            r.target.setAttribute("data-done", "1");
            S.filled[i] = true;
            var dome = tin.querySelectorAll(".ck-dome")[i];
            dome.style.display = "";
            SFX.plop(); SFX.step(n * 2);
            drops(r.target._x, 520, "#ffb3cc", 3, 20);
            pop(tin, 1.03);
            await flyO(spoon, 250, 560, 300, 40);
            alive(g);
            spoon.firstChild.style.transform = "rotate(18deg)";
            if (n < 2) say(n === 0 ? "Yummy! Now the next cup!" : "Keep going!");
          }
          void bowl;
        }
      },
      bakeStep({ tray: function (S, baked) { return tinSVG(S, baked ? 2 : 1); }, w: 300, r: 170 / 380 }),
      {
        id: "swirl", run: async function (S) {
          var g = G;
          await newScene();
          var cup = O(cupcakeSVG("#ffb3d1", 0), 400, 670, 340, 320 / 360, "cupcake", "ck-z3");
          var bag2 = O(pipingArt("#ffb3d1"), 640, 420, 110, 220 / 130, "bag", "ck-z8");
          parkTool(bag2);
          var area = HIT(400, 520, 210, "swirlarea");
          var line = "Pipe the frosting! Go round and round!";
          say(line);
          want({ mech: "circle", el: "swirlarea", kind: "circle", a: area, cx: 400, cy: 500, r: 130, line: line });
          var shown = 0;
          await gCircle({
            area: area, cx: 400, cy: 500, r: 130, flat: 0.5, turns: 3,
            onTool: function (pt) { follow(bag2, pt, 55, 181); },
            onP: function (p) {
              var t = p >= 0.92 ? 3 : p >= 0.55 ? 2 : p >= 0.18 ? 1 : 0;
              if (t > shown) { shown = t; var el = cup.querySelector(".ck-t" + t); if (el) el.style.display = ""; SFX.squish(); pop(cup, 1.03); }
            }
          });
          alive(g);
          await tween(bag2, [{ opacity: 1 }, { opacity: 0 }], 200);
          sparkles(400, 450, 150, 6);
        }
      }
    ]
  };

  /* ---------------------------------------- pancakes: pour, flick to flip, slide onto the plate */
  function panSVG() {
    return svg("0 0 520 200", R(0, 84, 190, 32, 16, "#8a6a5c", 6) + R(20, 90, 90, 20, 10, "#a9867a", 0) +
      E(330, 104, 186, 76, "#4a3a42", 6) + E(330, 96, 166, 60, "#6e5a66", 0) + HL("M200 120 C240 160 330 170 420 160", 8, 0.35));
  }
  function pancakeSVG(col, bub) {
    return svg("0 0 300 120", Pa("M10 50 C10 90 290 90 290 50 L290 66 C290 110 10 110 10 66 Z", col === "raw" ? "#f3d9a2" : "#e9a65a", 6) +
      E(150, 50, 140, 40, col === "raw" ? "#fbefc9" : "#f6c675", 6) +
      (bub ? C(100, 46, 6, "#fff8e0", 3) + C(160, 36, 5, "#fff8e0", 3) + C(196, 56, 7, "#fff8e0", 3) + C(130, 62, 4, "#fff8e0", 3) : "") +
      (col === "raw" ? "" : HL("M60 44 C90 30 130 26 160 28", 7, 0.6)));
  }
  function stackSVG(n) {
    var s = E(150, 112, 146, 22, "#fff", 6) + E(150, 108, 110, 14, "#ffe4ee", 0);
    for (var i = 0; i < n; i++) {
      var y = 86 - i * 30;
      s += Pa("M20 " + y + " C20 " + (y + 30) + " 280 " + (y + 30) + " 280 " + y + " L280 " + (y + 14) + " C280 " + (y + 44) + " 20 " + (y + 44) + " 20 " + (y + 14) + " Z", "#e9a65a", 5) + E(150, y, 130, 30, "#f6c675", 5);
    }
    return svg("0 0 300 140", s);
  }
  var R_PANCAKES = {
    key: "pancakes", name: "Pancakes", one: "pancakes", say: "Let's make pancakes!", iceName: "Syrup", iceSay: "Pick a syrup!",
    ice: [["maple", "#d9893a"], ["strawberry", "#ff6f9f"], ["chocolate", "#7a4a33"], ["blueberry", "#7b7fe0"], ["honey", "#ffc94a"], ["cream", "#fff8f0"]],
    cats: ["ice", "fruit", "spr", "sweets", "cute", "draw", "plate"],
    zone: [{ e: [400, 468, 228, 72] }], view: "110 330 580 380", itemScale: 0.95,
    base: function (p, S) {
      var s = "", c = "#d9893a";
      [560, 515, 470].forEach(function (y) {
        s += Pa("M150 " + y + " C150 " + (y + 46) + " 650 " + (y + 46) + " 650 " + y + " L650 " + (y + 40) + " C650 " + (y + 86) + " 150 " + (y + 86) + " 150 " + (y + 40) + " Z", "#e9a65a", 6) + E(400, y, 250, 44, "#f6c675", 6);
      });
      return s + Pa("M184 466 C200 438 300 430 400 430 C500 430 600 438 616 466 C620 488 604 500 598 522 C592 546 578 546 574 520 C568 498 548 500 528 506 C506 512 498 544 492 566 C486 588 470 588 466 560 C462 532 444 508 400 510 C360 512 342 522 332 544 C324 562 308 562 306 540 C304 512 276 502 250 504 C230 506 222 528 212 534 C200 540 186 522 186 500 Z", c, 6, ICE(c)) +
        HL("M250 456 C300 446 360 442 420 442", 9, 0.55) +
        Pa("M360 430 L402 412 L448 426 L448 450 L406 466 L360 452 Z", "#fff1b0", 5) + Pa("M360 430 L406 446 L448 426 M406 446 L406 466", "none", 5);
    },
    steps: [
      {
        id: "pour", run: async function (S) {
          var g = G;
          await newScene();
          var pan = O(panSVG(), 360, 650, 520, 200 / 520, "pan", "ck-z3");
          var pc = O(pancakeSVG("raw"), 430, 600, 300, 120 / 300, "pancake", "ck-z5");
          pc.style.transform = "scale(0)";
          var jug = O(jugArt("#fbefc9"), 650, 500, 150, 200 / 170, "jug", "ck-z8");
          jug.style.transformOrigin = "20% 90%";
          var stream = O(svg("0 0 30 200", R(4, 0, 22, 200, 11, "#fbefc9", 5)), 545, 560, 30, 200 / 30, "", "ck-z6");
          stream.style.opacity = "0";
          S.pan = pan; S.pc = pc; S.jug = jug;
          var line = "Hold the jug to pour the batter!";
          say(line);
          want({ mech: "hold", el: "jug", kind: "hold", a: jug, line: line });
          await gHold({
            els: [jug], ms: 1700,
            onStart: function () { jug.style.transform = "rotate(-48deg)"; stream.style.opacity = "1"; SFX.pour(); },
            onP: function (p, on) {
              pc.style.transform = "scale(" + (0.15 + 0.85 * p).toFixed(3) + ")";
              if (!on) { jug.style.transform = "none"; stream.style.opacity = "0"; }
              else if (Math.random() < 0.04) SFX.pour();
            }
          });
          alive(g);
          jug.style.transform = "none"; stream.style.opacity = "0";
          await fadeOut(stream, 100);
          await tween(jug, [{ transform: "none", opacity: 1 }, { transform: "translateX(200px)", opacity: 0 }], 300);
          jug.remove();
        }
      },
      {
        id: "flip", run: async function (S) {
          var g = G, pc = S.pc, pan = S.pan;
          pc.innerHTML = pancakeSVG("raw", true);
          var line = "Bubbles! Swipe up on the pan to flip it!";
          say("Flip it! Swipe up!", line);
          want({ mech: "flick", el: "pan", kind: "flick", a: pan, line: line });
          pc.setAttribute("data-alt", "a");
          await gFlick({ el: pan, also: [pc], onPull: function (dy) { pan.style.transform = "translateY(" + (-Math.min(dy, 40) * 0.5) + "px)"; pc.style.transform = "translateY(" + (-Math.min(dy, 40)) + "px)"; } });
          alive(g);
          pan.style.transform = "none";
          pc.removeAttribute("data-alt");
          SFX.whoosh();
          await tween(pc, [{ transform: "translateY(0) scaleY(1)" }, { transform: "translateY(-240px) scaleY(.06) rotate(8deg)" }], 300, "ease-out");
          pc.innerHTML = pancakeSVG("gold");
          await tween(pc, [{ transform: "translateY(-240px) scaleY(.06)" }, { transform: "translateY(0) scaleY(1)" }], 300, "ease-in");
          alive(g);
          SFX.plop(); pop(pan, 1.04); steam(430, 520, 3, 70);
        }
      },
      {
        id: "slide", run: async function (S) {
          var g = G;
          var plate = O(stackSVG(2), 630, 680, 250, 140 / 300, "plate", "ck-z3");
          if (!reduced()) await show(plate, 260);
          var line = "Slide it onto the plate!";
          say(line);
          want({ mech: "drag", el: "pancake", to: "plate", kind: "drag", a: S.pc, b: plate, line: line });
          await gDrag({ items: [S.pc], target: plate, pad: 30 });
          alive(g);
          await flyO(S.pc, 630, 614, 300, 30, 230);
          alive(g);
          SFX.plop();
          plate.innerHTML = stackSVG(3);
          S.pc.remove();
          pop(plate, 1.05);
        }
      }
    ]
  };

  /* ---------------------------------------- birthday cake: stir, bake, stack the layers, spread the cream */
  function layerSVG(top, side) { return svg("0 0 220 110", Pa("M10 40 L10 80 C10 112 210 112 210 80 L210 40 Z", side || "#f6d79a", 6) + E(110, 40, 100, 30, top || "#fbe6bc", 6) + HL("M30 70 L30 90", 6, 0.6)); }
  function standSVG() { return svg("0 0 300 130", E(150, 40, 146, 30, "#fff", 6) + E(150, 36, 110, 18, "#ffe4ee", 0) + Pa("M126 64 L174 64 L196 120 L104 120 Z", "#fff", 6) + E(150, 122, 70, 10, "#fff", 6)); }
  function spatulaSVG() { return svg("0 0 80 240", R(32, 4, 16, 110, 8, "#f6c891", 5) + Pa("M14 120 L66 120 L60 228 Q40 240 20 228 Z", "#cfd8e6", 5) + HL("M26 136 L28 216", 6, 0.7)); }
  var R_BIRTHDAY = {
    key: "birthday", name: "Birthday cake", one: "cake", say: "Let's bake a birthday cake!", iceName: "Cream", iceSay: "Pick a cream colour!",
    ice: [["pink", "#ffb3d1"], ["white", "#fffaf3"], ["chocolate", "#9a6a4f"], ["mint", "#b7f0df"], ["lemon", "#fff1a0"], ["blue", "#cfeaff"]],
    cats: ["ice", "party", "spr", "fruit", "sweets", "cute", "draw", "plate"],
    zone: [{ e: [400, 470, 225, 160] }], view: "130 200 540 500", itemScale: 0.9,
    base: function (p, S) {
      var c = "#ffb3d1", s = R(170, 612, 460, 24, 12, "#fff", 6) + Pa("M370 636 L430 636 L452 676 L348 676 Z", "#fff", 6);
      [[520, 210, 92], [420, 160, 84], [330, 110, 74]].forEach(function (t) {
        var y = t[0], w = t[1], h = t[2];
        s += Pa("M" + (400 - w) + " " + y + " L" + (400 - w) + " " + (y + h) + " C" + (400 - w) + " " + (y + h + 34) + " " + (400 + w) + " " + (y + h + 34) + " " + (400 + w) + " " + (y + h) + " L" + (400 + w) + " " + y + " Z", c, 6, ICE(c)) +
          E(400, y, w, 30, c, 6, ICE(c));
        var trim = "";
        for (var i = 0; i <= 8; i++) { var x = 400 - w + i * w / 4, yy = y + h + 22 * Math.sin(Math.PI * i / 8); trim += C(x.toFixed(1), yy.toFixed(1), 11, "#fff", 4); }
        s += trim + HL("M" + (410 - w) + " " + (y + 26) + " L" + (410 - w) + " " + (y + h - 10), 9, 0.6);
      });
      return s + E(400, 250, 8, 6, "#ff6f9f", 0);
    },
    steps: [
      {
        id: "stir", run: async function (S) {
          var g = G;
          await newScene();
          var bowl = O(bowlArt(uid(), "#f3e1b8"), 400, 660, 460, 250 / 360, "bowl", "ck-z3");
          var lumps = bowl.querySelector(".ck-lumps");
          var l = "";
          [[120, 80], [160, 96], [210, 74], [240, 98], [140, 104], [200, 104], [260, 80]].forEach(function (q) { l += C(q[0], q[1], 9, "#fff8e8", 3) + C(q[0] + 4, q[1] - 3, 4, "#ffd6a0", 0); });
          lumps.innerHTML = l;
          var spoon = O(spoonArt(), 620, 520, 64, 230 / 64, "spoon", "ck-z8");
          parkTool(spoon);
          var area = HIT(400, 460, 230, "bowlarea");
          var line = "Stir round and round!";
          say(line);
          want({ mech: "circle", el: "bowlarea", kind: "circle", a: area, cx: 400, cy: 455, r: 150, line: line });
          var sw = bowl.querySelector(".ck-swirl"), ang = 0, lastPt = null;
          await gCircle({
            area: area, cx: 400, cy: 455, r: 150, flat: 0.35, turns: 3,
            onTool: function (pt) { follow(spoon, pt, 32, 186); },
            onP: function (p, pt) {
              if (lastPt) ang += 8;
              lastPt = pt;
              sw.style.transform = "rotate(" + ang + "deg) scale(1,.9)";
              lumps.style.opacity = String(1 - p);
              if (Math.random() < 0.05) SFX.squish();
            }
          });
          alive(g);
          bowl.querySelector(".ck-batc").setAttribute("fill", "#fff3d6");
          await tween(spoon, [{ opacity: 1 }, { opacity: 0 }], 200);
        }
      },
      bakeStep({ tray: function (S, baked) { return svg("0 0 320 140", R(8, 92, 304, 30, 14, "#cfd8e6", 5) + Pa("M40 96 L40 60 L280 60 L280 96 Z", "#ff9cc2", 5) + Pa("M46 62 C46 " + (baked ? 14 : 40) + " 274 " + (baked ? 14 : 40) + " 274 62 Z", baked ? "#f6c675" : "#fff3d6", 5)); } }),
      {
        id: "stack", run: async function (S) {
          var g = G;
          await newScene();
          var stand = O(standSVG(), 270, 665, 300, 130 / 300, "stand", "ck-z3");
          /* waiting layers: big and middle on the counter, the little one on a wall shelf, so all are easy to see */
          O(svg("0 0 200 40", R(6, 6, 188, 18, 8, "#f6c891", 5) + R(30, 22, 14, 16, 4, "#d9a066", 4) + R(156, 22, 14, 16, 4, "#d9a066", 4)), 684, 470, 170, 40 / 200, "", "ck-z2");
          var specs = [[522, 655, 196, 240, 572], [698, 650, 150, 190, 497], [684, 440, 124, 140, 432]];
          var layers = specs.map(function (s) { return O(layerSVG(), s[0], s[1], s[2], 0.5, "layer", "ck-z5"); });
          var line = "Stack the cake! The biggest cake first.";
          say(line);
          for (var i = 0; i < 3; i++) {
            want({ mech: "drag", el: "layer", to: "stand", kind: "drag", a: layers[i], b: stand, line: line });
            /* only the layer to move now takes a touch: the waiting ones never hide its edge */
            layers.forEach(function (L, j) { L.style.opacity = j < i ? "1" : j === i ? "1" : "0.55"; L.style.pointerEvents = j === i ? "" : "none"; });
            var r = await gDrag({ items: [layers[i]], target: stand, pad: 60 });
            alive(g);
            await flyO(r.item, 270, specs[i][4], 300, 30, specs[i][3]);
            alive(g);
            SFX.plop(); SFX.step(i * 2); pop(stand, 1.03);
            r.item.style.zIndex = 6 + i;
            if (i < 2) say(i === 0 ? "Now the middle cake!" : "And the little cake on top!");
          }
          S.stack = true;
        }
      },
      {
        id: "cream", run: async function (S) {
          var g = G, p = uid();
          var area = HIT(270, 470, 175, "cake");
          var cream = mk("div", "ck-lay ck-z12", svg("0 0 800 800", '<defs><clipPath id="' + p + 'k"><rect x="150" y="456" width="240" height="124" rx="40"/><rect x="175" y="388" width="190" height="104" rx="34"/><rect x="200" y="330" width="140" height="80" rx="30"/></clipPath></defs><g clip-path="url(#' + p + 'k)"></g>'));
          var grp = cream.querySelector("g");
          var spat = O(spatulaSVG(), 560, 420, 70, 240 / 80, "spatula", "ck-z20");
          parkTool(spat);
          var line = "Spread the cream! Rub all over the cake!";
          say("Spread the cream!", line);
          want({ mech: "rub", el: "cake", kind: "rub", a: area, cx: 270, cy: 465, r: 125, ry: 125, line: line });
          await gRub({
            area: area, cx: 270, cy: 465, r: 125, ry: 125, need: 0.62, brush: 0.3,
            onTool: function (pt) { follow(spat, pt, 35, 225); },
            onPaint: function (pt) {
              var n = document.createElementNS("http://www.w3.org/2000/svg", "g");
              n.innerHTML = C(pt.x.toFixed(1), pt.y.toFixed(1), 46, "#ffd1e3", 0) + C((pt.x - 10).toFixed(1), (pt.y - 12).toFixed(1), 16, "#fff", 0, ' opacity=".6"');
              grp.appendChild(n);
            }
          });
          alive(g);
          await tween(spat, [{ opacity: 1 }, { opacity: 0 }], 200);
          sparkles(270, 430, 150, 6);
        }
      }
    ]
  };

  /* ---------------------------------------- shared: roll the dough with a rolling pin */
  function rollStep(o) {
    return {
      id: "roll", run: async function (S) {
        var g = G;
        await newScene();
        var dough = O(svg("0 0 600 260", '<g class="ck-dough">' + (o.rect ? R(210, 70, 180, 120, 50, "#fbe6c2", 6) : E(300, 140, 90, 70, "#fbe6c2", 6)) + "</g>" + '<g class="ck-dhl">' + HL("M250 110 C270 96 290 92 310 94", 8, 0.7) + "</g>"), 400, 690, 600, 260 / 600, "dough", "ck-z3");
        var pin = O(pinArt(), 400, 600, 380, 80 / 380, "pin", "ck-z8");
        var shape = dough.querySelector(".ck-dough").firstChild;
        var line = "Roll the dough! Push the rolling pin back and forth.";
        say("Roll the dough!", line);
        want({ mech: "sweep", el: "pin", kind: "sweep", a: pin, x0: 250, x1: 550, line: line });
        var lastS = 0;
        await gSweep({
          tool: pin, area: dough, x0: 250, x1: 550, need: o.need || 1500,
          onMove: function (x, dx) {
            if (Math.random() < 0.06) SFX.roll();
            if (Math.random() < 0.05) particle(svg("0 0 40 40", C(20, 20, 16, "#fff", 0, ' opacity=".9"')), x, 600, 40, [{ transform: "scale(.4)", opacity: 1 }, { transform: "translate(" + (dx > 0 ? 40 : -40) + "px,-40px) scale(1.2)", opacity: 0 }], 500);
          },
          onP: function (p) {
            if (o.rect) { var w = 180 + 300 * p, h = 120 + 50 * p; shape.setAttribute("x", (300 - w / 2).toFixed(1)); shape.setAttribute("width", w.toFixed(1)); shape.setAttribute("y", (130 - h / 2).toFixed(1)); shape.setAttribute("height", h.toFixed(1)); shape.setAttribute("rx", (50 - 20 * p).toFixed(1)); }
            else { shape.setAttribute("rx", (90 + 160 * p).toFixed(1)); shape.setAttribute("ry", (70 + 25 * p).toFixed(1)); shape.setAttribute("cy", (140 + 5 * p).toFixed(1)); }
            if (p - lastS > 0.2) { lastS = p; pop(dough, 1.02); }
          }
        });
        alive(g);
        await tween(pin, [{ opacity: 1 }, { opacity: 0 }], 200);
        pin.remove();
        S.dough = dough;
      }
    };
  }

  /* ---------------------------------------- pizza: roll, rub on the sauce, shake the cheese, bake */
  function cheeseBits(n, cx, cy, rx, ry, seed) {
    var s = "", r = seed || 7;
    for (var i = 0; i < n; i++) {
      r = (r * 9301 + 49297) % 233280; var a = r / 233280 * Math.PI * 2;
      r = (r * 9301 + 49297) % 233280; var d = Math.sqrt(r / 233280);
      var x = cx + Math.cos(a) * rx * d, y = cy + Math.sin(a) * ry * d;
      s += R((x - 14).toFixed(1), (y - 4).toFixed(1), 28, 9, 4, "#fff3b0", 0, ' transform="rotate(' + (i * 37 % 180) + " " + x.toFixed(1) + " " + y.toFixed(1) + ')"');
    }
    return s;
  }
  var R_PIZZA = {
    key: "pizza", name: "Pizza", one: "pizza", say: "Let's make a pizza!", iceName: "Sauce", iceSay: "Pick a sauce!",
    ice: [["tomato", "#e8473f"], ["pesto", "#5fb35a"], ["cream", "#fff3dc"], ["pink", "#ff8fb4"], ["barbecue", "#9a4a2f"], ["orange", "#ff9a3c"]],
    cats: ["tops", "ice", "cute", "plate"],
    zone: [{ e: [400, 516, 245, 128] }], view: "70 320 660 400", itemScale: 0.85,
    base: function (p, S) {
      var c = "#e8473f";
      return E(400, 522, 300, 168, "#e9a65a", 6) + E(400, 516, 282, 152, "#f2c27a", 0) +
        E(400, 516, 260, 136, c, 5, ICE(c)) +
        '<g opacity=".95">' + cheeseBits(26, 400, 516, 230, 118, 11) + "</g>" +
        HL("M150 470 C200 400 300 376 400 372", 10, 0.6);
    },
    steps: [
      rollStep({ need: 1500 }),
      {
        id: "sauce", run: async function (S) {
          var g = G, p = uid();
          var lay = mk("div", "ck-lay ck-z5", svg("0 0 800 800", '<defs><clipPath id="' + p + 's"><ellipse cx="400" cy="547" rx="225" ry="78"/></clipPath></defs><g clip-path="url(#' + p + 's)"></g>'));
          var grp = lay.querySelector("g");
          var area = HIT(400, 550, 250, "dough");
          area.style.borderRadius = "50%"; area.style.height = "300px"; area.style.top = "400px";
          var ladle = O(svg("0 0 120 260", R(52, 4, 16, 170, 8, "#cfd8e6", 5) + E(60, 200, 50, 34, "#cfd8e6", 5) + E(60, 196, 38, 22, "#e8473f", 0)), 640, 470, 90, 260 / 120, "ladle", "ck-z20");
          parkTool(ladle);
          var line = "Spread the sauce! Rub all over the dough!";
          say("Spread the sauce!", line);
          want({ mech: "rub", el: "dough", kind: "rub", a: area, cx: 400, cy: 547, r: 225, ry: 78, line: line });
          await gRub({
            area: area, cx: 400, cy: 547, r: 225, ry: 78, need: 0.62, brush: 0.3,
            onTool: function (pt) { follow(ladle, pt, 45, 200); },
            onPaint: function (pt) {
              var n = document.createElementNS("http://www.w3.org/2000/svg", "g");
              n.innerHTML = E(pt.x.toFixed(1), pt.y.toFixed(1), 60, 30, "#e8473f", 0) + E((pt.x - 14).toFixed(1), (pt.y - 6).toFixed(1), 20, 8, "#ff7a6b", 0, ' opacity=".8"');
              grp.appendChild(n);
            }
          });
          alive(g);
          await tween(ladle, [{ opacity: 1 }, { opacity: 0 }], 200);
          S.sauce = lay;
        }
      },
      {
        id: "cheese", run: async function (S) {
          var g = G;
          var lay = mk("div", "ck-lay ck-z6", svg("0 0 800 800", "<g></g>"));
          var grp = lay.querySelector("g");
          var shaker = O(shakerArt("#fff3b0", ""), 400, 430, 130, 170 / 120, "shaker", "ck-z20");
          shaker.firstChild.style.transform = "rotate(180deg)";
          var line = "Shake the cheese! Move it back and forth.";
          say("Shake the cheese!", line);
          want({ mech: "sweep", el: "shaker", kind: "sweep", a: shaker, x0: 220, x1: 580, line: line });
          var acc = 0;
          await gSweep({
            tool: shaker, x0: 220, x1: 580, need: 1700, tiltOn: true,
            onMove: function (x, dx) {
              acc += Math.abs(dx);
              if (acc < 34) return;
              acc = 0;
              var n = document.createElementNS("http://www.w3.org/2000/svg", "g");
              var y = 510 + Math.random() * 70, xx = x + (Math.random() - 0.5) * 60;
              n.innerHTML = cheeseBits(2, xx, y, 30, 12, Math.floor(Math.random() * 999));
              grp.appendChild(n);
              if (!reduced()) { try { n.animate([{ transform: "translateY(-120px)", opacity: 0.4 }, { transform: "none", opacity: 1 }], { duration: 260, easing: "ease-in" }); } catch (e) {} }
              if (Math.random() < 0.3) SFX.sprinkle();
            }
          });
          alive(g);
          await tween(shaker, [{ opacity: 1 }, { opacity: 0 }], 200);
        }
      },
      bakeStep({ tray: function (S, baked) { return svg("0 0 320 140", R(8, 92, 304, 30, 14, "#cfd8e6", 5) + E(160, 76, 140, 40, baked ? "#e9a65a" : "#fbe6c2", 5) + E(160, 72, 120, 30, "#e8473f", 0) + cheeseBits(14, 160, 72, 105, 22, 5) + (baked ? C(110, 64, 10, "#d9473f", 3) + C(200, 80, 10, "#d9473f", 3) + C(160, 66, 10, "#d9473f", 3) : "")); } })
    ]
  };

  /* ---------------------------------------- ice-cream sundae: scoop the balls, pour sauce, push in a wafer */
  var BALL = { strawberry: "#ffb3d1", vanilla: "#fff3dc", mint: "#b7f0df" };
  function ballSVG(col) { return svg("0 0 120 110", Pa("M10 70 C6 30 40 6 60 6 C80 6 114 30 110 70 C104 76 98 70 92 76 C84 84 76 72 68 80 C60 88 52 76 44 82 C34 90 28 74 20 80 C14 84 10 78 10 70 Z", col, 6) + HL("M30 40 C36 28 46 22 56 20", 7, 0.8)); }
  function tubSVG(col) { return svg("0 0 160 140", Pa("M14 50 L146 50 L132 132 L28 132 Z", "#fff", 6) + R(10, 40, 140, 20, 8, col, 6) + Pa("M40 70 L120 70 L116 100 L44 100 Z", col, 0, ' opacity=".6"')); }
  function sundaeGlass() { return svg("0 0 260 300", Pa("M20 30 L240 30 C232 120 180 160 150 168 L150 236 L200 270 L60 270 L110 236 L110 168 C80 160 28 120 20 30 Z", "#eaf8ff", 6) + HL("M42 50 C52 100 80 130 110 146", 9, 0.7)); }
  var R_SUNDAE = {
    key: "sundae", name: "Ice-cream sundae", one: "sundae", say: "Let's make an ice-cream sundae!", iceName: "Sauce", iceSay: "Pick a sauce!",
    ice: [["chocolate", "#6b4430"], ["strawberry", "#ff5a7a"], ["caramel", "#e0a050"], ["blueberry", "#6a6fd6"], ["mint", "#7fdcb5"], ["white", "#fffaf3"]],
    cats: ["ice", "spr", "fruit", "sweets", "cute", "party", "draw", "plate"],
    zone: [{ e: [400, 320, 180, 125] }], view: "150 150 500 540", itemScale: 0.9,
    base: function (p, S) {
      var b = S.balls && S.balls.length ? S.balls : ["#ffb3d1", "#fff3dc", "#b7f0df"], c = "#6b4430";
      var ball = function (x, y, col) { return Pa("M" + (x - 92) + " " + (y + 20) + " C" + (x - 96) + " " + (y - 50) + " " + (x - 40) + " " + (y - 86) + " " + x + " " + (y - 86) + " C" + (x + 40) + " " + (y - 86) + " " + (x + 96) + " " + (y - 50) + " " + (x + 92) + " " + (y + 20) + " Z", col, 6); };
      return Pa("M230 400 L570 400 C560 500 490 540 450 548 L450 610 L520 640 L280 640 L350 610 L350 548 C310 540 240 500 230 400 Z", "#eaf8ff", 6) +
        ball(320, 400, b[0]) + ball(480, 400, b[1 % b.length]) + ball(400, 330, b[2 % b.length]) +
        Pa("M300 250 C320 220 480 220 500 250 C512 278 494 300 486 330 C480 352 466 352 464 332 C460 306 444 304 436 322 C428 342 414 352 408 330 C402 304 384 302 374 320 C366 342 350 340 348 318 C344 292 306 302 304 280 Z", c, 6, ICE(c)) +
        HL("M260 430 C280 480 320 512 350 526", 9, 0.6) +
        (S.wafer === false ? "" : '<g transform="rotate(-20 470 220)">' + R(455, 120, 32, 150, 10, "#f3c47a", 5) + Pa("M455 150 L487 160 M455 180 L487 190 M455 210 L487 220", "none", 0, ' stroke="#c98a3e" stroke-width="4"') + "</g>");
    },
    steps: [
      {
        id: "scoop", run: async function (S) {
          var g = G;
          await newScene();
          S.balls = [];
          var cols = ["strawberry", "vanilla", "mint"];
          var tubs = [120, 255, 390].map(function (x, i) { return O(tubSVG(BALL[cols[i]]), x, 660, 130, 140 / 160, "tub", "ck-z3"); });
          var glass = O(sundaeGlass(), 610, 670, 230, 300 / 260, "glass", "ck-z3");
          var mkBall = function (i) { var b = O(ballSVG(BALL[cols[i]]), [120, 255, 390][i], 590, 96, 110 / 120, "ball", "ck-z8"); b._col = BALL[cols[i]]; b._i = i; return b; };
          var balls = [0, 1, 2].map(mkBall);
          var spots = [[565, 500, 120], [655, 500, 120], [610, 430, 126]];
          var line = "Scoop the ice cream into the glass!";
          say("Scoop the ice cream!", line);
          for (var n = 0; n < 3; n++) {
            want({ mech: "drag", el: "ball", to: "glass", kind: "drag", a: balls[0], b: glass, line: line });
            var r = await gDrag({ items: balls, target: glass, pad: 30 });
            alive(g);
            var bi = balls.indexOf(r.item);
            await flyO(r.item, spots[n][0], spots[n][1], 280, 30, spots[n][2]);
            alive(g);
            r.item.style.zIndex = 9 + n;
            r.item.setAttribute("data-ck", "inglass");
            S.balls.push(r.item._col);
            SFX.plop(); SFX.step(n * 2); pop(r.item, 1.1);
            balls[bi] = mkBall(r.item._i);
            if (!reduced()) show(balls[bi], 240);
            if (n < 2) say(n === 0 ? "Yummy! Another scoop!" : "Keep scooping!");
          }
          tubs.concat(balls).forEach(function (t) { fadeOut(t, 200); });
          S.glass = glass;
        }
      },
      {
        id: "sauce", run: async function (S) {
          var g = G, p = uid();
          var bottle = O(bottleArt("#6b4430"), 610, 300, 110, 220 / 120, "bottle", "ck-z20");
          bottle.firstChild.style.transform = "rotate(180deg)";
          var lay = mk("div", "ck-lay ck-z12", svg("0 0 800 800", '<defs><clipPath id="' + p + 'c"><rect class="ck-clip" x="440" y="340" width="340" height="0"/></clipPath></defs><g clip-path="url(#' + p + 'c)">' +
            Pa("M520 372 C540 344 680 344 700 372 C710 396 694 412 688 440 C684 458 670 458 668 440 C664 416 648 414 640 432 C634 450 620 460 614 440 C608 416 592 414 582 432 C574 452 558 450 556 430 C552 404 522 412 520 392 Z", "#6b4430", 5) + "</g>"));
          var clip = lay.querySelector(".ck-clip");
          var stream = O(svg("0 0 20 100", R(3, 0, 14, 100, 7, "#6b4430", 0)), 610, 380, 20, 5, "", "ck-z12");
          stream.style.opacity = "0";
          var line = "Hold the bottle to pour the sauce!";
          say("Pour the sauce!", line);
          want({ mech: "hold", el: "bottle", kind: "hold", a: bottle, line: line });
          await gHold({
            els: [bottle], ms: 1500,
            onStart: function () { stream.style.opacity = "1"; SFX.glug(); },
            onP: function (q, onn) { clip.setAttribute("height", (130 * q).toFixed(1)); bottle.style.transform = onn ? "translateY(" + (Math.sin(now() / 60) * 3).toFixed(1) + "px)" : "none"; if (!onn) stream.style.opacity = "0"; else if (Math.random() < 0.04) SFX.glug(); }
          });
          alive(g);
          stream.remove();
          await tween(bottle, [{ opacity: 1 }, { opacity: 0, transform: "translateY(-60px)" }], 240);
          bottle.remove();
        }
      },
      {
        id: "wafer", run: async function (S) {
          var g = G;
          var wafer = O(svg("0 0 90 200", R(8, 6, 74, 188, 14, "#f3c47a", 5) + Pa("M8 40 L82 54 M8 80 L82 94 M8 120 L82 134 M8 160 L82 174", "none", 0, ' stroke="#c98a3e" stroke-width="5"')), 200, 640, 74, 200 / 90, "wafer", "ck-z20");
          var top = HIT(610, 400, 70, "top");
          var line = "Push the wafer into the ice cream!";
          say("Add the wafer!", line);
          want({ mech: "drag", el: "wafer", to: "top", kind: "drag", a: wafer, b: top, line: line });
          await gDrag({ items: [wafer], target: top, pad: 40 });
          alive(g);
          await flyO(wafer, 650, 420, 260, 20);
          wafer.style.transform = "rotate(-20deg)";
          wafer.style.zIndex = 8;
          SFX.squish(); sparkles(630, 360, 90, 5);
        }
      }
    ]
  };

  /* ---------------------------------------- cookies: roll, press the cookie cutters, bake */
  var CUT = {
    heart: function () { return heartPath(50, 52, 1.25); },
    star: function () { return starPath(50, 52, 46); },
    bow: function () { return "M50 48 C34 18 6 24 8 48 C10 72 34 76 50 58 C66 76 90 72 92 48 C94 24 66 18 50 48 Z"; },
    kitty: function () { return "M12 58 C8 36 16 22 22 12 L36 28 C44 25 56 25 64 28 L78 12 C84 22 92 36 88 58 C86 80 70 92 50 92 C30 92 14 80 12 58 Z"; }
  };
  var CUT_ORDER = ["heart", "star", "bow", "kitty"];
  function cookieG(kind, x, y, s, fill, ice) {
    return '<g transform="translate(' + (x - 50 * s) + " " + (y - 50 * s) + ") scale(" + s + ')">' + Pa(CUT[kind](), fill, 6 / s) +
      (ice ? '<g transform="translate(10 10) scale(.8)">' + Pa(CUT[kind](), ice, 0, ICE(ice)) + "</g>" : "") + "</g>";
  }
  function cutterSVG(kind) { return svg("0 0 100 100", Pa(CUT[kind](), "none", 0, ' stroke="' + INK + '" stroke-width="13" stroke-linejoin="round"') + Pa(CUT[kind](), "none", 0, ' stroke="#ff8fb4" stroke-width="7" stroke-linejoin="round"')); }
  var R_COOKIES = {
    key: "cookies", name: "Cookies", one: "cookies", say: "Let's bake cookies!", iceName: "Icing", iceSay: "Pick an icing colour!",
    ice: [["pink", "#ffb3d1"], ["white", "#fffaf3"], ["mint", "#b7f0df"], ["lemon", "#fff1a0"], ["lilac", "#d9c8ff"], ["blue", "#cfeaff"]],
    cats: ["ice", "spr", "cute", "sweets", "draw", "plate"],
    zone: [{ r: [180, 330, 440, 330] }], view: "140 270 520 460", itemScale: 0.75,
    base: function (p, S) {
      var c = "#ffb3d1";
      return cookieG("heart", 300, 425, 1.8, "#e8b878", c) + cookieG("star", 500, 425, 1.8, "#e8b878", c) + cookieG("bow", 300, 575, 1.8, "#e8b878", c) + cookieG("kitty", 500, 575, 1.8, "#e8b878", c);
    },
    steps: [
      rollStep({ rect: true, need: 1400 }),
      {
        id: "cut", run: async function (S) {
          var g = G;
          var cutters = CUT_ORDER.map(function (k, i) { var c = O(cutterSVG(k), 170 + i * 153, 360, 110, 1, "cutter", "ck-z8"); c._k = k; return c; });
          var stamps = mk("div", "ck-lay ck-z5", svg("0 0 800 800", "<g></g>"));
          var sg = stamps.querySelector("g");
          var line = "Press the cutters onto the dough!";
          say("Cut out the cookies!", line);
          for (var n = 0; n < 4; n++) {
            var left = cutters.filter(function (c) { return !c.getAttribute("data-done"); });
            want({ mech: "drag", el: "cutter", to: "dough", kind: "drag", a: left[0], b: S.dough, line: line });
            var r = await gDrag({ items: left, target: S.dough, pad: -10 });
            alive(g);
            var x = clamp(r.pt.x, 200, 600), y = clamp(r.pt.y, 560, 620);
            r.item.setAttribute("data-done", "1");
            await flyO(r.item, x, y + 50, 160, 10);
            alive(g);
            SFX.squish(); SFX.step(n * 2);
            var n2 = document.createElementNS("http://www.w3.org/2000/svg", "g");
            n2.innerHTML = cookieG(r.item._k, x, y, 0.95, "#f3d29c", null);
            sg.appendChild(n2);
            pop(S.dough, 1.02);
            await flyO(r.item, 170 + CUT_ORDER.indexOf(r.item._k) * 153, 360, 260, 30);
            r.item.style.opacity = "0.35";
            /* a used cutter rests on the shelf and takes no more touches (it never hides the next one) */
            r.item.style.pointerEvents = "none";
            if (n < 3) say(["A cookie! Try another cutter!", "Yummy! Next cutter!", "Keep going!"][n]);
          }
          cutters.forEach(function (c) { fadeOut(c, 200); });
        }
      },
      bakeStep({ tray: function (S, baked) { var f = baked ? "#e8b878" : "#f8e2bc"; return svg("0 0 320 140", R(8, 92, 304, 30, 14, "#cfd8e6", 5) + cookieG("heart", 60, 70, 0.62, f) + cookieG("star", 125, 70, 0.62, f) + cookieG("bow", 190, 70, 0.62, f) + cookieG("kitty", 258, 70, 0.62, f)); } })
    ]
  };

  /* ---------------------------------------- donuts: poke the holes, fry, dip in the glaze */
  function ringPath(cx, cy, rx, ry, hx, hy) { return "M" + (cx - rx) + " " + cy + " A" + rx + " " + ry + " 0 1 0 " + (cx + rx) + " " + cy + " A" + rx + " " + ry + " 0 1 0 " + (cx - rx) + " " + cy + " Z M" + (cx - hx) + " " + cy + " A" + hx + " " + hy + " 0 1 1 " + (cx + hx) + " " + cy + " A" + hx + " " + hy + " 0 1 1 " + (cx - hx) + " " + cy + " Z"; }
  function wavyGlaze(cx, cy, rx, ry, hx, hy) {
    var d = "";
    for (var i = 0; i <= 48; i++) {
      var a = i / 48 * Math.PI * 2, wob = Math.sin(a) > 0.1 ? 0.08 * Math.max(0, Math.sin(a * 7)) + 0.02 : 0;
      var x = cx + Math.cos(a) * rx * (0.9 + wob), y = cy + Math.sin(a) * ry * (0.88 + wob);
      d += (i ? " L" : "M") + x.toFixed(1) + " " + y.toFixed(1);
    }
    d += " Z M" + (cx - hx * 1.15) + " " + cy + " A" + hx * 1.15 + " " + hy * 1.15 + " 0 1 1 " + (cx + hx * 1.15) + " " + cy + " A" + hx * 1.15 + " " + hy * 1.15 + " 0 1 1 " + (cx - hx * 1.15) + " " + cy + " Z";
    return d;
  }
  function donutSVG(state, glaze) {
    /* state: ball, ring, gold, glazed */
    if (state === "ball") return svg("0 0 160 120", E(80, 64, 72, 50, "#fbe6c2", 6) + HL("M40 50 C50 36 64 30 80 30", 7, 0.7));
    var body = state === "ring" ? "#fbe6c2" : "#e9a65a";
    return svg("0 0 160 120", Pa(ringPath(80, 62, 72, 50, 22, 15), body, 6, ' fill-rule="evenodd"') +
      (state === "glazed" ? Pa(wavyGlaze(80, 58, 70, 46, 22, 15), glaze || "#ff9cc2", 5, ' fill-rule="evenodd"') + HL("M34 46 C44 34 60 28 74 28", 6, 0.7) : HL("M30 50 C40 36 56 30 70 30", 6, 0.5)));
  }
  var R_DONUTS = {
    key: "donuts", name: "Donuts", one: "donut", say: "Let's make donuts!", iceName: "Glaze", iceSay: "Pick a glaze!",
    ice: [["pink", "#ff9cc2"], ["chocolate", "#7a4a33"], ["white", "#fffaf3"], ["mint", "#9fe6cf"], ["lemon", "#ffe27a"], ["blue", "#9fd6ff"]],
    cats: ["ice", "spr", "draw", "fruit", "sweets", "cute", "plate"],
    zone: [{ e: [400, 470, 228, 162] }], hole: [400, 468, 78, 56], view: "110 260 580 440", itemScale: 0.85,
    base: function (p, S) {
      var c = "#ff9cc2";
      return Pa(ringPath(400, 480, 255, 180, 80, 56), "#e9a65a", 6, ' fill-rule="evenodd"') +
        Pa(wavyGlaze(400, 468, 250, 170, 80, 56), c, 6, ' fill-rule="evenodd"' + ICE(c)) +
        HL("M220 400 C260 350 330 324 390 322", 12, 0.6);
    },
    steps: [
      {
        id: "poke", run: async function (S) {
          var g = G;
          await newScene();
          var balls = [210, 400, 590].map(function (x) { return O(donutSVG("ball"), x, 650, 160, 120 / 160, "doughball", "ck-z5"); });
          var line = "Poke a hole in each donut! Tap the middle.";
          say("Poke the holes!", line);
          want({ mech: "tap", el: "doughball", kind: "tap", a: balls[0], line: line });
          var n = 0;
          await gTaps({
            els: balls, need: 3, onTap: function (el) {
              el.innerHTML = donutSVG("ring"); el.setAttribute("data-done", "1");
              SFX.squish(); SFX.step(n * 2); n++;
              if (!reduced()) { try { el.animate([{ transform: "scale(1.15,.8)" }, { transform: "scale(.95,1.08)" }, { transform: "none" }], { duration: 300 }); } catch (e) {} }
              var c = ctr(el); sparkles(c.x, c.y, 60, 3);
              var next = balls.filter(function (b) { return !b.getAttribute("data-done"); })[0];
              if (next) want({ mech: "tap", el: "doughball", kind: "tap", a: next, line: line });
              return true;
            }
          });
          alive(g);
          S.rings = balls;
        }
      },
      {
        id: "fry", run: async function (S) {
          var g = G;
          await newScene();
          var pot = O(svg("0 0 360 220", R(4, 60, 40, 22, 11, "#8a6a5c", 5) + R(316, 60, 40, 22, 11, "#8a6a5c", 5) + Pa("M30 50 L330 50 L314 196 Q310 214 290 214 L70 214 Q50 214 46 196 Z", "#9fdcff", 6) + E(180, 52, 150, 30, "#ffd86b", 6) + E(180, 50, 120, 20, "#ffe9a0", 0) + HL("M60 80 L74 190", 9, 0.6)), 560, 680, 360, 220 / 360, "pot", "ck-z3");
          var board = O(svg("0 0 320 140", R(8, 70, 304, 56, 24, "#f6c891", 5) + '<g transform="translate(14 40) scale(.62)">' + donutSVG("ring").replace(/^<svg[^>]*>|<\/svg>$/g, "") + '</g><g transform="translate(112 40) scale(.62)">' + donutSVG("ring").replace(/^<svg[^>]*>|<\/svg>$/g, "") + '</g><g transform="translate(210 40) scale(.62)">' + donutSVG("ring").replace(/^<svg[^>]*>|<\/svg>$/g, "") + "</g>"), 190, 650, 300, 140 / 320, "board", "ck-z5");
          var line = "Put the donuts in the pot!";
          say(line);
          want({ mech: "drag", el: "board", to: "pot", kind: "drag", a: board, b: pot, line: line });
          await gDrag({ items: [board], target: pot, pad: 10 });
          alive(g);
          fadeOut(board, 160);
          var rs = [480, 560, 640].map(function (x) { return O(donutSVG("ring"), x, 580, 90, 120 / 160, "", "ck-z5"); });
          SFX.sizzle(); SFX.plop();
          for (var i = 0; i < 4; i++) {
            await wait(D(300));
            alive(g);
            SFX.sizzle();
            drops(500 + i * 40, 540, "#fff3b0", 2, 18);
            if (i === 2) rs.forEach(function (r) { r.innerHTML = donutSVG("gold"); pop(r, 1.08); });
          }
          rs.forEach(function (r) { r.classList.add("ck-bob"); });
        }
      },
      {
        id: "dip", run: async function (S) {
          var g = G;
          await newScene();
          var bowl = O(bowlArt(uid(), "#ff9cc2"), 360, 670, 340, 250 / 360, "glaze", "ck-z3");
          var plate = O(svg("0 0 300 90", E(150, 50, 140, 34, "#fff", 6) + E(150, 46, 100, 20, "#ffe4ee", 0)), 650, 670, 240, 90 / 300, "plate", "ck-z3");
          var dn = O(donutSVG("gold"), 360, 380, 220, 120 / 160, "donut", "ck-z8");
          var line = "Dip the donut in the pink glaze!";
          say("Dip it in the glaze!", line);
          want({ mech: "drag", el: "donut", to: "glaze", kind: "drag", a: dn, b: bowl, line: line });
          await gDrag({ items: [dn], target: bowl, pad: 0 });
          alive(g);
          await flyO(dn, 360, 600, 220, 0);
          alive(g);
          SFX.glug(); drops(360, 540, "#ff9cc2", 4, 24);
          dn.innerHTML = donutSVG("glazed");
          await wait(D(350));
          alive(g);
          await flyO(dn, 360, 420, 300, 0);
          alive(g);
          var line2 = "Now put it on the plate!";
          say(line2);
          want({ mech: "drag", el: "donut", to: "plate", kind: "drag", a: dn, b: plate, line: line2 });
          await gDrag({ items: [dn], target: plate, pad: 40 });
          alive(g);
          await flyO(dn, 650, 640, 260, 20, 200);
          SFX.plop(); sparkles(650, 560, 100, 5);
          void bowl;
        }
      }
    ]
  };

  /* ---------------------------------------- bubble tea: drop the fruit, HOLD to blend, pour, add pearls */
  function blenderBase() {
    return svg("0 0 220 120", Pa("M30 10 L190 10 L206 110 L14 110 Z", "#ff8fb4", 6) + C(110, 64, 30, "#fff", 5, ' class="ck-btn"') + C(110, 64, 18, "#63d3b3", 4, ' class="ck-btnc"') + HL("M40 24 L30 96", 7, 0.5));
  }
  function jarSVG(content) {
    return svg("0 0 200 240", Pa("M20 10 L180 10 L164 230 L36 230 Z", "#eaf8ff", 0, ' opacity=".85"') + '<g class="ck-jin">' + (content || "") + "</g>" +
      Pa("M20 10 L180 10 L164 230 L36 230 Z", "none", 6) + R(10, 0, 180, 22, 10, "#fff", 6) + Pa("M180 40 C212 40 214 120 174 130", "none", 6) + HL("M40 30 L54 210", 9, 0.7));
  }
  function cupSVG(level, col, pearls) {
    var h = 200 * level;
    return svg("0 0 200 280", Pa("M20 20 L180 20 L158 268 L42 268 Z", "#eaf8ff", 0, ' opacity=".9"') +
      (level > 0 ? Pa("M" + (20 + 22 * (1 - level)).toFixed(1) + " " + (268 - h).toFixed(1) + " L" + (180 - 22 * (1 - level)).toFixed(1) + " " + (268 - h).toFixed(1) + " L158 268 L42 268 Z", col, 0) : "") +
      (pearls ? C(70, 250, 12, "#3b2a33", 0) + C(100, 254, 12, "#4a3640", 0) + C(130, 250, 12, "#3b2a33", 0) + C(85, 232, 12, "#4a3640", 0) + C(115, 232, 12, "#3b2a33", 0) : "") +
      Pa("M20 20 L180 20 L158 268 L42 268 Z", "none", 6) + HL("M42 40 L58 250", 9, 0.7));
  }
  var R_BUBBLETEA = {
    key: "bubbletea", name: "Bubble tea", one: "bubble tea", say: "Let's make fruity bubble tea!", iceName: "Drink", iceSay: "Pick a drink colour!",
    ice: [["strawberry", "#ffb3d1"], ["mango", "#ffd27a"], ["matcha", "#b9e39a"], ["taro", "#cdb6ff"], ["milk tea", "#e9c9a3"], ["blue", "#a8dcff"]],
    cats: ["ice", "drink", "fruit", "cute", "sweets", "plate"],
    zone: [{ r: [285, 330, 230, 280] }, { e: [400, 300, 150, 45] }], view: "180 190 440 500", itemScale: 0.9,
    base: function (p, S) {
      var c = "#ffb3d1";
      return Pa("M250 290 L550 290 L512 640 L288 640 Z", "#eaf8ff", 0, ' opacity=".9"') +
        Pa("M256 330 L544 330 L512 640 L288 640 Z", c, 0, ICE(c)) +
        C(340, 610, 16, "#3b2a33", 0) + C(376, 616, 16, "#4a3640", 0) + C(412, 612, 16, "#3b2a33", 0) + C(448, 616, 16, "#4a3640", 0) + C(358, 584, 16, "#4a3640", 0) + C(396, 586, 16, "#3b2a33", 0) + C(434, 586, 16, "#4a3640", 0) +
        Pa("M250 290 L550 290 L512 640 L288 640 Z", "none", 6) + E(400, 292, 150, 26, "#fff", 6, ' opacity=".55"') + HL("M282 320 L310 610", 12, 0.7);
    },
    steps: [
      {
        id: "fruit", run: async function (S) {
          var g = G;
          await newScene();
          var base = O(blenderBase(), 330, 670, 240, 120 / 220, "blender", "ck-z3");
          var jar = O(jarSVG(""), 330, 560, 220, 240 / 200, "jar", "ck-z5");
          var fr = ["strawberry", "banana", "orange"].map(function (k, i) { var f = O(decoSVG(k), 640, 420 + i * 120, 110, 1, "fruit", "ck-z8"); f._k = k; return f; });
          var jin = jar.querySelector(".ck-jin");
          var line = "Drop the fruit into the blender!";
          say(line);
          for (var n = 0; n < 3; n++) {
            var left = fr.filter(function (f) { return !f.getAttribute("data-done"); });
            want({ mech: "drag", el: "fruit", to: "jar", kind: "drag", a: left[0], b: jar, line: line });
            var r = await gDrag({ items: left, target: jar, pad: 20 });
            alive(g);
            r.item.setAttribute("data-done", "1");
            await flyO(r.item, 330, 460, 260, 40, 60);
            alive(g);
            r.item.remove();
            jin.insertAdjacentHTML("beforeend", '<g transform="translate(' + (40 + n * 40) + " " + (150 - n * 20) + ') scale(.8)">' + decoSVG(r.item._k).replace(/^<svg[^>]*>|<\/svg>$/g, "") + "</g>");
            SFX.plop(); SFX.step(n * 2); pop(jar, 1.04);
          }
          S.base = base; S.jar = jar;
        }
      },
      {
        id: "blend", run: async function (S) {
          var g = G;
          var btn = HIT(330, 640, 52, "blendbtn");
          var jin = S.jar.querySelector(".ck-jin");
          var line = "Hold the green button to blend!";
          say("Hold the button!", line);
          want({ mech: "hold", el: "blendbtn", kind: "hold", a: btn, haloR: 50, line: line });
          var mixed = false;
          await gHold({
            els: [btn], ms: 1900,
            onStart: function () { SFX.whir(); },
            onP: function (p, onn) {
              S.jar.style.transform = onn ? "translate(" + (Math.sin(now() / 25) * 4).toFixed(1) + "px,0)" : "none";
              jin.style.opacity = String(1 - p * 0.6);
              if (onn && Math.random() < 0.08) SFX.whir();
              if (p > 0.5 && !mixed) { mixed = true; jin.innerHTML = Pa("M30 100 L170 100 L164 230 L36 230 Z", "#ffb3d1", 0); jin.style.opacity = "1"; }
            }
          });
          alive(g);
          /* the blender is done: its button goes, so it never sits over the pearl spoon */
          btn.remove();
          S.jar.style.transform = "none";
          jin.style.opacity = "1";
          jin.innerHTML = Pa("M30 90 L170 90 L164 230 L36 230 Z", "#ffb3d1", 0) + C(70, 120, 8, "#fff", 0, ' opacity=".6"') + C(120, 150, 6, "#fff", 0, ' opacity=".6"');
          sparkles(330, 420, 110, 5);
        }
      },
      {
        id: "pour", run: async function (S) {
          var g = G;
          var cup = O(cupSVG(0, "#ffb3d1", false), 620, 670, 170, 280 / 200, "cup", "ck-z3");
          if (!reduced()) await show(cup, 220);
          var line = "Pour it into the cup! Drag the jug.";
          say("Pour it in the cup!", line);
          want({ mech: "drag", el: "jar", to: "cup", kind: "drag", a: S.jar, b: cup, line: line });
          await gDrag({ items: [S.jar], target: cup, pad: 10 });
          alive(g);
          await flyO(S.jar, 520, 420, 260, 30, 170);
          alive(g);
          await tween(S.jar, [{ transform: "none" }, { transform: "rotate(58deg)" }], 220);
          alive(g);
          SFX.pour();
          for (var i = 1; i <= 5; i++) { await wait(D(140)); alive(g); cup.innerHTML = cupSVG(i / 5 * 0.82, "#ffb3d1", false); if (i === 3) SFX.pour(); }
          S.jar.querySelector(".ck-jin").innerHTML = "";
          await tween(S.jar, [{ transform: "rotate(58deg)", opacity: 1 }, { transform: "rotate(0deg)", opacity: 0 }], 260);
          S.jar.remove();
          fadeOut(S.base, 200);
          S.cup = cup;
        }
      },
      {
        id: "pearls", run: async function (S) {
          var g = G;
          var bowl = O(svg("0 0 200 120", Pa("M10 40 C10 110 190 110 190 40 Z", "#ffe4ee", 6) + E(100, 40, 90, 22, "#fff", 6) + C(60, 40, 12, "#3b2a33", 0) + C(90, 36, 12, "#4a3640", 0) + C(120, 42, 12, "#3b2a33", 0) + C(146, 36, 12, "#4a3640", 0)), 200, 670, 200, 120 / 200, "pearlbowl", "ck-z3");
          var spoon = O(bigSpoonArt("#cfd8e6", C(38, 180, 11, "#3b2a33", 0) + C(62, 186, 11, "#4a3640", 0) + C(50, 166, 11, "#3b2a33", 0) + C(48, 196, 10, "#4a3640", 0)), 240, 600, 84, 230 / 100, "spoon", "ck-z8");
          var line = "Add the chewy pearls!";
          say(line);
          want({ mech: "drag", el: "spoon", to: "cup", kind: "drag", a: spoon, b: S.cup, line: line });
          await gDrag({ items: [spoon], target: S.cup, pad: 20 });
          alive(g);
          await flyO(spoon, 600, 420, 220, 10);
          SFX.plop();
          S.cup.innerHTML = cupSVG(0.82, "#ffb3d1", true);
          pop(S.cup, 1.05);
          await fadeOut(spoon, 200);
          void bowl;
        }
      }
    ]
  };

  /* ---------------------------------------- Mimi onigiri bento: squeeze the rice, wrap the seaweed, fill the box */
  function riceShape(t) {
    /* t 0 = a soft heap, 1 = a neat rounded triangle */
    var pts = [];
    for (var i = 0; i < 12; i++) {
      var a = -Math.PI / 2 + i * Math.PI / 6;
      var blob = { x: 150 + Math.cos(a) * 125, y: 150 + Math.sin(a) * 85 + 20 };
      var k = Math.floor(i / 4), f = (i % 4) / 4;
      var tri = [[150, 20], [270, 230], [30, 230]];
      var A = tri[k], Bq = tri[(k + 1) % 3];
      var tp = { x: A[0] + (Bq[0] - A[0]) * f, y: A[1] + (Bq[1] - A[1]) * f };
      pts.push({ x: blob.x + (tp.x - blob.x) * t, y: blob.y + (tp.y - blob.y) * t });
    }
    var d = "";
    for (var j = 0; j < 12; j++) {
      var p0 = pts[(j + 11) % 12], p1 = pts[j], p2 = pts[(j + 1) % 12], p3 = pts[(j + 2) % 12];
      if (!j) d += "M" + p1.x.toFixed(1) + " " + p1.y.toFixed(1);
      d += " C" + (p1.x + (p2.x - p0.x) / 6).toFixed(1) + " " + (p1.y + (p2.y - p0.y) / 6).toFixed(1) + " " + (p2.x - (p3.x - p1.x) / 6).toFixed(1) + " " + (p2.y - (p3.y - p1.y) / 6).toFixed(1) + " " + p2.x.toFixed(1) + " " + p2.y.toFixed(1);
    }
    return d + " Z";
  }
  function onigiriSVG(t, nori, col) {
    var grains = "";
    if (t > 0.6) [[120, 120], [170, 140], [140, 170], [190, 190], [100, 190]].forEach(function (q) { grains += E(q[0], q[1], 5, 3, "#eee", 0); });
    return svg("0 0 300 260", Pa(riceShape(t), col || "#fff", 6) + grains + (nori ? R(95, 170, 110, 70, 10, "#2f3a33", 5) + Pa("M110 180 L190 180", "none", 0, ' stroke="#4d5c52" stroke-width="5"') : "") + HL("M100 90 C110 70 130 56 150 52", 8, 0.7));
  }
  function bentoSVG(withRice) {
    return svg("0 0 400 280", R(6, 6, 388, 268, 36, "#ff8fb4", 6) + R(22, 22, 356, 236, 24, "#fff6e8", 0) + Pa("M230 22 L230 258", "none", 5) + Pa("M230 140 L378 140", "none", 5) +
      '<g transform="translate(250 30) scale(1)">' + decoSVG("broccoli").replace(/^<svg[^>]*>|<\/svg>$/g, "") + '</g><g transform="translate(260 150) scale(1)">' + decoSVG("tamago").replace(/^<svg[^>]*>|<\/svg>$/g, "") + "</g>" +
      Pa("M30 240 L50 220 L70 240 L90 220 L110 240 L130 220 L150 240 L170 220 L190 240 L210 220 L226 240", "none", 0, ' stroke="#45b06a" stroke-width="9" stroke-linejoin="round"') +
      (withRice ? '<g transform="translate(20 20) scale(.7)">' + onigiriSVG(1, true).replace(/^<svg[^>]*>|<\/svg>$/g, "") + "</g>" : ""));
  }
  var R_BENTO = {
    key: "bento", name: "Mimi bento", one: "bento", say: "Let's make a Mimi rice ball bento!", iceName: "Rice", iceSay: "Pick a rice colour!",
    ice: [["white", "#ffffff"], ["sakura pink", "#ffd6e4"], ["egg yellow", "#fff1a0"], ["green", "#d9f3c4"], ["blue", "#d6ecff"], ["lilac", "#eadfff"]],
    cats: ["face", "ice", "sides", "cute", "fruit", "plate"],
    zone: [{ r: [140, 290, 520, 340] }], view: "90 220 620 490", itemScale: 0.75,
    base: function (p, S) {
      var c = "#ffffff", oni = "";
      var t = '<g transform="translate(140 300) scale(1.3)">';
      oni = t + Pa(riceShape(1), c, 4.6, ICE(c)) + R(95, 170, 110, 70, 10, "#2f3a33", 4.6) + Pa("M110 180 L190 180", "none", 0, ' stroke="#4d5c52" stroke-width="4"') + "</g>";
      return R(110, 270, 580, 400, 44, "#ff8fb4", 6) + R(130, 290, 540, 360, 30, "#fff6e8", 0) + Pa("M540 290 L540 650 M540 470 L670 470", "none", 6) +
        Pa("M140 620 L165 596 L190 620 L215 596 L240 620 L265 596 L290 620 L315 596 L340 620 L365 596 L390 620 L415 596 L440 620 L465 596 L490 620 L515 596 L535 620", "none", 0, ' stroke="#45b06a" stroke-width="12" stroke-linejoin="round"') +
        oni +
        '<g transform="translate(555 310) scale(1.1)">' + decoSVG("minitomato").replace(/^<svg[^>]*>|<\/svg>$/g, "") + "</g>" +
        '<g transform="translate(550 500) scale(1.15)">' + decoSVG("tamago").replace(/^<svg[^>]*>|<\/svg>$/g, "") + "</g>";
    },
    steps: [
      {
        id: "shape", run: async function (S) {
          var g = G;
          await newScene();
          var rice = O(onigiriSVG(0), 400, 660, 320, 260 / 300, "rice", "ck-z5");
          var line = "Squeeze the rice into a triangle! Tap, tap, tap.";
          say("Squeeze the rice!", line);
          want({ mech: "tap", el: "rice", kind: "tap", a: rice, line: line });
          var t = 0;
          await gTaps({
            els: [rice], need: 5, onTap: function (el, n) {
              t = Math.min(1, t + 0.2);
              el.innerHTML = onigiriSVG(t);
              SFX.squish(); SFX.step(n);
              if (!reduced()) { try { el.animate([{ transform: "scale(1.12,.86)" }, { transform: "scale(.94,1.06)" }, { transform: "none" }], { duration: 260 }); } catch (e) {} }
              if (Math.random() < 0.7) drops(400, 520, "#fff", 2, 14);
              return true;
            }
          });
          alive(g);
          S.rice = rice;
          sparkles(400, 520, 140, 5);
        }
      },
      {
        id: "nori", run: async function (S) {
          var g = G;
          var nori = O(svg("0 0 140 100", R(6, 6, 128, 88, 10, "#2f3a33", 6) + Pa("M20 30 L120 30 M20 60 L120 60", "none", 0, ' stroke="#4d5c52" stroke-width="5"')), 660, 640, 140, 100 / 140, "nori", "ck-z8");
          var line = "Wrap the seaweed around the bottom!";
          say("Wrap the seaweed!", line);
          want({ mech: "drag", el: "nori", to: "rice", kind: "drag", a: nori, b: S.rice, line: line });
          await gDrag({ items: [nori], target: S.rice, pad: 10 });
          alive(g);
          await flyO(nori, 400, 630, 200, 0, 120);
          alive(g);
          nori.remove();
          S.rice.innerHTML = onigiriSVG(1, true);
          SFX.squish(); pop(S.rice, 1.06);
        }
      },
      {
        id: "box", run: async function (S) {
          var g = G;
          await flyO(S.rice, 200, 660, 300, 20, 240);
          alive(g);
          var box = O(bentoSVG(false), 560, 690, 380, 280 / 400, "box", "ck-z3");
          if (!reduced()) await show(box, 260);
          var line = "Put the rice ball in the bento box!";
          say("Into the bento box!", line);
          want({ mech: "drag", el: "rice", to: "box", kind: "drag", a: S.rice, b: box, line: line });
          await gDrag({ items: [S.rice], target: box, pad: 10 });
          alive(g);
          await flyO(S.rice, 480, 660, 260, 30, 150);
          alive(g);
          S.rice.remove();
          box.innerHTML = bentoSVG(true);
          SFX.plop(); sparkles(560, 560, 140, 6);
        }
      }
    ]
  };

  /* ---------------------------------------- fruit parfait: make layers, squirt cream, chill */
  var LAYER = { yogurt: "#fffaf3", berry: "#e8344f", granola: "#d39a55" };
  function parfaitInner(layers, cream) {
    var s = "", y = 262;
    layers.forEach(function (c, i) {
      var top = y - 54, inset = (262 - top) * 0.1;
      s += Pa("M" + (44 + (262 - y) * 0.1 - 4).toFixed(1) + " " + y + " L" + (176 - (262 - y) * 0.1 + 4).toFixed(1) + " " + y + " L" + (180 - inset + 6).toFixed(1) + " " + top + " L" + (40 + inset - 6).toFixed(1) + " " + top + " Z", c, 0);
      if (c === LAYER.berry) s += C(80, y - 26, 8, "#ff7a8a", 0) + C(130, y - 30, 8, "#ff7a8a", 0) + C(105, y - 18, 7, "#ff7a8a", 0);
      if (c === LAYER.granola) s += C(70, y - 30, 6, "#a8713f", 0) + C(120, y - 22, 6, "#a8713f", 0) + C(150, y - 34, 6, "#a8713f", 0) + C(95, y - 40, 6, "#a8713f", 0);
      y = top; void i;
    });
    if (cream) s += '<g class="ck-cream" style="transform-origin:110px ' + y + 'px;transform-box:view-box">' + Pa("M40 " + y + " C30 " + (y - 30) + " 60 " + (y - 50) + " 80 " + (y - 40) + " C86 " + (y - 70) + " 134 " + (y - 70) + " 140 " + (y - 40) + " C160 " + (y - 50) + " 190 " + (y - 30) + " 180 " + y + " Z", "#fff", 5) + "</g>";
    return s;
  }
  var R_PARFAIT = {
    key: "parfait", name: "Fruit parfait", one: "parfait", say: "Let's make a fruit parfait!", iceName: "Cream", iceSay: "Pick a cream colour!",
    ice: [["white", "#fffaf3"], ["pink", "#ffd1e3"], ["mint", "#c9f2e3"], ["lemon", "#fff3b0"], ["chocolate", "#c9a184"], ["blue", "#d6ecff"]],
    cats: ["fruit", "ice", "spr", "sweets", "cute", "draw", "plate"],
    zone: [{ e: [400, 255, 150, 70] }, { r: [305, 300, 190, 300] }], view: "180 140 440 560", itemScale: 0.85,
    base: function (p, S) {
      var L0 = S.layers && S.layers.length ? S.layers : [LAYER.yogurt, LAYER.berry, LAYER.granola, LAYER.yogurt], c = "#fffaf3";
      var s = Pa("M290 290 L510 290 L486 600 Q480 624 456 624 L344 624 Q320 624 314 600 Z", "#eaf8ff", 0, ' opacity=".9"');
      var y = 612;
      L0.forEach(function (col) {
        var top = y - 76;
        s += Pa("M" + (318 - (612 - y) * 0.06) + " " + y + " L" + (482 + (612 - y) * 0.06) + " " + y + " L" + (488 + (612 - top) * 0.06) + " " + top + " L" + (312 - (612 - top) * 0.06) + " " + top + " Z", col, 0);
        if (col === LAYER.berry) s += C(360, y - 36, 12, "#ff7a8a", 0) + C(420, y - 44, 12, "#ff7a8a", 0) + C(460, y - 30, 10, "#ff7a8a", 0);
        if (col === LAYER.granola) s += C(350, y - 40, 8, "#a8713f", 0) + C(400, y - 30, 8, "#a8713f", 0) + C(450, y - 46, 8, "#a8713f", 0);
        y = top;
      });
      return s + Pa("M290 290 L510 290 L486 600 Q480 624 456 624 L344 624 Q320 624 314 600 Z", "none", 6) +
        Pa("M280 300 C262 254 310 224 340 236 C350 190 450 190 460 236 C490 224 538 254 520 300 Z", c, 6, ICE(c)) +
        Pa("M350 236 C350 200 400 180 420 206", c, 6, ICE(c)) + HL("M310 320 L330 590", 11, 0.7) +
        Pa("M420 190 C430 160 470 150 490 160 C480 186 450 196 420 190 Z", "#63d3b3", 5);
    },
    steps: [
      {
        id: "layers", run: async function (S) {
          var g = G;
          await newScene();
          S.layers = [];
          var glass = O(glassArt(""), 600, 680, 200, 320 / 220, "glass", "ck-z3");
          var kinds = ["yogurt", "berry", "granola"];
          var bowls = kinds.map(function (k, i) { return O(svg("0 0 160 100", Pa("M8 30 C8 96 152 96 152 30 Z", "#bfe7ff", 6) + E(80, 30, 72, 18, LAYER[k], 6) + (k === "berry" ? C(60, 28, 9, "#ff7a8a", 0) + C(96, 30, 9, "#ff7a8a", 0) : k === "granola" ? C(56, 28, 6, "#a8713f", 0) + C(90, 32, 6, "#a8713f", 0) + C(110, 26, 6, "#a8713f", 0) : "")), 110 + i * 140, 670, 130, 100 / 160, "bowl-" + k, "ck-z3"); });
          var mkSpoon = function (i) { var sp = O(bigSpoonArt("#cfd8e6", E(50, 182, 34, 30, LAYER[kinds[i]], 0)), 110 + i * 140 + 30, 610, 72, 230 / 100, "layerspoon", "ck-z8"); sp._k = kinds[i]; return sp; };
          var spoons = [0, 1, 2].map(mkSpoon);
          var gin = glass.querySelector(".ck-gin");
          var line = "Make layers! Spoon things into the glass.";
          say("Make layers!", line);
          for (var n = 0; n < 4; n++) {
            want({ mech: "drag", el: "layerspoon", to: "glass", kind: "drag", a: spoons[n % 3], b: glass, line: line });
            var r = await gDrag({ items: spoons, target: glass, pad: 20 });
            alive(g);
            var i = kinds.indexOf(r.item._k);
            await flyO(r.item, 600, 470, 200, 20);
            alive(g);
            S.layers.push(LAYER[r.item._k]);
            gin.innerHTML = parfaitInner(S.layers, false);
            SFX.plop(); SFX.step(n * 2); pop(glass, 1.03);
            await flyO(r.item, 110 + i * 140 + 30, 610, 240, 30);
            alive(g);
            if (n < 3) say(["Yummy layer! Add another layer!", "Pretty! More layers!", "Keep going!"][n]);
          }
          spoons.concat(bowls).forEach(function (x) { fadeOut(x, 200); });
          S.glass = glass;
        }
      },
      {
        id: "cream", run: async function (S) {
          var g = G;
          var can = O(svg("0 0 100 220", R(20, 60, 60, 150, 14, "#ff9cc2", 6) + R(36, 30, 28, 36, 6, "#fff", 5) + Pa("M42 30 L50 6 L58 30 Z", "#fff", 5) + C(50, 130, 16, "#fff", 4) + HL("M32 80 L32 196", 7, 0.6)), 620, 330, 90, 220 / 100, "can", "ck-z20");
          can.firstChild.style.transform = "rotate(160deg)";
          var gin = S.glass.querySelector(".ck-gin");
          gin.innerHTML = parfaitInner(S.layers, true);
          var cream = gin.querySelector(".ck-cream");
          cream.style.transform = "scale(0)";
          var line = "Hold the can to squirt the cream on top!";
          say("Squirt the cream!", line);
          want({ mech: "hold", el: "can", kind: "hold", a: can, line: line });
          await gHold({
            els: [can], ms: 1500,
            onStart: function () { SFX.pour(); },
            onP: function (p, onn) { cream.style.transform = "scale(" + p.toFixed(3) + ")"; can.style.transform = onn ? "translateY(" + (Math.sin(now() / 50) * 3).toFixed(1) + "px)" : "none"; if (onn && Math.random() < 0.04) SFX.pour(); }
          });
          alive(g);
          await tween(can, [{ opacity: 1 }, { opacity: 0, transform: "translateY(-60px)" }], 220);
          can.remove();
          sparkles(600, 380, 100, 5);
        }
      },
      bakeStep({ fridge: true, tray: function (S, cold) { return glassArt(parfaitInner(S.layers || [LAYER.yogurt, LAYER.berry], true)); }, w: 130, r: 320 / 220 })
    ]
  };

  /* ---------------------------------------- macarons: pipe the circles, bake, sandwich them */
  function shellSVG(col, p) { return svg("0 0 140 90", E(70, 52, 60, 30, "none", 0, ' stroke="#c9b8a6" stroke-width="4" stroke-dasharray="8 8"') + '<g style="transform-origin:70px 52px;transform-box:view-box;transform:scale(' + (p === undefined ? 1 : p) + ')">' + E(70, 48, 56, 28, col, 5) + R(18, 50, 104, 14, 7, col, 5) + HL("M36 40 C46 30 60 28 72 28", 6, 0.7) + "</g>"); }
  function macaronSVG(col, filling) { return svg("0 0 140 120", E(70, 90, 58, 22, col, 5) + R(18, 66, 104, 14, 7, col, 5) + R(16, 54, 108, 16, 8, filling || "#fff", 5) + R(18, 42, 104, 14, 7, col, 5) + E(70, 36, 58, 26, col, 5) + HL("M34 28 C44 18 60 16 72 16", 6, 0.7)); }
  var R_MACARONS = {
    key: "macarons", name: "Macarons", one: "macarons", say: "Let's make macarons!", iceName: "Shells", iceSay: "Pick a colour for the shells!",
    ice: [["pink", "#ffb3d1"], ["lilac", "#d9c8ff"], ["mint", "#b7f0df"], ["lemon", "#fff1a0"], ["blue", "#bfe3ff"], ["peach", "#ffcfb0"]],
    cats: ["ice", "cute", "spr", "fruit", "draw", "plate"],
    zone: [{ e: [400, 480, 240, 170] }], view: "120 280 560 440", itemScale: 0.75,
    base: function (p, S) {
      var c = "#ffb3d1";
      var mac = function (x, y, s) {
        return '<g transform="translate(' + x + " " + y + ") scale(" + s + ')">' + E(0, 54, 100, 36, c, 6 / s, ICE(c)) + R(-90, 14, 180, 24, 12, c, 6 / s, ICE(c)) + R(-94, -6, 188, 26, 13, "#fff", 6 / s) + R(-90, -30, 180, 24, 12, c, 6 / s, ICE(c)) + E(0, -40, 100, 44, c, 6 / s, ICE(c)) + HL("M-60 -54 C-40 -72 -10 -76 14 -74", 8, 0.7) + "</g>";
      };
      return mac(290, 570, 1) + mac(510, 570, 1) + mac(400, 400, 1.05);
    },
    steps: [
      {
        id: "pipe", run: async function (S) {
          var g = G;
          await newScene();
          O(svg("0 0 640 260", R(6, 20, 628, 230, 30, "#cfd8e6", 6) + R(30, 40, 580, 190, 18, "#fff8ef", 0)), 400, 690, 620, 260 / 640, "tray", "ck-z2");
          var spots = [[230, 520], [400, 520], [570, 520], [230, 620], [400, 620], [570, 620]];
          var marks = spots.map(function (s) { var m = O(shellSVG("#ffb3d1", 0), s[0], s[1] + 40, 140, 90 / 140, "mark", "ck-z5"); return m; });
          var bag2 = O(pipingArt("#ffb3d1"), 680, 380, 100, 220 / 130, "bag", "ck-z20");
          parkTool(bag2);
          var line = "Pipe the circles! Hold your finger on each circle.";
          say("Pipe the circles!", line);
          var setWant = function () { var nx = marks.filter(function (m) { return !m.getAttribute("data-done"); })[0]; if (nx) want({ mech: "hold", el: "mark", kind: "hold", a: nx, haloR: 80, line: line }); };
          setWant();
          var k = 0;
          await gHold({
            els: marks, ms: 700,
            onStart: function (el) { var c = ctr(el); follow(bag2, { x: c.x, y: c.y - 6 }, 50, 170); SFX.squish(); },
            onP: function (p, onn, el) { var gg = el.querySelector("g"); if (gg) gg.style.transform = "scale(" + p.toFixed(3) + ")"; },
            onFull: function (el) { SFX.step(k++); pop(el, 1.08); setWant(); }
          });
          alive(g);
          await tween(bag2, [{ opacity: 1 }, { opacity: 0 }], 200);
        }
      },
      bakeStep({ tray: function (S, baked) { var s = R(8, 92, 304, 30, 14, "#cfd8e6", 5); [50, 115, 180, 245].forEach(function (x, i) { s += E(x + 15, 82 - (i % 2) * 2, 26, 13, baked ? "#ffb3d1" : "#ffd6e6", 4) + R(x - 10, 82, 50, 8, 4, baked ? "#ffb3d1" : "#ffd6e6", 4); }); return svg("0 0 320 140", s); } }),
      {
        id: "sandwich", run: async function (S) {
          var g = G;
          await newScene();
          var xs = [230, 400, 570];
          var bottoms = xs.map(function (x) { return O(svg("0 0 140 90", E(70, 60, 58, 22, "#ffb3d1", 5) + R(18, 36, 104, 14, 7, "#ffb3d1", 5) + R(16, 24, 108, 16, 8, "#fff", 5)), x, 670, 150, 90 / 140, "base", "ck-z3"); });
          var tops = xs.map(function (x) { return O(svg("0 0 140 70", R(18, 36, 104, 14, 7, "#ffb3d1", 5) + E(70, 32, 58, 26, "#ffb3d1", 5) + HL("M34 24 C44 14 60 12 72 12", 6, 0.7)), x, 470, 150, 70 / 140, "shell", "ck-z8"); });
          var line = "Sandwich them! Put a top shell on each macaron.";
          say("Sandwich them!", line);
          for (var n = 0; n < 3; n++) {
            var leftT = tops.filter(function (t) { return !t.getAttribute("data-done"); });
            var leftB = bottoms.filter(function (b) { return !b.getAttribute("data-done"); });
            want({ mech: "drag", el: "shell", to: "base", kind: "drag", a: leftT[0], b: leftB[0], line: line });
            var r = await gDrag({ items: leftT, targets: leftB, pad: 40 });
            alive(g);
            r.item.setAttribute("data-done", "1");
            r.target.setAttribute("data-done", "1");
            await flyO(r.item, r.target._x, r.target._yb - 50, 260, 30);
            alive(g);
            r.item.remove();
            r.target.innerHTML = macaronSVG("#ffb3d1");
            place(r.target, r.target._x, r.target._yb, 150, 120 / 140);
            SFX.squish(); SFX.step(n * 2); pop(r.target, 1.08);
            if (n < 2) say(n === 0 ? "Yummy! Next macaron!" : "Keep going!");
          }
          sparkles(400, 580, 180, 6);
        }
      }
    ]
  };

  /* ---------------------------------------- waffles: pour into the iron, close the lid, open it */
  function ironBase(fill, col) {
    var grid = "";
    for (var i = -3; i <= 3; i++) grid += Pa("M" + (220 + i * 40) + " 30 L" + (220 + i * 40) + " 150", "none", 0, ' stroke="#b77d4a" stroke-width="5" opacity=".6"') + (Math.abs(i) <= 1 ? Pa("M80 " + (90 + i * 30) + " L360 " + (90 + i * 30), "none", 0, ' stroke="#b77d4a" stroke-width="5" opacity=".6"') : "");
    return svg("0 0 440 220", R(10, 40, 420, 170, 50, "#ff8fb4", 6) + E(220, 100, 180, 76, "#5a4650", 6) +
      '<g class="ck-wb" style="transform-origin:220px 100px;transform-box:view-box;transform:scale(' + fill + ')">' + E(220, 100, 170, 70, col || "#fbefc9", 5) + (col ? grid : "") + "</g>" + R(380, 150, 30, 20, 8, "#fff", 4));
  }
  function ironLid(open) {
    return svg("0 0 440 200", R(10, 20, 420, 160, 50, "#ff9cc2", 6) + E(220, 100, 170, 60, "#ffd6e6", 0) + C(220, 100, 24, "#fff", 5) + Pa(heartPath(220, 102, 0.45), "#ff6f9f", 0) + R(196, 0, 48, 26, 10, "#fff", 5));
  }
  var R_WAFFLES = {
    key: "waffles", name: "Waffles", one: "waffle", say: "Let's make waffles!", iceName: "Syrup", iceSay: "Pick a syrup!",
    ice: [["maple", "#d9893a"], ["strawberry", "#ff6f9f"], ["chocolate", "#7a4a33"], ["cream", "#fffaf3"], ["honey", "#ffc94a"], ["blueberry", "#7b7fe0"]],
    cats: ["ice", "fruit", "spr", "sweets", "cute", "draw", "plate"],
    zone: [{ e: [400, 480, 230, 158] }], view: "120 280 560 440", itemScale: 0.9,
    base: function (p, S) {
      var c = "#d9893a", grid = "";
      for (var i = -5; i <= 5; i++) grid += Pa("M" + (400 + i * 44) + " 300 L" + (400 + i * 44) + " 660", "none", 0, ' stroke="#c98a3e" stroke-width="10"') + Pa("M140 " + (480 + i * 34) + " L660 " + (480 + i * 34), "none", 0, ' stroke="#c98a3e" stroke-width="10"');
      return "<defs><clipPath id=\"" + p + 'w"><ellipse cx="400" cy="480" rx="244" ry="168"/></clipPath></defs>' +
        E(400, 492, 250, 172, "#d9954e", 6) + E(400, 480, 250, 172, "#f2b866", 6) + '<g clip-path="url(#' + p + 'w)" opacity=".75">' + grid + "</g>" + E(400, 480, 250, 172, "none", 6) +
        Pa("M240 470 C250 420 330 394 400 394 C470 394 560 414 566 460 C570 488 548 500 540 520 C534 540 520 540 516 520 C512 500 494 500 476 506 C456 514 450 548 444 566 C438 584 422 584 420 560 C416 532 398 512 360 516 C320 520 306 528 298 546 C290 564 274 562 272 540 C270 514 244 506 240 490 Z", c, 6, ICE(c)) +
        HL("M280 440 C320 418 370 410 410 410", 9, 0.6);
    },
    steps: [
      {
        id: "pour", run: async function (S) {
          var g = G;
          await newScene();
          var lid = O(ironLid(true), 400, 470, 400, 200 / 440, "lid", "ck-z2");
          var base = O(ironBase(0), 400, 680, 440, 220 / 440, "iron", "ck-z3");
          var jug = O(jugArt("#fbefc9"), 650, 520, 140, 200 / 170, "jug", "ck-z8");
          jug.style.transformOrigin = "20% 90%";
          var stream = O(svg("0 0 30 200", R(4, 0, 22, 200, 11, "#fbefc9", 5)), 548, 610, 28, 150 / 30, "", "ck-z6");
          stream.style.opacity = "0";
          var wb = base.querySelector(".ck-wb");
          var line = "Hold the jug to pour the batter!";
          say(line);
          want({ mech: "hold", el: "jug", kind: "hold", a: jug, line: line });
          await gHold({
            els: [jug], ms: 1700,
            onStart: function () { jug.style.transform = "rotate(-48deg)"; stream.style.opacity = "1"; SFX.pour(); },
            onP: function (p, onn) { wb.style.transform = "scale(" + (0.1 + 0.9 * p).toFixed(3) + ")"; if (!onn) { jug.style.transform = "none"; stream.style.opacity = "0"; } else if (Math.random() < 0.04) SFX.pour(); }
          });
          alive(g);
          stream.remove();
          await tween(jug, [{ transform: "none", opacity: 1 }, { transform: "translateX(200px)", opacity: 0 }], 260);
          jug.remove();
          S.lid = lid; S.iron = base;
        }
      },
      {
        id: "close", run: async function (S) {
          var g = G;
          var line = "Close the lid! Pull it down.";
          say("Close the lid!", line);
          /* the iron is only where the lid goes: it must not catch a finger meant for the lid's edge */
          S.iron.style.pointerEvents = "none";
          want({ mech: "drag", el: "lid", to: "iron", kind: "drag", a: S.lid, b: S.iron, line: line });
          await gDrag({ items: [S.lid], target: S.iron, pad: 0 });
          alive(g);
          S.iron.style.pointerEvents = "";
          S.lid.style.zIndex = 6;
          await flyO(S.lid, 400, 640, 220, 0, 440);
          alive(g);
          SFX.click();
          for (var i = 0; i < 4; i++) { await wait(D(320)); alive(g); steam(400, 460, 3, 80); SFX.sizzle(); }
          SFX.ding();
        }
      },
      {
        id: "open", run: async function (S) {
          var g = G;
          var line = "Ding! Tap the lid to open it!";
          say("Open it!", line);
          want({ mech: "tap", el: "lid", kind: "tap", a: S.lid, line: line });
          await gTaps({ els: [S.lid], need: 1, onTap: function () { return true; } });
          alive(g);
          S.iron.innerHTML = ironBase(1, "#f2b866");
          await tween(S.lid, [{ transform: "none", opacity: 1 }, { transform: "translateY(-260px)", opacity: 0 }], 320);
          S.lid.remove();
          steam(400, 560, 3, 70); sparkles(400, 560, 160, 6);
        }
      }
    ]
  };

  var RECIPES = [R_CUPCAKE, R_PANCAKES, R_BIRTHDAY, R_PIZZA, R_SUNDAE, R_COOKIES, R_DONUTS, R_BUBBLETEA, R_BENTO, R_PARFAIT, R_MACARONS, R_WAFFLES];
  var RMAP = {};
  RECIPES.forEach(function (r) { RMAP[r.key] = r; });

  /* ------------------------------------------------------------ start and build */
  function start(rootEl, opts) {
    if (G) stop();
    injectCss();
    if (window.KittyChars && window.KittyChars.injectCss) window.KittyChars.injectCss();
    opts = opts || {};
    var auto = !!(opts.autoPlay || (opts.autoPlay === undefined && window.__cookAutoPlay));
    var P0 = getP(), cooks = (P0 && P0.cooks) || 0;
    var friend = FRIENDS.indexOf(opts.friend) >= 0 ? opts.friend : FRIENDS[cooks % FRIENDS.length];
    G = {
      root: rootEl, opts: opts, auto: auto, speed: auto ? 0.5 : 1, friend: friend,
      dead: false, finished: false, timers: [], anims: [], listeners: [], rafs: [],
      t0: now(), marks: [], lastTouch: now(), starsGiven: 0, el: {}, prog: 0, phase: "choose",
      sq: { q: [], cur: null }, seed: Number(opts.recipe) || 0, stepI: -1, stepName: "choose", S: {}
    };
    build();
    var g = G;
    if (soundOn()) later(function () { try { audio(); } catch (e) {} }, 30);
    var sqT = setInterval(function () { if (g === G && !g.dead) pumpSpeech(); }, 100);
    g.timers.push(sqT);
    if (auto) later(function () { mark("auto-end"); hardEnd(); }, AUTO_END);
    run(g).catch(function (e) { if (e !== ABORT && window.console) console.error(e); });
    return { stop: stop };
  }

  function build() {
    var g = G, el = g.el;
    g.root.innerHTML = "";
    var ck = document.createElement("div");
    ck.className = "ck";
    ck.setAttribute("role", "application");
    ck.setAttribute("aria-label", "Cooking time with Mimi");
    g.root.appendChild(ck);
    el.ck = ck;
    var stage = document.createElement("div");
    stage.className = "ck-stage";
    ck.appendChild(stage);
    el.stage = stage;
    stage.innerHTML = '<div class="ck-wall"></div><div class="ck-rail"></div><div class="ck-tiles"></div><div class="ck-ctop"></div><div class="ck-lip"></div><div class="ck-cfront"></div>';
    var sc = document.createElement("div");
    sc.className = "ck-lay"; sc.style.pointerEvents = "auto"; sc.style.width = "0"; sc.style.height = "0";
    stage.appendChild(sc);
    el.scene = sc;
    el.halo = mk("div", "ck-halo", "", stage);
    el.halo.style.display = "none";
    el.hand = mk("div", "ck-hand", svg("0 0 100 120",
      '<path d="M40 8 C48 8 52 14 52 22 L52 50 C56 44 66 44 68 52 C72 46 82 48 82 56 C86 52 96 54 96 64 L96 88 C96 106 82 116 64 116 L54 116 C40 116 32 108 26 98 L10 70 C6 62 14 54 22 60 L30 70 L30 22 C30 14 34 8 40 8 Z" fill="#fff" ' + st(4.5) + "/>" +
      '<path d="M52 50 L52 70 M68 52 L68 72 M82 56 L82 74" stroke="' + INK + '" stroke-width="3" stroke-linecap="round" opacity=".45"/>' +
      '<path d="M40 112 L74 112" stroke="#ff8fb4" stroke-width="8" stroke-linecap="round"/>'), stage);

    el.kit = mk("div", "ck-kit", "", ck);
    el.kit.setAttribute("data-ck", "kitty");
    el.bub = mk("div", "ck-bub", "<span></span>", ck);
    el.bub.setAttribute("data-off", "1");
    el.bub.setAttribute("aria-live", "polite");
    el.prog = mk("div", "ck-prog", "", ck);
    el.prog.setAttribute("aria-hidden", "true");
    el.prog.style.display = "none";

    var back = mk("button", "ck-back", backIconSVG(), ck);
    back.type = "button";
    back.setAttribute("aria-label", "Back to sums");
    back.setAttribute("data-ck", "back");
    on(back, "click", function (e) {
      e.stopPropagation();
      if (!G) return;
      /* once she has decorated (or is already serving), leaving keeps her treat: stars and "made" are saved */
      var kept = G.starsGiven > 0 || G.phase === "serve" || (G.phase === "decorate" && (G.deco || 0) > 0);
      if (kept) done(); else skip();
    });

    on(ck, "pointerdown", function () {
      touch();
      /* iOS only lets sound start inside a tap: resume it here, synchronously */
      try { if (soundOn()) { var c = audio(); if (c && c.state === "suspended") c.resume(); } } catch (e) {}
    }, true);
    on(ck, "contextmenu", function (e) { e.preventDefault(); });
    on(ck, "dragstart", function (e) { e.preventDefault(); });

    if (window.ResizeObserver) {
      g.ro = new ResizeObserver(function () { if (G === g && !g.dead) layout(); });
      g.ro.observe(g.root);
    } else on(window, "resize", layout);
    layout();
  }

  /* ------------------------------------------------------------ where Kitty stands (real pixels in, any parent) */
  /* Her drawing is 200 x 260 units per 200 px of width; the chef hat pokes up KIT_HAT widths above the box,
     her feet (with their shadow) end KIT_FEET widths below its top, so all of her is KIT_TALL widths tall. */
  var KIT_HAT = 0.19, KIT_FEET = 1.29, KIT_TALL = KIT_HAT + KIT_FEET;
  /* on a short sideways screen the studio's Undo and Serve buttons sit in the top row, left of the back button; Serve is this wide */
  var STUDIO_SERVE_W = 124;
  function placeKit(left, top, w) {
    var g = G, el = g.el, kit = el.kit;
    /* wide screens: her own column beside the stage. Narrow: inside the stage, under the props layer */
    var parent = g.wide ? el.ck : el.stage;
    if (kit.parentNode !== parent) {
      if (g.wide) el.ck.insertBefore(kit, el.bub);
      else el.stage.insertBefore(kit, el.scene);
    }
    kit.className = "ck-kit";
    if (g.wide) {
      kit.style.left = left + "px"; kit.style.top = top + "px"; kit.style.width = w + "px";
    } else {
      kit.style.left = ((left - g.sx) / g.k).toFixed(1) + "px"; kit.style.top = ((top - g.sy) / g.k).toFixed(1) + "px";
      kit.style.width = (w / g.k).toFixed(1) + "px";
    }
    kit.style.height = "";
    /* her whole drawn box, hat to feet, in real pixels (the studio buttons keep clear of it) */
    g.kitR = { l: left, t: top - KIT_HAT * w, r: left + w, b: top + KIT_FEET * w };
  }

  /* In a cooking step on a narrow screen some props stand high on the wall (cutters, bottles, a blender).
     At each new instruction Mimi's spot is chosen so that no prop and no button overlaps her: the left of
     the rail first, then the right, then a little smaller. She is only placed there; she never walks or acts. */
  function kitFit() {
    var g = G, n = g.kitN;
    if (!n || g.wide) return;
    var c0 = g.el.ck.getBoundingClientRect(), rects = [];
    var add = function (r) { if (r.width >= 1 && r.height >= 1) rects.push({ l: r.left - c0.left - 4, t: r.top - c0.top - 4, r: r.right - c0.left + 4, b: r.bottom - c0.top + 4 }); };
    var shown = function (e) { for (var x = e; x && x !== g.el.ck; x = x.parentElement) { var cs = getComputedStyle(x); if (cs.display === "none" || cs.visibility === "hidden" || +cs.opacity === 0) return false; } return true; };
    /* props, the treat and its plate: the shapes as drawn (their boxes are often wider than the drawing) */
    Array.prototype.forEach.call(g.el.scene.querySelectorAll(".ck-o, [data-ck='dish'] svg"), function (e) {
      if (!shown(e)) return;
      var svgs = e.tagName.toLowerCase() === "svg" ? [e] : Array.prototype.filter.call(e.children, function (c) { return c.tagName.toLowerCase() === "svg"; });
      if (!svgs.length) { add(e.getBoundingClientRect()); return; }
      svgs.forEach(function (sv) { Array.prototype.forEach.call(sv.children, function (c) { if (c.tagName.toLowerCase() !== "defs") add(c.getBoundingClientRect()); }); });
    });
    /* the thing to use now when it is an invisible touch area (a drawn one is measured above as drawn) */
    Array.prototype.forEach.call(g.el.ck.querySelectorAll("[data-want]"), function (e) {
      var drawn = Array.prototype.some.call(e.children, function (c) { return c.tagName.toLowerCase() === "svg"; });
      if (!drawn) add(e.getBoundingClientRect());
    });
    /* buttons and the top row (Undo is left out: it moves aside for her) */
    Array.prototype.forEach.call(g.el.ck.querySelectorAll(":scope > button, :scope > .ck-prog, :scope > .ck-bub"), function (e) {
      if (e === g.el.undo || e.getAttribute("data-off") === "1" || !shown(e)) return;
      add(e.getBoundingClientRect());
    });
    var best = null, counter = g.sy + (COUNTER + 6) * g.k;
    /* in the studio she keeps to the left: Undo steps aside for her, and Serve (top right) may appear later */
    var leftOnly = g.phase === "decorate";
    /* biggest size first; at each size the ends of the rail, then the ends of the counter top, then any
       other free spot along them (nearest an edge first). The first spot nothing overlaps wins. */
    [1, 0.85, 0.7, 0.55, 0.45].forEach(function (f) {
      if (best && best.hit === 0) return;
      [n.feet, counter].forEach(function (feet) {
        if (best && best.hit === 0) return;
        var w = Math.max(42, Math.min(n.kw * f, (feet - n.minTop) / KIT_TALL));
        var xs = [6, g.cw - 6 - w];
        for (var d = 12; 6 + d < g.cw - 6 - w - d; d += 12) xs.push(6 + d, g.cw - 6 - w - d);
        xs.forEach(function (x) {
          if ((best && best.hit === 0) || (leftOnly && x > g.cw / 2)) return;
          var box = { l: x, t: feet - KIT_TALL * w, r: x + w, b: feet };
          var hit = 0;
          rects.forEach(function (q) {
            var ox = Math.min(box.r, q.r) - Math.max(box.l, q.l), oy = Math.min(box.b, q.b) - Math.max(box.t, q.t);
            if (ox > 0 && oy > 0) hit += ox * oy;
          });
          if (!best || hit < best.hit - 0.5) best = { x: x, w: w, hit: hit, feet: feet };
        });
      });
      /* last: at either end, she stands on top of the tallest thing there (a bento lid, a blender) */
      [6, null].forEach(function (x0) {
        if ((best && best.hit === 0) || (leftOnly && x0 === null)) return;
        var w = Math.max(42, n.kw * f), x = x0 === null ? g.cw - 6 - w : x0, top = n.feet;
        rects.forEach(function (q) { if (q.r > x && q.l < x + w && q.t < top && q.b > n.minTop) top = q.t; });
        w = Math.max(42, Math.min(w, (top - n.minTop) / KIT_TALL));
        if (x0 === null) x = g.cw - 6 - w;
        var box = { l: x, t: top - KIT_TALL * w, r: x + w, b: top }, hit = 0;
        if (box.t < n.minTop - 1) return;
        rects.forEach(function (q) {
          var ox = Math.min(box.r, q.r) - Math.max(box.l, q.l), oy = Math.min(box.b, q.b) - Math.max(box.t, q.t);
          if (ox > 0 && oy > 0) hit += ox * oy;
        });
        if (!best || hit < best.hit - 0.5) best = { x: x, w: w, hit: hit, feet: top };
      });
    });
    placeKit(best.x, best.feet - KIT_FEET * best.w, best.w);
    var tag = "kit:" + (best.x < g.cw / 2 ? "left" : "right") + ":" + (best.feet === n.feet ? "rail" : best.feet === counter ? "counter" : "ontop") + ":" + Math.round(best.w) + (best.hit > 0 ? ":overlap" : "");
    if (tag !== g.kitTag) { g.kitTag = tag; mark(tag); }
  }

  /* the treat and its plate as drawn, in stage units [x0, y0, x1, y1] with a small margin (measured once the
     studio is set up; null before that) */
  function dishBox(g) {
    var D0 = g.D;
    if (!D0) return null;
    if (D0.dbox) return D0.dbox;
    if (!(D0.plate && D0.base && D0.plate.isConnected && g.el.drawer)) return null;
    var s = g.el.stage.getBoundingClientRect(), kk = s.width / ST, x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, got = 0;
    if (!(kk > 0)) return null;
    [D0.plate, D0.base].forEach(function (layer) {
      Array.prototype.forEach.call(layer.querySelectorAll("svg > :not(defs)"), function (c) {
        var r = c.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return;
        got++;
        x0 = Math.min(x0, (r.left - s.left) / kk - 10); x1 = Math.max(x1, (r.right - s.left) / kk + 10);
        y0 = Math.min(y0, (r.top - s.top) / kk - 10); y1 = Math.max(y1, (r.bottom - s.top) / kk + 10);
      });
    });
    if (!got) return null;
    D0.dbox = [x0, y0, x1, y1];
    return D0.dbox;
  }
  /* the part of the stage the studio must show whole on a sideways phone: the treat and its plate as drawn
     (before they are measured, the recipe's view box). Returns [x, y, w, h] in stage units. */
  function studioBox(g) {
    var b = dishBox(g);
    if (b) return [b[0], b[1], b[2] - b[0], b[3] - b[1]];
    return String(g.R.view).split(" ").map(Number);
  }

  /* ------------------------------------------------------------ layout (real pixels) */
  function layout() {
    var g = G, el = g.el;
    var cw = g.root.clientWidth || 1, ch = g.root.clientHeight || 1;
    g.cw = cw; g.ch = ch;
    /* wide: Kitty has her own column at the left. A phone held sideways is wide too, even under 640 px:
       the phone layout would leave the stage (and the studio treat) only a few dozen pixels tall. */
    var wide = cw / ch >= 1.12 && (cw >= 640 || ch < 360);
    var flip = wide !== g.wide;
    g.wide = wide;
    /* low: a short wide screen (a phone held sideways). There is no room for the bubble above her hat, so the
       bubble moves into the top row (as on a phone) and Kitty stands tall in her column under it. */
    var low = wide && ch < 480;
    g.low = low;
    var deco = g.phase === "decorate";
    var T = 62, x0, x1, y0, y1;
    g.KW = 0; g.DW = 0; g.DH = 0;
    g.itemS = cw >= 600 ? 64 : cw < 360 ? 48 : 54;
    if (wide && low) {
      g.KW = clamp(Math.round(((ch - T - 6) * 0.8 - 4) / KIT_TALL), 44, 150) + 16;
      g.DW = deco ? clamp(Math.round(cw * 0.27), 196, 300) : 0;
      x0 = g.KW; x1 = cw - (deco ? g.DW + 14 : 8); y0 = T; y1 = ch - 6;
    } else if (wide) {
      g.KW = clamp(Math.round(cw * 0.18), 150, 240);
      g.DW = deco ? clamp(Math.round(cw * 0.27), 262, 340) : 0;
      x0 = g.KW; x1 = cw - (deco ? g.DW + 14 : 8); y0 = T; y1 = ch - 6;
    } else {
      g.DH = deco ? 6 + 48 + 6 + g.itemS + 6 + 6 : 0;
      x0 = 2; x1 = cw - 2; y0 = T; y1 = ch - (deco ? g.DH + 10 : 4);
    }
    var bw = Math.max(40, x1 - x0), bh = Math.max(40, y1 - y0);
    var k = Math.min(bw / (ST - 40), bh / ST);
    g.k = k; g.sx = x0 + (bw - ST * k) / 2; g.sy = y0 + (bh - ST * k) * (wide ? 0.5 : 0.7);
    /* low studio: the stage is only as tall as the panel, so zoom in on the treat (its view box) to fill the
       free space between Mimi's column and the drawer */
    if (low && deco && g.R && g.R.view) {
      var v = studioBox(g);
      var vk = Math.min(bw / v[2], bh / v[3]);
      if (v.length === 4 && vk > k) { k = vk; g.k = k; g.sx = x0 + (bw - v[2] * k) / 2 - v[0] * k; g.sy = y0 + (bh - v[3] * k) / 2 - v[1] * k; }
    }
    /* other studios: Undo and Serve sit in the top corners of the stage. When the treat stands tall (a sundae
       glass, a parfait) they would cover its top, so the treat moves down into the free room below it, and
       only if that is not enough does it get a little smaller */
    var db = !low && deco ? dishBox(g) : null;
    if (db) {
      var keep = T + 54 + 12;
      if (g.sy + db[1] * k < keep) {
        var down = Math.min(keep - (g.sy + db[1] * k), Math.max(0, y1 - (g.sy + db[3] * k)));
        g.sy += down;
        if (g.sy + db[1] * k < keep - 0.5) {
          var k2 = (y1 - keep) / (db[3] - db[1]);
          if (k2 > 0 && k2 < k) { var cxS = (g.sx + (wide ? (db[0] + db[2]) / 2 : ST / 2) * k); k = k2; g.k = k; g.sx = cxS - (wide ? (db[0] + db[2]) / 2 : ST / 2) * k; g.sy = keep - db[1] * k; }
        }
      }
    }
    g.sw = ST * k;
    g.area = { x0: x0, y0: y0, x1: x0 + bw, y1: y0 + bh };
    /* placed decorations get a touch area of at least 48 screen px (stage units = px / k) */
    el.stage.style.setProperty("--ckhit", (48 / k).toFixed(1) + "px");
    el.stage.style.transform = "translate(" + g.sx.toFixed(1) + "px," + g.sy.toFixed(1) + "px) scale(" + k.toFixed(4) + ")";
    /* the touch pads round the things to use are sized for the NEW scale (padFit reads it from the stage), so this
       comes after the transform: when the phone is turned, a thing keeps a 48 px touch area */
    Array.prototype.forEach.call(el.scene.querySelectorAll(".ck-grab"), padFit);

    /* progress dots (set before Kitty is placed: she keeps clear of them only when they show) */
    var pr = el.prog;
    if (wide) { pr.style.left = "8px"; pr.style.top = "12px"; }
    else { pr.style.left = "8px"; pr.style.top = (T + 2) + "px"; }
    /* in the studio every cooking dot is done: on a phone (and a phone held sideways) the dots step aside for the bubble */
    pr.style.visibility = (!wide || low) && deco ? "hidden" : "visible";

    /* Kitty and her bubble */
    var kit = el.kit, bub = el.bub;
    if (wide && low) {
      /* the bubble fills the top row, right of the dots and left of the back button (and of Undo and Serve in the studio) */
      var pw = pr.style.visibility !== "hidden" && pr.children.length && pr.offsetWidth ? pr.offsetWidth + 16 : 8;
      var bubR = cw - 64 - (deco ? STUDIO_SERVE_W + 8 + 54 + 8 : 0);
      bub.style.left = pw + "px"; bub.style.top = "5px"; bub.style.width = Math.max(120, bubR - pw) + "px"; bub.style.height = "52px";
      g.bubFont = cw >= 600 ? 20 : 17;
      /* Kitty stands on the counter in her column, under the top row */
      var feetL = Math.min(ch - 6, g.sy + (COUNTER + 64) * k);
      var topL = T + 4;
      var kwL = Math.max(44, Math.min(g.KW - 16, (feetL - topL) / KIT_TALL));
      placeKit((g.KW - kwL) / 2, feetL - KIT_FEET * kwL, kwL);
    } else if (wide) {
      var kw = Math.min(g.KW - 16, 210), kh = kw * 1.3;
      var feet = g.sy + (COUNTER + 64) * k;
      var top = feet - kh;
      var bubH = clamp(Math.round(ch * 0.2), 74, 130);
      /* the chef hat pokes up above her box: the bubble sits above the hat, never over it */
      if (top - KIT_HAT * kw < T + bubH + 10) { var room = feet - (T + bubH + 10); kw = Math.max(80, room / (1.3 + KIT_HAT)); kh = kw * 1.3; top = feet - kh; }
      placeKit((g.KW - kw) / 2, top, kw);
      bub.style.left = "8px"; bub.style.top = Math.max(T, top - KIT_HAT * kw - bubH - 8) + "px"; bub.style.width = (g.KW - 10) + "px"; bub.style.height = bubH + "px";
      g.bubFont = 21;
    } else {
      /* phone or upright iPad: her whole body stands on the white shelf rail at the left of the wall, under
         the progress dots, behind every prop (the card screen moves her next to "Let's cook!", see layoutPick) */
      var feetN = g.sy + 300 * k, minTop = T + (deco ? 4 : 34);
      var kwN = Math.min(clamp(Math.round(cw * 0.22), 60, 130), (feetN - minTop) / KIT_TALL);
      kwN = Math.max(44, kwN);
      g.kitN = { feet: feetN, kw: kwN, minTop: minTop };
      placeKit(6, feetN - KIT_FEET * kwN, kwN);
      if (g.phase === "cook" || (deco && g.el.drawer)) kitFit();
      bub.style.left = "6px"; bub.style.top = "5px"; bub.style.width = (cw - 6 - 64) + "px"; bub.style.height = "52px";
      g.bubFont = cw >= 600 ? 21 : 17;
    }
    if (flip && g.kpose) kittyShow(g.kpose, g.kopts);
    else if (flip) kittyShow("wave");
    if (bub.getAttribute("data-off") === "0") fitBubble();


    if (g.layoutPick) g.layoutPick();
    if (g.layoutDrawer) g.layoutDrawer();
  }

  /* ------------------------------------------------------------ choosing a recipe */
  function pickThree() {
    var P0 = getP();
    var all = RECIPES.map(function (r) { return r.key; });
    var recent = P0 && Array.isArray(P0.cookRecent) ? P0.cookRecent.filter(function (k) { return all.indexOf(k) >= 0; }) : [];
    var last = P0 && Array.isArray(P0.cookCards) ? P0.cookCards.filter(function (k) { return all.indexOf(k) >= 0; }) : [];
    var made = P0 && P0.made && typeof P0.made === "object" ? P0.made : {};
    var fresh = all.filter(function (k) { return recent.indexOf(k) < 0; });
    var never = shuffle(fresh.filter(function (k) { return !made[k]; }));
    var some = shuffle(fresh.filter(function (k) { return made[k]; }));
    /* the host's seed nudges which never-made recipe leads, so two hosts do not always agree */
    if (never.length > 1) { var s = Math.abs(G.seed) % never.length; never = never.slice(s).concat(never.slice(0, s)); }
    var order = never.concat(some).concat(recent.slice().reverse());
    var pick = order.slice(0, 3);
    if (last.length === 3 && pick.every(function (k) { return last.indexOf(k) >= 0; })) {
      var alt = order.filter(function (k) { return last.indexOf(k) < 0; })[0];
      if (alt) pick[2] = alt;
    }
    var f = window.__cookForce;
    if (f && all.indexOf(f) >= 0) pick = [f].concat(pick.filter(function (k) { return k !== f; })).slice(0, 3);
    return pick;
  }
  function hostSave() { var f = host("save"); if (f) { try { f(); } catch (e) {} } }

  function choose() {
    var g = G, el = g.el;
    g.phase = "choose"; g.stepName = "choose";
    mark("choose");
    var keys = pickThree();
    g.cards = keys.slice();
    var P0 = getP();
    if (P0) { try { P0.cookCards = keys.slice(); hostSave(); } catch (e) {} }
    var pick = mk("div", "ck-pick", "", el.ck);
    el.pick = pick;
    var cards = keys.map(function (k) {
      var R0 = RMAP[k];
      var b = mk("button", "ck-card" + (!(P0 && P0.made && P0.made[k]) ? " ck-new" : ""), '<span class="ck-cpic">' + thumbSVG(R0) + '</span><span class="ck-cname">' + R0.name + "</span>", pick);
      b.type = "button";
      b.setAttribute("data-ck", "card");
      b.setAttribute("data-key", k);
      b.setAttribute("aria-label", R0.name);
      return b;
    });
    var go = mk("button", "ck-go ck-wait", "Let's cook!", pick);
    go.type = "button";
    go.setAttribute("data-ck", "go");
    g.layoutPick = function () {
      var T = 62, ax0 = g.wide ? g.KW : 8, ax1 = g.cw - 8, ay0 = T + 2, ay1 = g.ch - 8;
      var aw = ax1 - ax0, ah = ay1 - ay0, goH = 58, gap = 10;
      /* narrow screens: Mimi stands at the bottom left, beside "Let's cook!", in a band of her own height.
         The band never takes more than about 45% of the height, so the cards always keep their room. */
      var kwP = g.wide ? 0 : Math.max(44, Math.min(clamp(Math.round(g.cw * 0.22), 60, 130), (ah * 0.45) / KIT_TALL));
      var bandH = g.wide ? goH : Math.max(goH, kwP * KIT_TALL);
      pick.style.left = ax0 + "px"; pick.style.top = ay0 + "px"; pick.style.width = aw + "px"; pick.style.height = ah + "px";
      pick.style.gap = "0";
      /* Three ways to lay out the cards; each is sized from the real room, and the one that gives the biggest
         pictures wins: a row with "Let's cook!" under it, a column with it under them, or (a phone held sideways)
         a row with "Let's cook!" at its right. Cards never overlap each other or the button. */
      var plans = [];
      var rowW = Math.min((aw - 2 * gap) / 3, 280), rowH = Math.min(ah - bandH - 16, rowW * 1.25);
      plans.push({ kind: "row", cwid: rowW, chei: rowH, pic: Math.min(rowW - 24, rowH - 62) });
      var colH = Math.min((ah - bandH - 12 - 2 * gap) / 3, 130);
      plans.push({ kind: "col", cwid: aw, chei: colH, pic: Math.min(colH - 12, aw * 0.4) });
      if (g.wide) {
        var goW = clamp(Math.round(aw * 0.2), 112, 150), sideW = Math.min((aw - goW - 3 * gap) / 3, 220), sideH = Math.min(ah, sideW * 1.4);
        plans.push({ kind: "side", cwid: sideW, chei: sideH, goW: goW, pic: Math.min(sideW - 24, sideH - 62) - 4 });
      }
      var plan = plans.filter(function (q) { return q.chei >= 64; }).sort(function (a, b) { return b.pic - a.pic; })[0] ||
        plans.sort(function (a, b) { return b.chei - a.chei; })[0];
      var row = plan.kind !== "col";
      pick.classList.toggle("ck-row", row);
      var cwid = plan.cwid, chei = plan.chei, pic, bandT;
      go.style.whiteSpace = ""; go.style.padding = ""; go.style.lineHeight = ""; go.style.fontSize = "";
      if (plan.kind === "side") {
        pic = Math.max(36, plan.pic);
        var total = 3 * cwid + 3 * gap + plan.goW, l0 = (aw - total) / 2, t1 = (ah - chei) / 2;
        cards.forEach(function (c, i) { c.style.position = "absolute"; c.style.left = (l0 + i * (cwid + gap)) + "px"; c.style.top = t1 + "px"; c.style.width = cwid + "px"; c.style.height = chei + "px"; });
        var gh = Math.min(chei, 112);
        go.style.position = "absolute"; go.style.left = (l0 + 3 * (cwid + gap)) + "px"; go.style.width = plan.goW + "px";
        go.style.top = (t1 + (chei - gh) / 2) + "px"; go.style.height = gh + "px";
        go.style.whiteSpace = "normal"; go.style.padding = "0 8px"; go.style.lineHeight = "1.05"; go.style.setProperty("font-size", "22px", "important");
      } else if (row) {
        pic = Math.max(44, Math.min(cwid - 24, chei - 62));
        var left0 = (aw - (3 * cwid + 2 * gap)) / 2, top0 = Math.max(0, (ah - bandH - 16 - chei) / 2);
        cards.forEach(function (c, i) { c.style.position = "absolute"; c.style.left = (left0 + i * (cwid + gap)) + "px"; c.style.top = top0 + "px"; c.style.width = cwid + "px"; c.style.height = chei + "px"; });
        bandT = top0 + chei + 16;
      } else {
        pic = Math.max(40, Math.min(chei - 12, aw * 0.4));
        var t0 = Math.max(0, (ah - bandH - 12 - 3 * chei - 2 * gap) / 2);
        cards.forEach(function (c, i) { c.style.position = "absolute"; c.style.left = "0px"; c.style.top = (t0 + i * (chei + gap)) + "px"; c.style.width = aw + "px"; c.style.height = chei + "px"; });
        bandT = t0 + 3 * chei + 2 * gap + 12;
      }
      cards.forEach(function (c) { var p = c.firstChild; p.style.width = pic + "px"; c.lastChild.style.fontSize = (row ? clamp(cwid / 9, 16, 28) : clamp(chei / 3.6, 18, 26)) + "px"; });
      if (plan.kind === "side") return;
      go.style.position = "absolute"; go.style.top = (bandT + bandH - goH) + "px"; go.style.height = goH + "px";
      if (g.wide) {
        var gw = Math.min(aw, 300);
        go.style.width = gw + "px"; go.style.left = ((aw - gw) / 2) + "px";
      } else {
        /* Kitty on the left of the band, the button to her right (centred in what is left) */
        var room = aw - kwP - 12, gw2 = Math.min(room, 300);
        go.style.width = gw2 + "px"; go.style.left = (kwP + 12 + (room - gw2) / 2) + "px";
        placeKit(ax0, ay0 + bandT + bandH - KIT_FEET * kwP, kwP);
      }
    };
    layout();
    say("Pick a treat to make!", "What shall we make? Pick a treat!");
    kittyShow("wave");
    if (!reduced()) cards.forEach(function (c, i) { try { c.animate([{ transform: "translateY(30px) scale(.8)", opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 320, delay: i * 90, easing: "cubic-bezier(.3,1.4,.5,1)", fill: "backwards" }); } catch (e) {} });
    want({ mech: "pick", el: "card", kind: "tap", line: "Tap a picture to choose!" });
    return new Promise(function (res) {
      var sel = null, finished = false;
      var choose2 = function (k) {
        if (finished) return;
        finished = true; clearHint();
        mark("chose:" + k);
        SFX.yay();
        res(k);
      };
      var tapCard = function (c) {
        var k = c.getAttribute("data-key");
        touch();
        if (sel === k) { choose2(k); return; }
        sel = k;
        cards.forEach(function (x) { x.classList.toggle("ck-sel", x === c); });
        go.classList.remove("ck-wait");
        SFX.pip(); pop(c, 1.05);
        say(RMAP[k].name + "!", RMAP[k].name + "! Tap again, or tap Let's cook.");
        g.prog += 1;
      };
      cards.forEach(function (c) { on(c, "click", function (e) { e.stopPropagation(); tapCard(c); }); });
      on(go, "click", function (e) { e.stopPropagation(); if (sel) choose2(sel); else { pop(go, 1.06); say("Tap a picture first!"); } });
      if (g.auto) {
        later(function () { tapCard(cards[0]); later(function () { tapCard(cards[0]); }, 200); }, AUTO_WAIT);
      }
    }).then(async function (k) {
      g.layoutPick = null;
      await fadeOut(pick, 220);
      alive(g);
      el.pick = null;
      return RMAP[k];
    });
  }

  /* ------------------------------------------------------------ progress dots (no numbers) */
  function buildProg() {
    var g = G, pr = g.el.prog, h = "";
    for (var i = 0; i < g.R.steps.length; i++) h += "<i></i>";
    h += "<b>" + sparkIconSVG() + "</b><b>" + heartSmallSVG() + "</b>";
    pr.innerHTML = h;
    pr.style.display = "flex";
  }
  function setProg(n) {
    var dots = G.el.prog.querySelectorAll("i");
    Array.prototype.forEach.call(dots, function (d, i) { d.className = i < n ? "ck-ok" : i === n ? "ck-on" : ""; });
  }

  /* ------------------------------------------------------------ the whole break */
  var CHEERS = ["Yay!", "Great job!", "Well done!", "Wonderful!", "So good!", "You did it!"];
  async function run(g) {
    kittyShow("wave");
    var R0 = await choose();
    alive(g);
    g.R = R0;
    mark("recipe:" + R0.key);
    g.phase = "cook";
    buildProg();
    layout();
    kittyShow("stand");
    say(R0.say);
    for (var i = 0; i < R0.steps.length; i++) {
      g.stepI = i; g.stepName = R0.steps[i].id; g.prog = 0;
      setProg(i);
      mark("step:" + g.stepName);
      await R0.steps[i].run(g.S);
      alive(g);
      /* a step's invisible touch areas (a blender button, a bowl) are spent once the step is done: they must
         never catch a finger meant for the next step's things */
      Array.prototype.forEach.call(g.el.stage.querySelectorAll(".ck-hit"), function (h) { h.style.pointerEvents = "none"; h.classList.remove("ck-grab"); h.setAttribute("data-spent", "1"); });
      clearHint();
      kittyHappy(1100);
      say(CHEERS[(i + g.seed) % CHEERS.length]);
      SFX.ding();
      await wait(D(650));
      alive(g);
    }
    setProg(R0.steps.length);
    await decorate();
    alive(g);
    await serve();
  }

  /* ------------------------------------------------------------ the decorating studio (the big part) */
  /* Zones are where decorations may sit, in stage units: {e:[cx,cy,rx,ry]} or {r:[x,y,w,h]}; an optional hole. */
  function zoneD(pt, z) {
    if (z.e) return hyp((pt.x - z.e[0]) / z.e[2], (pt.y - z.e[1]) / z.e[3]);
    var r = z.r, cx = r[0] + r[2] / 2, cy = r[1] + r[3] / 2;
    return Math.max(Math.abs(pt.x - cx) / (r[2] / 2), Math.abs(pt.y - cy) / (r[3] / 2));
  }
  function zoneFit(pt, R0, reach) {
    /* returns a point inside the zone, or null when pt is too far away (that means "off the treat") */
    var best = null, bd = 1e9;
    R0.zone.forEach(function (z) { var d = zoneD(pt, z); if (d < bd) { bd = d; best = z; } });
    if (bd > (reach || 1.35)) return null;
    var q = { x: pt.x, y: pt.y };
    if (bd > 0.97) {
      var f = 0.97 / bd;
      if (best.e) { q.x = best.e[0] + (pt.x - best.e[0]) * f; q.y = best.e[1] + (pt.y - best.e[1]) * f; }
      else { var r = best.r, cx = r[0] + r[2] / 2, cy = r[1] + r[3] / 2; q.x = clamp(pt.x, r[0] + 6, r[0] + r[2] - 6); q.y = clamp(pt.y, r[1] + 6, r[1] + r[3] - 6); void cx; void cy; }
    }
    if (R0.hole) {
      var h = R0.hole, hd = hyp((q.x - h[0]) / h[2], (q.y - h[1]) / h[3]);
      if (hd < 1.15) { var a = Math.atan2((q.y - h[1]) / h[3], (q.x - h[0]) / h[2]); q.x = h[0] + Math.cos(a) * h[2] * 1.3; q.y = h[1] + Math.sin(a) * h[3] * 1.3; }
    }
    return q;
  }
  function zoneBox(R0) {
    var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    R0.zone.forEach(function (z) {
      if (z.e) { x0 = Math.min(x0, z.e[0] - z.e[2]); x1 = Math.max(x1, z.e[0] + z.e[2]); y0 = Math.min(y0, z.e[1] - z.e[3]); y1 = Math.max(y1, z.e[1] + z.e[3]); }
      else { x0 = Math.min(x0, z.r[0]); y0 = Math.min(y0, z.r[1]); x1 = Math.max(x1, z.r[0] + z.r[2]); y1 = Math.max(y1, z.r[1] + z.r[3]); }
    });
    return { x0: x0, y0: y0, x1: x1, y1: y1 };
  }
  function zoneClip(R0, id) {
    var s = "";
    R0.zone.forEach(function (z) {
      if (z.e) s += '<ellipse cx="' + z.e[0] + '" cy="' + z.e[1] + '" rx="' + (z.e[2] * 1.06) + '" ry="' + (z.e[3] * 1.06) + '"/>';
      else s += '<rect x="' + (z.r[0] - 8) + '" y="' + (z.r[1] - 8) + '" width="' + (z.r[2] + 16) + '" height="' + (z.r[3] + 16) + '" rx="30"/>';
    });
    return '<clipPath id="' + id + '">' + s + "</clipPath>";
  }
  /* a pleasant free spot for a tapped decoration */
  function freeSpot(R0, size) {
    var D0 = G.D, b = zoneBox(R0), best = null, bs = -1;
    for (var i = 0; i < 40; i++) {
      var p = { x: b.x0 + Math.random() * (b.x1 - b.x0), y: b.y0 + Math.random() * (b.y1 - b.y0) };
      var q = zoneFit(p, R0, 0.9);
      if (!q) continue;
      var dmin = 1e9;
      D0.items.forEach(function (it) { dmin = Math.min(dmin, hyp(it.x - q.x, it.y - q.y)); });
      if (dmin > bs) { bs = dmin; best = q; }
      if (dmin > size * 1.2) break;
    }
    return best || zoneFit({ x: (b.x0 + b.x1) / 2, y: (b.y0 + b.y1) / 2 }, R0, 9);
  }

  async function decorate() {
    var g = G, R0 = g.R;
    g.phase = "decorate"; g.stepName = "decorate"; g.stepI = R0.steps.length; g.prog = 0;
    mark("decorate");
    await newScene();
    alive(g);
    var sc = g.el.scene, p = uid();
    var dish = mk("div", "ck-lay ck-z3", "", sc);
    dish.setAttribute("data-ck", "dish");
    var plate = mk("div", "ck-lay", plateLayer(PLATES[0][1]), dish);
    var base = mk("div", "ck-lay", svg("0 0 800 800", R0.base(p, g.S)), dish);
    base.setAttribute("data-ck", "treat");
    var drz = mk("div", "ck-lay", svg("0 0 800 800", "<defs>" + zoneClip(R0, p + "zc") + '</defs><g clip-path="url(#' + p + 'zc)"></g>'), dish);
    var spr = mk("div", "ck-lay", "", dish);
    var itl = mk("div", "ck-lay", "", dish);
    var surf = mk("div", "ck-lay", "", dish);
    surf.style.pointerEvents = "none";
    surf.setAttribute("data-ck", "drawsurf");
    var D0 = g.D = {
      dish: dish, plate: plate, base: base, drz: drz.querySelector("g"), spr: spr, itl: itl, surf: surf,
      items: [], undo: [], lines: 0, groups: 0, ice: null, plateCol: PLATES[0][1], pen: null, cat: R0.cats[0], page: 0, size: 84 * (R0.itemScale || 1)
    };
    if (!reduced()) await show(dish, 320);
    alive(g);

    /* the drawer, the undo button and the serve button (real pixels) */
    var drawer = mk("div", "ck-drawer", '<div class="ck-tabs"></div><div class="ck-items"></div>', g.el.ck);
    drawer.setAttribute("data-ck", "drawer");
    g.el.drawer = drawer;
    var tabs = drawer.firstChild, box = drawer.lastChild;
    function fillTabs() {
      var cap = D0.tabCap || 99, n = R0.cats.length, list = R0.cats, pages = 1;
      if (n > cap) { pages = Math.ceil(n / (cap - 1)); if (D0.tabPage >= pages) D0.tabPage = 0; list = R0.cats.slice(D0.tabPage * (cap - 1), D0.tabPage * (cap - 1) + cap - 1); }
      tabs.innerHTML = "";
      list.forEach(function (cat) {
        var t = mk("button", "ck-tab" + (cat === D0.cat ? " ck-on" : ""), catIcon(cat, R0), tabs);
        t.type = "button";
        t.setAttribute("data-ck", "tab-" + cat);
        t.setAttribute("aria-label", cat === "ice" ? R0.iceName : cat);
        t.addEventListener("click", function (e) { e.stopPropagation(); openCat(cat, true); });
      });
      if (pages > 1) {
        var m = mk("button", "ck-tab ck-more", arrowIconSVG(), tabs);
        m.type = "button"; m.setAttribute("data-ck", "tabmore"); m.setAttribute("aria-label", "More kinds");
        m.addEventListener("click", function (e) { e.stopPropagation(); D0.tabPage = (D0.tabPage + 1) % pages; SFX.pip(); fillTabs(); });
      }
    }
    D0.tabPage = 0;
    var undo = mk("button", "ck-undo ck-none", undoIconSVG(), g.el.ck);
    undo.type = "button"; undo.setAttribute("data-ck", "undo"); undo.setAttribute("aria-label", "Undo");
    var serveB = mk("button", "ck-serve", heartSmallSVG() + "<span>Serve</span>", g.el.ck);
    serveB.type = "button"; serveB.setAttribute("data-ck", "serve"); serveB.setAttribute("data-off", "1");
    g.el.undo = undo; g.el.serveB = serveB;

    g.layoutDrawer = function () {
      var cw = g.cw, ch = g.ch, T = 62, n = 0, per;
      var list = catList(D0.cat);
      if (g.wide) {
        drawer.style.left = (cw - g.DW - 6) + "px"; drawer.style.top = T + "px"; drawer.style.width = g.DW + "px"; drawer.style.height = (ch - T - 6) + "px";
        var iw = g.DW - 18, cols = Math.max(3, Math.floor((iw + 8) / (68 + 8))), isz = Math.floor((iw - (cols - 1) * 8) / cols);
        var perRow = Math.max(1, Math.floor((iw + 5) / 53)), tabRows = Math.ceil(R0.cats.length / perRow);
        var hFree = ch - T - 6 - 18;
        if (g.low && tabRows * 53 + Math.max(44, Math.min(isz, 56)) + 6 > hFree) {
          /* a phone held sideways: one row of tabs with an arrow for more kinds, so a row of things still fits */
          tabs.style.flexWrap = "nowrap"; tabs.style.overflowX = "hidden";
          D0.tabCap = perRow; tabRows = 1;
        } else {
          tabs.style.flexWrap = "wrap"; tabs.style.overflowX = "visible";
          D0.tabCap = 99;
        }
        var ih = hFree - tabRows * 53 - 6;
        /* the things must fit the height left under the tabs, but stay 44 px or more to her finger */
        if (isz > ih) isz = Math.max(44, Math.floor(ih));
        var rows = Math.max(1, Math.floor((ih + 8) / (isz + 8)));
        /* sideways phone: when a slightly smaller size (50 px or more) fits one more row, use it */
        var isz2 = Math.floor((ih - rows * 8) / (rows + 1));
        if (g.low && isz2 >= 50) { isz = isz2; rows += 1; }
        per = cols * rows;
        box.style.gridTemplateColumns = "repeat(" + cols + "," + isz + "px)"; box.style.gap = "8px";
      } else {
        drawer.style.left = "6px"; drawer.style.top = (ch - g.DH - 6) + "px"; drawer.style.width = (cw - 12) + "px"; drawer.style.height = g.DH + "px";
        tabs.style.flexWrap = "nowrap"; tabs.style.overflowX = "hidden";
        D0.tabCap = Math.max(3, Math.floor((cw - 12 - 18 + 5) / 53));
        var w = cw - 12 - 18, c2 = Math.max(4, Math.floor((w + 6) / (g.itemS + 6)));
        var s2 = Math.floor((w - (c2 - 1) * 6) / c2);
        per = c2;
        box.style.gridTemplateColumns = "repeat(" + c2 + "," + s2 + "px)"; box.style.gap = "6px";
      }
      D0.per = per;
      fillTabs();
      fillItems(list);
      /* undo and serve sit in the free top corners of the stage */
      undo.style.position = "absolute"; serveB.style.position = "absolute";
      if (g.low) {
        /* a phone held sideways: Undo and Serve sit in the top row, left of the back button (the bubble leaves
           room for them), so they cover neither the treat nor Kitty */
        undo.style.left = (cw - 64 - STUDIO_SERVE_W - 8 - 54) + "px"; undo.style.top = "3px";
        serveB.style.width = STUDIO_SERVE_W + "px"; serveB.style.minHeight = "52px"; serveB.style.height = "52px";
        serveB.style.padding = "0 8px"; serveB.style.fontSize = "21px"; serveB.style.justifyContent = "center";
        serveB.style.left = (cw - 64 - STUDIO_SERVE_W) + "px"; serveB.style.top = "4px";
        return;
      }
      /* turned back upright (or never sideways): Serve gets its usual size again */
      ["width", "minHeight", "height", "padding", "fontSize", "justifyContent"].forEach(function (k) { serveB.style[k] = ""; });
      var ux = Math.max(6, g.sx + 8), uy = Math.max(T, g.sy + 8), kr = g.kitR;
      /* never lower than the top of the treat (layout moved the treat down to make room for them) */
      var db = dishBox(g);
      if (db) uy = Math.max(T, Math.min(uy, g.sy + db[1] * g.k - 54 - 8));
      /* on a phone Kitty stands at the top left of the wall: Undo moves to her right, never over her */
      if (!g.wide && kr && ux < kr.r + 6 && ux + 54 > kr.l && uy < kr.b && uy + 54 > kr.t) ux = kr.r + 8;
      undo.style.left = ux + "px"; undo.style.top = uy + "px";
      var sw = serveB.offsetWidth || 120;
      serveB.style.left = Math.max(ux + 54 + 10, Math.min(cw - sw - 6 - (g.wide ? g.DW + 8 : 0), g.sx + g.sw - sw - 8)) + "px";
      serveB.style.top = uy + "px";
      void n;
    };

    function catList(cat) {
      if (cat === "ice") return R0.ice.map(function (c) { return { t: "ice", k: c[0], col: c[1] }; });
      if (cat === "spr") return SPR_ORDER.map(function (k) { return { t: "spr", k: k }; });
      if (cat === "draw") return PENS.map(function (c) { return { t: "pen", k: c[0], col: c[1] }; });
      if (cat === "plate") return PLATES.map(function (c) { return { t: "plate", k: c[0], col: c[1] }; });
      return (CATS[cat].items || []).map(function (k) { return { t: "deco", k: k }; });
    }
    function fillItems(list) {
      var per = D0.per || 5, pages = list.length > per ? Math.ceil(list.length / (per - 1)) : 1;
      if (D0.page >= pages) D0.page = 0;
      var show2 = pages > 1 ? list.slice(D0.page * (per - 1), D0.page * (per - 1) + per - 1) : list;
      box.innerHTML = "";
      show2.forEach(function (it) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "ck-item" + (it.t === "ice" || it.t === "plate" ? " ck-sw" : "");
        if (it.t === "ice") b.innerHTML = '<i style="background:' + it.col + '"></i>';
        else if (it.t === "plate") b.innerHTML = '<i style="background:' + it.col + '"></i>';
        else if (it.t === "pen") b.innerHTML = penIconSVG(it.col);
        else if (it.t === "spr") b.innerHTML = shakerIcon(it.k);
        else b.innerHTML = decoSVG(it.k);
        b.setAttribute("data-ck", it.t + "-" + it.k);
        b.setAttribute("aria-label", it.t === "deco" ? DECO[it.k].name : it.t === "spr" ? SPRINKLES[it.k].name : it.k);
        if ((it.t === "ice" && D0.ice === it.col) || (it.t === "plate" && D0.plateCol === it.col) || (it.t === "pen" && D0.pen === it.col)) b.classList.add("ck-on");
        box.appendChild(b);
        wireItem(b, it);
      });
      if (pages > 1) {
        var m = document.createElement("button");
        m.type = "button"; m.className = "ck-item ck-more"; m.innerHTML = arrowIconSVG();
        m.setAttribute("data-ck", "more"); m.setAttribute("aria-label", "More");
        box.appendChild(m);
        m.addEventListener("click", function (e) { e.stopPropagation(); D0.page = (D0.page + 1) % pages; SFX.pip(); fillItems(list); });
      }
    }
    function openCat(cat, spoken) {
      D0.cat = cat; D0.page = 0;
      if (cat !== "draw") setPen(null);
      fillTabs();
      fillItems(catList(cat));
      if (spoken) { SFX.pip(); say(cat === "ice" ? R0.iceSay : CATS[cat].say); }
    }
    function setPen(col) {
      D0.pen = col;
      surf.style.pointerEvents = col ? "auto" : "none";
      itl.style.pointerEvents = col ? "none" : "";
      surf.style.cursor = col ? "crosshair" : "";
    }
    function count() { return D0.items.length + D0.lines + D0.groups + (D0.ice ? 1 : 0) + (D0.plateCol !== PLATES[0][1] ? 1 : 0); }
    function refresh() {
      var n = count();
      g.deco = n;
      undo.classList.toggle("ck-none", D0.undo.length === 0);
      var was = serveB.getAttribute("data-off") === "0";
      serveB.setAttribute("data-off", n > 0 ? "0" : "1");
      if (n > 0 && !was) {
        g.layoutDrawer();
        pop(serveB, 1.1);
        if (!D0.toldServe) { D0.toldServe = true; later(function () { if (G === g && g.phase === "decorate" && count() > 0) say("Tap Serve when you are done!"); }, 1600); }
      }
      /* the treat is empty again (dragged off or undone): Serve hides, so Mimi must not keep saying "Tap Serve" */
      if (n === 0 && was) { D0.toldServe = false; say("Drag things onto your " + R0.one + "!"); }
    }
    function remember(a) { D0.undo.push(a); if (D0.undo.length > 60) D0.undo.shift(); g.prog += 1; refresh(); }

    /* ---- placed decorations */
    function addItem(kind, x, y, rot, silent) {
      var d = DECO[kind], s = D0.size * (d.sz || 1);
      var e = document.createElement("div");
      e.className = "ck-placed";
      e.innerHTML = decoSVG(kind);
      e.style.width = s + "px"; e.style.left = (x - s / 2) + "px"; e.style.top = (y - s / 2) + "px";
      e.setAttribute("data-ck", "placed"); e.setAttribute("data-kind", kind);
      itl.appendChild(e);
      var it = { kind: kind, x: x, y: y, rot: rot, el: e, s: s };
      e.style.transform = "rotate(" + rot + "deg)";
      D0.items.push(it);
      wirePlaced(it);
      if (!silent) {
        SFX.plop();
        if (!reduced()) { try { e.animate([{ transform: "rotate(" + rot + "deg) scale(1.25,.7)" }, { transform: "rotate(" + rot + "deg) scale(.9,1.12)", offset: 0.45 }, { transform: "rotate(" + rot + "deg) scale(1)" }], { duration: 300, easing: "ease-out" }); } catch (er) {} }
        sparkles(x, y, s * 0.7, 4);
      }
      return it;
    }
    function moveItem(it, x, y) { it.x = x; it.y = y; it.el.style.left = (x - it.s / 2) + "px"; it.el.style.top = (y - it.s / 2) + "px"; }
    function dropItem(it) { var i = D0.items.indexOf(it); if (i >= 0) D0.items.splice(i, 1); it.el.remove(); }
    function poof(x, y) { particle(svg("0 0 100 80", E(50, 40, 44, 32, "#fff", 4)), x, y, 90, [{ transform: "scale(.5)", opacity: 1 }, { transform: "scale(1.3)", opacity: 0 }], 360); SFX.whoosh(); }
    /* pick up one placed decoration with this pointer */
    function grabPlaced(it, ev, pt) {
      var e = it.el;
      it.pid = ev.pointerId; it.p0 = pt;
      try { e.setPointerCapture(it.pid); } catch (er) {}
      e.classList.add("ck-dragging"); g.dragging = true;
      e.style.transform = "rotate(" + it.rot + "deg) scale(1.05)";
      SFX.pick();
    }
    function wirePlaced(it) {
      var e = it.el;
      it.pid = null; it.p0 = null;
      on(e, "pointerdown", function (ev) {
        if (D0.pen || G !== g || g.phase !== "decorate") return;
        ev.preventDefault(); ev.stopPropagation();
        /* touch areas (44 px+) can overlap a neighbour: the decoration whose middle is nearest the finger wins */
        var pt = toStage(ev), best = it, bd = hyp(pt.x - it.x, pt.y - it.y);
        D0.items.forEach(function (o) { var d = hyp(pt.x - o.x, pt.y - o.y); if (d < bd) { bd = d; best = o; } });
        grabPlaced(best, ev, pt);
      });
      on(e, "pointermove", function (ev) {
        if (ev.pointerId !== it.pid) return;
        var p2 = toStage(ev), p0 = it.p0;
        e.style.transform = "translate(" + (p2.x - p0.x) + "px," + (p2.y - p0.y) + "px) rotate(" + it.rot + "deg) scale(1.05)";
      });
      var up = function (ev) {
        if (ev.pointerId !== it.pid) return;
        var p0 = it.p0;
        it.pid = null; g.dragging = false;
        e.classList.remove("ck-dragging");
        var p2 = toStage(ev), to = { x: it.x + p2.x - p0.x, y: it.y + p2.y - p0.y };
        var moved = hyp(p2.x - p0.x, p2.y - p0.y);
        e.style.transform = "rotate(" + it.rot + "deg)";
        if (moved < 8) { pop(e, 1.1); return; }
        var q = zoneFit(to, R0, 1.3);
        if (!q) {
          /* take it off the treat FIRST, then remember: remember() counts what is left (and hides Serve at 0) */
          dropItem(it);
          remember({ t: "remove", it: it });
          poof(to.x, to.y);
          mark("deco-remove:" + it.kind);
          return;
        }
        remember({ t: "move", it: it, x: it.x, y: it.y });
        moveItem(it, q.x, q.y);
        SFX.squish();
        if (!reduced()) { try { e.animate([{ transform: "rotate(" + it.rot + "deg) scale(1.15,.85)" }, { transform: "rotate(" + it.rot + "deg) scale(1)" }], { duration: 220, easing: "ease-out" }); } catch (er) {} }
        mark("deco-move:" + it.kind);
      };
      on(e, "pointerup", up); on(e, "pointercancel", up);
    }

    /* ---- sprinkles */
    function sprinkleAt(kind, x, y, grp) {
      var S0 = SPRINKLES[kind];
      for (var i = 0; i < 3; i++) {
        var q = zoneFit({ x: x + (Math.random() - 0.5) * 70, y: y + (Math.random() - 0.5) * 50 }, R0, 1.0);
        if (!q) continue;
        var pc = S0.piece(Math.floor(Math.random() * 10)), w = pc.w * 1.6;
        var e = document.createElement("div");
        e.className = "ck-o";
        e.style.width = w + "px"; e.style.left = (q.x - w / 2) + "px"; e.style.top = (q.y - w / 2) + "px";
        e.style.transform = "rotate(" + Math.round(Math.random() * 360) + "deg)";
        e.innerHTML = pc.html;
        grp.appendChild(e);
        if (!reduced()) { try { e.animate([{ translate: "0 -40px", opacity: 0 }, { translate: "0 0", opacity: 1 }], { duration: 220, easing: "ease-in" }); } catch (er) {} }
      }
      SFX.sprinkle();
    }
    function newGroup() { var grp = document.createElement("div"); grp.className = "ck-lay"; spr.appendChild(grp); return grp; }
    function closeGroup(grp) {
      if (!grp.children.length) { grp.remove(); return; }
      D0.groups += 1;
      remember({ t: "spr", grp: grp });
      mark("deco-sprinkle");
    }

    /* ---- recolour and pens */
    function setIce(col, quiet) {
      var from = D0.ice;
      D0.ice = col;
      Array.prototype.forEach.call(base.querySelectorAll(".ck-ice"), function (e) { e.setAttribute("fill", col); });
      if (!quiet) { remember({ t: "ice", from: from }); SFX.glug(); pop(base, 1.03); var c = zoneBox(R0); sparkles((c.x0 + c.x1) / 2, (c.y0 + c.y1) / 2, 120, 5); mark("deco-ice"); }
    }
    function setPlate(col, quiet) {
      var from = D0.plateCol;
      D0.plateCol = col;
      var e = plate.querySelector(".ck-pc"); if (e) e.setAttribute("fill", col);
      if (!quiet) { remember({ t: "plate", from: from }); SFX.pip(); mark("deco-plate"); }
    }

    /* ---- drawer buttons: tap or drag */
    function wireItem(b, it) {
      if (it.t === "ice") { b.addEventListener("click", function (e) { e.stopPropagation(); setIce(it.col); fillItems(catList(D0.cat)); }); return; }
      if (it.t === "plate") { b.addEventListener("click", function (e) { e.stopPropagation(); setPlate(it.col); fillItems(catList(D0.cat)); }); return; }
      if (it.t === "pen") {
        b.addEventListener("click", function (e) { e.stopPropagation(); setPen(D0.pen === it.col ? null : it.col); SFX.pip(); fillItems(catList(D0.cat)); if (D0.pen) say("Draw on the treat with your finger!"); });
        return;
      }
      var pid = null, s0 = null, ghost = null, grp = null, lastSp = null;
      b.addEventListener("pointerdown", function (e) {
        if (G !== g) return;
        e.preventDefault(); e.stopPropagation();
        pid = e.pointerId; s0 = { x: e.clientX, y: e.clientY };
        try { b.setPointerCapture(pid); } catch (er) {}
        touch();
      });
      b.addEventListener("pointermove", function (e) {
        if (e.pointerId !== pid) return;
        if (!ghost && hyp(e.clientX - s0.x, e.clientY - s0.y) > 7) {
          var k = (g.el.stage.getBoundingClientRect().width / ST) || g.k;
          var sz = it.t === "spr" ? 120 * k * 1.1 : D0.size * (DECO[it.k].sz || 1) * k;
          sz = Math.max(sz, 40);
          ghost = mk("div", "ck-ghost", it.t === "spr" ? shakerIcon(it.k) : decoSVG(it.k), g.el.ck);
          ghost.style.width = sz + "px";
          ghost._sz = sz;
          ghost.style.transform = "scale(1.05)" + (it.t === "spr" ? " rotate(160deg)" : "");
          g.dragging = true;
          SFX.pick();
          if (it.t === "spr") grp = newGroup();
        }
        if (ghost) {
          var cr = g.el.ck.getBoundingClientRect();
          var gx = e.clientX - cr.left, gy = e.clientY - cr.top;
          ghost.style.left = (gx - ghost._sz / 2) + "px";
          ghost.style.top = (gy - ghost._sz * (it.t === "spr" ? 0.9 : 0.5)) + "px";
          if (it.t === "spr") {
            var pt = toStage(e);
            pt.y += 30;
            if (!lastSp || hyp(pt.x - lastSp.x, pt.y - lastSp.y) > 40) {
              lastSp = pt;
              if (zoneFit(pt, R0, 1.0)) { sprinkleAt(it.k, pt.x, pt.y, grp); ghost.style.transform = "scale(1.05) rotate(" + (150 + Math.random() * 30) + "deg)"; }
            }
          }
        }
      });
      var up = function (e) {
        if (e.pointerId !== pid) return;
        pid = null; g.dragging = false;
        if (!ghost) {
          if (e.type !== "pointerup") return;
          /* a tap: the decoration hops onto a free spot */
          if (it.t === "spr") { var gq = newGroup(), sp = freeSpot(R0, 60); for (var i = 0; i < 4; i++) sprinkleAt(it.k, sp.x + (i - 1.5) * 30, sp.y + (i % 2) * 20, gq); closeGroup(gq); return; }
          var f = freeSpot(R0, D0.size);
          var added = addItem(it.k, f.x, f.y, DECO[it.k].stand ? 0 : Math.round((Math.random() - 0.5) * 24));
          remember({ t: "add", it: added });
          mark("deco-tap:" + it.k);
          return;
        }
        var pt = toStage(e), gh = ghost; ghost = null;
        if (it.t === "spr") { closeGroup(grp); grp = null; lastSp = null; gh.remove(); return; }
        var q = zoneFit(pt, R0, 1.3);
        if (q && e.type === "pointerup") {
          gh.remove();
          var a2 = addItem(it.k, q.x, q.y, DECO[it.k].stand ? 0 : Math.round((Math.random() - 0.5) * 24));
          remember({ t: "add", it: a2 });
          mark("deco-add:" + it.k);
        } else {
          var br = b.getBoundingClientRect(), cr = g.el.ck.getBoundingClientRect();
          tween(gh, [{ transform: "none", opacity: 1 }, { transform: "translate(" + (br.left - cr.left + br.width / 2 - (parseFloat(gh.style.left) + gh._sz / 2)) + "px," + (br.top - cr.top + br.height / 2 - (parseFloat(gh.style.top) + gh._sz / 2)) + "px) scale(.4)", opacity: 0 }], 260).then(function () { gh.remove(); }, function () { gh.remove(); });
        }
      };
      b.addEventListener("pointerup", up);
      b.addEventListener("pointercancel", up);
    }

    /* ---- finger drawing (icing lines) */
    (function () {
      var pid = null, path = null, pts = [];
      on(surf, "pointerdown", function (e) {
        if (!D0.pen) return;
        e.preventDefault(); e.stopPropagation();
        var pt = toStage(e);
        if (!zoneFit(pt, R0, 1.1)) return;
        pid = e.pointerId; pts = [pt];
        try { surf.setPointerCapture(pid); } catch (er) {}
        path = document.createElementNS("http://www.w3.org/2000/svg", "g");
        path.innerHTML = '<path fill="none" stroke="' + INK + '" stroke-width="22" stroke-linecap="round" stroke-linejoin="round" opacity=".25"/><path fill="none" stroke="' + D0.pen + '" stroke-width="15" stroke-linecap="round" stroke-linejoin="round"/>';
        D0.drz.appendChild(path);
      });
      on(surf, "pointermove", function (e) {
        if (e.pointerId !== pid || !path) return;
        var pt = toStage(e), l = pts[pts.length - 1];
        if (hyp(pt.x - l.x, pt.y - l.y) < 6) return;
        pts.push(pt);
        var d = "M" + pts[0].x.toFixed(1) + " " + pts[0].y.toFixed(1);
        for (var i = 1; i < pts.length; i++) d += " L" + pts[i].x.toFixed(1) + " " + pts[i].y.toFixed(1);
        Array.prototype.forEach.call(path.children, function (c) { c.setAttribute("d", d); });
        if (pts.length % 6 === 0) SFX.rub();
      });
      var up = function (e) {
        if (e.pointerId !== pid) return;
        pid = null;
        if (!path) return;
        if (pts.length < 3) { path.remove(); path = null; return; }
        D0.lines += 1;
        remember({ t: "line", el: path });
        path = null;
        mark("deco-line");
      };
      on(surf, "pointerup", up); on(surf, "pointercancel", up);
    })();

    on(undo, "click", function (e) {
      e.stopPropagation();
      var a = D0.undo.pop();
      if (!a) { pop(undo, 1.08); return; }
      SFX.whoosh();
      if (a.t === "add") { dropItem(a.it); poof(a.it.x, a.it.y); }
      else if (a.t === "move") { moveItem(a.it, a.x, a.y); pop(a.it.el, 1.1); }
      else if (a.t === "remove") { D0.items.push(a.it); a.it.el.style.transform = "rotate(" + a.it.rot + "deg)"; itl.appendChild(a.it.el); pop(a.it.el, 1.15); }
      else if (a.t === "spr") { a.grp.remove(); D0.groups -= 1; }
      else if (a.t === "line") { a.el.remove(); D0.lines -= 1; }
      else if (a.t === "ice") { if (a.from) setIce(a.from, true); else { D0.ice = null; Array.prototype.forEach.call(base.querySelectorAll(".ck-ice"), function (x) { x.setAttribute("fill", x.getAttribute("data-c0")); }); } }
      else if (a.t === "plate") setPlate(a.from, true);
      mark("deco-undo:" + a.t);
      if (D0.cat === "ice" || D0.cat === "plate") fillItems(catList(D0.cat));
      g.prog += 1;
      refresh();
    });

    layout();
    openCat(R0.cats[0], false);
    say("Now decorate it! Drag things onto it.", "Now the fun part! Decorate it your way. Drag things onto your " + R0.one + ".");
    kittyHappy(1500);
    g.cur = { mech: "decorate", el: "drawer", kind: "none" };
    mark("want:decorate");

    if (g.auto) {
      later(function () {
        var b0 = zoneBox(R0);
        setIce(R0.ice[1][1]);
        ["heart", "strawberry", "star"].forEach(function (k, i) {
          var f = zoneFit({ x: b0.x0 + (b0.x1 - b0.x0) * (0.3 + 0.2 * i), y: (b0.y0 + b0.y1) / 2 }, R0, 9);
          remember({ t: "add", it: addItem(k, f.x, f.y, 0) });
        });
        var gq = newGroup(); sprinkleAt("rainbow", (b0.x0 + b0.x1) / 2, (b0.y0 + b0.y1) / 2, gq); closeGroup(gq);
        if (!window.__cookNoServe) later(function () { serveB.click(); }, 500);
      }, AUTO_WAIT);
    }

    return new Promise(function (res) {
      on(serveB, "click", function (e) {
        e.stopPropagation();
        if (count() < 1 || g.phase !== "decorate") return;
        mark("serve-tap");
        res();
      });
    });
  }

  /* ------------------------------------------------------------ serving: a photo, then a friend admires it */
  function friendShow(el, pose, o) { el.innerHTML = charMarkup(G.friend, pose, o); }
  async function serve() {
    var g = G, R0 = g.R, D0 = g.D;
    g.phase = "serve"; g.stepName = "serve"; g.prog = 0;
    mark("serve");
    clearHint();
    var drawer = g.el.drawer;
    g.layoutDrawer = null;
    if (drawer) fadeOut(drawer, 200);
    [g.el.undo, g.el.serveB].forEach(function (b) { if (b) b.remove(); });
    D0.surf.style.pointerEvents = "none";
    D0.itl.style.pointerEvents = "none";
    g.el.drawer = null;
    layout();
    await wait(D(380));
    alive(g);
    /* the photo */
    var b = zoneBox(R0);
    var fx0 = Math.min(b.x0, 90) - 30, fx1 = Math.max(b.x1, 710) + 30, fy0 = Math.max(10, b.y0 - 90), fy1 = 760;
    var frame = mk("div", "ck-frame", '<span class="ck-tape"></span><b>' + R0.name + "</b>", g.el.scene);
    frame.style.left = fx0 + "px"; frame.style.top = fy0 + "px"; frame.style.width = (fx1 - fx0) + "px"; frame.style.height = (fy1 - fy0 + 44) + "px";
    var flash = mk("div", "ck-flash", "", g.el.ck);
    say("Say cheese!", "Say cheese! Click!");
    SFX.shutter();
    if (!reduced()) await tween(flash, [{ opacity: 0 }, { opacity: 0.95, offset: 0.2 }, { opacity: 0 }], 520);
    flash.remove();
    alive(g);
    sparkles(400, 300, 220, 8);
    await wait(D(900));
    alive(g);
    await fadeOut(frame, 240);
    alive(g);
    /* the friend comes in from the right */
    var f = O("", 640, COUNTER + 70, 240, 1.3, "friend", "ck-z2");
    friendShow(f, "walk");
    var dish = D0.dish;
    var shift = tween(dish, [{ transform: "none" }, { transform: "translate(-120px,20px) scale(.84)" }], 420, "ease-in-out");
    if (!reduced()) await tween(f, [{ transform: "translateX(420px)" }, { transform: "translateX(280px) translateY(-14px)", offset: 0.33 }, { transform: "translateX(140px)", offset: 0.66 }, { transform: "none" }], 700, "linear");
    await shift;
    alive(g);
    friendShow(f, "happy", { hearts: true });
    var name = friendName();
    say("Wow! " + name + " loves it!", "Wow! " + name + " loves your " + R0.one + "! So pretty!");
    SFX.yay();
    var fc = ctr(f);
    sparkles(fc.x, fc.y - fc.h * 0.25, 150, 8);
    var starsP = flyStars(dish);
    kittyHappy(0);
    await wait(D(900));
    alive(g);
    friendShow(f, "eat");
    for (var i = 0; i < 2; i++) { SFX.nom(); await wait(D(260)); alive(g); }
    friendShow(f, "happy", { hearts: true });
    say("Yummy! Thank you!");
    await starsP;
    alive(g);
    g.served = true;
    mark("served");
    await wait(D(1100));
    done();
  }

  /* three stars fly from the treat to the score badge, 150 ms apart */
  async function flyStars(fromEl) {
    var g = G;
    var fr = fromEl.getBoundingClientRect();
    var fx = fr.left + fr.width / 2, fy = fr.top + fr.height * 0.55;
    var se = g.opts.scoreEl || document.querySelector(".score");
    var tr = se ? se.getBoundingClientRect() : null;
    if (!tr || tr.width === 0) { var ckr = g.el.ck.getBoundingClientRect(); tr = { left: ckr.right - 120, top: ckr.top + 8, width: 40, height: 40 }; }
    var tx = tr.left + tr.width / 2, ty = tr.top + tr.height / 2;
    var plus = document.createElement("div");
    plus.className = "ck-plus";
    plus.innerHTML = starSVG() + "<span>+3</span>";
    document.body.appendChild(plus);
    var pw = plus.offsetWidth || 70;
    plus.style.left = Math.max(4, tr.left - pw - 8) + "px"; plus.style.top = (tr.top + tr.height / 2 - 17) + "px";
    g.extra = (g.extra || []).concat([plus]);
    try { plus.animate([{ transform: "scale(.4)", opacity: 0 }, { transform: "scale(1.15)", opacity: 1, offset: 0.25 }, { transform: "scale(1)", opacity: 1, offset: 0.8 }, { transform: "scale(1)", opacity: 0 }], { duration: reduced() ? 1 : 1700, fill: "forwards" }); } catch (e) {}
    var ps = [];
    for (var i = 0; i < 3; i++) {
      ps.push((function (i) {
        return new Promise(function (res) {
          var t = setTimeout(function () {
            if (g.dead || g !== G) { res(); return; }
            var s = document.createElement("div");
            s.className = "ck-flystar";
            s.innerHTML = starSVG();
            var sx = fx + (i - 1) * 46;
            s.style.left = (sx - 22) + "px"; s.style.top = (fy - 22) + "px";
            document.body.appendChild(s);
            g.extra.push(s);
            var dx = tx - sx, dy = ty - fy;
            var land = function () { s.remove(); giveStar(i); res(); };
            if (reduced()) { land(); return; }
            var a;
            try {
              a = s.animate([{ transform: "translate(0,0) scale(.5)" }, { transform: "translate(" + dx * 0.3 + "px," + (dy * 0.3 - 110) + "px) scale(1.3)", offset: 0.4 }, { transform: "translate(" + dx + "px," + dy + "px) scale(.7)" }], { duration: Math.max(380, D(700)), easing: "ease-in-out", fill: "forwards" });
            } catch (e) { land(); return; }
            g.anims.push(a);
            a.finished.then(land, land);
          }, reduced() ? 0 : 150 * i);
          g.timers.push(t);
        });
      })(i));
    }
    await Promise.all(ps);
  }
  function giveStar(i) {
    var g = G;
    if (!g || g.dead || g.starsGiven >= 3) return;
    g.starsGiven += 1;
    SFX.ting(i);
    if (g.opts.awardStars !== false) { var a = host("addStars"); if (a) { try { a(1); } catch (e) {} } }
  }

  /* ------------------------------------------------------------ endings */
  function remember2(g) {
    try {
      var P0 = getP();
      if (!P0 || !g.R) return;
      if (!P0.made || typeof P0.made !== "object") P0.made = {};
      P0.made[g.R.key] = (P0.made[g.R.key] || 0) + 1;
      var rec = Array.isArray(P0.cookRecent) ? P0.cookRecent.filter(function (k) { return k !== g.R.key && RMAP[k]; }) : [];
      P0.cookRecent = [g.R.key].concat(rec).slice(0, 6);
    } catch (e) {}
  }
  function done() {
    var g = G;
    if (!g || g.dead || g.finished) return;
    g.finished = true;
    while (g.starsGiven < 3) giveStar(g.starsGiven);
    remember2(g);
    var cb = g.opts.onDone;
    teardown();
    if (typeof cb === "function") cb(3);
  }
  function hardEnd() {
    var g = G;
    if (!g || g.dead || g.finished) return;
    done();
  }
  function skip() {
    var g = G;
    if (!g || g.dead || g.finished) return;
    g.finished = true;
    var cb = g.opts.onSkip;
    teardown();
    if (typeof cb === "function") cb();
  }
  var lastMarks = null;
  function teardown() {
    var g = G;
    if (!g) return;
    lastMarks = { phase: "ended", step: "", t: secs(), marks: g.marks.concat(["end@" + secs().toFixed(1)]), ended: true, stars: g.starsGiven, recipe: g.R ? g.R.key : null };
    g.dead = true;
    g.timers.forEach(function (t) { clearTimeout(t); clearInterval(t); });
    g.rafs.forEach(function (r) { cancelAnimationFrame(r); });
    clearInterval(g.hintTimer);
    g.anims.forEach(function (a) { try { a.cancel(); } catch (e) {} });
    g.listeners.forEach(function (l) { try { l[0].removeEventListener(l[1], l[2], l[3]); } catch (e) {} });
    if (g.ro) { try { g.ro.disconnect(); } catch (e) {} }
    (g.extra || []).forEach(function (e) { try { e.remove(); } catch (er) {} });
    try { if ("speechSynthesis" in window) speechSynthesis.cancel(); } catch (e) {}
    if (g.el.ck && g.el.ck.parentNode) g.el.ck.parentNode.removeChild(g.el.ck);
    G = null;
  }
  function stop() { if (G) teardown(); }

  function stageBox() { var r = G.el.stage.getBoundingClientRect(); return { left: r.left, top: r.top, k: r.width / ST }; }
  function zoneClient(R0) { var b = zoneBox(R0), s = stageBox(); return { x0: s.left + b.x0 * s.k, y0: s.top + b.y0 * s.k, x1: s.left + b.x1 * s.k, y1: s.top + b.y1 * s.k }; }
  window.CookGame = {
    start: start,
    stop: stop,
    recipes: RECIPES.map(function (r) { return r.key; }),
    names: RECIPES.reduce(function (o, r) { o[r.key] = r.name; return o; }, {}),
    css: CSS,
    /* for tests only */
    _state: function () {
      var g = G;
      if (!g) return lastMarks;
      var c = g.cur || {};
      return { phase: g.phase, recipe: g.R ? g.R.key : null, cards: (g.cards || []).slice(), step: g.stepName || "", stepI: g.stepI, steps: g.R ? g.R.steps.map(function (s) { return s.id; }) : [],
        mech: c.mech || "", el: c.el || "", to: c.to || "", prog: +(g.prog || 0).toFixed(3), stars: g.starsGiven, hurry: false, deco: g.deco || 0,
        t: secs(), marks: g.marks.slice(), auto: g.auto, wide: g.wide, k: g.k,
        cx: c.cx, cy: c.cy, r: c.r, ry: c.ry, x0: c.x0, x1: c.x1, stage: stageBox(), zone: g.D && g.R ? zoneClient(g.R) : null };
    },
    /* for tests only: the drawer categories of the running recipe */
    _cats: function () { return G && G.R ? G.R.cats.slice() : []; },
    /* for tests only: put one recipe first on the cards */
    _force: function (key) { window.__cookForce = key; }
  };
})();
