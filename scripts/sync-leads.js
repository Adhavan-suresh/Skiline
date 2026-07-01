import dotenv from 'dotenv';
import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
dotenv.config({ path: path.join(ROOT, '.env') });

const TOKEN = process.env.META_TOKEN;
const PAGE_ID = process.env.PAGE_ID;
const SHEET_ID = '1jyNnRjklz6wqz-QLqhpWMmy-bGG7_yddyUmm6vrTr6Y';
const BASE = 'https://graph.facebook.com/v19.0';
const serviceAccount = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'service-account.json'), 'utf8'));

const auth = new google.auth.GoogleAuth({
  credentials: serviceAccount,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

// Determine active segment from weekly-schedule.json
function getActiveSegment() {
  const schedule = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'weekly-schedule.json'), 'utf8'));
  const start = new Date(2026, 2, 23);
  const now = new Date();
  const weekNum = Math.floor((now - start) / (1000 * 60 * 60 * 24 * 7)) + 1;
  const weekInfo = schedule.weeks.find(w => w.week === weekNum);
  const segment = weekInfo ? weekInfo.active_segment : (weekNum % 2 === 1 ? 'housewives' : 'retirees');
  // normalise to 'retired' for form name matching
  return segment === 'retirees' ? 'retired' : segment;
}

// Pull all leads from Meta API
async function fetchAllLeads() {
  try {
    const pageData = await fetch(`${BASE}/${PAGE_ID}?fields=access_token&access_token=${TOKEN}`).then(r=>r.json());
    if (pageData.error) throw new Error(pageData.error.message);
    const pageToken = pageData.access_token;

    const fr = await fetch(`${BASE}/${PAGE_ID}/leadgen_forms?fields=id,name,leads_count&limit=50&access_token=${pageToken}`);
    const forms = await fr.json();
    if (forms.error) throw new Error(forms.error.message);

    const allLeads = [];
    for (const f of forms.data) {
      if (parseInt(f.leads_count) > 0) {
        let leadsUrl = `${BASE}/${f.id}/leads?fields=created_time,field_data&limit=1000&access_token=${pageToken}`;
        const allFormLeads = [];
        while (leadsUrl) {
          const page = await fetch(leadsUrl).then(r => r.json());
          if (page.data) allFormLeads.push(...page.data);
          leadsUrl = page.paging?.next || null;
        }
        const leads = { data: allFormLeads };
        if (leads.data) {
          for (const lead of leads.data) {
            const fields = {};
            for (const fd of lead.field_data) {
              fields[fd.name] = fd.values[0];
            }
            allLeads.push({
              time: lead.created_time,
              formName: f.name,
              name: fields.full_name,
              phone: fields.phone_number,
              email: fields.email
            });
          }
        }
      }
    }

    return allLeads.sort((a, b) => new Date(a.time) - new Date(b.time));
  } catch (err) {
    console.error('Error fetching leads:', err.message);
    throw err;
  }
}

// Get existing rows from sheet
async function getExistingRows(sheetName) {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${sheetName}!A:F`,
    });
    return response.data.values || [];
  } catch (err) {
    console.error('Error reading sheet:', err.message);
    return [];
  }
}

// Append new leads to sheet
async function appendLeadsToSheet(leads, sheetName) {
  try {
    const existing = await getExistingRows(sheetName);
    const existingEmails = new Set(existing.slice(1).map(row => row[4] || '').filter(e => e && e !== 'N/A'));

    // dedup within this batch too — last occurrence wins
    const seenInBatch = new Map();
    for (const l of leads) {
      const key = l.email && l.email !== 'N/A' ? l.email : `${l.name}__${l.phone}`;
      seenInBatch.set(key, l);
    }
    const dedupedLeads = [...seenInBatch.values()];

    const newLeads = dedupedLeads.filter(l => {
      const key = l.email && l.email !== 'N/A' ? l.email : null;
      return key ? !existingEmails.has(key) : true;
    });
    if (newLeads.length === 0) {
      console.log(`No new leads for ${sheetName}`);
      return 0;
    }

    console.log(`Existing: ${existingEmails.size} | New: ${newLeads.length}`);

    const rows = newLeads.map((l, i) => {
      const istOffset = 5.5 * 60 * 60 * 1000;
      const istDate = new Date(new Date(l.time).getTime() + istOffset);
      const date = istDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const phone = l.phone ? l.phone.replace(/^\+91/, '').replace(/^91/, '') : 'N/A';
      const nextIdx = existing.length + i;
      return [nextIdx, date, l.name || 'N/A', phone, l.email || 'N/A'];
    });

    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: `${sheetName}!A:F`,
      valueInputOption: 'RAW',
      resource: { values: rows },
    });

    console.log(`✅ Added ${newLeads.length} leads to ${sheetName}`);
    return newLeads.length;
  } catch (err) {
    console.error('Error appending to sheet:', err.message);
    throw err;
  }
}

// Main sync
async function main() {
  const segment = getActiveSegment();
  const sheetName = segment === 'retired' ? 'Retirees' : 'Housewives';

  console.log(`\n📊 Syncing ${segment.toUpperCase()} leads to ${sheetName} sheet...`);

  const leads = await fetchAllLeads();
  const retireeOrHousewives = segment === 'retired'
    ? leads.filter(l => l.formName && (l.formName.toLowerCase().includes('retired') || l.formName.toLowerCase().includes('retiree')))
    : leads.filter(l => l.formName && l.formName.toLowerCase().includes('housewives'));

  const count = await appendLeadsToSheet(retireeOrHousewives, sheetName);
  console.log(`✅ Sync complete. Added: ${count} | Total segment leads: ${retireeOrHousewives.length}\n`);
}

main().catch(err => {
  console.error('❌ Sync failed:', err.message);
  process.exit(1);
});
