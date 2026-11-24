import test from 'node:test';
import assert from 'node:assert/strict';
import {buildBalancingOverview} from '../src/balancing-overview.mjs';
const rows=[{executed:true,branchOnly:false,ok:true},{executed:true,branchOnly:false,ok:true}];
const gl={timestamp:'2026-11-24T09:00:00Z',sections:[{id:'shares',rows}]};
const find=(cards,id)=>cards.find(x=>x.id===id);

test('five sections always visible, including modules that have not run',()=>{
 const cards=buildBalancingOverview();
 assert.deepEqual(cards.map(x=>x.id),['shares-loans','drafts','eft','atm','ach']);
 assert(cards.every(x=>x.status==='Not Run'&&x.date===null&&x.issueCount===0));
});
test('GL checks passing do not imply certified settlement and displays processed date',()=>{
 const item=find(buildBalancingOverview({result:gl}),'shares-loans');
 assert.equal(item.status,'Checks Passed');
 assert.equal(item.checkCount,2);
 assert.equal(item.issueCount,0);
 assert.equal(item.dateLabel,'Processed');
 assert(item.date);
});
test('unmapped GL accounts prevent a fully passing label',()=>{
 const item=find(buildBalancingOverview({result:gl,unmapped:[{gl:'999'}]}),'shares-loans');
 assert.equal(item.status,'Partial Verification');
 assert.equal(item.issueCount,1);
});
test('missing or failed GL results do not report Checks Passed',()=>{
 const blank=find(buildBalancingOverview({result:{sections:[]}}),'shares-loans');
 assert.equal(blank.status,'Not Run');
 const failed=find(buildBalancingOverview({result:{...gl,sections:[{rows:[{executed:true,branchOnly:false,ok:false}]}]}}),'shares-loans');
 assert.equal(failed.status,'Exceptions');
});
test('Share Drafts report passed source checks without certifying GL balances',()=>{
 const draft={summary:{G:0},checks:Array.from({length:5},()=>({ok:true})),reports:[{date:'11/24/2026'},{date:'11/24/2026'}]};
 const item=find(buildBalancingOverview({draftResult:draft}),'drafts');
 assert.equal(item.status,'Checks Passed');
 assert.match(item.detail,/source-report controls/);
 assert.match(item.limitations[0],/does not certify General Ledger/);
 assert.equal(find(buildBalancingOverview({draftResult:{...draft,checks:[]}}),'drafts').status,'Not Run');
 assert.equal(find(buildBalancingOverview({draftResult:{...draft,checks:[{ok:true}]}}),'drafts').status,'Partial Verification');
 assert.equal(find(buildBalancingOverview({draftResult:{...draft,checks:[{ok:false}]}}),'drafts').status,'Exceptions');
 assert.equal(find(buildBalancingOverview({draftResult:{...draft,summary:{G:50}}}),'drafts').status,'Exceptions');
});
test('EFT passing subset remains partial, differing dates are explicit',()=>{
 const eft={issues:[],controls:[{status:'matched'}],reports:[{date:'2026-11-22'},{date:'2026-11-23'}]};
 const item=find(buildBalancingOverview({eftResult:eft}),'eft');
 assert.equal(item.status,'Partial Verification');
 assert.equal(item.date,'Multiple dates');
 assert.equal(find(buildBalancingOverview({eftResult:{...eft,issues:['Wrong date']}}),'eft').status,'Exceptions');
});
test('ATM and ACH passing controls remain explicitly prototypes',()=>{
 const atm={date:'2026-11-24',checks:[{ok:true},{ok:true}]};
 const ach={checks:[{date:'2026-11-24',ok:true}],issues:0};
 const cards=buildBalancingOverview({atmResult:atm,achResult:ach});
 assert.equal(find(cards,'atm').status,'Prototype Checks Passed');
 assert.equal(find(cards,'ach').status,'Prototype Checks Passed');
 assert.equal(find(cards,'atm').date,'2026-11-24');
 assert.equal(find(cards,'ach').date,'2026-11-24');
 assert.equal(find(buildBalancingOverview({achResult:{...ach,issues:2}}),'ach').status,'Exceptions');
});

test('individual control outcomes distinguish failed, unverified, and additional issues',()=>{
 const cards=buildBalancingOverview({
  result:gl,
  draftResult:{checks:[{label:'Posting totals',ok:true},{label:'Transmission totals',ok:false}],summary:{G:0}},
  eftResult:{controls:[{label:'Matched',status:'matched'},{label:'Missing source',status:'unverified'},{label:'Mismatch',status:'exception'}],issues:['Source date issue']},
  atmResult:{checks:[{name:'Physical cash',ok:true}]},
  achResult:{checks:[{date:'2026-11-24',direction:'DEBIT',ok:false},{date:'2026-11-24',direction:'CREDIT',ok:true}],issues:5}
 });
 assert.deepEqual(find(cards,'eft').counts,{Passed:1,Failed:1,Unverified:1});
 assert.equal(find(cards,'eft').otherIssues,1);
 assert.equal(find(cards,'drafts').checks[0].label,'Posting totals');
 assert.equal(find(cards,'ach').otherIssues,4);
 assert.equal(find(cards,'atm').checks[0].label,'Physical cash');
 assert(cards.every(c=>c.scope&&c.limitations.length&&c.checks.length===c.checkCount));
});
