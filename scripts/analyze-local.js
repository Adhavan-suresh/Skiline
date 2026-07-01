// analyze-local.js
// Local demographic analysis of offline converted customer dataset
// Input:  assets/Advisors List -02.06.2026.xlsx
// Output: output/audience-demographics.html

import { writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const xlsxMod = await import('xlsx');
const XLSX = xlsxMod.default || xlsxMod;

// ─── Gender Dictionary ────────────────────────────────────────────────────────

const FEMALE = new Set([
  // Tamil / South Indian female
  'ANITHA','ANANDHI','AMBIKA','ARTHI','ANURADHA','AMSAVALLI','ALAMELU','AMUDHA',
  'BHAVANI','BRINDA',
  'CHITRA','CHELLAMMAL','CHITHRA','CHELLAM',
  'DEEPA','DEVI','DURGA','DHANALAKSHMI','DURGADEVI','DHIVYA','DIVYA',
  'ESWARI','EASWARI',
  'GEETHA','GOMATHI','GOWRI','GAYATHRI','GIRIJA','GEETHANJALI',
  'HEMA','HEMAVATHI','HARINI','HEMALATHA',
  'INDIRA','INDUMATHI','INDRANI',
  'JANAKI','JAYALAKSHMI','JAYANTHI','JOTHI','JAYA',
  'KAMALA','KAMALAM','KANNAMMA','KAVITHA','KALAISELVI','KALPANA','KOKILA',
  'KASTHURI','KUMARI','KAVERI','KEERTHANA','KIRUTHIKA','KANCHANA',
  'LAKSHMI','LALITHA','LEELA','LATHA','LAVANYA',
  'MALATHI','MANGAYARKARASI','MEENA','MEENAKSHI','MUTHULAKSHMI','MALLIKA',
  'MALARVIZHI','MAHALAKSHMI','MADHAVI','MANASA','MANGALA',
  'NALINI','NIRMALA','NITHYA','NAGALAKSHMI','NANDHINI','NIVEDHA',
  'OVIYA',
  'PADMA','PADMAVATHI','PADMAVATHY','PARVATHI','PONNI','PUSHPA','POONGOTHAI','PREMA',
  'PRIYA','POOJA','PREETHI','PRIYADARSHINI','PRIYANKA','PRABHA',
  'RADHA','RANI','REVATHI','ROHINI','RUKMANI','RADHAMANI','RAJALAKSHMI',
  'RAJESHWARI','RAMYA','RANJANI','REKHA',
  'SABITHA','SAROJA','SARASWATHI','SAVITHRI','SELVI','SHANTHI','SARANYA','SUMATHI',
  'SUJATHA','SUNDARI','SARADHA','SUBASHINI','SANGEETHA','SARASU',
  'SNEHA','SWATHI','SUDHA','SRIDEVI','SOWMYA','SRIVIDHYA','SUBHA','SUGANYA','SUSHMA',
  'TAMILARASI','TAMILSELVI','TAMILMANI','THENMOZHI','THULASI',
  'UMA','USHA','UMARANI','UMADEVI',
  'VALLI','VASANTHA','VIMALA','VIJAYA','VIJAYALAKSHMI','VASANTHI','VADIVU','VANITHA',
  'YAMUNA','YALINI','YAZHINI',
  'ZARINA','ZEENATH',
  // Pan-Indian female
  'NISHA','SUNITA','SEEMA','GEETA','SITA','MAYA','LATA','ASHA','NEHA','ANJALI',
  'SHALINI','KAVYA','SARITA','MAMTA','RITA','MALA','SWATI','ANANYA',
  'ARCHANA','ARUNA','BHARATHI','BHAVANA','BINDHU','DARSHANA','DEEPIKA',
  'LEKHA','NANDHA','NANDITHA','NIVEDITHA','RACHANA','RAGINI','RAJESWARI',
  'RATHNA','SAVITHA','SHARMILA','SHOBHA','SHOBHANA','SHRUTI','THIRUMATHI','VENNILA',
  // Christian female
  'MARY','MARGARET','ELIZABETH','ROSE','GRACE','GLORIA','ANGELA','CAROLINE','JOSEPHINE',
  'MARIA','ANNIE','ALICE','HELEN','RUBY','STELLA','SHEELA','SHERLY','LUCY',
  'CECILIA','CLARA','DIANA','ESTHER','FLORA','IRENE','LILLIAN','LISA',
  'LYDIA','PATRICIA','RACHEL','REBECCA','SARAH','SOPHIA','TERESA','THERESA','VICTORIA',
  // Muslim female
  'FATHIMA','FATIMA','NOORJAHAN','AYESHA','ZUBEDA','HAFSA','MARIYAM','RABIYA',
  'HASEENA','AMINA','ASMATH','BEGUM','HAJIRA','KHADEEJA','MUMTAZ','NUSRATH',
  'ROSHAN','SAFIYA','SAKINA','SHAHEEN','SHAJIDA','SUHANA','SULEKHA','TAHIRA','YASMIN',
  'BANU','BIBI','SULTHANA','NOORJAHAN',
]);

const MALE = new Set([
  // Tamil male
  'ARUMUGAM','ANBAZHAGAN','ARJUNAN','ARUNACHALAM','ANBUCHELVAN','ARULRAJ','ARULMURUGAN','ARUL',
  'BALASUBRAMANIAN','BALAN','BALAKRISHNAN','BABU','BHASKARAN','BALAJI','BALA',
  'CHANDRAN','CHIDAMBARAM','CHELLAPANDI','CHINNASWAMY','CHELLAPPAN',
  'CHANDRASEKARAN','CHANDRASEKAR','CHANDRASEKHARAN',
  'DURAI','DURAIPANDI','DURAISAMY','DEVARAJAN','DHANAPAL','DHARMARAJ','DHANASEKARAN','DINESH',
  'ELANGO','ESWARAN','ELUMALAI',
  'GANESAN','GANESH','GOPAL','GOPINATH','GOVINDASAMY','GURUNATHAN','GUNASEKARAN','GURUMOORTHY',
  'HARI','HARIHARAN','HARISH',
  'ILANGO','ILAYARAJA',
  'JAYAKUMAR','JAYARAMAN','JEYAKUMAR',
  'KAMAL','KARTHIK','KARTHIKEYAN','KRISHNAMURTHY','KRISHNAN','KUMARAVEL','KUMARESAN',
  'KANNAN','KASIVISWANATHAN','KALIYAMURTHY','KRISHNASWAMY','KUMARAN','KALIMUTHU','KRISHNA',
  'LINGAM','LOGANATHAN','LOGESH',
  'MANI','MANICKAM','MARIMUTHU','MURALI','MURUGAN','MURUGAVEL','MUTHUKRISHNAN',
  'MUTHU','MUTHUSAMY','MUTHURAMAN','MURUGANANTHAM','MANIKANDAN','MANIVANNAN','MANOHARAN',
  'MAHADEVAN','MAHENDRAN','MAHESH',
  'NARAYANAN','NATARAJAN','NATRAJAN','NATESAN','NALLATHAMBI','NAGARAJAN',
  'PALANI','PALANISAMY','PALANIVEL','PANDIAN','PERIASAMY','PRABHU','PRABU','PRASAD','PANDI',
  'PRABHAKARAN','PREMKUMAR','PERUMAL',
  'RAJAGOPAL','RAJAGOPALAN','RAJAMANICKAM','RAJAN','RAJENDRAN','RAJESH','RAJKUMAR',
  'RAVI','RAVISHANKAR','RAMACHANDRAN','RAMESH','RAMALINGAM','RAVICHANDRAN','RAMASAMY',
  'RAMAMOORTHY','RAMAKRISHNAN','RAMASUBRAMANIAN','RAMANATHAN','RANGARAJAN','RAMANA','RAMAN',
  'RAMA','RAM','RAJU',
  'SELVAM','SELVARAJ','SENTHIL','SENTHILKUMAR','SHANKAR','SHANMUGAM','SANKAR','SANKARA',
  'SIVASUBRAMANIAN','SIVAKUMAR','SUBRAMANIAN','SURESH','SETHURAMAN','SIVA',
  'SOUNDARARAJAN','SUNDARRAJ','SUBRAMANIAM','SUBBIAH','SUBBAIYAN',
  'SWAMINATHAN','SAMPATH','SARAVANAN','SRIDHARAN','SRINIVASAN','SESHADRI','SUDHAKAR',
  'SUNDARAM','SUNDARARAJAN','SUNDAR','SEKAR','SEKARAN',
  'THANGAVEL','THANGAVELU','THYAGARAJAN','THANGARAJ','THENNARASU','THIAGARAJAN',
  'UNNIKRISHNAN','UMAPATHY',
  'VELU','VENKATESH','VENKATARAMAN','VENKAT','VIJAY','VIJAYAKUMAR','VIJAYARAJ',
  'VISVANATHAN','VISWANATHAN','VENKATESAN','VARADHARAJAN','VEL',
  'ANIL','ARJUN','ASHOK','ANAND','ANNADURAI',
  // Pan-Indian male
  'KUMAR','RAJ','RAMESH','VINOD','VIPIN','SANJAY','AJAY','ROHIT','AMIT',
  'NITIN','PRADEEP','DEEPAK','MOHAN','SUNIL','ARUN','TARUN','VARUN','KIRAN',
  'ABHISHEK','AKASH','AKSHAY','AKHIL','ALOK','AMAN','AMITH',
  'BHASKAR','CHETAN','GIRISH','GOVINDAN',
  'JAGADISH','JAGADEESH','JEEVA','JEEVAN','KARTHI',
  'MADHAN','MADHAVAN','MADAN','MAGESH','NARESH','NAVEEN','NAVIN',
  'PRAKASH','PRAVEEN','RAGHU','RANJITH',
  'SATHISH','SATISH','SIVARAJ','SRIRAM','MURTHY',
  'UDHAYAKUMAR','UDHAYA','VETRI','VINAYAGAM','YUVARAJ','YUVAKUMAR',
  // Christian male
  'JOHN','JAMES','JOSEPH','GEORGE','THOMAS','PETER','PAUL','DAVID','MICHAEL',
  'FRANCIS','XAVIER','ANTONY','ANTHONY','BOSE','BOSCO','JUDE',
  'LAWRENCE','VINCENT','SEBASTIAN','STEPHEN','STEPHAN','STANLEY','SAMUEL','SOLOMON',
  'ALBERT','ALFRED','ANDREW','BENEDICT','CHARLES','CLEMENT','CYRIL',
  'DANIEL','DENNIS','DOMINIC','EDWARD','FELIX','GERALD','HENRY',
  'JEROME','KEVIN','MARTIN','MATHEW','MATTHEW','NICHOLAS',
  'PATRICK','PHILIP','RAYMOND','RICHARD','ROBERT','SIMON','TIMOTHY','VICTOR','WILLIAM',
  // Muslim male
  'MOHAMMED','MOHAMMAD','IBRAHIM','HAMEED','RASHEED','FAROOK','FAROOQ','ISMAIL',
  'HUSSAIN','HASSAN','ALI','SYED','KHALEEL','KHADER','SHAIK','SHEIKH',
  'ABDULLA','ABDULRAHMAN','ABRAR','AHAMED','AHMED','AKBAR','ALAUDDIN',
  'ARAFATH','ASGAR','ASHRAF','AYUB','AZEEM','AZIZ','BASHEER',
  'FAISAL','FAIZ','FARHAN','GANI','GHOUSE','HAFIZ','HAKIM',
  'IMRAN','IQBAL','IRFAN','JALALUDDIN','KALEEL','KAMRUDDIN','KHAN',
  'MEERAN','MUBARAK','MUSTHAFA','NAUSAD','NAWAZ','NIYAS',
  'RAHAMATHULLAH','RAHMAN','RAJAK','RIFAI','RIZWAN','SADIQ',
  'SATHAK','SHABUDEEN','SHAFEE','SHAHUL','SIRAJUDEEN','SULTAN',
  'TAHIR','UMAR','WAHAB','YASEEN','YUNUS','ZAKIR','ZUBAIR','RAHIM','RAZZAK','PEER',
]);

// Suffix-based fallbacks
const FEMALE_SUFFIXES = [
  'amma','ammal','vathi','selvi','devi','mathi','rani','valli',
  'lakshmi','meena','geetha','anitha','kavitha','nitha','revathi',
  'malathi','sumathi','priya','jothi','kumari','arasi','mozhi',
  'thenmozhi','hini','ambia','latha','hema',
];
const MALE_SUFFIXES = [
  'murugan','nathan','rajan','swamy','swami','samy','sami',
  'pandian','perumal','malai','velu','prasad',
  'babu','rao','das',
];

// Origin markers
const ISLAMIC = new Set([
  'MOHAMMED','MOHAMMAD','IBRAHIM','HAMEED','RASHEED','FAROOK','FAROOQ','ISMAIL',
  'HUSSAIN','HASSAN','ALI','SYED','KHALEEL','KHADER','SHAIK','SHEIKH','KHAN',
  'FATHIMA','FATIMA','AYESHA','MARIYAM','NOORJAHAN','BEGUM','AMINA','YASMIN',
  'ABDULLA','AHAMED','AHMED','AKBAR','ASHRAF','GANI','GHOUSE','IMRAN','IQBAL',
  'IRFAN','MEERAN','MUBARAK','MUSTHAFA','NAWAZ','NIYAS','RAHMAN','SHAHUL',
  'SULTAN','UMAR','YASEEN','YUNUS','ZAKIR','ZUBAIR','BANU','RAHIM','PEER',
]);

const CHRISTIAN = new Set([
  'JOHN','JAMES','JOSEPH','GEORGE','THOMAS','PETER','PAUL','DAVID','MICHAEL',
  'FRANCIS','XAVIER','ANTONY','ANTHONY','BOSE','BOSCO','JUDE',
  'LAWRENCE','VINCENT','SEBASTIAN','STEPHEN','STEPHAN','STANLEY','SAMUEL','SOLOMON',
  'ALBERT','ALFRED','ANDREW','BENEDICT','CHARLES','CLEMENT','CYRIL',
  'DANIEL','DENNIS','DOMINIC','EDWARD','FELIX','GERALD','HENRY',
  'JEROME','KEVIN','MARTIN','MATHEW','MATTHEW','NICHOLAS',
  'PATRICK','PHILIP','RAYMOND','RICHARD','ROBERT','SIMON','TIMOTHY','VICTOR','WILLIAM',
  'MARY','MARGARET','ELIZABETH','ROSE','GRACE','GLORIA','ANGELA','MARIA','ANNIE',
  'ALICE','HELEN','RUBY','STELLA','SHEELA','LUCY','DIANA','ESTHER','TERESA',
]);

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Try ALL words in name — handles "K KRISHNAN", "R SUBRAMANIAN", etc.
function classifyGender(fullName) {
  if (!fullName || typeof fullName !== 'string') return 'Unknown';
  const words = fullName.trim().toUpperCase().split(/[\s.]+/).filter(w => w.length > 1);
  for (const w of words) {
    if (FEMALE.has(w)) return 'Female';
    if (MALE.has(w)) return 'Male';
  }
  // Suffix check on each word
  for (const w of words) {
    const low = w.toLowerCase();
    for (const suf of FEMALE_SUFFIXES) if (low.endsWith(suf)) return 'Female';
    for (const suf of MALE_SUFFIXES) if (low.endsWith(suf)) return 'Male';
  }
  return 'Unknown';
}

function classifyOrigin(fullName) {
  if (!fullName || typeof fullName !== 'string') return 'Unknown';
  const words = fullName.trim().toUpperCase().split(/[\s.]+/).filter(w => w.length > 1);
  for (const w of words) {
    if (ISLAMIC.has(w)) return 'Islamic';
    if (CHRISTIAN.has(w)) return 'Christian';
  }
  // Tamil-specific markers
  const TAMIL = new Set([
    'ELANGO','MURUGAN','ARUMUGAM','SHANMUGAM','MARIMUTHU','ELUMALAI','PALANI',
    'DURAI','DURAISAMY','DURAIPANDI','KUMARESAN','CHELLAPANDI','PERIASAMY',
    'RAMASAMY','MUTHUKRISHNAN','MUTHUSAMY','MUTHURAMAN','ANNAMALAI',
    'TAMILSELVI','TAMILARASI','TAMILMANI','THENMOZHI','NALLATHAMBI',
    'KARUPPASAMY','KARUPPAIAH','KULANDAIVEL','VELU','PANDI','PANDIYAN',
    'GOVINDASAMY','SENTHILKUMAR','SENTHIL','SELVAM','SELVARAJ','THANGAVEL',
    'THANGAVELU','NATARAJAN','NATRAJAN','MANICKAM','MANI','ILANGO','DEVARAJAN',
    'POONGOTHAI','THENNARASU','CHELLAMMAL','KANNAMMA','PONNI',
    'VALLI','MALARVIZHI','MANGAYARKARASI','GURUMOORTHY','PERUMAL',
    'PALANISAMY','MANIVANNAN','ARUMUGAM','ARUNACHALAM','ARUL',
  ]);
  const SANSKRIT = new Set([
    'KRISHNAMURTHY','KRISHNAN','KRISHNASWAMY','VENKATARAMAN','VENKATESH','VENKATESAN',
    'RAMACHANDRAN','RAMALINGAM','NARAYANAN','SUBRAMANIAN','SUBRAMANIAM','BALASUBRAMANIAN',
    'THYAGARAJAN','THIAGARAJAN','SOUNDARARAJAN','LOGANATHAN','GURUNATHAN','JAYARAMAN',
    'SETHURAMAN','BALAKRISHNAN','VISWANATHAN','HARIHARAN','SIVASUBRAMANIAN',
    'VARADHARAJAN','CHANDRASEKARAN','CHANDRASEKAR','SWAMINATHAN','SRINIVASAN',
    'RANGARAJAN','RAMAMOORTHY','RAMAKRISHNAN','RAMASUBRAMANIAN','RAMANATHAN',
    'LAKSHMINARAYANAN','SUNDARARAJAN','SESHADRI','MAHADEVAN','GURUMOORTHY',
    'GOPAL','GOPINATH','SHANKAR','SANKAR','BHASKAR','PRASAD','MOHAN',
    'SUDHAKAR','MAHENDRAN','MADHAVAN','MAHESH','RAMESH','SURESH','NARESH',
    'VIJAY','RAJESH','AJAY','ASHOK','ARJUN','ANAND','HARI','HARISH',
    'DEEPAK','PRAKASH','ARUN','KIRAN','VARUN','VIVEK','BALAJI','BALA',
    'PRIYA','LAKSHMI','DEVI','GAYATHRI','PADMA','RADHA','RANI','GEETHA','REVATHI',
    'SRIDEVI','SAVITHA','SUDHA','BHARATHI','ARCHANA','LATHA','SARANYA','KAVITHA',
    'JOTHI','JAYANTHI','JAYALAKSHMI','VIJAYA','VIJAYALAKSHMI','HEMA','HEMAVATHI',
    'HEMALATHA','PADMAVATHY','PADMAVATHI','RAJESHWARI',
    'SARASWATHI','PARVATHI','BHAVANI','INDIRA','INDUMATHI','MALATHI','LALITHA',
    'NAGARAJAN','SANKARA','SRIDHARAN','SAMPATH','UMAPATHY','PREMKUMAR',
    'RAMANATHAN','MANIVANNAN','MANOHARAN','MAHADEVAN',
  ]);
  for (const w of words) {
    if (TAMIL.has(w)) return 'Tamil';
  }
  for (const w of words) {
    if (SANSKRIT.has(w)) return 'Sanskrit/Pan-Hindu';
  }
  return 'Unknown';
}

function normalizePhone(raw) {
  const digits = String(raw).replace(/\D/g, '');
  if (digits.length === 10) return digits;
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  return digits;
}

function phoneSeriesLabel(digits) {
  if (!digits || digits.length !== 10) return 'Invalid/Short';
  const first = digits[0];
  if (first === '6') return '6xxx (Jio/4G)';
  if (first === '7') return '7xxx';
  if (first === '8') return '8xxx';
  if (first === '9') return '9xxx (legacy)';
  return 'Other';
}

// Extract a displayable first name (skip initials)
function extractFirstName(fullName) {
  if (!fullName) return '—';
  const parts = String(fullName).trim().toUpperCase().split(/[\s.]+/);
  for (const p of parts) {
    if (p.length > 1) return p;
  }
  return parts[0];
}

// ─── Read & Analyze ───────────────────────────────────────────────────────────

const EXCEL_PATH = path.join(ROOT, 'assets', 'Advisors List -02.06.2026.xlsx');
const wb = XLSX.readFile(EXCEL_PATH);
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });

