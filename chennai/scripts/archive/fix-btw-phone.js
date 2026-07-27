import 'dotenv/config';
import fs from 'fs';

const token = process.env.META_TOKEN;
const accountId = process.env.AD_ACCOUNT_ID;
const pageId = process.env.PAGE_ID;
const FORM_ID = '1505383314327489';
const IMAGE_PATH = 'D:/SkiLine/Ads - Skiline - Chennai - Agents/assets/Phase 2/Housewives 2.jpeg';

const ADS = [
  {
    id: '120249874343940744',
    creativeName: 'HW Back to Work (2nd ad) – Fixed Phone – Creative',
    name: 'Your Motherhood Built Management Skills',
    message: "Three years managing a home means three years of project management, budgeting, and crisis-solving. Skiline is hiring in Chennai for homemakers ready to restart earning. Your experience isn't a gap. It's your superpower. All experience levels. Full training provided. ₹100-200/day based on role. Apply in 2 minutes.",
  },
  {
    id: '120250380221290744',
    creativeName: 'HW Back to Work (Copy V2) – Fixed Phone – Creative',
    name: 'Managing a house is harder than it looks',
    message: "A family is the hardest project to handle, and you've been doing it for free. Budgeting, crisis-solving, and chaos is your everyday. Skiline is hiring housewives in Chennai who are ready to use those skills to earn money. Your experience isn't a gap, it's what sets you apart. All experience levels, 2 weeks of training. ₹100-200/day based on role. Apply now.",
  },
];

async function apiPost(endpoint, body) {
  const res = await fetch(`https://graph.facebook.com/v19.0/${endpoint}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, access_token: token }),
  });
  return res.json();
}

// Upload corrected image once (reuse hash for both ads)
console.log('Uploading corrected image...');
const buf = fs.readFileSync(IMAGE_PATH);
const form = new FormData();
form.append('filename', new Blob([buf], { type: 'image/jpeg' }), 'hw-btw-fixed-phone.jpeg');
form.append('access_token', token);
const up = await (await fetch(`https://graph.facebook.com/v19.0/${accountId}/adimages`, { method: 'POST', body: form })).json();
if (!up.images) { console.log('Upload ERROR:', JSON.stringify(up)); process.exit(1); }
const imageHash = Object.values(up.images)[0].hash;
console.log('  New image hash:', imageHash);

for (const ad of ADS) {
  console.log(`\n── ${ad.name} (ad ${ad.id}) ──`);
  const creative = await apiPost(`${accountId}/adcreatives`, {
    name: ad.creativeName,
    object_story_spec: {
      page_id: pageId,
      link_data: {
        link: 'https://skiline.in/',
        image_hash: imageHash,
        message: ad.message,
        name: ad.name,
        call_to_action: { type: 'APPLY_NOW', value: { lead_gen_form_id: FORM_ID } },
      },
    },
  });
  if (creative.error) { console.log('  Creative ERROR:', JSON.stringify(creative.error)); continue; }
  console.log('  New creative ID:', creative.id);
  const upd = await apiPost(ad.id, { creative: { creative_id: creative.id } });
  if (upd.error) { console.log('  Ad update ERROR:', JSON.stringify(upd.error)); continue; }
  console.log('  Ad updated:', JSON.stringify(upd));
}
console.log('\nDone. Both Back to Work ads now use the corrected-phone image.');
