import React,{useRef} from 'react';

// Accessible, self-contained help dialog for individual Settings sections.
export default function SectionHelp({title,children}){
 const ref=useRef(null);
 return <>
  <button type="button" className="section-help-trigger" aria-label={'Help: '+title}
   title={'Help: '+title} onClick={()=>ref.current?.showModal()}>?</button>
  <dialog ref={ref} className="section-help-dialog" aria-label={title+' help'}
   onClick={e=>{if(e.target===ref.current)ref.current?.close();}}>
   <div className="dialog-head"><h2>{title} — Help</h2><button type="button" aria-label="Close help" onClick={()=>ref.current?.close()}>✕</button></div>
   <div className="section-help-body">{children}</div>
   <div style={{display:'flex',justifyContent:'flex-end',marginTop:16}}><button type="button" onClick={()=>ref.current?.close()}>Close</button></div>
  </dialog>
 </>;
}
