// Aggregate-only historical EFT examples from separately supplied reports.
// Source cycles and institutions differ; never combine these into a cleared reconciliation.
// No raw reports, member identifiers, account-level transactions or individual teller records.
export const EFT_PREVIEW=Object.freeze({
 historical:true,
 groups:[
  {id:'core',name:'Core & teller controls',institution:'Example institution A',date:'2022-11-15',status:'Aggregate controls agree',
   rows:[
    {label:'Draft purchases (18)',value:347925,source:'Core day totals'},
    {label:'Share withdrawals (10)',value:238000,source:'Core day totals'},
    {label:'Draft withdrawals (529)',value:3345640,source:'Core day totals'},
    {label:'Core debits (539)',value:3583640,source:'Core day totals'},
    {label:'Core credits (18)',value:347925,source:'Core day totals'},
    {label:'Net core withdrawals',value:3235715,source:'Calculated: debits − credits'},
    {label:'Teller 99 paid out',value:3583640,source:'Teller totals'},
    {label:'Teller 99 received',value:347925,source:'Teller totals'},
    {label:'Teller 99 net cash out',value:3235715,source:'Calculated: paid out − received'},
    {label:'Core vs teller net variance',value:0,source:'Calculated difference'}
   ],note:'Two uploaded Day Totals files are byte-for-byte duplicates; counted once. These controls agree but do not verify settlement or GL.'},
  {id:'network',name:'STAR settlement & ATM owner',institution:'Example institution B',date:'2022-11-15',status:'Separate source totals — not matched to core',
   rows:[
    {label:'STAR total debits',value:6714012,source:'STAR GL settlement'},
    {label:'STAR total credits',value:6714012,source:'STAR GL settlement'},
    {label:'STAR debit/credit difference',value:0,source:'Calculated internal control'},
    {label:'STAR settlement account entry (credit)',value:2961639,source:'STAR GL settlement'},
    {label:'ATM owner withdrawals (14)',value:398000,source:'ATM owner report'},
    {label:'ATM owner transfers (1)',value:20000,source:'ATM owner report'},
    {label:'ATM owner all transactions (16)',value:418000,source:'ATM owner report'}
   ],note:'The STAR report and ATM owner report belong to the same reported institution and date, but these are different measures. Do not equate the owner activity total with STAR settlement.'},
  {id:'later',name:'Rejects & GL clearing detail',institution:'Example institution A',date:'2023-03-28',status:'Other cycle — settlement matching pending',
   rows:[
    {label:'Rejected/unauthorized withdrawals (15)',value:94648,source:'ATM business day rejects'},
    {label:'GL starting balance',value:-3422293,source:'GL detail'},
    {label:'GL debits',value:4073576,source:'GL detail'},
    {label:'GL credits',value:4327291,source:'GL detail'},
    {label:'GL net activity',value:-253715,source:'Calculated: debits − credits'},
    {label:'GL ending balance',value:-3676008,source:'GL detail'}
   ],note:'The March rejects and GL detail do not establish a settled EFT batch. GL ending balance is not zero; a zero variance or completed reconciliation must not be asserted.'}
 ]
});
