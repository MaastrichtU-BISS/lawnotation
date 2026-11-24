-- Sign-in moves from Supabase Auth to the shared Keycloak (realm lawnotation).
--
-- users.id stays the application's own id: every foreign key points at it, and
-- existing ids survive the later data move unchanged. A users row is linked to
-- its Keycloak account through oidc_sub, set at the first sign-in. Until then
-- the row is found by its (verified) email, which is how an annotator invited
-- before they ever signed in gets connected to the account Keycloak creates.
--
-- metadata replaces Supabase's auth.users.raw_user_meta_data (onboarding hints,
-- the task an invited annotator was assigned to).

ALTER TABLE public.users
  ALTER COLUMN id SET DEFAULT gen_random_uuid(),
  ADD COLUMN oidc_sub text UNIQUE,
  ADD COLUMN metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN last_sign_in_at timestamptz;

CREATE UNIQUE INDEX users_email_lower_key ON public.users (lower(email));

-- It selected u.*, which no longer matches its declared columns now that users
-- has more of them.
CREATE OR REPLACE FUNCTION public.get_all_annotators_from_task(t_id numeric)
  RETURNS TABLE(id uuid, email text, role public.user_roles, annotator_number integer)
  LANGUAGE sql
AS $$
  SELECT u.id, u.email, u.role, a.annotator_number
  FROM tasks as t
  INNER JOIN assignments as a
  ON (t.id = a.task_id and t.id = t_id)
  LEFT JOIN users as u
  ON (a.annotator_id = u.id)
  GROUP BY u.id, a.annotator_number
  ORDER BY annotator_number
$$;
