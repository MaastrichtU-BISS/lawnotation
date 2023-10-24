<template>
  <Breadcrumb
    v-if="task"
    :crumbs="[
      {
        name: 'Tasks',
        link: '/tasks',
      },
      {
        name: `Task ${task.name}`,
        link: `/tasks/${task.id}`,
      },
      {
        name: `Assignment ${seq_pos}`,
        link: `/annotate/${task.id}?seq=${seq_pos}`,
      },
    ]"
  />

  <template v-if="assignment && task">
    <div class="my-4 px-8 flex justify-between">
      <span>&nbsp;</span>
      <div
        class="max-w-screen-md w-full"
        v-if="loadedData && seq_pos && assignmentCounts"
      >
        <div class="flex justify-between mb-1">
          <span class="text-base font-medium text-gray-500 text-muted">Assignment</span>
          <span class="text-sm font-medium text-blue-700"
            >{{ seq_pos }} / {{ assignmentCounts.total }}</span
          >
        </div>
        <div class="w-full bg-gray-200 rounded-full h-2.5">
          <div
            class="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
            :style="{ width: `${(seq_pos / assignmentCounts.total) * 100}%` }"
          ></div>
        </div>
      </div>

      <span
        >status:
        <span :class="assignmentStatusClass(assignment.status)">{{
          assignment.status
        }}</span></span
      >
    </div>
    <div class="dimmer-wrapper min-h-0">
      <Dimmer v-model="loading" />
      <div class="dimmer-content h-full">
        <LabelStudio
          v-if="loadedData"
          :assignment="assignment"
          :user="user"
          :isEditor="isEditor"
          :text="doc?.full_text"
          :annotations="ls_annotations"
          :relations="ls_relations"
          :labels="labels"
          :guidelines="task?.ann_guidelines"
          :key="key"
          @nextAssignment="loadNext"
          @previousAssignment="loadPrevious"
        ></LabelStudio>
      </div>
    </div>
  </template>
</template>
<script setup lang="ts">
import {
  Assignment,
  LSSerializedAnnotations,
  Document,
  Task,
  Labelset,
  LsLabels,
  AnnotationRelation,
  LSSerializedRelation,
} from "~/types";
import Breadcrumb from "~/components/Breadcrumb.vue";

const user = useSupabaseUser();

const { $toast, $trpc } = useNuxtApp();

type Id = number;

const route = useRoute();
const router = useRouter();
const assignment = ref<Assignment>();
const task = ref<Task>();
const doc = ref<Document>();
const loadedData = ref(false);

// const annotations = reactive<Annotation[]>([]);
// const relations = reactive<AnnotationRelation[]>([]);
const ls_annotations = reactive<LSSerializedAnnotations>([]);
const ls_relations = reactive<LSSerializedRelation[]>([]);
const labels = reactive<LsLabels>([]);
const isEditor = ref<boolean>();
const assignmentCounts = ref<{ next: number; total: number }>();

const assignmentStatusClass = (status: Assignment["status"]) => {
  return status === "done" ? "text-green-600" : "text-red-500";
};

const loading = ref(false);
const key = ref("ls-default");

// const seq_pos = ref(assignment.value?.seq_pos ?? 1);
const seq_pos = ref<number>(assignment.value?.seq_pos ?? 0);
watch(seq_pos, (val) => {
  if (!Array.isArray(route.query.seq) && route.query.seq == val.toString()) return;

  router.replace({
    path: route.path,
    query: { seq: val },
  });
});

const loadPrevious = async () => {
  if (!assignment.value) throw Error("Assignment not found");

  if (assignment.value.seq_pos <= 1) throw Error("Already at first item");

  seq_pos.value -= 1;

  await loadData();
};

const loadNext = async () => {
  if (!assignment.value) throw Error("Assignment not found");

  if (assignmentCounts.value && seq_pos.value + 1 > assignmentCounts.value.total) {
    // TODO: go to page /done
    $toast.success(`All assignments were completed!`);
  } else {
    seq_pos.value++;
    await loadData();
  }
};

const loadData = async () => {
  try {
    if (!user.value) throw new Error("Must be logged in");

    loading.value = true;
    key.value = `ls-${seq_pos.value}`;

    assignment.value = await $trpc.assignment.findAssignmentsByUserTaskSeq.query({
      annotator_id: user.value.id,
      task_id: +route.params.task_id,
      seq_pos: seq_pos.value,
    });

    if (!assignment.value) throw Error("Assignment not found");

    doc.value = await $trpc.document.findById.query(assignment.value.document_id);
    if (!doc.value) throw Error("Document not found");

    if (!assignment.value.task_id) throw Error("Document not found");
    task.value = await $trpc.task.findById.query(assignment.value.task_id);

    const _labelset: Labelset = await $trpc.labelset.findById.query(
      task.value.labelset_id
    );

    labels.splice(0);
    labels.push(..._labelset.labels.map((l) => l));

    const _annotations = await $trpc.annotation.findByAssignment.query(
      assignment.value.id
    );

    ls_annotations.splice(0);
    if (_annotations.length) {
      const db2ls_anns = convert_annotation_db2ls(_annotations, assignment.value.id);
      ls_annotations.push(...db2ls_anns);
    }

    const _relations = await $trpc.relation.findFromAnnotationIds.query(
      _annotations.map((a) => a.id)
    );

    ls_relations.splice(0);
    if (_relations.length) {
      const db2ls_rels = _relations.map((r: AnnotationRelation) =>
        convert_relation_db2ls(r)
      );
      ls_relations.push(...db2ls_rels);
    }

    isEditor.value = user.value.id != assignment.value.annotator_id;

    loadedData.value = true;
    loading.value = false;
    key.value = "ls-" + assignment.value.id;
  } catch (error) {
    if (error instanceof Error) $toast.error(`Problem loading data: ${error.message}`);
    loading.value = false;
  }
};

const loadCounters = async () => {
  try {
    if (!user.value) throw new Error("Must be logged in");
    if (!route.params.task_id || Array.isArray(route.params.task_id))
      throw new Error("Invalid task");

    const counts = await $trpc.assignment.countAssignmentsByUserAndTask.query({
      annotator_id: user.value.id,
      task_id: +route.params.task_id,
    });

    assignmentCounts.value = counts;
  } catch (error) {
    if (error instanceof Error)
      $toast.error(`Problem loading counters: ${error.message}`);
  }
};

const init = async () => {
  await loadCounters();
  if (
    route.query.seq &&
    !Array.isArray(route.query.seq) &&
    parseInt(route.query.seq) > 0 &&
    parseInt(route.query.seq) <= assignmentCounts.value!.total
  ) {
    seq_pos.value = parseInt(route.query.seq);
  }
  loadData();
};

onMounted(async () => {
  if (user.value) {
    init();
  } else {
    watch(user, async () => {
      if (user.value) init();
    });
  }
});

definePageMeta({
  middleware: ["auth"],
  layout: "grid",
});
</script>
