/**
 * Launch the Leaders expansion: Thoraipakkam + Hyderabad, 2 ads each.
 *
 * Copy written by the user. Angles mapped earlier:
 *   Thoraipakkam — Angle 6 (how people address you) + Angle 2 (the job above
 *                  the one you're picturing)
 *   Hyderabad    — Angle 4 (no rung above you) + Angle 3 (effort and reward
 *                  are disconnected)
 *
 * Each city has its own lead form so leads land in its own sheet tab; the
 * webhook routing was updated first (city checks before the generic 'leader'
 * match, which would otherwise swallow everything into Surat).
 */

import 'dotenv/config';
import fs from 'fs';

const token = process.env.META_TOKEN;
const accountId = process.env.AD_ACCOUNT_ID;
const PAGE_ID = process.env.PAGE_ID;
const LINK = 'https://skiline.in/';

const THOR_ADSET = '120250827535220744';
const HYD_ADSET  = '120250827539460744';
const THOR_FORM  = '2215052975946717';
const HYD_FORM   = '1032180399428337';

const ASSETS = 'D:/SkiLine/Ads - Skiline - Surat - Leaders/assets/Phase 3';

const ADS = [
  {
    name: 'Leaders – Thoraipakkam – Standing Problem',
    adset: THOR_ADSET, form: THOR_FORM,
    image: `${ASSETS}/Thoraippakkam/Thor 1.png`,
    headline: 'A different building entirely',
    message: [
      "You've worked 15 years for a boss who steals credit.",
      'And you know you could run a team better than that.',
      '',
      "We've built careers for people the job market forgot to promote.",
      '',
      'This isn\u2019t another rung on the same ladder.',
      'It\u2019s a different building entirely.',
      '',
      'Talk to us. One conversation changes the answer to "what do you do?"',
    ].join('\n'),
  },
  {
    name: 'Leaders – Thoraipakkam – Job Above',
    adset: THOR_ADSET, form: THOR_FORM,
    image: `${ASSETS}/Thoraippakkam/Thor 2.png`,
    headline: 'The role the agent reports to',
    message: [
      'You saw "insurance" and almost kept scrolling.',
      '',
      'This isn\u2019t the agent role.',
      'It\u2019s the role the agent reports to.',
      '',
      'You don\u2019t sell policies.',
      'You build the team that does.',
      '',
      'If that sounds different — it is. Let\u2019s talk.',
    ].join('\n'),
  },
  {
    name: 'Leaders – Hyderabad – No Rung Above',
    adset: HYD_ADSET, form: HYD_FORM,
    image: `${ASSETS}/Hyderabad/Hyd 1.jpeg`,
    headline: "The promotion doesn't exist",
    message: [
      'It\u2019s not that you haven\u2019t earned the promotion.',
      'It\u2019s that the promotion doesn\u2019t exist.',
      '',
      'Three years in the same seat.',
      'Everyone above you is going nowhere either.',
      '',
      'Hyderabad doesn\u2019t have a Skiline leader yet.',
      'That seat is being built right now — not filled.',
      '',
      'Be the one who builds it. Talk to us.',
    ].join('\n'),
  },
  {
    name: 'Leaders – Hyderabad – Effort and Reward',
    adset: HYD_ADSET, form: HYD_FORM,
    image: `${ASSETS}/Hyderabad/Hyd 2.jpeg`,
    headline: 'Your results are yours',
    message: [
      'You worked harder this month than last.',
      'Nothing moved.',
      '',
      'Not because you did less.',
      'Because the system doesn\u2019t measure what you did.',
      '',
      'Skiline does.',
      'Your unit\u2019s results are yours — not your manager\u2019s highlight reel.',
      '',
      'If effort should count for something, it will here. Talk to us.',
    ].join('\n'),
  },
];

async function apiPost(endpoint, body) {
  const res = await fetch(`https://graph.facebook.com/v19.0/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, access_token: token }),
    signal: AbortSignal.timeout(40000),
  });
  return res.json();
}

for (const ad of ADS) {
  console.log(`\n── ${ad.name} ──`);

  const buf = fs.readFileSync(ad.image);
  const ext = ad.image.split('.').pop().toLowerCase();
  const form = new FormData();
  form.append('filename', new Blob([buf], { type: ext === 'png' ? 'image/png' : 'image/jpeg' }), `leaders.${ext}`);
  form.append('access_token', token);
  const up = await fetch(`https://graph.facebook.com/v19.0/${accountId}/adimages`, {
    method: 'POST', body: form, signal: AbortSignal.timeout(60000),
  }).then(r => r.json());
  if (!up.images) { console.log('  image ERROR:', JSON.stringify(up)); continue; }
  const imageHash = Object.values(up.images)[0].hash;
  console.log('  image:', imageHash);

  const creative = await apiPost(`${accountId}/adcreatives`, {
    name: `${ad.name} – Creative`,
    object_story_spec: {
      page_id: PAGE_ID,
      link_data: {
        link: LINK,
        image_hash: imageHash,
        message: ad.message,
        name: ad.headline,
        call_to_action: { type: 'APPLY_NOW', value: { lead_gen_form_id: ad.form } },
      },
    },
  });
  if (creative.error) { console.log('  creative ERROR:', JSON.stringify(creative.error)); continue; }
  console.log('  creative:', creative.id);

  const newAd = await apiPost(`${accountId}/ads`, {
    name: ad.name,
    adset_id: ad.adset,
    creative: { creative_id: creative.id },
    status: 'ACTIVE',
  });
  console.log('  ad:', JSON.stringify(newAd));
}

console.log('\nDone.');
