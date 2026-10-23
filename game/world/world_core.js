/* Play world frame, shared by both worlds. It opens after every PLAY_EVERY answers for a few minutes.
 *
 *   PlayWorlds.register(theme, { open(stage, wctx) })       a world registers itself ("cafe" or "castle")
 *   PlayWorlds.open(host, { theme, minutes, fast, speak,       the game opens it; resolves when time is up
 *                           getCoins, spendCoins, save, data })
 *
 * The world's open(stage, wctx) builds its scene inside `stage` (a full-size element). wctx gives:
 *   wctx.coins()            coins the child has now
 *   wctx.spend(n)           true and coins taken if there are enough, else false (the world shows a soft "not yet")
 *   wctx.data               the world's own saved object (rooms, items, pets, buddies...). Change it, then call wctx.save()
 *   wctx.save()             writes the child's save
 *   wctx.speak(text)        says a line (voice clips or browser voice); safe to call often
 *   wctx.fast               true in tests (move fast, skip waits)
 *   wctx.onEnd(fn)          fn runs when time is up, before the world is removed (stop loops, save)
 *   wctx.coinsChanged()     redraws the coin pill in the frame
 *   wctx.earn(n)            adds n bonus coins (1..10) through the game's own coin store, redraws the pill and saves;
 *                           true when the coins really went up (it uses o.earnCoins(n) when given, else spendCoins(-n))
 * A world may return an object with close() for cleanup.
 *
 * The frame draws: a coin pill, a soft shrinking time ring (no numbers, no ticking), a gentle 1-minute cue
 * (the ring turns warm and one spoken line), a second gentle cue 30 seconds before the end (the room warms a little),
 * a soft ending (the room fades before the card comes) and a calm card "Play time is over. Back to the quest!"
 * with one big button. The clock only runs while the page is visible, so a locked screen does not use up play time.
 * An "I am done" picture button ends play early, after a two-picture question (tick = yes, cross = keep playing),
 * so one stray tap cannot end it. Holding the ring no longer ends play (a child could do that by accident).
 * The keepsakes she made in the reward games (o.keepsakes: [{ src, label }]) stand on a small shelf in the corner.
 * PlayWorlds.info(theme, data, coins) -> what the rest of the game may know about the world (journey.js):
 *   { title, wall, friend, friendName, items: [urls], want: { name, price, img } | null, canBuy } - read only.
 * Tests: window.__worldMinutes overrides minutes; fast makes 1 minute = 1 second.
 */
