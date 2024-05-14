<template>
  <div class="max-w-screen-lg mx-auto my-8">
    <GuidancePanel v-if="guidanceText != ''" :title="guidanceTitle" :text="guidanceText"/>
    <div class="flex justify-between">
      <h3 class="mb-2 text-lg font-semibold">Projects</h3>
      <div class="relative">
        <Button label="Add" icon="pi pi-plus" @click="showCreateModal = true" icon-pos="right"
          data-test="open-projects-modal" />
          <PulsingRedCircle v-if="guidanceTitle == 'Create your first project'" />
      </div>

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
          {{ item.desc }}
        </td>
        <td class="px-6 py-2 flex">
          <div class="relative mr-2">
            <NuxtLink data-test="view-project-link" :to="`/projects/${item.id}`">
              <Button label="View" size="small" />
            </NuxtLink>
            <PulsingRedCircle v-if="guidanceTitle == 'Go to the newly created project'" />
          </div>
          <NuxtLink :to="`/projects/${item.id}/edit`" data-test="edit-project-link">
            <Button label="Edit" size="small" link />
          </NuxtLink>
        </td>
      </template>
    </Table>
    <Dialog v-model:visible="showCreateModal" modal header="Create new project">
      <div class="flex justify-center mb-4">
        <span class="relative w-full">
          <InputText v-model="new_project.name" data-test="project-name" id="project_name" autocomplete="off"
            class="peer w-full" placeholder="" />
          <label for="project_name"
            class="absolute text-sm text-primary-500 dark:text-primary-400/60 duration-300 transform -translate-y-4 scale-75 top-4 z-10 origin-[0] start-2.5 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-4">Name</label>
        </span>
      </div>
      <Textarea v-model="new_project.desc" data-test="project-description" autoResize rows="5" cols="30"
        placeholder="Description" class="w-full mb-4" />
      <div class="flex justify-center mt-4">
        <Button class="mr-6" label="Cancel" size="small" icon="pi pi-times" iconPos="right" outlined
          @click="showCreateModal = false" />
        <Button data-test="add-project" label="Create" size="small" icon="pi pi-check" iconPos="right"
          @click="createNewProject" />
      </div>
    </Dialog>
  </div>
</template>
<script setup lang="ts">
import type { Project } from "~/types";
import Table from "@/components/Table.vue";
import PulsingRedCircle from "~/components/PulsingRedCircle.vue";
import GuidancePanel from "~/components/GuidancePanel.vue";

const projectTable = ref<InstanceType<typeof Table> | null>();

const user = useSupabaseUser();
const { $toast, $trpc } = useNuxtApp();

const new_project = reactive<Omit<Project, "id">>({
  name: "",
  desc: "",
  editor_id: "",
});

const showCreateModal = ref<boolean>(false);

const guidanceText = computed(() => {
  if(projectTable.value?.total == 0) {
    return "The first step is to create a new project. To do that, click on the highlighted button and fill in the form."
  } else if (projectTable.value?.total == 1) {
    return "Now that you have a project, click on the highlighted button to continue."
  }
  return ''
});

const guidanceTitle = computed(() => {
  if(projectTable.value?.total == 0) {
    return "Create your first project"
  } else if (projectTable.value?.total == 1) {
    return "Go to the newly created project"
  }
  return ''
});

watch(showCreateModal, (new_val) => {
  if (!new_val) {
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

const removeProjects = (ids: string[], finish: (promises: (Promise<Boolean>[])) => void) => {
  finish(ids.map((id) => $trpc.project.delete.mutate(+id)));
};

const removeAllProjects = (finish: (promises: (Promise<Boolean>)) => void) => {
  finish($trpc.project.deleteAllFromEditor.mutate())
};

definePageMeta({
  middleware: ["auth"],
});
</script>
