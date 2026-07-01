import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const token = process.env.META_TOKEN;
const AD_ACCOUNT = process.env.AD_ACCOUNT_ID;

const params = new URLSearchParams({ fields: 'name,effective_status', limit: '100', access_token: token });
params.append('effective_status[]', 'ACTIVE');

const r = await fetch(`https://graph.facebook.com/v19.0/${AD_ACCOUNT}/adsets?${params}`);
const d = await r.json();

console.log(`Active ad sets found: ${d.data.length}`);

for (const s of d.data) {
  const body = new URLSearchParams({ status: 'PAUSED', access_token: token });
  const res = await fetch(`https://graph.facebook.com/v19.0/${s.id}`, { method: 'POST', body });
  const result = await res.json();
  console.log(`${s.name}: ${result.success ? '✅ Paused' : '❌ ' + result.error?.message}`);
}
