import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createHandler} from '../netlify/functions/tenants.mjs';

const A='a2bbffff-0000-4000-8000-000000000001',B='a2bbffff-0000-4000-8000-000000000002';
const rawToken='a'.repeat(64);
function fixture({user={id:7,username:'admin',role:'admin'},membership={role:'admin'}}={}){
 const queries=[];
 const client={release(){},query:async(sql,args=[])=>{
  queries.push({sql,args});
  if(sql.startsWith('SELECT u.id,u.username')){assert.equal(args[0],createHash('sha256').update(rawToken).digest('hex'));return {rows:user?[user]:[]};}
  if(sql.startsWith('SELECT role FROM abacus_user_credit_unions'))return {rows:membership?[membership]:[]};
  if(sql.startsWith('SELECT setting_key'))return {rows:[{setting_key:'core-system',setting_value:'xp2',version:1}]};
  if(sql.startsWith('INSERT INTO abacus_tenant_settings'))return {rows:[{version:1}]};
  if(sql.startsWith('UPDATE abacus_tenant_settings'))return {rows:[{version:2}]};
  if(sql.startsWith('INSERT INTO abacus_credit_unions'))return {rows:[{id:A,name:args[0]}]};
  if(sql.startsWith('SELECT c.id,c.name'))return {rows:[]};
  return {rows:[]};
 }};
 return {queries, handler:req=>createHandler(req,{database:()=>({pool:{connect:async()=>client}})})};
}
const get=(op,tenantId=A,cookie=true)=>new Request('https://app.example/api/tenants?op='+op+'&tenantId='+tenantId,{headers:cookie?{cookie:'__Host-abacus_session='+rawToken}:{}});
const post=(op,body,extraHeaders={})=>new Request('https://app.example/api/tenants?op='+op,{method:'POST',headers:{'Content-Type':'application/json',cookie:'__Host-abacus_session='+rawToken,origin:'https://app.example',...extraHeaders},body:JSON.stringify(body)});
test('unauthenticated caller never reads tenant settings',async()=>{const f=fixture();const r=await f.handler(get('settings',A,false));assert.equal(r.status,401);assert.ok(!f.queries.some(x=>x.sql.startsWith('SELECT setting_key')));});
test('another credit union cannot read tenant settings or write to them',async()=>{const f=fixture({membership:null});assert.equal((await f.handler(get('settings',B))).status,403);assert.equal((await f.handler(post('set-setting',{tenantId:B,key:'core-system',value:'datasafe',version:0}))).status,403);assert.ok(!f.queries.some(x=>x.sql.startsWith('INSERT INTO abacus_tenant_settings')));});
test('only CU administrators can change settings',async()=>{const f=fixture({membership:{role:'reviewer'}});assert.equal((await f.handler(get('settings',A))).status,200);assert.equal((await f.handler(post('set-setting',{tenantId:A,key:'core-system',value:'datasafe',version:1}))).status,403);});
test('settings input is allowlisted with version requirements',async()=>{const f=fixture();assert.equal((await f.handler(post('set-setting',{tenantId:A,key:'financialData',value:{member:123},version:0}))).status,400);assert.equal((await f.handler(post('set-setting',{tenantId:A,key:'core-system',value:'other',version:0}))).status,400);assert.equal((await f.handler(post('set-setting',{tenantId:A,key:'core-system',value:'xp2'}))).status,400);assert.equal((await f.handler(post('set-setting',{tenantId:A,key:'core-system',value:'xp2',version:0}))).status,200);assert.ok(f.queries.some(x=>x.sql.startsWith('INSERT INTO abacus_tenant_settings')));});
test('cross-site settings write is rejected before database connection',async()=>{const f=fixture();assert.equal((await f.handler(post('set-setting',{tenantId:A,key:'core-system',value:'xp2',version:0},{origin:'https://attacker.example'}))).status,400);assert.equal(f.queries.length,0);});
test('transaction context uses authenticated actor, not client-supplied actor',async()=>{const f=fixture();assert.equal((await f.handler(get('settings',A))).status,200);assert.ok(f.queries.some(q=>q.sql.includes("set_config('abacus.user_id'")&&q.args[0]==='7'));assert.ok(f.queries.some(q=>q.sql.includes("set_config('abacus.tenant_id'")&&q.args[0]===A));assert.ok(f.queries.some(q=>q.sql==='COMMIT'));});
test('schema enforces RLS and credit union scoped composite keys',()=>{const sql=readFileSync(new URL('../netlify/database/migrations/20261113190000_multitenant_foundation.sql',import.meta.url),'utf8');for(const t of ['abacus_credit_unions','abacus_user_credit_unions','abacus_tenant_settings'])assert.match(sql,new RegExp('ALTER TABLE '+t+' FORCE ROW LEVEL SECURITY'));assert.match(sql,/PRIMARY KEY\(credit_union_id, setting_key\)/);assert.match(sql,/current_setting\('abacus.tenant_id',true\)/);});
