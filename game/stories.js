/* stories.js - the story-question bank for the Kids Maths game (21 Oct 2026).
   UMD: window.KS in the browser, module.exports in node. No DOM.
   Cafe stories are for Marie (kitten Mimi). Castle stories are for Kennedy (little knight).
   Number rules for sums.1 to sums.9 are ported exactly from gen(L) in index.html.

   API
     KS.SKILLS                          supported skill ids
     KS.make(skill, theme, rng, prev)   one question Q (never Q.key === prev)
     KS.teach(Q, right)                 {kind, steps:[{say, draw, line?}]}
     KS.sentences(limit)                every full sentence for sums.1-4, kinder.2, kinder.5 and every Stage 3 kind (limit = optional cap)
     KS.pieces()                        every text piece left when sentences are split around digits
     KS.build / KS.templates / KS.usable   used by the tests
     KS.extraSkills()                   the Stage 3 skills for KidsEngine.buildSkillMap(topics, extra)
     KS.fits(skill, theme)              true when the skill has stories in that theme (cafe = Marie, castle = Kennedy)
     KS.KIND_IDS / kindAll / buildKind / kindBank / eachKindQuestion   the Stage 3 kinds, used by the tests

   Q fields: skill, theme, tpl, type, a, b, op ("+" or "-"), result (a op b), ans, missing (true when the
   child finds b, as in "8 + ? = 15"), kind ("typed"|"choice"), opts, story, ask, say, eq, correct, fact, hint,
   line {lo,hi,step}, key, scale, scene (what the scene above the question acts out; see game/scene/scene_core.js).
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
  /* ---------- question scene (22 Oct 2026): what the small scene above the question acts out ----------
     One entry per BANK row, in the same order: "noun", "noun+noun2" (two kinds of thing), "noun@who" (who has them).
     The full list of acts, nouns and fields is written at the top of game/scene/scene_core.js. */
  const SCENE_ROWS = {
    cafe: ["cupcake", "cup", "cookie", "customer", "saucer", "coin", "tray", "muffin", "cupcake+cookie", "scoop", "cup",
      "cup", "muffin",
      "cup", "cookie", "coin", "chair", "cupcake",
      "cupcake", "cup", "cookie@friend", "customer", "saucer", "coin", "tea_bag", "muffin", "cupcake", "scoop",
      "cupcake@friend", "muffin", "cookie", "muffin",
      "cup", "cookie", "customer",
      "oven", "cake_box", "sign"],
    castle: ["villager", "apple@horse", "shield", "arrow", "goblin", "plank", "coin", "sheep", "lantern@buddy", "stone", "brick", "villager", "coin", "arrow", "apple", "lantern",
      "coin@buddy", "step",
      "key", "apple@horse", "plank", "coin", "lantern", "sheep",
      "villager", "apple@horse", "arrow", "goblin", "plank", "coin", "sheep", "lantern@buddy", "brick", "villager", "arrow@buddy",
      "apple@buddy", "sack", "star@buddy", "step",
      "apple@horse", "goblin", "coin",
      "gate", "shield", "door"]
  };
  const SCENE_ACTS = ["add", "sub", "need", "left", "compare", "numeral", "groups", "share", "place", "bundle", "money", "change", "time", "fraction", "count", "more_less", "make10", "pattern", "size", "tap_count", "lineup", "bills"];
  const SCENE_NOUNS = {
    cafe: ["cupcake", "cup", "cookie", "customer", "saucer", "coin", "tray", "muffin", "scoop", "chair", "tea_bag", "oven", "cake_box", "sign",
      "biscuit", "flower", "roll", "candy", "lemon", "sticker", "grape", "strawberry", "napkin", "slice", "piece", "chocolate", "clock",
      "cake", "tea", "pie", "sandwich", "cocoa"],
    castle: ["villager", "apple", "shield", "arrow", "goblin", "plank", "coin", "sheep", "lantern", "stone", "brick", "step", "key", "sack", "star",
      "gate", "door", "pillow", "carrot", "knight", "flag", "gem", "torch", "horse"]
  };
  const SCENE_WHO = ["mimi", "friend", "customer", "you", "buddy", "horse"];
  // "cup@friend" -> { noun: "cup", who: "friend" }; "cupcake+cookie" -> { noun: "cupcake", noun2: "cookie" }; "cupcake:tray" -> { noun: "cupcake", holder: "tray" }
  function sceneWords(s) {
    const [things, who] = s.split("@"), [nouns, holder] = things.split(":"), [noun, noun2] = nouns.split("+"), out = { noun };
    if (noun2) out.noun2 = noun2;
    if (holder) out.holder = holder;
    if (who) out.who = who;
    return out;
  }
  THEMES.forEach(th => { if (SCENE_ROWS[th].length !== BANK[th].length) throw new Error("KS: SCENE_ROWS." + th + " must have one entry per BANK row"); });

  const TEMPLATES = {};
  THEMES.forEach(th => {
    const count = {};
    TEMPLATES[th] = BANK[th].map(([type, [lo, hi], story, ask], i) => {
      count[type] = (count[type] || 0) + 1;
      return { id: `${th}.${type}${count[type]}`, type, lo, hi, story, ask, scene: sceneWords(SCENE_ROWS[th][i]) };
    });
  });

  /* ---------- small helpers ---------- */
  const digitsOf = n => String(n).split("").reverse().map(Number);
  function carries(a, b) { const A = digitsOf(a), B = digitsOf(b); let c = 0, k = 0; for (let i = 0; i < Math.max(A.length, B.length); i++) { const s = (A[i] || 0) + (B[i] || 0) + c; c = s >= 10 ? 1 : 0; k += c; } return k; }
  function borrows(a, b) { const A = digitsOf(a), B = digitsOf(b); let br = 0, k = 0; for (let i = 0; i < A.length; i++) { const t = A[i] - br; if (t < (B[i] || 0)) { br = 1; k++; } else br = 0; } return k; }
  const word = op => (op === "+" ? "plus" : "minus");
  const sym = op => (op === "+" ? "+" : MINUS);

  function render(str, v) {
    return str.replace(/\{([a-z]+)(?:\|([^|}]*))?(?:\|([^|}]*))?\}/g, (m, k, sing, plur) => {
      const n = v[k];
      if (n === undefined) throw new Error("KS: no value for {" + k + "} in " + str);
      if (typeof n === "string" || sing === undefined) return String(n);
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
    // the scene shows the things of the question, never the answer
    const words = tpl.scene || { noun: theme === "cafe" ? "cupcake" : "apple" };
    if (type === "K") Q.scene = Object.assign({ act: "numeral", word: Q.word }, words);
    else if (type === "J" || type === "P") Q.scene = Object.assign({ act: "add", a, b, more: type === "P" }, words);
    else if (type === "A") Q.scene = Object.assign({ act: "sub", a, b }, words);
    else if (type === "C") Q.scene = Object.assign({ act: "compare", a, b, ask: "diff" }, words);
    else if (type === "M") Q.scene = Object.assign({ act: "need", a, total: Q.result }, words);
    else Q.scene = Object.assign({ act: "left", a, left: Q.result }, words);
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
    if (KINDS[skill]) {
      if (KINDS[skill].theme !== theme) throw new Error("KS: " + skill + " has no " + theme + " stories");
      return makeKind(skill, rng, prevKey);
    }
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
    if (KINDS[Q.skill]) return teachKind(Q, right);
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

  /* =====================================================================================
     Stage 3 (22 Oct 2026): more question kinds.
     Each kind has its own story bank (never mixed with BANK above), every number set it can use (all), and its own lesson.
     A kind belongs to one theme: the cafe kinds are Marie's (Grade 3, typed answers), the kinder kinds are Kennedy's
     (Kindergarten, tap answers). Q.a is where the hopper starts and Q.result is where it ends; the answer can be the
     number of hops (sharing, change, hours, tens). Rows on the board stay at 15 letters or fewer, so they fit a phone.
     Not built: kinder.6 shapes and clock faces (the question screen has no picture), half hours (the keypad types digits only).
     ===================================================================================== */
  const pl = (n, one, many) => `${n} ${n === 1 ? one : (many || one + "s")}`;
  const range = (lo, hi) => Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
  const rowOf = (i, text) => ({ row: i, tokens: text.split(" ") });
  const near = (ans, lo, hi) => [ans - 2, ans - 1, ans + 1, ans + 2].filter(x => x >= lo && x <= hi);

  // Equal groups: n groups of s. Facts of 2, 5 and 10 first, then 3 and 4.
  const TIMES_BANK = [
    ["Mimi fills {n|tray}. Each tray holds {s|cupcake}.", "How many cupcakes are there in all?"],
    ["Mimi sets {n|table}. Each table needs {s|cup}.", "How many cups does she need?"],
    ["{n|customer} each order {s|cookie}.", "How many cookies does Mimi pack?"],
    ["Mimi packs {n|box|boxes}. She puts {s|muffin} in each box.", "How many muffins does she pack?"],
    ["Mimi makes {n|plate} of treats. Each plate has {s|biscuit}.", "How many biscuits are on the plates?"],
    ["There are {n|vase|vases} on the tables. Each vase has {s|flower}.", "How many flowers are there?"],
    ["Mimi bakes {n|batch|batches} of bread. Each batch makes {s|roll}.", "How many rolls does she bake?"],
    ["Mimi stacks {n|pile} of saucers. Each pile has {s|saucer}.", "How many saucers are there?"],
    ["{n|child|children} come to a party. Each child gets {s|sticker}.", "How many stickers does Mimi need?"],
    ["Mimi fills {n|jar} on the shelf. Each jar holds {s|candy|candies}.", "How many candies are in the jars?"],
    ["Mimi buys {n|bag} of lemons. Each bag has {s|lemon}.", "How many lemons does she buy?"],
    ["Mimi puts {n|row} of chairs in the cafe. Each row has {s|chair}.", "How many chairs are there?"]
  ];
  function timesKind(name, sizes, grade, needs) {
    return {
      theme: "cafe", name, grade, group: "times", needs,
      all: () => sizes.flatMap(s => range(2, 10).map(n => ({ type: "G", n, s }))),
      bank: { G: TIMES_BANK },
      sceneRows: { G: ["cupcake:tray", "cup:table", "cookie:customer", "muffin:box", "biscuit:plate", "flower:vase", "roll:tray", "saucer:pile", "sticker:child", "candy:jar", "lemon:bag", "chair:row"] },
      scene: ({ n, s }) => ({ act: "groups", n, per: s }),
      q: ({ n, s }) => ({ v: { n, s }, nums: [n, s], ans: n * s, eq: `${n} × ${s} = ?`, op: "×", start: 0, end: n * s,
        line: { lo: 0, hi: 10 * s, step: s }, fact: `${n} groups of ${s} is ${n * s}.`, hint: `Skip count by ${s}, ${n} times.`, key: `${n}x${s}` }),
      lesson: ({ n, s }, Q) => {
        const rep = Array(n).fill(s).join(" + ") + " = " + Q.ans;
        return { kind: "groups", steps: [
          { say: `${n} groups of ${s} means ${n} times ${s}.`, draw: [rowOf(0, Q.eq)] },
          { say: `Skip count by ${s}. Hop ${n} times.`, draw: [], line: [0, Q.ans, s] },
          { say: `${n} times ${s} is ${Q.ans}.`, draw: [rowOf(1, rep.length <= 15 ? rep : `${n} × ${s} = ${Q.ans}`)] }
        ] };
      }
    };
  }

  // Sharing (S: how many each) and grouping (G: how many groups): t divided by d is q.
  const SHARE_BANK = {
    S: [
      ["Mimi puts {t|cookie} on {d|plate}. Each plate gets the same number.", "How many cookies go on each plate?"],
      ["{d|friend} share {t|grape} equally.", "How many grapes does each friend get?"],
      ["Mimi splits {t|cupcake} equally into {d|box|boxes}.", "How many cupcakes go in each box?"],
      ["Mimi shares {t|strawberry|strawberries} equally on {d|cake}.", "How many strawberries go on each cake?"],
      ["{d|table} share {t|muffin} equally.", "How many muffins does each table get?"],
      ["Mimi puts {t|flower} in {d|vase|vases}, the same number in each.", "How many flowers go in each vase?"]
    ],
    G: [
      ["Mimi has {t|cookie}. She puts {d|cookie} in each bag.", "How many bags does she fill?"],
      ["Mimi has {t|cupcake}. Each box holds {d|cupcake}.", "How many boxes does she need?"],
      ["Mimi has {t|cup}. She stacks {d|cup} in each pile.", "How many piles does she make?"],
      ["Mimi has {t|chair}. Each table needs {d|chair}.", "How many tables can she set?"],
      ["Mimi bakes {t|roll}. She puts {d|roll} on each plate.", "How many plates does she fill?"],
      ["Mimi has {t|lemon}. Each jug of lemonade uses {d|lemon}.", "How many jugs can she make?"]
    ]
  };
  function shareKind(name, divisors, grade, needs) {
    return {
      theme: "cafe", name, grade, group: "times", needs,
      all: () => ["S", "G"].flatMap(type => divisors.flatMap(d => range(2, 10).map(q => ({ type, d, q })))),
      bank: SHARE_BANK,
      sceneRows: { S: ["cookie:plate", "grape:friend", "cupcake:box", "strawberry:cake", "muffin:table", "flower:vase"],
        G: ["cookie:bag", "cupcake:box", "cup:pile", "chair:table", "roll:plate", "lemon:jug"] },
      scene: ({ type, d, q }) => type === "S" ? { act: "share", mode: "each", total: d * q, ways: d } : { act: "share", mode: "groups", total: d * q, per: d },
      q: ({ type, d, q }) => { const t = d * q; return { v: { t, d }, nums: [t, d], ans: q, eq: `${t} ÷ ${d} = ?`, op: "÷", start: 0, end: t,
        line: { lo: 0, hi: 10 * d, step: d }, fact: type === "S" ? `${t} shared by ${d} is ${q} each.` : `${t} in groups of ${d} makes ${q} groups.`,
        hint: `Hop by ${d} up to ${t}. Count the hops.`, key: `${t}/${d}` }; },
      lesson: ({ type, d, q }, Q) => ({ kind: "share", steps: [
        { say: type === "S" ? `Sharing equally means divide. So it is ${Q.result} divided by ${d}.` : `Making groups of ${d} means divide. So it is ${Q.result} divided by ${d}.`, draw: [rowOf(0, Q.eq)] },
        { say: `Hop by ${d} up to ${Q.result}. Count the hops.`, draw: [], line: [0, Q.result, d] },
        { say: `That is ${q} hops. ${q} times ${d} is ${Q.result}.`, draw: [rowOf(1, `${q} × ${d} = ${Q.result}`)] }
      ] })
    };
  }

  // Tens and ones: T makes the number, D finds the tens (full boxes), O finds the ones (left over).
  const TENS_BANK = {
    T: [
      ["Mimi has {t|box|boxes} of 10 cookies and {o|loose cookie|loose cookies}.", "How many cookies does she have?"],
      ["The shelf has {t|pack} of 10 cups and {o|single cup|single cups}.", "How many cups are on the shelf?"],
      ["Mimi bakes {t|tray} of 10 muffins and {o|extra muffin|extra muffins}.", "How many muffins did she bake?"],
      ["The till has {t|roll} of 10 coins and {o|loose coin|loose coins}.", "How many coins are in the till?"]
    ],
    D: [
      ["Mimi baked {n|cupcake}. She packs them in boxes of 10.", "How many boxes can she fill?"],
      ["Mimi has {n|cookie}. Each bag holds 10 cookies.", "How many full bags can she make?"],
      ["The cafe has {n|cup}. Mimi stacks them in piles of 10.", "How many full piles can she make?"],
      ["Mimi picks {n|strawberry|strawberries}. Each basket holds 10.", "How many baskets can she fill?"]
    ],
    O: [
      ["Mimi baked {n|cupcake}. She packs them in boxes of 10.", "How many cupcakes are left over?"],
      ["Mimi has {n|cookie}. She fills bags of 10.", "How many cookies are left over?"],
      ["Mimi has {n|coin}. She makes stacks of 10.", "How many coins are not in a stack?"],
      ["Mimi has {n|napkin}. She folds them in packs of 10.", "How many napkins are left over?"]
    ]
  };
  const TENS_KIND = {
    theme: "cafe", name: "Cafe: tens and ones", grade: 2, group: "count", needs: ["sums.3"],
    all: () => ["T", "D", "O"].flatMap(type => range(1, 9).flatMap(t => range(type === "D" ? 0 : 1, 9).map(o => ({ type, t, o })))),
    bank: TENS_BANK,
    sceneRows: { T: ["cookie:box", "cup:pile", "muffin:tray", "coin:roll"], D: ["cupcake:box", "cookie:bag", "cup:pile", "strawberry:basket"], O: ["cupcake:box", "cookie:bag", "coin:pile", "napkin:pile"] },
    scene: ({ type, t, o }) => type === "T" ? { act: "place", tens: t, ones: o } : { act: "bundle", n: 10 * t + o, size: 10, ask: type === "D" ? "tens" : "ones" },
    q: ({ type, t, o }) => {
      const n = 10 * t + o, fact = `${n} is ${pl(t, "ten")} and ${pl(o, "one")}.`, ones = { lo: 10 * t, hi: 10 * t + 10, step: 1 };
      if (type === "T") return { v: { t, o }, nums: [t, 10, o], ans: n, eq: `${t} tens + ${o} = ?`, op: "+", start: 10 * t, end: n, line: ones,
        fact, hint: "Count the tens by 10, then count on the ones.", key: `${n}` };
      if (type === "D") return { v: { n }, nums: [n, 10], ans: t, eq: `tens in ${n} = ?`, op: "+", start: 0, end: 10 * t, line: { lo: 0, hi: 100, step: 10 },
        fact, hint: `Hop by 10 from 0. Stop before you pass ${n}.`, key: `${n}` };
      return { v: { n }, nums: [n, 10], ans: o, eq: `ones in ${n} = ?`, op: "+", start: 10 * t, end: n, line: ones,
        fact, hint: `Take out the tens. Count on from ${10 * t} to ${n}.`, key: `${n}` };
    },
    lesson: ({ type, t, o }, Q) => {
      const n = 10 * t + o, last = rowOf(1, `${10 * t} + ${o} = ${n}`);
      if (type === "T") return { kind: "tens", steps: [
        { say: `Each ten is 10. Count the tens by 10.`, draw: [rowOf(0, Q.eq)], line: [0, 10 * t, 10] },
        { say: `Then count on ${pl(o, "one")}.`, draw: [], line: [10 * t, n, 1] },
        { say: `${10 * t} plus ${o} is ${n}.`, draw: [last] }
      ] };
      if (type === "D") return { kind: "tens", steps: [
        { say: `Each full box holds 10. How many tens are in ${n}?`, draw: [rowOf(0, Q.eq)] },
        { say: `Hop by 10 from 0. Stop before you pass ${n}.`, draw: [], line: [0, 10 * t, 10] },
        { say: `That is ${pl(t, "hop")}. ${10 * t} plus ${o} is ${n}.`, draw: [last] }
      ] };
      return { kind: "tens", steps: [
        { say: `Take out the tens. ${n} has ${pl(t, "ten")}, that is ${10 * t}.`, draw: [rowOf(0, Q.eq)], line: [0, 10 * t, 10] },
        { say: `Count on from ${10 * t} to ${n}.`, draw: [], line: [10 * t, n, 1] },
        { say: `That is ${o} left over. ${10 * t} plus ${o} is ${n}.`, draw: [last] }
      ] };
    }
  };

  // Coins: L is toonies (2 dollars) and loonies (1 dollar), N is dimes (10 cents) and nickels (5 cents).
  const COIN_BANK = {
    L: [
      ["A customer pays Mimi with {a|toonie} and {b|loonie}.", "How many dollars is that?"],
      ["Mimi finds {a|toonie} and {b|loonie} in the tips jar.", "How many dollars did she find?"],
      ["The till has {a|toonie} and {b|loonie}.", "How many dollars are in the till?"],
      ["A girl pays for her tea with {a|toonie} and {b|loonie}.", "How many dollars did she pay?"],
      ["Mimi saves {a|toonie} and {b|loonie} for a new teapot.", "How many dollars has she saved?"]
    ],
    N: [
      ["A boy pays Mimi with {a|dime} and {b|nickel}.", "How many cents is that?"],
      ["Mimi finds {a|dime} and {b|nickel} under a table.", "How many cents did she find?"],
      ["The tips jar has {a|dime} and {b|nickel}.", "How many cents are in the jar?"],
      ["A customer leaves {a|dime} and {b|nickel} as a tip.", "How many cents is the tip?"],
      ["Mimi pays for a lemon with {a|dime} and {b|nickel}.", "How many cents did she pay?"]
    ]
  };
  const COIN_KIND = {
    theme: "cafe", name: "Cafe: counting coins", grade: 2, group: "money_time", needs: ["cafe_times.1"],
    all: () => [].concat(
      range(1, 4).flatMap(a => range(1, 10 - 2 * a).map(b => ({ type: "L", a, b }))),
      range(1, 4).flatMap(a => range(1, (50 - 10 * a) / 5).map(b => ({ type: "N", a, b })))),
    bank: COIN_BANK,
    sceneRows: { L: ["coin@customer", "coin@mimi", "coin", "coin@customer", "coin@mimi"], N: ["coin@customer", "coin@mimi", "coin", "coin@customer", "coin@mimi"] },
    scene: ({ type, a, b }) => ({ act: "money", coins: type === "L" ? [["toonie", a], ["loonie", b]] : [["dime", a], ["nickel", b]] }),
    q: ({ type, a, b }) => {
      if (type === "L") { const t = 2 * a + b; return { v: { a, b }, nums: [a, b], ans: t, eq: `${a}×2 + ${b} = ?`, op: "+", start: 0, end: t, line: { lo: 0, hi: 10, step: 1 },
        fact: `${pl(a, "toonie")} and ${pl(b, "loonie")} make ${pl(t, "dollar")}.`, hint: "A toonie is 2 dollars. Count the toonies by 2, then the loonies by 1.", key: `${a}t${b}l` }; }
      const t = 10 * a + 5 * b;
      return { v: { a, b }, nums: [a, b], ans: t, eq: `${a}×10 + ${b}×5 = ?`, op: "+", start: 0, end: t, line: { lo: 0, hi: 50, step: 5 },
        fact: `${pl(a, "dime")} and ${pl(b, "nickel")} make ${t} cents.`, hint: "A dime is 10 cents. A nickel is 5 cents. Count by 10, then by 5.", key: `${a}d${b}n` };
    },
    lesson: ({ type, a, b }, Q) => type === "L" ? { kind: "coins", steps: [
      { say: "A toonie is 2 dollars. A loonie is 1 dollar.", draw: [rowOf(0, Q.eq)] },
      { say: "Skip count the toonies by 2.", draw: [], line: [0, 2 * a, 2] },
      { say: "Count on the loonies by 1.", draw: [], line: [2 * a, Q.ans, 1] },
      { say: `${2 * a} plus ${b} is ${Q.ans}.`, draw: [rowOf(1, `${2 * a} + ${b} = ${Q.ans}`)] }
    ] } : { kind: "coins", steps: [
      { say: "A dime is 10 cents. A nickel is 5 cents.", draw: [rowOf(0, Q.eq)] },
      { say: "Skip count the dimes by 10.", draw: [], line: [0, 10 * a, 10] },
      { say: "Count on the nickels by 5.", draw: [], line: [10 * a, Q.ans, 5] },
      { say: `${10 * a} plus ${5 * b} is ${Q.ans}.`, draw: [rowOf(1, `${10 * a} + ${5 * b} = ${Q.ans}`)] }
    ] }
  };

  // Change at the till: a price p paid with a 10 or a 20 dollar bill g. Count up from the price.
  const CHANGE_BANK = { C: [
    ["A muffin costs {p|dollar}. The customer pays with a {g} dollar bill.", "How much change does Mimi give back?"],
    ["A cake costs {p|dollar}. Mimi gets a {g} dollar bill.", "How many dollars of change does she give?"],
    ["Tea and a cookie cost {p|dollar}. A man pays with a {g} dollar bill.", "How much change does he get?"],
    ["A box of cupcakes costs {p|dollar}. A girl pays {g} dollars.", "How much change does she get?"],
    ["A pie costs {p|dollar}. Mimi's friend pays with a {g} dollar bill.", "How much change does her friend get?"],
    ["Lunch costs {p|dollar}. A customer gives Mimi {g} dollars.", "How much change does Mimi give?"],
    ["A bag of buns costs {p|dollar}. A boy pays with a {g} dollar bill.", "How much change does he get back?"],
    ["Hot chocolate for the family costs {p|dollar}. Dad pays {g} dollars.", "How much change does Dad get?"],
    ["A sandwich costs {p|dollar}. Grandma pays with a {g} dollar bill.", "How much change does Grandma get?"],
    ["A big tin of cookies costs {p|dollar}. A lady pays {g} dollars.", "How much change does she get?"]
  ] };
  const CHANGE_KIND = {
    theme: "cafe", name: "Cafe: change from 10 or 20 dollars", grade: 3, group: "money_time", needs: ["sums.2", "cafe_money.1"],
    all: () => range(1, 9).map(p => ({ type: "C", p, g: 10 })).concat(range(11, 19).map(p => ({ type: "C", p, g: 20 }))),
    bank: CHANGE_BANK,
    sceneRows: { C: ["muffin@customer", "cake@customer", "tea@customer", "cupcake@customer", "pie@friend", "sandwich@customer", "roll@customer", "cocoa@customer", "sandwich@customer", "cookie@customer"] },
    scene: ({ p, g }) => ({ act: "change", price: p, paid: g }),
    q: ({ p, g }) => ({ v: { p, g }, nums: [p, g], ans: g - p, eq: `${g} − ${p} = ?`, op: "-", start: p, end: g, line: { lo: g - 10, hi: g, step: 1 },
      fact: `The change from ${g} dollars for ${pl(p, "dollar")} is ${pl(g - p, "dollar")}.`, hint: `Count up from ${p} to ${g}.`, key: `${g}-${p}` }),
    lesson: ({ p, g }, Q) => ({ kind: "change", steps: [
      { say: `Change is what is left. So it is ${g} minus ${p}.`, draw: [rowOf(0, Q.eq)] },
      { say: `Count up from ${p} to ${g}.`, draw: [], line: [p, g, 1] },
      { say: `That is ${pl(Q.ans, "hop")}. ${p} plus ${Q.ans} is ${g}.`, draw: [rowOf(1, `${p} + ${Q.ans} = ${g}`)] }
    ] })
  };

  // Cafe hours (whole hours on a 12 hour clock): J later, A earlier, M how long.
  const HOURS_BANK = {
    J: [
      ["The cafe opens at {a} o'clock. Mimi bakes for {b|hour}.", "What time is it when she is done?"],
      ["Mimi starts the soup at {a} o'clock. It cooks for {b|hour}.", "What time is the soup ready?"],
      ["A party starts at {a} o'clock. It lasts {b|hour}.", "What time does the party end?"],
      ["Mimi opens the cafe at {a} o'clock. It stays open for {b|hour}.", "What time does the cafe close?"]
    ],
    A: [
      ["The cafe closes at {a} o'clock. Mimi starts cleaning {b|hour} before.", "What time does she start cleaning?"],
      ["The cake must be ready at {a} o'clock. It takes {b|hour} to bake.", "What time must Mimi start baking?"],
      ["Lunch ends at {a} o'clock. It lasted {b|hour}.", "What time did lunch start?"]
    ],
    M: [
      ["The cafe opens at {a} o'clock and closes at {t} o'clock.", "How many hours is it open?"],
      ["Mimi starts work at {a} o'clock. She stops at {t} o'clock.", "How many hours did she work?"],
      ["The bread goes in at {a} o'clock. It comes out at {t} o'clock.", "How many hours did it bake?"],
      ["Breakfast starts at {a} o'clock and ends at {t} o'clock.", "How many hours does breakfast last?"]
    ]
  };
  const hourLine = (p, q) => { const lo = Math.max(p, q) <= 11 ? 1 : 2; return { lo, hi: lo + 10, step: 1 }; };
  const HOURS_KIND = {
    theme: "cafe", name: "Cafe: opening hours", grade: 3, group: "money_time", needs: ["sums.4"],
    all: () => {
      const out = [];
      range(1, 11).forEach(a => range(1, 8).forEach(b => {
        if (a + b <= 12 && a >= hourLine(a, a + b).lo) { out.push({ type: "J", a, b }); out.push({ type: "M", a, b }); }
        if (a + b <= 12 && a + b >= hourLine(a, a + b).lo && a >= hourLine(a, a + b).lo) out.push({ type: "A", a: a + b, b });
      }));
      return out;
    },
    bank: HOURS_BANK,
    sceneRows: { J: ["clock", "clock", "clock", "clock"], A: ["clock", "clock", "clock"], M: ["clock", "clock", "clock", "clock"] },
    scene: ({ type, a, b }) => type === "M" ? { act: "time", from: a, to: a + b, dir: "span" } : { act: "time", from: a, hours: b, dir: type === "J" ? "later" : "earlier" },
    q: ({ type, a, b }) => {
      const r = type === "A" ? a - b : a + b, line = hourLine(a, r);
      if (type === "J") return { v: { a, b }, nums: [a, b], ans: r, eq: `${a} + ${b} = ?`, op: "+", start: a, end: r, line,
        fact: `${pl(b, "hour")} after ${a} o'clock is ${r} o'clock.`, hint: `Start at ${a} and hop forward ${b}.`, key: `${a}+${b}` };
      if (type === "A") return { v: { a, b }, nums: [a, b], ans: r, eq: `${a} − ${b} = ?`, op: "-", start: a, end: r, line,
        fact: `${pl(b, "hour")} before ${a} o'clock is ${r} o'clock.`, hint: `Start at ${a} and hop back ${b}.`, key: `${a}-${b}` };
      return { v: { a, t: r }, nums: [a, r], ans: b, eq: `${a} + ? = ${r}`, op: "+", start: a, end: r, line,
        fact: `From ${a} o'clock to ${r} o'clock is ${pl(b, "hour")}.`, hint: `Start at ${a} and hop up to ${r}. Count the hops.`, key: `${a}+?${r}` };
    },
    lesson: ({ type, a, b }, Q) => {
      if (type === "M") return { kind: "hours", steps: [
        { say: `We start at ${a} o'clock and end at ${Q.result} o'clock. How many hours?`, draw: [rowOf(0, Q.eq)] },
        { say: `Start at ${a}. Hop up to ${Q.result}, one hop for each hour.`, draw: [], line: [a, Q.result, 1] },
        { say: `You hopped ${b}.`, draw: [rowOf(1, `${a} + ${b} = ${Q.result}`)] }
      ] };
      const plus = type === "J";
      return { kind: "hours", steps: [
        { say: plus ? `Later means plus. So it is ${a} plus ${b}.` : `Earlier means minus. So it is ${a} minus ${b}.`, draw: [rowOf(0, Q.eq)] },
        { say: `Start at ${a}. Hop ${plus ? "forward" : "back"} ${b}, one hop for each hour.`, draw: [], line: [a, Q.result, 1] },
        { say: `${a} ${plus ? "plus" : "minus"} ${b} is ${Q.result}.`, draw: [rowOf(1, `${a} ${plus ? "+" : MINUS} ${b} = ${Q.result}`)] }
      ] };
    }
  };

  // Half (H) and quarter (Q) of a cake, a tray or a box.
  const FRACTION_BANK = {
    H: [
      ["Mimi cuts a cake into {n|slice}. Half of the slices go to a party.", "How many slices go to the party?"],
      ["A tray has {n|cookie}. Mimi gives half of them to her friend.", "How many cookies does her friend get?"],
      ["Mimi bakes {n|muffin}. She sells half of them before lunch.", "How many muffins did she sell before lunch?"],
      ["A pizza has {n|piece}. Mimi and her friend each eat half.", "How many pieces does each one eat?"],
      ["Mimi has {n|strawberry|strawberries}. Half of them go on top of a cake.", "How many strawberries go on the cake?"]
    ],
    Q: [
      ["A pie has {n|piece}. A quarter of the pie is sold.", "How many pieces were sold?"],
      ["Mimi bakes {n|cupcake}. She puts a quarter of them in the window.", "How many cupcakes are in the window?"],
      ["A cake has {n|slice}. Four friends share it equally.", "How many slices is a quarter of the cake?"],
      ["Mimi has {n|cookie}. A quarter of them have pink icing.", "How many cookies have pink icing?"],
      ["A box holds {n|chocolate}. Mimi gives a quarter of them away.", "How many chocolates does she give away?"]
    ]
  };
  const FRACTION_KIND = {
    theme: "cafe", name: "Cafe: half and quarter", grade: 3, group: "fractions", needs: ["cafe_share.1"],
    all: () => range(1, 10).map(k => ({ type: "H", n: 2 * k })).concat(range(1, 10).map(k => ({ type: "Q", n: 4 * k }))),
    bank: FRACTION_BANK,
    sceneRows: { H: ["slice:cake", "cookie:tray", "muffin:tray", "piece:pie", "strawberry:cake"], Q: ["piece:pie", "cupcake:tray", "slice:cake", "cookie:tray", "chocolate:box"] },
    scene: ({ type, n }) => ({ act: "fraction", n, parts: type === "H" ? 2 : 4 }),
    q: ({ type, n }) => {
      const parts = type === "H" ? 2 : 4, k = n / parts;
      return { v: { n }, nums: [n], ans: k, eq: `${n} ÷ ${parts} = ?`, op: "÷", start: 0, end: k, line: { lo: 0, hi: 10, step: 1 },
        fact: type === "H" ? `Half of ${n} is ${k}.` : `A quarter of ${n} is ${k}.`,
        hint: type === "H" ? `Half means 2 equal parts. Split ${n} into 2 equal groups.` : `A quarter means 4 equal parts. Split ${n} into 4 equal groups.`, key: `${n}/${parts}` };
    },
    lesson: ({ type, n }, Q) => {
      const parts = type === "H" ? 2 : 4, k = Q.ans;
      return { kind: "fraction", steps: [
        { say: type === "H" ? `Half means 2 equal parts. So it is ${n} divided by 2.` : `A quarter means 4 equal parts. So it is ${n} divided by 4.`, draw: [rowOf(0, Q.eq)] },
        { say: `Make ${parts} equal hops to ${n}.`, draw: [], line: [0, n, k] },
        { say: `Each part is ${k}. ${parts} times ${k} is ${n}.`, draw: [rowOf(1, `${parts} × ${k} = ${n}`)] }
      ] };
    }
  };

  /* ---------- Kennedy's kinds: tap answers, the knight's journey, short sentences ---------- */
  const COUNT_BANK = { N: [
    ["You climb the castle stairs: {x}, {y}, {z}.", "What number comes next?"],
    ["You count the villagers you saved: {x}, {y}, {z}.", "What number comes next?"],
    ["Silly goblins hop out one by one: {x}, {y}, {z}.", "What number comes next?"],
    ["You count the sheep going home: {x}, {y}, {z}.", "What number comes next?"],
    ["You bop goblins with your pillow: {x}, {y}, {z}.", "What number comes next?"],
    ["Your horse eats apples: {x}, {y}, {z}.", "What number comes next?"],
    ["You light the lanterns: {x}, {y}, {z}.", "What number comes next?"],
    ["You count the stones on the bridge: {x}, {y}, {z}.", "What number comes next?"],
    ["Your buddy knight counts the shields: {x}, {y}, {z}.", "What number comes next?"],
    ["You count the flags on the tower: {x}, {y}, {z}.", "What number comes next?"],
    ["The goblins giggle and run home: {x}, {y}, {z}.", "What number comes next?"]
  ] };
  const COUNT_KIND = {
    theme: "castle", name: "Knight: counting to 20", grade: 0, group: "count", needs: ["kinder.2"], choice: true,
    all: () => range(1, 17).map(x => ({ type: "N", x })),
    bank: COUNT_BANK,
    sceneRows: { N: ["step", "villager", "goblin", "sheep", "goblin", "apple@horse", "lantern", "stone", "shield@buddy", "flag", "goblin"] },
    scene: ({ x }) => ({ act: "count", seq: [x, x + 1, x + 2] }),
    q: ({ x }) => { const y = x + 1, z = x + 2, n = x + 3; return { v: { x, y, z }, nums: [x, y, z], ans: n, eq: `${x}, ${y}, ${z}, ?`, op: "+", start: z, end: n,
      line: lineWindow(x, n), fact: `After ${z} comes ${n}.`, hint: `Count on from ${z}. Say the next number.`, key: `${x}`, pool: near(n, 1, 20) }; },
    lesson: ({ x }, Q) => ({ kind: "count", steps: [
      { say: `Let's count together. Start at ${x}.`, draw: [rowOf(0, Q.eq)], line: [x, Q.a, 1] },
      { say: `What comes next? One more than ${Q.a}.`, draw: [], line: [Q.a, Q.ans, 1] },
      { say: `${Q.a} and 1 more is ${Q.ans}.`, draw: [rowOf(1, `${Q.a} + 1 = ${Q.ans}`)] }
    ] })
  };

  const MORE_LESS_BANK = {
    O: [
      ["You saved {a|villager}. One more villager runs to you.", "How many villagers did you save?"],
      ["{a|goblin} sat on the wall. One more goblin climbed up.", "How many goblins are on the wall now?"],
      ["You have {a|pillow}. Your buddy gives you one more.", "How many pillows do you have now?"],
      ["You led {a|sheep|sheep} to the pen. One more sheep came.", "How many sheep are in the pen now?"],
      ["You lit {a|lantern}. Then you lit one more.", "How many lanterns are lit now?"],
      ["Your horse ate {a|carrot}. Then it ate one more.", "How many carrots did it eat?"]
    ],
    L: [
      ["{a|goblin} giggled at the gate. You bopped one with a pillow. It ran home.", "How many goblins are still at the gate?"],
      ["{a|villager} waited at the gate. One went home.", "How many villagers are still waiting?"],
      ["Your horse had {a|apple}. It ate one.", "How many apples are left?"],
      ["{a|arrow} were in the target. You pulled one out.", "How many arrows are still in the target?"],
      ["You had {a|coin}. You gave one to a villager.", "How many coins do you have now?"],
      ["{a|knight} guarded the bridge. One went to lunch.", "How many knights are still on the bridge?"]
    ]
  };
  const MORE_LESS_KIND = {
    theme: "castle", name: "Knight: one more, one less", grade: 0, group: "count", needs: ["kinder.2"], choice: true,
    all: () => range(1, 9).map(a => ({ type: "O", a })).concat(range(2, 10).map(a => ({ type: "L", a }))),
    bank: MORE_LESS_BANK,
    sceneRows: { O: ["villager", "goblin", "pillow@buddy", "sheep", "lantern", "carrot@horse"], L: ["goblin", "villager", "apple@horse", "arrow", "coin", "knight"] },
    scene: ({ type, a }) => ({ act: "more_less", a, dir: type === "O" ? 1 : -1 }),
    q: ({ type, a }) => {
      const up = type === "O", r = up ? a + 1 : a - 1;
      return { v: { a }, nums: [a], ans: r, eq: `${a} ${up ? "+" : MINUS} 1 = ?`, op: up ? "+" : "-", start: a, end: r, line: lineWindow(a, r),
        fact: up ? `One more than ${a} is ${r}.` : `One less than ${a} is ${r}.`, hint: `Start at ${a} and hop ${up ? "forward" : "back"} 1.`, key: `${a}`, pool: near(r, 1, 10) };
    },
    lesson: ({ type, a }, Q) => ({ kind: "one", steps: [
      { say: type === "O" ? `One more means plus 1. So it is ${a} plus 1.` : `One less means minus 1. So it is ${a} minus 1.`, draw: [rowOf(0, Q.eq)] },
      { say: `Start at ${a}. Hop ${type === "O" ? "forward" : "back"} 1.`, draw: [], line: [a, Q.ans, 1] }
    ] })
  };

  const COMPARE_BANK = {
    G: [
      ["{a|silly goblin|silly goblins} came to the bridge. {b|knight} came too.", "Which group has more? Tap its number."],
      ["You have {a|apple}. Your horse has {b|carrot}.", "Which group has more? Tap its number."],
      ["You see {a|red flag|red flags} and {b|blue flag|blue flags}.", "Which group has more? Tap its number."],
      ["You saved {a|villager}. Your buddy saved {b|villager}.", "Which group has more? Tap its number."],
      ["You see {a|goblin} and {b|pillow}.", "Which group has more? Tap its number."],
      ["You see {a|sheep|sheep} and {b|horse}.", "Which group has more? Tap its number."]
    ],
    F: [
      ["You lit {a|lantern}. Your buddy lit {b|torch|torches}.", "Which group has fewer? Tap its number."],
      ["{a|goblin} sat on the left wall. {b|goblin} sat on the right wall.", "Which group has fewer? Tap its number."],
      ["You found {a|coin} in the cave. You found {b|gem} in the tower.", "Which group has fewer? Tap its number."],
      ["You bopped {a|goblin} with a pillow. Your buddy bopped {b|goblin}.", "Which group has fewer? Tap its number."],
      ["Your shield has {a|star}. Your buddy's shield has {b|star}.", "Which group has fewer? Tap its number."]
    ]
  };
  const COMPARE_KIND = {
    theme: "castle", name: "Knight: which has more?", grade: 0, group: "count", needs: ["kinder.2"], choice: true,
    all: () => ["G", "F"].flatMap(type => range(1, 10).flatMap(a => range(1, 10).filter(b => b !== a).map(b => ({ type, a, b })))),
    bank: COMPARE_BANK,
    sceneRows: { G: ["goblin+knight", "apple+carrot", "flag+flag", "villager+villager@buddy", "goblin+pillow", "sheep+horse"],
      F: ["lantern+torch", "goblin+goblin", "coin+gem", "goblin+goblin@buddy", "star+star@buddy"] },
    scene: ({ type, a, b }) => ({ act: "compare", a, b, ask: type === "G" ? "more" : "fewer" }),
    q: ({ type, a, b }) => {
      const hi = Math.max(a, b), lo = Math.min(a, b), more = type === "G", ans = more ? hi : lo;
      return { v: { a, b }, nums: [a, b], ans, eq: more ? `? > ${lo}` : `? < ${hi}`, op: more ? ">" : "<", start: 0, end: ans, line: { lo: 0, hi: 10, step: 1 },
        fact: more ? `${hi} is more than ${lo}.` : `${lo} is less than ${hi}.`,
        hint: more ? "Count each group. The number further along the line is more." : "Count each group. The number closer to 0 is less.",
        key: `${a}:${b}`, pool: [more ? lo : hi], want: 1 };
    },
    lesson: ({ type, a, b }, Q) => {
      const hi = Math.max(a, b), lo = Math.min(a, b);
      return { kind: "compare", steps: [
        { say: "Let's count both groups on the line.", draw: [rowOf(0, Q.eq)] },
        { say: `The first group: count up to ${a}.`, draw: [], line: [0, a, 1] },
        { say: `The second group: count up to ${b}.`, draw: [], line: [0, b, 1] },
        type === "G" ? { say: `${hi} is further along the line. ${hi} is more.`, draw: [rowOf(1, `${hi} > ${lo}`)] }
          : { say: `${lo} is closer to 0. ${lo} is less.`, draw: [rowOf(1, `${lo} < ${hi}`)] }
      ] };
    }
  };

  const MAKE10_BANK = { M: [
    ["You have {a|buddy knight|buddy knights}. Your team needs 10.", "How many more buddies do you need?"],
    ["You saved {a|villager}. There are 10 to save.", "How many more must you save?"],
    ["You have {a|pillow}. Your team needs 10 pillows.", "How many more pillows do you need?"],
    ["The bridge needs 10 planks. You have {a|plank}.", "How many more planks do you need?"],
    ["You bopped {a|goblin} with a pillow. 10 goblins came to play.", "How many more goblins can you bop?"],
    ["Your horse wants 10 apples. It has {a|apple}.", "How many more apples does it want?"],
    ["You lit {a|lantern}. The road needs 10.", "How many more must you light?"],
    ["The pen holds 10 sheep. You led {a|sheep|sheep} in.", "How many more sheep can come in?"],
    ["The chest needs 10 coins. You put in {a|coin}.", "How many more coins fill the chest?"],
    ["10 villagers need a ride. {a|villager} sat in the cart.", "How many more need a ride?"],
    ["You have {a|shield}. Your team needs 10 shields.", "How many more shields do you need?"]
  ] };
  const MAKE10_KIND = {
    theme: "castle", name: "Knight: make 10", grade: 0, group: "add", needs: ["kinder.5"], choice: true,
    all: () => range(1, 9).map(a => ({ type: "M", a })),
    bank: MAKE10_BANK,
    sceneRows: { M: ["knight@buddy", "villager", "pillow", "plank", "goblin", "apple@horse", "lantern", "sheep", "coin", "villager", "shield"] },
    scene: ({ a }) => ({ act: "make10", a, total: 10 }),
    q: ({ a }) => ({ v: { a }, nums: [a, 10], ans: 10 - a, eq: `${a} + ? = 10`, op: "+", start: a, end: 10, line: { lo: 0, hi: 10, step: 1 },
      fact: `${a} and ${10 - a} make 10.`, hint: `Start at ${a} and hop up to 10.`, key: `${a}`, pool: near(10 - a, 1, 10) }),
    lesson: ({ a }, Q) => ({ kind: "make10", steps: [
      { say: `We have ${a}. We want 10. How many more?`, draw: [rowOf(0, Q.eq)] },
      { say: `Start at ${a}. Hop up to 10.`, draw: [], line: [a, 10, 1] },
      { say: `You hopped ${Q.ans}.`, draw: [rowOf(1, `${a} + ${Q.ans} = 10`)] }
    ] })
  };

  /* =====================================================================================
     Round of 22 Oct 2026 (plan items 23 and 24): number bonds to 9, patterns and size for Kennedy, optional counting for Marie,
     and number patterns (a Grade 3 gap). Three new ways a question can look, all described by fields on Q:
       Q.picOpts  true when the answer buttons are PICTURES. The button values are 1, 2, 3 (which picture); Q.pics[v] says what to draw:
                  { src } a picture file under game/, or { bar: { len, dir } } a plain bar ("h" long, "v" tall). Q.optSay[v] is what the game
                  says when Kennedy taps it. Q.strip lists the pictures of a pattern row in order (the screen adds a "?" after them).
       Q.tray     { noun, n, boxes } a tray of n things Marie taps one by one (boxes = how many in each box of ten). The things show no number,
                  and the screen never shows a running count: a tap only marks that one thing. The answer is typed.
       Q.noLine   true: the number line and the hop buttons are not shown (hops would count for her, or mean nothing for a picture answer).
     ===================================================================================== */
  const PIC = {
    flag_red: { src: "world/art/castle/flag_red.png", name: "red flag" }, flag_blue: { src: "world/art/castle/flag_blue.png", name: "blue flag" },
    apple: { src: "rewards/art/castle/apple_1.png", name: "apple" }, carrot: { src: "scene/art/castle/item_carrot.png", name: "carrot" },
    star: { src: "scene/art/castle/item_star.png", name: "star" }, gem: { src: "scene/art/castle/item_gem.png", name: "gem" },
    torch: { src: "scene/art/castle/item_torch.png", name: "torch" }, lantern: { src: "scene/art/castle/item_lantern.png", name: "lantern" },
    shield: { src: "scene/art/castle/item_shield.png", name: "shield" }, coin: { src: "scene/art/castle/coin.png", name: "coin" },
    arrow: { src: "scene/art/castle/item_arrow.png", name: "arrow" }, key: { src: "rewards/art/castle_extra/cage_key.png", name: "key" }
  };
  const picName = id => PIC[id].name;
  const withThe = id => "the " + picName(id);
  // the plain picture of one cafe thing, for the tray Marie taps (file under game/)
  const TRAY_ART = {
    cupcake: "world/art/cafe/treat_cupcake.png", cookie: "world/art/cafe/treat_cookie.png", muffin: "scene/art/cafe/item_muffin.png",
    biscuit: "scene/art/cafe/item_biscuit.png", roll: "scene/art/cafe/item_roll.png", candy: "scene/art/cafe/item_candy.png",
    flower: "scene/art/cafe/item_flower.png", grape: "scene/art/cafe/item_grape.png", lemon: "scene/art/cafe/item_lemon.png", sandwich: "scene/art/cafe/item_sandwich.png"
  };
  const PLURAL = { cupcake: "cupcakes", cookie: "cookies", muffin: "muffins", biscuit: "biscuits", roll: "rolls", candy: "candies", flower: "flowers", grape: "grapes", lemon: "lemons", sandwich: "sandwiches" };

  /* ----- number bonds to 6, 7, 8 and 9 (Kennedy) ----- */
  const BONDS_BANK = { M: [
    ["You have {a|buddy knight|buddy knights}. Your team needs {t}.", "How many more buddies do you need?"],
    ["You saved {a|villager}. There are {t} to save.", "How many more must you save?"],
    ["You have {a|pillow}. Your team needs {t} pillows.", "How many more pillows do you need?"],
    ["The bridge needs {t} planks. You have {a|plank}.", "How many more planks do you need?"],
    ["You bopped {a|goblin} with a pillow. {t} goblins came to play.", "How many more goblins can you bop?"],
    ["Your horse wants {t} apples. It has {a|apple}.", "How many more apples does it want?"],
    ["You lit {a|lantern}. The road needs {t}.", "How many more must you light?"],
    ["The pen holds {t} sheep. You led {a|sheep|sheep} in.", "How many more sheep can come in?"],
    ["The chest needs {t} coins. You put in {a|coin}.", "How many more coins fill the chest?"],
    ["{t} villagers need a ride. {a|villager} sat in the cart.", "How many more need a ride?"],
    ["You have {a|shield}. Your team needs {t} shields.", "How many more shields do you need?"]
  ] };
  const BONDS_KIND = {
    theme: "castle", name: "Knight: number bonds to 9", grade: 0, group: "add", needs: ["kinder.5"], choice: true,
    all: () => range(6, 9).flatMap(t => range(1, t - 1).map(a => ({ type: "M", a, t }))),
    bank: BONDS_BANK,
    sceneRows: { M: ["knight@buddy", "villager", "pillow", "plank", "goblin", "apple@horse", "lantern", "sheep", "coin", "villager", "shield"] },
    scene: ({ a, t }) => ({ act: "make10", a, total: t }),
    q: ({ a, t }) => ({ v: { a, t }, nums: [a, t], ans: t - a, eq: `${a} + ? = ${t}`, op: "+", start: a, end: t, line: { lo: 0, hi: 10, step: 1 },
      fact: `${a} and ${t - a} make ${t}.`, hint: `Start at ${a} and hop up to ${t}.`, key: `${t}:${a}`, pool: near(t - a, 1, t) }),
    lesson: ({ a, t }, Q) => ({ kind: "bonds", steps: [
      { say: `We have ${a}. We want ${t}. How many more?`, draw: [rowOf(0, Q.eq)] },
      { say: `Start at ${a}. Hop up to ${t}.`, draw: [], line: [a, t, 1] },
      { say: `You hopped ${Q.ans}.`, draw: [rowOf(1, `${a} + ${Q.ans} = ${t}`)] }
    ] })
  };

  /* ----- patterns (Kennedy): AB and ABB, answered by tapping a picture ----- */
  // each story row: three things [A, B, other]; the row's scene shows A and B
  const PATTERN_ROWS = [["flag_red", "flag_blue", "star"], ["apple", "carrot", "coin"], ["star", "gem", "apple"], ["torch", "lantern", "shield"], ["shield", "coin", "star"], ["arrow", "key", "gem"]];
  const PATTERN_ASK = "Which one comes next in the pattern?";
  const PATTERN_BANK = {
    A: [
      ["The knight hangs flags on the castle wall.", PATTERN_ASK], ["Your horse has a snack line.", PATTERN_ASK], ["Stars and gems sit on the shelf.", PATTERN_ASK],
      ["Torches and lanterns light the path.", PATTERN_ASK], ["Shields and coins lie on the table.", PATTERN_ASK], ["Arrows and keys hang on the hook.", PATTERN_ASK]
    ],
    B: [
      ["The knight hangs more flags on the wall.", PATTERN_ASK], ["Your horse has a new snack line.", PATTERN_ASK], ["More stars and gems sit on the shelf.", PATTERN_ASK],
      ["More torches and lanterns light the path.", PATTERN_ASK], ["More shields and coins lie on the table.", PATTERN_ASK], ["More arrows and keys hang on the hook.", PATTERN_ASK]
    ]
  };
  const PATTERN_UNIT = { A: [1, 2], B: [1, 2, 2] };
  const PATTERN_KIND = {
    theme: "castle", name: "Knight: what comes next?", grade: 0, group: "shapes", needs: ["kinder.2"], choice: true, picAnswer: true,
    all: () => range(4, 6).map(len => ({ type: "A", len })).concat(range(4, 7).map(len => ({ type: "B", len }))),
    bank: PATTERN_BANK,
    sceneRows: { A: ["flag+flag", "apple+carrot", "star+gem", "torch+lantern", "shield+coin", "arrow+key"], B: ["flag+flag", "apple+carrot", "star+gem", "torch+lantern", "shield+coin", "arrow+key"] },
    scene: ({ type, len }) => ({ act: "pattern", seq: range(0, len - 1).map(i => PATTERN_UNIT[type][i % PATTERN_UNIT[type].length]) }),
    q: ({ type, len }) => {
      const unit = PATTERN_UNIT[type], seq = range(0, len - 1).map(i => unit[i % unit.length]), ans = unit[len % unit.length];
      return { v: {}, nums: [], ans, eq: seq.map(i => "AB"[i - 1]).join(" ") + " ?", op: "", start: 0, end: ans, line: { lo: 0, hi: 10, step: 1 },
        fact: "", hint: "Say the pattern. Which one comes after the last one?", key: `${type}:${len}`, pool: [1, 2, 3], want: 2 };
    },
    decorate: (Q, p, ti) => {
      const items = PATTERN_ROWS[ti], unit = PATTERN_UNIT[p.type];
      Q.picOpts = true; Q.noLine = true; Q.key += ":" + ti;
      Q.pics = { 1: { src: PIC[items[0]].src, name: picName(items[0]) }, 2: { src: PIC[items[1]].src, name: picName(items[1]) }, 3: { src: PIC[items[2]].src, name: picName(items[2]) } };
      Q.optSay = { 1: withThe(items[0]), 2: withThe(items[1]), 3: withThe(items[2]) };
      Q.strip = range(0, p.len - 1).map(i => unit[i % unit.length]);
      Q.unitWords = unit.map(i => picName(items[i - 1]));
      Q.fact = `The pattern repeats. So ${withThe(items[Q.ans - 1])} comes next.`;
      Q.tapSay = `Tap ${withThe(items[Q.ans - 1])}.`;
    },
    lesson: ({ type }, Q) => ({ kind: "pattern", steps: [
      { say: "Look at the pattern. Some of the pictures repeat.", draw: [rowOf(0, Q.eq)] },
      { say: `It goes ${Q.unitWords.join(", ")}, and then again.`, draw: [rowOf(1, PATTERN_UNIT[type].map(i => "AB"[i - 1]).join(" "))] }
    ] })
  };

  /* ----- size and length (Kennedy): tap the longest, the shortest or the tallest ----- */
  const SIZE_TRIPLES = (() => { const out = []; for (let x = 2; x <= 9; x++) for (let y = x + 2; y <= 9; y++) for (let z = y + 2; z <= 9; z++) out.push([x, y, z]); return out; })();
  const SIZE_PERMS = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
  const SIZE_WORD = { L: "longest", S: "shortest", T: "tallest" };
  const SIZE_BANK = {
    L: [
      ["The knight has three planks for the bridge.", "Which plank is the longest?"], ["Three planks lie by the river.", "Which plank is the longest?"],
      ["Three keys hang on the hook.", "Which key is the longest?"], ["Three steps lead up to the door.", "Which step is the longest?"]
    ],
    S: [
      ["The knight has three planks for the bridge.", "Which plank is the shortest?"], ["Three planks lie by the river.", "Which plank is the shortest?"],
      ["Three keys hang on the hook.", "Which key is the shortest?"], ["Three steps lead up to the door.", "Which step is the shortest?"]
    ],
    T: [
      ["Three torches stand by the gate.", "Which torch is the tallest?"], ["Three lanterns hang in a row.", "Which lantern is the tallest?"],
      ["Three carrots grow in the garden.", "Which carrot is the tallest?"], ["Three arrows stand in the target.", "Which arrow is the tallest?"]
    ]
  };
  const SIZE_HINT = { L: "Line them up. Which one goes the furthest?", S: "Line them up. Which one stops first?", T: "Stand them side by side. Which one reaches the highest?" };
  const SIZE_KIND = {
    theme: "castle", name: "Knight: longest, shortest, tallest", grade: 0, group: "shapes", needs: ["kinder.2"], choice: true, picAnswer: true,
    all: () => ["L", "S", "T"].flatMap(type => SIZE_TRIPLES.flatMap(t => SIZE_PERMS.map(pm => ({ type, lens: pm.map(i => t[i]) })))),
    bank: SIZE_BANK,
    sceneRows: { L: ["plank", "plank", "key", "step"], S: ["plank", "plank", "key", "step"], T: ["torch", "lantern", "carrot", "arrow"] },
    scene: ({ type, lens }) => ({ act: "size", sizes: lens.slice(), dir: type === "T" ? "v" : "h", ask: SIZE_WORD[type] }),
    q: ({ type, lens }) => {
      const best = type === "S" ? Math.min(...lens) : Math.max(...lens), ans = lens.indexOf(best) + 1;
      return { v: {}, nums: [], ans, eq: `${SIZE_WORD[type]} = ?`, op: "", start: 0, end: ans, line: { lo: 0, hi: 10, step: 1 },
        fact: `This one is the ${SIZE_WORD[type]}.`, hint: SIZE_HINT[type], key: `${type}:${lens.join("")}`, pool: [1, 2, 3], want: 2 };
    },
    decorate: (Q, p, ti) => {
      const dir = p.type === "T" ? "v" : "h";
      Q.picOpts = true; Q.noLine = true; Q.key += ":" + ti;
      Q.pics = {}; Q.optSay = {};
      p.lens.forEach((len, i) => { Q.pics[i + 1] = { bar: { len, dir } }; Q.optSay[i + 1] = "This one."; });
      Q.tapSay = `Tap the ${SIZE_WORD[p.type]} one.`;
    },
    lesson: ({ type }, Q) => ({ kind: "size", steps: [
      { say: "Put them side by side. Start them at the same place.", draw: [rowOf(0, Q.eq)] },
      { say: type === "T" ? "Look at where each one ends at the top." : "Look at where each one ends.", draw: [] }
    ] })
  };

  /* ----- counting by tapping (Marie, optional: see game/counting_need.js) ----- */
  const TAP_ROWS = ["cupcake", "cookie", "muffin", "biscuit", "roll", "candy", "flower", "grape", "lemon", "sandwich"];
  const TAP_STORY = [
    "Mimi puts cupcakes on the big tray.", "Mimi lays out cookies for the shop.", "Mimi lines up muffins to cool.", "Mimi stacks biscuits for the tea party.",
    "Mimi bakes rolls for the morning.", "Mimi sets candies in the jar.", "Mimi picks flowers for the tables.", "Mimi washes grapes for the fruit plate.",
    "Mimi slices lemons for the tea.", "Mimi makes sandwiches for lunch."
  ];
  const TAP_BANK = { T: TAP_STORY.map((s, i) => [s, `Tap each one once as you count. How many ${PLURAL[TAP_ROWS[i]]} are there?`]) };
  function tapCountKind(name, lo, hi, grade, needs) {
    return {
      theme: "cafe", name, grade, group: "count", needs, optional: true,
      all: () => range(lo, hi).map(n => ({ type: "T", n })),
      bank: TAP_BANK,
      sceneRows: { T: TAP_ROWS.slice() },
      scene: () => ({ act: "tap_count" }),
      q: ({ n }) => ({ v: {}, nums: [], ans: n, eq: "all = ?", op: "", start: 0, end: n, line: { lo: 0, hi: 10, step: 1 }, fact: "",
        hint: "Touch each one once. Do not skip one, and do not touch one twice.", key: `${n}` }),
      decorate: (Q, p, ti) => {
        const noun = TAP_ROWS[ti], boxes = []; for (let left = p.n; left > 0; left -= 10) boxes.push(Math.min(10, left));
        Q.noLine = true; Q.key += ":" + ti;
        Q.tray = { noun, n: p.n, boxes, src: TRAY_ART[noun] };
        Q.fact = `There are ${p.n} ${PLURAL[noun]}.`;
      },
      lesson: ({ n }, Q) => ({ kind: "tapcount", steps: [
        { say: "Touch each one just once. Move along in order.", draw: [rowOf(0, Q.eq)] },
        { say: n > 20 ? "Count the full boxes of ten first. Then count the ones left over." : "Take your time. Keep your place.", draw: [] }
      ] })
    };
  }

  /* ----- number patterns (Marie, Grade 3: increasing and decreasing patterns, skip counting from any start) ----- */
  const NUMPAT_BANK = {
    U: [
      ["Mimi lines up trays. They hold {a}, {b}, {c} cookies. The pattern goes on.", "How many cookies does the next tray hold?"],
      ["Mimi saves coins each day: {a}, {b}, {c}. The pattern goes on.", "How many coins does she save next?"],
      ["The jars hold {a}, {b}, {c} candies. The pattern goes on.", "How many candies does the next jar hold?"],
      ["Mimi sells {a}, {b}, {c} muffins on three days. The pattern goes on.", "How many muffins does she sell next?"],
      ["Tables seat {a}, {b}, {c} guests. The pattern goes on.", "How many guests does the next table seat?"],
      ["The shelves hold {a}, {b}, {c} cups. The pattern goes on.", "How many cups does the next shelf hold?"]
    ],
    D: [
      ["Mimi packs boxes with {a}, {b}, {c} cookies. The pattern goes on.", "How many cookies go in the next box?"],
      ["The plate has {a}, then {b}, then {c} grapes left. The pattern goes on.", "How many grapes are left next?"],
      ["Mimi has {a}, then {b}, then {c} cups left to wash. The pattern goes on.", "How many cups are left to wash next?"],
      ["The jar holds {a}, then {b}, then {c} candies. The pattern goes on.", "How many candies are in the jar next?"],
      ["Mimi sells muffins and has {a}, then {b}, then {c} left. The pattern goes on.", "How many muffins are left next?"],
      ["The tray holds {a}, then {b}, then {c} rolls. The pattern goes on.", "How many rolls are on the tray next?"]
    ]
  };
  const NUMPAT_KIND = {
    theme: "cafe", name: "Cafe: number patterns", grade: 3, group: "shapes", needs: ["sums.3"],
    all: () => [2, 3, 4, 5, 10].flatMap(step => range(1, 40).filter(a => a + 3 * step <= 100).map(a => ({ type: "U", a, step }))
      .concat(range(30, 99).filter(a => a - 3 * step >= 0).map(a => ({ type: "D", a, step })))),
    bank: NUMPAT_BANK,
    sceneRows: { U: ["cookie", "coin", "candy", "muffin", "chair", "cup"], D: ["cookie", "grape", "cup", "candy", "muffin", "roll"] },
    scene: ({ type, a, step }) => (type === "U" ? { act: "add", a: a + 2 * step, b: step } : { act: "sub", a: a - 2 * step, b: step }),
    q: ({ type, a, step }) => {
      const up = type === "U", s = up ? step : -step, b = a + s, c = a + 2 * s, ans = a + 3 * s;
      return { v: { a, b, c }, nums: [a, b, c], ans, eq: `${a}, ${b}, ${c}, ?`, op: up ? "+" : "-", start: c, end: ans, line: lineWindow(c, ans),
        fact: `It goes ${up ? "up" : "down"} by ${step} each time. ${c} ${up ? "plus" : "minus"} ${step} is ${ans}.`,
        hint: "Look at how much it changes each time.", key: `${type}:${a}:${step}` };
    },
    lesson: ({ type, step }, Q) => ({ kind: "numpat", steps: [
      { say: "Look at how much it changes each time.", draw: [rowOf(0, Q.eq)] },
      { say: `It changes by ${step}. Hop ${step} ${type === "U" ? "forward" : "back"} from ${Q.a}.`, draw: [], line: [Q.a, Q.ans, step] }
    ] })
  };

  /* ----- days, weeks, months and years (Marie, Grade 3 "relationships between units of time"): a repeated-groups question ----- */
  const UNIT_TIME = { W: { per: 7, unit: "week", of: "day", ns: [2, 3, 4, 5] }, Y: { per: 12, unit: "year", of: "month", ns: [2, 3, 4] }, D: { per: 24, unit: "day", of: "hour", ns: [2, 3] } };
  const TIME2_BANK = {
    W: [
      ["A week has 7 days. Mimi bakes every day for {n|week}.", "How many days does Mimi bake?"],
      ["A week has 7 days. The shop stays open for {n|week}.", "How many days is the shop open?"],
      ["A week has 7 days. Mimi plants herbs for {n|week}.", "How many days does she plant herbs?"],
      ["A week has 7 days. The party plans take {n|week}.", "How many days do the plans take?"]
    ],
    Y: [
      ["A year has 12 months. Mimi has had her cafe for {n|year}.", "How many months is that?"],
      ["A year has 12 months. The old oven worked for {n|year}.", "How many months did it work?"],
      ["A year has 12 months. Mimi saved coins for {n|year}.", "How many months did she save?"],
      ["A year has 12 months. The garden has grown for {n|year}.", "How many months has it grown?"]
    ],
    D: [
      ["A day has 24 hours. Mimi's soup simmers for {n|day}.", "How many hours does it simmer?"],
      ["A day has 24 hours. The bread dough rests for {n|day}.", "How many hours does it rest?"],
      ["A day has 24 hours. Mimi's friend visits for {n|day}.", "How many hours does she stay?"],
      ["A day has 24 hours. The cake stays fresh for {n|day}.", "How many hours does it stay fresh?"]
    ]
  };
  const TIME2_KIND = {
    theme: "cafe", name: "Cafe: days, weeks, months and hours", grade: 3, group: "money_time", needs: ["cafe_time.1"],
    all: () => Object.keys(UNIT_TIME).flatMap(type => UNIT_TIME[type].ns.map(n => ({ type, n }))),
    bank: TIME2_BANK,
    sceneRows: { W: ["cookie:tray", "cupcake:tray", "flower:vase", "muffin:box"], Y: ["coin:jar", "cookie:tray", "cupcake:tray", "flower:vase"], D: ["cookie:tray", "muffin:box", "cupcake:tray", "roll:plate"] },
    scene: ({ type, n }) => ({ act: "groups", n, per: UNIT_TIME[type].per, holder: "tray" }),
    q: ({ type, n }) => {
      const u = UNIT_TIME[type], ans = n * u.per;
      return { v: { n }, nums: [u.per, n], ans, eq: `${n} × ${u.per} = ?`, op: "×", start: 0, end: ans, line: { lo: 0, hi: 10 * u.per, step: u.per },
        fact: `${pl(n, u.unit)} is ${ans} ${u.of}s.`, hint: `Skip count by ${u.per}, ${n} times.`, key: `${type}:${n}` };
    },
    lesson: ({ type, n }, Q) => {
      const u = UNIT_TIME[type];
      return { kind: "units", steps: [
        { say: `Each ${u.unit} has ${u.per} ${u.of}s. So we use ${u.per}, ${n} times.`, draw: [rowOf(0, Q.eq)] },
        { say: `Skip count by ${u.per}. Hop ${n} times.`, draw: [], line: [0, Q.ans, u.per] }
      ] };
    }
  };


  /* =====================================================================================
     Round of 23 Oct 2026 (Grade 3 gaps, round 1): comparing and ordering numbers to 1000, even and odd, estimating, bills and coins to 100 dollars.
     Ten new skills for Marie (cafe), 63 question shapes ("types", each with 3 or 4 cafe wordings). They follow the 22 Oct pattern: a story kind, a scene that never
     carries the answer, a skill-map entry with needs, one hint (the engine turns it into the 3-step help), a short lesson, and a miss class where one fits.
     A type is { n (how many number sets), gen(tb) (one number set, or null to skip it), bank [[story, ask, sceneRow]], scene(p), q(p), les(p, Q) }.
     Number sets are made from a fixed seed, so the list of questions is the same every time (the tests walk every one).
     Extra fields q(p) may return, copied onto Q by decorate: range [lo, hi] (a typed estimate is right anywhere in it: index.html asks KS.isRight),
     opposite (the number a child gives when she reads "more" as "less": MissStudy "wrong_end"), noNear (a tap miss is never "one or two away"),
     parity (a wrong even/odd tap: MissStudy "last_digit"). Every one of these kinds sets Q.noLine: there is no number line to hop on.
     Spoken text: no "$" and no symbols (money is said in words: "20 dollars", "a twenty-dollar bill").
     ===================================================================================== */
  const rng32 = seed => { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  const hashText = s => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0; return h; };
  const toolbox = r => ({
    int: (lo, hi) => lo + Math.floor(r() * (hi - lo + 1)), pick: a => a[Math.floor(r() * a.length)], flip: () => r() < 0.5,
    shuffle: a => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; }
  });
  const LINE_OFF = { lo: 0, hi: 1000, step: 100 };
  const hd = n => Math.floor(n / 100), td = n => Math.floor(n / 10) % 10;
  const sortUp = a => a.slice().sort((x, y) => x - y);
  const spread = (tb, n, lo, hi, gap) => { for (let i = 0; i < 200; i++) { const v = Array.from({ length: n }, () => tb.int(lo, hi)), s = sortUp(v); if (s.every((x, k) => !k || x - s[k - 1] >= gap)) return v; } return null; };
  function g3Kind(meta, T) {
    const ids = Object.keys(T);
    return {
      theme: "cafe", name: meta.name, grade: meta.grade || 3, group: meta.group, needs: meta.needs, choice: meta.choice === "mixed" ? "mixed" : !!meta.choice, ordered: !!meta.ordered,
      all: () => ids.flatMap(type => {
        const D = T[type], tb = toolbox(rng32(hashText(meta.name + type))), seen = new Set(), out = [];
        for (let i = 0; i < 8000 && out.length < (D.n || 40); i++) {
          const p = D.gen(tb); if (!p) continue;
          const sc = D.scene(p); if (sc.act === "lineup" && sc.n > 1 && sc.n === D.q(p).ans) continue;   // the picture must never show as many holders as the answer
          const k = JSON.stringify(p); if (seen.has(k)) continue; seen.add(k); out.push(Object.assign({ type }, p));
        }
        if (out.length < (D.min || 12)) throw new Error("KS: too few number sets for " + type);
        return out;
      }),
      bank: Object.fromEntries(ids.map(t => [t, T[t].bank.map(b => [b[0], b[1]])])),
      sceneRows: Object.fromEntries(ids.map(t => [t, T[t].bank.map(b => b[2])])),
      scene: p => T[p.type].scene(p),
      q: p => { const d = T[p.type].q(p); return Object.assign({ op: "", start: 0, line: LINE_OFF }, d, { end: d.ans }); },
      decorate: (Q, p, ti) => {
        const d = T[p.type].q(p);
        Q.noLine = true;
        ["range", "opposite", "noNear", "parity", "slips", "figure"].forEach(f => { if (d[f] !== undefined && d[f] !== false) Q[f] = d[f]; });
        // word, solid, fraction and small-picture answer buttons (round of 23 Oct 2026, round 2). The buttons are numbered 1, 2, 3 only to tell them apart; Q.pics[v] says what to draw:
        // { word, say } a word, { frac: "1/3", say } a fraction, { solid } a solid, { fig } a small figure. Q.optSay[v] is what is spoken for the button.
        if (d.words) {
          Q.picOpts = true; Q.pics = {}; Q.optSay = {};
          d.words.forEach((w, i) => { const e = typeof w === "string" ? { word: w } : w; Q.pics[i + 1] = Object.assign({ name: e.say || e.word || e.frac || e.solid }, e); Q.optSay[i + 1] = e.say || e.word || e.frac || e.solid; });
          Q.tapSay = `Tap ${Q.optSay[d.ans]}.`;
        }
        if (d.helpFig) Q.hintPic = { figure: d.helpFig.fig, help: d.helpFig.help || true };
        else if (d.figure) Q.hintPic = { figure: d.figure, help: true };
        if (T[p.type].deco) T[p.type].deco(Q, p, ti);
        // the second help picture (game/hint_ladder.js): place-value blocks of the numbers in the story, or a pile put in pairs. It shows amounts, never the answer.
        if (meta.pic && !T[p.type].noPic && d.nums.length >= 1 && d.nums.length <= 4) Q.hintPic = { blocks: d.nums.slice() };
        if (d.hintPic) Q.hintPic = d.hintPic;
      },
      lesson: (p, Q) => {
        const L = T[p.type].les(p, Q);
        return { kind: meta.lessonKind, steps: [{ say: L[0], draw: [rowOf(0, Q.eq)] }, { say: L[1], draw: L[2] ? [rowOf(1, L[2])] : [] }] };
      }
    };
  }

  /* ----- which number is more, which is less (cafe_compare.1) ----- */
  const MORE2_BANK = [
    ["Mimi sold {a} cookies in May and {b} cookies in June.", "In which month did she sell more? Tap that number.", "cookie:tray"],
    ["One jar holds {a} candies. The other jar holds {b} candies.", "Which jar holds more? Tap that number.", "candy:jar"],
    ["Mimi has two boxes of tea bags. One box has {a}. The other has {b}.", "Which box has more tea bags? Tap that number.", "tea_bag:box"],
    ["Mimi baked {a} muffins last week and {b} muffins this week.", "Which week had more muffins? Tap that number.", "muffin:tray"]
  ];
  const LESS2_BANK = [
    ["Mimi sold {a} cookies in May and {b} cookies in June.", "In which month did she sell fewer? Tap that number.", "cookie:tray"],
    ["One jar holds {a} candies. The other jar holds {b} candies.", "Which jar holds fewer? Tap that number.", "candy:jar"],
    ["Mimi has two boxes of tea bags. One box has {a}. The other has {b}.", "Which box has fewer tea bags? Tap that number.", "tea_bag:box"],
    ["Mimi baked {a} muffins last week and {b} muffins this week.", "Which week had fewer muffins? Tap that number.", "muffin:tray"]
  ];
  const MORE3_BANK = [
    ["Mimi has three jars. They hold {a}, {b} and {c} candies.", "Which jar holds the most? Tap that number.", "candy:jar"],
    ["Mimi sold {a} cookies on Monday, {b} on Tuesday and {c} on Wednesday.", "Which day had the most cookies? Tap that number.", "cookie:tray"],
    ["Three shelves hold {a}, {b} and {c} cups.", "Which shelf holds the most cups? Tap that number.", "cup:table"]
  ];
  const LESS3_BANK = [
    ["Mimi has three jars. They hold {a}, {b} and {c} candies.", "Which jar holds the fewest? Tap that number.", "candy:jar"],
    ["Mimi sold {a} cookies on Monday, {b} on Tuesday and {c} on Wednesday.", "Which day had the fewest cookies? Tap that number.", "cookie:tray"],
    ["Three shelves hold {a}, {b} and {c} cups.", "Which shelf holds the fewest cups? Tap that number.", "cup:table"]
  ];
  const PAIR_HINT = {
    h: more => `Look at the hundreds first. The ${more ? "bigger" : "smaller"} hundreds digit makes the ${more ? "bigger" : "smaller"} number.`,
    t: () => "The hundreds are the same. Look at the tens next.",
    o: () => "The hundreds and the tens are the same. Look at the ones.",
    d: more => `Count the digits. The number with ${more ? "more" : "fewer"} digits is ${more ? "bigger" : "smaller"}.`
  };
  function pairType(diff, more) {
    return {
      n: 40, min: 20,
      gen: tb => {
        let a, b;
        if (diff === "h") { a = tb.int(100, 999); b = tb.int(100, 999); if (hd(a) === hd(b)) return null; }
        else if (diff === "t") { const h = tb.int(1, 9); a = h * 100 + tb.int(0, 99); b = h * 100 + tb.int(0, 99); if (td(a) === td(b)) return null; }
        else if (diff === "o") { const base = tb.int(10, 99) * 10; a = base + tb.int(0, 9); b = base + tb.int(0, 9); if (a === b) return null; }
        else { const x = tb.int(60, 99), y = tb.int(100, 140); if (tb.flip()) { a = x; b = y; } else { a = y; b = x; } }
        return { a, b };
      },
      bank: more ? MORE2_BANK : LESS2_BANK,
      scene: () => ({ act: "lineup", n: 2 }),
      q: ({ a, b }) => {
        const big = Math.max(a, b), small = Math.min(a, b), ans = more ? big : small, other = more ? small : big;
        return { v: { a, b }, nums: [a, b], ans, eq: (more ? "more" : "less") + " = ?", fact: `${ans} is ${more ? "more" : "less"} than ${other}.`,
          hint: PAIR_HINT[diff](more), key: `${a}:${b}`, pool: [other], want: 1, opposite: other, noNear: true };
      },
      les: ({ a, b }, Q) => {
        const w = more ? "bigger" : "smaller", verdict = `So ${Q.ans} is ${more ? "more" : "less"}.`;
        if (diff === "h") return [`We want the ${w} number. Look at the hundreds first.`, `${pl(hd(a), "hundred")} and ${pl(hd(b), "hundred")}. ${verdict}`, `${a} or ${b}`];
        if (diff === "t") return [`We want the ${w} number. The hundreds are the same, so look at the tens.`, `${pl(td(a), "ten")} and ${pl(td(b), "ten")}. ${verdict}`, `${a} or ${b}`];
        if (diff === "o") return [`We want the ${w} number. The hundreds and the tens are the same, so look at the ones.`, `${pl(a % 10, "one")} and ${pl(b % 10, "one")}. ${verdict}`, `${a} or ${b}`];
        return [`We want the ${w} number. Count the digits in each number.`, `${Math.min(a, b)} has two digits. ${Math.max(a, b)} has three digits. ${verdict}`, `${a} or ${b}`];
      }
    };
  }
  function trioType(more) {
    return {
      n: 40, min: 20,
      gen: tb => { const v = spread(tb, 3, 100, 999, 11); return v && { a: v[0], b: v[1], c: v[2] }; },
      bank: more ? MORE3_BANK : LESS3_BANK,
      scene: () => ({ act: "lineup", n: 3 }),
      q: ({ a, b, c }) => {
        const s = sortUp([a, b, c]), ans = more ? s[2] : s[0], opp = more ? s[0] : s[2];
        return { v: { a, b, c }, nums: [a, b, c], ans, eq: (more ? "most" : "fewest") + " = ?", fact: `${ans} is the ${more ? "most" : "fewest"} of the three.`,
          hint: "Look at the hundreds first. If two match, look at the tens.", key: `${a}:${b}:${c}`, pool: [a, b, c].filter(x => x !== ans), want: 2, opposite: opp, noNear: true };
      },
      les: ({ a, b, c }, Q) => [`We want the ${more ? "biggest" : "smallest"} number. Look at the hundreds first. If they match, look at the tens.`,
        `${Q.ans} is the ${more ? "most" : "fewest"} of the three.`, `${a} ${b} ${c}`]
    };
  }
  const COMPARE_TYPES = {
    MA: pairType("h", true), MB: pairType("t", true), MC: pairType("o", true), MD: pairType("d", true),
    LA: pairType("h", false), LB: pairType("t", false), LC: pairType("o", false), LD: pairType("d", false),
    M3: trioType(true), L3: trioType(false)
  };
  const G3_COMPARE_KIND = g3Kind({ name: "Cafe: which number is more or less (to 1000)", group: "count", needs: ["cafe_tens.1", "sums.5"], choice: true, pic: true, lessonKind: "compare3" }, COMPARE_TYPES);

  /* ----- putting numbers in order (cafe_order.1: tap) and 10 or 100 more or less (cafe_order.2: type) ----- */
  const ORDER_MIDDLE_BANK = [
    ["Mimi puts three jars in order, from the least to the most. The jars hold {a}, {b} and {c} candies.", "Which number is in the middle?", "candy:jar"],
    ["Mimi sold {a}, {b} and {c} muffins on three days. She lists the days from the fewest to the most.", "Which number is in the middle of the list?", "muffin:tray"],
    ["Three shelves hold {a}, {b} and {c} cups. Mimi puts the shelves in order.", "Which number is in the middle, from smallest to biggest?", "cup:table"]
  ];
  const ORDER_NEXT_BANK = [
    ["Mimi lines up jars from the least to the most. The jars hold {a}, {b} and {c} candies.", "Which number can come next in the line?", "candy:jar"],
    ["Mimi sells more cookies each day: {a}, {b} and {c}. The days go on.", "Which number can come next?", "cookie:tray"],
    ["Tea boxes stand in a line from the least to the most. They hold {a}, {b} and {c} tea bags.", "Which number can come next in the line?", "tea_bag:box"]
  ];
  const ORDER_HIDDEN_BANK = [
    ["Mimi puts jars in order. One jar holds {a} candies. The next jar is hidden. The jar after it holds {b} candies.", "Which number could be in the hidden jar?", "candy:jar"],
    ["Three trays stand in order. The first tray holds {a} cookies. The last tray holds {b}. The middle tray is covered.", "Which number could be on the covered tray?", "cookie:tray"],
    ["Mimi lines up boxes in order. One box has {a} tea bags. A box in the next place is shut. The one after it has {b}.", "Which number could be in the shut box?", "tea_bag:box"]
  ];
  const ORDER_BETWEEN_BANK = [
    ["Mimi numbers her tables. Table {a} is on the left. Table {b} is on the right.", "Which table number is between them?", "chair:table"],
    ["A cake box says {a} on one side and {b} on the other. Mimi writes a number in between.", "Which number is between them?", "cake_box:table"],
    ["Mimi's two jars hold {a} and {b} candies. A third jar holds a number in between.", "Which number is between them?", "candy:jar"]
  ];
  const ORDER_OUTSIDE_BANK = [
    ["A party needs a number of cookies between {a} and {b}. Mimi has jars with {x}, {y} and {z} cookies.", "Which jar does not fit the party? Tap that number.", "cookie:tray"],
    ["Mimi wants a number of cups between {a} and {b}. She counts {x}, {y} and {z} cups on three shelves.", "Which shelf has a number that is not between? Tap it.", "cup:table"],
    ["A box must hold between {a} and {b} tea bags. Three boxes hold {x}, {y} and {z}.", "Which box is wrong? Tap that number.", "tea_bag:box"]
  ];
  const ORDER_SECOND_BANK = [
    ["Mimi sold {a}, {b}, {c} and {d} muffins on four days.", "Which number is the second biggest?", "muffin:tray"],
    ["Four jars hold {a}, {b}, {c} and {d} candies.", "Which number is the second biggest?", "candy:jar"],
    ["Mimi counts {a}, {b}, {c} and {d} cups on four shelves.", "Which number is the second biggest?", "cup:table"]
  ];
  // a hidden number between lo and hi, with two choices outside (one under lo, one over hi)
  const betweenGen = tb => {
    const lo = tb.int(120, 880), hi = lo + tb.int(30, 110); if (hi > 960) return null;
    const ans = tb.int(lo + 6, hi - 6), d1 = lo - tb.int(5, 60), d2 = hi + tb.int(5, 60);
    return d1 < 100 || d2 > 999 ? null : { lo, hi, ans, d1, d2 };
  };
  const betweenQ = ({ lo, hi, ans, d1, d2 }, down) => ({ v: down ? { a: hi, b: lo } : { a: lo, b: hi }, nums: down ? [hi, lo] : [lo, hi], ans, eq: "between = ?",
    fact: `${ans} is more than ${lo} and less than ${hi}.`, hint: `The number must be more than ${lo} and less than ${hi}.`, key: `${lo}:${hi}:${ans}`, pool: [d1, d2], want: 2, noNear: true });
  const betweenLes = ({ lo, hi }, Q) => [`Look for a number that is bigger than ${lo} and smaller than ${hi}.`, `${Q.ans} fits in between.`, `${lo} ${Q.ans} ${hi}`];
  const ORDER_TYPES = {
    OM: {
      n: 40, min: 20, gen: tb => { const v = spread(tb, 3, 100, 999, 11); return v && { a: v[0], b: v[1], c: v[2] }; },
      bank: ORDER_MIDDLE_BANK, scene: () => ({ act: "lineup", n: 3 }),
      q: ({ a, b, c }) => { const s = sortUp([a, b, c]); return { v: { a, b, c }, nums: [a, b, c], ans: s[1], eq: "middle = ?", fact: `In order they go ${s[0]}, ${s[1]} and ${s[2]}. The middle one is ${s[1]}.`,
        hint: "Put them in order. Which number is the smallest? Which is the biggest? The one left is in the middle.", key: `${a}:${b}:${c}`, pool: [s[0], s[2]], want: 2, noNear: true }; },
      les: ({ a, b, c }, Q) => { const s = sortUp([a, b, c]); return ["Put the numbers in order, from the smallest to the biggest. Look at the hundreds first.", `The order is ${s[0]}, ${s[1]} and ${s[2]}. The middle one is ${s[1]}.`, `${s[0]} ${s[1]} ${s[2]}`]; }
    },
    ON: {
      n: 40, min: 20,
      gen: tb => { const a = tb.int(100, 400), b = a + tb.int(30, 150), c = b + tb.int(30, 150), d = c + tb.int(30, 120); return d > 999 ? null : { a, b, c, d, e1: a + tb.int(1, b - a - 1), e2: b + tb.int(1, c - b - 1) }; },
      bank: ORDER_NEXT_BANK, scene: () => ({ act: "lineup", n: 3 }),
      q: ({ a, b, c, d, e1, e2 }) => ({ v: { a, b, c }, nums: [a, b, c], ans: d, eq: "next = ?", fact: `The line goes up. ${d} is more than ${c}, so it can come next.`,
        hint: "The line goes up. The next number must be bigger than the last one.", key: `${a}:${b}:${c}:${d}`, pool: [e1, e2], want: 2, noNear: true }),
      les: ({ a, b, c }, Q) => ["The numbers go up, from the least to the most. The next one must be bigger than the last one.", `${Q.ans} is more than ${c}.`, `${a} ${b} ${c} ${Q.ans}`]
    },
    OG: { n: 40, min: 20, gen: betweenGen, bank: ORDER_HIDDEN_BANK, scene: () => ({ act: "lineup", n: 3 }), q: p => betweenQ(p, false), les: betweenLes },
    OH: {
      n: 40, min: 20, gen: betweenGen, bank: ORDER_HIDDEN_BANK.map(([s, a, r]) => [s.replace("in order", "in order, from the most to the least").replace("Three trays stand in order.", "Three trays stand in order, from the most to the least."), a, r]),
      scene: () => ({ act: "lineup", n: 3 }), q: p => betweenQ(p, true), les: betweenLes
    },
    OS: { n: 40, min: 20, gen: betweenGen, bank: ORDER_BETWEEN_BANK, scene: () => ({ act: "lineup", n: 2 }), q: p => betweenQ(p, false), les: betweenLes },
    OT: {
      n: 40, min: 20,
      gen: tb => {
        const lo = tb.int(120, 800), hi = lo + tb.int(60, 150), x = tb.int(lo + 6, hi - 6), y = tb.int(lo + 6, hi - 6), out = tb.flip() ? lo - tb.int(5, 60) : hi + tb.int(5, 60);
        return x === y || hi > 960 || out < 100 || out > 999 ? null : { lo, hi, x, y, z: out };
      },
      bank: ORDER_OUTSIDE_BANK, scene: () => ({ act: "lineup", n: 3 }),
      q: ({ lo, hi, x, y, z }) => ({ v: { a: lo, b: hi, x, y, z }, nums: [lo, hi, x, y, z], ans: z, eq: "outside = ?", fact: `${z} is not between ${lo} and ${hi}.`,
        hint: `A number that fits is more than ${lo} and less than ${hi}. Which one does not?`, key: `${lo}:${hi}:${x}:${y}:${z}`, pool: [x, y], want: 2, noNear: true }),
      les: ({ lo, hi }, Q) => [`A number fits when it is bigger than ${lo} and smaller than ${hi}.`, `${Q.ans} does not fit.`, `${lo} to ${hi}`]
    },
    OR: {
      n: 40, min: 20, gen: tb => { const v = spread(tb, 4, 100, 999, 11); return v && { a: v[0], b: v[1], c: v[2], d: v[3] }; },
      bank: ORDER_SECOND_BANK, scene: () => ({ act: "lineup", n: 4 }),
      q: ({ a, b, c, d }) => { const s = sortUp([a, b, c, d]); return { v: { a, b, c, d }, nums: [a, b, c, d], ans: s[2], eq: "second = ?", fact: `From the biggest down: ${s[3]}, ${s[2]}. So ${s[2]} is the second biggest.`,
        hint: "Find the biggest number first. Then find the next biggest.", key: `${a}:${b}:${c}:${d}`, pool: [a, b, c, d].filter(x => x !== s[2]), want: 3, noNear: true }; },
      les: ({ a, b, c, d }, Q) => { const s = sortUp([a, b, c, d]); return ["Find the biggest number first. Then find the next biggest.", `The biggest is ${s[3]}. The next one is ${s[2]}.`, `${s[3]} ${s[2]}`]; }
    }
  };
  const G3_ORDER_KIND = g3Kind({ name: "Cafe: put numbers in order (to 1000)", group: "count", needs: ["cafe_compare.1"], choice: true, pic: true, lessonKind: "order3" }, ORDER_TYPES);

  const STEP_BANK = {
    TM: [["Mimi has {n} stickers. A friend gives her ten more.", "How many stickers does she have now?", "sticker:tray"], ["The jar holds {n} candies. Mimi adds ten more.", "How many candies are in the jar now?", "candy:jar"], ["Mimi baked {n} cookies. She bakes ten more.", "How many cookies has she baked?", "cookie:tray"]],
    TL: [["Mimi has {n} candies. She sells ten of them.", "How many candies are left?", "candy:jar"], ["The shop has {n} cups. Ten cups go to the party.", "How many cups are left?", "cup:table"], ["Mimi packs {n} cookies. She eats ten of them.", "How many cookies are left?", "cookie:tray"]],
    HM: [["Mimi has {n} stickers. A friend gives her one hundred more.", "How many stickers does she have now?", "sticker:tray"], ["The jar holds {n} candies. Mimi adds one hundred more.", "How many candies are in the jar now?", "candy:jar"], ["The cafe sold {n} muffins. It sells one hundred more.", "How many muffins did it sell in all?", "muffin:tray"]],
    HL: [["Mimi has {n} candies. She gives away one hundred of them.", "How many candies are left?", "candy:jar"], ["The shop has {n} cups. One hundred cups go to the fair.", "How many cups are left?", "cup:table"], ["Mimi baked {n} cookies. She sells one hundred of them.", "How many cookies are left?", "cookie:tray"]]
  };
  // ten more or less: when the tens digit is 9 (going up) or 0 (going down) the hundreds digit changes too, so the words must say so
  const stepCrosses = (n, up) => (up ? td(n) === 9 : td(n) === 0);
  const stepHint = (n, up, tens) => !tens ? "Only the hundreds digit changes. The tens and the ones stay the same."
    : !stepCrosses(n, up) ? "Only the tens digit changes. The hundreds and the ones stay the same."
    : up ? "Nine tens and one more ten make a new hundred. The hundreds digit goes up by one and the tens digit is zero. The ones stay the same."
      : "There are no tens to take away, so use a hundred as ten tens. The hundreds digit goes down by one and the tens digit is nine. The ones stay the same.";
  const stepTensLine = (n, up, ans) => !stepCrosses(n, up) ? `${n} has ${pl(td(n), "ten")} in the tens place. Now it has ${pl(td(ans), "ten")}.`
    : up ? `${n} has 9 tens in the tens place. One more ten makes a new hundred, so the hundreds go up by one and the tens place is zero.`
      : `${n} has no tens in the tens place. Take one hundred and make it ten tens. Then take away one ten, and nine tens are left.`;
  const stepType = (kind, up, tens) => {
    const by = tens ? 10 : 100;
    return {
      n: 40, min: 20,
      gen: tb => ({ n: up ? tb.int(100, 999 - by) : tb.int(100 + by, 999) }),
      bank: STEP_BANK[kind], scene: () => ({ act: "lineup", n: 1 }),
      q: ({ n }) => { const ans = up ? n + by : n - by; return { v: { n }, nums: [n], ans, eq: `${n} ${up ? "+" : MINUS} ${by} = ?`, op: up ? "+" : "-", fact: `${n} ${up ? "plus" : "minus"} ${by} is ${ans}.`,
        hint: stepHint(n, up, tens), key: `${n}` }; },
      les: ({ n }, Q) => [tens ? `${up ? "Ten more" : "Ten less"} means ${up ? "one more ten" : "one ten fewer"}. Look at the tens digit.` : `${up ? "One hundred more" : "One hundred less"} means ${up ? "one more hundred" : "one hundred fewer"}. Look at the hundreds digit.`,
        tens ? stepTensLine(n, up, Q.ans) : `${n} has ${pl(hd(n), "hundred")} in the hundreds place. Now it has ${pl(hd(Q.ans), "hundred")}.`, `${n} ${up ? "+" : MINUS} ${by} = ${Q.ans}`]
    };
  };
  const STEP_TYPES = { TM: stepType("TM", true, true), TL: stepType("TL", false, true), HM: stepType("HM", true, false), HL: stepType("HL", false, false) };
  const G3_STEP_KIND = g3Kind({ name: "Cafe: 10 or 100 more, 10 or 100 less", group: "count", needs: ["cafe_tens.1"], choice: false, pic: true, lessonKind: "steps" }, STEP_TYPES);

  /* ----- even and odd numbers (cafe_evenodd.1: tap) ----- */
  const isEven = n => n % 2 === 0;
  const EVEN_ROW = "ends 0 2 4 6 8", ODD_ROW = "ends 1 3 5 7 9";
  const WHICH_BANK = (word) => [
    [`Three guests get numbered tickets: {a}, {b} and {c}. Mimi calls the ${word} numbers first.`, `Which ticket is ${word}? Tap that number.`, "sign:table"],
    [`Three tables have signs: {a}, {b} and {c}.`, `Which table has an ${word === "even" ? "even" : "odd"} number? Tap it.`, "chair:table"],
    [`Mimi puts numbers on three cake boxes: {a}, {b} and {c}.`, `Which number is ${word}? Tap it.`, "cake_box:table"]
  ];
  const oneOf = (tb, lo, hi, even) => { for (let i = 0; i < 50; i++) { const v = tb.int(lo, hi); if (isEven(v) === even) return v; } return null; };
  function whichType(lo, hi, wantEven) {
    return {
      n: 40, min: 20,
      gen: tb => {
        const x = oneOf(tb, lo, hi, wantEven), y = oneOf(tb, lo, hi, !wantEven), z = oneOf(tb, lo, hi, !wantEven);
        if (x === null || y === null || z === null || y === z) return null;
        const o = tb.shuffle([x, y, z]); return { a: o[0], b: o[1], c: o[2] };
      },
      bank: WHICH_BANK(wantEven ? "even" : "odd"),
      scene: () => ({ act: "lineup", n: 3 }),
      q: ({ a, b, c }) => {
        const ans = [a, b, c].find(x => isEven(x) === wantEven);
        return { v: { a, b, c }, nums: [a, b, c], ans, eq: (wantEven ? "even" : "odd") + " = ?", fact: `${ans} ends in ${ans % 10}, so it is ${wantEven ? "even" : "odd"}.`,
          hint: wantEven ? "An even number ends in 0, 2, 4, 6 or 8. Look at the last digit." : "An odd number ends in 1, 3, 5, 7 or 9. Look at the last digit.", key: `${a}:${b}:${c}`,
          pool: [a, b, c].filter(x => x !== ans), want: 2, noNear: true, parity: true };
      },
      les: (p, Q) => [wantEven ? "An even number ends in 0, 2, 4, 6 or 8. Look at the last digit of each number." : "An odd number ends in 1, 3, 5, 7 or 9. Look at the last digit of each number.",
        `${Q.ans} ends in ${Q.ans % 10}. So it is ${wantEven ? "even" : "odd"}.`, wantEven ? EVEN_ROW : ODD_ROW]
    };
  }
  const NOTEVEN_BANK = [
    ["Mimi has four plates with {a}, {b}, {c} and {d} cookies. Three plates can be shared by two friends with none left over.", "Which plate cannot? Tap that number.", "cookie:plate"],
    ["Four jars hold {a}, {b}, {c} and {d} candies. Three jars hold an even number.", "Which jar holds an odd number? Tap it.", "candy:jar"],
    ["Mimi writes {a}, {b}, {c} and {d} on four cups. Three of the numbers are even.", "Which number is not even? Tap it.", "cup:table"]
  ];
  const LEFTOVER_BANK = [
    ["Mimi shares {n|cookie} between two plates. Each plate gets the same.", "How many cookies are left over?", "cookie:plate"],
    ["Mimi puts {n|cup} in pairs on the table.", "How many cups have no partner?", "cup:table"],
    ["Two friends share {n|candy|candies}. They give them out one at a time.", "How many candies are left over?", "candy:jar"]
  ];
  const NEXTEVEN_BANK = (word) => [
    [`Mimi numbers her tables with ${word} numbers: {a}, {b} and {c}.`, "Which number comes next?", "chair:table"],
    [`The cafe stools have ${word} numbers: {a}, {b} and {c}. They go on.`, "Which number is on the next stool?", "chair:table"],
    [`Mimi counts by twos and says ${word} numbers: {a}, {b} and {c}.`, "Which number does she say next?", "sign:table"]
  ];
  const MISSING_BANK = [
    ["Mimi numbers her tables in order, counting by twos: {a}, {b}, then a table with no sign, then {c}.", "What number goes on the table with no sign?", "chair:table"],
    ["The cups on the shelf are numbered by twos: {a}, {b}, then a cup with no number, then {c}.", "What number goes on that cup?", "cup:table"],
    ["Mimi hangs signs by twos: {a}, {b}, then an empty hook, then {c}.", "What number goes on the empty hook?", "sign:table"]
  ];
  const EVEN_TYPES = {
    EE: whichType(10, 99, true), EO: whichType(10, 99, false), EB: whichType(100, 999, true), EC: whichType(100, 999, false),
    EN: {
      n: 40, min: 20,
      gen: tb => {
        const e = [oneOf(tb, 10, 99, true), oneOf(tb, 10, 99, true), oneOf(tb, 10, 99, true)], o = oneOf(tb, 10, 99, false);
        if (e.includes(null) || new Set(e).size !== 3 || o === null) return null;
        const v = tb.shuffle([e[0], e[1], e[2], o]); return { a: v[0], b: v[1], c: v[2], d: v[3] };
      },
      bank: NOTEVEN_BANK, scene: () => ({ act: "lineup", n: 4 }),
      q: ({ a, b, c, d }) => { const ans = [a, b, c, d].find(x => !isEven(x)); return { v: { a, b, c, d }, nums: [a, b, c, d], ans, eq: "odd = ?", fact: `${ans} ends in ${ans % 10}, so it is odd.`,
        hint: "An even number ends in 0, 2, 4, 6 or 8. Which number does not?", key: `${a}:${b}:${c}:${d}`, pool: [a, b, c, d].filter(x => x !== ans), want: 3, noNear: true, parity: true }; },
      les: (p, Q) => ["An even number ends in 0, 2, 4, 6 or 8. Look at the last digit of each number.", `${Q.ans} ends in ${Q.ans % 10}. It is the odd one.`, ODD_ROW]
    },
    EL: {
      n: 40, min: 20, gen: tb => ({ n: tb.int(5, 39) }), bank: LEFTOVER_BANK, scene: () => ({ act: "lineup", n: 2 }),
      q: ({ n }) => ({ v: { n }, nums: [n], ans: n % 2, eq: "left = ?", fact: n % 2 ? `${n} is odd. One is left over.` : `${n} is even. None are left over.`,
        hint: "Share them two at a time. Is one left? Look at the last digit of the number.", key: `${n}`, pool: [0, 1, 2], want: 2, noNear: true, parity: true, hintPic: { pairs: n } }),
      les: ({ n }, Q) => ["Share them out two at a time. An even number has none left over. An odd number has one left over.", `${n} ends in ${n % 10}. So ${n % 2 ? "one is left over" : "none are left over"}.`, n % 2 ? ODD_ROW : EVEN_ROW]
    },
    EX: {
      n: 40, min: 20, gen: tb => { const a = oneOf(tb, 2, 90, true); return a === null ? null : { a }; }, bank: NEXTEVEN_BANK("even"), scene: () => ({ act: "lineup", n: 3 }),
      q: ({ a }) => { const ans = a + 6; return { v: { a, b: a + 2, c: a + 4 }, nums: [a, a + 2, a + 4], ans, eq: "next = ?", fact: `${a + 4} plus 2 is ${ans}. ${ans} is even.`,
        hint: "Even numbers go up by 2. The next number ends in 0, 2, 4, 6 or 8.", key: `${a}`, pool: [ans - 1, ans + 1, ans + 3], want: 2, noNear: true, parity: true }; },
      les: ({ a }, Q) => ["Even numbers go up by 2 each time. Add 2 to the last number.", `${a + 4} plus 2 is ${Q.ans}.`, `${a + 4} + 2 = ${Q.ans}`]
    },
    EY: {
      n: 40, min: 20, gen: tb => { const a = oneOf(tb, 1, 89, false); return a === null ? null : { a }; }, bank: NEXTEVEN_BANK("odd"), scene: () => ({ act: "lineup", n: 3 }),
      q: ({ a }) => { const ans = a + 6; return { v: { a, b: a + 2, c: a + 4 }, nums: [a, a + 2, a + 4], ans, eq: "next = ?", fact: `${a + 4} plus 2 is ${ans}. ${ans} is odd.`,
        hint: "Odd numbers go up by 2. The next number ends in 1, 3, 5, 7 or 9.", key: `${a}`, pool: [ans - 1, ans + 1, ans + 3], want: 2, noNear: true, parity: true }; },
      les: ({ a }, Q) => ["Odd numbers go up by 2 each time. Add 2 to the last number.", `${a + 4} plus 2 is ${Q.ans}.`, `${a + 4} + 2 = ${Q.ans}`]
    },
    EZ: {
      n: 40, min: 20, gen: tb => { const a = oneOf(tb, 2, 90, tb.flip()); return a === null ? null : { a }; }, bank: MISSING_BANK, scene: () => ({ act: "lineup", n: 4 }),
      q: ({ a }) => { const ans = a + 4; return { v: { a, b: a + 2, c: a + 6 }, nums: [a, a + 2, a + 6], ans, eq: "missing = ?", fact: `${a + 2} plus 2 is ${ans}. ${ans} plus 2 is ${a + 6}.`,
        hint: "Count by 2 from the second number. What do you say before the last number?", key: `${a}`, pool: [ans - 1, ans + 1, ans + 2], want: 2, noNear: true, parity: true }; },
      les: ({ a }, Q) => ["Count by 2 from the second number to find the one that is missing.", `${a + 2} plus 2 is ${Q.ans}.`, `${a + 2} + 2 = ${Q.ans}`]
    }
  };
  const G3_EVENODD_KIND = g3Kind({ name: "Cafe: even and odd numbers", group: "count", needs: ["cafe_times.1"], choice: true, lessonKind: "evenodd" }, EVEN_TYPES);

  /* ----- rounding to the nearest 10 or 100 (cafe_estimate.1: type) ----- */
  const near10 = n => Math.floor((n + 5) / 10) * 10, near100 = n => Math.floor((n + 50) / 100) * 100;
  const ROUND10_BANK = [
    ["Mimi counts {n} cookies on the shelf. A customer asks about how many there are.", "About how many cookies is that, to the nearest ten?", "cookie:tray"],
    ["The jar has {n} candies. Mimi tells a friend about how many.", "About how many candies is that, to the nearest ten?", "candy:jar"],
    ["{n} guests came to the cafe this month. Mimi tells her friend about how many.", "About how many guests is that, to the nearest ten?", "chair:table"]
  ];
  const ROUND100_BANK = [
    ["Mimi baked {n} muffins this year. A reporter asks about how many.", "About how many muffins is that, to the nearest hundred?", "muffin:tray"],
    ["The cafe sold {n} cups of tea. Mimi puts about how many on a sign.", "About how many cups is that, to the nearest hundred?", "cup:table"],
    ["{n} guests visited the cafe this year. Mimi tells her friend about how many.", "About how many guests is that, to the nearest hundred?", "chair:table"]
  ];
  const roundType = (genN, bank, to) => ({
    n: 40, min: 20, gen: tb => ({ n: genN(tb) }), bank, scene: () => ({ act: "lineup", n: 1 }),
    q: ({ n }) => { const ans = to === 10 ? near10(n) : near100(n), digit = to === 10 ? n % 10 : n % 100;
      return { v: { n }, nums: [n], ans, eq: "about = ?", fact: `${n} is closest to ${ans}.`,
        hint: to === 10 ? "Look at the ones digit. If it is 5 or more, go up to the next ten. If it is less than 5, stay on the ten below." : "Look at the tens digit. If it is 5 or more, go up to the next hundred. If it is less than 5, stay on the hundred below.",
        key: `${n}`, digit }; },
    les: ({ n }, Q) => [to === 10 ? "Look at the ones digit. A 5 or more goes up. Less than 5 stays down." : "Look at the tens digit. A 5 or more goes up. Less than 5 stays down.",
      to === 10 ? `${n} has ${pl(n % 10, "one")}. So it is closest to ${Q.ans}.` : `${n} has ${pl(td(n), "ten")} after the hundreds. So it is closest to ${Q.ans}.`, `${n} is near ${Q.ans}`]
  });
  const ROUND_TYPES = {
    R10: roundType(tb => { for (;;) { const n = tb.int(11, 94); if (n % 10 !== 0 && n % 10 !== 5) return n; } }, ROUND10_BANK, 10),
    R10B: roundType(tb => { for (;;) { const n = tb.int(101, 994); if (n % 10 !== 0 && n % 10 !== 5) return n; } }, ROUND10_BANK, 10),
    R10U: roundType(tb => tb.int(0, 8) * 100 + tb.int(96, 99), ROUND10_BANK, 10),
    R100: roundType(tb => { for (;;) { const n = tb.int(101, 949); if (n % 100 !== 0 && n % 100 !== 50) return n; } }, ROUND100_BANK, 100)
  };
  const G3_ROUND_KIND = g3Kind({ name: "Cafe: round to the nearest 10 or 100", group: "count", needs: ["cafe_compare.1"], choice: false, pic: true, lessonKind: "round" }, ROUND_TYPES);

  /* ----- about how many in all (cafe_estimate.2: type, any answer in the reasonable range is right) -----
     Reasonable range: within 10 of the true answer when the numbers are tens, within 100 when they are hundreds, and 10 percent (to 5, at least 5) for "about 20 in each". */
  const tolPct = ans => Math.max(5, 5 * Math.round(ans * 0.1 / 5));
  const rangeNote = (lo, hi) => `Any answer from ${lo} to ${hi} is a good estimate.`;
  const EST_ADD10_BANK = [
    ["Mimi bakes {a} cookies in the morning and {b} cookies in the afternoon.", "About how many cookies is that in all? Round each number to the nearest ten first.", "cookie:tray"],
    ["The cafe sold {a} cups of tea on Monday and {b} cups on Tuesday.", "About how many cups is that in all? Round each number to the nearest ten first.", "cup:table"],
    ["Mimi has {a} candies in one jar and {b} candies in another.", "About how many candies is that in all? Round each number to the nearest ten first.", "candy:jar"]
  ];
  const EST_SUB10_BANK = [
    ["Mimi has {a} cups. She washes {b} of them.", "About how many cups are left to wash? Round each number to the nearest ten first.", "cup:table"],
    ["Mimi baked {a} muffins. The guests ate {b} of them.", "About how many muffins are left? Round each number to the nearest ten first.", "muffin:tray"],
    ["The jar had {a} candies. Mimi gave away {b} of them.", "About how many candies are left? Round each number to the nearest ten first.", "candy:jar"]
  ];
  const EST_ADD100_BANK = EST_ADD10_BANK.map(([s, a, r]) => [s, a.replace("ten", "hundred"), r]);
  const EST_SUB100_BANK = EST_SUB10_BANK.map(([s, a, r]) => [s, a.replace("ten", "hundred"), r]);
  const EST_BENCH_BANK = [
    ["Each tray holds about {u} cookies. Mimi fills {n|tray}.", "About how many cookies is that?", "cookie:tray"],
    ["A full jar holds about {u} candies. Mimi fills {n|jar}.", "About how many candies is that?", "candy:jar"],
    ["A box holds about {u} tea bags. Mimi opens {n|box|boxes}.", "About how many tea bags is that?", "tea_bag:box"]
  ];
  const noTie10 = tb => { for (;;) { const n = tb.int(11, 89); if (n % 5 !== 0) return n; } };
  const noTie100 = (tb, lo, hi) => { for (;;) { const n = tb.int(lo, hi); if (n % 100 !== 0 && n % 100 !== 50) return n; } };
  function estType(op, unit) {
    const r = unit === 10 ? near10 : near100, tol = unit, sign = op === "+";
    return {
      n: 40, min: 20,
      gen: tb => {
        let a, b;
        if (unit === 10) { a = sign ? noTie10(tb) : tb.int(40, 99); b = sign ? noTie10(tb) : tb.int(11, a - 15); if (a % 5 === 0 || b % 5 === 0 || b < 11) return null; }
        else { a = sign ? noTie100(tb, 101, 899) : noTie100(tb, 300, 949); b = sign ? noTie100(tb, 101, 899) : noTie100(tb, 101, a - 150); if (sign && a + b > 899) return null; if (!sign && (a - b < 100)) return null; }
        return { a, b };
      },
      bank: sign ? (unit === 10 ? EST_ADD10_BANK : EST_ADD100_BANK) : (unit === 10 ? EST_SUB10_BANK : EST_SUB100_BANK),
      scene: () => ({ act: "lineup", n: 2 }),
      q: ({ a, b }) => {
        const ra = r(a), rb = r(b), ans = sign ? ra + rb : ra - rb, exact = sign ? a + b : a - b, lo = Math.max(0, exact - tol), hi = exact + tol;
        return { v: { a, b }, nums: [a, b], ans, eq: "about = ?", fact: `${ra} ${sign ? "plus" : "minus"} ${rb} is ${ans}. ${rangeNote(lo, hi)}`,
          hint: `Round each number to the nearest ${unit === 10 ? "ten" : "hundred"}. Then ${sign ? "add" : "take away"}.`, key: `${a}:${b}`, range: [lo, hi] };
      },
      les: ({ a, b }, Q) => [`Round each number to the nearest ${unit === 10 ? "ten" : "hundred"}. Then ${sign ? "add" : "take away"}.`, `${r(a)} ${sign ? "plus" : "minus"} ${r(b)} is ${Q.ans}.`, `${r(a)} ${sign ? "+" : MINUS} ${r(b)} = ${Q.ans}`]
    };
  }
  const BENCH_TYPE = {
    noPic: true, n: 40, min: 20, gen: tb => ({ u: tb.pick([10, 20, 50]), n: tb.int(3, 9) }), bank: EST_BENCH_BANK, scene: () => ({ act: "lineup", n: 2 }),
    q: ({ u, n }) => { const ans = u * n, t = tolPct(ans); return { v: { u, n }, nums: [u, n], ans, eq: `${n} × ${u} = ?`, op: "×", fact: `${n} groups of ${u} is ${ans}. ${rangeNote(ans - t, ans + t)}`,
      hint: `Skip count by ${u}, ${n} times.`, key: `${u}:${n}`, range: [ans - t, ans + t] }; },
    les: ({ u, n }, Q) => [`It says about ${u} in each. So count by ${u}, ${n} times.`, `${n} groups of ${u} is ${Q.ans}.`, `${n} × ${u} = ${Q.ans}`]
  };
  const ESTIMATE2_TYPES = { EA: estType("+", 10), ED: estType("-", 10), EH: estType("+", 100), EQ: estType("-", 100), EB: BENCH_TYPE };
  const G3_ESTIMATE2_KIND = g3Kind({ name: "Cafe: about how many in all (an estimate)", group: "count", needs: ["cafe_estimate.1", "sums.7"], choice: false, pic: true, lessonKind: "estimate" }, ESTIMATE2_TYPES);

  /* ----- the best estimate (cafe_estimate.3: tap): one answer in the reasonable range, the others well outside it; and the closest ten or hundred ----- */
  const BEST_ADD_BANK = [
    ["Mimi has {a} cookies. She bakes {b} more.", "Which is the best estimate of how many she has now?", "cookie:tray"],
    ["The cafe sold {a} cups on Monday and {b} cups on Tuesday.", "Which is the best estimate of how many cups it sold?", "cup:table"],
    ["One jar has {a} candies and another has {b} candies.", "Which is the best estimate of how many candies there are?", "candy:jar"]
  ];
  const BEST_SUB_BANK = [
    ["Mimi has {a} cups. She washes {b} of them.", "Which is the best estimate of how many are left to wash?", "cup:table"],
    ["Mimi baked {a} muffins. The guests ate {b} of them.", "Which is the best estimate of how many are left?", "muffin:tray"],
    ["The jar had {a} candies. Mimi gave away {b} of them.", "Which is the best estimate of how many are left?", "candy:jar"]
  ];
  const CLOSEST_BANK = [
    ["Mimi counts {n} cookies on the shelf.", "Which number is closest to how many there are?", "cookie:tray"],
    ["The jar holds {n} candies.", "Which number is closest to how many there are?", "candy:jar"],
    ["{n} guests came this month.", "Which number is closest to how many came?", "chair:table"]
  ];
  const bestType = sign => ({
    n: 40, min: 20,
    gen: tb => {
      const a = sign ? noTie10(tb) : tb.int(41, 99), b = sign ? noTie10(tb) : tb.int(11, a - 15);
      if (a % 5 === 0 || b % 5 === 0) return null;
      const ans = sign ? near10(a) + near10(b) : near10(a) - near10(b), d1 = ans - tb.int(30, 60), d2 = ans + tb.int(30, 60);
      return d1 < 10 ? null : { a, b, d1, d2 };
    },
    bank: sign ? BEST_ADD_BANK : BEST_SUB_BANK, scene: () => ({ act: "lineup", n: 2 }),
    q: ({ a, b, d1, d2 }) => { const ra = near10(a), rb = near10(b), ans = sign ? ra + rb : ra - rb;
      return { v: { a, b }, nums: [a, b], ans, eq: "best = ?", fact: `${ra} ${sign ? "plus" : "minus"} ${rb} is ${ans}. So ${ans} is a good estimate.`,
        hint: `Round each number to the nearest ten. Then ${sign ? "add" : "take away"}.`, key: `${a}:${b}:${d1}:${d2}`, pool: [d1, d2], want: 2, noNear: true }; },
    les: ({ a, b }, Q) => [`Round each number to the nearest ten. Then ${sign ? "add" : "take away"}.`, `${near10(a)} ${sign ? "plus" : "minus"} ${near10(b)} is ${Q.ans}.`, `${near10(a)} ${sign ? "+" : MINUS} ${near10(b)} = ${Q.ans}`]
  });
  const closestType = unit => ({
    n: 40, min: 20,
    gen: tb => { const n = unit === 10 ? tb.int(11, 99) : tb.int(101, 899); if (unit === 10 ? n % 5 === 0 : (n % 100 === 0 || n % 100 === 50)) return null; return { n }; },
    bank: CLOSEST_BANK, scene: () => ({ act: "lineup", n: 1 }),
    q: ({ n }) => {
      const lower = Math.floor(n / unit) * unit, upper = lower + unit, ans = unit === 10 ? near10(n) : near100(n), other = ans === lower ? upper : lower, far = ans === lower ? lower - unit : upper + unit;
      return { v: { n }, nums: [n], ans, eq: "closest = ?", fact: `${n} is closer to ${ans} than to ${other}.`,
        hint: `The two ${unit === 10 ? "tens" : "hundreds"} on each side are ${lower} and ${upper}. Which one is ${n} nearer to?`, key: `${n}`, pool: [other, far >= 0 ? far : upper + unit], want: 2, noNear: true };
    },
    les: ({ n }, Q) => [`Find the two ${unit === 10 ? "tens" : "hundreds"} on each side of the number. Which is it nearer to?`, `${n} is nearer to ${Q.ans}.`, `${n} is near ${Q.ans}`]
  });
  const ESTIMATE3_TYPES = { ER: bestType(true), EZ: bestType(false), EN: closestType(10), EC: closestType(100) };
  const G3_ESTIMATE3_KIND = g3Kind({ name: "Cafe: the best estimate (tap)", group: "count", needs: ["cafe_estimate.1"], choice: true, pic: true, lessonKind: "bestguess" }, ESTIMATE3_TYPES);

  /* ----- bills and coins to 100 dollars (Canadian: 5, 10, 20, 50 and 100 dollar bills, loonie 1 dollar, toonie 2 dollars) ----- */
  const BILL_NAME = { 5: "five-dollar bill", 10: "ten-dollar bill", 20: "twenty-dollar bill", 50: "fifty-dollar bill", 100: "hundred-dollar bill", 2: "toonie", 1: "loonie" };
  const ITEM_ART = { 5: "bill_5", 10: "bill_10", 20: "bill_20", 50: "bill_50", 100: "bill_100", 2: "toonie", 1: "loonie" };
  const itemWords = (c, d) => pl(c, BILL_NAME[d]);
  const sumOf = items => items.reduce((t, [d, c]) => t + d * c, 0);
  const BILLS2_BANK = [
    ["A customer pays Mimi with {a} and {b}.", "How many dollars is that in all?", "coin@customer"],
    ["Mimi finds {a} and {b} in the tips jar.", "How many dollars did she find?", "coin@mimi"],
    ["Mimi saves {a} and {b} for a new teapot.", "How many dollars has she saved?", "coin@mimi"]
  ];
  const BILLS3_BANK = [
    ["A customer pays Mimi with {a}, {b} and {c}.", "How many dollars is that in all?", "coin@customer"],
    ["Mimi finds {a}, {b} and {c} in a jar.", "How many dollars did she find?", "coin@mimi"],
    ["Mimi saves {a}, {b} and {c} for a teapot.", "How many dollars has she saved?", "coin@mimi"]
  ];
  // items: [[value of one, how many], ...] in the order of the story (a, b, c)
  function moneyType(bank, itemsOf, gen, hint, n) {
    return {
      n: n || 40, min: 8, gen, bank, scene: p => ({ act: "bills", coins: itemsOf(p).map(([d, c]) => [ITEM_ART[d], c]) }),
      q: p => {
        const items = itemsOf(p), ans = sumOf(items), v = {}, nums = [];
        items.forEach(([d, c], i) => { v["abc"[i]] = itemWords(c, d); nums.push(c); });
        return { v, nums, ans, eq: "in all = ?", op: "+", fact: `${items.map(([d, c]) => itemWords(c, d)).join(" and ")} make ${pl(ans, "dollar")}.`, hint, key: JSON.stringify(items) };
      },
      les: (p, Q) => { const items = itemsOf(p), parts = items.map(([d, c]) => d * c);
        return ["Find the value of each kind of bill or coin. Then add them up.", `${parts.join(" plus ")} is ${Q.ans}.`, parts.join(" + ")]; }
    };
  }
  const fitsHundred = items => sumOf(items) <= 100;
  const BILLS_TYPES = {
    BA: moneyType(BILLS2_BANK, p => [[20, p.x], [10, p.y]], tb => { const p = { x: tb.int(1, 4), y: tb.int(1, 4) }; return fitsHundred([[20, p.x], [10, p.y]]) ? p : null; }, "Count the twenties by 20. Then count on the tens by 10."),
    BB: moneyType(BILLS2_BANK, p => [[10, p.x], [5, p.y]], tb => ({ x: tb.int(1, 5), y: tb.int(1, 5) }), "Count the tens by 10. Then count on the fives by 5."),
    BC: moneyType(BILLS2_BANK, p => [[50, 1], [p.s, p.k]], tb => { const s = tb.pick([5, 10, 20]), k = tb.int(1, s === 20 ? 2 : 4); return { s, k }; }, "A fifty-dollar bill is 50 dollars. Count on from 50."),
    BD: moneyType(BILLS3_BANK, p => [[p.b, 1], [2, p.t], [1, p.l]], tb => ({ b: tb.pick([5, 10, 20, 50]), t: tb.int(1, 4), l: tb.int(1, 4) }), "Add the bill. Then count the toonies by 2. Then add the loonies."),
    BE: moneyType(BILLS3_BANK, p => [[20, p.x], [10, p.y], [5, p.z]], tb => { const p = { x: tb.int(1, 3), y: tb.int(1, 3), z: tb.int(1, 3) }; return 20 * p.x + 10 * p.y + 5 * p.z <= 100 ? p : null; }, "Count the twenties by 20, then the tens by 10, then the fives by 5."),
    BF: moneyType(BILLS2_BANK, p => [[2, p.a], [1, p.b]], tb => ({ a: tb.int(3, 9), b: tb.int(2, 9) }), "A toonie is 2 dollars. Count the toonies by 2. Then count on the loonies by 1.")
  };
  const G3_BILLS1_KIND = g3Kind({ name: "Cafe: adding bills and coins to 100 dollars", group: "money_time", needs: ["cafe_money.1", "sums.6"], choice: false, lessonKind: "bills" }, BILLS_TYPES);

  // how many bills (division), and the fewest bills or coins
  const groupedParts = list => { const out = []; [...new Set(list)].forEach(d => { const c = list.filter(x => x === d).length; out.push(c > 1 ? `${c}×${d}` : String(d)); }); const row = out.join(" + "); return row.length > 15 ? out.join(" ") : row; };
  const fewestBills = x => { const out = []; let left = x; [50, 20, 10, 5].forEach(d => { while (left >= d) { out.push(d); left -= d; } }); return out; };
  const HOWMANY_BANKS = {
    5: [["The till holds {x|dollar} in five-dollar bills.", "How many bills are in the till?", "coin:jar"], ["A customer pays {x|dollar} using only five-dollar bills.", "How many bills does the customer use?", "coin@customer"], ["Mimi saves {x|dollar} in five-dollar bills.", "How many bills has she saved?", "coin:jar"]],
    10: [["The till holds {x|dollar} in ten-dollar bills.", "How many bills are in the till?", "coin:jar"], ["A customer pays {x|dollar} using only ten-dollar bills.", "How many bills does the customer use?", "coin@customer"], ["Mimi saves {x|dollar} in ten-dollar bills.", "How many bills has she saved?", "coin:jar"]],
    20: [["The till holds {x|dollar} in twenty-dollar bills.", "How many bills are in the till?", "coin:jar"], ["A customer pays {x|dollar} using only twenty-dollar bills.", "How many bills does the customer use?", "coin@customer"], ["Mimi saves {x|dollar} in twenty-dollar bills.", "How many bills has she saved?", "coin:jar"]],
    2: [["The jar holds {x|dollar} in toonies.", "How many toonies are in the jar?", "coin:jar"], ["A customer pays {x|dollar} using only toonies.", "How many toonies does the customer use?", "coin@customer"], ["Mimi saves {x|dollar} in toonies.", "How many toonies has she saved?", "coin:jar"]]
  };
  const howManyType = (d, ks) => ({
    n: 40, min: 4, gen: tb => ({ k: tb.pick(ks) }), bank: HOWMANY_BANKS[d], scene: () => ({ act: "lineup", n: 1 }),
    q: ({ k }) => ({ v: { x: k * d }, nums: [k * d], ans: k, eq: `${k * d} ÷ ${d} = ?`, op: "÷", fact: `${pl(k, d === 2 ? "toonie" : "bill")} of ${pl(d, "dollar")} make ${pl(k * d, "dollar")}.`,
      hint: `Skip count by ${d} until you reach ${k * d}. How many jumps?`, key: `${d}:${k}` }),
    les: ({ k }, Q) => [`Each ${d === 2 ? "toonie" : "bill"} is ${pl(d, "dollar")}. Skip count by ${d} until you reach ${k * d}.`, `You skip count ${pl(k, "time")}.`, `${k} × ${d} = ${k * d}`]
  });
  const FEWEST_BILLS_BANK = [
    ["Mimi pays {x|dollar} with bills of 5, 10, 20 and 50 dollars. She uses as few as she can.", "How many bills does she use?", "coin@mimi"],
    ["A customer owes {x|dollar}. He has many bills of 5, 10, 20 and 50 dollars. He uses the fewest he can.", "How many bills does he use?", "coin@customer"],
    ["Mimi's friend pays {x|dollar} with bills of 5, 10, 20 and 50 dollars. She uses as few as she can.", "How many bills does she use?", "coin@friend"]
  ];
  const FEWEST_COINS_BANK = [
    ["Mimi pays {x|dollar} using only toonies and loonies. She uses as few coins as she can.", "How many coins does she use?", "coin@mimi"],
    ["A boy pays {x|dollar} for his tea with toonies and loonies. He uses the fewest coins he can.", "How many coins does he use?", "coin@customer"],
    ["Mimi's friend pays {x|dollar} with toonies and loonies. She uses as few coins as she can.", "How many coins does she use?", "coin@friend"]
  ];
  const HOWMANY_TYPES = {
    HA: howManyType(5, range(3, 20)), HB: howManyType(10, range(2, 10)), HC: howManyType(20, range(2, 5)), HD: howManyType(2, range(3, 15)),
    HE: {
      n: 40, min: 12, gen: tb => { const x = 5 * tb.int(3, 19); return [5, 10, 20, 50].includes(x) ? null : { x }; }, bank: FEWEST_BILLS_BANK, scene: () => ({ act: "lineup", n: 1 }),
      q: ({ x }) => { const f = fewestBills(x); return { v: { x }, nums: [x, 5, 10, 20, 50], ans: f.length, eq: "bills = ?", op: "", fact: `${f.join(" plus ")} makes ${pl(x, "dollar")}. That is ${pl(f.length, "bill")}.`,
        hint: "Use the biggest bill that fits first. Then the next biggest. Keep going until you reach the amount.", key: `${x}` }; },
      les: ({ x }, Q) => ["Use the biggest bill that fits first. Then use the biggest that fits in what is left.", `${fewestBills(x).join(" plus ")} is ${x}. That is ${pl(Q.ans, "bill")}.`, groupedParts(fewestBills(x))]
    },
    HF: {
      n: 40, min: 12, gen: tb => ({ x: tb.int(3, 19) }), bank: FEWEST_COINS_BANK, scene: () => ({ act: "lineup", n: 1 }),
      q: ({ x }) => { const t = Math.floor(x / 2), l = x % 2; return { v: { x }, nums: [x], ans: t + l, eq: "coins = ?", op: "", fact: `${pl(t, "toonie")}${l ? " and 1 loonie" : ""} make ${pl(x, "dollar")}. That is ${pl(t + l, "coin")}.`,
        hint: "A toonie is 2 dollars. Use as many toonies as you can. A loonie fills in what is left.", key: `${x}` }; },
      les: ({ x }, Q) => ["A toonie is 2 dollars. Use as many toonies as you can. Use a loonie for what is left.", `${pl(Math.floor(x / 2), "toonie")}${x % 2 ? " and 1 loonie" : ""}. That is ${pl(Q.ans, "coin")}.`, `${Math.floor(x / 2)} × 2${x % 2 ? " + 1" : ""} = ${x}`]
    }
  };
  const G3_BILLS2_KIND = g3Kind({ name: "Cafe: how many bills, how few bills", group: "money_time", needs: ["cafe_bills.1"], choice: false, lessonKind: "billcount" }, HOWMANY_TYPES);

  // paying, change and swapping bills
  const PAY_BANK = (g) => [
    [`A cake costs {p|dollar}. The customer pays with a ${g} dollar bill.`, "How much change does Mimi give back?", "cake@customer"],
    [`Lunch costs {p|dollar}. A man gives Mimi a ${g} dollar bill.`, "How many dollars of change does he get?", "sandwich@customer"],
    [`A box of cupcakes costs {p|dollar}. A girl pays with a ${g} dollar bill.`, "How much change does she get?", "cupcake@customer"]
  ];
  // counting up for change: through the next ten first only when there is a ten to stop at on the way
  const payHint = (p, g) => p % 10 === 0 ? `Count up from ${p} to ${g} by tens.` : Math.ceil(p / 10) * 10 === g ? `Count up from ${p} to ${g}. It is only a few steps.` : `Count up from ${p} to ${g}. First to the next ten, then the rest.`;
  const payType = g => ({
    n: 40, min: 20, gen: tb => ({ p: g === 50 ? tb.int(11, 49) : tb.int(21, 99) }), bank: PAY_BANK(g), scene: ({ p }) => ({ act: "change", price: p, paid: g }),
    q: ({ p }) => ({ v: { p }, nums: [p, g], ans: g - p, eq: `${g} ${MINUS} ${p} = ?`, op: "-", fact: `The change from ${g} dollars for ${pl(p, "dollar")} is ${pl(g - p, "dollar")}.`, hint: payHint(p, g), key: `${g}-${p}` }),
    les: ({ p }, Q) => [`Change is what is left. So it is ${g} minus ${p}. Count up from ${p} to ${g}.`, `From ${p} up to ${g} is ${pl(Q.ans, "dollar")}.`, `${p} + ${Q.ans} = ${g}`]
  });
  const TWOBILL_BANK = [
    ["A box of treats costs {p|dollar}. Mimi's friend pays with {a} and {b}.", "How much change does the friend get?", "cupcake@friend"],
    ["Tea and a roll cost {p|dollar}. A man pays with {a} and {b}.", "How much change does he get?", "tea@customer"],
    ["A pie costs {p|dollar}. A lady gives Mimi {a} and {b}.", "How much change does she get?", "pie@customer"]
  ];
  const TWO_PAIRS = [[20, 10], [20, 5], [10, 5], [50, 20], [50, 10], [50, 5]];
  const SWAP_BANK = [
    ["A customer asks Mimi to change {big} into {small}.", "How many bills does Mimi give?", "coin@customer"],
    ["Mimi trades {big} for {small}.", "How many bills does she get?", "coin@mimi"],
    ["Mimi's friend swaps {big} for {small}.", "How many bills does her friend get?", "coin@friend"]
  ];
  const SWAPS = [[10, 5], [20, 5], [20, 10], [50, 5], [50, 10], [100, 5], [100, 10], [100, 20], [100, 50]];
  const MORE_NEED_BANK = [
    ["Mimi has {a|dollar}. A new teapot costs {c|dollar}.", "How many more dollars does she need?", "coin@mimi"],
    ["Mimi has saved {a|dollar} for a cake stand. The stand costs {c|dollar}.", "How many more dollars does she need to save?", "coin@mimi"],
    ["A girl has {a|dollar}. A box of cookies costs {c|dollar}.", "How many more dollars does she need?", "coin@customer"]
  ];
  const ONE_BILL_BANK = [
    ["A box of cupcakes costs {p|dollar}. Mimi's friend wants to pay with one bill.", "Which is the smallest bill that is enough? Type its number.", "cupcake@friend"],
    ["A cake costs {p|dollar}. A customer will pay with one bill.", "Which is the smallest bill that is enough? Type its number.", "cake@customer"],
    ["Lunch costs {p|dollar}. A man pays with only one bill.", "Which is the smallest bill that is enough? Type its number.", "sandwich@customer"]
  ];
  const TWO_PRICES_BANK = [
    ["A cake costs {a|dollar} and tea costs {b|dollar}.", "How many dollars do they cost in all?", "cake@customer"],
    ["Mimi buys a pie for {a|dollar} and a roll for {b|dollar}.", "How many dollars does she spend?", "pie@mimi"],
    ["A boy buys a muffin for {a|dollar} and cocoa for {b|dollar}.", "How many dollars does he pay in all?", "muffin@customer"]
  ];
  const SPEND_BANK = [
    ["Mimi has {a|dollar}. She spends {b|dollar} on flowers.", "How many dollars does she have left?", "flower@mimi"],
    ["A girl has {a|dollar}. She buys a muffin for {b|dollar}.", "How many dollars does she have left?", "muffin@customer"],
    ["Mimi's till has {a|dollar}. She pays {b|dollar} for flour.", "How many dollars are left in the till?", "coin@mimi"]
  ];
  const smallestBill = p => [5, 10, 20, 50, 100].find(b => b >= p);
  const PAY_TYPES = {
    PC: payType(50), PH: payType(100),
    PM: {
      n: 40, min: 15, gen: tb => { const [x, y] = tb.pick(TWO_PAIRS), p = tb.int(Math.max(x, y) + 1, x + y - 1); return { x, y, p }; }, bank: TWOBILL_BANK,
      scene: ({ x, y }) => ({ act: "bills", coins: [[ITEM_ART[x], 1], [ITEM_ART[y], 1]] }),
      q: ({ x, y, p }) => ({ v: { p, a: "a " + BILL_NAME[x], b: "a " + BILL_NAME[y] }, nums: [p], ans: x + y - p, eq: `${x + y} ${MINUS} ${p} = ?`, op: "-",
        fact: `${x} plus ${y} is ${x + y} dollars. The change from ${x + y} dollars for ${pl(p, "dollar")} is ${pl(x + y - p, "dollar")}.`, hint: `Add the two bills first. Then count up from ${p} to the total.`, key: `${x}:${y}:${p}` }),
      les: ({ x, y, p }, Q) => ["First add the two bills. Then find the change from that total.", `${x} plus ${y} is ${x + y}. Count up from ${p} to ${x + y}.`, `${x} + ${y} = ${x + y}`]
    },
    PW: {
      n: 40, min: 8, gen: tb => { const [D, d] = tb.pick(SWAPS); return { D, d }; }, bank: SWAP_BANK, scene: () => ({ act: "lineup", n: 1 }),
      q: ({ D, d }) => ({ v: { big: "a " + BILL_NAME[D], small: BILL_NAME[d] + "s" }, nums: [], ans: D / d, eq: `${D} ÷ ${d} = ?`, op: "÷",
        fact: `${pl(D / d, BILL_NAME[d])} make the same as a ${BILL_NAME[D]}. That is ${pl(D, "dollar")}.`, hint: `How many ${d}s fit in ${D}? Skip count by ${d} to ${D}.`, key: `${D}:${d}` }),
      les: ({ D, d }, Q) => [`The two ways make the same amount, ${pl(D, "dollar")}. Skip count by ${d} until you reach ${D}.`, `You skip count ${pl(D / d, "time")}.`, `${D / d} × ${d} = ${D}`]
    },
    PN: {
      n: 40, min: 20, gen: tb => { const a = tb.int(11, 89), c = a + tb.int(5, Math.min(40, 100 - a)); return c > 100 ? null : { a, c }; }, bank: MORE_NEED_BANK, scene: () => ({ act: "lineup", n: 1 }),
      q: ({ a, c }) => ({ v: { a, c }, nums: [a, c], ans: c - a, eq: `${c} ${MINUS} ${a} = ?`, op: "-", fact: `${c} minus ${a} is ${c - a}. She needs ${pl(c - a, "more dollar")}.`,
        hint: `Count up from ${a} to ${c}.`, key: `${a}:${c}` }),
      les: ({ a, c }, Q) => [`We want to know how much more. So it is ${c} minus ${a}. Count up from ${a} to ${c}.`, `From ${a} up to ${c} is ${pl(Q.ans, "dollar")}.`, `${a} + ${Q.ans} = ${c}`]
    },
    PX: {
      n: 40, min: 20, gen: tb => ({ p: tb.int(3, 99) }), bank: ONE_BILL_BANK, scene: ({ p }) => ({ act: "lineup", n: 1 }),
      q: ({ p }) => ({ v: { p }, nums: [p], ans: smallestBill(p), eq: "bill = ?", op: "", fact: `The ${smallestBill(p)} dollar bill is enough for ${pl(p, "dollar")}.${smallestBill(p) === 5 ? "" : " The bill before it is too small."}`,
        hint: "The bills are 5, 10, 20, 50 and 100 dollars. Find the smallest one that is at least as much as the price.", key: `${p}` }),
      les: ({ p }, Q) => ["The bills are 5, 10, 20, 50 and 100 dollars. Look for the smallest one that is enough.", `The ${Q.ans} dollar bill is the smallest one that is enough for ${pl(p, "dollar")}.`, `${p} fits in ${Q.ans}`]
    },
    PS: {
      n: 40, min: 20, gen: tb => { const a = tb.int(10, 60), b = tb.int(10, 60); return a + b > 100 ? null : { a, b }; }, bank: TWO_PRICES_BANK, scene: () => ({ act: "lineup", n: 2 }),
      q: ({ a, b }) => ({ v: { a, b }, nums: [a, b], ans: a + b, eq: `${a} + ${b} = ?`, op: "+", fact: `${a} plus ${b} is ${a + b} dollars.`, hint: "Add the tens first. Then add the ones.", key: `${a}:${b}` }),
      les: ({ a, b }, Q) => ["Add the two prices. Add the tens first, then the ones.", `${a} plus ${b} is ${Q.ans}.`, `${a} + ${b} = ${Q.ans}`]
    },
    PL: {
      n: 40, min: 20, gen: tb => { const a = tb.int(30, 100), b = tb.int(10, a - 5); return { a, b }; }, bank: SPEND_BANK, scene: () => ({ act: "lineup", n: 1 }),
      q: ({ a, b }) => ({ v: { a, b }, nums: [a, b], ans: a - b, eq: `${a} ${MINUS} ${b} = ?`, op: "-", fact: `${a} minus ${b} is ${a - b} dollars.`, hint: `Count up from ${b} to ${a}. Or take away the tens first.`, key: `${a}:${b}` }),
      les: ({ a, b }, Q) => ["She spends some, so we take it away.", `${a} minus ${b} is ${Q.ans}.`, `${a} ${MINUS} ${b} = ${Q.ans}`]
    }
  };
  const G3_BILLS3_KIND = g3Kind({ name: "Cafe: paying, change and swapping bills", group: "money_time", needs: ["cafe_bills.1", "cafe_money.2"], choice: false, lessonKind: "paying" }, PAY_TYPES);

  /* =====================================================================================
     Round of 23 Oct 2026, round 2 (Grade 3 gaps, round 2): measurement in standard units, 3D objects, data and graphs, simple chance, fractions beyond halves and quarters.
     Fifteen new skills for Marie (cafe). They follow the round of 23 Oct (g3Kind): a story kind with cafe wording, a skill-map entry with needs, a hint, a lesson,
     number sets from a fixed seed. What is new:
       Q.figure     the picture the question is about (a ruler, a jug, a bar graph, a row of pictures, tally marks, a spinner, a jar, a solid, a cake in parts, a number
                    line of fractions) as plain data. game/figure.js draws it UNDER the story, not in the scene strip (the strip can step aside on a small screen). The scene
                    stays a calm "lineup" with no numbers. A figure never prints a value on a bar and never prints the answer as a caption.
       word buttons the answer is a word, a fraction, a solid or a small figure: q() returns words: [...] and ans = the place of the right one (1, 2, 3), g3Kind decorate
                    sets Q.picOpts / Q.pics / Q.optSay / Q.tapSay. ordered: true keeps the buttons in the order of the list (the chance words).
       Q.slips      { class: [given answers] } a wrong answer that shows a known mix-up (MissStudy: unit_size, other_part, scale_slip, bigger_parts, one_group).
       helpFig      { fig, help } the second hint: the same figure with a guide (a line across, cells to count, groups tinted).
     ===================================================================================== */
  const cap1 = s => s.charAt(0).toUpperCase() + s.slice(1);
  const NUMW = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
  const wordQ = (labels, right) => ({ words: labels, ans: right + 1, pool: labels.map((_, i) => i + 1).filter(i => i !== right + 1), want: labels.length - 1 });
  const lineup = (n, holder) => () => ({ act: "lineup", n, holder });

  /* ----- measurement: units, ruler, jug, comparing, adding (cafe_measure.1 to .4) ----- */
  const UNIT = { cm: ["centimetre", "centimetres"], m: ["metre", "metres"], g: ["gram", "grams"], kg: ["kilogram", "kilograms"], ml: ["millilitre", "millilitres"], L: ["litre", "litres"] };
  const FAMILY = { cm: "len", m: "len", g: "mass", kg: "mass", ml: "cap", L: "cap" };
  const FAM_UNITS = { len: ["cm", "m"], mass: ["g", "kg"], cap: ["ml", "L"] };
  const uw = (n, u) => `${n} ${n === 1 ? UNIT[u][0] : UNIT[u][1]}`;
  const BIG_UNIT = { m: 1, kg: 1, L: 1 };
  const ITEMS = {
    cm: ["the teaspoon", "the straw", "a cookie", "a pencil", "the menu card", "a tea bag"],
    m: ["the cafe door", "the long counter", "the cafe floor", "the garden path", "the front window", "the cafe wall"],
    g: ["a cookie", "a tea bag", "a strawberry", "a spoon of sugar", "a grape", "a slice of bread"],
    kg: ["a bag of flour", "a sack of sugar", "a box of lemons", "a big pumpkin", "a bag of rice", "a crate of apples"],
    ml: ["a spoon of honey", "a small cup of cream", "a cup of tea", "a glass of juice", "a spoon of milk", "a cup of cocoa"],
    L: ["the big soup pot", "a jug of lemonade", "a bucket of water", "the tea urn", "the big milk can", "a tank of water"]
  };
  const HOW = { len: x => `how long ${x} is`, mass: x => `how heavy ${x} is`, cap: x => `how much ${x} holds` };
  const UNIT_BANK = [
    ["Mimi wants to know {how}.", "Which unit is best? Tap it.", "cup:table"],
    ["A customer asks {how}.", "Which unit should Mimi use? Tap it.", "cookie:tray"],
    ["The cafe needs to know {how}.", "Which unit fits best? Tap it.", "tea_bag:box"]
  ];
  const SIZE_HINT_TXT = { len: "A small thing is measured in centimetres. A big thing is measured in metres.", mass: "A light thing is measured in grams. A heavy thing is measured in kilograms.", cap: "A small amount is measured in millilitres. A big amount is measured in litres." };
  const FAM_HINT_TXT = "Length is centimetres or metres. Mass is grams or kilograms. Capacity is millilitres or litres.";
  const FAM_NAME = { len: "length", mass: "mass", cap: "capacity" };
  const unitLabel = u => ({ word: u, say: UNIT[u][1] });
  function unitType(kind) {
    return {
      n: 80, min: 12,
      gen: tb => {
        const u = kind === "fam" ? tb.pick(Object.keys(UNIT)) : tb.pick(FAM_UNITS[kind]), k = tb.int(0, ITEMS[u].length - 1);
        const otherFams = Object.keys(FAM_UNITS).filter(f => f !== FAMILY[u]);
        if (kind === "fam") return { u, k, a: tb.pick(FAM_UNITS[otherFams[0]]), b: tb.pick(FAM_UNITS[otherFams[1]]) };
        return { u, k, s: FAM_UNITS[kind].find(x => x !== u), o: tb.pick(FAM_UNITS[tb.pick(otherFams)]) };
      },
      bank: UNIT_BANK, scene: lineup(1, "jar"),
      q: ({ u, k, a, b, s, o }) => {
        const item = ITEMS[u][k], fam = FAMILY[u], labels = kind === "fam" ? [u, a, b] : [u, s, o];
        return Object.assign(wordQ(labels.map(unitLabel), 0), { v: { how: HOW[fam](item) }, nums: [], eq: "unit = ?",
          fact: kind === "fam" ? `${cap1(UNIT[u][1])} are the unit for this.` : `${cap1(item)} is ${BIG_UNIT[u] ? "big" : "small"}, so ${UNIT[u][1]} fit best.`,
          hint: kind === "fam" ? FAM_HINT_TXT : SIZE_HINT_TXT[kind], key: `${u}:${k}`, slips: kind === "fam" ? undefined : { unit_size: [2] } });
      },
      les: ({ u, k }) => kind === "fam" ? [FAM_HINT_TXT, `This is about ${FAM_NAME[FAMILY[u]]}. So the unit is ${UNIT[u][1]}.`, `${FAM_NAME[FAMILY[u]]} : ${u}`]
        : [SIZE_HINT_TXT[kind], `${cap1(ITEMS[u][k])} is ${BIG_UNIT[u] ? "big" : "small"}. So the unit is ${UNIT[u][1]}.`, `${BIG_UNIT[u] ? "big" : "small"} : ${u}`]
    };
  }
  const G3_UNITS_KIND = g3Kind({ name: "Cafe: which unit to measure with", group: "shapes", needs: ["sums.4"], choice: true, lessonKind: "units" },
    { UF: unitType("fam"), UL: unitType("len"), UM: unitType("mass"), UC: unitType("cap") });

  // reading a ruler and a jug: the figure is the question. The ruler is numbered at 0, 5, 10 and 15 only; the jug at 500 and 1000 only.
  const RULER_THINGS = ["ribbon", "straw", "spoon", "pencil", "biscuit", "candle", "cake knife", "string"];
  const RULER_BANK = [
    ["Mimi lays a {x} on a ruler. One end is at zero.", "How many centimetres long is it? Type the number.", "cake_box:table"],
    ["A {x} lies along the ruler. It starts at zero.", "How long is it in centimetres?", "cookie:tray"],
    ["Mimi measures a {x} with a ruler. She starts at zero.", "How many centimetres is the {x}?", "cup:table"]
  ];
  const RULER2_BANK = [
    ["A {x} and a {y} lie on a ruler. Both start at zero.", "How many centimetres longer is the {x} than the {y}?", "cake_box:table"],
    ["Mimi lays a {x} and a {y} on a ruler. They start at the same place.", "How much longer is the {x} than the {y}? Answer in centimetres.", "cookie:tray"],
    ["Look at the ruler. It has a {x} and a {y} on it.", "How many centimetres longer is the {x}?", "cup:table"]
  ];
  const RULER_COLORS = ["#f4a0b8", "#8ccf9a", "#f1cb55", "#9fc6ee"];
  const rulerFig = bars => ({ t: "ruler", max: 15, bars: bars.map(([name, len], i) => ({ name, len, color: RULER_COLORS[i % RULER_COLORS.length] })) });
  const JUG_LIQUIDS = ["milk", "juice", "water", "lemonade", "cream", "tea"];
  const JUG_BANK = [
    ["Mimi pours {x} into a jug. The jug has lines every 100 millilitres.", "How many millilitres are in the jug? Type the number.", "cup:table"],
    ["A jug holds some {x}. Each line on the jug is 100 millilitres.", "How many millilitres of {x} are in it?", "cup:table"],
    ["Mimi looks at the {x} in the jug. The lines go up by 100 millilitres.", "How much {x} is in the jug, in millilitres?", "cup:tray"]
  ];
  const JUG2_BANK = [
    ["Mimi has two jugs. One has {x}. The other has {y}.", "How many millilitres more {m} is there than {l}?", "cup:table"],
    ["Look at the two jugs. One holds {x} and one holds {y}.", "How much more {m} is there than {l}? Answer in millilitres.", "cup:table"],
    ["Mimi pours {x} into one jug and {y} into another.", "How many millilitres more {m} than {l}?", "cup:tray"]
  ];
  const G3_READ_KIND = g3Kind({ name: "Cafe: reading a ruler and a jug", group: "shapes", needs: ["cafe_measure.1", "sums.5"], choice: false, lessonKind: "readscale" }, {
    RL: {
      n: 60, min: 12, gen: tb => ({ x: tb.pick(RULER_THINGS), len: tb.int(2, 14) }), bank: RULER_BANK, scene: lineup(1, "tray"),
      q: ({ x, len }) => ({ v: { x }, nums: [], ans: len, eq: "length = ?", fact: `The ${x} ends at the ${len} mark, so it is ${uw(len, "cm")} long.`, hint: "Start at zero. Count each centimetre up to the end of the object.",
        key: `${x}:${len}`, figure: rulerFig([[x, len]]), helpFig: { fig: rulerFig([[x, len]]), help: true } }),
      les: ({ x, len }) => ["Put the zero mark at the start. Count each centimetre along to the end.", `The ${x} is ${uw(len, "cm")} long.`, `0 to ${len}`]
    },
    RD: {
      n: 60, min: 12, gen: tb => { const a = tb.int(4, 14), b = tb.int(2, a - 1), i = tb.int(0, RULER_THINGS.length - 1), j = (i + tb.int(1, RULER_THINGS.length - 1)) % RULER_THINGS.length; return { a, b, x: RULER_THINGS[i], y: RULER_THINGS[j] }; },
      bank: RULER2_BANK, scene: lineup(2, "tray"),
      q: ({ a, b, x, y }) => ({ v: { x, y }, nums: [], ans: a - b, eq: "longer by = ?", fact: `The ${x} is ${uw(a, "cm")} and the ${y} is ${uw(b, "cm")}. ${a} minus ${b} is ${a - b}.`,
        hint: "Read how long each one is. Then take the short one away from the long one.", key: `${x}:${y}:${a}:${b}`, figure: rulerFig([[x, a], [y, b]]), helpFig: { fig: rulerFig([[x, a], [y, b]]), help: true } }),
      les: ({ a, b, x }, Q) => ["Read the length of each one. The difference is the long one take away the short one.", `${a} minus ${b} is ${Q.ans}. The ${x} is ${uw(Q.ans, "cm")} longer.`, `${a} ${MINUS} ${b}`]
    },
    JL: {
      n: 60, min: 8, gen: tb => ({ x: tb.pick(JUG_LIQUIDS), lv: tb.int(1, 9) * 100 }), bank: JUG_BANK, scene: lineup(1, "jug"),
      q: ({ x, lv }) => ({ v: { x }, nums: [], ans: lv, eq: "millilitres = ?", fact: `The ${x} reaches the ${lv} line. There are ${uw(lv, "ml")}.`, hint: "Find the line where the top of the liquid is. The lines go up by 100 from the bottom.",
        key: `${x}:${lv}`, figure: { t: "jug", max: 1000, levels: [lv] }, helpFig: { fig: { t: "jug", max: 1000, levels: [lv] }, help: true } }),
      les: ({ lv }) => ["Look where the top of the liquid is. Count the lines up from the bottom. Each line is 100.", `${pl(lv / 100, "line")} ${lv === 100 ? "is" : "are"} ${lv} millilitres.`, `${lv / 100} × 100`]
    },
    JD: {
      n: 60, min: 8, gen: tb => { const i = tb.int(0, JUG_LIQUIDS.length - 1), j = (i + tb.int(1, JUG_LIQUIDS.length - 1)) % JUG_LIQUIDS.length, a = tb.int(1, 9), b = tb.int(1, 9); return a === b ? null : { x: JUG_LIQUIDS[i], y: JUG_LIQUIDS[j], a: a * 100, b: b * 100 }; },
      bank: JUG2_BANK, scene: lineup(2, "jug"),
      q: ({ x, y, a, b }) => { const m = a > b ? x : y, l = a > b ? y : x, d = Math.abs(a - b), fig = { t: "jug", max: 1000, levels: [a, b], names: [x, y] };
        return { v: { x, y, m, l }, nums: [], ans: d, eq: "more = ?", fact: `${Math.max(a, b)} minus ${Math.min(a, b)} is ${d}. There is ${uw(d, "ml")} more ${m}.`,
          hint: "Read the level of each jug. Then take the smaller away from the bigger.", key: `${x}:${y}:${a}:${b}`, figure: fig, helpFig: { fig, help: true } }; },
      les: ({ a, b }, Q) => ["Read the level of each jug. The difference is the bigger take away the smaller.", `${Math.max(a, b)} minus ${Math.min(a, b)} is ${Q.ans}.`, `${Math.max(a, b)} ${MINUS} ${Math.min(a, b)}`]
    }
  });

  // comparing and adding in ONE unit (never a change of unit). The unit is in the number set (p.u): the story says "35 centimetres".
  const MEAS = {
    len: { pairs: { cm: [["ribbon", "string"], ["straw", "stirrer"], ["pencil", "spoon"], ["menu card", "napkin"]], m: [["rope", "garden hose"], ["tablecloth", "carpet"], ["counter", "shelf"], ["fence", "path"]] },
      range: { cm: [8, 60, 1], m: [2, 20, 1] }, more: "longer", less: "shorter" },
    mass: { pairs: { g: [["bag of nuts", "bag of raisins"], ["bar of chocolate", "block of butter"], ["jar of jam", "jar of honey"], ["pie", "cake"]], kg: [["bag of flour", "bag of sugar"], ["pumpkin", "melon"], ["box of lemons", "box of apples"], ["bag of rice", "bag of oats"]] },
      range: { g: [100, 900, 10], kg: [2, 20, 1] }, more: "heavier", less: "lighter" },
    cap: { pairs: { ml: [["cup of tea", "cup of cocoa"], ["glass of juice", "glass of milk"], ["bowl of soup", "bowl of stew"], ["jug of cream", "jug of syrup"]], L: [["bucket", "tub"], ["soup pot", "stew pot"], ["milk can", "juice can"], ["water tank", "big jug"]] },
      range: { ml: [100, 800, 50], L: [2, 30, 1] }, more: "holds more", less: "holds less" }
  };
  const SUM_RANGE = { cm: [10, 58, 1], m: [3, 19, 1], g: [100, 480, 10], kg: [2, 19, 1], ml: [100, 450, 50], L: [2, 19, 1] };
  const mnum = (tb, [lo, hi, st]) => lo + st * tb.int(0, Math.floor((hi - lo) / st));
  function cmpType(fam, wantMore) {
    const M = MEAS[fam], word = wantMore ? M.more : M.less, askTail = fam === "cap" ? word : "is " + word;
    return {
      n: 60, min: 20,
      gen: tb => { const u = tb.pick(Object.keys(M.range)), a = mnum(tb, M.range[u]), b = mnum(tb, M.range[u]), k = tb.int(0, M.pairs[u].length - 1); return a === b ? null : { u, a, b, k }; },
      bank: [
        ["The {x} is {ua}. The {y} is {ub}.", `Which one ${askTail}? Tap that number.`, "cookie:tray"],
        ["Mimi checks two things. The {x} is {ua}. The {y} is {ub}.", `Which one ${askTail}? Tap that number.`, "cup:table"],
        ["A customer asks about the {x} and the {y}. The {x} is {ua}. The {y} is {ub}.", `Which one ${askTail}? Tap that number.`, "muffin:tray"]
      ],
      scene: lineup(2, "table"),
      q: ({ u, a, b, k }) => { const [x, y] = M.pairs[u][k], ans = wantMore ? Math.max(a, b) : Math.min(a, b), other = wantMore ? Math.min(a, b) : Math.max(a, b);
        return { v: { x, y, ua: uw(a, u), ub: uw(b, u) }, nums: [a, b], ans, eq: (wantMore ? "most" : "least") + " = ?", fact: `${ans} ${UNIT[u][1]} is ${wantMore ? "more" : "less"} than ${other}.`,
          hint: `Both are in ${UNIT[u][1]}. The ${wantMore ? "bigger" : "smaller"} number is the one that ${askTail}.`, key: `${u}:${a}:${b}:${k}`, pool: [other], want: 1, opposite: other, noNear: true }; },
      les: ({ u }, Q) => [`Both numbers are in ${UNIT[u][1]}, so we can compare them. We want the ${wantMore ? "bigger" : "smaller"} number.`, `${Q.ans} is the ${wantMore ? "bigger" : "smaller"} one.`, `${Q.nums[0]} or ${Q.nums[1]}`]
    };
  }
  const G3_MEASURE_CMP_KIND = g3Kind({ name: "Cafe: which is longer, heavier or holds more", group: "shapes", needs: ["cafe_measure.1", "cafe_compare.1"], choice: true, pic: true, lessonKind: "compare3" }, {
    ML: cmpType("len", true), MS: cmpType("len", false), MH: cmpType("mass", true), MG: cmpType("mass", false), MC: cmpType("cap", true), MD: cmpType("cap", false)
  });
  function sumType(fam, add) {
    const M = MEAS[fam], ASK = {
      len: add ? "How many {up} long are they if you put them end to end?" : "How many {up} longer is the {x}?",
      mass: add ? "How many {up} do they weigh together?" : "How many {up} heavier is the {x}?",
      cap: add ? "How many {up} do they hold together?" : "How many {up} more does the {x} hold?"
    }[fam], rows = ["cookie:tray", "cup:table", "muffin:tray"];
    return {
      n: 60, min: 20,
      gen: tb => { const u = tb.pick(Object.keys(M.range)), a = mnum(tb, SUM_RANGE[u]), b = mnum(tb, SUM_RANGE[u]), k = tb.int(0, M.pairs[u].length - 1); return (add ? a !== b : a > b) ? { u, a, b, k } : null; },
      bank: [["The {x} is {ua}. The {y} is {ub}.", ASK, rows[0]], ["Mimi checks the {x} and the {y}. The {x} is {ua}. The {y} is {ub}.", ASK, rows[1]], ["A customer asks about the {x} and the {y}. The {x} is {ua}. The {y} is {ub}.", ASK, rows[2]]],
      scene: lineup(2, "table"),
      q: ({ u, a, b, k }) => { const [x, y] = M.pairs[u][k], ans = add ? a + b : a - b;
        return { v: { x, y, ua: uw(a, u), ub: uw(b, u), up: UNIT[u][1] }, nums: [a, b], ans, eq: add ? "in all = ?" : "more = ?", op: add ? "+" : "-",
          fact: add ? `${a} plus ${b} is ${ans}. That is ${uw(ans, u)}.` : `${a} minus ${b} is ${ans}. That is ${uw(ans, u)} more.`,
          hint: add ? "Put the two numbers together. Add them." : "Take the smaller number away from the bigger number.", key: `${u}:${a}:${b}:${k}` }; },
      les: ({ u, a, b }, Q) => add ? ["We put the two together, so we add. The unit stays the same.", `${a} plus ${b} is ${uw(Q.ans, u)}.`, `${a} + ${b}`]
        : ["We want how much more, so we take away. The unit stays the same.", `${a} minus ${b} is ${uw(Q.ans, u)}.`, `${a} ${MINUS} ${b}`]
    };
  }
  const G3_MEASURE_SUM_KIND = g3Kind({ name: "Cafe: adding and comparing lengths, masses and capacities", group: "shapes", needs: ["cafe_measure.3", "sums.7"], choice: false, pic: true, lessonKind: "units_sum" }, {
    AL: sumType("len", true), BL: sumType("len", false), AM: sumType("mass", true), BM: sumType("mass", false), AC: sumType("cap", true), BC: sumType("cap", false)
  });

  /* ----- 3D objects (cafe_solid.1 and .2): names, then faces, edges and corners of solids with flat sides only ----- */
  const SOLID_NAME = { cube: "cube", rect_prism: "rectangular prism", cylinder: "cylinder", cone: "cone", sphere: "sphere", sq_pyramid: "square pyramid", tri_prism: "triangular prism" };
  const SOLID_IDS = Object.keys(SOLID_NAME);
  const SOLID_CLUE = {
    cube: "It has six faces. All of them are squares.", rect_prism: "It looks like a cake box. All six faces are rectangles.", cylinder: "It has two flat circles and one curved side.",
    cone: "It has one flat circle and one pointed top.", sphere: "It is round all over. It has no flat faces.", sq_pyramid: "It has a square bottom. Four triangles meet at a point on top.",
    tri_prism: "It has two triangle ends and three rectangle sides."
  };
  const SOLID_THING = {
    cube: ["a sugar cube", "a dice", "a cube of ice"], rect_prism: ["a cake box", "a box of tea bags", "a loaf of bread"], cylinder: ["a tin of cocoa", "a tall candle", "a tin of tea"],
    cone: ["an ice cream cone", "a party hat", "a sugar cone"], sphere: ["an orange", "a ball of ice cream", "a gumball"]
  };
  const SHORT = { cube: "cube", rect_prism: "rect prism", cylinder: "cylinder", cone: "cone", sphere: "sphere", sq_pyramid: "sq pyramid", tri_prism: "tri prism" };
  const solidLabel = s => ({ word: SOLID_NAME[s], say: SOLID_NAME[s] });
  const solidPick = s => ({ solid: s, say: "This one.", name: SOLID_NAME[s] });
  const threeSolids = (tb, s, pool) => { const o = tb.shuffle(pool.filter(x => x !== s)); return [o[0], o[1]]; };
  const NAME_BANK = [
    ["Mimi sees this shape on the shelf.", "What is it called? Tap its name.", "cake_box:table"],
    ["Mimi finds this shape in the cafe.", "Which solid is it? Tap its name.", "cup:table"],
    ["A customer holds up this shape.", "What is the name of this solid? Tap it.", "cookie:tray"]
  ];
  const PICK_BANK = [
    ["Mimi has three shapes on the shelf.", "Which one is the {n}? Tap it.", "cake_box:table"],
    ["Three solids sit on the counter.", "Which one is the {n}? Tap it.", "cup:table"],
    ["Mimi lines up three shapes.", "Tap the {n}.", "cookie:tray"]
  ];
  const CLUE_BANK = [
    ["Mimi is thinking of a solid. {c}", "Which solid is it? Tap its name.", "cup:table"],
    ["A customer describes a solid. {c}", "What is the solid? Tap its name.", "cookie:tray"],
    ["Here is a riddle about a solid. {c}", "Which solid is it? Tap its name.", "cake_box:table"]
  ];
  const THING_BANK = [
    ["Mimi sees {t} on the shelf.", "Which solid does it look like? Tap its name.", "cake_box:table"],
    ["A customer is carrying {t}.", "Which solid does it look like? Tap its name.", "cup:table"],
    ["Mimi picks up {t}.", "What solid is it shaped like? Tap its name.", "cookie:tray"]
  ];
  const NAME_HINT = "Think about the flat faces and the round parts. Which solid has them?";
  const G3_SOLID_NAMES_KIND = g3Kind({ name: "Cafe: the names of solids", group: "shapes", needs: ["sums.2"], choice: true, lessonKind: "solids" }, {
    NA: {
      n: 60, min: 12, gen: tb => { const s = tb.pick(SOLID_IDS), [a, b] = threeSolids(tb, s, SOLID_IDS); return { s, a, b }; }, bank: NAME_BANK, scene: lineup(1, "box"),
      q: ({ s, a, b }) => Object.assign(wordQ([s, a, b].map(solidLabel), 0), { v: {}, nums: [], eq: "name = ?", fact: `It is a ${SOLID_NAME[s]}.`, hint: NAME_HINT, key: `${s}:${a}:${b}`, figure: { t: "solid", shape: s } }),
      les: ({ s }) => [`Look at the faces. ${SOLID_CLUE[s]}`, `So it is a ${SOLID_NAME[s]}.`, SHORT[s]]
    },
    NP: {
      n: 60, min: 12, gen: tb => { const s = tb.pick(SOLID_IDS), [a, b] = threeSolids(tb, s, SOLID_IDS); return { s, a, b }; }, bank: PICK_BANK, scene: lineup(3, "box"),
      q: ({ s, a, b }) => Object.assign(wordQ([s, a, b].map(solidPick), 0), { v: { n: SOLID_NAME[s] }, nums: [], eq: "tap = ?", fact: `This one is the ${SOLID_NAME[s]}.`, hint: NAME_HINT, key: `${s}:${a}:${b}` }),
      les: ({ s }) => [`Look for the solid that fits. ${SOLID_CLUE[s]}`, `The ${SOLID_NAME[s]} is the one that fits.`, SHORT[s]]
    },
    NC: {
      n: 60, min: 12, gen: tb => { const s = tb.pick(SOLID_IDS), [a, b] = threeSolids(tb, s, SOLID_IDS); return { s, a, b }; }, bank: CLUE_BANK, scene: lineup(1, "box"),
      q: ({ s, a, b }) => Object.assign(wordQ([s, a, b].map(solidLabel), 0), { v: { c: SOLID_CLUE[s] }, nums: [], eq: "name = ?", fact: `It is a ${SOLID_NAME[s]}.`, hint: NAME_HINT, key: `${s}:${a}:${b}` }),
      les: ({ s }) => [`Think about the clue. ${SOLID_CLUE[s]}`, `So it is a ${SOLID_NAME[s]}.`, SHORT[s]]
    },
    NB: {
      n: 60, min: 12, gen: tb => { const ids = Object.keys(SOLID_THING), s = tb.pick(ids), o = tb.shuffle(ids.filter(x => x !== s)); return { s, a: o[0], b: o[1], i: tb.int(0, 2) }; }, bank: THING_BANK, scene: lineup(1, "basket"),
      q: ({ s, a, b, i }) => Object.assign(wordQ([s, a, b].map(solidLabel), 0), { v: { t: SOLID_THING[s][i] }, nums: [], eq: "name = ?", fact: `${cap1(SOLID_THING[s][i])} is shaped like a ${SOLID_NAME[s]}.`, hint: "Picture the thing in your mind. Which solid is it shaped like?", key: `${s}:${a}:${b}:${i}` }),
      les: ({ s, i }) => [`Picture ${SOLID_THING[s][i]}. ${SOLID_CLUE[s]}`, `So it is shaped like a ${SOLID_NAME[s]}.`, SHORT[s]]
    }
  });

  // faces, edges and corners: only solids with flat sides (the curved solids differ between books). The test keeps its own table.
  const SOLID_FACTS = { cube: { f: 6, e: 12, c: 8, sq: 6 }, rect_prism: { f: 6, e: 12, c: 8, rect: 6 }, sq_pyramid: { f: 5, e: 8, c: 5, sq: 1, tri: 4 }, tri_prism: { f: 5, e: 9, c: 6, tri: 2, rect: 3 } };
  const FLAT_IDS = Object.keys(SOLID_FACTS);
  const PART_WORD = { f: ["face", "faces"], e: ["edge", "edges"], c: ["corner", "corners"] };
  const PART_DEF = { f: "A face is a flat side.", e: "An edge is where two faces meet.", c: "A corner is where edges meet." };
  const PART_BANK = {
    f: [["Mimi looks at a {n}. A face is a flat side.", "How many faces does it have? Type the number.", "cake_box:table"], ["This solid is a {n}. A face is a flat side.", "How many faces does it have?", "cup:table"], ["A customer holds a {n}. A face is a flat side.", "How many faces does it have?", "cookie:tray"]],
    e: [["Mimi looks at a {n}. An edge is where two faces meet.", "How many edges does it have? Type the number.", "cake_box:table"], ["This solid is a {n}. An edge is where two faces meet.", "How many edges does it have?", "cup:table"], ["A customer holds a {n}. An edge is where two faces meet.", "How many edges does it have?", "cookie:tray"]],
    c: [["Mimi looks at a {n}. A corner is where edges meet.", "How many corners does it have? Type the number.", "cake_box:table"], ["This solid is a {n}. A corner is where edges meet.", "How many corners does it have?", "cup:table"], ["A customer holds a {n}. A corner is where edges meet.", "How many corners does it have?", "cookie:tray"]]
  };
  function partType(part) {
    const others = ["f", "e", "c"].filter(x => x !== part);
    return {
      n: 40, min: 4, gen: tb => ({ s: tb.pick(FLAT_IDS) }), bank: PART_BANK[part], scene: lineup(1, "box"),
      q: ({ s }) => { const F = SOLID_FACTS[s], ans = F[part]; return { v: { n: SOLID_NAME[s] }, nums: [], ans, eq: PART_WORD[part][1] + " = ?", fact: `A ${SOLID_NAME[s]} has ${pl(ans, PART_WORD[part][0], PART_WORD[part][1])}.`,
        hint: part === "f" ? "Count each flat side one at a time. Do not forget the bottom." : part === "e" ? "Count the edges at the top, the bottom and the sides." : "Count the corners at the top and at the bottom.",
        key: s, figure: { t: "solid", shape: s }, slips: { other_part: others.map(x => F[x]).filter(x => x !== ans) } }; },
      les: ({ s }, Q) => [`${PART_DEF[part]} Count them one at a time and keep your place.`, `A ${SOLID_NAME[s]} has ${pl(Q.ans, PART_WORD[part][0], PART_WORD[part][1])}.`, `${SHORT[s]} : ${Q.ans}`]
    };
  }
  const FACE_KIND = { sq: ["square", "squares"], rect: ["rectangle", "rectangles"], tri: ["triangle", "triangles"] };
  const FACE_PAIRS = [["cube", "sq"], ["rect_prism", "rect"], ["sq_pyramid", "sq"], ["sq_pyramid", "tri"], ["tri_prism", "tri"], ["tri_prism", "rect"]];
  const FACETYPE_BANK = [
    ["Mimi looks at a {n}.", "How many of its faces are {k}?", "cake_box:table"], ["This solid is a {n}.", "Count its faces that are {k}. How many are there?", "cup:table"], ["A customer holds a {n}.", "How many {k} are among its faces?", "cookie:tray"]
  ];
  const FLAT_BANK = [
    ["Mimi looks at a {n}.", "How many flat faces does it have? Type the number.", "cake_box:table"], ["This solid is a {n}.", "How many flat faces does it have?", "cup:table"], ["A customer holds a {n}.", "How many flat faces does it have?", "cookie:tray"]
  ];
  const G3_SOLID_PARTS_KIND = g3Kind({ name: "Cafe: faces, edges and corners of solids", group: "shapes", needs: ["cafe_solid.1", "sums.4"], choice: false, lessonKind: "solid_parts" }, {
    FF: partType("f"), FE: partType("e"), FC: partType("c"),
    FT: {
      n: 40, min: 4, gen: tb => { const [s, k] = tb.pick(FACE_PAIRS); return { s, k }; }, bank: FACETYPE_BANK, scene: lineup(1, "box"),
      q: ({ s, k }) => { const ans = SOLID_FACTS[s][k]; return { v: { n: SOLID_NAME[s], k: FACE_KIND[k][1] }, nums: [], ans, eq: FACE_KIND[k][1] + " = ?", fact: `A ${SOLID_NAME[s]} has ${pl(ans, FACE_KIND[k][0], FACE_KIND[k][1])} for faces.`,
        hint: `Look only at the ${FACE_KIND[k][1]}. Count them one at a time.`, key: `${s}:${k}`, figure: { t: "solid", shape: s } }; },
      les: ({ s, k }, Q) => [`Look only at the ${FACE_KIND[k][1]} and count them one at a time.`, `A ${SOLID_NAME[s]} has ${pl(Q.ans, FACE_KIND[k][0], FACE_KIND[k][1])}.`, `${FACE_KIND[k][1].slice(0, 8)} : ${Q.ans}`]
    },
    FL: {
      n: 8, min: 2, gen: tb => ({ s: tb.pick(["cylinder", "cone"]) }), bank: FLAT_BANK, scene: lineup(1, "box"),
      q: ({ s }) => { const ans = s === "cylinder" ? 2 : 1; return { v: { n: SOLID_NAME[s] }, nums: [], ans, eq: "flat = ?", fact: `A ${SOLID_NAME[s]} has ${pl(ans, "flat face")}. ${s === "cylinder" ? "They are the two circles." : "It is the circle at the bottom."}`,
        hint: "A flat face does not curve. Look for the flat circles.", key: s, figure: { t: "solid", shape: s } }; },
      les: ({ s }, Q) => ["A flat face does not curve. Look for the flat circles.", `A ${SOLID_NAME[s]} has ${pl(Q.ans, "flat face")}.`, `${SHORT[s]} : ${Q.ans}`]
    }
  });

  /* ----- data and graphs (cafe_graph.1 pictographs, .2 bar graphs, .3 tally marks). Every value is a whole multiple of the scale, so a bar ends on a line and a row
     needs no half picture. Scales 1, 2 and 5. No value is printed on a bar or a row; the key of a pictograph is in words. ----- */
  const DAY_FULL = { Mon: "Monday", Tue: "Tuesday", Wed: "Wednesday", Thu: "Thursday", Fri: "Friday" };
  const low = s => s.toLowerCase();
  const GTOPICS = [
    { cats: ["Mon", "Tue", "Wed", "Thu", "Fri"], say: c => DAY_FULL[c], unit: "cookies", one: "cookie", icon: "cookie", intro: "Mimi counted the cookies she sold on four days.",
      read: c => `How many cookies did she sell on ${DAY_FULL[c]}?`, most: "On which day did she sell the most cookies?", fewest: "On which day did she sell the fewest cookies?",
      more: (a, b) => `How many more cookies did she sell on ${DAY_FULL[a]} than on ${DAY_FULL[b]}?`, tot: (a, b) => `How many cookies did she sell on ${DAY_FULL[a]} and ${DAY_FULL[b]} together?` },
    { cats: ["Vanilla", "Mint", "Berry", "Mango"], say: c => c, unit: "scoops", one: "scoop", icon: "scoop", intro: "Mimi counted the scoops of ice cream she sold.",
      read: c => `How many scoops of ${low(c)} did she sell?`, most: "Which flavour sold the most scoops?", fewest: "Which flavour sold the fewest scoops?",
      more: (a, b) => `How many more scoops of ${low(a)} than ${low(b)} did she sell?`, tot: (a, b) => `How many scoops of ${low(a)} and ${low(b)} did she sell together?` },
    { cats: ["Tea", "Cocoa", "Milk", "Juice"], say: c => c, unit: "cups", one: "cup", icon: "cup", intro: "Mimi counted the cups of drinks she poured.",
      read: c => `How many cups of ${low(c)} did she pour?`, most: "Which drink did she pour the most?", fewest: "Which drink did she pour the fewest?",
      more: (a, b) => `How many more cups of ${low(a)} than ${low(b)} did she pour?`, tot: (a, b) => `How many cups of ${low(a)} and ${low(b)} did she pour together?` },
    { cats: ["Mon", "Tue", "Wed", "Thu", "Fri"], say: c => DAY_FULL[c], unit: "cupcakes", one: "cupcake", icon: "cupcake", intro: "Mimi counted the cupcakes she baked on four days.",
      read: c => `How many cupcakes did she bake on ${DAY_FULL[c]}?`, most: "On which day did she bake the most cupcakes?", fewest: "On which day did she bake the fewest cupcakes?",
      more: (a, b) => `How many more cupcakes did she bake on ${DAY_FULL[a]} than on ${DAY_FULL[b]}?`, tot: (a, b) => `How many cupcakes did she bake on ${DAY_FULL[a]} and ${DAY_FULL[b]} together?` }
  ];
  const TTOPICS = [
    { cats: ["Tea", "Cocoa", "Milk", "Juice"], say: c => c, intro: "Mimi asked her customers which drink they like best. She made a mark for each answer.",
      read: c => `How many customers chose ${low(c)}?`, most: "Which drink did the most customers choose?", fewest: "Which drink did the fewest customers choose?",
      more: (a, b) => `How many more customers chose ${low(a)} than ${low(b)}?`, tot: (a, b) => `How many customers chose ${low(a)} or ${low(b)}?` },
    { cats: ["Muffin", "Cupcake", "Cookie", "Pie"], say: c => c, intro: "Mimi asked her customers which treat they like best. She made a mark for each answer.",
      read: c => `How many customers chose the ${low(c)}?`, most: "Which treat did the most customers choose?", fewest: "Which treat did the fewest customers choose?",
      more: (a, b) => `How many more customers chose the ${low(a)} than the ${low(b)}?`, tot: (a, b) => `How many customers chose the ${low(a)} or the ${low(b)}?` },
    { cats: ["Vanilla", "Mint", "Berry", "Mango"], say: c => c, intro: "Mimi asked her customers which ice cream they like best. She made a mark for each answer.",
      read: c => `How many customers chose ${low(c)}?`, most: "Which flavour did the most customers choose?", fewest: "Which flavour did the fewest customers choose?",
      more: (a, b) => `How many more customers chose ${low(a)} than ${low(b)}?`, tot: (a, b) => `How many customers chose ${low(a)} or ${low(b)}?` }
  ];
  const GRAPH_FRAMES = kind => [
    [`Mimi made a ${kind}. {s}`, "{q}", "cookie:tray"], [`Look at Mimi's ${kind}. {s}`, "{q}", "cup:table"], [`Here is a ${kind} from the cafe. {s}`, "{q}", "muffin:tray"]
  ];
  const pickCats = (tb, topic) => { if (topic.cats.length === 4) return topic.cats.slice(); const skip = tb.int(0, 4); return topic.cats.filter((_, i) => i !== skip); };
  const optionIdx = (tb, n, right) => { const o = tb.shuffle([0, 1, 2, 3].filter(x => x !== right)); return o.slice(0, 2); };
  /* mode: read (one value), most, fewest, diff (how many more), tot (two together). kind: picto, bars, tally. scale: fixed for read types of pictographs and bar graphs. */
  function graphType(kind, mode, fixedScale) {
    const topics = kind === "tally" ? TTOPICS : GTOPICS, maxK = kind === "picto" ? 8 : kind === "bars" ? 9 : 22, minK = kind === "tally" ? 3 : 1;
    return {
      n: 60, min: 12,
      gen: tb => {
        const t = tb.int(0, topics.length - 1), s = kind === "tally" ? 1 : (fixedScale || tb.pick([1, 2, 5])), cats = pickCats(tb, topics[t]), ks = [0, 1, 2, 3].map(() => tb.int(minK, maxK));
        let i = tb.int(0, 3), j = tb.int(0, 3);
        const sorted = ks.slice().sort((a, b) => a - b);
        if (mode === "most" && sorted[3] === sorted[2]) return null;
        if (mode === "fewest" && sorted[0] === sorted[1]) return null;
        if (mode === "most") i = ks.indexOf(sorted[3]); if (mode === "fewest") i = ks.indexOf(sorted[0]);
        if (mode === "diff") { if (ks[i] <= ks[j]) return null; }
        if (mode === "tot") { if (i >= j) return null; }
        return { t, s, cats, ks, i, j, o: optionIdx(tb, 4, i) };
      },
      bank: GRAPH_FRAMES(kind === "picto" ? "picture graph" : kind === "bars" ? "bar graph" : "tally chart"), scene: lineup(1, "tray"),
      q: p => {
        const { t, s, cats, ks, i, j } = p, T = topics[t], vals = ks.map(k => k * s), name = c => T.say(c);
        const fig = kind === "picto" ? { t: "picto", cats, vals, scale: s, icon: T.icon, unit: T.unit, one: T.one } : kind === "bars" ? { t: "bars", cats, vals, scale: s, unit: T.unit } : { t: "tally", cats: cats.map(name), vals };
        const helpFig = { fig, help: kind === "picto" ? { row: mode === "read" ? i : -1 } : kind === "bars" ? { bar: mode === "read" ? i : -1 } : true };
        const base = { v: { s: T.intro, q: "" }, nums: [], figure: fig, helpFig, key: JSON.stringify([t, s, cats, ks, i, j]) };
        const sc = s > 1 ? NUMW[s] : "one";
        const scaleHint = kind === "picto" ? (s > 1 ? `Look at the key. Each picture stands for ${sc}. Count by ${sc}s.` : "Count the pictures in the row.") : kind === "bars" ? `Look at the top of the bar. Read across to the numbers. Each line goes up by ${sc}.` : "Count the groups of five by fives. Then count the extra marks.";
        if (mode === "most" || mode === "fewest") {
          const right = i, labels = [right].concat(p.o).map(x => ({ word: kind === "tally" ? name(cats[x]) : cats[x], say: name(cats[x]) }));
          const ask = mode === "most" ? T.most : T.fewest;
          return Object.assign(base, wordQ(labels, 0), { v: { s: T.intro, q: ask }, eq: mode + " = ?", fact: `${name(cats[i])} has the ${mode === "most" ? "most" : "fewest"}.`,
            hint: mode === "most" ? (kind === "bars" ? "Look for the tallest bar." : "Look for the longest row.") : (kind === "bars" ? "Look for the shortest bar." : "Look for the shortest row.") });
        }
        const slipFor = x => (s > 1 && kind !== "tally") ? { scale_slip: [x] } : undefined;
        if (mode === "read") return Object.assign(base, { v: { s: T.intro, q: T.read(cats[i]) }, ans: vals[i], eq: "number = ?", fact: kind === "tally" ? `${name(cats[i])} got ${vals[i]} marks.` : s > 1 && kind === "picto" ? `${pl(ks[i], "picture")} of ${s} ${ks[i] === 1 ? "makes" : "make"} ${vals[i]}.` : `${name(cats[i])} had ${pl(vals[i], T.one, T.unit)}.`,
          hint: scaleHint, slips: slipFor(ks[i]) });
        if (mode === "diff") return Object.assign(base, { v: { s: T.intro, q: T.more(cats[i], cats[j]) }, ans: vals[i] - vals[j], eq: "more = ?", op: "-", fact: `${vals[i]} minus ${vals[j]} is ${vals[i] - vals[j]}.`, hint: "Find both numbers first. Then take the small one away from the big one.", slips: slipFor(ks[i] - ks[j]) });
        return Object.assign(base, { v: { s: T.intro, q: T.tot(cats[i], cats[j]) }, ans: vals[i] + vals[j], eq: "in all = ?", op: "+", fact: `${vals[i]} plus ${vals[j]} is ${vals[i] + vals[j]}.`, hint: "Find both numbers first. Then add them.", slips: slipFor(ks[i] + ks[j]) });
      },
      les: (p, Q) => {
        const { s, ks, i, j } = p, sc = s > 1 ? NUMW[s] : "one";
        if (mode === "most" || mode === "fewest") return [`Look at all the ${kind === "bars" ? "bars" : "rows"}. Find the ${mode === "most" ? (kind === "bars" ? "tallest" : "longest") : "shortest"} one.`, Q.fact, Q.eq];
        const readHow = kind === "picto" ? (s > 1 ? `Each picture stands for ${sc}, so count by ${sc}s.` : "Count the pictures.") : kind === "bars" ? `Read the top of each bar. Each line goes up by ${sc}.` : "Count the groups of five by fives, then the extra marks.";
        if (mode === "read") return [readHow, Q.fact, kind === "picto" && s > 1 ? `${ks[i]} × ${s}` : `${Q.ans}`];
        if (mode === "diff") return [`${readHow} Then take one away from the other.`, Q.fact, `${Q.ans + (ks[j] * s)} ${MINUS} ${ks[j] * s}`];
        return [`${readHow} Then add the two.`, Q.fact, `${ks[i] * s} + ${ks[j] * s}`];
      }
    };
  }
  const G3_PICTO_KIND = g3Kind({ name: "Cafe: reading a picture graph", group: "shapes", needs: ["cafe_times.1"], choice: "mixed", lessonKind: "graph" }, {
    PA: graphType("picto", "read", 1), PB: graphType("picto", "read", 2), PC: graphType("picto", "read", 5), PM: graphType("picto", "most"), PF: graphType("picto", "fewest"), PD: graphType("picto", "diff"), PT: graphType("picto", "tot")
  });
  const G3_BARS_KIND = g3Kind({ name: "Cafe: reading a bar graph", group: "shapes", needs: ["cafe_graph.1", "cafe_pattern.1"], choice: "mixed", lessonKind: "graph" }, {
    BA: graphType("bars", "read", 1), BB: graphType("bars", "read", 2), BC: graphType("bars", "read", 5), BM: graphType("bars", "most"), BF: graphType("bars", "fewest"), BD: graphType("bars", "diff"), BT: graphType("bars", "tot")
  });
  const G3_TALLY_KIND = g3Kind({ name: "Cafe: tally marks", group: "shapes", needs: ["cafe_times.1"], choice: "mixed", lessonKind: "graph" }, {
    TA: graphType("tally", "read"), TM: graphType("tally", "most"), TF: graphType("tally", "fewest"), TD: graphType("tally", "diff"), TT: graphType("tally", "tot")
  });

  /* ----- simple chance (cafe_chance.1: the four words; cafe_chance.2: spinners, fair games and draws) ----- */
  const CHANCE_WORDS = ["impossible", "unlikely", "likely", "certain"];
  const chanceLabels = () => CHANCE_WORDS.map(w => ({ word: w, say: w }));
  const SWEET_COLORS = ["red", "blue", "green", "yellow", "pink", "purple"];
  const CHANCE_FACT = {
    jar: [c => `There is no ${c} sweet in the jar, so it is impossible.`, c => `Only a few sweets are ${c}, so it is unlikely.`, c => `Most of the sweets are ${c}, so it is likely.`, c => `All the sweets are ${c}, so it is certain.`],
    die: [() => "No number on the cube fits, so it is impossible.", () => "Only a few numbers fit, so it is unlikely.", () => "Most of the numbers fit, so it is likely.", () => "Every number on the cube fits, so it is certain."],
    spin: [c => `No part of the spinner is ${c}, so it is impossible.`, c => `Only a few parts are ${c}, so it is unlikely.`, c => `Most of the parts are ${c}, so it is likely.`, c => `Every part is ${c}, so it is certain.`]
  };
  const CHANCE_HINT = {
    jar: "Count the sweets of that colour. Are they all, none, most or only a few?", die: "Think about the six numbers on the cube. How many of them fit?",
    spin: "Count the parts of that colour. Are they all, none, most or only a few?"
  };
  const CHANCE_LESSON = "All of them is certain. None of them is impossible. Most of them is likely. Only a few is unlikely.";
  const levelOf = (n, total) => n === 0 ? 0 : n === total ? 3 : n / total >= .6 ? 2 : 1;
  const DICE_STATEMENTS = [
    ["a number less than 7", 6], ["a number more than 0", 6], ["a number from 1 to 6", 6], ["a 7", 0], ["a 0", 0], ["a number more than 6", 0],
    ["a number more than 1", 5], ["a number less than 6", 5], ["a number more than 2", 4], ["a 6", 1], ["a 1", 1], ["a number more than 5", 1], ["a number less than 2", 1]
  ];
  const JAR_BANK = [
    ["Mimi has a jar of sweets. She picks one without looking.", "Will she pick a {c} sweet?", "candy:jar"],
    ["A customer reaches into the sweet jar without looking.", "Will the customer get a {c} sweet?", "candy:jar"],
    ["Mimi shakes the jar of sweets and takes one out.", "Will it be a {c} sweet?", "candy:jar"]
  ];
  const DICE_BANK = [
    ["Mimi rolls a fair number cube. It has the numbers 1 to 6.", "Will she roll {s}?", "cup:table"],
    ["A customer rolls a fair number cube with the numbers 1 to 6.", "Will the customer roll {s}?", "cookie:tray"],
    ["Mimi plays a game with a fair number cube. It has the numbers 1 to 6.", "Will she roll {s}?", "muffin:tray"]
  ];
  const SPIN_BANK = [
    ["Mimi spins the spinner. It has eight equal parts.", "Will it stop on {c}?", "cup:table"],
    ["A customer spins the cafe spinner. It has eight equal parts.", "Will it stop on {c}?", "cookie:tray"],
    ["Mimi gives the spinner a spin. It has eight equal parts.", "Will it land on {c}?", "muffin:tray"]
  ];
  const spinnerParts = (tb, c, r, total) => { const others = tb.shuffle(SWEET_COLORS.filter(x => x !== c)).slice(0, 2), list = []; for (let i = 0; i < r; i++) list.push(c); for (let i = r; i < total; i++) list.push(others[(i - r) % 2]); return tb.shuffle(list); };
  const G3_CHANCE1_KIND = g3Kind({ name: "Cafe: certain, likely, unlikely, impossible", group: "shapes", needs: ["sums.3"], choice: true, ordered: true, lessonKind: "chance" }, {
    CJ: {
      n: 60, min: 12,
      gen: tb => {
        const lv = tb.int(0, 3), c = tb.pick(SWEET_COLORS), T = tb.int(6, 10), others = tb.shuffle(SWEET_COLORS.filter(x => x !== c));
        let r = lv === 0 ? 0 : lv === 3 ? T : lv === 2 ? tb.int(Math.ceil(T * .65), T - 1) : tb.int(1, Math.floor(T * .35));
        if (lv === 1 && r < 1) r = 1;
        const items = {}; if (r) items[c] = r; const rest = T - r;
        if (rest > 0) { const a = Math.ceil(rest / 2); items[others[0]] = a; if (rest - a > 0) items[others[1]] = rest - a; }
        return { lv, c, items };
      },
      bank: JAR_BANK, scene: lineup(1, "jar"),
      q: ({ lv, c, items }) => Object.assign(wordQ(chanceLabels(), lv), { v: { c }, nums: [], eq: "chance = ?", fact: CHANCE_FACT.jar[lv](c), hint: CHANCE_HINT.jar, key: JSON.stringify(items) + c, figure: { t: "jar", items } }),
      les: ({ lv, c }) => [CHANCE_LESSON, CHANCE_FACT.jar[lv](c), "none few most"]
    },
    CD: {
      n: 60, min: 8, gen: tb => ({ i: tb.int(0, DICE_STATEMENTS.length - 1) }), bank: DICE_BANK, scene: lineup(1, "tray"),
      q: ({ i }) => { const [s, n] = DICE_STATEMENTS[i], lv = levelOf(n, 6); return Object.assign(wordQ(chanceLabels(), lv), { v: { s }, nums: [], eq: "chance = ?", fact: CHANCE_FACT.die[lv](), hint: CHANCE_HINT.die, key: s }); },
      les: ({ i }) => { const lv = levelOf(DICE_STATEMENTS[i][1], 6); return [CHANCE_LESSON, CHANCE_FACT.die[lv](), "none few most"]; }
    },
    CS: {
      n: 60, min: 12,
      gen: tb => { const lv = tb.int(0, 3), c = tb.pick(SWEET_COLORS), r = lv === 0 ? 0 : lv === 3 ? 8 : lv === 2 ? tb.pick([6, 7]) : tb.pick([1, 2]); return { lv, c, parts: spinnerParts(tb, c, r, 8) }; },
      bank: SPIN_BANK, scene: lineup(1, "plate"),
      q: ({ lv, c, parts }) => Object.assign(wordQ(chanceLabels(), lv), { v: { c }, nums: [], eq: "chance = ?", fact: CHANCE_FACT.spin[lv](c), hint: CHANCE_HINT.spin, key: parts.join("") + c, figure: { t: "spinner", parts } }),
      les: ({ lv, c }) => [CHANCE_LESSON, CHANCE_FACT.spin[lv](c), "none few most"]
    }
  });

  const MOST_BANK = (what) => [
    ["Mimi spins the spinner. It has equal parts.", `Which colour is it ${what} to stop on? Tap it.`, "cup:table"],
    ["A customer spins the cafe spinner. Every part is the same size.", `Which colour is it ${what} to land on? Tap it.`, "cookie:tray"],
    ["Mimi looks at the spinner. All the parts are equal.", `Which colour is ${what} to come up? Tap it.`, "muffin:tray"]
  ];
  const threeCounts = (tb, T) => { for (let i = 0; i < 100; i++) { const a = tb.int(2, T - 3), b = tb.int(1, a - 1), c = T - a - b; if (c >= 1 && c < b && a > b) return [a, b, c]; } return null; };
  function mostType(most) {
    return {
      n: 60, min: 12,
      gen: tb => { const T = tb.pick([6, 8, 9, 10, 12]), cnt = threeCounts(tb, T); if (!cnt) return null; const cols = tb.shuffle(SWEET_COLORS).slice(0, 3); const list = []; cols.forEach((c, i) => { for (let k = 0; k < cnt[i]; k++) list.push(c); }); return { cols, cnt, parts: tb.shuffle(list) }; },
      bank: MOST_BANK(most ? "most likely" : "least likely"), scene: lineup(1, "plate"),
      q: ({ cols, cnt, parts }) => { const right = most ? 0 : 2, order = most ? [0, 1, 2] : [2, 0, 1];
        return Object.assign(wordQ(order.map(i => ({ word: cols[i], say: cols[i] })), 0), { v: {}, nums: [], eq: (most ? "most" : "least") + " = ?", fact: `${cap1(cols[right])} has ${most ? "the most" : "the fewest"} parts, so it is ${most ? "the most" : "the least"} likely.`,
          hint: `Count the parts of each colour. ${most ? "More" : "Fewer"} parts means ${most ? "more" : "less"} likely.`, key: parts.join(""), figure: { t: "spinner", parts } }); },
      les: ({ cols, cnt }) => ["Count the parts of each colour. The chance is bigger when there are more parts.", `${cap1(cols[most ? 0 : 2])} has ${most ? "the most" : "the fewest"} parts.`, `${cnt.join(" ")}`]
    };
  }
  const FAIR_BANK = [
    ["Mimi plays a spinner game with a friend. Mimi wins on {c}. Her friend wins on {d}.", "Is the game fair? Tap yes or no.", "cup:table"],
    ["Mimi and a customer play with a spinner. Mimi wins on {c}. The customer wins on {d}.", "Is it a fair game? Tap yes or no.", "cookie:tray"],
    ["Two friends spin the spinner. One wins on {c}. The other wins on {d}.", "Is the game fair? Tap yes or no.", "muffin:tray"]
  ];
  const LIST_TEXT = items => items.map(([n, c]) => `${n} ${c} ${n === 1 ? "ticket" : "tickets"}`).join(", ").replace(/, ([^,]*)$/, " and $1");
  const DRAW_BANK2 = [
    ["Mimi's bag has {l}. She draws one without looking.", "Which colour is she more likely to draw? Tap it.", "cup:table"],
    ["A bag holds {l}. A customer draws one without looking.", "Which colour is more likely to be drawn? Tap it.", "cookie:tray"],
    ["Mimi mixes {l} in a bag. She draws one.", "Which colour is she more likely to draw? Tap it.", "muffin:tray"]
  ];
  const DRAW_BANK3 = [
    ["Mimi's bag has {l}. She draws one without looking.", "Which colour is she most likely to draw? Tap it.", "cup:table"],
    ["A bag holds {l}. A customer draws one without looking.", "Which colour is most likely to be drawn? Tap it.", "cookie:tray"],
    ["Mimi mixes {l} in a bag. She draws one.", "Which colour is she most likely to draw? Tap it.", "muffin:tray"]
  ];
  const FAIRADD_BANK = [
    ["Mimi's bag has {l}. She wants a fair draw, with the same chance for both colours.", "How many {s} tickets must she add?", "cup:table"],
    ["A bag holds {l}. The game is not fair yet.", "How many {s} tickets must Mimi put in to make it fair?", "cookie:tray"],
    ["Mimi has {l} in the bag. She wants both colours to have the same chance.", "How many {s} tickets must she add?", "muffin:tray"]
  ];
  const G3_CHANCE2_KIND = g3Kind({ name: "Cafe: spinners, fair games and draws", group: "shapes", needs: ["cafe_chance.1"], choice: "mixed", lessonKind: "chance2" }, {
    FM: mostType(true), FL: mostType(false),
    FF: {
      n: 60, min: 12,
      gen: tb => { const [c, d] = tb.shuffle(SWEET_COLORS).slice(0, 2), pairs = [[2, 2], [3, 3], [4, 4], [3, 1], [1, 3], [4, 2], [2, 4], [5, 3], [3, 5], [5, 1], [1, 5], [6, 2]], [a, b] = tb.pick(pairs), list = []; for (let k = 0; k < a; k++) list.push(c); for (let k = 0; k < b; k++) list.push(d); return { c, d, a, b, parts: tb.shuffle(list) }; },
      bank: FAIR_BANK, scene: lineup(1, "plate"),
      q: ({ c, d, a, b, parts }) => { const fair = a === b; return Object.assign(wordQ([{ word: "Yes", say: "yes" }, { word: "No", say: "no" }], fair ? 0 : 1), { v: { c, d }, nums: [], eq: "fair = ?",
        fact: fair ? `Both colours have ${a} parts, so each player has the same chance. It is fair.` : `${cap1(c)} has ${pl(a, "part")} and ${d} has ${pl(b, "part")}. The chances are not the same. It is not fair.`,
        hint: "Count the parts of each colour. A fair game gives both players the same number of parts.", key: parts.join("") + c + d, figure: { t: "spinner", parts } }); },
      les: ({ a, b }) => ["A fair game gives both players the same chance. Count the parts for each colour.", a === b ? "The two colours have the same number of parts. It is fair." : "The two colours have different numbers of parts. It is not fair.", `${a} and ${b}`]
    },
    FD: {
      n: 60, min: 12, gen: tb => { const [c, d] = tb.shuffle(SWEET_COLORS).slice(0, 2), a = tb.int(2, 9), b = tb.int(1, 9); return a === b ? null : { c, d, a, b }; }, bank: DRAW_BANK2, scene: lineup(1, "basket"),
      q: ({ c, d, a, b }) => { const right = a > b ? 0 : 1, cols = [c, d]; return Object.assign(wordQ(cols.map(x => ({ word: x, say: x })), right), { v: { l: LIST_TEXT([[a, c], [b, d]]) }, nums: [a, b], eq: "more likely = ?",
        fact: `There are more ${cols[right]} tickets, so ${cols[right]} is more likely.`, hint: "Compare the two numbers. The colour with more tickets is more likely.", key: `${c}:${d}:${a}:${b}` }); },
      les: ({ c, d, a, b }) => ["Compare the number of tickets. More tickets means a bigger chance.", `There are more ${a > b ? c : d} tickets, so ${a > b ? c : d} is more likely.`, `${a} or ${b}`]
    },
    FG: {
      n: 60, min: 12, gen: tb => { const cols = tb.shuffle(SWEET_COLORS).slice(0, 3), cnt = [tb.int(1, 8), tb.int(1, 8), tb.int(1, 8)]; return new Set(cnt).size === 3 ? { cols, cnt } : null; }, bank: DRAW_BANK3, scene: lineup(1, "basket"),
      q: ({ cols, cnt }) => { const right = cnt.indexOf(Math.max(...cnt)); return Object.assign(wordQ(cols.map(x => ({ word: x, say: x })), right), { v: { l: LIST_TEXT(cols.map((c, i) => [cnt[i], c])) }, nums: cnt.slice(), eq: "most likely = ?",
        fact: `There are the most ${cols[right]} tickets, so ${cols[right]} is the most likely.`, hint: "Compare the numbers. The colour with the most tickets is the most likely.", key: cols.join("") + cnt.join(":") }); },
      les: ({ cols, cnt }) => ["Compare the number of tickets. The most tickets gives the biggest chance.", `${cap1(cols[cnt.indexOf(Math.max(...cnt))])} has the most tickets.`, cnt.join(" ")]
    },
    FP: {
      n: 60, min: 12, gen: tb => { const [c, d] = tb.shuffle(SWEET_COLORS).slice(0, 2), a = tb.int(3, 9), b = tb.int(1, a - 1); return { c, d, a, b }; }, bank: FAIRADD_BANK, scene: lineup(1, "basket"),
      q: ({ c, d, a, b }) => ({ v: { l: LIST_TEXT([[a, c], [b, d]]), s: d }, nums: [a, b], ans: a - b, eq: "add = ?", op: "-", fact: `${a} minus ${b} is ${a - b}. With ${pl(a - b, d + " ticket")} added, both colours have ${a}. It is fair.`,
        hint: "A fair draw needs the same number of each colour. How many more does the smaller colour need?", key: `${c}:${d}:${a}:${b}` }),
      les: ({ a, b }, Q) => ["A fair draw has the same number of each colour. Find how many the smaller colour needs.", `${a} minus ${b} is ${Q.ans}.`, `${a} ${MINUS} ${b}`]
    }
  });

  /* ----- fractions beyond halves and quarters (cafe_frac.2 to .5). Notation (1/3) is on the answer buttons; everything spoken is in words. ----- */
  const DEN_WORD = { 2: ["half", "halves"], 3: ["third", "thirds"], 4: ["quarter", "quarters"], 6: ["sixth", "sixths"], 8: ["eighth", "eighths"] };
  const fs = (k, n) => k === 1 && n === 2 ? "one half" : `${NUMW[k]} ${DEN_WORD[n][k === 1 ? 0 : 1]}`;
  const fracLabel = ([k, n]) => ({ frac: `${k}/${n}`, say: fs(k, n) });
  const A_PART = { 2: "a half", 3: "a third", 4: "a quarter", 6: "a sixth", 8: "an eighth" };
  const DENS = [2, 3, 4, 6, 8];
  // the right fraction and two more that are not equal to it in value (a different top, a different bottom, or the part that is not shaded)
  function fracOptions(tb, k, n) {
    const out = [[k, n]], vals = new Set([k / n]);
    const add = f => { if (f[0] >= 1 && f[0] < f[1] && !vals.has(f[0] / f[1])) { vals.add(f[0] / f[1]); out.push(f); } };
    if (k > 1 || n > 2) add([n - k, n]);
    tb.shuffle(DENS.filter(m => m !== n)).forEach(m => { if (out.length < 3) add([Math.min(k, m - 1), m]); });
    tb.shuffle(DENS).forEach(m => { for (let j = 1; j < m && out.length < 3; j++) add([j, m]); });
    return out.slice(0, 3);
  }
  const SHAPE_ROWS = ["pie", "bar", "bar"];
  const reshape = (Q, ti) => { const b = Q.figure.bars[0]; Q.figure = { t: "fracbar", bars: [Object.assign({}, b, { shape: SHAPE_ROWS[ti] })] }; if (Q.hintPic && Q.hintPic.figure) Q.hintPic.figure = Q.figure; };
  const SLICE_BANK = (tail) => [
    ["Mimi cuts a pie into equal slices. " + tail("pink", "slice"), "What fraction of the pie is pink? Tap it.", "pie:table"],
    ["Mimi cuts a long cake into equal pieces. " + tail("pink", "piece"), "What fraction of the cake is pink? Tap it.", "cake:table"],
    ["A chocolate bar has equal squares. " + tail("pink", "square"), "What fraction of the bar is pink? Tap it.", "chocolate:table"]
  ];
  const NAME_PART_BANK = [
    ["Mimi cuts a pie into {n} equal slices.", "What do we call each slice? Tap it.", "pie:table"],
    ["Mimi cuts a long cake into {n} equal pieces.", "What do we call each piece? Tap it.", "cake:table"],
    ["A chocolate bar has {n} equal squares.", "What do we call each square? Tap it.", "chocolate:table"]
  ];
  const EQUAL_BANK = [
    ["Mimi cuts three cakes of the same size.", "Which cake is cut into equal parts? Tap it.", "cake:table"],
    ["Three chocolate bars are cut up. Only one has equal pieces.", "Which bar is cut into equal parts? Tap it.", "chocolate:table"],
    ["Mimi cuts three long cakes in different ways.", "Which cake has equal parts? Tap it.", "cake:table"]
  ];
  const unequalCuts = (n, variant) => { const w = Array.from({ length: n }, (_, i) => variant ? i + 1 : (i % 2 ? 3 : 1)), tot = w.reduce((a, b) => a + b, 0); let acc = 0; return w.slice(0, -1).map(x => (acc += x) / tot); };
  const equalFig = n => ({ t: "fracbar", bars: [{ parts: n }] });
  const unequalFig = (n, variant) => ({ t: "fracbar", bars: [{ cuts: unequalCuts(n, variant) }] });
  const G3_FRACNAME_KIND = g3Kind({ name: "Cafe: thirds, sixths and eighths", group: "fractions", needs: ["cafe_frac.1"], choice: true, lessonKind: "fraction_name" }, {
    NF1: {
      n: 60, min: 4, gen: tb => ({ n: tb.pick(DENS) }), bank: SLICE_BANK((c, w) => `One ${w} is ${c}.`), scene: lineup(1, "plate"),
      q: ({ n }) => ({ v: {}, nums: [], ...wordQ(fracOptions(toolbox(rng32(n * 31 + 7)), 1, n).map(fracLabel), 0), eq: "fraction = ?", fact: `One of ${n} equal parts is ${fs(1, n)}.`, hint: "Count all the equal parts. The bottom number is how many equal parts there are.",
        key: `1:${n}`, figure: { t: "fracbar", bars: [{ parts: n, shaded: [0] }] } }),
      deco: (Q, p, ti) => reshape(Q, ti),
      les: ({ n }) => [`Count the equal parts. There are ${n}. One of them is pink.`, `One of ${n} equal parts is ${fs(1, n)}.`, `1 of ${n}`]
    },
    NF2: {
      n: 60, min: 8, gen: tb => { const n = tb.pick([3, 4, 6, 8]), k = tb.int(2, n - 1); return { n, k }; }, bank: SLICE_BANK((c, w) => "Some of the " + w + "s are pink."), scene: lineup(1, "plate"),
      q: ({ n, k }) => ({ v: {}, nums: [], ...wordQ(fracOptions(toolbox(rng32(n * 131 + k)), k, n).map(fracLabel), 0), eq: "fraction = ?", fact: `${NUMW[k]} of ${n} equal parts is ${fs(k, n)}.`, hint: "The bottom number is how many equal parts there are. The top number is how many are pink.",
        key: `${k}:${n}`, figure: { t: "fracbar", bars: [{ parts: n, shaded: Array.from({ length: k }, (_, i) => i) }] } }),
      deco: (Q, p, ti) => reshape(Q, ti),
      les: ({ n, k }) => [`Count all the equal parts. That is the bottom number. Then count the pink parts. That is the top number.`, `${NUMW[k]} of ${n} equal parts is ${fs(k, n)}.`, `${k} of ${n}`]
    },
    NW: {
      n: 60, min: 4, gen: tb => { const n = tb.pick(DENS), o = tb.shuffle(DENS.filter(x => x !== n)); return { n, a: o[0], b: o[1] }; }, bank: NAME_PART_BANK, scene: lineup(1, "plate"),
      q: ({ n, a, b }) => ({ v: { n }, nums: [n], ...wordQ([n, a, b].map(x => ({ word: A_PART[x], say: A_PART[x] })), 0), eq: "name = ?", fact: `Each of ${n} equal parts is ${A_PART[n]}.`, hint: "Count the equal parts. Each part is named after how many there are.",
        key: `${n}:${a}:${b}`, figure: { t: "fracbar", bars: [{ parts: n }] } }),
      deco: (Q, p, ti) => reshape(Q, ti),
      les: ({ n }) => [`Count the equal parts. There are ${n}.`, `Each of ${n} equal parts is ${A_PART[n]}.`, `${n} parts`]
    },
    NE: {
      n: 8, min: 4, gen: tb => ({ n: tb.pick([2, 3, 4, 6]), v1: tb.int(0, 1) }), bank: EQUAL_BANK, scene: lineup(3, "plate"),
      q: ({ n, v1 }) => Object.assign(wordQ([{ fig: equalFig(n), say: "This one.", name: "a cake" }, { fig: unequalFig(n, v1), say: "This one.", name: "a cake" }, { fig: unequalFig(n, 1 - v1), say: "This one.", name: "a cake" }], 0),
        { v: {}, nums: [], eq: "equal = ?", fact: "This cake has equal parts. Every part is the same size.", hint: "Equal parts are all the same size. Look for the cake where every piece looks the same.", key: `${n}:${v1}` }),
      les: () => ["Equal parts are all the same size. Check each cake.", "This cake has equal parts. Every part is the same size.", "equal parts"]
    }
  });

  const BIGGER_BANK = [
    ["Mimi cuts one cake into {a} equal parts. She cuts a second cake, the same size, into {b} equal parts.", "Which piece is {w}? Tap it.", "cake:table"],
    ["Two cakes are the same size. One is cut into {a} equal slices. The other is cut into {b} equal slices.", "Which slice is {w}? Tap it.", "pie:table"],
    ["Mimi shares one pie between {a} friends. A second pie, the same size, is shared between {b} friends.", "Which share is {w}? Tap it.", "pie:table"]
  ];
  const SAMEDEN_BANK = [
    ["Mimi ate {a} of {n} equal slices. Her friend ate {b} of the same {n} slices.", "Who ate more? Tap that fraction.", "pie:table"],
    ["A pie has {n} equal slices. Mimi takes {a} of them. A customer takes {b}.", "Who took more? Tap that fraction.", "pie:table"],
    ["A cake is cut into {n} equal pieces. One plate gets {a|piece}. Another plate gets {b|piece}.", "Which plate has more? Tap that fraction.", "cake:table"]
  ];
  const twoBars = (a, b, sa, sb) => ({ t: "fracbar", bars: [{ parts: a, shaded: sa }, { parts: b, shaded: sb }] });
  function unitCompare(bigger) {
    return {
      n: 60, min: 8, gen: tb => { const a = tb.pick(DENS), b = tb.pick(DENS); return a === b ? null : { a, b }; }, bank: BIGGER_BANK.map(r => [r[0], r[1].replace("{w}", bigger ? "bigger" : "smaller"), r[2]]), scene: lineup(2, "plate"),
      q: ({ a, b }) => { const big = Math.min(a, b), small = Math.max(a, b), right = bigger ? big : small, wrong = bigger ? small : big;
        return Object.assign(wordQ([right, wrong].map(x => fracLabel([1, x])), 0), { v: { a, b, w: "" }, nums: [a, b], eq: (bigger ? "bigger" : "smaller") + " = ?", fact: `${cap1(fs(1, right))} is the ${bigger ? "bigger" : "smaller"} piece. ${cap1(NUMW[big])} is less than ${NUMW[small]}, so fewer parts means bigger pieces.`,
          hint: "More equal parts means smaller parts. Fewer equal parts means bigger parts.", key: `${a}:${b}`, helpFig: { fig: twoBars(a, b, [0], [0]), help: true }, slips: bigger ? { bigger_parts: [2] } : undefined }); },
      les: ({ a, b }) => ["Think of sharing a cake. The more equal parts you cut it into, the smaller each part is.", `${a} parts or ${b} parts: ${Math.min(a, b)} is fewer, so that piece is bigger.`, `${a} or ${b}`]
    };
  }
  const G3_FRACCMP_KIND = g3Kind({ name: "Cafe: which fraction is bigger", group: "fractions", needs: ["cafe_frac.2"], choice: true, lessonKind: "fraction_cmp" }, {
    CB: unitCompare(true), CS: unitCompare(false),
    CT: {
      n: 60, min: 8, gen: tb => { const o = tb.shuffle(DENS).slice(0, 3); return { d: o }; },
      bank: [
        ["Mimi cuts three cakes of the same size. One into {a} equal parts, one into {b} and one into {c}.", "Which piece is the biggest? Tap it.", "cake:table"],
        ["Three pies are the same size. They are cut into {a}, {b} and {c} equal slices.", "Which slice is the biggest? Tap it.", "pie:table"],
        ["Mimi shares three same-size pies between {a}, {b} and {c} friends.", "Which share is the biggest? Tap it.", "pie:table"]
      ], scene: lineup(3, "plate"),
      q: ({ d }) => { const best = Math.min(...d), wrong = d.filter(x => x !== best);
        return Object.assign(wordQ([best, ...wrong].map(x => fracLabel([1, x])), 0), { v: { a: d[0], b: d[1], c: d[2] }, nums: d.slice(), eq: "biggest = ?", fact: `${cap1(fs(1, best))} is the biggest. The fewer the parts, the bigger each part.`, hint: "More equal parts means smaller parts. Which cake has the fewest parts?",
          key: d.join(":"), slips: { bigger_parts: [2, 3] }, helpFig: { fig: { t: "fracbar", bars: d.map(x => ({ parts: x, shaded: [0] })) }, help: true } }); },
      les: ({ d }) => ["The more equal parts a cake is cut into, the smaller each part is. Look for the fewest parts.", `The fewest parts is ${Math.min(...d)}, so that piece is the biggest.`, d.join(" ")]
    },
    CN: {
      n: 60, min: 8, gen: tb => { const n = tb.pick([3, 4, 6, 8]), a = tb.int(1, n - 1), b = tb.int(1, n - 1); return a === b ? null : { n, a, b }; }, bank: SAMEDEN_BANK, scene: lineup(2, "plate"),
      q: ({ n, a, b }) => { const big = Math.max(a, b), small = Math.min(a, b);
        return Object.assign(wordQ([[big, n], [small, n]].map(fracLabel), 0), { v: { n, a, b }, nums: [n, a, b], eq: "more = ?", fact: `${cap1(fs(big, n))} is more than ${fs(small, n)}. The parts are the same size, so more parts is more.`, hint: "The parts are the same size. Count how many parts each one has.",
          key: `${n}:${a}:${b}`, helpFig: { fig: twoBars(n, n, Array.from({ length: a }, (_, i) => i), Array.from({ length: b }, (_, i) => i)), help: true } }); },
      les: ({ n, a, b }) => ["The parts are the same size. So the one with more parts is more.", `${pl(Math.max(a, b), "part")} is more than ${pl(Math.min(a, b), "part")}.`, `${a} or ${b}`]
    }
  });

  // a fraction of a set: put the set into equal groups, then take the groups
  const SETFRAC = { U3: [1, 3, [6, 9, 12, 15, 18, 21, 24, 27, 30]], U6: [1, 6, [12, 18, 24, 30, 36]], U8: [1, 8, [16, 24, 32, 40, 48]], K3: [2, 3, [6, 9, 12, 15, 18, 21, 24]], K4: [3, 4, [8, 12, 16, 20, 24, 28]], K8: [3, 8, [16, 24, 32, 40]] };
  const SETFRAC_BANK = [
    ["Mimi has {t|cupcake}. She gives {f} of them to a friend.", "How many cupcakes does her friend get?", "cupcake:tray"],
    ["There are {t|cookie} on the tray. A customer buys {f} of them.", "How many cookies does the customer buy?", "cookie:tray"],
    ["Mimi bakes {t|muffin}. {fc} of them are blueberry.", "How many muffins are blueberry?", "muffin:tray"]
  ];
  function setType(id) {
    const [k, n, totals] = SETFRAC[id];
    return {
      n: 40, min: totals.length, gen: tb => ({ t: tb.pick(totals) }), bank: SETFRAC_BANK, scene: lineup(1, "tray"),
      q: ({ t }) => { const per = t / n, ans = per * k, shade = Array.from({ length: k }, (_, i) => i);
        return { v: { t, f: fs(k, n), fc: cap1(fs(k, n)) }, nums: [t], ans, eq: "fraction of = ?", fact: `${t} in ${n} equal groups is ${per} in each group.${k > 1 ? ` ${pl(k, "group")} make ${ans}.` : ""}`,
          hint: k > 1 ? `Share them into ${n} equal groups. Then count ${NUMW[k]} of the groups.` : `Share them into ${n} equal groups. How many are in one group?`, key: `${id}:${t}`,
          helpFig: { fig: { t: "set", total: t, groups: n, shade }, help: true }, slips: k > 1 ? { one_group: [per] } : undefined }; },
      les: ({ t }, Q) => [k > 1 ? `Share the ${t} into ${n} equal groups. Then take ${NUMW[k]} of the groups.` : `Share the ${t} into ${n} equal groups. One group is ${fs(1, n)}.`,
        k > 1 ? `${t} divided by ${n} is ${t / n}. ${NUMW[k]} groups of ${t / n} is ${Q.ans}.` : `${t} divided by ${n} is ${Q.ans}.`, k > 1 ? `${t} ÷ ${n} × ${k}` : `${t} ÷ ${n}`]
    };
  }
  const G3_FRACSET_KIND = g3Kind({ name: "Cafe: a fraction of a set", group: "fractions", needs: ["cafe_frac.2", "cafe_share.2"], choice: false, lessonKind: "fraction_set" }, {
    U3: setType("U3"), U6: setType("U6"), U8: setType("U8"), K3: setType("K3"), K4: setType("K4"), K8: setType("K8")
  });

  // a fraction on a number line from 0 to 1
  const LINE_BANK = [
    ["Mimi hangs a ribbon from zero to one. It is marked in equal parts. A pink dot marks a spot.", "What fraction is at the pink dot? Tap it.", "cake:table"],
    ["A number line goes from zero to one. It is cut into equal parts. There is a pink dot on it.", "Which fraction is the pink dot? Tap it.", "cup:table"],
    ["Look at the line from zero to one. The parts are equal. The pink dot shows a fraction.", "What fraction is it? Tap it.", "cookie:tray"]
  ];
  const LETTER_BANK = [
    ["A number line goes from zero to one. It has equal parts and three dots, A, B and C.", "Which letter is at {f}? Tap it.", "cup:table"],
    ["Mimi hangs three flags, A, B and C, on a line from zero to one. The line has equal parts.", "Which flag is at {f}? Tap its letter.", "cake:table"],
    ["Look at the line from zero to one. Three dots, A, B and C, sit on the equal parts.", "Which letter is at {f}? Tap it.", "cookie:tray"]
  ];
  const HOP_BANK = [
    ["A number line goes from zero to one. It is cut into {n} equal parts. Mimi hops one part from zero.", "What fraction is one hop? Tap it.", "cup:table"],
    ["Mimi walks on a line from zero to one. The line has {n} equal parts. She takes one step.", "What fraction is one step? Tap it.", "cookie:tray"],
    ["The line from zero to one has {n} equal parts. Mimi's first hop is one part long.", "What fraction is one hop? Tap it.", "cake:table"]
  ];
  const PARTS_BANK = [
    ["Look at the line from zero to one. It is cut into equal parts.", "How many equal parts are there? Type the number.", "cup:table"],
    ["Mimi hangs a ribbon from zero to one. It is cut into equal parts.", "How many equal parts is it cut into? Type the number.", "cake:table"],
    ["A number line goes from zero to one. The parts are equal.", "How many equal parts does it have? Type the number.", "cookie:tray"]
  ];
  const G3_FRACLINE_KIND = g3Kind({ name: "Cafe: fractions on a number line", group: "fractions", needs: ["cafe_frac.2", "sums.5"], choice: "mixed", lessonKind: "fraction_line" }, {
    LN: {
      n: 8, min: 4, gen: tb => ({ n: tb.pick([3, 4, 6, 8]) }), bank: PARTS_BANK, scene: lineup(1, "plate"),
      q: ({ n }) => ({ v: {}, nums: [], ans: n, eq: "parts = ?", fact: `The line is cut into ${n} equal parts.`, hint: "Count the spaces between the marks, not the marks.", key: `${n}`,
        figure: { t: "fracline", parts: n }, helpFig: { fig: { t: "fracline", parts: n, mark: n }, help: true }, slips: { count_marks: [n + 1] } }),
      les: ({ n }) => ["Count the spaces between the marks. Do not count the marks themselves.", `There are ${n} equal parts.`, `${n} parts`]
    },
    LU: {
      n: 40, min: 4, gen: tb => ({ n: tb.pick([3, 4, 6, 8]) }), bank: HOP_BANK, scene: lineup(1, "plate"),
      q: ({ n }) => ({ v: { n }, nums: [n], ...wordQ(fracOptions(toolbox(rng32(n * 17 + 5)), 1, n).map(fracLabel), 0), eq: "hop = ?", fact: `One of ${n} equal parts is ${fs(1, n)}.`, hint: "Count the equal parts of the whole line. One part is one over that number.", key: `${n}`,
        figure: { t: "fracline", parts: n, mark: 1 }, helpFig: { fig: { t: "fracline", parts: n, mark: 1 }, help: true } }),
      les: ({ n }) => [`The line from zero to one has ${n} equal parts. One hop is one part.`, `One of ${n} equal parts is ${fs(1, n)}.`, `1 of ${n}`]
    },
    LK: {
      n: 60, min: 8, gen: tb => { const n = tb.pick([3, 4, 6, 8]), k = tb.int(2, n - 1); return { n, k }; }, bank: LINE_BANK, scene: lineup(1, "plate"),
      q: ({ n, k }) => ({ v: {}, nums: [], ...wordQ(fracOptions(toolbox(rng32(n * 211 + k)), k, n).map(fracLabel), 0), eq: "fraction = ?", fact: `The dot is ${NUMW[k]} parts along a line of ${n} equal parts. That is ${fs(k, n)}.`,
        hint: "Count the equal parts in the whole line. That is the bottom number. Then count the parts from zero to the dot.", key: `${k}:${n}`, figure: { t: "fracline", parts: n, mark: k }, helpFig: { fig: { t: "fracline", parts: n, mark: k }, help: true } }),
      les: ({ n, k }) => [`Count the equal parts in the whole line. There are ${n}. Then count the parts from zero to the dot.`, `${NUMW[k]} parts out of ${n} is ${fs(k, n)}.`, `${k} of ${n}`]
    },
    LP: {
      n: 60, min: 8, gen: tb => { const n = tb.pick([4, 6, 8]), at = tb.shuffle(Array.from({ length: n - 1 }, (_, i) => i + 1)).slice(0, 3), t = tb.int(0, 2); return { n, at, t }; }, bank: LETTER_BANK, scene: lineup(1, "plate"),
      q: ({ n, at, t }) => Object.assign(wordQ(["A", "B", "C"].map(x => ({ word: x, say: x })), t), { v: { f: fs(at[t], n) }, nums: [], eq: "letter = ?", ordered: true, fact: `${["A", "B", "C"][t]} is ${NUMW[at[t]]} parts along a line of ${n} equal parts. That is ${fs(at[t], n)}.`,
        hint: "Count the equal parts in the whole line. Then count along from zero to find the fraction.", key: `${n}:${at.join("")}:${t}`, figure: { t: "fracline", parts: n, letters: at.map((x, i) => ({ at: x, ch: "ABC"[i] })) } }),
      les: ({ n, at, t }) => [`Count the equal parts in the whole line. There are ${n}. Count along from zero.`, `${["A", "B", "C"][t]} is at ${fs(at[t], n)}.`, `${at[t]} of ${n}`]
    }
  });

  const KINDS = {
    "cafe_tens.1": TENS_KIND,
    "cafe_times.1": timesKind("Cafe: equal groups of 2, 5 and 10", [2, 5, 10], 2, ["sums.3"]),
    "cafe_times.2": timesKind("Cafe: equal groups of 3 and 4", [3, 4], 3, ["cafe_times.1"]),
    "cafe_share.1": shareKind("Cafe: sharing by 2, 5 and 10", [2, 5, 10], 3, ["cafe_times.1"]),
    "cafe_share.2": shareKind("Cafe: sharing by 3 and 4", [3, 4], 3, ["cafe_share.1", "cafe_times.2"]),
    "cafe_money.1": COIN_KIND,
    "cafe_money.2": CHANGE_KIND,
    "cafe_time.1": HOURS_KIND,
    "cafe_frac.1": FRACTION_KIND,
    "kinder.count20": COUNT_KIND,
    "kinder.more_less": MORE_LESS_KIND,
    "kinder.compare": COMPARE_KIND,
    "kinder.make10": MAKE10_KIND,
    "kinder.bonds": BONDS_KIND,
    "knight_pattern.1": PATTERN_KIND,
    "knight_size.1": SIZE_KIND,
    "cafe_count.1": tapCountKind("Cafe: counting by tapping, up to 20", 3, 20, 1, []),
    "cafe_count.2": tapCountKind("Cafe: counting by tapping, up to 50", 21, 50, 2, ["cafe_count.1"]),
    "cafe_pattern.1": NUMPAT_KIND,
    "cafe_time.2": TIME2_KIND,
    "cafe_compare.1": G3_COMPARE_KIND,
    "cafe_order.1": G3_ORDER_KIND,
    "cafe_order.2": G3_STEP_KIND,
    "cafe_evenodd.1": G3_EVENODD_KIND,
    "cafe_estimate.1": G3_ROUND_KIND,
    "cafe_estimate.2": G3_ESTIMATE2_KIND,
    "cafe_estimate.3": G3_ESTIMATE3_KIND,
    "cafe_bills.1": G3_BILLS1_KIND,
    "cafe_bills.2": G3_BILLS2_KIND,
    "cafe_bills.3": G3_BILLS3_KIND,
    "cafe_measure.1": G3_UNITS_KIND,
    "cafe_measure.2": G3_READ_KIND,
    "cafe_measure.3": G3_MEASURE_CMP_KIND,
    "cafe_measure.4": G3_MEASURE_SUM_KIND,
    "cafe_solid.1": G3_SOLID_NAMES_KIND,
    "cafe_solid.2": G3_SOLID_PARTS_KIND,
    "cafe_graph.1": G3_PICTO_KIND,
    "cafe_graph.2": G3_BARS_KIND,
    "cafe_graph.3": G3_TALLY_KIND,
    "cafe_chance.1": G3_CHANCE1_KIND,
    "cafe_chance.2": G3_CHANCE2_KIND,
    "cafe_frac.2": G3_FRACNAME_KIND,
    "cafe_frac.3": G3_FRACCMP_KIND,
    "cafe_frac.4": G3_FRACSET_KIND,
    "cafe_frac.5": G3_FRACLINE_KIND
  };
  Object.keys(KINDS).forEach(id => Object.keys(KINDS[id].bank).forEach(t => {
    if (!KINDS[id].sceneRows || !KINDS[id].sceneRows[t] || KINDS[id].sceneRows[t].length !== KINDS[id].bank[t].length) throw new Error("KS: " + id + " needs one scene entry per " + t + " story");
  }));
  const kindCache = {};
  const kindAll = skill => kindCache[skill] || (kindCache[skill] = KINDS[skill].all());

  function buildKind(skill, p, ti, rng) {
    rng = rng || (() => .5);
    const K = KINDS[skill], tpl = K.bank[p.type][ti], d = K.q(p);
    const Q = { skill, theme: K.theme, tpl: `${skill}.${p.type}${ti + 1}`, type: p.type, p, a: d.start, op: d.op, result: d.end, ans: d.ans, missing: false,
      eq: d.eq, fact: d.fact, hint: d.hint, line: d.line, key: `${skill}:${p.type}:${d.key}`, scale: d.line.hi, nums: d.nums };
    Q.story = render(tpl[0], d.v); Q.ask = render(tpl[1], d.v);
    Q.scene = Object.assign(K.scene(p), sceneWords(K.sceneRows[p.type][ti]));
    Q.say = Q.story + " " + Q.ask;
    if (K.decorate) { K.decorate(Q, K.pOf ? K.pOf(p) : p, ti); Q.say = Q.story + " " + Q.ask; }   // pictures, a tray, names in the fact (round of 22 Oct 2026)
    Q.correct = "Correct! " + Q.fact;
    const tap = K.choice === "mixed" ? !!d.words : !!K.choice;      // "mixed" kinds: a question with word buttons is a tap question, the rest are typed (round of 23 Oct 2026, round 2)
    Q.kind = tap ? "choice" : "typed";
    if (tap) {
      const pool = [...new Set(d.pool)].filter(x => x !== Q.ans), picks = [];
      while (picks.length < (d.want || 2) && pool.length) picks.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
      const opts = [Q.ans, ...picks];
      for (let i = opts.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [opts[i], opts[j]] = [opts[j], opts[i]]; }
      if (K.ordered || d.ordered) opts.sort((x, y) => x - y);       // the chance words stay in the order of the scale
      Q.opts = opts;
    }
    return Q;
  }
  function makeKind(skill, rng, prevKey) {
    const K = KINDS[skill], types = Object.keys(K.bank);
    for (let i = 0; i < 4000; i++) {
      const type = types[Math.floor(rng() * types.length)], list = kindAll(skill).filter(p => p.type === type);
      const Q = buildKind(skill, list[Math.floor(rng() * list.length)], Math.floor(rng() * K.bank[type].length), rng);
      if (Q.key !== prevKey) return Q;
    }
    throw new Error("KS: could not avoid repeating " + prevKey);
  }
  function teachKind(Q, right) {
    const L = KINDS[Q.skill].lesson(Q.p, Q);
    const tail = Q.picOpts ? { say: right ? Q.fact : `${Q.fact} ${Q.tapSay}`, draw: [] }            // a picture answer cannot be written on the board
      : { say: right ? Q.fact : `${Q.fact} ${Q.kind === "typed" ? "Type" : "Tap"} ${Q.ans}.`, draw: [{ answer: true }] };
    const steps = L.steps.concat(tail);
    return { kind: L.kind, steps };
  }
  // Every question a kind can make (all numbers x every story of that type).
  function eachKindQuestion(skill, fn) {
    const K = KINDS[skill];
    kindAll(skill).forEach(p => K.bank[p.type].forEach((t, ti) => fn(buildKind(skill, p, ti))));
  }
  const OLD_SKILLS = SKILLS.slice();
  Object.keys(KINDS).forEach(id => SKILLS.push(id));
  const kindTheme = id => (KINDS[id] ? KINDS[id].theme : null);
  // A skill fits a theme when it has stories in that theme (the game marks the rest not ready for that child).
  const fits = (id, theme) => (KINDS[id] ? KINDS[id].theme === theme : OLD_SKILLS.includes(id) && THEMES.includes(theme));
  // New skills for the engine's skill map: KidsEngine.buildSkillMap(topics, KS.extraSkills()). Fresh objects each call.
  // Kept out of the game: plain counting (Aldrin, 19 Oct 2026: both children already count well; sums first, no counting games).
  const OFF = ["kinder.count20"];
  // Optional skills (Marie's counting by tapping): in the engine's skill map, but the game marks them ready only when a grown-up asks or
  // the record shows counting slips (game/counting_need.js). KS.fits is still true for her theme; the game checks KS.optional too.
  // A typed estimate is right anywhere in Q.range (round of 23 Oct 2026); every other answer must equal Q.ans. The game asks this one question.
  const isRight = (Q, given) => given === Q.ans || (Array.isArray(Q.range) && Number.isFinite(given) && given >= Q.range[0] && given <= Q.range[1]);
  const optional = id => !!(KINDS[id] && KINDS[id].optional);
  const extraSkills = () => Object.keys(KINDS).filter(id => !OFF.includes(id)).map(id => ({ id, name: KINDS[id].name, grade: KINDS[id].grade, group: KINDS[id].group,
    needs: KINDS[id].needs.slice(), play: { src: "story" }, ready: true }));

  /* ---------- every sentence and every piece ---------- */
  function addQuestionTexts(Q, put) {
    [Q.say, Q.correct, Q.fact, Q.hint].concat(Object.values(Q.optSay || {})).forEach(put);   // optSay: what Kennedy hears when he taps a picture
    [true, false].forEach(r => teach(Q, r).steps.forEach(s => put(s.say)));
  }
  let sentenceCache = null, pieceCache = null;
  function allSentences() {
    if (sentenceCache) return sentenceCache;
    const out = new Set();
    THEMES.forEach(theme => SMALL_SKILLS.forEach(skill => allPairs(skill).forEach(p => {
      usableList(theme, skill, p.op).forEach(tpl => addQuestionTexts(build(skill, theme, tpl, p.a, p.b), t => out.add(t)));
    })));
    Object.keys(KINDS).forEach(skill => eachKindQuestion(skill, Q => addQuestionTexts(Q, t => out.add(t))));   // Stage 3 kinds come last
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
      OLD_SKILLS.forEach(skill => structuralPairs(skill).forEach(p => {
        TEMPLATES[theme].filter(t => usable(t, skill, p.op)).filter((t, i, all) => all.findIndex(u => u.type === t.type) === i)
          .forEach(tpl => addQuestionTexts(build(skill, theme, tpl, p.a, p.b), put));
      }));
    });
    Object.keys(KINDS).forEach(skill => eachKindQuestion(skill, Q => addQuestionTexts(Q, put)));   // Stage 3: every question, so every piece
    pieceCache = [...out];
    return pieceCache;
  }

  const KS = { isRight, optional, PIC, TRAY_ART, SKILLS, THEMES, SCALE, WORDS, make, build, teach, sentences, pieces, templates: theme => TEMPLATES[theme].slice(), usable, allPairs, lineWindow,
    OLD_SKILLS, KIND_IDS: Object.keys(KINDS), SCENE_ACTS, SCENE_NOUNS, SCENE_WHO, fits, kindTheme, extraSkills, kindAll, buildKind, kindBank: id => KINDS[id].bank, eachKindQuestion };
  if (typeof module !== "undefined" && module.exports) module.exports = KS; else root.KS = KS;
})(typeof window !== "undefined" ? window : globalThis);
