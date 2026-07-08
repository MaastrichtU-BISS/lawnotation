<template>
  <div class="px-4 sm:ml-64 side-panel-h overflow-auto" style="margin-left: 20rem">
    <div id="annotations_list">
      <div v-if="!loading">
        <span class="text-2xl font-bold text-center flex justify-center pt-2">
          Annotations: {{ annotations.length >= 10000 ? "more than 10000" : annotations.length }}
        </span>
        <DynamicScroller v-if="annotations.length" page-mode :items="mappedAnnotations" :min-item-size="153" keyField="id"
          class="h-full">
          <template v-slot="{ item, index, active }">
            <DynamicScrollerItem :item="item" :active="active" :size-dependencies="[
              item.id,
              item.label,
              item.text
            ]" :data-index="index">
              <NuxtLink v-if="isNewDoc(index)" :to="`${documentUrl}/${item.doc_id}`">
                <Button :label="item.doc_name?.split('.')[0]" outlined
                  icon="pi pi-file" class="mb-2"></Button>
              </NuxtLink>
              <AnnotationComponent :annotation="item" :labelColor="labelColor(item.label)" :index="index"
                :is-new-doc="isNewDoc(index)" :key="item.id">
              </AnnotationComponent>
            </DynamicScrollerItem>
          </template>
        </DynamicScroller>
        <a href="#annotations_list" type="button"
          class="absolute bottom-0 right-0 mb-3 text-white bg-secondary hover:bg-secondary/80 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-full text-sm p-2.5 text-center inline-flex items-center mr-2 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">
          <svg class="w-4 h-4 text-white dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"
            fill="none" viewBox="0 0 10 14">
            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M5 13V1m0 0L1 5m4-4 4 4"></path>
          </svg>
          <span class="sr-only">Go up</span>
        </a>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import type { RichAnnotation } from "~/utils/metrics";
import AnnotationComponent from "./Annotation.vue";

const props = defineProps<{
  labels: { name: string, color: string }[];
  loading: boolean;
  documentUrl: string;
}>();

const annotations = defineModel<RichAnnotation[]>('annotations', { required: true });
const loading_annotations = defineModel('loading_annotations', { type: Boolean, required: true });

const mappedAnnotations = computed(() => annotations.value.map((item) => (
  { ...item, id: `${item.ann_id}_${item.start}_${item.end}_${item.text}` }
)));

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