const headers = rows[0].map(h => String(h).toUpperCase().trim());
const nameIdx  = headers.findIndex(h => h === 'NAME');
const phoneIdx = headers.findIndex(h => h === 'PHONE');

const data = rows.slice(1).filter(r => r[nameIdx]);

let male = 0, female = 0, unknown = 0;
const originCount = { Tamil: 0, 'Sanskrit/Pan-Hindu': 0, Islamic: 0, Christian: 0, Unknown: 0 };
const seriesCount = {};
const firstNameFreq = {};
const genderByOrigin = {};

for (const row of data) {
  const rawName  = String(row[nameIdx] || '').trim();
  const rawPhone = row[phoneIdx];
  const firstName = extractFirstName(rawName);
  const gender  = classifyGender(rawName);
  const origin  = classifyOrigin(rawName);
  const phone   = normalizePhone(rawPhone);
  const series  = phoneSeriesLabel(phone);

  if (gender === 'Male')    male++;
  else if (gender === 'Female') female++;
  else unknown++;

  originCount[origin] = (originCount[origin] || 0) + 1;
  seriesCount[series] = (seriesCount[series] || 0) + 1;

  if (firstName && firstName.length > 1) {
    firstNameFreq[firstName] = (firstNameFreq[firstName] || 0) + 1;
  }

  if (!genderByOrigin[origin]) genderByOrigin[origin] = { Male: 0, Female: 0, Unknown: 0 };
  genderByOrigin[origin][gender]++;
}

