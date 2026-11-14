import React,{useEffect,useState} from 'react';
import {accountAPI} from './Login.jsx';
import {tenantAPI} from './tenant-api.mjs';

export default function UserManagement(){
 const [users,setUsers]=useState([]),[creditUnions,setCreditUnions]=useState([]),[username,setUsername]=useState(''),[password,setPassword]=useState('');
 const [role,setRole]=useState('user'),[institutionRole,setInstitutionRole]=useState('reconciler'),[creditUnionId,setCreditUnionId]=useState('');
 const [error,setError]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 async function refresh(){
  try{
   const [accounts,tenants]=await Promise.all([accountAPI('users'),tenantAPI('tenants')]);
   setUsers(accounts.users);setCreditUnions(tenants.tenants.filter(t=>t.active));
   setCreditUnionId(old=>tenants.tenants.some(t=>t.id===old&&t.active)?old:'');
  }catch(e){setError(e.message);}
 }
 useEffect(()=>{refresh();},[]);
 async function add(e){
  e.preventDefault();if(!creditUnionId){setError('Select a credit union before creating a user.');return;}
  setBusy(true);setError('');setMessage('');
  try{
   await accountAPI('create-user',{username:username.trim(),password,role,creditUnionId,institutionRole});
   setPassword('');setUsername('');setMessage('User account created and assigned to the selected credit union.');
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
 return <section className="folder-settings"><h2>User accounts</h2>
 <p>Every new user must be assigned to an active credit union during creation. The platform administrator can access multiple institutions through explicit assignments; ordinary users see only their assigned institution(s).</p>
 <div className="table-scroll"><table><thead><tr><th>USERNAME</th><th>PLATFORM ROLE</th><th>ASSIGNED CREDIT UNIONS</th><th>STATUS</th><th>ACTION</th></tr></thead>
 <tbody>{users.map(u=><tr key={u.id}><td>{u.username}</td><td>{u.role}</td>
 <td>{u.credit_unions?.length?u.credit_unions.map(c=>c.name+' ('+c.role+')').join(', '):<strong>Not assigned — administrator setup required</strong>}</td>
 <td>{u.active?'Active':'Disabled'}</td><td><button type="button" disabled={busy} onClick={()=>change(u)}>{u.active?'Disable':'Enable'}</button></td></tr>)}</tbody></table></div>
 <h3>Add user</h3>
 {!creditUnions.length&&<p role="status">Create a credit union in Credit union management before adding users.</p>}
 <form className="abacus-user-form" onSubmit={add}>
 <label>Username<input required minLength={3} maxLength={100} value={username} onChange={e=>setUsername(e.target.value)}/></label>
 <label>Temporary password (12+ characters)<input type="password" required minLength={12} maxLength={256} value={password} onChange={e=>setPassword(e.target.value)} autoComplete="new-password"/></label>
 <label>Credit union (required)<select required value={creditUnionId} onChange={e=>setCreditUnionId(e.target.value)}>
 <option value="">Select credit union</option>{creditUnions.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}</select></label>
 <label>Institution role<select value={institutionRole} onChange={e=>setInstitutionRole(e.target.value)}><option value="reconciler">Reconciler</option><option value="reviewer">Reviewer</option><option value="admin">Credit union admin</option></select></label>
 <label>Platform role<select value={role} onChange={e=>setRole(e.target.value)}><option value="user">User</option><option value="admin">Platform administrator</option></select></label>
 <button className="primary" type="submit" disabled={busy||!creditUnions.length||!creditUnionId}>Create user and assign credit union</button></form>
 {error&&<p role="alert" className="error">{error}</p>}{message&&<p role="status">{message}</p>}
 </section>;
}
