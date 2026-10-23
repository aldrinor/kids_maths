"""Question scene check (game/scene/): the small scene above each question.
For the cafe: every act shows at a phone, an iPad and a laptop size; the drawn things match the question's numbers
(boxes of ten count 10, trays of a hundred count 100); nothing spills out of the scene; no digits are shown except a
price tag; react() works for right, wrong, lesson, hint and end; the real game flow shows the scene and reacts.
For the castle (22 Oct 2026): every act with every noun (and second noun, helper and big amount) the castle stories use
shows at a laptop size, and one question per act at all five sizes; the same checks, plus the knight's pose for each
reaction, reduced motion, and that a reaction never adds a counted thing.
The hop row never slides under the keypad, for Marie and Kennedy, at 1280x720, 1024x768, 820x1180, 390x844 and 360x740:
on the longest stories and after a "try again" speech bubble.
Silent (speech and Web Audio stubbed, Chromium muted). Prints only failures and one RESULT line.
Run: python tests/game_scene_test.py http://localhost:8802/game/index.html [chromium|webkit]"""
import sys
from playwright.sync_api import sync_playwright

URL = sys.argv[1]
ENGINE = sys.argv[2] if len(sys.argv) > 2 else "chromium"
STUB = ("window.__demoFast=true;window.__noVoice=true;window.__noRewards=true;localStorage.clear();window.speechSynthesis={speak(){},cancel(){},getVoices(){return[]}};"
        "window.SpeechSynthesisUtterance=function(){};window.AudioContext=window.webkitAudioContext=undefined;")
SIZES = [("phone", 390, 844), ("ipad", 820, 1180), ("laptop", 1280, 720)]
ALL_SIZES = [("laptop", 1280, 720), ("ipad_side", 1024, 768), ("ipad", 820, 1180), ("phone", 390, 844), ("android", 360, 740)]
CASTLE_SKILLS = ["sums.1", "sums.2", "sums.3", "sums.4", "sums.5", "sums.6", "sums.7", "sums.8", "sums.9", "kinder.2", "kinder.5",
                 "kinder.count20", "kinder.more_less", "kinder.compare", "kinder.make10"]
# one castle question for each act + noun + second noun + helper + small or big amount the stories can make
CASTLE_ALL = r"""(skills) => { const make = KS.__make || KS.make, seen = {}, out = [];
  for (const skill of skills) for (let i = 0; i < 2500; i++) { const Q = make(skill, 'castle', Math.random, ''), S = Q.scene;
    const nums = ['a', 'b', 'left', 'total'].map(k => S[k] || 0).concat(S.seq || []), big = Math.max(...nums) > 20;
    const key = [S.act, S.noun, S.noun2 || '', S.who || '', big].join('|'); if (!seen[key]) { seen[key] = 1; out.push(Q); } }
  return out; }"""
PICK_CASTLE = r"""([skill, act]) => { const make = KS.__make || KS.make; let best = null;
  for (let i = 0; i < 4000; i++) { const Q = make(skill, 'castle', Math.random, ''); if (Q.scene.act === act && (!best || Q.story.length > best.story.length)) best = Q; } return best; }"""
CASTLE_ACTS = [("sums.1", "add"), ("sums.9", "add"), ("sums.2", "sub"), ("sums.8", "sub"), ("sums.1", "need"), ("sums.4", "left"), ("sums.4", "compare"),
               ("kinder.2", "numeral"), ("kinder.count20", "count"), ("kinder.more_less", "more_less"), ("kinder.compare", "compare"), ("kinder.make10", "make10")]
PIN_K = "(Q)=>{ window.__pinQ = Q; if (!KS.__make) KS.__make = KS.make; KS.make = () => window.__pinQ; __game.start('kennedy'); }"
# the hop row must end above the keypad (or above the bottom of the question area when there is no keypad)
HOP = r"""() => { const h = document.querySelector('#qbody .hoprow'), k = document.querySelector('#keys'), w = document.querySelector('#work');
  if (!h || !h.getClientRects().length) return null; const hb = h.getBoundingClientRect().bottom;
  const lim = k && k.getClientRects().length && getComputedStyle(k).display !== 'none' ? k.getBoundingClientRect().top : w.getBoundingClientRect().bottom;
  return Math.round(hb - lim); }"""
