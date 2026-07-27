import 'dotenv/config';
const token = process.env.META_TOKEN;
const accountId = process.env.AD_ACCOUNT_ID;

// Full campaign — ad level, Jul 1 to today
const res = await fetch(
  `https://graph.facebook.com/v19.0/${accountId}/insights?` +
  `fields=ad_name,spend,impressions,clicks,ctr,cpc,actions,reach,frequency` +
  `&level=ad&time_range={"since":"2026-07-01","until":"2026-07-17"}&limit=100` +
  `&access_token=${token}`
);
const data = await res.json();
if (data.error) { console.log('ERROR:', JSON.stringify(data.error)); process.exit(1); }

let totSpend = 0, totLeads = 0, totImpr = 0, totClicks = 0;
const rows = [];
for (const ad of data.data) {
  const leads = parseInt(ad.actions?.find(a => a.action_type === 'lead')?.value || 0);
  const spend = parseFloat(ad.spend || 0);
  const impr = parseInt(ad.impressions || 0);
  const clicks = parseInt(ad.clicks || 0);
  const cpl = leads > 0 ? (spend / leads) : null;
  rows.push({
    name: ad.ad_name,
    spend: spend.toFixed(2),
    impr,
    clicks,
    ctr: parseFloat(ad.ctr || 0).toFixed(2),
    freq: parseFloat(ad.frequency || 0).toFixed(2),
    leads,
    cpl: cpl ? cpl.toFixed(2) : '—',
  });
  totSpend += spend; totLeads += leads; totImpr += impr; totClicks += clicks;
}

rows.sort((a, b) => b.leads - a.leads);
console.log('=== FULL CAMPAIGN — Jul 1-17, ad level ===\n');
for (const r of rows) {
  console.log(`${r.name}`);
  console.log(`  Spend ₹${r.spend} | Impr ${r.impr} | Clicks ${r.clicks} | CTR ${r.ctr}% | Freq ${r.freq} | Leads ${r.leads} | CPL ₹${r.cpl}`);
}
console.log('\n=== TOTALS ===');
console.log(`Spend ₹${totSpend.toFixed(2)} | Impr ${totImpr} | Clicks ${totClicks} | CTR ${(totClicks/totImpr*100).toFixed(2)}% | Leads ${totLeads} | Blended CPL ₹${(totSpend/totLeads).toFixed(2)}`);
