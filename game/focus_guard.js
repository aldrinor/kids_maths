/* FocusGuard: moves keyboard / screen-reader focus into a card, lesson, hint or game when it opens, and puts it back
 * where it was when it closes (review item 29). Cards are marked as dialogs so a screen reader announces them.
 *
 *   FocusGuard.enter(el, { label, first, trap })   el gets role="dialog" (when label is given) and focus moves into it.
 *        first: the element to focus (default: the first button inside el, else el itself)
 *        trap:  true keeps Tab inside el (cards, games); false leaves Tab free (the lesson card, the hint)
 *   FocusGuard.leave(el, fallback)                 focus returns to what had it before; if that is gone, to fallback (an element or selector)
 */
(function (root) {
  "use strict";
  const stack = [];
  const FOCUSABLE = 'button:not([disabled]):not([hidden]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  const visible = e => !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length);
  const inside = el => Array.from(el.querySelectorAll(FOCUSABLE)).filter(e => !e.closest("[hidden]") && visible(e));

  function tabKey(e) {
    if (e.key !== "Tab") return;
    const top = [...stack].reverse().find(x => x.trap && x.el.isConnected);
    if (!top) return;
    const items = inside(top.el);
    if (!items.length) { e.preventDefault(); top.el.focus(); return; }
    const i = items.indexOf(document.activeElement);
    if (e.shiftKey && (i <= 0)) { e.preventDefault(); items[items.length - 1].focus(); }
    else if (!e.shiftKey && (i === -1 || i === items.length - 1)) { e.preventDefault(); items[0].focus(); }
  }
  let listening = false;
  function listen() { if (!listening) { listening = true; document.addEventListener("keydown", tabKey, true); } }

  function enter(el, o) {
    o = o || {};
    if (!el) return;
    listen();
    const prev = document.activeElement && document.activeElement !== document.body ? document.activeElement : null;
    if (o.label) { el.setAttribute("role", "dialog"); el.setAttribute("aria-label", o.label); if (o.trap) el.setAttribute("aria-modal", "true"); }
    if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1");
    stack.push({ el, prev, trap: !!o.trap });
    const target = o.first || inside(el)[0] || el;
    try { target.focus({ preventScroll: true }); } catch (e) { try { target.focus(); } catch (e2) {} }
  }

  function leave(el, fallback) {
    const i = stack.findIndex(x => x.el === el);
    if (i < 0) return;
    const entry = stack.splice(i, 1)[0];
    const hadFocus = el.contains(document.activeElement) || document.activeElement === document.body || !document.activeElement;
    if (!hadFocus) return;                                      // the child already moved on; do not pull focus back
    let to = entry.prev && entry.prev.isConnected && visible(entry.prev) ? entry.prev : null;
    if (!to && fallback) to = typeof fallback === "string" ? document.querySelector(fallback) : fallback;
    if (to && to.isConnected) { try { to.focus({ preventScroll: true }); } catch (e) {} }
  }

  const api = { enter, leave, depth: () => stack.length };
  root.FocusGuard = api;
})(typeof window !== "undefined" ? window : globalThis);
