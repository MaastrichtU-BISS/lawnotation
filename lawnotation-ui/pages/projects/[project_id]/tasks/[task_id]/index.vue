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
  <div class="dimmer-wrapper">
    <Dimmer v-model="loading" />
    <div class="dimmer-content">
      <div v-if="task">
        <div v-if="totalAssignments.data.value?.total && groupByAnnotators.data.value?.total">
          <div class="pb-4" v-if="showPredictionProgressBar">
            <div class="flex justify-center items-center">
              <h3 class="my-3 text-lg text-center font-semibold">Generating pre-annotations:</h3>
              <span class="mx-2">{{ mlProccessed }}/{{
                totalAssignments.data?.value?.total }}</span>
              <ProgressSpinner style="width: 20px; height: 20px; margin: 0" strokeWidth="8" animationDuration=".5s"
                aria-label="Loading" />
            </div>
            <ProgressBar :value="Math.floor((mlProccessed / totalAssignments.data?.value?.total) * 100)"></ProgressBar>
          </div>
          <div class="flex justify-center gap-6 my-3">
            <Button type="button" label="Analyze Metrics" data-test="metrics-button" icon="pi pi-chart-bar"
              iconPos="right" @click="selectMetricModalVisible = true" />
            <Button type="button" label="Export / Publish" outlined @click="exportModalVisible = true"
              data-test="export-publish-button" icon="pi pi-file-export" iconPos="right" />
            <Button type="button" icon="pi pi-ellipsis-v" link @click="(event) => optionsMenu.toggle(event)"
              aria-haspopup="true" aria-controls="options-menu" data-test="options-menu-button" />
            <Menu ref="optionsMenu" id="options-menu"
              :model="[{ label: 'Duplicate Task', icon: 'pi pi-clone', command: replicateTask }]" :popup="true" :pt="{
                content: {
                  'data-test': 'duplicate-task'
                }
              }" />
          </div>

          <!-- <h3 class="my-10 text-2xl font-semibold">Annotators and their documents</h3> -->

          <TabView @tab-change="tabChangeEvent">
            <TabPanel header="Annotators">

              <div class="mb-2 flex items-center">
                <Button v-if="groupByAnnotators.data.value?.total" type="button" icon="pi pi-ellipsis-v" text
                  @click="(event) => annotatorsSelectionMenu.toggle(event)" aria-haspopup="true"
                  aria-controls="remove-all-menu" data-test="remove-all-menu-button" />
                <Menu ref="annotatorsSelectionMenu" id="remove-all-menu" :popup="true" :model="[{
                  label: `Remove all (${groupByAnnotators.data.value?.total})`,
                  command: () => removeAllAssignments(refreshGroupByAnnotators)
                }]" :pt="{
  label: 'text-[#f05252]',
  content: {
    'data-test': 'remove-all'
  }
}" :ptOptions="{ mergeProps: true }" />
                <Button v-if="groupByAnnotatorsSelectedAssignmentIds.length"
                  @click="removeAssignments(groupByAnnotatorsSelectedAssignmentIds, refreshGroupByAnnotators)"
                  severity="danger" outlined :pt="{ label: 'text-xs' }" :ptOptions="{ mergeProps: true }"
                  data-test="remove-selected-rows" class="ml-3" size="small">
                  Remove selected assignments ({{ groupByAnnotatorsSelectedAssignmentIds.length }})
                </Button>
              </div>

              <span v-if="groupByAnnotators.status.value == 'error'" class="block p-3 bg-red-200 border border-red-300">An
                error occured when loading the assignments.{{ groupByAnnotators.error.value }}</span>
              <TreeTable v-else :value="groupByAnnotators.data.value!.data"
                :totalRecords="groupByAnnotators.data.value!.total" :pt="{
                  table: {
                    class: 'border-collapse w-full'
                  }
                }" v-model:selection-keys="groupByAnnotatorsSelection" selectionMode="checkbox"
                id="tableGroupByAnnotators" :lazy="true" :paginator="true" :rows="10" :loading="groupByAnnotatorsLoading"
                @page="groupByAnnotatorsPaginate">
                <Column columnKey="name" header="Name" expander style="white-space: nowrap; padding-right: 3rem">
                  <template #filter>
                    <InputText v-model="groupByAnnotatorsArgs.filter.name" size="small" type="text"
                      class="p-column-filter font-medium" placeholder="Filter by email" />
                  </template>
                  <template #body="{ node }">
                    <template v-if="node.type == 'annotator' && node.data.name == user!.email">
                      <i class="pi pi-user mr-3 ml-2"></i>
                      <span
                        class="px-3 bg-primary-500/20 inline-block px-2 leading-[1.5rem] text-center inline-block rounded-full">{{
                          node.data.name }}</span>
                    </template>
                    <template v-else-if="node.type == 'annotator'">
                      <i class="pi pi-user mr-3 ml-2"></i>{{ node.data.name }}
                    </template>
                    <template v-else-if="node.type == 'document'">
                      <i class="pi pi-file mr-3 ml-2" />
                      <Badge :value="node.data.seq_pos" severity="secondary" class="mr-2" />{{ node.data.document_name }}
                    </template>
                  </template>
                </Column>
                <Column columnKey="progress" header="Progress" style="width: 99%;">
                  <template #body="{ node }">
                    <template v-if="node.type == 'annotator'">
                      <div class="flex justify-between items-center">
                        <div class="flex">
                          <span class="whitespace-nowrap mr-4">
                            {{ node.data.amount_done }} / {{ node.data.amount_total }}
                          </span>
                          <ProgressBar class="w-80" :showValue="false"
                            :value="Math.round((node.data.amount_done / node.data.amount_total) * 100)" />
                        </div>
                        <NuxtLink v-if="node.data.amount_done < node.data.amount_total && node.data.name == user!.email"
                          class="ml-5" :to="`/annotate/${task.id}?seq=${node.data.next_seq_pos}`">
                          <Button label="Annotate Next" size="small" icon="pi pi-pencil" />
                        </NuxtLink>
                      </div>
                    </template>
                    <template v-else-if="node.type == 'document'">
                      <div class="flex justify-between items-center">
                        <div class="space-x-3">
                          <Badge :value="node.data.status" :severity="node.data.status == 'done' ? 'success' : 'danger'"
                            class="capitalize px-2" />
                          <Badge value="0" severity="yellow" class="px-2" v-if="node.data.difficulty_rating > 0">
                            <i class="pi pi-star" /> {{ node.data.difficulty_rating }}
                          </Badge>
                        </div>
                        <div class="space-x-3">
                          <NuxtLink v-if="node.data.status == AssignmentStatuses.DONE && node.data.name == user?.email"
                            :to="`/annotate/${task.id}?seq=${node.data.seq_pos}`">
                            <Button label="Annotate" size="small" icon="pi pi-pencil" />
                          </NuxtLink>
                          <NuxtLink
                            v-else-if="(node.data.status == AssignmentStatuses.DONE && !(node.data.name == user?.email)) || (node.data.status != AssignmentStatuses.DONE && user?.id == project.editor_id)"
                            :to="`/assignments/${node.data.assignment_id}`">
                            <Button label="View" size="small" icon="pi pi-eye" />
                          </NuxtLink>
                        </div>
                      </div>
                    </template>
                  </template>
                </Column>
              </TreeTable>
            </TabPanel>

            <TabPanel header="Documents">
              <div class="mb-2 flex items-center">
                <Button v-if="groupByDocuments.data.value?.total" type="button" icon="pi pi-ellipsis-v" text
                  @click="(event) => documentsSelectionMenu.toggle(event)" aria-haspopup="true"
                  aria-controls="remove-all-menu" data-test="remove-all-menu-button" />
                <Menu ref="documentsSelectionMenu" id="remove-all-menu" :popup="true" :model="[{
                  label: `Remove all (${groupByDocuments.data.value?.total})`,
                  command: () => removeAllAssignments(refreshGroupByDocuments)
                }]" :pt="{
  label: 'text-[#f05252]',
  content: {
    'data-test': 'remove-all'
  }
}" :ptOptions="{ mergeProps: true }" />
                <Button v-if="groupByDocumentsSelectedAssignmentIds.length"
                  @click="removeAssignments(groupByDocumentsSelectedAssignmentIds, refreshGroupByDocuments)"
                  severity="danger" outlined :pt="{ label: 'text-xs' }" :ptOptions="{ mergeProps: true }"
                  data-test="remove-selected-rows" class="ml-3" size="small">
                  Remove selected assignments ({{ groupByDocumentsSelectedAssignmentIds.length }})
                </Button>
              </div>

              <span v-if="groupByDocuments.status.value == 'error'" class="block p-3 bg-red-200 border border-red-300">
                An error occured when loading the assignments.{{ groupByDocuments.error.value }}
                <Button label="retry" @click="refreshGroupByDocuments" />
              </span>
              <TreeTable v-else :value="groupByDocuments.data.value!.data"
                :totalRecords="groupByDocuments.data.value!.total" :pt="{
                  table: {
                    class: 'border-collapse w-full'
                  }
                }" v-model:selection-keys="groupByDocumentsSelection" selectionMode="checkbox"
                id="tableGroupByDocuments" :lazy="true" :paginator="true" :rows="10" :loading="groupByDocumentsLoading"
                @page="groupByDocumentsPaginate">
                <Column columnKey="name" header="Name" sortable expander style="white-space: nowrap; padding-right: 3rem">
                  <template #filter>
                    <InputText v-model="groupByDocumentsArgs.filter.document" size="small" type="text"
                      class="p-column-filter font-medium" placeholder="Filter by document" />
                  </template>
                  <template #body="{ node }">
                    <template v-if="node.type == 'annotator' && node.data.name == user!.email">
                      <i class="pi pi-user mr-3 ml-2"></i>
                      <span
                        class="px-3 bg-primary-500/20 inline-block px-2 leading-[1.5rem] text-center inline-block rounded-full">{{
                          node.data.name }}</span>
                    </template>
                    <template v-else-if="node.type == 'annotator'">
                      <i class="pi pi-user mr-3 ml-2"></i>{{ node.data.name }}
                    </template>
                    <template v-else-if="node.type == 'document'">
                      <i class="pi pi-file mr-3 ml-2" />{{ node.data.document_name }}
                    </template>
                  </template>
                </Column>
                <Column columnKey="progress" header="Progress" sortable style="width: 99%;">
                  <template #body="{ node }">
                    <template v-if="node.type == 'document'">
                      <div class="flex items-center">
                        <span class="whitespace-nowrap mr-4">
                          {{ node.data.amount_done }} / {{ node.data.amount_total }}
                        </span>
                        <ProgressBar class="w-full" :showValue="false"
                          :value="Math.round((node.data.amount_done / node.data.amount_total) * 100)" />
                        <!-- <NuxtLink
                          v-if="node.data.amount_done > 1"
                          class="ml-5"
                          :to="`/compare/X`"
                        >
                          <Button label="Compare" size="small" icon="pi pi-pencil" />
                        </NuxtLink> -->
                      </div>
                    </template>
                    <template v-else-if="node.type == 'annotator'">
                      <div class="flex justify-between items-center">
                        <div class="space-x-3">
                          <Badge :value="node.data.status"
                            :severity="node.data.status == AssignmentStatuses.DONE ? 'success' : 'danger'"
                            class="capitalize px-2" />
                          <Badge value="0" severity="yellow" class="px-2" v-if="node.data.difficulty_rating > 0">
                            <i class="pi pi-star" /> {{ node.data.difficulty_rating }}
                          </Badge>
                        </div>
                        <div class="space-x-3">
                          <NuxtLink v-if="node.data.status == AssignmentStatuses.DONE && node.data.name == user?.email"
                            :to="`/annotate/${task.id}?seq=${node.data.seq_pos}`">
                            <Button label="Annotate" size="small" icon="pi pi-pencil" />
                          </NuxtLink>
                          <NuxtLink
                            v-else-if="(node.data.status == AssignmentStatuses.DONE && !(node.data.name == user?.email)) || (node.data.status != AssignmentStatuses.DONE && user?.id == project.editor_id)"
                            :to="`/assignments/${node.data.assignment_id}`">
                            <Button label="View" size="small" icon="pi pi-eye" />
                          </NuxtLink>
                        </div>
                      </div>
                    </template>
                  </template>
                </Column>
              </TreeTable>
            </TabPanel>
          </TabView>

        </div>

        <div v-else class="flex justify-center">
          <div class="w-1/2 space-y-2 border-neutral-300">
            <h3 class="mt-3 text-lg font-semibold text-center">Assign annotators</h3>
            <h3 class="mt-3 text-sm font-semibold">
              Emails added: {{ annotatorEmails.length }}
            </h3>
            <Chips v-model="annotatorEmails" separator="," addOnBlur :pt="{
              input: {
                'data-test': 'annotator-emails'
              }
            }" />
            <div class="text-right pb-6">
              <Button label="Add myself" :disabled="isMyselfAdded" link @click="addMyself" :pt="{
                root: {
                  class: 'p-0 text-xs text-primary-600 disabled:text-gray-400 underline cursor-pointer disabled:no-underline disabled:pointer-events-none'
                }
              }" />
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
                        buttonLayout="horizontal" :step="1" :min="0" :max="Math.min(total_docs, number_of_docs)"
                        decrementButtonClass="p-button-danger" incrementButtonClass="p-button-success"
                        incrementButtonIcon="pi pi-plus" decrementButtonIcon="pi pi-minus" />
                    </div>
                  </div>
                </div>
                <template v-if="annotatorEmails.length > 0">
                  <span class="mt-2 mb-4 block">Amount of assignments with this configuration:</span>
                  <table id="tableAssignmentsAmounts">
                    <thead>
                      <tr>
                        <th></th>
                        <th>Shared</th>
                        <th>Unique</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <th>Per annotator</th>
                        <td>{{ number_of_fixed_docs }}</td>
                        <template v-if="(number_of_docs - number_of_fixed_docs) % annotatorEmails.length == 0">
                          <td>{{ (number_of_docs - number_of_fixed_docs) / annotatorEmails.length }}</td>
                          <td>{{ (number_of_fixed_docs * annotatorEmails.length + (number_of_docs - number_of_fixed_docs))
                            / annotatorEmails.length }}</td>
                        </template>
                        <template v-else>
                          <td>{{
                            Math.floor((number_of_docs - number_of_fixed_docs) / annotatorEmails.length)
                          }} <i class="text-gray-500">or</i> {{
  Math.ceil((number_of_docs - number_of_fixed_docs) / annotatorEmails.length)
}}</td>
                          <td>{{
                            Math.floor((number_of_fixed_docs * annotatorEmails.length + (number_of_docs -
                              number_of_fixed_docs)) / annotatorEmails.length)
                          }} <i class="text-gray-500">or</i> {{
  Math.ceil((number_of_fixed_docs * annotatorEmails.length + (number_of_docs -
    number_of_fixed_docs)) / annotatorEmails.length)
}}</td>
                        </template>
                      </tr>
                      <tr>
                        <th>Total</th>
                        <td>{{ number_of_fixed_docs * annotatorEmails.length }}</td>
                        <td>{{ number_of_docs - number_of_fixed_docs }}</td>
                        <td>{{ number_of_fixed_docs * annotatorEmails.length + (number_of_docs - number_of_fixed_docs) }}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </template>
                <div class="text-center mt-5">
                  <h6 class="py-4 text-xl text-bold">
                    Randomization Options
                  </h6>
                  <SelectButton v-model="randomizationSelected" :options="Object.values(RandomizationOptions)"
                    aria-labelledby="basic" class="capitalize" />
                  <p class="pt-4 text-start text-xs text-gray-500 min-h-[48px]">
                    {{ randomizationMessage }}
                  </p>
                </div>
              </AccordionTab>
            </Accordion>
            <div class="text-center pt-6">
              <Button :disabled="annotatorEmails.length == 0" @click="createAssignments" data-test="create-assignments">
                Create Assignments
              </Button>
            </div>
          </div>
        </div>
        <ExportTaskModal v-model:form-values="formValues" v-model:export-modal-visible="exportModalVisible"
          @export="exportTask" />
        <SelectMetricModal v-model:visible="selectMetricModalVisible" :baseUrl="`/projects/${task?.project_id}/tasks/${task?.id}/metrics`"/>
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
  Annotation,
  MlModel,
  Labelset
} from "~/types";
import { PublicationStatus } from "~/types"
import { isDocumentLevel } from "~/utils/levels";
import Table from "~/components/Table.vue";
import _ from "lodash";
import { authorizeClient } from "~/utils/authorize.client";
import { downloadAs } from "~/utils/download_file";
import type { ExportTaskOptions } from "~/utils/io";
import type { TabViewChangeEvent } from "primevue/tabview";
import { Origins, AssignmentStatuses, RandomizationOptions } from "~/utils/enums";
import ExportTaskModal from "~/components/tasks/ExportTaskModal.vue";
import SelectMetricModal from "~/components/tasks/SelectMetricModal.vue";
import { watch } from 'vue';

