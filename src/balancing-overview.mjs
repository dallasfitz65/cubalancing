// One source of truth for the session-only overview status cards.
// A passing subset of controls must NEVER imply a full, certified balancing.
const dateValue=(value)=>{
 if(!value)return null;
 if(typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value))return value;
 const date=new Date(value);return Number.isNaN(date.getTime())?null:date.toLocaleDateString('en-US',{year:'numeric',month:'short',day:'numeric'});
};
const uniqueDates=(values)=>{
 const dates=[...new Set((values||[]).filter(Boolean))];
 return dates.length===1?dateValue(dates[0]):dates.length>1?'Multiple dates':null;
};
const card=(id,label,accent,status,issueCount,checkCount,date,dateLabel='Source date',detail='')=>({
 id,label,accent,status,issueCount,checkCount,date:date||null,dateLabel,detail
});
export function buildBalancingOverview({result=null,draftResult=null,eftResult=null,atmResult=null,achResult=null,cardResult=null,unmapped=[]}={}){
 const glRows=(result?.sections||[]).flatMap(s=>s.rows||[]).filter(r=>r.executed&&!r.branchOnly);
 const rowFailures=glRows.filter(r=>r.ok!==true).length;
 const reportedIssues=Number.isSafeInteger(result?.issues)&&result.issues>0?result.issues:0;
 const mappingIssues=Math.max((Array.isArray(unmapped)?unmapped:[]).length,(Array.isArray(result?.unmapped)?result.unmapped:[]).length);
 // Do not mark checks passed when the engine reports additional issues beyond visible rows.
 const glFailed=Math.max(rowFailures,reportedIssues);
 const glStatus=!result||!glRows.length?'NOT RUN':glFailed?'FAIL':mappingIssues?'FAIL':'PASS';
 const glCard=card('shares-loans','Shares, Loans & Cash','shares',glStatus,glFailed+mappingIssues,glRows.length,dateValue(result?.timestamp),'Processed','Mapped GL and core balance controls');
 const draftChecks=draftResult?.checks||[];
 const draftFailed=draftChecks.filter(x=>x.ok===false).length;
 const draftDifference=draftResult?.summary?.G;
 const draftIssues=draftFailed+(draftResult&&typeof draftDifference==='number'&&draftDifference!==0&&!draftFailed?1:0);
 const draftStatus=!draftResult?'NOT RUN':draftIssues?'FAIL':!draftChecks.length?'NOT RUN':draftChecks.length===5&&draftChecks.every(x=>x.ok===true)&&draftDifference===0?'PASS':'FAIL';
 const draftCard=card('drafts','Share Drafts','drafts',draftStatus,draftIssues,draftChecks.length,uniqueDates((draftResult?.reports||[]).map(x=>x.date)),'Source date','Share Draft source-report controls');
 const eftControls=eftResult?.controls||[];
 const eftIssues=(eftResult?.issues||[]).length+eftControls.filter(x=>x.status==='exception'||x.ok===false).length;
 const eftCard=card('eft','EFT','eft',!eftResult?'NOT RUN':eftIssues?'FAIL':!eftControls.length?'NOT RUN':eftControls.length===5&&eftControls.every(x=>x.status==='matched'||x.ok===true)?'PASS':'FAIL',eftIssues,eftControls.length,uniqueDates((eftResult?.reports||[]).map(x=>x.date)),'Source date','Core, STAR and teller reconciliation controls');
 const atmChecks=atmResult?.checks||[];
 const atmIssues=atmChecks.filter(x=>x.ok!==true).length;
 const atmCard=card('atm','ATM Balancing','atm',!atmResult||!atmChecks.length?'NOT RUN':atmIssues?'FAIL':'PASS',atmIssues,atmChecks.length,dateValue(atmResult?.date),'Business date','Cash, settlement and GL controls');
 const achChecks=achResult?.checks||[];
 const achIssues=Number.isSafeInteger(achResult?.issues)?achResult.issues:0;
 const achCard=card('ach','ACH','ach',!achResult||!achChecks.length?'NOT RUN':achIssues||achChecks.some(x=>x.ok!==true)?'FAIL':'PASS',achIssues,achChecks.length,uniqueDates(achChecks.map(x=>x.date)),'Business date','Operator, core, settlement and GL controls');
 // Individual control outcomes are independent of other issues (e.g. unmatched ACH items).
 const outcome=x=>x.ok===true||x.status==='matched'?'Passed':x.ok===false||x.status==='exception'?'Failed':'Unverified';
 const control=(label,x)=>({label,status:outcome(x)});
 const enrich=(c,checks,scope,limitations,otherIssues=0)=>{
  const counts={Passed:0,Failed:0,Unverified:0};
  for(const check of checks)counts[check.status]++;
  return {...c,checks,counts,scope,limitations,otherIssues};
 };
 const cc=cardResult?.checks||[];
 const cardCard=card('credit-cards','Credit Card Balancing','ach',!cc.length?'NOT RUN':cc.some(c=>!c.ok)?'FAIL':'PASS',cc.filter(c=>!c.ok).length,cc.length,dateValue(cardResult?.date),'Business date',cardResult?.synthetic?'Synthetic test results':'Normalized card controls');
 return [
  enrich(glCard,glRows.map((x,i)=>control([x.gl?'GL '+x.gl:'GL control '+(i+1),x.desc].filter(Boolean).join(' — '),x)),'Mapped general ledger balances compared with core balances.', ['Source business date is not independently verified.',...(mappingIssues?[mappingIssues+' unmapped account type(s) excluded.']:[])],Math.max(0,glFailed-rowFailures)+mappingIssues),
  enrich(draftCard,draftChecks.map((x,i)=>control(x.label||'Share Draft control '+(i+1),x)),'Posting, processing, transmission and returned-item report totals.', ['Verification scope: source-report totals only; does not certify General Ledger balances.'],Math.max(0,draftIssues-draftFailed)),
  enrich(eftCard,eftControls.map((x,i)=>control(x.label||'EFT control '+(i+1),x)),'Core debit/credit totals compared with STAR and teller reports; STAR debit/credit equality.', ['Full network settlement and GL reconciliation are not verified.'],(eftResult?.issues||[]).length),
  enrich(atmCard,atmChecks.map((x,i)=>control(x.name||'ATM control '+(i+1),x)),'Physical cash, cash GL, journal withdrawals, network settlement and GL clearing comparisons.', ['Limited ATM transaction model; full production coverage is not established.']),
  enrich(achCard,achChecks.map((x,i)=>control([x.date,x.direction].filter(Boolean).join(' — ')||'ACH control '+(i+1),x)),'Operator, core posting, settlement and GL totals by date and debit/credit direction.', ['Normalized CSV prototype; native production settlement coverage is not certified.'],Math.max(0,achIssues-achChecks.filter(x=>x.ok===false).length)),
  enrich(cardCard,cc.map(c=>control(c.name,c)),cardResult?.synthetic?'Synthetic test only':'Normalized receivables and settlement controls',['Native processor formats and bank settlement not independently verified.'])
 ];
}
