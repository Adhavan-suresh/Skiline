import 'dotenv/config';
import fs from 'fs';

const token = process.env.META_TOKEN;
const accountId = process.env.AD_ACCOUNT_ID;
const pageId = process.env.PAGE_ID;

const ADS = [
  {
    imagePath: 'D:/SkiLine/Ads - Skiline - Chennai - Agents/assets/Phase 2/Housewives 4.png',
    imageName: 'hw-financial-advisor.png',
    adsetId: '120248587937010744',
    formId: '1505383314327489',
    adName: 'Housewives – Financial Advisor',
    creativeName: 'Housewives – Financial Advisor – Creative',
    headline: 'Become a Financial Advisor From Home',
    description: 'Flexible hours. Work from home. Full training.',
    message: `You already manage your home's money, plan every month, and know how to earn people's trust. That is exactly what a good financial advisor does.

Skiline is helping housewives in Chennai train and certify as financial advisors. Flexible hours, work from home, full training provided, no experience needed.

Turn the skills you already have into an income of your own. Apply now.`,
  },
  {
    imagePath: 'D:/SkiLine/Ads - Skiline - Chennai - Agents/assets/Phase 2/Retirees 4.png',
    imageName: 'retirees-financial-advisor.png',
    adsetId: '120248587937540744',
    formId: '2800617100297668',
    adName: 'Retirees – Financial Advisor',
    creativeName: 'Retirees – Financial Advisor – Creative',
    headline: 'Your Experience Makes You the Advisor People Trust',
    description: 'Work at your pace. Full training. Limited seats.',
    message: `Decades of experience. A lifetime of relationships. People already come to you for advice, so make it your second career.

Skiline is helping retired professionals in Chennai train and certify as financial advisors. Flexible hours, work at your own pace, full training and support.

A limited number of advisors are selected each month. Apply now.`,
  },
];

async function apiPost(endpoint, body) {
  const res = await fetch(`https://graph.facebook.com/v19.0/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, access_token: token }),
  });
  return res.json();
}

for (const ad of ADS) {
  console.log(`\n── ${ad.adName} ──`);

  // Upload image
  console.log('  Uploading image...');
  const fileBuffer = fs.readFileSync(ad.imagePath);
  const blob = new Blob([fileBuffer], { type: 'image/png' });
  const form = new FormData();
  form.append('filename', blob, ad.imageName);
  form.append('access_token', token);
  const uploadRes = await fetch(`https://graph.facebook.com/v19.0/${accountId}/adimages`, { method: 'POST', body: form });
  const uploadData = await uploadRes.json();
  if (!uploadData.images) { console.log('  Upload ERROR:', JSON.stringify(uploadData)); continue; }
  const imageHash = Object.values(uploadData.images)[0].hash;
  console.log('  Image hash:', imageHash);

  // Creative
  console.log('  Creating creative...');
  const creative = await apiPost(`${accountId}/adcreatives`, {
    name: ad.creativeName,
    object_story_spec: {
      page_id: pageId,
      link_data: {
        link: 'https://skiline.in/',
        image_hash: imageHash,
        message: ad.message,
        name: ad.headline,
        description: ad.description,
        call_to_action: { type: 'APPLY_NOW', value: { lead_gen_form_id: ad.formId } },
      },
    },
  });
  if (creative.error) { console.log('  Creative ERROR:', JSON.stringify(creative.error)); continue; }
  console.log('  Creative ID:', creative.id);

  // Ad
  console.log('  Creating ad...');
  const result = await apiPost(`${accountId}/ads`, {
    name: ad.adName,
    adset_id: ad.adsetId,
    creative: { creative_id: creative.id },
    status: 'ACTIVE',
  });
  if (result.error) { console.log('  Ad ERROR:', JSON.stringify(result.error)); continue; }
  console.log('  Ad ID:', result.id, '— ACTIVE');
}

console.log('\nDone. Both advisor ads live. Check Ads Manager for approval.');
