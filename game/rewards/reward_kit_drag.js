/* reward_kit_drag.js - drag OR tap for the reward games (Kids Maths).
 *
 * window.RewardKit.drag.attach(ctx, el, opts) -> { cancel() }
 *   One pointer path for mouse, pen and touch (pointer events + setPointerCapture).
 *   - A press that moves less than 6 px is a TAP: opts.onTap(point) runs.
 *   - A press that moves 6 px or more is a DRAG: a copy of el (the "ghost") lifts out (8% bigger, its shadow moves out)
 *     and follows the finger in ctx.layer. el itself is hidden while it is away.
 *     On release the nearest drop zone that is hit wins:
 *       a zone is hit when the finger is inside the zone's box grown 1.6x, or within opts.snap px (default 90) of its centre.
 *     opts.onDrop(zone, point, ghostRect) returns true to accept; otherwise (or with no zone hit) the ghost floats home in 400 ms.
 *   - Keyboard (Enter / Space on a <button>) counts as a tap.
 * opts:
 *   enabled()          -> false ignores the press (the tool is not for this step)
 *   zones()            -> array of { el, id } (or { rect: DOMRect, id }) the ghost can be dropped on
 *   onTap(point), onDrop(zone, point, ghostRect), onLift(), onMove(point, zoneOrNull), onHome()
 *   snap               -> snap radius in px (default 90)
 * point = { x, y } in px inside ctx.root. Zones are found by measuring, not by elementFromPoint (the ghost covers the point).
 */
(function () {
  "use strict";

  var START_PX = 6;
  var GROW = 1.6;

  function rel(ctx, x, y) {
    var r = ctx.root.getBoundingClientRect();
    return { x: x - r.left, y: y - r.top };
  }
  function relRect(ctx, el) {
    var r = ctx.root.getBoundingClientRect();
    var b = el.getBoundingClientRect();
    return { left: b.left - r.left, top: b.top - r.top, width: b.width, height: b.height };
  }
  function hitZone(ctx, zones, p, snap) {
    var best = null;
    var bestD = Infinity;
    (zones || []).forEach(function (z) {
      var b = z.rect || (z.el ? relRect(ctx, z.el) : null);
      if (!b || b.width < 1) { return; }
      var cx = b.left + b.width / 2;
      var cy = b.top + b.height / 2;
      var inGrown = Math.abs(p.x - cx) <= b.width * GROW / 2 && Math.abs(p.y - cy) <= b.height * GROW / 2;
      var d = Math.hypot(p.x - cx, p.y - cy);
      if ((inGrown || d <= snap) && d < bestD) { best = z; bestD = d; }
    });
    return best;
  }

  function attach(ctx, el, opts) {
    opts = opts || {};
    var snap = opts.snap || 90;
    var press = null;
    var ghost = null;
    var home = null;
    var grab = null;
    var lastZone = null;

    el.style.touchAction = "none";

    function enabled() { return !opts.enabled || opts.enabled(); }
    function lift(p) {
      home = relRect(ctx, el);
      grab = { x: p.x - home.left, y: p.y - home.top };
      ghost = el.cloneNode(true);
      ghost.removeAttribute("id");
      ghost.setAttribute("aria-hidden", "true");
      ghost.className = (el.getAttribute("class") || "") + " rw-ghost";
      ghost.style.cssText = "position:absolute;margin:0;left:" + home.left + "px;top:" + home.top + "px;width:" + home.width + "px;height:" + home.height + "px";
      ctx.layer.appendChild(ghost);
      el.classList.add("rw-away");
      if (opts.onLift) { opts.onLift(); }
    }
    function moveGhost(p) {
      var dx = p.x - grab.x - home.left;
      var dy = p.y - grab.y - home.top;
      ghost.style.transform = "translate(" + dx.toFixed(1) + "px," + dy.toFixed(1) + "px) scale(1.08)";
    }
    function dropGhost() {
      if (ghost && ghost.parentNode) { ghost.parentNode.removeChild(ghost); }
      ghost = null;
      el.classList.remove("rw-away");
    }
    function floatHome() {
      var g = ghost;
      ghost = null;
      if (!g) { return; }
      g.classList.add("rw-ghost-home");
      g.style.transition = "transform " + ctx.dur(400) + "ms cubic-bezier(.3,.7,.4,1)";
      /* force the start position before the move home */
      void g.offsetWidth;
      g.style.transform = "translate(0px,0px) scale(1)";
      ctx.wait(400, function () {
        if (g.parentNode) { g.parentNode.removeChild(g); }
        el.classList.remove("rw-away");
        if (opts.onHome) { opts.onHome(); }
      });
    }

    ctx.on(el, "pointerdown", function (e) {
      if (press || !enabled()) { return; }
      if (e.button !== undefined && e.button > 0) { return; }
      e.preventDefault();
      try { el.setPointerCapture(e.pointerId); } catch (err) {}
      press = { id: e.pointerId, start: rel(ctx, e.clientX, e.clientY), dragging: false };
    });
    ctx.on(el, "pointermove", function (e) {
      if (!press || e.pointerId !== press.id) { return; }
      var p = rel(ctx, e.clientX, e.clientY);
      if (!press.dragging) {
        if (Math.hypot(p.x - press.start.x, p.y - press.start.y) < START_PX) { return; }
        press.dragging = true;
        lift(press.start);
      }
      moveGhost(p);
      var z = hitZone(ctx, opts.zones ? opts.zones() : [], p, snap);
      if (z !== lastZone) {
        if (lastZone && lastZone.el) { lastZone.el.classList.remove("rw-over"); }
        if (z && z.el) { z.el.classList.add("rw-over"); }
        lastZone = z;
      }
      if (opts.onMove) { opts.onMove(p, z); }
    });
    function end(e, cancelled) {
      if (!press || e.pointerId !== press.id) { return; }
      var was = press;
      press = null;
      try { el.releasePointerCapture(e.pointerId); } catch (err) {}
      if (lastZone && lastZone.el) { lastZone.el.classList.remove("rw-over"); }
      lastZone = null;
      var p = rel(ctx, e.clientX, e.clientY);
      if (!was.dragging) {
        if (!cancelled && enabled() && opts.onTap) { opts.onTap(p); }
        return;
      }
      var z = cancelled ? null : hitZone(ctx, opts.zones ? opts.zones() : [], p, snap);
      var gr = ghost ? relRect(ctx, ghost) : null;
      if (z && enabled() && opts.onDrop && opts.onDrop(z, p, gr) === true) {
        dropGhost();
      } else {
        floatHome();
      }
    }
    ctx.on(el, "pointerup", function (e) { end(e, false); });
    ctx.on(el, "pointercancel", function (e) { end(e, true); });
    ctx.on(el, "lostpointercapture", function (e) { if (press && press.dragging) { end(e, false); } });
    /* keyboard: a click with detail 0 comes from Enter or Space, never from a pointer */
    ctx.on(el, "click", function (e) {
      if (e.detail === 0 && enabled() && opts.onTap) { opts.onTap(null); }
    });
    return {
      cancel: function () { press = null; if (ghost) { dropGhost(); } }
    };
  }

  var kit = window.RewardKit = window.RewardKit || {};
  kit.drag = { attach: attach, hitZone: hitZone, relRect: relRect };
})();
