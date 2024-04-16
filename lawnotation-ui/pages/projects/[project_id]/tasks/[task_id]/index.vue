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
          <div class="flex justify-center gap-6 my-3">
            <NuxtLink :to="`/projects/${task?.project_id}/tasks/${task?.id}/metrics`">
              <Button type="button" v-if="isWordLevel(task)" label="Analyze Agreement Metrics"
                data-test="metrics-button" />
            </NuxtLink>
            <Button type="button" label="Export / Publish" outlined @click="exportModalVisible = true" data-test="export-publish-button" />
            <Button type="button" icon="pi pi-ellipsis-v" link @click="(event) => overlayMenu.toggle(event)" aria-haspopup="true" aria-controls="overlay_menu" data-test="kebab-button" />
            <Menu ref="overlayMenu" id="overlay_menu" :model="[{label: 'Duplicate Task', icon: 'pi pi-clone', command: replicateTask}]" :popup="true"
              :pt="{
                content: {
                  'data-test': 'duplicate-task'
                }
              }" />
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
                  <Badge :value="item.status" :severity="item.status == 'done' ? 'success' : 'danger'" class="capitalize px-2" />
                </td>
                <td class="px-6 py-2">
                  <span>{{ item.difficulty_rating }}</span>
                </td>
                <td class="px-6 py-2 flex justify-start">
                  <template v-if="item.annotator?.id == user?.id">
                    <NuxtLink :to="`/tasks/${task.id}`" data-test="annotate-assignment-link">
                      <Button label="Annotate" size="small" />
                    </NuxtLink>
                  </template>
                  <template v-else>
                    <NuxtLink :to="`/assignments/${item.id}`" data-test="view-assignment-link">
                      <Button label="View" size="small" />
                    </NuxtLink>
                  </template>
                </td>
              </template>
            </Table>
          </div>
        </div>
        <div v-else class="flex justify-center">
          <div class="w-1/2 space-y-2 border-neutral-300">
            <h3 class="mt-3 text-lg font-semibold text-center">Assign annotators</h3>
            <h3 class="mt-3 text-sm font-semibold">
              Emails added: {{ annotators_email.length }}
            </h3>
            <Chips v-model="annotators_email" separator="," addOnBlur :pt="{
              input: {
                'data-test': 'annotator-emails'
              }
            }" />
            <div class="text-right pb-6">
              <Button label="Add myself" :disabled="isMyselfAdded" link @click="addMyself" :pt="{
                root: {
                  class: 'p-0 text-xs text-primary-600 disabled:text-gray-400 underline cursor-pointer disabled:no-underline disabled:pointer-events-none'
                }
              }"/>
            </div>
            <Accordion>
              <AccordionTab header="Advanced Settings">
                <div class="text-center">
                  <h5 class="pb-4 text-xl text-bold">
                    Documents
                  </h5>
                  <div>
                    <label for="number_of_docs">Total</label>
                  </div>
                  <div>
                    <InputNumber class="my-2" v-model="number_of_docs" inputId="number_of_docs" showButtons
                      buttonLayout="horizontal" :step="1" :min="1" :max="total_docs"
                      decrementButtonClass="p-button-danger" incrementButtonClass="p-button-success"
                      incrementButtonIcon="pi pi-plus" decrementButtonIcon="pi pi-minus" />
                  </div>
                  <div class="py-4">
                    <div>
                      <label for="fixed_docs">Shared</label>
                    </div>
                    <div>
                      <InputNumber class="my-2" v-model="number_of_fixed_docs" inputId="number_of_fixed_docs" showButtons
                        buttonLayout="horizontal" :step="1" :min="0" :max="total_docs"
                        decrementButtonClass="p-button-danger" incrementButtonClass="p-button-success"
                        incrementButtonIcon="pi pi-plus" decrementButtonIcon="pi pi-minus" />
                    </div>
                  </div>
                </div>
              </AccordionTab>
            </Accordion>
            <div class="text-center pt-6">
              <Button :disabled="annotators_email.length == 0" @click="createAssignments" data-test="create-assignments">
                Create Assignments
              </Button>
            </div>
          </div>
        </div>
        <ExportTaskModal v-model:form-values="formValues" v-model:export-modal-visible="exportModalVisible" @export="exportTask" />
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
import { isWordLevel } from "~/utils/levels";
import Table from "~/components/Table.vue";
import { Modal } from "flowbite";
import _ from "lodash";
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
const number_of_docs = ref<number>(total_docs);
const number_of_fixed_docs = ref<number>(total_docs);
const overlayMenu = ref()

