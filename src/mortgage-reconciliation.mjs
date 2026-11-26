export const MORTGAGE_FILES=Object.fromEntries(['balances','activity','remittance','gl'].map(k=>[k,'mortgage_'+k+'.csv']));
const headers={balances:'date,portfolio_id,opening_principal_cents,closing_principal_cents,opening_escrow_cents,closing_escrow_cents',activity:'date,portfolio_id,reference,type,amount_cents',remittance:'date,portfolio_id,principal_cents,interest_cents,fee_cents,net_cash_cents',gl:'date,portfolio_id,principal_cents,escrow_cents,interest_cents,fee_cents,cash_cents'};
const types=['advance','principal_payment','interest_payment','escrow_collection','escrow_disbursement','servicing_fee','chargeoff'];
const safe=n=>{if(!Number.isSafeInteger(n))throw Error('Amount overflow');return n;};
const cents=s=>{if(!/^\d+$/.test(s))throw Error('Expected nonnegative integer cents');return safe(Number(s));};
const identifier=s=>/^[A-Za-z0-9_-]{1,64}$/.test(s);
export function parseMortgageFile(role,text){
 const lines=text.replace(/^\uFEFF/,'').trim().split(/\r?\n/);
 if(!headers[role]||lines.shift()!==headers[role]||(!lines.length&&role!=='activity'))throw Error('Invalid '+role+' CSV; expected '+headers[role]);
 return lines.map((line,i)=>{const a=line.split(',').map(v=>v.trim());if(a.length!==headers[role].split(',').length||!/^\d{4}-\d{2}-\d{2}$/.test(a[0])||!Number.isFinite(Date.parse(a[0]))||new Date(a[0]).toISOString().slice(0,10)!==a[0]||!identifier(a[1]))throw Error('Invalid '+role+' row '+(i+2));
 if(role==='activity'){if(!identifier(a[2])||!types.includes(a[3])||cents(a[4])===0)throw Error('Invalid activity row '+(i+2));return {date:a[0],id:a[1],reference:a[2],type:a[3],amount:cents(a[4])};}return {date:a[0],id:a[1],values:a.slice(2).map(cents)};});
}
export function reconcileMortgages(input){
 if(!Array.isArray(input.activity)||['balances','remittance','gl'].some(k=>!input[k]?.length))throw Error('Four source reports required');
 const all=Object.keys(MORTGAGE_FILES).flatMap(k=>input[k]),date=input.balances[0].date;
 if(all.some(x=>x.date!==date))throw Error('Source business dates do not match');
 const maps={};for(const k of ['balances','remittance','gl']){maps[k]=new Map();for(const x of input[k]){if(maps[k].has(x.id))throw Error('Duplicate '+k+' summary for '+x.id);maps[k].set(x.id,x.values);}}
 const checks=[],rows=[],ids=[...new Set(all.map(x=>x.id))];
 const add=(id,name,expected,actual,unit='cents')=>{safe(expected);safe(actual);const variance=safe(actual-expected);checks.push({id,name:id+' — '+name,expected,actual,variance,unit,ok:variance===0});};
 const activity=new Map();for(const t of input.activity){if(!activity.has(t.id))activity.set(t.id,[]);activity.get(t.id).push(t);}
 for(const id of ids){
 const b=maps.balances.get(id),r=maps.remittance.get(id),g=maps.gl.get(id);if(!b||!r||!g)throw Error('Missing summary report for '+id);
 const sums=Object.fromEntries(types.map(t=>[t,0])),refs=new Set();let duplicates=0;
 for(const t of activity.get(id)||[]){sums[t.type]=safe(sums[t.type]+t.amount);if(refs.has(t.reference))duplicates++;refs.add(t.reference);}
 const principal=safe(safe(safe(b[0]+sums.advance)-sums.principal_payment)-sums.chargeoff);
 const escrow=safe(safe(b[2]+sums.escrow_collection)-sums.escrow_disbursement);
 add(id,'Principal roll-forward',principal,b[1]);add(id,'Escrow roll-forward',escrow,b[3]);
 add(id,'Closing principal vs GL',b[1],g[0]);add(id,'Closing escrow vs GL',b[3],g[1]);
 add(id,'Principal collections vs remittance',sums.principal_payment,r[0]);add(id,'Interest collections vs remittance',sums.interest_payment,r[1]);add(id,'Servicing fees vs remittance',sums.servicing_fee,r[2]);
 add(id,'Net remittance cash proof',safe(safe(r[0]+r[1])-r[2]),r[3]);add(id,'Interest vs GL',r[1],g[2]);add(id,'Fees vs GL',r[2],g[3]);add(id,'Remittance cash vs GL',r[3],g[4]);add(id,'Duplicate activity references',0,duplicates,'count');
 rows.push({id,opening:b[0],closing:b[1],gl:g[0],escrow:b[3],escrowGL:g[1],netCash:r[3]});
 }
 return {date,checks,rows,issues:checks.filter(c=>!c.ok).length,synthetic:true};
}
