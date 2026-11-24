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

test('Demo Credit Union accepts only recognized historical EFT fixture institutions',()=>{
 assert.equal(verifyEftInstitution('Core day totals for Ridgedale Federal Credit Union','Demo Credit Union',{allowDemoFixtures:true}),'RIDGEDALE FEDERAL CREDIT UNION');
 assert.equal(verifyEftInstitution('NOVARTIS FEDERAL CREDIT UNION STAR settlement','Demo Credit Union',{allowDemoFixtures:true}),'NOVARTIS FEDERAL CREDIT UNION');
 assert.throws(()=>verifyEftInstitution('Unknown Real Credit Union','Demo Credit Union',{allowDemoFixtures:true}),/identity mismatch/i);
 assert.throws(()=>verifyEftInstitution('Ridgedale Federal Credit Union and Novartis Federal Credit Union','Demo Credit Union',{allowDemoFixtures:true}),/multiple institutions/i);
});
test('demo fixture opt-in never weakens production institution validation',()=>{
 assert.throws(()=>verifyEftInstitution('Ridgedale Federal Credit Union','Demo Credit Union'),/identity mismatch/i);
 assert.throws(()=>verifyEftInstitution('Ridgedale Federal Credit Union','Southern Energy Credit Union',{allowDemoFixtures:true}),/identity mismatch/i);
 assert.match(eft,/DEMO SAMPLE DATA/);
 assert.match(eft,/allowDemoFixtures/);
 assert.equal((main.match(/allowDemoFixtures=\{cuName\.trim\(\)\.toLowerCase\(\)===\x27demo credit union\x27\}/g)||[]).length,2);
});
