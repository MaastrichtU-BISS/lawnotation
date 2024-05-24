alter table "public"."tasks" alter column "annotation_level" drop default;

alter type "public"."annotation_level" rename to "annotation_level__old_version_to_be_dropped";

create type "public"."annotation_level" as enum ('word', 'document', 'symbol', 'sentence', 'paragraph');

alter table "public"."tasks" alter column annotation_level type "public"."annotation_level" using annotation_level::text::"public"."annotation_level";

alter table "public"."tasks" alter column "annotation_level" set default 'word'::annotation_level;

drop type "public"."annotation_level__old_version_to_be_dropped";


