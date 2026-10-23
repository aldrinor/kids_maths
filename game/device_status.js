/* DeviceStatus: the plain "Saved on this device" lines for the For grown-ups card (plan item 22, review item 24).
 *   DeviceStatus.collect(env) -> Promise of facts   (env = { navigator, caches, store, saveBlocked, standalone } so tests can give fakes)
 *   DeviceStatus.lines(facts) -> [ { text, ok } ]   plain sentences, in reading order. ok:false lines are warnings.
 * Facts: saved (the last write worked), persistent (the browser promised to keep the data), offline (the saved copy of the game is ready),
 * homeScreen (opened from the home screen), usage and quota in bytes when the browser says.
 * A home-screen game on iPad and iPhone keeps its OWN storage, apart from Safari: the first time, save a progress file in Safari and
 * load it in the home-screen game. The card says so in one line.
 */
(function (root) {
  "use strict";
  const mb = n => (n / 1048576 >= 10 ? Math.round(n / 1048576) : Math.round(n / 104857.6) / 10);

  async function collect(env) {
    const nav = env.navigator || {}, f = { saved: !env.saveBlocked, persistent: null, offline: false, homeScreen: !!env.standalone, usage: null, quota: null, worker: false };
    try { if (nav.storage && nav.storage.persisted) f.persistent = await nav.storage.persisted(); } catch (e) {}
    try { if (nav.storage && nav.storage.estimate) { const e = await nav.storage.estimate(); f.usage = e.usage; f.quota = e.quota; } } catch (e) {}
    try {
      f.worker = !!(nav.serviceWorker && nav.serviceWorker.controller);
      if (env.caches) { for (const k of await env.caches.keys()) if (k.startsWith("km-shell-") && await (await env.caches.open(k)).match("__km_ready", { ignoreSearch: true })) f.offline = true; }
    } catch (e) {}
    return f;
  }

  function lines(f) {
    const out = [];
    out.push(f.saved
      ? { text: "Saved on this device. Every answer is kept in this browser on this device only. It is not sent anywhere.", ok: true }
      : { text: "Warning: the last save did NOT work on this device. Save a progress file now with the button below, and keep it safe.", ok: false });
    if (f.persistent === true) out.push({ text: "The browser has promised to keep this saved progress.", ok: true });
    else if (f.persistent === false) out.push({ text: "The browser has not promised to keep this saved progress. Safari may clear it after a week without use. Add the game to the home screen, and save a progress file now and then.", ok: false });
    out.push(f.offline
      ? { text: "The game is saved on this device and works without internet.", ok: true }
      : { text: "The game is not saved for use without internet yet. Open it once with internet and wait a minute.", ok: false });
    if (f.usage != null && f.quota != null) out.push({ text: `Space used on this device: ${mb(f.usage)} megabytes of ${mb(f.quota)}.`, ok: true });
    out.push(f.homeScreen
      ? { text: "This game was opened from the home screen.", ok: true }
      : { text: "To add the game to the home screen: in Safari tap Share, then Add to Home Screen. On an iPad or iPhone the home-screen game usually keeps its own saved progress, apart from Safari. The first time, save a progress file in Safari and load it in the home-screen game.", ok: true });
    return out;
  }
  const api = { collect, lines };
  if (typeof module === "object" && module.exports) module.exports = api; else root.DeviceStatus = api;
})(typeof window !== "undefined" ? window : globalThis);
