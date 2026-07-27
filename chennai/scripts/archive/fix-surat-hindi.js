import 'dotenv/config';
import fs from 'fs';

const token = process.env.META_TOKEN;
const accountId = process.env.AD_ACCOUNT_ID;
const pageId = process.env.PAGE_ID;

const ADSET_ID = '120248594655350744';
const FORM_ID = '1049608980975533';
const AD_ID = '120250099056860744';
const IMAGE_PATH = 'D:/SkiLine/Ads - Skiline - Surat - Leaders/assets/Phase 3/Surat 3.png';

async function apiPost(endpoint, body) {
  const res = await fetch(`https://graph.facebook.com/v19.0/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, access_token: token }),
  });
  return res.json();
}

// Step 1: Upload new image
console.log('Uploading fixed image...');
const fileBuffer = fs.readFileSync(IMAGE_PATH);
const blob = new Blob([fileBuffer], { type: 'image/png' });
const form = new FormData();
form.append('filename', blob, 'surat-hindi-fixed.png');
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

// Step 2: Create new creative
console.log('Creating new creative...');
const creative = await apiPost(`${accountId}/adcreatives`, {
  name: 'Surat – P3 – Hindi (Naukri Rahe) – Fixed Creative',
  object_story_spec: {
    page_id: pageId,
    link_data: {
      link: 'https://skiline.in/',
      image_hash: imageHash,
      message: `आपके पास पहले से एक काम है।
Skiline उसे छोड़ने के लिए नहीं कह रहा।

बस अपने समय में, अपनी शर्तों पर - Surat में Skiline के साथ काम करें।

अपने contacts को सही opportunity से connect करें। जब वो join करें, आप earn करें।

कोई target नहीं। कोई investment नहीं। कोई selling नहीं।

Surat में limited spots बचे हैं - 2 मिनट में apply करें।`,
      name: '2 घंटे। आपकी शर्तें। Skiline के साथ।',
      description: 'Surat में Skiline business partners चाहिए। आज ही apply करें।',
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

// Step 3: Update ad with new creative and set ACTIVE
console.log('Updating ad...');
const update = await apiPost(AD_ID, {
  creative: { creative_id: creative.id },
  status: 'ACTIVE',
});

if (update.error) {
  console.log('Update ERROR:', JSON.stringify(update.error));
  process.exit(1);
}

console.log('  Ad updated:', update.success);
console.log('\nDone. Hindi ad resubmitted — check approval in ~30 mins.');
