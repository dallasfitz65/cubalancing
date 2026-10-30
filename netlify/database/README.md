# ABACUS PostgreSQL database

ABACUS stores **configuration and operational activity** in PostgreSQL. Source GL, shares, loan, cash, EFT, ACH files and computed reconciliation results are processed in browser memory and must **not** be inserted into these tables.

## Source-controlled migrations

- `migrations/20261029170000_workspace.sql`: credit union settings, users, activity log, indexes, append-only trigger and demo records.
- `migrations/20261029220000_owner_email.sql`: additive owner email migration; preserves user ID and log references.

**Do not modify an applied migration.** Add a new timestamped SQL migration for future schema changes. This folder belongs in GitHub. Never commit database dumps, real member financial data, connection strings, `.env` files, passwords, Identity tokens, or production secrets.

## Deploy sequence

1. Confirm the GitHub repository is private and review repository history for previously published sensitive information.
2. Provision and attach PostgreSQL using the intended Netlify project's supported database workflow. Provisioning is a separate step; pushing this directory to GitHub does not create a live database.
3. Deploy the **entire** app, including Netlify functions and migrations. Do not use a static `dist/`-only upload.
4. Verify that both migrations ran successfully against the intended database, using migration/deployment records. Never run seed migrations again by manually copy-pasting SQL into an existing database.
5. Enable verified invite-only Identity sign-in, confirm only approved users are bound to database identities, and test owner and tenant-scoped roles.
6. Test saving/reloading CU name, mapping and default workspace after logout and from a second device; test optimistic version conflicts.
7. Verify activity log append-only behavior and retention/backup policy. Browser-reported reconciliation events are telemetry, not independently attested accounting evidence.

## Current schema and limitations

- `credit_union_settings`: tenant-scoped name, mapping JSON, optimistic revision.
- `users`: verified Identity binding, role, optional CU association, active flag and personal settings.
- `activity_log`: actor, tenant, action, outcome, server timestamp; append-only to ordinary application writes.

The database currently has no independently verified reconciliation-result attestations. The browser idle timer does not itself enforce server-side session expiry. See `SECURITY.md` and `SERVER_SETUP.md` for details.

## Production validation checklist

- [ ] Confirm repository visibility/private access
- [ ] Confirm PostgreSQL provisioned for the correct Netlify site
- [ ] Confirm migrations deployed and inspected
- [ ] Confirm Identity invite-only/email confirmation
- [ ] Confirm unauthorized and cross-CU calls rejected by the API
- [ ] Confirm no financial files or member records sent to the database
- [ ] Confirm backup, retention, restore and incident response procedures

No live database connection or production deployment is implied by this documentation.
