import React,{useEffect,useState} from 'react';

async function fetchActivity(params){
 const query=new URLSearchParams();
 for(const [key,value] of Object.entries(params))if(value)query.set(key,value);
 const res=await fetch('/api/platform-activity?'+query.toString(),{credentials:'same-origin'});
 const result=await res.json();
 if(!res.ok)throw Error(result.error||'Unable to load activity');
 return result;
}
const eventsLabel={
 login:'Signed in',logout:'Signed out',user_created:'User created',user_disabled:'User disabled',
 user_enabled:'User enabled',user_deleted:'User removed',tenant_created:'Credit union created',
 user_assigned:'User assigned',setting_saved:'Setting changed',mapping_saved:'GL mapping saved',
 reconciliation:'Reconciliation run'
};
export default function PlatformActivity(){
 const [filters,setFilters]=useState({tenantId:'',userId:'',kind:'',after:''});
 const [data,setData]=useState({events:[],creditUnions:[],users:[]});
 const [loading,setLoading]=useState(true),[error,setError]=useState('');
 async function refresh(){
  setLoading(true);setError('');
  try{setData(await fetchActivity(filters));}catch(e){setError(e.message);}finally{setLoading(false);}
 }
 useEffect(()=>{let current=true;setLoading(true);setError('');
  fetchActivity(filters).then(x=>{if(current)setData(x);}).catch(e=>{if(current)setError(e.message);}).finally(()=>{if(current)setLoading(false);});
  return()=>{current=false;};
 },[filters.tenantId,filters.userId,filters.kind,filters.after]);
 const change=(key,value)=>setFilters(old=>({...old,[key]:value}));
 return <section className="folder-settings">
 <h2>Platform Activity Log — All Credit Unions</h2>
 <p>Admin99 oversight of authenticated user actions and saved reconciliation runs across all institutions. Financial source files, member identifiers, GL balances and source-file hashes are not shown.</p>
 <div className="abacus-audit-filters">
  <label>Credit union<select value={filters.tenantId} onChange={e=>change('tenantId',e.target.value)}>
   <option value="">All credit unions</option>{data.creditUnions.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}</select></label>
  <label>User<select value={filters.userId} onChange={e=>change('userId',e.target.value)}>
   <option value="">All users</option>{data.users.map(u=><option key={u.id} value={u.id}>{u.username}</option>)}</select></label>
  <label>Event<select value={filters.kind} onChange={e=>change('kind',e.target.value)}>
   <option value="">All events</option>{Object.entries(eventsLabel).map(([key,value])=><option key={key} value={key}>{value}</option>)}</select></label>
  <label>From date<input type="date" value={filters.after} onChange={e=>change('after',e.target.value)}/></label>
 </div>
 <p><button type="button" onClick={refresh} disabled={loading}>{loading?'Loading…':'Refresh activity'}</button></p>
 {error&&<p role="alert" className="error">{error}</p>}
 <p role="status">{data.events.length} recent events shown{data.events.length===250?' (latest 250; refine filters to narrow results)':''}.</p>
 <div className="table-scroll"><table><thead><tr><th>DATE / TIME</th><th>CREDIT UNION</th><th>USER</th><th>EVENT</th><th>DETAIL</th><th>RESULT</th></tr></thead><tbody>
 {data.events.map(e=><tr key={e.event+'-'+e.id}><td>{new Date(e.at).toLocaleString()}</td>
 <td>{e.credit_union||'Platform-wide'}</td><td>{e.username||'Unknown'}</td><td>{eventsLabel[e.event]||e.event}</td>
 <td>{[e.target_username&&'Target: '+e.target_username,e.detail].filter(Boolean).join(' · ')||'—'}</td>
 <td>{e.event==='reconciliation'?e.status+' · '+e.checks+' checks / '+e.issues+' issues':'Recorded'}</td></tr>)}
 </tbody></table></div>
 {!loading&&!data.events.length&&!error&&<p>No recorded events match your filters.</p>}
 <small>Activity events begin with this release. Older saved reconciliation summaries are included where available; browser-only actions are not recorded. This is an operational activity log, not a tamper-proof audit ledger.</small>
 </section>;
}
