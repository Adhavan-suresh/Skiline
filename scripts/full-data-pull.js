import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const token = process.env.META_TOKEN;
const AD_ACCOUNT = process.env.AD_ACCOUNT_ID;

// ── All ad sets lifetime ──────────────────────────────────────────────────────
const p = new URLSearchParams({
  fields: [
    'name','status','effective_status','created_time',
    'daily_budget','campaign_id',
    'insights.date_preset(last_90d){spend,impressions,reach,frequency,actions,cpm,ctr,cpp,cost_per_action_type,date_start,date_stop}'
  ].join(','),
  limit: '100',
  access_token: token
});
['ACTIVE','PAUSED','ARCHIVED'].forEach(s => p.append('effective_status[]', s));

const r = await fetch(`https://graph.facebook.com/v19.0/${AD_ACCOUNT}/adsets?${p}`);
const d = await r.json();
if (d.error) { console.error(d.error.message); process.exit(1); }

// ── Weekly breakdown for active Chennai sets ─────────────────────────────────
const weeklyData = {};
const weekRanges = [
  { label: 'Jun 22–28', since: '2026-06-22', until: '2026-06-28' },
  { label: 'Jun 15–21', since: '2026-06-15', until: '2026-06-21' },
  { label: 'Jun 8–14',  since: '2026-06-08', until: '2026-06-14' },
  { label: 'Jun 1–7',   since: '2026-06-01', until: '2026-06-07' },
  { label: 'May 25–31', since: '2026-05-25', until: '2026-05-31' },
  { label: 'May 18–24', since: '2026-05-18', until: '2026-05-24' },
  { label: 'May 11–17', since: '2026-05-11', until: '2026-05-17' },
  { label: 'May 4–10',  since: '2026-05-04', until: '2026-05-10' },
];

const chennaiForms = ['2370602070099137', '1209496811207023'];
const accountInsightsUrl = (since, until) => {
  const wp = new URLSearchParams({
    fields: 'spend,impressions,actions',
    time_range: JSON.stringify({ since, until }),
    access_token: token,
    level: 'account'
  });
  return `https://graph.facebook.com/v19.0/${AD_ACCOUNT}/insights?${wp}`;
};

for (const w of weekRanges) {
  const wr = await fetch(accountInsightsUrl(w.since, w.until));
  const wd = await wr.json();
  const ins = wd.data?.[0];
  weeklyData[w.label] = {
    spend: parseFloat(ins?.spend || 0),
    impressions: parseInt(ins?.impressions || 0),
    leads: parseInt(ins?.actions?.find(a => a.action_type === 'lead')?.value || 0)
  };
}

// ── Campaign details ──────────────────────────────────────────────────────────
const campaignIds = [...new Set(d.data.map(s => s.campaign_id).filter(Boolean))];
const campaigns = {};
for (const cid of campaignIds) {
  const cr = await fetch(`https://graph.facebook.com/v19.0/${cid}?fields=name,status,objective&access_token=${token}`);
  campaigns[cid] = await cr.json();
}

// ── Build output ──────────────────────────────────────────────────────────────
const adsets = d.data.map(s => {
  const ins = s.insights?.data?.[0];
  const spend = parseFloat(ins?.spend || 0);
  const leads = parseInt(ins?.actions?.find(a => a.action_type === 'lead')?.value || 0);
  const imp = parseInt(ins?.impressions || 0);
  const reach = parseInt(ins?.reach || 0);
  const freq = parseFloat(ins?.frequency || 0);
  const cpm = parseFloat(ins?.cpm || 0);
  const ctr = parseFloat(ins?.ctr || 0);
  const cpl = leads > 0 ? spend / leads : 0;
  return {
    id: s.id, name: s.name, status: s.effective_status,
    created: s.created_time?.substring(0, 10),
    budget: parseInt(s.daily_budget || 0) / 100,
    campaign: campaigns[s.campaign_id]?.name || s.campaign_id,
    spend, leads, imp, reach, freq, cpm, ctr, cpl
  };
}).sort((a, b) => b.spend - a.spend);

console.log(JSON.stringify({ adsets, weeklyData }, null, 2));
