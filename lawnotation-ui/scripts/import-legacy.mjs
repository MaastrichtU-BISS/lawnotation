#!/usr/bin/env node
// Copies the data of the legacy Supabase database into this deployment's
// database, replacing what is there. The legacy database is only read, in one
// read-only snapshot; nothing is written to it.
//
//   LEGACY_DATABASE_URL=postgres://...supabase...  DATABASE_URL=postgres://...
//   LEGACY_IMPORT_RUN=<any new label>  node scripts/import-legacy.mjs
//
// Instead of a live database it can read a Supabase daily backup: with
// LEGACY_DUMP_URL set (and no LEGACY_DATABASE_URL), the legacy-restore service
// has loaded that backup into the scratch database legacy_restore on this
// server, which this script reads and afterwards removes.
//
// It runs as the one-shot `legacy-import` service on every deploy, but only
// does something when both variables are set and LEGACY_IMPORT_RUN names a
// run that hasn't completed yet (public.legacy_imports). So: set a new label
// and deploy to (re)import; leave it to keep the data. Each run empties the
// application tables first, so anything created on this deployment since the
// last import is replaced by the legacy data.
//
// What it copies, all in one transaction on this side:
// - every table of the legacy public schema that exists here, the columns
//   both sides have (generated columns, such as documents.hash, are left to
//   compute themselves);
// - from Supabase's auth.users: users.created_at, last_sign_in_at and the
//   app's metadata keys;
// - the legacy_backup schema as is.
// Then it moves the id sequences past the copied ids and compares row counts.
// users.oidc_sub stays empty: the first Keycloak sign-in links each users row
// by its email (server/utils/auth.ts).
import postgres from "postgres";

const targetUrl = process.env.DATABASE_URL;
const run = process.env.LEGACY_IMPORT_RUN?.trim();
const RESTORE_DB = "legacy_restore";
const fromBackup = !process.env.LEGACY_DATABASE_URL && !!process.env.LEGACY_DUMP_URL && !!targetUrl;
const legacyUrl =
  process.env.LEGACY_DATABASE_URL ||
  (fromBackup ? Object.assign(new URL(targetUrl), { pathname: `/${RESTORE_DB}` }).href : undefined);

if (!legacyUrl || !run) {
  console.log("legacy import: no legacy source or no LEGACY_IMPORT_RUN, nothing to do");
  process.exit(0);
}
if (!targetUrl) {
  console.error("legacy import: DATABASE_URL is not set");
  process.exit(1);
}

// Application tables in foreign key order (a table after the ones it references).
const TABLES = [
  "users",
  "projects",
  "labelsets",
  "ml_models",
  "tasks",
  "documents",
  "assignments",
  "annotations",
  "annotation_relations",
  "document_relations",
  "publications",
];
// The users.metadata keys the app reads; Supabase's own (email, sub, ...) are left out.
const METADATA_KEYS = ["assigned_task_id", "guidanceStatus", "invited_task_id"];
const LOCK = 727275;

const source = postgres(legacyUrl, { max: 1, onnotice: () => {}, connect_timeout: 30 });
const target = postgres(targetUrl, { max: 1, onnotice: () => {} });
const ident = (name) => `"${name.replace(/"/g, '""')}"`;
const log = (...args) => console.log("legacy import:", ...args);

async function columnsOf(sql, schema, table, { skipGenerated }) {
  const rows = await sql`
    select column_name, is_generated from information_schema.columns
    where table_schema = ${schema} and table_name = ${table}
    order by ordinal_position`;
  return rows.filter((r) => !(skipGenerated && r.is_generated === "ALWAYS")).map((r) => r.column_name);
}

// Rows per insert; documents carry their full text, so fewer of those at a time.
const BATCH = { documents: 250 };
const DEFAULT_BATCH = 5000;

/**
 * Copies the given columns of a table in batches. Each row travels as JSON
 * (row_to_json on the legacy side, json_populate_recordset here), which keeps
 * every value exact: timestamps to the microsecond, jsonb, arrays, enums.
 * (COPY streams would be faster, but postgres.js reports a COPY the target
 * rejects only by quietly aborting the transaction.)
 */
async function copyTable(src, tgt, schema, table, columns) {
  const list = columns.map(ident).join(", ");
  const name = `${ident(schema)}.${ident(table)}`;
  const size = BATCH[table] ?? DEFAULT_BATCH;
  const cursor = src.unsafe(`select row_to_json(x)::text as row from ${name} as x`).cursor(size);
  for await (const rows of cursor) {
    await tgt.unsafe(
      `insert into ${name} (${list}) select ${list} from json_populate_recordset(null::${name}, $1::text::json)`,
      [`[${rows.map((r) => r.row).join(",")}]`]
    );
  }
}

