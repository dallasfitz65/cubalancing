import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const ui=readFileSync(new URL('../src/main.jsx',import.meta.url),'utf8');
const api=readFileSync(new URL('../netlify/functions/tenants.mjs',import.meta.url),'utf8');

test('local ATM rules provider is selectable and the default for an unconfigured platform',()=>{
 assert.match(ui,/provider:'local-rules',baseUrl:'',model:'',authMethod:'oauth-sso'/);
 assert.match(ui,/\['local-rules','ABACUS Local Rules-Based Assistant \(current default\)'\]/);
 assert.match(ui,/\.\.\.\(data.setting\|\|\{\}\)/); // Existing selections remain authoritative.
});

test('local rules provider never needs an external endpoint or model',()=>{
 assert.match(ui,/const isLocal=aiIntegration.provider==='local-rules'/);
 assert.match(ui,/const baseUrl=isLocal\?'':aiIntegration\.baseUrl\.trim\(\)/);
 assert.match(ui,/model:isLocal\?'':aiIntegration\.model\.trim\(\)/);
 assert.match(ui,/aiIntegration\.provider==='local-rules'\?/);
 assert.match(api,/\['local-rules','united-openai','united-ollama','custom'\]/);
 assert.match(api,/value\.provider==='local-rules'&&\(value\.baseUrl!==''\|\|value\.model!==''\|\|value\.authMethod!=='oauth-sso'\)/);
});
