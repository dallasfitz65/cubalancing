import {getDatabase} from '@netlify/database';
import {createHash,randomBytes,scrypt as scryptCallback,timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';

const scrypt=promisify(scryptCallback);
const respond=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','Pragma':'no-cache'}});
const sha=value=>createHash('sha256').update(String(value)).digest('hex');
const validKey=(value,expected)=>{
 if(typeof value!=='string'||! /^[a-f0-9]{64}$/.test(value)||! /^[a-f0-9]{64}$/.test(expected||''))return false;
 return timingSafeEqual(Buffer.from(sha(value),'hex'),Buffer.from(expected,'hex'));
};
const originAllowed=req=>{
 const origin=req.headers.get('origin');
 return (!origin||origin===new URL(req.url).origin)&&req.headers.get('sec-fetch-site')!=='cross-site';
};
export async function createHandler(req,{database=getDatabase,recoveryHash=process.env.ABACUS_RECOVERY_TOKEN_HASH}={}){
 if(req.method!=='POST')return respond({error:'Method not allowed'},405);
 if(!originAllowed(req)||req.headers.get('content-type')?.split(';')[0]!=='application/json')return respond({error:'Invalid request'},400);
 let data;
 try{const raw=await req.text();if(raw.length>2048)return respond({error:'Request too large'},413);data=JSON.parse(raw);}catch{return respond({error:'Invalid JSON'},400);}
 if(!validKey(data.recoveryKey,recoveryHash))return respond({error:'Invalid or expired recovery key'},403);
 const operation=data.op;
 if(!['list','reset'].includes(operation))return respond({error:'Unknown recovery operation'},400);
 let client,transaction=false;
 try{
  client=await database().pool.connect();
  await client.query('BEGIN');transaction=true;
  await client.query('SELECT pg_advisory_xact_lock(18499173)');
  const used=await client.query('SELECT 1 FROM abacus_admin_recovery_use WHERE token_hash=$1',[recoveryHash]);
  if(used.rows.length)return respond({error:'Recovery key has already been used'},409);
  if(operation==='list'){
   const users=await client.query("SELECT id,username FROM abacus_users WHERE role='admin' ORDER BY id");
   await client.query('COMMIT');transaction=false;
   return respond({accounts:users.rows.map(u=>({id:String(u.id),username:u.username}))});
  }
  const id=String(data.userId||''),password=data.password;
  if(!/^[0-9]{1,20}$/.test(id)||typeof password!=='string'||password.length<12||password.length>256)
   return respond({error:'Select an administrator and a password of 12–256 characters'},400);
  const found=await client.query("SELECT id FROM abacus_users WHERE id=$1 AND role='admin' FOR UPDATE",[id]);
  if(!found.rows.length)return respond({error:'Administrator not found'},404);
  const salt=randomBytes(16).toString('hex'),digest=await scrypt(password,salt,64);
  const encoded='scrypt:'+salt+':'+digest.toString('hex');
  const inserted=await client.query('INSERT INTO abacus_admin_recovery_use(token_hash,recovered_user_id) VALUES($1,$2) ON CONFLICT DO NOTHING RETURNING token_hash',[recoveryHash,id]);
  if(!inserted.rows.length)return respond({error:'Recovery key already used'},409);
  await client.query('UPDATE abacus_users SET password_hash=$1,active=true,failed_attempts=0,locked_until=NULL,updated_at=now() WHERE id=$2',[encoded,id]);
  await client.query('DELETE FROM abacus_sessions WHERE user_id=$1',[id]);
  await client.query('COMMIT');transaction=false;
  return respond({ok:true});
 }catch{return respond({error:'Recovery service unavailable'},503);}
 finally{if(client){if(transaction)await client.query('ROLLBACK').catch(()=>{});client.release();}}
}
export default req=>createHandler(req);
export const config={path:'/api/admin-recovery'};
