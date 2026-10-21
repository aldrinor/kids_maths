"""Layout check for the demo: on many real device sizes and in every game state, find anything that is
covered by something else, cut off, off screen, or has text spilling out. Prints only problems.
Run: python tests/demo_layout_test.py http://localhost:8790/demo/index.html [chromium|webkit]"""
import sys
from playwright.sync_api import sync_playwright

URL = sys.argv[1]
ENGINE = sys.argv[2] if len(sys.argv) > 2 else "chromium"
STUB = ("window.__demoFast=true;window.__noVoice=true;window.speechSynthesis={speak(){},cancel(){},getVoices(){return[]}};"
        "window.SpeechSynthesisUtterance=function(){};window.AudioContext=window.webkitAudioContext=undefined;")
# real devices; the "safari" sizes are what is left once Safari's toolbars show
SIZES = [("android", 360, 740), ("iphone_se", 375, 667), ("iphone_se_safari", 375, 553), ("iphone_14", 390, 844), ("iphone_14_safari", 390, 664),
         ("iphone_max", 430, 932), ("iphone_side", 844, 390), ("iphone_side_safari", 750, 340),
         ("ipad_mini", 744, 1133), ("ipad_mini_side", 1133, 744), ("ipad", 820, 1180), ("ipad_safari", 820, 1100),
         ("ipad_side", 1180, 820), ("ipad_side_safari", 1180, 740), ("ipad_pro_side", 1366, 1024),
         ("laptop", 1280, 720), ("desktop", 1920, 1080)]
CHECK = r"""(state) => {
  const vw = innerWidth, vh = innerHeight, out = [];
  const els = [...document.querySelectorAll('#speak,#dots,#mascot,#tools .pencil,#tools .rubber,#tools .bin,#ansBox,#qbody .opt,#qbody .bulb,.eq,.story,.qline,.nlbox,.hoprow button,#pad button,#tile,#msg:not([hidden]),#board,#boardbtns .again:not([hidden]),#boardbtns .bnext:not([hidden]),#boardbtns .bx:not([hidden])')]
    .filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden'; });
  const name = e => (e.id ? '#' + e.id : e.className && typeof e.className === 'string' ? '.' + e.className.split(' ')[0] : e.tagName) + (e.dataset.k ? '[' + e.dataset.k + ']' : e.dataset.h ? '[' + e.dataset.h + ']' : '');
  for (const e of els) {
    const r = e.getBoundingClientRect();
    if (r.left < -1 || r.top < -1 || r.right > vw + 1 || r.bottom > vh + 1) out.push(name(e) + ' off screen');
    if (e.scrollWidth > e.clientWidth + 2 && !e.querySelector('.bulb') && !['nlbox','board'].some(c => e.classList.contains(c) || e.id === c)) out.push(name(e) + ' text spills');
    // is it covered? sample 5 points; the top element must be this one, inside it, or the drawing layer
    const pts = [[.5, .5], [.15, .2], [.85, .2], [.15, .8], [.85, .8]];
    let hidden = 0;
    for (const [fx, fy] of pts) {
      const x = r.left + r.width * fx, y = r.top + r.height * fy;
      if (x < 0 || y < 0 || x >= vw || y >= vh) continue;
      const t = document.elementFromPoint(x, y);
      if (!t || t === e || e.contains(t) || t.contains(e) || t.closest('#draw') || t.id === 'draw' || (e.id === 'board' && (t.closest('#board') || t.closest('#boardbtns')))) continue;
      if ((e.closest('#board') || e.closest('#boardbtns')) && (t.closest('#board') || t.closest('#boardbtns'))) continue;
      if (t.closest('.band') || t.closest('.over')) continue;
      if (e.id === 'board' || e.classList.contains('nlbox')) { if (t.closest('#board') || t.closest('#boardbtns') || t.closest('.nlbox')) continue; }
      hidden++; var by = name(t.closest('button,#board,.nlbox,#tools,#keys,#top,.qtop,.hoprow') || t);
    }
    if (hidden >= 2) out.push(name(e) + ' covered by ' + by);
  }
  // the Check word must sit inside its button, and inside the straight part of the castle shield
  const tile = document.querySelector('#tile'), sp = tile && tile.querySelector('span');
  if (sp && sp.firstChild && !tile.hidden) { const rg = document.createRange(); rg.selectNodeContents(sp); const tr = rg.getBoundingClientRect(), br = tile.getBoundingClientRect();
    const shield = document.body.dataset.theme === 'castle' && getComputedStyle(tile).clipPath !== 'none';
    const limit = shield ? br.top + br.height * 0.66 : br.bottom;
    if (tr.left < br.left + 4 || tr.right > br.right - 4 || tr.top < br.top + 2 || tr.bottom > limit) out.push('Check word does not fit its button'); }
  // number line must not sit under the lesson board
  const b = document.querySelector('#board'), n = document.querySelector('#qbody .nlbox');
  if (b && n && b.getBoundingClientRect().bottom > n.getBoundingClientRect().top + 1) out.push('board overlaps number line');
  const qt = document.querySelector('.qtop');
  if (b && qt && b.getBoundingClientRect().top < qt.getBoundingClientRect().bottom - 1) out.push('board covers the question');
  if (b) { const fs = parseFloat(getComputedStyle(b).getPropertyValue('--rule')); if (b.getBoundingClientRect().height < 110) out.push('board too small (' + Math.round(b.getBoundingClientRect().height) + 'px)'); }
  return [...new Set(out)].map(x => state + ': ' + x);
}"""

with sync_playwright() as p:
    br = getattr(p, ENGINE).launch(**({"args": ["--mute-audio"]} if ENGINE == "chromium" else {}))
    total = 0
    for theme in ["cafe", "castle"]:
        for tag, vw, vh in SIZES:
            pg = br.new_page(viewport={"width": vw, "height": vh}, has_touch=vw < 900)
            pg.add_init_script(STUB)
            pg.goto(URL); pg.wait_for_timeout(400)
            if pg.is_visible("#rotate"):
                print(f"{theme} {tag} {vw}x{vh}: shows 'turn the phone upright' (ok)"); pg.close(); continue
            probs = pg.evaluate(CHECK, "start")
            pg.click(f'.over .go[data-theme="{theme}"]'); pg.wait_for_timeout(600)
            for kind, a, b in [("add", 7, 5), ("word", 15, 7), ("choice", 6, 7)]:
                pg.evaluate(f"()=>{{__demo.lesson('{kind}',{a},{b}); __demo.QS.teaching=false; document.getElementById('board').remove(); document.getElementById('boardbtns').remove(); document.getElementById('app').classList.remove('locked','lesson'); __demo.QS.board=false;}}")
                pg.wait_for_timeout(250)
                probs += pg.evaluate(CHECK, kind + " question")
                pg.evaluate(f"()=>__demo.lesson('{kind}',{a},{b})"); pg.wait_for_function("()=>!__demo.QS.teaching", timeout=40000)
                probs += pg.evaluate(CHECK, kind + " lesson")
            for x in sorted(set(probs)):
                print(f"{theme} {tag} {vw}x{vh}: {x}"); total += 1
            pg.close()
    br.close()
print(f"PROBLEMS {total}")
