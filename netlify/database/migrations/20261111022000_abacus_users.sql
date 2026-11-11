-- User accounts and server-side sessions. No credit union financial records are stored here.
CREATE TABLE IF NOT EXISTS abacus_users (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 username text NOT NULL,
 password_hash text NOT NULL,
 role text NOT NULL DEFAULT 'user' CHECK(role IN ('admin','user')),
 active boolean NOT NULL DEFAULT true,
 failed_attempts integer NOT NULL DEFAULT 0,
 locked_until timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS abacus_users_username_unique ON abacus_users(lower(username));
CREATE TABLE IF NOT EXISTS abacus_sessions (
 token_hash text PRIMARY KEY,
 user_id bigint NOT NULL REFERENCES abacus_users(id) ON DELETE CASCADE,
 expires_at timestamptz NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS abacus_sessions_user_id_idx ON abacus_sessions(user_id);
CREATE INDEX IF NOT EXISTS abacus_sessions_expires_at_idx ON abacus_sessions(expires_at);
