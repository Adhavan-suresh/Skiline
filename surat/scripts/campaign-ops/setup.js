import dotenv from 'dotenv';
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..', '..');
dotenv.config({ path: path.join(ROOT, '.env') });

const TOKEN   = process.env.META_TOKEN;
const AD_ACCT = process.env.AD_ACCOUNT_ID;
const PAGE_ID = process.env.PAGE_ID;
const BASE    = 'https://graph.facebook.com/v19.0';
const CONFIG_PATH = path.join(ROOT, 'config', 'campaign-config.json');

async function post(endpoint, params) {
  const body = new URLSearchParams({ ...params, access_token: TOKEN });
  const res  = await fetch(`${BASE}/${endpoint}`, { method: 'POST', body });
  const d    = await res.json();
  if (d.error) {
    console.error(`\nFAILED: ${endpoint}`);
    console.error(JSON.stringify(d.error, null, 2));
    process.exit(1);
  }
  return d;
}

async function uploadImage(imagePath) {
  const { createReadStream } = await import('fs');
  const FormData = (await import('form-data')).default;
  const fetch2   = (await import('node-fetch')).default;

  const form = new FormData();
  form.append('access_token', TOKEN);
  form.append('source', createReadStream(imagePath), { filename: path.basename(imagePath) });

  const res  = await fetch2(`${BASE}/${AD_ACCT}/adimages`, { method: 'POST', body: form });
  const data = await res.json();
  if (data.error) {
    console.error('Image upload failed:', JSON.stringify(data.error, null, 2));
    process.exit(1);
  }
  const filename = path.basename(imagePath);
  return data.images[filename].hash;
}

console.log('\n====================================================');
console.log('  SKILINE — SURAT — LEADERS CAMPAIGN SETUP');
console.log('====================================================\n');

// ── 1. Upload image ───────────────────────────────────────────────────────────
console.log('1/6  Uploading Leaders.png...');
const imagePath = path.join(ROOT, 'assets', 'Phase 2', 'Leaders.png');
const HASH_LEADERS = await uploadImage(imagePath);
console.log('     Image hash:', HASH_LEADERS);

// ── 2. Create lead form ───────────────────────────────────────────────────────
console.log('2/6  Creating lead form...');
const formRes = await post(`${PAGE_ID}/leadgen_forms`, {
  name: 'Skiline – Leaders Lead Form – Surat',
  questions: JSON.stringify([
    { type: 'FULL_NAME' },
    { type: 'PHONE' },
    { type: 'EMAIL' },
    {
      type: 'CUSTOM',
      label: 'How soon are you looking to start?',
      options: [
        { value: 'Immediately' },
        { value: 'Within 3 months' },
        { value: 'Just exploring' },
      ],
    },
  ]),
  thank_you_page: JSON.stringify({
    title: 'Thank You!',
    body:  'Thank you! Our team will be in touch with you shortly.',
  }),
  privacy_policy: JSON.stringify({ url: 'https://skilinerecruitment.com', link_text: 'Privacy Policy' }),
});
const LEAD_FORM_ID_LEADERS = formRes.id;
console.log('     Form ID:', LEAD_FORM_ID_LEADERS);

// ── 3. Create campaign ────────────────────────────────────────────────────────
console.log('3/6  Creating campaign...');
const campaign = await post(`${AD_ACCT}/campaigns`, {
  name:               'Skiline Recruitment — Surat — Leaders',
  objective:          'OUTCOME_LEADS',
  special_ad_categories: JSON.stringify([]),
  status:             'PAUSED',
});
const CAMPAIGN_ID_SURAT = campaign.id;
console.log('     Campaign ID:', CAMPAIGN_ID_SURAT);

