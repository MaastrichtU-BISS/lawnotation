-- Insert user annotator@test.com and editor@test.com
insert into auth.users 
  (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, invited_at, confirmation_token, confirmation_sent_at, recovery_token, recovery_sent_at, email_change_token_new, email_change, email_change_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at, phone, phone_confirmed_at, phone_change, phone_change_token, phone_change_sent_at, email_change_token_current, email_change_confirm_status, banned_until, reauthentication_token, reauthentication_sent_at)
values 
  ('24a9b347-2170-41d4-a0e8-6078a9a0bef1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'annotator@test.com', '$2a$10$SmjgCFk1FYnEyrb.BCi9Te9puhz39SKBpW8yYyQWXD5UerE4O2pL.', timezone('utc'::text, now()), NULL, '', NULL, '', NULL, '', '', NULL, NULL, '{"provider": "email", "providers": ["email"]}', '{}', NULL, timezone('utc'::text, now()), timezone('utc'::text, now()), NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL),
  ('24a9b347-2170-41d4-a0e8-6078a9a0bef2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'editor@test.com', '$2a$10$SmjgCFk1FYnEyrb.BCi9Te9puhz39SKBpW8yYyQWXD5UerE4O2pL.', timezone('utc'::text, now()), NULL, '', NULL, '', NULL, '', '', NULL, NULL, '{"provider": "email", "providers": ["email"]}', '{}', NULL, timezone('utc'::text, now()), timezone('utc'::text, now()), NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL);

insert into auth.identities 
  (id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values 
  ('24a9b347-2170-41d4-a0e8-6078a9a0bef1', '24a9b347-2170-41d4-a0e8-6078a9a0bef1',	'{"sub":"24a9b347-2170-41d4-a0e8-6078a9a0bef1","email":"annotator@test.com"}', 'annotator@test.com', timezone('utc'::text, now()), timezone('utc'::text, now()), timezone('utc'::text, now())),
  ('24a9b347-2170-41d4-a0e8-6078a9a0bef2', '24a9b347-2170-41d4-a0e8-6078a9a0bef2',	'{"sub":"24a9b347-2170-41d4-a0e8-6078a9a0bef2","email":"editor@test.com"}', 'editor@test.com', timezone('utc'::text, now()), timezone('utc'::text, now()), timezone('utc'::text, now()));

insert into public.users 
  (id, email, "role")
values 
  ('24a9b347-2170-41d4-a0e8-6078a9a0bef1', 'annotator@test.com', 'annotator'::"user_roles"),
  ('24a9b347-2170-41d4-a0e8-6078a9a0bef2', 'editor@test.com', 'editor'::"user_roles");