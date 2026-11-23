import React,{useState} from 'react';
import {ACH_FILES,parseAchFile,reconcileACH} from './ach-reconciliation.mjs';

const money=v=>(v/100).toLocaleString('en-US',{style:'currency',currency:'USD'});
export default function ACH(){
 const [files,setFiles]=useState({}),[report,setReport]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const names=Object.keys(ACH_FILES);
 async function run(){
  setBusy(true);setError('');setReport(null);
  try{
   if(names.some(k=>!files[k]))throw Error('Load all four ACH CSV reports.');
   const inputs={};
   for(const k of names){
    if(files[k].size>10*1024*1024)throw Error(ACH_FILES[k].title+' exceeds 10 MB.');
    inputs[k]=parseAchFile(k,await files[k].text());
   }
   setReport(reconcileACH(inputs));
  }catch(e){setError(e.message);}finally{setBusy(false);}
 }
 return <section className="folder-settings" aria-label="ACH reconciliation prototype">
  <h2>ACH Balancing — Fiserv DNA reference model</h2>
  <p><strong>Prototype only:</strong> These are ABACUS-normalized CSV extracts, not confirmed native DNA or XP2 files. The processing date, trace ID, debit/credit direction and amount must be supplied using the column names below. A DNA-to-ABACUS adapter will be required after reviewing actual DNA files.</p>
  <p>Inputs and results remain in browser memory. This module does not change the selected core system or certify ACH settlement.</p>
  <div className="source-section-list">
  {names.map(k=><div key={k} className="source-section-card">
   <h3>{ACH_FILES[k].title}</h3>
   <p>CSV columns: <code>{ACH_FILES[k].columns}</code></p>
   <input type="file" accept=".csv,text/csv" aria-label={ACH_FILES[k].title} onChange={e=>{setFiles(v=>({...v,[k]:e.target.files?.[0]||null}));setReport(null);setError('');}}/>
   {files[k]&&<small>Selected: {files[k].name}</small>}
  </div>)}
  </div>
  <button type="button" className="primary" disabled={busy||names.some(k=>!files[k])} onClick={run}>{busy?'Reconciling…':'Run ACH balancing'}</button>
  {error&&<p role="alert" className="error">{error}</p>}
  {report&&<article className="draft-report">
   <h3>ACH reconciliation results</h3>
   <p><strong>{report.issues===0?'All prototype checks balanced':'Exceptions detected'}</strong> — {report.checks.length} date/direction controls, {report.unmatched.reduce((n,r)=>n+r.count,0)} unmatched operator/core entries.</p>
   <div className="table-scroll"><table><thead><tr><th>Date</th><th>Direction</th><th>Operator</th><th>Core postings</th><th>Settlement</th><th>GL movement</th><th>Posting variance</th><th>Settlement variance</th><th>GL variance</th><th>Status</th></tr></thead>
   <tbody>{report.checks.map((r,i)=><tr key={i}><td>{r.date}</td><td>{r.direction}</td><td>{money(r.activity)}</td><td>{money(r.posting)}</td><td>{money(r.settlement)}</td><td>{money(r.gl)}</td><td>{money(r.postingVariance)}</td><td>{money(r.settlementVariance)}</td><td>{money(r.glVariance)}</td><td>{r.ok?'Balanced':'Exception'}</td></tr>)}</tbody></table></div>
   <h3>Unmatched operator/core transactions</h3>
   {report.unmatched.length?<div className="table-scroll"><table><thead><tr><th>Date / Trace / Direction / Amount</th><th>Found in</th><th>Count</th></tr></thead><tbody>{report.unmatched.slice(0,500).map((r,i)=><tr key={i}><td>{r.key}</td><td>{r.source}</td><td>{r.count}</td></tr>)}</tbody></table>{report.unmatched.length>500&&<p>Displaying the first 500 unmatched groups. Additional unmatched groups exist.</p>}</div>:<p>Every operator entry matches a posted core entry on the normalized transaction key.</p>}
   <p><small>Control limitation: aggregate equality does not establish entry-level settlement or GL matching. Returns, reversals, rejects, timing adjustments and dedicated clearing GL conventions require actual Fiserv DNA mapping and additional controls.</small></p>
  </article>}
 </section>;
}
