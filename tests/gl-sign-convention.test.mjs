import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizeGL,GL_SIGN_CONVENTIONS} from '../src/gl-sign-convention.mjs';
import {importMaster,buildMappedSections} from '../src/master-mapping.mjs';
const map=importMaster([
 '901-0010,Regular Shares,,,Shares,1',
 '701-0000,Unsecured Loans,,,Loans,4',
 '739-0000,Cash on Hand,,,Cash,TOTALS FOR BRANCH NBR 1'
].join('\n'));
const GL=(shares,loans,cash)=>({records:[{account:'901-0010',cents:shares},{account:'701-0000',cents:loans},{account:'739-0000',cents:cash}]});
const evaluate=(review,mode)=>buildMappedSections(map,normalizeGL(review,mode),{'1':15000},{'4':27000},{branches:[{num:'1',total:360}]}).flatMap(section=>section.rows);
test('positive synthetic GL matches core with As reported sign convention',()=>{
 const rows=evaluate(GL(15000,27000,36000),'natural');
 assert.equal(rows.length,3);
 assert.ok(rows.every(row=>row.ok));
 assert.ok(rows.every(row=>row.varRaw===0));
});
test('credit-negative convention reverses liabilities only, never loans or cash',()=>{
 const rows=evaluate(GL(-15000,27000,36000),'credit-negative');
 assert.ok(rows.every(row=>row.ok));
 const falsePolarity=evaluate(GL(15000,27000,36000),'credit-negative');
 assert.equal(falsePolarity.find(row=>row.gl==='901-0010').varRaw,300);
 assert.ok(falsePolarity.find(row=>row.gl==='701-0000').ok);
});
test('fully negative trial balance can be reversed explicitly without masking variance',()=>{
 const rows=evaluate(GL(-15000,-27000,-36000),'reverse-all');
 assert.ok(rows.every(row=>row.ok));
 const variance=evaluate(GL(-15000,-27001,-36000),'reverse-all');
 assert.equal(variance.find(row=>row.gl==='701-0000').varRaw,-0.01);
 assert.equal(variance.filter(row=>!row.ok).length,1);
});
test('invalid convention fails, no absolute-value matching',()=>{
 assert.throws(()=>normalizeGL(GL(-15000,27000,36000),'absolute'));
 assert.equal(Object.keys(GL_SIGN_CONVENTIONS).length,3);
});
test('Settings exposes sign selector and tenant service persists reversed-all choice',()=>{
 const ui=readFileSync(new URL('../src/main.jsx',import.meta.url),'utf8');
 const api=readFileSync(new URL('../netlify/functions/tenants.mjs',import.meta.url),'utf8');
 assert.match(ui,/<select id="gl-sign-convention"/);
 assert.match(ui,/normalizeGL\(runReview,sign\)/);
 assert.match(ui,/persistPreference\('sign-convention',value\)/);
 assert.match(api,/\['credit-negative','natural','reverse-all'\]/);
});
