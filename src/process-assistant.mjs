// Deterministic, browser-local reconciliation investigation; no external AI call.
// Never infer causes or treat presence of files as proof of balancing.
const dollars=n=>typeof n==='number'&&Number.isFinite(n)?new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n):'unavailable';
const cents=n=>typeof n==='number'&&Number.isFinite(n)?dollars(n/100):'unavailable';
const moneyText=v=>typeof v==='string'?v:cents(v);
export const PROCESS_ASSISTANT_PROMPTS={
 'shares-loans':['Why are accounts out of balance?','Show variance details','Explain GL sign convention','What was verified?'],
 cash:['Why is cash out of balance?','Show cash variances','Explain GL sign convention','What was verified?'],
 drafts:['Why are Share Drafts out of balance?','Explain source totals','What about GL postings?','What was verified?'],
 eft:['Why is EFT out of balance?','Check source dates','Explain settlement controls','What was verified?'],
 ach:['What is needed for ACH balancing?','What was verified?']
};
export const PROCESS_TITLES={'shares-loans':'Shares, Loans and Cash',cash:'Cash Balancing',drafts:'Share Draft Balancing',eft:'EFT Balancing',ach:'ACH Balancing'};
export function answerProcessQuestion(module,question,report){
 const text=String(question||'').trim().toLowerCase();
 if(!text)return 'Ask about the selected reconciliation process or its available checks.';
 if(module==='ach')return 'ACH reconciliation is not implemented or verified. No source matching, settlement or GL checks have been run. Source specifications and validated rules are required before investigating balances.';
 if(!report)return 'No completed '+(PROCESS_TITLES[module]||'reconciliation')+' result is available in this browser session. Reconnect or scan your input folder in Settings → Folder Configuration. I cannot infer a result from filenames alone.';
 const isVariance=/why|out of balance|exception|variance|difference|mismatch|investigat|cause/.test(text);
 const isStatus=/status|summary|balanced|verified|check|result/.test(text);
 if(module==='drafts'){
  const v=report.summary;
  if(!v)return 'The Share Draft summary is unavailable; no conclusion can be drawn.';
  if(/gl|ledger|posting/.test(text))return 'This Share Draft review shows expected journal entries only. Actual GL postings and clearing balances have not been verified; do not treat expected GL entries as posted transactions.';
  if(/source|total|amount/.test(text))return 'SDRE processing total (A): '+cents(v.A)+'; SDPS posted (B): '+cents(v.B)+'; unpaid drafts (C): '+cents(v.C)+'; returned (D): '+cents(v.D)+'; honored (E): '+cents(v.E)+'; manual (F): '+cents(v.F)+'. Residual (G): '+cents(v.G)+'.';
  if(isVariance||isStatus)return v.G===0?'Share Draft source-report equation G = C − D − E − F is zero. GL posting verification and return-cycle timing remain unverified.':'Share Draft source-report equation G = C − D − E − F differs by '+cents(v.G)+'. Review SDRE, SDPS and SDRT dates and extracted totals. The discrepancy alone does not establish a cause.';
  return 'I can explain the Share Draft source equation, totals, residual and unverified GL posting controls using this browser report only.';
 }
 if(module==='eft'){
  const issues=report.issues||[];
  const checks=report.controls||[];
  if(/date|institution|cutoff/.test(text))return 'Source report dates and institutions: '+(report.reports||[]).map(r=>r.role+' ('+r.name+'): '+r.date+', '+r.institution).join('; ')+'. Review differing dates or institutions before combining reports.';
  if(/settlement|control|gl|match/.test(text))return checks.length?checks.map(c=>c.label+': '+c.status+(typeof c.variance==='number'?', variance '+cents(c.variance):'')).join('; ')+'. These are limited aggregate controls, not complete settlement-to-GL proof.':'No validated cross-source settlement-to-GL reconciliation is available; the current EFT workflow provides a limited source review.';
  if(isVariance||isStatus)return issues.length?issues.length+' EFT source-review issue(s): '+issues.join('; ')+'. Do not treat these as proven causes.':'No source-review issues were identified. This does not certify EFT settlement, rejects, posting entries or a complete GL reconciliation.';
  return 'I can explain EFT source dates, institutions, extracted totals, issues and limited aggregate controls. Full settlement-to-GL reconciliation is not yet implemented.';
 }
 if(module==='shares-loans'||module==='cash'){
  const sections=(report.sections||[]).filter(s=>module==='cash'?s.id==='cash':true);
  const rows=sections.flatMap(s=>s.rows||[]).filter(r=>r.executed&&!r.branchOnly);
  if(!rows.length)return 'No completed source-to-GL account checks are available for this module.';
  const bad=rows.filter(r=>r.ok!==true);
  if(/sign|polarity/.test(text))return 'The GL sign convention for this run is '+(report.meta?.signConvention||'unavailable')+'. Compare the original GL ending balance with the normalized balance in the expanded GL account detail. Changing a sign convention does not repair a source posting or mapping error.';
  if(isVariance||isStatus){
   if(!bad.length)return 'All '+rows.length+' available source-to-GL account checks are balanced. This does not certify unverified account types, timing or other module controls.';
   return bad.length+' of '+rows.length+' account checks show exceptions: '+bad.slice(0,8).map(r=>r.gl+' ('+r.desc+'): '+moneyText(r.var)+' variance; SVST/core '+r.svst+', GL '+r.tb).join('; ')+(bad.length>8?'; plus '+(bad.length-8)+' additional exceptions.':'')+'. Check the source GL, mapping, account types and reporting date; these are investigation leads, not proven causes.';
  }
  return 'I can explain account variances, source-to-GL balances and the saved GL sign convention using the current reconciliation result only.';
 }
 return 'No verified investigation rules are configured for this process.';
}
