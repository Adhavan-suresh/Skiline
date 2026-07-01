import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const token = process.env.META_TOKEN;

// Ad set IDs from config
const RETIREES_ID  = '120248587937540744';
const HOUSEWIVES_ID = '120248587937010744';

// ── RETIREES ICP ─────────────────────────────────────────────────────────────
// Age 55-65, All genders, Chennai 25km, interests-based, no LAL
const retireesTargeting = {
  age_min: 55,
  age_max: 65,
  geo_locations: {
    cities: [{ key: '1021534', radius: 25, distance_unit: 'kilometer' }], // Chennai
    location_types: ['home', 'recent']
  },
  // One OR block — person matches any of these signals = in audience
  flexible_spec: [{
    interests: [
      { id: '6003022208356', name: 'Retirement community' },
      { id: '6003227721899', name: 'Retirement planning' },
      { id: '6003252837682', name: 'Pension' },
      { id: '6003106455034', name: 'Mutual fund' },
      { id: '6003217093576', name: 'Insurance' },
      { id: '6003353637860', name: 'Life insurance' },
      { id: '6003388314512', name: 'Investment' },
      { id: '6004037215009', name: 'Job hunting' },
      { id: '6003214937861', name: 'Self-employment' },
      // Civil Services of India removed — not valid for this account
    ],
    behaviors: [
      { id: '6028974370383', name: 'People who prefer high-value goods in India' },
    ],
    work_positions: [
      { id: '129679813742703', name: 'Retired Officer' }, // only valid one
    ]
  }],
  // No custom_audiences — LAL removed
  // No targeting_relaxation_types — let Meta use strict geo
  targeting_automation: { advantage_audience: 0 }
};

// ── HOUSEWIVES ICP ────────────────────────────────────────────────────────────
// Age 35-65, Female, Chennai 25km, interests-based, no LAL
const housewivesTargeting = {
  age_min: 35,
  age_max: 65,
  genders: [2], // Female
  geo_locations: {
    cities: [{ key: '1021534', radius: 25, distance_unit: 'kilometer' }], // Chennai
    location_types: ['home', 'recent']
  },
  flexible_spec: [{
    interests: [
      { id: '6002879646372', name: 'Homemaking' },
      { id: '6003372165354', name: 'Stay at home mom' },
      { id: '6003305961221', name: 'Direct selling' },
      { id: '6003371567474', name: 'Entrepreneurship' },
      { id: '6003214937861', name: 'Self-employment' },
      { id: '6002884511422', name: 'Small business' },
      { id: '6003605501620', name: 'Home business' },
      { id: '6003287729076', name: 'Passive income' },
      { id: '6003343813828', name: 'Telecommuting' },
      { id: '6004037215009', name: 'Job hunting' },
    ],
    behaviors: [
      { id: '6028974370383', name: 'People who prefer high-value goods in India' },
    ],
    work_positions: [
      { id: '112356192110305',   name: 'Homemaker' },
      { id: '1393703070850292',  name: 'Stay-at-home parent' },
      { id: '140624802636559',   name: 'Housewife and Mother' },
      { id: '168764976504761',   name: 'Full-Time Mother & Housewife' },
      { id: '170224943011325',   name: 'Mommy/Housewife' },
    ]
  }],
  targeting_automation: { advantage_audience: 0 }
};

async function updateAdSet(id, name, targeting) {
  console.log(`\nUpdating: ${name} (${id})`);

  const body = new URLSearchParams({
    targeting: JSON.stringify(targeting),
    access_token: token
  });

  const r = await fetch(`https://graph.facebook.com/v19.0/${id}`, {
    method: 'POST',
    body
  });
  const d = await r.json();

  if (d.error) {
    console.log(`  ❌ ERROR: ${d.error.message}`);
    console.log(`     Code: ${d.error.code}, Subcode: ${d.error.error_subcode}`);
  } else {
    console.log(`  ✅ Updated successfully`);
  }
  return d;
}

console.log('Updating ad sets to ICP targeting — no LAL, interests-based, 25km...\n');

await updateAdSet(RETIREES_ID,   'Retirees Phase 2',   retireesTargeting);
await updateAdSet(HOUSEWIVES_ID, 'Housewives Phase 2', housewivesTargeting);

console.log('\nDone. Verifying...');

// Quick verify — pull targeting back
for (const [id, name] of [[RETIREES_ID, 'Retirees'], [HOUSEWIVES_ID, 'Housewives']]) {
  const p = new URLSearchParams({ fields: 'name,targeting', access_token: token });
  const r = await fetch(`https://graph.facebook.com/v19.0/${id}?${p}`);
  const d = await r.json();
  const t = d.targeting;
  const audiences = (t.custom_audiences || []).length;
  const interests = (t.flexible_spec?.[0]?.interests || []).length;
  const behaviors = (t.flexible_spec?.[0]?.behaviors || []).length;
  const workPos = (t.flexible_spec?.[0]?.work_positions || []).length;
  console.log(`\n${name}: age ${t.age_min}-${t.age_max} | geo radius ${t.geo_locations?.cities?.[0]?.radius}km | LAL audiences: ${audiences} | interests: ${interests} | behaviors: ${behaviors} | work positions: ${workPos}`);
}
