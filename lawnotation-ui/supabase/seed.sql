-- CREATE OR REPLACE FUNCTION public.get_user_id(_email text)
-- RETURNS uuid
-- AS $$
-- DECLARE
--     user_id uuid;
-- BEGIN
--     SELECT id INTO user_id 
--     FROM auth.users
--     WHERE email = email
--     LIMIT 1;
    
--     RETURN user_id;
-- END;
-- $$ LANGUAGE plpgsql;


-- CREATE OR REPLACE FUNCTION get_id_by_name(input_name text, table_name text)
-- RETURNS integer AS
-- $$
-- DECLARE
--     result_id integer;
-- BEGIN
--     EXECUTE format('SELECT id FROM %I WHERE name = $1', table_name)
--     INTO result_id
--     USING input_name;
    
--     RETURN result_id;
-- EXCEPTION
--     WHEN NO_DATA_FOUND THEN
--         RETURN NULL; -- Return NULL if no matching record is found
-- END;
-- $$
-- LANGUAGE plpgsql;

--
-- 1. User Accounts
--

-- admin@example.com:AdminExample
-- user1@example.com:User1Example
-- user2@example.com:User2Example

INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, invited_at, confirmation_token, confirmation_sent_at, recovery_token, recovery_sent_at, email_change_token_new, email_change, email_change_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at, phone, phone_confirmed_at, phone_change, phone_change_token, phone_change_sent_at, email_change_token_current, email_change_confirm_status, banned_until, reauthentication_token, reauthentication_sent_at, is_sso_user, deleted_at) VALUES
  ('00000000-0000-0000-0000-000000000000', '9ba1d976-9ad7-40ac-9cfd-c567487b0a40', 'supabase_admin', 'supabase_admin', 'admin@example.com', '$2a$10$PSWt6RTz0nZ8VPQ2e6bzXOw4M1IWyfm7eHUb7AAGhnJasXh/sogb2', '2023-08-29 13:00:22.045528+00', NULL, '', NULL, '', NULL, '', '', NULL, NULL, '{"provider": "email", "providers": ["email"]}', '{}', NULL, '2023-08-29 13:00:22.007969+00', '2023-08-29 13:00:22.045916+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL),
  ('00000000-0000-0000-0000-000000000000', 'add8446f-6310-4ffb-9ec4-cfe8e20eab44', 'authenticated', 'authenticated', 'user1@example.com', '$2a$10$7vUYXiLButhFjq4T2yQKpeoghQ4yvTJmav1qdy3XFhDalf7al4pwq', '2023-08-29 13:01:06.735919+00', NULL, '', NULL, '', NULL, '', '', NULL, NULL, '{"provider": "email", "providers": ["email"]}', '{}', NULL, '2023-08-29 13:01:06.721326+00', '2023-08-29 13:01:06.736573+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL),
  ('00000000-0000-0000-0000-000000000000', 'bec54be5-7e8a-4d77-8246-8ccd15bade6f', 'authenticated', 'authenticated', 'user2@example.com', '$2a$10$VdcKPsjwUdcA0svGyJu8deMDNgFwiCtg62dREV8IutKE2uu0Y08FS', '2023-08-29 13:01:34.184133+00', NULL, '', NULL, '', NULL, '', '', NULL, NULL, '{"provider": "email", "providers": ["email"]}', '{}', NULL, '2023-08-29 13:01:34.174743+00', '2023-08-29 13:01:34.184472+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL);

INSERT INTO auth.identities (id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at) VALUES 
  ('9ba1d976-9ad7-40ac-9cfd-c567487b0a40', '9ba1d976-9ad7-40ac-9cfd-c567487b0a40', '{"sub": "9ba1d976-9ad7-40ac-9cfd-c567487b0a40", "email": "admin@example.com"}', 'email', '2023-08-29 13:00:22.030109+00', '2023-08-29 13:00:22.030232+00', '2023-08-29 13:00:22.030232+00'),
  ('add8446f-6310-4ffb-9ec4-cfe8e20eab44', 'add8446f-6310-4ffb-9ec4-cfe8e20eab44', '{"sub": "add8446f-6310-4ffb-9ec4-cfe8e20eab44", "email": "user1@example.com"}', 'email', '2023-08-29 13:01:06.726703+00', '2023-08-29 13:01:06.726966+00', '2023-08-29 13:01:06.726966+00'),
  ('bec54be5-7e8a-4d77-8246-8ccd15bade6f', 'bec54be5-7e8a-4d77-8246-8ccd15bade6f', '{"sub": "bec54be5-7e8a-4d77-8246-8ccd15bade6f", "email": "user2@example.com"}', 'email', '2023-08-29 13:01:34.178973+00', '2023-08-29 13:01:34.179053+00', '2023-08-29 13:01:34.179053+00');

INSERT INTO public.users (id, email, role) VALUES
  ('9ba1d976-9ad7-40ac-9cfd-c567487b0a40', 'admin@example.com', 'editor'), -- TODO -> create role admin (or remove this role and use postgres roles)
  ('add8446f-6310-4ffb-9ec4-cfe8e20eab44', 'user1@example.com', 'editor'),
  ('bec54be5-7e8a-4d77-8246-8ccd15bade6f', 'user2@example.com', 'annotator');

--
-- 2. Data
--

INSERT INTO public.projects ("editor_id", "name") VALUES 
  ('add8446f-6310-4ffb-9ec4-cfe8e20eab44', 'Test Project One'),
  ('add8446f-6310-4ffb-9ec4-cfe8e20eab44', 'Test Project Two [empty]');

INSERT INTO public.labelsets ("editor_id", "name", "desc", "labels") VALUES 
  ('add8446f-6310-4ffb-9ec4-cfe8e20eab44', 'IF-THEN + Exceptions', 'Labels for IF-THEN statements and exceptions', '[{"name":"IF THEN","color":"#c0c0c0"},{"name":"IF","color":"#ace4e1"},{"name":"THEN","color":"#7874b0"},{"name":"Exception text","color":"#804040"},{"name":"Text that exception applies to","color":"#ff8040"}]');

INSERT INTO public.documents ("project_id", "name", "source", "full_text") VALUES
  (1, 'article_1.txt', 'local_upload', 'Reinforcement Learning\nAt first, the agent will play random moves, saving the states and the given reward in a limited queue (replay memory). At the end of each episode (game), the agent will train itself (using a neural network) with a random sample of the replay memory. As more and more games are played, the agent becomes smarter, achieving higher and higher scores.'),
  (1, 'article_2.txt', 'local_upload', 'The training is based on the Q Learning algorithm. Instead of using just the current state and reward obtained to train the network, it is used Q Learning (that considers the transition from the current state to the future one) to find out what is the best possible score of all the given states considering the future rewards, i.e., the algorithm is not greedy. This allows for the agent to take some moves that might not give an immediate reward, so it can get a bigger one later on (e.g. waiting to clear multiple lines instead of a single one).');

INSERT INTO public.tasks ("project_id", "name", "desc", "labelset_id", "ann_guidelines") VALUES
  (1, 'IF-THEN and Exceptions', 'Description of the IF-THEN and Exceptions Task', 1, 'Guidelines');

INSERT INTO public.assignments ("annotator_id", "task_id", "document_id", "status", "seq_pos") VALUES
  ('bec54be5-7e8a-4d77-8246-8ccd15bade6f', 1, 1, 'done', 1),
  ('bec54be5-7e8a-4d77-8246-8ccd15bade6f', 1, 2, 'pending', 2);

INSERT INTO public.annotations ("label", "assignment_id", "start_index", "end_index", "text", "origin", "ls_id") VALUES
  ('IF THEN', 1, 0, 22, 'Reinforcement Learning', 'manual', '123456'),
  ('THEN', 1, 33, 42, 'the agent', 'manual', '234567');

INSERT INTO public.annotation_relations ("from_id", "to_id", "direction", "labels", "ls_to", "ls_from") VALUES
  (1, 2, 'right', ARRAY[]::relation_labels[], '123456', '234567');