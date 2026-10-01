// Converts every document uploaded as HTML before parsing moved to the server
// into plain text, and moves its span annotations onto that text.
//
//   DATABASE_URL=... node scripts/legacy-html/run.mjs           # dry run: report only
//   DATABASE_URL=... node scripts/legacy-html/run.mjs --apply   # convert
//
// Run it while the release with legal-annotation-kit is live and before the
// one that drops the Label Studio columns: the kit release reads converted and
// unconverted documents alike, the next one only converted ones.
//
// Safe to re-run: a converted document has no tags left, so it is no longer
// picked up. Before anything changes, the original text and every annotation's
// offsets, text and html_metadata are copied into the legacy_backup schema
// (not exposed through the Supabase API). Each document is converted in its own
// transaction, and a document is left untouched — and reported — if any of its
// annotations would not land on the same words afterwards.
import postgres from "postgres";
import { convertLegacyHtml, sameCharacters } from "./convert.mjs";

const apply = process.argv.includes("--apply");
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}
const sql = postgres(process.env.DATABASE_URL, { max: 1 });

// Same test as utils/levels.ts isLegacyHtml.
const documents = await sql`
  SELECT id::int AS id, name, full_text
  FROM documents
  WHERE name ~* '\\.html?$' AND full_text ~* '</?[a-z][^>]*>'
  ORDER BY id
`;
console.log(`${documents.length} legacy HTML document(s)${apply ? "" : " — dry run, nothing will change"}\n`);

if (apply && documents.length) {
  await sql`CREATE SCHEMA IF NOT EXISTS legacy_backup`;
  await sql`
    CREATE TABLE IF NOT EXISTS legacy_backup.documents (
      id bigint PRIMARY KEY, full_text text, converted_at timestamptz DEFAULT now()
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS legacy_backup.annotations (
      id bigint PRIMARY KEY, document_id bigint, start_index bigint, end_index bigint,
      text text, html_metadata jsonb
    )`;
}

let converted = 0;
let skipped = 0;
let moved = 0;

for (const doc of documents) {
  const { oldText, newText, mapRange } = convertLegacyHtml(doc.full_text);

  // Document-level tags carry no offsets; only spans move.
  const annotations = await sql`
    SELECT an.id::int AS id, an.start_index::int AS start_index, an.end_index::int AS end_index, an.text
    FROM annotations AS an
    INNER JOIN assignments AS a ON (an.assignment_id = a.id)
    INNER JOIN tasks AS t ON (a.task_id = t.id)
    WHERE a.document_id = ${doc.id} AND t.annotation_level::text <> 'document'
    ORDER BY an.id
  `;

  const updates = [];
  const problems = [];
  for (const an of annotations) {
    const before = oldText.slice(an.start_index, an.end_index);
    const range =
      an.end_index > an.start_index && an.end_index <= oldText.length
        ? mapRange(an.start_index, an.end_index)
        : null;
    const after = range ? newText.slice(range.start, range.end) : "";
    if (!range || !sameCharacters(before, after)) {
      problems.push(
        `annotation ${an.id} [${an.start_index},${an.end_index}) "${before.slice(0, 60)}" → ${range ? `"${after.slice(0, 60)}"` : "nothing left"}`
      );
      continue;
    }
    updates.push({ id: an.id, start: range.start, end: range.end, text: after });
  }

  if (problems.length) {
    skipped++;
    console.log(`✗ document ${doc.id} "${doc.name}": left as is, ${problems.length} annotation(s) would not survive`);
    for (const p of problems) console.log(`    ${p}`);
    continue;
  }

  console.log(`✓ document ${doc.id} "${doc.name}": ${oldText.length} → ${newText.length} characters, ${updates.length} span(s) moved`);
  moved += updates.length;
  converted++;
  if (!apply) continue;

  await sql.begin(async (tx) => {
    await tx`
      INSERT INTO legacy_backup.documents (id, full_text) VALUES (${doc.id}, ${doc.full_text})
      ON CONFLICT (id) DO NOTHING
    `;
    if (annotations.length) {
      await tx`
        INSERT INTO legacy_backup.annotations (id, document_id, start_index, end_index, text, html_metadata)
        SELECT id, ${doc.id}, start_index, end_index, text, html_metadata
        FROM annotations WHERE id IN ${tx(annotations.map((a) => a.id))}
        ON CONFLICT (id) DO NOTHING
      `;
    }
    // The hash trigger recomputes documents.hash; identical HTML converts to
    // identical text, so documents shared across tasks still match.
    await tx`UPDATE documents SET full_text = ${newText} WHERE id = ${doc.id}`;
    for (const u of updates) {
      await tx`
        UPDATE annotations
        SET start_index = ${u.start}, end_index = ${u.end}, text = ${u.text}, html_metadata = NULL
        WHERE id = ${u.id}
      `;
    }
  });
}

console.log(
  `\n${converted} document(s) ${apply ? "converted" : "would be converted"}, ${moved} span(s) moved, ${skipped} left as is.`
);
await sql.end();
if (skipped) process.exitCode = 2;
