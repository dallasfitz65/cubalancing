import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {importMaster} from '../src/master-mapping.mjs';

test('six-column GL translation CSV is accepted and maps category/source correctly',()=>{
 const rows=importMaster('901-0010,Regular Shares,,,Shares,1\n701-0000,Unsecured Loans,,,Loans,4\n739-0000,Cash on Hand,,,Cash,TOTALS FOR BRANCH NBR 1\n');
 assert.equal(rows.length,3);
 assert.deepEqual(rows.map(r=>r.source),['SVST','LNST','COBD']);
});
test('malformed mapping CSV and conflicting core codes are rejected',()=>{
 assert.throws(()=>importMaster('GL,Description,Category,Code'),/columns/);
 assert.throws(()=>importMaster('901-0010,Regular Shares,,,Shares,1\n901-0020,Other Shares,,,Shares,1'),/Conflicting mapping/);
 assert.throws(()=>importMaster('901-0010,Regular Shares,BAD,,Shares,1'),/expected GL/);
});
test('mapping importer offers review, icon picker, and an explicit versioned tenant save',()=>{
 const component=readFileSync(new URL('../src/GLMappingImport.jsx',import.meta.url),'utf8');
 const main=readFileSync(new URL('../src/main.jsx',import.meta.url),'utf8');
 const api=readFileSync(new URL('../netlify/functions/tenants.mjs',import.meta.url),'utf8');
 assert.match(component,/importMaster\(text\)/);
 assert.match(component,/save-mapping/);
 assert.match(component,/version\}\}/);
 assert.doesNotMatch(component,/Download current mapping CSV/);
 assert.match(component,/window\.confirm/);
 assert.match(main,/<GLMappingImport/);
 assert.match(main,/setMappingVersion\(nextVersion\)/);
 assert.match(api,/Credit union administrator required/);
 assert.match(api,/Mapping changed elsewhere; reload before saving/);
});
