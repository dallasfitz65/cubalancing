// Source-backed accounting controls adapted from the supplied XP2/Wisdom procedures.
// These are control definitions, NOT verified XP2/DataSafe file layouts or GL numbers.
export const RULE_CATALOG=[
 {module:'ach',label:'ACH',status:'design',sources:['ACH operator','XP2 posting','Wisdom GL','settlement bank'],checks:[
  {id:'ach.received',name:'Received ACH posting',formula:'received = posted + pending + identified exceptions',groupBy:['direction','settlementDate'],guards:['Compare credits and debits separately','Nonmonetary records count but do not change dollars']},
  {id:'ach.originated',name:'Origination acceptance',formula:'authorized = accepted + rejected + pending',groupBy:['direction','effectiveDate'],guards:['Transmitted does not imply accepted','Reconcile origination funding separately']},
  {id:'ach.settlement',name:'ACH net cash movement',formula:'receivedCredits - receivedDebits - originatedCredits + originatedDebits + settledReturnCashEffect',groupBy:['settlementDate','window'],guards:['Count only returns settled in the window','Do not substitute file totals for settlement advice']},
  {id:'ach.clearing',name:'ACH clearing support',formula:'ending GL clearing = signed outstanding items',guards:['Track trace number, status, posting date, and settlement date','Notifications of Change are nonmonetary']}
 ]},
 {module:'atm',label:'ATM',status:'partial',sources:['ATM journal','XP2 member posting','Wisdom GL','network settlement','cash servicing'],checks:[
  {id:'atm.postings',name:'ATM member posting',formula:'completed financial member transactions = XP2 posted + identified open items',groupBy:['transactionType'],guards:['Authorizations are not dispenses','Match reversal and partial dispense separately']},
  {id:'atm.cash',name:'ATM physical cash',formula:'openingCash + loaded - removed - dispensed + cashAccepted = expectedClosingCash',groupBy:['terminalId','businessDate'],guards:['Include retract/reject compartments in physical total','Exclude check deposits from currency','Recycling machines need separate note movements']},
  {id:'atm.settlement',name:'ATM external settlement',formula:'nonmember reimbursements - outsideMemberWithdrawals + feesReceived - feesPaid + adjustments',groupBy:['settlementDate'],guards:['Prevent double counting in EFT combined settlement','In-house member withdrawals generally do not trigger external principal settlement']},
  {id:'atm.clearing',name:'ATM suspense support',formula:'ending GL clearing = signed outstanding items',guards:['Include cash count, network and unsettled transaction references']}
 ]},
 {module:'eft',label:'EFT',status:'partial',sources:['EFT processor','XP2','Wisdom GL','settlement bank'],checks:[
  {id:'eft.postings',name:'EFT processor to core',formula:'financial debits/credits = XP2 posted + identified outstanding',groupBy:['direction','businessDate'],guards:['Authorizations are not settled activity','Track refunds and reversals separately']},
  {id:'eft.gl',name:'EFT GL interface',formula:'XP2 posted interface batch = Wisdom posted batch',guards:['Detect missing, duplicated and misdated GL batches']},
  {id:'eft.settlement',name:'EFT settlement',formula:'purchases - refunds - interchangeReceived + networkFees + adjustments',groupBy:['settlementDate'],guards:['Separate or exclude ATM components already reconciled in ATM','Separate fee settlement windows if necessary']},
  {id:'eft.clearing',name:'EFT clearing support',formula:'ending GL clearing = signed outstanding items',guards:['Pending stand-in postings and network adjustments require item detail']}
 ]},
 {module:'drafts',label:'Share Drafts',status:'partial',sources:['presentment processor','XP2','Wisdom GL','settlement bank'],checks:[
  {id:'drafts.member',name:'Checking liabilities',formula:'XP2 member share draft balances = mapped Wisdom deposit GL',guards:['Use identical dates and posted batches','Investigate overdraft reclassification']},
  {id:'drafts.presentment',name:'Presented checks',formula:'presented = posted + identified exceptions',groupBy:['businessDate'],guards:['Require check number, reference, amount','Track final pay/return/hold disposition']},
  {id:'drafts.settlement',name:'Check settlement and return',formula:'original settlement = posted charges + return receivables + other supported differences',guards:['Return credit can settle later than original debit','Do not assume settled equals posted']},
  {id:'drafts.clearing',name:'Share draft clearing support',formula:'ending GL clearing = signed outstanding items',guards:['Include timing, returns and adjustment evidence']}
 ]},
 {module:'credit',label:'Credit Cards',status:'design',sources:['card processor','XP2','Wisdom GL','settlement bank'],checks:[
  {id:'credit.portfolio',name:'Card portfolio roll-forward',formula:'opening + purchases + advances + billedInterest + fees - payments - credits - chargeOffs + signedAdjustments = ending',guards:['Identify authoritative card subledger','Reconcile principal, accrued interest and fees to corresponding GL separately']},
  {id:'credit.payments',name:'XP2 payment acceptance',formula:'XP2 payments = processor accepted + rejected + identified outstanding',guards:['Transmitted is not accepted','Detect missing, duplicate and reversed payments']},
  {id:'credit.settlement',name:'Card settlement',formula:'processor net settlement = bank actual = Wisdom settlement entries',guards:['Card loan balance change need not equal cash settlement','Separate purchases, refunds, fees, interchange and chargebacks']},
  {id:'credit.clearing',name:'Card clearing support',formula:'ending GL clearing = signed outstanding items',guards:['Every item requires date, reference, owner and expected resolution']}
 ]}
];
export const getModuleRules=module=>RULE_CATALOG.find(r=>r.module===module);
export const RULE_SOURCE_NOTICE='Adapted from user-provided Balancing ACH, ATM, EFT, Share Draft and Credit Card — XP2 & Wisdom procedures (November 2026). Illustrative accounting logic; validate processor cutoffs, GL mappings, exact file structures and credit-union policy before enabling automatic posting.';
