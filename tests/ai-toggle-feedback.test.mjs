import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const ui=readFileSync(new URL('../src/main.jsx',import.meta.url),'utf8');
test('AI setting has an explicit large Enable/Disable button with current state',()=>{
 assert.match(ui,/Current setting: \{aiEnabled\?'On':'Off'\}/);
 assert.match(ui,/aria-pressed=\{aiEnabled\}/);
 assert.match(ui,/onClick=\{\(\)=>changeAiEnabled\(!aiEnabled\)\}/);
 assert.match(ui,/Enable AI investigation assistant/);
 assert.match(ui,/Disable AI investigation assistant/);
 assert.doesNotMatch(ui,/type="checkbox" checked=\{aiEnabled\}/);
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
