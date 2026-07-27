import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const TOKEN   = process.env.META_TOKEN;
const PAGE_ID = process.env.PAGE_ID;
const BASE    = 'https://graph.facebook.com/v19.0';

// Get page token
const pageData = await fetch(`${BASE}/${PAGE_ID}?fields=access_token&access_token=${TOKEN}`).then(r => r.json());
if (pageData.error) { console.error('Page token error:', pageData.error.message); process.exit(1); }
const pt = pageData.access_token;

// Subscribe app to page leadgen events
const body = new URLSearchParams({ subscribed_fields: 'leadgen', access_token: pt });
const res = await fetch(`${BASE}/${PAGE_ID}/subscribed_apps`, { method: 'POST', body }).then(r => r.json());

if (res.success) {
  console.log('✓ App subscribed to page leadgen events. Webhook is live.');
} else {
  console.error('Failed:', JSON.stringify(res));
}