const total = data.length;
const malePct    = ((male    / total) * 100).toFixed(1);
const femalePct  = ((female  / total) * 100).toFixed(1);
const unknownPct = ((unknown / total) * 100).toFixed(1);

const topNames = Object.entries(firstNameFreq)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 20);

const validPhones = data.filter(r => normalizePhone(r[phoneIdx]).length === 10).length;

console.log(`\n✅ Analyzed ${total} records`);
console.log(`   Male: ${male} (${malePct}%) | Female: ${female} (${femalePct}%) | Unknown: ${unknown} (${unknownPct}%)`);
console.log(`   Valid phones: ${validPhones}/${total}`);
console.log(`   Origin breakdown: ${JSON.stringify(originCount)}`);

// ─── Dominant origin for insights ────────────────────────────────────────────
const topOrigin = Object.entries(originCount).sort((a, b) => b[1] - a[1])[0];
const topGender = male > female ? `${malePct}% Male` : `${femalePct}% Female`;

// ─── HTML Report ──────────────────────────────────────────────────────────────

const originColors = {
  'Tamil':              '#ef4444',
  'Sanskrit/Pan-Hindu': '#f97316',
  'Islamic':            '#22c55e',
  'Christian':          '#3b82f6',
  'Unknown':            '#64748b',
};

