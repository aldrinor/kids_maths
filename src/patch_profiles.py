"""Phase 0 of Kids Maths: new name, profile screen (Marie, Kennedy, Parent), a separate save per child,
and a 4-number parent code in front of the Parent area. Edits kitty_world3.html in place."""
from pathlib import Path

P = Path(__file__).parent / "kitty_world3.html"
s = P.read_text(encoding="utf-8")


def rep(old, new):
    global s
    assert s.count(old) == 1, "NOT FOUND ONCE: " + old[:90]
    s = s.replace(old, new)


# Our own drawings (not Sanrio): a white cat with a flower and a smile, and a friendly knight.
CAT = ('<svg viewBox="0 0 100 100" aria-hidden="true">'
       '<path d="M17 44 L21 9 L44 27 Z" fill="#fff" stroke="#3b2a33" stroke-width="3" stroke-linejoin="round"/>'
       '<path d="M83 44 L79 9 L56 27 Z" fill="#fff" stroke="#3b2a33" stroke-width="3" stroke-linejoin="round"/>'
       '<path d="M24 32 L25 18 L36 27 Z" fill="#ffc2d4"/><path d="M76 32 L75 18 L64 27 Z" fill="#ffc2d4"/>'
       '<ellipse cx="50" cy="58" rx="38" ry="31" fill="#fff" stroke="#3b2a33" stroke-width="3"/>'
       '<g fill="#ff9fbd" stroke="#3b2a33" stroke-width="1.5"><circle cx="22" cy="17" r="6"/><circle cx="32" cy="15" r="6"/>'
       '<circle cx="35" cy="25" r="6"/><circle cx="26" cy="30" r="6"/><circle cx="18" cy="26" r="6"/></g>'
       '<circle cx="27" cy="23" r="4.5" fill="#ffd45c" stroke="#3b2a33" stroke-width="1.5"/>'
       '<ellipse cx="37" cy="58" rx="4.5" ry="6" fill="#3b2a33"/><ellipse cx="63" cy="58" rx="4.5" ry="6" fill="#3b2a33"/>'
       '<circle cx="38.6" cy="55.6" r="1.6" fill="#fff"/><circle cx="64.6" cy="55.6" r="1.6" fill="#fff"/>'
       '<circle cx="27" cy="69" r="5" fill="#ffc2d4"/><circle cx="73" cy="69" r="5" fill="#ffc2d4"/>'
       '<ellipse cx="50" cy="66" rx="3.2" ry="2.3" fill="#ff8fb1"/>'
       '<path d="M45 71 Q50 75 55 71" fill="none" stroke="#3b2a33" stroke-width="2.2" stroke-linecap="round"/>'
       '<g stroke="#3b2a33" stroke-width="2" stroke-linecap="round"><path d="M8 60 L20 62"/><path d="M9 70 L20 68"/>'
       '<path d="M92 60 L80 62"/><path d="M91 70 L80 68"/></g></svg>')
KNIGHT = ('<svg viewBox="0 0 100 100" aria-hidden="true">'
          '<path d="M50 15 Q58 1 77 5 Q66 9 57 19 Z" fill="#4f7ff0" stroke="#3b2a33" stroke-width="2.5" stroke-linejoin="round"/>'
          '<path d="M16 60 Q16 15 50 14 Q84 15 84 60 Q84 92 50 93 Q16 92 16 60 Z" fill="#cfd8e4" stroke="#3b2a33" stroke-width="3"/>'
          '<rect x="29" y="35" width="42" height="42" rx="17" fill="#ffd9bd" stroke="#3b2a33" stroke-width="3"/>'
          '<path d="M50 15 V35" stroke="#3b2a33" stroke-width="2.5"/>'
          '<circle cx="41" cy="53" r="3.6" fill="#3b2a33"/><circle cx="59" cy="53" r="3.6" fill="#3b2a33"/>'
          '<circle cx="42.2" cy="51.8" r="1.2" fill="#fff"/><circle cx="60.2" cy="51.8" r="1.2" fill="#fff"/>'
          '<circle cx="35" cy="63" r="4" fill="#ffb3a7"/><circle cx="65" cy="63" r="4" fill="#ffb3a7"/>'
          '<path d="M43 64 Q50 70 57 64" fill="none" stroke="#3b2a33" stroke-width="2.4" stroke-linecap="round"/>'
          '<circle cx="22" cy="62" r="2.5" fill="#3b2a33"/><circle cx="78" cy="62" r="2.5" fill="#3b2a33"/></svg>')
