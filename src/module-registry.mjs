export const MODULES=Object.freeze([
 ['shares-loans','Shares, Loans & Cash',['gl','svst','lnst','cobd']],
 ['drafts','Share Drafts',['gl','sdps','sdre','sdrt','draftgl']],
 ['eft','EFT',['eftday','eftstar','eftatm','eftrejects','eftteller','eftgl']],
 ['atm','ATM Balancing',['atm_transactions','atm_cash','atm_settlement','atm_gl']],
 ['ach','ACH',['ach_activity','ach_posting','ach_settlement','ach_gl']],
 ['credit-cards','Credit Card Balancing',['card_balances','card_transactions','card_settlement','card_gl']],
 ['mortgage-servicing','Mortgage Servicing Balancing',['mortgage_balances','mortgage_activity','mortgage_remittance','mortgage_gl']],
 ['loan-participations','Loan Participation Balancing',['participation_balances','participation_activity','participation_remittance','participation_gl']]
].map(([id,label,roles])=>Object.freeze({id,label,roles:Object.freeze(roles)})));
const legacy=['shares-loans','drafts','eft','atm','ach','credit-cards','loan-participations'];
export const defaultModules=()=>legacy.filter(id=>MODULES.some(m=>m.id===id));
export const validModules=value=>Array.isArray(value)&&value.length<=MODULES.length&&new Set(value).size===value.length&&value.every(id=>MODULES.some(m=>m.id===id));
export const resolveModules=value=>value===undefined||value===null?defaultModules():validModules(value)?[...value]:[];
export const moduleAllowed=(id,enabled)=>{const key=id==='cash'?'shares-loans':id;return !MODULES.some(m=>m.id===key)||enabled.includes(key);};
export const roleAllowed=(role,enabled)=>role==='account'||MODULES.some(m=>enabled.includes(m.id)&&m.roles.includes(role));
export const filterModuleFiles=(files,enabled)=>Object.fromEntries(Object.entries(files).filter(([role])=>roleAllowed(role,enabled)));
