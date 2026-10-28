/**
 * Replace the LAO lead form with the final, more qualifying one (2026-10-28).
 * Meta forms cannot be edited, so: create the new form, point every ad in the LAO
 * campaign at it via a copy of its creative, then archive the old form.
 *
 * Questions: current work (free text), years of sales/team experience, readiness to
 * set up an office, then Meta's prefilled DOB / gender / city / name / phone / email.
 */

import 'dotenv/config';

const token = process.env.META_TOKEN;
const pageId = process.env.PAGE_ID;
const API = 'https://graph.facebook.com/v26.0';
const LINK = 'https://www.skilinerecruitment360.in/';
const CAMPAIGN_ID = '120252264956460744';
const OLD_FORM_ID = '2597380737394864';

const FORM = {
  name: 'Skiline – Life Advisory Office (LAO) Lead Form v2',
  locale: 'en_US',
  privacy_policy: { url: 'https://www.skilinerecruitment360.in/privacy', link_text: 'Privacy Policy' },
  follow_up_action_url: LINK,
  questions: [
    // No options = free-text answer. Key "occupation" lands in the sheet's Occupation column (R).
    { type: 'CUSTOM', key: 'occupation', label: 'What do you do currently?' },
    {
      type: 'CUSTOM',
      key: 'years_sales_team_experience',
      label: 'How many years of sales or team-handling experience do you have?',
      options: [
        { key: 'under_2', value: 'Less than 2 years' },
        { key: '2_to_5', value: '2 to 5 years' },
        { key: '5_to_10', value: '5 to 10 years' },
        { key: 'over_10', value: 'More than 10 years' },
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
    { type: 'DOB' },
    { type: 'GENDER' },
    { type: 'CITY' },
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

// ── 1. New form ──────────────────────────────────────────────────────────────
console.log('Creating form v2...');
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

// ── 2. Repoint every ad via a copy of its creative ───────────────────────────
const ads = await get(`${CAMPAIGN_ID}/ads?fields=name,creative{object_story_spec}`);
if (ads.error) fail('read ads', ads.error);
for (const ad of ads.data) {
  const spec = structuredClone(ad.creative.object_story_spec);
  spec.link_data.call_to_action.value.lead_gen_form_id = form.id;
  const creative = await post(`act_${process.env.AD_ACCOUNT_ID.replace(/^act_/, '')}/adcreatives`, { name: `${ad.name} – Creative v2`, object_story_spec: spec });
  if (creative.error) fail(`creative ${ad.name}`, creative.error);
  const upd = await post(ad.id, { creative: { creative_id: creative.id } });
  if (upd.error || !upd.success) fail(`repoint ${ad.name}`, upd.error || upd);
  console.log(`  repointed: ${ad.name}`);
}

// ── 3. Archive old form ──────────────────────────────────────────────────────
const arch = await post(OLD_FORM_ID, { status: 'ARCHIVED' }, pageToken);
console.log('  archive old form:', JSON.stringify(arch));

// ── 4. Verify ────────────────────────────────────────────────────────────────
console.log('\nVerifying...');
const v = await get(`${CAMPAIGN_ID}/ads?fields=name,effective_status,creative{object_story_spec}`);
for (const a of v.data) {
  const fid = a.creative?.object_story_spec?.link_data?.call_to_action?.value?.lead_gen_form_id;
  console.log(`  ${a.name} | ${a.effective_status} | form ${fid}${fid === form.id ? ' ✓' : ' ✗ WRONG FORM'}`);
}
const f = await get(`${form.id}?fields=name,status,questions`, pageToken);
console.log(`  ${f.name} | ${f.status}`);
for (const q of f.questions) console.log(`    ${q.type} | ${q.key} | ${q.label || ''}${q.options ? ' | ' + q.options.map((o) => o.value).join(' / ') : ''}`);
