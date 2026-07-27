import { google } from 'googleapis';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });
const SHEET_ID = '1jyNnRjklz6wqz-QLqhpWMmy-bGG7_yddyUmm6vrTr6Y';
const TABS = [
  { name: 'Housewives', ratingCol: 7, statusCol: null },
  { name: 'Retirees',   ratingCol: 7, statusCol: null },
  { name: 'Surat',      ratingCol: null, statusCol: 7 },
];
const sa = JSON.parse(readFileSync(path.join(__dirname, '..', '..', 'config', 'service-account.json'), 'utf8'));
const auth = new google.auth.GoogleAuth({ credentials: sa, scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'] });
const sheets = google.sheets({ version: 'v4', auth });
function suratBucket(s){const t=(s||'').toUpperCase();if(!t)return'ytc';if(t.includes('LA CODE')||t.includes('LACODE')||t.includes('LOGGED')||t.includes('LCD'))return 5;if(t.includes('PIPELINE'))return 3;if(t.includes('NI'))return 2;if(t.includes('YET'))return'ytc';if(t.includes('TRIED')||t.includes('RNR')||t.includes('WR'))return 1;return'other';}
function wk(dstr){if(!dstr)return null;const d=new Date(dstr.replace(/\(IST\)/,'').trim());return isNaN(d)?null:d.toISOString().slice(0,10);}
const windows=[['<= Jun 30',d=>d<'2026-07-01'],['Jul 1-7',d=>d>='2026-07-01'&&d<='2026-07-07'],['Jul 8-14',d=>d>='2026-07-08'&&d<='2026-07-14'],['Jul 15-22',d=>d>='2026-07-15']];
const agg={};for(const w of windows)agg[w[0]]={total:0,answered:0,noanswer:0,qual:0,conv:0};
for(const tab of TABS){
  const res=await sheets.spreadsheets.values.get({spreadsheetId:SHEET_ID,range:`${tab.name}!A:M`});
  for(const r of (res.data.values||[]).slice(1)){
    const w=wk(r[1]);if(!w)continue;
    let b;if(tab.ratingCol!=null){const raw=r[tab.ratingCol]?.trim();b=!raw?'ytc':([1,2,3,4,5].includes(parseInt(raw))?parseInt(raw):'other');}else b=suratBucket(r[tab.statusCol]);
    const win=windows.find(x=>x[1](w));if(!win)continue;const a=agg[win[0]];a.total++;
    if([2,3,4,5].includes(b))a.answered++;          // actually reached
    if(b==='ytc'||b===1)a.noanswer++;               // called, no answer
    if([3,4,5].includes(b))a.qual++;
    if(b===5)a.conv++;
  }
}
console.log('Cohort by submission date — CORRECT definitions:\n');
console.log('Window       Leads  Answered  NoAnswer  Answer%  Qual(of answered)  Conv');
for(const w of windows){const a=agg[w[0]];const ar=a.total?(a.answered/a.total*100).toFixed(0)+'%':'-';const qr=a.answered?(a.qual/a.answered*100).toFixed(0)+'%':'-';console.log(`${w[0].padEnd(12)} ${String(a.total).padStart(5)}  ${String(a.answered).padStart(8)}  ${String(a.noanswer).padStart(8)}  ${ar.padStart(6)}  ${qr.padStart(16)}  ${String(a.conv).padStart(4)}`);}
