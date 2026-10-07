// The task import file format, checked in full before anything is created, so
// a file is either imported whole or refused with every reason listed. It is
// the format the task export writes; README.md ("Importing tasks") documents
// it for people and tools that write such files by hand.
//
// Plain data and functions only (no imports), so it also runs under plain Node.

export const ANNOTATION_LEVELS = ["symbol", "word", "sentence", "paragraph", "document"] as const;
export const ASSIGNMENT_STATUSES = ["pending", "done", "pre-annotated", "predicting", "failed"] as const;
export const RELATION_DIRECTIONS = ["right", "left", "bi"] as const;
export const RELATION_LABELS = [
  "Is a",
  "Has a",
  "Belongs to",
  "Implies",
  "Depends on",
  "Related to",
  "Is not",
  "Part of",
] as const;
export const CONFIDENCE_MAX = 5;

const TOP_KEYS = ["name", "desc", "ann_guidelines", "labelset", "annotation_level", "documents", "counts", "ml_model_id"];
const LABELSET_KEYS = ["name", "desc", "labels"];
const LABEL_KEYS = ["name", "color"];
const DOCUMENT_KEYS = ["name", "full_text", "assignments"];
const ASSIGNMENT_KEYS = ["annotator", "order", "status", "difficulty_rating", "annotations", "document_relations"];
// ls_id and html_metadata: written by exports made while Label Studio was in use.
const ANNOTATION_KEYS = ["start", "end", "label", "text", "confidence_rating", "metadata", "relations", "ls_id", "html_metadata"];
const RELATION_KEYS = ["to", "direction", "labels"];
const DOCUMENT_RELATION_KEYS = ["to", "to_order", "labels"];
const COUNT_KEYS = ["documents", "assignments", "annotators", "annotations", "relations", "document_relations"];

/** At most this many distinct problems are listed. */
const MAX_PROBLEMS = 25;

const isObject = (v: unknown): v is Record<string, any> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const isInt = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v);
const show = (v: unknown) => {
  const s = JSON.stringify(v);
  return s === undefined ? String(v) : s.length > 60 ? `${s.slice(0, 57)}...` : s;
};

/**
 * Every problem with an import file, as "path: what is wrong" lines; empty
 * when the file can be imported as it is.
 */
