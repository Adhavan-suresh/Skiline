import { google } from 'googleapis';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const SHEET_ID = '1jyNnRjklz6wqz-QLqhpWMmy-bGG7_yddyUmm6vrTr6Y';
const TABS = ['Housewives', 'Retirees', 'Surat'];

const sa = JSON.parse(readFileSync(path.join(ROOT, 'config', 'service-account.json'), 'utf8'));
const auth = new google.auth.GoogleAuth({
  credentials: sa,
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});
const sheets = google.sheets({ version: 'v4', auth });

mkdirSync(path.join(ROOT, 'backups'), { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const outPath = path.join(ROOT, 'backups', `sheet-backup-${stamp}.json`);

const backup = {};
for (const tab of TABS) {
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: `${tab}!A:N` });
  backup[tab] = res.data.values || [];
  console.log(`${tab}: ${backup[tab].length} rows backed up`);
}

writeFileSync(outPath, JSON.stringify(backup, null, 0));
console.log('\nBackup written to:', outPath);
