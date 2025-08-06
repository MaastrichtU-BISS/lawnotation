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
        {
            name: `Edit`,
            link: `/projects/${project.id}/tasks/${task.id}/edit`,
        },
    ]" />
    <div v-if="task" class="dimmer-wrapper pt-2">
        <Dimmer v-model="loading" />
        <div class="dimmer-content">
            <div class="grid md:grid-cols-2 md:gap-6">
                <Card class="flex flex-col h-fit">
                    <template #title>
                        <div class="flex items-center justify-between">
                            <h3 class="text-lg font-semibold">Edit Task</h3>
                            <NuxtLink :to="`/projects/${route.params.project_id}/tasks/${task.id}`">
                                <Button :label="hasAssignments ? 'View' : 'Assign'" size="small" link />
                            </NuxtLink>
                        </div>
                    </template>
                    <template #content>
                        <main class="flex flex-col gap-4">
                            <input class="base" type="text" placeholder="Task name" v-model="new_task.name"
                                data-test="task-name" />
                            <textarea class="base" placeholder="Task description" v-model="new_task.desc"
                                data-test="task-description"></textarea>
                            <textarea class="base" placeholder="Annotation Guidelines" v-model="new_task.ann_guidelines"
                                data-test="annotation-guidelines"></textarea>
                            <Dropdown :disabled="hasAssignments" v-model="new_task.labelset_id" :options="labelsets"
                                optionLabel="name" optionValue="id" filter class="w-full text-left" />
                        </main>
                    </template>
                    <template #footer>
                        <div class="flex justify-end">
                            <Button @click="editTask" label="Save Changes" data-test="save-changes-button" />
                        </div>
                    </template>
                </Card>
                <section class="flex flex-col gap-6">
                    <Card v-if="new_emails && new_emails.length" class="flex flex-col gap-4 h-fit">
                        <template #title>
                            <h3 class="text-lg font-semibold">Replace Annotators</h3>
                        </template>
                        <template #content>
                            <ul class="">
                                <li v-for="(email, index) in new_emails" class="">
                                    <div class="relative mb-2">
                                        <div
                                            class="absolute inset-y-0 start-0 flex items-center ps-3.5 pointer-events-none">
                                            <svg class="w-4 h-4 text-gray-500 dark:text-gray-400" aria-hidden="true"
                                                xmlns="http://www.w3.org/2000/svg" fill="currentColor"
                                                viewBox="0 0 20 16">
                                                <path
                                                    d="m10.036 8.278 9.258-7.79A1.979 1.979 0 0 0 18 0H2A1.987 1.987 0 0 0 .641.541l9.395 7.737Z" />
                                                <path
                                                    d="M11.241 9.817c-.36.275-.801.425-1.255.427-.428 0-.845-.138-1.187-.395L0 2.6V14a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V2.5l-8.759 7.317Z" />
                                            </svg>
                                        </div>
                                        <input type="text" v-model="new_emails[index]"
                                            :placeholder="`annotator ${annotators[index].annotator_number}`"
                                            class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full ps-10 p-2.5  dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500">
                                    </div>
                                </li>
                            </ul>
                        </template>
                        <template #footer>
                            <div class="flex justify-end">
                                <Button @click="replaceAnnotators" label="Replace" outlined />
                            </div>
                        </template>
                    </Card>
                    <form>
                        <Fieldset legend="Danger Zone" class="flex justify-center"
                            :pt="{ root: { class: '!border-red-500' }, legend: { class: '!text-red-500 !bg-inherit border-none' } }"
                            :ptOptions="{ mergeProps: true }">
                            <Button label="Delete Task" severity="danger" icon="pi pi-trash" iconPos="right"
                                @click="deleteTask(task)" data-test="delete-task-button" />
                        </Fieldset>
                    </form>
                    <ConfirmBox />
                </section>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { Task, Project, Annotator, Assignment, Labelset } from "~/types";
import Dimmer from "~/components/Dimmer.vue";
import Dropdown from "primevue/dropdown";
import Button from 'primevue/button';
import { authorizeClient } from "~/utils/authorize.client";
import { useConfirm } from "primevue/useconfirm";

const { $toast, $trpc } = useNuxtApp();

const user = useSupabaseUser();
const config = useRuntimeConfig();

const route = useRoute();

