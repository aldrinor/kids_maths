"""Silent browser test for the reward mini-games.

Cafe = "Mimi's Hot Chocolate" (game/rewards/cafe_hot_chocolate.js), castle = "Pony Stable"
(game/rewards/castle_pony_stable.js), both on game/rewards/reward_core.js.

Plays both games to the end like a child, in Chromium and WebKit, at six sizes, in fast mode.
Cafe is played by taps on every size and also by real mouse drags (cup, hold-to-pour, stir circles, toppings,
cup to the friend) on the mouse sizes, plus one real touch-drag run in Chromium.
Castle is played by taps on every size, by a real mouse rub and an apple dragged to the pony on the mouse sizes,
and by a real touch rub in Chromium. Castle buttons must be at least 72 px (cafe tools 64 px).
Also checks: nothing plays itself (no taps = no progress, and a hint shows; the pony never jumps by itself),
__rewardAutoPlay, reduced motion, close() mid-game, and castle then cafe on one page.
Prints only failures and one final line:  RESULT n/m passed

Run from anywhere:  python tests/game_rewards_test.py [URL] [chromium|webkit]   (no engine = both engines, side by side)
URL defaults to http://localhost:8792/game/rewards_preview.html. If nothing answers on the URL's port, the test
starts "python -m http.server <port>" in the gh_site folder and stops it at the end.
"""
import math
import re
import os
import socket
import subprocess
import sys
import time
from urllib.parse import urlparse

SITE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WORK_TMP = os.path.join(os.path.dirname(SITE), "work_tmp")
os.makedirs(WORK_TMP, exist_ok=True)
os.environ["TEMP"] = WORK_TMP
os.environ["TMP"] = WORK_TMP

from playwright.sync_api import sync_playwright  # noqa: E402  (after TEMP is set)

URL = next((a for a in sys.argv[1:] if a.startswith("http")), "http://localhost:8792/game/rewards_preview.html")
PORT = urlparse(URL).port or 80
SIZES = [(360, 640), (390, 844), (820, 1180), (1180, 820), (1920, 1080), (640, 360)]
TOUCH_SIZES = {(360, 640), (390, 844), (640, 360)}
THEMES = ["cafe", "castle"]
GAME_TIMEOUT_MS = 90000
MIN_TARGET = 63.5  # every cafe touch target at least 64 px
MIN_CASTLE = 71.5  # every castle touch target at least 72 px

STUB = (
    "window.speechSynthesis={speak(){},cancel(){},getVoices(){return[]},pause(){},resume(){}};"
    "window.SpeechSynthesisUtterance=function(){};"
    "window.AudioContext=window.webkitAudioContext=undefined;"
    "window.__rewardFast=true;"
)

CHECK_JS = """
(minTarget) => {
  const out = [];
  const root = document.querySelector('.rg-root, .rw-root');
  if (!root) { return ['no game root on the page']; }
  const W = window.innerWidth, H = window.innerHeight;
  const shown = (e) => {
    const r = e.getBoundingClientRect(); const cs = getComputedStyle(e);
    if (e.hidden || r.width < 1 || r.height < 1) return false;
    if (cs.visibility === 'hidden' || cs.display === 'none') return false;
    let n = e; while (n && n !== document.body) { if (parseFloat(getComputedStyle(n).opacity) < 0.05) return false; n = n.parentElement; }
    return true;
  };
  const name = (e) => (e.tagName + '.' + (e.className && e.className.baseVal !== undefined ? e.className.baseVal : e.className)).slice(0, 60);
  root.querySelectorAll('button').forEach((b) => {
    if (!shown(b) || b.disabled) return;
    const r = b.getBoundingClientRect();
    if (r.width < minTarget || r.height < minTarget) out.push('button too small ' + name(b) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
  });
  const fit = Array.from(root.querySelectorAll('[data-rg-fit],button')).filter(shown);
  fit.forEach((e) => {
    const r = e.getBoundingClientRect();
    if (r.left < -1 || r.top < -1 || r.right > W + 1 || r.bottom > H + 1) {
      out.push('outside viewport ' + name(e) + ' [' + Math.round(r.left) + ',' + Math.round(r.top) + ',' + Math.round(r.right) + ',' + Math.round(r.bottom) + '] in ' + W + 'x' + H);
    }
  });
  const de = document.documentElement;
  if (de.scrollWidth > W + 1 || de.scrollHeight > H + 1 || document.body.scrollHeight > H + 1 || document.body.scrollWidth > W + 1) out.push('page scrolls');
  if (window.scrollX !== 0 || window.scrollY !== 0) out.push('page was scrolled');
  if (document.querySelector('audio,video')) out.push('audio or video element found');
  return out;
}
"""
STEP_JS = "(s) => { const r = document.querySelector('.rw-root'); return !!r && r.dataset.step === s; }"
LINES_JS = "() => { const r = document.querySelector('.rw-root'); return r ? (r.dataset.lines || '').split('|') : []; }"
HAS_LINE_JS = "(t) => { const r = document.querySelector('.rw-root'); return !!r && (r.dataset.lines || '').split('|').includes(t); }"
TOPS_JS = "() => document.querySelectorAll('.rw-hc-cup .rw-tops > g').length"


