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
            <section class="grid md:grid-cols-2">
                <form @submit.prevent="editProject">
                    <Card>
                        <template #title>
                            <div class="flex items-center justify-between">
                                <h3 class="text-lg font-semibold text-center">Edit Project</h3>
                                <NuxtLink :to="`/projects/${project.id}`">
                                    <Button label="View" size="small" link />
                                </NuxtLink>
                            </div>
                        </template>
                        <template #content>
                            <main class="flex flex-col gap-4">
                                <div class="flex flex-col relative">
                                    <InputText v-model="new_project.name" required data-test="project-name"
                                        id="project_name" autocomplete="off" class="peer w-full block" placeholder="" />
                                    <label for="project_name"
                                        class="absolute text-sm text-primary-500 dark:text-primary-400/60 duration-300 transform -translate-y-4 scale-75 top-3 z-10 origin-[0] start-2.5 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-4">Name<span
                                            class="text-red-500">*</span></label>
                                </div>
                                <div class="flex flex-col">
                                    <label for="project_description" class="block">Description</label>
                                    <Textarea v-model="new_project.desc" data-test="project-description" autoResize
                                        rows="5" cols="30" placeholder="Description" class="w-full"
                                        id="project_description" />
                                </div>
                            </main>
                        </template>
                        <template #footer>
                            <div class="flex justify-end">
                                <Button type="submit" label="Save Changes" data-test="save-changes-button" />
                            </div>
                        </template>
                    </Card>
                </form>
            </section>
        </div>
    </div>
</template>
<script setup lang="ts">
import type {
    Project
} from "~/types";
import { authorizeClient } from "~/utils/authorize.client";

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

definePageMeta({
    middleware: [
        "auth",
        async (to) => authorizeClient([["project", +to.params.project_id]]),
    ],
});
</script>