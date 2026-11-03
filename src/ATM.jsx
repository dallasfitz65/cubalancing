import React,{useState} from 'react';

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
async function loadFixture(filename){const response=await fetch('/demo/atm/'+filename,{cache:'no-store'});if(!response.ok)throw Error('Could not open sample file '+filename);return parseCSV(await response.text());}
export default function ATM({onReview}){
  const [sources,setSources]=useState({}),[names,setNames]=useState({}),[report,setReport]=useState(null);
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[detail,setDetail]=useState(false);
  async function demo(exception=false){
    setBusy(true);setError('');
    try{const rows=await Promise.all(SOURCES.map(s=>loadFixture(exception&&s.key==='gl'?'atm-gl-exception.csv':s.file)));
      const data=Object.fromEntries(SOURCES.map((s,i)=>[s.key,rows[i]]));
      const files=Object.fromEntries(SOURCES.map(s=>[s.key,exception&&s.key==='gl'?'atm-gl-exception.csv':s.file]));
      const result=evaluate(data);setSources(data);setNames(files);setReport(result);onReview?.(result);
    }catch(e){setReport(null);setError(e.message);}finally{setBusy(false);}
  }
  async function upload(key,file){
    if(!file)return;
    setError('');setReport(null);
    try{if(file.size>5*1024*1024)throw Error('CSV exceeds the 5 MB demo limit.');
      const rows=parseCSV(await file.text());setSources(previous=>({...previous,[key]:rows}));setNames(previous=>({...previous,[key]:file.name}));
    }catch(e){setError(e.message);}
  }
  function run(){
    setError('');
    try{const missing=SOURCES.filter(s=>!sources[s.key]).map(s=>s.name);
      if(missing.length)throw Error('Missing sources: '+missing.join(', '));
      const result=evaluate(sources);setReport(result);onReview?.(result);
    }catch(e){setReport(null);setError(e.message);}
  }
  const exceptions=report?.checks.filter(c=>!c.ok).length||0;
  return <section className="folder-settings atm-workspace">
    <div className="draft-report-title"><h2>ATM Balancing</h2></div>
    <p><strong>Demonstration only.</strong> All records are fictional. Cash and settlement reconciliation run separately; this prototype is not a validated processor integration or production accounting control.</p>
    <div className="atm-actions"><button className="primary" disabled={busy} onClick={()=>demo(false)}>Load balanced demo</button><button disabled={busy} onClick={()=>demo(true)}>Load exception demo ($50)</button><button disabled={busy} onClick={run}>Run ATM Balancing</button><button disabled={!report} onClick={()=>window.print()}>Print / PDF</button></div>
    <div className="atm-source-grid">{SOURCES.map(s=><div className="atm-source" key={s.key}><strong>{s.name}</strong><small>{names[s.key]||'No file selected'}</small><label className="atm-file-choose">Choose CSV<input type="file" accept=".csv,text/csv" aria-label={'Choose '+s.name} onChange={e=>{upload(s.key,e.target.files[0]);e.target.value='';}}/></label><a href={'/demo/atm/'+s.file} download={s.file}>Download sample</a></div>)}</div>
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
  </section>;
}
