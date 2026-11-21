import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const main=readFileSync(new URL('../src/main.jsx',import.meta.url),'utf8');
const tenant=readFileSync(new URL('../src/TenantAdministration.jsx',import.meta.url),'utf8');
const migration=readFileSync(new URL('../src/CentralSettingsMigration.jsx',import.meta.url),'utf8');
const users=readFileSync(new URL('../src/UserManagement.jsx',import.meta.url),'utf8');

test('Central Settings Migration is a standalone Platform panel at the bottom',()=>{
 assert.match(main,/import CentralSettingsMigration from '\.\/CentralSettingsMigration\.jsx'/);
 assert.match(main,/<CentralSettingsMigration account=\{account\} activeCU=\{activeCU\} unions=\{unions\}/);
 assert.ok(main.indexOf('<CentralSettingsMigration')>main.indexOf('<UserManagement/>'));
 assert.ok(main.indexOf('<CentralSettingsMigration')>main.indexOf('<h2>Platform-wide activity</h2>'));
 assert.ok(main.indexOf('<CentralSettingsMigration')<main.indexOf("<h2>Account mapping</h2>"));
 assert.doesNotMatch(tenant,/<h3>Central settings migration<\/h3>/);
 assert.doesNotMatch(tenant,/onClick=\{importExisting\}/);
 assert.match(migration,/aria-label="Central settings migration"/);
 assert.match(migration,/<h2>Central Settings Migration<\/h2>/);
});
test('Migration preserves scoped preferences, tenant defaults, and browser-only folders',()=>{
 for(const item of ["'core-system'","'sign-convention'","'local-browser:local-demo'","'user:'+account.id+':local-demo'","'set-setting'","'settings'","rememberFolder(oldFolder,newScope)"]){
  assert.ok(migration.includes(item),item);
 }
 assert.match(migration,/if\(existing\[key\]\)continue/);
 assert.match(migration,/account.role!=='admin'/);
 assert.match(users,/aria-label="Add user"/);
});
