import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {answerProcessQuestion,PROCESS_ASSISTANT_PROMPTS} from '../src/process-assistant.mjs';
const main=readFileSync(new URL('../src/main.jsx',import.meta.url),'utf8');
const chat=readFileSync(new URL('../src/ProcessAssistant.jsx',import.meta.url),'utf8');
const atm=readFileSync(new URL('../src/ATM.jsx',import.meta.url),'utf8');

test('each balancing module has scoped local investigation prompts',()=>{
 for(const name of ['shares-loans','cash','drafts','eft','ach'])assert.ok(PROCESS_ASSISTANT_PROMPTS[name]?.length);
 assert.match(main,/\['shares-loans','cash','drafts','eft','ach'\]\.includes\(page\)&&<ProcessAssistant module=\{page\}/);
 assert.match(main,/enabled=\{aiEnabled\}/);
 assert.match(chat,/answerProcessQuestion\(module,q,report\)/);
 assert.match(chat,/Enterprise AI is not connected/);
 assert.match(atm,/ATM Balancing · Local rules-based assistant/);
});
test('do not claim missing reports are balanced',()=>{
 assert.match(answerProcessQuestion('cash','why out of balance',null),/No completed/);
 assert.match(answerProcessQuestion('ach','what was verified',null),/not implemented or verified/);
});
test('Share Draft explanation separates source proof from unverified GL posting',()=>{
 const report={summary:{A:10000,B:9500,C:500,D:200,E:200,F:50,G:50}};
 assert.match(answerProcessQuestion('drafts','why out of balance',report),/\$0.50/);
 assert.match(answerProcessQuestion('drafts','gl postings',report),/have not been verified/);
});
test('EFT explanation does not claim full settlement reconciliation',()=>{
 const report={issues:[],controls:[],reports:[],rows:[]};
 assert.match(answerProcessQuestion('eft','why out of balance',report),/does not certify EFT settlement/);
});
test('GL explanations provide actual exceptions, without inventing a root cause',()=>{
 const report={meta:{signConvention:'reverse-all'},sections:[{id:'shares',rows:[{executed:true,branchOnly:false,ok:false,gl:'901-0010',desc:'Regular Shares',var:'$2.00',svst:'$100.00',tb:'$98.00'}]}]};
 assert.match(answerProcessQuestion('shares-loans','why out of balance',report),/901-0010/);
 assert.match(answerProcessQuestion('shares-loans','sign convention',report),/reverse-all/);
 assert.match(answerProcessQuestion('shares-loans','why out of balance',report),/not proven causes/);
});
