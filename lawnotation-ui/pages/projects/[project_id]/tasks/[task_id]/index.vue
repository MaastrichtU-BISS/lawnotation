<template>
  <div v-if="task">
    <h3 class="my-3 text-lg font-semibold">Task:</h3>
    <h3>{{ task }}</h3>
    <h3 class="my-3 text-lg font-semibold">Assignments: {{ assignments.length }}</h3>
    <ul
      v-for="fa in formatted_assignments"
      :key="'assignments_' + fa.id"
      class="list-disc list-inside"
    >
      <li>
        <span
          >{{ fa.id }}.
          <NuxtLink :to="`/assignments/${fa.id}`">
            {{ fa.annotator_email }} - {{ fa.document_name }}</NuxtLink
          ></span
        >
      </li>
    </ul>
    <div class="my-3">
      <div class="flex flex-col w-1/2 space-y-2 border-t border-neutral-300 mt-3 pt-3">
        <label for="annotator_email">Annotator email</label>
        <input id="annotator_email" type="email" name="email" v-model="email" />
        <label for="number_of_docs">Number of Documents (randomly selected)</label>
        <input id="number_of_docs" type="number" name="" v-model="number_of_docs" />
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
import { useToast } from "vue-toastification";

const config = useRuntimeConfig();
const toast = useToast();

const user = useSupabaseUser();
const taskApi = useTaskApi();
const documentApi = useDocumentApi();
const assignmentApi = useAssignmentApi();
const userApi = useUserApi();

const route = useRoute();
const task = ref<Task>();
const number_of_docs = ref<number>(100);
const assignments = reactive<Assignment[]>([]);
const formatted_assignments = reactive<any[]>([]);

const email = ref("");

const createAssignment = async () => {
  try {
    if (!task.value)
      throw new Error("Task not found")

    if (email.value == "")
      throw new Error("Email field is required")
  
    const docs = await documentApi.takeUpToNRandomDocuments(
      task.value.project_id.toString(),
      number_of_docs.value
    );
  
    const new_assignments: Omit<Assignment, "id" | "annotator_id" | "status">[] = [];
  
    docs.map((doc) => {
      const new_assignment: Omit<Assignment, "id" | "annotator_id" | "status"> = {
        task_id: task.value!.id,
        document_id: doc.id,
      };
      new_assignments.push(new_assignment);
    });
  
    const created_assignments: Assignment[] = await assignmentApi.createAssignments(
      new_assignments
    );
  
    userApi
      .otpLogin(
        email.value,
        `${config.public.baseURL}/annotate/${created_assignments[0].task_id}`
      )
      .then((_user) => {
        created_assignments.map((ca) => {
          var new_ca = ca;
          new_ca.annotator_id = _user.id;
          assignmentApi.updateAssignment(new_ca.id.toString(), new_ca);
        });
  
        update_assignments_lists(created_assignments);
      });
  } catch (error) {
    if (error instanceof Error)
      toast.error(`Error creating assignment: ${error.message}`)
  }
};

const update_assignments_lists = async (_assignments: Assignment[]): Promise<void> => {
  try {
    _assignments.map(async (a) => {
      assignments.push(a);
      const document_name = await documentApi.getName(a.document_id.toString());
      const annotator_email = await userApi.getEmail(a.annotator_id);
      const fa: Assignment & {document_name: string, annotator_email: string} = { 
        ...a, 
        document_name: document_name,
        annotator_email: annotator_email
      };
      formatted_assignments.push(fa);
    });
  } catch (error) {
    if (error instanceof Error)
      toast.error(`Error updating assignmentlist: ${error.message}`);
  }
};

onMounted(() => {
  taskApi.findTask(route.params.task_id.toString()).then((_task) => {
    task.value = _task;
    assignmentApi.findAssignmentsByTask(_task.id.toString()).then((_assignments) => {
      update_assignments_lists(_assignments);
    });
  });
});

definePageMeta({
  middleware: ["auth"],
});
</script>
