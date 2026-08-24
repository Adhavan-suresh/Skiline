/**
 * Create the qualified Housewives lead form (2026-08-24).
 *
 * Adds ONE qualifying question to the existing form's structure. The existing
 * form (1505383314327489) is name + phone + email only — three taps, no
 * qualification, which is why 47 of every 100 leads answer the phone and say no.
 *
 * The question filters on training commitment: someone who cannot give two
 * weeks up front cannot convert, so it is the truest single predictor
 * available that does not touch money (no fee, no salary, no rupee figures —
 * all barred).
 *
 * Custom question goes FIRST, matching Meta's native ordering — contact fields
 * are auto-prefilled from the user's profile, so the custom question is the
 * only real friction and should be what they hit first.
 *
 * Published forms cannot be edited, so this is a new form with a new ID. It
 * gets applied to BOTH ads in the ad set (not just the new one) — an ad with
 * a harder form has a lower click-to-lead rate, so Meta reads it as the worse
 * ad and starves it. Equal friction keeps the comparison on creative merit.
 */

import 'dotenv/config';

const token = process.env.META_TOKEN;
const PAGE_ID = process.env.PAGE_ID;

const form = {
  name: 'Skiline — Housewives Form — Training Qualifier',
  locale: 'en_US',
  privacy_policy: { url: 'https://skiline.in/privacy', link_text: 'Privacy Policy' },
  follow_up_action_url: 'https://skiline.in/',
  questions: [
    {
      type: 'CUSTOM',
      key: 'training_commitment',
      label: 'Training runs two weeks before you start. Can you commit to that?',
      options: [
        { key: 'yes_two_weeks', value: 'Yes, I can commit two weeks' },
        { key: 'need_flexible', value: 'I would need it to be flexible' },
        { key: 'not_right_now', value: 'Not right now' },
      ],
    },
    { type: 'FULL_NAME' },
    { type: 'PHONE' },
    { type: 'EMAIL' },
  ],
};

const pageData = await fetch(`https://graph.facebook.com/v19.0/${PAGE_ID}?fields=access_token&access_token=${token}`).then(r => r.json());
if (pageData.error) { console.log('page token ERROR:', JSON.stringify(pageData.error)); process.exit(1); }
const pageToken = pageData.access_token;

const res = await fetch(`https://graph.facebook.com/v19.0/${PAGE_ID}/leadgen_forms`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ ...form, questions: JSON.stringify(form.questions), privacy_policy: JSON.stringify(form.privacy_policy), access_token: pageToken }),
}).then(r => r.json());

console.log('create:', JSON.stringify(res));
if (res.error) process.exit(1);

const verify = await fetch(`https://graph.facebook.com/v19.0/${res.id}?fields=name,status,questions,privacy_policy_url,follow_up_action_url,locale&access_token=${pageToken}`).then(r => r.json());
console.log('\nverify:', JSON.stringify(verify, null, 1));
