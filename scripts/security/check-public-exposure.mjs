// Verify likely migration publishing paths. Only the HTTP status and content type are logged.
const input=process.env.ABACUS_VERIFY_SITE_URL||'https://cuabacus2.netlify.app';
const base=new URL(input);
if(base.protocol!=='https:')throw Error('HTTPS origin required');
const paths=[
 '/.netlify/internal/db/migrations/20261029170000_workspace/migration.sql',
 '/netlify/database/migrations/20261113190000_multitenant_foundation.sql',
 '/netlify/database/migrations/20261113195000_reconciliation_history.sql',
 '/netlify/database/migrations/20261113201000_tenant_mappings.sql',
 '/.env',
 '/src/main.jsx'
];
let inconclusive=false,exposed=false;
for(const path of paths){
 const url=new URL(path,base);
 try{
  const response=await fetch(url,{method:'GET',redirect:'follow',signal:AbortSignal.timeout(12000),headers:{Accept:'text/plain'}});
  const body=(await response.text()).slice(0,250000);
  const looksSql=/\b(CREATE TABLE|ALTER TABLE|CREATE POLICY|DROP POLICY)\b/i.test(body);
  const looksEnv=/\b(?:NETLIFY_DB_URL|DATABASE_URL|ABACUS_SETUP_TOKEN)\s*=/.test(body);
  const looksSource=/\b(import React|createRoot|export default function App)\b/.test(body);
  const leaked=response.ok&&(looksSql||looksEnv||looksSource);
  // A 200 carrying index.html from a SPA fallback is not migration exposure.
  const isHtml=/<!doctype html|<html[\s>]/i.test(body.slice(0,1200));
  const status=leaked?'FAIL':response.status>=500?'INCOMPLETE':response.ok&&!isHtml?'REVIEW':'PASS';
  if(leaked)exposed=true;if(status==='INCOMPLETE'||status==='REVIEW')inconclusive=true;
  console.log(status,path,'HTTP',response.status,'type:',response.headers.get('content-type')||'unknown');
 }catch(e){inconclusive=true;console.log('INCOMPLETE',path,'request could not be completed');}
}
if(exposed){console.error('Potential public source/migration exposure detected; block deployment until investigated.');process.exitCode=1;}
else if(inconclusive){console.error('Exposure verification incomplete. Investigate REVIEW/INCOMPLETE responses.');process.exitCode=1;}
else console.log('No publicly readable migration or configuration content detected at tested paths (not an exhaustive asset audit).');
