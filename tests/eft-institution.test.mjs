import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizeInstitutionName,verifyEftInstitution} from '../src/eft-institution.mjs';
const eft=readFileSync(new URL('../src/EFT.jsx',import.meta.url),'utf8');
const main=readFileSync(new URL('../src/main.jsx',import.meta.url),'utf8');
test('normalize credit union names across case, punctuation and whitespace',()=>{
 assert.equal(normalizeInstitutionName('  Southern-Energy  Credit Union '),'SOUTHERN ENERGY CREDIT UNION');
 assert.equal(verifyEftInstitution('Report prepared for SOUTHERN ENERGY\nCREDIT UNION.','Southern Energy Credit Union'),'SOUTHERN ENERGY CREDIT UNION');
});
test('mismatched institution is rejected and never silently accepted',()=>{
 assert.throws(()=>verifyEftInstitution('Ridgedale Federal Credit Union\nTotal 123','Novartis Federal Credit Union'),/identity mismatch/i);
 assert.throws(()=>verifyEftInstitution('Ridgedale Federal Credit Union','Ridgedale Federal Credit Union Extra'),/identity mismatch/i);
 assert.throws(()=>verifyEftInstitution('some other named credit union',''),/not configured/i);
 assert.throws(()=>verifyEftInstitution('any ABC anywhere','ABC'),/too short/i);
});
test('EFT no longer hardcodes institution list; all visible and automatic paths receive Settings name',()=>{
 assert.doesNotMatch(eft,/Ridgedale Federal Credit Union\|NOVARTIS FEDERAL CREDIT UNION/);
 assert.match(eft,/verifyEftInstitution\(text,creditUnionName\)/);
 assert.match(eft,/\[autoRun,data,files,creditUnionName\]/);
 assert.equal((main.match(/<EFT creditUnionName=\{cuName\}/g)||[]).length,2);
});
