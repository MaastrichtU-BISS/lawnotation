set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.get_all_docs_from_task_mini(t_id integer)
 RETURNS TABLE(id bigint, hash text)
 LANGUAGE sql
AS $function$
  SELECT DISTINCT d.id, d.hash
  FROM documents as d
  INNER JOIN assignments as a ON (a.document_id = d.id)
  WHERE a.task_id = t_id
  GROUP BY d.id
  ORDER BY d.id
$function$
;


