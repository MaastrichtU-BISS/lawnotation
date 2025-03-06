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
                    <input class="base" type="text" placeholder="Task name" v-model="new_task.name"
                        data-test="task-name" />
                    <textarea class="base" placeholder="Task description" v-model="new_task.desc"
                        data-test="task-description"></textarea>
                    <textarea class="base" placeholder="Annotation Guidelines" v-model="new_task.ann_guidelines"
                        data-test="annotation-guidelines"></textarea>
                    <Dropdown :disabled="hasAssignments" v-model="new_task.labelset_id" :options="labelsets"
                        optionLabel="name" optionValue="id" filter class="w-full text-left" />
                    <Button @click="editTask" label="Save Task Changes" data-test="save-changes-button" />
                </div>
                <div v-if="new_emails && new_emails.length"
                    class="flex flex-col my-5 w-1/2 mx-auto mt-8 space-y-2 border-neutral-300 pt-3">
                    <h3 class="text-lg font-semibold">Replace Annotators</h3>
                    <ul class="">
                        <li v-for="(email, index) in new_emails" class="">
                            <div class="relative mb-2">
                                <div class="absolute inset-y-0 start-0 flex items-center ps-3.5 pointer-events-none">
                                    <i class="pi pi-envelope"></i>
                                </div>
                                <input type="text" v-model="new_emails[index]"
                                    :placeholder="`annotator ${annotators[index].annotator_number}`"
                                    class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full ps-10 p-2.5  dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" />
                            </div>
                        </li>
                    </ul>
                    <Button @click="replaceAnnotators" label="Save Annotators Changes" />
                </div>
                <div class="flex flex-col my-5 w-1/2 mx-auto mt-8 space-y-2 border-neutral-300 pt-3">
                    <h3 class="text-lg font-semibold">Manage Editors</h3>
                    <ul class="">
                        <li v-for="(editor, index) in editors" class="flex justify-between">
                            <div class="relative mb-2 w-full">
                                <div class="absolute inset-y-0 start-0 flex items-center ps-3.5 pointer-events-none">
                                    <i class="pi pi-envelope"></i>
                                </div>
                                <input type="text" v-model="editors[index].user.email" placeholder="new@editor.com"
                                    :disabled="editors[index].id > 0"
                                    class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full ps-10 p-2.5  dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" />
                            </div>
                            <Button class="float-right text-red-500 text-xs !p-2 " link type="button" icon="pi pi-trash"
                                @click="removeEditor(index)" />
                        </li>
                        <Button :disabled="editors.length > 0 && !validateEmail(editors.at(-1)?.user.email)"
                            class="float-right text-xs !p-2 " outlined type="button" label="Add" icon="pi pi-plus"
                            @click="addEditor" />
                    </ul>
                    <Button @click="saveEditorCahnges" label="Save Editors Changes" />
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { Task, Project, Annotator, Assignment, Labelset, User } from "~/types";
import { validateEmail } from "~/utils/validators";
import Dimmer from "~/components/Dimmer.vue";
import Dropdown from "primevue/dropdown";
import Button from 'primevue/button';
import { authorizeClient } from "~/utils/authorize.client";

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

const editors = reactive<{ id: number, user: Omit<User, 'role'> }[]>([]);

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

const addEditor = () => {
    editors.push({ id: 0, user: { id: "", email: "" } });
}

const removeEditor = (index: number) => {
    editors.splice(index, 1);
}

const saveEditorCahnges = async () => {
    if (!project.value || !task.value) {
        throw new Error("Project or Task not loaded yet");
    }

    loading.value = true;
    try {
        await $trpc.editor.updateAllFromTask.mutate({
            project_id: project.value?.id,
            task_id: task.value?.id,
            emails: editors.map(e => e.user.email)
        });
        $toast.success("Editor changes successfully saved!");
    } catch (error) {
        $toast.error("Error editing editors");
    } finally {
        loading.value = false;
    }
}

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

    editors.splice(0) && editors.push(
        ...(await $trpc.editor.getAllFromTask.query(+route.params.task_id))
    );

    console.log(editors);

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
