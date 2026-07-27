import 'dotenv/config';

const TOKEN = process.env.META_TOKEN;
const PAGE_ID = process.env.PAGE_ID;
const BASE = 'https://graph.facebook.com/v19.0';

async function main() {
  console.log('\n╔════════════════════════════════════════════════════╗');
  console.log('║   PULLING LATEST LEADS FROM RETIREES SEGMENT       ║');
  console.log('╚════════════════════════════════════════════════════╝\n');

  try {
    const pageData = await fetch(`${BASE}/${PAGE_ID}?fields=access_token,name&access_token=${TOKEN}`).then(r=>r.json());
    if (pageData.error) throw new Error(pageData.error.message);
    console.log(`✅ Found page: ${pageData.name}\n`);
    const pageToken = pageData.access_token;

    // Get lead forms
    const formsReq = await fetch(`${BASE}/${PAGE_ID}/leadgen_forms?fields=id,name,leads_count,status&limit=50&access_token=${pageToken}`);
    const formsData = await formsReq.json();
    
    if (formsData.error) {
      throw new Error(formsData.error.message);
    }

    console.log(`📋 Found ${formsData.data.length} lead form(s)\n`);

    // Get all leads from all forms
    const allLeads = [];
    for (const form of formsData.data) {
      console.log(`📝 Form: ${form.name} (${form.leads_count} total leads)`);
      
      if (parseInt(form.leads_count) > 0) {
        let leadsUrl = `${BASE}/${form.id}/leads?fields=created_time,field_data&limit=1000&access_token=${pageToken}`;
        const allFormLeads = [];
        while (leadsUrl) {
          const leadsData = await fetch(leadsUrl).then(r => r.json());
          if (leadsData.data) allFormLeads.push(...leadsData.data);
          leadsUrl = leadsData.paging?.next || null;
        }
        const leadsData = { data: allFormLeads };

        if (leadsData.data) {
          for (const lead of leadsData.data) {
            const fields = {};
            for (const fd of lead.field_data) {
              // Handle both 'values' array and single value
              fields[fd.name] = Array.isArray(fd.values) ? fd.values[0] : fd.value;
            }
            allLeads.push({
              time: lead.created_time,
              formName: form.name,
              name: fields.full_name || fields.name || 'N/A',
              phone: fields.phone_number || 'N/A',
              email: fields.email || 'N/A'
            });
          }
        }
      }
    }

    // Sort by date (newest first)
    allLeads.sort((a, b) => new Date(b.time) - new Date(a.time));

    // Filter for leads since yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const recentLeads = allLeads.filter(l => new Date(l.time) >= yesterday);

    console.log(`\n════════════════════════════════════════════════════`);
    console.log(`\n✅ LATEST LEADS SINCE YESTERDAY (${yesterday.toISOString().split('T')[0]})\n`);
    console.log(`Total Recent Leads: ${recentLeads.length}\n`);

    if (recentLeads.length > 0) {
      recentLeads.forEach((l, i) => {
        const date = new Date(l.time).toLocaleString();
        console.log(`${i + 1}. ${l.name}`);
        console.log(`   Date:  ${date}`);
        console.log(`   Phone: ${l.phone}`);
        console.log(`   Email: ${l.email}`);
        console.log(`   Form:  ${l.formName}`);
        console.log();
      });
    } else {
      console.log('ℹ️  No new leads since yesterday\n');
      console.log('📊 ALL LEADS (Most Recent):\n');
      allLeads.slice(0, 10).forEach((l, i) => {
        const date = new Date(l.time).toLocaleString();
        console.log(`${i + 1}. ${l.name}`);
        console.log(`   Date:  ${date}`);
        console.log(`   Phone: ${l.phone}`);
        console.log(`   Email: ${l.email}`);
        console.log();
      });
    }

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

main();
