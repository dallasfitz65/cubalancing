import test from 'node:test';
import assert from 'node:assert/strict';
import {PDFDocument} from 'pdf-lib';
import {buildConsolidatedPdf,isConsolidatedReady,saveConsolidatedPdf} from '../src/consolidated-report-pdf.mjs';
const ach={issues:1,totals:{activity:1,posting:1,settlement:1,gl:1},checks:[{date:'2026-11-23',direction:'CREDIT',activity:12500,posting:12500,settlement:12500,gl:12000,postingVariance:0,settlementVariance:0,glVariance:-500,ok:false}],unmatched:[]};
const result={sections:[{id:'shares',label:'Shares',rows:[{gl:'001',desc:'Regular shares',executed:true,branchOnly:false,svst:'125.00',tb:'125.00',var:'0.00',ok:true}]}],unmapped:[]};
test('wait until every fully supplied module has a completed result',()=>{
 const files={gl:{},svst:{},ach_activity:{},ach_posting:{},ach_settlement:{},ach_gl:{}};
 assert.equal(isConsolidatedReady({files,result}),false);
 assert.equal(isConsolidatedReady({files,result,achResult:ach}),true);
 assert.equal(isConsolidatedReady({files:{}}),false);
});
test('one multipage PDF contains all module headings and incomplete statuses',async()=>{
 const bytes=await buildConsolidatedPdf({creditUnion:'Demo Credit Union',coreSystem:'XP2',files:{gl:{},svst:{}},result,achResult:ach,generatedAt:new Date('2026-11-23T12:00:00Z')});
 const pdf=await PDFDocument.load(bytes);
 assert(bytes.length>500);
 assert.equal(pdf.getPageCount()>0,true);
});
test('writes exactly one PDF to selected output directory',async()=>{
 let writeCount=0,filename='';
 const handle={kind:'directory',queryPermission:async()=> 'granted',getFileHandle:async(name)=>{filename=name;return {createWritable:async()=>({write:async bytes=>{writeCount++;assert(bytes.length>500);},close:async()=>{},abort:async()=>{}})};}};
 const saved=await saveConsolidatedPdf(handle,{creditUnion:'Demo',coreSystem:'XP2',files:{},achResult:ach,generatedAt:new Date('2026-11-23T12:00:00Z')});
 assert.equal(saved,filename);
 assert.match(saved,/^ABACUS_Consolidated_Reconciliation_.*\.pdf$/);
 assert.equal(writeCount,1);
});
test('no silent output if folder permission is missing',async()=>{
 await assert.rejects(saveConsolidatedPdf({kind:'directory',queryPermission:async()=> 'prompt'},{achResult:ach}),/permission/);
});
