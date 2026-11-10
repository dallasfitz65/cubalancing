# ABACUS Reconciliation — React 0.3.0

## Login-free ABACUS

ABACUS opens directly to the reconciliation application. No username, password, invitation, sign-in, logout, recovery, session timer, role selection, authentication API or identity provider is required or included in the active application.

This is a browser-based reconciliation application. Financial input files and computed reconciliation results remain in the current browser session; they are not uploaded to a remote workspace endpoint. A selected folder handle may be remembered locally on the same browser/device. Account mappings are bundled locally; activity is session-only. The core system (XP2 or DataSafe) selection is stored locally.

Anyone who can reach the app URL can use the interface. There is no per-person or per-credit-union authorization. Do not use this configuration to host centrally stored credit-union data without separate isolation. Protect sensitive data at the device/network level and do not package financial reports into deployment assets.

## Run

Requires Node.js 22.12+.

```sh
npm ci
npm test
npm run build
npm run dev
```

The app starts directly at its existing React entry point (index.html or app.html). Deploy dist/ to an HTTPS static host. Netlify build settings are in netlify.toml.

## Reconciliation

Load the GL trial balance and any required core-system exports for Shares, Loans, Cash, Share Drafts, EFT or ATM. Review file dates, sign conventions, and mappings before balancing. Exceptions, drill-down results, exports and printing are local-session features. PDF opening passwords, when required by an encrypted source PDF, are not ABACUS login credentials and are not persisted.

## Security boundaries

The absence of a login is intentional, not a security mechanism. No financial input or reconciliation output is sent to a database by the current frontend. Folder permission dialogs belong to the browser and may still appear. Locally selected files, downloaded evidence, printing and browser extensions remain device security considerations. Historical authentication/database files were removed from this source tree; that does not delete any previously provisioned remote database or disable site-level access policies configured outside this repository.
