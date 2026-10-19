/* times.js - Grade 4 times and division (19 Oct 2026), and the English times chant.
   Same topic API as the other games: make(level, prev), mount(el, Q, api), hint(Q, tries), teach(Q, el, api).
   Pictures first: rows of dots she can tick one row at a time (a tick has no number), so she counts by rows herself.
   The chant replaces 九因歌: the children do not read Chinese, so it is "2 times 3 is 6" in the same sing-song order.
   Table order everywhere: 2, 10, 5, 4, 3, 9, 6, 8, 7. */
(function () {
  "use strict";
  const TOPICS = (window.MathTopics = window.MathTopics || []);
  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const TABLES = [[2, 10, 5], [4, 3], [9], [6, 8, 7]];
  const ICON = '<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="4" y="4" width="40" height="40" rx="10" fill="#fffaf3" stroke="#3b2a33" stroke-width="3"/><g fill="#7b55e6"><circle cx="15" cy="15" r="4"/><circle cx="24" cy="15" r="4"/><circle cx="33" cy="15" r="4"/><circle cx="15" cy="24" r="4"/><circle cx="24" cy="24" r="4"/><circle cx="33" cy="24" r="4"/></g><path d="M14 36 L22 36 M18 32 L18 40 M28 33 L34 39 M34 33 L28 39" stroke="#3b2a33" stroke-width="2.5" stroke-linecap="round"/></svg>';
  const CHANT_ICON = '<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="4" y="4" width="40" height="40" rx="10" fill="#fffaf3" stroke="#3b2a33" stroke-width="3"/><path d="M18 34 V14 L34 10 V30" fill="none" stroke="#3b2a33" stroke-width="3" stroke-linejoin="round"/><circle cx="15" cy="34" r="4" fill="#ff8fb1" stroke="#3b2a33" stroke-width="2"/><circle cx="31" cy="30" r="4" fill="#ff8fb1" stroke="#3b2a33" stroke-width="2"/></svg>';
  const n = (v, w) => `${v} ${w}${v === 1 ? "" : "s"}`;

  // Never the same question twice in a row.
  function fresh(f, prev) { for (let i = 0; i < 30; i++) { const q = f(); if (!prev || q.key !== prev.key) return q; } return f(); }

  /* ---------- Making questions ---------- */
  function makeFacts(level, prev) {
    return fresh(() => {
      if (level <= 3) {                                       // times facts, one group of tables at a time
        const t = pick(TABLES[level]), k = rnd(2, 10), [r, c] = Math.random() < .5 ? [k, t] : [t, k];
        return { key: `x${r}x${c}`, say: `${r} times ${c}. ${r} rows of ${c}. How many?`, show: `${r} × ${c} = ?`,
          answer: String(r * c), input: { type: "number", unit: "" }, data: { kind: "times", r, c, pic: r * c <= 60 } };
      }
      if (level === 4) {                                      // division facts: share into equal rows
        const t = pick([2, 10, 5, 4, 3]), k = rnd(2, 10), N = t * k;
        return { key: `d${N}/${t}`, say: `${N} shared into ${t} equal rows. How many in each row?`, show: `${N} ÷ ${t} = ?`,
          answer: String(k), input: { type: "number", unit: "" }, data: { kind: "div", N, d: t, r: t, c: k, pic: N <= 60 } };
      }
      if (level === 5) {                                      // missing number: 6 × ? = 42
        const t = pick([2, 3, 4, 5, 6, 7, 8, 9, 10]), k = rnd(2, 10);
        return { key: `m${t}x${k}`, say: `${t} times what makes ${t * k}?`, show: `${t} × ? = ${t * k}`,
          answer: String(k), input: { type: "number", unit: "" }, data: { kind: "missing", r: t, c: k, pic: false } };
      }
      if (level === 6 || level === 7) {                       // 2- or 3-digit times 1-digit, as a split (area) model
        const a = level === 6 ? rnd(12, 49) : rnd(102, 249), b = rnd(2, level === 6 ? 6 : 4);
        return { key: `big${a}x${b}`, say: `${a} times ${b}.`, show: `${a} × ${b} = ?`,
          answer: String(a * b), input: { type: "number", unit: "" }, data: { kind: "split", a, b } };
      }
      if (level === 8) {                                      // 2-digit divided by 1-digit, no remainder
        const d = rnd(2, 5), q = rnd(11, 24), N = d * q;
        return { key: `bd${N}/${d}`, say: `${N} shared by ${d}. How many each?`, show: `${N} ÷ ${d} = ?`,
          answer: String(q), input: { type: "number", unit: "" }, data: { kind: "bigdiv", N, d } };
      }
      const d = rnd(3, 6), q = rnd(2, 6), r = rnd(1, d - 1), N = d * q + r;   // level 9: remainder
      return { key: `rem${N}/${d}`, say: `${N} sweets into bags of ${d}. How many full bags?`, show: `${N} ÷ ${d} = ? full bags, and some left`,
        answer: String(q), input: { type: "number", unit: "" }, data: { kind: "rem", N, d, q, left: r } };
    }, prev);
  }
  function makeChant(level, prev) {
    return fresh(() => {
      const t = pick(TABLES[level]), k = rnd(2, 10);
      return { key: `ch${t}x${k}`, say: `The ${t} times chant. ${t} times ${k} is?`, show: `${t} × ${k} = ?`,
        answer: String(t * k), input: { type: "number", unit: "" }, data: { kind: "chant", t, k } };
    }, prev);
  }

  /* ---------- Pictures ---------- */
  const CSS = `.tx { height: 100%; display: grid; place-items: center; padding: 6px; overflow: auto; }
.tx-rows { display: grid; gap: 6px; }
.tx-row { display: flex; align-items: center; gap: 4px; padding: 4px 8px; border: 2px solid #3b2a33; border-radius: 14px; background: #fffaf3; font: inherit; cursor: pointer; }
.tx-row.on { background: #e3d9fb; }
.tx-row .tk { width: 22px; text-align: center; font-weight: 800; color: #7b55e6; }
.tx-dot { width: var(--d, 18px); height: var(--d, 18px); border-radius: 50%; background: #ff8fb1; border: 2px solid #3b2a33; }
.tx-dot.five { margin-right: 8px; }
.tx-split { display: flex; gap: 6px; align-items: stretch; font-weight: 800; }
.tx-part { border: 3px solid #3b2a33; border-radius: 12px; padding: 10px; background: #cfe6fb; display: grid; place-items: center; text-align: center; min-width: 70px; }
.tx-part.t { background: #c9ecd9; } .tx-part.h { background: #ffe9a8; }
.tx-chant { display: grid; gap: 4px; font-weight: 800; font-size: 18px; }
.tx-line { padding: 4px 12px; border: 2px solid #3b2a33; border-radius: 12px; background: #fffaf3; font: inherit; text-align: left; cursor: pointer; }
.tx-line.me { background: #ffe9a8; }
.tx-bags { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; }
.tx-bag { display: flex; flex-wrap: wrap; gap: 3px; width: 70px; min-height: 40px; padding: 6px; border: 2px dashed #3b2a33; border-radius: 12px; background: #fffaf3; }
.tx-bag.on { background: #c9ecd9; border-style: solid; }
.tx-loose { display: flex; flex-wrap: wrap; gap: 4px; justify-content: center; margin-top: 10px; max-width: 320px; }`;
  function css() { if (document.getElementById("tx-css")) return; const s = document.createElement("style"); s.id = "tx-css"; s.textContent = CSS; document.head.appendChild(s); }

  function rowsHtml(r, c, ticked) {
    const d = c > 8 || r > 7 ? 14 : 18;
    return `<div class="tx-rows" style="--d:${d}px">${Array.from({ length: r }, (_, i) =>
      `<button type="button" class="tx-row${ticked[i] ? " on" : ""}" data-row="${i}" aria-label="Row of dots${ticked[i] ? ", counted" : ""}"><span class="tk">${ticked[i] ? "✓" : ""}</span>${Array.from({ length: c }, (_, j) => `<span class="tx-dot${j === 4 && c > 5 ? " five" : ""}"></span>`).join("")}</button>`).join("")}</div>`;
  }
  function mount(el, Q, api) {
    css();
    const D = Q.data, s = { ticked: [], bags: [] };
    el.innerHTML = `<div class="tx"></div>`;
    const box = el.firstChild;
    function render() {
      if ((D.kind === "times" || D.kind === "div") && D.pic) box.innerHTML = rowsHtml(D.r, D.c, s.ticked);
      else if (D.kind === "missing") box.innerHTML = `<p style="font-weight:800;text-align:center">Count by ${D.r}s until you reach ${D.r * D.c}.<br>How many jumps?</p>`;
      else if (D.kind === "split") {
        const h = Math.floor(D.a / 100), t = Math.floor(D.a % 100 / 10), o = D.a % 10;
        const parts = [h && [`${h * 100} × ${D.b}`, "h"], t && [`${t * 10} × ${D.b}`, "t"], o && [`${o} × ${D.b}`, "o"]].filter(Boolean);
        box.innerHTML = `<div><p style="text-align:center;font-weight:800">Split ${D.a} into parts. Times each part by ${D.b}. Add them up.</p><div class="tx-split">${parts.map(([l, k]) => `<div class="tx-part ${k}">${l}</div>`).join('<span style="align-self:center">+</span>')}</div></div>`;
      } else if (D.kind === "bigdiv") {
        const tens = Math.floor(D.N / 10) * 10;
        box.innerHTML = `<p style="font-weight:800;text-align:center">Share ${D.N} by ${D.d}.<br>Try a big easy part first: ${D.d} × 10 = ${D.d * 10}.<br>Then share what is left.</p>`;
        void tens;
      } else if (D.kind === "rem") {
        const bags = Math.ceil(D.N / D.d) + 1;
        box.innerHTML = `<div><p style="text-align:center;font-weight:800">Tap a bag to fill it with ${D.d}.</p><div class="tx-bags">${Array.from({ length: bags }, (_, i) =>
          `<button type="button" class="tx-bag${s.bags[i] ? " on" : ""}" data-bag="${i}" aria-label="Bag${s.bags[i] ? ", full" : ", empty"}">${s.bags[i] ? Array(D.d).fill('<span class="tx-dot" style="--d:12px"></span>').join("") : ""}</button>`).join("")}</div>
          <div class="tx-loose" aria-label="Sweets not in a bag">${Array(Math.max(0, D.N - s.bags.filter(Boolean).length * D.d)).fill('<span class="tx-dot" style="--d:14px"></span>').join("")}</div></div>`;
      } else if (D.kind === "chant") {
        box.innerHTML = `<div class="tx-chant">${Array.from({ length: D.k }, (_, i) => {
          const m = i + 1, me = m === D.k;
          return `<button type="button" class="tx-line${me ? " me" : ""}" data-line="${m}">${D.t} times ${m} is ${me ? "?" : D.t * m}</button>`; }).join("")}</div>`;
      } else box.innerHTML = `<p style="font-weight:800;font-size:22px">${Q.show}</p>`;
    }
    function onTap(e) {
      const row = e.target.closest("[data-row]"), bag = e.target.closest("[data-bag]"), line = e.target.closest("[data-line]");
      if (row) { const i = +row.dataset.row; if (!s.ticked[i]) { s.ticked[i] = true; api.tone([600 + s.ticked.filter(Boolean).length * 40], .06); render(); } }
      if (bag) { const i = +bag.dataset.bag, full = s.bags.filter(Boolean).length; if (!s.bags[i] && D.N - full * D.d >= D.d) { s.bags[i] = true; api.tone([620], .06); render(); } else if (!s.bags[i]) api.say(`Not enough left to fill a bag of ${D.d}.`); }
      if (line) { const m = +line.dataset.line; if (m < D.k) api.speak(`${D.t} times ${m} is ${D.t * m}`); else api.speak(`${D.t} times ${m} is?`); }
    }
    box.addEventListener("click", onTap);
    render();
    return { s, render, destroy() { box.removeEventListener("click", onTap); el.innerHTML = ""; } };
  }

  /* ---------- Hints: how to work it out, never the answer ---------- */
  function hint(Q) {
    const D = Q.data;
    if (D.kind === "times") {
      if (D.r === 9 || D.c === 9) { const o = D.r === 9 ? D.c : D.r; return `Nine is ten take away one. Do 10 times ${o}, then take away ${o}.`; }
      if (D.r === 2 || D.c === 2) return "Times 2 is a double. Add the number to itself.";
      if (D.r === 4 || D.c === 4) return "Times 4 is double, then double again.";
      return D.pic ? `Tap each row and count by ${D.c}s.` : `Count by ${D.c}s, ${D.r} times. Use your fingers to keep track.`;
    }
    if (D.kind === "div") return `Think: ${D.d} times what makes ${D.N}? Or tap the rows and count one row.`;
    if (D.kind === "missing") return `Count by ${D.r}s and keep track of how many jumps.`;
    if (D.kind === "split") return "Times each part on its own. Then add the parts together.";
    if (D.kind === "bigdiv") return `${D.d} times 10 is ${D.d * 10}. How many more ${D.d}s fit in what is left?`;
    if (D.kind === "rem") return `Fill bags of ${D.d} until there are not enough left. Count the full bags.`;
    if (D.kind === "chant") return `Tap the lines above and say them. Each line is ${D.t} more.`;
    return "Look at the picture again, one step at a time.";
  }
  // After 3 mistakes: do it together, step by step. She still types the answer herself.
  async function teach(Q, el, api) {
    const D = Q.data, wait = ms => new Promise(r => setTimeout(r, ms));
    if (D.kind === "times" && D.pic) { api.say(`Let's count by ${D.c}s together. Tap the first row and say ${D.c}.`); api.highlight(el.querySelector(".tx-rows")); await wait(400); return; }
    if (D.kind === "split") { const t = D.a - D.a % 10; api.say(`First ${t} times ${D.b}. Then ${D.a % 10} times ${D.b}. Add the two answers.`); return; }
    if (D.kind === "rem") { api.say(`Tap one bag at a time. Stop when fewer than ${D.d} are left. Count your full bags.`); return; }
    if (D.kind === "chant") { api.say(`Tap each line from the top and say it out loud. The next line is ${D.t} more.`); return; }
    api.say(hint(Q));
  }

  TOPICS.push({
    id: "times_facts", title: "Times and share", icon: ICON, strand: "Operations",
    levels: [
      { name: "Times facts: 2, 10 and 5", grade: 4, note: "BC Grade 4: multiplication facts to 10 x 10; 2, 5 and 10 are expected by the end of Grade 4." },
      { name: "Times facts: 4 and 3", grade: 4, note: "Extra goal asked by the parents: the full table to 10 x 10." },
      { name: "Times facts: 9", grade: 4, note: "Strategy: 10 times, take away one group." },
      { name: "Times facts: 6, 8 and 7", grade: 4, note: "The hardest facts come last." },
      { name: "Division facts", grade: 4, note: "BC Grade 4: division facts, linked to times facts." },
      { name: "Missing number", grade: 4, note: "6 x ? = 42." },
      { name: "2-digit times 1-digit", grade: 4, note: "BC Grade 4: multiplication of 2- or 3-digit by 1-digit, by splitting." },
      { name: "3-digit times 1-digit", grade: 4, note: "BC Grade 4." },
      { name: "2-digit divided by 1-digit", grade: 4, note: "BC Grade 4: division of 2-digit by 1-digit." },
      { name: "Division with a remainder", grade: 4, note: "BC Grade 4: interpreting remainders." }
    ],
    make: makeFacts, mount, hint, teach
  });
  TOPICS.push({
    id: "times_chant", title: "Times chant", icon: CHANT_ICON, strand: "Operations",
    levels: [
      { name: "Chant for 2, 10 and 5", grade: 4, note: "English times chant in the same order as 九因歌 (the children do not read Chinese)." },
      { name: "Chant for 4 and 3", grade: 4, note: "" },
      { name: "Chant for 9", grade: 4, note: "" },
      { name: "Chant for 6, 8 and 7", grade: 4, note: "" }
    ],
    make: makeChant, mount, hint, teach
  });
  if (typeof module === "object" && module.exports) module.exports = { makeFacts, makeChant, hint };
})();
