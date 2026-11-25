// Single local PDF covering every ABACUS reconciliation module; no network upload.
import {PDFDocument,StandardFonts,rgb} from 'pdf-lib';

const clean=v=>String(v??'').replace(/[^\x20-\x7e]/g,'?');
const dollars=v=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(v||0)/100);
const roles={
 gl:['gl'],shares:['svst'],loans:['lnst'],cash:['cobd'],
 drafts:['sdps','sdre','sdrt'],eft:['eftday','eftstar','eftatm','eftrejects','eftteller','eftgl'],
 atm:['atm_transactions','atm_cash','atm_settlement','atm_gl'],
 ach:['ach_activity','ach_posting','ach_settlement','ach_gl'],cards:['card_balances','card_transactions','card_settlement','card_gl']
};
export const expectedModules=files=>({
 gl:Boolean(files.gl&&(files.svst||files.lnst||files.cobd)),
 drafts:roles.drafts.every(k=>Boolean(files[k])),
 eft:roles.eft.every(k=>Boolean(files[k])),
 atm:roles.atm.every(k=>Boolean(files[k])),
 ach:roles.ach.every(k=>Boolean(files[k])),cards:roles.cards.every(k=>Boolean(files[k]))
});
export function isConsolidatedReady({files={},result,draftResult,eftResult,atmResult,achResult,cardResult}){
 const expected=expectedModules(files);
 return Object.values(expected).some(Boolean)&&
 (!expected.gl||!!result)&&(!expected.drafts||!!draftResult)&&(!expected.eft||!!eftResult)&&
 (!expected.atm||!!atmResult)&&(!expected.ach||!!achResult)&&(!expected.cards||!!cardResult&&!cardResult.synthetic);
}
export async function buildConsolidatedPdf({
 creditUnion,coreSystem,files={},result,draftResult,eftResult,atmResult,achResult,cardResult,
 generatedAt=new Date()
}){
 const pdf=await PDFDocument.create(),regular=await pdf.embedFont(StandardFonts.Helvetica),bold=await pdf.embedFont(StandardFonts.HelveticaBold);
 const W=612,H=792,L=40,R=572;
 let page,y;
 const openPage=()=>{
  page=pdf.addPage([W,H]);y=H-38;
  page.drawText('ABACUS | CONSOLIDATED RECONCILIATION',{x:L,y,font:bold,size:12,color:rgb(.08,.22,.38)});
  y-=22;page.drawLine({start:{x:L,y},end:{x:R,y},thickness:1,color:rgb(.7,.75,.8)});y-=24;
 };
 const write=(text,{size=9,heavy=false,indent=0,gap=14}={})=>{
  const font=heavy?bold:regular,available=R-L-indent;
  for(let remainder=clean(text);remainder.length;){
   if(y<64)openPage();
   let end=remainder.length;
   while(end>1&&font.widthOfTextAtSize(remainder.slice(0,end),size)>available)end--;
   if(end<remainder.length){const split=remainder.lastIndexOf(' ',end);if(split>Math.floor(end/2))end=split;}
   page.drawText(remainder.slice(0,end),{x:L+indent,y,size,font,color:rgb(.14,.18,.23)});
   y-=gap;remainder=remainder.slice(end).trimStart();
  }
  if(!clean(text).length)y-=gap;
 };
 const section=title=>{if(y<120)openPage();y-=9;write(title,{size:11,heavy:true,gap:19});};
 const status=(name,keys,hasResult,explanation='')=>{
  if(hasResult)return true;
  const missing=keys.filter(k=>!files[k]);
  write('NOT RUN / INCOMPLETE: '+(missing.length?'missing '+missing.join(', '):explanation||'no completed result'),{indent:10});
  return false;
 };
 openPage();
 write('Credit union: '+(creditUnion||'Unknown'),{heavy:true});
 write('Core selected: '+(coreSystem||'Unspecified'));
 write('Generated: '+new Date(generatedAt).toISOString());
 write('Report includes completed sections only. Missing/incomplete sections are NOT balanced.');
 write('Source file contents and this PDF are processed locally. No central evidence archive.');
 section('EXECUTIVE SECTION STATUS');
 const glSections=result?.sections||[];
 const shares=glSections.filter(s=>['shares','certs'].includes(s.id));
 const loans=glSections.filter(s=>s.id==='loans');
 const cash=glSections.filter(s=>s.id==='cash');
 const definitions=[
  ['Shares and Certificates',shares,files.svst&&files.gl],['Loans',loans,files.lnst&&files.gl],
  ['Cash',cash,files.cobd&&files.gl]
 ];
 for(const [name,items,available] of definitions){
  const rows=items.flatMap(s=>s.rows||[]).filter(r=>r.executed&&!r.branchOnly);
  write(name+': '+(!available?'NOT RUN - source file missing':!rows.length?'INCOMPLETE - no computed rows':rows.some(r=>!r.ok)?'EXCEPTIONS':'BALANCED')+' ('+rows.length+' checks)');
 }
 const draftChecks=draftResult?.checks||[];
 write('Share Drafts: '+(!draftResult?'NOT RUN / INCOMPLETE':draftChecks.some(c=>c.ok===false)?'EXCEPTIONS':'PROTOTYPE COMPLETE'));
 write('EFT: '+(!eftResult?'NOT RUN / INCOMPLETE':eftResult.issues?.length||eftResult.controls?.some(c=>c.ok===false)?'EXCEPTIONS':'PROTOTYPE COMPLETE'));
 write('ATM: '+(!atmResult?'NOT RUN / INCOMPLETE':atmResult.checks?.some(c=>c.ok===false)?'EXCEPTIONS':'PROTOTYPE COMPLETE'));
 write('ACH: '+(!achResult?'NOT RUN / INCOMPLETE':achResult.issues?'EXCEPTIONS':'PROTOTYPE COMPLETE'));
 for(const [title,items,required] of [
  ['SHARES AND CERTIFICATES',shares,roles.shares],['LOANS',loans,roles.loans],['CASH',cash,roles.cash]
 ]){
  section(title);
  if(!status(title,[...roles.gl,...required],!!items.length,'no matching computed section'))continue;
  for(const item of items){
   write(item.label||item.id,{heavy:true});
   const rows=(item.rows||[]).filter(r=>r.executed&&!r.branchOnly);
   for(const r of rows)write((r.ok?'OK':'EXCEPTION')+' | GL '+r.gl+' | '+r.desc+' | Core '+String(r.svst??'N/A')+' | GL '+String(r.tb??'N/A')+' | Variance '+String(r.var??r.varRaw??'N/A'),{indent:9});
  }
 }
 section('SHARE DRAFTS');
 if(status('Share Drafts',roles.drafts,!!draftResult)){
  for(const [k,v] of Object.entries(draftResult.summary||{}))write(k+': '+dollars(v),{indent:9});
  for(const c of draftChecks)write((c.ok===false?'EXCEPTION':'CHECK')+' | '+clean(c.name??c.description??JSON.stringify(c)),{indent:9});
  write('Share Draft GL postings have not been independently verified.');
 }
 section('EFT');
 if(status('EFT',roles.eft,!!eftResult)){
  for(const [label,amount] of eftResult.rows||[])write(label+': '+dollars(amount),{indent:9});
  for(const entry of eftResult.issues||[])write('ISSUE: '+entry,{indent:9});
  for(const c of eftResult.controls||[])write((c.ok===false?'EXCEPTION':'CHECK')+' | '+clean(c.name??c.label??JSON.stringify(c)),{indent:9});
 }
 section('ATM');
 if(status('ATM',roles.atm,!!atmResult)){
  write('Terminal: '+(atmResult.terminal||'N/A')+' | Business date: '+(atmResult.date||'N/A'));
  for(const c of atmResult.checks||[])write((c.ok?'OK':'EXCEPTION')+' | '+c.name+' | Expected '+dollars(c.source)+' | Actual '+dollars(c.actual)+' | Variance '+dollars(c.variance),{indent:9});
  write('ATM controls use a limited demo transaction model.');
 }
 section('ACH');
 if(status('ACH',roles.ach,!!achResult)){
  write('Normalized CSV prototype - not validated native XP2 or DNA exports.');
  write('Reported ACH issues: '+achResult.issues+' | Unmatched groups: '+achResult.unmatched?.length);
  for(const c of achResult.checks||[]){
   write((c.ok?'OK':'EXCEPTION')+' | '+c.date+' '+c.direction+' | Activity '+dollars(c.activity)+' | Core '+dollars(c.posting)+' | Settlement '+dollars(c.settlement)+' | GL '+dollars(c.gl),{indent:9});
   write('Posting variance '+dollars(c.postingVariance)+' | Settlement variance '+dollars(c.settlementVariance)+' | GL variance '+dollars(c.glVariance),{indent:9});
  }
  for(const e of achResult.unmatched||[])write('UNMATCHED: '+e.source+' | '+e.key+' | Count '+e.count,{indent:9});
 }
 section('CREDIT CARD BALANCING');
 if(status('Credit Cards',roles.cards,!!cardResult&&!cardResult.synthetic)){write('Business date: '+cardResult.date+' | '+(cardResult.issues?'FAIL':'PASS'));for(const c of cardResult.checks)write((c.ok?'PASS':'FAIL')+' | '+c.name+' | Expected '+(c.unit==='count'?c.expected:dollars(c.expected))+' | Actual '+(c.unit==='count'?c.actual:dollars(c.actual))+' | Variance '+(c.unit==='count'?c.variance:dollars(c.variance)),{indent:9});write('Normalized controls only; native processor and bank settlement verification pending.');}
 section('CONTROL LIMITATIONS');
 write('No blank or unprocessed section may be interpreted as balanced. ACH and other prototype checks require institution-specific source validation before certification.');
 for(let i=0;i<pdf.getPageCount();i++)pdf.getPage(i).drawText('ABACUS Local Reconciliation | Page '+(i+1)+' of '+pdf.getPageCount(),{x:L,y:30,font:regular,size:8,color:rgb(.43,.47,.5)});
 return pdf.save();
}
export async function saveConsolidatedPdf(handle,data){
 if(!handle||handle.kind!=='directory')throw Error('Configure an output folder under Settings.');
 if(typeof handle.queryPermission==='function'&&await handle.queryPermission({mode:'readwrite'})!=='granted')throw Error('Output folder write permission must be renewed under Settings.');
 if(typeof handle.getFileHandle!=='function')throw Error('Browser does not support direct output-folder writing.');
 const bytes=await buildConsolidatedPdf(data);
 const stamp=new Date(data.generatedAt||new Date()).toISOString().replace(/[:.]/g,'-');
 const name='ABACUS_Consolidated_Reconciliation_'+stamp+'.pdf';
 const file=await handle.getFileHandle(name,{create:true}),writer=await file.createWritable();
 try{await writer.write(bytes);await writer.close();}catch(e){try{await writer.abort();}catch{}throw e;}
 return name;
}
