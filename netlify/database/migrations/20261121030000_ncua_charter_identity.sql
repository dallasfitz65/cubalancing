-- NCUA charter is a public institution identity, separate from Abacus' tenant UUID.
-- Existing tenants remain valid even if they have no charter association.
ALTER TABLE abacus_credit_unions ADD COLUMN IF NOT EXISTS ncua_charter varchar(12);
CREATE UNIQUE INDEX IF NOT EXISTS abacus_credit_unions_ncua_charter_unique
 ON abacus_credit_unions(ncua_charter) WHERE ncua_charter IS NOT NULL;
ALTER TABLE abacus_credit_unions DROP CONSTRAINT IF EXISTS abacus_credit_unions_ncua_charter_format;
ALTER TABLE abacus_credit_unions ADD CONSTRAINT abacus_credit_unions_ncua_charter_format
 CHECK(ncua_charter IS NULL OR ncua_charter ~ '^[0-9]{1,12}$');
