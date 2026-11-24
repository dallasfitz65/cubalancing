import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {displayRunForSign} from '../src/reconciliation-sign-display.mjs';
import {normalizeGL} from '../src/gl-sign-convention.mjs';
import {importMaster,buildMappedSections} from '../src/master-mapping.mjs';
const master=importMaster([
 '901-0010,Regular Shares,,,Shares,1',
 '901-0020,Personal Choice,,,Shares,2',
 '701-0000,Loans,,,Loans,4',
 '739-0000,Cash,,,Cash,TOTALS FOR BRANCH NBR 1'
].join('\n'));
const records=[
 {account:'901-0010',cents:105000},{account:'901-0020',cents:25000},
 {account:'701-0000',cents:1370000},{account:'739-0000',cents:12500000}
];
const original=buildMappedSections(master,normalizeGL({records},'credit-negative'),{'1':105000,'2':25000},{'4':1370000},{branches:[{num:'1',total:125000}]})
 .map(s=>({...s,rows:s.rows.map(r=>({...r,executed:true}))}));
const run={mode:'real',sections:original,meta:{records,signConvention:'credit-negative'},issues:2};
test('same GL file immediately displays zero variance under As reported selection',()=>{
 const displayed=displayRunForSign(run,'natural');
 assert.equal(displayed.sections.find(s=>s.id==='shares').rows[0].tb,'$1,050.00');
 assert.equal(displayed.sections.find(s=>s.id==='shares').rows[0].varRaw,0);
 assert.equal(displayed.sections.find(s=>s.id==='shares').rows[1].varRaw,0);
 assert.equal(displayed.issues,0);
 assert.equal(displayed.signPreview,true);
});
test('original saved reconciliation and GL metadata stay unchanged',()=>{
 displayRunForSign(run,'natural');
 assert.equal(run.sections[0].rows[0].varRaw,2100);
 assert.equal(run.meta.signConvention,'credit-negative');
 assert.equal(displayRunForSign(run,'credit-negative'),run);
});
test('real one-cent difference remains an exception after sign adjustment',()=>{
 const changed={...run,sections:run.sections.map(section=>({...section,rows:section.rows.map(row=>row.gl==='901-0010'?{...row,svst:'$1,050.01'}:row)}))};
 const displayed=displayRunForSign(changed,'natural');
 assert.equal(displayed.sections.find(s=>s.id==='shares').rows[0].varRaw,.01);
 assert.equal(displayed.issues,1);
});
test('missing values are never auto-balanced',()=>{
 const changed={...run,sections:run.sections.map(section=>({...section,rows:section.rows.map(row=>row.gl==='901-0010'?{...row,varRaw:null,var:'MISSING DATA'}:row)}))};
 const displayed=displayRunForSign(changed,'natural');
 assert.equal(displayed.sections.find(s=>s.id==='shares').rows[0].varRaw,null);
});
test('UI renders convention in results and previews without wiping the report',()=>{
 const ui=readFileSync(new URL('../src/main.jsx',import.meta.url),'utf8');
 assert.match(ui,/const visibleRun=displayRunForSign\(result,sign\)/);
 assert.match(ui,/GL sign convention:/);
 assert.match(ui,/Recalculated display preview from original GL balances/);
 assert.match(ui,/Balancing refreshes automatically on Overview/);
 assert.doesNotMatch(ui,/function setConvention\(value\)[^}]*setResult\(null\)/);
});
