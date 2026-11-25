import React,{useCallback,useEffect,useState} from 'react';
import {getSetting,saveSetting} from './settings-table.mjs';

// The browser's saved output directory is the source of truth for PDF history.
// Other file types, nested directories, and central run metadata are not displayed.
export async function listOutputPdfs(directory){
 if(!directory||directory.kind!=='directory')return [];
 const entries=[];
 for await(const item of directory.values()){
  if(item.kind!=='file'||!item.name.toLowerCase().endsWith('.pdf'))continue;
  const file=await item.getFile();
  entries.push({name:item.name,size:file.size,lastModified:file.lastModified,handle:item});
 }
 return entries.sort((a,b)=>b.lastModified-a.lastModified||a.name.localeCompare(b.name));
}

export default function OutputPdfHistory({outputFolder,onConfigure,scope}){
 const [items,setItems]=useState([]),[error,setError]=useState(''),[loading,setLoading]=useState(false);
 const [needsPermission,setNeedsPermission]=useState(false),[preview,setPreview]=useState(null);
 const [editing,setEditing]=useState(null),[draftNote,setDraftNote]=useState(''),[noteStatus,setNoteStatus]=useState(''),[savingNote,setSavingNote]=useState(false);
 const [noteIndicators,setNoteIndicators]=useState({});
 const noteKey=item=>'pdf-note:'+encodeURIComponent(outputFolder?.name||'')+':'+encodeURIComponent(item.name)+':'+item.lastModified+':'+item.size;
 const readNote=async item=>String((await getSetting(scope,noteKey(item)))||'');
 const closePreview=useCallback(()=>{
  setPreview(old=>{if(old?.url)URL.revokeObjectURL(old.url);return null;});
 },[]);
 const refresh=useCallback(async(requestAccess=false)=>{
  closePreview();setEditing(null);setDraftNote('');setNoteStatus('');
  setError('');setItems([]);setNeedsPermission(false);
  if(!outputFolder){setError('No output folder is configured. Choose one in Settings.');return;}
  setLoading(true);
  try{
   let permission=typeof outputFolder.queryPermission==='function'
    ?await outputFolder.queryPermission({mode:'read'}):'granted';
   if(permission!=='granted'&&requestAccess&&typeof outputFolder.requestPermission==='function'){
    permission=await outputFolder.requestPermission({mode:'read'});
   }
   if(permission!=='granted'){
    setNeedsPermission(true);
    setError('Browser permission is required to view PDF files in the output folder.');
    return;
   }
   const found=await listOutputPdfs(outputFolder);
   setItems(found);
   if(scope){
    const flags=await Promise.all(found.map(async item=>{try{return [noteKey(item),Boolean((await readNote(item)).trim())];}catch{return [noteKey(item),false];}}));
    setNoteIndicators(Object.fromEntries(flags));
   }
  }catch(e){setError('Cannot read output folder: '+e.message);}
  finally{setLoading(false);}
 },[outputFolder,closePreview]);
 useEffect(()=>{
  refresh(false);
  return()=>closePreview();
 },[refresh,closePreview]);
 async function openPdf(item){
  closePreview();setError('');
  // Open synchronously so browsers retain the click's user activation.
  let tab=null;
  try{tab=window.open('about:blank','_blank');if(tab)tab.opener=null;}catch{tab=null;}
  try{
   const file=await item.handle.getFile();
   if(!item.name.toLowerCase().endsWith('.pdf'))throw Error('Only PDF files can be viewed.');
   const url=URL.createObjectURL(new Blob([file],{type:'application/pdf'}));
   setPreview({name:item.name,url});
   if(tab&&!tab.closed){try{tab.location.replace(url);}catch{tab.close();setError('Automatic opening failed. Use Open PDF in new tab or Download PDF below.');}}
   else setError('The browser blocked the new tab. Use Open PDF in new tab or Download PDF below.');
  }catch(e){if(tab&&!tab.closed)tab.close();setError('Could not open PDF: '+e.message);}
 }
 async function editNote(item){
  if(savingNote)return;
  setNoteStatus('');setEditing(item);setDraftNote('');
  if(!scope){setNoteStatus('Local note storage is not available for this account.');return;}
  try{setDraftNote(await readNote(item));}
  catch(e){setNoteStatus('Could not load note: '+e.message);}
 }
 async function persistNote(){
  if(!editing||savingNote||!scope)return;
  if(draftNote.length>10000){setNoteStatus('Notes are limited to 10,000 characters.');return;}
  setSavingNote(true);setNoteStatus('');
  try{
   const key=noteKey(editing);
   await saveSetting(scope,key,draftNote);
   setNoteIndicators(prev=>({...prev,[key]:Boolean(draftNote.trim())}));
   setNoteStatus('Note saved locally for this PDF.');
  }catch(e){setNoteStatus('Note was NOT saved: '+e.message);}
  finally{setSavingNote(false);}
 }
 return <section className="folder-settings" aria-label="Balancing History PDF files">
  <h2>Balancing History</h2>
  <p>Showing PDF files only from the selected output folder on this device. Files and report notes remain on this browser and are not uploaded to ABACUS.</p>
  <p><strong>Output folder:</strong> {outputFolder?.name||'Not selected'}</p>
  <div style={{display:'flex',gap:10,flexWrap:'wrap',marginBottom:14}}>
   <button type="button" onClick={()=>refresh(true)} disabled={loading||!outputFolder}>{loading?'Reading folder…':needsPermission?'Allow folder access':'Refresh PDF list'}</button>
   {!outputFolder&&<button type="button" onClick={onConfigure}>Configure output folder</button>}
  </div>
  {error&&<p role="alert" className="error">{error}</p>}
  {!loading&&!error&&!items.length&&<p>No PDF reports found in the selected output folder.</p>}
  {!!items.length&&<div className="table-scroll"><table><thead><tr><th>PDF REPORT</th><th>MODIFIED</th><th>SIZE</th><th>NOTES</th><th>OPEN</th></tr></thead>
   <tbody>{items.map(item=><tr key={item.name}><td>{item.name}</td><td>{new Date(item.lastModified).toLocaleString()}</td><td>{(item.size/1024).toFixed(1)} KB</td><td><button type="button" aria-label={'Edit notes for '+item.name} title={noteIndicators[noteKey(item)]?'View or edit saved note':'Add note'} onClick={()=>editNote(item)} disabled={savingNote} style={{display:'inline-flex',gap:6,alignItems:'center'}}><span aria-hidden="true">📝</span>{noteIndicators[noteKey(item)]?'Notes saved':'Add note'}</button></td><td><button type="button" onClick={()=>openPdf(item)}>View PDF</button></td></tr>)}</tbody>
  </table></div>}
  {editing&&<section className="folder-settings" aria-label={'Notes for '+editing.name} style={{marginTop:16}}>
   <h3>Report Notes — {editing.name}</h3>
   <p>These notes are stored in this browser for this report. They do not change the PDF and are not shared across devices.</p>
   <label htmlFor="history-pdf-notes">Notes</label>
   <textarea id="history-pdf-notes" rows={5} maxLength={10000} value={draftNote} onChange={e=>{setDraftNote(e.target.value);setNoteStatus('Unsaved changes');}} placeholder="Add follow-up items, observations, or explanations for this balancing report" style={{width:'100%',display:'block',marginTop:8,marginBottom:12}} />
   <div style={{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}><button type="button" onClick={persistNote} disabled={savingNote||!scope}>{savingNote?'Saving…':'Save Notes'}</button><button type="button" disabled={savingNote} onClick={()=>{setEditing(null);setDraftNote('');setNoteStatus('');}}>Close</button>{noteStatus&&<span role="status">{noteStatus}</span>}</div>
  </section>}
  {preview&&<div style={{marginTop:18}}>
   <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,marginBottom:10}}><strong>{preview.name}</strong><button type="button" onClick={closePreview}>Close PDF links</button></div>
   <div role="status" style={{display:'flex',gap:16,flexWrap:'wrap'}}><a href={preview.url} target="_blank" rel="noopener noreferrer">Open PDF in new tab</a><a href={preview.url} download={preview.name}>Download PDF</a></div>
  </div>}
 </section>;
}
