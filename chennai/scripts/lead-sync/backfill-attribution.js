import dotenv from 'dotenv';
import { google } from 'googleapis';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..', '..');
dotenv.config({ path: path.join(ROOT, '.env') });

const TOKEN = process.env.META_TOKEN;
const PAGE_ID = process.env.PAGE_ID;
const SHEET_ID = '1jyNnRjklz6wqz-QLqhpWMmy-bGG7_yddyUmm6vrTr6Y';
const BASE = 'https://graph.facebook.com/v19.0';
const TABS = ['Housewives', 'Retirees', 'Surat'];
const SOURCE_COL = 'M';

const sa = JSON.parse(readFileSync(path.join(ROOT, 'config', 'service-account.json'), 'utf8'));
const auth = new google.auth.GoogleAuth({ credentials: sa, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
const sheets = google.sheets({ version: 'v4', auth });

const normPhone = raw => (!raw || raw === 'N/A') ? null : raw.replace(/\D/g, '').slice(-10);

// 1. Build phone -> ad_name map from Meta
console.log('Building phone -> ad map from Meta...');
const pt = (await fetch(`${BASE}/${PAGE_ID}?fields=access_token&access_token=${TOKEN}`).then(r => r.json())).access_token;
const forms = (await fetch(`${BASE}/${PAGE_ID}/leadgen_forms?fields=id,leads_count&limit=100&access_token=${pt}`).then(r => r.json())).data || [];

const phoneToAd = new Map();
for (const form of forms) {
  if (parseInt(form.leads_count || 0) === 0) continue;
  let url = `${BASE}/${form.id}/leads?fields=field_data,ad_name&limit=1000&access_token=${pt}`;
  while (url) {
    const page = await fetch(url).then(r => r.json());
    if (page.error) { console.error('  ', page.error.message); break; }
    for (const lead of page.data || []) {
      const f = {};
      for (const fd of lead.field_data) f[fd.name] = fd.values[0];
      const ph = normPhone(f.phone_number || f.phone);
      if (ph && lead.ad_name) phoneToAd.set(ph, lead.ad_name);
    }
    url = page.paging?.next || null;
  }
}
console.log(`  Mapped ${phoneToAd.size} phones to ads.`);

// 2. For each tab, read phones (col D) + existing M, fill M where blank and match found
for (const tab of TABS) {
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: `${tab}!A:M` });
  const rows = res.data.values || [];
  const out = [];       // {row, adName}
  let matched = 0, already = 0, nomatch = 0;

  for (let i = 1; i < rows.length; i++) {   // skip header
    const r = rows[i];
    const phone = normPhone(r[3]);          // col D
    const curM = (r[12] ?? '').toString().trim(); // col M index 12
    if (curM) { already++; continue; }
    if (!phone) continue;
    const ad = phoneToAd.get(phone);
    if (!ad) { nomatch++; continue; }
    out.push({ row: i + 1, adName: ad });
    matched++;
  }

  // batch update M cells
  if (out.length) {
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: SHEET_ID,
      resource: {
        valueInputOption: 'RAW',
        data: out.map(o => ({ range: `${tab}!${SOURCE_COL}${o.row}`, values: [[o.adName]] })),
      },
    });
  }
  console.log(`${tab}: filled ${matched} | already had ${already} | no Meta match ${nomatch}`);
}
console.log('Done.');
