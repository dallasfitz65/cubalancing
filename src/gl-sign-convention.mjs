// Explicit GL sign conventions. Never compare absolute values: that would hide polarity errors.
export const GL_SIGN_CONVENTIONS=Object.freeze({
 'natural':'As reported (no sign changes)',
 'credit-negative':'Credit accounts negative (reverse share/certificate liabilities)',
 'reverse-all':'All GL signs reversed'
});
export function normalizeGL(review,convention='credit-negative'){
 if(!Object.hasOwn(GL_SIGN_CONVENTIONS,convention))throw Error('Unsupported GL sign convention.');
 if(!Array.isArray(review?.records))throw Error('GL records are required.');
 return Object.fromEntries(review.records.map(record=>{
  if(!/^\d{3}-\d{4}$/.test(record.account)||!Number.isSafeInteger(record.cents))throw Error('Invalid GL account or balance.');
  const reverse=convention==='reverse-all'||(convention==='credit-negative'&&/^(90[124689])/.test(record.account));
  return [record.account,(reverse?-record.cents:record.cents)/100];
 }));
}
