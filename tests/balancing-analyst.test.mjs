import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeBalancing} from '../src/balancing-analyst.mjs';
test('no results never imply completion',()=>{const r=analyzeBalancing([{id:'atm',label:'ATM',status:'NOT RUN'}]);assert.equal(r.pending,1);assert.equal(r.passed,0);assert.match(r.summary,/No completed/);});
test('failed sections sorted by failed controls, not guessed dollar exposure',()=>{const r=analyzeBalancing([{id:'atm',label:'ATM',status:'FAIL',issueCount:1,counts:{Failed:1},checks:[{label:'Cash',status:'Failed'}]},{id:'eft',label:'EFT',status:'FAIL',issueCount:2,counts:{Failed:2}},{id:'ach',label:'ACH',status:'PASS'}]);assert.equal(r.findings[0].id,'eft');assert.deepEqual(r.findings[1].controls,['Cash']);assert.equal(r.passed,1);});
test('mixed dates exclude GL processing timestamp',()=>{const r=analyzeBalancing([{status:'PASS',date:'2026-11-24',dateLabel:'Business date'},{status:'PASS',date:'2026-11-25',dateLabel:'Business date'},{status:'PASS',date:'2026-11-26',dateLabel:'Processed'}]);assert.equal(r.mixedDates,true);assert.equal(r.dates.length,2);});
test('all pass still does not certify full reconciliation',()=>assert.match(analyzeBalancing([{status:'PASS'}]).summary,/not a certification/));
