/* reward_core.js - the reward-game system (Kids Maths). One short game after every 5 answers.
 *
 * PUBLIC API (window.RewardGames)
 *   RewardGames.play(el, { theme: "cafe" | "castle", onDone, fast, speak }) -> Promise
 *       el    = a full-screen container the game fills.
 *       fast  = true shortens every wait and animation 5x (tests and the demo).
 *       speak = optional function(text) that says a line out loud (game/index.html passes its say()).
 *               Without it the game is silent but works.
 *       Resolves with { done: true, theme, game } when the child taps Done (onDone runs then too).
 *   RewardGames.close()  -> stops the running game (sounds, timers, frames), resolves it with { done: false }.
 *   RewardGames.register(theme, { name, start(ctx, finish) })   (the old form (theme, name, start) also works)
 *       Games of one theme are played in turn. ("cafe" = cafe_hot_chocolate.js, "castle" = castle_pony_stable.js.)
 *       If an older RewardGames object was loaded before this file, a theme with no new game falls back to it.
 *   Tests: window.__rewardAutoPlay = true makes each game do its own steps (ctx.auto).
 *
 * THE ctx A GAME GETS  (start(ctx, finish); call finish() when the child taps Done - ctx.doneButton does that)
 *   ctx.root      the game's root element (class "rw-root rw-<theme>"); build the game inside it.
 *   ctx.layer     a top layer inside root for drag ghosts, hearts and the hint hand (pointer-events: none).
 *   ctx.theme, ctx.fast, ctx.k (5 in fast mode, else 1), ctx.reduced (prefers-reduced-motion), ctx.auto (autoplay)
 *   ctx.wait(ms, fn?)        -> Promise; resolves (and runs fn) after ms / k. Never resolves after close.
 *   ctx.dur(ms)              -> ms / k, for CSS transitions set from JS.
 *   ctx.on(target, type, fn, options)   addEventListener that is removed on close.
 *   ctx.loop(fn)             -> stop(). fn(dtScaled, dtReal) runs every frame; return false to stop.
 *   ctx.dispose()            stops everything (close() and finish() call it; games do not need to).
 *   ctx.animate(el, keyframes, { duration, easing, delay, fill }) -> Animation (Web Animations).
 *                            Duration is scaled by k. Under reduced motion every move becomes a 300 ms fade.
 *   ctx.land(el)             the shared landing spring: squash to scaleY .92 / scaleX 1.06, back in 350 ms.
 *   ctx.slideFrom(el, rect, ms)  el moves from where rect is (a box inside root) to where it really is, on the soft spring.
 *   ctx.popIn(el)            el springs up from 60% size (buttons, cards).
 *   ctx.onTap(el, fn)        fn once per tap (pointer down+up, or keyboard click); safe after touch drags.
 *   ctx.drag(el, opts)       drag OR tap on el (see reward_kit_drag.js): opts.enabled, zones, onTap, onDrop, onLift, onMove.
 *   ctx.spring               RewardKit.spring: .curve (the linear() spring string), .soft, .make(zeta, ms), .follow(opts).
 *   ctx.sound                soft sounds: plop, clink, bell, pop, pourStart, pourStop, swish, crunch, clipClop, neigh, creak
 *                            (silent when P.sound is off or no Web Audio).
 *   ctx.speak(text)          says a line through opts.speak (never awaited by the game flow); the line is also kept
 *                            in root.dataset.lines ("a|b|c") for the tests.
 *   ctx.hint(getEl)          after 5.5 s with no touch, a soft pointing hand bobs over getEl(); any touch hides it
 *                            and restarts the 5.5 s. ctx.hint(null) turns hints off.
 *   ctx.doneButton(finish, parent?) the big Done button springs up; tapping it calls finish().
 *   ctx.rect(el)             el's box inside root: { left, top, width, height }.
 * Rules for every game: nothing plays itself (only the reaction after the child's last action), no timers that fail,
 * no wrong moves, no flashing or shaking, gains below 0.1, all art drawn in code, colours never pure white or black.
 */
