"""Silent browser test for Kennedy's play world "Knight Castle World" (game/world/castle_world.js).

Opens the real game page (game/index.html) as Kennedy, gives him coins, and opens the world the way the game does
(playWorld() -> PlayWorlds.open). Checks:
  the world opens on the map with 4 places; each place opens (castle, stable, yard, wall) and the ride;
  building a part takes its coins and is still there after a reload; "not enough coins" is refused (no coins taken,
  nothing unlocked); a pet and a buddy are bought and saved after a reload; the pony gets brushed and fed;
  a defence wave runs to the end with a cheer and exactly 3 bonus coins; every button is at least 80 px, inside the
  screen and clear of the coin pill, glowing castle spots do not overlap; no page errors and no missing pictures.
Sizes: phone 390x844, iPad 820x1180, laptop 1280x720 (the full flow on the phone, layout checks on all three).
Prints only failures and one final line:  RESULT n/m passed
Run:  python tests/game_castle_world_test.py [chromium|webkit] [--shots]     (engine: chromium by default; --shots also
      saves screenshots of every place at every size to 16_kids_maths/work_tmp/world_shots/castle/).
      Serves gh_site on port 8795 and stops the server at the end.
"""
import os
import socket
import subprocess
import sys
import time

SITE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WORK_TMP = os.path.join(os.path.dirname(SITE), "work_tmp")
SHOTS = os.path.join(WORK_TMP, "world_shots", "castle")
os.makedirs(WORK_TMP, exist_ok=True)
os.environ["TEMP"] = WORK_TMP
os.environ["TMP"] = WORK_TMP

from playwright.sync_api import sync_playwright  # noqa: E402  (after TEMP is set)

PORT = 8795
ENGINE = next((a for a in sys.argv[1:] if a in ("chromium", "webkit", "firefox")), "chromium")
URL = "http://localhost:%d/game/index.html" % PORT
SIZES = [("phone", 390, 844), ("ipad", 820, 1180), ("laptop", 1280, 720)]
MIN_TARGET = 79.5
STUB = ("window.__demoFast=true;window.__noVoice=true;window.__worldMinutes=60;"
        "window.speechSynthesis={speak(){},cancel(){},getVoices(){return[]},pause(){},resume(){}};"
        "window.SpeechSynthesisUtterance=function(){};window.AudioContext=window.webkitAudioContext=undefined;")
res = []


def ok(name, cond, info=""):
    res.append(bool(cond))
    if not cond:
        print("FAIL %s %s" % (name, info))


FIT_JS = """
(minT) => {
  const out = [], root = document.querySelector('.cw-root');
  if (!root) return ['no .cw-root'];
  const W = innerWidth, H = innerHeight;
  const shown = e => { const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return !e.hidden && r.width > 1 && r.height > 1 && cs.display !== 'none' && cs.visibility !== 'hidden'; };
  const nm = e => (e.className + ' ' + (e.dataset.slot || e.dataset.act || e.dataset.go || e.dataset.buddy || e.dataset.item || '')).trim();
  const bar = document.querySelector('.pw-bar').getBoundingClientRect();
  const btns = [...root.querySelectorAll('button')].filter(shown);
  btns.forEach(b => {
    const r = b.getBoundingClientRect();
    if (r.width < minT || r.height < minT) out.push('small ' + nm(b) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
    if (b.classList.contains('cw-gob')) return;            // goblins walk in from outside the field
    if (r.left < -1 || r.top < -1 || r.right > W + 1 || r.bottom > H + 1) out.push('outside ' + nm(b) + ' [' + [r.left, r.top, r.right, r.bottom].map(Math.round) + ']');
    if (r.left < bar.right && r.right > bar.left && r.top < bar.bottom && r.bottom > bar.top) out.push('under the coin pill ' + nm(b));
  });
  const spots = btns.filter(b => b.classList.contains('cw-spot')).map(b => { const r = b.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2, nm(b)]; });
  for (let i = 0; i < spots.length; i++) for (let j = i + 1; j < spots.length; j++) {
    const d = Math.hypot(spots[i][0] - spots[j][0], spots[i][1] - spots[j][1]);
    if (d < 80) out.push('spots overlap ' + spots[i][2] + ' / ' + spots[j][2] + ' ' + Math.round(d) + 'px');
  }
  const de = document.documentElement;
  if (de.scrollWidth > W + 1 || de.scrollHeight > H + 1) out.push('page scrolls');
  return out;
}
"""