def port_open():
    with socket.socket() as s:
        s.settimeout(0.3)
        return s.connect_ex(("127.0.0.1", PORT)) == 0


class Run:
    """One scenario: one page, its console errors, and its failures."""

    def __init__(self, browser, engine, label, size, touch, reduced=False, auto=False):
        self.label = "%s %s %dx%d%s" % (engine, label, size[0], size[1], " reduced" if reduced else "")
        self.fails = []
        self.touch = touch
        self.size = size
        self.min_target = MIN_TARGET
        opts = {"viewport": {"width": size[0], "height": size[1]}, "reduced_motion": "reduce" if reduced else "no-preference"}
        if touch:
            opts.update({"has_touch": True, "is_mobile": True})
        self.ctx = browser.new_context(**opts)
        self.page = self.ctx.new_page()
        self.page.set_default_timeout(GAME_TIMEOUT_MS)
        self.page.add_init_script(STUB + ("window.__rewardAutoPlay=true;" if auto else ""))
        self.page.on("console", self._console)
        self.page.on("pageerror", lambda e: self.fails.append("page error: %s" % str(e)[:200]))

    def _console(self, msg):
        if msg.type != "error":
            return
        if "favicon" in (msg.location.get("url") or "") or "favicon" in msg.text:
            return
        self.fails.append("console error: %s" % msg.text[:200])

    def check(self, when):
        for problem in self.page.evaluate(CHECK_JS, self.min_target):
            self.fails.append("%s: %s" % (when, problem))

    def tap(self, locator, force=False):
        if self.touch:
            locator.tap(force=force)
        else:
            locator.click(force=force)

    def tap_at(self, x, y):
        if self.touch:
            self.page.touchscreen.tap(x, y)
        else:
            self.page.mouse.click(x, y)

    def open(self, theme):
        self.page.goto(URL)
        self.page.wait_for_selector("#go_" + theme)
        self.tap(self.page.locator("#go_" + theme))
        self.page.wait_for_selector(".rg-root, .rw-root")
        self.min_target = MIN_CASTLE if theme == "castle" else MIN_TARGET
        if theme == "castle":
            self.page.wait_for_selector(".rw-root[data-art=ready]")

    def wait_result(self):
        self.page.wait_for_function("window.__rewardResult && window.__rewardResult.done === true")
        if self.page.query_selector(".rg-root, .rw-root"):
            self.fails.append("game root still on the page after Done")

    def close(self):
        self.ctx.close()


# ---------------------------------------------------------------- cafe: Mimi's Hot Chocolate
def wait_step(r, step, timeout=20000):
    r.page.wait_for_function(STEP_JS, arg=step, timeout=timeout)


def centre(box):
    return box["x"] + box["width"] / 2, box["y"] + box["height"] / 2


def mouse_drag(r, frm, to, steps=12):
    m = r.page.mouse
    m.move(*frm)
    m.down()
    m.move(*to, steps=steps)
    m.up()


