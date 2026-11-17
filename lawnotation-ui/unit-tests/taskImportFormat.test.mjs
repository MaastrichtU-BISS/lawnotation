// pnpm test:unit
import { test } from "node:test";
import assert from "node:assert/strict";
import { validateTaskImport } from "../utils/taskImportFormat.ts";

const TEXT = "The Seller shall deliver the goods. The Buyer shall pay.";

/** A small valid word-level task with one annotator, two spans and a relation. */
const spanTask = () => ({
  name: "Sale",
  desc: "Sales contracts",
  ann_guidelines: "https://example.org/guidelines",
  labelset: {
    name: "Contract",
    desc: "",
    labels: [
      { name: "Party", color: "#1f77b4" },
      { name: "Obligation", color: "#ff7f0e" },
    ],
  },
  span_granularity: "word",
  documents: [
    {
      name: "sale.txt",
      full_text: TEXT,
      assignments: [
        {
          annotator: 1,
          order: 1,
          status: "pending",
          difficulty_rating: 0,
          annotations: [
            { start: 4, end: 10, label: "Party", text: "Seller", confidence_rating: 4, metadata: null, relations: [{ to: 1, direction: "right", labels: ["Has a"] }] },
            { start: 11, end: 34, label: "Obligation", text: "shall deliver the goods", confidence_rating: 0, metadata: "pre-annotated", relations: [] },
          ],
          document_relations: [],
        },
      ],
    },
  ],
  counts: { documents: 1, assignments: 1, annotators: 1, annotations: 2, relations: 1, document_relations: 0 },
});

/** A valid document-level task: tags without offsets, and a link between documents. */
const documentTask = () => ({
  name: "Linked rulings",
  labelset: { name: "Topics", labels: [{ name: "Privacy", color: "#2ca02c" }] },
  span_granularity: "document",
  documents: [
    {
      name: "a.txt",
      full_text: "First ruling.",
      assignments: [
        {
          annotator: 1,
          order: 1,
          annotations: [{ label: "Privacy", confidence_rating: 3, metadata: null }],
          document_relations: [{ to: "b.txt", to_order: 2, labels: ["Related to"] }],
        },
      ],
    },
    { name: "b.txt", full_text: "Second ruling.", assignments: [{ annotator: 1, order: 2, annotations: [] }] },
  ],
  counts: { documents: 2, assignments: 2, annotators: 1, annotations: 1, relations: 0, document_relations: 1 },
});

const firstSpan = (task) => task.documents[0].assignments[0].annotations[0];
const expectProblem = (task, ...fragments) => {
  const problems = validateTaskImport(task);
  for (const fragment of fragments)
    assert.ok(
      problems.some((p) => p.includes(fragment)),
      `expected a problem containing ${JSON.stringify(fragment)}, got:\n${problems.join("\n")}`,
    );
};

test("valid files pass", () => {
  assert.deepEqual(validateTaskImport(spanTask()), []);
  assert.deepEqual(validateTaskImport(documentTask()), []);
  // Documents only: no assignments, no counts needed.
  assert.deepEqual(validateTaskImport({ name: "Docs", documents: [{ name: "a.txt", full_text: "Text." }] }), []);
});

test("exports made while Label Studio was in use still pass", () => {
  const task = spanTask();
  Object.assign(firstSpan(task), { ls_id: "abc-0", html_metadata: null });
  assert.deepEqual(validateTaskImport(task), []);
});

test("confidence must be 0 to 5 stars", () => {
  const task = spanTask();
  firstSpan(task).confidence_rating = 90;
  task.documents[0].assignments[0].difficulty_rating = 2.5;
  expectProblem(task, "annotations[0].confidence_rating: must be a whole number from 0 to 5 (stars), got 90", "difficulty_rating");
});

