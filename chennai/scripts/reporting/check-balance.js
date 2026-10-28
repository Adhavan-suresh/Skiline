/**
 * Meta ad account status monitor -> Telegram alert.
 *
 * Alerts when account_status is anything other than 1 (active). The low-funds
 * alert that used to live here was removed 2026-10-28: funds are no longer
 * watched, and the daily per-ad summary is in daily-summary.js.
 *
 * Runs every 3 hours via .github/workflows/balance-check.yml.
 *
 * Zero dependencies so CI needs no npm install. Reads .env when run locally.
 */

try { const { config } = await import('dotenv'); config(); } catch { /* CI: env vars come from secrets */ }

const META_TOKEN = process.env.META_TOKEN;
const AD_ACCOUNT_ID = process.env.AD_ACCOUNT_ID;
const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TG_CHAT = process.env.TELEGRAM_CHAT_ID;

for (const [k, v] of Object.entries({ META_TOKEN, AD_ACCOUNT_ID, TG_TOKEN, TG_CHAT })) {
  if (!v) { console.error(`Missing ${k}`); process.exit(1); }
}

async function telegram(text) {
  const res = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: TG_CHAT, text, parse_mode: 'HTML' }),
    signal: AbortSignal.timeout(20000),
  });
  const out = await res.json();
  if (!out.ok) throw new Error('Telegram: ' + JSON.stringify(out));
}

const acct = await fetch(
  `https://graph.facebook.com/v19.0/${AD_ACCOUNT_ID}?fields=account_status,disable_reason&access_token=${META_TOKEN}`,
  { signal: AbortSignal.timeout(25000) },
).then(r => r.json());

if (acct.error) {
  await telegram(`⚠️ <b>Skiline: cannot read ad account</b>\n\n${acct.error.message}\n\nThe account monitor could not check status.`);
  console.error('Meta API error:', acct.error.message);
  process.exit(1);
}

console.log(`status=${acct.account_status}`);

if (acct.account_status !== 1) {
  await telegram(
    `🚨 <b>Skiline ad account is NOT active</b>\n\n` +
    `Status code: ${acct.account_status}\nReason code: ${acct.disable_reason}\n\n` +
    `Ads are not running. Check Ads Manager.`,
  );
  console.log('ALERT SENT: account inactive');
} else {
  console.log('OK — no alert needed');
}
