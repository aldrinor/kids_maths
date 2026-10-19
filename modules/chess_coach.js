/* chess_coach.js - a calm chess coach for Kids Maths (Marie, 8, and Kennedy, 5).
 *
 * window.BrainGames.chess = { id, title, open(container, opts), close() }
 *   opts = { who: "marie"|"kennedy"|"demo", speak(text), store: { get(), set(obj) }, onExit() }
 *
 * Parts of this file:
 *   1. Rules engine (pure functions, also exported for Node tests)
 *   2. Search, hints and the coach opponent (levels 0-3)
 *   3. Lessons and puzzle goal checkers
 *   4. Progress saved through opts.store
 *   5. The screen (only runs when open() is called in a browser)
 *
 * The coach is gentle on purpose. No sound, no timers on the child, no flashing.
 * Store layout: { kennedyAll: bool, kids: { marie: { done:{}, level, winRun, lossRun, wins, losses }, ... } }
 */
(function () {
  "use strict";

  /* ================= 1. RULES ENGINE ================= */
  // Board: array of 64 squares, index = row*8 + col, row 0 is rank 8 (top), col 0 is file a.
  // White pieces are capital letters, black pieces are small letters. "" is empty.
  var FILES = "abcdefgh";
  var VALUES = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
  var NAMES = { p: "pawn", n: "knight", b: "bishop", r: "rook", q: "queen", k: "king" };
  var START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
  var MAX_FULL_MOVES = 150; // a game this long is called a draw, so it always ends
  var KNIGHT_D = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
  var KING_D = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
  var BISHOP_D = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  var ROOK_D = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  var RIGHTS_LOST = { 60: "KQ", 63: "K", 56: "Q", 4: "kq", 7: "k", 0: "q" }; // squares that remove castling rights

  function colorOf(p) { return p === p.toUpperCase() ? "w" : "b"; }
  function kindOf(p) { return p.toLowerCase(); }
  function other(color) { return color === "w" ? "b" : "w"; }
  function sqName(sq) { return FILES[sq & 7] + (8 - (sq >> 3)); }
  function sqFromName(n) { return (8 - parseInt(n[1], 10)) * 8 + FILES.indexOf(n[0]); }
  function spoken(sq) { return sqName(sq).split("").join(" "); } // "e4" -> "e 4"

  // Read a FEN string into a state object.
  function parseFEN(fen) {
    var parts = fen.split(" "), rows = parts[0].split("/"), b = [], r, i, ch, k;
    for (r = 0; r < rows.length; r++) {
      for (i = 0; i < rows[r].length; i++) {
        ch = rows[r][i];
        if (ch >= "1" && ch <= "8") { for (k = 0; k < +ch; k++) b.push(""); } else b.push(ch);
      }
    }
    if (b.length !== 64 || rows.length !== 8) throw new Error("Bad FEN: " + fen);
    return {
      b: b,
      turn: parts[1] || "w",
      castle: (parts[2] && parts[2] !== "-") ? parts[2] : "",
      ep: (parts[3] && parts[3] !== "-") ? sqFromName(parts[3]) : -1,
      half: parseInt(parts[4] || "0", 10),
      full: parseInt(parts[5] || "1", 10)
    };
  }

  // A text key for a state (used for caches and searches).
  function stateKey(st) { return st.b.map(function (x) { return x || "."; }).join("") + st.turn + st.castle + st.ep; }

  // Squares of pieces of `color` that attack square `sq` (pins are ignored here).
  function attackersOf(b, sq, color) {
    var r = sq >> 3, c = sq & 7, out = [], i, d, rr, cc, p, w = color === "w";
    var pr = w ? r + 1 : r - 1;
    if (pr >= 0 && pr < 8) {
      for (i = -1; i <= 1; i += 2) {
        cc = c + i;
        if (cc >= 0 && cc < 8 && b[pr * 8 + cc] === (w ? "P" : "p")) out.push(pr * 8 + cc);
      }
    }
    for (i = 0; i < 8; i++) {
      d = KNIGHT_D[i]; rr = r + d[0]; cc = c + d[1];
      if (rr >= 0 && rr < 8 && cc >= 0 && cc < 8 && b[rr * 8 + cc] === (w ? "N" : "n")) out.push(rr * 8 + cc);
      d = KING_D[i]; rr = r + d[0]; cc = c + d[1];
      if (rr >= 0 && rr < 8 && cc >= 0 && cc < 8 && b[rr * 8 + cc] === (w ? "K" : "k")) out.push(rr * 8 + cc);
    }
    for (i = 0; i < 8; i++) {
      var diag = i < 4, dir = diag ? BISHOP_D[i] : ROOK_D[i - 4];
      rr = r + dir[0]; cc = c + dir[1];
      while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) {
        p = b[rr * 8 + cc];
        if (p) {
          if (colorOf(p) === color) {
            var k = kindOf(p);
            if (k === "q" || (diag && k === "b") || (!diag && k === "r")) out.push(rr * 8 + cc);
          }
          break;
        }
        rr += dir[0]; cc += dir[1];
      }
    }
    return out;
  }

  function findKing(b, color) { return b.indexOf(color === "w" ? "K" : "k"); }
  function inCheck(st, color) {
    var k = findKing(st.b, color);
    return k >= 0 && attackersOf(st.b, k, other(color)).length > 0;
  }

  // All moves that follow piece movement rules (king safety is checked later).
  // allPromos: also make rook, bishop, knight promotions (perft needs them; kids get queen only).
  function pseudoMoves(st, allPromos) {
    var b = st.b, us = st.turn, white = us === "w", moves = [];
    var sq, p, k, r, c, i, d, rr, cc, t, dir, nr, startRow, lastRow;
    function addPawn(from, to) {
      if ((to >> 3) === lastRow) {
        moves.push({ from: from, to: to, promo: "q" });
        if (allPromos) {
          moves.push({ from: from, to: to, promo: "r" });
          moves.push({ from: from, to: to, promo: "b" });
          moves.push({ from: from, to: to, promo: "n" });
        }
      } else moves.push({ from: from, to: to });
    }
    for (sq = 0; sq < 64; sq++) {
      p = b[sq];
      if (!p || colorOf(p) !== us) continue;
      k = kindOf(p); r = sq >> 3; c = sq & 7;
      if (k === "p") {
        dir = white ? -1 : 1; startRow = white ? 6 : 1; lastRow = white ? 0 : 7; nr = r + dir;
        if (nr < 0 || nr > 7) continue;
        if (b[nr * 8 + c] === "") {
          addPawn(sq, nr * 8 + c);
          if (r === startRow && b[(r + 2 * dir) * 8 + c] === "") moves.push({ from: sq, to: (r + 2 * dir) * 8 + c });
        }
        for (i = -1; i <= 1; i += 2) {
          cc = c + i;
          if (cc < 0 || cc > 7) continue;
          t = nr * 8 + cc;
          if (b[t] && colorOf(b[t]) !== us) addPawn(sq, t);
          else if (t === st.ep && b[t] === "") moves.push({ from: sq, to: t, ep: true });
        }
      } else if (k === "n" || k === "k") {
        var list = k === "n" ? KNIGHT_D : KING_D;
        for (i = 0; i < 8; i++) {
          rr = r + list[i][0]; cc = c + list[i][1];
          if (rr < 0 || rr > 7 || cc < 0 || cc > 7) continue;
          t = rr * 8 + cc;
          if (!b[t] || colorOf(b[t]) !== us) moves.push({ from: sq, to: t });
        }
        if (k === "k") addCastles(st, sq, moves);
      } else {
        for (i = 0; i < 8; i++) {
          var isDiag = i < 4;
          if (k === "b" && !isDiag) continue;
          if (k === "r" && isDiag) continue;
          d = isDiag ? BISHOP_D[i] : ROOK_D[i - 4];
          rr = r + d[0]; cc = c + d[1];
          while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) {
            t = rr * 8 + cc;
            if (b[t]) { if (colorOf(b[t]) !== us) moves.push({ from: sq, to: t }); break; }
            moves.push({ from: sq, to: t });
            rr += d[0]; cc += d[1];
          }
        }
      }
    }
    return moves;
  }

  // Castling: king on its home square, rights kept, squares between empty, king not in or through check.
  function addCastles(st, sq, moves) {
    var white = st.turn === "w", home = white ? 60 : 4, them = other(st.turn), b = st.b;
    if (sq !== home || b[sq] !== (white ? "K" : "k")) return;
    var rook = white ? "R" : "r";
    if (attackersOf(b, home, them).length) return;
    if (st.castle.indexOf(white ? "K" : "k") >= 0 && b[home + 1] === "" && b[home + 2] === "" && b[home + 3] === rook &&
        !attackersOf(b, home + 1, them).length && !attackersOf(b, home + 2, them).length) {
      moves.push({ from: home, to: home + 2, castle: "K" });
    }
    if (st.castle.indexOf(white ? "Q" : "q") >= 0 && b[home - 1] === "" && b[home - 2] === "" && b[home - 3] === "" && b[home - 4] === rook &&
        !attackersOf(b, home - 1, them).length && !attackersOf(b, home - 2, them).length) {
      moves.push({ from: home, to: home - 2, castle: "Q" });
    }
  }

  // Play a move and return the new state (the old state is not changed).
  function makeMove(st, m) {
    var b = st.b.slice(), p = b[m.from], us = colorOf(p), captured = b[m.to] !== "" || !!m.ep;
    b[m.to] = p; b[m.from] = "";
    if (m.ep) b[m.to + (us === "w" ? 8 : -8)] = "";
    if (m.promo) b[m.to] = us === "w" ? m.promo.toUpperCase() : m.promo.toLowerCase();
    if (m.castle === "K") { b[m.to - 1] = b[m.to + 1]; b[m.to + 1] = ""; }
    if (m.castle === "Q") { b[m.to + 1] = b[m.to - 2]; b[m.to - 2] = ""; }
    var castle = st.castle, lost = (RIGHTS_LOST[m.from] || "") + (RIGHTS_LOST[m.to] || ""), i;
    for (i = 0; i < lost.length; i++) castle = castle.replace(lost[i], "");
    var isPawn = kindOf(p) === "p";
    return {
      b: b, turn: other(us), castle: castle,
      ep: (isPawn && Math.abs(m.to - m.from) === 16) ? (m.from + m.to) / 2 : -1,
      half: (isPawn || captured) ? 0 : st.half + 1,
      full: st.full + (us === "b" ? 1 : 0)
    };
  }

  // Fully legal moves: the mover's king may not be left in check.
  function legalMoves(st, allPromos) {
    var out = [], all = pseudoMoves(st, allPromos), i;
    for (i = 0; i < all.length; i++) {
      if (!inCheck(makeMove(st, all[i]), st.turn)) out.push(all[i]);
    }
    return out;
  }

  function perft(st, depth) {
    if (depth === 0) return 1;
    var moves = legalMoves(st, true), n = 0, i;
    if (depth === 1) return moves.length;
    for (i = 0; i < moves.length; i++) n += perft(makeMove(st, moves[i]), depth - 1);
    return n;
  }

  function isCapture(st, m) { return st.b[m.to] !== "" || !!m.ep; }
  function capturedPiece(st, m) { return m.ep ? (st.turn === "w" ? "p" : "P") : st.b[m.to]; }
  // The legal move from -> to (a pawn that reaches the end becomes a queen).
  function findMove(st, from, to) {
    var all = legalMoves(st), i;
    for (i = 0; i < all.length; i++) if (all[i].from === from && all[i].to === to) return all[i];
    return null;
  }

  // Only kings, or kings plus one minor piece: nobody can win.
  function insufficientMaterial(st) {
    var n = 0, i, k;
    for (i = 0; i < 64; i++) {
      if (!st.b[i]) continue;
      k = kindOf(st.b[i]);
      if (k === "k") continue;
      if (k === "n" || k === "b") n++; else return false;
    }
    return n <= 1;
  }

  // "check", "checkmate", "stalemate", "draw" or "ongoing".
  function gameStatus(st) {
    var moves = legalMoves(st), chk = inCheck(st, st.turn);
    if (!moves.length) return chk ? "checkmate" : "stalemate";
    if (insufficientMaterial(st) || st.half >= 100) return "draw";
    return chk ? "check" : "ongoing";
  }

  // Result for a game mode: "standard", "pawnwar" or "kingpawns".
  // In pawnwar and kingpawns the first pawn to reach the far side (it becomes a queen) wins.
  function gameResult(st, mode) {
    var i;
    if (mode === "pawnwar" || mode === "kingpawns") {
      for (i = 0; i < 64; i++) {
        if (st.b[i] === "Q") return { over: true, winner: "w", reason: "far side" };
        if (st.b[i] === "q") return { over: true, winner: "b", reason: "far side" };
      }
    }
    var moves = legalMoves(st);
    if (!moves.length) {
      if (inCheck(st, st.turn)) return { over: true, winner: other(st.turn), reason: "checkmate" };
      if (mode === "pawnwar") return { over: true, winner: other(st.turn), reason: "blocked" };
      return { over: true, winner: null, reason: "stalemate" };
    }
    if (insufficientMaterial(st) || st.half >= 100 || st.full > MAX_FULL_MOVES) return { over: true, winner: null, reason: "draw" };
    return { over: false };
  }

  function startState(mode) {
    if (mode === "pawnwar") return parseFEN("8/pppppppp/8/8/8/8/PPPPPPPP/8 w - - 0 1");
    if (mode === "kingpawns") return parseFEN("4k3/pppp4/8/8/8/8/PPPP4/4K3 w - - 0 1");
    return parseFEN(START_FEN);
  }

  /* ================= 2. SEARCH, HINTS, COACH ================= */
  // Material score from White's point of view. In pawn modes, advanced pawns count a little.
  function evaluate(st, mode) {
    var s = 0, i, p, k, v, r, pawnMode = mode === "pawnwar" || mode === "kingpawns";
    for (i = 0; i < 64; i++) {
      p = st.b[i];
      if (!p) continue;
      k = kindOf(p); v = VALUES[k]; r = i >> 3;
      if (pawnMode && k === "p") v += 0.1 * (colorOf(p) === "w" ? 6 - r : r - 1);
      s += colorOf(p) === "w" ? v : -v;
    }
    return s;
  }

  // Score for the side to move, looking `depth` more moves ahead.
  function negamax(st, depth, mode, ply) {
    var pawnMode = mode === "pawnwar" || mode === "kingpawns", i, q = st.turn === "w" ? "q" : "Q";
    if (pawnMode && st.b.indexOf(q) >= 0) return -1000 + ply; // the other side already won
    var moves = legalMoves(st);
    if (!moves.length) return (inCheck(st, st.turn) || mode === "pawnwar") ? -1000 + ply : 0;
    if (depth === 0) return (st.turn === "w" ? 1 : -1) * evaluate(st, mode);
    var best = -Infinity, sc;
    for (i = 0; i < moves.length; i++) {
      sc = -negamax(makeMove(st, moves[i]), depth - 1, mode, ply + 1);
      if (sc > best) best = sc;
    }
    return best;
  }

  // Every legal move with its score for the side to move (depth counts our own move as 1).
  function scoreMoves(st, depth, mode) {
    return legalMoves(st).map(function (m) {
      return { move: m, score: -negamax(makeMove(st, m), depth - 1, mode || "standard", 1) };
    });
  }

  // Pieces of `color` that can be taken for free or traded badly. Kings are not listed.
  function hangingPieces(st, color) {
    var out = [], sq, p, att, minVal, defenders, i, v;
    for (sq = 0; sq < 64; sq++) {
      p = st.b[sq];
      if (!p || colorOf(p) !== color || kindOf(p) === "k") continue;
      att = attackersOf(st.b, sq, other(color));
      if (!att.length) continue;
      minVal = 99;
      for (i = 0; i < att.length; i++) { v = VALUES[kindOf(st.b[att[i]])]; if (v === 0) v = 100; if (v < minVal) minVal = v; }
      defenders = attackersOf(st.b, sq, color);
      var onlyKing = defenders.length === 1 && kindOf(st.b[defenders[0]]) === "k" && att.length > 1;
      if (!defenders.length || onlyKing || minVal < VALUES[kindOf(p)]) out.push({ sq: sq, piece: p, value: VALUES[kindOf(p)] });
    }
    return out;
  }

  // A capture after which the capturing piece cannot be won back.
  function isFreeCapture(st, m) {
    if (!isCapture(st, m) || VALUES[kindOf(capturedPiece(st, m))] === 0) return false;
    var after = makeMove(st, m), us = colorOf(st.b[m.from]);
    return !hangingPieces(after, us).some(function (h) { return h.sq === m.to; });
  }

  // If this move leaves a piece to be lost for nothing, return that piece's square; else -1.
  function hangingAfterMove(st, m) {
    var after = makeMove(st, m), us = st.turn;
    if (gameStatus(after) === "checkmate") return -1;
    var gained = isCapture(st, m) ? VALUES[kindOf(capturedPiece(st, m))] : 0;
    var list = hangingPieces(after, us).filter(function (h) { return h.value > gained; });
    if (!list.length) return -1;
    list.sort(function (a, c) { return c.value - a.value; });
    return list[0].sq;
  }

  // Is the landing square of this move attacked by the other side? (used by "Think ahead")
  function landingSquareAttacked(st, m) {
    var after = makeMove(st, m);
    return attackersOf(after.b, m.to, other(st.turn)).length > 0;
  }

  function pickFrom(list, rng) { return list[Math.floor(rng() * list.length)]; }

  // The coach's move for a level 0-3. rng() returns a number in [0,1). Returns null if no legal move.
  function coachMove(st, level, rng, mode) {
    var moves = legalMoves(st);
    if (!moves.length) return null;
    rng = rng || Math.random; mode = mode || "standard";
    if (level <= 0) {
      var quiet = moves.filter(function (m) { return !isCapture(st, m); });
      return pickFrom(quiet.length ? quiet : moves, rng);
    }
    if (level === 1) {
      if (rng() < 0.5) {
        var free = moves.filter(function (m) { return isFreeCapture(st, m); });
        if (free.length) return pickFrom(free, rng);
      }
      return pickFrom(moves, rng);
    }
    var scored = scoreMoves(st, level === 2 ? 1 : 2, mode), best = -Infinity;
    scored.forEach(function (s) { if (s.score > best) best = s.score; });
    return pickFrom(scored.filter(function (s) { return s.score === best; }), rng).move;
  }

  // A small bonus so that hints prefer central, developing moves when nothing else differs.
  function tieBonus(st, m) {
    var r = m.to >> 3, c = m.to & 7, k = kindOf(st.b[m.from]);
    var bonus = -0.05 * (Math.abs(c - 3.5) + Math.abs(r - 3.5));
    var home = st.turn === "w" ? 7 : 0;
    if ((k === "n" || k === "b") && (m.from >> 3) === home) bonus += 0.3;
    if (k === "k" && !m.castle) bonus -= 0.3;
    if (m.castle) bonus += 0.4;
    return bonus;
  }

  // One good move for the side to move, using a 2-move search. The same position gives the same hint.
  function hintMove(st, mode) {
    var scored = scoreMoves(st, 2, mode || "standard");
    if (!scored.length) return null;
    var best = -Infinity, pick = null, pickScore = -Infinity;
    scored.forEach(function (s) { if (s.score > best) best = s.score; });
    scored.forEach(function (s) {
      if (s.score < best - 1e-9) return;
      var t = tieBonus(st, s.move);
      if (t > pickScore) { pickScore = t; pick = s.move; }
    });
    return pick;
  }

  // One short sentence that says why the move is good.
  function hintReason(st, m) {
    var p = st.b[m.from], name = NAMES[kindOf(p)], after = makeMove(st, m), us = st.turn;
    if (gameStatus(after) === "checkmate") return "This move gives checkmate.";
    if (isCapture(st, m)) {
      var victim = NAMES[kindOf(capturedPiece(st, m))];
      return isFreeCapture(st, m) ? "Your " + name + " can take the free " + victim + "." : "Your " + name + " can take the " + victim + ".";
    }
    if (m.promo) return "Your pawn can reach the end and become a queen.";
    if (m.castle) return "Castling tucks your king away safely.";
    if (hangingPieces(st, us).some(function (h) { return h.sq === m.from; })) return "Your " + name + " is in danger. Move it to safety.";
    if (inCheck(after, other(us))) return "This move gives check.";
    return "Your " + name + " can join the game here.";
  }

  // Plain words for the coach's move.
  function describeMove(st, m) {
    var p = st.b[m.from];
    if (m.castle) return "The coach castled.";
    if (isCapture(st, m)) return "The coach took your " + NAMES[kindOf(capturedPiece(st, m))] + " with a " + NAMES[kindOf(p)] + ".";
    return "The coach moved a " + NAMES[kindOf(p)] + " to " + spoken(m.to) + ".";
  }

  /* ================= 3. LESSONS ================= */
  function stars(fen, starList, par, text) { return { goal: "stars", fen: fen, stars: starList, par: par, text: text }; }
  function single(goal, fen, text) { return { goal: goal, fen: fen, text: text }; }

  // kid: true means Kennedy sees it without the parent setting. Lessons 1-6 and pawn war.
  var LESSONS = [
    { id: "l1", n: "1", kind: "lesson", kid: true, title: "Pawns", showTargets: true,
      intro: "Pawns walk forward and take one step sideways.",
      puzzles: [
        stars("8/8/8/8/8/8/4P3/8 w - - 0 1", ["e3"], 1, "Move the pawn to the star."),
        stars("8/8/8/8/8/8/4P3/8 w - - 0 1", ["e4"], 1, "A pawn can jump two steps on its first move. Reach the star."),
        stars("8/8/8/8/2P5/8/8/8 w - - 0 1", ["c6"], 2, "Walk the pawn to the star."),
        stars("8/8/8/4p3/3P4/8/8/8 w - - 0 1", ["e5"], 1, "Take the piece. A pawn takes sideways."),
        stars("8/8/8/8/8/3n4/4P3/8 w - - 0 1", ["d3"], 1, "Take the knight with your pawn."),
        stars("8/8/8/3pp3/4P3/8/8/8 w - - 0 1", ["d5"], 1, "The pawn in front blocks you. Take the other one.")
      ] },
    { id: "l2", n: "2", kind: "lesson", kid: true, title: "Rook", showTargets: true,
      intro: "Rooks slide in straight lines. Catch the stars in few moves.",
      puzzles: [
        stars("8/8/8/8/8/8/8/R7 w - - 0 1", ["a6"], 1, "Slide the rook to the star."),
        stars("8/8/8/8/8/8/8/R7 w - - 0 1", ["a8", "h8"], 2, "Catch both stars in two moves."),
        stars("8/8/8/8/8/8/8/R7 w - - 0 1", ["e5"], 2, "Reach the star in two moves."),
        stars("8/8/8/3p4/8/8/8/3R4 w - - 0 1", ["d5"], 1, "Take the pawn with the rook."),
        stars("8/8/8/8/8/8/8/R7 w - - 0 1", ["h1", "h8", "a8"], 3, "Catch three stars in three moves.")
      ] },
    { id: "l3", n: "3", kind: "lesson", kid: true, title: "Bishop", showTargets: true,
      intro: "Bishops slide on diagonals. They always stay on one colour.",
      puzzles: [
        stars("8/8/8/8/8/8/8/2B5 w - - 0 1", ["h6"], 1, "Slide the bishop to the star."),
        stars("8/8/8/8/8/8/8/B7 w - - 0 1", ["h8"], 1, "Use the long diagonal."),
        stars("8/8/8/8/8/8/8/2B5 w - - 0 1", ["d6"], 2, "Reach the star in two moves."),
        stars("8/8/8/8/5r2/8/8/2B5 w - - 0 1", ["f4"], 1, "Take the rook with the bishop."),
        stars("8/8/8/8/8/8/8/2B5 w - - 0 1", ["h6", "g7"], 2, "Catch both stars in two moves.")
      ] },
    { id: "l4", n: "4", kind: "lesson", kid: true, title: "Queen", showTargets: true,
      intro: "The queen moves like a rook and a bishop together.",
      puzzles: [
        stars("8/8/8/8/8/8/8/3Q4 w - - 0 1", ["d8"], 1, "Slide the queen to the star."),
        stars("8/8/8/8/8/8/8/3Q4 w - - 0 1", ["h5"], 1, "The queen can go diagonally too."),
        stars("8/8/8/8/8/8/8/Q7 w - - 0 1", ["h8", "h1"], 2, "Catch both stars in two moves."),
        stars("8/8/8/8/b7/8/8/3Q4 w - - 0 1", ["a4"], 1, "Take the bishop with the queen."),
        stars("8/8/8/8/8/8/1Q6/8 w - - 0 1", ["b7", "g7"], 2, "Catch both stars in two moves.")
      ] },
    { id: "l5", n: "5", kind: "lesson", kid: true, title: "Knight", showTargets: true,
      intro: "Knights jump in an L shape. They can jump over pieces.",
      puzzles: [
        stars("8/8/8/8/8/8/8/1N6 w - - 0 1", ["c3"], 1, "Jump the knight to the star."),
        stars("8/8/8/8/8/8/8/6N1 w - - 0 1", ["f3"], 1, "Jump to the star."),
        stars("8/8/8/8/8/8/8/1N6 w - - 0 1", ["e4"], 2, "Reach the star in two jumps."),
        stars("8/8/5p2/8/4N3/8/8/8 w - - 0 1", ["f6"], 1, "Take the pawn with the knight."),
        stars("8/8/8/8/8/8/8/6N1 w - - 0 1", ["f3", "e5"], 2, "Catch both stars in two jumps."),
        stars("8/8/8/8/8/8/8/1N6 w - - 0 1", ["d4"], 3, "Reach the star in three jumps.")
      ] },
    { id: "l6", n: "6", kind: "lesson", kid: true, title: "King", showTargets: true,
      intro: "The king takes one step. It must never step into danger.",
      puzzles: [
        stars("8/8/8/8/8/8/8/4K3 w - - 0 1", ["e2"], 1, "Step the king to the star."),
        stars("8/8/8/8/8/8/8/4K3 w - - 0 1", ["e3"], 2, "Reach the star in two steps."),
        stars("8/8/8/8/4K3/8/8/8 w - - 0 1", ["e5", "e6"], 2, "Catch both stars."),
        stars("8/8/8/8/8/8/7r/3K4 w - - 0 1", ["a1"], 3, "The rook guards the second row. Walk along the first row."),
        stars("8/8/8/4b3/4K3/8/8/8 w - - 0 1", ["e5"], 1, "Nobody guards the bishop. Take it with the king.")
      ] },
    { id: "l7", n: "7", kind: "lesson", kid: false, title: "Free piece", showTargets: false,
      intro: "A free piece has no guard. Find the piece you can take safely.",
      puzzles: [
        single("free", "4k3/8/8/3b4/8/8/8/3RK3 w - - 0 1", "Find the piece you can take for free."),
        single("free", "4k3/3n4/8/8/p2Q4/8/8/4K3 w - - 0 1", "One piece is guarded. Take the free one."),
        single("free", "4k3/6r1/8/8/8/8/1B6/4K3 w - - 0 1", "Take the free rook."),
        single("free", "4k3/8/8/3n4/4P3/8/8/4K3 w - - 0 1", "Your pawn can win a piece."),
        single("free", "4k3/8/8/q7/8/8/8/R5K1 w - - 0 1", "Win the queen safely."),
        single("free", "4k3/8/6p1/1b3p2/3N4/8/8/4K3 w - - 0 1", "Take the piece that nobody guards.")
      ] },
    { id: "l8", n: "8", kind: "lesson", kid: false, title: "Is it safe?", showTargets: false,
      intro: "Before you move, ask what the other side can take.",
      puzzles: [
        single("safe", "4k3/8/8/3p4/4N3/8/8/4K3 w - - 0 1", "Your knight can be taken. Move so nothing can be taken."),
        single("safe", "4k3/8/2n5/4p3/3Q4/8/8/4K3 w - - 0 1", "Your queen is in danger. Find a safe move."),
        single("safe", "4k3/8/3n4/1p6/2B5/8/8/4K3 w - - 0 1", "Your bishop can be taken. Make it safe."),
        single("safe", "4k3/8/8/4p3/8/8/3Q4/4K3 w - - 0 1", "Make a move. Keep every piece safe."),
        single("safe", "4k3/6b1/8/8/8/2N5/8/4K3 w - - 0 1", "The bishop attacks your knight. Make everything safe.")
      ] },
    { id: "l9", n: "9", kind: "lesson", kid: false, title: "Checkmate in 1", showTargets: false,
      intro: "Checkmate: the king is attacked and cannot escape. Find it!",
      puzzles: [
        single("mate", "6k1/5ppp/8/8/8/8/8/R3K3 w - - 0 1", "The king is stuck behind its pawns. Find checkmate."),
        single("mate", "7k/8/5K2/8/8/8/8/6Q1 w - - 0 1", "Queen and king work together. Find checkmate."),
        single("mate", "k7/7R/8/8/8/8/8/4K1R1 w - - 0 1", "Two rooks make a ladder. Find checkmate."),
        single("mate", "7k/5Q2/6K1/8/8/8/8/8 w - - 0 1", "Find a checkmate with the queen."),
        single("mate", "k7/8/1K6/8/8/8/8/6Q1 w - - 0 1", "The king guards two squares. Find checkmate.")
      ] },
    { id: "pawnwar", n: "10a", kind: "game", kid: true, title: "Pawn war", mode: "pawnwar",
      intro: "Pawn war: the first pawn to reach the far side wins." },
    { id: "kingpawns", n: "10b", kind: "game", kid: false, title: "King and pawns", mode: "kingpawns",
      intro: "Kings and pawns: reach the far side, or trap the king." },
    { id: "fullgame", n: "10c", kind: "game", kid: false, title: "Full game with the coach", mode: "standard",
      intro: "A full game! The coach plays gently and helps you." }
  ];

  // Does this move solve a one-move puzzle? Returns { ok, why }.
  function checkGoalMove(puz, st, m) {
    var name = NAMES[kindOf(st.b[m.from])], after, bad;
    if (puz.goal === "free") {
      if (!isCapture(st, m)) return { ok: false, why: "Look for a piece you can take." };
      if (!isFreeCapture(st, m)) return { ok: false, why: "That piece is guarded. You would lose your " + name + "." };
      return { ok: true, why: "Yes. Nobody can take your " + name + " back." };
    }
    if (puz.goal === "safe") {
      after = makeMove(st, m);
      bad = hangingPieces(after, "w");
      if (bad.length) return { ok: false, why: "Your " + NAMES[kindOf(bad[0].piece)] + " could still be taken. Try again." };
      return { ok: true, why: "Yes. Nothing of yours can be taken." };
    }
    if (puz.goal === "mate") {
      if (gameStatus(makeMove(st, m)) === "checkmate") return { ok: true, why: "Checkmate. The king has nowhere to go." };
      return { ok: false, why: "The king can still get away. Try another move." };
    }
    return { ok: false, why: "" };
  }

  // After a lesson move the same side moves again (the other side stays still).
  function passTurn(st, color) { st.turn = color; st.ep = -1; return st; }

  // Search for the fewest moves that catch all stars. Returns { moves, first } or null.
  function solveStars(puz, maxDepth) {
    var st0 = parseFEN(puz.fen), targets = puz.stars.map(sqFromName), full = (1 << targets.length) - 1;
    var queue = [{ st: st0, mask: 0, d: 0, first: null }], seen = {}, qi = 0, cur, moves, i, j, nx, mask, key;
    maxDepth = maxDepth || 6;
    seen[stateKey(st0) + "|0"] = true;
    while (qi < queue.length) {
      cur = queue[qi++];
      if (cur.d >= maxDepth) continue;
      moves = legalMoves(cur.st);
      for (i = 0; i < moves.length; i++) {
        mask = cur.mask;
        for (j = 0; j < targets.length; j++) if (moves[i].to === targets[j]) mask |= (1 << j);
        if (mask === full) return { moves: cur.d + 1, first: cur.first || moves[i] };
        nx = passTurn(makeMove(cur.st, moves[i]), "w");
        key = stateKey(nx) + "|" + mask;
        if (seen[key]) continue;
        seen[key] = true;
        queue.push({ st: nx, mask: mask, d: cur.d + 1, first: cur.first || moves[i] });
      }
    }
    return null;
  }

  // Same search, starting from any state and a list of star names (used for the clue button).
  function solveStarsFrom(st, starNames) {
    var fenRows = [], r, c, run, p, row;
    for (r = 0; r < 8; r++) {
      run = 0; row = "";
      for (c = 0; c < 8; c++) {
        p = st.b[r * 8 + c];
        if (!p) run++; else { if (run) row += run; run = 0; row += p; }
      }
      if (run) row += run;
      fenRows.push(row);
    }
    return solveStars({ fen: fenRows.join("/") + " w - - 0 1", stars: starNames }, 6);
  }

  // Moves that solve a one-move puzzle.
  function goalMoves(puz, st) {
    return legalMoves(st).filter(function (m) { return checkGoalMove(puz, st, m).ok; });
  }

  function kingsTouch(st) {
    var a = findKing(st.b, "w"), b = findKing(st.b, "b");
    if (a < 0 || b < 0) return false;
    return Math.abs((a >> 3) - (b >> 3)) <= 1 && Math.abs((a & 7) - (b & 7)) <= 1;
  }

  // Used by tests: a list of problems with a puzzle position (empty list means it is sensible).
  function puzzleProblems(puz) {
    var problems = [], st, i, p, wk = 0, bk = 0, wp = 0, bp = 0;
    try { st = parseFEN(puz.fen); } catch (e) { return ["FEN does not parse"]; }
    for (i = 0; i < 64; i++) {
      p = st.b[i];
      if (p === "K") wk++;
      if (p === "k") bk++;
      if (p === "P") wp++;
      if (p === "p") bp++;
      if ((p === "P" || p === "p") && ((i >> 3) === 0 || (i >> 3) === 7)) problems.push("pawn on the first or last row");
    }
    if (wk > 1 || bk > 1) problems.push("too many kings");
    if (wp > 8 || bp > 8) problems.push("too many pawns");
    if (puz.goal !== "stars" && (wk !== 1 || bk !== 1)) problems.push("goal puzzle needs both kings");
    if (st.turn !== "w") problems.push("white must be to move");
    if (inCheck(st, "b")) problems.push("black king is in check while white is to move");
    if (kingsTouch(st)) problems.push("kings touch");
    if (puz.goal === "stars") {
      puz.stars.forEach(function (s) { var q = sqFromName(s); if (!(q >= 0 && q < 64)) problems.push("bad star " + s); });
      if (!st.b.some(function (x) { return x && colorOf(x) === "w"; })) problems.push("no white piece");
    }
    return problems;
  }

  /* ================= 4. PROGRESS ================= */
  function normalizeWho(who) { return (who === "kennedy" || who === "demo") ? who : "marie"; }

  // The lessons this child can see, in order.
  function visibleEntries(who, kennedyAll) {
    if (normalizeWho(who) === "kennedy" && !kennedyAll) return LESSONS.filter(function (e) { return e.kid; });
    return LESSONS.slice();
  }
  // A lesson unlocks when the one before it (in the visible list) is done. "demo" has everything open.
  function isUnlocked(entries, index, rec, who) {
    if (normalizeWho(who) === "demo" || index === 0) return true;
    return !!rec.done[entries[index - 1].id];
  }

  function defaultRecord() { return { done: {}, level: 0, winRun: 0, lossRun: 0, wins: 0, losses: 0 }; }
  function readRecord(data, who) {
    var saved = data && data.kids && data.kids[normalizeWho(who)], rec = defaultRecord();
    if (saved) {
      rec.level = Math.max(0, Math.min(3, saved.level | 0));
      rec.winRun = saved.winRun | 0; rec.lossRun = saved.lossRun | 0;
      rec.wins = saved.wins | 0; rec.losses = saved.losses | 0;
      Object.keys(saved.done || {}).forEach(function (k) { if (saved.done[k]) rec.done[k] = true; });
    }
    return rec;
  }
  function writeRecord(data, who, rec) {
    data = data || {};
    data.kids = data.kids || {};
    data.kids[normalizeWho(who)] = rec;
    return data;
  }

  // After a finished game. 3 wins in a row: up one level. 2 losses in a row: down one level. A draw changes nothing.
  // Returns a new record plus `change`: "up", "down" or "".
  function updateStrength(rec, result) {
    var n = { done: rec.done, level: rec.level, winRun: rec.winRun, lossRun: rec.lossRun, wins: rec.wins, losses: rec.losses, change: "" };
    if (result === "win") {
      n.wins++; n.winRun++; n.lossRun = 0;
      if (n.winRun >= 3) { n.winRun = 0; if (n.level < 3) { n.level++; n.change = "up"; } }
    } else if (result === "loss") {
      n.losses++; n.lossRun++; n.winRun = 0;
      if (n.lossRun >= 2) { n.lossRun = 0; if (n.level > 0) { n.level--; n.change = "down"; } }
    }
    return n;
  }

  /* ================= 5. THE SCREEN ================= */
  var GLYPH = { p: "♟︎", n: "♞︎", b: "♝︎", r: "♜︎", q: "♛︎", k: "♚︎" };

  var CSS = [
    ".ch-wrap{--ink:#3b2a33;--cream:#fffaf3;--light:#f6e7d3;--dark:#d9b99b;--soft:#bde3c9;--hint:#ffe9a8;--dots:rgba(123,85,230,.5);--star:#c99a2e;",
    "--ch-sq:min(calc((100vw - 40px)/8),64px);box-sizing:border-box;width:100%;max-width:640px;margin:0 auto;padding:12px;background:var(--cream);color:var(--ink);font:inherit;border-radius:18px;container-type:inline-size}",
    "@supports (width:1cqw){.ch-board-box{--ch-sq:min(12.5cqw,64px)}}",
    ".ch-wrap *{box-sizing:border-box}",
    ".ch-top{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px}",
    ".ch-title{margin:0;font-size:1.25rem;font-weight:700}",
    ".ch-btn{min-height:44px;padding:8px 14px;border:2px solid var(--dark);border-radius:14px;background:var(--light);color:var(--ink);font:inherit;font-size:1rem;cursor:pointer}",
    ".ch-btn:hover{background:var(--soft)}",
    ".ch-btn[aria-pressed=true]{background:var(--soft)}",
    ".ch-btn[disabled]{opacity:.5;cursor:default}",
    ".ch-btn:focus-visible,.ch-sq:focus-visible{outline:3px solid var(--ink);outline-offset:-3px}",
    ".ch-list{list-style:none;margin:0;padding:0;display:grid;gap:8px}",
    ".ch-item{width:100%;text-align:left;display:flex;justify-content:space-between;align-items:center;gap:8px}",
    ".ch-note{margin:10px 2px;font-size:.95rem;opacity:.85}",
    ".ch-row{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin:8px 0}",
    ".ch-board-box{display:flex;justify-content:center}",
    ".ch-board{display:grid;grid-template-columns:repeat(8,var(--ch-sq));grid-auto-rows:var(--ch-sq);width:max-content;border:2px solid var(--dark);border-radius:6px;overflow:hidden}",
    ".ch-sq{position:relative;display:flex;align-items:center;justify-content:center;width:var(--ch-sq);height:var(--ch-sq);margin:0;padding:0;border:0;border-radius:0;font:inherit;font-size:calc(var(--ch-sq)*.74);line-height:1;color:var(--ink);cursor:pointer}",
    ".ch-l{background:var(--light)}.ch-d{background:var(--dark)}",
    ".ch-ls{box-shadow:inset 0 0 0 2px rgba(123,85,230,.25)}",
    ".ch-tg{background:var(--soft)}",
    ".ch-sl{background:var(--soft);box-shadow:inset 0 0 0 3px rgba(59,42,51,.35)}",
    ".ch-hn{background:var(--hint)}",
    ".ch-dt::after{content:'';position:absolute;top:10%;left:10%;width:24%;height:24%;border-radius:50%;background:var(--dots)}",
    ".ch-pc{pointer-events:none}",
    ".ch-pw{color:var(--cream);-webkit-text-stroke:.8px var(--ink);paint-order:stroke fill}",
    ".ch-pb{color:var(--ink)}",
    ".ch-star{position:absolute;right:6%;top:2%;font-size:.42em;color:var(--star);pointer-events:none}",
    ".ch-star.ch-big{right:auto;top:auto;font-size:.6em}",
    ".ch-status{min-height:3.2em;margin:8px 2px;padding:8px 12px;background:var(--light);border-radius:12px;font-size:1.1rem;line-height:1.4}",
    ".ch-win{color:var(--star);margin-left:6px;font-size:1.1em}",
    ".ch-ask{margin:8px 0;padding:10px;background:var(--hint);border-radius:12px;text-align:center}",
    ".ch-ask p{margin:0 0 8px;font-size:1.05rem}",
    ".ch-dotsrow{text-align:center;margin:4px 0;font-size:.95rem}"
  ].join("\n");

  function injectCss() {
    if (document.getElementById("chess-css")) return;
    var s = document.createElement("style");
    s.id = "chess-css";
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  var S = null; // the one open session

  function say(text) { try { if (S && S.opts.speak) S.opts.speak(text); } catch (e) { /* speech is optional */ } }
  function loadData() { try { return (S.opts.store && S.opts.store.get && S.opts.store.get()) || {}; } catch (e) { return {}; } }
  function saveData(d) { try { if (S.opts.store && S.opts.store.set) S.opts.store.set(d); } catch (e) { /* saving is optional */ } }
  function record() { return readRecord(loadData(), S.who); }
  function saveRecord(rec) {
    var plain = { done: rec.done, level: rec.level, winRun: rec.winRun, lossRun: rec.lossRun, wins: rec.wins, losses: rec.losses };
    saveData(writeRecord(loadData(), S.who, plain));
  }
  function setStatus(text, star) { S.status = text; S.star = !!star; }

  // ----- board drawing -----
  function squareLabel(sq, p, isStar) {
    var base = FILES[sq & 7] + " " + (8 - (sq >> 3)) + ", " + (p ? (colorOf(p) === "w" ? "white " : "black ") + NAMES[kindOf(p)] : "empty");
    return isStar ? base + ", star" : base;
  }

  function boardHtml(o) {
    var h = '<div class="ch-board-box"><div class="ch-board" role="group" aria-label="Chess board">', sq, p, cls, r, c;
    for (sq = 0; sq < 64; sq++) {
      p = o.st.b[sq]; r = sq >> 3; c = sq & 7;
      cls = "ch-sq " + (((r + c) & 1) ? "ch-d" : "ch-l");
      if (o.last[sq]) cls += " ch-ls";
      if (o.targets[sq]) cls += " ch-tg";
      if (o.sel === sq) cls += " ch-sl";
      if (o.hint[sq]) cls += " ch-hn";
      if (o.dots[sq]) cls += " ch-dt";
      h += '<button type="button" class="' + cls + '" data-sq="' + sq + '" aria-label="' + squareLabel(sq, p, !!o.stars[sq]) + '"' + (o.sel === sq ? ' aria-pressed="true"' : "") + ">";
      if (p) h += '<span class="ch-pc ' + (colorOf(p) === "w" ? "ch-pw" : "ch-pb") + '" aria-hidden="true">' + GLYPH[kindOf(p)] + "</span>";
      if (o.stars[sq]) h += '<span class="ch-star' + (p ? "" : " ch-big") + '" aria-hidden="true">★</span>';
      h += "</button>";
    }
    return h + "</div></div>";
  }

  function setOf(list) { var o = {}; list.forEach(function (x) { if (x >= 0) o[x] = true; }); return o; }

  // ----- views -----
  function render() {
    var active = document.activeElement, focusSel = null;
    if (active && S.root.contains(active)) {
      if (active.getAttribute("data-sq") !== null) focusSel = '[data-sq="' + active.getAttribute("data-sq") + '"]';
      else if (active.getAttribute("data-act")) focusSel = '[data-act="' + active.getAttribute("data-act") + '"]' + (active.getAttribute("data-id") ? '[data-id="' + active.getAttribute("data-id") + '"]' : "");
    }
    var body = S.view === "menu" ? menuHtml() : S.view === "lesson" ? lessonHtml() : gameHtml();
    var top = '<div class="ch-top"><h2 class="ch-title">' + (S.view === "menu" ? "Chess coach" : S.entry.title) + '</h2><button type="button" class="ch-btn" data-act="exit">Exit</button></div>';
    S.root.innerHTML = top + body + '<div class="ch-status" role="status" aria-live="polite" data-slot="1"></div>';
    // Keep one status element alive so screen readers announce each change.
    var slot = S.root.querySelector('[data-slot="1"]');
    if (!S.statusEl) S.statusEl = slot; else slot.parentNode.replaceChild(S.statusEl, slot);
    var shown = S.status + "|" + S.star;
    if (S.statusShown !== shown) {
      S.statusEl.textContent = S.status || "";
      if (S.star) {
        var sp = document.createElement("span");
        sp.className = "ch-win"; sp.setAttribute("aria-hidden", "true"); sp.textContent = "★";
        S.statusEl.appendChild(sp);
      }
      S.statusShown = shown;
    }
    // The status line sits right under the board.
    var box = S.root.querySelector(".ch-board-box");
    if (box) box.parentNode.insertBefore(S.statusEl, box.nextSibling);
    if (focusSel) { var el = S.root.querySelector(focusSel); if (el && !el.disabled) el.focus(); }
  }

  function menuHtml() {
    var data = loadData(), rec = readRecord(data, S.who), entries = visibleEntries(S.who, !!data.kennedyAll);
    var h = '<p class="ch-note">Pick a lesson. Each one is short and kind.</p><ol class="ch-list">';
    entries.forEach(function (e, i) {
      var open = isUnlocked(entries, i, rec, S.who), done = !!rec.done[e.id];
      h += '<li><button type="button" class="ch-btn ch-item" data-act="start" data-id="' + e.id + '"' + (open ? "" : ' disabled aria-disabled="true"') + ">" +
        "<span>" + e.n + ". " + e.title + "</span><span>" + (done ? "★ done" : (open ? "" : "locked")) + "</span></button></li>";
    });
    return h + '</ol><p class="ch-note">Coach strength: ' + (rec.level + 1) + " of 4. It changes by itself as you play.</p>";
  }

  function entryById(id) { for (var i = 0; i < LESSONS.length; i++) if (LESSONS[i].id === id) return LESSONS[i]; return null; }

  function lessonHtml() {
    var L = S.L, o = {
      st: L.st, sel: L.sel, last: {}, hint: setOf(L.clue ? [L.clue.from, L.clue.to] : []), dots: {}, targets: {},
      stars: setOf(L.starSquares.filter(function (s) { return L.collected.indexOf(s) < 0; }))
    };
    if (S.entry.showTargets && L.sel >= 0) {
      o.targets = setOf(legalMoves(L.st).filter(function (m) { return m.from === L.sel; }).map(function (m) { return m.to; }));
    }
    var h = '<div class="ch-dotsrow">Puzzle ' + (L.pi + 1) + " of " + S.entry.puzzles.length + "</div>" + boardHtml(o) + '<div class="ch-row">';
    if (L.solved) h += L.pi + 1 < S.entry.puzzles.length ? '<button type="button" class="ch-btn" data-act="next">Next puzzle</button>' : '<button type="button" class="ch-btn" data-act="finish">Finish lesson</button>';
    else h += '<button type="button" class="ch-btn" data-act="clue">Show a clue</button>';
    return h + '<button type="button" class="ch-btn" data-act="retry">Start again</button><button type="button" class="ch-btn" data-act="menu">Lessons</button></div>';
  }

  function gameHtml() {
    var G = S.g, targets = {}, dots = {};
    if (G.sel >= 0 && (G.mode === "pawnwar" || S.think) && !G.over) {
      legalMoves(G.st).filter(function (m) { return m.from === G.sel; }).forEach(function (m) {
        targets[m.to] = true;
        if (S.think && landingSquareAttacked(G.st, m)) dots[m.to] = true;
      });
    }
    var hintSq = G.hint ? [G.hint.from, G.hint.to] : (G.ask ? [G.ask.hangSq] : []);
    var h = boardHtml({ st: G.st, sel: G.sel, last: setOf(G.last), hint: setOf(hintSq), dots: dots, targets: targets, stars: {} });
    if (G.ask) {
      h += '<div class="ch-ask" role="group" aria-label="Safety question"><p>Is that piece safe there?</p><div class="ch-row">' +
        '<button type="button" class="ch-btn" data-act="anyway">Move anyway</button><button type="button" class="ch-btn" data-act="again">Choose again</button></div></div>';
    }
    var left = S.who === "kennedy" ? "" : " (" + Math.max(0, 3 - G.undos) + " left)";
    return h + '<div class="ch-row">' +
      '<button type="button" class="ch-btn" data-act="hint"' + (G.over || G.busy ? " disabled" : "") + ">Hint</button>" +
      '<button type="button" class="ch-btn" data-act="think" aria-pressed="' + (S.think ? "true" : "false") + '">Think ahead</button>' +
      '<button type="button" class="ch-btn" data-act="undo"' + (G.hist.length && !G.over && !G.busy ? "" : " disabled") + ">Undo" + left + "</button>" +
      (G.over ? '<button type="button" class="ch-btn" data-act="again_game">Play again</button>' : "") +
      '<button type="button" class="ch-btn" data-act="menu">Lessons</button></div>';
  }

  // ----- lessons -----
  function startLesson(entry) {
    S.view = "lesson"; S.entry = entry; S.L = { pi: 0 };
    loadPuzzle(true);
  }
  function loadPuzzle(first) {
    var L = S.L, puz = S.entry.puzzles[L.pi];
    L.st = parseFEN(puz.fen); L.collected = []; L.moves = 0; L.solved = false; L.sel = -1; L.clue = null;
    L.starSquares = (puz.stars || []).map(sqFromName);
    setStatus(puz.text, false);
    render();
    say(first ? S.entry.intro + " " + puz.text : puz.text);
  }

  function onLessonSquare(sq) {
    var L = S.L, st = L.st, p = st.b[sq], mv, mine = p && colorOf(p) === "w";
    if (L.solved) return;
    L.clue = null;
    if (L.sel >= 0) {
      if (sq === L.sel) { L.sel = -1; setStatus(S.entry.puzzles[L.pi].text, false); return render(); }
      mv = findMove(st, L.sel, sq);
      if (mv) return lessonMove(mv);
      if (mine) { L.sel = sq; setStatus("Tap a square to move your " + NAMES[kindOf(p)] + ".", false); return render(); }
      var pseudoOk = pseudoMoves(st).some(function (m) { return m.from === L.sel && m.to === sq; });
      setStatus(pseudoOk ? "That square is in danger. The king must not step there." : "The " + NAMES[kindOf(st.b[L.sel])] + " cannot go there.", false);
      return render();
    }
    if (mine) { L.sel = sq; setStatus("Tap a square to move your " + NAMES[kindOf(p)] + ".", false); }
    else setStatus("Tap one of your light pieces first.", false);
    render();
  }

  function lessonMove(mv) {
    var L = S.L, puz = S.entry.puzzles[L.pi], st = L.st, res;
    L.sel = -1;
    if (puz.goal === "stars") {
      var took = isCapture(st, mv) ? NAMES[kindOf(capturedPiece(st, mv))] : "";
      L.st = passTurn(makeMove(st, mv), "w");
      L.moves++;
      if (L.starSquares.indexOf(mv.to) >= 0 && L.collected.indexOf(mv.to) < 0) L.collected.push(mv.to);
      var left = L.starSquares.length - L.collected.length;
      if (left === 0) {
        L.solved = true;
        setStatus(L.moves <= puz.par ? "Well done. You did it in " + L.moves + (L.moves === 1 ? " move." : " moves.") :
          "Well done. Next time, try it in " + puz.par + (puz.par === 1 ? " move." : " moves."), true);
        say(S.status);
      } else {
        setStatus((took ? "You took the " + took + ". " : "") + "Good. " + left + (left === 1 ? " star left." : " stars left."), false);
      }
      return render();
    }
    res = checkGoalMove(puz, st, mv);
    if (res.ok) {
      L.st = makeMove(st, mv); L.solved = true;
      setStatus(res.why + " Well done.", true);
    } else setStatus(res.why, false);
    say(S.status);
    render();
  }

  function lessonClue() {
    var L = S.L, puz = S.entry.puzzles[L.pi], m = null;
    if (L.solved) return;
    if (puz.goal === "stars") {
      var sol = solveStarsFrom(L.st, puz.stars.filter(function (s) { return L.collected.indexOf(sqFromName(s)) < 0; }));
      m = sol && sol.first;
    } else m = goalMoves(puz, L.st)[0];
    if (!m) { setStatus("Try tapping a piece to see where it can go.", false); return render(); }
    L.clue = { from: m.from, to: m.to };
    setStatus("Try the " + NAMES[kindOf(L.st.b[m.from])] + " on " + spoken(m.from) + ".", false);
    say(S.status);
    render();
  }

  function finishLesson() {
    var rec = record();
    rec.done[S.entry.id] = true;
    saveRecord(rec);
    S.view = "menu";
    setStatus("Lesson finished. Well done.", true);
    say(S.status);
    render();
  }

  // ----- games -----
  function startGame(entry) {
    clearTimeout(S.timer);
    S.view = "game"; S.entry = entry;
    S.g = { mode: entry.mode, st: startState(entry.mode), hist: [], undos: 0, over: false, sel: -1, ask: null, hint: null, last: [], busy: false };
    setStatus("Your move. You are the light pieces.", false);
    render();
    say(entry.intro);
  }

  function onGameSquare(sq) {
    var G = S.g, st = G.st, p = st.b[sq], mv, mine = p && colorOf(p) === "w";
    if (G.over || G.busy || G.ask) return;
    G.hint = null;
    if (G.sel >= 0) {
      if (sq === G.sel) { G.sel = -1; return render(); }
      mv = findMove(st, G.sel, sq);
      if (mv) return childMove(mv, false);
      if (mine) { G.sel = sq; return render(); }
      var pseudoOk = pseudoMoves(st).some(function (m) { return m.from === G.sel && m.to === sq; });
      setStatus(pseudoOk ? "That move would leave your king in danger." : "That piece cannot go there.", false);
      return render();
    }
    if (mine) {
      G.sel = sq;
      setStatus(legalMoves(st).some(function (m) { return m.from === sq; }) ? "Tap a square to move your " + NAMES[kindOf(p)] + "." : "That piece cannot move right now.", false);
    } else setStatus("Tap one of your light pieces first.", false);
    render();
  }

  function childMove(mv, confirmed) {
    var G = S.g;
    if (!confirmed) {
      var hang = hangingAfterMove(G.st, mv);
      if (hang >= 0) {
        G.ask = { mv: mv, hangSq: hang };
        setStatus("Is that piece safe there?", false);
        say(S.status);
        return render();
      }
    }
    G.hist.push({ st: G.st, last: G.last });
    G.st = makeMove(G.st, mv); G.last = [mv.from, mv.to]; G.sel = -1; G.ask = null; G.hint = null;
    var res = gameResult(G.st, G.mode);
    if (res.over) return finishGame(res);
    setStatus("The coach is thinking.", false);
    G.busy = true;
    render();
    var mySession = S;
    S.timer = setTimeout(function () {
      if (S !== mySession || S.g !== G) return;
      G.busy = false;
      var cm = coachMove(G.st, record().level, Math.random, G.mode);
      if (!cm) return finishGame(gameResult(G.st, G.mode));
      var text = describeMove(G.st, cm);
      G.st = makeMove(G.st, cm); G.last = [cm.from, cm.to];
      var r2 = gameResult(G.st, G.mode);
      if (r2.over) return finishGame(r2, text);
      setStatus(text + " Your move." + (inCheck(G.st, "w") ? " Your king is in check." : ""), false);
      render();
    }, 600);
  }

  function finishGame(res, prefix) {
    var G = S.g, rec = record(), kind = res.winner === "w" ? "win" : res.winner === "b" ? "loss" : "draw";
    G.over = true; G.busy = false; G.sel = -1; G.ask = null; G.hint = null;
    var n = updateStrength(rec, kind), text, why = "";
    if (res.reason === "blocked") why = res.winner === "w" ? " The coach cannot move." : " You cannot move.";
    if (kind === "win") { n.done[S.entry.id] = true; text = "You won. Well done." + why; }
    else if (kind === "loss") text = (prefix ? prefix + " " : "") + "The coach won this time." + why + " You are learning a lot.";
    else text = "It is a draw. Good game.";
    if (n.change === "up") text += " Next time the coach plays a little harder.";
    if (n.change === "down") text += " Next time the coach plays a little gentler.";
    saveRecord(n);
    setStatus(text, kind === "win");
    render();
    say(text);
  }

  function undoMove() {
    var G = S.g;
    if (!G.hist.length || G.over || G.busy) return;
    if (S.who !== "kennedy" && G.undos >= 3) { setStatus("No more undos in this game.", false); return render(); }
    var back = G.hist.pop();
    G.st = back.st; G.last = back.last; G.undos++; G.sel = -1; G.ask = null; G.hint = null;
    setStatus("Moved back. Your move.", false);
    render();
  }

  function gameHint() {
    var G = S.g;
    if (G.over || G.busy) return;
    var m = hintMove(G.st, G.mode);
    if (!m) return;
    G.hint = { from: m.from, to: m.to }; G.sel = -1; G.ask = null;
    setStatus(hintReason(G.st, m), false);
    say(S.status);
    render();
  }

  // ----- events -----
  function onClick(e) {
    if (!S) return;
    var t = e.target.closest ? e.target.closest("[data-sq],[data-act]") : null;
    if (!t || !S.root.contains(t)) return;
    var sq = t.getAttribute("data-sq"), act = t.getAttribute("data-act"), en, ask;
    if (sq !== null) {
      if (S.view === "lesson") return onLessonSquare(+sq);
      if (S.view === "game") return onGameSquare(+sq);
      return;
    }
    if (act === "exit") { if (S.opts.onExit) S.opts.onExit(); return; }
    if (act === "menu") { clearTimeout(S.timer); S.view = "menu"; setStatus("Pick a lesson.", false); return render(); }
    if (act === "start") { en = entryById(t.getAttribute("data-id")); return en.kind === "game" ? startGame(en) : startLesson(en); }
    if (act === "next") { S.L.pi++; return loadPuzzle(false); }
    if (act === "finish") return finishLesson();
    if (act === "retry") return loadPuzzle(false);
    if (act === "clue") return lessonClue();
    if (act === "think") {
      S.think = !S.think;
      setStatus(S.think ? "Think ahead is on. Purple dots show squares the other side guards." : "Think ahead is off.", false);
      return render();
    }
    if (act === "hint") return gameHint();
    if (act === "undo") return undoMove();
    if (act === "anyway") { ask = S.g.ask; S.g.ask = null; return childMove(ask.mv, true); }
    if (act === "again") { S.g.ask = null; S.g.sel = -1; setStatus("Choose again. Your move.", false); return render(); }
    if (act === "again_game") return startGame(S.entry);
  }

  var api = {
    id: "chess",
    title: "Chess coach",
    open: function (container, opts) {
      if (S) api.close();
      injectCss();
      var root = document.createElement("div");
      root.className = "ch-wrap";
      container.innerHTML = "";
      container.appendChild(root);
      opts = opts || {};
      S = { container: container, root: root, opts: opts, who: normalizeWho(opts.who), view: "menu", think: false,
            status: "Welcome to chess. Pick a lesson.", star: false, statusEl: null, statusShown: null, timer: null };
      root.addEventListener("click", onClick);
      render();
      say(S.status);
    },
    close: function () {
      if (!S) return;
      clearTimeout(S.timer);
      S.root.removeEventListener("click", onClick);
      S.container.innerHTML = "";
      S = null;
    }
  };

  if (typeof window !== "undefined") {
    window.BrainGames = window.BrainGames || {};
    window.BrainGames.chess = api;
  }

  if (typeof module === "object" && module.exports) {
    module.exports = {
      api: api, FILES: FILES, VALUES: VALUES, NAMES: NAMES, START_FEN: START_FEN, LESSONS: LESSONS,
      sqName: sqName, sqFromName: sqFromName, colorOf: colorOf, kindOf: kindOf, parseFEN: parseFEN, stateKey: stateKey,
      attackersOf: attackersOf, inCheck: inCheck, pseudoMoves: pseudoMoves, legalMoves: legalMoves, makeMove: makeMove,
      perft: perft, findMove: findMove, isCapture: isCapture, capturedPiece: capturedPiece, gameStatus: gameStatus,
      gameResult: gameResult, startState: startState, evaluate: evaluate, scoreMoves: scoreMoves,
      hangingPieces: hangingPieces, isFreeCapture: isFreeCapture, hangingAfterMove: hangingAfterMove,
      landingSquareAttacked: landingSquareAttacked, coachMove: coachMove, hintMove: hintMove, hintReason: hintReason,
      describeMove: describeMove, checkGoalMove: checkGoalMove, solveStars: solveStars, goalMoves: goalMoves,
      puzzleProblems: puzzleProblems, visibleEntries: visibleEntries, isUnlocked: isUnlocked, defaultRecord: defaultRecord,
      readRecord: readRecord, writeRecord: writeRecord, updateStrength: updateStrength, passTurn: passTurn
    };
  }
})();
