/* game_hint_ladder_test.js - checks game/hint_ladder.js: the nudges and the level-2 picture (it must not give the answer away).
   Silent: prints only failures and one RESULT line. Run: node tests/game_hint_ladder_test.js */
const path = require("path");
global.window = global;
global.document = { createElement: () => ({ style: {} }), querySelector: () => null, getElementById: () => null, addEventListener: () => {}, head: { appendChild() {} } };
require(path.join(__dirname, "../topics/kinder.js"));
const KS = require(path.join(__dirname, "../game/stories.js"));
const HL = require(path.join(__dirname, "../game/hint_ladder.js"));
let pass = 0, fail = 0;
const ok = (name, cond, extra) => { cond ? pass++ : (fail++, console.log("FAIL " + name + (extra !== undefined ? " | " + JSON.stringify(extra) : ""))); };
function seeded(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

ok("all fixed hint sentences have no digits", HL.sentences().every(s => !/\d/.test(s)), HL.sentences().filter(s => /\d/.test(s)));
ok("the fixed hint list is short", HL.sentences().length <= 14, HL.sentences().length);

let pics = 0, none = 0, n = 0;
for (const theme of ["cafe", "castle"]) for (const skill of KS.SKILLS) {
  if (!KS.fits(skill, theme)) continue;
  const rng = seeded(7 + skill.length);
  for (let i = 0; i < 60; i++) {
    let Q; try { Q = KS.make(skill, theme, rng); } catch (e) { break; }
    n++;
    ok(`nudge for ${skill} is a fixed sentence`, HL.sentences().includes(HL.nudge(Q)), HL.nudge(Q));
    const p = HL.picture(Q);
    if (!p) { none++; continue; }
    pics++;
    // level 2 must not give the answer away: no numerals, no hopper, no running count
    if (/<text/i.test(p.svg) && /<text[^>]*>\s*\d/.test(p.svg)) ok(`picture for ${skill} (${Q.eq}) has no numerals`, false, p.svg.slice(0, 200));
    if (/hopper|pawn|<image/.test(p.svg)) ok("picture shows no hopper", false);
    ok(`picture for ${skill} has a caption from the fixed list`, HL.sentences().includes(p.caption));
    // the picture shows the amounts of the story, nothing else: count the circles
    const dots = (p.svg.match(/<circle/g) || []).length;
    if (Q.scale <= 20 && Q.type !== "K") {
      const want = Q.type === "J" || Q.type === "P" || Q.type === "C" ? Q.a + Q.b : Q.type === "M" ? Q.result : Q.a;
      if (dots !== want) ok(`picture for ${skill} (${Q.eq}, type ${Q.type}) draws the amounts`, false, { dots, want });
    }
    if (Q.type === "K" && dots !== Q.a) ok("numeral picture draws the amount", false, { dots, a: Q.a });
  }
}
ok("most small questions get a picture", pics > none, { pics, none, n });
ok("a Stage 3 kind has no simple picture (the game points at the scene)", HL.picture(KS.make("cafe_times.1", "cafe", seeded(3))) === null);
ok("a parent's own question has no picture", HL.picture({ parent: {}, a: 3 }) === null);
{ const Q = KS.make("sums.9", "cafe", seeded(4)), p = HL.picture(Q);
  ok("three-digit sums get a block picture with no numbers", p && /<rect/.test(p.svg) && !/<text/.test(p.svg), p && p.svg.slice(0, 120)); }
console.log(`RESULT ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
