import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=path=>readFileSync(new URL('../src/'+path,import.meta.url),'utf8');

test('EFT begins empty and requires real uploaded source files',()=>{
 const eft=source('EFT.jsx');
 assert.doesNotMatch(eft,/EFT_PREVIEW|showPreview|prepopulated historical controls/);
 assert.match(eft,/!data\?<p>Load core day totals/);
 assert.match(eft,/disabled=\{!data\|\|busy\}/);
 assert.match(eft,/Run EFT Review/);
});

test('Share Draft begins empty without historical sample results',()=>{
 const draft=source('ShareDrafts.jsx');
 assert.doesNotMatch(draft,/SHARE_DRAFT_PREVIEW|prepopulated|historical example|const preview=/i);
 assert.match(draft,/const displayed=data;/);
 assert.match(draft,/!displayed\?<p>Load SDPS, SDRE and SDRT/);
 assert.match(draft,/Run Share Draft Checks/);
});

test('Shares and Loans no longer shows synthetic balances on initial view',()=>{
 const main=source('main.jsx');
 assert.doesNotMatch(main,/Shares &amp; Loans — prepopulated sample balances/);
 assert.doesNotMatch(main,/Embedded Shares and Loans demo preview/);
 assert.match(main,/Select your source files from the left menu/);
 assert.match(main,/DEMO_SECTIONS/,'Explicit demo mode stays available without prepopulated live displays');
});

test('Shares, Loans and Cash shows Run Balancing beside other green workspace actions',()=>{
 const main=source('main.jsx');
 assert.match(main,/page==='shares-loans'&&<div className="draft-actions shares-loans-actions"><button type="button" className="primary" disabled=\{busy\} onClick=\{run\}/);
 assert.match(main,/balancing&&page!=='shares-loans'&&<button className="primary"/,'Do not show a duplicate run button in the header');
 assert.match(main,/page==='shares-loans'&&<div className="draft-actions shares-loans-actions">[\s\S]*Run Balancing/);
});