try {
  await target`select pg_advisory_lock(${LOCK})`;
  await target`
    create table if not exists public.legacy_imports (
      run text primary key,
      started_at timestamptz not null,
      finished_at timestamptz not null default now(),
      row_counts jsonb not null
    )`;
  const [done] = await target`select finished_at from public.legacy_imports where run = ${run}`;
  if (done) {
    log(`run "${run}" already completed at ${done.finished_at.toISOString()}, nothing to do`);
  } else {
    const startedAt = new Date();
    log(`run "${run}" starting`);

    await source.begin("isolation level repeatable read read only", async (src) => {
      // Checks that would make the copy fail halfway, reported up front.
      const [dupes] = await src`
        select count(*)::int as n from (
          select lower(email) from public.users group by 1 having count(*) > 1) d`;
      if (dupes.n) throw new Error(`${dupes.n} emails occur more than once in different letter case in public.users`);

      const sourceTables = new Set(
        (await src`select tablename from pg_tables where schemaname = 'public'`).map((r) => r.tablename)
      );
      const missing = TABLES.filter((t) => !sourceTables.has(t));
      if (missing.length) throw new Error(`legacy database lacks tables: ${missing.join(", ")}`);

      const backupTables = (
        await src`select tablename from pg_tables where schemaname = 'legacy_backup' order by 1`
      ).map((r) => r.tablename);

      await target.begin(async (tgt) => {
        await tgt.unsafe(`truncate ${TABLES.map((t) => `public.${ident(t)}`).join(", ")} restart identity cascade`);

        const counts = {};
        for (const table of TABLES) {
          const sourceColumns = new Set(await columnsOf(src, "public", table, { skipGenerated: false }));
          const columns = (await columnsOf(tgt, "public", table, { skipGenerated: true })).filter((c) =>
            sourceColumns.has(c)
          );
          const t0 = Date.now();
          await copyTable(src, tgt, "public", table, columns);
          const [{ n: copied }] = await tgt.unsafe(`select count(*)::int as n from public.${ident(table)}`);
          const [{ n: expected }] = await src.unsafe(`select count(*)::int as n from public.${ident(table)}`);
          if (copied !== expected) throw new Error(`${table}: copied ${copied} rows, legacy has ${expected}`);
          counts[table] = copied;
          log(`${table}: ${copied} rows (${columns.length} columns, ${Date.now() - t0} ms)`);
        }

        // Sign-up time, last sign-in and the app's metadata from Supabase Auth.
        const authUsers = await src`
          select id, created_at, last_sign_in_at,
                 coalesce((select jsonb_object_agg(k, v) from jsonb_each(raw_user_meta_data) as e(k, v)
                           where k = any(${METADATA_KEYS})), '{}'::jsonb) as metadata
          from auth.users`;
        const updated = await tgt`
          update public.users as u
          set created_at = coalesce(a.created_at, u.created_at),
              last_sign_in_at = a.last_sign_in_at,
              metadata = a.metadata
          from jsonb_to_recordset(${authUsers}::jsonb)
               as a(id uuid, created_at timestamptz, last_sign_in_at timestamptz, metadata jsonb)
          where u.id = a.id`;
        log(`users: sign-in details and metadata for ${updated.count} of ${authUsers.length} auth users`);

        // Identity sequences past the copied ids.
        for (const table of TABLES) {
          const [seq] = await tgt`select pg_get_serial_sequence(${"public." + table}, 'id') as name`;
          if (!seq?.name) continue;
          await tgt.unsafe(
            `select setval('${seq.name}', coalesce((select max(id) from public.${ident(table)}), 0) + 1, false)`
          );
        }

        // The legacy_backup schema, structure and rows, as it is.
        if (backupTables.length) {
          await tgt`drop schema if exists legacy_backup cascade`;
          await tgt`create schema legacy_backup`;
          for (const table of backupTables) {
            const defs = await src`
              select a.attname as name, format_type(a.atttypid, a.atttypmod) as type, a.attnotnull as notnull
              from pg_attribute a
              where a.attrelid = ${"legacy_backup." + table}::regclass and a.attnum > 0 and not a.attisdropped
              order by a.attnum`;
            const ddl = defs.map((d) => `${ident(d.name)} ${d.type}${d.notnull ? " not null" : ""}`).join(", ");
            await tgt.unsafe(`create table legacy_backup.${ident(table)} (${ddl})`);
            await copyTable(src, tgt, "legacy_backup", table, defs.map((d) => d.name));
            const [{ n }] = await tgt.unsafe(`select count(*)::int as n from legacy_backup.${ident(table)}`);
            counts[`legacy_backup.${table}`] = n;
            log(`legacy_backup.${table}: ${n} rows`);
          }
        }

        await tgt`
          insert into public.legacy_imports (run, started_at, row_counts)
          values (${run}, ${startedAt}, ${counts})`;
      });
    });
    log(`run "${run}" completed in ${Math.round((Date.now() - startedAt.getTime()) / 1000)} s`);
  }
} catch (error) {
  console.error(`legacy import failed, nothing was changed: ${error.message}`);
  process.exitCode = 1;
} finally {
  await source.end();
  // The scratch copy of a backup is removed after a successful run and kept
  // after a failed one, to look into.
  if (fromBackup && process.exitCode !== 1) {
    await target.unsafe(`drop database if exists ${RESTORE_DB} with (force)`).catch(() => {});
  }
  await target`select pg_advisory_unlock(${LOCK})`.catch(() => {});
  await target.end();
}