LOCK = ('<svg viewBox="0 0 100 100" aria-hidden="true">'
        '<path d="M32 46 V34 Q32 16 50 16 Q68 16 68 34 V46" fill="none" stroke="#3b2a33" stroke-width="7" stroke-linecap="round"/>'
        '<rect x="20" y="44" width="60" height="44" rx="12" fill="#b9a6f2" stroke="#3b2a33" stroke-width="3"/>'
        '<path d="M50 78 C38 70 36 62 42 58 C46 55 50 58 50 61 C50 58 54 55 58 58 C64 62 62 70 50 78 Z" fill="#fff" stroke="#3b2a33" stroke-width="2"/></svg>')

# 1. Name and header.
rep("<title>Kitty Number Blocks</title>", "<title>Kids Maths</title>")
rep("    <h1>Kitty Number Blocks</h1>\n",
    '    <h1><button class="who" id="whoBtn" type="button" aria-label="Change who is playing"><span class="who-pic" id="whoPic"></span>'
    '<span class="who-name"><span class="brand">Kids Maths</span> <span id="whoName"></span></span></button></h1>\n')
rep('<img src="art/crown.png" alt="">Grown-ups</button>', '<img src="art/crown.png" alt="">Parent</button>')

# 2. The profile screen (and the parent code panel) sit above everything.
rep('<div class="app">\n',
    '<div class="profiles" id="profiles" role="dialog" aria-modal="true" aria-labelledby="profTitle" hidden></div>\n<div class="app">\n')

CSS = '''
.profiles { position: fixed; inset: 0; z-index: 60; display: grid; place-items: center; padding: 16px; background: #fff7fa; overflow: auto; }
.profiles[hidden] { display: none !important; }
.prof-card { width: min(560px, 100%); text-align: center; }
.prof-card h2 { margin: 0 0 4px; font: 800 clamp(34px, 8vw, 48px)/1.05 var(--display); color: var(--ink); }
.prof-card > p { margin: 0 0 18px; font-weight: 800; color: var(--soft-ink); font-size: 18px; }
.prof-list { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
.prof { display: grid; justify-items: center; gap: 6px; padding: 12px 6px; border: 3px solid var(--ink); border-radius: 22px; background: var(--cream); box-shadow: 0 4px 0 var(--ink); font: 800 20px/1.1 var(--display); color: var(--ink); }
.prof:active { transform: translateY(3px); box-shadow: 0 1px 0 var(--ink); }
.prof svg { width: min(110px, 22vw); height: min(110px, 22vw); }
.prof:focus-visible, .who:focus-visible { outline: 4px solid #4f7ff0; outline-offset: 3px; }
.pin { display: grid; gap: 10px; justify-items: center; }
.pin label { font-weight: 800; font-size: 18px; }
.pin input { width: 8ch; font: 800 32px/1 var(--display); text-align: center; letter-spacing: 6px; padding: 8px; border: 3px solid var(--ink); border-radius: 14px; }
.pin .row { display: flex; gap: 10px; }
.pin-msg { min-height: 1.4em; font-weight: 800; color: #c0305c; margin: 0; }
.who { display: flex; align-items: center; gap: 8px; padding: 0; border: 0; background: none; font: inherit; color: inherit; cursor: pointer; text-align: left; }
.who-pic svg { width: 34px; height: 34px; display: block; }
.who-name .brand { color: var(--soft-ink); }
@media (max-width: 500px) { .prof { font-size: 17px; } .who-name .brand { display: none; } }
'''
rep("</style>", CSS + "</style>", ) if s.count("</style>") == 1 else None
if CSS not in s:
    i = s.index("</style>")
    s = s[:i] + CSS + s[i:]

# 3. One save per child. Marie keeps the key she already has, so her stars and home stay.
rep('const LS_KEY = "kittyBlocks.progress";',
    'const PROFILES = {\n'
    '  marie: { name: "Marie", key: "kittyBlocks.progress", doc: "blocks", pic: `' + CAT + '` },\n'
    '  kennedy: { name: "Kennedy", key: "kidsMaths.kennedy", doc: "blocks_kennedy", pic: `' + KNIGHT + '` }\n'
    '};\n'
    'const PARENT_PIC = `' + LOCK + '`;\n'
    'let who = null, LS_KEY = PROFILES.marie.key, parentUntil = 0;')
rep('const ref = db.doc("data/users/" + id + "/blocks");',
    'const ref = db.doc("data/users/" + id + "/" + PROFILES[who].doc);')

# 4. The start card shows the child's own picture and name.
rep('<div class="hello">${["kitty", "melody", "kuromi", "purin", "cinna"].map(faceSVG).join("")}</div><h2>Kitty Number Blocks</h2>',
    '<div class="hello">${PROFILES[who].pic}</div><h2>${PROFILES[who].name}\'s Maths</h2>')

