import test from 'node:test';
import assert from 'node:assert/strict';
import {parseAchFile,reconcileACH} from '../src/ach-reconciliation.mjs';
const transactions='date,trace_id,direction,amount\n2026-11-23,A001,CREDIT,125.00\n2026-11-23,A002,DEBIT,20.25\n';
const totals='date,direction,amount\n2026-11-23,CREDIT,125.00\n2026-11-23,DEBIT,20.25\n';
test('balanced matching entries and controls',()=>{
 const inputs={activity:parseAchFile('activity',transactions),posting:parseAchFile('posting',transactions),settlement:parseAchFile('settlement',totals),gl:parseAchFile('gl',totals)};
 const result=reconcileACH(inputs);assert.equal(result.issues,0);assert.equal(result.unmatched.length,0);assert(result.checks.every(r=>r.ok));
});
test('missing core posting creates unmatched and posting variance',()=>{
 const inputs={activity:parseAchFile('activity',transactions),posting:parseAchFile('posting','date,trace_id,direction,amount\n2026-11-23,A001,CREDIT,125.00'),settlement:parseAchFile('settlement',totals),gl:parseAchFile('gl',totals)};
 const result=reconcileACH(inputs);assert.equal(result.unmatched.length,1);assert.equal(result.unmatched[0].source,'Operator only');assert(result.issues>0);
});
test('invalid normalized formats are rejected',()=>{
 assert.throws(()=>parseAchFile('activity','date,direction,amount\n2026-11-23,CREDIT,2'),/Required columns/);
 assert.throws(()=>parseAchFile('settlement','date,direction,amount\n2026-11-23,CREDIT,-2'),/nonnegative/);
 assert.throws(()=>parseAchFile('gl','date,direction,amount\n2026-11-23,CREDIT,2.123'),/Invalid amount/);
});
test('duplicate transaction keys respect multiplicity',()=>{
 const inputs={activity:parseAchFile('activity',transactions+ '2026-11-23,A002,DEBIT,20.25\n'),posting:parseAchFile('posting',transactions),settlement:parseAchFile('settlement',totals),gl:parseAchFile('gl',totals)};
 const report=reconcileACH(inputs);assert.equal(report.unmatched[0].count,1);
});
