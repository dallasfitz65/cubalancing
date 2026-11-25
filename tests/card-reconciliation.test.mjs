import test from 'node:test';
import assert from 'node:assert/strict';
import {CARD_DEMO,cardDemo,parseCardFile,reconcileCards} from '../src/card-reconciliation.mjs';
test('balanced fixture passes all five controls',()=>{const r=cardDemo();assert.equal(r.issues,0);assert.equal(r.checks.length,5);assert.equal(r.synthetic,true);});
test('GL difference is detected',()=>{const r=cardDemo(true);assert.equal(r.issues,1);assert.equal(r.checks[1].variance,-2500);});
test('mismatched business dates rejected',()=>{const x=Object.fromEntries(Object.entries(CARD_DEMO).map(([k,v])=>[k,parseCardFile(k,k==='gl'?v.replace('2026-11-24','2026-11-23'):v)]));assert.throws(()=>reconcileCards(x),/dates/);});
test('duplicates detected',()=>{const x=Object.fromEntries(Object.entries(CARD_DEMO).map(([k,v])=>[k,parseCardFile(k,k==='transactions'?v+'\n2026-11-24,T001,purchase,100':v)]));assert.equal(reconcileCards(x).checks[4].ok,false);});
test('noninteger amounts rejected',()=>assert.throws(()=>parseCardFile('balances','date,opening_cents,closing_cents\n2026-11-24,1.2,3'),/integer/));