(function () {
  "use strict";
  var worlds = {};
  var CSS = [
    ".pw-host{position:fixed;inset:0;z-index:60;background:#f6efe6;display:flex;flex-direction:column;overflow:hidden}",
    ".pw-stage{position:relative;flex:1;min-height:0;overflow:hidden}",
    ".pw-bar{position:absolute;top:max(8px,env(safe-area-inset-top));right:10px;z-index:5;display:flex;gap:10px;align-items:center;pointer-events:none}",
    ".pw-coins{pointer-events:none;display:flex;align-items:center;gap:6px;background:#fff8e6;border:3px solid #3b2a33;border-radius:999px;padding:4px 14px 4px 6px;font:700 22px/1 system-ui,sans-serif;color:#3b2a33;box-shadow:0 3px 0 rgba(59,42,51,.25)}",
    ".pw-coins i{width:28px;height:28px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff3b0,#f2c14e 55%,#c9902a);border:2px solid #3b2a33;display:block}",
    ".pw-coins.pop{animation:pwpop .4s ease}",
    "@keyframes pwpop{40%{transform:scale(1.18)}}",
    ".pw-ring{pointer-events:auto;width:52px;height:52px;touch-action:none}",
    ".pw-host{animation:pwin .2s ease-out}",
    "@keyframes pwin{from{opacity:0}to{opacity:1}}",
    ".pw-stage{transition:opacity .25s ease-out}",
    ".pw-host.soft .pw-stage{opacity:.55}",
    ".pw-host.dusk::after{content:'';position:absolute;inset:0;z-index:4;pointer-events:none;background:rgba(242,166,90,.10)}",
    ".pw-done{pointer-events:auto;display:flex;align-items:center;gap:8px;min-width:56px;height:56px;padding:0 16px;border-radius:999px;border:3px solid #3b2a33;background:#fff8e6;color:#3b2a33;font:700 18px/1 system-ui,sans-serif;cursor:pointer;box-shadow:0 3px 0 rgba(59,42,51,.25)}",
    ".pw-done svg{width:30px;height:30px;flex:none}",
    ".pw-host[data-kid] .pw-done{width:64px;height:64px;padding:0;justify-content:center}",
    ".pw-ask{position:absolute;inset:0;z-index:10;display:flex;align-items:center;justify-content:center;background:rgba(246,239,230,.88);animation:pwin .2s ease-out}",
    ".pw-ask .pw-card{font-size:24px}",
    ".pw-pair{display:flex;justify-content:center;gap:28px;margin-top:18px}",
    ".pw-ask .pw-pair button{margin:0;min-width:0;width:96px;height:96px;min-height:96px;border-radius:50%;display:grid;place-items:center;padding:0;font-size:0}",
    ".pw-ask .pw-pair button svg{width:54px;height:54px}",
    ".pw-ask .pw-pair .yes{background:#8fcfb8}.pw-ask .pw-pair .no{background:#f6d9a8}",
    ".pw-shelf{position:absolute;left:10px;top:calc(max(8px,env(safe-area-inset-top)) + 72px);z-index:4;display:flex;gap:6px;pointer-events:none;padding:5px 8px;border-radius:16px;background:rgba(255,248,230,.78);border:2px solid rgba(59,42,51,.35)}",
    ".pw-shelf span{width:38px;height:38px;border-radius:50%;background:#fff;border:2px solid rgba(59,42,51,.35);display:grid;place-items:center;overflow:hidden}",
    ".pw-shelf img{width:30px;height:30px;object-fit:contain}",
    "@media (max-width:520px){.pw-done span{display:none}.pw-host:not([data-kid]) .pw-done{width:56px;padding:0;justify-content:center}}",
    ".pw-ring circle{fill:none;stroke-width:7}",
    ".pw-ring .bg{stroke:rgba(59,42,51,.15)}",
    ".pw-ring .fg{stroke:#8fcfb8;stroke-linecap:round;transition:stroke 1s}",
    ".pw-host.late .pw-ring .fg{stroke:#f2a65a}",
    ".pw-end{animation:pwin .25s ease-out;position:absolute;inset:0;z-index:9;display:flex;align-items:center;justify-content:center;background:rgba(246,239,230,.86)}",
    ".pw-card{background:#fff;border:3px solid #3b2a33;border-radius:28px;padding:28px 30px;max-width:min(90vw,460px);text-align:center;font:700 26px/1.3 system-ui,sans-serif;color:#3b2a33;box-shadow:0 8px 0 rgba(59,42,51,.18)}",
    ".pw-card button{margin-top:20px;min-width:220px;min-height:72px;border-radius:22px;border:3px solid #3b2a33;background:#8fcfb8;font:inherit;font-size:24px;cursor:pointer}",
    "@media (prefers-reduced-motion: reduce){.pw-coins.pop,.pw-host,.pw-ask,.pw-end{animation:none}.pw-stage{transition:none}}"
  ].join("\n");

  var TICK = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 12.8l5 5L19.5 6.5"/></svg>';
  var CROSS = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  function reduced() { try { return !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches); } catch (e) { return false; } }

  function injectCss() {
    if (document.getElementById("pw-css")) { return; }
    var s = document.createElement("style"); s.id = "pw-css"; s.textContent = CSS; document.head.appendChild(s);
  }

  function open(parent, o) {
    injectCss();
    var w = worlds[o.theme];
    if (!w) { return Promise.reject(new Error("no play world for " + o.theme)); }
    var minutes = window.__worldMinutes || o.minutes || 5;
    var totalMs = minutes * (o.fast ? 1000 : 60000);
    var host = document.createElement("div");
    host.className = "pw-host"; host.dataset.theme = o.theme;
    host.innerHTML = '<div class="pw-stage"></div><div class="pw-bar"><div class="pw-coins"><i></i><b></b></div>' +
      '<svg class="pw-ring" viewBox="0 0 52 52" aria-label="Play time left"><circle class="bg" cx="26" cy="26" r="21"/>' +
      '<circle class="fg" cx="26" cy="26" r="21" transform="rotate(-90 26 26)"/></svg>' +
      '<button type="button" class="pw-done" aria-label="I am done playing">' + TICK + (o.kid ? "" : "<span>I am done</span>") + '</button></div>';
    if (o.kid) { host.dataset.kid = "1"; }
    var keeps = Array.isArray(o.keepsakes) ? o.keepsakes.filter(function (k) { return k && typeof k.src === "string"; }).slice(window.matchMedia && matchMedia("(max-width:520px)").matches ? -3 : -6) : [];
    if (keeps.length) {
      var shelf = document.createElement("div"); shelf.className = "pw-shelf"; shelf.setAttribute("aria-label", "Things you made");
      keeps.forEach(function (k) { var sp = document.createElement("span"); var im = document.createElement("img"); im.alt = k.label || ""; im.src = k.src; sp.appendChild(im); shelf.appendChild(sp); });
      host.appendChild(shelf);
    }
    parent.appendChild(host);
    var stage = host.querySelector(".pw-stage"), coinsEl = host.querySelector(".pw-coins"), fg = host.querySelector(".pw-ring .fg");
    var C = 2 * Math.PI * 21; fg.style.strokeDasharray = C;
    var enders = [], handle = null, done = false, timer = null, cued = false, cued30 = false, elapsed = 0, lastTick = Date.now(), asking = false;

    function drawCoins(pop) {
      coinsEl.querySelector("b").textContent = o.getCoins();
      if (pop) { coinsEl.classList.remove("pop"); void coinsEl.offsetWidth; coinsEl.classList.add("pop"); }
    }
    var wctx = {
      fast: !!o.fast,
      data: o.data,
      coins: function () { return o.getCoins(); },
      spend: function (n) { var ok = o.spendCoins(n); if (ok) { drawCoins(true); o.save(); } return ok; },
      save: function () { o.save(); },
      speak: function (t) { try { if (o.speak) { o.speak(t); } } catch (e) {} },
      onEnd: function (fn) { enders.push(fn); },
      coinsChanged: function () { drawCoins(true); },
      earn: function (n) {
        n = Math.max(0, Math.min(10, Math.round(Number(n) || 0)));
        if (!n || done) { return false; }
        var before = o.getCoins();
        try { if (o.earnCoins) { o.earnCoins(n); } else { o.spendCoins(-n); } } catch (e) { console.error(e); }
        var ok = o.getCoins() === before + n;
        if (!ok) { console.error("wctx.earn: coins did not go up by " + n); }
        drawCoins(true); o.save();
        return ok;
      }
    };
    drawCoins(false);

    return new Promise(function (resolve) {
      function finish() {
        if (done) { return; }
        done = true; clearInterval(timer);
        document.removeEventListener("visibilitychange", onVisible);
        var q = host.querySelector(".pw-ask"); if (q) { q.remove(); }
        enders.forEach(function (fn) { try { fn(); } catch (e) {} });
        try { if (handle && handle.close) { handle.close(); } } catch (e) {}
        o.save();
        host.classList.add("soft");   // the room dims softly; the card fades in over it
        var end = document.createElement("div"); end.className = "pw-end";
        end.innerHTML = '<div class="pw-card">Play time is over.<br>Back to the quest!<br><button type="button">OK</button></div>';
        host.appendChild(end);
        wctx.speak("Play time is over. Back to the quest!");
        end.querySelector("button").addEventListener("click", function () { host.remove(); resolve(); });
        if (o.fast) { setTimeout(function () { if (host.isConnected) { host.remove(); resolve(); } }, 50); }
      }
      /* the clock only counts time the page is visible: a locked or hidden screen does not use up play time, and one very long gap
         (a sleeping device) can never take away more than a moment */
      function tick() {
        var now = Date.now(), dt = now - lastTick; lastTick = now;
        if (!document.hidden && !asking) { elapsed += Math.max(0, Math.min(dt, o.fast ? 400 : 1500)); }
        var left = Math.max(0, totalMs - elapsed);
        host.dataset.left = String(Math.round(left));
        fg.style.strokeDashoffset = C * (1 - left / totalMs);
        var minute = totalMs / minutes;
        if (!cued && left <= minute && minutes > 1) { cued = true; host.classList.add("late"); wctx.speak("One more minute to play."); }
        if (!cued30 && minutes > 1 && left <= minute / 2) { cued30 = true; host.classList.add("dusk"); wctx.speak("Thirty seconds left to play."); }
        if (left <= 0) { finish(); }
      }
      function onVisible() { lastTick = Date.now(); }
      document.addEventListener("visibilitychange", onVisible);
      timer = setInterval(tick, o.fast ? 50 : 500);
      /* "I am done": a picture button; a question with two pictures comes first (tick = yes, cross = keep playing) */
      host.querySelector(".pw-done").addEventListener("click", function () {
        if (done || asking) { return; }
        asking = true;
        var q = document.createElement("div"); q.className = "pw-ask"; q.setAttribute("role", "dialog"); q.setAttribute("aria-modal", "true");
        q.innerHTML = '<div class="pw-card" tabindex="-1"><span class="pw-q">All done playing?</span><div class="pw-pair"><button type="button" class="yes" data-v="yes" aria-label="Yes, I am done">' + TICK +
          '</button><button type="button" class="no" data-v="no" aria-label="No, keep playing">' + CROSS + '</button></div></div>';
        host.appendChild(q);
        wctx.speak("All done playing? Tap the tick to stop, or the cross to keep playing.");
        q.addEventListener("click", function (e) {
          var b = e.target.closest && e.target.closest("button"); if (!b) { return; }
          q.remove(); asking = false; lastTick = Date.now();
          if (b.dataset.v === "yes") { finish(); }
        });
        q.querySelector(".yes").focus();
      });
      // the old hidden way to end play (hold the ring for 1.5 s) is gone: a child could do it by accident. "I am done" above is the one way.
      try { handle = w.open(stage, wctx) || null; } catch (e) { console.error(e); finish(); }
      PlayWorlds._finish = finish;   // tests can end play time at once
    });
  }

  window.PlayWorlds = { register: function (theme, w) { worlds[theme] = w; }, open: open, has: function (t) { return !!worlds[t]; },
    info: function (theme, data, coins) { var w = worlds[theme]; try { return w && w.info ? w.info(data || {}, Number(coins) || 0) : null; } catch (e) { console.error(e); return null; } } };
})();
