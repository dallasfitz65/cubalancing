const DB='abacus-folder-preference-v1',TABLE='settings';
const key=(scope,name)=>{if(!scope||!name)throw Error('Setting scope and name required.');return scope+':'+name;};
async function open(){if(!globalThis.indexedDB)throw Error('Persistent settings unavailable.');return new Promise((resolve,reject)=>{const r=indexedDB.open(DB,2);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains('preferences'))r.result.createObjectStore('preferences');if(!r.result.objectStoreNames.contains(TABLE))r.result.createObjectStore(TABLE);};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(Error('Cannot open settings table.'));});}
async function use(mode,run){const db=await open();try{return await new Promise((resolve,reject)=>{const t=db.transaction(TABLE,mode),r=run(t.objectStore(TABLE));let output;r.onsuccess=()=>output=r.result;t.oncomplete=()=>resolve(output);t.onerror=t.onabort=()=>reject(Error('Cannot save settings.'));});}finally{db.close();}}
export const getSetting=(scope,name)=>use('readonly',s=>s.get(key(scope,name)));
export const saveSetting=(scope,name,value)=>use('readwrite',s=>s.put(value,key(scope,name)));
export const deleteSetting=(scope,name)=>use('readwrite',s=>s.delete(key(scope,name)));
