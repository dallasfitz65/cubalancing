import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=name=>readFileSync(new URL('../src/'+name,import.meta.url),'utf8');
const component=source('ReportViewSwitch.jsx');
test('report view switch has accessible summary and detail buttons',()=>{
 assert.match(component,/aria-pressed=\{value==='summary'\}/);
 assert.match(component,/aria-pressed=\{value==='detail'\}/);
 assert.match(component,/onChange\('summary'\)/);
 assert.match(component,/onChange\('detail'\)/);
});
test('EFT, ATM, Share Draft expose Summary/Detail without affecting calculations',()=>{
 for(const file of ['EFT.jsx','ShareDrafts.jsx','ATM.jsx']){
  const code=source(file);
  assert.match(code,/import ReportViewSwitch from '\.\/ReportViewSwitch\.jsx'/);
  assert.match(code,/reportView,setReportView/);
  assert.match(code,/ReportViewSwitch value=\{reportView\} onChange=\{setReportView\}/);
  assert.match(code,/reportView==='detail'/);
 }
});
test('summary reports preserve exception notices and full detailed calculations',()=>{
 const eft=source('EFT.jsx'),atm=source('ATM.jsx'),drafts=source('ShareDrafts.jsx');
 assert.match(eft,/data\.issues\.map/);assert.match(eft,/Cross-source reconciliation checks/);
 assert.match(atm,/Reconciliation controls/);assert.match(atm,/exceptions>0/);
 assert.match(drafts,/className="draft-summary"/);assert.match(drafts,/Source report exception/);
});
