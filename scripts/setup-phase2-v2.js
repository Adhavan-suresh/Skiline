import dotenv from 'dotenv';
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
dotenv.config({ path: path.join(ROOT, '.env') });

const TOKEN   = process.env.META_TOKEN;
const AD_ACCT = process.env.AD_ACCOUNT_ID;
const PAGE_ID = process.env.PAGE_ID;
const BASE    = 'https://graph.facebook.com/v19.0';

const CONFIG_PATH = path.join(ROOT, 'config', 'weekly-schedule.json');

// Reuse creatives already uploaded in Phase 2 first run
const CREATIVE_HOUSEWIVES = '1125896150610796';
const CREATIVE_RETIREES   = '999935335753250';

const LAL_AUDIENCE_ID      = '120248543198060744';
const LEAD_FORM_HOUSEWIVES = '1209496811207023';  // 343 leads — main form
const LEAD_FORM_RETIREES   = '2370602070099137';  // 267 leads — main form

// Old Phase 2 ad sets (EMPLOYMENT-restricted) — archived at end
const OLD_HW_ADSET = '120248570116830744';
const OLD_RT_ADSET = '120248570118190744';

async function post(endpoint, params) {
  const body = new URLSearchParams({ ...params, access_token: TOKEN });
  const res  = await fetch(`${BASE}/${endpoint}`, { method: 'POST', body });
  const d    = await res.json();
  if (d.error) {
    console.error(`\n❌ FAILED: ${endpoint}`);
    console.error(JSON.stringify(d.error, null, 2));
    process.exit(1);
  }
  return d;
}

console.log('\n╔══════════════════════════════════════════════════════╗');
console.log('║      PHASE 2 v2 — NO EMPLOYMENT CATEGORY            ║');
console.log('║      Age + Gender targeting unlocked                 ║');
console.log('╚══════════════════════════════════════════════════════╝\n');

// ─── 1. New Campaign ──────────────────────────────────────────────────────────
// Campaign already created on previous run — reuse it
const campaign = { id: '120248587929600744' };
console.log('1/7  ♻️  Reusing campaign:', campaign.id);

// ─── 2. Housewives Ad Set ─────────────────────────────────────────────────────
console.log('2/7  Creating Housewives ad set (female 25–50)...');
const hwAdSet = await post(`${AD_ACCT}/adsets`, {
  name:             'Skiline – Housewives – Phase 2',
  campaign_id:      campaign.id,
  promoted_object:  JSON.stringify({ page_id: PAGE_ID }),
  destination_type: 'ON_AD',
  optimization_goal:'LEAD_GENERATION',  // adset-level goal stays as LEAD_GENERATION
  billing_event:    'IMPRESSIONS',
  bid_strategy:     'LOWEST_COST_WITHOUT_CAP',
  daily_budget:     '20000',
  targeting:        JSON.stringify({
    geo_locations: {
      cities: [{ key: '1021534', radius: 17, distance_unit: 'kilometer' }],
    },
    age_min:               25,
    age_max:               50,
    genders:               [2],
    custom_audiences:      [{ id: LAL_AUDIENCE_ID }],
    targeting_automation:  { advantage_audience: 0 },
  }),
  status: 'PAUSED',
});
console.log('     ✅ Housewives ad set:', hwAdSet.id);

// ─── 3. Retirees Ad Set ───────────────────────────────────────────────────────
console.log('3/7  Creating Retirees ad set (all genders 50–65)...');
const rtAdSet = await post(`${AD_ACCT}/adsets`, {
  name:             'Skiline – Retirees – Phase 2',
  campaign_id:      campaign.id,
  promoted_object:  JSON.stringify({ page_id: PAGE_ID }),
  destination_type: 'ON_AD',
  optimization_goal:'LEAD_GENERATION',  // adset-level goal stays as LEAD_GENERATION
  billing_event:    'IMPRESSIONS',
  bid_strategy:     'LOWEST_COST_WITHOUT_CAP',
  daily_budget:     '20000',
  targeting:        JSON.stringify({
    geo_locations: {
      cities: [{ key: '1021534', radius: 17, distance_unit: 'kilometer' }],
    },
    age_min:               50,
    age_max:               65,
    custom_audiences:      [{ id: LAL_AUDIENCE_ID }],
    targeting_automation:  { advantage_audience: 0 },
  }),
  status: 'PAUSED',
});
console.log('     ✅ Retirees ad set:', rtAdSet.id);

// ─── 4 & 5. Ads ───────────────────────────────────────────────────────────────
console.log('4/7  Creating Housewives ad...');
const hwAd = await post(`${AD_ACCT}/ads`, {
  name:     'Skiline – Housewives – Phase 2',
  adset_id: hwAdSet.id,
  creative: JSON.stringify({ creative_id: CREATIVE_HOUSEWIVES }),
  status:   'PAUSED',
});
console.log('     ✅ Housewives ad:', hwAd.id);

console.log('5/7  Creating Retirees ad...');
const rtAd = await post(`${AD_ACCT}/ads`, {
  name:     'Skiline – Retirees – Phase 2',
  adset_id: rtAdSet.id,
  creative: JSON.stringify({ creative_id: CREATIVE_RETIREES }),
  status:   'PAUSED',
});
console.log('     ✅ Retirees ad:', rtAd.id);

// ─── 6. Archive old EMPLOYMENT-restricted ad sets ─────────────────────────────
console.log('6/7  Archiving old Phase 2 ad sets (EMPLOYMENT-restricted)...');
await post(OLD_HW_ADSET, { status: 'ARCHIVED' });
console.log('     ✅ Archived:', OLD_HW_ADSET);
await post(OLD_RT_ADSET, { status: 'ARCHIVED' });
console.log('     ✅ Archived:', OLD_RT_ADSET);

// ─── 7. Update config → toggle script picks up new IDs ───────────────────────
console.log('7/7  Updating config/weekly-schedule.json...');
const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));

config.phase2_campaign_id = campaign.id;

config.ad_group_ids.housewives = {
  adset_id:   hwAdSet.id,
  adset_name: 'Skiline – Housewives – Phase 2',
  form_id:    LEAD_FORM_HOUSEWIVES,
  ads: [{ name: 'Skiline – Housewives – Phase 2', id: hwAd.id }],
};
config.ad_group_ids.retirees = {
  adset_id:   rtAdSet.id,
  adset_name: 'Skiline – Retirees – Phase 2',
  form_id:    LEAD_FORM_RETIREES,
  ads: [{ name: 'Skiline – Retirees – Phase 2', id: rtAd.id }],
};

writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
console.log('     ✅ Config updated\n');

// ─── Final Report ─────────────────────────────────────────────────────────────
console.log('══════════════════════════════════════════════════════');
console.log('PHASE 2 v2 — COMPLETE');
console.log('══════════════════════════════════════════════════════');
console.log('Campaign (new)        :', campaign.id, '← no EMPLOYMENT restriction');
console.log('');
console.log('Housewives ad set     :', hwAdSet.id);
console.log('  targeting           : female · age 25–50 · Chennai 17km · lookalike');
console.log('  ad                  :', hwAd.id);
console.log('');
console.log('Retirees ad set       :', rtAdSet.id);
console.log('  targeting           : all genders · age 50–65 · Chennai 17km · lookalike');
console.log('  ad                  :', rtAd.id);
console.log('');
console.log('Archived (old)        :', OLD_HW_ADSET, '&', OLD_RT_ADSET);
console.log('Config                : ad_group_ids updated → weekly toggle ready');
console.log('');
console.log('STATUS: All PAUSED. Run npm run toggle to activate this week segment.');
console.log('======================================================\n');
