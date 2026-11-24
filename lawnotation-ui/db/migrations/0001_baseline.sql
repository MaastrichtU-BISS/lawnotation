-- Baseline: the public schema as left by lawnotation-ui/supabase/migrations up to
-- 20261119100000_metrics_annotation_rows.sql, without Supabase specifics:
--  * no auth schema: users.id no longer references auth.users, and
--    projects/labelsets.editor_id reference public.users instead;
--  * no handle_new_user() trigger (the app creates users rows at first sign-in);
--  * no row level security switches (there were no policies; the server is the
--    only client and authorizes every request itself).
-- Table, column and type names are unchanged, so a data-only dump of the
-- production public schema restores into it.

-- Function bodies refer to tables created further down.
SET check_function_bodies = false;

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS tsm_system_rows WITH SCHEMA public;


--
-- Name: annotation_level; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.annotation_level AS ENUM (
    'word',
    'document',
    'symbol',
    'sentence',
    'paragraph'
);

--
-- Name: assignment_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.assignment_status AS ENUM (
    'pending',
    'done',
    'predicting',
    'pre-annotated',
    'failed'
);

--
-- Name: origins; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.origins AS ENUM (
    'manual',
    'imported',
    'model'
);

--
-- Name: publication_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.publication_status AS ENUM (
    'published',
    'unpublished'
);

--
-- Name: relation_directions; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.relation_directions AS ENUM (
    'bi',
    'left',
    'right'
);

--
-- Name: relation_labels; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.relation_labels AS ENUM (
    'Is a',
    'Has a',
    'Belongs to',
    'Implies',
    'Depends on',
    'Related to',
    'Is not',
    'Part of'
);

--
-- Name: user_roles; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.user_roles AS ENUM (
    'editor',
    'annotator',
    'admin'
);

--
-- Name: tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tasks (
    id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    project_id bigint,
    name text DEFAULT ''::text,
    "desc" text DEFAULT ''::text,
    labelset_id bigint,
    ann_guidelines text,
    annotation_level public.annotation_level DEFAULT 'word'::public.annotation_level,
    ml_model_id bigint,
    origin_task_1_id bigint,
    origin_task_2_id bigint,
    document_labelset_id bigint,
    CONSTRAINT tasks_document_labelset_needs_span_level CHECK (((document_labelset_id IS NULL) OR ((annotation_level)::text <> 'document'::text)))
);

