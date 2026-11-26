-- Add the module configuration key already validated by the tenant API.
-- Preserve existing values, version checks, and row-level security policies.
ALTER TABLE abacus_tenant_settings
 DROP CONSTRAINT IF EXISTS abacus_tenant_settings_setting_key_check;
ALTER TABLE abacus_tenant_settings
 ADD CONSTRAINT abacus_tenant_settings_setting_key_check
 CHECK (setting_key IN ('core-system','sign-convention','ai-enabled','folder-name','enabled-modules'));
