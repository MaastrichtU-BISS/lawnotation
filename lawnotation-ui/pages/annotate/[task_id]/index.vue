<template>
  <div
    class="text-center my-4 mx-auto max-w-screen-lg text-lg font-semibo"
    v-if="loadedData"
  >
    {{ assignmentCounts?.done + 1 }} / {{ assignmentCounts?.total }}
  </div>
  <div>
    <LabelStudio
      v-if="loadedData"
      :assignment="assignment"
      :user="user"
      :isEditor="isEditor"
      :text="doc?.full_text"
      :annotations="ls_annotations"
      :labels="labels"
      :key="key"
      @nextAssignment="loadDataAndCount"
    ></LabelStudio>
  </div>
</template>
<script setup lang="ts">
import { Assignment, useAssignmentApi } from "~/data/assignment";
import { Document, useDocumentApi } from "~/data/document";
import { Task, useTaskApi } from "~/data/task";
import { Labelset, LsLabels, useLabelsetApi } from "~/data/labelset.js";
import { Annotation, LSSerializedAnnotation, useAnnotationApi } from "~/data/annotation";

const user = useSupabaseUser();
const supabase = useSupabaseClient();
const assignmentApi = useAssignmentApi();
const documentApi = useDocumentApi();
const taskApi = useTaskApi();
const labelsetApi = useLabelsetApi();
const annotationApi = useAnnotationApi();

type Id = number;

const route = useRoute();
const assignment = ref<Assignment>();
const task = ref<Task>();
const doc = ref<Document>();
const loadedData = ref(false);

const annotations = reactive<Annotation[]>([]);
const ls_annotations = reactive<LSSerializedAnnotation>([]);
const labels = reactive<LsLabels>([]);
const isEditor = ref<boolean>();
const assignmentCounts = ref<{ done: number; total: number; pending: number }>({done: 0, total: 0, pending: 0});
const key = ref("ls-default");

const loadData = async () => {
  assignment.value = await assignmentApi.findNextAssignmentsByUserAndTask(
    user.value?.id,
    route.params.task_id.toString()
  );

  if (!assignment.value) throw Error("Assignment not found");

  doc.value = await documentApi.findDocument(assignment.value.document_id.toString());
  if (!doc.value) throw Error("Document not found");

  if (!assignment.value.task_id) throw Error("Document not found");
  task.value = await taskApi.findTask(assignment.value.task_id?.toString());

  const _labelset: Labelset = await labelsetApi.findLabelset(
    task.value.labelset_id.toString()
  );

  labels.splice(0) &&
    labels.push(
      ..._labelset.labels.map((l) => {
        return l;
      })
    );

  annotations.splice(0) &&
    annotations.push(
      ...(await annotationApi.findAnnotations(assignment.value.id.toString()))
    );

  const db2ls_anns = annotationApi.convert_db2ls(annotations, assignment.value.id);
  if (annotations.length) {
    ls_annotations.splice(0) && ls_annotations.push(...db2ls_anns);
  }

  isEditor.value = user.value?.id != assignment.value.annotator_id;

  loadedData.value = true;
  key.value = "ls-" + assignment.value.id;
};

const loadCounters = async () => {
  assignmentCounts.value = await assignmentApi.countAssignmentsByUserAndTask(
    user.value?.id,
    route.params.task_id.toString()
  );
};

const loadDataAndCount = async () => {
  assignmentCounts.value.done++;
  assignmentCounts.value.pending--;
  if (assignmentCounts.value?.pending == 0) {
    alert("All tasks were done: you will be signed out");
    supabase.auth.signOut();
  }
  await loadData();
};

onMounted(async () => {
  await loadCounters();
  loadData();
});

watch(user, () => {
  // loadData();
});

definePageMeta({
  middleware: ["auth"],
});
</script>
