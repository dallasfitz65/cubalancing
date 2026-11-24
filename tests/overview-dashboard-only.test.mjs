import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const main=readFileSync(new URL('../src/main.jsx',import.meta.url),'utf8');
test('Overview retains the five-section status board and detail links',()=>{
 assert.match(main,/page==='overview'&&<section className="abacus-exec-overview"/);
 assert.match(main,/page==='overview'&&<section className="dashboard-quicklinks"/);
 assert.match(main,/page==='overview'&&!hasReconciliationResults&&folderConnection==='ready'&&<section/);
});
test('GL details and account sections stay on detail pages',()=>{
 assert.match(main,/page!=='overview'&&balancing&&result&&/);
 assert.match(main,/page!=='overview'&&balancing&&coreSystem==='xp2'&&!result/);
 assert.doesNotMatch(main,/page==='overview'&&eftResult&&<div className="overview-drafts"/);
 assert.doesNotMatch(main,/page==='overview'&&draftResult&&<div className="overview-drafts"/);
});
test('automatic processing still runs on Overview without detailed reports',()=>{
 assert.match(main,/page==='overview'&&startupLoaded&&coreSystem==='xp2'&&<div hidden aria-hidden="true">/);
 assert.match(main,/if\(!settingsReady\|\|coreSystem!=='xp2'\|\|page!=='overview'\|\|mode!=='real'\)return/);
});
