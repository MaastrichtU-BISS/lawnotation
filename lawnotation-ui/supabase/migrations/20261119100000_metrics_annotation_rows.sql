-- One row per annotation with what the metrics page lists it by: its task,
-- document and annotator. Document names are left out: joining documents
-- here scans its whole primary key, so the page looks up the few names it
-- shows by id instead. The page filters, sorts, counts and pages this in
-- a single request. Filtering annotations through an embedded join on the
-- task instead made Postgres scan the whole annotations table, which on a
-- large database ran past the statement timeout.
--
-- security_invoker so the view applies the caller's row-level security, not
-- its owner's; only the server, with the service role, reads it.
create view "public"."metrics_annotation_rows" with (security_invoker = true) as
  select
    n.id,
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
    u.email as annotator_email
  from annotations as n
  join assignments as a on a.id = n.assignment_id
  join users as u on u.id = a.annotator_id;

revoke all on "public"."metrics_annotation_rows" from "anon", "authenticated";
grant select on "public"."metrics_annotation_rows" to "service_role";
