import xp2Mapping from './account-master.json' with {type:'json'};
import dataSafeMapping from './datasafe-account-master.json' with {type:'json'};

export const CORE_SYSTEMS=Object.freeze({
  xp2:{label:'XP2',mapping:xp2Mapping,validation:'Current configuration'},
  datasafe:{label:'DataSafe',mapping:dataSafeMapping,validation:'Copied from XP2 — pending DataSafe source-file validation'},
  portico:{label:'Portico',mapping:xp2Mapping,validation:'Provisional XP2 mapping — Portico source files and processing rules are not yet validated'}
});
export function getCoreSystem(value){return Object.hasOwn(CORE_SYSTEMS,value)?value:'xp2';}
export function getCoreMapping(value){return structuredClone(CORE_SYSTEMS[getCoreSystem(value)].mapping);}
