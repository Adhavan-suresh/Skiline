import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const token = process.env.META_TOKEN;
const AD_ACCOUNT = process.env.AD_ACCOUNT_ID;

const params = new URLSearchParams({
  fields: 'name,status,effective_status,insights{spend,impressions,actions}',
  limit: '100',
  access_token: token,
  'time_range[since]': '2026-06-01',
  'time_range[until]': '2026-06-22',
});
params.append('effective_status[]', 'ACTIVE');
params.append('effective_status[]', 'PAUSED');
params.append('effective_status[]', 'ARCHIVED');
params.append('effective_status[]', 'CAMPAIGN_PAUSED');

const r = await fetch(`https://graph.facebook.com/v19.0/${AD_ACCOUNT}/adsets?${params}`);
const d = await r.json();
if (d.error) { console.log('ERROR:', d.error.message); process.exit(1); }

let totalSpend = 0, totalLeads = 0;

const rows = d.data.map(s => {
  const ins = s.insights?.data?.[0];
  const spend = parseFloat(ins?.spend || 0);
  const leads = parseInt(ins?.actions?.find(a => a.action_type === 'lead')?.value || 0);
  const imp = parseInt(ins?.impressions || 0);
  totalSpend += spend;
  totalLeads += leads;
  return { name: s.name, status: s.effective_status, spend, leads, imp };
}).filter(r => r.spend > 0).sort((a, b) => b.spend - a.spend);

console.log('Chennai Ad Sets — June 1–22, 2026\n');
for (const row of rows) {
  const cpl = row.leads > 0 ? `Rs${(row.spend / row.leads).toFixed(2)}` : 'N/A';
  console.log(`${row.name} [${row.status}]`);
  console.log(`  Spend: Rs${row.spend.toFixed(0)} | Leads: ${row.leads} | CPL: ${cpl}`);
}

console.log(`\n=== JUNE TOTAL ===`);
console.log(`Spend: Rs${totalSpend.toFixed(0)}`);
console.log(`Leads: ${totalLeads}`);
console.log(`CPL:   Rs${totalLeads > 0 ? (totalSpend / totalLeads).toFixed(2) : 'N/A'}`);
