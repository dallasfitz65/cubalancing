// Purchased participation demonstration: principal and cash allocation, all amounts in integer cents.
export const PARTICIPATION_FILES={balances:'participation_balances.csv',activity:'participation_activity.csv',remittance:'participation_remittance.csv',gl:'participation_gl.csv'};
const headers={balances:'date,participation_id,opening_principal_cents,closing_principal_cents',activity:'date,participation_id,reference,type,amount_cents',remittance:'date,participation_id,principal_cents,interest_cents,fee_cents,net_cash_cents',gl:'date,participation_id,principal_cents,interest_cents,fee_cents,cash_cents'};
const types=['funding','principal_payment','interest_payment','servicing_fee','chargeoff'];
const number=s=>{if(!/^\d+$/.test(s)||!Number.isSafeInteger(Number(s)))throw Error('Invalid nonnegative integer cents');return Number(s);};
const id=s=>/^[A-Za-z0-9_-]{1,64}$/.test(s);
export function parseParticipationFile(role,text){
 const lines=text.replace(/^\uFEFF/,'').trim().split(/\r?\n/);if(lines.shift()!==headers[role]||!lines.length)throw Error('Invalid or empty '+role+' CSV; expected '+headers[role]);
 return lines.map((line,i)=>{const a=line.split(',').map(x=>x.trim());if(a.length!==headers[role].split(',').length||!/^\d{4}-\d{2}-\d{2}$/.test(a[0])||!Number.isFinite(Date.parse(a[0]))||new Date(a[0]).toISOString().slice(0,10)!==a[0]||!id(a[1]))throw Error('Invalid '+role+' row '+(i+2));if(role==='activity'){if(!id(a[2])||!types.includes(a[3])||number(a[4])===0)throw Error('Invalid activity row '+(i+2));return {date:a[0],id:a[1],reference:a[2],type:a[3],amount:number(a[4])};}return {date:a[0],id:a[1],values:a.slice(2).map(number)};});
}
export function reconcileParticipations(input){
 const all=Object.keys(PARTICIPATION_FILES).flatMap(k=>input[k]||[]);if(!all.length||Object.keys(PARTICIPATION_FILES).some(k=>!input[k]?.length))throw Error('All four nonempty source reports are required');
 const date=all[0].date;if(all.some(x=>x.date!==date))throw Error('Source business dates do not match');
 const maps={};for(const k of ['balances','remittance','gl']){maps[k]=new Map();for(const x of input[k]){if(maps[k].has(x.id))throw Error('Duplicate '+k+' summary for '+x.id);maps[k].set(x.id,x.values);}}
 const ids=[...new Set(all.map(x=>x.id))];const checks=[],rows=[];
 const add=(id,name,expected,actual,unit='cents')=>{const variance=actual-expected;if(![expected,actual,variance].every(Number.isSafeInteger))throw Error('Amount overflow');checks.push({id,name:id+' — '+name,expected,actual,variance,unit,ok:variance===0});};
 for(const id of ids){const b=maps.balances.get(id),r=maps.remittance.get(id),g=maps.gl.get(id);if(!b||!r||!g)throw Error('Missing summary report for '+id);
 const tx=input.activity.filter(x=>x.id===id),sum=Object.fromEntries(types.map(t=>[t,0])),refs=new Set();let duplicates=0;for(const t of tx){sum[t.type]+=t.amount;if(!Number.isSafeInteger(sum[t.type]))throw Error('Amount overflow');if(refs.has(t.reference))duplicates++;refs.add(t.reference);}
 const ending=b[0]+sum.funding-sum.principal_payment-sum.chargeoff;
 add(id,'Principal roll-forward',ending,b[1]);add(id,'Ending principal vs GL',b[1],g[0]);add(id,'Principal collections vs remittance',sum.principal_payment,r[0]);add(id,'Interest collections vs remittance',sum.interest_payment,r[1]);add(id,'Servicing fees vs remittance',sum.servicing_fee,r[2]);add(id,'Net remittance cash proof',r[0]+r[1]-r[2],r[3]);add(id,'Interest vs GL',r[1],g[1]);add(id,'Servicing fees vs GL',r[2],g[2]);add(id,'Remittance cash vs GL',r[3],g[3]);add(id,'Duplicate activity references',0,duplicates,'count');rows.push({id,opening:b[0],closing:b[1],gl:g[0],netCash:r[3]});}
 return {date,checks,rows,issues:checks.filter(c=>!c.ok).length,synthetic:true};
}
