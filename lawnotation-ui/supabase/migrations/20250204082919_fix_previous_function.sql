set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.get_all_shared_docs_from_task_intra(t_id integer)
 RETURNS SETOF documents
 LANGUAGE sql
AS $function$
  SELECT d.*
  FROM documents as d
  INNER JOIN assignments as a ON (a.document_id = d.id)
  WHERE a.task_id = t_id
  GROUP BY d.id
  HAVING count(d.*) > 1 AND count(DISTINCT a.original_task_id) > 1
  ORDER BY d.id
$function$
;