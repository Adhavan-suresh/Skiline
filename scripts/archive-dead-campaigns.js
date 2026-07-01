import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const token = process.env.META_TOKEN;
const AD_ACCOUNT = process.env.AD_ACCOUNT_ID;

// Get all campaigns
const p = new URLSearchParams({ fields: 'name,status,effective_status', limit: '50', access_token: token });
const r = await fetch(`https://graph.facebook.com/v19.0/${AD_ACCOUNT}/campaigns?${p}`);
const d = await r.json();

const toArchive = d.data.filter(c =>
  c.name.includes('Ashok Nagar AB Test') ||
  c.name.includes('Chennai — 2M') ||
  c.name.includes('Chennai - 2M')
);

console.log('Campaigns to archive:');
toArchive.forEach(c => console.log(`  [${c.id}] ${c.name} — ${c.effective_status}`));

for (const c of toArchive) {
  const body = new URLSearchParams({ status: 'ARCHIVED', access_token: token });
  const res = await fetch(`https://graph.facebook.com/v19.0/${c.id}`, { method: 'POST', body });
  const result = await res.json();
  console.log(`\n${c.name}: ${result.success ? '✅ Archived' : '❌ ' + result.error?.message}`);
}
