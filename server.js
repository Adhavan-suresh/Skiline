import express from 'express';
import dotenv from 'dotenv';
import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const TOKEN        = process.env.META_TOKEN;
const PAGE_ID      = process.env.PAGE_ID;
const SHEET_ID     = '1jyNnRjklz6wqz-QLqhpWMmy-bGG7_yddyUmm6vrTr6Y';
const VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN || 'skiline-webhook-2026';
const APP_SECRET   = process.env.META_APP_SECRET;
const BASE         = 'https://graph.facebook.com/v19.0';

// Google Sheets — support env var (Railway) or local file (dev)
const sa = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  ? JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON)
  : JSON.parse(fs.readFileSync(path.join(__dirname, 'config', 'service-account.json'), 'utf8'));

const auth   = new google.auth.GoogleAuth({ credentials: sa, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
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
  const d = new Date(new Date(isoStr).getTime() + 5.5 * 3600000);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' });
}

let pageTokenCache = null;
let pageTokenExpiry = 0;

async function getPageToken() {
  if (pageTokenCache && Date.now() < pageTokenExpiry) return pageTokenCache;
  const data = await fetch(`${BASE}/${PAGE_ID}?fields=access_token&access_token=${TOKEN}`).then(r => r.json());
  if (data.error) throw new Error('Page token: ' + data.error.message);
  pageTokenCache = data.access_token;
  pageTokenExpiry = Date.now() + 55 * 60 * 1000; // cache 55 min
  return pageTokenCache;
}

async function processLead(leadgenId, formId) {
  const pt = await getPageToken();

  const [lead, form] = await Promise.all([
    fetch(`${BASE}/${leadgenId}?fields=field_data,created_time&access_token=${pt}`).then(r => r.json()),
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

  // Dedup + row count in parallel
  const [existing, countRes] = await Promise.all([
    sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: `${sheetName}!D:D` }),
    sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: `${sheetName}!A:A` }),
  ]);

  const phones = new Set((existing.data.values || []).slice(1).map(r => normalizePhone(r[0])).filter(Boolean));
  if (phones.has(phone)) { console.log(`Dup ${phone} in ${sheetName} — skip`); return; }

  const nextRow = countRes.data.values?.length || 1;

  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: `${sheetName}!A:H`,
    valueInputOption: 'RAW',
    resource: { values: [[nextRow, toIST(lead.created_time), f.full_name || f.name || 'N/A', phone, f.email || 'N/A', '', '', '']] },
  });

  console.log(`[${new Date().toISOString()}] ${sheetName} +1 | ${f.full_name || 'N/A'} | ${phone}`);
}

const app = express();
app.use(express.json({
  verify: (req, _res, buf) => { req.rawBody = buf; },
}));

// Meta webhook verification
app.get('/webhook', (req, res) => {
  if (req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token'] === VERIFY_TOKEN) {
    console.log('Webhook verified by Meta');
    res.status(200).send(req.query['hub.challenge']);
  } else {
    res.sendStatus(403);
  }
});

// Lead events
app.post('/webhook', async (req, res) => {
  if (APP_SECRET) {
    const sig = req.headers['x-hub-signature-256'];
    if (!sig) { res.sendStatus(401); return; }
    const expected = 'sha256=' + crypto.createHmac('sha256', APP_SECRET).update(req.rawBody).digest('hex');
    if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
      res.sendStatus(401); return;
    }
  }

  res.sendStatus(200); // Must respond fast — Meta retries if >20s

  if (req.body.object !== 'page') return;
  for (const entry of req.body.entry || []) {
    for (const change of entry.changes || []) {
      if (change.field !== 'leadgen') continue;
      const { leadgen_id, form_id } = change.value;
      processLead(leadgen_id, form_id).catch(e => console.error(`Lead ${leadgen_id}:`, e.message));
    }
  }
});

app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Skiline webhook server running on port ${PORT}`));
