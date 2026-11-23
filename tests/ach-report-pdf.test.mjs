import test from 'node:test';
import assert from 'node:assert/strict';
import {PDFDocument} from 'pdf-lib';
import {buildAchReportPdf,saveAchReportToFolder} from '../src/ach-report-pdf.mjs';

const report={
 checks:[{date:'2026-11-23',direction:'DEBIT',activity:2500,posting:2000,settlement:2500,gl:2000,postingVariance:-500,settlementVariance:0,glVariance:-500,ok:false}],
 unmatched:[{source:'Operator only',key:'2026-11-23|A100|DEBIT|500',count:1}],
 issues:2,totals:{activity:3,posting:2,settlement:2,gl:2}
};
test('generates valid multi-section ACH PDF in memory',async()=>{
 const bytes=await buildAchReportPdf({report,creditUnion:'Demo Credit Union',coreSystem:'XP2',generatedAt:new Date('2026-11-23T12:00:00Z')});
 assert(bytes.length>500);
 const pdf=await PDFDocument.load(bytes);
 assert(pdf.getPageCount()>=1);
});
test('saves to selected output directory with a unique filename',async()=>{
 let written=null,filename='';
 const folder={kind:'directory',queryPermission:async()=> 'granted',getFileHandle:async(name)=>{filename=name;return {createWritable:async()=>({write:async(data)=>{written=data;},close:async()=>{},abort:async()=>{}})};}};
 const saved=await saveAchReportToFolder(folder,{report,creditUnion:'Demo Credit Union',coreSystem:'XP2',generatedAt:new Date('2026-11-23T12:00:00Z')});
 assert.match(saved,/^ABACUS_ACH_Reconciliation_.*\.pdf$/);
 assert.equal(saved,filename);
 assert(written.length>500);
});
test('refuses saving when output folder permission is absent',async()=>{
 const folder={kind:'directory',queryPermission:async()=> 'prompt'};
 await assert.rejects(saveAchReportToFolder(folder,{report}),/permission needs renewal/i);
});
