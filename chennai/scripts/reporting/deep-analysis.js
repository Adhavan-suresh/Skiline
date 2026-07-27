import 'dotenv/config';

const token = process.env.META_TOKEN;
const accountId = process.env.AD_ACCOUNT_ID;

async function get(url) {
  const res = await fetch(url);
  return res.json();
}

const base = `https://graph.facebook.com/v19.0/${accountId}/insights`;

// 1. Ad-level: full July, 7-day breakdown
const [adJuly, adWeekly, hourly, adsetJuly] = await Promise.all([
  get(`${base}?fields=ad_name,adset_name,spend,impressions,clicks,ctr,cpm,frequency,actions,cost_per_action_type&level=ad&time_range={"since":"2026-07-01","until":"2026-07-10"}&limit=50&access_token=${token}`),
  get(`${base}?fields=ad_name,adset_name,spend,impressions,clicks,ctr,actions&level=ad&time_range={"since":"2026-07-01","until":"2026-07-10"}&time_increment=1&limit=300&access_token=${token}`),
  get(`${base}?fields=adset_name,spend,impressions,clicks,actions&level=adset&time_range={"since":"2026-07-01","until":"2026-07-10"}&breakdowns=hourly_stats_aggregated_by_advertiser_time_zone&limit=500&access_token=${token}`),
  get(`${base}?fields=adset_name,spend,impressions,clicks,ctr,cpm,frequency,actions&level=adset&time_range={"since":"2026-07-01","until":"2026-07-10"}&limit=50&access_token=${token}`),
]);

function leads(row) { return parseInt(row.actions?.find(a => a.action_type === 'lead')?.value || 0); }
function cpl(row) { const l = leads(row); return l > 0 ? (parseFloat(row.spend)/l).toFixed(2) : null; }

console.log('\n==============================');
console.log(' AD-LEVEL SUMMARY (Jul 1–10)');
console.log('==============================\n');
for (const ad of adJuly.data) {
  const l = leads(ad);
  const c = cpl(ad);
  console.log(`[${ad.ad_name}]`);
  console.log(`  Spend: ₹${parseFloat(ad.spend).toFixed(2)} | Leads: ${l} | CPL: ${c ? '₹'+c : '—'}`);
  console.log(`  CTR: ${parseFloat(ad.ctr||0).toFixed(2)}% | CPM: ₹${parseFloat(ad.cpm||0).toFixed(2)} | Freq: ${parseFloat(ad.frequency||0).toFixed(2)}`);
  console.log(`  Impressions: ${ad.impressions} | Clicks: ${ad.clicks}`);
  console.log();
}

console.log('\n==============================');
console.log(' ADSET SUMMARY (Jul 1–10)');
console.log('==============================\n');
for (const a of adsetJuly.data) {
  const l = leads(a);
  const c = cpl(a);
  console.log(`[${a.adset_name}]`);
  console.log(`  Spend: ₹${parseFloat(a.spend).toFixed(2)} | Leads: ${l} | CPL: ${c ? '₹'+c : '—'}`);
  console.log(`  CTR: ${parseFloat(a.ctr||0).toFixed(2)}% | CPM: ₹${parseFloat(a.cpm||0).toFixed(2)} | Freq: ${parseFloat(a.frequency||0).toFixed(2)}`);
  console.log();
}

console.log('\n==============================');
console.log(' HOURLY BREAKDOWN (Jul 1–10)');
console.log('==============================\n');
// Aggregate by hour across all Chennai adsets
const hourMap = {};
for (const row of hourly.data) {
  const n = (row.adset_name||'').toLowerCase();
  const isChennai = n.includes('housewi') || n.includes('retir');
  if (!isChennai) continue;
  const h = row.hourly_stats_aggregated_by_advertiser_time_zone;
  if (!hourMap[h]) hourMap[h] = { spend:0, leads:0, impressions:0 };
  hourMap[h].spend += parseFloat(row.spend||0);
  hourMap[h].leads += leads(row);
  hourMap[h].impressions += parseInt(row.impressions||0);
}
console.log('Hour (IST)   Leads  Impr    CPL');
for (const [h, d] of Object.entries(hourMap).sort((a,b) => {
  const toMin = s => { const [t,p] = s[0].split(' '); let [hh,mm] = t.split(':').map(Number); if(p==='PM'&&hh!==12) hh+=12; if(p==='AM'&&hh===12) hh=0; return hh*60+mm; };
  return toMin(a) - toMin(b);
})) {
  const c = d.leads > 0 ? '₹'+(d.spend/d.leads).toFixed(0) : '—';
  console.log(`${h.padEnd(14)} ${String(d.leads).padStart(5)}  ${String(d.impressions).padStart(6)}  ${c}`);
}

console.log('\n==============================');
console.log(' DAY-BY-DAY TREND (Ad level)');
console.log('==============================\n');
// HW daily trend
const hwDaily = {};
const retDaily = {};
for (const row of adWeekly.data) {
  const n = (row.ad_name||'').toLowerCase();
  const d = row.date_start;
  const l = leads(row);
  const s = parseFloat(row.spend||0);
  if (n.includes('back to work') || n.includes('housewi')) {
    if (!hwDaily[d]) hwDaily[d] = {leads:0,spend:0,impressions:0,clicks:0};
    hwDaily[d].leads += l; hwDaily[d].spend += s;
    hwDaily[d].impressions += parseInt(row.impressions||0);
    hwDaily[d].clicks += parseInt(row.clicks||0);
  }
  if (n.includes('retir') || n.includes('retired') || n.includes('krishna') || n.includes('skills')) {
    if (!retDaily[d]) retDaily[d] = {leads:0,spend:0,impressions:0,clicks:0};
    retDaily[d].leads += l; retDaily[d].spend += s;
    retDaily[d].impressions += parseInt(row.impressions||0);
    retDaily[d].clicks += parseInt(row.clicks||0);
  }
}

console.log('HW daily:');
for (const [d, v] of Object.entries(hwDaily).sort()) {
  const c = v.leads > 0 ? '₹'+(v.spend/v.leads).toFixed(2) : '—';
  const ctr = v.impressions > 0 ? (v.clicks/v.impressions*100).toFixed(2)+'%' : '—';
  console.log(`  ${d}: leads=${v.leads} cpl=${c} ctr=${ctr} impr=${v.impressions}`);
}
console.log('\nRetirees daily:');
for (const [d, v] of Object.entries(retDaily).sort()) {
  const c = v.leads > 0 ? '₹'+(v.spend/v.leads).toFixed(2) : '—';
  const ctr = v.impressions > 0 ? (v.clicks/v.impressions*100).toFixed(2)+'%' : '—';
  console.log(`  ${d}: leads=${v.leads} cpl=${c} ctr=${ctr} impr=${v.impressions}`);
}
