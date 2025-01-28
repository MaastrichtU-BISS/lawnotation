alter table "public"."assignments" add column "original_task_id" bigint;

alter table "public"."assignments" add constraint "public_assignments_original_task_id_fkey" FOREIGN KEY (original_task_id) REFERENCES tasks(id) not valid;

alter table "public"."assignments" validate constraint "public_assignments_original_task_id_fkey";


