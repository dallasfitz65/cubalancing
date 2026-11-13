-- Additive institution-specific GL/core account mapping storage.
CREATE TABLE IF NOT EXISTS abacus_tenant_mappings (
 credit_union_id uuid NOT NULL REFERENCES abacus_credit_unions(id) ON DELETE RESTRICT,
 core_system text NOT NULL CHECK(core_system IN ('xp2','datasafe')),
 mapping jsonb NOT NULL CHECK(jsonb_typeof(mapping)='object' AND jsonb_typeof(mapping->'entries')='array'),
 version bigint NOT NULL DEFAULT 1 CHECK(version>0),
 updated_by bigint REFERENCES abacus_users(id) ON DELETE SET NULL,
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(credit_union_id,core_system)
);
ALTER TABLE abacus_tenant_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE abacus_tenant_mappings FORCE ROW LEVEL SECURITY;
CREATE POLICY abacus_mapping_read ON abacus_tenant_mappings FOR SELECT USING (
 credit_union_id::text=nullif(current_setting('abacus.tenant_id',true),'')
 AND EXISTS(SELECT 1 FROM abacus_user_credit_unions m WHERE m.credit_union_id=abacus_tenant_mappings.credit_union_id
 AND m.user_id::text=nullif(current_setting('abacus.user_id',true),'') AND m.active=true)
);
CREATE POLICY abacus_mapping_insert ON abacus_tenant_mappings FOR INSERT WITH CHECK (
 credit_union_id::text=nullif(current_setting('abacus.tenant_id',true),'')
 AND EXISTS(SELECT 1 FROM abacus_user_credit_unions m WHERE m.credit_union_id=abacus_tenant_mappings.credit_union_id
 AND m.user_id::text=nullif(current_setting('abacus.user_id',true),'') AND m.active=true AND m.role='admin')
);
CREATE POLICY abacus_mapping_update ON abacus_tenant_mappings FOR UPDATE USING (
 credit_union_id::text=nullif(current_setting('abacus.tenant_id',true),'')
 AND EXISTS(SELECT 1 FROM abacus_user_credit_unions m WHERE m.credit_union_id=abacus_tenant_mappings.credit_union_id
 AND m.user_id::text=nullif(current_setting('abacus.user_id',true),'') AND m.active=true AND m.role='admin')
) WITH CHECK (
 credit_union_id::text=nullif(current_setting('abacus.tenant_id',true),'')
 AND EXISTS(SELECT 1 FROM abacus_user_credit_unions m WHERE m.credit_union_id=abacus_tenant_mappings.credit_union_id
 AND m.user_id::text=nullif(current_setting('abacus.user_id',true),'') AND m.active=true AND m.role='admin')
);
