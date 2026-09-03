// Vercel serverless webhook — real-time Meta lead capture → Google Sheet.
// GET  = Meta subscription verification (hub.challenge).
// POST = leadgen event: fetch lead, dedupe by phone, append to sheet, stamp source ad (col M).
//
// Env vars (set in Vercel dashboard, NOT committed):
//   META_TOKEN, PAGE_ID, META_APP_SECRET, WEBHOOK_VERIFY_TOKEN, GOOGLE_SERVICE_ACCOUNT_JSON

import { google } from 'googleapis';
import crypto from 'crypto';

export const config = { api: { bodyParser: false } }; // need raw body for signature check

const TOKEN        = process.env.META_TOKEN;
const PAGE_ID      = process.env.PAGE_ID;
const APP_SECRET   = process.env.META_APP_SECRET;
const VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN || 'skiline-webhook-2026';
const SHEET_ID     = '1jyNnRjklz6wqz-QLqhpWMmy-bGG7_yddyUmm6vrTr6Y';
const BASE         = 'https://graph.facebook.com/v19.0';
const SOURCE_COL   = 'M'; // first column empty on all three tabs
const LEADID_COL   = 'N'; // stores the Meta leadgen_id — guards against Meta's at-least-once webhook retries
const QUALIFIER_COL = 'O'; // answer to the lead form's qualifying question, where the form has one
const GENDER_COL    = 'P'; // Founders Office form only
const DOB_COL       = 'Q'; // Founders Office form only

