<template>
    <Breadcrumb v-if="project" :crumbs="[
        {
            name: 'Projects',
            link: '/projects',
        },
        {
            name: `Project ${project.name}`,
            link: `/projects/${project.id}`,
        },
    ]" />
    <div v-if="project" class="dimmer-wrapper">
        <Dimmer v-model="loading" />
        <div class="dimmer-content">
            <div class="flex justify-between">
                <h3 class="mb-2 text-lg font-semibold text-center">Edit Project</h3>
                <NuxtLink :to="`/projects/${project.id}`">
                    <Button label="View" size="small" link />
                </NuxtLink>
            </div>
            <div class="flex justify-center mb-4">
                <span class="relative w-1/2">
                    <InputText v-model="new_project.name" data-test="project-name" id="project_name" autocomplete="off"
                        class="peer w-full block" placeholder="" mode="filled" />
                    <label for="project_name"
                        class="absolute text-sm text-primary-500 dark:text-primary-400/60 duration-300 transform -translate-y-4 scale-75 top-4 z-10 origin-[0] start-2.5 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-4">Name</label>
                </span>
            </div>
            <div class="flex justify-center mb-4">
                <div class="w-1/2">                
                    <label for="project_description" class="block">Description</label>
                    <Textarea v-model="new_project.desc" data-test="project-description" autoResize rows="5" cols="30"
                        placeholder="Description" class="w-full" id="project_description" />
                </div>
            </div>
        </div>
        <div class="flex justify-center mb-5">
            <Button label="Save Changes" @click="editProject" data-test="save-changes-button" />
        </div>
        <div class="text-end mb-5">
            <ConfirmBox @onConfirm="confirmDelete" />
        </div>
    </div>
</template>
<script setup lang="ts">
import type {
    Project
} from "~/types";
import { authorizeClient } from "~/utils/authorize.client";
import ConfirmBox from "~/components/ConfirmBox.vue";

const { $toast, $trpc } = useNuxtApp();
const route = useRoute();
const project = await $trpc.project.findById.query(+route.params.project_id);
const new_project = ref<Partial<Project>>({
    name: project.name,
    desc: project.desc
});
const loading = ref<boolean>(false);

const editProject = async () => {
    loading.value = true;
    try {
        await $trpc.project.update.mutate({ id: project.id, updates: new_project.value });
        $toast.success("Update successfully");
        navigateTo('/projects');
    } catch (error) {
        $toast.error(`Update failed: ${error}`);
    } finally {
        loading.value = false;
    }
};

const confirmDelete = async () => {
    loading.value = true;
    try {
        await $trpc.project.delete.mutate(project.id);
        $toast.success(`Project was deleted successfully`);
        navigateTo('/projects');
    } catch(error) {
        $toast.error(`Project could not be deleted: ${error}`);
    } finally {
        loading.value = false;
    }
};

definePageMeta({
    middleware: [
        "auth",
        async (to) => authorizeClient([["project", +to.params.project_id]]),
    ],
});
</script>
  
  