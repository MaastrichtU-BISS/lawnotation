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
    <TabView v-model:activeIndex="activeTab">
      <TabPanel :pt="{
        headeraction: { 'data-test': 'tasks-tab' }
      }">
        <template #header>
          <div class="flex gap-3 items-center h-6">
            <span class="leading-none whitespace-nowrap">Tasks</span>
          </div>
        </template>
        <div class="dimmer-wrapper pt-2">
          <DimmerProgress v-if="import_progress.loading" v-model="import_progress" />
          <div class="dimmer-content">
            <div data-test="tasks-table">
              <div class="flex justify-end">
                <div class="relative">
                  <Button label="Add" icon="pi pi-plus" @click="showCreateTaskModal = true" icon-pos="right"
                    data-test="open-tasks-modal" />
                  <PulsingRedCircle v-if="currentGuidanceStep == GuidanceSteps.CREATE_TASK" />
                </div>
              </div>
              <Table ref="taskTable" endpoint="tasks" :filter="{ project_id: project?.id }" :sort="true" :search="true"
                :selectable="true" @remove-rows="removeTasks" @remove-all-rows="removeAllTasks">
                <template #row="{ item }: { item: Task & { assignments: [{ count: number }] } }">
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
                  <td class="px-6 py-2 flex">
                    <div class="relative mr-2">
                      <NuxtLink class="base" :to="`/projects/${route.params.project_id}/tasks/${item.id}`"
                        data-test="view-task-link">
                        <Button :label="item.assignments[0].count ? 'View' : 'Assign'" size="small" />
                      </NuxtLink>
                      <PulsingRedCircle
                        v-if="item.assignments[0].count ? currentGuidanceStep == GuidanceSteps.CHECK_ASSIGNMENTS : currentGuidanceStep == GuidanceSteps.ASSIGN_ANNOTATORS" />
                    </div>
                    <NuxtLink :to="`/projects/${route.params.project_id}/tasks/${item.id}/edit`"
                      data-test="edit-task-link">
                      <Button label="Edit" size="small" link />
                    </NuxtLink>
                  </td>
                </template>
              </Table>
              <Dialog v-model:visible="showCreateTaskModal" modal header="Create task" :autoZIndex="false"
                :draggable="false" :pt="{
                  root: '!w-[80vw] xl:!w-[50vw]',
                  header: {
                    style: 'padding-bottom: 0px'
                  },
                  content: {
                    style: 'padding-bottom: 0px'
                  }
                }" :ptOptions="{ mergeProps: true }">
                <TabView v-model:activeIndex="activeTabTaskModal" class="min-h-[565px]">
                  <TabPanel header="New" :pt="{ headerAction: { 'data-test': 'new-tab' } }">
                    <div class="flex justify-center mb-4">
                      <span class="relative w-full">
                        <InputText v-model="new_task.name" data-test="task-name" id="task_name" autocomplete="off"
                          class="peer w-full" placeholder="" />
                        <label for="task_name"
                          class="absolute text-sm text-primary-500 dark:text-primary-400/60 duration-300 transform -translate-y-4 scale-75 top-3 z-10 origin-[0] start-2.5 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-4">Name</label>
                      </span>
                    </div>
                    <Textarea v-model="new_task.desc" data-test="task-description" autoResize rows="3" cols="30"
                      placeholder="Description" class="w-full mb-4" />
                    <div class="flex justify-center mb-4">
                      <span class="relative w-full">
                        <InputText v-model="new_task.ann_guidelines" data-test="annotation-guidelines"
                          id="annotation_guidelines" autocomplete="off" class="peer w-full" placeholder="" />
                        <label for="annotation_guidelines"
                          class="absolute text-sm text-primary-500 dark:text-primary-400/60 duration-300 transform -translate-y-4 scale-75 top-3 z-10 origin-[0] start-2.5 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-4">Guidelines
                          url</label>
                      </span>
                    </div>
                    <div class="flex items-center pb-4">
                      <Dropdown v-model="new_task.labelset_id" :options="labelsets" filter optionLabel="name"
                        option-value="id" placeholder="Select Labelset" class="w-full md:w-1/2"
                        data-test="select-labelset" @update:model-value="labelSelected($event)" />
                      <Button label="Create new labelset" size="small" @click="activeTabTaskModal = 2" link
                        data-test='create-new-labelset' />
                    </div>
                    <div class="flex items-center pb-4">
                      <Dropdown data-test="select-mlModel" v-model="new_task.ml_model_id" :options="models" filter
                        optionLabel="name" option-value="id" placeholder="Select Model (Optional)" class="w-full"
                        @update:model-value="modelSelected($event)" :show-clear="true" />
                    </div>
                    <div class="mb-4 flex justify-between items-center">
                      <div>
                        <p class="font-bold mb-4">Annotation level</p>
                        <SelectButton :options="['span', AnnotationLevels.DOCUMENT]" v-model="selectedAnnotationLevel"
                          @update:model-value="annotationLevelSelected($event)" class="capitalize font-normal"
                          aria-labelledby="basic" data-test="select-annotation-level" :pt="{
                            label: {
                              class: 'font-normal'
                            }
                          }" />
                      </div>
                      <div v-if="selectedAnnotationLevel == 'span'">
                        <p class="font-bold mb-4">Granularity</p>
                        <SelectButton v-model="new_task.annotation_level"
                          :options="Object.values(AnnotationLevels).filter(level => level != AnnotationLevels.DOCUMENT)"
                          @update:model-value="annotationLevelSelected($event)" class="capitalize font-normal"
                          aria-labelledby="basic" data-test="select-annotation-level-2" :pt="{
                            label: {
                              class: 'font-normal'
                            }
                          }" />
                      </div>
                    </div>
                    <div class="flex justify-center mt-10">
                      <Button class="mr-6" label="Cancel" size="small" icon="pi pi-times" iconPos="right" outlined
                        @click="showCreateTaskModal = false;" />
                      <Button data-test="create-tasks" label="Create" size="small" icon="pi pi-check" iconPos="right"
                        @click="createTask" />
                    </div>
                  </TabPanel>
                  <TabPanel header="Import">
                    <div v-if="!uploadHasStarted" class="pt-6">
                      <FileUpload customUpload @uploader="loadExportTaskFile($event)" :multiple="false" accept=".json"
                        chooseLabel="Select" :pt="{
                          chooseButton: {
                            'data-test': 'choose-task',
                          },
                          uploadbutton: {
                            root: {
                              'data-test': 'upload-task'
                            }
                          },
                          thumbnail: {
                            class: 'hidden'
                          }
                        }">
                        <template #empty>
                          <div class="flex items-center justify-center flex-col">
                            <i
                              class="pi pi-cloud-upload border-2 rounded-full p-5 text-8xl text-surface-400 dark:text-surface-600 border-surface-400 dark:border-surface-600" />
                            <p class="mt-4 mb-0">Drag and drop files to here to upload.</p>
                            <p class="text-gray-400 text-xs">.json files exported from Lawnotation</p>
                          </div>
                        </template>
                      </FileUpload>
                    </div>
                    <div v-else>
                      <div class="text-center">
                        <h4 class="mb-2 font-semibold text-gray-900 dark:text-white">
                          The uploaded Task has {{ new_annotators.length }} annotators.
                        </h4>
                        <p class="mb-4">Please, provide the new ones:</p>
                      </div>
                      <div v-for="( new_ann, index ) in  new_annotators " class="flex justify-center mb-4">
                        <span class="relative w-full">
                          <InputText v-model="new_annotators[index]" autocomplete="off" class="peer w-full" placeholder=""
                            :id="`annotator_${index}`" />
                          <label :for="`annotator_${index}`"
                            class="absolute text-sm text-primary-500 dark:text-primary-400/60 duration-300 transform -translate-y-4 scale-75 top-3 z-10 origin-[0] start-2.5 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-4">{{
                              `annotator ${index + 1} ` }}</label>
                        </span>
                      </div>
                      <div class="flex justify-center mt-4 pt-4">
                        <Button class="mr-6" label="Cancel" size="small" icon="pi pi-times" iconPos="right" outlined
                          @click="showCreateTaskModal = false;" />
                        <Button label="Create" size="small" icon="pi pi-check" iconPos="right" @click="importTask" />
                      </div>
                    </div>
                  </TabPanel>
                  <TabPanel header="Labelset">
                    <Labelset v-model="labelset" @labelset-persisted="refreshLabelsets" />
                  </TabPanel>
                </TabView>
              </Dialog>
            </div>
          </div>
        </div>
      </TabPanel>
      <TabPanel :pt="{
        headeraction: { 'data-test': 'documents-tab' }
      }">
        <template #header>
          <div class="flex gap-3 items-center h-6">
            <span class="leading-none whitespace-nowrap">Documents</span>
            <Badge v-if="documentTable?.total" :value="documentTable?.total || 0" :pt="{ root: 'opacity-75' }"
              :ptOptions="{ mergeProps: true }"></Badge>
          </div>
        </template>
        <div class="flex justify-end pt-2">
          <div class="relative">
            <Button label="Add" icon="pi pi-plus" :disabled="loading_docs" @click="showUploadDocumentsModal = true"
              icon-pos="right" data-test="open-documents-modal" />
            <PulsingRedCircle v-if="currentGuidanceStep == GuidanceSteps.UPLOAD_DOCUMENTS" />
          </div>
        </div>
        <Table ref="documentTable" endpoint="documents" :filter="{ project_id: project?.id }" :sort="true" :search="true"
          :selectable="true" @remove-rows="removeDocuments" @remove-all-rows="removeAllDocuments">
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
        <Dialog v-model:visible="showUploadDocumentsModal" modal header="Add documents" :pt="{
          root: '!w-[80vw] xl:!w-[50vw]',
          header: {
            style: 'padding-bottom: 0px'
          },
          content: {
            style: 'padding-bottom: 0px'
          }
        }" :ptOptions="{ mergeProps: true }">
          <TabView v-model:activeIndex="activeTabDocumentsModal" class="min-h-[565px]">
            <TabPanel header="Upload" :pt="{ headerAction: { 'data-test': 'upload-documents-tab' } }">
              <div class="pt-6">
                <FileUpload customUpload @uploader="uploadDocuments($event)" :multiple="true" accept=".txt,.html"
                  chooseLabel="Select" :pt="{
                    input: {
                      'data-test': 'choose-documents'
                    },
                    uploadbutton: {
                      root: {
                        'data-test': 'upload-documents'
                      }
                    },
                    thumbnail: {
                      class: 'hidden'
                    }
                  }
                    ">
                  <template #empty>
                    <div class="flex items-center justify-center flex-col">
                      <i
                        class="pi pi-cloud-upload border-2 rounded-full p-5 text-8xl text-surface-400 dark:text-surface-600 border-surface-400 dark:border-surface-600" />
                      <p class="mt-4 mb-0">Drag and drop files to here to upload.</p>
                      <p class="text-gray-400 text-xs">.txt .html file(s)</p>
                    </div>
                  </template>
                </FileUpload>
              </div>
            </TabPanel>
            <TabPanel header="Find (Rechtspraak)">
              <SearchDocuments :add-documents-to-project="true" @on-documents-fetched="onDocumentsFetched"/>
            </TabPanel>
          </TabView>

        </Dialog>
      </TabPanel>
    </TabView>
  </div>
