# ABACUS Reconciliation — React 0.3.0

React application with local PDF.js extraction and a separate marketing page. No FileMaker dependency. No uploaded source data or financial fixtures are included.

## Run and deploy

Requires Node.js 22.12+ (validated with Node 24).

```sh
npm ci
npm test
npm run dev
```

Open the displayed HTTP address, then choose Launch ABACUS. For a production package:

```sh
npm run build
npm run preview
```

Deploy the CONTENTS of `dist/` to your approved HTTPS static host. Both `index.html` (website) and `app.html` (React workspace) are included. Do not double-click app.html: PDF modules and workers require HTTP(S). Included `_headers` configures Netlify-compatible hosts; configure equivalent headers on other hosts. No live deployment has been changed.

## PDF workflow

1. Select a consolidated GL PDF or TXT and core shares/loans/cash TXT exports.
2. Choose the sign convention. For the supplied report profile, shares/certificates are credit-negative; their signs are reversed for comparison with positive core totals. Raw signed GL balances remain in extraction review/evidence.
3. Review GL extraction: check the report date against the original, account count, ending balances and signs. Approve the extraction.
4. Review the fixed institution mapping. The optional Account CSV is a reference viewer, not a mapping importer.
5. Run balancing. Missing balances are exceptions, never balanced. Any one-cent difference is an exception.
6. Expand account details, add session-only variance notes, print, or export current-run evidence.

## Supported PDF profile and limits

- Text-based consolidated trial balances, `NNN-NNNN` GL account codes, rightmost End Balance / Ending Balance monetary column, two decimal places.
- Multi-page reports, parentheses/minus/CR negatives, DR positives, wrapped account descriptions, and PDF page-rotation metadata.
- Password-protected PDFs request the password only in memory (up to three attempts).
- 10 MB input limit, 200 pages, 5 million extracted characters, 60-second extraction timeout.
- Duplicate GL account rows are rejected rather than silently overwritten. Consolidate branch/detail reports first.
- Image-only/scanned pages are rejected. This version does NOT implement OCR. Unreadable pages and unsupported headers fail explicitly, with no demo substitution.
- Extraction is not universal report understanding: other account formats, ambiguous column layouts, split monetary glyphs, unusual fonts and partially damaged PDFs need separate validation/adapters. Review is mandatory.
- Input dates and institutional control totals are not yet automatically cross-validated. Date verification remains part of operator review.

## Security and evidence

Financial files are supplied to PDF.js as bytes and processed in a local browser worker. PDF.js is bundled, not fetched from a CDN. No analytics, external fonts, AI processing, or financial upload API. CSP permits same-origin assets/worker requests only; this is not proof that a compromised hosting origin cannot leak data. `isEvalSupported:false`, XFA disabled, strict PDF errors, bounded extraction, escaped React rendering. No browser localStorage/IndexedDB writes for files, balances, or notes. Legacy ABACUS file/note keys are removed on startup.

Files, notes, passwords and results remain in process memory until cleared/refreshed. This is not guaranteed secure memory erasure; browser/OS behavior, swap and extensions remain outside application control. Printouts and downloaded evidence remain on the device. Evidence exports include signed raw GL records, normalized results, notes, mapping, parser version and SHA-256 source hashes. Exports are unsigned and editable; hashes are not authenticity or identity proof. Session activity is not a durable or immutable audit ledger.

## Validation

- 12 automated tests: real generated multi-page PDFs; page rotation; signs; zero/missing balances; malformed, disguised, empty and oversized inputs; duplicate account rejection; parser profile validation; one-cent exceptions.
- Original uploaded 12-page trial-balance PDF: 350 ending balances independently matched Poppler extraction to the cent. Original source PDF/core files were used only for internal testing and are absent from this package.
- Browser smoke test: PDF extraction/review/approval, original four-file reconciliation (21 of 21 checks balanced), evidence download, desktop/mobile inspection. No third-party requests or page exceptions observed during the tested flow.
- Password-protected original PDF: extraction completed with the supplied test password.
- Dependency audit: no reported vulnerabilities at build time; recheck before deployment.

## Remaining production work

Independent security review, protected durable audit storage, verified users/roles if required, institutional mapping configuration, broader report format validation, date/control-total checks, incident/support procedures, deployment-specific hardening, and OCR if scanned reports are required. No audit certification or zero-exposure guarantee is claimed.


App entry: index.html now opens the React email entry screen directly. app.html remains available for existing links. There is no marketing landing page in this build.
