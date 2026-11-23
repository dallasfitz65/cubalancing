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
import ProcessAssistant from './ProcessAssistant.jsx';
import {sourceRoles,selectSections,requiredRoles,suggestRole,loadedRunRoles} from './workspaces.mjs';
import {coreIngestion,classifyCoreFiles,sourceCoverage} from './core-ingestion-profiles.mjs';
import {selectUniqueSourceFiles} from './source-file-selection.mjs';
import {getSetting,saveSetting,deleteSetting} from './settings-table.mjs';
import Login,{accountAPI} from './Login.jsx';
// Production requires authenticated sessions for every reconciliation workspace.
// Previous local IndexedDB settings remain unchanged for first-login migration.
import UserManagement from './UserManagement.jsx';
import ChangePassword from './ChangePassword.jsx';
import PlatformActivity from './PlatformActivity.jsx';
import TenantAdministration from './TenantAdministration.jsx';
import CentralSettingsMigration from './CentralSettingsMigration.jsx';
import {tenantAPI,isServerTenant} from './tenant-api.mjs';
import Help from './Help.jsx';
import UserGuide from './UserGuide.jsx';
import SectionHelp from './SectionHelp.jsx';
import SettingsSwitch from './SettingsSwitch.jsx';
const defs=[['atm_transactions','ATM transaction journal','.csv'],['atm_cash','ATM cash count','.csv'],['atm_settlement','ATM network settlement','.csv'],['atm_gl','ATM GL balances','.csv'],['eftday','EFT core day totals','.txt'],['eftstar','STAR settlement','.txt'],['eftatm','ATM owner activity','.txt'],['eftrejects','EFT rejects','.txt'],['eftteller','Teller totals','.txt'],['eftgl','EFT GL detail','.pdf'],['gl','GL trial balance','.pdf,.txt'],['svst','Shares export','.txt'],['lnst','Loans export','.txt'],['cobd','Cash export','.txt'],['sdps','SDPS posting recap','.txt'],['sdre','SDRE processing report','.txt'],['sdrt','SDRT returns report','.txt'],['draftgl','Share Draft clearing GL detail','.pdf'],['account','Account reference (view only)','.csv']];
const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n);

function download(name,content,type){const u=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}

const navigation=[['','Overview','overview'],['RECONCILIATION','Shares, Loans and Cash','shares-loans'],['','Share Drafts','drafts'],['','EFT','eft'],['','ATM Reconciliation','atm'],['','ACH','ach'],['SETUP','Settings','settings'],['','Help & Rules','help'],['ADMIN','Platform','platform'],['','Platform Activity Log','platform-activity']];
// Keep dashboard destinations registered while hiding their sidebar entries.
const sidebarNavigation=navigation.filter(([, ,id])=>!['exceptions','history','audit'].includes(id));
const sectionWelcome={
 drafts:{title:'Share Drafts',icon:'▤',instruction:'Select Settings → Folder Configuration to scan and load SDPS, SDRE and SDRT. Available files are checked automatically; GL posting verification is not included.',roles:['sdps','sdre','sdrt','draftgl'],required:['sdps','sdre','sdrt']},
 eft:{title:'EFT',icon:'⇄',instruction:'Select Settings → Folder Configuration to scan and load all six EFT sources. Source dates, institutions and totals are reviewed automatically; full EFT settlement-to-GL reconciliation is not yet implemented.',roles:['eftday','eftstar','eftatm','eftrejects','eftteller','eftgl'],required:['eftday','eftstar','eftatm','eftrejects','eftteller','eftgl']},
 atm:{title:'ATM Reconciliation',icon:'▣',instruction:'ATM source files load from the saved input folder and are checked automatically when all four required CSV reports are available. Use Settings → Folder Configuration to reconnect or rescan the folder.',roles:['atm_transactions','atm_cash','atm_settlement','atm_gl'],required:['atm_transactions','atm_cash','atm_settlement','atm_gl']},
 ach:{title:'ACH',icon:'≋',instruction:'ACH reconciliation is not yet implemented. Source definitions, transaction matching and settlement controls still require configuration.',roles:[],required:[]}
};

