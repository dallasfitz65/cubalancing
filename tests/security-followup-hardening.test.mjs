import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const auth=source('netlify/functions/auth.mjs');
const activity=source('netlify/functions/platform-activity.mjs');
const main=source('src/main.jsx');
const user=source('src/UserManagement.jsx');
const password=source('src/ChangePassword.jsx');

test('audit authorization is immutable owner ID, never username',()=>{
 assert.match(activity,/const ownerId=process\.env\.ABACUS_PLATFORM_OWNER_USER_ID/);
 assert.match(activity,/String\(user\.id\)!==String\(ownerId\)/);
 assert.doesNotMatch(activity,/username\.toLowerCase\(\)!=='admin99'/);
 assert.match(auth,/isPlatformOwner:Boolean\(process\.env\.ABACUS_PLATFORM_OWNER_USER_ID/);
 assert.match(user,/current\?\.user\?\.isPlatformOwner===true/);
});
test('unknown usernames execute scrypt too',()=>{
 assert.match(auth,/UNKNOWN_USER_HASH/);
 assert.match(auth,/checkPassword\(password,user\?\.password_hash\|\|UNKNOWN_USER_HASH\)/);
 assert.match(auth,/if\(!user\|\|!user\.active\)return reply/);
});
test('password change reauthenticates, rotates salted hash and revokes all sessions',()=>{
 assert.match(auth,/if\(op==='change-password'\)/);
 assert.match(auth,/await checkPassword\(body\.currentPassword,existing\.rows\[0\]\.password_hash\)/);
 assert.match(auth,/await encodePassword\(body\.newPassword\)/);
 assert.match(auth,/DELETE FROM abacus_sessions WHERE user_id=\$1/);
 assert.match(auth,/reauthenticationRequired:true/);
 assert.match(main,/ChangePassword onDone=\{onPasswordChanged\}/);
 assert.match(password,/id="password-current"/);
 assert.match(password,/id="password-new"/);
 assert.match(password,/id="password-confirm"/);
});
test('expired session cleanup attempted at login without disabling login on cleanup failure',()=>{
 assert.match(auth,/DELETE FROM abacus_sessions WHERE expires_at<=now\(\)/);
 assert.match(auth,/\.catch\(\(\)=>\{\}\)/);
});

test('scheduled session cleanup removes expired rows without user-facing route',()=>{
 const cleanup=source('netlify/functions/session-cleanup.mjs');
 assert.match(cleanup,/DELETE FROM abacus_sessions WHERE expires_at<=now\(\)/);
 assert.match(cleanup,/schedule:'0 3 \* \* \*'/);
 assert.doesNotMatch(cleanup,/path:\s*['"]\/api\//);
});
test('invalid requests and database failures use distinct status codes',()=>{
 const tenant=source('netlify/functions/tenants.mjs');
 assert.match(auth,/invalid\?400:503/);
 assert.match(tenant,/invalid\?400:503/);
});