const labels = await $trpc.labelset.findById.query(+task.labelset_id);

const defaultFormValues = {
  export_options: {
    name: true,
    desc: true,
    ann_guidelines: true,
    labelset: true,
    documents: false,
    annotations: false,
  },
  modalOperations: {
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
  modalOperations: { loading: boolean, loaded: boolean };
  publication: Omit<Publication, "id">;
}>(JSON.parse(JSON.stringify(defaultFormValues)));

const exportModalVisible = ref(false);

const annotators_email = ref<string[]>([]);

const loading = ref(false);

const assignmentTable = ref<InstanceType<typeof Table>>();

watch(annotators_email, (new_val) => {
  if (new_val.length && !/^\S+@\S+\.\S+$/.test(new_val[new_val.length - 1])) {
    new_val.pop();
    $toast.error('Invalid email!')
  }
});

const addMyself = () => {
  if(!isMyselfAdded.value) {
    annotators_email.value.push(user.value?.email!);
  } else {
    $toast.error("You have been already added!")
  }
};

const isMyselfAdded = computed(() => {
  return annotators_email.value.includes(user.value?.email!);
})

const createAssignments = async () => {
  try {
    loading.value = true;
    if (!task) throw new Error("Task not found");

    // Get the documents
    const docs = await $trpc.document.takeUpToNRandomDocuments.query({
      project_id: task.project_id,
      n: number_of_docs.value,
    });

    const new_assignments: Pick<Assignment, "task_id" | "document_id">[] = [];

    // Create shared assignments (only with docs info)
    for (let i = 0; i < number_of_fixed_docs.value; ++i) {
      for (let j = 0; j < annotators_email.value.length; ++j) {
        const new_assignment: Pick<Assignment, "task_id" | "document_id"> = {
          task_id: task.id,
          document_id: docs[i],
        };
        new_assignments.push(new_assignment);
      }
    }

    // Create unique assignments (only with docs info)
    for (let i = number_of_fixed_docs.value; i < number_of_docs.value; ++i) {
      const new_assignment: Pick<Assignment, "task_id" | "document_id"> = {
        task_id: task.id,
        document_id: docs[i],
      };
      new_assignments.push(new_assignment);
    }

    // Get Users
    const usersPromises: Promise<User['id']>[] = [];
    for (let i = 0; i < annotators_email.value.length; ++i) {
      usersPromises.push(
        $trpc.assignment.assignUserToTask.query({ email: annotators_email.value[i], task_id: task.id })
      );
    }

    const annotators_id = (await Promise.all(usersPromises));

    // Assign users and order to assignments
    const unshuffled: number[] = [
      ...Array(
        number_of_fixed_docs.value +
        Math.floor((number_of_docs.value - number_of_fixed_docs.value) / annotators_id.length)
      ).keys(),
    ];

    const permutations = [];
    for (let i = 0; i < annotators_id.length; ++i) {
      permutations.push(_.shuffle(_.clone(unshuffled)));
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

const removeAssignments = async (ids: string[], finish: (promises: (Promise<Boolean>[])) => void) => {
  finish(ids.map((id) => $trpc.assignment.delete.mutate(+id)));
  await totalAssignments.refresh();
};
const removeAllAssignments = (finish: (promises: (Promise<Boolean>)) => void) => {
  if (!task) throw new Error("Invalid Task!");
  finish($trpc.assignment.deleteAllFromTask.mutate(task.id));
};

const replicateTask = async () => {
  loading.value = true;
  const new_task = await $trpc.task.replicateTask.mutate(task.id);
  loading.value = false;
  $toast.success(`Task successfully replicated! ${new_task.id}`);
};

const exportTask = async () => {
  formValues.value.modalOperations.loading = true;
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

      // export annotation level (only needed if exporting annotations)
      json.annotation_level = task.annotation_level;

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
  formValues.value.modalOperations.loaded = true;
  formValues.value.modalOperations.loading = false;
  $toast.success(`Task has been exported!`);
};

onMounted(async () => {
  const modalOptions: ModalOptions = {
    placement: "center",
    backdrop: "dynamic",
    backdropClasses: "bg-gray-900/50 dark:bg-gray-900/80 fixed inset-0 z-40",
    closable: true,
  };
});

definePageMeta({
  middleware: [
    "auth",
    async (to) => authorizeClient([["task", +to.params.task_id]]),
    async (to) => authorizeClient([["project", +to.params.project_id]]),
  ],
});
</script>
