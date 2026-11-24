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
export function buildBalancingOverview({result=null,draftResult=null,eftResult=null,atmResult=null,achResult=null,unmapped=[]}={}){
 const glRows=(result?.sections||[]).flatMap(s=>s.rows||[]).filter(r=>r.executed&&!r.branchOnly);
 const rowFailures=glRows.filter(r=>r.ok!==true).length;
 const reportedIssues=Number.isSafeInteger(result?.issues)&&result.issues>0?result.issues:0;
 const mappingIssues=Math.max((Array.isArray(unmapped)?unmapped:[]).length,(Array.isArray(result?.unmapped)?result.unmapped:[]).length);
 // Do not mark checks passed when the engine reports additional issues beyond visible rows.
 const glFailed=Math.max(rowFailures,reportedIssues);
 const glStatus=!result||!glRows.length?'Not Run':glFailed?'Exceptions':mappingIssues?'Partial Verification':'Checks Passed';
 const glCard=card('shares-loans','Shares, Loans & Cash','shares',glStatus,glFailed+mappingIssues,glRows.length,dateValue(result?.timestamp),'Processed','Source-cycle date not independently established');
 const draftChecks=draftResult?.checks||[];
 const draftFailed=draftChecks.filter(x=>x.ok===false).length;
 const draftDifference=draftResult?.summary?.G;
 const draftIssues=draftFailed+(draftResult&&typeof draftDifference==='number'&&draftDifference!==0&&!draftFailed?1:0);
 const draftStatus=!draftResult?'Not Run':draftIssues?'Exceptions':'Partial Verification';
 const draftCard=card('drafts','Share Drafts','drafts',draftStatus,draftIssues,draftChecks.length,uniqueDates((draftResult?.reports||[]).map(x=>x.date)),'Source date','GL postings not verified');
 const eftControls=eftResult?.controls||[];
 const eftIssues=(eftResult?.issues||[]).length+eftControls.filter(x=>x.status==='exception'||x.ok===false).length;
 const eftCard=card('eft','EFT','eft',!eftResult?'Not Run':eftIssues?'Exceptions':'Partial Verification',eftIssues,eftControls.length,uniqueDates((eftResult?.reports||[]).map(x=>x.date)),'Source date','Selected controls only; settlement and GL not certified');
 const atmChecks=atmResult?.checks||[];
 const atmIssues=atmChecks.filter(x=>x.ok!==true).length;
 const atmCard=card('atm','ATM Balancing','atm',!atmResult||!atmChecks.length?'Not Run':atmIssues?'Exceptions':'Prototype Checks Passed',atmIssues,atmChecks.length,dateValue(atmResult?.date),'Business date','Limited ATM transaction model');
 const achChecks=achResult?.checks||[];
 const achIssues=Number.isSafeInteger(achResult?.issues)?achResult.issues:0;
 const achCard=card('ach','ACH','ach',!achResult||!achChecks.length?'Not Run':achIssues?'Exceptions':'Prototype Checks Passed',achIssues,achChecks.length,uniqueDates(achChecks.map(x=>x.date)),'Business date','Normalized CSV prototype; settlement not certified');
 return [glCard,draftCard,eftCard,atmCard,achCard];
}