--
-- Name: get_all_annotator_tasks(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_all_annotator_tasks(a_id uuid) RETURNS SETOF public.tasks
    LANGUAGE sql
    AS $$
  SELECT * 
  FROM tasks 
  WHERE id IN (
    SELECT task_id 
    FROM assignments 
    WHERE annotator_id = a_id
    GROUP BY task_id
  )
$$;

--
-- Name: get_all_annotators_from_task(numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_all_annotators_from_task(t_id numeric) RETURNS TABLE(id uuid, email text, role public.user_roles, annotator_number integer)
    LANGUAGE sql
    AS $$
  SELECT u.*, a.annotator_number
  FROM tasks as t
  INNER JOIN assignments as a
  ON (t.id = a.task_id and t.id = t_id)
  LEFT JOIN users as u
  ON (a.annotator_id = u.id)
  GROUP BY u.id, a.annotator_number
  ORDER BY annotator_number
$$;

--
-- Name: documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.documents (
    id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    project_id bigint,
    name text,
    source text,
    full_text text,
    hash character(40)
);

--
-- Name: get_all_docs_from_task(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_all_docs_from_task(t_id integer) RETURNS SETOF public.documents
    LANGUAGE sql
    AS $$
  SELECT DISTINCT d.*
  FROM documents as d
  INNER JOIN assignments as a ON (a.document_id = d.id)
  WHERE a.task_id = t_id
  GROUP BY d.id
  ORDER BY d.id
$$;

--
-- Name: get_all_docs_from_task_mini(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_all_docs_from_task_mini(t_id integer) RETURNS TABLE(id bigint, hash text)
    LANGUAGE sql
    AS $$
  SELECT DISTINCT d.id, d.hash
  FROM documents as d
  INNER JOIN assignments as a ON (a.document_id = d.id)
  WHERE a.task_id = t_id
  GROUP BY d.id
  ORDER BY d.id
$$;

--
-- Name: get_all_shared_docs_from_task(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_all_shared_docs_from_task(t_id integer) RETURNS SETOF public.documents
    LANGUAGE sql
    AS $$
  SELECT d.*
  FROM documents as d
  INNER JOIN assignments as a ON (a.document_id = d.id)
  WHERE a.task_id = t_id
  GROUP BY d.id
  HAVING count(d.*) > 1
  ORDER BY d.id
$$;

--
-- Name: get_all_shared_docs_from_task_intra(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_all_shared_docs_from_task_intra(t_id integer) RETURNS SETOF public.documents
    LANGUAGE sql
    AS $$
  SELECT d.*
  FROM documents as d
  INNER JOIN assignments as a ON (a.document_id = d.id)
  WHERE a.task_id = t_id
  GROUP BY d.id
  HAVING count(d.*) > 1 AND count(DISTINCT a.original_task_id) > 1
  ORDER BY d.id
$$;

--
-- Name: get_completion_by_annotator(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_completion_by_annotator(a_id uuid) RETURNS TABLE(status public.assignment_status, count integer)
    LANGUAGE sql
    AS $$
  SELECT a.status, count(a.status)
  FROM assignments as a
  WHERE a.annotator_id = a_id
  GROUP BY a.status
  ORDER BY a.status desc
$$;

--
-- Name: get_completion_by_editor(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_completion_by_editor(e_id uuid) RETURNS TABLE(status public.assignment_status, count integer)
    LANGUAGE sql
    AS $$
  SELECT a.status, count(a.status)
  FROM assignments as a
  INNER JOIN tasks as t ON(t.id = a.task_id)
  INNER JOIN projects as p ON(t.project_id = p.id)
  WHERE p.editor_id = e_id
  GROUP BY a.status
  ORDER BY a.status desc
$$;

--
-- Name: get_confidences_by_editor(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_confidences_by_editor(e_id uuid) RETURNS TABLE(confidence integer, count integer)
    LANGUAGE sql
    AS $$
  SELECT a.confidence_rating::int, count(a.confidence_rating)::int
  FROM assignments as a
  INNER JOIN tasks as t ON(t.id = a.task_id)
  INNER JOIN projects as p ON(t.project_id = p.id)
  WHERE p.editor_id = e_id
  GROUP BY a.confidence_rating
  ORDER BY a.confidence_rating
$$;

--
-- Name: get_count_assignments(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_count_assignments(e_id uuid) RETURNS numeric
    LANGUAGE sql
    AS $$
  SELECT count(*)
  FROM assignments as a
  INNER JOIN tasks as t ON (a.task_id = t.id)
  INNER JOIN projects as p ON (t.project_id = p.id)
  WHERE p.editor_id = e_id
$$;

--
-- Name: get_count_tasks(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_count_tasks(e_id uuid) RETURNS numeric
    LANGUAGE sql
    AS $$
  SELECT count(*)
  FROM tasks as t
  INNER JOIN projects as p ON (t.project_id = p.id)
  WHERE p.editor_id = e_id
$$;

--
-- Name: get_unannotated_documents(bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_unannotated_documents(task_id_param bigint) RETURNS TABLE(document_id bigint)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT a.document_id
    FROM assignments a
    JOIN tasks t ON a.task_id = t.id
    WHERE t.id = task_id_param
    AND NOT EXISTS (
        SELECT 1
        FROM annotations an
        WHERE an.assignment_id = a.id
    );
END;
$$;

--
-- Name: assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assignments (
    id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    annotator_id uuid,
    task_id bigint,
    document_id bigint,
    status public.assignment_status DEFAULT 'pending'::public.assignment_status,
    seq_pos bigint,
    confidence_rating bigint DEFAULT '0'::bigint,
    annotator_number bigint DEFAULT '0'::bigint NOT NULL,
    origin public.origins DEFAULT 'manual'::public.origins,
    original_task_id bigint
);

--
-- Name: next_random_assignment(uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.next_random_assignment(a_id uuid, t_id integer) RETURNS SETOF public.assignments
    LANGUAGE sql
    AS $$
  SELECT * 
  FROM assignments 
  WHERE assignments.annotator_id = a_id AND assignments.task_id = t_id AND assignments.status = 'pending'
  ORDER BY assignments.seq_pos
  LIMIT 1
$$;

--
-- Name: random_sample(integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.random_sample(n integer, pid integer) RETURNS SETOF integer
    LANGUAGE sql
    AS $$
  SELECT id 
  FROM documents
  WHERE project_id = pid
  ORDER BY Random()
  LIMIT N
$$;

--
-- Name: set_document_hash(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_document_hash() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.hash := encode(digest(NEW.full_text, 'sha1'), 'hex');
    RETURN NEW;
END;
$$;

--
-- Name: annotation_relations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.annotation_relations (
    id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    from_id bigint,
    to_id bigint,
    direction public.relation_directions,
    labels text[]
);

--
-- Name: annotation_relations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.annotation_relations ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.annotation_relations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

--
-- Name: annotations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.annotations (
    id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    label text,
    assignment_id bigint,
    start_index bigint,
    end_index bigint,
    text text,
    origin public.origins DEFAULT 'manual'::public.origins,
    confidence_rating bigint DEFAULT '0'::bigint NOT NULL,
    metadata text,
    kind text DEFAULT 'span'::text NOT NULL,
    CONSTRAINT annotations_kind_check CHECK ((kind = ANY (ARRAY['span'::text, 'document'::text])))
);

--
-- Name: annotations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.annotations ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.annotations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

--
-- Name: assignments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.assignments ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.assignments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

--
-- Name: document_relations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.document_relations (
    id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    from_assignment_id bigint NOT NULL,
    to_assignment_id bigint NOT NULL,
    labels text[] DEFAULT '{}'::text[] NOT NULL,
    CONSTRAINT document_relations_not_self CHECK ((from_assignment_id <> to_assignment_id))
);

--
-- Name: document_relations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.document_relations ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.document_relations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

--
-- Name: documents_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.documents ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.documents_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

--
-- Name: labelsets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.labelsets (
    id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    name text DEFAULT ''::text,
    "desc" text DEFAULT ''::text,
    labels jsonb,
    editor_id uuid,
    relation_labels text[]
);

--
-- Name: labels_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.labelsets ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.labels_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid NOT NULL,
    email text,
    role public.user_roles DEFAULT 'editor'::public.user_roles
);

--
-- Name: metrics_annotation_rows; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.metrics_annotation_rows WITH (security_invoker='true') AS
 SELECT n.id,
    n.start_index,
    n.end_index,
    n.label,
    n.text,
    n.confidence_rating,
    n.metadata,
    n.kind,
    a.task_id,
    a.document_id,
    a.original_task_id,
    u.email AS annotator_email
   FROM ((public.annotations n
     JOIN public.assignments a ON ((a.id = n.assignment_id)))
     JOIN public.users u ON ((u.id = a.annotator_id)));

--
-- Name: ml_models; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ml_models (
    id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    name text,
    type text,
    annotation_level public.annotation_level,
    labelset_id bigint
);

--
-- Name: ml_models_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.ml_models ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.ml_models_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

--
-- Name: projects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.projects (
    id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    name text DEFAULT ''::text,
    "desc" text DEFAULT ''::text,
    editor_id uuid
);

--
-- Name: projects_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.projects ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.projects_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

--
-- Name: publications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.publications (
    id bigint NOT NULL,
    editor_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    file_url text,
    task_name text,
    labels_name text,
    author text,
    contact text,
    status public.publication_status,
    annotations bigint,
    annotators bigint,
    assignments bigint,
    documents bigint,
    guidelines_url text,
    labels_description text,
    relations bigint,
    task_description text
);

--
-- Name: publications_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.publications ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.publications_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

--
-- Name: tasks_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.tasks ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.tasks_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

--
-- Name: annotation_relations annotation_relations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.annotation_relations
    ADD CONSTRAINT annotation_relations_pkey PRIMARY KEY (id);

--
-- Name: annotations annotations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.annotations
    ADD CONSTRAINT annotations_pkey PRIMARY KEY (id);

--
-- Name: annotations annotations_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.annotations
    ADD CONSTRAINT annotations_unique UNIQUE (assignment_id, label, start_index, end_index);

--
-- Name: assignments assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignments
    ADD CONSTRAINT assignments_pkey PRIMARY KEY (id);

--
-- Name: document_relations document_relations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_relations
    ADD CONSTRAINT document_relations_pkey PRIMARY KEY (id);

--
-- Name: document_relations document_relations_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_relations
    ADD CONSTRAINT document_relations_unique UNIQUE (from_assignment_id, to_assignment_id);

--
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);

--
-- Name: labelsets labels_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.labelsets
    ADD CONSTRAINT labels_pkey PRIMARY KEY (id);

--
-- Name: ml_models ml_models_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ml_models
    ADD CONSTRAINT ml_models_pkey PRIMARY KEY (id);

--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);

--
-- Name: publications publications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.publications
    ADD CONSTRAINT publications_pkey PRIMARY KEY (id);

--
-- Name: tasks tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_pkey PRIMARY KEY (id);

--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);

--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);

--
-- Name: annotation_relations_from_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX annotation_relations_from_id ON public.annotation_relations USING btree (from_id);

--
-- Name: annotation_relations_to_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX annotation_relations_to_id ON public.annotation_relations USING btree (to_id);

--
-- Name: annotations_assignment_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX annotations_assignment_id ON public.annotations USING btree (assignment_id);

--
-- Name: annotations_assignment_id_kind; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX annotations_assignment_id_kind ON public.annotations USING btree (assignment_id, kind);

--
-- Name: annotations_id_label_assignment_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX annotations_id_label_assignment_id_idx ON public.annotations USING btree (id, label, assignment_id);

--
-- Name: assignments_id_annotator_id_task_id_document_id_status_seq__idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX assignments_id_annotator_id_task_id_document_id_status_seq__idx ON public.assignments USING btree (id, annotator_id, task_id, document_id, status, seq_pos);

--
-- Name: assignments_task_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX assignments_task_id ON public.assignments USING btree (task_id);

--
-- Name: assignments_temp_annotator_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX assignments_temp_annotator_idx ON public.assignments USING btree (annotator_number);

--
-- Name: document_relations_to_assignment_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX document_relations_to_assignment_id ON public.document_relations USING btree (to_assignment_id);

--
-- Name: documents_id_project_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX documents_id_project_id_idx ON public.documents USING btree (id, project_id);

--
-- Name: publications_editor_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX publications_editor_id_idx ON public.publications USING btree (editor_id);

--
-- Name: publications_task_name_labels_name_author_contact_task_desc_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX publications_task_name_labels_name_author_contact_task_desc_idx ON public.publications USING btree (task_name, labels_name, author, contact, task_description, labels_description);

--
-- Name: tasks_id_project_id_labelset_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tasks_id_project_id_labelset_id_idx ON public.tasks USING btree (id, project_id, labelset_id);

--
-- Name: documents set_document_hash_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_document_hash_trigger BEFORE INSERT OR UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.set_document_hash();

--
-- Name: annotation_relations annotation_relations_from_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.annotation_relations
    ADD CONSTRAINT annotation_relations_from_id_fkey FOREIGN KEY (from_id) REFERENCES public.annotations(id) ON DELETE CASCADE;

--
-- Name: annotation_relations annotation_relations_to_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.annotation_relations
    ADD CONSTRAINT annotation_relations_to_id_fkey FOREIGN KEY (to_id) REFERENCES public.annotations(id) ON DELETE CASCADE;

--
-- Name: annotations annotations_assignment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.annotations
    ADD CONSTRAINT annotations_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES public.assignments(id) ON DELETE CASCADE;

--
-- Name: assignments assignments_annotator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignments
    ADD CONSTRAINT assignments_annotator_id_fkey FOREIGN KEY (annotator_id) REFERENCES public.users(id) ON DELETE CASCADE;

--
-- Name: assignments assignments_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignments
    ADD CONSTRAINT assignments_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE CASCADE;

--
-- Name: assignments assignments_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignments
    ADD CONSTRAINT assignments_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;

--
-- Name: document_relations document_relations_from_assignment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_relations
    ADD CONSTRAINT document_relations_from_assignment_id_fkey FOREIGN KEY (from_assignment_id) REFERENCES public.assignments(id) ON DELETE CASCADE;

--
-- Name: document_relations document_relations_to_assignment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_relations
    ADD CONSTRAINT document_relations_to_assignment_id_fkey FOREIGN KEY (to_assignment_id) REFERENCES public.assignments(id) ON DELETE CASCADE;

--
-- Name: documents documents_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

--
-- Name: labelsets labelsets_editor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.labelsets
    ADD CONSTRAINT labelsets_editor_id_fkey FOREIGN KEY (editor_id) REFERENCES public.users(id) ON DELETE CASCADE;

--
-- Name: projects projects_editor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_editor_id_fkey FOREIGN KEY (editor_id) REFERENCES public.users(id);

--
-- Name: ml_models public_ml_models_labelset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ml_models
    ADD CONSTRAINT public_ml_models_labelset_id_fkey FOREIGN KEY (labelset_id) REFERENCES public.labelsets(id);

--
-- Name: tasks public_tasks_ml_model_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT public_tasks_ml_model_id_fkey FOREIGN KEY (ml_model_id) REFERENCES public.ml_models(id);

--
-- Name: publications publications_editor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.publications
    ADD CONSTRAINT publications_editor_id_fkey FOREIGN KEY (editor_id) REFERENCES public.users(id);

--
-- Name: tasks tasks_document_labelset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_document_labelset_id_fkey FOREIGN KEY (document_labelset_id) REFERENCES public.labelsets(id) ON DELETE CASCADE;

--
-- Name: tasks tasks_labelset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_labelset_id_fkey FOREIGN KEY (labelset_id) REFERENCES public.labelsets(id) ON DELETE CASCADE;

--
-- Name: tasks tasks_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

--
-- PostgreSQL database dump complete
--

