import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const token = process.env.META_TOKEN;
const ID = '120248587937540744'; // Retirees

// Step 1: find correct Chennai city key
console.log('=== Searching for Chennai city key ===');
const citySearch = await fetch(`https://graph.facebook.com/v19.0/search?type=adgeolocation&q=Chennai&location_types=["city"]&access_token=${token}`);
const cityData = await citySearch.json();
console.log(JSON.stringify(cityData.data?.slice(0, 5), null, 2));

// Step 2: test minimal targeting — just age + geo, no interests
async function tryUpdate(label, targeting) {
  const body = new URLSearchParams({ targeting: JSON.stringify(targeting), access_token: token });
  const r = await fetch(`https://graph.facebook.com/v19.0/${ID}`, { method: 'POST', body });
  const d = await r.json();
  console.log(`\n[${label}]: ${d.success ? '✅ OK' : '❌ ' + d.error?.message}`);
  return d;
}

const base = {
  age_min: 55, age_max: 65,
  geo_locations: {
    cities: [{ key: '1021534', radius: 25, distance_unit: 'kilometer' }],
    location_types: ['home', 'recent']
  },
  targeting_automation: { advantage_audience: 0 }
};

await tryUpdate('base only (no interests)', base);

// Step 3: add interests only
await tryUpdate('base + interests', {
  ...base,
  flexible_spec: [{
    interests: [
      { id: '6003022208356', name: 'Retirement community' },
      { id: '6003227721899', name: 'Retirement planning' },
      { id: '6003252837682', name: 'Pension' },
    ]
  }]
});

// Step 4: add behaviors
await tryUpdate('base + interests + behaviors', {
  ...base,
  flexible_spec: [{
    interests: [
      { id: '6003022208356', name: 'Retirement community' },
      { id: '6003227721899', name: 'Retirement planning' },
    ],
    behaviors: [
      { id: '6028974370383', name: 'People who prefer high-value goods in India' },
    ]
  }]
});

// Step 5: add work_positions
await tryUpdate('base + interests + behaviors + work_positions', {
  ...base,
  flexible_spec: [{
    interests: [
      { id: '6003022208356', name: 'Retirement community' },
    ],
    behaviors: [
      { id: '6028974370383', name: 'People who prefer high-value goods in India' },
    ],
    work_positions: [
      { id: '124182990934892', name: 'Now happily retired' },
    ]
  }]
});
