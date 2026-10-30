import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import {extractGL as extract} from './gl-parser-core.mjs';
pdfjs.GlobalWorkerOptions.workerSrc=workerUrl;
export const extractGL=(file,options={})=>extract(file,{...options,pdfLibrary:pdfjs});
export {PARSER_VERSION} from './gl-parser-core.mjs';
