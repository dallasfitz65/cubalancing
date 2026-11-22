import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseGLText,moneyToCents} from '../src/gl-parser-core.mjs';
import {normalizeGL} from '../src/gl-sign-convention.mjs';
const main=readFileSync(new URL('../src/main.jsx',import.meta.url),'utf8');
test('GL parser preserves leading and spaced trailing negative signs',()=>{
 for(const raw of ['-1,050.00','- 1,050.00','1,050.00-','1,050.00 -','(1,050.00)','1,050.00 CR'])assert.equal(moneyToCents(raw),-105000,raw);
 const sources=['901-0010 Regular Shares 1,050.00 -','901-0020 Personal Choice -250.00','901-0040 Club Grand 450.00 CR'];
 const records=parseGLText(sources.join('\n')).records;
 assert.deepEqual(records.map(r=>r.cents),[-105000,-25000,-45000]);
 assert.equal(normalizeGL({records},'reverse-all')['901-0010'],1050);
});
test('sign audit shows original raw number, parsed GL, convention and compared GL',()=>{
 for(const phrase of ['GL sign audit','Original ending balance:','Parsed GL:','Convention:','Compared GL:'])assert.ok(main.includes(phrase),phrase);
 assert.match(main,/const glSourceAudit=result\?\.meta\?\.records\?\.length/);
 assert.match(main,/normalizeGL\(\{records:\[record\]\},sign\)\[record\.account\]/);
});
