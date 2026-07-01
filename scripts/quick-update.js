import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const TOKEN = process.env.META_TOKEN;
const ACCOUNT = process.env.AD_ACCOUNT_ID;

async function get(url) { const r = await fetch(url); return r.json(); }

// Ad set level — today + last 7d
const [today, week] = await Promise.all([
  get(`https://graph.facebook.com/v19.0/${ACCOUNT}/insights?level=adset&fields=adset_id,adset_name,spend,impressions,clicks,ctr,cpm,cpc,reach,frequency,actions&date_preset=today&limit=20&access_token=${TOKEN}`),
  get(`https://graph.facebook.com/v19.0/${ACCOUNT}/insights?level=adset&fields=adset_id,adset_name,spend,impressions,clicks,ctr,cpm,cpc,reach,frequency,actions&date_preset=last_7d&limit=20&access_token=${TOKEN}`),
]);

// Ad level — last 7d
const adLevel = await get(`https://graph.facebook.com/v19.0/${ACCOUNT}/insights?level=ad&fields=ad_id,ad_name,adset_name,spend,impressions,clicks,ctr,cpm,actions&date_preset=last_7d&limit=50&access_token=${TOKEN}`);

// Ad set status check
const adsets = await get(`https://graph.facebook.com/v19.0/${ACCOUNT}/adsets?fields=id,name,status,effective_status,daily_budget,delivery_sub_status&limit=10&access_token=${TOKEN}`);

function leads(actions) { return actions?.find(a => a.action_type === 'lead')?.value || 0; }
function cpl(spend, actions) { const l = leads(actions); return l > 0 ? (parseFloat(spend)/l).toFixed(2) : 'N/A'; }

console.log('\n=== AD SET STATUS ===');
for (const s of adsets.data || []) {
  console.log(`${s.name}`);
  console.log(`  Status: ${s.effective_status} | Sub: ${s.delivery_sub_status || 'none'} | Budget: ₹${parseInt(s.daily_budget)/100}/day`);
}

console.log('\n=== TODAY ===');
for (const r of today.data || []) {
  console.log(`${r.adset_name}: ₹${r.spend} spend | ${leads(r.actions)} leads | CPL ₹${cpl(r.spend, r.actions)} | CPM ₹${parseFloat(r.cpm).toFixed(0)} | CTR ${parseFloat(r.ctr).toFixed(2)}%`);
}
if (!today.data?.length) console.log('No spend today yet.');

console.log('\n=== LAST 7 DAYS ===');
for (const r of week.data || []) {
  console.log(`${r.adset_name}: ₹${r.spend} spend | ${leads(r.actions)} leads | CPL ₹${cpl(r.spend, r.actions)} | CPM ₹${parseFloat(r.cpm).toFixed(0)} | CTR ${parseFloat(r.ctr).toFixed(2)}% | Freq ${parseFloat(r.frequency).toFixed(2)}`);
}

console.log('\n=== AD LEVEL (last 7d) ===');
for (const r of adLevel.data || []) {
  console.log(`[${r.adset_name}] ${r.ad_name}: ₹${r.spend} | ${leads(r.actions)} leads | CPL ₹${cpl(r.spend, r.actions)} | CTR ${parseFloat(r.ctr).toFixed(2)}%`);
}
