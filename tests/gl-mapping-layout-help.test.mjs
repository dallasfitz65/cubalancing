import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const main=readFileSync(new URL('../src/main.jsx',import.meta.url),'utf8');
const master=readFileSync(new URL('../src/MasterMapping.jsx',import.meta.url),'utf8');
const importUI=readFileSync(new URL('../src/GLMappingImport.jsx',import.meta.url),'utf8');
const styles=readFileSync(new URL('../src/styles.css',import.meta.url),'utf8');

test('GL mapping importer and read-only table share one settings row',()=>{
 assert.match(main,/<div className="gl-mapping-panels"><GLMappingImport/);
 assert.match(main,/<MasterMapping master=\{master\}/><\/div><\/\>\}/);
 assert.match(styles,/\.gl-mapping-panels\{display:grid;grid-template-columns/);
 assert.match(styles,/@media\(max-width:1180px\)/);
});
test('read-only mapping explanation is inside matching question-mark help',()=>{
 assert.match(master,/import SectionHelp from '\.\/SectionHelp\.jsx'/);
 assert.match(master,/<SectionHelp title="GL account mapping"><p>Read-only mapping used for balancing/);
 assert.match(master,/Account types are numeric; accounts are grouped by GL and report section/);
 assert.match(importUI,/<SectionHelp title="GL account translation \/ mapping">/);
});
