"""Castle tab rebuilt: the whole castle is always drawn; parts not bought yet are faint "still to build" outlines.
The knight stands in front of his castle with his gear; buddy and horse appear when bought. The shop shows a
picture of every part. Run once from src/."""
from pathlib import Path

P = Path(__file__).parent / "modules" / "knight.js"
s = P.read_text(encoding="utf-8")
a = s.index("  function castleSVG() {")
b = s.index("  /* ---------- CSS ---------- */")
CASTLE = r'''  // Each castle part as its own drawing, so the castle view and the shop pictures match.
  const PART = {
    moat: `<path d="M20 214 Q160 200 300 214 L300 232 Q160 218 20 232 Z" fill="#9fd0f2" stroke="${INK}" stroke-width="2.5"/>`,
    wall: `<rect x="80" y="110" width="160" height="96" fill="#e9dcc9" stroke="${INK}" stroke-width="3"/>${[0, 1, 2, 3, 4, 5, 6].map(i => `<rect x="${82 + i * 23}" y="96" width="14" height="16" fill="#e9dcc9" stroke="${INK}" stroke-width="2.5"/>`).join("")}<path d="M80 140 H240 M80 172 H240" stroke="#d6c4a9" stroke-width="2"/>`,
    tower_l: `<rect x="44" y="76" width="48" height="130" fill="#ddd0bc" stroke="${INK}" stroke-width="3"/><path d="M38 80 L68 40 L98 80 Z" fill="#c0305c" stroke="${INK}" stroke-width="3"/><rect x="60" y="110" width="16" height="22" rx="8" fill="#5a6f8f"/>`,
    tower_r: `<rect x="228" y="76" width="48" height="130" fill="#ddd0bc" stroke="${INK}" stroke-width="3"/><path d="M222 80 L252 40 L282 80 Z" fill="#3d6fd8" stroke="${INK}" stroke-width="3"/><rect x="244" y="110" width="16" height="22" rx="8" fill="#5a6f8f"/>`,
    flag: `<path d="M68 40 V14" stroke="${INK}" stroke-width="3"/><path d="M68 14 L94 21 L68 29 Z" fill="#ffd45c" stroke="${INK}" stroke-width="2"/>`,
    gate: `<path d="M136 206 V160 Q160 134 184 160 V206 Z" fill="#8a6a4e" stroke="${INK}" stroke-width="3"/><path d="M160 140 V206 M146 152 V206 M174 152 V206" stroke="#6d5240" stroke-width="2"/>`,
    bridge: `<path d="M132 206 H188 L196 228 H124 Z" fill="#c79a64" stroke="${INK}" stroke-width="2.5"/><path d="M140 210 V226 M152 210 V226 M164 210 V226 M176 210 V226" stroke="#a87b4c" stroke-width="2"/>`
  };
  const PART_ORDER = ["moat", "wall", "tower_l", "tower_r", "flag", "gate", "bridge"];
  function castleSVG() {
    const owned = (P.castle || []).map(id => (SHOP.find(s => s.id === id) || {}).name).filter(Boolean);
    return `<svg viewBox="0 0 320 250" class="kn-castle" role="img" aria-label="Your castle. Built: ${owned.join(", ") || "nothing yet"}.">
      <rect width="320" height="250" fill="#e3eefa"/><path d="M0 190 Q90 160 170 186 T320 178 V250 H0 Z" fill="#cfe8c4"/><rect y="206" width="320" height="44" fill="#bfe0b2"/>
      ${PART_ORDER.map(id => `<g class="${has(id) ? "" : "kn-ghost"}">${PART[id]}</g>`).join("")}
      <g class="${has("horse") ? "" : "kn-ghost"}">${sized(KnightArt.full("horse", "stand"), 'x="2" y="150" width="78" height="78"')}</g>
      <g class="${has("buddy") ? "" : "kn-ghost"}">${sized(KnightArt.full("buddy", "stand"), 'x="262" y="146" width="56" height="74"')}</g>
      ${sized(knightSVG(60), 'x="196" y="150"').replace(/width="60" height="78"/, 'width="60" height="78"')}
    </svg>`;
  }
  // A small picture for each thing in the shop.
  function shopPic(id) {
    if (PART[id]) return `<svg viewBox="30 0 260 240" width="64" height="58" aria-hidden="true">${PART[id === "flag" ? "tower_l" : id === "bridge" ? "gate" : id]}${id === "flag" ? PART.flag : ""}${id === "bridge" ? PART.bridge : ""}</svg>`;
    if (id === "buddy" || id === "horse") return sized(KnightArt.full(id, "stand"), 'width="56" height="58"');
    const opts = { armour: id === "armour", plume: id === "plume", shield: id === "shield", sword: id === "sword2" ? "silver" : id === "sword" ? "wood" : "none" };
    return sized(KnightArt.full("knight", "stand", opts), 'width="46" height="58"');
  }

'''
s = s[:a] + CASTLE + s[b:]
old_item = """        return `<button type="button" class="kn-item${own ? " own" : ""}" data-buy="${s.id}"${own || cant ? " disabled" : ""}>${esc(s.name)}<span>${own ? "You have it" : locked ? `First get: ${esc(SHOP.find(x => x.id === s.needs).name)}` : `${s.price} coins`}</span></button>`; }).join("")}</div>`).join("")}</div>`;"""
new_item = """        return `<button type="button" class="kn-item${own ? " own" : ""}" data-buy="${s.id}"${own || cant ? " disabled" : ""}>${shopPic(s.id)}<b>${esc(s.name)}</b><span>${own ? "You have it" : locked ? `First get: ${esc(SHOP.find(x => x.id === s.needs).name)}` : `${s.price} coins`}</span></button>`; }).join("")}</div>`).join("")}</div>`;"""
assert s.count(old_item) == 1
s = s.replace(old_item, new_item)
old_head = """    el.innerHTML = `<div class="kn-world"><h2>Kennedy's castle</h2><p>You have ${coins} coins. Send bad guys home to win more.</p>${castleSVG()}
      <div style="display:flex;justify-content:center">${knightSVG(90)}</div>"""
new_head = """    const next = SHOP.find(x => !has(x.id) && (!x.needs || has(x.needs)));
    el.innerHTML = `<div class="kn-world"><h2>Kennedy's castle</h2>${castleSVG()}
      <p class="kn-note">You have ${coins} coins.${next ? ` Next to build: ${esc(next.name)}, ${next.price} coins.` : " Your castle is complete!"} Faint parts are still to build.</p>"""
assert s.count(old_head) == 1
s = s.replace(old_head, new_head)
s = s.replace(".kn-item[disabled] { opacity: .55; } .kn-item.own { background: #c9ecd9; }",
              ".kn-item[disabled] { opacity: .55; } .kn-item.own { background: #e3f5ee; opacity: 1; }\n.kn-item svg { justify-self: center; } .kn-item b { font-size: 15px; }\n.kn-ghost { opacity: .16; }\n.kn-note { margin: 0; text-align: center; font-weight: 800; color: #53627c; }")
P.write_text(s, encoding="utf-8")
print("castle rebuilt")
