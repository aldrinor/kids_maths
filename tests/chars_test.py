"""Silent browser test for the original characters (Mimi, Bella, Lulu, Momo, Puff).

Needs a server on port 8767 from the repo folder:  python -m http.server 8767
Usage: python tests/chars_test.py [base_url]
Writes chars_sheet.png (contact sheet of every character in every pose) to the repo root.
"""
import os
import sys

from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8767/index.html"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHEET = os.path.join(ROOT, "chars_sheet.png")
EXPECTED_NAMES = {"kitty": "Mimi", "melody": "Bella", "kuromi": "Lulu", "purin": "Momo", "cinna": "Puff"}
EYES = ["open", "happy", "closed", "wink", "sleepy", "surprised", "sad"]
STUB = (
    "window.speechSynthesis={speak(){},cancel(){},getVoices(){return[]},pause(){},resume(){}};"
    "window.SpeechSynthesisUtterance=function(){};"
    "window.AudioContext=window.webkitAudioContext=undefined;window.__cookAutoPlay=true;"
)

results = []


def check(name, ok, detail=""):
    results.append(bool(ok))
    print(("PASS " + name) if ok else ("FAIL " + name + " | " + str(detail)), flush=True)


SHEET_JS = """
() => {
  const K = window.KittyChars;
  const old = document.getElementById('chars_sheet_host');
  if (old) old.remove();
  const host = document.createElement('div');
  host.id = 'chars_sheet_host';
  host.style.cssText = 'position:absolute;left:0;top:0;z-index:99999;background:#fff7fb;padding:8px;width:1500px';
  K.injectCss();
  let html = '';
  for (const id of K.ids) {
    html += '<div style="display:flex;flex-wrap:wrap;gap:2px;align-items:flex-end;border-bottom:1px solid #ccc"><b style="width:70px">' + K.names[id] + '</b>';
    for (const pose of K.poses) html += '<div style="width:100px;height:130px">' + K.full(id, pose) + '</div>';
    html += '</div>';
  }
  html += '<div style="display:flex;flex-wrap:wrap;gap:4px">';
  for (const id of K.ids) for (const e of ['open','happy','closed','wink','sleepy','surprised','sad'])
    html += '<div style="width:80px;height:75px">' + K.face(id, {eyes: e}) + '</div>';
  html += '</div>';
  host.innerHTML = html;
  document.body.appendChild(host);
  return host.querySelectorAll('svg').length;
}
"""

with sync_playwright() as pw:
    browser = pw.chromium.launch(args=["--mute-audio"])
    for (w, h) in [(375, 667), (1024, 768)]:
        ctx = browser.new_context(viewport={"width": w, "height": h})
        ctx.add_init_script(STUB)
        page = ctx.new_page()
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.goto(BASE, wait_until="load")
        page.wait_for_timeout(600)
        tag = "%dx%d " % (w, h)
        check(tag + "KittyChars loaded", page.evaluate("typeof window.KittyChars === 'object'"))
        names = page.evaluate("window.KittyChars.names")
        check(tag + "new names", names == EXPECTED_NAMES, names)
        ids = page.evaluate("window.KittyChars.ids")
        check(tag + "ids unchanged", ids == list(EXPECTED_NAMES), ids)
        count = page.evaluate(SHEET_JS)
        check(tag + "sheet svgs rendered", count == 5 * 13 + 5 * 7, count)
        bad = page.evaluate(
            "() => [...document.querySelectorAll('#chars_sheet_host svg')].filter(s => !s.getBoundingClientRect().width).length"
        )
        check(tag + "all svgs have size", bad == 0, bad)
        for e in EYES:
            ok = page.evaluate(
                "(e) => window.KittyChars.ids.every(i => window.KittyChars.full(i, 'stand', {eyes: e}).indexOf('data-eyes=\"' + e + '\"') > 0)", e
            )
            check(tag + "eyes option " + e, ok)
        if w == 1024:
            page.locator("#chars_sheet_host").screenshot(path=SHEET)
        page.evaluate("document.getElementById('chars_sheet_host').remove()")
        page.locator('[data-p="marie"]').first.click()
        page.wait_for_timeout(300)
        page.locator("#goBtn").click()
        page.wait_for_timeout(1500)
        check(tag + "marie go no page errors", not errors, errors[:2])
        ctx.close()
    browser.close()

passed = sum(results)
print("RESULT %d/%d passed" % (passed, len(results)))
sys.exit(0 if passed == len(results) else 1)
