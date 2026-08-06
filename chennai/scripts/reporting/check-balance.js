/**
 * Meta ad account balance monitor -> Telegram alert.
 *
 * The account is PREPAID: `balance` is funds remaining, not money owed. It
 * drops as ads spend and jumps back up on top-up. When it hits zero, delivery
 * stops and the account gets restricted for payment — which is what happened
 * on 2026-08-04 (funds hit ₹4.00, ads dead Aug 5-6, no warning).
 *
 * Alerts when:
 *   - balance falls below THRESHOLD (default ₹500)
 *   - account_status is anything other than 1 (active)
 *
 * Runs every 3 hours via .github/workflows/balance-check.yml. At ~₹600/day
 * spend, ₹500 is under a day of runway, so a daily check would be too slow.
 *
 * Zero dependencies so CI needs no npm install. Reads .env when run locally.
 */

try { const { config } = await import('dotenv'); config(); } catch { /* CI: env vars come from secrets */ }

const META_TOKEN = process.env.META_TOKEN;
const AD_ACCOUNT_ID = process.env.AD_ACCOUNT_ID;
const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TG_CHAT = process.env.TELEGRAM_CHAT_ID;
const THRESHOLD = Number(process.env.BALANCE_THRESHOLD || 500);

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
  `https://graph.facebook.com/v19.0/${AD_ACCOUNT_ID}?fields=balance,account_status,disable_reason&access_token=${META_TOKEN}`,
  { signal: AbortSignal.timeout(25000) },
).then(r => r.json());

if (acct.error) {
  await telegram(`⚠️ <b>Skiline: cannot read ad account</b>\n\n${acct.error.message}\n\nThe balance monitor could not check funds.`);
  console.error('Meta API error:', acct.error.message);
  process.exit(1);
}

const balance = Number(acct.balance) / 100; // paise -> rupees
const active = acct.account_status === 1;

// Yesterday's spend, to estimate remaining days
let perDay = 0;
try {
  const since = new Date(Date.now() - 3 * 864e5).toISOString().slice(0, 10);
  const until = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
  const ins = await fetch(
    `https://graph.facebook.com/v19.0/${AD_ACCOUNT_ID}/insights?fields=spend&level=account&time_range={"since":"${since}","until":"${until}"}&access_token=${META_TOKEN}`,
    { signal: AbortSignal.timeout(25000) },
  ).then(r => r.json());
  const total = (ins.data || []).reduce((s, r) => s + parseFloat(r.spend || 0), 0);
  if (total > 0) perDay = total / 3;
} catch { /* estimate is a nicety, not worth failing over */ }

const runway = perDay > 0 ? (balance / perDay).toFixed(1) : null;
console.log(`balance=₹${balance.toFixed(2)} status=${acct.account_status} perDay=₹${perDay.toFixed(0)} runway=${runway ?? '?'}d`);

if (!active) {
  await telegram(
    `🚨 <b>Skiline ad account is NOT active</b>\n\n` +
    `Status code: ${acct.account_status}\nReason code: ${acct.disable_reason}\n` +
    `Balance: ₹${balance.toFixed(2)}\n\nAds are not running. Check Ads Manager.`,
  );
  console.log('ALERT SENT: account inactive');
} else if (balance < THRESHOLD) {
  await telegram(
    `⚠️ <b>Skiline Meta funds low</b>\n\n` +
    `Balance: <b>₹${balance.toFixed(2)}</b>\n` +
    (runway ? `Roughly <b>${runway} days</b> left at recent spend (₹${perDay.toFixed(0)}/day)\n` : '') +
    `\nTop up before it hits zero, or ads stop and the account gets restricted.\n` +
    `Remember: bank charges 18% GST on top of the top-up amount.`,
  );
  console.log('ALERT SENT: low balance');
} else {
  console.log('OK — no alert needed');
}
