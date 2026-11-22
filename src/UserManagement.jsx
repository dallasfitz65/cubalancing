import React,{useEffect,useRef,useState} from 'react';
import {accountAPI} from './Login.jsx';
import {tenantAPI} from './tenant-api.mjs';

export default function UserManagement(){
 const addDialog=useRef(null),accessDialog=useRef(null),platformDialog=useRef(null);
 const [users,setUsers]=useState([]),[creditUnions,setCreditUnions]=useState([]),[username,setUsername]=useState(''),[password,setPassword]=useState('');
 const [institutionRole,setInstitutionRole]=useState('reconciler'),[creditUnionId,setCreditUnionId]=useState('');
 const [error,setError]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[showPassword,setShowPassword]=useState(false);
 const [accessUser,setAccessUser]=useState(null),[accessCU,setAccessCU]=useState(''),[accessRole,setAccessRole]=useState('reconciler');
 const [owner,setOwner]=useState(false),[platformUser,setPlatformUser]=useState(null),[platformRole,setPlatformRole]=useState('user'),[ownerPassword,setOwnerPassword]=useState('');
 async function refresh(){
  try{
   const [accounts,tenants,current]=await Promise.all([accountAPI('users'),tenantAPI('tenants'),accountAPI('me')]);
   setOwner(current?.user?.role==='admin'&&current?.user?.username?.toLowerCase()==='admin99');
   setUsers(accounts.users);setCreditUnions(tenants.tenants.filter(t=>t.active));
   setCreditUnionId(old=>tenants.tenants.some(t=>t.id===old&&t.active)?old:'');
  }catch(e){setError(e.message);}
 }
 useEffect(()=>{refresh();},[]);
 function openAdd(){setUsername('');setPassword('');setInstitutionRole('reconciler');setCreditUnionId('');setError('');setShowPassword(false);addDialog.current?.showModal();}
 async function add(e){
  e.preventDefault();if(busy)return;if(!creditUnionId){setError('Select a credit union before creating a user.');return;}
  setBusy(true);setError('');setMessage('');
  try{
   await accountAPI('create-user',{username:username.trim(),password,role:'user',creditUnionId,institutionRole});
   setPassword('');setUsername('');setShowPassword(false);addDialog.current?.close();setMessage('User account created and assigned to the selected credit union.');
   await refresh();
  }catch(e){setError(e.message);}finally{setBusy(false);}
 }
 function editAccess(user){
  if(!user.active)return;
  setAccessUser(user);setError('');setMessage('');
  const existing=user.credit_unions?.find(c=>creditUnions.some(u=>u.id===c.id));
  const selected=existing?.id||creditUnions[0]?.id||'';
  setAccessCU(selected);
  setAccessRole(existing?.role||'reconciler');
  accessDialog.current?.showModal();
 }
 async function saveAccess(e){
  e.preventDefault();if(busy||!accessUser||!accessCU)return;
  setBusy(true);setError('');setMessage('');
  try{
   await tenantAPI('assign-user',{body:{tenantId:accessCU,userId:accessUser.id,role:accessRole}});
   accessDialog.current?.close();
   setMessage('Institution access saved for '+accessUser.username+'.');
   await refresh();
  }catch(e){setError('Institution access was NOT saved: '+e.message);}
  finally{setBusy(false);}
 }
 function openPlatformRole(user){
  if(!owner||!user.active)return;
  setPlatformUser(user);setPlatformRole(user.role==='admin'?'user':'admin');setOwnerPassword('');setError('');platformDialog.current?.showModal();
 }
 async function savePlatformRole(e){
  e.preventDefault();if(busy||!platformUser||!ownerPassword)return;
  setBusy(true);setError('');
  try{
   await accountAPI('set-platform-role',{id:platformUser.id,role:platformRole,password:ownerPassword});
   setOwnerPassword('');platformDialog.current?.close();
   setMessage('Platform role changed. The affected user must sign in again.');await refresh();
  }catch(e){setError('Platform role change rejected: '+e.message);}finally{setBusy(false);}
 }
 async function remove(user){
  if(busy)return;
  if(!window.confirm('Remove '+user.username+' from ABACUS? This disables their login and all credit union assignments. Reconciliation and audit history will be retained.'))return;
  setBusy(true);setError('');setMessage('');
  try{
   await accountAPI('delete-user',{id:user.id});
   setMessage('User removed. Their login and institution access have been revoked; historical records remain.');
   await refresh();
  }catch(e){setError(e.message);}finally{setBusy(false);}
 }
 async function change(user){
  setBusy(true);setError('');setMessage('');
  try{
   await accountAPI('set-active',{id:user.id,active:!user.active});
   setMessage('Account updated.');await refresh();
  }catch(e){setError(e.message);}finally{setBusy(false);}
 }
 return <section className="folder-settings" aria-label="User management">
 <div className="section-title-help"><h2>User Management</h2>
  <button className="tenant-add-icon" type="button" title="Add user" aria-label="Add user" onClick={openAdd} disabled={busy||!creditUnions.length}>
   <svg aria-hidden="true" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
  </button>
 </div>
 {!creditUnions.length&&<p role="status">Add an active credit union in Credit Union Management before creating users.</p>}
 <div className="table-scroll"><table><thead><tr><th>USERNAME</th><th>PLATFORM ROLE</th><th>ASSIGNED CREDIT UNIONS</th><th>STATUS</th><th>ACTION</th></tr></thead>
 <tbody>{users.map(u=><tr key={u.id}><td>{u.username}</td><td>{u.role}</td>
 <td>{u.credit_unions?.length?u.credit_unions.map(c=>c.name+' ('+c.role+')').join(', '):<strong>Not assigned — administrator setup required</strong>}</td>
 <td>{u.active?'Active':'Disabled'}</td><td><div style={{display:'flex',gap:8,alignItems:'center'}}><button type="button" disabled={busy||!u.active||!creditUnions.length} onClick={()=>editAccess(u)}>Edit institution access</button>{owner&&u.username.toLowerCase()!=='admin99'&&<button type="button" disabled={busy||!u.active} onClick={()=>openPlatformRole(u)}>Platform role</button>}<button type="button" disabled={busy} onClick={()=>change(u)}>{u.active?'Disable':'Enable'}</button><button type="button" disabled={busy||u.role==='admin'} title={u.role==='admin'?'Administrators must be deactivated or transferred before removal':'Remove user access without deleting reconciliation history'} onClick={()=>remove(u)} aria-label={'Delete user '+u.username}>Delete user</button></div></td></tr>)}</tbody></table></div>
 <dialog ref={addDialog} className="tenant-add-dialog" aria-labelledby="add-user-title" onCancel={e=>{if(busy)e.preventDefault();}}>
  <div className="dialog-head"><h2 id="add-user-title">Add User</h2><button type="button" aria-label="Close add user dialog" disabled={busy} onClick={()=>addDialog.current?.close()}>✕</button></div>
  <form className="tenant-add-form" onSubmit={add}>
   <label htmlFor="new-user-username">Username</label>
   <input id="new-user-username" autoFocus required minLength={3} maxLength={100} autoComplete="off" value={username} onChange={e=>setUsername(e.target.value)} placeholder="Email or username"/>
   <label htmlFor="new-user-password">Temporary Password (12+ characters)</label>
   <div className="user-password-row"><input id="new-user-password" type={showPassword?'text':'password'} required minLength={12} maxLength={256} value={password} onChange={e=>setPassword(e.target.value)} autoComplete="new-password"/>
    <button type="button" aria-label={showPassword?'Hide password':'Show password'} aria-pressed={showPassword} onClick={()=>setShowPassword(v=>!v)}>{showPassword?'Hide':'Show'}</button>
   </div>
   <label htmlFor="new-user-credit-union">Credit Union</label>
   <select id="new-user-credit-union" required value={creditUnionId} onChange={e=>setCreditUnionId(e.target.value)}><option value="">Select credit union</option>{creditUnions.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}</select>
   <label htmlFor="new-user-institution-role">Institution Role</label>
   <select id="new-user-institution-role" value={institutionRole} onChange={e=>setInstitutionRole(e.target.value)}><option value="reconciler">Reconciler</option><option value="reviewer">Reviewer</option><option value="admin">Credit union admin</option></select>
   <p className="user-dialog-note">The user will be assigned to the selected credit union. Their password is not displayed in the user list.</p>
   {error&&<p role="alert" className="error">{error}</p>}
   <div className="tenant-add-actions"><button type="button" disabled={busy} onClick={()=>addDialog.current?.close()}>Cancel</button><button className="primary" type="submit" disabled={busy||!creditUnions.length||!creditUnionId||!username.trim()||password.length<12}>{busy?'Creating…':'Create User'}</button></div>
  </form>
 </dialog>
 <dialog ref={accessDialog} className="tenant-add-dialog" aria-labelledby="edit-access-title" onCancel={e=>{if(busy)e.preventDefault();}}>
  <div className="dialog-head"><h2 id="edit-access-title">Edit institution access</h2><button type="button" aria-label="Close institution access dialog" disabled={busy} onClick={()=>accessDialog.current?.close()}>✕</button></div>
  <form className="tenant-add-form" onSubmit={saveAccess}>
   <p><strong>User:</strong> {accessUser?.username}</p>
   <label htmlFor="edit-access-cu">Credit Union</label>
   <select id="edit-access-cu" required value={accessCU} onChange={e=>{setAccessCU(e.target.value);setAccessRole(accessUser?.credit_unions?.find(c=>c.id===e.target.value)?.role||'reconciler');}}>
    <option value="">Select credit union</option>{creditUnions.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}
   </select>
   <label htmlFor="edit-access-role">Institution Role</label>
   <select id="edit-access-role" value={accessRole} onChange={e=>setAccessRole(e.target.value)}>
    <option value="reconciler">Reconciler</option><option value="reviewer">Reviewer</option><option value="admin">Credit union admin</option>
   </select>
   <p className="user-dialog-note">Only a platform administrator can assign institution access. The selected role applies only to this credit union; it does not change the user's platform role.</p>
   {error&&<p className="error" role="alert">{error}</p>}
   <div className="tenant-add-actions"><button type="button" disabled={busy} onClick={()=>accessDialog.current?.close()}>Cancel</button><button type="submit" className="primary" disabled={busy||!accessCU}>{busy?'Saving…':'Save institution access'}</button></div>
  </form>
 </dialog>
 <dialog ref={platformDialog} className="tenant-add-dialog" aria-labelledby="platform-role-title">
 <div className="dialog-head"><h2 id="platform-role-title">Owner-only platform role change</h2><button type="button" disabled={busy} aria-label="Close platform role dialog" onClick={()=>platformDialog.current?.close()}>✕</button></div>
 <form className="tenant-add-form" onSubmit={savePlatformRole}>
  <p>User: <strong>{platformUser?.username}</strong></p>
  <label htmlFor="platform-target-role">New platform role</label>
  <select id="platform-target-role" value={platformRole} onChange={e=>setPlatformRole(e.target.value)}><option value="user">User</option><option value="admin">Platform administrator</option></select>
  <label htmlFor="platform-owner-password">Confirm owner password</label>
  <input id="platform-owner-password" type="password" autoComplete="current-password" value={ownerPassword} onChange={e=>setOwnerPassword(e.target.value)} required/>
  <p className="user-dialog-note">A configured platform owner ID and password reauthentication are required on the server. This grants global administration and revokes the affected user's sessions.</p>
  {error&&<p role="alert" className="error">{error}</p>}
  <div className="tenant-add-actions"><button type="button" disabled={busy} onClick={()=>platformDialog.current?.close()}>Cancel</button><button className="primary" type="submit" disabled={busy||!ownerPassword}>Confirm platform role</button></div>
 </form></dialog>
 {error&&<p role="alert" className="error">{error}</p>}{message&&<p role="status">{message}</p>}
 </section>;
}
