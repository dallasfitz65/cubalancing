import {validModules,resolveModules,moduleAllowed} from '../../src/module-registry.mjs';
import {getDatabase} from '@netlify/database';
import {createHash} from 'node:crypto';
import {validateMaster} from '../../src/master-mapping.mjs';
import {insertActivity} from './activity-writer.mjs';
import {searchNCUA} from '../../src/ncua-lookup.mjs';

const reply=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isPlatformOwner=user=>user?.role==='admin'&&Boolean(process.env.ABACUS_PLATFORM_OWNER_USER_ID)&&String(user.id)===String(process.env.ABACUS_PLATFORM_OWNER_USER_ID);
const sessionCookie='__Host-abacus_session';
function token(req){const item=(req.headers.get('cookie')||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(sessionCookie+'='));return item?.slice(sessionCookie.length+1)||'';}
function checkOrigin(req){const origin=req.headers.get('origin');if(origin&&origin!==new URL(req.url).origin)throw Error('Invalid origin');if(req.headers.get('sec-fetch-site')==='cross-site')throw Error('Cross-site request denied');}
function validateSetting(key,value){
 if(key==='core-system'&&['xp2','datasafe','portico'].includes(value))return value;
 if(key==='sign-convention'&&['credit-negative','natural','reverse-all'].includes(value))return value;
 if(key==='enabled-modules'&&validModules(value))return value;
 if(key==='ai-enabled'&&typeof value==='boolean')return value;
 if(key==='folder-name'&&typeof value==='string'&&value.length<=255&&!/[\\/\x00-\x1f\x7f]/.test(value))return value.trim();
 throw Error('Unrecognized setting value');
}
async function session(client,req){const raw=token(req);if(!/^[a-f0-9]{64}$/.test(raw))return null;const hash=createHash('sha256').update(raw).digest('hex');const r=await client.query('SELECT u.id,u.username,u.role FROM abacus_sessions s JOIN abacus_users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now() AND u.active=true AND u.deleted_at IS NULL',[hash]);return r.rows[0]||null;}
async function body(req,maxBytes=8192){if(req.headers.get('content-type')?.split(';')[0]!=='application/json')throw Error('JSON required');const raw=await req.text();if(raw.length>maxBytes)throw Error('Payload too large');return JSON.parse(raw);}
export async function createHandler(req,{database=getDatabase}={}){
 let client,inTransaction=false;
 try {
  if(!['GET','POST'].includes(req.method))return reply({error:'Method not allowed'},405);
  if(req.method==='POST')checkOrigin(req);
  client=await database().pool.connect();
  const user=await session(client,req);
  if(!user)return reply({error:'Authentication required'},401);
  const url=new URL(req.url),op=url.searchParams.get('op');
  await client.query('BEGIN');inTransaction=true;
  // Transaction-local context prevents setting leakage between pooled connections.
  await client.query("SELECT set_config('abacus.user_id',$1,true)",[String(user.id)]);
  await client.query("SELECT set_config('abacus.platform_admin',$1,true)",[isPlatformOwner(user)?'true':'false']);
  if(op==='platform-settings'&&req.method==='GET'){
   if(!isPlatformOwner(user))return reply({error:'Platform administrator required'},403);
   const r=await client.query("SELECT setting_value,version FROM abacus_platform_settings WHERE setting_key='ai-integration'");
   await client.query('COMMIT');inTransaction=false;
   return reply(r.rows.length?{setting:r.rows[0].setting_value,version:Number(r.rows[0].version)}:{setting:null,version:0});
  }
  if(op==='save-platform-settings'&&req.method==='POST'){
   if(!isPlatformOwner(user))return reply({error:'Platform administrator required'},403);
   const input=await body(req);
   const value=input?.value,version=input?.version;
   if(!value||typeof value!=='object'||Array.isArray(value)||!['local-rules','united-openai','united-ollama','custom'].includes(value.provider)
    ||typeof value.baseUrl!=='string'||value.baseUrl.length>2048
    ||typeof value.model!=='string'||value.model.length>200
    ||!['oauth-sso','server-token','mtls'].includes(value.authMethod)
    ||Object.keys(value).some(k=>!['provider','baseUrl','model','authMethod'].includes(k))
    ||!Number.isSafeInteger(version)||version<0)return reply({error:'Invalid platform AI configuration'},400);
   if(value.provider==='local-rules'&&(value.baseUrl!==''||value.model!==''||value.authMethod!=='oauth-sso'))return reply({error:'Local rules provider does not require API configuration'},400);
   if(value.baseUrl){
    let u;try{u=new URL(value.baseUrl);}catch{return reply({error:'Invalid HTTPS base URL'},400);}
    if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash)return reply({error:'Valid HTTPS URL without credentials or query parameters required'},400);
   }
   let r;
   if(version===0)r=await client.query("INSERT INTO abacus_platform_settings(setting_key,setting_value,updated_by) VALUES('ai-integration',$1::jsonb,$2) ON CONFLICT DO NOTHING RETURNING version",[JSON.stringify(value),user.id]);
   else r=await client.query("UPDATE abacus_platform_settings SET setting_value=$1::jsonb,updated_by=$2,updated_at=now(),version=version+1 WHERE setting_key='ai-integration' AND version=$3 RETURNING version",[JSON.stringify(value),user.id,version]);
   if(!r.rows.length)return reply({error:'Platform settings changed elsewhere; reload and retry'},409);
   await insertActivity(client,user.id,'setting_saved',null,null,'platform_ai_integration');
   await client.query('COMMIT');inTransaction=false;
   return reply({ok:true,version:Number(r.rows[0].version)});
  }
  if(req.method==='GET'&&op==='ncua-search'){
   if(!isPlatformOwner(user))return reply({error:'Platform administrator required'},403);
   const q=(url.searchParams.get('q')||'').trim();
   if(q.length<2||q.length>100)return reply({error:'Enter a name or charter of 2–100 characters'},400);
   try{
    await client.query('COMMIT');inTransaction=false;
    client.release();client=null; // never hold a database connection during external lookup
    const results=await searchNCUA(q);
    return reply(results);
   }catch(e){return reply({error:e.name==='AbortError'?'NCUA search timed out. Retry.':'NCUA search unavailable. Retry.'},502);}
  }
  if(req.method==='GET'&&op==='tenants'){
   const found=await client.query('SELECT c.id,c.name,c.ncua_charter,c.active,m.role AS membership_role FROM abacus_credit_unions c LEFT JOIN abacus_user_credit_unions m ON m.credit_union_id=c.id AND m.user_id=$1 WHERE m.active=true OR $2::boolean=true ORDER BY c.name',[user.id,isPlatformOwner(user)]);
   await client.query('COMMIT');inTransaction=false;
   return reply({tenants:found.rows});
  }
  if(req.method==='POST'&&op==='create-tenant'){
   if(!isPlatformOwner(user))return reply({error:'Administrator required'},403);
   const input=await body(req);
   let name=typeof input.name==='string'?input.name.trim():'';
   const charter=input.ncuaCharter==null?'':String(input.ncuaCharter).trim();
   if(!name||name.length>150||/[\x00-\x1f\x7f]/.test(name)||charter&&!/^\d{1,12}$/.test(charter))
    return reply({error:'Invalid credit union name or NCUA charter'},400);
   if(charter){
    // Do not hold an open transaction or DB connection during external NCUA requests.
    await client.query('COMMIT');inTransaction=false;client.release();client=null;
    let lookup;
    try{lookup=await searchNCUA(charter);}catch{return reply({error:'NCUA identity validation unavailable; retry later'},502);}
    const match=lookup.results.find(row=>row.charter===charter);
    if(!match)return reply({error:'NCUA charter not found among active institutions'},400);
    name=match.name;
    if(name.length>150)return reply({error:'NCUA institution name is too long'},400);
    client=await database().pool.connect();
    const again=await session(client,req);
    if(!again||!isPlatformOwner(again)||String(again.id)!==String(user.id))return reply({error:'Administrator required'},403);
    await client.query('BEGIN');inTransaction=true;
    await client.query("SELECT set_config('abacus.user_id',$1,true)",[String(user.id)]);
    await client.query("SELECT set_config('abacus.platform_admin','true',true)");
   }
   const existing=charter?await client.query('SELECT id,name FROM abacus_credit_unions WHERE ncua_charter=$1',[charter]):{rows:[]};
   if(existing.rows.length)return reply({error:'This NCUA charter is already registered in Abacus'},409);
   let created;
   try{created=await client.query('INSERT INTO abacus_credit_unions(name,ncua_charter) VALUES($1,$2) RETURNING id,name,ncua_charter',[name,charter||null]);}
   catch(e){if(e.code==='23505')return reply({error:'This NCUA charter is already registered in Abacus'},409);throw e;}
   await client.query("INSERT INTO abacus_user_credit_unions(user_id,credit_union_id,role) VALUES($1,$2,'admin')",[user.id,created.rows[0].id]);
   await insertActivity(client,user.id,'tenant_created',created.rows[0].id);
   await client.query('COMMIT');inTransaction=false;
   return reply({tenant:created.rows[0]},201);
  }
  if(req.method==='POST'&&op==='assign-user'){
   if(!isPlatformOwner(user))return reply({error:'Platform administrator required'},403);
   const input=await body(req);
   if(String(input.userId||'')===String(user.id))return reply({error:'Self-assignment is prohibited. Ask another authorized institution administrator to approve access.'},403);
   if(!uuid.test(String(input.tenantId||''))||!/^[0-9]+$/.test(String(input.userId||''))||!['admin','reconciler','reviewer'].includes(input.role))return reply({error:'Invalid user assignment'},400);
   const grantor=await client.query("SELECT role FROM abacus_user_credit_unions WHERE user_id=$1 AND credit_union_id=$2 AND role='admin' AND active=true",[user.id,input.tenantId]);
   if(grantor.rows.length!==1)return reply({error:'Existing credit union administrator membership required to assign users'},403);
   const target=await client.query('SELECT id FROM abacus_users WHERE id=$1 AND active=true AND deleted_at IS NULL',[input.userId]);
   const tenant=await client.query('SELECT id FROM abacus_credit_unions WHERE id=$1 AND active=true',[input.tenantId]);
   if(!target.rows.length||!tenant.rows.length)return reply({error:'User or credit union not found'},404);
   await client.query(`INSERT INTO abacus_user_credit_unions(user_id,credit_union_id,role,active) VALUES($1,$2,$3,true)
    ON CONFLICT(user_id,credit_union_id) DO UPDATE SET role=excluded.role,active=true`,[input.userId,input.tenantId,input.role]);
   await insertActivity(client,user.id,'user_assigned',input.tenantId,input.userId,input.role);
   await client.query('COMMIT');inTransaction=false;
   return reply({ok:true});
  }
  const tenantId=req.method==='GET'?url.searchParams.get('tenantId'):(await body(req,op==='save-mapping'?500000:8192));
  const incoming=req.method==='GET'?null:tenantId;
  const id=req.method==='GET'?tenantId:incoming?.tenantId;
  if(!uuid.test(String(id||'')))return reply({error:'Valid credit union required'},400);
  // Even platform administrators require explicit active CU membership. Membership grants need preexisting institution-admin authorization and cannot self-grant.
  const member=await client.query('SELECT role FROM abacus_user_credit_unions WHERE user_id=$1 AND credit_union_id=$2 AND active=true',[user.id,id]);
  if(member.rows.length!==1)return reply({error:'Credit union access denied'},403);
  await client.query("SELECT set_config('abacus.tenant_id',$1,true)",[id]);
  if(req.method==='GET'&&op==='mapping'){
   const system=url.searchParams.get('coreSystem');
   if(!['xp2','datasafe','portico'].includes(system))return reply({error:'Core system required'},400);
   const result=await client.query('SELECT mapping,version,updated_at FROM abacus_tenant_mappings WHERE credit_union_id=$1 AND core_system=$2',[id,system]);
   await client.query('COMMIT');inTransaction=false;
   return reply(result.rows.length?{mapping:result.rows[0].mapping,version:Number(result.rows[0].version),updatedAt:result.rows[0].updated_at}:{mapping:null,version:0});
  }
  if(req.method==='POST'&&op==='save-mapping'){
   if(member.rows[0].role!=='admin')return reply({error:'Credit union administrator required'},403);
   const system=incoming?.coreSystem,raw=incoming?.mapping,expected=incoming?.version;
   if(!['xp2','datasafe'].includes(system)||!Number.isSafeInteger(expected)||expected<0||!raw||typeof raw.name!=='string'||raw.name.length>255||!Array.isArray(raw.entries)||raw.entries.length<1||raw.entries.length>2000)return reply({error:'Invalid mapping upload'},400);
   let entries;
   try{entries=validateMaster(raw.entries.map(e=>[e.gl,e.description,'','',e.category,e.code]));}
   catch{return reply({error:'Invalid GL mapping entries'},400);}
   const mapping={name:raw.name,entries,version:'sha256:'+createHash('sha256').update(JSON.stringify(entries)).digest('hex')};
   let result;
   if(expected===0){
    result=await client.query("INSERT INTO abacus_tenant_mappings(credit_union_id,core_system,mapping,updated_by) VALUES($1,$2,$3::jsonb,$4) ON CONFLICT DO NOTHING RETURNING version",[id,system,JSON.stringify(mapping),user.id]);
   }else{
    result=await client.query("UPDATE abacus_tenant_mappings SET mapping=$1::jsonb,version=version+1,updated_at=now(),updated_by=$2 WHERE credit_union_id=$3 AND core_system=$4 AND version=$5 RETURNING version",[JSON.stringify(mapping),user.id,id,system,expected]);
   }
   if(!result.rows.length)return reply({error:'Mapping changed elsewhere; reload before saving'},409);
   await insertActivity(client,user.id,'mapping_saved',id,null,system);
   await client.query('COMMIT');inTransaction=false;
   return reply({ok:true,mapping,version:Number(result.rows[0].version)});
  }
  if(req.method==='GET'&&op==='runs'){
   const r=await client.query("SELECT id,workspace,mode,status,check_count,issue_count,unmapped_count,source_count,rule_version,run_at,created_at FROM abacus_reconciliation_runs WHERE credit_union_id=$1 ORDER BY run_at DESC,id DESC LIMIT 100",[id]);
   await client.query('COMMIT');inTransaction=false;
   return reply({runs:r.rows});
  }
  if(req.method==='POST'&&op==='save-run'){
   if(!['admin','reconciler'].includes(member.rows[0].role))return reply({error:'Reconciliation permission required'},403);
   const run=incoming?.run;
   if(!run||!uuid.test(String(run.id||''))||!['shares-loans','cash','overview','drafts','eft','atm'].includes(run.workspace)||!['real','demo'].includes(run.mode)||!['balanced','exceptions','partial'].includes(run.status)||![run.checkCount,run.issueCount,run.unmappedCount,run.sourceCount].every(n=>Number.isSafeInteger(n)&&n>=0)||run.checkCount>100000||run.issueCount>run.checkCount||run.unmappedCount>100000||run.sourceCount>100)return reply({error:'Invalid reconciliation summary'},400);
   const config=await client.query("SELECT setting_value FROM abacus_tenant_settings WHERE credit_union_id=$1 AND setting_key='enabled-modules'",[id]);
   const enabled=resolveModules(config.rows[0]?.setting_value);
   if(!moduleAllowed(run.workspace,enabled)||(run.workspace==='overview'&&!enabled.includes('shares-loans')))return reply({error:'Module disabled for this credit union'},403);
   const sourceHashes=run.sourceHashes;
   if(!Array.isArray(sourceHashes)||sourceHashes.length>20||sourceHashes.length!==run.sourceCount||!sourceHashes.every(x=>x&&typeof x.role==='string'&&/^[a-z_]{2,30}$/.test(x.role)&&typeof x.sha256==='string'&&/^[a-f0-9]{64}$/.test(x.sha256)))return reply({error:'Invalid source fingerprints'},400);
   if(run.ruleVersion!==null&&run.ruleVersion!==undefined&&(typeof run.ruleVersion!=='string'||run.ruleVersion.length>100))return reply({error:'Invalid rule version'},400);
   const exists=await client.query('SELECT id FROM abacus_reconciliation_runs WHERE id=$1',[run.id]);
   if(exists.rows.length)return reply({error:'Run identifier already exists'},409);
   await client.query("INSERT INTO abacus_reconciliation_runs(id,credit_union_id,created_by,workspace,mode,status,check_count,issue_count,unmapped_count,source_count,source_hashes,rule_version) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12)",[run.id,id,user.id,run.workspace,run.mode,run.status,run.checkCount,run.issueCount,run.unmappedCount,run.sourceCount,JSON.stringify(sourceHashes),run.ruleVersion??null]);
   await client.query('COMMIT');inTransaction=false;
   return reply({ok:true,id:run.id},201);
  }
  if(req.method==='GET'&&op==='settings'){
   const r=await client.query('SELECT setting_key,setting_value,version,updated_at FROM abacus_tenant_settings WHERE credit_union_id=$1 ORDER BY setting_key',[id]);
   await client.query('COMMIT');inTransaction=false;
   return reply({creditUnionId:id,settings:r.rows});
  }
  if(req.method==='POST'&&op==='set-setting'){
   if(member.rows[0].role!=='admin')return reply({error:'Credit union administrator required'},403);
   if(incoming?.key==='enabled-modules'&&!isPlatformOwner(user))return reply({error:'Platform administrator required'},403);
   const key=incoming?.key, value=validateSetting(key,incoming?.value);
   const version=incoming?.version;
   if(version!==null&&version!==undefined&&(!Number.isSafeInteger(version)||version<0))return reply({error:'Invalid setting version'},400);
   let r;
   if(version===0){
    r=await client.query("INSERT INTO abacus_tenant_settings(credit_union_id,setting_key,setting_value,updated_by) VALUES($1,$2,$3::jsonb,$4) ON CONFLICT DO NOTHING RETURNING version",[id,key,JSON.stringify(value),user.id]);
   }else if(Number.isSafeInteger(version)&&version>0){
    r=await client.query("UPDATE abacus_tenant_settings SET setting_value=$1::jsonb,version=version+1,updated_at=now(),updated_by=$2 WHERE credit_union_id=$3 AND setting_key=$4 AND version=$5 RETURNING version",[JSON.stringify(value),user.id,id,key,version]);
   }else return reply({error:'Expected current setting version'},400);
   if(!r.rows.length)return reply({error:'Setting was updated elsewhere; reload and retry'},409);
   await insertActivity(client,user.id,'setting_saved',id,null,key);
   await client.query('COMMIT');inTransaction=false;return reply({ok:true,version:Number(r.rows[0].version)});
  }
  return reply({error:'Unknown operation'},404);
 }catch(e){const invalid=e instanceof SyntaxError||['JSON required','Payload too large','Unrecognized setting value','Invalid origin','Cross-site request denied'].includes(e?.message);return reply({error:invalid?'Invalid request':'Tenant service unavailable'},invalid?400:503);}
 finally{if(client){if(inTransaction)await client.query('ROLLBACK').catch(()=>{});client.release();}}
}
export default req=>createHandler(req);
export const config={path:'/api/tenants'};
