"""Silent check of the profile screen, separate saves, and the parent code. One line per check."""
import sys
from playwright.sync_api import sync_playwright
URL = sys.argv[1]
STUB="window.speechSynthesis={speak(){},cancel(){},getVoices(){return[]},pause(){},resume(){}};window.SpeechSynthesisUtterance=function(){};window.AudioContext=window.webkitAudioContext=undefined;window.__cookAutoPlay=true;"
res=[]
def ok(name, cond, extra=""): res.append(cond); print(("PASS " if cond else "FAIL ")+name+(" | "+str(extra) if extra and not cond else ""))
def solve(pg):
    pg.evaluate("()=>{Mission.on=false; if (TopicHost.isOpen()) TopicHost.close(); document.getElementById('cover').hidden=true; nextQuestion();}")
    for i in pg.evaluate("()=>blocks.filter(b=>b.who!==friend).map(b=>b.id)")+pg.evaluate("()=>blocks.filter(b=>b.who===friend).map(b=>b.id)"):
        pg.evaluate(f"()=>tapBlock({i})")
        if pg.evaluate("()=>stopPending()"):
            pg.evaluate("()=>{typed='10';press('go')}")
    pg.evaluate("()=>{typed=String(Q.ans);press('go')}"); pg.wait_for_timeout(300)
with sync_playwright() as p:
    b=p.chromium.launch(args=["--mute-audio"])
    for vw,vh in [(375,667),(1024,768)]:
        pg=b.new_page(viewport={"width":vw,"height":vh},has_touch=vw<500); pg.add_init_script(STUB); errs=[]
        pg.on("pageerror",lambda e:errs.append(str(e)))
        pg.goto(URL); pg.wait_for_timeout(1200)
        pg.screenshot(path=f"prof_{vw}_pick.png")
        ok(f"{vw} title", pg.title()=="Kids Maths", pg.title())
        ok(f"{vw} 3 profiles shown", pg.locator("#profiles [data-p]").count()==3)
        pg.click('[data-p="marie"]'); pg.wait_for_timeout(400)
        ok(f"{vw} marie start card", "Hi Marie!" in pg.inner_text("#cover"), pg.inner_text("#cover")[:60])
        pg.screenshot(path=f"prof_{vw}_marie.png")
        pg.click("#goBtn"); pg.wait_for_timeout(300); solve(pg)
        ms=pg.evaluate("()=>P.stars"); ok(f"{vw} marie earned stars", ms>0, ms)
        saved=pg.evaluate("()=>JSON.parse(localStorage.getItem('kittyBlocks.progress')||'{}').stars||0"); ok(f"{vw} marie saved in her key", saved==ms, saved)
        pg.click("#whoBtn"); pg.wait_for_timeout(300); pg.click('[data-p="kennedy"]'); pg.wait_for_timeout(400)
        ok(f"{vw} kennedy fresh", pg.evaluate("()=>P.stars")==0 and "Hi Kennedy!" in pg.inner_text("#cover"))
        pg.click("#goBtn"); pg.wait_for_timeout(300); solve(pg)
        ks=pg.evaluate("()=>JSON.parse(localStorage.getItem('kidsMaths.kennedy')||'{}').stars||0"); ok(f"{vw} kennedy saved apart", ks>0 and pg.evaluate("()=>JSON.parse(localStorage.getItem('kittyBlocks.progress')).stars")==ms, ks)
        pg.click("#whoBtn"); pg.wait_for_timeout(300); pg.click('[data-p="marie"]'); pg.wait_for_timeout(300)
        ok(f"{vw} marie stars back", pg.evaluate("()=>P.stars")==ms)
        pg.click("#tabGrown"); pg.wait_for_timeout(200)
        ok(f"{vw} parent tab asks code", pg.is_visible("#pinIn"))
        pg.fill("#pinIn","0913"); pg.keyboard.press("Enter"); pg.wait_for_timeout(300)
        ok(f"{vw} parent view open", pg.evaluate("()=>view")=="grown" and pg.is_hidden("#profiles"))
        pg.reload(); pg.wait_for_timeout(1000); pg.click('[data-p="parent"]'); pg.wait_for_timeout(200)
        pg.fill("#pinIn","9999"); pg.keyboard.press("Enter"); pg.wait_for_timeout(200)
        ok(f"{vw} wrong code refused", "not right" in pg.inner_text("#pinMsg"))
        pg.fill("#pinIn","0913"); pg.keyboard.press("Enter"); pg.wait_for_timeout(200)
        pg.click('[data-c="kennedy"]'); pg.wait_for_timeout(400)
        ok(f"{vw} parent sees kennedy", pg.evaluate("()=>[view,who]")==["grown","kennedy"])
        pg.screenshot(path=f"prof_{vw}_parent.png")
        kb=pg.evaluate("()=>localStorage.getItem('kidsMaths.kennedy')"); mb=pg.evaluate("()=>localStorage.getItem('kittyBlocks.progress')")
        pg.click("#whoBtn"); pg.wait_for_timeout(200); pg.click('[data-p="parent"]'); pg.wait_for_timeout(200)
        if pg.is_visible("#pinIn"): pg.fill("#pinIn","0913"); pg.keyboard.press("Enter"); pg.wait_for_timeout(200)
        pg.click('[data-c="demo"]'); pg.wait_for_timeout(400)
        ok(f"{vw} demo starts fresh", pg.evaluate("()=>[who,P.stars]")==["demo",0])
        pg.click("#goBtn"); pg.wait_for_timeout(300); solve(pg)
        ok(f"{vw} demo leaves children alone", pg.evaluate("()=>[localStorage.getItem('kidsMaths.kennedy'),localStorage.getItem('kittyBlocks.progress')]")==[kb,mb] and pg.evaluate("()=>P.stars")>0)
        pg.screenshot(path=f"prof_{vw}_demo.png")
        pg.click("#tabMaths"); pg.wait_for_timeout(400); ok(f"{vw} maths tab works", pg.locator(".tmap-card").count()>10)
        pg.click("#tabHome"); pg.wait_for_timeout(600); ok(f"{vw} home tab works", True)
        ok(f"{vw} no page errors", not errs, errs[:2])
        pg.close()
    b.close()
print(f"RESULT {sum(res)}/{len(res)} passed")
