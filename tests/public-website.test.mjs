import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const landing=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const app=readFileSync(new URL('../app.html',import.meta.url),'utf8');
const vite=readFileSync(new URL('../vite.config.js',import.meta.url),'utf8');

test('public ABACUS landing page opens secured app entry',()=>{
 assert.match(landing,/<title>ABACUS \| Credit Union Reconciliation<\/title>/);
 assert.match(landing,/<h1[^>]*>/);
 assert.match(landing,/>Open App/);
 assert.match(landing,/href="\/app\.html"/);
 assert.match(landing,/ATM Reconciliation/);
 assert.doesNotMatch(landing,/src\/main\.jsx/,'public page must not mount authenticated application');
});
test('Vite preserves both the public website and existing app entry',()=>{
 assert.match(vite,/index\.html/);
 assert.match(vite,/app\.html/);
 assert.match(app,/id="root"/);
 assert.match(app,/src\/main\.jsx/);
});
test('public website has no live customer data, account credentials or fake AI marketing claims',()=>{
 assert.doesNotMatch(landing,/@[a-z0-9.-]+\.[a-z]{2,}/i);
 assert.doesNotMatch(landing,/password\s*[:=]|api[_-]?key\s*[:=]/i);
 assert.match(landing,/Illustrative demo · Not live data/);
 assert.match(landing,/No actual credit union financial or transaction data/);
});

test('homepage hero uses original dark dashboard visual while protecting the live workspace',()=>{
 assert.match(landing,/class="visual-dots"/);
 assert.match(landing,/Shares Balanced/);
 assert.match(landing,/Loans Balanced/);
 assert.match(landing,/Certificates/);
 assert.match(landing,/Cash/);
 assert.match(landing,/Daily Processing/);
 assert.match(landing,/Anomaly Detection/);
 assert.match(landing,/role="img"/);
 assert.match(landing,/Illustrative demo · Not live data/);
 assert.match(landing,/href="\/app\.html"/);
});
