/* Kennedy's screen (5 years old, cannot read yet): "ReaderFree" mode.
   Everything he must do is a picture button, and every instruction he needs is spoken through the game's say().
   The game (index.html) asks this module; the module holds no game state except how often a spoken hint was given. */
(function () {
  const svg = (inner, vb = "0 0 24 24") => `<svg viewBox="${vb}" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
  const ICONS = {
    tick: svg(`<path d="M4.5 12.8l5 5L19.5 6.5"/>`),
    cross: svg(`<path d="M6 6l12 12M18 6L6 18"/>`),
    eye: svg(`<path d="M1.8 12C4.4 7.4 8 5.2 12 5.2s7.6 2.2 10.2 6.8c-2.6 4.6-6.2 6.8-10.2 6.8S4.4 16.6 1.8 12z" stroke-width="2.4"/><circle cx="12" cy="12" r="3.3" fill="currentColor" stroke="none"/>`),
    next: svg(`<path d="M4 12h15M13 5.5l6.5 6.5-6.5 6.5"/>`),
    more: svg(`<circle cx="12" cy="12" r="9.5" stroke-width="2.6"/><path d="M12 7.5v9M7.5 12h9"/>`),      // "more help": a plus in a circle
  };
  const SPOKEN_PROMPTS = {               // the new sentences a pre-reader needs (also listed in work_tmp/voice_new_phrases.json)
    next: "Tap the arrow to go on.",
    see: "Tap the eye to see the answer.",
    home: "Do you want to stop? Tap the tick to stop, or the cross to keep playing.",
    more: "Tap the plus for more help.",
  };
  const MAX_PROMPTS = 3;                 // each prompt is spoken the first 3 times in a visit, then he knows it: calm, not nagging
  const given = {};
  const KidMode = {
    ICONS, SPOKEN_PROMPTS,
    on() { return document.body.dataset.who === "kennedy"; },
    set(who) { if (who === "kennedy") document.body.dataset.who = "kennedy"; else delete document.body.dataset.who; for (const k in given) delete given[k]; },
    tileIcon(cls) { return cls === "next" ? ICONS.next : cls === "see" ? ICONS.eye : ICONS.tick; },
    promptText(kind) { return SPOKEN_PROMPTS[kind]; },
    shouldPrompt(kind) { if (!this.on()) return false; given[kind] = (given[kind] || 0) + 1; return given[kind] <= MAX_PROMPTS; },
  };
  window.KidMode = KidMode;
})();
