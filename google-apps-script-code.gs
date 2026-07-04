
/**
 * Vaani Invitation Backend - Google Apps Script
 * Deploy as: Web app → Execute as Me → Anyone
 */
const SHEET_NAME = 'Guests';
const ADMIN_KEY = 'PASTE_PRIVATE_ADMIN_KEY_HERE'; // Keep private; enter this key in admin.html.

const HEADERS = [
  'Token','Host Name','Phone','Reserved Adults','Reserved Kids','RSVP',
  'Adults Coming','Kids Coming','Message','First Open','Last Open','View Count','Last Updated'
];

function doGet(e) {
  const p = (e && e.parameter) || {};
  const action = p.action || 'get';
  let out;
  try {
    ensureSheet_();
    if (action === 'get') out = getGuest_(p.token);
    else if (action === 'rsvp') out = saveRsvp_(p);
    else if (action === 'admin') out = admin_(p.adminKey);
    else if (action === 'setup') out = setup_();
    else out = { ok:false, error:'Unknown action' };
  } catch (err) {
    out = { ok:false, error:String(err && err.message ? err.message : err) };
  }
  return respond_(out, p.callback);
}

function respond_(obj, callback) {
  const json = JSON.stringify(obj);
  if (callback) {
    return ContentService.createTextOutput(`${callback}(${json});`)
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

function sheet_() {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
}

function ensureSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) sh = ss.insertSheet(SHEET_NAME);
  const existing = sh.getRange(1,1,1,HEADERS.length).getValues()[0];
  const needsHeaders = existing.join('') === '' || existing[0] !== 'Token';
  if (needsHeaders) {
    sh.getRange(1,1,1,HEADERS.length).setValues([HEADERS]);
    sh.setFrozenRows(1);
  }
  return sh;
}

function headerMap_(sh) {
  const h = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0];
  const map = {};
  h.forEach((name, i) => map[name] = i + 1);
  return map;
}

function findRowByToken_(token) {
  if (!token) return -1;
  const sh = sheet_();
  const last = sh.getLastRow();
  if (last < 2) return -1;
  const values = sh.getRange(2,1,last-1,1).getValues().flat();
  const idx = values.findIndex(v => String(v).trim() === String(token).trim());
  return idx === -1 ? -1 : idx + 2;
}

function getGuest_(token) {
  const sh = sheet_();
  const row = findRowByToken_(token);
  if (row < 0) return { ok:false, error:'Invalid invitation link.' };
  const m = headerMap_(sh);
  const now = new Date();
  const firstOpenCell = sh.getRange(row, m['First Open']);
  if (!firstOpenCell.getValue()) firstOpenCell.setValue(now);
  sh.getRange(row, m['Last Open']).setValue(now);
  const viewCell = sh.getRange(row, m['View Count']);
  viewCell.setValue(Number(viewCell.getValue() || 0) + 1);
  SpreadsheetApp.flush();
  return { ok:true, guest: rowToGuest_(sh, row, m) };
}

function saveRsvp_(p) {
  const sh = sheet_();
  const row = findRowByToken_(p.token);
  if (row < 0) return { ok:false, error:'Invalid invitation link.' };
  const m = headerMap_(sh);
  const now = new Date();
  const rsvp = p.rsvp === 'no' ? 'no' : 'yes';
  sh.getRange(row, m['RSVP']).setValue(rsvp);
  sh.getRange(row, m['Adults Coming']).setValue(rsvp === 'yes' ? Number(p.adultsComing || 0) : 0);
  sh.getRange(row, m['Kids Coming']).setValue(rsvp === 'yes' ? Number(p.kidsComing || 0) : 0);
  sh.getRange(row, m['Message']).setValue(p.message || '');
  sh.getRange(row, m['Last Updated']).setValue(now);
  SpreadsheetApp.flush();
  return { ok:true, lastUpdated: formatDate_(now) };
}

function admin_(adminKey) {
  if (adminKey !== ADMIN_KEY) return { ok:false, error:'Invalid admin key.' };
  const sh = sheet_();
  const last = sh.getLastRow();
  const m = headerMap_(sh);
  if (last < 2) return { ok:true, summary:{ invited:0, viewed:0, rsvps:0, pending:0, accepted:0, declined:0, adults:0, kids:0, totalComing:0 }, guests:[] };
  const data = sh.getRange(2,1,last-1,sh.getLastColumn()).getValues();
  const guests = data.map((_, i) => rowToGuest_(sh, i + 2, m));
  const summary = guests.reduce((s, g) => {
    s.invited++;
    if (g.viewCount > 0) s.viewed++;
    if (g.rsvp) s.rsvps++; else s.pending++;
    if (g.rsvp === 'yes') {
      s.accepted++;
      s.adults += Number(g.adultsComing || 0);
      s.kids += Number(g.kidsComing || 0);
    }
    if (g.rsvp === 'no') s.declined++;
    return s;
  }, { invited:0, viewed:0, rsvps:0, pending:0, accepted:0, declined:0, adults:0, kids:0 });
  summary.totalComing = summary.adults + summary.kids;
  return { ok:true, summary, guests };
}

function rowToGuest_(sh, row, m) {
  const v = sh.getRange(row,1,1,sh.getLastColumn()).getValues()[0];
  const get = name => v[(m[name] || 1) - 1];
  return {
    token: String(get('Token') || ''),
    hostName: String(get('Host Name') || ''),
    phone: String(get('Phone') || ''),
    reservedAdults: Number(get('Reserved Adults') || 0),
    reservedKids: Number(get('Reserved Kids') || 0),
    rsvp: String(get('RSVP') || ''),
    adultsComing: get('Adults Coming') === '' ? '' : Number(get('Adults Coming') || 0),
    kidsComing: get('Kids Coming') === '' ? '' : Number(get('Kids Coming') || 0),
    message: String(get('Message') || ''),
    firstOpen: formatDate_(get('First Open')),
    lastOpen: formatDate_(get('Last Open')),
    viewCount: Number(get('View Count') || 0),
    lastUpdated: formatDate_(get('Last Updated'))
  };
}

function formatDate_(d) {
  if (!d) return '';
  return Utilities.formatDate(new Date(d), Session.getScriptTimeZone(), 'MMM d, yyyy h:mm a');
}

function setup_() {
  ensureSheet_();
  return { ok:true, message:'Guests sheet is ready.' };
}

function generateToken_() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let t = '';
  for (let i = 0; i < 10; i++) t += chars[Math.floor(Math.random() * chars.length)];
  return t;
}

function fillMissingTokens() {
  const sh = ensureSheet_();
  const m = headerMap_(sh);
  const last = sh.getLastRow();
  if (last < 2) return;
  const tokenRange = sh.getRange(2, m['Token'], last-1, 1);
  const values = tokenRange.getValues();
  const used = new Set(values.flat().filter(Boolean).map(String));
  const updated = values.map(row => {
    if (row[0]) return row;
    let t;
    do { t = generateToken_(); } while (used.has(t));
    used.add(t);
    return [t];
  });
  tokenRange.setValues(updated);
}
