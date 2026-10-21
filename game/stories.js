/* stories.js - the story-question bank for the Kids Maths game (21 Oct 2026).
   UMD: window.KS in the browser, module.exports in node. No DOM.
   Cafe stories are for Marie (kitten Mimi). Castle stories are for Kennedy (little knight).
   Number rules for sums.1 to sums.9 are ported exactly from gen(L) in index.html.

   API
     KS.SKILLS                          supported skill ids
     KS.make(skill, theme, rng, prev)   one question Q (never Q.key === prev)
     KS.teach(Q, right)                 {kind, steps:[{say, draw, line?}]}
     KS.sentences(limit)                every full sentence for sums.1-4 and kinder.* (limit = optional cap)
     KS.pieces()                        every text piece left when sentences are split around digits
     KS.build / KS.templates / KS.usable   used by the tests

   Q fields: skill, theme, tpl, type, a, b, op ("+" or "-"), result (a op b), ans, missing (true when the
   child finds b, as in "8 + ? = 15"), kind ("typed"|"choice"), opts, story, ask, say, eq, correct, fact, hint,
   line {lo,hi,step}, key, scale.
   Normal question: ans = result. Missing part: ans = b, and eq is "a + ? = result".
   Kinder.2 (numerals): a = the number, b = 0, ans = the number, eq is "seven = ?".
   The answer draw item {answer:true} means: write the full sentence of Q.eq with ? filled in by the missing
   number or the result, and circle that number.
   Teach line [from,to,step]: from > to means hop back. Draw hops only when n <= 10. */
