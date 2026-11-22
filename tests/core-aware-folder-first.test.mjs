import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {coreIngestion,identifyCoreFile,classifyCoreFiles,sourceCoverage,CORE_RECONCILIATION_RULES} from '../src/core-ingestion-profiles.mjs';
const main=readFileSync(new URL('../src/main.jsx',import.meta.url),'utf8');
const file=name=>({name,size:123});

test('XP2 core profile has explicit source requirements',()=>{
 assert.deepEqual(coreIngestion('xp2').roles['shares-loans'],['gl','svst','lnst','cobd']);
 assert.deepEqual(coreIngestion('xp2').roles.cash,['gl','cobd']);
 assert.equal(identifyCoreFile(file('SVST_20261120.txt')).role,'svst');
 assert.equal(identifyCoreFile(file('GL_Trial_Balance_20261120.txt')).role,'gl');
 assert.equal(identifyCoreFile(file('EFT_GL_Detail.pdf')).role,'eftgl');
 assert.equal(identifyCoreFile(file('ShareDrafts_GL_Detail.pdf')).role,'draftgl');
 assert.equal(identifyCoreFile(file('some-unrelated-file.csv')).role,'');
});

test('DataSafe and Portico remain unverified and cannot accidentally inherit XP2 patterns',()=>{
 for(const core of ['datasafe','portico']){
  assert.equal(coreIngestion(core).adapter,null);
  assert.equal(identifyCoreFile(file('SVST.txt'),core).role,'');
  assert.equal(sourceCoverage(core,'shares-loans',{},[]).status,'not-validated');
  assert.equal(CORE_RECONCILIATION_RULES[core].validation,'pending');
 }
});

test('filename discovery reports missing roles and duplicate candidates without asserting accounting readiness',()=>{
 const candidates=classifyCoreFiles([file('SVST.txt'),file('SVST_copy.txt'),file('LNST.txt'),file('COBD.txt'),file('GL_Trial_Balance.pdf')]);
 assert.equal(candidates.length,5);
 const ready=sourceCoverage('xp2','shares-loans',{},candidates);
 assert.deepEqual(ready.missing,[]);
 assert.deepEqual(ready.duplicates,['svst']);
 assert.equal(ready.status,'conflict');
 assert.equal(sourceCoverage('xp2','cash',{},candidates).status,'file-coverage-only');
 assert.match(ready.message,/does not establish/);
});

test('sidebar is navigation-only and folder scan resets stale reconciliation state',()=>{
 assert.match(main,/Open folder import/);
 assert.doesNotMatch(main,/compact-file-picker/);
 assert.match(main,/classifyCoreFiles\(list,coreSystem\)/);
 assert.match(main,/function stageFiles\(list\)\{[\s\S]*?setFiles\(\{\}\)/);
 assert.match(main,/coreSystem!=='xp2'\)\{setError\(CORE_SYSTEMS/);
 assert.match(main,/Folder Configuration/);
 assert.match(main,/Source coverage by module/);
});

test('unverified adapters cannot start XP2 reconciliation or publish provisional mapping',()=>{
 assert.match(main,/disabled=\{busy\|\|coreSystem!=='xp2'\} onClick=\{run\}/);
 assert.match(main,/canSave=\{centralTenant&&settingsReady&&!busy&&coreSystem==='xp2'\}/);
 assert.match(main,/const displaySections=coreSystem==='xp2'\?/);
});
test('folder sweep is bounded and rejects partial import',()=>{
 assert.match(main,/async function sweep\(directory,depth\)/);
 assert.match(main,/if\(list.length>200\)throw Error/);
 assert.match(main,/if\(depth>=3\)skippedDeepFolders\+\+/);
 assert.match(main,/deeper subfolder\(s\) were skipped/);
});
