from playwright.sync_api import sync_playwright
STUB="window.speechSynthesis={speak(){},cancel(){},getVoices(){return[]},pause(){},resume(){}};window.SpeechSynthesisUtterance=function(){};window.AudioContext=window.webkitAudioContext=undefined;window.__cookAutoPlay=true;"
with sync_playwright() as p:
  b=p.chromium.launch(args=["--mute-audio"])
  pg=b.new_page(viewport={"width":820,"height":1180},has_touch=True)
  pg.add_init_script(STUB); errs=[]
  pg.on("pageerror",lambda e:errs.append(str(e)))
  pg.goto("https://aldrinor.github.io/kitty_maths/"); pg.wait_for_timeout(1500)
  pg.click('[data-p="marie"]'); pg.wait_for_timeout(300); pg.click("#goBtn"); pg.wait_for_timeout(600)
  for n in range(3):
    q=pg.evaluate("()=>({a:Q.a,b:Q.b,op:Q.op,ans:Q.ans,phase,col:!!col,mt:makeTen(Q)})"); print("Q",n,q)
    pg.screenshot(path=f"twoq_{n}_start.png")
    if q["col"]:
      print("column sum"); break
    for i in pg.evaluate("()=>blocks.map(b=>b.id)"):
      pg.evaluate(f"()=>tapBlock({i})"); pg.wait_for_timeout(120)
      if pg.evaluate("()=>stopPending()"):
        for ch in "10": pg.click(f'#pad [data-k="{ch}"]')
        pg.click('#pad [data-k="go"]'); pg.wait_for_timeout(300)
    pg.screenshot(path=f"twoq_{n}_hopped.png")
    print(" pos",pg.evaluate("()=>[line.pos,line.hops.length,phase]"), pg.inner_text("#bubble")[:100])
    for ch in str(q["ans"]): pg.click(f'#pad [data-k="{ch}"]')
    pg.click('#pad [data-k="go"]'); pg.wait_for_timeout(500)
    print(" after",pg.evaluate("()=>phase"), pg.inner_text("#bubble")[:100])
    nxt=pg.query_selector("text=Next")
    pg.wait_for_timeout(2500)
    print(" errs",errs)
  b.close()
