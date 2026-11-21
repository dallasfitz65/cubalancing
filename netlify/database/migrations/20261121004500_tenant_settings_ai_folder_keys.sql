-- Align the tenant-settings database constraint with the keys supported by the API.
-- Existing settings and values are retained.
ALTER TABLE abacus_tenant_settings
 DROP CONSTRAINT IF EXISTS abacus_tenant_settings_setting_key_check;
ALTER TABLE abacus_tenant_settings
 ADD CONSTRAINT abacus_tenant_settings_setting_key_check
 CHECK(setting_key IN ('core-system','sign-convention','ai-enabled','folder-name'));
