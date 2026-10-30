const GL_ACCOUNTS = {
  shares:[
    {gl:'901-0010',label:'Regular Shares'},
    {gl:'901-0020',label:'Personal Choice'},
    {gl:'901-0040',label:'Club Grand'},
    {gl:'902-0060',label:'Member Funds'},
    {gl:'902-0070',label:'Share Drafts'},
    {gl:'908-0090',label:'Vacation Club'},
    {gl:'909-0000',label:'IRA Shares'},
  ],
  certs:[
    {gl:'904-0000',label:'Share Certificates'},
    {gl:'906-0000',label:'IRA Certificates'},
  ],
  loans:[
    {gl:'701-0000',label:'Unsecured Loans'},
    {gl:'701-0010',label:'Personal LOC'},
    {gl:'703-0000',label:'1st Mortgage'},
    {gl:'703-0010',label:'2nd Mortgage'},
    {gl:'703-0030',label:'Home Equity'},
    {gl:'704-0000',label:'Certificate Secured'},
    {gl:'704-0010',label:'Share Secured'},
    {gl:'705-0000',label:'New Vehicle'},
    {gl:'705-0020',label:'Used Vehicle'},
    {gl:'705-0040',label:'Indirect New'},
    {gl:'705-0050',label:'Indirect Used'},
  ],
  cash:'739-0000'
};


function parseSVST(text){
  const result = {};
  const lines = text.replace(/\r/g,'').split('\n');
  let currentType = null;
  for(const line of lines){
    if(line.includes('GRAND TOTALS')) break;
    const tm = line.match(/^\s+(\d+)\s+\w/);
    if(tm) currentType = parseInt(tm[1]);
    if(line.includes('TYPE TOTALS') && currentType !== null){
      const nums = [...line.matchAll(/([\d,]+\.\d{2})(?!\d)/g)].map(m=>parseFloat(m[1].replace(/,/g,'')));
      if(nums.length) result[currentType] = nums[0];
    }
  }
  return result;
}

// ─── LNST Parser ──────────────────────────────────────────────────────────────
function parseLNST(text){
  const result = {};
  const lines = text.replace(/\r/g,'').split('\n');
  let currentType = null, readNext = false;
  for(const line of lines){
    if(/^GRAND\b/.test(line.trim())) break;
    const tm = line.match(/^\s+(\d+)\s+\w/);
    if(tm){ currentType = parseInt(tm[1]); readNext=false; }
    if(/^TYPE\s+[\d.]+/.test(line.trim()) && currentType !== null){ readNext=true; continue; }
    if(readNext && line.trim()){
      const nums = [...line.matchAll(/([\d,]+\.\d{2})(?!\d)/g)].map(m=>parseFloat(m[1].replace(/,/g,'')));
      if(nums.length) result[currentType] = nums[0];
      readNext = false;
    }
  }
  return result;
}

// ─── COBD Parser ──────────────────────────────────────────────────────────────
function parseCOBD(text){
  const branches = [];
  for(const line of text.replace(/\r/g,'').split('\n')){
    const m = line.match(/TOTALS FOR BRANCH NBR\s+(\d+)\s+([\d,]+\.\d{2})/);
    if(m) branches.push({num:m[1], total:parseFloat(m[2].replace(/,/g,''))});
  }
  return {branches, total: branches.reduce((s,b)=>s+b.total, 0)};
}

// ─── GL → Source System Type Mappings (Demo Credit Union) ────────────────────────
const SVST_GL_MAP = {
  '901-0010': [1,3,5],
  '901-0020': [2],
  '901-0040': [4],
  '902-0060': [8,28],
  '902-0070': [9,27,29,30,35,36,37,38],
  '908-0090': [7],
  '909-0000': [11,12,13],
  '904-0000': [14,15,16,17,49],
  '906-0000': [18,19,20,22,23,24,25,45,46,51,52],
};
const LNST_GL_MAP = {
  '701-0000': [4,22,41],
  '701-0010': [36],
  '703-0000': [13],
  '703-0010': [29],
  '703-0030': [8,10,12,31,32,35],
  '704-0000': [21],
  '704-0010': [23],
  '705-0000': [18],
  '705-0020': [26],
  '705-0040': [14],
  '705-0050': [15],
};