test("repeated problems are reported once, with a count", () => {
  const task = spanTask();
  for (const ann of task.documents[0].assignments[0].annotations) ann.confidence_rating = 100;
  const problems = validateTaskImport(task);
  assert.equal(problems.length, 1);
  assert.match(problems[0], /annotations\[0\]\.confidence_rating: .* got 100 \(and 1 more like it\)/);
});

test("spans must lie in the text and quote it exactly", () => {
  let task = spanTask();
  firstSpan(task).text = "seller";
  expectProblem(task, 'must equal full_text from start to end, i.e. "Seller"');

  task = spanTask();
  firstSpan(task).end = TEXT.length + 1;
  expectProblem(task, `0 <= start < end <= ${TEXT.length}`);

  task = spanTask();
  firstSpan(task).start = 10;
  expectProblem(task, "0 <= start < end");
});

test("labels must come from the labelset", () => {
  const task = spanTask();
  firstSpan(task).label = "Date";
  expectProblem(task, '"Date" is not a label of the labelset');
});

test("unknown fields are refused, naming the allowed ones", () => {
  const task = spanTask();
  firstSpan(task).confidence = 3;
  task.documents[0].reasoning_trace = "...";
  expectProblem(task, "annotations[0].confidence: unknown field", "documents[0].reasoning_trace: unknown field (allowed: name, full_text, assignments)");
});

test("each annotator's orders are unique", () => {
  const task = spanTask();
  task.documents.push({ name: "b.txt", full_text: "B.", assignments: [{ annotator: 1, order: 1, annotations: [] }] });
  task.counts.documents = 2;
  task.counts.assignments = 2;
  expectProblem(task, "annotator 1 already has an assignment with order 1");
});

test("counts must match the file", () => {
  const task = spanTask();
  task.counts.annotations = 5;
  delete task.counts.relations;
  expectProblem(task, "counts.annotations: must be 2", "counts.relations: must be 1");

  const noCounts = spanTask();
  delete noCounts.counts;
  expectProblem(noCounts, "counts: is required");
});

test("annotators are numbered from 1 without gaps", () => {
  const task = spanTask();
  task.documents[0].assignments[0].annotator = 2;
  task.counts.annotators = 2;
  expectProblem(task, "no assignment has annotator 1");
});

test("relations point at another annotation of the same assignment", () => {
  let task = spanTask();
  firstSpan(task).relations[0].to = 0;
  expectProblem(task, "relations[0].to: must be the index");

  task = spanTask();
  firstSpan(task).relations[0].labels = ["Causes"];
  firstSpan(task).relations[0].direction = "both";
  expectProblem(task, 'labels[0]: must be one of "Is a"', 'direction: must be one of "right", "left", "bi"');
});

test("a labelset's own relation labels replace the defaults", () => {
  let task = spanTask();
  task.labelset.relation_labels = ["Sells to"];
  firstSpan(task).relations[0].labels = ["Sells to"];
  assert.deepEqual(validateTaskImport(task), []);

  task = spanTask();
  task.labelset.relation_labels = ["Sells to"];
  expectProblem(task, 'labels[0]: must be one of "Sells to"');

  task = documentTask();
  task.labelset.relation_labels = ["Cites"];
  task.documents[0].assignments[0].document_relations[0].labels = ["Cites"];
  assert.deepEqual(validateTaskImport(task), []);

  task = spanTask();
  task.labelset.relation_labels = null;
  assert.deepEqual(validateTaskImport(task), []);

  for (const bad of [[], ["A", "A"], [""], "Is a"]) {
    task = spanTask();
    task.labelset.relation_labels = bad;
    expectProblem(task, "labelset.relation_labels");
  }
});

test("without a labelset any relation label is accepted", () => {
  const task = spanTask();
  delete task.labelset;
  firstSpan(task).relations[0].labels = ["Sells to"];
  const problems = validateTaskImport(task);
  assert.ok(!problems.some((p) => p.includes("relations[0].labels")), problems.join("\n"));
});

