import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createHandler} from '../netlify/functions/auth.mjs';

const cookie='__Host-abacus_session='+'a'.repeat(64);
function mock({targetRole='user',exists=true,admins=2,failMembership=false}={}){
 const calls=[];
 const client={release(){},query:async(sql,args=[])=>{
  calls.push({sql,args});
  if(sql.startsWith('SELECT u.id,u.username,u.role,u.active'))return {rows:[{id:1,username:'owner',role:'admin',active:true}]};
  if(sql.startsWith('SELECT id,role,active,deleted_at FROM abacus_users'))return {rows:exists?[{id:2,role:targetRole,active:true,deleted_at:null}]:[]};
  if(sql.startsWith('SELECT count(*)::integer AS total'))return {rows:[{total:admins}]};
  if(failMembership&&sql.startsWith('UPDATE abacus_user_credit_unions SET active=false'))throw Error('failed');
  return {rows:[]};
 }};
 return {calls,handler:req=>createHandler(req,{database:()=>({pool:{connect:async()=>client}})})};
}
const request=(id)=>new Request('https://abacus.example/api/auth?op=delete-user',{method:'POST',headers:{'content-type':'application/json',origin:'https://abacus.example',cookie},body:JSON.stringify({id})});

test('only other accounts can be deleted',async()=>{
 const x=mock();const r=await x.handler(request('1'));assert.equal(r.status,400);
 assert.ok(!x.calls.some(x=>x.sql.startsWith('UPDATE abacus_users SET active=false')));
});
test('delete revokes sessions and all institution memberships, preserving user row',async()=>{
 const x=mock();const r=await x.handler(request('2'));assert.equal(r.status,200);
 const queries=x.calls.map(x=>x.sql);
 assert.ok(queries.some(q=>q.startsWith('UPDATE abacus_users SET active=false,deleted_at=now()')));
 assert.ok(queries.some(q=>q.startsWith('UPDATE abacus_user_credit_unions SET active=false')));
 assert.ok(queries.some(q=>q.startsWith('DELETE FROM abacus_sessions')));
 assert.ok(!queries.some(q=>/^DELETE FROM abacus_users/.test(q)));
 assert.ok(queries.includes('COMMIT'));
});
test('cannot remove last administrator',async()=>{
 const x=mock({targetRole:'admin',admins:1});assert.equal((await x.handler(request('2'))).status,409);
 assert.ok(!x.calls.some(c=>c.sql.startsWith('UPDATE abacus_users SET active=false')));
});
test('remove rolls back when revocation fails',async()=>{
 const x=mock({failMembership:true});assert.equal((await x.handler(request('2'))).status,503);
 assert.ok(x.calls.some(c=>c.sql==='ROLLBACK'));assert.ok(!x.calls.some(c=>c.sql==='COMMIT'));
});
