import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createHandler} from '../netlify/functions/admin-recovery.mjs';
const KEY='a'.repeat(64),HASH=createHash('sha256').update(KEY).digest('hex');
function fixture({used=false,admin=true}={}){
 const calls=[];
 const client={release(){},query:async(sql,args=[])=>{
  calls.push({sql,args});
  if(sql.startsWith('SELECT 1 FROM abacus_admin_recovery_use'))return {rows:used?[{one:1}]:[]};
  if(sql.startsWith('SELECT id,username FROM abacus_users'))return {rows:[{id:'8',username:'owner@example.com'}]};
  if(sql.startsWith('SELECT id FROM abacus_users'))return {rows:admin?[{id:'8'}]:[]};
  if(sql.startsWith('INSERT INTO abacus_admin_recovery_use'))return {rows:[{token_hash:HASH}]};
  return {rows:[]};
 }};
 let connects=0;
 const handler=req=>createHandler(req,{recoveryHash:HASH,database:()=>({pool:{connect:async()=>{connects++;return client;}}})});
 return {handler,calls,get connects(){return connects;}};
}
const request=(op,fields={},key=KEY)=>new Request('https://abacus.example/api/admin-recovery',{method:'POST',headers:{'Content-Type':'application/json','Origin':'https://abacus.example'},body:JSON.stringify({op,recoveryKey:key,...fields})});
test('wrong recovery key cannot query user table',async()=>{
 const x=fixture();const r=await x.handler(request('list',{},'b'.repeat(64)));assert.equal(r.status,403);assert.equal(x.connects,0);
});
test('valid recovery key can identify admin username without exposing password',async()=>{
 const x=fixture();const r=await x.handler(request('list'));assert.equal(r.status,200);
 const body=await r.json();assert.deepEqual(body.accounts,[{id:'8',username:'owner@example.com'}]);
 assert.equal(x.calls.filter(c=>c.sql.startsWith('SELECT id,username FROM abacus_users')).length,1);
});
test('recovery refuses consumed credential',async()=>{
 const x=fixture({used:true});assert.equal((await x.handler(request('list'))).status,409);
 assert.equal((await x.handler(request('reset',{userId:'8',password:'new-secure-password-123'}))).status,409);
 assert.ok(!x.calls.some(c=>c.sql.startsWith('UPDATE abacus_users')));
});
test('recover admin rotates salted password, unlocks account, and revokes sessions',async()=>{
 const x=fixture();const result=await x.handler(request('reset',{userId:'8',password:'new-secure-password-123'}));
 assert.equal(result.status,200);
 const update=x.calls.find(c=>c.sql.startsWith('UPDATE abacus_users'));
 assert.match(update.args[0],/^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/);
 assert.doesNotMatch(JSON.stringify(x.calls),'new-secure-password-123');
 assert.ok(x.calls.some(c=>c.sql.startsWith('DELETE FROM abacus_sessions')));
 assert.ok(x.calls.some(c=>c.sql.startsWith('INSERT INTO abacus_admin_recovery_use')));
 assert.ok(x.calls.some(c=>c.sql==='COMMIT'));
});
test('recovery never promotes or modifies a non-admin',async()=>{
 const x=fixture({admin:false});assert.equal((await x.handler(request('reset',{userId:'7',password:'new-secure-password-123'}))).status,404);
 assert.ok(!x.calls.some(c=>c.sql.startsWith('UPDATE abacus_users')));
});
test('recovery rejects untrusted origin',async()=>{
 const x=fixture();const r=await x.handler(new Request('https://abacus.example/api/admin-recovery',{method:'POST',headers:{'Content-Type':'application/json','Origin':'https://evil.example'},body:JSON.stringify({op:'list',recoveryKey:KEY})}));
 assert.equal(r.status,400);assert.equal(x.connects,0);
});
