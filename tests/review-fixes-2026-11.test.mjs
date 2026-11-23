import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {createHandler as authHandler} from '../netlify/functions/auth.mjs';
import {createHandler as tenantHandler} from '../netlify/functions/tenants.mjs';

const cookie='__Host-abacus_session='+'a'.repeat(64);
const origin='https://abacus.example';
const post=(path,data)=>new Request(origin+path,{method:'POST',headers:{'content-type':'application/json',origin,cookie},body:JSON.stringify(data)});

test('activity constraint allows all event names emitted by functions',()=>{
 const dir=new URL('../netlify/database/migrations/',import.meta.url);
 const sql=readdirSync(dir).filter(f=>f.endsWith('.sql')).sort().map(f=>readFileSync(new URL(f,dir),'utf8')).join('\n');
 const checks=[...sql.matchAll(/event_type\s+IN\s*\(([^)]*)\)/gi)];
 assert.ok(checks.length,'event type CHECK missing');
 const permitted=new Set([...checks.at(-1)[1].matchAll(/'([a-z_]+)'/g)].map(x=>x[1]));
 const functions=new URL('../netlify/functions/',import.meta.url);
 const written=new Set();
 for(const f of readdirSync(functions).filter(x=>x.endsWith('.mjs'))){
  const src=readFileSync(new URL(f,functions),'utf8');
  for(const m of src.matchAll(/insertActivity(?:Standalone)?\(client,[^,]+,'([a-z_]+)'/g))written.add(m[1]);
  if(f==='auth.mjs'){written.add('user_enabled');written.add('user_disabled');}
 }
 for(const name of written)assert.ok(permitted.has(name),'Missing audit event '+name);
 assert.ok(permitted.has('password_changed'));
 assert.ok(permitted.has('platform_role_changed'));
});

function mockActor(){
 const calls=[];
 const client={release(){calls.push('RELEASE');},query:async(sql,args=[])=>{
  calls.push(sql);
  if(sql.startsWith('SELECT u.id,u.username,u.role,u.active'))return {rows:[{id:1,username:'admin',role:'admin',active:true}]};
  if(sql.startsWith('UPDATE abacus_users SET active=$1'))return {rows:[{id:args[1]}]};
  return {rows:[]};
 }};
 return {calls,handler:req=>authHandler(req,{database:()=>({pool:{connect:async()=>client}})})};
}

test('ordinary admins cannot delete or disable the configured owner',async()=>{
 const prev=process.env.ABACUS_PLATFORM_OWNER_USER_ID;
 process.env.ABACUS_PLATFORM_OWNER_USER_ID='5';
 try{
  const one=mockActor();
  assert.equal((await one.handler(post('/api/auth?op=delete-user',{id:'5'}))).status,403);
  assert.ok(!one.calls.some(x=>x.startsWith('UPDATE abacus_users')));
  const two=mockActor();
  assert.equal((await two.handler(post('/api/auth?op=set-active',{id:'5',active:false}))).status,403);
  assert.ok(!two.calls.some(x=>x.startsWith('UPDATE abacus_users')));
 }finally{
  if(prev===undefined)delete process.env.ABACUS_PLATFORM_OWNER_USER_ID;
  else process.env.ABACUS_PLATFORM_OWNER_USER_ID=prev;
 }
});

test('bootstrap releases failed transaction only after ROLLBACK',async()=>{
 const calls=[];
 const client={release(){calls.push('RELEASE');},query:async sql=>{
  calls.push(sql);
  if(sql.startsWith('SELECT EXISTS'))return {rows:[{initialized:false}]};
  if(sql.startsWith('INSERT INTO abacus_users'))throw Error('synthetic insert error');
  return {rows:[]};
 }};
 const response=await authHandler(post('/api/auth?op=bootstrap',{username:'firstadmin',password:'long-test-password-2026',setupToken:'setup-key'}),{database:()=>({pool:{connect:async()=>client}}),setupToken:'setup-key'});
 assert.equal(response.status,503);
 assert.ok(calls.includes('ROLLBACK'));
 assert.ok(calls.indexOf('ROLLBACK')<calls.indexOf('RELEASE'));
});

test('concurrent duplicate tenant charter returns conflict not server error',async()=>{
 const client={release(){},query:async sql=>{
  if(sql.startsWith('SELECT u.id,u.username,u.role'))return {rows:[{id:1,username:'admin',role:'admin'}]};
  if(sql.startsWith('INSERT INTO abacus_credit_unions'))throw Object.assign(new Error('duplicate'),{code:'23505'});
  return {rows:[]};
 }};
 const response=await tenantHandler(post('/api/tenants?op=create-tenant',{name:'Example CU'}),{database:()=>({pool:{connect:async()=>client}})});
 assert.equal(response.status,409);
});
