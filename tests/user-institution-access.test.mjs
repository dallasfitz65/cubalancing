import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const ui=readFileSync(new URL('../src/UserManagement.jsx',import.meta.url),'utf8');
const api=readFileSync(new URL('../netlify/functions/tenants.mjs',import.meta.url),'utf8');
test('existing users can edit institution role through the authorized assignment endpoint',()=>{
 assert.match(ui,/Edit institution access/);
 assert.match(ui,/tenantAPI\('assign-user',\{body:\{tenantId:accessCU,userId:accessUser.id,role:accessRole\}\}\)/);
 assert.match(ui,/Save institution access/);
 assert.match(ui,/Institution access was NOT saved/);
 assert.match(ui,/await refresh\(\)/);
});
test('backend enforces platform admin, existing active user and credit union, and allowlisted institution role',()=>{
 assert.match(api,/if\(user.role!=='admin'\)return reply\(\{error:'Platform administrator required'\},403\)/);
 assert.match(api,/\['admin','reconciler','reviewer'\]\.includes\(input.role\)/);
 assert.match(api,/FROM abacus_users WHERE id=\$1 AND active=true/);
 assert.match(api,/FROM abacus_credit_unions WHERE id=\$1 AND active=true/);
 assert.match(api,/ON CONFLICT\(user_id,credit_union_id\) DO UPDATE SET role=excluded.role,active=true/);
});
