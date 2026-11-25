// Normalized single-day credit card control model. All amounts are integer cents.
export const CARD_FILES={balances:'card_balances.csv',transactions:'card_transactions.csv',settlement:'card_settlement.csv',gl:'card_gl.csv'};
const headers={balances:'date,opening_cents,closing_cents',transactions:'date,reference,type,amount_cents',settlement:'date,expected_cents,actual_cents',gl:'date,receivable_cents,settlement_cents'};
const signs={purchase:1,cash_advance:1,interest:1,fee:1,payment:-1,refund:-1,chargeoff:-1};
const cents=s=>{if(!/^-?\d+$/.test(s)||!Number.isSafeInteger(Number(s)))throw Error('Invalid integer cents: '+s);return Number(s);};
export function parseCardFile(role,text){
 const rows=text.replace(/^\uFEFF/,'').trim().split(/\r?\n/).map(x=>x.trim());
 if(rows.shift()!==headers[role]||!rows.length)throw Error('Invalid or empty '+role+' CSV; expected '+headers[role]);
 const result=rows.map((line,i)=>{const a=line.split(',').map(x=>x.trim());if(a.length!==headers[role].split(',').length||!/^\d{4}-\d{2}-\d{2}$/.test(a[0])||!Number.isFinite(Date.parse(a[0]))||new Date(a[0]).toISOString().slice(0,10)!==a[0])throw Error('Invalid '+role+' row '+(i+2));
 if(role==='transactions'){if(!/^[a-zA-Z0-9_-]{1,64}$/.test(a[1])||!Object.hasOwn(signs,a[2])||cents(a[3])<=0)throw Error('Invalid transaction row '+(i+2));return {date:a[0],reference:a[1],type:a[2],amount:cents(a[3])};}
 return {date:a[0],first:cents(a[1]),second:cents(a[2])};});
 if(role!=='transactions'&&result.length!==1)throw Error(role+' requires one daily summary row');
 return result;
}
export function reconcileCards(input){
 const b=input.balances[0],g=input.gl[0],s=input.settlement[0],tx=input.transactions;
 if(!b||!g||!s||!tx.length)throw Error('All four source files are required');
 const date=b.date;
 if([g,s,...tx].some(x=>x.date!==date))throw Error('Source business dates do not match');
 let movement=0;const seen=new Set(),duplicates=[];
 for(const t of tx){movement+=signs[t.type]*t.amount;if(!Number.isSafeInteger(movement))throw Error('Amount overflow');if(seen.has(t.reference))duplicates.push(t.reference);seen.add(t.reference);}
 const check=(name,expected,actual)=>{const variance=actual-expected;if(![expected,actual,variance].every(Number.isSafeInteger))throw Error('Amount overflow');return {name,expected,actual,variance,ok:variance===0};};
 const checks=[check('Receivables roll-forward',b.first+movement,b.second),check('Processor receivables vs GL',b.second,g.first),check('Expected vs actual settlement',s.first,s.second),check('Actual settlement vs GL',s.second,g.second),{name:'Duplicate transaction references',expected:0,actual:duplicates.length,variance:duplicates.length,unit:'count',ok:duplicates.length===0}];
 return {date,checks,issues:checks.filter(c=>!c.ok).length,duplicates,transactionCount:tx.length,opening:b.first,closing:b.second,gl:g.first,movement,synthetic:false};
}
export const CARD_DEMO={balances:'date,opening_cents,closing_cents\n2026-11-24,1000000,1080000',transactions:'date,reference,type,amount_cents\n2026-11-24,T001,purchase,120000\n2026-11-24,T002,payment,50000\n2026-11-24,T003,interest,10000',settlement:'date,expected_cents,actual_cents\n2026-11-24,70000,70000',gl:'date,receivable_cents,settlement_cents\n2026-11-24,1080000,70000'};
export function cardDemo(fail=false){const input=Object.fromEntries(Object.entries(CARD_DEMO).map(([k,v])=>[k,parseCardFile(k,fail&&k==='gl'?v.replace('1080000','1077500'):v)]));return {...reconcileCards(input),synthetic:true};}
