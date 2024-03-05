CREATE INDEX annotation_relations_from_id ON public.annotation_relations USING btree (from_id);

CREATE INDEX annotation_relations_to_id ON public.annotation_relations USING btree (to_id);

CREATE INDEX annotations_assignment_id ON public.annotations USING btree (assignment_id);

CREATE INDEX assignments_task_id ON public.assignments USING btree (task_id);

CREATE INDEX publications_task_name_labels_name_author_contact_task_desc_idx ON public.publications USING btree (task_name, labels_name, author, contact, task_description, labels_description);

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

create policy "Enable delete for users based on user_id"
on "public"."publications"
as permissive
for delete
to public
using (true);


create policy "Enable update for users based on email"
on "public"."publications"
as permissive
for update
to public
using (true)
with check (true);



