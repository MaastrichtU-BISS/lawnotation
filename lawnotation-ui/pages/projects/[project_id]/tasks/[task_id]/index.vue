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
              iconPos="right" :disabled="amountAnnotators < 2"
              v-tooltip="amountAnnotators < 2 ? 'A task must have at least two assigned annotators to compute agreement metrics.' : undefined"
              @click="navigateTo(`/projects/${task?.project_id}/tasks/${task?.id}/metrics`)" />
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

          <Tabs v-model:value="activeTab">
            <TabList>
              <Tab value="annotators">Annotators</Tab>
              <Tab value="documents">Documents</Tab>
              <Tab value="edit"><span data-test="edit-tab">Edit</span></Tab>
            </TabList>
            <TabPanels>
              <TabPanel value="annotators">

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
                  <Button v-if="groupByAnnotatorsSelectedCount"
                    @click="removeSelectedFromAnnotatorTree()"
                    severity="danger" outlined :pt="{ label: 'text-xs' }" :ptOptions="{ mergeProps: true }"
                    data-test="remove-selected-rows" class="ml-3" size="small">
                    Remove selected assignments ({{ groupByAnnotatorsSelectedCount }})
                  </Button>
                </div>

                <span v-if="groupByAnnotators.status.value == 'error'"
                  class="block p-3 bg-red-200 border border-red-300">An
                  error occured when loading the assignments.{{ groupByAnnotators.error.value }}</span>
                <TreeTable v-else :value="groupByAnnotators.data.value!.data"
                  :totalRecords="groupByAnnotators.data.value!.total" :pt="{
                    table: {
                      class: 'border-collapse w-full table-fixed'
                    }
                  }" v-model:selection-keys="groupByAnnotatorsSelection" selectionMode="checkbox"
                  id="tableGroupByAnnotators" :lazy="true" :paginator="true" :rows="10"
                  :loading="groupByAnnotatorsLoading" @page="groupByAnnotatorsPaginate"
                  @node-expand="onAnnotatorExpand">
                  <Column columnKey="name" header="Name" expander style="width: 45%; white-space: nowrap; padding-right: 2rem">
                    <template #filter>
                      <InputText v-model="groupByAnnotatorsArgs.filter.name" size="small" type="text"
                        class="p-column-filter font-medium" placeholder="Filter by email" />
                    </template>
                    <template #body="{ node }">
                      <template v-if="node.type == 'annotator' && node.data.name == user!.email">
                        <i class="pi pi-user mr-3 ml-2"></i>
                        <span
                          class="px-3 bg-primary-500/20 truncate leading-[1.5rem] rounded-full" :title="node.data.name">{{
                            node.data.name }}</span>
                      </template>
                      <template v-else-if="node.type == 'annotator'">
                        <i class="pi pi-user mr-3 ml-2"></i><span class="truncate" :title="node.data.name">{{ node.data.name }}</span>
                      </template>
                      <template v-else-if="node.type == 'more'">
                        <span class="ml-2 text-surface-500">{{ node.data.remaining }} more…</span>
                      </template>
                      <template v-else-if="node.type == 'document'">
                        <i class="pi pi-file mr-3 ml-2" />
                        <Badge :value="node.data.seq_pos" severity="secondary" class="mr-2" />
                        <span class="truncate" :title="node.data.document_name">{{ node.data.document_name }}</span>
                      </template>
                    </template>
                  </Column>
                  <Column columnKey="progress" header="Progress" style="width: 55%;">
                    <template #body="{ node }">
                      <template v-if="node.type == 'annotator'">
                        <div class="w-full flex justify-between items-center gap-4">
                          <div class="flex items-center flex-1 min-w-0">
                            <span class="whitespace-nowrap mr-4">
                              {{ node.data.amount_done }} / {{ node.data.amount_total }}
                            </span>
                            <ProgressBar class="flex-1 max-w-80" :showValue="false"
                              :value="Math.round((node.data.amount_done / node.data.amount_total) * 100)" />
                          </div>
                          <NuxtLink
                            v-if="node.data.amount_done < node.data.amount_total && node.data.name == user!.email"
                            class="shrink-0" :to="`/annotate/${task.id}?seq=${node.data.next_seq_pos}`">
                            <Button label="Annotate Next" size="small" icon="pi pi-pencil" />
                          </NuxtLink>
                        </div>
                      </template>
                      <template v-else-if="node.type == 'more'">
                        <Button :label="`Load ${Math.min(node.data.remaining, ANNOTATOR_DOCUMENTS_PAGE)} more`" size="small"
                          text icon="pi pi-angle-down" :loading="loadingAnnotatorDocuments[node.data.annotator_key]"
                          @click="loadAnnotatorDocuments(node.data.annotator_key)" />
                      </template>
                      <template v-else-if="node.type == 'document'">
                        <div class="w-full flex justify-between items-center gap-4">
                          <div class="flex items-center gap-3 shrink-0">
                            <Badge :value="node.data.status"
                              :severity="node.data.status == 'done' ? 'success' : 'danger'" class="capitalize px-2" />
                            <Badge severity="yellow" class="px-2 whitespace-nowrap" v-if="node.data.difficulty_rating > 0">
                              <i class="pi pi-star" /> {{ node.data.difficulty_rating }}
                            </Badge>
                          </div>
                          <div class="flex items-center gap-3 shrink-0">
                            <NuxtLink
                              v-if="node.data.status == AssignmentStatuses.DONE && node.data.name == user?.email"
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

              <TabPanel value="documents">
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

                <span v-if="groupByDocuments.status.value == 'error'"
                  class="block p-3 bg-red-200 border border-red-300">
                  An error occured when loading the assignments.{{ groupByDocuments.error.value }}
                  <Button label="retry" @click="refreshGroupByDocuments" />
                </span>
                <TreeTable v-else-if="groupByDocuments.data.value" :value="groupByDocuments.data.value!.data"
                  :totalRecords="groupByDocuments.data.value!.total" :pt="{
                    table: {
                      class: 'border-collapse w-full table-fixed'
                    }
                  }" v-model:selection-keys="groupByDocumentsSelection" selectionMode="checkbox"
                  id="tableGroupByDocuments" :lazy="true" :paginator="true" :rows="10"
                  :loading="groupByDocumentsLoading" @page="groupByDocumentsPaginate">
                  <Column columnKey="name" header="Name" sortable expander
                    style="width: 45%; white-space: nowrap; padding-right: 2rem">
                    <template #filter>
                      <InputText v-model="groupByDocumentsArgs.filter.document" size="small" type="text"
                        class="p-column-filter font-medium" placeholder="Filter by document" />
                    </template>
                    <template #body="{ node }">
                      <template v-if="node.type == 'annotator' && node.data.name == user!.email">
                        <i class="pi pi-user mr-3 ml-2"></i>
                        <span
                          class="px-3 bg-primary-500/20 truncate leading-[1.5rem] rounded-full" :title="node.data.name">{{
                            node.data.name }}</span>
                      </template>
                      <template v-else-if="node.type == 'annotator'">
                        <i class="pi pi-user mr-3 ml-2"></i><span class="truncate" :title="node.data.name">{{ node.data.name }}</span>
                      </template>
                      <template v-else-if="node.type == 'document'">
                        <i class="pi pi-file mr-2 ml-2" />
                        <span class="truncate" :title="node.data.document_name">{{ node.data.document_name }}</span>
                        <NuxtLink v-if="user?.id == project.editor_id" class="shrink-0"
                          :to="`/projects/${project.id}/tasks/${task.id}/documents/${node.data.document_id}`">
                          <Button label="annotations" link class="text-xs underline" icon=""></Button>
                        </NuxtLink>
                      </template>
                    </template>
                  </Column>
                  <Column columnKey="progress" header="Progress" sortable style="width: 55%;">
                    <template #body="{ node }">
                      <template v-if="node.type == 'document'">
                        <div class="w-full flex items-center">
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
                        <div class="w-full flex justify-between items-center gap-4">
                          <div class="flex items-center gap-3 shrink-0">
                            <Badge :value="node.data.status"
                              :severity="node.data.status == AssignmentStatuses.DONE ? 'success' : 'danger'"
                              class="capitalize px-2" />
                            <Badge severity="yellow" class="px-2 whitespace-nowrap" v-if="node.data.difficulty_rating > 0">
                              <i class="pi pi-star" /> {{ node.data.difficulty_rating }}
                            </Badge>
                          </div>
                          <div class="flex items-center gap-3 shrink-0">
                            <NuxtLink
                              v-if="node.data.status == AssignmentStatuses.DONE && node.data.name == user?.email"
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
                <div v-else class="p-3 text-surface-500">Loading…</div>
              </TabPanel>
              <TabPanel value="edit">
              </TabPanel>
            </TabPanels>
          </Tabs>

        </div>

        <div v-else class="flex justify-center">
          <div class="w-1/2 space-y-2 border-neutral-300">
            <h3 class="mt-3 text-lg font-semibold text-center">Assign annotators</h3>
            <h3 class="mt-3 text-sm font-semibold">
              Emails added: {{ annotatorEmails.length }}
            </h3>
            <AutoComplete v-model="annotatorEmails" multiple :typeahead="false" :suggestions="[]" class="w-full" :pt="{
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
            <Accordion value="">
              <AccordionPanel value="0">
                <AccordionHeader>Advanced Settings</AccordionHeader>
                <AccordionContent>
                  <div class="text-center">
                    <h5 class="pb-4 text-xl text-bold">
                      Documents
                    </h5>
                    <div>
                      <label>Total</label>
                    </div>
                    <Multiselect v-model="selectedTotalDocuments" class="w-full" filter :autoFilterFocus="true"
                      :filterFields="['name']" :maxSelectedLabels="1" :options="optionsTotalDocuments"
                      placeholder="Select documents" :virtualScrollerOptions="{ itemSize: 44 }" @change="verifyShared">
                      <template #value="slotProps">
                        <div>
                          {{ `${slotProps.value?.length} document${slotProps.value?.length == 1 ? '' : 's'} selected` }}
                        </div>
                      </template>
                      <template #option="slotProps">
                        {{ slotProps.option.name }}
                      </template>
                    </Multiselect>
                    <div class="py-4">
                      <div>
                        <label for="fixed_docs">Shared</label>
                      </div>
                      <Multiselect v-model="selectedSharedDocuments" class="w-full" filter :autoFilterFocus="true"
                        :filterFields="['name']" :maxSelectedLabels="1" :options="selectedTotalDocuments"
                        placeholder="Select documents" :virtualScrollerOptions="{ itemSize: 44 }">
                        <template #value="slotProps">
                          <div>
                            {{ `${slotProps.value?.length} document${slotProps.value?.length == 1 ? '' : 's'} selected`
                            }}
                          </div>
                        </template>
                        <template #option="slotProps">
                          {{ slotProps.option.name }}
                        </template>
                      </Multiselect>
                    </div>
                  </div>
                  <template v-if="annotatorEmails.length > 0">
                    <span class="mt-2 mb-4 block">Distribution of assignments with this configuration:</span>
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
                          <td>{{ selectedSharedDocuments.length }}</td>
                          <template
                            v-if="(selectedTotalDocuments.length - selectedSharedDocuments.length) % annotatorEmails.length == 0">
                            <td>{{ (selectedTotalDocuments.length - selectedSharedDocuments.length) /
                              annotatorEmails.length }}</td>
                            <td>{{ (selectedSharedDocuments.length * annotatorEmails.length +
                              (selectedTotalDocuments.length - selectedSharedDocuments.length))
                              / annotatorEmails.length }}</td>
                          </template>
                          <template v-else>
                            <td>{{
                              Math.floor((selectedTotalDocuments.length - selectedSharedDocuments.length) /
                                annotatorEmails.length)
                              }} <i class="text-gray-500">or</i> {{
                                Math.ceil((selectedTotalDocuments.length - selectedSharedDocuments.length) /
                                  annotatorEmails.length)
                              }}</td>
                            <td>{{
                              Math.floor((selectedSharedDocuments.length * annotatorEmails.length +
                                (selectedTotalDocuments.length -
                                  selectedSharedDocuments.length)) / annotatorEmails.length)
                            }} <i class="text-gray-500">or</i> {{
                                Math.ceil((selectedSharedDocuments.length * annotatorEmails.length +
                                  (selectedTotalDocuments.length -
                                    selectedSharedDocuments.length)) / annotatorEmails.length)
                              }}</td>
                          </template>
                        </tr>
                        <tr>
                          <th>Total</th>
                          <td>{{ selectedSharedDocuments.length * annotatorEmails.length }}</td>
                          <td>{{ selectedTotalDocuments.length - selectedSharedDocuments.length }}</td>
                          <td>{{ selectedSharedDocuments.length * annotatorEmails.length +
                            (selectedTotalDocuments.length
                              -
                            selectedSharedDocuments.length) }}
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
                </AccordionContent>
              </AccordionPanel>
            </Accordion>
            <div class="text-center pt-6">
              <Button :disabled="annotatorEmails.length == 0 || !selectedTotalDocuments.length"
                @click="createAssignments" data-test="create-assignments">
                Create Assignments
              </Button>
            </div>
          </div>
        </div>
        <ExportTaskModal v-model:form-values="formValues" v-model:export-modal-visible="exportModalVisible"
          @export="exportTask" />
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
  Document,
  Publication,
  Annotation,
  MlModel,
  Labelset
} from "~/types";
import { PublicationStatus } from "~/types"
import { isDocumentLevel } from "~/utils/levels";
import Multiselect from "primevue/multiselect";
import Table from "~/components/Table.vue";
import Breadcrumb from "~/components/Breadcrumb.vue";
import { shuffle, clone } from "es-toolkit"
import { authorizeClient } from "~/utils/authorize.client";
import { downloadAs } from "~/utils/download_file";
import type { ExportTaskOptions } from "~/utils/io";
import { Origins, AssignmentStatuses, RandomizationOptions } from "~/utils/enums";
import ExportTaskModal from "~/components/tasks/ExportTaskModal.vue";
import { watch } from 'vue';