const { $toast, $trpc } = useNuxtApp();

const user = useSupabaseUser();

const route = useRoute();
const task = await $trpc.task.findById.query(+route.params.task_id);
const project = await $trpc.project.findById.query(+route.params.project_id);

const totalAssignments = await $trpc.table.assignments.useQuery({ filter: { task_id: task.id } });
const totalAmountOfDocs = await $trpc.document.totalAmountOfDocs.query(task.project_id);
const total_docs = totalAmountOfDocs ?? 0;
const number_of_docs = ref<number>(total_docs);
const number_of_fixed_docs = ref<number>(total_docs);
const optionsMenu = ref()

const selectMetricModalVisible = ref(false);

const randomizationSelected = ref(RandomizationOptions.FULL);

const labels = await $trpc.labelset.findById.query(+task.labelset_id);

const randomizationMessage = computed(() => {
  switch (randomizationSelected.value) {
    case RandomizationOptions.FULL:
      return "The documents will be shuffled and each annotator will get a different random order.";
    case RandomizationOptions.PARTIAL:
      return "The documents will be shuffled and all the annotators will get the same random order.";
    case RandomizationOptions.NONE:
      return "The documents will not be shuffled and all the annotators will get the same order.";
    default:
      return "Something went wrong";
  }
});

watch(number_of_docs, (newTotalDocs) => {

  if (number_of_fixed_docs.value > newTotalDocs) {
    number_of_fixed_docs.value = newTotalDocs;
  }

  if (number_of_fixed_docs.value > number_of_docs.value) {
    number_of_fixed_docs.value = number_of_docs.value;
  }
});

