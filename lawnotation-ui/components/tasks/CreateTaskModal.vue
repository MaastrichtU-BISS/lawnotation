<template>
  <Dialog
    :visible="visible"
    @update:visible="emit('update:visible', $event)"
    modal
    header="Create task"
    :autoZIndex="false"
    :draggable="false"
    :pt="{
      root: '!w-[80vw] xl:!w-[50vw]',
      header: {
        style: 'padding-bottom: 0px',
      },
      content: {
        style: 'padding-bottom: 0px',
      },
    }"
    :ptOptions="{ mergeProps: true }"
  >
    <Tabs v-model:value="activeTabTaskModal" class="min-h-[565px]">
      <TabList>
        <Tab :value="0" :pt="{ root: { 'data-test': 'new-tab' } }">New</Tab>
        <Tab :value="1">Import</Tab>
        <Tab :value="2" :disabled="!hasDocuments">Labelset</Tab>
      </TabList>
      <TabPanels>
      <TabPanel :value="0">
        <div class="flex justify-center mb-4">
          <span class="relative w-full">
            <InputText v-model="newTask.name" data-test="task-name" id="task_name" autocomplete="off"
              class="peer w-full" placeholder="" />
            <label for="task_name"
              class="absolute text-sm text-primary-500 dark:text-primary-400/60 duration-300 transform -translate-y-4 scale-75 top-3 z-10 origin-[0] start-2.5 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-4">Name</label>
          </span>
        </div>
        <Textarea v-model="newTask.desc" data-test="task-description" autoResize rows="3" cols="30"
          placeholder="Description" class="w-full mb-4" />
        <div class="flex justify-center mb-4">
          <span class="relative w-full">
            <InputText v-model="newTask.ann_guidelines" data-test="annotation-guidelines"
              id="annotation_guidelines" autocomplete="off" class="peer w-full" placeholder="" />
            <label for="annotation_guidelines"
              class="absolute text-sm text-primary-500 dark:text-primary-400/60 duration-300 transform -translate-y-4 scale-75 top-3 z-10 origin-[0] start-2.5 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-4">Guidelines
              url</label>
          </span>
        </div>
        <div class="flex items-center pb-4">
          <Select v-model="newTask.labelset_id" :options="labelsets" filter optionLabel="name"
            option-value="id" placeholder="Select Labelset" class="w-full md:w-1/2"
            data-test="select-labelset" @update:model-value="handleLabelsetSelection($event)" />
          <Button label="Create new labelset" size="small" @click="activeTabTaskModal = 2" link
            data-test="create-new-labelset" />
        </div>
        <div class="flex items-center flex-col pb-4">
          <div class="w-full text-left bg-yellow-50 p-2 mb-2 rounded-md border border-yellow-200">
            <p class="text-xs text-yellow-500 m-0">
              This feature is currently disabled, we are working on
              making it better
            </p>
          </div>
          <Select data-test="select-mlModel" v-model="newTask.ml_model_id" :options="models" filter
            disabled optionLabel="name" option-value="id" placeholder="Select Model (Optional)"
            class="w-full" @update:model-value="modelSelected($event)" :show-clear="true" />
        </div>
        <div class="mb-4 flex justify-between items-center">
          <div>
            <p class="font-bold mb-4">Annotation level</p>
            <SelectButton :options="['text', AnnotationLevels.DOCUMENT]" v-model="selectedAnnotationLevel"
              @update:model-value="annotationLevelSelected($event)" class="capitalize font-normal"
              aria-labelledby="basic" data-test="select-annotation-level" :pt="{
                label: {
                  class: 'font-normal',
                },
              }" />
          </div>
          <div v-if="selectedAnnotationLevel == 'text'">
            <p class="font-bold mb-4">Granularity</p>
            <SelectButton v-model="newTask.annotation_level" :options="Object.values(AnnotationLevels).filter(
              (level) => level != AnnotationLevels.DOCUMENT,
            )" @update:model-value="annotationLevelSelected($event)" class="capitalize font-normal"
              aria-labelledby="basic" data-test="select-annotation-level-2" :pt="{
                label: {
                  class: 'font-normal',
                },
              }" />
          </div>
        </div>
        <div class="flex justify-center mt-10">
          <Button class="mr-6" label="Cancel" size="small" icon="pi pi-times" iconPos="right" outlined
            @click="emit('update:visible', false)" />
          <Button data-test="create-tasks" label="Create" size="small" icon="pi pi-check" iconPos="right"
            @click="createTask" />
        </div>
      </TabPanel>
      <TabPanel :value="1">
        <div v-if="!uploadHasStarted" class="pt-6">
          <FileUpload customUpload @uploader="loadExportTaskFile($event)" :multiple="false" accept=".json"
            chooseLabel="Select" :pt="{
              chooseButton: {
                'data-test': 'choose-task',
              },
              uploadbutton: {
                root: {
                  'data-test': 'upload-task',
                },
              },
              fileThumbnail: {
                class: 'hidden',
              },
            }">
            <template #empty>
              <div class="flex items-center justify-center flex-col">
                <i
                  class="pi pi-cloud-upload border-2 rounded-full p-5 text-8xl text-surface-400 dark:text-surface-600 border-surface-400 dark:border-surface-600" />
                <p class="mt-4 mb-0">
                  Drag and drop files to here to upload.
                </p>
                <p class="text-gray-400 text-xs">
                  .json files exported from Lawnotation
                </p>
              </div>
            </template>
          </FileUpload>
        </div>
        <div v-else>
          <div class="text-center">
            <div class="mb-6">
              <h4 class="mb-2 font-semibold text-gray-900 dark:text-white">
                Select the status of the new assignments
              </h4>
              <SelectButton v-model="selectedUploadedAssignmentsStatus"
                :options="optionsUploadedAssignmentsStatus" optionLabel="label" optionValue="value"
                dataKey="value" optionDisabled="disabled" :pt="{
                  label: '!text-sm !font-semibold',
                  button: ['!px-3', '!py-2'],
                }" :ptOptions="{ mergeProps: true }">
              </SelectButton>
            </div>
            <h4 class="mb-2 font-semibold text-gray-900 dark:text-white">
              The uploaded Task has
              {{ newAnnotators.length }} annotators.
            </h4>
            <p class="mb-4">Please, provide the new ones:</p>
          </div>
          <div v-for="(new_ann, index) in newAnnotators" class="flex justify-center mb-4">
            <span class="relative w-full">
              <InputText v-model="newAnnotators[index]" autocomplete="off" class="peer w-full"
                placeholder="" :id="`annotator_${index}`" />
              <label :for="`annotator_${index}`"
                class="absolute text-sm text-primary-500 dark:text-primary-400/60 duration-300 transform -translate-y-4 scale-75 top-3 z-10 origin-[0] start-2.5 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-4">{{
                  `annotator ${index + 1} ` }}</label>
              <div v-if="index == 0" class="text-right">
                <Button label="Add myself" :disabled="isMyselfAdded" link @click="addMyself" :pt="{
                  root: {
                    class:
                      'p-0 text-xs text-primary-600 disabled:text-gray-400 underline cursor-pointer disabled:no-underline disabled:pointer-events-none',
                  },
                }" />
              </div>
            </span>
          </div>
          <div class="flex justify-center mt-4 pt-4">
            <Button class="mr-6" label="Cancel" size="small" icon="pi pi-times" iconPos="right" outlined
              @click="emit('update:visible', false)" />
            <Button label="Create" size="small" icon="pi pi-check" iconPos="right" @click="submitImport" />
          </div>
        </div>
      </TabPanel>
      <TabPanel :value="2">
        <Labelset v-model="labelset" @labelset-persisted="refreshLabelsets" />
      </TabPanel>
      </TabPanels>
    </Tabs>
  </Dialog>
