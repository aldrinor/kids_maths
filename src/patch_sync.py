"""Connect sync.js: save() schedules a backup, a cleared device restores from Google, the Parent area gets the setup
code field, and the build loads sync.js. Engine notes the day a skill is learnt. Run once from src/."""
from pathlib import Path

HERE = Path(__file__).parent


def patch(name, pairs):
    p = HERE / name
    s = p.read_text(encoding="utf-8")
    for a, b in pairs:
        assert s.count(a) == 1, f"{name}: NOT FOUND ONCE: {a[:80]}"
        s = s.replace(a, b)
    p.write_text(s, encoding="utf-8")


patch("modules/engine.js", [
    ("if (fast || s.streak >= R.streakNeed) { s.lvl = LV.KNOWS;", "if (fast || s.streak >= R.streakNeed) { s.lvl = LV.KNOWS; s.learntAt = now;"),
    ("if (rightN >= 4) { s.lvl = LV.SURE;", "if (rightN >= 4) { s.lvl = LV.SURE; s.sureAt = now;"),
])
patch("kitty_world3.html", [
    ("function save() {\n  try { localStorage.setItem(LS_KEY, JSON.stringify(P)); } catch (e) {}",
     "function save() {\n  try { localStorage.setItem(LS_KEY, JSON.stringify(P)); } catch (e) {}\n  if (window.KidsSync) KidsSync.soon();"),
    ("    adopt(null); loadLocal();\n",
     "    adopt(null);\n"
     "    let had = false; try { had = !!localStorage.getItem(LS_KEY); } catch (e) {}\n"
     "    loadLocal();\n"
     "    // A cleared iPad: bring the progress back from the family's Google backup.\n"
     "    if (!had && window.KidsSync && KidsSync.connected() && p !== \"demo\") KidsSync.restore(p).then(st => { if (st && who === p && !(P.days && Object.keys(P.days).length)) { adopt(st); try { localStorage.setItem(LS_KEY, JSON.stringify(P)); } catch (e) {} if (window.HomeGame) HomeGame.refresh(); showStart(); } });\n"),
])
patch("modules/parent.js", [
    ('      <section><h3>Daily email</h3><p>${window.KidsSync && KidsSync.status ? esc(KidsSync.status()) : "Not set up yet. Progress is saved on this iPad only for now."}</p></section>',
     '      <section><h3>Daily email and backup</h3><p>${esc(KidsSync.status())}</p>\n'
     '        ${KidsSync.connected() ? `<div class="set"><button class="mini" id="pSyncNow" type="button">Save to Google now</button><button class="mini" id="pMailPreview" type="button">Show today\'s email</button></div><pre id="pMail" style="white-space:pre-wrap"></pre>`\n'
     '          : `<div class="set"><label for="pCode">Setup code (starts with KM1)</label><input id="pCode" autocomplete="off" style="width:100%"><button class="mini" id="pCodeOk" type="button">Connect</button></div><p id="pCodeMsg" aria-live="polite"></p>`}</section>'),
    ('    $e("#voiceChk").onchange',
     '    if (KidsSync.connected()) {\n'
     '      $e("#pSyncNow").onclick = async () => { await KidsSync.now(); redo(); };\n'
     '      $e("#pMailPreview").onclick = () => { const d = (P.days || {})[KidsEngine.dayKey(Date.now())]; $e("#pMail").textContent = d && d.n ? KidsSync.summary().text : "No play today, so no email today."; };\n'
     '    } else $e("#pCodeOk").onclick = () => { if (KidsSync.setCode($e("#pCode").value)) redo(); else $e("#pCodeMsg").textContent = "That code does not look right. It starts with KM1 and has no spaces."; };\n'
     '    $e("#voiceChk").onchange'),
])
patch("integrate_topics.py", [
    ('<script src="modules/parent.js"></script>\\n', '<script src="modules/parent.js"></script>\\n<script src="modules/sync.js"></script>\\n'),
])
print("patched")
