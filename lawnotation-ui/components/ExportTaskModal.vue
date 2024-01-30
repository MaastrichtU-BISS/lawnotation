<template>
  <div
    id="exportFormModal"
    tabindex="-1"
    aria-hidden="true"
    class="fixed top-0 left-0 right-0 z-50 hidden w-full p-4 overflow-x-hidden overflow-y-auto md:inset-0 h-[calc(100%-1rem)] max-h-full"
  >
    <div class="relative w-full max-w-2xl max-h-full">
      <!-- Modal content -->
      <div class="relative bg-white rounded-lg shadow dark:bg-gray-700">
        <!-- Modal header -->
        <div
          class="flex items-start justify-between p-4 border-b rounded-t dark:border-gray-600"
        >
          <h3 class="text-xl font-semibold text-gray-900 dark:text-white">
            Export Options
          </h3>
          <button
            type="button"
            id="exportFormModalClick"
            class="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 ml-auto inline-flex justify-center items-center dark:hover:bg-gray-600 dark:hover:text-white"
            @click="emitClose"
          >
            <svg
              class="w-3 h-3"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 14 14"
            >
              <path
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"
              />
            </svg>
            <span class="sr-only">Close modal</span>
          </button>
        </div>
        <!-- Modal body -->
        <div class="p-6 space-y-6">
          <div class="items-center justify-center">
            <h3 class="mb-4 font-semibold text-gray-900 dark:text-white">
              Select what you want to include in the exported file.
            </h3>
            <ul
              class="my-5 items-center w-full text-sm font-medium text-gray-900 bg-white border border-gray-200 rounded-lg sm:flex dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <li
                class="w-full border-b border-gray-200 sm:border-b-0 sm:border-r dark:border-gray-600"
              >
                <div class="flex items-center pl-3">
                  <input
                    id="name-checkbox"
                    type="checkbox"
                    v-model="modelValue.name"
                    class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-700 dark:focus:ring-offset-gray-700 focus:ring-2 dark:bg-gray-600 dark:border-gray-500"
                  />
                  <label
                    for="name-checkbox"
                    class="w-full py-3 ml-2 text-sm font-medium text-gray-900 dark:text-gray-300"
                    >Name</label
                  >
                </div>
              </li>
              <li class="w-full border-b border-gray-200 sm:border-b-0 sm:border-r">
                <div class="flex items-center pl-3">
                  <input
                    id="desc-checkbox"
                    type="checkbox"
                    v-model="modelValue.desc"
                    class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-700 dark:focus:ring-offset-gray-700 focus:ring-2 dark:bg-gray-600 dark:border-gray-500"
                  />
                  <label
                    for="desc-checkbox"
                    class="w-full py-3 ml-2 text-sm font-medium text-gray-900"
                    >Description</label
                  >
                </div>
              </li>
              <li class="w-full border-b border-gray-200 sm:border-b-0 sm:border-r">
                <div class="flex items-center pl-3">
                  <input
                    id="ann_guidelines-checkbox"
                    :disabled="!modelValue.labelset"
                    type="checkbox"
                    v-model="modelValue.ann_guidelines"
                    class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-700 dark:focus:ring-offset-gray-700 focus:ring-2 dark:bg-gray-600 dark:border-gray-500"
                  />
                  <label
                    for="ann_guidelines-checkbox"
                    class="w-full py-3 ml-2 text-sm font-medium text-gray-900"
                    >Guidelines</label
                  >
                </div>
              </li>
              <li class="w-full dark:border-gray-600">
                <div class="flex items-center pl-3">
                  <input
                    id="labelset-checkbox"
                    type="checkbox"
                    @click="click_labelset"
                    v-model="modelValue.labelset"
                    class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-700 dark:focus:ring-offset-gray-700 focus:ring-2 dark:bg-gray-600 dark:border-gray-500"
                  />
                  <label
                    for="labelset-checkbox"
                    class="w-full py-3 ml-2 text-sm font-medium text-gray-900 dark:text-gray-300"
                    >Labels</label
                  >
                </div>
              </li>
            </ul>
            <ul
              class="my-5 items-center w-full text-sm font-medium text-gray-900 bg-white border border-gray-200 rounded-lg sm:flex dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <li
                class="w-full border-b border-gray-200 sm:border-b-0 sm:border-r dark:border-gray-600"
              >
                <div class="flex items-center pl-3">
                  <input
                    id="documments-checkbox"
                    @click="click_documents"
                    type="checkbox"
                    v-model="modelValue.documents"
                    class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-700 dark:focus:ring-offset-gray-700 focus:ring-2 dark:bg-gray-600 dark:border-gray-500"
                  />
                  <label
                    for="documments-checkbox"
                    class="w-full py-3 ml-2 text-sm font-medium text-gray-900 dark:text-gray-300"
                    >Documents</label
                  >
                </div>
              </li>
              <li class="w-full border-b border-gray-200 sm:border-b-0 sm:border-r">
                <div class="flex items-center pl-3">
                  <input
                    id="annotations-checkbox"
                    :disabled="!(modelValue.documents && modelValue.labelset)"
                    type="checkbox"
                    v-model="modelValue.annotations"
                    class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-700 dark:focus:ring-offset-gray-700 focus:ring-2 dark:bg-gray-600 dark:border-gray-500"
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
              Annotations will be exported without the annotator email
            </p>
            <div class="text-center">
              <button
                type="button"
                :disabled="!(
                  modelValue.name ||
                  modelValue.desc ||
                  modelValue.ann_guidelines ||
                  modelValue.labelset ||
                  modelValue.documents ||
                  modelValue.annotations)
                "
                @click="export_task"
                class="my-5 primary text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
              >
                Download file
                <svg
                  class="ml-2 w-3.5 h-3.5 white"
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 16 18"
                >
                  <path
                    stroke="currentColor"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M8 1v11m0 0 4-4m-4 4L4 8m11 4v3a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2v-3"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import type { ExportTaskOptions } from "~/utils/io";
const props = defineProps<{
  modelValue: ExportTaskOptions;
}>();

const emit = defineEmits(["export", "close"]);

const click_labelset = () => {
  if (props.modelValue.labelset) {
    props.modelValue.ann_guidelines = false;
    props.modelValue.annotations = false;
  }
};

const click_documents = () => {
  if (props.modelValue.documents) {
    props.modelValue.annotations = false;
  }
};

const emitClose = () => {
  emit("close");
};

const export_task = () => {
  document.getElementById("exportFormModalClick")?.click();
  emit("export");
};

onMounted(() => {});
</script>
