import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const token = process.env.META_TOKEN;

async function search(type, q = '', cls = '') {
  const p = new URLSearchParams({ type, access_token: token, limit: 500 });
  if (q) p.set('q', q);
  if (cls) p.set('class', cls);
  const r = await fetch(`https://graph.facebook.com/v19.0/search?${p}`);
  const d = await r.json();
  if (d.error) return [];
  return d.data || [];
}

async function searchInterests(queries) {
  const results = {};
  for (const q of queries) {
    const items = await search('adinterest', q);
    results[q] = items.map(i => ({ id: i.id, name: i.name, audience_size: i.audience_size_lower_bound }));
  }
  return results;
}

function print(label, items) {
  console.log(`\n${'─'.repeat(70)}`);
  console.log(`${label} (${items.length} results)`);
  console.log('─'.repeat(70));
  for (const i of items) {
    const size = i.audience_size_lower_bound
      ? ` [audience ~${(i.audience_size_lower_bound/1000000).toFixed(1)}M]`
      : i.audience_size
      ? ` [audience ~${(i.audience_size/1000000).toFixed(1)}M]`
      : '';
    const path = i.path ? ` > ${i.path.join(' > ')}` : '';
    console.log(`  [${i.id}] ${i.name}${path}${size}`);
  }
}

console.log('═'.repeat(70));
console.log('META ADS TARGETING TAXONOMY — FULL DUMP');
console.log('═'.repeat(70));

// ── FIXED ENUM FIELDS ────────────────────────────────────────────────────────
console.log('\n\n━━━ FIXED ENUM FIELDS (no API lookup needed) ━━━\n');

console.log('[GENDERS]');
console.log('  1 = Male');
console.log('  2 = Female');
console.log('  (omit field = All)');

console.log('\n[RELATIONSHIP_STATUSES]');
console.log('  1 = Single');
console.log('  2 = In a relationship');
console.log('  3 = Married');
console.log('  4 = Engaged');
console.log('  6 = Separated');
console.log('  7 = Divorced');
console.log('  8 = Widowed');

console.log('\n[EDUCATION_STATUSES]');
console.log('  1  = High school in progress');
console.log('  2  = High school grad');
console.log('  3  = College in progress');
console.log('  4  = College grad (Associate degree)');
console.log('  5  = Some college');
console.log('  6  = Some grad school');
console.log('  7  = Grad school in progress');
console.log('  8  = Masters degree');
console.log('  9  = Professional degree');
console.log('  10 = Doctorate degree');
console.log('  13 = In college');
console.log('  14 = Undergrad');

console.log('\n[LOCATION_TYPES]');
console.log('  home    = People who live here');
console.log('  recent  = People recently in this location');
console.log('  travel_in = Travelers currently here');

console.log('\n[AGE]');
console.log('  age_min: 18–65  |  age_max: 18–65 (65 = 65+, no true cap)');

// ── DEMOGRAPHICS CATEGORY ────────────────────────────────────────────────────
console.log('\n\n━━━ DEMOGRAPHICS (Meta taxonomy) ━━━');
const demographics = await search('adTargetingCategory', '', 'demographics');
print('ALL DEMOGRAPHICS', demographics);

// ── LIFE EVENTS ───────────────────────────────────────────────────────────────
console.log('\n\n━━━ LIFE EVENTS ━━━');
const lifeEvents = await search('adTargetingCategory', '', 'life_events');
print('ALL LIFE EVENTS', lifeEvents);

// ── FAMILY STATUSES ───────────────────────────────────────────────────────────
console.log('\n\n━━━ FAMILY STATUSES ━━━');
const familyStatuses = await search('adTargetingCategory', '', 'family_statuses');
print('ALL FAMILY STATUSES', familyStatuses);

// ── BEHAVIORS ────────────────────────────────────────────────────────────────
console.log('\n\n━━━ BEHAVIORS ━━━');
const behaviors = await search('adTargetingCategory', '', 'behaviors');
print('ALL BEHAVIORS', behaviors);

// ── INTERESTS — RETIREES ─────────────────────────────────────────────────────
console.log('\n\n━━━ INTERESTS — RETIREES ━━━');
const retireeQueries = [
  'retirement', 'retired', 'pension', 'senior citizen', 'part-time',
  'mutual fund', 'insurance', 'financial planning', 'investment',
  'second income', 'passive income', 'job hunting', 'telecommuting',
  'work from home', 'small business', 'entrepreneurship',
];
for (const q of retireeQueries) {
  const items = await search('adinterest', q);
  if (items.length) print(`Interests: "${q}"`, items.slice(0, 15));
}

// ── INTERESTS — HOUSEWIVES ────────────────────────────────────────────────────
console.log('\n\n━━━ INTERESTS — HOUSEWIVES ━━━');
const hwQueries = [
  'homemaking', 'housewife', 'stay at home', 'work from home',
  'women empowerment', 'financial independence', 'network marketing',
  'direct selling', 'entrepreneurship', 'parenting', 'family',
  'cooking', 'home business', 'extra income', 'self employment',
];
for (const q of hwQueries) {
  const items = await search('adinterest', q);
  if (items.length) print(`Interests: "${q}"`, items.slice(0, 15));
}

// ── WORK POSITIONS ────────────────────────────────────────────────────────────
console.log('\n\n━━━ WORK POSITIONS (relevant) ━━━');
const posQueries = ['retired', 'homemaker', 'housewife', 'self employed', 'freelance', 'consultant'];
for (const q of posQueries) {
  const items = await search('adworkposition', q);
  if (items.length) print(`Work Position: "${q}"`, items.slice(0, 10));
}

// ── INDUSTRIES ────────────────────────────────────────────────────────────────
console.log('\n\n━━━ INDUSTRIES ━━━');
const industries = await search('adTargetingCategory', '', 'industries');
print('ALL INDUSTRIES', industries);

console.log('\n\n' + '═'.repeat(70));
console.log('END OF TAXONOMY DUMP');
console.log('═'.repeat(70));