def cafe_finish(r, expect_fav, done_tap=None):
    p = r.page
    p.wait_for_function(HAS_LINE_JS, arg="Mmm!", timeout=20000)
    r.check("cafe friend sips")
    p.wait_for_selector(".rw-done", state="visible", timeout=20000)
    p.wait_for_timeout(400)
    r.check("cafe done")
    lines = p.evaluate(LINES_JS)
    if expect_fav and "My favourite!" not in lines:
        r.fails.append("the favourite topping was on the drink but the friend did not say 'My favourite!'")
    if "Hello Mimi! Can I have a hot chocolate, please?" not in lines:
        r.fails.append("the friend never ordered")
    if p.query_selector(".rw-hc-sticker[hidden]"):
        r.fails.append("no sticker of the drink left on the mat")
    if done_tap:
        done_tap(centre(p.locator(".rw-done").bounding_box()))
    else:
        r.tap(p.locator(".rw-done"))
    r.wait_result()


def play_cafe(r, opened=False):
    """Every step by taps (touch sizes) or clicks (mouse sizes)."""
    p = r.page
    if not opened:
        r.open("cafe")
    wait_step(r, "cup")
    p.wait_for_timeout(300)
    r.check("cafe start")
    r.tap(p.locator(".rw-tool[data-tool=cup]").nth(1))
    wait_step(r, "pour")
    p.wait_for_timeout(400)
    for _ in range(3):  # three taps fill the cup
        r.tap(p.locator(".rw-tool[data-tool=jug]"))
        p.wait_for_timeout(450)
    wait_step(r, "stir")
    r.check("cafe stir")
    for _ in range(3):  # three taps on the cup stir it
        r.tap(p.locator(".rw-hc-cupzone"))
        p.wait_for_timeout(350)
    wait_step(r, "toppings")
    p.wait_for_timeout(300)
    for i in range(9):  # 8 spots: the 9th tap (on a greyed, aria-disabled tool) must do nothing
        r.tap(p.locator(".rw-tool[data-tool=top]").nth(i % 4), force=(i == 8))
        p.wait_for_timeout(120)
    p.wait_for_timeout(300)
    if p.evaluate(TOPS_JS) != 8:
        r.fails.append("expected 8 toppings on the cup, found %d" % p.evaluate(TOPS_JS))
    if p.locator(".rw-tool[data-tool=top].rw-spent").count() != 4:
        r.fails.append("the topping tray did not grey out when the cup was full")
    p.wait_for_function(HAS_LINE_JS, arg="It's full!", timeout=8000)
    p.wait_for_selector(".rw-hc-bell", state="visible")
    r.check("cafe toppings full")
    if p.evaluate(STEP_JS, "toppings") is not True:
        r.fails.append("the game moved on before the bell")
    r.tap(p.locator(".rw-hc-bell"))
    wait_step(r, "serve")
    r.tap(p.locator(".rw-hc-friendhit"))
    cafe_finish(r, expect_fav=True)


