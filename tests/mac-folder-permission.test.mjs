import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const main=readFileSync(new URL('../src/main.jsx',import.meta.url),'utf8');
test('macOS browsers without File System Access API get folder picker fallback',()=>{
 assert.match(main,/if\(!window\.showDirectoryPicker\)\{setFolderPreferenceStatus/);
 assert.match(main,/folderInput\.current\?\.click\(\)/);
 assert.match(main,/webkitdirectory=""/);
 assert.match(main,/const selected=Array\.from\(e\.target\.files\|\|\[\]\)/);
 assert.match(main,/setFolderConnection\('ready'\)/);
 assert.match(main,/stageFiles\(selected\)/);
 assert.match(main,/cannot preserve folder access across logins/);
});
test('reconnection errors tell users to reselect folder, not await invisible permission popup',()=>{
 assert.match(main,/Click Choose input folder to select it again/);
 assert.match(main,/Browser blocked folder access/);
 assert.match(main,/folder\?\.name\|\|sessionFolderName/);
});
