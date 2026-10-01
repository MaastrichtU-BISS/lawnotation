import type { Assignment, AssignmentBundle } from "legal-annotation-kit";
import type { inferRouterInputs } from "@trpc/server";
import type { AppRouter } from "~/server/trpc/routers";

// Client-side glue between lawnotation and legal-annotation-kit. The server
// already speaks the kit's format (see server/utils/annotation_kit.ts).

/**
 * What the server sends for one document, made ready for the kit.
 *
 * Each span's text is re-read from the document at its offsets. Label Studio's
 * stored copy is often wrong — cut short on text with \r\n line endings, or
 * left over from before its word-granularity snapping — while the offsets are
 * right, so the offsets win and the corrected text is stored on the next save.
 */
export function toKitBundle(loaded: {
  document: { name: string; full_text: string; key?: string };
  assignment: Assignment;
}): AssignmentBundle {
  const fullText = loaded.document.full_text;
  return {
    document: { ...loaded.document, full_text: fullText },
    assignment: {
      ...loaded.assignment,
      annotations: loaded.assignment.annotations.map((a) => ({
        ...a,
        text: fullText.slice(a.start, a.end),
      })),
    },
  };
}

type SaveInput = inferRouterInputs<AppRouter>["annotator"]["save"];

/**
 * Stores what the kit hands over. The kit types relation labels as plain
 * strings; the server checks them against the relation_labels enum.
 */
export function saveKitAssignment(trpc: any, assignment: Assignment): Promise<boolean> {
  const input: SaveInput = {
    assignment_id: Number(assignment.id),
    assignment: assignment as SaveInput["assignment"],
  };
  return trpc.annotator.save.mutate(input);
}
