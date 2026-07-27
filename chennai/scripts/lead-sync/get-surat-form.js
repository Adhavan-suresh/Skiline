import 'dotenv/config';
const token = process.env.META_TOKEN;
const pageId = process.env.PAGE_ID;

const res = await fetch(
  `https://graph.facebook.com/v19.0/${pageId}/leadgen_forms?fields=id,name&limit=50&access_token=${token}`
);
const data = await res.json();
if (data.error) { console.log('ERROR:', JSON.stringify(data.error)); process.exit(1); }
const surat = data.data.filter(f => f.name.toLowerCase().includes('surat'));
console.log('Surat forms:');
surat.forEach(f => console.log(`  ${f.id} — ${f.name}`));
