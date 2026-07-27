import 'dotenv/config';
const token = process.env.META_TOKEN;
const accountId = process.env.AD_ACCOUNT_ID;

// Check all Surat ads — status + effective status + review feedback
const res = await fetch(
  `https://graph.facebook.com/v19.0/${accountId}/ads?` +
  `fields=name,status,effective_status,adset_id` +
  `&limit=20&access_token=${token}`
);
const data = await res.json();

// Also fetch the specific Hindi ad directly
const hindiRes = await fetch(
  `https://graph.facebook.com/v19.0/120250099056860744?` +
  `fields=name,status,effective_status,creative` +
  `&access_token=${token}`
);
const hindi = await hindiRes.json();

console.log('=== Hindi Ad (direct lookup) ===');
console.log(JSON.stringify(hindi, null, 2));

console.log('\n=== All P3 Surat Ads ===');
if (data.error) { console.log('ERROR:', JSON.stringify(data.error)); }
else console.log(JSON.stringify(data.data, null, 2));
