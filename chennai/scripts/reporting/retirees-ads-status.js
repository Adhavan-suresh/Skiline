import 'dotenv/config';
const token = process.env.META_TOKEN;
const accountId = process.env.AD_ACCOUNT_ID;

// Status of all retirees adset ads
const RETIREES_ADSET = '120248587937540744';
const statusRes = await fetch(
  `https://graph.facebook.com/v19.0/${RETIREES_ADSET}/ads?fields=name,status,effective_status&limit=20&access_token=${token}`
);
const statusData = await statusRes.json();
console.log('=== Retirees adset — ad statuses ===');
for (const a of (statusData.data || [])) {
  console.log(`  ${a.effective_status.padEnd(14)} | ${a.name}`);
}

// Last 5 days performance for retirees ads
const res = await fetch(
  `https://graph.facebook.com/v19.0/${accountId}/insights?` +
  `fields=ad_name,spend,impressions,ctr,actions` +
  `&level=ad&time_range={"since":"2026-07-11","until":"2026-07-16"}&limit=50` +
  `&access_token=${token}`
);
const data = await res.json();
console.log('\n=== Retirees ads — Jul 11-16 cumulative ===');
for (const ad of (data.data || [])) {
  const n = (ad.ad_name || '').toLowerCase();
  if (!n.includes('retir') && !n.includes('krishnamurthy') && !n.includes('skills')) continue;
  const leads = parseInt(ad.actions?.find(a => a.action_type === 'lead')?.value || 0);
  const spend = parseFloat(ad.spend || 0);
  const cpl = leads > 0 ? '₹' + (spend / leads).toFixed(2) : '—';
  console.log(`  ${ad.ad_name}`);
  console.log(`    Spend: ₹${spend.toFixed(2)} | Leads: ${leads} | CPL: ${cpl} | CTR: ${parseFloat(ad.ctr||0).toFixed(2)}%`);
}
