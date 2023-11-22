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
      <Table
        ref="documentTable"
        endpoint="documents"
        :filter="{ project_id: project?.id }"
        :sort="true"
        :search="true"
        :selectable="true"
        @remove-rows="removeDocuments"
        @remove-all-rows="removeAllDocuments"
      >
        <template #row="{ item }: { item: Document }">
          <td scope="row" class="px-6 py-2 font-medium text-gray-900 whitespace-nowrap">
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
        </template>
      </Table>

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
      <Table
        ref="taskTable"
        endpoint="tasks"
        :filter="{ project_id: project?.id }"
        :sort="true"
        :search="true"
        :selectable="true"
        @remove-rows="removeTasks"
        @remove-all-rows="removeAllTasks"
      >
        <template #row="{ item }: { item: Task }">
          <td scope="row" class="px-6 py-2 font-medium text-gray-900 whitespace-nowrap">
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
        </template>
      </Table>

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
              v-model="new_task.labelset_id"
              class="w-full flex-grow bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 px-2.5 py-1.5"
            >
              <option v-if="labelsets.pending.value" disabled selected value="">
                Loading labelsets...
              </option>
              <template v-else-if="labelsets.data.value && labelsets.data.value.length">
                <option :value="undefined" disabled selected hidden>
                  Select from list
                </option>
                <option v-for="labelset of labelsets.data.value" :value="labelset.id">
                  {{ labelset.name }}
                </option>
              </template>
              <option v-else disabled selected value="">No labelsets found</option>
            </select>
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
import type { Project, Document, Task, Labelset } from "~/types";
import Table from "~/components/Table.vue";
import type { _AsyncData } from "nuxt/dist/app/composables/asyncData";
import { authorizeClient } from "~/utils/authorize.client";

const { $toast, $trpc } = useNuxtApp();

const { project } = usePage<{ project: Project }>().value;

const route = useRoute();

const loading_docs = ref(false);

const tab_active = ref<"tasks" | "documents">("tasks");

const labelsets = await $trpc.labelset.find.useQuery({});

type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>;

const documentTable = ref<InstanceType<typeof Table>>();
const taskTable = ref<InstanceType<typeof Table>>();

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
  documentTable.value?.refresh();

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
    $trpc.task.create.mutate(new_task as Omit<Task, "id">).then(() => {
      // tasks.push(task);
      taskTable.value?.refresh();
      $toast.success("Task created");
    });
  } catch (error) {
    if (error instanceof Error) $toast.error(`Error creating task: ${error.message}`);
  }
};

const removeDocuments = async (ids: string[]) => {
  const promises: Promise<Boolean>[] = [];
  promises.push(...ids.map((id) => $trpc.document.delete.mutate(+id)));
  await Promise.all(promises);
  await documentTable.value?.refresh();
  $toast.success("Documents successfully deleted!");
};
const removeAllDocuments = async () => {
  if (!project) throw new Error("Invalid Project!");
  await $trpc.document.deleteAllFromProject.mutate(+project.id);
  await documentTable.value?.refresh();
  $toast.success("Documents successfully deleted!");
};
const removeTasks = async (ids: string[]) => {
  const promises: Promise<Boolean>[] = [];
  promises.push(...ids.map((id) => $trpc.task.delete.mutate(+id)));
  await Promise.all(promises);
  await taskTable.value?.refresh();
  $toast.success("Tasks successfully deleted!");
};
const removeAllTasks = async () => {
  if (!project) throw new Error("Invalid Project!");
  await $trpc.task.deleteAllFromProject.mutate(project.id);
  await taskTable.value?.refresh();
  $toast.success("Tasks successfully deleted!");
};

onMounted(() => {
  // project.value = projectQuery.data.value!;
  new_task.project_id = project.id;

  // $trpc.labelset.find.query({}).then((_labelsets) => {
  //   labelsets.push(..._labelsets);
  // });
});

definePageMeta({
  middleware: [
    "auth",
    async (to) => authorizeClient([["project", +to.params.project_id]]),
  ],
});
</script>

<style lang="scss">
div.tabs-holder {
  @apply text-sm font-medium text-center text-gray-500 border-b border-gray-200;
  li.tab button {
    @apply inline-block p-4 border-b-2 border-transparent rounded-t-lg hover:text-gray-600 hover:border-gray-300;
  }
  li.tab-active button {
    @apply inline-block p-4 text-primary border-b-2 border-primary rounded-t-lg;
  }
}
</style>
