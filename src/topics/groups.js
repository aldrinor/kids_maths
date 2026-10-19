/* groups.js - strand "Operations" for Marie's maths game.
   Five topics: equal_groups, arrays, share_equally, balance, fact_family.
   BC Grade 3 teaches what multiplication and division mean (groups of, arrays, repeated addition,
   sharing, grouping) and says "Memorization of facts is not intended". Number ranges here are our
   design choice (see CURRICULUM_MAP.md). Grades 1-2 equality work (balance, fact families) is included.
   Teaching rules (the father, 15 Oct 2026): a tap MARKS a thing (a heart, a tick, a glow). A tap never shows
   or speaks a running number or a running total, so Marie must count and add up herself. Before she types
   her answer, the answer is nowhere: not in the picture, not in a badge, not in speech, not in an aria-label.
   Only the numbers in the question appear. Big sets stand in groups of 5 or 10 so she can count them.
   The lesson (after 3 mistakes) guides each step with words and waits for each of her taps; it never
   counts for her. Hints say how, never the answer. */
(function () {
  "use strict";
  const TOPICS = (window.MathTopics = window.MathTopics || []);
  const INK = "#3b2a33";
  const MINUS = "−", TIMES = "×", DIV = "÷", NEQ = "≠";
  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  /* Things to share and count. All pictures come from art/*.png through api.ART. */
  const ITEMS = {
    cupcake: ["cupcake", "cupcakes"], cookie: ["cookie", "cookies"], strawberry: ["strawberry", "strawberries"],
    donut: ["donut", "donuts"], candy: ["candy", "candies"], lollipop: ["lollipop", "lollipops"],
    croissant: ["croissant", "croissants"], tulip: ["tulip", "tulips"], sunflower: ["sunflower", "sunflowers"],
    cherries: ["cherry", "cherries"], star: ["star", "stars"]
  };
  const PLATE_ITEMS = ["cupcake", "cookie", "donut", "strawberry", "croissant", "candy"];
  const ROW_ITEMS = ["strawberry", "tulip", "sunflower", "cupcake"];
  const SHARE_ITEMS = ["cookie", "cupcake", "candy", "lollipop", "strawberry", "donut"];
  const FRIENDS = ["kitty", "melody", "kuromi", "purin", "cinna"];
  const NAMES = { kitty: "Kitty", melody: "Melody", kuromi: "Kuromi", purin: "Purin", cinna: "Cinna" };
  const one = k => ITEMS[k][0], many = k => ITEMS[k][1];
  /* The marks a tap leaves: a heart on a plate or bag, a tick on a row. Never a number. */
  const HEART = `<svg class="gp-mk" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5C6 16 3 13 3 9.2 3 6.6 5 4.7 7.4 4.7c1.9 0 3.3 1 4.6 2.7 1.3-1.7 2.7-2.7 4.6-2.7 2.4 0 4.4 1.9 4.4 4.5 0 3.8-3 6.8-9 11.3z" fill="#ff6f9f" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/></svg>`;
  const TICK = `<svg class="gp-mk" viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 12.5l5 5 10-11" fill="none" stroke="${INK}" stroke-width="3.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

  /* ---------- shared look ---------- */
  const CSS = `
.gp-stage{position:relative;width:100%;height:100%;box-sizing:border-box;padding:8px;display:flex;flex-direction:column;gap:8px;overflow:hidden;
  touch-action:none;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;font-family:"Baloo 2","Comic Sans MS",sans-serif;color:${INK};-webkit-tap-highlight-color:transparent}
.gp-stage *{box-sizing:border-box}
.gp-stage img{pointer-events:none;-webkit-user-drag:none;display:block}
.gp-stage button{font-family:inherit;color:${INK};touch-action:none;cursor:pointer;-webkit-user-select:none;user-select:none}
.gp-chunky{border:3px solid ${INK};border-radius:18px;box-shadow:0 4px 0 ${INK};background:#fff8ef;font:800 20px/1 "Baloo 2",sans-serif;transition:transform .08s,box-shadow .08s}
.gp-chunky:active:not(:disabled){transform:translateY(3px);box-shadow:0 1px 0 ${INK}}
.gp-chunky:disabled{opacity:.4;cursor:default}
.gp-badge{position:absolute;min-width:34px;height:34px;padding:0 6px;border-radius:17px;background:#ffc94a;border:3px solid ${INK};box-shadow:0 3px 0 ${INK};
  font:800 19px/28px "Baloo 2",sans-serif;text-align:center;z-index:2;font-variant-numeric:tabular-nums}
.gp-badge.gp-mark{display:grid;place-items:center;padding:0;width:34px;min-width:0}
.gp-mark .gp-mk{width:22px;height:22px;display:block}
.gp-pop{animation:gpPop .32s ease-out}
@keyframes gpPop{0%{transform:scale(.4)}70%{transform:scale(1.18)}100%{transform:scale(1)}}
.gp-nope{animation:gpNope .35s}
@keyframes gpNope{20%{transform:translateX(-6px)}40%{transform:translateX(6px)}60%{transform:translateX(-4px)}80%{transform:translateX(3px)}}
.gp-hop{animation:gpHop .5s ease-out 2}
@keyframes gpHop{40%{transform:translateY(-10px)}}
.gp-ghost{position:fixed;left:0;top:0;z-index:9999;pointer-events:none;transform:translate(-50%,-60%) scale(1.15);filter:drop-shadow(0 5px 0 rgba(59,42,51,.35))}
.gp-ghost img{width:100%;height:100%;display:block}
.gp-over{outline:4px dashed #2a8fd6;outline-offset:3px}
@media (prefers-reduced-motion: reduce){.gp-pop,.gp-nope,.gp-hop{animation:none}}

/* equal groups */
.gp-eg-top{flex:none;display:flex;align-items:flex-start;gap:10px;height:64px}
.gp-tray{position:relative;flex:none;width:84px;height:64px;padding:0;border-radius:22px;background:#ffe4ee}
.gp-tray img{position:absolute;width:38px;height:38px;top:11px}
.gp-eg-top.short .gp-tray{height:48px;width:76px}
.gp-eg-top.short .gp-tray img{width:32px;height:32px;top:5px}
.gp-tray img:nth-child(1){left:6px;transform:rotate(-12deg)} .gp-tray img:nth-child(2){left:22px;top:6px;z-index:1} .gp-tray img:nth-child(3){left:38px;transform:rotate(12deg)}
.gp-plates{flex:1;min-height:0;display:grid;justify-content:center;align-content:center;gap:14px 12px;padding:6px 6px 0 0}
.gp-plate{position:relative;width:var(--pw);height:var(--ph);border:3px solid ${INK};border-radius:50%;cursor:pointer;
  background:radial-gradient(ellipse at 50% 50%,#ffffff 0 55%,#ffd6e5 56% 100%);box-shadow:0 4px 0 ${INK};display:grid;place-items:center;touch-action:none}
.gp-plate.full{background:radial-gradient(ellipse at 50% 50%,#ffffff 0 55%,#bdeedd 56% 100%)}
.gp-plate.rect{border-radius:24px;background:#fff;box-shadow:inset 0 0 0 6px #ffd6e5,0 4px 0 ${INK}}
.gp-plate.rect.full{background:#fff;box-shadow:inset 0 0 0 6px #bdeedd,0 4px 0 ${INK}}
.gp-plate.rect{padding-top:8px} /* plus 6px clear on every side inside the coloured rim */
.gp-plate.rect .gp-badge{top:-16px;right:-15px}
.gp-plates.narrow .gp-plate.rect{padding-top:6px}
.gp-plates.narrow .gp-plate.rect .gp-badge{min-width:0;width:26px;height:26px;padding:0;top:-12px;right:-9px}
.gp-plates.narrow .gp-plate.rect .gp-mark .gp-mk{width:17px;height:17px} /* the tray has a deeper top rim, so the count badge never covers a treat */
.gp-plate .gp-badge{top:calc(14.6% - 22px);right:calc(14.6% - 22px)} /* sits on the rim, at the top-right of the oval */
.gp-slots{display:grid;grid-template-columns:repeat(var(--sc),var(--is));gap:2px;justify-content:center;pointer-events:none}
.gp-slot{width:var(--is);height:var(--is);border-radius:50%;border:2px dashed rgba(59,42,51,.32)}
.gp-slot.on{border:0}
.gp-slot img{width:100%;height:100%}

/* rows (arrays) */
.gp-bed{flex:1;min-height:0;display:flex;flex-direction:column;justify-content:center;gap:var(--rg);padding:10px;border:3px solid ${INK};border-radius:22px;
  box-shadow:0 5px 0 ${INK};background:#c9f2df radial-gradient(circle at 20% 30%,rgba(255,255,255,.5) 0 3px,transparent 4px) 0 0/34px 34px}
.gp-row{box-sizing:border-box;flex:none;position:relative;display:flex;align-items:center;gap:var(--ig);height:var(--rh);padding:0 calc(var(--bw) + 8px) 0 8px;border:3px solid ${INK};border-radius:16px;
  background:linear-gradient(#b98457,#a8744a);box-shadow:inset 0 -5px 0 rgba(0,0,0,.12),0 3px 0 ${INK};cursor:pointer;touch-action:none;width:max-content;max-width:100%;align-self:center}
.gp-row img{filter:drop-shadow(0 2px 0 rgba(59,42,51,.35))}
.gp-row img{width:var(--is);height:var(--is);flex:none}
.gp-row img:nth-of-type(6){margin-left:var(--five,0px)}
.gp-row .gp-rb .gp-mk{width:70%;height:70%}
.gp-row.on{background:#fff6d6}
.gp-row .gp-rb{position:absolute;right:4px;top:50%;margin-top:calc(var(--bw) / -2);width:var(--bw);height:var(--bw);border-radius:50%;border:3px dashed rgba(255,255,255,.7);
  display:grid;place-items:center;font:800 calc(var(--bw) * .5)/1 "Baloo 2",sans-serif}
.gp-row:not(.on) .gp-rb{border-color:transparent} /* the count circle appears only when she counts that row: no empty circle with no purpose */
.gp-row.on .gp-rb{background:#ffc94a;border:3px solid ${INK};box-shadow:0 3px 0 ${INK}}

/* sharing */
.gp-pile{flex:none;position:relative;display:flex;flex-wrap:wrap;align-content:center;justify-content:center;gap:2px;padding:6px 10px;border:3px solid ${INK};border-radius:24px;
  box-shadow:0 5px 0 ${INK};background:#fff8ef;cursor:grab;touch-action:none}
.gp-pile::before{content:"";position:absolute;inset:5px;border-radius:18px;border:2px dashed #e7b98a;pointer-events:none}
.gp-pile img{width:var(--is);height:var(--is);position:relative}
.gp-pile.empty{background:#f6efe6}
.gp-friends{flex:1;min-height:0;display:grid;grid-template-columns:repeat(var(--k),minmax(0,1fr));gap:8px;align-items:end}
.gp-friend{position:relative;display:flex;flex-direction:column;align-items:center;gap:4px;height:100%;justify-content:center;cursor:pointer;touch-action:none;border-radius:20px;padding:2px}
.gp-friend svg.gp-face{width:var(--fs);height:var(--fs);flex:none;overflow:visible}
.gp-fplate{flex:none;width:100%;display:flex;flex-wrap:wrap;align-content:center;justify-content:center;gap:1px;padding:6px 4px;border:3px solid ${INK};border-radius:50% / 40%;
  box-shadow:0 4px 0 ${INK};background:radial-gradient(ellipse at 50% 50%,#fff 0 55%,var(--tint) 56%)}
.gp-fplate img{width:var(--fis);height:var(--fis)}
.gp-fpi{display:grid;grid-template-columns:repeat(var(--fc,5),var(--fis));gap:2px;justify-content:center}
.gp-friend .gp-name{font:800 15px/1 "Baloo 2",sans-serif;color:var(--col)}
.gp-friends.nonames .gp-name{display:none}
.gp-bags{flex:1;min-height:0;display:flex;flex-wrap:wrap;justify-content:center;align-content:center;gap:10px;max-width:calc(var(--bc) * var(--bs) + (var(--bc) - 1) * 10px);margin:0 auto;width:100%}
.gp-bag{position:relative;width:var(--bs);height:calc(var(--bs) * 1.05);cursor:pointer;touch-action:none}
.gp-bag svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
.gp-bag .gp-bi{position:absolute;left:7%;right:7%;top:42%;bottom:5%;display:flex;flex-wrap:wrap;align-content:center;justify-content:center;gap:1px}
.gp-bag .gp-bi img{width:var(--bis);height:var(--bis)}
.gp-bag .gp-badge{top:-6px;right:-8px}
.gp-bag.open svg{filter:drop-shadow(0 0 0 transparent)}
.gp-bag.open::after{content:"";position:absolute;inset:-6px;border:3px dashed #2a8fd6;border-radius:18px;pointer-events:none;opacity:.55}

/* balance */
.gp-bal-svg{flex:1;min-height:0;width:100%;display:block;overflow:visible}
.gp-bal-ctl{flex:none;display:flex;gap:8px;justify-content:center;align-items:stretch;flex-wrap:nowrap}
.gp-bal-ctl[hidden]{display:none}
.gp-bal-ctl.bags{justify-content:space-between;gap:0}
.gp-bal-side{flex:1 1 0;min-width:0;display:flex;gap:8px;justify-content:center;align-items:center}
.gp-bal-ctl .gp-chunky{flex:none;min-height:56px;min-width:60px;padding:0 10px;display:inline-flex;align-items:center;justify-content:center;gap:6px;font-size:28px}
.gp-bal-ctl .gp-bbag{padding:2px 6px;min-width:64px;background:#fff8ef}
.gp-bal-ctl .gp-bbag svg{pointer-events:none;display:block}
/* After Kitty asks her to type, the scale is done: the tool buttons go pale (still tappable, so a tap can say why) */
.gp-bal-ctl.locked .gp-chunky{opacity:.42;filter:grayscale(.7)}
.gp-ghost .gp-bagicon{width:100%;height:100%}
.gp-cube{display:inline-block;width:22px;height:22px;border:3px solid ${INK};border-radius:6px;background:var(--c,#a98bff);box-shadow:inset 0 5px 0 rgba(255,255,255,.4)}
.gp-rod{display:inline-flex;flex-direction:column;border:3px solid ${INK};border-radius:6px;overflow:hidden;background:#a98bff}
.gp-rod i{display:block;width:16px;height:4px;border-bottom:1px solid ${INK}}
.gp-dish{position:relative;flex:1 1 auto;min-width:104px;max-width:62%;min-height:56px;display:flex;align-items:center;gap:6px;padding:3px 8px 3px 4px;border:3px solid ${INK};border-radius:26px;box-shadow:0 4px 0 ${INK};background:#ece6ff;touch-action:none;cursor:pointer}
.gp-dish svg.gp-face{width:42px;height:42px;flex:none}
.gp-dish .gp-dl{font:800 14px/1.05 "Baloo 2",sans-serif;color:#5a3cc4;white-space:nowrap}
.gp-dish.has:not(.keep) .gp-dl,.gp-dish.tight .gp-dl{display:none}
.gp-dish .gp-dc{display:flex;flex-direction:column;gap:max(5px,calc(var(--db,13px) * .45));justify-content:center;flex:none}
.gp-dish .gp-tf{display:grid;grid-template-columns:repeat(5,var(--db,13px));grid-auto-rows:var(--db,13px);gap:2px}
.gp-dish .gp-dc b{width:var(--db,13px);height:var(--db,13px);border:2px solid ${INK};border-radius:4px;background:#ff6f9f}
.gp-bal.narrow .gp-dish svg.gp-face{width:26px;height:26px} /* still Kuromi, so "Kuromi's basket" makes sense */
.gp-bal.narrow .gp-bal-ctl .gp-chunky{min-width:54px;padding:0 7px;gap:4px}
.gp-dish .gp-dc b.lit{background:#ffc94a}
.gp-dish .gp-badge{top:-14px;right:-10px}
.gp-cnt text{font:800 22px "Baloo 2",sans-serif}
.gp-spark{animation:gpSpark .9s ease-out forwards}
@keyframes gpSpark{0%{opacity:0;transform:scale(.5)}30%{opacity:1}100%{opacity:0;transform:scale(1.3)}}
@media (prefers-reduced-motion: reduce){.gp-spark{animation:none}}

/* fact family */
.gp-ff{flex-direction:column}
.gp-ff.wide{flex-direction:row}
.gp-tri{flex:none;display:block;overflow:visible}
.gp-ffbar{flex:1;min-height:0;min-width:0;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:8px;padding:8px;border:3px solid ${INK};border-radius:22px;box-shadow:0 5px 0 ${INK};background:#fff8ef;cursor:pointer;touch-action:none}
.gp-dots{display:grid;grid-template-columns:repeat(var(--dc),var(--ds));gap:var(--dg);justify-content:center}
.gp-dot{position:relative;width:var(--ds);height:var(--ds);border:3px solid ${INK};border-radius:28%;background:var(--c);box-shadow:inset 0 calc(var(--ds) * .18) 0 rgba(255,255,255,.4);
  display:grid;place-items:center;font:800 calc(var(--ds) * .5)/1 "Baloo 2",sans-serif;color:#fff;-webkit-text-stroke:1.5px ${INK};paint-order:stroke fill}
.gp-dot.off{opacity:.3;background:#d9cfd4}
.gp-dot.off::after{content:"";position:absolute;inset:-2px;background:linear-gradient(45deg,transparent 44%,${INK} 44% 56%,transparent 56%),linear-gradient(-45deg,transparent 44%,${INK} 44% 56%,transparent 56%)}
.gp-dot.lit{background:#ffc94a;box-shadow:0 0 0 3px #fff6d6,0 0 10px 3px #ffc94a}
.gp-ffrow .gp-d6{margin-left:calc(var(--ds) * .35)}

.gp-ffrows{display:grid;grid-template-columns:repeat(var(--nc,1),auto);gap:var(--dg) 10px;justify-content:center;align-items:center}
.gp-ffrow{position:relative;display:flex;align-items:center;gap:var(--dg);padding:4px 8px;border:3px solid transparent;border-radius:14px;min-height:calc(var(--ds) + 14px);cursor:pointer}
.gp-ffrow.on{background:#fff6d6;border-color:${INK}}
.gp-rslot{position:relative;width:40px;height:34px;flex:none;margin-left:4px}
.gp-rslot .gp-badge{left:0;top:0}
.gp-ffbar.compact .gp-ffrow{box-sizing:border-box;padding:0 4px;min-height:calc(var(--ds) + 6px);border-radius:10px}
.gp-ffbar.compact .gp-rslot{width:26px;height:24px;margin-left:2px}
.gp-ffbar.compact .gp-rslot .gp-badge{min-width:0;width:24px;height:24px;padding:0;border-width:2px;box-shadow:0 2px 0 #3b2a33}
.gp-ffbar.compact .gp-rslot .gp-mark .gp-mk{width:16px;height:16px}
.gp-pool{display:flex;flex-wrap:wrap;gap:var(--dg);justify-content:center;max-width:100%}
`;
  function injectCSS() {
    if (document.getElementById("gp-css")) return;
    const s = document.createElement("style"); s.id = "gp-css"; s.textContent = CSS; document.head.appendChild(s);
  }
  /* The character drawings use these gradients. The host page has them; add them only if missing. */
  function ensureDefs() {
    if (document.getElementById("fur")) return;
    const d = document.createElement("div");
    d.innerHTML = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
<radialGradient id="fur" cx="38%" cy="30%" r="80%"><stop offset="0" stop-color="#ffffff"/><stop offset=".75" stop-color="#fbf5f8"/><stop offset="1" stop-color="#e9d8e0"/></radialGradient>
<radialGradient id="furGold" cx="38%" cy="30%" r="80%"><stop offset="0" stop-color="#fff2b8"/><stop offset=".7" stop-color="#ffd76a"/><stop offset="1" stop-color="#e9b440"/></radialGradient>
<radialGradient id="hoodPink" cx="38%" cy="30%" r="80%"><stop offset="0" stop-color="#ffc3da"/><stop offset="1" stop-color="#ff7fb0"/></radialGradient>
<radialGradient id="hoodBlack" cx="38%" cy="30%" r="80%"><stop offset="0" stop-color="#5a4a63"/><stop offset="1" stop-color="#231a28"/></radialGradient>
<radialGradient id="nose" cx="35%" cy="30%" r="70%"><stop offset="0" stop-color="#ffe680"/><stop offset="1" stop-color="#f2a900"/></radialGradient>
</defs></svg>`;
    document.body.appendChild(d.firstChild);
  }
  const faceSvg = (api, id, cls = "gp-face") => {
    const f = String(api.face(id) || "");
    return f.trim().startsWith("<svg") ? f.replace("<svg", `<svg class="${cls}"`) : `<svg class="${cls}" viewBox="0 0 100 100" aria-hidden="true">${f}</svg>`;
  };
  const sfx = (api, f = 660) => { try { api.tone([f], 0.09, "sine", 0.05); } catch (e) {} };
  const light = (api, el) => { try { api.highlight(el || null); } catch (e) {} };
  const pop = el => { if (!el) return; el.classList.remove("gp-pop"); void el.offsetWidth; el.classList.add("gp-pop"); };
  const nope = el => { if (!el) return; el.classList.remove("gp-nope"); void el.offsetWidth; el.classList.add("gp-nope"); };

  /* Fresh question that is not the same as the one before. */
  function fresh(gen, prev) {
    for (let i = 0; i < 40; i++) { const q = gen(); if (!prev || q.key !== prev.key) return q; }
    return gen();
  }
  /* Per-level question counter, used where a level starts small and then grows ("up to 10, then 20"). */
  const counters = {};
  const bump = k => (counters[k] = (counters[k] || 0) + 1);

  /* ---------- instance: state, waiting for Marie, fitting, pointer input ---------- */
  function base(el, cls, Q, api) {
    injectCSS(); ensureDefs();
    if (el.__gp) el.__gp.destroy();
    el.innerHTML = "";
    const stage = document.createElement("div");
    stage.className = "gp-stage " + cls;
    el.appendChild(stage);
    const inst = { el, stage, Q, api, waiters: [], dead: false, cleanups: [], layout: null };
    inst.changed = () => {
      inst.waiters = inst.waiters.filter(w => { if (w.fn()) { w.res(true); return false; } return true; });
    };
    inst.waitFor = fn => new Promise(res => {
      if (inst.dead) return res(false);
      if (fn()) return res(true);
      inst.waiters.push({ fn, res });
    });
    inst.destroy = () => {
      if (inst.dead) return;
      inst.dead = true;
      inst.waiters.forEach(w => w.res(false)); inst.waiters = [];
      inst.cleanups.forEach(f => { try { f(); } catch (e) {} });
      if (el.__gp === inst) el.__gp = null;
      el.innerHTML = "";
    };
    el.__gp = inst;
    let raf = 0;
    const relayout = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { if (!inst.dead && inst.layout) inst.layout(); }); };
    if (window.ResizeObserver) { const ro = new ResizeObserver(relayout); ro.observe(el); inst.cleanups.push(() => ro.disconnect()); }
    window.addEventListener("resize", relayout); inst.cleanups.push(() => window.removeEventListener("resize", relayout));
    return inst;
  }
  /* The lesson works on the picture the host already mounted; if there is none, it mounts one. */
  /* Kitty's lesson talks through this: it remembers her current step, so a warning can repeat the step after it. */
  function lessonSay(inst, api) {
    inst.lessonLine = "";
    return Object.assign({}, api, { say: t => { inst.lessonLine = String(t); api.say(t); } });
  }
  function ensure(el, Q, api, mountFn) {
    const cur = el.__gp;
    if (cur && !cur.dead && cur.Q && cur.Q.key === Q.key) return cur;
    mountFn(el, Q, api);
    return el.__gp;
  }
  /* Drag from [data-src] to [data-drop]; a tap (no movement) goes to the nearest [data-tap].
     touch-action:none on the stage stops iOS from scrolling while she drags. */
  function pointerKit(inst, h) {
    const st = inst.stage; let d = null, over = null;
    const setOver = t => { if (over === t) return; if (over) over.classList.remove("gp-over"); over = t; if (over) over.classList.add("gp-over"); };
    const dropAt = (x, y) => {
      const e = document.elementFromPoint(x, y);
      const t = e && e.closest("[data-drop]");
      return t && st.contains(t) ? t : null;
    };
    const down = e => {
      if (e.button > 0 || inst.dead) return;
      const srcEl = e.target.closest("[data-src]"), tapEl = e.target.closest("[data-tap]");
      if ((!srcEl || !st.contains(srcEl)) && (!tapEl || !st.contains(tapEl))) return;
      e.preventDefault();
      d = { id: e.pointerId, x0: e.clientX, y0: e.clientY, srcEl, tapEl, moved: false, ghost: null, src: null };
    };
    const move = e => {
      if (!d || e.pointerId !== d.id) return;
      if (!d.moved) {
        if (Math.hypot(e.clientX - d.x0, e.clientY - d.y0) < 9) return;
        d.moved = true;
        d.src = d.srcEl ? h.src(d.srcEl) : null;
        if (d.src) {
          const g = document.createElement("div");
          g.className = "gp-ghost"; g.innerHTML = d.src.html;
          g.style.width = g.style.height = (d.src.size || 52) + "px";
          document.body.appendChild(g); d.ghost = g;
        }
      }
      if (d.ghost) {
        e.preventDefault();
        d.ghost.style.left = e.clientX + "px"; d.ghost.style.top = e.clientY + "px";
        const t = dropAt(e.clientX, e.clientY);
        setOver(t && (!h.canDrop || h.canDrop(d.src, t)) ? t : null);
      }
    };
    const up = e => {
      if (!d || e.pointerId !== d.id) return;
      const dd = d; d = null; setOver(null);
      if (dd.ghost) { dd.ghost.remove(); h.drop(dd.src, dropAt(e.clientX, e.clientY), e); return; }
      if (!dd.moved && dd.tapEl && st.contains(dd.tapEl)) h.tap(dd.tapEl, e);
    };
    const cancel = e => { if (!d || e.pointerId !== d.id) return; if (d.ghost) d.ghost.remove(); d = null; setOver(null); };
    st.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", cancel);
    inst.cleanups.push(() => {
      st.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); window.removeEventListener("pointercancel", cancel);
      if (d && d.ghost) d.ghost.remove();
    });
  }
  const box = inst => ({ w: Math.max(120, inst.stage.clientWidth - 16), h: Math.max(120, inst.stage.clientHeight - 16) });
  const imgTag = (api, k) => `<img src="${esc(api.ART(k))}" alt="">`;

  /* =====================================================================
     1. EQUAL GROUPS - drag the same number onto each plate, then tap each full plate to skip-count.
     ===================================================================== */
  function makeEqual(level, prev) {
    /* Level 3 links the two ways of writing it: "4 + 4 + 4 = ?" is followed by "3 × 4 = ?". */
    if (level === 2 && prev && prev.data && prev.data.form === "add" && /^eg2:/.test(prev.key)) {
      const { g, n, item } = prev.data, P = many(item);
      return { key: `eg2:${g}x${n}:mul`, say: `${g} times ${n}. That is ${g} plates of ${n}. How many?`, show: `${g} ${TIMES} ${n} = ?`,
        answer: String(g * n), input: { type: "number", unit: "" }, data: { g, n, item, form: "mul" } };
    }
    return fresh(() => {
      let g, n, form = "words";
      if (level === 0) { n = pick([2, 5, 10]); g = rnd(2, 5); }
      else if (level === 1) { n = pick([3, 4]); g = rnd(2, 7); }
      else { form = "add"; g = rnd(2, 5); n = rnd(2, Math.min(10, Math.floor(50 / g))); }
      const item = pick(PLATE_ITEMS), P = many(item);
      let show, say;
      if (form === "words") { show = `${g} plates, ${n} on each. How many?`; say = `${g} plates. ${n} ${P} on each plate. How many ${P}?`; }
      else if (form === "add") { show = Array(g).fill(n).join(" + ") + " = ?"; say = Array(g).fill(n).join(" plus ") + ". How many?"; }
      else { show = `${g} ${TIMES} ${n} = ?`; say = `${g} times ${n}. That is ${g} plates of ${n}. How many?`; }
      return { key: `eg${level}:${g}x${n}:${form}`, say, show, answer: String(g * n), input: { type: "number", unit: "" }, data: { g, n, item, form } };
    }, prev);
  }
  const slotCols = n => (n <= 3 ? n : n === 4 ? 2 : n <= 6 ? 3 : n <= 8 ? 4 : 5);
  function mountEqual(el, Q, api) {
    const inst = base(el, "gp-eg", Q, api);
    const { g, n, item } = Q.data;
    /* counted[i]: plate i has her heart (she tapped it to count it). order: the plates in the order she counted them. */
    const s = (inst.s = { fill: Array(g).fill(0), counted: Array(g).fill(false), order: [] });
    inst.stage.innerHTML = `<div class="gp-eg-top"><button class="gp-tray gp-chunky" type="button" data-src="tray" aria-label="Drag a ${esc(one(item))} to a plate">${imgTag(api, item)}${imgTag(api, item)}${imgTag(api, item)}</button></div><div class="gp-plates"></div>`;
    const tray = inst.stage.querySelector(".gp-tray"), plates = inst.stage.querySelector(".gp-plates");
    inst.parts = { tray, plates, plate: i => plates.children[i] };
    function plateHTML(i) {
      let slots = "";
      for (let k = 0; k < n; k++) slots += k < s.fill[i] ? `<span class="gp-slot on">${imgTag(api, item)}</span>` : `<span class="gp-slot"></span>`;
      const full = s.fill[i] >= n;
      /* No numbers here: the label says only what she can see, and a counted plate gets a heart. */
      return `<div class="gp-plate${s.rect ? " rect" : ""}${full ? " full" : ""}" role="button" tabindex="0" data-drop="plate" data-tap="plate" data-plate="${i}" aria-label="Plate${full ? ", full" : ""}${s.counted[i] ? ", counted" : ""}"><div class="gp-slots">${slots}</div>${s.counted[i] ? `<span class="gp-badge gp-mark">${HEART}</span>` : ""}</div>`;
    }
    function render() {
      plates.innerHTML = s.fill.map((_, i) => plateHTML(i)).join("");
      inst.layout();
    }
    inst.layout = () => {
      /* Pick the number of columns that gives the biggest pictures. A plate is its slot grid plus a rim.
         The top row holds only the tray of treats (there is no skip-count strip: she counts by herself). */
      const top = inst.stage.querySelector(".gp-eg-top"), narrow = box(inst).w < 320, short = box(inst).h < 420;
      const topH = short ? 48 : 64;
      top.classList.toggle("short", short);
      top.style.height = topH + "px";
      /* Two plate shapes: a round plate (small groups) or a rounded tray, which holds its pictures with less spare rim.
         The round plate is kept unless the tray gives bigger pictures. */
      const { w, h } = box(inst), H = h - topH - 8 - 6, sc = slotCols(n), sr = Math.ceil(n / sc);
      /* Tray size from its picture size: 3px border each side, 6px clear inside the rim, a deeper top rim (padTop) for the count badge. */
      const padTop = narrow ? 6 : 8;
      const trayW2 = is => sc * is + (sc - 1) * 2 + 18, trayH2 = is => sr * is + (sr - 1) * 2 + 18 + padTop;
      function bestFor(rect, mustFit) {
        /* Small phones (iPhone SE): tighter gaps, so 7 plates fit in 3 rows of 3 with treats near 18px instead of 2 rows of 4 at 11px. */
        const padX = 1.5, padY = 1.75, rowGap = rect ? (narrow ? (short ? 10 : 14) : 16) : 14, gap = rect ? (narrow ? 10 : 18) : 12;
        let best = null;
        for (let cols = 1; cols <= g; cols++) {
          const rows = Math.ceil(g / cols);
          /* A plate or tray is never smaller than 52 x 48 (so it is easy to tap): skip a grid where trays of that size would not fit,
             or the last row is pushed out of the picture (seen: 7 plates on the iPhone SE). */
          if (mustFit && (rows * 48 + rowGap * (rows - 1) > H || cols * 52 + gap * (cols - 1) > w - 6)) continue;
          const colW = (w - 6 - gap * (cols - 1)) / cols, rowH = (H - rowGap * (rows - 1)) / rows;
          const is = rect ? Math.min((colW - 8 - 18 - (sc - 1) * 2) / sc, (rowH - 18 - padTop - (sr - 1) * 2) / sr, 60)
            : Math.min((colW - 6) / Math.max(sc * padX, sr * padY * 1.18), (rowH - 6) / Math.max(sr * padY, (sc * padX) / 1.7), 60); /* 6px: room for the last badge on the rim */
          if (!best || is > best.is + 0.3 || (Math.abs(is - best.is) <= 0.3 && rows < best.rows)) best = { cols, is, rows, rect, padX, padY, rowGap, gap };
        }
        return best;
      }
      const tray = bestFor(true, true) || bestFor(true, false), oval = n <= 5 ? bestFor(false, true) || bestFor(false, false) : null;
      const best = oval && oval.is >= tray.is * 0.95 ? oval : tray, rect = best.rect, { padX, padY } = best;
      s.rect = rect;
      plates.classList.toggle("narrow", narrow); plates.style.rowGap = best.rowGap + "px"; plates.style.columnGap = best.gap + "px";
      plates.querySelectorAll(".gp-plate").forEach(pl => pl.classList.toggle("rect", rect));
      const is = Math.max(10, Math.floor(best.is));
      const ph = rect ? Math.max(48, trayH2(is)) : Math.max(48, Math.round(Math.max(is * sr * padY, (is * sc * padX) / 1.7) + 6));
      const pw = rect ? Math.max(52, trayW2(is)) : Math.max(52, Math.round(Math.max(is * sc * padX + 6, ph * 1.18)));
      plates.style.gridTemplateColumns = `repeat(${best.cols}, ${pw}px)`;
      plates.style.setProperty("--pw", pw + "px"); plates.style.setProperty("--ph", ph + "px");
      plates.style.setProperty("--sc", sc); plates.style.setProperty("--is", is + "px");
    };
    function add(i) {
      if (s.fill[i] >= n) { nope(inst.parts.plate(i)); sfx(api, 220); return; }
      s.fill[i]++; sfx(api, 520 + s.fill[i] * 30);
      render(); pop(inst.parts.plate(i).querySelectorAll(".gp-slot.on")[s.fill[i] - 1]);
      if (s.fill[i] === n) try { api.tone([660, 880], 0.1, "sine", 0.08); } catch (e) {}
      inst.changed();
    }
    /* A tap on a full plate puts a heart on it. Marie says the skip-count herself; the game never says it. */
    function count(i) {
      if (s.counted[i]) { pop(inst.parts.plate(i).querySelector(".gp-badge")); sfx(api, 500); return; }
      s.counted[i] = true; s.order.push(i);
      render(); pop(inst.parts.plate(i).querySelector(".gp-badge"));
      sfx(api, 700 + s.order.length * 40);
      inst.changed();
    }
    pointerKit(inst, {
      src: () => ({ html: imgTag(api, item), size: 56 }),
      drop: (src, t) => { if (t && t.dataset.plate != null) add(+t.dataset.plate); },
      tap: t => {
        if (t.dataset.plate == null) return;
        const i = +t.dataset.plate;
        if (s.fill[i] < n) add(i); else count(i);
      }
    });
    inst.reset = () => { s.fill.fill(0); s.counted.fill(false); s.order = []; render(); inst.changed(); };
    inst.peek = () => ({ fill: s.fill.slice(), counted: s.counted.slice(), order: s.order.slice() });
    render();
    return inst;
  }
  async function teachEqual(Q, el, api) {
    const inst = ensure(el, Q, api, mountEqual); inst.reset();
    const { g, n, item, form } = Q.data, s = inst.s, P = many(item);
    /* Only numbers from the question: "4 + 4 + 4" does not show how many 4s there are, so Kitty does not say it. */
    if (form === "add") { api.say(`Each ${n} in the sum is one plate with ${n} on it.`); await wait(2200); }
    if (form === "mul") { api.say(`${g} times ${n} means ${g} plates, with ${n} on each.`); await wait(2200); }
    api.say(`Fill one plate. Put ${n} ${P} on it.`); light(api, inst.parts.plate(0));
    if (!(await inst.waitFor(() => s.fill[0] >= n))) return;
    if (g > 1) {
      api.say(`Good! Now fill every plate with ${n}.`); light(api, inst.parts.plates);
      if (!(await inst.waitFor(() => s.fill.every(f => f >= n)))) return;
    }
    api.say(`Now count by ${n}s. Tap a plate and say the number. Then the next plate.`); light(api, inst.parts.plates);
    if (!(await inst.waitFor(() => s.order.length === g))) return;
    light(api, null);
    api.say(`How many ${P} in all? Type your number.`);
  }
  function hintEqual(Q, tries) {
    const { n, item, form } = Q.data;
    return `Put ${n} ${form === "words" ? many(item) : ""} on every plate. Then tap each plate. Count by ${n}s.`.replace("  ", " ");
  }

  /* =====================================================================
     2. ROWS (arrays) - tap each row to count on by the row.
     ===================================================================== */
  function makeArrays(level, prev) {
    return fresh(() => {
      const r = rnd(2, 5), c = level === 0 ? rnd(2, 5) : rnd(6, 10), item = pick(ROW_ITEMS), P = many(item);
      return { key: `ar${level}:${r}x${c}`, say: `${r} rows. ${c} ${P} in each row. How many ${P}?`, show: `${r} rows of ${c}. How many?`,
        answer: String(r * c), input: { type: "number", unit: "" }, data: { r, c, item } };
    }, prev);
  }
  function mountArrays(el, Q, api) {
    const inst = base(el, "gp-ar", Q, api);
    const { r, c, item } = Q.data;
    /* counted[i]: row i has her tick. order: the rows in the order she ticked them. */
    const s = (inst.s = { counted: Array(r).fill(false), order: [] });
    inst.stage.innerHTML = `<div class="gp-bed"></div>`;
    const bed = inst.stage.querySelector(".gp-bed");
    inst.parts = { bed, row: i => bed.children[i] };
    function render() {
      const tag = s.tight ? "div" : "button";
      /* A row of 6 to 10 has a gap after the 5th picture, so she sees 5 and some more. A ticked row gets a tick, never a number. */
      bed.innerHTML = s.counted.map((v, i) => `<${tag} ${s.tight ? "" : 'type="button" data-tap="row"'} class="gp-row${v ? " on" : ""}" data-row="${i}" aria-label="Row${v ? ", counted" : ""}">${Array(c).fill(imgTag(api, item)).join("")}<span class="gp-rb">${v ? TICK : ""}</span></${tag}>`).join("");
      inst.layout();
    }
    inst.layout = () => {
      const { w, h } = box(inst);
      const ig = c > 6 ? 3 : 6;
      /* Rows are 44px or taller; only on the smallest phones (320x568) may 5 rows shrink (to 36px or more) so they all fit. */
      const roomAt = (gap, pad) => (h - pad - gap * (r - 1)) / r;
      const tight = roomAt(6, 26) < 44, gap = tight ? 3 : 6, pad = tight ? 16 : 26;
      bed.style.padding = tight ? "5px" : "";
      /* Short rows are too thin to aim at, so then the whole bed is the target: a tap anywhere counts the next row, top to bottom. */
      if (!!s.tight !== tight) {
        s.tight = tight;
        if (tight) { bed.setAttribute("data-tap", "bed"); bed.setAttribute("role", "button"); bed.setAttribute("aria-label", "Rows. Tap to count the next row."); }
        else { bed.removeAttribute("data-tap"); bed.removeAttribute("role"); bed.removeAttribute("aria-label"); }
        render(); return;
      }
      const room = roomAt(gap, pad), floor = tight ? Math.min(44, Math.max(36, Math.floor(room))) : 44;
      let rh = Math.max(floor, Math.min(92, room));
      const bw = Math.round(Math.max(tight ? 30 : 38, Math.min(52, rh * 0.7, rh - 6)));
      const five = c > 5 ? ig + 10 : 0; /* the gap after the 5th picture */
      bed.style.setProperty("--five", five + "px");
      const is = Math.floor(Math.max(14, Math.min(rh - 12, (w - pad - 22 - bw - 8 - ig * (c - 1) - five) / c, 72)));
      rh = Math.max(floor, Math.min(rh, is + 18));
      bed.style.setProperty("--rh", Math.floor(rh) + "px"); bed.style.setProperty("--rh2", Math.floor(rh + gap) / 2 + "px");
      bed.style.setProperty("--rg", gap + "px"); bed.style.setProperty("--is", is + "px");
      bed.style.setProperty("--bw", bw + "px"); bed.style.setProperty("--ig", ig + "px");
    };
    pointerKit(inst, {
      src: () => null, drop: () => {},
      tap: t => {
        const i = t.dataset.row != null ? +t.dataset.row : s.counted.findIndex(v => !v);
        if (i < 0) return;
        /* A tap ticks the row. Marie counts on by the row herself; the game says no number. */
        if (s.counted[i]) { pop(inst.parts.row(i).querySelector(".gp-rb")); sfx(api, 500); return; }
        s.counted[i] = true; s.order.push(i);
        render(); pop(inst.parts.row(i).querySelector(".gp-rb"));
        sfx(api, 600 + s.order.length * 50);
        inst.changed();
      }
    });
    inst.reset = () => { s.counted.fill(false); s.order = []; render(); inst.changed(); };
    inst.peek = () => ({ counted: s.counted.slice(), order: s.order.slice() });
    render();
    return inst;
  }
  async function teachArrays(Q, el, api) {
    const inst = ensure(el, Q, api, mountArrays); inst.reset();
    const { r, c, item } = Q.data, s = inst.s;
    api.say(`Each row has ${c}. Tap the top row and say ${c}.`); light(api, inst.parts.row(0));
    if (!(await inst.waitFor(() => s.order.length >= 1))) return;
    api.say(`Tap the next row. Count on ${c} more. Keep going.`); light(api, inst.parts.bed);
    if (!(await inst.waitFor(() => s.order.length === r))) return;
    light(api, null);
    api.say(`How many ${many(item)} in all? Type your number.`);
  }
  function hintArrays(Q, tries) {
    const { c } = Q.data;
    return `Every row has ${c}. Tap each row. Count by ${c}s.`;
  }

  /* =====================================================================
     3. SHARE FAIRLY - deal treats one at a time to the friends (sharing),
        or fill bags of the same size (grouping).
     ===================================================================== */
  const SHARE_MAX = { 2: 10, 3: 10, 4: 7, 5: 6 };
  function makeShare(level, prev) {
    return fresh(() => {
      const item = pick(SHARE_ITEMS), P = many(item);
      if (level === 0) {
        let k, each, N;
        do { k = rnd(2, 5); each = rnd(2, SHARE_MAX[k]); N = k * each; } while (N < 6 || N > 30);
        const others = FRIENDS.slice(1).sort(() => Math.random() - 0.5);
        const friends = ["kitty"].concat(others.slice(0, k - 1));
        return { key: `sh0:${N}/${k}`, say: `${k} friends share ${N} ${P} fairly. How many does each friend get?`, show: `${N} for ${k} friends. How many each?`,
          answer: String(each), input: { type: "number", unit: "" }, data: { mode: "share", N, k, item, friends } };
      }
      let b, bags, N;
      do { b = rnd(2, 5); bags = rnd(2, 6); N = b * bags; } while (N > 30);
      return { key: `sh1:${N}/${b}`, say: `${N} ${P}. Put ${b} in each bag. How many bags?`, show: `${N} ${P}, ${b} in a bag. How many bags?`,
        answer: String(bags), input: { type: "number", unit: "" }, data: { mode: "bags", N, b, item } };
    }, prev);
  }
  /* Biggest picture size so that n pictures fit in a w x h area (gap 2px). */
  function fitGrid(n, w, h, max, min = 12, maxCols = 99) {
    for (let sz = max; sz >= min; sz--) {
      const cols = Math.max(1, Math.min(maxCols, Math.floor((w + 2) / (sz + 2))));
      if (Math.ceil(n / cols) * (sz + 2) <= h) return sz;
    }
    return min;
  }
  /* Pile height: just tall enough for n treats at a comfortable size (34px), never more than cap. */
  function pileHeight(n, w, cap) {
    const per = Math.max(1, Math.floor((w - 26) / 36)), rows = Math.ceil(n / per);
    return Math.round(Math.max(72, Math.min(cap, rows * 36 + 26)));
  }
  const CHAR_COL = { kitty: ["#e8203f", "#ffe3ea"], melody: ["#ff4f95", "#ffe0ee"], kuromi: ["#6b4bd6", "#ece6ff"], purin: ["#c58a12", "#fff1c9"], cinna: ["#2386c8", "#e0f3ff"] };
  function mountShare(el, Q, api) {
    return Q.data.mode === "bags" ? mountBags(el, Q, api) : mountDeal(el, Q, api);
  }
  function mountDeal(el, Q, api) {
    const inst = base(el, "gp-sh", Q, api);
    const { N, k, item, friends } = Q.data, cap = SHARE_MAX[k];
    const s = (inst.s = { pile: N, got: Array(k).fill(0), cap: 0 });
    inst.stage.innerHTML = `<div class="gp-pile" data-src="pile" data-drop="pile" aria-label="${esc(many(item))} to share"></div><div class="gp-friends" style="--k:${k}"></div>`;
    const pile = inst.stage.querySelector(".gp-pile"), fr = inst.stage.querySelector(".gp-friends");
    inst.parts = { pile, friends: fr, friend: i => fr.children[i] };
    fr.innerHTML = friends.map((f, i) => `<div class="gp-friend" role="button" tabindex="0" data-drop="friend" data-tap="friend" data-friend="${i}" style="--col:${CHAR_COL[f][0]};--tint:${CHAR_COL[f][1]}" aria-label="${NAMES[f]}">${faceSvg(api, f)}<span class="gp-name">${NAMES[f]}</span><div class="gp-fplate" data-src="fplate" data-friend="${i}"></div></div>`).join("");
    function render() {
      pile.innerHTML = Array(s.pile).fill(imgTag(api, item)).join("");
      pile.classList.toggle("empty", !s.pile);
      /* Treats on a friend's plate stand in rows of 5 (like a ten-frame), so she can count Kitty's plate. */
      s.got.forEach((v, i) => { fr.children[i].querySelector(".gp-fplate").innerHTML = v ? `<div class="gp-fpi">${Array(v).fill(imgTag(api, item)).join("")}</div>` : ""; });
      if (inst.fitCheck) inst.fitCheck();
    }
    inst.layout = () => {
      const { w, h } = box(inst);
      const pileH = pileHeight(N, w, Math.min(h * 0.36, 210));
      pile.style.height = pileH + "px";
      const pis = fitGrid(N, w - 26, pileH - 20, 52);
      inst.stage.style.setProperty("--is", pis + "px");
      const fw = (w - 8 * (k - 1)) / k, restH = h - pileH - 8;
      const fs = Math.round(Math.max(36, Math.min(92, fw * 0.62, restH * 0.3)));
      /* A plate is no taller than it is wide (no stretched ovals on tall screens), unless the treats would be too small to count: then up to 1.5 times. */
      const tall = fitGrid(cap, fw - 14, Math.max(64, fw * 0.95) - 18, 46, 12, 5) < 20 ? 1.5 : 0.95;
      /* On a short screen the names go (the faces still show who is who), so the treats on the plates stay big enough to count. */
      const noNames = restH - fs - 4 - 19 - 4 - 6 < 72;
      fr.classList.toggle("nonames", noNames);
      const plateH = Math.min(restH - fs - 4 - (noNames ? 0 : 19 + 4) - 6, Math.max(64, fw * tall));
      const fis = fitGrid(cap, fw - 14, plateH - 18, 46, 12, 5);
      inst.stage.style.setProperty("--fs", fs + "px");
      fr.querySelectorAll(".gp-fplate").forEach(p => (p.style.height = Math.max(44, Math.floor(plateH)) + "px"));
      inst.plateH = Math.max(44, Math.floor(plateH)); inst.fw = fw; setFis(fis);
      inst.fitCheck();
    };
    /* Treat size on the friends' plates, and how many stand in a row: as many as fit, never more than 5. */
    function setFis(fis) {
      inst.stage.style.setProperty("--fis", fis + "px");
      inst.stage.style.setProperty("--fc", Math.max(1, Math.min(5, Math.floor((inst.fw - 14 + 2) / (fis + 2)))));
    }
    /* After sizing, and after every treat she moves: if anything spills over the bottom, take it off the plates, then the faces. */
    inst.fitCheck = () => {
      if (!inst.plateH) return;
      for (let i = 0; i < 3; i++) {
        const over = inst.stage.scrollHeight - inst.stage.clientHeight;
        if (over <= 0) return;
        const fromPlate = Math.min(over, Math.max(0, inst.plateH - 44));
        inst.plateH -= fromPlate;
        fr.querySelectorAll(".gp-fplate").forEach(p => (p.style.height = inst.plateH + "px"));
        if (over > fromPlate) inst.stage.style.setProperty("--fs", Math.max(30, parseFloat(inst.stage.style.getPropertyValue("--fs")) - (over - fromPlate)) + "px");
        setFis(fitGrid(cap, inst.fw - 14, inst.plateH - 18, 46, 12, 5));
      }
    };
    function fairCheck() {
      if (!s.pile && s.got.every(v => v === s.got[0])) {
        fr.querySelectorAll("svg.gp-face").forEach(f => { f.classList.remove("gp-hop"); void f.getBoundingClientRect(); f.classList.add("gp-hop"); });
        try { api.tone([523, 659, 784], 0.12, "sine", 0.08); } catch (e) {}
      }
    }
    function give(i, from) {
      const fEl = inst.parts.friend(i);
      if (from == null && !s.pile) { nope(pile); sfx(api, 220); return; }
      if (s.cap && s.got[i] >= s.cap) { nope(fEl); sfx(api, 220); api.say(`${NAMES[friends[i]]} has enough. Give to the next friend.` + (inst.lessonLine && !/next friend/.test(inst.lessonLine) ? " " + inst.lessonLine : "")); return; }
      if (s.got[i] >= cap) { nope(fEl); sfx(api, 220); return; }
      if (from == null) s.pile--; else s.got[from]--;
      s.got[i]++; render(); pop(fEl.querySelector(".gp-fplate img:last-child")); sfx(api, 540 + s.got[i] * 40);
      fairCheck(); inst.changed();
    }
    function takeBack(i) { if (!s.got[i]) return; s.got[i]--; s.pile++; render(); sfx(api, 400); inst.changed(); }
    pointerKit(inst, {
      src: el2 => (el2.dataset.src === "pile" ? (s.pile ? { from: null, html: imgTag(api, item), size: 54 } : null)
        : s.got[+el2.dataset.friend] ? { from: +el2.dataset.friend, html: imgTag(api, item), size: 54 } : null),
      canDrop: (src, t) => t.dataset.drop === "friend" ? +t.dataset.friend !== src.from : src.from != null,
      drop: (src, t) => {
        if (!t) return;
        if (t.dataset.drop === "friend" && +t.dataset.friend !== src.from) give(+t.dataset.friend, src.from);
        else if (t.dataset.drop === "pile" && src.from != null) takeBack(src.from);
      },
      tap: t => { if (t.dataset.friend != null) give(+t.dataset.friend, null); }
    });
    inst.reset = () => { s.pile = N; s.got.fill(0); s.cap = 0; render(); inst.changed(); };
    inst.peek = () => ({ pile: s.pile, got: s.got.slice() });
    render(); inst.layout();
    return inst;
  }
  function bagSvg(i, closed) {
    const cols = [["#ff6f9f", "#ffd0e0"], ["#63d3b3", "#c9f2e4"], ["#a98bff", "#e3d9ff"], ["#74c8ff", "#d4eeff"], ["#ffc94a", "#ffefc2"], ["#ff8f6b", "#ffe0d4"]][i % 6];
    return `<svg viewBox="0 0 100 105" aria-hidden="true">
      <path d="M30 30 C30 6 70 6 70 30" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round"/><path d="M30 30 C30 6 70 6 70 30" fill="none" stroke="${cols[0]}" stroke-width="3" stroke-linecap="round"/>
      <path d="M10 30 H90 L96 98 Q96 102 92 102 H8 Q4 102 4 98 Z" fill="${cols[1]}" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>
      <path d="M10 30 H90 L91 40 H9 Z" fill="${cols[0]}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
      ${closed ? `<g transform="translate(50 30)"><path d="M0 0 C-20 -16 -24 8 0 3 Z" fill="#ffc94a" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><path d="M0 0 C20 -16 24 8 0 3 Z" fill="#ffc94a" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><circle cy="1.5" r="6" fill="#ffc94a" stroke="${INK}" stroke-width="3"/></g>`
        : `<path d="M14 46 H86" stroke="${INK}" stroke-width="2" stroke-dasharray="5 5" opacity=".35"/>`}
    </svg>`;
  }
  const MAX_BAGS = 6;
  function mountBags(el, Q, api) {
    const inst = base(el, "gp-sh gp-bg", Q, api);
    const { N, b, item } = Q.data;
    const s = (inst.s = { pile: N, bags: [0], order: [] });
    inst.stage.innerHTML = `<div class="gp-pile" data-src="pile" data-drop="pile" aria-label="${esc(many(item))}"></div><div class="gp-bags"></div>`;
    const pile = inst.stage.querySelector(".gp-pile"), bagsEl = inst.stage.querySelector(".gp-bags");
    const openIdx = () => (s.bags.length && s.bags[s.bags.length - 1] < b ? s.bags.length - 1 : -1);
    inst.parts = { pile, bags: bagsEl, bag: i => bagsEl.children[i] };
    function render() {
      pile.innerHTML = Array(s.pile).fill(imgTag(api, item)).join("");
      pile.classList.toggle("empty", !s.pile);
      let h = "";
      for (let i = 0; i < MAX_BAGS; i++) {
        if (i >= s.bags.length) break;
        const closed = s.bags[i] >= b, ci = s.order.indexOf(i);
        /* No number on a bag or in its label (the last bag's number would be the answer). A counted bag gets a heart. */
        h += `<div class="gp-bag${closed ? " closed" : " open"}" role="button" tabindex="0" data-bag="${i}" data-tap="bag" ${closed ? "" : `data-drop="bag" data-src="bag"`} aria-label="${closed ? "Full bag" : "Bag"}${ci >= 0 ? ", counted" : ""}">${bagSvg(i, closed)}<div class="gp-bi">${Array(s.bags[i]).fill(imgTag(api, item)).join("")}</div>${ci >= 0 ? `<span class="gp-badge gp-mark">${HEART}</span>` : ""}</div>`;
      }
      bagsEl.innerHTML = h;
    }
    inst.layout = () => {
      const { w, h } = box(inst);
      const pileH = pileHeight(N, w, Math.min(h * 0.34, 200));
      pile.style.height = pileH + "px";
      inst.stage.style.setProperty("--is", fitGrid(N, w - 26, pileH - 20, 50) + "px");
      const H = h - pileH - 8 - 8; let best = null;
      for (let cols = 1; cols <= MAX_BAGS; cols++) {
        const rows = Math.ceil(MAX_BAGS / cols);
        const bs = Math.min((w - 10 * (cols - 1) - 8) / cols, (H - 10 * (rows - 1) - 8) / rows / 1.05, 150);
        if (!best || bs > best.bs) best = { cols, bs };
      }
      const bs = Math.floor(best.bs);
      bagsEl.style.setProperty("--bc", best.cols); bagsEl.style.setProperty("--bs", bs + "px");
      bagsEl.style.setProperty("--bis", fitGrid(b, bs * 0.86 - 2, bs * 1.05 * 0.53, 40, 10) + "px");
    };
    function put() {
      if (!s.pile) { nope(pile); sfx(api, 220); return; }
      const i = openIdx(); if (i < 0) return;
      s.pile--; s.bags[i]++;
      if (s.bags[i] === b) { try { api.tone([660, 880], 0.1, "sine", 0.08); } catch (e) {} if (s.pile) s.bags.push(0); }
      else sfx(api, 540 + s.bags[i] * 40);
      render(); pop(inst.parts.bag(i)); inst.changed();
    }
    function takeBack() {
      const i = openIdx(); if (i < 0 || !s.bags[i]) return;
      s.bags[i]--; s.pile++; render(); sfx(api, 400); inst.changed();
    }
    function count(i) {
      if (s.bags[i] < b) return put();
      /* A tap on a full bag puts a heart on it. Marie counts the bags herself; the game says no number. */
      if (s.order.indexOf(i) >= 0) { pop(inst.parts.bag(i).querySelector(".gp-badge")); sfx(api, 500); return; }
      s.order.push(i); render(); pop(inst.parts.bag(i).querySelector(".gp-badge")); sfx(api, 700 + s.order.length * 50); inst.changed();
    }
    pointerKit(inst, {
      src: el2 => (el2.dataset.src === "pile" ? (s.pile ? { from: "pile", html: imgTag(api, item), size: 54 } : null) : s.bags[+el2.dataset.bag] ? { from: "bag", html: imgTag(api, item), size: 54 } : null),
      canDrop: (src, t) => (src.from === "pile" ? t.dataset.drop === "bag" : t.dataset.drop === "pile"),
      drop: (src, t) => { if (!t) return; if (src.from === "pile" && t.dataset.drop === "bag") put(); else if (src.from === "bag" && t.dataset.drop === "pile") takeBack(); },
      tap: t => { if (t.dataset.bag != null) count(+t.dataset.bag); }
    });
    inst.reset = () => { s.pile = N; s.bags = [0]; s.order = []; render(); inst.changed(); };
    inst.peek = () => ({ pile: s.pile, bags: s.bags.slice(), order: s.order.slice() });
    render(); inst.layout();
    return inst;
  }
  async function teachShare(Q, el, api) {
    const inst = ensure(el, Q, api, mountShare); inst.reset();
    api = lessonSay(inst, api);
    const d = Q.data, s = inst.s, P = many(d.item);
    if (d.mode === "share") {
      for (let round = 1; s.pile > 0 && !inst.dead; round++) {
        s.cap = round;
        api.say(round === 1 ? `Give one ${one(d.item)} to each friend.` : "Again. One more each."); light(api, inst.parts.friends);
        if (!(await inst.waitFor(() => s.got.every(v => v >= round)))) return;
      }
      s.cap = 0;
      api.say(`How many does Kitty have? Count her ${P}.`); light(api, inst.parts.friend(0));
      await wait(400);
      return;
    }
    api.say(`Put ${d.b} ${P} in the bag.`); light(api, inst.parts.bag(0));
    if (!(await inst.waitFor(() => s.bags[0] >= d.b))) return;
    api.say("Now fill the next bag. Keep going."); light(api, inst.parts.bags);
    if (!(await inst.waitFor(() => !s.pile && s.bags.every(v => v >= d.b)))) return;
    api.say("Now count the bags. Tap a bag and say the number. Then the next bag."); light(api, inst.parts.bags);
    if (!(await inst.waitFor(() => s.order.length === s.bags.length))) return;
    light(api, null);
    api.say("How many bags? Type your number.");
  }
  function hintShare(Q, tries) {
    const d = Q.data;
    if (d.mode === "share") return `Give one to each friend. Go round again. Then count Kitty's ${many(d.item)}.`;
    return `Put ${d.b} in a bag. Fill the next bag. Then tap each bag to count.`;
  }

  /* =====================================================================
     4. BALANCE IT - a pan balance with a springy beam.
        Both pans start EMPTY. The numbers in the question wait in labelled bags under their side
        (pink side left, green side right). Marie puts each bag on its pan herself (tap it or drag it).
        Every time the weights change, the beam swings past, back and forth. While the sides differ it
        KEEPS rocking gently, tipped towards the heavier side, and never rests (the father: "balance keep
        swing until it is balance"). It comes to rest, level, only when both sides weigh the same.
        Level 1  "Is 6 + 7 the same as 13?": she puts all three bags on, watches it stop level or keep
                 rocking, then answers.
        Level 2  "3 + ? = 9" and level 3 "? + 11 = 21": she puts the bags on, then adds her own blocks to
                 the pink pan (one at a time; level 3 also has a ten-rod) until it is level, then taps
                 her blocks to count them.
        Level 4  "15 - ? = 10": she puts the bags on, then takes blocks off the pink pan, one at a time,
                 into Kuromi's basket until it is level, then counts the basket.
                 "? - 5 = 9": Kuromi's basket holds the 5 that were taken away (a number in the question).
                 She puts the 9 bag on the green pan, adds blocks to the pink pan until it is level (what
                 was left), then counts everything: the basket first, then her blocks.
        "Level" only counts once every bag is on and she has done her part, so an empty scale never
        lights the star.
     ===================================================================== */
  function makeBalance(level, prev) {
    /* Count the question once, outside fresh(): fresh() may build several tries to avoid a repeat. */
    /* A new run of this level (no previous level-2 question) starts small again. */
    if (level === 1 && !(prev && String(prev.key).startsWith("ba1:"))) counters.ba1 = 0;
    const n1 = level === 1 ? bump("ba1") : 0;
    return fresh(() => {
      if (level === 0) {
        const a = rnd(1, 9), b = rnd(1, 9), same = Math.random() < 0.5;
        let c = a + b;
        if (!same) { const off = pick([-2, -1, 1, 2]); c = c + off < 1 ? c + 2 : c + off; }
        return { key: `ba0:${a}+${b}:${c}`, say: `Is ${a} plus ${b} the same as ${c}?`, show: `Is ${a} + ${b} the same as ${c}?`, answer: a + b === c ? "=" : NEQ,
          input: { type: "choice", choices: [
            { value: "=", label: "the same", html: `<span class="big">=</span>the same` },
            { value: NEQ, label: "not the same", html: `<span class="big">${NEQ}</span>not the same` }] },
          data: { mode: "eq", a, b, c } };
      }
      if (level === 1) {
        const c = n1 <= 5 ? rnd(4, 10) : rnd(11, 20), a = rnd(1, c - 1);
        return { key: `ba1:${a}+?=${c}`, say: `${a} plus what makes ${c}?`, show: `${a} + ? = ${c}`, answer: String(c - a), input: { type: "number", unit: "" }, data: { mode: "add", a, c, cupFirst: false } };
      }
      if (level === 2) {
        const c = rnd(20, 50), b = rnd(5, c - 3);
        return { key: `ba2:?+${b}=${c}`, say: `What plus ${b} makes ${c}?`, show: `? + ${b} = ${c}`, answer: String(c - b), input: { type: "number", unit: "" }, data: { mode: "add", a: b, c, cupFirst: true, big: true } };
      }
      if (Math.random() < 0.5) {
        const c = rnd(10, 20), x = rnd(2, c - 2), r = c - x;
        return { key: `ba3:${c}-?=${r}`, say: `${c} take away what leaves ${r}?`, show: `${c} ${MINUS} ? = ${r}`, answer: String(x), input: { type: "number", unit: "" }, data: { mode: "take", c, r } };
      }
      const b = rnd(2, 9), r = rnd(2, 20 - b);
      return { key: `ba3:?-${b}=${r}`, say: `What take away ${b} leaves ${r}?`, show: `? ${MINUS} ${b} = ${r}`, answer: String(b + r), input: { type: "number", unit: "" }, data: { mode: "sub", b, r } };
    }, prev);
  }
  const BCOL = { pink: "#ff6f9f", lilac: "#a98bff", mint: "#63d3b3", sky: "#74c8ff" };
  const PX = 200, ARM = 100, HALF = 95, VBW = 400;
  /* The beam is a damped spring (degrees, seconds): stiff enough to swing about once a second,
     damped so it goes back and forth three or four times. When the sides are the same it then rests level.
     When they differ it keeps rocking ROCK degrees either side of its tipped rest, for ever, until she
     makes them the same. ROCK is smaller than the smallest tilt (6.6), so it never passes level.
     The smallest tilt is big on purpose: one block too many must look tipped even on a 320 px phone. */
  const SPRING_K = 64, SPRING_C = 3.4, MAX_TILT = 11, STOP_TILT = 15, KICK = 26, ROCK = 2.4;
  const reducedMotion = () => !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  const SIDE_NAME = { L: "pink", R: "green" };
  /* The bags of blocks that wait under the scale: the numbers in the question. */
  function balanceBags(d) {
    if (d.mode === "eq") return [{ id: "a", side: "L", n: d.a, col: BCOL.pink }, { id: "b", side: "L", n: d.b, col: BCOL.lilac }, { id: "c", side: "R", n: d.c, col: BCOL.mint }];
    if (d.mode === "add") return [{ id: "a", side: "L", n: d.a, col: BCOL.pink }, { id: "c", side: "R", n: d.c, col: BCOL.mint }];
    if (d.mode === "take") return [{ id: "c", side: "L", n: d.c, col: BCOL.pink }, { id: "r", side: "R", n: d.r, col: BCOL.mint }];
    return [{ id: "r", side: "R", n: d.r, col: BCOL.mint }];
  }
  function bagIcon(b, size) {
    return `<svg class="gp-bagicon" viewBox="0 0 48 52" width="${size}" height="${size}" aria-hidden="true">
      <path d="M16 15 C16 3 32 3 32 15" fill="none" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"/>
      <path d="M8 15 H40 L45 46 Q45 50 41 50 H7 Q3 50 3 46 Z" fill="${b.col}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
      <path d="M10 20 H38" stroke="#fff" stroke-width="2.5" stroke-linecap="round" opacity=".55"/>
      <text x="24" y="42" text-anchor="middle" font-family="Baloo 2,sans-serif" font-weight="800" font-size="${b.n > 9 ? 21 : 25}" fill="#fff" stroke="${INK}" stroke-width="3.2" paint-order="stroke fill">${b.n}</text></svg>`;
  }
  function mountBalance(el, Q, api) {
    const inst = base(el, "gp-bal", Q, api);
    /* Small numbers: cubes in rows of 5. Up to 50: upright tens rods and a column of ones, like base-ten blocks. */
    const d = Q.data, big = !!d.big, U = big ? 10 : 16, PY = big ? 200 : 158, VBH = big ? 276 : 234;
    const BAGS = (inst.bags = balanceBags(d));
    const hers = d.mode === "add" || d.mode === "sub"; /* she adds her own blocks to the pink pan */
    const hasDish = d.mode === "take" || d.mode === "sub";
    const cupG = d.mode === "sub" ? "mine" : "cup";
    const s = (inst.s = { placed: {}, cup: 0, moved: 0, lit: {}, ang: 0, vel: 0, target: 0, settled: true, steady: false, crossings: 0, cheered: false, diff: 0, ctlKey: "", locked: false });
    const allPlaced = () => BAGS.every(b => s.placed[b.id]);
    /* piles: what is on each pan right now, in counting order. g = counting group. */
    function piles() {
      const L = [], R = [], dish = { n: 0, g: d.mode === "take" ? "dish" : "mine" };
      const ready = allPlaced();
      const cupPile = { g: cupG, n: s.cup, col: BCOL.lilac, cup: true };
      if (hers && ready && d.cupFirst) L.push(cupPile);
      for (const b of BAGS) if (s.placed[b.id]) (b.side === "L" ? L : R).push({ g: b.id, n: d.mode === "take" && b.id === "c" ? d.c - s.moved : b.n, col: b.col });
      if (hers && ready && !d.cupFirst) L.push(cupPile);
      if (d.mode === "take") dish.n = s.moved;
      if (d.mode === "sub" && ready) dish.n = d.b;
      return { L, R, dish };
    }
    const weight = side => side.reduce((t, p) => t + p.n, 0);
    const groupTotal = (g, P) => [P.dish].concat(P.L, P.R).filter(p => p.g === g).reduce((t, p) => t + p.n, 0);
    function status() {
      const P = piles(), L = weight(P.L), R = weight(P.R), ready = allPlaced();
      const acted = d.mode === "eq" ? true : d.mode === "take" ? s.moved > 0 : s.cup > 0;
      return { P, L, R, ready, even: L === R, level: ready && acted && L === R };
    }
    const tiltFor = diff => (diff === 0 ? 0 : Math.sign(diff) * Math.min(MAX_TILT, 6 + Math.abs(diff) * 0.6));

    inst.stage.innerHTML = `<svg class="gp-bal-svg" viewBox="0 0 ${VBW} ${VBH}" preserveAspectRatio="xMidYMid meet" data-drop="scale" aria-label="Pan balance. Pink pan on the left, green pan on the right."></svg><div class="gp-bal-ctl" hidden></div>`;
    const svg = inst.stage.querySelector("svg.gp-bal-svg"), ctlEl = inst.stage.querySelector(".gp-bal-ctl");
    const q = sel => inst.stage.querySelector(sel);
    inst.parts = { svg, ctl: ctlEl, pan: side => svg.querySelector(`[data-pan="${side}"]`), bag: id => q(`[data-bag="${id}"]`), cup: () => svg.querySelector("[data-cup]"),
      dish: () => q(".gp-dish"), add: () => q('[data-tap="add1"]'), take: () => q('[data-tap="take"]') };

    /* --- the row under the scale: first the bags, then her tools --- */
    function ctlParts() {
      if (!allPlaced()) {
        const side = sd => `<div class="gp-bal-side">${BAGS.filter(b => b.side === sd && !s.placed[b.id]).map(b =>
          `<button type="button" class="gp-chunky gp-bbag" data-tap="bag" data-src="bag" data-bag="${b.id}" aria-label="Bag of ${b.n} blocks for the ${SIDE_NAME[sd]} pan">${bagIcon(b, 50)}</button>`).join("")}</div>`;
        return { key: "bags:" + BAGS.map(b => (s.placed[b.id] ? 1 : 0)).join(""), cls: "gp-bal-ctl bags", html: side("L") + side("R") };
      }
      const out = [];
      if (hasDish) out.push(`<div class="gp-dish${d.mode === "sub" ? " keep" : ""}" role="button" tabindex="0" data-tap="pile" data-g="${d.mode === "take" ? "dish" : "mine"}" data-drop="dish"${d.mode === "take" ? ' data-src="basket"' : ""} aria-label="Kuromi's basket">${faceSvg(api, "kuromi")}<span class="gp-dl">${d.mode === "sub" ? "took" : "Take away<br>here"}</span><div class="gp-dc"></div></div>`);
      if (hers) {
        /* The tool buttons show a plus or minus and the block itself (a cube, or a rod of ten): no digits anywhere in the picture. */
        out.push(`<button type="button" class="gp-chunky" data-tap="add1" data-src="cube" aria-label="Add one block">+<span class="gp-cube"></span></button>`);
        if (big) out.push(`<button type="button" class="gp-chunky" data-tap="add10" data-src="rod" aria-label="Add a ten rod">+<span class="gp-rod">${"<i></i>".repeat(10)}</span></button>`);
        out.push(`<button type="button" class="gp-chunky" data-tap="sub1" aria-label="Take one block off">${MINUS}<span class="gp-cube"></span></button>`);
      }
      if (d.mode === "take") {
        out.push(`<button type="button" class="gp-chunky" data-tap="take" aria-label="Take one block off, into Kuromi's basket">${MINUS}<span class="gp-cube" style="--c:${BCOL.pink}"></span></button>`);
        out.push(`<button type="button" class="gp-chunky" data-tap="putback" aria-label="Put one block back">+<span class="gp-cube" style="--c:${BCOL.pink}"></span></button>`);
      }
      return { key: "work", cls: "gp-bal-ctl", html: out.join("") };
    }
    /* Locked: Kitty has asked her to type, so plus, minus and take stay pale. Counting taps still work. */
    function showLock() {
      ctlEl.classList.toggle("locked", !!s.locked);
      for (const b of ctlEl.querySelectorAll(".gp-chunky")) { if (s.locked) b.setAttribute("aria-disabled", "true"); else b.removeAttribute("aria-disabled"); }
    }
    function renderCtl(P) {
      const c = ctlParts();
      if (c.key !== s.ctlKey) {
        s.ctlKey = c.key; ctlEl.className = c.cls; ctlEl.innerHTML = c.html; ctlEl.hidden = !c.html;
        s.drawnAt = 0; /* the picture gets more or less room: draw it again at the new size */
      }
      showLock();
      const dish = q(".gp-dish");
      if (!dish) return;
      const dc = dish.querySelector(".gp-dc"), g = P.dish.g, lit = s.lit[g] || 0;
      /* Cubes in Kuromi's basket stand in ten-frames: rows of 5, two rows to a frame, a second frame under the
         first after 10. She counts them herself; a tap only lights a cube (no number). */
      const two = P.dish.n > 10;
      dish.classList.toggle("has", P.dish.n > 0);
      dish.classList.remove("tight");
      dc.style.setProperty("--db", dishBlock(dish, two) + "px");
      let h = "";
      for (let f = 0; f * 10 < P.dish.n; f++) {
        h += `<span class="gp-tf">` + Array.from({ length: Math.min(10, P.dish.n - f * 10) }, (_, j) => { const i = f * 10 + j;
          return `<b class="${i < lit ? "lit" : ""}" style="background:${i < lit ? "#ffc94a" : d.mode === "take" ? BCOL.pink : BCOL.lilac}"></b>`; }).join("") + `</span>`;
      }
      dc.innerHTML = h;
    }
    /* How big the blocks in Kuromi's basket can be. She counts them herself, so they grow with the room:
       the basket may use the row's width left over by the tool buttons (at most about 62% of the row), and
       the frames may use about a quarter of the picture's height. 9 px is the floor; 30 px the ceiling.
       If the basket's word ("took") leaves too little room, the word goes and the blocks keep the room. */
    function dishBlock(dish, two) {
      const rowW = ctlEl.clientWidth, stageH = inst.stage.clientHeight;
      if (!rowW || !stageH) return 13;
      let others = 0, kids = 0;
      for (const c of ctlEl.children) { kids++; if (c !== dish) others += c.offsetWidth; }
      const cs = getComputedStyle(ctlEl), gapX = parseFloat(cs.columnGap) || 8;
      const dishMax = Math.min(rowW * 0.62, rowW - others - gapX * (kids - 1));
      const face = dish.querySelector("svg.gp-face"), label = dish.querySelector(".gp-dl");
      const fixedW = 12 + 6 + (face ? face.getBoundingClientRect().width + 6 : 0) + 6; /* padding, border, face and gaps */
      const labelW = label && getComputedStyle(label).display !== "none" ? label.getBoundingClientRect().width + 6 : 0;
      /* a clear gap (almost half a block) between the two ten-frames, so the ten stands apart */
      const rows = two ? 4 : 2, gapsY = (rows - 1) * 2;
      const byH = Math.floor((stageH * 0.26 - 6 - gapsY - (two ? 5 : 0)) / (rows + (two ? 0.45 : 0)));
      const byW = w => Math.floor((w - 8) / 5);
      let db = Math.min(byW(dishMax - fixedW - labelW), byH, 30);
      if (labelW && db < 11) { dish.classList.add("tight"); db = Math.min(byW(dishMax - fixedW), byH, 30); }
      return Math.max(9, db);
    }

    /* --- drawing --- */
    function cubeRect(x, y, col, lit, u = U) {
      const sw = u > 10 ? 2.4 : 1.6;
      return `<rect x="${x + 0.6}" y="${y + 0.6}" width="${u - 1.2}" height="${u - 1.2}" rx="${u * 0.24}" fill="${lit ? "#ffc94a" : col}" stroke="${INK}" stroke-width="${sw}"/>` +
        (u > 10 ? `<rect x="${x + 2.6}" y="${y + 2.4}" width="${u - 5.2}" height="${u * 0.2}" rx="${u * 0.1}" fill="#fff" opacity=".45"/>` : "");
    }
    const pileW = () => (big ? 8 * U + 4 : 5 * U);
    /* Draws one pile with its bottom-left at (x, base). The first litN cubes are lit (counted). Returns its top y. */
    function drawPile(p, x, base, litN) {
      let out = "";
      const n = p.n;
      if (!big) {
        for (let i = 0; i < n; i++) out += cubeRect(x + (i % 5) * U, base - (Math.floor(i / 5) + 1) * U, p.col, i < litN);
        return { svg: out, top: base - Math.ceil(n / 5) * U };
      }
      const tens = Math.floor(n / 10), ones = n % 10;
      const cw = tens * U + (tens && ones ? 4 : 0) + (ones ? (ones > 5 ? 2 : 1) * U : 0);
      const x0 = x + (pileW() - cw) / 2;
      for (let t = 0; t < tens; t++) {
        const rx = x0 + t * U, lit = litN >= (t + 1) * 10;
        out += `<rect x="${rx + 0.6}" y="${base - 10 * U + 0.6}" width="${U - 1.2}" height="${10 * U - 1.2}" rx="3" fill="${lit ? "#ffc94a" : p.col}" stroke="${INK}" stroke-width="2"/>`;
        for (let k = 1; k < 10; k++) out += `<line x1="${rx + 1.5}" x2="${rx + U - 1.5}" y1="${base - k * U}" y2="${base - k * U}" stroke="${INK}" stroke-width="1" opacity=".55"/>`;
      }
      const ox = x0 + tens * U + (tens ? 4 : 0);
      for (let j = 0; j < ones; j++) out += cubeRect(ox + Math.floor(j / 5) * U, base - ((j % 5) + 1) * U, p.col, litN >= tens * 10 + j + 1);
      return { svg: out, top: base - (tens ? 10 * U : Math.min(5, ones) * U) };
    }
    /* Smallest tap height in picture units, so every tap area is at least 48 screen pixels tall at the current size. */
    function minHit() {
      const r = svg.getBoundingClientRect();
      const sc = r && r.width && r.height ? Math.min(r.width / VBW, r.height / VBH) : 1;
      return 48 / Math.max(0.3, sc);
    }
    function drawPan(side, list, P) {
      const gap = 8, cupPad = 6, mh = minHit();
      const widths = list.map(p => pileW() + (p.cup ? cupPad * 2 : 0));
      const total = widths.reduce((a, b) => a + b, 0) + gap * (list.length - 1);
      let x = -total / 2, out = "";
      const base = -42;
      list.forEach((p, idx) => {
        const g = p.g, lit = s.lit[g] || 0;
        /* where this pile starts in its counting group */
        let before = 0;
        const order = (g === "mine" ? [P.dish] : []).concat(P.L, P.R).filter(pp => pp.g === g);
        for (const pp of order) { if (pp === p) break; before += pp.n; }
        const litHere = Math.max(0, Math.min(p.n, lit - before));
        const px = x + (p.cup ? cupPad : 0);
        const dp = drawPile(p, px, base - (p.cup ? 4 : 0), litHere);
        if (p.cup) {
          /* Her blocks stand in a dashed cup, so she can see which blocks are hers and tap them to count. */
          const minH = (big ? 4 : 3) * U + 10, h = Math.max(minH, base - dp.top + 10);
          const cupTop = base - h;
          out += `<g data-tap="pile" data-g="${g}" data-cup="1" style="cursor:pointer">
            <rect x="${x}" y="${Math.min(cupTop - 6, base - mh)}" width="${widths[idx]}" height="${Math.max(h + 6, mh)}" fill="transparent"/>
            <rect x="${x + 1}" y="${cupTop}" width="${widths[idx] - 2}" height="${h}" rx="10" fill="#f3eeff" stroke="#7b55e6" stroke-width="2.6" stroke-dasharray="7 5"/>
            ${p.n ? "" : `<text x="${x + widths[idx] / 2}" y="${base - h / 2 + 9}" text-anchor="middle" font-family="Baloo 2,sans-serif" font-weight="800" font-size="26" fill="#7b55e6">?</text>`}
            ${dp.svg}</g>`;
        } else if (d.mode === "take" && g === "c") {
          /* The pink pile in a take-away question: she can drag a block from it to Kuromi's basket. */
          const hitTop = Math.min(Math.min(dp.top, base - 40) - 6, base + 14 - mh);
          out += `<g data-src="lpile" style="cursor:grab"><rect x="${x - 4}" y="${hitTop}" width="${widths[idx] + 8}" height="${base - hitTop + 14}" fill="transparent"/>${dp.svg}</g>`;
        } else {
          out += `<g pointer-events="none">${dp.svg}</g>`;
        }
        x += widths[idx] + gap;
      });
      return out;
    }
    function panShape(fill) {
      return `<rect x="-6" y="-30" width="12" height="30" rx="4" fill="#c98a52" stroke="${INK}" stroke-width="3"/>
        <path d="M${-HALF} -42 H${HALF} Q${HALF - 4} -27 ${HALF - 20} -26 H${-HALF + 20} Q${-HALF + 4} -27 ${-HALF} -42 Z" fill="${fill}" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>
        <path d="M${-HALF + 8} -39 H${HALF - 8}" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".6"/>`;
    }
    /* The star on the stand turns gold only when the beam has come to rest level and she has done her part.
       Not in "same or not the same" (eq): there the star, sparkle and chime would be a badge saying "same",
       so only the beam itself shows it and she reads it. */
    const starOn = st => d.mode !== "eq" && s.settled && st.level && s.ang === 0;
    function render() {
      const st = status(), P = st.P, on = starOn(st);
      const postB = VBH - 16;
      svg.innerHTML = `
        <path d="M${PX - 34} ${postB} L${PX - 9} ${PY} H${PX + 9} L${PX + 34} ${postB} Z" fill="#ff8fb4" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>
        <rect x="${PX - 84}" y="${postB - 4}" width="168" height="14" rx="7" fill="#ff6f9f" stroke="${INK}" stroke-width="3.5"/>
        <g id="gpStar" data-on="${on ? 1 : 0}" transform="translate(${PX} ${PY + 36})">${on ? `<circle r="17" fill="#fff6d6" stroke="#ffc94a" stroke-width="3"/>` : ""}<path d="M0 -12 L3.5 -3.8 L12 -3.7 L5.2 1.7 L7.6 10.2 L0 5.2 L-7.6 10.2 L-5.2 1.7 L-12 -3.7 L-3.5 -3.8 Z" fill="${on ? "#ffc94a" : "#fff"}" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/></g>
        <g id="gpBeam"><rect x="${PX - ARM - 10}" y="${PY - 7}" width="${2 * ARM + 20}" height="14" rx="7" fill="#f0bf87" stroke="${INK}" stroke-width="3.5"/></g>
        <circle cx="${PX}" cy="${PY}" r="9" fill="#ffc94a" stroke="${INK}" stroke-width="3"/>
        <g id="gpPanL" data-pan="L">${panShape("#ffd0e0")}${drawPan("L", P.L, P)}</g>
        <g id="gpPanR" data-pan="R">${panShape("#c9f2e4")}${drawPan("R", P.R, P)}</g>`;
      renderCtl(P);
      place(s.ang);
      inst.layout();
    }
    function place(a) {
      const rad = a * Math.PI / 180, cx = ARM * Math.cos(rad), dy = ARM * Math.sin(rad);
      const beam = svg.querySelector("#gpBeam"), L = svg.querySelector("#gpPanL"), R = svg.querySelector("#gpPanR");
      if (beam) beam.setAttribute("transform", `rotate(${a.toFixed(2)} ${PX} ${PY})`);
      if (L) L.setAttribute("transform", `translate(${(PX - cx).toFixed(1)} ${(PY - dy).toFixed(1)})`);
      if (R) R.setAttribute("transform", `translate(${(PX + cx).toFixed(1)} ${(PY + dy).toFixed(1)})`);
    }

    /* --- the swing: a damped spring, one frame at a time --- */
    let anim = 0, last = 0, side0 = 0;
    const timers = [];
    const later = (ms, f) => { const t = setTimeout(() => { if (!inst.dead) f(); }, ms); timers.push(t); };
    const stopMotion = () => { cancelAnimationFrame(anim); anim = 0; timers.splice(0).forEach(clearTimeout); };
    inst.cleanups.push(stopMotion);
    function settle() {
      stopMotion();
      s.ang = s.target; s.vel = 0; s.settled = true;
      const st = status();
      render();
      if (st.level && !s.cheered && d.mode !== "eq") {
        s.cheered = true;
        sparkle();
        try { api.tone([1175, 1568], 0.07, "sine", 0.05); } catch (e) {}
      }
      inst.changed();
    }
    function sparkle() {
      const bits = [[-36, -18], [36, -18], [-24, -40], [24, -40], [0, -52]].map(([x, y], i) =>
        `<path transform="translate(${PX + x} ${PY + y}) scale(${i % 2 ? 0.8 : 1})" d="M0 -8 L2 -2 L8 0 L2 2 L0 8 L-2 2 L-8 0 L-2 -2 Z" fill="#ffc94a" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>`).join("");
      svg.insertAdjacentHTML("beforeend", `<g class="gp-spark" pointer-events="none" style="transform-origin:${PX}px ${PY}px">${bits}</g>`);
      later(1000, () => { const g = svg.querySelector(".gp-spark"); if (g) g.remove(); });
    }
    function step(now) {
      anim = 0;
      if (inst.dead) return;
      /* Real time, so the swing takes the same time on a slow page as on a fast one (small steps keep it steady). */
      const dt = last ? Math.min(0.1, Math.max(0, (now - last) / 1000)) : 0.016; last = now;
      const nSteps = Math.max(1, Math.ceil(dt / 0.004));
      const E0 = 0.5 * SPRING_K * ROCK * ROCK;
      let becameSteady = false;
      for (let i = 0; i < nSteps; i++) {
        const h = dt / nSteps;
        let c = SPRING_C;
        if (s.diff !== 0) {
          /* Sides differ: damp the big swing down to a gentle rock, then keep that rock going (it pumps
             back what it loses), so the beam never rests until the sides are the same. */
          const x = s.ang - s.target, E = 0.5 * s.vel * s.vel + 0.5 * SPRING_K * x * x;
          if (E < 1e-6) s.vel = ROCK * Math.sqrt(SPRING_K);
          c = SPRING_C * Math.max(-1, Math.min(1, (E - E0) / E0));
          if (E < E0 * 1.4 && !s.steady) { s.steady = true; becameSteady = true; }
        }
        s.vel += (-SPRING_K * (s.ang - s.target) - c * s.vel) * h;
        s.ang += s.vel * h;
        if (s.ang > STOP_TILT) { s.ang = STOP_TILT; s.vel = -Math.abs(s.vel) * 0.4; }
        if (s.ang < -STOP_TILT) { s.ang = -STOP_TILT; s.vel = Math.abs(s.vel) * 0.4; }
      }
      const sd = Math.sign(s.ang - s.target);
      if (sd && side0 && sd !== side0) s.crossings++;
      if (sd) side0 = sd;
      place(s.ang);
      if (becameSteady) inst.changed(); /* wake the lesson that waits for the big swing to calm down */
      if (s.diff === 0 && Math.abs(s.ang - s.target) < 0.05 && Math.abs(s.vel) < 0.5) { settle(); return; }
      anim = requestAnimationFrame(step);
    }
    /* The weights changed: give the beam a push the way the weight moved, and let it swing to its new rest. */
    function swing(dir) {
      stopMotion();
      s.settled = false; s.steady = false;
      if (reducedMotion()) {
        /* Reduced motion: step to the new tilt with one small wobble, then hold still (the tilt still shows which side is heavier). */
        const w = dir || Math.sign(s.target - s.ang) || 1;
        s.ang = s.target + w * 1.5; s.vel = 0; place(s.ang); s.crossings++;
        later(160, () => { s.ang = s.target - w * 0.5; place(s.ang); later(160, settle); });
        return;
      }
      s.vel += dir * KICK; last = 0; side0 = Math.sign(s.ang - s.target);
      anim = requestAnimationFrame(step);
    }
    /* After every move she makes: reset the counting she must redo, draw, and set the beam swinging. */
    function update(resetGroups) {
      (resetGroups || []).forEach(g => (s.lit[g] = 0));
      const st = status(), diff = st.R - st.L;
      if (diff !== s.diff) {
        const dir = Math.sign(diff - s.diff);
        s.diff = diff; s.target = tiltFor(diff); s.cheered = false; s.crossings = 0;
        render(); swing(dir);
      } else render();
      inst.changed();
    }

    inst.layout = () => {
      const { w, h } = box(inst);
      inst.stage.classList.toggle("narrow", w < 330);
      /* The basket's blocks are sized from the room, so a new size redraws the row first, then measures it. */
      if (s.boxKey !== w + "x" + h) { s.boxKey = w + "x" + h; render(); }
      const ch = ctlEl.hidden ? 0 : ctlEl.offsetHeight + 8;
      svg.style.height = Math.max(120, h - ch) + "px";
      /* Tap areas depend on the drawn size, so draw again once when the size changes. */
      const r = svg.getBoundingClientRect(), sc = r.width && r.height ? Math.min(r.width / VBW, r.height / VBH) : 0;
      if (sc && Math.abs(sc - (s.drawnAt || 0)) > 0.02) { s.drawnAt = sc; render(); }
    };
    /* --- her actions --- */
    function count(g) {
      const P = piles(), tot = groupTotal(g, P);
      if (!tot) return;
      let lit = s.lit[g] || 0;
      if (lit >= tot) { sfx(api, 500); return; }
      /* A tap lights one cube (in the big levels a whole unlit rod of ten). It is a mark, never a number:
         Marie counts the lit cubes herself. */
      let stepN = 1;
      if (big) {
        let before = 0;
        for (const p of [P.dish].concat(P.L, P.R).filter(pp => pp.g === g)) {
          if (lit < before + p.n) { const inPile = lit - before; if (inPile % 10 === 0 && p.n - inPile >= 10) stepN = 10; break; }
          before += p.n;
        }
      }
      s.lit[g] = lit + stepN; render(); sfx(api, 600 + Math.min(30, s.lit[g]) * 12); inst.changed();
    }
    const MAXCUP = big ? 60 : 20;
    /* In Kitty's lesson the warning keeps the lesson step after it, so the bubble and "Say it again" still hold the step. */
    function wrongSide(sd, what) { nope(svg); sfx(api, 220); try { api.say(`${what} on the ${SIDE_NAME[sd]} pan.` + (inst.lessonLine ? " " + inst.lessonLine : "")); } catch (e) {} }
    /* After Kitty asks her to type, the scale must not change (a tip there would make her count one off). */
    function lockedNope() { nope(ctlEl); sfx(api, 220); try { api.say("Keep the scale level." + (inst.lessonLine ? " " + inst.lessonLine : "")); } catch (e) {} }
    function placeBag(id) {
      if (s.placed[id]) return;
      s.placed[id] = true; sfx(api, 560); update([]);
    }
    function add(n) {
      if (!allPlaced()) return;
      if (s.locked) return lockedNope();
      if (s.cup + n > MAXCUP) { nope(ctlEl); sfx(api, 220); return; }
      s.cup += n; sfx(api, n === 10 ? 500 : 620); update([cupG]);
    }
    function sub1() { if (s.locked) return lockedNope(); if (!s.cup) { nope(ctlEl); sfx(api, 220); return; } s.cup--; sfx(api, 400); update([cupG]); }
    function take() { if (s.locked) return lockedNope(); if (!allPlaced() || s.moved >= d.c) { nope(ctlEl); sfx(api, 220); return; } s.moved++; sfx(api, 560); update(["dish"]); }
    function putBack() { if (s.locked) return lockedNope(); if (!s.moved) { nope(ctlEl); sfx(api, 220); return; } s.moved--; sfx(api, 400); update(["dish"]); }
    pointerKit(inst, {
      src: el2 => {
        const k = el2.dataset.src;
        if (k === "bag") { const b = BAGS.find(x => x.id === el2.dataset.bag); return b && !s.placed[b.id] ? { kind: "bag", bag: b, html: bagIcon(b, 64), size: 64 } : null; }
        if (k === "cube") return { kind: 1, html: `<span class="gp-cube" style="width:100%;height:100%"></span>`, size: 30 };
        if (k === "rod") return { kind: 10, html: `<span class="gp-rod">${"<i></i>".repeat(10)}</span>`, size: 46 };
        if (k === "lpile" && s.moved < d.c) return { kind: "take", html: `<span class="gp-cube" style="width:100%;height:100%;--c:${BCOL.pink}"></span>`, size: 30 };
        if (k === "basket" && s.moved > 0) return { kind: "back", html: `<span class="gp-cube" style="width:100%;height:100%;--c:${BCOL.pink}"></span>`, size: 30 };
        return null;
      },
      canDrop: (src, t) => (src.kind === "take" ? t.dataset.drop === "dish" : t.dataset.drop === "scale"),
      drop: (src, t, e) => {
        if (!t) return;
        if (src.kind === "take") { if (t.dataset.drop === "dish") take(); return; }
        if (t.dataset.drop !== "scale") return;
        const r = svg.getBoundingClientRect(), sd = e.clientX < r.left + r.width / 2 ? "L" : "R";
        if (src.kind === "bag") { if (src.bag.side === sd) placeBag(src.bag.id); else wrongSide(src.bag.side, "This bag goes"); return; }
        if (sd !== "L") { wrongSide("L", src.kind === "back" ? "It goes back" : "Your blocks go"); return; }
        if (src.kind === "back") putBack(); else add(src.kind);
      },
      tap: t => {
        const k = t.dataset.tap;
        if (k === "bag") placeBag(t.dataset.bag);
        else if (k === "pile") count(t.dataset.g);
        else if (k === "add1") add(1); else if (k === "add10") add(10); else if (k === "sub1") sub1();
        else if (k === "take") take(); else if (k === "putback") putBack();
      }
    });
    inst.lockTools = () => { s.locked = true; showLock(); };
    inst.reset = () => {
      stopMotion();
      Object.assign(s, { placed: {}, cup: 0, moved: 0, lit: {}, ang: 0, vel: 0, target: 0, settled: true, steady: false, crossings: 0, cheered: false, diff: 0, locked: false });
      render(); inst.changed();
    };
    inst.peek = () => {
      const st = status();
      return { L: st.L, R: st.R, even: st.even, level: st.level, ready: st.ready, placed: BAGS.filter(b => s.placed[b.id]).map(b => b.id), trays: BAGS.filter(b => !s.placed[b.id]).map(b => b.id),
        cup: s.cup, moved: s.moved, dish: st.P.dish.n, lit: Object.assign({}, s.lit), ang: s.ang, target: s.target, settled: s.settled, steady: s.steady, crossings: s.crossings,
        star: starOn(st), locked: !!s.locked, chips: svg.querySelectorAll(".gp-cnt").length + (q(".gp-dish .gp-badge") ? 1 : 0) };
    };
    render();
    return inst;
  }
  async function teachBalance(Q, el, api) {
    const inst = ensure(el, Q, api, mountBalance); inst.reset();
    api = lessonSay(inst, api);
    const d = Q.data, s = inst.s, P = () => inst.peek();
    for (const b of inst.bags) {
      api.say(`Put the ${b.n} bag on the ${SIDE_NAME[b.side]} pan. Tap it or drag it.`); light(api, inst.parts.bag(b.id));
      if (!(await inst.waitFor(() => s.placed[b.id]))) return;
    }
    if (d.mode === "eq") {
      api.say("Watch the scale. Does it stop level, or stay tipped?"); light(api, inst.parts.svg);
      if (!(await inst.waitFor(() => s.settled || s.steady))) return;
      light(api, null); api.say("Stops level means the same. Tipped means not the same.");
      return;
    }
    /* Make it level, then count. While she counts, the scale must stay level: if one more tap tips it again,
       Kitty goes back to "make it level" (the counting starts again), and asks her to type only when it is level.
       When Kitty asks her to type, plus, minus and take are locked, so the scale she counted cannot tip again. */
    const levelThenCount = async (makeLine, againLine, makePart, countLine, countPart, counted) => {
      let line = makeLine;
      for (;;) {
        api.say(line); light(api, makePart());
        if (!(await inst.waitFor(() => P().level))) return false;
        api.say(countLine); light(api, countPart());
        if (!(await inst.waitFor(() => !P().level || counted()))) return false;
        if (P().level) return true;
        line = againLine;
      }
    };
    if (d.mode === "add") {
      if (!(await levelThenCount(
        d.big ? "Now add blocks to the pink pan. Tens first, then ones. Stop when it stops level." : "Now add blocks to the pink pan, one at a time. Stop when it stops level.",
        "Oh, it tipped again. Use the plus or minus button until it stops level.", () => inst.parts.ctl,
        d.big ? "It is level! Now count your blocks. Tap a ten, say ten. Tap a block, say one more." : "It is level! Now count your blocks. Tap a block and say the number. Then the next block.",
        () => inst.parts.cup(), () => (s.lit.cup || 0) >= s.cup))) return;
      inst.lockTools(); light(api, null); api.say("How many blocks did you add? Type your number.");
      return;
    }
    if (d.mode === "take") {
      if (!(await levelThenCount(
        "Take blocks off the pink pan, one at a time. Tap the minus button. Stop when it stops level.",
        "Oh, it tipped again. Use the minus or plus button until it stops level.", () => inst.parts.take(),
        "It is level! Now count the blocks in Kuromi's basket. Tap the basket and say the number for each block.",
        () => inst.parts.dish(), () => (s.lit.dish || 0) >= s.moved))) return;
      inst.lockTools(); light(api, null); api.say("How many did you take away? Type your number.");
      return;
    }
    if (!(await levelThenCount(
      `Kuromi took ${d.b} away. They are in her basket. Add blocks to the pink pan until it stops level.`,
      "Oh, it tipped again. Use the plus or minus button until it stops level.", () => inst.parts.ctl,
      "It is level! Now count all the blocks. Tap Kuromi's basket first, then your blocks. Say the number for each one.",
      () => inst.parts.dish(), () => (s.lit.mine || 0) >= d.b + s.cup))) return;
    inst.lockTools(); light(api, null); api.say("How many were there at the start? Type your number.");
  }
  function hintBalance(Q, tries) {
    const d = Q.data;
    if (d.mode === "eq") return "Put every bag on the scale. Stops level means the same. Tipped means not the same.";
    if (d.mode === "add") return "Put the bags on. Add blocks to the pink pan until it stops level. Then count your blocks.";
    if (d.mode === "take") return "Put the bags on. Take blocks off the pink pan until it stops level. Then count Kuromi's basket.";
    return `Kuromi took ${d.b}. Add blocks until it stops level. Then count all the blocks, Kuromi's and yours.`;
  }

  /* =====================================================================
     5. NUMBER FAMILY - a triangle with the whole on top and the two parts below.
        One corner is "?". She finds it with dots: join and count, cross out and count,
        count rows, or make rows.
     ===================================================================== */
  function makeFamily(level, prev) {
    return fresh(() => {
      let a, b, w, form, show, say, ans, miss, op;
      if (level === 0) {
        do { a = rnd(1, 10); b = rnd(1, 10); } while (a === b || a + b > 20 || a + b < 4);
        w = a + b; op = "+"; form = pick(["whole", "sub", "sub", "part"]);
        if (form === "whole") { show = `${a} + ${b} = ?`; say = `${a} plus ${b} is what?`; ans = w; miss = "top"; }
        else if (form === "sub") { show = `${w} ${MINUS} ${a} = ?`; say = `${w} take away ${a} is what?`; ans = b; miss = "b"; }
        else { show = `${a} + ? = ${w}`; say = `${a} plus what makes ${w}?`; ans = b; miss = "b"; }
      } else {
        do { a = rnd(2, 10); b = rnd(2, 10); } while (a === b || a * b > 30);
        w = a * b; op = TIMES; form = pick(["whole", "div", "div", "part"]);
        if (form === "whole") { show = `${a} ${TIMES} ${b} = ?`; say = `${a} times ${b} is what?`; ans = w; miss = "top"; }
        else if (form === "div") { show = `${w} ${DIV} ${a} = ?`; say = `${w} dots in rows of ${a}. How many rows?`; ans = b; miss = "b"; }
        else { show = `? ${TIMES} ${a} = ${w}`; say = `How many rows of ${a} make ${w}?`; ans = b; miss = "b"; }
      }
      const known = { a, b, w };
      return { key: `ff${level}:${a},${b}:${form}`, say, show, answer: String(ans), input: { type: "number", unit: "" }, data: { a, b, w, op, form, miss, swap: Math.random() < 0.5 } };
    }, prev);
  }
  function triSvg(d) {
    const top = d.miss === "top" ? null : d.w, pa = d.a, pb = d.miss === "b" ? null : d.b;
    const left = d.swap ? pb : pa, right = d.swap ? pa : pb;
    const leftCol = d.swap ? "#e3d9ff" : "#ffd0e0", rightCol = d.swap ? "#ffd0e0" : "#e3d9ff";
    const corner = (x, y, v, fill) => v == null
      ? `<circle cx="${x}" cy="${y}" r="30" fill="#fff" stroke="#e0306b" stroke-width="3.5" stroke-dasharray="7 5"/><text x="${x}" y="${y + 11}" text-anchor="middle" font-family="Baloo 2,sans-serif" font-weight="800" font-size="32" fill="#e0306b">?</text>`
      : `<circle cx="${x}" cy="${y}" r="30" fill="${fill}" stroke="${INK}" stroke-width="3.5"/><text x="${x}" y="${y + 11}" text-anchor="middle" font-family="Baloo 2,sans-serif" font-weight="800" font-size="32" fill="${INK}">${v}</text>`;
    return `<svg class="gp-tri" viewBox="0 0 200 178" aria-label="Number family triangle">
      <path d="M100 36 L36 140 H164 Z" fill="#fff8ef" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
      <text x="100" y="124" text-anchor="middle" font-family="Baloo 2,sans-serif" font-weight="800" font-size="34" fill="${INK}">${d.op}</text>
      ${corner(100, 36, top, "#ffe9a8")}${corner(36, 140, left, leftCol)}${corner(164, 140, right, rightCol)}</svg>`;
  }
  /* mode: join (a + b = ?), take (w - a = ?, a + ? = w), rows (a x b = ?), make (w / a = ?, ? x a = w) */
  const famMode = d => (d.op === "+" ? (d.form === "whole" ? "join" : "take") : (d.form === "whole" ? "rows" : "make"));
  function mountFamily(el, Q, api) {
    const inst = base(el, "gp-ff", Q, api);
    const d = Q.data, mode = famMode(d);
    const s = (inst.s = { lit: 0, crossed: 0, rows: [], rowCount: [], counted: [] });
    inst.stage.innerHTML = `${triSvg(d)}<div class="gp-ffbar" data-tap="bar" role="button" tabindex="0" aria-label="Dots. Tap to count."></div>`;
    const tri = inst.stage.querySelector(".gp-tri"), bar = inst.stage.querySelector(".gp-ffbar");
    inst.parts = { tri, bar };
    const total = mode === "join" ? d.a + d.b : mode === "take" ? d.w : mode === "rows" ? d.a * d.b : d.w;
    /* Compact rows are too small to aim at, so they are not their own targets: a tap anywhere in the box counts the next row. */
    const rowTap = () => (bar.classList.contains("compact") ? "" : 'data-tap="row"');
    function dotsHTML() {
      if (mode === "join" || mode === "take") {
        let h = "";
        for (let i = 0; i < total; i++) {
          /* A tap lights a dot (a glow), never a number in it: Marie counts the lit dots herself. */
          let cls = "gp-dot", col = mode === "join" ? (i < d.a ? "#ff6f9f" : "#a98bff") : "#63d3b3";
          if (mode === "take") {
            const off = i >= total - s.crossed;
            if (off) cls += " off";
            else if (i < s.lit) cls += " lit";
          } else if (i < s.lit) cls += " lit";
          const c = i % 10, gc = c + 1 + (total > 5 && c >= 5 ? 1 : 0);
          h += `<span class="${cls}" style="--c:${col};grid-column:${gc}"></span>`;
        }
        const tpl = total > 5 ? `repeat(5, var(--ds)) calc(var(--ds) * .2) repeat(${Math.min(10, total) - 5}, var(--ds))` : `repeat(${total}, var(--ds))`;
        return `<div class="gp-dots" style="grid-template-columns:${tpl}">${h}</div>`;
      }
      if (mode === "rows") {
        return `<div class="gp-ffrows">${Array.from({ length: d.a }, (_, r) => `<div class="gp-ffrow${s.counted[r] ? " on" : ""}" ${rowTap()} data-row="${r}">${Array.from({ length: d.b }, (_, j) => `<span class="gp-dot${j === 5 ? " gp-d6" : ""}" style="--c:#74c8ff"></span>`).join("")}<span class="gp-rslot">${s.counted[r] ? `<span class="gp-badge gp-mark">${TICK}</span>` : ""}</span></div>`).join("")}</div>`;
      }
      const left = d.w - s.rows.length * d.a;
      return `<div class="gp-pool">${Array.from({ length: left }, () => `<span class="gp-dot" style="--c:#63d3b3"></span>`).join("")}</div>
        <div class="gp-ffrows">${s.rows.map((_, r) => `<div class="gp-ffrow on" ${rowTap()} data-row="${r}">${Array.from({ length: d.a }, (_, j) => `<span class="gp-dot${j === 5 ? " gp-d6" : ""}" style="--c:#ff6f9f"></span>`).join("")}<span class="gp-rslot">${s.counted.includes(r) ? `<span class="gp-badge gp-mark">${TICK}</span>` : ""}</span></div>`).join("")}</div>`;
    }
    function render() { bar.innerHTML = dotsHTML(); }
    inst.layout = () => {
      const { w, h } = box(inst), wide = w > h * 1.25;
      inst.stage.classList.toggle("wide", wide);
      /* Dot size: the biggest that fits the worst case of this question.
         Many short rows (like 10 rows of 3) may go side by side in up to 4 columns, read left to right;
         one column is easiest to read, so it is kept while dots stay 22px or more.
         Compact rows (smaller count badge) are a last resort; the whole dot box is the tap target, so small rows are still easy to tap. */
      const tries = [];
      for (let cols = 1; cols <= 4; cols++) for (let sz = 54; sz >= 22; sz--) tries.push([cols, sz, false]);
      for (let sz = 30; sz >= 10; sz--) for (const cpt of sz >= 22 ? [true] : [false, true]) for (let cols = 1; cols <= 4; cols++) tries.push([cols, sz, cpt]);
      function fit(bw, bh) {
        let closest = null;
        for (const [cols, sz, cpt] of tries) {
          const g = Math.max(3, Math.round(sz * 0.14));
          let need;
          if (mode === "join" || mode === "take") { if (cols > 1 || cpt) continue; const c = Math.min(10, total), r = Math.ceil(total / 10); need = [c * sz + c * g + (c > 5 ? sz * 0.2 : 0), r * sz + (r - 1) * g]; }
          else {
            const per = mode === "rows" ? d.b : d.a, R = mode === "rows" ? d.a : d.w / d.a, rpc = Math.ceil(R / cols);
            const rowW = per * sz + per * g + (per > 5 ? sz * 0.35 : 0) + (cpt ? 14 + 28 : 22 + 46), gridW = cols * rowW + (cols - 1) * 10, rowsH = rpc * (cpt ? Math.max(sz, 24) + 6 : Math.max(sz, 34) + 14) + (rpc - 1) * g;
            if (mode === "rows") need = [gridW, rowsH];
            else { const poolCols = Math.max(1, Math.floor((bw + g) / (sz + g))), poolH = Math.ceil(d.w / poolCols) * (sz + g); need = [Math.max(gridW, sz), Math.max(poolH, rowsH + 8 + (sz + g))]; }
          }
          if (need[0] <= bw && need[1] <= bh) return { ds: sz, nc: cols, compact: cpt };
          const over = Math.max(need[0] / bw, need[1] / bh);
          if (!closest || over < closest.over) closest = { over, ds: sz, nc: cols, compact: cpt };
        }
        return closest; /* nothing fits: the choice that spills least */
      }
      /* In a tall box the triangle may shrink (36% down to 24% of the height) when that gives clearly bigger dots. */
      let best = null;
      for (const frac of wide ? [0] : [0.36, 0.32, 0.28, 0.24]) {
        let tw, th;
        if (wide) { tw = Math.min(w * 0.4, (h - 4) * 200 / 178, 300); th = tw * 178 / 200; }
        else { th = Math.max(80, Math.min(h * frac, 200, (w - 20) * 178 / 200)); tw = th * 200 / 178; }
        const f = fit((wide ? w - tw - 8 : w) - 22, (wide ? h : h - th - 8) - 22);
        if (!best || f.ds >= best.f.ds + 3 || (f.ds > best.f.ds && f.ds < 22)) best = { tw, th, f };
      }
      const { tw, th } = best, { ds, nc, compact } = best.f;
      tri.style.width = Math.floor(tw) + "px"; tri.style.height = Math.floor(th) + "px"; tri.style.alignSelf = "center";
      bar.style.setProperty("--ds", ds + "px"); bar.style.setProperty("--dg", Math.max(3, Math.round(ds * 0.14)) + "px"); bar.style.setProperty("--nc", nc);
      if (bar.classList.contains("compact") !== compact) { bar.classList.toggle("compact", compact); render(); }
    };
    /* Taps make a sound that rises a little each time, never a spoken number. */
    function say1(n) { sfx(api, 600 + Math.min(30, n) * 14); }
    pointerKit(inst, {
      src: () => null, drop: () => {},
      tap: t => {
        if (mode === "join") { if (s.lit < total) { s.lit++; render(); say1(s.lit); inst.changed(); } return; }
        if (mode === "take") {
          if (s.crossed < d.a) { s.crossed++; render(); sfx(api, 380); inst.changed(); return; }
          if (s.lit < total - s.crossed) { s.lit++; render(); say1(s.lit); inst.changed(); }
          return;
        }
        if (mode === "rows") {
          const row = t.closest("[data-row]"); let r = row ? +row.dataset.row : -1;
          if (r < 0) for (let i = 0; i < d.a; i++) if (!s.counted[i]) { r = i; break; } /* a tap on the box counts the next row */
          if (r < 0 || s.counted[r]) return;
          s.counted[r] = true; const n = s.counted.filter(Boolean).length; render(); say1(n); inst.changed(); return;
        }
        const left = d.w - s.rows.length * d.a;
        if (left >= d.a) { s.rows.push(1); render(); sfx(api, 560 + s.rows.length * 40); inst.changed(); return; }
        const row = t.closest("[data-row]"); const r = row ? +row.dataset.row : s.rows.findIndex((_, i) => !s.counted.includes(i));
        if (r < 0 || s.counted.includes(r)) return;
        s.counted.push(r); render(); say1(s.counted.length); inst.changed();
      }
    });
    inst.reset = () => { s.lit = 0; s.crossed = 0; s.rows = []; s.counted = []; render(); inst.layout(); inst.changed(); };
    inst.peek = () => ({ mode, lit: s.lit, crossed: s.crossed, rows: s.rows.length, counted: s.counted.slice(), total });
    render(); inst.layout();
    return inst;
  }
  async function teachFamily(Q, el, api) {
    const inst = ensure(el, Q, api, mountFamily); inst.reset();
    const d = Q.data, s = inst.s, mode = famMode(d), bar = inst.parts.bar;
    api.say(d.op === "+" ? "The top number is the whole. The two bottom numbers are the parts." : "The top number is the whole. The bottom numbers make it together."); light(api, inst.parts.tri);
    await wait(2400);
    if (mode === "join") {
      api.say("Count the pink dots, then keep counting the purple ones. Tap a dot and say the number. Then the next dot."); light(api, bar);
      if (!(await inst.waitFor(() => s.lit >= d.a + d.b))) return;
      light(api, null); api.say("How many in all? Type your number."); return;
    }
    if (mode === "take") {
      api.say(`Start with ${d.w}. Take away ${d.a}. Tap ${d.a} times to cross them out.`); light(api, bar);
      if (!(await inst.waitFor(() => s.crossed >= d.a))) return;
      api.say("Now count the dots that are left. Tap a dot and say the number. Then the next dot."); light(api, bar);
      if (!(await inst.waitFor(() => s.lit >= d.w - d.a))) return;
      light(api, null); api.say("How many are left? Type your number."); return;
    }
    if (mode === "rows") {
      api.say(`${d.a} rows of ${d.b}. Count by ${d.b}s. Tap a row and say the number. Then the next row.`); light(api, bar);
      if (!(await inst.waitFor(() => s.counted.filter(Boolean).length >= d.a))) return;
      light(api, null); api.say("How many dots in all? Type your number."); return;
    }
    api.say(`Make rows of ${d.a}. Tap to make a row. Keep going.`); light(api, bar);
    if (!(await inst.waitFor(() => d.w - s.rows.length * d.a < d.a))) return;
    api.say("Now count the rows. Tap a row and say the number. Then the next row."); light(api, bar);
    if (!(await inst.waitFor(() => s.counted.length >= s.rows.length))) return;
    light(api, null); api.say("How many rows? Type your number.");
  }
  function hintFamily(Q, tries) {
    const d = Q.data, mode = famMode(d);
    if (mode === "join") return "Tap the dots. Count them all.";
    if (mode === "take") return `Cross out ${d.a} dots. Count the rest.`;
    if (mode === "rows") return `Tap each row. Count by ${d.b}s.`;
    return `Make rows of ${d.a}. Count the rows.`;
  }

  /* =====================================================================
     ICONS (64 x 64, chunky)
     ===================================================================== */
  const SW = `stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"`;
  const ICONS = {
    equal_groups: `<svg viewBox="0 0 64 64" aria-hidden="true"><ellipse cx="18" cy="44" rx="15" ry="11" fill="#fff" ${SW}/><ellipse cx="46" cy="44" rx="15" ry="11" fill="#fff" ${SW}/>
      <circle cx="13" cy="41" r="5" fill="#ff6f9f" ${SW}/><circle cx="23" cy="41" r="5" fill="#ff6f9f" ${SW}/><circle cx="41" cy="41" r="5" fill="#ff6f9f" ${SW}/><circle cx="51" cy="41" r="5" fill="#ff6f9f" ${SW}/>
      <rect x="20" y="6" width="24" height="18" rx="9" fill="#ffc94a" ${SW}/><path d="M26 15 H38 M32 9.5 V20.5" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"/></svg>`, /* a plus sign, no digits: the title bar is on screen for the whole question */
    arrays: `<svg viewBox="0 0 64 64" aria-hidden="true"><rect x="5" y="7" width="54" height="50" rx="12" fill="#c9f2df" ${SW}/>
      ${[0, 1, 2].map(r => [0, 1, 2].map(c => `<circle cx="${18 + c * 14}" cy="${20 + r * 13}" r="5.2" fill="${r === 0 ? "#ffc94a" : "#ff6f9f"}" stroke="${INK}" stroke-width="2.6"/>`).join("")).join("")}</svg>`,
    share_equally: `<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="17" cy="40" r="13" fill="#ffe3ea" ${SW}/><circle cx="47" cy="40" r="13" fill="#e0f3ff" ${SW}/>
      <circle cx="13" cy="38" r="2" fill="${INK}"/><circle cx="21" cy="38" r="2" fill="${INK}"/><circle cx="43" cy="38" r="2" fill="${INK}"/><circle cx="51" cy="38" r="2" fill="${INK}"/>
      <circle cx="24" cy="13" r="6" fill="#c98a52" ${SW}/><circle cx="40" cy="13" r="6" fill="#c98a52" ${SW}/><path d="M24 21 L19 26 M40 21 L45 26" stroke="${INK}" stroke-width="3" stroke-linecap="round"/></svg>`,
    balance: `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M26 58 L30 22 H34 L38 58 Z" fill="#ff8fb4" ${SW}/><rect x="6" y="18" width="52" height="7" rx="3.5" fill="#f0bf87" ${SW}/>
      <path d="M3 14 H25 Q24 20 19 20 H9 Q4 20 3 14 Z" fill="#ffd0e0" ${SW}/><path d="M39 14 H61 Q60 20 55 20 H45 Q40 20 39 14 Z" fill="#c9f2e4" ${SW}/>
      <rect x="8" y="5" width="8" height="8" rx="2" fill="#ff6f9f" stroke="${INK}" stroke-width="2.6"/><rect x="45" y="5" width="8" height="8" rx="2" fill="#63d3b3" stroke="${INK}" stroke-width="2.6"/><circle cx="32" cy="22" r="4" fill="#ffc94a" stroke="${INK}" stroke-width="2.6"/></svg>`,
    fact_family: `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M32 12 L10 50 H54 Z" fill="#fff8ef" ${SW}/>
      <circle cx="32" cy="13" r="10" fill="#ffe9a8" ${SW}/><circle cx="12" cy="49" r="10" fill="#ffd0e0" ${SW}/><circle cx="52" cy="49" r="10" fill="#e3d9ff" ${SW}/>
      <circle cx="32" cy="13" r="3.4" fill="${INK}"/><circle cx="12" cy="49" r="3.4" fill="${INK}"/><circle cx="52" cy="49" r="3.4" fill="${INK}"/></svg>` /* no digits: a family like 7, 3, 4 in the title bar gave away answers such as 4 + ? = 7 */
  };

  TOPICS.push({
    id: "equal_groups", title: "Equal groups", icon: ICONS.equal_groups, strand: "Operations",
    levels: [
      { name: "Groups of 2, 5 and 10", grade: 3, note: "BC Grade 3: multiplication as equal groups and skip-counting. 2, 5 or 10 on each plate, 2 to 5 plates." },
      { name: "Groups of 3 and 4", grade: 3, note: "BC Grade 3: equal groups of 3 or 4, answers up to 28. Range is our choice; BC sets no limit." },
      { name: "Adding the same number", grade: 3, note: "BC Grade 3: repeated addition (4 + 4 + 4) and the times sign (3 × 4) as equal groups, answers up to 50." }
    ],
    make: makeEqual, mount: mountEqual, hint: hintEqual, teach: teachEqual
  });

  TOPICS.push({
    id: "arrays", title: "Rows", icon: ICONS.arrays, strand: "Operations",
    levels: [
      { name: "Rows up to 5 by 5", grade: 3, note: "BC Grade 3: arrays as a model of multiplication; count by rows. 2 to 5 rows of 2 to 5." },
      { name: "Rows up to 5 by 10", grade: 3, note: "BC Grade 3: arrays, 2 to 5 rows of 6 to 10. Range is our choice; BC sets no limit." }
    ],
    make: makeArrays, mount: mountArrays, hint: hintArrays, teach: teachArrays
  });
  TOPICS.push({
    id: "share_equally", title: "Share fairly", icon: ICONS.share_equally, strand: "Operations",
    levels: [
      { name: "Share with friends", grade: 3, note: "BC Grade 3: division as sharing. 6 to 30 treats shared among 2 to 5 friends, always fair, nothing left over." },
      { name: "Fill the bags", grade: 3, note: "BC Grade 3: division as grouping. Up to 30 treats, 2 to 5 in each bag, 2 to 6 bags." }
    ],
    make: makeShare, mount: mountShare, hint: hintShare, teach: teachShare
  });
  TOPICS.push({
    id: "balance", title: "Balance it", icon: ICONS.balance, strand: "Operations",
    levels: [
      { name: "Same or not?", grade: 1, note: "BC Grade 1: meaning of equality and inequality (= and ≠). Both pans start empty. She puts the bags on (6 and 7 on the pink pan, 13 on the green pan), watches the beam stop level or keep rocking, then answers." },
      { name: "Missing part", grade: 2, note: "BC Grades 1-2: change unknown, 7 + ? = 10. She puts the bags on, adds blocks one at a time until it is level, then counts her blocks. First 5 questions up to 10, then up to 20." },
      { name: "Missing start", grade: 3, note: "BC Grade 3: start unknown, ? + 15 = 20, up to 50. Same as level 2, with tens rods and single blocks." },
      { name: "Take away", grade: 3, note: "BC Grade 3: subtraction unknowns up to 20. 20 − ? = 12: she puts the bags on, then takes blocks off the pink pan into Kuromi's basket until it is level, then counts the basket. ? − 5 = 9: the 5 taken away are in Kuromi's basket; she adds blocks until it is level, then counts everything." }
    ],
    make: makeBalance, mount: mountBalance, hint: hintBalance, teach: teachBalance
  });
  TOPICS.push({
    id: "fact_family", title: "Number family", icon: ICONS.fact_family, strand: "Operations",
    levels: [
      { name: "Adding families", grade: 2, note: "BC Grades 1-2: addition and subtraction are related. Families up to 20, like 3, 4 and 7." },
      { name: "Times families", grade: 3, note: "BC Grade 3: multiplication and division are related. Families up to 30, like 3, 4 and 12." }
    ],
    make: makeFamily, mount: mountFamily, hint: hintFamily, teach: teachFamily
  });

  /* exposed for the test page only */
  window.__groupsInternals = { ITEMS, counters };
})();
