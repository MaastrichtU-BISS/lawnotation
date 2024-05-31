alter table "public"."tasks" add column "ml_model_id" bigint;

alter table "public"."tasks" add constraint "public_tasks_ml_model_id_fkey" FOREIGN KEY (ml_model_id) REFERENCES ml_models(id) not valid;

alter table "public"."tasks" validate constraint "public_tasks_ml_model_id_fkey";


