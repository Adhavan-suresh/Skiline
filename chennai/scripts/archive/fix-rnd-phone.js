import 'dotenv/config';
import fs from 'fs';

const token = process.env.META_TOKEN;
const accountId = process.env.AD_ACCOUNT_ID;
const pageId = process.env.PAGE_ID;

const AD_ID = '120249874344420744';
const FORM_ID = '2800617100297668';
const IMAGE_PATH = 'D:/SkiLine/Ads - Skiline - Chennai - Agents/assets/Phase 2/Retirees 2.png';

async function apiPost(endpoint, body) {
  const res = await fetch(`https://graph.facebook.com/v19.0/${endpoint}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, access_token: token }),
  });
  return res.json();
}

// 1. Upload corrected image
console.log('Uploading corrected image...');
const buf = fs.readFileSync(IMAGE_PATH);
const form = new FormData();
form.append('filename', new Blob([buf], { type: 'image/png' }), 'retirees-rnd-fixed-phone.png');
form.append('access_token', token);
const up = await (await fetch(`https://graph.facebook.com/v19.0/${accountId}/adimages`, { method: 'POST', body: form })).json();
if (!up.images) { console.log('Upload ERROR:', JSON.stringify(up)); process.exit(1); }
const imageHash = Object.values(up.images)[0].hash;
console.log('  New image hash:', imageHash);

// 2. New creative — identical copy, new image
console.log('Creating new creative...');
const creative = await apiPost(`${accountId}/adcreatives`, {
  name: 'Retirees – Retired Not Done (2nd ad) – Fixed Phone – Creative',
  object_story_spec: {
    page_id: pageId,
    link_data: {
      link: 'https://skiline.in/',
      image_hash: imageHash,
      message: "Retirement is a chapter, not the end of the story. Your years of experience, judgment, and discipline are exactly what Skiline values. Flexible roles built around your life, no pressure, no rigid schedules. Meaningful work at your pace. Apply now.",
      name: 'Retired, Not Done',
      call_to_action: { type: 'APPLY_NOW', value: { lead_gen_form_id: FORM_ID } },
    },
  },
});
if (creative.error) { console.log('Creative ERROR:', JSON.stringify(creative.error)); process.exit(1); }
console.log('  New creative ID:', creative.id);

// 3. Swap creative onto the live ad (in place)
console.log('Updating live ad...');
const upd = await apiPost(AD_ID, { creative: { creative_id: creative.id } });
if (upd.error) { console.log('Ad update ERROR:', JSON.stringify(upd.error)); process.exit(1); }
console.log('  Ad updated:', JSON.stringify(upd));
console.log('\nDone. RND now uses the corrected-phone image. Goes back into review.');
