import React,{useState} from 'react';
import {accountAPI} from './Login.jsx';
export default function ChangePassword({onDone}){
 const [open,setOpen]=useState(false),[current,setCurrent]=useState(''),[next,setNext]=useState(''),[confirm,setConfirm]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function submit(e){
  e.preventDefault();if(busy)return;
  if(next!==confirm){setError('New passwords do not match.');return;}
  setError('');setBusy(true);
  try{
   const result=await accountAPI('change-password',{currentPassword:current,newPassword:next});
   setCurrent('');setNext('');setConfirm('');setOpen(false);
   if(result.reauthenticationRequired)await onDone();
  }catch(e){setError(e.message);}finally{setBusy(false);}
 }
 return <>
  <button type="button" className="header-action-with-icon" onClick={()=>{setOpen(true);setError('');}}>Change password</button>
  {open&&<div className="password-change-overlay" role="presentation"><section className="password-change-dialog" role="dialog" aria-modal="true" aria-labelledby="change-password-title">
   <h2 id="change-password-title">Change your password</h2>
   <form onSubmit={submit}>
    <label htmlFor="password-current">Current password</label><input id="password-current" type="password" value={current} onChange={e=>setCurrent(e.target.value)} autoComplete="current-password" required/>
    <label htmlFor="password-new">New password (12 or more characters)</label><input id="password-new" type="password" minLength={12} maxLength={256} value={next} onChange={e=>setNext(e.target.value)} autoComplete="new-password" required/>
    <label htmlFor="password-confirm">Confirm new password</label><input id="password-confirm" type="password" minLength={12} maxLength={256} value={confirm} onChange={e=>setConfirm(e.target.value)} autoComplete="new-password" required/>
    <p>After changing your password, all current sessions will be revoked. Sign in using the new password.</p>
    {error&&<p className="error" role="alert">{error}</p>}
    <div className="tenant-add-actions"><button type="button" disabled={busy} onClick={()=>{setOpen(false);setCurrent('');setNext('');setConfirm('');}}>Cancel</button><button className="primary" type="submit" disabled={busy||!current||next.length<12||!confirm}>{busy?'Updating…':'Change password'}</button></div>
   </form></section></div>}
 </>;
}
