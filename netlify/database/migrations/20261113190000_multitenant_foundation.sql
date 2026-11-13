-- ABACUS milestone 1: additive multi-tenant foundation.
-- No financial transactions or source-file bytes are stored in these tables.
CREATE TABLE IF NOT EXISTS abacus_credit_unions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 name text NOT NULL CHECK(length(btrim(name)) BETWEEN 1 AND 150),
 active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS abacus_user_credit_unions (
 user_id bigint NOT NULL REFERENCES abacus_users(id) ON DELETE CASCADE,
 credit_union_id uuid NOT NULL REFERENCES abacus_credit_unions(id) ON DELETE CASCADE,
 role text NOT NULL CHECK(role IN ('admin','reconciler','reviewer')),
 active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id, credit_union_id)
);
CREATE INDEX IF NOT EXISTS abacus_user_credit_unions_tenant_idx ON abacus_user_credit_unions(credit_union_id,user_id);
CREATE TABLE IF NOT EXISTS abacus_tenant_settings (
 credit_union_id uuid NOT NULL REFERENCES abacus_credit_unions(id) ON DELETE CASCADE,
 setting_key text NOT NULL CHECK(setting_key IN ('core-system','sign-convention')),
 setting_value jsonb NOT NULL,
 version bigint NOT NULL DEFAULT 1 CHECK(version>0),
 updated_at timestamptz NOT NULL DEFAULT now(),
 updated_by bigint REFERENCES abacus_users(id) ON DELETE SET NULL,
 PRIMARY KEY(credit_union_id, setting_key)
);
-- Request context must be set inside a transaction after checking an authenticated server session.
-- Force RLS even if the application connection happens to own these tables.
ALTER TABLE abacus_credit_unions ENABLE ROW LEVEL SECURITY;
ALTER TABLE abacus_credit_unions FORCE ROW LEVEL SECURITY;
ALTER TABLE abacus_user_credit_unions ENABLE ROW LEVEL SECURITY;
ALTER TABLE abacus_user_credit_unions FORCE ROW LEVEL SECURITY;
ALTER TABLE abacus_tenant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE abacus_tenant_settings FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS abacus_member_visibility ON abacus_user_credit_unions;
CREATE POLICY abacus_member_visibility ON abacus_user_credit_unions FOR SELECT
 USING (user_id::text = nullif(current_setting('abacus.user_id',true),'') OR current_setting('abacus.platform_admin',true)='true');
DROP POLICY IF EXISTS abacus_member_insert ON abacus_user_credit_unions;
CREATE POLICY abacus_member_insert ON abacus_user_credit_unions FOR INSERT
 WITH CHECK(current_setting('abacus.platform_admin',true)='true');
DROP POLICY IF EXISTS abacus_member_update ON abacus_user_credit_unions;
CREATE POLICY abacus_member_update ON abacus_user_credit_unions FOR UPDATE
 USING(current_setting('abacus.platform_admin',true)='true')
 WITH CHECK(current_setting('abacus.platform_admin',true)='true');
DROP POLICY IF EXISTS abacus_tenant_visibility ON abacus_credit_unions;
CREATE POLICY abacus_tenant_visibility ON abacus_credit_unions FOR SELECT USING (
 current_setting('abacus.platform_admin',true)='true' OR
 EXISTS(SELECT 1 FROM abacus_user_credit_unions m
 WHERE m.credit_union_id=id AND m.active=true AND m.user_id::text=nullif(current_setting('abacus.user_id',true),''))
);
DROP POLICY IF EXISTS abacus_tenant_create ON abacus_credit_unions;
CREATE POLICY abacus_tenant_create ON abacus_credit_unions FOR INSERT
 WITH CHECK(current_setting('abacus.platform_admin',true)='true');
DROP POLICY IF EXISTS abacus_settings_read ON abacus_tenant_settings;
CREATE POLICY abacus_settings_read ON abacus_tenant_settings FOR SELECT USING (
 credit_union_id::text=nullif(current_setting('abacus.tenant_id',true),'') AND
 EXISTS(SELECT 1 FROM abacus_user_credit_unions m WHERE m.credit_union_id=abacus_tenant_settings.credit_union_id
 AND m.user_id::text=nullif(current_setting('abacus.user_id',true),'') AND m.active=true)
);
DROP POLICY IF EXISTS abacus_settings_write ON abacus_tenant_settings;
CREATE POLICY abacus_settings_write ON abacus_tenant_settings FOR INSERT WITH CHECK (
 credit_union_id::text=nullif(current_setting('abacus.tenant_id',true),'') AND
 EXISTS(SELECT 1 FROM abacus_user_credit_unions m WHERE m.credit_union_id=abacus_tenant_settings.credit_union_id
 AND m.user_id::text=nullif(current_setting('abacus.user_id',true),'') AND m.active=true AND m.role='admin')
);
DROP POLICY IF EXISTS abacus_settings_update ON abacus_tenant_settings;
CREATE POLICY abacus_settings_update ON abacus_tenant_settings FOR UPDATE USING (
 credit_union_id::text=nullif(current_setting('abacus.tenant_id',true),'') AND
 EXISTS(SELECT 1 FROM abacus_user_credit_unions m WHERE m.credit_union_id=abacus_tenant_settings.credit_union_id
 AND m.user_id::text=nullif(current_setting('abacus.user_id',true),'') AND m.active=true AND m.role='admin')
) WITH CHECK (
 credit_union_id::text=nullif(current_setting('abacus.tenant_id',true),'') AND
 EXISTS(SELECT 1 FROM abacus_user_credit_unions m WHERE m.credit_union_id=abacus_tenant_settings.credit_union_id
 AND m.user_id::text=nullif(current_setting('abacus.user_id',true),'') AND m.active=true AND m.role='admin')
);
