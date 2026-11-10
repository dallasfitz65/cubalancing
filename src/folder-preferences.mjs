// Persist configuration only: directory handle and validated GL/core mapping. Never financial reports.
import {validateMaster} from './master-mapping.mjs';
import {getSetting,saveSetting,deleteSetting} from './settings-table.mjs';
const DATABASE='abacus-folder-preference-v1',STORE='preferences';
function keyFor(scope){if(typeof scope!=='string'||!scope.trim())throw Error('User and credit union required to save folder preference.');return 'reconciliation-directory:'+scope;}
async function database(){if(!globalThis.indexedDB)throw Error('Remembering folders is unavailable in this browser.');return new Promise((resolve,reject)=>{const request=indexedDB.open(DATABASE,2);request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains(STORE))request.result.createObjectStore(STORE);if(!request.result.objectStoreNames.contains('settings'))request.result.createObjectStore('settings');};request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(Error('Could not open folder preferences.'));});}
async function access(mode,action){const db=await database();try{return await new Promise((resolve,reject)=>{const transaction=db.transaction(STORE,mode);let result;const request=action(transaction.objectStore(STORE));request.onsuccess=()=>{result=request.result;};transaction.oncomplete=()=>resolve(result);transaction.onerror=transaction.onabort=()=>reject(Error('Could not update folder preferences.'));});}finally{db.close();}}
export async function recallFolder(scope){const saved=await getSetting(scope,'folder');if(saved)return saved;const legacy=await access('readonly',store=>store.get(keyFor(scope)));if(legacy){await saveSetting(scope,'folder',legacy);await access('readwrite',store=>store.delete(keyFor(scope)));}return legacy;}
export async function rememberFolder(handle,scope){if(!handle||handle.kind!=='directory')throw Error('Only a directory handle can be remembered.');return saveSetting(scope,'folder',handle);}
export async function forgetFolder(scope){await deleteSetting(scope,'folder');await access('readwrite',store=>store.delete(keyFor(scope)));}

export function configuration(value){
 if(!value||typeof value.name!=='string'||value.name.length>255||!Array.isArray(value.entries)||value.entries.length>10000||typeof value.approved!=='boolean'||!/^sha256:[a-f0-9]{64}$/.test(value.version))throw Error('Invalid mapping settings.');
 const entries=validateMaster(value.entries.map(e=>[e.gl,e.description,'','',e.category,e.code]));
 return {name:value.name,entries,version:value.version,approved:value.approved};
}
export async function recallMapping(){const value=await access('readonly',store=>store.get('master-mapping'));return value?configuration(value):null;}
export async function rememberMapping(value){const clean=configuration(value);return access('readwrite',store=>store.put(clean,'master-mapping'));}

export const forgetLegacyMapping=()=>access('readwrite',store=>store.delete('master-mapping'));
