<template>
  <Breadcrumb
    v-if="project"
    :crumbs="[
      {
        name: 'Projects',
        link: '/projects',
      },
      {
        name: `Project ${project.name}`,
        link: `/projects/${project.id}`,
      },
    ]"
  />

  <div v-if="project">
    <p class="mt-1 mb-3 text-gray-700 text-sm">{{ project.desc }}</p>

    <div class="tabs-holder">
      <ul class="flex flex-wrap -mb-px">
        <li :class="tab_active == 'tasks' ? 'tab-active' : 'tab'">
          <button @click="tab_active = 'tasks'">Tasks</button>
        </li>
        <li :class="tab_active == 'documents' ? 'tab-active' : 'tab'">
          <button @click="tab_active = 'documents'">Documents</button>
        </li>
      </ul>
    </div>

    <div v-show="tab_active == 'documents'">
      <div class="my-3 dimmer-wrapper">
        <Dimmer v-model="documentTable.loading" />
        <Table
          :name="'documents'"
          :tabledata="documentTable"
          :sort="true"
          :search="true"
          :remove="true"
          @remove-rows="removeDocuments"
          @remove-all-rows="removeAllDocuments"
        >
          <template #row="{ item }: { item: Document }">
            <tr class="bg-white border-b hover:bg-gray-50">
              <td class="px-6 py-2">
                <input
                  type="checkbox"
                  :data-id="item.id.toString()"
                  name="documents_table_checkbox"
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
                <NuxtLink
                  class="base"
                  :to="`/projects/${route.params.project_id}/documents/${item.id}`"
                >
                  View
                </NuxtLink>
              </td>
            </tr>
          </template>
        </Table>
      </div>

      <div class="my-3 dimmer-wrapper">
        <Dimmer v-model="loading_docs" />
        <div class="dimmer-content">
          <span class="mr-3">Add documents</span>
          <input
            class="base"
            type="file"
            name="data-set"
            id="doc_input"
            accept=".txt"
            webkitdirectory
            directory
            multiple
            @change="change_file($event)"
          />
        </div>
      </div>
    </div>

    <div v-show="tab_active == 'tasks'">
      <div class="my-3 dimmer-wrapper">
        <Dimmer v-model="taskTable.loading" />
        <Table
          :name="'tasks'"
          :tabledata="taskTable"
          :sort="true"
          :search="true"
          :remove="true"
          @remove-rows="removeTasks"
          @remove-all-rows="removeAllTasks"
        >
          <template #row="{ item }: { item: Task }">
            <tr class="bg-white border-b hover:bg-gray-50">
              <td class="px-6 py-2">
                <input
                  type="checkbox"
                  :data-id="item.id.toString()"
                  name="tasks_table_checkbox"
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
                {{ item.desc }}
              </td>
              <td class="px-6 py-2">
                <NuxtLink
                  class="base"
                  :to="`/projects/${route.params.project_id}/tasks/${item.id}`"
                >
                  View
                </NuxtLink>
              </td>
            </tr>
          </template>
        </Table>
      </div>

      <div class="my-3">
        <h3 class="text-lg mt-8">Create new task</h3>
        <div class="flex flex-col w-1/2 space-y-2 border-t border-neutral-300 mt-3 pt-3">
          <input
            class="base"
            type="text"
            placeholder="Task name"
            v-model="new_task.name"
          />
          <textarea
            class="base"
            placeholder="Task description"
            v-model="new_task.desc"
          ></textarea>
          <textarea
            class="base"
            placeholder="Annotation Guidelines"
            v-model="new_task.ann_guidelines"
          ></textarea>

          <label for="label_id">Labelset</label>
          <div class="flex items-start w-full space-x-2">
            <select
              v-if="labelsets.length"
              v-model="new_task.labelset_id"
              class="flex-grow bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 px-2.5 py-1.5"
            >
              <option :value="undefined" disabled selected hidden>
                Select from list
              </option>
              <option v-for="labelset of labelsets" :value="labelset.id">
                {{ labelset.name }}
              </option>
            </select>
            <span v-else>No labelsets found</span>
            <button
              class="base btn-secondary"
              style="flex: 0 0 content"
              @click="() => navigateTo('/labelset/new')"
            >
              Create new labelset
            </button>
          </div>

          <button class="base btn-primary" @click="createTask">Create Tasks</button>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import {
  Project,
  Document,
  Task,
  Labelset,
} from "~/types";
import Table from "~/components/Table.vue";
import { TableData, createTableData } from "~/utils/table";

const { $toast, $trpc } = useNuxtApp();

const user = useSupabaseUser();

