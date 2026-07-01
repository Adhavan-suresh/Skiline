import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const TOKEN = process.env.META_TOKEN;
const ACCOUNT = process.env.AD_ACCOUNT_ID;
const PAGE_ID = process.env.PAGE_ID;

// Downloaded locally via PowerShell (postimg blocked from Node.js)
const HW_IMAGE  = path.join(__dirname, '..', 'output', 'Housewives-2.png');
const RET_IMAGE = path.join(__dirname, '..', 'output', 'Retirees-2.png');

// m-dashes removed per user instruction
const ADS = [
  {
    adsetId:    '120248587937010744',
    label:      'Housewives – Back to Work (2nd ad)',
    imageHash:  '603d504f51686190d82fcad54ec3fce6', // already uploaded
    title:      'Your Motherhood Built Management Skills',
    body:       'Three years managing a home means three years of project management, budgeting, and crisis-solving. Skiline is hiring in Chennai for homemakers ready to restart earning. Your experience isn\'t a gap. It\'s your superpower. All experience levels. Full training provided. ₹100-200/day based on role. Apply in 2 minutes.',
    cta:        'APPLY_NOW',
    leadFormId: '1505383314327489',
  },
  {
    adsetId:    '120248587937540744',
    label:      'Retirees – Retired Not Done (2nd ad)',
    imageHash:  '362259311772f3cba568e4533975feb0', // already uploaded
    title:      'Retired, Not Done',
    body:       'Retirement is a chapter, not the end of the story. Your years of experience, judgment, and discipline are exactly what Skiline values. Flexible roles built around your life, no pressure, no rigid schedules. Meaningful work at your pace. Apply now.',
    cta:        'APPLY_NOW',
    leadFormId: '2800617100297668',
  },
];

async function get(url) {
  const res = await fetch(url);
  return res.json();
}

async function post(endpoint, params) {
  const body = new URLSearchParams({ ...params, access_token: TOKEN });
  const res = await fetch(`https://graph.facebook.com/v19.0/${endpoint}`, {
    method: 'POST', body,
  });
  return res.json();
}

// Get lead form ID from existing creative
async function getLeadFormId(creativeId) {
  const data = await get(
    `https://graph.facebook.com/v19.0/${creativeId}?fields=object_story_spec&access_token=${TOKEN}`
  );
  const formId = data?.object_story_spec?.link_data?.call_to_action?.value?.lead_gen_form_id;
  return formId;
}

// Read local file and upload as multipart
async function uploadImage(localPath) {
  const { readFileSync } = await import('fs');
  const buffer = readFileSync(localPath);
  console.log(`  Read ${buffer.length} bytes from ${path.basename(localPath)}`);

  const boundary = 'boundary' + Date.now();
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="access_token"\r\n\r\n${TOKEN}\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="filename"; filename="creative.png"\r\nContent-Type: image/png\r\n\r\n`),
    buffer,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);

  const res = await fetch(`https://graph.facebook.com/v19.0/${ACCOUNT}/adimages`, {
    method: 'POST',
    headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
    body,
  });
  const json = await res.json();
  const images = json?.images;
  if (!images) return { error: json };
  const key = Object.keys(images)[0];
  return { hash: images[key].hash, url: images[key].url };
}

// Create lead gen ad creative
async function createCreative(label, title, body, imageHash, cta, leadFormId) {
  const objectStorySpec = {
    page_id: PAGE_ID,
    link_data: {
      image_hash: imageHash,
      message: body,
      name: title,
      link: 'https://skiline.in/',
      call_to_action: {
        type: cta,
        value: { lead_gen_form_id: leadFormId },
      },
    },
  };

  const result = await post(`${ACCOUNT}/adcreatives`, {
    name: label,
    object_story_spec: JSON.stringify(objectStorySpec),
  });
  return result;
}

// Create ad in ad set
async function createAd(adsetId, label, creativeId) {
  const result = await post(`${ACCOUNT}/ads`, {
    name: label,
    adset_id: adsetId,
    creative: JSON.stringify({ creative_id: creativeId }),
    status: 'PAUSED', // keep paused — user will review before going live
  });
  return result;
}

// ── Main ─────────────────────────────────────────────────────────────────────

for (const ad of ADS) {
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`Creating: ${ad.label}`);
  console.log(`Image hash: ${ad.imageHash} (pre-uploaded)`);
  console.log(`Lead form ID: ${ad.leadFormId}`);

  // 1. Create creative (images already uploaded, form IDs already known)
  const creative = await createCreative(ad.label, ad.title, ad.body, ad.imageHash, ad.cta, ad.leadFormId);
  if (creative.error) { console.error('Creative failed:', JSON.stringify(creative.error)); continue; }
  console.log(`Creative ID: ${creative.id}`);

  // 2. Create ad (PAUSED — user reviews before going live)
  const newAd = await createAd(ad.adsetId, ad.label, creative.id);
  if (newAd.error) { console.error('Ad creation failed:', JSON.stringify(newAd.error)); continue; }
  console.log(`Ad ID: ${newAd.id} — status: PAUSED`);
}

console.log('\nDone. Both ads created as PAUSED. Review in Ads Manager before going live.');
