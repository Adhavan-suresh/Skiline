import { google } from 'googleapis';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const SHEET_ID = '1jyNnRjklz6wqz-QLqhpWMmy-bGG7_yddyUmm6vrTr6Y';
const TABS = ['Housewives', 'Retirees', 'Surat'];

const sa = JSON.parse(readFileSync(path.join(__dirname, '..', '..', 'config', 'service-account.json'), 'utf8'));
const auth = new google.auth.GoogleAuth({ credentials: sa, scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'] });
const sheets = google.sheets({ version: 'v4', auth });

const COLS = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T'];

for (const tab of TABS) {
  // Read entire tab, find which columns have ANY non-empty cell
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: `${tab}!A:T`, majorDimension: 'ROWS' });
  const rows = res.data.values || [];
  const used = new Array(20).fill(false);
  let maxLen = 0;
  for (const r of rows) {
    maxLen = Math.max(maxLen, r.length);
    for (let i = 0; i < r.length; i++) {
      if ((r[i] ?? '').toString().trim() !== '') used[i] = true;
    }
  }
  const header = rows[0] || [];
  console.log(`\n=== ${tab} (widest row: ${maxLen} cols) ===`);
  console.log('  Headers:', COLS.map((c,i)=>used[i]?`${c}[${header[i]||''}]`:`${c}(EMPTY)`).join(' '));
  const firstEmpty = used.findIndex(u => !u);
  console.log(`  First fully-empty column: ${COLS[firstEmpty] ?? 'none in A:T'}`);
}
