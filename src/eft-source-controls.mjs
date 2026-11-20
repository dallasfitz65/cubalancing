const cents=value=>Math.round(Number(value.replaceAll(',',''))*100);
const amountPair=(text,pattern)=>{
 const match=text.match(pattern);
 return match?[cents(match[1]),cents(match[2])]:null;
};
export function checkEFTSourceControls(reports){
 const byRole=Object.fromEntries(reports.map(r=>[r.role,r]));
 const day=byRole.eftday?.text||'',star=byRole.eftstar?.text||'',teller=byRole.eftteller?.text||'';
 const core=day.match(/Credits:\s*\d+\s+([\d,.]+)\s+Debits:\s*\d+\s+([\d,.]+)/i);
 const tellerValues=teller.match(/paid\s+out\s+([\d,.]+)\s+received\s+([\d,.]+)/i);
 const posting=amountPair(star,/POSTING TO CUSTOMER ACCOUNT\s+([\d,.]+)\s+([\d,.]+)/i);
 const totals=amountPair(star,/TOTALS:\s+([\d,.]+)\s+([\d,.]+)/i);
 const checks=[];
 function push(label,left,right){
  if(!Number.isSafeInteger(left)||!Number.isSafeInteger(right)){checks.push({label,status:'unverified',left:null,right:null,variance:null});return;}
  const variance=left-right;
  checks.push({label,status:variance===0?'matched':'exception',left,right,variance});
 }
 const credit=core?cents(core[1]):null,debit=core?cents(core[2]):null;
 push('Core debits vs STAR customer debit',debit,posting?.[0]);
 push('Core credits vs STAR customer credit',credit,posting?.[1]);
 push('Core debits vs teller paid out',debit,tellerValues?cents(tellerValues[1]):null);
 push('Core credits vs teller received',credit,tellerValues?cents(tellerValues[2]):null);
 push('STAR settlement debits vs credits',totals?.[0],totals?.[1]);
 return checks;
}
