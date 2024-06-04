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

insert into public.labelsets
  (name, "desc", labels, editor_id)
values
  ('ZSTC-MODEL-LABELS', 'A labelset meant to be used by any task, but also works well when used by the zstc model.', '[
  {
    "name": "OBLIGATION",
    "color": "#ac66a1"
  },
  {
    "name": "PERMISSION",
    "color": "#443bca"
  },
  {
    "name": "PROHIBITION",
    "color": "#07b904"
  },
  {
    "name": "POWER",
    "color": "#bc2a06"
  },
  {
    "name": "RIGHT",
    "color": "#f0e805"
  },
  {
    "name": "NONE",
    "color": "#363635"
  }
]', '24a9b347-2170-41d4-a0e8-6078a9a0bef2');

insert into public.labelsets
  (name, "desc", labels)
values
  ('NER-MODEL-LABELS', 'Labelset meant to be used by one fo the ml models provided as an option when creating a new task.', '[
  {
    "name": "CASE_NUMBER",
    "color": "#9e9f9f"
  },
  {
    "name": "COURT",
    "color": "#785e3c"
  },
  {
    "name": "DATE",
    "color": "#87a666"
  },
  {
    "name": "GPE",
    "color": "#b91d3c"
  },
  {
    "name": "JUDGE",
    "color": "#8148d3"
  },
  {
    "name": "LAWYER",
    "color": "#101dcb"
  },
  {
    "name": "ORG",
    "color": "#9fa202"
  },
  {
    "name": "OTHER_PERSON",
    "color": "#337e95"
  },
  {
    "name": "PETITIONER",
    "color": "#f5870a"
  },
  {
    "name": "PRECEDENT",
    "color": "#05f515"
  },
  {
    "name": "PROVISION",
    "color": "#f9064b"
  },
  {
    "name": "RESPONDENT",
    "color": "#dfe5b3"
  },
  {
    "name": "STATUTE",
    "color": "#2b2f31"
  },
  {
    "name": "WITNESS",
    "color": "#017e2d"
  }
]');

insert into public.ml_models
  (name, "type", annotation_level, labelset_id)
values
  ('en_legal_ner_trf', 'ner', 'word', 3);

insert into public.ml_models
  (name, "type", annotation_level)
values
  ('sileod/deberta-v3-base-tasksource-nli', 'zstc', 'document');