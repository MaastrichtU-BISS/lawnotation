import type { Sql } from "~/server/db/client";
import type { Document } from "~/types";
import { matching, range } from "./helpers";

/** The fields a document is created with. */
export type NewDocument = Pick<Document, "name" | "project_id" | "source" | "full_text">;

// The columns a document is inserted with. A mutable array, as postgres.js's
// types only accept those for the column list of its insert helper.
const DOCUMENT_COLUMNS: (keyof NewDocument)[] = ["name", "project_id", "source", "full_text"];

// Documents carry their full text, so a bulk insert goes in modest chunks:
// a statement stays well under the parameter limit and a sane size.
const DOCUMENTS_PER_INSERT = 200;

/** The documents a task has assignments on, by id. */
export function documentsOfTask(sql: Sql, taskId: number) {
  return sql<Document[]>`
    select d.*
    from documents as d
    where d.id in (select a.document_id from assignments as a where a.task_id = ${taskId})
    order by d.id
  `;
}

/** Id and content hash of the documents a task has assignments on, by id. */
export function documentHashesOfTask(sql: Sql, taskId: number) {
  return sql<{ id: number; hash: string }[]>`
    select d.id, d.hash
    from documents as d
    where d.id in (select a.document_id from assignments as a where a.task_id = ${taskId})
    order by d.id
  `;
}

/**
 * The documents of a task that more than one assignment points at (so more
 * than one annotator saw them), by id. With `acrossOriginTasks`, only those
 * whose assignments come from more than one original task (a task merged from
 * two others).
 */
export function sharedDocumentsOfTask(sql: Sql, taskId: number, { acrossOriginTasks = false } = {}) {
  return sql<Document[]>`
    select d.*
    from documents as d
    inner join assignments as a on (a.document_id = d.id)
    where a.task_id = ${taskId}
    group by d.id
    having count(*) > 1
      ${acrossOriginTasks ? sql`and count(distinct a.original_task_id) > 1` : sql``}
    order by d.id
  `;
}

/** Up to `n` ids of documents in a project, in random order. */
export async function randomDocumentIds(sql: Sql, projectId: number, n: number) {
  const rows = await sql<{ id: number }[]>`
    select id from documents where project_id = ${projectId} order by random() limit ${n}
  `;
  return rows.map((r) => r.id);
}

/** The documents matching every defined field of `filter`, within an inclusive row range. */
export function findDocuments(sql: Sql, filter: Partial<NewDocument> = {}, rows?: readonly [number, number]) {
  return sql<Document[]>`
    select * from documents where true ${matching(sql, filter)} ${range(sql, rows)}
  `;
}

/** The document with this id (no row when there is none). */
export function documentById(sql: Sql, id: number) {
  return sql<Document[]>`select * from documents where id = ${id}`;
}

/** Inserts one document and returns its row. */
export function insertDocument(sql: Sql, document: NewDocument) {
  return sql<Document[]>`insert into documents ${sql(document, DOCUMENT_COLUMNS)} returning *`;
}

/**
 * Inserts documents in chunks and returns their rows by id, which is the
 * order given (ids come from a sequence in row order). Run it in a
 * transaction for all-or-nothing.
 */
export async function insertDocuments(sql: Sql, documents: readonly NewDocument[]) {
  const inserted: Document[] = [];
  for (let i = 0; i < documents.length; i += DOCUMENTS_PER_INSERT) {
    const chunk = documents.slice(i, i + DOCUMENTS_PER_INSERT);
    inserted.push(...(await sql<Document[]>`insert into documents ${sql(chunk, DOCUMENT_COLUMNS)} returning *`));
  }
  return inserted.sort((a, b) => a.id - b.id);
}

/** Sets the given fields of a document and returns its row. */
export function updateDocument(sql: Sql, id: number, updates: Partial<NewDocument>) {
  return sql<Document[]>`
    update documents set ${sql(updates, Object.keys(updates) as (keyof NewDocument)[])}
    where id = ${id}
    returning *
  `;
}

/** Deletes a document. */
export function deleteDocument(sql: Sql, id: number) {
  return sql`delete from documents where id = ${id}`;
}

/** Deletes every document of a project. */
export function deleteDocumentsOfProject(sql: Sql, projectId: number) {
  return sql`delete from documents where project_id = ${projectId}`;
}

/** A page of a project's documents. */
export function documentsOfProjectPage(sql: Sql, projectId: number, offset: number, limit: number) {
  return sql<Document[]>`
    select * from documents
    where project_id = ${projectId}
    limit ${Math.max(limit, 0)} offset ${offset}
  `;
}

/** How many documents a project has. */
export async function countDocumentsOfProject(sql: Sql, projectId: number) {
  const [row] = await sql<[{ count: number }]>`
    select count(*)::int as count from documents where project_id = ${projectId}
  `;
  return row.count;
}

/** How many documents there are in the projects an editor owns. */
export async function countDocumentsOfEditor(sql: Sql, editorId: string) {
  const [row] = await sql<[{ count: number }]>`
    select count(*)::int as count
    from documents as d
    join projects as p on (p.id = d.project_id)
    where p.editor_id = ${editorId}
  `;
  return row.count;
}

/** Id and name of each document in a project. */
export function documentNamesOfProject(sql: Sql, projectId: number) {
  return sql<{ id: number; name: string | null }[]>`
    select id, name from documents where project_id = ${projectId}
  `;
}

/** The documents of a project with this name. */
export function documentsOfProjectNamed(sql: Sql, projectId: number, name: string) {
  return sql<Document[]>`
    select * from documents where project_id = ${projectId} and name = ${name}
  `;
}

/** Up to `n` ids of documents in a project, lowest first. */
export async function firstDocumentIds(sql: Sql, projectId: number, n: number) {
  const rows = await sql<{ id: number }[]>`
    select id from documents
    where project_id = ${projectId}
    order by id
    limit ${n}
  `;
  return rows.map((r) => +r.id);
}

/** The name of the document with this id (no row when there is none). */
export function documentName(sql: Sql, id: number) {
  return sql<{ name: string | null }[]>`select name from documents where id = ${id}`;
}

/** Whether the user is the editor of the project the document is in. */
export async function isDocumentEditor(sql: Sql, documentId: number, userId: string) {
  const [{ ok }] = await sql<[{ ok: boolean }]>`
    select exists (
      select 1
      from documents d
      join projects p on p.id = d.project_id
      where d.id = ${documentId} and p.editor_id = ${userId}
    ) as ok`;
  return ok;
}

/** Whether the user has an assignment on the document. */
export async function isDocumentAnnotator(sql: Sql, documentId: number, userId: string) {
  const [{ ok }] = await sql<[{ ok: boolean }]>`
    select exists (
      select 1 from assignments
      where document_id = ${documentId} and annotator_id = ${userId}
    ) as ok`;
  return ok;
}
