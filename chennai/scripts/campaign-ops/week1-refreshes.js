import 'dotenv/config';

const token = process.env.META_TOKEN;
const accountId = process.env.AD_ACCOUNT_ID;
const pageId = process.env.PAGE_ID;

const ADS = [
  {
    adsetId: '120248587937010744',
    formId: '1505383314327489',
    imageHash: '101d9d46ee8707e31002042c8e9e0a51', // corrected-phone Back to Work image
    adName: 'Housewives – Two Hours (W1 refresh)',
    creativeName: 'HW – Two Hours side-income – Creative',
    name: 'Two hours a day can bring in an income',
    message: "You do not need to leave the house or give up your day. A few hours is enough to start earning with Skiline. We are hiring homemakers across Chennai for flexible roles that fit around your family. All experience levels, full training provided. ₹100-200/day based on role. Apply now.",
    description: 'Flexible hours. Work from home. Full training.',
  },
  {
    adsetId: '120248587937540744',
    formId: '2800617100297668',
    imageHash: '0c043107478d92aa799925754f60679a', // corrected-phone RND image
    adName: 'Retirees – Experience Never Retires (W1 refresh)',
    creativeName: 'Retirees – Experience Never Retires – Creative',
    name: 'Experience Never Retires',
    message: "Your decades of work built judgment and discipline that most people never gain. Skiline is hiring experienced professionals across Chennai for flexible roles that respect your time. Work at your own pace, no rigid schedules, full support. Put your experience back to work. Apply now.",
    description: 'Work at your pace. Full support. Flexible roles.',
  },
];

async function apiPost(endpoint, body) {
  const res = await fetch(`https://graph.facebook.com/v19.0/${endpoint}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, access_token: token }),
  });
  return res.json();
}

for (const ad of ADS) {
  console.log(`\n── ${ad.adName} ──`);
  const creative = await apiPost(`${accountId}/adcreatives`, {
    name: ad.creativeName,
    object_story_spec: {
      page_id: pageId,
      link_data: {
        link: 'https://skiline.in/',
        image_hash: ad.imageHash,
        message: ad.message,
        name: ad.name,
        description: ad.description,
        call_to_action: { type: 'APPLY_NOW', value: { lead_gen_form_id: ad.formId } },
      },
    },
  });
  if (creative.error) { console.log('  Creative ERROR:', JSON.stringify(creative.error)); continue; }
  console.log('  Creative ID:', creative.id);
  const result = await apiPost(`${accountId}/ads`, {
    name: ad.adName, adset_id: ad.adsetId,
    creative: { creative_id: creative.id }, status: 'ACTIVE',
  });
  if (result.error) { console.log('  Ad ERROR:', JSON.stringify(result.error)); continue; }
  console.log('  Ad ID:', result.id, '— ACTIVE');
}
console.log('\nDone. Week 1 refreshes live.');
