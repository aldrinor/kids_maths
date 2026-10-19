"""Add the Think tab (thinking games) and load the game modules. Run once from src/."""
from pathlib import Path

HERE = Path(__file__).parent


def patch(name, pairs):
    p = HERE / name
    s = p.read_text(encoding="utf-8")
    for a, b in pairs:
        assert s.count(a) == 1, f"{name}: NOT FOUND ONCE: {a[:80]}"
        s = s.replace(a, b)
    p.write_text(s, encoding="utf-8")


patch("kitty_world3.html", [
    ('<img src="art/sparkles.png" alt="">Maths</button>\n',
     '<img src="art/sparkles.png" alt="">Maths</button>\n'
     '    <button class="tab" role="tab" id="tabThink" aria-selected="false" aria-controls="viewThink" type="button"><img src="art/palette.png" alt="">Think</button>\n'),
    ('  <section class="view" id="viewHome"',
     '  <section class="view scroll" id="viewThink" role="tabpanel" aria-labelledby="tabThink" hidden></section>\n\n  <section class="view" id="viewHome"'),
    ('$("tabHome").onclick = () => showView("home");', '$("tabThink").onclick = () => showView("think");\n$("tabHome").onclick = () => showView("home");'),
    ('  if (window.KnightWorld) KnightWorld.unmount();\n',
     '  if (window.KnightWorld) KnightWorld.unmount();\n  if (window.ThinkTab) { if (v === "think") ThinkTab.mount($("viewThink")); else ThinkTab.unmount(); }\n'),
    ('`repeat(${p === "demo" ? 4 : 3}, minmax(0, 1fr))`', '`repeat(${p === "demo" ? 5 : 4}, minmax(0, 1fr))`'),
])
patch("integrate_topics.py", [
    ('[["sums", "tabSums", "viewSums"], ["maths", "tabMaths", "viewMaths"], ["home", "tabHome", "viewHome"], ["grown", "tabGrown", "viewGrown"]]',
     '[["sums", "tabSums", "viewSums"], ["maths", "tabMaths", "viewMaths"], ["think", "tabThink", "viewThink"], ["home", "tabHome", "viewHome"], ["grown", "tabGrown", "viewGrown"]]'),
    ('<script src="modules/knight.js"></script>\\n',
     '<script src="modules/knight.js"></script>\\n<script src="modules/brain_games.js"></script>\\n<script src="modules/chess_coach.js"></script>\\n<script src="modules/think.js"></script>\\n'),
])
print("patched")