def server_up():
    with socket.socket() as s:
        s.settimeout(0.5)
        return s.connect_ex(("127.0.0.1", PORT)) == 0


def place(pg):
    return pg.evaluate("()=>{const r=document.querySelector('.cw-root');return r?r.dataset.place:''}")


def coins(pg):
    return pg.evaluate("()=>__game.P.coins")


def castle_data(pg, key):
    return pg.evaluate("(k)=>{const c=(__game.P.world||{}).castle||{};return c[k]===undefined?null:c[k]}", key)


def open_world(pg, give=None):
    """Kennedy's door, then the world the way the game opens it after 25 answers."""
    pg.click('.over .go[data-v="kennedy"]')
    pg.wait_for_function("()=>window.__game && __game.P")
    if give is not None:
        pg.evaluate("(n)=>{__game.P.coins=n}", give)
    pg.evaluate("()=>{window.__worldDone=false; playWorld().then(()=>{window.__worldDone=true})}")
    pg.wait_for_selector('.pw-host[data-theme="castle"] .cw-root[data-art="ready"]', timeout=8000)


def go(pg, where):
    if where == "hub":
        pg.click(".cw-home")
    else:
        if place(pg) != "hub":
            pg.click(".cw-home")
        pg.click('.cw-card[data-go="%s"]' % where)
    pg.wait_for_function("(w)=>{const r=document.querySelector('.cw-root');return r.dataset.place===w && r.dataset.art==='ready'}", arg=where, timeout=5000)
    pg.wait_for_timeout(250)


def pictures_ready(pg):
    pg.wait_for_function("()=>[...document.querySelectorAll('.cw-root img')].every(i=>i.complete)", timeout=8000)
    broken = pg.evaluate("()=>[...document.querySelectorAll('.cw-root img')].filter(i=>!i.naturalWidth).map(i=>i.getAttribute('src'))")
    ok("pictures load", not broken, " | ".join(broken[:4]))


def fit(pg, label):
    pictures_ready(pg)
    probs = pg.evaluate(FIT_JS, MIN_TARGET)
    ok("layout " + label, not probs, "; ".join(probs[:6]))


def shot(pg, name):
    if "--shots" in sys.argv:
        pictures_ready(pg)
        pg.wait_for_timeout(500)
        pg.screenshot(path=os.path.join(SHOTS, name + ".png"))


