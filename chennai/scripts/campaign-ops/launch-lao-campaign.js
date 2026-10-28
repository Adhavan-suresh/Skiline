/**
 * Build the LAO (Life Advisory Office) campaign, all-India (2026-10-28).
 *
 * Everything is created with the CAMPAIGN paused and ad set/ads active, so going
 * live is one switch: activate the campaign.
 *
 * Two ads in one ad set, different angle AND different format, so the result shows
 * which wins:
 *   A  "Great at sales, but work for someone else?"  person-led photo   (assets/LAO/LAO 2.jpg)
 *   B  "This is not an agent job."                    typography notice  (assets/LAO/LAO 1.png)
 *
 * Targeting: all India, home location only, all genders, age 28-55 (Solapur uses
 * the same range). Advantage audience off, matching the other Leaders ad sets.
 * Budget ₹150/day. Optimisation is plain LEAD_GENERATION: LAO volume is far below
 * the 200 leads/month Conversion Leads needs.
 *
 * The lead form name contains "Life Advisory Office" / "LAO", which api/webhook.js
 * routes to the LAO tab (create it first with create-lao-tab.js, and deploy the
 * webhook before activating, or leads from this form are skipped as "Unknown form").
 */

import 'dotenv/config';
import fs from 'fs';

const token = process.env.META_TOKEN;
const accountId = process.env.AD_ACCOUNT_ID;
const pageId = process.env.PAGE_ID;
const API = 'https://graph.facebook.com/v26.0';
const LINK = 'https://www.skilinerecruitment360.in/';
const ASSETS = new URL('../../assets/LAO/', import.meta.url);

const BODY_A = [
  'Are you someone who hits the numbers, and still has no team of your own?',
  '',
  'Many people in sales get here. The results are good, and the next step never gets offered.',
  '',
  'Skiline is opening Life Advisory Offices across India. You set up your own office, recruit life insurance advisors, train them and run their reviews.',
  '',
  'Requirement: age 28 or above, with sales or team handling experience. No insurance background needed. Licensing and training are covered.',
  '',
  '10 slots left. Not every applicant is selected. Apply, and our team will call shortlisted candidates.',
].join('\n');

const BODY_B = [
  'Every insurance ad you have seen asks you to become an agent. This one does not.',
  '',
  'Someone has to recruit those agents, train them and run their reviews. That is a different job, and almost nobody advertises it.',
  '',
  'A Life Advisory Office is that job, run from your own office. Skiline has placed 500+ people, and we are opening this role across India.',
  '',
  'Requirement: age 28 or above, with sales or team handling experience. No insurance background needed. Licensing and training are covered.',
  '',
  '10 slots left. Not every applicant is selected. Apply now, and our team will call shortlisted candidates.',
].join('\n');

const ADS = [
  { name: 'LAO – Great At Sales (Person)', file: 'LAO 2.jpg', type: 'image/jpeg', headline: 'Skiline has an opportunity for you', body: BODY_A },
  { name: 'LAO – Not An Agent Job (Notice)', file: 'LAO 1.png', type: 'image/png', headline: 'This is not an agent job.', body: BODY_B },
];

const FORM = {
  name: 'Skiline – Life Advisory Office (LAO) Lead Form',
  locale: 'en_US',
  privacy_policy: { url: 'https://www.skilinerecruitment360.in/privacy', link_text: 'Privacy Policy' },
  follow_up_action_url: LINK,
  questions: [
    {
      type: 'CUSTOM',
      key: 'occupation',
      label: 'What do you do currently?',
      options: [
        { key: 'insurance_agent', value: 'Insurance agent (life, general or health)' },
        { key: 'mf_loan_microfinance', value: 'Mutual fund, loan or microfinance agent' },
        { key: 'tax_consultant', value: 'Tax consultant or accountant' },
        { key: 'post_office_bank_csp', value: 'Post office or bank CSP' },
        { key: 'other_sales_business', value: 'Other sales or business experience' },
        { key: 'none_of_these', value: 'None of these' },
      ],
    },
    {
      type: 'CUSTOM',
      key: 'office_setup',
      label: 'Are you ready to set up your own office if selected?',
      options: [
        { key: 'yes', value: 'Yes' },
        { key: 'need_to_know_more', value: 'I need to know more' },
        { key: 'not_right_now', value: 'Not right now' },
      ],
    },
    {
      type: 'CUSTOM',
      key: 'how_soon_are_you_looking_to_start',
      label: 'How soon are you looking to start?',
      options: [
        { key: 'immediately', value: 'Immediately' },
        { key: 'within_3_months', value: 'Within 3 months' },
        { key: 'just_exploring', value: 'Just exploring' },
      ],
    },
    { type: 'CITY' },
    { type: 'STATE' },
    { type: 'FULL_NAME' },
    { type: 'PHONE' },
    { type: 'EMAIL' },
  ],
  thank_you_page: {
    title: 'Thank You!',
    body: 'Thank you! Our team will be in touch with you shortly.',
    button_text: 'Visit Website',
    button_type: 'VIEW_WEBSITE',
    website_url: LINK,
  },
};

