import React from 'react';
import {analyzeBalancing} from './balancing-analyst.mjs';
export default function BalancingAnalyst({cards,onNavigate}){
 const a=analyzeBalancing(cards);
 return <section className="folder-settings" aria-label="AI Balancing Analyst" style={{marginTop:16}}>
 <div className="section-title-help"><h2>AI Balancing Analyst</h2><small>Current session · Local rules-based assessment</small></div>
 <div className="html-stat-grid" style={{gridTemplateColumns:'repeat(3,minmax(0,1fr))'}}>
 <div className="html-stat-card"><small>SECTIONS PASSED</small><strong className="green">{a.passed} / {a.total}</strong></div>
 <div className="html-stat-card"><small>REQUIRE INVESTIGATION</small><strong>{a.failed}</strong></div>
 <div className="html-stat-card"><small>NOT RUN</small><strong>{a.pending}</strong></div>
 </div>
 <h3>Executive assessment</h3><p>{a.summary}</p>
 {a.mixedDates&&<p role="status"><strong>Source date review:</strong> Completed sections report different business dates ({a.dates.join(', ')}). Confirm the reporting cycle before comparing sections.</p>}
 {a.findings.length>0&&<><h3>Priority findings</h3><p>Ordered by number of failed controls, then reported issues; not by financial materiality.</p>{a.findings.map(f=><article key={f.id} style={{borderTop:'1px solid #dbe4ec',padding:'12px 0'}}><strong>{f.label} — FAIL</strong><p>{f.failed} failed controls · {f.unverified} unverified controls · {f.issues} reported issues</p>{f.controls.length>0&&<ul>{f.controls.slice(0,5).map((label,i)=><li key={i}>{label}</li>)}</ul>}{f.controls.length>5&&<p>{f.controls.length-5} additional failed controls.</p>}<p><strong>Recommended investigation:</strong> {f.action}</p><button type="button" onClick={()=>onNavigate(f.id)}>Review {f.label} →</button></article>)}</>}
 {a.pendingSections.length>0&&<><h3>Incomplete sections</h3><p>Confirm required reports are available and run the configured controls before closing daily balancing.</p>{a.pendingSections.map(f=><button key={f.id} type="button" style={{margin:'0 8px 8px 0'}} onClick={()=>onNavigate(f.id)}>{f.label} →</button>)}</>}
 <p><small>Recommendations are investigation steps, not confirmed causes. No external AI service or historical analysis is used.</small></p>
 </section>;
}
