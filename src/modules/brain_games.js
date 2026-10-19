/* brain_games.js - Kids Maths THINKING GAMES (vanilla JS, no libraries, no network).
 *
 * Registers four games on window.BrainGames:
 *   battleship (Ship hunt), codebreaker (Code breaker), hanoi (Tower move), nim (Last cookie).
 * Each: { id, title, open(container, opts), close() }
 *   opts = { who: "marie"|"kennedy"|"demo", speak(text), store: { get(), set(obj) }, onExit() }
 *
 * Saved data lives in store under  obj.brain[who]  (per child), for example:
 *   battleship_best, battleship_size (parent may set 4..10; also obj.brain.battleship_size for all),
 *   codebreaker_wins, codebreaker_best, hanoi_n, hanoi_wins, nim_wins, nim_games.
 *
 * In Node the pure logic is exported through module.exports and no DOM code runs.
 * Calm design: no sound, no timers, no flashing, no streaks.
 */
(function () {
  "use strict";

  /* =====================================================================
   * PURE LOGIC
   * ===================================================================== */

  var ROW_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

  function rngFromSeed(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function randInt(rng, n) { return Math.floor(rng() * n); }

  /* ---------- Ship hunt ---------- */

  var BATTLESHIP_DEFAULTS = {
    kennedy: { size: 5, lengths: [2, 2, 3] },
    marie: { size: 8, lengths: [2, 3, 3, 4] },
    demo: { size: 5, lengths: [2, 2, 3] }
  };
  var CELL_UNTRIED = 0, CELL_MISS = 1, CELL_HIT = 2, CELL_SUNK = 3;

  function shipLengthsForSize(size) {
    if (size <= 5) { return [2, 2, 3]; }
    if (size <= 7) { return [2, 3, 3]; }
    return [2, 3, 3, 4];
  }

  function squareName(r, c) { return ROW_LETTERS.charAt(r) + " " + (c + 1); }

  function placeShips(size, lengths, rng) {
    var attempt, i, tries, ships, taken, len, horiz, r, c, k, cells, ok;
    for (attempt = 0; attempt < 500; attempt++) {
      ships = [];
      taken = {};
      ok = true;
      for (i = 0; i < lengths.length && ok; i++) {
        len = lengths[i];
        ok = false;
        for (tries = 0; tries < 300 && !ok; tries++) {
          horiz = rng() < 0.5;
          r = randInt(rng, horiz ? size : size - len + 1);
          c = randInt(rng, horiz ? size - len + 1 : size);
          cells = [];
          ok = true;
          for (k = 0; k < len; k++) {
            var rr = horiz ? r : r + k, cc = horiz ? c + k : c;
            if (taken[rr * size + cc]) { ok = false; break; }
            cells.push([rr, cc]);
          }
        }
        if (ok) {
          for (k = 0; k < cells.length; k++) { taken[cells[k][0] * size + cells[k][1]] = true; }
          ships.push({ id: i, length: len, cells: cells, hits: 0 });
        }
      }
      if (ok) { return ships; }
    }
    throw new Error("Could not place ships on a " + size + " by " + size + " grid");
  }

  function createBoard(size, lengths, rng) {
    var ships = placeShips(size, lengths, rng);
    var grid = [], owner = [], i, k;
    for (i = 0; i < size * size; i++) { grid.push(CELL_UNTRIED); owner.push(-1); }
    for (i = 0; i < ships.length; i++) {
      for (k = 0; k < ships[i].cells.length; k++) {
        owner[ships[i].cells[k][0] * size + ships[i].cells[k][1]] = i;
      }
    }
    return { size: size, ships: ships, grid: grid, owner: owner, shots: 0 };
  }

  function fireShot(board, r, c) {
    var n = board.size;
    if (r < 0 || c < 0 || r >= n || c >= n) { throw new Error("Shot is outside the grid"); }
    var idx = r * n + c;
    if (board.grid[idx] !== CELL_UNTRIED) { return { result: "repeat" }; }
    board.shots++;
    var o = board.owner[idx];
    if (o < 0) { board.grid[idx] = CELL_MISS; return { result: "miss" }; }
    var ship = board.ships[o];
    board.grid[idx] = CELL_HIT;
    ship.hits++;
    if (ship.hits >= ship.length) {
      for (var k = 0; k < ship.cells.length; k++) {
        board.grid[ship.cells[k][0] * n + ship.cells[k][1]] = CELL_SUNK;
      }
      return { result: "sunk", shipId: ship.id, length: ship.length };
    }
    return { result: "hit", shipId: ship.id };
  }

  function isShipSunk(ship) { return ship.hits >= ship.length; }
  function allSunk(board) {
    for (var i = 0; i < board.ships.length; i++) { if (!isShipSunk(board.ships[i])) { return false; } }
    return true;
  }
  function remainingLengths(board) {
    var out = [];
    for (var i = 0; i < board.ships.length; i++) {
      if (!isShipSunk(board.ships[i])) { out.push(board.ships[i].length); }
    }
    return out;
  }

  /* Probability density: for each untried square, how many ways can a hidden ship cover it.
     Placements that already contain an unsunk hit count much more (hunt mode). */
  function densityMap(board) {
    var n = board.size, dens = [], i, li, len, dir, r, c, k, ok, hitsIn, cells, rem = remainingLengths(board);
    for (i = 0; i < n * n; i++) { dens.push(0); }
    for (li = 0; li < rem.length; li++) {
      len = rem[li];
      for (dir = 0; dir < 2; dir++) {
        for (r = 0; r < (dir === 0 ? n : n - len + 1); r++) {
          for (c = 0; c < (dir === 0 ? n - len + 1 : n); c++) {
            ok = true; hitsIn = 0; cells = [];
            for (k = 0; k < len; k++) {
              var idx = (dir === 0 ? r : r + k) * n + (dir === 0 ? c + k : c);
              var g = board.grid[idx];
              if (g === CELL_MISS || g === CELL_SUNK) { ok = false; break; }
              if (g === CELL_HIT) { hitsIn++; }
              cells.push(idx);
            }
            if (!ok) { continue; }
            var w = 1 + 100 * hitsIn;
            for (k = 0; k < cells.length; k++) {
              if (board.grid[cells[k]] === CELL_UNTRIED) { dens[cells[k]] += w; }
            }
          }
        }
      }
    }
    return dens;
  }

  function smartSquare(board) {
    var n = board.size, dens = densityMap(board), best = -1, bestIdx = -1, i, r, c, score, par;
    for (i = 0; i < n * n; i++) {
      if (board.grid[i] !== CELL_UNTRIED) { continue; }
      r = Math.floor(i / n); c = i % n;
      par = ((r + c) % 2 === 0) ? 0.5 : 0; /* checkerboard tie-break */
      score = dens[i] + par;
      if (score > best) { best = score; bestIdx = i; }
    }
    if (bestIdx < 0) { return null; }
    return { r: Math.floor(bestIdx / n), c: bestIdx % n, density: dens[bestIdx] };
  }

  function unsunkHits(board) {
    var out = [], n = board.size, i;
    for (i = 0; i < n * n; i++) { if (board.grid[i] === CELL_HIT) { out.push([Math.floor(i / n), i % n]); } }
    return out;
  }

  var BS_SENTENCES = {
    start: "Every ship covers at least 2 squares, so you only need to try every other square.",
    near: "Try the squares next to your hit, up, down, left and right.",
    line: "The ship goes in a line. Keep going the same way.",
    sunk: "You sank a ship. Now look for the next one."
  };

  function coachAdvice(board, lastResult) {
    if (board.shots === 0) { return BS_SENTENCES.start; }
    var hits = unsunkHits(board), i, j;
    if (hits.length === 0) {
      if (lastResult === "sunk") { return BS_SENTENCES.sunk; }
      return BS_SENTENCES.start;
    }
    for (i = 0; i < hits.length; i++) {
      for (j = i + 1; j < hits.length; j++) {
        var dr = Math.abs(hits[i][0] - hits[j][0]), dc = Math.abs(hits[i][1] - hits[j][1]);
        if ((dr === 1 && dc === 0) || (dr === 0 && dc === 1)) { return BS_SENTENCES.line; }
      }
    }
    return BS_SENTENCES.near;
  }

  /* ---------- Code breaker ---------- */

  var BEAD_COLOURS = [
    { name: "Red", letter: "R", shape: "circle", fill: "#f4a3a3" },
    { name: "Blue", letter: "B", shape: "square", fill: "#9cc7ef" },
    { name: "Green", letter: "G", shape: "triangle", fill: "#9fd9b3" },
    { name: "Yellow", letter: "Y", shape: "diamond", fill: "#f5dc86" },
    { name: "Purple", letter: "P", shape: "hexagon", fill: "#c6b4ee" },
    { name: "Orange", letter: "O", shape: "star", fill: "#f4b183" }
  ];

  function codeConfigFor(who, wins) {
    var kennedy = (who !== "marie");
    return {
      length: kennedy ? 3 : 4,
      colours: kennedy ? 4 : 6,
      repeats: wins >= 3
    };
  }

  function makeCode(length, colours, repeats, rng) {
    var code = [], pool = [], i, pick;
    if (repeats) {
      for (i = 0; i < length; i++) { code.push(randInt(rng, colours)); }
      return code;
    }
    for (i = 0; i < colours; i++) { pool.push(i); }
    for (i = 0; i < length; i++) {
      pick = randInt(rng, pool.length);
      code.push(pool[pick]);
      pool.splice(pick, 1);
    }
    return code;
  }

  function scoreGuess(code, guess) {
    var exact = 0, cc = {}, gc = {}, i, key, common = 0;
    for (i = 0; i < code.length; i++) {
      if (code[i] === guess[i]) { exact++; }
      else {
        cc[code[i]] = (cc[code[i]] || 0) + 1;
        gc[guess[i]] = (gc[guess[i]] || 0) + 1;
      }
    }
    for (key in cc) {
      if (Object.prototype.hasOwnProperty.call(cc, key) && gc[key]) { common += Math.min(cc[key], gc[key]); }
    }
    return { exact: exact, partial: common };
  }

  function consistentCodes(history, length, colours, repeats) {
    var out = [], total = Math.pow(colours, length), i, j, code, d, v, ok, s;
    for (i = 0; i < total; i++) {
      code = []; v = i;
      for (d = 0; d < length; d++) { code.push(v % colours); v = Math.floor(v / colours); }
      if (!repeats) {
        var seen = {}, dup = false;
        for (d = 0; d < length; d++) { if (seen[code[d]]) { dup = true; } seen[code[d]] = true; }
        if (dup) { continue; }
      }
      ok = true;
      for (j = 0; j < history.length && ok; j++) {
        s = scoreGuess(code, history[j].guess);
        if (s.exact !== history[j].exact || s.partial !== history[j].partial) { ok = false; }
      }
      if (ok) { out.push(code); }
    }
    return out;
  }

  /* Returns a list of { key, text } deductions, best first. Always at least one item. */
  function codeDeductions(history, length, colours, repeats) {
    var facts = [], fits = consistentCodes(history, length, colours, repeats), c, p, i, allSame, inAll;
    if (history.length === 0) {
      return [{ key: "start", text: "Pick beads, then press Check. I will give you clues." }];
    }
    if (fits.length === 1) {
      facts.push({ key: "only", text: "Only one code fits all the clues. Try it." });
    }
    var lastGuess = history[history.length - 1].guess;
    var order = [], seenC = {};
    for (i = 0; i < lastGuess.length; i++) { if (!seenC[lastGuess[i]]) { seenC[lastGuess[i]] = 1; order.push(lastGuess[i]); } }
    for (c = 0; c < colours; c++) { if (!seenC[c]) { order.push(c); } }
    for (i = 0; i < order.length; i++) {
      c = order[i];
      var present = false;
      for (p = 0; p < fits.length; p++) { if (fits[p].indexOf(c) >= 0) { present = true; break; } }
      if (!present && fits.length > 0) {
        facts.push({ key: "no" + c, text: BEAD_COLOURS[c].name + " is not in the code. You can cross it out." });
      }
    }
    if (fits.length > 0) {
      for (p = 0; p < length; p++) {
        allSame = true;
        for (i = 1; i < fits.length; i++) { if (fits[i][p] !== fits[0][p]) { allSame = false; break; } }
        if (allSame) {
          facts.push({ key: "pos" + p, text: BEAD_COLOURS[fits[0][p]].name + " goes in place " + (p + 1) + "." });
        }
      }
      for (c = 0; c < colours; c++) {
        inAll = true;
        for (i = 0; i < fits.length; i++) { if (fits[i].indexOf(c) < 0) { inAll = false; break; } }
        if (inAll) { facts.push({ key: "in" + c, text: BEAD_COLOURS[c].name + " is in the code." }); }
      }
    }
    facts.push({ key: "left" + fits.length, text: fits.length + " codes still fit. Try a guess that fits every clue." });
    return facts;
  }

  function clueWords(exact, partial) {
    var parts = [];
    if (exact > 0) { parts.push(exact + " right colour, right place"); }
    if (partial > 0) { parts.push(partial + " right colour, wrong place"); }
    if (!parts.length) { return "no beads match"; }
    return parts.join("; ");
  }

  /* ---------- Tower move (Hanoi) ---------- */

  function hanoiNew(n) {
    var first = [], d;
    for (d = n; d >= 1; d--) { first.push(d); }
    return { n: n, pegs: [first, [], []], moves: 0 };
  }

  function hanoiMinMoves(n) { return Math.pow(2, n) - 1; }

  function hanoiMove(state, from, to) {
    if (from < 0 || from > 2 || to < 0 || to > 2) { return { ok: false, reason: "range" }; }
    if (from === to) { return { ok: false, reason: "same" }; }
    var src = state.pegs[from], dst = state.pegs[to];
    if (!src.length) { return { ok: false, reason: "empty" }; }
    var disc = src[src.length - 1];
    if (dst.length && dst[dst.length - 1] < disc) { return { ok: false, reason: "bigger_on_smaller" }; }
    src.pop(); dst.push(disc); state.moves++;
    return { ok: true, disc: disc };
  }

  function hanoiSolved(state) { return state.pegs[2].length === state.n; }

  function hanoiPegOf(state, d) {
    for (var p = 0; p < 3; p++) { if (state.pegs[p].indexOf(d) >= 0) { return p; } }
    return -1;
  }

  /* Best next move toward the third tower, from any legal position. Returns [from, to] or null. */
  function hanoiNextMove(state) {
    function rec(k, target) {
      if (k === 0) { return null; }
      var p = hanoiPegOf(state, k);
      if (p === target) { return rec(k - 1, target); }
      var other = 3 - p - target;
      if (k === 1) { return [p, target]; }
      for (var d = 1; d < k; d++) { if (hanoiPegOf(state, d) !== other) { return rec(k - 1, other); } }
      return [p, target];
    }
    return rec(state.n, 2);
  }

  function discLabel(d, n) {
    if (d === 1) { return "smallest disc"; }
    if (d === n) { return "biggest disc"; }
    return "disc " + d;
  }

  function hanoiHintText(state) {
    var mv = hanoiNextMove(state);
    if (!mv) { return "All the discs are on the last tower."; }
    var top = state.pegs[mv[0]][state.pegs[mv[0]].length - 1];
    return "Move the " + discLabel(top, state.n) + " from tower " + (mv[0] + 1) + " to tower " + (mv[1] + 1) + ".";
  }

  /* ---------- Last cookie (Nim) ---------- */

  function nimRange(who) { return who === "marie" ? [13, 21] : [7, 10]; }

  /* Start counts are never a multiple of 4, so the child (who goes first) can always win. */
  function nimStartCount(who, rng) {
    var r = nimRange(who), opts = [], n;
    for (n = r[0]; n <= r[1]; n++) { if (n % 4 !== 0) { opts.push(n); } }
    return opts[randInt(rng, opts.length)];
  }

  function nimPerfectMove(n) {
    var m = n % 4;
    return m === 0 ? 1 : m;
  }

  function nimComputerMove(n, perfect, rng) {
    if (perfect) { return nimPerfectMove(n); }
    return 1 + randInt(rng, Math.min(3, n));
  }

  function nimCoach(n, gamesPlayed) {
    if (n <= 3) { return "Take all the cookies. You win."; }
    if (gamesPlayed < 2) { return "Take 1, 2 or 3 cookies. Whoever takes the last one wins."; }
    if (n >= 5 && n <= 7) { return "Try to leave 4 cookies for me."; }
    if (n === 4) { return "I will take some. Then you take the rest."; }
    if (n % 4 === 0) { return "Take 1 and wait. Next time leave a multiple of 4."; }
    if (n <= 11) { return "Leave 8, then 4."; }
    return "Leave a number from the 4 times table: 4, 8, 12, 16.";
  }

  /* =====================================================================
   * EXPORT FOR NODE
   * ===================================================================== */

  var api = {
    rngFromSeed: rngFromSeed,
    BATTLESHIP_DEFAULTS: BATTLESHIP_DEFAULTS,
    CELL_UNTRIED: CELL_UNTRIED, CELL_MISS: CELL_MISS, CELL_HIT: CELL_HIT, CELL_SUNK: CELL_SUNK,
    shipLengthsForSize: shipLengthsForSize,
    squareName: squareName,
    placeShips: placeShips,
    createBoard: createBoard,
    fireShot: fireShot,
    allSunk: allSunk,
    remainingLengths: remainingLengths,
    densityMap: densityMap,
    smartSquare: smartSquare,
    coachAdvice: coachAdvice,
    BEAD_COLOURS: BEAD_COLOURS,
    codeConfigFor: codeConfigFor,
    makeCode: makeCode,
    scoreGuess: scoreGuess,
    consistentCodes: consistentCodes,
    codeDeductions: codeDeductions,
    clueWords: clueWords,
    hanoiNew: hanoiNew,
    hanoiMinMoves: hanoiMinMoves,
    hanoiMove: hanoiMove,
    hanoiSolved: hanoiSolved,
    hanoiNextMove: hanoiNextMove,
    hanoiHintText: hanoiHintText,
    nimStartCount: nimStartCount,
    nimPerfectMove: nimPerfectMove,
    nimComputerMove: nimComputerMove,
    nimCoach: nimCoach
  };
  if (typeof module === "object" && module.exports) { module.exports = api; }

  if (typeof window === "undefined" || typeof document === "undefined") { return; }

  /* =====================================================================
   * DOM PART (browser only)
   * ===================================================================== */

  var CSS = [
    ".bg-wrap{max-width:520px;margin:0 auto;padding:12px 16px 20px;box-sizing:border-box;background:#fffaf3;color:#3b2a33;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;font-size:17px;line-height:1.4}",
    ".bg-wrap *{box-sizing:border-box}",
    ".bg-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px}",
    ".bg-title{margin:0;font-size:21px;font-weight:600}",
    ".bg-btn{font:inherit;color:#3b2a33;background:#e3d9fb;border:2px solid #3b2a33;border-radius:12px;padding:8px 14px;min-height:44px;cursor:pointer}",
    ".bg-btn:hover{background:#d6c9f6}",
    ".bg-btn:focus-visible,.bg-cell:focus-visible,.bg-tower:focus-visible,.bg-bead:focus-visible{outline:3px solid #3b2a33;outline-offset:2px}",
    ".bg-btn.bg-small{min-height:40px;padding:4px 12px;background:#cfe6fb}",
    ".bg-btn.bg-mint{background:#c9ecd9}",
    ".bg-btn.bg-sun{background:#ffe9a8}",
    ".bg-btn[aria-disabled=true]{opacity:.55;cursor:default}",
    ".bg-coach{min-height:3.2em;margin:10px 0 0;padding:10px 12px;background:#ffe9a8;border-radius:12px}",
    ".bg-info{margin:6px 0;font-size:16px}",
    ".bg-row{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0}",
    ".bg-end{margin-top:10px;padding:12px;background:#c9ecd9;border-radius:12px}",
    ".bg-end p{margin:0 0 8px}",
    /* ship hunt */
    ".bg-grid{display:grid;grid-template-columns:1.5em repeat(var(--n),minmax(0,1fr));gap:3px;max-width:440px;margin:6px auto;align-items:center}",
    ".bg-axis{text-align:center;font-size:14px;font-weight:600;color:#3b2a33}",
    ".bg-cell{aspect-ratio:1;min-width:0;padding:0;background:#cfe6fb;border:2px solid #3b2a33;border-radius:8px;cursor:pointer;display:flex;align-items:center;justify-content:center}",
    ".bg-cell[aria-disabled=true]{cursor:default}",
    ".bg-cell.bg-miss{background:#fffaf3;border-color:#c9c2c6}",
    ".bg-dot{width:34%;height:34%;border-radius:50%;background:#c9c2c6;display:block}",
    ".bg-cell.bg-hit{background:#f4b183}",
    ".bg-cell.bg-sunk{background:#fffaf3;border:3px solid #3b2a33}",
    ".bg-mark{width:55%;height:55%;border-radius:50%;background:#f4b183;border:2px solid #3b2a33;display:block}",
    ".bg-cell.bg-sunk .bg-mark{border-radius:4px}",
    ".bg-cell.bg-hint{border:4px dashed #3b2a33;background:#e3d9fb}",
    ".bg-tracker{list-style:none;margin:6px 0;padding:10px 12px;background:#e3d9fb;border-radius:12px}",
    ".bg-tracker li{display:flex;align-items:center;gap:8px;margin:4px 0;font-size:16px}",
    ".bg-block{display:inline-block;width:18px;height:18px;border:2px solid #3b2a33;border-radius:4px;background:#f4b183}",
    ".bg-tracker .bg-found .bg-block{background:#fffaf3}",
    ".bg-tracker .bg-found span.bg-tname{text-decoration:line-through}",
    /* code breaker */
    ".bg-slots,.bg-palette{display:flex;flex-wrap:wrap;gap:8px;margin:8px 0}",
    ".bg-bead{width:52px;height:52px;padding:0;border:2px solid #3b2a33;border-radius:12px;background:#fffaf3;cursor:pointer;display:flex;align-items:center;justify-content:center}",
    ".bg-bead svg{width:42px;height:42px;display:block}",
    ".bg-bead.bg-empty{border-style:dashed;background:#cfe6fb}",
    ".bg-table{width:100%;border-collapse:collapse;margin-top:8px;font-size:15px}",
    ".bg-table th,.bg-table td{border-bottom:2px solid #e3d9fb;padding:6px 4px;text-align:left;vertical-align:middle}",
    ".bg-mini{display:inline-flex;gap:3px;vertical-align:middle}",
    ".bg-mini svg{width:26px;height:26px;display:block}",
    ".bg-sym{font-size:19px;letter-spacing:2px;white-space:nowrap}",
    /* hanoi */
    ".bg-towers{display:flex;gap:8px;margin:8px 0}",
    ".bg-tower{flex:1 1 0;min-width:0;height:200px;padding:6px 2px;background:#cfe6fb;border:2px solid #3b2a33;border-radius:12px;cursor:pointer;position:relative;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;gap:3px;font:inherit;color:#3b2a33}",
    ".bg-tower.bg-picked{background:#ffe9a8;border-width:4px}",
    ".bg-pole{position:absolute;bottom:0;left:50%;width:10px;margin-left:-5px;height:85%;background:#3b2a33;opacity:.25;border-radius:5px}",
    ".bg-disc{position:relative;height:28px;border:2px solid #3b2a33;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:600}",
    ".bg-towname{position:absolute;top:4px;left:0;right:0;text-align:center;font-size:14px;font-weight:600}",
    /* nim */
    ".bg-cookies{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0;min-height:44px}",
    ".bg-cookies svg{width:34px;height:34px;display:block}"
  ].join("\n");

  function injectCss() {
    if (document.getElementById("brain-css")) { return; }
    var st = document.createElement("style");
    st.id = "brain-css";
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  /* ---------- saved data helpers ---------- */

  function whoOf(opts) { return (opts && opts.who) || "demo"; }

  function readAll(opts) {
    try {
      var s = opts.store && opts.store.get ? opts.store.get() : null;
      return (s && typeof s === "object") ? s : {};
    } catch (e) { return {}; }
  }

  function readBrain(opts) {
    var s = readAll(opts), b = (s.brain && typeof s.brain === "object") ? s.brain : {};
    var mine = (b[whoOf(opts)] && typeof b[whoOf(opts)] === "object") ? b[whoOf(opts)] : {};
    return { mine: mine, shared: b };
  }

  function saveBrain(opts, patch) {
    try {
      var s = readAll(opts);
      if (!s.brain || typeof s.brain !== "object") { s.brain = {}; }
      var w = whoOf(opts);
      s.brain[w] = Object.assign({}, s.brain[w] || {}, patch);
      if (opts.store && opts.store.set) { opts.store.set(s); }
    } catch (e) { /* saving is a nice extra; the game still works */ }
  }

  /* ---------- game runtime ---------- */

  function makeRuntime(container, opts, title) {
    injectCss();
    var speakFn = typeof opts.speak === "function" ? opts.speak : function () {};
    container.innerHTML =
      '<div class="bg-wrap"><div class="bg-head"><h2 class="bg-title">' + esc(title) + '</h2>' +
      '<button type="button" class="bg-btn bg-small" data-act="exit">Exit</button></div>' +
      '<div class="bg-body"></div><p class="bg-coach" aria-live="polite"></p></div>';
    var rt = {
      container: container,
      opts: opts,
      who: whoOf(opts),
      body: container.querySelector(".bg-body"),
      coachEl: container.querySelector(".bg-coach"),
      lastSaid: "",
      onAct: function () {},
      say: function (text) {
        if (text === rt.lastSaid) { return; }
        rt.lastSaid = text;
        rt.coachEl.textContent = text;
        try { speakFn(text); } catch (e) { /* speech is optional */ }
      },
      paint: function (html) {
        var active = document.activeElement, key = null;
        if (active && container.contains(active) && active.getAttribute) { key = active.getAttribute("data-k"); }
        rt.body.innerHTML = html;
        if (key) {
          var again = rt.body.querySelector('[data-k="' + key + '"]');
          if (again && again.focus) { try { again.focus(); } catch (e) { /* ignore */ } }
        }
      },
      handler: function (ev) {
        var t = ev.target;
        var b = t && t.closest ? t.closest("button[data-act]") : null;
        if (!b || !container.contains(b)) { return; }
        if (b.getAttribute("aria-disabled") === "true") { return; }
        var act = b.getAttribute("data-act");
        if (act === "exit") { if (typeof opts.onExit === "function") { opts.onExit(); } return; }
        rt.onAct(act, b);
      },
      destroy: function () {
        container.removeEventListener("click", rt.handler);
        container.innerHTML = "";
      }
    };
    container.addEventListener("click", rt.handler);
    return rt;
  }

  function makeGame(id, title, start) {
    var current = null;
    var game = {
      id: id,
      title: title,
      open: function (container, opts) {
        game.close();
        opts = opts || {};
        current = makeRuntime(container, opts, title);
        start(current);
      },
      close: function () {
        if (current) { current.destroy(); current = null; }
      }
    };
    return game;
  }

  function endPanel(text) {
    return '<div class="bg-end"><p>' + esc(text) + '</p><div class="bg-row">' +
      '<button type="button" class="bg-btn bg-mint" data-act="again" data-k="again">Play again</button>' +
      '<button type="button" class="bg-btn" data-act="exit" data-k="exit2">Exit</button></div></div>';
  }

  /* ---------- Ship hunt UI ---------- */

  function startBattleship(rt) {
    var brain = readBrain(rt.opts);
    var def = BATTLESHIP_DEFAULTS[rt.who] || BATTLESHIP_DEFAULTS.demo;
    var size = def.size, lengths = def.lengths;
    var custom = Number(brain.mine.battleship_size || brain.shared.battleship_size);
    if (custom >= 4 && custom <= 10) { size = Math.floor(custom); lengths = shipLengthsForSize(size); }
    var s = null;

    function newGame() {
      var seed = (Date.now() ^ Math.floor(Math.random() * 4294967296)) >>> 0;
      s = { board: createBoard(size, lengths, rngFromSeed(seed)), hint: null, ended: false, summary: "", last: null };
      rt.lastSaid = "";
      rt.say(coachAdvice(s.board, null));
      draw();
    }

    function cellHtml(r, c) {
      var b = s.board, g = b.grid[r * b.size + c], nm = squareName(r, c), cls = "bg-cell", label, inner = "", aria = "";
      if (g === CELL_MISS) { cls += " bg-miss"; label = nm + ", missed"; inner = '<span class="bg-dot"></span>'; aria = ' aria-disabled="true"'; }
      else if (g === CELL_HIT) { cls += " bg-hit"; label = nm + ", hit a ship"; inner = '<span class="bg-mark"></span>'; aria = ' aria-disabled="true"'; }
      else if (g === CELL_SUNK) { cls += " bg-sunk"; label = nm + ", part of a ship you sank"; inner = '<span class="bg-mark"></span>'; aria = ' aria-disabled="true"'; }
      else {
        label = nm + ", not tried yet";
        if (s.ended) { aria = ' aria-disabled="true"'; }
        if (s.hint && s.hint.r === r && s.hint.c === c) { cls += " bg-hint"; label += ", smart square"; }
      }
      return '<button type="button" class="' + cls + '" data-act="shoot" data-r="' + r + '" data-c="' + c +
        '" data-k="c' + r + "_" + c + '" aria-label="' + esc(label) + '"' + aria + ">" + inner + "</button>";
    }

    function draw() {
      var b = s.board, n = b.size, h = '<div class="bg-grid" style="--n:' + n + '" role="group" aria-label="Sea grid">', r, c, i;
      h += '<span class="bg-axis"></span>';
      for (c = 0; c < n; c++) { h += '<span class="bg-axis" aria-hidden="true">' + (c + 1) + "</span>"; }
      for (r = 0; r < n; r++) {
        h += '<span class="bg-axis" aria-hidden="true">' + ROW_LETTERS.charAt(r) + "</span>";
        for (c = 0; c < n; c++) { h += cellHtml(r, c); }
      }
      h += "</div>";
      h += '<p class="bg-info">Shots used: ' + b.shots + ". Best: " + (brain.mine.battleship_best ? brain.mine.battleship_best + " shots" : "not set yet") + ".</p>";
      h += '<ul class="bg-tracker" aria-label="Ship tracker"><li><strong>Ship tracker</strong></li>';
      for (i = 0; i < b.ships.length; i++) {
        var sh = b.ships[i], blocks = "", k;
        for (k = 0; k < sh.length; k++) { blocks += '<span class="bg-block"></span>'; }
        h += '<li class="' + (isShipSunk(sh) ? "bg-found" : "") + '">' + blocks + '<span class="bg-tname">Ship of ' + sh.length + (isShipSunk(sh) ? ": found" : ": hidden") + "</span></li>";
      }
      h += "</ul>";
      if (s.ended) { h += endPanel(s.summary); }
      else { h += '<div class="bg-row"><button type="button" class="bg-btn bg-sun" data-act="hint" data-k="hint">Show me a smart square</button></div>'; }
      rt.paint(h);
    }

    rt.onAct = function (act, btn) {
      if (act === "again") { newGame(); return; }
      if (s.ended) { return; }
      if (act === "hint") {
        var sq = smartSquare(s.board);
        if (sq) {
          s.hint = { r: sq.r, c: sq.c };
          rt.say("Try " + squareName(sq.r, sq.c) + ". Many ship spots pass through it.");
          draw();
        }
        return;
      }
      if (act === "shoot") {
        var r = Number(btn.getAttribute("data-r")), c = Number(btn.getAttribute("data-c"));
        var res = fireShot(s.board, r, c);
        if (res.result === "repeat") { return; }
        s.hint = null;
        s.last = res.result;
        if (allSunk(s.board)) {
          var n = s.board.shots, prev = Number(brain.mine.battleship_best) || 0, best = (prev && prev < n) ? prev : n;
          brain.mine.battleship_best = best;
          saveBrain(rt.opts, { battleship_best: best });
          s.ended = true;
          s.summary = "You found all ships in " + n + " shots. Your best is " + best + ".";
          rt.say(s.summary);
        } else {
          rt.say(coachAdvice(s.board, res.result));
        }
        draw();
      }
    };

    newGame();
  }

  /* ---------- Code breaker UI ---------- */

  function beadSvg(ci, size) {
    var col = BEAD_COLOURS[ci], ink = "#3b2a33", sh;
    switch (col.shape) {
      case "circle": sh = '<circle cx="20" cy="20" r="16"'; break;
      case "square": sh = '<rect x="5" y="5" width="30" height="30" rx="4"'; break;
      case "triangle": sh = '<polygon points="20,4 36,35 4,35"'; break;
      case "diamond": sh = '<polygon points="20,3 37,20 20,37 3,20"'; break;
      case "hexagon": sh = '<polygon points="11,4 29,4 38,20 29,36 11,36 2,20"'; break;
      default: sh = '<polygon points="20,3 25,15 38,15 28,23 32,36 20,28 8,36 12,23 2,15 15,15"';
    }
    var ty = col.shape === "triangle" ? 30 : 26;
    return '<svg viewBox="0 0 40 40" aria-hidden="true" focusable="false"' + (size ? ' width="' + size + '" height="' + size + '"' : "") + ">" +
      sh + ' fill="' + col.fill + '" stroke="' + ink + '" stroke-width="2"/>' +
      '<text x="20" y="' + ty + '" text-anchor="middle" font-size="15" font-weight="700" fill="' + ink + '" font-family="system-ui,sans-serif">' + col.letter + "</text></svg>";
  }

  function startCodebreaker(rt) {
    var brain = readBrain(rt.opts);
    var s = null;

    function newGame() {
      var wins = Number(brain.mine.codebreaker_wins) || 0, cfg = codeConfigFor(rt.who, wins);
      var seed = (Date.now() ^ Math.floor(Math.random() * 4294967296)) >>> 0;
      s = {
        cfg: cfg,
        code: makeCode(cfg.length, cfg.colours, cfg.repeats, rngFromSeed(seed)),
        history: [], current: [], told: {}, ended: false, summary: ""
      };
      rt.lastSaid = "";
      rt.say(cfg.repeats ? "A colour can be used twice now. Pick beads, then press Check." :
        "Pick " + cfg.length + " beads, then press Check. I give clues.");
      draw();
    }

    function draw() {
      var cfg = s.cfg, h = "", i;
      h += '<p class="bg-info">The secret code has ' + cfg.length + " beads from " + cfg.colours + " colours. " +
        (cfg.repeats ? "A colour may be used twice." : "No colour is used twice.") + "</p>";
      if (!s.ended) {
        h += '<div class="bg-slots" role="group" aria-label="Your guess">';
        for (i = 0; i < cfg.length; i++) {
          var has = i < s.current.length;
          h += '<button type="button" class="bg-bead' + (has ? "" : " bg-empty") + '" data-act="slot" data-i="' + i + '" data-k="s' + i + '" aria-label="' +
            (has ? "Place " + (i + 1) + ", " + BEAD_COLOURS[s.current[i]].name + ". Tap to remove." : "Place " + (i + 1) + ", empty") + '">' +
            (has ? beadSvg(s.current[i]) : "") + "</button>";
        }
        h += "</div>";
        h += '<div class="bg-palette" role="group" aria-label="Bead colours">';
        for (i = 0; i < cfg.colours; i++) {
          h += '<button type="button" class="bg-bead" data-act="colour" data-i="' + i + '" data-k="p' + i + '" aria-label="' + BEAD_COLOURS[i].name + ' bead, letter ' + BEAD_COLOURS[i].letter + '">' + beadSvg(i) + "</button>";
        }
        h += "</div>";
        h += '<div class="bg-row"><button type="button" class="bg-btn bg-mint" data-act="check" data-k="check">Check my guess</button>' +
          '<button type="button" class="bg-btn" data-act="clear" data-k="clear">Clear</button></div>';
      } else {
        h += '<p class="bg-info">The secret code was:</p><div class="bg-mini">';
        for (i = 0; i < s.code.length; i++) { h += beadSvg(s.code[i]); }
        h += "</div>";
      }
      h += '<table class="bg-table"><caption class="bg-info" style="text-align:left">Your guesses so far: ' + s.history.length + "</caption>" +
        '<thead><tr><th scope="col">#</th><th scope="col">Guess</th><th scope="col">Clues</th></tr></thead><tbody>';
      for (i = 0; i < s.history.length; i++) {
        var row = s.history[i], g = "", names = [], k, sym = "";
        for (k = 0; k < row.guess.length; k++) { g += beadSvg(row.guess[k]); names.push(BEAD_COLOURS[row.guess[k]].name); }
        for (k = 0; k < row.exact; k++) { sym += "●"; }
        for (k = 0; k < row.partial; k++) { sym += "○"; }
        h += '<tr><th scope="row">' + (i + 1) + '</th><td><span class="bg-mini" role="img" aria-label="' + esc(names.join(", ")) + '">' + g + "</span></td>" +
          '<td><span class="bg-sym" aria-hidden="true">' + sym + "</span><br>" + esc(clueWords(row.exact, row.partial)) + "</td></tr>";
      }
      h += "</tbody></table>";
      h += '<p class="bg-info">● means right colour, right place. ○ means right colour, wrong place.</p>';
      if (s.ended) { h += endPanel(s.summary); }
      rt.paint(h);
    }

    rt.onAct = function (act, btn) {
      if (act === "again") { newGame(); return; }
      if (s.ended) { return; }
      var cfg = s.cfg;
      if (act === "colour") {
        if (s.current.length < cfg.length) { s.current.push(Number(btn.getAttribute("data-i"))); draw(); }
      } else if (act === "slot") {
        var i = Number(btn.getAttribute("data-i"));
        if (i < s.current.length) { s.current.splice(i, 1); draw(); }
      } else if (act === "clear") {
        s.current = []; draw();
      } else if (act === "check") {
        if (s.current.length < cfg.length) { rt.say("Fill all " + cfg.length + " places first."); return; }
        var guess = s.current.slice(), sc = scoreGuess(s.code, guess);
        s.history.push({ guess: guess, exact: sc.exact, partial: sc.partial });
        s.current = [];
        if (sc.exact === cfg.length) {
          var wins = (Number(brain.mine.codebreaker_wins) || 0) + 1, n = s.history.length;
          var prev = Number(brain.mine.codebreaker_best) || 0, best = (prev && prev < n) ? prev : n;
          brain.mine.codebreaker_wins = wins; brain.mine.codebreaker_best = best;
          saveBrain(rt.opts, { codebreaker_wins: wins, codebreaker_best: best });
          s.ended = true;
          s.summary = "You cracked the code in " + n + (n === 1 ? " guess" : " guesses") + ". Your best is " + best + ".";
          rt.say(s.summary);
        } else {
          var facts = codeDeductions(s.history, cfg.length, cfg.colours, cfg.repeats), pick = facts[facts.length - 1], j;
          for (j = 0; j < facts.length; j++) { if (!s.told[facts[j].key]) { pick = facts[j]; break; } }
          s.told[pick.key] = true;
          rt.say(pick.text);
        }
        draw();
      }
    };

    newGame();
  }

  /* ---------- Tower move UI ---------- */

  var DISC_FILLS = ["#ffd6e3", "#c9ecd9", "#cfe6fb", "#e3d9fb", "#ffe9a8"];

  function startHanoi(rt) {
    var brain = readBrain(rt.opts);
    var s = null;

    function discCountNow() {
      if (rt.who !== "marie") { return 3; }
      var n = Number(brain.mine.hanoi_n) || 3;
      return Math.max(3, Math.min(5, Math.floor(n)));
    }

    function newGame() {
      s = { st: hanoiNew(discCountNow()), picked: -1, ended: false, summary: "" };
      rt.lastSaid = "";
      rt.say("Tap a tower to lift its top disc. Tap another tower to drop it.");
      draw();
    }

    function draw() {
      var st = s.st, h = "", p, i;
      h += '<p class="bg-info">Move all ' + st.n + " discs to tower 3. Moves: " + st.moves + ". The fewest possible is " + hanoiMinMoves(st.n) + ".</p>";
      h += '<div class="bg-towers" role="group" aria-label="Towers">';
      for (p = 0; p < 3; p++) {
        var stack = st.pegs[p], inner = "", label;
        for (i = stack.length - 1; i >= 0; i--) {
          var d = stack[i], w = 30 + Math.round((d / st.n) * 62);
          inner += '<span class="bg-disc" style="width:' + w + '%;background:' + DISC_FILLS[(d - 1) % DISC_FILLS.length] + '">' + d + "</span>";
        }
        label = "Tower " + (p + 1) + ", " + (stack.length ? stack.length + (stack.length === 1 ? " disc" : " discs") + ", top disc is " + stack[stack.length - 1] + " of " + st.n : "empty");
        if (s.picked === p) { label += ", lifted"; }
        h += '<button type="button" class="bg-tower' + (s.picked === p ? " bg-picked" : "") + '" data-act="tower" data-i="' + p + '" data-k="t' + p + '" aria-label="' + esc(label) + '"' +
          (s.ended ? ' aria-disabled="true"' : "") + '><span class="bg-pole"></span><span class="bg-towname">Tower ' + (p + 1) + "</span>" + inner + "</button>";
      }
      h += "</div>";
      if (s.ended) { h += endPanel(s.summary); }
      else { h += '<div class="bg-row"><button type="button" class="bg-btn bg-sun" data-act="hint" data-k="hint">Show me the next move</button></div>'; }
      rt.paint(h);
    }

    rt.onAct = function (act, btn) {
      if (act === "again") { newGame(); return; }
      if (s.ended) { return; }
      if (act === "hint") { rt.say(hanoiHintText(s.st)); return; }
      if (act !== "tower") { return; }
      var p = Number(btn.getAttribute("data-i"));
      if (s.picked < 0) {
        if (!s.st.pegs[p].length) { rt.say("That tower is empty. Pick a tower with a disc."); return; }
        s.picked = p; draw(); return;
      }
      if (s.picked === p) { s.picked = -1; draw(); return; }
      var res = hanoiMove(s.st, s.picked, p);
      if (!res.ok) {
        if (res.reason === "bigger_on_smaller") { rt.say("A big disc cannot sit on a small disc. Try another tower."); }
        s.picked = -1; draw(); return;
      }
      s.picked = -1;
      if (hanoiSolved(s.st)) {
        var min = hanoiMinMoves(s.st.n), moves = s.st.moves, patch = {};
        s.ended = true;
        if (moves === min) {
          s.summary = "You did it in " + moves + " moves. That is the fewest possible.";
          if (rt.who === "marie" && s.st.n < 5) { patch.hanoi_n = s.st.n + 1; brain.mine.hanoi_n = s.st.n + 1; }
          patch.hanoi_wins = (Number(brain.mine.hanoi_wins) || 0) + 1;
          brain.mine.hanoi_wins = patch.hanoi_wins;
        } else {
          s.summary = "You did it in " + moves + " moves. The fewest possible is " + min + ".";
        }
        if (patch.hanoi_wins || patch.hanoi_n) { saveBrain(rt.opts, patch); }
        rt.say(s.summary);
      }
      draw();
    };

    newGame();
  }

  /* ---------- Last cookie UI ---------- */

  function cookieSvg() {
    return '<svg viewBox="0 0 40 40" aria-hidden="true" focusable="false"><circle cx="20" cy="20" r="17" fill="#f1cf9a" stroke="#3b2a33" stroke-width="2"/>' +
      '<circle cx="14" cy="15" r="2.5" fill="#3b2a33"/><circle cx="25" cy="13" r="2.5" fill="#3b2a33"/>' +
      '<circle cx="23" cy="25" r="2.5" fill="#3b2a33"/><circle cx="13" cy="26" r="2.5" fill="#3b2a33"/></svg>';
  }

  function startNim(rt) {
    var brain = readBrain(rt.opts);
    var s = null;

    function newGame() {
      var seed = (Date.now() ^ Math.floor(Math.random() * 4294967296)) >>> 0, rng = rngFromSeed(seed);
      s = { n: nimStartCount(rt.who, rng), rng: rng, ended: false, summary: "", log: "" };
      rt.lastSaid = "";
      rt.say(nimCoach(s.n, Number(brain.mine.nim_games) || 0));
      draw();
    }

    function draw() {
      var h = "", i;
      h += '<p class="bg-info">Cookies left: ' + s.n + ".</p>";
      h += '<div class="bg-cookies" role="img" aria-label="' + s.n + ' cookies left">';
      for (i = 0; i < s.n; i++) { h += cookieSvg(); }
      h += "</div>";
      if (s.log) { h += '<p class="bg-info">' + esc(s.log) + "</p>"; }
      if (s.ended) { h += endPanel(s.summary); }
      else {
        h += '<div class="bg-row">';
        for (i = 1; i <= 3; i++) {
          h += '<button type="button" class="bg-btn bg-mint" data-act="take" data-i="' + i + '" data-k="take' + i + '"' +
            (i > s.n ? ' aria-disabled="true"' : "") + ' aria-label="Take ' + i + (i === 1 ? " cookie" : " cookies") + '">Take ' + i + "</button>";
        }
        h += "</div>";
      }
      rt.paint(h);
    }

    function finish(childWon) {
      var games = (Number(brain.mine.nim_games) || 0) + 1, wins = (Number(brain.mine.nim_wins) || 0) + (childWon ? 1 : 0);
      brain.mine.nim_games = games; brain.mine.nim_wins = wins;
      saveBrain(rt.opts, { nim_games: games, nim_wins: wins });
      s.ended = true;
      s.summary = childWon ? "You took the last cookie. Well done." : "I took the last cookie this time. Let us try again.";
      rt.say(s.summary);
    }

    rt.onAct = function (act, btn) {
      if (act === "again") { newGame(); return; }
      if (s.ended || act !== "take") { return; }
      var t = Number(btn.getAttribute("data-i"));
      if (t < 1 || t > 3 || t > s.n) { return; }
      s.n -= t;
      s.log = "You took " + t + ".";
      if (s.n === 0) { finish(true); draw(); return; }
      var perfect = (Number(brain.mine.nim_wins) || 0) >= 3, m = nimComputerMove(s.n, perfect, s.rng);
      s.n -= m;
      s.log += " I took " + m + ".";
      if (s.n === 0) { finish(false); draw(); return; }
      rt.say(nimCoach(s.n, Number(brain.mine.nim_games) || 0));
      draw();
    };

    newGame();
  }

  /* ---------- register ---------- */

  window.BrainGames = window.BrainGames || {};
  window.BrainGames.battleship = makeGame("battleship", "Ship hunt", startBattleship);
  window.BrainGames.codebreaker = makeGame("codebreaker", "Code breaker", startCodebreaker);
  window.BrainGames.hanoi = makeGame("hanoi", "Tower move", startHanoi);
  window.BrainGames.nim = makeGame("nim", "Last cookie", startNim);
})();
