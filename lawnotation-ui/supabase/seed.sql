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

-- Seed projects, documents, tasks, and assignments for editor@example.com
-- so the dashboard has varied projects and annotation progress to visualize.
insert into public.projects
  (id, name, "desc", editor_id)
values
  (1, 'Test Documents', 'A mixed collection of documents for dashboard testing.', '24a9b347-2170-41d4-a0e8-6078a9a0bef2'),
  (2, 'Literary Quotes', 'Short literary quotations used as seed documents.', '24a9b347-2170-41d4-a0e8-6078a9a0bef2'),
  (3, 'Legal Annotation Pilot', 'A pilot task using seeded text and the ZSTC labelset.', '24a9b347-2170-41d4-a0e8-6078a9a0bef2');

insert into public.documents
  (id, name, source, full_text, project_id)
values
  (1, 'lorem-ipsum.txt', 'tests/input/lorem-ipsum.txt', $$Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed tempus nunc sit amet dui finibus tincidunt. Aliquam in nisl ultrices, gravida leo a, sagittis turpis. Nam molestie ut felis nec lobortis. Cras in dui elementum velit maximus scelerisque eget egestas leo. Orci varius natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Integer sagittis ac nisi at efficitur. Suspendisse ultrices enim et sapien dapibus luctus. Nulla et nisi at ligula mollis congue. Duis vulputate nisl quam, vel egestas arcu condimentum sed. Duis egestas finibus magna pretium maximus. Etiam posuere vestibulum tortor. Aliquam eu dolor et enim placerat interdum. Quisque vel luctus odio. Nullam ac magna magna.

Morbi efficitur ultrices aliquet. Duis quis luctus risus. Nulla ullamcorper vehicula mollis. Aenean elementum, augue in placerat imperdiet, metus urna egestas risus, sed gravida elit lorem a sapien. Sed sapien nisi, semper a luctus nec, elementum nec sapien. Aliquam facilisis arcu quis laoreet ultricies. Nam imperdiet semper orci. Nunc aliquam sollicitudin justo, viverra pellentesque enim sodales eu. Morbi vel feugiat ante. Ut fringilla enim at molestie mattis. In ipsum nisi, egestas sed condimentum et, tempor et nulla.

Morbi eu augue vehicula lorem egestas pulvinar vel sed ipsum. Praesent non placerat mauris, sit amet commodo ex. Donec viverra ac dui sed interdum. Suspendisse ut varius urna, et sagittis tortor. Sed pulvinar egestas varius. Etiam elementum et neque sed pharetra. Donec vel ante semper, porta erat nec, vulputate sapien. In dictum, ex facilisis pretium posuere, odio sapien tempor leo, pharetra dapibus nunc augue id lectus. Sed elit mauris, efficitur at laoreet eu, sollicitudin vel lorem. Quisque mattis ac lacus a mollis.

In tortor est, porttitor sit amet mauris vitae, vulputate blandit dui. Etiam vitae pulvinar enim. Praesent aliquam felis metus, in eleifend nunc sodales quis. Sed elit tellus, porttitor vitae consequat eget, tincidunt at augue. Duis at metus sit amet mauris semper maximus commodo sed dui. Suspendisse eu consequat lacus. Integer vel facilisis metus, pharetra mollis ex. Nunc nec pulvinar quam, at sodales ipsum. Praesent tempus id nunc in auctor.

Maecenas pretium, sapien non euismod hendrerit, libero nisl ullamcorper tellus, ut laoreet leo mauris at lectus. Pellentesque pulvinar dignissim nisl, ut fringilla sapien aliquet id. Cras dui odio, hendrerit a dui non, elementum bibendum nunc. Integer id congue orci, ac sollicitudin justo. Nunc pellentesque sapien dignissim nibh tempor, ut luctus turpis ultricies. Ut rhoncus ut mauris eget cursus. Donec ultrices lorem at mattis blandit.$$,
    1),
  (2, 'casablanca.txt', 'tests/input/casablanca.txt', 'We''ll always have Paris. - Rick', 2),
  (3, 'the-godfather.txt', 'tests/input/the-godfather.txt', 'I''m gonna make him an offer he can''t refuse. - Don Corleone', 2),
  (4, 'the-wizard-of-oz.txt', 'tests/input/the-wizard-of-oz.txt', 'Toto, I''ve a feeling we''re not in Kansas anymore. - Dorothy', 3);

insert into public.tasks
  (id, name, "desc", project_id, labelset_id, annotation_level, ann_guidelines)