const { $toast, $trpc } = useNuxtApp();

const user = useSupabaseUser();

const route = useRoute();
// Independent of each other, so asked for together rather than one by one.
const taskId = +route.params.task_id;
const [task, project, totalAssignments, optionsTotalDocuments, initialMlStatus, allAnnotators] = await Promise.all([
  $trpc.task.findById.query(taskId),
  $trpc.project.findById.query(+route.params.project_id),
  $trpc.table.assignments.useQuery({ filter: { task_id: taskId } }),
  $trpc.document.findByProject.query(+route.params.project_id) as Promise<{ id: number; name: string }[]>,
  $trpc.assignment.countMLStatus.query(taskId),
  $trpc.task.getAllAnnotatorsFromTask.query(taskId),
]);
const selectedTotalDocuments = ref<{ id: number; name: string }[]>(optionsTotalDocuments);
const selectedSharedDocuments = ref<{ id: number; name: string }[]>(selectedTotalDocuments.value);

const optionsMenu = ref()

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

const verifyShared = () => {
  selectedSharedDocuments.value = selectedSharedDocuments.value.filter(x => selectedTotalDocuments.value.includes(x));
};

//#region  ml variables
const mlIntervalId = ref();
const predicting = ref<number>(initialMlStatus.predicting);

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
// Ticking an annotator means all of their assignments, loaded or not; those
// are removed by annotator. Documents ticked one by one are removed by id.
const groupByAnnotatorsSelectedAnnotators = computed(() =>
  Object.entries(groupByAnnotatorsSelection.value)
    .filter(([key, value]) => key.startsWith('ann-') && value.checked)
    .map(([key]) => +key.replace('ann-', ''))
)
const groupByAnnotatorsSelectedAssignmentIds = computed(() => {
  const wholeAnnotators = new Set(groupByAnnotatorsSelectedAnnotators.value.map((n) => `ann-${n}`));
  const underWholeAnnotator = new Set(
    (groupByAnnotators.data.value?.data ?? [])
      .filter((node) => wholeAnnotators.has(node.key))
      .flatMap((node) => node.children.map((child) => child.key))
  );
  return Object
    .entries(groupByAnnotatorsSelection.value)
    .filter(([key, value]) => key.startsWith('ass-') && value.checked && !underWholeAnnotator.has(key))
    .map(([key]) => key.replace('ass-', ''))
})
const groupByAnnotatorsSelectedCount = computed(() =>
  (groupByAnnotators.data.value?.data ?? [])
    .filter((node) => groupByAnnotatorsSelectedAnnotators.value.includes(node.data.annotator_number))
    .reduce((sum, node) => sum + node.data.amount_total, 0)
  + groupByAnnotatorsSelectedAssignmentIds.value.length
)
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

