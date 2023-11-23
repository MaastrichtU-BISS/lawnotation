<template>
    <Breadcrumb v-if="task && project" :crumbs="[
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
    ]" />
    <div class="dimmer-wrapper pt-2">
        <Dimmer v-model="loading" />
        <div class="dimmer-content">
            <div class="flex my-3 text-center justify-center">
                <div class="flex flex-col w-1/2 space-y-2 border-neutral-300 mt-3 pt-3 mx-3">
                    <h3 class="text-lg mt-8">Edit Task</h3>
                    <input class="base" type="text" placeholder="Task name" v-model="new_task.name" />
                    <textarea class="base" placeholder="Task description" v-model="new_task.desc"></textarea>
                    <textarea class="base" placeholder="Annotation Guidelines" v-model="new_task.ann_guidelines"></textarea>
                    <button class="base btn-primary" @click="editTask">Save Changes</button>
                </div>
            </div>
        </div>
    </div>
</template>
<script setup lang="ts">
import type { Task, Project } from "~/types";
import Dimmer from "~/components/Dimmer.vue"
import { authorizeClient } from "~/utils/authorize.client";

const { $toast, $trpc } = useNuxtApp();

const user = useSupabaseUser();
const config = useRuntimeConfig();

const route = useRoute();

const task = ref<Task>();
const project = ref<Project>();

const loading = ref(false);

const new_task = ref<any>({
    name: "",
    desc: "",
    ann_guidelines: "",
    project_id: 0,
    labelset_id: 0
})

const new_emails = reactive<string[]>([]);

const editTask = async () => {
    loading.value = true;
    try {
        task.value = await $trpc.task.update.mutate({ id: task.value?.id!, updates: new_task.value });
        loading.value = false;
        $toast.success("Task successfully edited!");
    } catch (error) {
        loading.value = false;
        $toast.error("Error editing Task");
        console.log(error);
    }
};


onMounted(async () => {
    task.value = await $trpc.task.findById.query(+route.params.task_id);
    project.value = await $trpc.project.findById.query(+route.params.project_id);

    new_task.value.name = task.value.name;
    new_task.value.desc = task.value.desc;
    new_task.value.ann_guidelines = task.value.ann_guidelines;
    new_task.value.project_id = task.value.project_id;
    new_task.value.labelset_id = task.value.labelset_id;

});

definePageMeta({
    middleware: [
        "auth",
        async (to) => authorizeClient([["task", +to.params.task_id]]),
        async (to) => authorizeClient([["project", +to.params.project_id]]),
    ],
});
</script>