values
  (1, 'Lorem Word Annotation', 'Annotate words in the Lorem Ipsum seed document.', 1, 1, 'word', 'Review the full document and label relevant words.'),
  (2, 'Lorem Document Tags', 'Assign document-level tags to the Lorem Ipsum seed document.', 1, 2, 'document', 'Choose the most appropriate ZSTC label for the document.'),
  (3, 'Literary Quote Labels', 'Label the seeded Casablanca and Godfather quotations.', 2, 1, 'sentence', 'Label each sentence according to the seed labelset.'),
  (4, 'Wizard of Oz Document Tag', 'Assign a ZSTC label to the Wizard of Oz quotation.', 3, 2, 'document', 'Choose the strongest matching ZSTC label.');

insert into public.assignments
  (id, annotator_id, task_id, document_id, status, seq_pos, difficulty_rating, annotator_number, origin)
values
  (1, '24a9b347-2170-41d4-a0e8-6078a9a0bef1', 1, 1, 'done', 1, 2, 1, 'manual'),
  (2, '24a9b347-2170-41d4-a0e8-6078a9a0bef1', 1, 1, 'done', 2, 3, 2, 'manual'),
  (3, '24a9b347-2170-41d4-a0e8-6078a9a0bef1', 1, 1, 'pending', 3, 4, 3, 'manual'),
  (4, '24a9b347-2170-41d4-a0e8-6078a9a0bef1', 2, 1, 'done', 1, 1, 1, 'manual'),
  (5, '24a9b347-2170-41d4-a0e8-6078a9a0bef1', 2, 1, 'pending', 2, 2, 2, 'manual'),
  (6, '24a9b347-2170-41d4-a0e8-6078a9a0bef1', 3, 2, 'done', 1, 1, 1, 'manual'),
  (7, '24a9b347-2170-41d4-a0e8-6078a9a0bef1', 3, 2, 'done', 2, 2, 2, 'manual'),
  (8, '24a9b347-2170-41d4-a0e8-6078a9a0bef1', 3, 3, 'pending', 3, 3, 1, 'manual'),
  (9, '24a9b347-2170-41d4-a0e8-6078a9a0bef1', 3, 3, 'done', 4, 4, 2, 'manual'),
  (10, '24a9b347-2170-41d4-a0e8-6078a9a0bef1', 4, 4, 'done', 1, 2, 1, 'manual'),
  (11, '24a9b347-2170-41d4-a0e8-6078a9a0bef1', 4, 4, 'pending', 2, 3, 2, 'manual'),
  (12, '24a9b347-2170-41d4-a0e8-6078a9a0bef1', 4, 4, 'pending', 3, 5, 3, 'manual');

insert into public.projects
  (id, name, "desc", editor_id)
values
  (4, 'Dashboard Project 04', 'Seeded project for dashboard filtering.', '24a9b347-2170-41d4-a0e8-6078a9a0bef2'),
  (5, 'Dashboard Project 05', 'Seeded project for dashboard filtering.', '24a9b347-2170-41d4-a0e8-6078a9a0bef2'),
  (6, 'Dashboard Project 06', 'Seeded project for dashboard filtering.', '24a9b347-2170-41d4-a0e8-6078a9a0bef2'),
  (7, 'Dashboard Project 07', 'Seeded project for dashboard filtering.', '24a9b347-2170-41d4-a0e8-6078a9a0bef2'),
  (8, 'Dashboard Project 08', 'Seeded project for dashboard filtering.', '24a9b347-2170-41d4-a0e8-6078a9a0bef2'),
  (9, 'Dashboard Project 09', 'Seeded project for dashboard filtering.', '24a9b347-2170-41d4-a0e8-6078a9a0bef2'),
  (10, 'Dashboard Project 10', 'Seeded project for dashboard filtering.', '24a9b347-2170-41d4-a0e8-6078a9a0bef2'),
  (11, 'Dashboard Project 11', 'Seeded project for dashboard filtering.', '24a9b347-2170-41d4-a0e8-6078a9a0bef2'),
  (12, 'Dashboard Project 12', 'Seeded project for dashboard filtering.', '24a9b347-2170-41d4-a0e8-6078a9a0bef2'),
  (13, 'Dashboard Project 13', 'Seeded project for dashboard filtering.', '24a9b347-2170-41d4-a0e8-6078a9a0bef2');

insert into public.documents
  (id, name, source, full_text, project_id)
