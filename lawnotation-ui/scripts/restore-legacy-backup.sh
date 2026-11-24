#!/bin/sh
# Loads a Supabase daily backup (the .backup.gz from Database → Backups →
# Download, a pg_dumpall file) into the scratch database legacy_restore, for
# scripts/import-legacy.mjs to copy from. Runs as the one-shot legacy-restore
# service; does nothing unless LEGACY_IMPORT_RUN names a run that hasn't
# completed yet and LEGACY_DUMP_URL is set (and LEGACY_DATABASE_URL isn't).
#
# Uses PGHOST, PGUSER, PGPASSWORD and PGDATABASE (the application database).
set -eu

if [ -z "${LEGACY_IMPORT_RUN:-}" ] || [ -z "${LEGACY_DUMP_URL:-}" ] || [ -n "${LEGACY_DATABASE_URL:-}" ]; then
  echo "legacy restore: no backup to load"
  exit 0
fi

run_sql=$(printf '%s' "$LEGACY_IMPORT_RUN" | sed "s/'/''/g")
done_already=$(psql -Atc "select 1 from public.legacy_imports where run = '$run_sql'" 2>/dev/null || true)
if [ "$done_already" = "1" ]; then
  echo "legacy restore: run \"$LEGACY_IMPORT_RUN\" already completed"
  exit 0
fi

psql -qc "drop database if exists legacy_restore with (force)"
psql -qc "create database legacy_restore"

echo "legacy restore: downloading and loading the backup"
# Keep only the backup's "postgres" database: no roles (with their password
# hashes), no other databases. Errors about Supabase's own roles and
# extensions are expected and skipped.
errors=/tmp/legacy-restore.err
wget -qO- "$LEGACY_DUMP_URL" \
  | gzip -dc \
  | awk '/^\\connect / { keep = ($2 == "postgres"); next } keep { print }' \
  | psql -q -d legacy_restore >/dev/null 2>"$errors" || true
echo "legacy restore: $(grep -c ERROR "$errors" || true) statements skipped (Supabase roles and extensions)"

users=$(psql -d legacy_restore -Atc "select count(*) from public.users" 2>/dev/null || echo 0)
auth_users=$(psql -d legacy_restore -Atc "select count(*) from auth.users" 2>/dev/null || echo 0)
echo "legacy restore: backup loaded ($users users, $auth_users auth users)"
if [ "$users" -eq 0 ] || [ "$auth_users" -eq 0 ]; then
  echo "legacy restore: the backup didn't load; see the skipped statements:"
  grep ERROR "$errors" | grep -v "role .* does not exist" | head -20
  exit 1
fi