//#region  ml variables
const mlIntervalId = ref();
const predicting = ref<number>((await $trpc.assignment.countMLStatus.query(task.id)).predicting);

const showPredictionProgressBar = computed(() => {
  return task.ml_model_id && predicting.value;
});

const mlProccessed = computed(() => {
  return totalAssignments.data.value?.total! - predicting.value;
});

const updateMLStatus = async () => {
  const new_predicting = (await $trpc.assignment.countMLStatus.query(task.id)).predicting;
  if (predicting.value != new_predicting) {
    predicting.value = new_predicting;
    totalAssignments.refresh();
  }
}

const startQueryingMlBackend = (interval: number = 3000) => {
  updateMLStatus();
  mlIntervalId.value = setInterval(async () => {
    updateMLStatus();
  }, interval)
};

const stopQueryingMlBackend = () => {
  clearInterval(mlIntervalId.value);
  predicting.value = 0;
  mlIntervalId.value = null;
  refreshGroupByAnnotators();
};

watch(showPredictionProgressBar, (new_value) => {
  if (new_value) {
    if (!mlIntervalId.value) {
      startQueryingMlBackend();
    }
  } else {
    stopQueryingMlBackend();
  }
})
//#endregion
// start definitions related to treeview grouped by annotators

const annotatorsSelectionMenu = ref();
const groupByAnnotatorsSelection = ref<Record<string, { checked: boolean, partialChecked: boolean }>>({});
const groupByAnnotatorsSelectedAssignmentIds = computed(() => {
  return Object
    .entries(groupByAnnotatorsSelection.value)
    .filter(x => x[0].startsWith('ass-') && x[1].checked)
    .map(x => x[0].replace('ass-', ''))
})
const groupByAnnotatorsArgs = reactive({ task_id: task.id, page: 1, filter: { name: '' } });
const groupByAnnotators = await $trpc.assignment.getGroupByAnnotators.useQuery(groupByAnnotatorsArgs);
const groupByAnnotatorsLoading = ref(false);
const refreshGroupByAnnotators = () => {
  groupByAnnotatorsSelection.value = {}
  groupByAnnotatorsLoading.value = true;
  groupByAnnotators.refresh().finally(() => groupByAnnotatorsLoading.value = false)
}
const groupByAnnotatorsPaginate = ({ page }: { page: number }) => {
  groupByAnnotatorsArgs.page = page + 1;
  refreshGroupByAnnotators()
}
watch(() => groupByAnnotatorsArgs.filter.name, refreshGroupByAnnotators)

