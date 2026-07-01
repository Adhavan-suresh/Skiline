// upload-audience.js
// Reads Advisors List xlsx, hashes phone numbers, uploads to Meta Custom Audience
// Idempotent — safe to re-run if interrupted

import { createHash } from 'crypto';
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
dotenv.config({ path: path.join(ROOT, '.env') });

const TOKEN    = process.env.META_TOKEN;
const AD_ACCT  = process.env.AD_ACCOUNT_ID;
const BASE     = 'https://graph.facebook.com/v19.0';
const CONFIG_PATH = path.join(ROOT, 'config', 'weekly-schedule.json');
const EXCEL_PATH  = path.join(ROOT, 'assets', 'Advisors List -02.06.2026.xlsx');

if (!TOKEN || !AD_ACCT) {
  console.error('❌ Missing META_TOKEN or AD_ACCOUNT_ID in .env');
  process.exit(1);
}

// ─── Read Config ──────────────────────────────────────────────────────────────
const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));

// ─── Read + Normalize Phones ──────────────────────────────────────────────────
const xlsxMod = await import('xlsx');
const XLSX = xlsxMod.default || xlsxMod;
const wb = XLSX.readFile(EXCEL_PATH);
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });

const headers = rows[0].map(h => String(h).toUpperCase().trim());
const phoneIdx = headers.findIndex(h => h === 'PHONE');

if (phoneIdx === -1) {
  console.error('❌ No PHONE column found in Excel');
  process.exit(1);
}

function normalizePhone(raw) {
  const digits = String(raw).replace(/\D/g, '');
  if (digits.length === 10) return '91' + digits;
  if (digits.length === 12 && digits.startsWith('91')) return digits;
  if (digits.length === 11 && digits.startsWith('0')) return '91' + digits.slice(1);
  return null;
}

function hashPhone(normalized) {
  return createHash('sha256').update(normalized).digest('hex');
}

const hashes = [];
let skipped = 0;
for (const row of rows.slice(1)) {
  const raw = row[phoneIdx];
  if (!raw) { skipped++; continue; }
  const normalized = normalizePhone(raw);
  if (!normalized) { skipped++; continue; }
  hashes.push([hashPhone(normalized)]);
}

console.log('\n╔══════════════════════════════════════════════════════╗');
console.log('║        META CUSTOM AUDIENCE UPLOAD — SKILINE         ║');
console.log('╚══════════════════════════════════════════════════════╝\n');
console.log(`📱 Phones ready to upload: ${hashes.length}`);
console.log(`⚠️  Skipped (invalid/blank): ${skipped}\n`);

// ─── Create or Reuse Custom Audience ─────────────────────────────────────────
let audienceId = config.custom_audience_id;

if (audienceId) {
  console.log(`♻️  Reusing existing Custom Audience: ${audienceId}`);
} else {
  console.log('📋 Creating new Custom Audience...');
  const body = new URLSearchParams({
    name: 'Skiline Converted Advisors',
    subtype: 'CUSTOM',
    description: 'Offline converted advisors — phone list upload',
    customer_file_source: 'USER_PROVIDED_ONLY',
    access_token: TOKEN,
  });
  const res = await fetch(`${BASE}/${AD_ACCT}/customaudiences`, { method: 'POST', body });
  const d = await res.json();
  if (d.error) {
    console.error('❌ Failed to create audience:', d.error.message);
    process.exit(1);
  }
  audienceId = d.id;
  config.custom_audience_id = audienceId;
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  console.log(`✅ Created Custom Audience: ${audienceId}\n`);
}

// ─── Upload in Batches of 10,000 ─────────────────────────────────────────────
const BATCH = 10000;
let totalReceived = 0;
let totalInvalid  = 0;
let batchNum = 0;

for (let i = 0; i < hashes.length; i += BATCH) {
  batchNum++;
  const chunk = hashes.slice(i, i + BATCH);
  const payload = JSON.stringify({ schema: ['PHONE'], data: chunk });

  const body = new URLSearchParams({ payload, access_token: TOKEN });
  const res  = await fetch(`${BASE}/${audienceId}/users`, { method: 'POST', body });
  const d    = await res.json();

  if (d.error) {
    console.error(`❌ Batch ${batchNum} failed:`, d.error.message);
    continue;
  }

  totalReceived += d.num_received || 0;
  totalInvalid  += d.num_invalid_entries || 0;
  console.log(`📤 Batch ${batchNum}: ${d.num_received} received, ${d.num_invalid_entries || 0} invalid`);
  if (d.invalid_entry_samples?.length) {
    console.log('   Invalid samples:', d.invalid_entry_samples.slice(0, 3));
  }
}

console.log(`\n════════════════════════════════════════════════════════`);
console.log(`✅ Upload complete`);
console.log(`   Total received : ${totalReceived}`);
console.log(`   Total invalid  : ${totalInvalid}`);
console.log(`   Audience ID    : ${audienceId}`);
console.log(`\n⏳ IMPORTANT: Wait 24–72 hours for Meta to process.`);
console.log(`   Then run: npm run audience:lookalike\n`);
console.log(`   Check status: https://business.facebook.com/adsmanager/audiences\n`);
