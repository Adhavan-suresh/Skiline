/**
 * Compliance fix for the Housewives ad set (2026-08-02).
 *
 * 1. "Back to Work (Copy V2)" is live but carries the same "₹100-200/day"
 *    line that just got "Two Hours" disapproved. Swap in a new creative with
 *    that line removed. Everything else stays identical so delivery isn't
 *    disturbed more than necessary.
 *
 * 2. "Two Hours (W1 refresh)" was disapproved for Fraud/Scams. Its whole
 *    premise (minimal hours -> income, no need to leave the house, plus a
 *    rupee figure) is the violating pattern, so removing only the number
 *    wouldn't clear it. Launch a fresh compliant ad on the same proven image
 *    keeping the "fits around your family" angle, and pause the rejected one
 *    rather than resubmitting it (resubmitting rejected ads hurts account
 *    standing).
 *
 * Image hash is shared by both ads and is already policy-clean (no figures,
 * no income claims on-image) — verified before reuse.
 */

import 'dotenv/config';

const token = process.env.META_TOKEN;
const accountId = process.env.AD_ACCOUNT_ID;

const PAGE_ID = '101929911661079';
const HW_ADSET = '120248587937010744';
const HW_FORM = '1505383314327489';
const IMAGE_HASH = '101d9d46ee8707e31002042c8e9e0a51';
const LINK = 'https://skiline.in/';

const COPY_V2_AD = '120250380221290744';
const TWO_HOURS_AD = '120250461295520744';

async function apiPost(endpoint, body) {
  const res = await fetch(`https://graph.facebook.com/v19.0/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, access_token: token }),
  });
  return res.json();
}

function creativeSpec(name, headline, message) {
  return {
    name,
    object_story_spec: {
      page_id: PAGE_ID,
      link_data: {
        link: LINK,
        image_hash: IMAGE_HASH,
        message,
        name: headline,
        call_to_action: { type: 'APPLY_NOW', value: { lead_gen_form_id: HW_FORM } },
      },
    },
  };
}

// ── 1. Copy V2: same copy, rupee figure removed ──────────────────────────────
console.log('── Fixing Back to Work (Copy V2) ──');

const v2Creative = await apiPost(`${accountId}/adcreatives`, creativeSpec(
  'HW Back to Work Copy V2 – Compliant – Creative',
  'Managing a house is harder than it looks',
  "A family is the hardest project to handle, and you've been doing it for free. Budgeting, crisis-solving, and chaos is your everyday. Skiline is hiring housewives in Chennai who are ready to put those skills to work. Your experience isn't a gap, it's what sets you apart. All experience levels, two weeks of training provided. Apply in 2 minutes.",
));

if (v2Creative.error) {
  console.log('  Creative ERROR:', JSON.stringify(v2Creative.error));
} else {
  console.log('  New creative:', v2Creative.id);
  const upd = await apiPost(COPY_V2_AD, { creative: { creative_id: v2Creative.id } });
  console.log('  Ad updated:', JSON.stringify(upd));
}

// ── 2. Compliant replacement for Two Hours ───────────────────────────────────
console.log('\n── Launching compliant replacement for Two Hours ──');

const newCreative = await apiPost(`${accountId}/adcreatives`, creativeSpec(
  'HW Fits Around Family – Creative',
  'Work that fits around your family, not against it',
  'Skiline is hiring homemakers across Chennai as life insurance advisors. You will meet clients, explain policies, and build your own client base, on a schedule you set around your family. All experience levels welcome. Two weeks of training provided before you start. You should be comfortable talking to people face to face. Apply in 2 minutes.',
));

if (newCreative.error) {
  console.log('  Creative ERROR:', JSON.stringify(newCreative.error));
} else {
  console.log('  New creative:', newCreative.id);
  const newAd = await apiPost(`${accountId}/ads`, {
    name: 'Housewives – Fits Around Family',
    adset_id: HW_ADSET,
    creative: { creative_id: newCreative.id },
    status: 'ACTIVE',
  });
  console.log('  New ad:', JSON.stringify(newAd));
}

// ── 3. Retire the disapproved ad ─────────────────────────────────────────────
console.log('\n── Pausing the disapproved Two Hours ad ──');
const paused = await apiPost(TWO_HOURS_AD, { status: 'PAUSED' });
console.log('  ', JSON.stringify(paused));

console.log('\nDone.');
