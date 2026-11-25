import React,{useState} from 'react';

const MAX_SCREENSHOT_BYTES=8*1024*1024;
export default function Support({account,creditUnion}){
 const [email,setEmail]=useState(''),[module,setModule]=useState('Shares, Loans and Cash');
 const [description,setDescription]=useState(''),[screenshot,setScreenshot]=useState(null);
 const [confirmed,setConfirmed]=useState(false),[submitting,setSubmitting]=useState(false),[status,setStatus]=useState(null);
 async function submit(event){
  event.preventDefault();const submittedForm=event.currentTarget;setStatus(null);
  if(!confirmed){setStatus({ok:false,text:'Confirm that the description and screenshot do not contain member information, financial source data, or credentials.'});return;}
  if(screenshot&&!['image/png','image/jpeg','image/webp'].includes(screenshot.type)){setStatus({ok:false,text:'Choose a PNG, JPEG or WebP screenshot.'});return;}
  if(screenshot&&screenshot.size>MAX_SCREENSHOT_BYTES){setStatus({ok:false,text:'Screenshot exceeds the 8 MB upload limit.'});return;}
  const form=new FormData();
  form.set('form-name','abacus-support');
  form.set('bot-field','');
  form.set('credit_union',creditUnion||'Not selected');
  form.set('user_id',String(account?.id||''));
  form.set('username',String(account?.username||''));
  form.set('email',email.trim());
  form.set('section',module);
  form.set('problem_description',description.trim());
  form.set('submitted_at',new Date().toISOString());
  if(screenshot)form.set('screenshot',screenshot,screenshot.name);
  setSubmitting(true);
  try{
   const response=await fetch('/support-form.html',{method:'POST',body:form,credentials:'same-origin'});
   if(!response.ok)throw Error('Support intake returned HTTP '+response.status);
   setStatus({ok:true,text:'Support request sent to the support intake. Delivery/notification to a support representative is not independently confirmed.'});
   setDescription('');setScreenshot(null);setConfirmed(false);
   submittedForm.reset();
  }catch(e){setStatus({ok:false,text:'Support request was NOT submitted: '+e.message+'. Your description is retained.'});}
  finally{setSubmitting(false);}
 }
 return <section className="folder-settings abacus-support" aria-label="ABACUS Support">
  <div className="section-title-help"><h2>Submit a Support Request</h2></div>
  <p>Describe the ABACUS problem and optionally attach a redacted screenshot, following the eVoucher support workflow.</p>
  <p className="abacus-support-warning"><strong>Data protection:</strong> Do not submit member names, account numbers, balances, credentials, GL/core extracts, or unredacted reports. Unlike balancing files, a support request is transmitted to the support intake service.</p>
  <form onSubmit={submit}>
   <div className="abacus-support-fields">
    <label>Credit Union<input type="text" readOnly value={creditUnion||'Not selected'}/></label>
    <label>User ID<input type="text" readOnly value={String(account?.username||'')}/></label>
    <label>Your Email *<input required type="email" maxLength={254} autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@creditunion.org"/></label>
    <label>Balancing Section<select value={module} onChange={e=>setModule(e.target.value)}><option>Shares, Loans and Cash</option><option>Share Drafts</option><option>EFT</option><option>ATM Balancing</option><option>ACH</option><option>Settings / Login</option><option>Balancing History / PDF</option><option>Other</option></select></label>
   </div>
   <label className="abacus-support-block">Describe the Problem *<textarea required minLength={10} maxLength={10000} rows={7} value={description} onChange={e=>setDescription(e.target.value)} placeholder="What were you trying to do? What happened? Include a non-sensitive error message and steps to reproduce."/></label>
   <label className="abacus-support-block">Redacted Screenshot (optional, maximum 8 MB)<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>{const f=e.target.files?.[0]||null;setScreenshot(f);setStatus(f&&f.size>MAX_SCREENSHOT_BYTES?{ok:false,text:'Screenshot exceeds the 8 MB limit.'}:null);}}/></label>
   <label className="abacus-support-confirm"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/> I confirm this request contains no sensitive credit union or member data.</label>
   {status&&<p className={status.ok?'abacus-support-success':'error'} role="status">{status.text}</p>}
   <button className="primary" type="submit" disabled={submitting||!confirmed||!!(screenshot&&screenshot.size>MAX_SCREENSHOT_BYTES)}>{submitting?'Submitting…':'Submit Support Request'}</button>
  </form>
 </section>;
}
