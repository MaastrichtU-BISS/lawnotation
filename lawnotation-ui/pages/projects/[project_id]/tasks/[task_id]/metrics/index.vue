<template>
  <div>
    <Breadcrumb
      v-if="task && project"
      :crumbs="[
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
        {
          name: `Metrics`,
          link: `/projects/${project.id}/tasks/${task.id}/metrics`,
        },
      ]"
    />

    <!-- drawer init and toggle -->
    <div class="text-center">
      <button
        class="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 mr-2 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800"
        type="button"
        data-drawer-target="drawer-disabled-backdrop"
        data-drawer-show="drawer-disabled-backdrop"
        data-drawer-backdrop="false"
        data-drawer-edge="true"
        data-drawer-edge-offset="bottom-[60px]"
        aria-controls="drawer-disabled-backdrop"
      >
        Show drawer without backdrop
      </button>
    </div>

    <!-- drawer component -->
    <div
      id="drawer-disabled-backdrop"
      class="fixed top-0 left-0 z-40 h-screen p-4 overflow-y-auto transition-transform -translate-x-full bg-white w-64 dark:bg-gray-800"
      tabindex="-1"
      aria-labelledby="drawer-disabled-backdrop-label"
    >
      <h5
        id="drawer-disabled-backdrop-label"
        class="text-base font-semibold text-gray-500 uppercase dark:text-gray-400"
      >
        Menu
      </h5>
      <button
        type="button"
        data-drawer-hide="drawer-disabled-backdrop"
        aria-controls="drawer-disabled-backdrop"
        class="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 absolute top-2.5 right-2.5 inline-flex items-center justify-center dark:hover:bg-gray-600 dark:hover:text-white"
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
        <span class="sr-only">Close menu</span>
      </button>
      <div class="py-4 overflow-y-auto">
        <ul class="space-y-2 font-medium">
          <li>
            <a
              href="#"
              class="flex items-center p-2 text-gray-900 rounded-lg dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 group"
            >
              <svg
                class="w-5 h-5 text-gray-500 transition duration-75 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                fill="currentColor"
                viewBox="0 0 22 21"
              >
                <path
                  d="M16.975 11H10V4.025a1 1 0 0 0-1.066-.998 8.5 8.5 0 1 0 9.039 9.039.999.999 0 0 0-1-1.066h.002Z"
                />
                <path
                  d="M12.5 0c-.157 0-.311.01-.565.027A1 1 0 0 0 11 1.02V10h8.975a1 1 0 0 0 1-.935c.013-.188.028-.374.028-.565A8.51 8.51 0 0 0 12.5 0Z"
                />
              </svg>
              <span class="ml-3">Dashboard</span>
            </a>
          </li>
          <li>
            <button
              type="button"
              class="flex items-center w-full p-2 text-base text-gray-900 transition duration-75 rounded-lg group hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700"
              aria-controls="dropdown-example"
              data-collapse-toggle="dropdown-example"
            >
              <svg
                class="flex-shrink-0 w-5 h-5 text-gray-500 transition duration-75 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                fill="currentColor"
                viewBox="0 0 18 21"
              >
                <path
                  d="M15 12a1 1 0 0 0 .962-.726l2-7A1 1 0 0 0 17 3H3.77L3.175.745A1 1 0 0 0 2.208 0H1a1 1 0 0 0 0 2h.438l.6 2.255v.019l2 7 .746 2.986A3 3 0 1 0 9 17a2.966 2.966 0 0 0-.184-1h2.368c-.118.32-.18.659-.184 1a3 3 0 1 0 3-3H6.78l-.5-2H15Z"
                />
              </svg>
              <span class="flex-1 ml-3 text-left whitespace-nowrap">E-commerce</span>
              <svg
                class="w-3 h-3"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 10 6"
              >
                <path
                  stroke="currentColor"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="m1 1 4 4 4-4"
                />
              </svg>
            </button>
            <ul id="dropdown-example" class="hidden py-2 space-y-2">
              <li>
                <a
                  href="#"
                  class="flex items-center w-full p-2 text-gray-900 transition duration-75 rounded-lg pl-11 group hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700"
                  >Products</a
                >
              </li>
              <li>
                <a
                  href="#"
                  class="flex items-center w-full p-2 text-gray-900 transition duration-75 rounded-lg pl-11 group hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700"
                  >Billing</a
                >
              </li>
              <li>
                <a
                  href="#"
                  class="flex items-center w-full p-2 text-gray-900 transition duration-75 rounded-lg pl-11 group hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700"
                  >Invoice</a
                >
              </li>
            </ul>
          </li>
          <li>
            <a
              href="#"
              class="flex items-center p-2 text-gray-900 rounded-lg dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 group"
            >
              <svg
                class="flex-shrink-0 w-5 h-5 text-gray-500 transition duration-75 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                fill="currentColor"
                viewBox="0 0 18 18"
              >
                <path
                  d="M6.143 0H1.857A1.857 1.857 0 0 0 0 1.857v4.286C0 7.169.831 8 1.857 8h4.286A1.857 1.857 0 0 0 8 6.143V1.857A1.857 1.857 0 0 0 6.143 0Zm10 0h-4.286A1.857 1.857 0 0 0 10 1.857v4.286C10 7.169 10.831 8 11.857 8h4.286A1.857 1.857 0 0 0 18 6.143V1.857A1.857 1.857 0 0 0 16.143 0Zm-10 10H1.857A1.857 1.857 0 0 0 0 11.857v4.286C0 17.169.831 18 1.857 18h4.286A1.857 1.857 0 0 0 8 16.143v-4.286A1.857 1.857 0 0 0 6.143 10Zm10 0h-4.286A1.857 1.857 0 0 0 10 11.857v4.286c0 1.026.831 1.857 1.857 1.857h4.286A1.857 1.857 0 0 0 18 16.143v-4.286A1.857 1.857 0 0 0 16.143 10Z"
                />
              </svg>
              <span class="flex-1 ml-3 whitespace-nowrap">Kanban</span>
              <span
                class="inline-flex items-center justify-center px-2 ml-3 text-sm font-medium text-gray-800 bg-gray-100 rounded-full dark:bg-gray-700 dark:text-gray-300"
                >Pro</span
              >
            </a>
          </li>
          <li>
            <a
              href="#"
              class="flex items-center p-2 text-gray-900 rounded-lg dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 group"
            >
              <svg
                class="flex-shrink-0 w-5 h-5 text-gray-500 transition duration-75 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  d="m17.418 3.623-.018-.008a6.713 6.713 0 0 0-2.4-.569V2h1a1 1 0 1 0 0-2h-2a1 1 0 0 0-1 1v2H9.89A6.977 6.977 0 0 1 12 8v5h-2V8A5 5 0 1 0 0 8v6a1 1 0 0 0 1 1h8v4a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-4h6a1 1 0 0 0 1-1V8a5 5 0 0 0-2.582-4.377ZM6 12H4a1 1 0 0 1 0-2h2a1 1 0 0 1 0 2Z"
                />
              </svg>
              <span class="flex-1 ml-3 whitespace-nowrap">Inbox</span>
              <span
                class="inline-flex items-center justify-center w-3 h-3 p-3 ml-3 text-sm font-medium text-blue-800 bg-blue-100 rounded-full dark:bg-blue-900 dark:text-blue-300"
                >3</span
              >
            </a>
          </li>
          <li>
            <a
              href="#"
              class="flex items-center p-2 text-gray-900 rounded-lg dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 group"
            >
              <svg
                class="flex-shrink-0 w-5 h-5 text-gray-500 transition duration-75 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                fill="currentColor"
                viewBox="0 0 20 18"
              >
                <path
                  d="M14 2a3.963 3.963 0 0 0-1.4.267 6.439 6.439 0 0 1-1.331 6.638A4 4 0 1 0 14 2Zm1 9h-1.264A6.957 6.957 0 0 1 15 15v2a2.97 2.97 0 0 1-.184 1H19a1 1 0 0 0 1-1v-1a5.006 5.006 0 0 0-5-5ZM6.5 9a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9ZM8 10H5a5.006 5.006 0 0 0-5 5v2a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-2a5.006 5.006 0 0 0-5-5Z"
                />
              </svg>
              <span class="flex-1 ml-3 whitespace-nowrap">Users</span>
            </a>
          </li>
          <li>
            <a
              href="#"
              class="flex items-center p-2 text-gray-900 rounded-lg dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 group"
            >
              <svg
                class="flex-shrink-0 w-5 h-5 text-gray-500 transition duration-75 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                fill="currentColor"
                viewBox="0 0 18 20"
              >
                <path
                  d="M17 5.923A1 1 0 0 0 16 5h-3V4a4 4 0 1 0-8 0v1H2a1 1 0 0 0-1 .923L.086 17.846A2 2 0 0 0 2.08 20h13.84a2 2 0 0 0 1.994-2.153L17 5.923ZM7 9a1 1 0 0 1-2 0V7h2v2Zm0-5a2 2 0 1 1 4 0v1H7V4Zm6 5a1 1 0 1 1-2 0V7h2v2Z"
                />
              </svg>
              <span class="flex-1 ml-3 whitespace-nowrap">Products</span>
            </a>
          </li>
          <li>
            <a
              href="#"
              class="flex items-center p-2 text-gray-900 rounded-lg dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 group"
            >
              <svg
                class="flex-shrink-0 w-5 h-5 text-gray-500 transition duration-75 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 18 16"
              >
                <path
                  stroke="currentColor"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M1 8h11m0 0L8 4m4 4-4 4m4-11h3a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-3"
                />
              </svg>
              <span class="flex-1 ml-3 whitespace-nowrap">Sign In</span>
            </a>
          </li>
          <li>
            <a
              href="#"
              class="flex items-center p-2 text-gray-900 rounded-lg dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 group"
            >
              <svg
                class="flex-shrink-0 w-5 h-5 text-gray-500 transition duration-75 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  d="M5 5V.13a2.96 2.96 0 0 0-1.293.749L.879 3.707A2.96 2.96 0 0 0 .13 5H5Z"
                />
                <path
                  d="M6.737 11.061a2.961 2.961 0 0 1 .81-1.515l6.117-6.116A4.839 4.839 0 0 1 16 2.141V2a1.97 1.97 0 0 0-1.933-2H7v5a2 2 0 0 1-2 2H0v11a1.969 1.969 0 0 0 1.933 2h12.134A1.97 1.97 0 0 0 16 18v-3.093l-1.546 1.546c-.413.413-.94.695-1.513.81l-3.4.679a2.947 2.947 0 0 1-1.85-.227 2.96 2.96 0 0 1-1.635-3.257l.681-3.397Z"
                />
                <path
                  d="M8.961 16a.93.93 0 0 0 .189-.019l3.4-.679a.961.961 0 0 0 .49-.263l6.118-6.117a2.884 2.884 0 0 0-4.079-4.078l-6.117 6.117a.96.96 0 0 0-.263.491l-.679 3.4A.961.961 0 0 0 8.961 16Zm7.477-9.8a.958.958 0 0 1 .68-.281.961.961 0 0 1 .682 1.644l-.315.315-1.36-1.36.313-.318Zm-5.911 5.911 4.236-4.236 1.359 1.359-4.236 4.237-1.7.339.341-1.699Z"
                />
              </svg>
              <span class="flex-1 ml-3 whitespace-nowrap">Sign Up</span>
            </a>
          </li>
        </ul>
      </div>
    </div>

    <div class="p-4 sm:ml-64">
      <div class="my-3">
        <div class="dimmer-wrapper" style="min-height: 200px">
          <Dimmer v-model="loading" />
          <div class="dimmer-content">
            <div class="flex my-10">
              <div class="mr-5 w-full">
                <label>Document</label>
                <Multiselect
                  v-model="selectedDocument"
                  :options="documentsOptions"
                  :searchable="true"
                  placeholder="Select a Document"
                />
              </div>
              <div class="w-full">
                <label>Label</label>
                <Multiselect
                  v-model="selectedLabel"
                  :options="labelsOptions"
                  :searchable="true"
                  placeholder="Select a Label"
                />
              </div>
              <div class="ml-5 w-full">
                <label>Annotators</label>
                <Multiselect
                  v-model="selectedAnnotators"
                  :options="annotatorsOptions"
                  mode="tags"
                  :searchable="true"
                  :close-on-select="false"
                  placeholder="All"
                />
              </div>
            </div>
            <div class="flex my-10">
              <div class="mx-auto">
                <button class="base btn-primary mx-5" @click="getAnnotations">
                  Get Annotations
                </button>
                <span>
                  <input
                    checked
                    id="radio-default"
                    type="radio"
                    @click="defaultClicked"
                    name="radio"
                    class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500"
                  />
                  <label
                    for="radio-default"
                    class="ml-2 text-sm font-medium text-gray-900"
                    >Default</label
                  >
                </span>
                <span class="ml-4">
                  <input
                    id="radio-words"
                    type="radio"
                    @click="wordsClicked"
                    name="radio"
                    class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500"
                  />
                  <label for="radio-words" class="ml-2 text-sm font-medium text-gray-900"
                    >Words</label
                  ></span
                >
                <button class="base btn-primary mx-5" @click="downloadAll">
                  Download All
                </button>
              </div>
            </div>
            <div class="flex my-10" v-if="annotations && annotations.length">
              <div class="mx-auto inline-flex">
                <button
                  :disabled="
                    !selectedDocument ||
                    !selectedLabel ||
                    selectedAnnotators?.length == 1 ||
                    selectedAnnotators?.length == 2
                  "
                  class="base btn-primary mx-5"
                  @click="compute_metric('krippendorff')"
                >
                  Krippendorff's alfa
                </button>
                <button
                  :disabled="
                    !selectedDocument ||
                    !selectedLabel ||
                    selectedAnnotators?.length == 1 ||
                    selectedAnnotators?.length == 2
                  "
                  class="base btn-primary mx-5"
                  @click="compute_metric('fleiss_kappa')"
                >
                  Fleiss Kappa
                </button>
                <button
                  :disabled="
                    !selectedDocument || !selectedLabel || selectedAnnotators?.length != 2
                  "
                  class="base btn-primary mx-5"
                  @click="compute_metric('cohens_kappa')"
                >
                  Cohens Kappa
                </button>
                <div class="">
                  <label class="mr-2">Tolerance</label>
                  <input
                    class="base"
                    type="number"
                    v-model="tolerance"
                    min="0"
                    max="10"
                    step="1"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="text-center" v-if="metric_result">
          <div class="my=5">
            <h5 class="text-lg font-semibold">
              Result:
              <span :style="'color:' + (metric_result.result > 0 ? 'green' : 'red')">{{
                metric_result.result
              }}</span>
            </h5>
            <div><b>Po:</b> {{ metric_result.po }}</div>
            <div><b>Pe:</b> {{ metric_result.pe }}</div>
          </div>
          <div class="my-5">
            <button class="base btn-primary mx-5" @click="downloadCSV()">
              Download Result
            </button>
          </div>
        </div>
        <div v-if="annotations && annotations.length">
          <h5 class="text-lg font-semibold my-5">
            Annotations: {{ annotations.length }}
          </h5>
          <ul>
            <li v-for="(ann, index) in annotations">
              <RangeLabelCmpt
                :annotation="ann"
                :index="index"
                :can-merge-up="canMergeUp(index)"
                :can-merge-down="canMergeDown(index)"
                @separate="emitSeparate"
                @mergeUp="emitMergeUp"
                @mergeDown="emitMergeDown"
                @set-hidden="emitSetHidden"
                :key="index + '_' + ann.start + '_' + ann.end + '_' + ann.hidden"
              ></RangeLabelCmpt>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ExportToCsv } from "export-to-csv";
