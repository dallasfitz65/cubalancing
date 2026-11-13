import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync,readdirSync} from 'node:fs';
const source=new URL('../src/',import.meta.url);
test('application source does not persist session or financial data in browser stores',()=>{for(const name of readdirSync(source).filter(n=>/\.(jsx|mjs)$/.test(n)&&!['folder-preferences.mjs','settings-table.mjs'].includes(n))){const text=readFileSync(new URL(name,source),'utf8');assert.doesNotMatch(text,/\b(?:localStorage|sessionStorage)\s*(?:\?\.)?\.\s*setItem\s*\(|\bindexedDB\s*\.\s*open\s*\(|\bcaches\s*\.\s*(?:open|put)\s*\(|serviceWorker\s*\.\s*register\s*\(/,name);}});
test('deploy policy blocks third-party scripts and framing and disables HTTP caching',()=>{const headers=readFileSync(new URL('../public/_headers',import.meta.url),'utf8');assert.match(headers,/script-src 'self';/);assert.match(headers,/connect-src 'self';/);assert.match(headers,/frame-ancestors 'none'/);assert.match(headers,/Cache-Control: no-store/);});

test('remembered-folder persistence refuses file objects and arbitrary data',async()=>{const {rememberFolder}=await import('../src/folder-preferences.mjs');await assert.rejects(rememberFolder({kind:'file',name:'member-data.txt'}),/Only a directory/);await assert.rejects(rememberFolder({balances:[1,2]}),/Only a directory/);});

test('IndexedDB settings table is configuration-only with explicit scoped entries',()=>{const code=readFileSync(new URL('settings-table.mjs',source),'utf8');assert.match(code,/TABLE='settings'/);assert.match(code,/scope\+':'\+name/);assert.doesNotMatch(code,/financialData|memberBalances|saveReconciliation|saveTransaction/);});

test('production ABACUS requires login rather than relying on a portal query flag',()=>{
 const code=readFileSync(new URL('main.jsx',source),'utf8');
 assert.match(code,/if\(!account\)return <Login onContinue=/);
 assert.match(code,/accountAPI\('me'\)/);
 assert.doesNotMatch(code,/LOGIN_ENABLED|GUEST_ACCOUNT|return <App account=\{GUEST_ACCOUNT\}/);
});
