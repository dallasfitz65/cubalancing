import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const main=read('src/main.jsx');
const support=read('src/Support.jsx');
const form=read('public/support-form.html');
test('Support is accessible from its own HELP menu section',()=>{
 assert.match(main,/\['HELP','Support','support'\]/);
 assert.match(main,/page==='support'&&<Support account=\{account\}/);
 assert.match(main,/page!=='support'/);
});
test('support form records institution, user and issue without sending source financial data',()=>{
 assert.match(support,/creditUnion/);
 assert.match(support,/account\?\.id/);
 assert.match(support,/problem_description/);
 assert.match(support,/fetch\('\/support-form\.html'/);
 assert.match(support,/MAX_SCREENSHOT_BYTES=8\*1024\*1024/);
 assert.match(support,/I confirm this request contains no sensitive credit union or member data/);
 assert.doesNotMatch(form,/name="(?:source_file|core_file|gl_file|account_number)"/);
});
test('static hosted form matches React support fields',()=>{
 assert.match(form,/name="abacus-support"/);
 assert.match(form,/data-netlify="true"/);
 for(const name of ['credit_union','user_id','username','email','section','problem_description','submitted_at','screenshot']){
  assert.match(form,new RegExp('name="'+name+'"'));
 }
});
