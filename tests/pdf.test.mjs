import test from 'node:test';import assert from 'node:assert/strict';
import {DOMMatrix,ImageData,Path2D} from '@napi-rs/canvas';
Object.assign(globalThis,{DOMMatrix,ImageData,Path2D});
const pdfjs=await import('pdfjs-dist/legacy/build/pdf.mjs');
const {PDFDocument,StandardFonts,degrees}=await import('pdf-lib');
const {extractGL}=await import('../src/gl-parser-core.mjs');
async function fixture({blank=false,rotate=false,pages=2}={}){const doc=await PDFDocument.create();const font=await doc.embedFont(StandardFonts.Helvetica);for(let i=0;i<pages;i++){const p=doc.addPage([612,792]);if(rotate)p.setRotation(degrees(90));if(!blank){p.drawText('GL Number      Description          End Balance',{x:35,y:750,size:12,font});p.drawText(`${i?'701-0000':'901-0010'}          Account          ${i?'123.45':'(456.78)'}`,{x:35,y:700,size:12,font});}}return new File([await doc.save()],'fixture.pdf');}
test('real PDF bytes extract multiple pages and signed balances',async()=>{const r=await extractGL(await fixture(),{pdfLibrary:pdfjs});assert.equal(r.pageCount,2);assert.deepEqual(r.records.map(r=>r.cents),[-45678,12345]);});
test('rotated-page metadata retains correct extraction',async()=>{const r=await extractGL(await fixture({rotate:true}),{pdfLibrary:pdfjs});assert.equal(r.accountCount,2);});
test('image-only or blank PDF fails explicitly instead of using demo',async()=>{await assert.rejects(extractGL(await fixture({blank:true,pages:1}),{pdfLibrary:pdfjs}),/no extractable text/);});
test('disguised or malformed PDF fails',async()=>{await assert.rejects(extractGL(new File(['not a PDF'],'fake.pdf'),{pdfLibrary:pdfjs}),/signature/);await assert.rejects(extractGL(new File(['%PDF-1.7\ninvalid'],'broken.pdf'),{pdfLibrary:pdfjs}),/PDF|Invalid/);});
test('oversize inputs are rejected before reading',async()=>{await assert.rejects(extractGL({size:10*1024*1024+1},{pdfLibrary:pdfjs}),/10 MB/);});