const task = ref<Task>();
const project = ref<Project>();
const labelset = ref<Labelset>();
const labelsets = ref<Labelset[]>();
const numberOfAssignments = ref<number>();
const hasAssignments = computed(() => !!numberOfAssignments.value);

const loading = ref(false);

const new_task = ref<Omit<Task, "id" | "annotation_level">>({
    name: "",
    desc: "",
    ann_guidelines: "",
    project_id: 0,
    labelset_id: 0,
});

const new_emails = reactive<string[]>([]);

const annotators = reactive<Annotator[]>([]);

const editTask = async () => {
    if (!new_task.value.name) {
        $toast.error("Task name is required");
        return;
    }
    if (!new_task.value.desc) {
        $toast.error("Task description is required");
        return;
    }
    if (new_task.value.ann_guidelines) {
        try {
            const url = new URL(new_task.value.ann_guidelines);
        } catch (_) {
            $toast.error("Invalid Guidelines url");
            return;
        }
    }
    if (!new_task.value.labelset_id) {
        $toast.error("Task must have a labelset");
        return;
    }

    loading.value = true;
    try {
        task.value = await $trpc.task.update.mutate({
            id: task.value?.id!,
            updates: new_task.value,
        });
        loading.value = false;
        $toast.success("Task successfully edited!");
        navigateTo(`/projects/${project.value?.id}`);
    } catch (error) {
        loading.value = false;
        $toast.error("Error editing Task");
        console.log(error);
    }
};

const replaceAnnotators = async () => {
    if (!task.value)
        return;

    loading.value = true;


    // const stats = {
    //     success: 0,
    //     failed: 0
    // };

    // for (let i = 0; i < new_emails.length; i++) {
    //     if (new_emails[i] != annotators[i].email) {

    //         const assignments = await $trpc.assignment.findAssignmentsByTaskAndUser.query({
    //             annotator_number: annotators[i].annotator_number,
    //             task_id: task.value?.id!
    //         });

    //         let new_user = null;
    //         if (new_emails[i] && new_emails.length) {
    //             new_user = await $trpc.assignment.assignUserToTask.query({ email: new_emails[i], task_id: task.value.id });
    //         }

    //         for (let j = 0; j < assignments.length; j++) {
    //             const ass = assignments[j];
    //             try {
    //                 await $trpc.assignment.update.mutate({ id: ass.id, updates: { ...ass, annotator_id: new_user } });
    //                 stats.success++;
    //             } catch {
    //                 stats.failed++;
    //             }
    //         }

    //         annotators[i].email = new_emails[i];
    //     }
    // }

    try {
        const update = await $trpc.task.updateAssignees.mutate({
            new_emails,
            task_id: task.value.id
        });
        annotators.splice(0) && annotators.push(...update.annotators)
        $toast.success(update.message)
    } catch (error) {
        if ((error as Object).hasOwnProperty('message')) {
            $toast.error((error as any).message)
        }
    }

    loading.value = false;
};

const confirm = useConfirm();
const deleteTask = (task: Task) => {
    confirm.require({
        group: 'headless',
        header: "Are you sure?",
        message: `You are about to delete task ${task.name} and all annotations. This action cannot be undone.`,
        accept: async () => {
            try {
                loading.value = true;
                await $trpc.task.delete.mutate(task.id);
                $toast.success("Task deleted successfully");
                navigateTo(`/projects/${project.value!.id}`);
            } catch (error) {
                $toast.error(`Failed to delete task: ${error}`);
            } finally {
                loading.value = false;
            }
        },
        reject: () => { }
    });
};

onMounted(async () => {
    task.value = await $trpc.task.findById.query(+route.params.task_id);
    project.value = await $trpc.project.findById.query(+route.params.project_id);
    labelset.value = await $trpc.labelset.findById.query(task.value.labelset_id);
    labelsets.value = await $trpc.labelset.find.query({});
    numberOfAssignments.value = await $trpc.assignment.getCountByTask.query(task.value.id);

    new_task.value = { ...task.value };

    annotators.splice(0) && annotators.push(
        ...(await $trpc.task.getAllAnnotatorsFromTask.query(+route.params.task_id))
    );

    new_emails.splice(0) &&
        new_emails.push(...annotators?.map(u => u.email ?? ""));
});

definePageMeta({
    middleware: [
        "auth",
        async (to) => authorizeClient([["task", +to.params.task_id]]),
        async (to) => authorizeClient([["project", +to.params.project_id]]),
    ],
});
</script>