def play_cafe_drag(r):
    """Every step by real mouse drags and holds."""
    p = r.page
    r.open("cafe")
    wait_step(r, "cup")
    p.wait_for_timeout(300)
    mouse_drag(r, centre(p.locator(".rw-tool[data-tool=cup]").nth(0).bounding_box()), centre(p.locator(".rw-hc-mat").bounding_box()))
    wait_step(r, "pour")
    p.wait_for_timeout(400)
    p.mouse.move(*centre(p.locator(".rw-tool[data-tool=jug]").bounding_box()))
    p.mouse.down()
    p.wait_for_timeout(1500)  # hold: the milk rises while held (full in about 0.45 s in fast mode)
    p.mouse.up()
    wait_step(r, "stir")
    cup = p.locator(".rw-hc-cup").bounding_box()  # three and a half circles on the cup
    cx, cy = cup["x"] + cup["width"] * 100 / 220, cup["y"] + cup["height"] * 76 / 210
    rad = max(20, cup["width"] * 0.18)
    p.mouse.move(cx + rad, cy)
    p.mouse.down()
    for k in range(1, 3 * 24 + 13):
        a = k * 2 * math.pi / 24
        p.mouse.move(cx + rad * math.cos(a), cy + rad * math.sin(a))
    p.mouse.up()
    wait_step(r, "toppings")
    p.wait_for_timeout(300)
    for i in range(4):
        mouse_drag(r, centre(p.locator(".rw-tool[data-tool=top]").nth(i).bounding_box()), centre(p.locator(".rw-hc-cup").bounding_box()))
        p.wait_for_timeout(150)
    if p.evaluate(TOPS_JS) != 4:
        r.fails.append("dragged 4 toppings, found %d on the cup" % p.evaluate(TOPS_JS))
    mouse_drag(r, centre(p.locator(".rw-tool[data-tool=top]").nth(0).bounding_box()), (5, 5))  # far away: floats home
    p.wait_for_timeout(400)
    if p.evaluate(TOPS_JS) != 4:
        r.fails.append("a topping dropped far from the cup was added")
    if p.query_selector(".rw-ghost"):
        r.fails.append("a drag ghost was left on the screen")
    p.wait_for_selector(".rw-hc-bell", state="visible")
    r.check("cafe toppings by drag")
    mouse_drag(r, centre(p.locator(".rw-hc-cup").bounding_box()), centre(p.locator(".rw-hc-friendhit").bounding_box()))
    cafe_finish(r, expect_fav=True)


def touch_drag(cdp, frm, to, steps=10):
    cdp.send("Input.dispatchTouchEvent", {"type": "touchStart", "touchPoints": [{"x": frm[0], "y": frm[1]}]})
    for k in range(1, steps + 1):
        x = frm[0] + (to[0] - frm[0]) * k / steps
        y = frm[1] + (to[1] - frm[1]) * k / steps
        cdp.send("Input.dispatchTouchEvent", {"type": "touchMove", "touchPoints": [{"x": x, "y": y}]})
    cdp.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []})


def play_cafe_touch_drag(r):
    """Chromium only: real touch drags and a touch hold (checks touch-action and pointer capture)."""
    p = r.page
    cdp = p.context.new_cdp_session(p)
    r.open("cafe")
    wait_step(r, "cup")
    p.wait_for_timeout(300)
    touch_drag(cdp, centre(p.locator(".rw-tool[data-tool=cup]").nth(2).bounding_box()), centre(p.locator(".rw-hc-mat").bounding_box()))
    wait_step(r, "pour")
    p.wait_for_timeout(400)
    jug = centre(p.locator(".rw-tool[data-tool=jug]").bounding_box())
    cdp.send("Input.dispatchTouchEvent", {"type": "touchStart", "touchPoints": [{"x": jug[0], "y": jug[1]}]})
    p.wait_for_timeout(1500)
    cdp.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []})
    wait_step(r, "stir")
    for _ in range(3):
        r.tap(p.locator(".rw-hc-cupzone"))
        p.wait_for_timeout(350)
    wait_step(r, "toppings")
    p.wait_for_timeout(300)
    for i in (3, 1):
        touch_drag(cdp, centre(p.locator(".rw-tool[data-tool=top]").nth(i).bounding_box()), centre(p.locator(".rw-hc-cup").bounding_box()))
        p.wait_for_timeout(150)
    if p.evaluate(TOPS_JS) != 2:
        r.fails.append("touch-dragged 2 toppings, found %d" % p.evaluate(TOPS_JS))
    p.wait_for_selector(".rw-hc-bell", state="visible")
    touch_drag(cdp, centre(p.locator(".rw-hc-cup").bounding_box()), centre(p.locator(".rw-hc-friendhit").bounding_box()))
    def cdp_tap(pt):
        cdp.send("Input.dispatchTouchEvent", {"type": "touchStart", "touchPoints": [{"x": pt[0], "y": pt[1]}]})
        cdp.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []})
    cafe_finish(r, expect_fav=False, done_tap=cdp_tap)


