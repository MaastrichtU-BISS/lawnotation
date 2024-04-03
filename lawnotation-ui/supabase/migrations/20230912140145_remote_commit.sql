
SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

CREATE EXTENSION IF NOT EXISTS "pgsodium" WITH SCHEMA "pgsodium";

CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";

CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";

CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";

CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";

CREATE EXTENSION IF NOT EXISTS "tsm_system_rows" WITH SCHEMA "public";

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";

CREATE TYPE "public"."assignment_status" AS ENUM (
    'pending',
    'done'
);

ALTER TYPE "public"."assignment_status" OWNER TO "postgres";

CREATE TYPE "public"."relation_directions" AS ENUM (
    'bi',
    'left',
    'right'
);

ALTER TYPE "public"."relation_directions" OWNER TO "postgres";

CREATE TYPE "public"."relation_labels" AS ENUM (
    'Is a',
    'Has a',
    'Belongs to',
    'Implies',
    'Depends on',
    'Related to',
    'Is not',
    'Part of'
);

ALTER TYPE "public"."relation_labels" OWNER TO "postgres";

CREATE TYPE "public"."user_roles" AS ENUM (
    'editor',
    'annotator'
);

ALTER TYPE "public"."user_roles" OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";

CREATE TABLE IF NOT EXISTS "public"."tasks" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "project_id" bigint,
    "name" "text" DEFAULT ''::"text",
    "desc" "text" DEFAULT ''::"text",
    "labelset_id" bigint,
    "ann_guidelines" "text"
);

ALTER TABLE "public"."tasks" OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."get_all_annotator_tasks"("a_id" "uuid") RETURNS SETOF "public"."tasks"
    LANGUAGE "sql"
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

ALTER FUNCTION "public"."get_all_annotator_tasks"("a_id" "uuid") OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."documents" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "project_id" bigint,
    "name" "text",
    "source" "text",
    "full_text" "text"
);

ALTER TABLE "public"."documents" OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."get_all_shared_docs_from_task"("t_id" integer) RETURNS SETOF "public"."documents"
    LANGUAGE "sql"
    AS $$
  SELECT d.*
  FROM documents as d
  INNER JOIN assignments as a ON (a.document_id = d.id)
  WHERE a.task_id = t_id
  GROUP BY d.id
  HAVING count(d.*) > 1
  ORDER BY d.id
$$;

ALTER FUNCTION "public"."get_all_shared_docs_from_task"("t_id" integer) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."get_completion_by_annotator"("a_id" "uuid") RETURNS TABLE("status" "public"."assignment_status", "count" integer)
    LANGUAGE "sql"
    AS $$
  SELECT a.status, count(a.status)
  FROM assignments as a
  WHERE a.annotator_id = a_id
  GROUP BY a.status
  ORDER BY a.status desc
$$;

ALTER FUNCTION "public"."get_completion_by_annotator"("a_id" "uuid") OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."get_completion_by_editor"("e_id" "uuid") RETURNS TABLE("status" "public"."assignment_status", "count" integer)
    LANGUAGE "sql"
    AS $$
  SELECT a.status, count(a.status)
  FROM assignments as a
  INNER JOIN tasks as t ON(t.id = a.task_id)
  INNER JOIN projects as p ON(t.project_id = p.id)
  WHERE p.editor_id = e_id
  GROUP BY a.status
  ORDER BY a.status desc
$$;

ALTER FUNCTION "public"."get_completion_by_editor"("e_id" "uuid") OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."get_count_assignments"("e_id" "uuid") RETURNS numeric
    LANGUAGE "sql"
    AS $$
  SELECT count(*)
  FROM assignments as a
  INNER JOIN tasks as t ON (a.task_id = t.id)
  INNER JOIN projects as p ON (t.project_id = p.id)
  WHERE p.editor_id = e_id
$$;

ALTER FUNCTION "public"."get_count_assignments"("e_id" "uuid") OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."get_count_tasks"("e_id" "uuid") RETURNS numeric
    LANGUAGE "sql"
    AS $$
  SELECT count(*)
  FROM tasks as t
  INNER JOIN projects as p ON (t.project_id = p.id)
  WHERE p.editor_id = e_id
$$;

ALTER FUNCTION "public"."get_count_tasks"("e_id" "uuid") OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."get_difficulties_by_editor"("e_id" "uuid") RETURNS TABLE("difficulty" integer, "count" integer)
    LANGUAGE "sql"
    AS $$
  SELECT a.difficulty_rating, count(a.difficulty_rating)
  FROM assignments as a
  INNER JOIN tasks as t ON(t.id = a.task_id)
  INNER JOIN projects as p ON(t.project_id = p.id)
  WHERE p.editor_id = e_id
  GROUP BY a.difficulty_rating
  ORDER BY a.difficulty_rating
$$;

