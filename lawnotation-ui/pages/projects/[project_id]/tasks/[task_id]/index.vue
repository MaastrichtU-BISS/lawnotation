<template>
  <div v-if="task">
    <h3 class="my-3 text-lg font-semibold">Task: {{ task.name }}</h3>
    <pre>{{ task }}</pre>
    <div class="dimmer-wrapper">
      <Dimmer v-model="assignmentTable.loading" />
      <Dimmer v-model="loading" />
      <div class="dimmer-content">
        
        <h3 class="my-3 text-lg font-semibold">Assignments</h3>

        <Table :tabledata="assignmentTable">
          <template #head>
            <tr>
              <th scope="col" class="px-6 py-3" v-for="colname in ['Id', 'Annotator', 'Document', 'Status', 'Action']">
                {{ colname }}
              </th>
            </tr>
          </template>
          <template #body>
            <tr class="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
              v-for="assignment in assignmentTable.rows"
              :key="assignment.id">
              <th scope="row" class="px-6 py-2 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                {{ assignment.id }}
              </th>
              <td class="px-6 py-2">
                {{ assignment.annotator.email }}
              </td>
              <td class="px-6 py-2">
                {{ assignment.document.name }}
              </td>
              <td class="px-6 py-2">
                <span :class="assignment.status == 'done' ? 'text-green-600' : 'text-orange-700'">{{ assignment.status }}</span>
              </td>
              <td class="px-6 py-2">
                <NuxtLink class="font-medium text-blue-600 dark:text-blue-500 hover:underline"
                :to="`/assignments/${assignment.id}`">View</NuxtLink>
              </td>
            </tr>
          </template>
        </Table>


        <div class="my-3">
          <div
            class="flex flex-col w-1/2 space-y-2 border-t border-neutral-300 mt-3 pt-3"
          >
            <h3 class="mt-3 text-lg font-semibold">
              Annotators: {{ annotators_email.length }}
            </h3>
            <ul class="list-disc list-inside">
              <li v-for="ann_email in annotators_email" :key="ann_email">
                <span>{{ ann_email }}</span>
              </li>
            </ul>
            <input
              id="annotator_email"
              type="email"
              name="email"
              v-model="email"
              @keydown="inputEmail($event)"
            />
            <button class="btn-primary" @click="addAnnotator">Add</button>
            <label for="amount_of_docs">Amount of Documents (total)</label>
            <input
              id="amount_of_docs"
              type="number"
              name=""
              v-model="amount_of_docs"
              :max="total_docs"
              min="1"
            />
            <label for="fixed_docs"
              >Amount of Fixed Documents (to share among annotators)</label
            >
            <input
              id="fixed_docs"
              type="number"
              name=""
              v-model="amount_of_fixed_docs"
              :max="total_docs"
              min="0"
            />
            <button class="btn-primary" @click="createAssignments">
              Create Assignments
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { Task, useTaskApi } from "~/data/task";
import { Document, useDocumentApi } from "~/data/document";
import { Assignment, AssignmentTableData, useAssignmentApi } from "~/data/assignment";
import { User, useUserApi } from "~/data/user";
import { TableData } from "~/components/Table.vue";

const config = useRuntimeConfig();
const { $toast } = useNuxtApp();

const user = useSupabaseUser();
const taskApi = useTaskApi();
const documentApi = useDocumentApi();
const assignmentApi = useAssignmentApi();
const userApi = useUserApi();

const route = useRoute();
const task = ref<Task>();
const total_docs = ref<number>(0);
const amount_of_docs = ref<number>(0);
const amount_of_fixed_docs = ref<number>(0);
const annotators_email = reactive<string[]>([]);
const formatted_assignments = reactive<any[]>([]);
const loading = ref(false);

const email = ref("");

const assignmentTable = reactive<TableData<AssignmentTableData>>({
  total: 0,
  rows: [],

  page: 1,
  items_per_page: 10,
  loading: false,

  async load() {
    if (!task.value)
      return;

    this.loading = true;

    const { rows, count } = await assignmentApi.tableAssignmentsByTask(task.value.id, (this.page-1)*this.items_per_page, this.items_per_page);
    if (rows) this.rows = rows;
    if (count) this.total = count;

    this.loading = false;
  }
});

