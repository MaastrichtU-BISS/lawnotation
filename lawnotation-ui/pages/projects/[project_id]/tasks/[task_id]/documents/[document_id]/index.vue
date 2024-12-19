<template>
    <Breadcrumb v-if="project && task && doc" :crumbs="[
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
            name: `${doc.name}`,
            link: `/projects/${project.id}/tasks/${task.id}/documents/${doc.id}`,
        },
    ]" />
    <template v-if="task">
        <div class="dimmer-wrapper min-h-0">
            <Dimmer v-model="loading" />
            <div class="dimmer-content h-full">
                <LabelStudio v-if="loadedData" :user="user" :isEditor="true" :text="doc?.full_text"
                    :annotations="ls_annotations" :relations="ls_relations"
                    :labels="labels" :annotation_level="task.annotation_level" :isHtml="isHtml">
                </LabelStudio>
            </div>
        </div>
    </template>
</template>
<script setup lang="ts">
import { ref, reactive, computed, onMounted } from "vue";
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
import { isDocumentLevel, getDocFormat } from "~/utils/levels";

const user = useSupabaseUser();

const { $toast, $trpc } = useNuxtApp();

const route = useRoute();
const task = ref<Task>();
const project = ref<Project>();
const doc = ref<Document>();
const loadedData = ref(false);
const loading = ref(false);

const annotations = reactive<Annotation[]>([]);
const relations = reactive<AnnotationRelation[]>([]);
const ls_annotations = reactive<LSSerializedAnnotations>([]);
const ls_relations = reactive<LSSerializedRelation[]>([]);
const labels = reactive<LsLabels>([]);

const isHtml = computed(() => {
    return getDocFormat(doc?.value?.name!) == 'html';
});

const loadData = async () => {
    try {
        loading.value = true;

        doc.value = await $trpc.document.findById.query(+route.params.document_id);
        if (!doc.value) throw Error("Document not found");

        task.value = await $trpc.task.findById.query(+route.params.task_id);
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
                ...(await $trpc.annotation.findAnnotationsByTaskAndDocument.query({
                    task_id: task.value.id,
                    document_id: doc.value.id
                }))
            );

        const db2ls_anns = convert_annotation_db2ls(annotations, !isDocumentLevel(task.value), isHtml.value);
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
        async (to) => authorizeClient([["document", +to.params.document_id]]),
        async (to) => authorizeClient([["task", +to.params.task_id]]),
        async (to) => authorizeClient([["project", +to.params.project_id]])
    ],
    layout: "grid-editor",
});
</script>
  