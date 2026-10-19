import sys
p = sys.argv[1]
s = open(p, encoding='utf8').read()


def r(a, b, cnt=1):
    global s
    assert s.count(a) == cnt, (s.count(a), a[:70])
    s = s.replace(a, b)


# ---------- CSS ----------
r('</style>', '''/* Make 10: empty places in Kitty's ten-frame wait to be filled by the friend's blocks. */
.blk.slot { display: inline-block; border: 3px dashed var(--pink-deep); background: #fff7fa; box-sizing: border-box; }
/* 進位 (carrying): the sum written in columns. */
.colsum { display: grid; justify-content: center; gap: 2px; font: 800 clamp(30px, 6vw, 46px)/1.05 var(--display); font-variant-numeric: tabular-nums; }
.colsum .crow { display: grid; grid-template-columns: repeat(var(--cols), 1.25em); text-align: center; }
.colsum .carry { font-size: .55em; grid-template-columns: repeat(var(--cols), 2.27em); color: var(--pink-deep); min-height: 1.1em; }
.colsum .cell.on { background: #fff1b8; border-radius: 10px; }
.colsum .rule { border-top: 4px solid var(--ink); }
.colsum .q { color: var(--pink-deep); }
.colq { text-align: center; font: 800 clamp(20px, 3.4vw, 28px)/1.2 var(--display); }
.colq .stopbox { min-width: 2.2em; }
.headbox { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; min-height: 90px; font: 800 20px/1.2 var(--display); text-align: center; }
.headbox button { min-height: 44px; padding: 0 18px; border-radius: 22px; border: 3px solid var(--ink); background: #fff; font: 800 18px var(--display); }
</style>''')

# ---------- state helpers ----------
r('const isSmall = q => q.level <= 4;', '''const isSmall = q => q.level <= 4;
// Make 10: a small adding sum that goes past 10 (like 8 + 5). Kitty stops on 10 first, then adds the rest.
const makeTen = q => !!q && q.op === "+" && q.level <= 4 && q.a < 10 && q.a + q.b > 10;
// 進位: a two- or three-digit adding sum that carries. It is done in columns, ones first, with bundling.
const colMode = q => !!q && q.op === "+" && !isSmall(q) && carries(q.a, q.b) > 0;
const PLACE = ["ones", "tens", "hundreds"], PLACE1 = ["one", "ten", "hundred"];
let col = null, headShown = false;
// After 3 first-try right answers of one kind, the blocks hide ("in your head"); she can still ask for them.
const headKind = () => makeTen(Q) ? "ten" : col ? "col" : "";
const inHead = () => { const k = headKind(); return !!k && !headShown && ((P.head || {})[k] || 0) >= 3; };''')
r('function isStop(n) { const p', 'function isStop(n) { if (makeTen(Q)) return n === 10 - Q.a; const p')
r('return !!Q && !isSmall(Q) && !revealLanding', 'return !!Q && (!isSmall(Q) || makeTen(Q)) && !col && !revealLanding')

# ---------- new question ----------
r('  stopMisses = {}; buildBlocks(Q); resetLine(); setKitty("");', '''  stopMisses = {}; headShown = false;
  col = colMode(Q) ? { i: 0, n: Math.max(String(Q.a).length, String(Q.b).length), carry: [0, 0, 0, 0], out: [], step: "add", typed: "", miss: 0, count: false } : null;
  buildBlocks(Q); resetLine(); setKitty("");''')
r('''  speak(`${lead}${Q.a} ${opWord(Q.op)} ${Q.b}`);
  qStart''', '''  speak(`${lead}${Q.a} ${opWord(Q.op)} ${Q.b}`);
  if (col) say(`${lead}Let's add in columns. Start with the ones: ${colAsk()}`, "", false);
  else if (makeTen(Q)) say(`${lead}Make 10 first! Tap ${CHARS[friend].name}'s blocks to fill Hello Kitty's ten. Kitty stops on 10.`, "", false);
  qStart''')

