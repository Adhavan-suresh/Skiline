import 'dotenv/config';
const token = process.env.META_TOKEN;
const accountId = process.env.AD_ACCOUNT_ID;

// Campaign-level budget (CBO?)
const camps = await fetch(`https://graph.facebook.com/v19.0/${accountId}/campaigns?fields=name,daily_budget,lifetime_budget,bid_strategy,budget_remaining&access_token=${token}`).then(r=>r.json());
console.log('=== CAMPAIGNS (budget) ===');
for (const c of (camps.data||[])) {
  console.log(`${c.name}`);
  console.log(`  daily_budget: ${c.daily_budget||'(none - ABO)'} | lifetime: ${c.lifetime_budget||'-'} | bid: ${c.bid_strategy||'-'}`);
}

// Adset-level budget (ABO?)
const adsets = await fetch(`https://graph.facebook.com/v19.0/${accountId}/adsets?fields=name,daily_budget,lifetime_budget,bid_strategy,optimization_goal&access_token=${token}`).then(r=>r.json());
console.log('\n=== AD SETS (budget) ===');
for (const a of (adsets.data||[])) {
  console.log(`${a.name}`);
  console.log(`  daily_budget: ${a.daily_budget?('₹'+a.daily_budget/100):'(none - CBO)'} | opt_goal: ${a.optimization_goal||'-'} | bid: ${a.bid_strategy||'-'}`);
}
