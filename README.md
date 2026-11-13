# ABACUS Reconciliation — React

## Access and user accounts

The production homepage now requires login (no guest access). ABACUS uses a server-side PostgreSQL user table (`abacus_users`) and an expiring session table (`abacus_sessions`). Users sign in before accessing the reconciliation application. The first account is provisioned using the **one-time setup key** configured as the Netlify `ABACUS_SETUP_TOKEN` secret. The first account receives administrator access. The setup endpoint rejects any further initialization after that account exists.

Administrators can add, enable, or disable users from **Settings → User accounts**. Passwords are stored as salted scrypt hashes rather than plaintext. Authentication uses secure, HTTP-only session cookies, with sessions stored on the server. Do not store financial source files or calculated results in these tables.

**First-account settings migration:** On the same browser/device that was used before login was enabled, successfully creating the first account copies existing XP2/DataSafe selection, sign convention, and remembered folder handle into that account's own local settings scope. Existing values remain intact as a fallback. The browser may ask to authorize the remembered folder again. Settings on another machine cannot be migrated automatically without a shared store.

## Installation and deployment

Requires Node.js 22.12 or newer, Netlify Functions, and Netlify Database.

```sh
npm ci
npm test
npm run build
```

Deploy the entire repository to Netlify (not just the generated static `dist` folder), so the database migrations and `/api/auth` function are deployed.

Set the function-scoped secret `ABACUS_SETUP_TOKEN` in the deployment environment before the first deployment. Open the site, create the initial administrator using the setup key, then remove or rotate that setup secret. Additional users are created by an administrator inside Settings.

## Settings and data boundaries

For authenticated tenant workspaces, core-system selection and sign convention synchronize through versioned PostgreSQL settings; institution GL mappings are persisted separately per core system. The existing browser IndexedDB settings and remembered folder handle remain local. The first-login migration preserves previously saved local values. Financial source files remain in the browser, not the central database.

Financial input files, parsed GL balances, variance notes and computed reports remain in browser memory; the authentication backend stores only user credentials (hashed), account metadata, and session hashes. Never upload real financial exports into GitHub, Netlify deployments or the database.

## Core functions

The reconciliation application includes GL trial balance, Shares/Loans/Cash, Share Draft, EFT, ATM balancing, ACH setup, exceptions, reports, local evidence export, core-system selection (XP2/DataSafe) and bundled mapping reference. PDF-protected documents may request their own document passwords, independent of the ABACUS account login.

## Verification

Successful deployment and migration do not by themselves establish that authentication is functional. Validate new-admin setup, first-account settings retention, ordinary login, logout, password rejection, disabled-account rejection, new user creation, file processing and local settings persistence before treating production as verified.

## Production access (November 2026)

The default URL is `https://cuabacus2.netlify.app/`. All routes now require server-authenticated ABACUS user sessions. Legacy `?portal=1` links continue to work but the parameter is not required. The SQL tenant and history endpoints have always required authentication.

New credit unions are set up under Settings after signing in. Only hashed source-file fingerprints, balancing summary metadata, and validated mappings are saved centrally; no raw source files or account-level member data are transferred. See `docs/MULTI_TENANT_SETUP.md`.
