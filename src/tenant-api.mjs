// Authenticated API used only for server-backed credit union configuration and run metadata.
export async function tenantAPI(op,{tenantId,body,coreSystem}={}){
 const query=new URLSearchParams({op});
 if(tenantId)query.set('tenantId',tenantId);
 if(coreSystem)query.set('coreSystem',coreSystem);
 const response=await fetch('/api/tenants?'+query.toString(),{
  method:body?'POST':'GET',
  credentials:'same-origin',
  headers:body?{'Content-Type':'application/json'}:{},
  body:body?JSON.stringify({...body,...(tenantId?{tenantId}:{})}):undefined
 });
 const data=await response.json().catch(()=>({error:'Invalid server response'}));
 if(!response.ok)throw Error(data.error||'Tenant service unavailable');
 return data;
}
export const isServerTenant=id=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(id||''));
