import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {EFT_PREVIEW} from '../src/eft-preview.mjs';
test('core and teller daily net agree only within same institution/date',()=>{
 const group=EFT_PREVIEW.groups.find(x=>x.id==='core');
 const value=name=>group.rows.find(x=>x.label===name).value;
 assert.equal(value('Core debits (539)')-value('Core credits (18)'),value('Net core withdrawals'));
 assert.equal(value('Teller 99 paid out')-value('Teller 99 received'),value('Teller 99 net cash out'));
 assert.equal(value('Core vs teller net variance'),0);
});
test('STAR internal settlement debit and credit totals agree without cross-institution balancing',()=>{
 const group=EFT_PREVIEW.groups.find(x=>x.id==='network');
 const value=name=>group.rows.find(x=>x.label===name).value;
 assert.equal(value('STAR total debits'),value('STAR total credits'));
 assert.equal(value('ATM owner withdrawals (14)')+value('ATM owner transfers (1)'),value('ATM owner all transactions (16)'));
 assert.notEqual(group.institution,EFT_PREVIEW.groups[0].institution);
});
test('March GL starting plus net activity equals nonzero ending and is not marked balanced',()=>{
 const group=EFT_PREVIEW.groups.find(x=>x.id==='later');
 const value=name=>group.rows.find(x=>x.label===name).value;
 assert.equal(value('GL debits')-value('GL credits'),value('GL net activity'));
 assert.equal(value('GL starting balance')+value('GL net activity'),value('GL ending balance'));
 assert.notEqual(value('GL ending balance'),0);
 assert.notEqual(group.date,EFT_PREVIEW.groups[0].date);
});
test('EFT preview excludes raw credit union identifiers and original reports',()=>{
 const source=readFileSync(new URL('../src/eft-preview.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(source,/Ridgedale|Novartis|476759|MEMBER NUMBER|CARD NUMBER|TRACE ID/i);
 assert.ok(EFT_PREVIEW.historical);
 assert.equal(EFT_PREVIEW.groups.length,3);
});
