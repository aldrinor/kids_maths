"use strict";
// Plain Node tests for src/modules/brain_games.js (no browser needed).
var B = require("../src/modules/brain_games.js");
var passed = 0, total = 0;
function check(name, fn) {
  total++;
  try {
    var r = fn();
    if (r === true || r === undefined) { passed++; console.log("PASS " + name); }
    else { console.log("FAIL " + name + " | " + r); }
  } catch (e) { console.log("FAIL " + name + " | " + e.message); }
}
function eq(a, b) { return JSON.stringify(a) === JSON.stringify(b) ? true : "got " + JSON.stringify(a) + " want " + JSON.stringify(b); }

check("module loads in Node without DOM", function () {
  if (typeof window !== "undefined" || typeof document !== "undefined") { return "DOM exists"; }
  return typeof B.createBoard === "function" && typeof B.scoreGuess === "function";
});

var CONFIGS = { kennedy: B.BATTLESHIP_DEFAULTS.kennedy, marie: B.BATTLESHIP_DEFAULTS.marie };
Object.keys(CONFIGS).forEach(function (who) {
  var cfg = CONFIGS[who];
  check("ship placement valid, " + who + " grid, 200 seeds", function () {
    for (var seed = 1; seed <= 200; seed++) {
      var ships = B.placeShips(cfg.size, cfg.lengths, B.rngFromSeed(seed)), seen = {};
      if (ships.length !== cfg.lengths.length) { return "seed " + seed + " wrong ship count"; }
      for (var i = 0; i < ships.length; i++) {
        var sh = ships[i];
        if (sh.cells.length !== cfg.lengths[i]) { return "seed " + seed + " wrong length"; }
        var sameRow = true, sameCol = true;
        for (var k = 0; k < sh.cells.length; k++) {
          var r = sh.cells[k][0], c = sh.cells[k][1];
          if (r < 0 || c < 0 || r >= cfg.size || c >= cfg.size) { return "seed " + seed + " off grid"; }
          if (seen[r * cfg.size + c]) { return "seed " + seed + " overlap"; }
          seen[r * cfg.size + c] = true;
          if (r !== sh.cells[0][0]) { sameRow = false; }
          if (c !== sh.cells[0][1]) { sameCol = false; }
          if (k > 0 && Math.abs(r - sh.cells[k - 1][0]) + Math.abs(c - sh.cells[k - 1][1]) !== 1) { return "seed " + seed + " not contiguous"; }
        }
        if (!sameRow && !sameCol) { return "seed " + seed + " not straight"; }
      }
    }
    return true;
  });
  check("smart hints only: full game ends in fewer shots than squares, " + who, function () {
    for (var seed = 1; seed <= 200; seed++) {
      var b = B.createBoard(cfg.size, cfg.lengths, B.rngFromSeed(seed)), guard = 0;
      while (!B.allSunk(b)) {
        var sq = B.smartSquare(b);
        if (!sq) { return "no square, seed " + seed; }
        if (b.grid[sq.r * b.size + sq.c] !== B.CELL_UNTRIED) { return "hint on tried square"; }
        B.fireShot(b, sq.r, sq.c);
        if (++guard > b.size * b.size) { return "loop, seed " + seed; }
      }
      if (b.shots >= b.size * b.size) { return "seed " + seed + " used " + b.shots; }
    }
    return true;
  });
});

check("shot results hit / miss / sunk / repeat", function () {
  var b = B.createBoard(5, [2], B.rngFromSeed(7)), sh = b.ships[0], c0 = sh.cells[0], c1 = sh.cells[1];
  var miss = null;
  for (var r = 0; r < 5 && !miss; r++) {
    for (var c = 0; c < 5; c++) { if (b.owner[r * 5 + c] < 0) { miss = [r, c]; break; } }
  }
  var m = B.fireShot(b, miss[0], miss[1]);
  if (m.result !== "miss") { return "miss was " + m.result; }
  if (B.fireShot(b, miss[0], miss[1]).result !== "repeat") { return "repeat not detected"; }
  if (b.shots !== 1) { return "repeat counted as shot"; }
  var h = B.fireShot(b, c0[0], c0[1]);
  if (h.result !== "hit") { return "hit was " + h.result; }
  var s = B.fireShot(b, c1[0], c1[1]);
  if (s.result !== "sunk" || s.length !== 2) { return "sunk was " + s.result; }
  if (b.grid[c0[0] * 5 + c0[1]] !== B.CELL_SUNK) { return "cells not marked sunk"; }
  return B.allSunk(b) ? true : "allSunk false";
});

