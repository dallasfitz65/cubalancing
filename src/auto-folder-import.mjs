import {suggestRole} from './workspaces.mjs';
const expectedExtensions={gl:['txt','pdf'],svst:['txt'],lnst:['txt'],cobd:['txt'],sdps:['txt'],sdre:['txt'],sdrt:['txt'],draftgl:['pdf'],eftgl:['pdf'],eftday:['txt'],eftstar:['txt'],eftatm:['txt'],eftrejects:['txt'],eftteller:['txt'],atm_transactions:['csv'],atm_cash:['csv'],atm_settlement:['csv'],atm_gl:['csv'],account:['csv']};
export function classifyFolderFiles(source){
 const recognized=[],duplicates=[],invalid=[],ignored=[],roles=new Map();
 for(const file of Array.from(source).slice(0,200)){
  const role=suggestRole(file.name);
  if(!role){ignored.push(file.name);continue;}
  const ext=file.name.split('.').pop().toLowerCase();
  if(!file.size||file.size>10*1024*1024||!expectedExtensions[role]?.includes(ext)){invalid.push(file.name);continue;}
  if(roles.has(role)){duplicates.push(role+': '+roles.get(role).name+' and '+file.name);continue;}
  roles.set(role,file);recognized.push({role,file});
 }
 return {recognized,duplicates,invalid,ignored,autoRun:['gl','svst','lnst','cobd'].every(role=>roles.has(role))&&duplicates.length===0&&invalid.length===0};
}
