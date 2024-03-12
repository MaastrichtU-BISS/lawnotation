create type "public"."origins" as enum ('manual', 'imported', 'model');
alter table "public"."assignments" add column "origin" "public"."origins" default 'manual'::"public"."origins";