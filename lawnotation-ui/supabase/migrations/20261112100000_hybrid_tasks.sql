-- Hybrid tasks: span-level and document-level annotation in one task, each
-- with its own labelset.
--
-- A task with a span level and a document_labelset_id is hybrid: annotators
-- mark spans with `labelset_id`'s labels and tag the whole document with
-- `document_labelset_id`'s labels. It is chosen when the task is created.
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS document_labelset_id bigint
  REFERENCES public.labelsets (id) ON DELETE CASCADE;

-- A document-level task already tags documents with its one labelset, so the
-- second labelset only makes sense next to a span level.
ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_document_labelset_needs_span_level
  CHECK (document_labelset_id IS NULL OR annotation_level::text <> 'document');

-- Both kinds of annotation share the annotations table, so each row says which
-- it is. Document tags have no extent (start_index = end_index = 0).
ALTER TABLE public.annotations
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'span';
ALTER TABLE public.annotations
  ADD CONSTRAINT annotations_kind_check CHECK (kind IN ('span', 'document'));

-- Everything in a document-level task is a document tag.
UPDATE public.annotations AS an
SET kind = 'document'
FROM public.assignments AS a
INNER JOIN public.tasks AS t ON (t.id = a.task_id)
WHERE an.assignment_id = a.id AND t.annotation_level::text = 'document';

CREATE INDEX IF NOT EXISTS annotations_assignment_id_kind
  ON public.annotations (assignment_id, kind);
