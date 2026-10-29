// Vercel cron endpoint: sends the daily per-ad Telegram summary (schedule in vercel.json).
// Vercel's cron calls this with "Authorization: Bearer <CRON_SECRET>"; anything else is refused,
// so nobody can trigger Telegram messages by guessing the URL.
//
// Env vars (set in Vercel dashboard, NOT committed):
//   CRON_SECRET, META_TOKEN, AD_ACCOUNT_ID, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, GOOGLE_SERVICE_ACCOUNT_JSON

import { sendDailySummary } from '../lib/daily-summary.js';

export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return res.status(500).send('CRON_SECRET not configured');
  const given = (req.headers.authorization || '').replace(/^Bearer /, '') || req.query?.key;
  if (given !== secret) return res.status(401).send('Unauthorized');

  try {
    const messages = await sendDailySummary();
    return res.status(200).send(`Sent ${messages.length} message(s)`);
  } catch (e) {
    console.error('daily-summary failed:', e.message);
    return res.status(500).send(e.message);
  }
}
