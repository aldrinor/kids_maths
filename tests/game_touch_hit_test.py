"""iPad finger test: every visible button must be the thing under its own centre (nothing, such as the drawing layer, may sit on top),
and a real touch tap must press it. Both children, iPad portrait and landscape. Silent. Prints only failures and one RESULT line.
Run: python tests/game_touch_hit_test.py http://localhost:8790/game/index.html [chromium|webkit]"""
import sys
from playwright.sync_api import sync_playwright

URL = sys.argv[1]
ENGINE = sys.argv[2] if len(sys.argv) > 2 else "chromium"
STUB = ("window.__demoFast=true;window.__noVoice=true;window.__noRewards=true;window.__sayLog=[];localStorage.clear();"
        "window.speechSynthesis={speak(){},cancel(){},getVoices(){return[]}};window.SpeechSynthesisUtterance=function(){};"
        "window.AudioContext=window.webkitAudioContext=undefined;")
CENTERP = "()=>{const r=document.querySelector('#tools .pencil').getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2]}"
SIZES = [(810, 1080), (1180, 820), (390, 844)]
res = []
HIT = r"""() => { const bad = [];
  for (const b of document.querySelectorAll('button, input, [role=button], .opt, .tapitem, .box, a[href]')) {
    const r = b.getBoundingClientRect(), cs = getComputedStyle(b);
    if (r.width < 2 || r.height < 2 || cs.visibility === 'hidden' || cs.display === 'none' || b.closest('[hidden]') || b.disabled) continue;
    if (r.bottom < 0 || r.right < 0 || r.top > innerHeight || r.left > innerWidth) { bad.push('OFFSCREEN ' + (b.id || b.className)); continue; }
    const x = Math.min(innerWidth - 1, Math.max(0, r.left + r.width / 2)), y = Math.min(innerHeight - 1, Math.max(0, r.top + r.height / 2));
    const top = document.elementFromPoint(x, y);
    if (!top || !(b === top || b.contains(top) || top.contains(b) && top.tagName !== 'CANVAS' && !/^(work|qbody|app|board)$/.test(top.id))) bad.push((b.id ? '#' + b.id : '') + '.' + String(b.className).split(' ').join('.') + ' covered by ' + (top ? top.tagName + (top.id ? '#' + top.id : '') + '.' + String(top.className).split(' ').join('.') : 'nothing'));
  } return bad; }"""


def ok(name, cond, info=""):
    res.append(bool(cond))
    if not cond:
        print(f"FAIL {name} {info}")


def probe(pg, tag, state):
    for b in pg.evaluate(HIT):
        ok(f"{tag} {state}: {b}", False)
    ok(f"{tag} {state}: probe ran", True)


def settle(pg):
    pg.wait_for_function("()=>__game.QS && __game.QS.phase==='ask' && !__game.QS.teaching", timeout=60000)
    pg.wait_for_timeout(250)


