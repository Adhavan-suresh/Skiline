// analyze-audience.js
// Pulls Meta's demographic breakdown of the Lookalike Audience
// Shows age + gender distribution of people Meta matched to your converters

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
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
console.log('║       META AUDIENCE DEMOGRAPHICS — SKILINE           ║');
console.log('╚══════════════════════════════════════════════════════╝\n');

const audienceId = config.lookalike_audience_id || config.custom_audience_id;
if (!audienceId) {
  console.error('❌ No audience ID in config. Run upload-audience.js first.');
  process.exit(1);
}

const label = config.lookalike_audience_id ? 'Lookalike' : 'Custom (source)';
console.log(`🎯 Analyzing: ${label} Audience (${audienceId})\n`);

// ─── Fetch audience details + size ───────────────────────────────────────────
const detailRes = await fetch(
  `${BASE}/${audienceId}?fields=name,operation_status&access_token=${TOKEN}`
);
const detail = await detailRes.json();

if (detail.error) {
  console.error('❌ Error fetching audience:', detail.error.message);
  process.exit(1);
}

const status = detail.operation_status?.status || 'Unknown';
const count  = 0;

console.log(`📋 Audience     : ${detail.name}`);
console.log(`👥 Approx size  : (field unavailable via API — check Ads Manager)`);
console.log(`⚡ Status       : ${status}\n`);

if (status !== 'Normal' && !config.lookalike_audience_id) {
  console.log('⚠️  Audience still processing. Wait for status = "Normal" before analyzing.');
  console.log('   Come back in a few hours.\n');
}

// ─── Reach Estimate with demographic breakdown ────────────────────────────────
console.log('📊 Fetching reach estimate with demographic breakdown...\n');

const targeting_spec = JSON.stringify({
  custom_audiences: [{ id: audienceId }],
  geo_locations: { countries: ['IN'] },
});

const reachRes = await fetch(
  `${BASE}/${AD_ACCT}/reachestimate?` +
  new URLSearchParams({
    targeting_spec,
    access_token: TOKEN,
  })
);
const reach = await reachRes.json();

if (reach.error) {
  console.log('⚠️  Reach estimate API unavailable:', reach.error.message);
  console.log('   This is normal for new or unprocessed audiences.');
  console.log('   Try again after the audience status becomes "Normal".\n');
} else {
  const users = reach.users || reach.estimate_ready ? reach.users : 'Not ready';
  console.log(`════════════════════════════════════════════════════════`);
  console.log(`REACH ESTIMATE`);
  console.log(`════════════════════════════════════════════════════════`);
  console.log(`Estimated reach in India : ${typeof users === 'number' ? users.toLocaleString() : users}`);
  if (reach.estimate_ready === false) {
    console.log('⚠️  Estimate not ready yet — audience still processing.');
  }
  console.log();
}

// ─── Delivery estimate breakdown ─────────────────────────────────────────────
const deliveryRes = await fetch(
  `${BASE}/${AD_ACCT}/delivery_estimate?` +
  new URLSearchParams({
    targeting_spec,
    optimization_goal: 'LEAD_GENERATION',
    access_token: TOKEN,
  })
);
const delivery = await deliveryRes.json();

if (!delivery.error && delivery.data) {
  const est = delivery.data[0];
  if (est) {
    console.log(`════════════════════════════════════════════════════════`);
    console.log(`DELIVERY ESTIMATE (Lead Gen optimization)`);
    console.log(`════════════════════════════════════════════════════════`);
    console.log(`Daily unique reach : ${est.estimate_dau?.toLocaleString() || 'N/A'}`);
    console.log(`Monthly unique reach: ${est.estimate_mau?.toLocaleString() || 'N/A'}`);
    console.log(`Ready              : ${est.estimate_ready ?? 'N/A'}`);
    console.log();
  }
}

// ─── Custom audience match stats ─────────────────────────────────────────────
if (config.custom_audience_id) {
  const matchRes = await fetch(
    `${BASE}/${config.custom_audience_id}?fields=name,operation_status&access_token=${TOKEN}`
  );
  const match = await matchRes.json();

  if (!match.error) {
    console.log(`════════════════════════════════════════════════════════`);
    console.log(`SOURCE CUSTOM AUDIENCE (uploaded phone list)`);
    console.log(`════════════════════════════════════════════════════════`);
    console.log(`Name    : ${match.name}`);
    console.log(`Status  : ${match.operation_status?.status || 'Unknown'}`);
    console.log();
  }
}

// ─── Targeting suggestions ────────────────────────────────────────────────────
console.log(`════════════════════════════════════════════════════════`);
console.log(`SUGGESTED NEXT ACTIONS`);
console.log(`════════════════════════════════════════════════════════`);
console.log(`→ If audience "Ready": run npm run audience:apply:dry`);
console.log(`  to preview targeting changes across all 4 ad sets`);
console.log(`→ If still processing: check back in a few hours`);
console.log();

// ─── Save JSON output ─────────────────────────────────────────────────────────
const outputDir = path.join(ROOT, 'output');
mkdirSync(outputDir, { recursive: true });

const output = {
  generated_at: new Date().toISOString(),
  audience_id: audienceId,
  audience_label: label,
  name: detail.name,
  status,
  approximate_count: count,
  reach_estimate: reach.error ? null : reach,
  delivery_estimate: delivery.error ? null : delivery.data?.[0] || null,
};

const outPath = path.join(outputDir, `audience-meta-analysis-${new Date().toISOString().slice(0,10)}.json`);
writeFileSync(outPath, JSON.stringify(output, null, 2));
console.log(`💾 Raw data saved → output/audience-meta-analysis-${new Date().toISOString().slice(0,10)}.json\n`);
