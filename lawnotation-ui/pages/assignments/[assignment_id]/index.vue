<template>
  <Breadcrumb v-if="project && task && assignment" :crumbs="[
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
      name: `Assignment ${assignment.id}`,
      link: `/assignments/${assignment.id}`,
    },
  ]" />
  <template v-if="task">
    <template v-if="assignment">
      <div class="my-4 px-8 flex justify-between items-center">
        <span class="font-bold text-gray-500 mx-2">{{ doc?.name }}</span>
        <span class="font-bold text-gray-500 mx-2">{{ annotator_email }}</span>
        <Badge :value="assignment.status" :severity="assignment.status == 'done' ? 'success' : 'danger'" class="capitalize px-2"></Badge>
      </div>
    </template>
    <div class="dimmer-wrapper min-h-0">
      <Dimmer v-model="loading" />
      <div class="dimmer-content h-full">
        <LabelStudio v-if="loadedData" :assignment="assignment" :user="user" :isEditor="isEditor" :text="doc?.full_text"
          :annotations="ls_annotations" :relations="ls_relations" :guidelines="task?.ann_guidelines" :labels="labels" :isWordLevel="isWordLevel(task)">
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
  Project,
  Task,
  Labelset,
  LsLabels,
  Annotation,
  AnnotationRelation,
  LSSerializedRelation,
} from "~/types";
import { authorizeClient } from "~/utils/authorize.client";
import { isWordLevel } from "~/utils/levels";

const user = useSupabaseUser();

const { $toast, $trpc } = useNuxtApp();

type Id = number;

const route = useRoute();
const assignment = ref<Assignment>();
const task = ref<Task>();
const project = ref<Project>();
const doc = ref<Document>();
const annotator_email = ref<string>();
const loadedData = ref(false);
const loading = ref(false);

const annotations = reactive<Annotation[]>([]);
const relations = reactive<AnnotationRelation[]>([]);
const ls_annotations = reactive<LSSerializedAnnotations>([]);
const ls_relations = reactive<LSSerializedRelation[]>([]);
const labels = reactive<LsLabels>([]);
const isEditor = ref<boolean>();

const loadData = async () => {
  try {
    loading.value = true;
    assignment.value = await $trpc.assignment.findById.query(+route.params.assignment_id);

    if (!assignment.value) throw Error("Assignment not found");

    annotator_email.value = (await $trpc.user.findById.query(assignment.value.annotator_id)).email;

    doc.value = await $trpc.document.findById.query(+assignment.value.document_id);
    if (!doc.value) throw Error("Document not found");

    if (!assignment.value.task_id) throw Error("Task not found");
    task.value = await $trpc.task.findById.query(+assignment.value.task_id);
    if (!task.value) throw Error("Task not found");

    project.value = await $trpc.project.findById.query(+task.value.project_id);

    const _labelset: Labelset = await $trpc.labelset.findById.query(
      +task.value.labelset_id
    );

    labels.splice(0) &&
      labels.push(
        ..._labelset.labels.map((l) => {
          return l;
        })
      );

    annotations.splice(0) &&
      annotations.push(
        ...(await $trpc.annotation.findByAssignment.query(+assignment.value.id))
      );

    const db2ls_anns = convert_annotation_db2ls(annotations, assignment.value.id, isWordLevel(task.value));
    if (annotations.length) {
      ls_annotations.splice(0) && ls_annotations.push(...db2ls_anns);
    }

    relations.splice(0) &&
      relations.push(
        ...(await $trpc.relation.findFromAnnotationIds.query(
          annotations.map((a) => a.id)
        ))
      );

    const db2ls_rels = relations.map((r) => convert_relation_db2ls(r));

    if (relations.length) {
      ls_relations.splice(0) && ls_relations.push(...db2ls_rels);
    }

    isEditor.value = user.value?.id != assignment.value.annotator_id;

    loadedData.value = true;
    loading.value = false;
  } catch (error) {
    loading.value = false;
  }
};

onMounted(async () => {
  loadData();
});

definePageMeta({
  middleware: ["auth",
    async (to) => authorizeClient([["assignment", +to.params.assignment_id]])],
  layout: "grid-editor",
});
</script>
