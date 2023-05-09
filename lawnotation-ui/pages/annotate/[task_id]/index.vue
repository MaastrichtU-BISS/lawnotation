<template>
  <div
    class="text-center my-4 mx-auto max-w-screen-lg text-lg font-semibo"
    v-if="loadedData"
  >
    {{ assignmentCounts?.done + 1 }} / {{ assignmentCounts?.total }}
  </div>
  <div class="dimmer-wrapper" style="min-height: 200px">
    <Dimmer v-model="loading" />
    <div class="dimmer-content">
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

const { $toast } = useNuxtApp();

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
const assignmentCounts = ref<{ done: number; total: number; pending: number }>({
  done: 0,
  total: 0,
  pending: 0,
});

const loading = ref(false);
const key = ref("ls-default");

definePageMeta({
  layout: "wide",
});

const loadData = async () => {
  try {
    loading.value = true;
    if (!user.value) throw new Error("Must be logged in");

    assignment.value = await assignmentApi.findNextAssignmentsByUserAndTask(
      user.value.id,
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

    assignmentCounts.value = await assignmentApi.countAssignmentsByUserAndTask(
      user.value.id,
      route.params.task_id.toString()
    );
  } catch (error) {
    if (error instanceof Error) $toast.error(`Problem loading counters: ${error.message}`);
  }
};

const loadDataAndCount = async () => {
  assignmentCounts.value.done++;
  assignmentCounts.value.pending--;
  if (assignmentCounts.value.pending == 0) {
    // TODO: go to page /done
    alert("All tasks were done: you will be signed out");
    supabase.auth.signOut();
  } else {
    await loadData();
  }
};

onMounted(async () => {
  if (user.value) {
    await loadCounters();
    loadData();
  } else {
    watch(user, async () => {
      if (user.value) {
        await loadCounters();
        loadData();
      }
    });
  }
});

definePageMeta({
  middleware: ["auth"],
});
</script>