# (skill, act, extra JS test on S = Q.scene): every cafe act, small and big amounts
CASES = [("sums.1", "add", "true"), ("sums.9", "add", "true"), ("sums.2", "sub", "true"), ("sums.8", "sub", "true"), ("sums.1", "need", "true"),
         ("sums.4", "left", "true"), ("sums.4", "compare", "true"), ("sums.6", "compare", "true"), ("kinder.2", "numeral", "true"),
         ("cafe_times.1", "groups", "true"), ("cafe_times.1", "groups", "S.n===10&&S.per===10"), ("cafe_share.1", "share", "S.mode==='each'&&S.total===100"),
         ("cafe_share.2", "share", "S.mode==='groups'"), ("cafe_tens.1", "place", "S.tens===9"), ("cafe_tens.1", "bundle", "S.n>90"),
         ("cafe_money.1", "money", "true"), ("cafe_money.2", "change", "true"), ("cafe_time.1", "time", "S.dir==='span'"), ("cafe_time.1", "time", "S.dir!=='span'"),
         ("cafe_frac.1", "fraction", "S.parts===4"), ("cafe_frac.1", "fraction", "S.noun==='slice'")]
PICK = r"""([skill, act, test]) => { const make = KS.__make || KS.make;
  for (let i = 0; i < 30000; i++) { const Q = make(skill, 'cafe', Math.random, ''); const S = Q.scene; if (S.act === act && eval(test)) return Q; } return null; }"""
