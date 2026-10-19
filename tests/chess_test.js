// Chess coach tests. Plain Node, no browser. One line per check.
// Run: node tests/chess_test.js
const path = require("path");
const modulePath = path.join(__dirname, "../src/modules/chess_coach.js");
const C = require(modulePath); // loads with no window and no document

let pass = 0, fail = 0;
function ok(name, cond, detail) {
  if (cond) { pass++; console.log("PASS " + name); }
  else { fail++; console.log("FAIL " + name + (detail !== undefined ? " | " + JSON.stringify(detail) : "")); }
}
// Run one check; an exception counts as a failure.
function t(name, fn) {
  try { fn(); } catch (e) { fail++; console.log("FAIL " + name + " | threw: " + e.message); }
}
function seeded(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
const S = (fen) => C.parseFEN(fen);
const legalNames = (fen, allPromos) => C.legalMoves(S(fen), allPromos).map(m => C.sqName(m.from) + C.sqName(m.to) + (m.promo && allPromos ? m.promo : ""));
const has = (fen, name) => legalNames(fen).indexOf(name) >= 0;

// ---------- perft ----------
t("perft start", () => {
  const st = S(C.START_FEN);
  [[1, 20], [2, 400], [3, 8902]].forEach(([d, n]) => { const got = C.perft(st, d); ok("perft start depth " + d + " = " + n, got === n, got); });
});
t("perft kiwipete", () => {
  const st = S("r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1");
  [[1, 48], [2, 2039]].forEach(([d, n]) => { const got = C.perft(st, d); ok("perft kiwipete depth " + d + " = " + n, got === n, got); });
});
t("perft position 3 (en passant, pins)", () => {
  const st = S("8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1");
  [[1, 14], [2, 191], [3, 2812]].forEach(([d, n]) => { const got = C.perft(st, d); ok("perft position 3 depth " + d + " = " + n, got === n, got); });
});
t("perft position 4 (promotion, castling)", () => {
  const st = S("r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1");
  [[1, 6], [2, 264], [3, 9467]].forEach(([d, n]) => { const got = C.perft(st, d); ok("perft position 4 depth " + d + " = " + n, got === n, got); });
});

// ---------- checkmate and stalemate ----------
t("mate and stalemate", () => {
  ok("fool's mate is checkmate", C.gameStatus(S("rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3")) === "checkmate");
  ok("back rank mate is checkmate", C.gameStatus(S("R5k1/5ppp/8/8/8/8/8/4K3 b - - 0 1")) === "checkmate");
  ok("queen and king stalemate", C.gameStatus(S("7k/5Q2/6K1/8/8/8/8/8 b - - 0 1")) === "stalemate");
  ok("start position is ongoing", C.gameStatus(S(C.START_FEN)) === "ongoing");
  ok("check is reported", C.gameStatus(S("4k3/8/8/8/8/8/8/4RK2 b - - 0 1")) === "check");
  ok("king against king is a draw", C.gameStatus(S("4k3/8/8/8/8/8/8/4K3 w - - 0 1")) === "draw");
  const r = C.gameResult(S("R5k1/5ppp/8/8/8/8/8/4K3 b - - 0 1"), "standard");
  ok("gameResult: white wins by checkmate", r.over && r.winner === "w" && r.reason === "checkmate", r);
  const s = C.gameResult(S("7k/5Q2/6K1/8/8/8/8/8 b - - 0 1"), "standard");
  ok("gameResult: stalemate has no winner", s.over && s.winner === null, s);
});

// ---------- castling ----------
t("castling", () => {
  const open = "r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1";
  ok("castling kingside legal", has(open, "e1g1"));
  ok("castling queenside legal", has(open, "e1c1"));
  ok("black can castle both ways", legalNames("r3k2r/8/8/8/8/8/8/R3K2R b KQkq - 0 1").indexOf("e8g8") >= 0 && legalNames("r3k2r/8/8/8/8/8/8/R3K2R b KQkq - 0 1").indexOf("e8c8") >= 0);
  ok("no castling through check (kingside)", !has("5r1k/8/8/8/8/8/8/R3K2R w KQ - 0 1", "e1g1"));
  ok("queenside still fine when only f1 is attacked", has("5r1k/8/8/8/8/8/8/R3K2R w KQ - 0 1", "e1c1"));
  ok("no castling out of check", !has("4r2k/8/8/8/8/8/8/R3K2R w KQ - 0 1", "e1g1") && !has("4r2k/8/8/8/8/8/8/R3K2R w KQ - 0 1", "e1c1"));
  ok("no castling with a piece in between", !has("r3k2r/8/8/8/8/8/8/RN2K2R w KQkq - 0 1", "e1c1") && has("r3k2r/8/8/8/8/8/8/RN2K2R w KQkq - 0 1", "e1g1"));
  ok("no castling without rights", !has("r3k2r/8/8/8/8/8/8/R3K2R w - - 0 1", "e1g1"));
  const after = C.makeMove(S(open), C.findMove(S(open), C.sqFromName("e1"), C.sqFromName("g1")));
  ok("castling moves the rook too", after.b[C.sqFromName("g1")] === "K" && after.b[C.sqFromName("f1")] === "R" && after.b[C.sqFromName("h1")] === "", after.b.join(""));
  const after2 = C.makeMove(S(open), C.findMove(S(open), C.sqFromName("e1"), C.sqFromName("c1")));
  ok("queenside castling moves the rook too", after2.b[C.sqFromName("c1")] === "K" && after2.b[C.sqFromName("d1")] === "R" && after2.b[C.sqFromName("a1")] === "");
  ok("castling removes both rights", after.castle === "kq", after.castle);
  const rookMoved = C.makeMove(S(open), C.findMove(S(open), C.sqFromName("h1"), C.sqFromName("g1")));
  ok("moving the rook removes that right", rookMoved.castle.indexOf("K") < 0 && rookMoved.castle.indexOf("Q") >= 0, rookMoved.castle);
  const rookTaken = S("r3k2r/8/8/8/8/8/6b1/R3K2R b KQkq - 0 1");
  const cap = C.makeMove(rookTaken, C.findMove(rookTaken, C.sqFromName("g2"), C.sqFromName("h1")));
  ok("capturing a rook removes that right", cap.castle.indexOf("K") < 0, cap.castle);
});

// ---------- en passant ----------
t("en passant", () => {
  const st = S("4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1");
  const m = C.findMove(st, C.sqFromName("e5"), C.sqFromName("d6"));
  ok("en passant is legal when the square is set", !!m && m.ep === true);
  const n = C.makeMove(st, m);
  ok("en passant removes the pawn that moved two", n.b[C.sqFromName("d5")] === "" && n.b[C.sqFromName("d6")] === "P");
  ok("no en passant without the square", !has("4k3/8/8/3pP3/8/8/8/4K3 w - - 0 1", "e5d6"));
  const b0 = S("4k3/3p4/8/4P3/8/8/8/4K3 b - - 0 1");
  const b1 = C.makeMove(b0, C.findMove(b0, C.sqFromName("d7"), C.sqFromName("d5")));
  ok("a two-step pawn sets the en passant square", b1.ep === C.sqFromName("d6"), b1.ep);
  ok("white can then take en passant", !!C.findMove(b1, C.sqFromName("e5"), C.sqFromName("d6")));
  ok("en passant is only for one move", C.makeMove(b1, C.findMove(b1, C.sqFromName("e1"), C.sqFromName("e2"))).ep === -1);
  const blk = S("4k3/8/8/8/3pP3/8/8/4K3 b - e3 0 1");
  const bm = C.findMove(blk, C.sqFromName("d4"), C.sqFromName("e3"));
  ok("black en passant works", !!bm && C.makeMove(blk, bm).b[C.sqFromName("e4")] === "");
});

// ---------- promotion ----------
t("promotion", () => {
  const st = S("4k3/P7/8/8/8/8/8/4K3 w - - 0 1");
  ok("kids get one promotion (queen)", C.legalMoves(st).filter(m => m.from === C.sqFromName("a7")).length === 1);
  ok("full rules offer four promotions", C.legalMoves(st, true).filter(m => m.from === C.sqFromName("a7")).length === 4);
  const n = C.makeMove(st, C.findMove(st, C.sqFromName("a7"), C.sqFromName("a8")));
  ok("pawn becomes a queen", n.b[C.sqFromName("a8")] === "Q" && n.b[C.sqFromName("a7")] === "");
  const cp = S("1r2k3/P7/8/8/8/8/8/4K3 w - - 0 1");
  const m2 = C.findMove(cp, C.sqFromName("a7"), C.sqFromName("b8"));
  ok("promotion by capture", !!m2 && C.makeMove(cp, m2).b[C.sqFromName("b8")] === "Q");
  const bp = S("4k3/8/8/8/8/8/p7/4K3 b - - 0 1");
  ok("black promotes to a black queen", C.makeMove(bp, C.findMove(bp, C.sqFromName("a2"), C.sqFromName("a1"))).b[C.sqFromName("a1")] === "q");
});

// ---------- lessons ----------
const L = C.LESSONS;
const piece_lessons = L.filter(e => e.kind === "lesson");
t("lesson ladder shape", () => {
  ok("nine lessons and three games", piece_lessons.length === 9 && L.filter(e => e.kind === "game").length === 3);
  ok("games are pawn war, king and pawns, full game", L.filter(e => e.kind === "game").map(e => e.id).join(",") === "pawnwar,kingpawns,fullgame");
  L.forEach(e => {
    const words = e.intro.split(/\s+/).length;
    ok("intro is plain and short (" + e.id + ", " + words + " words)", words <= 15 && /[.!?]$/.test(e.intro), e.intro);
  });
  piece_lessons.forEach(e => ok("lesson " + e.id + " has 3 to 6 puzzles", e.puzzles.length >= 3 && e.puzzles.length <= 6, e.puzzles.length));
});
piece_lessons.forEach(lesson => {
  lesson.puzzles.forEach((puz, i) => {
    const label = lesson.id + " puzzle " + (i + 1);
    t(label, () => {
      const problems = C.puzzleProblems(puz);
      ok(label + " position is legal", problems.length === 0, problems);
      ok(label + " has a sentence of instructions", typeof puz.text === "string" && puz.text.length > 5);
      const st = S(puz.fen);
      if (puz.goal === "stars") {
        const sol = C.solveStars(puz, 6);
        ok(label + " is solvable and par is the fewest moves", !!sol && sol.moves === puz.par, sol && sol.moves);
        // the first move of the solution is a legal move
        ok(label + " solution starts with a legal move", !!sol && !!C.findMove(st, sol.first.from, sol.first.to));
      } else {
        const good = C.goalMoves(puz, st);
        ok(label + " has a solving move (" + good.length + ")", good.length > 0);
        const all = C.legalMoves(st);
        ok(label + " also has a wrong move to learn from", good.length < all.length);
      }
    });
  });
});
t("lesson 8 trap and lesson 7 trap", () => {
  const p8 = L.find(e => e.id === "l8").puzzles[3], st8 = S(p8.fen);
  const qd4 = C.findMove(st8, C.sqFromName("d2"), C.sqFromName("d4"));
  ok("queen to d4 (pawn guarded square) is refused", !C.checkGoalMove(p8, st8, qd4).ok);
  const p7 = L.find(e => e.id === "l7").puzzles[1], st7 = S(p7.fen);
  const bad = C.findMove(st7, C.sqFromName("d4"), C.sqFromName("d7"));
  ok("queen takes the guarded knight is refused", !C.checkGoalMove(p7, st7, bad).ok);
  const good = C.findMove(st7, C.sqFromName("d4"), C.sqFromName("a4"));
  ok("queen takes the free pawn is accepted", C.checkGoalMove(p7, st7, good).ok);
});

// ---------- who sees what ----------
t("lesson visibility and unlocking", () => {
  const kid = C.visibleEntries("kennedy", false).map(e => e.id).join(",");
  ok("Kennedy sees lessons 1-6 and pawn war", kid === "l1,l2,l3,l4,l5,l6,pawnwar", kid);
  ok("Kennedy with the parent setting sees everything", C.visibleEntries("kennedy", true).length === L.length);
  ok("Marie sees everything", C.visibleEntries("marie", false).length === L.length);
  const rec = C.defaultRecord(), entries = C.visibleEntries("marie", false);
  ok("first lesson is open", C.isUnlocked(entries, 0, rec, "marie"));
  ok("second lesson is locked at first", !C.isUnlocked(entries, 1, rec, "marie"));
  rec.done.l1 = true;
  ok("second lesson opens after the first", C.isUnlocked(entries, 1, rec, "marie") && !C.isUnlocked(entries, 2, rec, "marie"));
  const kEntries = C.visibleEntries("kennedy", false), kr = C.defaultRecord();
  kr.done.l6 = true;
  ok("pawn war opens after lesson 6 for Kennedy", C.isUnlocked(kEntries, 6, kr, "kennedy"));
  ok("checkmate lesson needs lesson 8 done", !C.isUnlocked(entries, 8, { done: { l7: true } }, "marie") && C.isUnlocked(entries, 8, { done: { l8: true } }, "marie"));
  ok("demo has everything open", C.isUnlocked(entries, 11, C.defaultRecord(), "demo"));
});

// ---------- saved progress ----------
t("progress storage", () => {
  const data = C.writeRecord({ kennedyAll: true }, "marie", { done: { l1: true }, level: 2, winRun: 1, lossRun: 0, wins: 5, losses: 1 });
  ok("other store fields are kept", data.kennedyAll === true);
  const back = C.readRecord(JSON.parse(JSON.stringify(data)), "marie");
  ok("record survives JSON save and load", back.level === 2 && back.done.l1 === true && back.wins === 5);
  ok("each child has their own record", C.readRecord(data, "kennedy").level === 0);
  ok("empty store gives a fresh record", C.readRecord(null, "marie").level === 0);
});

// ---------- coach ----------
t("coach level 0", () => {
  const rng = seeded(1), st = S("r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1");
  const hasCapture = C.legalMoves(st).some(m => C.isCapture(st, m));
  let captures = 0;
  for (let i = 0; i < 400; i++) { const m = C.coachMove(st, 0, rng); if (C.isCapture(st, m)) captures++; }
  ok("level 0 never captures when a quiet move exists", hasCapture && captures === 0, captures);
  const fm = C.coachMove(S("k7/8/8/8/8/8/6pp/6KR b - - 0 1"), 0, rng);
  ok("level 0 still returns a legal move", !!fm && !!C.findMove(S("k7/8/8/8/8/8/6pp/6KR b - - 0 1"), fm.from, fm.to));
  // a position where the only legal move is a capture
  const only = S("k7/8/8/8/8/8/6q1/7K w - - 0 1"); // the only legal move is Kxg2
  const onlyMoves = C.legalMoves(only);
  ok("level 0 takes a capture when it is the only choice", onlyMoves.length === 1 && C.isCapture(only, C.coachMove(only, 0, rng)), onlyMoves.length);
  ok("level 0 gives null when there are no moves", C.coachMove(S("R5k1/5ppp/8/8/8/8/8/4K3 b - - 0 1"), 0, rng) === null);
});
t("coach level 1", () => {
  const rng = seeded(7), st = S("4k3/8/8/3b4/8/8/8/3RK3 w - - 0 1"), n = 600;
  let took = 0;
  for (let i = 0; i < n; i++) { const m = C.coachMove(st, 1, rng); if (C.isCapture(st, m)) took++; }
  const frac = took / n;
  ok("level 1 takes a free piece about half the time (" + frac.toFixed(2) + ")", frac > 0.45 && frac < 0.65, frac);
});
t("coach level 2 and 3", () => {
  const rng = seeded(3);
  const white = S("4k3/8/8/3q4/8/8/8/3RK3 w - - 0 1");
  let allTook = true;
  for (let i = 0; i < 40; i++) { const m = C.coachMove(white, 2, rng); if (!(m.from === C.sqFromName("d1") && m.to === C.sqFromName("d5"))) allTook = false; }
  ok("level 2 takes a hanging queen", allTook);
  const black = S("3rk3/8/8/8/3Q4/8/8/4K3 b - - 0 1");
  let blackTook = true;
  for (let i = 0; i < 40; i++) { const m = C.coachMove(black, 2, rng); if (!(m.from === C.sqFromName("d8") && m.to === C.sqFromName("d4"))) blackTook = false; }
  ok("level 2 (as black) takes a hanging queen", blackTook);
  const poisoned = S("4k3/3n4/8/8/p2Q4/8/8/4K3 w - - 0 1");
  let walkedIn = 0;
  for (let i = 0; i < 40; i++) { const m = C.coachMove(poisoned, 3, rng); if (m.to === C.sqFromName("d7")) walkedIn++; }
  ok("level 3 does not take a guarded piece with its queen", walkedIn === 0, walkedIn);
  const free3 = C.coachMove(white, 3, rng);
  ok("level 3 also takes the hanging queen", free3.to === C.sqFromName("d5"));
  const mate = S("6k1/5ppp/8/8/8/8/8/R3K3 w - - 0 1");
  ok("level 2 finds a checkmate in one", C.gameStatus(C.makeMove(mate, C.coachMove(mate, 2, rng))) === "checkmate");
  ok("level 3 finds a checkmate in one", C.gameStatus(C.makeMove(mate, C.coachMove(mate, 3, rng))) === "checkmate");
  [0, 1, 2, 3].forEach(lv => {
    const st = S(C.START_FEN), m = C.coachMove(st, lv, rng);
    ok("level " + lv + " move is legal at the start", !!C.findMove(st, m.from, m.to));
  });
});
t("coach strength goes up and down", () => {
  let rec = C.defaultRecord();
  ok("coach starts at level 0", rec.level === 0);
  rec = C.updateStrength(rec, "win"); rec = C.updateStrength(rec, "win");
  ok("two wins: still level 0", rec.level === 0 && rec.change === "");
  rec = C.updateStrength(rec, "win");
  ok("three wins in a row: level 1", rec.level === 1 && rec.change === "up", rec);
  rec = C.updateStrength(rec, "win"); rec = C.updateStrength(rec, "loss"); rec = C.updateStrength(rec, "win"); rec = C.updateStrength(rec, "win");
  ok("a loss resets the win run", rec.level === 1, rec);
  rec = C.updateStrength(rec, "loss");
  ok("one loss: no change", rec.level === 1 && rec.change === "");
  rec = C.updateStrength(rec, "loss");
  ok("two losses in a row: down to level 0", rec.level === 0 && rec.change === "down", rec);
  rec = C.updateStrength(rec, "loss"); rec = C.updateStrength(rec, "loss");
  ok("level never goes below 0", rec.level === 0);
  let r2 = C.defaultRecord();
  for (let i = 0; i < 12; i++) r2 = C.updateStrength(r2, "win");
  ok("level never goes above 3", r2.level === 3, r2.level);
  let r3 = C.defaultRecord();
  r3 = C.updateStrength(r3, "win"); r3 = C.updateStrength(r3, "win"); r3 = C.updateStrength(r3, "draw"); r3 = C.updateStrength(r3, "win");
  ok("a draw changes nothing by itself", C.updateStrength(C.defaultRecord(), "draw").winRun === 0 && C.updateStrength(C.defaultRecord(), "draw").level === 0);
  ok("a draw does not break a streak", r3.level === 1, r3);
});

// ---------- hints and safety questions ----------
t("hints", () => {
  const fens = [C.START_FEN, "r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1", "4k3/8/8/3b4/8/8/8/3RK3 w - - 0 1",
    "4k3/8/6p1/1b3p2/3N4/8/8/4K3 w - - 0 1", "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2", "4k3/8/8/4p3/8/8/3Q4/4K3 w - - 0 1"];
  fens.forEach((fen, i) => {
    const st = S(fen), m = C.hintMove(st, "standard");
    ok("hint " + (i + 1) + " is a legal move", !!m && !!C.findMove(st, m.from, m.to));
    const why = C.hintReason(st, m);
    ok("hint " + (i + 1) + " has one short sentence: " + why, typeof why === "string" && why.length > 5 && why.split(".").length <= 3 && why.split(/\s+/).length <= 14, why);
    ok("hint " + (i + 1) + " is the same each time", JSON.stringify(C.hintMove(st, "standard")) === JSON.stringify(m));
  });
  const free = S("4k3/8/8/3b4/8/8/8/3RK3 w - - 0 1"), fm = C.hintMove(free, "standard");
  ok("hint takes the free bishop and says so", C.sqName(fm.to) === "d5" && /free bishop/.test(C.hintReason(free, fm)), C.hintReason(free, fm));
  L.find(e => e.id === "l9").puzzles.forEach((p, i) => {
    const st = S(p.fen), m = C.hintMove(st, "standard");
    ok("hint finds the checkmate in mate puzzle " + (i + 1), C.gameStatus(C.makeMove(st, m)) === "checkmate");
  });
  const pw = C.startState("pawnwar"), pm = C.hintMove(pw, "pawnwar");
  ok("hint in pawn war is legal", !!pm && !!C.findMove(pw, pm.from, pm.to));
});
t("is that piece safe?", () => {
  const st = S("4k3/8/8/4p3/8/8/3Q4/4K3 w - - 0 1");
  const bad = C.findMove(st, C.sqFromName("d2"), C.sqFromName("d4")), good = C.findMove(st, C.sqFromName("d2"), C.sqFromName("d5"));
  ok("queen to a pawn-guarded square asks the question", C.hangingAfterMove(st, bad) === C.sqFromName("d4"));
  ok("queen to a safe square does not", C.hangingAfterMove(st, good) === -1);
  ok("start position moves never ask", C.legalMoves(S(C.START_FEN)).every(m => C.hangingAfterMove(S(C.START_FEN), m) === -1));
  ok("think ahead marks the guarded square", C.landingSquareAttacked(st, bad) && !C.landingSquareAttacked(st, good));
});

// ---------- mini games end properly ----------
t("pawn war rules", () => {
  const st = C.startState("pawnwar");
  ok("pawn war has 16 pawns and no kings", st.b.filter(x => x).length === 16 && C.legalMoves(st).length === 16);
  const win = S("8/P7/8/8/8/8/8/8 w - - 0 1");
  const r = C.gameResult(C.makeMove(win, C.findMove(win, C.sqFromName("a7"), C.sqFromName("a8"))), "pawnwar");
  ok("first pawn to the far side wins", r.over && r.winner === "w", r);
  const blocked = S("8/8/8/8/p7/P7/8/8 w - - 0 1");
  const rb = C.gameResult(blocked, "pawnwar");
  ok("a blocked side loses pawn war", rb.over && rb.winner === "b" && rb.reason === "blocked", rb);
  const kp = S("4k3/8/8/8/8/8/p7/4K3 b - - 0 1");
  const rk = C.gameResult(C.makeMove(kp, C.findMove(kp, C.sqFromName("a2"), C.sqFromName("a1"))), "kingpawns");
  ok("king and pawns: a pawn on the far side wins", rk.over && rk.winner === "b", rk);
});
t("whole games always finish", () => {
  ["pawnwar", "kingpawns", "standard"].forEach((mode, idx) => {
    const rng = seeded(100 + idx);
    let games = mode === "standard" ? 2 : 10, finished = 0, plies;
    for (let g = 0; g < games; g++) {
      let st = C.startState(mode), res = { over: false };
      for (plies = 0; plies < 700 && !res.over; plies++) {
        const level = (st.turn === "w") ? (mode === "standard" ? 3 : 2) : 0;
        const m = C.coachMove(st, level, rng, mode);
        if (!m) break;
        st = C.makeMove(st, m);
        res = C.gameResult(st, mode);
      }
      if (res.over) finished++;
    }
    ok(mode + " games all end (" + finished + "/" + games + ")", finished === games);
  });
});

// ---------- play-first screen helpers ----------
t("hint, danger and characters", () => {
  const st = C.startState("standard");
  const hm = C.hintMove(st, "standard");
  ok("hint move is legal", !!hm && !!C.findMove(st, hm.from, hm.to));
  const hang = C.parseFEN("4k3/8/5n2/8/4B3/8/8/4K3 w - - 0 1");
  const d = C.dangerInfo(hang, "w");
  ok("danger finds the hanging bishop on e4", d.length === 1 && d[0].sq === C.sqFromName("e4") && d[0].by === "n");
  ok("no danger at the start", C.dangerInfo(st, "w").length === 0 && C.dangerInfo(st, "b").length === 0);
  const marks = C.moveMarks(st, C.sqFromName("e2"));
  ok("pawn on e2 shows 2 quiet moves and no captures", Object.keys(marks.dots).length === 2 && Object.keys(marks.caps).length === 0);
  ["marie", "kennedy", "demo"].forEach(who => {
    "kqrbnp".split("").forEach(k => {
      const w = C.pieceChar(who, k.toUpperCase()), b = C.pieceChar(who, k);
      ok(who + " " + k + " white and black have art and a name", !!w.art && !!w.name && !!b.art && !!b.name && w.kind === k && b.color === "b" && w.color === "w");
      ok(who + " " + k + " has a tip", !!C.TIPS[who === "kennedy" ? "kennedy" : "marie"][k]);
    });
    ok(who + " white king has a crown", C.pieceChar(who, "K").crown === true);
  });
  ok("black is the goblin in both themes", C.pieceChar("marie", "q").id === "badguy" && C.pieceChar("kennedy", "n").id === "badguy");
  ok("kennedy knight is the pony", C.pieceChar("kennedy", "N").id === "horse" && C.pieceWord("kennedy", "n") === "pony");
  ok("marie queen is Bella (melody)", C.pieceChar("marie", "Q").id === "melody" && C.pieceLabel("marie", "Q") === "your queen, Bella");
  ok("black label is plain", C.pieceLabel("marie", "r") === "goblin rook");
});

// ---------- registration with a window ----------
t("registration", () => {
  ok("loading without a window did not touch the DOM", typeof C.api.open === "function" && typeof C.api.close === "function");
  global.window = {};
  delete require.cache[require.resolve(modulePath)];
  require(modulePath);
  const g = global.window.BrainGames && global.window.BrainGames.chess;
  ok("registers window.BrainGames.chess with the right shape", !!g && g.id === "chess" && g.title === "Chess coach" && typeof g.open === "function" && typeof g.close === "function");
  ok("close() with nothing open is harmless", (() => { g.close(); return true; })());
  delete global.window;
});

console.log("RESULT " + pass + "/" + (pass + fail) + " passed");
process.exit(fail ? 1 : 0);