import Multiselect from "@vueform/multiselect";
import { Task, useTaskApi } from "~/data/task";
import { Assignment, useAssignmentApi } from "~/data/assignment";
import { BasicAnnotation, useAnnotationApi } from "~/data/annotation";
import { Document, useDocumentApi } from "~/data/document";
import { Labelset, useLabelsetApi } from "~/data/labelset";
import { Project, useProjectApi } from "~/data/project";
import { User, useUserApi } from "~/data/user";
import { MetricResult, RangeLabel, sortByRange } from "~/utils/metrics";
import { initFlowbite } from "flowbite";

import _ from "lodash";

const config = useRuntimeConfig();
const { $toast } = useNuxtApp();

// const user = useSupabaseUser();
const taskApi = useTaskApi();
const projectApi = useProjectApi();
const annotationApi = useAnnotationApi();
const documentApi = useDocumentApi();
const labelsetApi = useLabelsetApi();
const userApi = useUserApi();

const route = useRoute();
const task = ref<Task>();
const project = ref<Project>();

const documentsOptions = reactive<{ value: string; label: string }[]>([]);
const selectedDocument = ref<string>();
const selectedDocumentText = ref<string>();
const selectedDocumentName = ref<string>();

const annotatorsOptions = reactive<string[]>([]);
const selectedAnnotators = ref<string[]>();

