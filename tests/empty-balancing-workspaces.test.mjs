import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=path=>readFileSync(new URL('../src/'+path,import.meta.url),'utf8');

test('EFT begins empty and requires real uploaded source files',()=>{
 const eft=source('EFT.jsx');
 assert.doesNotMatch(eft,/EFT_PREVIEW|showPreview|prepopulated historical controls/);
 assert.match(eft,/!data\?<p>Import core day totals/);
 assert.match(eft,/disabled=\{!data\|\|busy\}/);
 assert.match(eft,/if\(!autoRun\|\|data\|\|!roles.every\(role=>files\[role\]\)\)return/);
 assert.doesNotMatch(eft,/>Run EFT Review<\/button>/);
});

test('Share Draft begins empty without historical sample results',()=>{
 const draft=source('ShareDrafts.jsx');
 assert.doesNotMatch(draft,/SHARE_DRAFT_PREVIEW|prepopulated|historical example|const preview=/i);
 assert.match(draft,/const displayed=data;/);
 assert.match(draft,/!displayed\?<p>Import SDPS, SDRE and SDRT/);
 assert.match(draft,/if\(!autoRun\|\|data\|\|!roles.every\(role=>files\[role\]\)\)return/);
 assert.doesNotMatch(draft,/>Run Share Draft Checks<\/button>/);
});

test('Shares and Loans no longer shows synthetic balances on initial view',()=>{
 const main=source('main.jsx');
 assert.doesNotMatch(main,/Shares &amp; Loans — prepopulated sample balances/);
 assert.doesNotMatch(main,/Embedded Shares and Loans demo preview/);
 assert.match(main,/Folder Configuration/);
 assert.match(main,/DEMO_SECTIONS/,'Explicit demo mode stays available without prepopulated live displays');
});

test('Shares, Loans and Cash rely on automatic Overview reconciliation without manual Run buttons',()=>{
 const main=source('main.jsx');
 assert.doesNotMatch(main,/>Run Balancing<\/button>/);
 assert.doesNotMatch(main,/Run balancing →/);
 assert.match(main,/page==='overview'&&startupLoaded&&coreSystem==='xp2'/);
 assert.match(main,/page!=='overview'&&balancing&&result/);
});
