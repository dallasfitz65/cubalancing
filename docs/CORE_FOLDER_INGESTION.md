# Core-aware, folder-first ingestion — Phase 1

## Scope delivered
- One folder scanner in **Settings → Folder import & file coverage**. The scanner supports nested directories to depth 3 and stops rather than silently import a partial batch if more than 200 files are present.
- Per-core manifest in `src/core-ingestion-profiles.mjs`; XP2 has known filename conventions, while DataSafe and Portico remain explicitly unvalidated.
- The left menu contains navigation and a link to the folder importer, not separate file-picker controls.
- A per-module coverage table reports expected/identified/missing file roles. This measures file presence **only**.
- The candidate table supports manual assignment for unfamiliar file names. Duplicate roles block import.
- A new scan clears previously loaded files and session results so files from earlier folders cannot be mixed unintentionally.
- DataSafe and Portico reconciling remains blocked until their verified parser adapters and GL mappings exist.

## Important operating limits
A filename match is not proof of a correct report, balance, date, source, vendor or ledger. The user must review the identified candidates, confirm business-date consistency and run the existing XP2 parser validation. No automatic GL posting or certification is authorized. The XP2 ATM demo, ACH design rules, and partial EFT/Drafts controls are not validated vendor-wide production reconciliations.

## Evidence required to activate DataSafe and Portico
For each core, gather properly de-identified representative daily exports for GL trial balance, deposits/shares, loans, cash, ACH, EFT, ATM, share drafts, plus the core-specific report names and layouts. Some modules may have different file counts. Provide report dates, settlement-versus-posting dates, account-type codes, balance signs, GL mapping references, examples of reversals and adjustments, and at least one reconciled and one exception case. Do not provide real member names, account numbers or credentials.

Configure the core-specific report manifest and parser adapters; add per-module accounting controls; compare expected totals against verified credit union accounting evidence; regression-test corrections, missing files, mixed dates, and tenant isolation. Only then change the corresponding module validation state to approved. These requirements remain open and are **not** implied to be completed by the provisional Portico/DataSafe option selectors.
