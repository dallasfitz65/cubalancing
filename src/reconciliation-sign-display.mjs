import {normalizeGL,GL_SIGN_CONVENTIONS} from './gl-sign-convention.mjs';

// Recalculate the visible result from the original GL source records. Never edit
// historical run metadata; a changed display is provisional until rerun.
const signedCents=text=>{
 if(typeof text!=='string')return null;
 const value=text.replace(/[$,\s]/g,'').trim();
 if(!/^-?\d+\.\d{2}$/.test(value))return null;
 const [whole,decimals]=value.split('.');
 const amount=Number(whole)*100+(whole.startsWith('-')?-1:1)*Number(decimals);
 return Number.isSafeInteger(amount)?amount:null;
};
const money=c=>c==null?'MISSING DATA':(c/100).toLocaleString('en-US',{style:'currency',currency:'USD'});
export function displayRunForSign(run,selected){
 if(!run||!Object.hasOwn(GL_SIGN_CONVENTIONS,selected)||run.mode!=='real'||!run.meta?.records?.length)return run;
 if(run.meta.signConvention===selected)return run;
 const gl=normalizeGL({records:run.meta.records},selected);
 const sections=run.sections.map(section=>({...section,rows:section.rows.map(row=>{
  if(!row.executed||row.branchOnly||row.varRaw===null||!Object.hasOwn(gl,row.gl))return row;
  const core=signedCents(row.svst);
  if(core===null)return row;
  const trial=Math.round(gl[row.gl]*100),difference=core-trial;
  return {...row,tb:money(trial),var:money(difference),varRaw:difference/100,ok:difference===0};
 })}));
 const rows=sections.flatMap(s=>s.rows).filter(r=>r.executed&&!r.branchOnly);
 return {...run,sections,issues:rows.filter(r=>!r.ok).length,displaySignConvention:selected,signPreview:true};
}