// ─── Build Sections from Parsed Data ─────────────────────────────────────────
function buildSections(glData, svstData, lnstData, cobdData){
  const fmtAmt = n => n==null ? '—' : '$'+n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g,',');
  const calcVar = (src,tb) => {
    if(src==null||tb==null) return {str:'MISSING DATA',ok:false,raw:null};
    const d = (Math.round(src*100)-Math.round(tb*100))/100;
    if(d===0) return {str:'$0.00',ok:true,raw:0};
    return {str:'$'+Math.abs(d).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g,','),ok:false,raw:d};
  };

  function makeShareRows(accounts, svstRaw){
    return accounts.map(a=>{
      const tb    = glData[a.gl]??null;
      const types = SVST_GL_MAP[a.gl]||[];
      const src   = types.length && types.every(t => Object.hasOwn(svstRaw,t)) ? types.reduce((s,t)=>s+svstRaw[t],0) : null;
      const v     = calcVar(src,tb);
      return {
        gl:a.gl, desc:a.label,
        svst:fmtAmt(src), tb:fmtAmt(tb), var:v.str, varRaw:v.raw, ok:v.ok,
        codes:types, codeData:types.map(t=>({code:t,amt:svstRaw[t]||0})),
        srcLabel:'Core', isLoan:false
      };
    });
  }
  function makeLoanRows(accounts, lnstRaw){
    return accounts.map(a=>{
      const tb    = glData[a.gl]??null;
      const types = LNST_GL_MAP[a.gl]||[];
      const src   = types.length && types.every(t => Object.hasOwn(lnstRaw,t)) ? types.reduce((s,t)=>s+lnstRaw[t],0) : null;
      const v     = calcVar(src,tb);
      return {
        gl:a.gl, desc:a.label,
        svst:fmtAmt(src), tb:fmtAmt(tb), var:v.str, varRaw:v.raw, ok:v.ok,
        codes:types, codeData:types.map(t=>({code:t,amt:lnstRaw[t]||0})),
        srcLabel:'Core', isLoan:true
      };
    });
  }

  const shareRows = makeShareRows(GL_ACCOUNTS.shares, svstData);
  const certRows  = makeShareRows(GL_ACCOUNTS.certs,  svstData);
  const loanRows  = makeLoanRows(GL_ACCOUNTS.loans,   lnstData);

  const glCash = glData[GL_ACCOUNTS.cash]??null;
  const cashRows = cobdData.branches.map(b=>({
    gl:'739-0000', desc:'Branch '+b.num+' — Drawers/Vault/ATM',
    svst:fmtAmt(b.total), tb:'—', var:'—', varRaw:null, ok:true,
    codes:[], codeData:[], srcLabel:'Core', isLoan:false, branchOnly:true
  }));
  const cv = calcVar(cobdData.total, glCash);
  cashRows.push({
    gl:'739-0000', desc:'Cash Total vs GL 739-0000',
    svst:fmtAmt(cobdData.total), tb:fmtAmt(glCash), var:cv.str, varRaw:cv.raw, ok:cv.ok,
    codes:[], codeData:[], srcLabel:'Core', isLoan:false, isCashTotal:true
  });

  const badge = rows => rows.every(r=>r.ok) ? 'OK' : rows.filter(r=>!r.ok).length+' VAR';
  return [
    {id:'shares', label:'Share Accounts',  badge:badge(shareRows), rows:shareRows},
    {id:'certs',  label:'Certificates',    badge:badge(certRows),  rows:certRows},
    {id:'loans',  label:'Loans',           badge:badge(loanRows),  rows:loanRows},
    {id:'cash',   label:'Cash on Hand',    badge:cv.ok?'OK':'1 VAR', rows:cashRows},
  ];
}


const DEMO_SECTIONS = (() => {
  const gl = {}, shares = {}, loans = {};
  Object.values(SVST_GL_MAP).flat().forEach(t => shares[t] = t * 100);
  Object.values(LNST_GL_MAP).flat().forEach(t => loans[t] = t * 200);
  Object.entries(SVST_GL_MAP).forEach(([k,ts]) => gl[k] = ts.reduce((n,t)=>n+shares[t],0));
  Object.entries(LNST_GL_MAP).forEach(([k,ts]) => gl[k] = ts.reduce((n,t)=>n+loans[t],0));
  gl[GL_ACCOUNTS.cash] = 1000;
  return buildSections(gl, shares, loans, {branches:[{num:'1',total:1000}],total:1000});
})();


export {GL_ACCOUNTS, SVST_GL_MAP, LNST_GL_MAP, parseSVST, parseLNST, parseCOBD, buildSections, DEMO_SECTIONS};
