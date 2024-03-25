<template>
  <div id="exportFormModal" tabindex="-1" aria-hidden="true"
    class="fixed top-0 left-0 right-0 z-50 hidden w-full p-4 overflow-x-hidden overflow-y-auto md:inset-0 h-[calc(100%-1rem)] max-h-full">
    <div class="relative w-full max-w-2xl max-h-full">
      <!-- Modal content -->
      <div class="relative bg-white rounded-lg shadow dark:bg-gray-700">
        <!-- Modal header -->
        <div class="flex items-start justify-between p-4 border-b rounded-t dark:border-gray-600">
          <h3 class="text-xl font-semibold text-gray-900 dark:text-white">
            Export Options
          </h3>
          <button type="button" id="exportFormModalClick"
            class="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 ml-auto inline-flex justify-center items-center dark:hover:bg-gray-600 dark:hover:text-white"
            @click="emitClose" data-test="close-modal-button">
            <svg class="w-3 h-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
              <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6" />
            </svg>
            <span class="sr-only">Close modal</span>
          </button>
        </div>
        <!-- Modal body -->
        <div class="p-6 space-y-6">
          <div class="items-center justify-center">
            <div v-if="page == 1" id="export-step-1">
              <h3 class="mb-4 font-semibold text-gray-900 dark:text-white">
                Select what you want to include in the exported file.
              </h3>
              <ul
                class="my-5 items-center w-full text-sm font-medium text-gray-900 bg-white border border-gray-200 rounded-lg sm:flex dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                <li class="w-full border-b border-gray-200 sm:border-b-0 sm:border-r dark:border-gray-600">
                  <div class="flex items-center pl-3">
                    <Checkbox
                      v-model="modelValue.export_options.name"
                      inputId="name-checkbox"
                      :binary="true"
                    />
                    <label for="name-checkbox"
                      class="w-full py-3 ml-2 text-sm font-medium text-gray-900 dark:text-gray-300">Name</label>
                  </div>
                </li>
                <li class="w-full border-b border-gray-200 sm:border-b-0 sm:border-r">
                  <div class="flex items-center pl-3">
                    <Checkbox
                      v-model="modelValue.export_options.desc"
                      inputId="desc-checkbox"
                      :binary="true"
                    />
                    <label for="desc-checkbox"
                      class="w-full py-3 ml-2 text-sm font-medium text-gray-900">Description</label>
                  </div>
                </li>
                <li class="w-full border-b border-gray-200 sm:border-b-0 sm:border-r">
                  <div class="flex items-center pl-3">
                    <Checkbox
                      v-model="modelValue.export_options.ann_guidelines"
                      @change="checkGuidelines"
                      inputId="ann_guidelines-checkbox"
                      :binary="true"
                    />
                    <label for="ann_guidelines-checkbox"
                      class="w-full py-3 ml-2 text-sm font-medium text-gray-900">Guidelines</label>
                  </div>
                </li>
                <li class="w-full dark:border-gray-600">
                  <div class="flex items-center pl-3">
                    <Checkbox
                      v-model="modelValue.export_options.labelset"
                      @change="checkLabels" 
                      inputId="labelset-checkbox"
                      :binary="true"
                    />
                    <label for="labelset-checkbox"
                      class="w-full py-3 ml-2 text-sm font-medium text-gray-900 dark:text-gray-300">Labels</label>
                  </div>
                </li>
              </ul>
              <ul
                class="my-5 items-center w-full text-sm font-medium text-gray-900 bg-white border border-gray-200 rounded-lg sm:flex dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                <li class="w-full border-b border-gray-200 sm:border-b-0 sm:border-r dark:border-gray-600">
                  <div class="flex items-center pl-3">
                    <Checkbox
                      v-model="modelValue.export_options.documents"
                      @change="checkDocuments" 
                      inputId="documments-checkbox"
                      :binary="true"
                    />
                    <label for="documments-checkbox"
                      class="w-full py-3 ml-2 text-sm font-medium text-gray-900 dark:text-gray-300">Documents</label>
                  </div>
                </li>
                <li class="w-full border-b border-gray-200 sm:border-b-0 sm:border-r">
                  <div class="flex items-center pl-3">
                    <Checkbox
                      v-model="modelValue.export_options.annotations"
                      @change="checkAnnotations"
                      inputId="annotations-checkbox"
                      :binary="true"
                    />
                    <label for="annotations-checkbox"
                      class="w-full py-3 ml-2 text-sm font-medium text-gray-900">Annotations</label>
                  </div>
                </li>
              </ul>
              <p class="text-xs font-normal text-gray-500 dark:text-gray-300">
                Annotations will be exported without the annotator email
              </p>
              <div class="flex justify-between my-5">
                <Button
                  type="button"
                  @click="export_task"
                  :label="modelValue.export_options.loading ? 'Downloading...' : 'Export'"
                  icon="pi pi-download"
                  iconPos="right"
                  :disabled="
                    !(
                      modelValue.export_options.name ||
                      modelValue.export_options.desc ||
                      modelValue.export_options.ann_guidelines ||
                      modelValue.export_options.labelset ||
                      modelValue.export_options.documents ||
                      modelValue.export_options.annotations
                    )
                  "
                  :outlined="modelValue.export_options.loaded"
                  data-test="export-button"
                />
                <Button
                  type="button"
                  @click="page++"
                  label="Start publishing"
                  icon="pi pi-arrow-right"
                  iconPos="right"
                  :disabled="!modelValue.export_options.loaded"
                  data-test="start-publishing-button"
                />
              </div>
            </div>
            <div v-if="page == 2" id="export-step-2">
              <h3 class="mb-4 font-semibold text-gray-900 dark:text-white">
                Include metadata to make your results be discoverable within the platform.
              </h3>
              <div class="relative z-0 w-full mb-5 group">
                <input v-model="modelValue.publication.file_url" type="url" name="file_url" id="file_url"
                  class="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none dark:text-white dark:border-gray-600 dark:focus:border-blue-500 focus:outline-none focus:ring-0 focus:border-blue-600 peer"
                  placeholder=" " required />
                <label for="file_url"
                  class="peer-focus:font-medium absolute text-sm text-gray-500 dark:text-gray-400 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:start-0 rtl:peer-focus:translate-x-1/4 rtl:peer-focus:left-auto peer-focus:text-blue-600 peer-focus:dark:text-blue-500 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">
                  File url</label>
              </div>
              <div class="relative z-0 w-full mb-5 group">
                <input v-model="modelValue.publication.guidelines_url" type="url" name="guidelines_url" id="guidelines_url"
                  class="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none dark:text-white dark:border-gray-600 dark:focus:border-blue-500 focus:outline-none focus:ring-0 focus:border-blue-600 peer"
                  placeholder=" " />
                <label for="guidelines_url"
                  class="peer-focus:font-medium absolute text-sm text-gray-500 dark:text-gray-400 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:start-0 rtl:peer-focus:translate-x-1/4 rtl:peer-focus:left-auto peer-focus:text-blue-600 peer-focus:dark:text-blue-500 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">
                  Guidelines url</label>
              </div>
              <div class="relative z-0 w-full mb-5 group">
                <input v-model="modelValue.publication.task_name" type="text" name="task_name" id="task_name"
                  class="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none dark:text-white dark:border-gray-600 dark:focus:border-blue-500 focus:outline-none focus:ring-0 focus:border-blue-600 peer"
                  placeholder=" " required />
                <label for="task_name"
                  class="peer-focus:font-medium absolute text-sm text-gray-500 dark:text-gray-400 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:start-0 rtl:peer-focus:translate-x-1/4 peer-focus:text-blue-600 peer-focus:dark:text-blue-500 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">Task
                  name</label>
              </div>
              <div class="relative z-0 w-full mb-5 group">
                <input v-model="modelValue.publication.task_description" type="text" name="task_description"
                  id="task_description"
                  class="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none dark:text-white dark:border-gray-600 dark:focus:border-blue-500 focus:outline-none focus:ring-0 focus:border-blue-600 peer"
                  placeholder=" " required />
                <label for="task_description"
                  class="peer-focus:font-medium absolute text-sm text-gray-500 dark:text-gray-400 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:start-0 rtl:peer-focus:translate-x-1/4 peer-focus:text-blue-600 peer-focus:dark:text-blue-500 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">Task
                  description</label>
              </div>
              <div class="relative z-0 w-full mb-5 group">
                <input v-model="modelValue.publication.labels_name" type="text" name="labels_name" id="labels_name"
                  class="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none dark:text-white dark:border-gray-600 dark:focus:border-blue-500 focus:outline-none focus:ring-0 focus:border-blue-600 peer"
                  placeholder=" " required />
                <label for="labels_name"
                  class="peer-focus:font-medium absolute text-sm text-gray-500 dark:text-gray-400 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:start-0 rtl:peer-focus:translate-x-1/4 peer-focus:text-blue-600 peer-focus:dark:text-blue-500 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">
                  Labels name</label>
              </div>
              <div class="relative z-0 w-full mb-5 group">
                <input v-model="modelValue.publication.labels_description" type="text" name="labels_description"
                  id="labels_description"
                  class="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none dark:text-white dark:border-gray-600 dark:focus:border-blue-500 focus:outline-none focus:ring-0 focus:border-blue-600 peer"
                  placeholder=" " required />
                <label for="labels_description"
                  class="peer-focus:font-medium absolute text-sm text-gray-500 dark:text-gray-400 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:start-0 rtl:peer-focus:translate-x-1/4 peer-focus:text-blue-600 peer-focus:dark:text-blue-500 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">Labels
                  description</label>
              </div>
              <div class="grid md:grid-cols-2 md:gap-6">
                <div class="relative z-0 w-full mb-5 group">
                  <input v-model="modelValue.publication.author" type="text" name="author" id="author"
                    class="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none dark:text-white dark:border-gray-600 dark:focus:border-blue-500 focus:outline-none focus:ring-0 focus:border-blue-600 peer"
                    placeholder=" " />
                  <label for="author"
                    class="peer-focus:font-medium absolute text-sm text-gray-500 dark:text-gray-400 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:start-0 rtl:peer-focus:translate-x-1/4 peer-focus:text-blue-600 peer-focus:dark:text-blue-500 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">
                    Author</label>
                </div>
                <div class="relative z-0 w-full mb-5 group">
                  <input v-model="modelValue.publication.contact" type="email" name="contact" id="contact"
                    class="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none dark:text-white dark:border-gray-600 dark:focus:border-blue-500 focus:outline-none focus:ring-0 focus:border-blue-600 peer"
                    placeholder=" " />
                  <label for="contact"
                    class="peer-focus:font-medium absolute text-sm text-gray-500 dark:text-gray-400 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:start-0 rtl:peer-focus:translate-x-1/4 peer-focus:text-blue-600 peer-focus:dark:text-blue-500 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">
                    Contact</label>
                </div>
              </div>
              <div class="flex justify-between my-5">
                <Button
                  type="button"
                  @click="goBack"
                  label="Back"
                  icon="pi pi-arrow-left"
                  outlined
                />
                <Button
                  type="button"
                  @click="publish"
                  label="Publish"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import type { ExportTaskOptions } from "~/utils/io";
