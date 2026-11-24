#!/usr/bin/env node
// Applies db/migrations/*.sql to DATABASE_URL, in file-name order, each file in
// its own transaction, and records them in public.schema_migrations. Safe to run
// on every deploy: applied files are skipped, and an advisory lock keeps two
// runs from interleaving.
//
//   DATABASE_URL=postgres://... node scripts/migrate.mjs [--seed db/seed/dev.sql]
//
// The seed option is for development databases only.
import { readdir, readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dir = join(root, "db", "migrations");
const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}
const seedIndex = process.argv.indexOf("--seed");
const seed = seedIndex > -1 ? process.argv[seedIndex + 1] : null;

const sql = postgres(url, { max: 1, onnotice: () => {} });
const LOCK = 727274; // any constant; shared by every run of this script

try {
  await sql`select pg_advisory_lock(${LOCK})`;
  await sql`
    create table if not exists public.schema_migrations (
      version text primary key,
      applied_at timestamptz not null default now()
    )`;
  const applied = new Set((await sql`select version from public.schema_migrations`).map((r) => r.version));
  const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();

  let count = 0;
  for (const file of files) {
    if (applied.has(file)) continue;
    const text = await readFile(join(dir, file), "utf8");
    await sql.begin(async (tx) => {
      await tx.unsafe(text);
      await tx`insert into public.schema_migrations (version) values (${file})`;
    });
    console.log(`applied ${file}`);
    count++;
  }
  console.log(count ? `${count} migration(s) applied` : "database is up to date");

  if (seed) {
    await sql.begin((tx) => readFile(join(root, seed), "utf8").then((text) => tx.unsafe(text)));
    console.log(`seeded ${seed}`);
  }
} catch (error) {
  console.error(`migration failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  await sql`select pg_advisory_unlock(${LOCK})`.catch(() => {});
  await sql.end();
}