(function (root) {
  "use strict";
  const MINUS = "−";
  const THEMES = ["cafe", "castle"];
  const SKILLS = ["sums.1", "sums.2", "sums.3", "sums.4", "sums.5", "sums.6", "sums.7", "sums.8", "sums.9", "kinder.2", "kinder.5"];
  const SMALL_SKILLS = ["sums.1", "sums.2", "sums.3", "sums.4", "kinder.2", "kinder.5"];
  // Biggest number a skill can reach. A story only fits when lo <= scale <= hi.
  const SCALE = { "sums.1": 10, "sums.2": 10, "sums.3": 20, "sums.4": 20, "sums.5": 99, "sums.6": 99, "sums.7": 99, "sums.8": 999, "sums.9": 999, "kinder.2": 10, "kinder.5": 10 };
  const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
  const OP_OF = { J: "+", P: "+", M: "+", A: "-", C: "-", N: "-", K: "+" };

  /* ---------- story templates ----------
     Types: J join (+), P "more than" (+), M missing part (a + ? = total), A take away (-),
     C compare "how many more" (-), N missing part of a take away (a - ? = left), K numeral (kinder.2).
     Placeholders: {a} {b} {t} {r} numbers; {a|cup} adds the plural; {a|more cup|more cups} gives both forms.
     J, P, A, C use a and b. M uses a and t (the total). N uses a and r (what is left). */
  const U = [0, 1000], S = [0, 20], M = [0, 100], L = [99, 1000];
  const BANK = {
    cafe: [
      ["J", U, "Mimi bakes {a|cupcake} in the morning. After lunch she bakes {b|cupcake}.", "How many cupcakes did she bake in all?"],
      ["J", U, "Mimi puts {a|cup} on the shelf. She puts {b|cup} on the table.", "How many cups did she put out in all?"],
      ["J", M, "A customer orders {a|cookie}. Her friend orders {b|cookie}.", "How many cookies does Mimi pack in all?"],
      ["J", U, "{a|customer} came to the cafe before noon. {b|customer} came after noon.", "How many customers came in all?"],
      ["J", S, "Mimi sets {a|saucer} on one table. She sets {b|saucer} on the next table.", "How many saucers did she set out in all?"],
      ["J", M, "The tips jar has {a|coin}. A kind customer adds {b|coin}.", "How many coins are in the jar now?"],
      ["J", S, "Mimi puts {a|tray} in the big oven and {b|tray} in the small oven.", "How many trays are baking in all?"],
      ["J", L, "On Monday Mimi bakes {a|muffin}. On Tuesday she bakes {b|muffin}.", "How many muffins did she bake in two days?"],
      ["J", L, "A big party orders {a|cupcake} and {b|cookie}.", "How many treats is that in all?"],
      ["J", L, "Mimi uses {a|scoop} of flour for bread. She uses {b|scoop} for cake.", "How many scoops of flour did she use in all?"],
      ["J", L, "A delivery brings {a|cup}. A second delivery brings {b|cup}.", "How many cups arrived in all?"],
      ["P", M, "The red table has {a|cup}. The blue table has {b|more cup|more cups} than the red table.", "How many cups does the blue table have?"],
      ["P", U, "On Monday the cafe sold {a|muffin}. On Tuesday it sold {b|more muffin|more muffins} than Monday.", "How many muffins did it sell on Tuesday?"],
      ["M", U, "Mimi needs {t|cup} for the party. She has {a|cup}.", "How many more cups does she need?"],
      ["M", M, "A box holds {t|cookie}. It has {a|cookie} in it.", "How many more cookies fill the box?"],
      ["M", U, "The jar needs {t|coin} for a new oven. It has {a|coin}.", "How many more coins does it need?"],
      ["M", S, "A big table needs {t|chair}. Mimi has {a|chair}.", "How many more chairs does she need?"],
      ["M", U, "The party wants {t|cupcake}. Mimi baked {a|cupcake}.", "How many more cupcakes must she bake?"],
      ["A", U, "Mimi had {a|cupcake} in the case. She sold {b|cupcake}.", "How many cupcakes are left?"],
      ["A", U, "The cafe had {a|clean cup|clean cups}. Customers used {b|cup}.", "How many clean cups are left?"],
      ["A", M, "Mimi put {a|cookie} on a plate. Her friends ate {b|cookie}.", "How many cookies are left?"],
      ["A", U, "{a|customer} sat in the cafe. {b|customer} went home.", "How many customers are still in the cafe?"],
      ["A", S, "Mimi had {a|saucer} on the shelf. She took {b|saucer} to the table.", "How many saucers are left on the shelf?"],
      ["A", M, "The tips jar had {a|coin}. Mimi paid {b|coin} for milk.", "How many coins are left in the jar?"],
      ["A", U, "Mimi had {a|tea bag}. She used {b|tea bag} for tea.", "How many tea bags are left?"],
      ["A", L, "Mimi had {a|muffin} for the week. She sold {b|muffin}.", "How many muffins are left?"],
      ["A", L, "A big order needs {a|cupcake}. Mimi packed {b|cupcake}.", "How many cupcakes are still to pack?"],
      ["A", L, "The cafe had {a|scoop} of flour. Mimi used {b|scoop}.", "How many scoops of flour are left?"],
      ["C", M, "Mimi has {a|cupcake}. Her friend has {b|cupcake}.", "How many more cupcakes does Mimi have?"],
      ["C", S, "The red tray has {a|muffin}. The blue tray has {b|muffin}.", "How many more muffins are on the red tray?"],
      ["C", M, "The red table ordered {a|cookie}. The blue table ordered {b|cookie}.", "How many fewer cookies did the blue table order?"],
      ["C", L, "On Saturday Mimi sold {a|muffin}. On Sunday she sold {b|muffin}.", "How many more muffins did she sell on Saturday?"],
      ["N", S, "Mimi had {a|cup} on the shelf. She took some to wash. {r|cup} stayed on the shelf.", "How many cups did she take to wash?"],
      ["N", S, "A box had {a|cookie}. Some were sold. The box still has {r|cookie}.", "How many cookies were sold?"],
      ["N", S, "{a|customer} sat at the tables. Some went home. {r|customer} stayed.", "How many customers went home?"],
      ["K", U, "Mimi sets the oven dial. It needs the number {w}.", "Which number is {w}?"],
      ["K", U, "Mimi marks a cake box with the number {w}.", "Which number is {w}?"],
      ["K", U, "The cafe door has a sign with the number {w}.", "Which number is {w}?"]
    ],
    castle: [
      ["J", U, "A cart is stuck. {a|villager} pushed it. {b|villager} pulled it.", "How many villagers helped?"],
      ["J", U, "Your horse ate {a|apple}. Then it ate {b|apple}.", "How many apples did it eat?"],
      ["J", M, "You polished {a|shield} on Monday. You polished {b|shield} on Tuesday.", "How many shields did you polish?"],
      ["J", M, "{a|arrow} landed in the target. Then {b|more arrow|more arrows} landed.", "How many arrows landed in all?"],
      ["J", U, "{a|goblin} waved and went home. {b|more goblin|more goblins} went home too.", "How many goblins went home?"],
      ["J", S, "You fixed the bridge with {a|plank}. You added {b|plank}.", "How many planks are on the bridge?"],
      ["J", U, "You found {a|coin} in a chest. You found {b|coin} by a tree.", "How many coins did you find?"],
      ["J", M, "You led {a|sheep|sheep} back to the pen. Then {b|more sheep|more sheep} came.", "How many sheep are in the pen?"],
      ["J", M, "You lit {a|lantern}. Your buddy knight lit {b|lantern}.", "How many lanterns are lit?"],
      ["J", S, "You stepped on {a|stone}. Then you stepped on {b|more stone|more stones}.", "How many stones did you step on?"],
      ["J", L, "You carried {a|brick} to the wall. Later you carried {b|brick}.", "How many bricks did you carry?"],
      ["J", L, "{a|villager} came to the big feast. {b|more villager|more villagers} came late.", "How many villagers came?"],
      ["J", L, "You got {a|coin} from the tower. You got {b|coin} from the cave.", "How many coins did you get?"],
      ["J", L, "Your quiver had {a|arrow}. You made {b|more arrow|more arrows}.", "How many arrows do you have now?"],
      ["J", L, "The farm sent {a|apple} on Monday. It sent {b|apple} on Tuesday.", "How many apples came in all?"],
      ["J", L, "{a|lantern} lit the road on Monday. {b|lantern} lit it on Tuesday.", "How many lanterns lit the road?"],
      ["P", M, "Your buddy knight has {a|coin}. You have {b|more coin|more coins} than your buddy.", "How many coins do you have?"],
      ["P", U, "The old tower has {a|step}. The new tower has {b|more step|more steps} than the old one.", "How many steps does the new tower have?"],
      ["M", S, "The gate needs {t|key}. You have {a|key}.", "How many more keys do you need?"],
      ["M", M, "Your horse wants {t|apple}. It has {a|apple}.", "How many more apples does it want?"],
      ["M", M, "The bridge needs {t|plank}. You have {a|plank}.", "How many more planks do you need?"],
      ["M", U, "The chest needs {t|coin}. You put in {a|coin}.", "How many more coins fill the chest?"],
      ["M", S, "You must light {t|lantern}. You lit {a|lantern}.", "How many more must you light?"],
      ["M", M, "The pen needs {t|sheep|sheep}. You led {a|sheep|sheep} in.", "How many more sheep must come?"],
      ["A", U, "{a|villager} sat in the cart. {b|villager} hopped out.", "How many villagers are still in the cart?"],
      ["A", U, "Your horse had {a|apple}. It ate {b|apple}.", "How many apples are left?"],
      ["A", M, "You had {a|arrow}. You used {b|arrow}.", "How many arrows are left?"],
      ["A", U, "{a|goblin} played near the gate. {b|goblin} ran home.", "How many goblins are still at the gate?"],
      ["A", S, "The bridge had {a|plank}. You took away {b|old plank|old planks}.", "How many planks are left?"],
      ["A", U, "You had {a|coin}. You gave {b|coin} to a villager.", "How many coins are left?"],
      ["A", M, "{a|sheep|sheep} were in the field. You led {b|sheep|sheep} to the pen.", "How many sheep are still in the field?"],
      ["A", M, "You had {a|lantern}. You gave {b|lantern} to your buddy knight.", "How many lanterns do you have now?"],
      ["A", L, "You had {a|brick} for the wall. You used {b|brick}.", "How many bricks are left?"],
      ["A", L, "The feast had {a|villager}. {b|villager} went home.", "How many villagers are still at the feast?"],
      ["A", L, "Your quiver had {a|arrow}. You gave {b|arrow} to your buddy knight.", "How many arrows are left?"],
      ["C", M, "You have {a|apple}. Your buddy has {b|apple}.", "How many more apples do you have?"],
      ["C", S, "The cart has {a|sack}. The wagon has {b|sack}.", "How many more sacks are in the cart?"],
      ["C", M, "Your shield has {a|star}. Your buddy's shield has {b|star}.", "How many fewer stars are on your buddy's shield?"],
      ["C", L, "The east tower has {a|step}. The west tower has {b|step}.", "How many more steps are in the east tower?"],
      ["N", S, "You had {a|apple}. Your horse ate some. You have {r|apple} left.", "How many apples did your horse eat?"],
      ["N", S, "{a|goblin} played at the gate. Some ran home. {r|goblin} stayed.", "How many goblins ran home?"],
      ["N", S, "You had {a|coin}. You gave some to a villager. You have {r|coin} left.", "How many coins did you give?"],
      ["K", U, "The castle gate needs the number {w}.", "Which number is {w}?"],
      ["K", U, "Your shield has the number {w} on it.", "Which number is {w}?"],
      ["K", U, "The tower door shows the number {w}.", "Which number is {w}?"]
    ]
  };
  const TEMPLATES = {};
  THEMES.forEach(th => {
    const count = {};
    TEMPLATES[th] = BANK[th].map(([type, [lo, hi], story, ask]) => {
      count[type] = (count[type] || 0) + 1;
      return { id: `${th}.${type}${count[type]}`, type, lo, hi, story, ask };
    });
  });

  /* ---------- small helpers ---------- */
  const digitsOf = n => String(n).split("").reverse().map(Number);
  function carries(a, b) { const A = digitsOf(a), B = digitsOf(b); let c = 0, k = 0; for (let i = 0; i < Math.max(A.length, B.length); i++) { const s = (A[i] || 0) + (B[i] || 0) + c; c = s >= 10 ? 1 : 0; k += c; } return k; }
  function borrows(a, b) { const A = digitsOf(a), B = digitsOf(b); let br = 0, k = 0; for (let i = 0; i < A.length; i++) { const t = A[i] - br; if (t < (B[i] || 0)) { br = 1; k++; } else br = 0; } return k; }
  const word = op => (op === "+" ? "plus" : "minus");
  const sym = op => (op === "+" ? "+" : MINUS);

  function render(str, v) {
    return str.replace(/\{([abtrw])(?:\|([^|}]*))?(?:\|([^|}]*))?\}/g, (m, k, sing, plur) => {
      if (k === "w") return v.w;
      const n = v[k];
      if (sing === undefined) return String(n);
      return n + " " + (n === 1 ? sing : (plur !== undefined ? plur : sing + "s"));
    });
  }

  /* ---------- number rules: exact port of gen(L) from index.html ---------- */
  function pickNumbers(skill, rng) {
    const rand = (lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));
    const L = +skill.split(".")[1];
    for (let i = 0; i < 4000; i++) {
      let a, b, op = "+";
      switch (L) {
        case 1: a = rand(1, 9); b = rand(1, 10 - a); break;
        case 2: op = "-"; a = rand(2, 10); b = rand(1, a - 1); break;
        case 3: a = rand(2, 9); b = rand(Math.max(2, 11 - a), 9); break;
        case 4: op = "-"; b = rand(2, 9); a = b + rand(2, 9); if (a < 11) continue; break;
        case 5: if (rng() < .5) { a = rand(1, 8) * 10 + rand(0, 8); b = rng() < .5 ? rand(1, 9 - a % 10) : rand(1, 9 - Math.floor(a / 10)) * 10; }
                else { op = "-"; a = rand(2, 9) * 10 + rand(1, 9); b = rng() < .5 ? rand(1, a % 10) : rand(1, Math.floor(a / 10) - 1) * 10; }
                if (op === "+" && (a + b > 99 || carries(a, b))) continue; if (op === "-" && (b >= a || borrows(a, b))) continue; break;
        case 6: if (rng() < .5) { a = rand(10, 89); b = rand(10, 89); if (a + b > 99 || carries(a, b)) continue; }
                else { op = "-"; a = rand(20, 99); b = rand(10, a - 1); if (borrows(a, b)) continue; } break;
        case 7: if (rng() < .5) { a = rand(10, 89); b = rand(10, 89); if (a + b > 99 || !carries(a, b)) continue; }
                else { op = "-"; a = rand(20, 99); b = rand(10, a - 1); if (!borrows(a, b)) continue; } break;
        case 8: if (rng() < .5) { a = rand(100, 899); b = rand(100, 899); if (a + b > 999 || carries(a, b)) continue; }
                else { op = "-"; a = rand(200, 999); b = rand(100, a - 1); if (borrows(a, b)) continue; } break;
        default: if (rng() < .5) { a = rand(100, 899); b = rand(100, 899); if (a + b > 999 || !carries(a, b)) continue; }
                 else { op = "-"; a = rand(200, 999); b = rand(100, a - 1); if (!borrows(a, b) || digitsOf(a)[1] === 0) continue; }
      }
      return { a, b, op };
    }
    throw new Error("KS: no numbers found for " + skill);
  }

  // Every number pair of the small skills (used to list all sentences).
  function allPairs(skill) {
    const out = [];
    if (skill === "sums.1") for (let a = 1; a <= 9; a++) for (let b = 1; b <= 10 - a; b++) out.push({ a, b, op: "+" });
    else if (skill === "sums.2") for (let a = 2; a <= 10; a++) for (let b = 1; b <= a - 1; b++) out.push({ a, b, op: "-" });
    else if (skill === "sums.3") for (let a = 2; a <= 9; a++) for (let b = Math.max(2, 11 - a); b <= 9; b++) out.push({ a, b, op: "+" });
    else if (skill === "sums.4") for (let b = 2; b <= 9; b++) for (let k = 2; k <= 9; k++) { if (b + k >= 11) out.push({ a: b + k, b, op: "-" }); }
    else if (skill === "kinder.2") for (let n = 1; n <= 10; n++) out.push({ a: n, b: 0, op: "+" });
    else if (skill === "kinder.5") for (let n = 1; n <= 4; n++) out.push({ a: n, b: 5 - n, op: "+" });
    else throw new Error("KS: no pair list for " + skill);
    return out;
  }

  /* ---------- number line window: 11 ticks, hi = lo + 10 * step ---------- */
  function lineWindow(p, q) {
    const lo0 = Math.min(p, q), hi0 = Math.max(p, q);
    for (const step of [1, 10, 100]) {
      const span = step * 10;
      for (const unit of [span, span / 2, step]) {
        const lo = Math.floor(lo0 / unit) * unit;
        if (hi0 <= lo + span) return { lo, hi: lo + span, step };
      }
    }
    throw new Error("KS: no number line window for " + p + " and " + q);
  }

  /* ---------- templates that fit a skill ---------- */
  function usable(tpl, skill, op) {
    const sc = SCALE[skill];
    if (skill === "kinder.2") return tpl.type === "K";
    if (skill === "kinder.5") return tpl.type === "M" && sc >= tpl.lo && sc <= tpl.hi;
    return tpl.type !== "K" && OP_OF[tpl.type] === op && sc >= tpl.lo && sc <= tpl.hi;
  }
  const usableList = (theme, skill, op) => TEMPLATES[theme].filter(t => usable(t, skill, op));
  const placeParts = n => {
    const out = [];
    [["hundreds", 100], ["tens", 10], ["ones", 1]].forEach(([name, mag]) => { const d = Math.floor(n / mag) % 10; if (d > 0) out.push({ name, mag, p: d * mag }); });
    return out;
  };
  const placeList = parts => parts.map(x => x.name).join(", then the ");

  /* ---------- build one question ---------- */
  function build(skill, theme, tpl, a, b, rng) {
    rng = rng || (() => .5);
    const sc = SCALE[skill], type = tpl.type, op = type === "K" ? "+" : OP_OF[type], missing = type === "M" || type === "N";
    const Q = { skill, theme, tpl: tpl.id, type, a, b, op, scale: sc, missing };
    if (type === "K") {
      const w = WORDS[a], v = { w };
      Q.result = a; Q.ans = a; Q.eq = `${w} = ?`;
      Q.fact = `The number ${w} is written ${a}.`; Q.hint = `Count along the line up to ${w}.`;
      Q.story = render(tpl.story, v); Q.ask = render(tpl.ask, v);
      Q.line = { lo: 0, hi: 10, step: 1 }; Q.key = `k2:${a}`; Q.word = w;
    } else {
      const result = op === "+" ? a + b : a - b, v = { a, b, t: result, r: result };
      Q.result = result; Q.ans = missing ? b : result;
      Q.eq = missing ? `${a} ${sym(op)} ? = ${result}` : `${a} ${sym(op)} ${b} = ?`;
      Q.fact = `${a} ${word(op)} ${b} is ${result}.`;
      Q.story = render(tpl.story, v); Q.ask = render(tpl.ask, v);
      Q.line = lineWindow(a, result);
      Q.key = skill === "kinder.5" ? `k5:${a}` : (missing ? `${a}${op}?${result}` : `${a}${op}${b}`);
      if (missing) Q.hint = op === "+" ? `Start at ${a} and hop up to ${result}.` : `Start at ${result} and hop up to ${a}.`;
      else if (sc <= 20) Q.hint = `Start at ${a} and hop ${op === "+" ? "forward" : "back"} ${b}.`;
      else Q.hint = `Start at ${a} and ${op === "+" ? "add" : "take away"} the ${placeList(placeParts(b))}.`;
    }
    Q.say = Q.story + " " + Q.ask;
    Q.correct = "Correct! " + Q.fact;
    // The youngest group taps big buttons; everyone else types.
    Q.kind = skill.startsWith("kinder") || (theme === "castle" && sc <= 20) ? "choice" : "typed";
    if (Q.kind === "choice") {
      let pool;
      if (type === "K") pool = WORDS.map((w, i) => i).filter(i => i >= 1 && i !== Q.ans);
      else if (skill === "kinder.5") pool = [0, 1, 2, 3, 4, 5].filter(i => i !== Q.ans && i > 0);
      else pool = [Q.ans - 2, Q.ans - 1, Q.ans + 1, Q.ans + 2].filter(x => x >= 0);
      const picks = [];
      while (picks.length < 2) picks.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
      const opts = [Q.ans, ...picks];
      for (let i = opts.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [opts[i], opts[j]] = [opts[j], opts[i]]; }
      Q.opts = opts;
    }
    return Q;
  }

  function make(skill, theme, rng, prevKey) {
    rng = rng || Math.random;
    if (!SKILLS.includes(skill)) throw new Error("KS: unknown skill " + skill);
    if (!THEMES.includes(theme)) throw new Error("KS: unknown theme " + theme);
    for (let i = 0; i < 4000; i++) {
      let n;
      if (skill === "kinder.2") n = { a: 1 + Math.floor(rng() * 10), b: 0, op: "+" };
      else if (skill === "kinder.5") { const x = 1 + Math.floor(rng() * 4); n = { a: x, b: 5 - x, op: "+" }; }
      else n = pickNumbers(skill, rng);
      const list = usableList(theme, skill, n.op);
      if (!list.length) throw new Error("KS: no story fits " + skill + " " + theme);
      const Q = build(skill, theme, list[Math.floor(rng() * list.length)], n.a, n.b, rng);
      if (Q.key !== prevKey) return Q;
    }
    throw new Error("KS: could not avoid repeating " + prevKey);
  }

  /* ---------- the lesson ---------- */
  function headStep(Q) {
    const { a, b, op, result, type } = Q, w = word(op);
    const say = {
      J: `Putting together means plus. So it is ${a} plus ${b}.`,
      P: `More than means plus. So it is ${a} plus ${b}.`,
      A: `Taking away means minus. So it is ${a} minus ${b}.`,
      C: `To compare, take away the smaller. So it is ${a} minus ${b}.`,
      M: `We have ${a}. We want ${result}. How many more?`,
      N: `We had ${a}. Now ${result} are left. How many went away?`,
      K: `Let's find it. The number ${Q.word}.`
    }[type];
    return { say, draw: [{ row: 0, tokens: Q.eq.split(" ") }] };
  }
  const row = (i, x, o, y, z) => ({ row: i, tokens: [String(x), sym(o), String(y), "=", String(z)] });

  function teach(Q, right) {
    const { a, b, op, result, type } = Q, steps = [headStep(Q)];
    let kind;
    if (type === "K") {
      kind = "numeral";
      steps.push({ say: `Count along the line up to ${Q.word}.`, draw: [], line: [0, a, 1] });
    } else if (type === "M" || type === "N") {
      if (Q.scale <= 20) {
        kind = "count_up";
        const from = op === "+" ? a : result, to = op === "+" ? result : a;
        steps.push({ say: `Start at ${from}. Hop up to ${to}.`, draw: [{ hops: { from, n: b, dir: 1 } }], line: [from, to, 1] });
        steps.push({ say: `You hopped ${b}.`, draw: [row(1, a, op, b, result)] });
      } else {
        kind = "places";
        let cur = a;
        const parts = placeParts(b);
        parts.forEach((x, i) => {
          const next = cur + x.p;
          steps.push({ say: `Hop up the ${x.name}. ${cur} plus ${x.p} is ${next}.`, draw: [row(i + 1, cur, "+", x.p, next)], line: [cur, next, x.mag] });
          cur = next;
        });
        if (parts.length === 2) steps.push({ say: `You hopped ${parts[0].p} and ${parts[1].p}. That is ${b}.`, draw: [] });
        if (parts.length === 3) steps.push({ say: `You hopped ${parts[0].p}, ${parts[1].p} and ${parts[2].p}. That is ${b}.`, draw: [] });
      }
    } else if (Q.scale > 20) {
      kind = "places";
      let cur = a;
      placeParts(b).forEach((x, i) => {
        const next = op === "+" ? cur + x.p : cur - x.p;
        steps.push({ say: `${op === "+" ? "Add" : "Take away"} the ${x.name}. ${cur} ${word(op)} ${x.p} is ${next}.`, draw: [row(i + 1, cur, op, x.p, next)], line: [cur, next, x.mag] });
        cur = next;
      });
    } else {
      // Within 20: make 10, back to 10, ones, exact 10, hops (as in the demo).
      const tens = Math.floor(a / 10) * 10, ones = a % 10;
      if (op === "+") {
        const next = tens + 10, need = next - a;
        if (b > need) {
          kind = "make10";
          steps.push({ say: `Make ${next} first. ${a} needs ${need} more to make ${next}.`, draw: [{ split: [need, b - need] }] });
          steps.push({ say: `So split ${b} into ${need} and ${b - need}.`, draw: [] });
          steps.push({ say: `${a} plus ${need} is ${next}.`, draw: [row(1, a, "+", need, next)], line: [a, next, 1] });
          steps.push({ say: `Then ${next} plus ${b - need} is ${result}.`, draw: [row(2, next, "+", b - need, result)], line: [next, result, 1] });
        } else if (b === need) {
          kind = "exact10";
          steps.push({ say: `${a} and ${b} make ${next}.`, draw: [row(1, a, "+", b, next)], line: [a, next, 1] });
        } else if (a >= 10) {
          kind = "ones";
          steps.push({ say: `Look at the ones. ${ones} plus ${b} is ${ones + b}.`, draw: [row(1, ones, "+", b, ones + b)] });
          steps.push({ say: `Keep the ${tens}. ${tens} plus ${ones + b} is ${result}.`, draw: [row(2, tens, "+", ones + b, result)], line: [a, result, 1] });
        } else {
          kind = "hops";
          steps.push({ say: `Start at ${a}. Hop forward ${b}.`, draw: [{ hops: { from: a, n: b, dir: 1 } }], line: [a, result, 1] });
        }
      } else if (a <= 10) {
        kind = "hops";
        steps.push({ say: `Start at ${a}. Hop back ${b}.`, draw: [{ hops: { from: a, n: b, dir: -1 } }], line: [a, result, 1] });
      } else if (b > ones) {
        kind = "back10";
        steps.push({ say: `Go back to ${tens} first. Take away ${ones} to get to ${tens}.`, draw: [{ split: [ones, b - ones] }] });
        steps.push({ say: `So split ${b} into ${ones} and ${b - ones}.`, draw: [] });
        steps.push({ say: `${a} minus ${ones} is ${tens}.`, draw: [row(1, a, "-", ones, tens)], line: [a, tens, 1] });
        steps.push({ say: `Then ${tens} minus ${b - ones} is ${result}.`, draw: [row(2, tens, "-", b - ones, result)], line: [tens, result, 1] });
      } else if (b === ones) {
        kind = "exact10";
        steps.push({ say: `Take away the ${ones} ones. ${tens} is left.`, draw: [row(1, a, "-", b, tens)], line: [a, tens, 1] });
      } else {
        kind = "ones";
        steps.push({ say: `Look at the ones. ${ones} minus ${b} is ${ones - b}.`, draw: [row(1, ones, "-", b, ones - b)] });
        steps.push({ say: `Keep the ${tens}. ${tens} plus ${ones - b} is ${result}.`, draw: [row(2, tens, "+", ones - b, result)], line: [a, result, 1] });
      }
    }
    steps.push({ say: right ? Q.fact : `${Q.fact} ${Q.kind === "typed" ? "Type" : "Tap"} ${Q.ans}.`, draw: [{ answer: true }] });
    return { kind, steps };
  }

  /* ---------- every sentence and every piece ---------- */
  function addQuestionTexts(Q, put) {
    [Q.say, Q.correct, Q.fact, Q.hint].forEach(put);
    [true, false].forEach(r => teach(Q, r).steps.forEach(s => put(s.say)));
  }
  let sentenceCache = null, pieceCache = null;
  function allSentences() {
    if (sentenceCache) return sentenceCache;
    const out = new Set();
    THEMES.forEach(theme => SMALL_SKILLS.forEach(skill => allPairs(skill).forEach(p => {
      usableList(theme, skill, p.op).forEach(tpl => addQuestionTexts(build(skill, theme, tpl, p.a, p.b), t => out.add(t)));
    })));
    sentenceCache = [...out];
    return sentenceCache;
  }
  const sentences = limit => (typeof limit === "number" ? allSentences().slice(0, limit) : allSentences().slice());

  const splitPieces = (text, put) => text.split(/\d+/).map(x => x.trim()).filter(Boolean).forEach(put);
  // Numbers that show every way a lesson can change shape (which places of b are used).
  const BIG_B = { 2: [5, 50, 55], 3: [5, 50, 55, 500, 505, 550, 555] };
  function structuralPairs(skill) {
    if (SMALL_SKILLS.includes(skill)) return allPairs(skill);
    const bs = SCALE[skill] > 99 ? BIG_B[3] : BIG_B[2], out = [];
    bs.forEach(b => { out.push({ a: 111, b, op: "+" }); out.push({ a: 999, b, op: "-" }); });
    return out;
  }
  function pieces() {
    if (pieceCache) return pieceCache;
    const out = new Set(), put = t => splitPieces(t, x => out.add(x));
    THEMES.forEach(theme => {
      // story + question: try 1 and 2 for every number so both plural forms appear
      TEMPLATES[theme].forEach(tpl => {
        if (tpl.type === "K") { WORDS.slice(1).forEach(w => put(render(tpl.story, { w }) + " " + render(tpl.ask, { w }))); return; }
        [1, 2].forEach(x => [1, 2].forEach(y => put(render(tpl.story, { a: x, b: y, t: y, r: y }) + " " + render(tpl.ask, { a: x, b: y, t: y, r: y }))));
      });
      // fact, correct, hint and lesson sentences
      SKILLS.forEach(skill => structuralPairs(skill).forEach(p => {
        TEMPLATES[theme].filter(t => usable(t, skill, p.op)).filter((t, i, all) => all.findIndex(u => u.type === t.type) === i)
          .forEach(tpl => addQuestionTexts(build(skill, theme, tpl, p.a, p.b), put));
      }));
    });
    pieceCache = [...out];
    return pieceCache;
  }

  const KS = { SKILLS, THEMES, SCALE, WORDS, make, build, teach, sentences, pieces, templates: theme => TEMPLATES[theme].slice(), usable, allPairs, lineWindow };
  if (typeof module !== "undefined" && module.exports) module.exports = KS; else root.KS = KS;
})(typeof window !== "undefined" ? window : globalThis);
