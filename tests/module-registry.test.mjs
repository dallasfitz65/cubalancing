import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultModules,resolveModules,validModules,moduleAllowed,roleAllowed,filterModuleFiles} from '../src/module-registry.mjs';
test('existing tenants retain seven modules',()=>assert.equal(defaultModules().length,7));
test('explicit disable all stays disabled',()=>assert.deepEqual(resolveModules([]),[]));
test('unknown and duplicate modules rejected',()=>{assert.equal(validModules(['atm','atm']),false);assert.equal(validModules(['unknown']),false);});
test('shared GL remains available to drafts but cash is disabled',()=>{assert.equal(roleAllowed('gl',['drafts']),true);assert.equal(roleAllowed('svst',['drafts']),false);assert.equal(moduleAllowed('cash',['drafts']),false);});
test('disabled files removed without affecting shared source',()=>assert.deepEqual(filterModuleFiles({gl:1,sdps:2,atm_gl:3},['drafts']),{gl:1,sdps:2}));
