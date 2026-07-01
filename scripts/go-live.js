import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const TOKEN = process.env.META_TOKEN;

async function post(id, params) {
  const body = new URLSearchParams({ ...params, access_token: TOKEN });
  const res = await fetch(`https://graph.facebook.com/v19.0/${id}`, { method: 'POST', body });
  return res.json();
}

// Resume ad sets
const hwAdset  = await post('120248587937010744', { status: 'ACTIVE' });
const retAdset = await post('120248587937540744', { status: 'ACTIVE' });

// Activate the new 2nd ads
const hwAd2  = await post('120249874343940744', { status: 'ACTIVE' });
const retAd2 = await post('120249874344420744', { status: 'ACTIVE' });

console.log('HW ad set live:   ', hwAdset.success  ? '✓' : JSON.stringify(hwAdset));
console.log('Ret ad set live:  ', retAdset.success ? '✓' : JSON.stringify(retAdset));
console.log('HW 2nd ad active: ', hwAd2.success    ? '✓' : JSON.stringify(hwAd2));
console.log('Ret 2nd ad active:', retAd2.success   ? '✓' : JSON.stringify(retAd2));
