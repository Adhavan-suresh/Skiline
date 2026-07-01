import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const token = process.env.META_TOKEN;
const AD_ACCOUNT = process.env.AD_ACCOUNT_ID;
const RETIREES_FORM = '2370602070099137';

// Try variant 1: no filter
async function try1() {
  const rule = JSON.stringify({
    inclusions: {
      operator: 'or',
      rules: [{
        event_sources: [{ id: RETIREES_FORM, type: 'leadgen' }],
        retention_seconds: 7776000
      }]
    }
  });
  const body = new URLSearchParams({ name: 'Test Excl v1', subtype: 'ENGAGEMENT', rule, access_token: token });
  const r = await fetch(`https://graph.facebook.com/v19.0/${AD_ACCOUNT}/customaudiences`, { method: 'POST', body });
  const d = await r.json();
  console.log('v1 (no filter):', d.id || d.error?.message);
  if (d.id) await cleanup(d.id);
}

// Try variant 2: page-based engagement with leadgen
async function try2() {
  const rule = JSON.stringify({
    inclusions: {
      operator: 'or',
      rules: [{
        event_sources: [{ id: RETIREES_FORM, type: 'leadgen' }],
        retention_seconds: 7776000,
        filter: { operator: 'and', filters: [{ field: 'event', operator: 'eq', value: 'lead_gen_submit' }] }
      }]
    }
  });
  const body = new URLSearchParams({ name: 'Test Excl v2', subtype: 'ENGAGEMENT', rule, access_token: token });
  const r = await fetch(`https://graph.facebook.com/v19.0/${AD_ACCOUNT}/customaudiences`, { method: 'POST', body });
  const d = await r.json();
  console.log('v2 (lead_gen_submit):', d.id || d.error?.message);
  if (d.id) await cleanup(d.id);
}

// Try variant 3: use page as source, filter by form
async function try3() {
  const PAGE_ID = process.env.PAGE_ID;
  const rule = JSON.stringify({
    inclusions: {
      operator: 'or',
      rules: [{
        event_sources: [{ id: PAGE_ID, type: 'page' }],
        retention_seconds: 7776000,
        filter: {
          operator: 'and',
          filters: [{ field: 'event', operator: 'eq', value: 'lead' }]
        }
      }]
    }
  });
  const body = new URLSearchParams({ name: 'Test Excl v3', subtype: 'ENGAGEMENT', rule, access_token: token });
  const r = await fetch(`https://graph.facebook.com/v19.0/${AD_ACCOUNT}/customaudiences`, { method: 'POST', body });
  const d = await r.json();
  console.log('v3 (page source, lead event):', d.id || d.error?.message);
  if (d.id) await cleanup(d.id);
}

async function cleanup(id) {
  await fetch(`https://graph.facebook.com/v19.0/${id}`, {
    method: 'DELETE',
    body: new URLSearchParams({ access_token: token })
  });
  console.log(`  (cleaned up test audience ${id})`);
}

await try1();
await try2();
await try3();
