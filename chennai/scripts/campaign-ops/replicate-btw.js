import 'dotenv/config';

const token = process.env.META_TOKEN;
const accountId = process.env.AD_ACCOUNT_ID;
const pageId = process.env.PAGE_ID;

const ADSET_ID = '120248587937010744';
const FORM_ID = '1505383314327489';
const IMAGE_HASH = '603d504f51686190d82fcad54ec3fce6'; // reuse existing Back to Work image

async function apiPost(endpoint, body) {
  const res = await fetch(`https://graph.facebook.com/v19.0/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, access_token: token }),
  });
  return res.json();
}

// Create fresh creative — identical copy to original Back to Work
console.log('Creating replica creative...');
const creative = await apiPost(`${accountId}/adcreatives`, {
  name: 'Housewives – Back to Work (Replica) – Creative',
  object_story_spec: {
    page_id: pageId,
    link_data: {
      link: 'https://skiline.in/',
      image_hash: IMAGE_HASH,
      message: "Three years managing a home means three years of project management, budgeting, and crisis-solving. Skiline is hiring in Chennai for homemakers ready to restart earning. Your experience isn't a gap. It's your superpower. All experience levels. Full training provided. ₹100-200/day based on role. Apply in 2 minutes.",
      name: 'Your Motherhood Built Management Skills',
      call_to_action: {
        type: 'APPLY_NOW',
        value: { lead_gen_form_id: FORM_ID },
      },
    },
  },
});
if (creative.error) { console.log('Creative ERROR:', JSON.stringify(creative.error)); process.exit(1); }
console.log('  Creative ID:', creative.id);

// Create fresh ad — ACTIVE
console.log('Creating replica ad...');
const ad = await apiPost(`${accountId}/ads`, {
  name: 'Housewives – Back to Work (Replica)',
  adset_id: ADSET_ID,
  creative: { creative_id: creative.id },
  status: 'ACTIVE',
});
if (ad.error) { console.log('Ad ERROR:', JSON.stringify(ad.error)); process.exit(1); }
console.log('  Ad ID:', ad.id, '— ACTIVE');
console.log('\nDone. Fresh Back to Work replica live in HW adset.');
