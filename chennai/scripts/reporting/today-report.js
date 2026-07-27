import 'dotenv/config';

const token = process.env.META_TOKEN;
const accountId = process.env.AD_ACCOUNT_ID;

const today = new Date().toISOString().slice(0, 10);
const res = await fetch(
  `https://graph.facebook.com/v19.0/${accountId}/insights?` +
  `fields=ad_name,adset_name,spend,impressions,clicks,ctr,cpm,actions,cost_per_action_type` +
  `&level=ad&time_range={"since":"${today}","until":"${today}"}&limit=50` +
  `&access_token=${token}`
);
const data = await res.json();

if (data.error) {
  console.log('ERROR:', JSON.stringify(data.error));
  process.exit(1);
}

if (!data.data || data.data.length === 0) {
  console.log('No data yet for today.');
  process.exit(0);
}

console.log(`\n=== TODAY ${today} — Ad Performance ===\n`);

let totalSpend = 0, totalLeads = 0;

for (const ad of data.data) {
  const spend = parseFloat(ad.spend || 0);
  const leads = ad.actions?.find(a => a.action_type === 'lead')?.value || 0;
  const cpl = leads > 0 ? (spend / leads).toFixed(2) : '—';
  totalSpend += spend;
  totalLeads += parseInt(leads);

  console.log(`${ad.ad_name}`);
  console.log(`  Adset: ${ad.adset_name}`);
  console.log(`  Spend: ₹${spend.toFixed(2)} | Impressions: ${ad.impressions} | Clicks: ${ad.clicks} | CTR: ${parseFloat(ad.ctr||0).toFixed(2)}%`);
  console.log(`  Leads: ${leads} | CPL: ₹${cpl}`);
  console.log();
}

console.log(`TOTAL — Spend: ₹${totalSpend.toFixed(2)} | Leads: ${totalLeads} | Blended CPL: ₹${totalLeads > 0 ? (totalSpend/totalLeads).toFixed(2) : '—'}`);
