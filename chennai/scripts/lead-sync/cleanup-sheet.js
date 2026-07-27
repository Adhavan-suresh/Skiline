import dotenv from 'dotenv';
import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const SHEET_ID = '1jyNnRjklz6wqz-QLqhpWMmy-bGG7_yddyUmm6vrTr6Y';
const sa = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'config', 'service-account.json'), 'utf8'));
const auth = new google.auth.GoogleAuth({ credentials: sa, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
const sheets = google.sheets({ version: 'v4', auth });

function normalizePhone(raw) {
  if (!raw) return null;
  return raw.replace(/\D/g, '').slice(-10);
}

// ── Step 1: Get sheet tab IDs ─────────────────────────────────────────────────
const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
const sheetIds = {};
for (const s of meta.data.sheets) {
  sheetIds[s.properties.title] = s.properties.sheetId;
}
console.log('Sheet IDs:', sheetIds);

// ── Step 2: Fix future dates (3 Jul 26 → 2 Jul 26) ───────────────────────────
console.log('\n--- Fixing future dates ---');

// HW: audit found rows 616-623 showing "3 Jul 26"
// Surat: audit found row 52 showing "3 Jul 26"
// Read actual data to confirm before patching

async function fixFutureDates(tabName) {
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: `${tabName}!B:B` });
  const cells = res.data.values || [];
  const updates = [];
  for (let i = 1; i < cells.length; i++) { // skip header
    const val = (cells[i]?.[0] || '').trim();
    if (val === '3 Jul 26') {
      const sheetRow = i + 1; // 1-indexed
      updates.push({ range: `${tabName}!B${sheetRow}`, values: [['2 Jul 26']] });
    }
  }
  if (!updates.length) { console.log(`  ${tabName}: no future dates`); return; }
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SHEET_ID,
    resource: { valueInputOption: 'RAW', data: updates },
  });
  console.log(`  ${tabName}: fixed ${updates.length} future-dated rows → "2 Jul 26"`);
}

await fixFutureDates('Housewives');
await fixFutureDates('Retirees');
await fixFutureDates('Surat');

// ── Step 3: Identify rows to delete (blanks + duplicates) ────────────────────
console.log('\n--- Identifying rows to delete ---');

async function getRowsToDelete(tabName) {
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: `${tabName}!A:E` });
  const rows = res.data.values || [];
  const data = rows.slice(1); // remove header

  const toDelete = []; // sheet row numbers (1-indexed)
  const seenPhones = new Set();

  for (let i = 0; i < data.length; i++) {
    const sheetRow = i + 2; // 1-indexed, +1 for header
    const [, , name, phone] = data[i];
    const ph = normalizePhone(phone);

    // Blank row
    if (!name && !phone) {
      toDelete.push({ sheetRow, reason: 'blank' });
      continue;
    }

    // Duplicate phone
    if (ph && seenPhones.has(ph)) {
      toDelete.push({ sheetRow, reason: `dup phone ${ph}` });
      continue;
    }
    if (ph) seenPhones.add(ph);
  }

  console.log(`  ${tabName}: ${toDelete.length} rows to delete`);
  for (const r of toDelete) console.log(`    Sheet row ${r.sheetRow}: ${r.reason}`);
  return toDelete;
}

const hwDelete  = await getRowsToDelete('Housewives');
const retDelete = await getRowsToDelete('Retirees');
const surDelete = await getRowsToDelete('Surat');

// ── Step 4: Delete rows (bottom to top per tab) ───────────────────────────────
console.log('\n--- Deleting rows ---');

async function deleteRows(tabName, rowsToDelete) {
  if (!rowsToDelete.length) { console.log(`  ${tabName}: nothing to delete`); return; }
  const sheetId = sheetIds[tabName];

  // Sort descending (bottom to top) so indices don't shift
  const sorted = [...rowsToDelete].sort((a, b) => b.sheetRow - a.sheetRow);

  const requests = sorted.map(({ sheetRow }) => ({
    deleteDimension: {
      range: {
        sheetId,
        dimension: 'ROWS',
        startIndex: sheetRow - 1, // 0-indexed
        endIndex: sheetRow,       // exclusive
      },
    },
  }));

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SHEET_ID,
    resource: { requests },
  });

  console.log(`  ${tabName}: deleted ${rowsToDelete.length} rows`);
}

await deleteRows('Housewives', hwDelete);
await deleteRows('Retirees', retDelete);
await deleteRows('Surat', surDelete);

console.log('\nDone. Sheet cleaned.');
