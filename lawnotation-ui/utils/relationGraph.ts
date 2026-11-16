import type { RelationGraphRequest } from "legal-annotation-kit";
import type { NetworkEdge, NetworkNode } from "vue-legal-docs-visualizer";

// Turns what the server knows about an annotator's queue into the input of the
// relation graph (vue-legal-docs-visualizer's NetworkGraph), laid over what the
// annotator has on screen. Plain data in, plain data out, so it can be tested
// without a browser or a server. (Type-only imports: nothing is loaded here.)

/** What `annotator.relationGraph` returns. */
export type QueueRelations = {
  documents: { assignment_id: number; seq_pos: number; document_name: string; snippet: string }[];
  relations: { from: number; to: number; labels: string[] }[];
};

export type RelationGraph = {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  /** The document the annotator has open. */
  currentId: string | undefined;
};

/** How the kit refers to a document in lawnotation: by its assignment. */
export const nodeId = (assignmentId: number) => String(assignmentId);

const documentTitle = (d: { document_name: string; seq_pos: number }) => `${d.document_name} (#${d.seq_pos})`;

/**
 * One node per document of the queue and one edge per relation, labelled with
 * the relation's labels. When the annotator asked for the graph from an open
 * document (`request`), that document's own outgoing relations are taken from
 * the request rather than from the server, so links added or removed but not yet
 * saved show up. Relations among the other documents are as stored.
 */
export function toRelationGraph(queue: QueueRelations, request?: RelationGraphRequest): RelationGraph {
  const nodes: NetworkNode[] = queue.documents.map((d) => ({
    id: nodeId(d.assignment_id),
    label: documentTitle(d),
    title: documentTitle(d),
    description: d.snippet,
  }));
  const known = new Set(nodes.map((n) => n.id));

  const currentId = request?.document.key;
  const edges: NetworkEdge[] = [];
  for (const r of queue.relations) {
    const source = nodeId(r.from);
    if (source === currentId) continue; // replaced by the request's own, below
    edges.push({ source, target: nodeId(r.to), label: r.labels.join(", ") });
  }
  if (request && currentId !== undefined) {
    for (const r of request.relations) {
      if (known.has(r.to)) edges.push({ source: currentId, target: r.to, label: r.labels.join(", ") });
    }
  }

  return { nodes, edges, currentId: currentId !== undefined && known.has(currentId) ? currentId : undefined };
}
