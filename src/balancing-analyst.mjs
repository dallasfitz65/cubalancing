const guidance={
 'loan-participations':'Compare purchased participation principal roll-forward, servicer allocations, remittance cash and GL; review contractual allocation rules and posting dates.',
 'shares-loans':'Compare failed mapped GL accounts against the corresponding core balances; review account mappings and report dates.',
 drafts:'Compare posting, processing and return totals; review missing or duplicate items and business dates.',
 eft:'Compare core, STAR and teller totals; review settlement timing and rejected transactions.',
 atm:'Compare ATM journal activity, cash counts, settlement and clearing GL; investigate timing differences or missing postings.',
 ach:'Review unmatched operator/core entries and compare settlement and GL movement by date and direction.',
 'credit-cards':'Compare receivables roll-forward, processor balances, GL and settlement totals; review duplicate references.'
};
export function analyzeBalancing(cards=[]){
 const passed=cards.filter(c=>c.status==='PASS'),failed=cards.filter(c=>c.status==='FAIL'),pending=cards.filter(c=>!['PASS','FAIL'].includes(c.status));
 const findings=failed.map(c=>({id:c.id,label:c.label,issues:c.issueCount||0,failed:c.counts?.Failed||0,unverified:c.counts?.Unverified||0,controls:(c.checks||[]).filter(x=>x.status==='Failed').map(x=>x.label),action:guidance[c.id]||'Review source reports and failed controls.'})).sort((a,b)=>b.failed-a.failed||b.issues-a.issues);
 const dates=[...new Set(cards.filter(c=>c.status!=='NOT RUN'&&c.date&&c.dateLabel!=='Processed').map(c=>c.date))];
 const mixedDates=dates.length>1||dates.includes('Multiple dates');
 const summary=!passed.length&&!failed.length?'No completed balancing results are available. Connect the input folder and load the required reports.':passed.length+' of '+cards.length+' sections passed their configured controls. '+failed.length+' require investigation; '+pending.length+' have no completed result. '+(failed.length||pending.length?'Daily balancing should not be treated as complete.':'All displayed sections passed their configured controls; this is not a certification of full reconciliation.');
 return {total:cards.length,passed:passed.length,failed:failed.length,pending:pending.length,summary,findings,pendingSections:pending.map(c=>({id:c.id,label:c.label})),mixedDates,dates};
}
