/* scene_core.js - the "question scene" (22 Oct 2026): the small, calm, animated strip above each maths question.
   Kitty in the cafe (scene_cafe.js) or the knight in the castle acts out the question once, then rests.
   The scene shows the THINGS of the question, never the answer, never a running total and never a count label.
   Big amounts (more than about 20 things) are shown in a true, stylised way: boxes of ten and single ones.

   API (window.QuestScene)
     QuestScene.register(theme, impl)     impl = { show(root, Q, ctx), react(root, kind, ctx), dispose(root), layout?(root, ctx) }
     QuestScene.mount(el)                 the scene row (#scene); done once
     QuestScene.show(Q, theme)            a new question: the scene acts out Q.scene (hidden when the theme has no scene
                                          or the question has no Q.scene, e.g. a parent's own question)
     QuestScene.react(kind)               "right" | "wrong" | "lesson" | "hint" | "end"
     QuestScene.clear()                   stop and hide (the doors, the end screens)
     QuestScene.has(theme)                true when a scene is registered for that theme
     QuestScene.reactions                 the reactions since the question showed (for the tests)
   ctx (given to the impl)
     ctx.art(name)       a picture URL. A plain name ("mimi_point") is in game/scene/art/<theme>/; a path with a "/"
                         ("rewards/art/cafe/heart", "world/art/cafe/treat_cupcake") is under game/. ".png" is added if missing.
     ctx.wait(ms, fn)    a timer that is cleared when the scene changes (show, react, clear); returns its id
     ctx.live()          false once the scene has moved on
     ctx.reduced         the child's device asks for reduced motion: still pictures and short fades only
     ctx.fast            window.__demoFast (the tests): every wait is 0 ms and there is no idle loop
     ctx.theme           "cafe" or "castle"
   The row is hidden when no scene is registered for the theme, and the game works exactly as before.
   The row gives way: its height comes from scene.css, but when a long story would not fit (the question), or the lesson
   board would be under about 120 px (the lesson), it is made lower; under 56 px it steps aside for that question.
   It is fitted again whenever the room below changes (the speech bubble, the keypad, the web fonts), so the hop row never
   slides under the keypad.
   While a scene shows, #app has the class "has-scene" (the small mascot in the top bar steps aside).

   Q.scene - the descriptor every story question carries (built in game/stories.js; tests/game_stories_test.js checks it).
   Common fields: act, noun, noun2 (a second kind of thing, optional), who (optional), holder (optional).
   No descriptor ever carries the answer.
     act         numbers                        meaning
     add         a, b, more (true for "b more than a")   a things, then b more come
     sub         a, b                           a things, b are taken away
     need        a, total                       has a, needs total (how many more?)
     left        a, left                        had a, some went, left stay (how many went?)
     compare     a, b, ask ("diff" | "more" | "fewer")    two groups side by side
     numeral     word (e.g. "seven")            a sign or dial that needs a number (which number is seven?)
     groups      n, per, holder                 n holders with per things in each
     share       mode "each": total, ways, holder      total things to share between ways holders
                 mode "groups": total, per, holder     total things, per in each holder
     place       tens, ones, holder             boxes of ten and single ones (make the number)
     bundle      n, size (10), ask ("tens" | "ones"), holder   n loose things to pack in boxes of size
     money       coins: [[kind, count], ...] with kind "toonie" (2 dollars), "loonie" (1), "dime" (10 cents), "nickel" (5)
     change      price, paid                    a thing costs price dollars; a paid-dollar bill is given (paid: 5, 10, 20, 50 or 100)
     bills       coins: [[picture, count], ...] picture "bill_5" "bill_10" "bill_20" "bill_50" "bill_100" "toonie" "loonie"   (cafe, 23 Oct 2026)
     lineup      n (1 to 4), holder             n empty holders, nothing in them to count; no amount is drawn (numbers too big to draw)   (cafe, 23 Oct 2026)
     time        from, hours, dir ("later" | "earlier"), or from, to, dir "span"   whole hours on the wall clock
     fraction    n, parts (2 | 4), holder       n things; a whole cut in parts (half, quarter)
     count       seq: [x, x+1, x+2]             things counted one by one (what comes next?)   (castle)
     more_less   a, dir (1 | -1)                a things, one more comes or one goes            (castle)
     make10      a, total (10)                  a things, the team needs 10                      (castle)
   Nouns, cafe:   cupcake cup cookie customer saucer coin tray muffin scoop chair tea_bag oven cake_box sign biscuit flower
                  roll candy lemon sticker grape strawberry napkin slice piece chocolate clock cake tea pie sandwich cocoa
   Nouns, castle: villager apple shield arrow goblin plank coin sheep lantern stone brick step key sack star gate door
                  pillow carrot knight flag gem torch horse
   who:           mimi friend customer you buddy horse
   holders, cafe: tray table customer box plate vase pile child jar bag row friend cake jug basket roll pie
   Castle acts used: add sub need left compare numeral count more_less make10. */
