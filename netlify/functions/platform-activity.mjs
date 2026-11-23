import {getDatabase} from '@netlify/database';
import {createHash} from 'node:crypto';
const response=(v,status=200)=>Response.json(v,{status,headers:{'Cache-Control':'no-store'}});
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
async function session(client,req){
 const cookie=(req.headers.get('cookie')||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('__Host-abacus_session='));
 const raw=cookie?.split('=')[1]||'';
 if(!/^[a-f0-9]{64}$/.test(raw))return null;
 const digest=createHash('sha256').update(raw).digest('hex');
 const result=await client.query("SELECT u.id,u.username,u.role FROM abacus_sessions s JOIN abacus_users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now() AND u.active=true AND u.deleted_at IS NULL",[digest]);
 return result.rows[0]||null;
}
export async function createHandler(req,{database=getDatabase}={}){
 if(req.method!=='GET')return response({error:'Method not allowed'},405);
 let client,tx=false;
 try{
  client=await database().pool.connect();
  const user=await session(client,req);
  if(!user)return response({error:'Authentication required'},401);
  // Global audit access requires the configured immutable owner user ID, not an editable username.
  const ownerId=process.env.ABACUS_PLATFORM_OWNER_USER_ID;
  if(!ownerId||user.role!=='admin'||String(user.id)!==String(ownerId))return response({error:'Configured platform owner required'},403);
  const params=new URL(req.url).searchParams;
  const tenantId=params.get('tenantId')||'',userId=params.get('userId')||'',kind=params.get('kind')||'',after=params.get('after')||'';
  if(tenantId&&!uuid.test(tenantId))return response({error:'Invalid credit union filter'},400);
  if(userId&&!/^[0-9]{1,20}$/.test(userId))return response({error:'Invalid user filter'},400);
  if(kind&&!['login','logout','user_created','user_disabled','user_enabled','user_deleted','tenant_created','user_assigned','platform_role_changed','setting_saved','mapping_saved','reconciliation'].includes(kind))return response({error:'Invalid activity filter'},400);
  if(after&&(!/^\d{4}-\d{2}-\d{2}$/.test(after)||!Number.isFinite(Date.parse(after))))return response({error:'Invalid date filter'},400);
  await client.query('BEGIN');tx=true;
  await client.query("SELECT set_config('abacus.user_id',$1,true)",[String(user.id)]);
  await client.query("SELECT set_config('abacus.platform_admin','true',true)");
  await client.query("SELECT set_config('abacus.audit_admin','true',true)");
  const filters=[tenantId||null,userId||null,after||null,kind||null];
  const events=await client.query(`
   SELECT e.id::text AS id,e.created_at AS at,e.event_type AS event,
    e.actor_user_id::text AS user_id,u.username,e.credit_union_id::text AS credit_union_id,
    c.name AS credit_union,tu.username AS target_username,e.detail,e.target_user_id::text AS target_user_id,
    null::text AS status,null::integer AS checks,null::integer AS issues
   FROM abacus_activity_events e
   JOIN abacus_users u ON u.id=e.actor_user_id
   LEFT JOIN abacus_users tu ON tu.id=e.target_user_id
   LEFT JOIN abacus_credit_unions c ON c.id=e.credit_union_id
   WHERE ($1::uuid IS NULL OR e.credit_union_id=$1::uuid)
    AND ($2::bigint IS NULL OR e.actor_user_id=$2::bigint OR e.target_user_id=$2::bigint)
    AND ($3::date IS NULL OR e.created_at >= $3::date)
    AND ($4::text IS NULL OR e.event_type=$4::text)
   ORDER BY e.created_at DESC,e.id DESC LIMIT 500`,filters);
  const runs=kind&&kind!=='reconciliation'?{rows:[]}:await client.query(`
   SELECT r.id::text AS id,r.run_at AS at,'reconciliation'::text AS event,
    r.created_by::text AS user_id,u.username,r.credit_union_id::text AS credit_union_id,c.name AS credit_union,
    null::text AS target_username,r.workspace||' / '||r.mode AS detail,null::text AS target_user_id,
    r.status,r.check_count AS checks,r.issue_count AS issues
   FROM abacus_reconciliation_runs r
   JOIN abacus_users u ON u.id=r.created_by JOIN abacus_credit_unions c ON c.id=r.credit_union_id
   WHERE ($1::uuid IS NULL OR r.credit_union_id=$1::uuid)
    AND ($2::bigint IS NULL OR r.created_by=$2::bigint)
    AND ($3::date IS NULL OR r.run_at >= $3::date)
   ORDER BY r.run_at DESC,r.id DESC LIMIT 500`,filters.slice(0,3));
  const all=[...events.rows,...runs.rows].sort((a,b)=>new Date(b.at)-new Date(a.at)).slice(0,250);
  const metadata=await Promise.all([
   client.query('SELECT id::text,name FROM abacus_credit_unions ORDER BY name'),
   client.query('SELECT id::text,username FROM abacus_users ORDER BY username')
  ]);
  await client.query('COMMIT');tx=false;
  return response({events:all,creditUnions:metadata[0].rows,users:metadata[1].rows,
   note:'Events start when activity logging was enabled; prior stored reconciliation summaries are included. Browser-only actions are not captured.'});
 }catch(error){return response({error:'Activity log unavailable'},503);}
 finally{if(client){if(tx)await client.query('ROLLBACK').catch(()=>{});client.release();}}
}
export default req=>createHandler(req);
export const config={path:'/api/platform-activity'};
