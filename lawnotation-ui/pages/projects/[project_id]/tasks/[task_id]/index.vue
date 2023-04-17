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
        <label for="label_id">Annotator email</label>
        <input type="email" name="email" v-model="email" />
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
import { User, useUserApi } from "~/data/user";

const taskApi = useTaskApi();
const documentApi = useDocumentApi();
const assignmentApi = useAssignmentApi();
const userApi = useUserApi();

const route = useRoute();
const task = ref<Task>();
const number_of_docs = ref<number>(100);
const assignments = reactive<Assignment[]>([]);

const email = ref("");

const createAssignment = async () => {
  if (email.value == "") {
    alert("email required");
  }

  const docs = await documentApi.takeUpToNRandomDocuments(
    task.value?.project_id.toString(),
    number_of_docs.value
  );

  docs.map((doc, index) => {
    const new_assignment = {
      task_id: task.value?.id,
      document_id: doc.id,
    };
    assignmentApi.createAssignment(new_assignment).then((_assignment) => {
      assignments.push(_assignment);
      if (index === 0) {
        userApi.inviteUser(
          email.value,
          `http://localhost:3000/assignments/${_assignment.id}`
        );
      }
    });
  });
};

onMounted(() => {
  taskApi.findTask(route.params.task_id.toString()).then((_task) => {
    task.value = _task;
    assignmentApi.findAssignments(_task.id.toString()).then((_assignments) => {
      assignments.splice(0) && assignments.push(..._assignments);
    });
  });
});

definePageMeta({
  middleware: ["auth"],
});
</script>
