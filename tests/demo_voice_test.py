"""Check the demo plays the recorded AI voice (not the robot voice) in Chrome and Safari engines, and that
every sentence in phrases.js has a recording. Run: python tests/demo_voice_test.py http://localhost:8790/demo/index.html"""
import json, subprocess, os
import sys
from playwright.sync_api import sync_playwright
URL = sys.argv[1]
res = []
here = os.path.dirname(os.path.abspath(__file__))
miss = subprocess.run(["node", "-e", "const KM=require('./demo/phrases.js');const m=require('./demo/voice/manifest.json');console.log(KM.allPhrases().filter(t=>m[KM.fnv(t)]!==t).length)"], cwd=os.path.dirname(here), capture_output=True, text=True).stdout.strip()
res.append(miss == "0"); print(("PASS " if miss == "0" else "FAIL ") + f"every sentence has a recording (missing {miss})")
with sync_playwright() as p:
    for eng in ["chromium", "webkit"]:
        b = getattr(p, eng).launch(**({"args": ["--mute-audio"]} if eng == "chromium" else {}))
        pg = b.new_page()
        pg.add_init_script("window.speechSynthesis={speak(){window.__robot=(window.__robot||0)+1},cancel(){},getVoices(){return[]}};window.SpeechSynthesisUtterance=function(){};"
                           "window.__played=[];const _p=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){window.__played.push(this.src);return _p.call(this)};")
        if eng == "webkit":
            pg.add_init_script("HTMLMediaElement.prototype.play=function(){window.__played.push(this.src);return Promise.resolve()};")
        pg.goto(URL); pg.wait_for_timeout(1000); pg.click(".over .go"); pg.wait_for_timeout(2500)
        r = pg.evaluate("()=>({robot:window.__robot||0, played:window.__played.length, web:!!(window.AudioContext||window.webkitAudioContext)})")
        if r["web"]:
            r["clip"] = pg.evaluate("async()=>{const b=await clip(__demo.Q.say);return b&&b.duration}")
        ok = r["robot"] == 0 and (r.get("clip", 0) or 0) > 0.3 if r["web"] else r["robot"] == 0 and r["played"] >= 1
        print(("PASS " if ok else "FAIL ") + f"{eng} plays the recorded voice", r)
        res.append(ok)
        b.close()
print(f"RESULT {sum(res)}/{len(res)} passed")