const labelsOptions = reactive<string[]>([]);
const selectedLabel = ref<string>();

const tolerance = ref<number>(0);

const loading = ref(false);
const separate_into_words = ref(false);

const annotations = reactive<BasicAnnotation[]>([]);
const metric_result = ref<MetricResult>();

const getAnnotations = async () => {
  if (!task.value) {
    $toast.error(`Invalid Task`);
    return;
  }
  if (!selectedDocument.value) {
    $toast.error(`Invalid Document`);
    return;
  }
  if (!selectedLabel.value) {
    $toast.error(`Invalid Label`);
    return;
  }

  if (!selectedAnnotators.value || selectedAnnotators.value.length == 0) {
    selectedAnnotators.value = [];
    selectedAnnotators.value.push(...annotatorsOptions);
  }

  loading.value = true;
  metric_result.value = undefined;
  annotations.splice(0);

  const d = await documentApi.findDocument(selectedDocument.value);
  selectedDocumentText.value = d.full_text;
  selectedDocumentName.value = d.name.substring(0, d.name.length - 4);

  const anns = await annotationApi.findAnnotationsByTaskAndDocumentAndLabelsAndAnnotators(
    task.value.id.toString(),
    selectedDocument.value,
    selectedLabel.value,
    selectedAnnotators.value
  );

  annotations.splice(0) &&
    annotations.push(
      ...anns.map((a) => {
        return {
          start: a.start_index,
          end: a.end_index,
          text: a.text,
          label: a.label,
          annotator: (a as any).assignment.annotator.email,
          hidden: false,
          ann_id: a.id,
        };
      })
    );

  getNonAnnotations();

  if (separate_into_words.value) {
    separateIntoWords();
  }

  loading.value = false;
};

