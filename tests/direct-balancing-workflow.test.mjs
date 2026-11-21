import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizeGL} from '../src/gl-sign-convention.mjs';
const ui=readFileSync(new URL('../src/main.jsx',import.meta.url),'utf8');
test('Shares, Loans and Cash exposes sign selection directly beside Run Balancing',()=>{
 assert.match(ui,/id="balancing-gl-sign"/);
 assert.match(ui,/checked=\{sign==='reverse-all'\} disabled=\{busy\|\|!settingsReady\}/);
 assert.match(ui,/GL Balance Sign Swap/);
 assert.match(ui,/normalizeGL\(runReview,sign\)/);
});
test('selected balance sign is traceable on report without hiding source values',()=>{
 assert.match(ui,/Original GL 901-0010/);
 assert.match(ui,/Normalized GL 901-0010/);
 assert.match(ui,/GL sign convention:/);
 const records=[{account:'901-0010',cents:105000}];
 assert.equal(normalizeGL({records},'natural')['901-0010'],1050);
 assert.equal(normalizeGL({records},'credit-negative')['901-0010'],-1050);
});
test('folder import no longer forces an unverifiable manual date checkbox',()=>{
 assert.doesNotMatch(ui,/!datesConfirmed\|\|!chosen.length/);
 assert.doesNotMatch(ui,/I checked that selected reports use the correct business date/);
 assert.match(ui,/Load identified files/);
 assert.match(ui,/No recognized report files selected/);
 assert.match(ui,/if\(new Set\(roles\).size!==roles.length\)/);
 assert.match(ui,/Unsupported file type or size/);
});
test('reconciliation still validates and parses source files even without approval',()=>{
 assert.match(ui,/extractGL\(files.gl/);
 assert.match(ui,/parseCoreCodes\(sv,'shares'\)/);
 assert.match(ui,/parseCoreCodes\(ln,'loans'\)/);
 assert.match(ui,/parseCOBD\(cb\)/);
});
