import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const TOKEN = process.env.META_TOKEN;

// Phase 1 winning ads + Phase 2 current ads
const AD_IDS = [
  '120244281474820744', // Housewives Ad 2 — Back to Work [VAR 2A]  ₹13.68 CPL
  '120243886038650744', // Housewives Ad 1 — Skills                  ₹12.29 CPL
  '120243886041980744', // Retired Ad 3 — Not Done                   ₹17.54 CPL
  '120243886042520744', // Retired Ad 4 — Work From Home             ₹20.92 CPL
  '120248587937800744', // Skiline – Housewives – Phase 2 (current)
  '120248587938210744', // Skiline – Retirees – Phase 2 (current)
];

for (const id of AD_IDS) {
  const res = await fetch(
    `https://graph.facebook.com/v19.0/${id}?fields=name,creative{id,name,body,title,image_url,image_hash,call_to_action_type,link_url,object_url}&access_token=${TOKEN}`
  );
  const data = await res.json();
  console.log('\n─────────────────────────────────────');
  console.log('AD:', data.name);
  console.log('Creative ID:', data.creative?.id);
  console.log('Title:', data.creative?.title);
  console.log('Body:', data.creative?.body);
  console.log('CTA:', data.creative?.call_to_action_type);
  console.log('Image URL:', data.creative?.image_url);
  console.log('Image Hash:', data.creative?.image_hash);
  if (data.error) console.error('Error:', data.error.message);
}