PIN = "(Q)=>{ window.__pinQ = Q; if (!KS.__make) KS.__make = KS.make; KS.make = () => window.__pinQ; __game.start('marie'); }"
UNPIN = "()=>{ if (KS.__make) { KS.make = KS.__make; delete KS.__make; } }"
CHECK = r"""() => {
  const out = [], s = document.querySelector('#scene'), S = __game.Q.scene;
  if (s && !s.hidden && s.classList.contains('qs-off')) return ['OFF'];      // a long story: the row stepped aside for it
  if (!s || s.hidden || s.getBoundingClientRect().height < 40) return ['scene not showing'];
  if (s.dataset.act !== S.act) out.push('act ' + s.dataset.act + ' want ' + S.act);
  const r = s.getBoundingClientRect(), top = document.querySelector('#top').getBoundingClientRect();
  if (r.top < top.bottom - 1) out.push('scene overlaps the top bar');
  if (r.right > innerWidth + 1 || r.left < -1) out.push('scene off screen');
  const st = s.querySelector('.qs-stage'), sb = st.getBoundingClientRect();
  for (const g of st.children) { const b = g.getBoundingClientRect();
    if (b.left < sb.left - 1 || b.right > sb.right + 1 || b.top < sb.top - 1 || b.bottom > r.bottom + 1) out.push('group ' + (g.dataset.role || g.className) + ' spills out'); }
  // the drawn things match the numbers of the question
  const val = g => g.querySelectorAll('.qs-o').length - g.querySelectorAll('.qs-o.qs-hf').length + 10 * g.querySelectorAll('.qs-t').length + 100 * g.querySelectorAll('.qs-h').length;
  st.querySelectorAll('[data-count]').forEach(g => { const v = g.classList.contains('qs-whole') ? null : val(g); if (v !== null && v !== +g.dataset.count) out.push('group ' + g.dataset.role + ' draws ' + v + ' want ' + g.dataset.count); });
  const role = k => { const g = st.querySelector('[data-role="' + k + '"]'); return g ? val(g) : null; };
  const want = { add: [['a', S.a], ['b', S.b]], sub: [['a', S.a], ['b', S.b]], need: [['a', S.a]], left: [['a', S.a], ['left', S.left]], compare: [['a', S.a], ['b', S.b]],
    share: [['total', S.total]], bundle: [['n', S.n]], count: [['a', S.seq && S.seq[2]]], make10: [['a', S.a]],
    more_less: [['a', S.a], ['one', 1]] }[S.act] || [];
  want.forEach(([k, n]) => { if (role(k) !== n) out.push(k + ' draws ' + role(k) + ' want ' + n); });
  if (S.act === 'groups') { const gs = st.querySelectorAll('[data-role^="g"]'); if (gs.length !== S.n) out.push('holders ' + gs.length + ' want ' + S.n); gs.forEach(g => { if (val(g) !== S.per) out.push('per ' + val(g)); }); }
  if (S.act === 'place') { if (st.querySelectorAll('[data-role^="ten"]').length !== S.tens) out.push('tens'); if ((role('ones') || 0) !== S.ones) out.push('ones'); }
  if (S.act === 'share') { const w = st.querySelectorAll('.qs-empty, [data-role^="w"], [data-role="one"]').length; if (w !== (S.mode === 'each' ? S.ways : 1)) out.push('waiting holders ' + w); }
  if (S.act === 'money') S.coins.forEach(([k, c]) => { if (role(k) !== c) out.push(k + ' ' + role(k) + ' want ' + c); });
  if (S.act === 'fraction') { const w = st.querySelector('.qs-whole'); if (!w || +w.dataset.parts !== S.parts) out.push('whole not cut in ' + S.parts); if (role('n') !== S.n) out.push('n ' + role('n')); }
  if (S.act === 'time' && +st.querySelector('.qs-clock').dataset.hour !== (S.dir === 'span' ? S.to : S.from)) out.push('clock hour');
  // no numbers in the scene, except the price on a price tag
  const txt = [...s.querySelectorAll('*')].filter(e => e.childElementCount === 0 && !e.classList.contains('qs-tag')).map(e => e.textContent).join(' ');
  if (/\d/.test(txt)) out.push('digits shown: ' + txt.trim().slice(0, 40));
  if (S.act === 'change' && s.querySelector('.qs-tag').textContent !== '$' + S.price) out.push('price tag');
  // the scene must not cover a control
  const ctrls = [...document.querySelectorAll('#speak,#dots,#coins,.story,#ansBox,.nlbox,.hoprow button,#pad button,#qbody .opt')];   // the pencils' ends may rest on the counter's edge
  ctrls.forEach(c => { const b = c.getBoundingClientRect(); if (b.width && b.height && b.top < r.bottom - 1 && b.bottom > r.top + 1 && b.left < r.right - 1 && b.right > r.left + 1) out.push('scene overlaps ' + (c.id || c.className)); });
  return out;
}"""
res = []


def ok(name, cond, info=""):
    res.append(bool(cond))
    if not cond:
        print(f"FAIL {name} {info}")


