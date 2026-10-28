/**
 * Create the "LAO" tab in the lead sheet (2026-10-28), header copied from Solapur
 * so the webhook's A:E / M:R writes and the calling team's F:L columns line up the
 * same way as every other Leaders tab. Safe to re-run: does nothing if the tab exists.
 */

import { google } from 'googleapis';
import { readFileSync } from 'fs';

const SHEET_ID = '1jyNnRjklz6wqz-QLqhpWMmy-bGG7_yddyUmm6vrTr6Y';
const sa = JSON.parse(readFileSync('config/service-account.json', 'utf8'));
const auth = new google.auth.GoogleAuth({ credentials: sa, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
const sheets = google.sheets({ version: 'v4', auth });

const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID, fields: 'sheets.properties(title,sheetId)' });
if (meta.data.sheets.some((s) => s.properties.title === 'LAO')) {
  console.log('LAO tab already exists, nothing to do.');
  process.exit(0);
}

const hdr = (await sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: 'Solapur!A1:R1' })).data.values[0];
await sheets.spreadsheets.batchUpdate({
  spreadsheetId: SHEET_ID,
  requestBody: { requests: [{ addSheet: { properties: { title: 'LAO', gridProperties: { frozenRowCount: 1 } } } }] },
});
await sheets.spreadsheets.values.update({
  spreadsheetId: SHEET_ID,
  range: 'LAO!A1:R1',
  valueInputOption: 'RAW',
  requestBody: { values: [hdr] },
});
console.log('Created LAO tab with header:', hdr.join(' | '));
