import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
for(const name of ['OutputPdfHistory.jsx','main.jsx']){
 const source=readFileSync(new URL('../src/'+name,import.meta.url),'utf8');
 test(name+' opens local PDF without a CSP-blocked iframe',()=>{
  const handler=source.slice(source.indexOf(name==='main.jsx'?'async function openSavedPdf()':'async function openPdf(item)'));
  assert.ok(handler.indexOf("window.open('about:blank','_blank')")<handler.indexOf('await '));
  assert.match(handler,/tab\.opener=null/);
  assert.match(handler,/tab\.location\.replace\(/);
  assert.match(handler,/target="_blank" rel="noopener noreferrer"/);
  assert.match(handler,/download=\{/);
  assert.doesNotMatch(handler,/<iframe[^>]*(?:preview\.url|pdfPreview\.url)/);
 });
}
