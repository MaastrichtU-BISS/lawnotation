alter table "public"."publications" add column "annotations" bigint;

alter table "public"."publications" add column "annotators" bigint;

alter table "public"."publications" add column "assignments" bigint;

alter table "public"."publications" add column "documents" bigint;

alter table "public"."publications" add column "guidelines_url" text;

alter table "public"."publications" add column "labels_description" text;

alter table "public"."publications" add column "relations" bigint;

alter table "public"."publications" add column "task_description" text;

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.get_unannotated_documents(task_id_param bigint)
 RETURNS TABLE(document_id bigint)
 LANGUAGE plpgsql
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  insert into public.users (id, email)
  values (new.id, new.email);
  return new;
end;
$function$
;


