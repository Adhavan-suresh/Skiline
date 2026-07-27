import 'dotenv/config';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..', '..');

const TOKEN   = process.env.META_TOKEN;
const PAGE_ID = process.env.PAGE_ID;
const BASE    = 'https://graph.facebook.com/v19.0';

const config  = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'campaign-config.json'), 'utf8'));
const FORM_ID = config.form_id;

async function main() {
  console.log('\n====================================================');
  console.log('   PULLING LATEST LEADS — SURAT LEADERS');
  console.log('====================================================\n');

  const pageData = await fetch(`${BASE}/${PAGE_ID}?fields=access_token,name&access_token=${TOKEN}`).then(r => r.json());
  if (pageData.error) throw new Error(pageData.error.message);
  console.log(`Page: ${pageData.name}\n`);
  const pageToken = pageData.access_token;

  const formMeta = await fetch(`${BASE}/${FORM_ID}?fields=name,leads_count,status&access_token=${pageToken}`).then(r => r.json());
  if (formMeta.error) throw new Error(formMeta.error.message);
  console.log(`Form: ${formMeta.name}`);
  console.log(`Total leads: ${formMeta.leads_count}\n`);

  let leadsUrl = `${BASE}/${FORM_ID}/leads?fields=created_time,field_data&limit=1000&access_token=${pageToken}`;
  const allLeads = [];
  while (leadsUrl) {
    const page = await fetch(leadsUrl).then(r => r.json());
    if (page.data) allLeads.push(...page.data);
    leadsUrl = page.paging?.next || null;
  }

  const leads = allLeads
    .map(lead => {
      const fields = {};
      for (const fd of lead.field_data) {
        fields[fd.name] = Array.isArray(fd.values) ? fd.values[0] : fd.value;
      }
      return {
        time:     lead.created_time,
        name:     fields.full_name || fields.name || 'N/A',
        phone:    fields.phone_number || 'N/A',
        email:    fields.email || 'N/A',
        timeline: fields['how_soon_are_you_looking_to_start?'] || fields['how_soon_are_you_looking_to_start_'] || 'N/A',
      };
    })
    .sort((a, b) => new Date(b.time) - new Date(a.time));

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  const recent = leads.filter(l => new Date(l.time) >= yesterday);

  console.log(`====================================================`);
  console.log(`LEADS SINCE YESTERDAY (${yesterday.toISOString().split('T')[0]}): ${recent.length}\n`);

  const display = recent.length > 0 ? recent : leads.slice(0, 10);
  if (recent.length === 0) console.log('No new leads. Showing 10 most recent:\n');

  display.forEach((l, i) => {
    console.log(`${i + 1}. ${l.name}`);
    console.log(`   Date:     ${new Date(l.time).toLocaleString('en-IN')}`);
    console.log(`   Phone:    ${l.phone}`);
    console.log(`   Email:    ${l.email}`);
    console.log(`   Timeline: ${l.timeline}`);
    console.log();
  });
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
