-- Retire access without removing historical financial/audit attribution.
-- Keep user IDs for reconciliation runs, settings authors and recovery records.
ALTER TABLE abacus_users ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE abacus_users ADD COLUMN IF NOT EXISTS deleted_by bigint REFERENCES abacus_users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS abacus_users_not_deleted_idx ON abacus_users(id) WHERE deleted_at IS NULL;