const getNonAnnotations = async () => {
  if (!selectedDocumentText.value) {
    $toast.error(`Invalid Document`);
    return;
  }

  sortByRange(annotations);
  var new_annotations: BasicAnnotation[] = [];

  var last_end = 0;
  for (let i = 0; i < annotations.length; ++i) {
    var current_start = annotations[i].start;
    if (last_end < current_start) {
      new_annotations.push({
        start: last_end,
        end: current_start,
        label: "NOT ANNOTATED",
        text: selectedDocumentText.value.substring(last_end, current_start),
        annotator: "",
        hidden: false,
        ann_id: -1,
      });
    }
    new_annotations.push(annotations[i]);
    var last_end = Math.max(last_end, annotations[i].end);
  }

  new_annotations.push({
    start: last_end,
    end: selectedDocumentText.value.length,
    label: "NOT ANNOTATED",
    text: selectedDocumentText.value.substring(
      last_end,
      selectedDocumentText.value.length
    ),
    annotator: "",
    hidden: false,
    ann_id: -1,
  });

  annotations.splice(0) && annotations.push(...new_annotations);
};

const compute_metric = async (metric: string) => {
  loading.value = true;

  if (!selectedDocumentText.value || !selectedDocumentName.value)
    throw new Error("Invalid Document");

  if (!annotations || annotations.length == 0) {
    $toast.error(
      `There are no annotations for document ${selectedDocumentName.value} and label ${selectedLabel.value}`
    );
    metric_result.value = undefined;
    return;
  }

  metric_result.value = await $fetch(`/api/metrics/${metric}`, {
    method: "POST",
    body: JSON.stringify({
      annotations: annotations.filter((x) => !x.hidden),
      annotators: selectedAnnotators.value,
      tolerance: tolerance.value,
    }),
  });

  loading.value = false;
};

