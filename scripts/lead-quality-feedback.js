/**
 * Lead Quality Feedback — Meta Conversions API
 *
 * Reads rated leads from Google Sheet (Housewives, Retirees, Surat tabs),
 * maps rating to Meta value score, sends as Conversions API events.
 * Tracks sent leads in output/lqf-sent.json to avoid duplicates.
 * Run weekly via Task Scheduler.
 *
 * Status progression in sheet:
 *   YET TO CONNECT (YTC) → blank rating → called 1–4 times, no answer yet → SKIP
 *   TRIED MULTIPLE TIMES (TMT) → rating 1 → called 5 times, no answer → SKIP
 *     Reason: TMT leads submitted the form (showed intent). Unreachable ≠ wrong persona.
 *     Sending them as negative tells Meta to avoid people who filled the form — wrong.
 *
 * Rating → Meta value mapping:
 *   5 (LOGGED/LACODE)     → 100  — converted advisor — strongest positive signal
 *   4 (AFTER NI/PIPELINE) → 80   — attended orientation, in process — strong positive
 *   3 (PIPELINE BEFORE)   → 60   — warm, in pipeline — mild positive
 *   2 (NI OVER THE PHONE) → 20   — explicitly said no on call — negative signal
 *   1 (TRIED MULTIPLE TIMES) → SKIP — unreachable, not a quality signal
 *   blank (YET TO CONNECT)   → SKIP — still being tried
 */

import { google } from 'googleapis';
import { createHash } from 'crypto';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const SPREADSHEET_ID = '1jyNnRjklz6wqz-QLqhpWMmy-bGG7_yddyUmm6vrTr6Y';
const PIXEL_ID = '954528386944568';
const META_TOKEN = process.env.META_TOKEN;
const SENT_LOG = path.join(__dirname, '..', 'output', 'lqf-sent.json');

// Rating 1 (TMT) excluded — unreachable ≠ wrong persona (they did submit the form)
// Blank (YTC) excluded — still being tried, quality unknown
const RATING_VALUE_MAP = { 5: 100, 4: 80, 3: 60, 2: 20 };
const SENDABLE_RATINGS = new Set([2, 3, 4, 5]);

const SHEETS = [
  { name: 'Housewives', range: 'Housewives!A2:H' },
  { name: 'Retirees',   range: 'Retirees!A2:H'   },
  { name: 'Surat',      range: 'Surat!A2:J'       },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function sha256(val) {
  return createHash('sha256').update(val.toLowerCase().trim()).digest('hex');
}

function normalizePhone(raw) {
  if (!raw) return null;
  // strip non-digits, take last 10 digits, prepend India country code
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 10) return null;
  const local = digits.slice(-10);
  return '91' + local;
}

function loadSentLog() {
  if (!existsSync(SENT_LOG)) return {};
  return JSON.parse(readFileSync(SENT_LOG, 'utf8'));
}

function saveSentLog(log) {
  writeFileSync(SENT_LOG, JSON.stringify(log, null, 2));
}

// ── Read sheet ────────────────────────────────────────────────────────────────

async function getLeadsFromSheet(sheets) {
  const leads = [];

  for (const s of SHEETS) {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: s.range,
    });
    const rows = res.data.values || [];

    for (const row of rows) {
      // columns: [#, Date, Name, Phone, Email, Remarks, Rating, Notes]
      const phone = row[3]?.trim();
      const email = row[4]?.trim();
      const rating = parseInt(row[6]?.trim());
      const name = row[2]?.trim();
      const date = row[1]?.trim();
      const remarks = row[5]?.trim();

      if (!SENDABLE_RATINGS.has(rating)) continue;
      if (!phone && !email) continue;

      const normalized = normalizePhone(phone);
      const key = normalized || email?.toLowerCase();
      if (!key) continue;

      leads.push({ key, phone: normalized, email, name, date, rating, segment: s.name, remarks });
    }
  }

  return leads;
}

// ── Send to Meta Conversions API ──────────────────────────────────────────────

async function sendBatch(events) {
  const body = new URLSearchParams({
    data: JSON.stringify(events),
    access_token: META_TOKEN,
  });

  const res = await fetch(`https://graph.facebook.com/v19.0/${PIXEL_ID}/events`, {
    method: 'POST',
    body,
  });
  return res.json();
}

// ── Main ──────────────────────────────────────────────────────────────────────

const sa = JSON.parse(readFileSync(path.join(__dirname, '..', 'config', 'service-account.json'), 'utf8'));
const auth = new google.auth.GoogleAuth({
  credentials: sa,
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});
const sheetsClient = google.sheets({ version: 'v4', auth });

const sentLog = loadSentLog();
const leads = await getLeadsFromSheet(sheetsClient);

console.log(`Total rated leads found: ${leads.length}`);

// separate new from already-sent
const toSend = leads.filter(l => !sentLog[l.key]);
const alreadySent = leads.length - toSend.length;

console.log(`Already sent: ${alreadySent}`);
console.log(`New to send: ${toSend.length}`);

if (toSend.length === 0) {
  console.log('Nothing new to send.');
  process.exit(0);
}

// rating breakdown
const dist = { 2: 0, 3: 0, 4: 0, 5: 0 };
toSend.forEach(l => dist[l.rating]++);
console.log('\nRating breakdown for this batch:');
Object.entries(dist).forEach(([r, n]) => {
  if (n > 0) console.log(`  Rating ${r} (value ${RATING_VALUE_MAP[r]}): ${n} leads`);
});

// build events in batches of 50 (Meta API limit per request)
const eventTime = Math.floor(Date.now() / 1000);
const BATCH_SIZE = 50;
let totalSent = 0;
let totalErrors = 0;

for (let i = 0; i < toSend.length; i += BATCH_SIZE) {
  const batch = toSend.slice(i, i + BATCH_SIZE);

  const events = batch.map(lead => {
    const userData = {};
    if (lead.phone) userData.ph = [sha256(lead.phone)];
    if (lead.email) userData.em = [sha256(lead.email)];

    return {
      event_name: 'Lead',
      event_time: eventTime,
      action_source: 'system_generated',
      user_data: userData,
      custom_data: {
        value: RATING_VALUE_MAP[lead.rating],
        currency: 'INR',
        content_name: `${lead.segment} - Rating ${lead.rating}`,
      },
    };
  });

  const result = await sendBatch(events);

  if (result.error) {
    console.error(`Batch ${Math.floor(i / BATCH_SIZE) + 1} error: ${result.error.message}`);
    totalErrors += batch.length;
  } else {
    console.log(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${result.events_received} events received`);
    // mark as sent
    batch.forEach(lead => {
      sentLog[lead.key] = {
        name: lead.name,
        segment: lead.segment,
        rating: lead.rating,
        value: RATING_VALUE_MAP[lead.rating],
        sentAt: new Date().toISOString(),
      };
    });
    totalSent += batch.length;
  }

  // small delay between batches
  if (i + BATCH_SIZE < toSend.length) {
    await new Promise(r => setTimeout(r, 500));
  }
}

saveSentLog(sentLog);

console.log(`\n✓ Done. Sent: ${totalSent} · Errors: ${totalErrors}`);
console.log(`Positive signals (3+4+5): ${dist[3] + dist[4] + dist[5]} leads — Meta optimizes toward these profiles`);
console.log(`Negative signals (2 — NI on call): ${dist[2]} leads — Meta deprioritizes these profiles`);
console.log(`Skipped (TMT rating 1 + YTC blank): not sent — unreachable/untried ≠ wrong persona`);
console.log(`Sent log updated: ${SENT_LOG}`);