ALTER FUNCTION "public"."get_difficulties_by_editor"("e_id" "uuid") OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."get_unannotated_documents"("task_id_param" bigint) RETURNS TABLE("document_id" bigint)
    LANGUAGE "plpgsql"
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

ALTER FUNCTION "public"."get_unannotated_documents"("task_id_param" bigint) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  insert into public.users (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."assignments" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "annotator_id" "uuid",
    "task_id" bigint,
    "document_id" bigint,
    "status" "public"."assignment_status" DEFAULT 'pending'::"public"."assignment_status",
    "seq_pos" bigint,
    "difficulty_rating" bigint DEFAULT '0'::bigint
);

ALTER TABLE "public"."assignments" OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."next_random_assignment"("a_id" "uuid", "t_id" integer) RETURNS SETOF "public"."assignments"
    LANGUAGE "sql"
    AS $$
  SELECT * 
  FROM assignments 
  WHERE assignments.annotator_id = a_id AND assignments.task_id = t_id AND assignments.status = 'pending'
  ORDER BY assignments.seq_pos
  LIMIT 1
$$;

ALTER FUNCTION "public"."next_random_assignment"("a_id" "uuid", "t_id" integer) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."random_sample"("n" integer, "pid" integer) RETURNS SETOF integer
    LANGUAGE "sql"
    AS $$
  SELECT id 
  FROM documents
  WHERE project_id = pid
  ORDER BY Random()
  LIMIT N
$$;

ALTER FUNCTION "public"."random_sample"("n" integer, "pid" integer) OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."annotation_relations" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "from_id" bigint,
    "to_id" bigint,
    "direction" "public"."relation_directions",
    "labels" "public"."relation_labels"[],
    "ls_to" "text",
    "ls_from" "text"
);

ALTER TABLE "public"."annotation_relations" OWNER TO "postgres";

ALTER TABLE "public"."annotation_relations" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."annotation_relations_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE IF NOT EXISTS "public"."annotations" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "label" "text",
    "assignment_id" bigint,
    "start_index" bigint,
    "end_index" bigint,
    "text" "text",
    "origin" "text",
    "ls_id" "text"
);

ALTER TABLE "public"."annotations" OWNER TO "postgres";

ALTER TABLE "public"."annotations" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."annotations_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

ALTER TABLE "public"."assignments" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."assignments_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

ALTER TABLE "public"."documents" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."documents_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE IF NOT EXISTS "public"."labelsets" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "name" "text" DEFAULT ''::"text",
    "desc" "text" DEFAULT ''::"text",
    "labels" "jsonb",
    "editor_id" "uuid"
);

ALTER TABLE "public"."labelsets" OWNER TO "postgres";

ALTER TABLE "public"."labelsets" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."labels_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE IF NOT EXISTS "public"."projects" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "name" "text" DEFAULT ''::"text",
    "desc" "text" DEFAULT ''::"text",
    "editor_id" "uuid"
);

ALTER TABLE "public"."projects" OWNER TO "postgres";

ALTER TABLE "public"."projects" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."projects_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

ALTER TABLE "public"."tasks" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."tasks_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" NOT NULL,
    "email" "text",
    "role" "public"."user_roles" DEFAULT 'annotator'::"public"."user_roles"
);

ALTER TABLE "public"."users" OWNER TO "postgres";

ALTER TABLE ONLY "public"."annotation_relations"
    ADD CONSTRAINT "annotation_relations_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."annotations"
    ADD CONSTRAINT "annotations_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."annotations"
    ADD CONSTRAINT "annotations_unique" UNIQUE ("assignment_id", "label", "start_index", "end_index");

ALTER TABLE ONLY "public"."assignments"
    ADD CONSTRAINT "assignments_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."labelsets"
    ADD CONSTRAINT "labels_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");

ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");

CREATE INDEX "annotations_id_label_assignment_id_idx" ON "public"."annotations" USING "btree" ("id", "label", "assignment_id");

CREATE INDEX "assignments_id_annotator_id_task_id_document_id_status_seq__idx" ON "public"."assignments" USING "btree" ("id", "annotator_id", "task_id", "document_id", "status", "seq_pos");

CREATE INDEX "documents_id_project_id_idx" ON "public"."documents" USING "btree" ("id", "project_id");

CREATE INDEX "tasks_id_project_id_labelset_id_idx" ON "public"."tasks" USING "btree" ("id", "project_id", "labelset_id");

