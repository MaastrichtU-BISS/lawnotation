<template>
  <!-- Read more: the full text of a document. -->
  <Dialog
    v-model:visible="views.preview.visible"
    modal
    :draggable="false"
    :header="views.preview.title || 'Document'"
    :style="{ width: 'min(52rem, 94vw)' }"
    :pt="{ content: { style: 'padding-bottom: 1.5rem' } }"
    :ptOptions="{ mergeProps: true }"
  >
    <div v-if="views.preview.loading" class="py-10 text-center text-gray-500" data-test="document-preview-loading">
      Loading…
    </div>
    <pre
      v-else
      class="m-0 max-h-[65vh] overflow-y-auto whitespace-pre-wrap break-words font-sans text-sm leading-relaxed"
      data-test="document-preview-text"
      >{{ views.preview.text }}</pre
    >
  </Dialog>

  <!-- View as graph: the documents of the queue and the relations among them. -->
  <Dialog
    v-model:visible="views.graph.visible"
    modal
    :draggable="false"
    header="Document relations"
    :style="{ width: 'min(70rem, 96vw)' }"
    :pt="{ content: { style: 'padding-bottom: 1.5rem' } }"
    :ptOptions="{ mergeProps: true }"
  >
    <div v-if="views.graph.loading" class="py-10 text-center text-gray-500">Loading…</div>
    <template v-else>
      <p class="mt-0 mb-3 text-xs text-gray-500">
        Arrows point from a document to the one it links to. The document you are on has a thick border.
        Click a document to read it.
      </p>
      <div class="h-[60vh]" data-test="document-relation-graph">
        <ClientOnly>
          <NetworkGraph
            :nodes="views.graph.nodes"
            :edges="views.graph.edges"
            :current-id="views.graph.currentId"
            empty-text="This queue has no documents."
            downloadable
            image-filename="document-relations"
            @node-click="views.viewGraphNode"
          />
        </ClientOnly>
      </div>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { defineAsyncComponent } from "vue";
import "vue-legal-docs-visualizer/style.css";
import type { DocumentRelationViews } from "~/composables/useDocumentRelationViews";

defineProps<{ views: DocumentRelationViews }>();

// Loaded in the browser only: the graph needs one, and a page that never opens it
// should not pay for it.
const NetworkGraph = defineAsyncComponent(() =>
  import("vue-legal-docs-visualizer").then((m) => m.NetworkGraph)
);
</script>
