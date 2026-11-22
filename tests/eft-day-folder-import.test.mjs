import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {identifyCoreFile,classifyCoreFiles} from '../src/core-ingestion-profiles.mjs';
const ui=readFileSync(new URL('../src/main.jsx',import.meta.url),'utf8');
test('common XP2 Core Day Totals filenames are identified as EFT day totals',()=>{
 for(const name of ['EFTDayTotals.txt','EFT_Day_Totals.txt','Core_Day_Totals.txt','DayTotals.txt','DAY TOTALS 20NOV26.txt','EFTCORE_DAY_TOTALS.txt']){
  assert.equal(identifyCoreFile({name,size:100},'xp2').role,'eftday',name);
 }
 assert.equal(identifyCoreFile({name:'day_totals.csv',size:100},'xp2').role,'');
 assert.equal(identifyCoreFile({name:'EFT_STAR_SETTLEMENT.txt',size:100},'xp2').role,'eftstar');
});
test('folder scan stages recognized files and excludes duplicate EFT Core Day Totals',()=>{
 assert.match(ui,/function stageFiles\(list\)/);
 assert.match(ui,/for\(const role of duplicates\)delete selected\[role\]/);
 assert.match(ui,/setFiles\(selected\);setReview\(null\)/);
 assert.match(ui,/selected\.eftday\?' EFT Core Day Totals:/);
 const candidates=classifyCoreFiles([{name:'Core_Day_Totals.txt',size:250},{name:'EFT_Day_Totals.txt',size:250}]);
 assert.deepEqual(candidates.map(x=>x.role),['eftday','eftday']);
});