// end

// start definitions related to treeview grouped by annotators

const documentsSelectionMenu = ref();

const groupByDocumentsSelection = ref<Record<string, { checked: boolean, partialChecked: boolean }>>({});
const groupByDocumentsSelectedAssignmentIds = computed(() => {
  return Object
    .entries(groupByDocumentsSelection.value)
    .filter(x => x[0].startsWith('ass-') && x[1].checked)
    .map(x => x[0].replace('ass-', ''))
})
const groupByDocumentsArgs = reactive({
  task_id: task.id,
  page: 1,
  filter: { document: '' }
});
const groupByDocuments = await $trpc.assignment.getGroupByDocuments.useQuery(groupByDocumentsArgs);
const groupByDocumentsLoading = ref(false);
const refreshGroupByDocuments = () => {
  groupByDocumentsSelection.value = {}
  groupByDocumentsLoading.value = true;
  groupByDocuments.refresh().finally(() => groupByDocumentsLoading.value = false)
}
const groupByDocumentsPaginate = ({ page }: { page: number }) => {
  groupByDocumentsArgs.page = page + 1;
  refreshGroupByDocuments()
}
watch(() => groupByDocumentsArgs.filter.document, refreshGroupByDocuments)

// end

const tabChangeEvent = ({ index }: TabViewChangeEvent) => {
  if (index === 0) refreshGroupByAnnotators()
  else if (index === 1) refreshGroupByDocuments()
}

