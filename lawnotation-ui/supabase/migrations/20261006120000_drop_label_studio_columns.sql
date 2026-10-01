-- Drops the columns only Label Studio needed. legal-annotation-kit identifies
-- annotations and relations by their numeric ids, and annotates plain text, so:
--
--   annotations.ls_id                  Label Studio's region id
--   annotations.html_metadata          XPath offsets for drawing spans on HTML
--   annotation_relations.ls_from/ls_to region ids at either end of a relation
--
-- Order of a release that includes this migration:
--   1. The legal-annotation-kit release is live and rolling back to Label
--      Studio is no longer needed.
--   2. scripts/legacy-html/run.mjs --apply has converted every document
--      uploaded as HTML to plain text and reported none left as is.
--   3. Then this migration, with the code that stopped using these columns.
--
-- The check below enforces step 2: a legacy HTML document still holding markup
-- would be shown as raw tags, with its annotations at offsets into text that no
-- longer exists.

DO $$
DECLARE
  remaining integer;
BEGIN
  SELECT count(*) INTO remaining
  FROM public.documents
  WHERE name ~* '\.html?$' AND full_text ~* '</?[a-z][^>]*>';

  IF remaining > 0 THEN
    RAISE EXCEPTION
      '% document(s) uploaded as HTML still hold markup. Run scripts/legacy-html/run.mjs first.',
      remaining;
  END IF;
END
$$;

ALTER TABLE public.annotations DROP COLUMN IF EXISTS ls_id;
ALTER TABLE public.annotations DROP COLUMN IF EXISTS html_metadata;
ALTER TABLE public.annotation_relations DROP COLUMN IF EXISTS ls_from;
ALTER TABLE public.annotation_relations DROP COLUMN IF EXISTS ls_to;