ALTER TABLE ONLY "public"."annotation_relations"
    ADD CONSTRAINT "annotation_relations_from_id_fkey" FOREIGN KEY ("from_id") REFERENCES "public"."annotations"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."annotation_relations"
    ADD CONSTRAINT "annotation_relations_to_id_fkey" FOREIGN KEY ("to_id") REFERENCES "public"."annotations"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."annotations"
    ADD CONSTRAINT "annotations_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "public"."assignments"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."assignments"
    ADD CONSTRAINT "assignments_annotator_id_fkey" FOREIGN KEY ("annotator_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."assignments"
    ADD CONSTRAINT "assignments_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."assignments"
    ADD CONSTRAINT "assignments_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."labelsets"
    ADD CONSTRAINT "labelsets_editor_id_fkey" FOREIGN KEY ("editor_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_editor_id_fkey" FOREIGN KEY ("editor_id") REFERENCES "auth"."users"("id");

ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_labelset_id_fkey" FOREIGN KEY ("labelset_id") REFERENCES "public"."labelsets"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

ALTER TABLE "public"."annotation_relations" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."annotations" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."assignments" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."documents" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."labelsets" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."projects" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."tasks" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

GRANT ALL ON TABLE "public"."tasks" TO "anon";
GRANT ALL ON TABLE "public"."tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."tasks" TO "service_role";

GRANT ALL ON FUNCTION "public"."get_all_annotator_tasks"("a_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_all_annotator_tasks"("a_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_all_annotator_tasks"("a_id" "uuid") TO "service_role";

GRANT ALL ON TABLE "public"."documents" TO "anon";
GRANT ALL ON TABLE "public"."documents" TO "authenticated";
GRANT ALL ON TABLE "public"."documents" TO "service_role";

GRANT ALL ON FUNCTION "public"."get_all_shared_docs_from_task"("t_id" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_all_shared_docs_from_task"("t_id" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_all_shared_docs_from_task"("t_id" integer) TO "service_role";

GRANT ALL ON FUNCTION "public"."get_completion_by_annotator"("a_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_completion_by_annotator"("a_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_completion_by_annotator"("a_id" "uuid") TO "service_role";

GRANT ALL ON FUNCTION "public"."get_completion_by_editor"("e_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_completion_by_editor"("e_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_completion_by_editor"("e_id" "uuid") TO "service_role";

GRANT ALL ON FUNCTION "public"."get_count_assignments"("e_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_count_assignments"("e_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_count_assignments"("e_id" "uuid") TO "service_role";

GRANT ALL ON FUNCTION "public"."get_count_tasks"("e_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_count_tasks"("e_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_count_tasks"("e_id" "uuid") TO "service_role";

GRANT ALL ON FUNCTION "public"."get_difficulties_by_editor"("e_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_difficulties_by_editor"("e_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_difficulties_by_editor"("e_id" "uuid") TO "service_role";

GRANT ALL ON FUNCTION "public"."get_unannotated_documents"("task_id_param" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."get_unannotated_documents"("task_id_param" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_unannotated_documents"("task_id_param" bigint) TO "service_role";

GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";

GRANT ALL ON TABLE "public"."assignments" TO "anon";
GRANT ALL ON TABLE "public"."assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."assignments" TO "service_role";

GRANT ALL ON FUNCTION "public"."next_random_assignment"("a_id" "uuid", "t_id" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."next_random_assignment"("a_id" "uuid", "t_id" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."next_random_assignment"("a_id" "uuid", "t_id" integer) TO "service_role";

GRANT ALL ON FUNCTION "public"."random_sample"("n" integer, "pid" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."random_sample"("n" integer, "pid" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."random_sample"("n" integer, "pid" integer) TO "service_role";

GRANT ALL ON FUNCTION "public"."system_rows"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."system_rows"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."system_rows"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."system_rows"("internal") TO "service_role";

GRANT ALL ON TABLE "public"."annotation_relations" TO "anon";
GRANT ALL ON TABLE "public"."annotation_relations" TO "authenticated";
GRANT ALL ON TABLE "public"."annotation_relations" TO "service_role";

GRANT ALL ON SEQUENCE "public"."annotation_relations_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."annotation_relations_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."annotation_relations_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."annotations" TO "anon";
GRANT ALL ON TABLE "public"."annotations" TO "authenticated";
GRANT ALL ON TABLE "public"."annotations" TO "service_role";

GRANT ALL ON SEQUENCE "public"."annotations_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."annotations_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."annotations_id_seq" TO "service_role";

GRANT ALL ON SEQUENCE "public"."assignments_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."assignments_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."assignments_id_seq" TO "service_role";

GRANT ALL ON SEQUENCE "public"."documents_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."documents_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."documents_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."labelsets" TO "anon";
GRANT ALL ON TABLE "public"."labelsets" TO "authenticated";
GRANT ALL ON TABLE "public"."labelsets" TO "service_role";

GRANT ALL ON SEQUENCE "public"."labels_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."labels_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."labels_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."projects" TO "anon";
GRANT ALL ON TABLE "public"."projects" TO "authenticated";
GRANT ALL ON TABLE "public"."projects" TO "service_role";

GRANT ALL ON SEQUENCE "public"."projects_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."projects_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."projects_id_seq" TO "service_role";

GRANT ALL ON SEQUENCE "public"."tasks_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."tasks_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."tasks_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";

RESET ALL;