with sync_playwright() as p:
    br = getattr(p, ENGINE).launch(**({"args": ["--mute-audio"]} if ENGINE == "chromium" else {}))
    for theme in ("castle", "cafe"):
        for vw, vh in SIZES:
            tag = f"{theme} {vw}x{vh}"
            pg = br.new_page(viewport={"width": vw, "height": vh}, has_touch=True, is_mobile=True, device_scale_factor=1)
            errs = []
            pg.on("pageerror", lambda e: errs.append(str(e)))
            pg.add_init_script(STUB); pg.goto(URL); pg.wait_for_timeout(1200)

            pg.touchscreen.tap(*pg.evaluate("(t)=>{const r=document.querySelector('.over .go[data-theme=\"'+t+'\"]').getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2]}", theme))
            pg.wait_for_timeout(600)
            for _ in range(1):
                try:
                    settle(pg)
                except Exception as e:
                    ok(f"{tag} question appears after a touch on the door", False, str(e)[:100]); break
                probe(pg, tag, "question " + pg.evaluate("()=>__game.Q.kind"))
                # a real finger tap on the answer
                try:
                    settle(pg)
                    q = pg.evaluate("()=>({k:__game.Q.kind,a:__game.Q.ans,o:__game.Q.opts})")
                    if q["k"] == "choice":
                        wrong = next(o for o in q["o"] if o != q["a"])
                        for val, nm in ((wrong, "wrong"), (q["a"], "right")):
                            sel = f'#qbody .opt[data-v="{val}"]'
                            r = pg.evaluate("(s)=>{const e=document.querySelector(s);if(!e)return null;const r=e.getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2]}", sel)
                            if not r: break
                            pg.touchscreen.tap(*r)
                            try: pg.wait_for_function("()=>__game.QS.tries>=1 || __game.QS.afterMiss || !!__game.QS.board || ['right','final','shown'].includes(__game.QS.phase)", timeout=6000)
                            except Exception: pass
                            ok(f"{tag} finger tap on {nm} answer is taken", pg.evaluate("()=>__game.QS.tries>=1 || __game.QS.afterMiss || !!__game.QS.board || ['right','final','shown'].includes(__game.QS.phase)"), pg.evaluate("()=>__game.QS.phase"))
                            probe(pg, tag, f"after {nm} tap {pg.evaluate('()=>__game.QS.phase')}")
                            if nm == "wrong": pg.wait_for_timeout(1500)
                        t = pg.evaluate("()=>{const e=document.getElementById('tile');const r=e.getBoundingClientRect();return r.width?[r.left+r.width/2,r.top+r.height/2]:null}")
                        if t: pg.touchscreen.tap(*t); pg.wait_for_timeout(600)
                except Exception as e:
                    ok(f"{tag} tap flow", False, str(e)[:160])
                # drawing: a finger drag on empty space marks the page; a finger tap on empty space marks nothing; a tap on an answer never draws
                try:
                    pg.evaluate("()=>__game.ask('sums.3', 6, 3, '+')"); pg.wait_for_timeout(700)
                    INK = "()=>{const c=document.getElementById('draw');const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0;for(let i=3;i<d.length;i+=4)if(d[i])n++;return n}"
                    box = pg.evaluate("()=>{const r=document.getElementById('work').getBoundingClientRect();const q=document.getElementById('qbody').getBoundingClientRect();return [r.left,r.top,r.width,r.height]}")
                    spot = pg.evaluate("""()=>{const r=document.getElementById('work').getBoundingClientRect();
                      for(let y=r.top+r.height*0.3;y<r.bottom-10;y+=18)for(let x=r.left+12;x<r.right-12;x+=18){const e=document.elementFromPoint(x,y);
                        const clear=[[-14,0],[14,0],[0,-14],[0,14],[0,0]].every(([dx,dy])=>{const n=document.elementFromPoint(x+dx,y+dy);return n&&(n.id==='work'||n.id==='qbody'||n.id==='board'||n.tagName==='CANVAS')&&!n.closest('button')});if(clear)return [x,y]} return null}""")
                    ok(f"{tag} no pen is chosen at the start", pg.evaluate("()=>!document.querySelector('#tools .on')"))
                    if spot:
                        pg.touchscreen.tap(*pg.evaluate(CENTERP)); pg.wait_for_timeout(100)
                        ok(f"{tag} tapping a pencil picks it", pg.evaluate("()=>!!document.querySelector('#tools .pencil.on')"))
                        pg.touchscreen.tap(spot[0], spot[1]); pg.wait_for_timeout(200)
                        ok(f"{tag} a finger tap on empty space leaves no mark", pg.evaluate(INK) == 0, pg.evaluate(INK))
                        cdp = pg.context.new_cdp_session(pg) if ENGINE == "chromium" else None
                        if cdp and not __import__("os").environ.get("NODRAG"):
                            pts = [(spot[0] + i * 6, spot[1] + i * 3) for i in range(12)]
                            cdp.send("Input.dispatchTouchEvent", {"type": "touchStart", "touchPoints": [{"x": pts[0][0], "y": pts[0][1]}]})
                            for x, y in pts[1:]:
                                cdp.send("Input.dispatchTouchEvent", {"type": "touchMove", "touchPoints": [{"x": x, "y": y}]})
                            cdp.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []})
                            pg.wait_for_timeout(200)
                            ok(f"{tag} a finger drag on empty space draws", pg.evaluate(INK) > 50, pg.evaluate(INK))
                            pg.evaluate("()=>document.querySelector('#tools .pencil').click()"); pg.wait_for_timeout(100)   # CDP touch can leave a stuck finger, so this last tap is a plain click
                            ok(f"{tag} tapping the pencil again puts it away", pg.evaluate("()=>!document.querySelector('#tools .on')"))
                            pg.evaluate("()=>{const c=document.getElementById('draw');c.getContext('2d').clearRect(0,0,c.width,c.height)}")
                            cdp.send("Input.dispatchTouchEvent", {"type": "touchStart", "touchPoints": [{"x": pts[0][0], "y": pts[0][1]}]})
                            for x, y in pts[1:]:
                                cdp.send("Input.dispatchTouchEvent", {"type": "touchMove", "touchPoints": [{"x": x, "y": y}]})
                            cdp.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []})
                            ok(f"{tag} with the pen put away a drag leaves no mark", pg.evaluate(INK) == 0, pg.evaluate(INK))
                except Exception as e:
                    ok(f"{tag} drawing check", False, str(e)[:160])

            ok(f"{tag} no page errors", not errs, errs[:2])
            pg.close()
    br.close()
print(f"RESULT {sum(res)}/{len(res)}")
