/**
 * Daily Telegram summary of yesterday's ads (IST), one block per ad:
 * spend, leads, CPL, CTR from Meta, plus a lead-quality trend from the sheet.
 *
 * Quality = share of RATED leads scored 3+ (1 unreachable, 2 said no, 3 warm,
 * 4 attended, 5 converted; "5+" counts as 5). Ratings arrive days after a lead, so
 * the trend compares leads submitted in the last 28 days against the 28 days
 * before, never yesterday's leads. (14-day windows left most ads under the minimum.) Needs 10+ rated leads in a window to show.
 *   ▲ / ▼ = moved 5+ points vs the prior 28 days, ▬ = within 5 points.
 *
 * Runs on GitHub Actions (.github/workflows/daily-summary.yml) at ~8:00 IST. In CI the
 * sheet key comes from the GOOGLE_SERVICE_ACCOUNT_JSON secret; locally from
 * config/service-account.json. Without sheet access it still sends the Meta numbers.
 *
 * Usage: node scripts/reporting/daily-summary.js [--dry-run]
 */

try { const { config } = await import('dotenv'); config(); } catch { /* CI: env vars come from secrets */ }

const META_TOKEN = process.env.META_TOKEN;
const AD_ACCOUNT_ID = process.env.AD_ACCOUNT_ID;
const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TG_CHAT = process.env.TELEGRAM_CHAT_ID;
const DRY_RUN = process.argv.includes('--dry-run');
const API = 'https://graph.facebook.com/v26.0';
const SHEET_ID = '1jyNnRjklz6wqz-QLqhpWMmy-bGG7_yddyUmm6vrTr6Y';
const TABS = ['Housewives', 'Retirees', 'Surat', 'Solapur', 'LAO'];
const MIN_RATED = 10;
const ARROW_POINTS = 5;

for (const [k, v] of Object.entries({ META_TOKEN, AD_ACCOUNT_ID })) {
  if (!v) { console.error(`Missing ${k}`); process.exit(1); }
}
if (!DRY_RUN) for (const [k, v] of Object.entries({ TELEGRAM_BOT_TOKEN: TG_TOKEN, TELEGRAM_CHAT_ID: TG_CHAT })) {
  if (!v) { console.error(`Missing ${k}`); process.exit(1); }
}

// ── Dates (IST) ──────────────────────────────────────────────────────────────
const istDay = (offsetDays = 0) => new Date(Date.now() + 5.5 * 3600e3 + offsetDays * 86400e3).toISOString().slice(0, 10);
const TODAY = istDay(0);
const YESTERDAY = istDay(-1);
const todayMs = Date.parse(TODAY);

const MON = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
// "Mar 19" (2026 implied), "12 Jun 2026", "22 Oct 26"
function parseDate(s) {
  const m = (s || '').trim().match(/^(?:(\d{1,2})\s+([A-Za-z]{3,9})|([A-Za-z]{3,9})\s+(\d{1,2}))(?:\s+(\d{2,4}))?$/);
  if (!m) return null;
  let y = m[5] ? parseInt(m[5]) : 2026;
  if (y < 100) y += 2000;
  const mon = MON[(m[2] || m[3]).toLowerCase().slice(0, 3)];
  return mon === undefined ? null : Date.UTC(y, mon, parseInt(m[1] || m[4]));
}

// ── Meta: yesterday per ad ───────────────────────────────────────────────────
async function meta(path, params) {
  const qs = new URLSearchParams({ ...params, access_token: META_TOKEN });
  const out = [];
  let url = `${API}/${path}?${qs}`;
  while (url) {
    const j = await fetch(url, { signal: AbortSignal.timeout(30000) }).then((r) => r.json());
    if (j.error) throw new Error(`${path}: ${j.error.message}`);
    out.push(...(j.data || []));
    url = j.paging?.next;
  }
  return out;
}