const route = useRoute();
const project = ref<Project>();
const loading_docs = ref(false);

const tab_active = ref<"tasks" | "documents">("tasks");

const labelsets = reactive<Labelset[]>([]);

const documentTable = createTableData<Document>(
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
    from: "documents",
    filter: () => ({ project_id: project.value?.id }),
  }
);

const taskTable = createTableData<Task>(
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
    Description: {
      field: "desc",
      search: true,
    },
    Action: {},
  },
  {
    type: "table",
    from: "tasks",
    filter: () => ({ project_id: project.value?.id }),
  }
);

type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>;

const new_task = reactive<Optional<Task, "id" | "labelset_id" | "project_id">>({
  name: "",
  desc: "",
  ann_guidelines: "",
  labelset_id: undefined,
  project_id: undefined,
});

const change_file = async (event: Event) => {
  var text_promises: Promise<string>[] = [];
  var new_docs: Omit<Document, "id">[] = [];
  loading_docs.value = true;

  Array.from((event.target as HTMLInputElement).files ?? []).forEach((file: File) => {
    text_promises.push(file.text());
    new_docs.push({
      name: file.name,
      source: "local_upload",
      full_text: "",
      project_id: +route.params.project_id,
    });
  });

  const texts = await Promise.all(text_promises);

  texts.forEach((t, index) => {
    new_docs[index].full_text = t;
  });

  // TODO: progress bar instead of instantly adding to list, and after all are added reload documents table (keep loading = true while adding?)
  // documents.push(...(await documentApi.createDocuments(new_docs)));
  await $trpc.document.createMany.mutate(new_docs);
  documentTable.load();

  (event.target as HTMLInputElement).value = "";
  $toast.success(`${new_docs.length} documents uploaded!`);
  loading_docs.value = false;
};

const createTask = () => {
  try {
    if (!new_task.project_id === undefined) {
      throw new Error("Task must be part of project");
    }
    if (!new_task.labelset_id === undefined) {
      throw new Error("Task must have a labelset");
    }
    if (new_task.name == "") {
      throw new Error("Task name is required");
    }
    if (new_task.desc == "") {
      throw new Error("Task description is required");
    }

    // For some reason casting as Omit<Task, "id"> is necessary here.
    $trpc.task.create.mutate(new_task as Omit<Task, "id">).then((task) => {
      // tasks.push(task);
      taskTable.load();
      $toast.success("Task created");
    });
  } catch (error) {
    if (error instanceof Error) $toast.error(`Error creating task: ${error.message}`);
  }
};

const removeDocuments = async (ids: number[]) => {
  const promises: Promise<Boolean>[] = [];
  promises.push(...ids.map((id) => $trpc.document.delete.mutate(id)));
  await Promise.all(promises);
  await documentTable.load();
  $toast.success("Documents successfully deleted!");
};
const removeAllDocuments = async () => {
  if (!project.value) throw new Error("Invalid Project!");
  await $trpc.document.deleteAllFromProject.mutate(+project.value.id);
  await documentTable.load();
  $toast.success("Documents successfully deleted!");
};
const removeTasks = async (ids: number[]) => {
  const promises: Promise<Boolean>[] = [];
  promises.push(...ids.map((id) => $trpc.task.delete.mutate(id)));
  await Promise.all(promises);
  await taskTable.load();
  $toast.success("Tasks successfully deleted!");
};
const removeAllTasks = async () => {
  if (!project.value) throw new Error("Invalid Project!");
  await $trpc.task.deleteAllFromProject.mutate(project.value.id);
  await taskTable.load();
  $toast.success("Tasks successfully deleted!");
};

onMounted(() => {
  try {
    $trpc.project.findById.query(+route.params.project_id).then((p) => {
      project.value = p;
      new_task.project_id = p.id;

      documentTable.load();
      taskTable.load();
    });

    $trpc.labelset.find.query({}).then((_labelsets) => {
      labelsets.push(..._labelsets);
    });
  } catch (error) {
    if (error instanceof Error) $toast.error(`Error loading data: ${error.message}`);
  }
});

definePageMeta({
  middleware: ["auth"],
});
</script>

<style lang="scss">
div.tabs-holder {
  @apply text-sm font-medium text-center text-gray-500 border-b border-gray-200;
  li.tab button {
    @apply inline-block p-4 border-b-2 border-transparent rounded-t-lg hover:text-gray-600 hover:border-gray-300;
  }
  li.tab-active button {
    @apply inline-block p-4 text-blue-600 border-b-2 border-blue-600 rounded-t-lg;
  }
}
</style>
