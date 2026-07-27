import 'dotenv/config';
const token = process.env.META_TOKEN;
const accountId = process.env.AD_ACCOUNT_ID;

// Per-adset reach + frequency, last 30 days, to gauge saturation
const res = await fetch(
  `https://graph.facebook.com/v19.0/${accountId}/insights?` +
  `fields=adset_name,spend,reach,frequency,impressions,ctr,actions` +
  `&level=adset&time_range={"since":"2026-06-20","until":"2026-07-20"}&limit=50` +
  `&access_token=${token}`
);
const data = await res.json();
if (data.error) { console.log('ERROR:', JSON.stringify(data.error)); process.exit(1); }
console.log('=== Per-adset, last 30 days (saturation gauge) ===\n');
for (const a of data.data) {
  const leads = parseInt(a.actions?.find(x=>x.action_type==='lead')?.value||0);
  const spend = parseFloat(a.spend||0);
  console.log(`${a.adset_name}`);
  console.log(`  Spend ₹${spend.toFixed(0)} | Reach ${a.reach} | Frequency ${parseFloat(a.frequency||0).toFixed(2)} | Impr ${a.impressions} | CTR ${parseFloat(a.ctr||0).toFixed(2)}% | Leads ${leads} | CPL ₹${leads?(spend/leads).toFixed(2):'—'}`);
  console.log();
}