test("HTML-based annotations are refused", () => {
  const task = spanTask();
  firstSpan(task).html_metadata = { start: "/p[1]/text()[1]", end: "/p[1]/text()[1]", startOffset: 0, endOffset: 4 };
  expectProblem(task, "annotations on HTML markup are no longer supported");
});

test("document links only on document-level tasks, to an existing order", () => {
  let task = documentTask();
  task.documents[0].assignments[0].document_relations[0].to_order = 7;
  expectProblem(task, "annotator 1 has no assignment with order 7");

  task = documentTask();
  task.documents[0].assignments[0].document_relations[0].to_order = 1;
  expectProblem(task, "a document cannot link to itself");

  task = spanTask();
  task.documents[0].assignments[0].document_relations = [{ to_order: 1, labels: [] }];
  task.counts.document_relations = 1;
  expectProblem(task, "only document-level and hybrid tasks");
});

test("document-level tags have no relations and no duplicates", () => {
  const task = documentTask();
  const tags = task.documents[0].assignments[0].annotations;
  tags.push({ label: "Privacy" });
  tags[0].relations = [{ to: 1, direction: "right", labels: [] }];
  task.counts.annotations = 2;
  expectProblem(task, '"Privacy" is tagged twice', "document-level tags cannot have relations");
});

test("guidelines are a link", () => {
  const task = spanTask();
  task.ann_guidelines = "# Guidelines\nMark the parties.";
  expectProblem(task, "ann_guidelines: must be a link (http:// or https://)");
  task.ann_guidelines = "";
  assert.deepEqual(validateTaskImport(task), []);
});

test("the top level must be a task object with documents", () => {
  expectProblem([], "the file must contain one JSON object");
  expectProblem({ name: "x" }, "documents: must be a non-empty list");
  expectProblem({ documents: [{ name: "a", full_text: "" }] }, "full_text: must be a non-empty string");
  expectProblem({ span_granularity: "token", documents: [{ name: "a", full_text: "x" }] }, 'span_granularity: must be one of "symbol"');
});

/** A valid hybrid task: spans from `labelset`, tags on the whole document from `document_labelset`. */
const hybridTask = () => {
  const task = spanTask();
  task.document_labelset = {
    name: "Relevance",
    desc: "",
    labels: [
      { name: "Relevant", color: "#2ca02c" },
      { name: "Party", color: "#d62728" }, // may share a name with a span label
    ],
  };
  const assignment = task.documents[0].assignments[0];
  assignment.document_annotations = [
    { label: "Relevant", confidence_rating: 3, metadata: null },
    { label: "Party", confidence_rating: 0 },
  ];
  assignment.document_relations = [{ to: "b.txt", to_order: 2, labels: ["Related to"] }];
  task.documents.push({ name: "b.txt", full_text: "Other.", assignments: [{ annotator: 1, order: 2 }] });
  task.counts = { documents: 2, assignments: 2, annotators: 1, annotations: 2, document_annotations: 2, relations: 1, document_relations: 1 };
  return task;
};

test("a hybrid file passes", () => {
  assert.deepEqual(validateTaskImport(hybridTask()), []);
});

test("document annotations need a document labelset", () => {
  const task = spanTask();
  task.documents[0].assignments[0].document_annotations = [{ label: "Party" }];
  task.counts.document_annotations = 1;
  expectProblem(task, "only hybrid tasks");
});

test("a document labelset is for span-level tasks and needs the span labelset", () => {
  const document = documentTask();
  document.document_labelset = { name: "More", labels: [{ name: "X", color: "#000000" }] };
  expectProblem(document, "only span-level tasks can have a document labelset");

  const task = hybridTask();
  delete task.labelset;
  expectProblem(task, "needs a labelset too");
});

