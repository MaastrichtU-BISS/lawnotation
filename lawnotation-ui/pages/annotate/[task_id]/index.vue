<template>
  <Breadcrumb v-if="task && currentName" :crumbs="[
    {
      name: 'Tasks',
      link: '/tasks',
    },
    {
      name: `Task ${task.name}`,
      link: `/tasks/${task.id}`,
    },
    {
      name: currentName,
      link: `/annotate/${task.id}?seq=${currentSeq}`,
    },
  ]" />

  <!-- No page-level loader here: the kit shows its own while the first document
       loads, and a second one (the dots) ahead of it only made two spinners. -->
  <div class="dimmer-wrapper min-h-0">
    <div class="dimmer-content h-full">
      <ClientOnly>
        <AnnotatorQueue v-if="source && task && labelset" :source="source" :labelset="labelset" :document-labelset="documentLabelset"
          :relation-labels="relationLabels" preview-documents relation-graph
          @view-document="relationViews.viewDocument" @view-relation-graph="relationViews.viewRelationGraph"
          :annotation-level="toKitLevel(task.annotation_level)" :guidelines-url="task.ann_guidelines || undefined"
          :start-position="startPosition" :url-param="false" @complete="onComplete" @save-error="onSaveError"
          @unsaved="unsaved = $event" />
      </ClientOnly>
    </div>
  </div>
  <ConfirmBox />
  <DocumentRelationViews :views="relationViews" />
</template>
<script setup lang="ts">
import { AnnotatorQueue, createLazySource } from "legal-annotation-kit";
import type { AnnotationSource, Labelset } from "legal-annotation-kit";
import type { Task } from "~/types";
import { useConfirm } from "primevue/useconfirm";
import Breadcrumb from "~/components/Breadcrumb.vue";
import ConfirmBox from "~/components/ConfirmBox.vue";
import { authorizeClient } from "~/utils/authorize.client";
import { saveKitAssignment, toKitBundle } from "~/utils/annotator";
import { toKitLevel } from "~/utils/levels";
import DocumentRelationViews from "~/components/annotator/DocumentRelationViews.vue";
import { useDocumentRelationViews } from "~/composables/useDocumentRelationViews";

const user = useSupabaseUser();
// "Read more" and "View as graph" on document relations: the kit only asks, these open the modals.
const relationViews = useDocumentRelationViews();
const { $toast, $trpc } = useNuxtApp();
const route = useRoute();
const router = useRouter();

type QueueEntry = { assignment_id: number; seq_pos: number; status: string; document_name: string };

const task = ref<Task>();
const labelset = ref<Labelset>();
// Hybrid tasks: the labelset for whole-document tags, next to the span labelset.
const documentLabelset = ref<Labelset>();
// The labelset's own relation labels; undefined keeps the kit's default set.
const relationLabels = ref<string[]>();
const source = shallowRef<AnnotationSource>();
const startPosition = ref(1);
const unsaved = ref(false);

// What the breadcrumb and the `seq` query param show. `seq` is the
// assignment's seq_pos, as every link into this page has always used — not
// the kit's 1-based position, which is why the kit is told to leave the URL
// alone (url-param="false") and this page keeps it instead.
const currentName = ref<string>();
const currentSeq = ref<number>();


const init = async () => {
  try {
    const taskId = +route.params.task_id;
    task.value = await $trpc.task.findById.query(taskId);
    if (!task.value) throw new Error("Task not found");

    const set = await $trpc.labelset.findById.query(task.value.labelset_id);
    labelset.value = { name: set.name, desc: set.desc ?? "", labels: set.labels };
    relationLabels.value = set.relation_labels ?? undefined;
    if (task.value.document_labelset_id) {
      const documentSet = await $trpc.labelset.findById.query(+task.value.document_labelset_id);
      documentLabelset.value = { name: documentSet.name, desc: documentSet.desc ?? "", labels: documentSet.labels };
    }

    const queue: QueueEntry[] = await $trpc.annotator.queue.query({ task_id: taskId });
    if (!queue.length) throw new Error("You have no documents to annotate in this task");

    // Resume where the link says, else at the first document not yet done.
    const seq = Number(route.query.seq);
    const linked = queue.findIndex((e) => e.seq_pos === seq);
    const unfinished = queue.findIndex((e) => e.status !== "done");
    startPosition.value = (linked >= 0 ? linked : unfinished >= 0 ? unfinished : 0) + 1;

    source.value = await createLazySource({
      total: async () => queue.length,
      load: async (position) => {
        const entry = queue[position - 1];
        if (!entry) throw new Error(`No document at position ${position}`);
        const bundle = toKitBundle(await $trpc.annotator.load.query(entry.assignment_id));

        currentName.value = entry.document_name;
        currentSeq.value = entry.seq_pos;
        router.replace({ query: { ...route.query, seq: entry.seq_pos } });
        return bundle;
      },
      // Document-level links: targets are the other documents in this queue,
      // keyed by assignment id because names are not unique in a task.
      listDocuments: async () =>
        queue.map((e) => ({ name: e.document_name, order: e.seq_pos, key: String(e.assignment_id) })),
      listIncomingRelations: async (key) => $trpc.annotator.incoming.query(Number(key)),
      save: async (assignment) => {
        const id = Number(assignment.id);
        await saveKitAssignment($trpc, assignment);
        const entry = queue.find((e) => e.assignment_id === id);
        if (entry) entry.status = assignment.status;
      },
    });
  } catch (error) {
    $toast.error(`Could not open this task: ${(error as Error)?.message}`);
  }
};

// Set once the last document is saved. The kit reports `complete` before it
// has cleared its own unsaved flag, so the guard below must not hold up the
// navigation that follows.
let completed = false;

const onComplete = () => {
  completed = true;
  $toast.success("All assignments were completed!");
  if (task.value) navigateTo(`/tasks/${task.value.id}`);
};

const onSaveError = (error: unknown) => {
  console.error("Failed to save annotations:", error);
  $toast.error(
    "Annotations could not be saved into the db. They still exist locally, so you can safely reload the page without losing progress and try again."
  );
};

onMounted(() => {
  if (user.value) {
    init();
  } else {
    const stop = watch(user, () => {
      if (user.value) {
        stop();
        init();
      }
    });
  }
});

// The kit warns on reload and tab close; leaving through the app's own links
// needs the router's guard. The work stays in the kit's local draft either way.
const confirm = useConfirm();
onBeforeRouteLeave((to, from, next) => {
  if (!unsaved.value || completed) return next();
  confirm.require({
    group: "headless",
    header: "Are you sure you want to leave?",
    message: "You have unsaved changes. They stay on this device and come back when you return to this document.",
    rejectLabel: "No, stay",
    acceptLabel: "Yes, leave",
    accept: () => next(),
    reject: () => next(false),
  });
});

definePageMeta({
  middleware: ["auth", async (to) => authorizeClient([["task", +to.params.task_id]])],
  layout: "grid-annotater",
});
</script>