const getDownloadOptions = async (d: string, l: string) => {
  const options = await {
    filename: `${d}_${l}_${metric_result.value?.name}`,
    fieldSeparator: ",",
    quoteStrings: '"',
    decimalSeparator: ".",
    showLabels: true,
    showTitle: true,
    title: `${metric_result.value?.name} result: ${metric_result.value?.result} | Po: ${metric_result.value?.po} | Pe: ${metric_result.value?.pe} | Tolerance: ${tolerance.value}`,
    useTextFile: false,
    useBom: true,
    useKeysAsHeaders: true,
  };
  return options;
};

const downloadCSV = async () => {
  if (!selectedDocumentName.value) {
    $toast.error(`Invalid Document`);
    return;
  }
  if (!selectedLabel.value) {
    $toast.error(`Invalid Label`);
    return;
  }
  const options = await getDownloadOptions(
    selectedDocumentName.value,
    selectedLabel.value
  );

  const csvExporter = new ExportToCsv(options);

  var rows: any[] = [];
  metric_result.value?.table.forEach((r: any) => {
    Object.entries(r.annotators).forEach(([k, v]) => {
      rows.push({
        annotator: k,
        start: r.start,
        end: r.end,
        text: r.text,
        value: v,
      });
    });
  });

  csvExporter.generateCsv(rows);
};

