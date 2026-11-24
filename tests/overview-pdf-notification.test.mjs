import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const main=readFileSync(new URL('../src/main.jsx',import.meta.url),'utf8');
const atm=readFileSync(new URL('../src/ATM.jsx',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/styles.css',import.meta.url),'utf8');
test('single ATM Balancing heading remains in shared page header',()=>{
 assert.match(main,/atm:'ATM Balancing'/);
 assert.doesNotMatch(atm,/<h2>ATM Balancing —/);
 assert.match(atm,/Terminal: \{report\.terminal\}/);
});
test('consolidated PDF save notice appears exclusively on Overview with folder and filename',()=>{
 assert.match(main,/page==='overview'&&savedPdf\?\.tenantId===activeCU/);
 assert.match(main,/Output folder:<\/span> \{savedPdf\.folderName\}/);
 assert.match(main,/\{savedPdf\.filename\}/);
 assert.match(main,/page==='overview'&&consolidatedPdfStatus/);
 assert.doesNotMatch(main,/\['overview','ach','settings'\]\.includes\(page\)/);
});
test('Open PDF reads the actual saved file through local folder handle',()=>{
 assert.match(main,/outputFolder\.getFileHandle\(savedPdf\.filename\)/);
 assert.match(main,/URL\.createObjectURL/);
 assert.match(main,/URL\.revokeObjectURL\(pdfPreview\.url\)/);
 assert.match(main,/onClick=\{openSavedPdf\}>Open PDF/);
 assert.match(main,/onClick=\{\(\)=>setPage\('history'\)\}>Balancing History/);
 assert.match(css,/\.pdf-saved-notice/);
});
test('report UI clears on credit union or output folder change',()=>{
 assert.match(main,/setSavedPdf\(null\);setPdfPreview\(null\);lastAutoGLInputs/);
 assert.match(main,/setOutputFolder\(null\);setSavedPdf\(null\);setPdfPreview\(null\)/);
 assert.match(main,/savedPdf\.tenantId!==activeCU/);
});
