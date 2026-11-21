import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const ui=readFileSync(new URL('../src/TenantAdministration.jsx',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/styles.css',import.meta.url),'utf8');
test('selected institution profile shows charter, core, status, and name',()=>{
 assert.match(ui,/aria-label="Selected credit union profile"/);
 assert.match(ui,/selectedUnion\?\.name/);
 assert.match(ui,/selectedUnion\?\.ncua_charter/);
 assert.match(ui,/selectedUnion\?\.active===false/);
 assert.match(ui,/coreProfile\.core/);
 assert.match(ui,/\{xp2:'XP2',datasafe:'DataSafe',portico:'Portico'\}/);
 assert.match(css,/\.tenant-profile-fields\{display:grid/);
});
test('profile reads actual tenant setting and does not default or mask failures',()=>{
 assert.match(ui,/tenantAPI\('settings',\{tenantId:activeCU\}\)/);
 assert.match(ui,/item\.setting_key==='core-system'/);
 assert.match(ui,/coreProfile\.status==='error'\?'Unavailable'/);
 assert.match(ui,/coreProfile\.status==='unconfigured'\?'Not configured'/);
 assert.match(ui,/return\(\)=>\{live=false;\}/);
});
