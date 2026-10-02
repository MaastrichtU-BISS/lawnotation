import type {
  Annotation,
  Assignment,
  AssignmentBundle,
  DocumentAnnotation,
} from "legal-annotation-kit";
import type { inferRouterInputs } from "@trpc/server";
import type { AppRouter } from "~/server/trpc/routers";
import { AnnotationsLocalStorage } from "~/utils/localstorage";

// Client-side glue between lawnotation and legal-annotation-kit. The server
// already speaks the kit's format (see server/utils/annotation_kit.ts); what is
// left here needs a browser.


/**
 * The text of an HTML document exactly as Label Studio counted it, so the
 * offsets of annotations made there still land on the same characters: every
 * text node in document order, and one character per <br>
 * (findGlobalOffset in Label Studio's selection-tools.js). A <br> becomes a
 * newline, which keeps the line break it stood for.
 *
 * Parsed into an inert document — nothing in it loads, runs or renders. The
 * kit shows the result as plain text.
 */
export function legacyHtmlToText(html: string): string {
  const doc = document.implementation.createHTMLDocument("");
  const root = doc.createElement("div");
  root.innerHTML = html;
  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_ALL);
  let text = "";
  let node: Node | null;
  while ((node = walker.nextNode())) {
    if (node.nodeType === Node.TEXT_NODE) text += (node as Text).data;
    else if (node.nodeName === "BR") text += "\n";
  }
  return text;
}

export type HtmlMetadata = {
  start: string;
  end: string;
  startOffset: number;
  endOffset: number;
  globalOffsets: { start: number; end: number };
};

/**
 * Where Label Studio would say a span of a legacy HTML document sits: the
 * text node and offset at each end, as an XPath from the document root
 * ("/p[1]/b[1]/text()[1]"), plus the global offsets. The previous release
 * cannot draw an HTML annotation without it — and would delete one it cannot
 * draw the next time it saved — so new spans on these documents get it too.
 */
