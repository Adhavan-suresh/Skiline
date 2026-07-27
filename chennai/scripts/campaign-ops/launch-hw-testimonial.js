import 'dotenv/config';
import fs from 'fs';

const token = process.env.META_TOKEN;
const accountId = process.env.AD_ACCOUNT_ID;
const pageId = process.env.PAGE_ID;

const ADSET_ID = '120248587937010744';
const FORM_ID = '1505383314327489';
const IMAGE_PATH = 'D:/SkiLine/Ads - Skiline - Chennai - Agents/assets/Phase 2/Housewives 3.png';

async function apiPost(endpoint, body) {
  const res = await fetch(`https://graph.facebook.com/v19.0/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, access_token: token }),
  });
  return res.json();
}

// Step 1: Upload image
console.log('Uploading image...');
const fileBuffer = fs.readFileSync(IMAGE_PATH);
const blob = new Blob([fileBuffer], { type: 'image/png' });
const form = new FormData();
form.append('filename', blob, 'hw-testimonial-meenakshi.png');
form.append('access_token', token);

const uploadRes = await fetch(`https://graph.facebook.com/v19.0/${accountId}/adimages`, {
  method: 'POST',
  body: form,
});
const uploadData = await uploadRes.json();

if (!uploadData.images) {
  console.log('Upload ERROR:', JSON.stringify(uploadData));
  process.exit(1);
}

const imageHash = Object.values(uploadData.images)[0].hash;
console.log('  Image hash:', imageHash);

// Step 2: Create creative
console.log('Creating creative...');
const creative = await apiPost(`${accountId}/adcreatives`, {
  name: 'Housewives – Testimonial (Meenakshi) – Creative',
  object_story_spec: {
    page_id: pageId,
    link_data: {
      link: 'https://skiline.in/',
      image_hash: imageHash,
      message: `Meenakshi was a housewife in Chennai for 19 years.

Two kids. A hundred conversations a week. Every neighbour, every parent at school, every person in the building - she knew them.

She never thought that was a skill.

Skiline did.

Today she's a business partner - using the same relationships she always had, to connect the right people to the right opportunity. Flexible timing. No targets. No commute.

Skiline is selecting business partners across Chennai. If you know your neighbourhood and want to do something with your time, apply now.`,
      name: 'Your Network Was Always Your Strength',
      description: 'Flexible timing. No investment. Select spots in Chennai.',
      call_to_action: {
        type: 'APPLY_NOW',
        value: { lead_gen_form_id: FORM_ID },
      },
    },
  },
});

if (creative.error) {
  console.log('Creative ERROR:', JSON.stringify(creative.error));
  process.exit(1);
}
console.log('  Creative ID:', creative.id);

// Step 3: Create ad — ACTIVE
console.log('Creating ad...');
const ad = await apiPost(`${accountId}/ads`, {
  name: 'Housewives – Testimonial (Meenakshi)',
  adset_id: ADSET_ID,
  creative: { creative_id: creative.id },
  status: 'ACTIVE',
});

if (ad.error) {
  console.log('Ad ERROR:', JSON.stringify(ad.error));
  process.exit(1);
}

console.log('  Ad ID:', ad.id);
console.log('\nDone. Ad is ACTIVE — check Meta Ads Manager for approval.');
