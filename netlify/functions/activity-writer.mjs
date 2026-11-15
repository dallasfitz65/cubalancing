// Server-authenticated audit writes only. Never include member records, filenames or financial amounts.
export async function insertActivity(client,actor,event,tenantId=null,targetId=null,detail=null){
 await client.query(
 'INSERT INTO abacus_activity_events(actor_user_id,credit_union_id,event_type,target_user_id,detail) VALUES($1,$2,$3,$4,$5)',
 [actor,tenantId,event,targetId,detail]
 );
}
// For authentication actions outside other application transactions.
export async function insertActivityStandalone(client,actor,event,tenantId=null,targetId=null,detail=null){
 let tx=true;
 await client.query('BEGIN');
 try{
  await client.query("SELECT set_config('abacus.user_id',$1,true)",[String(actor)]);
  await insertActivity(client,actor,event,tenantId,targetId,detail);
  await client.query('COMMIT');tx=false;
 }finally{if(tx)await client.query('ROLLBACK').catch(()=>{});}
}