with sync_playwright() as p:
    br = getattr(p, ENGINE).launch(**({"args": ["--mute-audio"]} if ENGINE == "chromium" else {}))
    # ---------- every cafe act at three sizes; reactions ----------
    for tag, vw, vh in SIZES:
        pg = br.new_page(viewport={"width": vw, "height": vh}, has_touch=vw < 900)
        errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
        pg.add_init_script(STUB)
        pg.goto(URL); pg.wait_for_timeout(300)
        pg.click('.over .go[data-theme="cafe"]'); pg.wait_for_timeout(300)
        off = 0
        for skill, act, test in CASES:
            Q = pg.evaluate(PICK, [skill, act, test])
            if not Q:
                ok(f"{tag} {act} {test} question found", False); continue
            pg.evaluate(PIN, Q); pg.wait_for_timeout(120)
            probs = pg.evaluate(CHECK)
            if probs == ["OFF"]:
                off += 1; continue
            ok(f"{tag} {skill} {act} {Q['scene']}", not probs, probs[:4])
        ok(f"{tag} the scene shows for most questions (stepped aside {off} of {len(CASES)})", off <= len(CASES) // 5)
        pg.evaluate(PIN, pg.evaluate(PICK, ["sums.1", "add", "true"])); pg.wait_for_timeout(120)
        # reactions: the right pose for each, and the scene stays
        for kind, pose in [("right", "mimi_cheer"), ("wrong", "mimi_tilt"), ("lesson", "mimi_point"), ("hint", "mimi_point"), ("end", "mimi_wave")]:
            pg.evaluate(f"()=>QuestScene.react('{kind}')"); pg.wait_for_timeout(30)
            src = pg.evaluate("()=>document.querySelector('#scene .qs-mimi').getAttribute('src')")
            ok(f"{tag} react {kind}", pose in src, src)
        ok(f"{tag} hearts rise on right", pg.evaluate("()=>{QuestScene.react('right'); return document.querySelectorAll('#scene .qs-heart').length >= 1}"))
        ok(f"{tag} mascot steps aside while the scene shows", pg.evaluate("()=>document.querySelector('#scene').classList.contains('qs-off') !== (getComputedStyle(document.querySelector('#mascot')).display === 'none')"))
        pg.evaluate("()=>QuestScene.clear()")
        ok(f"{tag} clear hides the row", pg.evaluate("()=>document.querySelector('#scene').hidden && !document.querySelector('#app').classList.contains('has-scene')"))
        pg.evaluate("(Q)=>{const q=Object.assign({}, Q); delete q.scene; QuestScene.show(q,'cafe')}", Q)
        ok(f"{tag} a question without a scene hides the row", pg.evaluate("()=>document.querySelector('#scene').hidden"))
        pg.evaluate(UNPIN)
        ok(f"{tag} no page errors", not errs, errs[:3])
        pg.close()

    # ---------- the castle: every act and noun at a laptop size; one question per act at all five sizes ----------
    KNIGHT = "()=>document.querySelector('#scene .qc-knight').getAttribute('src')"
    for tag, vw, vh in ALL_SIZES:
        pg = br.new_page(viewport={"width": vw, "height": vh}, has_touch=vw < 900)
        errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
        pg.add_init_script(STUB)
        pg.goto(URL); pg.wait_for_timeout(300)
        pg.click('.over .go[data-theme="castle"]'); pg.wait_for_timeout(300)
        ok(f"castle {tag} a castle scene is registered", pg.evaluate("()=>QuestScene.has('castle')"))
        qs = pg.evaluate(CASTLE_ALL, CASTLE_SKILLS) if tag == "laptop" else [pg.evaluate(PICK_CASTLE, list(c)) for c in CASTLE_ACTS]
        if tag == "laptop":
            acts = {q["scene"]["act"] for q in qs}
            nouns = {q["scene"]["noun"] for q in qs} | {q["scene"].get("noun2") for q in qs if q["scene"].get("noun2")}
            ok("castle stories use every castle act", acts >= {"add", "sub", "need", "left", "compare", "numeral", "count", "more_less", "make10"}, sorted(acts))
            ok("castle cases cover all 24 castle nouns", nouns >= set(pg.evaluate("()=>KS.SCENE_NOUNS.castle")), sorted(set(pg.evaluate("()=>KS.SCENE_NOUNS.castle")) - nouns))
        off = 0
        for Q in qs:
            if not Q:
                ok(f"castle {tag} question found", False); continue
            pg.evaluate(PIN_K, Q); pg.wait_for_timeout(120)
            probs = pg.evaluate(CHECK)
            if probs == ["OFF"]:
                off += 1; continue
            ok(f"castle {tag} {Q['skill']} {Q['scene']}", not probs, probs[:4])
            if tag != "laptop" or Q is qs[0]:
                hb = pg.evaluate(HOP)
                ok(f"castle {tag} {Q['scene']['act']} hop row above the keypad", hb is None or hb <= 0, hb)
        ok(f"castle {tag} the scene shows for most questions (stepped aside {off} of {len(qs)})", off <= len(qs) // 5)
        # reactions: the knight's pose; a reaction never adds a counted thing
        pg.evaluate(PIN_K, pg.evaluate(PICK_CASTLE, ["sums.1", "add"])); pg.wait_for_timeout(120)
        n0 = pg.evaluate("()=>document.querySelectorAll('#scene .qs-stage .qs-o').length")
        for kind, pose in [("right", "knight_cheer"), ("wrong", "knight_shrug"), ("lesson", "knight_point"), ("hint", "knight_point"), ("end", "knight_wave")]:
            pg.evaluate(f"()=>QuestScene.react('{kind}')"); pg.wait_for_timeout(30)
            src = pg.evaluate(KNIGHT)
            ok(f"castle {tag} react {kind}", pose in src, src)
            ok(f"castle {tag} react {kind} adds no counted thing", pg.evaluate("()=>document.querySelectorAll('#scene .qs-stage .qs-o').length") == n0)
        ok(f"castle {tag} right: a friend joins and a heart rises (not counted)", pg.evaluate(
            "()=>{QuestScene.react('right'); return !!document.querySelector('#scene .qs-fx .qc-join') && !!document.querySelector('#scene .qs-fx .qs-heart')}"))
        probs = pg.evaluate(CHECK)
        ok(f"castle {tag} still fits after the reactions", not probs or probs == ["OFF"], probs[:4])
        ok(f"castle {tag} mascot steps aside while the scene shows", pg.evaluate("()=>document.querySelector('#scene').classList.contains('qs-off') !== (getComputedStyle(document.querySelector('#mascot')).display === 'none')"))
        pg.evaluate(UNPIN)
        ok(f"castle {tag} no page errors", not errs, errs[:3])
        pg.close()

    # ---------- the hop row never slides under the keypad: longest stories, and after a "try again" bubble ----------
    LONGEST = r"""([skill, theme]) => { const make = KS.__make || KS.make; let best = null;
      for (let i = 0; i < 3000; i++) { const Q = make(skill, theme, Math.random, ''); if (!best || Q.story.length > best.story.length) best = Q; } return best; }"""
    for tag, vw, vh in ALL_SIZES:
        for who, theme in [("marie", "cafe"), ("kennedy", "castle")]:
            pg = br.new_page(viewport={"width": vw, "height": vh}, has_touch=vw < 900)
            pg.add_init_script(STUB)
            pg.goto(URL); pg.wait_for_timeout(300)
            pg.click(f'.over .go[data-v="{who}"]'); pg.wait_for_timeout(300)
            for skill in ["sums.1", "sums.4", "sums.6", "sums.9", "kinder.2"]:
                Q = pg.evaluate(LONGEST, [skill, theme])
                pg.evaluate("([Q, who])=>{ window.__pinQ = Q; if (!KS.__make) KS.__make = KS.make; KS.make = () => window.__pinQ; __game.start(who); }", [Q, who])
                pg.wait_for_timeout(150)
                hb = pg.evaluate(HOP)
                ok(f"hop row {tag} {who} {skill} longest story", hb is None or hb <= 0, hb)
                pg.evaluate("()=>{const Q=__game.Q; if(Q.kind==='choice'){__game.QS.pick=Q.opts.find(o=>o!==Q.ans)}else{__game.QS.typed=String(Q.ans+1)}; document.getElementById('tile').click()}")
                pg.wait_for_timeout(250)
                hb = pg.evaluate(HOP)
                ok(f"hop row {tag} {who} {skill} after try again", hb is None or hb <= 0, [hb, pg.evaluate("()=>!document.querySelector('#msg').hidden")])
            pg.evaluate(UNPIN)
            pg.close()

    # ---------- the real game flow: Marie (cafe) and Kennedy (castle) ----------
    for who, theme in [("marie", "cafe"), ("kennedy", "castle")]:
        pg = br.new_page(viewport={"width": 390, "height": 844}, has_touch=True)
        errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.add_init_script(STUB)
        pg.goto(URL); pg.wait_for_timeout(300)
        pg.click(f'.over .go[data-v="{who}"]'); pg.wait_for_timeout(400)
        has = pg.evaluate(f"()=>QuestScene.has('{theme}')")
        for i in range(3):
            pg.wait_for_function(f"()=>__game.QS && __game.QS.phase==='ask' && __game.P.game.answered==={i} && !__game.QS.teaching", timeout=60000)
            shown = pg.evaluate("()=>!document.querySelector('#scene').hidden && document.querySelector('#scene').dataset.act === __game.Q.scene.act")
            if has:     # the lesson board keeps its room: the row gives way before the board is placed
                pg.evaluate("()=>__game.lesson()"); pg.wait_for_function("()=>!__game.QS.teaching", timeout=60000)
                bd = pg.evaluate("()=>{const b=document.querySelector('#board').getBoundingClientRect(), n=document.querySelector('#qbody .nlbox').getBoundingClientRect(); return [b.height, n.top - b.bottom]}")
                ok(f"{who} q{i + 1} lesson board big enough, above the number line", bd[0] >= 110 and bd[1] >= -1, bd)
            if has:
                ok(f"{who} q{i + 1} scene shows the question's act", shown)
                probs = pg.evaluate(CHECK)
                ok(f"{who} q{i + 1} scene checks", not probs or probs == ["OFF"], probs[:4])
            else:
                ok(f"{who} q{i + 1} no {theme} scene: row hidden, mascot shows", pg.evaluate("()=>document.querySelector('#scene').hidden && getComputedStyle(document.querySelector('#mascot')).display !== 'none'"))
            pg.evaluate("()=>{const Q=__game.Q; if(Q.kind==='choice'){__game.QS.pick=Q.ans}else{__game.QS.typed=String(Q.ans)}; document.getElementById('tile').click()}")
            pg.wait_for_function(f"()=>__game.P.game.answered==={i + 1}", timeout=8000)
            if has:
                ok(f"{who} q{i + 1} right: the scene reacted 'right'", "right" in pg.evaluate("()=>QuestScene.reactions"), pg.evaluate("()=>QuestScene.reactions"))
            pg.wait_for_function("()=>__game.QS.phase==='right' && !__game.QS.teaching", timeout=60000)
            pg.click("#tile")
        pg.click("#tools .bin.home"); pg.wait_for_timeout(300)
        if who == "kennedy":                          # Kennedy: one tap only asks; the tick goes home
            pg.click('.kidconfirm .go[data-v="yes"]'); pg.wait_for_timeout(300)
        ok(f"{who} doors clear the scene", pg.evaluate("()=>document.querySelector('#scene').hidden"))
        ok(f"{who} no page errors", not errs, errs[:3])
        pg.close()

    # ---------- reduced motion: still pictures, short fades ----------
    ctx = br.new_context(viewport={"width": 390, "height": 844}, reduced_motion="reduce")
    pg = ctx.new_page(); pg.add_init_script(STUB.replace("window.__demoFast=true;", ""))
    pg.goto(URL); pg.wait_for_timeout(300); pg.click('.over .go[data-theme="cafe"]'); pg.wait_for_timeout(2500)
    ok("reduced motion: scene marked reduced", pg.evaluate("()=>document.querySelector('#scene').classList.contains('qs-reduced')"))
    ok("reduced motion: Mimi does not breathe", pg.evaluate("()=>getComputedStyle(document.querySelector('#scene .qs-mimi')).animationName === 'none'"))
    ok("reduced motion: every thing shows after the short opening", pg.evaluate("()=>document.querySelectorAll('#scene .qs-stage .qs-wait').length === 0 || !!document.querySelector('#scene .qs-stack')"))
    ctx.close()
    ctx = br.new_context(viewport={"width": 390, "height": 844}, reduced_motion="reduce")
    pg = ctx.new_page(); pg.add_init_script(STUB.replace("window.__demoFast=true;", ""))
    pg.goto(URL); pg.wait_for_timeout(300); pg.click('.over .go[data-theme="castle"]'); pg.wait_for_timeout(2500)
    ok("reduced motion: castle scene marked reduced", pg.evaluate("()=>document.querySelector('#scene').classList.contains('qs-reduced')"))
    ok("reduced motion: the knight does not breathe", pg.evaluate("()=>getComputedStyle(document.querySelector('#scene .qc-knight')).animationName === 'none'"))
    ok("reduced motion: every castle thing shows after the short opening", pg.evaluate("()=>document.querySelectorAll('#scene .qs-stage .qs-wait').length === 0 || !!document.querySelector('#scene .qs-stack')"))
    ctx.close()
    br.close()
print(f"RESULT {sum(res)}/{len(res)} passed")
