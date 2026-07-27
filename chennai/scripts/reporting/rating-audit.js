import { google } from 'googleapis';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const SPREADSHEET_ID = '1jyNnRjklz6wqz-QLqhpWMmy-bGG7_yddyUmm6vrTr6Y';
const SHEETS = [
  { name: 'Housewives', range: 'Housewives!A1:J' },
  { name: 'Retirees',   range: 'Retirees!A1:J'   },
  { name: 'Surat',      range: 'Surat!A1:J'       },
];

const sa = JSON.parse(readFileSync(path.join(__dirname, '..', '..', 'config', 'service-account.json'), 'utf8'));
const auth = new google.auth.GoogleAuth({ credentials: sa, scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'] });
const sheets = google.sheets({ version: 'v4', auth });

for (const s of SHEETS) {
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: s.range });
  const rows = res.data.values || [];
  const header = rows[0] || [];
  console.log(`\n=== ${s.name} ===`);
  console.log('  Header:', header.map((h, i) => `[${i}]${h}`).join(' | '));

  // distinct values in each of columns 5,6,7 to find where rating lives
  for (const col of [5, 6, 7]) {
    const counts = {};
    for (const row of rows.slice(1)) {
      const v = (row[col] ?? '').toString().trim();
      const key = v === '' ? '(blank)' : v;
      counts[key] = (counts[key] || 0) + 1;
    }
    const top = Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0, 12);
    console.log(`  Col[${col}] "${header[col]||''}" values:`, top.map(([k,c])=>`${k}:${c}`).join('  '));
  }
}
