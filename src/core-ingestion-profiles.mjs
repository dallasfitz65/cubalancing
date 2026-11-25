// Core-specific ingestion contracts. A provisional profile is not permission to run
// another vendor's parser or to certify a reconciliation result.
const frozen=Object.freeze;
const xp2Roles=frozen({
 'credit-cards':['card_balances','card_transactions','card_settlement','card_gl'],
 'shares-loans':['gl','svst','lnst','cobd'],
 cash:['gl','cobd'],
 drafts:['gl','sdps','sdre','sdrt','draftgl'],
 eft:['eftday','eftstar','eftatm','eftrejects','eftteller','eftgl'],
 atm:['atm_transactions','atm_cash','atm_settlement','atm_gl'],
 ach:['ach_activity','ach_posting','ach_settlement','ach_gl']
});
const xp2Known={
 ...Object.fromEntries(['balances','transactions','settlement','gl'].map(k=>['card_'+k,{label:'Normalized card '+k,extensions:['csv'],patterns:[new RegExp('^card_'+k+'(?:[_. -]|$)','i')]}])),
 gl:{label:'GL trial balance',extensions:['pdf','txt'],patterns:[/(?:^|[^a-z])gl[_ -]?(?:trial|balance)/i,/trial[_ -]?balance/i]},
 svst:{label:'Shares (SVST)',extensions:['txt'],patterns:[/svst/i]},
 lnst:{label:'Loans (LNST)',extensions:['txt'],patterns:[/lnst/i]},
 cobd:{label:'Cash (COBD)',extensions:['txt'],patterns:[/cobd/i]},
 sdps:{label:'Share draft posting (SDPS)',extensions:['txt'],patterns:[/sdps/i]},
 sdre:{label:'Share draft processing (SDRE)',extensions:['txt'],patterns:[/sdre/i]},
 sdrt:{label:'Share draft returns (SDRT)',extensions:['txt'],patterns:[/sdrt/i]},
 draftgl:{label:'Share draft GL detail',extensions:['pdf'],patterns:[/share.?draft.*gl/i,/draftgl/i]},
 eftday:{label:'EFT day totals',extensions:['txt'],patterns:[/eft[ _.-]?(?:core[ _.-]?)?day(?:[ _.-]?totals?)?/i,/(?:^|[ _.-])core[ _.-]?day[ _.-]?totals?(?:[ _.-]|$)/i,/(?:^|[ _.-])day[ _.-]?totals?(?:[ _.-]|$)/i]},
 eftstar:{label:'EFT STAR settlement',extensions:['txt'],patterns:[/eft.?star/i]},
 eftatm:{label:'EFT ATM owner activity',extensions:['txt'],patterns:[/eft.?atm/i]},
 eftrejects:{label:'EFT rejects',extensions:['txt'],patterns:[/eft.?reject/i]},
 eftteller:{label:'EFT teller totals',extensions:['txt'],patterns:[/eft.?teller/i]},
 eftgl:{label:'EFT GL detail',extensions:['pdf'],patterns:[/eft.?gl/i]},
 atm_transactions:{label:'ATM transaction journal',extensions:['csv'],patterns:[/atm.?transactions?/i]},
 atm_cash:{label:'ATM cash count',extensions:['csv'],patterns:[/atm.?cash.?count/i]},
 atm_settlement:{label:'ATM settlement',extensions:['csv'],patterns:[/atm.?settlement/i]},
 atm_gl:{label:'ATM GL balances',extensions:['csv'],patterns:[/atm.?gl/i]},
 ach_activity:{label:'ACH operator activity',extensions:['csv'],patterns:[/(?:^|[_. -])ach[_ .-]?activity(?:[_. -]|$)/i]},
 ach_posting:{label:'ACH core posting',extensions:['csv'],patterns:[/(?:^|[_. -])ach[_ .-]?posting(?:[_. -]|$)/i]},
 ach_settlement:{label:'ACH settlement',extensions:['csv'],patterns:[/(?:^|[_. -])ach[_ .-]?settlement(?:[_. -]|$)/i]},
 ach_gl:{label:'ACH GL movement',extensions:['csv'],patterns:[/(?:^|[_. -])ach[_ .-]?gl(?:[_. -]|$)/i]},
 account:{label:'Account reference',extensions:['csv'],patterns:[/account.?reference/i]}
};
export const CORE_INGESTION_PROFILES=frozen({
 xp2:frozen({core:'xp2',label:'XP2',validation:'partial',roles:xp2Roles,fileDefinitions:xp2Known,adapter:'xp2',note:'XP2 file labels are recognized by name. Individual balancing modules retain their existing validation limits.'}),
 datasafe:frozen({core:'datasafe',label:'DataSafe',validation:'pending',roles:frozen({}),fileDefinitions:frozen({}),adapter:null,note:'No verified DataSafe export definitions or parser. Upload representative exports for adapter development.'}),
 portico:frozen({core:'portico',label:'Portico',validation:'pending',roles:frozen({}),fileDefinitions:frozen({}),adapter:null,note:'No verified Portico export definitions or parser. Upload representative exports for adapter development.'})
});
export const coreIngestion=core=>CORE_INGESTION_PROFILES[core]??CORE_INGESTION_PROFILES.xp2;
export function identifyCoreFile(file,core='xp2'){
 const profile=coreIngestion(core), name=String(file?.name||''),ext=name.split('.').pop().toLowerCase();
 const roles=Object.entries(profile.fileDefinitions).filter(([,definition])=>
  definition.extensions.includes(ext)&&definition.patterns.some(pattern=>pattern.test(name))).map(([role])=>role);
 return {file,role:roles.length===1?roles[0]:'',status:roles.length===1?'identified':roles.length>1?'ambiguous':'unrecognized',matches:roles};
}
export function classifyCoreFiles(files,core='xp2'){
 return Array.from(files||[]).slice(0,200).filter(f=>/\.(pdf|txt|csv)$/i.test(f?.name||'')).map((file,index)=>({...identifyCoreFile(file,core),index}));
}
export function sourceCoverage(core,module,selectedFiles={},candidates=[]){
 const profile=coreIngestion(core);
 if(!profile.adapter)return {status:'not-validated',required:[],missing:[],duplicates:[],matched:[],message:profile.note};
 const required=profile.roles[module]||[];
 const duplicates=required.filter(role=>candidates.filter(item=>item.role===role).length>1);
 const matched=required.filter(role=>!!selectedFiles[role]||candidates.some(item=>item.role===role));
 const missing=required.filter(role=>!matched.includes(role));
 return {status:duplicates.length?'conflict':missing.length?'missing':'file-coverage-only',required,missing,duplicates,matched,message:'File presence does not establish matching dates, supported content or a balanced result.'};
}
export const CORE_RECONCILIATION_RULES=frozen({
 xp2:{validation:'partial',modules:{'shares-loans':'existing-xp2-adapter',cash:'existing-xp2-adapter',drafts:'existing-prototype',eft:'existing-prototype',atm:'demo-only',ach:'design'}},
 datasafe:{validation:'pending',modules:{'shares-loans':'awaiting-export-specification',cash:'awaiting-export-specification',drafts:'awaiting-export-specification',eft:'awaiting-export-specification',atm:'awaiting-export-specification',ach:'awaiting-export-specification'}},
 portico:{validation:'pending',modules:{'shares-loans':'awaiting-export-specification',cash:'awaiting-export-specification',drafts:'awaiting-export-specification',eft:'awaiting-export-specification',atm:'awaiting-export-specification',ach:'awaiting-export-specification'}}
});
