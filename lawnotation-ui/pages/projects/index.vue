<template>
  <div class="max-w-screen-lg mx-auto my-4">
    <h3 class="mb-2 text-lg font-semibold">Projects</h3>
    <Table
      endpoint="projects"
      ref="projectTable"
      :sort="true"
      :search="true"
      :selectable="true"
      @remove-rows="removeProjects"
      @remove-all-rows="removeAllProjects"
    >
      <template #row="{ item }: { item: Project }">
        <td scope="row" class="px-6 py-2 font-medium text-gray-900 whitespace-nowrap">
          {{ item.id }}
        </td>
        <td class="px-6 py-2">
          {{ item.name }}
        </td>
        <td class="px-6 py-2">
          <NuxtLink data-test="edit-project-link" class="base" :to="`/projects/${item.id}`"> 
            <button class="base btn-primary">View</button>
          </NuxtLink>
        </td>
      </template>
    </Table>

    <h3 class="mt-8 text-lg">Create new project</h3>
    <div class="flex flex-col w-1/2 pt-3 mt-3 space-y-2 border-t border-neutral-300">
      <input
        data-test="project-name"
        class="base"
        type="text"
        placeholder="Project name"
        v-model="new_project.name"
      />
      <textarea
        data-test="project-description"
        class="base"
        placeholder="Project description"
        v-model="new_project.desc"
      ></textarea>
      <button data-test="add-project" class="flex-none base btn-primary" @click="createNewProject">Add</button>
    </div>
  </div>
</template>
<script setup lang="ts">
import type { Project } from "~/types";
import Table from "@/components/Table.vue";
import { TRPCClientError } from "@trpc/client";
import { TRPCError } from "@trpc/server";
import type { ZodError, typeToFlattenedError } from "zod";

const projectTable = ref<InstanceType<typeof Table> | null>();

const user = useSupabaseUser();
const { $toast, $trpc } = useNuxtApp();

const new_project = reactive<Omit<Project, "id">>({
  name: "",
  desc: "",
  editor_id: "",
});

const createNewProject = async () => {
  try {
    new_project.editor_id = user.value?.id!;
    const project = await $trpc.project.create.mutate(new_project)
    projectTable.value?.refresh()
    $toast.success("Project created");
  } catch (error) {
    trpcErrorHandler(error as Error, "creating new project")
  }
};

const removeProjects = async (ids: string[]) => {
  const promises: Promise<Boolean>[] = [];
  promises.push(...ids.map((id) => $trpc.project.delete.mutate(+id)));
  await Promise.all(promises);
  await projectTable.value?.refresh();
  $toast.success("Projects successfully deleted!");
};
const removeAllProjects = async () => {
  if (!user.value) throw new Error("Invalid User!");
  await $trpc.project.deleteAllFromEditor.mutate();
  await projectTable.value?.refresh();
  $toast.success("Projects successfully deleted!");
};

definePageMeta({
  middleware: ["auth"],
});
</script>
