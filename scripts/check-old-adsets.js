import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const token = process.env.META_TOKEN;
const AD_ACCOUNT_ID = process.env.AD_ACCOUNT_ID;

const params = new URLSearchParams({
  fields: 'name,status,effective_status,targeting,created_time',
  limit: '50',
  access_token: token
});
params.append('effective_status[]', 'ACTIVE');
params.append('effective_status[]', 'PAUSED');
params.append('effective_status[]', 'ARCHIVED');
params.append('effective_status[]', 'CAMPAIGN_PAUSED');

const url = `https://graph.facebook.com/v19.0/${AD_ACCOUNT_ID}/adsets?${params}`;
const r = await fetch(url);
const d = await r.json();
if (d.error) { console.log('ERROR:', d.error.message); process.exit(1); }

const retired = d.data.filter(s => s.name.toLowerCase().includes('retir'));
console.log(`Found ${retired.length} retired ad sets (of ${d.data.length} total):`);

for (const s of retired) {
  console.log(`\n--- ${s.name} ---`);
  console.log(`Status: ${s.status} / ${s.effective_status}`);
  console.log(`Created: ${s.created_time}`);
  if (s.targeting) {
    console.log(`Age: ${s.targeting.age_min} - ${s.targeting.age_max}`);
    const city = s.targeting.geo_locations?.cities?.[0];
    console.log(`Geo: ${city ? city.name + ' ' + city.radius + 'km' : 'N/A'}`);
    console.log(`Audiences: ${s.targeting.custom_audiences?.map(a => a.name).join(', ') || 'none'}`);
    console.log(`Lookalike relaxation: ${s.targeting.targeting_relaxation_types?.lookalike ?? 'N/A'}`);
    console.log(`Genders: ${s.targeting.genders || 'all'}`);
  }
}