function App({account,onLogout,onPasswordChanged}){
 const [page,setPage]=useState('overview');
 // Navigation should reset only the content position, never the sidebar's independently scrolled menu.
 const workspaceRef=useRef(null);
 function navigateSection(nextPage){
  setPage(nextPage);
  if(typeof window!=='undefined')window.scrollTo(0,0);
  if(workspaceRef.current)workspaceRef.current.scrollTop=0;
 }
 useEffect(()=>{
  window.scrollTo(0,0);
  if(workspaceRef.current)workspaceRef.current.scrollTop=0;
 },[page]);
 const [coreSystem,setCoreSystem]=useState('xp2');
 const [eftResult,setEftResult]=useState(null);
 const [atmResult,setAtmResult]=useState(null);
 const [unmapped,setUnmapped]=useState([]);
 const [draftResult,setDraftResult]=useState(null);
 const [master,setMaster]=useState(()=>getCoreMapping(coreSystem));
 const [folder,setFolder]=useState(null),[outputFolder,setOutputFolder]=useState(null),[outputFolderStatus,setOutputFolderStatus]=useState(''),[folderConnection,setFolderConnection]=useState('checking'),[jumpToFolder,setJumpToFolder]=useState(false),[candidates,setCandidates]=useState([]),[folderStatus,setFolderStatus]=useState(''),[datesConfirmed,setDatesConfirmed]=useState(false);
 const folderInput=useRef(null);
 const [folderPreferenceStatus,setFolderPreferenceStatus]=useState('');
 const [sessionFolderName,setSessionFolderName]=useState('');
 const [backendFolderName,setBackendFolderName]=useState('');
 const [files,setFiles]=useState({}),[mode,setMode]=useState('real'),[sign,setSign]=useState('credit-negative');
 const [startupLoaded,setStartupLoaded]=useState(false),[startupRunPending,setStartupRunPending]=useState(false),[startupNotice,setStartupNotice]=useState('');
 const startupScanRef=useRef(null);
 const lastAutoGLInputs=useRef(null);
 const [review,setReview]=useState(null),[approved,setApproved]=useState(false),[mappingOK,setMappingOK]=useState(false);
 const [signSaving,setSignSaving]=useState(false),[signNotice,setSignNotice]=useState('');
 const [result,setResult]=useState(null),[activity,setActivity]=useState([]),[notes,setNotes]=useState({}),[busy,setBusy]=useState(false),[progress,setProgress]=useState(''),[error,setError]=useState('');
 const [settingsReady,setSettingsReady]=useState(false),[settingsStatus,setSettingsStatus]=useState('');
 const [aiEnabled,setAiEnabled]=useState(false),[aiSaving,setAiSaving]=useState(false);
 const [aiNotice,setAiNotice]=useState('');
 const [aiIntegration,setAiIntegration]=useState({provider:'local-rules',baseUrl:'',model:'',authMethod:'oauth-sso'}),[aiIntegrationSaving,setAiIntegrationSaving]=useState(false),[aiIntegrationNotice,setAiIntegrationNotice]=useState(''),[aiIntegrationVersion,setAiIntegrationVersion]=useState(0),[aiPlatformReady,setAiPlatformReady]=useState(false);
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
  tenantAPI('platform-settings').then(data=>{if(!active)return;setAiIntegration({provider:'local-rules',baseUrl:'',model:'',authMethod:'oauth-sso',...(data.setting||{})});setAiIntegrationVersion(data.version);setAiPlatformReady(true);}).catch(e=>{if(active)setAiIntegrationNotice('Unable to load platform AI settings: '+e.message);});
  return()=>{active=false;};
 },[account.id,account.role]);
 async function saveAiIntegration(){
  if(aiIntegrationSaving||!aiPlatformReady||account.role!=='admin')return;
  const isLocal=aiIntegration.provider==='local-rules';
  const baseUrl=isLocal?'':aiIntegration.baseUrl.trim();
  if(baseUrl){try{const url=new URL(baseUrl);if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash)throw Error();}catch{setAiIntegrationNotice('Enter a valid HTTPS API base URL without credentials, query parameters or fragments.');return;}}
  const next={provider:aiIntegration.provider,baseUrl,model:isLocal?'':aiIntegration.model.trim(),authMethod:isLocal?'oauth-sso':aiIntegration.authMethod};
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

 useEffect(()=>{setSignNotice('');},[activeCU]);
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
 // Startup recovery never prompts for folder permissions: browser access must already be granted.
 useEffect(()=>{
  if(!settingsReady||folderConnection!=='ready'||!folder||coreSystem!=='xp2'||!activeCU)return;
  if(startupScanRef.current===folderScope)return;
  startupScanRef.current=folderScope;
  let cancelled=false;
  setStartupNotice('Checking saved input folder and available reconciliation reports…');
  (async()=>{
   try{
    if(typeof folder.queryPermission==='function'&&await folder.queryPermission({mode:'read'})!=='granted'){
     if(!cancelled)setStartupNotice('Input folder permission needs renewal. Reconnect it in Settings → Folder Configuration.');
     return;
    }
    const list=[];let skipped=0;
    async function sweep(dir,depth){
     for await(const entry of dir.values()){
      if(cancelled)return;
      if(entry.kind==='directory'){if(depth>=3)skipped++;else await sweep(entry,depth+1);}
      else if(entry.kind==='file'){
       list.push(await entry.getFile());
       if(list.length>200)throw Error('More than 200 files found. Select a smaller export folder in Settings.');
      }
     }
    }
    await sweep(folder,0);
    if(cancelled)return;
    const found=classifyCoreFiles(list,coreSystem);
    setCandidates(found);
    const {files:selected,duplicates:duplicateRoles,ignored}=selectUniqueSourceFiles(found);
    if(cancelled)return;
    setFiles(selected);
    setReview(null);setApproved(false);setResult(null);setDraftResult(null);setEftResult(null);setAtmResult(null);
    setStartupLoaded(true);
    const count=Object.keys(selected).length;
    const duplicates=duplicateRoles.size?' Duplicated report types skipped: '+[...duplicateRoles].join(', ')+'.':'';
    const deeper=skipped?' '+skipped+' deep folder(s) skipped.':'';
    const skippedFixtures=ignored.length?' Optional ATM test variant ignored: '+ignored.join(', ')+'.':'';
    setStartupNotice(count?count+' report(s) loaded from the saved folder. Reconciliation runs automatically for modules with complete source sets.'+duplicates+skippedFixtures+deeper:'No unambiguous supported source files found in the saved folder.'+duplicates+deeper);
    setStartupRunPending(true);
   }catch(e){
    if(!cancelled){setStartupNotice('Automatic folder import stopped: '+e.message);setStartupLoaded(false);}
   }
  })();
  return()=>{cancelled=true;};
 },[activeCU,folderScope,settingsReady,folderConnection,folder,coreSystem]);
 useEffect(()=>{let active=true;setOutputFolder(null);setOutputFolderStatus('');getSetting(folderScope,'output-folder').then(async handle=>{if(!active||!handle||handle.kind!=='directory')return;setOutputFolder(handle);const permission=typeof handle.queryPermission==='function'?await handle.queryPermission({mode:'readwrite'}):'prompt';if(active&&permission!=='granted')setOutputFolderStatus('Output folder saved; browser write permission may need renewal.');}).catch(e=>{if(active)setOutputFolderStatus('Output folder settings unavailable: '+e.message);});return()=>{active=false;};},[folderScope]);
 useEffect(()=>{forgetLegacyMapping().catch(()=>{});},[]);
 useEffect(()=>{if(page!=='settings'||!jumpToFolder)return;document.getElementById('folder-import')?.scrollIntoView({behavior:'smooth',block:'start'});setJumpToFolder(false);},[page,jumpToFolder]);
 useEffect(()=>{lastAutoGLInputs.current=null;setStartupLoaded(false);setStartupRunPending(false);setStartupNotice('');setResult(null);setDraftResult(null);setEftResult(null);setAtmResult(null);setFiles({});setReview(null);setApproved(false);setMappingOK(false);setMaster(getCoreMapping(coreSystem));},[activeCU]);
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
 async function setConvention(value){
  if(signSaving||!settingsReady||!Object.hasOwn(GL_SIGN_CONVENTIONS,value)||value===sign)return;
  const previous=sign;
  setSignSaving(true);setSignNotice('Saving GL Balance Sign Swap for this credit union…');
  try{
   await persistPreference('sign-convention',value);
   setSign(value);setApproved(false);
   setSignNotice('GL Balance Sign Swap saved: '+(value==='reverse-all'?'On':'Off')+'.');
   setSettingsStatus('GL convention saved. Reconciliation will refresh on Overview using the new convention.');setStartupRunPending(true);
  }catch(e){
   const message=e?.message||'Unknown error';
   const reason=message.includes('Credit union administrator required')?'Only an assigned credit union administrator can change this shared setting. Ask a credit union administrator to save it, or update your institution role.':message;
   setSign(previous);
   setSignNotice('GL Balance Sign Swap was NOT saved: '+reason);
   setSettingsStatus('GL Balance Sign Swap was not saved. The previous selection is still active.');
  }finally{setSignSaving(false);}
 }
 async function reviewGL(){if(!files.gl){setError('Select a GL PDF or TXT file first.');return;}if(/(?:^|[^a-z])svst(?:[^a-z]|$)/i.test(files.gl.name)){setError('SVST is a share report, not a GL trial balance. Load it under Shares (SVST), and choose a separate GL Trial Balance file under GL.');return;}if(lock.current)return;lock.current=true;setBusy(true);setError('');setApproved(false);try{
 const data=await extractGL(files.gl,{onProgress:(n,total)=>setProgress(`Extracting PDF page ${n} of ${total}`),requestPassword:async retry=>prompt(retry?'Incorrect password. Try again:':'Enter PDF password (used only for this session):')});
 setReview({...data,file:files.gl});setModal('review');
 }catch(e){setReview(null);setError(e.message);}finally{setBusy(false);lock.current=false;setProgress('');}}
 async function run(){if(lock.current)return;if(coreSystem!=='xp2'){setError(CORE_SYSTEMS[coreSystem].label+' reconciliation is not validated. Configure its file adapter and rules before running reconciliation.');return;}if(!settingsReady){setError('Local settings are loading.');return;}setError('');setUnmapped([]);const runRoles=loadedRunRoles(page,files);if(runRoles.length===1){setError('Load at least one supporting file: Shares, Loans or Cash for this workspace.');return;}if(mode==='real'){const missing=[];if(!files.gl)missing.push('Load the shared GL file beneath this workspace.');if(missing.length){setError('Before running: '+missing.join(' '));return;}}if(mode==='demo'&&Object.values(files).some(Boolean)){setError('Clear selected files before starting a synthetic demo.');return;}
 lock.current=true;setBusy(true);setNotes({});setProgress('Validating and reconciling source files');
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
    setHistoryStatus('Reconciliation summary saved to credit union history.');
    const history=await tenantAPI('runs',{tenantId:activeCU});setHistoricalRuns(history.runs);
   }catch(e){setHistoryStatus('Reconciliation finished locally, but history was not saved: '+e.message);}
  }
  await recordAction('balancing_run',issues?'exception':'completed');
 }catch(e){setError(e.message);}finally{setBusy(false);lock.current=false;setProgress('');}}
 useEffect(()=>{
  if(!settingsReady||coreSystem!=='xp2'||page!=='overview'||mode!=='real')return;
  if(!files.gl||!(files.svst||files.lnst||files.cobd)){if(startupRunPending)setStartupRunPending(false);return;}
  if(lock.current||busy)return;
  const signature=[activeCU,sign,files.gl,files.svst,files.lnst,files.cobd];
  if(lastAutoGLInputs.current?.every((item,i)=>item===signature[i])){
   if(startupRunPending)setStartupRunPending(false);
   return;
  }
  lastAutoGLInputs.current=signature;
  if(startupRunPending)setStartupRunPending(false);
  run();
 },[startupRunPending,settingsReady,coreSystem,page,files,sign,activeCU,mode,busy]);
 function clear(){if(lock.current||!confirm('Clear all session files, results, notes and activity? Downloaded copies remain on your device.'))return;setFiles({});setDraftResult(null);setReview(null);setApproved(false);setResult(null);setNotes({});setActivity([]);setError('');setMappingOK(false);setModal(null);setFolder(null);setFolderConnection('missing');setCandidates([]);setFolderStatus('');setDatesConfirmed(false);}
 function exportEvidence(){if(!result)return;recordAction('evidence_export','completed');if(confirm('This export contains financial balances and notes. Save only in an approved location.'))download('abacus-run-evidence.json',JSON.stringify({build:'ABACUS React 0.3.0',warning:'Unsigned session evidence; not an immutable audit ledger or verified user identity.',run:result,notes},null,2),'application/json');}

 function stageFiles(list){
  if(list.length>200){setFolderStatus('More than 200 files detected. Narrow the export folder before scanning; no partial import was staged.');setCandidates([]);return;}
  const found=classifyCoreFiles(list,coreSystem);
  setCandidates(found);setDatesConfirmed(false);
  if(!coreIngestion(coreSystem).adapter){
   setFolderStatus('Found '+found.length+' files. '+CORE_SYSTEMS[coreSystem].label+' source definitions are not verified; no automatic role assignment or reconciliation is permitted.');
   return;
  }
  const {files:selected,duplicates,ignored}=selectUniqueSourceFiles(found);
  setFiles(selected);setReview(null);setApproved(false);setResult(null);setDraftResult(null);setEftResult(null);setAtmResult(null);
  setStartupLoaded(true);setStartupRunPending(true);
  const loaded=Object.keys(selected).length;
  const eft=selected.eftday?' EFT Core Day Totals: '+selected.eftday.name+'.':'';
  setFolderStatus(loaded+' of '+found.length+' recognized reports loaded automatically.'+eft+(duplicates.size?' Duplicate roles withheld: '+[...duplicates].join(', ')+'.':'')+(ignored.length?' Optional ATM variant ignored: '+ignored.join(', ')+'.':'')+' Verify dates and report contents before relying on results. Files are retained only for this browser session; reconnect the folder for future startups.');
 }
 async function chooseFolder(){startupScanRef.current=null;if(!window.showDirectoryPicker){setFolderPreferenceStatus('This browser uses a one-session folder picker. Select the folder to load its source files; reselect it after refreshing or signing in again. For remembered folder access use current Chrome or Edge on macOS.');folderInput.current?.click();return;}try{const handle=await window.showDirectoryPicker({mode:'read'});setFolder(handle);setSessionFolderName('');setFolderConnection('ready');try{await rememberFolder(handle,folderScope);setFolderPreferenceStatus('Folder access saved on this browser and device.');}catch(error){setFolderPreferenceStatus('Folder connected for this session, but browser permission could not be remembered: '+error.message);}if(centralTenant){try{await persistPreference('folder-name',handle.name);setBackendFolderName(handle.name);setFolderPreferenceStatus('Folder name saved in credit union database; permission saved locally on this device.');}catch(e){setFolderPreferenceStatus(e.message?.includes('Credit union administrator required')?'Folder connected on this device. Saving its display name for the credit union requires a credit union administrator; scanning and local imports still work.':'Folder connected locally; the optional server folder name could not be saved: '+e.message);}}await checkFolder(handle);}catch(e){if(e.name!=='AbortError')setFolderStatus(e.message);}}
 async function chooseOutputFolder(){
  if(!window.showDirectoryPicker){setOutputFolderStatus('Persistent output folder selection requires a browser supporting directory access, such as current Chrome or Edge.');return;}
  try{
   const handle=await window.showDirectoryPicker({mode:'readwrite'});
   if(!handle||handle.kind!=='directory')return;
   // Permission is requested by the browser and scoped to this user's device.
   setOutputFolder(handle);setOutputFolderStatus('Output folder selected. No files are written automatically.');
   try{await saveSetting(folderScope,'output-folder',handle);}catch(e){setOutputFolderStatus('Output folder selected for this session, but could not be remembered: '+e.message);}
  }catch(e){if(e.name!=='AbortError')setOutputFolderStatus('Output folder selection failed: '+e.message);}
 }
 async function clearOutputFolder(){
  try{await deleteSetting(folderScope,'output-folder');setOutputFolder(null);setOutputFolderStatus('Output folder selection cleared. No files were deleted.');}
  catch(e){setOutputFolderStatus('Could not clear saved output folder: '+e.message);}
 }
 async function clearInputFolder(){
  try{
   await forgetFolder(folderScope);
   setFolder(null);setSessionFolderName('');setFolderConnection('missing');setCandidates([]);setFiles({});setReview(null);setApproved(false);setResult(null);setDraftResult(null);setEftResult(null);setAtmResult(null);
   setFolderPreferenceStatus('Input folder selection cleared. No files were deleted.');setFolderStatus('');
   if(centralTenant){try{await persistPreference('folder-name','');setBackendFolderName('');}catch(e){setFolderPreferenceStatus('Input folder cleared locally, but the server folder label could not be cleared: '+e.message);}}
  }catch(e){setFolderPreferenceStatus('Could not clear input folder: '+e.message);}
 }
 async function checkFolder(handle=folder){
  if(!handle){setFolderStatus('No persistent folder handle is available. Select the input folder again.');return;}
  try{
    if(handle.queryPermission&&await handle.queryPermission({mode:'read'})!=='granted'){
      if(!handle.requestPermission||await handle.requestPermission({mode:'read'})!=='granted'){
        setFolderConnection('reconnect');setFolderStatus('The browser did not grant access to the saved folder. Click Choose input folder to select it again. On macOS Safari, select the folder for this session; for saved access use Chrome or Edge.');return;
      }
    }
    setFolderConnection('ready');
    const list=[];
    let skippedDeepFolders=0;
    async function sweep(directory,depth){
      for await(const entry of directory.values()){
        if(entry.kind==='file'){list.push(await entry.getFile());if(list.length>200)throw Error('More than 200 files detected within the scan depth. Choose a smaller export folder; no partial import was staged.');}
        else if(entry.kind==='directory'){
          if(depth>=3)skippedDeepFolders++;
          else await sweep(entry,depth+1);
        }
      }
    }
    await sweep(handle,0);stageFiles(list);
    if(skippedDeepFolders)setFolderStatus(previous=>previous+' '+skippedDeepFolders+' deeper subfolder(s) were skipped (scan limit: three levels). If a needed report is in one of those folders, choose its parent folder directly.');
  }catch(e){setCandidates([]);setFolderStatus((e?.name==='NotAllowedError'||e?.name==='SecurityError'?'Browser blocked folder access. Click Choose input folder and select it again. If you use Safari, folder access must be selected again each session. ':'Folder scan stopped: ')+e.message);}
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
 const glSourceAudit=result?.meta?.records?.length?Object.fromEntries(result.meta.records.map(record=>[record.account,{raw:record.rawBalance,parsed:record.cents/100,adjusted:normalizeGL({records:[record]},sign)[record.account]}])):null;
 const displaySections=coreSystem==='xp2'?buildMappedSections(master.entries,{}, {}, {}, {branches:[],total:0},'overview').map(s=>({...s,rows:s.id==='cash'&&visibleRun?.sections.some(x=>x.id==='cash')?visibleRun.sections.find(x=>x.id==='cash').rows:s.rows.map(r=>visibleRun?.sections.find(x=>x.id===s.id)?.rows.find(x=>x.gl===r.gl&&x.desc===r.desc)||r)})):[];
 const sections=selectSections(displaySections,page).map(s=>({...s,rows:page==='overview'?s.rows.filter(r=>r.executed):s.rows})).filter(s=>s.rows.length);
 const title=navigation.find(n=>n[2]===page)[1];
 const balancing=['shares-loans','cash','exceptions'].includes(page);
 const hasReconciliationResults=Boolean(result||draftResult||eftResult||atmResult);
 const rows=sections.flatMap(s=>s.rows).filter(r=>!r.branchOnly&&r.executed);
 return <div className="app"><aside><a className="brand" href="#overview" onClick={e=>{e.preventDefault();navigateSection('overview');}}><img src="/cu-abacus-logo.png" alt="CU | ABACUS" className="abacus-brand-logo" /></a><div className="abacus-sidebar-subtitle">RECONCILIATION</div><nav aria-label="Main navigation">{sidebarNavigation.filter(([, ,id])=>id!=='platform'&&id!=='platform-activity'||(account.role==='admin'&&(id==='platform'||account.isPlatformOwner===true))).map(([group,label,id])=><React.Fragment key={id}>{group&&<div className="side-label">{group}</div>}<button aria-current={page===id?'page':undefined} className={page===id?'nav-item nav-current':'nav-item'} onClick={()=>navigateSection(id)}>{label}</button>{page===id&&sourceRoles[id]&&(folderConnection==='missing'||folderConnection==='reconnect')&&<div className="nav-files">
 <p>{folderConnection==='reconnect'?'Saved input folder needs permission. Reconnect it in Settings.':coreIngestion(coreSystem).adapter?'No input folder configured for this credit union.':'Source adapter pending for '+CORE_SYSTEMS[coreSystem].label+'.'}</p>
 <button type="button" onClick={()=>setPage('settings')} style={{width:'100%',fontSize:12}}>Open folder import</button>
 <p>{sourceCoverage(coreSystem,id,files,candidates).matched.length} identified source role(s){sourceCoverage(coreSystem,id,files,candidates).required.length?' / '+sourceCoverage(coreSystem,id,files,candidates).required.length+' expected':''}</p>
 </div>}</React.Fragment>)}</nav><div className="side-foot">LOCAL PROCESSING<br/><span>Files remain in browser memory.<br/>No financial-data upload service.</span></div></aside>
 <div className="workspace" ref={workspaceRef}><header><span>{unions.find(u=>u.id===activeCU)?.name||cuName||"Credit union"} / {CORE_SYSTEMS[coreSystem].label} / {title}</span>{account.role!=='guest'&&<select aria-label="Active credit union" value={activeCU} onChange={e=>{setActiveCU(e.target.value);setHistoryStatus('');}} disabled={busy}><option value="local-demo">Select credit union</option>{unions.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}</select>}<div className="header-actions"><span className="privacy-dot" title="Files processed locally">{account.username} · Local session</span><div className="header-account-actions"><UserGuide onNavigate={setPage}/>{account.role!=='guest'&&<ChangePassword onDone={onPasswordChanged}/>}{account.role!=='guest'&&<button type="button" className="header-action-with-icon" onClick={onLogout}><svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 17l5-5-5-5"/><path d="M15 12H3"/><path d="M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7"/></svg><span>Log out</span></button>}</div><button disabled={!result||busy} onClick={exportEvidence}>Export evidence</button>{page!=='shares-loans'&&page!=='cash'&&<button disabled={!result||busy} onClick={()=>window.print()}>Print / PDF</button>}</div></header>
 <main>{page==='overview'&&startupNotice&&<p className="folder-inline-status" role="status">{startupNotice}</p>}
 {page==='overview'&&startupLoaded&&coreSystem==='xp2'&&<div hidden aria-hidden="true">
  {['sdps','sdre','sdrt'].every(role=>files[role])&&!draftResult&&<ShareDrafts files={files} busy={busy} data={draftResult} setData={value=>{setDraftResult(value);if(value)recordAction('draft_checks',value.checks.some(c=>c.ok===false)?'exception':'completed');}} autoRun readOnly/>}
  {['eftday','eftstar','eftatm','eftrejects','eftteller','eftgl'].every(role=>files[role])&&!eftResult&&<EFT files={files} data={eftResult} setData={value=>{setEftResult(value);if(value)recordAction('eft_review',value.issues.length?'exception':'completed');}} autoRun readOnly/>}
  {['atm_transactions','atm_cash','atm_settlement','atm_gl'].every(role=>files[role])&&!atmResult&&<ATM files={files} aiEnabled={false} onReview={value=>{setAtmResult(value);if(value)recordAction('atm_review',value.checks.some(c=>!c.ok)?'exception':'completed');}} autoRun/>}
 </div>}
 {['shares-loans','cash','drafts','eft','atm','ach'].includes(page)&&<div className="reconciliation-page-header">
  <h1>{({ 'shares-loans':'Shares, Loans and Cash Reconciliation',cash:'Cash Reconciliation',drafts:'Share Draft Reconciliation',eft:'EFT Reconciliation',atm:'ATM Reconciliation',ach:'ACH Reconciliation' })[page]}</h1>
  <p>{page==='ach'?'Setup pending — ACH source adapter is not yet validated.':'Reconciliation is calculated automatically when recognized source files are loaded. Review exceptions and evidence below.'}</p>
 </div>}
 {coreSystem!=='xp2'&&['shares-loans','cash','drafts','eft','atm','ach'].includes(page)&&<section className="folder-settings" role="status"><h2>{CORE_SYSTEMS[coreSystem].label} source adapter pending</h2><p>File counts, report layouts, account mappings and reconciliation controls have not been verified for this core. XP2 parsing is not used as a substitute; reconciliation is blocked until vendor-specific evidence is validated.</p><button type="button" onClick={()=>setPage('settings')}>Review source setup</button></section>}{page==='help'&&<Help/>}{page==='platform-activity'&&account.role==='admin'&&account.isPlatformOwner===true&&<PlatformActivity/>}{page==='overview'&&folderConnection!=='checking'&&folderConnection!=='ready'&&<section className="folder-settings" role="status" aria-label="Reconciliation folder setup needed" style={{marginBottom:16,borderLeft:'4px solid #b37b24'}}>
  <h2>{folderConnection==='reconnect'?'Reconciliation folder needs access':'Reconciliation folder not set up'}</h2>
  <p>{folderConnection==='reconnect'?'Your saved folder is not currently authorized on this browser. Reconnect it before importing new reports.':'No reconciliation folder is connected for this credit union on this browser. Set up the folder to scan and identify source files.'}</p>
  <button className="primary" type="button" onClick={()=>{setJumpToFolder(true);setPage('settings');}}>Set up reconciliation folder</button>
 </section>}{page==='overview'&&!hasReconciliationResults&&folderConnection==='ready'&&<section className="folder-settings" aria-label="Dashboard awaiting reconciliation results"><h2>Reconciliation dashboard</h2><p>No completed reconciliation results in this session. ABACUS will populate the dashboard when the saved folder is scanned and supported checks finish. Check Settings → Folder Configuration for missing or unrecognized files.</p><button type="button" onClick={()=>{setJumpToFolder(true);setPage('settings');}}>Review source files</button></section>}{page==='overview'&&hasReconciliationResults&&<section className="abacus-exec-overview"><h2>Reconciliation status <small>Current browser session</small></h2><div className="abacus-exec-grid">{[
 {label:'Shares, Loans & Cash',value:result?.checks??'—',hint:'Checks from latest reconciliation'},
 {label:'Share Draft issues',value:draftResult?.checks?.filter(c=>c.ok===false).length??'—',hint:'From latest check review'},
 {label:'EFT issues',value:eftResult?.issues?.length??'—',hint:'From latest EFT review'},
 {label:'ATM issues',value:atmResult?.checks?.filter(c=>c.ok===false).length??'—',hint:'From latest ATM review'}
 ].map(k=><div className="abacus-exec-tile" key={k.label}><span>{k.label}</span><strong>{k.value}</strong><small>{k.hint}</small></div>)}</div><p>This is verified session activity only; historical trends, exception aging, account certification and durable audit history require the planned persistent run store.</p></section>}{page==='overview'&&hasReconciliationResults&&<section className="dashboard-quicklinks" aria-label="Dashboard detail views"><button type="button" onClick={()=>setPage('exceptions')}>Exceptions <span aria-hidden="true">→</span></button><button type="button" onClick={()=>setPage('history')}>Balancing History <span aria-hidden="true">→</span></button></section>}{['exceptions','history'].includes(page)&&<div className="dashboard-back"><button type="button" onClick={()=>setPage('overview')}>← Back to Dashboard</button></div>} {page==='settings'&&<section className="folder-settings" aria-label="AI settings"><div className="section-title-help"><h2>AI investigation assistant</h2><SectionHelp title="AI investigation assistant"><p>Off by default and saved per credit union. When enabled, the local ATM investigation chat offers rules-based explanations based on the current browser report.</p><p>United Solutions enterprise AI is not connected; these features do not send reconciliation files to an AI provider.</p></SectionHelp></div><SettingsSwitch id="ai-investigation-switch" label="AI investigation assistant" checked={aiEnabled} disabled={aiSaving} onChange={changeAiEnabled}/>{aiSaving&&<span role="status">Saving…</span>}{aiEnabled&&<button type="button" onClick={()=>setPage('atm')}>Open ATM investigation chat →</button>}{!settingsReady&&<p role="status">Settings are still loading; a save attempt will report this status.</p>}{aiNotice&&<p role={aiNotice.includes('could not be saved')?'alert':'status'} style={{fontWeight:650,color:aiNotice.includes('could not be saved')?'#a33331':'#246251'}}>{aiNotice}</p>}</section>}
{page==='settings'&&<section className="folder-settings" aria-label="GL sign convention settings">
 <div className="section-title-help"><h2>GL Balance Sign Swap</h2>
  <SectionHelp title="GL Balance Sign Swap"><p>Off leaves all GL balances as reported. On reverses the sign of every GL balance, without modifying the original export.</p><p>Existing credit unions using the legacy liability-only convention retain it until the switch is changed. Only enable full sign reversal when the entire trial balance requires it.</p></SectionHelp>
 </div>
 <SettingsSwitch id="gl-sign-swap" label="GL Balance Sign Swap" checked={sign==='reverse-all'} disabled={!settingsReady||busy||signSaving} onChange={value=>setConvention(value?'reverse-all':'natural')}/>{signNotice&&<p role={signNotice.includes('NOT saved')?'alert':'status'} className={signNotice.includes('NOT saved')?'error':'folder-inline-status'}>{signNotice}</p>}
 {sign==='credit-negative'&&<p role="status" className="settings-legacy-sign">Existing liability-only GL sign convention remains active. Choose On or Off to replace it.</p>}
 </section>}
 {page==='settings'&&<section className="folder-settings"><div className="section-title-help"><h2>Core system</h2><SectionHelp title="Core system"><p>Choose XP2, DataSafe, or Portico for the selected credit union. XP2 has existing parsing support with module-specific validation limits. DataSafe and Portico adapters are pending vendor export verification.</p><p>Switching cores clears loaded file selections and results for the current session. No member source files are uploaded by changing this setting.</p></SectionHelp></div><label htmlFor="core-system-selection">Select core processing system</label><select id="core-system-selection" aria-label="Core system" value={coreSystem} disabled={busy} onChange={e=>changeCoreSystem(e.target.value)}><option value="xp2">XP2</option><option value="datasafe">DataSafe</option><option value="portico">Portico</option></select><p role="status">{CORE_SYSTEMS[coreSystem].validation}</p></section>}
 {page==='platform'&&account.role==='admin'&&<section className="folder-settings" aria-label="AI integration settings"><div className="section-title-help"><h2>AI Integration Settings</h2><SectionHelp title="AI Integration Settings"><p>These platform-wide fields identify the future enterprise AI endpoint. Authentication secrets belong on the application server, never in this browser form.</p><p>Saving the configuration does not connect to United Solutions or send member/financial information to a provider.</p></SectionHelp></div><fieldset style={{border:0,padding:0,margin:'0 0 14px'}}><legend><strong>AI Provider</strong></legend>{[['local-rules','ABACUS Local Rules-Based Assistant (current default)'],['united-openai','United Solutions — OpenAI-compatible API'],['united-ollama','United Solutions — Ollama API'],['custom','Custom enterprise API']].map(([value,label])=><label key={value} style={{display:'block',margin:'10px 0'}}><input type="radio" name="ai-provider" checked={aiIntegration.provider===value} onChange={()=>setAiIntegration(p=>({...p,provider:value}))} disabled={!aiPlatformReady||aiIntegrationSaving}/> {label}</label>)}</fieldset>{aiIntegration.provider==='local-rules'?<p role="status" style={{margin:'12px 0'}}>Uses the existing browser-based ATM investigation rules. No external API, model, or authentication settings are required. This does not change the per-credit-union AI enable switch.</p>:<div className="ai-provider-connection-fields"><label htmlFor="ai-base-url">API Base URL<input id="ai-base-url" type="url" placeholder="https://ai.internal.example.com/v1" value={aiIntegration.baseUrl} onChange={e=>setAiIntegration(p=>({...p,baseUrl:e.target.value}))} disabled={!aiPlatformReady||aiIntegrationSaving} autoComplete="off"/></label><label htmlFor="ai-model-id">Model Identifier<input id="ai-model-id" type="text" placeholder="Provided by United Solutions IT" value={aiIntegration.model} onChange={e=>setAiIntegration(p=>({...p,model:e.target.value}))} disabled={!aiPlatformReady||aiIntegrationSaving} autoComplete="off"/></label><label htmlFor="ai-auth-method">Authentication Method<select id="ai-auth-method" value={aiIntegration.authMethod} onChange={e=>setAiIntegration(p=>({...p,authMethod:e.target.value}))} disabled={!aiPlatformReady||aiIntegrationSaving}><option value="oauth-sso">OAuth / Single Sign-On</option><option value="server-token">Server-managed API token</option><option value="mtls">Mutual TLS (server-managed)</option></select></label></div>}<button type="button" className="primary" style={{marginTop:15}} disabled={!aiPlatformReady||aiIntegrationSaving} onClick={saveAiIntegration}>{aiIntegrationSaving?'Saving…':'Save AI integration settings'}</button>{aiIntegrationNotice&&<p role="status">{aiIntegrationNotice}</p>}<p><small>Do not enter API keys, passwords, tokens or member information here. Authentication secrets belong on the private application server. Saving these fields does not send financial data to any provider.</small></p></section>}
 {progress&&<div role="status" className="progress">{progress}</div>}{error&&<div role="alert" className="error">{error}</div>}

 
 {page!=='overview'&&balancing&&coreSystem==='xp2'&&!result&&!unmapped.length&&<section className="run-welcome"><div className="run-welcome-icon" aria-hidden="true">⚖</div><h2>{files.gl&&loadedRunRoles(page,files).length>1?(approved&&review?.file===files.gl&&mappingOK?'GL review completed — run reconciliation':'Files selected — GL review required'):'Select source files to begin'}</h2><p>{files.gl&&loadedRunRoles(page,files).length>1?(approved&&review?.file===files.gl&&mappingOK?'Reconciliation will run automatically when supported source files are loaded.':'Check the input folder and report mappings. Reconciliation begins automatically when the necessary files are available.'):'In Settings → Folder Configuration, select a folder, scan for reports, verify their roles and dates, then load the selected files. File selection alone does not validate the balances.'}</p><div className="source-section-list">{(page==='overview'?[['Shared GL',['gl']],['Shares, Loans and Cash',['svst','lnst','cobd']],['Share Drafts',['sdps','sdre','sdrt','draftgl']],['EFT',['eftday','eftstar','eftatm','eftrejects','eftteller','eftgl']],['ATM Balancing',['atm_transactions','atm_cash','atm_settlement','atm_gl']],['ACH',[]]]:[['Shares, Loans and Cash',['gl','svst','lnst','cobd']]]).map(([label,roles])=><section className="source-section-card" key={label}><h3>{label}</h3>{roles.length?<ul>{roles.map(role=><li key={role}><span>{defs.find(d=>d[0]===role)?.[1]}{role==='draftgl'?' (optional)':''}</span><span className={files[role]?'source-loaded':'source-missing'}>{files[role]?'Selected: '+files[role].name:'Not selected'}</span></li>)}</ul>:<p>Source formats pending setup</p>}</section>)}</div></section>}
 {page!=='overview'&&balancing&&result&&(<><div className="folder-settings" role="status" style={{marginBottom:12,padding:'12px 18px'}}><strong>GL sign convention:</strong> {GL_SIGN_CONVENTIONS[sign]}{result.meta?.records?.length>0&&<span style={{display:'block',marginTop:5}}>Original GL 901-0010: {result.meta.records.find(r=>r.account==='901-0010')?.rawBalance||'Unavailable'} · Normalized GL 901-0010: {normalizeGL({records:result.meta.records},sign)['901-0010']?.toLocaleString('en-US',{style:'currency',currency:'USD'})||'Unavailable'}</span>}{visibleRun?.signPreview&&<span style={{display:'block',color:'#9b3c16'}}>Recalculated display preview from original GL balances. The saved run used {GL_SIGN_CONVENTIONS[result.meta.signConvention]||result.meta.signConvention}. Reconciliation refreshes automatically on Overview.</span>}</div><div className="html-report-overview"><div className="html-report-overview-head"><div className="html-report-date">{new Date(result.timestamp).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})} <span className={rows.every(r=>r.ok)&&!unmapped.length?'html-run-ok':'html-run-partial'}>{rows.every(r=>r.ok)&&!unmapped.length?'Balanced':unmapped.length?'Partial Reconciliation':'Exceptions'}</span></div><div className="html-report-subtitle">{new Date(result.timestamp).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})} · {files.gl?'GL '+files.gl.name:'Demo data'}</div></div><div className="html-stat-grid">{[{label:'SECTIONS',value:sections.length,hint:'reconciled'},{label:'CHECKS',value:rows.filter(r=>r.ok).length,hint:'balanced'},{label:'VARIANCES',value:rows.filter(r=>!r.ok).length,hint:'exceptions'},{label:'SHARES',value:compactReportMoney(sections.filter(s=>['shares','certs'].includes(s.id)).flatMap(s=>s.rows).filter(r=>r.executed&&!r.branchOnly).reduce((n,r)=>n+parseReportMoney(r.svst),0)),hint:'total deposits'},{label:'LOANS',value:compactReportMoney(sections.filter(s=>s.id==='loans').flatMap(s=>s.rows).filter(r=>r.executed&&!r.branchOnly).reduce((n,r)=>n+parseReportMoney(r.svst),0)),hint:'total loans'},{label:'CASH',value:compactReportMoney(sections.filter(s=>s.id==='cash').flatMap(s=>s.rows).filter(r=>r.executed&&!r.branchOnly).reduce((n,r)=>n+parseReportMoney(r.svst),0)),hint:'on hand'}].map((stat,i)=><div className="html-stat-card" key={stat.label}><small>{stat.label}</small><strong className={(i===1||i===2&&stat.value===0||i===5)?'green':''}>{stat.value}</strong><span>{stat.hint}</span></div>)}</div></div><div className="report-view-switch" role="group" aria-label="Reconciliation report view"><button type="button" className={reportView==='summary'?'selected':''} aria-pressed={reportView==='summary'} onClick={()=>setReportView('summary')}>Summary</button><button type="button" className={reportView==='detail'?'selected':''} aria-pressed={reportView==='detail'} onClick={()=>setReportView('detail')}>Detail</button></div>
 {unmapped.length>0&&<p role="status" className="partial-report-notice">PARTIAL RECONCILIATION: {unmapped.length} unmapped source account type(s) excluded; mapped accounts only.</p>}
 {sections.map(section=>{const sectionRows=section.rows.filter(r=>r.executed&&!r.branchOnly);const total=(field)=>sectionRows.reduce((sum,r)=>{const v=r[field];if(typeof v==='number')return sum+v;if(typeof v!=='string'||!/[0-9]/.test(v))return sum;const parsed=Number(v.replace(/[$,()\s]/g,'').replace(/,/g,''));return sum+(Number.isFinite(parsed)?parsed*(v.includes('(')?-1:1):0)},0);const sectionOK=sectionRows.every(r=>r.ok);const detailMode=reportView==='detail';return <section className="result-section html-report" key={section.id}><div className="html-section-heading"><h2>{section.label}</h2><div className="html-section-actions"><span className={sectionOK?'html-section-ok':'html-section-error'}>{sectionOK?'OK':sectionRows.filter(r=>!r.ok).length+' exceptions'}</span><div className="html-switch" role="group" aria-label={section.label+' report view'}><button className={!detailMode?'selected':''} onClick={()=>{setReportView('summary');setExpanded({})}}>Summary</button><button className={detailMode?'selected':''} onClick={()=>{setReportView('detail');setExpanded(Object.fromEntries(sectionRows.map(r=>[section.id+':'+r.gl,true])))}}>Detail</button></div></div></div><div className="table-scroll"><table className="html-report-table"><thead><tr><th>GL #</th><th>DESCRIPTION</th><th>{section.id==='loans'?'LNST TYPES':section.id==='cash'?'COBD BRANCH':'SVST TYPES'}</th><th>{section.id==='loans'?'LNST BALANCE':section.id==='cash'?'COBD BALANCE':'SVST BALANCE'}</th><th>TRIAL BALANCE</th><th>VARIANCE</th><th>STATUS</th></tr></thead><tbody>{sectionRows.map((r,i)=>{const rowKey=section.id+':'+r.gl;const opened=expanded[rowKey]===undefined?detailMode:!!expanded[rowKey];return <React.Fragment key={rowKey+':'+i}><tr className={opened?'html-open-row':r.ok?'':'exception'}><td><button className="html-gl-expand" aria-expanded={opened} onClick={()=>setExpanded(prev=>({...prev,[rowKey]:!opened}))}>{r.gl} <span>{opened?'▾':'▸'}</span></button></td><td>{r.desc}</td><td><div className="html-type-badges">{(r.codes||[]).map(c=><span key={c}>{c}</span>)}</div></td><td className="html-money">{r.svst}</td><td className="html-money">{r.tb}</td><td className={r.ok?'html-variance-ok':'html-variance-bad'}>{r.varRaw==null?r.var:money(r.varRaw)}</td><td><span className={r.ok?'html-status-good':'html-status-bad'}>{r.ok?'Balanced':'Exception'}</span></td></tr>{opened&&<tr className="html-breakdown-row"><td colSpan={7}><div className="html-breakdown">{glSourceAudit?.[r.gl]&&<div className="gl-sign-audit" role="note"><strong>GL sign audit</strong><span>Original ending balance: {glSourceAudit[r.gl].raw||money(Math.round(glSourceAudit[r.gl].parsed*100))}</span><span>Parsed GL: {money(Math.round(glSourceAudit[r.gl].parsed*100))}</span><span>Convention: {GL_SIGN_CONVENTIONS[sign]}</span><span>Compared GL: {money(Math.round(glSourceAudit[r.gl].adjusted*100))}</span></div>}<div className="html-breakdown-label">{section.id==='loans'?'LNST':section.id==='cash'?'COBD':'SVST'} TYPE BREAKDOWN</div>{(r.codeData||[]).map(d=><div className="html-breakdown-item" key={d.code}><strong>{d.code}</strong><span>{d.amt==null?'Missing':money(d.amt)}</span></div>)}<div className="html-breakdown-total">Total <strong>{r.svst}</strong></div></div></td></tr>}</React.Fragment>})}<tr className="html-section-total"><td colSpan={3}>Section total</td><td className="html-money">{money(total('svst'))}</td><td className="html-money">{money(total('tb'))}</td><td className="html-money">{money(total('varRaw'))}</td><td/></tr></tbody></table></div></section>})}</>)}
 {!balancing&&page!=='history'&&page!=='settings'&&page!=='drafts'&&page!=='eft'&&page!=='atm'&&page!=='help'&&page!=='platform-activity'&&page!=='platform'&&page!=='ach'&&<section className="empty"><h2>{page==='ach'?'ACH balancing — setup pending':title}</h2><p>{page==='ach'?'ACH source formats, settlement dates, and matching rules must be configured before balancing is available. No ACH results are generated.':page==='audit'?'Export evidence for the current run using the header button. Evidence is unsigned and session-only.':page==='mapping'?'Review the current fixed mapping profile. Mapping editing is not yet available.':'Session settings apply to all balancing workspaces. Data and history clear on refresh.'}</p>{page==='mapping'&&<MasterMapping master={master}/>}</section>}

 {sectionWelcome[page]&&page!=='atm'&&(page==='ach'||coreSystem==='xp2')&&!(page==='drafts'&&draftResult)&&!(page==='eft'&&eftResult)&&<section className="run-welcome module-welcome" aria-label={sectionWelcome[page].title+' source status'}>
 <div className="run-welcome-icon" aria-hidden="true">{sectionWelcome[page].icon}</div>
 <h2>{page==='ach'?'ACH — setup pending':page==='atm'?'ATM source checks':sectionWelcome[page].required.every(role=>files[role])?'Source files selected — '+sectionWelcome[page].title:'Source files needed — '+sectionWelcome[page].title}</h2>
 <p>{sectionWelcome[page].instruction}</p>
 <div className="source-section-list"><section className="source-section-card"><h3>{sectionWelcome[page].title}</h3>
 {sectionWelcome[page].roles.length?<ul>{sectionWelcome[page].roles.map(role=><li key={role}><span>{defs.find(item=>item[0]===role)?.[1]||role}{role==='draftgl'?' (optional)':''}</span><span className={files[role]?'source-loaded':'source-missing'}>{files[role]?'Selected: '+files[role].name:'Not selected'}</span></li>)}</ul>:<p>Source formats and controls pending setup. No ACH balancing results are generated.</p>}
 </section></div></section>}
 {['shares-loans','cash','drafts','eft','ach'].includes(page)&&<ProcessAssistant module={page} report={page==='drafts'?draftResult:page==='eft'?eftResult:page==='ach'?null:visibleRun} enabled={aiEnabled}/>}
 {page==='atm'&&coreSystem==='xp2'&&<ATM autoRun aiEnabled={aiEnabled} files={files} initialReport={atmResult} onReview={value=>{setAtmResult(value);if(value)recordAction('atm_review',value.checks.some(c=>!c.ok)?'exception':'completed');}}/>}
 {page==='eft'&&coreSystem==='xp2'&&<EFT autoRun files={files} data={eftResult} setData={value=>{setEftResult(value);if(value)recordAction('eft_review',value.issues.length?'exception':'completed');}}/>}
 
 {page==='drafts'&&coreSystem==='xp2'&&<ShareDrafts autoRun files={files} busy={busy} data={draftResult} setData={value=>{setDraftResult(value);if(value)recordAction('draft_checks',value.checks.some(c=>c.ok===false)?'exception':'completed');}}/>}
 {page==='settings'&&<section id="folder-import" aria-label="Folder import &amp; file coverage" className="folder-settings" onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();if(!busy)stageFiles(e.dataTransfer.files);}}>
 <div className="section-title-help"><h2>Folder Configuration</h2><SectionHelp title="Folder Configuration"><p>Input folder: Abacus scans reports from the selected folder on this browser/device. Choose a folder or use Scan to refresh file discovery.</p><p>Output folder: optional destination for future report exports, imaging systems, or cold-import workflows. Selecting the folder does not create files, export reports, or trigger another system's import.</p><p>The browser stores folder access for this user and credit union when permitted. The server stores the input folder's display name only. Folder paths, raw files and output credentials are not uploaded.</p><p>The clear icons remove stored folder selections; they never delete the underlying folders or documents.</p></SectionHelp></div>
 <div className="folder-config-grid">
  <div className="folder-config-field">
   <label htmlFor="abacus-input-folder">Input Folder</label>
   <div className="folder-config-controls">
    <input id="abacus-input-folder" type="text" value={folder?.name||sessionFolderName||''} placeholder="Not selected" readOnly aria-label="Input folder name"/>
    <button className="folder-icon-picker" type="button" aria-label="Choose input folder" title="Choose input folder" disabled={busy} onClick={chooseFolder}><svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7.5h7l2 2H21v10H3z"/><path d="M3 7.5V5h8l2 2"/><path d="M12 14h6m-3-3v6"/></svg></button>
    <button type="button" className="folder-clear-button" aria-label="Clear input folder selection" title="Clear input folder selection" disabled={busy||(!folder&&!backendFolderName)} onClick={clearInputFolder}>✕</button>
   </div>
   {folder&&<div className="folder-secondary-action"><button type="button" disabled={busy} onClick={()=>checkFolder()}>Scan input folder</button></div>}
   {folderPreferenceStatus&&<p className="folder-inline-status" role="status">{folderPreferenceStatus}</p>}
  </div>
  <div className="folder-config-field">
   <label htmlFor="abacus-output-folder">Output Folder</label>
   <div className="folder-config-controls">
    <input id="abacus-output-folder" type="text" value={outputFolder?.name||''} placeholder="Not selected" readOnly aria-label="Output folder name"/>
    <button className="folder-icon-picker" type="button" aria-label="Choose output folder" title="Choose output folder" disabled={busy} onClick={chooseOutputFolder}><svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7.5h7l2 2H21v10H3z"/><path d="M3 7.5V5h8l2 2"/><path d="M12 14h6m-3-3v6"/></svg></button>
    <button type="button" className="folder-clear-button" aria-label="Clear output folder selection" title="Clear output folder selection" disabled={busy||!outputFolder} onClick={clearOutputFolder}>✕</button>
   </div>
   {outputFolderStatus&&<p className="folder-inline-status" role="status">{outputFolderStatus}</p>}
  </div>
 </div>
 <input ref={folderInput} type="file" webkitdirectory="" multiple hidden onChange={e=>{
  const selected=Array.from(e.target.files||[]);
  e.target.value='';
  if(!selected.length)return;
  const first=selected[0].webkitRelativePath||'';
  setSessionFolderName(first.split('/')[0]||'Selected folder');
  setFolder(null);
  setFolderConnection('ready');
  setFolderPreferenceStatus('Folder selected for this browser session. Files are loaded locally. This browser cannot preserve folder access across logins; choose this folder again next session, or use Chrome/Edge on macOS for remembered access.');
  stageFiles(selected);
}}/>
 {folderStatus&&<p role="status" className="folder-inline-status">{folderStatus}</p>}
 {coreIngestion(coreSystem).adapter&&candidates.length>0&&<section aria-label="Module file readiness" style={{padding:'12px 0'}}>
  <details className="source-coverage-details"><summary><strong>View File Details</strong> <span className="source-coverage-summary">· {candidates.filter(c=>c.role).length} / {candidates.length} files assigned · {candidates.filter(c=>!c.role).length} need review</span></summary>
  <div style={{marginTop:12}}><div className="section-title-help"><h3>Source coverage by module</h3><SectionHelp title="Source coverage"><p>The coverage table counts report names recognized for each module. A recognized filename is not proof of a valid file, matching business date, correct content, or balanced reconciliation.</p><p>Review duplicate and missing source roles before loading files. DataSafe and Portico parsing requires vendor-specific validation.</p></SectionHelp></div></div>
  <div className="table-scroll"><table><thead><tr><th>MODULE</th><th>IDENTIFIED</th><th>MISSING</th><th>STATUS</th></tr></thead><tbody>
   {['shares-loans','cash','drafts','eft','atm','ach'].map(module=>{const coverage=sourceCoverage(coreSystem,module,files,candidates);return <tr key={module}><td>{navigation.find(n=>n[2]===module)?.[1]||module}</td><td>{coverage.matched.length} / {coverage.required.length}</td><td>{coverage.missing.join(', ')||'—'}</td><td>{coverage.duplicates.length?'Duplicate roles':coverage.missing.length?'Missing files':'Names identified only'}</td></tr>;})}
  </tbody></table></div></details></section>}
 {candidates.length>0&&<><div className="table-scroll"><table><thead><tr><th>FILE</th><th>ROLE</th><th>RECOGNITION</th></tr></thead><tbody>{candidates.map(c=><tr key={c.index}><td>{c.file.name}</td><td><select aria-label={'Role for '+c.file.name} value={c.role} onChange={e=>{setDatesConfirmed(false);setCandidates(p=>p.map(x=>x.index===c.index?{...x,role:e.target.value}:x));}}><option value="">Ignore / unresolved</option>{defs.filter(([key])=>Object.hasOwn(coreIngestion(coreSystem).fileDefinitions,key)).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></td><td>{c.role?'Assigned (verify contents and date)':c.status==='ambiguous'?'Ambiguous — select a role':'Unknown — select a role or ignore'}</td></tr>)}</tbody></table></div><SectionHelp title="File recognition"><p>Check the report's business date and credit union. Abacus uses known filename patterns and does not authenticate files by their names.</p><p>Use the Role dropdown for unmatched names. Multiple files assigned to the same role must be resolved before loading.</p></SectionHelp><button className="primary" disabled={busy||coreSystem!=='xp2'} onClick={importCandidates}>Load identified files</button></>}</section>}
 {page==='settings'&&account.role==='guest'&&<section className="folder-settings"><h2>Centralized multi-tenant features</h2><p>Credit union administration, centrally saved settings, and persistent reconciliation history require an authenticated account. They are disabled while the temporary login bypass remains active. Current local balancing is unaffected.</p></section>}{page==='platform'&&account.role==='admin'&&<TenantAdministration account={account} activeCU={activeCU} unions={unions} onReload={loadTenants} onSelect={setActiveCU}/>} {page==='platform'&&account.role==='admin'&&<UserManagement/>}{page==='platform'&&account.role==='admin'&&account.isPlatformOwner===true&&<section className="folder-settings"><h2>Platform-wide activity</h2><button type="button" onClick={()=>setPage('platform-activity')}>Open Activity Log across all credit unions</button></section>}{page==='platform'&&account.role==='admin'&&<CentralSettingsMigration account={account} activeCU={activeCU} unions={unions}/>}{page==='settings'&&<><section className="folder-settings"><div className="section-title-help"><h2>Account mapping</h2><SectionHelp title="Account mapping"><p>Review the GL account-to-core report mapping for the selected credit union. XP2 mappings can be stored with version control. DataSafe and Portico remain unvalidated and cannot save provisional mappings as production-ready.</p></SectionHelp></div>{centralTenant&&account.role==='admin'&&<><p>Current central mapping version: {mappingVersion||'Not saved'}</p><button type="button" disabled={busy||coreSystem!=='xp2'} onClick={async()=>{if(!confirm('Save the currently displayed mapping for this credit union and core system?'))return;try{const r=await tenantAPI('save-mapping',{tenantId:activeCU,body:{coreSystem,mapping:master,version:mappingVersion}});setMaster(r.mapping);setMappingVersion(r.version);setSettingsStatus('Account mapping saved centrally.');}catch(e){setSettingsStatus('Account mapping not saved: '+e.message);}}}>Save mapping to credit union database</button></>}</section><div className="gl-mapping-panels"><GLMappingImport tenantId={activeCU} coreSystem={coreSystem} master={master} version={mappingVersion} canSave={centralTenant&&settingsReady&&!busy&&coreSystem==='xp2'} onSaved={(mapping,nextVersion)=>{setMaster(mapping);setMappingVersion(nextVersion);setResult(null);setReview(null);setApproved(false);setMappingOK(false);setSettingsStatus('New GL mapping saved. Prior balancing results cleared; run reconciliation again.');}}/><MasterMapping master={master}/></div></>}
 {page==='settings'&&<section className="folder-settings"><div className="section-title-help"><h2>Local workspace</h2><SectionHelp title="Local workspace"><p>Source files and detailed reconciliation results remain in the browser session. Refreshing or closing the page clears unsaved report data.</p><p>Core preferences and supported settings may be saved centrally for the credit union. Browser folder permissions remain device-specific. Export evidence before ending a session.</p></SectionHelp></div><p>Workspace: {cuName}</p>{settingsStatus&&<p role="status">{settingsStatus}</p>}</section>}
 {page==='history'&&centralTenant&&<section className="folder-settings"><h2>Saved reconciliation history</h2><p>Last 100 runs for this credit union. Only summary counts and source hashes are stored, not member files or account-level records.</p><div className="table-scroll"><table><thead><tr><th>Date</th><th>Module</th><th>Status</th><th>Checks</th><th>Issues</th></tr></thead><tbody>{historicalRuns.map(h=><tr key={h.id}><td>{new Date(h.run_at).toLocaleString()}</td><td>{h.workspace}</td><td>{h.status}</td><td>{h.check_count}</td><td>{h.issue_count}</td></tr>)}</tbody></table></div>{!historicalRuns.length&&<p>No saved runs for this credit union.</p>}</section>}{historyStatus&&<p role="status">{historyStatus}</p>}{(page==='history'||page==='audit')&&<section className="activity"><h2>Session activity <span>{activity.length} runs</span></h2><p>This history is cleared on refresh. Export evidence for the current run before clearing.</p>{activity.map(a=><div className="activity-row" key={a.id}><span>{new Date(a.timestamp).toLocaleString()}</span><span>{a.mode==='demo'?'SYNTHETIC DEMO':'IMPORTED FILES'}</span><strong>{a.issues} exceptions / {a.checks} checks</strong></div>)}</section>}
 
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
 return <>{error&&<div role="alert" className="error">{error}</div>}<App key={account.id} account={account} onLogout={onLogout} onPasswordChanged={()=>setAccount(null)}/></>;
}
createRoot(document.getElementById('root')).render(<AuthGate/>);
