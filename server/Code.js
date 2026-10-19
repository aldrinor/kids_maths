/* Kids Maths server: a Google Apps Script web app owned by the parents' Google account.
   - Keeps a backup of each child's progress (in Script Properties, split into pieces).
   - Sends one plain-text email to both parents at about 9 pm, only on days a child played.
   No secret is in this file: the family key and the email addresses live in Script Properties,
   set once by setup(). */
const PIECE = 8000;                      // one Script Property holds about 9 KB
const CHILDREN = ["marie", "kennedy"];
const props = () => PropertiesService.getScriptProperties();
const out = obj => ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
const today = () => Utilities.formatDate(new Date(), "America/Vancouver", "yyyy-MM-dd");

function keyOk(k) { const real = props().getProperty("FAMILY_KEY"); return !!real && k === real; }

function saveBig(name, text) {
  const p = props(), old = Number(p.getProperty(name + "_n") || 0), n = Math.ceil(text.length / PIECE), all = {};
  for (let i = 0; i < n; i++) all[name + "_" + i] = text.slice(i * PIECE, (i + 1) * PIECE);
  all[name + "_n"] = String(n);
  p.setProperties(all);
  for (let i = n; i < old; i++) p.deleteProperty(name + "_" + i);
}
function loadBig(name) {
  const p = props(), n = Number(p.getProperty(name + "_n") || 0); let s = "";
  for (let i = 0; i < n; i++) s += p.getProperty(name + "_" + i) || "";
  return s;
}

// The game sends: { key, child, day, summary, state }. Text/plain body, so the browser sends it without a pre-check.
function doPost(e) {
  let b; try { b = JSON.parse(e.postData.contents); } catch (x) { return out({ ok: false, error: "bad request" }); }
  if (!keyOk(b.key)) return out({ ok: false, error: "wrong family key" });
  if (CHILDREN.indexOf(b.child) < 0) return out({ ok: false, error: "unknown child" });
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    if (b.state) saveBig("state_" + b.child, JSON.stringify(b.state));
    if (b.summary && b.day) {
      const old = JSON.parse(props().getProperty("sum_" + b.child) || "{}");
      props().setProperty("sum_" + b.child, JSON.stringify({ day: b.day, subject: b.subject || "", text: String(b.summary).slice(0, 8000), sentDay: old.sentDay || "" }));
    }
    props().setProperty("seen_" + b.child, new Date().toISOString());
  } finally { lock.releaseLock(); }
  return out({ ok: true, savedAt: new Date().toISOString() });
}

// GET ?action=get&key=..&child=..  -> the saved progress (to restore a cleared iPad)
// GET ?action=status&key=..        -> when each child last saved and was last emailed
// GET ?action=setup&key=..&emails=a,b  -> first time only: store the family key and addresses, make the 9 pm trigger
function doGet(e) {
  const q = e.parameter || {};
  if (q.action === "setup") {
    if (props().getProperty("FAMILY_KEY")) return out({ ok: false, error: "already set up" });
    if (!q.key || q.key.length < 24 || !q.emails) return out({ ok: false, error: "key and emails needed" });
    props().setProperties({ FAMILY_KEY: q.key, EMAILS: q.emails });
    makeTrigger();
    return out({ ok: true });
  }
  if (!keyOk(q.key)) return out({ ok: false, error: "wrong family key" });
  if (q.action === "get") { const s = loadBig("state_" + q.child); return out({ ok: true, state: s ? JSON.parse(s) : null }); }
  if (q.action === "status") {
    const r = {}; CHILDREN.forEach(c => { const s = JSON.parse(props().getProperty("sum_" + c) || "{}"); r[c] = { lastSave: props().getProperty("seen_" + c) || "", lastDay: s.day || "", emailedDay: s.sentDay || "" }; });
    return out({ ok: true, children: r });
  }
  return out({ ok: false, error: "unknown action" });
}

function makeTrigger() {
  ScriptApp.getProjectTriggers().forEach(t => { if (t.getHandlerFunction() === "dailyEmail") ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger("dailyEmail").timeBased().atHour(21).everyDays(1).inTimezone("America/Vancouver").create();
}

// Runs every evening between 9 and 10 pm. One email per child who played today.
function dailyEmail() {
  const to = props().getProperty("EMAILS"); if (!to) return;
  const d = today();
  CHILDREN.forEach(c => {
    const s = JSON.parse(props().getProperty("sum_" + c) || "{}");
    if (s.day !== d || s.sentDay === d || !s.text) return;
    MailApp.sendEmail({ to, subject: s.subject || ("Kids Maths: " + c + ", " + d), body: s.text, name: "Kids Maths" });
    s.sentDay = d; props().setProperty("sum_" + c, JSON.stringify(s));
  });
}

// Run this once from the editor so Google asks for permission to send email and make the trigger.
function authorize() { MailApp.getRemainingDailyQuota(); ScriptApp.getProjectTriggers(); }
