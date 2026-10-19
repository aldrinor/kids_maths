"""Replace the castle-defence card with a real scene: the castle wall, Kennedy's knight on top, 5 ladders with goblins
climbing. Each right answer pushes the next ladder over or drops a soft rock beside it, and that goblin runs home.
Nobody is hurt. One slow movement per answer, no flashing. Run once from src/."""
from pathlib import Path

P = Path(__file__).parent / "modules" / "knight.js"
s = P.read_text(encoding="utf-8")
a = s.index("  function defence(container, level, done) {")
b = s.index("  window.KnightWorld = {")
NEW = r'''  /* ---------- Castle defence: after 20 answers in a day ----------
     A scene, not a card: the wall, the knight on top, 5 ladders with goblins climbing. Each right answer clears the
     next ladder: a push (the ladder tips back) or a soft rock beside it (the goblin runs off). Nobody is hurt. */
  const DEF_CSS = `.kd { width: min(980px, 100%); display: grid; gap: 10px; }
.kd-scene { width: 100%; height: auto; display: block; border-radius: 20px; border: 1px solid rgba(0,0,0,.12); background: #e3eefa; }
.kd-lad { transition: transform 1.2s ease-in, opacity 1.2s ease-in; transform-box: fill-box; transform-origin: 50% 100%; }
.kd-lad.push { transform: rotate(-38deg); opacity: 0; }
.kd-lad.rock { opacity: 0; transition-delay: .9s; }
.kd-gob { transition: transform 1.6s ease-in, opacity 1.6s ease-in; }
.kd-gob.gone { transform: translateX(-260px); opacity: 0; }
.kd-rock { transition: transform .9s ease-in; }
.kd-rock.drop { transform: translateY(250px); }
.kd-lad.next .rail { stroke: #e2b23f; }
.kd-panel { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 12px; align-items: center; background: #fff; border: 1px solid rgba(0,0,0,.12); border-radius: 20px; padding: 12px; }
.kd-q { font: 800 clamp(30px, 6vw, 48px)/1 var(--display, inherit); text-align: center; }
.kd-msg { margin: 6px 0 0; text-align: center; font-weight: 800; color: #53627c; }
.kd-keys { display: grid; grid-template-columns: repeat(6, 56px); gap: 6px; }
.kd-keys button { height: 56px; border-radius: 14px; border: 1px solid rgba(0,0,0,.14); background: #fff; font: 800 24px/1 inherit; box-shadow: 0 2px 0 rgba(0,0,0,.12); }
.kd-keys button[data-k="go"] { background: #3d6fd8; color: #fff; border-color: #3d6fd8; }
@media (max-width: 620px) { .kd-panel { grid-template-columns: 1fr; } .kd-keys { grid-template-columns: repeat(6, minmax(0, 1fr)); } }
@media (prefers-reduced-motion: reduce) { .kd-lad, .kd-gob, .kd-rock { transition: opacity .15s; } }`;
  function defence(container, level, done) {
    css();
    if (!document.getElementById("kd-css")) { const st = document.createElement("style"); st.id = "kd-css"; st.textContent = DEF_CSS; document.head.appendChild(st); }
    const XS = [110, 290, 470, 650, 830], cleared = [false, false, false, false, false];
    let q = null, typed = "", tries = 0, turn = 0;
    const opts = { armour: has("armour"), plume: has("plume"), shield: has("shield"), sword: has("sword2") ? "silver" : has("sword") ? "wood" : "none" };
    const ladder = (x, i) => `<g class="kd-lad" data-lad="${i}"><g stroke="#8a6a4e" stroke-width="9" stroke-linecap="round" fill="none">
        <path class="rail" d="M${x} 470 L${x + 40} 175"/><path class="rail" d="M${x + 46} 470 L${x + 86} 175"/>
        ${[0, 1, 2, 3, 4, 5, 6].map(k => { const t = (k + .5) / 7, y = 470 - t * 295; return `<path d="M${x + t * 40} ${y} L${x + 46 + t * 40} ${y}" stroke-width="7"/>`; }).join("")}</g></g>`;
    const goblin = (x, i) => `<g class="kd-gob" data-gob="${i}"><svg x="${x - 10}" y="${250 + (i % 2) * 70}" width="100" height="130" viewBox="0 0 200 260">${KnightArt.full("badguy", "grumpy").replace(/^<svg[^>]*>|<\/svg>$/g, "")}</svg></g>`;
    container.innerHTML = `<div class="kd"><svg class="kd-scene" viewBox="0 0 1000 520" role="img" aria-label="The castle wall with ladders">
      <rect width="1000" height="520" fill="#e3eefa"/><path d="M0 400 Q250 350 500 395 T1000 380 V520 H0 Z" fill="#cfe8c4"/>
      <rect x="0" y="470" width="1000" height="50" fill="#bfe0b2"/>
      <rect x="40" y="180" width="920" height="292" fill="#e9dcc9" stroke="#3b2a33" stroke-width="3" opacity=".95"/>
      ${Array.from({ length: 23 }, (_, k) => `<rect x="${44 + k * 40}" y="150" width="26" height="32" fill="#e9dcc9" stroke="#3b2a33" stroke-width="3"/>`).join("")}
      ${Array.from({ length: 7 }, (_, r) => `<path d="M40 ${215 + r * 38} H960" stroke="#d6c4a9" stroke-width="2"/>`).join("")}
      <svg x="430" y="0" width="140" height="182" viewBox="0 0 200 260" class="kd-knight">${KnightArt.full("knight", "stand", opts).replace(/^<svg[^>]*>|<\/svg>$/g, "")}</svg>
      <circle class="kd-rock" cx="500" cy="200" r="0" fill="#a8a29a" stroke="#3b2a33" stroke-width="3"/>
      ${XS.map(ladder).join("")}${XS.map(goblin).join("")}
    </svg>
    <div class="kd-panel"><div><div class="kd-q" aria-live="polite"></div><p class="kd-msg" aria-live="polite"></p></div>
      <div class="kd-keys">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(k => `<button type="button" data-k="${k}">${k}</button>`).join("")}<button type="button" data-k="del" aria-label="Delete">⌫</button><button type="button" data-k="go" aria-label="Check">✓</button></div></div></div>`;
    const $c = sel => container.querySelector(sel);
    const nextLadder = () => cleared.findIndex(v => !v);
    function show(msg) {
      $c(".kd-q").textContent = `${q.a} ${q.op === "+" ? "+" : "−"} ${q.b} = ${typed || "?"}`;
      $c(".kd-msg").textContent = msg || "";
      container.querySelectorAll(".kd-lad").forEach((g, i) => g.classList.toggle("next", i === nextLadder()));
    }
    const next = () => { q = gen(level); window.KnightWorld._q = q; typed = ""; tries = 0; show(`Ladder ${nextLadder() + 1}. Answer to clear it.`); speak(`${q.a} ${q.op === "+" ? "plus" : "take away"} ${q.b}`); };
    function clearLadder(i) {
      const lad = $c(`[data-lad="${i}"]`), gob = $c(`[data-gob="${i}"]`);
      const useRock = turn++ % 2 === 1;
      gob.innerHTML = gob.innerHTML.replace(/<svg([^>]*)>[\s\S]*<\/svg>/, (m, at) => `<svg${at}>${KnightArt.full("badguy", "runaway").replace(/^<svg[^>]*>|<\/svg>$/g, "")}</svg>`);
      if (useRock) {
        const rock = $c(".kd-rock"); rock.setAttribute("cx", XS[i] + 120); rock.setAttribute("r", 18); rock.classList.remove("drop"); void rock.getBBox();
        rock.classList.add("drop"); lad.classList.add("rock");
      } else lad.classList.add("push");
      setTimeout(() => gob.classList.add("gone"), 500);
      cleared[i] = true;
      return useRock ? "A soft rock! The goblin runs home." : "Push! The ladder tips back. The goblin runs home.";
    }
    function press(k) {
      if (k === "del") { typed = typed.slice(0, -1); return show(); }
      if (k !== "go") { if (typed.length < 3) typed += k; return show(); }
      if (!typed) return;
      if (+typed !== q.ans) { tries++; typed = ""; return show(tries >= 2 ? "Count with your fingers. Take your time." : "Not quite. Try again."); }
      const said = clearLadder(nextLadder()); speak(said);
      if (nextLadder() < 0) {
        P.coins = (P.coins || 0) + 10; save(); if (typeof renderTop === "function") renderTop();
        $c(".kd-panel").innerHTML = `<div><div class="kd-q">The castle is safe!</div><p class="kd-msg">All the goblins went home. You win 10 coins.</p></div><button class="main-btn" type="button" id="knDefDone">Next</button>`;
        setTimeout(() => speak("The castle is safe! All the goblins went home. You win 10 coins."), 1400);
        $c("#knDefDone").onclick = done; return;
      }
      typed = ""; setTimeout(next, 1500); show(said);
    }
    container.querySelectorAll("[data-k]").forEach(b => b.onclick = () => press(b.dataset.k));
    next();
  }

'''
s = s[:a] + NEW + s[b:]
P.write_text(s, encoding="utf-8")
print("defence replaced")
