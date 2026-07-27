import 'dotenv/config';

const token = process.env.META_TOKEN;
const accountId = process.env.AD_ACCOUNT_ID;
const today = new Date().toISOString().slice(0, 10);

const res = await fetch(
  `https://graph.facebook.com/v19.0/${accountId}/insights?` +
  `fields=ad_name,spend,impressions,clicks,ctr,actions` +
  `&level=ad&time_range={"since":"2026-07-01","until":"${today}"}&limit=50` +
  `&access_token=${token}`
);
const data = await res.json();
if (data.error) { console.log('ERROR:', JSON.stringify(data.error)); process.exit(1); }

const surat = data.data.filter(a => {
  const n = (a.ad_name||'').toLowerCase();
  return n.includes('surat') || (n.includes('leaders') && n.includes('skiline'));
});

console.log('\n=== Surat Ads — Jul 1 to Today ===\n');
for (const ad of surat) {
  const leads = parseInt(ad.actions?.find(a => a.action_type === 'lead')?.value || 0);
  const spend = parseFloat(ad.spend || 0);
  const cpl = leads > 0 ? '₹' + (spend / leads).toFixed(2) : '—';
  console.log(ad.ad_name);
  console.log(`  Spend: ₹${spend.toFixed(2)} | Leads: ${leads} | CPL: ${cpl} | CTR: ${parseFloat(ad.ctr||0).toFixed(2)}%`);
  console.log();
}
