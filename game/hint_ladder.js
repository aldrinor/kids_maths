/* HintLadder: three steps of help (plan item 13), and the second picture for a stuck skill (plan item 16 / review item 20).
 *
 *   level 1  a nudge: one fixed sentence that sends the child back to the question ("Read it once more. Are we putting things together?")
 *   level 2  a picture of the story: dots, or blocks for big numbers. It shows the amounts, never the answer, no numerals and no running count.
 *   level 3  the worked step: the sentence the question already carries (Q.hint), e.g. "Start at 4 and hop forward 3."
 * Only level 3 counts as "helped" for mastery. A hint never costs coins. (The game, index.html, does the counting and the screen.)
 *
 * The nudges and captions are fixed sentences with no numbers, so each can have one recorded voice clip.
 * picture(Q) returns { svg, caption } or null when the question has no simple picture (the game then points at the scene above the question).
 */
(function (root) {
  "use strict";
  const NUDGE = {
    J: "Read it once more. Are we putting things together?",
    P: "Read it once more. Is it more than before?",
    A: "Read it once more. Is something going away?",
    C: "Read it once more. Which one is bigger, and by how much?",
    M: "Read it once more. How many more do we need?",
    N: "Read it once more. How many went away?",
    K: "Look at the word. Which number is it?",
    other: "Read it once more. What is the question asking?"
  };
  const CAPTION = "Here is a picture of the story.";
  const CAPTION_SCENE = "Look at the picture at the top. It shows the story.";
  const ALT_LEAD = "Here is a new way to see it.";
  const NEW_ONE = "Now try a new one.";

  const isKind = Q => !!Q.p;                                                  // a Stage 3 kind (times, sharing, coins ...) has its own bank
  function nudge(Q) { return isKind(Q) ? NUDGE.other : (NUDGE[Q.type] || NUDGE.other); }
  const sentences = () => Array.from(new Set([...Object.values(NUDGE), CAPTION, CAPTION_SCENE, ALT_LEAD, NEW_ONE]));

  /* ----- the picture ----- */
  const C1 = "var(--primary, #3b82c4)", C2 = "var(--hop, #e07a2e)", INK = "var(--line-ink, #333)";
  const PER_ROW = 5, DOT = 8, GAP = 22;

  /* n dots in rows of 5. kinds: n solid dots of colour col; hollow (dashed) from index `hollowFrom`; empty (outline only) from `emptyFrom`.
     Returns { g (svg text), w, h } placed at (x0, y0). */
  function dots(n, x0, y0, col, o) {
    o = o || {};
    let g = "";
    const rows = Math.ceil(n / PER_ROW);
    for (let i = 0; i < n; i++) {
      const cx = x0 + DOT + (i % PER_ROW) * GAP, cy = y0 + DOT + Math.floor(i / PER_ROW) * GAP;
      const hollow = o.hollowFrom != null && i >= o.hollowFrom, empty = o.emptyFrom != null && i >= o.emptyFrom;
      if (hollow) g += `<circle cx="${cx}" cy="${cy}" r="${DOT}" fill="none" stroke="${INK}" stroke-width="2" stroke-dasharray="3 3" opacity=".7"/>`;
      else if (empty) g += `<circle cx="${cx}" cy="${cy}" r="${DOT}" fill="none" stroke="${col}" stroke-width="2.5"/>`;
      else g += `<circle cx="${cx}" cy="${cy}" r="${DOT}" fill="${col}"/>`;
    }
    return { g, w: Math.min(n, PER_ROW) * GAP, h: rows * GAP };
  }
  /* blocks for big numbers: hundreds as squares, tens as rods, ones as dots, in one row */
  function blocks(n, x0, y0, col) {
    const h = Math.floor(n / 100), t = Math.floor(n / 10) % 10, o = n % 10;
    let g = "", x = x0;
    for (let i = 0; i < h; i++) { g += `<rect x="${x}" y="${y0}" width="22" height="22" rx="3" fill="${col}" opacity=".55" stroke="${col}" stroke-width="1.5"/>`; x += 26; }
    if (h) x += 8;
    for (let i = 0; i < t; i++) { g += `<rect x="${x}" y="${y0}" width="8" height="22" rx="2" fill="${col}"/>`; x += 12; }
    if (t) x += 8;
    for (let i = 0; i < o; i++) { g += `<circle cx="${x + 5}" cy="${y0 + 17}" r="5" fill="${col}"/>`; x += 12; }
    return { g, w: x - x0, h: 26 };
  }

  function picture(Q) {
    if (!Q || Q.parent || isKind(Q) || !Number.isFinite(Q.a)) return null;
    const type = Q.type, a = Q.a, b = Q.b, res = Q.result, big = Q.scale > 20;
    let svg = "", W = 0, H = 0;
    const put = (r, dx, dy) => { svg += `<g transform="translate(${dx} ${dy})">${r.g}</g>`; W = Math.max(W, dx + r.w); H = Math.max(H, dy + r.h); return r; };
    const sign = (ch, x, y) => { svg += `<text x="${x}" y="${y}" font-size="22" font-weight="800" fill="${INK}" text-anchor="middle">${ch}</text>`; };
    if (big) {
      if (type === "J" || type === "P" || type === "A" || type === "C" || type === "M" || type === "N") {
        const first = a, second = (type === "M" || type === "N") ? res : b;
        put(blocks(first, 0, 0, C1), 0, 0);
        put(blocks(second, 0, 0, C2), 0, 34);
      } else return null;
    } else if (type === "K") {
      put(dots(a, 0, 0, C1), 0, 0);
    } else if (type === "J" || type === "P") {
      const g1 = put(dots(a, 0, 0, C1), 0, 0);
      const x2 = g1.w + 34; sign("+", g1.w + 17, 8 + 14);
      put(dots(b, 0, 0, C2), x2, 0);
    } else if (type === "A") {
      put(dots(a, 0, 0, C1, { hollowFrom: a - b }), 0, 0);
    } else if (type === "C") {
      put(dots(a, 0, 0, C1), 0, 0);
      put(dots(b, 0, 0, C2), 0, Math.ceil(a / PER_ROW) * GAP + 10);
    } else if (type === "M") {
      put(dots(res, 0, 0, C1, { emptyFrom: a }), 0, 0);                         // a solid dots, then empty places up to the total
    } else if (type === "N") {
      put(dots(a, 0, 0, C1, { hollowFrom: res }), 0, 0);                        // the ones that went away are dashed
    } else return null;
    if (!svg) return null;
    W = Math.max(W, 60); H = Math.max(H, 30);
    return {
      caption: CAPTION,
      svg: `<svg class="hintpic" viewBox="-6 -4 ${W + 12} ${H + 8}" role="img" aria-label="A picture of the story" preserveAspectRatio="xMidYMid meet" style="max-height:92px;width:100%">${svg}</svg>`
    };
  }

  const api = { NUDGE, CAPTION, CAPTION_SCENE, ALT_LEAD, NEW_ONE, nudge, picture, sentences };
  if (typeof module === "object" && module.exports) module.exports = api; else root.HintLadder = api;
})(typeof window !== "undefined" ? window : globalThis);
