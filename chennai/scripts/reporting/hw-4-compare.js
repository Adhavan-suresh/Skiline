import 'dotenv/config';
const token = process.env.META_TOKEN;
const accountId = process.env.AD_ACCOUNT_ID;
const today = new Date().toISOString().slice(0,10);

const HW_ADS = {
  '120249874343940744': 'Back to Work (2nd ad)',
  '120250380221290744': 'Copy V2 (Hardest Project)',
  '120250413507330744': 'Financial Advisor',
  '120250461295520744': 'Two Hours (W1)',
};

async function pull(since, label) {
  const res = await fetch(
    `https://graph.facebook.com/v19.0/${accountId}/insights?` +
    `fields=ad_id,ad_name,spend,impressions,ctr,frequency,actions` +
    `&level=ad&time_range={"since":"${since}","until":"${today}"}&limit=100&access_token=${token}`
  );
  const d = await res.json();
  const map = {};
  for (const a of (d.data||[])) {
    if (!HW_ADS[a.ad_id]) continue;
    const leads = parseInt(a.actions?.find(x=>x.action_type==='lead')?.value||0);
    const spend = parseFloat(a.spend||0);
    map[a.ad_id] = { leads, spend, cpl: leads?spend/leads:null, ctr:parseFloat(a.ctr||0), freq:parseFloat(a.frequency||0) };
  }
  return map;
}

const life = await pull('2026-06-25', 'lifetime');
const r3 = await pull('2026-07-18', 'last3');

console.log('=== HW 4 ADS — lifetime (since Jun 25) vs last 3 days ===\n');
for (const [id, name] of Object.entries(HW_ADS)) {
  const l = life[id]||{}; const r = r3[id]||{};
  console.log(name);
  console.log(`  LIFETIME: ₹${(l.spend||0).toFixed(0)} spend | ${l.leads||0} leads | CPL ${l.cpl?'₹'+l.cpl.toFixed(2):'—'} | CTR ${(l.ctr||0).toFixed(2)}% | Freq ${(l.freq||0).toFixed(2)}`);
  console.log(`  LAST 3D:  ₹${(r.spend||0).toFixed(0)} spend | ${r.leads||0} leads | CPL ${r.cpl?'₹'+r.cpl.toFixed(2):'—'} | CTR ${(r.ctr||0).toFixed(2)}%`);
  console.log();
}
