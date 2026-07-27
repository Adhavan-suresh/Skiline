import 'dotenv/config';
const token = process.env.META_TOKEN;
const AD_ID = '120248594656420744'; // Skiline – Leaders – Surat

const res = await fetch(`https://graph.facebook.com/v19.0/${AD_ID}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ status: 'ACTIVE', access_token: token }),
});
const data = await res.json();
if (data.error) { console.log('ERROR:', JSON.stringify(data.error)); process.exit(1); }
console.log('Skiline – Leaders – Surat reactivated:', JSON.stringify(data));