(function () {
  "use strict";

  var legacy = window.RewardGames && !window.RewardGames.__rw ? window.RewardGames : null;
  var kit = window.RewardKit || {};
  var games = {};
  var turn = {};
  var active = null;
  var legacyActive = false;
  var HINT_MS = 5500;

  function reducedMotion() {
    try { return !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches); } catch (e) { return false; }
  }
  function make(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) { e.className = cls; }
    if (html != null) { e.innerHTML = html; }
    return e;
  }

  var HAND = '<svg viewBox="0 0 64 72" aria-hidden="true">' +
    '<defs><linearGradient id="rw_hand_g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff4ea"/><stop offset="1" stop-color="#f6d6c4"/></linearGradient></defs>' +
    '<ellipse cx="34" cy="68" rx="16" ry="3.5" fill="rgba(87,54,54,.16)"/>' +
    '<path d="M24 6 C24 1 32 1 32 6 L32 30 C33 26 40 26 40 31 C41 27 48 27 48 33 C49 30 56 31 56 37 L56 50 C56 61 48 66 38 66 C28 66 22 61 18 54 L9 40 C6 35 12 31 16 35 L24 43 Z" ' +
    'fill="url(#rw_hand_g)" stroke="#3b2a33" stroke-width="3.2" stroke-linejoin="round"/>' +
    '<path d="M32 30 L32 40 M40 31 L40 41 M48 33 L48 42" stroke="#c99a8a" stroke-width="2.4" stroke-linecap="round"/>' +
    '<ellipse cx="27.5" cy="9" rx="2" ry="3" fill="#fffaf3" opacity=".7"/></svg>';
  var CHECK = '<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="17" fill="#e3f6f0" stroke="#2f5f4f" stroke-width="3"/>' +
    '<path d="M11 21 L17.5 27 L29 14" fill="none" stroke="#2f8a73" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  /* ------------------------------------------------------------------ the run context */
  function makeContext(opts) {
    var fast = !!opts.fast;
    var k = fast ? 5 : 1;
    var reduced = reducedMotion();
    var timers = [];
    var offs = [];
    var frames = [];
    var anims = [];
    var closed = false;
    var root = make("div", "rw-root rw-" + opts.theme);
    root.style.setProperty("--s", fast ? "0.2" : "1");
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-label", opts.label || "Reward game");
    root.dataset.lines = "";
    var layer = make("div", "rw-layer");
    var sound = kit.sound ? kit.sound.make() : { plop: noop, clink: noop, bell: noop, pop: noop, pourStart: noop, pourStop: noop, swish: noop, crunch: noop, clipClop: noop, neigh: noop, creak: noop, stopAll: noop };
    var hintGet = null;
    var hintTimer = 0;
    var hintEl = null;

    function noop() {}
    function wait(ms, fn) {
      return new Promise(function (resolve) {
        var id = setTimeout(function () {
          if (closed) { return; }
          if (fn) { fn(); }
          resolve();
        }, ms / k);
        timers.push(id);
      });
    }
    function rect(el) {
      var r = root.getBoundingClientRect();
      var b = el.getBoundingClientRect();
      return { left: b.left - r.left, top: b.top - r.top, width: b.width, height: b.height };
    }
    function animate(el, keyframes, o) {
      o = o || {};
      if (closed || !el || !el.animate) { return null; }
      var kf = keyframes;
      var duration = (o.duration || 350) / k;
      var easing = o.easing || "ease";
      if (reduced && !o.keep) {
        kf = [{ opacity: o.fadeFrom != null ? o.fadeFrom : 0.35 }, { opacity: 1 }];
        duration = 300 / k;
        easing = "ease";
      }
      try {
        var a = el.animate(kf, { duration: duration, easing: easing, delay: (o.delay || 0) / k, fill: o.fill || "none" });
        anims.push(a);
        return a;
      } catch (e) { return null; }
    }

    var ctx = {
      root: root,
      layer: layer,
      theme: opts.theme,
      fast: fast,
      k: k,
      reduced: reduced,
      auto: !!window.__rewardAutoPlay,
      spring: kit.spring,
      sound: sound,
      isClosed: function () { return closed; },
      wait: wait,
      dur: function (ms) { return ms / k; },
      rect: rect,
      on: function (target, type, fn, o) {
        target.addEventListener(type, fn, o);
        offs.push(function () { target.removeEventListener(type, fn, o); });
      },
      loop: function (fn) {
        var rec = { id: 0, on: true };
        var last = 0;
        function tick(now) {
          if (closed || !rec.on) { return; }
          var dt = last ? Math.min(0.1, (now - last) / 1000) : 0.016;
          last = now;
          if (fn(dt * k, dt) === false) { rec.on = false; return; }
          rec.id = requestAnimationFrame(tick);
        }
        rec.id = requestAnimationFrame(tick);
        frames.push(rec);
        return function () { rec.on = false; cancelAnimationFrame(rec.id); };
      },
      animate: animate,
      land: function (el) {
        return animate(el, [
          { transform: "scale(1.06,.92)" },
          { transform: "scale(1,1)" }
        ], { duration: 350, easing: kit.spring ? kit.spring.curve : "ease-out", fadeFrom: 0.6 });
      },
      slideFrom: function (el, from, ms) {
        var to = rect(el);
        var dx = (from.left + from.width / 2) - (to.left + to.width / 2);
        var dy = (from.top + from.height / 2) - (to.top + to.height / 2);
        var sc = to.width > 0 ? from.width / to.width : 1;
        return animate(el, [
          { transform: "translate(" + dx + "px," + dy + "px) scale(" + sc + ")" },
          { transform: "translate(0,0) scale(1)" }
        ], { duration: ms || 600, easing: kit.spring ? kit.spring.soft : "ease-out", fadeFrom: 0 });
      },
      popIn: function (el) {
        return animate(el, [
          { transform: "scale(.6)", opacity: 0 },
          { transform: "scale(1)", opacity: 1 }
        ], { duration: 450, easing: kit.spring ? kit.spring.curve : "ease-out", fadeFrom: 0 });
      },
      drag: function (el, o) { return kit.drag.attach(ctx, el, o); },
      /* fn runs once per tap on el: pointerdown + pointerup on it (Chrome can drop the click after a touch drag),
         or a keyboard click. Never twice for one tap. */
      onTap: function (el, fn) {
        var downAt = null;
        var lastFire = -1e9;
        function fire(e) {
          var now = Date.now();
          if (now - lastFire < 450) { return; }
          lastFire = now;
          fn(e);
        }
        ctx.on(el, "pointerdown", function (e) { downAt = { x: e.clientX, y: e.clientY }; });
        ctx.on(el, "pointerup", function (e) {
          if (downAt && Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) < 24) { fire(e); }
          downAt = null;
        });
        /* only keyboard clicks (detail 0): a pointer's own click could land on whatever the tap just revealed */
        ctx.on(el, "click", function (e) { if (e.detail === 0) { fire(e); } });
      },
      speak: function (text) {
        root.dataset.lines = root.dataset.lines ? root.dataset.lines + "|" + text : text;
        if (typeof opts.speak !== "function" || closed) { return; }
        try {
          var r = opts.speak(text);
          if (r && r.catch) { r.catch(noop); }
        } catch (e) {}
      },
      hint: function (getEl) {
        hintGet = getEl || null;
        restartHint();
      },
      doneButton: function (finish, parent) {
        var b = make("button", "rw-done", CHECK + "<span>Done</span>");
        b.type = "button";
        b.setAttribute("aria-label", "Done");
        (parent || root).appendChild(b);
        ctx.popIn(b);
        sound.pop();
        var used = false;
        ctx.onTap(b, function () { if (!used) { used = true; finish(); } });
        return b;
      },
      dispose: function () {
        closed = true;
        timers.forEach(clearTimeout);
        timers = [];
        clearTimeout(hintTimer);
        offs.forEach(function (f) { f(); });
        offs = [];
        frames.forEach(function (f) { f.on = false; cancelAnimationFrame(f.id); });
        frames = [];
        anims.forEach(function (a) { try { a.cancel(); } catch (e) {} });
        anims = [];
        sound.stopAll();
      }
    };

    /* ---- the idle hint: a soft hand after 5.5 s of no touch ---- */
    function hideHint() {
      if (hintEl && hintEl.parentNode) { hintEl.parentNode.removeChild(hintEl); }
      hintEl = null;
    }
    function showHint() {
      hideHint();
      if (closed || !hintGet) { return; }
      var t = hintGet();
      if (!t) { return; }
      var b = rect(t);
      if (b.width < 1) { return; }
      var size = Math.max(54, Math.min(84, b.width * 0.6));
      hintEl = make("div", "rw-hint", HAND);
      hintEl.style.cssText = "left:" + Math.round(b.left + b.width * 0.55) + "px;top:" + Math.round(b.top + b.height * 0.5) + "px;width:" + size + "px;height:" + Math.round(size * 72 / 64) + "px";
      layer.appendChild(hintEl);
      root.dataset.hint = "on";
    }
    function restartHint() {
      clearTimeout(hintTimer);
      hideHint();
      root.dataset.hint = "";
      if (closed || !hintGet) { return; }
      hintTimer = setTimeout(showHint, HINT_MS / k);
    }
    ctx.on(root, "pointerdown", restartHint, true);
    ctx.on(root, "keydown", restartHint, true);
    return ctx;
  }

  /* ------------------------------------------------------------------ registry */
  function register(theme, game, starter) {
    if (typeof game === "string") { game = { name: game, start: starter }; }
    if (!game || typeof game.start !== "function") { throw new Error("RewardGames.register needs { name, start }"); }
    if (!games[theme]) { games[theme] = []; turn[theme] = 0; }
    games[theme].push(game);
  }

  function close() {
    if (legacyActive && legacy) {
      legacyActive = false;
      try { legacy.close(); } catch (e) {}
    }
    if (!active) { return; }
    var a = active;
    active = null;
    a.ctx.dispose();
    if (a.ctx.root.parentNode) { a.ctx.root.parentNode.removeChild(a.ctx.root); }
    if (a.restore) { a.restore(); }
    a.resolve({ done: false, theme: a.theme, game: a.name });
  }

  function play(el, opts) {
    opts = opts || {};
    var theme = opts.theme === "castle" ? "castle" : "cafe";
    if (!el) { return Promise.reject(new Error("RewardGames.play needs a container element")); }
    close();
    var list = games[theme] || [];
    if (!list.length) {
      if (legacy) {
        legacyActive = true;
        return legacy.play(el, opts).then(function (r) { legacyActive = false; return r; }, function (e) { legacyActive = false; throw e; });
      }
      return Promise.reject(new Error("RewardGames: no game for theme " + theme));
    }
    var game = list[turn[theme] % list.length];
    turn[theme] += 1;
    var ctx = makeContext({ theme: theme, fast: opts.fast, speak: opts.speak, label: game.label });
    var restore = null;
    try {
      if (getComputedStyle(el).position === "static") {
        el.style.position = "relative";
        restore = function () { el.style.position = ""; };
      }
    } catch (e) { restore = null; }
    return new Promise(function (resolve, reject) {
      var rec = { ctx: ctx, resolve: resolve, restore: restore, theme: theme, name: game.name };
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
        ctx.root.appendChild(ctx.layer);
      } catch (err) {
        active = null;
        ctx.dispose();
        if (ctx.root.parentNode) { ctx.root.parentNode.removeChild(ctx.root); }
        if (restore) { restore(); }
        reject(err);
      }
    });
  }

  window.RewardGames = {
    __rw: true,
    play: play,
    close: close,
    register: register,
    themes: function () {
      var t = Object.keys(games);
      if (legacy) { legacy.themes().forEach(function (x) { if (t.indexOf(x) < 0) { t.push(x); } }); }
      return t;
    }
  };
})();
