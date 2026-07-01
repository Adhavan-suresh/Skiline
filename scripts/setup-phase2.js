import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
dotenv.config({ path: path.join(ROOT, '.env') });

const TOKEN   = process.env.META_TOKEN;
const AD_ACCT = process.env.AD_ACCOUNT_ID;
const PAGE_ID = process.env.PAGE_ID;
const BASE    = 'https://graph.facebook.com/v19.0';

const CAMPAIGN_ID          = '120243886033530744';
const LAL_AUDIENCE_ID      = '120248543198060744';
const HASH_HOUSEWIVES      = '94fadacfbefc30985d59aaecc6a5ac56';
const HASH_RETIREES        = '9bb23e113c555228fe01cc31a41b42fc';
const LEAD_FORM_HOUSEWIVES = '1505383314327489';
const LEAD_FORM_RETIREES   = '2800617100297668';

async function post(endpoint, params) {
  const body = new URLSearchParams({ ...params, access_token: TOKEN });
  const res  = await fetch(`${BASE}/${endpoint}`, { method: 'POST', body });
  const d    = await res.json();
  if (d.error) {
    console.error(`\n❌ FAILED: ${endpoint}`);
    console.error(JSON.stringify(d.error, null, 2));
    process.exit(1);
  }
  return d;
}

// ─── Ad Sets: already created + patched with destination_type ON_AD ──────────
const hwAs = { id: '120248570116830744' };
const rtAs = { id: '120248570118190744' };
console.log('♻️  Reusing Housewives ad set:', hwAs.id);
console.log('♻️  Reusing Retirees ad set:  ', rtAs.id);

// ─── Creative: Housewives ─────────────────────────────────────────────────────
console.log('Creating Housewives creative...');
const hwCreative = await post(`${AD_ACCT}/adcreatives`, {
  name: 'Skiline – Housewives – Phase 2 – Creative',
  object_story_spec: JSON.stringify({
    page_id: PAGE_ID,
    link_data: {
      image_hash: HASH_HOUSEWIVES,
      link: 'https://skiline.in/',
      message: 'Are you a homemaker ready to start earning? Flexible hours, no experience needed, full training provided. Call us today.',
      name: 'Skiline Recruitment',
      call_to_action: {
        type: 'SIGN_UP',
        value: { lead_gen_form_id: LEAD_FORM_HOUSEWIVES },
      },
    },
  }),
});
console.log('✅ Housewives creative:', hwCreative.id);

// ─── Creative: Retirees ───────────────────────────────────────────────────────
console.log('Creating Retirees creative...');
const rtCreative = await post(`${AD_ACCT}/adcreatives`, {
  name: 'Skiline – Retirees – Phase 2 – Creative',
  object_story_spec: JSON.stringify({
    page_id: PAGE_ID,
    link_data: {
      image_hash: HASH_RETIREES,
      link: 'https://skiline.in/',
      message: 'Your experience does not retire when you do. Work from home, be your own boss, no targets or pressure. Call us today.',
      name: 'Skiline Recruitment',
      call_to_action: {
        type: 'SIGN_UP',
        value: { lead_gen_form_id: LEAD_FORM_RETIREES },
      },
    },
  }),
});
console.log('✅ Retirees creative:', rtCreative.id);

// ─── Ad: Housewives ───────────────────────────────────────────────────────────
console.log('Creating Housewives ad...');
const hwAd = await post(`${AD_ACCT}/ads`, {
  name: 'Skiline – Housewives – Phase 2',
  adset_id: hwAs.id,
  creative: JSON.stringify({ creative_id: hwCreative.id }),
  status: 'PAUSED',
});
console.log('✅ Housewives ad:', hwAd.id);

// ─── Ad: Retirees ─────────────────────────────────────────────────────────────
console.log('Creating Retirees ad...');
const rtAd = await post(`${AD_ACCT}/ads`, {
  name: 'Skiline – Retirees – Phase 2',
  adset_id: rtAs.id,
  creative: JSON.stringify({ creative_id: rtCreative.id }),
  status: 'PAUSED',
});
console.log('✅ Retirees ad:', rtAd.id);

// ─── Final Report ─────────────────────────────────────────────────────────────
console.log('\n══════════════════════════════════════════════════════');
console.log('PHASE 2 SETUP — FINAL REPORT');
console.log('══════════════════════════════════════════════════════');
console.log('AD_ACCOUNT_ID         :', AD_ACCT);
console.log('PAGE_ID               :', PAGE_ID);
console.log('Backup file           : backups/phase1_backup_2026-06-07.json (7.8 KB)');
console.log('Ads archived          : 6');
console.log('Ad sets archived      : 4');
console.log('LAL_AUDIENCE_ID       :', LAL_AUDIENCE_ID);
console.log('LEAD_FORM (Housewives):', LEAD_FORM_HOUSEWIVES, '— Skiline — Housewives Form — Ashok Nagar');
console.log('LEAD_FORM (Retirees)  :', LEAD_FORM_RETIREES,   '— Skiline — Retired Form — Ashok Nagar');
console.log('HASH_HOUSEWIVES       :', HASH_HOUSEWIVES);
console.log('HASH_RETIREES         :', HASH_RETIREES);
console.log('');
console.log('NEW AD SETS CREATED:');
console.log('  Housewives          :', hwAs.id, '— Skiline – Housewives – Phase 2');
console.log('  Retirees            :', rtAs.id, '— Skiline – Retirees – Phase 2');
console.log('');
console.log('NEW ADS CREATED:');
console.log('  Housewives          :', hwAd.id, '— Skiline – Housewives – Phase 2');
console.log('  Retirees            :', rtAd.id, '— Skiline – Retirees – Phase 2');
console.log('');
console.log('STATUS: All PAUSED. Activate with explicit instruction only.');
console.log('======================================================\n');
