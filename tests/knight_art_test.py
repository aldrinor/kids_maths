"""Silent check of the knight drawings (KnightArt): every id x pose, all knight option combinations, contact sheet, Kennedy profile.
Usage: python tests/knight_art_test.py [url]   (serves nothing itself; default http://localhost:8770/index.html)
One line per check. Writes knight_sheet.png in the repo root."""
import itertools
import json
import sys
from playwright.sync_api import sync_playwright

URL = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8770/index.html"
ROOT = __file__.replace("\\", "/").rsplit("/", 2)[0]
STUB = ("window.speechSynthesis={speak(){},cancel(){},getVoices(){return[]},pause(){},resume(){}};"
        "window.SpeechSynthesisUtterance=function(){};window.AudioContext=window.webkitAudioContext=undefined;window.__cookAutoPlay=true;")
POSES = {"knight": ["stand", "wave", "happy", "push", "cheer"], "buddy": ["stand", "wave", "happy", "push", "cheer"],
         "badguy": ["stand", "grumpy", "tired", "runaway"], "horse": ["stand", "happy"]}
res = []


def ok(name, cond, extra=""):
    res.append(bool(cond))
    print(("PASS " if cond else "FAIL ") + name + (" | " + str(extra) if not cond and extra != "" else ""))


SHEET_JS = r"""(args) => {
  const K = window.KnightArt; const rows = [];
  const cell = (label, svg, w) => `<div style="display:inline-block;margin:4px;text-align:center;font:12px sans-serif;vertical-align:top"><div style="width:${w}px;background:#e8f2fb;border:1px solid #999">${svg}</div>${label}</div>`;
  let html = '<div style="background:#fff;padding:6px;width:1500px">';
  const checks = [];
  for (const [id, poses] of Object.entries(args.poses)) for (const pose of poses) {
    const s = K.full(id, pose, {});
    const d = new DOMParser().parseFromString(s, 'image/svg+xml');
    const svg = d.documentElement;
    checks.push({name: `${id}/${pose}`, ok: svg.nodeName === 'svg' && !d.querySelector('parsererror'), vb: svg.getAttribute('viewBox')});
    html += cell(id + ' ' + pose, s, id === 'horse' ? 260 : 200);
  }
  html += '<hr>';
  const ids = Array.from(document.querySelectorAll('[id]')).map(e => e.id);
  let n = 0;
  for (const c of args.combos) {
    const s = K.full('knight', 'stand', c);
    const svg = new DOMParser().parseFromString(s, 'image/svg+xml').documentElement;
    checks.push({name: 'knight opts ' + JSON.stringify(c), ok: svg.nodeName === 'svg', vb: svg.getAttribute('viewBox')});
    html += cell(JSON.stringify(c).replace(/"/g, '').slice(0, 46), s, 130);
    n++;
  }
  html += '<hr>';
  for (const id of ['knight', 'buddy', 'badguy', 'horse']) {
    const f = K.face(id);
    checks.push({name: 'face ' + id, ok: f.startsWith('<svg') && /viewBox="[-\d. ]+"/.test(f), vb: 'face'});
    html += cell('face ' + id + ' 40', f, 40) + cell('face ' + id + ' 100', f, 100);
  }
  html += '<hr>';
  for (const pose of ['stand', 'wave', 'push']) html += cell('buddy ' + pose + ' 40px', K.full('buddy', pose, {}), 40);
  html += cell('knight 40px', K.full('knight', 'stand', {plume: true, shield: true, sword: 'wood'}), 40);
  html += cell('badguy 40px', K.full('badguy', 'grumpy'), 40);
  html += '</div>';
  document.body.innerHTML = html;
  return checks;
}"""

with sync_playwright() as p:
    b = p.chromium.launch(args=["--mute-audio"])
    pg = b.new_page(viewport={"width": 1520, "height": 1200})
    pg.add_init_script(STUB)
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(URL)
    pg.wait_for_timeout(1200)
    ok("KnightArt is loaded", pg.evaluate("()=>typeof window.KnightArt==='object' && typeof KnightArt.full==='function' && typeof KnightArt.face==='function'"))
    pg.click('[data-p="kennedy"]')
    pg.wait_for_timeout(400)
    ok("Kennedy profile opens", pg.is_visible("#tabHome"))
    ok("no page errors after opening Kennedy", not errs, errs[:3])
    combos = [dict(armour=a, plume=pl, shield=sh, sword=sw) for a, pl, sh, sw in itertools.product([False, True], [False, True], [False, True], ["none", "wood", "silver"])]
    checks = pg.evaluate(SHEET_JS, {"poses": POSES, "combos": combos})
    for c in checks:
        want_vb = "0 0 260 260" if c["name"].startswith("horse") else "0 0 200 260"
        if c["name"].startswith("face") or c["name"].startswith("knight opts"):
            ok("returns svg: " + c["name"], c["ok"])
        else:
            ok("svg + viewBox: " + c["name"], c["ok"] and c["vb"] == want_vb, c)
    pg.wait_for_timeout(300)
    pg.screenshot(path=ROOT + "/knight_sheet.png", full_page=True)
    ok("contact sheet saved", True)
    b.close()
print(f"RESULT {sum(res)}/{len(res)} passed")
