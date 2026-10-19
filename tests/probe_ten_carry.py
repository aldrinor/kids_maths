"""Silent probe: make-10 and column carrying in the Sums tab."""
import sys
from playwright.sync_api import sync_playwright

STUB = ("window.speechSynthesis={speak(){},cancel(){},getVoices(){return[]},pause(){},resume(){}};"
        "window.SpeechSynthesisUtterance=function(){};window.AudioContext=window.webkitAudioContext=undefined;"
        "window.__cookAutoPlay=true;window.__said=[];")
page_path, out_dir = sys.argv[1], sys.argv[2]


def keys(pg, txt):
    for ch in txt:
        pg.click(f'#pad [data-k="{ch}"]')
    pg.click('#pad [data-k="go"]')
    pg.wait_for_timeout(250)


with sync_playwright() as p:
    for vw, vh in [(320, 568), (1024, 768)]:
        b = p.chromium.launch(args=["--mute-audio"])
        pg = b.new_page(viewport={"width": vw, "height": vh}, has_touch=vw < 500)
        pg.add_init_script(STUB)
        errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.goto("file:///" + page_path.replace("\\", "/"))
        pg.wait_for_timeout(1200)
        pg.click('[data-p="marie"]'); pg.wait_for_timeout(300); pg.click("#goBtn"); pg.evaluate("()=>{Mission.on=false; if (TopicHost.isOpen()) TopicHost.close(); if (window.CafeOrders && CafeOrders.isOpen()) CafeOrders.close(); if (window.River && River.isOpen()) River.close(); document.getElementById('cover').hidden=true;}")
        pg.wait_for_timeout(500)
        # ---- make 10 ----
        pg.evaluate("()=>{P.level=3;for(let i=0;i<300&&!(makeTen(Q)&&Q.a>=6&&Q.b>=5);i++){P.round=[];nextQuestion();}}")
        q = pg.evaluate("()=>({a:Q.a,b:Q.b,ans:Q.ans,mt:makeTen(Q)})")
        need = 10 - q["a"]
        [pg.evaluate(f"()=>tapBlock({k})") for k in pg.evaluate("()=>blocks.filter(b=>b.who!==friend).map(b=>b.id)")]
        fids = pg.evaluate("()=>blocks.filter(b=>b.who===friend).map(b=>b.id)")
        for i in fids[:need - 1]:
            pg.evaluate(f"()=>tapBlock({i})")
        pg.wait_for_timeout(400)
        pg.screenshot(path=f"{out_dir}/ten_{vw}_filling.png")
        pg.evaluate(f"()=>tapBlock({fids[need - 1]})")
        pg.wait_for_timeout(400)
        stop = pg.evaluate("()=>stopPending()")
        keys(pg, "10")
        pg.screenshot(path=f"{out_dir}/ten_{vw}_at10.png")
        for i in fids[need:]:
            pg.evaluate(f"()=>tapBlock({i})")
        pg.wait_for_timeout(400)
        pg.screenshot(path=f"{out_dir}/ten_{vw}_hops.png")
        stars0 = pg.evaluate("()=>P.stars")
        keys(pg, str(q["ans"]))
        ok10 = pg.evaluate("()=>phase") == "done" and pg.evaluate("()=>P.stars") > stars0
        print(vw, "make10", q, "stop at 10:", stop, "solved:", ok10)
        pg.wait_for_timeout(1600)
        # ---- carrying in columns ----
        pg.evaluate("()=>{P.level=7;for(let i=0;i<300&&!(colMode(Q));i++){P.round=[];nextQuestion();}}")
        q = pg.evaluate("()=>({a:Q.a,b:Q.b,ans:Q.ans,col:!!col})")
        a1, b1 = q["a"] % 10, q["b"] % 10
        pg.screenshot(path=f"{out_dir}/col_{vw}_start.png")
        keys(pg, "1" if a1 + b1 != 1 else "2")   # one wrong try
        keys(pg, str(a1 + b1))
        step = pg.evaluate("()=>col&&col.step")
        ones = pg.evaluate("()=>blocks.filter(b=>b.size===1).map(b=>b.id)")
        for i in ones[:9]:
            pg.evaluate(f"()=>tapBlock({i})")
        pg.screenshot(path=f"{out_dir}/col_{vw}_bundling.png")
        pg.evaluate(f"()=>tapBlock({ones[9]})")
        pg.wait_for_timeout(400)
        pg.screenshot(path=f"{out_dir}/col_{vw}_carried.png")
        carry = pg.evaluate("()=>col&&col.carry[1]")
        tens = 1 + q["a"] // 10 + q["b"] // 10
        keys(pg, str(tens))
        done = pg.evaluate("()=>phase")
        pg.screenshot(path=f"{out_dir}/col_{vw}_done.png")
        print(vw, "carry", q, "bundle step:", step, "carry:", carry, "phase:", done, "bubble:", pg.inner_text("#bubble")[:90])
        print(vw, "errors:", errs)
        b.close()
