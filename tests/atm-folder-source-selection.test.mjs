import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {classifyCoreFiles} from '../src/core-ingestion-profiles.mjs';
import {selectUniqueSourceFiles} from '../src/source-file-selection.mjs';
const src=path=>readFileSync(new URL('../src/'+path,import.meta.url),'utf8');
const file=name=>({name,size:100});
test('loads standard ATM files when both synthetic GL variants share the folder',()=>{
 const names=['atm-transactions.csv','atm-cash-count.csv','atm-settlement.csv','atm-gl.csv','atm-gl-exception.csv'];
 const {files,duplicates,ignored}=selectUniqueSourceFiles(classifyCoreFiles(names.map(file),'xp2'));
 assert.deepEqual(['atm_transactions','atm_cash','atm_settlement','atm_gl'].filter(role=>!files[role]),[]);
 assert.equal(files.atm_gl.name,'atm-gl.csv');
 assert.deepEqual(ignored,['atm-gl-exception.csv']);
 assert.equal(duplicates.size,0);
});
test('arbitrary duplicate ATM GL candidates are withheld, never selected silently',()=>{
 const {files,duplicates}=selectUniqueSourceFiles(classifyCoreFiles(['atm-gl.csv','atm-gl-backup.csv'].map(file),'xp2'));
 assert.equal(files.atm_gl,undefined);
 assert.ok(duplicates.has('atm_gl'));
});
test('both startup and folder scans use the same safe source selection',()=>{
 const main=src('main.jsx');
 assert.equal(main.split('selectUniqueSourceFiles(found)').length-1,2);
 assert.match(main,/setAtmResult\(null\)/);
 assert.match(main,/page==='overview'&&startupLoaded&&coreSystem==='xp2'/);
});
test('EFT and Share Draft report screens omit redundant file metadata while preserving results',()=>{
 const eft=src('EFT.jsx'),draft=src('ShareDrafts.jsx');
 assert.doesNotMatch(eft,/<h3>Files used<\/h3>/);
 assert.doesNotMatch(eft,/<th>SOURCE<\/th><th>INSTITUTION<\/th><th>BUSINESS DATE<\/th>/);
 assert.match(eft,/Cross-source reconciliation checks/);
 assert.doesNotMatch(draft,/<h3>Files Used<\/h3>/);
 assert.match(draft,/className="draft-summary"/);
});