// An annotator's documents are fetched when their row is expanded, a page at
// a time, with a last row offering the rest.
const ANNOTATOR_DOCUMENTS_PAGE = 50;
const loadingAnnotatorDocuments = ref<Record<string, boolean>>({});
const loadAnnotatorDocuments = async (annotatorKey: string) => {
  const node = groupByAnnotators.data.value?.data.find((n) => n.key === annotatorKey);
  if (!node || loadingAnnotatorDocuments.value[annotatorKey]) return;
  loadingAnnotatorDocuments.value[annotatorKey] = true;
  try {
    const loaded = node.children.filter((c: any) => c.type === 'document');
    const page = await $trpc.assignment.getAnnotatorAssignments.query({
      task_id: task.id,
      annotator_number: node.data.annotator_number,
      offset: loaded.length,
      limit: ANNOTATOR_DOCUMENTS_PAGE,
    });
    const documents = [...loaded, ...page.data];
    const remaining = page.total - documents.length;
    const children = remaining > 0
      ? [...documents, { type: 'more', key: `more-${annotatorKey}`, data: { annotator_key: annotatorKey, remaining } } as any]
      : documents;
    // The query's data is a shallow ref (Nuxt 4), so the change has to be a
    // new value rather than an edit inside the old one.
    const current = groupByAnnotators.data.value!;
    groupByAnnotators.data.value = {
      ...current,
      data: current.data.map((n) => (n.key === annotatorKey ? { ...n, children } : n)),
    };
  } catch (error) {
    $toast.error(`Could not load the documents: ${(error as Error)?.message}`);
  } finally {
    loadingAnnotatorDocuments.value[annotatorKey] = false;
  }
}
const onAnnotatorExpand = (node: { key: string; type: string; children: unknown[] }) => {
  if (node.type === 'annotator' && !node.children.length) loadAnnotatorDocuments(node.key);
}

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
const groupByDocuments = await $trpc.assignment.getGroupByDocuments.useQuery(groupByDocumentsArgs, { immediate: false });
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

