<template>
  <Dialog
    v-model:visible="exportModalVisible"
    modal
    :draggable="false"
    :pt="{
      root: '!w-[80vw] xl:!w-[50vw]',
      header: '!items-start gap-3',
    }"
    :ptOptions="{ mergeProps: true }"
  >
    <template #header>
      <Stepper
        v-model:activeStep="active"
        linear
        :pt="{ panelContainer: '' }"
        :ptOptions="{ mergeProps: false }"
      >
        <StepperPanel header="Exporting your task" />
        <StepperPanel header="Instructions" />
        <StepperPanel header="Publishing your task" />
      </Stepper>
    </template>
    <div class="items-center justify-center">
      <div v-if="active === 0" id="export-step-1">
        <h3 class="mb-4 font-semibold text-gray-900 dark:text-white">
          Select what you want to include in your export:
        </h3>
        <ul
          class="my-5 items-center w-full text-sm font-medium text-gray-900 bg-white border border-gray-200 rounded-lg sm:flex dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        >
          <li class="w-full border-b border-gray-200 sm:border-b-0 sm:border-r">
            <div class="flex items-center pl-3">
              <Checkbox
                v-model="formValues.export_options.ann_guidelines"
                @change="checkGuidelines"
                inputId="ann_guidelines-checkbox"
                :binary="true"
                disabled
                title="Your annotation guidelines will always be included for export"
                :pt="{
                  input: {
                    'data-test': 'ann_guidelines-checkbox',
                  },
                }"
              />
              <label
                for="ann_guidelines-checkbox"
                class="w-full py-3 ml-2 text-sm font-medium text-gray-900"
                >Guidelines</label
              >
            </div>
          </li>
          <li class="w-full border-b border-gray-200 sm:border-b-0 sm:border-r">
            <div class="flex items-center pl-3">
              <Checkbox
                v-model="formValues.export_options.labelset"
                @change="checkLabels"
                inputId="labelset-checkbox"
                :binary="true"
                disabled
                title="Your labels will always be included for export"
                :pt="{
                  input: {
                    'data-test': 'labelset-checkbox',
                  },
                }"
              />
              <label
                for="labelset-checkbox"
                class="w-full py-3 ml-2 text-sm font-medium text-gray-900"
                >Labels</label
              >
            </div>
          </li>
          <li class="w-full border-b border-gray-200 sm:border-b-0 sm:border-r">
            <div class="flex items-center pl-3">
              <Checkbox
                v-model="formValues.export_options.documents"
                @change="checkDocuments"
                inputId="documents-checkbox"
                :binary="true"
                :pt="{
                  input: {
                    'data-test': 'documents-checkbox',
                  },
                }"
              />
              <label
                for="documents-checkbox"
                class="w-full py-3 ml-2 text-sm font-medium text-gray-900 dark:text-gray-300"
                >Documents</label
              >
            </div>
          </li>
          <li class="w-full border-b border-gray-200 sm:border-b-0 sm:border-r">
            <div class="flex items-center pl-3">
              <Checkbox
                v-model="formValues.export_options.annotations"
                @change="checkAnnotations"
                inputId="annotations-checkbox"
                :binary="true"
                :pt="{
                  input: {
                    'data-test': 'annotations-checkbox',
                  },
                }"
              />
              <label
                for="annotations-checkbox"
                class="w-full py-3 ml-2 text-sm font-medium text-gray-900"
                >Annotations</label
              >
            </div>
          </li>
        </ul>
        <p class="text-xs font-normal text-gray-500 dark:text-gray-300">
          Don't worry, annotations will not include e-mail addresses from your annotators
          in the export file
        </p>
        <div class="flex justify-between my-5">
          <Button
            type="button"
            @click="export_task"
            :label="formValues.modalOperations.loading ? 'Downloading...' : 'Export'"
            icon="pi pi-download"
            iconPos="right"
            :disabled="
              !(
                formValues.export_options.name ||
                formValues.export_options.desc ||
                formValues.export_options.ann_guidelines ||
                formValues.export_options.labelset ||
                formValues.export_options.documents ||
                formValues.export_options.annotations
              )
            "
            :outlined="formValues.modalOperations.loaded"
            data-test="export-button"
          />
          <Button
            type="button"
            @click="active++"
            label="Start publishing"
            icon="pi pi-arrow-right"
            iconPos="right"
            :disabled="!formValues.modalOperations.loaded"
            :title="!formValues.modalOperations.loaded ? 'You first need to export your data' : ''"
            data-test="start-publishing-button"
          />
        </div>
      </div>
      <div v-else-if="active === 1">
        <h3 class="mb-0">Storing your data</h3>
        <p>
          Lawnotation does not store data for publishing, you will need to do this
          yourself. You can upload your data to storage made available by your institution
          (make sure your data is publicly accessible) or you can use a commercial option
          (think Dropbox or Google Drive).
        </p>
        <h3 class="mb-0">What do you need to upload?</h3>
        <ul class="list-disc ps-4">
          <li>
            The .json file you just downloaded in the previous step (Exporting your task)
          </li>
          <li>Your annotation guidelines (if you haven't already)</li>
          <li>(Optional) The documents you have used</li>
        </ul>
        <div class="flex justify-between my-5">
          <Button
            type="button"
            @click="active--"
            label="Back"
            icon="pi pi-arrow-left"
            outlined
            data-test="back-button"
          />
          <Button
            type="button"
            @click="active++"
            label="Continue publishing"
            icon="pi pi-arrow-right"
            iconPos="right"
            data-test="continue-button"
          />
        </div>
      </div>
      <form v-else-if="active === 2" id="export-step-2" @submit.prevent="publish">
        <h3 class="mb-4 font-semibold text-gray-900 dark:text-white">
          Include metadata to make your results be discoverable within the platform.
        </h3>
        <div class="relative z-0 w-full mb-5 group">
          <input
            v-model="formValues.publication.file_url"
            type="url"
            name="file_url"
            id="file_url"
            class="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none dark:text-white dark:border-gray-600 dark:focus:border-blue-500 focus:outline-none focus:ring-0 focus:border-blue-600 peer"
            placeholder=" "
            required
            data-test="file-url-input"
          />
          <label
            for="file_url"
            class="peer-focus:font-medium absolute text-sm text-gray-500 dark:text-gray-400 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:start-0 rtl:peer-focus:translate-x-1/4 rtl:peer-focus:left-auto peer-focus:text-blue-600 peer-focus:dark:text-blue-500 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6"
          >
            External file url</label
          >
        </div>
        <div class="relative z-0 w-full mb-5 group">
          <input
            v-model="formValues.publication.guidelines_url"
            type="url"
            name="guidelines_url"
            id="guidelines_url"
            class="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none dark:text-white dark:border-gray-600 dark:focus:border-blue-500 focus:outline-none focus:ring-0 focus:border-blue-600 peer"
            placeholder=" "
          />
          <label
            for="guidelines_url"
            class="peer-focus:font-medium absolute text-sm text-gray-500 dark:text-gray-400 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:start-0 rtl:peer-focus:translate-x-1/4 rtl:peer-focus:left-auto peer-focus:text-blue-600 peer-focus:dark:text-blue-500 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6"
          >
            Guidelines url</label
          >
        </div>
        <div class="relative z-0 w-full mb-5 group">
          <input
            v-model="formValues.publication.task_name"
            type="text"
            name="task_name"
            id="task_name"
            class="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none dark:text-white dark:border-gray-600 dark:focus:border-blue-500 focus:outline-none focus:ring-0 focus:border-blue-600 peer"
            placeholder=" "
            required
          />
          <label
            for="task_name"
            class="peer-focus:font-medium absolute text-sm text-gray-500 dark:text-gray-400 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:start-0 rtl:peer-focus:translate-x-1/4 peer-focus:text-blue-600 peer-focus:dark:text-blue-500 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6"
            >Task name</label
          >
        </div>
        <div class="relative z-0 w-full mb-5 group">
          <input
            v-model="formValues.publication.task_description"
            type="text"
            name="task_description"
            id="task_description"
            class="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none dark:text-white dark:border-gray-600 dark:focus:border-blue-500 focus:outline-none focus:ring-0 focus:border-blue-600 peer"
            placeholder=" "
            required
          />
          <label
            for="task_description"
            class="peer-focus:font-medium absolute text-sm text-gray-500 dark:text-gray-400 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:start-0 rtl:peer-focus:translate-x-1/4 peer-focus:text-blue-600 peer-focus:dark:text-blue-500 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6"
            >Task description</label
          >
        </div>
        <div class="relative z-0 w-full mb-5 group">
          <input
            v-model="formValues.publication.labels_name"
            type="text"
            name="labels_name"
            id="labels_name"
            class="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none dark:text-white dark:border-gray-600 dark:focus:border-blue-500 focus:outline-none focus:ring-0 focus:border-blue-600 peer"
            placeholder=" "
            required
          />
          <label
            for="labels_name"
            class="peer-focus:font-medium absolute text-sm text-gray-500 dark:text-gray-400 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:start-0 rtl:peer-focus:translate-x-1/4 peer-focus:text-blue-600 peer-focus:dark:text-blue-500 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6"
          >
            Labels name</label
          >
        </div>
        <div class="relative z-0 w-full mb-5 group">
          <input
            v-model="formValues.publication.labels_description"
            type="text"
            name="labels_description"
            id="labels_description"
            class="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none dark:text-white dark:border-gray-600 dark:focus:border-blue-500 focus:outline-none focus:ring-0 focus:border-blue-600 peer"
            placeholder=" "
            required
          />
          <label
            for="labels_description"
            class="peer-focus:font-medium absolute text-sm text-gray-500 dark:text-gray-400 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:start-0 rtl:peer-focus:translate-x-1/4 peer-focus:text-blue-600 peer-focus:dark:text-blue-500 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6"
            >Labels description</label
          >
        </div>
        <div class="grid md:grid-cols-2 md:gap-6">
          <div class="relative z-0 w-full mb-5 group">
            <input
              v-model="formValues.publication.author"
              type="text"
              name="author"
              id="author"
              class="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none dark:text-white dark:border-gray-600 dark:focus:border-blue-500 focus:outline-none focus:ring-0 focus:border-blue-600 peer"
              placeholder=" "
              required
              data-test="author-input"
            />
            <label
              for="author"
              class="peer-focus:font-medium absolute text-sm text-gray-500 dark:text-gray-400 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:start-0 rtl:peer-focus:translate-x-1/4 peer-focus:text-blue-600 peer-focus:dark:text-blue-500 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6"
            >
              Author</label
            >
          </div>
          <div class="relative z-0 w-full mb-5 group">
            <input
              v-model="formValues.publication.contact"
              type="email"
              name="contact"
              id="contact"
              class="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none dark:text-white dark:border-gray-600 dark:focus:border-blue-500 focus:outline-none focus:ring-0 focus:border-blue-600 peer"
              placeholder=" "
            />
            <label
              for="contact"
              class="peer-focus:font-medium absolute text-sm text-gray-500 dark:text-gray-400 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:start-0 rtl:peer-focus:translate-x-1/4 peer-focus:text-blue-600 peer-focus:dark:text-blue-500 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6"
            >
              Contact</label
            >
          </div>
        </div>
        <div class="flex justify-between my-5">
          <Button
            type="button"
            @click="active--"
            label="Back"
            icon="pi pi-arrow-left"
            outlined
            data-test="back-button"
          />
          <Button
            type="submit"
            label="Publish"
            :disabled="
              !formValues.publication.file_url ||
              !formValues.publication.guidelines_url ||
              !formValues.publication.task_name ||
              !formValues.publication.task_description ||
              !formValues.publication.labels_name ||
              !formValues.publication.labels_description ||
              !formValues.publication.author ||
              !formValues.publication.contact
            "
            data-test="publish-button"
          />
        </div>
      </form>
    </div>
  </Dialog>
</template>
<script setup lang="ts">
import type { ExportTaskOptions } from "~/utils/io";
import type { Publication } from "~/types";
const formValues = defineModel<{
  export_options: ExportTaskOptions;
  modalOperations: { loading: boolean; loaded: boolean };
  publication: Omit<Publication, "id">;
}>("formValues", { required: true });

const exportModalVisible = defineModel<boolean>("exportModalVisible", { required: true });

const { $toast, $trpc } = useNuxtApp();

const active = ref<number>(0);

const emit = defineEmits(["export", "close"]);

watch(formValues.value.export_options, () => {
  formValues.value.modalOperations.loaded = false;
});

const checkLabels = () => {
  if (!formValues.value.export_options.labelset) {
    formValues.value.export_options.ann_guidelines = false;
    formValues.value.export_options.annotations = false;
  }
};

const checkDocuments = () => {
  if (!formValues.value.export_options.documents) {
    formValues.value.export_options.annotations = false;
  }
};

const checkGuidelines = () => {
  if (formValues.value.export_options.ann_guidelines) {
    formValues.value.export_options.labelset = true;
  }
};

const checkAnnotations = () => {
  if (formValues.value.export_options.annotations) {
    formValues.value.export_options.labelset = true;
    formValues.value.export_options.documents = true;
  }
};

const emitClose = () => {
  emit("close");
};

const export_task = () => {
  if (!formValues.value.modalOperations.loading) {
    emit("export");
  }
};

const publish = async () => {
  if (!formValues.value.publication.file_url) {
    $toast.error("File url is required");
    return;
  }

  try {
    const url = new URL(formValues.value.publication.file_url);
  } catch (_) {
    $toast.error("Invalid File url");
    return;
  }

  if (formValues.value.export_options.ann_guidelines) {
    if (!formValues.value.publication.guidelines_url) {
      $toast.error("Guidelines url is required");
      return;
    }

    try {
      const url = new URL(formValues.value.publication.guidelines_url);
    } catch (_) {
      $toast.error("Invalid Guidelines url");
      return;
    }
  }

  if (!formValues.value.publication.author) {
    $toast.error("Author is required");
    return;
  }

  await $trpc.publication.create.mutate(formValues.value.publication);
  document.getElementById("exportFormModalClick")?.click();
  $toast.success("Task successfully published");
};
</script>
