import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizeNCUASearch,searchNCUA} from '../src/ncua-lookup.mjs';
const admin=readFileSync(new URL('../src/TenantAdministration.jsx',import.meta.url),'utf8');
const backend=readFileSync(new URL('../netlify/functions/tenants.mjs',import.meta.url),'utf8');
const api=readFileSync(new URL('../src/tenant-api.mjs',import.meta.url),'utf8');
const migration=readFileSync(new URL('../netlify/database/migrations/20261121030000_ncua_charter_identity.sql',import.meta.url),'utf8');

test('NCUA lookup uses CU-Analytics search contract and limits result fields',async()=>{
 let req;
 const response=await searchNCUA('12345',{fetcher:async(url,opts)=>{req={url,opts};return {ok:true,json:async()=>({totalResultCount:2,results:[
  {name:'Example CU',charterNumber:12345,city:'City',state:'FL',isActive:true},
  {name:'Inactive CU',charterNumber:12346,city:'Elsewhere',state:'FL',isActive:false}
 ]})};}});
 assert.equal(req.url,'https://mapping.ncua.gov/api/ResearchCreditUnion/GetDetailSearch');
 assert.deepEqual(JSON.parse(req.opts.body),{charterNumber:'12345',take:25,skip:0});
 assert.equal(response.results.length,1);
 assert.deepEqual(response.results[0],{name:'Example CU',charter:'12345',city:'City',state:'FL',active:true});
 assert.equal(Object.hasOwn(response.results[0],'memberData'),false);
});
test('Name search uses cuName, rejects malformed query and preserves NCUA identity',async()=>{
 let body;
 const results=await searchNCUA('Florida',{fetcher:async(_url,opts)=>{body=JSON.parse(opts.body);return {ok:true,json:async()=>({results:[{CUName:'Named CU',CUNumber:'777',City:'Town',State:'FL'}]})};}});
 assert.deepEqual(body,{cuName:'Florida',take:25,skip:0});
 assert.equal(results.results[0].charter,'777');
 assert.equal(normalizeNCUASearch({results:[{name:'Invalid',charterNumber:'bad'}]}).length,0);
 await assert.rejects(searchNCUA('x'),/Enter 2/);
});
test('Platform Add dialog confirms NCUA name and charter, retains manual demo override',()=>{
 assert.match(admin,/tenantAPI\('ncua-search'/);
 assert.match(admin,/selectedNCUA/);
 assert.match(admin,/name="tenant-ncua-result"/);
 assert.match(admin,/Charter #\{row.charter\}/);
 assert.match(admin,/ncuaCharter:selectedNCUA.charter/);
 assert.match(admin,/manualInstitution/);
 assert.match(admin,/ncua_charter/);
 assert.match(api,/if\(searchTerm\)query.set\('q'/);
});
test('Backend limits search to platform admins and verifies charter before insert',()=>{
 assert.match(backend,/op==='ncua-search'/);
 assert.match(backend,/if\(user.role!=='admin'\)return reply\(\{error:'Platform administrator required'\},403\)/);
 assert.match(backend,/const match=lookup.results.find\(row=>row.charter===charter\)/);
 assert.match(backend,/INSERT INTO abacus_credit_unions\(name,ncua_charter\)/);
 assert.match(migration,/CREATE UNIQUE INDEX IF NOT EXISTS abacus_credit_unions_ncua_charter_unique/);
 assert.match(migration,/ncua_charter IS NOT NULL/);
});