test("document tags must use the document labelset and appear once", () => {
  const task = hybridTask();
  const tags = task.documents[0].assignments[0].document_annotations;
  tags[1].label = "Nope";
  expectProblem(task, '"Nope" is not a label of the document_labelset');
  tags[1].label = "Relevant";
  expectProblem(task, '"Relevant" is tagged twice');
});

test("hybrid counts include the document annotations", () => {
  const task = hybridTask();
  task.counts.document_annotations = 5;
  expectProblem(task, "counts.document_annotations: must be 2");
});

test("span annotations of a hybrid task are still checked as spans", () => {
  const task = hybridTask();
  firstSpan(task).end = 9999;
  expectProblem(task, "start and end must be whole numbers");
});

test("annotation_level is still accepted as the old name of span_granularity", () => {
  const task = spanTask();
  task.annotation_level = task.span_granularity;
  delete task.span_granularity;
  assert.deepEqual(validateTaskImport(task), []);
  const document = documentTask();
  document.annotation_level = "document";
  delete document.span_granularity;
  assert.deepEqual(validateTaskImport(document), []);
  expectProblem({ annotation_level: "token", documents: [{ name: "a", full_text: "x" }] }, 'annotation_level: must be one of "symbol"');
});

test("giving both span_granularity and annotation_level is refused", () => {
  const task = spanTask();
  task.annotation_level = "word";
  expectProblem(task, "annotation_level: is the old name of span_granularity");
});

// --- relation labels of a hybrid task: span relations use the span labelset's,
// --- document relations the document labelset's (default eight if it has none).

const withDocumentRelationLabel = (task, label) => {
  task.documents[0].assignments[0].document_relations[0].labels = [label];
  return task;
};

test("a hybrid file's document relations may use the document labelset's own relation labels", () => {
  const task = withDocumentRelationLabel(hybridTask(), "Cites");
  task.document_labelset.relation_labels = ["Cites", "Overrules"];
  assert.deepEqual(validateTaskImport(task), []);
});

test("without its own, a document labelset's relations use the default eight", () => {
  assert.deepEqual(validateTaskImport(withDocumentRelationLabel(hybridTask(), "Part of")), []);
  expectProblem(withDocumentRelationLabel(hybridTask(), "Cites"), 'must be one of "Is a"');
});

test("the span labelset's relation labels do not apply to document relations", () => {
  const task = withDocumentRelationLabel(hybridTask(), "Cites");
  task.labelset.relation_labels = ["Cites"]; // only the span labelset has it
  expectProblem(task, 'document_relations[0].labels[0]: must be one of "Is a"');
});

test("the document labelset's relation labels do not apply to span relations", () => {
  const task = hybridTask();
  task.document_labelset.relation_labels = ["Cites"];
  firstSpan(task).relations[0].labels = ["Cites"]; // a span relation
  expectProblem(task, 'annotations[0].relations[0].labels[0]: must be one of "Is a"');
});

test("each labelset keeps its own list: span and document relations can use different ones", () => {
  const task = withDocumentRelationLabel(hybridTask(), "Cites");
  task.labelset.relation_labels = ["Has a"];
  task.document_labelset.relation_labels = ["Cites"];
  assert.deepEqual(validateTaskImport(task), []);
});

test("a document labelset's relation labels are checked like a labelset's", () => {
  const task = hybridTask();
  task.document_labelset.relation_labels = [];
  expectProblem(task, "document_labelset.relation_labels: must be null or a non-empty list");
  task.document_labelset.relation_labels = ["Cites", "Cites"];
  expectProblem(task, "document_labelset.relation_labels: lists a relation label twice");
  task.document_labelset.relation_labels = null;
  assert.deepEqual(validateTaskImport(task), []);
});

test("in a document-level task the task's one labelset gives the document relations' labels", () => {
  const task = documentTask();
  task.labelset.relation_labels = ["Cites"];
  task.documents[0].assignments[0].document_relations[0].labels = ["Cites"];
  assert.deepEqual(validateTaskImport(task), []);
});
