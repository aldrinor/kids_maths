"""Add the Grade 1-3 maths topics (topics/*.js) and their host (modules/topic_host.js) to the game:
kitty_world3.html -> kitty_world4.html. A new "Maths" tab shows the topic map; a topic plays full screen."""
from pathlib import Path

HERE = Path(__file__).parent
s = (HERE / "kitty_world3.html").read_text(encoding="utf-8")
TOPIC_FILES = ["numbers", "groups", "money", "fractions", "time_measure", "shapes_data"]


def rep(old, new, count=1):
    global s
    assert s.count(old) >= 1, "NOT FOUND: " + old[:100]
    s = s.replace(old, new, count)


# 1. A fourth tab, "Maths", and its view.
rep('<img src="art/sparkles.png" alt="">Maths</button>\n',
    '<img src="art/sparkles.png" alt="">Maths</button>\n'
    '    <button class="tab" role="tab" id="tabMaths" aria-selected="false" aria-controls="viewMaths" type="button" hidden><img src="art/pie.png" alt="">All games</button>\n')
rep('  <section class="view" id="viewHome"',
    '  <section class="view scroll" id="viewMaths" role="tabpanel" aria-labelledby="tabMaths" hidden></section>\n\n  <section class="view" id="viewHome"')
rep('.tabs { flex: none; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }',
    '.tabs { flex: none; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }')
rep('#tabHome[aria-selected="true"] { background: var(--mint); color: #fff; }',
    '#tabHome[aria-selected="true"] { background: var(--mint); color: #fff; }\n#tabMaths[aria-selected="true"] { background: var(--sky); color: #fff; }')
# Phones: icon above a short word, so four equal tabs fit at 320 px.
rep('.tab { font-size: 16px; gap: 4px; } .tab img { width: 24px; height: 24px; } }',
    '.tab { font-size: 14px; line-height: 1; gap: 1px; flex-direction: column; padding: 2px; } .tab img { width: 24px; height: 24px; } }\n'
    '@media (max-width: 360px) { .tabs { gap: 6px; } .tabs .tab { font-size: 11.5px; letter-spacing: -.3px; padding: 0; } }')

# 2. Load the topic modules and the host after the cooking module.
rep('<script src="modules/cook.js"></script>\n',
    '<script src="modules/cook.js"></script>\n' + "".join(f'<script src="topics/{t}.js"></script>\n' for t in TOPIC_FILES) +
    '<script src="modules/topic_host.js"></script>\n<script src="modules/engine.js"></script>\n<script src="modules/mission.js"></script>\n<script src="modules/parent.js"></script>\n<script src="modules/sync.js"></script>\n')

# 3. Saved progress: per-topic levels and counts. Cloud copy wins when it holds more answered questions in all.
rep('home: [{ uid: 1, id: "kitty", x: 40, y: 90 }, { uid: 2, id: "plant", x: 84, y: 72 }], homeSeq: 2 };',
    'home: [{ uid: 1, id: "kitty", x: 40, y: 90 }, { uid: 2, id: "plant", x: 84, y: 72 }], homeSeq: 2, topics: {}, tq: 0, tqFirst: 0 };')
rep('  if (!Array.isArray(P.round) || P.round.length >= COOK_EVERY) P.round = [];',
    '  if (!Array.isArray(P.round) || P.round.length >= COOK_EVERY) P.round = [];\n  if (!P.topics || typeof P.topics !== "object") P.topics = {};')
rep('    if (remote && (remote.total || 0) > (P.total || 0)) {', '    if (remote && work(remote) > work(P)) {')
rep('    if (!remote || (remote.total || 0) < (P.total || 0)) pushCloud();', '    if (!remote || work(remote) < work(P)) pushCloud();')
rep('async function connectCloud() {', 'const work = o => (o.total || 0) + (o.tq || 0);\nasync function connectCloud() {')
rep('      if (window.HomeGame) HomeGame.refresh();\n    }', '      if (window.HomeGame) HomeGame.refresh();\n      if (window.TopicHost) TopicHost.refresh();\n    }')

# 4. The daily goal counts sums and topic questions together.
rep('  const goalBefore = d.n >= P.goal;', '  const goalBefore = d.n + (d.t || 0) >= P.goal;')
rep('  if (!goalBefore && d.n >= P.goal) { P.crowns++; addStars(10); big = true; notes.push(`${P.goal} sums today! You win a crown.`); }',
    '  if (!goalBefore && d.n + (d.t || 0) >= P.goal) { P.crowns++; addStars(10); big = true; notes.push(`${P.goal} questions today! You win a crown.`); }')

# 5. Switching tabs: pause the sums between questions, and show the topic map.
rep('''function showView(v) {
  view = v;
  for (const [n, t, p] of [["sums", "tabSums", "viewSums"], ["home", "tabHome", "viewHome"], ["grown", "tabGrown", "viewGrown"]]) { $(t).setAttribute("aria-selected", String(n === v)); $(p).hidden = n !== v; }''',
    '''let resumeSums = false;
function showView(v) {
  if (view === "sums" && v !== "sums" && phase === "done") { clearTimers(); resumeSums = true; }
  if (v !== view) { try { speechSynthesis.cancel(); } catch (e) {} }
  view = v;
  for (const [n, t, p] of [["sums", "tabSums", "viewSums"], ["maths", "tabMaths", "viewMaths"], ["home", "tabHome", "viewHome"], ["grown", "tabGrown", "viewGrown"]]) { $(t).setAttribute("aria-selected", String(n === v)); $(p).hidden = n !== v; }
  if (v === "maths") TopicHost.mount($("viewMaths"));
  if (v === "sums" && resumeSums) { resumeSums = false; nextQuestion(); }''')
rep('$("tabHome").onclick = () => showView("home");', '$("tabMaths").onclick = () => showView("maths");\n$("tabHome").onclick = () => showView("home");')

# 6. (The Parent area is now modules/parent.js; it lists every game's progress itself.)

# 7. Give the host what it needs from the game.
rep('renderPad();\n$("whoBtn")',
    '''TopicHost.init({ speak, tone, face, ART, save, addStars, renderTop, burst, pick, PRAISE, todayLog, dayKey,
  clearFx: () => { $("fx").innerHTML = ""; }, COOK_EVERY, LEVEL_UP_NEED, TEACH_AFTER_MISTAKES });
renderPad();
$("whoBtn")''')

(HERE / "kitty_world4.html").write_text(s, encoding="utf-8")
print("written", len(s))
