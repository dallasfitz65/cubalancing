import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const ui=readFileSync(new URL('../src/UserGuide.jsx',import.meta.url),'utf8');
const main=readFileSync(new URL('../src/main.jsx',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/styles.css',import.meta.url),'utf8');
test('main header groups icon-labeled Help beside Log out without removing Help & Rules',()=>{
 assert.match(main,/import UserGuide from '\.\/UserGuide\.jsx'/);
 assert.match(main,/className="header-account-actions"><UserGuide onNavigate=\{setPage\}/);
 assert.match(main,/page==='help'&&<Help\/>/);
 assert.match(ui,/aria-label="Open Abacus User Guide"/);
 assert.match(ui,/dialog\.current\?\.showModal\(\)/);
 assert.match(ui,/aria-label="Close User Guide"/);
});
test('guide covers real workflows without promising unvalidated automation',()=>{
 for(const section of ['Getting started','Input & output folders','Running reconciliation','Exceptions & evidence','Users & administration','Security & limitations'])assert.ok(ui.includes(section),section);
 assert.match(ui,/DataSafe and Portico appear as selectable cores/);
 assert.match(ui,/production balancing are not validated/);
 assert.match(ui,/does <strong>not<\/strong> currently write files/);
 assert.match(ui,/United Solutions enterprise AI is not yet connected/);
 assert.match(ui,/goTo\('settings'\)/);
 assert.match(ui,/goTo\('help'\)/);
});
test('guide has responsive dialog and does not include confidential sample data',()=>{
 assert.match(css,/\.main-user-guide-dialog/);
 assert.match(css,/@media\(max-width:620px\)/);
 assert.doesNotMatch(ui,/password='|token='|apiKey=/);
});
