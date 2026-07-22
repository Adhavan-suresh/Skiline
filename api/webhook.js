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

// ── Google Sheets client (service account from env var — Vercel has no files) ──
const sa = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
const auth = new google.auth.GoogleAuth({ credentials: sa, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
const sheets = google.sheets({ version: 'v4', auth });

function routeToSheet(formName) {
  const n = (formName || '').toLowerCase();
  if (n.includes('surat') || n.includes('leader'))          return 'Surat';
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

  const [existing, countRes] = await Promise.all([
    sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: `${sheetName}!D:D` }),
    sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: `${sheetName}!A:A` }),
  ]);
  const phones = new Set((existing.data.values || []).slice(1).map(r => normalizePhone(r[0])).filter(Boolean));
  if (phones.has(phone)) { console.log(`Dup ${phone} in ${sheetName} — skip`); return; }

  const nextRow = countRes.data.values?.length || 1;
  const appendRes = await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: `${sheetName}!A:H`,
    valueInputOption: 'RAW',
    resource: { values: [[nextRow, toIST(lead.created_time), f.full_name || f.name || 'N/A', phone, f.email || 'N/A', '', '', '']] },
  });

  // stamp source ad into col M on the exact appended row (separate write — tabs differ)
  const m = (appendRes.data.updates?.updatedRange || '').match(/![A-Z]+(\d+):/);
  if (m) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `${sheetName}!${SOURCE_COL}${m[1]}`,
      valueInputOption: 'RAW',
      resource: { values: [[lead.ad_name || '']] },
    }).catch(e => console.error('source-ad stamp failed:', e.message));
  }
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
