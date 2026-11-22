import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const file=path=>readFileSync(new URL('../src/'+path,import.meta.url),'utf8');
const components=[file('ATM.jsx'),file('ProcessAssistant.jsx')];
test('all assistant launchers are icon-only, accessible, and preserve open and close actions',()=>{
 for(const component of components){
  assert.match(component,/className="atm-chat-launcher"/);
  assert.match(component,/aria-label=\{.*?'Close Ask the System':'Open Ask the System'\}/);
  assert.match(component,/title=\{.*?'Close Ask the System':'Ask the System'\}/);
  assert.match(component,/<svg aria-hidden="true" viewBox="0 0 24 24"/);
  assert.doesNotMatch(component,/\{(?:chatOpen|opened)\?'Close chat':'Ask the System'\}/);
  assert.match(component,/aria-expanded=\{/);
 }
});
test('icon launcher has large enough touch target',()=>{
 const css=file('styles.css');
 assert.match(css,/\.atm-chat-launcher\{display:inline-flex;align-items:center;justify-content:center;width:52px;height:52px/);
});
