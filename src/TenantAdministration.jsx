import React,{useEffect,useState} from 'react';
import {tenantAPI,isServerTenant} from './tenant-api.mjs';
import {accountAPI} from './Login.jsx';
import {getSetting} from './settings-table.mjs';
import {recallFolder,rememberFolder} from './folder-preferences.mjs';
export default function TenantAdministration({account,activeCU,unions,onReload,onSelect}){
 const [name,setName]=useState(''),[error,setError]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 const [users,setUsers]=useState([]),[targetUser,setTargetUser]=useState(''),[role,setRole]=useState('reconciler');
 const [settings,setSettings]=useState([]);
 const authorized=account.role==='admin';
 const tenant=isServerTenant(activeCU);
 useEffect(()=>{if(!authorized)return;accountAPI('users').then(x=>setUsers(x.users)).catch(e=>setError(e.message));},[authorized]);
 useEffect(()=>{setSettings([]);if(!tenant)return;let active=true;tenantAPI('settings',{tenantId:activeCU}).then(x=>{if(active)setSettings(x.settings);}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[activeCU,tenant]);
 async function create(e){e.preventDefault();if(!authorized)return;setBusy(true);setError('');setMessage('');try{
   const x=await tenantAPI('create-tenant',{body:{name:name.trim()}});
   setName('');await onReload();onSelect(x.tenant.id);setMessage('Credit union created. Configure its settings and assign users.');
 }catch(e){setError(e.message);}finally{setBusy(false);}}
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
 return <section className="folder-settings"><h2>Credit union management</h2>
 {!authorized?<p>Only the platform administrator can create credit unions and assign users.</p>:<>
 <form onSubmit={create} className="abacus-user-form"><label>New credit union name<input maxLength={150} required value={name} onChange={e=>setName(e.target.value)} placeholder="Institution name"/></label><button className="primary" type="submit" disabled={busy}>Add credit union</button></form>
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
