import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const homepage=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const legacyApp=readFileSync(new URL('../app.html',import.meta.url),'utf8');
const vite=readFileSync(new URL('../vite.config.js',import.meta.url),'utf8');
const appSource=readFileSync(new URL('../src/main.jsx',import.meta.url),'utf8');

test('ABACUS root URL loads the authenticated application directly',()=>{
 assert.match(homepage,/<title>ABACUS \| Balancing Workspace<\/title>/);
 assert.match(homepage,/<div id="root"><\/div>/);
 assert.match(homepage,/src\/main\.jsx/);
 assert.doesNotMatch(homepage,/Open ABACUS App|Explore capabilities|Illustrative demo|Built for credit union operations/);
});

test('original /app.html deep link still opens the same app',()=>{
 assert.equal(homepage,legacyApp);
 assert.match(vite,/index\.html/);
 assert.match(vite,/app\.html/);
});

test('existing login gate is preserved for the application',()=>{
 assert.match(appSource,/function AuthGate\(\)/);
 assert.match(appSource,/accountAPI\('me'\)/);
 assert.match(appSource,/if\(!account\)return <Login onContinue=\{onContinue\}\/>/);
});
