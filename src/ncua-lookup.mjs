// Adapted from CU-Analytics' NCUA lookup (netlify/functions/ncua.js).
// Search is performed server-side; institution names/charters are public NCUA data.
export function normalizeNCUASearch(data){
 const list=Array.isArray(data)?data:(data?.results||data?.CreditUnions||data?.Data||[]);
 if(!Array.isArray(list))throw Error('NCUA returned an invalid directory response.');
 return list.slice(0,25).map(cu=>({
  name:String(cu.name||cu.CUName||cu.Name||'').trim(),
  charter:String(cu.charterNumber||cu.CUNumber||cu.Charter||cu.charter||cu.CharterNumber||'').trim(),
  city:String(cu.city||cu.City||'').trim(),
  state:String(cu.state||cu.State||'').trim(),
  active:cu.isActive??cu.IsActive??true
 })).filter(c=>c.name&&/^\d{1,12}$/.test(c.charter));
}
export async function searchNCUA(query,{fetcher=fetch,timeoutMs=8000}={}){
 const q=String(query||'').trim();
 if(q.length<2||q.length>100||/[\x00-\x1f\x7f]/.test(q))throw Error('Enter 2–100 characters of credit union name or charter.');
 const isCharter=/^\d+$/.test(q);
 const controller=new AbortController();
 const timeout=setTimeout(()=>controller.abort(),timeoutMs);
 try{
  const response=await fetcher('https://mapping.ncua.gov/api/ResearchCreditUnion/GetDetailSearch',{
   method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},
   body:JSON.stringify(isCharter?{charterNumber:q,take:25,skip:0}:{cuName:q,take:25,skip:0}),
   signal:controller.signal
  });
  if(!response.ok)throw Error('NCUA lookup unavailable ('+response.status+').');
  const data=await response.json();let rows=normalizeNCUASearch(data);
  if(isCharter){const exact=rows.filter(row=>row.charter===q);if(exact.length)rows=exact;}
  return {results:rows.filter(row=>row.active!==false),total:Number(data?.totalResultCount??rows.length)};
 }finally{clearTimeout(timeout);}
}
