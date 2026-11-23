import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createHandler} from '../netlify/functions/platform-activity.mjs';
const token='a'.repeat(64);
process.env.ABACUS_PLATFORM_OWNER_USER_ID='7';
function fixture(username='Admin99',role='admin'){
 const queries=[];let count=0;
 const client={release(){},query:async(sql,args=[])=>{
  queries.push({sql,args});
  if(sql.startsWith('SELECT u.id,u.username,u.role FROM abacus_sessions'))return {rows:[{id:username==='Admin99'?7:8,username,role}]};
  if(sql.includes('FROM abacus_activity_events e'))return {rows:[{id:'1',at:'2026-11-15T10:00:00Z',event:'user_assigned',username:'Admin99',credit_union:'Example CU',detail:'reconciler'}]};
  if(sql.includes('FROM abacus_reconciliation_runs r'))return {rows:[{id:'run',at:'2026-11-14T10:00:00Z',event:'reconciliation',username:'example',credit_union:'Example CU',status:'balanced',checks:5,issues:0}]};
  if(sql==='SELECT id::text,name FROM abacus_credit_unions ORDER BY name')return {rows:[{id:'12345678-1234-4234-8234-123456789012',name:'Example CU'}]};
  if(sql==='SELECT id::text,username FROM abacus_users ORDER BY username')return {rows:[{id:'7',username:'Admin99'}]};
  return {rows:[]};
 }};
 return {queries,handler:req=>createHandler(req,{database:()=>({pool:{connect:async()=>{count++;return client;}}})})};
}
const request=path=>new Request('https://example.org/api/platform-activity'+path,{headers:{cookie:'__Host-abacus_session='+token}});
test('global audit refuses any account without configured owner ID',async()=>{
 for(const [name,role] of [['reviewer','user'],['DifferentAdmin','admin'],['Admin99','user']]){
  const f=fixture(name,role);const r=await f.handler(request(''));assert.equal(r.status,403);
  assert.ok(!f.queries.some(q=>q.sql.includes('FROM abacus_activity_events e')));
 }
});
test('configured platform owner gets global audit, regardless of username',async()=>{
 const f=fixture();const r=await f.handler(request(''));assert.equal(r.status,200);
 const b=await r.json();assert.equal(b.events.length,2);assert.equal(b.events[0].event,'user_assigned');
 assert.equal(b.events[1].event,'reconciliation');
 assert.ok(f.queries.some(q=>q.sql.includes("set_config('abacus.audit_admin','true',true)")));
 assert.ok(f.queries.some(q=>q.sql==='COMMIT'));
 assert.ok(!JSON.stringify(b).includes('source_hashes'));
});
test('invalid filters are rejected before reading data',async()=>{
 const f=fixture();const r=await f.handler(request('?tenantId=invalid'));assert.equal(r.status,400);
 assert.ok(!f.queries.some(q=>q.sql.includes('FROM abacus_activity_events e')));
});
test('only GET accepts platform activity',async()=>{
 const f=fixture();const req=new Request('https://example.org/api/platform-activity',{method:'POST'});
 assert.equal((await f.handler(req)).status,405);assert.equal(f.queries.length,0);
});
test('audit session cookie must be server validated',async()=>{
 const f=fixture();const r=await f.handler(new Request('https://example.org/api/platform-activity'));
 assert.equal(r.status,401);assert.ok(!f.queries.some(q=>q.sql.includes('FROM abacus_activity_events e')));
});
test('event insert is limited to metadata and parameterized',async()=>{
 const {insertActivity}=await import('../netlify/functions/activity-writer.mjs');
 const calls=[];await insertActivity({query:async(sql,args)=>{calls.push({sql,args});}},7,'user_assigned',null,10,'reconciler');
 assert.equal(calls.length,1);assert.ok(calls[0].sql.includes('VALUES($1,$2,$3,$4,$5)'));
 assert.deepEqual(calls[0].args,[7,null,'user_assigned',10,'reconciler']);
});
