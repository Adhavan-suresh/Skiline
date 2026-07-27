import 'dotenv/config';

const token = process.env.META_TOKEN;
const accountId = process.env.AD_ACCOUNT_ID;

const res = await fetch(
  `https://graph.facebook.com/v19.0/${accountId}/insights?` +
  `fields=date_start,adset_name,spend,actions` +
  `&level=adset&time_range={"since":"2026-07-01","until":"2026-07-10"}` +
  `&time_increment=1&limit=500` +
  `&access_token=${token}`
);
const data = await res.json();

const byDate = {};
for (const row of data.data) {
  const n = (row.adset_name || '').toLowerCase();
  const cat = n.includes('housewi') ? 'hw' : n.includes('retir') ? 'ret' : null;
  if (!cat) continue;
  const d = row.date_start;
  if (!byDate[d]) byDate[d] = { hw:0, ret:0, hw_spend:0, ret_spend:0 };
  const leads = parseInt(row.actions?.find(a => a.action_type === 'lead')?.value || 0);
  byDate[d][cat] += leads;
  byDate[d][cat+'_spend'] += parseFloat(row.spend || 0);
}

console.log('\nDate        HW  HW-CPL   Ret  Ret-CPL  Total');
console.log('─'.repeat(50));
for (const [date, d] of Object.entries(byDate).sort()) {
  const hwcpl = d.hw > 0 ? '₹'+(d.hw_spend/d.hw).toFixed(0) : '—';
  const retcpl = d.ret > 0 ? '₹'+(d.ret_spend/d.ret).toFixed(0) : '—';
  console.log(`${date}  ${String(d.hw).padStart(3)}  ${hwcpl.padStart(6)}   ${String(d.ret).padStart(3)}  ${retcpl.padStart(6)}   ${d.hw+d.ret}`);
}
