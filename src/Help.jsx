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
 <h1>ABACUS Help & Balancing Rules</h1>
 <p>Operating guidance adapted from the five supplied XP2/Wisdom balancing procedures. Rules are configurable design controls, not verified source-file field mappings or authorization to automatically post GL adjustments.</p>
 <label htmlFor="help-rule-select"><strong>Choose balancing module</strong></label>
 <select id="help-rule-select" value={selected} onChange={e=>setSelected(e.target.value)}>{RULE_CATALOG.map(m=><option key={m.module} value={m.module}>{m.label}</option>)}</select>
 <article className="folder-settings"><h2>{current.label} balancing</h2><p><strong>Required sources:</strong> {current.sources.join(' · ')}</p><p><strong>Implementation:</strong> {current.status==='partial'?'Existing module needs additional procedure-based controls':'Procedure-based module definition; automated balancing is not yet implemented'}</p>
 {current.checks.map(c=><div key={c.id} className="abacus-help-rule"><h3>{c.name}</h3><p><code>{c.id}</code> — {c.formula}</p>{c.groupBy&&<p><strong>Separate by:</strong> {c.groupBy.join(', ')}</p>}<ul>{c.guards.map(g=><li key={g}>{g}</li>)}</ul></div>)}</article>
 <h2>Enhancement roadmap</h2>{featurePlan.map(f=><article key={f.title} className="folder-settings"><h3>{f.title}</h3><p><strong>{f.state}</strong></p><p>{f.detail}</p></article>)}
 <article className="folder-settings" aria-label="Central Settings Migration help">
  <h2>Central Settings Migration — legacy setup</h2>
  <p>This is an optional, one-time administrative utility for credit unions moving from ABACUS settings stored in an older browser session to centrally stored credit-union settings. It is not required for normal balancing or for newly configured credit unions.</p>
  <ul>
   <li><strong>Core processing system:</strong> copies a missing legacy XP2, DataSafe, or Portico selection.</li>
   <li><strong>GL sign convention:</strong> copies a missing balance sign setting.</li>
   <li><strong>Input folder:</strong> copies a remembered folder reference within the same browser and device when the selected credit union does not already have one. You may need to reconnect folder permission.</li>
   <li><strong>Existing central settings:</strong> are never overwritten by this utility.</li>
  </ul>
  <p><strong>Not transferred:</strong> passwords, user accounts, financial source files, balancing results, and actual folder contents. The folder permission stays browser/device-specific.</p>
  <p><strong>When to use:</strong> only if an existing credit union was configured in an older local ABACUS session and the new centralized settings are missing. Select the correct credit union under Platform, then use <strong>Import Existing Local Settings</strong>. Run it on the original browser/device where the old preferences were stored. Do not use it for routine setup or as a general financial-data import.</p>
 </article>
 <h2>Accounting and security rules</h2><ul><li>Explained outstanding transactions remain open until an actual reversal, posting or settlement proves clearance.</li><li>Compare item counts and signed amounts; split by transaction category, processing date and settlement window.</li><li>Prove GL clearing balance with signed line-level outstanding items, not just a balancing plug.</li><li>Match first by reliable IDs; report duplicate, unmatched or ambiguous candidates instead of guessing.</li><li>Record source file hash, processing cutoff, rule version and outcome for any future durable audit record.</li><li>Do not double count ATM activity that is part of a combined EFT settlement.</li><li>Keep credit-union financial files on an approved local device/server. Client-side folder permission cannot be bypassed by an in-browser scheduler.</li></ul>
 <p className="abacus-help-source">{RULE_SOURCE_NOTICE}</p>
 </section>;
}
