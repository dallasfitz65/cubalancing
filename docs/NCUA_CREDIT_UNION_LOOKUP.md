## NCUA lookup shared with CU-Analytics

The Platform → Credit Union Management add dialog uses the same public NCUA lookup contract as CU-Analytics (`netlify/functions/ncua.js` in `dallasfitz65/cuanalytics`). It searches the NCUA Research a Credit Union endpoint by institution name or charter number, lists active results with location, and requires a selection before onboarding.

Abacus calls the NCUA directory from its authenticated server API, not from browsers or through another product's tenant data. The selected NCUA charter is verified again by the server during creation and stored as an optional unique `abacus_credit_unions.ncua_charter`. Credit union account, user, mapping and history data remain Abacus-specific. Existing tenant UUIDs and members do not change.

### Migration dependency

Deploy `20261121030000_ncua_charter_identity.sql` **before** serving the updated tenant API. The migration adds a nullable charter column and a partial unique index. Without the migration, the credit union listing and creation endpoints will fail. Confirm successful migration on the actual production database independently of the static-site deployment.

### Handling special institutions

The optional manual mode is for demos or institutions not found in NCUA. Manual tenants have a null charter until a later explicit verification flow is developed. Do not automatically match an existing manual tenant to NCUA by name or merge its data.

This feature does not import CU-Analytics data or call reports into Abacus and does not synchronize customers between the applications.