export function legacyHtmlMetadata(html: string, start: number, end: number): HtmlMetadata | null {
  const doc = document.implementation.createHTMLDocument("");
  const root = doc.createElement("div");
  root.innerHTML = html;

  // Same walk as legacyHtmlToText. A start belongs to the node it begins;
  // an end to the node it finishes in.
  const locate = (position: number, isEnd: boolean) => {
    const walker = doc.createTreeWalker(root, NodeFilter.SHOW_ALL);
    let passed = 0;
    let node: Node | null;
    while ((node = walker.nextNode())) {
      if (node.nodeType === Node.TEXT_NODE) {
        const length = (node as Text).length;
        const inside = isEnd
          ? position > passed && position <= passed + length
          : position >= passed && position < passed + length;
        if (inside) return { node, offset: position - passed };
        passed += length;
      } else if (node.nodeName === "BR") {
        passed += 1;
      }
    }
    return null;
  };

  const xpath = (node: Node): string => {
    const steps: string[] = [];
    let current: Node | null = node;
    while (current && current !== root) {
      const parent: Node | null = current.parentNode;
      if (!parent) break;
      const siblings = Array.from(parent.childNodes);
      if (current.nodeType === Node.TEXT_NODE) {
        const index = siblings.filter((n) => n.nodeType === Node.TEXT_NODE).indexOf(current as ChildNode) + 1;
        steps.unshift(`text()[${index}]`);
      } else {
        const name = current.nodeName.toLowerCase();
        const index = siblings.filter((n) => n.nodeName.toLowerCase() === name).indexOf(current as ChildNode) + 1;
        steps.unshift(`${name}[${index}]`);
      }
      current = parent;
    }
    return "/" + steps.join("/");
  };

  const from = locate(start, false);
  const to = locate(end, true);
  if (!from || !to) return null;
  return {
    start: xpath(from.node),
    end: xpath(to.node),
    startOffset: from.offset,
    endOffset: to.offset,
    globalOffsets: { start, end },
  };
}

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
  legacy_html: boolean;
}): AssignmentBundle {
  const fullText = loaded.legacy_html
    ? legacyHtmlToText(loaded.document.full_text)
    : loaded.document.full_text;
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
 *
 * `legacyHtml` is the markup of a legacy HTML document, when that is what was
 * annotated: each span then carries the html_metadata the previous release
 * needs to draw it (see legacyHtmlMetadata).
 */
export function saveKitAssignment(
  trpc: any,
  assignment: Assignment,
  legacyHtml?: string
): Promise<boolean> {
  const annotations = legacyHtml
    ? assignment.annotations.map((a) => ({
        ...a,
        html_metadata: legacyHtmlMetadata(legacyHtml, a.start, a.end),
      }))
    : assignment.annotations;
  const input: SaveInput = {
    assignment_id: Number(assignment.id),
    assignment: { ...assignment, annotations } as SaveInput["assignment"],
  };
  return trpc.annotator.save.mutate(input);
}

// --- Work left behind by the Label Studio editor --------------------------
//
// Label Studio kept every unsaved edit in localStorage (AnnotationsLocalStorage)
// and offered it back on the next visit. Someone mid-document when this
// release goes out would otherwise lose that work, so it is read once, in
// Label Studio's serialization, and handed to the kit as the document's
// content. It is only removed after that assignment is saved successfully.

type LsResult = {
  id: string;
  from_name?: string;
  type: string;
  meta?: { text?: string[] };
  value?: {
    start?: number | string;
    end?: number | string;
    text?: string;
    labels?: string[];
    hypertextlabels?: string[];
    choices?: string[];
    rating?: number;
    globalOffsets?: { start: number; end: number };
  };
  from_id?: string;
  to_id?: string;
  direction?: "bi" | "left" | "right";
  labels?: string[];
};

/** Label Studio's unsaved work on this assignment, in the kit's shape. */
export function readLabelStudioDraft(
  assignmentId: number
): Pick<Assignment, "annotations" | "document_annotations" | "confidence"> | null {
  let results: LsResult[] | null = null;
  try {
    results = new AnnotationsLocalStorage(assignmentId).get();
  } catch {
    return null;
  }
  if (!Array.isArray(results)) return null;

  let confidence = 0;
  const ratings = new Map<string, number>();
  for (const r of results) {
    if (r.type !== "rating") continue;
    if (r.from_name === "doc_confidence") confidence = r.value?.rating ?? 0;
    else if (r.from_name === "ann_confidence") ratings.set(r.id, r.value?.rating ?? 0);
  }

  // Temporary ids are negative, as the kit's own are, until the row is saved.
  let nextId = -1;
  const annotations: Annotation[] = [];
  const document_annotations: DocumentAnnotation[] = [];
  const byRegion = new Map<string, Annotation>();

  for (const r of results) {
    if (r.type === "labels" || r.type === "hypertextlabels") {
      const html = r.type === "hypertextlabels";
      const start = Number(html ? r.value?.globalOffsets?.start : r.value?.start);
      const end = Number(html ? r.value?.globalOffsets?.end : r.value?.end);
      if (!Number.isFinite(start) || !Number.isFinite(end)) continue;
      for (const label of (html ? r.value?.hypertextlabels : r.value?.labels) ?? []) {
        const annotation: Annotation = {
          id: nextId--,
          start,
          end,
          label,
          text: r.value?.text ?? "",
          relations: [],
          confidence: ratings.get(r.id) ?? 0,
          metadata: r.meta?.text?.join() || null,
        };
        annotations.push(annotation);
        if (!byRegion.has(r.id)) byRegion.set(r.id, annotation);
      }
    } else if (r.type === "choices") {
      for (const label of r.value?.choices ?? []) {
        document_annotations.push({ id: nextId--, label, confidence });
      }
    }
  }

  for (const r of results) {
    if (r.type !== "relation" || !r.from_id || !r.to_id) continue;
    const from = byRegion.get(r.from_id);
    const to = byRegion.get(r.to_id);
    if (from && to) {
      from.relations.push({ to: to.id, direction: r.direction ?? "right", labels: r.labels ?? [] });
    }
  }

  return { annotations, document_annotations, confidence };
}

export function clearLabelStudioDraft(assignmentId: number): void {
  try {
    new AnnotationsLocalStorage(assignmentId).clear();
  } catch {
    // Storage unavailable: there was nothing to clear.
  }
}

/** The bundle, with Label Studio's unsaved work in it if there is any. */
export function withLabelStudioDraft(bundle: AssignmentBundle): {
  bundle: AssignmentBundle;
  fromDraft: boolean;
} {
  const id = Number(bundle.assignment.id);
  const draft = Number.isFinite(id) ? readLabelStudioDraft(id) : null;
  if (!draft) return { bundle, fromDraft: false };
  return { bundle: { ...bundle, assignment: { ...bundle.assignment, ...draft } }, fromDraft: true };
}
