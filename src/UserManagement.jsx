import React,{useEffect,useRef,useState} from 'react';
import {accountAPI} from './Login.jsx';
import {tenantAPI} from './tenant-api.mjs';

export default function UserManagement(){
 const addDialog=useRef(null);
 const [users,setUsers]=useState([]),[creditUnions,setCreditUnions]=useState([]),[username,setUsername]=useState(''),[password,setPassword]=useState('');
 const [role,setRole]=useState('user'),[institutionRole,setInstitutionRole]=useState('reconciler'),[creditUnionId,setCreditUnionId]=useState('');
 const [error,setError]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[showPassword,setShowPassword]=useState(false);
 async function refresh(){
  try{
   const [accounts,tenants]=await Promise.all([accountAPI('users'),tenantAPI('tenants')]);
   setUsers(accounts.users);setCreditUnions(tenants.tenants.filter(t=>t.active));
   setCreditUnionId(old=>tenants.tenants.some(t=>t.id===old&&t.active)?old:'');
  }catch(e){setError(e.message);}
 }
 useEffect(()=>{refresh();},[]);
 function openAdd(){setUsername('');setPassword('');setRole('user');setInstitutionRole('reconciler');setCreditUnionId('');setError('');setShowPassword(false);addDialog.current?.showModal();}
 async function add(e){
  e.preventDefault();if(busy)return;if(!creditUnionId){setError('Select a credit union before creating a user.');return;}
  setBusy(true);setError('');setMessage('');
  try{
   await accountAPI('create-user',{username:username.trim(),password,role,creditUnionId,institutionRole});
   setPassword('');setUsername('');setShowPassword(false);addDialog.current?.close();setMessage('User account created and assigned to the selected credit union.');
   await refresh();
  }catch(e){setError(e.message);}finally{setBusy(false);}
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
 <td>{u.active?'Active':'Disabled'}</td><td><div style={{display:'flex',gap:8,alignItems:'center'}}><button type="button" disabled={busy} onClick={()=>change(u)}>{u.active?'Disable':'Enable'}</button><button type="button" disabled={busy||u.role==='admin'} title={u.role==='admin'?'Administrators must be deactivated or transferred before removal':'Remove user access without deleting reconciliation history'} onClick={()=>remove(u)} aria-label={'Delete user '+u.username}>Delete user</button></div></td></tr>)}</tbody></table></div>
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
   <label htmlFor="new-user-platform-role">Platform Role</label>
   <select id="new-user-platform-role" value={role} onChange={e=>setRole(e.target.value)}><option value="user">User</option><option value="admin">Platform administrator</option></select>
   <p className="user-dialog-note">The user will be assigned to the selected credit union. Their password is not displayed in the user list.</p>
   {error&&<p role="alert" className="error">{error}</p>}
   <div className="tenant-add-actions"><button type="button" disabled={busy} onClick={()=>addDialog.current?.close()}>Cancel</button><button className="primary" type="submit" disabled={busy||!creditUnions.length||!creditUnionId||!username.trim()||password.length<12}>{busy?'Creating…':'Create User'}</button></div>
  </form>
 </dialog>
 {error&&<p role="alert" className="error">{error}</p>}{message&&<p role="status">{message}</p>}
 </section>;
}
