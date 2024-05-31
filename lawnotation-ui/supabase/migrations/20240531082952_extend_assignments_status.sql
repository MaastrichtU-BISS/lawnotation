ALTER TYPE "public"."assignment_status" ADD VALUE 'predicting';
ALTER TYPE "public"."assignment_status" ADD VALUE 'pre-annotated';
ALTER TYPE "public"."assignment_status" ADD VALUE 'failed';

-- alter table "public"."assignments" alter column "status" drop default;

-- alter type "public"."assignment_status" rename to "assignment_status__old_version_to_be_dropped";

-- create type "public"."assignment_status" as enum ('pending', 'done', 'predicting', 'pre-annotated', 'failed');

-- alter table "public"."assignments" alter column status type "public"."assignment_status" using status::text::"public"."assignment_status";

-- alter table "public"."assignments" alter column "status" set default 'pending'::assignment_status;

-- drop type "public"."assignment_status__old_version_to_be_dropped";


