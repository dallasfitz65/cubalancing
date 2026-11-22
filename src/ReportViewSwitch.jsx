import React from 'react';
// Shared display-only view control; never changes reconciliation calculations.
export default function ReportViewSwitch({value,onChange,label='Reconciliation report view'}){
 return <div className="html-switch module-report-switch" role="group" aria-label={label}>
  <button type="button" className={value==='summary'?'selected':''} aria-pressed={value==='summary'} onClick={()=>onChange('summary')}>Summary</button>
  <button type="button" className={value==='detail'?'selected':''} aria-pressed={value==='detail'} onClick={()=>onChange('detail')}>Detail</button>
 </div>;
}
