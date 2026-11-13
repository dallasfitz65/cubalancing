import {getDatabase} from '@netlify/database';
import {createHash} from 'node:crypto';

const reply=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const sessionCookie='__Host-abacus_session';
function token(req){const item=(req.headers.get('cookie')||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(sessionCookie+'='));return item?.slice(sessionCookie.length+1)||'';}
function checkOrigin(req){const origin=req.headers.get('origin');if(origin&&origin!==new URL(req.url).origin)throw Error('Invalid origin');if(req.headers.get('sec-fetch-site')==='cross-site')throw Error('Cross-site request denied');}
function validateSetting(key,value){
 if(key==='core-system'&&['xp2','datasafe'].includes(value))return value;
 if(key==='sign-convention'&&['credit-negative','natural'].includes(value))return value;
 throw Error('Unrecognized setting value');
}
async function session(client,req){const raw=token(req);if(!/^[a-f0-9]{64}$/.test(raw))return null;const hash=createHash('sha256').update(raw).digest('hex');const r=await client.query('SELECT u.id,u.username,u.role FROM abacus_sessions s JOIN abacus_users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now() AND u.active=true',[hash]);return r.rows[0]||null;}
async function body(req){if(req.headers.get('content-type')?.split(';')[0]!=='application/json')throw Error('JSON required');const raw=await req.text();if(raw.length>8192)throw Error('Payload too large');return JSON.parse(raw);}
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
  await client.query("SELECT set_config('abacus.platform_admin',$1,true)",[user.role==='admin'?'true':'false']);
  if(req.method==='GET'&&op==='tenants'){
   const found=await client.query('SELECT c.id,c.name,c.active,m.role AS membership_role FROM abacus_credit_unions c LEFT JOIN abacus_user_credit_unions m ON m.credit_union_id=c.id AND m.user_id=$1 WHERE m.active=true OR $2::boolean=true ORDER BY c.name',[user.id,user.role==='admin']);
   await client.query('COMMIT');inTransaction=false;
   return reply({tenants:found.rows});
  }
  if(req.method==='POST'&&op==='create-tenant'){
   if(user.role!=='admin')return reply({error:'Administrator required'},403);
   const input=await body(req),name=typeof input.name==='string'?input.name.trim():'';
   if(!name||name.length>150||/[\x00-\x1f\x7f]/.test(name))return reply({error:'Invalid credit union name'},400);
   const created=await client.query('INSERT INTO abacus_credit_unions(name) VALUES($1) RETURNING id,name',[name]);
   await client.query("INSERT INTO abacus_user_credit_unions(user_id,credit_union_id,role) VALUES($1,$2,'admin')",[user.id,created.rows[0].id]);
   await client.query('COMMIT');inTransaction=false;
   return reply({tenant:created.rows[0]},201);
  }
  if(req.method==='POST'&&op==='assign-user'){
   if(user.role!=='admin')return reply({error:'Platform administrator required'},403);
   const input=await body(req);
   if(!uuid.test(String(input.tenantId||''))||!/^\\d+$/.test(String(input.userId||''))||!['admin','reconciler','reviewer'].includes(input.role))return reply({error:'Invalid user assignment'},400);
   const target=await client.query('SELECT id FROM abacus_users WHERE id=$1 AND active=true',[input.userId]);
   const tenant=await client.query('SELECT id FROM abacus_credit_unions WHERE id=$1 AND active=true',[input.tenantId]);
   if(!target.rows.length||!tenant.rows.length)return reply({error:'User or credit union not found'},404);
   await client.query(`INSERT INTO abacus_user_credit_unions(user_id,credit_union_id,role,active) VALUES($1,$2,$3,true)
    ON CONFLICT(user_id,credit_union_id) DO UPDATE SET role=excluded.role,active=true`,[input.userId,input.tenantId,input.role]);
   await client.query('COMMIT');inTransaction=false;
   return reply({ok:true});
  }
  const tenantId=req.method==='GET'?url.searchParams.get('tenantId'):(await body(req));
  const incoming=req.method==='GET'?null:tenantId;
  const id=req.method==='GET'?tenantId:incoming?.tenantId;
  if(!uuid.test(String(id||'')))return reply({error:'Valid credit union required'},400);
  // A platform owner does not automatically gain access to every CU's settings.
  const member=await client.query('SELECT role FROM abacus_user_credit_unions WHERE user_id=$1 AND credit_union_id=$2 AND active=true',[user.id,id]);
  if(member.rows.length!==1)return reply({error:'Credit union access denied'},403);
  await client.query("SELECT set_config('abacus.tenant_id',$1,true)",[id]);
  if(req.method==='GET'&&op==='settings'){
   const r=await client.query('SELECT setting_key,setting_value,version,updated_at FROM abacus_tenant_settings WHERE credit_union_id=$1 ORDER BY setting_key',[id]);
   await client.query('COMMIT');inTransaction=false;
   return reply({creditUnionId:id,settings:r.rows});
  }
  if(req.method==='POST'&&op==='set-setting'){
   if(member.rows[0].role!=='admin')return reply({error:'Credit union administrator required'},403);
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
   await client.query('COMMIT');inTransaction=false;return reply({ok:true,version:Number(r.rows[0].version)});
  }
  return reply({error:'Unknown operation'},404);
 }catch(e){return reply({error:'Unable to complete tenant request'},400);}
 finally{if(client){if(inTransaction)await client.query('ROLLBACK').catch(()=>{});client.release();}}
}
export default req=>createHandler(req);
export const config={path:'/api/tenants'};
