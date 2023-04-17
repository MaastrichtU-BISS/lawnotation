<template>
  <div v-if="task">
    <h3 class="my-3 text-lg font-semibold">Task:</h3>
    <h3>{{ task }}</h3>
    <h3 class="my-3 text-lg font-semibold">Assignments: {{ assignments.length }}</h3>
    <ul
      v-for="a in assignments"
      :key="'assignments_' + a.id"
      class="list-disc list-inside"
    >
      <li>
        <span
          >{{ a.id }}.
          <NuxtLink :to="`/assignments/${a.id}`">
            document: {{ a.document_id }}, user: {{ a.user_id }}</NuxtLink
          ></span
        >
      </li>
    </ul>
    <div class="my-3">
      <div class="flex flex-col w-1/2 space-y-2 border-t border-neutral-300 mt-3 pt-3">
        <label for="label_id">User Id</label>
        <input type="text" name="" id="user_id" v-model="new_assignment.user_id" />
        <label for="label_id">Number of Documents (randomly selected)</label>
        <input type="number" name="" id="number_of_docs" v-model="number_of_docs" />
        <button class="btn-primary" @click="createAssignment">Create Assignment</button>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { Task, useTaskApi } from "~/data/task";
import { Document, useDocumentApi } from "~/data/document";
import { Assignment, useAssignmentApi } from "~/data/assignment";

const taskApi = useTaskApi();
const documentApi = useDocumentApi();
const assignmentApi = useAssignmentApi();

const route = useRoute();
const task = ref<Task>();
const number_of_docs = ref<number>(100);
const assignments = reactive<Assignment[]>([]);

const new_assignment = reactive({
  user_id: "ab3ae219-3ec7-47c3-a317-fbdf923bccac",
  task_id: 0,
});

const createAssignment = () => {
  console.log(new_assignment);
  documentApi
    .takeUpToNRandomDocuments(task.value?.project_id, number_of_docs.value)
    .then((_documents) => {
      _documents.map((doc) => {
        const _new_assignment = {
          user_id: new_assignment.user_id,
          task_id: new_assignment.task_id,
          document_id: doc.id,
        };
        assignmentApi.createAssignment(_new_assignment).then((_assignment) => {
          assignments.push(_assignment);
        });
      });
    });
};

onMounted(() => {
  taskApi.findTask(route.params.task_id.toString()).then((_task) => {
    task.value = _task;
    new_assignment.task_id = _task.id;
    assignmentApi.findAssignments(_task.id.toString()).then((_assignments) => {
      assignments.splice(0) && assignments.push(..._assignments);
    });
  });
});

definePageMeta({
  middleware: ["auth"],
});
</script>
