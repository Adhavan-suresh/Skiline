import 'dotenv/config';

const token = process.env.META_TOKEN;
const accountId = process.env.AD_ACCOUNT_ID;
const pageId = process.env.PAGE_ID;

const ADSET_ID = '120248587937010744';
const FORM_ID = '1505383314327489';
const IMAGE_HASH = '603d504f51686190d82fcad54ec3fce6'; // same template visual
const EXACT_CLONE_AD_ID = '120250379486500744'; // pause this

async function apiPost(endpoint, body) {
  const res = await fetch(`https://graph.facebook.com/v19.0/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, access_token: token }),
  });
  return res.json();
}

// Step 1: Pause the exact clone
console.log('Pausing exact clone...');
const pause = await apiPost(EXACT_CLONE_AD_ID, { status: 'PAUSED' });
console.log('  Paused:', JSON.stringify(pause));

// Step 2: Create variation creative — same template, minor copy changes
console.log('Creating variation creative...');
const creative = await apiPost(`${accountId}/adcreatives`, {
  name: 'Housewives – Back to Work (Variation) – Creative',
  object_story_spec: {
    page_id: pageId,
    link_data: {
      link: 'https://skiline.in/',
      image_hash: IMAGE_HASH,
      message: "Years of running a household is years of budgeting, planning, and solving problems under pressure. Skiline is hiring in Chennai for homemakers ready to start earning again. Your time at home wasn't a gap - it's exactly the experience we're looking for. All experience levels welcome. Full training provided. ₹100-200/day based on role. Apply in 2 minutes.",
      name: 'The Skills You Built at Home Have Real Value',
      call_to_action: {
        type: 'APPLY_NOW',
        value: { lead_gen_form_id: FORM_ID },
      },
    },
  },
});
if (creative.error) { console.log('Creative ERROR:', JSON.stringify(creative.error)); process.exit(1); }
console.log('  Creative ID:', creative.id);

// Step 3: Launch variation ad
console.log('Creating variation ad...');
const ad = await apiPost(`${accountId}/ads`, {
  name: 'Housewives – Back to Work (Variation)',
  adset_id: ADSET_ID,
  creative: { creative_id: creative.id },
  status: 'ACTIVE',
});
if (ad.error) { console.log('Ad ERROR:', JSON.stringify(ad.error)); process.exit(1); }
console.log('  Ad ID:', ad.id, '— ACTIVE');
console.log('\nDone. Variation live, exact clone paused.');
