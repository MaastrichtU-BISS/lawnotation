<template>
  <div class="max-w-screen-lg mx-auto my-4">
    <div class="flex justify-between">
      <h3 class="mb-2 text-lg font-semibold">Projects</h3>
      <Button label="Add" icon="pi pi-plus" @click="showCreateModal = true" icon-pos="right" data-test="open-projects-modal"/>
    </div>
    <Table endpoint="projects" ref="projectTable" :sort="true" :search="true" :selectable="true"
      @remove-rows="removeProjects" @remove-all-rows="removeAllProjects">
      <template #row="{ item }: { item: Project }">
        <td scope="row" class="px-6 py-2 font-medium text-gray-900 whitespace-nowrap">
          {{ item.id }}
        </td>
        <td class="px-6 py-2">
          {{ item.name }}
        </td>
        <td class="px-6 py-2">
          <NuxtLink data-test="view-project-link" class="mr-2" :to="`/projects/${item.id}`">
            <Button label="View" size="small" />
          </NuxtLink>
          <NuxtLink :to="`/projects/${item.id}/edit`" data-test="edit-project-link">
            <Button label="Edit" size="small" link />
          </NuxtLink>
        </td>
      </template>
    </Table>
    <Dialog v-model:visible="showCreateModal" modal header="Create new project">
      <div class="flex justify-center mb-4">
        <span class="relative w-full">
          <InputText v-model="new_project.name" data-test="project-name" id="project_name" autocomplete="off" class="peer w-full" placeholder="" />
          <label for="project_name"
            class="absolute text-sm text-primary-500 dark:text-primary-400/60 duration-300 transform -translate-y-4 scale-75 top-4 z-10 origin-[0] start-2.5 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-4">Name</label>
        </span>
      </div>
      <Textarea v-model="new_project.desc" data-test="project-description" autoResize rows="5" cols="30" placeholder="Description" class="w-full mb-4"/>
      <div class="flex justify-center mt-4">
        <Button class="mr-6" label="Cancel" size="small" icon="pi pi-times" iconPos="right" outlined @click="showCreateModal = false"/>
        <Button data-test="add-project" label="Create" size="small" icon="pi pi-check" iconPos="right" @click="createNewProject"/>
      </div>
    </Dialog>
  </div>
</template>
<script setup lang="ts">
import type { Project } from "~/types";
import Table from "@/components/Table.vue";

const projectTable = ref<InstanceType<typeof Table> | null>();

const user = useSupabaseUser();
const { $toast, $trpc } = useNuxtApp();

const new_project = reactive<Omit<Project, "id">>({
  name: "",
  desc: "",
  editor_id: "",
});

const showCreateModal = ref<boolean>(false);

watch(showCreateModal, (new_val) => {
  if(!new_val) {
    new_project.name = new_project.desc = "";
  }
})

const createNewProject = async () => {
  try {
    new_project.editor_id = user.value?.id!;
    await $trpc.project.create.mutate(new_project)
    projectTable.value?.refresh()
    $toast.success("Project created");
  } catch (error) {
    trpcErrorHandler(error as Error, "creating new project")
  } finally {
    showCreateModal.value = false;
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
