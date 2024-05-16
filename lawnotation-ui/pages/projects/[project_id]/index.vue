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
      <TabPanel :disabled="!documentTable?.total" :pt="{
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
                    {{ isWordLevel(item) ? 'Word' : 'Document' }}
                  </td>
                  <td class="px-6 py-2 flex">
                    <div class="relative mr-2">
                      <NuxtLink class="base" :to="`/projects/${route.params.project_id}/tasks/${item.id}`"
                        data-test="view-task-link">
                        <Button :label="item.assignments[0].count ? 'View' : 'Assign'" size="small" />
                      </NuxtLink>
                      <PulsingRedCircle v-if="currentGuidanceStep == GuidanceSteps.ASSIGN_ANNOTATORS" />
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
                <TabView v-model:activeIndex="activeTabTaskModal" class="min-h-[540px]">
                  <TabPanel header="New" :pt="{ headerAction: { 'data-test': 'new-tab' } }">
                    <div class="flex justify-center mb-4">
                      <span class="relative w-full">
                        <InputText v-model="new_task.name" data-test="task-name" id="task_name" autocomplete="off"
                          class="peer w-full" placeholder="" />
                        <label for="task_name"
                          class="absolute text-sm text-primary-500 dark:text-primary-400/60 duration-300 transform -translate-y-4 scale-75 top-4 z-10 origin-[0] start-2.5 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-4">Name</label>
                      </span>
                    </div>
                    <Textarea v-model="new_task.desc" data-test="task-description" autoResize rows="3" cols="30"
                      placeholder="Description" class="w-full mb-4" />
                    <Textarea v-model="new_task.ann_guidelines" data-test="annotation-guidelines" autoResize rows="3"
                      cols="30" placeholder="Annotation Guidelines" class="w-full mb-4" />
                    <div class="flex items-center pb-4">
                      <Dropdown v-model="new_task.labelset_id" :options="labelsets.data.value" filter optionLabel="name"
                        option-value="id" placeholder="Select Labelset" class="w-full md:w-1/2"
                        data-test="select-labelset" />
                      <Button label="Create new labelset" size="small" @click="activeTabTaskModal = 2" link
                        data-test='create-new-labelset' />
                    </div>
                    <div>
                      <p class="font-bold">Annotation level</p>
                      <SelectButton v-model="new_task.annotation_level" :options="['word', 'document']"
                        class="capitalize font-normal" aria-labelledby="basic" data-test="select-annotation-level" :pt="{
                          label: {
                            class: 'font-normal'
                          }
                        }" />
                    </div>
                    <div class="flex justify-center mt-6">
                      <Button class="mr-6" label="Cancel" size="small" icon="pi pi-times" iconPos="right" outlined
                        @click="showCreateTaskModal = false;" />
                      <Button data-test="create-tasks" label="Create" size="small" icon="pi pi-check" iconPos="right"
                        @click="createTask" />
                    </div>
                  </TabPanel>
                  <TabPanel header="Upload">
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
                            class="absolute text-sm text-primary-500 dark:text-primary-400/60 duration-300 transform -translate-y-4 scale-75 top-4 z-10 origin-[0] start-2.5 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-4">{{
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
                  <TabPanel header="Labelsets">
                    <template v-if="labelsetStage === 'overview'">
                      <Labelsets @add-labelset="loadLabelset"
                        @edit-labelset="(labelsetId: number) => loadLabelset(labelsetId)" />
                    </template>
                    <template v-else-if="labelsetStage === 'labelset'">
                      <Button label="back" size="small" icon="pi pi-arrow-left" link @click="labelsetStage = 'overview'"
                        :pt="{ root: 'ps-0' }" :ptOptions="{ mergeProps: true }" />
                      <Labelset v-model="labelset" @labelset-persisted="refreshLabelsets" />
                    </template>
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
        <Dialog v-model:visible="showUploadDocumentsModal" modal header="Upload documents">
          <FileUpload customUpload @uploader="uploadDocuments($event)" :multiple="true" accept=".txt,.html"
            chooseLabel="Select" :maxFileSize="3145728" :pt="{
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
} from "~/types";
import Table from "~/components/Table.vue";
import DimmerProgress from "~/components/DimmerProgress.vue";
import Labelsets from "~/components/Labelsets.vue";
import Labelset from "~/components/Labelset.vue";
import { authorizeClient } from "~/utils/authorize.client";
import { isWordLevel } from "~/utils/levels";
import PulsingRedCircle from "~/components/PulsingRedCircle.vue";
import GuidancePanel from "~/components/GuidancePanel.vue";
import { GuidanceSteps } from "~/utils/guidance";

const { $toast, $trpc } = useNuxtApp();

const { project } = usePage<{ project: Project }>().value;

const user = useSupabaseUser();

const route = useRoute();

const config = useRuntimeConfig();

const loading_docs = ref(false);

const activeTab = ref<number>(0);
const showCreateTaskModal = ref<boolean>(false);
const new_annotators = ref<string[]>([]);
const uploadHasStarted = ref<boolean>(false);
const activeTabTaskModal = ref<number>(0);
const labelsetStage = ref<'overview' | 'labelset'>('overview');
const labelset = ref<Optional<LabelsetType, "id" | "editor_id">>({
  id: undefined,
  editor_id: undefined,
  name: "",
  desc: "",
  labels: [],
});

const showUploadDocumentsModal = ref<boolean>(false);

let labelsets = await $trpc.labelset.find.useQuery({});

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
});

const currentGuidanceStep = computed(() => {
  if (documentTable.value?.total == 0) {
    return GuidanceSteps.UPLOAD_DOCUMENTS;
  } else if (documentTable.value?.total! > 0 && taskTable.value?.total! == 0) {
    return GuidanceSteps.CREATE_TASK;
  } else if (documentTable.value?.total! > 0 && taskTable.value?.total! > 0) {
    return GuidanceSteps.ASSIGN_ANNOTATORS;
  }
  return GuidanceSteps.NONE;
});

const loadLabelset = async (id?: number) => {
  if (id) {
    labelset.value = await $trpc.labelset.findById.query(id);
  } else {
    labelset.value = {
      id: undefined,
      editor_id: undefined,
      name: "",
      desc: "",
      labels: [],
    };
  }
  labelsetStage.value = 'labelset';
}

const refreshLabelsets = async () => {
  labelsetStage.value = 'overview';
  labelsets = await $trpc.labelset.find.useQuery({});
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
  if (!new_task.ann_guidelines) {
    $toast.error("Task guidelines are required");
    return;
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
      return;
    }
  };

  uploadHasStarted.value = false;
  showCreateTaskModal.value = false;

  try {
    // creating labelset
    import_progress.value.message = "Creating Labelset";
    let new_labelset_id = labelsets.data.value![0]?.id ?? 0;
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
      annotation_level: import_json.value.annotation_level ?? 'word'
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
              seq_pos: ass.order,
              status: "pending",
              annotator_number: ass.annotator,
            };

            if (ann_id) {
              new_ass.annotator_id = ann_id;
            }

            new_assignments.push(new_ass);
          });
        });

        const assignments = await $trpc.assignment.createMany.mutate(new_assignments);

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
                });
              });
              ass_index++;
            });
          });

          const annotations = await $trpc.annotation.createMany.mutate(new_annotations);

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

onMounted(() => {
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
