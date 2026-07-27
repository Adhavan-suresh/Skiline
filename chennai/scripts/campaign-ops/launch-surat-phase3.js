import 'dotenv/config';

const token = process.env.META_TOKEN;
const accountId = process.env.AD_ACCOUNT_ID;
const pageId = process.env.PAGE_ID;

const ADSET_ID = '120248594655350744';
const FORM_ID = '1049608980975533';

const IMAGE_HASHES = {
  testimonial: '12af93cba75882ea2cf85ca024aecc3d',
  network:     '979d95ccaddc15352a310edec12cb18a',
  hindi:       '019730975ae4fd0d1c76f12739bb056c',
};

const ADS = [
  {
    key: 'testimonial',
    name: 'Surat – P3 – Testimonial (Maganlal)',
    message: `Maganlal worked for the textile industry in Surat for 8 years.

He knew his city. He knew his people. He knew how to get things done.

Today he's a Skiline business partner - connecting the right people to the right opportunity. Flexible hours. No targets. No commute.

Skiline is selecting business partners in Surat. If you know your city and want to earn today, apply now.`,
    headline: 'Your Story Could Start Here',
    description: 'Flexible hours. No investment. Select spots available in Surat.',
  },
  {
    key: 'network',
    name: 'Surat – P3 – Network (Contacts)',
    message: `You've spent years building a life in Surat.

Every WhatsApp group. Every get-together. Every contact on your phone.

That network has value. Skiline pays you to use it.

Skiline is looking for business partners across Surat. Is your network strong enough?`,
    headline: 'Your Network Is the Business',
    description: 'Partner with Skiline. No investment. Earn on every connection you make.',
  },
  {
    key: 'hindi',
    name: 'Surat – P3 – Hindi (Naukri Rahe)',
    message: `आपके पास पहले से एक काम है।
Skiline उसे छोड़ने के लिए नहीं कह रहा।

बस अपने समय में, अपनी शर्तों पर - Surat में Skiline के साथ काम करें।

अपने contacts को सही opportunity से connect करें। जब वो join करें, आप earn करें।

कोई target नहीं। कोई investment नहीं। कोई selling नहीं।

Surat में limited spots बचे हैं - 2 मिनट में apply करें।`,
    headline: '2 घंटे। आपकी शर्तें। Skiline के साथ।',
    description: 'Surat में Skiline business partners चाहिए। आज ही apply करें।',
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

// Step 1: Double Surat budget to ₹200/day
console.log('Updating Surat budget to ₹200/day...');
const budgetRes = await apiPost(ADSET_ID, { daily_budget: 20000 });
if (budgetRes.success) {
  console.log('  Budget updated: ₹200/day');
} else {
  console.log('  Budget update ERROR:', JSON.stringify(budgetRes.error));
}

// Step 2: Create creatives and ads
for (const ad of ADS) {
  console.log(`\nCreating: ${ad.name}`);

  const creative = await apiPost(`${accountId}/adcreatives`, {
    name: ad.name + ' – Creative',
    object_story_spec: {
      page_id: pageId,
      link_data: {
        link: 'https://skiline.in/',
        image_hash: IMAGE_HASHES[ad.key],
        message: ad.message,
        name: ad.headline,
        description: ad.description,
        call_to_action: {
          type: 'APPLY_NOW',
          value: { lead_gen_form_id: FORM_ID },
        },
      },
    },
  });

  if (creative.error) {
    console.log(`  Creative ERROR:`, JSON.stringify(creative.error));
    continue;
  }
  console.log(`  Creative ID: ${creative.id}`);

  const adResult = await apiPost(`${accountId}/ads`, {
    name: ad.name,
    adset_id: ADSET_ID,
    creative: { creative_id: creative.id },
    status: 'PAUSED',
  });

  if (adResult.error) {
    console.log(`  Ad ERROR:`, JSON.stringify(adResult.error));
  } else {
    console.log(`  Ad ID: ${adResult.id} — PAUSED (review before activating)`);
  }
}

console.log('\nDone. Review ads in Meta Ads Manager, then activate.');
