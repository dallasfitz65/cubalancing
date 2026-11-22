import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import test from 'node:test';

const root=resolve(import.meta.dirname,'..');
const read=p=>readFileSync(join(root,p),'utf8');
const tenant=read('netlify/functions/tenants.mjs');
const auth=read('netlify/functions/auth.mjs');
const activity=read('netlify/functions/activity-writer.mjs');
const migrations=join(root,'netlify/database/migrations');
const sql=readdirSync(migrations,{recursive:true}).filter(p=>p.endsWith('.sql')).map(p=>readFileSync(join(migrations,p),'utf8')).join('\n');

test('tenant function establishes transaction and LOCAL RLS identity before tenant queries',()=>{
 assert.match(tenant,/await client\.query\('BEGIN'\);inTransaction=true/);
 for(const setting of ['abacus.user_id','abacus.platform_admin','abacus.tenant_id'])
  assert.match(tenant,new RegExp("set_config\\('"+setting.replace('.','\\.')+"',\\$1,true\\)"));
 assert.match(tenant,/if\(member\.rows\.length!==1\)return reply\(\{error:'Credit union access denied'\},403\)/);
 assert.match(tenant,/if\(inTransaction\)await client\.query\('ROLLBACK'\)/);
 assert.match(tenant,/client\.release\(\)/);
});

test('admin and activity writers set transaction-local user and admin context',()=>{
 assert.match(auth,/set_config\('abacus.user_id',\$1,true\)/);
 assert.match(auth,/set_config\('abacus.platform_admin','true',true\)/);
 assert.match(activity,/set_config\('abacus.user_id',\$1,true\)/);
 for(const source of [tenant,auth,activity])
  assert.doesNotMatch(source,/set_config\(['"]abacus\.(user_id|tenant_id|platform_admin)['"],[^\n]*,false\)/);
});

test('tenant-isolated tables declare ENABLE and FORCE RLS in migrations',()=>{
 const names=['abacus_credit_unions','abacus_user_credit_unions','abacus_tenant_settings','abacus_tenant_mappings','abacus_reconciliation_runs'];
 for(const name of names){
  assert.match(sql,new RegExp('ALTER TABLE '+name+' ENABLE ROW LEVEL SECURITY','i'),name);
  assert.match(sql,new RegExp('ALTER TABLE '+name+' FORCE ROW LEVEL SECURITY','i'),name);
 }
});

test('runtime functions rely on Netlify database connection (live role still requires verification)',()=>{
 assert.match(tenant,/getDatabase/);
 assert.match(auth,/getDatabase/);
});

test('login and tenant APIs require server-authenticated sessions',()=>{
 assert.match(auth,/abacus_sessions/);
 assert.match(tenant,/const user=await session\(client,req\)/);
 assert.match(tenant,/if\(!user\)return reply\(\{error:'Authentication required'\},401\)/);
 assert.doesNotMatch(tenant,/netlifyIdentity|@netlify\/identity/);
});

test('do not treat static RLS inspection as proof of production enforcement',()=>{
 const script=read('scripts/security/verify-live-db.mjs');
 assert.match(script,/rolbypassrls/);
 assert.match(script,/rolsuper/);
 assert.match(script,/row_security/);
 assert.match(script,/SET TRANSACTION READ ONLY/);
 assert.match(script,/verification incomplete/i);
});
