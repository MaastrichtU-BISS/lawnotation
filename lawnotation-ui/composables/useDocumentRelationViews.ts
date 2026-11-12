import type { DocumentRef, RelationGraphRequest } from "legal-annotation-kit";
import type { NetworkEdge, NetworkNode } from "vue-legal-docs-visualizer";
import { toRelationGraph } from "~/utils/relationGraph";

/**
 * What lawnotation does when the annotator asks, in legal-annotation-kit, to
 * read a document or to see the document relations as a graph. The kit only
 * announces those requests; this decides that they open modals and where their
 * data comes from. State only, so the same views can sit behind any page that
 * shows the annotator (see DocumentRelationViews.vue, which renders it).
 */
export function useDocumentRelationViews() {
  const { $trpc, $toast } = useNuxtApp();

  const preview = reactive({ visible: false, loading: false, title: "", text: "" });
  const graph = reactive({
    visible: false,
    loading: false,
    nodes: [] as NetworkNode[],
    edges: [] as NetworkEdge[],
    currentId: undefined as string | undefined,
  });

  // A later request supersedes an earlier one still loading, so a slow answer
  // never overwrites the document the annotator asked for last.
  let latestPreview = 0;
  let latestGraph = 0;

  const openPreview = async (key: string | undefined, title: string) => {
    const assignmentId = Number(key);
    if (!key || !Number.isInteger(assignmentId)) {
      $toast.error("This document cannot be opened");
      return;
    }
    const request = ++latestPreview;
    Object.assign(preview, { visible: true, loading: true, title, text: "" });
    try {
      const doc = await $trpc.annotator.documentPreview.query({ assignment_id: assignmentId });
      if (request !== latestPreview) return;
      Object.assign(preview, { title: doc.name, text: doc.full_text });
    } catch (error) {
      if (request !== latestPreview) return;
      preview.visible = false;
      $toast.error(`Could not load the document: ${(error as Error)?.message}`);
    } finally {
      if (request === latestPreview) preview.loading = false;
    }
  };

  /** "Read more" on a document: show its full text. */
  const viewDocument = (doc: DocumentRef) => openPreview(doc.key, doc.name);

  /** "View as graph": the whole queue's relations, with the open document's unsaved ones laid over. */
  const viewRelationGraph = async (request: RelationGraphRequest) => {
    const assignmentId = Number(request.document.key);
    if (!Number.isInteger(assignmentId)) {
      $toast.error("The relations cannot be shown for this document");
      return;
    }
    const current = ++latestGraph;
    Object.assign(graph, { visible: true, loading: true, nodes: [], edges: [], currentId: undefined });
    try {
      const queue = await $trpc.annotator.relationGraph.query({ assignment_id: assignmentId });
      if (current !== latestGraph) return;
      Object.assign(graph, toRelationGraph(queue, request));
    } catch (error) {
      if (current !== latestGraph) return;
      graph.visible = false;
      $toast.error(`Could not load the relations: ${(error as Error)?.message}`);
    } finally {
      if (current === latestGraph) graph.loading = false;
    }
  };

  /** A document was clicked in the graph: read it. */
  const viewGraphNode = (id: string) => {
    const node = graph.nodes.find((n) => n.id === id);
    return openPreview(id, node?.title ?? "");
  };

  return { preview, graph, viewDocument, viewRelationGraph, viewGraphNode };
}

export type DocumentRelationViews = ReturnType<typeof useDocumentRelationViews>;
