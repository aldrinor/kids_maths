/* castle_extra_art.js - pictures, scenery and small helpers shared by Kennedy's two extra castle reward games
 * ("Goblin Rescue" = castle_goblin_rescue.js, "Tower for Kitty" = castle_kitty_tower.js). Load it after reward_core.js
 * and before those two files.
 *
 * window.CastleExtraArt
 *   load()            -> Promise; resolves when every listed picture has loaded (or failed), at most after 5 s.
 *   html(key)         an <img class="rw-pic"> for the picture, or a plain stand-in shape while a file is missing.
 *   set(el, key)      shows picture key inside el (keeps the same <img>, so a pose change never flickers).
 *   scenery(root)     adds the sky, hills and road (reused from art/castle/) behind the game;
 *                     returns { layout(W, H) -> { road, grass } } (road = y of the road's middle line, grass = y of the near grass edge).
 *   place(el, x, y, w, h), make(tag, cls, html)
 *   arc(ctx, el, from, to, ms, lift)  el is placed at box `to`, then flies there from box `from` in an arc `lift` px high.
 *   puff(ctx, x, y, size, key)        a sparkle (or key "heart") that rises and fades at x,y (in ctx.layer).
 * Pictures: new ones are drawn by tools/draw_castle_extra_art.py into art/castle_extra/ (its own manifest.json);
 * reused ones come from art/castle/ (drawn by tools/draw_castle_art.py). A picture is requested only when its
 * folder's manifest lists it, so a missing file never makes a 404.
 */