# ---------- stop messages ----------
r('''  if (stopPending()) say("Kitty stopped! Type her number in the glowing box.", "");''',
  '''  if (stopPending()) say(makeTen(Q) ? "The ten is full! Type Kitty's number in the glowing box." : "Kitty stopped! Type her number in the glowing box.", "");''')
r('''    say(`Yes! Hello Kitty is on ${want}. Now hop by ${sizeWord(Math.abs(nextStep()))}.`, "good");''',
  '''    say(makeTen(Q) ? `Yes! ${Q.a} + ${10 - Q.a} = 10. Now add the rest: 10 + ${Q.b - (10 - Q.a)}. Hop on!` : `Yes! Hello Kitty is on ${want}. Now hop by ${sizeWord(Math.abs(nextStep()))}.`, "good");''')
r('''  if (stopMiss < TEACH_AFTER_MISTAKES) say(`Not quite. Count by''',
  '''  if (makeTen(Q) && stopMiss < TEACH_AFTER_MISTAKES) say("Not quite. Look at Hello Kitty's ten-frame. Is it full? Count all the places.", "warn");
  else if (stopMiss < TEACH_AFTER_MISTAKES) say(`Not quite. Count by''')
r('''  if (isSmall(Q)) return Q.op === "+" ? `Start at''', '''  if (col) return colHint();
  if (makeTen(Q)) return `Make 10 first: ${Q.a} and how many make 10? Then add the rest of ${CHARS[friend].name}'s blocks.`;
  if (isSmall(Q)) return Q.op === "+" ? `Start at''')

# ---------- press: column input ----------
r('''function press(k) {
  if (phase !== "ask" && phase !== "afterTeach") return;''', '''function press(k) {
  if (phase !== "ask" && phase !== "afterTeach") return;
  if (col) {
    if (col.step !== "add") { say(`Tap 10 ${PLACE[col.i]} blocks first, to bundle them.`, "warn"); return; }
    if (k === "del") col.typed = col.typed.slice(0, -1);
    else if (k === "go") return colCheck();
    else if (col.typed.length < 2) col.typed = (col.typed === "0" ? "" : col.typed) + k;
    renderLine(); return;
  }''')

# ---------- tapBlock / restart in column mode ----------
r('''  const b = blocks[k];
  if (b.gone) return;''', '''  const b = blocks[k];
  if (b.gone) return;
  if (col) return colTap(b);''')
r('''function restartLine() {
  if (!Q || !active()) return;''', '''function restartLine() {
  if (!Q || !active()) return;
  if (col) { if (col.step === "add" && !col.count) blocks.forEach(b => { delete b.mark; }); renderAll(); return; }''')

