import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const main=readFileSync(new URL('../src/main.jsx',import.meta.url),'utf8');
test('Overview retains dashboard summary and navigation to detailed workspaces',()=>{
 assert.match(main,/page==='overview'&&hasReconciliationResults&&<section className="abacus-exec-overview"/);
 assert.match(main,/page==='overview'&&hasReconciliationResults&&<section className="dashboard-quicklinks"/);
 assert.match(main,/page==='overview'&&!hasReconciliationResults&&folderConnection==='ready'&&<section/);
});
test('GL details and account sections are restricted to detail pages',()=>{
 assert.match(main,/page!=='overview'&&balancing&&result&&/);
 assert.match(main,/page!=='overview'&&balancing&&coreSystem==='xp2'&&!result/);
 assert.doesNotMatch(main,/page==='overview'&&eftResult&&<div className="overview-drafts"/);
 assert.doesNotMatch(main,/page==='overview'&&draftResult&&<div className="overview-drafts"/);
 assert.doesNotMatch(main,/\(page==='overview'\|\|page==='history'\|\|page==='audit'\)&&<section className="activity"/);
});
test('automatic reconciliation still runs from Overview without showing detailed reports',()=>{
 assert.match(main,/page==='overview'&&startupLoaded&&coreSystem==='xp2'&&<div hidden aria-hidden="true">/);
 assert.match(main,/if\(!settingsReady\|\|coreSystem!=='xp2'\|\|page!=='overview'\|\|mode!=='real'\)return/);
});
