-- Importing a task file without `ann_guidelines` used to store the placeholder
-- text "Blank" as the task's guidelines link. It is not a link: annotators were
-- shown a "See Annotation Guidelines" link to nowhere, editing the task was
-- refused as an invalid URL, and the task's export could not be imported again.
-- No guidelines is an empty string, which is what the importer stores now.
UPDATE public.tasks SET ann_guidelines = '' WHERE ann_guidelines = 'Blank';
