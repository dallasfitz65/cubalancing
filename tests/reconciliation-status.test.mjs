import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const main=readFileSync(new URL('../src/main.jsx',import.meta.url),'utf8');
test('Overview uses one shared status board for all five balancing sections',()=>{
 assert.match(main,/page==='overview'&&<section className="abacus-exec-overview"/);
 assert.match(main,/buildBalancingOverview\(\{result:visibleRun\|\|result,draftResult,eftResult,atmResult,achResult,unmapped\}\)/);
 assert.match(main,/k\.status/);
 assert.match(main,/k\.date/);
 assert.match(main,/navigateSection\(k\.id\)/);
 assert.doesNotMatch(main,/<div className="html-report-date">/);
});
