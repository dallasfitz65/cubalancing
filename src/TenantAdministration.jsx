import React,{useEffect,useRef,useState} from 'react';
import {tenantAPI,isServerTenant} from './tenant-api.mjs';
export default function TenantAdministration({account,activeCU,unions,onReload,onSelect}){
 const [name,setName]=useState(''),[newCore,setNewCore]=useState('xp2'),[error,setError]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 const [lookupQuery,setLookupQuery]=useState(''),[lookupResults,setLookupResults]=useState([]),[lookupBusy,setLookupBusy]=useState(false),[selectedNCUA,setSelectedNCUA]=useState(null),[manualInstitution,setManualInstitution]=useState(false);
 const addDialog=useRef(null);
 const [coreProfile,setCoreProfile]=useState({status:'loading',core:null});
 const authorized=account.role==='admin';
 const tenant=isServerTenant(activeCU);
 const selectedUnion=unions.find(u=>u.id===activeCU);
 useEffect(()=>{let live=true;setCoreProfile({status:tenant?'loading':'unavailable',core:null});if(!tenant)return()=>{live=false;};
  tenantAPI('settings',{tenantId:activeCU}).then(data=>{if(!live)return;const setting=(data.settings||[]).find(item=>item.setting_key==='core-system');const core=setting?.setting_value;setCoreProfile({status:core?'ready':'unconfigured',core:typeof core==='string'?core:null});}).catch(()=>{if(live)setCoreProfile({status:'error',core:null});});
  return()=>{live=false;};
 },[activeCU,tenant]);
 async function lookupNCUA(e){
  e.preventDefault();if(!authorized||lookupBusy||busy)return;
  setError('');setLookupResults([]);setSelectedNCUA(null);setLookupBusy(true);
  try{
   const response=await tenantAPI('ncua-search',{query:lookupQuery.trim()});
   setLookupResults(response.results||[]);
   if(!response.results?.length)setError('No active NCUA credit unions matched. Try another name or charter number.');
  }catch(e){setError('NCUA lookup failed: '+e.message);}
  finally{setLookupBusy(false);}
 }
 function openAdd(){
  setName('');setNewCore('xp2');setError('');setLookupQuery('');setLookupResults([]);setSelectedNCUA(null);setManualInstitution(false);
  addDialog.current?.showModal();
 }
 async function create(e){
  e.preventDefault();if(!authorized||busy)return;
  if(!selectedNCUA&&!manualInstitution){setError('Search NCUA and confirm a credit union, or choose manual/demo entry.');return;}
  const trimmed=(selectedNCUA?.name||name).trim();
  if(!trimmed||trimmed.length>150){setError('Enter a credit union name of 1–150 characters.');return;}
  if(unions.some(u=>selectedNCUA?.charter&&u.ncua_charter===selectedNCUA.charter||u.name.trim().toLowerCase()===trimmed.toLowerCase())){setError('A credit union with this name already exists. Select it from the list.');return;}
  setBusy(true);setError('');setMessage('');
  let created=null;
  try{
   const response=await tenantAPI('create-tenant',{body:{name:trimmed,...(selectedNCUA?{ncuaCharter:selectedNCUA.charter}:{})}});
   created=response.tenant;
   try{
    await tenantAPI('set-setting',{tenantId:created.id,body:{key:'core-system',value:newCore,version:0}});
    setMessage('Credit union created with '+newCore.toUpperCase()+' selected. Use User Management + to add and assign users.');
   }catch(configError){
    setMessage('Credit union created, but its core system could not be saved: '+configError.message+'. Select the institution and configure Settings.');
   }
   addDialog.current?.close();setName('');setNewCore('xp2');setSelectedNCUA(null);setLookupResults([]);
   await onReload();onSelect(created.id);
  }catch(e){
   if(created){setMessage('Credit union was created, but the list could not be refreshed: '+e.message+'. Reload the page before adding it again.');addDialog.current?.close();}
   else setError(e.message);
  }finally{setBusy(false);}
 }

 return <section className="folder-settings" aria-label="Credit union management">
 <div className="section-title-help">
  <h2>Credit Union Management</h2>
  {authorized&&<button type="button" className="tenant-add-icon" title="Add credit union" aria-label="Add credit union" onClick={openAdd}>
   <svg aria-hidden="true" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
  </button>}
 </div>
 {!authorized?<p>Only the platform administrator can manage credit unions.</p>:<>
 <div className="tenant-list-wrapper">
  <table className="tenant-list-table">
   <thead><tr><th>Credit Union</th><th>NCUA Charter</th><th>Status</th><th>Action</th></tr></thead>
   <tbody>{unions.map(union=><tr key={union.id} className={activeCU===union.id?'tenant-selected-row':''}>
    <td><strong>{union.name}</strong></td>
    <td>{union.ncua_charter||'—'}</td>
    <td>{union.active===false?'Inactive':'Active'}</td>
    <td><button type="button" aria-label={'Select '+union.name} disabled={busy||union.active===false||activeCU===union.id}
      onClick={()=>{onSelect(union.id);setMessage('');setError('');}}> {activeCU===union.id?'Selected':'Manage'} </button></td>
   </tr>)}</tbody>
  </table>
  {!unions.length&&<p>No credit unions have been configured. Use + to add the first one.</p>}
 </div>
 <dialog ref={addDialog} className="tenant-add-dialog" aria-labelledby="tenant-add-title" onCancel={e=>{if(busy)e.preventDefault();}}>
  <div className="dialog-head"><h2 id="tenant-add-title">Add Credit Union</h2><button type="button" aria-label="Close add credit union dialog" disabled={busy} onClick={()=>addDialog.current?.close()}>✕</button></div>
  <form onSubmit={lookupNCUA} className="tenant-ncua-search">
   <label htmlFor="tenant-ncua-query">Find Credit Union — NCUA Name or Charter</label>
   <div className="tenant-ncua-query-row"><input id="tenant-ncua-query" type="search" autoFocus maxLength={100} value={lookupQuery} onChange={e=>{setLookupQuery(e.target.value);setSelectedNCUA(null);}} placeholder="Search credit unions or enter charter number" disabled={busy||lookupBusy||manualInstitution}/>
   <button type="submit" disabled={busy||lookupBusy||manualInstitution||lookupQuery.trim().length<2}>{lookupBusy?'Searching…':'Search NCUA'}</button></div>
  </form>
  {!manualInstitution&&lookupResults.length>0&&<fieldset className="tenant-ncua-results"><legend>Confirm the institution</legend>
   {lookupResults.map(row=><label key={row.charter} className={'tenant-ncua-result'+(selectedNCUA?.charter===row.charter?' selected':'')}>
    <input type="radio" name="tenant-ncua-result" checked={selectedNCUA?.charter===row.charter} onChange={()=>{setSelectedNCUA(row);setName(row.name);setError('');}}/>
    <span><strong>{row.name}</strong><small>Charter #{row.charter} · {[row.city,row.state].filter(Boolean).join(', ')||'Location unavailable'}</small></span>
   </label>)}
  </fieldset>}
  {selectedNCUA&&<p role="status" className="tenant-ncua-confirmed">Selected: {selectedNCUA.name} — Charter #{selectedNCUA.charter}</p>}
  <label className="tenant-manual-toggle"><input type="checkbox" checked={manualInstitution} onChange={e=>{setManualInstitution(e.target.checked);setSelectedNCUA(null);setLookupResults([]);setName('');setError('');}}/> Demo / institution not in NCUA directory (manual setup)</label>
  <form onSubmit={create} className="tenant-add-form">
   {manualInstitution&&<><label htmlFor="tenant-new-name">Credit Union Name</label><input id="tenant-new-name" maxLength={150} required value={name} onChange={e=>setName(e.target.value)} placeholder="Demo or non-NCUA institution name"/></>}
   <label htmlFor="tenant-new-core">Core Processing System</label>
   <select id="tenant-new-core" value={newCore} onChange={e=>setNewCore(e.target.value)}>
    <option value="xp2">XP2</option><option value="datasafe">DataSafe</option><option value="portico">Portico</option>
   </select>
   <p>DataSafe and Portico source adapters remain unvalidated. Add users through User Management + and configure reconciliation mappings after creating the credit union.</p>
   {error&&<p className="error" role="alert">{error}</p>}
   <div className="tenant-add-actions"><button type="button" disabled={busy} onClick={()=>addDialog.current?.close()}>Cancel</button><button className="primary" type="submit" disabled={busy||lookupBusy||(!selectedNCUA&&!manualInstitution)||!name.trim()}>{busy?'Creating…':'Add Credit Union'}</button></div>
  </form>
 </dialog>
  {tenant&&<><section className="tenant-profile-panel" aria-label="Selected credit union profile">
  <h3>Selected Credit Union</h3>
  <div className="tenant-profile-fields">
   <div><span>Credit Union</span><strong>{selectedUnion?.name||'Unknown'}</strong></div>
   <div><span>NCUA Charter</span><strong>{selectedUnion?.ncua_charter||'Not linked'}</strong></div>
   <div><span>Core System</span><strong>{coreProfile.status==='loading'?'Loading…':coreProfile.status==='error'?'Unavailable':coreProfile.status==='unconfigured'?'Not configured':({xp2:'XP2',datasafe:'DataSafe',portico:'Portico'}[coreProfile.core]||coreProfile.core||'Unknown')}</strong></div>
   <div><span>Status</span><strong>{selectedUnion?.active===false?'Inactive':'Active'}</strong></div>
  </div>
 </section>
</>}
 {!tenant&&<p>Select a credit union above to configure shared settings and user access.</p>}
 </>}
 {error&&<p className="error" role="alert">{error}</p>}{message&&<p role="status">{message}</p>}
 </section>;
}
