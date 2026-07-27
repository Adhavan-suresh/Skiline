import { google } from 'googleapis';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const SHEET_ID = '1jyNnRjklz6wqz-QLqhpWMmy-bGG7_yddyUmm6vrTr6Y';
// per-tab rating column; Surat uses STATUS text
const TABS = [
  { name: 'Housewives', ratingCol: 7, statusCol: null, adCol: 12 },
  { name: 'Retirees',   ratingCol: 7, statusCol: null, adCol: 12 },
  { name: 'Surat',      ratingCol: null, statusCol: 7, adCol: 12 },
];

const sa = JSON.parse(readFileSync(path.join(__dirname, '..', '..', 'config', 'service-account.json'), 'utf8'));
const auth = new google.auth.GoogleAuth({ credentials: sa, scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'] });
const sheets = google.sheets({ version: 'v4', auth });

function suratBucket(status) {
  const t = (status || '').toUpperCase();
  if (!t) return 'ytc';
  if (t.includes('LA CODE') || t.includes('LACODE') || t.includes('LOGGED') || t.includes('LCD')) return 5;
  if (t.includes('PIPELINE')) return 3;
  if (t.includes('NI')) return 2;
  if (t.includes('YET TO CONNECT')) return 'ytc';
  if (t.includes('TRIED') || t.includes('RNR') || t.includes('WR')) return 1;
  return 'other';
}

for (const tab of TABS) {
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: `${tab.name}!A:M` });
  const rows = (res.data.values || []).slice(1);
  const byAd = {};

  for (const r of rows) {
    const ad = (r[tab.adCol] ?? '').toString().trim() || '(untagged)';
    let b;
    if (tab.ratingCol != null) {
      const raw = r[tab.ratingCol]?.trim();
      if (!raw) b = 'ytc'; else { const n = parseInt(raw); b = [1,2,3,4,5].includes(n) ? n : 'other'; }
    } else b = suratBucket(r[tab.statusCol]);

    byAd[ad] = byAd[ad] || { total:0, ytc:0, 1:0,2:0,3:0,4:0,5:0, other:0 };
    byAd[ad].total++; byAd[ad][b]++;
  }

  console.log(`\n=== ${tab.name} — quality by source ad ===`);
  const ads = Object.entries(byAd).sort((a,b)=>b[1].total-a[1].total);
  for (const [ad, c] of ads) {
    const qualified = c[3]+c[4]+c[5];
    const contacted = c.total - c.ytc;
    const qualRate = contacted>0 ? (qualified/contacted*100).toFixed(0) : '0';
    console.log(`\n  ${ad}  (${c.total} leads)`);
    console.log(`    YTC ${c.ytc} | R1 ${c[1]} | R2 ${c[2]} | R3 ${c[3]} | R4 ${c[4]} | R5 ${c[5]}`);
    console.log(`    Contacted ${contacted} | Qualified(3-5) ${qualified} → ${qualRate}% of contacted | Converted ${c[5]}`);
  }
}
console.log('\nNote: advisor ads launched Jul 17 — ratings lag calls, so their rows are mostly still YTC. Baseline for going forward.');
