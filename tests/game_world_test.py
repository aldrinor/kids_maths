"""Kitty Cafe World check (game/world/cafe_world.js): the world opens through the real game after 25 answers
(PlayWorlds.open), every place opens, buying takes coins, "not enough coins" is refused, a placed and moved thing is
still there after a reload, a pet is adopted and saved, garden growth is saved across visits, a friend is served,
the old house (HomeGame) works inside the world and buys with coins, the world closes cleanly, and there are no page errors.
On an upright phone (390x844) and iPad (820x1180) with a touch screen: every place starts with its key things in view
(Mimi, the counter, the waiting friend, the pet, the plots, the can, the basket, the bowl, the ball: at least 90% inside
the screen and above the tray), and real touch drags (Chromium touch events) move a thing and bring one in from the tray.
Serves gh_site itself on port 8794. Silent (Chromium --mute-audio, speech and Web Audio stubbed).
Prints only failures and one RESULT line.
Run: python tests/game_world_test.py"""
import functools
import http.server
import json
import os
import sys
import threading
from playwright.sync_api import sync_playwright

SITE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = 8794
URL = f"http://127.0.0.1:{PORT}/game/index.html"
STUB = ("window.__demoFast=true;window.__noVoice=true;window.__noRewards=true;window.__worldMinutes=120;"
        "window.speechSynthesis={speak(){},cancel(){},getVoices(){return[]}};"
        "window.SpeechSynthesisUtterance=function(){};window.AudioContext=window.webkitAudioContext=undefined;")
res = []


def ok(name, cond, info=""):
    res.append(bool(cond))
    if not cond:
        print(f"FAIL {name} {info}")


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


class Server(http.server.ThreadingHTTPServer):
    def handle_error(self, request, client_address):
        pass


def D(pg, path=""):
    return pg.evaluate("(p)=>{let d=__game.P.world.cafe; for(const k of p.split('.').filter(Boolean)) d=d[k]; return JSON.parse(JSON.stringify(d))}", path)


def enter_marie(pg):
    pg.click('.over .go[data-v="marie"]')
    pg.wait_for_function("()=>__game.QS && __game.QS.phase==='ask'", timeout=20000)


def open_world_by_answering(pg):
    """the real path: the 25th answer opens the play world"""
    pg.wait_for_function("()=>__game.QS && __game.QS.phase==='ask' && !__game.QS.teaching", timeout=60000)
    pg.evaluate("()=>{__game.P.game.sincePlay=24}")
    pg.evaluate("""()=>{const Q=__game.Q; if(Q.kind==='choice'){__game.QS.pick=Q.ans}else{__game.QS.typed=String(Q.ans)}; document.getElementById('tile').click()}""")
    pg.wait_for_function("()=>__game.QS.phase==='right'", timeout=8000)
    pg.click("#tile")                                   # Next: no timer moves on by itself
    pg.wait_for_selector(".over.jover .jpanel[data-kind=world] .jgo", timeout=30000)
    pg.click(".over.jover .jpanel[data-kind=world] .jgo")      # 22 Oct: a card with one big Go button comes before the play world
    pg.wait_for_selector(".pw-host .cw", timeout=60000)
    pg.wait_for_timeout(300)


def go(pg, place):
    if place == "map":
        if not pg.locator(".cw-map.on").count():
            pg.click('.cw-top [data-act="map"]')
    else:
        if not pg.locator(".cw-map.on").count():
            pg.click('.cw-top [data-act="map"]')
        pg.click(f'.cw-go[data-place="{place}"]')
    pg.wait_for_timeout(400)


def tap_pad(pg, key):
    pg.click(f'.cw-place.on .cw-pad[data-key="{key}"]')
    pg.wait_for_timeout(250)


def tab(pg, tid):
    pg.click(f'.cw-place.on .cw-tab[data-tab="{tid}"]')
    pg.wait_for_timeout(150)


def coins(pg):
    return pg.evaluate("()=>__game.P.coins")


