import React,{useState,useEffect} from 'react';
import {importMaster} from './master-mapping.mjs';
import {tenantAPI} from './tenant-api.mjs';

export default function GLMappingImport({tenantId,coreSystem,master,version,canSave,onSaved}){
 const [draft,setDraft]=useState(null),[fileName,setFileName]=useState(''),[error,setError]=useState(''),[notice,setNotice]=useState(''),[saving,setSaving]=useState(false);
 useEffect(()=>{setDraft(null);setFileName('');setError('');setNotice('');},[tenantId,coreSystem]);
 async function selectFile(file){
  setDraft(null);setFileName('');setError('');setNotice('');
  if(!file)return;
  if(!/\.csv$/i.test(file.name)||file.size<1||file.size>300000) {setError('Choose a nonempty CSV mapping under 300 KB.');return;}
  try{
   const text=await file.text(),entries=importMaster(text);
   if(entries.length>2000)throw Error('A mapping can contain no more than 2,000 rows.');
   setDraft(entries);setFileName(file.name);setNotice('CSV validated. Review the proposed mapping before saving.');
  }catch(e){setError('Mapping rejected: '+e.message);}
 }
 async function save(){
  if(!draft||saving||!canSave)return;
  if(!window.confirm('Replace the '+coreSystem.toUpperCase()+' mapping for the selected credit union with '+draft.length+' validated entries? This will affect subsequent reconciliations.'))return;
  setSaving(true);setError('');setNotice('');
  try{
   const response=await tenantAPI('save-mapping',{tenantId,body:{coreSystem,mapping:{name:fileName,entries:draft},version}});
   onSaved(response.mapping,response.version);
   setDraft(null);setFileName('');
   setNotice('Mapping saved for this credit union and '+coreSystem.toUpperCase()+'. Future reconciliation runs will use the new mapping.');
  }catch(e){setError('Mapping not saved: '+e.message+'. Reload the credit union mapping if another administrator has changed it.');}
  finally{setSaving(false);}
 }
 const groups=draft?Object.entries(draft.reduce((tot,e)=>(tot[e.category]=(tot[e.category]||0)+1,tot),{})):[];
 return <section className="folder-settings" aria-label="GL mapping CSV import">
  <h2>GL account translation / mapping</h2>
  <p>Import the six-column GL translation CSV for the selected credit union and core system ({coreSystem.toUpperCase()}). Each row must be <code>GL, description, blank, blank, category, core code</code>, with no header row. Supported categories: Shares, Certificates, Loans and Cash.</p>
  <p><strong>Current mapping:</strong> {master?.name||'Default mapping'} · {master?.entries?.length||0} entries · {version?('Saved version '+version):'Default profile'}</p>
  <div style={{marginTop:16}}>
   <label htmlFor="gl-mapping-csv-upload"><strong>Updated mapping CSV</strong></label>
   <div className="mapping-file-selector">
    <span className="mapping-filename">{fileName||'No CSV selected'}</span>
    <label htmlFor="gl-mapping-csv-upload" aria-label="Choose updated mapping CSV" title="Choose updated mapping CSV" className={'mapping-file-icon'+(!canSave||saving?' mapping-file-disabled':'')} role="button" tabIndex={!canSave||saving?-1:0} onKeyDown={e=>{if((e.key==='Enter'||e.key===' ')&&canSave&&!saving){e.preventDefault();document.getElementById('gl-mapping-csv-upload')?.click();}}}><svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4.5h10l5 5v10H4z"/><path d="M14 4.5v5h5"/><path d="M8 15h8m-4-4v8"/></svg></label>
   </div>
   <input id="gl-mapping-csv-upload" className="visually-hidden-file" type="file" accept=".csv,text/csv" disabled={!canSave||saving} onChange={e=>{selectFile(e.target.files?.[0]);e.target.value='';}}/>
  </div>
  {!canSave&&<p>Saving requires a selected server-backed credit union and credit union administrator access.</p>}
  {error&&<p className="error" role="alert">{error}</p>}
  {notice&&<p role="status">{notice}</p>}
  {draft&&<div>
   <h3>Review proposed mapping — {fileName}</h3>
   <p>{draft.length} validated rows. {groups.map(([category,count])=>category+': '+count).join(' · ')}.</p>
   <div className="table-scroll" style={{maxHeight:290,overflowY:'auto'}}>
    <table><thead><tr><th>GL account</th><th>Description</th><th>Category</th><th>Core code</th></tr></thead><tbody>{draft.slice(0,100).map((e,i)=><tr key={i}><td>{e.gl}</td><td>{e.description}</td><td>{e.category}</td><td>{e.code}</td></tr>)}</tbody></table>
   </div>
   {draft.length>100&&<p>Showing the first 100 rows; all {draft.length} validated rows will be saved.</p>}
   <p><strong>This replaces the current mapping for this credit union and core system only.</strong> Other credit unions and the DataSafe/XP2 counterpart are unchanged.</p>
   <button type="button" className="primary" disabled={saving} onClick={save}>{saving?'Saving…':'Save mapping for this credit union'}</button>
   {' '}<button type="button" disabled={saving} onClick={()=>{setDraft(null);setFileName('');setNotice('Import cancelled. Current mapping unchanged.');}}>Cancel</button>
  </div>}
 </section>;
}
