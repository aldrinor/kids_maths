/* Money module for Marie's maths game (Canadian money, BC Grades 1-3).
   Pushes four topics onto window.MathTopics: coins_count, make_amount, coin_puzzle, money_sense.
   All coin and bill pictures are our own simple drawings (not Royal Canadian Mint artwork).
   Coin sizes are true to scale: penny 19.05 mm, nickel 21.2, dime 18.03, quarter 23.88,
   loonie 26.5 (Canada Gazette SOR/2011-325), toonie 28.00 (same order).
   No penny anywhere except coin_puzzle level 4 (the penny left circulation on 4 Feb 2013). */
(function () {
  "use strict";
  const INK = "#3b2a33";
  const DEAD = { dead: true };

  /* ================= Money facts ================= */
  const MONEY = {
    penny:   { v: 1,     kind: "coin", mm: 19.05, name: "penny",   plural: "pennies",  label: "1¢" },
    nickel:  { v: 5,     kind: "coin", mm: 21.2,  name: "nickel",  plural: "nickels",  label: "5¢" },
    dime:    { v: 10,    kind: "coin", mm: 18.03, name: "dime",    plural: "dimes",    label: "10¢" },
    quarter: { v: 25,    kind: "coin", mm: 23.88, name: "quarter", plural: "quarters", label: "25¢" },
    loonie:  { v: 100,   kind: "coin", mm: 26.5,  name: "loonie",  plural: "loonies",  label: "$1" },
    toonie:  { v: 200,   kind: "coin", mm: 28,    name: "toonie",  plural: "toonies",  label: "$2" },
    five:    { v: 500,   kind: "bill", name: "five dollar bill",    plural: "five dollar bills",    label: "$5",   c: "#74b9f5", deep: "#2f7fd0" },
    ten:     { v: 1000,  kind: "bill", name: "ten dollar bill",     plural: "ten dollar bills",     label: "$10",  c: "#b49bff", deep: "#7b55e6" },
    twenty:  { v: 2000,  kind: "bill", name: "twenty dollar bill",  plural: "twenty dollar bills",  label: "$20",  c: "#6fd29a", deep: "#2a9a5b" },
    fifty:   { v: 5000,  kind: "bill", name: "fifty dollar bill",   plural: "fifty dollar bills",   label: "$50",  c: "#ff8080", deep: "#d23c3c" },
    hundred: { v: 10000, kind: "bill", name: "hundred dollar bill", plural: "hundred dollar bills", label: "$100", c: "#d6a272", deep: "#94592b" }
  };
  const ORDER = ["hundred", "fifty", "twenty", "ten", "five", "toonie", "loonie", "quarter", "dime", "nickel", "penny"];
  const val = id => MONEY[id].v;
  const sum = ids => ids.reduce((s, id) => s + val(id), 0);
  const byBig = (a, b) => val(b) - val(a);
  const sortBig = ids => ids.slice().sort(byBig);

  /* amounts are kept in cents */
  function fmt(c) {
    if (c < 100) return c + "¢";
    if (c % 100 === 0) return "$" + c / 100;
    return "$" + Math.floor(c / 100) + "." + String(c % 100).padStart(2, "0");
  }
  function spoken(c) {
    if (c < 100) return c + (c === 1 ? " cent" : " cents");
    const d = Math.floor(c / 100), r = c % 100;
    const ds = d + (d === 1 ? " dollar" : " dollars");
    return r ? ds + " and " + r + (r === 1 ? " cent" : " cents") : ds;
  }
  const nameOf = (id, n) => n === 1 ? MONEY[id].name : MONEY[id].plural;

  /* ================= Random helpers ================= */
  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const shuffle = a => { const r = a.slice(); for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; };
  const rep = (id, n) => Array.from({ length: n }, () => id);
  const keyOf = ids => sortBig(ids).join(",");
  function fresh(gen, prev) {
    let q = gen();
    for (let i = 0; i < 60 && prev && q.key === prev.key; i++) q = gen();
    return q;
  }

  /* ================= Coin and bill drawings ================= */
  const LEAF = "M50 6 L56 25 L66 19 L64 39 L80 31 L76 44 L92 48 L75 60 L79 69 L58 65 L54 81 L52.5 81 L52.5 95 L47.5 95 L47.5 81 L46 81 L42 65 L21 69 L25 60 L8 48 L24 44 L20 31 L36 39 L34 19 L44 25 Z";
  const MOTIF = {
    beaver: m => `<rect x="8" y="73" width="84" height="11" rx="5.5" fill="${m}"/><ellipse cx="79" cy="61" rx="16" ry="7" transform="rotate(-28 79 61)" fill="${m}"/><ellipse cx="51" cy="57" rx="25" ry="17" fill="${m}"/><circle cx="29" cy="43" r="13" fill="${m}"/><circle cx="22" cy="31" r="4.5" fill="${m}"/><circle cx="35" cy="30.5" r="4.5" fill="${m}"/><rect x="40" y="66" width="7" height="9" rx="3" fill="${m}"/><rect x="58" y="66" width="7" height="9" rx="3" fill="${m}"/>`,
    schooner: m => `<path d="M10 62 H90 L79 78 H22 Z" fill="${m}"/><rect x="38" y="12" width="4" height="52" fill="${m}"/><rect x="61" y="17" width="4" height="47" fill="${m}"/><path d="M37 14 L37 58 L14 58 Z" fill="${m}"/><path d="M60 19 L60 58 L44 58 Z" fill="${m}"/><path d="M67 23 L91 57 L67 57 Z" fill="${m}"/><path d="M8 88 q8 -6 16 0 t16 0 t16 0 t16 0 t16 0" fill="none" stroke="${m}" stroke-width="4.5" stroke-linecap="round"/>`,
    caribou: m => `<g fill="none" stroke="${m}" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"><path d="M43 40 C36 28 28 22 16 14 M27 22 L14 26 M34 30 L28 14"/><path d="M57 40 C64 28 72 22 84 14 M73 22 L86 26 M66 30 L72 14"/></g><ellipse cx="33" cy="47" rx="9" ry="4.5" transform="rotate(-22 33 47)" fill="${m}"/><ellipse cx="67" cy="47" rx="9" ry="4.5" transform="rotate(22 67 47)" fill="${m}"/><path d="M38 44 Q50 34 62 44 L60 74 Q50 88 40 74 Z" fill="${m}"/>`,
    loon: m => `<path d="M8 82 q9 -6 18 0 t18 0 t18 0 t18 0 t18 0" fill="none" stroke="${m}" stroke-width="4.5" stroke-linecap="round"/><ellipse cx="57" cy="62" rx="31" ry="13" fill="${m}"/><path d="M85 58 L95 52 L91 63 Z" fill="${m}"/><path d="M28 60 Q22 44 27 34 L37 36 Q35 48 42 57 Z" fill="${m}"/><circle cx="31" cy="34" r="9" fill="${m}"/><path d="M24 31 L8 35 L24 38 Z" fill="${m}"/>`,
    bear: m => `<rect x="8" y="78" width="84" height="7" rx="3.5" fill="${m}"/><ellipse cx="56" cy="52" rx="29" ry="17" fill="${m}"/><rect x="33" y="57" width="10" height="22" rx="5" fill="${m}"/><rect x="47" y="59" width="10" height="20" rx="5" fill="${m}"/><rect x="65" y="59" width="10" height="20" rx="5" fill="${m}"/><rect x="77" y="56" width="10" height="23" rx="5" fill="${m}"/><circle cx="28" cy="45" r="13" fill="${m}"/><ellipse cx="16" cy="50" rx="9" ry="6" fill="${m}"/><circle cx="27" cy="32" r="4.5" fill="${m}"/>`,
    leaves: m => `<path d="M50 92 C50 70 46 56 40 46 M50 70 C56 60 62 54 68 50" fill="none" stroke="${m}" stroke-width="4" stroke-linecap="round"/><g transform="translate(10 6) scale(.52)"><path d="${LEAF}" fill="${m}"/></g><g transform="translate(44 18) scale(.5)"><path d="${LEAF}" fill="${m}"/></g>`
  };
  const COIN_LOOK = {
    penny:   { rim: "#c56a3c", face: "#ea9361", motif: "#b0532a", dark: "#9c4d26", art: "leaves" },
    nickel:  { rim: "#aeb3bd", face: "#d3d7de", motif: "#8e95a2", dark: "#878d99", art: "beaver" },
    dime:    { rim: "#bcc1cb", face: "#e4e7ed", motif: "#99a0ad", dark: "#959ba7", art: "schooner" },
    quarter: { rim: "#a7adb8", face: "#cdd1d9", motif: "#858c99", dark: "#828895", art: "caribou" },
    loonie:  { rim: "#e0a419", face: "#ffcf4a", motif: "#cf900f", dark: "#b07c0c", art: "loon" },
    toonie:  { rim: "#c3c8d1", face: "#f7c23e", motif: "#c4850c", dark: "#8d93a0", art: "bear" }
  };
  const SH = 5; // shadow drop in drawing units (same for every coin, so line weight stays the same)
  const text = (x, y, s, fs, fill, halo, hw) => `<text x="${x}" y="${y}" text-anchor="middle" font-family="'Baloo 2','Nunito',sans-serif" font-weight="800" font-size="${fs}" fill="${fill}" stroke="${halo}" stroke-width="${hw}" stroke-linejoin="round" paint-order="stroke fill">${s}</text>`;
  function coinSVG(id) {
    const m = MONEY[id], L = COIN_LOOK[id];
    const U = m.mm * 4, R = U / 2, c = R, sw = 5;
    let shape, shadow;
    if (id === "loonie") {
      const pts = Array.from({ length: 11 }, (_, k) => { const a = -Math.PI / 2 + k * 2 * Math.PI / 11; return [(c + (R - sw / 2) * Math.cos(a)).toFixed(2), (c + (R - sw / 2) * Math.sin(a)).toFixed(2)]; });
      const p = pts.map(q => q.join(",")).join(" ");
      shadow = `<polygon points="${p}" transform="translate(0 ${SH})" fill="${INK}" stroke="${INK}" stroke-width="${sw}" stroke-linejoin="round"/>`;
      shape = `<polygon points="${p}" fill="${L.rim}" stroke="${INK}" stroke-width="${sw}" stroke-linejoin="round"/>`;
    } else {
      shadow = `<circle cx="${c}" cy="${c + SH}" r="${R - sw / 2}" fill="${INK}"/>`;
      shape = `<circle cx="${c}" cy="${c}" r="${R - sw / 2}" fill="${L.rim}" stroke="${INK}" stroke-width="${sw}"/>`;
    }
    const fr = R * 0.8; // inner face
    /* Two layers: "full" shows the animal at the top and the value below it;
       "plain" shows only a big value. Plain is used when the coins are drawn small (class mny-plain on the
       board, set by the sizing step), so she can still read each coin's value on an iPhone SE. */
    let face = "", full = "", plain = "";
    const lab = (cx, r, fill, halo, big) => {
      const fs = big ? (m.label.length >= 3 ? r * 1.0 : r * 1.12) : (m.label.length >= 3 ? r * 0.8 : r * 0.98);
      const y = big ? cx + fs * 0.35 : cx + r * 0.78;
      return text(c, y, m.label, fs, fill, halo, big ? 8 : 7);
    };
    const motif = (cx, r, art, col) => `<g transform="translate(${c - r * 0.66} ${cx - r * 1.02}) scale(${r * 1.32 / 100})">${MOTIF[art](col)}</g>`;
    if (id === "toonie") {
      face += `<circle cx="${c}" cy="${c}" r="${R * 0.86}" fill="none" stroke="${L.dark}" stroke-width="2.4" stroke-dasharray="1.6 3.2"/>`;
      const cr = R * 0.6;
      face += `<circle cx="${c}" cy="${c}" r="${cr}" fill="${L.face}" stroke="${INK}" stroke-width="3"/>`;
      full = motif(c, cr, "bear", L.motif) + lab(c, cr, INK, L.face, false);
      plain = lab(c, cr, INK, L.face, true);
    } else {
      if (id === "dime" || id === "quarter") face += `<circle cx="${c}" cy="${c}" r="${R * 0.9}" fill="none" stroke="${L.dark}" stroke-width="2.2" stroke-dasharray="1.4 2.8"/>`;
      face += `<circle cx="${c}" cy="${c}" r="${fr}" fill="${L.face}" stroke="${L.dark}" stroke-width="2.4"/>`;
      full = motif(c, fr, L.art, L.motif) + lab(c, fr, INK, L.face, false);
      plain = lab(c, fr, INK, L.face, true);
    }
    const body = face + `<g class="mny-cfull">${full}</g><g class="mny-cplain">${plain}</g>`;
    const shine = `<ellipse cx="${c - R * 0.38}" cy="${c - R * 0.5}" rx="${R * 0.3}" ry="${R * 0.12}" transform="rotate(-38 ${c - R * 0.38} ${c - R * 0.5})" fill="#fff" opacity=".6"/>`;
    return `<svg class="mny-art" viewBox="-3 -3 ${U + 6} ${U + 6 + SH}" aria-hidden="true" focusable="false">${shadow}${shape}${body}${shine}</svg>`;
  }
  function billSVG(id) {
    const m = MONEY[id], W = 220, H = 100;
    const fs = m.label.length >= 4 ? 44 : m.label.length === 3 ? 54 : 64;
    return `<svg class="mny-art" viewBox="-3 -3 ${W + 6} ${H + 6 + SH}" aria-hidden="true" focusable="false">
      <rect x="2.5" y="${2.5 + SH}" width="${W - 5}" height="${H - 5}" rx="14" fill="${INK}"/>
      <rect x="2.5" y="2.5" width="${W - 5}" height="${H - 5}" rx="14" fill="${m.c}" stroke="${INK}" stroke-width="5"/>
      <rect x="11" y="11" width="${W - 22}" height="${H - 22}" rx="9" fill="none" stroke="#fff" stroke-width="3" stroke-dasharray="7 5" opacity=".75"/>
      <rect x="180" y="9" width="22" height="${H - 18}" rx="7" fill="#fff" opacity=".55" stroke="${INK}" stroke-width="2.5"/>
      <circle cx="46" cy="50" r="27" fill="#fff" stroke="${INK}" stroke-width="3.5"/>
      <g transform="translate(26 30) scale(.4)"><path d="${LEAF}" fill="${m.deep}"/></g>
      ${text(m.label.length >= 4 ? 128 : 124, 50 + fs * 0.35, m.label, fs, "#fff", INK, 9)}
      <ellipse cx="40" cy="20" rx="20" ry="5" fill="#fff" opacity=".45"/>
    </svg>`;
  }
  /* each drawing is made once and reused (the sizing step draws the board many times) */
  const ART_MEMO = {};
  const artOf = id => ART_MEMO[id] || (ART_MEMO[id] = MONEY[id].kind === "bill" ? billSVG(id) : coinSVG(id));
  /* one sized money picture (no button). size follows --toonie on an ancestor */
  const pic = id => `<span class="mny-pic ${MONEY[id].kind === "bill" ? "mny-billpic" : ""}" style="--d:${MONEY[id].kind === "bill" ? 1 : (MONEY[id].mm / 28).toFixed(4)}">${artOf(id)}</span>`;
  /* A coin "chip" for the riddle answer buttons (2026-10-15). Those buttons are small (about 73 px inside on an
     iPhone SE), so true-scale coins there were only 19 px wide with 6 px writing. A chip is every coin the same
     size, in its own colour, with only its value written big: 25, 10, 5, 1 (cents) or $1, $2. */
  function chipSVG(id) {
    const L = COIN_LOOK[id], m = MONEY[id];
    const t = m.v < 100 ? String(m.v) : m.label;
    const fs = t.length >= 2 ? 22 : 25;
    const ring = id === "toonie"
      ? `<circle cx="22" cy="22" r="19" fill="${L.rim}" stroke="${INK}" stroke-width="3"/><circle cx="22" cy="22" r="14" fill="${L.face}" stroke="${INK}" stroke-width="1.5"/>`
      : `<circle cx="22" cy="22" r="19" fill="${L.face}" stroke="${INK}" stroke-width="3"/><circle cx="22" cy="22" r="15" fill="none" stroke="${L.dark}" stroke-width="1.5" stroke-dasharray="1.4 2.4"/>`;
    return `<svg class="mny-art" viewBox="0 0 44 47" aria-hidden="true" focusable="false"><circle cx="22" cy="25" r="19" fill="${INK}"/>${ring}${text(22, 22 + fs * 0.36, t, fs, INK, L.face, 3)}</svg>`;
  }
  /* a small set of money for a choice button: the letter, then one chip per coin (they wrap two to a row in a narrow button) */
  const miniSet = (ids, letter) => `<span class="mny-mini">${letter ? `<span class="mny-letter mny-l${letter}">${letter}</span>` : ""}${sortBig(ids).map(id => `<span class="mny-chip">${chipSVG(id)}</span>`).join("")}</span>`;
  /* Rows of five (2026-10-15, father's rule): the tray never shows a running number, so a long line of coins is
     laid out five to a row (like a ten-frame) for Marie to count herself. Only when every piece is a coin:
     bills are too wide to sit five in a row on an iPhone SE. */
  /* 2026-10-15 (round 2): each kind of money is grouped together, biggest first, so she can count on by 25s,
     then 10s, then 5s, as the hint tells her. Before, the rows were in tap order, so one row could hold
     5¢ 5¢ 25¢ 10¢ 5¢. byKind (Count coins): a row holds one kind only, five at most. Without it (Pay the shop,
     where she may add any coins and the tray must still fit an iPhone SE): rows of five, biggest coin first. */
  /* 2026-10-16 (round 3): byKind groups sit side by side and wrap (each kind still in its own dashed frame,
     biggest first), so three kinds of coin no longer need three full lines: on an iPhone SE the third line fell
     below the board. Rows of five (Pay the shop, Coin riddles) mark the place where the kind changes with a thin
     dashed line that takes no room. */
  const fives = (ids, htmls, byKind) => {
    if (!htmls.length) return "";
    const ps = ids.map((id, i) => ({ id, h: htmls[i], i })).sort((a, b) => val(b.id) - val(a.id) || a.i - b.i);
    if (byKind && ids.some(id => MONEY[id].kind === "bill")) return ps.map(p => p.h).join("");
    /* 2026-10-16 (round 4): in Pay the shop the bills sit together on their own line (biggest first) and the coins
       below them still go in rows of five. Before, one bill turned the whole tray into one long wrapping line. */
    const rows = [];
    let cur = null;
    for (const p of ps) {
      if (MONEY[p.id].kind === "bill") {
        if (!cur || !cur.bills) { cur = { id: p.id, hs: [], last: null, bills: true }; rows.push(cur); }
        cur.hs.push(p.h); cur.last = p.id; continue;
      }
      if (!cur || cur.bills || (byKind && cur.id !== p.id) || cur.hs.length === 5) { cur = { id: p.id, hs: [], last: null }; rows.push(cur); }
      const h = !byKind && cur.last && cur.last !== p.id ? p.h.replace('class="mny-item', 'class="mny-item mny-knew') : p.h;
      cur.hs.push(h); cur.last = p.id;
    }
    return `<span class="mny-fives${byKind ? " mny-bykind" : ""}">${rows.map(r => `<span class="mny-five${r.bills ? " mny-bills" : ""}"${byKind ? ` data-kind="${r.id}"` : ""}>${r.hs.join("")}</span>`).join("")}</span>`;
  };
  /* the words read out for a set of money (screen readers, the real game's aria-label): each piece named once,
     biggest first, with no counts and no amounts. "2 quarters" or "$20" would count or add for her (2026-10-15). */
  const plainLabel = ids => sortBig(ids).map(id => MONEY[id].name).join(", ");

  /* card for "ways to pay" (our own drawing) */
  const CARD_SVG = `<svg class="mny-art" viewBox="-3 -3 166 111" aria-hidden="true"><rect x="2.5" y="${2.5 + SH}" width="155" height="95" rx="14" fill="${INK}"/><rect x="2.5" y="2.5" width="155" height="95" rx="14" fill="#74c8ff" stroke="${INK}" stroke-width="5"/><rect x="2.5" y="22" width="155" height="16" fill="#3b2a33" opacity=".8"/><rect x="18" y="50" width="30" height="22" rx="5" fill="#ffc94a" stroke="${INK}" stroke-width="3"/><path d="M18 61 H48 M33 50 V72" stroke="${INK}" stroke-width="2"/><rect x="60" y="56" width="80" height="9" rx="4.5" fill="#fff" opacity=".85"/><rect x="60" y="72" width="50" height="9" rx="4.5" fill="#fff" opacity=".85"/><circle cx="132" cy="80" r="9" fill="#ff6f9f" stroke="${INK}" stroke-width="2.5"/></svg>`;

  /* ================= Shared styles (injected once) ================= */
  const CSS = `
.mny { position: relative; box-sizing: border-box; width: 100%; height: 100%; display: flex; flex-direction: column; gap: 8px; padding: 8px; overflow-x: hidden; overflow-y: auto; color: ${INK}; font-family: "Nunito", "Segoe UI", system-ui, sans-serif; --toonie: 60px; -webkit-user-select: none; user-select: none; }
.mny * { box-sizing: border-box; }
.mny.mny-wide { flex-direction: row; align-items: stretch; }
.mny.mny-wide > .mny-zone { flex: 1 1 0; min-width: 0; }
.mny-zone { position: relative; flex: none; border: 3px solid ${INK}; border-radius: 20px; box-shadow: 0 4px 0 ${INK}; padding: 20px 6px 8px; margin-top: 8px; background: #fff; display: flex; flex-direction: column; justify-content: center; }
.mny-zone.grow { flex: 1 1 auto; }
.mny-tag.r2 { left: auto; right: 60px; }
.mny-tag.sunny { background: #ffc94a !important; color: ${INK} !important; }
.mny-tag.ok { background: #23a483 !important; color: #fff !important; }
.mny-tag.over { background: #fff1e6 !important; color: #c2511a !important; }
.mny-tag.lilac { background: #a98bff !important; color: #fff !important; }
.mny-tag { position: absolute; z-index: 4; top: -3px; left: 12px; transform: translateY(-40%); font-variant-numeric: tabular-nums; background: #fff; border: 3px solid ${INK}; border-radius: 999px; padding: 0 10px; font: 800 15px/22px "Baloo 2", sans-serif; white-space: nowrap; box-shadow: 0 2px 0 ${INK}; }
.mny-zone.purse { background: radial-gradient(circle at 12px 12px, rgba(255,255,255,.55) 0 4px, transparent 5px) 0 0 / 24px 24px, #ffc4d8; border-radius: 24px 24px 34px 34px; margin-top: 12px; }
.mny-zone.purse::before { content: ""; position: absolute; top: -14px; left: 50%; width: 46px; height: 14px; margin-left: -23px; border: 3px solid ${INK}; border-bottom: 0; border-radius: 24px 24px 0 0; }
.mny-zone.purse .mny-tag { background: #ff6f9f; color: #fff; }
.mny-zone.tray { background: repeating-linear-gradient(0deg, #ffe7c4 0 12px, #ffdfb3 12px 24px); }
.mny-zone.tray .mny-tag { background: #ffc94a; }
.mny-zone.bank { background: #e2f8f0; }
.mny-zone.bank .mny-tag { background: #63d3b3; color: #fff; }
/* named mny-shopzone, not "shop": the game has its own global .shop style (a sideways-scrolling grid) */
.mny-zone.mny-shopzone { background: #fff6d6; padding: 6px; }
.mny-shopline > span:not(.mny-price):not(.mny-pic) { white-space: nowrap; }
.mny-zone.drop-on { outline: 4px dashed #a98bff; outline-offset: 2px; }
.mny-row { display: flex; flex-wrap: wrap; gap: 6px 6px; justify-content: center; align-items: center; min-height: 44px; }
.mny-pic { display: block; width: calc(var(--toonie) * var(--d)); flex: none; }
.mny-pic.mny-billpic { width: calc(var(--toonie) * 2.15); }
.mny-cplain { display: none; }
.mny-mini .mny-cfull { display: none; } .mny-mini .mny-cplain { display: inline; }
.mny-pic svg, .mny-pic .mny-art { display: block; width: 100%; height: auto; overflow: visible; }
.mny-item { position: relative; display: inline-grid; place-items: center; min-width: 44px; min-height: 44px; padding: 2px; margin: 0; border: 0; background: none; border-radius: 16px; cursor: pointer; touch-action: none; -webkit-tap-highlight-color: transparent; color: inherit; font: inherit; }
.mny-item:focus-visible { outline: 4px solid #74c8ff; outline-offset: 2px; }
.mny-item.ghosted { visibility: hidden; }
.mny-item.lift { opacity: .3; }
.mny-item.pop { animation: mnyPop .28s ease-out; }
@keyframes mnyPop { from { transform: scale(.5); } 70% { transform: scale(1.12); } }
.mny-badge { position: absolute; top: -6px; right: -8px; min-width: 30px; height: 26px; padding: 0 6px; border-radius: 13px; background: #ffc94a; border: 2px solid ${INK}; font: 800 15px/22px "Baloo 2", sans-serif; text-align: center; z-index: 2; white-space: nowrap; pointer-events: none; }
.mny-badge.added { background: #a98bff; color: #fff; }
.mny-next { animation: mnyGlow 1s ease-in-out infinite; z-index: 3; }
@keyframes mnyGlow { 0%, 100% { filter: drop-shadow(0 0 0 #ffc94a); transform: scale(1); } 50% { filter: drop-shadow(0 0 7px #ffb020) drop-shadow(0 0 3px #ff6f9f); transform: scale(1.08); } }
.mny-shake { animation: mnyShake .35s; }
@keyframes mnyShake { 25% { transform: translateX(-6px); } 75% { transform: translateX(6px); } }
.mny-bar { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; justify-content: center; }
.mny-pill { display: inline-flex; align-items: center; gap: 6px; min-height: 36px; padding: 0 14px; border: 3px solid ${INK}; border-radius: 999px; background: #a98bff; color: #fff; font: 800 19px "Baloo 2", sans-serif; box-shadow: 0 3px 0 ${INK}; white-space: nowrap; font-variant-numeric: tabular-nums; text-shadow: 0 2px 0 rgba(59,42,51,.3); }
.mny-pill.sun { background: #ffc94a; color: ${INK}; text-shadow: none; }
.mny-pill.ok { background: #23a483; }
.mny-pill.over { background: #fff1e6; color: #c2511a; text-shadow: none; }
.mny-pill .tick { display: inline-grid; place-items: center; width: 22px; height: 22px; border-radius: 50%; background: #fff; color: #23a483; font-size: 16px; text-shadow: none; }
.mny-btn { min-height: 44px; min-width: 44px; padding: 0 12px; border: 3px solid ${INK}; border-radius: 16px; box-shadow: 0 3px 0 ${INK}; background: #fff; color: ${INK}; font: 800 17px "Baloo 2", sans-serif; cursor: pointer; touch-action: manipulation; }
.mny-btn:active { transform: translateY(2px); box-shadow: 0 1px 0 ${INK}; }
.mny-btn.round { position: absolute; top: -20px; right: 8px; width: 44px; height: 44px; min-width: 44px; min-height: 44px; padding: 0; border-radius: 50%; font-size: 21px; display: grid; place-items: center; z-index: 4; }
.mny-btn.round::after { content: ""; position: absolute; inset: -4px; }
.mny-btn:disabled { opacity: .35; }
/* the start-again button only shows when there is something to start again (no faded button with no job) */
.mny-btn.round:disabled { visibility: hidden; }
/* room under the tray label for that button, so it never sits on a coin */
.mny-zone.tray { padding-top: 28px; } .mny-compact .mny-zone.tray { padding-top: 24px; }
.mny-badge.tick { background: #23a483; color: #fff; min-width: 22px; height: 22px; padding: 0 3px; top: -11px; right: -11px; font-size: 13px; line-height: 18px; }  /* small, off the coin's value */
/* round 5: a count badge on a bill sits over the bill's leaf circle (left), not on its value; small writing */
.mny-item.mny-isbill .mny-badge:not(.tick) { right: auto; left: -12px; top: -10px; min-width: 24px; height: 20px; padding: 0 4px; font-size: 12px; line-height: 16px; }
.mny-trows { display: flex; flex-direction: column; gap: 8px; }
.mny-trow { display: flex; align-items: center; gap: 8px; padding: 4px 6px; border-radius: 14px; background: rgba(255,255,255,.55); border: 2px dashed rgba(59,42,51,.35); min-height: 52px; }
.mny-trow .mny-rowname { flex: none; width: 74px; font: 800 14px/1.1 "Baloo 2", sans-serif; text-align: center; }
.mny-trow .mny-row { flex: 1; justify-content: flex-start; }
.mny-price { display: inline-flex; align-items: center; gap: 6px; padding: 4px 14px 4px 22px; background: #fff; border: 3px solid ${INK}; border-radius: 8px 16px 16px 8px; box-shadow: 0 3px 0 ${INK}; font: 800 24px "Baloo 2", sans-serif; position: relative; white-space: nowrap; }
.mny-price::before { content: ""; position: absolute; left: 7px; top: 50%; width: 9px; height: 9px; margin-top: -4.5px; border-radius: 50%; border: 2.5px solid ${INK}; background: #ffc94a; }
button.mny-price { min-height: 44px; }
/* very short screens: the price and the money paid move into the tray label, so the shop row is not needed */
.mny-compact .mny-zone.mny-shopzone { display: none; }
.mny-shopline { display: flex; flex-wrap: nowrap; gap: 10px; align-items: center; justify-content: center; font: 800 18px "Baloo 2", sans-serif; }
.mny-purses { display: flex; flex-direction: column; gap: 8px; }
.mny-prow { display: flex; align-items: center; gap: 4px; }
.mny-prow .mny-letter { width: max(30px, calc(var(--toonie) * .5)); height: max(30px, calc(var(--toonie) * .5)); font-size: max(17px, calc(var(--toonie) * .28)); }
.mny-purses .mny-row { gap: 4px; }
.mny-refrow { min-height: 0; gap: 4px 8px; }
.mny-prow .mny-row { flex: 1; justify-content: flex-start; }
.mny-letter { flex: none; display: inline-grid; place-items: center; width: 34px; height: 34px; border-radius: 50%; border: 3px solid ${INK}; font: 800 19px/1 "Baloo 2", sans-serif; color: #fff; text-shadow: 0 2px 0 rgba(59,42,51,.3); background: #ff6f9f; }
.mny-lB { background: #23a483; } .mny-lC { background: #7b55e6; } .mny-lD { background: #2f8fd6; }
.mny-choice { display: inline-flex; align-items: center; gap: 8px; max-width: 100%; }
.mny-mini { display: flex; flex-wrap: wrap; gap: 3px; align-items: center; justify-content: center; min-width: 0; width: 100%; }
.mny-mini .mny-letter { width: 28px; height: 28px; font-size: 17px; border-width: 2.5px; }
.mny-chip { display: block; flex: none; width: 28px; }
.mny-chip svg { display: block; width: 100%; height: auto; max-height: none; }
@media (min-width: 700px) { .mny-chip { width: 34px; } .mny-mini .mny-letter { width: 32px; height: 32px; } }
.mny-fives { display: flex; flex-direction: column; align-items: center; gap: 5px; max-width: 100%; }
.mny-five { display: flex; flex-wrap: nowrap; gap: 4px; align-items: center; justify-content: flex-start; padding: 2px 6px; border-radius: 14px; background: rgba(255,255,255,.6); border: 2px dashed rgba(59,42,51,.3); min-height: 44px; }
.mny-fives.mny-bykind { flex-direction: row; flex-wrap: wrap; justify-content: center; align-items: center; gap: 4px; width: 100%; }
.mny-knew::before { content: ""; position: absolute; left: -3px; top: 8px; bottom: 8px; width: 0; border-left: 2px dashed rgba(59,42,51,.45); pointer-events: none; }
.mny-row.mny-empty { min-height: 0; }
.mny-paypick { display: block; width: 100%; max-width: 104px; margin: 0 auto; }
.mny-paypick svg { display: block; width: 100%; height: auto; max-height: 64px; }
.mny-paygrid .mny-card .mny-thing { display: block; width: 100%; max-width: 110px; }
.mny-shopcard svg { display: block; width: calc(var(--toonie) * 3.4); max-width: 100%; height: auto; }
.mny-big { display: grid; place-items: center; gap: 6px; }
.mny-card { display: grid; place-items: center; gap: 4px; padding: 10px 14px; background: #fff; border: 3px solid ${INK}; border-radius: 20px; box-shadow: 0 4px 0 ${INK}; font: 800 20px "Baloo 2", sans-serif; min-width: 44px; min-height: 44px; }
.mny-card img { width: calc(var(--toonie) * 1.9); height: auto; aspect-ratio: 1 / 1; display: block; }
.mny-card .mny-pic { --d: 1; }
.mny-boxes { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.mny-box { min-height: 96px; border: 3px dashed ${INK}; border-radius: 18px; padding: 24px 6px 6px; position: relative; display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; align-items: center; }
.mny-box .mny-tag { left: 50%; transform: translate(-50%, -40%); }
.mny-box.need { background: #e2f8f0; } .mny-box.need .mny-tag { background: #23a483; color: #fff; }
.mny-box.want { background: #ffe4ee; } .mny-box.want .mny-tag { background: #ff6f9f; color: #fff; }
.mny-ex { display: grid; place-items: center; width: calc(var(--toonie) * 1.4); min-width: 56px; min-height: 56px; padding: 4px; background: #fff; border: 3px solid ${INK}; border-radius: 16px; box-shadow: 0 3px 0 ${INK}; cursor: pointer; }
.mny-ex img { width: 100%; height: auto; aspect-ratio: 1 / 1; display: block; }
.mny-paygrid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; align-items: stretch; }
.mny-paygrid .mny-card { min-width: 0; padding: 8px; font-size: 16px; }
.mny-paygrid .mny-card img, .mny-paygrid .mny-card svg { width: 100%; max-width: 110px; }
.mny.mny-compact { gap: 4px; padding: 2px 6px; }
.mny-compact .mny-zone { padding: 15px 4px 4px; margin-top: 6px; border-radius: 16px; }
.mny-compact .mny-zone.purse { margin-top: 12px; }
.mny-compact .mny-row { gap: 4px; }
.mny-compact .mny-tag { font-size: 14px; line-height: 20px; padding: 0 8px; }
.mny-compact .mny-shopline { gap: 6px; font-size: 16px; }
.mny-compact .mny-price { font-size: 19px; line-height: 1.2; padding: 1px 10px 1px 20px; }
.mny-compact .mny-zone.mny-shopzone { padding-top: 4px; padding-bottom: 4px; margin-top: 2px; }
.mny-compact .mny-shopline .mny-pic { width: calc(var(--toonie) * .8); }
.mny-compact .mny-shopline .mny-pic.mny-billpic { width: calc(var(--toonie) * 1.3); }
.mny-compact .mny-trows { gap: 4px; }
.mny-rowsmode .mny-item.ghosted, .mny-cc .mny-item.ghosted { display: none; }
/* short boxes: the sorting boxes sit side by side and wrap, instead of one full-width row each */
.mny-compact .mny-trows { flex-direction: row; flex-wrap: wrap; justify-content: center; }
.mny-compact .mny-trow { flex: 0 1 auto; min-height: 50px; min-width: 56px; padding: 1px 3px; }
.mny-compact .mny-trow .mny-rowname { display: none; }
.mny-compact .mny-trow .mny-row { flex: 0 1 auto; justify-content: center; }
.mny-compact .mny-pic.mny-billpic { width: calc(var(--toonie) * 1.45); }
.mny-purses .mny-pic.mny-billpic { width: calc(var(--toonie) * 1.45); }
.mny-refrow .mny-pic { width: calc(var(--toonie) * var(--d) * .85); }
.mny-refrow .mny-pic.mny-billpic { width: calc(var(--toonie) * 1.45); }
.mny-compact .mny-trow { min-height: 46px; padding: 1px 4px; }
.mny-ghost { position: fixed; z-index: 9999; pointer-events: none; opacity: .92; transform: scale(1.1); filter: drop-shadow(0 8px 6px rgba(59,42,51,.3)); }
/* Small screens (2026-10-15, round 2). With no running total she must read every coin's value herself, so a coin
   is never drawn smaller than about 38 px (dime) to 42 px (toonie): bigger coins stay bigger, as in real life.
   The 44 px tap button is around it anyway, so this costs almost no room. When the coins are small the face
   shows only its value, big (class mny-plain, set by the sizing step), like the riddle answer chips. */
.mny-pic:not(.mny-billpic) { width: max(calc(var(--toonie) * var(--d)), calc(31px + 11px * var(--d))); }
.mny-refrow .mny-pic:not(.mny-billpic) { width: max(calc(var(--toonie) * var(--d) * .85), calc(31px + 11px * var(--d))); }
.mny-compact .mny-shopline .mny-pic:not(.mny-billpic) { width: max(calc(var(--toonie) * .8), calc(31px + 11px * var(--d))); }
/* very short boxes (iPhone SE): the coin bank drops its "Coins" label (the coins say what they are), so a tray
   with two rows of coins still fits without scrolling */
.mny-compact .mny-zone.bank { padding-top: 4px; }
.mny-compact .mny-zone.bank > .mny-tag { display: none; }
/* small screens: the dashed frame is drawn as an outline inside the frame, so it costs no height (2026-10-16) */
.mny-compact .mny-five { padding: 0 3px; gap: 3px; border: 0; min-height: 44px; outline: 2px dashed rgba(59,42,51,.3); outline-offset: -2px; }
.mny-compact .mny-fives { gap: 3px; }
.mny-compact .mny-fives.mny-bykind { gap: 3px 4px; }
.mny-compact.mny-cp .mny-zone.tray { padding-bottom: 2px; }
/* the coin bank has no label on a small screen, so it needs no room above it */
.mny-compact.mny-cp .mny-zone.bank { margin-top: 0; padding-top: 2px; }
.mny-compact.mny-cp .mny-zone.tray .mny-row { gap: 3px; }
/* Pay the shop with a small coin bank (one to three coins, no bills) on a small screen: the start-again button
   sits up beside the coin bank, right of its coins, so the tray has room for three rows of five (2026-10-16).
   (2026-10-16: Coin riddles no longer does this. Its bank holds up to five coins, and the button sat on one.) */
.mny-compact.mny-malow .mny-zone.bank { margin-top: 0; padding-top: 2px; padding-bottom: 2px; }
.mny-compact.mny-malow .mny-zone.tray { padding-top: 10px; padding-bottom: 2px; }
.mny-compact.mny-malow .mny-btn.round { top: -34px; }
.mny.mny-plain .mny-cfull { display: none; } .mny.mny-plain .mny-cplain { display: inline; }
.mny.mny-plainref .mny-refrow .mny-cfull { display: none; } .mny.mny-plainref .mny-refrow .mny-cplain { display: inline; }
.mny-ghost.mny-plain .mny-cfull { display: none; } .mny-ghost.mny-plain .mny-cplain { display: inline; }
/* every digit the same width (the font shorthand above resets this), so a price is as wide as any other with as many digits */
.mny-tag, .mny-price, .mny-shopline, .mny-badge { font-variant-numeric: tabular-nums; }
.mny-five.mny-bills { flex-wrap: wrap; justify-content: center; }
/* Third and last size step (2026-10-16, round 4): very short boards, such as an iPhone SE while Kitty's hint is
   showing. Only empty room goes: thinner frames, no gap above a frame, no padding around a coin (the tap target
   stays 44 px), no "Purse" label (the pink purse says it), and an empty purse folds to a thin strip. The start-again button
   moves up beside the coin bank, so it never sits on a coin. */
.mny.mny-tiny { gap: 3px; padding: 2px 4px; }
.mny-tiny .mny-item { padding: 0; }
.mny-tiny .mny-zone { margin-top: 0; border-width: 2px; border-radius: 14px; box-shadow: 0 2px 0 ${INK}; padding: 2px; }
.mny-tiny .mny-zone.purse { margin-top: 0; padding-top: 2px; }
.mny-tiny .mny-zone.purse::before, .mny-tiny .mny-zone.purse > .mny-tag { display: none; }
.mny-tiny .mny-zone.purse.mny-gone { min-height: 18px; padding: 0; }  /* an empty purse folds to a thin strip (the start-again button sits on it) */
.mny-tiny .mny-zone.tray { padding-top: 13px; padding-bottom: 2px; }
.mny-tiny .mny-zone.bank { padding: 2px; }
.mny-tiny .mny-zone.bank .mny-row { justify-content: flex-start; min-height: 44px; padding-right: 46px; }  /* room for the start-again button */
.mny-tiny .mny-five { min-height: 44px; padding: 0 2px; gap: 2px; }
.mny-tiny .mny-badge.tick { top: -2px; }  /* round 5: the tick no longer reaches up into the tray label */
.mny-tiny .mny-fives, .mny-tiny .mny-row, .mny-tiny .mny-fives.mny-bykind { gap: 2px; }
.mny.mny-tiny .mny-btn.round { top: -55px; right: 2px; }
.mny-tiny.mny-cc .mny-zone.tray { padding-top: 24px; }
.mny.mny-tiny.mny-cc .mny-btn.round { top: -22px; right: 4px; }
/* Same money: the top purse keeps its label (it gives the amount) and the button stays at the tray's corner */
.mny-tiny.mny-same .mny-zone.purse { margin-top: 10px; padding-top: 14px; }
.mny-tiny.mny-same .mny-zone.purse > .mny-tag { display: block; }
.mny-tiny.mny-same .mny-zone.tray { padding-top: 24px; }
.mny.mny-tiny.mny-same .mny-btn.round { top: -22px; right: 4px; }
`;
  function ensureCss() {
    if (typeof document === "undefined" || document.getElementById("mny-css")) return;
    const s = document.createElement("style"); s.id = "mny-css"; s.textContent = CSS; document.head.appendChild(s);
  }
  ensureCss();

  /* ================= The board: shared tap / drag / teach plumbing ================= */
  const BOARDS = new WeakMap();
  const LIVE = new Set();  /* boards on screen (one at a time in the game) */
  /* below this toonie size a dime is under about 44 px: coins show the plain, big-value face */
  const PLAIN_T = 70;
  function Board(el, api, cls) {
    ensureCss();
    const prev = BOARDS.get(el); if (prev) prev.destroy();
    const root = document.createElement("div");
    root.className = "mny " + (cls || "");
    el.appendChild(root);
    const b = { root, api, el, next: new Set(), waiters: [], allow: null, dead: false, lastDrag: 0, handle: () => null, render: () => {}, fit: () => {}, hlKey: "" };
    b.emit = ev => { const keep = []; for (const w of b.waiters) { if (w.pred(ev)) w.res(ev); else keep.push(w); } b.waiters = keep; };
    b.wait = pred => new Promise(res => { if (b.dead) res(DEAD); else b.waiters.push({ pred, res }); });
    b.setNext = keys => { b.next = new Set(keys || []); b.applyNext(); };
    b.applyNext = () => {
      root.querySelectorAll(".mny-next").forEach(x => x.classList.remove("mny-next"));
      let first = null;
      root.querySelectorAll("[data-key]").forEach(x => { if (b.next.has(x.dataset.key) && !x.classList.contains("ghosted")) { x.classList.add("mny-next"); first = first || x; } });
      const hk = [...b.next].join("|");
      if (first && hk !== b.hlKey) { b.hlKey = hk; try { api.highlight && api.highlight(first); } catch (e) {} try { first.scrollIntoView({ block: "nearest" }); } catch (e) {} }
    };
    b.nudge = key => {
      try { api.tone && api.tone([300], .12, "triangle"); } catch (e) {}
      const t = key && root.querySelector(`[data-key="${CSS_ESC(key)}"]`);
      if (t) { t.classList.remove("mny-shake"); void t.offsetWidth; t.classList.add("mny-shake"); }
      try { api.speak && api.speak("Tap the shiny one."); } catch (e) {}
    };
    b.act = (key, drop) => {
      if (b.dead) return;
      if (b.allow && !b.allow(key, drop)) { b.nudge(key); return; }
      const ev = b.handle(key, drop);
      if (ev) { b.render(); b.applyNext(); b.emit(ev); }
    };
    b.draw = () => { b.render(); b.applyNext(); };
    /* taps */
    const onClick = e => {
      const t = e.target.closest("[data-key]");
      if (!t || !root.contains(t) || t.disabled) return;
      if (performance.now() - b.lastDrag < 350) return;
      b.act(t.dataset.key, null);
    };
    root.addEventListener("click", onClick);
    /* drags (pointer events; tap still works without dragging) */
    let drag = null, ghost = null, overZone = null;
    const clearGhost = () => { if (ghost) ghost.remove(); ghost = null; if (overZone) overZone.classList.remove("drop-on"); overZone = null; if (drag && drag.it) drag.it.classList.remove("lift"); };
    const onDown = e => {
      const it = e.target.closest("[data-drag]");
      if (!it || !root.contains(it) || e.button > 0) return;
      drag = { it, id: e.pointerId, x: e.clientX, y: e.clientY, moved: false };
    };
    const onMove = e => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!drag.moved) {
        if (Math.hypot(dx, dy) < 10) return;
        drag.moved = true;
        try { drag.it.setPointerCapture(e.pointerId); } catch (er) {}
        const r = drag.it.getBoundingClientRect();
        ghost = drag.it.cloneNode(true); ghost.classList.add("mny-ghost"); ghost.classList.remove("mny-next"); ghost.classList.toggle("mny-plain", root.classList.contains("mny-plain"));
        ghost.style.width = r.width + "px"; ghost.style.setProperty("--toonie", getComputedStyle(root).getPropertyValue("--toonie"));
        ghost.style.left = r.left + "px"; ghost.style.top = r.top + "px"; ghost.dataset.w = r.width; ghost.dataset.h = r.height;
        document.body.appendChild(ghost); drag.it.classList.add("lift");
      }
      e.preventDefault();
      ghost.style.left = (e.clientX - ghost.dataset.w / 2) + "px"; ghost.style.top = (e.clientY - ghost.dataset.h / 2) + "px";
      const under = document.elementFromPoint(e.clientX, e.clientY);
      const z = under && under.closest("[data-drop]");
      if (z !== overZone) { if (overZone) overZone.classList.remove("drop-on"); overZone = z && root.contains(z) ? z : null; if (overZone) overZone.classList.add("drop-on"); }
    };
    const onUp = e => {
      if (!drag || e.pointerId !== drag.id) return;
      const d = drag, zone = overZone;
      clearGhost(); drag = null;
      if (d.moved) {
        b.lastDrag = performance.now();
        if (zone) b.act(d.it.dataset.key, zone.dataset.drop);
      }
    };
    const onCancel = () => { clearGhost(); drag = null; };
    root.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    /* size */
    let raf = 0, lastSize = "";
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => {
      const s = el.clientWidth + "x" + el.clientHeight; if (s === lastSize) return; lastSize = s;
      /* round 4: sized at once, inside the observer (it runs after layout and before the screen is painted), so a
         new size never shows one frame of cut-off money (WebKit showed 3 px for about 70 ms). The money never changes
         the box's own size, so this cannot loop. */
      cancelAnimationFrame(raf); if (!b.dead) { b.fit(); b.draw(); }
    }) : null;
    if (ro) ro.observe(el);
    /* round 5: when Kitty's bubble changes height, the board is sized again at once, not one or more frames later
       when the observer gets to it (headless WebKit showed 4 px of cut-off money for about 80 ms after a lesson tap) */
    b.sync = () => { if (b.dead) return; const s = el.clientWidth + "x" + el.clientHeight; if (s === lastSize || !el.clientWidth) return; lastSize = s; b.fit(); b.draw(); };
    LIVE.add(b);
    b.destroy = () => {
      if (b.dead) return;
      b.dead = true; clearGhost(); if (b.disarm) b.disarm(); LIVE.delete(b);
      b.waiters.forEach(w => w.res(DEAD)); b.waiters = [];
      if (ro) ro.disconnect(); cancelAnimationFrame(raf);
      root.removeEventListener("click", onClick); root.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); window.removeEventListener("pointercancel", onCancel);
      root.remove(); if (BOARDS.get(el) === b) BOARDS.delete(el);
    };
    /* shrink the money until everything fits the box (never sideways) */
    b.fitCache = {};
    b.fitWith = (drawFull, maxT, minT, key) => {
      const w = el.clientWidth, h = el.clientHeight;
      if (!w || !h) return;
      /* same box size and same layout as before: reuse the answer (the lesson bubble changes height often) */
      const ck = key != null ? key + "@" + w + "x" + h : null;
      if (ck && b.fitCache[ck]) { const c = b.fitCache[ck]; root.style.setProperty("--toonie", c.t + "px"); root.classList.toggle("mny-compact", c.compact); root.classList.toggle("mny-tiny", c.tiny); root.toggleAttribute("data-fit-over", c.over); root.classList.toggle("mny-tight", c.t <= minT); root.classList.toggle("mny-plain", c.t < PLAIN_T); root.classList.toggle("mny-plainref", c.t < PLAIN_T / .85); return; }
      root.classList.remove("mny-compact", "mny-tiny");
      const draws = Array.isArray(drawFull) ? drawFull : [drawFull];
      /* the drawing that did not fit last time is tried first next time: most sizes that are too big are found at once */
      const over = () => draws.some((d, i) => { d(); const o = root.scrollHeight > root.clientHeight + 1 || root.scrollWidth > root.clientWidth; if (o && i) { draws.splice(i, 1); draws.unshift(d); } return o; });
      const set = t => root.style.setProperty("--toonie", t + "px");
      const fits = t => { set(t); return !over(); };
      /* the biggest money size that fits (binary search: quick even with many layouts to try) */
      /* shrink(cap): the biggest money size that fits, at most cap. ok is false when even the smallest is too big. */
      const shrink = cap => {
        let hi = Math.max(minT, Math.min(maxT, cap || maxT, Math.floor(w / 4.2)));
        if (fits(hi)) return { t: hi, ok: true };
        let lo = minT;
        if (hi === lo || !fits(lo)) { set(lo); return { t: lo, ok: false }; }
        while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (fits(mid)) lo = mid; else hi = mid; }
        set(lo); return { t: lo, ok: true };
      };
      /* round 4 (speed): when the box only got smaller (Kitty's hint appeared), the frames can only get tighter, so the
         search starts at the last size step. (The money size is still searched from the top, so the same box always
         gives the same money size, whatever came before.) */
      const last = key != null && b.lastFit && b.lastFit.key === key && w <= b.lastFit.w && h <= b.lastFit.h ? b.lastFit : null;
      let r;
      if (last && last.tiny) { root.classList.add("mny-compact", "mny-tiny"); r = shrink(); }
      else {
        if (last && last.compact) root.classList.add("mny-compact");
        r = shrink();
        /* still too tall at the smallest coins: tighten the frames (never the 44px tap targets) */
        if (!r.ok && !root.classList.contains("mny-compact")) { root.classList.add("mny-compact"); r = shrink(); }
        /* still too tall: the last size step (thin frames, no empty room; see .mny-tiny) */
        if (!r.ok) { root.classList.add("mny-tiny"); r = shrink(); }
      }
      let t = r.t;
      /* 2026-10-16: never accept a cut-off picture quietly. The tests fail on this warning. */
      /* (only when the box keeps this size: while the game lays out its screen the box is briefly smaller, and the
         money is sized again when it grows) */
      const tooBig = !r.ok;
      root.toggleAttribute("data-fit-over", tooBig);  /* read by the tests straight away */
      if (tooBig) {
        const msg = "money: the picture does not fit even at the smallest money size (" + (key || root.className) + " " + w + "x" + h + ")";
        setTimeout(() => { if (!b.dead && el.clientWidth === w && el.clientHeight === h) { try { console.warn(msg); } catch (e) {} } }, 300);
      }
      root.classList.toggle("mny-tight", t <= minT);
      root.classList.toggle("mny-plain", t < PLAIN_T);
      root.classList.toggle("mny-plainref", t < PLAIN_T / .85);  /* the Same money reference coins are drawn 85% size */
      if (ck) b.fitCache[ck] = { t, compact: root.classList.contains("mny-compact"), tiny: root.classList.contains("mny-tiny"), over: tooBig };
      b.lastFit = { key, w, h, t, compact: root.classList.contains("mny-compact"), tiny: root.classList.contains("mny-tiny") };
    };
    /* Lesson rule step 4 (2026-10-16, round 5): when her answer right after Kitty's lesson is still wrong, Kitty
       counts all of it with her, tap by tap, out loud. The game tells a topic nothing about a wrong answer, so the
       board watches Kitty's speech bubble: both game screens say "Not quite..." for that first wrong answer after a
       lesson (the second one shows the answer faintly). Armed only once a lesson has ended; fires once. */
    b.armAlong = fn => {
      if (b.disarm) b.disarm();
      const host = el.closest(".tp-app, .app") || document;
      const bub = host.querySelector(".tp-bubble, #bubble");
      if (!bub || typeof MutationObserver === "undefined") return;
      let fired = false;
      const mo = new MutationObserver(() => {
        if (fired || b.dead) return;
        if (/^\s*Not quite/.test(bub.textContent || "")) { fired = true; mo.disconnect(); b.disarm = null; lesson(fn); }
      });
      mo.observe(bub, { childList: true, characterData: true, subtree: true });
      b.disarm = () => { mo.disconnect(); b.disarm = null; };
    };
    BOARDS.set(el, b);
    return b;
  }
  const CSS_ESC = s => (window.CSS && CSS.escape) ? CSS.escape(s) : String(s).replace(/"/g, '\\"');
  const item = (key, id, opts = {}) => `<button type="button" class="mny-item${MONEY[id].kind === "bill" ? " mny-isbill" : ""}${opts.cls ? " " + opts.cls : ""}" data-key="${key}"${opts.drag ? ' data-drag="1"' : ""} aria-label="${opts.aria || MONEY[id].name}">${pic(id)}${opts.badge != null ? `<span class="mny-badge${opts.badgeCls ? " " + opts.badgeCls : ""}">${opts.badge}</span>` : ""}</button>`;
  const say = (api, t) => { try { api.say(t); } catch (e) {} LIVE.forEach(x => { if (x.api === api) x.sync(); }); };
  const speak = (api, t) => { try { api.speak(t); } catch (e) {} };
  const tone = (api, f, d) => { try { api.tone(f, d || .06); } catch (e) {} };
  const getBoard = (el, Q, api, topic) => { let b = BOARDS.get(el); if (!b || b.dead || b.Q !== Q) { topic.mount(el, Q, api); b = BOARDS.get(el); } return b; };
  /* run a lesson; if the board is destroyed part way, finish quietly so the host never hangs */
  const lesson = fn => fn().catch(e => { if (e !== DEAD) console.error(e); });
  const step = async (b, pred) => { const ev = await b.wait(pred); if (ev === DEAD) throw DEAD; return ev; };
  const amountShort = c => fmt(c);
  /* Lesson rule (2026-10-16, round 5, from the lead): Kitty shows HOW on the first part only, then says "Your turn.
     Keep counting." and Marie counts the rest (each tap gets a tick, never a number). Kitty never says or shows the
     final count or total. showN: how many pieces Kitty may count out loud: at most 2, and at least 2 always left for
     Marie (so 2 pieces: none, 3: one). safeK: fewer still if a number Kitty would say or show is the answer. */
  const showN = n => Math.max(0, Math.min(2, n - 2));
  const hasNum = (txt, a) => new RegExp("(^|[^0-9.])" + String(a).replace(/[^0-9]/g, "") + "(?![0-9])").test(String(txt));
  const safeK = (k, texts, answer) => { if (!/^\d+$/.test(String(answer))) return k; while (k > 0 && texts.slice(0, k).some(t => hasNum(t, answer))) k--; return k; };
  const YOUR_TURN = "Your turn. Keep counting.";

  /* ================= Topic icons (64 x 64) ================= */
  const ICON = {
    coins: `<svg viewBox="0 0 64 64"><ellipse cx="32" cy="50" rx="22" ry="8" fill="#d29a1a" stroke="${INK}" stroke-width="3"/><ellipse cx="32" cy="44" rx="22" ry="8" fill="#ffcf4a" stroke="${INK}" stroke-width="3"/><ellipse cx="32" cy="36" rx="22" ry="8" fill="#d3d7de" stroke="${INK}" stroke-width="3"/><circle cx="32" cy="22" r="16" fill="#ffcf4a" stroke="${INK}" stroke-width="3"/><text x="32" y="29" text-anchor="middle" font-family="'Baloo 2',sans-serif" font-weight="800" font-size="20" fill="${INK}">$</text></svg>`,
    shop: `<svg viewBox="0 0 64 64"><path d="M10 26 L54 26 L50 58 L14 58 Z" fill="#ff6f9f" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><path d="M8 14 H56 L54 26 H10 Z" fill="#fff" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><path d="M18 14 L16 26 M30 14 L29 26 M42 14 L42 26" stroke="${INK}" stroke-width="2.5"/><circle cx="32" cy="42" r="10" fill="#ffcf4a" stroke="${INK}" stroke-width="3"/><text x="32" y="47" text-anchor="middle" font-family="'Baloo 2',sans-serif" font-weight="800" font-size="13" fill="${INK}">¢</text></svg>`,
    puzzle: `<svg viewBox="0 0 64 64"><circle cx="24" cy="38" r="17" fill="#d3d7de" stroke="${INK}" stroke-width="3"/><circle cx="42" cy="28" r="18" fill="#ffcf4a" stroke="${INK}" stroke-width="3"/><text x="42" y="37" text-anchor="middle" font-family="'Baloo 2',sans-serif" font-weight="800" font-size="25" fill="${INK}">?</text></svg>`,
    piggy: `<svg viewBox="0 0 64 64"><ellipse cx="32" cy="38" rx="22" ry="16" fill="#ff9fc0" stroke="${INK}" stroke-width="3"/><path d="M18 26 L16 16 L26 23 Z" fill="#ff9fc0" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><rect x="18" y="50" width="7" height="9" rx="3" fill="#ff9fc0" stroke="${INK}" stroke-width="3"/><rect x="39" y="50" width="7" height="9" rx="3" fill="#ff9fc0" stroke="${INK}" stroke-width="3"/><ellipse cx="53" cy="38" rx="5" ry="6" fill="#ffc4d8" stroke="${INK}" stroke-width="3"/><circle cx="42" cy="33" r="2.5" fill="${INK}"/><rect x="26" y="20" width="12" height="4" rx="2" fill="${INK}"/><circle cx="32" cy="8" r="6" fill="#ffcf4a" stroke="${INK}" stroke-width="3"/></svg>`
  };

  /* =====================================================================
     1. coins_count: count the money in a purse
     ===================================================================== */
  const CC_LEVELS = [
    { name: "One kind of coin", grade: 1, note: "Count 2-10 of the same coin (nickels, dimes or quarters up to 100¢; sometimes loonies or toonies up to $10)." },
    { name: "Two kinds of coins", grade: 2, note: "Two kinds of coin, up to 100¢. Count the bigger coins first." },
    { name: "Quarters, dimes, nickels", grade: 2, note: "Quarters, dimes and nickels mixed, up to 100¢." },
    { name: "Loonies and toonies", grade: 3, note: "Toonies, loonies and coins, whole dollars only, up to $10. No decimal point needed." },
    { name: "Bills and coins", grade: 3, note: "Bills ($5 to $50) with loonies and toonies, whole dollars up to $100." }
  ];
  function ccGen(level) {
    let coins;
    if (level === 1) {
      if (Math.random() < 0.7) { const t = pick(["nickel", "dime", "quarter"]); coins = rep(t, t === "quarter" ? rnd(2, 4) : rnd(2, 10)); }
      else { const t = pick(["loonie", "toonie"]); coins = rep(t, t === "loonie" ? rnd(2, 10) : rnd(2, 5)); }
    } else if (level === 2) {
      const [a, b] = pick([["quarter", "dime"], ["quarter", "nickel"], ["dime", "nickel"]]);
      /* 5 of a kind at most (2026-10-16): 6 nickels make a row of five and a row of one, and with the quarters that was
         three lines in the tray, too tall for an iPhone SE */
      do { coins = rep(a, rnd(1, a === "quarter" ? 3 : 5)).concat(rep(b, rnd(1, 5))); } while (sum(coins) > 100 || coins.length > 8 || coins.length < 3);
    } else if (level === 3) {
      do { coins = rep("quarter", rnd(1, 3)).concat(rep("dime", rnd(1, 4)), rep("nickel", rnd(1, 4))); } while (sum(coins) > 100 || coins.length > 9);
    } else if (level === 4) {
      do {
        const extra = pick([[], [], rep("quarter", 4), rep("quarter", 2).concat(rep("dime", 5))]);
        coins = rep("toonie", rnd(1, 3)).concat(rep("loonie", rnd(1, 4)), extra);
      } while (sum(coins) > 1000 || sum(coins) < 300 || coins.length > 8);  /* 8 coins at most: the purse and the tray both fit an iPhone SE */
    } else {
      do {
        const bills = Array.from({ length: rnd(1, 3) }, () => pick(["five", "ten", "twenty", "fifty"]));
        coins = bills.concat(rep("toonie", rnd(0, 3)), rep("loonie", rnd(0, 3)));
      } while (sum(coins) > 10000 || sum(coins) < 1000 || coins.length > 6 || coins.length < 3);  /* bills are wide: 6 pieces at most for an iPhone SE */
    }
    const total = sum(coins), dollars = total >= 100 && coins.every(c => val(c) >= 100) || level >= 4;
    const unit = dollars ? "$" : "¢";
    /* 2026-10-15: the question no longer lists the coins ("6 loonies", "3 quarters + 2 dimes"). That list did
       her counting for her, and with one kind of coin it was nearly the answer. She counts them in the picture. */
    const show = "How much money is in the purse?";
    return {
      key: "cc" + level + ":" + keyOf(coins),
      say: "How much money is in the purse?",
      show,
      answer: String(dollars ? total / 100 : total),
      input: { type: "number", unit },
      data: { kind: "count", level, coins: shuffle(coins), unit }
    };
  }
  function ccMount(el, Q, api) {
    const b = Board(el, api, "mny-cc"); b.Q = Q;
    const U = Q.data.unit;
    /* running counts: written like real money ($7.25, never $7.25 as "$7.3" or "$0.1"); said as words */
    const amt = c => U === "$" ? (c % 100 ? fmt(c) : "$" + c / 100) : c + "¢";
    const sayRun = c => U === "$" ? (c % 100 ? spoken(c) : String(c / 100)) : String(c);
    const S = { items: [], tray: [], rows: null, counting: false };
    /* lesson rows: all bills share one row (biggest first), each kind of coin has its own row */
    const groupOf = id => MONEY[id].kind === "bill" ? "bills" : id;
    const rowName = g => g === "bills" ? "bills" : MONEY[g].plural;
    const sortItems = xs => xs.slice().sort((a, b) => val(b.id) - val(a.id));
    const init = () => {
      S.items = Q.data.coins.map((id, i) => ({ uid: "c" + i, id, inTray: false, badge: null }));
      S.tray = []; S.rows = null; S.rowsShown = 1; S.counting = false; S.lesson = false; S.mode = ""; S.countRun = 0; b.allow = null; b.next = new Set(); b.hlKey = "";
      if (b.disarm) b.disarm();
    };
    /* Father's rule: the adding is Marie's job. On her own, the tray never adds up the money for her
       (no running total, no spoken sums). In Kitty's lesson (round 5) S.mode says who counts:
       "show": Kitty counts the first piece or two out loud; "turn": Marie counts on, each piece gets a tick only;
       "done": the lesson is over, she types; "along": her answer after the lesson was wrong, so Kitty counts all of
       it with her out loud. Only "show" and "along" put numbers on the badges and the tray label. */
    const run = () => S.tray.reduce((s, uid) => s + val(S.items.find(x => x.uid === uid).id), 0);
    const trayHTML = full => {
      if (S.rows) {
        /* full: every coin already in its row (the biggest the rows can get), used to size the money */
        return `<div class="mny-trows">${(full ? S.rows : S.rows.slice(0, S.rowsShown || 1)).map(g => `<div class="mny-trow"><span class="mny-rowname">${rowName(g)}</span><div class="mny-row">${sortItems(S.items.filter(x => (full || x.inTray) && groupOf(x.id) === g)).map(x => item("t:" + x.uid, x.id, { badge: full ? "$00.00" : x.badge, badgeCls: !full && x.badge === "✓" ? "tick" : "" })).join("")}</div></div>`).join("")}</div>`;
      }
      const xs = S.tray.map(uid => S.items.find(y => y.uid === uid));
      return `<div class="mny-row">${fives(xs.map(x => x.id), xs.map(x => item("t:" + x.uid, x.id, { badge: x.badge, badgeCls: x.badge === "✓" ? "tick" : "" })), true)}</div>`;
    };
    /* full === true: every coin drawn in the purse and in the tray at once (the most room the picture can need) */
    b.render = full => {
      b.root.classList.toggle("mny-rowsmode", !!S.rows);
      const counted = S.items.filter(x => x.badge != null);
      const numbered = counted.filter(x => x.badgeV != null);
      const runShown = S.mode === "along" ? amt(S.countRun) : S.rows ? numbered.length ? amt(Math.max(...numbered.map(x => x.badgeV))) : amt(0) : amt(run());
      const empty = S.items.every(x => full ? !!S.rows : x.inTray);
      b.root.innerHTML = `
        <div class="mny-zone purse${empty ? " mny-gone" : ""}" data-drop="purse"><span class="mny-tag">Purse</span>
          <div class="mny-row${empty ? " mny-empty" : ""}">${S.items.map(x => item("p:" + x.uid, x.id, { drag: true, cls: (full ? !!S.rows : x.inTray) ? "ghosted" : "" })).join("")}</div></div>
        <div class="mny-zone tray grow" data-drop="tray"><span class="mny-tag" aria-live="polite">${!S.lesson ? "Move here as you count" : S.rows && !S.counting ? "Sort into boxes" : S.mode === "turn" ? "Keep counting" : S.mode === "done" ? "How much?" : S.mode === "along" ? "Count: " + runShown : S.tray.length || S.rows ? "Count: " + runShown : "Move each one here"}</span>
          <button type="button" class="mny-btn round" data-key="reset" aria-label="Start again" ${S.tray.length && !b.allow ? "" : "disabled"}>↺</button>
          ${full && !S.rows ? `<div class="mny-row">${fives(S.items.map(x => x.id), S.items.map(x => item("t:" + x.uid, x.id, { badge: "000" })), true)}</div>` : trayHTML(!!full)}
        </div>`;
    };
    b.fit = () => {
      if (!S.rows) {
        /* a moved coin leaves the purse (it does not keep an empty gap), so the purse shrinks as the tray grows:
           size the money so that every step of moving fits (0 coins moved, 1, 2 ... all of them).
           She may move the coins in any order. */
        const savedIn = S.items.map(x => x.inTray), savedTray = S.tray.slice();
        const stages = [];
        /* quick: the board is drawn once with every coin in the purse AND in the tray, and each step only hides
           coins (no new drawing), so trying a hundred steps stays fast on an old phone. This gives the same picture
           as a real draw: the tray sorts by kind and fills each frame of five in turn, and a moved coin leaves the
           purse with no gap. */
        /* (not with bills: a tray with a bill is drawn as one plain line, a tray of coins in frames, so the full
           drawing would not match. Bills come only on level 5, with 6 pieces at most, so those steps are drawn for real.) */
        const realStage = sel => () => { const moved = new Set(sel); S.items.forEach(x => { x.inTray = moved.has(x); }); S.tray = sel.map(x => x.uid); b.render(false); };
        b.render(true);
        const R = b.root, pz = R.querySelector(".mny-zone.purse"), prow = pz.querySelector(".mny-row");
        const pEl = {}, tEl = {};
        S.items.forEach(x => { pEl[x.uid] = R.querySelector(`[data-key="p:${x.uid}"]`); tEl[x.uid] = R.querySelector(`[data-key="t:${x.uid}"]`); });
        const frames = [...R.querySelectorAll(".tray .mny-five")];
        const stage = sel => () => {
          const moved = new Set(sel.map(x => x.uid));
          S.items.forEach(x => { const m = moved.has(x.uid); pEl[x.uid].style.display = m ? "none" : ""; if (tEl[x.uid]) tEl[x.uid].style.display = m ? "" : "none"; });
          frames.forEach(f => { f.style.display = [...f.children].some(c => c.style.display !== "none") ? "" : "none"; });
          const empty = moved.size === S.items.length;
          pz.classList.toggle("mny-gone", empty); prow.classList.toggle("mny-empty", empty);
        };
        /* 2026-10-16 (round 4): the four orders missed some mixes (a tray of quarter, dime, nickel, nickel with a
           dime left in the purse was 34 px too tall). The tray sorts itself, so what counts is how many of each kind
           she has moved: every such mix is tried instead (the four orders are all among them). */
        let mixes = [[]];
        for (const g of ORDER.map(id => S.items.filter(x => x.id === id)).filter(g => g.length)) {
          const nx = []; for (const m of mixes) for (let j = 0; j <= g.length; j++) nx.push(m.concat(g.slice(0, j))); mixes = nx;
        }
        const anyBill = S.items.some(x => MONEY[x.id].kind === "bill");
        mixes.forEach(m => stages.push(anyBill ? realStage(m) : stage(m)));
        b.fitWith(stages, 120, 42, "free");
        S.items.forEach((x, i) => { x.inTray = savedIn[i]; }); S.tray = savedTray;
        return;
      }
      /* lesson rows: the money must fit at every stage of sorting (purse emptying, rows filling) */
      const groups = S.rows, savedIn = S.items.map(x => x.inTray), savedShown = S.rowsShown;
      const order = groups.flatMap(g => sortItems(S.items.filter(x => groupOf(x.id) === g)));
      const stage = (k, shown) => () => { const moved = new Set(order.slice(0, k)); S.items.forEach(x => { x.inTray = moved.has(x); }); S.rowsShown = shown; b.render(false); };
      const stages = [];
      let k = 0;
      groups.forEach((g, i) => { const n = order.filter(x => groupOf(x.id) === g).length; for (let j = 0; j <= n; j++) stages.push(stage(k + j, i + 1)); k += n; });
      b.fitWith(stages, 120, 42, "rows:" + groups.join(","));
      S.items.forEach((x, k) => { x.inTray = savedIn[k]; }); S.rowsShown = savedShown;
    };
    const moveToTray = uid => {
      const x = S.items.find(y => y.uid === uid); if (!x || x.inTray) return null;
      x.inTray = true; S.tray.push(uid);
      if (!S.rows && S.mode === "show") { x.badgeV = run(); x.badge = amt(x.badgeV); tone(b.api, [560 + Math.min(S.tray.length, 12) * 30]); speak(b.api, sayRun(x.badgeV)); }
      else if (!S.rows && S.mode === "turn") { x.badgeV = null; x.badge = "✓"; tone(b.api, [600]); }
      else tone(b.api, [600]);
      return { type: "move", uid, id: x.id };
    };
    b.handle = (key, drop) => {
      if (key === "reset") { init(); return { type: "reset" }; }
      const [z, uid] = key.split(":");
      if (z === "p" && (drop == null || drop === "tray")) return moveToTray(uid);
      if (z === "t" && (S.counting || S.mode === "along")) {
        const x = S.items.find(y => y.uid === uid); if (!x || !x.inTray || x.badge != null) return null;
        S.countRun += val(x.id);
        if (S.mode === "turn") { x.badgeV = null; x.badge = "✓"; tone(b.api, [600]); }  /* her count: a tick, no number */
        else { x.badgeV = S.countRun; x.badge = amt(S.countRun); tone(b.api, [600 + S.countRun % 400]); speak(b.api, sayRun(S.countRun)); }
        return { type: "count", uid, id: x.id };
      }
      return null;
    };
    init(); b.fit(); b.draw();
    /* pieces in the order Kitty and Marie count them: biggest first, each kind together */
    const countOrder = () => S.rows ? S.rows.flatMap(g => sortItems(S.items.filter(y => groupOf(y.id) === g))) : sortItems(S.tray.map(uid => S.items.find(y => y.uid === uid)));
    /* how many pieces Kitty counts out loud before "Your turn" (never a number that is the answer) */
    const kittyK = () => { let r = 0; return safeK(showN(Q.data.coins.length), sortItems(S.items).map(x => { r += val(x.id); return amt(r) + " " + sayRun(r); }), Q.answer); };
    /* step 4: her answer after the lesson was wrong. Kitty counts every piece with her, out loud. */
    const along = async () => {
      S.items.forEach(x => { x.badge = null; x.badgeV = null; });
      S.countRun = 0; S.mode = "along"; b.allow = key => b.next.has(key); b.draw();
      say(b.api, "Let's count it all together. Tap each one.");
      for (const x of countOrder()) { b.setNext(["t:" + x.uid]); await step(b, ev => ev.type === "count"); }
      b.setNext([]); b.allow = () => false; S.mode = "done"; b.draw();
      say(b.api, "That is all of it. Now type the total.");
    };
    b.teach = () => lesson(async () => {
      init(); S.lesson = true;
      const types = ORDER.filter(id => Q.data.coins.includes(id));
      b.allow = key => b.next.has(key);
      const k = kittyK();
      let done = 0;  /* pieces counted so far (Kitty's and hers) */
      if (types.length === 1) {
        S.rows = types; b.fit(); b.draw();
        S.counting = false;
        const t = types[0];
        S.mode = k ? "show" : "turn";
        say(b.api, `${k ? "" : "Your turn. "}Move each ${MONEY[t].name} to the tray. Count by ${val(t) >= 100 ? val(t) / 100 : val(t)}s.`);
        S.rows = null; b.fit(); b.draw();
        for (const x of S.items) {
          if (done === k && k) { S.mode = "turn"; b.draw(); say(b.api, YOUR_TURN); }
          b.setNext(["p:" + x.uid]); await step(b, ev => ev.type === "move"); done++;
        }
      } else {
        const groups = [...new Set(types.map(groupOf))];
        S.rows = groups; b.fit(); b.draw();
        say(b.api, "Put the big money first. Sort it into boxes.");
        for (let i = 0; i < groups.length; i++) {
          const g = groups[i];
          say(b.api, `${i === 0 ? "Put" : "Now put"} the ${rowName(g)} in ${i === 0 ? "the first box" : "the next box"}.`);
          S.rowsShown = i + 1; b.draw();  /* a new empty row appears for each kind of money */
          for (const x of sortItems(S.items.filter(y => groupOf(y.id) === g))) { b.setNext(["p:" + x.uid]); await step(b, ev => ev.type === "move"); }
        }
        S.counting = true; S.countRun = 0; S.mode = k ? "show" : "turn"; b.draw();
        for (let i = 0; i < groups.length; i++) {
          const g = groups[i];
          const by = g === "bills" ? 0 : val(g) >= 100 ? val(g) / 100 : val(g);
          const how = g === "bills" ? "Count the bills. Biggest first. Tap each one." : i === 0 ? `Count the ${MONEY[g].plural} by ${by}s. Tap each one.` : `Now count on with the ${MONEY[g].plural}.`;
          /* one line per group start; "Your turn" joins the line when her turn starts there */
          if (done === 0) say(b.api, (k ? "" : "Your turn. ") + how);
          else if (done === k && S.mode !== "turn") { S.mode = "turn"; b.draw(); say(b.api, g === "bills" ? YOUR_TURN : `Your turn. Count on with the ${MONEY[g].plural}.`); }
          else say(b.api, how);
          for (const x of sortItems(S.items.filter(y => groupOf(y.id) === g))) {
            if (done === k && k && S.mode !== "turn") { S.mode = "turn"; b.draw(); say(b.api, YOUR_TURN); }
            b.setNext(["t:" + x.uid]); await step(b, ev => ev.type === "count"); done++;
          }
        }
      }
      b.setNext([]); b.allow = () => false; S.mode = "done"; b.draw();
      say(b.api, "How much money is in the purse? Type it.");
      b.armAlong(along);
    });
    return { destroy: () => b.destroy(), reset: () => { init(); b.fit(); b.draw(); } };
  }
  function ccHint(Q, tries) {
    const types = ORDER.filter(id => Q.data.coins.includes(id));
    /* 2026-10-16 (round 4): short hints. On an iPhone SE every extra line in Kitty's bubble takes about 17 px from the
       board, and coins fell out of sight just when she needed the hint. Still how to do it, never the answer. */
    const step = id => val(id) >= 100 ? val(id) / 100 : val(id);
    const name = id => MONEY[id].kind === "bill" ? "bills" : MONEY[id].plural;
    if (types.length === 1) return `Move the ${name(types[0])} one by one. Count by ${step(types[0])}s.`;
    const first = types[0], rest = [...new Set(types.slice(1).map(name))].filter(n => n !== name(first));
    const lead = MONEY[first].kind === "bill" ? "Bills first, biggest first." : `${name(first)[0].toUpperCase() + name(first).slice(1)} first, by ${step(first)}s.`;
    return rest.length ? `${lead} Count on with ${rest.join(", then ")}.` : `${lead} Count on with each one.`;
  }

  /* =====================================================================
     2. make_amount: pay the shop
     ===================================================================== */
  const MA_LEVELS = [
    { name: "Pay with one coin", grade: 1, note: "Pay with one kind of coin (nickels or dimes). How many coins?" },
    { name: "Pay up to 100¢", grade: 2, note: "One kind of coin up to 100¢ (quarters, dimes or nickels). How many coins?" },
    { name: "Fewest coins", grade: 3, note: "Pay with the fewest coins. Biggest coin that fits first." },
    { name: "Count the change", grade: 3, note: "Change from $1 (prices 35¢ to 95¢), then from $5, $10 or $20 with whole-dollar prices (change up to $10). Count up from the price." },
    { name: "Same money, new coins", grade: 3, note: "Which purse also has the same amount? Different coins can make the same money." }
  ];
  /* the most coins a "how many coins" question can need, per level and coin (the tray size comes from this, never
     from the answer) */
  const MA_MAX = { 1: { nickel: 10, dime: 10 }, 2: { quarter: 4, dime: 10, nickel: 12 } };
  function greedy(amount, denoms) { const out = []; let r = amount; for (const id of sortBig(denoms)) while (val(id) <= r) { out.push(id); r -= val(id); } return r === 0 ? out : null; }
  function randomSet(target, denoms, minN, maxN, avoidKeys) {
    for (let tries = 0; tries < 400; tries++) {
      const out = []; let r = target;
      while (r > 0 && out.length < maxN) { const ok = denoms.filter(id => val(id) <= r); if (!ok.length) break; const id = pick(ok); out.push(id); r -= val(id); }
      if (r === 0 && out.length >= minN && !(avoidKeys || []).includes(keyOf(out))) return out;
    }
    return null;
  }
  function maGen(level) {
    if (level === 1 || level === 2) {
      let coin, n;
      if (level === 1) { coin = pick(["nickel", "dime"]); n = rnd(2, MA_MAX[1][coin]); }
      else { coin = pick(["quarter", "dime", "nickel"]); n = rnd(coin === "quarter" ? 2 : 3, MA_MAX[2][coin]); }
      const target = n * val(coin);
      return { key: "ma" + level + ":" + coin + ":" + target, say: `Pay ${spoken(target)} with ${MONEY[coin].plural}. How many ${MONEY[coin].plural}?`, show: `Pay ${fmt(target)} with ${MONEY[coin].plural}. How many?`, answer: String(n), input: { type: "number", unit: "" }, data: { kind: "count", level, coin, target, bank: [coin] } };
    }
    if (level === 3) {
      const target = 5 * rnd(3, 19);
      const bank = ["quarter", "dime", "nickel"];
      return { key: "ma3:" + target, say: `Pay ${spoken(target)} with the fewest coins. How many coins?`, show: `Pay ${fmt(target)} with the fewest coins. How many coins?`, answer: String(greedy(target, bank).length), input: { type: "number", unit: "" }, data: { kind: "fewest", level, target, bank } };
    }
    if (level === 4) {
      if (Math.random() < 0.55) {
        /* 2026-10-16 (round 4): prices from 35¢, so counting up by nickels (the easiest way) needs 13 nickels at most,
           and the tray holds 15 (two spare). A lower price needed up to 19 nickels: the tray stopped her part way,
           and 21 coins cannot fit an iPhone SE board with 44 px coins. */
        const price = 5 * rnd(7, 19), paid = "loonie";
        return { key: "ma4:" + price + ":" + paid, say: `It costs ${spoken(price)}. You pay with a loonie. How much change?`, show: `It costs ${fmt(price)}. You pay $1. Change?`, answer: String(100 - price), input: { type: "number", unit: "¢" }, data: { kind: "change", level, price, paid, unit: "¢", bank: ["quarter", "dime", "nickel"] } };
      }
      const paid = pick(["five", "ten", "twenty"]), P = val(paid) / 100;
      /* change up to $10 (round 4): counting up by loonies needs 10 at most; the tray holds 12 pieces */
      const price = rnd(Math.max(1, P - 10), P - 1) * 100;
      const bank = { five: ["toonie", "loonie"], ten: ["five", "toonie", "loonie"], twenty: ["ten", "five", "toonie", "loonie"] }[paid];
      return { key: "ma4:" + price + ":" + paid, say: `It costs ${spoken(price)}. You pay with a ${MONEY[paid].name}. How much change?`, show: `It costs ${fmt(price)}. You pay ${MONEY[paid].label}. Change?`, answer: String((val(paid) - price) / 100), input: { type: "number", unit: "$" }, data: { kind: "change", level, price, paid, unit: "$", bank } };
    }
    /* level 5: which purse also has the amount (choice). At most 4 coins, or 3 pieces when there are bills (bills are wide), in each purse,
       so all four purses fit an iPhone SE with every coin still 44px or more to tap. */
    for (let guard = 0; guard < 200; guard++) {
      let target, denoms, ref, good, bad = [];
      if (Math.random() < 0.6) {
        target = 5 * rnd(6, 20); denoms = ["quarter", "dime", "nickel"];
        ref = randomSet(target, denoms, 2, 4); if (!ref) continue;
        good = randomSet(target, denoms, 2, 4, [keyOf(ref)]); if (!good) continue;
        const offs = shuffle([-25, -15, -10, -5, 5, 10, 15, 25]);
        for (const o of offs) { if (bad.length === 2) break; const t = target + o; if (t < 10 || t > 125) continue; const s = randomSet(t, denoms, 2, 4, [keyOf(good), ...bad.map(keyOf)]); if (s) bad.push(s); }
      } else {
        target = pick([1000, 2000, 2500, 3000, 4000, 5000, 10000]);
        denoms = ["hundred", "fifty", "twenty", "ten", "five", "toonie", "loonie"].filter(id => val(id) <= target);
        const refPool = target === 10000 ? [["hundred"]] : target === 5000 ? [["fifty"], ["twenty", "twenty", "ten"]] : null;
        ref = refPool ? pick(refPool) : randomSet(target, denoms, 1, 3); if (!ref) continue;
        good = randomSet(target, denoms, 2, 3, [keyOf(ref)]); if (!good) continue;
        const offs = shuffle([-1000, -500, -200, -100, 100, 200, 500, 1000]);
        for (const o of offs) { if (bad.length === 2) break; const t = target + o; if (t < 500) continue; const s = randomSet(t, denoms, 2, 3, [keyOf(good), ...bad.map(keyOf)]); if (s) bad.push(s); }
      }
      if (bad.length < 2) continue;
      const sets = shuffle([good, ...bad]);
      const letters = ["A", "B", "C"];
      const ans = letters[sets.indexOf(good)];
      return {
        key: "ma5:" + target + ":" + keyOf(ref) + ":" + keyOf(good),
        say: `This purse has ${spoken(target)}. Which other purse also has ${spoken(target)}?`,
        show: `Which purse also has ${fmt(target)}?`,
        answer: ans,
        input: { type: "choice", choices: sets.map((s, i) => ({ value: letters[i], label: "Purse " + letters[i] + ": " + plainLabel(s), html: `<span class="mny-letter mny-l${letters[i]}" style="width:46px;height:46px;font-size:28px">${letters[i]}</span>` })) },
        data: { kind: "same", level, target, ref, sets: sets.map((s, i) => ({ letter: letters[i], ids: s })) }
      };
    }
    throw new Error("make_amount level 5: could not build a question");
  }
  function maMount(el, Q, api) {
    const D = Q.data, b = Board(el, api, "mny-ma" + (D.kind === "same" ? " mny-same" : "") + (D.bank && D.bank.length <= 3 && D.bank.every(id => MONEY[id].kind === "coin") ? " mny-malow" : "")); b.Q = Q;
    const S = {};
    const init = () => { S.tray = []; S.seq = 0; S.badges = {}; S.countRun = 0; S.counting = false; S.countCoins = false; S.purseBadges = {}; S.purseRun = {}; S.lesson = false; S.mode = ""; S.accept = null; b.allow = null; b.next = new Set(); b.hlKey = ""; if (b.disarm) b.disarm(); };
    /* Father's rule: on her own the picture never adds the money up for her. Her taps leave a tick (so she
       knows which coins she has counted) and she does the adding. In Kitty's lesson (round 5) S.mode says who
       counts: "show" (Kitty counts the first one or two out loud), "turn" (Marie counts on: a tick, no number),
       "done" (she types or taps her answer), "along" (her answer after the lesson was wrong: Kitty counts all of it
       with her out loud). */
    const traySum = () => S.tray.reduce((s, x) => s + val(x.id), 0);
    const unit = D.unit || "¢";
    const amt = c => unit === "$" ? "$" + c / 100 : fmt(c);
    if (D.kind === "same") {
      b.render = () => {
        b.root.innerHTML = `
          <div class="mny-zone purse"><span class="mny-tag">This purse: ${fmt(D.target)}</span><div class="mny-row mny-refrow">${sortBig(D.ref).map(pic).join("")}</div></div>
          <div class="mny-zone tray grow"><span class="mny-tag">${S.lesson ? "Count with Kitty" : "Tap as you count"}</span>
            <button type="button" class="mny-btn round" data-key="reset" aria-label="Start again" ${Object.keys(S.purseBadges).length && !b.allow ? "" : "disabled"}>↺</button>
            <div class="mny-purses">${D.sets.map(s => `<div class="mny-prow"><span class="mny-letter mny-l${s.letter}">${s.letter}</span><div class="mny-row">${sortBig(s.ids).map((id, i) => { const k = "s:" + s.letter + ":" + i; return item(k, id, { badge: S.purseBadges[k], badgeCls: S.purseBadges[k] === "✓" ? "tick" : "" }); }).join("")}</div></div>`).join("")}</div>
          </div>`;
      };
      b.handle = key => {
        if (key === "reset") { init(); return { type: "reset" }; }
        const [z, L, i] = key.split(":");
        if (z !== "s" || S.purseBadges[key] != null) return null;
        const s = D.sets.find(x => x.letter === L), id = sortBig(s.ids)[+i];
        S.purseRun[L] = (S.purseRun[L] || 0) + val(id);
        if (S.mode !== "show" && S.mode !== "along") { S.purseBadges[key] = "✓"; tone(b.api, [600]); return { type: "count", key }; }
        S.purseBadges[key] = fmt(S.purseRun[L]);
        tone(b.api, [600]); speak(b.api, S.purseRun[L] < 100 ? String(S.purseRun[L]) : spoken(S.purseRun[L]));
        return { type: "count", key };
      };
      b.fit = () => b.fitWith(() => { const keep = S.purseBadges; S.purseBadges = {}; D.sets.forEach(s => s.ids.forEach((_, i) => S.purseBadges["s:" + s.letter + ":" + i] = "$00")); b.render(); S.purseBadges = keep; }, 88, 44);
      init(); b.fit(); b.draw();
      /* step 4: her choice after the lesson was wrong. Kitty counts every purse with her, out loud. */
      const alongSame = async () => {
        S.purseBadges = {}; S.purseRun = {}; S.mode = "along"; b.allow = key => b.next.has(key); b.draw();
        say(b.api, "Let's count every purse together. Tap each one.");
        for (const s of D.sets) {
          for (let i = 0; i < s.ids.length; i++) { b.setNext(["s:" + s.letter + ":" + i]); await step(b, ev => ev.type === "count"); }
          speak(b.api, `Purse ${s.letter} has ${spoken(S.purseRun[s.letter])}.`);
        }
        b.setNext([]); b.allow = () => false; S.mode = "done"; b.draw();
        say(b.api, `Which purse has ${fmt(D.target)}? Tap it.`);
      };
      b.teach = () => lesson(async () => {
        init(); S.lesson = true; b.allow = key => b.next.has(key);
        /* Kitty counts the first coin or two of purse A with her, never a whole purse (its amount would give the answer) */
        /* (and never as far as the amount asked: "$30" said on purse A would tell her too much) */
        const pA = sortBig(D.sets[0].ids);
        /* round 6 (2026-10-16): showN, like the other lessons: at least 2 pieces of purse A are always left for her.
           Before, Kitty could leave only 1, and Kitty's last number plus that one piece was the amount asked. */
        let k = showN(pA.length);
        while (k > 0 && sum(pA.slice(0, k)) >= D.target) k--;
        S.mode = k ? "show" : "turn"; b.draw();
        say(b.api, `${k ? "" : "Your turn. "}Count purse A. Biggest first. Tap each one.`);
        let done = 0;
        for (const s of D.sets) {
          if (s !== D.sets[0]) say(b.api, `Now count purse ${s.letter}. Tap each one.`);
          for (let i = 0; i < s.ids.length; i++) {
            if (done === k && k && S.mode !== "turn") { S.mode = "turn"; b.draw(); say(b.api, YOUR_TURN); }
            b.setNext(["s:" + s.letter + ":" + i]); await step(b, ev => ev.type === "count"); done++;
          }
        }
        b.setNext([]); b.allow = () => false; S.mode = "done"; b.draw();
        say(b.api, `Which purse has ${fmt(D.target)}? Tap it.`);
        b.armAlong(alongSame);
      });
      return { destroy: () => b.destroy(), reset: () => { init(); b.draw(); } };
    }
    const isChange = D.kind === "change";
    b.render = full => {
      /* while sizing, the price is written as the widest price this question type can have, so the money size never
         depends on the price (and so never on the answer) (round 4) */
      const price = S.fitPrice && isChange ? (unit === "$" ? val(D.paid) - 100 : 95) : D.price;
      const n = S.tray.length, run = (isChange ? price : 0) + traySum();
      const goal = isChange ? val(D.paid) : 0;
      let readout;
      /* on her own: the tray says what to do, never a running sum or a coin count (those are her job) */
      if (isChange && S.lesson && S.counting) readout = `<span class="mny-tag" aria-live="polite">${S.mode === "along" ? "Count: " + amt(S.countRun) : "Count what you added"}</span>`;
      else if (isChange && S.lesson) {
        /* the count-up is said and shown only while Kitty shows how; on her turn she counts up herself */
        const st = run === goal ? "ok" : run > goal ? "over" : "";
        readout = `<span class="mny-tag ${st}" aria-live="polite">${run === goal ? `✓ You reached ${amt(goal)}!` : run > goal ? "Too much! Take one back" : S.mode === "show" ? "Count up: " + amt(run) : `Count up from ${amt(price)} to ${amt(goal)}`}</span>`;
      } else if (isChange) readout = `<span class="mny-tag" aria-live="polite">Count up from ${amt(price)} to ${amt(val(D.paid))}</span>`;
      else readout = `<span class="mny-tag lilac" aria-live="polite">${S.counting ? "Tap each coin to count it" : "Pay here"}</span>`;
      const trayItems = full ? fives(full, full.map((id, i) => item("x:" + i, id, { badge: "$00", badgeCls: S.counting ? "added" : "tick" }))) : fives(S.tray.map(x => x.id), S.tray.map(x => item("t:" + x.uid, x.id, { drag: true, badge: S.badges[x.uid], badgeCls: S.badges[x.uid] === "✓" || !S.counting ? "tick" : "added" })));
      const shop = isChange
        ? `<div class="mny-zone mny-shopzone"><div class="mny-shopline"><span class="mny-price">${amt(price)}</span><span>paid with</span>${pic(D.paid)}</div></div>`
        : "";
      b.root.innerHTML = `${shop}
        <div class="mny-zone bank" data-drop="bank"><span class="mny-tag">${isChange ? "Money" : "Coins"}</span><div class="mny-row">${D.bank.map(id => item("b:" + id, id, { drag: true, aria: "Add a " + MONEY[id].name })).join("")}</div></div>
        <div class="mny-zone tray grow" data-drop="tray">${readout}
          <button type="button" class="mny-btn round" data-key="reset" aria-label="Start again" ${n && !b.allow ? "" : "disabled"}>↺</button>
          <div class="mny-row">${trayItems}</div></div>`;
    };
    const planCoins = () => isChange ? greedy(val(D.paid) - D.price, D.bank) : D.kind === "fewest" ? greedy(D.target, D.bank) : rep(D.coin, D.target / val(D.coin));
    /* 2026-10-16 (round 3): how many pieces the tray holds, and so how big the money is drawn, no longer depends on
       the answer. Before, the money was sized for the answer plus one coin: big coins meant a small answer (a hidden
       clue), and a second extra coin fell below the board. Now the tray holds the most coins this level can need
       for this coin, plus two for a mistake, and it is sized for that many of the widest piece in the bank. */
    /* 2026-10-16 (round 4): the tray holds enough for every fair way of paying, plus two for a mistake:
       "how many coins": the most this level can ask, plus 2. Change in cents: 15 coins (counting up by nickels from
       35¢ needs 13). Change in dollars: 12 pieces (counting up by loonies needs 10 at most), and 3 bills at most,
       because bills are wide: they sit on their own line, the coins below them in rows of five.
       The fit step tries every full tray she can make: all of each coin (a row of five toonies is wider than a
       line of bills), the most bills with the widest coin, and each of these as Kitty's lesson draws it. */
    const CAP = D.kind === "count" ? MA_MAX[D.level][D.coin] + 2 : unit === "$" ? 12 : 15;
    const BILL_CAP = 3;
    const fullTrays = () => {
      const coins = D.bank.filter(id => MONEY[id].kind === "coin"), bills = D.bank.filter(id => MONEY[id].kind === "bill");
      const wide = coins.slice().sort((a, b2) => MONEY[b2].mm - MONEY[a].mm)[0];
      const out = coins.map(id => rep(id, CAP));
      if (bills.length) out.push(rep(bills[0], BILL_CAP).concat(wide ? rep(wide, CAP - BILL_CAP) : []));
      return out;
    };
    b.fit = () => {
      const keep = { lesson: S.lesson, counting: S.counting, countCoins: S.countCoins, mode: S.mode };
      const draws = [];
      /* every lesson step is tried too (round 5: Kitty's part, her turn, the count-along), so the money size never
         changes between them */
      for (const tray of fullTrays()) for (const st of [[false, false, ""], [true, false, "show"], [true, false, "turn"], [true, true, "show"], [true, true, "turn"], [true, true, "along"]])
        draws.push(() => { S.lesson = st[0]; S.counting = st[1]; S.mode = st[2]; S.countCoins = st[1] && !isChange; b.render(tray); });
      S.fitPrice = true;
      b.fitWith(draws, 116, 42, "cap");
      S.fitPrice = false;
      S.lesson = keep.lesson; S.counting = keep.counting; S.countCoins = keep.countCoins; S.mode = keep.mode;
    };
    b.handle = (key, drop) => {
      if (key === "reset") { init(); return { type: "reset" }; }
      const [z, a] = key.split(":");
      if (z === "b" && (drop == null || drop === "tray")) {
        if (S.tray.length >= CAP) { say(b.api, "The tray is full."); tone(b.api, [300], .12); return null; }
        if (MONEY[a].kind === "bill" && S.tray.filter(y => MONEY[y.id].kind === "bill").length >= BILL_CAP) { say(b.api, "No room for more bills. The tray is full of bills."); tone(b.api, [300], .12); return null; }
        /* her turn in the lesson: a coin that cannot be right is not put in; Kitty says how to choose (no number) */
        if (S.accept) { const why = S.accept(a); if (why) { say(b.api, why); tone(b.api, [300], .12); return { type: "refuse", id: a }; } }
        const x = { uid: "u" + (++S.seq), id: a }; S.tray.push(x);
        tone(b.api, [620, 760]);
        return { type: "add", id: a, uid: x.uid, run: (isChange ? D.price : 0) + traySum() };
      }
      if (z === "t") {
        if (S.counting) {
          if (S.badges[a] != null) return null;
          const x = S.tray.find(y => y.uid === a);
          S.countRun += S.countCoins ? 1 : val(x.id);
          if (S.mode === "turn") { S.badges[a] = "✓"; tone(b.api, [600]); return { type: "count", uid: a }; }  /* her count: a tick */
          if (S.countCoins) { S.badges[a] = String(S.countRun); tone(b.api, [600]); speak(b.api, String(S.countRun)); return { type: "count", uid: a }; }
          S.badges[a] = amt(S.countRun);
          tone(b.api, [600]); speak(b.api, String(unit === "$" ? S.countRun / 100 : S.countRun));
          return { type: "count", uid: a };
        }
        /* 2026-10-15 (round 2): a tap only marks the coin with a tick (a second tap takes the tick off). Before,
           a tap took the coin away, so when she tapped the coins to count them she undid her own work.
           To take a coin back she drags it to the coin bank, or presses start again. */
        if (drop === "bank") { S.tray = S.tray.filter(y => y.uid !== a); delete S.badges[a]; tone(b.api, [440]); return { type: "remove", uid: a }; }
        if (drop == null && S.tray.some(y => y.uid === a)) {
          if (S.badges[a] != null) delete S.badges[a]; else S.badges[a] = "✓";
          tone(b.api, [600]); return { type: "mark", uid: a };
        }
      }
      return null;
    };
    init(); b.fit(); b.draw();
    /* the tray's coins in the order she sees them: biggest first (the tray sorts itself) */
    const trayOrder = () => S.tray.map((x, i) => ({ x, i })).sort((p, q) => val(q.x.id) - val(p.x.id) || p.i - q.i).map(p => p.x);
    /* counting the tray: Kitty counts the first k out loud, then Marie counts on with ticks only */
    const countTray = async (first, k) => {
      S.counting = true; S.countCoins = !isChange; S.countRun = 0; S.badges = {}; S.mode = k ? "show" : "turn"; b.draw();
      say(b.api, (k ? "" : "Your turn. ") + first);
      let done = 0;
      for (const x of trayOrder()) {
        if (done === k && k) { S.mode = "turn"; b.draw(); say(b.api, YOUR_TURN); }
        b.setNext(["t:" + x.uid]); await step(b, e => e.type === "count"); done++;
      }
    };
    /* her turn at choosing coins: any coin she taps; one that cannot be right is not put in and Kitty says how to
       choose. After two of those in a row the right coin glows, so she is never stuck. */
    const chooseTurn = async (accept, best, finished) => {
      S.mode = "turn"; S.accept = accept;
      const all = D.bank.map(id => "b:" + id);
      b.allow = key => key.startsWith("b:");
      let misses = 0;
      b.setNext(all);
      while (!finished()) {
        const ev = await step(b, e => e.type === "add" || e.type === "refuse");
        if (ev.type === "refuse") { misses++; if (misses >= 2) { b.setNext(["b:" + best()]); say(b.api, "Try the shiny one."); } }
        else { misses = 0; b.setNext(all); }
      }
      S.accept = null; b.allow = key => b.next.has(key);
    };
    const traySumNow = () => S.tray.reduce((s, x) => s + val(x.id), 0);
    /* how many tray pieces Kitty counts out loud (never one whose number is the answer) */
    const trayK = () => { let r = 0; return safeK(showN(S.tray.length), trayOrder().map((x, i) => { r += val(x.id); return isChange ? amt(r) + " " + (unit === "$" ? r / 100 : r) : String(i + 1); }), Q.answer); };
    /* step 4: her answer after the lesson was wrong. Kitty counts all the tray with her, out loud. */
    const alongPay = async () => {
      S.counting = true; S.countCoins = !isChange; S.countRun = 0; S.badges = {}; S.mode = "along"; b.allow = key => b.next.has(key); b.draw();
      say(b.api, "Let's count it all together. Tap each one.");
      for (const x of trayOrder()) { b.setNext(["t:" + x.uid]); await step(b, e => e.type === "count"); }
      b.setNext([]); b.allow = () => false; S.mode = "done"; b.draw();
      say(b.api, isChange ? "That is the change. Type it." : `That is how many ${D.kind === "count" ? MONEY[D.coin].plural : "coins"}. Type it.`);
    };
    b.teach = () => lesson(async () => {
      init(); S.lesson = true; b.allow = key => b.next.has(key); b.draw();
      const plan = planCoins();
      if (isChange) {
        /* Kitty counts up out loud from the price for the first coin or two only */
        let r = D.price;
        const ups = plan.map(id => { r += val(id); return amt(r) + " " + (unit === "$" ? r / 100 : r); });
        const kA = safeK(showN(plan.length), ups, Q.answer);
        S.mode = kA ? "show" : "turn"; b.draw();
        say(b.api, `${kA ? "" : "Your turn. "}Start at ${amt(D.price)}. Add money to reach ${amt(val(D.paid))}.`);
        for (let i = 0; i < kA; i++) {
          b.setNext(["b:" + plan[i]]);
          const ev = await step(b, e => e.type === "add");
          speak(b.api, unit === "$" ? String(ev.run / 100) : String(ev.run));
        }
        const goal = val(D.paid) - D.price;
        if (kA) say(b.api, "Your turn. Keep counting up.");
        await chooseTurn(id => traySumNow() + val(id) > goal ? "Too much. Pick a smaller one." : null,
          () => greedy(goal - traySumNow(), D.bank)[0], () => traySumNow() >= goal);
        await countTray("Now count what you added. Tap each one.", trayK());
        b.setNext([]); b.allow = () => false; S.mode = "done"; b.draw();
        say(b.api, "How much change? Type it.");
      } else if (D.kind === "fewest") {
        const best = () => D.bank.find(id => val(id) <= D.target - traySumNow());
        /* Kitty shows the first coin or two: the biggest coin that fits */
        const kA = showN(plan.length);
        S.mode = kA ? "show" : "turn"; b.draw();
        if (!kA) say(b.api, "Use the biggest coin that fits first. Your turn.");
        for (let i = 0; i < kA; i++) {
          say(b.api, i === 0 ? `${fmt(D.target)} to pay. Biggest coin that fits: a ${MONEY[plan[i]].name}.` : `Look at what is left. Biggest that fits: a ${MONEY[plan[i]].name}.`);
          b.setNext(["b:" + plan[i]]); await step(b, e => e.type === "add");
        }
        if (kA) say(b.api, "Your turn. Keep going: the biggest coin that fits.");
        await chooseTurn(id => {
          const left = D.target - traySumNow();
          if (val(id) > left) return "Too much. Pick a smaller coin.";
          if (id !== best()) return "Is there a bigger coin that fits?";
          return null;
        }, best, () => traySumNow() >= D.target);
        await countTray("Now count the coins. Tap each one.", trayK());
        b.setNext([]); b.allow = () => false; S.mode = "done"; b.draw();
        say(b.api, "How many coins? Type it.");
      } else {
        /* one kind of coin: the cents she counts on are not the answer, but the count of coins is; Kitty says no
           number while she adds (with 5 nickels, "5 cents" would be the answer) */
        S.mode = "turn"; b.draw();
        say(b.api, `Your turn. Add ${MONEY[D.coin].plural} one by one to make ${fmt(D.target)}.`);
        for (let i = 0; i < plan.length; i++) { b.setNext(["b:" + D.coin]); await step(b, e => e.type === "add"); }
        await countTray(`Now count the ${MONEY[D.coin].plural}. Tap each one.`, trayK());
        b.setNext([]); b.allow = () => false; S.mode = "done"; b.draw();
        say(b.api, `How many ${MONEY[D.coin].plural}? Type it.`);
      }
      b.armAlong(alongPay);
    });
    return { destroy: () => b.destroy(), reset: () => { init(); b.draw(); } };
  }
  function maHint(Q) {
    const D = Q.data;
    /* short (round 4): each extra line in Kitty's bubble takes room from the board on an iPhone SE */
    /* no "count by 5s" here: with 5 nickels (or 10 dimes) that number is the answer, said out loud */
    if (D.kind === "count") return `Add ${MONEY[D.coin].plural} one by one, counting on to ${D.target}. Then count the ${MONEY[D.coin].plural}.`;
    if (D.kind === "fewest") return "Biggest coin that fits first. Then count the coins.";
    if (D.kind === "change") return `Count up from ${fmt(D.price)} to ${MONEY[D.paid].label}. Then count what you added.`;
    return "Count each purse. Find the one that makes " + fmt(D.target) + ".";
  }

  /* =====================================================================
     3. coin_puzzle: N coins make X. Which coins?
     ===================================================================== */
  const CP_LEVELS = [
    { name: "2 or 3 coins", grade: 2, note: "2-3 coins (quarters, dimes, nickels). Only one answer." },
    { name: "4 or 5 coins", grade: 2, note: "4-5 coins up to 100¢. Only one answer. Grade 2-3." },
    { name: "Loonie riddles", grade: 3, note: "5-6 coins up to $2, with a loonie in the answer. The toonie is in the coin bank to try. (A toonie and 4 more coins is always more than $2.)" },
    { name: "Penny riddles", grade: 3, note: "uses pennies; pennies left circulation in 2013. Father's puzzle: 8 coins make 82¢." }
  ];
  const CP_CFG = {
    1: { denoms: ["quarter", "dime", "nickel"], counts: [2, 3], max: 100, ok: () => true },
    2: { denoms: ["quarter", "dime", "nickel"], counts: [4, 5], max: 100, ok: () => true },
    3: { denoms: ["toonie", "loonie", "quarter", "dime", "nickel"], counts: [5, 6], max: 200, ok: s => s.some(id => val(id) >= 100) },
    4: { denoms: ["quarter", "dime", "nickel", "penny"], counts: [5, 6, 7, 8], max: 99, min: 40, ok: s => s.includes("penny") && s.filter(x => x === "penny").length <= 4 && s.includes("quarter") }
  };
  function multisets(denoms, n, start = 0) {
    if (n === 0) return [[]];
    const out = [];
    for (let i = start; i < denoms.length; i++) for (const rest of multisets(denoms, n - 1, i)) out.push([denoms[i], ...rest]);
    return out;
  }
  const POOLS = {};
  function cpPool(level) {
    if (POOLS[level]) return POOLS[level];
    const C = CP_CFG[level], out = [];
    for (const n of C.counts) {
      const byTotal = new Map();
      for (const s of multisets(C.denoms, n)) { const t = sum(s); if (!byTotal.has(t)) byTotal.set(t, []); byTotal.get(t).push(s); }
      for (const [t, sols] of byTotal) if (sols.length === 1 && t <= C.max && t >= (C.min || 0) && C.ok(sols[0])) out.push({ n, t, sol: sols[0] });
    }
    return (POOLS[level] = out);
  }
  const SPLIT = { toonie: ["loonie", "loonie"], loonie: ["quarter", "quarter", "quarter", "quarter"], quarter: ["dime", "dime", "nickel"], dime: ["nickel", "nickel"], nickel: ["penny", "penny", "penny", "penny", "penny"] };
  function cpDistractors(level, sol) {
    const C = CP_CFG[level], n = sol.length, t = sum(sol), out = [], seen = new Set([keyOf(sol)]);
    /* a wrong set has at most one coin more than the riddle (2026-10-15): a nickel split into 5 pennies made
       12-coin sets, too tall for an answer button on an iPhone SE once the coins are drawn big enough to read */
    const add = s => { const k = keyOf(s); if (seen.has(k) || !s.length || s.length > n + 1) return false; const cOk = s.length === n, tOk = sum(s) === t; if (cOk === tOk) return false; if (level < 4 && s.includes("penny")) return false; seen.add(k); out.push(s); return true; };
    // right count, wrong total: swap one coin for another kind
    const swaps = [];
    sol.forEach((id, i) => C.denoms.forEach(d => { if (d !== id) { const s = sol.slice(); s[i] = d; swaps.push(s); } }));
    // right total, wrong count: split one coin, or join coins
    const sizes = [];
    sol.forEach((id, i) => { if (SPLIT[id] && SPLIT[id].every(x => C.denoms.includes(x))) { const s = sol.slice(); s.splice(i, 1, ...SPLIT[id]); sizes.push(s); } });
    const g = greedy(t, C.denoms); if (g) sizes.push(g);
    for (const [big, parts] of Object.entries(SPLIT)) {
      if (!C.denoms.includes(big)) continue;
      const s = sol.slice(); let ok = true;
      for (const p of parts) { const j = s.indexOf(p); if (j < 0) { ok = false; break; } s.splice(j, 1); }
      if (ok) sizes.push(s.concat([big]));
    }
    const sw = shuffle(swaps), sz = shuffle(sizes);
    for (const s of sz) if (add(s)) break;
    for (const s of sw) if (out.length < 2 && add(s)) {}
    for (const s of sz.concat(sw)) { if (out.length >= 2) break; add(s); }
    return out.slice(0, 2);
  }
  function cpGen(level, prev) {
    const pool = cpPool(level);
    let p;
    /* the father's puzzle (8 coins make 82¢) comes first on level 4, and now and then after */
    if (level === 4 && (!prev || !String(prev.key).startsWith("cp4") || Math.random() < 0.12)) p = pool.find(x => x.n === 8 && x.t === 82);
    else p = pick(pool);
    const sol = sortBig(p.sol), wrong = cpDistractors(level, sol);
    if (wrong.length < 2) return null;
    const sets = shuffle([sol, ...wrong]), letters = ["A", "B", "C"];
    return {
      key: "cp" + level + ":" + p.n + ":" + p.t,
      say: `I have ${p.n} coins. They make ${spoken(p.t)}. Which coins?`,
      show: `I have ${p.n} coins. They make ${fmt(p.t)}.`,
      answer: letters[sets.indexOf(sol)],
      input: { type: "choice", choices: sets.map((s, i) => ({ value: letters[i], label: letters[i] + ": " + plainLabel(s), html: miniSet(s, letters[i]) })) },
      data: { kind: "puzzle", level, n: p.n, total: p.t, solution: sol, bank: CP_CFG[level].denoms.slice(), sets: sets.map((s, i) => ({ letter: letters[i], ids: s })) }
    };
  }
  function cpMount(el, Q, api) {
    const D = Q.data, b = Board(el, api, "mny-cp"); b.Q = Q;
    const S = {};
    const init = () => { S.tray = []; S.seq = 0; S.ticks = {}; S.lesson = false; S.mode = ""; S.alN = 0; S.alSum = 0; b.allow = null; b.next = new Set(); b.hlKey = ""; if (b.disarm) b.disarm(); };
    const tSum = () => S.tray.reduce((s, x) => s + val(x.id), 0);
    b.render = full => {
      /* the coin count and the money are shown only while Kitty shows how, and in the count-along (round 5) */
      const al = S.mode === "along" && !full;
      const n = al ? S.alN : S.tray.length, t = al ? S.alSum : tSum();
      const cOk = n === D.n, tOk = t === D.total;
      const nums = full || S.mode === "show" || S.mode === "along";
      /* 2026-10-16 (round 3): the tray sorts her coins, biggest first, in rows of five (like Pay the shop), with a
         thin line where the kind changes, so she can count on by 25s, 10s, 5s and 1s. Before, the coins stayed in
         the order she tapped them. (Not one row per kind: up to 10 coins of 4 kinds would need 3 to 5 rows, too
         tall for an iPhone SE.) */
      const tray = full ? fives(full, full.map((id, i) => item("x:" + i, id, { badge: "✓", badgeCls: "tick" }))) : fives(S.tray.map(x => x.id), S.tray.map(x => item("t:" + x.uid, x.id, { drag: true, badge: S.ticks[x.uid], badgeCls: "tick" })));
      b.root.innerHTML = `
        <div class="mny-zone bank" data-drop="bank"><span class="mny-tag">Coins</span><div class="mny-row">${D.bank.map(id => item("b:" + id, id, { drag: true, aria: "Add a " + MONEY[id].name })).join("")}</div></div>
        <div class="mny-zone tray grow" data-drop="tray">
          ${nums
            ? `<span class="mny-tag ${n && cOk ? "ok" : n > D.n ? "over" : "lilac"}" aria-live="polite">${n ? (cOk ? "✓ " : "") + n + (n === 1 ? " coin" : " coins") : al ? "Count with me" : "Build it here"}</span>`
            : `<span class="mny-tag lilac" aria-live="polite">${S.mode === "turn" ? "Your turn: build it" : "Build it here"}</span>`}
          ${nums ? `<span class="mny-tag r2 ${n && tOk ? "ok" : t > D.total ? "over" : "sunny"}" aria-live="polite">${n && tOk ? "✓ " : ""}${fmt(t)}</span>` : ""}
          <button type="button" class="mny-btn round" data-key="reset" aria-label="Clear the tray" ${n && !b.allow ? "" : "disabled"}>↺</button>
          <div class="mny-row">${tray}</div>
        </div>`;
    };
    /* the tray holds one more coin than the biggest pictured set; the money is sized for a full tray of the widest coin */
    const LIMIT = Math.max(D.n, ...D.sets.map(s => s.ids.length)) + 1;
    b.fit = () => b.fitWith(() => b.render(rep(D.bank[0], LIMIT)), 110, 40);  /* the full drawing has both tags, the most any step shows */
    b.handle = (key, drop) => {
      if (key === "reset") { init(); return { type: "reset" }; }
      const [z, a] = key.split(":");
      let ev = null;
      if (z === "b" && (drop == null || drop === "tray")) {
        if (S.tray.length >= LIMIT) { say(b.api, "The tray is full."); return null; }
        const x = { uid: "u" + (++S.seq), id: a }; S.tray.push(x); tone(b.api, [620, 760]); ev = { type: "add", id: a };
        if (S.mode === "turn") S.ticks[x.uid] = "✓";  /* her coin: a tick, no number */
      }
      /* the count-along after a wrong choice: each tap counts one coin and adds its money, out loud */
      if (z === "t" && drop == null && S.mode === "along") {
        const x = S.tray.find(y => y.uid === a); if (!x || S.ticks[a] != null) return null;
        S.alN += 1; S.alSum += val(x.id); S.ticks[a] = "✓"; tone(b.api, [600]);
        speak(b.api, `${S.alN} ${S.alN === 1 ? "coin" : "coins"}, ${spoken(S.alSum)}.`);
        return { type: "count" };
      }
      /* 2026-10-15 (round 2): a tap on a tray coin only marks it with a tick (tap again to take the tick off),
         so counting taps never undo her work. Dragging a coin back to the coin bank takes it away. */
      if (z === "t" && drop === "bank") { S.tray = S.tray.filter(y => y.uid !== a); delete S.ticks[a]; tone(b.api, [440]); ev = { type: "remove" }; }
      if (z === "t" && drop == null && S.tray.some(y => y.uid === a)) { if (S.ticks[a] != null) delete S.ticks[a]; else S.ticks[a] = "✓"; tone(b.api, [600]); ev = { type: "mark" }; }
      /* Father's rule: on her own the tray never counts the coins, never adds the money and never says "that set
         is right" (2026-10-15: the old coin count with a tick did one of her two checks for her, because each wrong
         choice fails exactly one check). Counting and adding are her job; Kitty counts and adds only in the lesson. */
      return ev;
    };
    init(); b.fit(); b.draw();
    /* after the lesson she may still change her coins (add, mark, drag back), but the start-again button stays off:
       start again would also switch off Kitty's count-along for a wrong answer (step 4) */
    const editOnly = key => key.startsWith("b:") || key.startsWith("t:");
    /* step 4: her choice after the lesson was wrong. Kitty counts the tray with her: coins and money, out loud. */
    const alongCp = async () => {
      S.ticks = {}; S.alN = 0; S.alSum = 0; S.mode = "along"; b.allow = key => b.next.has(key); b.draw();
      say(b.api, "Let's count your coins together. Tap each one.");
      for (const x of S.tray.map((x, i) => ({ x, i })).sort((p, q) => val(q.x.id) - val(p.x.id) || p.i - q.i).map(p => p.x)) {
        b.setNext(["t:" + x.uid]); await step(b, e => e.type === "count");
      }
      b.setNext([]); S.mode = "done"; b.allow = editOnly; b.draw();
      say(b.api, `Is it ${D.n} coins and ${fmt(D.total)}? If not, change a coin.`);
    };
    b.teach = () => lesson(async () => {
      init(); S.lesson = true; b.allow = key => b.next.has(key);
      /* Kitty puts the first coin or two (and says why); then Marie builds the rest. Kitty never builds all of it:
         then she would only have to match the pictures. */
      const sol = sortBig(D.solution), k = showN(D.n);
      S.mode = k ? "show" : "turn"; b.draw();
      let run = 0;
      for (let i = 0; i < k; i++) {
        const id = sol[i], biggest = D.bank.find(d => val(d) <= D.total - run);
        const why = biggest !== id ? `Not a ${MONEY[biggest].name} this time. ` : "";
        say(b.api, i === 0 ? `${D.n} coins make ${fmt(D.total)}. ${why}Put a ${MONEY[id].name}.` : `${why}Now put a ${MONEY[id].name}.`);
        b.setNext(["b:" + id]); await step(b, e => e.type === "add"); run += val(id);
      }
      /* round 6 (2026-10-16): on her turn the board takes ANY coin she picks. Before, it refused every coin that is
         not in the answer and then made the right coin glow, so random taps always built the answer and she only had
         to match the pictures. Now Kitty only says HOW to check (count the coins, add the money); she never says if a
         coin is right. A coin she wants to change goes back by dragging it to the coins. Kitty's lines stay short:
         a tall speech bubble makes the board too short for 8 coins on an iPhone SE. */
      S.mode = "turn"; b.draw();
      say(b.api, k ? "Your turn. Keep building. Count coins and money." : "Your turn. Build it. Count coins and money.");
      const all = D.bank.map(id => "b:" + id);
      b.allow = editOnly;
      b.setNext(all);
      while (S.tray.length < D.n) await step(b, e => e.type === "add" || e.type === "remove" || e.type === "mark");
      b.setNext([]); S.mode = "done"; b.allow = editOnly; b.draw();
      say(b.api, `Add it up. Is it ${fmt(D.total)}? If not, change a coin.`);
      b.armAlong(alongCp);
    });
    return { destroy: () => b.destroy(), reset: () => { init(); b.draw(); } };
  }
  function cpHint(Q, tries) {
    return tries <= 2 ? "Build it in the tray. Start with a big coin. Keep checking: how many coins? How much money?" : "Pick a set below. Count its coins. Add up its money. Do both match?";
  }

  /* =====================================================================
     4. money_sense: want or need, save or buy, ways to pay
     ===================================================================== */
  const NEEDS = [["milk", "milk"], ["egg", "eggs"], ["bed", "a bed"], ["shower", "a shower"]];
  const WANTS = [["teddy", "a teddy bear"], ["yoyo", "a yo-yo"], ["unicorn", "a unicorn toy"], ["balloon", "a balloon"], ["kite", "a kite"], ["guitar", "a toy guitar"], ["donut", "a donut"], ["lollipop", "a lollipop"], ["dollhouse", "a dollhouse"], ["soccer", "a soccer ball"], ["cupcake", "a cupcake"], ["tv", "a TV"]];
  const SAVE_ITEMS = [["teddy", "teddy bear"], ["dollhouse", "dollhouse"], ["kite", "kite"], ["guitar", "guitar"], ["unicorn", "unicorn toy"], ["soccer", "soccer ball"], ["books", "book"]];
  /* Ways to pay (2026-10-15): the answer buttons are pictures, not words. The old word button "Money" nearly
     repeated the question. The things are our own simple drawings, so the buttons work in the real game and the
     demo alike (pictures from the game's art folder are not reachable when the question is made). */
  const NOT_MONEY = [["flower", "a flower"], ["star", "a star"], ["cookie", "a cookie"], ["heart", "a heart"], ["ribbon", "a ribbon"], ["ball", "a ball"]];
  const PAY_NAMES = { card: "a bank card", cash: "a ten dollar bill" };
  const THING_SVG = {
    flower: `<svg class="mny-art" viewBox="0 0 100 100" aria-hidden="true"><path d="M50 52 V94" stroke="#2a9a5b" stroke-width="7" stroke-linecap="round"/><path d="M50 80 C34 80 26 70 24 60 C38 60 48 68 50 80 Z" fill="#6fd29a" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/><path d="M28 18 L38 30 L50 12 L62 30 L72 18 L72 40 C72 54 62 60 50 60 C38 60 28 54 28 40 Z" fill="#ff6f9f" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/></svg>`,
    star: `<svg class="mny-art" viewBox="0 0 100 100" aria-hidden="true"><path d="M50 8 L61 37 L92 38 L68 57 L76 88 L50 71 L24 88 L32 57 L8 38 L39 37 Z" fill="#ffc94a" stroke="${INK}" stroke-width="4.5" stroke-linejoin="round"/></svg>`,
    cookie: `<svg class="mny-art" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="52" r="40" fill="#e0a868" stroke="${INK}" stroke-width="4.5"/><circle cx="36" cy="38" r="6" fill="${INK}"/><circle cx="62" cy="34" r="5" fill="${INK}"/><circle cx="58" cy="60" r="6.5" fill="${INK}"/><circle cx="34" cy="64" r="5" fill="${INK}"/><circle cx="72" cy="52" r="4" fill="${INK}"/></svg>`,
    heart: `<svg class="mny-art" viewBox="0 0 100 100" aria-hidden="true"><path d="M50 90 C14 64 6 42 14 26 C22 10 42 10 50 28 C58 10 78 10 86 26 C94 42 86 64 50 90 Z" fill="#ff6f9f" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/></svg>`,
    ribbon: `<svg class="mny-art" viewBox="0 0 100 100" aria-hidden="true"><path d="M44 54 L30 90 L40 84 L46 94 L52 58 Z M56 54 L70 90 L60 84 L54 94 L48 58 Z" fill="#a98bff" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/><path d="M50 46 C36 26 10 22 10 40 C10 58 36 56 50 46 Z M50 46 C64 26 90 22 90 40 C90 58 64 56 50 46 Z" fill="#b49bff" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/><circle cx="50" cy="46" r="9" fill="#7b55e6" stroke="${INK}" stroke-width="4"/></svg>`,
    ball: `<svg class="mny-art" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="40" fill="#74c8ff" stroke="${INK}" stroke-width="4.5"/><path d="M12 42 C36 52 64 52 88 42 M50 10 C38 34 38 66 50 90" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round"/><path d="M12 42 C36 52 64 52 88 42 M50 10 C38 34 38 66 50 90" fill="none" stroke="${INK}" stroke-width="2.5" stroke-linecap="round"/></svg>`
  };
  const MS_LEVELS = [{ name: "Want or need", grade: 1, note: "Grades 1-3: want or need, save or buy now, ways to pay. Short picture questions." }];
  const HEART = `<svg viewBox="0 0 40 40" width="34" height="34" aria-hidden="true"><path d="M20 35 C6 25 3 17 6 11 C9 5 17 5 20 12 C23 5 31 5 34 11 C37 17 34 25 20 35 Z" fill="#ff6f9f" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/></svg>`;
  const HOUSE = `<svg viewBox="0 0 40 40" width="34" height="34" aria-hidden="true"><path d="M6 19 L20 6 L34 19 V34 H6 Z" fill="#63d3b3" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><rect x="16" y="23" width="8" height="11" fill="#fff" stroke="${INK}" stroke-width="2.5"/></svg>`;
  const PIGGY = ICON.piggy.replace("<svg ", '<svg width="34" height="34" ');
  const BAG = `<svg viewBox="0 0 40 40" width="34" height="34" aria-hidden="true"><path d="M7 14 H33 L31 35 H9 Z" fill="#ffc94a" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><path d="M14 14 C14 5 26 5 26 14" fill="none" stroke="${INK}" stroke-width="3"/></svg>`;
  const lbl = (svg, t) => `<span class="mny-choice">${svg}<span style="font:800 22px 'Baloo 2',sans-serif">${t}</span></span>`;
  function haveSet(c) { return greedy(c, ["twenty", "ten", "five", "toonie", "loonie"]); }
  function msGen() {
    const r = Math.random();
    if (r < 0.5) {
      const need = Math.random() < 0.4, [art, name] = pick(need ? NEEDS : WANTS);
      return { key: "ms:wn:" + art, say: `${name[0].toUpperCase() + name.slice(1)}. Is it a want or a need?`, show: "Want or need?", answer: need ? "need" : "want",
        input: { type: "choice", choices: [{ value: "want", label: "Want", html: lbl(HEART, "Want") }, { value: "need", label: "Need", html: lbl(HOUSE, "Need") }] },
        data: { kind: "want_need", art, name } };
    }
    if (r < 0.75) {
      const [art, name] = pick(SAVE_ITEMS), price = rnd(3, 20) * 100;
      const have = Math.random() < 0.5 ? rnd(price / 100, 25) * 100 : rnd(1, price / 100 - 1) * 100;
      /* 2026-10-15: the question no longer says how much Kitty has. She counts Kitty's money in the picture
         herself (each tap leaves a tick, never a running total), then compares it with the price. */
      return { key: "ms:ss:" + art + ":" + price + ":" + have, say: `Count Kitty's money. The ${name} costs ${spoken(price)}. Can she buy it now, or must she save?`, show: `Count Kitty's money. The ${name} costs ${fmt(price)}.`,
        answer: have >= price ? "buy" : "save",
        input: { type: "choice", choices: [{ value: "buy", label: "Buy it now", html: lbl(BAG, "Buy now") }, { value: "save", label: "Save", html: lbl(PIGGY, "Save") }] },
        data: { kind: "save_spend", art, name, price, have, haveIds: haveSet(have) } };
    }
    const pk = pick(["card", "cash"]), payer = [pk, PAY_NAMES[pk]];
    const others = shuffle(NOT_MONEY).slice(0, 2);
    const opts = shuffle([payer, ...others]);
    return { key: "ms:pay:" + payer[0] + ":" + others.map(o => o[0]).join(","), say: "Which one can pay at the shop?", show: "Which one can pay at the shop?", answer: payer[0],
      input: { type: "choice", choices: opts.map(([k, name]) => ({ value: k, label: name, html: `<span class="mny-paypick" data-pay="${k}">${thingPic(k)}</span>` })) },
      data: { kind: "pay", options: opts.map(o => o[0]), names: opts.map(o => o[1]), payer: payer[0] } };
  }
  /* one picture for a "ways to pay" thing: the same drawing on the board and on the answer button */
  function thingPic(k) {
    if (k === "card") return CARD_SVG;
    if (k === "cash") return billSVG("ten");
    return THING_SVG[k];
  }
  const payPic = k => `<span class="mny-thing">${thingPic(k)}</span>`;
  /* Ways to pay, on her own (2026-10-15, round 2): the board shows a shop, not the three pictures. The pictures
     are the answer buttons below; showing them twice made her think a tap on the top one was her answer.
     Our own drawing: a shop with a striped awning, a window with fruit, and a door. No coin or money in it. */
  const SHOP_SVG = `<svg class="mny-art" viewBox="0 0 220 170" aria-hidden="true" focusable="false">
    <rect x="18" y="${48 + SH}" width="184" height="114" rx="8" fill="${INK}"/>
    <rect x="18" y="48" width="184" height="114" rx="8" fill="#fff6d6" stroke="${INK}" stroke-width="5"/>
    <path d="M10 18 H210 L202 52 H18 Z" fill="#fff" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
    <path d="M35 18 L32 52 H57 L60 18 Z M85 18 L82 52 H107 L110 18 Z M135 18 L132 52 H157 L160 18 Z M185 18 L182 52 H202 L210 18 Z" fill="#ff6f9f"/>
    <path d="M10 18 H210 L202 52 H18 Z" fill="none" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
    <rect x="34" y="70" width="88" height="62" rx="6" fill="#bfe8ff" stroke="${INK}" stroke-width="4"/>
    <circle cx="56" cy="116" r="11" fill="#ff8080" stroke="${INK}" stroke-width="3"/><circle cx="78" cy="118" r="10" fill="#ffc94a" stroke="${INK}" stroke-width="3"/><circle cx="100" cy="116" r="11" fill="#6fd29a" stroke="${INK}" stroke-width="3"/>
    <path d="M56 105 q2 -6 6 -7 M100 105 q2 -6 6 -7" fill="none" stroke="#2a9a5b" stroke-width="3" stroke-linecap="round"/>
    <rect x="140" y="74" width="44" height="88" rx="6" fill="#a98bff" stroke="${INK}" stroke-width="4"/>
    <circle cx="174" cy="120" r="4" fill="${INK}"/>
  </svg>`;
  function msMount(el, Q, api) {
    const D = Q.data, b = Board(el, api, "mny-ms"); b.Q = Q;
    const S = {};
    const init = () => { S.mode = "ask"; S.who = ""; S.placed = {}; S.badges = {}; S.run = 0; S.tagged = false; S.seen = {}; S.lesson = false; S.payGrid = false; b.allow = null; b.next = new Set(); b.hlKey = ""; if (b.disarm) b.disarm(); };
    b.render = () => {
      if (D.kind === "want_need") {
        const ex = S.ex;
        if (S.mode === "teach") {
          const card = (k, side) => S.placed[k] === side ? `<span class="mny-ex" aria-label="${k}"><img src="${api.ART(k)}" alt=""></span>` : "";
          b.root.innerHTML = `<div class="mny-boxes"><div class="mny-box need"><span class="mny-tag">Need</span>${card(ex.need, "need")}</div><div class="mny-box want"><span class="mny-tag">Want</span>${card(ex.want, "want")}</div></div>
            <div class="mny-row" style="gap:16px">${[ex.need, ex.want].filter(k => !S.placed[k]).map(k => `<button type="button" class="mny-ex" data-key="ex:${k}" aria-label="${k}"><img src="${api.ART(k)}" alt=""></button>`).join("")}</div>
            <div class="mny-big"><div class="mny-card"><img src="${api.ART(D.art)}" alt="">${D.name}</div></div>`;
        } else b.root.innerHTML = `<div class="mny-big" style="flex:1"><div class="mny-card"><img src="${api.ART(D.art)}" alt="">${D.name}</div></div>`;
      } else if (D.kind === "save_spend") {
        b.root.innerHTML = `<div class="mny-zone purse"><span class="mny-tag">Kitty's money</span><div class="mny-row">${D.haveIds.map((id, i) => item("h:" + i, id, { badge: S.badges["h:" + i], badgeCls: S.badges["h:" + i] === "✓" ? "tick" : "" })).join("")}</div></div>
          <div class="mny-big" style="flex:1"><div class="mny-card"><img src="${api.ART(D.art)}" alt=""><button type="button" class="mny-price" data-key="tag" style="cursor:pointer">${fmt(D.price)}</button></div></div>`;
      } else {
        b.root.innerHTML = S.payGrid
          ? `<div class="mny-zone"><span class="mny-tag">Tap each one</span><div class="mny-paygrid">${D.options.map((k, i) => `<button type="button" class="mny-card" data-key="pay:${k}" aria-label="${D.names[i]}">${payPic(k)}</button>`).join("")}</div></div>`
          : `<div class="mny-big" style="flex:1"><div class="mny-card mny-shopcard">${SHOP_SVG}<span>The shop</span></div></div>`;
      }
    };
    b.fit = () => b.fitWith(() => b.render(), 80, 34);
    b.handle = key => {
      const [z, a] = key.split(":");
      if (z === "ex") { S.placed[a] = a === S.ex.need ? "need" : "want"; tone(b.api, [620, 780]); return { type: "place", a }; }
      if (z === "h" && S.badges[key] == null) {
        /* Father's rule (2026-10-15): on her own a tap only leaves a tick. The adding is her job.
           Only in Kitty's lesson does Kitty count along with each tap. */
        S.run += val(D.haveIds[+a]);
        /* S.who (round 5): "show" Kitty counts out loud, "along" the count-along after a wrong answer; else a tick */
        if (S.who !== "show" && S.who !== "along") { S.badges[key] = "✓"; tone(b.api, [600]); return { type: "count" }; }
        S.badges[key] = fmt(S.run); tone(b.api, [600]); speak(b.api, spoken(S.run)); return { type: "count" };
      }
      if (z === "tag") { S.tagged = true; return { type: "tag" }; }
      if (z === "pay") { S.seen[a] = true; tone(b.api, [600]); const i = D.options.indexOf(a); speak(b.api, D.names[i][0].toUpperCase() + D.names[i].slice(1) + "."); return { type: "pay", a }; }
      return null;
    };
    init(); b.fit(); b.draw();
    b.teach = () => lesson(async () => {
      init(); b.allow = key => b.next.has(key);
      if (D.kind === "want_need") {
        S.ex = { need: D.art === "milk" ? "egg" : "milk", want: D.art === "balloon" ? "kite" : "balloon" };
        S.mode = "teach"; b.fit(); b.draw();
        say(b.api, "A need is something we must have to live. We need food. Tap the milk.".replace("the milk", S.ex.need === "milk" ? "the milk" : "the eggs"));
        b.setNext(["ex:" + S.ex.need]); await step(b, e => e.type === "place");
        say(b.api, `A want is nice to have. We can live without it. Tap the ${S.ex.want}.`);
        b.setNext(["ex:" + S.ex.want]); await step(b, e => e.type === "place");
        b.setNext([]); b.allow = () => false; b.draw();
        say(b.api, `Now ${D.name}. Do we need it to live? Tap Want or Need.`);
      } else if (D.kind === "save_spend") {
        /* Kitty counts the first one or two with her, never all of it (the total would give the answer in one step) */
        const n = D.haveIds.length;
        /* round 6: at least 2 pieces always left for her (showN). Before, with 2 or 3 pieces Kitty counted all but one. */
        let k = showN(n);
        while (k > 0 && sum(D.haveIds.slice(0, k)) >= D.price) k--;  /* Kitty's part never reaches the price */
        S.lesson = true; S.who = k ? "show" : "turn"; b.draw();
        say(b.api, k ? "Count Kitty's money with me. Tap each one." : "Your turn. Count Kitty's money. Tap each one.");
        for (let i = 0; i < n; i++) {
          if (i === k && k) { S.who = "turn"; b.draw(); say(b.api, YOUR_TURN); }
          b.setNext(["h:" + i]); await step(b, e => e.type === "count");
        }
        say(b.api, "Now tap the price tag.");
        b.setNext(["tag"]); await step(b, e => e.type === "tag");
        b.setNext([]); b.allow = () => false; S.who = "done"; b.draw();
        say(b.api, "Is her money as much as the price? Tap Buy or Save.");
        /* step 4: her choice after the lesson was wrong. Kitty counts all of it with her, out loud. */
        b.armAlong(async () => {
          S.badges = {}; S.run = 0; S.who = "along"; b.allow = key => b.next.has(key); b.draw();
          say(b.api, "Let's count Kitty's money together. Tap each one.");
          for (let i = 0; i < n; i++) { b.setNext(["h:" + i]); await step(b, e => e.type === "count"); }
          b.setNext([]); b.allow = () => false; S.who = "done"; b.draw();
          say(b.api, `Kitty has ${fmt(D.have)}. It costs ${fmt(D.price)}. Tap Buy or Save.`);
        });
      } else {
        /* the lesson names each thing; Marie decides which one pays (Kitty never marks it for her) */
        /* the three pictures show on the board only for these naming taps, then go away again,
           so the only place to choose is the answer buttons below */
        S.payGrid = true; b.fit(); b.draw();
        say(b.api, "At the shop we pay with money or a bank card. Tap each picture and say what it is.");
        for (let i = 0; i < D.options.length; i++) {
          const k = D.options[i];
          b.setNext(["pay:" + k]); await step(b, e => e.type === "pay");
        }
        S.payGrid = false; b.setNext([]); b.allow = () => false; b.fit(); b.draw();
        say(b.api, "Is it money or a bank card? That one can pay. Tap it below.");
      }
    });
    return { destroy: () => b.destroy(), reset: () => { init(); b.fit(); b.draw(); } };
  }
  function msHint(Q) {
    const D = Q.data;
    if (D.kind === "want_need") return "Ask: do we need it to live and stay healthy? Or is it just nice to have?";
    if (D.kind === "save_spend") return "Count Kitty's money. Is it as much as the price, or more?";
    return "Look for money or a bank card.";
  }

  /* ================= Register the topics ================= */
  const teachVia = topic => (Q, el, api) => { const b = getBoard(el, Q, api, topic); return b && b.teach ? b.teach() : Promise.resolve(); };
  const mk = (gen, maxTry) => (level, prev) => { let q = null; for (let i = 0; i < (maxTry || 80) && !q; i++) { q = fresh(() => gen(level, prev), prev); if (q && prev && q.key === prev.key) q = null; } if (!q) throw new Error("money: no question"); return q; };
  const T = [];
  T.push({ id: "coins_count", title: "Count coins", icon: ICON.coins, strand: "Money", levels: CC_LEVELS, make: mk(ccGen), mount: ccMount, hint: ccHint });
  T.push({ id: "make_amount", title: "Pay the shop", icon: ICON.shop, strand: "Money", levels: MA_LEVELS, make: mk(maGen), mount: maMount, hint: maHint });
  T.push({ id: "coin_puzzle", title: "Coin riddles", icon: ICON.puzzle, strand: "Money", levels: CP_LEVELS, make: mk(cpGen), mount: cpMount, hint: cpHint });
  T.push({ id: "money_sense", title: "Want or need", icon: ICON.piggy, strand: "Money", levels: MS_LEVELS, make: mk(msGen), mount: msMount, hint: msHint });
  T.forEach(t => { t.teach = teachVia(t); });
  /* make(level, prev): level is a 0-based index into levels, or one of the level objects
     (same rule as the sibling modules). Inside this file levels are counted from 1. */
  T.forEach(t => {
    const raw = t.make;
    t.make = (level, prev) => raw(levelNo(t, level), prev);
  });
  function levelNo(t, level) {
    if (typeof level === "number") return Math.min(Math.max(0, Math.floor(level)), t.levels.length - 1) + 1;
    if (level && typeof level === "object") { const i = t.levels.indexOf(level); if (i >= 0) return i + 1; if (level.index != null) return level.index + 1; }
    return 1;
  }
  window.MathTopics = window.MathTopics || [];
  T.forEach(t => window.MathTopics.push(t));
  /* for the tests and the host: plain helpers, never the answers */
  window.MoneyArt = { coinSVG, billSVG, pic, MONEY: JSON.parse(JSON.stringify(MONEY)), fmt };
})();