const CHART_JS = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Skiline — Audience Demographics</title>
<script src="${CHART_JS}"></script>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', system-ui, sans-serif; background: #0f172a; color: #e2e8f0; min-height: 100vh; }

  header {
    background: linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%);
    padding: 32px 40px;
    border-bottom: 1px solid #1e40af;
  }
  header h1 { font-size: 1.7rem; font-weight: 700; letter-spacing: -0.5px; }
  header p  { color: #93c5fd; margin-top: 6px; font-size: 0.9rem; }

  .container { max-width: 1200px; margin: 0 auto; padding: 36px 24px; }

  /* Stat cards */
  .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(155px, 1fr)); gap: 14px; margin-bottom: 32px; }
  .card {
    background: #1e293b;
    border: 1px solid #334155;
    border-radius: 14px;
    padding: 22px 16px;
    text-align: center;
    transition: border-color .2s;
  }
  .card:hover { border-color: #475569; }
  .card .val { font-size: 2.1rem; font-weight: 800; line-height: 1; }
  .card .lbl { color: #94a3b8; font-size: 0.75rem; margin-top: 6px; text-transform: uppercase; letter-spacing: 0.06em; }
  .card.blue  .val { color: #60a5fa; }
  .card.pink  .val { color: #f472b6; }
  .card.amber .val { color: #fbbf24; }
  .card.green .val { color: #34d399; }
  .card.red   .val { color: #f87171; }
  .card.slate .val { color: #94a3b8; }

  /* Section label */
  .section-label {
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: #64748b;
    margin-bottom: 14px;
  }

  /* Chart grid */
  .charts { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
  .chart-box {
    background: #1e293b;
    border: 1px solid #334155;
    border-radius: 14px;
    padding: 26px;
  }
  .chart-box h3 {
    font-size: 0.82rem;
    font-weight: 600;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    margin-bottom: 22px;
  }
  .full-width { grid-column: 1 / -1; }
  canvas { max-height: 300px; width: 100% !important; }

  /* Insights */
  .insights {
    background: #1e293b;
    border: 1px solid #334155;
    border-radius: 14px;
    padding: 26px;
    margin-bottom: 20px;
  }
  .insights h3 {
    font-size: 0.82rem;
    font-weight: 600;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    margin-bottom: 20px;
  }
  .insight-item { display: flex; align-items: flex-start; gap: 14px; margin-bottom: 16px; }
  .insight-item:last-child { margin-bottom: 0; }
  .insight-item .icon { font-size: 1.15rem; flex-shrink: 0; margin-top: 1px; }
  .insight-item p { color: #cbd5e1; font-size: 0.9rem; line-height: 1.6; }
  .insight-item strong { color: #f1f5f9; }

  code {
    background: #0f172a;
    padding: 2px 8px;
    border-radius: 5px;
    color: #60a5fa;
    font-size: 0.85em;
    font-family: 'Cascadia Code', 'Consolas', monospace;
  }

  footer { text-align: center; color: #475569; font-size: 0.78rem; padding: 32px; }

  @media (max-width: 680px) {
    .charts { grid-template-columns: 1fr; }
    header { padding: 24px 20px; }
  }
</style>
</head>
<body>

<header>
  <h1>🎯 Skiline — Offline Converter Demographics</h1>
  <p>Advisors List · Analyzed ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} · ${total} records</p>
</header>

<div class="container">

  <!-- Stat Cards -->
  <div class="section-label" style="margin-top:0">Dataset Overview</div>
  <div class="stats">
    <div class="card blue">
      <div class="val">${total}</div>
      <div class="lbl">Total Records</div>
    </div>
    <div class="card blue">
      <div class="val">${male}</div>
      <div class="lbl">Male · ${malePct}%</div>
    </div>
    <div class="card pink">
      <div class="val">${female}</div>
      <div class="lbl">Female · ${femalePct}%</div>
    </div>
    <div class="card amber">
      <div class="val">${unknown}</div>
      <div class="lbl">Unclassified · ${unknownPct}%</div>
    </div>
    <div class="card green">
      <div class="val">${validPhones}</div>
      <div class="lbl">Valid Phones</div>
    </div>
    <div class="card red">
      <div class="val">${total - validPhones}</div>
      <div class="lbl">Invalid / Missing</div>
    </div>
  </div>

  <!-- Charts Row 1: Gender + Origin -->
  <div class="section-label">Distribution Charts</div>
  <div class="charts">
    <div class="chart-box">
      <h3>Gender Distribution</h3>
      <canvas id="genderChart"></canvas>
    </div>
    <div class="chart-box">
      <h3>Community / Name Origin</h3>
      <canvas id="originChart"></canvas>
    </div>
  </div>

  <!-- Charts Row 2: Top Names -->
  <div class="charts">
    <div class="chart-box full-width">
      <h3>Top 20 First Names (by frequency)</h3>
      <canvas id="namesChart"></canvas>
    </div>
  </div>

  <!-- Charts Row 3: Phone Series + Gender by Origin -->
  <div class="charts">
    <div class="chart-box">
      <h3>Phone Number Series</h3>
      <canvas id="seriesChart"></canvas>
    </div>
    <div class="chart-box">
      <h3>Gender Split by Community</h3>
      <canvas id="genderOriginChart"></canvas>
    </div>
  </div>

  <!-- Key Insights -->
  <div class="section-label">Key Insights</div>
  <div class="insights">
    <h3>📊 What This Means for Your Ads</h3>
    <div class="insight-item">
      <span class="icon">👥</span>
      <p>Your converter base is <strong>${topGender}</strong> dominant. ${male > female
        ? `This aligns well with the Retirees segment targeting. Consider testing male-skewed creative variants — direct language about financial independence and legacy.`
        : `Consider whether your current Housewives vs Retirees split truly reflects this — your best converters may not match your current ad targeting demographic.`
      }</p>
    </div>
    <div class="insight-item">
      <span class="icon">🏷️</span>
      <p>Dominant community: <strong>${topOrigin[0]}</strong> (${topOrigin[1]} people · ${((topOrigin[1]/total)*100).toFixed(1)}%). ${
        topOrigin[0] === 'Sanskrit/Pan-Hindu'
          ? 'This is Tamil Brahmin / educated professional demographic. Ad creative in Tamil with respectful, aspirational tone will resonate strongly. Avoid colloquial language.'
          : topOrigin[0] === 'Tamil'
          ? 'Distinctly Tamil demographic. Use vernacular Tamil in creatives, reference familiar cultural anchors. Avoid Hindi or overly formal Sanskrit-origin language.'
          : `This ${topOrigin[0]} community should influence your creative language, imagery, and tone.`
      }</p>
    </div>
    <div class="insight-item">
      <span class="icon">📱</span>
      <p><strong>${validPhones} of ${total}</strong> phone numbers are valid 10-digit Indian mobile numbers (${((validPhones/total)*100).toFixed(1)}% upload-ready for Meta Custom Audience). ${total - validPhones > 0 ? `Clean the ${total - validPhones} invalid entries before running <code>audience:upload</code>.` : 'Full dataset ready for Meta upload.'}</p>
    </div>
    <div class="insight-item">
      <span class="icon">🔗</span>
      <p>Top name: <strong>${topNames[0]?.[0] || '—'} (appears ${topNames[0]?.[1] || 0}x)</strong>. High repetition of certain names suggests a tight referral network — your converters likely know each other and share similar socioeconomic profiles. This is ideal for lookalike modeling.</p>
    </div>
    <div class="insight-item">
      <span class="icon">⚠️</span>
      <p><strong>${unknownPct}% gender unclassified</strong> — likely abbreviated names or unusual spellings. The Meta upload + Audience Insights step will provide accurate age AND complete gender data from actual Facebook profile self-reporting, which will be more reliable than name-based inference.</p>
    </div>
  </div>

  <!-- Next Steps -->
  <div class="insights">
    <h3>🚀 Next Steps — Lookalike Pipeline</h3>
    <div class="insight-item">
      <span class="icon">1️⃣</span>
      <p>Run <code>npm run audience:upload</code> — hashes ${validPhones} phone numbers and uploads to Meta Custom Audience.</p>
    </div>
    <div class="insight-item">
      <span class="icon">2️⃣</span>
      <p>Wait <strong>24–72 hours</strong> for Meta to process and match profiles, then run <code>npm run audience:lookalike</code>.</p>
    </div>
    <div class="insight-item">
      <span class="icon">3️⃣</span>
      <p>Run <code>npm run audience:analyze</code> — pulls Meta's age + full demographic breakdown of matched users. This fills the age data gap from this local analysis.</p>
    </div>
    <div class="insight-item">
      <span class="icon">4️⃣</span>
      <p>Run <code>npm run audience:apply</code> — applies the lookalike audience to your existing ad sets, optionally adjusting age/gender targeting based on what Meta's analysis reveals.</p>
    </div>
  </div>

</div>

<footer>Skiline Ads System · Generated ${new Date().toISOString().replace('T', ' ').slice(0, 19)} IST</footer>

<script>
Chart.defaults.color = '#94a3b8';
Chart.defaults.borderColor = '#1e293b';

// Gender Doughnut
new Chart(document.getElementById('genderChart'), {
  type: 'doughnut',
  data: {
    labels: ['Male', 'Female', 'Unknown'],
    datasets: [{
      data: [${male}, ${female}, ${unknown}],
      backgroundColor: ['#3b82f6', '#ec4899', '#475569'],
      borderWidth: 2,
      borderColor: '#1e293b',
      hoverOffset: 6,
    }]
  },
  options: {
    cutout: '62%',
    plugins: { legend: { position: 'bottom', labels: { padding: 18, font: { size: 12 } } } }
  }
});

// Origin Doughnut
new Chart(document.getElementById('originChart'), {
  type: 'doughnut',
  data: {
    labels: ${JSON.stringify(Object.keys(originCount))},
    datasets: [{
      data: ${JSON.stringify(Object.values(originCount))},
      backgroundColor: ${JSON.stringify(Object.keys(originCount).map(k => originColors[k] || '#64748b'))},
      borderWidth: 2,
      borderColor: '#1e293b',
      hoverOffset: 6,
    }]
  },
  options: {
    cutout: '62%',
    plugins: { legend: { position: 'bottom', labels: { padding: 14, font: { size: 12 } } } }
  }
});

// Top Names Bar
new Chart(document.getElementById('namesChart'), {
  type: 'bar',
  data: {
    labels: ${JSON.stringify(topNames.map(([n]) => n))},
    datasets: [{
      label: 'Count',
      data: ${JSON.stringify(topNames.map(([,c]) => c))},
      backgroundColor: 'rgba(59,130,246,0.85)',
      borderRadius: 5,
      borderSkipped: false,
    }]
  },
  options: {
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { color: '#1e293b' }, ticks: { font: { size: 11 } } },
      y: { beginAtZero: true, ticks: { stepSize: 1 }, grid: { color: '#334155' } }
    }
  }
});

// Phone Series Bar
new Chart(document.getElementById('seriesChart'), {
  type: 'bar',
  data: {
    labels: ${JSON.stringify(Object.keys(seriesCount))},
    datasets: [{
      label: 'Numbers',
      data: ${JSON.stringify(Object.values(seriesCount))},
      backgroundColor: ['#22c55e','#f97316','#a855f7','#06b6d4','#94a3b8'],
      borderRadius: 5,
      borderSkipped: false,
    }]
  },
  options: {
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { color: '#1e293b' } },
      y: { beginAtZero: true, grid: { color: '#334155' } }
    }
  }
});

// Gender by Origin — Stacked Bar
new Chart(document.getElementById('genderOriginChart'), {
  type: 'bar',
  data: {
    labels: ${JSON.stringify(Object.keys(genderByOrigin))},
    datasets: [
      {
        label: 'Male',
        data: ${JSON.stringify(Object.values(genderByOrigin).map(v => v.Male))},
        backgroundColor: '#3b82f6',
        borderRadius: 3,
      },
      {
        label: 'Female',
        data: ${JSON.stringify(Object.values(genderByOrigin).map(v => v.Female))},
        backgroundColor: '#ec4899',
        borderRadius: 3,
      },
      {
        label: 'Unknown',
        data: ${JSON.stringify(Object.values(genderByOrigin).map(v => v.Unknown))},
        backgroundColor: '#475569',
        borderRadius: 3,
      }
    ]
  },
  options: {
    plugins: { legend: { position: 'bottom', labels: { padding: 14 } } },
    scales: {
      x: { stacked: true, grid: { color: '#1e293b' } },
      y: { stacked: true, beginAtZero: true, grid: { color: '#334155' } }
    }
  }
});
</script>
</body>
</html>`;

const OUT = path.join(ROOT, 'output', 'audience-demographics.html');
writeFileSync(OUT, html);
console.log(`\n📊 Report saved → output/audience-demographics.html`);
console.log('   Open in browser to view charts.\n');
