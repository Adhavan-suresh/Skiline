import 'dotenv/config';
const token = process.env.META_TOKEN;
const accountId = process.env.AD_ACCOUNT_ID;
const res = await fetch(
  `https://graph.facebook.com/v19.0/${accountId}/insights?` +
  `fields=ad_name,date_start,spend,impressions,ctr,actions` +
  `&level=ad&time_range={"since":"2026-07-01","until":"2026-07-15"}` +
  `&time_increment=1&limit=500` +
  `&filtering=[{"field":"ad.name","operator":"CONTAIN","value":"Hindi"}]` +
  `&access_token=${token}`
);
const data = await res.json();
if (data.error) { console.log('ERROR:', JSON.stringify(data.error)); process.exit(1); }
console.log('Surat Hindi — daily Jul 1-15:\n');
for (const row of data.data) {
  const leads = parseInt(row.actions?.find(a => a.action_type === 'lead')?.value || 0);
  console.log(`${row.date_start} | ₹${row.spend} | leads: ${leads} | CTR: ${parseFloat(row.ctr||0).toFixed(2)}%`);
}
