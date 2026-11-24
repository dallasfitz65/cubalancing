// The selected institution comes from credit union Settings, never from a hardcoded vendor list.
export function normalizeInstitutionName(name){
 return String(name??'').normalize('NFKC').toUpperCase().replace(/[^A-Z0-9]+/g,' ').trim().replace(/\s+/g,' ');
}
export function verifyEftInstitution(reportText,configuredName){
 const expected=normalizeInstitutionName(configuredName);
 if(!expected||expected==='DEMO CREDIT UNION'&&String(configuredName).trim()===''){
  throw Error('Credit union name is not configured. Save the institution name in Settings before EFT balancing.');
 }
 if(expected.length<4)throw Error('Credit union name in Settings is too short to verify EFT source identity.');
 const observed=normalizeInstitutionName(reportText);
 // Exact phrase, with word boundaries: prevents a substring of another institution's name matching.
 if(!(' '+observed+' ').includes(' '+expected+' ')){
  throw Error('EFT institution identity mismatch: report does not contain the credit union name configured in Settings ('+String(configuredName).trim()+'). No EFT balancing result was created.');
 }
 return expected;
}
