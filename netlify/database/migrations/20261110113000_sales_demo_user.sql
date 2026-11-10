-- Demo-only standard user. Authentication is handled by Netlify Identity.
-- This migration does not create an Identity credential or set a password.
INSERT INTO users (email, role, credit_union_id, active, settings)
VALUES ('sales@sales.com', 'user', 'demo-cu', true, '{"defaultWorkspace":"atm"}'::jsonb)
ON CONFLICT (email) DO NOTHING;
