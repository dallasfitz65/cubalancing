import React,{useState,useEffect,useRef} from 'react';
import {answerAtmQuestion} from './atm-assistant.mjs';

const SOURCES=[
  {key:'transactions',name:'ATM transaction journal',file:'atm-transactions.csv'},
  {key:'cash',name:'Cash count / replenishment',file:'atm-cash-count.csv'},
  {key:'settlement',name:'Network settlement',file:'atm-settlement.csv'},
  {key:'gl',name:'ATM GL balances',file:'atm-gl.csv'}
];
const money=cents=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(cents/100);
function parseCSV(text){
  const lines=text.replace(/^\uFEFF/,'').trim().split(/\r?\n/).filter(Boolean);
  if(lines.length<2)throw Error('CSV file has no data rows.');
  const read=line=>{const result=[];let value='',quoted=false;for(let i=0;i<line.length;i++){const c=line[i];if(c==='"'&&quoted&&line[i+1]==='"'){value+='"';i++;}else if(c==='"'){quoted=!quoted;}else if(c===','&&!quoted){result.push(value.trim());value='';}else value+=c;}result.push(value.trim());return result;};
  const headers=read(lines[0]);
  if(new Set(headers).size!==headers.length)throw Error('Duplicate CSV column names.');
  return lines.slice(1).map((line,index)=>{const cells=read(line);if(cells.length!==headers.length)throw Error('CSV row '+(index+2)+' has an incorrect column count.');return Object.fromEntries(headers.map((k,i)=>[k,cells[i]]));});
}
function amount(row,key){
  const value=row[key];
  if(value===undefined||!/^-?\d+(?:\.\d{1,2})?$/.test(value))throw Error('Invalid amount in '+key+': '+String(value));
  return Math.round(Number(value)*100);
}
function evaluate(source){
  const tx=source.transactions, cash=source.cash, settlement=source.settlement, gl=source.gl;
  const all=[...tx,...cash,...settlement,...gl];
  const dates=new Set(all.map(x=>x.business_date)),terminals=new Set(all.map(x=>x.terminal_id));
  if(all.some(x=>!x.business_date||!x.terminal_id)||dates.size!==1||terminals.size!==1)throw Error('All rows must use one identical business date and ATM terminal ID.');
  if(cash.length!==1||settlement.length!==1)throw Error('Cash count and settlement files must contain exactly one row per ATM and business date.');
  const seen=new Set();for(const row of tx){if(!row.trace_id||seen.has(row.trace_id))throw Error('Transaction trace IDs must be unique and nonempty.');seen.add(row.trace_id);if(!['APPROVED','REVERSED','DECLINED'].includes(row.status))throw Error('Unknown transaction status: '+row.status);if(row.type!=='WITHDRAWAL')throw Error('Demo supports withdrawal transactions only.');}
  const approved=tx.filter(t=>t.status==='APPROVED');
  const dispensed=approved.reduce((n,t)=>n+amount(t,'cash_dispensed'),0);
  for(const item of tx.filter(t=>t.status!=='APPROVED'))if(amount(item,'cash_dispensed')!==0)throw Error('Reversed/declined transactions have nonzero cash dispensed. Requires investigation.');
  const c=cash[0],beginning=amount(c,'beginning_cash'),loaded=amount(c,'cash_loaded'),removed=amount(c,'cash_removed'),counted=amount(c,'physical_cash_count');
  const expected=beginning+loaded-removed-dispensed,settled=amount(settlement[0],'net_settlement');
  const getGL=account=>{const rows=gl.filter(x=>x.account===account);if(rows.length!==1)throw Error('GL must contain exactly one '+account+' row.');return amount(rows[0],'ending_balance');};
  const glCash=getGL('ATM_CASH'),glClearing=getGL('ATM_CLEARING');
  const checks=[
    {name:'Physical cash vs expected cash',source:expected,actual:counted},
    {name:'ATM cash GL vs expected cash',source:expected,actual:glCash},
    {name:'Settlement vs journal withdrawals',source:dispensed,actual:settled},
    {name:'GL clearing vs network settlement',source:settled,actual:glClearing}
  ].map(x=>({...x,variance:x.actual-x.source,ok:x.actual===x.source}));
  return {date:[...dates][0],terminal:[...terminals][0],tx,approvedCount:approved.length,dispensed,beginning,loaded,removed,expected,counted,settled,glCash,glClearing,checks};
}
const BASE='/demo/atm/';
async function demoFiles(exception=false){
  const entries=await Promise.all(SOURCES.map(async source=>{
    const filename=exception&&source.key==='gl'?'atm-gl-exception.csv':source.file;
    const response=await fetch(BASE+filename,{cache:'no-store'});
    if(!response.ok)throw Error('Could not load demo file '+filename);
    const csv=await response.text();
    return [source.key,new File([csv],filename,{type:'text/csv'})];
  }));
  return Object.fromEntries(entries);
}
export default function ATM({files={},setFiles,onReview,aiEnabled=false,autoRun=false,initialReport=null}){
  const [report,setReport]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[detail,setDetail]=useState(false);
  const [question,setQuestion]=useState(''),[chat,setChat]=useState([]),[chatOpen,setChatOpen]=useState(false);
  const [demoStatus,setDemoStatus]=useState('');
  const ready=SOURCES.every(source=>Boolean(files['atm_'+source.key]));
  function invalidateReport(){
    setReport(null);setDetail(false);setChat([]);onReview?.(null);
  }
  async function loadDemo(exception=false){
    setBusy(true);setError('');setDemoStatus('');
    try{
      const chosen=await demoFiles(exception);
      invalidateReport();
      setFiles(current=>({...current,...Object.fromEntries(SOURCES.map(source=>['atm_'+source.key,chosen[source.key]]))}));
      setDemoStatus(exception?'Running the $50 exception test scenario automatically.':'Running the balanced test scenario automatically.');
    }catch(e){setError(e.message);}finally{setBusy(false);}
  }
  async function run(){
    setError('');setBusy(true);setDemoStatus('');
    try{
      const missing=SOURCES.filter(source=>!files['atm_'+source.key]).map(source=>source.name);
      if(missing.length)throw Error('Missing sources: '+missing.join(', '));
      const data=Object.fromEntries(await Promise.all(SOURCES.map(async source=>{
        const file=files['atm_'+source.key];
        if(file.size>10*1024*1024)throw Error(source.name+' exceeds the 10 MB file limit.');
        return [source.key,parseCSV(await file.text())];
      })));
      const result=evaluate(data);setReport(result);onReview?.(result);
    }catch(e){invalidateReport();setError(e.message);}finally{setBusy(false);}
  }
  const lastAutoFiles=useRef(null);
  useEffect(()=>{if(initialReport)setReport(initialReport);},[initialReport]);
  useEffect(()=>{
    if(!autoRun||!ready||initialReport)return;
    const selected=SOURCES.map(source=>files['atm_'+source.key]);
    if(lastAutoFiles.current?.every((file,i)=>file===selected[i]))return;
    lastAutoFiles.current=selected;
    run();
  },[autoRun,initialReport,files,ready]);
  const exceptions=report?.checks.filter(c=>!c.ok).length||0;
  function ask(text){const q=String(text||'').trim();if(!q)return;setChat(prev=>[...prev,{question:q,answer:answerAtmQuestion(q,report)}]);setQuestion('');}
  return <section className="folder-settings atm-workspace">
    <p><strong>Demonstration only.</strong> The included test data is fictional. Real processor integration, multi-terminal balancing and production accounting controls require additional validation.</p>
    <section className="atm-source-setup" aria-label="ATM test files and source checks">
      <div className="atm-source-setup-head"><h3>ATM Source Checks</h3><p>Load a test scenario or import ATM source files through Settings → Folder Configuration. Reconciliation checks start automatically when all four sources are available.</p></div>
      <div className="atm-actions">
        <button type="button" disabled={busy} onClick={()=>loadDemo(false)}>Load balanced test files</button>
        <button type="button" disabled={busy} onClick={()=>loadDemo(true)}>Load exception test files ($50)</button>
        <button type="button" disabled={!report||busy} onClick={()=>window.print()}>Print / PDF</button>
      </div>
      {demoStatus&&<p className="atm-test-status" role="status">{demoStatus}</p>}
      <p className="atm-source-readiness" role="status">{ready?'4 of 4 ATM sources ready for validation.':'Import all four required ATM files from Folder Configuration, or load a test scenario to calculate automatically.'} Filename selection does not verify amounts, dates or GL reconciliation.</p>
    </section>
    {error&&<p className="error" role="alert">{error}</p>}
    {report&&<article className="draft-report">
      <div className="draft-report-title"><h2>ATM Reconciliation — {report.terminal}</h2><span className={exceptions?'html-section-error':'html-section-ok'}>{exceptions?exceptions+' exception(s)':'4 checks balanced'}</span></div>
      <p>Business date: {report.date} · {report.approvedCount} approved withdrawals · Cash dispensed: <strong>{money(report.dispensed)}</strong></p>
      <div className="atm-stats">
        {[['Expected ATM cash',report.expected],['Physical cash',report.counted],['GL ATM cash',report.glCash],['Net settlement',report.settled]].map(([label,value])=><div className="atm-stat" key={label}><small>{label}</small><strong>{money(value)}</strong></div>)}
      </div>
      <h3>Reconciliation controls</h3>
      <div className="table-scroll"><table><thead><tr><th>CONTROL</th><th>EXPECTED</th><th>ACTUAL</th><th>VARIANCE</th><th>STATUS</th></tr></thead><tbody>{report.checks.map(check=><tr key={check.name} className={check.ok?'':'exception'}><td>{check.name}</td><td>{money(check.source)}</td><td>{money(check.actual)}</td><td>{money(check.variance)}</td><td>{check.ok?'Balanced':'Exception'}</td></tr>)}</tbody></table></div>
      <h3>Cash proof</h3><p>Beginning {money(report.beginning)} + replenishments {money(report.loaded)} − cash removed {money(report.removed)} − approved withdrawals {money(report.dispensed)} = expected {money(report.expected)}.</p>
      <button type="button" onClick={()=>setDetail(v=>!v)}>{detail?'Hide':'Show'} transaction detail</button>
      {detail&&<div className="table-scroll"><table><thead><tr><th>TRACE</th><th>TYPE</th><th>STATUS</th><th>DISPENSED</th></tr></thead><tbody>{report.tx.map(t=><tr key={t.trace_id}><td>{t.trace_id}</td><td>{t.type}</td><td>{t.status}</td><td>{money(amount(t,'cash_dispensed'))}</td></tr>)}</tbody></table></div>}
      {exceptions>0&&<p className="error" role="status">Investigate discrepancies before posting or certifying this reconciliation. The exception scenario intentionally changes the GL clearing amount by $50.</p>}
      <p><small>Files remain in this browser session. The GL demo file is a separate synthetic ATM-specific CSV, not the existing credit union trial-balance parser. Production mappings, fees, cutoff timing, journal corrections, and multi-terminal accounting require vendor-specific validation.</small></p>
    </article>}
    {aiEnabled&&<div className="atm-assistant-dock">
      <button type="button" className="atm-chat-launcher" aria-expanded={chatOpen} aria-controls="atm-chat-window" onClick={()=>setChatOpen(open=>!open)}>{chatOpen?'Close chat':'Ask the System'}{chat.length>0&&!chatOpen?' · '+chat.length:''}</button>
      {chatOpen&&<section id="atm-chat-window" className="atm-investigation atm-chat-window" aria-label="ATM investigation chat">
      <div className="atm-chat-header"><h3>Ask the System</h3><button type="button" aria-label="Close ATM assistant" onClick={()=>setChatOpen(false)}>✕</button></div>
      <p className="atm-chat-subtitle">ATM Balancing · Local rules-based assistant</p>
      <p className="atm-chat-disclosure">Answers use this browser's current ATM report only. Enterprise AI is not connected. No data is sent to an AI service.</p>
      {!report&&<p role="status">No ATM report yet. Run balancing or load a demo, then ask about variances and reconciliation controls.</p>}
      <div className="atm-chat-suggestions">
       {['Why is ATM out of balance?','Explain the cash proof','Check GL balances','Explain network settlement'].map(q=><button key={q} type="button" onClick={()=>ask(q)}>{q}</button>)}
      </div>
      <div aria-live="polite" aria-label="ATM assistant conversation" className="atm-chat-history">
       {chat.map((item,i)=><div key={i} style={{marginBottom:12}}><p><strong>You:</strong> {item.question}</p><p><strong>Assistant:</strong> {item.answer}</p></div>)}
      </div>
      <form className="atm-chat-compose" onSubmit={e=>{e.preventDefault();ask(question);}}>
       <input aria-label="Ask about ATM reconciliation" value={question} onChange={e=>setQuestion(e.target.value)} placeholder="Ask why ATM is out of balance…"/>
       <button className="primary" type="submit" disabled={!question.trim()}>Ask</button>
      </form>
      </section>}
    </div>}
  </section>;
}