def cafe_no_taps(r):
    """Nothing plays itself: with no taps the game stays on the cup step and a hint hand shows."""
    p = r.page
    r.open("cafe")
    wait_step(r, "cup")
    p.wait_for_timeout(2500)  # the hint comes after 5.5 s (1.1 s in fast mode)
    if p.evaluate(STEP_JS, "cup") is not True:
        r.fails.append("the game moved past the cup step with no taps")
    if not p.query_selector(".rw-hint"):
        r.fails.append("no hint hand after waiting")
    r.check("cafe waiting with a hint")
    p.evaluate("RewardGames.close()")
    p.wait_for_function("window.__rewardResult && window.__rewardResult.done === false")


def cafe_auto(r):
    """window.__rewardAutoPlay = true: the game does every step by itself (tests only); the test taps Done."""
    p = r.page
    r.open("cafe")
    p.wait_for_selector(".rw-done", state="visible", timeout=30000)
    if p.evaluate(TOPS_JS) < 1:
        r.fails.append("autoplay added no toppings")
    r.check("cafe autoplay done")
    r.tap(p.locator(".rw-done"))
    r.wait_result()


def castle_then_cafe(r):
    """Castle, closed midway, then cafe on the same page: the cafe game must still play and fit."""
    p = r.page
    r.open("castle")
    wait_step(r, "brush")
    p.wait_for_timeout(400)
    p.evaluate("RewardGames.close()")
    p.wait_for_function("window.__rewardResult && window.__rewardResult.done === false")
    p.wait_for_selector("#go_cafe", state="visible")
    r.tap(p.locator("#go_cafe"))
    p.wait_for_selector(".rw-root")
    r.min_target = MIN_TARGET
    play_cafe(r, opened=True)


# ---------------------------------------------------------------- castle: Pony Stable
DS_JS = "(k) => { const r = document.querySelector('.rw-root'); return r ? r.dataset[k] : null; }"
WAIT_DS_JS = "([k, v]) => { const r = document.querySelector('.rw-root'); return !!r && r.dataset[k] === v; }"


def wait_ds(r, key, value, timeout=20000):
    r.page.wait_for_function(WAIT_DS_JS, arg=[key, value], timeout=timeout)


def castle_rub(r, cdp=None):
    """Rub back and forth across the pony (about 5 sweeps of 40% of its width: cleans all 3 patches)."""
    b = r.page.locator(".rw-ps-ponyhit").bounding_box()
    y = b["y"] + b["height"] * 0.5
    xs = [b["x"] + b["width"] * k for k in (0.3, 0.7, 0.3, 0.7, 0.3, 0.7)]
    if cdp:
        cdp.send("Input.dispatchTouchEvent", {"type": "touchStart", "touchPoints": [{"x": xs[0], "y": y}]})
    else:
        r.page.mouse.move(xs[0], y)
        r.page.mouse.down()
    for a, z in zip(xs, xs[1:]):
        for k in range(1, 9):
            x = a + (z - a) * k / 8
            if cdp:
                cdp.send("Input.dispatchTouchEvent", {"type": "touchMove", "touchPoints": [{"x": x, "y": y}]})
            else:
                r.page.mouse.move(x, y)
    if cdp:
        cdp.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []})
    else:
        r.page.mouse.up()


