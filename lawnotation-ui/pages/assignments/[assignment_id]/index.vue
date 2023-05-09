<template>
  <div class="dimmer-wrapper">
    <Dimmer v-model="loading" />
    <div class="dimmer-content" style="min-height: 200px">
      <LabelStudio
        v-if="loadedData"
        :assignment="assignment"
        :user="user"
        :isEditor="isEditor"
        :text="doc?.full_text"
        :annotations="ls_annotations"
        :labels="labels"
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
const loading = ref(false);

const annotations = reactive<Annotation[]>([]);
const ls_annotations = reactive<LSSerializedAnnotation>([]);
const labels = reactive<LsLabels>([]);
const isEditor = ref<boolean>();

const loadData = async () => {
  try {
    loading.value = true;
    assignment.value = await assignmentApi.findAssignment(
      route.params.assignment_id.toString()
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
    loading.value = false;
  } catch (error) {
    if (error instanceof Error)
      $toast.error(`Error loading assignment: ${error.message}`);
    loading.value = false;
  }
};

onMounted(() => {
  loadData();
});

definePageMeta({
  middleware: ["auth", "assignment"],
  layout: "wide",
});
</script>
