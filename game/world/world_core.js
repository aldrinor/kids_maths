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
 * (the ring turns warm and one spoken line), and at the end a calm card "Play time is over. Back to the quest!"
 * with one big button. The child cannot leave early by mistake; a parent can end it with a long press on the ring.
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
    ".pw-ring circle{fill:none;stroke-width:7}",
    ".pw-ring .bg{stroke:rgba(59,42,51,.15)}",
    ".pw-ring .fg{stroke:#8fcfb8;stroke-linecap:round;transition:stroke 1s}",
    ".pw-host.late .pw-ring .fg{stroke:#f2a65a}",
    ".pw-end{position:absolute;inset:0;z-index:9;display:flex;align-items:center;justify-content:center;background:rgba(246,239,230,.86)}",
    ".pw-card{background:#fff;border:3px solid #3b2a33;border-radius:28px;padding:28px 30px;max-width:min(90vw,460px);text-align:center;font:700 26px/1.3 system-ui,sans-serif;color:#3b2a33;box-shadow:0 8px 0 rgba(59,42,51,.18)}",
    ".pw-card button{margin-top:20px;min-width:220px;min-height:72px;border-radius:22px;border:3px solid #3b2a33;background:#8fcfb8;font:inherit;font-size:24px;cursor:pointer}",
    "@media (prefers-reduced-motion: reduce){.pw-coins.pop{animation:none}}"
  ].join("\n");

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
      '<circle class="fg" cx="26" cy="26" r="21" transform="rotate(-90 26 26)"/></svg></div>';
    parent.appendChild(host);
    var stage = host.querySelector(".pw-stage"), coinsEl = host.querySelector(".pw-coins"), fg = host.querySelector(".pw-ring .fg");
    var C = 2 * Math.PI * 21; fg.style.strokeDasharray = C;
    var enders = [], handle = null, done = false, timer = null, start = Date.now(), cued = false;

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
        enders.forEach(function (fn) { try { fn(); } catch (e) {} });
        try { if (handle && handle.close) { handle.close(); } } catch (e) {}
        o.save();
        var end = document.createElement("div"); end.className = "pw-end";
        end.innerHTML = '<div class="pw-card">Play time is over.<br>Back to the quest!<br><button type="button">OK</button></div>';
        host.appendChild(end);
        wctx.speak("Play time is over. Back to the quest!");
        end.querySelector("button").addEventListener("click", function () { host.remove(); resolve(); });
        if (o.fast) { setTimeout(function () { if (host.isConnected) { host.remove(); resolve(); } }, 50); }
      }
      timer = setInterval(function () {
        var left = Math.max(0, totalMs - (Date.now() - start));
        fg.style.strokeDashoffset = C * (1 - left / totalMs);
        if (!cued && left <= totalMs / minutes && minutes > 1) { cued = true; host.classList.add("late"); wctx.speak("One more minute to play."); }
        if (left <= 0) { finish(); }
      }, o.fast ? 50 : 500);
      // a parent can end play time early: long press on the ring
      var ring = host.querySelector(".pw-ring"), press = null;
      ring.addEventListener("pointerdown", function () { press = setTimeout(finish, 1500); });
      ["pointerup", "pointerleave", "pointercancel"].forEach(function (ev) { ring.addEventListener(ev, function () { clearTimeout(press); }); });
      try { handle = w.open(stage, wctx) || null; } catch (e) { console.error(e); finish(); }
      PlayWorlds._finish = finish;   // tests can end play time at once
    });
  }

  window.PlayWorlds = { register: function (theme, w) { worlds[theme] = w; }, open: open, has: function (t) { return !!worlds[t]; } };
})();