values
  (5, 'dashboard-project-04.txt', 'tests/input/lorem-ipsum.txt', 'Seeded dashboard document for project 04.', 4),
  (6, 'dashboard-project-05.txt', 'tests/input/lorem-ipsum.txt', 'Seeded dashboard document for project 05.', 5),
  (7, 'dashboard-project-06.txt', 'tests/input/lorem-ipsum.txt', 'Seeded dashboard document for project 06.', 6),
  (8, 'dashboard-project-07.txt', 'tests/input/lorem-ipsum.txt', 'Seeded dashboard document for project 07.', 7),
  (9, 'dashboard-project-08.txt', 'tests/input/lorem-ipsum.txt', 'Seeded dashboard document for project 08.', 8),
  (10, 'dashboard-project-09.txt', 'tests/input/lorem-ipsum.txt', 'Seeded dashboard document for project 09.', 9),
  (11, 'dashboard-project-10.txt', 'tests/input/lorem-ipsum.txt', 'Seeded dashboard document for project 10.', 10),
  (12, 'dashboard-project-11.txt', 'tests/input/lorem-ipsum.txt', 'Seeded dashboard document for project 11.', 11),
  (13, 'dashboard-project-12.txt', 'tests/input/lorem-ipsum.txt', 'Seeded dashboard document for project 12.', 12),
  (14, 'dashboard-project-13.txt', 'tests/input/lorem-ipsum.txt', 'Seeded dashboard document for project 13.', 13);

insert into public.tasks
  (id, name, "desc", project_id, labelset_id, annotation_level, ann_guidelines)
values
  (5, 'Dashboard Task 04', 'Seeded task for dashboard filtering.', 4, 1, 'word', 'Review the seeded dashboard document.'),
  (6, 'Dashboard Task 05', 'Seeded task for dashboard filtering.', 5, 1, 'word', 'Review the seeded dashboard document.'),
  (7, 'Dashboard Task 06', 'Seeded task for dashboard filtering.', 6, 1, 'word', 'Review the seeded dashboard document.'),
  (8, 'Dashboard Task 07', 'Seeded task for dashboard filtering.', 7, 1, 'word', 'Review the seeded dashboard document.'),
  (9, 'Dashboard Task 08', 'Seeded task for dashboard filtering.', 8, 1, 'word', 'Review the seeded dashboard document.'),
  (10, 'Dashboard Task 09', 'Seeded task for dashboard filtering.', 9, 1, 'word', 'Review the seeded dashboard document.'),
  (11, 'Dashboard Task 10', 'Seeded task for dashboard filtering.', 10, 1, 'word', 'Review the seeded dashboard document.'),
  (12, 'Dashboard Task 11', 'Seeded task for dashboard filtering.', 11, 1, 'word', 'Review the seeded dashboard document.'),
  (13, 'Dashboard Task 12', 'Seeded task for dashboard filtering.', 12, 1, 'word', 'Review the seeded dashboard document.'),
  (14, 'Dashboard Task 13', 'Seeded task for dashboard filtering.', 13, 1, 'word', 'Review the seeded dashboard document.');

insert into public.assignments
  (id, annotator_id, task_id, document_id, status, seq_pos, difficulty_rating, annotator_number, origin)
values
  (13, '24a9b347-2170-41d4-a0e8-6078a9a0bef1', 5, 5, 'pending', 1, 0, 1, 'manual'),
  (14, '24a9b347-2170-41d4-a0e8-6078a9a0bef1', 6, 6, 'pending', 1, 0, 1, 'manual'),
  (15, '24a9b347-2170-41d4-a0e8-6078a9a0bef1', 7, 7, 'pending', 1, 0, 1, 'manual'),
  (16, '24a9b347-2170-41d4-a0e8-6078a9a0bef1', 8, 8, 'pending', 1, 0, 1, 'manual'),
  (17, '24a9b347-2170-41d4-a0e8-6078a9a0bef1', 9, 9, 'pending', 1, 0, 1, 'manual'),
  (18, '24a9b347-2170-41d4-a0e8-6078a9a0bef1', 10, 10, 'pending', 1, 0, 1, 'manual'),
  (19, '24a9b347-2170-41d4-a0e8-6078a9a0bef1', 11, 11, 'pending', 1, 0, 1, 'manual'),
  (20, '24a9b347-2170-41d4-a0e8-6078a9a0bef1', 12, 12, 'pending', 1, 0, 1, 'manual'),
  (21, '24a9b347-2170-41d4-a0e8-6078a9a0bef1', 13, 13, 'pending', 1, 0, 1, 'manual'),
  (22, '24a9b347-2170-41d4-a0e8-6078a9a0bef1', 14, 14, 'pending', 1, 0, 1, 'manual');

select setval('public.projects_id_seq', (select max(id) from public.projects));
select setval('public.documents_id_seq', (select max(id) from public.documents));
select setval('public.tasks_id_seq', (select max(id) from public.tasks));
select setval('public.assignments_id_seq', (select max(id) from public.assignments));