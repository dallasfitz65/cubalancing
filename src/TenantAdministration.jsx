import React,{useRef,useState} from 'react';
import {tenantAPI} from './tenant-api.mjs';
import {accountAPI} from './Login.jsx';
export default function TenantAdministration({account,activeCU,unions,onReload,onSelect}){
 const [demoBusy,setDemoBusy]=useState(false);
 const [name,setName]=useState(''),[newCore,setNewCore]=useState('xp2'),[error,setError]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 const [lookupQuery,setLookupQuery]=useState(''),[lookupResults,setLookupResults]=useState([]),[lookupBusy,setLookupBusy]=useState(false),[selectedNCUA,setSelectedNCUA]=useState(null),[manualInstitution,setManualInstitution]=useState(false);
 const addDialog=useRef(null);
 const authorized=account.role==='admin';
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

 async function provisionDemo(){
  if(!authorized||busy||demoBusy)return;
  setDemoBusy(true);setError('');setMessage('');
  try{
   const [accounts,existing]=await Promise.all([accountAPI('users'),tenantAPI('tenants')]);
   const demo=accounts.users.find(user=>user.username.toLowerCase()==='demo'&&user.active);
   if(!demo)throw Error('Create or enable the Demo login in User Management before provisioning its workspace.');
   let tenant=existing.tenants.find(t=>t.name.toLowerCase()==='demo credit union'&&t.active);
   if(!tenant){
    const created=await tenantAPI('create-tenant',{body:{name:'Demo Credit Union'}});
    tenant=created.tenant;
   }
   if(!demo.credit_unions?.some(c=>c.id===tenant.id&&c.role==='admin')){
    await tenantAPI('assign-user',{body:{tenantId:tenant.id,userId:demo.id,role:'admin'}});
   }
   // Do not overwrite previously saved Demo configuration.
   const settings=await tenantAPI('settings',{tenantId:tenant.id});
   if(!settings.settings.some(s=>s.setting_key==='core-system')){
    await tenantAPI('set-setting',{tenantId:tenant.id,body:{key:'core-system',value:'xp2',version:0}});
   }
   await onReload();onSelect(tenant.id);
   setMessage('Demo login assigned to its own centrally persisted Demo Credit Union workspace. Sign out and back in as Demo to verify saved settings.');
  }catch(e){setError('Demo setup incomplete: '+e.message+' Any created tenant is retained; retry this action after correcting the issue.');}
  finally{setDemoBusy(false);}
 }
 return <div className="pc-tenant-actions">
 {authorized&&<>
 <div className="pc-tenant-buttons"><button className="primary" type="button" onClick={openAdd} disabled={busy||demoBusy}>+ Add credit union</button><details className="pc-action-menu"><summary aria-label="Additional credit union actions">⋯</summary><button type="button" onClick={provisionDemo} disabled={busy||demoBusy}>{demoBusy?'Setting up Demo…':'Set up Demo workspace'}</button></details></div>
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
 </>}
 {error&&<p className="error" role="alert">{error}</p>}{message&&<p role="status">{message}</p>}
 </div>;
}
