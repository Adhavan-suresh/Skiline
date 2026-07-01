import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const token = process.env.META_TOKEN;
const ID = '120248587937540744';

const base = {
  age_min: 55, age_max: 65,
  geo_locations: {
    cities: [{ key: '1021534', radius: 25, distance_unit: 'kilometer' }],
    location_types: ['home', 'recent']
  },
  targeting_automation: { advantage_audience: 0 }
};

async function tryUpdate(label, targeting) {
  const body = new URLSearchParams({ targeting: JSON.stringify(targeting), access_token: token });
  const r = await fetch(`https://graph.facebook.com/v19.0/${ID}`, { method: 'POST', body });
  const d = await r.json();
  console.log(`[${label}]: ${d.success ? '✅' : '❌ ' + d.error?.message + ' subcode:' + d.error?.error_subcode}`);
  return !!d.success;
}

// Test all interests one by one
const allInterests = [
  { id: '6003022208356', name: 'Retirement community' },
  { id: '6003227721899', name: 'Retirement planning' },
  { id: '6003252837682', name: 'Pension' },
  { id: '6003106455034', name: 'Mutual fund' },
  { id: '6003217093576', name: 'Insurance' },
  { id: '6003353637860', name: 'Life insurance' },
  { id: '6003388314512', name: 'Investment' },
  { id: '6004037215009', name: 'Job hunting' },
  { id: '6003214937861', name: 'Self-employment' },
  { id: '6003473046263', name: 'Civil Services of India' },
];

const allWorkPos = [
  { id: '124182990934892',  name: 'Now happily retired' },
  { id: '121856687852920',  name: 'Very happily retired!' },
  { id: '129679813742703',  name: 'Retired Officer' },
  { id: '144539765557035',  name: 'Principal (Retired)' },
  { id: '112710518762049',  name: 'Retired school teacher' },
  { id: '1636046553285857', name: 'Life Insurance Agent' },
  { id: '349506671920785',  name: 'Insurance Sales Agent' },
  { id: '141868809162550',  name: 'Insurance Agent/Owner' },
];

const behavior = [{ id: '6028974370793', name: 'People who prefer high-value goods in India' }];

// Test each interest individually
console.log('=== Testing interests individually ===');
for (const interest of allInterests) {
  await tryUpdate(interest.name, { ...base, flexible_spec: [{ interests: [interest] }] });
}

// Test each work position individually
console.log('\n=== Testing work positions individually ===');
for (const wp of allWorkPos) {
  await tryUpdate(wp.name, { ...base, flexible_spec: [{ work_positions: [wp] }] });
}

// Test behavior
console.log('\n=== Testing behavior ===');
await tryUpdate('High-value goods India', { ...base, flexible_spec: [{ behaviors: behavior }] });
