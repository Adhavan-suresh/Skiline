import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const token = process.env.META_TOKEN;
const AD_ACCOUNT = process.env.AD_ACCOUNT_ID;
const PAGE_ID = process.env.PAGE_ID;

const RETIREES_ID   = '120248587937540744';
const HOUSEWIVES_ID = '120248587937010744';
const RETIREES_FORM  = '2370602070099137';
const HOUSEWIVES_FORM = '1209496811207023';

// ── 1. Check existing pixels/datasets ────────────────────────────────────────
console.log('=== Checking pixels/datasets ===');
const pixelRes = await fetch(`https://graph.facebook.com/v19.0/${AD_ACCOUNT}/adspixels?fields=name,id,last_fired_time&access_token=${token}`);
const pixelData = await pixelRes.json();
console.log('Pixels:', JSON.stringify(pixelData.data, null, 2));

// ── 2. Create "All Lead Form Submitters" audience ────────────────────────────
// Meta custom audience from lead form — anyone who submitted either form
async function createLeadFormAudience(name, formId) {
  const rule = JSON.stringify({
    inclusions: {
      operator: 'or',
      rules: [{
        event_sources: [{ id: formId, type: 'leadgen' }],
        retention_seconds: 7776000, // 90 days
        filter: {
          operator: 'and',
          filters: [{ field: 'event', operator: 'eq', value: 'lead' }]
        }
      }]
    }
  });

  const body = new URLSearchParams({ name, subtype: 'ENGAGEMENT', rule, access_token: token });

  const r = await fetch(`https://graph.facebook.com/v19.0/${AD_ACCOUNT}/customaudiences`, {
    method: 'POST',
    body
  });
  const d = await r.json();
  if (d.error) {
    console.log(`❌ ${name}: ${d.error.message}`);
    return null;
  }
  console.log(`✅ Created audience: ${name} → ID: ${d.id}`);
  return d.id;
}

console.log('\n=== Creating lead form exclusion audiences ===');
const retireesAudienceId   = await createLeadFormAudience('Exclusion — Retirees Form Submitters', RETIREES_FORM);
const housewivesAudienceId = await createLeadFormAudience('Exclusion — Housewives Form Submitters', HOUSEWIVES_FORM);

// ── 3. Fetch current targeting for both ad sets ───────────────────────────────
async function getTargeting(id) {
  const p = new URLSearchParams({ fields: 'targeting', access_token: token });
  const r = await fetch(`https://graph.facebook.com/v19.0/${id}?${p}`);
  const d = await r.json();
  return d.targeting;
}

// ── 4. Add exclusions to both ad sets ────────────────────────────────────────
async function addExclusion(adSetId, adSetName, audienceId) {
  if (!audienceId) { console.log(`⚠️ Skipping ${adSetName} — no audience ID`); return; }

  const targeting = await getTargeting(adSetId);

  // Add to excluded_custom_audiences (don't overwrite existing)
  const existing = targeting.excluded_custom_audiences || [];
  const alreadyAdded = existing.some(a => a.id === audienceId);
  if (alreadyAdded) { console.log(`ℹ️ ${adSetName}: exclusion already set`); return; }

  targeting.excluded_custom_audiences = [...existing, { id: audienceId }];

  const body = new URLSearchParams({ targeting: JSON.stringify(targeting), access_token: token });
  const r = await fetch(`https://graph.facebook.com/v19.0/${adSetId}`, { method: 'POST', body });
  const d = await r.json();
  console.log(`${adSetName}: ${d.success ? '✅ Exclusion added' : '❌ ' + d.error?.message}`);
}

if (retireesAudienceId || housewivesAudienceId) {
  console.log('\n=== Adding exclusions to ad sets ===');

  // Each ad set excludes BOTH form audiences (a retiree might have also tried housewives form)
  const allAudienceIds = [retireesAudienceId, housewivesAudienceId].filter(Boolean);

  for (const audienceId of allAudienceIds) {
    await addExclusion(RETIREES_ID, 'Retirees Phase 2', audienceId);
    await addExclusion(HOUSEWIVES_ID, 'Housewives Phase 2', audienceId);
  }
}
