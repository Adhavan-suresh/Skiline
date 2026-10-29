/**
 * Manual run of the daily Telegram summary (the scheduled 8:00 IST run is the Vercel
 * cron in api/daily-summary.js; both call lib/daily-summary.js, which has the details).
 *
 * Usage: node scripts/reporting/daily-summary.js [--dry-run]
 */

try { const { config } = await import('dotenv'); config(); } catch { /* env vars already set */ }
import { sendDailySummary } from '../../lib/daily-summary.js';

const dryRun = process.argv.includes('--dry-run');
const messages = await sendDailySummary({ dryRun });
for (const m of messages) console.log(m.replace(/<\/?(b|pre)>/g, '') + '\n---');
console.log(dryRun ? 'Dry run, nothing sent.' : `Sent ${messages.length} message(s).`);
