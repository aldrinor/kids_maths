/* reward_kit_spring.js - the one shared spring for the reward games (Kids Maths).
 *
 * window.RewardKit.spring:
 *   .curve            -> the shared CSS easing: a linear() spring curve (or a cubic-bezier fallback
 *                        on old browsers). Used for every landing and every slide.
 *   .soft             -> a gentler curve (more damping) for big moves such as a cup sliding in.
 *   .make(zeta, ms)   -> build a linear() spring string with damping ratio zeta over ms milliseconds.
 *   .follow(opts)     -> a small JS spring that chases a target value, for things that follow a finger.
 *                        opts = { value, stiffness, damping, onUpdate(v) }. Returns { set(target), step(dt), value() }.
 * No library. Loads before reward_core.js.
 */
(function () {
  "use strict";

  var FALLBACK = "cubic-bezier(.34,1.45,.64,1)";
  var FALLBACK_SOFT = "cubic-bezier(.25,1.15,.5,1)";

  function supportsLinear() {
    try { return !!(window.CSS && CSS.supports && CSS.supports("animation-timing-function", "linear(0, 0.5 50%, 1)")); } catch (e) { return false; }
  }

  /* A damped spring that starts at 0 and settles at 1, sampled into a CSS linear() list.
     zeta < 1 overshoots a little; zeta = 1 has no overshoot. */
  function make(zeta, ms) {
    if (!supportsLinear()) { return zeta >= 0.8 ? FALLBACK_SOFT : FALLBACK; }
    var T = (ms || 350) / 1000;
    /* pick the natural frequency so the spring has settled (within 0.5%) by the end */
    var w0 = zeta < 1 ? 5.3 / (zeta * T) : 7.4 / T;
    var wd = w0 * Math.sqrt(Math.max(1e-6, 1 - zeta * zeta));
    var pts = [];
    var N = 28;
    for (var i = 0; i <= N; i += 1) {
      var t = (i / N) * T;
      var v;
      if (zeta < 1) {
        v = 1 - Math.exp(-zeta * w0 * t) * (Math.cos(wd * t) + (zeta * w0 / wd) * Math.sin(wd * t));
      } else {
        v = 1 - Math.exp(-w0 * t) * (1 + w0 * t);
      }
      if (i === N) { v = 1; }
      pts.push(v.toFixed(4));
    }
    return "linear(" + pts.join(", ") + ")";
  }

  /* A JS spring that chases a target (critically damped by default). Time step in seconds. */
  function follow(opts) {
    opts = opts || {};
    var x = opts.value || 0;
    var v = 0;
    var target = x;
    var k = opts.stiffness || 170;
    var c = opts.damping || 2 * Math.sqrt(k);
    return {
      set: function (t) { target = t; },
      value: function () { return x; },
      jump: function (t) { x = t; target = t; v = 0; if (opts.onUpdate) { opts.onUpdate(x); } },
      step: function (dt) {
        var left = Math.min(dt, 0.1);
        while (left > 0) {
          var d = Math.min(left, 1 / 120);
          var a = -k * (x - target) - c * v;
          v += a * d;
          x += v * d;
          left -= d;
        }
        if (opts.onUpdate) { opts.onUpdate(x); }
        return Math.abs(x - target) > 0.001 || Math.abs(v) > 0.001;
      }
    };
  }

  var kit = window.RewardKit = window.RewardKit || {};
  kit.spring = {
    curve: make(0.55, 350),
    soft: make(0.8, 600),
    make: make,
    follow: follow
  };
})();
