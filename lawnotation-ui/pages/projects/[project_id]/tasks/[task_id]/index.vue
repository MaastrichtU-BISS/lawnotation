<template>
  <Breadcrumb v-if="task && project" :crumbs="[
    {
      name: 'Projects',
      link: '/projects',
    },
    {
      name: `Project ${project.name}`,
      link: `/projects/${project.id}`,
    },
    {
      name: `Task ${task.name}`,
      link: `/projects/${project.id}/tasks/${task.id}`,
    },
  ]" />

  <div class="my-3 dimmer-wrapper">
    <Dimmer v-model="loading" />
    <div class="dimmer-content">
      <div v-if="task">
        <div v-if="totalAssignments.data.value?.total">
          <div class="text-center my-3">
            <NuxtLink :to="`/projects/${task?.project_id}/tasks/${task?.id}/metrics`">
              <button
                class="mx-3 rounded-md bg-primary px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-primary/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-600">
                Analyze Agreement Metrics
              </button>
            </NuxtLink>
            <button type="button" @click="replicateTask"
              class="mx-3 rounded-md bg-primary px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-primary/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-600">
              Duplicate Task
            </button>
            <button type="button" @click="export_modal?.show()"
              class="text-blue-700 hover:text-white border border-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center me-2 mb-2 dark:border-blue-500 dark:text-blue-500 dark:hover:text-white dark:hover:bg-blue-500 dark:focus:ring-blue-800">
              Export / Publish
            </button>
          </div>
          <h3 class="my-3 text-lg font-semibold">Assignments</h3>
          <div v-if="task">
            <Table ref="assignmentTable" endpoint="assignments" :filter="{ task_id: task?.id }" :sort="true"
              :search="true" :selectable="true" @remove-rows="removeAssignments" @remove-all-rows="removeAllAssignments">
              <template #row="{ item }: { item: AssignmentTableData }">
                <td scope="row" class="px-6 py-2 font-medium text-gray-900 whitespace-nowrap">
                  {{ item.id }}
                </td>
                <td class="px-6 py-2">
                  {{ item.annotator?.email ?? `annotator ${item.annotator_number}` }}
                </td>
                <td class="px-6 py-2">
                  {{ item.document.name }}
                </td>
                <td class="px-6 py-2">
                  <span :class="item.status == 'done' ? 'text-green-600' : 'text-orange-700'">{{ item.status }}</span>
                </td>
                <td class="px-6 py-2">
                  <span>{{ item.difficulty_rating }}</span>
                </td>
                <td class="px-6 py-2">
                  <NuxtLink class="base" :to="`/assignments/${item.id}`">
                    <button class="base btn-primary">View</button>
                  </NuxtLink>
                </td>
              </template>
            </Table>
          </div>
        </div>
        <div v-else class="flex justify-center">
          <div class="flex flex-col w-1/2 space-y-2 border-neutral-300">
            <h3 class="mt-3 text-lg font-semibold text-center">Create assignments</h3>
            <h3 class="mt-3 text-sm font-semibold">
              Annotators: {{ annotators_email.length }}
            </h3>
            <ul class="list-disc list-inside">
              <li v-for="ann_email in annotators_email" :key="ann_email">
                <span>{{ ann_email }}</span>
              </li>
            </ul>
            <input class="base" id="annotator_email" type="email" name="email" v-model="email"
              @keydown.enter="addAnnotator()" />
            <button class="base btn-primary" @click="addAnnotator">Add</button>
            <label for="amount_of_docs">Amount of Documents (total)</label>
            <input class="base" id="amount_of_docs" type="number" name="" v-model="amount_of_docs" :max="total_docs"
              min="1" />
            <label for="fixed_docs">
              Amount of Fixed Documents (to share among annotators)
            </label>
            <input class="base" id="fixed_docs" type="number" name="" v-model="amount_of_fixed_docs" :max="total_docs"
              min="0" />
            <button class="base btn-primary" @click="createAssignments">
              Create Assignments
            </button>
          </div>
        </div>
        <ExportTaskModal v-model="formValues"  @export="exportTask"
          @close="export_modal?.hide()" @resetForm="resetForm"></ExportTaskModal>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import type {
  Task,
  Assignment,
  AssignmentTableData,
  User,
  Project,
  Publication,
} from "~/types";
import { PublicationStatus } from "~/types"
import Table from "~/components/Table.vue";
import { Modal } from "flowbite";
import { shuffle, clone } from "lodash";
import { authorizeClient } from "~/utils/authorize.client";
import { downloadAs } from "~/utils/download_file";
import type { ExportTaskOptions } from "~/utils/io";
import type { ModalOptions } from "flowbite";

const { $toast, $trpc } = useNuxtApp();

const user = useSupabaseUser();
const config = useRuntimeConfig();

