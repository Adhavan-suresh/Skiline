import 'dotenv/config';

const token = process.env.META_TOKEN;
const accountId = process.env.AD_ACCOUNT_ID;
const pageId = process.env.PAGE_ID;

const ADSET_ID = '120248587937010744';
const FORM_ID = '1505383314327489';
const IMAGE_HASH = '603d504f51686190d82fcad54ec3fce6'; // proven Back to Work visual

async function apiPost(endpoint, body) {
  const res = await fetch(`https://graph.facebook.com/v19.0/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, access_token: token }),
  });
  return res.json();
}

console.log('Creating creative (new copy, same image)...');
const creative = await apiPost(`${accountId}/adcreatives`, {
  name: 'Housewives – Back to Work (Copy V2 - Hardest Project) – Creative',
  object_story_spec: {
    page_id: pageId,
    link_data: {
      link: 'https://skiline.in/',
      image_hash: IMAGE_HASH,
      message: "A family is the hardest project to handle, and you've been doing it for free. Budgeting, crisis-solving, and chaos is your everyday. Skiline is hiring housewives in Chennai who are ready to use those skills to earn money. Your experience isn't a gap, it's what sets you apart. All experience levels, 2 weeks of training. ₹100-200/day based on role. Apply now.",
      name: 'Managing a house is harder than it looks',
      call_to_action: {
        type: 'APPLY_NOW',
        value: { lead_gen_form_id: FORM_ID },
      },
    },
  },
});
if (creative.error) { console.log('Creative ERROR:', JSON.stringify(creative.error)); process.exit(1); }
console.log('  Creative ID:', creative.id);

console.log('Creating ad...');
const ad = await apiPost(`${accountId}/ads`, {
  name: 'Housewives – Back to Work (Copy V2 - Hardest Project)',
  adset_id: ADSET_ID,
  creative: { creative_id: creative.id },
  status: 'ACTIVE',
});
if (ad.error) { console.log('Ad ERROR:', JSON.stringify(ad.error)); process.exit(1); }
console.log('  Ad ID:', ad.id, '— ACTIVE');
console.log('\nDone. New copy variation live in HW adset.');
