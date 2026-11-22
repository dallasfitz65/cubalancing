import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const ui=readFileSync(new URL('../src/TenantAdministration.jsx',import.meta.url),'utf8');
const main=readFileSync(new URL('../src/main.jsx',import.meta.url),'utf8');

test('active credit union remains selected from the header without a duplicate details panel',()=>{
 assert.doesNotMatch(ui,/aria-label="Selected credit union profile"/);
 assert.doesNotMatch(ui,/tenant-profile-panel/);
 assert.match(main,/onChange=\{e=>setActiveCU\(e.target.value\)\}/);
});

test('credit union management retains institution selection and plus-icon add dialog',()=>{
 assert.match(ui,/<h2>Credit Union Management<\/h2>/);
 assert.match(ui,/aria-label="Add credit union"/);
 assert.match(ui,/onClick=\{openAdd\}/);
 assert.match(ui,/className="tenant-list-table"/);
 assert.match(ui,/ncua_charter/);
 assert.match(ui,/onSelect\(union.id\)/);
 assert.match(ui,/aria-labelledby="tenant-add-title"/);
 assert.doesNotMatch(ui,/coreProfile|setCoreProfile/);
});
