import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const token = process.env.META_TOKEN;

async function s(type, q) {
  const p = new URLSearchParams({ type, q, access_token: token, limit: 20 });
  const r = await fetch(`https://graph.facebook.com/v19.0/search?${p}`);
  const d = await r.json();
  return d.data || [];
}

// Work positions
for (const q of ['VRS', 'voluntary retirement', 'early retirement', 'voluntary retired', 'ex-serviceman', 'ex serviceman', 'government retired', 'PSU', 'public sector']) {
  const items = await s('adworkposition', q);
  if (items.length) {
    console.log(`\nWork Position "${q}":`);
    items.forEach(i => console.log(`  [${i.id}] ${i.name}`));
  }
}

// Interests
for (const q of ['VRS', 'voluntary retirement', 'ex serviceman', 'government employee', 'public sector']) {
  const items = await s('adinterest', q);
  if (items.length) {
    console.log(`\nInterest "${q}":`);
    items.slice(0, 8).forEach(i => console.log(`  [${i.id}] ${i.name} [~${((i.audience_size_lower_bound||0)/1e6).toFixed(1)}M]`));
  }
}
