"""Connect knight.js: the battle bar in Kennedy's sessions, the win card with our drawings, castle defence after
20 answers a day, and the Castle tab in place of Home for Kennedy. Run once from src/."""
from pathlib import Path

HERE = Path(__file__).parent


def patch(name, pairs):
    p = HERE / name
    s = p.read_text(encoding="utf-8")
    for a, b in pairs:
        assert s.count(a) == 1, f"{name}: NOT FOUND ONCE: {a[:80]}"
        s = s.replace(a, b)
    p.write_text(s, encoding="utf-8")


patch("modules/mission.js", [
    # the bar shows how tired the bad guy is
    ("      P.round.push(clean ? 1 : 0); inSet++; i++;\n",
     "      P.round.push(clean ? 1 : 0); inSet++; i++;\n      if (who === \"kennedy\" && window.KnightWorld) KnightWorld.showBar(inSet);\n"),
    ("    start() { this.on = true; lastTouch = now(); inSet = P.round.length % SET;",
     "    start() { this.on = true; lastTouch = now(); inSet = P.round.length % SET; if (who === \"kennedy\" && window.KnightWorld) KnightWorld.showBar(inSet);"),
    ("    pause() { this.on = false; this.sumsLevel = 0; closeTopic(); showStart(); },",
     "    pause() { this.on = false; this.sumsLevel = 0; closeTopic(); if (window.KnightWorld) KnightWorld.hideBar(); showStart(); },"),
    ("    Mission.on = false; closeTopic();\n    card(",
     "    Mission.on = false; closeTopic(); if (window.KnightWorld) KnightWorld.hideBar();\n    card("),
    # the win card uses our own drawings, then castle defence once a day after 20 answers
    ("    card(`<div class=\"hello\">${PROFILES.kennedy.pic}${BADGUY}</div><h2>You beat the bad guy!</h2>",
     "    KnightWorld.hideBar();\n    card(`<div class=\"hello\">${KnightWorld.knightSVG(70)}${KnightWorld.badSVG(5, 70)}</div><h2>You beat the bad guy!</h2>"),
    ("    $(\"winNext\").onclick = () => { $(\"cover\").hidden = true; Mission.afterReward(); };",
     "    $(\"winNext\").onclick = () => {\n"
     "      const d = dayLog();\n"
     "      if (d.n >= 20 && !d.defended) {                  // castle defence: once a day, after 20 answers\n"
     "        const known = [9, 8, 7, 6, 5, 4, 3, 2, 1].find(l => (eng().skills[\"sums.\" + l]?.lvl || 0) >= 3) || 1;\n"
     "        return KnightWorld.defence($(\"cover\"), Math.min(known, 4), () => { d.defended = true; save(); $(\"cover\").hidden = true; Mission.afterReward(); });\n"
     "      }\n"
     "      $(\"cover\").hidden = true; KnightWorld.showBar(0); Mission.afterReward();\n"
     "    };"),
])
patch("kitty_world3.html", [
    ('  if (v === "home") HomeGame.mount($("viewHome"), { artBase: "art2/" }); else if (window.HomeGame) HomeGame.unmount();',
     '  // Home is Marie\'s house; for Kennedy the same tab is his castle.\n'
     '  if (window.KnightWorld) KnightWorld.unmount();\n'
     '  if (v === "home" && who === "kennedy") { if (window.HomeGame) HomeGame.unmount(); KnightWorld.mount($("viewHome")); }\n'
     '  else if (v === "home") HomeGame.mount($("viewHome"), { artBase: "art2/" }); else if (window.HomeGame) HomeGame.unmount();'),
    ('  $("whoPic").innerHTML = PROFILES[p].pic; $("whoName").textContent = PROFILES[p].name;\n',
     '  $("whoPic").innerHTML = PROFILES[p].pic; $("whoName").textContent = PROFILES[p].name;\n'
     '  $("tabHome").lastChild.textContent = p === "kennedy" ? "Castle" : "Home";\n'
     '  if (window.KnightWorld && p !== "kennedy") KnightWorld.hideBar();\n'),
])
patch("integrate_topics.py", [
    ('<script src="modules/sync.js"></script>\\n', '<script src="modules/sync.js"></script>\\n<script src="modules/knight.js"></script>\\n'),
])
print("patched")