const removeAssignments = async (ids: string[], finish: () => void) => {
  confirmBox(
    `Are you sure you want to delete ${ids.length} assignment${ids.length > 1 ? "s" : ""}?`,
    "You won't be able to revert this!",
    "warning"
  ).then((result) => {
    if (result.isConfirmed) {
      Promise.all(ids.map((id) => $trpc.assignment.delete.mutate(+id)))
        .then(() => {
          finish();
          $toast.success(`Assignment${ids.length > 0 ? 's' : ''} have been succesfully removed`);
        });
    }
  });
};
const removeAllAssignments = async (finish: () => void) => {
  confirmBox(
    "Are you sure you want to delete all assignments from this task?",
    "You won't be able to revert this!",
    "warning"
  ).then((result) => {
    if (result.isConfirmed) {
      $trpc.assignment.deleteAllFromTask.mutate(task!.id)
        .then(() => {
          finish()
          $toast.success(`All assignments have been succesfully removed`);
        });
    }
  });
};


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

const annotatorEmails = ref<string[]>([]);

const loading = ref(false);

watch(annotatorEmails, (new_val) => {
  if (new_val.length && !/^\S+@\S+\.\S+$/.test(new_val[new_val.length - 1])) {
    new_val.pop();
    $toast.error('Invalid email!')
  }
});

