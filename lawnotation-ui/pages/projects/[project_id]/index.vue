<template>
  <Breadcrumb v-if="project" :crumbs="[
    {
      name: 'Projects',
      link: '/projects',
    },
    {
      name: `Project ${project.name}`,
      link: `/projects/${project.id}`,
    },
  ]" />

  <div v-if="project">
    <GuidancePanel :currentStep="currentGuidanceStep" />
    <Tabs v-model:value="activeTab">
      <TabList>
        <Tab :value="0" :pt="{ root: { 'data-test': 'tasks-tab' } }">
          <div class="flex gap-3 items-center h-6">
            <span class="leading-none whitespace-nowrap">Tasks</span>
          </div>
        </Tab>
        <Tab :value="1" :pt="{ root: { 'data-test': 'documents-tab' } }">
          <div class="flex gap-3 items-center h-6">
            <span class="leading-none whitespace-nowrap">Documents</span>
            <Badge v-if="documentTable?.total" :value="documentTable?.total || 0" :pt="{ root: 'opacity-75' }"
              :ptOptions="{ mergeProps: true }"></Badge>
          </div>
        </Tab>
        <Tab :value="2" :pt="{ root: { 'data-test': 'edit-tab' } }">
          <div class="flex gap-3 items-center h-6">
            <span class="leading-none whitespace-nowrap">Edit</span>
          </div>
        </Tab>
      </TabList>
      <TabPanels>
      <TabPanel :value="0">
        <div class="dimmer-wrapper pt-2">
          <DimmerProgress v-if="import_progress.loading" v-model="import_progress" />
          <div class="dimmer-content">
            <div data-test="tasks-table">
              <div class="flex justify-end">
                <div class="relative">
                  <Button label="Add task" icon="pi pi-plus" @click="openCreateTaskModal()" icon-pos="right"
                    data-test="open-tasks-modal" />
                  <PulsingRedCircle v-if="currentGuidanceStep == GuidanceSteps.CREATE_TASK" />
                </div>
              </div>
              <Table ref="taskTable" endpoint="tasks" :filter="{ project_id: project?.id }" :sort="true" :search="true"
                :selectable="true" @remove-rows="removeTasks" @remove-all-rows="removeAllTasks">
                <template #row="{
                  item,
                }: {
                  item: Task & { assignments: [{ count: number }] };
                }">
                  <td scope="row" class="px-6 py-2 font-medium text-gray-900 whitespace-nowrap">
                    {{ item.id }}
                  </td>
                  <td class="px-6 py-2">
                    {{ item.name }}
                  </td>
                  <td class="px-6 py-2">
                    {{ item.desc }}
                  </td>
                  <td class="px-6 py-2">
                    {{ item.annotation_level }}
                  </td>
                  <td class="px-6 py-2">
                    <div class="flex gap-2">
                      <div class="relative">
                        <NuxtLink class="base" :to="`/projects/${route.params.project_id}/tasks/${item.id}`"
                          data-test="view-task-link">
                          <Button :label="item.assignments[0].count ? 'View' : 'Assign'
                            " size="small" />
                        </NuxtLink>
                        <PulsingRedCircle v-if="
                          item.assignments[0].count
                            ? currentGuidanceStep ==
                            GuidanceSteps.CHECK_ASSIGNMENTS
                            : currentGuidanceStep ==
                            GuidanceSteps.ASSIGN_ANNOTATORS
                        " />
                      </div>
                      <NuxtLink :to="`/projects/${route.params.project_id}/tasks/${item.id}/edit`"
                        data-test="edit-task-link">
                        <Button label="Edit" size="small" link />
                      </NuxtLink>
                    </div>
                  </td>
                </template>
              </Table>
              <CreateTaskModal
                v-model:visible="showCreateTaskModal"
                :project-id="project.id"
                :has-documents="!!documentTable?.total"
                :initial-tab="createTaskInitialTab"
                @task-created="taskTable?.refresh()"
                @import-task="importTask($event)"
              />
            </div>
          </div>
        </div>
      </TabPanel>
      <TabPanel :value="1">
        <div class="dimmer-wrapper">
          <DimmerProgress v-if="upload_docs_progress.loading" v-model="upload_docs_progress" />
          <div class="dimmer-content">
            <div class="flex justify-end gap-4 pt-2">
              <Button label="Import task(s)" outlined icon="pi pi-plus" @click="activeTab = 0; openCreateTaskModal(1)"
                icon-pos="right" data-test="open-import-task-modal" />
              <div class="relative">
                <Button label="Add" icon="pi pi-plus" :disabled="upload_docs_progress.loading"
                  @click="showUploadDocumentsModal = true" icon-pos="right" data-test="open-documents-modal" />
                <PulsingRedCircle v-if="currentGuidanceStep == GuidanceSteps.UPLOAD_DOCUMENTS" />
              </div>
            </div>
            <Table ref="documentTable" endpoint="documents" :filter="{ project_id: project?.id }" :sort="true"
              :search="true" :selectable="true" :skipConfirmDialog="true" @remove-rows="removeDocuments"
              @remove-all-rows="removeAllDocuments">
              <template #row="{ item }: { item: Document }">
                <td scope="row" class="px-6 py-2 font-medium text-gray-900 whitespace-nowrap">
                  {{ item.id }}
                </td>
                <td class="px-6 py-2">
                  {{ item.name }}
                </td>
                <td class="px-6 py-2 flex">
                  <NuxtLink class="base" :to="`/projects/${route.params.project_id}/documents/${item.id}`">
                    <Button label="View" size="small" />
                  </NuxtLink>
                </td>
              </template>
            </Table>
          </div>
        </div>
        <UploadDocumentsModal
          v-model:visible="showUploadDocumentsModal"
          :document-size-limit-txt="DOCUMENT_SIZE_LIMIT_TXT"
          @upload-documents="uploadDocuments($event)"
          @documents-fetched="onDocumentsFetched($event)"
        />
      </TabPanel>
      <TabPanel :value="2" />
      </TabPanels>
    </Tabs>
  </div>