def play_castle(r, how="tap"):
    """how = tap (every step by taps), mouse (a mouse rub, an apple dragged to the pony), touch (a CDP touch rub)."""
    p = r.page
    r.open("castle")
    wait_step(r, "brush")
    p.wait_for_timeout(300)
    r.check("castle start")
    if p.evaluate(DS_JS, "mud") != "3":
        r.fails.append("the pony did not start with 3 mud patches")
    if how == "tap":
        for _ in range(3):
            r.tap(p.locator(".rw-ps-ponyhit"))
            p.wait_for_timeout(200)
    else:
        castle_rub(r, p.context.new_cdp_session(p) if how == "touch" else None)
    wait_ds(r, "mud", "0", 8000)
    wait_step(r, "feed")
    p.wait_for_timeout(300)
    r.check("castle feed")
    for i in range(3):
        r.tap(p.locator(".rw-ps-treeapple[data-i='%d']" % i))
        p.wait_for_selector(".rw-ps-bapple[data-i='%d']" % i, state="visible")
        p.wait_for_timeout(300)
        if i == 0:
            r.check("castle apple in the basket")
            r.tap(p.locator(".rw-ps-bapple[data-i='0']"))
        elif i == 1 and how == "mouse":
            mouse_drag(r, centre(p.locator(".rw-ps-bapple[data-i='1']").bounding_box()), centre(p.locator(".rw-ps-ponyhit").bounding_box()))
        else:
            r.tap(p.locator(".rw-ps-ponyhit"))
        wait_ds(r, "fed", str(i + 1), 8000)
        p.wait_for_timeout(450)
    p.wait_for_selector(".rw-ps-go", state="visible", timeout=20000)
    p.wait_for_timeout(300)
    r.check("castle ride")
    for k in (1, 2):
        r.tap(p.locator(".rw-ps-go"))
        wait_ds(r, "stretch", str(k), 8000)
        p.wait_for_timeout(400)  # the core ignores a second tap on one button within 450 ms (a trot is 240 ms in fast mode)
    p.wait_for_selector(".rw-ps-jump", state="visible")
    p.wait_for_timeout(1000)  # the pony must wait at the log until Jump is tapped (5 s at real speed)
    r.check("castle at the log")
    if p.evaluate(DS_JS, "stretch") != "2" or not p.locator(".rw-ps-jump").is_visible():
        r.fails.append("the pony moved on at the log without a tap")
    r.tap(p.locator(".rw-ps-jump"))
    for k in (3, 4):
        p.wait_for_selector(".rw-ps-go", state="visible")
        p.wait_for_timeout(400)
        r.tap(p.locator(".rw-ps-go"))
        wait_ds(r, "stretch", str(k), 8000)
    wait_step(r, "gate")
    p.wait_for_selector(".rw-ps-gate", state="visible")
    p.wait_for_timeout(300)
    r.check("castle gate")
    r.tap(p.locator(".rw-ps-gate"))
    p.wait_for_selector(".rw-done", state="visible", timeout=20000)
    p.wait_for_timeout(400)
    r.check("castle done")
    lines = p.evaluate(LINES_JS)
    for want in ("My pony is muddy. Can you help?", "So shiny!", "Yum!", "Jump!", "We're home!"):
        if want not in lines:
            r.fails.append("the line %r was never said" % want)
    r.tap(p.locator(".rw-done"))
    r.wait_result()


def castle_no_taps(r):
    """Nothing plays itself: with no taps the pony stays muddy on the brush step and a hint hand shows."""
    p = r.page
    r.open("castle")
    wait_step(r, "brush")
    p.wait_for_timeout(2500)
    if p.evaluate(STEP_JS, "brush") is not True or p.evaluate(DS_JS, "mud") != "3":
        r.fails.append("the castle game moved on with no taps")
    if not p.query_selector(".rw-hint"):
        r.fails.append("no hint hand after waiting (castle)")
    r.check("castle waiting with a hint")
    p.evaluate("RewardGames.close()")
    p.wait_for_function("window.__rewardResult && window.__rewardResult.done === false")


def castle_auto(r):
    """window.__rewardAutoPlay = true: the castle game does every step by itself (tests only); the test taps Done."""
    p = r.page
    r.open("castle")
    p.wait_for_selector(".rw-done", state="visible", timeout=40000)
    if p.evaluate(DS_JS, "fed") != "3" or p.evaluate(DS_JS, "stretch") != "4":
        r.fails.append("castle autoplay skipped a step")
    r.check("castle autoplay done")
    r.tap(p.locator(".rw-done"))
    r.wait_result()


def close_midway(r, theme):
    p = r.page
    r.open(theme)
    p.wait_for_timeout(800)
    p.evaluate("RewardGames.close()")
    p.wait_for_function("window.__rewardResult && window.__rewardResult.done === false")
    if p.query_selector(".rg-root, .rw-root"):
        r.fails.append("root still on the page after close()")
    p.wait_for_timeout(1500)  # leftover timers or frames would fail here


