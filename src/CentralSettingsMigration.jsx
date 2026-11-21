import React,{useEffect,useState} from 'react';
import {tenantAPI,isServerTenant} from './tenant-api.mjs';
import {getSetting} from './settings-table.mjs';
import {recallFolder,rememberFolder} from './folder-preferences.mjs';

// Explicit, optional migration of legacy browser preferences into a selected CU.
// Never overwrites established tenant settings or uploads source files or directory handles.
export default function CentralSettingsMigration({account,activeCU,unions}){
 const [settings,setSettings]=useState([]),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const tenant=isServerTenant(activeCU);
 const cu=unions.find(u=>u.id===activeCU);
 useEffect(()=>{let active=true;setSettings([]);setError('');setNotice('');
  if(!tenant)return()=>{active=false;};
  tenantAPI('settings',{tenantId:activeCU}).then(result=>{if(active)setSettings(result.settings||[]);}).catch(e=>{if(active)setError(e.message);});
  return()=>{active=false;};
 },[activeCU,tenant]);
 async function importExisting(){
  if(busy||account.role!=='admin'||!tenant)return;
  setBusy(true);setError('');setNotice('');
  try{
   const existing=Object.fromEntries(settings.map(entry=>[entry.setting_key,entry]));
   let saved=0;
   for(const key of ['core-system','sign-convention']){
    if(existing[key])continue;
    const value=await getSetting('local-browser:local-demo',key)??await getSetting('user:'+account.id+':local-demo',key);
    if(value==null)continue;
    await tenantAPI('set-setting',{tenantId:activeCU,body:{key,value,version:0}});
    saved++;
   }
   const oldFolder=await recallFolder('local-browser:local-demo')||await recallFolder('user:'+account.id+':local-demo');
   const newScope='user:'+account.id+':'+activeCU;
   let folderCopied=false;
   if(oldFolder&&!(await recallFolder(newScope))){await rememberFolder(oldFolder,newScope);folderCopied=true;}
   const latest=await tenantAPI('settings',{tenantId:activeCU});setSettings(latest.settings||[]);
   setNotice((saved?'Imported '+saved+' shared preference(s). ':'Existing central settings preserved. ')+(folderCopied?'Browser folder selection copied; reconnect in Settings.':'No browser folder change.'));
  }catch(e){setError(e.message);}finally{setBusy(false);}
 }
 return <section className="folder-settings" aria-label="Central settings migration">
  <h2>Central Settings Migration</h2>
  <p>Import missing legacy browser preferences for the selected credit union without overwriting its saved central settings. Source files and folder permissions remain on this device.</p>
  <p><strong>Credit Union:</strong> {cu?.name||'Select a credit union above'}</p>
  <button type="button" onClick={importExisting} disabled={busy||!tenant||account.role!=='admin'}>{busy?'Importing…':'Import Existing Local Settings'}</button>
  {tenant&&<p>Saved centrally: {settings.length?settings.map(entry=>entry.setting_key).join(', '):'No settings saved yet'}</p>}
  {error&&<p className="error" role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}
 </section>;
}
