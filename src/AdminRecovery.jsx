import React,{useState} from 'react';
async function recoveryAPI(op,recoveryKey,extra={}){
 const response=await fetch('/api/admin-recovery',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({op,recoveryKey,...extra})});
 const result=await response.json().catch(()=>({error:'Invalid response'}));
 if(!response.ok)throw Error(result.error||'Recovery failed');
 return result;
}
export default function AdminRecovery({onDone,onCancel}){
 const [recoveryKey,setRecoveryKey]=useState(''),[accounts,setAccounts]=useState(null),[userId,setUserId]=useState('');
 const [password,setPassword]=useState(''),[confirm,setConfirm]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function findAccounts(e){e.preventDefault();if(busy)return;setBusy(true);setError('');try{
  const r=await recoveryAPI('list',recoveryKey.trim());setAccounts(r.accounts);setUserId(r.accounts[0]?.id||'');
 }catch(e){setError(e.message);}finally{setBusy(false);}}
 async function reset(e){e.preventDefault();if(busy)return;if(password!==confirm){setError('Passwords do not match');return;}
 setBusy(true);setError('');try{await recoveryAPI('reset',recoveryKey.trim(),{userId,password});setPassword('');setConfirm('');setRecoveryKey('');onDone();}catch(e){setError(e.message);}finally{setBusy(false);}}
 return <main className="abacus-login"><div className="abacus-login-card">
 <div className="eyebrow">ABACUS RECONCILIATION</div><h1>Administrator recovery</h1>
 <p>Use the single-use recovery key issued by your ABACUS platform administrator. Resetting a password does not delete credit unions, account mappings, or balancing history.</p>
 {!accounts?<form onSubmit={findAccounts} className="abacus-recovery-form">
 <label htmlFor="abacus-recovery-key">One-time recovery key</label><input id="abacus-recovery-key" type="password" autoComplete="off" required value={recoveryKey} onChange={e=>setRecoveryKey(e.target.value)}/>
 <button className="primary" type="submit" disabled={busy}>{busy?'Checking…':'Continue'}</button></form>:
 <form onSubmit={reset} className="abacus-recovery-form">
 <label htmlFor="abacus-recover-user">Administrator account</label>
 <select id="abacus-recover-user" required value={userId} onChange={e=>setUserId(e.target.value)}>{accounts.map(a=><option key={a.id} value={a.id}>{a.username}</option>)}</select>
 <label htmlFor="abacus-recover-password">New password (12+ characters)</label><input id="abacus-recover-password" type="password" autoComplete="new-password" minLength={12} maxLength={256} required value={password} onChange={e=>setPassword(e.target.value)}/>
 <label htmlFor="abacus-recover-confirm">Confirm new password</label><input id="abacus-recover-confirm" type="password" autoComplete="new-password" minLength={12} maxLength={256} required value={confirm} onChange={e=>setConfirm(e.target.value)}/>
 <button className="primary" type="submit" disabled={busy||!userId}>{busy?'Resetting…':'Reset administrator password'}</button></form>}
 {error&&<p className="abacus-login-error" role="alert">{error}</p>}
 <button type="button" onClick={onCancel}>Back to sign in</button>
 <small>Recovery keys are one-time credentials. Old sessions for the recovered account will be invalidated.</small></div></main>;
}