srv = Server(("127.0.0.1", PORT), functools.partial(Quiet, directory=SITE))
threading.Thread(target=srv.serve_forever, daemon=True).start()
try:
    with sync_playwright() as p:
        br = p.chromium.launch(args=["--mute-audio"])
        ctx = br.new_context(viewport={"width": 820, "height": 1180}, has_touch=False)
        pg = ctx.new_page()
        errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.on("console", lambda m: errs.append("console: " + m.text) if m.type == "error" else None)
        pg.add_init_script(STUB)
        pg.goto(URL)
        # Marie's old save: 120 stars (her coins) and two things in the old house
        old = {"stars": 120, "home": [{"uid": 1, "id": "kitty", "x": 40, "y": 90}, {"uid": 2, "id": "couch", "x": 50, "y": 80}]}
        pg.evaluate("(v)=>{localStorage.clear(); localStorage.setItem('kittyBlocks.progress', v)}", json.dumps(old))
        pg.reload()
        enter_marie(pg)

        # 1 the world opens through the game (PlayWorlds.open after 25 answers)
        open_world_by_answering(pg)
        ok("world opened through PlayWorlds", pg.locator('.pw-host[data-theme="cafe"] .cw').count() == 1)
        ok("map shows 4 places", pg.locator(".cw-map.on .cw-go").count() == 4)
        ok("save made", pg.evaluate("()=>!!(__game.P.world && __game.P.world.cafe && __game.P.world.cafe.visits===1)"))
        ok("silent: no Web Audio", pg.evaluate("()=>!window.AudioContext"))
        pg.evaluate("()=>{__game.P.coins=100}")

        # 2 each place opens
        go(pg, "cafe")
        ok("cafe opens", pg.locator(".cw-cafe.on .cw-box .cw-it").count() >= 4 and pg.locator(".cw-cafe.on .cw-tray .cw-pad").count() >= 3)
        go(pg, "garden")
        ok("garden opens", pg.locator(".cw-garden.on .cw-plot").count() == 5)
        go(pg, "pets")
        ok("pet corner opens", pg.locator('.cw-pets.on .cw-pad[data-key="pet:hamster"]').count() == 1)
        go(pg, "house")
        pg.wait_for_selector(".cw-house .hg-stage", timeout=15000)
        ok("house opens (HomeGame)", pg.evaluate("()=>__cafeWorld.house() && !!window.P"))
        ok("old house items carried over", pg.evaluate("()=>__game.P.home.length")== 2)
        ok("house prices show coins", pg.evaluate("()=>getComputedStyle(document.querySelector('.cw-house .hg-price'),'::before').width!=='auto'"))
        # buy something in the house: the coins go down and it is in P.home
        c0 = coins(pg)
        pg.evaluate("()=>{const b=[...document.querySelectorAll('.cw-house .hg-cat')][1]; b && b.click()}")
        pg.wait_for_timeout(200)
        pad = pg.evaluate("()=>{const p=[...document.querySelectorAll('.cw-house .hg-pad:not(.cant)')].find(p=>p.querySelector('.hg-price')); if(!p) return null; p.dataset.t='1'; return p.dataset.id}")
        if pad:
            pg.click('.cw-house .hg-pad[data-t="1"]')
            pg.wait_for_timeout(400)
        ok("house buy takes coins", pad and coins(pg) < c0 and pg.evaluate("()=>__game.P.home.length") == 3, f"{pad} {c0}->{coins(pg)}")
        go(pg, "map")
        ok("leaving the house restores globals", pg.evaluate("()=>window.P===undefined && !__cafeWorld.house()"))

        # 3 buying works and takes coins; 4 not enough coins is refused
        go(pg, "cafe")
        c0 = coins(pg)
        n0 = len(D(pg, "places.cafe.items"))
        tap_pad(pg, "cafe:cafe_chair_mint")
        ok("buy takes the price", coins(pg) == c0 - 8, f"{c0}->{coins(pg)}")
        ok("bought thing is owned and placed", D(pg, "owned").get("cafe:cafe_chair_mint") == 1 and len(D(pg, "places.cafe.items")) == n0 + 1)
        ok("bought pad is no longer locked", pg.locator('.cw-pad[data-key="cafe:cafe_chair_mint"].locked').count() == 0)
        pg.evaluate("()=>{__game.P.coins=3}")
        tap_pad(pg, "cafe:cafe_booth")
        ok("not enough coins: refused", coins(pg) == 3 and not D(pg, "owned").get("cafe:cafe_booth"))
        ok("not enough coins: still locked", pg.locator('.cw-pad[data-key="cafe:cafe_booth"].locked').count() == 1)
        ok("not enough coins: a soft nudge, no shake", pg.evaluate("()=>{const p=document.querySelector('.cw-pad[data-key=\"cafe:cafe_booth\"]'); return p.classList.contains('cw-soft') && !p.classList.contains('cw-shake')}"))
        pg.evaluate("()=>{__game.P.coins=100}")
        # wallpaper: buy and apply
        tab(pg, "wall")
        tap_pad(pg, "wall:pink_dots")
        ok("wallpaper bought and used", D(pg, "places.cafe.wall") == "pink_dots" and coins(pg) == 90)

        # 5 a placed thing is moved by dragging and is still there after a reload
        it = D(pg, "places.cafe.items")[-1]
        sel = f'.cw-cafe .cw-it[data-u="{it["u"]}"]'
        pg.locator(".cw-cafe .cw-scene").evaluate("e=>e.scrollLeft=0")
        bb = pg.locator(sel).bounding_box()
        pg.mouse.move(bb["x"] + bb["width"] / 2, bb["y"] + bb["height"] * 0.7)
        pg.mouse.down()
        for k in range(1, 9):
            pg.mouse.move(bb["x"] + bb["width"] / 2 + 12 * k, bb["y"] + bb["height"] * 0.7 - 4 * k)
        pg.mouse.up()
        pg.wait_for_timeout(200)
        moved = [t for t in D(pg, "places.cafe.items") if t["u"] == it["u"]][0]
        ok("drag moves a thing", moved["x"] != it["x"], f"{it} {moved}")
        # drag a thing from the tray into the room
        tab(pg, "furniture")
        n1 = len(D(pg, "places.cafe.items"))
        pb = pg.locator('.cw-pad[data-key="cafe:cafe_table"]').bounding_box()
        sb = pg.locator(".cw-cafe .cw-scene").bounding_box()
        pg.mouse.move(pb["x"] + 40, pb["y"] + 40)
        pg.mouse.down()
        for k in range(1, 11):
            pg.mouse.move(pb["x"] + 40, pb["y"] + 40 - (pb["y"] + 40 - (sb["y"] + sb["height"] * 0.8)) * k / 10)
        pg.mouse.up()
        pg.wait_for_timeout(200)
        ok("drag from the tray places a thing", len(D(pg, "places.cafe.items")) == n1 + 1)

        # serve a friend: ring the bell, tap her, give the treat she wants
        pg.click('.cw-top [data-act="bell"]')
        pg.wait_for_selector(".cw-cafe .cw-friend .cw-bubble", timeout=8000)
        want = pg.evaluate("()=>document.querySelector('.cw-friend .cw-bubble img').src.match(/treat_(\\w+)\\.png/)[1]")
        pg.click(".cw-cafe .cw-friend")
        s0 = D(pg, "served")
        wrong = [t for t in ("cupcake", "cocoa", "cake", "cookie", "donut", "macaron") if t != want][0]
        pg.click(f'.cw-serve [data-treat="{wrong}"]')
        pg.wait_for_timeout(150)
        ok("wrong treat: friend still waits", D(pg, "served") == s0 and pg.locator(".cw-friend .cw-bubble").count() == 1)
        pg.click(f'.cw-serve [data-treat="{want}"]')
        pg.wait_for_timeout(400)
        ok("friend served", D(pg, "served") == s0 + 1 and pg.locator(".cw-friend .cw-bubble").count() == 0)

        # 6 adopt a pet; feed it and play ball
        go(pg, "pets")
        c0 = coins(pg)
        tap_pad(pg, "pet:hamster")
        ok("pet adopted with coins", coins(pg) == c0 - 30 and D(pg, "pets")[0]["kind"] == "hamster", f"{c0}->{coins(pg)}")
        ok("pet shown", pg.locator('.cw-pets .cw-pet[data-pet="hamster"]').count() == 1)
        pg.click('.cw-pets [data-act="feed"]')
        pg.wait_for_function("()=>(__game.P.world.cafe.stats.feed||0)>=1", timeout=8000)
        pg.click('.cw-pets [data-act="ball"]')
        pg.wait_for_function("()=>(__game.P.world.cafe.stats.ball||0)>=1", timeout=8000)
        ok("feed and ball", True)
        go(pg, "cafe")
        ok("pet follows into the cafe", pg.locator('.cw-cafe .cw-follow[data-pet="hamster"]').count() == 1)

        # 7 garden: plant, water (grows one step this visit), more water does not grow again this visit
        go(pg, "garden")
        pg.click('.cw-plot[data-plot="0"]')
        pg.wait_for_timeout(150)
        ok("seed planted", D(pg, "garden.plots")[0]["seed"] == "tulip")
        pg.click('.cw-plot[data-plot="0"]')
        pg.wait_for_timeout(300)
        ok("watered: grew to a sprout", D(pg, "garden.plots")[0]["stage"] == 1)
        pg.click('.cw-plot[data-plot="0"]')
        pg.wait_for_timeout(300)
        ok("one growth step per visit", D(pg, "garden.plots")[0]["stage"] == 1)

        # the world ends cleanly
        pg.evaluate("()=>PlayWorlds._finish()")
        pg.wait_for_function("()=>!document.querySelector('.pw-host')", timeout=8000)
        ok("world closed", pg.evaluate("()=>!window.__cafeWorld && window.P===undefined"))

        # reload: everything is still there
        pg.reload()
        enter_marie(pg)
        d = pg.evaluate("()=>__game.P.world.cafe")
        ok("moved thing saved", any(t["u"] == moved["u"] and t["x"] == moved["x"] for t in d["places"]["cafe"]["items"]))
        ok("bought thing saved", d["owned"].get("cafe:cafe_chair_mint") == 1 and d["places"]["cafe"]["wall"] == "pink_dots")
        ok("pet saved", [q["kind"] for q in d["pets"]] == ["hamster"])
        ok("garden growth saved", d["garden"]["plots"][0]["stage"] == 1 and d["garden"]["plots"][0]["seed"] == "tulip")
        ok("house buy saved", pg.evaluate("()=>__game.P.home.length") == 3)

        # next visit: the plant grows again when watered, and the saved room is drawn
        open_world_by_answering(pg)
        ok("second visit counted", D(pg, "visits") == 2)
        go(pg, "cafe")
        ok("saved thing drawn after reload", pg.locator(f'.cw-cafe .cw-it[data-u="{moved["u"]}"]').count() == 1)
        go(pg, "garden")
        pg.click('.cw-plot[data-plot="0"]')
        pg.wait_for_timeout(300)
        ok("next visit: grew to a bud", D(pg, "garden.plots")[0]["stage"] == 2)
        # the plans card opens and shows 3 goals
        pg.click('.cw-top [data-act="plans"]')
        ok("plans card shows goals", pg.locator(".cw-card .cw-goal").count() >= 1)
        pg.click(".cw-card .cw-close")
        # the world ends while the house is open: the house is put away too
        go(pg, "house")
        pg.wait_for_selector(".cw-house .hg-stage", timeout=15000)
        pg.wait_for_timeout(300)
        ok("pet follows into the house", pg.locator('.cw-housepet').count() == 1)
        pg.evaluate("()=>PlayWorlds._finish()")
        pg.wait_for_function("()=>!document.querySelector('.pw-host')", timeout=8000)
        ok("closing from the house restores globals", pg.evaluate("()=>window.P===undefined && typeof window.speak!=='function' && typeof window.tone!=='function'"), pg.evaluate("()=>[typeof window.P, typeof window.speak, String(window.speak).slice(0,80)]"))

        # sizes: no overflow at phone, iPad and laptop sizes in every place
        for w, h in ((390, 844), (820, 1180), (1280, 720)):
            pg.set_viewport_size({"width": w, "height": h})
            pg.evaluate("()=>{__game.P.coins=120}")
            open_world_by_answering(pg)
            for place in ("map", "cafe", "garden", "pets", "house"):
                go(pg, place)
                if place == "house":
                    pg.wait_for_selector(".cw-house .hg-stage", timeout=15000)
                over = pg.evaluate("()=>document.documentElement.scrollWidth>innerWidth || document.documentElement.scrollHeight>innerHeight")
                small = pg.evaluate("""()=>[...document.querySelectorAll('.cw-place.on .cw-pad, .cw-place.on .cw-tab, .cw-top button:not([hidden]), .cw-map.on .cw-go')]
                    .filter(e=>e.offsetParent).map(e=>e.getBoundingClientRect()).filter(r=>Math.min(r.width,r.height)<64).length""")
                ok(f"{w}x{h} {place}: no overflow", not over)
                clash = pg.evaluate("""()=>{const b=document.querySelector('.pw-bar').getBoundingClientRect();
                    return [...document.querySelectorAll('.cw-top button:not([hidden])')].map(e=>e.getBoundingClientRect())
                    .filter(r=>r.right>b.left && r.left<b.right && r.bottom>b.top && r.top<b.bottom).length}""")
                ok(f"{w}x{h} {place}: top buttons clear of the coins", clash == 0)
                ok(f"{w}x{h} {place}: big touch targets", small == 0, small)
            pg.evaluate("()=>PlayWorlds._finish()")
            pg.wait_for_function("()=>!document.querySelector('.pw-host')", timeout=8000)

        # upright phone and iPad, touch screen: every place starts with its key things in view (at least 90% inside the
        # screen and above the tray), and real touch drags (Chromium touch events) move a thing and bring one from the tray
        VIEW = """(sels)=>{const on=document.querySelector('.cw-place.on'), tb=on.querySelector('.cw-tray').getBoundingClientRect().top, bad=[];
            for (const s of sels) { const els=[...on.querySelectorAll(s)]; if(!els.length){bad.push(s+' missing');continue}
              for (const e of els) { const r=e.getBoundingClientRect(), inW=Math.max(0,Math.min(r.right,innerWidth)-Math.max(r.left,0))/r.width,
                inH=Math.max(0,Math.min(r.bottom,tb+2)-Math.max(r.top,0))/r.height; if(inW<0.9||inH<0.9) bad.push(s+' '+Math.round(inW*100)+'%/'+Math.round(inH*100)+'%') } }
            return bad}"""
        KEY = {"cafe": ['.cw-char[aria-label="Mimi"]', ".cw-counter", ".cw-follow"], "garden": [".cw-plot", ".cw-tool", ".cw-basket", ".cw-follow"],
               "pets": [".cw-pet:not(.cw-follow)", ".cw-bowl", ".cw-ball"]}
        for w, h in ((390, 844), (820, 1180)):
            tctx = br.new_context(viewport={"width": w, "height": h}, has_touch=True)
            tp = tctx.new_page()
            tp.on("pageerror", lambda e: errs.append(str(e)))
            tp.add_init_script(STUB)
            tp.goto(URL)
            enter_marie(tp)
            open_world_by_answering(tp)
            tp.evaluate("()=>{__game.P.coins=100; const d=__game.P.world.cafe; d.pets=[{kind:'kitten',x:560,y:820}]; d.petWith='kitten'}")
            for place in ("cafe", "garden", "pets"):
                tp.evaluate("(p)=>__cafeWorld.go(p)", place)
                tp.wait_for_timeout(400)
                bad = tp.evaluate(VIEW, KEY[place])
                ok(f"{w}x{h} {place}: key things start in view", not bad, bad)
                if place == "garden":   # a tap on the middle of each bed reaches the bed (nothing lies on top of it)
                    hid = tp.evaluate("()=>[...document.querySelectorAll('.cw-garden .cw-plot')].filter(e=>{const r=e.getBoundingClientRect();"
                                      "const t=document.elementFromPoint(r.left+r.width/2, r.top+r.height/2); return !(t && t.closest('.cw-plot')===e)}).map(e=>e.dataset.plot)")
                    ok(f"{w}x{h} garden: every bed can be tapped", not hid, hid)
            tp.evaluate("()=>__cafeWorld.go('cafe')")
            tp.wait_for_timeout(300)
            cdp = tctx.new_cdp_session(tp)

            def touch(frm, to, steps=10):
                cdp.send("Input.dispatchTouchEvent", {"type": "touchStart", "touchPoints": [{"x": frm[0], "y": frm[1]}]})
                for k in range(1, steps + 1):
                    cdp.send("Input.dispatchTouchEvent", {"type": "touchMove", "touchPoints": [{"x": frm[0] + (to[0] - frm[0]) * k / steps, "y": frm[1] + (to[1] - frm[1]) * k / steps}]})
                cdp.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []})
                tp.wait_for_timeout(250)
            it = tp.evaluate("()=>{const a=__game.P.world.cafe.places.cafe.items; const r=document.querySelector('.cw-cafe .cw-scene').getBoundingClientRect();"
                             "const t=a.find(t=>t.id==='cafe_table'); const b=document.querySelector('.cw-cafe .cw-it[data-u=\"'+t.u+'\"]').getBoundingClientRect();"
                             "return {u:t.u,x:t.x,y:t.y,cx:b.left+b.width/2,cy:b.top+b.height*0.75}}")
            sl0 = tp.evaluate("()=>document.querySelector('.cw-cafe .cw-scene').scrollLeft")
            touch((it["cx"], it["cy"]), (it["cx"] + 70, it["cy"] - 25))
            t2 = [t for t in D(tp, "places.cafe.items") if t["u"] == it["u"]][0]
            sl1 = tp.evaluate("()=>document.querySelector('.cw-cafe .cw-scene').scrollLeft")
            ok(f"{w}x{h} touch drag moves a thing (and not the scene)", t2["x"] > it["x"] + 20 and abs(sl1 - sl0) < 2, f"{it} {t2} scroll {sl0}->{sl1}")
            n0 = len(D(tp, "places.cafe.items"))
            pb = tp.locator('.cw-cafe .cw-pad[data-key="cafe:cafe_chair_pink"]').bounding_box()
            sb = tp.locator(".cw-cafe .cw-scene").bounding_box()
            touch((pb["x"] + pb["width"] / 2, pb["y"] + pb["height"] / 2), (pb["x"] + pb["width"] / 2, sb["y"] + sb["height"] * 0.85), 12)
            ok(f"{w}x{h} touch drag from the tray places a thing", len(D(tp, "places.cafe.items")) == n0 + 1)
            tp.tap('.cw-top [data-act="bell"]')
            tp.wait_for_selector(".cw-cafe .cw-friend .cw-bubble", timeout=8000)
            tp.wait_for_timeout(2600)   # the walk in is a 2.4 s slide even in fast mode
            bad = tp.evaluate(VIEW, [".cw-friend"])
            ok(f"{w}x{h} cafe: the waiting friend is in view", not bad, bad)
            tp.evaluate("()=>PlayWorlds._finish()")
            tctx.close()

        ok("no page errors", not errs, errs[:5])
        br.close()
finally:
    srv.shutdown()
    srv.server_close()
print(f"RESULT {sum(res)}/{len(res)} passed")
sys.exit(0 if all(res) else 1)
