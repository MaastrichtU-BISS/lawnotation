# Lawnotation task import format

A task can be created from a JSON file: in a project, **Add task → Import**. The file holds the task, its labels, its documents and, optionally, the annotators' assignments with annotations already made (for example pre-annotations to be corrected). It is the same format Lawnotation writes when a task is exported, so an export can always be imported again.

Lawnotation checks the whole file before creating anything. If anything is wrong the file is refused, nothing is created, and every problem is listed with where it is, such as `documents[3].assignments[0].annotations[12].confidence_rating: must be a whole number from 0 to 5 (stars), got 90`. A file is imported completely or not at all.

You can run the same check before uploading, from the `lawnotation-ui` folder of this repository (Node.js 22.13 or later):

```
node --experimental-strip-types scripts/validate-task-import.mjs task.json
```

## Example

A word-level task with one annotator, two documents, two pre-annotated spans and a relation between them:

```json
{
  "name": "Sales contracts",
  "desc": "Mark the parties and their obligations.",
  "ann_guidelines": "https://example.org/guidelines.pdf",
  "labelset": {
    "name": "Contract roles",
    "desc": "",
    "labels": [
      { "name": "Party", "color": "#1f77b4" },
      { "name": "Obligation", "color": "#ff7f0e" }
    ]
  },
  "annotation_level": "word",
  "documents": [
    {
      "name": "sale-001.txt",
      "full_text": "The Seller shall deliver the goods. The Buyer shall pay.",
      "assignments": [
        {
          "annotator": 1,
          "order": 1,
          "status": "pending",
          "difficulty_rating": 0,
          "annotations": [
            {
              "start": 4,
              "end": 10,
              "label": "Party",
              "text": "Seller",
              "confidence_rating": 4,
              "metadata": "pre-annotated by model X",
              "relations": [{ "to": 1, "direction": "right", "labels": ["Has a"] }]
            },
            {
              "start": 11,
              "end": 34,
              "label": "Obligation",
              "text": "shall deliver the goods",
              "confidence_rating": 0,
              "metadata": null,
              "relations": []
            }
          ],
          "document_relations": []
        }
      ]
    },
    {
      "name": "sale-002.txt",
      "full_text": "The Tenant shall pay rent monthly.",
      "assignments": [
        { "annotator": 1, "order": 2, "status": "pending", "difficulty_rating": 0, "annotations": [], "document_relations": [] }
      ]
    }
  ],
  "counts": {
    "documents": 2,
    "assignments": 2,
    "annotators": 1,
    "annotations": 2,
    "relations": 1,
    "document_relations": 0
  }
}
```

The smallest valid file has only documents. The task is then created with those documents and no assignments:

```json
{ "name": "Rulings", "documents": [{ "name": "ruling-1.txt", "full_text": "..." }] }
```

## Fields

Only the fields below are allowed. Any other field is refused, so a misspelt name (`confidence` instead of `confidence_rating`) is caught rather than silently ignored. Put extra information, such as a model's reasoning, in an annotation's `metadata`.

### Task (top level)

| Field | Required | Value |
|---|---|---|
| `name` | no | Task name. |
| `desc` | no | Task description. |
| `ann_guidelines` | no | A link (`http://` or `https://`) to the annotation guidelines, opened from the annotator's sidebar, or `""`. Not the guidelines' text. |
| `labelset` | no | The labels to annotate with (see below). Without it the task uses the project's first labelset, and labels can't be checked before importing, so include it. |
| `annotation_level` | no | `"symbol"`, `"word"` (default), `"sentence"`, `"paragraph"` or `"document"`. Sets how selections snap while annotating. `"document"` means annotators tag whole documents instead of marking text. |
| `documents` | yes | The documents, at least one (see below). |
| `counts` | when there are assignments | Totals that must match the file exactly (see below). |

### `labelset`

| Field | Required | Value |
|---|---|---|
| `name` | yes | Labelset name. |
| `desc` | no | Description. |
| `labels` | yes | At least one `{ "name": "...", "color": "#rrggbb" }`. Names must be unique. Colours are 6-digit hex. |

### Document (`documents[]`)

| Field | Required | Value |
|---|---|---|
| `name` | yes | Shown to annotators, for example `ruling-2024-15.txt`. |
| `full_text` | yes | The document as **plain text**. HTML is not interpreted: convert it to text first. Annotation offsets point into exactly this string. |
| `assignments` | no | Who annotates this document (see below). |