// ── Google Sheets client (service account from env var — Vercel has no files) ──
const sa = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
const auth = new google.auth.GoogleAuth({ credentials: sa, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
const sheets = google.sheets({ version: 'v4', auth });

// City checks MUST come before the generic 'leader' check — every Leaders form
// name contains "Leaders", so an earlier 'leader' match would swallow
// Thoraipakkam and Hyderabad leads into the Surat tab.
function routeToSheet(formName) {
  const n = (formName || '').toLowerCase();
  if (n.includes('founders office') || n.includes("founder's office")) return 'Founders Office';
  if (n.includes('thoraipakkam'))                            return 'Thoraipakkam';
  if (n.includes('hyderabad'))                               return 'Hyderabad';
  if (n.includes('surat') || n.includes('leader'))           return 'Surat';
  if (n.includes('retir'))                                   return 'Retirees';
  if (n.includes('housewiv') || n.includes('homemaker'))     return 'Housewives';
  return null;
}
function normalizePhone(raw) {
  if (!raw || raw === 'N/A') return null;
  return raw.replace(/\D/g, '').slice(-10);
}
function toIST(isoStr) {
  return new Date(isoStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit', timeZone: 'Asia/Kolkata' });
}

let pageTokenCache = null, pageTokenExpiry = 0;
async function getPageToken() {
  if (pageTokenCache && Date.now() < pageTokenExpiry) return pageTokenCache;
  const data = await fetch(`${BASE}/${PAGE_ID}?fields=access_token&access_token=${TOKEN}`).then(r => r.json());
  if (data.error) throw new Error('Page token: ' + data.error.message);
  pageTokenCache = data.access_token;
  pageTokenExpiry = Date.now() + 55 * 60 * 1000;
  return pageTokenCache;
}

async function processLead(leadgenId, formId) {
  const pt = await getPageToken();
  const [lead, form] = await Promise.all([
    fetch(`${BASE}/${leadgenId}?fields=field_data,created_time,ad_name,ad_id&access_token=${pt}`).then(r => r.json()),
    fetch(`${BASE}/${formId}?fields=name&access_token=${pt}`).then(r => r.json()),
  ]);
  if (lead.error) throw new Error('Lead: ' + lead.error.message);
  if (form.error) throw new Error('Form: ' + form.error.message);

  const sheetName = routeToSheet(form.name);
  if (!sheetName) { console.log(`Unknown form "${form.name}" — skip`); return; }

  const f = {};
  for (const fd of lead.field_data) f[fd.name] = fd.values[0];
  const phone = normalizePhone(f.phone_number || f.phone);
  if (!phone) { console.log('No phone — skip'); return; }

  // Any non-standard, non-demographic field is a custom qualifying question's
  // answer. Matching by exclusion rather than by key means a future form can
  // change its question without this needing an edit.
  const STANDARD = new Set(['full_name', 'name', 'phone_number', 'phone', 'email', 'gender', 'date_of_birth']);
  const qualifier = lead.field_data
    .filter(fd => !STANDARD.has(fd.name))
    .map(fd => fd.values[0])
    .join(' | ');

  // Founders Office only: the operational tracking sheet for this specific role
  // is scoped to the stated hiring criterion (female candidates) — a lead whose
  // gender doesn't match isn't written to THIS sheet. Meta's own Lead Center
  // retains every submission regardless, unaffected by this check — nothing is
  // deleted, this only controls what gets copied into this one derivative tab.
  if (sheetName === 'Founders Office' && (f.gender || '').toLowerCase() !== 'female') {
    console.log(`Founders Office: non-female lead (${f.gender || 'unknown'}) — not copied to sheet, remains in Meta Lead Center`);
    return;
  }

  const [existing, countRes, leadIdRes] = await Promise.all([
    sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: `${sheetName}!D:D` }),
    sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: `${sheetName}!A:A` }),
    sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: `${sheetName}!${LEADID_COL}:${LEADID_COL}` }),
  ]);
  // Meta guarantees at-least-once delivery — the same leadgen_id can arrive twice (retries).
  // Check that first: it's an exact-event match, unlike phone (which two different people could share).
  const seenLeadIds = new Set((leadIdRes.data.values || []).flat().filter(Boolean));
  if (seenLeadIds.has(String(leadgenId))) { console.log(`Dup event ${leadgenId} in ${sheetName} — skip`); return; }

  const phones = new Set((existing.data.values || []).slice(1).map(r => normalizePhone(r[0])).filter(Boolean));
  if (phones.has(phone)) { console.log(`Dup ${phone} in ${sheetName} — skip`); return; }

  // Explicit target row, not Sheets' auto-detected append range — the append-range
  // heuristic misfired on the Hyderabad tab (wider native schema than the other
  // tabs confused its "find the table" logic), landing new rows 7 columns to the
  // right of A and breaking phone-based dedup for every row after. Computing the
  // row ourselves and writing with `.update()` removes that ambiguity entirely.
  const rowCount = countRes.data.values?.length || 1; // includes header row
  const nextRow = rowCount; // label shown in column A — data rows are 1-indexed after the header
  const targetRow = rowCount + 1; // physical sheet row to write into

  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${sheetName}!A${targetRow}:H${targetRow}`,
    valueInputOption: 'RAW',
    resource: { values: [[nextRow, toIST(lead.created_time), f.full_name || f.name || 'N/A', phone, f.email || 'N/A', '', '', '']] },
  });

  // stamp source ad + leadgen_id + qualifier + gender + DOB on that same explicit row.
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${sheetName}!${SOURCE_COL}${targetRow}:${DOB_COL}${targetRow}`,
    valueInputOption: 'RAW',
    resource: { values: [[lead.ad_name || '', String(leadgenId), qualifier, f.gender || '', f.date_of_birth || '']] },
  }).catch(e => console.error('source-ad/leadid/qualifier/gender/dob stamp failed:', e.message));
  console.log(`[${new Date().toISOString()}] ${sheetName} +1 | ${f.full_name || 'N/A'} | ${phone} | ad: ${lead.ad_name || '?'}`);
}

async function getRawBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  // ── GET: Meta verification handshake ──
  if (req.method === 'GET') {
    const q = req.query || {};
    if (q['hub.mode'] === 'subscribe' && q['hub.verify_token'] === VERIFY_TOKEN) {
      return res.status(200).send(q['hub.challenge']);
    }
    return res.status(403).send('Forbidden');
  }

  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  // ── POST: verify signature over raw body ──
  const raw = await getRawBody(req);
  if (APP_SECRET) {
    const sig = req.headers['x-hub-signature-256'];
    const expected = 'sha256=' + crypto.createHmac('sha256', APP_SECRET).update(raw).digest('hex');
    if (!sig || sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
      return res.status(401).send('Bad signature');
    }
  }

  let body;
  try { body = JSON.parse(raw.toString('utf8')); } catch { return res.status(400).send('Bad JSON'); }

  // Serverless can't work after responding — process, then reply (well under Meta's 20s window).
  if (body.object === 'page') {
    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        if (change.field !== 'leadgen') continue;
        const { leadgen_id, form_id } = change.value;
        try { await processLead(leadgen_id, form_id); }
        catch (e) { console.error(`Lead ${leadgen_id}:`, e.message); }
      }
    }
  }
  return res.status(200).send('EVENT_RECEIVED');
}