</template>
<script setup lang="ts">
import type {
  Project,
  Document,
  Task,
} from "~/types";
import CreateTaskModal from "~/components/tasks/CreateTaskModal.vue";
import UploadDocumentsModal from "~/components/documents/UploadDocumentsModal.vue";
import Table from "~/components/Table.vue";
import DimmerProgress from "~/components/DimmerProgress.vue";
import { usePage } from "~/composables/page";
import { useDocumentUpload } from "~/composables/useDocumentUpload";
import { useTaskImport } from "~/composables/useTaskImport";
import { authorizeClient } from "~/utils/authorize.client";
import PulsingRedCircle from "~/components/PulsingRedCircle.vue";
import GuidancePanel from "~/components/GuidancePanel.vue";
import Breadcrumb from "~/components/Breadcrumb.vue";
import Tabs from "primevue/tabs";
import TabList from "primevue/tablist";
import Tab from "primevue/tab";
import TabPanels from "primevue/tabpanels";
import TabPanel from "primevue/tabpanel";
import {
  GuidanceSteps,
} from "~/utils/enums";

const { $toast, $trpc } = useNuxtApp();

const { project } = usePage<{ project: Project }>().value;

const user = useSupabaseUser();

const route = useRoute();

const activeTab = ref<number>(0);
const showCreateTaskModal = ref<boolean>(false);
const createTaskInitialTab = ref<number | undefined>(undefined);

const showUploadDocumentsModal = ref<boolean>(false);

const DOCUMENT_SIZE_LIMIT_TXT = 6000000; // 6MB for .txt and .html files
const DOCUMENT_SIZE_LIMIT_PDF = 4000000; // 4MB for .pdf, .doc, .docx files

const documentTable = ref<InstanceType<typeof Table>>();
const taskTable = ref<InstanceType<typeof Table>>();

const { uploadDocsProgress: upload_docs_progress, uploadDocuments, onDocumentsFetched } =
  useDocumentUpload({
    projectId: project.id,
    trpc: $trpc,
    toast: $toast,
    closeModal: () => {
      showUploadDocumentsModal.value = false;
    },
    refreshDocuments: () => {
      documentTable.value?.refresh();
    },
    documentSizeLimitPdf: DOCUMENT_SIZE_LIMIT_PDF,
  });

const { importProgress: import_progress, importTask } = useTaskImport({
  projectId: project.id,
  userId: user.value?.id,
  trpc: $trpc,
  toast: $toast,
  refreshTaskTable: () => {
    taskTable.value?.refresh();
  },
  refreshDocumentTable: () => {
    documentTable.value?.refresh();
  },
});

const assignmentsCount = ref<number>(
  (await $trpc.assignment.getCountByProject.query(project.id))!,
);

const currentGuidanceStep = computed(() => {
  if (documentTable.value && taskTable.value) {
    if (documentTable.value.total == 0) {
      return GuidanceSteps.UPLOAD_DOCUMENTS;
    } else if (taskTable.value.total == 0) {
      return GuidanceSteps.CREATE_TASK;
    } else if (assignmentsCount.value == 0) {
      return GuidanceSteps.ASSIGN_ANNOTATORS;
    } else {
      return GuidanceSteps.CHECK_ASSIGNMENTS;
    }
  }
  return GuidanceSteps.NONE;
});

const openCreateTaskModal = (tabIndex?: number) => {
  createTaskInitialTab.value = tabIndex;
  showCreateTaskModal.value = true;
};

const removeDocuments = (
  ids: string[],
  finish: (promises: Promise<Boolean>[]) => void,
) => {
  finish(ids.map((id) => $trpc.document.delete.mutate(+id)));
};
const removeAllDocuments = (finish: (promises: Promise<Boolean>) => void) => {
  finish($trpc.document.deleteAllFromProject.mutate(+project.id));
};

const removeTasks = (
  ids: string[],
  finish: (promises: Promise<Boolean>[]) => void,
) => {
  finish(ids.map((id) => $trpc.task.delete.mutate(+id)));
};
const removeAllTasks = (finish: (promises: Promise<Boolean>) => void) => {
  finish($trpc.task.deleteAllFromProject.mutate(project.id));
};

onMounted(async () => {
  if (!documentTable?.value?.total) activeTab.value = 1;
});

watch(activeTab, (newTab, previousTab) => {
  if (newTab === 2) {
    activeTab.value = previousTab === undefined || previousTab === 2 ? 0 : previousTab;
    navigateTo(`/projects/${route.params.project_id}/edit`);
  }
});

watch(
  () => documentTable?.value?.total,
  (newTotal) => {
    if (newTotal) activeTab.value = 0;
  },
);

definePageMeta({
  middleware: [
    "auth",
    async (to) => authorizeClient([["project", +(to.params.project_id ?? 0)]]),
  ],
});
</script>

<style lang="scss">
div.tabs-holder {
  @apply text-sm font-medium text-center text-gray-500 border-b border-gray-200;

  li.tab button {
    @apply inline-block p-4 border-b-2 border-transparent rounded-t-lg hover:text-gray-600 hover:border-gray-300;
  }

  li.tab-active button {
    @apply inline-block p-4 text-primary border-b-2 border-primary rounded-t-lg;
  }
}
</style>
