import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const token = process.env.META_TOKEN;
const AD_ACCOUNT = process.env.AD_ACCOUNT_ID;

const fields = [
  'name',
  'status',
  'effective_status',
  'created_time',
  'start_time',
  'end_time',
  'daily_budget',
  'lifetime_budget',
  'bid_strategy',
  'billing_event',
  'optimization_goal',
  'destination_type',
  'promoted_object',
  'targeting',
  'targeting_optimization_types',
  'pacing_type',
  'campaign_id',
].join(',');

const params = new URLSearchParams({ fields, limit: '100', access_token: token });
params.append('effective_status[]', 'ACTIVE');
params.append('effective_status[]', 'PAUSED');
params.append('effective_status[]', 'ARCHIVED');
params.append('effective_status[]', 'CAMPAIGN_PAUSED');

const r = await fetch(`https://graph.facebook.com/v19.0/${AD_ACCOUNT}/adsets?${params}`);
const d = await r.json();
if (d.error) { console.log('ERROR:', d.error.message); process.exit(1); }

// Also fetch campaign-level settings
const campaignIds = [...new Set(d.data.map(s => s.campaign_id))];
const campaignDetails = {};
for (const cid of campaignIds) {
  const cr = await fetch(`https://graph.facebook.com/v19.0/${cid}?fields=name,status,effective_status,objective,special_ad_categories,daily_budget,lifetime_budget,bid_strategy&access_token=${token}`);
  const cd = await cr.json();
  campaignDetails[cid] = cd;
}

console.log('='.repeat(80));
console.log('SKILINE META ADS — COMPLETE TARGETING & SETTINGS DUMP');
console.log('='.repeat(80));

for (const s of d.data.sort((a, b) => a.name.localeCompare(b.name))) {
  const camp = campaignDetails[s.campaign_id] || {};
  const t = s.targeting || {};

  console.log('\n' + '─'.repeat(80));
  console.log(`AD SET: ${s.name}`);
  console.log('─'.repeat(80));

  // Status
  console.log(`\n[STATUS]`);
  console.log(`  Status:           ${s.status}`);
  console.log(`  Effective Status: ${s.effective_status}`);
  console.log(`  Created:          ${s.created_time}`);
  console.log(`  Start:            ${s.start_time || 'N/A'}`);
  console.log(`  End:              ${s.end_time || 'No end date'}`);

  // Campaign
  console.log(`\n[CAMPAIGN]`);
  console.log(`  Campaign Name:    ${camp.name || s.campaign_id}`);
  console.log(`  Campaign Status:  ${camp.effective_status || 'N/A'}`);
  console.log(`  Objective:        ${camp.objective || 'N/A'}`);
  console.log(`  Special Ad Cat:   ${(camp.special_ad_categories || []).join(', ') || 'NONE'}`);

  // Budget & Bidding
  console.log(`\n[BUDGET & BIDDING]`);
  console.log(`  Daily Budget:     ${s.daily_budget ? 'Rs' + (parseInt(s.daily_budget)/100).toFixed(0) : 'N/A'}`);
  console.log(`  Lifetime Budget:  ${s.lifetime_budget ? 'Rs' + (parseInt(s.lifetime_budget)/100).toFixed(0) : 'N/A'}`);
  console.log(`  Bid Strategy:     ${s.bid_strategy || camp.bid_strategy || 'N/A'}`);
  console.log(`  Billing Event:    ${s.billing_event || 'N/A'}`);
  console.log(`  Optimization:     ${s.optimization_goal || 'N/A'}`);
  console.log(`  Destination:      ${s.destination_type || 'N/A'}`);
  console.log(`  Pacing:           ${(s.pacing_type || []).join(', ') || 'N/A'}`);

  // Promoted object
  if (s.promoted_object) {
    console.log(`\n[PROMOTED OBJECT]`);
    for (const [k, v] of Object.entries(s.promoted_object)) {
      console.log(`  ${k}: ${v}`);
    }
  }

  // Targeting
  console.log(`\n[TARGETING]`);

  // Age & Gender
  console.log(`  Age:              ${t.age_min || '?'} – ${t.age_max || 'No limit (65+)'}`);
  const genderMap = { 1: 'Male', 2: 'Female' };
  const genders = (t.genders || []).map(g => genderMap[g] || g);
  console.log(`  Genders:          ${genders.length ? genders.join(', ') : 'All'}`);

  // Geo
  if (t.geo_locations) {
    const geo = t.geo_locations;
    console.log(`  Geo Type:         ${Object.keys(geo).filter(k => k !== 'location_types').join(', ')}`);
    if (geo.cities) {
      geo.cities.forEach(c => console.log(`  City:             ${c.name || c.key} (radius: ${c.radius || 'city'}km, type: ${c.distance_unit || 'kilometer'})`));
    }
    if (geo.custom_locations) {
      geo.custom_locations.forEach(c => console.log(`  Custom Location:  lat ${c.latitude}, lon ${c.longitude}, radius ${c.radius}${c.distance_unit}`));
    }
    if (geo.countries) {
      console.log(`  Countries:        ${geo.countries.join(', ')}`);
    }
    if (geo.location_types) {
      console.log(`  Location Types:   ${geo.location_types.join(', ')}`);
    }
  }

  // Languages
  if (t.locales && t.locales.length) {
    console.log(`  Languages:        ${t.locales.join(', ')}`);
  }

  // Custom audiences
  if (t.custom_audiences && t.custom_audiences.length) {
    console.log(`\n  Custom Audiences (INCLUDE):`);
    t.custom_audiences.forEach(a => console.log(`    → ${a.name || a.id} (id: ${a.id})`));
  } else {
    console.log(`  Custom Audiences: None`);
  }

  if (t.excluded_custom_audiences && t.excluded_custom_audiences.length) {
    console.log(`  Excluded Audiences:`);
    t.excluded_custom_audiences.forEach(a => console.log(`    ✗ ${a.name || a.id} (id: ${a.id})`));
  }

  // Detailed targeting
  if (t.flexible_spec && t.flexible_spec.length) {
    console.log(`\n  Interest/Behavior Targeting:`);
    t.flexible_spec.forEach((spec, i) => {
      for (const [type, items] of Object.entries(spec)) {
        (items || []).forEach(item => console.log(`    [${type}] ${item.name || item.id}`));
      }
    });
  } else {
    console.log(`  Interest Targeting: None (broad)`);
  }

  if (t.exclusions) {
    console.log(`  Exclusions:       ${JSON.stringify(t.exclusions)}`);
  }

  // Relaxation / automation
  if (t.targeting_relaxation_types) {
    console.log(`\n  Targeting Relaxation: ${JSON.stringify(t.targeting_relaxation_types)}`);
  } else {
    console.log(`  Targeting Relaxation: Not set`);
  }

  if (t.targeting_automation) {
    console.log(`  Targeting Automation: ${JSON.stringify(t.targeting_automation)}`);
  }

  if (s.targeting_optimization_types) {
    console.log(`  Optimization Types: ${JSON.stringify(s.targeting_optimization_types)}`);
  }
}

console.log('\n' + '='.repeat(80));
console.log(`Total ad sets: ${d.data.length}`);
