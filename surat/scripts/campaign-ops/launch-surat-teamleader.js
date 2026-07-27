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
const IMAGE_PATH = 'D:/SkiLine/Ads - Skiline - Surat - Leaders/assets/Phase 3/Surat 6.jpeg';

async function apiPost(endpoint, body) {
  const res = await fetch(`https://graph.facebook.com/v19.0/${endpoint}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, access_token: token }),
  });
  return res.json();
}

// page token + Surat v2 form
const pageData = await fetch(`https://graph.facebook.com/v19.0/${pageId}?fields=access_token&access_token=${token}`).then(r=>r.json());
if (pageData.error) { console.log('Page token ERROR:', JSON.stringify(pageData.error)); process.exit(1); }
const pageToken = pageData.access_token;
const forms = await fetch(`https://graph.facebook.com/v19.0/${pageId}/leadgen_forms?fields=id,name&limit=50&access_token=${pageToken}`).then(r=>r.json());
const suratForm = forms.data.find(f => f.name.toLowerCase().includes('surat') && f.name.toLowerCase().includes('v2'));
if (!suratForm) { console.log('Surat v2 form not found. Forms:', forms.data.map(f=>f.name)); process.exit(1); }
console.log('Form:', suratForm.name, '→', suratForm.id);

// upload image
console.log('Uploading image...');
const buf = fs.readFileSync(IMAGE_PATH);
const form = new FormData();
form.append('filename', new Blob([buf], { type: 'image/jpeg' }), 'surat-teamleader.jpeg');
form.append('access_token', token);
const up = await (await fetch(`https://graph.facebook.com/v19.0/${accountId}/adimages`, { method:'POST', body: form })).json();
if (!up.images) { console.log('Upload ERROR:', JSON.stringify(up)); process.exit(1); }
const imageHash = Object.values(up.images)[0].hash;
console.log('  hash:', imageHash);

// creative
const creative = await apiPost(`${accountId}/adcreatives`, {
  name: 'Surat – Team Leader (Business) – Creative',
  object_story_spec: {
    page_id: pageId,
    link_data: {
      link: 'https://skiline.in/',
      image_hash: imageHash,
      message: `Din bhar dusron ke liye kaam. Phir bhi apna kuch nahi?

Skiline Surat mein business leaders dhoond raha hai. Ye naukri nahi, apna business hai. Apni team banao, apne boss khud bano, Skiline ki puri guidance ke saath. Surat ke liye sirf 6 slots hain. Abhi apply karo.`,
      name: 'Apni Team Banao. Apna Business Banao.',
      description: 'Apna business. Apni team. 6 slots left.',
      call_to_action: { type: 'APPLY_NOW', value: { lead_gen_form_id: suratForm.id } },
    },
  },
});
if (creative.error) { console.log('Creative ERROR:', JSON.stringify(creative.error)); process.exit(1); }
console.log('  Creative ID:', creative.id);

const ad = await apiPost(`${accountId}/ads`, {
  name: 'Surat – Team Leader (Business)', adset_id: ADSET_ID,
  creative: { creative_id: creative.id }, status: 'ACTIVE',
});
if (ad.error) { console.log('Ad ERROR:', JSON.stringify(ad.error)); process.exit(1); }
console.log('  Ad ID:', ad.id, '— ACTIVE');
console.log('Done. Surat ad #2 live next to Scarcity.');
