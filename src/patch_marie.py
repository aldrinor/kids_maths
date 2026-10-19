"""Connect marie_world.js: Marie's Home tab shows House, Garden and Pet; every 5 answers a cafe customer comes
before the cooking. Run once from src/."""
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
    ('  else if (v === "home") HomeGame.mount($("viewHome"), { artBase: "art2/" }); else if (window.HomeGame) HomeGame.unmount();',
     '  else if (v === "home") MarieWorld.mount($("viewHome")); else { if (window.MarieWorld) MarieWorld.unmount(); else if (window.HomeGame) HomeGame.unmount(); }'),
])
patch("modules/mission.js", [
    ("    closeTopic(); showView(\"sums\"); $(\"cover\").hidden = true;\n    startCooking();",
     "    closeTopic();\n    if (window.MarieWorld) return MarieWorld.customer(html => card(html), () => { $(\"cover\").hidden = true; startCooking(); });\n    showView(\"sums\"); $(\"cover\").hidden = true;\n    startCooking();"),
])
patch("integrate_topics.py", [
    ('<script src="modules/knight.js"></script>\\n', '<script src="modules/knight.js"></script>\\n<script src="modules/marie_world.js"></script>\\n'),
])
print("patched")