</template>
<script setup lang="ts">
import type {
  Project,
  Document,
  Task,
  Labelset as LabelsetType,
  Assignment,
  Annotation,
  User,
  AnnotationRelation,
  MlModel,
} from "~/types";
import type { Doc } from "~/types/archive";
import Table from "~/components/Table.vue";
import DimmerProgress from "~/components/DimmerProgress.vue";
import Labelset from "~/components/Labelset.vue";
import { authorizeClient } from "~/utils/authorize.client";
import PulsingRedCircle from "~/components/PulsingRedCircle.vue";
import GuidancePanel from "~/components/GuidancePanel.vue";
import { AnnotationLevels, GuidanceSteps } from "~/utils/enums";
import SearchDocuments from "~/components/SearchDocuments.vue"

const { $toast, $trpc } = useNuxtApp();

const { project } = usePage<{ project: Project }>().value;

const models = ref<MlModel[]>(await $trpc.mlModel.findAll.query());

const user = useSupabaseUser();

const route = useRoute();

const config = useRuntimeConfig();

const loading_docs = ref(false);

const activeTab = ref<number>(0);
const showCreateTaskModal = ref<boolean>(false);
const new_annotators = ref<string[]>([]);
const uploadHasStarted = ref<boolean>(false);
const activeTabTaskModal = ref<number>(0);
const activeTabDocumentsModal = ref<number>(0);

