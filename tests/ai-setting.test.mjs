import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const main=readFileSync(new URL('../src/main.jsx',import.meta.url),'utf8');
const atm=readFileSync(new URL('../src/ATM.jsx',import.meta.url),'utf8');
const tenant=readFileSync(new URL('../netlify/functions/tenants.mjs',import.meta.url),'utf8');

test('AI feature defaults off and Settings allows credit-union scoped changes',()=>{
 assert.match(main,/useState\(false\),\[aiSaving,setAiSaving\]/);
 assert.match(main,/persistPreference\('ai-enabled',enabled\)/);
 assert.match(main,/setAiEnabled\(selected\['ai-enabled'\]===true\)/);
 assert.match(main,/getSetting\(folderScope,'ai-enabled'\)/);
 assert.match(main,/checked=\{aiEnabled\}/);
 assert.match(main,/aiEnabled=\{aiEnabled\}/);
});
test('server only accepts boolean AI settings, not URLs or tokens',()=>{
 assert.match(tenant,/key==='ai-enabled'&&typeof value==='boolean'/);
});
test('ATM assistant is rules-based and opt-in, not falsely connected to external AI',()=>{
 assert.match(atm,/aiEnabled=false/);
 assert.match(atm,/\{aiEnabled&&<div className="atm-assistant-dock"/);
 assert.match(atm,/Enterprise AI is not connected/);
 assert.match(atm,/answerAtmQuestion\(q,report\)/);
 assert.match(atm,/ATM Balancing · Local rules-based assistant/);
});
