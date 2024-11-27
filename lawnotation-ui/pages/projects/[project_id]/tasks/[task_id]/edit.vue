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
            <div class="justify-center">
                <div class="flex flex-col w-1/2 mx-auto mt-8 space-y-6 border-neutral-300">
                    <h3 class="text-lg font-semibold">Edit Task</h3>
                    <FloatLabel>
                        <InputText class="w-full" id="task-name" v-model="new_task.name" data-test="task-name" />
                        <label for="task-name">Task Name</label>
                    </FloatLabel>
                    <FloatLabel>
                        <Textarea class="w-full" v-model="new_task.desc" rows="5" cols="30" data-test="task-description" />
                        <label>Task description</label>
                    </FloatLabel>
                    <FloatLabel>
                        <Textarea class="w-full" v-model="new_task.ann_guidelines" rows="5" cols="30" data-test="annotation-guidelines" />
                        <label>Annotation guidelines</label>
                    </FloatLabel>

                    <Dropdown disabled v-model="labelset!.name" :options="[labelset!.name]" class="w-full text-left" />
                    <Button @click="editTask" label="Save Changes" data-test="save-changes-button" />
                </div>
                <div v-if="new_emails && new_emails.length"
                    class="flex flex-col my-5 w-1/2 mx-auto mt-8 space-y-2 border-neutral-300 pt-3">
                    <h3 class="text-lg font-semibold">Replace Annotators</h3>
                    <ul class="">
                        <li v-for="(email, index) in new_emails" class="">
                            <div class="relative mb-2">
                                <div class="absolute inset-y-0 start-0 flex items-center ps-3.5 pointer-events-none">
                                    <svg class="w-4 h-4 text-gray-500 dark:text-gray-400" aria-hidden="true"
                                        xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 16">
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
                    <Button @click="replaceAnnotators" label="Replace" outlined />
                </div>
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
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';

const { $toast, $trpc } = useNuxtApp();

const user = useSupabaseUser();
const config = useRuntimeConfig();

const route = useRoute();

const task = ref<Task>();
const project = ref<Project>();
const labelset = ref<Labelset>();

const loading = ref(false);

const new_task = ref<any>({
    name: "",
    desc: "",
    ann_guidelines: "",
    project_id: 0,
    labelset_id: 0,
});

const new_emails = reactive<string[]>([]);

const annotators = reactive<Annotator[]>([]);

const editTask = async () => {
    loading.value = true;
    try {
        task.value = await $trpc.task.update.mutate({
            id: task.value?.id!,
            updates: new_task.value,
        });
        loading.value = false;
        $toast.success("Task successfully edited!");
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

onMounted(async () => {
    task.value = await $trpc.task.findById.query(+route.params.task_id);
    project.value = await $trpc.project.findById.query(+route.params.project_id);
    console.log(task.value.labelset_id)
    labelset.value = await $trpc.labelset.findById.query(task.value.labelset_id);
    console.log(labelset.value)

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