# ---------- column logic ----------
r('''/* ----- answering ----- */''', '''/* ----- 進位: adding in columns (ones first; 10 of a kind bundle into 1 of the next) ----- */
const colSum = i => (digits(Q.a)[i] || 0) + (digits(Q.b)[i] || 0) + col.carry[i];
function colAsk() {
  const i = col.i, da = digits(Q.a)[i] || 0, db = digits(Q.b)[i] || 0;
  return `${col.carry[i] ? "1 + " : ""}${da} + ${db} = ?`;
}
function colHint() {
  const i = col.i, da = digits(Q.a)[i] || 0, db = digits(Q.b)[i] || 0;
  return `Count the ${PLACE[i]} blocks: Hello Kitty has ${da}, ${CHARS[friend].name} has ${db}${col.carry[i] ? ", and 1 more you carried" : ""}. Start at ${da} and count on.`;
}
function colCheck() {
  if (!col.typed) { say("Type your number with the number buttons.", "warn"); return; }
  const want = colSum(col.i);
  if (parseInt(col.typed, 10) === want) {
    col.typed = ""; col.miss = 0; col.count = false; blocks.forEach(b => { delete b.mark; });
    tone([660, 880]);
    if (want >= 10) { col.step = "bundle"; renderAll(); say(`Yes, ${want} ${PLACE[col.i]}! That is 10 or more. Tap 10 ${PLACE[col.i]} blocks to bundle them into 1 ${PLACE1[col.i + 1]}.`, "good"); return; }
    col.out[col.i] = want; return colNext(`Yes! Write ${want} under the ${PLACE[col.i]}.`);
  }
  col.typed = ""; col.miss++; tries++; helped = true; P.missed[Q.key] = (P.missed[Q.key] || 0) + 1; save();
  tone([330], .2, "triangle"); setKitty("think");
  if (col.miss === 1) { renderAll(); say(`Not quite. Tap each ${PLACE1[col.i]} block and count in your head.`, "warn"); return; }
  if (col.miss === 2) { renderAll(); say(colHint(), "warn"); return; }
  // 3 mistakes: count them together, out loud, one tap at a time. Then she types the number.
  col.count = true; blocks.forEach(b => { delete b.mark; }); headShown = true;
  renderAll(); say(`Let's count the ${PLACE[col.i]} together. Tap each glowing block.`, "teach");
}
function colTap(b) {
  const sz = 10 ** col.i;
  if (b.size !== sz) { say(`We are adding the ${PLACE[col.i]} now. Tap the ${PLACE1[col.i]} blocks.`, "warn"); wiggle(b.id); return; }
  if (b.mark) { wiggle(b.id); return; }
  b.mark = true;
  const n = blocks.filter(x => x.size === sz && x.mark).length;
  tone([560 + Math.min(n, 20) * 12], .05);
  if (col.step === "bundle" && n >= 10) return colBundle(sz);
  renderAll();
  if (col.count) { speak(String(n)); if (!blocks.some(x => x.size === sz && !x.mark)) say(`Now type how many ${PLACE[col.i]}.`, "teach"); }
  else wiggle(b.id);
}
function colBundle(sz) {
  const ten = blocks.filter(x => x.size === sz && x.mark).slice(0, 10), at = blocks.indexOf(ten[0]);
  blocks = blocks.filter(x => !ten.includes(x));
  blocks.forEach(b => { delete b.mark; });
  // The new bigger block joins Hello Kitty's bigger blocks.
  let k = blocks.findIndex(x => x.who === "kitty" && x.size === sz * 10);
  if (k < 0) k = Math.max(0, at);
  blocks.splice(k, 0, { id: ++seq, who: "kitty", size: sz * 10, fresh: true });
  const want = colSum(col.i);
  col.out[col.i] = want - 10; col.carry[col.i + 1] = 1;
  tone([440, 550, 660, 880], .07);
  colNext(`10 ${PLACE[col.i]} make 1 ${PLACE1[col.i + 1]}! Carry the 1 to the ${PLACE[col.i + 1]}. Write ${want - 10} under the ${PLACE[col.i]}.`);
}
function colNext(msg) {
  col.i++; col.step = "add";
  if (col.i >= col.n) { typed = String(Q.ans); return correct(); }
  renderAll();
  say(`${msg} Now the ${PLACE[col.i]}: ${colAsk()}`, "good");
}
function renderCol() {
  const n = col.n, cols = n + 1, A = digits(Q.a), B = digits(Q.b), la = String(Q.a).length, lb = String(Q.b).length;
  const cell = (v, i, cls = "") => `<span class="cell${i === col.i ? " on" : ""}${cls}">${v}</span>`;
  const row = f => { let h = ""; for (let i = n - 1; i >= 0; i--) h += f(i); return h; };
  const done = col.i >= n;
  const carry = `<div class="crow carry" style="--cols:${cols}"><span></span>${row(i => `<span>${col.carry[i] ? "1" : ""}</span>`)}</div>`;
  const ra = `<div class="crow" style="--cols:${cols}"><span></span>${row(i => cell(i < la ? A[i] : "", i))}</div>`;
  const rb = `<div class="crow" style="--cols:${cols}"><span>+</span>${row(i => cell(i < lb ? B[i] : "", i))}</div>`;
  const ro = `<div class="crow" style="--cols:${cols}"><span></span>${row(i => col.out[i] !== undefined ? cell(col.out[i], i) : i === col.i ? cell("?", i, " q") : cell("", i))}</div>`;
  const word = done ? "" : PLACE[col.i][0].toUpperCase() + PLACE[col.i].slice(1);
  const ask = done ? "" : col.step === "add" ? `${word}: ${colAsk().replace("?", `<span class="stopbox glow" id="colBox">${col.typed || "?"}</span>`)}` : `Tap 10 ${PLACE[col.i]} blocks to bundle them.`;
  $("line").classList.remove("focus");
  $("line").innerHTML = `<div class="colsum" aria-label="Column sum">${carry}${ra}${rb}<div class="rule"></div>${ro}</div><div class="colq">${ask}</div>`;
}

/* ----- answering ----- */''')

