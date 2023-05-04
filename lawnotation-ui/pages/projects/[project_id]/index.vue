<template>
  <div v-if="project">
    <h3 class="my-3 text-lg font-semibold mb-2">Project</h3>
    <pre>{{ project }}</pre>
    <h3 class="my-3 text-lg font-semibold">Documents: {{ documents.length }}</h3>
    <ul v-for="d in documents" :key="'doc_' + d.id" class="list-disc list-inside">
      <li>
        <span>
          {{ d.id }}.
          <NuxtLink :to="`/projects/${route.params.project_id}/documents/${d.id}`">{{
            d.name
          }}</NuxtLink>
        </span>
      </li>
    </ul>
    <div class="my-3 dimmer-wrapper">
      <Dimmer v-model="loading_docs" />
      <div class="dimmer-content">
        <span class="mr-3">Add Docs</span>
        <input
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
    <h3 class="my-3 text-lg font-semibold">Tasks: {{ tasks.length }}</h3>
    <ul v-for="t in tasks" :key="'task_' + t.id" class="list-disc list-inside">
      <li>
        <span
          >{{ t.id }}.
          <NuxtLink :to="`/projects/${route.params.project_id}/tasks/${t.id}`">{{
            t.name
          }}</NuxtLink></span
        >
      </li>
    </ul>
    <div class="my-3">
      <div class="flex flex-col w-1/2 space-y-2 border-t border-neutral-300 mt-3 pt-3">
        <input type="text" placeholder="Task name" v-model="new_task.name" />
        <textarea placeholder="Task description" v-model="new_task.desc"></textarea>
        <textarea
          placeholder="Annotation Guidelines"
          v-model="new_task.ann_guidelines"
        ></textarea>

        <label for="label_id">Labelset</label>
        <div>
          <select v-if="labelsets.length" v-model="new_task.labelset_id" class="w-64">
            <option v-for="labelset of labelsets" :value="labelset.id">
              {{ labelset.name }}
            </option>
          </select>
          <span v-else>No labelsets found</span>
          <button class="btn-secondary" @click="() => navigateTo('/labelset/new')">
            Create new labelset
          </button>
          <!-- <input type="number" name="" id="label_id" v-model="new_task.label_id" /> -->
        </div>

        <button class="btn-primary" @click="createTask">Create Tasks</button>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { Project, useProjectApi } from "~/data/project";
import { Document, useDocumentApi } from "~/data/document";
import { Task, useTaskApi } from "~/data/task";
import { Labelset, useLabelsetApi } from "~/data/labelset";
import { useToast } from "vue-toastification";

const toast = useToast();

const user = useSupabaseUser();
const projectApi = useProjectApi();
const documentApi = useDocumentApi();
const taskApi = useTaskApi();
const labelsetApi = useLabelsetApi();

const route = useRoute();
const project = ref<Project>();
const documents = reactive<Document[]>([]);
const loading_docs = ref(false);
const tasks = reactive<Task[]>([]);

const labelsets = reactive<Labelset[]>([]);

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
      project_id: route.params.project_id.toString(),
    });
  });

  const texts = await Promise.all(text_promises);

  texts.forEach((t, index) => {
    new_docs[index].full_text = t;
  });

  documents.push(...(await documentApi.createDocuments(new_docs)));

  (event.target as HTMLInputElement).value = "";
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
    taskApi.createTask(new_task as Omit<Task, "id">).then((task) => {
      tasks.push(task);
      toast.success("Task created");
    });
  } catch (error) {
    if (error instanceof Error)
      // alert(`CAUGHT: ${error.message}`)
      toast.error(`Error creating task: ${error.message}`);
  }
};

onMounted(() => {
  try {
    projectApi.findProject(route.params.project_id.toString()).then((p) => {
      project.value = p;
      new_task.project_id = p.id;
      documentApi.findDocuments(p.id.toString()).then((docs) => {
        documents.splice(0) && documents.push(...docs);
      });
      taskApi.findTasks(p.id.toString()).then((_tasks) => {
        tasks.splice(0) && tasks.push(..._tasks);
      });
    });

    labelsetApi.findLabelsets().then((_labelsets) => {
      labelsets.push(..._labelsets);
    });
  } catch (error) {
    if (error instanceof Error) toast.error(`Error loading data: ${error.message}`);
  }
});

definePageMeta({
  middleware: ["auth"],
});
</script>
