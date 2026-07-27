import 'dotenv/config';

const token = process.env.META_TOKEN;
const accountId = process.env.AD_ACCOUNT_ID;

const res = await fetch(
  `https://graph.facebook.com/v19.0/${accountId}/insights?` +
  `fields=ad_id,ad_name,spend,clicks,impressions,ctr,actions` +
  `&level=ad&date_preset=last_7d&limit=50` +
  `&access_token=${token}`
);
const data = await res.json();

if (data.error) { console.log('ERROR:', JSON.stringify(data.error)); process.exit(1); }

console.log('\n=== All Ads — Last 7 Days ===\n');
console.log('Ad'.padEnd(45), 'Spend'.padStart(9), 'Leads'.padStart(6), 'CPL'.padStart(8), 'CTR'.padStart(7));
console.log('—'.repeat(80));

for (const ad of data.data) {
  const spend = parseFloat(ad.spend || 0);
  const leads = parseInt(ad.actions?.find(a => a.action_type === 'lead')?.value || 0);
  const cpl = leads > 0 ? '₹' + (spend / leads).toFixed(2) : '—';
  const ctr = parseFloat(ad.ctr || 0).toFixed(2) + '%';
  const name = ad.ad_name.length > 44 ? ad.ad_name.slice(0, 41) + '...' : ad.ad_name;
  console.log(name.padEnd(45), ('₹' + spend.toFixed(0)).padStart(9), String(leads).padStart(6), cpl.padStart(8), ctr.padStart(7));
}
