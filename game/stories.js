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
  const SCENE_ACTS = ["add", "sub", "need", "left", "compare", "numeral", "groups", "share", "place", "bundle", "money", "change", "time", "fraction", "count", "more_less", "make10", "pattern", "size", "tap_count"];
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
    "cafe_time.2": TIME2_KIND
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
    Q.kind = K.choice ? "choice" : "typed";
    if (K.choice) {
      const pool = [...new Set(d.pool)].filter(x => x !== Q.ans), picks = [];
      while (picks.length < (d.want || 2) && pool.length) picks.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
      const opts = [Q.ans, ...picks];
      for (let i = opts.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [opts[i], opts[j]] = [opts[j], opts[i]]; }
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

  const KS = { optional, PIC, TRAY_ART, SKILLS, THEMES, SCALE, WORDS, make, build, teach, sentences, pieces, templates: theme => TEMPLATES[theme].slice(), usable, allPairs, lineWindow,
    OLD_SKILLS, KIND_IDS: Object.keys(KINDS), SCENE_ACTS, SCENE_NOUNS, SCENE_WHO, fits, kindTheme, extraSkills, kindAll, buildKind, kindBank: id => KINDS[id].bank, eachKindQuestion };
  if (typeof module !== "undefined" && module.exports) module.exports = KS; else root.KS = KS;
})(typeof window !== "undefined" ? window : globalThis);