def main():
    os.makedirs(SHOTS, exist_ok=True)
    srv = None
    if not server_up():
        srv = subprocess.Popen([sys.executable, "-m", "http.server", str(PORT)], cwd=SITE, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        for _ in range(50):
            if server_up():
                break
            time.sleep(0.1)
    try:
        with sync_playwright() as p:
            br = p.chromium.launch(args=["--mute-audio"]) if ENGINE == "chromium" else getattr(p, ENGINE).launch()   # silent: speech and Web Audio are stubbed
            run_flow(br)
            run_grounds(br)
            run_layouts(br)
            br.close()
    finally:
        if srv:
            srv.terminate()
            srv.wait(10)
    print("RESULT %d/%d passed (%s)" % (sum(res), len(res), ENGINE))


def new_page(br, w, h, errs, bad):
    ctx = br.new_context(viewport={"width": w, "height": h}, has_touch=w < 900)
    pg = ctx.new_page()
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("console", lambda m: errs.append("console: " + m.text) if m.type == "error" and "castle" in m.text.lower() else None)
    pg.on("response", lambda r: bad.append("%d %s" % (r.status, r.url)) if r.status >= 400 and "/art/" in r.url else None)
    pg.add_init_script(STUB)
    pg.goto(URL)
    pg.evaluate("()=>localStorage.clear()")
    pg.reload()
    pg.wait_for_selector('.over .go[data-v="kennedy"]')
    return ctx, pg


def run_flow(br):
    errs, bad = [], []
    ctx, pg = new_page(br, 390, 844, errs, bad)
    open_world(pg, give=200)
    ok("opens on the map", place(pg) == "hub")
    ok("5 places on the map (castle, stable, yard, wall, grounds)", pg.locator(".cw-card[data-go]").count() == 5)

    # --- castle: build a tower for 20 coins
    go(pg, "castle")
    ok("castle opens", place(pg) == "castle")
    ok("castle shows glowing spots", pg.locator(".cw-spot.empty").count() >= 5)
    c0 = coins(pg)
    pg.click('.cw-spot[data-slot="tower_l"]')
    pg.wait_for_selector(".cw-tray")
    ok("tray shows the 3 towers", pg.locator(".cw-tile").count() == 3)
    pg.click('.cw-tile[data-item="tower_round"]')
    pg.wait_for_timeout(300)
    ok("building takes the coins", coins(pg) == c0 - 20, "%s -> %s" % (c0, coins(pg)))
    ok("tower is placed", pg.locator('.cw-part[data-slot="tower_l"]').count() == 1)
    ok("tower saved in the data", castle_data(pg, "slots").get("tower_l") == "tower_round")
    ok("a flag spot appears on the new tower", pg.locator('.cw-spot[data-slot="flag_l"]').count() == 1)
    # same part again on the other side: owned, so free
    c1 = coins(pg)
    pg.click('.cw-spot[data-slot="tower_r"]'); pg.wait_for_selector(".cw-tray")
    pg.click('.cw-tile[data-item="tower_round"]'); pg.wait_for_timeout(300)
    ok("an owned part is free to place", coins(pg) == c1 and castle_data(pg, "slots").get("tower_r") == "tower_round")
    # not enough coins: refused
    pg.evaluate("()=>{__game.P.coins=3}")
    pg.click('.cw-spot[data-slot="keep"]'); pg.wait_for_selector(".cw-tray")
    pg.click('.cw-tile[data-item="keep_gold"]'); pg.wait_for_timeout(300)
    ok("not enough coins: no coins taken", coins(pg) == 3)
    ok("not enough coins: not unlocked", not (castle_data(pg, "owned") or {}).get("keep_gold") and not castle_data(pg, "slots").get("keep"))
    ok("not enough coins: soft shake", pg.locator('.cw-tile[data-item="keep_gold"].cw-no').count() == 1)
    ok("tray stays open after a no", pg.locator(".cw-tray").count() == 1)
    pg.click(".cw-x")
    ok("close button closes the tray", pg.locator(".cw-tray").count() == 0)
    pg.evaluate("()=>{__game.P.coins=200}")

    # --- stable: brush, apple, pet, ride
    go(pg, "stable")
    ok("stable opens", place(pg) == "stable")
    for _ in range(3):
        pg.click('.cw-tool[data-act="brush"]')
        pg.wait_for_timeout(450)
    pg.wait_for_function("()=>document.querySelector('.cw-root').dataset.mud==='0'", timeout=4000)
    ok("pony brushed clean", pg.evaluate("()=>document.querySelector('.cw-root').dataset.mud") == "0")
    pg.wait_for_timeout(400)
    a0 = castle_data(pg, "pony_apples")
    pg.click('.cw-tool[data-act="apple"]'); pg.wait_for_timeout(700)
    ok("pony ate an apple", castle_data(pg, "pony_apples") == a0 + 1)
    c2 = coins(pg)
    pg.click(".cw-petspot"); pg.wait_for_selector(".cw-tray")
    pg.click('.cw-tile[data-item="dog"]'); pg.wait_for_timeout(400)
    ok("pet adopted for 30 coins", castle_data(pg, "pet") == "dog" and coins(pg) == c2 - 30)
    ok("pet shows with its food button", pg.locator(".cw-pet").count() == 1 and pg.locator('.cw-tool[data-act="food"]').count() == 1)
    pg.wait_for_timeout(300)
    pg.click('.cw-tool[data-act="food"]'); pg.wait_for_timeout(700)
    ok("pet fed", castle_data(pg, "pet_meals") == 1)
    shot(pg, "flow_stable_with_pet_phone")
    pg.wait_for_timeout(1800)
    pg.click('.cw-tool[data-act="ride"]')
    pg.wait_for_function("()=>document.querySelector('.cw-root').dataset.place==='ride'")
    for k in range(3):
        pg.click('.cw-go[data-act="go"]')
        pg.wait_for_function("(k)=>document.querySelector('.cw-root').dataset.ride===String(k)", arg=k + 1, timeout=4000)
    pg.wait_for_function("()=>document.querySelector('.cw-root').dataset.place==='stable'", timeout=5000)
    ok("ride loops back to the stable", place(pg) == "stable" and castle_data(pg, "rides") == 1)

    # --- yard: recruit a buddy
    go(pg, "yard")
    ok("yard opens", place(pg) == "yard")
    c3 = coins(pg)
    pg.click('.cw-char[data-buddy="leaf"]'); pg.wait_for_timeout(300)
    ok("buddy recruited for 20 coins", castle_data(pg, "buddies") == ["leaf"] and coins(pg) == c3 - 20)
    pg.evaluate("()=>{__game.P.coins=5}")
    pg.click('.cw-char[data-buddy="sea"]'); pg.wait_for_timeout(300)
    ok("buddy refused without coins", castle_data(pg, "buddies") == ["leaf"] and coins(pg) == 5)
    pg.click('.cw-char[data-act="dummy"]'); pg.wait_for_timeout(500)
    ok("dummy gets bopped", pg.evaluate("()=>document.querySelector('.cw-root').dataset.practice") == "1")

    # --- wall: a defence wave to the end
    go(pg, "wall")
    ok("wall opens", place(pg) == "wall")
    c4 = coins(pg)
    pg.click('.cw-horn')
    ok("wave starts", pg.evaluate("()=>document.querySelector('.cw-root').dataset.wave") == "running")
    # more buddies, more pillows: with one buddy, one tap must bop 2 goblins
    pg.wait_for_function("()=>[...document.querySelectorAll('.cw-gob[data-state=\"walk\"]')].filter(e=>{const r=e.getBoundingClientRect();return r.left>0&&r.right<innerWidth}).length>=2", timeout=8000)
    pg.evaluate("()=>[...document.querySelectorAll('.cw-gob[data-state=\"walk\"]')].find(e=>{const r=e.getBoundingClientRect();return r.left>0&&r.right<innerWidth}).click()")
    pg.wait_for_function("()=>Number(document.querySelector('.cw-root').dataset.bopped)>=2", timeout=4000)
    ok("one tap with one buddy bops 2 goblins", pg.evaluate("()=>document.querySelector('.cw-root').dataset.bopped") == "2",
       pg.evaluate("()=>document.querySelector('.cw-root').dataset.bopped"))
    t_end = time.time() + 15
    tapped = 1
    while time.time() < t_end:
        state = pg.evaluate("()=>document.querySelector('.cw-root').dataset.wave")
        if state != "running":
            break
        # tap only some goblins, so that others reach the wall and fall asleep
        if tapped < 3:
            n = pg.evaluate("""()=>{const g=[...document.querySelectorAll('.cw-gob[data-state="walk"]')].find(e=>{const r=e.getBoundingClientRect();return r.left>0&&r.right<innerWidth});
                              if(g){g.click();return 1}return 0}""")
            tapped += n
        pg.wait_for_timeout(120)
    ok("wave ends with a cheer", pg.evaluate("()=>document.querySelector('.cw-root').dataset.wave") == "cheer")
    ok("goblins got bopped", int(pg.evaluate("()=>document.querySelector('.cw-root').dataset.bopped") or 0) >= 1)
    # he leaves at once after the cheer: the bonus must still be paid
    pg.click(".cw-home")
    pg.wait_for_timeout(300)
    ok("3 bonus coins (even when he leaves at once)", coins(pg) == c4 + 3, "%s -> %s" % (c4, coins(pg)))
    ok("bonus recorded", pg.evaluate("()=>__game.P.world.bonus.last===3 && __game.P.world.bonus.total===3"))
    ok("waves counted", castle_data(pg, "waves") == 1)
    go(pg, "wall")
    ok("horn is back for another wave", pg.locator(".cw-horn:visible").count() == 1)

    # --- reload: everything bought is still there
    left = coins(pg)
    pg.evaluate("()=>PlayWorlds._finish()")
    pg.wait_for_function("()=>window.__worldDone===true", timeout=5000)
    ok("world closes cleanly", pg.locator(".pw-host").count() == 0)
    pg.reload()
    pg.wait_for_selector('.over .go[data-v="kennedy"]')
    open_world(pg)
    ok("coins kept after reload", coins(pg) == left)
    ok("castle kept after reload", (castle_data(pg, "slots") or {}).get("tower_l") == "tower_round" and (castle_data(pg, "owned") or {}).get("tower_round"))
    ok("pet kept after reload", castle_data(pg, "pet") == "dog")
    ok("buddy kept after reload", castle_data(pg, "buddies") == ["leaf"])
    go(pg, "castle")
    ok("built tower shows after reload", pg.locator('.cw-part[data-slot="tower_l"]').count() == 1)
    go(pg, "yard")
    ok("buddy stands in the yard after reload", pg.locator('.cw-char[data-buddy="leaf"]:not(.wait)').count() == 1)
    ok("no page errors (flow)", not errs, " | ".join(errs[:5]))
    ok("no missing pictures (flow)", not bad, " | ".join(bad[:5]))
    ctx.close()


def thing_box(pg, tid):
    return pg.evaluate("(t)=>{const e=document.querySelector('.cg-thing[data-id=\"'+t+'\"]'); if(!e) return null; const r=e.getBoundingClientRect(); return [r.left,r.top,r.width,r.height]}", tid)


def grounds_data(pg):
    return pg.evaluate("()=>JSON.parse(JSON.stringify(((__game.P.world||{}).castle||{}).grounds||{owned:{},items:[]}))")


def buy_and_place(pg, group, tid):
    pg.click('.cg-grp[data-group="%s"]' % group)
    pg.wait_for_selector(".cw-tray")
    pg.click('.cw-tile[data-item="%s"]' % tid)
    pg.wait_for_timeout(150)


def reopen_world(pg):
    pg.evaluate("()=>{PlayWorlds._finish()}")
    pg.wait_for_function("()=>window.__worldDone===true", timeout=5000)
    pg.evaluate("()=>{window.__worldDone=false; playWorld().then(()=>{window.__worldDone=true})}")
    pg.wait_for_selector('.cw-root[data-art="ready"]')


def run_grounds(br):
    """My Grounds: buy once, place as many as wanted, drag to move, drop on the bin to put away, tap for a job, saved."""
    for label, w, h in SIZES:
        errs, bad = [], []
        ctx, pg = new_page(br, w, h, errs, bad)
        open_world(pg, give=300)
        go(pg, "grounds")
        L = "grounds " + label
        ok(L + " starts empty with 4 group buttons", pg.locator(".cg-grp").count() == 4 and pg.locator(".cg-thing").count() == 0)
        ok(L + " the first group button glows while empty", pg.locator(".cg-grp.glow").count() == 1)
        fit(pg, L + " empty")
        shot(pg, "grounds_empty_" + label)
        all_things = pg.evaluate("()=>Object.keys(CastleGrounds.THINGS)")
        ok(L + " 26 things in 4 groups", len(all_things) == 26 and pg.evaluate("()=>CastleGrounds.GROUPS.length") == 4)
        for g in ("house", "farm", "fun", "nature"):
            want = pg.evaluate("(g)=>Object.keys(CastleGrounds.THINGS).filter(k=>CastleGrounds.THINGS[k].g===g).length", g)
            pg.click('.cg-grp[data-group="%s"]' % g)
            pg.wait_for_selector(".cw-tray")
            ok(L + " tray %s shows %d things" % (g, want), pg.locator(".cw-tile").count() == want, pg.locator(".cw-tile").count())
            fit(pg, L + " tray " + g)
            if g == "house":
                shot(pg, "grounds_tray_" + label)
            pg.click(".cw-x")
            pg.wait_for_timeout(120)
        c0 = coins(pg)
        buy_and_place(pg, "house", "cottage")
        pg.wait_for_timeout(200)
        ok(L + " buying takes the price", coins(pg) == c0 - 25, "%s -> %s" % (c0, coins(pg)))
        ok(L + " the thing is placed and the tray closed", pg.locator(".cg-thing").count() == 1 and pg.locator(".cw-tray").count() == 0)
        gd = grounds_data(pg)
        ok(L + " saved: owned and placed", gd["owned"].get("cottage") and len(gd["items"]) == 1, gd)
        c1 = coins(pg)
        buy_and_place(pg, "house", "cottage")
        pg.wait_for_timeout(200)
        ok(L + " an owned thing is free to place again", coins(pg) == c1 and pg.locator(".cg-thing").count() == 2)
        pg.evaluate("()=>{__game.P.coins=2}")
        buy_and_place(pg, "fun", "statue")
        pg.wait_for_timeout(200)
        ok(L + " not enough coins: refused", coins(pg) == 2 and pg.locator(".cg-thing").count() == 2 and pg.locator(".cw-tray").count() == 1)
        pg.click(".cw-x")
        pg.wait_for_timeout(120)
        for tid in all_things:
            gname = pg.evaluate("(t)=>CastleGrounds.THINGS[t].g", tid)
            if pg.locator(".cg-thing").count() >= 38:
                break
            pg.evaluate("()=>{__game.P.coins=300}")
            buy_and_place(pg, gname, tid)
        small = pg.evaluate("()=>[...document.querySelectorAll('.cg-thing')].filter(e=>e.offsetWidth<71.5).map(e=>e.dataset.t)")
        ok(L + " every placed thing is at least 72 px wide", not small, small)
        bad_art = pg.evaluate("()=>[...document.querySelectorAll('.cg-thing')].filter(e=>!e.querySelector('svg')||e.querySelector('svg').getBoundingClientRect().height<20).map(e=>e.dataset.t)")
        ok(L + " every thing has a picture", not bad_art, bad_art)
        out = pg.evaluate("()=>{const W=innerWidth,H=innerHeight; return [...document.querySelectorAll('.cg-thing')].filter(e=>{const r=e.getBoundingClientRect(); return r.right<10||r.left>W-10||r.bottom<10||r.top>H}).map(e=>e.dataset.t)}")
        ok(L + " every thing is on the screen", not out, out)
        ok(L + " all 26 kinds were bought", len(grounds_data(pg)["owned"]) == 26, len(grounds_data(pg)["owned"]))
        shot(pg, "grounds_full_" + label)
        pg.evaluate("()=>{const G=__game.P.world.castle.grounds; G.items=G.items.slice(0,3)}")
        reopen_world(pg)
        go(pg, "grounds")
        ok(L + " things come back after the world is closed and opened", pg.locator(".cg-thing").count() == 3)
        tid = grounds_data(pg)["items"][0]["id"]
        b = thing_box(pg, tid)
        cx, cy = b[0] + b[2] / 2, b[1] + b[3] / 2
        pg.mouse.move(cx, cy)
        pg.mouse.down()
        pg.mouse.move(cx + 40, cy + 20, steps=4)
        pg.mouse.move(cx + 90, cy - 30, steps=4)
        ok(L + " the bin shows while dragging", pg.locator(".cg-bin.on").count() == 1)
        pg.mouse.up()
        pg.wait_for_timeout(150)
        b2 = thing_box(pg, tid)
        ok(L + " drag moves it", abs((b2[0] - b[0]) - 90) < 25, (b, b2))
        ok(L + " the bin is hidden again", pg.locator(".cg-bin.on").count() == 0)
        it = [i for i in grounds_data(pg)["items"] if i["id"] == tid][0]
        ok(L + " the new spot is saved", 0 <= it["x"] <= 1 and 0 <= it["y"] <= 1, it)
        b3 = thing_box(pg, tid)
        pg.mouse.click(b3[0] + b3[2] / 2, b3[1] + b3[3] / 2)
        pg.wait_for_timeout(120)
        ok(L + " a tap does its job", pg.evaluate("()=>document.querySelector('.cw-root').dataset.lastact") == "cottage")
        b4 = thing_box(pg, tid)
        ok(L + " a tap does not move it", abs(b4[0] - b3[0]) < 3 and abs(b4[1] - b3[1]) < 3)
        n0 = pg.locator(".cg-thing").count()
        bin_box = pg.evaluate("()=>{const e=document.querySelector('.cg-bin'); e.classList.add('on'); const r=e.getBoundingClientRect(); e.classList.remove('on'); return [r.left,r.top,r.width,r.height]}")
        b5 = thing_box(pg, tid)
        pg.mouse.move(b5[0] + b5[2] / 2, b5[1] + b5[3] / 2)
        pg.mouse.down()
        pg.mouse.move(b5[0] + b5[2] / 2 + 30, b5[1] + 30, steps=3)
        pg.mouse.move(bin_box[0] + bin_box[2] / 2, bin_box[1] + bin_box[3] / 2, steps=6)
        pg.mouse.up()
        pg.wait_for_timeout(200)
        ok(L + " dropped on the bin: put away", pg.locator(".cg-thing").count() == n0 - 1 and thing_box(pg, tid) is None)
        ok(L + " put away but still owned", grounds_data(pg)["owned"].get("cottage") and len(grounds_data(pg)["items"]) == n0 - 1)
        c2 = coins(pg)
        buy_and_place(pg, "house", "cottage")
        pg.wait_for_timeout(200)
        ok(L + " placing it again costs nothing", coins(pg) == c2 and pg.locator(".cg-thing").count() == n0)
        go(pg, "hub")
        ok(L + " the map card shows the placed things", pg.locator('.cw-card[data-go="grounds"] .cg-thing').count() >= 1)
        fit(pg, L + " map")
        ok("no page errors (grounds " + label + ")", not errs, " | ".join(errs[:5]))
        ok("no missing pictures (grounds " + label + ")", not bad, " | ".join(bad[:5]))
        ctx.close()


def run_layouts(br):
    for label, w, h in SIZES:
        errs, bad = [], []
        ctx, pg = new_page(br, w, h, errs, bad)
        # a rich save: some castle, a pet and all 4 buddies, so every place is full
        pg.evaluate("""()=>localStorage.setItem('kidsMaths.game.kennedy', JSON.stringify({coins:120, world:{castle:{
            owned:{keep_stone:1,tower_round:1,tower_tall:1,walls_windows:1,gate_drawbridge:1,flag_red:1,flag_gold:1,banner_blue:1,moat_ducks:1,garden_flowers:1},
            slots:{keep:'keep_stone',tower_l:'tower_round',tower_r:'tower_tall',walls:'walls_windows',gate:'gate_drawbridge',flag_l:'flag_red',flag_k:'flag_gold',banner_l:'banner_blue',moat:'moat_ducks',garden_l:'garden_flowers'},
            pet:'cat', buddies:['leaf','sun','plum','sea']}}}))""")
        pg.reload()
        pg.wait_for_selector('.over .go[data-v="kennedy"]')
        open_world(pg)
        pg.wait_for_timeout(400)
        fit(pg, "hub " + label)
        shot(pg, "hub_" + label)
        for where in ("castle", "stable", "yard", "wall", "grounds"):
            go(pg, where)
            fit(pg, where + " " + label)
            shot(pg, where + "_" + label)
            if where == "castle":
                pg.click('.cw-spot[data-slot="garden_r"]'); pg.wait_for_selector(".cw-tray")
                fit(pg, "castle tray " + label)
                shot(pg, "castle_tray_" + label)
                pg.click(".cw-x")
            if where == "wall":
                pg.click(".cw-horn")
                pg.wait_for_timeout(900)
                fit(pg, "wall wave " + label)
                shot(pg, "wall_wave_" + label)
                pg.wait_for_function("()=>document.querySelector('.cw-root').dataset.wave!=='running'", timeout=15000)
        go(pg, "stable")
        pg.click('.cw-tool[data-act="ride"]')
        pg.wait_for_function("()=>document.querySelector('.cw-root').dataset.place==='ride'")
        pg.wait_for_timeout(300)
        fit(pg, "ride " + label)
        shot(pg, "ride_" + label)
        # an empty castle (first visit) as well
        pg.evaluate("()=>PlayWorlds._finish()")
        pg.wait_for_function("()=>window.__worldDone===true", timeout=5000)
        pg.evaluate("()=>{__game.P.world={}; }")
        pg.evaluate("()=>{window.__worldDone=false; playWorld().then(()=>{window.__worldDone=true})}")
        pg.wait_for_selector('.cw-root[data-art="ready"]')
        go(pg, "castle")
        fit(pg, "empty castle " + label)
        shot(pg, "castle_empty_" + label)
        go(pg, "stable")
        fit(pg, "stable no pet " + label)
        shot(pg, "stable_nopet_" + label)
        ok("no page errors (" + label + ")", not errs, " | ".join(errs[:5]))
        ok("no missing pictures (" + label + ")", not bad, " | ".join(bad[:5]))
        ctx.close()


if __name__ == "__main__":
    main()