check("square names use letter and number", function () { return eq([B.squareName(1, 3), B.squareName(0, 0)], ["B 4", "A 1"]); });

check("smart square has maximal density among untried", function () {
  for (var seed = 1; seed <= 40; seed++) {
    var b = B.createBoard(8, [2, 3, 3, 4], B.rngFromSeed(seed));
    for (var shots = 0; shots < 12 && !B.allSunk(b); shots++) {
      var sq = B.smartSquare(b), d = B.densityMap(b), max = -1;
      for (var i = 0; i < d.length; i++) { if (b.grid[i] === B.CELL_UNTRIED && d[i] > max) { max = d[i]; } }
      if (b.grid[sq.r * 8 + sq.c] !== B.CELL_UNTRIED) { return "tried square"; }
      if (d[sq.r * 8 + sq.c] !== max) { return "not max at seed " + seed; }
      B.fireShot(b, sq.r, sq.c);
    }
  }
  return true;
});

check("coach advice sentences", function () {
  var b = B.createBoard(5, [3], B.rngFromSeed(3)), s = b.ships[0];
  if (B.coachAdvice(b, null) !== "Every ship covers at least 2 squares, so you only need to try every other square.") { return "start"; }
  B.fireShot(b, s.cells[0][0], s.cells[0][1]);
  if (B.coachAdvice(b, "hit") !== "Try the squares next to your hit, up, down, left and right.") { return "near"; }
  B.fireShot(b, s.cells[1][0], s.cells[1][1]);
  if (B.coachAdvice(b, "hit") !== "The ship goes in a line. Keep going the same way.") { return "line"; }
  return true;
});

check("code scoring known cases incl. repeats", function () {
  var cases = [
    [[0, 1, 2, 3], [0, 1, 2, 3], 4, 0],
    [[0, 0, 1, 2], [1, 0, 0, 0], 1, 2],
    [[1, 1, 2, 2], [2, 2, 1, 1], 0, 4],
    [[1, 1, 1, 1], [1, 2, 3, 4], 1, 0],
    [[0, 1, 2], [3, 3, 3], 0, 0],
    [[0, 1, 2], [1, 2, 0], 0, 3],
    [[0, 1, 2, 3], [0, 0, 0, 0], 1, 0]
  ];
  for (var i = 0; i < cases.length; i++) {
    var r = B.scoreGuess(cases[i][0], cases[i][1]);
    if (r.exact !== cases[i][2] || r.partial !== cases[i][3]) { return "case " + i + " got " + r.exact + "/" + r.partial; }
  }
  return true;
});

check("code maker respects repeats rule", function () {
  for (var seed = 1; seed <= 100; seed++) {
    var c = B.makeCode(4, 6, false, B.rngFromSeed(seed));
    if (new Set(c).size !== 4) { return "repeat found without permission"; }
    var d = B.makeCode(4, 6, true, B.rngFromSeed(seed));
    for (var i = 0; i < 4; i++) { if (d[i] < 0 || d[i] > 5) { return "out of range"; } }
  }
  return true;
});

check("code config: sizes and repeats after 3 wins", function () {
  var k = B.codeConfigFor("kennedy", 0), m = B.codeConfigFor("marie", 2), m3 = B.codeConfigFor("marie", 3);
  return eq([k.length, k.colours, k.repeats, m.length, m.colours, m.repeats, m3.repeats], [3, 4, false, 4, 6, false, true]);
});

check("code coach says a colour is not in the code", function () {
  var history = [{ guess: [0, 1, 2], exact: 0, partial: 0 }];
  var f = B.codeDeductions(history, 3, 6, false);
  return f[0].text === "Red is not in the code. You can cross it out." ? true : f[0].text;
});

