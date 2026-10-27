-- A labelset can now define its own relation labels instead of the fixed
-- eight. NULL keeps the default set.
ALTER TABLE public.labelsets ADD COLUMN IF NOT EXISTS relation_labels text[];

-- Relations store whatever labels their labelset offers, so the enum gives way
-- to text. Writing an enum value into text is an assignment cast, so code that
-- still casts to relation_labels[] keeps working against these columns.
ALTER TABLE public.annotation_relations
  ALTER COLUMN labels TYPE text[] USING labels::text[];

ALTER TABLE public.document_relations ALTER COLUMN labels DROP DEFAULT;
ALTER TABLE public.document_relations
  ALTER COLUMN labels TYPE text[] USING labels::text[];
ALTER TABLE public.document_relations ALTER COLUMN labels SET DEFAULT '{}';
