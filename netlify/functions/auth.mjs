import {getDatabase} from '@netlify/database';
import {createHash,randomBytes,scrypt as scryptCallback,timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
const scrypt=promisify(scryptCallback), COOKIE='__Host-abacus_session', HOURS=12;
const reply=(obj,status=200,headers={})=>Response.json(obj,{status,headers:{'Cache-Control':'no-store',...headers}});
const hash=s=>createHash('sha256').update(s).digest('hex');
const secureEqual=(a,b)=>{const aa=Buffer.from(String(a||'')),bb=Buffer.from(String(b||''));return aa.length===bb.length&&timingSafeEqual(aa,bb);};
const cookie=(value,maxAge)=>`${COOKIE}=${value}; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=${maxAge}`;
function tokenFrom(req){const parts=(req.headers.get('cookie')||'').split(';').map(x=>x.trim());const kv=parts.find(x=>x.startsWith(COOKIE+'='));return kv?.slice(COOKIE.length+1)||'';}
async function encodePassword(password){const salt=randomBytes(16).toString('hex');const digest=await scrypt(password,salt,64);return 'scrypt:'+salt+':'+digest.toString('hex');}
async function checkPassword(password,encoded){const [method,salt,value]=String(encoded||'').split(':');if(method!=='scrypt'||!/^[a-f0-9]{32}$/.test(salt||'')||!/^[a-f0-9]{128}$/.test(value||''))return false;const attempt=await scrypt(password,salt,64);return timingSafeEqual(attempt,Buffer.from(value,'hex'));}
function usernameValid(v){return typeof v==='string'&&/^[a-zA-Z0-9@._+-]{3,100}$/.test(v);}
function passwordValid(v){return typeof v==='string'&&v.length>=12&&v.length<=256;}
function assertOrigin(req){const origin=req.headers.get('origin');if(origin&&origin!==new URL(req.url).origin)throw Error('Invalid origin');if(req.headers.get('sec-fetch-site')==='cross-site')throw Error('Cross-site request denied');}
async function readBody(req){if(req.headers.get('content-type')?.split(';')[0]!=='application/json')throw Error('JSON required');const raw=await req.text();if(raw.length>4096)throw Error('Request too large');return JSON.parse(raw);}
async function currentUser(client,req){const token=tokenFrom(req);if(!/^[a-f0-9]{64}$/.test(token))return null;const {rows}=await client.query(`SELECT u.id,u.username,u.role,u.active FROM abacus_sessions s JOIN abacus_users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now() AND u.active=true`,[hash(token)]);return rows[0]||null;}
function publicUser(user){return {id:String(user.id),username:user.username,role:user.role};}
async function startSession(client,user){const token=randomBytes(32).toString('hex');await client.query('INSERT INTO abacus_sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval \'12 hours\')',[hash(token),user.id]);return reply({user:publicUser(user)},200,{'Set-Cookie':cookie(token,HOURS*3600)});}
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
   if(op==='users'&&user.role==='admin'){const rows=await client.query('SELECT id,username,role,active,created_at FROM abacus_users ORDER BY id');return reply({users:rows.rows.map(u=>({...u,id:String(u.id)}))});}
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
   const name=typeof body.username==='string'?body.username.trim():'';
   const password=typeof body.password==='string'?body.password:'';
   if(!usernameValid(name)||password.length>256)return reply({error:'Invalid credentials'},401);
   const found=await client.query('SELECT id,username,password_hash,role,active,failed_attempts,locked_until FROM abacus_users WHERE lower(username)=lower($1)',[name]);
   const user=found.rows[0];
   if(!user||!user.active||user.locked_until&&new Date(user.locked_until).getTime()>Date.now())return reply({error:'Invalid credentials or account temporarily locked'},401);
   const valid=await checkPassword(password,user.password_hash);
   if(!valid){await client.query(`UPDATE abacus_users SET failed_attempts=failed_attempts+1,locked_until=CASE WHEN failed_attempts+1>=5 THEN now()+interval '15 minutes' ELSE locked_until END WHERE id=$1`,[user.id]);return reply({error:'Invalid credentials'},401);}
   await client.query('UPDATE abacus_users SET failed_attempts=0,locked_until=NULL WHERE id=$1',[user.id]);
   return startSession(client,user);
  }
  const actor=await currentUser(client,req);
  if(!actor)return reply({error:'Not signed in'},401);
  if(op==='logout'){const token=tokenFrom(req);await client.query('DELETE FROM abacus_sessions WHERE token_hash=$1',[hash(token)]);return reply({ok:true},200,{'Set-Cookie':cookie('',0)});}
  if(op==='create-user'&&actor.role==='admin'){
   if(!usernameValid(body.username)||!passwordValid(body.password)||!['admin','user'].includes(body.role))return reply({error:'Provide a valid username, role and password of at least 12 characters'},400);
   const pw=await encodePassword(body.password);
   try{const result=await client.query('INSERT INTO abacus_users(username,password_hash,role) VALUES($1,$2,$3) RETURNING id,username,role,active',[body.username.trim(),pw,body.role]);return reply({user:{...result.rows[0],id:String(result.rows[0].id)}},201);}catch(e){if(e.code==='23505')return reply({error:'Username already exists'},409);throw e;}
  }
  if(op==='set-active'&&actor.role==='admin'){
   const id=String(body.id||'');if(!/^\d+$/.test(id)||typeof body.active!=='boolean'||id===String(actor.id))return reply({error:'Invalid user change'},400);
   await client.query('UPDATE abacus_users SET active=$1,updated_at=now() WHERE id=$2',[body.active,id]);if(!body.active)await client.query('DELETE FROM abacus_sessions WHERE user_id=$1',[id]);return reply({ok:true});
  }
  return reply({error:'Forbidden'},403);
 }catch(error){return reply({error:'Authentication service unavailable or request invalid'},503);}finally{client?.release();}
}
export default req=>createHandler(req);
export const config={path:'/api/auth'};
