import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const main=readFileSync(new URL('../src/main.jsx',import.meta.url),'utf8');
test('left navigation resets workspace and document scroll without scrolling sidebar navigation',()=>{
 assert.match(main,/function navigateSection\(nextPage\)/);
 assert.match(main,/setPage\(nextPage\)/);
 assert.match(main,/window\.scrollTo\(0,0\)/);
 assert.match(main,/workspaceRef\.current\.scrollTop=0/);
 assert.match(main,/onClick=\{\(\)=>navigateSection\(id\)\}/);
 assert.match(main,/ref=\{workspaceRef\}/);
 assert.doesNotMatch(main,/asideRef\.current\.scrollTop=0/);
});
test('page change from non-sidebar navigation also scrolls the right workspace to top',()=>{
 assert.match(main,/useEffect\(\(\)=>\{\s*window\.scrollTo\(0,0\);\s*if\(workspaceRef\.current\)workspaceRef\.current\.scrollTop=0;\s*\},\[page\]\)/);
});