import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const auth=read('netlify/functions/auth.mjs'),tenants=read('netlify/functions/tenants.mjs'),recovery=read('netlify/functions/admin-recovery.mjs'),ui=read('src/UserManagement.jsx');

test('cross-tenant grants require prior administrator membership and cannot target self',()=>{
 assert.match(tenants,/Self-assignment is prohibited/);
 assert.match(tenants,/role='admin' AND active=true/);
 assert.match(tenants,/Existing credit union administrator membership required/);
 assert.match(tenants,/AND deleted_at IS NULL/);
});
test('ordinary creation can never mint a platform administrator',()=>{
 assert.match(auth,/body\.role!=='user'/);
 assert.match(auth,/Existing credit union administrator membership required to create users/);
 assert.match(auth,/credit_union_id=\$2 AND role='admin' AND active=true/);
 assert.match(ui,/role:'user',creditUnionId,institutionRole/);
 assert.doesNotMatch(ui,/id="new-user-platform-role"/);
 assert.match(auth,/ABACUS_PLATFORM_OWNER_USER_ID/);
 assert.match(auth,/Owner password verification failed/);
 assert.match(auth,/platform_role_changed/);
 assert.match(auth,/DELETE FROM abacus_sessions WHERE user_id=\$1/);
});
test('deleted account cannot be logged into, used with old session, or recovered',()=>{
 assert.match(auth,/lower\(username\)=lower\(\$1\) AND deleted_at IS NULL/);
 assert.match(auth,/s\.expires_at>now\(\) AND u\.active=true AND u\.deleted_at IS NULL/);
 assert.match(tenants,/s\.expires_at>now\(\) AND u\.active=true AND u\.deleted_at IS NULL/);
 assert.match(recovery,/WHERE role='admin' AND deleted_at IS NULL ORDER BY id/);
 assert.match(recovery,/WHERE id=\$1 AND role='admin' AND deleted_at IS NULL FOR UPDATE/);
});
test('IP throttling replaces remotely triggered account lockout',()=>{
 assert.doesNotMatch(auth,/interval '15 minutes'/);
 assert.doesNotMatch(auth,/user\.locked_until&&/);
 assert.match(auth,/rateLimit:\{action:'rate_limit',windowLimit:30,windowSize:60,aggregateBy:\['ip','domain'\]\}/);
});
