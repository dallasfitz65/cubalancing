import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const main=readFileSync(new URL('../src/main.jsx',import.meta.url),'utf8');
const overview=main.match(/<h2>Reconciliation status[\s\S]*?\]\.map\(k=>/)?.[0];

test('reconciliation overview has four requested module status cards',()=>{
 assert.ok(overview,'Overview status cards must exist');
 for(const label of ['Shares, Loans & Cash','Share Draft issues','EFT issues','ATM issues']){
   assert.ok(overview.includes("label:'"+label+"'"),label+' should be a card');
 }
 for(const removed of ['Completed checks','GL variances','Session runs']){
   assert.ok(!overview.includes("label:'"+removed+"'"),removed+' card should be absent');
 }
 assert.equal((overview.match(/label:'/g)||[]).length,4);
});
