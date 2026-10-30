export const sourceRoles={eft:['eftday','eftstar','eftatm','eftrejects','eftteller','eftgl'], 'shares-loans':['gl','svst','lnst','cobd'],drafts:['gl','sdps','sdre','sdrt','draftgl'],cash:['gl','cobd'],ach:['gl'],mapping:['account']};
export function selectSections(sections,page){return sections.map(s=>({...s,rows:s.rows.filter(r=>page==='drafts'?r.gl==='902-0070':page==='shares-loans'?r.gl!=='902-0070':page==='cash'?s.id==='cash':page==='exceptions'?!r.ok:true)})).filter(s=>s.rows.length);}
export function requiredRoles(page){return ['shares-loans','drafts','cash'].includes(page)?sourceRoles[page]:['gl','svst','lnst','cobd'];}
export function suggestRole(name){if(/sharedrafts.*gl/i.test(name))return 'draftgl';if(/^sdps/i.test(name))return 'sdps';if(/^sdre/i.test(name))return 'sdre';if(/^sdrt/i.test(name))return 'sdrt';if(/\bgl\b|trial.?balance/i.test(name))return 'gl';if(/svst|shares/i.test(name))return 'svst';if(/lnst|loans/i.test(name))return 'lnst';if(/cobd|cash/i.test(name))return 'cobd';return '';}

export function loadedRunRoles(page,files){const allowed=page==='cash'?['cobd']:['svst','lnst','cobd'];return ['gl',...allowed.filter(role=>files[role])];}
