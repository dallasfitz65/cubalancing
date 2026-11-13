-- One-time recovery key usage records. Never stores the raw recovery key.
CREATE TABLE IF NOT EXISTS abacus_admin_recovery_use (
 token_hash text PRIMARY KEY CHECK(token_hash ~ '^[a-f0-9]{64}$'),
 recovered_user_id bigint NOT NULL REFERENCES abacus_users(id) ON DELETE RESTRICT,
 consumed_at timestamptz NOT NULL DEFAULT now()
);
