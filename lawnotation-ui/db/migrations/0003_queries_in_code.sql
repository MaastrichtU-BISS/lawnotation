-- The read queries that lived in the database as SQL functions (called by name
-- through Supabase's .rpc()) are now TypeScript functions in
-- server/db/queries. Drop the functions, including the two nothing called.
DROP FUNCTION public.get_all_annotator_tasks(uuid);
DROP FUNCTION public.get_all_annotators_from_task(numeric);
DROP FUNCTION public.get_all_docs_from_task(integer);
DROP FUNCTION public.get_all_docs_from_task_mini(integer);
DROP FUNCTION public.get_all_shared_docs_from_task(integer);
DROP FUNCTION public.get_all_shared_docs_from_task_intra(integer);
DROP FUNCTION public.get_completion_by_annotator(uuid);
DROP FUNCTION public.get_completion_by_editor(uuid);
DROP FUNCTION public.get_confidences_by_editor(uuid);
DROP FUNCTION public.get_count_assignments(uuid);
DROP FUNCTION public.get_count_tasks(uuid);
DROP FUNCTION public.get_unannotated_documents(bigint);
DROP FUNCTION public.next_random_assignment(uuid, integer);
DROP FUNCTION public.random_sample(integer, integer);

-- documents.hash was filled by a trigger function; a generated column says the
-- same thing declaratively. (pg_dump leaves generated columns out of data
-- dumps, so restoring Supabase data into this table still works.)
DROP TRIGGER set_document_hash_trigger ON public.documents;
DROP FUNCTION public.set_document_hash();
ALTER TABLE public.documents DROP COLUMN hash;
ALTER TABLE public.documents
  ADD COLUMN hash character(40)
  GENERATED ALWAYS AS (encode(public.digest(full_text, 'sha1'), 'hex')) STORED;
