/* rewards.js - the 5-question reward mini-games (Kids Maths).
 *
 * API (window.RewardGames):
 *   RewardGames.play(el, { theme: "cafe" | "castle", onDone, fast }) -> Promise
 *       el   = a full-screen container the game fills.
 *       fast = true shortens every animation 5x (tests only).
 *       The promise resolves with { done: true, theme, game } when the child presses "Done".
 *   RewardGames.close()          -> stops the running game, cleans up, resolves with { done: false }.
 *   RewardGames.register(theme, name, starter)  -> add a game. Games of one theme are played in turn.
 *
 * Needs window.KittyChars (../modules/characters.js) and window.KnightArt (../modules/knight_art.js)
 * to be loaded by the page. This file loads nothing.
 * Calm by design: no sound, no flashing, no shaking, no timers that can fail the child.
 * prefers-reduced-motion: movement becomes plain fades.
 */
(function () {
  "use strict";

  var INK = "#3b2a33";
  var NS = "http://www.w3.org/2000/svg";
  var FRIENDS = ["melody", "kuromi", "purin", "cinna"]; /* Bella, Lulu, Momo, Puff */
  var uidCount = 0;
  var friendTurn = 0;
  var active = null;
  var games = { cafe: [], castle: [] };
  var turn = { cafe: 0, castle: 0 };

  /* ------------------------------------------------------------------ small helpers */
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function uid() { uidCount += 1; return "rg" + uidCount + "_"; }
  function make(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) { e.className = cls; }
    if (html != null) { e.innerHTML = html; }
    return e;
  }
  function rad(id, stops, cx, cy, r) {
    return '<radialGradient id="' + id + '" cx="' + (cx || "38%") + '" cy="' + (cy || "30%") + '" r="' + (r || "80%") + '">' +
      stops.map(function (s) { return '<stop offset="' + s[0] + '" stop-color="' + s[1] + '"/>'; }).join("") + "</radialGradient>";
  }
  function lin(id, stops, x2, y2) {
    return '<linearGradient id="' + id + '" x1="0" y1="0" x2="' + (x2 || 0) + '" y2="' + (y2 == null ? 1 : y2) + '">' +
      stops.map(function (s) { return '<stop offset="' + s[0] + '" stop-color="' + s[1] + '"/>'; }).join("") + "</linearGradient>";
  }
  function ink(w) { return 'stroke="' + INK + '" stroke-width="' + w + '" stroke-linejoin="round" stroke-linecap="round"'; }
  function seeded(seed) {
    var s = seed >>> 0;
    return function () { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
  }
  function reducedMotion() {
    try { return !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches); } catch (e) { return false; }
  }

  /* ------------------------------------------------------------------ css (injected once) */
  var CSS = [
    ".rg-root{position:absolute;inset:0;overflow:hidden;touch-action:manipulation;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent;",
    "font-family:'Lexend','Trebuchet MS','Segoe UI',system-ui,sans-serif;color:#3b2a33;--s:1;z-index:5}",
    ".rg-root *{box-sizing:border-box}",
    ".rg-root svg{display:block}",
    ":where(.rg-root) button{font:inherit;color:inherit;cursor:pointer;touch-action:manipulation}",
    ".rg-root button:focus-visible{outline:4px solid #3b2a33;outline-offset:3px}",
    ".rg-root [hidden]{display:none!important}",
    ".rg-fade{animation:rg-fade calc(var(--s)*.6s) ease both}",
    "@keyframes rg-fade{from{opacity:0}to{opacity:1}}",
    "@keyframes rg-pop{0%{opacity:0;transform:scale(.55)}70%{opacity:1;transform:scale(1.06)}100%{opacity:1;transform:scale(1)}}",
    "@keyframes rg-wave{0%,100%{transform:rotate(-14deg)}50%{transform:rotate(16deg)}}",
    "@keyframes rg-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}",
    /* big friendly buttons */
    ".rg-btn{min-width:64px;min-height:64px;border-radius:22px;border:3px solid var(--rg-edge);background:var(--rg-btn);color:var(--rg-btn-ink);",
    "font-weight:700;font-size:clamp(20px,3.4vmin,30px);padding:10px 26px;box-shadow:0 5px 0 var(--rg-edge);display:inline-flex;align-items:center;justify-content:center;gap:10px}",
    ".rg-btn:active{transform:translateY(3px);box-shadow:0 2px 0 var(--rg-edge)}",
    /* ---------- cafe ---------- */
    ".rg-cafe{--rg-edge:#b0486a;--rg-btn:#ffd7e3;--rg-btn-ink:#573636;--rg-b:clamp(60px,min(15vw,12vh),96px);background:#fdf1f3}",
    ".rg-cafe .rg-stage{position:absolute;left:0;right:0;top:0;bottom:var(--rg-panel,120px);overflow:hidden;",
    "background:radial-gradient(circle at 12px 12px,rgba(255,255,255,.55) 3px,transparent 4px) 0 0/36px 36px,linear-gradient(#ffeef3,#ffd9e4)}",
    ".rg-cafe .rg-awning{position:absolute;left:0;right:0;top:0;height:7%;min-height:22px;background:repeating-linear-gradient(90deg,#f6a3bd 0 48px,#fffafc 48px 96px);box-shadow:0 3px 0 #d57a98}",
    ".rg-cafe .rg-scallop{position:absolute;left:0;right:0;top:calc(7% + 3px);height:24px;",
    "background:radial-gradient(circle at 24px 0,#f6a3bd 23px,transparent 24px) 0 0/96px 24px repeat-x,radial-gradient(circle at 72px 0,#fffafc 23px,transparent 24px) 0 0/96px 24px repeat-x;",
    "margin-top:-3px;filter:drop-shadow(0 2px 0 #d57a98)}",
    ".rg-cafe .rg-window{position:absolute;right:4%;top:20%;width:24%;height:34%;border:5px solid #fffaf5;border-radius:20px 20px 8px 8px;",
    "background:radial-gradient(circle at 70% 30%,#fff6c8 0 12%,transparent 13%),linear-gradient(#cdeaff,#f4fbff);box-shadow:0 0 0 3px #d9a9b8,0 5px 0 3px #d9a9b8}",
    ".rg-cafe .rg-window::after{content:'';position:absolute;left:50%;top:0;bottom:0;width:5px;margin-left:-2px;background:#fffaf5}",
    ".rg-cafe .rg-floor{position:absolute;right:0;bottom:0;width:34%;height:30%;background:repeating-conic-gradient(#fff3e6 0 25%,#f9dcc6 0 50%) 0 0/48px 48px}",
    ".rg-cafe .rg-counter{position:absolute;left:0;bottom:0;width:72%;height:30%;border-radius:0 26px 0 0;background:linear-gradient(#fffaf5 0 22%,#f7b9cb 22% 100%);",
    "border:3px solid #3b2a33;border-left:0;border-bottom:0}",
    ".rg-cafe .rg-counter::after{content:'';position:absolute;left:0;right:0;top:34%;bottom:0;background:repeating-linear-gradient(90deg,rgba(255,255,255,.55) 0 22px,transparent 22px 44px)}",
    ".rg-char{position:absolute;pointer-events:none}",
    ".rg-cafe .rg-mimi{z-index:1}",
    ".rg-cafe .rg-counter{z-index:2}",
    ".rg-cafe .rg-plate,.rg-cafe .rg-cup{z-index:3}",
    ".rg-cafe .rg-friend{z-index:4}",
    ".rg-cafe .rg-bubble{z-index:5}",
    ".rg-char svg{width:100%;height:100%}",
    ".rg-cafe .rg-bubble{position:absolute;max-width:min(46%,380px);background:#fffdf9;border:3px solid #3b2a33;border-radius:22px;padding:10px 16px;",
    "font-size:clamp(17px,2.9vmin,28px);font-weight:600;line-height:1.25;box-shadow:0 4px 0 rgba(176,72,106,.35);transition:opacity calc(var(--s)*.4s)}",
    ".rg-cafe .rg-bubble::after{content:'';position:absolute;left:22px;bottom:-14px;width:20px;height:20px;background:#fffdf9;border-right:3px solid #3b2a33;border-bottom:3px solid #3b2a33;transform:rotate(45deg) skew(8deg,8deg)}",
    ".rg-cafe .rg-bubble.rg-friendsays{background:#f1fffa}",
    ".rg-cafe .rg-bubble.rg-friendsays::after{background:#f1fffa}",
    ".rg-cafe .rg-cup{position:absolute;touch-action:manipulation;transition:transform calc(var(--s)*1s) ease-in-out,opacity calc(var(--s)*.5s)}",
    ".rg-cafe .rg-cup svg{width:100%;height:100%;overflow:visible}",
    ".rg-cafe .rg-cup.rg-tappable{cursor:pointer}",
    ".rg-cafe .rg-plate{position:absolute;pointer-events:none}",
    ".rg-cafe .rg-frost{opacity:0;transform:translateY(10px) scale(.9);transform-box:fill-box;transform-origin:50% 100%;transition:opacity calc(var(--s)*.5s) ease,transform calc(var(--s)*.5s) ease}",
    ".rg-cafe .rg-cup.rg-hasfrost .rg-frost{opacity:1;transform:none}",
    ".rg-cafe .rg-top{transform-box:fill-box;transform-origin:50% 50%;animation:rg-pop calc(var(--s)*.45s) ease both}",
    ".rg-cafe .rg-friend{transition:transform calc(var(--s)*2.4s) ease-in-out,opacity calc(var(--s)*.6s)}",
    ".rg-cafe .rg-friend .rg-flip{width:100%;height:100%;transform-origin:50% 50%}",
    ".rg-cafe .rg-friend .rg-flip.rg-left{transform:scaleX(-1)}",
    ".rg-cafe .rg-held{position:absolute;left:25%;top:50%;width:50%;aspect-ratio:1;opacity:0}",
    ".rg-cafe .rg-held.rg-on{opacity:1}",
    ".rg-cafe .rg-panel{position:absolute;left:0;right:0;bottom:0;min-height:96px;padding:12px 10px max(12px,env(safe-area-inset-bottom));display:flex;flex-wrap:wrap;gap:10px 12px;",
    "align-items:center;justify-content:center;background:linear-gradient(#e9c9a6,#d9b48c);border-top:4px solid #8d6038;box-shadow:inset 0 3px 0 rgba(255,255,255,.35)}",
    ".rg-cafe .rg-swatch,.rg-cafe .rg-topbtn{width:var(--rg-b);height:var(--rg-b);min-width:60px;min-height:60px;border-radius:50%;border:4px solid #8d6038;background:#fffaf5;padding:0;display:flex;align-items:center;justify-content:center;box-shadow:0 5px 0 #8d6038}",
    ".rg-cafe .rg-topbtn{border-radius:22px}",
    ".rg-cafe .rg-swatch svg,.rg-cafe .rg-topbtn svg{width:78%;height:78%}",
    ".rg-cafe .rg-swatch[aria-pressed=true],.rg-cafe .rg-topbtn[aria-pressed=true]{border-color:#2f8a73;background:#e3f6f0;box-shadow:0 5px 0 #2f8a73,0 0 0 5px #fffaf5}",
    ".rg-cafe .rg-serve,.rg-cafe .rg-done{min-height:var(--rg-b);background:#8fe0c2;--rg-edge:#2f8a73;--rg-btn-ink:#1f4a3c}",
    ".rg-cafe .rg-done{min-width:150px}",
    ".rg-cafe .rg-serve{position:absolute;right:3%;bottom:3%;padding:10px 18px;z-index:3}",
    ".rg-cafe .rg-panel>*{animation:rg-fade calc(var(--s)*.5s) ease both}",
    /* ---------- castle ---------- */
    ".rg-castle{--rg-edge:#5a3b22;--rg-btn:#f0cf74;--rg-btn-ink:#3a2a10;background:#cfe8f7;font-family:'Lexend','Trebuchet MS','Segoe UI',system-ui,sans-serif}",
    ".rg-castle .rg-sky{position:absolute;inset:0;background:linear-gradient(#b9defa 0%,#d9eefa 38%,#fdf4da 62%)}",
    ".rg-castle .rg-sun{position:absolute;right:9%;top:8%;width:calc(var(--u)*.5px);height:calc(var(--u)*.5px);border-radius:50%;background:radial-gradient(circle,#fffbe0 0 45%,#ffe9a0 46% 62%,rgba(255,233,160,.0) 72%)}",
    ".rg-castle .rg-layer{position:absolute;left:0;display:flex;will-change:transform;pointer-events:none}",
    ".rg-castle .rg-layer svg{flex:none;height:100%;width:auto}",
    ".rg-castle .rg-scene{position:absolute;inset:0;transition:opacity calc(var(--s)*.35s) ease}",
    ".rg-castle .rg-obj{position:absolute;left:0;top:0;will-change:transform;pointer-events:none}",
    ".rg-castle .rg-obj svg{width:100%;height:100%;overflow:visible}",
    ".rg-castle .rg-horse{position:absolute;pointer-events:none}",
    ".rg-castle .rg-horse>.rg-bob{position:absolute;inset:0;will-change:transform}",
    ".rg-castle .rg-art{position:absolute;inset:0}",
    ".rg-castle .rg-art svg{width:100%;height:100%;overflow:visible}",
    ".rg-castle .rg-rider .rg-art svg{height:auto}",
    ".rg-castle .rg-art[hidden]{display:none}",
    ".rg-castle .rg-rider{position:absolute;overflow:hidden}",
    ".rg-castle .rg-rider .rg-art{inset:auto;left:0;top:0;width:100%}",
    ".rg-castle .rg-shadow{position:absolute;pointer-events:none;border-radius:50%;background:radial-gradient(ellipse,rgba(60,50,40,.28),rgba(60,50,40,0) 70%)}",
    ".rg-castle .rg-hud{position:absolute;left:12px;top:12px;display:flex;align-items:center;gap:3px;padding:6px 12px 6px 8px;max-width:calc(100% - 24px);border-radius:26px;background:rgba(255,253,245,.88);border:3px solid #7a5a35;min-height:calc(var(--ap)*1px + 18px)}",
    ".rg-castle .rg-hud .rg-apple-slot{width:calc(var(--ap)*1px);height:calc(var(--ap)*1px);flex:none}",
    ".rg-castle .rg-hud .rg-apple-slot svg{width:100%;height:100%}",
    ".rg-castle .rg-hud .rg-apple-slot.rg-in{animation:rg-fade calc(var(--s)*.5s) ease both}",
    ".rg-castle .rg-hud .rg-apple-slot:not(.rg-in){opacity:.0}",
    ".rg-castle .rg-basket{flex:none;width:calc(var(--ap)*1.5px);height:calc(var(--ap)*1.2px);margin-right:6px}",
    ".rg-castle .rg-jump{position:absolute;right:max(14px,3%);bottom:max(14px,3.5%);min-width:clamp(112px,22vmin,200px);min-height:clamp(76px,14vmin,112px);flex-direction:column;gap:2px;",
    "background:linear-gradient(#f6dc8e,#e3b341);--rg-edge:#8f6a12;font-size:clamp(22px,3.8vmin,34px);transition:opacity calc(var(--s)*.5s)}",
    ".rg-castle .rg-jump svg{width:clamp(26px,4.4vmin,38px);height:clamp(26px,4.4vmin,38px)}",
    ".rg-castle .rg-done{position:absolute;left:50%;bottom:max(18px,5%);transform:translateX(-50%);min-width:170px;min-height:clamp(72px,12vmin,100px);background:linear-gradient(#a7e7bf,#62c987);--rg-edge:#2e6e48;--rg-btn-ink:#16402a;animation:rg-fade calc(var(--s)*.8s) ease both}",
    ".rg-castle .rg-done:active{transform:translateX(-50%) translateY(3px)}",
    ".rg-castle .rg-villager .rg-armw{transform-box:fill-box;transform-origin:15% 85%}",
    ".rg-castle.rg-arrived .rg-villager .rg-armw{animation:rg-wave calc(var(--s)*2.4s) ease-in-out infinite}",
    ".rg-castle .rg-apple-fly{position:absolute;left:0;top:0;pointer-events:none;transition:transform calc(var(--s)*.8s) ease-in,opacity calc(var(--s)*.8s) ease-in}",
    ".rg-castle .rg-apple-fly svg{width:100%;height:100%}",
    "@media (prefers-reduced-motion:reduce){",
    ".rg-root *,.rg-root *::before,.rg-root *::after{animation-name:rg-fade!important;animation-iteration-count:1!important}",
    ".rg-cafe .rg-friend{transition:opacity calc(var(--s)*.6s)!important}",
    ".rg-cafe .rg-cup{transition:opacity calc(var(--s)*.6s)!important}",
    ".rg-castle .rg-apple-fly{transition:opacity calc(var(--s)*.6s)!important}",
    "}"
  ].join("");

  function injectCss() {
    if (document.getElementById("rg-style")) { return; }
    var st = document.createElement("style");
    st.id = "rg-style";
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  /* ------------------------------------------------------------------ run context: timers, listeners, frames */
  function makeContext(host, opts) {
    var fast = !!opts.fast;
    var k = fast ? 5 : 1;
    var timers = [];
    var offs = [];
    var rafId = 0;
    var closed = false;
    var root = make("div", "rg-root rg-" + opts.theme);
    root.style.setProperty("--s", fast ? "0.2" : "1");
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-label", opts.theme === "cafe" ? "Cupcake game" : "Horse ride game");
    var ctx = {
      fast: fast,
      k: k,
      reduced: reducedMotion(),
      root: root,
      isClosed: function () { return closed; },
      /* run fn after ms (ms is shortened in fast mode) */
      wait: function (ms, fn) {
        var id = setTimeout(function () { if (!closed) { fn(); } }, ms / k);
        timers.push(id);
        return id;
      },
      on: function (target, type, fn, o) {
        target.addEventListener(type, fn, o);
        offs.push(function () { target.removeEventListener(type, fn, o); });
      },
      /* call fn(dtSeconds, realDt) every animation frame; fn returns false to stop */
      loop: function (fn) {
        var last = 0;
        function tick(now) {
          if (closed) { return; }
          var dt = last ? Math.min(0.1, (now - last) / 1000) : 0.016;
          last = now;
          var keep = fn(dt * k, dt);
          if (keep !== false && !closed) { rafId = requestAnimationFrame(tick); }
        }
        rafId = requestAnimationFrame(tick);
      },
      dispose: function () {
        closed = true;
        timers.forEach(clearTimeout);
        timers = [];
        offs.forEach(function (f) { f(); });
        offs = [];
        if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
      }
    };
    return ctx;
  }

  /* ------------------------------------------------------------------ shared art: apple */
  function appleSvg() {
    var p = uid();
    return '<svg viewBox="0 0 60 64" aria-hidden="true"><defs>' + rad(p + "a", [[0, "#ff9a9a"], [0.65, "#e8506a"], [1, "#c42c4c"]], "35%", "30%", "80%") +
      rad(p + "l", [[0, "#c8f2b0"], [1, "#62c987"]]) + "</defs>" +
      '<ellipse cx="30" cy="61" rx="15" ry="3" fill="rgba(60,40,40,.18)"/>' +
      '<path d="M30 22 C20 12 4 20 6 38 C8 54 20 60 30 56 C40 60 52 54 54 38 C56 20 40 12 30 22 Z" fill="url(#' + p + 'a)" ' + ink(3) + "/>" +
      '<path d="M30 22 C30 14 32 9 36 5" fill="none" ' + ink(3) + "/>" +
      '<path d="M34 12 C40 4 50 6 52 10 C46 16 38 16 34 12 Z" fill="url(#' + p + 'l)" ' + ink(2.4) + "/>" +
      '<ellipse cx="17" cy="32" rx="4.5" ry="7" fill="#fff" opacity=".6" transform="rotate(18 17 32)"/></svg>';
  }

  /* ================================================================== CAFE: cupcake topping */
  var FROSTS = [
    { name: "Pink", a: "#ffe6ee", b: "#ffadc8", c: "#f27ea6" },
    { name: "Mint", a: "#e9fcf4", b: "#abe9d0", c: "#70cba9" },
    { name: "Lilac", a: "#f4ecff", b: "#cfb9f7", c: "#a589e2" }
  ];
  var TOPPINGS = [
    { id: "sprinkles", name: "Sprinkles" },
    { id: "cherry", name: "Cherry" },
    { id: "heart", name: "Heart" },
    { id: "star", name: "Star" }
  ];
  var SPRINKLE_COLOURS = ["#ff7aa8", "#58c4ae", "#ffd24d", "#7fa8ff", "#b48cf0", "#ff9f68"];

  function toppingMarkup(kind, x, y, seed, scale) {
    var g = '<g transform="translate(' + x.toFixed(1) + " " + y.toFixed(1) + ") scale(" + (scale || 1) + ')"><g class="rg-top">';
    var p = uid();
    if (kind === "sprinkles") {
      var rnd = seeded(seed || 7);
      for (var i = 0; i < 7; i += 1) {
        var a = (i / 7) * Math.PI * 2 + rnd() * 0.5;
        var r = 7 + rnd() * 11;
        g += '<rect x="-5" y="-1.9" width="10" height="3.8" rx="1.9" transform="translate(' + (Math.cos(a) * r).toFixed(1) + " " + (Math.sin(a) * r * 0.7).toFixed(1) +
          ") rotate(" + Math.round(rnd() * 180) + ')" fill="' + SPRINKLE_COLOURS[i % SPRINKLE_COLOURS.length] + '" ' + ink(1.1) + "/>";
      }
    } else if (kind === "cherry") {
      g += "<defs>" + rad(p + "c", [[0, "#ff9090"], [0.7, "#e0405a"], [1, "#b02040"]], "35%", "30%", "80%") + "</defs>" +
        '<path d="M2 -8 Q6 -24 16 -28" fill="none" ' + ink(2.6) + "/>" +
        '<circle cx="0" cy="0" r="10.5" fill="url(#' + p + 'c)" ' + ink(2.6) + "/>" +
        '<ellipse cx="-3.6" cy="-3.6" rx="3" ry="2" fill="#fff" opacity=".85" transform="rotate(-30 -3.6 -3.6)"/>';
    } else if (kind === "heart") {
      g += "<defs>" + rad(p + "h", [[0, "#ffb0c4"], [0.7, "#ff6f91"], [1, "#e8486f"]]) + "</defs>" +
        '<path d="M0 11 C-17 -1 -14 -15 -6 -14.5 C-2.5 -14 0 -10 0 -10 C0 -10 2.5 -14 6 -14.5 C14 -15 17 -1 0 11 Z" fill="url(#' + p + 'h)" ' + ink(2.6) + "/>" +
        '<ellipse cx="-6.5" cy="-6.5" rx="3" ry="1.8" fill="#fff" opacity=".8" transform="rotate(-35 -6.5 -6.5)"/>';
    } else {
      var pts = [];
      for (var j = 0; j < 10; j += 1) {
        var an = -Math.PI / 2 + j * Math.PI / 5;
        var rr = j % 2 ? 6 : 13;
        pts.push((rr * Math.cos(an)).toFixed(1) + "," + (rr * Math.sin(an)).toFixed(1));
      }
      g += "<defs>" + rad(p + "s", [[0, "#fff6c0"], [1, "#ffd24d"]]) + "</defs>" +
        '<polygon points="' + pts.join(" ") + '" fill="url(#' + p + 's)" ' + ink(2.6) + "/>";
    }
    return g + "</g></g>";
  }
  function toppingIcon(kind) {
    var m = toppingMarkup(kind, 0, kind === "cherry" ? 5 : 0, 3).replace('class="rg-top"', 'class=""');
    return '<svg viewBox="-24 -26 48 48" aria-hidden="true">' + m + "</svg>";
  }
  function frostIcon(f) {
    var p = uid();
    return '<svg viewBox="0 0 60 60" aria-hidden="true"><defs>' + lin(p + "f", [[0, f.a], [0.55, f.b], [1, f.c]]) + "</defs>" +
      '<ellipse cx="30" cy="42" rx="22" ry="9" fill="url(#' + p + 'f)" ' + ink(2.6) + "/>" +
      '<ellipse cx="30" cy="31" rx="17" ry="8" fill="url(#' + p + 'f)" ' + ink(2.6) + "/>" +
      '<ellipse cx="30" cy="21" rx="11" ry="6.5" fill="url(#' + p + 'f)" ' + ink(2.6) + "/>" +
      '<path d="M26 17 C26 9 32 11 33 6 C38 10 36 17 31 18 Z" fill="' + f.b + '" ' + ink(2.4) + "/></svg>";
  }
  function cupSvg() {
    var p = uid();
    var pleats = "";
    for (var i = 0; i <= 7; i += 1) {
      pleats += '<path d="M' + (50 + i * 14.3).toFixed(1) + " 116 L" + (62 + i * 11.1).toFixed(1) + ' 186" fill="none" stroke="#e58aa6" stroke-width="2" opacity=".7"/>';
    }
    return '<svg viewBox="0 0 200 200" aria-hidden="true"><defs>' +
      lin(p + "liner", [[0, "#fff1f6"], [1, "#f6b6cc"]], 1, 0) + rad(p + "cake", [[0, "#f9dba8"], [1, "#d99b55"]]) +
      '<linearGradient id="' + p + 'fr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--f1)"/><stop offset=".55" style="stop-color:var(--f2)"/><stop offset="1" style="stop-color:var(--f3)"/></linearGradient></defs>' +
      '<path d="M48 112 L152 112 L140 186 Q100 197 60 186 Z" fill="url(#' + p + 'liner)" ' + ink(3.6) + "/>" + pleats +
      '<path d="M43 116 Q38 92 62 90 L138 90 Q162 92 157 116 Z" fill="url(#' + p + 'cake)" ' + ink(3.6) + "/>" +
      '<g class="rg-frost">' +
      '<ellipse cx="100" cy="100" rx="64" ry="22" fill="url(#' + p + 'fr)" ' + ink(3.4) + "/>" +
      '<ellipse cx="100" cy="80" rx="50" ry="20" fill="url(#' + p + 'fr)" ' + ink(3.4) + "/>" +
      '<ellipse cx="100" cy="61" rx="36" ry="17" fill="url(#' + p + 'fr)" ' + ink(3.4) + "/>" +
      '<path d="M84 55 C82 38 104 40 104 24 C122 36 120 56 100 62 Z" fill="url(#' + p + 'fr)" ' + ink(3.4) + "/>" +
      '<ellipse cx="74" cy="96" rx="12" ry="3.6" fill="#fff" opacity=".5"/><ellipse cx="82" cy="76" rx="10" ry="3.2" fill="#fff" opacity=".5"/>' +
      '</g><g class="rg-tops"></g></svg>';
  }
  function plateSvg() {
    var p = uid();
    return '<svg viewBox="0 0 220 40" aria-hidden="true"><defs>' + lin(p + "p", [[0, "#ffffff"], [1, "#efe3ea"]]) + "</defs>" +
      '<ellipse cx="110" cy="20" rx="104" ry="16" fill="url(#' + p + 'p)" ' + ink(3.4) + "/>" +
      '<ellipse cx="110" cy="18" rx="76" ry="9" fill="none" stroke="#e7cbd6" stroke-width="3"/></svg>';
  }
  function mimiSvg(pose) { return window.KittyChars.full("kitty", pose); }

  function startCupcake(ctx, finish) {
    var K = window.KittyChars;
    if (!K || !K.full) { throw new Error("RewardGames: window.KittyChars is not loaded"); }
    K.injectCss();
    var root = ctx.root;
    var friendId = FRIENDS[friendTurn % FRIENDS.length];
    friendTurn += 1;
    var frostIdx = -1;
    var tool = 0;
    var tops = [];
    var served = false;

    root.innerHTML =
      '<div class="rg-stage">' +
      '<div class="rg-awning"></div><div class="rg-scallop"></div>' +
      '<div class="rg-window" aria-hidden="true"></div><div class="rg-floor" aria-hidden="true"></div><div class="rg-counter" aria-hidden="true"></div>' +
      '<div class="rg-char rg-mimi" data-rg-fit></div>' +
      '<div class="rg-plate" aria-hidden="true">' + plateSvg() + "</div>" +
      '<div class="rg-cup" data-rg-fit role="img" aria-label="Your cupcake">' + cupSvg() + "</div>" +
      '<div class="rg-char rg-friend" data-rg-fit style="opacity:0"><div class="rg-flip"></div><div class="rg-held"></div></div>' +
      '<div class="rg-bubble" data-rg-fit></div>' +
      "</div>" +
      '<div class="rg-panel"></div>';
    var stage = root.querySelector(".rg-stage");
    var panel = root.querySelector(".rg-panel");
    var mimi = root.querySelector(".rg-mimi");
    var plate = root.querySelector(".rg-plate");
    var cup = root.querySelector(".rg-cup");
    var cupSvgEl = cup.querySelector("svg");
    var tg = cup.querySelector(".rg-tops");
    var friend = root.querySelector(".rg-friend");
    var flip = friend.querySelector(".rg-flip");
    var held = friend.querySelector(".rg-held");
    var bubble = root.querySelector(".rg-bubble");
    var g = {};

    function setMimi(pose) { mimi.innerHTML = mimiSvg(pose); }
    function say(text, who) {
      g.bubbleWho = who;
      bubble.textContent = text;
      bubble.className = "rg-bubble rg-fade" + (who === "friend" ? " rg-friendsays" : "");
      bubble.hidden = !text;
      placeBubble(who);
    }
    function placeBubble(who) {
      var sw = stage.clientWidth;
      var sh = stage.clientHeight;
      var bh = bubble.offsetHeight;
      var floor = sh * 0.07 + 34;
      if (who === "friend") {
        bubble.style.left = "auto";
        bubble.style.right = Math.round(sw * 0.03) + "px";
        bubble.style.top = Math.round(Math.max(floor, sh * 0.985 - g.u - bh - 18)) + "px";
      } else {
        bubble.style.right = "auto";
        bubble.style.left = Math.max(8, Math.round(g.mimiLeft + g.mimiW * 0.7)) + "px";
        bubble.style.top = Math.round(Math.max(floor, sh * 0.75 - g.u - bh - 18)) + "px";
      }
    }
    function layout() {
      var sw = stage.clientWidth;
      var sh = stage.clientHeight;
      var u = Math.round(clamp(Math.min(sh * 0.42, sw * 0.34), 90, 420));
      var c = Math.round(clamp(Math.min(sw * 0.4, sh * 0.34), 84, 480));
      g.u = u; g.c = c;
      g.mimiW = Math.round(u * 200 / 260);
      g.mimiLeft = Math.round(sw * 0.2 - g.mimiW / 2);
      mimi.style.cssText = "left:" + g.mimiLeft + "px;top:" + Math.round(sh * 0.75 - u) + "px;width:" + g.mimiW + "px;height:" + u + "px";
      var cupBase = sh * 0.775;
      g.cupLeft = Math.round(sw * 0.54 - c / 2);
      g.cupTop = Math.round(cupBase - c * 0.97);
      cup.style.cssText = "left:" + g.cupLeft + "px;top:" + g.cupTop + "px;width:" + c + "px;height:" + c + "px";
      var pw = Math.round(c * 1.12);
      plate.style.cssText = "left:" + Math.round(sw * 0.54 - pw / 2) + "px;top:" + Math.round(cupBase - pw * 40 / 220 * 0.7) + "px;width:" + pw + "px;height:" + Math.round(pw * 40 / 220);
      g.fw = Math.round(u * 200 / 260);
      g.fLeft = Math.round(sw * 0.83 - g.fw / 2);
      friend.style.left = g.fLeft + "px";
      friend.style.top = Math.round(sh * 0.985 - u) + "px";
      friend.style.width = g.fw + "px";
      friend.style.height = u + "px";
      placeBubble(g.bubbleWho);
    }
    function sizeStage() {
      /* the panel is as tall as its buttons; the stage takes the rest */
      var ph = Math.max(panel.offsetHeight, parseFloat(panel.style.minHeight) || 0);
      panel.style.minHeight = ph + "px";
      stage.style.bottom = ph + "px";
      layout();
    }
    function setFrost(i) {
      frostIdx = i;
      var f = FROSTS[i];
      cupSvgEl.style.setProperty("--f1", f.a);
      cupSvgEl.style.setProperty("--f2", f.b);
      cupSvgEl.style.setProperty("--f3", f.c);
      cup.classList.add("rg-hasfrost");
      cup.classList.add("rg-tappable");
      cup.setAttribute("aria-label", f.name + " cupcake");
    }

    /* ---- panels ---- */
    function showFrostPanel() {
      panel.innerHTML = "";
      FROSTS.forEach(function (f, i) {
        var b = make("button", "rg-swatch", frostIcon(f));
        b.type = "button";
        b.setAttribute("aria-label", f.name + " frosting");
        b.setAttribute("aria-pressed", "false");
        b.dataset.frost = String(i);
        ctx.on(b, "click", function () {
          setFrost(i);
          Array.prototype.forEach.call(panel.querySelectorAll(".rg-swatch"), function (s) { s.setAttribute("aria-pressed", s === b ? "true" : "false"); });
          if (!g.toppingsShown) { ctx.wait(500, showToppingPanel); }
        });
        panel.appendChild(b);
      });
      say("Pick a frosting!");
      sizeStage();
    }
    function showToppingPanel() {
      g.toppingsShown = true;
      panel.innerHTML = "";
      TOPPINGS.forEach(function (t, i) {
        var b = make("button", "rg-topbtn", toppingIcon(t.id));
        b.type = "button";
        b.setAttribute("aria-label", t.name);
        b.setAttribute("aria-pressed", i === tool ? "true" : "false");
        b.dataset.topping = t.id;
        ctx.on(b, "click", function () {
          tool = i;
          Array.prototype.forEach.call(panel.querySelectorAll(".rg-topbtn"), function (s) { s.setAttribute("aria-pressed", s === b ? "true" : "false"); });
          say("Now tap the cupcake!");
        });
        panel.appendChild(b);
      });
      say("Pick a topping. Then tap the cupcake!");
      sizeStage();
    }
    function showServe() {
      if (stage.querySelector(".rg-serve")) { return; }
      var b = make("button", "rg-btn rg-serve", "Serve");
      b.type = "button";
      b.setAttribute("aria-label", "Serve the cupcake");
      ctx.on(b, "click", serve);
      stage.appendChild(b);
    }

    /* ---- adding a topping where the child taps ---- */
    function onCupTap(e) {
      if (served || frostIdx < 0) { return; }
      var r = cupSvgEl.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width * 200;
      var y = (e.clientY - r.top) / r.height * 200;
      /* keep inside the frosting */
      var cx = 100, cy = 82, rx = 50, ry = 34;
      var dx = (x - cx) / rx, dy = (y - cy) / ry;
      var d = Math.sqrt(dx * dx + dy * dy);
      if (d > 1) { x = cx + dx / d * rx; y = cy + dy / d * ry; }
      var kind = TOPPINGS[tool].id;
      tops.push(kind);
      var holder = document.createElementNS(NS, "g");
      holder.innerHTML = toppingMarkup(kind, x, y, tops.length * 13 + Math.round(x), 1.3);
      while (holder.firstChild) { tg.appendChild(holder.firstChild); }
      while (tg.childNodes.length > 18) { tg.removeChild(tg.firstChild); }
      if (tops.length === 1) { say("Lovely! Add more, or press Serve."); showServe(); }
    }
    ctx.on(cup, "pointerdown", onCupTap);

    /* ---- serving ---- */
    function serve() {
      if (served) { return; }
      served = true;
      cup.classList.remove("rg-tappable");
      panel.innerHTML = "";
      var sb = stage.querySelector(".rg-serve");
      if (sb) { sb.parentNode.removeChild(sb); }
      setMimi("happy");
      say("Here you go!");
      sizeStage();
      flip.innerHTML = K.full(friendId, "walk");
      friend.style.opacity = "1";
      var enterX = stage.clientWidth - g.fLeft + 24;
      if (ctx.reduced) {
        friend.style.opacity = "0";
        friend.style.transform = "none";
        void friend.offsetWidth;
        friend.style.opacity = "1";
      } else {
        friend.style.transition = "none";
        friend.style.transform = "translateX(" + enterX + "px)";
        void friend.offsetWidth;
        friend.style.transition = "";
        friend.style.transform = "translateX(0)";
        flip.classList.add("rg-left");
      }
      ctx.wait(2500, function () {
        flip.classList.remove("rg-left");
        flip.innerHTML = K.full(friendId, "happy");
        /* the cupcake goes to her hands */
        var fr = friend.getBoundingClientRect();
        var cr = cup.getBoundingClientRect();
        var sc = clamp(g.fw * 0.5 / g.c, 0.25, 0.7);
        var tx = fr.left + fr.width * 0.5 - (cr.left + cr.width / 2);
        var ty = fr.top + fr.height * 0.66 - (cr.top + cr.height / 2);
        cup.style.transformOrigin = "50% 50%";
        cup.style.transform = ctx.reduced ? "none" : "translate(" + tx.toFixed(1) + "px," + ty.toFixed(1) + "px) scale(" + sc.toFixed(3) + ")";
        if (ctx.reduced) { cup.style.opacity = "0"; }
        ctx.wait(1100, function () {
          held.innerHTML = cupSvg();
          var hs = held.querySelector("svg");
          var f = FROSTS[frostIdx];
          hs.style.setProperty("--f1", f.a); hs.style.setProperty("--f2", f.b); hs.style.setProperty("--f3", f.c);
          hs.querySelector(".rg-frost").style.cssText = "opacity:1;transform:none;transition:none";
          hs.querySelector(".rg-tops").innerHTML = tg.innerHTML;
          Array.prototype.forEach.call(hs.querySelectorAll(".rg-top"), function (t) { t.style.animation = "none"; });
          held.style.top = "47%";
          held.classList.add("rg-on");
          cup.style.opacity = "0";
          say("Thank you!", "friend");
          setMimi("wave");
          ctx.wait(2300, function () {
            say("");
            if (ctx.reduced) {
              friend.style.opacity = "0";
            } else {
              flip.innerHTML = K.full(friendId, "walk");
              friend.style.transform = "translateX(" + enterX + "px)";
            }
            ctx.wait(2900, showDone);
          });
        });
      });
    }
    function showDone() {
      friend.style.visibility = "hidden";
      panel.innerHTML = "";
      var b = make("button", "rg-btn rg-done", "Done");
      b.type = "button";
      b.setAttribute("aria-label", "Done");
      ctx.on(b, "click", function () { finish(); });
      panel.appendChild(b);
      say("Yay! Thank you for helping!");
      setMimi("happy");
      sizeStage();
    }

    setMimi("stand");
    showFrostPanel();
    sizeStage();
    ctx.on(window, "resize", sizeStage);
    ctx.on(window, "orientationchange", sizeStage);
  }

  /* ================================================================== CASTLE: horse ride */
  function mountainTile(seedBase) {
    var rnd = seeded(seedBase);
    var p = uid();
    var pts = [];
    var x;
    for (x = 0; x <= 1200; x += 20) {
      var t = x / 1200 * Math.PI * 2;
      pts.push(x + "," + (170 + 34 * Math.sin(t * 2 + 1) + 20 * Math.sin(t * 5 + 2)).toFixed(1));
    }
    var s = '<svg viewBox="0 0 1200 300" preserveAspectRatio="none" aria-hidden="true"><defs>' + lin(p + "m", [[0, "#cddff2"], [1, "#e9f1fa"]]) + "</defs>" +
      '<polygon points="0,300 ' + pts.join(" ") + ' 1200,300" fill="url(#' + p + 'm)"/>';
    /* a faraway castle on a hill */
    var cx = 700 + rnd() * 120;
    var cy = 170 + 34 * Math.sin(cx / 1200 * Math.PI * 4 + 1) + 20 * Math.sin(cx / 1200 * Math.PI * 10 + 2) + 4;
    s += '<g fill="#c3d3ea" opacity=".95"><rect x="' + (cx - 34) + '" y="' + (cy - 44) + '" width="68" height="46"/>' +
      '<rect x="' + (cx - 44) + '" y="' + (cy - 62) + '" width="20" height="64"/><rect x="' + (cx + 24) + '" y="' + (cy - 62) + '" width="20" height="64"/>' +
      '<polygon points="' + (cx - 46) + "," + (cy - 62) + " " + (cx - 34) + "," + (cy - 80) + " " + (cx - 22) + "," + (cy - 62) + '"/>' +
      '<polygon points="' + (cx + 22) + "," + (cy - 62) + " " + (cx + 34) + "," + (cy - 80) + " " + (cx + 46) + "," + (cy - 62) + '"/></g>';
    return s + "</svg>";
  }
  function hillsTile(seedBase) {
    var rnd = seeded(seedBase);
    var p = uid();
    function hill(base, amp, ph, k1, k2) {
      var pts = [];
      for (var x = 0; x <= 1200; x += 20) {
        var t = x / 1200 * Math.PI * 2;
        pts.push(x + "," + (base + amp * Math.sin(t * k1 + ph) + amp * 0.4 * Math.sin(t * k2 + ph * 2)).toFixed(1));
      }
      return "0,300 " + pts.join(" ") + " 1200,300";
    }
    var s = '<svg viewBox="0 0 1200 300" preserveAspectRatio="none" aria-hidden="true"><defs>' + lin(p + "h1", [[0, "#c6ebb8"], [1, "#a9dc9f"]]) + lin(p + "h2", [[0, "#aee3a4"], [1, "#86cc88"]]) + "</defs>" +
      '<polygon points="' + hill(120, 26, 0.6, 2, 5) + '" fill="url(#' + p + 'h1)"/>' +
      '<polygon points="' + hill(168, 22, 2.2, 3, 7) + '" fill="url(#' + p + 'h2)"/>';
    /* round trees and small cottages sit on the front hill */
    for (var i = 0; i < 8; i += 1) {
      var x = 70 + i * 150 + rnd() * 50;
      var y = 168 + 22 * Math.sin(x / 1200 * Math.PI * 6 + 2.2) + 8.8 * Math.sin(x / 1200 * Math.PI * 14 + 4.4) + 8;
      if (i === 3 || i === 6) {
        s += '<g transform="translate(' + x.toFixed(0) + " " + y.toFixed(0) + ')"><rect x="-22" y="-26" width="44" height="30" fill="#fff4dc" ' + ink(2.4) + "/>" +
          '<polygon points="-28,-24 0,-52 28,-24" fill="#e7a58a" ' + ink(2.4) + '/><rect x="-6" y="-14" width="12" height="18" rx="3" fill="#a8784f" ' + ink(2) + "/></g>";
      } else {
        var r = 20 + rnd() * 8;
        s += '<g transform="translate(' + x.toFixed(0) + " " + y.toFixed(0) + ')"><rect x="-4" y="-18" width="8" height="22" fill="#a8784f" ' + ink(2.2) + "/>" +
          '<circle cx="0" cy="' + (-r - 12) + '" r="' + r.toFixed(0) + '" fill="#79c47e" ' + ink(2.4) + "/>" +
          '<circle cx="' + (-r * 0.3).toFixed(0) + '" cy="' + (-r - 18) + '" r="' + (r * 0.4).toFixed(0) + '" fill="#a6e0a0" opacity=".8"/></g>';
      }
    }
    return s + "</svg>";
  }
  function groundTile(seedBase) {
    var rnd = seeded(seedBase);
    var p = uid();
    var top = [], bot = [];
    var x;
    for (x = 0; x <= 1200; x += 20) {
      var t = x / 1200 * Math.PI * 2;
      top.push(x + "," + (130 + 12 * Math.sin(t * 2 + 0.5) + 6 * Math.sin(t * 5)).toFixed(1));
      bot.push(x + "," + (320 + 10 * Math.sin(t * 3) + 5 * Math.sin(t * 7)).toFixed(1));
    }
    var pathPts = top.join(" ") + " " + bot.slice().reverse().join(" ");
    var s = '<svg viewBox="0 0 1200 400" preserveAspectRatio="none" aria-hidden="true"><defs>' + lin(p + "g", [[0, "#9bdc94"], [1, "#78c47c"]]) + lin(p + "d", [[0, "#f3dcae"], [1, "#e5c78f"]]) + "</defs>" +
      '<rect width="1200" height="400" fill="url(#' + p + 'g)"/>' +
      '<polygon points="' + pathPts + '" fill="#d9b97e"/>' +
      '<polygon points="' + top.map(function (q) { var a = q.split(","); return a[0] + "," + (parseFloat(a[1]) + 7).toFixed(1); }).join(" ") + " " +
      bot.slice().reverse().map(function (q) { var a = q.split(","); return a[0] + "," + (parseFloat(a[1]) - 7).toFixed(1); }).join(" ") + '" fill="url(#' + p + 'd)"/>';
    var i;
    for (i = 0; i < 16; i += 1) { /* soft pebbles on the path */
      var px = rnd() * 1200, py = 160 + rnd() * 140;
      s += '<ellipse cx="' + px.toFixed(0) + '" cy="' + py.toFixed(0) + '" rx="' + (6 + rnd() * 6).toFixed(0) + '" ry="3.5" fill="#cfae74" opacity=".75"/>';
    }
    for (i = 0; i < 22; i += 1) { /* grass tufts and flowers */
      var gx = rnd() * 1200;
      var above = rnd() < 0.5;
      var gy = above ? 30 + rnd() * 80 : 345 + rnd() * 45;
      if (rnd() < 0.5) {
        s += '<path d="M' + (gx - 8).toFixed(0) + " " + gy.toFixed(0) + " Q" + (gx - 6).toFixed(0) + " " + (gy - 14).toFixed(0) + " " + (gx - 2).toFixed(0) + " " + (gy - 18).toFixed(0) +
          " M" + gx.toFixed(0) + " " + gy.toFixed(0) + " Q" + gx.toFixed(0) + " " + (gy - 18).toFixed(0) + " " + (gx + 3).toFixed(0) + " " + (gy - 24).toFixed(0) +
          " M" + (gx + 8).toFixed(0) + " " + gy.toFixed(0) + " Q" + (gx + 6).toFixed(0) + " " + (gy - 12).toFixed(0) + " " + (gx + 11).toFixed(0) + " " + (gy - 16).toFixed(0) +
          '" fill="none" stroke="#4fa466" stroke-width="3" stroke-linecap="round"/>';
      } else {
        var col = ["#ffd9e6", "#fff3b8", "#e3d6ff", "#ffffff"][Math.floor(rnd() * 4)];
        s += '<g transform="translate(' + gx.toFixed(0) + " " + gy.toFixed(0) + ')"><path d="M0 0 L0 12" stroke="#4fa466" stroke-width="2.6"/>' +
          '<circle r="6" cx="0" cy="0" fill="' + col + '" ' + ink(1.8) + '/><circle r="2.4" fill="#f2a900"/></g>';
      }
    }
    return s + "</svg>";
  }
  function logSvg() {
    var p = uid();
    return '<svg viewBox="0 0 120 70" aria-hidden="true"><defs>' + lin(p + "b", [[0, "#c79a63"], [0.5, "#a9763f"], [1, "#7e5429"]]) + rad(p + "e", [[0, "#f2d3a0"], [1, "#d6a766"]]) + "</defs>" +
      '<ellipse cx="60" cy="64" rx="52" ry="5" fill="rgba(60,40,30,.2)"/>' +
      '<path d="M18 14 H98 V58 H18 Z" fill="url(#' + p + 'b)" ' + ink(3.4) + "/>" +
      '<path d="M30 26 H80 M26 38 H88 M32 49 H76" stroke="#7e5429" stroke-width="2.4" stroke-linecap="round" opacity=".55"/>' +
      '<ellipse cx="100" cy="36" rx="14" ry="22" fill="url(#' + p + 'e)" ' + ink(3.4) + "/>" +
      '<ellipse cx="100" cy="36" rx="8" ry="13" fill="none" stroke="#b07a3c" stroke-width="2.2"/><ellipse cx="100" cy="36" rx="3" ry="5" fill="none" stroke="#b07a3c" stroke-width="2"/>' +
      '<ellipse cx="18" cy="36" rx="12" ry="22" fill="#a9763f" ' + ink(3.4) + "/>" +
      '<path d="M34 14 Q42 6 52 14 Q44 20 34 14 Z" fill="#79c47e" ' + ink(2) + "/></svg>";
  }
  function streamSvg() {
    var p = uid();
    return '<svg viewBox="0 0 100 200" preserveAspectRatio="none" aria-hidden="true"><defs>' + lin(p + "w", [[0, "#bfe6fb"], [1, "#78bdee"]], 1, 0) + "</defs>" +
      '<path d="M26 8 C10 40 36 70 22 100 C10 130 36 160 26 192 Q50 202 74 192 C90 160 62 130 78 100 C92 70 62 40 74 8 Q50 -2 26 8 Z" fill="#e8d3a6" ' + ink(3) + "/>" +
      '<path d="M34 12 C20 42 46 70 32 100 C20 130 46 160 34 188 Q50 195 66 188 C80 160 52 130 68 100 C82 70 52 42 66 12 Q50 6 34 12 Z" fill="url(#' + p + 'w)"/>' +
      '<path d="M42 34 q8 -6 16 0 M38 92 q8 -6 16 0 M44 150 q8 -6 16 0" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".85"/>' +
      '<ellipse cx="14" cy="60" rx="6" ry="4" fill="#cdb98c" ' + ink(1.8) + '/><ellipse cx="88" cy="140" rx="6" ry="4" fill="#cdb98c" ' + ink(1.8) + "/></svg>";
  }
  function basketSvg() {
    var p = uid();
    return '<svg viewBox="0 0 60 50" aria-hidden="true"><defs>' + lin(p + "k", [[0, "#d9a760"], [1, "#a9763f"]]) + "</defs>" +
      '<path d="M12 20 C14 2 46 2 48 20" fill="none" ' + ink(3) + "/>" +
      '<path d="M6 20 H54 L48 46 H12 Z" fill="url(#' + p + 'k)" ' + ink(3) + "/>" +
      '<path d="M16 24 L18 44 M30 24 V45 M44 24 L42 44" stroke="#7e5429" stroke-width="2" opacity=".6"/></svg>';
  }
  function villagerSvg(look) {
    var p = uid();
    var L = [
      { skin: "#ffdcc0", dress: "#f6a3bd", hat: "#fff0c7", hair: "#8a5a3a" },
      { skin: "#eac29a", dress: "#8fc7f0", hat: "#e7a58a", hair: "#3b2a33" },
      { skin: "#fff0e0", dress: "#a6dba0", hat: "#cdb6f6", hair: "#d9a05a" }
    ][look % 3];
    return '<svg viewBox="0 0 100 150" aria-hidden="true"><defs>' + rad(p + "s", [[0, "#fff6ea"], [1, L.skin]]) + "</defs>" +
      '<ellipse cx="50" cy="146" rx="26" ry="4" fill="rgba(60,40,30,.2)"/>' +
      '<path d="M26 142 C22 108 30 84 50 82 C70 84 78 108 74 142 Z" fill="' + L.dress + '" ' + ink(3) + "/>" +
      '<path d="M30 112 H70" stroke="#fff" stroke-width="3" opacity=".6"/>' +
      '<path d="M30 92 C20 100 18 112 22 120" fill="none" stroke="' + L.skin + '" stroke-width="9" stroke-linecap="round"/>' +
      '<g class="rg-armw"><path d="M70 92 C82 84 88 70 86 56" fill="none" stroke="' + INK + '" stroke-width="13" stroke-linecap="round"/>' +
      '<path d="M70 92 C82 84 88 70 86 56" fill="none" stroke="' + L.skin + '" stroke-width="7" stroke-linecap="round"/></g>' +
      '<circle cx="50" cy="52" r="28" fill="url(#' + p + 's)" ' + ink(3) + "/>" +
      '<path d="M22 46 C24 24 76 24 78 46 C70 36 30 36 22 46 Z" fill="' + L.hair + '" ' + ink(2.6) + "/>" +
      '<path d="M26 34 C32 14 68 14 74 34 Z" fill="' + L.hat + '" ' + ink(2.6) + "/>" +
      '<path d="M36 54 Q40 49 44 54 M56 54 Q60 49 64 54" fill="none" ' + ink(2.8) + "/>" +
      '<path d="M43 64 Q50 71 57 64" fill="none" ' + ink(2.8) + "/>" +
      '<ellipse cx="33" cy="62" rx="5" ry="3" fill="#ff8fb4" opacity=".55"/><ellipse cx="67" cy="62" rx="5" ry="3" fill="#ff8fb4" opacity=".55"/></svg>';
  }
  function gateSvg() {
    var p = uid();
    var batt = "";
    var i;
    for (i = 0; i < 4; i += 1) { batt += '<rect x="' + (14 + i * 22) + '" y="52" width="14" height="14" fill="url(#' + p + 'st)" ' + ink(2.6) + "/>"; }
    var battR = "";
    for (i = 0; i < 4; i += 1) { battR += '<rect x="' + (298 + i * 22) + '" y="52" width="14" height="14" fill="url(#' + p + 'st)" ' + ink(2.6) + "/>"; }
    var bricks = "";
    for (i = 0; i < 6; i += 1) { bricks += '<path d="M12 ' + (88 + i * 28) + " H102 M298 " + (88 + i * 28) + ' H388" />'; }
    return '<svg viewBox="0 0 400 300" aria-hidden="true"><defs>' + lin(p + "st", [[0, "#f3efe6"], [1, "#cfc6b6"]], 1, 1) + lin(p + "in", [[0, "#ffe9b5"], [1, "#f7c98a"]]) + lin(p + "wd", [[0, "#b98655"], [1, "#8a5e3b"]], 1, 0) + "</defs>" +
      '<ellipse cx="200" cy="292" rx="190" ry="8" fill="rgba(60,40,30,.2)"/>' +
      '<rect x="100" y="60" width="200" height="232" fill="url(#' + p + 'st)" ' + ink(4) + "/>" +
      '<rect x="8" y="64" width="100" height="228" fill="url(#' + p + 'st)" ' + ink(4) + "/>" +
      '<rect x="292" y="64" width="100" height="228" fill="url(#' + p + 'st)" ' + ink(4) + "/>" + batt + battR +
      '<g stroke="#b8ae9a" stroke-width="2" fill="none">' + bricks + "</g>" +
      '<path d="M120 292 V150 C120 96 280 96 280 150 V292 Z" fill="url(#' + p + 'in)" ' + ink(4) + "/>" +
      '<path d="M160 292 V196 H240 V292 Z" fill="#f2b87a" opacity=".55"/><path d="M140 170 L160 150 L180 170 V196 H140 Z" fill="#fff4dc" ' + ink(2.6) + ' opacity=".9"/>' +
      '<path d="M120 292 V150 C120 134 130 124 142 120 V292 Z" fill="url(#' + p + 'wd)" ' + ink(3.4) + "/>" +
      '<path d="M280 292 V150 C280 134 270 124 258 120 V292 Z" fill="url(#' + p + 'wd)" ' + ink(3.4) + "/>" +
      '<path d="M120 292 V150 C120 96 280 96 280 150" fill="none" ' + ink(5) + "/>" +
      '<path d="M58 52 V12 M342 52 V12" ' + ink(3.4) + " />" +
      '<path d="M58 12 L96 24 L58 36 Z" fill="#8fc7f0" ' + ink(2.6) + '/><path d="M342 12 L304 24 L342 36 Z" fill="#f6a3bd" ' + ink(2.6) + "/></svg>";
  }

  function startHorseRide(ctx, finish) {
    var KA = window.KnightArt;
    if (!KA || !KA.full) { throw new Error("RewardGames: window.KnightArt is not loaded"); }
    KA.injectCss();
    var root = ctx.root;
    var run = turn.castle * 7919 + 11;
    var rnd = seeded(run);
    var W = 0, H = 0, u = 0, hx = 0, feetY = 0, land = true;
    var cam = 0;     /* camera, in u */
    var t = 0;       /* ride time, seconds */
    var sf = 1;      /* speed factor */
    var BASE = 0.8;  /* u per second */
    var hop = null;
    var queued = false;
    var phase = "ride";
    var objs = [];
    var nextObs = 0;
    var nextApple = 0;
    var obsCount = 0;
    var apples = 0;
    var gate = null;
    var camStop = 0;
    var snapCam = 0;
    var snapT = 0;
    var AP_MAX = 10;
    var layerNodes = [];

    root.innerHTML =
      '<div class="rg-sky"></div><div class="rg-sun" aria-hidden="true"></div>' +
      '<div class="rg-scene">' +
      '<div class="rg-layer" data-f="0.06" data-r="4" style="top:6%;height:40%">' + [0, 1, 2, 3].map(function (i) { return mountainTile(40 + i * 0); }).join("") + "</div>" +
      '<div class="rg-layer" data-f="0.2" data-r="4" style="top:30%;height:36%">' + [0, 1, 2, 3].map(function () { return hillsTile(90); }).join("") + "</div>" +
      '<div class="rg-layer" data-f="1" data-r="3" style="top:60%;height:40%">' + [0, 1, 2, 3].map(function () { return groundTile(5); }).join("") + "</div>" +
      '<div class="rg-world rg-back"></div>' +
      '<div class="rg-shadow"></div>' +
      '<div class="rg-horse" data-rg-fit><div class="rg-bob">' +
      '<div class="rg-art rg-h-stand"></div><div class="rg-art rg-h-happy" hidden></div>' +
      '<div class="rg-rider"><div class="rg-art rg-r-stand"></div><div class="rg-art rg-r-cheer" hidden></div></div>' +
      "</div></div>" +
      '<div class="rg-world rg-front"></div>' +
      "</div>" +
      '<div class="rg-hud" data-rg-fit aria-label="Apples you collected"></div>' +
      '<button type="button" class="rg-btn rg-jump" aria-label="Jump"><svg viewBox="0 0 40 40" aria-hidden="true"><path d="M8 26 L20 12 L32 26" fill="none" stroke="#3a2a10" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg>Jump</button>';

    var scene = root.querySelector(".rg-scene");
    var worldBack = root.querySelector(".rg-back");
    var worldFront = root.querySelector(".rg-front");
    var horse = root.querySelector(".rg-horse");
    var bob = horse.querySelector(".rg-bob");
    var rider = horse.querySelector(".rg-rider");
    var shadow = root.querySelector(".rg-shadow");
    var hud = root.querySelector(".rg-hud");
    var jumpBtn = root.querySelector(".rg-jump");
    Array.prototype.forEach.call(worldBack.parentNode.querySelectorAll(".rg-world"), function (w) { w.style.cssText = "position:absolute;inset:0;pointer-events:none"; });

    horse.querySelector(".rg-h-stand").innerHTML = KA.full("horse", "stand");
    horse.querySelector(".rg-h-happy").innerHTML = KA.full("horse", "happy");
    rider.querySelector(".rg-r-stand").innerHTML = KA.full("knight", "happy", { armour: true, plume: true, shield: false });
    rider.querySelector(".rg-r-cheer").innerHTML = KA.full("knight", "cheer", { armour: true, plume: true, shield: false });

    /* the apple basket (no numbers: just apples piling up) */
    hud.innerHTML = '<span class="rg-basket">' + basketSvg() + "</span>";
    var slots = [];
    for (var si = 0; si < AP_MAX; si += 1) {
      var slot = make("span", "rg-apple-slot", appleSvg());
      hud.appendChild(slot);
      slots.push(slot);
    }

    layerNodes = Array.prototype.map.call(root.querySelectorAll(".rg-layer"), function (n) { return { el: n, f: parseFloat(n.getAttribute("data-f")), r: parseFloat(n.getAttribute("data-r")), w: 1 }; });

    /* ---- sizes ---- */
    function layout() {
      W = root.clientWidth; H = root.clientHeight;
      land = W > H;
      u = Math.round(clamp(Math.min(H * 0.34, W * (land ? 0.3 : 0.4)), 90, 460));
      root.style.setProperty("--u", String(u));
      root.style.setProperty("--ap", String(Math.round(clamp(Math.min(W, H) * 0.045, 22, 38))));
      hx = Math.round(W * (land ? 0.14 : 0.05));
      feetY = Math.round(H * 0.835);
      horse.style.cssText = "left:" + hx + "px;top:" + Math.round(feetY - u * 255 / 260) + "px;width:" + u + "px;height:" + u + "px";
      /* rider: head and chest of the knight, sitting on the horse */
      /* the horse faces right: its head spans about 0.58u to 0.93u, so the knight stays over the back, left of 0.54u */
      var rw = u * 0.31;
      var rh = rw * 1.3 * 0.74;
      rider.style.cssText = "left:" + Math.round(u * 0.2) + "px;top:" + Math.round(u * 0.6 - rh) + "px;width:" + Math.round(rw) + "px;height:" + Math.round(rh) + "px";
      shadow.style.cssText = "left:" + (hx + u * 0.05) + "px;top:" + (feetY - u * 0.06) + "px;width:" + Math.round(u * 0.8) + "px;height:" + Math.round(u * 0.14) + "px";
      layerNodes.forEach(function (n) {
        /* whole-pixel tiles, so no hairline shows where two tiles meet */
        n.w = Math.max(1, Math.round(n.el.clientHeight * n.r));
        Array.prototype.forEach.call(n.el.querySelectorAll("svg"), function (sv) { sv.style.width = n.w + "px"; });
      });
      Array.prototype.forEach.call(root.querySelectorAll(".rg-obj"), place);
      render();
    }

    /* ---- world objects (positions in u) ---- */
    function addObj(kind, x, w, h, bottomFrac, html, front, extraClass) {
      var d = make("div", "rg-obj " + (extraClass || ""), html);
      d.style.width = "calc(var(--u)*" + w + "px)";
      d.style.height = "calc(var(--u)*" + h + "px)";
      var o = { el: d, kind: kind, x: x, w: w, h: h, bottom: bottomFrac, done: false };
      (front ? worldFront : worldBack).appendChild(d);
      objs.push(o);
      place(d, o);
      return o;
    }
    function objOf(d) { for (var i = 0; i < objs.length; i += 1) { if (objs[i].el === d) { return objs[i]; } } return null; }
    function place(d, o) {
      o = o || objOf(d);
      if (!o) { return; }
      var camR = ctx.reduced ? snapCam : cam;
      var y;
      if (o.kind === "apple") { y = feetY - o.hgt * u - o.h * u; }
      else if (o.kind === "stream") { y = H * 0.705; d.style.height = Math.round(H * 0.24) + "px"; }
      else { y = H * o.bottom - o.h * u; }
      d.style.transform = "translate3d(" + ((o.x - camR) * u).toFixed(1) + "px," + y.toFixed(1) + "px,0)";
    }
    function spawnObstacle(x) {
      obsCount += 1;
      var isLog = obsCount % 2 === 1;
      var o;
      if (isLog) { o = addObj("log", x, 0.62, 0.36, 0.865, logSvg(), true); }
      else { o = addObj("stream", x, 0.72, 0.5, 0.945, streamSvg(), false); }
      o.cx = o.x + o.w / 2;
      /* a high apple above it: the reward for a jump */
      var a = addObj("apple", x + o.w / 2 - 0.12, 0.24, 0.26, 0, appleSvg(), true);
      a.hgt = 1.12;
      a.high = true;
      place(a.el, a);
    }
    function spawnApples(x) {
      var n = 2 + Math.floor(rnd() * 2);
      for (var i = 0; i < n; i += 1) {
        var a = addObj("apple", x + i * 0.45, 0.24, 0.26, 0, appleSvg(), true);
        a.hgt = 0.3 + (i % 2) * 0.28;
        place(a.el, a);
      }
    }
    function spawnGate() {
      var gwU = Math.min(1.7, 0.44 * W / u);
      var ghU = gwU * 0.75;
      var screenGate = W * (land ? 0.7 : 0.74);
      var gx = cam + (W + gwU * u * 0.5 + 12) / u; /* centre, just off screen */
      camStop = gx - screenGate / u;
      gate = { x: gx, w: gwU };
      var o = addObj("gate", gx - gwU / 2, gwU, ghU, 0.785, gateSvg(), false);
      o.el.setAttribute("data-rg-fit", "");
      o.el.setAttribute("data-rg-late", "1");
      var vs = [-0.34, 0.0, 0.34];
      vs.forEach(function (off, i) {
        var vw = 0.38, vh = 0.57;
        var v = addObj("villager", gx + off * gwU - vw / 2, vw, vh, 0.815, i === 1 ? KA.full("buddy", "wave") : villagerSvg(i), true, "rg-villager");
        v.el.setAttribute("data-rg-fit", "");
        v.el.setAttribute("data-rg-late", "1");
        if (i === 1) { v.w = vw; v.h = 0.68; v.el.style.height = "calc(var(--u)*0.68px)"; v.el.style.width = "calc(var(--u)*" + (0.68 * 200 / 260).toFixed(3) + "px)"; v.x = gx + off * gwU - 0.68 * 200 / 260 / 2; }
        place(v.el, v);
      });
    }

    /* ---- apples fly to the basket ---- */
    function collect(o) {
      o.done = true;
      apples += 1;
      var r = o.el.getBoundingClientRect();
      var rr = root.getBoundingClientRect();
      var fly = make("div", "rg-apple-fly", appleSvg());
      fly.style.width = r.width + "px";
      fly.style.height = r.height + "px";
      var sx = r.left - rr.left, sy = r.top - rr.top;
      fly.style.transform = "translate(" + sx + "px," + sy + "px)";
      root.appendChild(fly);
      o.el.parentNode.removeChild(o.el);
      var target = slots[Math.min(apples, AP_MAX) - 1];
      var tr = target.getBoundingClientRect();
      void fly.offsetWidth;
      if (ctx.reduced) { fly.style.opacity = "0"; }
      else { fly.style.transform = "translate(" + (tr.left - rr.left) + "px," + (tr.top - rr.top) + "px) scale(" + (tr.width / Math.max(r.width, 1)).toFixed(3) + ")"; fly.style.opacity = "0.2"; }
      ctx.wait(850, function () { if (fly.parentNode) { fly.parentNode.removeChild(fly); } });
      if (apples <= AP_MAX) { ctx.wait(700, function () { target.classList.add("rg-in"); }); }
    }

    /* ---- jumping ---- */
    function nextObstacleAhead(cx) {
      for (var i = 0; i < objs.length; i += 1) {
        var o = objs[i];
        if ((o.kind === "log" || o.kind === "stream") && o.x + o.w > cx - 0.1) { return o; }
      }
      return null;
    }
    function startHop(cx, len, height, speed) {
      hop = { s: cx, L: len, h: height, sp: speed };
      swapPose(true);
    }
    function swapPose(up) {
      horse.querySelector(".rg-h-stand").hidden = up;
      horse.querySelector(".rg-h-happy").hidden = !up;
    }
    function jump() {
      if (phase !== "ride" || hop || queued) { return; }
      var cx = cam + (hx + 0.45 * u) / u;
      var o = nextObstacleAhead(cx);
      if (o && o.x - cx < 1.5 && o.x - cx > -0.1) { queued = true; return; }
      startHop(cx, 1.3, 0.4, 1);
    }
    ctx.on(root, "pointerdown", function (e) {
      if (e.target && e.target.closest && e.target.closest(".rg-done")) { return; }
      jump();
    });
    ctx.on(jumpBtn, "click", function () { jump(); });
    ctx.on(window, "keydown", function (e) {
      if (e.key === " " || e.key === "ArrowUp") { jump(); }
    });

    /* ---- drawing each frame ---- */
    function render() {
      var camR = ctx.reduced ? snapCam : cam;
      layerNodes.forEach(function (n) {
        var off = Math.round((camR * u * n.f) % n.w);
        n.el.style.transform = "translate3d(" + (-off) + "px,0,0)";
        n.el.style.width = Math.ceil(W / n.w + 3) * n.w + "px";
      });
      Array.prototype.forEach.call(root.querySelectorAll(".rg-obj"), function (d) { place(d); });
      var cx = cam + (hx + 0.45 * u) / u;
      var y = 0;
      if (hop && !ctx.reduced) {
        y = hop.h * Math.sin(Math.PI * clamp((cx - hop.s) / hop.L, 0, 1));
      }
      bob.style.transform = "translate3d(0," + (-(y * u)).toFixed(1) + "px,0)";
      var sh = 1 - Math.min(0.4, y * 0.8);
      shadow.style.transform = "scale(" + sh.toFixed(3) + ")";
    }

    function step(dt) {
      t += dt;
      var cx = cam + (hx + 0.45 * u) / u;
      var ahead = cam + (W + 0.4 * u) / u;
      /* spawn things beyond the right edge */
      if (phase === "ride") {
        if (t < 28 && ahead >= nextObs) { spawnObstacle(nextObs); nextObs += 5 + rnd() * 1.6; }
        if (t < 33 && ahead >= nextApple) {
          var near = false;
          for (var i = 0; i < objs.length; i += 1) { if ((objs[i].kind === "log" || objs[i].kind === "stream") && Math.abs(objs[i].x - nextApple) < 1.6) { near = true; } }
          if (!near) { spawnApples(nextApple); }
          nextApple += 2.6 + rnd() * 0.8;
        }
        if (t >= 36 && !gate) {
          var ob = nextObstacleAhead(cx);
          if (!ob || ob.x > ahead + 2) { spawnGate(); phase = "approach"; }
        }
      }
      /* hops */
      if (!hop) {
        var o = nextObstacleAhead(cx);
        if (o && o.x - cx < 0.5 && o.x + o.w > cx - 0.3) {
          if (queued) { startHop(cx, o.w + 0.9, 0.42, 1); queued = false; }
          else { startHop(cx, o.w + 0.75, 0.26, 0.6); }
        }
      } else if (cx - hop.s >= hop.L) {
        hop = null;
        swapPose(false);
      }
      /* speed */
      var target = 1;
      if (hop) { target = hop.sp; }
      else if (phase === "ride") {
        var nx = nextObstacleAhead(cx);
        if (nx && nx.x - cx < 2.2 && !queued) { target = 0.55; }
      }
      if (phase === "approach") {
        var rem = camStop - cam;
        target = clamp(rem / 1.4, 0.1, 1);
      }
      sf += (target - sf) * Math.min(1, dt * 3);
      cam += BASE * sf * dt;
      if (phase === "approach" && cam >= camStop - 0.004) {
        cam = camStop;
        arrive();
      }
      /* apples and tidy-up */
      for (var j = objs.length - 1; j >= 0; j -= 1) {
        var ob2 = objs[j];
        if (ob2.kind === "apple" && !ob2.done) {
          var top = hop && !ctx.reduced ? hop.h * Math.sin(Math.PI * clamp((cx - hop.s) / hop.L, 0, 1)) : 0;
          if (Math.abs(ob2.x + ob2.w / 2 - cx) < 0.32 && ob2.hgt <= 0.95 + top) { collect(ob2); objs.splice(j, 1); continue; }
        }
        if (ob2.x + ob2.w < cam - 0.8 && ob2.kind !== "gate" && ob2.kind !== "villager") {
          if (ob2.el.parentNode) { ob2.el.parentNode.removeChild(ob2.el); }
          objs.splice(j, 1);
        }
      }
      /* reduced motion: the picture changes in soft fades */
      if (ctx.reduced && phase !== "arrived" && t - snapT > 3.2) {
        snapT = t;
        scene.style.opacity = "0";
        ctx.wait(380, function () { snapCam = cam; render(); scene.style.opacity = "1"; });
      }
    }

    function arrive() {
      phase = "arrived";
      hop = null;
      queued = false;
      snapCam = cam;
      scene.style.opacity = "1";
      swapPose(true);
      rider.querySelector(".rg-r-stand").hidden = true;
      rider.querySelector(".rg-r-cheer").hidden = false;
      root.classList.add("rg-arrived");
      jumpBtn.style.opacity = "0";
      jumpBtn.style.pointerEvents = "none";
      jumpBtn.tabIndex = -1;
      jumpBtn.setAttribute("aria-hidden", "true");
      render();
      ctx.wait(1500, function () {
        var b = make("button", "rg-btn rg-done", "Done");
        b.type = "button";
        b.setAttribute("aria-label", "Done");
        ctx.on(b, "click", function (e) { e.stopPropagation(); finish(); });
        root.appendChild(b);
      });
    }

    layout();
    ctx.on(window, "resize", layout);
    ctx.on(window, "orientationchange", layout);
    nextObs = cam + (W + 0.4 * u) / u + 2.5;
    nextApple = cam + (W + 0.4 * u) / u + 0.8;
    ctx.loop(function (dt) {
      /* small steps keep the maths smooth even on a slow frame */
      var left = dt;
      while (left > 0) {
        var d = Math.min(left, 0.04);
        step(d);
        left -= d;
        if (phase === "arrived") { break; }
      }
      render();
      return phase !== "arrived" ? true : false;
    });
  }

  /* ------------------------------------------------------------------ registry and public API */
  games.cafe.push({ name: "cupcake", start: startCupcake });
  games.castle.push({ name: "horse_ride", start: startHorseRide });

  function register(theme, name, starter) {
    if (!games[theme]) { games[theme] = []; turn[theme] = 0; }
    games[theme].push({ name: name, start: starter });
  }

  function close() {
    if (!active) { return; }
    var a = active;
    active = null;
    a.ctx.dispose();
    if (a.root.parentNode) { a.root.parentNode.removeChild(a.root); }
    if (a.restore) { a.restore(); }
    a.resolve({ done: false, theme: a.theme, game: a.name });
  }

  function play(el, opts) {
    opts = opts || {};
    var theme = opts.theme === "castle" ? "castle" : "cafe";
    if (!el) { return Promise.reject(new Error("RewardGames.play needs a container element")); }
    if (!games[theme].length) { return Promise.reject(new Error("RewardGames: no game for theme " + theme)); }
    close();
    injectCss();
    var game = games[theme][turn[theme] % games[theme].length];
    turn[theme] += 1;
    var ctx = makeContext(el, { theme: theme, fast: opts.fast });
    var restore = null;
    try {
      if (getComputedStyle(el).position === "static") {
        el.style.position = "relative";
        restore = function () { el.style.position = ""; };
      }
    } catch (e) { restore = null; }
    return new Promise(function (resolve, reject) {
      var rec = { ctx: ctx, root: ctx.root, resolve: resolve, restore: restore, theme: theme, name: game.name };
      active = rec;
      function finish() {
        if (active !== rec) { return; }
        active = null;
        ctx.dispose();
        if (ctx.root.parentNode) { ctx.root.parentNode.removeChild(ctx.root); }
        if (restore) { restore(); }
        var result = { done: true, theme: theme, game: game.name };
        resolve(result);
        if (typeof opts.onDone === "function") {
          try { opts.onDone(result); } catch (e2) { setTimeout(function () { throw e2; }, 0); }
        }
      }
      el.appendChild(ctx.root);
      try {
        game.start(ctx, finish);
      } catch (err) {
        active = null;
        ctx.dispose();
        if (ctx.root.parentNode) { ctx.root.parentNode.removeChild(ctx.root); }
        reject(err);
      }
    });
  }

  window.RewardGames = { play: play, close: close, register: register, themes: function () { return Object.keys(games); } };
})();
