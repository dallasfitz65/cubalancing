// ACH balancing prototype. These are ABACUS-normalized CSV contracts, not verified native DNA exports.
// All parsing/reconciliation stays inside the browser.
export const ACH_FILES={
 activity:{title:'ACH operator activity',columns:'date,trace_id,direction,amount'},
 posting:{title:'DNA core posted items',columns:'date,trace_id,direction,amount'},
 settlement:{title:'ACH settlement',columns:'date,direction,amount'},
 gl:{title:'ACH GL movement',columns:'date,direction,amount'}
};
function parseCSV(text){
 const rows=[];let row=[],field='',quoted=false;
 for(let i=0;i<text.length;i++){const c=text[i];
  if(c==='"'){if(quoted&&text[i+1]==='"'){field+='"';i++;}else quoted=!quoted;}
  else if(c===','&&!quoted){row.push(field);field='';}
  else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(field);if(row.some(x=>x.trim()))rows.push(row);row=[];field='';}
  else field+=c;
 }
 if(quoted)throw Error('Unclosed quoted CSV field.');
 row.push(field);if(row.some(x=>x.trim()))rows.push(row);
 return rows;
}
const cents=value=>{
 const raw=String(value??'').trim().replace(/,/g,'');
 if(!/^-?\d+(?:\.\d{1,2})?$/.test(raw))throw Error('Invalid amount: '+String(value).slice(0,35));
 const n=Number(raw);if(!Number.isSafeInteger(Math.round(n*100))||n<0)throw Error('Amount must be a nonnegative number with at most two decimals.');
 return Math.round(n*100);
};
function normalizedDate(v){
 const raw=String(v||'').trim();
 if(!/^\d{4}-\d{2}-\d{2}$/.test(raw)||new Date(raw+'T00:00:00Z').toISOString().slice(0,10)!==raw)throw Error('Date must be YYYY-MM-DD: '+raw);
 return raw;
}
function direction(v){const d=String(v||'').trim().toUpperCase();if(!['DEBIT','CREDIT'].includes(d))throw Error('Direction must be DEBIT or CREDIT.');return d;}
export function parseAchFile(kind,text){
 if(!ACH_FILES[kind])throw Error('Unknown ACH input type.');
 const rows=parseCSV(String(text||'').replace(/^\uFEFF/,''));
 if(rows.length<2)throw Error('Missing CSV data.');
 if(rows.length>100001)throw Error('ACH CSV exceeds 100,000 rows.');
 const header=rows.shift().map(v=>v.trim().toLowerCase());
 const required=ACH_FILES[kind].columns.split(',');
 if(new Set(header).size!==header.length||required.some(k=>!header.includes(k)))throw Error('Required columns: '+ACH_FILES[kind].columns);
 return rows.map((cells,index)=>{
  const get=k=>cells[header.indexOf(k)]??'';
  try{return {date:normalizedDate(get('date')),direction:direction(get('direction')),amount:cents(get('amount')),...(['activity','posting'].includes(kind)?{traceId:String(get('trace_id')).trim()}:{} )};}
  catch(e){throw Error(kind+' row '+(index+2)+': '+e.message);}
 });
}
const key=r=>[r.date,r.traceId,r.direction,r.amount].join('|');
const group=items=>{const m=new Map();for(const r of items){const k=r.date+'|'+r.direction;m.set(k,(m.get(k)||0)+r.amount);}return m;};
export function reconcileACH(inputs){
 const activity=inputs.activity,posting=inputs.posting,settlement=inputs.settlement,gl=inputs.gl;
 if(![activity,posting,settlement,gl].every(Array.isArray))throw Error('Load all four ACH CSV files.');
 if(!activity.length||!posting.length||!settlement.length||!gl.length)throw Error('All four sources require at least one row.');
 const a=new Map(),p=new Map();
 for(const [items,map,source] of [[activity,a,'operator activity'],[posting,p,'core posting']]){
  for(const r of items){
   if(!r.traceId)throw Error(source+': trace_id is required.');
   const k=key(r);map.set(k,(map.get(k)||0)+1);
  }
 }
 const unmatched=[];
 for(const k of new Set([...a.keys(),...p.keys()])){
  const delta=(a.get(k)||0)-(p.get(k)||0);
  if(delta)unmatched.push({key:k,source:delta>0?'Operator only':'Core only',count:Math.abs(delta)});
 }
 const sums={activity:group(activity),posting:group(posting),settlement:group(settlement),gl:group(gl)};
 const dates=[...new Set([activity,posting,settlement,gl].flatMap(items=>items.map(r=>r.date)))].sort();
 const checks=[];
 for(const date of dates)for(const d of ['DEBIT','CREDIT']){
  const k=date+'|'+d;
  const a=sums.activity.get(k)||0,p=sums.posting.get(k)||0,s=sums.settlement.get(k)||0,g=sums.gl.get(k)||0;
  checks.push({date,direction:d,activity:a,posting:p,settlement:s,gl:g,postingVariance:p-a,settlementVariance:s-a,glVariance:g-s,ok:a===p&&a===s&&s===g});
 }
 return {checks,unmatched,issues:checks.filter(r=>!r.ok).length+unmatched.reduce((n,r)=>n+r.count,0),totals:Object.fromEntries(Object.entries(inputs).map(([k,v])=>[k,v.length]))};
}
