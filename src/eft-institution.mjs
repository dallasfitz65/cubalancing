// Match EFT report identity to selected credit union Settings. Demo fixtures are
// explicitly scoped to the Demo Credit Union and never used for a real institution.
const DEMO_WORKSPACE='DEMO CREDIT UNION';
const DEMO_FIXTURE_INSTITUTIONS=['RIDGEDALE FEDERAL CREDIT UNION','NOVARTIS FEDERAL CREDIT UNION'];

export function normalizeInstitutionName(name){
 return String(name??'').normalize('NFKC').toUpperCase().replace(/[^A-Z0-9]+/g,' ').trim().replace(/\s+/g,' ');
}
const hasInstitutionPhrase=(observed,expected)=>(' '+observed+' ').includes(' '+expected+' ');
export function verifyEftInstitution(reportText,configuredName,{allowDemoFixtures=false}={}){
 const expected=normalizeInstitutionName(configuredName);
 if(!expected)throw Error('Credit union name is not configured. Save the institution name in Settings before EFT balancing.');
 if(expected.length<4)throw Error('Credit union name in Settings is too short to verify EFT source identity.');
 const observed=normalizeInstitutionName(reportText);
 if(hasInstitutionPhrase(observed,expected))return expected;
 // Demo workspace uses sample files from the original EFT test suite. Preserve
 // the detected real sample identity so mixed-institution fixtures still fail.
 if(allowDemoFixtures&&expected===DEMO_WORKSPACE){
  const matches=DEMO_FIXTURE_INSTITUTIONS.filter(name=>hasInstitutionPhrase(observed,name));
  if(matches.length===1)return matches[0];
  if(matches.length>1)throw Error('Demo EFT file names multiple institutions. Load exactly one institution per source report.');
 }
 throw Error('EFT institution identity mismatch: report does not contain the credit union name configured in Settings ('+String(configuredName).trim()+'). No EFT balancing result was created.');
}
