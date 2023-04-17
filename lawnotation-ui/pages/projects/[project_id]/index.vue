<template>
  <div v-if="project">
    <h3 class="my-3 text-lg font-semibold mb-2">Project</h3>
    <div>{{ project }}</div>
    <h3 class="my-3 text-lg font-semibold">Documents: {{ documents.length }}</h3>
    <ul v-for="d in documents" :key="'doc_' + d.id" class="list-disc list-inside">
      <li>
        <span
          >{{ d.id }}.
          <NuxtLink :to="`/projects/${route.params.project_id}/documents/${d.id}`">{{
            d.name
          }}</NuxtLink></span
        >
      </li>
    </ul>
    <div class="my-3">
      <span class="mr-3"> Add Docs</span>
      <input
        type="file"
        name="data-set"
        id=""
        accept=".txt"
        multiple
        @change="change_file($event)"
      />
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
        <input type="text" placeholder="Project name" v-model="new_task.name" />
        <textarea placeholder="Project description" v-model="new_task.desc"></textarea>
        <label for="label_id">Labels Id</label>
        <input type="number" name="" id="label_id" v-model="new_task.label_id" />
        <button class="btn-primary" @click="createTask">Create Tasks</button>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { Project, useProjectApi } from "~/data/project";
import { Document, useDocumentApi } from "~/data/document";
import { Task, useTaskApi } from "~/data/task";

const projectApi = useProjectApi();
const documentApi = useDocumentApi();
const taskApi = useTaskApi();

const route = useRoute();
const project = ref<Project>();
const documents = reactive<Document[]>([]);
const tasks = reactive<Task[]>([]);

const new_task = reactive({
  name: "",
  desc: "",
  label_id: 1,
  project_id: 0,
});

const change_file = (event: Event) => {
  Array.from(event.target.files).forEach((file: File) => {
    var reader = new FileReader();
    reader.onload = () => {
      documentApi
        .createDocument({
          name: file.name,
          source: "local_upload",
          full_text: reader.result?.toString(),
          project_id: route.params.project_id,
        })
        .then((doc) => {
          documents.push(doc);
        });
    };
    reader.readAsText(file);
  });
};

const createTask = () => {
  if (new_task.name == "") {
    alert("name required");
    return;
  }
  if (new_task.desc == "") {
    alert("desc required");
    return;
  }

  taskApi.createTask(new_task).then((task) => {
    tasks.push(task);
  });
};

onMounted(() => {
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
});

definePageMeta({
  middleware: ["auth"],
});
</script>
