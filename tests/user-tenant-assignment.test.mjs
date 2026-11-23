import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createHandler} from '../netlify/functions/auth.mjs';
const token='a'.repeat(64),cu='eeeeeeee-1111-4111-8111-111111111111';
function fixture({missing=false,membershipFails=false,authorized=true}={}){
 const queries=[];
 const client={release(){},query:async(sql,args=[])=>{
  queries.push({sql,args});
  if(sql.startsWith('SELECT u.id,u.username,u.role,u.active'))return {rows:[{id:1,username:'owner',role:'admin',active:true}]};
  if(sql.startsWith('SELECT id,name FROM abacus_credit_unions'))return {rows:missing?[]:[{id:cu,name:'Test Credit Union'}]};
  if(sql.includes("FROM abacus_user_credit_unions WHERE user_id=$1 AND credit_union_id=$2 AND role='admin'"))return {rows:authorized?[{role:'admin'}]:[]};
  if(sql.startsWith('INSERT INTO abacus_users'))return {rows:[{id:33,username:args[0],role:args[2],active:true}]};
  if(sql.startsWith('INSERT INTO abacus_user_credit_unions')&&membershipFails)throw Error('membership failure');
  return {rows:[]};
 }};
 return {queries,handler:req=>createHandler(req,{database:()=>({pool:{connect:async()=>client}})})};
}
const post=body=>new Request('https://app.example/api/auth?op=create-user',{method:'POST',headers:{cookie:'__Host-abacus_session='+token,'content-type':'application/json',origin:'https://app.example'},body:JSON.stringify(body)});
const valid={username:'newuser',password:'valid-long-password-2026',role:'user',creditUnionId:cu,institutionRole:'reconciler'};
test('user creation must include assigned credit union and institution role',async()=>{
 const x=fixture();
 assert.equal((await x.handler(post({...valid,creditUnionId:undefined}))).status,400);
 assert.equal((await x.handler(post({...valid,institutionRole:undefined}))).status,400);
 assert.equal(x.queries.filter(q=>q.sql.startsWith('INSERT INTO abacus_users')).length,0);
});
test('new account and tenant membership created atomically',async()=>{
 const x=fixture();
 const r=await x.handler(post(valid));assert.equal(r.status,201);
 const body=await r.json();assert.equal(body.user.credit_unions[0].id,cu);
 const sql=x.queries.map(q=>q.sql);
 assert.ok(sql.includes('BEGIN'));assert.ok(sql.includes('COMMIT'));
 assert.ok(sql.some(q=>q.startsWith('INSERT INTO abacus_users')));
 assert.ok(sql.some(q=>q.startsWith('INSERT INTO abacus_user_credit_unions')));
 assert.ok(sql.indexOf('INSERT INTO abacus_users(username,password_hash,role) VALUES($1,$2,$3) RETURNING id,username,role,active')<sql.findIndex(q=>q.startsWith('INSERT INTO abacus_user_credit_unions')));
});
test('inactive or missing institution prevents account creation',async()=>{
 const x=fixture({missing:true});assert.equal((await x.handler(post(valid))).status,404);
 assert.ok(!x.queries.some(q=>q.sql.startsWith('INSERT INTO abacus_users')));
 assert.ok(x.queries.some(q=>q.sql==='ROLLBACK'));
});
test('failed membership insert rolls back account insertion',async()=>{
 const x=fixture({membershipFails:true});assert.equal((await x.handler(post(valid))).status,503);
 assert.ok(x.queries.some(q=>q.sql==='ROLLBACK'));
 assert.ok(!x.queries.some(q=>q.sql==='COMMIT'));
});
test('admin session is derived from hash, not payload',async()=>{
 const x=fixture();await x.handler(post(valid));
 const auth=x.queries.find(q=>q.sql.startsWith('SELECT u.id,u.username,u.role,u.active'));
 assert.equal(auth.args[0],createHash('sha256').update(token).digest('hex'));
});

test('platform admin without target credit union admin membership cannot create a user for it',async()=>{
 const x=fixture({authorized:false});const response=await x.handler(post(valid));
 assert.equal(response.status,403);
 assert.ok(!x.queries.some(q=>q.sql.startsWith('INSERT INTO abacus_users')));
 assert.ok(x.queries.some(q=>q.sql==='ROLLBACK'));
});
