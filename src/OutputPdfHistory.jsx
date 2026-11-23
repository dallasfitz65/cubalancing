import React,{useCallback,useEffect,useState} from 'react';

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

export default function OutputPdfHistory({outputFolder,onConfigure}){
 const [items,setItems]=useState([]),[error,setError]=useState(''),[loading,setLoading]=useState(false);
 const [needsPermission,setNeedsPermission]=useState(false),[preview,setPreview]=useState(null);
 const closePreview=useCallback(()=>{
  setPreview(old=>{if(old?.url)URL.revokeObjectURL(old.url);return null;});
 },[]);
 const refresh=useCallback(async(requestAccess=false)=>{
  closePreview();
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
   setItems(await listOutputPdfs(outputFolder));
  }catch(e){setError('Cannot read output folder: '+e.message);}
  finally{setLoading(false);}
 },[outputFolder,closePreview]);
 useEffect(()=>{
  refresh(false);
  return()=>closePreview();
 },[refresh,closePreview]);
 async function openPdf(item){
  closePreview();setError('');
  try{
   const file=await item.handle.getFile();
   if(!item.name.toLowerCase().endsWith('.pdf'))throw Error('Only PDF files can be viewed.');
   const url=URL.createObjectURL(new Blob([file],{type:'application/pdf'}));
   setPreview({name:item.name,url});
  }catch(e){setError('Could not open PDF: '+e.message);}
 }
 return <section className="folder-settings" aria-label="Balancing History PDF files">
  <h2>Balancing History</h2>
  <p>Showing PDF files only from the selected output folder on this device. Files are opened locally and are not uploaded to ABACUS.</p>
  <p><strong>Output folder:</strong> {outputFolder?.name||'Not selected'}</p>
  <div style={{display:'flex',gap:10,flexWrap:'wrap',marginBottom:14}}>
   <button type="button" onClick={()=>refresh(true)} disabled={loading||!outputFolder}>{loading?'Reading folder…':needsPermission?'Allow folder access':'Refresh PDF list'}</button>
   {!outputFolder&&<button type="button" onClick={onConfigure}>Configure output folder</button>}
  </div>
  {error&&<p role="alert" className="error">{error}</p>}
  {!loading&&!error&&!items.length&&<p>No PDF reports found in the selected output folder.</p>}
  {!!items.length&&<div className="table-scroll"><table><thead><tr><th>PDF REPORT</th><th>MODIFIED</th><th>SIZE</th><th>OPEN</th></tr></thead>
   <tbody>{items.map(item=><tr key={item.name}><td>{item.name}</td><td>{new Date(item.lastModified).toLocaleString()}</td><td>{(item.size/1024).toFixed(1)} KB</td><td><button type="button" onClick={()=>openPdf(item)}>View PDF</button></td></tr>)}</tbody>
  </table></div>}
  {preview&&<div style={{marginTop:18}}>
   <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,marginBottom:10}}><strong>{preview.name}</strong><button type="button" onClick={closePreview}>Close preview</button></div>
   <iframe title={'PDF preview: '+preview.name} src={preview.url} style={{width:'100%',height:'70vh',border:'1px solid #cbd5e1',borderRadius:8}}/>
  </div>}
 </section>;
}