(function (root) {
  "use strict";
  const impls = {};
  let el = null, cur = null, reactCtx = null, ro = null;
  const here = (document.currentScript && document.currentScript.src) || location.href;
  const SCENE_BASE = new URL("./", here).href;            // .../game/scene/
  const GAME_BASE = new URL("../", SCENE_BASE).href;     // .../game/
  const reducedQ = window.matchMedia ? matchMedia("(prefers-reduced-motion: reduce)") : null;

  function artUrl(theme, name) {
    const file = /\.\w+$/.test(name) ? name : name + ".png";
    return name.includes("/") ? GAME_BASE + file : SCENE_BASE + "art/" + theme + "/" + file;
  }
  function makeCtx(theme) {
    const timers = new Set();
    let dead = false;
    const ctx = {
      theme, fast: !!window.__demoFast, reduced: !!(reducedQ && reducedQ.matches),
      art: name => artUrl(theme, name),
      wait(ms, fn) {
        if (dead) return 0;
        const id = setTimeout(() => { timers.delete(id); if (!dead) fn(); }, ctx.fast ? 0 : ms);
        timers.add(id); return id;
      },
      live: () => !dead,
      _stop() { dead = true; timers.forEach(clearTimeout); timers.clear(); }
    };
    return ctx;
  }
  function app() { return document.getElementById("app"); }
  /* ---------- the row gives way to the question and to the lesson board ---------- */
  const MIN_ROW = 56, BOARD = 124;   // the lesson board must stay over 110 px
  function deficit(lesson) {
    const a = app(), qb = document.getElementById("qbody"), qt = qb && qb.querySelector(".qtop"), nl = qb && qb.querySelector(".nlbox");
    if (!a || !qb || !qt) return 0;
    if (lesson) {                                       // the board will fill the gap between the question and the number line
      const had = a.classList.contains("lesson");
      if (!had) a.classList.add("lesson");
      const gap = nl ? nl.getBoundingClientRect().top - qt.getBoundingClientRect().bottom - 12 : BOARD;
      if (!had) a.classList.remove("lesson");
      return BOARD - gap;
    }
    const room = qb.querySelector(".room"), bot = qb.querySelector(".qbottom");
    if (!room || !bot) return 0;
    const need = qt.offsetHeight + (parseFloat(getComputedStyle(room).minHeight) || 0) + bot.offsetHeight + 6;
    return need - qb.clientHeight;
  }
  function fitRow(lesson) {
    if (!el || !cur) return;
    el.style.height = ""; el.classList.remove("qs-off");
    if (el.hidden || !el.offsetHeight) return;          // hidden by the theme or by scene.css (short landscape)
    const h0 = el.getBoundingClientRect().height, d = deficit(lesson);
    if (d > 0) {
      if (h0 - d < MIN_ROW) el.classList.add("qs-off");
      else el.style.height = Math.floor(h0 - d) + "px";
    }
    const a = app(); if (a) a.classList.toggle("has-scene", !el.classList.contains("qs-off"));
  }
  const inLesson = () => { const a = app(); return !!(a && a.classList.contains("lesson")); };
  function hide() {
    if (!el) return;
    el.hidden = true; el.innerHTML = ""; el.style.height = ""; el.classList.remove("qs-off"); delete el.dataset.act; delete el.dataset.theme;
    const a = app(); if (a) a.classList.remove("has-scene");
  }
  function stop() {
    if (reactCtx) { reactCtx._stop(); reactCtx = null; }
    if (cur) { cur.ctx._stop(); try { cur.impl.dispose(el); } catch (e) { console.error(e); } cur = null; }
  }
  const QuestScene = {
    register(theme, impl) { impls[theme] = impl; },
    has: theme => !!impls[theme],
    mount(node) {
      el = node; hide();
      if (window.ResizeObserver) {
        ro = new ResizeObserver(() => { if (cur && cur.impl.layout && !el.hidden) { try { cur.impl.layout(el, cur.ctx); } catch (e) { console.error(e); } } });
        ro.observe(el);
      }
      // the lesson ends (or starts again): give the row its height back, as far as the question allows
      const a = app();
      if (a && window.MutationObserver) {
        let was = inLesson();
        // (the start of a lesson is handled by react("lesson"), before the board is placed; a change after that would move
        // the number line under the placed board)
        new MutationObserver(() => { const now = inLesson(); if (now !== was) { was = now; if (!now) fitRow(false); } }).observe(a, { attributes: true, attributeFilter: ["class"] });
      }
      addEventListener("resize", () => setTimeout(() => { if (!inLesson()) fitRow(false); }, 0));
      // the room below can change after the question is drawn: the speech bubble makes the top bar taller, the keypad comes or
      // goes, the web fonts arrive and the story wraps again. Fit the row once more (never during a lesson: the board is placed).
      let raf = 0;
      const refit = () => { if (raf) return; raf = requestAnimationFrame(() => { raf = 0; if (cur && !inLesson()) fitRow(false); }); };
      if (window.ResizeObserver) { const ro2 = new ResizeObserver(refit); ["#work", "#top", "#keys"].forEach(s => { const n = document.querySelector(s); if (n) ro2.observe(n); }); }
      if (document.fonts && document.fonts.addEventListener) document.fonts.addEventListener("loadingdone", refit);
    },
    show(Q, theme) {
      if (!el) return;
      stop();
      const impl = impls[theme];
      if (!impl || !Q || !Q.scene) return hide();
      el.hidden = false; el.innerHTML = ""; el.dataset.theme = theme; el.dataset.act = Q.scene.act;
      const a = app(); if (a) a.classList.add("has-scene");
      cur = { impl, theme, Q, ctx: makeCtx(theme) }; QuestScene.reactions = [];
      try { impl.show(el, Q, cur.ctx); } catch (e) { console.error(e); stop(); hide(); return; }
      Promise.resolve().then(() => fitRow(inLesson()));    // once the question below is drawn
    },
    react(kind) {
      if (!el || !cur || el.hidden) return;
      QuestScene.reactions.push(kind);
      if (reactCtx) reactCtx._stop();
      reactCtx = makeCtx(cur.theme);
      if (kind === "lesson") fitRow(true);                 // before the game places the lesson board
      try { cur.impl.react(el, kind, reactCtx); } catch (e) { console.error(e); }
    },
    clear() { stop(); hide(); },
    reactions: []
  };
  root.QuestScene = QuestScene;
})(window);
