import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const draft=readFileSync(new URL('../src/ShareDrafts.jsx',import.meta.url),'utf8');
const main=readFileSync(new URL('../src/main.jsx',import.meta.url),'utf8');
test('Share Draft uses standardized module heading with no duplicate report heading or print button',()=>{
 assert.match(main,/drafts:'Share Draft Reconciliation'/);
 assert.doesNotMatch(draft,/className="draft-report-title"/);
 assert.doesNotMatch(draft,/Print \/ PDF/);
 assert.match(draft,/className="draft-dates"/);
 assert.match(draft,/className="draft-summary"/);
});
