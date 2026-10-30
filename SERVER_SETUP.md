# ABACUS server setup

This release replaces email-only entry with verified Netlify Identity sign-in. It will not sign in on a static-only host or without Identity and the database. Do not deploy only dist: deploy the complete project so functions and migrations are included.

## Tables

- users: verified Identity binding, email, CU assignment, database role, active flag and personal default workspace.
- credit_union_settings: shared master mapping, name and optimistic concurrency version.
- activity_log: append-only action/outcome records. No uploaded report contents, balances or variance notes.

The initial migration seeds a Demo Credit Union mapping and the approved owners michael.fitzgerald@cu-analytics.net and gerald.mortimer@cu-analytics.net. They have no password in the SQL. Their Identity accounts must be created through invitations, email verification enabled. On their next verified sign-in they bind to the seeded owner records. Role checks use the current database record on every API request, not browser metadata or JWT role claims.

## Activation

1. Deploy the complete project to the intended ABACUS Netlify site. Database provisioning requires a supported plan. Migrations apply through deployment, not manually against production.
2. In the site's Netlify Identity dashboard enable Identity, choose Invite only, and leave email confirmation enabled. Invite the two owners through that dashboard. This code does not send invitations.
3. Follow each invitation and set a password. Confirm that only those two approved users can enter.
4. Owner selects a CU and reviews the shared mapping. The initial Demo Credit Union is configuration only, not imported financial report data. Additional CU and user provisioning requires reviewed additive SQL migrations; no self-registration or user-management UI is exposed.
5. Validate on a deployed environment: both owners can see all-CU Activity Log; a CU-assigned user sees only their own CU; disabled and unknown users get 403. Verify saved default workspace and mapping across devices; concurrent mapping updates must get 409. Check session expiry, logout, print/export, and reports.

Identity callbacks handle invitations and password recovery. Server login sets auth cookies; invitation/recovery callback handling uses the official browser Identity SDK. Credentials are never written into the application tables. Financial files and report results remain in memory; selected folder handles may still be remembered locally with explicit opt-in. Legacy browser-stored mapping is removed after sign-in.

## Validation and limits

39 automated tests include API authorization with mocked Identity/database clients, CU scoping, inactive users, payload allowlists and log actor enforcement. Build passes. A live database migration and deployed Identity flows have not been exercised. Do not represent this as production security certification.

Settings changes and verified sign-in events originate at the server. Balancing, draft and EFT outcomes are browser-reported telemetry, not proof of computation or a signed financial audit. No IP addresses, financial payloads, input filenames or source report details are stored in the log. The append-only trigger blocks ordinary row edits/deletes; privileged DB administrators can alter schema/triggers. Log retention and operational monitoring need an agreed policy.

The current 15-minute inactivity lock is client enforced and signs out through Identity. Server token lifetime follows Identity configuration. Multiple app tabs share authentication cookies. A lost network connection can delay server logout; do not claim a server-enforced 15-minute inactivity policy.


## Owner email change
The additive 20261029220000_owner_email migration changes Michael’s owner email to dallasfitz65@icloud.com, preserving the user ID, settings and log references. Gerald remains gerald.mortimer@cu-analytics.net. The original applied migration must not be edited. The old Identity binding is removed so the old account cannot authorize against this owner row. Activate or invite the new email through Netlify Identity with email verification enabled; next verified sign-in binds the new Identity account. Existing passwords are not migrated. This change takes effect only after deployment applies the new migration.