const amountAnnotators = allAnnotators.filter(x => x.id).length

const activeTab = ref('annotators');

watch(activeTab, (value) => {
  if (value === 'annotators') refreshGroupByAnnotators()
  else if (value === 'documents') refreshGroupByDocuments()
  else if (value === 'edit') navigateTo(`/projects/${project.id}/tasks/${task.id}/edit`);
})

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
const removeSelectedFromAnnotatorTree = async () => {
  const annotators = groupByAnnotatorsSelectedAnnotators.value;
  const ids = groupByAnnotatorsSelectedAssignmentIds.value;
  const count = groupByAnnotatorsSelectedCount.value;
  confirmBox(
    `Are you sure you want to delete ${count} assignment${count > 1 ? "s" : ""}?`,
    "You won't be able to revert this!",
    "warning"
  ).then(async (result) => {
    if (!result.isConfirmed) return;
    await Promise.all([
      annotators.length
        ? $trpc.assignment.deleteByAnnotators.mutate({ task_id: task.id, annotator_numbers: annotators })
        : Promise.resolve(0),
      ...ids.map((id) => $trpc.assignment.delete.mutate(+id)),
    ]);
    refreshGroupByAnnotators();
    totalAssignments.refresh();
    $toast.success(`Assignment${count > 1 ? 's' : ''} have been succesfully removed`);
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

    let sharedDocs = clone(selectedSharedDocuments.value);
    let uniqueDocs = clone(selectedTotalDocuments.value.filter(x => !selectedSharedDocuments.value.includes(x)));

    if (randomizationSelected.value != RandomizationOptions.NONE) {
      sharedDocs = shuffle(clone(sharedDocs));
      uniqueDocs = shuffle(clone(uniqueDocs));
    }

    const docs = sharedDocs.concat(uniqueDocs);

    const new_assignments: Pick<Assignment, "document_id" | "origin" | "status">[] = [];

    // Create shared assignments (only with docs info)
    for (let i = 0; i < selectedSharedDocuments.value.length; ++i) {
      for (let j = 0; j < annotatorEmails.value.length; ++j) {
        const new_assignment: Pick<Assignment, "document_id" | "origin" | "status"> = {
          document_id: docs[i].id,
          status: task.ml_model_id ? AssignmentStatuses.PREDICTING : AssignmentStatuses.PENDING,
          origin: Origins.MANUAL
        };
        new_assignments.push(new_assignment);
      }
    }

    // Create unique assignments (only with docs info)
    for (let i = selectedSharedDocuments.value.length; i < selectedTotalDocuments.value.length; ++i) {
      const new_assignment: Pick<Assignment, "document_id" | "origin" | "status"> = {
        document_id: docs[i].id,
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
        selectedSharedDocuments.value.length +
        Math.floor((selectedTotalDocuments.value.length - selectedSharedDocuments.value.length) / annotators_id.length)
      ).keys(),
    ];

    const permutations = [];
    for (let i = 0; i < annotators_id.length; ++i) {
      if (randomizationSelected.value == RandomizationOptions.FULL) {
        permutations.push(shuffle(clone(unshuffled)));
      } else {
        permutations.push(clone(unshuffled));
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
        task_id: task.id,
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
  const new_task = await $trpc.task.replicateTask.mutate({ task_id: task.id });
  loading.value = false;
  $toast.success(`Task successfully replicated! ${new_task.id}`);
};

const exportTask = async () => {
  formValues.value.modalOperations.loading = true;
  try {
    const json = await $trpc.task.exportData.query({
      task_id: task!.id,
      options: formValues.value.export_options,
    });

    if (json.counts) {
      formValues.value.publication.documents = json.counts.documents ?? 0;
      formValues.value.publication.assignments = json.counts.assignments ?? 0;
      formValues.value.publication.annotators = json.counts.annotators ?? 0;
      formValues.value.publication.annotations = json.counts.annotations ?? 0;
      formValues.value.publication.relations = json.counts.relations ?? 0;
    }

    downloadAs(JSON.stringify(json), `${json.name}.json`);
    formValues.value.modalOperations.loaded = true;
    $toast.success(`Task has been exported!`);
  } finally {
    formValues.value.modalOperations.loading = false;
  }
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
/* long names truncate; the toggle, checkbox and icons beside them keep their size */
#tableGroupByAnnotators,
#tableGroupByDocuments {
  .p-treetable-body-cell-content > :not(.truncate) {
    flex-shrink: 0;
  }
}

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