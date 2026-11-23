import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const ui=readFileSync(new URL('../src/UserManagement.jsx',import.meta.url),'utf8');
const auth=readFileSync(new URL('../netlify/functions/auth.mjs',import.meta.url),'utf8');

test('Platform User Management keeps existing users listed with credit union assignments and status',()=>{
 for(const s of ['users.map(u=>','u.username','u.role','u.credit_unions?.length','u.active?','Delete user']) assert.ok(ui.includes(s),s);
 assert.match(ui,/User Management/);
});
test('plus icon opens Add User dialog without a platform role escalation choice',()=>{
 assert.match(ui,/aria-label="Add user"/);
 assert.match(ui,/addDialog\.current\?\.showModal\(\)/);
 assert.match(ui,/<dialog ref=\{addDialog\}/);
 for(const s of ['new-user-username','new-user-password','new-user-credit-union','new-user-institution-role']) assert.ok(ui.includes(s),s);
 for(const s of ["value=\"reconciler\"","value=\"reviewer\"","value=\"admin\"","value=\"user\""]) assert.ok(ui.includes(s),s);
 assert.doesNotMatch(ui,/id="new-user-platform-role"/);
 assert.match(ui,/aria-label=\{showPassword\?'Hide password':'Show password'\}/);
 assert.match(ui,/password\.length<12/);
});
test('add dialog uses existing secure backend and assigns user atomically',()=>{
 assert.match(ui,/accountAPI\('create-user',\{username:username\.trim\(\),password,role:'user',creditUnionId,institutionRole\}\)/);
 assert.match(ui,/addDialog\.current\?\.close\(\)/);
 assert.match(ui,/await refresh\(\)/);
 assert.match(auth,/op==='create-user'&&actor\.role==='admin'/);
 assert.match(auth,/await encodePassword\(body\.password\)/);
 assert.match(auth,/INSERT INTO abacus_user_credit_unions/);
 assert.doesNotMatch(ui,/Download password|Export passwords/);
});