def scenario(results, browser, engine, label, size, fn, reduced=False, auto=False):
    touch = size in TOUCH_SIZES
    r = None
    try:
        r = Run(browser, engine, label, size, touch, reduced, auto)
        fn(r)
    except Exception as exc:  # a timeout or a missing element is a failure, not a crash
        if r is None:
            results.append((False, ["%s %s: could not start: %s" % (engine, label, str(exc)[:200])]))
            return
        r.fails.append("exception: %s" % str(exc).splitlines()[0][:200])
    finally:
        if r is not None:
            results.append((not r.fails, ["FAIL %s | %s" % (r.label, f) for f in r.fails]))
            r.close()


def run_engines_side_by_side():
    """No engine named: run Chromium and WebKit at the same time, one child process each (the server is already up),
    then print both sets of failures and one combined RESULT line."""
    kids = [subprocess.Popen([sys.executable, os.path.abspath(__file__), URL, e], stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                             env=os.environ.copy(), text=True, encoding="utf-8", errors="replace") for e in ("chromium", "webkit")]
    passed = total = 0
    for kid in kids:
        out, _ = kid.communicate()
        for line in out.splitlines():
            m = re.match(r"RESULT (\d+)/(\d+) passed", line)
            if m:
                passed += int(m.group(1))
                total += int(m.group(2))
            elif line.strip():
                print(line)
    total = total or 1
    print("RESULT %d/%d passed" % (passed, total))
    return 0 if passed == total else 1


def main():
    server = None
    if not port_open():
        server = subprocess.Popen([sys.executable, "-m", "http.server", str(PORT)], cwd=SITE,
                                  stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, env=os.environ.copy())
    results = []
    try:
        for _ in range(50):
            if port_open():
                break
            time.sleep(0.1)
        else:
            print("FAIL could not start the web server on port %d" % PORT)
            print("RESULT 0/1 passed")
            return 1
        engines = [a for a in sys.argv[1:] if a in ("chromium", "webkit")]
        if not engines:
            return run_engines_side_by_side()
        with sync_playwright() as pw:
            for engine in engines:
                kwargs = {"args": ["--mute-audio"]} if engine == "chromium" else {}
                browser = getattr(pw, engine).launch(**kwargs)
                try:
                    for size in SIZES:
                        scenario(results, browser, engine, "cafe", size, play_cafe)
                        if size not in TOUCH_SIZES:
                            scenario(results, browser, engine, "cafe drag", size, play_cafe_drag)
                        scenario(results, browser, engine, "castle", size, play_castle)
                        if size not in TOUCH_SIZES:
                            scenario(results, browser, engine, "castle rub and drag", size, lambda r: play_castle(r, "mouse"))
                    if engine == "chromium":
                        scenario(results, browser, engine, "cafe touch drag", (390, 844), play_cafe_touch_drag)
                        scenario(results, browser, engine, "castle touch rub", (390, 844), lambda r: play_castle(r, "touch"))
                    scenario(results, browser, engine, "cafe no taps", (390, 844), cafe_no_taps)
                    scenario(results, browser, engine, "cafe autoplay", (820, 1180), cafe_auto, auto=True)
                    scenario(results, browser, engine, "castle no taps", (390, 844), castle_no_taps)
                    scenario(results, browser, engine, "castle autoplay", (820, 1180), castle_auto, auto=True)
                    scenario(results, browser, engine, "castle then cafe", (1180, 820), castle_then_cafe)
                    for size in ((390, 844), (1180, 820)):
                        scenario(results, browser, engine, "cafe", size, play_cafe, reduced=True)
                        scenario(results, browser, engine, "castle", size, play_castle, reduced=True)
                    for theme in THEMES:
                        scenario(results, browser, engine, theme + " close midway", (820, 1180), lambda r, t=theme: close_midway(r, t))
                finally:
                    browser.close()
    finally:
        if server is not None:
            server.terminate()
            try:
                server.wait(timeout=10)
            except subprocess.TimeoutExpired:
                server.kill()
    for ok, lines in results:
        for line in lines:
            print(line)
    passed = sum(1 for ok, _ in results if ok)
    print("RESULT %d/%d passed" % (passed, len(results)))
    return 0 if passed == len(results) else 1


if __name__ == "__main__":
    sys.exit(main())
