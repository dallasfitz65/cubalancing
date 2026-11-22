import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const main=readFileSync(new URL('../src/main.jsx',import.meta.url),'utf8');
test('sidebar folder import prompt appears only for missing or disconnected folder',()=>{
 assert.match(main,/page===id&&sourceRoles\[id\]&&\(folderConnection==='missing'\|\|folderConnection==='reconnect'\)&&<div className="nav-files">/);
 assert.match(main,/Saved input folder needs permission/);
 assert.match(main,/No input folder configured for this credit union/);
 assert.match(main,/>Open folder import<\/button>/);
});
test('connected folder does not produce redundant sidebar import panel',()=>{
 assert.doesNotMatch(main,/page===id&&sourceRoles\[id\]&&<div className="nav-files">/);
});
