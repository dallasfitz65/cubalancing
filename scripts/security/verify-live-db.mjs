// Run in a trusted operator shell with the SAME database connection used by runtime.
// Read-only: no DML, DDL, user creation, or public diagnostic endpoint.
import {getDatabase} from '@netlify/database';

const results=[];
const record=(name,status,detail)=>{results.push({name,status,detail});process.stdout.write(status+' '+name+(detail?' — '+detail:'')+'\n');};
const assert=(condition,message)=>{if(!condition)throw Error(message);};
const flags={role:false,rls:false,isolation:false,connection:false,coverage:false};
const app=getDatabase();
const client=await app.pool.connect();
async function tx(fn){
 await client.query('BEGIN');
 try{
  await client.query('SET TRANSACTION READ ONLY');
  await client.query('SET LOCAL row_security = on');
  return await fn();
 }finally{await client.query('ROLLBACK');}
}
const requiredTables=['abacus_credit_unions','abacus_user_credit_unions','abacus_tenant_settings','abacus_tenant_mappings','abacus_reconciliation_runs'];
try{
 const role=await tx(async()=>{
  const r=await client.query("SELECT current_user AS role, rolsuper, rolbypassrls FROM pg_roles WHERE rolname=current_user");
  assert(r.rows.length===1,'No runtime role returned');
  return r.rows[0];
 });
 if(role.rolsuper||role.rolbypassrls)record('Runtime database role','FAIL','Application connection can bypass RLS');
 else {record('Runtime database role','PASS','Not superuser or BYPASSRLS');flags.role=true;}

 await tx(async()=>{
  const r=await client.query("SELECT c.relname,c.relrowsecurity,c.relforcerowsecurity,pg_get_userbyid(c.relowner) AS owner FROM pg_class c WHERE c.relname = ANY($1::text[]) AND c.relnamespace = 'public'::regnamespace",[requiredTables]);
  // The explicit table-name loop avoids confusing an absent table with a passing policy check.
  const seen=new Map(r.rows.map(x=>[x.relname,x]));
  for(const name of requiredTables){
   const item=seen.get(name);
   if(!item||!item.relrowsecurity||!item.relforcerowsecurity)throw Error('RLS missing/not forced on '+name);
  }
 });
 flags.rls=true;record('Tenant table RLS','PASS','All five baseline tables have ENABLE and FORCE RLS');

 const legacy=await tx(async()=>{
  const r=await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name=ANY($1::text[])",[['users','activity_log','credit_union_settings']]);
  return r.rows.map(x=>x.table_name);
 });
 record('Legacy schema inventory',legacy.length?'REVIEW':'PASS',legacy.length?'Legacy tables present; audit dependencies before retirement':'No named legacy tables visible to runtime role');

 const user=process.env.ABACUS_VERIFY_USER_ID;
 const own=process.env.ABACUS_VERIFY_TENANT_A;
 const other=process.env.ABACUS_VERIFY_TENANT_B;
 if(!user||!own||!other){
  record('Cross-tenant DB isolation','INCOMPLETE','Set ABACUS_VERIFY_USER_ID, ABACUS_VERIFY_TENANT_A, and ABACUS_VERIFY_TENANT_B for a user belonging ONLY to tenant A');
 }else{
  assert(/^\d+$/.test(user)&&[own,other].every(v=>/^[0-9a-f-]{36}$/i.test(v))&&own!==other,'Invalid verification fixture IDs');
  async function inspect(tenantId){
   return tx(async()=>{
    await client.query("SELECT set_config('abacus.user_id',$1,true)",[user]);
    await client.query("SELECT set_config('abacus.platform_admin','false',true)");
    await client.query("SELECT set_config('abacus.tenant_id',$1,true)",[tenantId]);
    const memberships=await client.query('SELECT credit_union_id FROM abacus_user_credit_unions WHERE user_id=$1 AND active=true',[user]);
    const unions=await client.query('SELECT id FROM abacus_credit_unions WHERE id=$1',[tenantId]);
    const settings=await client.query('SELECT credit_union_id FROM abacus_tenant_settings WHERE credit_union_id=$1',[tenantId]);
    const mappings=await client.query('SELECT credit_union_id FROM abacus_tenant_mappings WHERE credit_union_id=$1',[tenantId]);
    const runs=await client.query('SELECT credit_union_id FROM abacus_reconciliation_runs WHERE credit_union_id=$1',[tenantId]);
    return {memberships:memberships.rows.map(r=>String(r.credit_union_id)),unions:unions.rows.length,settings:settings.rows.length,mappings:mappings.rows.length,runs:runs.rows.length};
   });
  }
  const A=await inspect(own);
  const B=await inspect(other);
  assert(A.memberships.includes(own),'Fixture invalid: user has no active membership in tenant A');
  assert(!A.memberships.includes(other),'Fixture invalid: user is also assigned to tenant B');
  assert(A.unions===1,'Fixture invalid: owned tenant A is not visible');
  assert(B.unions===0&&B.settings===0&&B.mappings===0&&B.runs===0,'Unauthorized data visible from tenant B');
  const leftover=await client.query("SELECT nullif(current_setting('abacus.user_id',true),'') AS id, nullif(current_setting('abacus.tenant_id',true),'') AS tenant, nullif(current_setting('abacus.platform_admin',true),'') AS admin");
  assert(!leftover.rows[0].id&&!leftover.rows[0].tenant&&!leftover.rows[0].admin,'RLS context retained after rollback');
  flags.isolation=true;flags.connection=true;
  record('Cross-tenant DB isolation','PASS','Tenant B inaccessible; tenant A visible');
  record('Pooled-session context reset','PASS','User, tenant and admin transaction settings cleared after rollback');
  if(!A.settings&&!A.mappings&&!A.runs)record('Tenant data coverage','INCOMPLETE','Tenant A has no visible settings, mappings, or runs; populated fixtures are required');
  else {flags.coverage=true;record('Tenant data coverage','PASS','At least one populated tenant A data table was checked');}
 }
}catch(e){
 record('Security verification','FAIL',e.message);
 process.exitCode=1;
}finally{
 client.release();
 await app.pool.end();
}
if(!flags.role||!flags.rls||!flags.isolation||!flags.connection||!flags.coverage){
 process.stdout.write('Security verification incomplete: production RLS enforcement is NOT certified.\n');
 process.exitCode=1;
}
