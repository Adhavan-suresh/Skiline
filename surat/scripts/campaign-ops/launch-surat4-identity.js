import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const token = process.env.META_TOKEN;
const accountId = process.env.AD_ACCOUNT_ID;
const pageId = process.env.PAGE_ID;

const ADSET_ID = '120248594655350744';
const FORM_ID = '1049608980975533';
const IMAGE_PATH = 'D:/SkiLine/Ads - Skiline - Surat - Leaders/assets/Phase 3/Surat 4.png';

async function apiPost(endpoint, body) {
  const res = await fetch(`https://graph.facebook.com/v19.0/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, access_token: token }),
  });
  return res.json();
}

// Upload image
console.log('Uploading Surat 4 image...');
const fileBuffer = fs.readFileSync(IMAGE_PATH);
const blob = new Blob([fileBuffer], { type: 'image/png' });
const form = new FormData();
form.append('filename', blob, 'surat-identity-malik.png');
form.append('access_token', token);

const uploadRes = await fetch(`https://graph.facebook.com/v19.0/${accountId}/adimages`, {
  method: 'POST',
  body: form,
});
const uploadData = await uploadRes.json();
if (!uploadData.images) { console.log('Upload ERROR:', JSON.stringify(uploadData)); process.exit(1); }
const imageHash = Object.values(uploadData.images)[0].hash;
console.log('  Image hash:', imageHash);

// Create creative
console.log('Creating creative...');
const creative = await apiPost(`${accountId}/adcreatives`, {
  name: 'Surat – P4 – Identity Creative',
  object_story_spec: {
    page_id: pageId,
    link_data: {
      link: 'https://skiline.in/',
      image_hash: imageHash,
      message: `Surat mein har koi kuch na kuch apna chala raha hai.

Textile ka kaam. Diamond ka unit. Ek shop. Kuch apna.

Aap bhi jaante hain ye feeling — ki kuch apna hona chahiye. Abhi tak nahi hua.

Skiline Surat mein limited business partners select kar raha hai. Sirf unhe jo pehle se logon se connected hain — jinka network strong hai, jinka ek area mein zyada log jaante hain.

Naukri chhodne ki zaroorat nahi. Bas apna kuch add karna hai.

Apply karein. Hum batayenge aap qualify karte hain ya nahi.`,
      name: 'Apna network. Apna business. Surat mein.',
      description: 'Free hai. Investment nahi. Sirf ek conversation.',
      call_to_action: {
        type: 'APPLY_NOW',
        value: { lead_gen_form_id: FORM_ID },
      },
    },
  },
});
if (creative.error) { console.log('Creative ERROR:', JSON.stringify(creative.error)); process.exit(1); }
console.log('  Creative ID:', creative.id);

// Create ad
console.log('Creating ad...');
const ad = await apiPost(`${accountId}/ads`, {
  name: 'Surat – P4 – Identity (Naukar mat raho)',
  adset_id: ADSET_ID,
  creative: { creative_id: creative.id },
  status: 'ACTIVE',
});
if (ad.error) { console.log('Ad ERROR:', JSON.stringify(ad.error)); process.exit(1); }
console.log('  Ad ID:', ad.id, '— ACTIVE');
console.log('\nDone.');
