import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const token = process.env.META_TOKEN;
const AD_ACCOUNT = process.env.AD_ACCOUNT_ID;

const params = new URLSearchParams({
  fields: 'name,status,effective_status,created_time,insights.date_preset(last_90d){spend,impressions,reach,actions}',
  limit: '100',
  access_token: token
});
params.append('effective_status[]', 'ACTIVE');
params.append('effective_status[]', 'PAUSED');
params.append('effective_status[]', 'ARCHIVED');
params.append('effective_status[]', 'CAMPAIGN_PAUSED');

const r = await fetch(`https://graph.facebook.com/v19.0/${AD_ACCOUNT}/adsets?${params}`);
const d = await r.json();
if (d.error) { console.log('ERROR:', d.error.message); process.exit(1); }

console.log(`Total ad sets: ${d.data.length}\n`);

let grandSpend = 0, grandLeads = 0;

const rows = d.data.map(s => {
  const ins = s.insights?.data?.[0];
  const spend = parseFloat(ins?.spend || 0);
  const leads = parseInt(ins?.actions?.find(a => a.action_type === 'lead')?.value || 0);
  const imp = parseInt(ins?.impressions || 0);
  grandSpend += spend;
  grandLeads += leads;
  return { name: s.name, status: s.effective_status, created: s.created_time?.substring(0, 10), spend, leads, imp };
}).sort((a, b) => b.spend - a.spend);

for (const row of rows) {
  const cpl = row.leads > 0 ? `Rs${(row.spend / row.leads).toFixed(2)}` : 'N/A';
  console.log(`[${row.status}] ${row.name}`);
  console.log(`  Created: ${row.created} | Spend: Rs${row.spend.toFixed(0)} | Leads: ${row.leads} | Imp: ${row.imp} | CPL: ${cpl}`);
}

console.log(`\n=== TOTALS ===`);
console.log(`Grand Spend: Rs${grandSpend.toFixed(0)}`);
console.log(`Grand Leads: ${grandLeads}`);
console.log(`Blended CPL: Rs${grandLeads > 0 ? (grandSpend / grandLeads).toFixed(2) : 'N/A'}`);
