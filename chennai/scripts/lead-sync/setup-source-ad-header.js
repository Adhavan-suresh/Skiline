import { google } from 'googleapis';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const SHEET_ID = '1jyNnRjklz6wqz-QLqhpWMmy-bGG7_yddyUmm6vrTr6Y';
const TABS = ['Housewives', 'Retirees', 'Surat'];
const SOURCE_COL = 'M'; // first column fully empty on ALL three tabs (K/L are used on some)

const sa = JSON.parse(readFileSync(path.join(__dirname, '..', '..', 'config', 'service-account.json'), 'utf8'));
const auth = new google.auth.GoogleAuth({ credentials: sa, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
const sheets = google.sheets({ version: 'v4', auth });

for (const tab of TABS) {
  // Only set header if K1 is empty — don't clobber
  const cur = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: `${tab}!${SOURCE_COL}1` });
  const existing = cur.data.values?.[0]?.[0];
  if (existing) { console.log(`${tab}: K1 already = "${existing}" — leaving as is`); continue; }
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${tab}!${SOURCE_COL}1`,
    valueInputOption: 'RAW',
    resource: { values: [['Source Ad']] },
  });
  console.log(`${tab}: set ${SOURCE_COL}1 = "Source Ad"`);
}
console.log('Done.');
