// Local-only ACH PDF report. This module does not transmit source data.
import {PDFDocument, StandardFonts, rgb} from 'pdf-lib';

const asText=value=>String(value??'').replace(/[^\x20-\x7e]/g,'?');
const dollars=cents=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(cents||0)/100);
export async function buildAchReportPdf({report,creditUnion,coreSystem,generatedAt=new Date()}){
 if(!report||!Array.isArray(report.checks)||!Array.isArray(report.unmatched))throw Error('ACH reconciliation results required.');
 const pdf=await PDFDocument.create();
 const font=await pdf.embedFont(StandardFonts.Helvetica);
 const bold=await pdf.embedFont(StandardFonts.HelveticaBold);
 const W=612,H=792,L=44,R=568;
 let page,y,count=0;
 function newPage(){
  page=pdf.addPage([W,H]);count++;y=H-45;
  page.drawText('ABACUS | ACH RECONCILIATION',{x:L,y,font:bold,size:12,color:rgb(.09,.20,.35)});y-=20;
  page.drawLine({start:{x:L,y},end:{x:R,y},thickness:0.8,color:rgb(.75,.79,.84)});y-=22;
 }
 function line(text,{size=9,isBold=false,indent=0,gap=14}={}){
  if(y<65)newPage();
  page.drawText(asText(text).slice(0,130),{x:L+indent,y,font:isBold?bold:font,size,color:rgb(.12,.15,.19)});
  y-=gap;
 }
 function wrapped(text,opts={}){
  const value=asText(text),limit=opts.limit||96;
  for(let remaining=value;remaining.length;){
   let end=Math.min(limit,remaining.length);
   if(end<remaining.length){const space=remaining.lastIndexOf(' ',end);if(space>limit/2)end=space;}
   line(remaining.slice(0,end),opts);remaining=remaining.slice(end).trimStart();
  }
 }
 function heading(title){y-=7;line(title,{size:11,isBold:true,gap:20});}
 newPage();
 line('Institution: '+(creditUnion||'Unknown'),{isBold:true});
 line('Core selected: '+(coreSystem||'Unspecified')+' (normalized CSV prototype)');
 line('Generated: '+new Date(generatedAt).toISOString());
 line('Result: '+(report.issues===0?'NO PROTOTYPE EXCEPTIONS':'EXCEPTIONS PRESENT'),{isBold:true});
 line('Date/direction controls: '+report.checks.length+' | Reported issues: '+report.issues);
 line('Unmatched transaction groups: '+report.unmatched.length);
 heading('Scope and limitations');
 wrapped('ABACUS-normalized ACH CSV inputs. This is a prototype, NOT validated native XP2 or Fiserv DNA processing. A balanced result does not certify ACH settlement, returns, reversals, timing differences, or account-level GL reconciliation.',{limit:94});
 heading('Source row counts');
 for(const [name,total] of Object.entries(report.totals||{}))line(name+': '+total+' rows');
 heading('Daily debit/credit controls');
 for(const c of report.checks){
  line(c.date+'  '+c.direction+'  '+(c.ok?'BALANCED':'EXCEPTION'),{isBold:true});
  line('Operator '+dollars(c.activity)+' | Core '+dollars(c.posting)+' | Settlement '+dollars(c.settlement));
  line('GL '+dollars(c.gl)+' | Posting variance '+dollars(c.postingVariance));
  line('Settlement variance '+dollars(c.settlementVariance)+' | GL variance '+dollars(c.glVariance),{gap:19});
 }
 heading('Unmatched operator/core transactions');
 if(!report.unmatched.length)line('No unmatched transaction groups.');
 for(const entry of report.unmatched){
  wrapped(entry.source+' | '+entry.key+' | Count: '+entry.count,{limit:87});
 }
 for(let i=0;i<pdf.getPageCount();i++){
  pdf.getPage(i).drawText('Page '+(i+1)+' of '+pdf.getPageCount()+'  |  ABACUS ACH prototype  |  Local report',{x:L,y:30,font,size:8,color:rgb(.45,.48,.52)});
 }
 return pdf.save();
}
export async function saveAchReportToFolder(handle,options){
 if(!handle||handle.kind!=='directory')throw Error('Choose an output folder in Settings.');
 if(typeof handle.queryPermission==='function'){
  const permission=await handle.queryPermission({mode:'readwrite'});
  if(permission!=='granted')throw Error('Output folder write permission needs renewal in Settings.');
 }
 if(typeof handle.getFileHandle!=='function')throw Error('Output folder does not support browser file writing.');
 const bytes=await buildAchReportPdf(options);
 const iso=new Date(options.generatedAt||Date.now()).toISOString().replace(/[:.]/g,'-');
 const filename='ABACUS_ACH_Reconciliation_'+iso+'.pdf';
 const file=await handle.getFileHandle(filename,{create:true});
 const writer=await file.createWritable();
 try{await writer.write(bytes);await writer.close();}
 catch(e){try{await writer.abort();}catch{}throw e;}
 return filename;
}
