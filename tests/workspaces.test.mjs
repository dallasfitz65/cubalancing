import test from 'node:test';
import assert from 'node:assert/strict';
import {requiredRoles,selectSections,suggestRole} from '../src/workspaces.mjs';
import {DEMO_SECTIONS} from '../src/engine.mjs';
test('workspaces use a shared GL and only their supporting files',()=>{assert.deepEqual(requiredRoles('shares-loans'),['gl','svst','lnst','cobd']);assert.deepEqual(requiredRoles('drafts'),['gl','sdps','sdre','sdrt','draftgl']);assert.deepEqual(requiredRoles('cash'),['gl','cobd']);assert.deepEqual(requiredRoles('overview'),['gl','svst','lnst','cobd']);});
test('drafts are separate and every original account remains in exactly one workspace',()=>{const keys=ss=>ss.flatMap(s=>s.rows.map(r=>s.id+r.gl+r.desc)).sort();const separated=['shares-loans','drafts'].flatMap(p=>selectSections(DEMO_SECTIONS,p));assert.deepEqual(keys(separated),keys(DEMO_SECTIONS));assert.ok(selectSections(DEMO_SECTIONS,'drafts').flatMap(s=>s.rows).every(r=>r.gl==='902-0070'));});
test('folder names provide suggestions only and unknown names remain unassigned',()=>{assert.equal(suggestRole('trial balance.pdf'),'gl');assert.equal(suggestRole('SVST.txt'),'svst');assert.equal(suggestRole('report.txt'),'');});

test('partial runs require only loaded supporting files within the selected workspace',async()=>{const {loadedRunRoles}=await import('../src/workspaces.mjs');assert.deepEqual(loadedRunRoles('overview',{svst:{}}),['gl','svst']);assert.deepEqual(loadedRunRoles('shares-loans',{lnst:{},cobd:{}}),['gl','lnst','cobd']);assert.deepEqual(loadedRunRoles('cash',{svst:{}}),['gl']);assert.deepEqual(loadedRunRoles('overview',{svst:{},lnst:{},cobd:{}}),['gl','svst','lnst','cobd']);});
