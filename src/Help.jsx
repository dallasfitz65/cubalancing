import React,{useState} from 'react';
import {RULE_CATALOG,RULE_SOURCE_NOTICE} from './reconciliation-rules.mjs';
const featurePlan=[
 {title:'2 · Intelligent matching',state:'Rule catalog and exact one-to-one matching primitive added',detail:'Match using verified reference, amount, and optional date window. Ambiguous and unmatched items remain exceptions. One-to-many, reversals, duplicate/settlement screening, configurable mappings and production file adapters still require implementation.'},
 {title:'4 · Unattended reconciliation',state:'Architecture planned; not running unattended',detail:'A local installed service (not a browser-only timer) should monitor approved folders, verify business-date completeness, hash files, avoid duplicate imports, run validated matching, and write result metadata. Requires service installation, scheduled jobs and local secure storage.'},
 {title:'5 · Audit and historical reporting',state:'Current session reporting; durable history pending',detail:'Save immutable run identifiers, timestamps, file hashes, rule versions, counts, exception lifecycle and approvals. Do not persist member transaction records centrally. Existing activity screen is session-only.'},
 {title:'6 · Executive dashboard',state:'Session KPI overview; historical KPI rollups pending',detail:'Show verified balanced checks, unresolved and explained-open items, outstanding aged exceptions, GL accounts due for certification and processing trends. Never show estimated production totals as actuals.'}
];
export default function Help(){
 const [selected,setSelected]=useState('atm');
 const current=RULE_CATALOG.find(x=>x.module===selected);
 return <section className="abacus-help">
 <h1>ABACUS Help & Reconciliation Rules</h1>
 <p>Operating guidance adapted from the five supplied XP2/Wisdom balancing procedures. Rules are configurable design controls, not verified source-file field mappings or authorization to automatically post GL adjustments.</p>
 <label htmlFor="help-rule-select"><strong>Choose reconciliation module</strong></label>
 <select id="help-rule-select" value={selected} onChange={e=>setSelected(e.target.value)}>{RULE_CATALOG.map(m=><option key={m.module} value={m.module}>{m.label}</option>)}</select>
 <article className="folder-settings"><h2>{current.label} balancing</h2><p><strong>Required sources:</strong> {current.sources.join(' · ')}</p><p><strong>Implementation:</strong> {current.status==='partial'?'Existing module needs additional procedure-based controls':'Procedure-based module definition; automated reconciliation is not yet implemented'}</p>
 {current.checks.map(c=><div key={c.id} className="abacus-help-rule"><h3>{c.name}</h3><p><code>{c.id}</code> — {c.formula}</p>{c.groupBy&&<p><strong>Separate by:</strong> {c.groupBy.join(', ')}</p>}<ul>{c.guards.map(g=><li key={g}>{g}</li>)}</ul></div>)}</article>
 <h2>Enhancement roadmap</h2>{featurePlan.map(f=><article key={f.title} className="folder-settings"><h3>{f.title}</h3><p><strong>{f.state}</strong></p><p>{f.detail}</p></article>)}
 <h2>Accounting and security rules</h2><ul><li>Explained outstanding transactions remain open until an actual reversal, posting or settlement proves clearance.</li><li>Compare item counts and signed amounts; split by transaction category, processing date and settlement window.</li><li>Prove GL clearing balance with signed line-level outstanding items, not just a balancing plug.</li><li>Match first by reliable IDs; report duplicate, unmatched or ambiguous candidates instead of guessing.</li><li>Record source file hash, processing cutoff, rule version and outcome for any future durable audit record.</li><li>Do not double count ATM activity that is part of a combined EFT settlement.</li><li>Keep credit-union financial files on an approved local device/server. Client-side folder permission cannot be bypassed by an in-browser scheduler.</li></ul>
 <p className="abacus-help-source">{RULE_SOURCE_NOTICE}</p>
 </section>;
}
