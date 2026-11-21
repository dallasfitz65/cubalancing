import React,{useEffect,useRef,useState} from 'react';
import {tenantAPI,isServerTenant} from './tenant-api.mjs';
import {accountAPI} from './Login.jsx';
import {getSetting} from './settings-table.mjs';
import {recallFolder,rememberFolder} from './folder-preferences.mjs';
export default function TenantAdministration({account,activeCU,unions,onReload,onSelect}){
 const [name,setName]=useState(''),[newCore,setNewCore]=useState('xp2'),[error,setError]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 const addDialog=useRef(null);
 const [users,setUsers]=useState([]),[targetUser,setTargetUser]=useState(''),[role,setRole]=useState('reconciler');
 const [settings,setSettings]=useState([]);
 const authorized=account.role==='admin';
 const tenant=isServerTenant(activeCU);
 useEffect(()=>{if(!authorized)return;accountAPI('users').then(x=>setUsers(x.users)).catch(e=>setError(e.message));},[authorized]);
 useEffect(()=>{setSettings([]);if(!tenant)return;let active=true;tenantAPI('settings',{tenantId:activeCU}).then(x=>{if(active)setSettings(x.settings);}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[activeCU,tenant]);
 async function create(e){
  e.preventDefault();if(!authorized||busy)return;
  const trimmed=name.trim();
  if(!trimmed||trimmed.length>150){setError('Enter a credit union name of 1–150 characters.');return;}
  if(unions.some(u=>u.name.trim().toLowerCase()===trimmed.toLowerCase())){setError('A credit union with this name already exists. Select it from the list.');return;}
  setBusy(true);setError('');setMessage('');
  let created=null;
  try{
   const response=await tenantAPI('create-tenant',{body:{name:trimmed}});
   created=response.tenant;
   try{
    await tenantAPI('set-setting',{tenantId:created.id,body:{key:'core-system',value:newCore,version:0}});
    setMessage('Credit union created with '+newCore.toUpperCase()+' selected. Assign users below.');
   }catch(configError){
    setMessage('Credit union created, but its core system could not be saved: '+configError.message+'. Select the institution and configure Settings.');
   }
   addDialog.current?.close();setName('');setNewCore('xp2');
   await onReload();onSelect(created.id);
  }catch(e){
   if(created){setMessage('Credit union was created, but the list could not be refreshed: '+e.message+'. Reload the page before adding it again.');addDialog.current?.close();}
   else setError(e.message);
  }finally{setBusy(false);}
 }
 async function assign(e){e.preventDefault();if(!authorized||!tenant)return;setBusy(true);setError('');setMessage('');try{
  await tenantAPI('assign-user',{body:{tenantId:activeCU,userId:targetUser,role}});
  setMessage('User assigned to this credit union.');
 }catch(e){setError(e.message);}finally{setBusy(false);}}
 async function importExisting(){if(!authorized||!tenant)return;setBusy(true);setError('');setMessage('');
  try{const existing=Object.fromEntries(settings.map(x=>[x.setting_key,x]));
   let saved=0;
   for(const key of ['core-system','sign-convention']){
    if(existing[key])continue; // never overwrite shared tenant settings with browser defaults
    const value=await getSetting('local-browser:local-demo',key)??await getSetting('user:'+account.id+':local-demo',key);
    if(value==null)continue;
    await tenantAPI('set-setting',{tenantId:activeCU,body:{key,value,version:0}});saved++;
   }
   const oldFolder=await recallFolder('local-browser:local-demo')||await recallFolder('user:'+account.id+':local-demo');
   const newScope='user:'+account.id+':'+activeCU;
   let folderCopied=false;
   if(oldFolder&&!(await recallFolder(newScope))){await rememberFolder(oldFolder,newScope);folderCopied=true;}
   const refreshed=await tenantAPI('settings',{tenantId:activeCU});setSettings(refreshed.settings);
   setMessage((saved?'Imported '+saved+' shared preference(s). ':'Existing shared settings preserved. ')+(folderCopied?'Local folder preference copied; refresh to reconnect it.':'No local folder change.'));

  }catch(e){setError(e.message);}finally{setBusy(false);}
 }
 return <section className="folder-settings" aria-label="Credit union management">
 <div className="section-title-help">
  <h2>Credit Union Management</h2>
  {authorized&&<button type="button" className="tenant-add-icon" title="Add credit union" aria-label="Add credit union" onClick={()=>{setName('');setNewCore('xp2');setError('');addDialog.current?.showModal();}}>
   <svg aria-hidden="true" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
  </button>}
 </div>
 {!authorized?<p>Only the platform administrator can manage credit unions and assign users.</p>:<>
 <div className="tenant-list-wrapper">
  <table className="tenant-list-table">
   <thead><tr><th>Credit Union</th><th>Status</th><th>Action</th></tr></thead>
   <tbody>{unions.map(union=><tr key={union.id} className={activeCU===union.id?'tenant-selected-row':''}>
    <td><strong>{union.name}</strong></td>
    <td>{union.active===false?'Inactive':'Active'}</td>
    <td><button type="button" aria-label={'Select '+union.name} disabled={busy||union.active===false||activeCU===union.id}
      onClick={()=>{onSelect(union.id);setMessage('');setError('');}}> {activeCU===union.id?'Selected':'Manage'} </button></td>
   </tr>)}</tbody>
  </table>
  {!unions.length&&<p>No credit unions have been configured. Use + to add the first one.</p>}
 </div>
 <dialog ref={addDialog} className="tenant-add-dialog" aria-labelledby="tenant-add-title" onCancel={e=>{if(busy)e.preventDefault();}}>
  <div className="dialog-head"><h2 id="tenant-add-title">Add Credit Union</h2><button type="button" aria-label="Close add credit union dialog" disabled={busy} onClick={()=>addDialog.current?.close()}>✕</button></div>
  <form onSubmit={create} className="tenant-add-form">
   <label htmlFor="tenant-new-name">Credit Union Name</label>
   <input id="tenant-new-name" autoFocus maxLength={150} required value={name} onChange={e=>setName(e.target.value)} placeholder="Credit union name"/>
   <label htmlFor="tenant-new-core">Core Processing System</label>
   <select id="tenant-new-core" value={newCore} onChange={e=>setNewCore(e.target.value)}>
    <option value="xp2">XP2</option><option value="datasafe">DataSafe</option><option value="portico">Portico</option>
   </select>
   <p>DataSafe and Portico source adapters remain unvalidated. Configure user assignments and reconciliation mappings after creating the credit union.</p>
   {error&&<p className="error" role="alert">{error}</p>}
   <div className="tenant-add-actions"><button type="button" disabled={busy} onClick={()=>addDialog.current?.close()}>Cancel</button><button className="primary" type="submit" disabled={busy||!name.trim()}>{busy?'Creating…':'Add Credit Union'}</button></div>
  </form>
 </dialog>
  {tenant&&<><h3>Assign users to {unions.find(x=>x.id===activeCU)?.name||'credit union'}</h3>
 <form onSubmit={assign} className="abacus-user-form"><label>User<select required value={targetUser} onChange={e=>setTargetUser(e.target.value)}><option value="">Select user</option>{users.filter(x=>x.active).map(u=><option key={u.id} value={u.id}>{u.username}</option>)}</select></label><label>Institution role<select value={role} onChange={e=>setRole(e.target.value)}><option value="admin">Credit union admin</option><option value="reconciler">Reconciler</option><option value="reviewer">Reviewer</option></select></label><button disabled={busy||!targetUser} type="submit">Assign user</button></form>
 <h3>Central settings migration</h3><p>Import existing local XP2/DataSafe, sign-convention and same-device folder preferences for this credit union. Only absent settings are copied. Browser directory handles remain local.</p>
 <button type="button" onClick={importExisting} disabled={busy}>Import existing local settings</button>
 <p>Saved centrally: {settings.length?settings.map(x=>x.setting_key).join(', '):'No settings saved yet'}</p></>}
 {!tenant&&<p>Select a credit union above to configure shared settings and user access.</p>}
 </>}
 {error&&<p className="error" role="alert">{error}</p>}{message&&<p role="status">{message}</p>}
 </section>;
}
