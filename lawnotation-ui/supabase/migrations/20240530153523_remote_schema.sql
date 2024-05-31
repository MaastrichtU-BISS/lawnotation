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
on "public"."annotation_relations"
as permissive
for delete
to public
using (true);


create policy "Enable insert for authenticated users only"
on "public"."annotation_relations"
as permissive
for insert
to public
with check (true);


create policy "Enable read access for all users"
on "public"."annotation_relations"
as permissive
for select
to public
using (true);


create policy "Enable update for users based on email"
on "public"."annotation_relations"
as permissive
for update
to public
using (true)
with check (true);


create policy "Allow Post to everyone"
on "public"."annotations"
as permissive
for insert
to public
with check (true);


create policy "Allow update to everyone"
on "public"."annotations"
as permissive
for update
to public
using (true)
with check (true);


create policy "Enable delete for users for everone (TODO)"
on "public"."annotations"
as permissive
for delete
to public
using (true);


create policy "Enable read access for all users"
on "public"."annotations"
as permissive
for select
to public
using (true);


create policy "Enable delete for users based on user_id"
on "public"."assignments"
as permissive
for delete
to public
using (true);


create policy "Enable insert for authenticated users only"
on "public"."assignments"
as permissive
for insert
to public
with check (true);


create policy "Enable read access for all users"
on "public"."assignments"
as permissive
for select
to public
using (true);


create policy "Enable update for users based on email"
on "public"."assignments"
as permissive
for update
to public
using (true)
with check (true);


create policy "Enable delete for users based on user_id"
on "public"."documents"
as permissive
for delete
to public
using (true);


create policy "Enable insert for authenticated users only"
on "public"."documents"
as permissive
for insert
to public
with check (true);


create policy "Enable read access for all users"
on "public"."documents"
as permissive
for select
to public
using (true);


create policy "Enable delete for users based on user_id"
on "public"."labelsets"
as permissive
for delete
to public
using ((auth.uid() = editor_id));


create policy "Enable insert for authenticated users only"
on "public"."labelsets"
as permissive
for insert
to public
with check (true);


create policy "Enable read access for all users"
on "public"."labelsets"
as permissive
for select
to public
using (true);


create policy "Enable update for users based on email"
on "public"."labelsets"
as permissive
for update
to public
using ((auth.uid() = editor_id))
with check ((auth.uid() = editor_id));


create policy "Enable delete for users based on user_id"
on "public"."projects"
as permissive
for delete
to public
using (true);


create policy "Enable read access for all users"
on "public"."projects"
as permissive
for select
to public
using (true);


create policy "allow everyone to create project "
on "public"."projects"
as permissive
for insert
to public
with check (true);


create policy "Enable delete for users based on user_id"
on "public"."publications"
as permissive
for delete
to public
using (true);


create policy "Enable insert for everyone"
on "public"."publications"
as permissive
for insert
to public
with check (true);


create policy "Enable read access for all users"
on "public"."publications"
as permissive
for select
to public
using (true);


create policy "Enable update for users based on email"
on "public"."publications"
as permissive
for update
to public
using (true)
with check (true);


create policy "Enable delete for users based on user_id"
on "public"."tasks"
as permissive
for delete
to public
using (true);


create policy "Enable insert for authenticated users only"
on "public"."tasks"
as permissive
for insert
to public
with check (true);


create policy "Enable read access for all users"
on "public"."tasks"
as permissive
for select
to public
using (true);


create policy "Enable update for users based on email"
on "public"."tasks"
as permissive
for update
to public
using (true)
with check (true);


create policy "Enable read access for all users"
on "public"."users"
as permissive
for select
to public
using (true);


create policy "Users can update own profile."
on "public"."users"
as permissive
for update
to public
using (true);