</template>

<script setup lang="ts">
import type { Task, Labelset as LabelsetType, MlModel } from "~/types";
import Labelset from "~/components/labels/Labelset.vue";
import { AnnotationLevels, AssignmentStatuses } from "~/utils/enums";
import type { TaskImportPayload } from "~/composables/useTaskImport";
import Select from "primevue/select";
import SelectButton from "primevue/selectbutton";
import Tabs from "primevue/tabs";
import TabList from "primevue/tablist";
import Tab from "primevue/tab";
import TabPanels from "primevue/tabpanels";
import TabPanel from "primevue/tabpanel";

type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>;

const props = defineProps<{
  visible: boolean;
  projectId: number;
  hasDocuments: boolean;
  initialTab?: number;
}>();

const emit = defineEmits<{
  "update:visible": [value: boolean];
  "task-created": [];
  "import-task": [payload: TaskImportPayload];
}>();

const { $toast, $trpc } = useNuxtApp();
const user = useSupabaseUser();

const models = ref<MlModel[]>(await $trpc.mlModel.findAll.query());
const labelsets = ref(await $trpc.labelset.find.query({}));

const activeTabTaskModal = ref<number>(0);
const uploadHasStarted = ref<boolean>(false);
const selectedUploadedAssignmentsStatus = ref(AssignmentStatuses.NONE);
const optionsUploadedAssignmentsStatus = ref([
  { label: "Done", value: AssignmentStatuses.DONE, color: "#10b981", disabled: false },
  { label: "Pending", value: AssignmentStatuses.PENDING, color: "#ef4444", disabled: false },
  { label: "Keep originals", value: AssignmentStatuses.NONE, color: "#475569", disabled: false },
]);

