import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const main=readFileSync(new URL('../src/main.jsx',import.meta.url),'utf8');
const help=readFileSync(new URL('../src/SectionHelp.jsx',import.meta.url),'utf8');
test('Settings includes compact Input and Output folder controls with clear icons',()=>{
 for(const label of ['Input Folder','Output Folder'])assert.match(main,new RegExp('>'+label+'<'));
 for(const id of ['abacus-input-folder','abacus-output-folder'])assert.match(main,new RegExp('id="'+id+'"'));
 assert.match(main,/onClick=\{clearInputFolder\}/);
 assert.match(main,/onClick=\{clearOutputFolder\}/);
 assert.match(main,/aria-label="Clear input folder selection"/);
 assert.match(main,/aria-label="Clear output folder selection"/);
 assert.match(main,/Scan input folder/);
});
test('Input folder remains scan-only and output folder is saved locally for automatic PDF reports',()=>{
 assert.match(main,/rememberFolder\(handle,folderScope\)/);
 assert.match(main,/showDirectoryPicker\(\{mode:'readwrite'\}\)/);
 assert.match(main,/saveSetting\(folderScope,'output-folder',handle\)/);
 assert.match(main,/deleteSetting\(folderScope,'output-folder'\)/);
 assert.match(main,/outputFolder\.getFileHandle\(savedPdf\.filename\)/);
 assert.doesNotMatch(main,/outputFolder\.getFileHandle\([^)]*,\s*\{create:true\}/);
 assert.match(main,/Consolidated balancing PDFs will be saved here when write permission is granted/);
 assert.match(main,/setFolderConnection\('missing'\)/);
});
test('Settings sections provide accessible help dialogs instead of paragraph instructions',()=>{
 for(const title of ['Folder Configuration','AI investigation assistant','GL Balance Sign Swap','Core system','Account mapping','Local workspace'])
  assert.match(main,new RegExp('<SectionHelp title="'+title+'"'));
 assert.match(help,/showModal\(\)/);
 assert.match(help,/ref\.current\?\.close\(\)/);
 assert.match(help,/aria-label=\{'Help: '\+title\}/);
});
