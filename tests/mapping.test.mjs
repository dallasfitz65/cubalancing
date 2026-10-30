import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {parseMappingCSV} from '../src/mapping-csv.mjs';
test('mapping imports preserve leading zeros, quoted commas, escaped quotes and CRLF',()=>{assert.deepEqual(parseMappingCSV('"0009-0100","Shares, regular","a""b"\r\n',3),[['0009-0100','Shares, regular','a"b']]);});
test('malformed or inconsistent mapping imports fail',()=>{for(const s of ['"unfinished','a,b','a,"b"x,c'])assert.throws(()=>parseMappingCSV(s,3));});
test('seed contains all supplied mapping rows',()=>{const data=JSON.parse(readFileSync(new URL('../src/mapping-seed.json',import.meta.url)));assert.equal(data.shares.rows.length,86);assert.equal(data.loans.rows.length,68);assert.ok(data.shares.rows.every(r=>r.length===4));assert.ok(data.loans.rows.every(r=>r.length===4));});

test('share import accepts uniform four or eight columns and rejects mixed widths',()=>{assert.equal(parseMappingCSV('90100-01,Shares,,1', [4,8])[0][0],'90100-01');assert.throws(()=>parseMappingCSV('a,b,c,d\na,b,c,d,e,f,g,h',[4,8]));});

test('loan imports accept four or eleven columns without changing core identifiers',()=>{assert.deepEqual(parseMappingCSV('70104-01,Personal Loans,021,1',[4,11])[0],['70104-01','Personal Loans','021','1']);assert.throws(()=>parseMappingCSV('a,b,c,d,e',[4,11]));});