const addMyself = () => {
  if (!isMyselfAdded.value) {
    annotatorEmails.value.push(user.value?.email!);
  } else {
    $toast.error("You have been already added!")
  }
};

const isMyselfAdded = computed(() => {
  return annotatorEmails.value.includes(user.value?.email!);
})

const createAssignments = async () => {
  try {
    loading.value = true;
    if (!task) throw new Error("Task not found");

    // Get the documents
    const docs = await $trpc.document.takeUpToNRandomDocuments.query({
      project_id: task.project_id,
      n: number_of_docs.value,
      randomOrder: randomizationSelected.value != RandomizationOptions.NONE
    });

    const new_assignments: Pick<Assignment, "task_id" | "document_id" | "origin" | "status">[] = [];

    // Create shared assignments (only with docs info)
    for (let i = 0; i < number_of_fixed_docs.value; ++i) {
      for (let j = 0; j < annotatorEmails.value.length; ++j) {
        const new_assignment: Pick<Assignment, "task_id" | "document_id" | "origin" | "status"> = {
          task_id: task.id,
          document_id: docs[i],
          status: task.ml_model_id ? AssignmentStatuses.PREDICTING : AssignmentStatuses.PENDING,
          origin: Origins.MANUAL
        };
        new_assignments.push(new_assignment);
      }
    }

    // Create unique assignments (only with docs info)
    for (let i = number_of_fixed_docs.value; i < number_of_docs.value; ++i) {
      const new_assignment: Pick<Assignment, "task_id" | "document_id" | "origin" | "status"> = {
        task_id: task.id,
        document_id: docs[i],
        status: task.ml_model_id ? AssignmentStatuses.PREDICTING : AssignmentStatuses.PENDING,
        origin: Origins.MANUAL
      };
      new_assignments.push(new_assignment);
    }

    // Get Users
    const usersPromises: Promise<User['id']>[] = [];
    for (let i = 0; i < annotatorEmails.value.length; ++i) {
      usersPromises.push(
        $trpc.assignment.assignUserToTask.query({ email: annotatorEmails.value[i], task_id: task.id })
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
      if (randomizationSelected.value == RandomizationOptions.FULL) {
        permutations.push(_.shuffle(_.clone(unshuffled)));
      } else {
        permutations.push(_.clone(unshuffled));
      }
    }

    for (let i = 0; i < new_assignments.length; ++i) {
      // @ts-expect-error
      new_assignments[i].annotator_id = annotators_id[i % annotators_id.length];
      // @ts-expect-error
      new_assignments[i].annotator_number = (i % annotators_id.length) + 1;

      const newSeqPos = permutations[i % annotators_id.length].shift();
      // @ts-expect-error
      new_assignments[i].seq_pos =
        (newSeqPos ?? Math.floor(i / annotators_id.length)) + 1;
    }

    //create MlModel assignments
    // if (task.ml_model_id) {
    //   docs.map(doc => {
    //     const new_assignment: Pick<Assignment, "task_id" | "document_id" | "origin" | "annotator_number" | "status"> = {
    //       task_id: task.id,
    //       document_id: doc,
    //       annotator_number: annotators_id.length + 1,
    //       origin: "model",
    //       status: "done"
    //     };
    //     new_assignments.push(new_assignment);
    //   });
    // }

    const created_assignments: Assignment[] = await $trpc.assignment.createMany.mutate(
      {
        assignments: new_assignments,
        pre_annotations: task.ml_model_id ?
          {
            ml_model_id: task.ml_model_id,
            labelset_id: task.labelset_id,
            reveal: true
          } :
          undefined
      }
    );

    if (task.ml_model_id) {
      startQueryingMlBackend();
    }

    refreshGroupByAnnotators();
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
        difficulty_rating: ass.difficulty_rating,
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
        const doc_anns = json.documents[doc_pos[a.assignment.document_id]].assignments[ass_pos[a.assignment_id]].annotations;
        ann_pos[a.id] = doc_anns.length

        doc_anns.push({
          start: a.start_index,
          end: a.end_index,
          label: a.label,
          text: a.text,
          relations: [],
          ls_id: a.ls_id,
          confidence_rating: a.confidence_rating,
          html_metadata: a.html_metadata
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

  downloadAs(JSON.stringify(json), `${json.name}.json`);
  formValues.value.modalOperations.loaded = true;
  formValues.value.modalOperations.loading = false;
  $toast.success(`Task has been exported!`);
};

const resetForm = () => {
  Object.assign(formValues.value, JSON.parse(JSON.stringify(defaultFormValues)));
}

onMounted(async () => {

  if (showPredictionProgressBar.value && !mlIntervalId.value) {
    startQueryingMlBackend();
  }

});

definePageMeta({
  middleware: [
    "auth",
    async (to) => authorizeClient([["task", +to.params.task_id]]),
    async (to) => authorizeClient([["project", +to.params.project_id]]),
  ],
});
</script>

<style lang="scss">
/* hide the header columns, but not the filter column (https://stackoverflow.com/a/57236693/17864167) */
#tableGroupByAnnotators table thead,
#tableGroupByDocuments table thead {
  tr {
    display: none;
  }

  tr~tr {
    display: table-row;
  }
}

#tableAssignmentsAmounts {
  width: 100%;

  thead {
    tr {
      th {
        @apply text-right;
      }
    }
  }

  tr {
    @apply border;

    th {
      @apply px-4 py-2 text-left;
    }

    td {
      @apply px-4 py-2 text-right;
    }
  }
}
</style>