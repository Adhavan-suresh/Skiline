import 'dotenv/config';

const token = process.env.META_TOKEN;
const accountId = process.env.AD_ACCOUNT_ID;

const res = await fetch(
  `https://graph.facebook.com/v19.0/${accountId}/insights?` +
  `fields=date_start,adset_name,spend,actions` +
  `&level=adset&time_range={"since":"2026-06-21","until":"2026-07-10"}` +
  `&time_increment=1&limit=500` +
  `&access_token=${token}`
);
const data = await res.json();
if (data.error) { console.log('ERROR:', JSON.stringify(data.error)); process.exit(1); }

// Categorise each row
function cat(name) {
  const n = (name || '').toLowerCase();
  if (n.includes('housewi') || n.includes('homemaker')) return 'HW';
  if (n.includes('retir')) return 'Retirees';
  if (n.includes('surat') || n.includes('leader')) return 'Surat';
  return null;
}

// Aggregate by date + category
const byDate = {};
for (const row of data.data) {
  const c = cat(row.adset_name);
  if (!c) continue;
  const d = row.date_start;
  if (!byDate[d]) byDate[d] = { HW: {spend:0,leads:0}, Retirees: {spend:0,leads:0}, Surat: {spend:0,leads:0} };
  byDate[d][c].spend += parseFloat(row.spend || 0);
  byDate[d][c].leads += parseInt(row.actions?.find(a => a.action_type === 'lead')?.value || 0);
}

const out = [];
for (const [date, cats] of Object.entries(byDate).sort()) {
  const row = { date };
  for (const c of ['HW','Retirees','Surat']) {
    row[c + '_leads'] = cats[c].leads;
    row[c + '_spend'] = +cats[c].spend.toFixed(2);
    row[c + '_cpl'] = cats[c].leads > 0 ? +(cats[c].spend / cats[c].leads).toFixed(2) : null;
  }
  row.total_leads = cats.HW.leads + cats.Retirees.leads + cats.Surat.leads;
  const ts = cats.HW.spend + cats.Retirees.spend + cats.Surat.spend;
  const tl = row.total_leads;
  row.blended_cpl = tl > 0 ? +(ts / tl).toFixed(2) : null;
  out.push(row);
}

console.log(JSON.stringify(out, null, 2));
