import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { writeFileSync } from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const TOKEN = process.env.META_TOKEN;
const ACCOUNT = process.env.AD_ACCOUNT_ID; // act_3225406054192289

async function get(url) {
  const res = await fetch(url);
  return res.json();
}

// 1. All campaigns
const campaigns = await get(
  `https://graph.facebook.com/v19.0/${ACCOUNT}/campaigns?fields=id,name,status,effective_status,objective,daily_budget,lifetime_budget,bid_strategy&limit=50&access_token=${TOKEN}`
);

// 2. All ad sets with targeting
const adsets = await get(
  `https://graph.facebook.com/v19.0/${ACCOUNT}/adsets?fields=id,name,status,effective_status,daily_budget,lifetime_budget,optimization_goal,bid_strategy,targeting,campaign_id,start_time,end_time,created_time&limit=50&access_token=${TOKEN}`
);

// 3. All ads
const ads = await get(
  `https://graph.facebook.com/v19.0/${ACCOUNT}/ads?fields=id,name,status,effective_status,adset_id,campaign_id,creative{id,name,image_url,body,title,call_to_action_type}&limit=100&access_token=${TOKEN}`
);

// 4. Insights last 90 days — ad set level
const insights = await get(
  `https://graph.facebook.com/v19.0/${ACCOUNT}/insights?level=adset&fields=adset_id,adset_name,campaign_name,spend,impressions,clicks,ctr,cpm,cpc,reach,frequency,actions&date_preset=last_90d&limit=50&access_token=${TOKEN}`
);

// 4b. Insights last 90 days — ad level
const adInsights = await get(
  `https://graph.facebook.com/v19.0/${ACCOUNT}/insights?level=ad&fields=ad_id,ad_name,adset_name,campaign_name,spend,impressions,clicks,ctr,cpm,cpc,reach,frequency,actions&date_preset=last_90d&limit=100&access_token=${TOKEN}`
);

const out = { campaigns: campaigns.data, adsets: adsets.data, ads: ads.data, insights: insights.data, adInsights: adInsights.data };
writeFileSync(path.join(__dirname, '..', 'output', 'targeting-audit.json'), JSON.stringify(out, null, 2));
console.log(`Campaigns: ${campaigns.data?.length}`);
console.log(`Ad sets:   ${adsets.data?.length}`);
console.log(`Ads:       ${ads.data?.length}`);
console.log(`Insight rows (adset): ${insights.data?.length}`);
console.log(`Insight rows (ad):    ${adInsights.data?.length}`);
if (campaigns.error) console.error('Campaign error:', campaigns.error);
if (adsets.error)    console.error('Adset error:', adsets.error);
