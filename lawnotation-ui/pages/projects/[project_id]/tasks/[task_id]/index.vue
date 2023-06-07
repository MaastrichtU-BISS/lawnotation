<template>
  <div v-if="task">
    <h3 class="my-3 text-lg font-semibold">Task: {{ task.name }}</h3>
    <pre class="text-xs">{{ task }}</pre>
    <div class="dimmer-wrapper">
      <Dimmer v-model="assignmentTable.loading" />
      <Dimmer v-model="loading" />
      <div class="dimmer-content">
        <h3 class="my-3 text-lg font-semibold">Assignments</h3>
        <Table :tabledata="assignmentTable" :sort="true" :search="true">
          <template #row="{item}: {item: AssignmentTableData}">
            <tr class="bg-white border-b hover:bg-gray-50">
              <th scope="row" class="px-6 py-2 font-medium text-gray-900 whitespace-nowrap">
                {{ item.id }}
              </th>
              <td class="px-6 py-2">
                {{ item.annotator.email }}
              </td>
              <td class="px-6 py-2">
                {{ item.document.name }}
              </td>
              <td class="px-6 py-2">
                <span
                  :class="
                    item.status == 'done' ? 'text-green-600' : 'text-orange-700'
                  "
                  >{{ item.status }}</span
                >
              </td>
              <td class="px-6 py-2">
                <NuxtLink
                  class="font-medium text-blue-600 hover:underline"
                  :to="`/assignments/${item.id}`"
                  >View</NuxtLink
                >
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
import { TableData } from "~/utils/table";
import { shuffle } from "lodash";

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
const loading = ref(false);

const email = ref("");

const assignmentTable = createTableData<AssignmentTableData>(
  {
    'Id': {
      field: 'id',
      sort: true,
    },
    'Annotator': {
      field: 'annotator.email',
      // sort: true,
      search: true,
    },
    'Document': {
      field: 'document.name',
      // sort: true,
      search: true,
    },
    'Status': {
      field: 'status',
      sort: true,
    },
    'Action': {}
  },
  {
    type: 'table',
    from: 'assignments',
    select: 'id, task_id, annotator:users!inner (id, email), document:documents!inner (id, name, source), status, seq_pos',
    filter: () => ({ task_id: task.value?.id })
  }
);

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

    // Assign users and order to assignments
    let unshuffled: number[] = [
      ...Array(
        amount_of_fixed_docs.value +
          (amount_of_docs.value - amount_of_fixed_docs.value) / annotators_id.length
      ).keys(),
    ];

    let permutations = [];
    for (let i = 0; i < annotators_id.length; ++i) {
      permutations.push(shuffle(unshuffled));
    }

    const assignmentsPromises: Promise<Boolean>[] = [];
    for (let i = 0; i < created_assignments.length; ++i) {
      created_assignments[i].annotator_id = annotators_id[i % annotators_id.length];
      created_assignments[i].seq_pos = permutations[i % annotators_id.length].pop() + 1;
      assignmentsPromises.push(
        assignmentApi.updateAssignment(
          created_assignments[i].id.toString(),
          created_assignments[i]
        )
      );
    }

    const updated_assignments = await Promise.all(assignmentsPromises);

    loading.value = false;
    assignmentTable.load();
    $toast.success("Assignments created");
  } catch (error) {
    loading.value = false;
    if (error instanceof Error)
      $toast.error(`Error creating assignment: ${error.message}`);
  }
};

onMounted(() => {
  taskApi.findTask(route.params.task_id.toString()).then((_task) => {
    task.value = _task;
    documentApi.totalAmountOfDocs(_task.project_id.toString()).then((count) => {
      amount_of_docs.value = count ? count : 0;
      total_docs.value = amount_of_docs.value;
    });
  });
});

definePageMeta({
  middleware: ["auth"],
});
</script>
