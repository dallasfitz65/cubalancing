import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const ui=readFileSync(new URL('../src/main.jsx',import.meta.url),'utf8');
test('source coverage is hidden before files are scanned',()=>{
 assert.match(ui,/coreIngestion\(coreSystem\)\.adapter&&candidates\.length>0&&<section aria-label="Module file readiness"/);
});
test('scanned file details are collapsible while coverage calculation remains available',()=>{
 assert.match(ui,/<details className="source-coverage-details">/);
 assert.match(ui,/<summary><strong>View File Details<\/strong>/);
 assert.match(ui,/Source coverage by module/);
 assert.match(ui,/sourceCoverage\(coreSystem,module,files,candidates\)/);
 assert.match(ui,/<\/details><\/section>/);
});