const route = useRoute();
const task = await $trpc.task.findById.query(+route.params.task_id);
const project = await $trpc.project.findById.query(+route.params.project_id);
const totalAssignments = await $trpc.table.assignments.useQuery({ filter: { task_id: task.id } });

const totalAmountOfDocs = await $trpc.document.totalAmountOfDocs.query(task.project_id);
const total_docs = totalAmountOfDocs ?? 0;
const amount_of_docs = ref<number>(total_docs);

const labels = await $trpc.labelset.findById.query(+task.labelset_id);

const defaultFormValues = {
  export_options: {
    name: true,
    desc: true,
    ann_guidelines: true,
    labelset: true,
    documents: false,
    annotations: false,
    loaded: false,
    loading: false
  }, 
  publication: {
    editor_id: user.value?.id!,
    status: PublicationStatus.PUBLISHED,
    file_url: "",
    guidelines_url: task.ann_guidelines,
    task_name: task.name,
    task_description: task.desc,
    labels_name: labels.name,
    labels_description: labels.desc,
    author: "",
    contact: user.value?.email!,
    documents: 0,
    assignments: 0,
    annotators: 0,
    annotations: 0,
    relations: 0
  }
};

const formValues = ref<{
  export_options: ExportTaskOptions;
  publication: Omit<Publication, "id">;
}>(JSON.parse(JSON.stringify(defaultFormValues)));


let export_modal: Modal | null = null;

const amount_of_fixed_docs = ref<number>(0);
const annotators_email = reactive<string[]>([]);

const loading = ref(false);

const email = ref("");

const assignmentTable = ref<InstanceType<typeof Table>>();

const addAnnotator = () => {
  if (email.value == "") throw new Error("Email field is required");
  annotators_email.push(email.value);
  email.value = "";
};

const createAssignments = async () => {
  try {
    loading.value = true;
    if (!task) throw new Error("Task not found");

    // Get the documents
    const docs = await $trpc.document.takeUpToNRandomDocuments.query({
      project_id: task.project_id,
      n: amount_of_docs.value,
    });

    const new_assignments: Pick<Assignment, "task_id" | "document_id">[] = [];

    // Create shared assignments (only with docs info)
    for (let i = 0; i < amount_of_fixed_docs.value; ++i) {
      for (let j = 0; j < annotators_email.length; ++j) {
        const new_assignment: Pick<Assignment, "task_id" | "document_id"> = {
          task_id: task.id,
          document_id: docs[i],
        };
        new_assignments.push(new_assignment);
      }
    }

    // Create unique assignments (only with docs info)
    for (let i = amount_of_fixed_docs.value; i < amount_of_docs.value; ++i) {
      const new_assignment: Pick<Assignment, "task_id" | "document_id"> = {
        task_id: task.id,
        document_id: docs[i],
      };
      new_assignments.push(new_assignment);
    }

    // Get Users
    const usersPromises: Promise<User['id']>[] = [];
    for (let i = 0; i < annotators_email.length; ++i) {
      usersPromises.push(
        $trpc.assignment.assignUserToTask.query({ email: annotators_email[i], task_id: task.id })
      );
    }

    const annotators_id = (await Promise.all(usersPromises));

    // Assign users and order to assignments
    const unshuffled: number[] = [
      ...Array(
        amount_of_fixed_docs.value +
        Math.floor((amount_of_docs.value - amount_of_fixed_docs.value) / annotators_id.length)
      ).keys(),
    ];

    const permutations = [];
    for (let i = 0; i < annotators_id.length; ++i) {
      permutations.push(shuffle(clone(unshuffled)));
    }

    for (let i = 0; i < new_assignments.length; ++i) {
      // @ts-expect-error
      new_assignments[i].annotator_id = annotators_id[i % annotators_id.length];
      // @ts-expect-error
      new_assignments[i].annotator_number = (i % annotators_id.length) + 1
      // @ts-expect-error
      new_assignments[i].seq_pos =
        (permutations[i % annotators_id.length].pop() ?? Math.floor(i / annotators_id.length)) + 1;
    }

    const created_assignments: Assignment[] = await $trpc.assignment.createMany.mutate(
      new_assignments
    );

    assignmentTable.value?.refresh();
    totalAssignments.refresh();
    loading.value = false;
    $toast.success("Assignments successfully created");
  } catch (error) {
    loading.value = false;
    if (error instanceof Error) {
      console.error(error);
      $toast.error(`Error creating assignment: ${error.message}`);
    }
  }
};

