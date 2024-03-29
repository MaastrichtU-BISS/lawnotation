-- Insert user annotator@example.com and editor@example.com
insert into auth.users 
  (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, invited_at, confirmation_token, confirmation_sent_at, recovery_token, recovery_sent_at, email_change_token_new, email_change, email_change_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at, phone, phone_confirmed_at, phone_change, phone_change_token, phone_change_sent_at, email_change_token_current, email_change_confirm_status, banned_until, reauthentication_token, reauthentication_sent_at)
values 
  ('24a9b347-2170-41d4-a0e8-6078a9a0bef1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'annotator@example.com', '$2a$10$SmjgCFk1FYnEyrb.BCi9Te9puhz39SKBpW8yYyQWXD5UerE4O2pL.', timezone('utc'::text, now()), NULL, '', NULL, '', NULL, '', '', NULL, NULL, '{"provider": "email", "providers": ["email"]}', '{}', NULL, timezone('utc'::text, now()), timezone('utc'::text, now()), NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL),
  ('24a9b347-2170-41d4-a0e8-6078a9a0bef2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'editor@example.com', '$2a$10$SmjgCFk1FYnEyrb.BCi9Te9puhz39SKBpW8yYyQWXD5UerE4O2pL.', timezone('utc'::text, now()), NULL, '', NULL, '', NULL, '', '', NULL, NULL, '{"provider": "email", "providers": ["email"]}', '{}', NULL, timezone('utc'::text, now()), timezone('utc'::text, now()), NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL);

insert into auth.identities 
  (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values 
  ('24a9b347-2170-41d4-a0e8-6078a9a0bef1', '24a9b347-2170-41d4-a0e8-6078a9a0bef1',	'{"sub":"24a9b347-2170-41d4-a0e8-6078a9a0bef1","email":"annotator@example.com"}', 'annotator@example.com', timezone('utc'::text, now()), timezone('utc'::text, now()), timezone('utc'::text, now())),
  ('24a9b347-2170-41d4-a0e8-6078a9a0bef2', '24a9b347-2170-41d4-a0e8-6078a9a0bef2',	'{"sub":"24a9b347-2170-41d4-a0e8-6078a9a0bef2","email":"editor@example.com"}', 'editor@example.com', timezone('utc'::text, now()), timezone('utc'::text, now()), timezone('utc'::text, now()));

-- insert into public.users 
--   (id, email, "role")
-- values 
--   ('24a9b347-2170-41d4-a0e8-6078a9a0bef1', 'annotator@example.com', 'annotator'::"user_roles"),
--   ('24a9b347-2170-41d4-a0e8-6078a9a0bef2', 'editor@example.com', 'editor'::"user_roles");

insert into public.labelsets
  (name, "desc", labels, editor_id)
values
  ('Seeded labelset', 'Seeded labelset description', '[{"name":"Label1","color":"#54a486"}]', '24a9b347-2170-41d4-a0e8-6078a9a0bef2');


-- additional indexes to prevent (timeout) delays when removing entities with a lot of relations

create index if not exists assignments_task_id on public.assignments using btree (task_id) tablespace pg_default;
create index if not exists annotations_assignment_id on public.annotations using btree (assignment_id) tablespace pg_default;
create index if not exists annotation_relations_from_id on public.annotation_relations using btree (from_id) tablespace pg_default;
create index if not exists annotation_relations_to_id on public.annotation_relations using btree (to_id) tablespace pg_default;