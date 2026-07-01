import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const token = process.env.META_TOKEN;

async function searchPos(q) {
  const p = new URLSearchParams({ type: 'adworkposition', q, access_token: token, limit: 20 });
  const r = await fetch(`https://graph.facebook.com/v19.0/search?${p}`);
  const d = await r.json();
  return d.data || [];
}

const queries = [
  'retired', 'retiree', 'pension', 'ex-serviceman', 'ex-government',
  'government servant', 'bank employee', 'banker', 'LIC', 'insurance agent',
  'teacher retired', 'army', 'military', 'ex army', 'defense',
  'ex employee', 'former employee', 'housewife', 'homemaker',
  'stay at home', 'home maker', 'full time mother', 'mother',
];

for (const q of queries) {
  const items = await searchPos(q);
  const relevant = items.filter(i =>
    !i.name.match(/designer|developer|engineer|programmer|coder|writer|artist|musician|chef|doctor|nurse|lawyer|police|fire|teacher(?! ret)/i)
  );
  if (relevant.length) {
    console.log(`\n"${q}":`);
    relevant.forEach(i => console.log(`  [${i.id}] ${i.name}`));
  }
}
