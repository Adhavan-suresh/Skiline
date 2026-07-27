import 'dotenv/config';
const token = process.env.META_TOKEN;
const accountId = process.env.AD_ACCOUNT_ID;

async function get(url) {
  const res = await fetch(url);
  return res.json();
}

// 1. Campaigns
console.log('=== CAMPAIGNS ===');
const camps = await get(`https://graph.facebook.com/v19.0/${accountId}/campaigns?fields=name,effective_status,issues_info,configured_status&limit=50&access_token=${token}`);
for (const c of (camps.data || [])) {
  console.log(`\n[${c.effective_status}] ${c.name}`);
  if (c.issues_info) console.log('  ISSUES:', JSON.stringify(c.issues_info));
}

// 2. Ad sets
console.log('\n\n=== AD SETS ===');
const adsets = await get(`https://graph.facebook.com/v19.0/${accountId}/adsets?fields=name,effective_status,issues_info,configured_status&limit=50&access_token=${token}`);
for (const a of (adsets.data || [])) {
  console.log(`\n[${a.effective_status}] ${a.name}`);
  if (a.issues_info) console.log('  ISSUES:', JSON.stringify(a.issues_info));
}

// 3. Ads — with delivery issues
console.log('\n\n=== ADS ===');
const ads = await get(`https://graph.facebook.com/v19.0/${accountId}/ads?fields=name,effective_status,issues_info,configured_status&limit=100&access_token=${token}`);
for (const a of (ads.data || [])) {
  const flag = (a.effective_status !== 'ACTIVE' && a.effective_status !== 'PAUSED') ? ' <<<' : '';
  console.log(`[${a.effective_status}]${flag} ${a.name}`);
  if (a.issues_info) console.log('  ISSUES:', JSON.stringify(a.issues_info, null, 2));
}
