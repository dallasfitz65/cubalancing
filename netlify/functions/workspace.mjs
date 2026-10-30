import {verifiedIdentity} from '../../server/verified-identity.mjs';
import {getUser,verifyRequestOrigin} from '@netlify/identity';
import {getDatabase} from '@netlify/database';
import {createHash} from 'node:crypto';
import {allowedCU,preferences,actions} from '../../server/policy.mjs';
import {validateMaster} from '../../src/master-mapping.mjs';
const json=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
export function createHandler({getUser,getDatabase,verifyRequestOrigin}){return async function handler(req){
 let client;
 try{
 const identity=await getUser(req);if(!identity?.id||!identity.confirmedAt)return json({error:'Verified sign-in required'},401);
 const db=getDatabase();client=await db.pool.connect();await client.query('BEGIN');
 const found=await client.query('SELECT * FROM users WHERE identity_id=$1 OR (identity_id IS NULL AND email=$2) FOR UPDATE',[identity.id,identity.email.toLowerCase()]);
 let user=found.rows[0];if(!user?.active){await client.query('ROLLBACK');return json({error:'Account not authorized'},403);}
 if(!user.identity_id){await client.query('UPDATE users SET identity_id=$1 WHERE id=$2',[identity.id,user.id]);user.identity_id=identity.id;}
 const url=new URL(req.url),op=url.searchParams.get('op')||'me';
 if(req.method==='GET'){
 if(op==='me'){await client.query('INSERT INTO activity_log(user_id,credit_union_id,action,outcome) VALUES($1,$2,$3,$4)',[user.id,user.credit_union_id,'verified_sign_in','completed']);await client.query('COMMIT');return json({user:{id:user.id,email:user.email,role:user.role,credit_union_id:user.credit_union_id,settings:user.settings}});}
 if(op==='unions'){const rows=user.role==='owner'?await client.query('SELECT id,name FROM credit_union_settings ORDER BY name'):await client.query('SELECT id,name FROM credit_union_settings WHERE id=$1',[user.credit_union_id]);await client.query('COMMIT');return json(rows.rows);}
 const cu=url.searchParams.get('cu')||user.credit_union_id;
 if(op==='log'){
 if(user.role!=='owner'&&!allowedCU(user,cu)){await client.query('ROLLBACK');return json({error:'Forbidden'},403);}
 const before=url.searchParams.get('before')||'9223372036854775807';if(!/^\d{1,19}$/.test(before))throw Error('Invalid cursor');
 const rows=await client.query('SELECT l.id,l.credit_union_id,c.name AS credit_union,l.action,l.outcome,l.created_at,u.email FROM activity_log l JOIN users u ON u.id=l.user_id LEFT JOIN credit_union_settings c ON c.id=l.credit_union_id WHERE ($1::text IS NULL OR l.credit_union_id=$1) AND l.id<$2::bigint ORDER BY l.id DESC LIMIT 100',[cu||null,before]);await client.query('COMMIT');return json(rows.rows);}
 if(op==='settings'&&allowedCU(user,cu)){const rows=await client.query('SELECT id,name,mapping,version FROM credit_union_settings WHERE id=$1',[cu]);await client.query('COMMIT');return rows.rows[0]?json(rows.rows[0]):json({error:'Credit union not found'},404);}
 await client.query('ROLLBACK');return json({error:'Forbidden'},403);
 }
 if(req.method!=='POST'){await client.query('ROLLBACK');return json({error:'Method not allowed'},405);}
 verifyRequestOrigin(req);if(req.headers.get('content-type')?.split(';')[0]!=='application/json')throw Error('JSON required');const text=await req.text();if(text.length>1000000)throw Error('Request too large');const body=JSON.parse(text),cu=body.cu||user.credit_union_id;
 let action,outcome='saved';
 if(op==='union-name'){
 if(!allowedCU(user,cu)||!['owner','admin'].includes(user.role)){await client.query('ROLLBACK');return json({error:'Forbidden'},403);}
 const name=typeof body.name==='string'?body.name.trim():'';
 if(!name||name.length>150||/[\x00-\x1f\x7f]/.test(name))throw Error('Invalid credit union name');
 const updated=await client.query('UPDATE credit_union_settings SET name=$1,updated_at=now() WHERE id=$2 RETURNING id',[name,cu]);
 if(!updated.rows.length){await client.query('ROLLBACK');return json({error:'Credit union not found'},404);}
 action='credit_union_renamed';
 }
 else if(op==='preferences'){const settings=preferences(body.settings);await client.query('UPDATE users SET settings=$1,updated_at=now() WHERE id=$2',[settings,user.id]);action='preferences_changed';}
 else if(op==='settings'){
 if(!allowedCU(user,cu)||!['owner','admin'].includes(user.role)){await client.query('ROLLBACK');return json({error:'Forbidden'},403);}
 const m=body.mapping;if(!m||typeof m.name!=='string'||m.name.length>255||!Array.isArray(m.entries)||m.entries.length>10000)throw Error('Invalid mapping');const entries=validateMaster(m.entries.map(e=>[e.gl,e.description,'','',e.category,e.code]));const mapping={name:m.name,entries,version:'sha256:'+createHash('sha256').update(JSON.stringify(entries)).digest('hex')};
 const updated=await client.query('UPDATE credit_union_settings SET mapping=$1,version=version+1,updated_at=now() WHERE id=$2 AND version=$3 RETURNING version',[mapping,cu,body.version]);if(!updated.rows.length){await client.query('ROLLBACK');return json({error:'Settings changed. Reload before saving.'},409);}action='mapping_changed';}
 else if(op==='event'){if(!allowedCU(user,cu)||!actions.has(body.action)||!['completed','exception','failed'].includes(body.outcome)){await client.query('ROLLBACK');return json({error:'Invalid activity'},400);}action=body.action;outcome=body.outcome;}
 else{await client.query('ROLLBACK');return json({error:'Unknown operation'},400);}
 await client.query('INSERT INTO activity_log(user_id,credit_union_id,action,outcome) VALUES($1,$2,$3,$4)',[user.id,cu||null,action,outcome]);await client.query('COMMIT');return json({ok:true});
 }catch(e){if(client)await client.query('ROLLBACK').catch(()=>{});return json({error:'Request could not be completed. Check configuration and try again.'},400);}finally{client?.release();}
}
}
export default createHandler({getUser:req=>verifiedIdentity(req,{getUser}),getDatabase,verifyRequestOrigin});
export const config={path:'/api/workspace'};
