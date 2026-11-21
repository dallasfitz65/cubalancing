# ABACUS security verification

Separate **static source assertions** from **live database evidence**. Tests do not create, update or delete financial or user records. Live SQL runs inside read-only transactions that are rolled back.

## 1. Static checks

Run: npm run security:static

These validate transactional context in handlers, RLS declarations and authentication guardrails. Source inspection alone cannot certify deployed security.

## 2. Live database verification

Run from an authorized Netlify runtime or trusted operator shell with the SAME Netlify database connection and branch used by the application. Never paste a connection string into issues, chat or logs. Do not expose the verifier as a public endpoint.

Set the following environment variables to existing fixtures:

- ABACUS_VERIFY_USER_ID: a non-platform-admin ABACUS user assigned to CU A, but not CU B
- ABACUS_VERIFY_TENANT_A: that user's CU A UUID
- ABACUS_VERIFY_TENANT_B: a different existing CU B UUID

Ensure CU A has at least one existing setting, GL mapping or reconciliation run. Then run: npm run security:db. No new records are created.

Checks: the actual runtime database role must not be superuser or BYPASSRLS; five tenant tables must have enabled and forced RLS; user A can see CU A but not CU B metadata, settings, mappings or runs; transaction-local user, tenant and admin context must clear between requests; legacy table names are inventoried without dumping contents.

Important limitations: a denied CU B lookup does not prove CU B exists. Independently verify both fixture IDs and B's existence with authorized administration. An empty table cannot prove data-row isolation, so the verifier marks missing coverage as incomplete. Use a controlled real authenticated API test before production certification. A test run against development cannot certify production.

## 3. Published asset exposure

Set ABACUS_VERIFY_SITE_URL to the HTTPS application origin and run: npm run security:exposure. Requests are GET-only and print no response bodies. SPA HTML fallback does not count as SQL exposure. This is a limited negative test, not a complete asset audit.

## 4. Legacy authentication review

Active ABACUS login uses abacus_users and abacus_sessions. Audit the legacy users, activity_log and credit_union_settings tables and any Netlify Identity routes, permissions, triggers and dependents before attempting retirement. Do not drop tables without backup and a reviewed migration.

## Release gate

Do not certify onboarding real credit unions until actual production database role, RLS table checks, cross-tenant negative tests with validated populated fixtures, connection reset, public exposure, and legacy-auth review all pass. A FAIL or INCOMPLETE result is not a pass. Do not put member data, passwords or credentials in test results.
