import dotenv from 'dotenv';
import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
dotenv.config({ path: path.join(ROOT, '.env') });

const TOKEN   = process.env.META_TOKEN;
const PAGE_ID = process.env.PAGE_ID;
const SHEET_ID = '1jyNnRjklz6wqz-QLqhpWMmy-bGG7_yddyUmm6vrTr6Y';
const BASE = 'https://graph.facebook.com/v19.0';

const sa = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'service-account.json'), 'utf8'));
const auth = new google.auth.GoogleAuth({ credentials: sa, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
const sheets = google.sheets({ version: 'v4', auth });

// Route form name → sheet tab
function routeToSheet(formName) {
  const n = (formName || '').toLowerCase();
  if (n.includes('surat') || n.includes('leader'))   return 'Surat';
  if (n.includes('retir'))                            return 'Retirees';
  if (n.includes('housewiv') || n.includes('homemaker')) return 'Housewives';
  return null; // unknown form — skip
}

// Pull all leads from all page lead forms
async function fetchAllLeads() {
  const pageData = await fetch(`${BASE}/${PAGE_ID}?fields=access_token&access_token=${TOKEN}`).then(r => r.json());
  if (pageData.error) throw new Error('Page token: ' + pageData.error.message);
  const pt = pageData.access_token;

  const formsData = await fetch(`${BASE}/${PAGE_ID}/leadgen_forms?fields=id,name,leads_count&limit=100&access_token=${pt}`).then(r => r.json());
  if (formsData.error) throw new Error('Forms: ' + formsData.error.message);

  console.log(`Found ${formsData.data.length} lead forms`);

  const bySheet = { Housewives: [], Retirees: [], Surat: [] };

  for (const form of formsData.data) {
    const sheet = routeToSheet(form.name);
    if (!sheet) { console.log(`  Skipping unknown form: "${form.name}"`); continue; }
    if (parseInt(form.leads_count || 0) === 0) { console.log(`  ${form.name}: 0 leads`); continue; }

    console.log(`  ${form.name} → ${sheet} (${form.leads_count} leads)`);

    let url = `${BASE}/${form.id}/leads?fields=created_time,field_data&limit=1000&access_token=${pt}`;
    while (url) {
      const page = await fetch(url).then(r => r.json());
      if (page.error) { console.error('  Lead fetch error:', page.error.message); break; }
      for (const lead of page.data || []) {
        const f = {};
        for (const fd of lead.field_data) f[fd.name] = fd.values[0];
        bySheet[sheet].push({
          time:  lead.created_time,
          name:  f.full_name  || f.name  || 'N/A',
          phone: f.phone_number || f.phone || 'N/A',
          email: f.email || 'N/A',
        });
      }
      url = page.paging?.next || null;
    }
  }

  // Sort each by date ascending
  for (const s of Object.keys(bySheet)) {
    bySheet[s].sort((a, b) => new Date(a.time) - new Date(b.time));
  }
  return bySheet;
}

// Get existing phone numbers from sheet (dedup key)
async function getExistingPhones(sheetName) {
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: `${sheetName}!D:D` });
  const rows = res.data.values || [];
  return new Set(rows.slice(1).map(r => normalizePhone(r[0])).filter(Boolean));
}

function normalizePhone(raw) {
  if (!raw || raw === 'N/A') return null;
  return raw.replace(/\D/g, '').slice(-10); // last 10 digits
}

function toIST(isoStr) {
  const d = new Date(new Date(isoStr).getTime() + 5.5 * 3600000);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' });
}

async function syncSheet(sheetName, leads) {
  if (!leads.length) { console.log(`  ${sheetName}: no leads to sync`); return 0; }

  const existingPhones = await getExistingPhones(sheetName);
  const countBefore = existingPhones.size;

  // Dedup: skip leads whose phone already exists in sheet
  const newLeads = [];
  const seenPhones = new Set();
  for (const l of leads) {
    const ph = normalizePhone(l.phone);
    if (!ph) continue; // no phone — skip
    if (existingPhones.has(ph) || seenPhones.has(ph)) continue;
    seenPhones.add(ph);
    newLeads.push(l);
  }

  if (!newLeads.length) { console.log(`  ${sheetName}: 0 new (${countBefore} already in sheet)`); return 0; }

  // Get current row count to number new rows
  const countRes = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: `${sheetName}!A:A` });
  const startIdx = (countRes.data.values?.length || 1); // 1-based, header is row 1

  const rows = newLeads.map((l, i) => {
    const phone = normalizePhone(l.phone) || 'N/A';
    return [startIdx + i, toIST(l.time), l.name, phone, l.email, '', '', '']; // cols: #,Date,Name,Phone,Email,Remarks,Rating,Notes
  });

  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: `${sheetName}!A:H`,
    valueInputOption: 'RAW',
    resource: { values: rows },
  });

  console.log(`  ${sheetName}: +${newLeads.length} new leads (was ${countBefore})`);
  return newLeads.length;
}

// ── Main ─────────────────────────────────────────────────────────────────────
console.log('Fetching all leads from Meta...');
const bySheet = await fetchAllLeads();

console.log(`\nLead counts pulled:`);
for (const [s, leads] of Object.entries(bySheet)) console.log(`  ${s}: ${leads.length}`);

console.log('\nSyncing to Google Sheets...');
let total = 0;
for (const [sheetName, leads] of Object.entries(bySheet)) {
  total += await syncSheet(sheetName, leads);
}

console.log(`\nDone. Total new leads added: ${total}`);
