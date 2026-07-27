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

const ASSETS_DIR = 'D:/SkiLine/Ads - Skiline - Surat - Leaders/assets/Phase 3';

const ADS = [
  {
    imagePath: path.join(ASSETS_DIR, 'Surat 4.png'),
    imageName: 'surat-identity-malik.png',
    adName: 'Surat – P4 – Identity (Naukar mat raho)',
    creativeName: 'Surat – P4 – Identity Creative',
    message: `Surat mein har koi kuch na kuch apna chala raha hai.

Textile ka kaam. Diamond ka unit. Ek shop. Kuch apna.

Aap bhi jaante hain ye feeling — ki kuch apna hona chahiye. Abhi tak nahi hua.

Skiline Surat mein limited business partners select kar raha hai. Sirf unhe jo pehle se logon se connected hain — jinka network strong hai, jinka ek area mein zyada log jaante hain.

Naukri chhodne ki zaroorat nahi. Bas apna kuch add karna hai.

Apply karein. Hum batayenge aap qualify karte hain ya nahi.`,
    headline: 'Apna network. Apna business. Surat mein.',
    description: 'Free hai. Investment nahi. Sirf ek conversation.',
  },
  {
    imagePath: path.join(ASSETS_DIR, 'Surat 5.png'),
    imageName: 'surat-scarcity-10spots.png',
    adName: 'Surat – P4 – Scarcity (Sirf 10 Jagah)',
    creativeName: 'Surat – P4 – Scarcity Creative',
    message: `Ye job nahi hai.

Skiline Surat mein sirf 10 business partners select kar raha hai — log jo pehle se apne area mein jaane jaate hain, jinke paas strong connections hain.

Aapko kuch chhodni nahi. Invest kuch nahi karna. Sirf apna existing network use karna hai aur hum aapko baaki guide karenge.

Surat ke liye spots limit hain. Jo pehle apply karega, unhe priority milegi.`,
    headline: 'Sirf 10 spots — Surat ke liye',
    description: 'Strong network hai? Apply karein abhi.',
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

// Get page access token first
console.log('Fetching page access token...');
const pageData = await fetch(`https://graph.facebook.com/v19.0/${pageId}?fields=access_token&access_token=${token}`).then(r => r.json());
if (pageData.error) { console.log('Page token ERROR:', JSON.stringify(pageData.error)); process.exit(1); }
const pageToken = pageData.access_token;
console.log('  Got page token.');

// Get Surat v2 form ID
console.log('Fetching Surat lead form ID...');
const formsRes = await fetch(
  `https://graph.facebook.com/v19.0/${pageId}/leadgen_forms?fields=id,name&limit=50&access_token=${pageToken}`
);
const formsData = await formsRes.json();
if (formsData.error) { console.log('Forms ERROR:', JSON.stringify(formsData.error)); process.exit(1); }

const suratForm = formsData.data.find(f => f.name.toLowerCase().includes('surat') && f.name.toLowerCase().includes('v2'));
if (!suratForm) {
  console.log('Available forms:', formsData.data.map(f => f.name).join('\n'));
  console.log('ERROR: Surat v2 form not found');
  process.exit(1);
}
console.log(`  Form: "${suratForm.name}" → ID: ${suratForm.id}`);

for (const ad of ADS) {
  console.log(`\n── Launching: ${ad.adName} ──`);

  // Step 1: Upload image
  console.log('  Uploading image...');
  const fileBuffer = fs.readFileSync(ad.imagePath);
  const blob = new Blob([fileBuffer], { type: 'image/png' });
  const form = new FormData();
  form.append('filename', blob, ad.imageName);
  form.append('access_token', token);

  const uploadRes = await fetch(`https://graph.facebook.com/v19.0/${accountId}/adimages`, {
    method: 'POST',
    body: form,
  });
  const uploadData = await uploadRes.json();
  if (!uploadData.images) { console.log('  Upload ERROR:', JSON.stringify(uploadData)); continue; }
  const imageHash = Object.values(uploadData.images)[0].hash;
  console.log(`  Image hash: ${imageHash}`);

  // Step 2: Create creative
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
        call_to_action: {
          type: 'APPLY_NOW',
          value: { lead_gen_form_id: suratForm.id },
        },
      },
    },
  });
  if (creative.error) { console.log('  Creative ERROR:', JSON.stringify(creative.error)); continue; }
  console.log(`  Creative ID: ${creative.id}`);

  // Step 3: Create ad
  console.log('  Creating ad...');
  const result = await apiPost(`${accountId}/ads`, {
    name: ad.adName,
    adset_id: ADSET_ID,
    creative: { creative_id: creative.id },
    status: 'ACTIVE',
  });
  if (result.error) { console.log('  Ad ERROR:', JSON.stringify(result.error)); continue; }
  console.log(`  Ad ID: ${result.id} — ACTIVE`);
}

console.log('\nDone. Check Meta Ads Manager for approval status.');
