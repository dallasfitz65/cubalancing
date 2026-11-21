import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const ui=readFileSync(new URL('../src/TenantAdministration.jsx',import.meta.url),'utf8');
const api=readFileSync(new URL('../netlify/functions/tenants.mjs',import.meta.url),'utf8');
test('Platform lists existing credit unions and highlights the selected institution',()=>{
 assert.match(ui,/unions\.map\(union=>/);
 assert.match(ui,/union\.name/);
 assert.match(ui,/union\.active===false\?'Inactive':'Active'/);
 assert.match(ui,/onSelect\(union\.id\)/);
 assert.match(ui,/tenant-selected-row/);
});
test('Add icon opens an accessible dialog with institution specifics',()=>{
 assert.match(ui,/aria-label="Add credit union"/);
 assert.match(ui,/addDialog\.current\?\.showModal\(\)/);
 assert.match(ui,/<dialog ref=\{addDialog\}/);
 assert.match(ui,/id="tenant-new-name"/);
 assert.match(ui,/id="tenant-new-core"/);
 for(const system of ['xp2','datasafe','portico'])assert.match(ui,new RegExp('value="'+system+'"'));
 assert.match(ui,/addDialog\.current\?\.close\(\)/);
});
test('Creating uses real tenant API and stores the core preference, not a client-only entry',()=>{
 assert.match(ui,/tenantAPI\('create-tenant'/);
 assert.match(ui,/tenantAPI\('set-setting',\{tenantId:created\.id/);
 assert.match(ui,/key:'core-system',value:newCore,version:0/);
 assert.match(ui,/await onReload\(\);onSelect\(created\.id\)/);
 assert.match(api,/if\(user\.role!=='admin'\)return reply\(\{error:'Administrator required'\},403\)/);
 assert.match(ui,/unions\.some\(u=>u\.name\.trim\(\)\.toLowerCase\(\)===trimmed\.toLowerCase\(\)\)/);
});
