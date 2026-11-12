# Lawnotation

![Lawnotation](https://www.lawnotation.org/assets/lawnotation_logo_v2-17f3df90.svg)

Lawnotation is a legal text annotation platform for researchers, legal practioners and more.
Some of the most significant features are: assignment allocation, annotation metrics, discovery of published annotation tasks.

## Features
- PDF, HTML and TXT documents,
- Annotator allocation strategies,
- Advanced annotation insights and metrics,
- Span, document-level and hybrid (span + document tags) annotation tasks,
- JSON import- and export,
- Publishing data,
- Document discovery.

## Quick Start
The easiest and quickest way to get started using Lawnotation is to use the hosted version of the platform. You can sign up for free at [lawnotation.org](lawnotation.org). 
After first sign-in, hints guide you through the application. Refer to the [documentation](https://docs.lawnotation.org/) if additional help is needed.

## Task types
A task is one of three kinds. It is chosen when the task is created and does not change afterwards.

| Kind | Annotators mark | Labelsets | `span_granularity` |
|---|---|---|---|
| **Span** | spans of text | one (`labelset`) | `symbol`, `word`, `sentence` or `paragraph`: how a selection snaps to the text |
| **Document** | the whole document, with tags | one (`labelset`) | `document` |
| **Hybrid** | spans **and** the whole document | two: `labelset` for the spans, `document_labelset` for the document tags | the span granularity, as for a span task |

A task is hybrid exactly when it has a span granularity and a document labelset. The granularity still matters in a hybrid task: it decides how spans snap (a `sentence` hybrid task snaps to whole sentences), and `"document"` is what marks a task that has no spans at all.

### Creating a hybrid task
In a project, **Add task**, pick the labelset, choose **span** as the annotation level and a granularity, then pick a **Document labelset (optional)**. Choosing **document** as the level hides that selector, because a document task already tags documents with its one labelset. The document labelset cannot be changed after the task is created. The same labelset may be used for both slots, and a label may share its name between the two labelsets (the two are told apart by kind everywhere).

Labelsets that tasks use, as span or as document labelset, can be recoloured and reordered but not have labels added, removed or renamed.

### Annotating a hybrid task
The annotator sees the span labels (with hotkeys, as always) and, under them, **Document Tags**, which are toggled by clicking. Span relations and document-to-document relations both work. Document tags carry a confidence and metadata, like spans. The header badge reads, for example, **Word-level + Document tags**. This is the `legal-annotation-kit` component (1.7.0 or later); its `documentLabelset` prop switches the document tags on.

### Document relations
In document and hybrid tasks the annotator can link a document to other documents of their queue (the **Document Relations** panel). Three things make that practical when documents are many or hard to tell apart by name:
- **Search.** The "link to a document…" control is a searchable dropdown: type part of a name or a position (`ruling 12`) and arrow/Enter or click to pick.
- **Read more.** Next to each candidate in that dropdown, and next to each existing relation, a **Read more** button opens the document's full text in a modal, so the annotator can see what a target is before linking to it.
- **View as graph.** A **View as graph** button opens a modal with the documents of the annotator's queue as nodes and the relations among them as labelled arrows. The document being annotated has a thick border, links added but not yet saved are drawn too, hovering a document shows the start of its text, and clicking one opens it in the same text modal.

How the work is split between the packages: `legal-annotation-kit` (1.8.0 or later) only *emits* `view-document` and `view-relation-graph` requests, and only offers the buttons when the host opts in (`preview-documents` / `relation-graph`). Lawnotation decides what they do: it loads the text with `annotator.documentPreview` and the queue's relations with `annotator.relationGraph`, and draws the graph with the generic `NetworkGraph` of `vue-legal-docs-visualizer` (1.3.0 or later), which takes plain nodes and edges and knows nothing about legal documents. The wiring lives in `composables/useDocumentRelationViews.ts` and `components/annotator/DocumentRelationViews.vue`; turning the queue into graph input is the tested function `toRelationGraph` in `utils/relationGraph.ts`. Both endpoints are authorized like opening the assignment itself.

### Metrics for a hybrid task
The metrics page (`vue-iaa-metrics` 1.4.0 or later) shows:
- one annotation list with both kinds, each card marked **SPAN** or **DOCUMENT** (document cards also have an indigo bar and a tinted background) and a header such as `Annotations: 11 (5 span · 6 document)`;
- two label filters, **Span label(s)** and **Document label(s)**. Each also offers **None**, which leaves that kind out of the list and of the computed metrics, for example to look at document tags only;
- agreement results with a **Span labels / Document labels** switch. Span labels get span matching (precision, recall, F1) and coverage agreement; document labels get agreement on whether each annotator applied the label to the document at all (Krippendorff's α, Cohen's κ). Confidence metrics are unchanged.

These are computed by the IAA service ([lawnotation-iaa](https://github.com/MaastrichtU-BISS/lawnotation-iaa), a Go service), which must be a version that understands hybrid input (`annotation_level: "hybrid"`). The Lawnotation server sends it the two labelsets and each assignment's spans and document tags.

### Lists
In the task tables, the **Level** column shows the granularity, plus `+ document tags` for a hybrid task (for example `word + document tags`).

## Importing and exporting tasks
A task, with its labels, documents, annotators' assignments and existing annotations (pre-annotations, for example), can be imported from a JSON file: in a project, **Add task → Import**. It is the format Lawnotation exports tasks in.

The file's `span_granularity` field is the task's granularity (`"document"` for a document task). It was called `annotation_level` in older exports; the importer still accepts that name, but a file must not use both. A hybrid task is exported with a `document_labelset` and, on every assignment, `document_annotations`, which the importer reads back. Files made by other tools or scripts must follow it exactly: the whole file is checked before anything is created, and a file with any problem is refused with every problem listed.

The format, field by field, with an example and a checklist for generated files, is in [TASK_IMPORT_FORMAT.md](TASK_IMPORT_FORMAT.md). To check a file before uploading it, run this from `lawnotation-ui` (Node.js 22.13 or later):

```
node --experimental-strip-types scripts/validate-task-import.mjs task.json
```

## Self-hosting

> [!NOTE]
> We're planning to create an easier self-hosting method only using Docker in the future.

It is also possible to install the platform on your own infrastructure. 
There are some dependencies that have to be resolved in some way or another. Some of these can be self-hosted as well, while others are exclusively external. For this section, use all services externally.

### Prerequisites and dependencies

- **pnpm** (or npm) for installing the required node packages,
- **Docker** for running the Supabase suite locally
- **Supabase** project
  - [Supabase](https://github.com/supabase/supabase) is an open source Firebase alternative. It is being used for interacting with a Postgres database and provides authentication to the users.
  - It is possible to run a Supabase locally, or to create a free project on supabase.com and use those details for self-hosting.
- **SMTP** credentials
  - In order to send OTP-emails and emails for when a user is assigned to a new task, it is needed to define SMTP credentials for sending these mails.

### Steps
**1. Clone the repository set up the directory**
```
git clone https://github.com/MaastrichtU-BISS/lawnotation.git
cd lawnotation-ui
pnpm install
```

**2. Create a project on supabase.com**
- Go to supabase.com, create an account and a project,
- In the project on the left sidebar, go to database,
- Copy the details for step 4

**3. Set-up the .env file**
- First, copy the `.env.example` file to `.env`
- Fill in the correct values:
  - `SUPABASE_URL`: The url for supabase
  - `SUPABASE_KEY`: Supabase anon key
  - `SUPABASE_SERVICE_KEY`: Supabase service key
  - `DATABASE_URL`: Postgres database URL
  - `SMTP_URL`: The connection URL to the SMTP server, starting with `smtp://` or `smtps://`. Go [here](https://www.nodemailer.com/smtp/) for an example

**4. Set-up the supabase database**
- Link the local instance to your remote supabase project using `pnpm supabase link` ([reference](https://supabase.com/docs/guides/functions/deploy))
- Push the migrations to the remote database using `pnpm supabase db push` command ([reference](https://supabase.com/docs/reference/cli/supabase-db-push))

**5. Start the nuxt server**
- The application can be built using `pnpm build`. 
- The application can be ran either using `pnpm preview` or `node .output/server/index.mjs`

### Upgrading to hybrid tasks
An existing installation needs, in this order:
1. **The database migration** `lawnotation-ui/supabase/migrations/20261112100000_hybrid_tasks.sql`, applied with `pnpm supabase db push`. It adds `tasks.document_labelset_id` (nullable; allowed only on span tasks) and `annotations.kind` (`span` or `document`), and marks every annotation of existing document tasks as `document`. Existing tasks and annotations keep working unchanged. Apply it to production before, or together with, the new application version, because the new code reads these columns.
2. **The IAA service** (if you use metrics), updated to a version with hybrid support, before anyone opens the metrics of a hybrid task. It still accepts the old input, so existing tasks are not affected.
3. **The application**, with `legal-annotation-kit` `^1.7.0` and `vue-iaa-metrics` `^1.4.0` (already set in `lawnotation-ui/package.json`).

The IAA service is configured with `IAA_SERVICE_URL` and `IAA_API_KEY` in `.env`.

## Development
The setup for developing is equivalent to that of self-hosting. The main difference is that Supabase is ran locally instead of remote, and that Nuxt's development server is started instead of its production server. To do this:

1. If you're on windows, make sure Docker is running by opening Docker Desktop once.
2. Run the supabase local development environment \
   `pnpm supabase start`
      - For details, refer to supabase's [local development guide](https://supabase.com/docs/guides/local-development)
3. Update the values of `.env` the values in the output of the above commands
4. Launch the nuxt development server \
   `pnpm dev`