const showUploadDocumentsModal = ref<boolean>(false);

const labelsets = ref(await $trpc.labelset.find.query({}));
const selectedAnnotationLevel = ref<'span' | AnnotationLevels.DOCUMENT>();

const labelset = ref<Optional<LabelsetType, "id" | "editor_id">>({
  id: undefined,
  editor_id: user.value?.id,
  name: "",
  desc: "",
  labels: [],
});

const import_json = ref<any>(null);
const import_progress = ref<{
  loading: boolean;
  current: number;
  total: number;
  message: string;
}>({
  loading: false,
  message: "Creating Task",
  current: 0,
  total: 0,
});

type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>;

const documentTable = ref<InstanceType<typeof Table>>();
const taskTable = ref<InstanceType<typeof Table>>();

const new_task = reactive<Optional<Task, "id" | "labelset_id" | "project_id" | "annotation_level">>({
  name: "",
  desc: "",
  ann_guidelines: "",
  labelset_id: undefined,
  project_id: undefined,
  annotation_level: undefined,
  ml_model_id: undefined
});

const assignmentsCount = ref<number>((await $trpc.assignment.getCountByProject.query(project.id))!);

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

const modelSelected = async (id: number) => {

  // remove added labelsets
  const labelToRemoveIndex = labelsets.value.findIndex(l => !l.editor_id);
  if (labelToRemoveIndex > 0 && new_task.labelset_id == labelsets.value[labelToRemoveIndex].id) {
    new_task.labelset_id = undefined;
    labelsets.value.splice(labelToRemoveIndex, 1);
  }

  const model = models.value.find(m => m.id == id);

  if (new_task.annotation_level != model?.annotation_level) {
    if (model?.annotation_level == AnnotationLevels.DOCUMENT) {
      selectedAnnotationLevel.value = AnnotationLevels.DOCUMENT;
    } else {
      selectedAnnotationLevel.value = "span";
    }
    new_task.annotation_level = model?.annotation_level;
  }

  if (model?.labelset_id) {
    const modelLabelset = await $trpc.labelset.findById.query(model?.labelset_id);
    labelsets.value.push(modelLabelset);
    new_task.labelset_id = modelLabelset.id;
  }
};

