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


insert into public.projects
  (name, "desc", editor_id)
values
  ('Seeded project 1', 'Seeded project 1 ' , '24a9b347-2170-41d4-a0e8-6078a9a0bef2'),
  ('Seeded project 2', 'Seeded project 2 ' , '24a9b347-2170-41d4-a0e8-6078a9a0bef2'),
  ('Seeded project 3', 'Seeded project 3 ' , '24a9b347-2170-41d4-a0e8-6078a9a0bef1');

insert into public.documents
  (project_id, name, source, full_text)
values
  (2, 'Seeded document 1', 'local_upload', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed pulvinar orci a sapien tempus, eget euismod dolor tempor. Nullam lacus mi, lobortis non massa eget, pulvinar pretium quam. Orci varius natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. In mi odio, maximus id tellus a, eleifend iaculis leo. Vestibulum feugiat nisi quam, non pharetra ligula sollicitudin non. Cras facilisis, nulla sed consequat porta, lectus ipsum malesuada enim, non imperdiet augue leo in felis. Aenean at placerat risus, vitae luctus nunc. Donec congue mi dictum dignissim mattis. Praesent id nunc eget purus malesuada malesuada. Quisque ac ipsum in est maximus fringilla.'),
  (3, 'Seeded document 2', 'local_upload', 'Lorem ipsum dolor sit amet, nascetur ridiculus mus. In mi odio, maximus id tellus a, eleifend iaculis leo. Vestibulum feugiat nisi quam, non pharetra ligula sollicitudin non. Cras facilisis, nulla sed consequat porta, lectus ipsum malesuada enim, non imperdiet augue leo in felis. Aenean at placerat risus, vitae luctus nunc. Donec congue mi dictum dignissim mattis. Praesent id nunc eget purus malesuada malesuada. Quisque ac ipsum in est maximus fringilla.');

insert into public.tasks
  (project_id, name, "desc", labelset_id, ann_guidelines)
values
  (2, 'seeded task', 'test', 1,'testing');

insert into public.assignments
  (annotator_id, task_id, document_id)
values
  ('24a9b347-2170-41d4-a0e8-6078a9a0bef2', 1, 1);

-- insert into public.annotations
--   (label, assignment_id, start_index, end_index, text, origin)
-- values
--   ('label1', 1, 0, 118,'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed pulvinar orci a sapien tempus, eget euismod dolor tempor.', 'manual'),
--   ('label1', 1, 356, '392','non pharetra ligula sollicitudin non','manual'),
--   ('label1', 1, 500, '544','Aenean at placerat risus, vitae luctus nunc.','manual');