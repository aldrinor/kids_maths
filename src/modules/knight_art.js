/* knight_art.js - chibi drawings for Kennedy's castle world, in the same style as characters.js (KittyChars):
 * big round head, soft gradients, #3b2a33 outline, white eye highlights, rosy cheeks, idle animation classes.
 * Nothing here is scary: no blood, no weapons on the bad guy, swords are toy-like and point up.
 *
 * API (window.KnightArt):
 *   KnightArt.full(id, pose, opts) -> "<svg ...>" string, viewBox 0 0 200 260, centred on x = 100, feet on y = 255.
 *     id "knight" | "buddy": pose stand | wave | happy | push | cheer
 *        opts { armour: bool, plume: bool, shield: bool, sword: "none" | "wood" | "silver" }
 *        (the buddy always carries his round leaf shield unless opts.shield === false)
 *     id "badguy": pose stand | grumpy | tired | runaway
 *     id "horse" (viewBox 0 0 260 260, feet on 255): pose stand | happy
 *   KnightArt.face(id) -> head-only <svg> for small icons.
 *   KnightArt.css / KnightArt.injectCss() -> idle animations (breathing, blinking, waving).
 */
(function () {
  "use strict";

  var INK = "#3b2a33";
  var SW = 4.6;
  var IDS = ["knight", "buddy", "badguy", "horse"];
  var POSES = {
    knight: ["stand", "wave", "happy", "push", "cheer"],
    buddy: ["stand", "wave", "happy", "push", "cheer"],
    badguy: ["stand", "grumpy", "tired", "runaway"],
    horse: ["stand", "happy"]
  };
  var NAMES = { knight: "Knight", buddy: "Buddy knight", badguy: "Grumpy troll", horse: "Pony" };

  var counter = 0;
  function nextPrefix() { counter += 1; return "ka" + counter + "_"; }
  function st(sw) { return 'stroke="' + INK + '" stroke-width="' + sw + '" stroke-linejoin="round" stroke-linecap="round"'; }
  function U(p, k) { return "url(#" + p + k + ")"; }

  function radial(id, stops, cx, cy, r) {
    return '<radialGradient id="' + id + '" cx="' + (cx || "38%") + '" cy="' + (cy || "30%") + '" r="' + (r || "80%") + '">' +
      stops.map(function (s) { return '<stop offset="' + s[0] + '" stop-color="' + s[1] + '"/>'; }).join("") + "</radialGradient>";
  }
  function defs(p) {
    return "<defs>" +
      radial(p + "steel", [[0, "#ffffff"], [0.55, "#e6edf5"], [1, "#a9b8cb"]]) +
      radial(p + "steelDark", [[0, "#dbe3ed"], [1, "#8b9bb2"]]) +
      radial(p + "blue", [[0, "#9bbcff"], [0.6, "#5b8cf2"], [1, "#3b65cc"]]) +
      radial(p + "green", [[0, "#b4f0b0"], [0.6, "#62c987"], [1, "#3ca466"]]) +
      radial(p + "red", [[0, "#ff9090"], [0.7, "#e8506a"], [1, "#c42c4c"]]) +
      radial(p + "skin", [[0, "#fff3e4"], [0.7, "#ffdcc0"], [1, "#f1bd9a"]]) +
      radial(p + "skin2", [[0, "#f9e1c8"], [0.7, "#eac29a"], [1, "#d6a27a"]]) +
      radial(p + "gold", [[0, "#fff3bf"], [0.65, "#ffd66b"], [1, "#e8ad3c"]]) +
      radial(p + "brown", [[0, "#a77b57"], [1, "#6b4630"]]) +
      radial(p + "wood", [[0, "#efcf9c"], [1, "#b88a52"]]) +
      radial(p + "troll", [[0, "#e2f7bb"], [0.65, "#b9d98c"], [1, "#8fb862"]]) +
      radial(p + "purple", [[0, "#bda4e8"], [0.6, "#8d6fc8"], [1, "#6a4fa4"]]) +
      radial(p + "paper", [[0, "#fffbe3"], [1, "#f1d98a"]]) +
      radial(p + "horse", [[0, "#e2aa72"], [0.6, "#bd7d42"], [1, "#935c2c"]]) +
      radial(p + "mane", [[0, "#fffdf5"], [1, "#f0e0bd"]]) +
      '<pattern id="' + p + 'mail" width="7" height="7" patternUnits="userSpaceOnUse"><rect width="7" height="7" fill="#c3cedb"/>' +
      '<circle cx="3.5" cy="3.5" r="2.4" fill="none" stroke="#8795a8" stroke-width="1"/></pattern>' +
      "</defs>";
  }

  function star(x, y, r, sw) {
    var pts = [];
    for (var i = 0; i < 10; i += 1) {
      var a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.46 : r;
      pts.push((x + rr * Math.cos(a)).toFixed(1) + "," + (y + rr * Math.sin(a)).toFixed(1));
    }
    return '<polygon points="' + pts.join(" ") + '" fill="#ffd93d" stroke="#c98f00" stroke-width="' + (sw || 1.6) + '" stroke-linejoin="round"/>';
  }
  function blush(cx, y, dx, rx, ry, op) {
    return '<ellipse cx="' + (cx - dx) + '" cy="' + y + '" rx="' + rx + '" ry="' + ry + '" fill="#ff8fb4" opacity="' + (op || 0.55) + '"/>' +
      '<ellipse cx="' + (cx + dx) + '" cy="' + y + '" rx="' + rx + '" ry="' + ry + '" fill="#ff8fb4" opacity="' + (op || 0.55) + '"/>';
  }
  /* A pair of eyes in the KittyChars style. mode: open | happy | sleepy | closed */
  function eyePair(mode, cx, y, gap, rx, ry) {
    var l = cx - gap, r = cx + gap, sw = 3.6;
    if (mode === "happy") {
      return '<g class="ka-eyes-shut" fill="none" stroke="' + INK + '" stroke-width="' + sw + '" stroke-linecap="round">' +
        '<path d="M' + (l - rx) + " " + (y + 3) + " Q" + l + " " + (y - 10) + " " + (l + rx) + " " + (y + 3) + '"/>' +
        '<path d="M' + (r - rx) + " " + (y + 3) + " Q" + r + " " + (y - 10) + " " + (r + rx) + " " + (y + 3) + '"/></g>';
    }
    if (mode === "closed") {
      return '<g fill="none" stroke="' + INK + '" stroke-width="' + sw + '" stroke-linecap="round">' +
        '<path d="M' + (l - rx) + " " + y + " Q" + l + " " + (y + 7) + " " + (l + rx) + " " + y + '"/>' +
        '<path d="M' + (r - rx) + " " + y + " Q" + r + " " + (y + 7) + " " + (r + rx) + " " + y + '"/></g>';
    }
    if (mode === "sleepy") {
      return '<g fill="' + INK + '">' +
        '<path d="M' + (l - rx) + " " + y + " A" + rx + " " + (ry * 0.62) + " 0 0 0 " + (l + rx) + " " + y + ' Z"/>' +
        '<path d="M' + (r - rx) + " " + y + " A" + rx + " " + (ry * 0.62) + " 0 0 0 " + (r + rx) + " " + y + ' Z"/></g>' +
        '<path d="M' + (l - rx - 2) + " " + y + " H" + (l + rx + 2) + " M" + (r - rx - 2) + " " + y + " H" + (r + rx + 2) + '" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>';
    }
    return '<g class="ka-eyes">' +
      '<ellipse cx="' + l + '" cy="' + y + '" rx="' + rx + '" ry="' + ry + '" fill="' + INK + '"/>' +
      '<ellipse cx="' + r + '" cy="' + y + '" rx="' + rx + '" ry="' + ry + '" fill="' + INK + '"/>' +
      '<circle cx="' + (l + rx * 0.35) + '" cy="' + (y - ry * 0.38) + '" r="' + (rx * 0.4) + '" fill="#fff"/>' +
      '<circle cx="' + (r + rx * 0.35) + '" cy="' + (y - ry * 0.38) + '" r="' + (rx * 0.4) + '" fill="#fff"/>' +
      '<circle cx="' + (l - rx * 0.3) + '" cy="' + (y + ry * 0.4) + '" r="' + (rx * 0.18) + '" fill="#fff" opacity=".85"/>' +
      '<circle cx="' + (r - rx * 0.3) + '" cy="' + (y + ry * 0.4) + '" r="' + (rx * 0.18) + '" fill="#fff" opacity=".85"/></g>';
  }

  /* ------------------------------------------------------------------ hero head (knight / buddy) */
  function heroHead(p, buddy, o, eyes, openMouth) {
    var S = st(SW), thin = st(SW * 0.6);
    var out = "";
    /* tall blue feather (knight) or brush crest (buddy), behind the helmet */
    if (buddy) {
      out += '<path d="M76 40 Q74 6 100 2 Q126 6 124 40 Q100 24 76 40 Z" fill="' + U(p, "red") + '" ' + S + "/>" +
        '<path d="M88 30 Q88 14 100 11 M100 28 Q100 12 100 11 M112 30 Q112 14 100 11" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".6"/>';
    } else if (o.plume) {
      out += '<path d="M104 34 C92 8 112 -4 138 6 C128 8 124 14 124 20 C122 28 116 34 104 34 Z" fill="' + U(p, "blue") + '" ' + S + "/>" +
        '<path d="M106 32 C108 20 118 12 132 8" fill="none" stroke="#dbe8ff" stroke-width="2.6" stroke-linecap="round"/>' +
        '<path d="M96 36 C86 14 96 0 110 -2 C104 8 108 22 108 34 Z" fill="' + U(p, "blue") + '" ' + thin + "/>";
    }
    /* helmet dome */
    out += '<circle cx="100" cy="82" r="57" fill="' + U(p, "steel") + '" ' + S + "/>";
    /* face opening (visor raised) */
    out += '<ellipse cx="100" cy="95" rx="42" ry="37" fill="' + U(p, buddy ? "skin2" : "skin") + '" ' + S + "/>";
    out += blush(100, 108, 27, 9, 5.2, 0.6);
    out += eyePair(eyes, 100, 92, 19, 6.6, 8.8);
    out += '<ellipse cx="100" cy="103" rx="2.6" ry="2" fill="#e49a80"/>';
    out += openMouth
      ? '<path d="M90 110 Q100 130 110 110 Z" fill="#e8546f" ' + st(SW * 0.55) + '/><path d="M94 118 Q100 124 106 118 Q100 114 94 118 Z" fill="#ff9fb0"/>'
      : '<path d="M91 111 Q100 121 109 111" fill="none" stroke="' + INK + '" stroke-width="3.2" stroke-linecap="round"/>';
    /* raised visor: a curved plate above the face, with hinge rivets */
    out += '<path d="M54 82 Q54 52 100 48 Q146 52 146 82 Q100 62 54 82 Z" fill="' + U(p, "steelDark") + '" ' + S + "/>" +
      '<path d="M66 66 Q100 52 134 66" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".55"/>' +
      '<circle cx="56" cy="80" r="4.6" fill="' + U(p, "gold") + '" stroke="' + INK + '" stroke-width="2.2"/>' +
      '<circle cx="144" cy="80" r="4.6" fill="' + U(p, "gold") + '" stroke="' + INK + '" stroke-width="2.2"/>';
    /* helmet shine, centre ridge and knob */
    out += '<path d="M100 26 L100 48" stroke="#a9b8cb" stroke-width="3.4" stroke-linecap="round"/>' +
      '<ellipse cx="72" cy="46" rx="14" ry="7" transform="rotate(-38 72 46)" fill="#fff" opacity=".7"/>' +
      '<circle cx="100" cy="26" r="6.4" fill="' + U(p, "gold") + '" stroke="' + INK + '" stroke-width="2.4"/>';
    if (buddy) out += '<circle cx="100" cy="59" r="4.4" fill="' + U(p, "green") + '" stroke="' + INK + '" stroke-width="2"/>';
    return out;
  }

  /* ------------------------------------------------------------------ hero body */
  function shield(p, buddy) {
    if (buddy) {
      return '<circle r="26" fill="' + U(p, "wood") + '" ' + st(SW) + "/>" +
        '<circle r="20" fill="none" stroke="#e6edf5" stroke-width="3.4"/>' +
        '<path d="M0 -14 C15 -8 15 8 0 15 C-15 8 -15 -8 0 -14 Z" fill="' + U(p, "green") + '" ' + st(2.6) + "/>" +
        '<path d="M0 -10 V12" stroke="#fff" stroke-width="1.8" stroke-linecap="round" opacity=".8"/>';
    }
    return '<path d="M-23 -25 H23 V4 Q23 22 0 31 Q-23 22 -23 4 Z" fill="' + U(p, "red") + '" ' + st(SW) + "/>" +
      '<path d="M-17 -19 H17 V3 Q17 17 0 24 Q-17 17 -17 3 Z" fill="none" stroke="#e6edf5" stroke-width="3"/>' +
      star(0, -3, 12, 1.6);
  }
  function sword(p, kind) {
    var blade = kind === "silver" ? U(p, "steel") : U(p, "wood");
    return '<rect x="-3.4" y="-6" width="6.8" height="18" rx="3" fill="' + U(p, "brown") + '" ' + st(2.6) + "/>" +
      '<path d="M-5.5 -10 L-5.5 -60 Q0 -72 5.5 -60 L5.5 -10 Z" fill="' + blade + '" ' + st(3.2) + "/>" +
      '<path d="M-2 -14 L-2 -56" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".8"/>' +
      '<rect x="-14" y="-12" width="28" height="7" rx="3.5" fill="' + U(p, "gold") + '" ' + st(3) + "/>" +
      '<circle cx="0" cy="13" r="4.4" fill="' + U(p, "gold") + '" ' + st(2.4) + "/>";
  }
  function arm(cls, sx, sy, deg, sleeve, hand, extra) {
    return '<g class="ka-arm ' + cls + '" style="transform-origin:' + sx + "px " + sy + 'px">' +
      '<g transform="translate(' + sx + " " + sy + ") rotate(" + deg + ')">' +
      '<path d="M-10 0 L-10 20 A10 10 0 0 0 10 20 L10 0 A10 10 0 0 0 -10 0 Z" fill="' + sleeve + '" ' + st(SW) + "/>" +
      '<circle cx="0" cy="28" r="11.5" fill="' + hand + '" ' + st(SW) + "/>" + (extra || "") + "</g></g>";
  }

  var HERO_POSE = {
    stand: { l: 20, r: -20, oy: 0, eyes: "open" },
    wave: { l: 20, r: -142, frontR: true, oy: 0, eyes: "open" },
    happy: { l: 46, r: -46, oy: -6, eyes: "happy", mouth: true },
    push: { l: -52, r: 52, frontL: true, frontR: true, oy: 0, eyes: "open", hands: true },
    cheer: { l: 150, r: -150, frontR: true, oy: -9, eyes: "happy", mouth: true }
  };

  function hero(id, pose, opts) {
    var buddy = id === "buddy";
    var o = opts || {};
    var P = HERO_POSE[pose] || HERO_POSE.stand;
    var p = nextPrefix();
    var plate = !!o.armour;
    var hasShield = buddy ? o.shield !== false : !!o.shield;
    var swordKind = o.sword === "wood" || o.sword === "silver" ? o.sword : "none";
    if (P.hands) { hasShield = false; swordKind = "none"; }
    var S = st(SW), thin = st(2.6);
    var tunic = plate ? U(p, "steel") : U(p, buddy ? "green" : "blue");
    var sleeve = plate ? U(p, "steel") : U(p, "mail");
    var lPose = P.l, frontL = !!P.frontL;
    if (pose === "cheer" && hasShield) { lPose = 26; }
    else if (pose === "cheer") { frontL = true; }
    var frontR = !!P.frontR || swordKind !== "none";

    /* arms */
    var shieldExtra = hasShield ? '<g transform="translate(0 28) rotate(' + (-lPose) + ') translate(-9 -2)">' + shield(p, buddy) + "</g>" : "";
    var swordExtra = swordKind !== "none" ? '<g transform="translate(0 28) rotate(' + (-P.r + 22) + ')">' + sword(p, swordKind) + "</g>" : "";
    var aL = arm("ka-arm-l", 73, 160, lPose, sleeve, U(p, "skin"), shieldExtra);
    var aR = arm("ka-arm-r", 127, 160, P.r, sleeve, U(p, "skin"), swordExtra);
    if (hasShield && !frontL) { frontL = false; }

    /* cape (behind) */
    var cape = '<path d="M70 144 C50 172 44 210 38 238 Q54 246 70 240 Q86 248 100 242 Q114 248 130 240 Q146 246 162 238 C156 210 150 172 130 144 Z" fill="' + U(p, "red") + '" ' + S + "/>" +
      '<path d="M82 150 C70 186 66 214 62 236" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".28"/>';

    /* mail skirt peeking under the tunic, then the tunic or plate */
    var skirt = '<path d="M62 206 C72 226 128 226 138 206 L142 224 C128 240 72 240 58 224 Z" fill="' + (plate ? U(p, "steelDark") : U(p, "mail")) + '" ' + S + "/>";
    var torso = '<path d="M72 138 C58 160 56 198 60 218 C72 232 128 232 140 218 C144 198 142 160 128 138 Z" fill="' + tunic + '" ' + S + "/>";
    var detail;
    if (plate) {
      detail = '<path d="M100 142 L100 196" stroke="#a9b8cb" stroke-width="3.4" stroke-linecap="round"/>' +
        '<path d="M66 190 Q100 202 134 190" fill="none" stroke="#8b9bb2" stroke-width="3.4" stroke-linecap="round"/>' +
        '<path d="M64 206 Q100 218 136 206" fill="none" stroke="#8b9bb2" stroke-width="3.4" stroke-linecap="round"/>' +
        '<ellipse cx="82" cy="166" rx="9" ry="16" transform="rotate(14 82 166)" fill="#fff" opacity=".75"/>' +
        star(100, 168, 12, 1.6);
    } else {
      detail = '<ellipse cx="82" cy="166" rx="8" ry="16" transform="rotate(14 82 166)" fill="#fff" opacity=".3"/>' +
        '<path d="M64 214 Q100 228 136 214" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".45"/>' +
        '<path d="M92 142 Q100 152 108 142" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".5"/>' +
        star(100, 168, 14, 1.8);
    }
    /* belt */
    detail += '<path d="M59 193 Q100 204 141 193 L141 205 Q100 216 59 205 Z" fill="' + U(p, "brown") + '" ' + st(3.6) + "/>" +
      '<rect x="91" y="196" width="18" height="15" rx="4" fill="' + U(p, "gold") + '" ' + st(3) + "/>" +
      '<rect x="96" y="201" width="8" height="5" rx="1.5" fill="#fff6c8" opacity=".9"/>';
    var pauldrons = plate
      ? '<circle cx="68" cy="148" r="14" fill="' + U(p, "steel") + '" ' + st(SW) + '/><circle cx="132" cy="148" r="14" fill="' + U(p, "steel") + '" ' + st(SW) + "/>" +
        '<circle cx="64" cy="143" r="4" fill="#fff" opacity=".8"/><circle cx="128" cy="143" r="4" fill="#fff" opacity=".8"/>'
      : "";

    /* legs and boots */
    function leg(sx) {
      return '<path d="M' + (sx - 10) + " 226 L" + (sx - 10) + " 238 A10 10 0 0 0 " + (sx + 10) + " 238 L" + (sx + 10) + ' 226 Z" fill="' + (plate ? U(p, "steel") : U(p, "mail")) + '" ' + S + "/>" +
        '<path d="M' + (sx - 15) + " 244 C" + (sx - 15) + " 232 " + (sx + 15) + " 232 " + (sx + 15) + " 244 C" + (sx + 19) + " 250 " + (sx + 17) + " 255 " + (sx + 10) + " 255 L" + (sx - 12) + " 255 C" + (sx - 19) + " 255 " + (sx - 19) + " 249 " + (sx - 15) + ' 244 Z" fill="' + U(p, "brown") + '" ' + S + "/>" +
        '<path d="M' + (sx - 10) + " 238 Q" + sx + " 243 " + (sx + 10) + ' 238" fill="none" stroke="#e9d3b8" stroke-width="3" stroke-linecap="round"/>';
    }
    var legs = leg(84) + leg(116);

    var head = '<g class="ka-look"><g class="ka-head">' + heroHead(p, buddy, o, P.eyes, !!P.mouth) + "</g></g>";
    var body = '<g class="ka-body" style="transform-origin:100px 232px">' + cape + skirt + torso + detail +
      (frontL ? "" : aL) + (frontR ? "" : aR) + pauldrons + head + (frontL ? aL : "") + (frontR ? aR : "") + "</g>";
    var shadow = '<ellipse class="ka-shadow" cx="100" cy="252" rx="54" ry="6" fill="#3b2a33" opacity=".16"/>';
    var label = NAMES[id] + " " + pose;
    return '<svg class="ka ka-' + id + " ka-pose-" + pose + '" viewBox="0 0 200 260" role="img" aria-label="' + label + '" xmlns="http://www.w3.org/2000/svg">' +
      defs(p) + shadow + '<g class="ka-jump" transform="translate(0 ' + P.oy + ')">' + legs + body + "</g></svg>";
  }

  /* ------------------------------------------------------------------ bad guy: a cute grumpy troll */
  function trollHead(p, pose) {
    var S = st(SW), thin = st(2.8);
    var turn = pose === "runaway" ? 17 : 0; /* face features slide toward the way he walks */
    var tired = pose === "tired";
    var out = "";
    /* ears */
    out += '<path d="M50 80 Q18 66 6 38 Q36 36 58 62 Z" fill="' + U(p, "troll") + '" ' + S + "/>" +
      '<path d="M44 72 Q26 62 18 46 Q34 48 48 62 Z" fill="#ffb4c4"/>';
    out += '<path d="M150 80 Q182 66 194 38 Q164 36 142 62 Z" fill="' + U(p, "troll") + '" ' + S + "/>" +
      '<path d="M156 72 Q174 62 182 46 Q166 48 152 62 Z" fill="#ffb4c4"/>';
    /* head */
    out += '<ellipse cx="100" cy="86" rx="58" ry="50" fill="' + U(p, "troll") + '" ' + S + "/>";
    out += '<ellipse cx="74" cy="60" rx="14" ry="7" transform="rotate(-30 74 60)" fill="#fff" opacity=".45"/>';
    /* cheeks, nose, freckles */
    out += blush(100 + turn, 108, 30, 9, 5.4, 0.5);
    out += '<ellipse cx="' + (100 + turn) + '" cy="101" rx="12" ry="9.5" fill="#a5cc72" ' + st(2.8) + "/>" +
      '<circle cx="' + (95 + turn) + '" cy="103" r="1.9" fill="' + INK + '" opacity=".6"/><circle cx="' + (105 + turn) + '" cy="103" r="1.9" fill="' + INK + '" opacity=".6"/>' +
      '<circle cx="' + (68 + turn) + '" cy="96" r="1.8" fill="#7ea34f"/><circle cx="' + (74 + turn) + '" cy="100" r="1.8" fill="#7ea34f"/>';
    /* eyes */
    var ey = pose === "runaway" ? 86 : 88;
    if (tired) out += eyePair("sleepy", 100, ey, 22, 7, 9);
    else out += eyePair("open", 100 + turn, ey, pose === "runaway" ? 19 : 22, 7, 9);
    /* brows and mouth */
    if (tired) {
      out += '<path d="M62 76 Q72 72 86 78 M114 78 Q128 72 138 76" fill="none" stroke="' + INK + '" stroke-width="3.4" stroke-linecap="round"/>' +
        '<ellipse cx="100" cy="122" rx="6.5" ry="8" fill="#7a3f55" ' + st(2.8) + "/>";
    } else if (pose === "runaway") {
      out += '<path d="M' + (66 + turn) + " 74 Q" + (76 + turn) + " 70 " + (90 + turn) + " 76 M" + (112 + turn) + " 76 Q" + (124 + turn) + " 70 " + (134 + turn) + ' 74" fill="none" stroke="' + INK + '" stroke-width="3.4" stroke-linecap="round"/>' +
        '<path d="M' + (90 + turn) + " 123 Q" + (98 + turn) + " 117 " + (108 + turn) + ' 122" fill="none" stroke="' + INK + '" stroke-width="3.2" stroke-linecap="round"/>';
    } else {
      out += '<path d="M62 74 L90 84 M138 74 L110 84" fill="none" stroke="' + INK + '" stroke-width="4.2" stroke-linecap="round"/>' +
        '<path d="M88 124 Q100 114 112 124" fill="none" stroke="' + INK + '" stroke-width="3.4" stroke-linecap="round"/>';
    }
    return out;
  }
  function crown(p, pose) {
    var rot = pose === "tired" ? 24 : pose === "runaway" ? -20 : -14;
    var dy = pose === "tired" ? 4 : 0;
    return '<g transform="translate(0 ' + dy + ") rotate(" + rot + ' 100 50)">' +
      '<path d="M66 54 L66 22 L82 38 L96 12 L110 38 L128 18 L134 54 Q100 64 66 54 Z" fill="' + U(p, "paper") + '" ' + st(SW) + "/>" +
      '<path d="M68 44 Q100 54 132 44" fill="none" stroke="#e0bd55" stroke-width="3" stroke-linecap="round" stroke-dasharray="1 7"/>' +
      '<circle cx="82" cy="50" r="4" fill="#ff6b8a" stroke="' + INK + '" stroke-width="1.8"/><circle cx="100" cy="53" r="4" fill="#6aa8ff" stroke="' + INK + '" stroke-width="1.8"/><circle cx="118" cy="50" r="4" fill="#7ed99a" stroke="' + INK + '" stroke-width="1.8"/>' +
      '<path d="M96 12 L99 20" stroke="#caa94a" stroke-width="2" stroke-linecap="round"/></g>';
  }
  function badguy(pose) {
    var p = nextPrefix(), S = st(SW);
    if (pose !== "grumpy" && pose !== "tired" && pose !== "runaway") pose = "stand";
    var look = pose === "stand" ? "grumpy" : pose;
    var run = pose === "runaway", tired = pose === "tired";
    var oy = tired ? 4 : 0;
    /* cloak (the body) */
    var cloak = run
      ? '<path d="M78 126 C60 170 36 218 14 236 Q40 248 64 240 Q90 250 112 242 Q134 244 142 232 C148 200 140 160 124 126 Z" fill="' + U(p, "purple") + '" ' + S + "/>"
      : '<path d="M72 126 C52 170 44 222 40 240 Q60 250 80 242 Q100 252 120 242 Q140 250 160 240 C156 222 148 170 128 126 Z" fill="' + U(p, "purple") + '" ' + S + "/>";
    var cloakFx = '<ellipse cx="82" cy="180" rx="9" ry="22" transform="rotate(14 82 180)" fill="#fff" opacity=".22"/>' +
      '<path d="M86 150 Q100 162 114 150" fill="none" stroke="#e8dcff" stroke-width="3.4" stroke-linecap="round"/>' +
      '<circle cx="' + (run ? 98 : 100) + '" cy="158" r="6.5" fill="' + U(p, "gold") + '" ' + st(2.8) + "/>";
    /* feet */
    function foot(x, lift) {
      return '<ellipse cx="' + x + '" cy="' + (246 - lift) + '" rx="17" ry="9" fill="' + U(p, "brown") + '" ' + S + "/>";
    }
    var feet = run ? foot(78, 0) + foot(122, 9) : foot(80, 0) + foot(120, 0);
    /* hands: fists in front, small and round */
    function hand(x, y) { return '<circle cx="' + x + '" cy="' + y + '" r="11.5" fill="' + U(p, "troll") + '" ' + S + "/>"; }
    var hands;
    if (tired) hands = hand(52, 214) + hand(148, 214);
    else if (run) hands = hand(60, 204) + hand(138, 192);
    else hands = hand(62, 196) + hand(138, 196);
    var zz = tired
      ? '<text x="150" y="40" font-size="26" font-weight="800" fill="' + INK + '" font-family="sans-serif">z</text><text x="168" y="22" font-size="19" font-weight="800" fill="' + INK + '" font-family="sans-serif">z</text>'
      : "";
    var sweat = run
      ? '<path d="M46 62 Q38 76 46 82 Q56 76 46 62 Z" fill="#9fd4ff" ' + st(2.8) + '/><ellipse cx="45" cy="76" rx="2.2" ry="3.2" fill="#fff" opacity=".8"/>'
      : "";
    var tilt = tired ? 7 : run ? 5 : 0;
    var head = '<g class="ka-look"><g transform="rotate(' + tilt + ' 100 140)">' + trollHead(p, look) + crown(p, pose) + "</g></g>";
    var body = '<g class="ka-body" style="transform-origin:100px 244px"><g transform="translate(0 ' + oy + ')">' + feet + cloak + cloakFx + hands + head + sweat + "</g></g>";
    var shadow = '<ellipse class="ka-shadow" cx="100" cy="252" rx="56" ry="6" fill="#3b2a33" opacity=".16"/>';
    return '<svg class="ka ka-badguy ka-pose-' + pose + '" viewBox="0 0 200 260" role="img" aria-label="Grumpy troll ' + pose + '" xmlns="http://www.w3.org/2000/svg">' +
      defs(p) + shadow + body + zz + "</svg>";
  }

  /* ------------------------------------------------------------------ horse */
  function horseHead(p, happy) {
    var S = st(SW), thin = st(2.6);
    var out = "";
    /* far ear, mane behind */
    out += '<path d="M200 52 L222 24 L228 62 Z" fill="' + U(p, "horse") + '" ' + S + "/>";
    out += '<path d="M138 170 C112 130 124 72 168 40 C160 66 174 76 192 58 C192 96 170 122 166 152 Z" fill="' + U(p, "mane") + '" ' + S + "/>";
    /* neck */
    out += '<path d="M140 196 C142 146 160 112 184 100 L228 124 C216 150 216 182 204 216 Z" fill="' + U(p, "horse") + '" ' + S + "/>";
    /* head */
    out += '<circle cx="196" cy="100" r="46" fill="' + U(p, "horse") + '" ' + S + "/>";
    out += '<ellipse cx="170" cy="82" rx="12" ry="6" transform="rotate(-35 170 82)" fill="#fff" opacity=".35"/>';
    /* near ear */
    out += '<path d="M168 66 L172 28 L198 56 Z" fill="' + U(p, "horse") + '" ' + S + "/>" +
      '<path d="M174 56 L176 38 L188 54 Z" fill="#ffb4c4"/>';
    /* muzzle */
    out += '<ellipse cx="222" cy="122" rx="25" ry="19" fill="#fdeccf" ' + S + "/>" +
      '<ellipse cx="230" cy="116" rx="2.8" ry="3.8" fill="' + INK + '"/><ellipse cx="216" cy="114" rx="2.4" ry="3.4" fill="' + INK + '" opacity=".85"/>';
    out += happy
      ? '<path d="M208 128 Q222 144 238 126 Z" fill="#e8546f" ' + st(2.8) + '/><path d="M216 134 Q224 141 232 133 Q224 130 216 134 Z" fill="#ff9fb0"/>'
      : '<path d="M208 128 Q222 140 238 128" fill="none" stroke="' + INK + '" stroke-width="3.2" stroke-linecap="round"/>';
    /* eye + cheek + forelock */
    out += happy
      ? '<path d="M188 102 Q202 84 216 102" fill="none" stroke="' + INK + '" stroke-width="3.8" stroke-linecap="round"/>'
      : '<g class="ka-eyes"><ellipse cx="202" cy="100" rx="9" ry="12" fill="' + INK + '"/><circle cx="205" cy="94" r="4" fill="#fff"/><circle cx="198" cy="106" r="1.8" fill="#fff" opacity=".85"/></g>';
    out += '<ellipse cx="184" cy="118" rx="10" ry="6" fill="#ff8fb4" opacity=".55"/>';
    out += '<path d="M176 60 C172 76 186 80 194 66 C200 76 212 70 208 58 C196 50 184 52 176 60 Z" fill="' + U(p, "mane") + '" ' + S + "/>";
    return out;
  }
  function horse(pose) {
    var p = nextPrefix(), S = st(SW);
    var happy = pose === "happy";
    function leg(x, rot) {
      return '<g transform="rotate(' + (rot || 0) + " " + x + ' 204)"><path d="M' + (x - 11) + " 204 L" + (x - 11) + " 240 L" + (x + 11) + " 240 L" + (x + 11) + ' 204 Z" fill="' + U(p, "horse") + '" ' + S + "/>" +
        '<path d="M' + (x - 11) + " 228 H" + (x + 11) + " V240 H" + (x - 11) + ' Z" fill="#fdeccf" stroke="' + INK + '" stroke-width="3"/>' +
        '<ellipse cx="' + x + '" cy="247" rx="15" ry="8" fill="#5a4030" ' + S + "/></g>";
    }
    var tail = '<path d="M60 150 C20 144 12 190 30 220 C38 204 46 196 62 188 Z" fill="' + U(p, "mane") + '" ' + S + "/>";
    var body = '<ellipse cx="118" cy="190" rx="74" ry="44" fill="' + U(p, "horse") + '" ' + S + "/>" +
      '<ellipse cx="96" cy="170" rx="22" ry="9" transform="rotate(-10 96 170)" fill="#fff" opacity=".28"/>';
    var blanket = '<path d="M84 152 Q118 138 152 154 L156 190 Q118 202 80 190 Z" fill="' + U(p, "blue") + '" ' + S + "/>" +
      '<path d="M82 184 Q118 196 154 184" fill="none" stroke="#ffd66b" stroke-width="4" stroke-linecap="round"/>' +
      star(118, 168, 12, 1.6);
    var saddle = '<path d="M96 154 Q118 134 142 154 Q118 162 96 154 Z" fill="' + U(p, "brown") + '" ' + S + "/>";
    return '<svg class="ka ka-horse ka-pose-' + pose + '" viewBox="0 0 260 260" role="img" aria-label="Pony ' + pose + '" xmlns="http://www.w3.org/2000/svg">' +
      defs(p) + '<ellipse class="ka-shadow" cx="130" cy="252" rx="100" ry="6" fill="#3b2a33" opacity=".16"/>' +
      '<g class="ka-body" style="transform-origin:130px 250px">' + tail + leg(68) + leg(98) + leg(160, happy ? -16 : 0) + leg(188) + body + blanket + horseHead(p, happy) + "</g></svg>";
  }

  /* ------------------------------------------------------------------ public API */
  function full(id, pose, opts) {
    if (IDS.indexOf(id) < 0) id = "knight";
    if (id === "horse") return horse(pose);
    if (id === "badguy") return badguy(pose);
    return hero(id, pose, opts);
  }
  function face(id) {
    if (IDS.indexOf(id) < 0) id = "knight";
    var p = nextPrefix();
    var box, inner;
    if (id === "badguy") { box = "4 4 192 142"; inner = trollHead(p, "grumpy") + crown(p, "grumpy"); }
    else if (id === "horse") { box = "140 18 112 142"; inner = horseHead(p, false); }
    else { box = "36 -4 128 146"; inner = heroHead(p, id === "buddy", { plume: id === "knight" }, "open", false); }
    return '<svg class="ka ka-face ka-' + id + '" viewBox="' + box + '" style="overflow:hidden" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">' + defs(p) + inner + "</svg>";
  }

  var CSS = [
    ".ka{overflow:visible;display:block}",
    ".ka .ka-body,.ka .ka-arm,.ka .ka-jump{transform-box:view-box}",
    ".ka .ka-body{animation:ka-breathe 3.8s ease-in-out infinite}",
    ".ka .ka-eyes{transform-box:fill-box;transform-origin:50% 50%;animation:ka-blink 5.4s linear infinite}",
    ".ka-pose-wave .ka-arm-r{animation:ka-wave 2.2s ease-in-out infinite}",
    ".ka-pose-cheer .ka-arm-r{animation:ka-cheer 1s ease-in-out infinite}",
    ".ka-pose-happy .ka-jump,.ka-pose-cheer .ka-jump{animation:ka-hop 2.2s ease-in-out infinite}",
    "@keyframes ka-breathe{0%,100%{transform:scaleY(1)}50%{transform:scaleY(1.02)}}",
    "@keyframes ka-blink{0%,92%,100%{transform:scaleY(1)}95%{transform:scaleY(.1)}}",
    "@keyframes ka-wave{0%,55%,100%{transform:rotate(0deg)}14%{transform:rotate(-12deg)}28%{transform:rotate(6deg)}42%{transform:rotate(-12deg)}}",
    "@keyframes ka-cheer{0%,100%{transform:rotate(0deg)}50%{transform:rotate(-10deg)}}",
    "@keyframes ka-hop{0%,40%,100%{transform:translateY(0)}20%{transform:translateY(-6px)}}",
    "@media (prefers-reduced-motion: reduce){.ka,.ka *{animation:none!important;transition:none!important}}"
  ].join("\n");

  function injectCss() {
    if (typeof document === "undefined" || document.getElementById("knight-art-css") || !document.head) return;
    var s = document.createElement("style");
    s.id = "knight-art-css";
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  window.KnightArt = { full: full, face: face, css: CSS, injectCss: injectCss, ids: IDS.slice(), poses: POSES, names: NAMES };
  injectCss();
})();