const labelSelected = async (id: number) => {
  if (new_task.ml_model_id) {
    const model = await $trpc.mlModel.findById.query(new_task?.ml_model_id);
    if (model.labelset_id) {
      new_task.ml_model_id = undefined;
      labelsets.value = labelsets.value.filter(l => l.editor_id);
    }
  }
};

const annotationLevelSelected = async (value: "span" | AnnotationLevels) => {
  if (value == "span") {
    new_task.annotation_level = AnnotationLevels.SYMBOL;
  } else {
    new_task.annotation_level = value;
  }
  if (new_task.ml_model_id) {
    const model = await $trpc.mlModel.findById.query(new_task?.ml_model_id);
    if (model.annotation_level != value) {
      new_task.ml_model_id = undefined;
      labelsets.value = labelsets.value.filter(l => l.editor_id);
    }
    if (model.labelset_id) {
      new_task.labelset_id = undefined;
    }
  }
};

const refreshLabelsets = async () => {
  activeTabTaskModal.value = 0;
  labelsets.value?.push(labelset.value as any);
  new_task.labelset_id = labelset.value.id!;
}

const uploadDocuments = async (event: { files: FileList }) => {

  var text_promises: Promise<string>[] = [];
  var new_docs: Omit<Document, "id">[] = [];
  loading_docs.value = true;
  showUploadDocumentsModal.value = false;

  Array.from(event.files ?? []).forEach((file: File) => {
    text_promises.push(file.text());
    new_docs.push({
      name: file.name,
      source: "local_upload",
      full_text: "",
      project_id: +route.params.project_id,
    });
  });

  const texts = await Promise.all(text_promises);

  texts.forEach((t, index) => {
    new_docs[index].full_text = t;
  });

  saveDocuments(new_docs);
};

const onDocumentsFetched = (docs: Doc[]) => {
  var new_docs: Omit<Document, "id">[] = [];
  loading_docs.value = true;
  showUploadDocumentsModal.value = false;
  docs.map((doc: Doc) => {
    new_docs.push({
      name: doc.name,
      source: "rechtspraak",
      full_text: doc.content,
      project_id: +route.params.project_id,
    });
  });

  saveDocuments(new_docs);
};

