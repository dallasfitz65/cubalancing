export const PARSER_VERSION = 'abacus-gl-2/pdfjs-6.4.299';
const accountRE = /\b\d{3}-\d{4}\b/g;
const moneyRE = /(?:\(\s*[-+]?\s*\$?\s*(?:\d{1,3}(?:,\d{3})+|\d+)\.\d{2}\s*\)|[-+]?\s*\$?\s*(?:\d{1,3}(?:,\d{3})+|\d+)\.\d{2}(?:\s*(?:CR|DR)|[+-])?)(?!\d)/gi;
export function moneyToCents(raw) {
 const negative = /\(|^-|-$|CR$/i.test(raw.trim());
 const digits = raw.replace(/[^\d.]/g,'');
 if(!/^\d+\.\d{2}$/.test(digits)) throw new Error('Invalid monetary value.');
 const [whole, cents] = digits.split('.');
 const value = Number(whole)*100+Number(cents);
 if(!Number.isSafeInteger(value)) throw new Error('Balance exceeds supported precision.');
 return negative ? -value : value;
}
// Ending balance is the rightmost monetary column in the supported trial-balance profile.
export function parseGLRows(pages, {requireHeader=true}={}) {
 const records=[]; const seen=new Set(); let headerSeen=false;
 for(const page of pages){
  let pending=null;
  for(const row of page.rows){
   const line=row.text.replace(/\u2212/g,'-').replace(/\u00a0/g,' ');
   if(/End\s*(?:ing\s*)?Balance/i.test(line)) {headerSeen=true;continue;}
   const matches=[...line.matchAll(accountRE)];
   // Cross-references in descriptions are not a new account row.
   const starts=matches.filter(m=>line.slice(0,m.index).trim()==='');
   if(starts.length){
    if(pending)throw new Error(`No ending balance for GL ${pending.account} on page ${page.number}.`);
    const match=starts[0];
    if(seen.has(match[0]))throw new Error(`Duplicate GL ${match[0]} on page ${page.number}; select a consolidated report.`);
    pending={account:match[0],page:page.number,line:line.trim(),tail:line.slice(match.index+match[0].length)};
   } else if(pending) pending.tail+=' '+line;
   if(pending){
    const amounts=[...pending.tail.matchAll(moneyRE)];
    const last=amounts.at(-1);
    const zeroDash=amounts.length>0 && /(?:^|\s)[—–-]\s*$/.test(pending.tail);
    if(last || zeroDash){
     if(!zeroDash && pending.tail.slice(last.index+last[0].length).trim()) throw new Error(`Unreadable ending-balance column for GL ${pending.account} on page ${page.number}.`);
     const raw=zeroDash ? '0.00' : last[0].trim();
     records.push({account:pending.account,page:pending.page,rawBalance:raw,cents:moneyToCents(raw),sourceLine:pending.line});
     seen.add(pending.account);pending=null;
    }
   }
  }
  if(pending)throw new Error(`GL ${pending.account} has no readable ending balance on page ${page.number}.`);
 }
 if(requireHeader&&!headerSeen)throw new Error('Unsupported report: an End Balance / Ending Balance column is required.');
 if(!records.length)throw new Error('No GL account balances found. Expected account numbers such as 901-0010.');
 return {parser:PARSER_VERSION,profile:'Consolidated trial balance; rightmost ending-balance column',pageCount:pages.length,accountCount:records.length,records};
}
export function parseGLText(text){
 if(/\b(?:SVST|TYPE\s+TOTALS|GRAND\s+TOTALS)\b/i.test(text) && !/\b\d{3}-\d{4}\b/.test(text)) throw new Error('This appears to be an SVST share report, not a GL trial balance. Upload it under Shares (SVST), then upload the separate GL Trial Balance PDF/TXT under GL.');
 return parseGLRows([{number:1,rows:text.split(/\r\n|\r|\n/).map(text=>({text}))}],{requireHeader:false});
}
function reconstructRows(items, viewport, pdfjs){
 const lines=[];
 for(const item of items){
  if(!('str' in item)||!item.str.trim())continue;
  const t=pdfjs.Util.transform(viewport.transform,item.transform), x=t[4], y=t[5];
  const h=Math.max(1,Math.hypot(t[2],t[3]));
  let line=lines.find(l=>Math.abs(l.y-y)<=Math.min(2,h*.25));
  if(!line){line={y,parts:[]};lines.push(line);}
  line.parts.push({x,text:item.str});
 }
 return lines.sort((a,b)=>a.y-b.y).map(l=>({text:l.parts.sort((a,b)=>a.x-b.x).map(p=>p.text).join('  ')}));
}
export async function extractGL(file,{onProgress=()=>{},requestPassword=async()=>null,timeoutMs=60000,pdfLibrary:pdfjs}={}){
 if(!file||file.size===0||file.size>10*1024*1024)throw new Error('Select a nonempty file under 10 MB.');
 const bytes=new Uint8Array(await file.arrayBuffer());
 const isPDF=new TextDecoder('latin1').decode(bytes.slice(0,1024)).includes('%PDF-');
 if(!isPDF){
  if(/\.pdf$/i.test(file.name))throw new Error('The selected file does not contain a valid PDF signature.');
  const encoding=bytes[0]===0xff&&bytes[1]===0xfe?'utf-16le':bytes[0]===0xfe&&bytes[1]===0xff?'utf-16be':'utf-8';
  return parseGLText(new TextDecoder(encoding).decode(bytes));
 }
 const task=pdfjs.getDocument({data:bytes,isEvalSupported:false,enableXfa:false,disableFontFace:true,useSystemFonts:true,useWorkerFetch:false,useWasm:false,stopAtErrors:true,maxImageSize:10000000});
 let attempts=0,timer;
 task.onPassword=async(update,reason)=>{
  if(++attempts>3){await task.destroy();return;}
  try{const password=await requestPassword(reason===pdfjs.PasswordResponses.INCORRECT_PASSWORD);if(password===null){await task.destroy();return;}update(password);}catch{await task.destroy();}
 };
 try{
  return await Promise.race([(async()=>{
   const doc=await task.promise;
   if(doc.numPages>200)throw new Error('PDF exceeds the 200-page limit.');
   const pages=[];let chars=0;
   for(let n=1;n<=doc.numPages;n++){
    onProgress(n,doc.numPages);
    const page=await doc.getPage(n);
    const content=await page.getTextContent();
    const rows=reconstructRows(content.items,page.getViewport({scale:1,rotation:0}),pdfjs);
    if(!rows.length)throw new Error(`Page ${n} has no extractable text. Scanned/image-only PDFs require OCR and cannot be reconciled in this build.`);
    chars+=rows.reduce((s,r)=>s+r.text.length,0);
    if(chars>5000000)throw new Error('PDF text exceeds the extraction limit.');
    pages.push({number:n,rows});page.cleanup();
   }
   return parseGLRows(pages);
  })(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('PDF extraction timed out. Try a smaller consolidated report.')),timeoutMs);})]);
 }catch(e){
  if(e?.name==='PasswordException')throw new Error('PDF password is required or incorrect.');
  throw new Error(e?.message||'PDF extraction failed.');
 }finally{clearTimeout(timer);await task.destroy();}
}
