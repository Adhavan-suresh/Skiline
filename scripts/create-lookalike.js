// create-lookalike.js
// Creates a 1% Lookalike Audience from the uploaded Custom Audience
// Run AFTER upload-audience.js + 24–72h wait for Meta to process

import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
dotenv.config({ path: path.join(ROOT, '.env') });

const TOKEN   = process.env.META_TOKEN;
const AD_ACCT = process.env.AD_ACCOUNT_ID;
const BASE    = 'https://graph.facebook.com/v19.0';
const CONFIG_PATH = path.join(ROOT, 'config', 'weekly-schedule.json');

if (!TOKEN || !AD_ACCT) {
  console.error('❌ Missing META_TOKEN or AD_ACCOUNT_ID in .env');
  process.exit(1);
}

const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));

console.log('\n╔══════════════════════════════════════════════════════╗');
console.log('║         CREATE LOOKALIKE AUDIENCE — SKILINE          ║');
console.log('╚══════════════════════════════════════════════════════╝\n');

// Guards
if (!config.custom_audience_id) {
  console.error('❌ No custom_audience_id in config. Run upload-audience.js first.');
  process.exit(1);
}
if (config.lookalike_audience_id) {
  console.log(`♻️  Lookalike already exists: ${config.lookalike_audience_id}`);
  console.log('   Delete lookalike_audience_id from config to recreate.\n');
  process.exit(0);
}

console.log(`📋 Source audience : ${config.custom_audience_id}`);
console.log('🔄 Creating 1% Lookalike for India...\n');

const lookalike_spec = JSON.stringify({
  ratio: 0.01,
  country: 'IN',
  type: 'similarity',
  origin_ids: [config.custom_audience_id],
});

const body = new URLSearchParams({
  name: 'Skiline Converted Advisors — Lookalike 1% IN',
  subtype: 'LOOKALIKE',
  lookalike_spec,
  access_token: TOKEN,
});

const res = await fetch(`${BASE}/${AD_ACCT}/customaudiences`, { method: 'POST', body });
const d   = await res.json();

if (d.error) {
  if (d.error.code === 2650) {
    console.error('❌ Source audience too small — Meta needs ≥100 matched users.');
    console.error('   Wait longer for Meta to process uploads, or add more phone numbers.');
  } else {
    console.error('❌ Error:', d.error.message);
  }
  process.exit(1);
}

config.lookalike_audience_id = d.id;
writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));

console.log(`✅ Lookalike Audience created: ${d.id}`);
console.log(`   Saved to config/weekly-schedule.json\n`);
console.log(`⏳ Lookalike takes a few hours to populate after source is "Ready".`);
console.log(`   Check status: https://business.facebook.com/adsmanager/audiences`);
console.log(`\n   Next: npm run audience:analyze   ← see demographic breakdown`);
console.log(`         npm run audience:apply:dry  ← preview targeting changes\n`);
