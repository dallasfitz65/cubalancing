function amount(line,index=-1){const values=[...line.matchAll(/\d[\d,]*\.\d{2}/g)].map(m=>Math.round(Number(m[0].replaceAll(',',''))*100));const value=values.at(index);if(value==null)throw Error('Required report amount is missing.');return value;}
function requiredLine(text,label){const line=text.split(/\r?\n/).find(l=>l.trim().startsWith(label));if(!line)throw Error('Missing report line: '+label);return line;}
export function parseDraftReport(text,role){
 const batch=text.match(/SHARE DRAFT BCTL\s+(\d+)/)?.[1];if(!batch)throw Error('Share Draft batch number is missing.');
 const date=text.match(/\b\d{2}-\d{2}-\d{2}\b/)?.[0];
 const institution=text.split(/\r?\n/)[1]?.split(/ {3,}/).map(x=>x.trim()).find(Boolean);if(!institution||!date)throw Error('Report institution or date is missing.');
 if(role==='sdps'){if(!text.includes('SHARE DRAFT POSTING TOTALS'))throw Error('Expected an SDPS posting recap.');return {batch,date,institution,posted:amount(requiredLine(text,'TOTAL POSTED ')),notPosted:amount(requiredLine(text,'TOTAL NOT POSTED ')),returned:amount(requiredLine(text,'TOTAL DRAFTS RETURNED')),honored:amount(requiredLine(text,'TOTAL DRAFTS MARKED - HONOR'))};}
 if(role==='sdre'){if(!/S H A R E\s+D R A F T\s+R E F O R M A T/.test(text))throw Error('Expected an SDRE reformat report.');return {batch,date,institution,processing:amount(requiredLine(text,'PROCESSING TOTALS')),transmission:amount(requiredLine(text,'PAYABLE THRU BANK - TRANSMISS TOTALS'))};}
 if(role==='sdrt'){if(!text.includes('REJECTED SHARE DRAFT ITEMS RETURNED'))throw Error('Expected an SDRT returned-items report.');return {batch,date,institution,items:amount(requiredLine(text,'TOTAL ITEM COUNT/AMOUNT')),returned:amount(requiredLine(text,'RETURNED ITEM COUNT/AMOUNT')),manual:amount(requiredLine(text,'TOTAL MANUAL COUNT/AMOUNT')),honored:amount(requiredLine(text,'TOTAL HONORED COUNT/AMOUNT'))};}
 throw Error('Unknown share draft report.');
}
export function checkDraftReports(ps,re,rt){if(new Set([ps.batch,re.batch,rt.batch]).size!==1)throw Error('Report batch numbers differ.');if(new Set([ps.institution,re.institution,rt.institution]).size!==1)throw Error('Reports belong to different institutions.');if(ps.date!==re.date)throw Error('Posting and processing report dates differ.');return [
 ['Posted plus not posted vs processing',ps.posted+ps.notPosted,re.processing],['Processing vs transmission',re.processing,re.transmission],['Not posted vs returned-item report',ps.notPosted,rt.items],['Returned plus honored vs returned-item total',ps.returned+ps.honored,rt.items],['Honored items across reports',ps.honored,rt.honored]
 ].map(([label,left,right])=>({label,left,right,difference:left-right,ok:left===right}));}

export function buildDraftSummary(ps,re,rt){checkDraftReports(ps,re,rt);const A=re.processing,B=ps.posted,C=A-B,D=rt.returned,E=rt.honored,F=rt.manual;if([A,B,C,D,E,F].some(x=>!Number.isSafeInteger(x)))throw Error('Required report totals are missing or invalid.');return {A,B,C,D,E,F,G:C-D-E-F};}
