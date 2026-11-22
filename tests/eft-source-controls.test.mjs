import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {checkEFTSourceControls} from '../src/eft-source-controls.mjs';

const reports=[
 {role:'eftday',text:'Credits: 12 425.00   Debits: 18 1,850.00'},
 {role:'eftstar',text:'POSTING TO CUSTOMER ACCOUNT 1,850.00 425.00\nTOTALS: 2,275.00 2,275.00'},
 {role:'eftteller',text:'Teller 99 paid out 1,850.00 received 425.00'}
];
test('all five source controls match the supplied synthetic EFT fixtures',()=>{
 const checks=checkEFTSourceControls(reports);
 assert.equal(checks.length,5);
 assert.ok(checks.every(c=>c.status==='matched'&&c.variance===0));
});
test('real 1 cent mismatch is reported without inventing GL reconciliation',()=>{
 const changed=reports.map(r=>r.role==='eftteller'?{...r,text:'Teller 99 paid out 1,850.01 received 425.00'}:r);
 const checks=checkEFTSourceControls(changed);
 assert.equal(checks.filter(c=>c.status==='exception').length,1);
 assert.equal(checks[2].variance,-1);
});
test('missing source control is never called balanced',()=>{
 const checks=checkEFTSourceControls(reports.filter(r=>r.role!=='eftteller'));
 assert.ok(checks.some(c=>c.status==='unverified'));
});
test('EFT UI is explicit about partial checks and pending GL settlement',()=>{
 const jsx=readFileSync(new URL('../src/EFT.jsx',import.meta.url),'utf8');
 assert.match(jsx,/checkEFTSourceControls\(reports\)/);
 assert.match(jsx,/They do not verify ATM owner transactions/);
 assert.match(jsx,/settlement adjustments require confirmed balancing rules/);
 assert.doesNotMatch(jsx,/EFT Balancing — Source Review/);
 assert.doesNotMatch(jsx,/Print \/ PDF/);
 assert.doesNotMatch(jsx,/Source review completed\. Cross-source controls shown below/);
 assert.match(jsx,/Cross-source reconciliation checks/);
 assert.match(jsx,/They do not verify ATM owner transactions/);
});
