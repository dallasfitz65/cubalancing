import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const file=path=>readFileSync(new URL('../src/'+path,import.meta.url),'utf8');
const main=file('main.jsx'),atm=file('ATM.jsx'),eft=file('EFT.jsx'),drafts=file('ShareDrafts.jsx'),css=file('styles.css');

test('all balancing modules share one page-header template',()=>{
 assert.match(main,/\['shares-loans','cash','drafts','eft','atm','ach'\]\.includes\(page\)&&<div className="reconciliation-page-header">/);
 for(const label of ['Shares, Loans and Cash Balancing','Cash Balancing','Share Draft Balancing','EFT Balancing','ATM Balancing','ACH Balancing'])assert.ok(main.includes(label),label);
 assert.match(css,/\.reconciliation-page-header h1/);
 assert.doesNotMatch(atm,/<div className="draft-report-title"><h2>ATM Balancing<\/h2><\/div>/);
});

test('run buttons removed while validated automation and printing remain',()=>{
 assert.doesNotMatch(main,/Run balancing →/);
 assert.doesNotMatch(main,/>Run Balancing<\/button>/);
 assert.doesNotMatch(atm,/>Run ATM Balancing<\/button>/);
 assert.doesNotMatch(eft,/>Run EFT Review<\/button>/);
 assert.doesNotMatch(drafts,/>Run Share Draft Checks<\/button>/);
 for(const component of [atm,eft,drafts])assert.match(component,/autoRun/);
 assert.match(main,/page==='overview'&&startupLoaded&&coreSystem==='xp2'/);
 assert.doesNotMatch(atm,/loadDemo\(/);
 assert.doesNotMatch(atm,/Load balanced test files|Load exception test files/);
});

test('ATM folder imports schedule automatic reconciliation and missing source files never pass',()=>{
 assert.match(main,/page==='overview'&&startupLoaded&&coreSystem==='xp2'/);
 assert.match(atm,/if\(!autoRun\|\|!ready\|\|initialReport\)return/);
 assert.match(atm,/const missing=SOURCES.filter/);
 assert.match(atm,/setError\(e.message\)/);
});

test('ATM report title spacing is compact and navigation uses balancing terminology',()=>{
 assert.match(css,/\.reconciliation-page-header \+ \.atm-workspace\{padding-top:12px/);
 assert.match(css,/\.atm-workspace \.draft-report-title\{margin:0 0 14px\}/);
 assert.match(main,/\['BALANCING','Share Drafts','drafts'\]/);
 assert.match(main,/\['','ATM Balancing','atm'\]/);
 assert.match(atm,/ATM Balancing · Local rules-based assistant/);
});
