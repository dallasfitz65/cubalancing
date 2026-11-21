-- Rename the single existing demo institution without changing its tenant ID,
-- memberships, history, mappings, or other tenants.
-- An unexpected duplicate match is deliberately left unchanged.
DROP POLICY IF EXISTS abacus_platform_tenant_rename ON abacus_credit_unions;
CREATE POLICY abacus_platform_tenant_rename ON abacus_credit_unions
 FOR UPDATE
 USING (current_setting('abacus.platform_admin',true)='true')
 WITH CHECK (current_setting('abacus.platform_admin',true)='true');
DO $$
BEGIN
 PERFORM set_config('abacus.platform_admin','true',true);
 IF (SELECT count(*) FROM abacus_credit_unions WHERE lower(btrim(name))='american partners')=1 THEN
  UPDATE abacus_credit_unions SET name='Demo Credit Union',updated_at=now()
   WHERE lower(btrim(name))='american partners';
 END IF;
END $$;
