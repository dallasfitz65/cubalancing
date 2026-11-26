import React from 'react';
import {analyzeBalancing} from './balancing-analyst.mjs';
export default function BalancingAnalyst({cards,onNavigate}){
 const a=analyzeBalancing(cards);
 return <section className="folder-settings" aria-label="AI Balancing Analyst" style={{marginTop:16}}>
 <div className="section-title-help"><h2>AI Balancing Analyst</h2><small>Current session · Local rules-based assessment</small></div>
 <div className="abacus-exec-grid" style={{marginBottom:20}}>
 <div className="abacus-exec-tile" style={{'--balancing-accent':'#16a66a',cursor:'default'}}><span className="abacus-exec-tile-label">Sections Passed</span><strong className="abacus-exec-status abacus-status-passed">{a.passed} / {a.total}</strong><small>Sections with all configured controls passed</small></div>
 <div className="abacus-exec-tile" style={{'--balancing-accent':'#b82e2e',cursor:'default'}}><span className="abacus-exec-tile-label">Require Investigation</span><strong className={'abacus-exec-status '+(a.failed?'abacus-status-exception':'abacus-status-passed')}>{a.failed}</strong><small>Sections requiring review or resolution</small></div>
 <div className="abacus-exec-tile" style={{'--balancing-accent':'#f59e0b',cursor:'default'}}><span className="abacus-exec-tile-label">Not Run</span><strong className="abacus-exec-status abacus-status-pending">{a.pending}</strong><small>Sections without completed results</small></div>
 </div>
 <h3>Executive assessment</h3><p>{a.summary}</p>
 {a.mixedDates&&<p role="status"><strong>Source date review:</strong> Completed sections report different business dates ({a.dates.join(', ')}). Confirm the reporting cycle before comparing sections.</p>}
 {a.findings.length>0&&<><h3>Priority findings</h3><p>Ordered by number of failed controls, then reported issues; not by financial materiality.</p>{a.findings.map(f=><article key={f.id} style={{borderTop:'1px solid #dbe4ec',padding:'12px 0'}}><strong>{f.label} — FAIL</strong><p>{f.failed} failed controls · {f.unverified} unverified controls · {f.issues} reported issues</p>{f.controls.length>0&&<ul>{f.controls.slice(0,5).map((label,i)=><li key={i}>{label}</li>)}</ul>}{f.controls.length>5&&<p>{f.controls.length-5} additional failed controls.</p>}<p><strong>Recommended investigation:</strong> {f.action}</p><button type="button" onClick={()=>onNavigate(f.id)}>Review {f.label} →</button></article>)}</>}
 {a.pendingSections.length>0&&<><h3>Incomplete sections</h3><p>Confirm required reports are available and run the configured controls before closing daily balancing.</p>{a.pendingSections.map(f=><button key={f.id} type="button" style={{margin:'0 8px 8px 0'}} onClick={()=>onNavigate(f.id)}>{f.label} →</button>)}</>}
 <p><small>Recommendations are investigation steps, not confirmed causes. No external AI service or historical analysis is used.</small></p>
 </section>;
}
