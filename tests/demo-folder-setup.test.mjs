import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const ui=readFileSync(new URL('../src/main.jsx',import.meta.url),'utf8');
const migration=readFileSync(new URL('../netlify/database/migrations/20261121010000_rename_demo_credit_union.sql',import.meta.url),'utf8');

test('demo fallback has requested credit union name',()=>{
 assert.match(ui,/\{id:'local-demo',name:'Demo Credit Union'\}/);
 assert.match(ui,/\[cuName,setCUName\]=useState\('Demo Credit Union'\)/);
});
test('rename migration targets only a single existing American Partners tenant',()=>{
 assert.match(migration,/lower\(btrim\(name\)\)='american partners'/);
 assert.match(migration,/count\(\*\).*='american partners'\)\s*=\s*1/);
 assert.match(migration,/SET name='Demo Credit Union'/i);
 assert.match(migration,/UPDATE abacus_credit_unions SET name='Demo Credit Union'/);
 assert.doesNotMatch(migration,/DELETE FROM/);
});
test('Overview shows setup prompt until current browser has access to selected CU folder',()=>{
 assert.match(ui,/folderConnection,setFolderConnection/);
 assert.match(ui,/folderConnection!=='checking'&&folderConnection!=='ready'/);
 assert.match(ui,/Balancing folder not set up/);
 assert.match(ui,/Review source files/);
 assert.match(ui,/setPage\('settings'\)/);
 assert.match(ui,/handle\.queryPermission\(\{mode:'read'\}\)/);
 assert.match(ui,/setFolderConnection\(permission==='granted'\?'ready':'reconnect'\)/);
 assert.match(ui,/\},\[folderScope\]\)/);
});
test('selecting and forgetting folder updates readiness',()=>{
 assert.match(ui,/setFolder\(handle\);setSessionFolderName\(''\);setFolderConnection\('ready'\)/);
 assert.match(ui,/setFolder\(null\);setSessionFolderName\(''\);setFolderConnection\('missing'\)/);
 assert.match(ui,/setFolderConnection\('reconnect'\)/);
});