const selectedAnnotationLevel = ref<"text" | AnnotationLevels.DOCUMENT>();

const labelset = ref<Optional<LabelsetType, "id" | "editor_id">>({
  id: undefined,
  editor_id: user.value?.id,
  name: "",
  desc: "",
  labels: [],
});

const importJson = ref<any>(null);
const newAnnotators = ref<string[]>([]);

const newTask = reactive<Optional<Task, "id" | "labelset_id" | "project_id" | "annotation_level">>({
  name: "",
  desc: "",
  ann_guidelines: "",
  labelset_id: undefined,
  project_id: undefined,
  annotation_level: undefined,
  ml_model_id: undefined,
});

onMounted(() => {
  newTask.project_id = props.projectId;
});

watch(
  () => props.visible,
  (isVisible) => {
    if (isVisible) {
      activeTabTaskModal.value = props.initialTab ?? 0;
      if (!props.hasDocuments) activeTabTaskModal.value = 1;
    } else {
      resetModal();
    }
  },
);

const isMyselfAdded = computed(() => newAnnotators.value.includes(user.value?.email!));

const addMyself = () => {
  if (!isMyselfAdded.value) {
    newAnnotators.value[0] = user.value?.email!;
  } else {
    $toast.error("You have been already added!");
  }
};

const modelSelected = async (id: number) => {
  const labelToRemoveIndex = labelsets.value.findIndex((l) => !l.editor_id);
  const labelToRemove = labelToRemoveIndex > -1 ? labelsets.value[labelToRemoveIndex] : undefined;
  if (labelToRemoveIndex > 0 && labelToRemove && newTask.labelset_id == labelToRemove.id) {
    newTask.labelset_id = undefined;
    labelsets.value.splice(labelToRemoveIndex, 1);
  }

  const model = models.value.find((m) => m.id == id);

  if (newTask.annotation_level != model?.annotation_level) {
    selectedAnnotationLevel.value =
      model?.annotation_level == AnnotationLevels.DOCUMENT ? AnnotationLevels.DOCUMENT : "text";
    newTask.annotation_level = model?.annotation_level;
  }

  if (model?.labelset_id) {
    const modelLabelset = await $trpc.labelset.findById.query(model.labelset_id);
    labelsets.value.push(modelLabelset);
    newTask.labelset_id = modelLabelset.id;
  }
};

const handleLabelsetSelection = (id: number | undefined) => {
  newTask.labelset_id = id;
  if (newTask.ml_model_id) {
    $trpc.mlModel.findById.query(newTask.ml_model_id).then((model) => {
      if (model.labelset_id) {
        newTask.ml_model_id = undefined;
        labelsets.value = labelsets.value.filter((l) => l.editor_id);
      }
    });
  }
};

