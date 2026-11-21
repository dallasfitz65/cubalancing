import React, {useState, useEffect, useRef} from 'react';
import {createRoot} from 'react-dom/client';
import {extractGL, PARSER_VERSION} from './gl-parser.mjs';
import {GL_ACCOUNTS,SVST_GL_MAP,LNST_GL_MAP,parseSVST,parseLNST,parseCOBD,buildSections,DEMO_SECTIONS} from './engine.mjs';

function parseReportMoney(v){if(typeof v==='number')return Number.isFinite(v)?v:0;if(typeof v!=='string')return 0;const n=Number(v.replace(/[$,()\s]/g,'').replace(/,/g,''));return Number.isFinite(n)?(v.includes('(')?-n:n):0;}
function compactReportMoney(value){if(!Number.isFinite(value))return '—';const absolute=Math.abs(value);if(absolute>=1e6)return '$'+(value/1e6).toFixed(1)+'M';if(absolute>=1e3)return '$'+(value/1e3).toFixed(0)+'K';return '$'+value.toLocaleString('en-US',{maximumFractionDigits:0});}
import './styles.css';
import MasterMapping from './MasterMapping.jsx';
import GLMappingImport from './GLMappingImport.jsx';
import {GL_SIGN_CONVENTIONS,normalizeGL} from './gl-sign-convention.mjs';
import {displayRunForSign} from './reconciliation-sign-display.mjs';
import {CORE_SYSTEMS,getCoreSystem,getCoreMapping} from './core-profiles.mjs';
import {recallFolder,rememberFolder,forgetFolder,forgetLegacyMapping} from './folder-preferences.mjs';
import {parseCoreCodes,buildMappedSections,normalizeSVSTAccountTypes} from './master-mapping.mjs';
import ShareDrafts from './ShareDrafts.jsx';
import EFT from './EFT.jsx';
import ATM from './ATM.jsx';
import {sourceRoles,selectSections,requiredRoles,suggestRole,loadedRunRoles} from './workspaces.mjs';
import {coreIngestion,classifyCoreFiles,sourceCoverage} from './core-ingestion-profiles.mjs';
import {getSetting,saveSetting} from './settings-table.mjs';
import Login,{accountAPI} from './Login.jsx';
// Production requires authenticated sessions for every reconciliation workspace.
// Previous local IndexedDB settings remain unchanged for first-login migration.
import UserManagement from './UserManagement.jsx';
import PlatformActivity from './PlatformActivity.jsx';
import TenantAdministration from './TenantAdministration.jsx';
import {tenantAPI,isServerTenant} from './tenant-api.mjs';
import Help from './Help.jsx';
const defs=[['atm_transactions','ATM transaction journal','.csv'],['atm_cash','ATM cash count','.csv'],['atm_settlement','ATM network settlement','.csv'],['atm_gl','ATM GL balances','.csv'],['eftday','EFT core day totals','.txt'],['eftstar','STAR settlement','.txt'],['eftatm','ATM owner activity','.txt'],['eftrejects','EFT rejects','.txt'],['eftteller','Teller totals','.txt'],['eftgl','EFT GL detail','.pdf'],['gl','GL trial balance','.pdf,.txt'],['svst','Shares export','.txt'],['lnst','Loans export','.txt'],['cobd','Cash export','.txt'],['sdps','SDPS posting recap','.txt'],['sdre','SDRE processing report','.txt'],['sdrt','SDRT returns report','.txt'],['draftgl','Share Draft clearing GL detail','.pdf'],['account','Account reference (view only)','.csv']];
const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n);

function download(name,content,type){const u=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}

