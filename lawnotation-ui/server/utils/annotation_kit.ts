// The boundary between lawnotation's tables and legal-annotation-kit's JSON
// format. Everything that renames a column or reshapes a row for the kit lives
// here, so the rest of the app talks in one vocabulary or the other, never both.
//
// The database is deliberately left as it is. The columns Label Studio needed
// (annotations.ls_id, annotation_relations.ls_from/ls_to, html_metadata) keep
// being written, so the previous release can still read everything this one
// saves if it ever has to be rolled back to.
import type { Sql } from "postgres";
import type {
  Annotation as KitAnnotation,
  Assignment as KitAssignment,
  DocumentAnnotation,
} from "legal-annotation-kit";
import { AssignmentStatuses, Origins } from "~/utils/enums";

export type DbAnnotation = {
  id: number;
  assignment_id: number;
  start_index: number;
  end_index: number;
  text: string;
  label: string;
  origin: Origins | null;
  ls_id: string | null;
  metadata: string | null;
  html_metadata: unknown;
  confidence_rating: number | null;
};

export type DbRelation = {
  id: number;
  from_id: number;
  to_id: number;
  direction: "bi" | "left" | "right";
  labels: string[];
};

/** A link from one assignment's document to another's (document-level). */
export type DbDocumentRelation = {
  from_assignment_id: number;
  to_assignment_id: number;
  labels: string[];
};

/** How the kit refers to a document in lawnotation: by its assignment, since
 * document names are not unique within a task. */
export const assignmentKey = (assignmentId: number) => String(assignmentId);

export type DbAssignment = {
  id: number;
  annotator_id: string | null;
  seq_pos: number;
  status: string;
  difficulty_rating: number | null;
};


export function toKitAssignment(
  assignment: DbAssignment,
  annotations: DbAnnotation[],
  relations: DbRelation[],
  documentLevel: boolean,
  documentRelations: DbDocumentRelation[] = []
): KitAssignment {
  const base = {
    id: assignment.id,
    annotator: assignment.annotator_id ?? "",
    order: assignment.seq_pos,
    status: assignment.status,
    confidence: assignment.difficulty_rating ?? 0,
    document_relations: documentRelations.map((r) => ({
      to: assignmentKey(r.to_assignment_id),
      labels: r.labels,
    })),
  };

  if (documentLevel) {
    return {
      ...base,
      annotations: [],
      document_annotations: annotations.map<DocumentAnnotation>((a) => ({
        id: a.id,
        label: a.label,
        confidence: a.confidence_rating ?? 0,
        metadata: a.metadata ?? null,
      })),
    };
  }

  return {
    ...base,
    annotations: annotations.map<KitAnnotation>((a) => ({
      id: a.id,
      start: a.start_index,
      end: a.end_index,
      label: a.label,
      text: a.text,
      confidence: a.confidence_rating ?? 0,
      metadata: a.metadata ?? null,
      relations: relations
        .filter((r) => r.from_id === a.id)
        .map((r) => ({ to: r.to_id, direction: r.direction, labels: r.labels })),
    })),
    document_annotations: [],
  };
}

