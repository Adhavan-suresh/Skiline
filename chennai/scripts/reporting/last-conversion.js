import { google } from 'googleapis';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const SPREADSHEET_ID = '1jyNnRjklz6wqz-QLqhpWMmy-bGG7_yddyUmm6vrTr6Y';

// Per-tab schema differs. Rating column index varies; Surat uses STATUS text.
const SHEETS = [
  { name: 'Housewives', range: 'Housewives!A2:J', dateCol: 1, nameCol: 2, ratingCol: 7, statusCol: 6 },
  { name: 'Retirees',   range: 'Retirees!A2:J',   dateCol: 1, nameCol: 2, ratingCol: 7, statusCol: 6 },
  { name: 'Surat',      range: 'Surat!A2:J',       dateCol: 1, nameCol: 2, ratingCol: null, statusCol: 7 },
];

const sa = JSON.parse(readFileSync(path.join(__dirname, '..', '..', 'config', 'service-account.json'), 'utf8'));
const auth = new google.auth.GoogleAuth({ credentials: sa, scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'] });
const sheets = google.sheets({ version: 'v4', auth });

function parseDate(s) {
  if (!s) return null;
  const d = new Date(s.replace(/\(IST\)/, '').trim());
  return isNaN(d) ? null : d;
}
// "converted" = rating 5, OR status text logged/lacode
function isConverted(rating, status) {
  if (rating === 5) return true;
  const t = (status || '').toUpperCase();
  return t.includes('LOGGED') || t.includes('LACODE') || t.includes('LA CODE') || t.includes('LCD');
}

const conversions = [];
for (const s of SHEETS) {
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: s.range });
  const rows = res.data.values || [];
  for (const row of rows) {
    const date = row[s.dateCol]?.trim();
    const name = row[s.nameCol]?.trim();
    const rating = s.ratingCol != null ? parseInt(row[s.ratingCol]?.trim()) : NaN;
    const status = row[s.statusCol]?.trim();
    if (isConverted(rating, status)) conversions.push({ seg: s.name, date, name, status, d: parseDate(date) });
  }
}

conversions.sort((a, b) => (b.d?.getTime() || 0) - (a.d?.getTime() || 0));
console.log(`Total conversions (rating 5 / LA CODE / LOGGED): ${conversions.length}\n`);
console.log('Most recent first:');
conversions.forEach(c => console.log(`  ${c.date || '(no date)'} | ${c.seg.padEnd(10)} | ${c.name || ''} ${c.status ? '('+c.status+')' : ''}`));
