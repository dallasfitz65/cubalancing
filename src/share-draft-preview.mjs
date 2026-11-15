// De-identified aggregate fixture derived from a historical share-draft batch.
// No member identifiers, MICR, check, account, trace numbers, or original files.
// This is a display preview only: it must never be treated as an actual reconciliation run.
export const SHARE_DRAFT_PREVIEW=Object.freeze({
 sample:true,
 reports:[
  {institution:'Historical example (de-identified)',batch:'Example batch',date:'01-26-22',posted:5190590,notPosted:10000,returned:0,honored:10000},
  {institution:'Historical example (de-identified)',batch:'Example batch',date:'01-26-22',processing:5200590,transmission:5200590},
  {institution:'Historical example (de-identified)',batch:'Example batch',date:'01-27-22',items:10000,returned:0,honored:10000,manual:0}
 ],
 summary:{A:5200590,B:5190590,C:10000,D:0,E:10000,F:0,G:0},
 gl:{beginning:0,totalDebits:5210590,totalCredits:5210590,ending:0,verifiedFromUploadedHistory:true},
 time:'2022-01-26T00:00:00.000Z'
});
