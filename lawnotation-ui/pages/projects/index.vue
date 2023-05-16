<template>
  <div class="my-4 mx-auto max-w-screen-lg">
    <div class="dimmer-wrapper" style="min-height: 200px">
      <Dimmer v-model="projectTable.loading" />
      <div class="dimmer-content">
        <h3 class="text-lg font-semibold mb-2">Projects</h3>

        <Table :tabledata="projectTable">
          <template #head>
            <tr>
              <th
                scope="col"
                class="px-6 py-3"
                v-for="colname in ['Id', 'Name', 'Action']"
              >
                {{ colname }}
              </th>
            </tr>
          </template>
          <template #body>
            <tr
              class="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
              v-for="project in projectTable.rows"
              :key="project.id"
            >
              <th
                scope="row"
                class="px-6 py-2 font-medium text-gray-900 whitespace-nowrap dark:text-white"
              >
                {{ project.id }}
              </th>
              <td class="px-6 py-2">
                {{ project.name }}
              </td>
              <td class="px-6 py-2">
                <NuxtLink
                  class="font-medium text-blue-600 dark:text-blue-500 hover:underline"
                  :to="`/projects/${project.id}`"
                  >Edit</NuxtLink
                >
              </td>
            </tr>
          </template>
        </Table>
      </div>
    </div>

    <h3 class="text-lg mt-8">Create new project</h3>
    <div class="flex flex-col w-1/2 space-y-2 border-t border-neutral-300 mt-3 pt-3">
      <input type="text" placeholder="Project name" v-model="new_project.name" />
      <textarea placeholder="Project description" v-model="new_project.desc"></textarea>
      <button class="flex-none btn-primary" @click="createNewProject">Add</button>
    </div>
  </div>
</template>
<script setup lang="ts">
import { Project, useProjectApi } from "~/data/project";
import Table, { TableData } from "@/components/Table.vue";
const projectApi = useProjectApi();
const user = useSupabaseUser();
const { $toast } = useNuxtApp();

const projectTable = reactive<TableData<Project>>({
  total: 0,
  rows: [],

  page: 1,
  items_per_page: 10,
  loading: false,

  async load() {
    if (!user.value) return;

    this.loading = true;

    const { rows, count } = await projectApi.tableProjects(
      user.value.id,
      (this.page - 1) * this.items_per_page,
      this.items_per_page
    );
    if (rows) this.rows = rows;
    if (count) this.total = count;

    this.loading = false;
  },
});

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

definePageMeta({
  middleware: ["auth"],
});
</script>
