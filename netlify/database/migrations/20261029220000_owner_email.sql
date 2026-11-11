-- Preserve the owner row, settings and historical log references.
-- Require a verified Identity account for the replacement address.
DO $$
DECLARE owner_id bigint;
BEGIN
 SELECT id INTO STRICT owner_id FROM users
 WHERE email='michael.fitzgerald@cu-analytics.net' AND role='owner' FOR UPDATE;
 IF EXISTS(SELECT 1 FROM users WHERE email='dallasfitz65@icloud.com') THEN
   RAISE EXCEPTION 'Replacement email already exists; review account ownership before merging';
 END IF;
 UPDATE users SET email='dallasfitz65@icloud.com',identity_id=NULL,updated_at=now()
 WHERE id=owner_id;
 INSERT INTO activity_log(user_id,credit_union_id,action,outcome)
 VALUES(owner_id,NULL,'owner_email_changed','saved');
END $$;
