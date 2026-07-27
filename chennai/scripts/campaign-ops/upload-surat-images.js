import 'dotenv/config';
import fs from 'fs';

const token = process.env.META_TOKEN;
const accountId = process.env.AD_ACCOUNT_ID;

const images = [
  { file: 'D:/SkiLine/Ads - Skiline - Surat - Leaders/assets/Phase 3/surat 1.png', name: 'surat-testimonial' },
  { file: 'D:/SkiLine/Ads - Skiline - Surat - Leaders/assets/Phase 3/surat 2.png', name: 'surat-network' },
  { file: 'D:/SkiLine/Ads - Skiline - Surat - Leaders/assets/Phase 3/surat 3.png', name: 'surat-hindi' },
];

async function uploadImage(filePath, name) {
  const fileBuffer = fs.readFileSync(filePath);
  const blob = new Blob([fileBuffer], { type: 'image/png' });
  const form = new FormData();
  form.append('filename', blob, name + '.png');
  form.append('access_token', token);

  const res = await fetch(`https://graph.facebook.com/v19.0/${accountId}/adimages`, {
    method: 'POST',
    body: form,
  });
  return res.json();
}

const hashes = {};
for (const img of images) {
  console.log(`Uploading ${img.name}...`);
  const result = await uploadImage(img.file, img.name);
  if (result.images) {
    const hash = Object.values(result.images)[0].hash;
    hashes[img.name] = hash;
    console.log(`  ${img.name}: ${hash}`);
  } else {
    console.log(`  ERROR:`, JSON.stringify(result));
  }
}

console.log('\nAll hashes:');
console.log(JSON.stringify(hashes, null, 2));
