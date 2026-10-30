export function allowedCU(user,cu){return user.role==='owner'||(cu&&user.credit_union_id===cu);}
export function preferences(value){if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!['defaultWorkspace'].includes(k))||!['overview','shares-loans','drafts','eft','ach'].includes(value.defaultWorkspace))throw Error('Invalid preferences');return {defaultWorkspace:value.defaultWorkspace};}
export const actions=new Set(['balancing_run','draft_checks','eft_review','evidence_export']);
