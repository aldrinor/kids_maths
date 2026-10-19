/* characters.js — full-body chibi characters for Marie's Kitty World.
 * Our OWN fan drawings (no Sanrio artwork is used or copied).
 *
 * API (window.KittyChars):
 *   KittyChars.full(id, pose)  -> "<svg ...>" string, viewBox 0 0 200 260,
 *                                feet on y = 255, centred on x = 100.
 *                                id:   kitty | melody | kuromi | purin | cinna
 *                                pose: stand | wave | sit | held | happy | bath | walk | eat | eatsit | sleep | five_r | five_l | hug
 *                                opts (optional): { eyes: open | happy | closed | wink | sleepy | surprised | sad } changes the face only
 *   KittyChars.face(id, opts)  -> head-only <svg> (viewBox -9 -3 118 106, so long ears are not cut off).
 *   KittyChars.headInner(id, opts) -> head markup (with its own <defs>) in a 100 x 100 box,
 *                                to embed inside another SVG with <g transform>.
 *                                opts.eyes: "open" (default) | "happy" | "closed"
 *   KittyChars.css             -> CSS text for idle animations (inject once into a <style>).
 *   KittyChars.injectCss()     -> adds that <style> to <head> once.
 *   KittyChars.anchors         -> { foot:{x,y}, sitHip:{x,y}, holdPoint:{x,y} } in the 200 x 260 box.
 *   KittyChars.ids, KittyChars.poses, KittyChars.names
 *
 * Animated parts carry classes: .kc-body (breathing), .kc-eyes (blinking),
 * .kc-arm-l / .kc-arm-r (wave), .kc-leg-l / .kc-leg-r (dangle when held), .kc-jump (happy hop).
 * All motion is switched off under prefers-reduced-motion.
 */
