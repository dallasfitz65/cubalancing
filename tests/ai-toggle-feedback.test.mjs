import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const ui=readFileSync(new URL('../src/main.jsx',import.meta.url),'utf8');
test('AI setting exposes a labeled On/Off switch',()=>{
 assert.match(ui,/id="ai-investigation-switch"/);
 assert.match(ui,/checked=\{aiEnabled\}/);
 assert.match(ui,/onChange=\{changeAiEnabled\}/);
 assert.match(ui,/<SettingsSwitch/);
});

test('AI state changes before server save and restores if it fails',()=>{
 const fn=ui.slice(ui.indexOf('async function changeAiEnabled('),ui.indexOf('async function persistPreference('));
 assert.ok(fn.indexOf('setAiEnabled(enabled)')<fn.indexOf("await persistPreference('ai-enabled',enabled)"));
 assert.match(fn,/setAiEnabled\(previous\)/);
 assert.match(fn,/AI setting could not be saved:/);
 assert.match(fn,/setAiNotice\(/);
});
test('AI save errors display adjacent to button and existing tenant permissions remain enforced',()=>{
 assert.match(ui,/role=\{aiNotice.includes\('could not be saved'\)\?'alert':'status'\}/);
 assert.match(ui,/United Solutions enterprise AI is not connected/);
 const api=readFileSync(new URL('../netlify/functions/tenants.mjs',import.meta.url),'utf8');
 assert.match(api,/key==='ai-enabled'&&typeof value==='boolean'/);
 assert.match(api,/Credit union administrator required/);
});
