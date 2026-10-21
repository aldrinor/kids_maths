"""Silent browser test for the reward mini-games (game/rewards.js).

Plays both games to the end like a child, in Chromium and WebKit, at six sizes, in fast mode.
Also checks: castle ends with no taps, reduced motion, close() mid-game.
Prints only failures and one final line:  RESULT n/m passed

Run from anywhere:  python tests/game_rewards_test.py
It starts "python -m http.server 8792" in the gh_site folder and stops it at the end.
"""
import os
import socket
import subprocess
import sys
import time

SITE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WORK_TMP = os.path.join(os.path.dirname(SITE), "work_tmp")
os.makedirs(WORK_TMP, exist_ok=True)
os.environ["TEMP"] = WORK_TMP
os.environ["TMP"] = WORK_TMP

from playwright.sync_api import sync_playwright  # noqa: E402  (after TEMP is set)

PORT = 8792
URL = "http://localhost:%d/game/rewards_preview.html" % PORT
SIZES = [(360, 640), (390, 844), (820, 1180), (1180, 820), (1920, 1080), (640, 360)]
TOUCH_SIZES = {(360, 640), (390, 844), (640, 360)}
THEMES = ["cafe", "castle"]
GAME_TIMEOUT_MS = 90000

STUB = (
    "window.speechSynthesis={speak(){},cancel(){},getVoices(){return[]},pause(){},resume(){}};"
    "window.SpeechSynthesisUtterance=function(){};"
    "window.AudioContext=window.webkitAudioContext=undefined;"
    "window.__rewardFast=true;"
)

CHECK_JS = """
() => {
  const out = [];
  const root = document.querySelector('.rg-root');
  if (!root) { return ['no .rg-root on the page']; }
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
    if (!shown(b)) return;
    const r = b.getBoundingClientRect();
    if (r.width < 55.5 || r.height < 55.5) out.push('button too small ' + name(b) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
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


def port_open():
    with socket.socket() as s:
        s.settimeout(0.3)
        return s.connect_ex(("127.0.0.1", PORT)) == 0


class Run:
    """One scenario: one page, its console errors, and its failures."""

    def __init__(self, browser, engine, label, size, touch, reduced=False):
        self.label = "%s %s %dx%d%s" % (engine, label, size[0], size[1], " reduced" if reduced else "")
        self.fails = []
        self.touch = touch
        self.size = size
        opts = {"viewport": {"width": size[0], "height": size[1]}, "reduced_motion": "reduce" if reduced else "no-preference"}
        if touch:
            opts.update({"has_touch": True, "is_mobile": True})
        self.ctx = browser.new_context(**opts)
        self.page = self.ctx.new_page()
        self.page.set_default_timeout(GAME_TIMEOUT_MS)
        self.page.add_init_script(STUB)
        self.page.on("console", self._console)
        self.page.on("pageerror", lambda e: self.fails.append("page error: %s" % str(e)[:200]))

    def _console(self, msg):
        if msg.type != "error":
            return
        if "favicon" in (msg.location.get("url") or "") or "favicon" in msg.text:
            return
        self.fails.append("console error: %s" % msg.text[:200])

    def check(self, when):
        for problem in self.page.evaluate(CHECK_JS):
            self.fails.append("%s: %s" % (when, problem))

    def tap(self, locator):
        if self.touch:
            locator.tap()
        else:
            locator.click()

    def tap_at(self, x, y):
        if self.touch:
            self.page.touchscreen.tap(x, y)
        else:
            self.page.mouse.click(x, y)

    def open(self, theme):
        self.page.goto(URL)
        self.page.wait_for_selector("#go_" + theme)
        self.tap(self.page.locator("#go_" + theme))
        self.page.wait_for_selector(".rg-root")

    def wait_result(self):
        self.page.wait_for_function("window.__rewardResult && window.__rewardResult.done === true")
        if self.page.query_selector(".rg-root"):
            self.fails.append("game root still on the page after Done")

    def close(self):
        self.ctx.close()


def play_cafe(r):
    p = r.page
    r.open("cafe")
    p.wait_for_selector(".rg-swatch")
    r.check("cafe start")
    r.tap(p.locator(".rg-swatch").nth(1))
    p.wait_for_selector(".rg-topbtn")
    p.wait_for_timeout(300)
    r.check("cafe frosting chosen")
    box = p.locator(".rg-cup svg").bounding_box()
    spots = [(0.5, 0.42), (0.3, 0.5), (0.7, 0.5), (0.5, 0.25), (0.45, 0.6)]
    for i, (fx, fy) in enumerate(spots):
        r.tap(p.locator(".rg-topbtn").nth(i % 4))
        r.tap_at(box["x"] + box["width"] * fx, box["y"] + box["height"] * fy)
        p.wait_for_timeout(60)
    if p.locator(".rg-tops > *").count() < 5:
        r.fails.append("toppings were not added to the cupcake")
    p.wait_for_selector(".rg-serve", state="visible")
    p.wait_for_timeout(300)
    r.check("cafe toppings")
    r.tap(p.locator(".rg-serve"))
    p.wait_for_function("(document.querySelector('.rg-bubble')||{}).textContent === 'Thank you!'")
    r.check("cafe friend says thank you")
    p.wait_for_selector(".rg-done", state="visible")
    p.wait_for_timeout(300)
    r.check("cafe done")
    r.tap(p.locator(".rg-done"))
    r.wait_result()


def play_castle(r, taps=True):
    p = r.page
    w, h = r.size
    r.open("castle")
    p.wait_for_selector(".rg-jump")
    p.wait_for_timeout(400)
    r.check("castle start")
    if taps:
        r.tap(p.locator(".rg-jump"))
        p.wait_for_timeout(500)
        r.tap_at(w * 0.5, h * 0.25)
        p.wait_for_timeout(500)
        r.check("castle riding")
        for _ in range(4):
            r.tap(p.locator(".rg-jump"))
            p.wait_for_timeout(700)
            r.tap_at(w * 0.45, h * 0.3)
            p.wait_for_timeout(500)
    else:
        p.wait_for_timeout(1500)
        r.check("castle riding (no taps)")
    p.wait_for_selector(".rg-done", state="visible", timeout=GAME_TIMEOUT_MS)
    p.wait_for_timeout(500)
    r.check("castle gate")
    if not p.evaluate("!!document.querySelector('.rg-obj[data-rg-late]')"):
        r.fails.append("village gate never appeared")
    r.tap(p.locator(".rg-done"))
    r.wait_result()


def close_midway(r, theme):
    p = r.page
    r.open(theme)
    p.wait_for_timeout(800)
    p.evaluate("RewardGames.close()")
    p.wait_for_function("window.__rewardResult && window.__rewardResult.done === false")
    if p.query_selector(".rg-root"):
        r.fails.append("root still on the page after close()")
    p.wait_for_timeout(1500)  # leftover timers or frames would fail here


def scenario(results, browser, engine, label, size, fn, reduced=False):
    touch = size in TOUCH_SIZES
    r = None
    try:
        r = Run(browser, engine, label, size, touch, reduced)
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
        with sync_playwright() as pw:
            for engine in ("chromium", "webkit"):
                kwargs = {"args": ["--mute-audio"]} if engine == "chromium" else {}
                browser = getattr(pw, engine).launch(**kwargs)
                try:
                    for size in SIZES:
                        scenario(results, browser, engine, "cafe", size, play_cafe)
                        scenario(results, browser, engine, "castle", size, play_castle)
                    for size in ((390, 844), (1180, 820)):
                        scenario(results, browser, engine, "castle no taps", size, lambda r: play_castle(r, taps=False))
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