const annotationLevelSelected = async (value: "text" | AnnotationLevels) => {
  newTask.annotation_level = value === "text" ? AnnotationLevels.SYMBOL : value;
  if (newTask.ml_model_id) {
    const model = await $trpc.mlModel.findById.query(newTask.ml_model_id);
    if (model.annotation_level != value) {
      newTask.ml_model_id = undefined;
      labelsets.value = labelsets.value.filter((l) => l.editor_id);
    }
    if (model.labelset_id) {
      newTask.labelset_id = undefined;
    }
  }
};

const refreshLabelsets = async () => {
  activeTabTaskModal.value = 0;
  labelsets.value = await $trpc.labelset.find.query({});
  if (labelset.value.id) {
    const createdLabelset = labelsets.value.find((l) => l.id === labelset.value.id);
    if (createdLabelset) newTask.labelset_id = createdLabelset.id;
  }
};

const createTask = async () => {
  if (!newTask.project_id) { $toast.error("Task must be part of project"); return; }
  if (!newTask.name) { $toast.error("Task name is required"); return; }
  if (!newTask.desc) { $toast.error("Task description is required"); return; }
  if (newTask.ann_guidelines) {
    try { new URL(newTask.ann_guidelines); } catch { $toast.error("Invalid Guidelines url"); return; }
  }
  if (!newTask.labelset_id || newTask.labelset_id === 0) { $toast.error("Task must have a valid labelset"); return; }
  if (!newTask.annotation_level) { $toast.error("Task must have an annotation level"); return; }
  if (!Object.values(AnnotationLevels).includes(newTask.annotation_level)) {
    $toast.error("Task must have an annotation granularity");
    return;
  }

  try {
    await $trpc.task.create.mutate(newTask as Omit<Task, "id">);
    emit("task-created");
    $toast.success("Task created");
  } catch (error) {
    trpcErrorHandler(error as Error, "creating task");
  } finally {
    emit("update:visible", false);
  }
};

const resetModal = () => {
  uploadHasStarted.value = false;
  newAnnotators.value.splice(0);
  activeTabTaskModal.value = 0;
  newTask.name = "";
  newTask.desc = "";
  newTask.ann_guidelines = "";
  newTask.labelset_id = undefined;
  selectedAnnotationLevel.value = undefined;
  newTask.annotation_level = undefined;
  newTask.ml_model_id = undefined;
};

const loadExportTaskFile = async (event: { files: File | File[] | FileList }) => {
  const files = Array.isArray(event.files)
    ? event.files
    : event.files instanceof FileList
      ? Array.from(event.files)
      : [event.files];
  const file = files[0];
  if (!file) {
    return;
  }

  importJson.value = JSON.parse(await file.text());

  if (importJson.value.counts?.assignments) {
    if (!importJson.value.documents[0]?.assignments[0]?.status) {
      // assumes all documents present have at least 1 assignment associated to it
      if (optionsUploadedAssignmentsStatus.value[2]) {
        optionsUploadedAssignmentsStatus.value[2].disabled = true;
      }
      selectedUploadedAssignmentsStatus.value = AssignmentStatuses.DONE;
    } else {
      if (optionsUploadedAssignmentsStatus.value[2]) {
        optionsUploadedAssignmentsStatus.value[2].disabled = false;
      }
      selectedUploadedAssignmentsStatus.value = AssignmentStatuses.NONE;
    }
  }

  if (importJson.value.counts?.annotators) {
    const count = importJson.value.counts.annotators ?? 0;
    newAnnotators.value.splice(0);
    for (let i = 0; i < count; i++) newAnnotators.value.push("");
    uploadHasStarted.value = true;
  } else {
    submitImport();
  }
};

const submitImport = () => {
  for (const email of newAnnotators.value) {
    if (email.length && !/^\S+@(\S+\.\S+|localhost)$/.test(email)) {
      $toast.error(`Invalid email: ${email}`);
      return;
    }
  }

  emit("import-task", {
    json: importJson.value,
    annotators: [...newAnnotators.value],
    assignmentStatus: selectedUploadedAssignmentsStatus.value,
    defaultLabelsetId: labelsets.value[0]?.id ?? 0,
  });
  emit("update:visible", false);
};
</script>