(function () {
  "use strict";

  var NEW = "knight_sword knight_bop knight_sword_cheer buddy_cheer goblin_a_silly goblin_a_oops goblin_a_run goblin_b_silly goblin_b_oops " +
    "goblin_b_run goblin_c_silly goblin_c_oops goblin_c_run cage_back cage_front cage_door cage_lock cage_key tower_block_1 tower_block_2 " +
    "tower_block_3 tower_block_4 tower_base cart kitten_stuck kitten_happy kitten_hop";
  var OLD = { knight_idle: "knight_idle", knight_cheer: "knight_cheer", buddy_wave: "buddy_wave", tree: "apple_tree", far: "path_far",
    mid: "path_mid", near: "path_near", sparkle: "sparkle", heart: "heart" };
  var here = (function () {
    try { return new URL(".", document.currentScript.src).href; } catch (e) { return "rewards/"; }
  })();
  var DIRS = { castle_extra: here + "art/castle_extra/", castle: here + "art/castle/" };
  var FILES = {};
  NEW.split(" ").forEach(function (k) { FILES[k] = { dir: "castle_extra", file: k + ".png" }; });
  Object.keys(OLD).forEach(function (k) { FILES[k] = { dir: "castle", file: OLD[k] + ".png" }; });

  var ready = {};
  var promise = null;
  function load() {
    if (promise) { return promise; }
    promise = new Promise(function (resolve) {
      setTimeout(resolve, 5000);
      if (!window.fetch) { resolve(); return; }
      var dirs = Object.keys(DIRS);
      Promise.all(dirs.map(function (d) {
        return fetch(DIRS[d] + "manifest.json").then(function (r) { return r.ok ? r.json() : { files: [] }; }).catch(function () { return { files: [] }; });
      })).then(function (lists) {
        var have = {};
        dirs.forEach(function (d, i) { have[d] = (lists[i] && lists[i].files) || []; });
        var keys = Object.keys(FILES).filter(function (k) { return have[FILES[k].dir].indexOf(FILES[k].file) >= 0; });
        var left = keys.length;
        if (!left) { resolve(); return; }
        keys.forEach(function (k) {
          var img = new Image();
          var url = DIRS[FILES[k].dir] + FILES[k].file;
          img.onload = function () { ready[k] = url; left -= 1; if (!left) { resolve(); } };
          img.onerror = function () { left -= 1; if (!left) { resolve(); } };
          img.src = url;
        });
      });
    });
    return promise;
  }

  var INK = "#563832";
  function blob(color, r) {
    return '<svg viewBox="0 0 100 100" aria-hidden="true"><ellipse cx="50" cy="55" rx="' + (r * 100) + '" ry="' + (r * 90) + '" fill="' + color + '" stroke="' + INK + '" stroke-width="5"/></svg>';
  }
  /* stand-ins while a picture file is missing (KnightArt draws the knight and buddy if it is loaded) */
  function plain(key) {
    var K = window.KnightArt;
    if (/^knight_/.test(key)) { return K ? K.full("knight", /cheer/.test(key) ? "cheer" : "stand", { plume: true }) : blob("#5b8cf2", 0.4); }
    if (/^buddy_/.test(key)) { return K ? K.full("buddy", /cheer/.test(key) ? "cheer" : "wave") : blob("#62c987", 0.4); }
    if (/^goblin_/.test(key)) { return blob("#a6d67f", 0.42); }
    if (/^kitten_/.test(key)) { return blob("#f6b46e", 0.4); }
    if (/^tower_block/.test(key) || key === "tower_base") { return '<svg viewBox="0 0 400 240" aria-hidden="true"><rect x="30" y="40" width="340" height="160" rx="10" fill="#b3bcc8" stroke="' + INK + '" stroke-width="5"/></svg>'; }
    if (key === "cage_back" || key === "cage_door") { return ""; }
    if (key === "cage_front") { return '<svg viewBox="0 0 600 560" aria-hidden="true"><rect x="40" y="120" width="520" height="410" rx="12" fill="none" stroke="#b07a4a" stroke-width="18"/></svg>'; }
    if (key === "cage_lock" || key === "cage_key") { return blob("#f3c650", 0.36); }
    if (key === "cart") { return blob("#b07a4a", 0.42); }
    if (key === "tree") { return '<svg viewBox="0 0 600 760" aria-hidden="true"><rect x="270" y="420" width="60" height="320" rx="20" fill="#b07a4a" stroke="' + INK + '" stroke-width="6"/><ellipse cx="300" cy="270" rx="270" ry="230" fill="#79c06e" stroke="' + INK + '" stroke-width="6"/></svg>'; }
    if (key === "sparkle" || key === "heart") { return blob(key === "heart" ? "#ee7f9c" : "#ffe9a8", 0.45); }
    return "";
  }
  function html(key) {
    return ready[key] ? '<img class="rw-pic" alt="" draggable="false" src="' + ready[key] + '">' : plain(key);
  }
  function set(el, key) {
    if (el.dataset.pic === key) { return; }
    el.dataset.pic = key;
    var img = el.querySelector("img.rw-pic");
    if (ready[key] && img) { img.src = ready[key]; return; }
    el.innerHTML = html(key);
  }
  function make(tag, cls, inner) {
    var e = document.createElement(tag);
    if (cls) { e.className = cls; }
    if (inner != null) { e.innerHTML = inner; }
    return e;
  }
  function place(el, x, y, w, h) {
    el.style.left = Math.round(x) + "px";
    el.style.top = Math.round(y) + "px";
    el.style.width = Math.round(w) + "px";
    el.style.height = Math.round(h) + "px";
  }

  /* the sky with mountains, the far hills and the road with flowers: still pictures, no camera */
  function scenery(root) {
    var box = make("div", "rw-cx-scene");
    box.setAttribute("aria-hidden", "true");
    box.innerHTML = '<div class="rw-cx-far">' + html("far") + '</div><div class="rw-cx-mid">' + html("mid") + '</div><div class="rw-cx-near">' + html("near") + "</div>";
    root.insertBefore(box, root.firstChild);
    var far = box.children[0];
    var mid = box.children[1];
    var near = box.children[2];
    return {
      layout: function (W, H) {
        var nh = Math.max(H * 0.3, W / 10 * 0.9);
        place(far, 0, 0, W, H);
        place(mid, 0, H - nh * 0.55 - H * 0.42, W, H * 0.42);
        place(near, 0, H - nh, W, nh);
        /* the near picture is scaled to its box height (object-fit: cover), so its road line sits at 178 / 360 of it */
        var scale = Math.max(nh / 360, W / 3600);
        var top = H - nh + (nh - 360 * scale);
        return { road: top + 178 * scale, grass: top + 60 * scale };
      }
    };
  }

  function arc(ctx, el, from, to, ms, lift) {
    place(el, to.x, to.y, to.w, to.h);
    var dx = (from.x + from.w / 2) - (to.x + to.w / 2);
    var dy = (from.y + from.h / 2) - (to.y + to.h / 2);
    var sc = to.w > 0 ? from.w / to.w : 1;
    var mx = dx * 0.5;
    var my = Math.min(dy, 0) - (lift || 0);  /* the top of the arc: `lift` above the higher of the two points */
    return ctx.animate(el, [
      { transform: "translate(" + dx.toFixed(1) + "px," + dy.toFixed(1) + "px) scale(" + sc.toFixed(3) + ")", easing: "ease-out" },
      { transform: "translate(" + mx.toFixed(1) + "px," + my.toFixed(1) + "px) scale(" + ((sc + 1) / 2).toFixed(3) + ")", offset: 0.45, easing: "ease-in" },
      { transform: "translate(0,0) scale(1)" }
    ], { duration: ms || 800, fadeFrom: 0 });
  }

  function puff(ctx, x, y, size, key) {
    var e = make("div", "rw-cx-puff", html(key || "sparkle"));
    place(e, x - size / 2, y - size / 2, size, size);
    ctx.layer.appendChild(e);
    var heart = key === "heart";
    ctx.animate(e, [
      { opacity: 0, transform: "translateY(6px) scale(.6)" },
      { opacity: 1, transform: "translateY(-4px) scale(1)", offset: 0.35 },
      { opacity: 0, transform: "translateY(-" + Math.round(size * 0.9) + "px) scale(1)" }
    ], { duration: heart ? 1600 : 1100, easing: "ease-out", fill: "forwards", fadeFrom: 0 });
    ctx.wait(heart ? 1650 : 1150, function () { if (e.parentNode) { e.parentNode.removeChild(e); } });
  }

  window.CastleExtraArt = { load: load, html: html, set: set, scenery: scenery, place: place, make: make, arc: arc, puff: puff };
  load();
})();