(function () {
  "use strict";

  var INK = "#3b2a33";
  var IDS = ["kitty", "melody", "kuromi", "purin", "cinna"];
  var POSES = ["stand", "wave", "sit", "held", "happy", "bath", "walk", "eat", "eatsit", "sleep", "five_r", "five_l", "hug"];
  var EYES = ["open", "happy", "closed", "wink", "sleepy", "surprised", "sad"];
  var NAMES = { kitty: "Hello Kitty", melody: "My Melody", kuromi: "Kuromi", purin: "Pompompurin", cinna: "Cinnamoroll" };

  /* Head placement inside the 200 x 260 body box: the 100 x 100 head is scaled 1.42 and centred. */
  var HEAD_SCALE = 1.5;
  var HEAD_X = 100 - 50 * HEAD_SCALE; /* 29 */
  var HEAD_Y = 8;
  /* Outline: 4.6 user units on the body; the head is scaled, so its stroke is divided by the scale. */
  var SW = 4.6;
  var HEAD_SW = SW / HEAD_SCALE;

  var counter = 0;
  function nextPrefix() { counter += 1; return "kc" + counter + "_"; }

  function radial(id, stops, cx, cy, r) {
    return '<radialGradient id="' + id + '" cx="' + (cx || "38%") + '" cy="' + (cy || "30%") + '" r="' + (r || "80%") + '">' +
      stops.map(function (s) { return '<stop offset="' + s[0] + '" stop-color="' + s[1] + '"/>'; }).join("") + "</radialGradient>";
  }

  /* One set of gradients per drawing, with a unique prefix, so many characters on one page never clash. */
  function defs(p) {
    return "<defs>" +
      radial(p + "fur", [[0, "#ffffff"], [0.72, "#fdf7fa"], [1, "#ead9e2"]]) +
      radial(p + "furGold", [[0, "#fff3bf"], [0.65, "#ffd66b"], [1, "#e8ad3c"]]) +
      radial(p + "hoodPink", [[0, "#ffc8de"], [1, "#ff86b5"]]) +
      radial(p + "hoodBlack", [[0, "#5e4e68"], [1, "#241b2a"]]) +
      radial(p + "nose", [[0, "#ffe680"], [1, "#f2a900"]], "35%", "30%", "70%") +
      radial(p + "denim", [[0, "#6fb2f2"], [1, "#2a6fc4"]]) +
      radial(p + "shirt", [[0, "#fff1a6"], [1, "#ffc928"]]) +
      radial(p + "dress", [[0, "#ffd3e5"], [0.6, "#ff9cc4"], [1, "#f27aab"]]) +
      radial(p + "beret", [[0, "#b98250"], [1, "#7a4d24"]]) +
      radial(p + "ear", [[0, "#c79052"], [1, "#94622c"]]) +
      "</defs>";
  }

  function st(sw) { return 'stroke="' + INK + '" stroke-width="' + sw + '" stroke-linejoin="round" stroke-linecap="round"'; }

  /* ------------------------------------------------------------------ heads (100 x 100 local box) */
  function eyePair(y, rx, ry, colour, sw, mode, gap) {
    var lx = 50 - (gap || 12), rx2 = 50 + (gap || 12);
    if (mode === "happy") {
      return '<g class="kc-eyes-shut" fill="none" stroke="' + INK + '" stroke-width="' + (sw * 0.95) + '" stroke-linecap="round">' +
        '<path d="M' + (lx - 5) + " " + (y + 1.5) + " Q" + lx + " " + (y - 5.5) + " " + (lx + 5) + " " + (y + 1.5) + '"/>' +
        '<path d="M' + (rx2 - 5) + " " + (y + 1.5) + " Q" + rx2 + " " + (y - 5.5) + " " + (rx2 + 5) + " " + (y + 1.5) + '"/></g>';
    }
    if (mode === "wink") {
      return '<g class="kc-eyes-shut" fill="none" stroke="' + INK + '" stroke-width="' + (sw * 0.95) + '" stroke-linecap="round">' +
        '<path d="M' + (lx - 5) + " " + (y + 1.5) + " Q" + lx + " " + (y - 5.5) + " " + (lx + 5) + " " + (y + 1.5) + '"/></g>' +
        '<g class="kc-eyes"><ellipse cx="' + rx2 + '" cy="' + y + '" rx="' + rx + '" ry="' + ry + '" fill="' + colour + '"/>' +
        '<circle cx="' + (rx2 + rx * 0.35) + '" cy="' + (y - ry * 0.38) + '" r="' + (rx * 0.38) + '" fill="#fff"/></g>';
    }
    if (mode === "sleepy") {
      return '<g fill="' + colour + '">' +
        '<path d="M' + (lx - rx) + " " + y + " A" + rx + " " + (ry * 0.6) + " 0 0 0 " + (lx + rx) + " " + y + ' Z"/>' +
        '<path d="M' + (rx2 - rx) + " " + y + " A" + rx + " " + (ry * 0.6) + " 0 0 0 " + (rx2 + rx) + " " + y + ' Z"/></g>' +
        '<path d="M' + (lx - rx - 1.5) + " " + y + " H" + (lx + rx + 1.5) + " M" + (rx2 - rx - 1.5) + " " + y + " H" + (rx2 + rx + 1.5) + '" stroke="' + INK + '" stroke-width="' + (sw * 0.8) + '" stroke-linecap="round"/>';
    }
    if (mode === "surprised") {
      var R = rx * 1.3, RY = ry * 1.22;
      return '<g class="kc-eyes">' +
        '<ellipse cx="' + lx + '" cy="' + y + '" rx="' + R + '" ry="' + RY + '" fill="' + colour + '"/>' +
        '<ellipse cx="' + rx2 + '" cy="' + y + '" rx="' + R + '" ry="' + RY + '" fill="' + colour + '"/>' +
        '<circle cx="' + (lx + R * 0.3) + '" cy="' + (y - RY * 0.35) + '" r="' + (R * 0.42) + '" fill="#fff"/>' +
        '<circle cx="' + (rx2 + R * 0.3) + '" cy="' + (y - RY * 0.35) + '" r="' + (R * 0.42) + '" fill="#fff"/></g>' +
        '<path d="M' + (lx - 5) + " " + (y - RY - 4) + " Q" + lx + " " + (y - RY - 8) + " " + (lx + 5) + " " + (y - RY - 4) +
        " M" + (rx2 - 5) + " " + (y - RY - 4) + " Q" + rx2 + " " + (y - RY - 8) + " " + (rx2 + 5) + " " + (y - RY - 4) + '" fill="none" stroke="' + INK + '" stroke-width="' + (sw * 0.6) + '" stroke-linecap="round"/>';
    }
    if (mode === "sad") {
      return eyePair(y, rx, ry * 0.9, colour, sw, "open", gap) +
        '<path d="M' + (lx - 6) + " " + (y - ry - 3) + " L" + (lx + 4) + " " + (y - ry - 6) + " M" + (rx2 + 6) + " " + (y - ry - 3) + " L" + (rx2 - 4) + " " + (y - ry - 6) + '" fill="none" stroke="' + INK + '" stroke-width="' + (sw * 0.6) + '" stroke-linecap="round"/>';
    }
    if (mode === "closed") {
      return '<g class="kc-eyes-shut" fill="none" stroke="' + INK + '" stroke-width="' + (sw * 0.95) + '" stroke-linecap="round">' +
        '<path d="M' + (lx - 5) + " " + y + " Q" + lx + " " + (y + 4) + " " + (lx + 5) + " " + y + '"/>' +
        '<path d="M' + (rx2 - 5) + " " + y + " Q" + rx2 + " " + (y + 4) + " " + (rx2 + 5) + " " + y + '"/></g>';
    }
    return '<g class="kc-eyes">' +
      '<ellipse cx="' + lx + '" cy="' + y + '" rx="' + rx + '" ry="' + ry + '" fill="' + colour + '"/>' +
      '<ellipse cx="' + rx2 + '" cy="' + y + '" rx="' + rx + '" ry="' + ry + '" fill="' + colour + '"/>' +
      '<circle cx="' + (lx + rx * 0.35) + '" cy="' + (y - ry * 0.38) + '" r="' + (rx * 0.38) + '" fill="#fff"/>' +
      '<circle cx="' + (rx2 + rx * 0.35) + '" cy="' + (y - ry * 0.38) + '" r="' + (rx * 0.38) + '" fill="#fff"/></g>';
  }
  function blush(y, dx, op) {
    return '<ellipse cx="' + (50 - dx) + '" cy="' + y + '" rx="6.5" ry="3.8" fill="#ff8fb4" opacity="' + (op || 0.55) + '"/>' +
      '<ellipse cx="' + (50 + dx) + '" cy="' + y + '" rx="6.5" ry="3.8" fill="#ff8fb4" opacity="' + (op || 0.55) + '"/>';
  }
  function flower(x, y, scale) {
    var petals = [0, 72, 144, 216, 288].map(function (r) {
      return '<ellipse cx="0" cy="-5.2" rx="4" ry="5.6" fill="#fff" stroke="#ff4f95" stroke-width="1.6" transform="rotate(' + r + ')"/>';
    }).join("");
    return '<g transform="translate(' + x + " " + y + ") scale(" + (scale || 1) + ')">' + petals + '<circle r="3.2" fill="#ffd24a" stroke="#f2a900" stroke-width="1"/></g>';
  }

  function headMarkup(id, p, sw, eyes) {
    var S = st(sw);
    var mode = eyes || "open";
    switch (id) {
      case "kitty":
        return '<g class="kc-ears">' +
          '<path d="M14 46 Q14 22 21 10 Q33 15 45 28 Z" fill="url(#' + p + 'fur)" ' + S + "/>" +
          '<path d="M86 46 Q86 22 79 10 Q67 15 55 28 Z" fill="url(#' + p + 'fur)" ' + S + "/>" +
          '<path d="M21 19 Q20 30 22 37 L35 30 Q28 23 21 19 Z" fill="#ffc9d9"/>' +
          '<path d="M79 19 Q80 30 78 37 L65 30 Q72 23 79 19 Z" fill="#ffc9d9"/></g>' +
          '<ellipse cx="50" cy="60" rx="43" ry="34" fill="url(#' + p + 'fur)" ' + S + "/>" +
          '<g transform="translate(72 23) rotate(14)">' +
          '<path d="M0 0 C-14 -17 -24 -4 -18 6 C-14 12 -6 8 0 3 Z" fill="#e8203f" ' + S + "/>" +
          '<path d="M0 0 C14 -17 24 -4 18 6 C14 12 6 8 0 3 Z" fill="#e8203f" ' + S + "/>" +
          '<path d="M-14 -5 Q-10 -9 -6 -5" fill="none" stroke="#ff7d92" stroke-width="2" stroke-linecap="round"/>' +
          '<path d="M14 -5 Q10 -9 6 -5" fill="none" stroke="#ff7d92" stroke-width="2" stroke-linecap="round"/>' +
          '<circle cx="0" cy="1.5" r="5.5" fill="#e8203f" ' + S + "/></g>" +
          eyePair(61, 4.2, 5.8, INK, sw, mode, 13) +
          '<ellipse cx="50" cy="70" rx="5.6" ry="4" fill="url(#' + p + 'nose)" stroke="' + INK + '" stroke-width="' + (sw * 0.6) + '"/>' +
          '<g stroke="' + INK + '" stroke-width="' + (sw * 0.72) + '" stroke-linecap="round">' +
          '<line x1="3" y1="57" x2="18" y2="61"/><line x1="2" y1="66" x2="17" y2="67"/><line x1="4" y1="76" x2="18" y2="72"/>' +
          '<line x1="97" y1="57" x2="82" y2="61"/><line x1="98" y1="66" x2="83" y2="67"/><line x1="96" y1="76" x2="82" y2="72"/></g>' +
          (mode === "happy" || mode === "wink" ? blush(74, 27, 0.6) : "");

      case "melody":
        return '<g class="kc-ears">' +
          '<g transform="rotate(-10 34 44)"><ellipse cx="34" cy="22" rx="10.5" ry="22" fill="url(#' + p + 'hoodPink)" ' + S + "/>" +
          '<ellipse cx="34" cy="22" rx="4.5" ry="14" fill="#ffd7e7"/></g>' +
          '<g transform="rotate(10 66 44)"><ellipse cx="66" cy="22" rx="10.5" ry="22" fill="url(#' + p + 'hoodPink)" ' + S + "/>" +
          '<ellipse cx="66" cy="22" rx="4.5" ry="14" fill="#ffd7e7"/></g></g>' +
          '<circle cx="50" cy="60" r="38" fill="url(#' + p + 'hoodPink)" ' + S + "/>" +
          '<ellipse cx="50" cy="66" rx="30" ry="25" fill="url(#' + p + 'fur)" stroke="' + INK + '" stroke-width="' + (sw * 0.75) + '"/>' +
          flower(72, 12, 1.05) +
          eyePair(64, 3.6, 5, INK, sw, mode, 11) +
          '<ellipse cx="50" cy="72" rx="3.6" ry="2.7" fill="url(#' + p + 'nose)" stroke="' + INK + '" stroke-width="' + (sw * 0.4) + '"/>' +
          (mode === "surprised" ? '<ellipse cx="50" cy="79" rx="2.8" ry="3.4" fill="#e8546f" ' + st(sw * 0.5) + "/>" : "") +
          blush(73, 21);

      case "kuromi":
        return '<g class="kc-ears">' +
          '<path d="M17 47 C6 28 5 12 11 4 C20 12 31 21 39 30 Z" fill="url(#' + p + 'hoodBlack)" ' + S + "/>" +
          '<path d="M83 47 C94 28 95 12 89 4 C80 12 69 21 61 30 Z" fill="url(#' + p + 'hoodBlack)" ' + S + "/>" +
          '<circle cx="11" cy="5" r="5" fill="#ff8fc2" ' + st(sw * 0.7) + "/>" +
          '<circle cx="89" cy="5" r="5" fill="#ff8fc2" ' + st(sw * 0.7) + "/></g>" +
          '<circle cx="50" cy="60" r="38" fill="url(#' + p + 'hoodBlack)" ' + S + "/>" +
          '<ellipse cx="50" cy="67" rx="28.5" ry="23.5" fill="url(#' + p + 'fur)" stroke="' + INK + '" stroke-width="' + (sw * 0.75) + '"/>' +
          '<g transform="translate(50 33)"><path d="M-7 -1 A7 7 0 0 1 7 -1 Q7 4 4 5 L4 8 L-4 8 L-4 5 Q-7 4 -7 -1 Z" fill="#ff8fc2"/>' +
          '<circle cx="-2.6" cy="0" r="1.7" fill="' + INK + '"/><circle cx="2.6" cy="0" r="1.7" fill="' + INK + '"/>' +
          '<path d="M-1.8 8 v-2.4 M1.8 8 v-2.4" stroke="' + INK + '" stroke-width="1"/></g>' +
          eyePair(66, 3.8, 5.4, INK, sw, mode, 11) +
          (mode === "surprised" ? '<ellipse cx="50" cy="78" rx="3.4" ry="4.2" fill="#e8546f" ' + st(sw * 0.55) + "/>" : mode === "happy" || mode === "wink"
            ? '<path d="M43 75 Q50 84 57 75 Z" fill="#e8546f" ' + st(sw * 0.65) + "/>"
            : '<path d="M43 76 Q50 82 57 76" fill="none" stroke="' + INK + '" stroke-width="' + (sw * 0.7) + '" stroke-linecap="round"/>' +
              '<path d="M53.5 78.4 l1.2 2.6 l1.4 -3.4" fill="#fff" stroke="' + INK + '" stroke-width="' + (sw * 0.35) + '"/>') +
          blush(75, 20);

      case "purin":
        return '<g class="kc-ears">' +
          '<path d="M16 44 C4 46 2 70 9 80 C13 85 21 82 22 74 C23 62 23 50 16 44 Z" fill="url(#' + p + 'ear)" ' + S + "/>" +
          '<path d="M84 44 C96 46 98 70 91 80 C87 85 79 82 78 74 C77 62 77 50 84 44 Z" fill="url(#' + p + 'ear)" ' + S + "/></g>" +
          '<ellipse cx="50" cy="60" rx="39" ry="34" fill="url(#' + p + 'furGold)" ' + S + "/>" +
          '<g class="kc-beret"><ellipse cx="50" cy="28" rx="21" ry="8" fill="url(#' + p + 'beret)" ' + S + "/>" +
          '<path d="M48 20 Q49 13 54 13" fill="none" stroke="' + INK + '" stroke-width="' + (sw * 1.4) + '" stroke-linecap="round"/>' +
          '<path d="M48 20 Q49 13 54 13" fill="none" stroke="#7a4d24" stroke-width="' + (sw * 0.6) + '" stroke-linecap="round"/></g>' +
          eyePair(60, 3.6, 4.6, INK, sw, mode, 12) +
          (mode === "surprised" ? '<ellipse cx="50" cy="71" rx="3.4" ry="4.2" fill="#e8546f" ' + st(sw * 0.55) + "/>" : mode === "happy" || mode === "wink"
            ? '<path d="M43 69 Q50 79 57 69 Z" fill="#e8546f" ' + st(sw * 0.65) + "/>"
            : '<path d="M44 69 Q47 73 50 69 Q53 73 56 69" fill="none" stroke="#7a4a1a" stroke-width="' + (sw * 0.7) + '" stroke-linecap="round"/>') +
          blush(70, 22);

      default: /* cinna */
        return '<g class="kc-ears">' +
          '<path d="M33 31 C14 24 -7 36 -7 56 C-7 69 6 71 14 63 C22 55 29 46 35 41 Z" fill="url(#' + p + 'fur)" ' + S + "/>" +
          '<path d="M67 31 C86 24 107 36 107 56 C107 69 94 71 86 63 C78 55 71 46 65 41 Z" fill="url(#' + p + 'fur)" ' + S + "/>" +
          '<path d="M20 36 C8 38 0 48 0 57" fill="none" stroke="#d6ecfa" stroke-width="' + (sw * 1.3) + '" stroke-linecap="round"/>' +
          '<path d="M80 36 C92 38 100 48 100 57" fill="none" stroke="#d6ecfa" stroke-width="' + (sw * 1.3) + '" stroke-linecap="round"/></g>' +
          '<ellipse cx="50" cy="59" rx="38" ry="32" fill="url(#' + p + 'fur)" ' + S + "/>" +
          eyePair(59, 4.4, 5.6, "#2a5fc4", sw, mode, 12) +
          (mode === "surprised" ? '<ellipse cx="50" cy="69.5" rx="3.4" ry="4.2" fill="#e8546f" ' + st(sw * 0.55) + "/>" : mode === "happy" || mode === "wink"
            ? '<path d="M44 67 Q50 76 56 67 Z" fill="#e8546f" ' + st(sw * 0.65) + "/>"
            : '<path d="M45 68 Q50 72.5 55 68" fill="none" stroke="' + INK + '" stroke-width="' + (sw * 0.65) + '" stroke-linecap="round"/>') +
          blush(68, 23, 0.7);
    }
  }

  /* ------------------------------------------------------------------ outfits / colours per character */
  var LOOK = {
    kitty:  { arm: "shirt", paw: "fur", leg: "denim", foot: "fur", pads: true },
    melody: { arm: "dress", paw: "fur", leg: "fur", foot: "shoePink", pads: false },
    kuromi: { arm: "hoodBlack", paw: "fur", leg: "hoodBlack", foot: "fur", pads: true },
    purin:  { arm: "furGold", paw: "furGold", leg: "furGold", foot: "furGold", pads: true, padColour: "#b07a3e" },
    cinna:  { arm: "fur", paw: "fur", leg: "fur", foot: "fur", pads: true }
  };
  function fill(p, key) {
    if (key === "shoePink") return "#ff6fa8";
    return "url(#" + p + key + ")";
  }

  /* Torso, in body-box coordinates. oy = vertical offset for the pose. */
  function shiftPath(d, oy) {
    return d.replace(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g, function (m, x, y) { return x + " " + (parseFloat(y) + oy); });
  }
  function torso(id, p, oy) {
    var S = st(SW);
    var pth = function (d) { return shiftPath(d, oy); };
    var chubby = pth("M68,138 C51,160 49,200 59,216 C71,230 129,230 141,216 C151,200 149,160 132,138 Z");
    var slim = pth("M70,138 C60,160 57,196 62,214 C72,227 128,227 138,214 C143,196 140,160 130,138 Z");
    var D = function (d, f, sw) { return '<path d="' + pth(d) + '" fill="' + f + '" ' + st(sw || SW) + "/>"; };
    var line = function (d, col, w) { return '<path d="' + pth(d) + '" fill="none" stroke="' + col + '" stroke-width="' + w + '" stroke-linecap="round" stroke-linejoin="round"/>'; };
    switch (id) {
      case "kitty":
        return '<path class="kc-torso" d="' + slim + '" fill="url(#' + p + 'shirt)" ' + S + "/>" +
          /* straps (under the bib edge) */
          line("M85,174 L78,146", INK, SW + 7) + line("M115,174 L122,146", INK, SW + 7) +
          line("M85,174 L78,146", "#3c86d8", 7) + line("M115,174 L122,146", "#3c86d8", 7) +
          /* overalls: bib + shorts in one shape */
          D("M80,177 Q80,170 87,170 L113,170 Q120,170 120,177 L120,192 C132,196 139,205 138,214 C128,227 72,227 62,214 C61,205 68,196 80,192 Z", "url(#" + p + "denim)") +
          D("M91,182 L109,182 L109,189 Q109,195 100,195 Q91,195 91,189 Z", "#3c86d8", SW * 0.55) +
          '<circle cx="86" cy="' + (176 + oy) + '" r="3.8" fill="#fff" stroke="' + INK + '" stroke-width="2.2"/>' +
          '<circle cx="114" cy="' + (176 + oy) + '" r="3.8" fill="#fff" stroke="' + INK + '" stroke-width="2.2"/>' +
          line("M100,207 L100,223", "#245ea8", 2.6);

      case "melody":
        return '<path class="kc-torso" d="' + pth("M73,138 C66,162 54,194 50,211 Q48,225 62,225 L138,225 Q152,225 150,211 C146,194 134,162 127,138 Z") + '" fill="url(#' + p + 'dress)" ' + S + "/>" +
          line("M55,214 Q61,221 67,215 Q73,222 79,215 Q85,222 91,215 Q97,222 103,215 Q109,222 115,215 Q121,222 127,215 Q133,222 139,215 Q144,220 146,214", "#fff", 4.5) +
          '<g transform="translate(100 ' + (172 + oy) + ')"><path d="M0 0 L-12 -7 Q-14 0 -12 7 Z M0 0 L12 -7 Q14 0 12 7 Z" fill="#fff" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>' +
          '<circle r="3.6" fill="#ff5c9a" stroke="' + INK + '" stroke-width="2.2"/></g>';

      case "kuromi":
        return '<path class="kc-torso" d="' + slim + '" fill="url(#' + p + 'hoodBlack)" ' + S + "/>" +
          line("M61,203 Q100,212 139,203", "#8d6bd8", 7) +
          '<g transform="translate(100 ' + (183 + oy) + ')"><path d="M-10 -2 A10 10 0 0 1 10 -2 Q10 6 5.5 7 L5.5 11 L-5.5 11 L-5.5 7 Q-10 6 -10 -2 Z" fill="#ff8fc2" stroke="' + INK + '" stroke-width="2.2"/>' +
          '<circle cx="-3.8" cy="-0.5" r="2.4" fill="' + INK + '"/><circle cx="3.8" cy="-0.5" r="2.4" fill="' + INK + '"/></g>';

      case "purin":
        return '<path class="kc-torso" d="' + chubby + '" fill="url(#' + p + 'furGold)" ' + S + "/>" +
          '<ellipse cx="100" cy="' + (197 + oy) + '" rx="27" ry="21" fill="#fff0c4" opacity=".9"/>';

      default: /* cinna */
        return '<path class="kc-torso" d="' + chubby + '" fill="url(#' + p + 'fur)" ' + S + "/>";
    }
  }

  /* Tail (behind the body). */
  function tail(id, oy) {
    var pth = function (d) { return shiftPath(d, oy); };
    if (id === "kuromi") {
      var d = pth("M128,208 C152,216 166,206 162,186");
      return '<g class="kc-tail"><path d="' + d + '" fill="none" stroke="' + INK + '" stroke-width="' + (7 + SW) + '" stroke-linecap="round"/>' +
        '<path d="' + d + '" fill="none" stroke="#3a2e40" stroke-width="7" stroke-linecap="round"/>' +
        '<path d="' + pth("M162,171 C168,179 173,185 170,190 Q162,186 154,190 C151,185 156,179 162,171 Z") + '" fill="#ff8fc2" ' + st(SW * 0.8) + "/></g>";
    }
    if (id === "cinna") {
      var c = pth("M130,206 C152,212 170,200 167,184 C164,171 147,172 147,184 C147,192 157,193 159,186");
      return '<g class="kc-tail"><path d="' + c + '" fill="none" stroke="' + INK + '" stroke-width="' + (11 + SW) + '" stroke-linecap="round"/>' +
        '<path d="' + c + '" fill="none" stroke="#ffffff" stroke-width="11" stroke-linecap="round"/></g>';
    }
    return "";
  }

  /* Arm hanging from the pivot (sx, sy), rotated by deg (0 = straight down, + = swings to the viewer's left). */
  function arm(cls, sx, sy, deg, armFill, pawFill) {
    return '<g class="kc-arm ' + cls + '" style="transform-origin:' + sx + "px " + sy + 'px">' +
      '<g transform="translate(' + sx + " " + sy + ") rotate(" + deg + ')">' +
      '<path d="M-11 0 L-11 17 A11 11 0 0 0 11 17 L11 0 A11 11 0 0 0 -11 0 Z" fill="' + armFill + '" ' + st(SW) + "/>" +
      '<circle cx="0" cy="25" r="12.5" fill="' + pawFill + '" ' + st(SW) + "/></g></g>";
  }

  function soleMarks(cx, cy, look) {
    var padCol = look.padColour || "#ffb3c8";
    if (look.pads) {
      return '<ellipse cx="' + cx + '" cy="' + (cy + 3) + '" rx="6.5" ry="5.2" fill="' + padCol + '"/>' +
        '<circle cx="' + (cx - 6.5) + '" cy="' + (cy - 5) + '" r="2.6" fill="' + padCol + '"/>' +
        '<circle cx="' + cx + '" cy="' + (cy - 7.5) + '" r="2.6" fill="' + padCol + '"/>' +
        '<circle cx="' + (cx + 6.5) + '" cy="' + (cy - 5) + '" r="2.6" fill="' + padCol + '"/>';
    }
    return '<path d="M' + (cx - 7) + " " + (cy - 5) + " Q" + cx + " " + (cy - 9) + " " + (cx + 7) + " " + (cy - 5) + '" fill="none" stroke="#ffd3e5" stroke-width="2.6" stroke-linecap="round"/>';
  }

  /* Leg + foot. mode: stand | sit | dangle */
  function leg(cls, side, mode, look, p, oy) {
    var sgn = side === "l" ? -1 : 1;
    var hx = 100 + sgn * 16;               /* hip x */
    var hy = 210 + oy;                     /* top of the leg, hidden under the torso */
    var legFill = fill(p, look.leg), footFill = fill(p, look.foot);
    var out = '<g class="kc-leg ' + cls + '" style="transform-origin:' + hx + "px " + hy + 'px">';
    var capsule = function (len) {
      return '<path d="M' + (hx - 11) + " " + hy + " L" + (hx - 11) + " " + (hy + len) + " A11 11 0 0 0 " + (hx + 11) + " " + (hy + len) + " L" + (hx + 11) + " " + hy + ' Z" fill="' + legFill + '" ' + st(SW) + "/>";
    };
    if (mode === "sit") {
      /* legs stick out toward the viewer and a little apart: short stubs, round soles facing us */
      out += '<g transform="rotate(' + (-sgn * 28) + " " + hx + " " + hy + ')">' + capsule(12) + "</g>";
      var fx = hx + sgn * 13, fy = hy + 21;
      out += '<ellipse cx="' + fx + '" cy="' + fy + '" rx="14" ry="14.5" fill="' + footFill + '" ' + st(SW) + "/>" + soleMarks(fx, fy + 1, look);
      return out + "</g>";
    }
    if (mode === "dangle") {
      out += '<g transform="rotate(' + (sgn * 13) + " " + hx + " " + hy + ')">' + capsule(18) +
        '<ellipse cx="' + hx + '" cy="' + (hy + 31) + '" rx="13" ry="11.5" fill="' + footFill + '" ' + st(SW) + "/></g>";
      return out + "</g>";
    }
    out += capsule(16) +
      '<ellipse cx="' + (hx + sgn * 3) + '" cy="' + (hy + 34) + '" rx="17" ry="9.5" fill="' + footFill + '" ' + st(SW) + "/>";
    if (look.foot === "shoePink") {
      out += '<path d="M' + (hx + sgn * 3 - 9) + " " + (hy + 30) + " Q" + (hx + sgn * 3) + " " + (hy + 27) + " " + (hx + sgn * 3 + 9) + " " + (hy + 30) + '" fill="none" stroke="#ffd3e5" stroke-width="2.6" stroke-linecap="round"/>';
    }
    return out + "</g>";
  }

  /* ------------------------------------------------------------------ poses */
  /* armL / armR: rotation in degrees; frontL/frontR: arm drawn in front of the head (raised arms). */
  var POSE = {
    stand: { armL: 22, armR: -22, legs: "stand", oy: 0, eyes: "open", shadow: 1 },
    wave:  { armL: 22, armR: -132, frontR: true, legs: "stand", oy: 0, eyes: "open", shadow: 1 },
    sit:   { armL: 12, armR: -12, legs: "sit", oy: 10, eyes: "open", shadow: 0 },
    held:  { armL: 118, armR: -118, frontL: true, frontR: true, legs: "dangle", oy: -4, eyes: "open", shadow: 0.6 },
    happy: { armL: 136, armR: -136, frontL: true, frontR: true, legs: "stand", oy: -10, eyes: "happy", shadow: 0.8 },
    /* bath: sitting in water, arms out to rest the paws on the tub rim (rim crosses at about y 200) */
    bath:  { armL: 46, armR: -46, legs: "sit", oy: 10, eyes: "happy", shadow: 0 },
    /* walk: legs and arms step in turn (CSS); the host turns the head toward where she goes */
    walk:  { armL: 18, armR: -18, legs: "stand", oy: 0, eyes: "open", shadow: 1 },
    /* eat: one paw at the mouth, nibbling */
    eat:   { armL: 22, armR: 152, frontR: true, legs: "stand", oy: 0, eyes: "happy", shadow: 1 },
    eatsit: { armL: 12, armR: 152, frontR: true, legs: "sit", oy: 10, eyes: "happy", shadow: 0 },
    /* sleep: eyes closed, head resting to one side (lying in bed, or dozing on a seat) */
    sleep: { armL: 12, armR: -12, legs: "sit", oy: 10, eyes: "closed", shadow: 0, tilt: 12 },
    /* high five: one paw up on the friend's side */
    five_r: { armL: 22, armR: -142, frontR: true, legs: "stand", oy: -2, eyes: "happy", shadow: 1 },
    five_l: { armL: 142, armR: -22, frontL: true, legs: "stand", oy: -2, eyes: "happy", shadow: 1 },
    /* hug: both arms out and forward */
    hug:   { armL: 74, armR: -74, frontL: true, frontR: true, legs: "stand", oy: 0, eyes: "happy", shadow: 1 }
  };
  var BLINK_DELAY = { kitty: 0.4, melody: 1.7, kuromi: 3.1, purin: 2.3, cinna: 0.9 };

  function full(id, pose, opts) {
    if (IDS.indexOf(id) < 0) id = "kitty";
    if (!POSE[pose]) pose = "stand";
    var P = POSE[pose], p = nextPrefix(), look = LOOK[id];
    var eyes = opts && EYES.indexOf(opts.eyes) >= 0 ? opts.eyes : P.eyes;
    var oy = P.oy;
    var sL = { x: 73, y: 160 + oy }, sR = { x: 127, y: 160 + oy };
    var armFill = fill(p, look.arm), pawFill = fill(p, look.paw);
    var aL = arm("kc-arm-l", sL.x, sL.y, P.armL, armFill, pawFill);
    var aR = arm("kc-arm-r", sR.x, sR.y, P.armR, armFill, pawFill);
    /* the head sits in a wrapper the host can turn with CSS (kc-look); the inner group keeps its own transform */
    var head = '<g class="kc-look"><g' + (P.tilt ? ' transform="rotate(' + P.tilt + " 100 " + (150 + oy) + ')"' : "") + '>' +
      '<g class="kc-head" transform="translate(' + HEAD_X + " " + (HEAD_Y + oy) + ") scale(" + HEAD_SCALE + ')">' + headMarkup(id, p, HEAD_SW, eyes) + "</g></g></g>";
    var hipY = 222 + oy;

    var shadow = P.shadow
      ? '<ellipse class="kc-shadow" cx="100" cy="251" rx="' + (52 * P.shadow) + '" ry="' + (6 * P.shadow) + '" fill="#3b2a33" opacity=".16"/>'
      : "";
    var legs = leg("kc-leg-l", "l", P.legs, look, p, oy) + leg("kc-leg-r", "r", P.legs, look, p, oy);
    var body = '<g class="kc-body" style="transform-origin:100px ' + hipY + 'px">' +
      tail(id, oy) + torso(id, p, oy) +
      (P.frontL ? "" : aL) + (P.frontR ? "" : aR) +
      head +
      (P.frontL ? aL : "") + (P.frontR ? aR : "") +
      "</g>";

    var WORD = { stand: "standing", sit: "sitting", held: "being picked up", wave: "waving", bath: "in the bath", walk: "walking", eat: "eating", eatsit: "eating",
      sleep: "sleeping", five_r: "giving a high five", five_l: "giving a high five", hug: "hugging", happy: "happy" };
    var label = NAMES[id] + " " + WORD[pose];
    return '<svg class="kc kc-' + id + " kc-pose-" + pose + '" viewBox="0 0 200 260" role="img" aria-label="' + label + '"' +
      ' style="--kc-blink-delay:' + BLINK_DELAY[id] + 's" data-eyes="' + eyes + '" xmlns="http://www.w3.org/2000/svg">' +
      defs(p) + shadow +
      '<g class="kc-jump">' + legs + body + "</g></svg>";
  }

  function headInner(id, opts) {
    if (IDS.indexOf(id) < 0) id = "kitty";
    var p = nextPrefix();
    return defs(p) + headMarkup(id, p, 3.5, (opts && opts.eyes) || "open");
  }
  function face(id, opts) {
    return '<svg class="kc kc-face kc-' + id + '" viewBox="-9 -3 118 106" aria-hidden="true" style="--kc-blink-delay:' + (BLINK_DELAY[id] || 0) + 's" xmlns="http://www.w3.org/2000/svg">' +
      headInner(id, opts) + "</svg>";
  }

  var CSS = [
    ".kc{overflow:visible;display:block}",
    ".kc .kc-body,.kc .kc-arm,.kc .kc-leg,.kc .kc-jump{transform-box:view-box}",
    ".kc .kc-body{animation:kc-breathe 3.6s ease-in-out infinite}",
    ".kc .kc-eyes{transform-box:fill-box;transform-origin:50% 50%;animation:kc-blink 5.2s linear infinite;animation-delay:var(--kc-blink-delay,0s)}",
    ".kc-pose-wave .kc-arm-r{animation:kc-wave 2.2s ease-in-out infinite}",
    ".kc-pose-held .kc-leg-l{animation:kc-dangle 1.2s ease-in-out infinite}",
    ".kc-pose-held .kc-leg-r{animation:kc-dangle 1.2s ease-in-out infinite reverse}",
    ".kc-pose-held .kc-body,.kc-pose-happy .kc-body{animation:none}",
    ".kc-pose-happy .kc-jump{animation:kc-hop 2.4s ease-in-out infinite}",
    ".kc .kc-look{transform-box:view-box;transform-origin:100px 150px;transition:transform .3s ease-out}",
    ".kc-pose-walk .kc-leg-l{animation:kc-step .52s ease-in-out infinite}",
    ".kc-pose-walk .kc-leg-r{animation:kc-step .52s ease-in-out -.26s infinite}",
    ".kc-pose-walk .kc-arm-l{animation:kc-swing .52s ease-in-out infinite alternate}",
    ".kc-pose-walk .kc-arm-r{animation:kc-swing .52s ease-in-out -.52s infinite alternate}",
    ".kc-pose-walk .kc-body{animation:none}",
    ".kc-pose-eat .kc-arm-r,.kc-pose-eatsit .kc-arm-r{animation:kc-munch .5s ease-in-out infinite}",
    ".kc-pose-sleep .kc-body{animation:kc-breathe 4.8s ease-in-out infinite}",
    ".kc-pose-five_r .kc-arm-r,.kc-pose-five_l .kc-arm-l{animation:kc-five .9s ease-out 1}",
    ".kc-pose-hug .kc-body{animation:kc-squeeze 1.1s ease-in-out infinite}",
    "@keyframes kc-step{0%,50%,100%{transform:translateY(0)}25%{transform:translateY(-8px) rotate(4deg)}}",
    "@keyframes kc-swing{0%{transform:rotate(-12deg)}100%{transform:rotate(12deg)}}",
    "@keyframes kc-munch{0%,100%{transform:rotate(0)}50%{transform:rotate(-10deg)}}",
    "@keyframes kc-five{0%{transform:rotate(30deg)}60%{transform:rotate(-6deg)}100%{transform:rotate(0)}}",
    "@keyframes kc-squeeze{0%,100%{transform:scale(1,1)}50%{transform:scale(1.04,.97)}}",
    "@keyframes kc-breathe{0%,100%{transform:scaleY(1)}50%{transform:scaleY(1.02)}}",
    "@keyframes kc-blink{0%,92%,100%{transform:scaleY(1)}95%{transform:scaleY(.1)}}",
    "@keyframes kc-wave{0%,55%,100%{transform:rotate(0deg)}14%{transform:rotate(-14deg)}28%{transform:rotate(6deg)}42%{transform:rotate(-14deg)}}",
    "@keyframes kc-dangle{0%,100%{transform:rotate(-7deg)}50%{transform:rotate(7deg)}}",
    "@keyframes kc-hop{0%,40%,100%{transform:translateY(0)}20%{transform:translateY(-8px)}}",
    "@media (prefers-reduced-motion: reduce){.kc,.kc *{animation:none!important;transition:none!important}}"
  ].join("\n");

  function injectCss() {
    if (typeof document === "undefined" || document.getElementById("kitty-chars-css")) return;
    var s = document.createElement("style");
    s.id = "kitty-chars-css";
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  window.KittyChars = {
    full: full,
    face: face,
    headInner: headInner,
    css: CSS,
    injectCss: injectCss,
    ids: IDS.slice(),
    poses: POSES.slice(),
    eyes: EYES.slice(),
    names: NAMES,
    /* Points in the 200 x 260 box. foot: put this on the floor spot.
       sitHip: put this on the seat surface (for pose "sit").
       holdPoint: where the finger holds the character while dragging (about 30% up). */
    anchors: { foot: { x: 100, y: 255 }, sitHip: { x: 100, y: 230 }, holdPoint: { x: 100, y: 185 } }
  };
})();
