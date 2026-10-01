<template>
  <Breadcrumb v-if="project && task && assignment && doc" :crumbs="[
    {
      name: 'Projects',
      link: '/projects',
    },
    {
      name: `Project ${project.name}`,
      link: `/projects/${project.id}`,
    },
    {
      name: `Task ${task.name}`,
      link: `/projects/${project.id}/tasks/${task.id}`,
    },
    {
      name: `${doc.name} - ${annotator_email}`,
      link: `/assignments/${assignment.id}`,
    },
  ]" />
  <div v-if="task" class="dimmer-wrapper min-h-0">
    <Dimmer v-model="loading" />
    <div class="dimmer-content h-full">
      <ClientOnly>
        <AnnotatorView v-if="bundle && labelset" :document="bundle.document" :assignment="bundle.assignment"
          :labelset="labelset" :annotation-level="toKitLevel(task.annotation_level)"
          :guidelines-url="task.ann_guidelines || undefined" :position="{ current: 1, total: 1 }"
          :navigation="false" @save="save" @save-error="onSaveError" @unsaved="unsaved = $event" />
      </ClientOnly>
    </div>
  </div>
  <ConfirmBox />
</template>
<script setup lang="ts">
import { AnnotatorView } from "legal-annotation-kit";
import type { Assignment as KitAssignment, AssignmentBundle, Labelset } from "legal-annotation-kit";
import type { AppRouter } from "~/server/trpc/routers";
import type { Project, Task, Document } from "~/types";
import { useConfirm } from "primevue/useconfirm";
import { authorizeClient } from "~/utils/authorize.client";
import { clearLabelStudioDraft, saveKitAssignment, toKitBundle, withLabelStudioDraft } from "~/utils/annotator";
import { toKitLevel } from "~/utils/levels";
import Breadcrumb from "~/components/Breadcrumb.vue";
import ConfirmBox from "~/components/ConfirmBox.vue";

// One assignment on its own — an editor reviewing an annotator's work, or the
// annotator opening it directly. No queue around it, so just Save.

const { $trpc, $toast } = useNuxtApp();

const route = useRoute();
const assignment = ref<AppRouter['assignment']['findById']['_def']['_output_out']>();
const task = ref<Task>();
const project = ref<Project>();
const doc = ref<Pick<Document, "name">>();
const annotator_email = ref<string>();
const loading = ref(false);
const unsaved = ref(false);

const bundle = shallowRef<AssignmentBundle>();
const labelset = ref<Labelset>();
let fromLabelStudioDraft = false;
// The markup of a legacy HTML document, for saveKitAssignment.
const legacyHtml = new Map<number, string>();

const loadData = async () => {
  try {
    loading.value = true;
    assignment.value = await $trpc.assignment.findById.query(+route.params.assignment_id);
    if (!assignment.value) throw Error("Assignment not found");

    if (assignment.value.annotator?.email) {
      annotator_email.value = assignment.value.annotator.email
    } else {
      annotator_email.value = `annotator ${assignment.value.annotator_number}`;
    }

    if (!assignment.value.task_id) throw Error("Task not found");
    task.value = await $trpc.task.findById.query(+assignment.value.task_id);
    if (!task.value) throw Error("Task not found");

    project.value = await $trpc.project.findById.query(+task.value.project_id);

    const set = await $trpc.labelset.findById.query(+task.value.labelset_id);
    labelset.value = { name: set.name, desc: set.desc ?? "", labels: set.labels };

    const raw = await $trpc.annotator.load.query(+assignment.value.id);
    if (raw.legacy_html) legacyHtml.set(+assignment.value.id, raw.document.full_text);
    const loaded = withLabelStudioDraft(toKitBundle(raw));
    fromLabelStudioDraft = loaded.fromDraft;
    doc.value = { name: loaded.bundle.document.name };
    bundle.value = loaded.bundle;
  } catch (error) {
    $toast.error(`Could not load this assignment: ${(error as Error)?.message}`);
  } finally {
    loading.value = false;
  }
};

const save = async (kitAssignment: KitAssignment) => {
  const id = Number(kitAssignment.id);
  await saveKitAssignment($trpc, kitAssignment, legacyHtml.get(Number(kitAssignment.id)));
  if (fromLabelStudioDraft) {
    clearLabelStudioDraft(id);
    fromLabelStudioDraft = false;
  }
  $toast.success("Changes were successfully saved!");
};

const onSaveError = (error: unknown) => {
  console.error("Failed to save annotations:", error);
  $toast.error(
    "Annotations could not be saved into the db. They still exist locally, so you can safely reload the page without losing progress and try again."
  );
};

onMounted(async () => {
  loadData();
});

const confirm = useConfirm();
onBeforeRouteLeave((to, from, next) => {
  if (!unsaved.value) return next();
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
  middleware: ["auth",
    async (to) => authorizeClient([["assignment", +to.params.assignment_id]])],
  layout: "grid-annotater",
});
</script>
