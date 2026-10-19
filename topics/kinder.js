/* kinder.js - Kindergarten games for Kennedy (19 Oct 2026). BC Kindergarten: count to 10, numerals to 10,
   more and less, one more, parts of 5, and naming shapes. Big picture buttons, so he never has to type or read.
   Tapping a thing marks it with a small heart (no number), so he counts himself.
   Same topic API as the other games: make(level, prev), mount(el, Q, api), hint(Q, tries), teach(Q, el, api). */
(function () {
  "use strict";
  const TOPICS = (window.MathTopics = window.MathTopics || []);
  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const shuffle = a => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
  const THINGS = [["strawberry", "strawberries"], ["cookie", "cookies"], ["balloon", "balloons"], ["fish", "fish"], ["star", "stars"], ["donut", "donuts"]];
  const ICON = '<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="4" y="4" width="40" height="40" rx="10" fill="#fffaf3" stroke="#3b2a33" stroke-width="3"/><g fill="#ff8fb1" stroke="#3b2a33" stroke-width="2"><circle cx="16" cy="18" r="5"/><circle cx="32" cy="18" r="5"/><circle cx="24" cy="31" r="5"/></g></svg>';
  function fresh(f, prev) { for (let i = 0; i < 30; i++) { const q = f(); if (!prev || q.key !== prev.key) return q; } return f(); }
  // 4 number choices around the answer; each button shows the numeral and its dots, so a non-reader can match.
  function numChoices(ans, lo, hi, dots) {
    const set = new Set([ans]); while (set.size < 4) set.add(rnd(lo, hi));
    return shuffle([...set]).map(v => ({ value: String(v), label: String(v), html: `<span style="font-size:36px;font-weight:800;line-height:1">${v}</span>${dots ? `<span style="display:block;font-size:10px;letter-spacing:1px;color:#7b55e6">${"●".repeat(v)}</span>` : ""}` }));
  }
  const SHAPES = {
    circle: '<circle cx="30" cy="30" r="22"/>', square: '<rect x="9" y="9" width="42" height="42"/>',
    triangle: '<path d="M30 7 L54 51 L6 51 Z"/>', rectangle: '<rect x="4" y="16" width="52" height="28"/>'
  };
  const shapeSvg = k => `<svg viewBox="0 0 60 60" width="54" height="54" aria-hidden="true"><g fill="#cfe6fb" stroke="#3b2a33" stroke-width="3">${SHAPES[k]}</g></svg>`;

  function make(level, prev) {
    return fresh(() => {
      const [item, many] = pick(THINGS);
      if (level <= 1) {
        const n = level === 0 ? rnd(1, 5) : rnd(6, 10);
        return { key: `k${level}:${n}`, say: `How many ${many}? Touch each one and count.`, show: `How many ${many}?`, answer: String(n),
          input: { type: "choice", choices: numChoices(n, 1, level === 0 ? 5 : 10, true) }, data: { kind: "count", n, item } };
      }
      if (level === 2) {
        const n = rnd(1, 10);
        return { key: `k2:${n}`, say: `Find the number ${n}.`, show: "Find the number you hear.", answer: String(n),
          input: { type: "choice", choices: numChoices(n, 1, 10, false) }, data: { kind: "numeral", n } };
      }
      if (level === 3) {
        let a = rnd(1, 9), b = rnd(1, 9); while (a === b) b = rnd(1, 9);
        return { key: `k3:${a}:${b}`, say: `Which side has more ${many}?`, show: `Which side has more?`, answer: a > b ? "left" : "right",
          input: { type: "choice", choices: [{ value: "left", label: "This side", html: "⬅ This side" }, { value: "right", label: "That side", html: "That side ➡" }] }, data: { kind: "more", a, b, item } };
      }
      if (level === 4) {
        const n = rnd(1, 9);
        return { key: `k4:${n}`, say: `Here are ${n} ${many}. One more comes. How many now?`, show: `One more. How many now?`, answer: String(n + 1),
          input: { type: "choice", choices: numChoices(n + 1, 1, 10, true) }, data: { kind: "onemore", n, item } };
      }
      if (level === 5) {
        const n = rnd(1, 4);
        return { key: `k5:${n}`, say: `The box holds 5. How many more to fill it?`, show: `How many more make 5?`, answer: String(5 - n),
          input: { type: "choice", choices: numChoices(5 - n, 1, 5, true) }, data: { kind: "make5", n } };
      }
      const k = pick(Object.keys(SHAPES));
      return { key: `k6:${k}`, say: `Find the ${k}.`, show: `Find the ${k}.`, answer: k,
        input: { type: "choice", choices: shuffle(Object.keys(SHAPES)).map(s => ({ value: s, label: s, html: shapeSvg(s) })) }, data: { kind: "shape", k } };
    }, prev);
  }

  const CSS = `.kg { height: 100%; display: grid; place-items: center; padding: 8px; }
.kg-things { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; max-width: 420px; }
.kg-thing { position: relative; width: 64px; height: 64px; border: 2px solid #3b2a33; border-radius: 16px; background: #fffaf3; padding: 6px; }
.kg-thing img { width: 100%; height: 100%; } .kg-thing.on::after { content: "♥"; position: absolute; top: -8px; right: -6px; color: #e0306b; font-size: 20px; }
.kg-sides { display: flex; gap: 14px; } .kg-side { display: flex; flex-wrap: wrap; gap: 6px; width: 150px; min-height: 120px; padding: 8px; border: 3px dashed #3b2a33; border-radius: 16px; align-content: flex-start; }
.kg-side .kg-thing { width: 40px; height: 40px; padding: 3px; }
.kg-frame { display: grid; grid-template-columns: repeat(5, 54px); gap: 6px; } .kg-cell { height: 54px; border: 3px solid #3b2a33; border-radius: 10px; background: #fffaf3; display: grid; place-items: center; }
.kg-cell.on::before { content: ""; width: 30px; height: 30px; border-radius: 50%; background: #ff8fb1; border: 2px solid #3b2a33; }
.kg-big { font: 800 22px/1.3 inherit; text-align: center; }`;
  function css() { if (document.getElementById("kg-css")) return; const s = document.createElement("style"); s.id = "kg-css"; s.textContent = CSS; document.head.appendChild(s); }
  const thing = (api, item, i, on) => `<button type="button" class="kg-thing${on ? " on" : ""}" data-t="${i}" aria-label="${on ? "Counted" : "Not counted yet"}"><img src="${api.ART(item)}" alt=""></button>`;

  function mount(el, Q, api) {
    css();
    const D = Q.data, s = { on: {} };
    el.innerHTML = `<div class="kg"></div>`;
    const box = el.firstChild;
    function render() {
      if (D.kind === "count") box.innerHTML = `<div class="kg-things">${Array.from({ length: D.n }, (_, i) => thing(api, D.item, i, s.on[i])).join("")}</div>`;
      else if (D.kind === "numeral") box.innerHTML = `<div class="kg-big">Listen, then find the number.<br><button type="button" class="mini" data-say="1">Hear it again</button></div>`;
      else if (D.kind === "more") box.innerHTML = `<div class="kg-sides"><div class="kg-side" aria-label="This side">${Array.from({ length: D.a }, (_, i) => thing(api, D.item, "a" + i, s.on["a" + i])).join("")}</div><div class="kg-side" aria-label="That side">${Array.from({ length: D.b }, (_, i) => thing(api, D.item, "b" + i, s.on["b" + i])).join("")}</div></div>`;
      else if (D.kind === "onemore") box.innerHTML = `<div class="kg-things">${Array.from({ length: D.n + 1 }, (_, i) => thing(api, D.item, i, s.on[i])).join("")}</div>`;
      else if (D.kind === "make5") box.innerHTML = `<div class="kg-frame" aria-label="A box for 5, ${D.n} full">${Array.from({ length: 5 }, (_, i) => `<div class="kg-cell${i < D.n ? " on" : ""}"></div>`).join("")}</div>`;
      else box.innerHTML = `<div class="kg-big">${Q.show}</div>`;
    }
    function onTap(e) {
      const t = e.target.closest("[data-t]"), sayBtn = e.target.closest("[data-say]");
      if (t && !s.on[t.dataset.t]) { s.on[t.dataset.t] = true; api.tone([600 + Object.keys(s.on).length * 30], .06); render(); }
      if (sayBtn) api.speak(Q.say);
    }
    box.addEventListener("click", onTap);
    render();
    return { s, destroy() { box.removeEventListener("click", onTap); el.innerHTML = ""; } };
  }
  function hint(Q) {
    const D = Q.data;
    if (D.kind === "count" || D.kind === "onemore") return "Touch each one. Say one number for each touch.";
    if (D.kind === "numeral") return "Listen again. Look at each number card.";
    if (D.kind === "more") return "Touch and count each side. The bigger number has more.";
    if (D.kind === "make5") return "Count the empty spaces in the box.";
    if (D.kind === "shape") return `Count the corners. A ${D.k === "circle" ? "circle has no corners" : D.k === "triangle" ? "triangle has 3 corners" : "square and a rectangle have 4 corners"}.`;
    return "Look again, slowly.";
  }
  async function teach(Q, el, api) {
    const D = Q.data;
    if (D.kind === "count" || D.kind === "onemore") { api.say("Let's count together. Touch the first one and say one."); api.highlight(el.querySelector(".kg-things")); return; }
    if (D.kind === "more") { api.say("Touch each one on this side and count. Then count that side."); return; }
    if (D.kind === "make5") { api.say("Touch each empty space and count."); return; }
    api.say(hint(Q));
  }
  TOPICS.push({
    id: "kinder", title: "First numbers", icon: ICON, strand: "Number",
    levels: [
      { name: "Count to 5", grade: 0, note: "BC Kindergarten: count to 5, one number for each thing." },
      { name: "Count to 10", grade: 0, note: "BC Kindergarten: count to 10." },
      { name: "Numbers 1 to 10", grade: 0, note: "BC Kindergarten: know the numerals 1 to 10." },
      { name: "Which has more?", grade: 0, note: "BC Kindergarten: compare quantities to 10." },
      { name: "One more", grade: 0, note: "BC Kindergarten: one more than a number to 10." },
      { name: "Make 5", grade: 0, note: "BC Kindergarten: parts of 5 (decomposing to 5)." },
      { name: "Shapes", grade: 0, note: "BC Kindergarten: name circles, squares, triangles and rectangles." }
    ],
    make, mount, hint, teach
  });
  if (typeof module === "object" && module.exports) module.exports = { make, hint };
})();