const removeAssignments = async (ids: string[]) => {
  const promises: Promise<Boolean>[] = [];
  promises.push(...ids.map((id) => $trpc.assignment.delete.mutate(+id)));
  await Promise.all(promises);
  await assignmentTable.value?.refresh();
  await totalAssignments.refresh();
  $toast.success("Assignments successfully deleted!");
};
const removeAllAssignments = async () => {
  if (!task) throw new Error("Invalid Task!");
  await $trpc.assignment.deleteAllFromTask.mutate(task.id);
  await assignmentTable.value?.refresh();
  await totalAssignments.refresh();
  $toast.success("Assignments successfully deleted!");
};

const replicateTask = async () => {
  loading.value = true;
  const new_task = await $trpc.task.replicateTask.mutate(task.id);
  loading.value = false;
  $toast.success(`Task successfully replicated! ${new_task.id}`);
};

const exportTask = async () => {
  formValues.value.export_options.loading = true;
  let json: any = {};

  if (formValues.value.export_options.name) {
    json.name = task?.name!;
  }

  if (formValues.value.export_options.desc) {
    json.desc = task?.desc!;
  }

  if (formValues.value.export_options.labelset) {
    const labelset = await $trpc.labelset.findById.query(+task?.labelset_id!);
    json.labelset = {
      name: labelset.name,
      desc: labelset.desc,
      labels: labelset.labels,
    };

    if (formValues.value.export_options.ann_guidelines) {
      json.ann_guidelines = task?.ann_guidelines!;
    }
  }

  if (formValues.value.export_options.documents) {
    let doc_pos: any = {};
    let ass_pos: any = {};
    let ann_pos: any = {};
    let annotators: any = {};
    let annotators_index: number = 0;

    //Documents
    const documents = await $trpc.document.findDocumentsByTask.query(+task?.id!);

    json.documents = [];
    documents.map((d, index) => {
      doc_pos[d.id] = index;
      json.documents.push({ name: d.name, full_text: d.full_text, assignments: [] });
    });

    json.counts = {};
    json.counts.documents = documents.length;
    formValues.value.publication.documents = documents.length;

    // Assignments
    const assignments = await $trpc.assignment.findAssignmentsByTask.query(+task?.id!);

    assignments.map(ass => {
      const doc_assignments = json.documents[doc_pos[ass.document_id]].assignments;
      ass_pos[ass.id] = doc_assignments.length;
      if (!(ass.annotator_id in annotators)) {
        annotators[ass.annotator_id] = ++annotators_index;
      }
      doc_assignments.push({
        annotator: annotators[ass.annotator_id],
        order: ass.seq_pos,
        annotations: []
      })
    });

    json.counts.assignments = assignments.length;
    formValues.value.publication.assignments = assignments.length;
    json.counts.annotators = annotators_index;
    formValues.value.publication.annotators = annotators_index;


    if (formValues.value.export_options.annotations && formValues.value.export_options.labelset) {

      // Annotations
      const annotations = await $trpc.annotation.findAnnotationsByTask.query(
        +task?.id!
      );

      annotations.map((a) => {
        let doc_anns = json.documents[doc_pos[a.assignment.document_id]].assignments[ass_pos[a.assignment_id]].annotations;
        ann_pos[a.id] = doc_anns.length

        doc_anns.push({
          start: a.start_index,
          end: a.end_index,
          label: a.label,
          text: a.text,
          relations: [],
          ls_id: a.ls_id
        });
      });

      json.counts.annotations = annotations.length;
      formValues.value.publication.annotations = annotations.length;

      // Relations
      const relations = await $trpc.relation.findRelationsByTask.query(+task?.id!);

      relations.map((r) => {
        let doc_anns = json.documents[doc_pos[r.annotation.assignment.document_id]].assignments[ass_pos[r.annotation.assignment.id]].annotations;
        let ann_rels = doc_anns[ann_pos[r.from_id]].relations;
        ann_rels.push({
          to: ann_pos[r.to_id],
          direction: r.direction,
          labels: r.labels,
        });
      });

      json.counts.relations = relations.length;
      formValues.value.publication.relations = relations.length;
    }
  }

  downloadAs(json, `${json.name}.json`);
  formValues.value.export_options.loaded = true;
  formValues.value.export_options.loading = false;
  $toast.success(`Task has been exported!`);
};

const resetForm = () => {
  Object.assign(formValues.value, JSON.parse(JSON.stringify(defaultFormValues)));
}

onMounted(async () => {
  const modalOptions: ModalOptions = {
    placement: "center",
    backdrop: "dynamic",
    backdropClasses: "bg-gray-900/50 dark:bg-gray-900/80 fixed inset-0 z-40",
    closable: true,
  };

  export_modal = new Modal(document.getElementById("exportFormModal"), modalOptions);

});

definePageMeta({
  middleware: [
    "auth",
    async (to) => authorizeClient([["task", +to.params.task_id]]),
    async (to) => authorizeClient([["project", +to.params.project_id]]),
  ],
});
</script>