### Assignment (`documents[].assignments[]`)

One annotator's work on one document.

| Field | Required | Value |
|---|---|---|
| `annotator` | yes | The annotator's number: 1, 2, 3, ... When importing, the person importing gives an email address for each number. Use the numbers from 1 upwards without gaps. |
| `order` | yes | Position of this document in that annotator's queue, from 1. **Each annotator's orders must be unique**: annotator 1 with 16 documents has orders 1 to 16. |
| `status` | no | `"pending"` (still to annotate) or `"done"`. The import dialog can also set every assignment to one status. |
| `difficulty_rating` | no | The annotator's confidence in the whole document, 0 to 5 stars. 0 means not rated. Default 0. |
| `annotations` | no | Annotations already made (see below). |
| `document_relations` | no | Links from this document to others (document-level tasks only, see below). |

### Annotation (`documents[].assignments[].annotations[]`)

On a text task (any level except `"document"`), an annotation marks a span of `full_text`:

| Field | Required | Value |
|---|---|---|
| `start` | yes | Offset of the first character, from 0. |
| `end` | yes | Offset just past the last character: `0 <= start < end <= length of full_text`. |
| `text` | yes | Must equal `full_text` from `start` to `end`, character for character. |
| `label` | yes | A label name from the labelset. |
| `confidence_rating` | no | Confidence in this annotation, a whole number of stars from **0 to 5**. 0 means not rated. Default 0. Not a percentage: convert a model's 0–100 score yourself, for example `round(score / 20)`. |
| `metadata` | no | Free text shown with the annotation, or `null`. |
| `relations` | no | Relations from this annotation to others of the same assignment (see below). |

The same label on the same span may appear only once per assignment.

Offsets count characters as JavaScript does (UTF-16 code units). In Python, `full_text[start:end]` gives the same result unless the text contains characters outside the Basic Multilingual Plane, such as emoji. For those, convert the offsets. Line breaks count as characters: `"\r\n"` is two.

On a **document-level** task (`"annotation_level": "document"`), an annotation is a tag on the whole document. Only `label`, `confidence_rating` and `metadata` apply. `start`, `end` and `text` are ignored, and a tag can't have `relations`. Each label can tag a document once per assignment.

### Relation (`annotations[].relations[]`)

| Field | Required | Value |
|---|---|---|
| `to` | yes | Index, from 0, of the target annotation in the **same assignment's** `annotations` list. Not itself, and at most one relation per target. |
| `direction` | yes | `"right"` (from this annotation to the target), `"left"` (from the target to this one) or `"bi"` (both ways). |
| `labels` | yes | Zero or more of: `"Is a"`, `"Has a"`, `"Belongs to"`, `"Implies"`, `"Depends on"`, `"Related to"`, `"Is not"`, `"Part of"`. |

### Document relation (`assignments[].document_relations[]`)

Only on document-level tasks: a link from this document to another document in the same annotator's queue.

| Field | Required | Value |
|---|---|---|
| `to_order` | yes | The `order` of the target assignment of the **same annotator**. Not this assignment's own order, and at most one link per target. |
| `to` | no | The target document's name, for people reading the file. Ignored on import. |
| `labels` | yes | Relation labels, as for relations above. |

### `counts`

Required when any document has assignments. Lawnotation uses these numbers to decide what to create, so each must match the file exactly. A missing count means 0.

| Field | Value |
|---|---|
| `documents` | Number of documents. |
| `assignments` | Number of assignments in all documents. |
| `annotators` | Highest annotator number, which is the number of annotators. |
| `annotations` | Number of annotations in all assignments. |
| `relations` | Number of relations in all annotations. |
| `document_relations` | Number of document relations in all assignments. |

### Older exports

Files exported while Lawnotation used Label Studio also have `ls_id` and `html_metadata` on annotations. They are accepted and ignored, as long as `html_metadata` is `null`. Annotations positioned on HTML markup can't be imported any more: give the document as plain text, with offsets into that text.

## Checklist for generated files

- `full_text` is plain text, and every annotation's `text` is exactly `full_text[start:end]`.
- Confidence values are whole numbers from 0 to 5.
- Every label used is in `labelset.labels`.
- Each annotator's documents have orders 1, 2, 3, ... with no repeats.
- `counts` matches the file.
- No fields beyond those listed above.
- `ann_guidelines` is a link or empty.
- Run `scripts/validate-task-import.mjs` on the file before uploading it.
