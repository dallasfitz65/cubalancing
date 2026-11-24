import React,{useState,useEffect,useRef} from 'react';
import {ACH_FILES,parseAchFile,reconcileACH} from './ach-reconciliation.mjs';

const money=v=>(v/100).toLocaleString('en-US',{style:'currency',currency:'USD'});
export default function ACH({files={},report=null,onReport=()=>{},autoRun=true}){
 const [error,setError]=useState(''),[busy,setBusy]=useState(false);
 const lastFiles=useRef(null);
 const names=Object.keys(ACH_FILES);
 const ready=names.every(k=>Boolean(files[k]));
 useEffect(()=>{
  if(!autoRun||!ready||busy)return;
  const current=names.map(k=>files[k]);
  if(lastFiles.current?.every((f,i)=>f===current[i]))return;
  lastFiles.current=current;
  run();
 },[autoRun,ready,files.activity,files.posting,files.settlement,files.gl]);
 async function run(){
  setBusy(true);setError('');onReport(null);
  try{
   if(names.some(k=>!files[k]))throw Error('Load all four ACH CSV reports.');
   const inputs={};
   for(const k of names){
    if(files[k].size>10*1024*1024)throw Error(ACH_FILES[k].title+' exceeds 10 MB.');
    inputs[k]=parseAchFile(k,await files[k].text());
   }
   onReport(reconcileACH(inputs));
  }catch(e){setError(e.message);}finally{setBusy(false);}
 }
 return <section className="folder-settings" aria-label="ACH balancing prototype">
  <h2>ACH Balancing — Fiserv DNA reference model</h2>
  <p><strong>Prototype only:</strong> These are ABACUS-normalized CSV extracts, not confirmed native DNA or XP2 files. The processing date, trace ID, debit/credit direction and amount must be supplied using the column names below. A DNA-to-ABACUS adapter will be required after reviewing actual DNA files.</p>
  <p>Inputs and results remain in browser memory. This module does not change the selected core system or certify ACH settlement.</p>
  <p role="status">{busy?'ACH balancing running automatically…':report?'ACH balancing completed automatically.':ready?'ACH files detected. Checking balancing…':'Waiting for the four ACH files in the saved input folder. No manual Run Balancing button is required.'}</p>
  <p>Required source files: {names.map(k=>ACH_FILES[k].title+': '+(files[k]?.name||'Missing')).join(' · ')}</p>
  {error&&<p role="alert" className="error">{error}</p>}
  {report&&<article className="draft-report">
   <h3>ACH balancing results</h3>
   <p>{report.checks.length} date/direction controls and {report.unmatched.reduce((n,r)=>n+r.count,0)} unmatched operator/core entries. Overall prototype-check status appears on Overview.</p>
   <div className="table-scroll"><table><thead><tr><th>Date</th><th>Direction</th><th>Operator</th><th>Core postings</th><th>Settlement</th><th>GL movement</th><th>Posting variance</th><th>Settlement variance</th><th>GL variance</th><th>Status</th></tr></thead>
   <tbody>{report.checks.map((r,i)=><tr key={i}><td>{r.date}</td><td>{r.direction}</td><td>{money(r.activity)}</td><td>{money(r.posting)}</td><td>{money(r.settlement)}</td><td>{money(r.gl)}</td><td>{money(r.postingVariance)}</td><td>{money(r.settlementVariance)}</td><td>{money(r.glVariance)}</td><td>{r.ok?'Balanced':'Exception'}</td></tr>)}</tbody></table></div>
   <h3>Unmatched operator/core transactions</h3>
   {report.unmatched.length?<div className="table-scroll"><table><thead><tr><th>Date / Trace / Direction / Amount</th><th>Found in</th><th>Count</th></tr></thead><tbody>{report.unmatched.slice(0,500).map((r,i)=><tr key={i}><td>{r.key}</td><td>{r.source}</td><td>{r.count}</td></tr>)}</tbody></table>{report.unmatched.length>500&&<p>Displaying the first 500 unmatched groups. Additional unmatched groups exist.</p>}</div>:<p>Every operator entry matches a posted core entry on the normalized transaction key.</p>}
   <p><small>Control limitation: aggregate equality does not establish entry-level settlement or GL matching. Returns, reversals, rejects, timing adjustments and dedicated clearing GL conventions require actual Fiserv DNA mapping and additional controls.</small></p>
  </article>}
 </section>;
}
