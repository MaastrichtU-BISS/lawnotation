-- Development seed for a database built from db/migrations (never run it in
-- production). Two users, two labelsets, one project with a span task and a
-- hybrid task, documents, assignments, annotations and relations.
-- Sign in as one of the users by signing in with that email through Keycloak:
-- the first sign-in links the Keycloak account to the row below.

insert into public.users (id, email, role) values
  ('24a9b347-2170-41d4-a0e8-6078a9a0bef1', 'annotator@example.com', 'annotator'),
  ('24a9b347-2170-41d4-a0e8-6078a9a0bef2', 'editor@example.com', 'editor');

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

insert into public.labelsets (id, name, "desc", labels, editor_id, relation_labels)
  overriding system value values
  (100, 'Document tags', 'Tags for whole documents', '[{"name":"Relevant","color":"#3b82f6"},{"name":"Irrelevant","color":"#ef4444"}]', '24a9b347-2170-41d4-a0e8-6078a9a0bef2', '{Cites,Overrules}');

insert into public.projects (id, name, "desc", editor_id) overriding system value values
  (1, 'Seeded project', 'A project to develop against', '24a9b347-2170-41d4-a0e8-6078a9a0bef2');

insert into public.documents (id, project_id, name, source, full_text) overriding system value values
  (1, 1, 'ruling-1.txt', 'local', 'The court finds that the contract is void. The appeal is dismissed.'),
  (2, 1, 'ruling-2.txt', 'local', 'The tenant must pay the rent. The landlord may terminate the lease.'),
  (3, 1, 'ruling-3.txt', 'local', 'This ruling overrules the earlier ruling of 2019.');

insert into public.tasks (id, project_id, name, "desc", labelset_id, ann_guidelines, annotation_level, document_labelset_id) overriding system value values
  (1, 1, 'Span task', 'Mark obligations', 1, 'Mark every obligation.', 'word', null),
  (2, 1, 'Hybrid task', 'Spans and document tags', 1, null, 'sentence', 100);

insert into public.assignments (id, annotator_id, task_id, document_id, status, seq_pos, annotator_number, origin, confidence_rating) overriding system value values
  (1, '24a9b347-2170-41d4-a0e8-6078a9a0bef1', 1, 1, 'done', 1, 1, 'manual', 4),
  (2, '24a9b347-2170-41d4-a0e8-6078a9a0bef1', 1, 2, 'pending', 2, 1, 'manual', null),
  (3, '24a9b347-2170-41d4-a0e8-6078a9a0bef2', 1, 1, 'done', 1, 2, 'manual', 5),
  (4, '24a9b347-2170-41d4-a0e8-6078a9a0bef2', 1, 2, 'done', 2, 2, 'manual', 3),
  (5, '24a9b347-2170-41d4-a0e8-6078a9a0bef1', 2, 1, 'done', 1, 1, 'manual', 4),
  (6, '24a9b347-2170-41d4-a0e8-6078a9a0bef1', 2, 3, 'pending', 2, 1, 'manual', null);

insert into public.annotations (id, label, assignment_id, start_index, end_index, text, origin, confidence_rating, kind) overriding system value values
  (1, 'Label1', 1, 4, 9, 'court', 'manual', 4, 'span'),
  (2, 'Label1', 1, 26, 34, 'contract', 'manual', 3, 'span'),
  (3, 'Label1', 3, 4, 9, 'court', 'manual', 5, 'span'),
  (4, 'Label1', 4, 11, 15, 'must', 'manual', 4, 'span'),
  (5, 'Label1', 5, 0, 42, 'The court finds that the contract is void.', 'manual', 4, 'span'),
  (6, 'Relevant', 5, -1, -1, '', 'manual', 5, 'document');

insert into public.annotation_relations (id, from_id, to_id, direction, labels) overriding system value values
  (1, 1, 2, 'right', '{"Has a"}');

insert into public.document_relations (id, from_assignment_id, to_assignment_id, labels) overriding system value values
  (1, 5, 6, '{Cites}');

-- Move every id sequence past the ids used above.
do $$
declare t text;
begin
  foreach t in array array['labelsets','projects','documents','tasks','assignments','annotations','annotation_relations','document_relations','ml_models','publications'] loop
    execute format('select setval(pg_get_serial_sequence(%L, ''id''), greatest((select coalesce(max(id), 0) from public.%I), 1))', 'public.' || t, t);
  end loop;
end $$;
