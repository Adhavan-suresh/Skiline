import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT    = path.join(__dirname, '..');
dotenv.config({ path: path.join(ROOT, '.env') });

const TOKEN   = process.env.META_TOKEN;
const BASE    = 'https://graph.facebook.com/v19.0';

// Budgets in paise (₹1 = 100 paise)
const BROAD_BUDGET = '20000'; // ₹200/day
const AN_BUDGET    = '10000'; // ₹100/day

async function api(id, body) {
  const params = new URLSearchParams({ ...body, access_token: TOKEN });
  const r = await fetch(`${BASE}/${id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
  const d = await r.json();
  if (d.error) throw new Error(d.error.message);
  return d;
}

function getWeekNumber(date) {
  const start = new Date(2026, 2, 23);
  return Math.floor((date - start) / (1000 * 60 * 60 * 24 * 7)) + 1;
}

async function toggleSegment(config, activeSegment, dryRun) {
  const actions = [];

  // Determine which broad/AN keys are active vs inactive
  const broadActive   = activeSegment === 'housewives' ? 'housewives' : 'retirees';
  const broadInactive = activeSegment === 'housewives' ? 'retirees'   : 'housewives';
  const anActive      = activeSegment === 'housewives' ? 'housewives_ashok_nagar' : 'retired_ashok_nagar';
  const anInactive    = activeSegment === 'housewives' ? 'retired_ashok_nagar'   : 'housewives_ashok_nagar';

  const ids = config.ad_group_ids;

  async function setAdset(key, status, budget) {
    const d = ids[key];
    if (!d) return;
    const body = { status };
    if (budget) body.daily_budget = budget;
    try {
      if (!dryRun) await api(d.adset_id, body);
      actions.push(`${status === 'ACTIVE' ? '▶' : '⏸'} ${d.adset_name} → ${status}${budget ? ` @ ₹${parseInt(budget)/100}/day` : ''}`);
    } catch (err) {
      actions.push(`✗ ${d.adset_name}: ${err.message}`);
    }
    for (const ad of d.ads || []) {
      try {
        if (!dryRun) await api(ad.id, { status });
        actions.push(`   ${status === 'ACTIVE' ? '▶' : '⏸'} ${ad.name}`);
      } catch (err) {
        actions.push(`   ✗ ${ad.name}: ${err.message}`);
      }
    }
  }

  // Pause inactive segment (broad + AN)
  await setAdset(broadInactive, 'PAUSED');
  await setAdset(anInactive,    'PAUSED');

  // Activate active segment (broad + AN) with correct budgets
  await setAdset(broadActive, 'ACTIVE', BROAD_BUDGET);
  await setAdset(anActive,    'ACTIVE', AN_BUDGET);

  return actions;
}

async function main() {
  const scheduleFile = path.join(ROOT, 'config', 'weekly-schedule.json');
  const logsDir      = path.join(ROOT, 'logs');
  if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

  const config  = JSON.parse(fs.readFileSync(scheduleFile, 'utf8'));
  const dryRun  = process.argv.includes('--dry-run');
  const now     = new Date();
  const weekNum = getWeekNumber(now);

  const weekInfo     = config.weeks.find(w => w.week === weekNum);
  const activeSegment = weekInfo
    ? weekInfo.active_segment
    : (weekNum % 2 === 1 ? 'housewives' : 'retirees');

  console.log(`\nSKILINE WEEKLY TOGGLE — Week ${weekNum} → ${activeSegment.toUpperCase()}${dryRun ? ' [DRY RUN]' : ''}`);

  const actions = await toggleSegment(config, activeSegment, dryRun);
  actions.forEach(a => console.log(` ${a}`));

  const logFile = path.join(logsDir, `toggle-${now.toISOString().split('T')[0]}.log`);
  fs.appendFileSync(logFile, `${now.toISOString()} | Week ${weekNum} | ${activeSegment} | ${dryRun ? 'DRY' : 'LIVE'}\n${actions.join('\n')}\n---\n`);

  config.current_week = weekNum;
  fs.writeFileSync(scheduleFile, JSON.stringify(config, null, 2));
  console.log(`\nLogged → ${logFile}\n`);
}

main().catch(err => { console.error('ERROR:', err.message); process.exit(1); });