# renderLine: column early return; make-10 sentence
r('''  if (!Q || phase === "idle") return;
  box.classList.toggle("focus", guiding());''', '''  if (!Q || phase === "idle") return;
  if (col) return renderCol();
  box.classList.toggle("focus", guiding());''')
r('''  const sentence = `Hello Kitty starts on ${line.start}.${''',
  '''  const sentence = makeTen(Q) ? (line.known.length ? `${Q.a} + ${10 - Q.a} = 10. Then 10 + ${Q.b - (10 - Q.a)}.` : `Make 10 first: ${Q.a} + ? = 10`) : `Hello Kitty starts on ${line.start}.${''')

# ---------- renderBlocks: head mode, ten-frame filling, column glow ----------
r('''  const glow = teachTargets().blocks;
  const a = rowHTML''', '''  if (inHead()) {
    $("blocks").innerHTML = `<div class="headbox"><span>Try it in your head!</span><button type="button" data-show="1">Show the blocks</button></div>`;
    $("recount").disabled = true; return;
  }
  const glow = teachTargets().blocks;
  if (col && col.count && col.i < col.n) blocks.forEach(b => { if (b.size === 10 ** col.i && !b.mark) glow.add(b.id); });
  const a = rowHTML''')
r('''  const mine = blocks.filter(b => b.who === who);
  if (!mine.length) return "";''', '''  let mine = blocks.filter(b => b.who === who);
  // Make 10: the friend's first blocks move into Hello Kitty's ten-frame; its empty places show what is still needed.
  if (makeTen(Q)) {
    const need = 10 - Q.a, moved = line.links.slice(0, need).map(id => blocks.find(x => x.id === id)).filter(Boolean);
    if (who === "kitty") mine = mine.concat(moved, Array.from({ length: need - moved.length }, () => ({ slot: true })));
    else mine = mine.filter(b => !moved.includes(b));
  }
  if (!mine.length) return "";''')
r('''function blockBtn(b, glow) {''', '''function blockBtn(b, glow) {
  if (b.slot) return `<span class="blk slot" aria-hidden="true"></span>`;''')

# ---------- correct(): "in your head" counters ----------
r('''  const wasTaught = phase === "afterTeach";''', '''  const wasTaught = phase === "afterTeach";
  { const k = makeTen(Q) ? "ten" : colMode(Q) ? "col" : ""; if (k) { P.head = P.head || {}; P.head[k] = first && !headShown ? (P.head[k] || 0) + 1 : first ? (P.head[k] || 0) : 0; } }''')
r('''  phase = "done";
  const praise''', '''  phase = "done"; col = null;
  const praise''')

# ---------- wiring: show blocks ----------
r('''$("blocks").addEventListener("click", e => { const b''',
  '''$("blocks").addEventListener("click", e => { if (e.target.closest("[data-show]")) { headShown = true; renderBlocks(); say("Here are the blocks.", ""); return; } const b''')

open(p, 'w', encoding='utf8').write(s)
print('patched')
