# Security status — evaluation build

The React app keeps selected File objects, email entry, extracted balances, notes, run history in React memory, with folder handles optionally remembered as described below. No financial/session content is written to localStorage, sessionStorage, IndexedDB, Cache Storage or OPFS. The optional Remember folder feature stores only a directory handle in a dedicated IndexedDB record; this may reveal the selected folder name/location and survives sign-out. Use Forget folder to delete that preference. No file bytes, balances, email, notes, mapping replacements or history are persisted there. Recognized legacy ABACUS file/note keys are removed at session start. No service worker is registered.

Sign-out unmounts the workspace. A new sign-in creates a separate workspace instance. Sessions expire after 15 minutes without pointer, keyboard, wheel or touch activity; expiry is checked on resume and on a 10-second timer. Page navigation away clears the session. Background timer throttling can delay cleanup until the page resumes. No secure memory erasure is claimed.

The email entry screen is NOT authentication or authorization. Production needs verified identities, an access policy and server-enforced authorization where protected services are introduced. Browser-only UI checks cannot secure public application assets.

CSP restricts scripts/workers and connections to the same origin, disables objects/forms, and the deployment headers deny framing and HTTP caching. Inline script permission was removed. These headers must be verified on the deployed host. Same-origin connections remain needed for local PDF worker/assets; this is not an OS firewall or an egress guarantee.

No financial upload API, external AI call, analytics or third-party font load exists in the React application source. Marketing pages and the older standalone HTML demo are separate and not covered by this assessment.

Source financial files remain on the user's device. User-requested JSON exports, printing/PDF, screenshots, OS swap/crash dumps, browser extensions and downloaded copies are outside session cleanup. The supplied Account.csv master mapping reference rows are intentionally packaged in application assets; do not treat these assets as secret. Real production mappings should be institution-scoped configuration, not publicly bundled for multiple customers.

Verification: source/storage guard and CSP tests; application build and parser tests. No deployed-header capture, live network capture, browser storage inspection, penetration test or independent security certification is included in this pass.


Settings persistence update: validated master GL/core account mapping and its review confirmation are stored in IndexedDB on this browser/device, in addition to the optional folder handle. They survive sign-out and refresh. Imported financial reports, GL approval, run results, email and member data remain session-only. Settings are not shared between browsers or devices. Browser storage clearing removes saved settings. Earlier statements that mapping replacements are memory-only are superseded by this update.

## Server-backed accounts release (supersedes previous login/settings statements)
Email-only entry has been replaced by Netlify Identity verified login. Shared CU mapping and personal default workspace live in Postgres; DB role and CU checks protect each API operation. Both approved owner records are seeded by migration, but are not activated until deployment, Identity setup and verified sign-in. See SERVER_SETUP.md for exact setup, validation scope and remaining limitations. Browser-stored legacy master mapping is removed on sign-in. Optional folder handles remain local. Authentication cookies are an additional necessary persistence category; financial reports remain memory-only. Activity log stores verified actor, CU, action, outcome and server timestamp. Browser-reported run outcomes are not attested financial audit evidence.
