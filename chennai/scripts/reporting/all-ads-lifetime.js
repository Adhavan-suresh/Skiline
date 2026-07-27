import 'dotenv/config';
const token = process.env.META_TOKEN;
const accountId = process.env.AD_ACCOUNT_ID;

const res = await fetch(
  `https://graph.facebook.com/v19.0/${accountId}/insights?` +
  `fields=ad_name,spend,impressions,ctr,frequency,actions` +
  `&level=ad&time_range={"since":"2026-06-01","until":"2026-07-20"}&limit=200` +
  `&access_token=${token}`
);
const data = await res.json();
if (data.error) { console.log('ERROR:', JSON.stringify(data.error)); process.exit(1); }

const rows = [];
for (const a of data.data) {
  const leads = parseInt(a.actions?.find(x=>x.action_type==='lead')?.value||0);
  const spend = parseFloat(a.spend||0);
  if (spend < 20) continue; // skip trivial
  rows.push({
    name: a.ad_name,
    spend: spend,
    leads,
    cpl: leads>0? spend/leads : 9999,
    ctr: parseFloat(a.ctr||0),
    freq: parseFloat(a.frequency||0),
  });
}
rows.sort((a,b)=>a.cpl-b.cpl);
console.log('=== ALL ADS Jun 1 - Jul 20, ranked by CPL (spend >= 20) ===\n');
console.log('CPL      CTR    Freq  Leads  Spend    Ad');
for (const r of rows) {
  const cpl = r.cpl===9999?'  —  ':('₹'+r.cpl.toFixed(1)).padStart(6);
  console.log(`${cpl}  ${r.ctr.toFixed(2).padStart(5)}% ${r.freq.toFixed(2)}  ${String(r.leads).padStart(4)}  ₹${String(Math.round(r.spend)).padStart(5)}  ${r.name}`);
}