check("code coach: guessing fitting codes solves every code, texts short", function () {
  for (var seed = 1; seed <= 30; seed++) {
    var code = B.makeCode(4, 6, false, B.rngFromSeed(seed)), hist = [], n = 0;
    while (n < 12) {
      var fits = B.consistentCodes(hist, 4, 6, false);
      if (!fits.length) { return "no fitting code"; }
      var g = fits[0], sc = B.scoreGuess(code, g);
      hist.push({ guess: g, exact: sc.exact, partial: sc.partial }); n++;
      if (sc.exact === 4) { break; }
    }
    if (n >= 12) { return "not solved, seed " + seed; }
    for (var i = 0; i < hist.length; i++) {
      var d = B.codeDeductions(hist.slice(0, i + 1), 4, 6, false);
      if (!d.length || !d[0].text || d[0].text.split(" ").length > 15) { return "bad deduction text"; }
    }
  }
  return true;
});

check("hanoi rejects big disc on small disc", function () {
  var st = B.hanoiNew(3);
  if (!B.hanoiMove(st, 0, 1).ok) { return "legal move refused"; }
  var r = B.hanoiMove(st, 0, 1);
  if (r.ok || r.reason !== "bigger_on_smaller") { return "illegal move allowed"; }
  if (B.hanoiMove(st, 2, 0).reason !== "empty") { return "empty not detected"; }
  return st.moves === 1 ? true : "moves " + st.moves;
});

check("hanoi minimum moves is 2^n-1", function () { return eq([3, 4, 5].map(B.hanoiMinMoves), [7, 15, 31]); });

check("hanoi hints solve in the fewest moves, 3 to 5 discs", function () {
  for (var n = 3; n <= 5; n++) {
    var st = B.hanoiNew(n), guard = 0;
    while (!B.hanoiSolved(st)) {
      var mv = B.hanoiNextMove(st);
      if (!mv || !B.hanoiMove(st, mv[0], mv[1]).ok) { return "bad hint, n=" + n; }
      if (++guard > 100) { return "loop"; }
    }
    if (st.moves !== B.hanoiMinMoves(n)) { return "n=" + n + " used " + st.moves; }
  }
  return true;
});

check("hanoi hints recover after wrong moves", function () {
  var st = B.hanoiNew(4), guard = 0;
  B.hanoiMove(st, 0, 1); B.hanoiMove(st, 0, 2); B.hanoiMove(st, 1, 2); B.hanoiMove(st, 0, 1);
  while (!B.hanoiSolved(st) && guard++ < 100) {
    var mv = B.hanoiNextMove(st);
    if (!B.hanoiMove(st, mv[0], mv[1]).ok) { return "bad hint"; }
  }
  return B.hanoiSolved(st) ? true : "not solved";
});

check("nim perfect strategy leaves a multiple of 4 when possible", function () {
  for (var n = 1; n <= 40; n++) {
    var t = B.nimPerfectMove(n);
    if (t < 1 || t > 3 || t > n) { return "illegal take at " + n; }
    if (n % 4 !== 0 && (n - t) % 4 !== 0) { return "not multiple of 4 at " + n; }
  }
  return true;
});

check("nim random computer plays legal moves only", function () {
  var rng = B.rngFromSeed(5);
  for (var i = 0; i < 500; i++) {
    var n = 1 + (i % 21), t = B.nimComputerMove(n, false, rng);
    if (t < 1 || t > 3 || t > n) { return "illegal " + t + " of " + n; }
  }
  return true;
});

check("nim start counts in range and never a multiple of 4", function () {
  var rng = B.rngFromSeed(11);
  for (var i = 0; i < 300; i++) {
    var k = B.nimStartCount("kennedy", rng), m = B.nimStartCount("marie", rng);
    if (k < 7 || k > 10 || m < 13 || m > 21 || k % 4 === 0 || m % 4 === 0) { return "bad " + k + "/" + m; }
  }
  return true;
});

check("nim coach teaches 4 then 8", function () {
  return eq([B.nimCoach(6, 2), B.nimCoach(10, 3)], ["Try to leave 4 cookies for me.", "Leave 8, then 4."]);
});

check("coach sentences are 15 words or fewer", function () {
  var list = [B.nimCoach(6, 2), B.nimCoach(10, 3), B.nimCoach(18, 3), B.nimCoach(8, 3), B.nimCoach(2, 3), B.nimCoach(9, 0), B.hanoiHintText(B.hanoiNew(3))];
  for (var i = 0; i < list.length; i++) { if (list[i].split(/\s+/).length > 15) { return list[i]; } }
  return true;
});

console.log("RESULT " + passed + "/" + total + " passed");
process.exit(passed === total ? 0 : 1);
