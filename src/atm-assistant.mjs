// Deterministic, local-only ATM reconciliation explanations. Not an LLM or external AI service.
const money=cents=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(cents/100);
export function answerAtmQuestion(question,report){
 const text=String(question||'').trim().toLowerCase();
 if(!text)return 'Ask a question about ATM cash, GL balances, network settlement or reconciliation exceptions.';
 if(!report)return 'Run ATM Balancing or load an ATM demo report first. I can then explain actual checks, variances and cash proof. No external AI is connected.';
 const failed=report.checks.filter(c=>!c.ok);
 if(/(why|reason|cause|out of balance|doesn't balance|does not balance|exception|difference|variance|investigat)/.test(text)){
  if(!failed.length)return 'All '+report.checks.length+' implemented controls balance. This does not verify posting cutoff, interchange fees or processor settlement timing.';
  return failed.map(c=>c.name+' differs by '+money(c.variance)+' (expected '+money(c.source)+', actual '+money(c.actual)+'). Check the associated GL and source reports, posting dates and outstanding items; the discrepancy alone does not prove the cause.').join(' ');
 }
 if(/(cash|physical|count|dispens|replenish)/.test(text)){
  return 'Cash proof: beginning '+money(report.beginning)+' + replenishments '+money(report.loaded)+' − removed '+money(report.removed)+' − approved withdrawals '+money(report.dispensed)+' = expected '+money(report.expected)+'. Physical counted cash is '+money(report.counted)+'. Verify journal approvals, replenishment and physical count if these differ.';
 }
 if(/(settlement|network|processor)/.test(text)){
  const matches=report.checks.filter(c=>/settle|clear/i.test(c.name));
  return 'Network settlement reported '+money(report.settled)+'. '+(matches.length?matches.map(c=>c.name+': '+(c.ok?'balanced':'difference '+money(c.variance))).join('; ')+'. ':'')+'Confirm settlement batch date and any processor adjustments before posting.';
 }
 if(/(gl|ledger|account|clearing)/.test(text)){
  const checks=report.checks.filter(c=>/gl|clear/i.test(c.name));
  return 'ATM cash GL shows '+money(report.glCash)+'. '+checks.map(c=>c.name+': '+(c.ok?'balanced':'variance '+money(c.variance))).join('; ')+'. Match these amounts to the actual GL export; a mismatch may be caused by posting or mapping differences.';
 }
 if(/(balanced|status|summary|result|check)/.test(text))return failed.length?failed.length+' of '+report.checks.length+' ATM checks have exceptions: '+failed.map(c=>c.name).join(', ')+'.':'All '+report.checks.length+' implemented ATM checks are balanced for '+report.terminal+' on '+report.date+'.';
 return 'I can explain this ATM report’s exception variances, cash proof, GL and settlement controls, or overall status. I do not have external AI access, historical reports or information beyond the current browser report.';
}
