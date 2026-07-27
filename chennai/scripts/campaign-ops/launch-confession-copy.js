import 'dotenv/config';
import fs from 'fs';

const token = process.env.META_TOKEN;
const accountId = process.env.AD_ACCOUNT_ID;
const PAGE_ID = '101929911661079';

const RETIREES_ADSET = '120248587937540744';
const RETIREES_FORM = '2800617100297668';
const SURAT_ADSET = '120248594655350744';
const SURAT_FORM = '1049608980975533';

const ADS = [
  {
    imagePath: 'D:/SkiLine/Ads - Skiline - Chennai - Agents/assets/Phase 2/Retirees 5.jpg',
    adsetId: RETIREES_ADSET,
    formId: RETIREES_FORM,
    adName: 'Retirees – Bucket List Funding (Confession)',
    headline: "A Pension Wasn't Meant to Be a Ceiling",
    message: "I finally have time for my grandchildren. I just don't have the money to spoil them.\n\nEvery \u2018maybe next time\u2019 feels heavier now. You worked decades so you wouldn't have to keep saying that.\n\nThis isn't a scheme, and it isn't a job pretending to be retirement. It's real, flexible work built for people exactly like you. No investment, no risk.\n\nYou already have the wisdom and the time. The only thing missing is the income to match it, and that takes two minutes to fix.",
  },
  {
    imagePath: 'D:/SkiLine/Ads - Skiline - Surat - Leaders/assets/Phase 3/Surat 7.jpg',
    adsetId: SURAT_ADSET,
    formId: SURAT_FORM,
    adName: 'Surat – P5 – Trust Confession (Gujarati)',
    headline: 'ઝીરો ઈન્વેસ્ટમેન્ટ. પૂરી ટ્રેનિંગ.',
    message: "જ્યારે પણ 'ઘરે બેઠા કમાણી' જોઉં છું, મને લાગે છે કે એ નકલી જ હશે.\n\nપહેલા પણ 'ઝીરો ઈન્વેસ્ટમેન્ટ, અમર્યાદિત કમાણી'નું વચન મળ્યું હતું, અને એણે પૈસા સાથે વિશ્વાસ પણ લઈ લીધો.\n\nSkiline તમારી પાસેથી કંઈ પણ અગાઉથી નથી માંગતું. ના રોકાણ, ના છુપા ચાર્જ, ના કોર્સ ખરીદવાનો. સાચી કંપની, સાચી ટ્રેનિંગ, સુરતમાં પહેલેથી કમાતા સાચા લોકો.\n\nઅટકી રહેવા અને આજથી શરૂ કરવા વચ્ચેનો ફરક ફક્ત બે મિનિટ અને એક પ્રામાણિક નજરનો છે.",
  },
  {
    imagePath: 'D:/SkiLine/Ads - Skiline - Surat - Leaders/assets/Phase 3/Surat 8.jpeg',
    adsetId: SURAT_ADSET,
    formId: SURAT_FORM,
    adName: 'Surat – P5 – Salary Stagnation (Gujarati)',
    headline: 'તમારો પગાર ક્યારેય નથી વધતો?',
    message: "મને ડર લાગે છે કે આ પગાર જ મારી આખી જિંદગી રહેશે.\n\nદર વર્ષે દરેક વસ્તુની કિંમત વધે છે. દર વર્ષે તમારો પગાર ત્યાં જ રહે છે.\n\nઆ એ જ મર્યાદામાં વધુ મહેનત કરવાની વાત નથી. Skiline સાથે આ એક સાચો રસ્તો છે, ઝીરો ઈન્વેસ્ટમેન્ટ, સાચી ટ્રેનિંગ, અને કમાણી જે તમારી મહેનત સાથે વધે છે.\n\nતમે પહેલેથી જ જાણો છો કે ચૂપ રહેવાથી કંઈ બદલાયું નથી. બે મિનિટ કદાચ બદલી શકે.",
  },
];

async function apiPost(endpoint, body) {
  const res = await fetch(`https://graph.facebook.com/v19.0/${endpoint}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, access_token: token }),
  });
  return res.json();
}

for (const ad of ADS) {
  console.log(`\n── ${ad.adName} ──`);

  // 1. upload image
  const buf = fs.readFileSync(ad.imagePath);
  const ext = ad.imagePath.split('.').pop().toLowerCase();
  const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
  const form = new FormData();
  form.append('filename', new Blob([buf], { type: mime }), 'creative.' + ext);
  form.append('access_token', token);
  const up = await fetch(`https://graph.facebook.com/v19.0/${accountId}/adimages`, { method: 'POST', body: form }).then(r => r.json());
  if (!up.images) { console.log('  Image upload ERROR:', JSON.stringify(up)); continue; }
  const imageHash = Object.values(up.images)[0].hash;
  console.log('  Image hash:', imageHash);

  // 2. create creative
  const creative = await apiPost(`${accountId}/adcreatives`, {
    name: ad.adName + ' – Creative',
    object_story_spec: {
      page_id: PAGE_ID,
      link_data: {
        link: 'https://skiline.in/',
        image_hash: imageHash,
        message: ad.message,
        name: ad.headline,
        call_to_action: { type: 'APPLY_NOW', value: { lead_gen_form_id: ad.formId } },
      },
    },
  });
  if (creative.error) { console.log('  Creative ERROR:', JSON.stringify(creative.error)); continue; }
  console.log('  Creative ID:', creative.id);

  // 3. create ad (live)
  const newAd = await apiPost(`${accountId}/ads`, {
    name: ad.adName,
    adset_id: ad.adsetId,
    creative: { creative_id: creative.id },
    status: 'ACTIVE',
  });
  if (newAd.error) { console.log('  Ad ERROR:', JSON.stringify(newAd.error)); continue; }
  console.log('  Ad created & live:', newAd.id);
}

console.log('\nDone.');