const rows = await meta(`${AD_ACCOUNT_ID}/insights`, {
  level: 'ad',
  fields: 'campaign_name,ad_name,spend,ctr,actions',
  time_range: JSON.stringify({ since: YESTERDAY, until: YESTERDAY }),
  limit: '500',
});
const ads = rows
  .map((r) => ({
    campaign: r.campaign_name,
    name: r.ad_name,
    spend: parseFloat(r.spend || 0),
    leads: parseInt(r.actions?.find((a) => a.action_type === 'lead')?.value || 0),
    ctr: parseFloat(r.ctr || 0),
  }))
  .filter((a) => a.spend > 0);

// ── Sheet: quality windows per ad name ───────────────────────────────────────
const quality = {}; // adName -> { recent: [rated, good], prior: [rated, good] }
let qualityNote = '';
try {
  const { google } = await import('googleapis');
  let creds;
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  else creds = JSON.parse((await import('fs')).readFileSync('config/service-account.json', 'utf8'));
  const auth = new google.auth.GoogleAuth({ credentials: creds, scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'] });
  const sheets = google.sheets({ version: 'v4', auth });

  for (const tab of TABS) {
    const sheetRows = (await sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: `${tab}!A:T` })).data.values || [];
    if (!sheetRows.length) continue;
    const hdr = sheetRows[0].map((h) => (h || '').trim().toLowerCase());
    const dateCol = hdr.findIndex((h) => h.startsWith('date'));
    const adCol = hdr.indexOf('source ad');
    const ratCol = hdr.findIndex((h) => h === 'rating' || h === 'ratings');
    if (dateCol < 0 || adCol < 0 || ratCol < 0) continue;
    const isName = (v) => /[A-Za-z]/.test(v || '');
    for (const r of sheetRows.slice(1)) {
      // Retirees' header sits one column right of its data: take whichever neighbour holds a name.
      const ad = [r[adCol], r[adCol - 1]].find(isName)?.trim();
      const d = parseDate(r[dateCol]);
      const m = (r[ratCol] || '').toString().trim().match(/^([1-5])\+?$/);
      if (!ad || d === null || !m) continue; // unrated leads don't count either way
      const age = (todayMs - d) / 86400e3;
      const bucket = age >= 0 && age < 28 ? 'recent' : age >= 28 && age < 56 ? 'prior' : null;
      if (!bucket) continue;
      const q = (quality[ad] ||= { recent: [0, 0], prior: [0, 0] });
      q[bucket][0]++;
      if (parseInt(m[1]) >= 3) q[bucket][1]++;
    }
  }
} catch (e) {
  qualityNote = 'Quality unavailable (sheet not reachable).';
  console.error('Sheet read failed:', e.message);
}

function qualityText(name) {
  const q = quality[name];
  if (!q || q.recent[0] < MIN_RATED) return '–';
  const pct = (b) => (b[1] / b[0]) * 100;
  const now = pct(q.recent);
  if (q.prior[0] < MIN_RATED) return `${now.toFixed(0)}%`;
  const diff = now - pct(q.prior);
  return `${now.toFixed(0)}%${diff >= ARROW_POINTS ? '▲' : diff <= -ARROW_POINTS ? '▼' : '▬'}`;
}

// ── Format ───────────────────────────────────────────────────────────────────
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const inr = (v) => `₹${Math.round(v).toLocaleString('en-IN')}`;
const cpl = (spend, leads) => (leads ? inr(spend / leads) : '–');

const totalSpend = ads.reduce((s, a) => s + a.spend, 0);
const totalLeads = ads.reduce((s, a) => s + a.leads, 0);
const dayLabel = new Date(Date.parse(YESTERDAY)).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });

const byCampaign = new Map();
for (const a of ads) byCampaign.set(a.campaign, [...(byCampaign.get(a.campaign) || []), a]);