# 5. The Parent tab needs the parent code.
rep('$("tabGrown").onclick = () => showView("grown");', '$("tabGrown").onclick = () => parentGate(() => showView("grown"));')

# 6. Start on the profile screen.
rep("loadLocal();\nrenderPad();\nshowStart();\nconnectCloud();\n",
    r'''renderPad();
$("whoBtn").onclick = () => showProfiles();
showProfiles();

/* ----- Profiles: who is playing, and the parent code ----- */
function showProfiles() {
  const box = $("profiles"); box.hidden = false;
  box.innerHTML = `<div class="prof-card"><h2 id="profTitle">Kids Maths</h2><p>Who is playing?</p><div class="prof-list">
    <button class="prof" type="button" data-p="marie">${PROFILES.marie.pic}Marie</button>
    <button class="prof" type="button" data-p="kennedy">${PROFILES.kennedy.pic}Kennedy</button>
    <button class="prof" type="button" data-p="parent">${PARENT_PIC}Parent</button></div></div>`;
  box.querySelectorAll("[data-p]").forEach(b => b.onclick = () => {
    const p = b.dataset.p;
    if (p === "parent") parentGate(pickChildForParent); else startAs(p);
  });
  box.querySelector("[data-p]").focus();
}
function startAs(p, thenView) {
  if (window.speechSynthesis) speechSynthesis.cancel();
  if (who !== p) {
    who = p; LS_KEY = PROFILES[p].key;
    clearTimeout(cloud.timer); cloud.ref = null; cloud.on = false;
    adopt(null); loadLocal();
    if (window.HomeGame) HomeGame.refresh();
    connectCloud();
  }
  $("whoPic").innerHTML = PROFILES[p].pic; $("whoName").textContent = PROFILES[p].name;
  $("profiles").hidden = true; $("profiles").innerHTML = "";
  showStart();
  showView(thenView || "sums");
}
function pickChildForParent() {
  const box = $("profiles");
  box.innerHTML = `<div class="prof-card"><h2 id="profTitle">Parent</h2><p>Whose settings and progress?</p><div class="prof-list" style="grid-template-columns:repeat(2,minmax(0,1fr))">
    <button class="prof" type="button" data-c="marie">${PROFILES.marie.pic}Marie</button>
    <button class="prof" type="button" data-c="kennedy">${PROFILES.kennedy.pic}Kennedy</button></div></div>`;
  box.querySelectorAll("[data-c]").forEach(b => b.onclick = () => startAs(b.dataset.c, "grown"));
  box.querySelector("[data-c]").focus();
}
// A simple lock so the children cannot change their own level. Not a strong password.
const PIN_KEY = "kidsMaths.parentCode";
const pinHash = t => { let h = 5381; for (const c of "kids-maths:" + t) h = ((h * 33) ^ c.charCodeAt(0)) >>> 0; return String(h); };
function parentGate(done) {
  if (Date.now() < parentUntil) return done();
  let saved = null; try { saved = localStorage.getItem(PIN_KEY); } catch (e) {}
  const box = $("profiles"); box.hidden = false;
  let first = "";
  const ask = (title, label) => {
    box.innerHTML = `<div class="prof-card"><h2 id="profTitle">${title}</h2><form class="pin" id="pinForm">
      <label for="pinIn">${label}</label><input id="pinIn" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="off">
      <p class="pin-msg" id="pinMsg" aria-live="assertive"></p>
      <div class="row"><button class="main-btn" type="submit">OK</button><button class="main-btn" type="button" id="pinBack">Back</button></div></form></div>`;
    $("pinIn").focus();
    $("pinBack").onclick = () => { if (who) { box.hidden = true; box.innerHTML = ""; } else showProfiles(); };
    $("pinForm").onsubmit = e => { e.preventDefault(); check($("pinIn").value.trim()); };
  };
  const bad = m => { $("pinMsg").textContent = m; $("pinIn").value = ""; $("pinIn").focus(); };
  const check = v => {
    if (!/^\d{4}$/.test(v)) return bad("Please type 4 numbers.");
    if (saved) { if (pinHash(v) !== saved) return bad("That code is not right. Try again."); }
    else if (!first) { first = v; return ask("Parent code", "Type the same 4 numbers again to check."); }
    else if (v !== first) { first = ""; return ask("Parent code", "The two codes were different. Make a 4-number parent code."); }
    else { saved = pinHash(v); try { localStorage.setItem(PIN_KEY, saved); } catch (e) {} }
    parentUntil = Date.now() + 10 * 60 * 1000;   // stays open for 10 minutes
    done();
  };
  if (saved) ask("Parent", "Type the 4-number parent code."); else ask("Parent code", "Make a 4-number parent code. The children should not see it.");
}
''')

P.write_text(s, encoding="utf-8")
print("patched", len(s))
