import { google } from 'googleapis';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const SHEET_ID = '1jyNnRjklz6wqz-QLqhpWMmy-bGG7_yddyUmm6vrTr6Y';
const TABS = ['Housewives', 'Retirees', 'Surat'];

const sa = JSON.parse(readFileSync(path.join(ROOT, 'config', 'service-account.json'), 'utf8'));
const auth = new google.auth.GoogleAuth({ credentials: sa, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
const sheets = google.sheets({ version: 'v4', auth });

function normalizePhone(raw) {
  if (!raw) return null;
  const digits = String(raw).replace(/\D/g, '').slice(-10);
  return digits.length === 10 ? digits : null;
}

// "Richness" score — which duplicate row to KEEP. Prioritizes rows the calling
// team has already worked (rating/status filled in) over blank/fresher duplicates,
// so we never destroy call-history by deleting the wrong copy.
function scoreRow(row, tab) {
  let score = 0;
  const get = i => (row[i] || '').toString().trim();
  if (tab === 'Surat') {
    if (get(7)) score += 10;  // STATUS
    if (get(9)) score += 3;   // REMARKS
    if (get(8)) score += 2;   // LCD
    if (get(10)) score += 1;  // NCD
    if (get(5)) score += 1;   // Start Timeline
    if (get(6)) score += 1;   // Area
  } else {
    if (get(7)) score += 10;  // Rating
    if (get(6)) score += 3;   // Remarks
    if (get(5)) score += 1;   // Email
  }
  if (get(12)) score += 2; // Source Ad (col M) — prefer attributed row
  return score;
}

const DRY_RUN = process.argv.includes('--dry-run');

// Guard against shared household phones: if the kept and removed rows'
// names share no word in common, this might be two different people on
// the same number, not a true duplicate submission — skip, don't delete.
function namesOverlap(a, b) {
  const tok = s => (s || '').toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/).filter(Boolean);
  const ta = tok(a), tb = tok(b);
  if (!ta.length || !tb.length) return true; // can't tell — don't block on missing data
  return ta.some(w => tb.includes(w));
}

let grandRemoved = 0;
for (const tab of TABS) {
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: `${tab}!A:N` });
  const rows = res.data.values || [];

  // group data rows (skip header at index 0) by normalized phone
  const groups = new Map(); // phone -> [{ rowIndex (1-based sheet row), row }]
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every(c => (c ?? '').toString().trim() === '')) continue;
    const phone = normalizePhone(row[3]);
    if (!phone) continue;
    const sheetRow = i + 1; // 1-based row number in the actual sheet
    if (!groups.has(phone)) groups.set(phone, []);
    groups.get(phone).push({ sheetRow, row });
  }

  const toDelete = []; // sheet row numbers (1-based)
  let dupGroups = 0;

  for (const [phone, entries] of groups) {
    if (entries.length < 2) continue;
    dupGroups++;
    const scored = entries.map(e => ({ ...e, score: scoreRow(e.row, tab) }));
    // keep highest score; tie-break: keep earliest (lowest sheetRow = submitted first)
    scored.sort((a, b) => (b.score - a.score) || (a.sheetRow - b.sheetRow));
    const keep = scored[0];
    const remove = scored.slice(1);

    console.log(`[${tab}] phone ${phone}: ${entries.length} copies — keeping row ${keep.sheetRow} ("${keep.row[2] || ''}", score ${keep.score})`);
    for (const r of remove) {
      if (!namesOverlap(keep.row[2], r.row[2])) {
        console.log(`    SKIP row ${r.sheetRow} ("${r.row[2] || ''}") — name doesn't match kept row, possible shared/family phone, needs manual review`);
        continue;
      }
      console.log(`    removing row ${r.sheetRow} ("${r.row[2] || ''}", score ${r.score})`);
      toDelete.push(r.sheetRow);
    }
  }

  console.log(`[${tab}] ${dupGroups} duplicate phone groups, ${toDelete.length} rows to remove\n`);
  grandRemoved += toDelete.length;

  if (DRY_RUN || toDelete.length === 0) continue;

  // Get the tab's sheetId (gid) for the batchUpdate deleteDimension request
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
  const sheetMeta = meta.data.sheets.find(s => s.properties.title === tab);
  const gid = sheetMeta.properties.sheetId;

  // Delete from bottom to top so row numbers don't shift under us
  toDelete.sort((a, b) => b - a);
  const requests = toDelete.map(rowNum => ({
    deleteDimension: {
      range: { sheetId: gid, dimension: 'ROWS', startIndex: rowNum - 1, endIndex: rowNum },
    },
  }));

  // batchUpdate in chunks to stay well under request-size limits
  const CHUNK = 50;
  for (let i = 0; i < requests.length; i += CHUNK) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      resource: { requests: requests.slice(i, i + CHUNK) },
    });
  }
  console.log(`[${tab}] deleted ${toDelete.length} rows.\n`);
}

console.log(DRY_RUN
  ? `DRY RUN — would remove ${grandRemoved} duplicate rows total. Re-run without --dry-run to apply.`
  : `Done — removed ${grandRemoved} duplicate rows total.`);
