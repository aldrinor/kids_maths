/* reward_kit_sound.js - soft Web Audio sounds for the reward games (Kids Maths).
 *
 * window.RewardKit.sound.make() -> a sound set:
 *   plop()          a sine note sliding 520 -> 300 Hz in 90 ms (something lands)
 *   clink()         a short glass-like ping (a spoon in a cup)
 *   bell()          two soft bell notes (serve)
 *   pop()           a tiny high note (a button appears)
 *   pourStart()     soft bubbling while the milk pours; pourStop() ends it
 *   stopAll()       stops every running sound (RewardGames.close() calls it)
 * Rules: every gain stays at or below 0.1. Respects the page's P.sound (off = silent).
 * Reuses the page's AudioContext "actx" when it exists (the same lookup as modules/cook.js), otherwise makes one.
 * When there is no Web Audio (tests stub it out) every call quietly does nothing.
 */
(function () {
  "use strict";

  var MAX_GAIN = 0.1;
  var own = null;

  function soundOn() {
    /* P is the page's profile (a top-level "let" in game/index.html), not a window property */
    try { return typeof P === "undefined" || !P || P.sound !== false; } catch (e) { return true; }
  }
  function audio() {
    try { if (typeof actx !== "undefined" && actx) { return actx; } } catch (e) {}
    if (own) { return own; }
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) { return null; }
    try { own = new AC(); } catch (e) { own = null; }
    return own;
  }

  function make() {
    var live = [];
    var pourTimer = 0;

    function ready() {
      if (!soundOn()) { return null; }
      var a = audio();
      if (!a) { return null; }
      try { if (a.state === "suspended") { a.resume(); } } catch (e) {}
      return a;
    }
    /* one soft note: freq slides from f0 to f1, gain rises in 8 ms and fades out */
    function note(f0, f1, start, dur, gain, type) {
      var a = ready();
      if (!a) { return; }
      try {
        var t = a.currentTime + (start || 0);
        var o = a.createOscillator();
        var g = a.createGain();
        o.type = type || "sine";
        o.frequency.setValueAtTime(f0, t);
        if (f1 && f1 !== f0) { o.frequency.exponentialRampToValueAtTime(f1, t + dur); }
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(Math.min(gain, MAX_GAIN), t + 0.008);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g);
        g.connect(a.destination);
        o.start(t);
        o.stop(t + dur + 0.03);
        live.push(o);
        o.onended = function () { var i = live.indexOf(o); if (i >= 0) { live.splice(i, 1); } };
      } catch (e) {}
    }

    var set = {
      plop: function () { note(520, 300, 0, 0.09, 0.08); },
      clink: function () { note(1760, 1700, 0, 0.18, 0.035, "triangle"); note(2640, 2600, 0.01, 0.12, 0.015); },
      bell: function () { note(1047, 1047, 0, 0.55, 0.06); note(1319, 1319, 0.16, 0.7, 0.06); },
      pop: function () { note(660, 880, 0, 0.08, 0.04, "triangle"); },
      /* soft bubbling: small low sine bloops while she holds the jug (calmer than hiss) */
      pourStart: function () {
        if (pourTimer || !ready()) { return; }
        var n = 0;
        function bloop() {
          n += 1;
          note(300 + (n * 53) % 160, 420 + (n * 71) % 200, 0, 0.11, 0.035);
        }
        bloop();
        pourTimer = setInterval(bloop, 170);
      },
      pourStop: function () { if (pourTimer) { clearInterval(pourTimer); pourTimer = 0; } },
      stopAll: function () {
        set.pourStop();
        live.slice().forEach(function (o) { try { o.stop(); } catch (e) {} });
        live = [];
      }
    };
    return set;
  }

  var kit = window.RewardKit = window.RewardKit || {};
  kit.sound = { make: make, on: soundOn };
})();
