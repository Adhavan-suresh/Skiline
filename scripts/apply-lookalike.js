// apply-lookalike.js
// Adds Lookalike Audience to all 4 ad sets (layered on top of existing targeting)
// Supports --dry-run, --age-min=N, --age-max=N, --gender=male|female|all

import { readFileSync, writeFileSync, appendFileSync, mkdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
dotenv.config({ path: path.join(ROOT, '.env') });

const TOKEN   = process.env.META_TOKEN;
const BASE    = 'https://graph.facebook.com/v19.0';
const CONFIG_PATH = path.join(ROOT, 'config', 'weekly-schedule.json');

if (!TOKEN) { console.error('❌ Missing META_TOKEN in .env'); process.exit(1); }

// ─── Parse CLI flags ──────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const DRY  = args.includes('--dry-run');
const getArg = (key) => {
  const found = args.find(a => a.startsWith(`--${key}=`));
  return found ? found.split('=')[1] : null;
};
const AGE_MIN = getArg('age-min') ? parseInt(getArg('age-min')) : null;
const AGE_MAX = getArg('age-max') ? parseInt(getArg('age-max')) : null;
const GENDER  = getArg('gender'); // 'male', 'female', or 'all'

const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));

console.log('\n╔══════════════════════════════════════════════════════╗');
console.log(`║    APPLY LOOKALIKE TO AD SETS — ${DRY ? 'DRY RUN        ' : 'LIVE           '}║`);
console.log('╚══════════════════════════════════════════════════════╝\n');

if (!config.lookalike_audience_id) {
  console.error('❌ No lookalike_audience_id in config. Run create-lookalike.js first.');
  process.exit(1);
}

console.log(`🎯 Lookalike ID : ${config.lookalike_audience_id}`);
if (AGE_MIN || AGE_MAX) console.log(`📅 Age override : ${AGE_MIN || '?'} – ${AGE_MAX || '?'}`);
if (GENDER)             console.log(`👥 Gender override: ${GENDER}`);
if (DRY)                console.log(`🔍 DRY RUN — no changes will be made`);
console.log();

// ─── Ad Set IDs ───────────────────────────────────────────────────────────────
// Read from the ad_group_ids block in config, fall back to known IDs
const adSetIds = config.ad_group_ids
  ? Object.values(config.ad_group_ids).map(g => g.adset_id).filter(Boolean)
  : [
      '120243886034070744',  // Housewives Chennai (broad)
      '120243886034650744',  // Retirees Chennai (broad)
      '120247635884870744',  // Housewives Ashok Nagar
      '120247635884600744',  // Retired Ashok Nagar
    ];

const results = [];

for (const adSetId of adSetIds) {
  // 1. Read current targeting
  const getRes = await fetch(
    `${BASE}/${adSetId}?fields=name,targeting&access_token=${TOKEN}`
  );
  const adSet = await getRes.json();

  if (adSet.error) {
    console.error(`❌ ${adSetId}: ${adSet.error.message}`);
    results.push({ adSetId, status: 'ERROR', message: adSet.error.message });
    continue;
  }

  const existing = adSet.targeting || {};

  // 2. Build new targeting
  const existingAudiences = existing.custom_audiences || [];
  const alreadyApplied = existingAudiences.some(a => a.id === config.lookalike_audience_id);

  if (alreadyApplied) {
    console.log(`⏩ ${adSet.name}: lookalike already applied — skipping`);
    results.push({ adSetId, name: adSet.name, status: 'SKIPPED', reason: 'already applied' });
    continue;
  }

  const newTargeting = {
    ...existing,
    custom_audiences: [
      ...existingAudiences,
      { id: config.lookalike_audience_id },
    ],
  };

  // Apply age override if passed
  if (AGE_MIN) newTargeting.age_min = AGE_MIN;
  if (AGE_MAX) newTargeting.age_max = AGE_MAX;

  // Apply gender override
  if (GENDER === 'male')   newTargeting.genders = [1];
  if (GENDER === 'female') newTargeting.genders = [2];
  if (GENDER === 'all')    delete newTargeting.genders;

  // 3. Print diff
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📋 ${adSet.name}`);
  console.log(`   ID        : ${adSetId}`);
  console.log(`   Age       : ${existing.age_min || '?'} – ${existing.age_max || '?'}${AGE_MIN || AGE_MAX ? ` → ${newTargeting.age_min} – ${newTargeting.age_max}` : ' (unchanged)'}`);
  console.log(`   Custom audiences before: ${existingAudiences.length}`);
  console.log(`   Custom audiences after : ${newTargeting.custom_audiences.length} (+1 lookalike)`);

  if (DRY) {
    console.log(`   ✅ DRY RUN: would update targeting`);
    results.push({ adSetId, name: adSet.name, status: 'DRY_RUN' });
    console.log();
    continue;
  }

  // 4. Apply
  const updateBody = new URLSearchParams({
    targeting: JSON.stringify(newTargeting),
    access_token: TOKEN,
  });
  const updateRes = await fetch(`${BASE}/${adSetId}`, { method: 'POST', body: updateBody });
  const updateD   = await updateRes.json();

  if (updateD.error) {
    console.error(`   ❌ Failed: ${updateD.error.message}`);
    results.push({ adSetId, name: adSet.name, status: 'FAILED', message: updateD.error.message });
  } else {
    console.log(`   ✅ Lookalike applied`);
    results.push({ adSetId, name: adSet.name, status: 'SUCCESS' });
  }
  console.log();
}

// ─── Summary ──────────────────────────────────────────────────────────────────
const succeeded = results.filter(r => r.status === 'SUCCESS').length;
const failed    = results.filter(r => r.status === 'FAILED').length;
const skipped   = results.filter(r => r.status === 'SKIPPED').length;

console.log(`\n════════════════════════════════════════════════════════`);
console.log(`SUMMARY`);
console.log(`════════════════════════════════════════════════════════`);
if (DRY) {
  console.log(`DRY RUN — no changes applied. Run without --dry-run to execute.\n`);
} else {
  console.log(`✅ Applied : ${succeeded} ad sets`);
  console.log(`⏩ Skipped : ${skipped} (already had lookalike)`);
  if (failed) console.log(`❌ Failed  : ${failed} ad sets`);
  console.log();
}

// ─── Write log ────────────────────────────────────────────────────────────────
if (!DRY) {
  mkdirSync(path.join(ROOT, 'logs'), { recursive: true });
  const logPath = path.join(ROOT, 'logs', `apply-lookalike-${new Date().toISOString().slice(0,10)}.log`);
  const logLine = `${new Date().toISOString()} | lookalike:${config.lookalike_audience_id} | applied:${succeeded} skipped:${skipped} failed:${failed}\n`;
  appendFileSync(logPath, logLine);

  if (succeeded > 0) {
    config.lookalike_applied_date = new Date().toISOString();
    writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
    console.log(`💾 Config updated with lookalike_applied_date`);
  }
}
console.log();
