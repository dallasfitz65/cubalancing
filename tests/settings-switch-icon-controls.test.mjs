import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizeGL} from '../src/gl-sign-convention.mjs';
const ui=readFileSync(new URL('../src/main.jsx',import.meta.url),'utf8');
const mapping=readFileSync(new URL('../src/GLMappingImport.jsx',import.meta.url),'utf8');
const styles=readFileSync(new URL('../src/styles.css',import.meta.url),'utf8');
const switchControl=readFileSync(new URL('../src/SettingsSwitch.jsx',import.meta.url),'utf8');

test('Settings AI switch remains persisted and labeled',()=>{
 assert.match(ui,/<SettingsSwitch id="ai-investigation-switch"/);
 assert.match(ui,/checked=\{aiEnabled\}/);
 assert.match(ui,/onChange=\{changeAiEnabled\}/);
 assert.match(switchControl,/role="switch"/);
 assert.match(switchControl,/aria-checked=\{checked\}/);
});

test('GL Balance Sign Swap has binary Off as reported and On reverse all, preserving legacy stored behavior',()=>{
 assert.match(ui,/<SettingsSwitch id="gl-sign-swap"/);
 assert.match(ui,/value=>setConvention\(value\?'reverse-all':'natural'\)/);
 assert.match(ui,/sign==='credit-negative'/);
 const source={records:[{account:'701-0000',cents:-14700},{account:'901-0010',cents:-6500}]};
 assert.equal(normalizeGL(source,'natural')['701-0000'],-147);
 assert.equal(normalizeGL(source,'reverse-all')['701-0000'],147);
 assert.equal(normalizeGL(source,'credit-negative')['701-0000'],-147);
});

test('Input and Output folder controls are vertical icon pickers',()=>{
 assert.match(styles,/\.folder-config-grid\{display:flex;flex-direction:column/);
 assert.match(ui,/aria-label="Choose input folder"/);
 assert.match(ui,/aria-label="Choose output folder"/);
 assert.doesNotMatch(ui,/▣<\/span> Browse/);
 assert.match(ui,/aria-label="Clear input folder selection"/);
 assert.match(ui,/aria-label="Clear output folder selection"/);
});

test('Mapping file picker is icon-only; download current mapping control removed',()=>{
 assert.match(mapping,/className="visually-hidden-file"/);
 assert.match(mapping,/mapping-file-icon/);
 assert.match(mapping,/aria-label="Choose updated mapping CSV"/);
 assert.doesNotMatch(mapping,/Download current mapping CSV/);
 assert.doesNotMatch(mapping,/downloadMapping/);
 assert.match(mapping,/importMaster\(text\)/);
});
