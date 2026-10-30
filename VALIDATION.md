# Validation — 2026-10-28

- Production build succeeded (React 19.3.1 / Vite 8.3.5 / PDF.js 6.4.299).
- 12 automated tests passed.
- Original 12-page PDF: 350 GL ending balances matched independent Poppler extraction to the cent, preserving credit signs.
- Password-protected original PDF extracted successfully with a test password.
- Browser test in Chromium 153: GL review, approval, source imports, 21/21 balanced checks, evidence download, session clearing and synthetic demo. No JavaScript page errors or third-party requests observed.
- Desktop and mobile views inspected. Tables scroll horizontally on small screens.
- npm dependency audit reported zero vulnerabilities at validation time.
- Real credit-union fixtures and screenshots were excluded from this package.
- Image-only scans/OCR, automatic date validation, durable audit storage and institution-specific mapping configuration remain outside this build. See README.md.


## Workspace and folder update
- 15 automated tests pass, including workspace requirements and disjoint Share Drafts routing.
- Source controls expand beneath the selected navigation item. GL state is shared; replacing files clears the current result.
- Each run is scoped to the selected workspace. Overview shows the latest run with other accounts marked missing.
- Folder selection is session-only, read-only, top-level, limited to 200 entries. Directory upload fallback and drag/drop are available.
- Filename suggestions require explicit role/date review; duplicate roles cannot be loaded. Report dates are not automatically extracted.
- ACH reconciliation remains unavailable pending formats and matching rules.
- Updated UI and native folder picker have not been browser-tested in this environment; no installed browser executable was found.


## Master mapping and remembered folder update
- Six-column Account.csv now drives live GL/core rollups; the supplied 63 rows yield 62 distinct links and 21 GL accounts after one repeated link is removed.
- Core input codes come from uploaded SVST/LNST reports, not a fixed numeric-type map. Nonzero unassigned codes block a run, missing configured codes are exceptions, and the mapping content hash is recorded in evidence.
- Supplied test SVST has unmapped code 24; no mapping has been invented for it.
- Remember folder is explicit opt-in and persists only a directory handle. No automatic file sweep occurs after sign-in. A fresh permission request may be needed. Forget folder deletes the preference.
- Native folder persistence and deployed browser behavior still require browser verification.
