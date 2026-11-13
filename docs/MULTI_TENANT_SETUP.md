# ABACUS — multi-tenant administration and reconciliation history

## Access modes

- Production site: `https://cuabacus2.netlify.app/` — requires server authentication before loading any reconciliation workspace.
- Legacy portal links with `?portal=1` remain valid but the query parameter is no longer needed. There is no guest bypass in production.
- Before activating any credit union on the central server, create an administrator account through the existing one-time setup workflow. After activation rotate/remove the one-time setup key.

## Central credit-union setup

1. Sign in through the authenticated portal.
2. Open **Settings → Credit union management** and add a credit union.
3. Select it using the header selector.
4. Assign users to that credit union as admin, reconciler or reviewer.
5. Use **Import existing local settings** if appropriate. Existing shared settings are never overwritten by this import. Selected directory handles remain on the current browser/device.
6. Update **XP2 / DataSafe** in Settings. The server stores the setting in `abacus_tenant_settings` with optimistic versioning.
7. In **Settings → Account mapping**, review the displayed XP2 or DataSafe mapping, then save that core-system mapping for the selected credit union. Each institution/core combination has its own versioned record. Saving the default copy does not validate DataSafe file structures.
8. Run balancing. A successful authenticated balancing run stores a **summary** in `abacus_reconciliation_runs`.
9. View up to 100 recent saved summaries in Dashboard → Balancing History.

## Tenant model

- `abacus_credit_unions` — institution metadata
- `abacus_user_credit_unions` — active user memberships and institution roles
- `abacus_tenant_settings` — shared preferences (`core-system`, `sign-convention`)
- `abacus_tenant_mappings` — separate validated, versioned XP2 and DataSafe GL/core account mapping for each institution
- `abacus_reconciliation_runs` — append-only per-institution reconciliation run summaries

All new tenant tables use PostgreSQL row-level security with transaction-local authenticated user/tenant context and API membership checks. Platform administrators must still be explicitly assigned to each credit union before viewing or editing its settings or history.

## What is saved

Central SQL tables save institution and membership information, versioned preference values, approved GL/core mapping definitions, a summary of completed reconciliation runs (timestamps, type, status, check/issue/unmapped counts, source file SHA-256 fingerprints and mapping version).

**Not saved centrally:** raw GL/core files, member names, account numbers, item-level balances, member transactions, browser folder handles, source filenames, variance notes, detailed exceptions, or PDF passwords. They remain in browser memory (or the user's chosen exported files) unless separate storage is implemented later.

Reconciliation history entries reflect browser-reported results; they are not independently attested, immutable accounting evidence or a replacement for a complete audit trail. Authorized DB administrators retain privileged access.

## Remaining work and controls

- Validate a complete first-admin login and source-setting migration on the actual customer browser.
- Test shared preferences across two logged-in devices and conflicting concurrent changes.
- Verify at least two tenants using separate memberships and ensure cross-tenant reads/writes are denied by PostgreSQL RLS in an integration environment.
- Implement validated institution-specific account mappings, detailed exception persistence and review/approval workflows.
- Implement production-grade audit trails, secure file ingestion, unattended jobs and recovery/backups.
- Production access requires the login screen and server-side tenant authorization. No unauthenticated guest mode is enabled.
- Test backup and restore before processing live credit union information.

The historical SQL migrations must remain checked in even if superseded; deleting an applied migration causes Netlify database deployments to fail.