const downloadAll = async () => {
  let count: number = 0;
  for (let i = 0; i < documentsOptions.length; i++) {
    for (let j = 0; j < labelsOptions.length; j++) {
      selectedDocument.value = documentsOptions[i].value;
      selectedLabel.value = labelsOptions[j];
      await getAnnotations();
      if (annotations.length > 0) count++;
      await compute_metric("fleiss_kappa");
      await downloadCSV();
      await compute_metric("krippendorff");
      await downloadCSV();
    }
  }
  $toast.success(`${count * 2} csv files have been downloaded!`);
};

const canMergeUp = (index: number): Boolean => {
  return index > 0 && annotations[index - 1].ann_id == annotations[index].ann_id;
};

const canMergeDown = (index: number): Boolean => {
  return (
    index < annotations.length - 1 &&
    annotations[index + 1].ann_id == annotations[index].ann_id
  );
};

const emitSeparate = (ann_index: number, split_pos: number) => {
  const current = _.clone(annotations[ann_index]);

  annotations[ann_index].end = current.start + split_pos;
  annotations[ann_index].text = current.text.substring(0, split_pos);

  annotations.splice(ann_index + 1, 0, {
    start: current.start + split_pos,
    end: current.end,
    label: current.label,
    text: current.text.substring(split_pos, current.end),
    annotator: current.annotator,
    hidden: false,
    ann_id: current.ann_id,
  });
};

const separateIntoWords = () => {
  metric_result.value = undefined;
  let limit = 10 ** 6;
  loading.value = true;
  var new_annotations: BasicAnnotation[] = [];

  annotations.forEach((ann) => {
    const words = ann.text.matchAll(/\S+/g);
    while (limit > 0) {
      const w = words.next();
      if (w.done) break;
      new_annotations.push({
        start: ann.start + w.value.index!,
        end: ann.start + w.value.index! + w.value[0].length,
        text: w.value[0],
        label: ann.label,
        annotator: ann.annotator,
        hidden: false,
        ann_id: ann.ann_id,
      });
      limit--;
    }
  });
  annotations.splice(0) && annotations.push(...new_annotations);
  loading.value = false;
};

const defaultClicked = () => {
  separate_into_words.value = false;
  if (annotations && annotations.length) {
    getAnnotations();
  }
};

const wordsClicked = () => {
  separate_into_words.value = true;
  if (annotations && annotations.length) {
    getAnnotations();
  }
};

const emitMergeUp = (ann_index: number): void => {
  if (!selectedDocumentText.value) {
    $toast.error(`Invalid Document`);
    return;
  }
  const current = _.clone(annotations[ann_index]);
  const previous = _.clone(annotations[ann_index - 1]);

  annotations[ann_index - 1].end = current.end;
  annotations[ann_index - 1].text = selectedDocumentText.value.substring(
    previous.start,
    current.end
  )!;

  annotations[ann_index].hidden = false;
  annotations.splice(ann_index, 1);
};

const emitMergeDown = (ann_index: number): void => {
  if (!selectedDocumentText.value) {
    $toast.error(`Invalid Document`);
    return;
  }
  const current = _.clone(annotations[ann_index]);
  const next = _.clone(annotations[ann_index + 1]);

  annotations[ann_index + 1].start = current.start;
  annotations[ann_index + 1].text = selectedDocumentText.value.substring(
    current.start,
    next.end
  );

  annotations[ann_index].hidden = false;
  annotations.splice(ann_index, 1);
};

const emitSetHidden = (ann_index: number, hidden: Boolean): void => {
  annotations[ann_index].hidden = hidden;
};

onMounted(async () => {
  initFlowbite();

  task.value = await taskApi.findTask(route.params.task_id.toString());

  project.value = await projectApi.findProject(route.params.project_id as string);

  labelsOptions.push(
    ...(await labelsetApi.findLabelset(task.value.labelset_id.toString())).labels.map(
      (l) => l.name
    )
  );

  documentsOptions.push(
    ...(await documentApi.findSharedDocumentsByTask(task.value.id.toString())).map(
      (d) => {
        return { value: d.id.toString(), label: d.id.toString() + " - " + d.name };
      }
    )
  );

  annotatorsOptions.push(
    ...(await userApi.findUsersByTask(task.value.id.toString())).map((a) => a.email)
  );
});

definePageMeta({
  middleware: ["auth"],
});
</script>
<style>
button[disabled="disabled"],
button:disabled {
  cursor: not-allowed;
  background-color: rgb(229, 229, 229) !important;
  pointer-events: none;
}

.list-enter-active,
.list-leave-active {
  transition: all 0.5s ease;
}
.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateX(30px);
}
</style>
