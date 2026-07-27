import dotenv from 'dotenv';
import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..', '..');
dotenv.config({ path: path.join(ROOT, '.env') });

const TOKEN   = process.env.META_TOKEN;
const PAGE_ID = process.env.PAGE_ID;
const BASE    = 'https://graph.facebook.com/v19.0';

const config     = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'campaign-config.json'), 'utf8'));
const SHEET_ID   = process.env.SHEET_ID || config.google_sheet_id;
const SHEET_TAB  = config.sheet_tab || 'Leaders';
const FORM_ID    = config.form_id;

const serviceAccount = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'service-account.json'), 'utf8'));
const auth = new google.auth.GoogleAuth({
  credentials: serviceAccount,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});
const sheets = google.sheets({ version: 'v4', auth });

function normalizePhone(phone) {
  if (!phone || phone === 'N/A') return null;
  return phone.replace(/^\+91/, '').replace(/^91/, '').replace(/\D/g, '').slice(-10);
}

async function fetchLeads() {
  const pageData = await fetch(`${BASE}/${PAGE_ID}?fields=access_token&access_token=${TOKEN}`).then(r => r.json());
  if (pageData.error) throw new Error(pageData.error.message);
  const pageToken = pageData.access_token;

  let leadsUrl = `${BASE}/${FORM_ID}/leads?fields=created_time,field_data&limit=1000&access_token=${pageToken}`;
  const allLeads = [];
  while (leadsUrl) {
    const page = await fetch(leadsUrl).then(r => r.json());
    if (page.error) throw new Error(page.error.message);
    if (page.data) allLeads.push(...page.data);
    leadsUrl = page.paging?.next || null;
  }

  return allLeads
    .map(lead => {
      const fields = {};
      for (const fd of lead.field_data) {
        fields[fd.name] = Array.isArray(fd.values) ? fd.values[0] : fd.value;
      }
      return {
        time:     lead.created_time,
        name:     fields.full_name || fields.name || 'N/A',
        phone:    fields.phone_number || 'N/A',
        email:    fields.email || 'N/A',
        timeline: fields['how_soon_are_you_looking_to_start?'] || fields['how_soon_are_you_looking_to_start_'] || fields['start_timeline'] || 'N/A',
      };
    })
    .sort((a, b) => new Date(a.time) - new Date(b.time));
}

async function getExistingRows() {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_TAB}!A:F`,
  });
  return res.data.values || [];
}

async function syncLeads(leads) {
  const existing = await getExistingRows();
  const dataRows = existing.slice(1); // skip header

  // Build lookup maps: phone → rowIndex, email → rowIndex (1-based in sheet = dataRows index + 2)
  const phoneToRow = new Map();
  const emailToRow = new Map();
  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const phone = normalizePhone(row[3]);
    const email = row[4];
    if (phone) phoneToRow.set(phone, i + 2); // +2: 1-based + header
    if (email && email !== 'N/A') emailToRow.set(email, i + 2);
  }

  // Dedup within batch by phone (primary), email (secondary)
  const seenInBatch = new Map();
  for (const l of leads) {
    const key = normalizePhone(l.phone) || (l.email !== 'N/A' ? l.email : null) || `${l.name}__${l.phone}`;
    seenInBatch.set(key, l);
  }
  const deduped = [...seenInBatch.values()];

  const IST_OFFSET = 5.5 * 60 * 60 * 1000;

  const toAdd    = [];
  const toUpdate = []; // { rowIndex, row }

  for (const l of deduped) {
    const phone = normalizePhone(l.phone);
    const email = l.email !== 'N/A' ? l.email : null;

    const existingRowIdx = (phone && phoneToRow.get(phone)) || (email && emailToRow.get(email)) || null;

    const ist  = new Date(new Date(l.time).getTime() + IST_OFFSET);
    const date = ist.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    const cleanPhone = phone || l.phone;

    if (existingRowIdx) {
      // Update existing row (keep same index #)
      const existingIdx = existingRowIdx - 1; // 1-based: row 2 = lead #1, row 3 = lead #2, etc.
      toUpdate.push({ rowIndex: existingRowIdx, row: [existingIdx, date, l.name, cleanPhone, l.email, l.timeline] });
    } else {
      toAdd.push([dataRows.length + toAdd.length + 1, date, l.name, cleanPhone, l.email, l.timeline]);
    }
  }

  // Apply updates
  for (const { rowIndex, row } of toUpdate) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `${SHEET_TAB}!A${rowIndex}:F${rowIndex}`,
      valueInputOption: 'RAW',
      resource: { values: [row] },
    });
  }

  // Append new
  if (toAdd.length > 0) {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: `${SHEET_TAB}!A:F`,
      valueInputOption: 'RAW',
      resource: { values: toAdd },
    });
  }

  console.log(`Updated: ${toUpdate.length} | Added: ${toAdd.length} | Total from Meta: ${leads.length}`);
  return { added: toAdd.length, updated: toUpdate.length };
}

async function main() {
  console.log(`\nSyncing Surat Leaders leads to sheet "${SHEET_TAB}"...`);
  const leads = await fetchLeads();
  const { added, updated } = await syncLeads(leads);
  console.log(`Sync complete. Added: ${added} | Updated: ${updated} | Total: ${leads.length}\n`);
}

main().catch(err => {
  console.error('Sync failed:', err.message);
  process.exit(1);
});