// ── 4. Create ad set ──────────────────────────────────────────────────────────
console.log('4/6  Creating ad set...');
const PINCODES = [
  392150,393050,393125,393130,394101,394105,394107,394110,394111,394120,
  394125,394130,394140,394150,394155,394160,394163,394170,394180,394185,
  394190,394210,394221,394230,394235,394240,394245,394246,394248,394250,
  394270,394305,394310,394315,394317,394320,394325,394326,394327,394330,
  394335,394340,394345,394350,394352,394355,394360,394365,394370,394375,
  394380,394405,394410,394421,394430,394440,394445,394510,394515,394516,
  394517,394518,394520,394530,394540,394550,394601,394620,394630,394633,
  394635,394640,394641,394650,394651,394655,394660,394670,394680,394690,
  394715,394716,395001,395002,395003,395004,395005,395006,395007,395008,
  395009,395010,395011,395012,395013,395017,395023,396510,
];

const adSet = await post(`${AD_ACCT}/adsets`, {
  name:              'Skiline – Leaders – Surat',
  campaign_id:       CAMPAIGN_ID_SURAT,
  promoted_object:   JSON.stringify({ page_id: PAGE_ID }),
  destination_type:  'ON_AD',
  optimization_goal: 'LEAD_GENERATION',
  billing_event:     'IMPRESSIONS',
  bid_strategy:      'LOWEST_COST_WITHOUT_CAP',
  daily_budget:      '20000',
  targeting: JSON.stringify({
    geo_locations: {
      zips: PINCODES.map(z => ({ key: String(z), country: 'IN' })),
    },
    age_min: 28,
    age_max: 55,
    targeting_automation: { advantage_audience: 0 },
  }),
  status: 'PAUSED',
});
const ADSET_ID_LEADERS = adSet.id;
console.log('     Ad set ID:', ADSET_ID_LEADERS);

// ── 5. Create creative + ad ───────────────────────────────────────────────────
console.log('5/6  Creating ad creative and ad...');
const creative = await post(`${AD_ACCT}/adcreatives`, {
  name: 'Skiline – Leaders – Surat Creative',
  object_story_spec: JSON.stringify({
    page_id:       PAGE_ID,
    link_data:     {
      image_hash:    HASH_LEADERS,
      message:       "You've spent years building someone else's dream. It's time to build your own — with zero investment, full training, and the backing of one of India's most trusted MNCs. Take the first step today.",
      call_to_action: {
        type:  'SIGN_UP',
        value: { lead_gen_form_id: LEAD_FORM_ID_LEADERS },
      },
      name: 'Skiline Recruitment',
    },
  }),
  lead_gen_form_id: LEAD_FORM_ID_LEADERS,
});
console.log('     Creative ID:', creative.id);

const ad = await post(`${AD_ACCT}/ads`, {
  name:     'Skiline – Leaders – Surat',
  adset_id: ADSET_ID_LEADERS,
  creative: JSON.stringify({ creative_id: creative.id }),
  status:   'PAUSED',
});
const AD_ID = ad.id;
console.log('     Ad ID:', AD_ID);

// ── 6. Write config ───────────────────────────────────────────────────────────
console.log('6/6  Writing campaign-config.json...');
const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
config.campaign_id    = CAMPAIGN_ID_SURAT;
config.adset_id       = ADSET_ID_LEADERS;
config.ad_id          = AD_ID;
config.form_id        = LEAD_FORM_ID_LEADERS;
config.start_date     = new Date().toISOString().split('T')[0];
config.daily_budget   = 20000;
config.sheet_tab      = 'Leaders – Surat';
writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
console.log('     Config written\n');

// ── Report ────────────────────────────────────────────────────────────────────
console.log('====================================================');
console.log('SETUP COMPLETE — ALL ENTITIES PAUSED');
console.log('====================================================');
console.log('AD_ACCOUNT_ID      :', AD_ACCT);
console.log('PAGE_ID            :', PAGE_ID);
console.log('HASH_LEADERS       :', HASH_LEADERS);
console.log('LEAD_FORM_ID       :', LEAD_FORM_ID_LEADERS);
console.log('CAMPAIGN_ID        :', CAMPAIGN_ID_SURAT);
console.log('ADSET_ID           :', ADSET_ID_LEADERS);
console.log('AD_ID              :', AD_ID);
console.log('Config             :', CONFIG_PATH);
console.log('');
console.log('Nothing is active. Activate via Meta Ads Manager when ready.');
console.log('====================================================\n');
