import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const TOKEN = process.env.META_TOKEN;

async function post(id, body) {
  const params = new URLSearchParams({ ...body, access_token: TOKEN });
  const res = await fetch(`https://graph.facebook.com/v19.0/${id}`, {
    method: 'POST', body: params,
  });
  return res.json();
}

// Step 4: Update budgets (paise = INR * 100)
// HW Phase 2: ₹250/day = 25000 paise
const hwBudget = await post('120248587937010744', { daily_budget: '25000' });
console.log('HW Phase 2 budget update:', hwBudget.success ? '✓ ₹250/day' : JSON.stringify(hwBudget));

// Ret Phase 2: ₹150/day = 15000 paise
const retBudget = await post('120248587937540744', { daily_budget: '15000' });
console.log('Ret Phase 2 budget update:', retBudget.success ? '✓ ₹150/day' : JSON.stringify(retBudget));

// Step 8: Archive Broad No-LAL ad sets
const archiveHW = await post('120249174340360744', { status: 'ARCHIVED' });
console.log('Archive HW Broad:', archiveHW.success ? '✓ Archived' : JSON.stringify(archiveHW));

const archiveRet = await post('120249174335980744', { status: 'ARCHIVED' });
console.log('Archive Ret Broad:', archiveRet.success ? '✓ Archived' : JSON.stringify(archiveRet));