// Telegram has no tables: a <pre> block keeps the columns aligned, so ad names are
// shortened to fit a phone screen (12 chars). Unknown ads fall back to truncation.
const SHORT_NAMES = {
  'housewives - dont know where to start (notice)': 'HW Notice',
  'housewives - back to work (copy v2 - hardest project)': 'HW Back2Work',
  'housewives - tamil test v1': 'HW Tamil',
  'housewives - does it count as experience': 'HW DoesCount',
  'skiline - housewives - phase 2': 'HW Phase 2',
  'retirees - bring purpose back (notice)': 'Ret Purpose',
  'retirees - retired not done (2nd ad)': 'Ret NotDone',
  'retirees - tamil test v1': 'Ret Tamil',
  'surat - p5 - trust confession (v2 no income line)': 'Surat P5 v2',
  'surat - p5 - trust confession (gujarati)': 'Surat P5',
  'surat - p8 - not for everyone (gujarati)': 'Surat P8',
  'solapur - not for everyone (hindi)': 'Sol NFE',
  'solapur - real company real training (hindi)': 'Sol RealCo',
  'lao - great at sales (person)': 'LAO Person',
  'lao - not an agent job (notice)': 'LAO Notice',
};
const shortName = (n) => SHORT_NAMES[n.toLowerCase().replace(/\s*[–—-]\s*/g, ' - ').replace(/\s+/g, ' ').trim()] || n.slice(0, 12);

const W = { name: 12, spend: 5, leads: 3, cpl: 4, ctr: 4, q: 6 };
const row = (name, spend, leads, cplText, ctr, q) =>
  [name.padEnd(W.name), String(spend).padStart(W.spend), String(leads).padStart(W.leads), cplText.padStart(W.cpl), ctr.padStart(W.ctr), q.padStart(W.q)].join(' ');
const num = (v) => Math.round(v).toLocaleString('en-IN');
const plainCpl = (spend, leads) => (leads ? num(spend / leads) : '–');

const header = `<b>Skiline daily, ${dayLabel}</b>\nTotal: ${inr(totalSpend)} | ${totalLeads} leads | CPL ${cpl(totalSpend, totalLeads)}`;
const blocks = [];
for (const [campaign, list] of [...byCampaign].sort((x, y) => y[1].reduce((s, a) => s + a.spend, 0) - x[1].reduce((s, a) => s + a.spend, 0))) {
  const cs = list.reduce((s, a) => s + a.spend, 0);
  const cl = list.reduce((s, a) => s + a.leads, 0);
  const table = [row('Ad', 'Spend', 'Ld', 'CPL', 'CTR%', 'Qual'), '-'.repeat(Object.values(W).reduce((a, b) => a + b, 0) + 5)];
  for (const a of list.sort((x, y) => y.spend - x.spend)) {
    table.push(row(esc(shortName(a.name)), num(a.spend), a.leads, plainCpl(a.spend, a.leads), a.ctr.toFixed(1), qualityText(a.name)));
  }
  table.push(row('Total', num(cs), cl, plainCpl(cs, cl), '', ''));
  blocks.push(`<b>${esc(campaign.replace('Skiline Recruitment — ', ''))}</b>\n<pre>${table.join('\n')}</pre>`);
}
const footer = `Spend and CPL in ₹. Qual = rated leads scoring 3+, last 28 days of leads. ▲▼ = 5+ pts vs the 28 days before; – = under ${MIN_RATED} rated.${qualityNote ? '\n' + qualityNote : ''}`;

// Telegram caps a message at 4096 chars: pack whole campaign blocks into messages.
const messages = [];
let cur = header;
for (const b of blocks) {
  if ((cur + '\n\n' + b).length > 3800) { messages.push(cur); cur = b; } else cur += '\n\n' + b;
}
messages.push(cur + '\n\n' + footer);

if (!ads.length) messages.splice(0, messages.length, `<b>Skiline daily, ${dayLabel}</b>\nNo ad spend recorded yesterday.`);

for (const m of messages) console.log(m.replace(/<\/?b>/g, '') + '\n---');
if (DRY_RUN) { console.log('Dry run, nothing sent.'); process.exit(0); }

for (const text of messages) {
  const res = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: TG_CHAT, text, parse_mode: 'HTML' }),
    signal: AbortSignal.timeout(20000),
  }).then((r) => r.json());
  if (!res.ok) { console.error('Telegram:', JSON.stringify(res)); process.exit(1); }
}
console.log(`Sent ${messages.length} message(s).`);