import type { Publication } from "~/types"
const { modelValue } = defineProps<{
  modelValue: {
    export_options: ExportTaskOptions;
    publication: Omit<Publication, "id">
  }
}>();

const { $toast, $trpc } = useNuxtApp();

const page = ref<number>(1);

const emit = defineEmits(["export", "close", "resetForm"]);

const checkLabels = () => {
  if (!modelValue.export_options.labelset) {
    modelValue.export_options.ann_guidelines = false;
    modelValue.export_options.annotations = false;
  }
};

const checkDocuments = () => {
  if (!modelValue.export_options.documents) {
    modelValue.export_options.annotations = false;
  }
};

const checkGuidelines = () => {
  if (modelValue.export_options.ann_guidelines) {
    modelValue.export_options.labelset = true
  }
}

const checkAnnotations = () => {
  if (modelValue.export_options.annotations) {
    modelValue.export_options.labelset = true;
    modelValue.export_options.documents = true;
  }
}

const goBack = () => {
  emit("resetForm")
  page.value = 1;
}

const emitClose = () => {
  goBack();
  emit("close");
};

const export_task = () => {
  if(!modelValue.export_options.loading) {
    emit("export");
  }
};

const publish = async () => {

  if (!modelValue.publication.file_url) {
    $toast.error("File url is required");
    return;
  }

  try {
    const url = new URL(modelValue.publication.file_url);
  } catch (_) {
    $toast.error("Invalid File url");
    return;
  }

  if (modelValue.export_options.ann_guidelines) {

    if (!modelValue.publication.guidelines_url) {
      $toast.error("Guidelines url is required");
      return;
    }

    try {
      const url = new URL(modelValue.publication.guidelines_url);
    } catch (_) {
      $toast.error("Invalid Guidelines url");
      return;
    }
  }



  if (!modelValue.publication.author) {
    $toast.error("Author is required");
    return;
  }

  await $trpc.publication.create.mutate(modelValue.publication);
  document.getElementById("exportFormModalClick")?.click();
  $toast.success("Task successfully published");
};
</script>
