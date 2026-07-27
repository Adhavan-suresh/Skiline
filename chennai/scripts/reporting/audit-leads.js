import { google } from 'googleapis';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const SPREADSHEET_ID = '1jyNnRjklz6wqz-QLqhpWMmy-bGG7_yddyUmm6vrTr6Y';

// NOTE: tab schemas differ. Housewives has an extra blank column, shifting Rating to col 7.
// Retirees Rating is col 6. Surat has no numeric rating — quality lives in STATUS text (col 7).
const SHEETS = [
  { name: 'Housewives', range: 'Housewives!A2:J', ratingCol: 7, remarksCol: 6, statusCol: null },
  { name: 'Retirees',   range: 'Retirees!A2:J',   ratingCol: 7, remarksCol: 6, statusCol: null },
  { name: 'Surat',      range: 'Surat!A2:J',       ratingCol: null, remarksCol: 9, statusCol: 7 },
];

// Jul 1–17 spend per segment (from Meta insights, ad-level)
const SPEND = { Housewives: 4040, Retirees: 2470, Surat: 2037 };

const sa = JSON.parse(readFileSync(path.join(__dirname, '..', '..', 'config', 'service-account.json'), 'utf8'));
const auth = new google.auth.GoogleAuth({ credentials: sa, scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'] });
const sheets = google.sheets({ version: 'v4', auth });

// Classify a Surat row (text STATUS) into a rating-equivalent bucket
function suratBucket(status) {
  const t = (status || '').toUpperCase();
  if (!t) return 'ytc';
  if (t.includes('LA CODE') || t.includes('LACODE') || t.includes('LOGGED') || t.includes('LCD')) return 5;
  if (t.includes('PIPELINE')) return 3;
  if (t.includes('NI')) return 2;              // not interested on phone
  if (t.includes('YET TO CONNECT')) return 'ytc';
  if (t.includes('TRIED') || t.includes('RNR') || t.includes('WR')) return 1;
  return 'other';
}

console.log('\n=== CORRECTED CPQL + Reachability Analysis (Jul 1-17) ===\n');

let grandTotal = 0, grandQualified = 0, grandSpend = 0, grandContacted = 0, grandConverted = 0;

for (const s of SHEETS) {
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: s.range });
  const rows = res.data.values || [];

  const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, ytc: 0, other: 0 };
  let total = 0;

  for (const row of rows) {
    // skip fully empty rows
    if (!row || row.every(c => (c ?? '').toString().trim() === '')) continue;
    total++;

    let bucket;
    if (s.ratingCol != null) {
      const raw = row[s.ratingCol]?.trim();
      if (!raw) bucket = 'ytc';
      else {
        const r = parseInt(raw);
        bucket = [1,2,3,4,5].includes(r) ? r : 'other';
      }
    } else {
      bucket = suratBucket(row[s.statusCol]);
    }
    counts[bucket]++;
  }

  const qualified = counts[3] + counts[4] + counts[5];
  const converted = counts[5];
  const contacted = total - counts.ytc;                 // reached-or-attempted (has an outcome)
  const reachable = counts[2] + counts[3] + counts[4] + counts[5]; // actually spoke to them
  const spend = SPEND[s.name] || 0;
  const cpql = qualified > 0 ? '₹' + (spend / qualified).toFixed(0) : '—';
  const cpConv = converted > 0 ? '₹' + (spend / converted).toFixed(0) : '—';

  console.log(`[${s.name}]  Total rows: ${total}`);
  console.log(`  YTC (never contacted):     ${counts.ytc}  (${(counts.ytc/total*100).toFixed(0)}%)`);
  console.log(`  Rating 1 (unreachable):    ${counts[1]}`);
  console.log(`  Rating 2 (said no):        ${counts[2]}`);
  console.log(`  Rating 3 (warm/pipeline):  ${counts[3]}`);
  console.log(`  Rating 4 (attended orient):${counts[4]}`);
  console.log(`  Rating 5 (CONVERTED):      ${counts[5]}`);
  if (counts.other) console.log(`  Other/unclassified:        ${counts.other}`);
  console.log(`  ── Funnel ──`);
  console.log(`  Contacted (has outcome):   ${contacted}  (${(contacted/total*100).toFixed(0)}% of leads)`);
  console.log(`  Reached (spoke to):        ${reachable}  (${(reachable/total*100).toFixed(0)}% of leads, ${contacted?(reachable/contacted*100).toFixed(0):0}% of contacted)`);
  console.log(`  Qualified (3+4+5):         ${qualified}  → CPQL ${cpql}`);
  console.log(`  Converted (5):             ${converted}  → Cost/conversion ${cpConv}`);
  console.log();

  grandTotal += total; grandQualified += qualified; grandSpend += spend;
  grandContacted += contacted; grandConverted += converted;
}

console.log(`[OVERALL]`);
console.log(`  Total leads:   ${grandTotal}`);
console.log(`  Contacted:     ${grandContacted} (${(grandContacted/grandTotal*100).toFixed(0)}%)  →  Uncontacted backlog: ${grandTotal-grandContacted}`);
console.log(`  Qualified:     ${grandQualified} (${(grandQualified/grandTotal*100).toFixed(1)}%)`);
console.log(`  Converted:     ${grandConverted}`);
console.log(`  Total spend:   ₹${grandSpend}`);
console.log(`  Blended CPQL:  ₹${(grandSpend/grandQualified).toFixed(0)}`);
console.log(`  Cost / conversion: ₹${(grandSpend/grandConverted).toFixed(0)}`);
