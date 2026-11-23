import {getDatabase} from '@netlify/database';
// Scheduled server-side cleanup. No public HTTP route or user-controlled payload.
export default async function cleanup(){
 const db=getDatabase();
 const client=await db.pool.connect();
 try{
  const result=await client.query('DELETE FROM abacus_sessions WHERE expires_at<=now()');
  console.log('Expired ABACUS sessions removed:',result.rowCount??0);
  return new Response(null,{status:204});
 }catch(error){
  // Don't log DB credentials or SQL internals.
  console.error('Expired ABACUS session cleanup failed');
  return new Response('Session cleanup unavailable',{status:503});
 }finally{client.release();}
}
export const config={schedule:'0 3 * * *'};
