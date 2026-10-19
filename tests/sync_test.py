"""Silent check of the Google backup and daily email text, against a pretend server on this computer. One line per check."""
import json, sys, threading
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse, parse_qs
from playwright.sync_api import sync_playwright
sys.path.insert(0, __file__.rsplit("\\", 1)[0].rsplit("/", 1)[0])
from autoplay import STUB, play
URL = sys.argv[1]; res = []; STORE = {}; KEY = "test-key-0123456789-abcdefghij"
def ok(name, cond, extra=""): res.append(bool(cond)); print(("PASS " if cond else "FAIL ") + name + (" | " + str(extra) if extra != "" and not cond else ""))
class H(BaseHTTPRequestHandler):
    def log_message(self, *a): pass
    def send(self, obj):
        b = json.dumps(obj).encode(); self.send_response(200); self.send_header("Content-Type", "application/json"); self.send_header("Access-Control-Allow-Origin", "*"); self.end_headers(); self.wfile.write(b)
    def do_POST(self):
        body = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
        if body.get("key") != KEY: return self.send({"ok": False, "error": "wrong family key"})
        STORE[body["child"]] = body; self.send({"ok": True})
    def do_GET(self):
        q = {k: v[0] for k, v in parse_qs(urlparse(self.path).query).items()}
        if q.get("key") != KEY: return self.send({"ok": False, "error": "wrong family key"})
        b = STORE.get(q.get("child")); self.send({"ok": True, "state": b and b["state"]})
srv = HTTPServer(("127.0.0.1", 8769), H); threading.Thread(target=srv.serve_forever, daemon=True).start()
with sync_playwright() as p:
    b = p.chromium.launch(args=["--mute-audio"])
    pg = b.new_page(viewport={"width": 820, "height": 1180}); pg.add_init_script(STUB); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(URL); pg.wait_for_timeout(1000)
    pg.evaluate(f"()=>KidsSync._testConnect({{url:'http://127.0.0.1:8769/exec', key:'{KEY}'}})")
    pg.click('[data-p="marie"]'); pg.click("#goBtn"); pg.wait_for_timeout(400)
    play(pg, 6); pg.evaluate("()=>Mission.pause()")
    pg.evaluate("()=>KidsSync.now()"); pg.wait_for_timeout(800)
    got = STORE.get("marie", {})
    ok("progress reached the server", got.get("state", {}).get("stars", 0) > 0, list(got.keys()))
    ok("email text is plain and starts with the child and the day", got.get("summary", "").startswith("Marie played Kids Maths today"), got.get("summary", "")[:80])
    ok("email lists answers, minutes and skills practised", all(w in got.get("summary", "") for w in ["answers,", "minute", "Practised today:"]))
    ok("no family key in the page code", KEY not in pg.content())
    stars = pg.evaluate("()=>P.stars")
    pg.evaluate("()=>localStorage.removeItem('kittyBlocks.progress')"); pg.reload(); pg.wait_for_timeout(1000)
    pg.click('[data-p="marie"]'); pg.wait_for_timeout(1500)
    ok("a wiped iPad gets Marie's progress back", pg.evaluate("()=>P.stars") == stars, (pg.evaluate("()=>P.stars"), stars))
    pg.evaluate("()=>KidsSync._testConnect({url:'http://127.0.0.1:8769/exec', key:'wrong-key-wrong-key-wrong-key'})"); pg.evaluate("()=>KidsSync.now()"); pg.wait_for_timeout(600)
    ok("a wrong key is refused and shown to the parent", "wrong family key" in pg.evaluate("()=>KidsSync.status()"))
    ok("no page errors", not errs, errs[:3])
    b.close()
srv.shutdown()
print(f"RESULT {sum(res)}/{len(res)} passed")