const saveDocuments = async (new_docs: Omit<Document, "id">[]) => {
  try {
    await $trpc.document.createMany.mutate(new_docs);
    documentTable.value?.refresh();
    $toast.success(`${new_docs.length} documents uploaded!`);
  } catch (error) {
    $toast.success(`Error uploading documents: ${error}`);
  } finally {
    loading_docs.value = false;
  }
};

const createTask = () => {
  if (!new_task.project_id) {
    $toast.error("Task must be part of project");
    return;
  }
  if (!new_task.name) {
    $toast.error("Task name is required");
    return;
  }
  if (!new_task.desc) {
    $toast.error("Task description is required");
    return;
  }
  if (new_task.ann_guidelines) {
    try {
      const url = new URL(new_task.ann_guidelines);
    } catch (_) {
      $toast.error("Invalid Guidelines url");
      return;
    }
  }
  if (!new_task.labelset_id) {
    $toast.error("Task must have a labelset");
    return;
  }
  if (!new_task.annotation_level) {
    $toast.error("Task must have an annotation level");
    return;
  }

  try {
    // For some reason casting as Omit<Task, "id"> is necessary here.
    $trpc.task.create.mutate(new_task as Omit<Task, "id">).then(() => {
      taskTable.value?.refresh();
      $toast.success("Task created");
    }).catch((error) => {
      trpcErrorHandler(error, "creating task")
    });
  } catch (error) {
    if (error instanceof Error) $toast.error(`Error creating task: ${error.message}`);
  } finally {
    showCreateTaskModal.value = false;
  }
};

watch(showCreateTaskModal, (new_val) => {
  if (new_val) {
    resetModal();
  }
});

const resetModal = () => {
  uploadHasStarted.value = false;
  new_annotators.value.splice(0);
  activeTabTaskModal.value = 0;
  new_task.name = "";
  new_task.desc = "";
  new_task.ann_guidelines = "";
  new_task.labelset_id = undefined;
  new_task.annotation_level = undefined;
  new_task.ml_model_id = undefined;
};

const loadExportTaskFile = async (event: { files: FileList }) => {
  const file = event.files[0];
  import_json.value = JSON.parse(await file.text());

  if (import_json.value.counts?.annotators) {
    const new_annotators_number = import_json.value.counts?.annotators ?? 0;
    new_annotators.value.splice(0);
    for (let i = 0; i < new_annotators_number; i++) {
      new_annotators.value.push("");
    };
    uploadHasStarted.value = true;
  } else {
    importTask();
  }
};

