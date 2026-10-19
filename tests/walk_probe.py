import sys
from playwright.sync_api import sync_playwright
STUB="window.speechSynthesis={speak(){},cancel(){},getVoices(){return[]},pause(){},resume(){}};window.SpeechSynthesisUtterance=function(){};window.AudioContext=window.webkitAudioContext=undefined;window.__cookAutoPlay=true;"
page_path=sys.argv[1]
with sync_playwright() as p:
  for vw,vh in [(320,568),(1024,768)]:
    b=p.chromium.launch(args=["--mute-audio"]); pg=b.new_page(viewport={"width":vw,"height":vh},has_touch=vw<500)
    pg.add_init_script(STUB); errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.goto("file:///"+page_path.replace("\\","/")); pg.wait_for_timeout(1500)
    if pg.locator("#goBtn").count(): pg.click('[data-p="marie"]'); pg.wait_for_timeout(300); pg.click("#goBtn")
    pg.wait_for_timeout(800)
    pg.evaluate("()=>{for(let i=0;i<200&&!(Q.op==='+'&&isSmall(Q)&&Q.b>=6);i++){P.round=[];nextQuestion();}}")
    info=pg.evaluate("()=>({op:Q.op,a:Q.a,small:isSmall(Q),friend})")
    def kx(): 
      t=pg.evaluate("()=>{const g=document.querySelector('#lineKitty g');return g?g.getAttribute('transform'):null}"); return t
    xs=[kx()]
    ids=pg.evaluate("()=>blocks.filter(b=>b.who!==friend&&!b.gone).map(b=>b.id)")
    fids=pg.evaluate("()=>blocks.filter(b=>b.who===friend).map(b=>b.id)")
    for i in ids[:3]+(fids[:9] if info['op']=='+' else []):
      pg.evaluate(f"()=>tapBlock({i})"); pg.wait_for_timeout(450); xs.append(kx())
    pg.screenshot(path=f"../walk6_{vw}.png")
    print(vw,info,xs,"errors:",errs, "bubble:",pg.inner_text("#bubble"))
    b.close()
