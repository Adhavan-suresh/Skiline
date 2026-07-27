import 'dotenv/config';

const token = process.env.META_TOKEN;
const accountId = process.env.AD_ACCOUNT_ID;

const res = await fetch(
  `https://graph.facebook.com/v19.0/${accountId}/insights?` +
  `fields=date_start,adset_name,actions` +
  `&level=adset&time_range={"since":"2026-07-01","until":"${new Date().toISOString().slice(0,10)}"}` +
  `&time_increment=1&limit=500` +
  `&access_token=${token}`
);
const data = await res.json();
if (data.error) { console.log('ERROR:', JSON.stringify(data.error)); process.exit(1); }

const byDate = {};
for (const row of data.data) {
  const n = (row.adset_name || '').toLowerCase();
  const isChennai = n.includes('housewi') || n.includes('retir');
  if (!isChennai) continue;
  const d = row.date_start;
  const leads = parseInt(row.actions?.find(a => a.action_type === 'lead')?.value || 0);
  byDate[d] = (byDate[d] || 0) + leads;
}

let total = 0;
console.log('\nDate         Leads');
console.log('─────────────────');
for (const [date, leads] of Object.entries(byDate).sort()) {
  total += leads;
  console.log(`${date}   ${String(leads).padStart(4)}`);
}
console.log('─────────────────');
console.log(`Total        ${String(total).padStart(4)}`);
