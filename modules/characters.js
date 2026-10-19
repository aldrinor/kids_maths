/* characters.js — full-body chibi characters for Marie's Kitty World.
 * Our own original characters: Mimi (cat), Bella (bunny), Lulu (fox), Momo (puppy), Puff (lamb).
 * Ids stay kitty | melody | kuromi | purin | cinna so the rest of the app keeps working.
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
  var NAMES = { kitty: "Mimi", melody: "Bella", kuromi: "Lulu", purin: "Momo", cinna: "Puff" };

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
      radial(p + "cream", [[0, "#fffbf0"], [0.7, "#fdf0d8"], [1, "#ecd9b8"]]) +
      radial(p + "furGold", [[0, "#fff3bf"], [0.65, "#ffd66b"], [1, "#e8ad3c"]]) +
      radial(p + "lilacFur", [[0, "#ece0ff"], [0.65, "#cdb4f4"], [1, "#a98ae0"]]) +
      radial(p + "lilacDress", [[0, "#e6d6ff"], [0.6, "#c4a8f2"], [1, "#a98ae0"]]) +
      radial(p + "mint", [[0, "#dcf9ea"], [0.6, "#a3e6c4"], [1, "#74cfa4"]]) +
      radial(p + "sky", [[0, "#d6edff"], [1, "#84c6f4"]]) +
      radial(p + "red", [[0, "#ff8a8a"], [1, "#e0405a"]]) +
      radial(p + "nose", [[0, "#ffe680"], [1, "#f2a900"]], "35%", "30%", "70%") +
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
      return '<ellipse cx="0" cy="-5.2" rx="4" ry="5.6" fill="#ff9cc4" stroke="#e0558f" stroke-width="1.4" transform="rotate(' + r + ')"/>';
    }).join("");
    return '<g transform="translate(' + x + " " + y + ") scale(" + (scale || 1) + ')">' + petals + '<circle r="3.2" fill="#ffd24a" stroke="#f2a900" stroke-width="1"/></g>';
  }
  function star(x, y, r) {
    var pts = [];
    for (var i = 0; i < 10; i += 1) {
      var a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r;
      pts.push((x + rr * Math.cos(a)).toFixed(1) + "," + (y + rr * Math.sin(a)).toFixed(1));
    }
    return '<polygon points="' + pts.join(" ") + '" fill="#ffd93d" stroke="#e0a800" stroke-width="1.2" stroke-linejoin="round"/>';
  }
  /* Mouth under the nose at y. Open for happy / wink / surprised, otherwise the supplied closed-mouth markup. */
  function mouth(mode, y, sw, closed) {
    if (mode === "surprised") return '<ellipse cx="50" cy="' + (y + 6) + '" rx="3.2" ry="4" fill="#e8546f" ' + st(sw * 0.55) + "/>";
    if (mode === "happy" || mode === "wink") return '<path d="M43.5 ' + (y + 2) + " Q50 " + (y + 12) + " 56.5 " + (y + 2) + ' Z" fill="#e8546f" ' + st(sw * 0.65) + "/>";
    return closed;
  }
  function smile(y, w, sw) {
    return '<path d="M' + (50 - w) + " " + y + " Q50 " + (y + 5.5) + " " + (50 + w) + " " + y + '" fill="none" stroke="' + INK + '" stroke-width="' + (sw * 0.7) + '" stroke-linecap="round"/>';
  }

  function headMarkup(id, p, sw, eyes) {
    var S = st(sw);
    var mode = eyes || "open";
    var thin = st(sw * 0.55);
    switch (id) {
      case "kitty": /* Mimi: white cat, flower on the ear, smiling mouth */
        return '<g class="kc-ears">' +
          '<path d="M13 50 Q10 24 18 6 Q33 11 46 28 Z" fill="url(#' + p + 'fur)" ' + S + "/>" +
          '<path d="M87 50 Q90 24 82 6 Q67 11 54 28 Z" fill="url(#' + p + 'fur)" ' + S + "/>" +
          '<path d="M82 19 Q83 30 82 38 L68 30 Q74 24 82 19 Z" fill="#ffc9d9"/></g>' +
          '<ellipse cx="50" cy="61" rx="41" ry="34" fill="url(#' + p + 'fur)" ' + S + "/>" +
          '<path d="M18 22 Q17 31 19 38 L33 30 Q26 25 18 22 Z" fill="#ffc9d9"/>' +
          flower(27, 22, 1.05) +
          blush(73, 26, 0.55) +
          eyePair(60, 4.2, 5.8, INK, sw, mode, 13) +
          '<ellipse cx="50" cy="68" rx="4.2" ry="3" fill="#ff9fbd" stroke="' + INK + '" stroke-width="' + (sw * 0.5) + '"/>' +
          mouth(mode, 72, sw, smile(72.5, 5.5, sw)) +
          '<g stroke="' + INK + '" stroke-width="' + (sw * 0.72) + '" stroke-linecap="round">' +
          '<line x1="4" y1="63" x2="19" y2="65"/><line x1="5" y1="73" x2="19" y2="71"/>' +
          '<line x1="96" y1="63" x2="81" y2="65"/><line x1="95" y1="73" x2="81" y2="71"/></g>';

      case "melody": /* Bella: cream bunny, long upright ears, star clip */
        return '<g class="kc-ears">' +
          '<g transform="rotate(-9 38 50)"><ellipse cx="36" cy="23" rx="10" ry="24" fill="url(#' + p + 'cream)" ' + S + "/>" +
          '<ellipse cx="36" cy="25" rx="4.6" ry="16" fill="#ffd0df"/></g>' +
          '<g transform="rotate(9 62 50)"><ellipse cx="64" cy="23" rx="10" ry="24" fill="url(#' + p + 'cream)" ' + S + "/>" +
          '<ellipse cx="64" cy="25" rx="4.6" ry="16" fill="#ffd0df"/></g></g>' +
          '<ellipse cx="50" cy="63" rx="41" ry="33" fill="url(#' + p + 'cream)" ' + S + "/>" +
          star(72, 37, 7.5) +
          blush(74, 25, 0.55) +
          eyePair(63, 3.9, 5.3, INK, sw, mode, 13) +
          '<ellipse cx="50" cy="70" rx="3.2" ry="2.4" fill="#ff9fbd" stroke="' + INK + '" stroke-width="' + (sw * 0.4) + '"/>' +
          mouth(mode, 74, sw, '<path d="M45 75 Q47.5 78.5 50 74 Q52.5 78.5 55 75" fill="none" stroke="' + INK + '" stroke-width="' + (sw * 0.65) + '" stroke-linecap="round" stroke-linejoin="round"/>');

      case "kuromi": /* Lulu: lilac fox, pointed ears, white cheeks */
        return '<g class="kc-ears">' +
          '<path d="M13 52 Q8 24 13 5 Q30 11 45 30 Z" fill="url(#' + p + 'lilacFur)" ' + S + "/>" +
          '<path d="M87 52 Q92 24 87 5 Q70 11 55 30 Z" fill="url(#' + p + 'lilacFur)" ' + S + "/>" +
          '<path d="M18 38 Q16 24 19 15 Q28 19 35 29 Z" fill="#fff4fb"/>' +
          '<path d="M82 38 Q84 24 81 15 Q72 19 65 29 Z" fill="#fff4fb"/></g>' +
          '<ellipse cx="50" cy="61" rx="41" ry="33" fill="url(#' + p + 'lilacFur)" ' + S + "/>" +
          '<path d="M11 67 Q22 60 36 68 Q50 62 64 68 Q78 60 89 67 Q84 89 50 93 Q16 89 11 67 Z" fill="#fffafd"/>' +
          '<ellipse cx="50" cy="61" rx="41" ry="33" fill="none" ' + S + "/>" +
          blush(74, 27, 0.5) +
          eyePair(60, 3.9, 5.4, INK, sw, mode, 13) +
          '<ellipse cx="50" cy="69" rx="3.6" ry="2.7" fill="#6a4a8c" stroke="' + INK + '" stroke-width="' + (sw * 0.4) + '"/>' +
          mouth(mode, 73, sw, smile(73, 5, sw));

      case "purin": /* Momo: golden puppy, floppy brown ears, no hat */
        return '<g class="kc-ears">' +
          '<path d="M16 44 C4 46 2 70 9 80 C13 85 21 82 22 74 C23 62 23 50 16 44 Z" fill="url(#' + p + 'ear)" ' + S + "/>" +
          '<path d="M84 44 C96 46 98 70 91 80 C87 85 79 82 78 74 C77 62 77 50 84 44 Z" fill="url(#' + p + 'ear)" ' + S + "/></g>" +
          '<ellipse cx="50" cy="60" rx="39" ry="34" fill="url(#' + p + 'furGold)" ' + S + "/>" +
          '<path d="M44 28 Q50 20 56 28 Q50 33 44 28 Z" fill="#e8ad3c"/>' +
          '<ellipse cx="50" cy="71" rx="16" ry="11.5" fill="#fff3cf"/>' +
          blush(73, 28, 0.5) +
          eyePair(57, 3.8, 4.9, INK, sw, mode, 14) +
          '<ellipse cx="50" cy="66" rx="5.2" ry="3.7" fill="#6b4226" stroke="' + INK + '" stroke-width="' + (sw * 0.45) + '"/>' +
          mouth(mode, 70, sw, '<path d="M50 70 L50 72.5 M43.5 72 Q47 77.5 50 72.5 Q53 77.5 56.5 72" fill="none" stroke="#7a4a1a" stroke-width="' + (sw * 0.7) + '" stroke-linecap="round" stroke-linejoin="round"/>');

      default: /* Puff: white lamb, curly cloud wool, small round ears */
        var bumps = [[22, 42, 11], [33, 27, 13], [50, 21, 13.5], [67, 27, 13], [78, 42, 11]];
        var wool = '<ellipse cx="50" cy="58" rx="38" ry="32"/>' + bumps.map(function (b) { return '<circle cx="' + b[0] + '" cy="' + b[1] + '" r="' + b[2] + '"/>'; }).join("");
        return '<g class="kc-ears">' +
          '<ellipse cx="11" cy="59" rx="10" ry="7.5" transform="rotate(-16 11 59)" fill="url(#' + p + 'cream)" ' + S + "/>" +
          '<ellipse cx="12" cy="59.5" rx="5" ry="3.6" transform="rotate(-16 11 59)" fill="#ffc9d9"/>' +
          '<ellipse cx="89" cy="59" rx="10" ry="7.5" transform="rotate(16 89 59)" fill="url(#' + p + 'cream)" ' + S + "/>" +
          '<ellipse cx="88" cy="59.5" rx="5" ry="3.6" transform="rotate(16 89 59)" fill="#ffc9d9"/></g>' +
          '<g fill="url(#' + p + 'fur)" ' + S + ">" + wool + "</g>" +
          '<g fill="url(#' + p + 'fur)" stroke="none">' + wool + "</g>" +
          '<ellipse cx="50" cy="64" rx="29" ry="24" fill="#fff0e2" ' + thin + "/>" +
          blush(72, 21, 0.6) +
          eyePair(62, 4, 5.4, INK, sw, mode, 12) +
          '<ellipse cx="50" cy="70" rx="3.2" ry="2.4" fill="#ff9fbd" stroke="' + INK + '" stroke-width="' + (sw * 0.4) + '"/>' +
          mouth(mode, 73, sw, smile(73, 4.8, sw));
    }
  }

  /* ------------------------------------------------------------------ outfits / colours per character */
  var LOOK = {
    kitty:  { arm: "mint", paw: "fur", leg: "fur", foot: "fur", pads: true },
    melody: { arm: "lilacDress", paw: "cream", leg: "cream", foot: "shoeLilac", pads: false },
    kuromi: { arm: "lilacFur", paw: "lilacFur", leg: "lilacFur", foot: "fur", pads: true },
    purin:  { arm: "furGold", paw: "furGold", leg: "furGold", foot: "furGold", pads: true, padColour: "#b07a3e" },
    cinna:  { arm: "fur", paw: "fur", leg: "fur", foot: "shoeHoof", pads: false }
  };
  var SHOES = { shoeLilac: "#b99af0", shoeHoof: "#d9c3b0" };
  function fill(p, key) {
    if (SHOES[key]) return SHOES[key];
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
        return '<path class="kc-torso" d="' + slim + '" fill="url(#' + p + 'mint)" ' + S + "/>" +
          line("M64,210 C74,222 126,222 136,210", "#fff", 5) +
          D("M82,141 Q100,157 118,141 Q116,153 100,159 Q84,153 82,141 Z", "#fff", SW * 0.55) +
          flower(100, 180 + oy, 0.85);

      case "melody":
        return '<path class="kc-torso" d="' + pth("M73,138 C66,162 54,194 50,211 Q48,225 62,225 L138,225 Q152,225 150,211 C146,194 134,162 127,138 Z") + '" fill="url(#' + p + 'lilacDress)" ' + S + "/>" +
          line("M55,214 Q61,221 67,215 Q73,222 79,215 Q85,222 91,215 Q97,222 103,215 Q109,222 115,215 Q121,222 127,215 Q133,222 139,215 Q144,220 146,214", "#fff", 4.5) +
          D("M83,141 Q100,157 117,141 Q115,153 100,159 Q85,153 83,141 Z", "#fff", SW * 0.55) +
          '<circle cx="100" cy="' + (178 + oy) + '" r="4" fill="#fff" stroke="' + INK + '" stroke-width="2.2"/>' +
          '<circle cx="100" cy="' + (192 + oy) + '" r="4" fill="#fff" stroke="' + INK + '" stroke-width="2.2"/>';

      case "kuromi":
        return '<path class="kc-torso" d="' + slim + '" fill="url(#' + p + 'lilacFur)" ' + S + "/>" +
          '<ellipse cx="100" cy="' + (190 + oy) + '" rx="21" ry="26" fill="#fffafd"/>' +
          '<g transform="translate(100 ' + (160 + oy) + ')"><path d="M0 0 L-19 -10 Q-23 0 -19 10 Z M0 0 L19 -10 Q23 0 19 10 Z" fill="#9a6ae0" stroke="' + INK + '" stroke-width="2.8" stroke-linejoin="round"/>' +
          '<circle r="4.6" fill="#7a4fc0" stroke="' + INK + '" stroke-width="2.4"/></g>';

      case "purin":
        return '<path class="kc-torso" d="' + chubby + '" fill="url(#' + p + 'furGold)" ' + S + "/>" +
          '<ellipse cx="100" cy="' + (200 + oy) + '" rx="26" ry="19" fill="#fff0c4" opacity=".9"/>' +
          D("M68,148 Q100,162 132,148 L100,186 Z", "url(#" + p + "red)", SW * 0.7);

      default: /* cinna: Puff */
        return '<path class="kc-torso" d="' + chubby + '" fill="url(#' + p + 'fur)" ' + S + "/>" +
          D("M70,146 Q100,163 130,146 L132,159 Q100,176 68,159 Z", "url(#" + p + "sky)", SW * 0.7) +
          D("M110,164 L125,198 L111,203 L100,170 Z", "url(#" + p + "sky)", SW * 0.7);
    }
  }

  /* Tail (behind the body). */
  function tail(id, oy, p) {
    var pth = function (d) { return shiftPath(d, oy); };
    if (id === "kuromi") {
      return '<g class="kc-tail"><path d="' + pth("M128,214 C150,232 190,218 186,184 C184,165 168,158 158,164 C166,178 158,196 130,198 Z") + '" fill="url(#' + p + 'lilacFur)" ' + st(SW) + "/>" +
        '<path d="' + pth("M158,164 C168,158 184,165 186,184 C182,180 176,178 170,181 C163,177 160,171 158,164 Z") + '" fill="#fffafd" ' + st(SW * 0.8) + "/></g>";
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
    if (SHOES[look.foot]) {
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
      tail(id, oy, p) + torso(id, p, oy) +
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
