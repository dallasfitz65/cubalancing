# ABACUS — production security release gate

Do not onboard real credit unions or load real member financial data until all checks below pass and the evidence is retained.

## Authorization

- [ ] Ordinary Add User creates **platform user** only; cannot create a platform administrator.
- [ ] Platform role promotion requires `ABACUS_PLATFORM_OWNER_USER_ID` (the intended immutable numeric database user ID) configured **only** as a server-side environment variable, plus current owner password confirmation. The browser must never receive that configuration value or password.
- [ ] A platform administrator with no existing active institution-admin membership cannot grant access to that CU. Platform admins must not self-assign.
- [ ] A second authorized existing institution administrator must assign membership to the requesting platform administrator if needed. Confirm the business approval with the CU; this code does not implement a formal dual-signature workflow.
- [ ] Review existing platform admins and all institution-admin grants, especially grants created before this patch. The patch does not retroactively revoke them.
- [ ] Audit the activity stream for user assignments and platform role changes; the new action uses `platform_role_changed` and requires operator review. Ensure the activity viewer supports new event names.

## Deleted and disabled users

- [ ] Verify deleted users cannot log in with a password or old session.
- [ ] Verify deleted admin accounts cannot be listed or reset by recovery.
- [ ] Verify owner-only promotion cannot target deleted or disabled accounts.
- [ ] Review any admin accounts recovered before this patch for deleted_at inconsistency and active sessions.

## Login protections

- [ ] Inspect Netlify deploy post-processing logs to verify the function `/api/auth` per-IP `rateLimit` rule was accepted. Netlify explicitly warns that invalid rules may not fail the deployment.
- [ ] Test repeated invalid passwords do not lock out the target account and that rate limiting eventually returns HTTP 429 from one IP.
- [ ] Test rate limits behind corporate NAT with expected usage; current ceiling is 30 requests per IP per 60 seconds **for all auth operations**. The platform uses eventually enforced limits, not a synchronous brute-force defense. Add MFA and abuse monitoring before general production rollout.
- [ ] Keep recovery token hashes server-only, and protect recovery endpoint with the same IP/network abuse controls and operational monitoring.

## Live database verification (required)

From a **trusted operator shell** with the exact production runtime database connection and credentials, run:

```bash
ABACUS_VERIFY_USER_ID=<non-admin-user-in-tenant-A> \
ABACUS_VERIFY_TENANT_A=<tenant-A-uuid> \
ABACUS_VERIFY_TENANT_B=<unrelated-tenant-B-uuid> \
npm run security:db
```

Use two **synthetic test tenants**, one populated with test settings, mappings and history. Do not put IDs or credentials in a public log. The script is read-only, and must exit zero with PASS for:
- runtime DB role is neither superuser nor BYPASSRLS;
- runtime role owns no protected table;
- ENABLE and FORCE RLS on the required tables;
- tenant B data inaccessible as tenant A's ordinary user;
- transaction-local settings do not leak between requests;
- populated tenant fixture coverage.

A missing fixture, failed check, or insufficient permission means **not certified**. Do not replace this run with unit tests or a second, more privileged database connection.

## Remaining prelaunch work

- MFA or phishing-resistant authentication for platform admins and credit union administrators.
- Independently audit all production table/view grants, old identity endpoints, and RLS policies, including policy behavior when `abacus.platform_admin=true`.
- Implement an explicit approval workflow and independent audit review for institution-admin role changes if credit unions require dual control.
- Review the legacy database tables and confirm no unauthenticated public artifacts disclose credentials or member data.
- Run a scoped cross-tenant penetration test with two test credit unions.
