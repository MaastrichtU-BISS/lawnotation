<template>
  <Breadcrumb v-if="task && doc" :crumbs="[
    {
      name: 'Tasks',
      link: '/tasks',
    },
    {
      name: `Task ${task.name}`,
      link: `/tasks/${task.id}`,
    },
    {
      name: `${doc.name}`,
      link: `/annotate/${task.id}?seq=${seq_pos}`,
    },
  ]" />

  <template v-if="task && totalCount">
    <div class="dimmer-wrapper min-h-0">
      <Dimmer v-model="loading" />
      <div class="dimmer-content h-full">
        <LabelStudio v-if="loadedData" :assignment="assignment" :previousCount="previousCount" :totalCount="totalCount" :user="user" :isEditor="isEditor" :text="doc?.full_text"
          :annotations="ls_annotations" :relations="ls_relations" :labels="labels" :guidelines="task?.ann_guidelines"
          :annotation_level="task.annotation_level" :isHtml="isHtml" :key="key" @nextAssignment="loadNext" @previousAssignment="loadPrevious">
        </LabelStudio>
      </div>
    </div>
  </template>
</template>
<script setup lang="ts">
import type {
  Assignment,
  LSSerializedAnnotations,
  Document,
  Task,
  Labelset,
  LsLabels,
  AnnotationRelation,
  LSSerializedRelation,
} from "~/types";
import { Direction } from "~/utils/enums";
import Breadcrumb from "~/components/Breadcrumb.vue";
import { isDocumentLevel, getDocFormat } from "~/utils/levels";
import { authorizeClient } from "~/utils/authorize.client";

const user = useSupabaseUser();

const { $toast, $trpc } = useNuxtApp();

type Id = number;

const route = useRoute();
const router = useRouter();
const assignment = ref<Assignment>();
const task = ref<Task>();
const doc = ref<Document>();
const loadedData = ref(false);

const ls_annotations = reactive<LSSerializedAnnotations>([]);
const ls_relations = reactive<LSSerializedRelation[]>([]);
const labels = reactive<LsLabels>([]);
const isEditor = ref<boolean>();
const previousCount = ref<number>(0);
const totalCount = ref<number>(0);

const loading = ref(false);
const key = ref("ls-default");

const isHtml = computed(() => {
  return getDocFormat(doc?.value?.name!) == 'html';
});

const seq_pos = ref<number>(assignment.value?.seq_pos ?? 0);
watch(seq_pos, (val) => {
  if (!Array.isArray(route.query.seq) && route.query.seq == val?.toString()) return;

  router.replace({
    path: route.path,
    query: { seq: val },
  });
});

const loadPrevious = async () => {
  if (!assignment.value) throw Error("Assignment not found");

  if (previousCount.value < 1) throw Error("Already at first item");
  previousCount.value--;
  await loadData(Direction.PREVIOUS);
};

const loadNext = async () => {
  if (!assignment.value) throw Error("Assignment not found");
  if (!totalCount.value) throw Error("Assignment Counts not found");

  if (previousCount.value >= totalCount.value) {
    $toast.success(`All assignments were completed!`);
    if (task.value)
      navigateTo(`/tasks/${task.value.id}`)
  } else {
    previousCount.value++;
    await loadData(Direction.NEXT);
  }
};

const loadData = async (dir: Direction = Direction.CURRENT) => {
  try {
    if (!user.value) throw new Error("Must be logged in");

    loading.value = true;
    key.value = `ls-${seq_pos.value}`;

    assignment.value = await $trpc.assignment.findAssignmentsByUserTaskSeq.query({
      task_id: +route.params.task_id,
      seq_pos: seq_pos.value,
      dir: dir
    });

    seq_pos.value = assignment?.value?.seq_pos!;

    if (!assignment.value) throw Error("Assignment not found");

    doc.value = await $trpc.document.findById.query(assignment.value.document_id);
    if (!doc.value) throw Error("Document not found");

    if (!assignment.value.task_id) throw Error("Document not found");
    task.value = await $trpc.task.findById.query(assignment.value.task_id);
    if (!task.value) throw Error("Task not found");

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
      const db2ls_anns = convert_annotation_db2ls(_annotations, !isDocumentLevel(task.value), isHtml.value);
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
    loading.value = false;
  }
};

const loadCounters = async () => {
  try {
    if (!user.value) throw new Error("Must be logged in");
    if (!route.params.task_id || Array.isArray(route.params.task_id))
      throw new Error("Invalid task");

    const counts = await $trpc.assignment.countAssignmentsByUserAndTask.query({
      task_id: +route.params.task_id,
      seq_pos: seq_pos.value
    });

    totalCount.value = counts.total;
    previousCount.value = counts.previous + 1;

  } catch (error) {
    throw new Error(error.message);
  }
};

const init = async () => {
  if (
    route.query.seq &&
    !Array.isArray(route.query.seq) &&
    parseInt(route.query.seq) > 0
  ) {
    seq_pos.value = parseInt(route.query.seq);
  }
  await loadCounters();
  loadData(Direction.CURRENT);
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
  middleware: ["auth", async (to) => authorizeClient([["task", +to.params.task_id]])],
  layout: "grid-annotater",
});
</script>