const navigation=[['','Overview','overview'],['BALANCING','Shares, Loans and Cash','shares-loans'],['','Share Drafts','drafts'],['','EFT','eft'],['','ATM Balancing','atm'],['','ACH','ach'],['SETUP','Settings','settings'],['','Help & Rules','help'],['ADMIN','Platform','platform'],['','Platform Activity Log','platform-activity']];
// Keep dashboard destinations registered while hiding their sidebar entries.
const sidebarNavigation=navigation.filter(([, ,id])=>!['exceptions','history','audit'].includes(id));
function App({account,onLogout}){
 const [page,setPage]=useState('overview');
 const [coreSystem,setCoreSystem]=useState('xp2');
 const [eftResult,setEftResult]=useState(null);
 const [atmResult,setAtmResult]=useState(null);
 const [unmapped,setUnmapped]=useState([]);
 const [draftResult,setDraftResult]=useState(null);
 const [master,setMaster]=useState(()=>getCoreMapping(coreSystem));
 const [folder,setFolder]=useState(null),[folderConnection,setFolderConnection]=useState('checking'),[jumpToFolder,setJumpToFolder]=useState(false),[candidates,setCandidates]=useState([]),[folderStatus,setFolderStatus]=useState(''),[datesConfirmed,setDatesConfirmed]=useState(false);
 const folderInput=useRef(null);
 const [folderPreferenceStatus,setFolderPreferenceStatus]=useState('');
 const [backendFolderName,setBackendFolderName]=useState('');
 const [files,setFiles]=useState({}),[mode,setMode]=useState('real'),[sign,setSign]=useState('credit-negative');
 const [review,setReview]=useState(null),[approved,setApproved]=useState(false),[mappingOK,setMappingOK]=useState(false);
 const [result,setResult]=useState(null),[activity,setActivity]=useState([]),[notes,setNotes]=useState({}),[busy,setBusy]=useState(false),[progress,setProgress]=useState(''),[error,setError]=useState('');
 const [settingsReady,setSettingsReady]=useState(false),[settingsStatus,setSettingsStatus]=useState('');
 const [aiEnabled,setAiEnabled]=useState(false),[aiSaving,setAiSaving]=useState(false);
 const [aiNotice,setAiNotice]=useState('');
 const [aiIntegration,setAiIntegration]=useState({provider:'united-openai',baseUrl:'',model:'',authMethod:'oauth-sso'}),[aiIntegrationSaving,setAiIntegrationSaving]=useState(false),[aiIntegrationNotice,setAiIntegrationNotice]=useState(''),[aiIntegrationVersion,setAiIntegrationVersion]=useState(0),[aiPlatformReady,setAiPlatformReady]=useState(false);
 const [unions,setUnions]=useState([{id:'local-demo',name:'Demo Credit Union'}]),[activeCU,setActiveCU]=useState('local-demo'),[serverVersion,setServerVersion]=useState(null),[cuName,setCUName]=useState('Demo Credit Union'),[nameSaving,setNameSaving]=useState(false);
 const [savedCUName,setSavedCUName]=useState('');
 const folderScope=account.role==='guest'?`local-browser:${activeCU}`:`user:${account.id}:${activeCU}`;
 const centralTenant=account.role!=='guest'&&isServerTenant(activeCU);
 const [tenantVersions,setTenantVersions]=useState({});
 const [mappingVersion,setMappingVersion]=useState(0);
 const [historicalRuns,setHistoricalRuns]=useState([]);
 const [historyStatus,setHistoryStatus]=useState('');
 async function loadTenants(){
  if(account.role==='guest')return;
  const response=await tenantAPI('tenants');
  setUnions(response.tenants);
  setActiveCU(old=>response.tenants.some(x=>x.id===old)?old:response.tenants[0]?.id||'local-demo');
 }
 useEffect(()=>{if(account.role!=='guest')loadTenants().catch(e=>setSettingsStatus('Cannot load credit unions: '+e.message));},[account.id,account.role]);
 useEffect(()=>{if(!centralTenant){setHistoricalRuns([]);setHistoryStatus('');return;}
  let active=true;tenantAPI('runs',{tenantId:activeCU}).then(x=>{if(active)setHistoricalRuns(x.runs);}).catch(e=>{if(active)setHistoryStatus('History unavailable: '+e.message);});return()=>{active=false;};},[activeCU,centralTenant]);
 async function changeAiEnabled(enabled){
  if(aiSaving)return;
  if(!settingsReady){setAiNotice('Credit union settings are still loading. Please retry once loading completes.');return;}
  const previous=aiEnabled;
  setAiEnabled(enabled);
  setAiSaving(true);
  setAiNotice('Saving '+(enabled?'enabled':'disabled')+' setting for this credit union…');
  try{
   await persistPreference('ai-enabled',enabled);
   setAiNotice((enabled?'Enabled':'Disabled')+' and saved for this credit union. The assistant provides local ATM rules-based analysis; no external AI is connected.');
   setSettingsStatus('AI assistant preference saved.');
  }catch(e){
   setAiEnabled(previous);
   const error='AI setting could not be saved: '+e.message+'. The switch was restored to '+(previous?'On':'Off')+'.';
   setAiNotice(error);
   setSettingsStatus(error);
  }finally{setAiSaving(false);}
 }
 useEffect(()=>{if(account.role!=='admin')return;let active=true;setAiPlatformReady(false);
  tenantAPI('platform-settings').then(data=>{if(!active)return;setAiIntegration({provider:'united-openai',baseUrl:'',model:'',authMethod:'oauth-sso',...(data.setting||{})});setAiIntegrationVersion(data.version);setAiPlatformReady(true);}).catch(e=>{if(active)setAiIntegrationNotice('Unable to load platform AI settings: '+e.message);});
  return()=>{active=false;};
 },[account.id,account.role]);
 async function saveAiIntegration(){
  if(aiIntegrationSaving||!aiPlatformReady||account.role!=='admin')return;
  const baseUrl=aiIntegration.baseUrl.trim();
  if(baseUrl){try{const url=new URL(baseUrl);if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash)throw Error();}catch{setAiIntegrationNotice('Enter a valid HTTPS API base URL without credentials, query parameters or fragments.');return;}}
  const next={provider:aiIntegration.provider,baseUrl,model:aiIntegration.model.trim(),authMethod:aiIntegration.authMethod};
  setAiIntegrationSaving(true);setAiIntegrationNotice('Saving AI integration settings…');
  try{const saved=await tenantAPI('save-platform-settings',{body:{value:next,version:aiIntegrationVersion}});setAiIntegrationVersion(saved.version);setAiIntegration(next);setAiIntegrationNotice('Platform-wide AI integration configuration saved. No external AI connection is active.');}
  catch(e){setAiIntegrationNotice('Unable to save AI integration settings: '+e.message);}
  finally{setAiIntegrationSaving(false);}
 }
 async function persistPreference(key,value){
  if(!centralTenant){await saveSetting(folderScope,key,value);return;}
  const version=tenantVersions[key]??0;
  const response=await tenantAPI('set-setting',{tenantId:activeCU,body:{key,value,version}});
  setTenantVersions(prev=>({...prev,[key]:response.version}));
 }

 useEffect(()=>{let active=true;setSettingsReady(false);setAiEnabled(false);setAiNotice('');setBackendFolderName('');
  (async()=>{
   try {
    if(centralTenant){
      setSettingsReady(false);
      const response=await tenantAPI('settings',{tenantId:activeCU});
      if(!active)return;
      const selected=Object.fromEntries(response.settings.map(v=>[v.setting_key,v.setting_value]));
      setTenantVersions(Object.fromEntries(response.settings.map(v=>[v.setting_key,Number(v.version)])));
      const system=getCoreSystem(selected['core-system']||'xp2');
      setCoreSystem(system);
      setAiEnabled(selected['ai-enabled']===true);

      setBackendFolderName(typeof selected['folder-name']==='string'?selected['folder-name']:'');
      const savedMapping=await tenantAPI('mapping',{tenantId:activeCU,coreSystem:system});
      if(!active)return;
      setMaster(savedMapping.mapping||getCoreMapping(system));
      setMappingVersion(savedMapping.version);
      setSign(Object.hasOwn(GL_SIGN_CONVENTIONS,selected['sign-convention'])?selected['sign-convention']:'credit-negative');
      setSettingsStatus('Central credit union settings loaded.');
    }else{
      let selected=await getSetting(folderScope,'core-system');
      if(!selected){try{selected=localStorage.getItem('abacus-core-system');}catch{}if(selected)await saveSetting(folderScope,'core-system',getCoreSystem(selected));try{localStorage.removeItem('abacus-core-system');}catch{}}
      if(active){const system=getCoreSystem(selected||'xp2');setCoreSystem(system);setMaster(getCoreMapping(system));}
      const savedAI=await getSetting(folderScope,'ai-enabled');
      if(active)setAiEnabled(savedAI===true);

      const convention=await getSetting(folderScope,'sign-convention');
      if(active)setSign(Object.hasOwn(GL_SIGN_CONVENTIONS,convention)?convention:'credit-negative');
    }
   }catch(e){if(active)setSettingsStatus('Unable to load settings: '+e.message);}
   finally{if(active)setSettingsReady(true);}
  })();
  return()=>{active=false;};
 },[folderScope,centralTenant,activeCU]);
 useEffect(()=>{
  let active=true;
  setFolder(null);setFolderConnection('checking');setFolderPreferenceStatus('');setFolderStatus('');
  if(!activeCU){setFolderConnection('missing');return()=>{active=false;};}
  (async()=>{
    try{
      const handle=await recallFolder(folderScope);
      if(!active)return;
      if(!handle||handle.kind!=='directory'){setFolderConnection('missing');return;}
      setFolder(handle);
      const permission=typeof handle.queryPermission==='function'?await handle.queryPermission({mode:'read'}):'prompt';
      if(!active)return;
      setFolderConnection(permission==='granted'?'ready':'reconnect');
      setFolderPreferenceStatus(permission==='granted'?'Saved folder connected for this browser and credit union.':'Saved folder needs browser permission again. Click Check folder in Settings.');
    }catch(e){if(active){setFolderConnection('missing');setFolderPreferenceStatus('Folder connection unavailable: '+e.message);}}
  })();
  return()=>{active=false;};
 },[folderScope]);
 useEffect(()=>{forgetLegacyMapping().catch(()=>{});},[]);
 useEffect(()=>{if(page!=='settings'||!jumpToFolder)return;document.getElementById('folder-import')?.scrollIntoView({behavior:'smooth',block:'start'});setJumpToFolder(false);},[page,jumpToFolder]);
 useEffect(()=>{setResult(null);setDraftResult(null);setEftResult(null);setAtmResult(null);setFiles({});setReview(null);setApproved(false);setMappingOK(false);setMaster(getCoreMapping(coreSystem));},[activeCU]);
 function changeCoreSystem(value){
  const selected=getCoreSystem(value);
  if(selected===coreSystem||busy||lock.current)return;
  if(Object.values(files).some(Boolean)||result||draftResult||eftResult||atmResult){if(!confirm('Switching core systems clears all loaded files and reconciliation results for this session. Continue?'))return;}
  setCoreSystem(selected);
  persistPreference('core-system',selected).catch(e=>setSettingsStatus('Settings save failed: '+e.message));
  setMaster(getCoreMapping(selected));setFiles({});setResult(null);setDraftResult(null);setEftResult(null);setAtmResult(null);setReview(null);setApproved(false);setMappingOK(false);setNotes({});setUnmapped([]);setError('');setActivity([]);setCandidates([]);setDatesConfirmed(false);setReportView('summary');
 }
 function recordAction(action,outcome){setActivity(prev=>[{id:crypto.randomUUID(),timestamp:new Date().toISOString(),mode:'local',issues:outcome==='exception'?1:0,checks:0,action},...prev]);}
 const [modal,setModal]=useState(null),[expanded,setExpanded]=useState({}),[search,setSearch]=useState('');
 const [reportView,setReportView]=useState('summary');
 useEffect(()=>{setUnmapped([]);},[files,master,page]);
 const lock=useRef(false),reviewDialog=useRef(null);
 useEffect(()=>{try{for(const storage of [localStorage,sessionStorage])for(const k of Object.keys(storage))if(k.startsWith('abacus-file-')||k.startsWith('var-note-'))storage.removeItem(k);}catch{}},[]);
 useEffect(()=>{if(modal)reviewDialog.current?.showModal();},[modal]);
 useEffect(()=>{setError('');},[page,approved,mappingOK]);
 function changeFile(key,file){if(lock.current)return;setError('');if(file&&key==='gl'&&['eftgl','draftgl'].includes(suggestRole(file.name))){setError('Wrong GL file selected: '+file.name+'. For Shares, Loans and Cash use GL_Trial_Balance_20261120.txt (or the consolidated trial balance); EFT_GL_Detail belongs under EFT, and ShareDrafts_GL_Detail belongs under Share Drafts.');return;}if(file){const ext=file.name.split('.').pop().toLowerCase();if(!file.size||file.size>10*1024*1024||!(key==='gl'?['pdf','txt']:key==='account'||key.startsWith('atm_')?['csv']:['draftgl','eftgl'].includes(key)?['pdf']:['txt']).includes(ext)){setError('Choose a nonempty supported file under 10 MB.');return;}}setFiles(p=>({...p,[key]:file||null}));if(key.startsWith('eft'))setEftResult(null);if(key.startsWith('atm_'))setAtmResult(null);if(['gl','sdps','sdre','sdrt','draftgl'].includes(key))setDraftResult(null);if(key==='gl'){setReview(null);setApproved(false);}if(['gl','svst','lnst','cobd'].includes(key)){setResult(previous=>{if(!previous||key==='gl')return null;const affected=key==='svst'?['shares','certs']:key==='lnst'?['loans']:['cash'];const sections=previous.sections.filter(s=>!affected.includes(s.id));return sections.length?{...previous,sections}:null;});setNotes({});}}
 function setConvention(value){if(!Object.hasOwn(GL_SIGN_CONVENTIONS,value)||value===sign)return;setSign(value);setApproved(false);setSettingsStatus('GL convention selected: '+GL_SIGN_CONVENTIONS[value]+'. Existing report is recalculated for display; click Run Balancing to record new verified results.');persistPreference('sign-convention',value).catch(e=>setSettingsStatus('GL sign convention selected for this browser session, but NOT SAVED for this credit union: '+e.message));}
 async function reviewGL(){if(!files.gl){setError('Select a GL PDF or TXT file first.');return;}if(/(?:^|[^a-z])svst(?:[^a-z]|$)/i.test(files.gl.name)){setError('SVST is a share report, not a GL trial balance. Load it under Shares (SVST), and choose a separate GL Trial Balance file under GL.');return;}if(lock.current)return;lock.current=true;setBusy(true);setError('');setApproved(false);try{
 const data=await extractGL(files.gl,{onProgress:(n,total)=>setProgress(`Extracting PDF page ${n} of ${total}`),requestPassword:async retry=>prompt(retry?'Incorrect password. Try again:':'Enter PDF password (used only for this session):')});
 setReview({...data,file:files.gl});setModal('review');
 }catch(e){setReview(null);setError(e.message);}finally{setBusy(false);lock.current=false;setProgress('');}}
 async function run(){if(lock.current)return;if(coreSystem!=='xp2'){setError(CORE_SYSTEMS[coreSystem].label+' balancing is not validated. Configure its file adapter and rules before running reconciliation.');return;}if(!settingsReady){setError('Local settings are loading.');return;}setError('');setUnmapped([]);const runRoles=loadedRunRoles(page,files);if(runRoles.length===1){setError('Load at least one supporting file: Shares, Loans or Cash for this workspace.');return;}if(mode==='real'){const missing=[];if(!files.gl)missing.push('Load the shared GL file beneath this workspace.');if(missing.length){setError('Before running: '+missing.join(' '));return;}}if(mode==='demo'&&Object.values(files).some(Boolean)){setError('Clear selected files before starting a synthetic demo.');return;}
 lock.current=true;setBusy(true);setNotes({});setProgress('Validating and balancing source files');
 try{let sections,meta=null;let runReview=review;let missingLinks=[];
 if(mode==='real'&&(!runReview||runReview.file!==files.gl||!approved)){
   if(/(?:^|[^a-z])svst(?:[^a-z]|$)/i.test(files.gl.name))throw Error('SVST is a share report, not a GL trial balance. Select the correct GL file.');
   setProgress('Extracting and validating GL balances');
   const extracted=await extractGL(files.gl,{onProgress:(n,total)=>setProgress(`Extracting GL PDF page ${n} of ${total}`),requestPassword:async retry=>prompt(retry?'Incorrect password. Try again:':'Enter PDF password (used only for this session):')});
   if(!extracted.records?.length||!extracted.accountCount)throw Error('No valid GL account balances found. Check that the correct GL trial balance report was selected.');
   if(extracted.records.some(r=>!r.account||!Number.isFinite(r.cents)))throw Error('GL extraction contained invalid account records or balances. Check the source report.');
   runReview={...extracted,file:files.gl};setReview(runReview);setApproved(true);
 }
 if(mode==='demo')sections=structuredClone(DEMO_SECTIONS);else{
 const [sv,ln,cb]=await Promise.all([runRoles.includes('svst')?files.svst.text():'',runRoles.includes('lnst')?files.lnst.text():'',runRoles.includes('cobd')?files.cobd.text():'']);const shares=parseCoreCodes(sv,'shares'),loans=parseCoreCodes(ln,'loans'),cash=parseCOBD(cb);
 if((runRoles.includes('svst')&&!Object.keys(shares).length)||(runRoles.includes('lnst')&&!Object.keys(loans).length)||(runRoles.includes('cobd')&&!cash.branches.length))throw Error('A source export contains no recognized records. Check the report format.');
 missingLinks=Object.entries({SVST:shares,LNST:loans,COBD:Object.fromEntries(cash.branches.map(b=>['TOTALS FOR BRANCH NBR '+Number(b.num),Math.round(b.total*100)]))}).flatMap(([source,balances])=>Object.entries(balances).filter(([code,cents])=>cents!==0&&!master.entries.some(e=>e.source===source&&e.code===code)).map(([code,cents])=>({source,code,cents})));setUnmapped(missingLinks); // Report unmapped balances separately without blocking mapped-account reconciliation.
 sections=buildMappedSections((runRoles.includes('svst')?normalizeSVSTAccountTypes(master.entries,sv):master.entries).filter(e=>runRoles.includes(e.source==='SVST'?'svst':e.source==='LNST'?'lnst':'cobd')),normalizeGL(runReview,sign),shares,loans,cash,page);
 const hashes=await Promise.all(Object.entries(files).filter(([role,f])=>f&&runRoles.includes(role)).map(async([role,f])=>({role,size:f.size,sha256:Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await f.arrayBuffer())),b=>b.toString(16).padStart(2,'0')).join('')})));
 meta={parser:runReview.parser,pageCount:runReview.pageCount,accountCount:runReview.accountCount,records:runReview.records,signConvention:sign,files:hashes,mapping:{name:master.name,version:master.version,entries:master.entries}};
 }
 sections=sections.map(s=>({...s,rows:s.rows.map(r=>({...r,executed:true}))}));const rows=sections.flatMap(s=>s.rows).filter(r=>!r.branchOnly);const issues=rows.filter(r=>!r.ok).length;const run={id:crypto.randomUUID(),timestamp:new Date().toISOString(),workspace:page,mode,sections,meta,checks:rows.length,issues,unmapped:missingLinks};setResult(previous=>({...run,sections:[...(previous?.sections||[]).filter(s=>!sections.some(next=>next.id===s.id)),...sections]}));setActivity(p=>[run,...p]);setExpanded({});
  if(centralTenant){
   try{
    const fingerprints=(run.meta?.files||[]).map(x=>({role:x.role,sha256:x.sha256}));
    await tenantAPI('save-run',{tenantId:activeCU,body:{run:{id:run.id,workspace:run.workspace,mode:run.mode,status:missingLinks.length?'partial':issues?'exceptions':'balanced',checkCount:run.checks,issueCount:issues,unmappedCount:missingLinks.length,sourceCount:fingerprints.length,sourceHashes:fingerprints,ruleVersion:run.meta?.mapping?.version||null}}});
    setHistoryStatus('Balancing summary saved to credit union history.');
    const history=await tenantAPI('runs',{tenantId:activeCU});setHistoricalRuns(history.runs);
   }catch(e){setHistoryStatus('Balancing finished locally, but history was not saved: '+e.message);}
  }
  await recordAction('balancing_run',issues?'exception':'completed');
 }catch(e){setError(e.message);}finally{setBusy(false);lock.current=false;setProgress('');}}
 function clear(){if(lock.current||!confirm('Clear all session files, results, notes and activity? Downloaded copies remain on your device.'))return;setFiles({});setDraftResult(null);setReview(null);setApproved(false);setResult(null);setNotes({});setActivity([]);setError('');setMappingOK(false);setModal(null);setFolder(null);setFolderConnection('missing');setCandidates([]);setFolderStatus('');setDatesConfirmed(false);}
 function exportEvidence(){if(!result)return;recordAction('evidence_export','completed');if(confirm('This export contains financial balances and notes. Save only in an approved location.'))download('abacus-run-evidence.json',JSON.stringify({build:'ABACUS React 0.3.0',warning:'Unsigned session evidence; not an immutable audit ledger or verified user identity.',run:result,notes},null,2),'application/json');}

 function stageFiles(list){if(list.length>200){setFolderStatus('More than 200 files detected. Narrow the export folder before scanning; no partial import was staged.');setCandidates([]);return;}const found=classifyCoreFiles(list,coreSystem);setFiles({});setReview(null);setApproved(false);setResult(null);setDraftResult(null);setEftResult(null);setAtmResult(null);setCandidates(found);setDatesConfirmed(false);const identified=found.filter(item=>item.role).length;setFolderStatus(coreIngestion(coreSystem).adapter?identified+' of '+found.length+' candidate files recognized by XP2 filename rules. Resolve ambiguous or duplicate roles; verify report dates, then click Load selected files. This scan alone does not validate file contents.':'Found '+found.length+' files. '+CORE_SYSTEMS[coreSystem].label+' source definitions are not verified; no automatic role assignment or reconciliation is permitted.');}
 async function chooseFolder(){if(!window.showDirectoryPicker){folderInput.current?.click();return;}try{const handle=await window.showDirectoryPicker({mode:'read'});setFolder(handle);setFolderConnection('ready');try{await rememberFolder(handle,folderScope);setFolderPreferenceStatus('Folder access saved on this browser and device.');}catch(error){setFolderPreferenceStatus('Folder connected for this session, but browser permission could not be remembered: '+error.message);}if(centralTenant){try{await persistPreference('folder-name',handle.name);setBackendFolderName(handle.name);setFolderPreferenceStatus('Folder name saved in credit union database; permission saved locally on this device.');}catch(e){setFolderPreferenceStatus('Folder access retained locally, but backend folder name was NOT saved: '+e.message);}}await checkFolder(handle);}catch(e){if(e.name!=='AbortError')setFolderStatus(e.message);}}
 async function checkFolder(handle=folder){
  if(!handle)return;
  try{
    if(handle.queryPermission&&await handle.queryPermission({mode:'read'})!=='granted'){
      if(!handle.requestPermission||await handle.requestPermission({mode:'read'})!=='granted'){
        setFolderConnection('reconnect');setFolderStatus('Folder permission was not granted. Click Check folder to retry or choose another folder.');return;
      }
    }
    setFolderConnection('ready');
    const list=[];
    async function sweep(directory,depth){
      if(depth>3)throw Error('Folder nesting exceeds three levels. Choose a shallower export folder.');
      for await(const entry of directory.values()){
        if(entry.kind==='file'){list.push(await entry.getFile());if(list.length>200)throw Error('More than 200 files detected. Choose a smaller export folder; no partial import was staged.');}
        else if(entry.kind==='directory')await sweep(entry,depth+1);
      }
    }
    await sweep(handle,0);stageFiles(list);
  }catch(e){setCandidates([]);setFolderStatus('Folder scan stopped: '+e.message);}
 }
 function importCandidates(){if(coreSystem!=='xp2'){setFolderStatus(CORE_SYSTEMS[coreSystem].label+' report adapters are not validated. Import is disabled until source specifications and parsers are approved.');return;}const chosen=candidates.filter(c=>c.role);if(candidates.some(c=>c.status==='ambiguous'&&!c.role)){setFolderStatus('Some file names match multiple roles. Review them before importing.');return;}if(!chosen.length){setFolderStatus('No recognized report files selected.');return;}const roles=chosen.map(c=>c.role);if(new Set(roles).size!==roles.length){setFolderStatus('Choose only one file per role. Duplicate roles must be resolved.');return;}if(chosen.some(c=>!c.file.size||c.file.size>10*1024*1024||!(c.role==='gl'?/\.(pdf|txt)$/i:c.role==='account'||c.role.startsWith('atm_')?/\.csv$/i:['draftgl','eftgl'].includes(c.role)?/\.pdf$/i:/\.txt$/i).test(c.file.name))){setFolderStatus('Unsupported file type or size. Files must be nonempty and under 10 MB.');return;}for(const c of chosen)changeFile(c.role,c.file);setFolderStatus('Selected files loaded. Review the shared GL and run the selected workspace.');}
 async function viewGL(){
  if(!files.gl)return;
  if(lock.current)return;
  lock.current=true;setBusy(true);setError('');
  try{
   const data=review?.file===files.gl?review:await extractGL(files.gl,{
    onProgress:(n,total)=>setProgress(`Extracting GL PDF page ${n} of ${total}`),
    requestPassword:async retry=>prompt(retry?'Incorrect password. Try again:':'Enter PDF password (used only for this session):')
   });
   if(!data.records?.length)throw Error('No valid GL account balances found. Check the selected file.');
   setReview({...data,file:files.gl});
   setModal({type:'gl-view'});
  }catch(e){setError(e.message);}finally{setBusy(false);lock.current=false;setProgress('');}
 }
 async function viewReference(key){try{if(!files[key])return;if(key==='gl'){await viewGL();return;}if(key==='draftgl'){setModal({title:'Share Draft clearing GL detail',text:'Supporting PDF selected: '+files[key].name+'. Automatic comparison of this GL detail format is pending.'});return;}setModal({title:defs.find(d=>d[0]===key)[1],text:await files[key].text()});}catch(e){setError(e.message);}}
 const visibleRun=displayRunForSign(result,sign);
 const displaySections=coreSystem==='xp2'?buildMappedSections(master.entries,{}, {}, {}, {branches:[],total:0},'overview').map(s=>({...s,rows:s.id==='cash'&&visibleRun?.sections.some(x=>x.id==='cash')?visibleRun.sections.find(x=>x.id==='cash').rows:s.rows.map(r=>visibleRun?.sections.find(x=>x.id===s.id)?.rows.find(x=>x.gl===r.gl&&x.desc===r.desc)||r)})):[];
 const sections=selectSections(displaySections,page).map(s=>({...s,rows:page==='overview'?s.rows.filter(r=>r.executed):s.rows})).filter(s=>s.rows.length);
 const title=navigation.find(n=>n[2]===page)[1];
 const balancing=['overview','shares-loans','cash','exceptions'].includes(page);
 const rows=sections.flatMap(s=>s.rows).filter(r=>!r.branchOnly&&r.executed);
 return <div className="app"><aside><a className="brand" href="#overview" onClick={e=>{e.preventDefault();setPage('overview');}}>▦ <span>ABACUS<small>BALANCING</small></span></a><nav aria-label="Main navigation">{sidebarNavigation.filter(([, ,id])=>id!=='platform'&&id!=='platform-activity'||(account.role==='admin'&&(id==='platform'||account.username.toLowerCase()==='admin99'))).map(([group,label,id])=><React.Fragment key={id}>{group&&<div className="side-label">{group}</div>}<button aria-current={page===id?'page':undefined} className={page===id?'nav-item nav-current':'nav-item'} onClick={()=>setPage(id)}>{label}</button>{page===id&&sourceRoles[id]&&<div className="nav-files">
 <p>{coreIngestion(coreSystem).adapter?'Folder-first import • file requirements vary by module.':'Source adapter pending for '+CORE_SYSTEMS[coreSystem].label+'.'}</p>
 <button type="button" onClick={()=>setPage('settings')} style={{width:'100%',fontSize:12}}>Open folder import</button>
 <p>{sourceCoverage(coreSystem,id,files,candidates).matched.length} identified source role(s){sourceCoverage(coreSystem,id,files,candidates).required.length?' / '+sourceCoverage(coreSystem,id,files,candidates).required.length+' expected':''}</p>
 </div>}</React.Fragment>)}</nav><div className="side-foot">LOCAL PROCESSING<br/><span>Files remain in browser memory.<br/>No financial-data upload service.</span></div></aside>
 <div className="workspace"><header><span>{unions.find(u=>u.id===activeCU)?.name||cuName||"Credit union"} / {CORE_SYSTEMS[coreSystem].label} / {title}</span>{account.role!=='guest'&&<select aria-label="Active credit union" value={activeCU} onChange={e=>{setActiveCU(e.target.value);setHistoryStatus('');}} disabled={busy}><option value="local-demo">Select credit union</option>{unions.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}</select>}<div className="header-actions">{balancing&&page!=='shares-loans'&&page!=='cash'&&<button className="primary" disabled={busy||coreSystem!=='xp2'} onClick={run}>{busy?'Processing…':'Run balancing →'}</button>}<span className="privacy-dot" title="Files processed locally">{account.username} · Local session</span>{account.role!=='guest'&&<button type="button" onClick={onLogout}>Log out</button>}<button disabled={!result||busy} onClick={exportEvidence}>Export evidence</button>{page!=='shares-loans'&&page!=='cash'&&<button disabled={!result||busy} onClick={()=>window.print()}>Print / PDF</button>}</div></header>
 <main>{coreSystem!=='xp2'&&['shares-loans','cash','drafts','eft','atm','ach'].includes(page)&&<section className="folder-settings" role="status"><h2>{CORE_SYSTEMS[coreSystem].label} source adapter pending</h2><p>File counts, report layouts, account mappings and balancing controls have not been verified for this core. XP2 parsing is not used as a substitute; reconciliation is blocked until vendor-specific evidence is validated.</p><button type="button" onClick={()=>setPage('settings')}>Review source setup</button></section>}{page==='help'&&<Help/>}{page==='platform-activity'&&account.role==='admin'&&account.username.toLowerCase()==='admin99'&&<PlatformActivity/>}{page==='overview'&&folderConnection!=='checking'&&folderConnection!=='ready'&&<section className="folder-settings" role="status" aria-label="Reconciliation folder setup needed" style={{marginBottom:16,borderLeft:'4px solid #b37b24'}}>
  <h2>{folderConnection==='reconnect'?'Reconciliation folder needs access':'Reconciliation folder not set up'}</h2>
  <p>{folderConnection==='reconnect'?'Your saved folder is not currently authorized on this browser. Reconnect it before importing new reports.':'No reconciliation folder is connected for this credit union on this browser. Set up the folder to scan and identify source files.'}</p>
  <button className="primary" type="button" onClick={()=>{setJumpToFolder(true);setPage('settings');}}>Set up reconciliation folder</button>
 </section>}{page==='overview'&&<section className="abacus-exec-overview"><h2>Reconciliation status <small>Current browser session</small></h2><div className="abacus-exec-grid">{[
 {label:'Shares, Loans & Cash',value:result?.checks??'—',hint:'Checks from latest reconciliation'},
 {label:'Share Draft issues',value:draftResult?.checks?.filter(c=>c.ok===false).length??'—',hint:'From latest check review'},
 {label:'EFT issues',value:eftResult?.issues?.length??'—',hint:'From latest EFT review'},
 {label:'ATM issues',value:atmResult?.checks?.filter(c=>c.ok===false).length??'—',hint:'From latest ATM review'}
 ].map(k=><div className="abacus-exec-tile" key={k.label}><span>{k.label}</span><strong>{k.value}</strong><small>{k.hint}</small></div>)}</div><p>This is verified session activity only; historical trends, exception aging, account certification and durable audit history require the planned persistent run store.</p></section>}{page==='overview'&&<section className="dashboard-quicklinks" aria-label="Dashboard detail views"><button type="button" onClick={()=>setPage('exceptions')}>Exceptions <span aria-hidden="true">→</span></button><button type="button" onClick={()=>setPage('history')}>Balancing History <span aria-hidden="true">→</span></button></section>}{['exceptions','history'].includes(page)&&<div className="dashboard-back"><button type="button" onClick={()=>setPage('overview')}>← Back to Dashboard</button></div>} {page==='settings'&&<section className="folder-settings" aria-label="AI settings"><h2>AI investigation assistant</h2><p><strong>Current setting: {aiEnabled?'On':'Off'}</strong>{aiSaving?' (saving…)':''}</p><button type="button" className={aiEnabled?'':'primary'} style={{padding:'13px 20px',fontSize:15,minWidth:230}} aria-pressed={aiEnabled} disabled={aiSaving} onClick={()=>changeAiEnabled(!aiEnabled)}>{aiSaving?'Saving…':aiEnabled?'Disable AI investigation assistant':'Enable AI investigation assistant'}</button><p>Off by default. This setting is saved per credit union. When enabled, an interactive local ATM investigation chat appears on ATM Balancing, including before a report is run. United Solutions private AI integration is not connected, and no financial files are sent to an external AI provider.</p>{aiEnabled&&<button type="button" onClick={()=>setPage('atm')}>Open ATM investigation chat →</button>}{!settingsReady&&<p role="status">Settings are still loading; a save attempt will report this status.</p>}{aiNotice&&<p role={aiNotice.includes('could not be saved')?'alert':'status'} style={{fontWeight:650,color:aiNotice.includes('could not be saved')?'#a33331':'#246251'}}>{aiNotice}</p>}</section>}
{page==='settings'&&<section className="folder-settings" aria-label="GL sign convention settings"><h2>GL balance sign convention</h2><label htmlFor="gl-sign-convention">How should ABACUS interpret signed trial balance amounts?</label><select id="gl-sign-convention" value={sign} disabled={!settingsReady||busy} onChange={e=>setConvention(e.target.value)}>{Object.entries(GL_SIGN_CONVENTIONS).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select><p>{sign==='natural'?'Use the balances exactly as supplied. Select this for the original synthetic demo GL trial balance, where all amounts are positive.':sign==='credit-negative'?'Reverse only share and certificate liability GL balances (90x accounts). Use when these liabilities are exported as credits/negative while assets remain positive.':'Reverse every GL balance, including loans and cash. Use only when the entire trial balance is exported with the opposite sign convention.'}</p><p>Variance = core report balance − normalized GL balance. ABACUS keeps the original trial balance file unchanged and never applies absolute-value matching. Changing this selection recalculates the currently displayed result immediately as a preview. Click Run Balancing to save a new verified run with this convention.</p></section>}
 {page==='settings'&&<section className="folder-settings"><h2>Core system</h2><label htmlFor="core-system-selection">Select core processing system</label><select id="core-system-selection" aria-label="Core system" value={coreSystem} disabled={busy} onChange={e=>changeCoreSystem(e.target.value)}><option value="xp2">XP2</option><option value="datasafe">DataSafe</option><option value="portico">Portico</option></select><p>{CORE_SYSTEMS[coreSystem].validation}. DataSafe and Portico currently use provisional XP2-derived mapping/processing assumptions. Their vendor-specific files are not validated; do not use for production certification.</p><p>{centralTenant?'Core system saved centrally for this credit union.':'The selected system is saved on this browser.'} No source files or member details are uploaded.</p></section>}{page==='settings'&&<GLMappingImport tenantId={activeCU} coreSystem={coreSystem} master={master} version={mappingVersion} canSave={centralTenant&&settingsReady&&!busy&&coreSystem==='xp2'} onSaved={(mapping,nextVersion)=>{setMaster(mapping);setMappingVersion(nextVersion);setResult(null);setReview(null);setApproved(false);setMappingOK(false);setSettingsStatus('New GL mapping saved. Prior balancing results cleared; run reconciliation again.');}}/>}
 {page==='platform'&&account.role==='admin'&&<section className="folder-settings" aria-label="AI integration settings"><h2>AI Integration Settings</h2><p>Configure the enterprise AI endpoint shared across the Abacus platform. No external AI connectivity is active yet.</p><fieldset style={{border:0,padding:0,margin:'0 0 14px'}}><legend><strong>AI Provider</strong></legend>{[['united-openai','United Solutions — OpenAI-compatible API'],['united-ollama','United Solutions — Ollama API'],['custom','Custom enterprise API']].map(([value,label])=><label key={value} style={{display:'block',margin:'10px 0'}}><input type="radio" name="ai-provider" checked={aiIntegration.provider===value} onChange={()=>setAiIntegration(p=>({...p,provider:value}))} disabled={!aiPlatformReady||aiIntegrationSaving}/> {label}</label>)}</fieldset><label htmlFor="ai-base-url">API Base URL</label><input id="ai-base-url" type="url" placeholder="https://ai.internal.example.com/v1" value={aiIntegration.baseUrl} onChange={e=>setAiIntegration(p=>({...p,baseUrl:e.target.value}))} disabled={!aiPlatformReady||aiIntegrationSaving} autoComplete="off"/><label htmlFor="ai-model-id">Model Identifier</label><input id="ai-model-id" type="text" placeholder="Provided by United Solutions IT" value={aiIntegration.model} onChange={e=>setAiIntegration(p=>({...p,model:e.target.value}))} disabled={!aiPlatformReady||aiIntegrationSaving} autoComplete="off"/><label htmlFor="ai-auth-method">Authentication Method</label><select id="ai-auth-method" value={aiIntegration.authMethod} onChange={e=>setAiIntegration(p=>({...p,authMethod:e.target.value}))} disabled={!aiPlatformReady||aiIntegrationSaving}><option value="oauth-sso">OAuth / Single Sign-On</option><option value="server-token">Server-managed API token</option><option value="mtls">Mutual TLS (server-managed)</option></select><button type="button" className="primary" style={{marginTop:15}} disabled={!aiPlatformReady||aiIntegrationSaving} onClick={saveAiIntegration}>{aiIntegrationSaving?'Saving…':'Save AI integration settings'}</button>{aiIntegrationNotice&&<p role="status">{aiIntegrationNotice}</p>}<p><small>Do not enter API keys, passwords, tokens or member information here. Authentication secrets belong on the private application server. Saving these fields does not send financial data to any provider.</small></p></section>}
 {progress&&<div role="status" className="progress">{progress}</div>}{error&&<div role="alert" className="error">{error}</div>}

 {(page==='shares-loans'||page==='cash')&&<div className="folder-settings" style={{marginBottom:12,padding:'12px 18px'}}><label htmlFor="balancing-gl-sign"><strong>GL sign convention used for this balancing run</strong></label><select id="balancing-gl-sign" value={sign} disabled={busy||!settingsReady} onChange={e=>setConvention(e.target.value)}>{Object.entries(GL_SIGN_CONVENTIONS).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select><p>For the supplied positive synthetic GL trial balance choose <strong>As reported (no sign changes)</strong>. The selected convention is used when you click Run Balancing; original GL file values remain unchanged.</p></div>}
 {(page==='shares-loans'||page==='cash')&&<div className="draft-actions shares-loans-actions"><button type="button" className="primary" disabled={busy||coreSystem!=='xp2'} onClick={run}>{busy?'Processing…':'Run Balancing'}</button><button type="button" disabled={!result||busy} onClick={()=>window.print()}>Print / PDF</button></div>}
 {balancing&&coreSystem==='xp2'&&!result&&!(page==='overview'&&(draftResult||eftResult))&&!unmapped.length&&<section className="run-welcome"><div className="run-welcome-icon" aria-hidden="true">⚖</div><h2>{files.gl&&loadedRunRoles(page,files).length>1?(approved&&review?.file===files.gl&&mappingOK?'All files loaded — ready to run':'Files loaded — ready to run'):'Ready to balance'}</h2><p>{files.gl&&loadedRunRoles(page,files).length>1?(approved&&review?.file===files.gl&&mappingOK?'Hit Run Balancing to generate the balancing report.':'Run balancing will validate the GL and reconcile loaded source reports.'):'Open Settings → Folder import to scan source reports, then load the identified files to get started.'}</p><div className="source-section-list">{(page==='overview'?[['Shared GL',['gl']],['Shares, Loans and Cash',['svst','lnst','cobd']],['Share Drafts',['sdps','sdre','sdrt','draftgl']],['EFT',['eftday','eftstar','eftatm','eftrejects','eftteller','eftgl']],['ATM Balancing',['atm_transactions','atm_cash','atm_settlement','atm_gl']],['ACH',[]]]:[['Shares, Loans and Cash',['gl','svst','lnst','cobd']]]).map(([label,roles])=><section className="source-section-card" key={label}><h3>{label}</h3>{roles.length?<ul>{roles.map(role=><li key={role}><span>{defs.find(d=>d[0]===role)?.[1]}{role==='draftgl'?' (optional)':''}</span><span className={files[role]?'source-loaded':'source-missing'}>{files[role]?'✓ '+files[role].name:'Not selected'}</span></li>)}</ul>:<p>Source formats pending setup</p>}</section>)}</div></section>}
 {balancing&&result&&(<><div className="folder-settings" role="status" style={{marginBottom:12,padding:'12px 18px'}}><strong>GL sign convention:</strong> {GL_SIGN_CONVENTIONS[sign]}{result.meta?.records?.length>0&&<span style={{display:'block',marginTop:5}}>Original GL 901-0010: {result.meta.records.find(r=>r.account==='901-0010')?.rawBalance||'Unavailable'} · Normalized GL 901-0010: {normalizeGL({records:result.meta.records},sign)['901-0010']?.toLocaleString('en-US',{style:'currency',currency:'USD'})||'Unavailable'}</span>}{visibleRun?.signPreview&&<span style={{display:'block',color:'#9b3c16'}}>Recalculated display preview from the original GL balances. The saved run used {GL_SIGN_CONVENTIONS[result.meta.signConvention]||result.meta.signConvention}. Click Run Balancing to record the new result.</span>}</div><div className="html-report-overview"><div className="html-report-overview-head"><div className="html-report-date">{new Date(result.timestamp).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})} <span className={rows.every(r=>r.ok)&&!unmapped.length?'html-run-ok':'html-run-partial'}>{rows.every(r=>r.ok)&&!unmapped.length?'Balanced':unmapped.length?'Partial Reconciliation':'Exceptions'}</span></div><div className="html-report-subtitle">{new Date(result.timestamp).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})} · {files.gl?'GL '+files.gl.name:'Demo data'}</div></div><div className="html-stat-grid">{[{label:'SECTIONS',value:sections.length,hint:'reconciled'},{label:'CHECKS',value:rows.filter(r=>r.ok).length,hint:'balanced'},{label:'VARIANCES',value:rows.filter(r=>!r.ok).length,hint:'exceptions'},{label:'SHARES',value:compactReportMoney(sections.filter(s=>['shares','certs'].includes(s.id)).flatMap(s=>s.rows).filter(r=>r.executed&&!r.branchOnly).reduce((n,r)=>n+parseReportMoney(r.svst),0)),hint:'total deposits'},{label:'LOANS',value:compactReportMoney(sections.filter(s=>s.id==='loans').flatMap(s=>s.rows).filter(r=>r.executed&&!r.branchOnly).reduce((n,r)=>n+parseReportMoney(r.svst),0)),hint:'total loans'},{label:'CASH',value:compactReportMoney(sections.filter(s=>s.id==='cash').flatMap(s=>s.rows).filter(r=>r.executed&&!r.branchOnly).reduce((n,r)=>n+parseReportMoney(r.svst),0)),hint:'on hand'}].map((stat,i)=><div className="html-stat-card" key={stat.label}><small>{stat.label}</small><strong className={(i===1||i===2&&stat.value===0||i===5)?'green':''}>{stat.value}</strong><span>{stat.hint}</span></div>)}</div></div><div className="report-view-switch" role="group" aria-label="Reconciliation report view"><button type="button" className={reportView==='summary'?'selected':''} aria-pressed={reportView==='summary'} onClick={()=>setReportView('summary')}>Summary</button><button type="button" className={reportView==='detail'?'selected':''} aria-pressed={reportView==='detail'} onClick={()=>setReportView('detail')}>Detail</button></div>
 {unmapped.length>0&&<p role="status" className="partial-report-notice">PARTIAL RECONCILIATION: {unmapped.length} unmapped source account type(s) excluded; mapped accounts only.</p>}
 {sections.map(section=>{const sectionRows=section.rows.filter(r=>r.executed&&!r.branchOnly);const total=(field)=>sectionRows.reduce((sum,r)=>{const v=r[field];if(typeof v==='number')return sum+v;if(typeof v!=='string'||!/[0-9]/.test(v))return sum;const parsed=Number(v.replace(/[$,()\s]/g,'').replace(/,/g,''));return sum+(Number.isFinite(parsed)?parsed*(v.includes('(')?-1:1):0)},0);const sectionOK=sectionRows.every(r=>r.ok);const detailMode=reportView==='detail';return <section className="result-section html-report" key={section.id}><div className="html-section-heading"><h2>{section.label}</h2><div className="html-section-actions"><span className={sectionOK?'html-section-ok':'html-section-error'}>{sectionOK?'OK':sectionRows.filter(r=>!r.ok).length+' exceptions'}</span><div className="html-switch" role="group" aria-label={section.label+' report view'}><button className={!detailMode?'selected':''} onClick={()=>{setReportView('summary');setExpanded({})}}>Summary</button><button className={detailMode?'selected':''} onClick={()=>{setReportView('detail');setExpanded(Object.fromEntries(sectionRows.map(r=>[section.id+':'+r.gl,true])))}}>Detail</button></div></div></div><div className="table-scroll"><table className="html-report-table"><thead><tr><th>GL #</th><th>DESCRIPTION</th><th>{section.id==='loans'?'LNST TYPES':section.id==='cash'?'COBD BRANCH':'SVST TYPES'}</th><th>{section.id==='loans'?'LNST BALANCE':section.id==='cash'?'COBD BALANCE':'SVST BALANCE'}</th><th>TRIAL BALANCE</th><th>VARIANCE</th><th>STATUS</th></tr></thead><tbody>{sectionRows.map((r,i)=>{const rowKey=section.id+':'+r.gl;const opened=expanded[rowKey]===undefined?detailMode:!!expanded[rowKey];return <React.Fragment key={rowKey+':'+i}><tr className={opened?'html-open-row':r.ok?'':'exception'}><td><button className="html-gl-expand" aria-expanded={opened} onClick={()=>setExpanded(prev=>({...prev,[rowKey]:!opened}))}>{r.gl} <span>{opened?'▾':'▸'}</span></button></td><td>{r.desc}</td><td><div className="html-type-badges">{(r.codes||[]).map(c=><span key={c}>{c}</span>)}</div></td><td className="html-money">{r.svst}</td><td className="html-money">{r.tb}</td><td className={r.ok?'html-variance-ok':'html-variance-bad'}>{r.varRaw==null?r.var:money(r.varRaw)}</td><td><span className={r.ok?'html-status-good':'html-status-bad'}>{r.ok?'Balanced':'Exception'}</span></td></tr>{opened&&<tr className="html-breakdown-row"><td colSpan={7}><div className="html-breakdown"><div className="html-breakdown-label">{section.id==='loans'?'LNST':section.id==='cash'?'COBD':'SVST'} TYPE BREAKDOWN</div>{(r.codeData||[]).map(d=><div className="html-breakdown-item" key={d.code}><strong>{d.code}</strong><span>{d.amt==null?'Missing':money(d.amt)}</span></div>)}<div className="html-breakdown-total">Total <strong>{r.svst}</strong></div></div></td></tr>}</React.Fragment>})}<tr className="html-section-total"><td colSpan={3}>Section total</td><td className="html-money">{money(total('svst'))}</td><td className="html-money">{money(total('tb'))}</td><td className="html-money">{money(total('varRaw'))}</td><td/></tr></tbody></table></div></section>})}</>)}
 {!balancing&&page!=='history'&&page!=='settings'&&page!=='drafts'&&page!=='eft'&&page!=='atm'&&page!=='help'&&page!=='platform-activity'&&page!=='platform'&&<section className="empty"><h2>{page==='ach'?'ACH balancing — setup pending':title}</h2><p>{page==='ach'?'ACH source formats, settlement dates, and matching rules must be configured before balancing is available. No ACH results are generated.':page==='audit'?'Export evidence for the current run using the header button. Evidence is unsigned and session-only.':page==='mapping'?'Review the current fixed mapping profile. Mapping editing is not yet available.':'Session settings apply to all balancing workspaces. Data and history clear on refresh.'}</p>{page==='mapping'&&<MasterMapping master={master}/>}</section>}

 {page==='atm'&&coreSystem==='xp2'&&<ATM aiEnabled={aiEnabled} files={files} setFiles={setFiles} onReview={value=>{setAtmResult(value);recordAction('atm_demo_review',value.checks.some(c=>!c.ok)?'exception':'completed');}}/>}
 {page==='eft'&&coreSystem==='xp2'&&<EFT files={files} data={eftResult} setData={value=>{setEftResult(value);if(value)recordAction('eft_review',value.issues.length?'exception':'completed');}}/>}
 {page==='overview'&&eftResult&&<div className="overview-drafts"><h2>EFT — latest review</h2><EFT files={files} data={eftResult} setData={setEftResult} readOnly/></div>}
 {page==='drafts'&&coreSystem==='xp2'&&<ShareDrafts files={files} busy={busy} data={draftResult} setData={value=>{setDraftResult(value);if(value)recordAction('draft_checks',value.checks.some(c=>c.ok===false)?'exception':'completed');}}/>}
 {page==='settings'&&<section id="folder-import" className="folder-settings" onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();if(!busy)stageFiles(e.dataTransfer.files);}}><h2>Folder import &amp; file coverage</h2><p><strong>Selected core: {CORE_SYSTEMS[coreSystem].label}</strong> — {coreIngestion(coreSystem).note}</p><p>Choose a folder and its location is saved automatically on this browser and device. Click Check folder when exports are ready; your browser may ask you to allow access again. Financial files and run data are not saved. Originals are untouched.</p><button disabled={busy} onClick={chooseFolder}>Choose folder</button> <button disabled={busy||!folder} onClick={()=>checkFolder()}>Check folder</button><p role="status">{folderPreferenceStatus}</p><p><button disabled={busy} onClick={async()=>{try{await forgetFolder(folderScope);setFolder(null);setFolderConnection('missing');setCandidates([]);setFolderPreferenceStatus('Saved browser folder selection removed.');setFolderStatus('');if(centralTenant){try{await persistPreference('folder-name','');setBackendFolderName('');setFolderPreferenceStatus('Browser folder and backend folder name cleared.');}catch(e){setFolderPreferenceStatus('Browser folder cleared; backend folder name could not be cleared: '+e.message);}}}catch(error){setFolderPreferenceStatus(error.message);}}}>Forget folder</button></p><input ref={folderInput} type="file" webkitdirectory="" multiple hidden onChange={e=>stageFiles(e.target.files)}/><p><strong>Backend folder name:</strong> {backendFolderName||'Not configured'} · <strong>Current device:</strong> {folder?.name||'No folder access'}.</p><p>The database stores only the folder name, not the file contents, local directory path, or browser access permission. You can also drop files here.</p>{!window.showDirectoryPicker&&<p>This browser supports importing a folder for this session only. Use Chrome or Edge with the app open directly over HTTPS to remember folder access.</p>}<p role="status">{folderStatus}</p>
 {coreIngestion(coreSystem).adapter&&<section aria-label="Module file readiness" style={{padding:'12px 0'}}>
  <h3>Source coverage by module</h3>
  <p>Readiness here only means required file names were identified; report dates and formats are checked separately. A module is never certified by this screen.</p>
  <div className="table-scroll"><table><thead><tr><th>MODULE</th><th>IDENTIFIED</th><th>MISSING</th><th>STATUS</th></tr></thead><tbody>
   {['shares-loans','cash','drafts','eft','atm','ach'].map(module=>{const coverage=sourceCoverage(coreSystem,module,files,candidates);return <tr key={module}><td>{navigation.find(n=>n[2]===module)?.[1]||module}</td><td>{coverage.matched.length} / {coverage.required.length}</td><td>{coverage.missing.join(', ')||'—'}</td><td>{coverage.duplicates.length?'Duplicate roles':coverage.missing.length?'Missing files':'Names identified only'}</td></tr>;})}
  </tbody></table></div></section>}
 {candidates.length>0&&<><div className="table-scroll"><table><thead><tr><th>FILE</th><th>ROLE</th><th>RECOGNITION</th></tr></thead><tbody>{candidates.map(c=><tr key={c.index}><td>{c.file.name}</td><td><select aria-label={'Role for '+c.file.name} value={c.role} onChange={e=>{setDatesConfirmed(false);setCandidates(p=>p.map(x=>x.index===c.index?{...x,role:e.target.value}:x));}}><option value="">Ignore / unresolved</option>{defs.filter(([key])=>Object.hasOwn(coreIngestion(coreSystem).fileDefinitions,key)).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></td><td>{c.role?'Assigned (verify contents and date)':c.status==='ambiguous'?'Ambiguous — select a role':'Unknown — select a role or ignore'}</td></tr>)}</tbody></table></div><p>Verify business dates and report ownership before loading. File detection uses known naming patterns, not trusted content signatures. For unrecognized files, use the role dropdown to resolve individually; duplicate assignments cannot be loaded.</p><button className="primary" disabled={busy||coreSystem!=='xp2'} onClick={importCandidates}>Load identified files</button></>}</section>}
 {page==='settings'&&account.role==='guest'&&<section className="folder-settings"><h2>Centralized multi-tenant features</h2><p>Credit union administration, centrally saved settings, and persistent reconciliation history require an authenticated account. They are disabled while the temporary login bypass remains active. Current local balancing is unaffected.</p></section>}{page==='platform'&&account.role==='admin'&&<TenantAdministration account={account} activeCU={activeCU} unions={unions} onReload={loadTenants} onSelect={setActiveCU}/>} {page==='platform'&&account.role==='admin'&&<UserManagement/>}{page==='platform'&&account.role==='admin'&&account.username.toLowerCase()==='admin99'&&<section className="folder-settings"><h2>Platform-wide activity</h2><button type="button" onClick={()=>setPage('platform-activity')}>Open Activity Log across all credit unions</button></section>}{page==='settings'&&<><section className="folder-settings"><h2>Account mapping</h2><p>{CORE_SYSTEMS[coreSystem].label} mapping. {CORE_SYSTEMS[coreSystem].validation}. {centralTenant?'This credit union can store its GL mapping centrally with version control.':'Mapping is currently loaded from bundled local configuration.'}</p>{centralTenant&&account.role==='admin'&&<><p>Current central mapping version: {mappingVersion||'Not saved'}</p><button type="button" disabled={busy||coreSystem!=='xp2'} onClick={async()=>{if(!confirm('Save the currently displayed mapping for this credit union and core system?'))return;try{const r=await tenantAPI('save-mapping',{tenantId:activeCU,body:{coreSystem,mapping:master,version:mappingVersion}});setMaster(r.mapping);setMappingVersion(r.version);setSettingsStatus('Account mapping saved centrally.');}catch(e){setSettingsStatus('Account mapping not saved: '+e.message);}}}>Save mapping to credit union database</button></>}</section><MasterMapping master={master}/></>}
 {page==='settings'&&<section className="folder-settings"><h2>Local workspace</h2><p>Reconciliation files, results and notes remain in browser memory. {centralTenant?'XP2/DataSafe/Portico and balancing preferences are saved centrally; folder handles remain local.':'Settings are saved on this browser only until a credit union login and tenant are selected.'} Closing or refreshing this page clears financial data.</p><p>Workspace: {cuName}</p><p>Settings storage: {centralTenant?'Central PostgreSQL (core system, GL sign, AI, folder name) + separate backend GL mapping and user tables; local browser directory permission only':'Local IndexedDB only until an authenticated credit union is selected'}.</p>{settingsStatus&&<p role="status">{settingsStatus}</p>}</section>}
 {page==='history'&&centralTenant&&<section className="folder-settings"><h2>Saved reconciliation history</h2><p>Last 100 runs for this credit union. Only summary counts and source hashes are stored, not member files or account-level records.</p><div className="table-scroll"><table><thead><tr><th>Date</th><th>Module</th><th>Status</th><th>Checks</th><th>Issues</th></tr></thead><tbody>{historicalRuns.map(h=><tr key={h.id}><td>{new Date(h.run_at).toLocaleString()}</td><td>{h.workspace}</td><td>{h.status}</td><td>{h.check_count}</td><td>{h.issue_count}</td></tr>)}</tbody></table></div>{!historicalRuns.length&&<p>No saved runs for this credit union.</p>}</section>}{historyStatus&&<p role="status">{historyStatus}</p>}{(page==='overview'||page==='history'||page==='audit')&&<section className="activity"><h2>Session activity <span>{activity.length} runs</span></h2><p>This history is cleared on refresh. Export evidence for the current run before clearing.</p>{activity.map(a=><div className="activity-row" key={a.id}><span>{new Date(a.timestamp).toLocaleString()}</span><span>{a.mode==='demo'?'SYNTHETIC DEMO':'IMPORTED FILES'}</span><strong>{a.issues} exceptions / {a.checks} checks</strong></div>)}</section>}
 {page==='overview'&&draftResult&&<div className="overview-drafts"><h2>Share Drafts — latest run</h2><ShareDrafts files={files} busy={busy} data={draftResult} setData={setDraftResult} readOnly/></div>}
 <footer>ABACUS React · Local processing · {PARSER_VERSION}</footer></main></div>
 {modal&&<dialog ref={reviewDialog} onCancel={()=>{setModal(null);setSearch('');}}><div className="dialog-head"><h2>{modal?.type==='gl-view'?'GL account balances':modal==='review'?'Review extracted GL balances':modal==='mapping'?'Institution mapping profile':modal.title}</h2><button aria-label="Close dialog" onClick={()=>{setModal(null);setSearch('');}}>✕</button></div>{modal?.type==='gl-view'?<><p>{review?.accountCount||review?.records?.length||0} extracted GL accounts from {files.gl?.name}. View only — balancing approval is automatic.</p><input aria-label="Search GL accounts" placeholder="Search account number" value={search} onChange={e=>setSearch(e.target.value)}/><div className="table-scroll" style={{maxHeight:'55vh',overflowY:'auto'}}><table><thead><tr><th>GL ACCOUNT</th><th>BALANCE</th></tr></thead><tbody>{(review?.records||[]).filter(r=>String(r.account).includes(search.trim())).map((r,i)=><tr key={r.account+'-'+i}><td>{r.account}</td><td>{money(r.cents/100)}</td></tr>)}</tbody></table></div></>:modal==='mapping'?<><p>The active master account mapping is used for balancing.</p><pre>{JSON.stringify(master,null,2)}</pre></>:<pre>{modal.text}</pre>}</dialog>}
 </div>;
}
async function migrateInitialSettings(account){
 const old='local-browser:local-demo',next='user:'+account.id+':local-demo';
 for(const name of ['core-system','sign-convention']){
  const existing=await getSetting(next,name);
  if(existing!==undefined)continue;
  let value=await getSetting(old,name);
  if(name==='core-system'&&!value){try{value=localStorage.getItem('abacus-core-system');}catch{}}
  if(value!==undefined&&value!==null&&value!=='')await saveSetting(next,name,value);
 }
 const {recallFolder,rememberFolder}=await import('./folder-preferences.mjs');
 const saved=await recallFolder(old);
 if(saved&&!(await recallFolder(next)))await rememberFolder(saved,next);
}
function AuthGate(){
 const [account,setAccount]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState('');
 useEffect(()=>{let live=true;accountAPI('me').then(({user})=>{if(live)setAccount(user);}).catch(()=>{}).finally(()=>{if(live)setLoading(false);});return()=>{live=false;};},[]);
 async function onContinue(user,firstAccount){
  if(firstAccount){try{await migrateInitialSettings(user);}catch(e){console.warn('Existing local preference migration was unavailable:',e);}}
  setAccount(user);
 }
 async function onLogout(){setError('');try{await accountAPI('logout',{});setAccount(null);}catch(e){setError(e.message);}}
 if(loading)return <div className="abacus-login"><p>Loading ABACUS…</p></div>;
 if(!account)return <Login onContinue={onContinue}/>;
 return <>{error&&<div role="alert" className="error">{error}</div>}<App key={account.id} account={account} onLogout={onLogout}/></>;
}
createRoot(document.getElementById('root')).render(<AuthGate/>);