const importTask = async () => {
  import_progress.value.loading = true;

  for (let i = 0; i < new_annotators.value.length; i++) {
    const new_email = new_annotators.value[i];
    if (new_email.length && !/^\S+@\S+\.\S+$/.test(new_email)) {
      $toast.error(`Invalid email: ${new_email}`);
      import_progress.value.loading = false;
      return;
    }
  };

  uploadHasStarted.value = false;
  showCreateTaskModal.value = false;

  try {
    // creating labelset
    import_progress.value.message = "Creating Labelset";
    let new_labelset_id = labelsets.value![0]?.id ?? 0;
    if (import_json.value.labelset) {
      new_labelset_id = (
        await $trpc.labelset.create.mutate({
          editor_id: user.value?.id,
          ...import_json.value.labelset,
        })
      ).id;
    }

    // creating task
    import_progress.value.message = "Creating Task";
    let _new_task: Omit<Task, "id"> = {
      project_id: project.id,
      name: import_json.value.name ?? "Blank",
      desc: import_json.value.desc ?? "Blank",
      ann_guidelines: import_json.value.ann_guidelines ?? "Blank",
      labelset_id: new_labelset_id,
      annotation_level: import_json.value.annotation_level ?? 'word',
      ml_model_id: import_json.value.ml_model_id ?? undefined
    };

    const task = await $trpc.task.create.mutate(_new_task);

    // creating documents
    if (import_json.value.documents) {
      import_progress.value.message = "Creating Documents";

      const documents = await $trpc.document.createMany.mutate(
        import_json.value.documents.map((d: any) => {
          return {
            name: d.name,
            full_text: d.full_text,
            source: "imported",
            project_id: project.id,
          };
        })
      );
      documentTable.value?.refresh();

      if (import_json.value.counts?.annotators && new_annotators.value) {
        // creating annotators
        import_progress.value.message = "Creating Annotators";

        const usersPromises: Promise<User['id'] | null>[] = [];
        new_annotators.value.map((email) => {
          if (!email || !email.length) {
            usersPromises.push(Promise.resolve(null));
          } else {
            usersPromises.push(
              $trpc.assignment.assignUserToTask.query({
                email: email,
                task_id: task.id
              })
            );
          }

        });

        const annotator_ids = (await Promise.all(usersPromises));

        // creating assignments
        import_progress.value.message = "Creating Assignments";
        let new_assignments: Omit<Assignment, "id">[] = [];

        import_json.value.documents.map((d: any, i: number) => {
          d.assignments.map((ass: any) => {
            let ann_id: string | null = annotator_ids[ass.annotator - 1];

            let new_ass: any = {
              task_id: task.id,
              document_id: documents[i].id,
              difficulty_rating: ass.difficulty_rating,
              seq_pos: ass.order,
              status: "pending",
              annotator_number: ass.annotator,
              origin: "imported"
            };

            if (ann_id) {
              new_ass.annotator_id = ann_id;
            }

            new_assignments.push(new_ass);
          });
        });

        const assignments = await $trpc.assignment.createMany.mutate({ assignments: new_assignments });

        if (import_json.value.counts?.annotations) {
          // Creating annotations
          import_progress.value.message = "Creating Annotations";
          let new_annotations: Omit<Annotation, "id">[] = [];
          let ass_index: number = 0;

          import_json.value.documents.map((d: any) => {
            d.assignments.map((ass: any) => {
              ass.annotations.map((ann: any) => {
                new_annotations.push({
                  start_index: ann.start,
                  end_index: ann.end,
                  label: ann.label,
                  text: ann.text,
                  assignment_id: assignments[ass_index].id,
                  origin: "imported",
                  ls_id: ann.ls_id,
                  confidence_rating: ann.confidence_rating
                });
              });
              ass_index++;
            });
          });

          const annotations = await $trpc.annotation.createMany.mutate(new_annotations)

          // create relations
          import_progress.value.message = "Creating Relations";
          if (import_json.value.counts?.relations) {
            let new_relations: Omit<AnnotationRelation, "id">[] = [];
            let ann_index: number = 0;

            import_json.value.documents.map((d: any) => {
              d.assignments.map((ass: any) => {
                let current_ann: number = 0;
                ass.annotations.map((ann: any) => {
                  ann.relations.map((rel: any) => {
                    new_relations.push({
                      from_id: annotations[ann_index + current_ann].id,
                      to_id: annotations[ann_index + rel.to].id,
                      labels: rel.labels,
                      direction: rel.direction,
                      ls_from: annotations[ann_index + current_ann].ls_id,
                      ls_to: annotations[ann_index + rel.to].ls_id,
                    });
                  });
                  current_ann++;
                });
                ann_index += current_ann;
              });
            });

            const relations = await $trpc.relation.createMany.mutate(new_relations);
          }
        }
      }
    }
    $toast.success("Task successfully imported!");
  } catch (error) {
    $toast.error(`Error importing the Task! ${error}`);
  } finally {
    import_progress.value.loading = false;
    taskTable.value?.refresh();
    resetModal();
  }
};

const removeDocuments = (ids: string[], finish: (promises: (Promise<Boolean>[])) => void) => {
  finish(ids.map((id) => $trpc.document.delete.mutate(+id)));
};
const removeAllDocuments = (finish: (promises: (Promise<Boolean>)) => void) => {
  finish($trpc.document.deleteAllFromProject.mutate(+project.id));
};

const removeTasks = (ids: string[], finish: (promises: (Promise<Boolean>[])) => void) => {
  finish(ids.map((id) => $trpc.task.delete.mutate(+id)));
};
const removeAllTasks = (finish: (promises: (Promise<Boolean>)) => void) => {
  finish($trpc.task.deleteAllFromProject.mutate(project.id));
};

onMounted(async () => {
  new_task.project_id = project.id;

  if (!documentTable?.value?.total) activeTab.value = 1;
});

watch(() => documentTable?.value?.total, (newTotal) => {
  if (newTotal) activeTab.value = 0;
})

definePageMeta({
  middleware: [
    "auth",
    async (to) => authorizeClient([["project", +to.params.project_id]]),
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
</style>~/components/Labelsets.vue