/** The same shape of id Label Studio gave its regions, for rows it never saw. */
function newLsId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-";
  let id = "";
  for (let i = 0; i < 10; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

/**
 * Stores what the kit sent as the assignment's annotations and relations,
 * plus its confidence and status — in one transaction, so a save that fails
 * part-way leaves the previous state untouched.
 *
 * Annotations the kit sent back with an existing id are updated in place, not
 * recreated: their id stays stable across saves, and so do the columns the kit
 * does not carry — origin (a pre-annotation stays marked as one), ls_id and
 * html_metadata (what the previous release needs to draw it). Anything with an
 * id the assignment does not have is new and inserted; existing rows the kit
 * no longer sent are deleted. Relations are rewritten wholesale.
 */
export async function storeKitAssignment(
  sql: Sql,
  assignmentId: number,
  kit: KitAssignment,
  documentLevel: boolean
): Promise<void> {
  await sql.begin(async (transaction) => {
    // postgres.js types a transaction without the call signature it has at
    // runtime; this restores it.
    const tx = transaction as unknown as Sql;
    const existing = await tx<{ id: number; ls_id: string | null }[]>`
      SELECT id::int AS id, ls_id FROM annotations WHERE assignment_id = ${assignmentId}
    `;
    const previous = new Map(existing.map((a) => [a.id, a]));

    const rows = documentLevel
      ? kit.document_annotations.map((d) => ({
          kitId: d.id,
          label: d.label,
          start: 0,
          end: 0,
          text: "",
          confidence: d.confidence,
          metadata: d.metadata ?? null,
          htmlMetadata: null as unknown,
        }))
      : kit.annotations.map((a) => ({
          kitId: a.id,
          label: a.label,
          start: a.start,
          end: a.end,
          text: a.text,
          confidence: a.confidence,
          metadata: a.metadata ?? null,
          // Sent by the client for spans on a legacy HTML document only.
          htmlMetadata: (a as KitAnnotation & { html_metadata?: unknown }).html_metadata ?? null,
        }));

    if (existing.length) {
      const ids = existing.map((a) => a.id);
      await tx`
        DELETE FROM annotation_relations
        WHERE from_id IN ${tx(ids)} OR to_id IN ${tx(ids)}
      `;
      const kept = rows.filter((r) => previous.has(r.kitId)).map((r) => r.kitId);
      const dropped = ids.filter((id) => !kept.includes(id));
      if (dropped.length) await tx`DELETE FROM annotations WHERE id IN ${tx(dropped)}`;
    }

    // kit id -> the row's id and ls_id, to point relations at.
    const stored = new Map<number, { id: number; lsId: string }>();
    for (const row of rows) {
      const before = previous.get(row.kitId);
      if (before) {
        await tx`
          UPDATE annotations
          SET start_index = ${row.start}, end_index = ${row.end}, text = ${row.text},
              label = ${row.label}, metadata = ${row.metadata}, confidence_rating = ${row.confidence},
              -- Label Studio's own html_metadata is kept; it is only filled in where missing.
              html_metadata = COALESCE(html_metadata, ${row.htmlMetadata ? tx.json(row.htmlMetadata as any) : null})
          WHERE id = ${before.id}
        `;
        const lsId = before.ls_id ?? newLsId();
        if (!before.ls_id) await tx`UPDATE annotations SET ls_id = ${lsId} WHERE id = ${before.id}`;
        stored.set(row.kitId, { id: before.id, lsId });
        continue;
      }
      const lsId = newLsId();
      const [inserted] = await tx<{ id: number }[]>`
        INSERT INTO annotations
          (assignment_id, start_index, end_index, text, label, origin, ls_id, metadata, html_metadata, confidence_rating)
        VALUES
          (${assignmentId}, ${row.start}, ${row.end}, ${row.text}, ${row.label},
           ${Origins.MANUAL}::origins, ${lsId}, ${row.metadata},
           ${row.htmlMetadata ? tx.json(row.htmlMetadata as any) : null}, ${row.confidence})
        RETURNING id::int AS id
      `;
      stored.set(row.kitId, { id: inserted!.id, lsId });
    }

    if (!documentLevel) {
      const relations = kit.annotations.flatMap((a) =>
        a.relations.flatMap((r) => {
          const from = stored.get(a.id);
          const to = stored.get(r.to);
          if (!from || !to) return [];
          return [
            {
              from_id: from.id,
              to_id: to.id,
              ls_from: from.lsId,
              ls_to: to.lsId,
              direction: r.direction,
              labels: r.labels,
            },
          ];
        })
      );
      for (const r of relations) {
        await tx`
          INSERT INTO annotation_relations (from_id, to_id, ls_from, ls_to, direction, labels)
          VALUES (${r.from_id}, ${r.to_id}, ${r.ls_from}, ${r.ls_to},
                  ${r.direction}::relation_directions, ${r.labels}::text[]::relation_labels[])
        `;
      }
    }

    if (documentLevel) {
      // A link may only point at another document in the same annotator's
      // queue for this task; anything else is dropped rather than stored.
      const queue = await tx<{ id: number }[]>`
        SELECT other.id::int AS id
        FROM assignments AS self
        INNER JOIN assignments AS other
          ON (other.task_id = self.task_id AND other.annotator_number = self.annotator_number)
        WHERE self.id = ${assignmentId} AND other.id <> self.id
      `;
      const allowed = new Set(queue.map((q) => q.id));
      await tx`DELETE FROM document_relations WHERE from_assignment_id = ${assignmentId}`;
      for (const r of kit.document_relations) {
        const to = Number(r.to);
        if (!allowed.has(to)) continue;
        await tx`
          INSERT INTO document_relations (from_assignment_id, to_assignment_id, labels)
          VALUES (${assignmentId}, ${to}, ${r.labels}::text[]::relation_labels[])
          ON CONFLICT (from_assignment_id, to_assignment_id) DO UPDATE SET labels = EXCLUDED.labels
        `;
      }
    }

    // Status only ever moves forward to done: a plain Save, or an editor
    // reviewing someone's work, must not reopen a finished assignment.
    if (kit.status === AssignmentStatuses.DONE) {
      await tx`
        UPDATE assignments
        SET difficulty_rating = ${kit.confidence}, status = ${AssignmentStatuses.DONE}::assignment_status
        WHERE id = ${assignmentId}
      `;
    } else {
      await tx`UPDATE assignments SET difficulty_rating = ${kit.confidence} WHERE id = ${assignmentId}`;
    }
  });
}

/**
 * Copies the document-level links among the assignments in `copies` (original
 * id -> new id) onto their copies. Links whose target was not copied are left
 * behind. For replicating and merging tasks.
 */
export async function copyDocumentRelations(
  sql: Sql,
  copies: Record<number, number>
): Promise<void> {
  const ids = Object.keys(copies).map(Number);
  if (!ids.length) return;
  const rows = await sql<DbDocumentRelation[]>`
    SELECT from_assignment_id::int AS from_assignment_id, to_assignment_id::int AS to_assignment_id,
           labels::text[] AS labels
    FROM document_relations
    WHERE from_assignment_id IN ${sql(ids)}
  `;
  for (const r of rows) {
    const from = copies[r.from_assignment_id];
    const to = copies[r.to_assignment_id];
    if (!from || !to) continue;
    await sql`
      INSERT INTO document_relations (from_assignment_id, to_assignment_id, labels)
      VALUES (${from}, ${to}, ${r.labels}::text[]::relation_labels[])
      ON CONFLICT (from_assignment_id, to_assignment_id) DO NOTHING
    `;
  }
}