export function validateTaskImport(json: unknown): string[] {
  // The same mistake usually repeats on every annotation of a file; it is
  // reported once, with how often and where it first occurs. Grouped by the
  // path without its indices and the message without the offending value.
  const problems = new Map<string, { first: string; count: number }>();
  const fail = (path: string, message: string) => {
    const got = message.lastIndexOf(", got ");
    const key = `${path.replace(/\[\d+\]/g, "[]")}: ${got >= 0 ? message.slice(0, got) : message}`;
    const seen = problems.get(key);
    if (seen) seen.count++;
    else problems.set(key, { first: path ? `${path}: ${message}` : message, count: 1 });
  };
  const unknownKeys = (obj: Record<string, any>, allowed: string[], path: string) => {
    for (const key of Object.keys(obj))
      if (!allowed.includes(key)) fail(path ? `${path}.${key}` : key, `unknown field (allowed: ${allowed.join(", ")})`);
  };
  const optionalString = (obj: Record<string, any>, key: string, path: string) => {
    if (obj[key] !== undefined && typeof obj[key] !== "string") fail(`${path}${key}`, `must be a string, got ${show(obj[key])}`);
  };
  const nonEmptyString = (v: unknown, path: string) => {
    if (typeof v !== "string" || !v.trim()) fail(path, `must be a non-empty string, got ${show(v)}`);
  };
  const confidence = (v: unknown, path: string) => {
    if (v === undefined || v === null) return;
    if (!isInt(v) || v < 0 || v > CONFIDENCE_MAX)
      fail(path, `must be a whole number from 0 to ${CONFIDENCE_MAX} (stars), got ${show(v)}`);
  };
  const relationLabels = (v: unknown, path: string) => {
    if (!Array.isArray(v)) return fail(path, `must be a list of relation labels, got ${show(v)}`);
    v.forEach((l, i) => {
      if (!RELATION_LABELS.includes(l)) fail(`${path}[${i}]`, `must be one of ${RELATION_LABELS.map((x) => `"${x}"`).join(", ")}, got ${show(l)}`);
    });
  };
  const done = () => {
    const lines = [...problems.values()].map(({ first, count }) =>
      count > 1 ? `${first} (and ${count - 1} more like it)` : first,
    );
    return lines.length > MAX_PROBLEMS
      ? [...lines.slice(0, MAX_PROBLEMS), `...and ${lines.length - MAX_PROBLEMS} more kind(s) of problem`]
      : lines;
  };

  if (!isObject(json)) {
    fail("", "the file must contain one JSON object");
    return done();
  }
  unknownKeys(json, TOP_KEYS, "");
  optionalString(json, "name", "");
  optionalString(json, "desc", "");
  optionalString(json, "ann_guidelines", "");
  // A link, opened from the annotator's sidebar, as the task form requires.
  if (typeof json.ann_guidelines === "string" && json.ann_guidelines.trim()) {
    let url: URL | null = null;
    try {
      url = new URL(json.ann_guidelines.trim());
    } catch {}
    if (!url || !["http:", "https:"].includes(url.protocol))
      fail("ann_guidelines", `must be a link (http:// or https://) to the guidelines, or empty, got ${show(json.ann_guidelines)}`);
  }
  if (json.ml_model_id !== undefined && json.ml_model_id !== null && !isInt(json.ml_model_id))
    fail("ml_model_id", `must be a whole number, got ${show(json.ml_model_id)}`);

  const level = json.annotation_level ?? "word";
  if (!ANNOTATION_LEVELS.includes(level))
    fail("annotation_level", `must be one of ${ANNOTATION_LEVELS.map((x) => `"${x}"`).join(", ")}, got ${show(level)}`);
  const documentLevel = level === "document";

  // Labels annotations may use; unknown when the file brings no labelset (the
  // project's first labelset is used then, and labels can't be checked here).
  let labelNames: Set<string> | null = null;
  if (json.labelset !== undefined) {
    const ls = json.labelset;
    if (!isObject(ls)) fail("labelset", `must be an object, got ${show(ls)}`);
    else {
      unknownKeys(ls, LABELSET_KEYS, "labelset");
      nonEmptyString(ls.name, "labelset.name");
      optionalString(ls, "desc", "labelset.");
      if (!Array.isArray(ls.labels) || !ls.labels.length) fail("labelset.labels", "must be a non-empty list of labels");
      else {
        labelNames = new Set();
        ls.labels.forEach((label: unknown, i: number) => {
          const p = `labelset.labels[${i}]`;
          if (!isObject(label)) return fail(p, `must be an object { name, color }, got ${show(label)}`);
          unknownKeys(label, LABEL_KEYS, p);
          nonEmptyString(label.name, `${p}.name`);
          if (typeof label.color !== "string" || !/^#[0-9a-fA-F]{6}$/.test(label.color))
            fail(`${p}.color`, `must be a colour like "#1f77b4", got ${show(label.color)}`);
          if (typeof label.name === "string") {
            if (labelNames!.has(label.name)) fail(`${p}.name`, `"${label.name}" is listed twice`);
            labelNames!.add(label.name);
          }
        });
      }
    }
  }

  if (!Array.isArray(json.documents) || !json.documents.length) {
    fail("documents", "must be a non-empty list of documents");
    return done();
  }

  const actual = { documents: json.documents.length, assignments: 0, annotations: 0, relations: 0, document_relations: 0 };
  const annotatorNumbers = new Set<number>();
  // Orders per annotator, to check uniqueness and resolve document links.
  const ordersByAnnotator = new Map<number, Set<number>>();
  const links: { path: string; annotator: number; order: number; toOrder: number }[] = [];

  json.documents.forEach((doc: unknown, d: number) => {
    const dp = `documents[${d}]`;
    if (!isObject(doc)) return fail(dp, `must be an object, got ${show(doc)}`);
    unknownKeys(doc, DOCUMENT_KEYS, dp);
    nonEmptyString(doc.name, `${dp}.name`);
    nonEmptyString(doc.full_text, `${dp}.full_text`);
    const text: string = typeof doc.full_text === "string" ? doc.full_text : "";
    if (doc.assignments === undefined) return;
    if (!Array.isArray(doc.assignments)) return fail(`${dp}.assignments`, `must be a list, got ${show(doc.assignments)}`);

    doc.assignments.forEach((ass: unknown, a: number) => {
      const ap = `${dp}.assignments[${a}]`;
      actual.assignments++;
      if (!isObject(ass)) return fail(ap, `must be an object, got ${show(ass)}`);
      unknownKeys(ass, ASSIGNMENT_KEYS, ap);

      const annotatorOk = isInt(ass.annotator) && ass.annotator >= 1;
      if (!annotatorOk) fail(`${ap}.annotator`, `must be a whole number from 1 (the annotator's number), got ${show(ass.annotator)}`);
      else annotatorNumbers.add(ass.annotator);

      const orderOk = isInt(ass.order) && ass.order >= 1;
      if (!orderOk) fail(`${ap}.order`, `must be a whole number from 1 (position in the annotator's queue), got ${show(ass.order)}`);
      if (annotatorOk && orderOk) {
        const orders = ordersByAnnotator.get(ass.annotator) ?? new Set<number>();
        if (orders.has(ass.order)) fail(`${ap}.order`, `annotator ${ass.annotator} already has an assignment with order ${ass.order}`);
        orders.add(ass.order);
        ordersByAnnotator.set(ass.annotator, orders);
      }

      if (ass.status !== undefined && !ASSIGNMENT_STATUSES.includes(ass.status))
        fail(`${ap}.status`, `must be one of ${ASSIGNMENT_STATUSES.map((x) => `"${x}"`).join(", ")}, got ${show(ass.status)}`);
      confidence(ass.difficulty_rating, `${ap}.difficulty_rating`);

      const anns = ass.annotations ?? [];
      if (!Array.isArray(anns)) fail(`${ap}.annotations`, `must be a list, got ${show(anns)}`);
      else {
        const seen = new Set<string>();
        anns.forEach((ann: unknown, n: number) => {
          const np = `${ap}.annotations[${n}]`;
          actual.annotations++;
          if (!isObject(ann)) return fail(np, `must be an object, got ${show(ann)}`);
          unknownKeys(ann, ANNOTATION_KEYS, np);
          if (ann.html_metadata !== undefined && ann.html_metadata !== null)
            fail(`${np}.html_metadata`, "annotations on HTML markup are no longer supported: give the document as plain text and the offsets into it");

          if (typeof ann.label !== "string" || !ann.label) fail(`${np}.label`, `must be a non-empty string, got ${show(ann.label)}`);
          else if (labelNames && !labelNames.has(ann.label)) fail(`${np}.label`, `"${ann.label}" is not a label of the labelset`);
          confidence(ann.confidence_rating, `${np}.confidence_rating`);
          if (ann.metadata !== undefined && ann.metadata !== null && typeof ann.metadata !== "string")
            fail(`${np}.metadata`, `must be a string or null, got ${show(ann.metadata)}`);

          if (documentLevel) {
            // A tag on the whole document: no offsets, no relations.
            if (ann.relations !== undefined && (!Array.isArray(ann.relations) || ann.relations.length))
              fail(`${np}.relations`, "document-level tags cannot have relations; use document_relations on the assignment");
            const key = String(ann.label);
            if (seen.has(key)) fail(`${np}.label`, `"${key}" is tagged twice on this assignment`);
            seen.add(key);
            return;
          }

          const spanOk =
            isInt(ann.start) && isInt(ann.end) && ann.start >= 0 && ann.end > ann.start && ann.end <= text.length;
          if (!spanOk)
            fail(np, `start and end must be whole numbers with 0 <= start < end <= ${text.length} (the document's length), got start ${show(ann.start)}, end ${show(ann.end)}`);
          else if (ann.text !== text.slice(ann.start, ann.end))
            fail(`${np}.text`, `must equal full_text from start to end, i.e. ${show(text.slice(ann.start, ann.end))}, got ${show(ann.text)}`);
          const key = `${ann.label}|${ann.start}|${ann.end}`;
          if (seen.has(key)) fail(np, `the same label on the same span appears twice on this assignment`);
          seen.add(key);

          const rels = ann.relations ?? [];
          if (!Array.isArray(rels)) return fail(`${np}.relations`, `must be a list, got ${show(rels)}`);
          const targets = new Set<number>();
          rels.forEach((rel: unknown, r: number) => {
            const rp = `${np}.relations[${r}]`;
            actual.relations++;
            if (!isObject(rel)) return fail(rp, `must be an object, got ${show(rel)}`);
            unknownKeys(rel, RELATION_KEYS, rp);
            if (!isInt(rel.to) || rel.to < 0 || rel.to >= anns.length || rel.to === n)
              fail(`${rp}.to`, `must be the index (from 0) of another annotation of this assignment, got ${show(rel.to)}`);
            else if (targets.has(rel.to)) fail(`${rp}.to`, `annotation ${n} already has a relation to annotation ${rel.to}`);
            else targets.add(rel.to);
            if (!RELATION_DIRECTIONS.includes(rel.direction))
              fail(`${rp}.direction`, `must be one of ${RELATION_DIRECTIONS.map((x) => `"${x}"`).join(", ")}, got ${show(rel.direction)}`);
            relationLabels(rel.labels, `${rp}.labels`);
          });
        });
      }

      const docRels = ass.document_relations ?? [];
      if (!Array.isArray(docRels)) return fail(`${ap}.document_relations`, `must be a list, got ${show(docRels)}`);
      if (docRels.length && !documentLevel)
        return fail(`${ap}.document_relations`, `only document-level tasks (annotation_level "document") can link documents`);
      const linked = new Set<number>();
      docRels.forEach((rel: unknown, r: number) => {
        const rp = `${ap}.document_relations[${r}]`;
        actual.document_relations++;
        if (!isObject(rel)) return fail(rp, `must be an object, got ${show(rel)}`);
        unknownKeys(rel, DOCUMENT_RELATION_KEYS, rp);
        if (rel.to !== undefined && typeof rel.to !== "string") fail(`${rp}.to`, `must be the target document's name, got ${show(rel.to)}`);
        if (!isInt(rel.to_order)) fail(`${rp}.to_order`, `must be the order of the target assignment, got ${show(rel.to_order)}`);
        else if (linked.has(rel.to_order)) fail(`${rp}.to_order`, `this assignment already links to order ${rel.to_order}`);
        else {
          linked.add(rel.to_order);
          if (annotatorOk && orderOk) links.push({ path: `${rp}.to_order`, annotator: ass.annotator, order: ass.order, toOrder: rel.to_order });
        }
        relationLabels(rel.labels, `${rp}.labels`);
      });
    });
  });

  // A link points at another assignment of the same annotator, by its order.
  for (const link of links) {
    if (link.toOrder === link.order) fail(link.path, "a document cannot link to itself");
    else if (!ordersByAnnotator.get(link.annotator)?.has(link.toOrder))
      fail(link.path, `annotator ${link.annotator} has no assignment with order ${link.toOrder}`);
  }

  // counts: the import reads these to decide what to create, so they must
  // match what the file holds.
  const annotators = annotatorNumbers.size ? Math.max(...annotatorNumbers) : 0;
  const expected: Record<string, number> = { ...actual, annotators };
  const counts = json.counts;
  if (counts === undefined) {
    if (actual.assignments) fail("counts", `is required when documents have assignments: ${show(expected)}`);
  } else if (!isObject(counts)) fail("counts", `must be an object, got ${show(counts)}`);
  else {
    unknownKeys(counts, COUNT_KEYS, "counts");
    for (const key of COUNT_KEYS) {
      const given = counts[key] ?? 0;
      if (given !== expected[key]) fail(`counts.${key}`, `must be ${expected[key]} to match the file, got ${show(counts[key])}`);
    }
  }
  for (let n = 1; n <= annotators; n++)
    if (!annotatorNumbers.has(n)) fail("", `annotators must be numbered 1 to ${annotators} without gaps, but no assignment has annotator ${n}`);

  return done();
}
