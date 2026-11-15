-- Cross-credit-union operational activity: metadata only; no member, source-file or GL balance data.
CREATE TABLE IF NOT EXISTS abacus_activity_events (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 actor_user_id bigint NOT NULL REFERENCES abacus_users(id) ON DELETE RESTRICT,
 credit_union_id uuid REFERENCES abacus_credit_unions(id) ON DELETE RESTRICT,
 event_type text NOT NULL CHECK(event_type IN
 ('login','logout','user_created','user_disabled','user_enabled','user_deleted','tenant_created','user_assigned','setting_saved','mapping_saved')),
 target_user_id bigint REFERENCES abacus_users(id) ON DELETE RESTRICT,
 detail text CHECK(detail IS NULL OR length(detail)<=120),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS abacus_activity_events_time_idx ON abacus_activity_events(created_at DESC,id DESC);
CREATE INDEX IF NOT EXISTS abacus_activity_events_tenant_idx ON abacus_activity_events(credit_union_id,created_at DESC);
CREATE INDEX IF NOT EXISTS abacus_activity_events_actor_idx ON abacus_activity_events(actor_user_id,created_at DESC);
ALTER TABLE abacus_activity_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE abacus_activity_events FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS abacus_activity_insert ON abacus_activity_events;
CREATE POLICY abacus_activity_insert ON abacus_activity_events FOR INSERT
 WITH CHECK (actor_user_id::text=nullif(current_setting('abacus.user_id',true),''));
DROP POLICY IF EXISTS abacus_activity_admin_read ON abacus_activity_events;
CREATE POLICY abacus_activity_admin_read ON abacus_activity_events FOR SELECT USING (
 current_setting('abacus.platform_admin',true)='true'
 AND current_setting('abacus.audit_admin',true)='true'
);
-- Existing reconciliation records can be viewed cross-tenant only by a verified Admin99 audit request.
DROP POLICY IF EXISTS abacus_runs_platform_audit ON abacus_reconciliation_runs;
CREATE POLICY abacus_runs_platform_audit ON abacus_reconciliation_runs FOR SELECT USING (
 current_setting('abacus.platform_admin',true)='true'
 AND current_setting('abacus.audit_admin',true)='true'
);
