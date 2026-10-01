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
    <div v-if="task" class="dimmer-wrapper min-h-0">
        <Dimmer v-model="loading" />
        <div class="dimmer-content h-full">
            <ClientOnly>
                <AnnotatorView v-if="bundle && labelset" :document="bundle.document" :assignment="bundle.assignment"
                    :labelset="labelset" :annotation-level="toKitLevel(task.annotation_level)"
                    :position="{ current: 1, total: 1 }" :navigation="false" readonly />
            </ClientOnly>
        </div>
    </div>
</template>
<script setup lang="ts">
import { AnnotatorView } from "legal-annotation-kit";
import type { AssignmentBundle, Labelset } from "legal-annotation-kit";
import type { Project, Task, Document } from "~/types";
import { authorizeClient } from "~/utils/authorize.client";
import { toKitBundle } from "~/utils/annotator";
import { toKitLevel } from "~/utils/levels";
import Breadcrumb from "~/components/Breadcrumb.vue";

// Every annotator's work on one document, merged, for the task's editor to
// look over. Read-only: there is no single assignment to save it to.

const { $toast, $trpc } = useNuxtApp();

const route = useRoute();
const task = ref<Task>();
const project = ref<Project>();
const doc = ref<Pick<Document, "id" | "name">>();
const loading = ref(false);

const bundle = shallowRef<AssignmentBundle>();
const labelset = ref<Labelset>();

const loadData = async () => {
    try {
        loading.value = true;

        task.value = await $trpc.task.findById.query(+route.params.task_id);
        if (!task.value) throw Error("Task not found");

        project.value = await $trpc.project.findById.query(+task.value.project_id);

        const set = await $trpc.labelset.findById.query(+task.value.labelset_id);
        labelset.value = { name: set.name, desc: set.desc ?? "", labels: set.labels };

        const merged = await $trpc.annotator.merged.query({
            task_id: task.value.id,
            document_id: +route.params.document_id,
        });
        doc.value = { id: +route.params.document_id, name: merged.document.name };
        bundle.value = toKitBundle(merged);
    } catch (error) {
        $toast.error(`Could not load this document: ${(error as Error)?.message}`);
    } finally {
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
  