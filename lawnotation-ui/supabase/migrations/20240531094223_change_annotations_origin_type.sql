alter table "public"."annotations" alter column "origin" set default 'manual'::origins;

alter table "public"."annotations" alter column "origin" set data type origins using "origin"::origins;


