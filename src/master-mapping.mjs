import {parseMappingCSV} from './mapping-csv.mjs';
import {parseSVST,parseLNST,parseCOBD} from './engine.mjs';
export function validateMaster(rows){
 const categories={Shares:'shares',Certificates:'certs',Loans:'loans',Cash:'cash'},seen=new Map(),entries=[];
 for(let i=0;i<rows.length;i++){const [gl,description,x,y,category,code]=rows[i].map(c=>c.trim());
  if(!/^\d{3}-\d{4}$/.test(gl)||!description||!categories[category]||!code||x||y)throw Error(`Mapping row ${i+1}: expected GL, description, two blank fields, category and core code.`);
  if(category==='Cash'&&!/^TOTALS FOR BRANCH NBR \d+$/.test(code))throw Error(`Mapping row ${i+1}: invalid cash branch label.`);
  const source=category==='Loans'?'LNST':category==='Cash'?'COBD':'SVST',key=source+'|'+code;
  if(seen.has(key)){if(seen.get(key)!==gl+'|'+category)throw Error(`Conflicting mapping for ${source} ${code}.`);continue;}
  seen.set(key,gl+'|'+category);entries.push({gl,description,category,section:categories[category],code,source});
 }
 if(!entries.length)throw Error('Mapping contains no rows.');
 const glCats=new Map();for(const e of entries){if(glCats.has(e.gl)&&glCats.get(e.gl)!==e.section)throw Error('GL account appears in conflicting categories: '+e.gl);glCats.set(e.gl,e.section);}
 return entries;
}
export const importMaster=text=>validateMaster(parseMappingCSV(text,6));
export function parseCoreCodes(text,kind){
 const numeric=kind==='shares'?parseSVST(text):parseLNST(text);
 return Object.fromEntries(Object.entries(numeric).map(([type,value])=>[String(type),Math.round(value*100)]));
}
export function normalizeSVSTAccountTypes(entries,text){
 const typeForCode=new Map(),seen=new Set();
 for(const line of text.replaceAll('\r','').split('\n')){
  if(line.includes('GRAND TOTALS'))break;
  const m=line.match(/^\s+(\d+)\s+([A-Za-z0-9]+)\s+(?:CLOSED|[\d.]+)/);
  if(m){const type=String(Number(m[1]));if(typeForCode.has(m[2])&&typeForCode.get(m[2])!==type)throw Error('Ambiguous SVST input-code translation: '+m[2]);typeForCode.set(m[2],type);seen.add(type);}
 }
 return entries.map(entry=>{
  if(entry.source!=='SVST'||/^\d+$/.test(entry.code))return entry;
  const type=typeForCode.get(entry.code);
  if(!type)throw Error('Existing SVST mapping '+entry.code+' has no account type in this report. Update the credit union account-type mapping.');
  return {...entry,code:type};
 });
}
const currency=c=>c==null?'—':(c/100).toLocaleString('en-US',{style:'currency',currency:'USD'});
export function buildMappedSections(entries,gl,shares,loans,cash,scope='overview'){
 const applicable=entries.filter(e=>scope==='cash'?e.section==='cash':true);
 const sources={SVST:shares,LNST:loans,COBD:Object.fromEntries(cash.branches.map(b=>['TOTALS FOR BRANCH NBR '+Number(b.num),Math.round(b.total*100)]))};
 // Unmapped source types are reported by the caller; calculate mapped GL groups only.

 const groups=new Map();for(const e of applicable){const key=e.section+'|'+e.gl;if(!groups.has(key))groups.set(key,{...e,codes:[]});groups.get(key).codes.push(e.code);}
 const rows=[...groups.values()].map(g=>{const source=sources[g.source],missing=g.codes.filter(c=>!Object.hasOwn(source,c)),src=missing.length?null:g.codes.reduce((n,c)=>n+source[c],0),tb=Object.hasOwn(gl,g.gl)?Math.round(gl[g.gl]*100):null,difference=src==null||tb==null?null:src-tb;return {...g,desc:g.description,svst:currency(src),tb:currency(tb),var:difference==null?'MISSING DATA':currency(difference),varRaw:difference==null?null:difference/100,ok:difference===0,missingCodes:missing,codeData:g.codes.map(code=>({code,amt:source[code]==null?null:source[code]/100})),srcLabel:g.source};});
 return [['shares','Share Accounts'],['certs','Certificates'],['loans','Loans'],['cash','Cash on Hand']].map(([id,label])=>({id,label,rows:rows.filter(r=>r.section===id)})).filter(s=>s.rows.length);
}
