import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const token = process.env.META_TOKEN;
const AD_ACCOUNT = process.env.AD_ACCOUNT_ID;

const fields = [
  'name', 'status', 'effective_status', 'created_time', 'daily_budget', 'bid_strategy',
  'optimization_goal', 'targeting',
  'insights.date_preset(last_90d){spend,impressions,reach,frequency,actions,cost_per_action_type,cpm,ctr}',
].join(',');

const params = new URLSearchParams({ fields, limit: '100', access_token: token });
params.append('effective_status[]', 'ACTIVE');
params.append('effective_status[]', 'PAUSED');
params.append('effective_status[]', 'ARCHIVED');

const r = await fetch(`https://graph.facebook.com/v19.0/${AD_ACCOUNT}/adsets?${params}`);
const d = await r.json();
if (d.error) { console.log('ERROR:', d.error.message); process.exit(1); }

const relevant = d.data.filter(s =>
  s.name.toLowerCase().includes('retiree') ||
  s.name.toLowerCase().includes('retired') ||
  s.name.toLowerCase().includes('housewife') ||
  s.name.toLowerCase().includes('housewives')
).sort((a, b) => new Date(a.created_time) - new Date(b.created_time));

for (const s of relevant) {
  const ins = s.insights?.data?.[0];
  const spend = parseFloat(ins?.spend || 0);
  const leads = parseInt(ins?.actions?.find(a => a.action_type === 'lead')?.value || 0);
  const cpl = leads > 0 ? (spend / leads).toFixed(2) : 'N/A';
  const imp = parseInt(ins?.impressions || 0);
  const reach = parseInt(ins?.reach || 0);
  const freq = parseFloat(ins?.frequency || 0).toFixed(2);
  const cpm = parseFloat(ins?.cpm || 0).toFixed(2);
  const ctr = parseFloat(ins?.ctr || 0).toFixed(3);
  const t = s.targeting || {};

  const genderMap = { 1: 'Male', 2: 'Female' };
  const genders = (t.genders || []).map(g => genderMap[g] || g).join(', ') || 'All';

  let geo = 'N/A';
  if (t.geo_locations?.cities) {
    const c = t.geo_locations.cities[0];
    geo = `${c.name}, ${c.radius}km`;
  } else if (t.geo_locations?.custom_locations) {
    const c = t.geo_locations.custom_locations[0];
    geo = `Custom lat/lon, ${c.radius}km`;
  }

  const audiences = (t.custom_audiences || []).map(a => a.name || a.id).join(', ') || 'None';
  const interests = (t.flexible_spec || []).flatMap(spec =>
    Object.entries(spec).flatMap(([, items]) => (items || []).map(i => i.name))
  ).join(', ') || 'None';

  const relaxation = t.targeting_relaxation_types
    ? JSON.stringify(t.targeting_relaxation_types)
    : 'Not set';
  const advantagePlus = t.targeting_automation?.advantage_audience;

  console.log('\n' + '═'.repeat(70));
  console.log(`${s.name}`);
  console.log(`Status: ${s.effective_status}  |  Budget: Rs${parseInt(s.daily_budget||0)/100}/day  |  Since: ${s.created_time?.substring(0,10)}`);
  console.log('─'.repeat(70));
  console.log('TARGETING');
  console.log(`  Age:            ${t.age_min} – ${t.age_max || '65+ (no cap)'}`);
  console.log(`  Gender:         ${genders}`);
  console.log(`  Geo:            ${geo}`);
  console.log(`  Loc Types:      ${(t.geo_locations?.location_types || []).join(', ')}`);
  console.log(`  Audiences:      ${audiences}`);
  console.log(`  Interests:      ${interests}`);
  console.log(`  Relaxation:     ${relaxation}`);
  console.log(`  Advantage+:     ${advantagePlus === 1 ? 'ON' : advantagePlus === 0 ? 'OFF' : 'Not set'}`);
  console.log('─'.repeat(70));
  console.log('LIFETIME PERFORMANCE');
  console.log(`  Spend:          Rs${spend.toFixed(0)}`);
  console.log(`  Leads:          ${leads}`);
  console.log(`  CPL:            Rs${cpl}`);
  console.log(`  Impressions:    ${imp.toLocaleString()}`);
  console.log(`  Reach:          ${reach.toLocaleString()}`);
  console.log(`  Frequency:      ${freq}x`);
  console.log(`  CPM:            Rs${cpm}`);
  console.log(`  CTR:            ${ctr}%`);
}
