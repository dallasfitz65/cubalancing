-- Owner-managed configuration, shared across all Abacus credit unions.
CREATE TABLE IF NOT EXISTS abacus_platform_settings (
 setting_key text PRIMARY KEY CHECK (setting_key IN ('ai-integration')),
 setting_value jsonb NOT NULL,
 version bigint NOT NULL DEFAULT 1 CHECK (version>0),
 updated_at timestamptz NOT NULL DEFAULT now(),
 updated_by bigint REFERENCES abacus_users(id) ON DELETE SET NULL
);
ALTER TABLE abacus_platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE abacus_platform_settings FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS abacus_platform_settings_admin_read ON abacus_platform_settings;
CREATE POLICY abacus_platform_settings_admin_read ON abacus_platform_settings FOR SELECT
 USING (current_setting('abacus.platform_admin',true)='true');
DROP POLICY IF EXISTS abacus_platform_settings_admin_insert ON abacus_platform_settings;
CREATE POLICY abacus_platform_settings_admin_insert ON abacus_platform_settings FOR INSERT
 WITH CHECK (current_setting('abacus.platform_admin',true)='true');
DROP POLICY IF EXISTS abacus_platform_settings_admin_update ON abacus_platform_settings;
CREATE POLICY abacus_platform_settings_admin_update ON abacus_platform_settings FOR UPDATE
 USING (current_setting('abacus.platform_admin',true)='true')
 WITH CHECK (current_setting('abacus.platform_admin',true)='true');
