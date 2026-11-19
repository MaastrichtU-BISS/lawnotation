alter table "public"."assignments" rename column "difficulty_rating" to "confidence_rating";

drop function if exists "public"."get_difficulties_by_editor"("e_id" "uuid");

-- The casts are new: the original body was restored from a dump with body
-- checking off, so it returned bigint columns from a function declared to
-- return integer. Recreating it without them would fail to validate.
create or replace function "public"."get_confidences_by_editor"("e_id" "uuid") returns table("confidence" integer, "count" integer)
    language "sql"
    as $$
  SELECT a.confidence_rating::int, count(a.confidence_rating)::int
  FROM assignments as a
  INNER JOIN tasks as t ON(t.id = a.task_id)
  INNER JOIN projects as p ON(t.project_id = p.id)
  WHERE p.editor_id = e_id
  GROUP BY a.confidence_rating
  ORDER BY a.confidence_rating
$$;

alter function "public"."get_confidences_by_editor"("e_id" "uuid") owner to "postgres";

grant all on function "public"."get_confidences_by_editor"("e_id" "uuid") to "anon";
grant all on function "public"."get_confidences_by_editor"("e_id" "uuid") to "authenticated";
grant all on function "public"."get_confidences_by_editor"("e_id" "uuid") to "service_role";
