import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {extractGL} from '../src/gl-parser-core.mjs';

test('AI toggle stays interactable if settings load is pending and reports save attempts',()=>{
 const ui=readFileSync(new URL('../src/main.jsx',import.meta.url),'utf8');
 assert.match(ui,/useEffect\(\(\)=>\{let active=true;setSettingsReady\(false\);setAiEnabled\(false\)/);
 assert.doesNotMatch(ui,/setMaster\(getCoreMapping\(coreSystem\)\);setSettingsReady\(!centralTenant\)/);
 assert.match(ui,/aria-pressed=\{aiEnabled\}/);
 assert.match(ui,/Credit union settings are still loading/);
 assert.match(ui,/AI setting could not be saved/);
});
test('Share Draft checks do not require PDF extraction or PDF destruction',()=>{
 const drafts=readFileSync(new URL('../src/ShareDrafts.jsx',import.meta.url),'utf8');
 assert.match(drafts,/\['sdps','sdre','sdrt'\]/);
 assert.doesNotMatch(drafts,/destroy\s*\(/);
 assert.doesNotMatch(drafts,/pdfjs|getDocument/);
});
test('GL PDF parser does not replace extraction errors with destroy-not-a-function',async()=>{
 const pdfFile={name:'test.pdf',size:18,arrayBuffer:async()=>new TextEncoder().encode('%PDF-1.7 test content').buffer};
 const pdfLibrary={
  getDocument:()=>({promise:Promise.resolve({numPages:1,getPage:async()=>({getViewport:()=>({transform:[1,0,0,1,0,0]}),getTextContent:async()=>({items:[]}),cleanup(){}})})}),
  Util:{transform:(a,b)=>b},PasswordResponses:{INCORRECT_PASSWORD:2}
 };
 await assert.rejects(extractGL(pdfFile,{pdfLibrary}),/no extractable text/);
});
test('EFT PDF cleanup verifies destroy method',()=>{
 const eft=readFileSync(new URL('../src/EFT.jsx',import.meta.url),'utf8');
 assert.match(eft,/typeof doc\.destroy==='function'/);
});
