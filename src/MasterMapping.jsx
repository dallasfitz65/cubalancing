import React from 'react';
export default function MasterMapping({master}){
 const groups=new Map();
 for(const e of master.entries||[]){
  const k=`${e.section}|${e.gl}`;
  if(!groups.has(k))groups.set(k,{gl:e.gl,description:e.description,section:e.category,types:[]});
  groups.get(k).types.push(e.code);
 }
 return <section className="folder-settings"><h2>GL account mapping — Original HTML</h2><p>Read-only mapping used for balancing. Account types are numeric; accounts are grouped by GL and report section.</p><div className="table-scroll"><table><thead><tr><th>GL ACCOUNT</th><th>ACCOUNT DESCRIPTION</th><th>SECTION</th><th>ACCOUNT TYPES</th></tr></thead><tbody>{[...groups.values()].map(g=><tr key={g.section+'|'+g.gl}><td>{g.gl}</td><td>{g.description}</td><td>{g.section}</td><td>{g.types.join(', ')}</td></tr>)}</tbody></table></div></section>;
}
