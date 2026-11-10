# ABACUS security — login-free browser application

The current frontend has no application login, account, password, user-role or server identity implementation. It opens directly to the reconciliation workspace. Existing local folder selection is a browser permission mechanism, not login.

Financial source files, results, and variance notes are held in browser memory for the session and are not uploaded to a backend service by the application. A folder handle can be remembered in IndexedDB for the same browser/device; the selected XP2/DataSafe core system is remembered in localStorage. Local history is not an independently verified audit trail.

A password dialog may still appear when a *source PDF itself* is encrypted. That is a document password needed to read the user's file; it is not a login credential and is not retained.

Anyone with access to the hosted URL can open and operate the application. No per-user access control or tenant authorization exists in this build. Avoid importing real sensitive data on shared/untrusted devices. Host-level protections and device security are separate operational decisions.

No previous database, Netlify site identity configuration, external identity service, or historic account record is deleted merely by removing source files. Review and decommission those resources separately if they exist. Do not delete an existing database without checking whether it contains business configuration or audit records.

The application uses restrictive deployment headers and bundles PDF processing assets locally. Exports, prints, screenshots, browser extensions and host compromises are outside application-level session protection.
