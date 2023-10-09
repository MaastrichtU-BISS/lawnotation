<template>
  <div class="my-4 mx-auto max-w-screen-lg">
    <h3 class="text-lg font-semibold mb-2">Projects</h3>
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
        <td
          scope="row"
          class="px-6 py-2 font-medium text-gray-900 whitespace-nowrap"
        >
          {{ item.id }}
        </td>
        <td class="px-6 py-2">
          {{ item.name }}
        </td>
        <td class="px-6 py-2">
          <NuxtLink class="base" :to="`/projects/${item.id}`"> Edit </NuxtLink>
        </td>
      </template>
    </Table>

    <h3 class="text-lg mt-8">Create new project</h3>
    <div class="flex flex-col w-1/2 space-y-2 border-t border-neutral-300 mt-3 pt-3">
      <input
        class="base"
        type="text"
        placeholder="Project name"
        v-model="new_project.name"
      />
      <textarea
        class="base"
        placeholder="Project description"
        v-model="new_project.desc"
      ></textarea>
      <button class="flex-none base btn-primary" @click="createNewProject">Add</button>
    </div>
  </div>
</template>
<script setup lang="ts">
import { Project } from "~/types";
import Table from "@/components/Table.vue";

const projectTable = ref<InstanceType<typeof Table> | null>();

const user = useSupabaseUser();
const { $toast, $trpc } = useNuxtApp();

const new_project = reactive<Omit<Project, "id">>({
  name: "",
  desc: "",
  editor_id: "",
});

const createNewProject = () => {
  try {
    new_project.editor_id = user.value?.id!;
    $trpc.project.create.mutate(new_project).then((project) => {
      projectTable.value?.refresh()
      $toast.success("Project created");
    });
  } catch (error) {
    if (error instanceof Error)
      $toast.error(`Error creating new projec: ${error.message}`);
  }
};

const removeProjects = async (ids: string[]) => {
  const promises: Promise<Boolean>[] = [];
  promises.push(...ids.map((id) => $trpc.project.delete.mutate(+id)));
  await Promise.all(promises);
  await projectTable.value?.refresh()
  $toast.success("Projects successfully deleted!");
};
const removeAllProjects = async () => {
  if (!user.value) throw new Error("Invalid User!");
  await $trpc.project.deleteAllFromUser.mutate();
  await projectTable.value?.refresh()
  $toast.success("Projects successfully deleted!");
};

definePageMeta({
  middleware: ["auth"],
});
</script>
