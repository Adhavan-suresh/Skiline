import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
dotenv.config({ path: path.join(ROOT, '.env') });

const token = process.env.META_TOKEN;
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'weekly-schedule.json'), 'utf8'));
const CAMPAIGN_ID = cfg.phase2_campaign_id;
const AD_ACCOUNT = process.env.AD_ACCOUNT_ID;
const BASE = 'https://graph.facebook.com/v19.0';

async function get(id, fields) {
  const r = await fetch(`${BASE}/${id}?fields=${fields}&access_token=${token}`);
  const d = await r.json();
  if (d.error) throw new Error(d.error.message);
  return d;
}

async function post(endpoint, body) {
  const r = await fetch(`${BASE}/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, access_token: token })
  });
  const d = await r.json();
  if (d.error) throw new Error(d.error.message);
  return d;
}

// ── 1. Turn off lookalike relaxation on current Retirees ad set ──────────────
console.log('\n[1] Turning off lookalike relaxation on Retirees...');
const retireesAdsetId = cfg.ad_group_ids.retirees.adset_id;
const currentTargeting = (await get(retireesAdsetId, 'targeting')).targeting;
const fixedTargeting = { ...currentTargeting, targeting_relaxation_types: { lookalike: 0, custom_audience: 0 } };
await post(retireesAdsetId, { targeting: fixedTargeting });
console.log('✅ Relaxation OFF on Retirees');

// ── 2. Get creative IDs from existing ads ────────────────────────────────────
console.log('\n[2] Fetching existing creative IDs...');
const hwCreativeId = (await get(cfg.ad_group_ids.housewives.ads[0].id, 'creative')).creative.id;
const retCreativeId = (await get(cfg.ad_group_ids.retirees.ads[0].id, 'creative')).creative.id;
console.log(`  Housewives creative: ${hwCreativeId}`);
console.log(`  Retirees creative:   ${retCreativeId}`);

// ── 3. Create Retirees BROAD ad set (no lookalike) — ACTIVE ─────────────────
console.log('\n[3] Creating Retirees Broad ad set (ACTIVE ₹100/day)...');
const retBroadAdset = await post(`${AD_ACCOUNT}/adsets`, {
  name: 'Skiline – Retirees – Broad (No Lookalike)',
  campaign_id: CAMPAIGN_ID,
  status: 'ACTIVE',
  daily_budget: '10000',
  billing_event: 'IMPRESSIONS',
  optimization_goal: 'LEAD_GENERATION',
  bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
  destination_type: 'ON_AD',
  promoted_object: JSON.stringify({ page_id: process.env.PAGE_ID }),
  targeting: JSON.stringify({
    age_min: 50,
    age_max: 65,
    geo_locations: {
      cities: [{ key: '1021534', radius: 17, distance_unit: 'kilometer' }],
      location_types: ['home', 'recent']
    },
    targeting_automation: { advantage_audience: 0 }
  })
});
console.log(`✅ Retirees Broad adset: ${retBroadAdset.id}`);

const retBroadAd = await post(`${AD_ACCOUNT}/ads`, {
  name: 'Skiline – Retirees – Broad (No Lookalike)',
  adset_id: retBroadAdset.id,
  status: 'ACTIVE',
  creative: { creative_id: retCreativeId }
});
console.log(`✅ Retirees Broad ad: ${retBroadAd.id}`);

// ── 4. Create Housewives BROAD ad set (no lookalike) — PAUSED ───────────────
console.log('\n[4] Creating Housewives Broad ad set (PAUSED — activates Week 14)...');
const hwBroadAdset = await post(`${AD_ACCOUNT}/adsets`, {
  name: 'Skiline – Housewives – Broad (No Lookalike)',
  campaign_id: CAMPAIGN_ID,
  status: 'PAUSED',
  daily_budget: '10000',
  billing_event: 'IMPRESSIONS',
  optimization_goal: 'LEAD_GENERATION',
  bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
  destination_type: 'ON_AD',
  promoted_object: JSON.stringify({ page_id: process.env.PAGE_ID }),
  targeting: JSON.stringify({
    age_min: 35,
    age_max: 65,
    genders: [2],
    geo_locations: {
      cities: [{ key: '1021534', radius: 17, distance_unit: 'kilometer' }],
      location_types: ['home', 'recent']
    },
    targeting_automation: { advantage_audience: 0 }
  })
});
console.log(`✅ Housewives Broad adset: ${hwBroadAdset.id}`);

const hwBroadAd = await post(`${AD_ACCOUNT}/ads`, {
  name: 'Skiline – Housewives – Broad (No Lookalike)',
  adset_id: hwBroadAdset.id,
  status: 'PAUSED',
  creative: { creative_id: hwCreativeId }
});
console.log(`✅ Housewives Broad ad: ${hwBroadAd.id}`);

// ── 5. Save IDs to config ────────────────────────────────────────────────────
console.log('\n[5] Saving to config...');
cfg.ad_group_ids.retirees_broad = {
  adset_id: retBroadAdset.id,
  adset_name: 'Skiline – Retirees – Broad (No Lookalike)',
  form_id: cfg.ad_group_ids.retirees.form_id,
  ads: [{ name: 'Skiline – Retirees – Broad (No Lookalike)', id: retBroadAd.id }]
};
cfg.ad_group_ids.housewives_broad = {
  adset_id: hwBroadAdset.id,
  adset_name: 'Skiline – Housewives – Broad (No Lookalike)',
  form_id: cfg.ad_group_ids.housewives.form_id,
  ads: [{ name: 'Skiline – Housewives – Broad (No Lookalike)', id: hwBroadAd.id }]
};
fs.writeFileSync(path.join(ROOT, 'config', 'weekly-schedule.json'), JSON.stringify(cfg, null, 2));
console.log('✅ Config updated');

console.log('\n✅ ALL DONE:');
console.log(`  Retirees (lookalike, relaxation OFF): ${retireesAdsetId} — ACTIVE ₹200/day`);
console.log(`  Retirees Broad (no lookalike):        ${retBroadAdset.id} — ACTIVE ₹100/day`);
console.log(`  Housewives Broad (no lookalike):      ${hwBroadAdset.id} — PAUSED`);
