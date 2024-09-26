<template>
        <div class="px-4 sm:ml-64 side-panel-h overflow-auto" style="margin-left: 20rem">
          <div id="annotations_list">
            <div v-if="!loading" class="flex mb-3 justify-between">
              <span class="flex-1 text-2xl font-bold text-center">
                Annotations: {{ annotations.length }}
              </span>
            </div>
            <ul>
              <li v-for="(ann, index) in annotations">
                <h5 v-if="isNewDoc(index)" class="text-lg font-semibold mb-3 mt-5 ml-1">
                  <i class="pi pi-file mr-1" /> 
                  {{ ann.doc_name?.substring(0, ann.doc_name.length - 4) }}
                </h5>
                <AnnotationComponent :annotation="ann" :labelColor="labelColor(ann.label)" :index="index" :is-new-doc="isNewDoc(index)"
                  :can-merge-up="canMergeUp(index)" :can-merge-down="canMergeDown(index)" @separate="emitSeparate"
                  @mergeUp="emitMergeUp" @mergeDown="emitMergeDown" @set-hidden="emitSetHidden"
                  :key="`${ann.ann_id}_${ann.start}_${ann.end}_${ann.text}`"></AnnotationComponent>
              </li>
            </ul>

            <a href="#annotations_list" type="button"
              class="absolute bottom-0 right-0 mb-3 mr-3 text-white bg-secondary hover:bg-secondary/80 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-full text-sm p-2.5 text-center inline-flex items-center mr-2 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">
              <svg class="w-4 h-4 text-white dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"
                fill="none" viewBox="0 0 10 14">
                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M5 13V1m0 0L1 5m4-4 4 4"></path>
              </svg>
              <span class="sr-only">Go up</span>
            </a>
          </div>
        </div>
</template>
<script setup lang="ts">
import _ from "lodash";
import type { RichAnnotation } from "~/utils/metrics";
import AnnotationComponent from "./Annotation.vue";

const props = defineProps<{
  labels: {name: string, color: string}[];
  loading: boolean;
  documentsData: any;
}>();

const annotations = defineModel<RichAnnotation[]>('annotations', {required: true });
const loading_annotations = defineModel('loading_annotations', { type: Boolean, required: true });

const emitMergeDown = (ann_index: number): void => {
  loading_annotations.value = true;
  const current = _.clone(annotations.value[ann_index]);
  const next = _.clone(annotations.value[ann_index + 1]);

  annotations.value[ann_index + 1].start = current.start;
  annotations.value[ann_index + 1].text = props.documentsData[
    current.doc_id
  ].full_text.substring(current.start, next.end);

  annotations.value[ann_index].hidden = false;
  annotations.value.splice(ann_index, 1);
  loading_annotations.value = false;
};

const emitSetHidden = (ann_index: number, hidden: boolean): void => {
  annotations.value[ann_index].hidden = hidden;
};

const emitMergeUp = (ann_index: number): void => {
  loading_annotations.value = true;
  const current = _.clone(annotations.value[ann_index]);
  const previous = _.clone(annotations.value[ann_index - 1]);

  annotations.value[ann_index - 1].end = current.end;
  annotations.value[ann_index - 1].text = props.documentsData[
    current.doc_id
  ].full_text.substring(previous.start, current.end);

  annotations.value[ann_index].hidden = false;
  annotations.value.splice(ann_index, 1);
  loading_annotations.value = false;
};

const canMergeUp = (index: number): Boolean => {
  return (
    index > 0 &&
    annotations.value[index - 1].doc_id == annotations.value[index].doc_id &&
    annotations.value[index - 1].ann_id == annotations.value[index].ann_id
  );
};

const canMergeDown = (index: number): Boolean => {
  return (
    index < annotations.value.length - 1 &&
    annotations.value[index + 1].doc_id == annotations.value[index].doc_id &&
    annotations.value[index + 1].ann_id == annotations.value[index].ann_id
  );
};

const emitSeparate = (ann_index: number, split_pos: number) => {
  loading_annotations.value = true;
  const current = _.clone(annotations.value[ann_index]);

  annotations.value[ann_index].end = current.start + split_pos;
  annotations.value[ann_index].text = current.text.substring(0, split_pos);

  annotations.value.splice(ann_index + 1, 0, {
    start: current.start + split_pos,
    end: current.end,
    label: current.label,
    text: current.text.substring(split_pos, current.end),
    annotator: current.annotator,
    hidden: false,
    ann_id: current.ann_id,
    doc_id: current.doc_id,
    doc_name: current.doc_name,
    confidence: current.confidence
  });
  loading_annotations.value = false;
};

const isNewDoc = (index: number): Boolean => {
  return (
    index == 0 ||
    (index > 0 && annotations.value[index - 1].doc_id != annotations.value[index].doc_id)
  );
};

const labelColor = (label: string): string => {
    return props.labels.find((l) => l.name == label)?.color || 'gray';
}
</script>