-- Additive, metadata-only persistent reconciliation history.
-- Never store member records, raw files, filenames, notes or line-level balances in this table.
CREATE TABLE IF NOT EXISTS abacus_reconciliation_runs (
 id uuid PRIMARY KEY,
 credit_union_id uuid NOT NULL REFERENCES abacus_credit_unions(id) ON DELETE RESTRICT,
 created_by bigint NOT NULL REFERENCES abacus_users(id) ON DELETE RESTRICT,
 workspace text NOT NULL CHECK(workspace IN ('shares-loans','cash','overview','drafts','eft','atm')),
 mode text NOT NULL CHECK(mode IN ('real','demo')),
 status text NOT NULL CHECK(status IN ('balanced','exceptions','partial')),
 check_count integer NOT NULL CHECK(check_count BETWEEN 0 AND 100000),
 issue_count integer NOT NULL CHECK(issue_count BETWEEN 0 AND check_count),
 unmapped_count integer NOT NULL DEFAULT 0 CHECK(unmapped_count BETWEEN 0 AND 100000),
 source_count integer NOT NULL DEFAULT 0 CHECK(source_count BETWEEN 0 AND 100),
 source_hashes jsonb NOT NULL DEFAULT '[]'::jsonb CHECK(jsonb_typeof(source_hashes)='array'),
 rule_version text,
 run_at timestamptz NOT NULL DEFAULT now(),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS abacus_runs_tenant_time_idx ON abacus_reconciliation_runs(credit_union_id,run_at DESC,id DESC);
ALTER TABLE abacus_reconciliation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE abacus_reconciliation_runs FORCE ROW LEVEL SECURITY;
CREATE POLICY abacus_runs_read ON abacus_reconciliation_runs FOR SELECT USING (
 credit_union_id::text=nullif(current_setting('abacus.tenant_id',true),'')
 AND EXISTS (
 SELECT 1 FROM abacus_user_credit_unions m
 WHERE m.credit_union_id=abacus_reconciliation_runs.credit_union_id
 AND m.user_id::text=nullif(current_setting('abacus.user_id',true),'')
 AND m.active=true
 ));
CREATE POLICY abacus_runs_insert ON abacus_reconciliation_runs FOR INSERT WITH CHECK (
 credit_union_id::text=nullif(current_setting('abacus.tenant_id',true),'')
 AND created_by::text=nullif(current_setting('abacus.user_id',true),'')
 AND EXISTS (
 SELECT 1 FROM abacus_user_credit_unions m
 WHERE m.credit_union_id=abacus_reconciliation_runs.credit_union_id
 AND m.user_id::text=nullif(current_setting('abacus.user_id',true),'')
 AND m.active=true AND m.role IN ('admin','reconciler')
 ));
-- No UPDATE or DELETE policy: history is append-only for the application.