const addAnnotator = () => {
  if (email.value == "") throw new Error("Email field is required");
  annotators_email.push(email.value);
  email.value = "";
};

const inputEmail = (event: KeyboardEvent) => {
  if (event.key == "Enter") addAnnotator();
};

const createAssignments = async () => {
  try {
    loading.value = true;
    if (!task.value) throw new Error("Task not found");

    // Get the documents
    const docs = await documentApi.takeUpToNRandomDocuments(
      task.value.project_id.toString(),
      amount_of_docs.value
    );

    const new_assignments: Omit<Assignment, "id" | "annotator_id" | "status">[] = [];

    // Create shared assignments (only with docs info, no users yet)
    for (let i = 0; i < amount_of_fixed_docs.value; ++i) {
      for (let j = 0; j < annotators_email.length; ++j) {
        const new_assignment: Omit<Assignment, "id" | "annotator_id" | "status"> = {
          task_id: task.value!.id,
          document_id: docs[i],
        };
        new_assignments.push(new_assignment);
      }
    }

    // Create unique assignments (only with docs info, no users yet)
    for (let i = amount_of_fixed_docs.value; i < amount_of_docs.value; ++i) {
      const new_assignment: Omit<Assignment, "id" | "annotator_id" | "status"> = {
        task_id: task.value!.id,
        document_id: docs[i],
      };
      new_assignments.push(new_assignment);
    }

    const created_assignments: Assignment[] = await assignmentApi.createAssignments(
      new_assignments
    );

    console.log(new_assignments, created_assignments);

    // Get Users
    const usersPromises: Promise<User>[] = [];
    for (let i = 0; i < annotators_email.length; ++i) {
      usersPromises.push(
        userApi.otpLogin(
          annotators_email[i],
          `${config.public.baseURL}/annotate/${created_assignments[i].task_id}`
        )
      );
    }

    const annotators_id = (await Promise.all(usersPromises)).map((u) => u.id);

    // Assign users to assignments
    const assignmentsPromises: Promise<Boolean>[] = [];
    for (let i = 0; i < created_assignments.length; ++i) {
      created_assignments[i].annotator_id = annotators_id[i % annotators_id.length];
      assignmentsPromises.push(
        assignmentApi.updateAssignment(
          created_assignments[i].id.toString(),
          created_assignments[i]
        )
      );
    }

    const updated_assignments = await Promise.all(assignmentsPromises);

    update_assignments_lists(created_assignments).then(() => {
      loading.value = false;
      assignmentTable.load();
      $toast.success("Assignments created");
    });


  } catch (error) {
    loading.value = false;
    if (error instanceof Error)
      $toast.error(`Error creating assignment: ${error.message}`);
  }
};

const update_assignments_lists = async (_assignments: Assignment[]): Promise<void> => {
  try {
    _assignments.map(async (a) => {
      assignments.push(a);
      const document_name = await documentApi.getName(a.document_id.toString());
      const annotator_email = await userApi.getEmail(a.annotator_id);
      const fa: Assignment & { document_name: string; annotator_email: string } = {
        ...a,
        document_name: document_name,
        annotator_email: annotator_email,
      };
      formatted_assignments.push(fa);
    });
  } catch (error) {
    if (error instanceof Error)
      $toast.error(`Error updating assignmentlist: ${error.message}`);
  }
};

onMounted(() => {
  taskApi.findTask(route.params.task_id.toString()).then((_task) => {
    task.value = _task;
    documentApi.totalAmountOfDocs(_task.project_id.toString()).then((count) => {
      amount_of_docs.value = count ? count : 0;
      total_docs.value = amount_of_docs.value;
    });
    assignmentApi.findAssignmentsByTask(_task.id.toString()).then((_assignments) => {
      update_assignments_lists(_assignments);
    });
  });
});

definePageMeta({
  middleware: ["auth"],
});
</script>
