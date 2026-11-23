-- Permit the audit events emitted by password changes and platform role updates.
-- Must be deployed before those operations are enabled on live tenants.
ALTER TABLE abacus_activity_events DROP CONSTRAINT IF EXISTS abacus_activity_events_event_type_check;
ALTER TABLE abacus_activity_events ADD CONSTRAINT abacus_activity_events_event_type_check
 CHECK(event_type IN ('login','logout','user_created','user_disabled','user_enabled','user_deleted',
 'tenant_created','user_assigned','setting_saved','mapping_saved','password_changed','platform_role_changed'));
