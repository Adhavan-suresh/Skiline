import 'dotenv/config';

const token = process.env.META_TOKEN;
const accountId = process.env.AD_ACCOUNT_ID;

const res = await fetch(
  `https://graph.facebook.com/v19.0/${accountId}/insights?` +
  `fields=date_start,ad_name,spend,impressions,clicks,ctr,cpm,frequency,actions,cost_per_action_type` +
  `&level=ad&time_range={"since":"2026-07-01","until":"2026-07-09"}` +
  `&time_increment=1&limit=200` +
  `&access_token=${token}`
);
const data = await res.json();

if (data.error) { console.log('ERROR:', JSON.stringify(data.error)); process.exit(1); }

// Filter HW ads only
const hwRows = data.data.filter(r => r.ad_name?.toLowerCase().includes('housewi') || r.ad_name?.toLowerCase().includes('back to work'));

// Group by date
const byDate = {};
for (const row of hwRows) {
  const d = row.date_start;
  if (!byDate[d]) byDate[d] = { spend: 0, leads: 0, impressions: 0, clicks: 0, frequency: 0, count: 0 };
  byDate[d].spend += parseFloat(row.spend || 0);
  byDate[d].leads += parseInt(row.actions?.find(a => a.action_type === 'lead')?.value || 0);
  byDate[d].impressions += parseInt(row.impressions || 0);
  byDate[d].clicks += parseInt(row.clicks || 0);
  byDate[d].frequency = parseFloat(row.frequency || 0);
  byDate[d].count++;
}

console.log('\n=== HW CPL Daily Trend — Jul 1–9 ===\n');
console.log('Date       Spend    Leads  CPL      CTR     Impressions  Freq');
for (const [date, d] of Object.entries(byDate).sort()) {
  const cpl = d.leads > 0 ? '₹' + (d.spend / d.leads).toFixed(2) : '—';
  const ctr = d.impressions > 0 ? (d.clicks / d.impressions * 100).toFixed(2) + '%' : '—';
  console.log(`${date}  ₹${d.spend.toFixed(2).padStart(7)}  ${String(d.leads).padStart(5)}  ${cpl.padStart(7)}  ${ctr.padStart(6)}  ${String(d.impressions).padStart(11)}  ${d.frequency.toFixed(2)}`);
}
