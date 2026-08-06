/**
 * De-risk the Surat ad set (2026-08-02).
 *
 * "Surat – P5 – Trust Confession (Gujarati)" is the account's best performer
 * (₹14.05 CPL, 33 leads/7d) but it is a policy time-bomb:
 *   - headline is literally "ઝીરો ઈન્વેસ્ટમેન્ટ. પૂરી ટ્રેનિંગ."
 *   - body quotes "ઝીરો ઈન્વેસ્ટમેન્ટ, અમર્યાદિત કમાણી" (zero investment,
 *     unlimited income) and "ઘરે બેઠા કમાણી" (earn from home). It quotes those
 *     phrases in order to REJECT them, but an automated classifier cannot read
 *     irony — it just sees the banned phrases.
 *   - the IMAGE carries "ઝીરો ઈન્વેસ્ટમેન્ટ" twice (headline + icon label).
 *     Meta's 2026 review scans images, so a text-only fix would not clear it.
 * Its sibling ad using the same language was already disapproved.
 *
 * This launches a fully compliant sibling so the ad set does not go dark if
 * the original is pulled. Runs ALONGSIDE the original, which stays live and
 * keeps earning until/unless Meta acts.
 *
 * Image: reuses the P4 Scarcity image, which was verified policy-clean (no
 * zero-investment, no rupee figures, no income claims) and already carries a
 * qualification filter. Interim choice — a proper Gujarati image without the
 * banned terms is still needed.
 */

import 'dotenv/config';

const token = process.env.META_TOKEN;
const accountId = process.env.AD_ACCOUNT_ID;

const PAGE_ID = '101929911661079';
const SURAT_ADSET = '120248594655350744';
const SURAT_FORM = '1049608980975533';
const CLEAN_IMAGE = '7fc0aed7e6ccb1ee7e779c2d20a7faa9'; // verified clean P4 Scarcity image
const LINK = 'https://skiline.in/';

// Compliant rewrite. Keeps the trust/skepticism angle that is working, drops
// every banned trigger: no zero-investment, no unlimited, no earn-from-home,
// no rupee figure. Adds real role detail + a stated requirement + geographic
// exclusivity (all three double as lead-quality filters).
const HEADLINE = 'સાચી કંપની. સાચી ટ્રેનિંગ.';
const BODY = [
  "મોટાભાગની 'કમાણી'ની ઓફર જોઈને શંકા થવી સ્વાભાવિક છે.",
  '',
  'Skiline સુરતમાં લાઈફ ઈન્સ્યોરન્સ સલાહકારોની ભરતી કરી રહ્યું છે. તમે ગ્રાહકોને મળશો, પોલિસી સમજાવશો, અને તમારો પોતાનો ગ્રાહક આધાર બનાવશો.',
  '',
  'શરૂ કરતા પહેલા બે અઠવાડિયાની ટ્રેનિંગ આપવામાં આવે છે. તમને લોકો સાથે રૂબરૂ વાત કરવાનું ફાવવું જોઈએ.',
  '',
  'આ ભૂમિકા ફક્ત સુરતના રહેવાસીઓ માટે છે. ૫૦૦+ લોકો પહેલેથી પ્લેસ થયા છે. ૨ મિનિટમાં અરજી કરો.',
].join('\n');

async function apiPost(endpoint, body) {
  const res = await fetch(`https://graph.facebook.com/v19.0/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, access_token: token }),
    signal: AbortSignal.timeout(30000),
  });
  return res.json();
}

console.log('── Launching compliant Surat sibling ──');

const creative = await apiPost(`${accountId}/adcreatives`, {
  name: 'Surat P6 Real Company – Compliant – Creative',
  object_story_spec: {
    page_id: PAGE_ID,
    link_data: {
      link: LINK,
      image_hash: CLEAN_IMAGE,
      message: BODY,
      name: HEADLINE,
      call_to_action: { type: 'APPLY_NOW', value: { lead_gen_form_id: SURAT_FORM } },
    },
  },
});

if (creative.error) {
  console.log('  Creative ERROR:', JSON.stringify(creative.error));
  process.exit(1);
}
console.log('  Creative:', creative.id);

const ad = await apiPost(`${accountId}/ads`, {
  name: 'Surat – P6 – Real Company (Gujarati)',
  adset_id: SURAT_ADSET,
  creative: { creative_id: creative.id },
  status: 'ACTIVE',
});
console.log('  Ad:', JSON.stringify(ad));
console.log('\nDone. Original Trust Confession left ACTIVE and untouched.');
