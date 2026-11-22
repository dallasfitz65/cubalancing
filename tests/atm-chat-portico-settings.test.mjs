import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {answerAtmQuestion} from '../src/atm-assistant.mjs';
import {CORE_SYSTEMS,getCoreSystem,getCoreMapping} from '../src/core-profiles.mjs';

const ui=readFileSync(new URL('../src/main.jsx',import.meta.url),'utf8');
const api=readFileSync(new URL('../netlify/functions/tenants.mjs',import.meta.url),'utf8');
const atm=readFileSync(new URL('../src/ATM.jsx',import.meta.url),'utf8');
const report={terminal:'ATM01',date:'2026-11-20',beginning:100000,loaded:30000,removed:0,dispensed:10000,expected:120000,counted:120000,glCash:120000,settled:10000,checks:[{name:'ATM clearing vs network settlement',source:10000,actual:15000,variance:5000,ok:false}]};

test('Settings ordering puts AI assistant first and Local workspace last',()=>{
 const ai=ui.indexOf('aria-label="AI settings"');
 const core=ui.indexOf('<h2>Core system</h2>');
 const gl=ui.indexOf('aria-label="GL sign convention settings"');
 const folder=ui.indexOf('<h2>Folder Configuration</h2>');
 const workspace=ui.indexOf('<h2>Local workspace</h2>');
 assert.ok(ai>=0&&ai<gl&&ai<core);
 assert.ok(workspace>folder);
 assert.ok(workspace>ui.indexOf('<h2>Account mapping</h2>'));
});
test('Portico can be selected and persisted but is declared provisional',()=>{
 assert.equal(getCoreSystem('portico'),'portico');
 assert.match(CORE_SYSTEMS.portico.validation,/not yet validated/);
 assert.equal(getCoreMapping('portico').entries.length,getCoreMapping('xp2').entries.length);
 assert.match(ui,/<option value="portico">Portico<\/option>/);
 assert.match(api,/\['xp2','datasafe','portico'\]\.includes\(value\)/);
 assert.match(api,/\['xp2','datasafe','portico'\]\.includes\(system\)/);
});
test('ATM chat is visible with assistant enabled and only provides grounded local answers',()=>{
 assert.match(atm,/\{aiEnabled&&<div className="atm-assistant-dock"/);
 assert.match(atm,/ATM Reconciliation · Local rules-based assistant/);
 assert.match(atm,/Enterprise AI is not connected/);
 assert.match(answerAtmQuestion('Why is ATM out of balance?',report),/\$50\.00/);
 assert.match(answerAtmQuestion('Explain cash proof',report),/beginning/);
 assert.match(answerAtmQuestion('Why is ATM out of balance?',null),/Run ATM Balancing/);
});

test('tenant database allows the keys exposed by Settings',()=>{
 const migration=readFileSync(new URL('../netlify/database/migrations/20261121004500_tenant_settings_ai_folder_keys.sql',import.meta.url),'utf8');
 for(const key of ['core-system','sign-convention','ai-enabled','folder-name'])assert.match(migration,new RegExp("'"+key+"'"));
 assert.match(migration,/DROP CONSTRAINT IF EXISTS abacus_tenant_settings_setting_key_check/);
});