async function post(endpoint, body, tok = token) {
  const res = await fetch(`${API}/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, access_token: tok }),
    signal: AbortSignal.timeout(60000),
  });
  return res.json();
}
const get = (p, tok = token) => fetch(`${API}/${p}${p.includes('?') ? '&' : '?'}access_token=${tok}`).then((r) => r.json());
const fail = (what, err) => { console.log(`  ${what} ERROR:`, JSON.stringify(err)); process.exit(1); };

// ── 1. Lead form (first, so a failure here leaves nothing half-built) ────────
console.log('Creating lead form...');
const pageToken = (await get(`${pageId}?fields=access_token`)).access_token;
const formBody = { ...FORM, questions: JSON.stringify(FORM.questions), privacy_policy: JSON.stringify(FORM.privacy_policy), thank_you_page: JSON.stringify(FORM.thank_you_page) };
let form = await post(`${pageId}/leadgen_forms`, formBody, pageToken);
if (form.error) {
  console.log('  with thank-you page failed:', form.error.error_user_msg || form.error.message, '→ retrying without it');
  delete formBody.thank_you_page;
  form = await post(`${pageId}/leadgen_forms`, formBody, pageToken);
}
if (form.error) fail('form', form.error);
console.log('  form:', form.id);

// ── 2. Images ────────────────────────────────────────────────────────────────
for (const ad of ADS) {
  console.log(`Uploading ${ad.file}...`);
  const fd = new FormData();
  fd.append('filename', new Blob([fs.readFileSync(new URL(ad.file, ASSETS))], { type: ad.type }), ad.file.replace(/ /g, '-'));
  fd.append('access_token', token);
  const up = await fetch(`${API}/${accountId}/adimages`, { method: 'POST', body: fd, signal: AbortSignal.timeout(60000) }).then((r) => r.json());
  if (!up.images) fail('image', up);
  ad.hash = Object.values(up.images)[0].hash;
  console.log('  image:', ad.hash);
}

// ── 3. Campaign (paused), ad set, creatives, ads ─────────────────────────────
console.log('Creating campaign (paused)...');
const campaign = await post(`${accountId}/campaigns`, {
  name: 'Skiline Recruitment — LAO — India',
  objective: 'OUTCOME_LEADS',
  buying_type: 'AUCTION',
  special_ad_categories: [],
  is_adset_budget_sharing_enabled: false,
  status: 'PAUSED',
});
if (campaign.error) fail('campaign', campaign.error);
console.log('  campaign:', campaign.id);

const adset = await post(`${accountId}/adsets`, {
  name: 'Skiline – LAO – India',
  campaign_id: campaign.id,
  daily_budget: 15000, // ₹150 in paise
  billing_event: 'IMPRESSIONS',
  optimization_goal: 'LEAD_GENERATION',
  bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
  destination_type: 'ON_AD',
  status: 'ACTIVE',
  promoted_object: { page_id: pageId },
  targeting: {
    age_min: 28,
    age_max: 55,
    geo_locations: { countries: ['IN'], location_types: ['home'] },
    targeting_automation: { advantage_audience: 0 },
  },
});
if (adset.error) fail('adset', adset.error);
console.log('  adset:', adset.id);

for (const ad of ADS) {
  const creative = await post(`${accountId}/adcreatives`, {
    name: `${ad.name} – Creative`,
    object_story_spec: {
      page_id: pageId,
      link_data: {
        link: LINK,
        image_hash: ad.hash,
        message: ad.body,
        name: ad.headline,
        call_to_action: { type: 'APPLY_NOW', value: { lead_gen_form_id: form.id } },
      },
    },
  });
  if (creative.error) fail(`creative ${ad.name}`, creative.error);
  const created = await post(`${accountId}/ads`, { name: ad.name, adset_id: adset.id, creative: { creative_id: creative.id }, status: 'ACTIVE' });
  if (created.error) fail(`ad ${ad.name}`, created.error);
  console.log(`  ad: ${created.id}  ${ad.name}`);
}

// ── 4. Verify ────────────────────────────────────────────────────────────────
console.log('\nVerifying...');
const v = await get(`${campaign.id}?fields=effective_status,adsets{name,effective_status,optimization_goal,daily_budget,targeting,ads{name,effective_status,creative{object_story_spec}}}`);
console.log(`  campaign ${v.effective_status}`);
for (const s of v.adsets.data) {
  console.log(`  ${s.name} | ${s.effective_status} | ${s.optimization_goal} | ₹${s.daily_budget / 100}/day | ${JSON.stringify(s.targeting.geo_locations)} age ${s.targeting.age_min}-${s.targeting.age_max}`);
  for (const a of s.ads.data) {
    const fid = a.creative?.object_story_spec?.link_data?.call_to_action?.value?.lead_gen_form_id;
    console.log(`    ${a.name} | ${a.effective_status} | form ${fid}${fid === form.id ? ' ✓' : ' ✗ WRONG FORM'}`);
  }
}
console.log('\nDone. Campaign is PAUSED; activate it to go live.');
