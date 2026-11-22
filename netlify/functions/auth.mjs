import {getDatabase} from '@netlify/database';
import {createHash,randomBytes,scrypt as scryptCallback,timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
import {insertActivity,insertActivityStandalone} from './activity-writer.mjs';
const scrypt=promisify(scryptCallback), COOKIE='__Host-abacus_session', HOURS=12;
const reply=(obj,status=200,headers={})=>Response.json(obj,{status,headers:{'Cache-Control':'no-store',...headers}});
const hash=s=>createHash('sha256').update(s).digest('hex');
const secureEqual=(a,b)=>{const aa=Buffer.from(String(a||'')),bb=Buffer.from(String(b||''));return aa.length===bb.length&&timingSafeEqual(aa,bb);};
const cookie=(value,maxAge)=>`${COOKIE}=${value}; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=${maxAge}`;
function tokenFrom(req){const parts=(req.headers.get('cookie')||'').split(';').map(x=>x.trim());const kv=parts.find(x=>x.startsWith(COOKIE+'='));return kv?.slice(COOKIE.length+1)||'';}
async function encodePassword(password){const salt=randomBytes(16).toString('hex');const digest=await scrypt(password,salt,64);return 'scrypt:'+salt+':'+digest.toString('hex');}
// Perform the same password derivation even when the username is absent.
const UNKNOWN_USER_HASH='scrypt:'+'0'.repeat(32)+':'+'0'.repeat(128);
async function checkPassword(password,encoded){const [method,salt,value]=String(encoded||'').split(':');if(method!=='scrypt'||!/^[a-f0-9]{32}$/.test(salt||'')||!/^[a-f0-9]{128}$/.test(value||''))return false;const attempt=await scrypt(password,salt,64);return timingSafeEqual(attempt,Buffer.from(value,'hex'));}
function usernameValid(v){return typeof v==='string'&&/^[a-zA-Z0-9@._+-]{3,100}$/.test(v);}
function passwordValid(v){return typeof v==='string'&&v.length>=12&&v.length<=256;}
function assertOrigin(req){const origin=req.headers.get('origin');if(origin&&origin!==new URL(req.url).origin)throw Error('Invalid origin');if(req.headers.get('sec-fetch-site')==='cross-site')throw Error('Cross-site request denied');}
async function readBody(req){if(req.headers.get('content-type')?.split(';')[0]!=='application/json')throw Error('JSON required');const raw=await req.text();if(raw.length>4096)throw Error('Request too large');return JSON.parse(raw);}
async function currentUser(client,req){const token=tokenFrom(req);if(!/^[a-f0-9]{64}$/.test(token))return null;const {rows}=await client.query(`SELECT u.id,u.username,u.role,u.active FROM abacus_sessions s JOIN abacus_users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now() AND u.active=true AND u.deleted_at IS NULL`,[hash(token)]);return rows[0]||null;}
function publicUser(user){return {id:String(user.id),username:user.username,role:user.role,isPlatformOwner:Boolean(process.env.ABACUS_PLATFORM_OWNER_USER_ID&&String(user.id)===process.env.ABACUS_PLATFORM_OWNER_USER_ID&&user.role==='admin')};}
async function startSession(client,user){const token=randomBytes(32).toString('hex');await client.query('INSERT INTO abacus_sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval \'12 hours\')',[hash(token),user.id]);await insertActivityStandalone(client,user.id,'login');return reply({user:publicUser(user)},200,{'Set-Cookie':cookie(token,HOURS*3600)});}
export async function createHandler(req,{database=getDatabase,setupToken=process.env.ABACUS_SETUP_TOKEN}={}){
 let client;
 try{
  const url=new URL(req.url),op=url.searchParams.get('op')||'me';
  if(!['GET','POST'].includes(req.method))return reply({error:'Method not allowed'},405);
  if(req.method==='POST')assertOrigin(req);
  const db=database();client=await db.pool.connect();
  if(req.method==='GET'){
   if(op==='status'){const count=await client.query('SELECT EXISTS(SELECT 1 FROM abacus_users) AS initialized');return reply({needsSetup:!count.rows[0].initialized});}
   const user=await currentUser(client,req);
   if(!user)return reply({error:'Not signed in'},401);
   if(op==='me')return reply({user:publicUser(user)});
   if(op==='users'&&user.role==='admin'){
    await client.query('BEGIN');
    try{
     await client.query("SELECT set_config('abacus.user_id',$1,true)",[String(user.id)]);
     await client.query("SELECT set_config('abacus.platform_admin','true',true)");
     const rows=await client.query(`SELECT u.id,u.username,u.role,u.active,u.created_at,
     COALESCE(json_agg(json_build_object('id',c.id,'name',c.name,'role',m.role)) FILTER(WHERE c.id IS NOT NULL AND m.active=true),'[]'::json) AS credit_unions
     FROM abacus_users u
     LEFT JOIN abacus_user_credit_unions m ON m.user_id=u.id
     LEFT JOIN abacus_credit_unions c ON c.id=m.credit_union_id
     WHERE u.deleted_at IS NULL
     GROUP BY u.id ORDER BY u.id`);
    await client.query('COMMIT');return reply({users:rows.rows.map(u=>({...u,id:String(u.id)}))});
    }catch(e){await client.query('ROLLBACK').catch(()=>{});throw e;}
   }
   return reply({error:'Forbidden'},403);
  }
  const body=await readBody(req);
  if(op==='bootstrap'){
   if(!setupToken||!secureEqual(body.setupToken,setupToken))return reply({error:'Invalid setup key'},403);
   if(!usernameValid(body.username)||!passwordValid(body.password))return reply({error:'Username must be valid; password must contain 12–256 characters'},400);
   await client.query('BEGIN');
   await client.query('SELECT pg_advisory_xact_lock(18499172)');
   const count=await client.query('SELECT EXISTS(SELECT 1 FROM abacus_users) AS initialized');
   if(count.rows[0].initialized){await client.query('ROLLBACK');return reply({error:'Initial account has already been created'},409);}
   const pw=await encodePassword(body.password);
   const result=await client.query('INSERT INTO abacus_users(username,password_hash,role) VALUES($1,$2,$3) RETURNING id,username,role',[body.username.trim(),pw,'admin']);
   await client.query('COMMIT');
   return startSession(client,result.rows[0]);
  }
  if(op==='login'){
   // Expired-session cleanup must not block authentication when maintenance permissions are absent.
   await client.query('DELETE FROM abacus_sessions WHERE expires_at<=now()').catch(()=>{});
   const name=typeof body.username==='string'?body.username.trim():'';
   const password=typeof body.password==='string'?body.password:'';
   if(!usernameValid(name)||password.length>256)return reply({error:'Invalid credentials'},401);
   const found=await client.query('SELECT id,username,password_hash,role,active,failed_attempts,locked_until FROM abacus_users WHERE lower(username)=lower($1) AND deleted_at IS NULL',[name]);
   const user=found.rows[0];
   const valid=await checkPassword(password,user?.password_hash||UNKNOWN_USER_HASH);
   if(!user||!user.active)return reply({error:'Invalid credentials'},401);
   if(!valid){await client.query('UPDATE abacus_users SET failed_attempts=failed_attempts+1,locked_until=NULL WHERE id=$1',[user.id]);return reply({error:'Invalid credentials'},401);}
   await client.query('UPDATE abacus_users SET failed_attempts=0,locked_until=NULL WHERE id=$1',[user.id]);
   return startSession(client,user);
  }
  const actor=await currentUser(client,req);
  if(!actor)return reply({error:'Not signed in'},401);
  if(op==='logout'){const token=tokenFrom(req);await client.query('DELETE FROM abacus_sessions WHERE token_hash=$1',[hash(token)]);await insertActivityStandalone(client,actor.id,'logout');return reply({ok:true},200,{'Set-Cookie':cookie('',0)});}
  if(op==='change-password'){
   if(typeof body.currentPassword!=='string'||typeof body.newPassword!=='string'||!passwordValid(body.newPassword))return reply({error:'Current password and new password (12–256 characters) required'},400);
   const existing=await client.query('SELECT password_hash FROM abacus_users WHERE id=$1 AND active=true AND deleted_at IS NULL',[actor.id]);
   if(existing.rows.length!==1||!await checkPassword(body.currentPassword,existing.rows[0].password_hash))return reply({error:'Current password is incorrect'},403);
   if(await checkPassword(body.newPassword,existing.rows[0].password_hash))return reply({error:'New password must differ from current password'},400);
   const encoded=await encodePassword(body.newPassword);
   let tx=false;
   try{
    await client.query('BEGIN');tx=true;
    await client.query("SELECT set_config('abacus.user_id',$1,true)",[String(actor.id)]);
    await client.query('UPDATE abacus_users SET password_hash=$1,failed_attempts=0,locked_until=NULL,updated_at=now() WHERE id=$2 AND active=true AND deleted_at IS NULL',[encoded,actor.id]);
    await client.query('DELETE FROM abacus_sessions WHERE user_id=$1',[actor.id]);
    await insertActivity(client,actor.id,'password_changed');
    await client.query('COMMIT');tx=false;
    return reply({ok:true,reauthenticationRequired:true},200,{'Set-Cookie':cookie('',0)});
   }catch(error){if(tx)await client.query('ROLLBACK').catch(()=>{});throw error;}
  }
  if(op==='create-user'&&actor.role==='admin'){
   if(!usernameValid(body.username)||!passwordValid(body.password)||body.role!=='user'||!['admin','reconciler','reviewer'].includes(body.institutionRole)||typeof body.creditUnionId!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.creditUnionId))
    return reply({error:'A valid credit union, institution role, username and password (12+ characters) are required'},400);
   const pw=await encodePassword(body.password);
   let creating=false;
   try{
    await client.query('BEGIN');creating=true;
    // User creation and tenant membership must commit atomically.
    await client.query("SELECT set_config('abacus.user_id',$1,true)",[String(actor.id)]);
    await client.query("SELECT set_config('abacus.platform_admin','true',true)");
    const union=await client.query('SELECT id,name FROM abacus_credit_unions WHERE id=$1 AND active=true',[body.creditUnionId]);
    if(!union.rows.length){await client.query('ROLLBACK');creating=false;return reply({error:'Credit union not found or inactive'},404);}
    const grantor=await client.query("SELECT role FROM abacus_user_credit_unions WHERE user_id=$1 AND credit_union_id=$2 AND role='admin' AND active=true",[actor.id,body.creditUnionId]);
    if(grantor.rows.length!==1){await client.query('ROLLBACK');creating=false;return reply({error:'Existing credit union administrator membership required to create users'},403);}
    const created=await client.query('INSERT INTO abacus_users(username,password_hash,role) VALUES($1,$2,$3) RETURNING id,username,role,active',[body.username.trim(),pw,body.role]);
    await client.query('INSERT INTO abacus_user_credit_unions(user_id,credit_union_id,role,active) VALUES($1,$2,$3,true)',[created.rows[0].id,body.creditUnionId,body.institutionRole]);
    await insertActivity(client,actor.id,'user_created',body.creditUnionId,created.rows[0].id,body.institutionRole);
    await client.query('COMMIT');creating=false;
    return reply({user:{...created.rows[0],id:String(created.rows[0].id),credit_unions:[{id:union.rows[0].id,name:union.rows[0].name,role:body.institutionRole}]}},201);
   }catch(e){
    if(creating)await client.query('ROLLBACK').catch(()=>{});
    if(e.code==='23505')return reply({error:'Username already exists'},409);
    throw e;
   }
  }
  // Platform role changes require the explicitly configured owner ID and fresh password.
  // Ordinary platform administrators cannot elevate another user.
  if(op==='set-platform-role'){
   const ownerId=process.env.ABACUS_PLATFORM_OWNER_USER_ID;
   if(!ownerId||String(actor.id)!==ownerId||actor.role!=='admin')return reply({error:'Configured platform owner required'},403);
   if(typeof body.password!=='string'||!passwordValid(body.password)||!['admin','user'].includes(body.role)||!/^[0-9]{1,20}$/.test(String(body.id||''))||String(body.id)===String(actor.id))
    return reply({error:'Invalid platform role request'},400);
   const current=await client.query('SELECT password_hash FROM abacus_users WHERE id=$1 AND active=true AND deleted_at IS NULL',[actor.id]);
   if(current.rows.length!==1||!await checkPassword(body.password,current.rows[0].password_hash))return reply({error:'Owner password verification failed'},403);
   let tx=false;
   try{
    await client.query('BEGIN');tx=true;
    await client.query('SELECT pg_advisory_xact_lock(18499174)');
    await client.query("SELECT set_config('abacus.user_id',$1,true)",[String(actor.id)]);
    await client.query("SELECT set_config('abacus.platform_admin','true',true)");
    const target=await client.query('SELECT id,role FROM abacus_users WHERE id=$1 AND active=true AND deleted_at IS NULL FOR UPDATE',[body.id]);
    if(target.rows.length!==1){await client.query('ROLLBACK');tx=false;return reply({error:'Active target user not found'},404);}
    if(target.rows[0].role==='admin'&&body.role==='user'){
     const count=await client.query("SELECT count(*)::integer AS total FROM abacus_users WHERE role='admin' AND active=true AND deleted_at IS NULL");
     if(Number(count.rows[0].total)<=1){await client.query('ROLLBACK');tx=false;return reply({error:'Cannot demote last administrator'},409);}
    }
    await client.query('UPDATE abacus_users SET role=$1,updated_at=now() WHERE id=$2 AND deleted_at IS NULL',[body.role,body.id]);
    await client.query('DELETE FROM abacus_sessions WHERE user_id=$1',[body.id]);
    await insertActivity(client,actor.id,'platform_role_changed',null,body.id,body.role);
    await client.query('COMMIT');tx=false;return reply({ok:true});
   }catch(e){if(tx)await client.query('ROLLBACK').catch(()=>{});throw e;}
  }
  if(op==='delete-user'&&actor.role==='admin'){
   const id=String(body.id||'');
   if(!/^[0-9]{1,20}$/.test(id)||id===String(actor.id))return reply({error:'Cannot delete your own administrator account'},400);
   let inTransaction=false;
   try{
    await client.query('BEGIN');inTransaction=true;
    await client.query('SELECT pg_advisory_xact_lock(18499174)');
    await client.query("SELECT set_config('abacus.user_id',$1,true)",[String(actor.id)]);
    await client.query("SELECT set_config('abacus.platform_admin','true',true)");
    const target=await client.query('SELECT id,role,active,deleted_at FROM abacus_users WHERE id=$1 FOR UPDATE',[id]);
    if(!target.rows.length||target.rows[0].deleted_at){await client.query('ROLLBACK');inTransaction=false;return reply({error:'User account not found'},404);}
    if(target.rows[0].role==='admin'){
     const admins=await client.query("SELECT count(*)::integer AS total FROM abacus_users WHERE role='admin' AND active=true AND deleted_at IS NULL");
     if(Number(admins.rows[0].total)<=1){await client.query('ROLLBACK');inTransaction=false;return reply({error:'Cannot delete the last active administrator'},409);}
    }
    await client.query('UPDATE abacus_users SET active=false,deleted_at=now(),deleted_by=$1,updated_at=now() WHERE id=$2',[actor.id,id]);
    await client.query('UPDATE abacus_user_credit_unions SET active=false WHERE user_id=$1',[id]);
    await client.query('DELETE FROM abacus_sessions WHERE user_id=$1',[id]);
    await insertActivity(client,actor.id,'user_deleted',null,id);
    await client.query('COMMIT');inTransaction=false;
    return reply({ok:true});
   }catch(e){if(inTransaction)await client.query('ROLLBACK').catch(()=>{});throw e;}
  }
  if(op==='set-active'&&actor.role==='admin'){
   const id=String(body.id||'');if(!/^\d+$/.test(id)||typeof body.active!=='boolean'||id===String(actor.id))return reply({error:'Invalid user change'},400);
   const changed=await client.query('UPDATE abacus_users SET active=$1,updated_at=now() WHERE id=$2 AND deleted_at IS NULL RETURNING id',[body.active,id]);if(!changed.rows.length)return reply({error:'User account not found'},404);if(!body.active)await client.query('DELETE FROM abacus_sessions WHERE user_id=$1',[id]);await insertActivityStandalone(client,actor.id,body.active?'user_enabled':'user_disabled',null,id);return reply({ok:true});
  }
  return reply({error:'Forbidden'},403);
 }catch(error){const invalid=error instanceof SyntaxError||['JSON required','Request too large','Invalid origin','Cross-site request denied'].includes(error?.message);return reply({error:invalid?'Invalid request':'Authentication service unavailable'},invalid?400:503);}finally{client?.release();}
}
export default req=>createHandler(req);
export const config={path:'/api/auth',rateLimit:{action:'rate_limit',windowLimit:30,windowSize:60,aggregateBy:['ip','domain']}};
