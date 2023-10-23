<template>
  <div class="my-4 mx-auto max-w-screen-lg">
    <h3 class="text-lg font-semibold mb-2">Projects</h3>
    <div class="dimmer-wrapper" style="min-height: 200px">
      <Dimmer v-model="projectTable.loading" />
      <div class="dimmer-content">
        <Table
          :name="'projects'"
          :tabledata="projectTable"
          :sort="true"
          :search="true"
          :remove="true"
          @remove-rows="removeProjects"
          @remove-all-rows="removeAllProjects"
        >
          <template #row="{ item }: { item: Project }">
            <tr class="bg-white border-b hover:bg-gray-50">
              <td class="px-6 py-2">
                <input
                  type="checkbox"
                  :data-id="item.id.toString()"
                  name="projects_table_checkbox"
                  class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500"
                />
              </td>
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
            </tr>
          </template>
        </Table>
      </div>
    </div>

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
import { Project, useProjectApi } from "~/data/project";
import Table from "@/components/Table.vue";
import { TableData, createTableData } from "@/utils/table";
const projectApi = useProjectApi();
const user = useSupabaseUser();
const { $toast } = useNuxtApp();

const projectTable = createTableData<Project>(
  {
    Id: {
      field: "id",
      sort: true,
    },
    Name: {
      field: "name",
      sort: true,
      search: true,
    },
    Action: {},
  },
  {
    type: "table",
    from: "projects",
    filter: { editor_id: user.value?.id },
  }
);

const new_project = reactive<Omit<Project, "id">>({
  name: "",
  desc: "",
  editor_id: "",
});

onMounted(() => {
  if (user.value) projectTable.load();
  else {
    watch(user, () => {
      if (!projectTable.total && user.value) {
        projectTable.load();
      }
    });
  }
});

const createNewProject = () => {
  try {
    new_project.editor_id = user.value?.id;
    projectApi.createProject(new_project).then((project) => {
      projectTable.load();
      $toast.success("Project created");
    });
  } catch (error) {
    if (error instanceof Error)
      $toast.error(`Error creating new projec: ${error.message}`);
  }
};

const removeProjects = async (ids: string[]) => {
  const promises: Promise<Boolean>[] = [];
  promises.push(...ids.map((id) => projectApi.deleteProject(id)));
  await Promise.all(promises);
  await projectTable.load();
  $toast.success("Projects successfully deleted!");
};
const removeAllProjects = async () => {
  if (!user.value) throw new Error("Invalid User!");
  await projectApi.deleteAllProjects(user.value?.id.toString());
  await projectTable.load();
  $toast.success("Projects successfully deleted!");
};

definePageMeta({
  middleware: ["auth"],
});
</script>
