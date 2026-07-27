import 'dotenv/config';
const token = process.env.META_TOKEN;
const accountId = process.env.AD_ACCOUNT_ID;
const today = new Date().toISOString().slice(0, 10);

// HW adset ads, cumulative Jul 12-today + lifetime frequency
const res = await fetch(
  `https://graph.facebook.com/v19.0/${accountId}/insights?` +
  `fields=ad_name,spend,impressions,clicks,ctr,frequency,reach,actions` +
  `&level=ad&time_range={"since":"2026-07-12","until":"${today}"}&limit=100` +
  `&access_token=${token}`
);
const data = await res.json();
if (data.error) { console.log('ERROR:', JSON.stringify(data.error)); process.exit(1); }

const hw = (data.data || []).filter(a => (a.ad_name||'').toLowerCase().includes('housewi') || (a.ad_name||'').toLowerCase().includes('back to work') || (a.ad_name||'').toLowerCase().includes('financial advisor') && (a.ad_name||'').toLowerCase().includes('housew'));
// simpler: filter by names known to be HW
const HWNAMES = ['back to work','meenakshi','financial advisor','hardest project'];
const rows = (data.data||[]).filter(a => {
  const n=(a.ad_name||'').toLowerCase();
  return n.includes('housewi') || n.includes('back to work') || (n.includes('financial advisor') && !n.includes('retiree'));
});

let tSpend=0,tLeads=0,tImpr=0,tClicks=0;
console.log('=== HOUSEWIVES ADSET — Jul 12 to today (cumulative) ===\n');
rows.sort((a,b)=>parseInt(b.actions?.find(x=>x.action_type==='lead')?.value||0)-parseInt(a.actions?.find(x=>x.action_type==='lead')?.value||0));
for (const a of rows) {
  const leads=parseInt(a.actions?.find(x=>x.action_type==='lead')?.value||0);
  const spend=parseFloat(a.spend||0);
  const cpl=leads>0?'₹'+(spend/leads).toFixed(2):'—';
  console.log(`${a.ad_name}`);
  console.log(`  Spend ₹${spend.toFixed(0)} | Leads ${leads} | CPL ${cpl} | CTR ${parseFloat(a.ctr||0).toFixed(2)}% | Freq ${parseFloat(a.frequency||0).toFixed(2)}`);
  tSpend+=spend;tLeads+=leads;tImpr+=parseInt(a.impressions||0);tClicks+=parseInt(a.clicks||0);
}
console.log(`\nADSET TOTAL: Spend ₹${tSpend.toFixed(0)} | Leads ${tLeads} | CPL ₹${(tSpend/tLeads).toFixed(2)} | CTR ${(tClicks/tImpr*100).toFixed(2)}%`);
