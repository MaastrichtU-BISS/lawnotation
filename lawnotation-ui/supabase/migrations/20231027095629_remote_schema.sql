alter table "public"."users" drop constraint "users_id_fkey";

alter table "public"."users" alter column "role" drop default;

alter type "public"."user_roles" rename to "user_roles__old_version_to_be_dropped";

create type "public"."user_roles" as enum ('editor', 'annotator', 'admin');

alter table "public"."users" alter column role type "public"."user_roles" using role::text::"public"."user_roles";

alter table "public"."users" alter column "role" set default 'annotator'::user_roles;

drop type "public"."user_roles__old_version_to_be_dropped";

alter table "public"."projects" disable row level security;

alter table "public"."users" alter column "role" set default 'editor'::user_roles;

alter table "public"."users" add constraint "users_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) not valid;

alter table "public"."users" validate constraint "users_id_fkey";

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


